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
import type { ComponentStoreOptions } from './component-store.js';
import { SpatialGrid } from './spatial-grid.js';
import type { SpatialGridView } from './spatial-grid.js';
import { GameLoop, DEFAULT_MAX_TICKS_PER_FRAME } from './game-loop.js';
import { EventBus } from './event-bus.js';
import { CommandQueue } from './command-queue.js';
import { ResourceStore } from './resource-store.js';
import type { ResourceMax, ResourcePool } from './resource-store.js';
import { assertJsonCompatible, jsonFingerprint, type JsonValue } from './json.js';
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
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> = (world: World<TEventMap, TCommandMap, TComponents, TState>) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseSystem = (world: World<any, any, any, any>) => void;

export interface LooseSystemRegistration {
  name?: string;
  phase?: SystemPhase;
  execute: LooseSystem;
  before?: string[];
  after?: string[];
}

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
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  name?: string;
  phase?: SystemPhase;
  execute: System<TEventMap, TCommandMap, TComponents, TState>;
  before?: string[];
  after?: string[];
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
    explicitSyncs: number;
  };
  durationMs: {
    total: number;
    commands: number;
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
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  phase: SystemPhase;
  execute: System<TEventMap, TCommandMap, TComponents, TState>;
  order: number;
  before: string[];
  after: string[];
}

type TickMetricsProfile = 'full' | 'minimal' | 'none';

interface TickRunOptions {
  metricsProfile: TickMetricsProfile;
}

export type ComponentRegistry = Record<string, unknown>;

export type ComponentOptions = ComponentStoreOptions;

