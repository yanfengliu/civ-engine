// Bottom layer of the `World` class chain (see `src/world.ts` and
// `docs/threads/done/loc-budget/PLAN.md`): owns every state-bearing field,
// the constructor, strict-mode windows, poison/recover, game-loop
// passthroughs, and the tiny shared helpers the upper layers build on.
// The chain is a file-organization device — `World` remains one runtime
// class; none of the layer classes are public API.

import type {
  EntityId,
  InstrumentationProfile,
  Position,
  WorldConfig,
} from './types.js';
import type { TickDiff } from './diff.js';
import { EntityManager } from './entity-manager.js';
import { ComponentStore } from './component-store.js';
import { SpatialGrid } from './spatial-grid.js';
import type { SpatialGridView } from './spatial-grid.js';
import { GameLoop } from './game-loop.js';
import { EventBus } from './event-bus.js';
import { CommandQueue } from './command-queue.js';
import { ResourceStore } from './resource-store.js';
import { DeterministicRandom } from './random.js';
import { validateWorldConfig } from './world-internal.js';
import { assertWritable } from './world-strict-mode.js';
import type {
  CommandExecutionResult,
  CommandSubmissionResult,
  CommandValidationResult,
  ComponentOptions,
  ComponentRegistry,
  QueryCacheEntry,
  RegisteredSystem,
  TickFailure,
  WorldMetrics,
} from './world-types.js';
import type { World } from './world.js';

