// `World` — the engine's single public entry point. Since v0.8.15 the class
// is composed from a chain of internal layer classes (one file each, see
// `docs/threads/done/loc-budget/PLAN.md`):
//
//   WorldCore -> WorldQueries -> WorldTagsMeta -> WorldEntities
//     -> WorldObservers -> WorldCommands -> WorldSystems -> WorldTick -> World
//
// The chain is a file-organization device for the AGENTS.md 500-LOC budget,
// not a domain model: `World` is the only concrete class, none of the layers
// are exported from `src/index.ts`, and the runtime shape (one class, one
// prototype chain) is unchanged. This file owns serialization (`serialize`,
// `deserialize`, `applySnapshot`) and re-exports the public types that
// historically lived here so `export * from './world.js'` keeps the exact
// same package surface.

import { EngineError } from './engine-error.js';
import type { WorldSnapshot } from './serializer.js';
import type { TickFailure } from './world-types.js';
import type { EntityId } from './types.js';
import { EntityManager } from './entity-manager.js';
import { ComponentStore } from './component-store.js';
import type { ComponentStoreOptions } from './component-store.js';
import { DEFAULT_MAX_TICKS_PER_FRAME } from './game-loop.js';
import { ResourceStore } from './resource-store.js';
import { assertJsonCompatible } from './json.js';
import { cloneTickFailure } from './world-internal.js';
import { DeterministicRandom } from './random.js';
import { CommandQueue } from './command-queue.js';
import type { WorldConfig } from './types.js';
import type {
  ComponentRegistry,
  LooseSystem,
  LooseSystemRegistration,
  System,
  SystemRegistration,
} from './world-types.js';
import { WorldTick } from './world-tick.js';

export type {
  System,
  LooseSystem,
  CommandValidationRejection,
  CommandValidationResult,
  TickFailurePhase,
  TickMetricsProfile,
  ComponentRegistry,
  ComponentOptions,
} from './world-types.js';
export type {
  LooseSystemRegistration,
  SystemRegistration,
  WorldMetrics,
  CommandSubmissionResult,
  CommandExecutionResult,
  TickFailure,
  WorldStepResult,
} from './world-types.js';
export { WorldTickFailureError } from './world-types.js';
export { SYSTEM_PHASES } from './world-internal.js';
export type { SystemPhase } from './world-internal.js';

export class World<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends WorldTick<TEventMap, TCommandMap, TComponents, TState> {
  /**
   * @param options.inspectPoisoned - When true, suppresses the "serialize on
   *   poisoned world" warning. Intended for engine-internal debug/history
   *   tooling that exists specifically to inspect poisoned state.
   */
  serialize(options?: { inspectPoisoned?: boolean }): WorldSnapshot {
    if (!options?.inspectPoisoned) {
      this.warnIfPoisoned('serialize');
    }
    const components: Record<string, Array<[EntityId, unknown]>> = {};
    for (const [key, store] of this.componentStores) {
      const entries: Array<[EntityId, unknown]> = [];
      for (const [entity, data] of store.entries()) {
        assertJsonCompatible(data, `component '${key}' on entity ${entity}`);
        entries.push([entity, structuredClone(data)]);
      }
      components[key] = entries;
    }
    const config: WorldConfig = {
      gridWidth: this.spatialGrid.width,
      gridHeight: this.spatialGrid.height,
      tps: this.gameLoop.tps,
      positionKey: this.positionKey,
    };
    if (this.seed !== undefined) {
      config.seed = this.seed;
    }
    const maxTicksPerFrame = this.gameLoop.getMaxTicksPerFrame();
    if (maxTicksPerFrame !== DEFAULT_MAX_TICKS_PER_FRAME) {
      config.maxTicksPerFrame = maxTicksPerFrame;
    }
    if (this.instrumentationProfile !== 'full') {
      config.instrumentationProfile = this.instrumentationProfile;
    }
    // v6 (1.0): strict is ALWAYS written explicitly — the strict-default
    // compatibility clause (ADR 48) keys off its absence to identify
    // pre-flip snapshots, so v6 snapshots must never omit it.
    config.strict = this.strict;

    const componentOptions: Record<string, ComponentStoreOptions> = {};
    for (const [key, opts] of this.componentOptions) {
      componentOptions[key] = { ...opts };
    }

    const snapshotTick = this.getObservableTick();

    const state: Record<string, unknown> = {};
    for (const [key, value] of this.stateStore) {
      assertJsonCompatible(value, `state '${key}'`);
      state[key] = structuredClone(value);
    }

    const tags: Record<number, string[]> = {};
    for (const [entityId, tagSet] of this.entityTags) {
      if (tagSet.size > 0) {
        tags[entityId] = [...tagSet];
      }
    }

    const metadata: Record<number, Record<string, string | number>> = {};
    for (const [entityId, metaMap] of this.entityMeta) {
      if (metaMap.size > 0) {
        const record: Record<string, string | number> = {};
        for (const [k, v] of metaMap) {
          record[k] = v;
        }
        metadata[entityId] = record;
      }
    }

    return {
      version: 6,
      config,
      tick: snapshotTick,
      entities: this.entityManager.getState(),
      components,
      componentOptions,
      resources: this.resourceStore.getState(),
      rng: this.rng.getState(),
      state,
      tags,
      metadata,
      // Terminal poison state, carried for inspection (1.0 decision 2):
      // load paths keep clearing live poison unless restorePoison opts in.
      poisoned: this.poisoned ? cloneTickFailure(this.poisoned) : null,
    };
  }

