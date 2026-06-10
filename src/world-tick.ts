// Tick layer of the `World` class chain: `step`/`stepWithResult`, the
// fail-fast tick pipeline (commands -> systems -> resources -> diff ->
// listeners), poison-on-failure semantics, per-tick dirty tracking, and
// TickDiff construction.

import type { EntityId } from './types.js';
import { jsonFingerprint } from './json.js';
import { WORLD_STEP_RESULT_SCHEMA_VERSION } from './ai-contract.js';
import {
  cloneTickFailure,
  createMetrics,
  errorMessage,
  getImplicitMetricsProfile,
  now,
} from './world-internal.js';
import type {
  ComponentRegistry,
  TickFailure,
  TickRunOptions,
  WorldMetrics,
  WorldStepResult,
} from './world-types.js';
import { WorldTickFailureError } from './world-types.js';
import { WorldSystems } from './world-systems.js';

export abstract class WorldTick<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends WorldSystems<TEventMap, TCommandMap, TComponents, TState> {
  step(): void {
    if (this.poisoned) {
      throw new WorldTickFailureError(
        this.makeWorldPoisonedFailure(this.poisoned),
      );
    }
    this.gameLoop.step();
  }

  stepWithResult(): WorldStepResult {
    if (this.poisoned) {
      const failure = this.makeWorldPoisonedFailure(this.poisoned);
      return {
        schemaVersion: WORLD_STEP_RESULT_SCHEMA_VERSION,
        ok: false,
        tick: failure.tick,
        failure,
      };
    }
    const failure = this.runTick({ metricsProfile: 'full' });
    if (!failure) {
      return {
        schemaVersion: WORLD_STEP_RESULT_SCHEMA_VERSION,
        ok: true,
        tick: this.gameLoop.tick,
        failure: null,
      };
    }
    return {
      schemaVersion: WORLD_STEP_RESULT_SCHEMA_VERSION,
      ok: false,
      tick: failure.tick,
      failure,
    };
  }

  protected executeTickOrThrow(): void {
    if (this.poisoned) {
      throw new WorldTickFailureError(
        this.makeWorldPoisonedFailure(this.poisoned),
      );
    }
    const failure = this.runTick({
      metricsProfile: getImplicitMetricsProfile(this.instrumentationProfile),
    });
    if (failure) {
      throw new WorldTickFailureError(failure);
    }
  }

  private runTick(options: TickRunOptions): TickFailure | null {
    const collectMetrics = options.metricsProfile !== 'none';
    const collectDetailedTimings = options.metricsProfile === 'full';
    const metrics = collectMetrics
      ? createMetrics(
          this.gameLoop.tick + 1,
          this.entityManager.count,
          this.componentStores.size,
          this.gameLoop.tps,
        )
      : null;
    this.activeMetrics = metrics;
    const totalStart = metrics ? now() : 0;
    // Capture the executing tick once. Hoisted out of the try-block so the
    // post-advance listener-failure path below uses the same value as the
    // pre-advance failure paths inside the try-block — no off-by-one
    // asymmetry between metrics?.tick + (gameLoop.tick + 1) and bare
    // gameLoop.tick after advance.
    const tick = metrics?.tick ?? this.gameLoop.tick + 1;

    // Spec 6 (v0.8.8): strict-mode tick-phase tracking. Outer try/finally so
    // the flag stays true through finalizeTickFailure (which fires
    // onTickFailure listeners) AND through the diff-listener emission below.
    if (this._inSetup) this._inSetup = false;
    this._inTickPhase = true;
    try {

    try {
      this.eventBus.clear();
      this.entityManager.clearDirty();
      this.clearComponentDirty();
      this.resourceStore.clearDirty();

      if (metrics) {
        metrics.commandStats.pendingBeforeTick = this.commandQueue.pending;
      }
      const commandsStart = collectDetailedTimings ? now() : 0;
      const commandsResult = this.processCommands(tick);
      if (metrics) {
        metrics.commandStats.processed = commandsResult.processed;
      }
      if (collectDetailedTimings && metrics) {
        metrics.durationMs.commands = now() - commandsStart;
      }
      if (commandsResult.failure) {
        return this.finalizeTickFailure(commandsResult.failure, metrics, totalStart);
      }

      const systemsStart = collectDetailedTimings ? now() : 0;
      const systemsFailure = this.executeSystems(
        tick,
        metrics,
        collectDetailedTimings,
      );
      if (collectDetailedTimings && metrics) {
        metrics.durationMs.systems = now() - systemsStart;
      }
      if (systemsFailure) {
        return this.finalizeTickFailure(systemsFailure, metrics, totalStart);
      }

      const resourcesStart = collectDetailedTimings ? now() : 0;
      try {
        this.resourceStore.processTick((id) => this.entityManager.isAlive(id));
      } catch (error) {
        return this.finalizeTickFailure(
          this.createTickFailure({
            tick,
            phase: 'resources',
            code: 'resource_processing_threw',
            message: errorMessage(error),
            subsystem: 'resources',
            error,
          }),
          metrics,
          totalStart,
        );
      }
      if (collectDetailedTimings && metrics) {
        metrics.durationMs.resources = now() - resourcesStart;
      }

      const diffStart = collectDetailedTimings ? now() : 0;
      try {
        this.buildDiff();
      } catch (error) {
        return this.finalizeTickFailure(
          this.createTickFailure({
            tick,
            phase: 'diff',
            code: 'diff_build_threw',
            message: errorMessage(error),
            subsystem: 'diff',
            error,
          }),
          metrics,
          totalStart,
        );
      }
      if (collectDetailedTimings && metrics) {
        metrics.durationMs.diff = now() - diffStart;
      }
      if (metrics) {
        metrics.durationMs.total = now() - totalStart;
      }
      this.currentMetrics = metrics;
      this.lastTickFailure = null;
      this.gameLoop.advance();
    } finally {
      this.activeMetrics = null;
    }

    try {
      for (const listener of this.diffListeners) {
        listener(this.currentDiff!);
      }
    } catch (error) {
      return this.finalizeTickFailure(
        this.createTickFailure({
          tick,
          phase: 'listeners',
          code: 'diff_listener_threw',
          message: errorMessage(error),
          subsystem: 'listeners',
          error,
        }),
        metrics,
        totalStart,
      );
    }

    return null;
    } finally {
      // Spec 6 (v0.8.8): clear `_inTickPhase` AFTER both diff-listener emission
      // AND any finalizeTickFailure-driven onTickFailure listener emission have
      // completed. Listener-side mutations remain in-tick.
      this._inTickPhase = false;
    }
  }