export abstract class WorldCore<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  protected entityManager: EntityManager;
  protected componentStores = new Map<string, ComponentStore<unknown>>();
  protected componentOptions = new Map<string, ComponentOptions>();
  protected componentBits = new Map<string, bigint>();
  protected nextComponentBit = 0;
  protected entitySignatures: bigint[] = [];
  protected queryCache = new Map<string, QueryCacheEntry>();
  protected systems: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> = [];
  protected resolvedSystemOrder: Array<RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>> | null = null;
  protected nextSystemOrder = 0;
  protected gameLoop: GameLoop;
  protected previousPositions = new Map<EntityId, { x: number; y: number }>();
  protected eventBus = new EventBus<TEventMap>();
  protected commandQueue = new CommandQueue<TCommandMap>();
  protected validators = new Map<
    keyof TCommandMap,
    Array<
      (data: never, world: World<TEventMap, TCommandMap, TComponents, TState>) => CommandValidationResult
    >
  >();
  protected handlers = new Map<
    keyof TCommandMap,
    (data: never, world: World<TEventMap, TCommandMap, TComponents, TState>) => void
  >();
  protected spatialGrid: SpatialGrid;
  readonly grid: SpatialGridView;
  readonly positionKey: string;
  protected readonly seed: number | string | undefined;
  protected readonly instrumentationProfile: InstrumentationProfile;
  protected currentDiff: TickDiff | null = null;
  protected currentMetrics: WorldMetrics | null = null;
  protected activeMetrics: WorldMetrics | null = null;
  protected lastTickFailure: TickFailure | null = null;
  protected poisoned: TickFailure | null = null;
  protected poisonedWarningEmitted = false;
  protected diffListeners = new Set<(diff: TickDiff) => void>();
  protected resourceStore = new ResourceStore();
  protected rng: DeterministicRandom;
  protected nextCommandResultSequence = 0;
  protected commandResultListeners = new Set<
    (result: CommandSubmissionResult<keyof TCommandMap>) => void
  >();
  protected commandExecutionListeners = new Set<
    (result: CommandExecutionResult<keyof TCommandMap>) => void
  >();
  protected tickFailureListeners = new Set<(failure: TickFailure) => void>();
  protected destroyCallbacks: Array<
    (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void
  > = [];
  protected stateStore = new Map<string, unknown>();
  protected stateDirtyKeys = new Set<string>();
  protected stateRemovedKeys = new Set<string>();
  protected stateBaseline = new Map<string, string>();
  protected entityTags = new Map<EntityId, Set<string>>();
  protected tagIndex = new Map<string, Set<EntityId>>();
  protected entityMeta = new Map<EntityId, Map<string, string | number>>();
  protected metaIndex = new Map<string, Map<string | number, EntityId>>();
  protected tagsDirtyEntities = new Set<EntityId>();
  protected metaDirtyEntities = new Set<EntityId>();

  // Spec 6 (v0.8.8): strict-mode fields. The `_inSetup`, `_inTickPhase`, and
  // `_maintenanceDepth` fields are accessed by `assertWritable` in
  // `world-strict-mode.ts` via the `StrictModeWorldView` shape.
  readonly strict: boolean;
  /** @internal */ _inSetup = false;
  /** @internal */ _inTickPhase = false;
  /** @internal */ _maintenanceDepth = 0;

  constructor(config: WorldConfig) {
    validateWorldConfig(config);
    this.entityManager = new EntityManager();
    this.spatialGrid = new SpatialGrid(config.gridWidth, config.gridHeight);
    // Grid view re-reads the world's current spatial grid on every call so
    // it stays in sync with `applySnapshot()` (which replaces the underlying
    // grid). Closes the post-applySnapshot stale-grid bug. The view itself
    // is frozen (read-only-delegate promise from v0.7.3 / iter-6).
    const getGrid = (): SpatialGrid => this.spatialGrid;
    const gridView: SpatialGridView = {
      get width(): number { return getGrid().width; },
      get height(): number { return getGrid().height; },
      getAt: (x: number, y: number) => {
        const cell = getGrid().getAt(x, y);
        return cell ? new Set(cell) : null;
      },
      getNeighbors: (x, y, offsets) => getGrid().getNeighbors(x, y, offsets),
      getInRadius: (cx, cy, radius, metric) => getGrid().getInRadius(cx, cy, radius, metric),
    };
    this.grid = Object.freeze(gridView);
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
    this.strict = config.strict === true;
    if (this.strict) this._inSetup = true;
  }

  /** Implemented by the tick layer (`world-tick.ts`); wired into the game
   *  loop's `onTick` callback by this constructor. */
  protected abstract executeTickOrThrow(): void;

  /**
   * The one place the layer chain refers to the final composed class. Layer
   * methods that hand `this` to user callbacks typed against `World` (system
   * execute, command handlers/validators, destroy callbacks, transactions)
   * funnel through here. Safe because `World` is the only concrete class in
   * the chain — every runtime instance of a layer IS a `World`.
   */
  protected asWorld(): World<TEventMap, TCommandMap, TComponents, TState> {
    return this as unknown as World<TEventMap, TCommandMap, TComponents, TState>;
  }

  // -------------------------------------------------------------------------
  // Strict mode (Spec 6, v0.8.8)
  // -------------------------------------------------------------------------

  /** Whether this world was constructed with `strict: true`. */
  isStrict(): boolean { return this.strict; }

  /** Whether the world is currently executing a tick (any phase). */
  isInTick(): boolean { return this._inTickPhase; }

  /** Whether the construction-time setup window is still open. */
  isInSetup(): boolean { return this._inSetup; }

  /** Whether the world is inside one or more `runMaintenance(fn)` callbacks. */
  isInMaintenance(): boolean { return this._maintenanceDepth > 0; }

  /**
   * Marks the construction-time setup window as ended. Idempotent — calling
   * twice is a no-op. The first tick (via `step`, `stepWithResult`, or a
   * `GameLoop.start()`-driven tick) implicitly invokes `endSetup()` as well.
   * No-op when `strict !== true`.
   */
  endSetup(): void {
    if (this._inSetup) this._inSetup = false;
  }

  /**
   * Run an out-of-tick mutation block. Mutations inside `fn` are accepted
   * regardless of strict mode. Reentrant via depth counter (no-op nesting).
   * Returns `fn`'s return value. The depth is decremented in finally so an
   * exception from `fn` does not leave the world permanently writable.
   */
  runMaintenance<T>(fn: () => T): T {
    this._maintenanceDepth++;
    try {
      return fn();
    } finally {
      this._maintenanceDepth--;
    }
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

  warnIfPoisoned(api: string): void {
    if (!this.poisoned || this.poisonedWarningEmitted) return;
    this.poisonedWarningEmitted = true;
    console.warn(
      `${api} called on a poisoned world (last failure: '${this.poisoned.code}' at tick ${this.poisoned.tick}). ` +
        `Call world.recover() to clear the poison flag.`,
    );
  }

  protected makeWorldPoisonedFailure(prior: TickFailure): TickFailure {
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

  get tick(): number {
    return this.gameLoop.tick;
  }

  random(): number {
    assertWritable(this, 'random');
    return this.rng.random();
  }

  getInstrumentationProfile(): InstrumentationProfile {
    return this.instrumentationProfile;
  }

  protected getObservableTick(): number {
    return Math.max(
      this.gameLoop.tick,
      this.currentMetrics?.tick ?? 0,
      this.currentDiff?.tick ?? 0,
      this.lastTickFailure?.tick ?? 0,
    );
  }

  protected getStore<T>(key: string): ComponentStore<T> {
    const store = this.componentStores.get(key);
    if (!store) throw new Error(`Component '${key}' is not registered`);
    return store as ComponentStore<T>;
  }

  protected assertAlive(entity: EntityId): void {
    if (!this.entityManager.isAlive(entity)) {
      throw new Error(`Entity ${entity} is not alive`);
    }
  }

  protected assertPositionInBounds(position: Position): void {
    this.spatialGrid.assertBounds(position.x, position.y);
  }
}