export class World<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  private entityManager: EntityManager;
  private componentStores = new Map<string, ComponentStore<unknown>>();
  private componentOptions = new Map<string, ComponentOptions>();
  private componentBits = new Map<string, bigint>();
  private nextComponentBit = 0;
  private entitySignatures: bigint[] = [];
  private queryCache = new Map<string, QueryCacheEntry>();
  private systems: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> = [];
  private resolvedSystemOrder: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> | null = null;
  private nextSystemOrder = 0;
  private gameLoop: GameLoop;
  private previousPositions = new Map<EntityId, { x: number; y: number }>();
  private eventBus = new EventBus<TEventMap>();
  private commandQueue = new CommandQueue<TCommandMap>();
  private validators = new Map<
    keyof TCommandMap,
    Array<
      (data: never, world: World<TEventMap, TCommandMap, TComponents, TState>) => CommandValidationResult
    >
  >();
  private handlers = new Map<
    keyof TCommandMap,
    (data: never, world: World<TEventMap, TCommandMap, TComponents, TState>) => void
  >();
  private spatialGrid: SpatialGrid;
  readonly grid: SpatialGridView;
  readonly positionKey: string;
  private readonly seed: number | string | undefined;
  private readonly instrumentationProfile: InstrumentationProfile;
  private currentDiff: TickDiff | null = null;
  private currentMetrics: WorldMetrics | null = null;
  private activeMetrics: WorldMetrics | null = null;
  private lastTickFailure: TickFailure | null = null;
  private poisoned: TickFailure | null = null;
  private poisonedWarningEmitted = false;
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
    (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void
  > = [];
  private stateStore = new Map<string, unknown>();
  private stateDirtyKeys = new Set<string>();
  private stateRemovedKeys = new Set<string>();
  private stateBaseline = new Map<string, string>();
  private entityTags = new Map<EntityId, Set<string>>();
  private tagIndex = new Map<string, Set<EntityId>>();
  private entityMeta = new Map<EntityId, Map<string, string | number>>();
  private metaIndex = new Map<string, Map<string | number, EntityId>>();
  private tagsDirtyEntities = new Set<EntityId>();
  private metaDirtyEntities = new Set<EntityId>();

  constructor(config: WorldConfig) {
    validateWorldConfig(config);
    this.entityManager = new EntityManager();
    this.spatialGrid = new SpatialGrid(config.gridWidth, config.gridHeight);
    const grid = this.spatialGrid;
    this.grid = {
      get width() { return grid.width; },
      get height() { return grid.height; },
      getAt: (x, y) => {
        const cell = grid.getAt(x, y);
        return cell ? new Set(cell) : null;
      },
      getNeighbors: (x, y, offsets) => grid.getNeighbors(x, y, offsets),
      getInRadius: (cx, cy, radius, metric) => grid.getInRadius(cx, cy, radius, metric),
    };
    this.positionKey = config.positionKey ?? 'position';
    this.seed = config.seed;
    this.instrumentationProfile = config.instrumentationProfile ?? 'full';
    this.rng = new DeterministicRandom(config.seed);
    this.gameLoop = new GameLoop({
      tps: config.tps,
      onTick: () => this.executeTickOrThrow(),
      maxTicksPerFrame: config.maxTicksPerFrame,
      onError: () => {
        this.gameLoop.pause();
      },
    });
  }

  createEntity(): EntityId {
    const id = this.entityManager.create();
    this.entitySignatures[id] = 0n;
    return id;
  }

  destroyEntity(id: EntityId): void {
    if (!this.entityManager.isAlive(id)) return;

    // Mark dying (alive=false, generation bumped) so re-entrant
    // destroyEntity(id) calls hit the alive guard. Hold the id off the free
    // list until cleanup finishes so a callback that creates a new entity
    // cannot recycle this id mid-cleanup.
    this.entityManager.markDying(id);

    try {
      for (const callback of this.destroyCallbacks) {
        callback(id, this);
      }
    } finally {
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
      this.removeEntityTags(id);
      this.removeEntityMeta(id);

      this.entityManager.releaseId(id);
    }
  }

  isAlive(id: EntityId): boolean {
    return this.entityManager.isAlive(id);
  }

  *getAliveEntities(): IterableIterator<EntityId> {
    yield* this.entityManager.aliveEntities();
  }

  getEntityGeneration(id: EntityId): number {
    return this.entityManager.getGeneration(id);
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
    callback: (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
  ): void {
    this.destroyCallbacks.push(callback);
  }

  offDestroy(
    callback: (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
  ): void {
    const index = this.destroyCallbacks.indexOf(callback);
    if (index !== -1) {
      this.destroyCallbacks.splice(index, 1);
    }
  }

  registerComponent<K extends keyof TComponents & string>(
    key: K,
    options?: ComponentOptions,
  ): void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registerComponent<T>(key: string, options?: ComponentOptions): void;
  registerComponent(key: string, options?: ComponentOptions): void {
    if (this.componentStores.has(key)) {
      throw new Error(`Component '${key}' is already registered`);
    }
    this.componentStores.set(key, new ComponentStore<unknown>(options));
    if (options) {
      this.componentOptions.set(key, { ...options });
    }
    this.registerComponentBit(key);
  }

  addComponent<K extends keyof TComponents & string>(entity: EntityId, key: K, data: TComponents[K]): void;
  addComponent<T>(entity: EntityId, key: string, data: T): void;
  addComponent(entity: EntityId, key: string, data: unknown): void {
    this.setComponent(entity, key, data);
  }

  setComponent<K extends keyof TComponents & string>(entity: EntityId, key: K, data: TComponents[K]): void;
  setComponent<T>(entity: EntityId, key: string, data: T): void;
  setComponent(entity: EntityId, key: string, data: unknown): void {
    this.assertAlive(entity);
    const position = key === this.positionKey ? asPosition(data) : null;
    if (position) {
      this.assertPositionInBounds(position);
    }
    const store = this.getStore<unknown>(key);
    const hadComponent = store.has(entity);
    store.set(entity, data);
    if (!hadComponent) {
      this.setEntityComponentSignature(entity, key, true);
    }
    if (position) {
      this.syncSpatialEntity(entity, position);
    }
  }

  getComponent<K extends keyof TComponents & string>(entity: EntityId, key: K): TComponents[K] | undefined;
  getComponent<T>(entity: EntityId, key: string): T | undefined;
  getComponent(entity: EntityId, key: string): unknown {
    const store = this.componentStores.get(key);
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

  removeComponent<K extends keyof TComponents & string>(entity: EntityId, key: K): void;
  removeComponent(entity: EntityId, key: string): void;
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

  patchComponent<K extends keyof TComponents & string>(
    entity: EntityId, key: K, patch: (data: TComponents[K]) => TComponents[K] | void,
  ): TComponents[K];
  patchComponent<T>(entity: EntityId, key: string, patch: (data: T) => T | void): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patchComponent(entity: EntityId, key: string, patch: (data: any) => any): any {
    this.assertAlive(entity);
    const current = this.getComponent(entity, key);
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

  query<K extends keyof TComponents & string>(...keys: K[]): IterableIterator<EntityId>;
  query(...keys: string[]): IterableIterator<EntityId>;
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

  *queryInRadius(
    cx: number,
    cy: number,
    radius: number,
    ...components: string[]
  ): IterableIterator<EntityId> {
    const entityIds = this.spatialGrid.getInRadius(cx, cy, radius);
    if (components.length === 0) {
      yield* entityIds;
      return;
    }
    const mask = this.queryMask(components);
    for (const id of entityIds) {
      const sig = this.entitySignatures[id] ?? 0n;
      if ((sig & mask) === mask) {
        yield id;
      }
    }
  }

  findNearest(
    cx: number,
    cy: number,
    ...components: string[]
  ): EntityId | undefined {
    const w = this.spatialGrid.width;
    const h = this.spatialGrid.height;
    const maxRadius = Math.ceil(Math.hypot(Math.max(w - 1, 0), Math.max(h - 1, 0)));
    const mask = components.length > 0 ? this.queryMask(components) : 0n;
    const seen = new Set<EntityId>();
    let bestId: EntityId | undefined;
    let bestDistSq = Infinity;

    for (let r = 0; r <= maxRadius; r++) {
      // Every entity returned by getInRadius(cx, cy, r) is within Euclidean
      // distance r. If our best is already inside (r-1) the next ring cannot
      // improve it, so we can stop. r is the cell-radius bound; bestDistSq is
      // squared Euclidean.
      if (bestId !== undefined && bestDistSq <= (r - 1) * (r - 1)) {
        return bestId;
      }
      const entityIds = this.spatialGrid.getInRadius(cx, cy, r);
      for (const id of entityIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        if (components.length > 0) {
          const sig = this.entitySignatures[id] ?? 0n;
          if ((sig & mask) !== mask) continue;
        }
        const pos = this.getComponent<Position>(id, this.positionKey);
        if (!pos) continue;
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestId = id;
        }
      }
    }
    return bestId;
  }

  registerSystem(
    system:
      | System<TEventMap, TCommandMap, TComponents, TState>
      | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>,
  ): void;
  registerSystem(
    system: LooseSystem | LooseSystemRegistration,
  ): void;
  registerSystem(
    system:
      | System<TEventMap, TCommandMap, TComponents, TState>
      | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>
      | LooseSystem
      | LooseSystemRegistration,
  ): void {
    this.systems.push(this.normalizeSystemRegistration(system));
  }

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

  isPoisoned(): boolean {
    return this.poisoned !== null;
  }

  recover(): void {
    this.poisoned = null;
    this.lastTickFailure = null;
    this.currentDiff = null;
    this.currentMetrics = null;
    this.poisonedWarningEmitted = false;
  }

  private warnIfPoisoned(api: string): void {
    if (!this.poisoned || this.poisonedWarningEmitted) return;
    this.poisonedWarningEmitted = true;
    console.warn(
      `${api} called on a poisoned world (last failure: '${this.poisoned.code}' at tick ${this.poisoned.tick}). ` +
        `Call world.recover() to clear the poison flag.`,
    );
  }

  private makeWorldPoisonedFailure(prior: TickFailure): TickFailure {
    return {
      schemaVersion: prior.schemaVersion,
      tick: prior.tick,
      phase: prior.phase,
      code: 'world_poisoned',
      message: `World is poisoned by tick ${prior.tick} failure '${prior.code}'; call world.recover() to resume`,
      subsystem: prior.subsystem,
      commandType: prior.commandType,
      submissionSequence: prior.submissionSequence,
      systemName: prior.systemName,
      details: prior.details,
      error: prior.error,
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
    return this.submitWithResult(type, data).accepted;
  }

  submitWithResult<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
  ): CommandSubmissionResult<K> {
    this.warnIfPoisoned('submit');
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
      world: World<TEventMap, TCommandMap, TComponents, TState>,
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
        world: World<TEventMap, TCommandMap, TComponents, TState>,
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
    fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
  ): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler already registered for command '${String(type)}'`);
    }
    this.handlers.set(
      type,
      fn as (data: never, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
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
      version: 5,
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
  ): World<TEventMap, TCommandMap, TComponents, TState> {
    const version = (snapshot as { version: number }).version;
    if (version < 1 || version > 5) {
      throw new Error(`Unsupported snapshot version: ${version}`);
    }

    const componentOptions =
      'componentOptions' in snapshot && snapshot.componentOptions
        ? snapshot.componentOptions
        : {};

    const world = new World<TEventMap, TCommandMap, TComponents, TState>(snapshot.config);
    world.entityManager = EntityManager.fromState(snapshot.entities);

    world.componentStores.clear();
    world.componentOptions.clear();
    for (const [key, entries] of Object.entries(snapshot.components)) {
      const opts = componentOptions[key];
      const cloned: Array<[number, unknown]> = [];
      for (const [id, data] of entries as Array<[number, unknown]>) {
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
      world.resourceStore = ResourceStore.fromState(snapshot.resources);
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
          throw new Error(
            `Invalid entity id key in snapshot.tags: ${JSON.stringify(entityIdStr)}`,
          );
        }
        if (!world.entityManager.isAlive(entityId)) {
          throw new Error(
            `snapshot.tags references dead entity ${entityId}`,
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
          throw new Error(
            `Invalid entity id key in snapshot.metadata: ${JSON.stringify(entityIdStr)}`,
          );
        }
        if (!world.entityManager.isAlive(entityId)) {
          throw new Error(
            `snapshot.metadata references dead entity ${entityId}`,
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

    return world;
  }

  get tick(): number {
    return this.gameLoop.tick;
  }

  getDiff(): TickDiff | null {
    return this.currentDiff ? cloneTickDiff(this.currentDiff) : null;
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

  setState<K extends keyof TState & string>(key: K, value: TState[K]): void;
  setState(key: string, value: unknown): void;
  setState(key: string, value: unknown): void {
    assertJsonCompatible(value, `state '${key}'`);
    this.stateStore.set(key, value);
    this.stateDirtyKeys.add(key);
    this.stateRemovedKeys.delete(key);
  }

  getState<K extends keyof TState & string>(key: K): TState[K] | undefined;
  getState(key: string): unknown;
  getState(key: string): unknown {
    return this.stateStore.get(key);
  }

  deleteState<K extends keyof TState & string>(key: K): void;
  deleteState(key: string): void;
  deleteState(key: string): void {
    if (this.stateStore.has(key)) {
      this.stateStore.delete(key);
      this.stateDirtyKeys.delete(key);
      this.stateRemovedKeys.add(key);
    }
  }

  hasState<K extends keyof TState & string>(key: K): boolean;
  hasState(key: string): boolean;
  hasState(key: string): boolean {
    return this.stateStore.has(key);
  }

  addTag(entity: EntityId, tag: string): void {
    this.assertAlive(entity);
    this.addTagInternal(entity, tag);
    this.tagsDirtyEntities.add(entity);
  }

  removeTag(entity: EntityId, tag: string): void {
    this.assertAlive(entity);
    const tags = this.entityTags.get(entity);
    if (!tags || !tags.has(tag)) return;
    tags.delete(tag);
    if (tags.size === 0) this.entityTags.delete(entity);
    const indexed = this.tagIndex.get(tag);
    if (indexed) {
      indexed.delete(entity);
      if (indexed.size === 0) this.tagIndex.delete(tag);
    }
    this.tagsDirtyEntities.add(entity);
  }

  hasTag(entity: EntityId, tag: string): boolean {
    return this.entityTags.get(entity)?.has(tag) ?? false;
  }

  getByTag(tag: string): ReadonlySet<EntityId> {
    const set = this.tagIndex.get(tag);
    return set ? new Set(set) : new Set<EntityId>();
  }

  getTags(entity: EntityId): ReadonlySet<string> {
    const set = this.entityTags.get(entity);
    return set ? new Set(set) : new Set<string>();
  }

  setMeta(entity: EntityId, key: string, value: string | number): void {
    this.assertAlive(entity);
    this.setMetaInternal(entity, key, value);
    this.metaDirtyEntities.add(entity);
  }

  getMeta(entity: EntityId, key: string): string | number | undefined {
    return this.entityMeta.get(entity)?.get(key);
  }

  deleteMeta(entity: EntityId, key: string): void {
    this.assertAlive(entity);
    const meta = this.entityMeta.get(entity);
    if (!meta) return;
    const value = meta.get(key);
    if (value === undefined) return;
    meta.delete(key);
    if (meta.size === 0) this.entityMeta.delete(entity);
    const keyIndex = this.metaIndex.get(key);
    if (keyIndex) {
      if (keyIndex.get(value) === entity) {
        keyIndex.delete(value);
      }
      if (keyIndex.size === 0) this.metaIndex.delete(key);
    }
    this.metaDirtyEntities.add(entity);
  }

  getByMeta(key: string, value: string | number): EntityId | undefined {
    return this.metaIndex.get(key)?.get(value);
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

  private removeEntityTags(entity: EntityId): void {
    const tags = this.entityTags.get(entity);
    if (!tags) return;
    for (const tag of tags) {
      const indexed = this.tagIndex.get(tag);
      if (indexed) {
        indexed.delete(entity);
        if (indexed.size === 0) this.tagIndex.delete(tag);
      }
    }
    this.entityTags.delete(entity);
    this.tagsDirtyEntities.add(entity);
  }

  private removeEntityMeta(entity: EntityId): void {
    const meta = this.entityMeta.get(entity);
    if (!meta) return;
    for (const [key, value] of meta) {
      const keyIndex = this.metaIndex.get(key);
      if (keyIndex) {
        if (keyIndex.get(value) === entity) {
          keyIndex.delete(value);
        }
        if (keyIndex.size === 0) this.metaIndex.delete(key);
      }
    }
    this.entityMeta.delete(entity);
    this.metaDirtyEntities.add(entity);
  }

  private addTagInternal(entity: EntityId, tag: string): void {
    let tags = this.entityTags.get(entity);
    if (!tags) {
      tags = new Set();
      this.entityTags.set(entity, tags);
    }
    tags.add(tag);
    let indexed = this.tagIndex.get(tag);
    if (!indexed) {
      indexed = new Set();
      this.tagIndex.set(tag, indexed);
    }
    indexed.add(entity);
  }

  private setMetaInternal(entity: EntityId, key: string, value: string | number): void {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(
        `Metadata ${JSON.stringify(key)} value must be a finite JSON number; got ${value}`,
      );
    }
    const existingMeta = this.entityMeta.get(entity);
    let keyIndex = this.metaIndex.get(key);
    if (keyIndex) {
      const owner = keyIndex.get(value);
      if (owner !== undefined && owner !== entity) {
        throw new Error(
          `Metadata ${JSON.stringify(key)}=${JSON.stringify(value)} is already owned by entity ${owner}; metadata reverse index is unique`,
        );
      }
    }
    // Uniqueness check passed — now mutate state.
    const meta = existingMeta ?? new Map();
    if (!existingMeta) {
      this.entityMeta.set(entity, meta);
    }
    const oldValue = meta.get(key);
    if (oldValue !== undefined && keyIndex) {
      keyIndex.delete(oldValue);
    }
    meta.set(key, value);
    if (!keyIndex) {
      keyIndex = new Map();
      this.metaIndex.set(key, keyIndex);
    }
    keyIndex.set(value, entity);
  }

  private getStateDirty(): { set: Record<string, unknown>; removed: string[] } {
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

    try {
      this.eventBus.clear();
      this.entityManager.clearDirty();
      this.clearComponentDirty();
      this.resourceStore.clearDirty();

      if (metrics) {
        metrics.commandStats.pendingBeforeTick = this.commandQueue.pending;
      }
      const commandsStart = collectDetailedTimings ? now() : 0;
      const tick = metrics?.tick ?? this.gameLoop.tick + 1;
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
      const tick = metrics?.tick ?? this.gameLoop.tick;
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
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const handler = this.handlers.get(command.type);
      if (!handler) {
        const failureMessage = `No handler registered for command '${String(command.type)}'`;
        this.emitCommandExecution(command.type, {
          submissionSequence: command.submissionSequence,
          executed: false,
          code: 'missing_handler',
          message: failureMessage,
          details: null,
          tick,
        });
        const dropped = this.dropPendingCommands(commands, i + 1, tick);
        const failure = this.createTickFailure({
          tick,
          phase: 'commands',
          code: 'missing_handler',
          message: failureMessage,
          subsystem: 'commands',
          commandType: command.type,
          submissionSequence: command.submissionSequence,
          details: dropped.length > 0 ? { droppedCommands: dropped } : null,
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
        const dropped = this.dropPendingCommands(commands, i + 1, tick);
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
            ...(dropped.length > 0 ? { droppedCommands: dropped } : {}),
          },
          error,
        });
        return { processed, failure };
      }
    }

    return { processed, failure: null };
  }

  private dropPendingCommands(
    commands: ReadonlyArray<{
      type: keyof TCommandMap;
      submissionSequence: number | null;
    }>,
    startIndex: number,
    tick: number,
  ): Array<{ commandType: string; submissionSequence: number | null }> {
    const dropped: Array<{
      commandType: string;
      submissionSequence: number | null;
    }> = [];
    for (let i = startIndex; i < commands.length; i++) {
      const cmd = commands[i];
      this.emitCommandExecution(cmd.type, {
        submissionSequence: cmd.submissionSequence,
        executed: false,
        code: 'tick_aborted_before_handler',
        message: 'Command was queued for this tick but the tick aborted before its handler ran',
        details: null,
        tick,
      });
      dropped.push({
        commandType: String(cmd.type),
        submissionSequence: cmd.submissionSequence,
      });
    }
    return dropped;
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
      try {
        listener(result as CommandSubmissionResult<keyof TCommandMap>);
      } catch (error) {
        console.error('commandResultListener threw:', error);
      }
    }
  }

  private emitCommandExecutionResult<K extends keyof TCommandMap>(
    result: CommandExecutionResult<K>,
  ): void {
    for (const listener of this.commandExecutionListeners) {
      try {
        listener(result as CommandExecutionResult<keyof TCommandMap>);
      } catch (error) {
        console.error('commandExecutionListener threw:', error);
      }
    }
  }

  private emitTickFailure(failure: TickFailure): void {
    for (const listener of this.tickFailureListeners) {
      try {
        listener(cloneTickFailure(failure));
      } catch (error) {
        console.error('tickFailureListener threw:', error);
      }
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

  private executeSystems(
    tick: number,
    metrics: WorldMetrics | null,
    collectDetailedTimings: boolean,
  ): TickFailure | null {
    if (!this.resolvedSystemOrder) {
      this.resolvedSystemOrder = this.resolveSystemOrder();
    }
    const systems = this.resolvedSystemOrder;

    for (const system of systems) {
      const start = collectDetailedTimings ? now() : 0;
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
      if (collectDetailedTimings && metrics) {
        metrics.systems.push({
          name: system.name,
          phase: system.phase,
          durationMs: now() - start,
        });
      }
    }

    return null;
  }

  private resolveSystemOrder(): Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> {
    const byPhase = new Map<SystemPhase, Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>>();
    for (const phase of SYSTEM_PHASES) {
      byPhase.set(phase, []);
    }
    const nameToSystem = new Map<string, RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>();
    for (const sys of this.systems) {
      byPhase.get(sys.phase)!.push(sys);
      if (sys.name) {
        nameToSystem.set(sys.name, sys);
      }
    }

    const hasConstraints = this.systems.some(
      (s) => s.before.length > 0 || s.after.length > 0,
    );
    if (!hasConstraints) {
      return [...this.systems].sort((a, b) => {
        const phaseDelta = phaseIndex(a.phase) - phaseIndex(b.phase);
        return phaseDelta !== 0 ? phaseDelta : a.order - b.order;
      });
    }

    for (const sys of this.systems) {
      for (const ref of [...sys.before, ...sys.after]) {
        const target = nameToSystem.get(ref);
        if (!target) {
          throw new Error(
            `System '${sys.name}' references non-existent system '${ref}'`,
          );
        }
        if (target.phase !== sys.phase) {
          throw new Error(
            `System '${sys.name}' (phase '${sys.phase}') has a cross-phase constraint on '${ref}' (phase '${target.phase}')`,
          );
        }
      }
    }

    const result: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> = [];
    for (const phase of SYSTEM_PHASES) {
      const phaseSystems = byPhase.get(phase)!;
      if (phaseSystems.length === 0) continue;
      const sorted = topologicalSort(phaseSystems, nameToSystem);
      result.push(...sorted);
    }
    return result;
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
          world: World<TEventMap, TCommandMap, TComponents, TState>,
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
      | System<TEventMap, TCommandMap, TComponents, TState>
      | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>
      | LooseSystem
      | LooseSystemRegistration,
  ): RegisteredSystem<TEventMap, TCommandMap, TComponents, TState> {
    const order = this.nextSystemOrder++;
    this.resolvedSystemOrder = null;
    if (typeof system === 'function') {
      return {
        name: system.name || `system#${order}`,
        phase: 'update',
        execute: system as System<TEventMap, TCommandMap, TComponents, TState>,
        order,
        before: [],
        after: [],
      };
    }

    const phase = system.phase ?? 'update';
    if (!isSystemPhase(phase)) {
      throw new Error(`Unknown system phase '${String(phase)}'`);
    }

    return {
      name: system.name ?? system.execute.name ?? `system#${order}`,
      phase,
      execute: system.execute as System<TEventMap, TCommandMap, TComponents, TState>,
      order,
      before: system.before ?? [],
      after: system.after ?? [],
    };
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
    this.spatialGrid.assertBounds(position.x, position.y);
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
      explicitSyncs: 0,
    },
    durationMs: {
      total: 0,
      commands: 0,
      systems: 0,
      resources: 0,
      diff: 0,
    },
  };
}

