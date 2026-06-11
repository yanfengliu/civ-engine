// Per-player filtered observation (player-observation objective, v0.8.20).
// Standalone read-side utility in the RenderAdapter / VisibilityMap mold:
// constructed by game code, reads the world through public APIs only, owns
// no engine internals, and never mutates simulation state. Projects the
// world's omniscient observation surfaces (snapshot + per-tick diff +
// events + world state) through a VisibilityMap so a fog-of-war agent sees
// only what its player sees — including the visibility-TRANSITION semantics
// raw diff filtering cannot express (full data when an entity enters view;
// an explicit exit notice when it leaves). Design + review history:
// docs/threads/done/player-observation/.

import { EngineError } from './engine-error.js';
import { cloneJsonValue } from './json.js';
import type { EntityId } from './types.js';
import type { EntityRef } from './session-bundle.js';
import type { ResourcePool } from './resource-store.js';
import type { VisibilityMap, VisibilityPlayerId } from './visibility-map.js';
import type { World } from './world.js';
import type { ComponentRegistry } from './world-types.js';

// The observer is read-side and indifferent to the world's command/state
// type parameters; requiring them would force every consumer to thread
// irrelevant generics. Same precedent as LooseSystem (world-types.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ObservableWorld<TEventMap extends Record<keyof TEventMap, unknown>, TComponents extends ComponentRegistry> = World<TEventMap, any, TComponents, any>;

export interface PlayerObserverConfig<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
> {
  world: ObservableWorld<TEventMap, TComponents>;
  visibility: VisibilityMap;
  playerId: VisibilityPlayerId;
  /** Entities with no position component: 'hidden' (default) | 'visible'.
   *  Safe-by-default: positionless entities are a common home for
   *  player/economy/AI-director state — opt match-clock-style globals in
   *  explicitly. */
  positionless?: 'hidden' | 'visible';
  /** World-state keys in observations: 'none' (default) | 'all' | predicate. */
  worldState?: 'none' | 'all' | ((key: string) => boolean);
  /** Event filtering. Events carry no inherent position, so the engine
   *  cannot guess: 'none' (default — leak nothing) | 'all' | a resolver
   *  receiving each event plus this observer's total isVisible test. */
  events?:
    | 'none'
    | 'all'
    | ((
        event: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] },
        isVisible: (x: number, y: number) => boolean,
      ) => boolean);
}

export interface ObservedEntity<
  TComponents extends ComponentRegistry = Record<string, unknown>,
> {
  /** EntityRef, not bare id: ids recycle immediately via the free-list, so
   *  generation is identity (RenderAdapter precedent). */
  ref: EntityRef;
  components: Partial<TComponents>;
  resources: Record<string, ResourcePool>;
  tags: string[];
  meta: Record<string, string | number>;
}

export interface ObservedEntityUpdate<
  TComponents extends ComponentRegistry = Record<string, unknown>,
> {
  ref: EntityRef;
  components: Partial<TComponents>;
  componentsRemoved: string[];
  resources: Record<string, ResourcePool>;
  resourcesRemoved: string[];
  /** Full tag set, present only when this entity's tags changed this tick. */
  tags?: string[];
  /** Full meta map, present only when it changed this tick. */
  meta?: Record<string, string | number>;
}

export interface PlayerObservation<
  TComponents extends ComponentRegistry = Record<string, unknown>,
> {
  tick: number;
  entities: Array<ObservedEntity<TComponents>>;
  worldState: Record<string, unknown>;
}

export interface PlayerTickObservation<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
> {
  tick: number;
  /** Newly visible (spawned in view, moved into view, fog receded): FULL
   *  current data even though no component may have changed this tick. */
  entered: Array<ObservedEntity<TComponents>>;
  /** Visible last tick and this tick: per-entity projection of the world
   *  diff across all four surfaces, including removals. */
  updated: Array<ObservedEntityUpdate<TComponents>>;
  /** No longer visible. Attribution is honest, not omniscient: 'destroyed'
   *  when the entity died and its last OBSERVED position is visible under
   *  post-tick visibility; otherwise 'fog'. A same-tick move-then-die can
   *  therefore be mis-attributed — the diff carries no positions for
   *  destroyed entities (pinned by test). */
  exited: Array<{ ref: EntityRef; reason: 'fog' | 'destroyed' }>;
  events: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
  worldState: { set: Record<string, unknown>; removed: string[] };
}

interface TrackedEntity {
  ref: EntityRef;
  lastKnownPosition: { x: number; y: number } | null;
}

