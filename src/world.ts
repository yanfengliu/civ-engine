import type {
  EntityId,
  EntityRef,
  InstrumentationProfile,
  Position,
  WorldConfig,
} from './types.js';
import type { WorldSnapshot } from './serializer.js';
import type { TickDiff } from './diff.js';
import { EntityManager } from './entity-manager.js';
import { ComponentStore } from './component-store.js';
import { SpatialGrid } from './spatial-grid.js';
import type { SpatialGridView } from './spatial-grid.js';
import { GameLoop } from './game-loop.js';
import { EventBus } from './event-bus.js';
import { CommandQueue } from './command-queue.js';
import { ResourceStore } from './resource-store.js';
import type { ResourceMax, ResourcePool } from './resource-store.js';
import { assertJsonCompatible, type JsonValue } from './json.js';
import { DeterministicRandom } from './random.js';
import {
  COMMAND_EXECUTION_SCHEMA_VERSION,
  COMMAND_RESULT_SCHEMA_VERSION,
  TICK_FAILURE_SCHEMA_VERSION,
  WORLD_STEP_RESULT_SCHEMA_VERSION,
} from './ai-contract.js';

export type System<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> = (world: World<TEventMap, TCommandMap>) => void;

export const SYSTEM_PHASES = [
  'input',
  'preUpdate',
  'update',
  'postUpdate',
  'output',
] as const;

export type SystemPhase = (typeof SYSTEM_PHASES)[number];

export interface SystemRegistration<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  name?: string;
  phase?: SystemPhase;
  execute: System<TEventMap, TCommandMap>;
}

export interface WorldMetrics {
  tick: number;
  entityCount: number;
  componentStoreCount: number;
  simulation: {
    tps: number;
    tickBudgetMs: number;
  };
  commandStats: {
    pendingBeforeTick: number;
    processed: number;
  };
  systems: Array<{
    name: string;
    phase: SystemPhase;
    durationMs: number;
  }>;
  query: {
    calls: number;
    cacheHits: number;
    cacheMisses: number;
    results: number;
  };
  spatial: {
    fullScans: number;
    scannedEntities: number;
    explicitSyncs: number;
  };
  durationMs: {
    total: number;
    commands: number;
    spatialSync: number;
    systems: number;
    resources: number;
    diff: number;
  };
}

export interface CommandValidationRejection {
  code: string;
  message?: string;
  details?: JsonValue;
}

export type CommandValidationResult = boolean | CommandValidationRejection;

export interface CommandSubmissionResult<
  TCommandType extends PropertyKey = string,
> {
  schemaVersion: typeof COMMAND_RESULT_SCHEMA_VERSION;
  accepted: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
  sequence: number;
  validatorIndex: number | null;
}

export interface CommandExecutionResult<
  TCommandType extends PropertyKey = string,
> {
  schemaVersion: typeof COMMAND_EXECUTION_SCHEMA_VERSION;
  submissionSequence: number | null;
  executed: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
}

export type TickFailurePhase =
  | 'commands'
  | 'spatialSync'
  | 'systems'
  | 'resources'
  | 'diff'
  | 'listeners';

export interface TickFailure {
  schemaVersion: typeof TICK_FAILURE_SCHEMA_VERSION;
  tick: number;
  phase: TickFailurePhase;
  code: string;
  message: string;
  subsystem: string;
  commandType: string | null;
  submissionSequence: number | null;
  systemName: string | null;
  details: JsonValue | null;
  error: {
    name: string;
    message: string;
    stack: string | null;
  } | null;
}

export interface WorldStepResult {
  schemaVersion: typeof WORLD_STEP_RESULT_SCHEMA_VERSION;
  ok: boolean;
  tick: number;
  failure: TickFailure | null;
}

export class WorldTickFailureError extends Error {
  readonly failure: TickFailure;

  constructor(failure: TickFailure) {
    super(failure.message);
    this.name = 'WorldTickFailureError';
    this.failure = failure;
  }
}

type ComponentTuple<T extends unknown[]> = { [K in keyof T]: T[K] | undefined };

interface QueryCacheEntry {
  readonly mask: bigint;
  readonly entities: EntityId[];
}

interface RegisteredSystem<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  name: string;
  phase: SystemPhase;
  execute: System<TEventMap, TCommandMap>;
  order: number;
}

interface TickRunOptions {
  collectMetrics: boolean;
}