  static deserialize<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TComponents extends ComponentRegistry = Record<string, unknown>,
    TState extends Record<string, unknown> = Record<string, unknown>,
  >(
    snapshot: WorldSnapshot,
    systems?: Array<
      System<TEventMap, TCommandMap, TComponents, TState>
      | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>
      | LooseSystem | LooseSystemRegistration
    >,
    options?: { restorePoison?: boolean },
  ): World<TEventMap, TCommandMap, TComponents, TState> {
    const version = (snapshot as { version: number }).version;
    if (version < 1 || version > 6) {
      throw new EngineError('snapshot_unsupported_version', `Unsupported snapshot version: ${version}`, { details: { version } });
    }

    // Validate snapshot.tick at the boundary before any mutating work runs
    // (L3 iter-7). Cheap constant-time check; no point doing O(N) loaders
    // for a snapshot that will be rejected.
    if (
      typeof snapshot.tick !== 'number' ||
      !Number.isSafeInteger(snapshot.tick) ||
      snapshot.tick < 0
    ) {
      throw new EngineError('snapshot_invalid_tick',
        `WorldSnapshot.tick must be a non-negative safe integer (got ${String(snapshot.tick)})`,
        { details: { tick: String(snapshot.tick) } },
      );
    }

    const componentOptions =
      'componentOptions' in snapshot && snapshot.componentOptions
        ? snapshot.componentOptions
        : {};

    // Strict-default compatibility clause (1.0 decision 1, ADR 48):
    // pre-flip snapshots (version <= 5) omit `strict` when it was false-by-
    // default — loading them under the flipped default must NOT silently
    // promote them to strict, or every legacy bundle replay breaks. v6
    // snapshots always carry strict explicitly.
    const config =
      version <= 5 && snapshot.config.strict === undefined
        ? { ...snapshot.config, strict: false }
        : snapshot.config;
    const world = new World<TEventMap, TCommandMap, TComponents, TState>(config);
    world.entityManager = EntityManager.fromState(snapshot.entities);

    const assertEntityIdAlive = (rawId: unknown, ctx: string): EntityId => {
      if (typeof rawId !== 'number' || !Number.isInteger(rawId) || rawId < 0) {
        throw new EngineError('snapshot_invalid_entity_key',
          `${ctx} key must be a non-negative integer (got ${JSON.stringify(rawId)})`,
          { details: { context: ctx, key: String(rawId) } },
        );
      }
      if (!world.entityManager.isAlive(rawId)) {
        throw new EngineError('snapshot_dead_entity', `${ctx} references dead entity ${rawId}`, { details: { context: ctx, entity: rawId } });
      }
      return rawId;
    };

    world.componentStores.clear();
    world.componentOptions.clear();
    for (const [key, entries] of Object.entries(snapshot.components)) {
      const opts = componentOptions[key];
      const cloned: Array<[number, unknown]> = [];
      for (const [id, data] of entries as Array<[number, unknown]>) {
        assertEntityIdAlive(id, `snapshot.components['${key}']`);
        cloned.push([id, structuredClone(data)]);
      }
      world.componentStores.set(
        key,
        ComponentStore.fromEntries(cloned, opts),
      );
      if (opts) {
        world.componentOptions.set(key, { ...opts });
      }
    }
    world.rebuildComponentSignatures();
    if ('resources' in snapshot) {
      const rs = snapshot.resources;
      for (const [key, entries] of Object.entries(rs.pools)) {
        for (const [id] of entries as Array<[number, unknown]>) {
          assertEntityIdAlive(id, `snapshot.resources.pools['${key}']`);
        }
      }
      for (const [key, entries] of Object.entries(rs.production)) {
        for (const [id] of entries as Array<[number, number]>) {
          assertEntityIdAlive(id, `snapshot.resources.production['${key}']`);
        }
      }
      for (const [key, entries] of Object.entries(rs.consumption)) {
        for (const [id] of entries as Array<[number, number]>) {
          assertEntityIdAlive(id, `snapshot.resources.consumption['${key}']`);
        }
      }
      for (const transfer of rs.transfers) {
        assertEntityIdAlive(
          transfer.from,
          `snapshot.resources.transfers[${transfer.id}].from`,
        );
        assertEntityIdAlive(
          transfer.to,
          `snapshot.resources.transfers[${transfer.id}].to`,
        );
      }
      world.resourceStore = ResourceStore.fromState(rs);
    }
    if ('rng' in snapshot) {
      world.rng = DeterministicRandom.fromState(snapshot.rng);
    }
    if ('state' in snapshot) {
      for (const [key, value] of Object.entries(snapshot.state)) {
        world.stateStore.set(key, structuredClone(value));
      }
    }
    if ('tags' in snapshot) {
      for (const [entityIdStr, tagList] of Object.entries(snapshot.tags)) {
        const entityId = Number(entityIdStr);
        if (!Number.isInteger(entityId) || entityId < 0) {
          throw new EngineError('snapshot_invalid_entity_key',
            `Invalid entity id key in snapshot.tags: ${JSON.stringify(entityIdStr)}`,
            { details: { key: entityIdStr } },
          );
        }
        if (!world.entityManager.isAlive(entityId)) {
          throw new EngineError('snapshot_dead_entity',
            `snapshot.tags references dead entity ${entityId}`,
            { details: { entity: entityId } },
          );
        }
        for (const tag of tagList as string[]) {
          world.addTagInternal(entityId, tag);
        }
      }
    }
    if ('metadata' in snapshot) {
      for (const [entityIdStr, metaRecord] of Object.entries(snapshot.metadata)) {
        const entityId = Number(entityIdStr);
        if (!Number.isInteger(entityId) || entityId < 0) {
          throw new EngineError('snapshot_invalid_entity_key',
            `Invalid entity id key in snapshot.metadata: ${JSON.stringify(entityIdStr)}`,
            { details: { key: entityIdStr } },
          );
        }
        if (!world.entityManager.isAlive(entityId)) {
          throw new EngineError('snapshot_dead_entity',
            `snapshot.metadata references dead entity ${entityId}`,
            { details: { entity: entityId } },
          );
        }
        for (const [key, value] of Object.entries(metaRecord as Record<string, string | number>)) {
          world.setMetaInternal(entityId, key, value);
        }
      }
    }
    world.rebuildSpatialIndex();
    world.gameLoop.setTick(snapshot.tick);

    if (systems) {
      for (const system of systems) {
        world.registerSystem(system);
      }
    }

    if (options?.restorePoison && version >= 6 && (snapshot as { poisoned?: unknown }).poisoned) {
      // 1.0 decision 2 (ADR 48): poison is carried for inspection; restoring
      // it is the explicit opt-in for terminal-state-fidelity tooling. The
      // restored world behaves exactly like the original poisoned one:
      // step() throws, stepWithResult() returns world_poisoned, recover()
      // clears.
      const failure = cloneTickFailure((snapshot as { poisoned: TickFailure }).poisoned);
      world.poisoned = failure;
      world.lastTickFailure = failure;
    }
    return world;
  }