export class PlayerObserver<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
> {
  private readonly world: ObservableWorld<TEventMap, TComponents>;
  private readonly visibility: VisibilityMap;
  private readonly playerId: VisibilityPlayerId;
  private readonly positionless: 'hidden' | 'visible';
  private readonly worldStateMode: 'none' | 'all' | ((key: string) => boolean);
  private readonly eventsMode: PlayerObserverConfig<TEventMap, TComponents>['events'];
  private prev = new Map<EntityId, TrackedEntity>();
  private lastObservedTick = 0;

  constructor(config: PlayerObserverConfig<TEventMap, TComponents>) {
    this.world = config.world;
    this.visibility = config.visibility;
    this.playerId = config.playerId;
    this.positionless = config.positionless ?? 'hidden';
    this.worldStateMode = config.worldState ?? 'none';
    this.eventsMode = config.events ?? 'none';
    this.prime();
  }

  /** Visible-cell test bound to this player. Total: returns false for any
   *  coordinate that is not an in-grid integer cell (VisibilityMap.isVisible
   *  throws there) — event resolvers may feed it arbitrary payload coords. */
  isVisible = (x: number, y: number): boolean => {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
    if (x < 0 || y < 0 || x >= this.visibility.width || y >= this.visibility.height) return false;
    return this.visibility.isVisible(this.playerId, x, y);
  };

  /** Full filtered view of currently-visible entities. PRIMES the observer:
   *  the captured visible set becomes the baseline for the next
   *  observeTick() (documented side effect). */
  snapshot(): PlayerObservation<TComponents> {
    const visible = this.computeVisible();
    const entities = [...visible.keys()]
      .sort((a, b) => a - b)
      .map((id) => this.buildObserved(id));
    const worldState: Record<string, unknown> = {};
    if (this.worldStateMode !== 'none') {
      for (const key of this.world.getStateKeys()) {
        if (this.stateKeyAllowed(key)) {
          worldState[key] = cloneJsonValue(this.world.getState(key), `state '${key}'`);
        }
      }
    }
    this.primeFrom(visible);
    return { tick: this.world.tick, entities, worldState };
  }

  /** Re-prime after deliberate timeline changes (recover(), applySnapshot(),
   *  reconnect). Construction primes the same way, so observeTick() is valid
   *  from the first post-construction tick without a snapshot() call. */
  reset(): void {
    this.prime();
  }

  /** Per-tick filtered feed. Call exactly once after each successful
   *  world.step(), AFTER updating the VisibilityMap for this tick. */
  observeTick(): PlayerTickObservation<TEventMap, TComponents> {
    if (this.world.isPoisoned()) {
      throw new EngineError(
        'player_observer_world_poisoned',
        'PlayerObserver.observeTick: world is poisoned; recover() the world and reset() the observer',
        { details: { tick: this.world.tick } },
      );
    }
    const tick = this.world.tick;
    if (tick === this.lastObservedTick) {
      throw new EngineError(
        'player_observer_tick_already_observed',
        `PlayerObserver.observeTick: tick ${tick} was already observed`,
        { details: { tick, lastObservedTick: this.lastObservedTick } },
      );
    }
    if (tick !== this.lastObservedTick + 1) {
      throw new EngineError(
        'player_observer_tick_skipped',
        `PlayerObserver.observeTick: expected tick ${this.lastObservedTick + 1}, world is at ${tick}; call reset() after timeline changes`,
        { details: { tick, lastObservedTick: this.lastObservedTick } },
      );
    }

    const diff = this.world.getDiff();
    const destroyed = new Set<EntityId>(diff?.entities.destroyed ?? []);
    const visible = this.computeVisible();

    // Identity is (id, generation), not bare id: a visible entity dying and
    // a new entity recycling its id IN THE SAME TICK must read as exited +
    // entered, never as one continuing entity (impl-1 review). Visible ids
    // are alive, so getEntityRef is non-null here.
    const currentRefs = new Map<EntityId, EntityRef>();
    for (const id of visible.keys()) {
      const ref = this.world.getEntityRef(id);
      if (ref) currentRefs.set(id, ref);
    }
    const continuing = (id: EntityId): boolean => {
      const tracked = this.prev.get(id);
      const current = currentRefs.get(id);
      return tracked !== undefined && current !== undefined &&
        tracked.ref.generation === current.generation;
    };

    const entered: Array<ObservedEntity<TComponents>> = [];
    for (const id of [...visible.keys()].sort((a, b) => a - b)) {
      if (!continuing(id)) entered.push(this.buildObserved(id));
    }

    const exited: Array<{ ref: EntityRef; reason: 'fog' | 'destroyed' }> = [];
    for (const id of [...this.prev.keys()].sort((a, b) => a - b)) {
      if (continuing(id)) continue;
      const tracked = this.prev.get(id)!;
      const diedInView =
        destroyed.has(id) &&
        (tracked.lastKnownPosition === null ||
          this.isVisible(tracked.lastKnownPosition.x, tracked.lastKnownPosition.y));
      exited.push({ ref: tracked.ref, reason: diedInView ? 'destroyed' : 'fog' });
    }

    const updated = this.buildUpdated(diff, continuing);
    const events = this.filterEvents();
    const worldState = this.filterWorldState(diff);

    this.primeFrom(visible);
    this.lastObservedTick = tick;
    return { tick, entered, updated, exited, events, worldState };
  }

  private prime(): void {
    this.primeFrom(this.computeVisible());
  }

  private primeFrom(visible: Map<EntityId, { x: number; y: number } | null>): void {
    const next = new Map<EntityId, TrackedEntity>();
    for (const [id, pos] of visible) {
      const ref = this.world.getEntityRef(id);
      if (ref) next.set(id, { ref, lastKnownPosition: pos });
    }
    this.prev = next;
    this.lastObservedTick = this.world.tick;
  }

  /** Visible entities with the cell they were seen at (null = positionless).
   *  O(view) via getVisibleCells × grid.getAt, plus an O(world) positionless
   *  pass only when opted in. */
  private computeVisible(): Map<EntityId, { x: number; y: number } | null> {
    const out = new Map<EntityId, { x: number; y: number } | null>();
    for (const pos of this.visibility.getVisibleCells(this.playerId)) {
      const cell = this.world.grid.getAt(pos.x, pos.y);
      if (!cell) continue;
      for (const id of cell) out.set(id, { x: pos.x, y: pos.y });
    }
    if (this.positionless === 'visible') {
      const positionKey = this.world.positionKey;
      for (const id of this.world.getAliveEntities()) {
        if (this.world.getComponent(id, positionKey) === undefined) out.set(id, null);
      }
    }
    return out;
  }

  private buildObserved(id: EntityId): ObservedEntity<TComponents> {
    const manifest = this.world.getRegistrationManifest();
    const components: Record<string, unknown> = {};
    for (const { key } of manifest.components) {
      const data = this.world.getComponent(id, key);
      if (data !== undefined) components[key] = cloneJsonValue(data, `component '${key}'`);
    }
    const resources: Record<string, ResourcePool> = {};
    for (const key of manifest.resources) {
      const pool = this.world.getResource(id, key);
      if (pool) resources[key] = cloneJsonValue(pool, `resource '${key}'`);
    }
    return {
      ref: this.world.getEntityRef(id)!,
      components: components as Partial<TComponents>,
      resources,
      tags: [...this.world.getTags(id)].sort(),
      meta: this.world.getMetaEntries(id),
    };
  }

  private buildUpdated(
    diff: ReturnType<ObservableWorld<TEventMap, TComponents>['getDiff']>,
    continuing: (id: EntityId) => boolean,
  ): Array<ObservedEntityUpdate<TComponents>> {
    if (!diff) return [];
    // Continuing = same (id, generation) visible last tick AND this tick;
    // intersecting against the alive new-visible set excludes destroyed
    // entities (whose tag/meta channels emit empty sets) by construction.
    // getDiff() returns a fresh clone, so payloads need no re-clone.
    const entries = new Map<EntityId, ObservedEntityUpdate<TComponents>>();
    const entryFor = (id: EntityId): ObservedEntityUpdate<TComponents> => {
      let entry = entries.get(id);
      if (!entry) {
        entry = {
          ref: this.prev.get(id)!.ref,
          components: {} as Partial<TComponents>,
          componentsRemoved: [],
          resources: {},
          resourcesRemoved: [],
        };
        entries.set(id, entry);
      }
      return entry;
    };
    for (const [key, channel] of Object.entries(diff.components)) {
      for (const [id, data] of channel.set) {
        if (continuing(id)) (entryFor(id).components as Record<string, unknown>)[key] = data;
      }
      for (const id of channel.removed) {
        if (continuing(id)) entryFor(id).componentsRemoved.push(key);
      }
    }
    for (const [key, channel] of Object.entries(diff.resources)) {
      for (const [id, pool] of channel.set) {
        if (continuing(id)) entryFor(id).resources[key] = pool;
      }
      for (const id of channel.removed) {
        if (continuing(id)) entryFor(id).resourcesRemoved.push(key);
      }
    }
    for (const { entity, tags } of diff.tags) {
      if (continuing(entity)) entryFor(entity).tags = [...tags].sort();
    }
    for (const { entity, meta } of diff.metadata) {
      if (continuing(entity)) entryFor(entity).meta = meta;
    }
    return [...entries.keys()].sort((a, b) => a - b).map((id) => entries.get(id)!);
  }

  private filterEvents(): Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }> {
    if (this.eventsMode === 'none') return [];
    const all = this.world.getEvents();
    const kept =
      this.eventsMode === 'all' ? [...all] : all.filter((e) => (this.eventsMode as Exclude<typeof this.eventsMode, 'none' | 'all' | undefined>)(e, this.isVisible));
    return kept.map((e) => ({
      type: e.type,
      data: cloneJsonValue(e.data, `event '${String(e.type)}'`),
    }));
  }

  private filterWorldState(
    diff: ReturnType<ObservableWorld<TEventMap, TComponents>['getDiff']>,
  ): { set: Record<string, unknown>; removed: string[] } {
    const out: { set: Record<string, unknown>; removed: string[] } = { set: {}, removed: [] };
    if (this.worldStateMode === 'none' || !diff) return out;
    for (const key of Object.keys(diff.state.set).sort()) {
      if (this.stateKeyAllowed(key)) out.set[key] = diff.state.set[key];
    }
    out.removed = diff.state.removed.filter((key) => this.stateKeyAllowed(key)).sort();
    return out;
  }

  private stateKeyAllowed(key: string): boolean {
    if (this.worldStateMode === 'all') return true;
    if (this.worldStateMode === 'none') return false;
    return this.worldStateMode(key);
  }
}