export class World<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  private entityManager: EntityManager;
  private componentStores = new Map<string, ComponentStore<unknown>>();
  private componentBits = new Map<string, bigint>();
  private nextComponentBit = 0;
  private entitySignatures: bigint[] = [];
  private queryCache = new Map<string, QueryCacheEntry>();
  private systems: Array<RegisteredSystem<TEventMap, TCommandMap>> = [];
  private nextSystemOrder = 0;
  private gameLoop: GameLoop;
  private previousPositions = new Map<EntityId, { x: number; y: number }>();
  private eventBus = new EventBus<TEventMap>();
  private commandQueue = new CommandQueue<TCommandMap>();
  private validators = new Map<
    keyof TCommandMap,
    Array<
      (data: never, world: World<TEventMap, TCommandMap>) => CommandValidationResult
    >
  >();
  private handlers = new Map<
    keyof TCommandMap,
    (data: never, world: World<TEventMap, TCommandMap>) => void
  >();
  private spatialGrid: SpatialGrid;
  readonly grid: SpatialGridView;
  readonly positionKey: string;
  private readonly seed: number | string | undefined;
  private readonly detectInPlacePositionMutations: boolean;
  private readonly instrumentationProfile: InstrumentationProfile;
  private currentDiff: TickDiff | null = null;
  private currentMetrics: WorldMetrics | null = null;
  private activeMetrics: WorldMetrics | null = null;
  private lastTickFailure: TickFailure | null = null;
  private diffListeners = new Set<(diff: TickDiff) => void>();
  private resourceStore = new ResourceStore();
  private rng: DeterministicRandom;
  private nextCommandResultSequence = 0;
  private commandResultListeners = new Set<
    (result: CommandSubmissionResult<keyof TCommandMap>) => void
  >();
  private commandExecutionListeners = new Set<
    (result: CommandExecutionResult<keyof TCommandMap>) => void
  >();
  private tickFailureListeners = new Set<(failure: TickFailure) => void>();
  private destroyCallbacks: Array<
    (id: EntityId, world: World<TEventMap, TCommandMap>) => void
  > = [];

  constructor(config: WorldConfig) {
    validateWorldConfig(config);
    this.entityManager = new EntityManager();
    this.spatialGrid = new SpatialGrid(config.gridWidth, config.gridHeight);
    this.grid = this.spatialGrid;
    this.positionKey = config.positionKey ?? 'position';
    this.seed = config.seed;
    this.detectInPlacePositionMutations =
      config.detectInPlacePositionMutations ?? true;
    this.instrumentationProfile = config.instrumentationProfile ?? 'full';
    this.rng = new DeterministicRandom(config.seed);
    this.gameLoop = new GameLoop({
      tps: config.tps,
      onTick: () => this.executeTickOrThrow(),
      maxTicksPerFrame: config.maxTicksPerFrame,
    });
  }

  createEntity(): EntityId {
    const id = this.entityManager.create();
    this.entitySignatures[id] = 0n;
    return id;
  }

  destroyEntity(id: EntityId): void {
    if (!this.entityManager.isAlive(id)) return;

    for (const callback of this.destroyCallbacks) {
      callback(id, this);
    }

    const prev = this.previousPositions.get(id);
    if (prev) {
      this.spatialGrid.remove(id, prev.x, prev.y);
      this.previousPositions.delete(id);
    }
    this.setEntitySignature(id, 0n);
    for (const store of this.componentStores.values()) {
      store.remove(id);
    }
    this.resourceStore.removeEntity(id);
    this.entityManager.destroy(id);
  }

  isAlive(id: EntityId): boolean {
    return this.entityManager.isAlive(id);
  }

  getEntityRef(id: EntityId): EntityRef | null {
    if (!this.entityManager.isAlive(id)) return null;
    return { id, generation: this.entityManager.getGeneration(id) };
  }

  isCurrent(ref: EntityRef): boolean {
    return (
      this.entityManager.isAlive(ref.id) &&
      this.entityManager.getGeneration(ref.id) === ref.generation
    );
  }

  onDestroy(
    callback: (id: EntityId, world: World<TEventMap, TCommandMap>) => void,
  ): void {
    this.destroyCallbacks.push(callback);
  }

  offDestroy(
    callback: (id: EntityId, world: World<TEventMap, TCommandMap>) => void,
  ): void {
    const index = this.destroyCallbacks.indexOf(callback);
    if (index !== -1) {
      this.destroyCallbacks.splice(index, 1);
    }
  }

  registerComponent<T>(key: string): void {
    if (this.componentStores.has(key)) {
      throw new Error(`Component '${key}' is already registered`);
    }
    this.componentStores.set(key, new ComponentStore<T>());
    this.registerComponentBit(key);
  }

  addComponent<T>(entity: EntityId, key: string, data: T): void {
    this.setComponent(entity, key, data);
  }

  setComponent<T>(entity: EntityId, key: string, data: T): void {
    this.assertAlive(entity);
    const position = key === this.positionKey ? asPosition(data) : null;
    if (position) {
      this.assertPositionInBounds(position);
    }
    const store = this.getStore<T>(key);
    const hadComponent = store.has(entity);
    store.set(entity, data);
    if (!hadComponent) {
      this.setEntityComponentSignature(entity, key, true);
    }
    if (position) {
      this.syncSpatialEntity(entity, position);
    }
  }

  getComponent<T>(entity: EntityId, key: string): T | undefined {
    const store = this.componentStores.get(key) as
      | ComponentStore<T>
      | undefined;
    return store?.get(entity);
  }

  getComponents<T extends unknown[]>(
    entity: EntityId,
    keys: string[],
  ): ComponentTuple<T> {
    return keys.map((key) => {
      const store = this.componentStores.get(key);
      return store?.get(entity);
    }) as ComponentTuple<T>;
  }

  removeComponent(entity: EntityId, key: string): void {
    this.assertAlive(entity);
    const store = this.componentStores.get(key);
    const hadComponent = store?.has(entity) ?? false;
    store?.remove(entity);
    if (hadComponent) {
      this.setEntityComponentSignature(entity, key, false);
    }
    if (key === this.positionKey) {
      this.removeFromSpatialIndex(entity);
    }
  }

  patchComponent<T>(
    entity: EntityId,
    key: string,
    patch: (data: T) => T | void,
  ): T {
    this.assertAlive(entity);
    const current = this.getComponent<T>(entity, key);
    if (current === undefined) {
      throw new Error(`Entity ${entity} does not have component '${key}'`);
    }
    const next = patch(current) ?? current;
    this.setComponent(entity, key, next);
    return next;
  }

  setPosition(
    entity: EntityId,
    position: Position,
    key = this.positionKey,
  ): void {
    this.setComponent(entity, key, { x: position.x, y: position.y });
  }

  markPositionDirty(entity: EntityId, key = this.positionKey): void {
    this.assertAlive(entity);
    if (key !== this.positionKey) {
      throw new Error(`Position key '${key}' is not the world's positionKey`);
    }
    const current = this.getComponent<Position>(entity, key);
    if (current === undefined) {
      throw new Error(`Entity ${entity} does not have component '${key}'`);
    }
    const position = asPosition(current);
    this.assertPositionInBounds(position);
    this.syncSpatialEntity(entity, position);
  }

  *query(...keys: string[]): IterableIterator<EntityId> {
    const queryKeys = this.normalizeQueryKeys(keys);
    if (!queryKeys) return;
    if (this.activeMetrics) {
      this.activeMetrics.query.calls++;
    }
    const cache = this.getQueryCache(queryKeys);
    for (const id of cache.entities) {
      if (this.activeMetrics) {
        this.activeMetrics.query.results++;
      }
      yield id;
    }
  }

  registerSystem(
    system:
      | System<TEventMap, TCommandMap>
      | SystemRegistration<TEventMap, TCommandMap>,
  ): void {
    this.systems.push(this.normalizeSystemRegistration(system));
  }

  step(): void {
    this.gameLoop.step();
  }

  stepWithResult(): WorldStepResult {
    const failure = this.runTick({ collectMetrics: true });
    if (!failure) {
      this.gameLoop.setTick(this.gameLoop.tick + 1);
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

  start(): void {
    this.gameLoop.start();
  }

  stop(): void {
    this.gameLoop.stop();
  }

  setSpeed(multiplier: number): void {
    this.gameLoop.setSpeed(multiplier);
  }

  getSpeed(): number {
    return this.gameLoop.getSpeed();
  }

  pause(): void {
    this.gameLoop.pause();
  }

  resume(): void {
    this.gameLoop.resume();
  }

  get isPaused(): boolean {
    return this.gameLoop.isPaused;
  }

  emit<K extends keyof TEventMap>(type: K, data: TEventMap[K]): void {
    this.eventBus.emit(type, data);
  }

  on<K extends keyof TEventMap>(
    type: K,
    listener: (event: TEventMap[K]) => void,
  ): void {
    this.eventBus.on(type, listener);
  }

  off<K extends keyof TEventMap>(
    type: K,
    listener: (event: TEventMap[K]) => void,
  ): void {
    this.eventBus.off(type, listener);
  }

  submit<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): boolean {
    if (
      this.instrumentationProfile === 'release' &&
      this.commandResultListeners.size === 0
    ) {
      const rejection = this.validateCommand(type, data);
      if (rejection) {
        return false;
      }
      this.commandQueue.push(type, data);
      return true;
    }
    return this.submitWithResult(type, data).accepted;
  }

  submitWithResult<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
  ): CommandSubmissionResult<K> {
    const rejection = this.validateCommand(type, data);
    if (rejection) {
      const result = this.createCommandSubmissionResult(type, {
        accepted: false,
        code: rejection.code,
        message: rejection.message,
        details: rejection.details,
        validatorIndex: rejection.validatorIndex,
      });
      this.emitCommandResult(result);
      return result;
    }

    const result = this.createCommandSubmissionResult(type, {
      accepted: true,
      code: 'accepted',
      message: 'Queued command',
      details: null,
      validatorIndex: null,
    });
    this.commandQueue.push(type, data, {
      submissionSequence: result.sequence,
    });
    this.emitCommandResult(result);
    return result;
  }

  registerValidator<K extends keyof TCommandMap>(
    type: K,
    fn: (
      data: TCommandMap[K],
      world: World<TEventMap, TCommandMap>,
    ) => CommandValidationResult,
  ): void {
    let fns = this.validators.get(type);
    if (!fns) {
      fns = [];
      this.validators.set(type, fns);
    }
    fns.push(
      fn as (
        data: never,
        world: World<TEventMap, TCommandMap>,
      ) => CommandValidationResult,
    );
  }

  onCommandResult(
    listener: (result: CommandSubmissionResult<keyof TCommandMap>) => void,
  ): void {
    this.commandResultListeners.add(listener);
  }

  offCommandResult(
    listener: (result: CommandSubmissionResult<keyof TCommandMap>) => void,
  ): void {
    this.commandResultListeners.delete(listener);
  }

  onCommandExecution(
    listener: (result: CommandExecutionResult<keyof TCommandMap>) => void,
  ): void {
    this.commandExecutionListeners.add(listener);
  }

  offCommandExecution(
    listener: (result: CommandExecutionResult<keyof TCommandMap>) => void,
  ): void {
    this.commandExecutionListeners.delete(listener);
  }

  registerHandler<K extends keyof TCommandMap>(
    type: K,
    fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => void,
  ): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler already registered for command '${String(type)}'`);
    }
    this.handlers.set(
      type,
      fn as (data: never, world: World<TEventMap, TCommandMap>) => void,
    );
  }

  hasCommandHandler(type: keyof TCommandMap): boolean {
    return this.handlers.has(type);
  }

  onTickFailure(listener: (failure: TickFailure) => void): void {
    this.tickFailureListeners.add(listener);
  }

  offTickFailure(listener: (failure: TickFailure) => void): void {
    this.tickFailureListeners.delete(listener);
  }

  getEvents(): ReadonlyArray<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }> {
    return this.eventBus.getEvents();
  }

  random(): number {
    return this.rng.random();
  }

  serialize(): WorldSnapshot {
    const components: Record<string, Array<[EntityId, unknown]>> = {};
    for (const [key, store] of this.componentStores) {
      const entries = [...store.entries()];
      for (const [entity, data] of entries) {
        assertJsonCompatible(data, `component '${key}' on entity ${entity}`);
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
    if (!this.detectInPlacePositionMutations) {
      config.detectInPlacePositionMutations = false;
    }

    const snapshotTick = this.getObservableTick();

    return {
      version: 3,
      config,
      tick: snapshotTick,
      entities: this.entityManager.getState(),
      components,
      resources: this.resourceStore.getState(),
      rng: this.rng.getState(),
    };
  }

  static deserialize<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  >(
    snapshot: WorldSnapshot,
    systems?: Array<
      System<TEventMap, TCommandMap> | SystemRegistration<TEventMap, TCommandMap>
    >,
  ): World<TEventMap, TCommandMap> {
    const version = (snapshot as { version: number }).version;
    if (version !== 1 && version !== 2 && version !== 3) {
      throw new Error(`Unsupported snapshot version: ${version}`);
    }
    if (
      snapshot.entities.generations.length !== snapshot.entities.alive.length
    ) {
      throw new Error('Invalid entity state: array length mismatch');
    }

    const world = new World<TEventMap, TCommandMap>(snapshot.config);
    world.entityManager = EntityManager.fromState(snapshot.entities);

    world.componentStores.clear();
    for (const [key, entries] of Object.entries(snapshot.components)) {
      world.componentStores.set(
        key,
        ComponentStore.fromEntries(entries as Array<[number, unknown]>),
      );
    }
    world.rebuildComponentSignatures();
    if ('resources' in snapshot) {
      world.resourceStore = ResourceStore.fromState(snapshot.resources);
    }
    if ('rng' in snapshot) {
      world.rng = DeterministicRandom.fromState(snapshot.rng);
    }
    world.rebuildSpatialIndex();

    world.gameLoop.setTick(snapshot.tick);

    if (systems) {
      for (const system of systems) {
        world.registerSystem(system);
      }
    }

    return world;
  }

  get tick(): number {
    return this.gameLoop.tick;
  }

  getDiff(): TickDiff | null {
    return this.currentDiff;
  }

  getMetrics(): WorldMetrics | null {
    return this.currentMetrics ? cloneMetrics(this.currentMetrics) : null;
  }

  getInstrumentationProfile(): InstrumentationProfile {
    return this.instrumentationProfile;
  }

  getLastTickFailure(): TickFailure | null {
    return this.lastTickFailure ? cloneTickFailure(this.lastTickFailure) : null;
  }

  onDiff(fn: (diff: TickDiff) => void): void {
    this.diffListeners.add(fn);
  }

  offDiff(fn: (diff: TickDiff) => void): void {
    this.diffListeners.delete(fn);
  }

  registerResource(key: string, options?: { defaultMax?: ResourceMax }): void {
    this.resourceStore.register(key, options);
  }

  addResource(entity: EntityId, key: string, amount: number): number {
    this.assertAlive(entity);
    return this.resourceStore.addResource(entity, key, amount);
  }

  removeResource(entity: EntityId, key: string, amount: number): number {
    this.assertAlive(entity);
    return this.resourceStore.removeResource(entity, key, amount);
  }

  getResource(
    entity: EntityId,
    key: string,
  ): ResourcePool | undefined {
    return this.resourceStore.getResource(entity, key);
  }

  setResourceMax(entity: EntityId, key: string, max: ResourceMax): void {
    this.assertAlive(entity);
    this.resourceStore.setResourceMax(entity, key, max);
  }

  *getResourceEntities(key: string): IterableIterator<EntityId> {
    yield* this.resourceStore.getResourceEntities(key);
  }

  setProduction(entity: EntityId, key: string, rate: number): void {
    this.assertAlive(entity);
    this.resourceStore.setProduction(entity, key, rate);
  }

  setConsumption(entity: EntityId, key: string, rate: number): void {
    this.assertAlive(entity);
    this.resourceStore.setConsumption(entity, key, rate);
  }

  getProduction(entity: EntityId, key: string): number {
    return this.resourceStore.getProduction(entity, key);
  }

  getConsumption(entity: EntityId, key: string): number {
    return this.resourceStore.getConsumption(entity, key);
  }

  addTransfer(
    from: EntityId,
    to: EntityId,
    resource: string,
    rate: number,
  ): number {
    this.assertAlive(from);
    this.assertAlive(to);
    return this.resourceStore.addTransfer(from, to, resource, rate);
  }

  removeTransfer(id: number): void {
    this.resourceStore.removeTransfer(id);
  }

  getTransfers(
    entity: EntityId,
  ): Array<{
    id: number;
    from: EntityId;
    to: EntityId;
    resource: string;
    rate: number;
  }> {
    return this.resourceStore.getTransfers(entity);
  }

  private getObservableTick(): number {
    return Math.max(
      this.gameLoop.tick,
      this.currentMetrics?.tick ?? 0,
      this.currentDiff?.tick ?? 0,
      this.lastTickFailure?.tick ?? 0,
    );
  }

  private clearComponentDirty(): void {
    for (const store of this.componentStores.values()) {
      store.clearDirty();
    }
  }

  private buildDiff(): void {
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
    this.currentDiff = {
      tick: this.gameLoop.tick + 1,
      entities,
      components,
      resources: this.resourceStore.getDirty(),
    };
  }

  private runTick(options: TickRunOptions): TickFailure | null {
    const metrics = options.collectMetrics
      ? createMetrics(
          this.gameLoop.tick + 1,
          this.entityManager.count,
          this.componentStores.size,
          this.gameLoop.tps,
        )
      : null;
    this.activeMetrics = metrics;
    const totalStart = metrics ? now() : 0;

    try {
      this.eventBus.clear();
      this.entityManager.clearDirty();
      this.clearComponentDirty();
      this.resourceStore.clearDirty();

      if (metrics) {
        metrics.commandStats.pendingBeforeTick = this.commandQueue.pending;
      }
      const commandsStart = metrics ? now() : 0;
      const tick = metrics?.tick ?? this.gameLoop.tick + 1;
      const commandsResult = this.processCommands(tick);
      if (metrics) {
        metrics.commandStats.processed = commandsResult.processed;
        metrics.durationMs.commands = now() - commandsStart;
      }
      if (commandsResult.failure) {
        return this.finalizeTickFailure(commandsResult.failure, metrics, totalStart);
      }

      const spatialStart = metrics ? now() : 0;
      try {
        this.syncSpatialIndex();
      } catch (error) {
        return this.finalizeTickFailure(
          this.createTickFailure({
            tick,
            phase: 'spatialSync',
            code: 'spatial_sync_threw',
            message: errorMessage(error),
            subsystem: 'spatial',
            error,
          }),
          metrics,
          totalStart,
        );
      }
      if (metrics) {
        metrics.durationMs.spatialSync = now() - spatialStart;
      }

      const systemsStart = metrics ? now() : 0;
      const systemsFailure = this.executeSystems(tick, metrics);
      if (metrics) {
        metrics.durationMs.systems = now() - systemsStart;
      }
      if (systemsFailure) {
        return this.finalizeTickFailure(systemsFailure, metrics, totalStart);
      }

      const resourcesStart = metrics ? now() : 0;
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
      if (metrics) {
        metrics.durationMs.resources = now() - resourcesStart;
      }

      const diffStart = metrics ? now() : 0;
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
      if (metrics) {
        metrics.durationMs.diff = now() - diffStart;
        metrics.durationMs.total = now() - totalStart;
      }
      this.currentMetrics = metrics;
      this.lastTickFailure = null;
    } finally {
      this.activeMetrics = null;
    }

    try {
      for (const listener of this.diffListeners) {
        listener(this.currentDiff!);
      }
    } catch (error) {
      const tick = metrics?.tick ?? this.gameLoop.tick + 1;
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
  }

  private processCommands(tick: number): {
    processed: number;
    failure: TickFailure | null;
  } {
    const commands = this.commandQueue.drain();
    let processed = 0;
    for (const command of commands) {
      const handler = this.handlers.get(command.type);
      if (!handler) {
        const failure = this.createTickFailure({
          tick,
          phase: 'commands',
          code: 'missing_handler',
          message: `No handler registered for command '${String(command.type)}'`,
          subsystem: 'commands',
          commandType: command.type,
          submissionSequence: command.submissionSequence,
          details: null,
        });
        this.emitCommandExecution(command.type, {
          submissionSequence: command.submissionSequence,
          executed: false,
          code: 'missing_handler',
          message: failure.message,
          details: null,
          tick,
        });
        return { processed, failure };
      }

      try {
        handler(command.data as never, this);
        processed++;
        this.emitCommandExecution(command.type, {
          submissionSequence: command.submissionSequence,
          executed: true,
          code: 'executed',
          message: 'Command handler completed',
          details: null,
          tick,
        });
      } catch (error) {
        const details = createErrorDetails(error);
        const failure = this.createTickFailure({
          tick,
          phase: 'commands',
          code: 'command_handler_threw',
          message: errorMessage(error),
          subsystem: 'commands',
          commandType: command.type,
          submissionSequence: command.submissionSequence,
          details: {
            commandType: String(command.type),
            submissionSequence: command.submissionSequence,
            error: details,
          },
          error,
        });
        this.emitCommandExecution(command.type, {
          submissionSequence: command.submissionSequence,
          executed: false,
          code: 'command_handler_threw',
          message: errorMessage(error),
          details: {
            error: details,
          },
          tick,
        });
        return { processed, failure };
      }
    }

    return { processed, failure: null };
  }

  private createCommandSubmissionResult<K extends keyof TCommandMap>(
    type: K,
    config: {
      accepted: boolean;
      code: string;
      message: string;
      details: JsonValue | null;
      validatorIndex: number | null;
    },
  ): CommandSubmissionResult<K> {
    if (config.details !== null) {
      assertJsonCompatible(config.details, `command result details for '${String(type)}'`);
    }
    return {
      schemaVersion: COMMAND_RESULT_SCHEMA_VERSION,
      accepted: config.accepted,
      commandType: type,
      code: config.code,
      message: config.message,
      details: config.details,
      tick: this.getObservableTick(),
      sequence: this.nextCommandResultSequence++,
      validatorIndex: config.validatorIndex,
    };
  }

  private createCommandExecutionResult<K extends keyof TCommandMap>(
    type: K,
    config: {
      submissionSequence: number | null;
      executed: boolean;
      code: string;
      message: string;
      details: JsonValue | null;
      tick: number;
    },
  ): CommandExecutionResult<K> {
    if (config.details !== null) {
      assertJsonCompatible(
        config.details,
        `command execution details for '${String(type)}'`,
      );
    }
    return {
      schemaVersion: COMMAND_EXECUTION_SCHEMA_VERSION,
      submissionSequence: config.submissionSequence,
      executed: config.executed,
      commandType: type,
      code: config.code,
      message: config.message,
      details: config.details,
      tick: config.tick,
    };
  }

  private emitCommandResult<K extends keyof TCommandMap>(
    result: CommandSubmissionResult<K>,
  ): void {
    for (const listener of this.commandResultListeners) {
      listener(result as CommandSubmissionResult<keyof TCommandMap>);
    }
  }

  private emitCommandExecutionResult<K extends keyof TCommandMap>(
    result: CommandExecutionResult<K>,
  ): void {
    for (const listener of this.commandExecutionListeners) {
      listener(result as CommandExecutionResult<keyof TCommandMap>);
    }
  }

  private emitTickFailure(failure: TickFailure): void {
    for (const listener of this.tickFailureListeners) {
      listener(cloneTickFailure(failure));
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
    if (failure.phase !== 'listeners') {
      this.currentDiff = null;
    }
    this.emitTickFailure(failure);
    return cloneTickFailure(failure);
  }

  private createTickFailure(config: {
    tick: number;
    phase: TickFailurePhase;
    code: string;
    message: string;
    subsystem: string;
    commandType?: PropertyKey;
    submissionSequence?: number | null;
    systemName?: string;
    details?: JsonValue | null;
    error?: unknown;
  }): TickFailure {
    if (config.details !== undefined && config.details !== null) {
      assertJsonCompatible(
        config.details,
        `tick failure details for '${config.code}'`,
      );
    }
    return {
      schemaVersion: TICK_FAILURE_SCHEMA_VERSION,
      tick: config.tick,
      phase: config.phase,
      code: config.code,
      message: config.message,
      subsystem: config.subsystem,
      commandType:
        config.commandType !== undefined ? String(config.commandType) : null,
      submissionSequence: config.submissionSequence ?? null,
      systemName: config.systemName ?? null,
      details: config.details ?? null,
      error: config.error !== undefined ? createErrorDetails(config.error) : null,
    };
  }

  private executeTickOrThrow(): void {
    const failure = this.runTick({
      collectMetrics: this.instrumentationProfile !== 'release',
    });
    if (failure) {
      throw new WorldTickFailureError(failure);
    }
  }

  private executeSystems(
    tick: number,
    metrics: WorldMetrics | null,
  ): TickFailure | null {
    const systems = [...this.systems].sort((a, b) => {
      const phaseDelta = phaseIndex(a.phase) - phaseIndex(b.phase);
      return phaseDelta !== 0 ? phaseDelta : a.order - b.order;
    });

    for (const system of systems) {
      const start = metrics ? now() : 0;
      try {
        system.execute(this);
      } catch (error) {
        return this.createTickFailure({
          tick,
          phase: 'systems',
          code: 'system_threw',
          message: errorMessage(error),
          subsystem: 'systems',
          systemName: system.name,
          details: {
            systemName: system.name,
            systemPhase: system.phase,
            error: createErrorDetails(error),
          },
          error,
        });
      }
      if (metrics) {
        metrics.systems.push({
          name: system.name,
          phase: system.phase,
          durationMs: now() - start,
        });
      }
    }

    return null;
  }

  private validateCommand<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
  ): {
    code: string;
    message: string;
    details: JsonValue | null;
    validatorIndex: number;
  } | null {
    const fns = this.validators.get(type);
    if (!fns) {
      return null;
    }

    for (let index = 0; index < fns.length; index++) {
      const validation = (
        fns[index] as (
          data: TCommandMap[K],
          world: World<TEventMap, TCommandMap>,
        ) => CommandValidationResult
      )(data, this);
      const rejection = normalizeCommandValidationResult(validation, index);
      if (rejection) {
        return rejection;
      }
    }

    return null;
  }

  private emitCommandExecution<K extends keyof TCommandMap>(
    type: K,
    config: {
      submissionSequence: number | null;
      executed: boolean;
      code: string;
      message: string;
      details: JsonValue | null;
      tick: number;
    },
  ): void {
    if (this.commandExecutionListeners.size === 0) {
      return;
    }
    this.emitCommandExecutionResult(this.createCommandExecutionResult(type, config));
  }

  private normalizeSystemRegistration(
    system:
      | System<TEventMap, TCommandMap>
      | SystemRegistration<TEventMap, TCommandMap>,
  ): RegisteredSystem<TEventMap, TCommandMap> {
    const order = this.nextSystemOrder++;
    if (typeof system === 'function') {
      return {
        name: system.name || `system#${order}`,
        phase: 'update',
        execute: system,
        order,
      };
    }

    const phase = system.phase ?? 'update';
    if (!isSystemPhase(phase)) {
      throw new Error(`Unknown system phase '${String(phase)}'`);
    }

    return {
      name: system.name ?? system.execute.name ?? `system#${order}`,
      phase,
      execute: system.execute,
      order,
    };
  }

  private syncSpatialIndex(): void {
    if (!this.detectInPlacePositionMutations) return;

    const posStore = this.componentStores.get(this.positionKey) as
      | ComponentStore<Position>
      | undefined;
    if (!posStore) return;

    if (this.activeMetrics) {
      this.activeMetrics.spatial.fullScans++;
    }
    const seen = new Set<EntityId>();

    for (const id of posStore.entities()) {
      seen.add(id);
      if (this.activeMetrics) {
        this.activeMetrics.spatial.scannedEntities++;
      }
      const pos = asPosition(posStore.get(id));
      this.assertPositionInBounds(pos);
      const prev = this.previousPositions.get(id);

      if (!prev) {
        this.spatialGrid.insert(id, pos.x, pos.y);
        this.previousPositions.set(id, { x: pos.x, y: pos.y });
      } else if (prev.x !== pos.x || prev.y !== pos.y) {
        this.spatialGrid.move(id, prev.x, prev.y, pos.x, pos.y);
        prev.x = pos.x;
        prev.y = pos.y;
      }
    }

    for (const [id, pos] of this.previousPositions) {
      if (!seen.has(id)) {
        this.spatialGrid.remove(id, pos.x, pos.y);
        this.previousPositions.delete(id);
      }
    }
  }

  private syncSpatialEntity(entity: EntityId, pos: Position): void {
    if (this.activeMetrics) {
      this.activeMetrics.spatial.explicitSyncs++;
    }
    const prev = this.previousPositions.get(entity);
    if (!prev) {
      this.spatialGrid.insert(entity, pos.x, pos.y);
      this.previousPositions.set(entity, { x: pos.x, y: pos.y });
      return;
    }
    if (prev.x !== pos.x || prev.y !== pos.y) {
      this.spatialGrid.move(entity, prev.x, prev.y, pos.x, pos.y);
      prev.x = pos.x;
      prev.y = pos.y;
    }
  }

  private rebuildSpatialIndex(): void {
    const posStore = this.componentStores.get(this.positionKey) as
      | ComponentStore<Position>
      | undefined;
    if (!posStore) return;

    this.previousPositions.clear();
    for (const id of posStore.entities()) {
      const pos = asPosition(posStore.get(id));
      this.assertPositionInBounds(pos);
      this.spatialGrid.insert(id, pos.x, pos.y);
      this.previousPositions.set(id, { x: pos.x, y: pos.y });
    }
  }

  private removeFromSpatialIndex(entity: EntityId): void {
    const prev = this.previousPositions.get(entity);
    if (!prev) return;
    this.spatialGrid.remove(entity, prev.x, prev.y);
    this.previousPositions.delete(entity);
  }

  private getStore<T>(key: string): ComponentStore<T> {
    const store = this.componentStores.get(key);
    if (!store) throw new Error(`Component '${key}' is not registered`);
    return store as ComponentStore<T>;
  }

  private assertAlive(entity: EntityId): void {
    if (!this.entityManager.isAlive(entity)) {
      throw new Error(`Entity ${entity} is not alive`);
    }
  }

  private assertPositionInBounds(position: Position): void {
    this.spatialGrid.getAt(position.x, position.y);
  }

  private registerComponentBit(key: string): bigint {
    const existing = this.componentBits.get(key);
    if (existing !== undefined) return existing;
    const bit = 1n << BigInt(this.nextComponentBit);
    this.nextComponentBit++;
    this.componentBits.set(key, bit);
    return bit;
  }

  private setEntityComponentSignature(
    entity: EntityId,
    key: string,
    hasComponent: boolean,
  ): void {
    const bit = this.registerComponentBit(key);
    const current = this.entitySignatures[entity] ?? 0n;
    const next = hasComponent ? current | bit : current & ~bit;
    this.setEntitySignature(entity, next);
  }

  private setEntitySignature(entity: EntityId, next: bigint): void {
    const previous = this.entitySignatures[entity] ?? 0n;
    if (previous === next) return;
    this.entitySignatures[entity] = next;
    this.updateQueryCacheMembership(entity, previous, next);
  }

  private updateQueryCacheMembership(
    entity: EntityId,
    previous: bigint,
    next: bigint,
  ): void {
    for (const cache of this.queryCache.values()) {
      const didMatch = (previous & cache.mask) === cache.mask;
      const doesMatch = (next & cache.mask) === cache.mask;
      if (didMatch === doesMatch) continue;
      if (doesMatch) {
        insertSorted(cache.entities, entity);
      } else {
        const index = cache.entities.indexOf(entity);
        if (index !== -1) {
          cache.entities.splice(index, 1);
        }
      }
    }
  }

  private normalizeQueryKeys(keys: string[]): string[] | null {
    if (keys.length === 0) return null;

    const unique = [...new Set(keys)];
    unique.sort();
    for (const key of unique) {
      if (!this.componentStores.has(key)) {
        throw new Error(`Component '${key}' is not registered`);
      }
    }
    return unique;
  }

  private getQueryCache(keys: string[]): QueryCacheEntry {
    const cacheKey = keys.join('\0');
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      if (this.activeMetrics) {
        this.activeMetrics.query.cacheHits++;
      }
      return cached;
    }
    if (this.activeMetrics) {
      this.activeMetrics.query.cacheMisses++;
    }

    const mask = this.queryMask(keys);
    let smallest = this.componentStores.get(keys[0])!;
    for (let i = 1; i < keys.length; i++) {
      const store = this.componentStores.get(keys[i])!;
      if (store.size < smallest.size) {
        smallest = store;
      }
    }

    const entities: EntityId[] = [];
    for (const id of smallest.entities()) {
      if (((this.entitySignatures[id] ?? 0n) & mask) === mask) {
        entities.push(id);
      }
    }

    const entry = { mask, entities };
    this.queryCache.set(cacheKey, entry);
    return entry;
  }

  private queryMask(keys: string[]): bigint {
    let mask = 0n;
    for (const key of keys) {
      const bit = this.componentBits.get(key);
      if (bit === undefined) {
        throw new Error(`Component '${key}' is not registered`);
      }
      mask |= bit;
    }
    return mask;
  }

  private rebuildComponentSignatures(): void {
    this.componentBits.clear();
    this.nextComponentBit = 0;
    this.entitySignatures = [];
    this.queryCache.clear();

    for (const key of this.componentStores.keys()) {
      this.registerComponentBit(key);
    }
    for (const [key, store] of this.componentStores) {
      const bit = this.componentBits.get(key)!;
      for (const entity of store.entities()) {
        this.entitySignatures[entity] =
          (this.entitySignatures[entity] ?? 0n) | bit;
      }
    }
  }
}