  private finalizeTickFailure(
    failure: TickFailure,
    metrics: WorldMetrics | null,
    totalStart: number,
  ): TickFailure {
    if (metrics) {
      metrics.durationMs.total = now() - totalStart;
    }
    this.currentMetrics = metrics;
    this.lastTickFailure = failure;
    this.poisoned = failure;
    if (failure.phase !== 'listeners') {
      this.currentDiff = null;
      // Listener-phase failures already happened AFTER gameLoop.advance() ran in
      // the success path. For every other phase, advance now so the failed tick
      // number is consumed and the next successful tick gets a distinct number.
      this.gameLoop.advance();
    }
    this.emitTickFailure(failure);
    return cloneTickFailure(failure);
  }

  protected clearComponentDirty(): void {
    for (const store of this.componentStores.values()) {
      store.clearDirty();
    }
    this.clearStateDirty();
    this.tagsDirtyEntities.clear();
    this.metaDirtyEntities.clear();
  }

  private clearStateDirty(): void {
    this.stateDirtyKeys.clear();
    this.stateRemovedKeys.clear();
    this.stateBaseline.clear();
    for (const [key, value] of this.stateStore) {
      this.stateBaseline.set(key, jsonFingerprint(value, `state '${key}'`));
    }
  }

  protected getStateDirty(): { set: Record<string, unknown>; removed: string[] } {
    const changed = new Set(this.stateDirtyKeys);
    for (const [key, value] of this.stateStore) {
      if (changed.has(key)) continue;
      const prev = this.stateBaseline.get(key);
      const current = jsonFingerprint(value, `state '${key}'`);
      if (prev !== current) {
        changed.add(key);
      }
    }
    const set: Record<string, unknown> = {};
    for (const key of changed) {
      const value = this.stateStore.get(key);
      if (value !== undefined) {
        set[key] = value;
      }
    }
    return { set, removed: [...this.stateRemovedKeys] };
  }

  protected buildDiff(): void {
    const entities = this.entityManager.getDirty();
    const components: Record<
      string,
      { set: Array<[EntityId, unknown]>; removed: EntityId[] }
    > = {};
    for (const [key, store] of this.componentStores) {
      const dirty = store.getDirty();
      if (dirty.set.length > 0 || dirty.removed.length > 0) {
        components[key] = dirty;
      }
    }
    const tagsDiff: Array<{ entity: EntityId; tags: string[] }> = [];
    for (const entityId of this.tagsDirtyEntities) {
      const tags = this.entityTags.get(entityId);
      tagsDiff.push({ entity: entityId, tags: tags ? [...tags] : [] });
    }
    const metaDiff: Array<{ entity: EntityId; meta: Record<string, string | number> }> = [];
    for (const entityId of this.metaDirtyEntities) {
      const meta = this.entityMeta.get(entityId);
      const record: Record<string, string | number> = {};
      if (meta) {
        for (const [k, v] of meta) record[k] = v;
      }
      metaDiff.push({ entity: entityId, meta: record });
    }
    this.currentDiff = {
      tick: this.gameLoop.tick + 1,
      entities,
      components,
      resources: this.resourceStore.getDirty(),
      state: this.getStateDirty(),
      tags: tagsDiff,
      metadata: metaDiff,
    };
  }
}