function getImplicitMetricsProfile(
  instrumentationProfile: InstrumentationProfile,
): TickMetricsProfile {
  switch (instrumentationProfile) {
    case 'full':
      return 'full';
    case 'minimal':
      return 'minimal';
    case 'release':
      return 'none';
  }
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

// Both helpers deep-clone via JSON. TickDiff is JSON-shaped because component
// data and state values pass assertJsonCompatible at write time; TickFailure
// is JSON-shaped because createTickFailure normalizes the optional Error field
// to a plain {name, message, stack} via createErrorDetails (line ~2230) and
// asserts JSON-compat on `details`. JSON is ~2-5× faster than structuredClone
// for these plain shapes on V8, and cloneTickDiff runs once per tick per
// diff listener so the throughput matters.

function cloneTickFailure(failure: TickFailure): TickFailure {
  return JSON.parse(JSON.stringify(failure)) as TickFailure;
}

function cloneTickDiff(diff: TickDiff): TickDiff {
  return JSON.parse(JSON.stringify(diff)) as TickDiff;
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
    config.instrumentationProfile !== undefined &&
    config.instrumentationProfile !== 'full' &&
    config.instrumentationProfile !== 'minimal' &&
    config.instrumentationProfile !== 'release'
  ) {
    throw new Error(
      "instrumentationProfile must be 'full', 'minimal', or 'release'",
    );
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

function topologicalSort<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry,
  TState extends Record<string, unknown>,
>(
  systems: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>,
  nameToSystem: Map<string, RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>,
): Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> {
  const edges = new Map<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>, Set<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>>>();
  for (const sys of systems) {
    edges.set(sys, new Set());
  }

  for (const sys of systems) {
    for (const beforeName of sys.before) {
      const target = nameToSystem.get(beforeName)!;
      edges.get(sys)!.add(target);
    }
    for (const afterName of sys.after) {
      const target = nameToSystem.get(afterName)!;
      edges.get(target)!.add(sys);
    }
  }

  const inDegree = new Map<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>, number>();
  for (const sys of systems) {
    inDegree.set(sys, 0);
  }
  for (const deps of edges.values()) {
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
    }
  }

  const queue = systems
    .filter((s) => inDegree.get(s) === 0)
    .sort((a, b) => a.order - b.order);

  const result: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> = [];
  while (queue.length > 0) {
    const sys = queue.shift()!;
    result.push(sys);
    const deps = [...edges.get(sys)!].sort((a, b) => a.order - b.order);
    for (const dep of deps) {
      const newDeg = inDegree.get(dep)! - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) {
        const insertIdx = queue.findIndex((q) => q.order > dep.order);
        if (insertIdx === -1) {
          queue.push(dep);
        } else {
          queue.splice(insertIdx, 0, dep);
        }
      }
    }
  }

  if (result.length !== systems.length) {
    const inCycle = systems.filter((s) => !result.includes(s));
    const names = inCycle.map((s) => s.name).join(' -> ');
    throw new Error(`Cycle detected in system ordering: ${names}`);
  }

  return result;
}