function createMetrics(
  tick: number,
  entityCount: number,
  componentStoreCount: number,
  tps: number,
): WorldMetrics {
  return {
    tick,
    entityCount,
    componentStoreCount,
    simulation: {
      tps,
      tickBudgetMs: 1000 / tps,
    },
    commandStats: {
      pendingBeforeTick: 0,
      processed: 0,
    },
    systems: [],
    query: {
      calls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      results: 0,
    },
    spatial: {
      fullScans: 0,
      scannedEntities: 0,
      explicitSyncs: 0,
    },
    durationMs: {
      total: 0,
      commands: 0,
      spatialSync: 0,
      systems: 0,
      resources: 0,
      diff: 0,
    },
  };
}

function normalizeCommandValidationResult(
  result: CommandValidationResult,
  validatorIndex: number,
): {
  code: string;
  message: string;
  details: JsonValue | null;
  validatorIndex: number;
} | null {
  if (result === true) {
    return null;
  }

  if (result === false) {
    return {
      code: 'validation_failed',
      message: 'Validation failed',
      details: null,
      validatorIndex,
    };
  }

  if (!result || typeof result !== 'object' || typeof result.code !== 'string') {
    throw new Error('Command validators must return boolean or a rejection object');
  }

  if (result.code.length === 0) {
    throw new Error('Command rejection code must not be empty');
  }

  if (result.details !== undefined) {
    assertJsonCompatible(
      result.details,
      `command rejection details for validator ${validatorIndex}`,
    );
  }

  return {
    code: result.code,
    message: result.message ?? 'Validation failed',
    details: (result.details ?? null) as JsonValue | null,
    validatorIndex,
  };
}