  /**
   * Apply a `WorldSnapshot` to this world in place. Replaces entity / component /
   * resource / state / tag / metadata / RNG state from the snapshot, but
   * preserves user-registered handlers, validators, systems, and event/diff
   * listeners. Used by `SessionReplayer.openAt()`'s `worldFactory` pattern:
   * register first (handlers, validators, systems) on a fresh `World`, then
   * `applySnapshot(snap)` to load state without conflict.
   *
   * Note: replay across recorded tick failures is out of scope (see
   * `docs/threads/done/session-recording/DESIGN.md` §2).
   * `applySnapshot` clears any current `lastTickFailure` / poison state.
   */
  applySnapshot(snapshot: WorldSnapshot, options?: { restorePoison?: boolean }): void {
    // Spec 6 (v0.8.8): increment maintenance depth for forward-compat. Today's
    // implementation uses internal-only paths (`_replaceStateFrom`) that bypass
    // the public mutation gate; the increment makes a future refactor that
    // routes through public methods safe under strict mode. See ADR 37.
    this._maintenanceDepth++;
    try {
      if (this.isPoisoned()) {
        this.recover();
      }
      const fresh = World.deserialize<TEventMap, TCommandMap, TComponents, TState>(snapshot, undefined, options);
      this._replaceStateFrom(fresh);
      this.gameLoop.setTick(snapshot.tick);
      if (options?.restorePoison && fresh.poisoned) {
        // `fresh` is discarded, so adopt its clone directly — and keep
        // poisoned/lastTickFailure as ONE reference, matching the
        // finalizeTickFailure invariant (release review G4).
        this.poisoned = fresh.poisoned;
        this.lastTickFailure = fresh.poisoned;
      }
    } finally {
      this._maintenanceDepth--;
    }
  }