function cloneMetrics(metrics: WorldMetrics): WorldMetrics {
  return {
    tick: metrics.tick,
    entityCount: metrics.entityCount,
    componentStoreCount: metrics.componentStoreCount,
    simulation: { ...metrics.simulation },
    commandStats: { ...metrics.commandStats },
    systems: metrics.systems.map((system) => ({ ...system })),
    query: { ...metrics.query },
    spatial: { ...metrics.spatial },
    durationMs: { ...metrics.durationMs },
  };
}

function cloneTickFailure(failure: TickFailure): TickFailure {
  return JSON.parse(JSON.stringify(failure)) as TickFailure;
}

function createErrorDetails(error: unknown): {
  name: string;
  message: string;
  stack: string | null;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: 'Error',
    message: String(error),
    stack: null,
  };
}

function errorMessage(error: unknown): string {
  return createErrorDetails(error).message;
}

function now(): number {
  return performance.now();
}

function phaseIndex(phase: SystemPhase): number {
  return SYSTEM_PHASES.indexOf(phase);
}

function isSystemPhase(value: string): value is SystemPhase {
  return (SYSTEM_PHASES as readonly string[]).includes(value);
}

function insertSorted(values: EntityId[], value: EntityId): void {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid] < value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  if (values[low] !== value) {
    values.splice(low, 0, value);
  }
}

function validateWorldConfig(config: WorldConfig): void {
  if (!Number.isInteger(config.gridWidth) || config.gridWidth <= 0) {
    throw new RangeError('gridWidth must be a positive integer');
  }
  if (!Number.isInteger(config.gridHeight) || config.gridHeight <= 0) {
    throw new RangeError('gridHeight must be a positive integer');
  }
  if (!Number.isFinite(config.tps) || config.tps <= 0) {
    throw new RangeError('tps must be a finite positive number');
  }
  if (
    config.maxTicksPerFrame !== undefined &&
    (!Number.isInteger(config.maxTicksPerFrame) || config.maxTicksPerFrame <= 0)
  ) {
    throw new RangeError('maxTicksPerFrame must be a positive integer');
  }
  if (config.positionKey !== undefined && config.positionKey.length === 0) {
    throw new Error('positionKey must not be empty');
  }
  if (
    config.detectInPlacePositionMutations !== undefined &&
    typeof config.detectInPlacePositionMutations !== 'boolean'
  ) {
    throw new Error('detectInPlacePositionMutations must be a boolean');
  }
  if (
    config.instrumentationProfile !== undefined &&
    config.instrumentationProfile !== 'full' &&
    config.instrumentationProfile !== 'release'
  ) {
    throw new Error("instrumentationProfile must be 'full' or 'release'");
  }
}

function asPosition(value: unknown): Position {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('x' in value) ||
    !('y' in value)
  ) {
    throw new Error('Position component must be an object with x and y');
  }
  const position = value as { x: unknown; y: unknown };
  if (
    typeof position.x !== 'number' ||
    typeof position.y !== 'number' ||
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y)
  ) {
    throw new RangeError('Position coordinates must be integers');
  }
  return { x: position.x, y: position.y };
}