  /**
   * Transfer state-bearing private fields from `other` into `this`.
   * Preserves registration-bearing fields (handlers, validators, systems,
   * eventBus listeners, diff/command/tick-failure listener sets, the
   * `__payloadCapturingRecorder` slot, instrumentationProfile, seed,
   * positionKey, and the public `grid` delegate which reads through to
   * `this.spatialGrid` on every call). Component stores are merged so
   * user pre-registrations of components not in the snapshot survive.
   *
   * Adding a new state-bearing field to `World`? Add a transfer line
   * here. Forgetting to do so leaks prior state and surfaces as a
   * `selfCheck` divergence after `applySnapshot`. Used by `applySnapshot`
   * and any future "load this state into me" use case.
   */
  private _replaceStateFrom(other: World<TEventMap, TCommandMap, TComponents, TState>): void {
    // --- Entities ---
    this.entityManager = other.entityManager;
    // --- Components: merge to preserve user pre-registrations not in `other`. ---
    // REGISTRATION survives; DATA must not (pre-1.0 full review F1): the
    // incoming snapshot is the complete data truth for the new timeline, so
    // preserved keys get FRESH empty stores with their preserved options.
    // Re-attaching the live store leaked old-timeline entries onto recycled
    // ids and exported ghost dead-entity rows that broke serialize
    // round-trips.
    const preservedComponentKeys = new Set(this.componentStores.keys());
    const preservedComponentOptions = new Map(this.componentOptions);
    const preservedComponentBits = new Map(this.componentBits);
    this.componentStores = new Map(other.componentStores);
    this.componentOptions = new Map(other.componentOptions);
    for (const key of preservedComponentKeys) {
      if (!this.componentStores.has(key)) {
        const opts = preservedComponentOptions.get(key);
        this.componentStores.set(key, new ComponentStore(opts ?? {}));
        if (opts) this.componentOptions.set(key, opts);
      }
    }
    this.componentBits = new Map(other.componentBits);
    this.nextComponentBit = other.nextComponentBit;
    for (const key of preservedComponentBits.keys()) {
      if (!this.componentBits.has(key)) {
        this.componentBits.set(key, 1n << BigInt(this.nextComponentBit));
        this.nextComponentBit++;
      }
    }
    this.entitySignatures = other.entitySignatures;
    // --- Spatial / position bookkeeping ---
    this.spatialGrid = other.spatialGrid;
    this.previousPositions = other.previousPositions;
    // --- Resources ---
    this.resourceStore = other.resourceStore;
    // --- RNG ---
    this.rng = other.rng;
    // --- World state ---
    this.stateStore = other.stateStore;
    this.stateDirtyKeys = other.stateDirtyKeys;
    this.stateRemovedKeys = other.stateRemovedKeys;
    this.stateBaseline = other.stateBaseline;
    // --- Tags + metadata ---
    this.entityTags = other.entityTags;
    this.tagIndex = other.tagIndex;
    this.entityMeta = other.entityMeta;
    this.metaIndex = other.metaIndex;
    this.tagsDirtyEntities = other.tagsDirtyEntities;
    this.metaDirtyEntities = other.metaDirtyEntities;
    // --- Cached per-tick state — clear; will rebuild on next step ---
    // Event listeners are preserved (registration-bearing), but the per-tick
    // buffer belongs to the previous timeline: without this clear,
    // getEvents() after an in-place applySnapshot returns stale events until
    // the next tick (full-review 2026-06-10 L2).
    this.eventBus.clear();
    this.currentDiff = null;
    this.currentMetrics = null;
    this.activeMetrics = null;
    this.queryCache.clear();
    // --- Failure / poison state — clear ---
    this.lastTickFailure = null;
    this.poisoned = null;
    this.poisonedWarningEmitted = false;
    // --- Command queue — drain (snapshot is a clean state) ---
    this.commandQueue = new CommandQueue<TCommandMap>();
    // --- System ordering — invalidate so next tick re-resolves ---
    this.resolvedSystemOrder = null;
    // --- NOT transferred (preserved): handlers, validators, systems,
    //     nextSystemOrder (paired with systems), diffListeners,
    //     commandResultListeners, commandExecutionListeners,
    //     tickFailureListeners, eventBus, destroyCallbacks,
    //     __payloadCapturingRecorder slot, instrumentationProfile, seed,
    //     positionKey, gameLoop (caller updates tick separately), grid
    //     delegate (reads through to this.spatialGrid),
    //     nextCommandResultSequence (intentionally NOT carried in
    //     WorldSnapshotV5; SessionReplayer.selfCheck strips
    //     submissionSequence from execution comparison to compensate
    //     until snapshot v6 lifts this caveat). ---
  }
}
