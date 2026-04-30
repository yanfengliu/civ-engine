# API Reference

Complete reference for every public type, method, and module in civ-engine.

## Table of Contents

- [Types](#types)
- [World](#world)
  - [Constructor](#constructor)
  - [Entity Management](#entity-management)
  - [Components](#components)
  - [Systems & Simulation](#systems--simulation)
  - [Speed Control](#speed-control)
  - [Commands](#commands)
  - [Events](#events)
  - [Resources](#resources)
  - [World State](#world-state)
  - [Tags & Metadata](#tags--metadata)
  - [Spatial Queries](#spatial-queries)
  - [State Serialization](#state-serialization)
  - [State Diffs](#state-diffs)
  - [Entity Lifecycle Hooks](#entity-lifecycle-hooks)
- [SpatialGrid](#spatialgrid)
- [Pathfinding](#pathfinding)
- [OccupancyGrid](#occupancygrid)
- [OccupancyBinding](#occupancybinding)
- [SubcellOccupancyGrid](#subcelloccupancygrid)
- [Path Service](#path-service)
- [VisibilityMap](#visibilitymap)
- [Command Transaction](#command-transaction)
- [Layer](#layer)
- [Noise](#noise)
- [Cellular Automata](#cellular-automata)
- [Map Generation](#map-generation)
- [Behavior Tree](#behavior-tree)
- [Client Adapter](#client-adapter)
- [Render Adapter](#render-adapter)
- [Scenario Runner](#scenario-runner)
- [World History Recorder](#world-history-recorder)
- [World Debugger](#world-debugger)
- [Session Recording — Bundle Types & Errors](#session-recording--bundle-types--errors)
- [Session Recording — Sinks (SessionSink, SessionSource, MemorySink)](#session-recording--sinks-sessionsink-sessionsource-memorysink)
- [Session Recording — FileSink](#session-recording--filesink)
- [Session Recording — SessionRecorder](#session-recording--sessionrecorder)
- [Session Recording — SessionReplayer](#session-recording--sessionreplayer)
- [Session Recording — scenarioResultToBundle](#session-recording--scenarioresulttobundle)
- [Synthetic Playtest — Policies](#synthetic-playtest--policies-v0720)
- [Synthetic Playtest — Harness](#synthetic-playtest--harness-v080)
- [Bundle Corpus Index](#bundle-corpus-index-v083)
- [Behavioral Metrics](#behavioral-metrics-v082)
- [Bundle Viewer](#bundle-viewer-v087)
- [Strict Mode](#strict-mode-v088)
- [AI Playtester Agent](#ai-playtester-agent-v089-extended-v0811)

---

## Types

Package consumers should import public types and utilities from the root module, `civ-engine`. Source file comments below identify where each type is owned.

### `EntityId`

```typescript
// src/types.ts
type EntityId = number;
```

Numeric identifier for entities. IDs are recycled via a free-list after destruction. Two entities may share the same ID across different lifetimes but never simultaneously.

### `EntityRef`

```typescript
// src/types.ts
interface EntityRef {
  id: EntityId;
  generation: number;
}
```

Generation-aware entity reference. Use this for external commands and clients that need to detect stale entity IDs after destruction and recycling.

### `Position`

```typescript
// src/types.ts
interface Position {
  x: number;
  y: number;
}
```

Standard 2D position interface used for spatial grid synchronization. The component key for spatial tracking is configurable via `WorldConfig.positionKey` (default `'position'`).

### `InstrumentationProfile`

```typescript
// src/types.ts
type InstrumentationProfile = 'full' | 'minimal' | 'release';
```

Controls how much implicit runtime instrumentation the engine keeps on the hot path.

- `full` keeps the normal development behavior. `step()` records detailed per-tick metrics and `submit()` preserves the compatibility wrapper over `submitWithResult()`.
- `minimal` is the QA/staging profile. `step()` records coarse per-tick metrics such as counts and total duration, but skips detailed phase timings and per-system timing entries.
- `release` removes avoidable observation work from the implicit `step()` and `submit()` paths. Explicit AI/debug APIs such as `stepWithResult()` and `submitWithResult()` still return structured results when you call them.

### `WorldConfig`

```typescript
// src/types.ts
interface WorldConfig {
  gridWidth: number;       // Width of the spatial grid (required)
  gridHeight: number;      // Height of the spatial grid (required)
  tps: number;             // Ticks per second for real-time loop (required)
  positionKey?: string;    // Component key used for spatial sync (default: 'position')
  maxTicksPerFrame?: number; // Spiral-of-death cap (default: 4)
  seed?: number | string;  // Deterministic RNG seed
  instrumentationProfile?: InstrumentationProfile; // Implicit instrumentation level (default: 'full')
}
```

### `System`

```typescript
// src/world.ts
type System<TEventMap, TCommandMap, TComponents, TState> = (
  world: World<TEventMap, TCommandMap, TComponents, TState>,
) => void;
```

A system is a pure function that receives the `World` and runs game logic. Systems execute by phase, preserving registration order within each phase. Bare function registrations default to the `update` phase. All four generics default to permissive types so existing 2-generic call sites continue to compile; threading `TComponents` and `TState` through gives compile-time-typed `world.getComponent` / `world.getState` access inside the callback body.

### `SystemRegistration`

```typescript
// src/world.ts
interface SystemRegistration<TEventMap, TCommandMap, TComponents, TState> {
  name?: string;
  phase?: 'input' | 'preUpdate' | 'update' | 'postUpdate' | 'output';
  before?: string[];
  after?: string[];
  interval?: number;
  intervalOffset?: number;
  execute: System<TEventMap, TCommandMap, TComponents, TState>;
}
```

Optional system registration object for naming systems and assigning a lifecycle phase. The `before` and `after` fields declare ordering constraints between named systems within the same phase (see [System Ordering Constraints](#registersystemfnorconfig)).

`interval` (default `1`) gates how often the system runs. The system fires only when `(executingTick - 1) % interval === intervalOffset`, where `executingTick` is the tick number being processed (equal to `world.tick + 1` while the system is running, or equivalently the value of `world.tick` after `step()` returns successfully). With `interval: 4` and `intervalOffset: 0`, the system runs at ticks 1, 5, 9, 13 — i.e., it fires on the first tick and then every 4 ticks, which matches the legacy `if (world.tick % 4 !== 0) return;` pattern.

`intervalOffset` (default `0`, must satisfy `0 <= intervalOffset < interval`) shifts the cadence within the cycle. `interval: 4, intervalOffset: 1` fires at ticks 2, 6, 10. Three systems with `interval: 3` and offsets `0`/`1`/`2` partition every tick into a stable round-robin.

Use intervals to throttle expensive subsystems (slow propagation, periodic AI re-planning, weather updates) without changing each system's logic. Skipped systems do not invoke their `execute` body and do not push a per-system entry into `metrics.systems`; the per-tick total in `metrics.durationMs.systems` still includes the cheap modulo check across all registered systems, so the savings come from the body, not from the dispatch. **Failed ticks consume a cadence slot:** if the executing tick fails, any periodic system whose modulo aligned with that tick simply does not fire — the engine does not retry on the next successful tick.

Validation throws at registration if `interval` is not a safe integer (`Number.isSafeInteger`) >= 1, or if `intervalOffset` is not a safe integer in `[0, interval)`. Bounding `interval` to safe-integer range avoids non-deterministic modulo results past `2^53`.

### `LooseSystem`

```typescript
// src/world.ts
type LooseSystem = (world: World<any, any, any, any>) => void;
```

A system typed against a bare `World` that does not need explicit casts when registered into a generically typed world. Useful for utility systems that do not depend on specific event/command/component/state maps.

### `LooseSystemRegistration`

```typescript
// src/world.ts
interface LooseSystemRegistration {
  name?: string;
  phase?: 'input' | 'preUpdate' | 'update' | 'postUpdate' | 'output';
  before?: string[];
  after?: string[];
  interval?: number;
  intervalOffset?: number;
  execute: LooseSystem;
}
```

Same shape as `SystemRegistration` but uses `LooseSystem` instead. `interval` and `intervalOffset` carry the same semantics as on `SystemRegistration`.

### `ComponentRegistry`

```typescript
// src/types.ts
type ComponentRegistry = Record<string, unknown>;
```

Third type parameter to `World<TEventMap, TCommandMap, TComponents, TState>`. When specified, component methods (`addComponent`, `getComponent`, `setComponent`, `patchComponent`, `removeComponent`, `query`) infer value types from the registry keys, eliminating manual generic annotations. The fourth `TState` generic plays the analogous role for `world.setState` / `world.getState`. Both generics thread through `System`, `SystemRegistration`, `registerSystem`, `registerValidator`, `registerHandler`, `onDestroy`, and `World.deserialize` so typed access works inside callback bodies.

### `WorldMetrics`

```typescript
// src/world.ts
interface WorldMetrics {
  tick: number;
  entityCount: number;
  componentStoreCount: number;
  simulation: { tps: number; tickBudgetMs: number };
  commandStats: { pendingBeforeTick: number; processed: number };
  systems: Array<{ name: string; phase: SystemPhase; durationMs: number }>;
  query: { calls: number; cacheHits: number; cacheMisses: number; results: number };
  spatial: { explicitSyncs: number };
  durationMs: {
    total: number;
    commands: number;
    systems: number;
    resources: number;
    diff: number;
  };
}
```

Last-tick instrumentation returned by `world.getMetrics()`. In `instrumentationProfile: 'minimal'`, implicit `step()` refreshes only the coarse metrics fields. In `instrumentationProfile: 'release'`, implicit `step()` leaves this as `null`; explicit `stepWithResult()` still refreshes the full metrics payload.

### `getAiContractVersions()`

```typescript
// src/ai-contract.ts
function getAiContractVersions(): {
  commandResult: number;
  worldDebug: number;
  worldHistory: number;
  worldHistoryRangeSummary: number;
  scenarioResult: number;
  clientProtocol: number;
}
```

Returns the current version markers for the engine's machine-facing AI contracts.

### `CommandValidationRejection`

```typescript
// src/world.ts
interface CommandValidationRejection {
  code: string;
  message?: string;
  details?: JsonValue;
}
```

Structured validator rejection used by `registerValidator()` and `submitWithResult()`.

### `CommandValidationResult`

```typescript
// src/world.ts
type CommandValidationResult = boolean | CommandValidationRejection;
```

Validators may still return `true` or `false`. Returning a rejection object preserves stable machine-readable details.

### `CommandSubmissionResult<TCommandType>`

```typescript
// src/world.ts
interface CommandSubmissionResult<TCommandType extends PropertyKey = string> {
  schemaVersion: number;
  accepted: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
  sequence: number;
  validatorIndex: number | null;
}
```

Structured outcome returned by `world.submitWithResult()` and emitted through `world.onCommandResult()`.

### `CommandExecutionResult<TCommandType>`

```typescript
// src/world.ts
interface CommandExecutionResult<TCommandType extends PropertyKey = string> {
  schemaVersion: number;
  submissionSequence: number | null;
  executed: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
}
```

Structured outcome emitted through `world.onCommandExecution()` after a queued command is processed on a tick.

### `TickFailurePhase`

```typescript
// src/world.ts
type TickFailurePhase =
  | 'commands'
  | 'systems'
  | 'resources'
  | 'diff'
  | 'listeners';
```

Named phases used by structured tick failures.

### `TickFailure`

```typescript
// src/world.ts
interface TickFailure {
  schemaVersion: number;
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
```

Structured runtime failure for one tick. Returned by `world.stepWithResult()`, emitted through `world.onTickFailure()`, exposed through `world.getLastTickFailure()`, and forwarded by `ClientAdapter`.

### `WorldStepResult`

```typescript
// src/world.ts
interface WorldStepResult {
  schemaVersion: number;
  ok: boolean;
  tick: number;
  failure: TickFailure | null;
}
```

Structured result returned by `world.stepWithResult()`.

### `WorldTickFailureError`

```typescript
// src/world.ts
class WorldTickFailureError extends Error {
  readonly failure: TickFailure;
}
```

Thrown by `world.step()` when a tick fails. Also thrown by `world.step()` (and surfaced as a `world_poisoned` failure result by `world.stepWithResult()`) for any subsequent step until `world.recover()` is called — see Tick failure semantics.

### Tick failure semantics

A failure in any tick phase (commands, systems, resources, diff, listeners) marks the world as **poisoned**:

- `world.isPoisoned(): boolean` returns `true` until the next call to `recover()`.
- While poisoned, `world.step()` throws `WorldTickFailureError` and `world.stepWithResult()` returns a `WorldStepResult` with `failure.code === 'world_poisoned'`. The original failure that caused the poison is preserved on the result for diagnostics.
- `world.recover(): void` clears the poison flag and the cached `lastTickFailure`/`currentDiff`/`currentMetrics`. After `recover()`, the next `step()` runs normally.

Failed ticks consume a tick number. If a tick fails at would-be tick `N+1`, `world.tick` advances to `N+1`; the next successful tick after `recover()` is `N+2`. This guarantees that failed-tick events and successful-tick events never share a `tick` value, so consumers can correlate by tick number unambiguously.

When a command handler throws (or its handler is missing), every command queued for that tick that has not yet executed is emitted as a `commandExecuted: false` event with `code: 'tick_aborted_before_handler'`, and the dropped commands' `submissionSequence`s are recorded on `failure.details.droppedCommands`. The queue is not re-populated — these commands are dropped, not retried.

### `WorldSnapshot`

```typescript
// src/serializer.ts
interface WorldSnapshot {
  version: 5;
  config: WorldConfig; // includes maxTicksPerFrame and instrumentationProfile when non-default
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
  componentOptions?: Record<string, ComponentStoreOptions>; // diffMode per component
  resources: ResourceStoreState;
  rng: RandomState;
  state: Record<string, unknown>;
  tags: Record<number, string[]>;
  metadata: Record<number, Record<string, string | number>>;
}
```

JSON-serializable snapshot of the entire world state, deep-cloned at both serialize and deserialize boundaries so callers cannot mutate live engine state through it. Used by `serialize()` and `World.deserialize()`. Version 5 adds `componentOptions` (per-component `diffMode` round-trip) and serializes `WorldConfig.maxTicksPerFrame` / `WorldConfig.instrumentationProfile` when non-default. Version 4 added world-level state, entity tags, and entity metadata. Version 3 includes deterministic RNG state so a saved simulation resumes the same random sequence. Version 2 includes resource registrations, pools, rates, transfers, and the next transfer ID. Versions 1–4 are still accepted by `World.deserialize()` for backward compatibility — older snapshots without `componentOptions` deserialize each component store with default options. Systems, validators, handlers, and event listeners are not included (they are functions, not data). Pre-0.5.0 snapshots may include `config.detectInPlacePositionMutations` and `componentOptions[*].detectInPlaceMutations`; both are silently ignored on read in 0.5.0+.

### `TickDiff`

```typescript
// src/diff.ts
interface TickDiff {
  tick: number;
  entities: {
    created: EntityId[];
    destroyed: EntityId[];
  };
  components: Record<string, {
    set: Array<[EntityId, unknown]>;
    removed: EntityId[];
  }>;
  resources: Record<string, {
    set: Array<[EntityId, ResourcePool]>;
    removed: EntityId[];
  }>;
  state: Record<string, { set?: unknown; removed?: true }>;
  tags: Record<string, {
    added: EntityId[];
    removed: EntityId[];
  }>;
  metadata: Record<string, {
    set: Array<[EntityId, string | number]>;
    removed: EntityId[];
  }>;
}
```

Per-tick change set capturing every entity, component, resource, world state, tag, and metadata entry that changed. Only types/keys that actually changed appear in the record.

### `ResourcePool`

```typescript
// src/resource-store.ts
interface ResourcePool {
  current: number;
  max: number | null;
}
```

A resource pool with a current value and a maximum capacity. `max: null` means unbounded capacity and is used instead of `Infinity` so snapshots and diffs stay JSON-safe.

### `ResourceStoreState`

```typescript
// src/resource-store.ts
interface ResourceStoreState {
  registered: Array<[string, { defaultMax: number | null }]>;
  pools: Record<string, Array<[EntityId, ResourcePool]>>;
  production: Record<string, Array<[EntityId, number]>>;
  consumption: Record<string, Array<[EntityId, number]>>;
  transfers: Transfer[];
  nextTransferId: number;
}
```

Serializable resource subsystem state included in snapshot versions 2 and 3.

### `RandomState`

```typescript
// src/random.ts
interface RandomState {
  state: number;
}
```

Serializable deterministic RNG state included in snapshot version 3.

### `Transfer`

```typescript
// src/resource-store.ts
interface Transfer {
  id: number;
  from: EntityId;
  to: EntityId;
  resource: string;
  rate: number;
}
```

A recurring resource transfer between two entities, processed each tick.

### `PathConfig<T>`

```typescript
// src/pathfinding.ts
interface PathConfig<T> {
  start: T;                                   // Starting node
  goal: T;                                    // Target node
  neighbors: (node: T) => T[];               // Returns adjacent nodes
  cost: (from: T, to: T) => number;          // Edge cost (Infinity = impassable)
  heuristic: (node: T, goal: T) => number;   // Estimated cost to goal
  hash: (node: T) => string | number;        // Unique node identifier
  maxCost?: number;                           // Cost ceiling (default: Infinity)
  maxIterations?: number;                     // Iteration limit (default: 10,000)
  trackExplored?: boolean;                    // Include explored count (default: false)
}
```

### `PathResult<T>`

```typescript
// src/pathfinding.ts
interface PathResult<T> {
  path: T[];         // Ordered list of nodes from start to goal (inclusive)
  cost: number;      // Total path cost
  explored?: number; // Number of nodes explored (only if trackExplored was true)
}
```

### `OccupancyRect`

```typescript
// src/occupancy-grid.ts
interface OccupancyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Rectangular footprint used for buildings and other multi-tile claims.

### `OccupancyArea`

```typescript
// src/occupancy-grid.ts
type OccupancyArea = OccupancyRect | ReadonlyArray<Position>;
```

Area input accepted by occupancy APIs. Use a rectangle for dense footprints or a list of positions for arbitrary shapes.

### `OccupancyQueryOptions`

```typescript
// src/occupancy-grid.ts
interface OccupancyQueryOptions {
  ignoreEntity?: EntityId;
  includeReservations?: boolean;
}
```

Options for occupancy checks. `ignoreEntity` is useful when checking whether a moving entity can continue through its current footprint.

### `GridPassability`

```typescript
// src/occupancy-grid.ts
interface GridPassability {
  readonly width: number;
  readonly height: number;
  readonly version: number;
  isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean;
}
```

Minimal passability surface used by `findGridPath()`. `OccupancyGrid` and `OccupancyBinding` both satisfy this contract.

### `OccupancyGridState`

```typescript
// src/occupancy-grid.ts
interface OccupancyGridState {
  width: number;
  height: number;
  blocked: number[];
  occupied: Array<[EntityId, number[]]>;
  reservations: Array<[EntityId, number[]]>;
  version: number;
}
```

Serializable occupancy snapshot used by `OccupancyGrid.getState()` and `OccupancyGrid.fromState()`.

### `OccupancyGridMetrics`

```typescript
// src/occupancy-grid.ts
interface OccupancyGridMetrics {
  blockedQueries: number;
  blockedCellChecks: number;
  claimQueries: number;
  claimCellChecks: number;
  areaNormalizations: number;
  normalizedCellCount: number;
  stateSnapshots: number;
}
```

Runtime scan counters for `OccupancyGrid`. Useful for benchmark harnesses and game-side performance diagnostics.

### `SubcellSlotOffset`

```typescript
// src/occupancy-grid.ts
interface SubcellSlotOffset {
  x: number;
  y: number;
}
```

Relative offset inside one integer cell. The default `SubcellOccupancyGrid` layout uses four quarter-cell offsets.

### `SubcellPlacement`

```typescript
// src/occupancy-grid.ts
interface SubcellPlacement {
  position: Position;
  slot: number;
  offset: SubcellSlotOffset;
}
```

Resolved slot assignment for one entity in one cell. Returned by `bestSlotForUnit()`, `occupy()`, and `getOccupiedPlacement()`.

### `SubcellNeighborSpace`

```typescript
// src/occupancy-grid.ts
interface SubcellNeighborSpace {
  position: Position;
  freeSlots: number;
  bestSlot: SubcellPlacement;
}
```

Neighbor cell with remaining crowding capacity. Returned by `neighborsWithSpace()`.

### `SubcellOccupancyOptions`

```typescript
// src/occupancy-grid.ts
interface SubcellOccupancyOptions extends OccupancyQueryOptions {
  preferredSlot?: number;
  preferredOffset?: SubcellSlotOffset;
}
```

Options for slot-based crowding queries. `preferredSlot` biases toward one slot index; `preferredOffset` biases toward the nearest slot geometry inside the cell.

### `SubcellNeighborOptions`

```typescript
// src/occupancy-grid.ts
interface SubcellNeighborOptions extends SubcellOccupancyOptions {
  offsets?: ReadonlyArray<Position>;
}
```

Neighbor-query options for `SubcellOccupancyGrid.neighborsWithSpace()`. Defaults to cardinal neighbor offsets.

### `SubcellOccupancyGridOptions`

```typescript
// src/occupancy-grid.ts
interface SubcellOccupancyGridOptions {
  slots?: ReadonlyArray<SubcellSlotOffset>;
  isCellBlocked?: (
    x: number,
    y: number,
    options?: OccupancyQueryOptions,
  ) => boolean;
}
```

Constructor options for `SubcellOccupancyGrid`. Use `slots` to define a custom packing layout, and `isCellBlocked` to consult whole-cell blockers such as `OccupancyGrid`, terrain, or scenario rules.

### `SubcellOccupancyGridState`

```typescript
// src/occupancy-grid.ts
interface SubcellOccupancyGridState {
  width: number;
  height: number;
  slots: SubcellSlotOffset[];
  occupied: Array<[EntityId, { cell: number; slot: number }]>;
  version: number;
}
```

Serializable slot-crowding snapshot used by `SubcellOccupancyGrid.getState()` and `SubcellOccupancyGrid.fromState()`.

### `SubcellOccupancyGridMetrics`

```typescript
// src/occupancy-grid.ts
interface SubcellOccupancyGridMetrics {
  placementQueries: number;
  blockedQueries: number;
  blockedCellChecks: number;
  slotChecks: number;
  neighborQueries: number;
  neighborCellChecks: number;
  freeSlotQueries: number;
  freeSlotChecks: number;
  stateSnapshots: number;
}
```

Runtime scan counters for `SubcellOccupancyGrid`.

### `OccupancyMetadata`

```typescript
// src/occupancy-grid.ts
interface OccupancyMetadata {
  kind: string;
}
```

Minimal blocker metadata carried by `OccupancyBinding`. Use `kind` for repo-level distinctions such as `building`, `resource`, `unit`, or `terrain`.

### `OccupancyCellClaim`

```typescript
// src/occupancy-grid.ts
interface OccupancyCellClaim {
  entity: EntityId | null;
  kind: string;
  claim: 'blocked' | 'occupied' | 'reserved' | 'subcell';
  slot?: number;
  offset?: SubcellSlotOffset;
}
```

One occupancy or crowding claim returned by `OccupancyBinding.getCellStatus()`.

### `OccupancyCellStatus`

```typescript
// src/occupancy-grid.ts
interface OccupancyCellStatus {
  position: Position;
  blocked: boolean;
  blockedBy: OccupancyCellClaim[];
  crowdedBy: OccupancyCellClaim[];
  freeSubcellSlots: number | null;
}
```

Combined whole-cell and sub-cell view for one cell. `blockedBy` carries building/resource/unit-style metadata without requiring multiple parallel grids, while `blocked` also flips to `true` when sub-cell crowding has no free slots left for the query.

### `OccupancyBindingClaimOptions`

```typescript
// src/occupancy-grid.ts
interface OccupancyBindingClaimOptions {
  metadata?: OccupancyMetadata;
}
```

Metadata wrapper used by `OccupancyBinding.block()`, `occupy()`, and `reserve()`.

### `OccupancyBindingSubcellOptions`

```typescript
// src/occupancy-grid.ts
interface OccupancyBindingSubcellOptions extends SubcellOccupancyOptions {
  metadata?: OccupancyMetadata;
}
```

Sub-cell crowding options plus optional blocker metadata for `OccupancyBinding`.

### `OccupancyBindingWorldHooks`

```typescript
// src/occupancy-grid.ts
interface OccupancyBindingWorldHooks {
  onDestroy(callback: (id: EntityId, world: unknown) => void): void;
  offDestroy(callback: (id: EntityId, world: unknown) => void): void;
}
```

Minimal destroy-hook contract accepted by `OccupancyBinding.attachWorld()` and the constructor `world` option.

### `OccupancyBindingOptions`

```typescript
// src/occupancy-grid.ts
interface OccupancyBindingOptions {
  crowding?: false | SubcellOccupancyGridOptions;
  world?: OccupancyBindingWorldHooks;
}
```

Constructor options for `OccupancyBinding`. Crowd tracking is enabled by default; pass `crowding: false` to disable sub-cell APIs.

### `OccupancyBindingMetrics`

```typescript
// src/occupancy-grid.ts
interface OccupancyBindingMetrics {
  version: number;
  cellStatusQueries: number;
  crowdedSlotChecks: number;
  occupancy: OccupancyGridMetrics;
  crowding: SubcellOccupancyGridMetrics | null;
}
```

Aggregate metrics returned by `OccupancyBinding.getMetrics()`.

### `GridPathConfig`

```typescript
// src/path-service.ts
interface GridPathConfig {
  start: Position;
  goal: Position;
  width?: number;
  height?: number;
  occupancy?: GridPassability;
  movingEntity?: EntityId;
  includeReservations?: boolean;
  allowDiagonal?: boolean;
  preventCornerCutting?: boolean;
  blocked?: (x: number, y: number) => boolean;
  cost?: (from: Position, to: Position) => number;
  heuristic?: (node: Position, goal: Position) => number;
  maxCost?: number;
  maxIterations?: number;
  trackExplored?: boolean;
}
```

Configuration for `findGridPath()`. Supply `width` and `height` directly, or pass any `GridPassability` implementation (`OccupancyGrid`, `OccupancyBinding`, or your own) and dimensions are inferred.

### `GridPathRequest`

```typescript
// src/path-service.ts
interface GridPathRequest extends GridPathConfig {
  passabilityVersion?: number;
  cacheKey?: string;
}
```

Request shape accepted by `PathRequestQueue` when used through `createGridPathQueue()`. `passabilityVersion` lets callers invalidate cached results when custom passability rules change.

### `PathRequestQueueEntry<TRequest, TResult>`

```typescript
// src/path-service.ts
interface PathRequestQueueEntry<TRequest, TResult> {
  id: number;
  request: TRequest;
  result: TResult;
  fromCache: boolean;
}
```

Completed queue entry returned from `process()`.

### `PathRequestQueueStats`

```typescript
// src/path-service.ts
interface PathRequestQueueStats {
  enqueued: number;
  processed: number;
  cacheHits: number;
  cacheMisses: number;
  pending: number;
  cacheSize: number;
}
```

Queue counters returned by `PathRequestQueue.getStats()`.

### `PathRequestQueueOptions<TRequest, TResult>`

```typescript
// src/path-service.ts
interface PathRequestQueueOptions<TRequest, TResult> {
  resolve: (request: TRequest) => TResult;
  cacheKey?: (request: TRequest) => string | undefined;
  passabilityVersion?: (request: TRequest) => number;
  cloneResult?: (result: TResult) => TResult;
}
```

Constructor options for the generic deterministic request queue.

### `VisibilityPlayerId`

```typescript
// src/visibility-map.ts
type VisibilityPlayerId = number | string;
```

Player key used by `VisibilityMap`.

### `VisionSourceId`

```typescript
// src/visibility-map.ts
type VisionSourceId = number | string;
```

Identifier for an individual vision source within one player's visibility state.

### `VisionSource`

```typescript
// src/visibility-map.ts
interface VisionSource {
  x: number;
  y: number;
  radius: number;
}
```

Circular reveal source used by `VisibilityMap`.

### `VisibilityMapState`

```typescript
// src/visibility-map.ts
interface VisibilityMapState {
  width: number;
  height: number;
  players: Array<
    [
      VisibilityPlayerId,
      {
        sources: Array<[VisionSourceId, VisionSource]>;
        explored: number[];
      },
    ]
  >;
}
```

Serializable visibility snapshot used by `VisibilityMap.getState()` and `VisibilityMap.fromState()`.

### `CellGrid`

```typescript
// src/cellular.ts
type CellGrid = {
  readonly width: number;
  readonly height: number;
  readonly cells: number[];   // Flat array, indexed as y * width + x
};
```

### `CellRule`

```typescript
// src/cellular.ts
type CellRule = (current: number, neighbors: number[]) => number;
```

A function that determines a cell's next value based on its current value and its neighbors' values.

### `MapGenerator`

```typescript
// src/map-gen.ts
interface MapGenerator {
  generate(world: World, tiles: EntityId[][]): void;
}
```

Interface for map generators. Receives the world and the tile entity grid from `createTileGrid`.

### `NodeStatus`

```typescript
// src/behavior-tree.ts
enum NodeStatus {
  SUCCESS,   // 0 - Node completed successfully
  FAILURE,   // 1 - Node failed
  RUNNING,   // 2 - Node needs more ticks to complete
}
```

### `BTState`

```typescript
// src/behavior-tree.ts
interface BTState {
  running: number[];  // Per-node index tracking which child is running (-1 = none)
}
```

Serializable behavior tree execution state. Store this as a component on entities. The `running` array has one slot per node in the tree, tracking which child a composite node should resume from.

### `TreeBuilder<TContext>`

```typescript
// src/behavior-tree.ts
interface TreeBuilder<TContext> {
  action(fn: (ctx: TContext) => NodeStatus): BTNode<TContext>;
  condition(fn: (ctx: TContext) => boolean): BTNode<TContext>;
  selector(children: BTNode<TContext>[]): BTNode<TContext>;
  sequence(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSelector(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSequence(children: BTNode<TContext>[]): BTNode<TContext>;
}
```

Builder object passed to the `createBehaviorTree` define callback. Used to construct tree nodes.

### `GameEvent<TEventMap>`

```typescript
// src/client-adapter.ts
type GameEvent<TEventMap> = {
  type: keyof TEventMap;
  data: TEventMap[keyof TEventMap];
};
```

### `ServerMessage<TEventMap>`

```typescript
// src/client-adapter.ts
type ServerMessage<TEventMap> =
  | { protocolVersion: number; type: 'snapshot'; data: WorldSnapshot }
  | { protocolVersion: number; type: 'tick'; data: { diff: TickDiff; events: GameEvent<TEventMap>[] } }
  | {
      protocolVersion: number;
      type: 'commandAccepted';
      data: { id: string; commandType: string; code: 'accepted'; message: string };
    }
  | {
      protocolVersion: number;
      type: 'commandRejected';
      data: {
        id: string;
        commandType: string | null;
        code: string;
        message: string;
        details: JsonValue | null;
        validatorIndex: number | null;
      };
    }
  | {
      protocolVersion: number;
      type: 'commandExecuted';
      data: {
        id: string;
        commandType: string;
        submissionSequence: number | null;
        code: string;
        message: string;
        details: JsonValue | null;
        tick: number;
      };
    }
  | {
      protocolVersion: number;
      type: 'commandFailed';
      data: {
        id: string;
        commandType: string;
        submissionSequence: number | null;
        code: string;
        message: string;
        details: JsonValue | null;
        tick: number;
      };
    }
  | {
      protocolVersion: number;
      type: 'tickFailed';
      data: TickFailure;
    };
```

Messages sent from server to client:

| Type | When sent | Payload |
|---|---|---|
| `snapshot` | On `connect()` or `requestSnapshot` | `protocolVersion` + full `WorldSnapshot` |
| `tick` | After each `step()` while connected | `protocolVersion` + `TickDiff` + events from the tick |
| `commandAccepted` | When a submitted command passed validation and was queued | `protocolVersion` + command ID + command type + accepted message |
| `commandRejected` | When the adapter rejects a malformed, unhandled, or validation-failed command | `protocolVersion` + command ID + command type + stable code/message/details |
| `commandExecuted` | When a queued client command completes during a tick | `protocolVersion` + command ID + command type + submission sequence + execution code/message/details + tick |
| `commandFailed` | When a queued client command fails during a tick | `protocolVersion` + command ID + command type + submission sequence + failure code/message/details + tick |
| `tickFailed` | When the world reports a structured tick failure | `protocolVersion` + `TickFailure` |

### `ClientMessage<TCommandMap>`

```typescript
// src/client-adapter.ts
type ClientMessage<TCommandMap> =
  | { protocolVersion?: number; type: 'command'; data: { id: string; commandType: keyof TCommandMap; payload: TCommandMap[keyof TCommandMap] } }
  | { protocolVersion?: number; type: 'requestSnapshot' };
```

Messages sent from client to server:

| Type | Purpose | Payload |
|---|---|---|
| `command` | Submit a game command | Optional `protocolVersion`, command ID, type, and payload |
| `requestSnapshot` | Request a full state resync | Optional `protocolVersion` |

---

## World

`World<TEventMap, TCommandMap, TComponents>` is the top-level API and the only public entry point. All subsystems (entity manager, component stores, spatial grid, game loop, event bus, command queue, resource store) are owned as private fields.

```typescript
import { World } from 'civ-engine';
```

### Type Parameters

| Parameter | Constraint | Default | Description |
|---|---|---|---|
| `TEventMap` | `Record<keyof TEventMap, unknown>` | `Record<string, never>` | Map of event type names to event data types |
| `TCommandMap` | `Record<keyof TCommandMap, unknown>` | `Record<string, never>` | Map of command type names to command data types |
| `TComponents` | `ComponentRegistry` | `Record<string, unknown>` | Optional component registry. When specified, component methods infer value types from registry keys |

### Constructor

```typescript
new World<TEventMap, TCommandMap, TComponents>(config: WorldConfig)
```

Creates a new world with the specified grid dimensions, tick rate, and optional configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `config.gridWidth` | `number` | Yes | Width of the spatial grid in cells |
| `config.gridHeight` | `number` | Yes | Height of the spatial grid in cells |
| `config.tps` | `number` | Yes | Ticks per second for the real-time loop |
| `config.positionKey` | `string` | No | Component key used for spatial grid sync (default: `'position'`) |
| `config.maxTicksPerFrame` | `number` | No | Maximum ticks processed per real-time frame before discarding accumulated time (default: `4`) |
| `config.seed` | `number \| string` | No | Seed for deterministic `world.random()` sequences |

**Example:**

```typescript
const world = new World({ gridWidth: 64, gridHeight: 64, tps: 10 });
```

### Entity Management

#### `createEntity()`

```typescript
createEntity(): EntityId
```

Creates a new entity and returns its ID. IDs are recycled from previously destroyed entities via a free-list. Entity IDs start at `0` and increment.

**Returns:** `EntityId` — the new entity's numeric ID.

```typescript
const unit = world.createEntity(); // 0
const building = world.createEntity(); // 1
```

#### `destroyEntity(id)`

```typescript
destroyEntity(id: EntityId): void
```

Immediately destroys an entity. Performs full cleanup in this order:

1. Fires all `onDestroy` callbacks (with components still attached)
2. Removes entity from the spatial grid using its last-synced position
3. Removes all components from all stores
4. Removes all resource pools, production rates, consumption rates, and transfers
5. Removes all tags and metadata associated with the entity
6. Marks the entity as dead in the entity manager (ID becomes available for recycling)

**No-op** if the entity is already dead.

```typescript
world.destroyEntity(unit);
world.isAlive(unit); // false
```

#### `isAlive(id)`

```typescript
isAlive(id: EntityId): boolean
```

Returns `true` if the entity exists and has not been destroyed. Returns `false` for IDs that were never created or have been destroyed.

```typescript
const e = world.createEntity();
world.isAlive(e);    // true
world.destroyEntity(e);
world.isAlive(e);    // false
world.isAlive(999);  // false
```

#### `getEntityRef(id)`

```typescript
getEntityRef(id: EntityId): EntityRef | null
```

Returns a generation-aware reference for a live entity, or `null` if the entity is not alive.

#### `isCurrent(ref)`

```typescript
isCurrent(ref: EntityRef): boolean
```

Returns `true` only if the referenced entity ID is alive and still has the same generation.

#### `getAliveEntities()`

```typescript
getAliveEntities(): IterableIterator<EntityId>
```

Yields every live entity id in ascending order. Cheaper than reading `world.serialize().entities.alive` when you only need to iterate the set (no JSON-compat walk on component data). Useful for renderer adapters connecting mid-session.

#### `getEntityGeneration(id)`

```typescript
getEntityGeneration(id: EntityId): number
```

Returns the current generation counter for the given entity id. Combined with `getAliveEntities()` lets a caller build `EntityRef` objects without going through `getEntityRef` per entity.

### Components

#### `registerComponent<T>(key, options?)`

```typescript
registerComponent<T>(key: string, options?: ComponentOptions): void

interface ComponentOptions {
  diffMode?: 'strict' | 'semantic';
}
```

Registers a component type by string key. Must be called before using `addComponent`, `getComponent`, `removeComponent`, or `query` with this key.

`options.diffMode` controls how component writes participate in `TickDiff`:
- `'strict'` (default) — every `addComponent` / `setComponent` call marks the entity dirty, even if the new value is identical to the prior value. Preserves per-write audit semantics.
- `'semantic'` — writes are fingerprinted against the baseline from the last tick; identical rewrites do not mark the entity dirty. Use this for components whose sync systems rewrite unchanged values every tick (e.g. `position`, `transform`) to keep `TickDiff` liveness signals high.

In-place mutations of component objects (`world.getComponent(id, 'foo').x = 5`) are NOT tracked by the diff system. Game code must call `setComponent`/`addComponent`/`patchComponent` for changes to land in the diff. The dirty set is updated only by the explicit write APIs.

`options.diffMode` is round-tripped in v5 snapshots so save/load preserves component-store behavior.

**Throws:** `Error` if a component with this key is already registered.

```typescript
interface Health { hp: number; maxHp: number }
world.registerComponent<Health>('health');

interface Transform { x: number; y: number }
world.registerComponent<Transform>('transform', { diffMode: 'semantic' });
```

#### `addComponent<T>(entity, key, data)`

```typescript
addComponent<T>(entity: EntityId, key: string, data: T): void
```

Attaches a component to an entity. If the entity already has this component, it is overwritten.

**Throws:** `Error` if the entity is not alive, the component key is not registered, or the data is not JSON-compatible.

```typescript
world.addComponent(unit, 'health', { hp: 100, maxHp: 100 });
```

`addComponent` is kept as a compatibility alias for `setComponent`.

#### `setComponent<T>(entity, key, data)`

```typescript
setComponent<T>(entity: EntityId, key: string, data: T): void
```

Sets or replaces a component, marks it dirty for diffs, and updates the spatial grid immediately when `key` is the world's `positionKey`.

#### `patchComponent<T>(entity, key, fn)`

```typescript
patchComponent<T>(
  entity: EntityId,
  key: string,
  patch: (data: T) => T | void,
): T
```

Reads an existing component, lets the callback mutate it or return a replacement, then marks it dirty.

#### `setPosition(entity, position, key?)`

```typescript
setPosition(entity: EntityId, position: Position, key?: string): void
```

Sets position data and updates the spatial grid immediately when the key is the world's `positionKey`.

#### `getComponent<T>(entity, key)`

```typescript
getComponent<T>(entity: EntityId, key: string): T | undefined
```

Returns the component data for the given entity and key, or `undefined` if the entity does not have this component. The returned object is a direct reference, so mutations are reflected immediately. Direct mutations are detected for diffs, but `setComponent()` and `patchComponent()` are the preferred write APIs for clearer intent and immediate position/grid synchronization.

```typescript
const hp = world.getComponent<Health>(unit, 'health');
if (hp) {
  hp.hp -= 10; // mutate in-place
}
```

#### `getComponents<T>(entity, keys)`

```typescript
getComponents<T extends unknown[]>(entity: EntityId, keys: string[]): ComponentTuple<T>
```

Batch-reads multiple components for a single entity. Returns a tuple where each element is the component data or `undefined`. More concise than multiple `getComponent` calls.

**Type:** `ComponentTuple<T>` is `{ [K in keyof T]: T[K] | undefined }`.

```typescript
const [pos, hp, vel] = world.getComponents<[Position, Health, Velocity]>(
  unit,
  ['position', 'health', 'velocity'],
);
// pos: Position | undefined
// hp: Health | undefined
// vel: Velocity | undefined
```

#### `removeComponent(entity, key)`

```typescript
removeComponent(entity: EntityId, key: string): void
```

Detaches a component from an entity. No-op if the entity doesn't have this component.

```typescript
world.removeComponent(unit, 'velocity');
```

#### `query(...keys)`

```typescript
*query(...keys: string[]): IterableIterator<EntityId>
```

Returns an iterator over all entity IDs that have **every** specified component. Query membership is cached by component signature and updated as components are added, removed, or entities are destroyed.

**Throws:** `Error` if any component key is not registered.

Returns immediately (yields nothing) if `keys` is empty.

```typescript
// Iterate
for (const id of world.query('position', 'health')) {
  // id has both 'position' and 'health'
}

// Collect to array
const soldiers = [...world.query('position', 'health', 'attack')];
```

### Systems & Simulation

#### `registerSystem(fnOrConfig)`

```typescript
registerSystem(
  system:
    | System<TEventMap, TCommandMap>
    | SystemRegistration<TEventMap, TCommandMap>
    | LooseSystem
    | LooseSystemRegistration,
): void
```

Adds a system to the pipeline. Bare functions run in the `update` phase. Registration objects can name systems for metrics and assign a phase. Systems run in this phase order: `input`, `preUpdate`, `update`, `postUpdate`, `output`; registration order is preserved within each phase.

The overload accepting `LooseSystem | LooseSystemRegistration` allows systems typed against `World<any, any>` to be registered without casts, which is useful for generic utility systems.

**Ordering constraints:** `SystemRegistration` (and `LooseSystemRegistration`) support optional `before` and `after` arrays to declare ordering dependencies between named systems within the same phase. Constraints are resolved via topological sort.

| Field | Type | Description |
|---|---|---|
| `before` | `string[]` | Run this system before the named systems |
| `after` | `string[]` | Run this system after the named systems |
| `interval` | `number` | Run only on ticks where `(executingTick - 1) % interval === intervalOffset` (default `1`) |
| `intervalOffset` | `number` | Cycle offset within `[0, interval)` (default `0`); shifts which absolute tick number triggers the system within the modulo cycle |

**Throws:**
- `Error` if a constraint creates a cycle within a phase
- `Error` if a constraint references a system in a different phase
- `Error` if a constraint references a non-existent system name
- `Error` if `interval` is not a safe integer >= 1
- `Error` if `intervalOffset` is not a safe integer in `[0, interval)`

```typescript
function movementSystem(w: World): void {
  for (const id of w.query('position', 'velocity')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const vel = w.getComponent<Velocity>(id, 'velocity')!;
    w.setPosition(id, { x: pos.x + vel.dx, y: pos.y + vel.dy });
  }
}

world.registerSystem(movementSystem);
world.registerSystem({
  name: 'Combat',
  phase: 'postUpdate',
  execute: combatSystem,
});

// Ordering: Movement runs before Combat within the same phase
world.registerSystem({
  name: 'Movement',
  phase: 'update',
  before: ['Collision'],
  execute: movementSystem,
});
world.registerSystem({
  name: 'Collision',
  phase: 'update',
  after: ['Movement'],
  execute: collisionSystem,
});

// Cadence: heavy weather sim runs every 12 ticks (fires at tick 1, 13, 25, ...)
world.registerSystem({
  name: 'Weather',
  phase: 'update',
  interval: 12,
  execute: weatherSystem,
});

// Stagger: two interval-2 systems on alternating ticks
world.registerSystem({ name: 'A', execute: a, interval: 2, intervalOffset: 0 }); // ticks 1, 3, 5
world.registerSystem({ name: 'B', execute: b, interval: 2, intervalOffset: 1 }); // ticks 2, 4, 6
```

#### `step()`

```typescript
step(): void
```

Advances the simulation by exactly one tick. **Deterministic** — ignores pause state and speed multiplier. This is the primary method for testing and AI-driven simulations.

Each tick executes in this order:

1. Clear event buffer
2. Clear dirty flags (entities, components, resources)
3. Process commands (drain queue, run handlers)
4. Run systems (`input`, `preUpdate`, `update`, `postUpdate`, `output`); periodic systems gated by their `interval` / `intervalOffset` are skipped on non-firing ticks
5. Process resource rates and transfers
6. Build diff (collect dirty state into `TickDiff`)
7. Update metrics
8. Notify diff listeners
9. Increment tick counter

The spatial grid is updated lock-step with every position write (`setPosition`, `setComponent` on the configured position key) — there is no separate sync phase.

```typescript
world.step(); // always executes, even when paused
```

**Throws:** `WorldTickFailureError` if the tick fails at runtime.

When `instrumentationProfile` is `'minimal'`, `step()` records only coarse implicit metrics. When it is `'release'`, `step()` skips implicit per-tick metrics collection entirely. Use `stepWithResult()` when the caller explicitly wants structured runtime diagnostics.

#### `stepWithResult()`

```typescript
stepWithResult(): WorldStepResult
```

Advances the simulation by exactly one tick and returns a structured success/failure result instead of throwing on runtime failure. This is the preferred stepping API for AI loops and remote harnesses.

If the world is poisoned (a previous tick failed and `recover()` has not been called), `stepWithResult()` immediately returns `{ ok: false, failure: { code: 'world_poisoned', ... } }` without attempting another tick.

#### `isPoisoned()`

```typescript
isPoisoned(): boolean
```

Returns `true` while the world is in a post-failure poisoned state. Cleared by `recover()`. See Tick failure semantics.

#### `recover()`

```typescript
recover(): void
```

Clears the poison flag along with cached `lastTickFailure`, `currentDiff`, and `currentMetrics`. After `recover()` the world is safe to step again. The next successful tick uses a tick number one greater than the failed tick (failed ticks consume their tick number).

```typescript
try {
  world.step();
} catch (err) {
  if (err instanceof WorldTickFailureError) {
    console.error('tick failed:', err.failure);
    world.recover();
  }
}
world.step(); // safe again
```

#### `warnIfPoisoned(api)`

```typescript
warnIfPoisoned(api: string): void
```

Emits a `console.warn` once per poison cycle if the world is poisoned (a prior tick failed and `recover()` has not been called). The warning identifies which API surface the caller routed through (`api='submit'`, `api='serialize'`, `api='transaction'`, etc.) so log readers can correlate the warning with the offending call site. Subsequent calls within the same poison cycle are silent; once `recover()` clears the poison, the next `warnIfPoisoned` call after a future failure will warn again.

This is the integration point used by `submitWithResult`, `serialize`, and `CommandTransaction.commit` to surface "you forgot to recover" without blocking the call. Any new write surface should call this with its own `api` tag for consistency with the rest of the engine.

```typescript
world.warnIfPoisoned('myCustomCommand');
// → "myCustomCommand called on a poisoned world (last failure: 'system_threw' at tick 5). Call world.recover() to clear the poison flag."
```

#### `start()`

```typescript
start(): void
```

Begins the real-time loop. Ticks accumulate based on elapsed time and the configured TPS. Uses a fixed-timestep algorithm with spiral-of-death protection (controlled by `maxTicksPerFrame`).

```typescript
world.start(); // begins ticking at TPS rate
```

#### `stop()`

```typescript
stop(): void
```

Stops the real-time loop. The tick counter is preserved.

```typescript
world.stop();
```

#### `tick`

```typescript
get tick(): number
```

Read-only property returning the current tick count. Starts at `0`, increments by 1 after each tick.

```typescript
console.log(world.tick); // 0
world.step();
console.log(world.tick); // 1
```

#### `grid`

```typescript
readonly grid: SpatialGrid
```

Read-only reference to the spatial grid. Use `grid.getAt()` and `grid.getNeighbors()` to query spatial data. Do not call `grid.insert()`, `grid.remove()`, or `grid.move()` directly — the World handles spatial sync automatically.

### Speed Control

#### `setSpeed(multiplier)`

```typescript
setSpeed(multiplier: number): void
```

Sets the simulation speed multiplier for the real-time loop. `2` means ticks accumulate twice as fast. `0.5` means half speed. Has no effect on `step()`.

**Throws:** `Error` if `multiplier` is not a finite positive number (rejects `0`, negative, `NaN`, `Infinity`).

```typescript
world.setSpeed(2);    // double speed
world.setSpeed(0.5);  // half speed
```

#### `getSpeed()`

```typescript
getSpeed(): number
```

Returns the current speed multiplier. Default is `1`.

#### `pause()`

```typescript
pause(): void
```

Pauses the real-time loop. The speed multiplier is preserved. `step()` still works while paused.

#### `resume()`

```typescript
resume(): void
```

Resumes the real-time loop at the current speed multiplier. Resets the time accumulator to prevent a burst of ticks.

#### `isPaused`

```typescript
get isPaused(): boolean
```

Read-only property. `true` when the simulation is paused.

### Commands

Commands are validated-and-queued input from external code (AI agents, UI). They are processed at the start of each tick, before spatial sync and systems.

#### `submit<K>(type, data)`

```typescript
submit<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): boolean
```

Submits a command. All registered validators for this command type are run immediately (synchronously). If any validator rejects, the command is not queued.

**Returns:** `true` if the command passed all validators and was queued, `false` if rejected. This is the compatibility wrapper over `submitWithResult()`; the two paths produce identical observable outcomes (same validator pipeline, same `submissionSequence` assignment, same listener emissions). Use `submitWithResult()` when the caller wants the full structured `CommandSubmissionResult`.

```typescript
const accepted = world.submit('moveUnit', { entityId: 0, targetX: 5, targetY: 3 });
// accepted: true if validation passed
```

#### `submitWithResult<K>(type, data)`

```typescript
submitWithResult<K extends keyof TCommandMap>(
  type: K,
  data: TCommandMap[K],
): CommandSubmissionResult<K>
```

Submits a command and returns the full structured outcome.

```typescript
const result = world.submitWithResult('moveUnit', {
  entityId: 0,
  targetX: 5,
  targetY: 3,
});
```

#### `registerValidator<K>(type, fn)`

```typescript
registerValidator<K extends keyof TCommandMap>(
  type: K,
  fn: (
    data: TCommandMap[K],
    world: World<TEventMap, TCommandMap, TComponents, TState>,
  ) => CommandValidationResult,
): void
```

Adds a validator for a command type. Multiple validators can be registered per type — they short-circuit on the first `false` return.

```typescript
world.registerValidator('moveUnit', (data, w) => {
  return w.isAlive(data.entityId);
});
```

Validators may also return a structured rejection object:

```typescript
world.registerValidator('moveUnit', (data, w) => {
  if (!w.isAlive(data.entityId)) {
    return {
      code: 'dead_entity',
      message: 'Entity is not alive',
      details: { entityId: data.entityId },
    };
  }
  return true;
});
```

#### `registerHandler<K>(type, fn)`

```typescript
registerHandler<K extends keyof TCommandMap>(
  type: K,
  fn: (
    data: TCommandMap[K],
    world: World<TEventMap, TCommandMap, TComponents, TState>,
  ) => void,
): void
```

Sets the handler for a command type. Exactly one handler per type. The handler runs at tick start when commands are processed.

**Throws:** `Error` if a handler is already registered for this command type.

When a command is processed but no handler is registered, the tick fails with a structured `TickFailure`. `world.step()` surfaces that failure as `WorldTickFailureError`. `ClientAdapter` checks this ahead of time and rejects unhandled client commands before they enter the queue.

```typescript
world.registerHandler('moveUnit', (data, w) => {
  w.setPosition(data.entityId, { x: data.targetX, y: data.targetY });
});
```

#### `hasCommandHandler(type)`

```typescript
hasCommandHandler(type: keyof TCommandMap): boolean
```

Returns whether a handler is registered for the command type. This is primarily useful for transport adapters that need to reject unhandled commands before enqueueing them.

#### `onCommandResult(listener)`

```typescript
onCommandResult(
  listener: (result: CommandSubmissionResult<keyof TCommandMap>) => void,
): void
```

Subscribes to accepted and rejected command submission results.

#### `offCommandResult(listener)`

```typescript
offCommandResult(
  listener: (result: CommandSubmissionResult<keyof TCommandMap>) => void,
): void
```

Removes a command-result listener.

#### `onCommandExecution(listener)`

```typescript
onCommandExecution(
  listener: (result: CommandExecutionResult<keyof TCommandMap>) => void,
): void
```

Subscribes to tick-time command execution results.

#### `offCommandExecution(listener)`

```typescript
offCommandExecution(
  listener: (result: CommandExecutionResult<keyof TCommandMap>) => void,
): void
```

Removes a command-execution listener.

#### `onTickFailure(listener)`

```typescript
onTickFailure(listener: (failure: TickFailure) => void): void
```

Subscribes to structured tick failures.

#### `offTickFailure(listener)`

```typescript
offTickFailure(listener: (failure: TickFailure) => void): void
```

Removes a tick-failure listener.

### Events

Events are a typed pub/sub mechanism for system-to-system communication and external observation. Events are buffered per tick and cleared at the start of the next tick.

#### `emit<K>(type, data)`

```typescript
emit<K extends keyof TEventMap>(type: K, data: TEventMap[K]): void
```

Emits an event. The event is added to the tick buffer and all registered listeners are called immediately (synchronously).

```typescript
world.emit('unitDied', { entityId: 5, cause: 'starvation' });
```

#### `on<K>(type, listener)`

```typescript
on<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): void
```

Subscribes to an event type. The listener fires each time an event of this type is emitted.

```typescript
world.on('unitDied', (event) => {
  console.log(`Unit ${event.entityId} died from ${event.cause}`);
});
```

#### `off<K>(type, listener)`

```typescript
off<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): void
```

Unsubscribes from an event type. Pass the exact same function reference used in `on()`.

#### `getEvents()`

```typescript
getEvents(): ReadonlyArray<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>
```

Returns all events emitted during the current tick. The returned array is read-only. Cleared at the start of each tick.

```typescript
world.step();
for (const event of world.getEvents()) {
  console.log(event.type, event.data);
}
```

### Randomness

#### `random()`

```typescript
random(): number
```

Returns a deterministic pseudo-random number in `[0, 1)`. Worlds created with the same `seed` produce the same sequence, and snapshot version 3 stores the RNG state so `World.deserialize()` resumes from the exact next value.

```typescript
const world = new World({ gridWidth: 64, gridHeight: 64, tps: 10, seed: 'map-42' });
const roll = world.random();
```

### Resources

Resources are numeric pools (current/max) attached to entities with automatic production, consumption, and inter-entity transfers. Resource rates and transfers are processed after systems each tick.

#### `registerResource(key, options?)`

```typescript
registerResource(key: string, options?: { defaultMax?: number | null }): void
```

Registers a resource type. Must be called before using any resource methods with this key.

**Throws:** `Error` if the resource key is already registered.

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultMax` | `number \| null` | `null` | Default maximum capacity for new pools; `null` means unbounded |

```typescript
world.registerResource('food');
world.registerResource('gold', { defaultMax: 1000 });
```

#### `addResource(entity, key, amount)`

```typescript
addResource(entity: EntityId, key: string, amount: number): number
```

Adds to an entity's resource pool. Creates the pool if it doesn't exist (with the resource type's `defaultMax`). Clamped to the pool's maximum.

**Returns:** The amount actually added (may be less than requested if the pool is near max).

**Throws:** `Error` if the resource key is not registered, the entity is not alive, or `amount` is negative/non-finite.

```typescript
const added = world.addResource(city, 'food', 50); // returns 50 (or less if near cap)
```

#### `removeResource(entity, key, amount)`

```typescript
removeResource(entity: EntityId, key: string, amount: number): number
```

Removes from an entity's resource pool. Clamped to the current value (cannot go below 0).

**Returns:** The amount actually removed.

```typescript
const removed = world.removeResource(city, 'food', 30);
```

#### `getResource(entity, key)`

```typescript
getResource(entity: EntityId, key: string): { current: number; max: number | null } | undefined
```

Returns a copy of the resource pool for the given entity, or `undefined` if the entity has no pool for this resource.

```typescript
const pool = world.getResource(city, 'food');
if (pool) {
  console.log(`${pool.current}/${pool.max}`);
}
```

#### `setResourceMax(entity, key, max)`

```typescript
setResourceMax(entity: EntityId, key: string, max: number | null): void
```

Sets the maximum capacity for a resource pool. If `current` exceeds the new max, it is clamped down. Use `null` for unbounded capacity. No-op if the entity has no pool for this resource.

```typescript
world.setResourceMax(city, 'food', 200);
```

#### `setProduction(entity, key, rate)`

```typescript
setProduction(entity: EntityId, key: string, rate: number): void
```

Sets the per-tick production rate. A pool is auto-created if one doesn't exist. Set to `0` to remove the production rate.

```typescript
world.setProduction(farm, 'food', 5); // +5 food/tick
world.setProduction(farm, 'food', 0); // stop producing
```

#### `setConsumption(entity, key, rate)`

```typescript
setConsumption(entity: EntityId, key: string, rate: number): void
```

Sets the per-tick consumption rate. Does not auto-create a pool. Set to `0` to remove the consumption rate.

```typescript
world.setConsumption(city, 'food', 2); // -2 food/tick
```

#### `getProduction(entity, key)`

```typescript
getProduction(entity: EntityId, key: string): number
```

Returns the production rate for an entity/resource, or `0` if none set.

#### `getConsumption(entity, key)`

```typescript
getConsumption(entity: EntityId, key: string): number
```

Returns the consumption rate for an entity/resource, or `0` if none set.

#### `addTransfer(from, to, resource, rate)`

```typescript
addTransfer(from: EntityId, to: EntityId, resource: string, rate: number): number
```

Creates a recurring resource transfer. Each tick, up to `rate` units are moved from the source entity's pool to the destination entity's pool (clamped by source availability and destination capacity).

Transfers involving dead entities are automatically removed during tick processing.

**Returns:** A unique transfer ID (for later removal with `removeTransfer`).

```typescript
const transferId = world.addTransfer(farm, city, 'food', 3); // 3 food/tick
```

#### `removeTransfer(id)`

```typescript
removeTransfer(id: number): void
```

Removes a transfer by its ID.

```typescript
world.removeTransfer(transferId);
```

#### `getTransfers(entity)`

```typescript
getTransfers(entity: EntityId): Array<{
  id: number;
  from: EntityId;
  to: EntityId;
  resource: string;
  rate: number;
}>
```

Returns all transfers that involve the given entity (as source or destination).

#### `getResourceEntities(key)`

```typescript
*getResourceEntities(key: string): IterableIterator<EntityId>
```

Iterates all entities that have a pool for this resource.

```typescript
for (const id of world.getResourceEntities('food')) {
  const pool = world.getResource(id, 'food')!;
  console.log(`Entity ${id}: ${pool.current} food`);
}
```

### World State

Non-entity structured state stored at the world level. Values must be JSON-compatible. World state is included in serialization (snapshot v5) and tick diffs.

#### `setState(key, value)`

```typescript
setState(key: string, value: unknown): void
```

Stores a world-level state value under the given key. Overwrites any existing value for that key. The value must be JSON-compatible.

```typescript
world.setState('turnNumber', 1);
world.setState('diplomacy', { alliances: [], wars: [] });
```

#### `getState(key)`

```typescript
getState(key: string): unknown
```

Retrieves a world-level state value by key, or `undefined` if the key does not exist.

```typescript
const turn = world.getState('turnNumber'); // 1
```

#### `deleteState(key)`

```typescript
deleteState(key: string): void
```

Removes a world-level state entry. No-op if the key does not exist.

```typescript
world.deleteState('diplomacy');
```

#### `hasState(key)`

```typescript
hasState(key: string): boolean
```

Returns `true` if the world has a state entry for the given key.

```typescript
if (world.hasState('turnNumber')) {
  // ...
}
```

### Tags & Metadata

String tags and key-value metadata attached to individual entities. Both are cleaned up automatically on `destroyEntity()` and included in serialization (snapshot v5) and tick diffs.

#### `addTag(entity, tag)`

```typescript
addTag(entity: EntityId, tag: string): void
```

Adds a string label to an entity. No-op if the entity already has the tag.

```typescript
world.addTag(unit, 'selected');
world.addTag(unit, 'military');
```

#### `removeTag(entity, tag)`

```typescript
removeTag(entity: EntityId, tag: string): void
```

Removes a tag from an entity. No-op if the entity does not have the tag.

```typescript
world.removeTag(unit, 'selected');
```

#### `hasTag(entity, tag)`

```typescript
hasTag(entity: EntityId, tag: string): boolean
```

Returns `true` if the entity has the given tag.

```typescript
if (world.hasTag(unit, 'military')) {
  // ...
}
```

#### `getByTag(tag)`

```typescript
getByTag(tag: string): ReadonlySet<EntityId>
```

Returns all entities that have the given tag. The returned set is read-only.

```typescript
for (const id of world.getByTag('military')) {
  // process each military entity
}
```

#### `getTags(entity)`

```typescript
getTags(entity: EntityId): ReadonlySet<string>
```

Returns all tags for an entity. The returned set is read-only.

```typescript
const tags = world.getTags(unit); // ReadonlySet<string>
```

#### `setMeta(entity, key, value)`

```typescript
setMeta(entity: EntityId, key: string, value: string | number): void
```

Sets a metadata key-value pair on an entity. Metadata values are restricted to `string` or `number`.

```typescript
world.setMeta(unit, 'owner', 'player1');
world.setMeta(unit, 'level', 3);
```

#### `getMeta(entity, key)`

```typescript
getMeta(entity: EntityId, key: string): string | number | undefined
```

Returns the metadata value for the given entity and key, or `undefined` if not set.

```typescript
const owner = world.getMeta(unit, 'owner'); // 'player1'
```

#### `deleteMeta(entity, key)`

```typescript
deleteMeta(entity: EntityId, key: string): void
```

Removes a metadata entry from an entity. No-op if the key does not exist.

```typescript
world.deleteMeta(unit, 'owner');
```

#### `getByMeta(key, value)`

```typescript
getByMeta(key: string, value: string | number): EntityId | undefined
```

Reverse lookup: finds the entity that has the given metadata key-value pair. Returns `undefined` if no entity matches.

```typescript
const player1Unit = world.getByMeta('owner', 'player1');
```

### Spatial Queries

Higher-level spatial query helpers built on top of the spatial grid and component stores.

#### `queryInRadius(cx, cy, radius, ...components)`

```typescript
queryInRadius(
  cx: number,
  cy: number,
  radius: number,
  ...components: string[]
): EntityId[]
```

Returns all entities within the given radius of `(cx, cy)` that match all specified components. Uses Euclidean distance.

```typescript
const nearby = world.queryInRadius(10, 10, 5, 'position', 'health');
```

#### `findNearest(cx, cy, ...components)`

```typescript
findNearest(
  cx: number,
  cy: number,
  ...components: string[]
): EntityId | undefined
```

Returns the closest entity to `(cx, cy)` that matches all specified components, or `undefined` if no entity matches. Uses Euclidean distance.

```typescript
const closest = world.findNearest(10, 10, 'position', 'enemy');
```

### State Serialization

#### `serialize(options?)`

```typescript
serialize(options?: { inspectPoisoned?: boolean }): WorldSnapshot
```

Captures the entire world state as a JSON-serializable snapshot. Includes entity state, all component data, resource state, grid config, and tick count. Does **not** include systems, validators, handlers, or event listeners (they are functions). Component data and state values are `structuredClone`d on the way out so the returned snapshot stays isolated from the live world.

When called on a poisoned world, `serialize()` emits a one-time `console.warn` per poison cycle. Pass `{ inspectPoisoned: true }` to suppress the warning — intended for engine-internal debug/history tooling that exists specifically to inspect poisoned state. The warning resets on `world.recover()`.

```typescript
const snapshot = world.serialize();
const json = JSON.stringify(snapshot);
```

#### `World.deserialize(snapshot, systems?)`

```typescript
static deserialize<TEventMap, TCommandMap, TComponents, TState>(
  snapshot: WorldSnapshot,
  systems?: Array<
    | System<TEventMap, TCommandMap, TComponents, TState>
    | SystemRegistration<TEventMap, TCommandMap, TComponents, TState>
    | LooseSystem
    | LooseSystemRegistration
  >,
): World<TEventMap, TCommandMap, TComponents, TState>
```

Restores a world from a snapshot. Optionally accepts systems to re-register. After deserializing, you must also re-register:
- Command validators and handlers
- Event listeners
- Destroy callbacks

Component data and state values are `structuredClone`d on read so the input snapshot stays isolated from the live world.

**Throws:**
- `Error` if `snapshot.version` is not `1`, `2`, `3`, `4`, or `5`
- `Error` if entity state arrays have mismatched lengths
- `Error` if `snapshot.tags` or `snapshot.metadata` references a dead entity id

Version 1 snapshots load with an empty resource store. Version 2 snapshots restore resource registrations, pools, rates, transfers, and the next transfer ID. Version 3 snapshots also restore deterministic RNG state. Version 4 snapshots also restore world-level state, entity tags, and entity metadata. Version 5 snapshots additionally round-trip per-component `ComponentStoreOptions` (`diffMode`) plus `WorldConfig.maxTicksPerFrame` and `WorldConfig.instrumentationProfile` when non-default.

```typescript
const restored = World.deserialize(snapshot, [movementSystem, combatSystem]);
restored.registerValidator('moveUnit', validator);
restored.registerHandler('moveUnit', handler);
```

### State Diffs

#### `getDiff()`

```typescript
getDiff(): TickDiff | null
```

Returns the diff from the most recent tick, or `null` if no tick has been executed yet. The diff is rebuilt each tick.

```typescript
world.step();
const diff = world.getDiff();
if (diff) {
  console.log(`Created: ${diff.entities.created}`);
  console.log(`Destroyed: ${diff.entities.destroyed}`);
}
```

#### `getMetrics()`

```typescript
getMetrics(): WorldMetrics | null
```

Returns timing and count instrumentation from the most recent tick, or `null` before the first tick. Metrics include simulation budget data, last-tick command counts, entity/component counts, query cache hit/miss counts, the per-tick `spatial.explicitSyncs` count (incremented by every `setPosition`-style write), system timings, and tick section timings.

In `instrumentationProfile: 'minimal'`, implicit `step()` still updates counts and total duration, but leaves detailed phase timings and per-system timing entries empty. In `instrumentationProfile: 'release'`, implicit `step()` leaves this as `null` so the shipping runtime does not pay for per-tick metrics. Explicit `stepWithResult()` calls still populate the full metrics payload for callers that deliberately opt into richer diagnostics.

```typescript
world.step();
const metrics = world.getMetrics();
console.log(metrics?.query.cacheHits, metrics?.durationMs.total);
```

#### `getInstrumentationProfile()`

```typescript
getInstrumentationProfile(): InstrumentationProfile
```

Returns the active instrumentation profile for this `World`.

#### `getLastTickFailure()`

```typescript
getLastTickFailure(): TickFailure | null
```

Returns the most recent structured tick failure, or `null` if no tick has failed yet.

#### `onDiff(fn)`

```typescript
onDiff(fn: (diff: TickDiff) => void): void
```

Subscribes to per-tick diffs. The callback fires at the end of each tick, after systems and resource processing.

```typescript
world.onDiff((diff) => {
  // send to client, log, etc.
});
```

#### `offDiff(fn)`

```typescript
offDiff(fn: (diff: TickDiff) => void): void
```

Unsubscribes from diffs. Pass the exact same function reference used in `onDiff()`.

### Entity Lifecycle Hooks

#### `onDestroy(callback)`

```typescript
onDestroy(
  callback: (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
): void
```

Registers a callback that fires when any entity is destroyed, **before** its components are removed. This allows cleanup logic (e.g., removing references from other entities).

Multiple callbacks can be registered. They fire in registration order.

```typescript
world.onDestroy((id, w) => {
  // Entity still has its components here
  const owner = w.getComponent<{ ownerId: EntityId }>(id, 'owned');
  if (owner) {
    // clean up reference on the owner entity
  }
});
```

#### `offDestroy(callback)`

```typescript
offDestroy(
  callback: (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
): void
```

Unregisters a destroy callback. Pass the exact same function reference used in `onDestroy()`.

---

## SpatialGrid

A sparse occupied-cell grid that tracks which entities are at each cell. The World automatically syncs entity positions to the grid. You should **read** from the grid but not write to it directly.

```typescript
import { SpatialGrid, ORTHOGONAL, DIAGONAL, ALL_DIRECTIONS } from 'civ-engine';
```

### Properties

| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |

### Methods

#### `getAt(x, y)`

```typescript
getAt(x: number, y: number): ReadonlySet<EntityId> | null
```

Returns the set of entities at a cell, or `null` if no entity is there. The returned set is read-only.

**Throws:** `RangeError` if `(x, y)` is out of bounds.

```typescript
const entities = world.grid.getAt(5, 3);
if (entities) {
  for (const id of entities) {
    console.log(`Entity ${id} is at (5, 3)`);
  }
}
```

#### `getNeighbors(x, y, offsets?)`

```typescript
getNeighbors(x: number, y: number, offsets?: ReadonlyArray<[number, number]>): EntityId[]
```

Returns all entities in neighboring cells. Automatically skips out-of-bounds cells.

**Throws:** `RangeError` if `(x, y)` is out of bounds.

| Parameter | Default | Description |
|---|---|---|
| `offsets` | `ORTHOGONAL` | Direction offsets to check |

```typescript
// 4 orthogonal neighbors (default)
const nearby = world.grid.getNeighbors(5, 3);

// 8 directions (orthogonal + diagonal)
const allNearby = world.grid.getNeighbors(5, 3, ALL_DIRECTIONS);

// Only diagonal
const diag = world.grid.getNeighbors(5, 3, DIAGONAL);
```

### Direction Constants

| Constant | Directions | Count |
|---|---|---|
| `ORTHOGONAL` | Up, Down, Left, Right | 4 |
| `DIAGONAL` | Up-Left, Up-Right, Down-Left, Down-Right | 4 |
| `ALL_DIRECTIONS` | All 8 | 8 |

Each constant is `ReadonlyArray<[number, number]>` of `[dx, dy]` offsets.

---

## Pathfinding

Generic A* pathfinding on any graph topology. Standalone utility with no dependency on World or SpatialGrid.

```typescript
import { findPath, type PathConfig, type PathResult } from 'civ-engine';
```

### `findPath<T>(config)`

```typescript
findPath<T>(config: PathConfig<T>): PathResult<T> | null
```

Finds the shortest path from `start` to `goal` using A*.

**Returns:** `PathResult<T>` with the path and cost, or `null` if no path exists, the cost ceiling is exceeded, or the iteration limit is reached.

**Behavior details:**
- If `start === goal` (by hash), returns immediately with `{ path: [start], cost: 0 }`
- Edges with `Infinity` cost are treated as impassable and skipped
- Uses an internal min-heap for the open set
- `maxCost` terminates early if the best known cost exceeds it
- `maxIterations` prevents infinite loops on large graphs (default: 10,000)

**Grid pathfinding example:**

```typescript
const WIDTH = 32;
const HEIGHT = 32;

const result = findPath<number>({
  start: 0,         // top-left corner
  goal: WIDTH * HEIGHT - 1,  // bottom-right corner
  neighbors: (node) => {
    const x = node % WIDTH;
    const y = Math.floor(node / WIDTH);
    const result: number[] = [];
    if (x > 0) result.push(node - 1);
    if (x < WIDTH - 1) result.push(node + 1);
    if (y > 0) result.push(node - WIDTH);
    if (y < HEIGHT - 1) result.push(node + WIDTH);
    return result;
  },
  cost: () => 1,
  heuristic: (node, goal) => {
    return Math.abs((node % WIDTH) - (goal % WIDTH))
         + Math.abs(Math.floor(node / WIDTH) - Math.floor(goal / WIDTH));
  },
  hash: (node) => node,
  maxCost: 100,
  trackExplored: true,
});

if (result) {
  console.log(`Path: ${result.path.length} steps, cost: ${result.cost}`);
  console.log(`Explored: ${result.explored} nodes`);
}
```

**Graph pathfinding example (non-grid):**

```typescript
interface City { name: string; x: number; y: number }

const cities: Record<string, City> = {
  A: { name: 'A', x: 0, y: 0 },
  B: { name: 'B', x: 3, y: 4 },
  C: { name: 'C', x: 10, y: 0 },
};

const roads: Record<string, string[]> = {
  A: ['B', 'C'],
  B: ['A', 'C'],
  C: ['A', 'B'],
};

const result = findPath<string>({
  start: 'A',
  goal: 'C',
  neighbors: (city) => roads[city] ?? [],
  cost: (from, to) => {
    const a = cities[from];
    const b = cities[to];
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  },
  heuristic: (city, goal) => {
    const a = cities[city];
    const b = cities[goal];
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  },
  hash: (city) => city,
});
```

---

## OccupancyGrid

Deterministic blocked-cell, footprint, occupancy, and reservation tracking. Standalone utility that answers "can something stand here?" rather than "who is nearby?".

```typescript
import {
  OccupancyGrid,
  type OccupancyArea,
  type OccupancyGridMetrics,
  type OccupancyGridState,
  type OccupancyQueryOptions,
  type OccupancyRect,
} from 'civ-engine';
```

### Constructor

```typescript
new OccupancyGrid(width: number, height: number)
```

Creates an empty occupancy model for a fixed grid size.

| Parameter | Description |
|---|---|
| `width` | Positive integer grid width |
| `height` | Positive integer grid height |

### Properties

| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |
| `version` | `number` | Monotonic passability version incremented on mutations |

### Methods

#### `setBlocked(area, blocked)`

```typescript
setBlocked(area: OccupancyArea, blocked: boolean): void
```

Sets blocked status for a footprint or list of cells. Throws if a blocked write would overlap an occupied or reserved cell.

#### `block(area)`

```typescript
block(area: OccupancyArea): void
```

Marks cells as blocked.

#### `unblock(area)`

```typescript
unblock(area: OccupancyArea): void
```

Clears blocked cells.

#### `isBlocked(x, y, options?)`

```typescript
isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean
```

Returns `true` if the cell is blocked, occupied by another entity, or reserved by another entity.

#### `canOccupy(entity, area, options?)`

```typescript
canOccupy(
  entity: EntityId,
  area: OccupancyArea,
  options?: { includeReservations?: boolean },
): boolean
```

Checks whether an entity may claim a footprint as occupied.

#### `occupy(entity, area)`

```typescript
occupy(entity: EntityId, area: OccupancyArea): boolean
```

Claims a footprint for an entity. Returns `false` on conflict instead of throwing.

#### `canReserve(entity, area)`

```typescript
canReserve(entity: EntityId, area: OccupancyArea): boolean
```

Checks whether an entity may reserve a footprint.

#### `reserve(entity, area)`

```typescript
reserve(entity: EntityId, area: OccupancyArea): boolean
```

Creates or replaces a reservation for an entity. Returns `false` on conflict.

#### `clearReservation(entity)`

```typescript
clearReservation(entity: EntityId): void
```

Clears only the reservation owned by the entity.

#### `release(entity)`

```typescript
release(entity: EntityId): void
```

Clears both occupancy and reservation state for an entity.

#### `getOccupant(x, y)`

```typescript
getOccupant(x: number, y: number): EntityId | null
```

Returns the entity occupying a cell, or `null`.

#### `getReservationOwner(x, y)`

```typescript
getReservationOwner(x: number, y: number): EntityId | null
```

Returns the entity reserving a cell, or `null`.

#### `getOccupiedCells(entity)`

```typescript
getOccupiedCells(entity: EntityId): Position[]
```

Returns the claimed occupied cells for an entity as positions.

#### `getReservedCells(entity)`

```typescript
getReservedCells(entity: EntityId): Position[]
```

Returns the claimed reserved cells for an entity as positions.

#### `getMetrics()`

```typescript
getMetrics(): OccupancyGridMetrics
```

Returns runtime scan counters for blocking checks, footprint claims, and snapshot reads.

#### `resetMetrics()`

```typescript
resetMetrics(): void
```

Clears all accumulated `OccupancyGrid` counters without affecting occupancy state or `version`.

#### `getState()`

```typescript
getState(): OccupancyGridState
```

Returns a JSON-safe deterministic snapshot of the occupancy model.

#### `OccupancyGrid.fromState(state)`

```typescript
OccupancyGrid.fromState(state: OccupancyGridState): OccupancyGrid
```

Restores an occupancy model from serialized state.

---

## OccupancyBinding

Higher-level occupancy ownership built on top of `OccupancyGrid` and optional `SubcellOccupancyGrid`. Use it when game code wants blocker metadata, destroy-time cleanup hooks, a `GridPassability` surface for `findGridPath()`, and measurable occupancy counters in one object.

```typescript
import {
  OccupancyBinding,
  type OccupancyBindingClaimOptions,
  type OccupancyBindingMetrics,
  type OccupancyBindingOptions,
  type OccupancyBindingSubcellOptions,
  type OccupancyCellStatus,
} from 'civ-engine';
```

### Constructor

```typescript
new OccupancyBinding(
  width: number,
  height: number,
  options?: OccupancyBindingOptions,
)
```

Creates a higher-level occupancy surface for a fixed grid size.

### Properties

| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |
| `version` | `number` | Monotonic passability version incremented on binding-level mutations |

### Methods

#### `attachWorld(world)`

```typescript
attachWorld(world: OccupancyBindingWorldHooks): void
```

Registers destroy-time cleanup so tracked claims are released automatically when entities die.

#### `detachWorld()`

```typescript
detachWorld(): void
```

Removes the currently attached destroy hook source, if any.

#### `block(area, options?)`

```typescript
block(area: OccupancyArea, options?: OccupancyBindingClaimOptions): void
```

Marks cells as blocked and records blocker metadata such as `terrain`. Throws if any targeted cell still contains crowded sub-cell occupants.

#### `unblock(area)`

```typescript
unblock(area: OccupancyArea): void
```

Clears blocked cells and any stored static blocker metadata for them.

#### `occupy(entity, area, options?)`

```typescript
occupy(
  entity: EntityId,
  area: OccupancyArea,
  options?: OccupancyBindingClaimOptions,
): boolean
```

Claims a whole-cell footprint and records metadata such as `building`, `resource`, or `unit`.

#### `reserve(entity, area, options?)`

```typescript
reserve(
  entity: EntityId,
  area: OccupancyArea,
  options?: OccupancyBindingClaimOptions,
): boolean
```

Creates or replaces a reservation with optional blocker metadata. Returns `false` if the requested cells are blocked, claimed, or still occupied by crowded sub-cell units.

#### `clearReservation(entity)`

```typescript
clearReservation(entity: EntityId): void
```

Clears only the reservation state for the entity.

#### `isBlocked(x, y, options?)`

```typescript
isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean
```

Implements `GridPassability` across both owned whole-cell occupancy and sub-cell crowding. Fully crowded cells are treated as blocked for path queries.

#### `canOccupySubcell(entity, position, options?)`

```typescript
canOccupySubcell(
  entity: EntityId,
  position: Position,
  options?: OccupancyBindingSubcellOptions,
): boolean
```

Checks whether the entity can claim at least one slot in the target cell.

#### `bestSubcellPlacement(entity, position, options?)`

```typescript
bestSubcellPlacement(
  entity: EntityId,
  position: Position,
  options?: OccupancyBindingSubcellOptions,
): SubcellPlacement | null
```

Returns the best available sub-cell placement for the entity.

#### `occupySubcell(entity, position, options?)`

```typescript
occupySubcell(
  entity: EntityId,
  position: Position,
  options?: OccupancyBindingSubcellOptions,
): SubcellPlacement | null
```

Claims the best available sub-cell slot and records metadata such as `unit`.

#### `neighborsWithSpace(entity, origin, options?)`

```typescript
neighborsWithSpace(
  entity: EntityId,
  origin: Position,
  options?: OccupancyBindingSubcellOptions,
): SubcellNeighborSpace[]
```

Returns neighboring cells with room for the entity, along with free-slot counts and the best placement in each cell.

#### `release(entity)`

```typescript
release(entity: EntityId): void
```

Clears all whole-cell, reservation, and sub-cell claims owned by the entity.

#### `getCellStatus(x, y, options?)`

```typescript
getCellStatus(
  x: number,
  y: number,
  options?: OccupancyQueryOptions,
): OccupancyCellStatus
```

Returns combined `blockedBy` and `crowdedBy` metadata for the cell. `blocked` is `true` when either a whole-cell blocker exists or no sub-cell slots remain for the query.

#### `getMetrics()`

```typescript
getMetrics(): OccupancyBindingMetrics
```

Returns aggregate binding, whole-cell, and crowding scan counters.

#### `resetMetrics()`

```typescript
resetMetrics(): void
```

Clears all accumulated binding and owned-grid counters without affecting occupancy state or `version`.

---

## SubcellOccupancyGrid

Deterministic slot-based crowding for units smaller than a full integer cell. Use it alongside `OccupancyGrid` when whole-cell blockers and smaller-than-cell unit packing need to stay separate.

```typescript
import {
  SubcellOccupancyGrid,
  type SubcellNeighborOptions,
  type SubcellNeighborSpace,
  type SubcellOccupancyGridMetrics,
  type SubcellOccupancyGridOptions,
  type SubcellOccupancyGridState,
  type SubcellOccupancyOptions,
  type SubcellPlacement,
  type SubcellSlotOffset,
} from 'civ-engine';
```

### Constructor

```typescript
new SubcellOccupancyGrid(
  width: number,
  height: number,
  options?: SubcellOccupancyGridOptions,
)
```

Creates a slot-based crowding model for a fixed grid size.

| Parameter | Description |
|---|---|
| `width` | Positive integer grid width |
| `height` | Positive integer grid height |
| `options` | Optional custom slot layout and whole-cell blocker callback |

### Properties

| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |
| `slots` | `ReadonlyArray<SubcellSlotOffset>` | Slot offsets used inside each cell |
| `version` | `number` | Monotonic crowding version incremented on mutations |

### Methods

#### `canOccupy(entity, position, options?)`

```typescript
canOccupy(
  entity: EntityId,
  position: Position,
  options?: SubcellOccupancyOptions,
): boolean
```

Checks whether the entity can claim at least one slot in the target cell.

#### `bestSlotForUnit(entity, position, options?)`

```typescript
bestSlotForUnit(
  entity: EntityId,
  position: Position,
  options?: SubcellOccupancyOptions,
): SubcellPlacement | null
```

Returns the best available slot for the entity in that cell, or `null` if the cell is blocked or full.

#### `occupy(entity, position, options?)`

```typescript
occupy(
  entity: EntityId,
  position: Position,
  options?: SubcellOccupancyOptions,
): SubcellPlacement | null
```

Claims the best available slot for an entity and returns the resolved placement. Returns `null` on conflict instead of throwing.

#### `release(entity)`

```typescript
release(entity: EntityId): void
```

Clears the slot assignment for an entity.

#### `getSlotOccupant(x, y, slot)`

```typescript
getSlotOccupant(x: number, y: number, slot: number): EntityId | null
```

Returns the entity occupying a specific slot in a cell, or `null`.

#### `getOccupiedPlacement(entity)`

```typescript
getOccupiedPlacement(entity: EntityId): SubcellPlacement | null
```

Returns the current slot assignment for an entity, or `null`.

#### `neighborsWithSpace(entity, origin, options?)`

```typescript
neighborsWithSpace(
  entity: EntityId,
  origin: Position,
  options?: SubcellNeighborOptions,
): SubcellNeighborSpace[]
```

Returns neighboring cells that still have room for the entity, along with free-slot counts and the best slot in each cell.

#### `getState()`

```typescript
getState(): SubcellOccupancyGridState
```

Returns a JSON-safe deterministic snapshot of the crowding model.

#### `getMetrics()`

```typescript
getMetrics(): SubcellOccupancyGridMetrics
```

Returns runtime slot-scan and crowding-query counters.

#### `resetMetrics()`

```typescript
resetMetrics(): void
```

Clears all accumulated `SubcellOccupancyGrid` counters without affecting occupancy state or `version`.

#### `SubcellOccupancyGrid.fromState(state, options?)`

```typescript
SubcellOccupancyGrid.fromState(
  state: SubcellOccupancyGridState,
  options?: Omit<SubcellOccupancyGridOptions, 'slots'>,
): SubcellOccupancyGrid
```

Restores a crowding model from serialized state. The slot layout comes from the snapshot; `options` can supply a fresh `isCellBlocked` callback.

---

## Path Service

Grid-first path utilities and deterministic request processing built on top of the generic `findPath()` implementation.

```typescript
import {
  PathCache,
  PathRequestQueue,
  createGridPathCacheKey,
  createGridPathQueue,
  findGridPath,
  gridPathPassabilityVersion,
  type GridPathConfig,
  type GridPathRequest,
  type PathRequestQueueEntry,
  type PathRequestQueueOptions,
  type PathRequestQueueStats,
} from 'civ-engine';
```

### `findGridPath(config)`

```typescript
findGridPath(config: GridPathConfig): PathResult<Position> | null
```

Finds a path on a 2D grid using integer `Position` coordinates.

**Behavior details:**
- Requires either `width` and `height`, or an `occupancy` grid
- Treats blocked occupancy cells as impassable
- Uses orthogonal movement by default
- Uses diagonal movement with octile heuristic when `allowDiagonal` is `true`
- Prevents diagonal corner cutting by default
- Returns positions instead of flat cell indices

```typescript
const result = findGridPath({
  occupancy,
  movingEntity: unitId,
  start: { x: 12, y: 8 },
  goal: { x: 40, y: 25 },
  allowDiagonal: false,
});
```

### `PathCache<TResult>`

Reusable cache keyed by request identity and passability version.

#### Constructor

```typescript
new PathCache<TResult>()
```

#### Methods

```typescript
get(key: string, version: number): TResult | undefined
set(key: string, version: number, result: TResult): void
clear(): void
delete(key: string): void
```

#### Property

```typescript
size: number
```

### `PathRequestQueue<TRequest, TResult>`

Deterministic FIFO queue for spreading expensive request resolution across ticks.

#### Constructor

```typescript
new PathRequestQueue<TRequest, TResult>(
  options: PathRequestQueueOptions<TRequest, TResult>,
)
```

#### Methods

##### `enqueue(request)`

```typescript
enqueue(request: TRequest): number
```

Adds a request and returns its queue ID.

##### `process(maxRequests?)`

```typescript
process(maxRequests?: number): Array<PathRequestQueueEntry<TRequest, TResult>>
```

Processes up to `maxRequests` queued items in FIFO order. Defaults to `1`.

##### `clearPending()`

```typescript
clearPending(): void
```

Drops requests that have not been processed yet.

##### `clearCache()`

```typescript
clearCache(): void
```

Clears cached resolved results.

##### `getStats()`

```typescript
getStats(): PathRequestQueueStats
```

Returns queue and cache counters.

#### Property

##### `pendingCount`

```typescript
pendingCount: number
```

Number of requests still waiting to be processed.

### `createGridPathQueue(defaults?)`

```typescript
createGridPathQueue(
  defaults?: Omit<Partial<GridPathRequest>, 'start' | 'goal'>,
): PathRequestQueue<GridPathRequest, PathResult<Position> | null>
```

Creates a `PathRequestQueue` specialized for `findGridPath()`, with automatic cache-key generation and passability-version tracking.

### `createGridPathCacheKey(request)`

```typescript
createGridPathCacheKey(request: GridPathRequest): string | undefined
```

Builds the default cache key used by `createGridPathQueue()`. The generated key includes `movingEntity` so ignore-self passability queries do not reuse another entity's cached route. Returns `undefined` when the request contains custom `blocked`, `cost`, or `heuristic` functions and no explicit `cacheKey` is supplied.

### `gridPathPassabilityVersion(request)`

```typescript
gridPathPassabilityVersion(request: GridPathRequest): number
```

Returns the passability version used for cache invalidation. Defaults to `request.passabilityVersion`, then `request.occupancy?.version`, then `0`.

---

## VisibilityMap

Per-player visible and explored cell tracking for fog-of-war style systems. Standalone utility with no renderer dependency.

```typescript
import {
  VisibilityMap,
  type VisibilityMapState,
  type VisibilityPlayerId,
  type VisionSource,
  type VisionSourceId,
} from 'civ-engine';
```

### Constructor

```typescript
new VisibilityMap(width: number, height: number)
```

Creates an empty visibility state for a fixed grid size.

### Properties

| Property | Type | Description |
|---|---|---|
| `width` | `number` | Grid width (read-only) |
| `height` | `number` | Grid height (read-only) |

### Methods

#### `setSource(playerId, sourceId, source)`

```typescript
setSource(
  playerId: VisibilityPlayerId,
  sourceId: VisionSourceId,
  source: VisionSource,
): void
```

Adds or updates a circular vision source for one player.

#### `removeSource(playerId, sourceId)`

```typescript
removeSource(playerId: VisibilityPlayerId, sourceId: VisionSourceId): void
```

Removes one source from a player's visibility state.

#### `clearPlayer(playerId)`

```typescript
clearPlayer(playerId: VisibilityPlayerId): void
```

Removes all visibility state for one player.

#### `update()`

```typescript
update(): void
```

Recomputes visibility for players with dirty sources.

#### `isVisible(playerId, x, y)`

```typescript
isVisible(playerId: VisibilityPlayerId, x: number, y: number): boolean
```

Returns `true` if a cell is currently visible to the player.

#### `isExplored(playerId, x, y)`

```typescript
isExplored(playerId: VisibilityPlayerId, x: number, y: number): boolean
```

Returns `true` if a cell has ever been visible to the player.

#### `getVisibleCells(playerId)`

```typescript
getVisibleCells(playerId: VisibilityPlayerId): Position[]
```

Returns current visible cells as positions.

#### `getExploredCells(playerId)`

```typescript
getExploredCells(playerId: VisibilityPlayerId): Position[]
```

Returns explored cells as positions.

#### `getSources(playerId)`

```typescript
getSources(playerId: VisibilityPlayerId): Array<[VisionSourceId, VisionSource]>
```

Returns the player's current sources in deterministic order.

#### `getState()`

```typescript
getState(): VisibilityMapState
```

Returns a JSON-safe visibility snapshot.

#### `VisibilityMap.fromState(state)`

```typescript
VisibilityMap.fromState(state: VisibilityMapState): VisibilityMap
```

Restores a visibility map from serialized state.

---

## Command Transaction

Atomic propose-validate-commit-or-abort builder over `World`. Buffers proposed mutations, events, and precondition predicates; on `commit()` either applies everything (preconditions passed) or applies nothing (any precondition failed). v1 surface: components, position, events, resources. Inspired by MicropolisCore's `ToolEffects` (`MicropolisEngine/src/tool.h:171`).

```typescript
import { CommandTransaction, type TransactionResult } from 'civ-engine';
```

### `world.transaction()`

```typescript
transaction(): CommandTransaction<TEventMap, TCommandMap, TComponents, TState>
```

Creates a fresh transaction bound to this world. The returned transaction inherits all four of the world's generics, so typed component / state / event access works inside the transaction the same way it works against `world.setComponent` / `world.emit` directly. `world.transaction().setComponent(e, 'hp', { wrong: 5 })` against `World<..., ..., { hp: { current: number } }, ...>` is a TypeScript error matching `world.setComponent`.

### Builder methods (chainable, return `this`)

| Method | Buffers |
|---|---|
| `setComponent(entity, key, data)` | A `setComponent` mutation |
| `addComponent(entity, key, data)` | Alias for `setComponent` (matches `World.addComponent`) |
| `patchComponent(entity, key, patch)` | A `patchComponent` mutation; `patch` runs at commit time against current state |
| `removeComponent(entity, key)` | A `removeComponent` mutation |
| `setPosition(entity, position, key?)` | A `setPosition` mutation; `key` defaults to the world's `positionKey` |
| `addResource(entity, resource, amount)` | An `addResource` mutation |
| `removeResource(entity, resource, amount)` | A `removeResource` mutation |
| `emit(type, data)` | A buffered event; emitted via `EventBus` only on successful commit |
| `require(predicate)` | A precondition; `predicate(world)` runs before any mutation applies |

All builder methods throw if the transaction has already been committed or aborted.

### Preconditions

```typescript
type TransactionPrecondition<TEventMap, TCommandMap, TComponents, TState> =
  (world: ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState>)
    => true | false | string;
```

A predicate receives a **read-only façade** of the world and must return one of:

- `true` — pass
- `false` — fail (rejection reason: `"precondition returned false"`)
- a `string` — fail (rejection reason: the string)

`ReadOnlyTransactionWorld` is `Omit<World, K>` where `K` is the exhaustive `FORBIDDEN_PRECONDITION_METHODS` array. Every public mutation, lifecycle, listener-subscription, RNG, and sub-engine method on `World` is excluded — including `random` (because it advances `DeterministicRandom.state`), `setProduction` / `setConsumption` / `setResourceMax`, `start` / `stop` / `pause` / `resume` / `setSpeed`, every `on*` / `off*` listener subscription, and `warnIfPoisoned` (consumes the warn-once latch). Predicates may freely call read methods (`getComponent`, `hasResource`, `getState`, `getInRadius`, `findNearest`, `getByTag`, etc.). Three structurally-different mechanisms enforce side-effect freedom:

1. **Method-name denylist.** Calling a forbidden method fails to typecheck; if the type is cast away, the runtime proxy throws `CommandTransaction precondition cannot call '<method>': preconditions must be side-effect free`. A property-based meta-test cross-checks `FORBIDDEN_PRECONDITION_METHODS` against `Object.getOwnPropertyNames(World.prototype)` so future World additions can't slip past silently.
2. **Clone-on-read for live-reference returns.** `getComponent`, `getComponents`, `getState`, `getResource`, `getTags`, `getByTag`, and `getEvents` return values that point into engine-owned storage. The proxy `structuredClone`s their results before the predicate sees them, so a predicate that mutates a returned object — e.g. `w.getComponent(e, 'hp')!.current = 0` — operates on a defensive copy and the live state stays untouched.
3. **Frozen sub-objects.** `world.grid` is the only public field that is a sub-object rather than a prototype method. It is `Object.freeze`d in the constructor, so monkey-patching `w.grid.getAt = () => null` from inside a predicate throws `TypeError` in strict mode.

Preconditions run in registration order at the start of `commit()` and short-circuit on the first failure. Each predicate sees the **current live state** of the world, not the transaction's proposed mutations — preconditions are checked against the pre-commit baseline, not the post-commit projection.

### `commit(): TransactionResult`

```typescript
type TransactionResult =
  | { ok: true;  mutationsApplied: number; eventsEmitted: number }
  | { ok: false; code: 'precondition_failed'; reason: string }
  | { ok: false; code: 'aborted' };
```

Runs preconditions; on any failure, returns `precondition_failed` with no mutation or event applied. Otherwise applies every buffered mutation in registration order via the corresponding public `World` API (so mutations get the same liveness, bounds, and JSON-compat validation as direct calls), then emits every buffered event via `world.emit`. Returns the success result with counts.

If the transaction was previously `abort()`ed, `commit()` returns `{ ok: false, code: 'aborted' }` without throwing or mutating.

`commit()` on a transaction that has already reached a terminal state throws `Error('CommandTransaction already <terminalReason>')` where `<terminalReason>` is `'committed'` after a clean commit and `'aborted'` after an `abort()` followed by `commit()` (which returns `{ ok: false, code: 'aborted' }` once and then transitions to a terminal state). Builder methods (`setComponent`, `emit`, `require`, etc.) throw the same error for the same reason.

### `abort(): void`

Marks a pending transaction as aborted. A subsequent `commit()` returns `{ ok: false, code: 'aborted' }` with no mutation or event applied. `abort()` on an already-committed or already-aborted transaction is a no-op.

### v1 limitations

- **Unbuffered ops:** `createEntity`, `destroyEntity`, `addTag`, `removeTag`, `setMeta`, `deleteMeta`, `setState`, `deleteState`, and resource registration / `setResourceMax` are not buffered. v1 covers components (set / add / patch / remove), position, events, and resource add / remove.
- **Aliasing window.** Buffered values (the `data` argument to `setComponent` / `addComponent` / `patchComponent`, the `position` argument to `setPosition`, and the `data` argument to `emit`) are stored by reference. Mutating a buffered object between the builder call and `commit()` is observable at apply time. Treat buffered values as owned by the transaction once handed over.
- **Mid-commit throw → partial state, transaction consumed.** If a buffered mutation throws mid-commit (e.g., entity destroyed between buffering and commit, JSON-incompat caller-side mutation per the aliasing window above, etc.), the error propagates. Mutations 0..N-1 already applied stay applied. The transaction is still consumed (status flips to `committed` in a `finally` block), so calling `commit()` again throws — the caller cannot retry and silently double-apply earlier mutations (e.g., double-debit a resource). Best practice: validate entity liveness via `require((w) => w.isAlive(entity) || 'entity dead')` before mutating.
- **Event payloads are validated at `emit()` buffer time, not at `commit()`.** Calling `emit(type, data)` with a non-JSON-cloneable payload throws immediately at the builder call, before any mutation runs. Listener exceptions during `commit()` still propagate after mutations have applied — the transaction-level "all-or-nothing" promise covers preconditions and JSON-compat validation, not arbitrary exceptions thrown by listener callbacks.
- **Poisoned-world warning.** If `commit()` runs against a world that has not been recovered from a prior tick failure, it emits the standard `console.warn` once per poison cycle (`api='transaction'`). Call `world.recover()` before transacting against a previously-failed world.

### Example: cost-checked build action

```typescript
const result = world
  .transaction()
  .require((w) => {
    const wood = w.getResource(player, 'wood');
    return (wood?.current ?? 0) >= 80 || 'not enough wood';
  })
  .removeResource(player, 'wood', 80)
  .setComponent(site, 'building', { kind: 'house' })
  .emit('building_placed', { player, site, kind: 'house' })
  .commit();

if (!result.ok) {
  console.log('build aborted:', result.code === 'precondition_failed' ? result.reason : result.code);
}
```

If the player has 80+ wood, the transaction commits: wood is deducted, the building is placed, and the `building_placed` event fires — all in one tick, all visible in one `TickDiff`. If the player has fewer than 80 wood, none of the changes apply and the event is not emitted.

---

## Layer

Generic typed overlay map at configurable downsampled resolution. Models field data — pollution, influence, danger, weather, faith — as a sparse grid where each cell covers a `blockSize × blockSize` block of world coordinates. Standalone utility, no `World` dependency. Sibling of `OccupancyGrid` and `VisibilityMap`.

```typescript
import { Layer, type LayerState } from 'civ-engine';
```

### `LayerOptions<T>`

```typescript
// src/layer.ts
interface LayerOptions<T> {
  worldWidth: number;
  worldHeight: number;
  blockSize?: number;     // default 1
  defaultValue: T;
}
```

`worldWidth`, `worldHeight`, and `blockSize` (default `1`) must be **safe positive integers** (rejected via `Number.isSafeInteger`). The cell grid dimensions are `Math.ceil(worldWidth / blockSize)` × `Math.ceil(worldHeight / blockSize)`; the constructor also rejects dimensions whose product exceeds `Number.MAX_SAFE_INTEGER` to keep cell-index arithmetic exact. `defaultValue` must be JSON-compatible (validated via `assertJsonCompatible`).

### `LayerState<T>`

```typescript
// src/layer.ts
interface LayerState<T> {
  worldWidth: number;
  worldHeight: number;
  blockSize: number;
  defaultValue: T;
  cells: Array<[number, T]>;  // sparse: [cellIndex, value]
}
```

Sparse serialization. Only cells whose value differs from `defaultValue` (compared by JSON fingerprint) appear in `cells`; entries are sorted by `cellIndex` for determinism. `cellIndex = cy * width + cx`.

### `new Layer<T>(options)`

```typescript
new Layer<T>(options: LayerOptions<T>)
```

Creates a Layer of cell type `T`. The constructor validates dimensions and JSON-compatibility, and `structuredClone`s `defaultValue` so caller mutation cannot bleed in.

**Defensive-copy contract.** Values flowing across the Layer's API surface are `structuredClone`d for object `T`; for primitive `T` (`number`, `string`, `boolean`, `null`) the clone is skipped because primitives are immutable on the JS side:

- **Writes** (`setCell`, `setAt`, `fill`): for object `T`, the input value is cloned before storage. Mutating the original after the call does not affect the Layer. For primitive `T`, the value is stored by value (no clone).
- **Reads** (`getCell`, `getAt`, `forEach`, `defaultValue` getter): for object `T`, the returned value is a fresh clone of internal storage. For primitive `T`, the value is returned directly.
- **Read-only traversal** (`forEachReadOnly`): zero-allocation — yields the live stored reference even for object `T`. Caller must NOT mutate.
- **Serialization** (`getState`, `Layer.fromState`, `clone`): for object `T`, values are cloned at both ends.

The primitive fast-path makes `Layer<number>`, `Layer<boolean>`, `Layer<string>`, and `Layer<null>` zero-allocation across reads and writes. For object `T`, cloning every read costs O(value size) per call — if profiling shows this dominates, use `forEachReadOnly` in tight loops or batch reads via `getState()`.

**Strip-at-write sparsity.** Writes that match `defaultValue` (by `===` for primitive `T`, by `jsonFingerprint` for object `T`) `delete` the underlying entry instead of storing it. `fill(defaultValue)` short-circuits to clearing the entire sparse map. The in-memory and canonical-sparse representations stay in sync without a `getState` round-trip.

### Properties

| Property | Type | Description |
|---|---|---|
| `worldWidth` | `number` | World coordinate range (read-only) |
| `worldHeight` | `number` | World coordinate range (read-only) |
| `blockSize` | `number` | Cell size in world units (read-only) |
| `width` | `number` | Cell grid width = `ceil(worldWidth / blockSize)` |
| `height` | `number` | Cell grid height = `ceil(worldHeight / blockSize)` |
| `defaultValue` | `T` | Getter returning a fresh `structuredClone` of the internal default value (mutating the result does not affect the Layer) |

### `getCell(cx, cy)` / `setCell(cx, cy, value)`

```typescript
getCell(cx: number, cy: number): T
setCell(cx: number, cy: number, value: T): void
```

Cell-coordinate access. `cx` and `cy` must be integers in `[0, width)` × `[0, height)` — both out-of-range and non-integer inputs throw `RangeError`. `setCell` validates `value` via `assertJsonCompatible` and `structuredClone`s before storage. `getCell` `structuredClone`s before returning.

### `getAt(worldX, worldY)` / `setAt(worldX, worldY, value)`

```typescript
getAt(worldX: number, worldY: number): T
setAt(worldX: number, worldY: number, value: T): void
```

World-coordinate access; auto-buckets to `Math.floor(worldX / blockSize)`, `Math.floor(worldY / blockSize)`. `worldX` and `worldY` must be integers in `[0, worldWidth)` × `[0, worldHeight)` — both out-of-range and non-integer inputs throw `RangeError`. Same defensive-copy contract as `getCell` / `setCell`.

### `fill(value)`

```typescript
fill(value: T): void
```

Sets every cell to `value`. Validates once via `assertJsonCompatible`, then `structuredClone`s once per cell so each cell holds an independent copy. Subsequent `getState()` strips entries that match `defaultValue` (by `jsonFingerprint`), so `fill(defaultValue)` then `getState()` produces an empty `cells` array.

### `forEach(cb)`

```typescript
forEach(cb: (value: T, cx: number, cy: number) => void): void
```

Visits every cell in row-major order (`cy` outer, `cx` inner). For object `T`, each invocation receives a fresh `structuredClone` — mutating the callback's `value` argument does not affect the Layer. For primitive `T`, the value is passed directly (no clone). Unset cells yield `defaultValue` (cloned for object `T`).

### `forEachReadOnly(cb)`

```typescript
forEachReadOnly(cb: (value: T, cx: number, cy: number) => void): void
```

Zero-allocation traversal. For non-default cells, yields the live stored reference. For unset cells, yields the live `_defaultValue`. **Caller must not mutate the value** — for object `T` the reference is shared with internal storage. Use `forEach` if you need a defensive copy. Use `forEachReadOnly` in hot paths where you only read.

### `clear(cx, cy)` / `clearAt(worldX, worldY)`

```typescript
clear(cx: number, cy: number): void
clearAt(worldX: number, worldY: number): void
```

Drops the cell back to default — deletes the underlying sparse-map entry. Idempotent on already-default cells. Bounds-validated and integer-validated the same way as `setCell` / `setAt`.

### `getState()` / `Layer.fromState(state)`

```typescript
getState(): LayerState<T>
static fromState<T>(state: LayerState<T>): Layer<T>
```

Round-trip serialization. `getState` strips entries that match `defaultValue` (by `jsonFingerprint`), `structuredClone`s the rest, and sorts by cell index for determinism. `Layer.fromState` validates state shape (non-null object, `cells` is an array of `[index, value]` tuples, `blockSize` is present), validates each cell index is a safe integer in `[0, width * height)`, rejects duplicates, validates each value is JSON-compatible, and **canonicalizes** by stripping any cell whose value matches `defaultValue` (so a malformed snapshot with redundant default entries normalizes on load).

**Throws (fromState):**
- `TypeError` if `state` is not a non-null object
- `Error` if `state.blockSize` is `undefined` or `null`
- `TypeError` if `state.cells` is not an array
- `TypeError` if any cell entry is not a 2-element `[index, value]` tuple
- `RangeError` if any cell index is not a safe integer in `[0, width * height)`
- `Error` if any cell index appears more than once
- `Error` if any value is not JSON-compatible

Note on the fingerprint comparison: `jsonFingerprint` uses `JSON.stringify`, which serializes object keys in insertion order. Two objects that are deeply equal but constructed with different key orders will not match — for object-typed `T` defaults, write your values with the same key order as `defaultValue` if you want them to be stripped on serialize.

### `clone()`

```typescript
clone(): Layer<T>
```

Returns an independent deep copy. For object `T`, every stored entry is `structuredClone`d. For primitive `T`, entries are copied by value. The implementation iterates the sparse map directly (no intermediate `getState` round-trip).

### Example

```typescript
const pollution = new Layer<number>({
  worldWidth: 64,
  worldHeight: 64,
  blockSize: 4, // 16 × 16 cells
  defaultValue: 0,
});

// Factory pollutes the cell containing world coord (10, 12)
pollution.setAt(10, 12, 80);

// Any agent querying nearby world coords in the same 4×4 cell sees the value
console.log(pollution.getAt(11, 13)); // 80
console.log(pollution.getAt(8, 12));  // 80 (same cell)
console.log(pollution.getAt(20, 12)); // 0  (different cell)

// Snapshot for save state
const snapshot = pollution.getState();
const restored = Layer.fromState<number>(snapshot);
```

---

## Noise

Seedable 2D simplex noise for procedural generation. Standalone utility.

```typescript
import { createNoise2D, octaveNoise2D } from 'civ-engine';
```

### `createNoise2D(seed)`

```typescript
createNoise2D(seed: number): (x: number, y: number) => number
```

Creates a noise function from a seed. The same seed always produces the same output. Returns values in `[-1, 1]`.

```typescript
const noise = createNoise2D(42);
const value = noise(1.5, 2.3); // number in [-1, 1]
```

### `octaveNoise2D(noise, x, y, octaves, persistence?, lacunarity?)`

```typescript
octaveNoise2D(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
  persistence?: number,  // default: 0.5
  lacunarity?: number,   // default: 2.0
): number
```

Layers multiple noise samples at increasing frequency and decreasing amplitude (fractal Brownian motion). Produces more natural-looking terrain than single-octave noise. Returns values in `[-1, 1]` when the input `noise` function is bounded to `[-1, 1]`.

Throws `RangeError` if `octaves < 1` or non-integer, `persistence < 0` or non-finite, or `lacunarity <= 0` or non-finite.

| Parameter | Default | Description |
|---|---|---|
| `octaves` | (required) | Number of noise layers (positive integer) |
| `persistence` | `0.5` | Amplitude multiplier per octave (lower = smoother; must be `>= 0`) |
| `lacunarity` | `2.0` | Frequency multiplier per octave (higher = more detail; must be `> 0`) |

```typescript
const noise = createNoise2D(42);

// 4 octaves for terrain generation
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const elevation = octaveNoise2D(noise, x * 0.05, y * 0.05, 4);
    // elevation: -1 (deep water) to 1 (mountain peaks)
  }
}
```

---

## Cellular Automata

Immutable cellular automata for map generation. Each step produces a new grid. Standalone utility.

```typescript
import {
  createCellGrid,
  stepCellGrid,
  MOORE_OFFSETS,
  VON_NEUMANN_OFFSETS,
  type CellGrid,
  type CellRule,
} from 'civ-engine';
```

### `createCellGrid(width, height, fill)`

```typescript
createCellGrid(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): CellGrid
```

Creates a cell grid from a fill function. The fill function is called for every cell with its coordinates.

```typescript
// Random binary grid
const grid = createCellGrid(32, 32, () => Math.random() > 0.5 ? 1 : 0);

// Noise-seeded grid
const noise = createNoise2D(42);
const grid = createCellGrid(32, 32, (x, y) =>
  octaveNoise2D(noise, x * 0.1, y * 0.1, 4) > 0 ? 1 : 0
);
```

### `stepCellGrid(grid, rule, offsets?)`

```typescript
stepCellGrid(
  grid: CellGrid,
  rule: CellRule,
  offsets?: ReadonlyArray<[number, number]>,  // default: MOORE_OFFSETS
): CellGrid
```

Produces a new grid by applying the rule function to every cell. The original grid is not mutated. Out-of-bounds neighbors are excluded (edge cells have fewer neighbors).

```typescript
// Game of Life rule
const gameOfLife: CellRule = (current, neighbors) => {
  const alive = neighbors.filter(n => n === 1).length;
  if (current === 1) return (alive === 2 || alive === 3) ? 1 : 0;
  return alive === 3 ? 1 : 0;
};

let grid = createCellGrid(32, 32, () => Math.random() > 0.6 ? 1 : 0);
for (let i = 0; i < 5; i++) {
  grid = stepCellGrid(grid, gameOfLife);
}

// Cave generation (smoothing rule)
const caveSmooth: CellRule = (current, neighbors) => {
  const walls = neighbors.filter(n => n === 1).length;
  return walls >= 5 ? 1 : walls <= 2 ? 0 : current;
};
```

### Neighborhood Constants

| Constant | Pattern | Count | Description |
|---|---|---|---|
| `MOORE_OFFSETS` | 8 surrounding cells | 8 | Default. All 8 neighbors (orthogonal + diagonal) |
| `VON_NEUMANN_OFFSETS` | 4 adjacent cells | 4 | Only orthogonal neighbors (up, down, left, right) |

---

## Map Generation

Helpers for bulk tile entity creation. Standalone utility.

```typescript
import { createTileGrid, type MapGenerator } from 'civ-engine';
```

### `createTileGrid(world, positionKey?)`

```typescript
createTileGrid(
  world: World,
  positionKey?: string,  // default: 'position'
): EntityId[][]
```

Creates one entity per grid cell and attaches a position component to each. Returns a 2D array indexed as `tiles[y][x]`.

The position component must be registered on the world before calling this function.

**Throws:** `Error` (via `query`) if the position component is not registered.

```typescript
world.registerComponent<Position>('position');
const tiles = createTileGrid(world);
// tiles[0][0] = entity at (0, 0)
// tiles[3][5] = entity at (5, 3)

// Add terrain data to tiles
world.registerComponent<{ type: string }>('terrain');
tiles[3][5]; // entity ID at x=5, y=3
world.addComponent(tiles[3][5], 'terrain', { type: 'forest' });
```

### `MapGenerator` Interface

```typescript
interface MapGenerator {
  generate(world: World, tiles: EntityId[][]): void;
}
```

An optional interface for organizing map generation logic. Not enforced by the engine.

```typescript
const myGenerator: MapGenerator = {
  generate(world, tiles) {
    const noise = createNoise2D(42);
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const value = octaveNoise2D(noise, x * 0.05, y * 0.05, 4);
        const type = value > 0.3 ? 'mountain' : value > -0.2 ? 'grass' : 'water';
        world.addComponent(tiles[y][x], 'terrain', { type });
      }
    }
  },
};

const tiles = createTileGrid(world);
myGenerator.generate(world, tiles);
```

---

## Behavior Tree

Generic behavior tree framework for AI decision-making. Trees are structural blueprints shared across entities; per-entity execution state lives in `BTState` (stored as a component). Standalone utility.

```typescript
import {
  createBehaviorTree,
  createBTState,
  NodeStatus,
  type BTState,
  type BTNode,
  type TreeBuilder,
} from 'civ-engine';
```

### `createBehaviorTree<TContext>(getState, define)`

```typescript
createBehaviorTree<TContext>(
  getState: (ctx: TContext) => BTState,
  define: (builder: TreeBuilder<TContext>) => BTNode<TContext>,
): BTNode<TContext>
```

Creates a behavior tree. `TContext` is game-defined — the engine does not prescribe what it contains.

**Parameters:**
- `getState` — Extracts the `BTState` from the context (used by composite nodes to track which child is running)
- `define` — Builder function that constructs the tree using the `TreeBuilder` API

**Returns:** The root `BTNode`, which has a `tick(context)` method and a `nodeCount` property.

### `createBTState(tree)`

```typescript
createBTState(tree: BTNode<unknown>): BTState
```

Creates a fresh `BTState` sized to the given tree. All running indices start at `-1` (no child running).

### Builder Nodes

All nodes are created through the `TreeBuilder` passed to the `define` callback:

#### `builder.action(fn)`

Leaf node that runs a function returning `NodeStatus`. Use for concrete actions (move, attack, gather).

```typescript
builder.action((ctx) => {
  // do something
  return NodeStatus.SUCCESS;
});
```

#### `builder.condition(fn)`

Leaf node that runs a boolean test. Returns `SUCCESS` if true, `FAILURE` if false.

```typescript
builder.condition((ctx) => ctx.health > 0);
```

#### `builder.selector(children)`

Composite node that tries children left-to-right until one succeeds or returns `RUNNING`. If all fail, the selector fails. Resumes from the running child on the next tick.

```typescript
builder.selector([
  builder.condition((ctx) => ctx.hasFood),
  builder.action((ctx) => { ctx.forage(); return NodeStatus.SUCCESS; }),
]);
```

#### `builder.sequence(children)`

Composite node that runs children left-to-right until one fails or returns `RUNNING`. If all succeed, the sequence succeeds. Resumes from the running child on the next tick.

```typescript
builder.sequence([
  builder.condition((ctx) => ctx.hasTarget),
  builder.action((ctx) => ctx.moveToTarget()),
  builder.action((ctx) => ctx.attack()),
]);
```

#### `builder.reactiveSelector(children)`

Like `selector`, but does not persist running state across ticks. Each tick re-evaluates children from index 0. Use when higher-priority children must pre-empt a previously running lower-priority branch (e.g., a sleep/eat need should interrupt a work branch).

```typescript
builder.reactiveSelector([
  builder.sequence([
    builder.condition((ctx) => ctx.energy < 0.2),
    builder.action((ctx) => ctx.sleep()),
  ]),
  builder.action((ctx) => ctx.work()),
]);
```

#### `builder.reactiveSequence(children)`

Like `sequence`, but does not persist running state across ticks. Each tick restarts evaluation from child 0. Use with a `condition` as the first child to get guard-then-body semantics that re-check the guard every tick.

```typescript
builder.reactiveSequence([
  builder.condition((ctx) => ctx.hasTarget),
  builder.action((ctx) => ctx.advance()),
]);
```

#### `clearRunningState(state, node?)`

```typescript
clearRunningState(state: BTState, node?: BTNode<unknown>): void
```

Resets running indices in a `BTState`. Without `node`, resets the entire tree. With `node`, resets only the subtree rooted at `node` — useful when external events (job reassignment, loot pickup) should interrupt a currently running branch.

```typescript
import { clearRunningState } from 'civ-engine';
// Full reset
clearRunningState(entity.btState);
// Subtree reset
clearRunningState(entity.btState, subtreeRoot);
```

### Complete Example

```typescript
import {
  World,
  createBehaviorTree,
  createBTState,
  NodeStatus,
  type BTState,
  type BTNode,
  type Position,
  type EntityId,
} from 'civ-engine';

// Define game-specific context
interface AIContext {
  entityId: EntityId;
  world: World;
  btState: BTState;
}

// Define the behavior tree (shared across all entities)
const tree: BTNode<AIContext> = createBehaviorTree<AIContext>(
  (ctx) => ctx.btState,
  (b) =>
    b.selector([
      // Priority 1: flee if low health
      b.sequence([
        b.condition((ctx) => {
          const hp = ctx.world.getComponent<{ hp: number }>(ctx.entityId, 'health');
          return hp !== undefined && hp.hp < 20;
        }),
        b.action((ctx) => {
          // flee logic
          return NodeStatus.SUCCESS;
        }),
      ]),
      // Priority 2: attack nearby enemy
      b.sequence([
        b.condition((ctx) => {
          const pos = ctx.world.getComponent<Position>(ctx.entityId, 'position')!;
          const nearby = ctx.world.grid.getNeighbors(pos.x, pos.y);
          return nearby.length > 0;
        }),
        b.action((ctx) => {
          // attack logic
          return NodeStatus.SUCCESS;
        }),
      ]),
      // Priority 3: wander
      b.action((ctx) => {
        // wander logic
        return NodeStatus.SUCCESS;
      }),
    ]),
);

// Store BTState as a component
world.registerComponent<BTState>('btState');

// Create an entity with AI
const unit = world.createEntity();
world.addComponent(unit, 'btState', createBTState(tree));

// System that ticks behavior trees
function aiSystem(w: World): void {
  for (const id of w.query('btState', 'position')) {
    const btState = w.getComponent<BTState>(id, 'btState')!;
    const ctx: AIContext = { entityId: id, world: w, btState };
    tree.tick(ctx);
  }
}

world.registerSystem(aiSystem);
```

---

## Client Adapter

Transport-agnostic bridge between the World and external clients. The adapter serializes world state into typed messages and dispatches incoming commands. Standalone class that uses only World's public API.

```typescript
import {
  ClientAdapter,
  type ServerMessage,
  type ClientMessage,
  type GameEvent,
} from 'civ-engine';
```

### Constructor

```typescript
new ClientAdapter<TEventMap, TCommandMap>(config: {
  world: World<TEventMap, TCommandMap>;
  send: (message: ServerMessage<TEventMap>) => void;
  onError?: (error: unknown) => void;
})
```

| Parameter | Description |
|---|---|
| `world` | The World instance to bridge |
| `send` | Callback invoked for every outgoing server message |
| `onError` | Optional callback invoked when `send` throws; the adapter disconnects after reporting |

### Methods

#### `connect()`

```typescript
connect(): void
```

Starts streaming. Immediately sends a `snapshot` message with the full world state, then subscribes to diffs, command execution results, and tick failures. No-op if already connected.

#### `disconnect()`

```typescript
disconnect(): void
```

Stops streaming. Unsubscribes from diffs. No-op if already disconnected.

#### `handleMessage(message)`

```typescript
handleMessage(message: ClientMessage<TCommandMap> | unknown): void
```

Processes an incoming client message:

| Message type | Behavior |
|---|---|
| `command` | Validates the envelope, rejects unhandled command types, then calls `world.submitWithResult()`. Sends `commandAccepted` on success or `commandRejected` with structured error fields on failure. If the command was queued, later streams `commandExecuted` or `commandFailed` after tick processing |
| `requestSnapshot` | Sends a `snapshot` message with the current world state |

Malformed messages without a usable `type` are ignored. Malformed command envelopes with an ID are rejected when the adapter can safely identify which command to reject.

### WebSocket Example

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  const adapter = new ClientAdapter({
    world,
    send: (msg) => ws.send(JSON.stringify(msg)),
  });

  ws.on('message', (data) => {
    adapter.handleMessage(JSON.parse(data.toString()));
  });

  ws.on('close', () => adapter.disconnect());

  adapter.connect();
});
```

### stdin/stdout Example (for AI agents)

```typescript
import * as readline from 'readline';

const rl = readline.createInterface({ input: process.stdin });

const adapter = new ClientAdapter({
  world,
  send: (msg) => {
    process.stdout.write(JSON.stringify(msg) + '\n');
  },
});

rl.on('line', (line) => {
  adapter.handleMessage(JSON.parse(line));
});

adapter.connect();
```

---

## Render Adapter

Projection boundary for renderer-facing snapshots and per-tick diffs. The engine stays headless; the game provides projection callbacks that decide what render state each entity exposes.

```typescript
import {
  RenderAdapter,
  type RenderDiff,
  type RenderEntity,
  type RenderProjector,
  type RenderServerMessage,
  type RenderSnapshot,
} from 'civ-engine';
```

### Core Types

#### `RenderEntity<TView>`

```typescript
interface RenderEntity<TView> {
  ref: EntityRef;
  view: TView;
}
```

Projected renderable entity with a generation-aware entity reference.

#### `RenderSnapshot<TView, TFrame>`

```typescript
interface RenderSnapshot<TView, TFrame> {
  tick: number;
  entities: Array<RenderEntity<TView>>;
  frame: TFrame | null;
}
```

Full projected render state for initial sync or resync.

#### `RenderDiff<TView, TFrame>`

```typescript
interface RenderDiff<TView, TFrame> {
  tick: number;
  created: Array<RenderEntity<TView>>;
  updated: Array<RenderEntity<TView>>;
  destroyed: EntityRef[];
  frame: TFrame | null;
}
```

Incremental projected render update for one simulation tick.

#### `RenderEntityChange`

```typescript
interface RenderEntityChange {
  id: EntityId;
  created: boolean;
  destroyed: boolean;
  componentKeys: string[];
  resourceKeys: string[];
  previousRef: EntityRef | null;
  currentRef: EntityRef | null;
}
```

Summary of why an entity was considered for re-projection on a tick.

#### `RenderProjector<TEventMap, TCommandMap, TView, TFrame>`

```typescript
interface RenderProjector<TEventMap, TCommandMap, TView, TFrame> {
  projectEntity(
    ref: EntityRef,
    world: World<TEventMap, TCommandMap>,
    change: RenderEntityChange | null,
  ): TView | null;
  projectFrame?(
    world: World<TEventMap, TCommandMap>,
    diff: TickDiff | null,
  ): TFrame | null;
  shouldProjectChange?(change: RenderEntityChange): boolean;
}
```

Game-owned callbacks that map simulation state to render-facing state.

#### `RenderServerMessage<TView, TFrame, TDebug>`

```typescript
type RenderServerMessage<TView, TFrame, TDebug> =
  | { type: 'renderSnapshot'; data: { render: RenderSnapshot<TView, TFrame>; debug: TDebug | null } }
  | { type: 'renderTick'; data: { render: RenderDiff<TView, TFrame>; debug: TDebug | null } };
```

Message union emitted by `RenderAdapter`.

### Constructor

```typescript
new RenderAdapter<TEventMap, TCommandMap, TView, TFrame, TDebug>(config: {
  world: World<TEventMap, TCommandMap>;
  projector: RenderProjector<TEventMap, TCommandMap, TView, TFrame>;
  send: (message: RenderServerMessage<TView, TFrame, TDebug>) => void;
  onError?: (error: unknown) => void;
  debug?: { capture(): TDebug | null };
})
```

### Methods

#### `connect()`

```typescript
connect(): void
```

Immediately sends a `renderSnapshot` message, then subscribes to world diffs and emits `renderTick` messages after each step.

#### `disconnect()`

```typescript
disconnect(): void
```

Stops streaming render messages.

### Behavior Notes

- Render messages use `EntityRef` values so same-tick ID recycling is unambiguous.
- `projectEntity()` returning `null` removes an entity from the render surface without destroying it in the simulation.
- `debug.capture()` is optional and can attach structured debugger output to each render message.

---

## Scenario Runner

Headless setup/run/check harness for deterministic experiments. Intended for AI agents, integration tests, and debug workflows that need one structured result object instead of ad hoc setup code.

```typescript
import {
  runScenario,
  type ScenarioCapture,
  type ScenarioCheck,
  type ScenarioContext,
  type ScenarioFailure,
  type ScenarioResult,
  type ScenarioStepUntilResult,
} from 'civ-engine';
```

### Core Types

#### `ScenarioFailure`

```typescript
interface ScenarioFailure {
  code: string;
  message: string;
  source?: 'setup' | 'run' | 'stepUntil' | 'check' | 'tick';
  details?: JsonValue;
}
```

Structured failure object used by runner-level failures, `stepUntil()`, and checks.

#### `ScenarioCheck`

```typescript
interface ScenarioCheck<TEventMap, TCommandMap> {
  name: string;
  check(
    context: ScenarioContext<TEventMap, TCommandMap>,
  ): boolean | ScenarioFailure;
}
```

Post-run check evaluated after `run()`.

#### `ScenarioContext`

```typescript
interface ScenarioContext<TEventMap, TCommandMap> {
  name: string;
  world: World<TEventMap, TCommandMap>;
  debugger: WorldDebugger<TEventMap, TCommandMap>;
  history: WorldHistoryRecorder<TEventMap, TCommandMap, WorldDebugSnapshot>;
  submit<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
  ): CommandSubmissionResult<K>;
  step(count?: number): ScenarioCapture<TEventMap, TCommandMap>;
  stepUntil(
    predicate: (context: ScenarioContext<TEventMap, TCommandMap>) => boolean,
    options?: {
      maxTicks?: number;
      code?: string;
      message?: string;
      details?: JsonValue;
    },
  ): ScenarioStepUntilResult;
  capture(): ScenarioCapture<TEventMap, TCommandMap>;
  fail(
    code: string,
    message: string,
    details?: JsonValue,
    source?: ScenarioFailure['source'],
  ): ScenarioFailure;
}
```

Runtime helpers exposed to `setup()`, `run()`, and checks.

#### `ScenarioStepUntilResult`

```typescript
interface ScenarioStepUntilResult {
  completed: boolean;
  steps: number;
  tick: number;
  failure: ScenarioFailure | null;
}
```

Bounded loop result returned by `context.stepUntil()`.

#### `ScenarioResult`

```typescript
interface ScenarioResult<TEventMap, TCommandMap>
  extends ScenarioCapture<TEventMap, TCommandMap> {
  name: string;
  passed: boolean;
  failure: ScenarioFailure | null;
  checks: ScenarioCheckOutcome[];
  issues: DebugIssue[];
}
```

Final machine-readable result from `runScenario()`.
`ScenarioCapture` and `ScenarioResult` include `schemaVersion`.

### `runScenario(config)`

```typescript
runScenario<TEventMap, TCommandMap>(config: {
  name: string;
  world: World<TEventMap, TCommandMap>;
  debugger?: WorldDebugger<TEventMap, TCommandMap>;
  probes?: DebugProbe[];
  history?: {
    capacity?: number;
    commandCapacity?: number;
    captureInitialSnapshot?: boolean;
  };
  setup?(context: ScenarioContext<TEventMap, TCommandMap>): void;
  run?(
    context: ScenarioContext<TEventMap, TCommandMap>,
  ): void | ScenarioFailure | null;
  checks?: Array<ScenarioCheck<TEventMap, TCommandMap>>;
}): ScenarioResult<TEventMap, TCommandMap>
```

Runs a scenario and returns the final structured result.

### Behavior Notes

- The runner creates a `WorldHistoryRecorder` and clears it after `setup()`, so the recorded initial snapshot reflects the prepared scenario state.
- `submit()` inside the scenario context calls `world.submitWithResult()`.
- `step()` inside the scenario context uses `world.stepWithResult()`, so runtime tick failures are converted into structured scenario failures.
- `stepUntil()` returns a structured timeout failure instead of forcing the caller to throw.
- Exceptions thrown by `setup()`, `run()`, or checks are converted into structured runner failures when possible.

---

## World History Recorder

Short-horizon recorder for recent command outcomes and tick traces. Useful for AI agents, tests, and debug tooling that need recent history without building a full replay system.

```typescript
import {
  WorldHistoryRecorder,
  summarizeWorldHistoryRange,
  type WorldHistoryRangeSummary,
  type WorldHistoryState,
  type WorldHistoryTick,
} from 'civ-engine';
```

### Constructor

```typescript
new WorldHistoryRecorder<TEventMap, TCommandMap, TDebug>(config: {
  world: World<TEventMap, TCommandMap>;
  capacity?: number;
  commandCapacity?: number;
  debug?: { capture(): TDebug | null };
  captureInitialSnapshot?: boolean;
})
```

### Methods

#### `connect()`

```typescript
connect(): void
```

Starts recording world diffs and command outcomes. Optionally stores an initial snapshot.
Starts recording world diffs, command submission outcomes, command execution outcomes, and tick failures. Optionally stores an initial snapshot.

#### `disconnect()`

```typescript
disconnect(): void
```

Stops recording.

#### `clear()`

```typescript
clear(): void
```

Clears recorded history and refreshes the initial snapshot if `captureInitialSnapshot` is enabled.

#### `getTickHistory()`

```typescript
getTickHistory(): Array<WorldHistoryTick<TEventMap, TDebug>>
```

Returns cloned recent tick entries.

#### `getCommandHistory()`

```typescript
getCommandHistory(): Array<CommandSubmissionResult<keyof TCommandMap>>
```

Returns cloned recent command outcomes.

#### `getCommandExecutionHistory()`

```typescript
getCommandExecutionHistory(): Array<CommandExecutionResult<keyof TCommandMap>>
```

Returns cloned recent command execution outcomes.

#### `getTickFailureHistory()`

```typescript
getTickFailureHistory(): TickFailure[]
```

Returns cloned recent tick failures.

#### `findTick(tick)`

```typescript
findTick(tick: number): WorldHistoryTick<TEventMap, TDebug> | null
```

Returns one recorded tick entry or `null`.

#### `getState()`

```typescript
getState(): WorldHistoryState<TEventMap, TCommandMap, TDebug>
```

Returns the full recorder state: initial snapshot, recent ticks, recent command submission outcomes, recent command execution outcomes, and recent tick failures.
The returned `WorldHistoryState` includes `schemaVersion`.

#### `summarizeWorldHistoryRange(state, options?)`

```typescript
summarizeWorldHistoryRange<TEventMap, TCommandMap>(
  state: WorldHistoryState<TEventMap, TCommandMap, WorldDebugSnapshot>,
  options?: { startTick?: number; endTick?: number },
): WorldHistoryRangeSummary | null
```

Aggregates a short tick window into one machine-readable summary covering changed entity IDs, command submission outcomes, command execution outcomes, tick-failure codes, events, diff totals, and debugger issue counts.

---

## World Debugger

Structured headless debugger for inspecting world state, last diff summary, metrics, and optional probe data.

```typescript
import {
  WorldDebugger,
  createOccupancyDebugProbe,
  createPathQueueDebugProbe,
  createVisibilityDebugProbe,
} from 'civ-engine';
```

### Constructor

```typescript
new WorldDebugger<TEventMap, TCommandMap>(config: {
  world: World<TEventMap, TCommandMap>;
  probes?: Array<DebugProbe>;
})
```

### Methods

#### `addProbe(probe)`

```typescript
addProbe(probe: DebugProbe): void
```

Registers a custom JSON-compatible debug probe.

#### `removeProbe(key)`

```typescript
removeProbe(key: string): void
```

Removes a probe by key.

#### `capture()`

```typescript
capture(): WorldDebugSnapshot
```

Returns a structured debug snapshot containing:

- `schemaVersion`
- world/entity/component/resource summaries
- spatial density information
- current event counts
- `world.getMetrics()` output
- last diff summary
- `world.getLastTickFailure()` output
- machine-readable `issues`, including tick-budget diagnostics and diff hazards
- compatibility `warnings` derived from those issues
- custom probe payloads

### Probe Helpers

```typescript
createOccupancyDebugProbe(key: string, occupancy: OccupancyGrid): DebugProbe
createVisibilityDebugProbe(key: string, visibility: VisibilityMap): DebugProbe
createPathQueueDebugProbe(
  key: string,
  queue: { getStats(): PathRequestQueueStats },
): DebugProbe
```

These helpers expose standalone utility state through the same debugger surface.

## Session Recording — Bundle Types & Errors

The session-recording subsystem captures deterministic, replayable bundles of `World` runs. This section documents the bundle / marker / error type definitions; subsequent sections cover the sink interfaces, recorder, replayer, and scenario adapter.

See `docs/guides/session-recording.md` for the user-facing guide and `docs/threads/done/session-recording/DESIGN.md` for the full subsystem design.

### `SessionBundle`

```typescript
const SESSION_BUNDLE_SCHEMA_VERSION = 1;

interface SessionBundle<
  TEventMap = Record<string, never>,
  TCommandMap = Record<string, never>,
  TDebug = JsonValue,
> {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  initialSnapshot: WorldSnapshot;
  ticks: SessionTickEntry<TEventMap, TDebug>[];
  commands: RecordedCommand<TCommandMap>[];
  executions: CommandExecutionResult<keyof TCommandMap>[];
  failures: TickFailure[];
  snapshots: SessionSnapshotEntry[];
  markers: Marker[];
  attachments: AttachmentDescriptor[];
}
```

Strict JSON: `JSON.stringify(bundle)` is a complete, lossless representation of everything in the JSON shape (sidecar attachment bytes are stored externally; consumers retrieve them via `source.readSidecar(id)` once T2 lands).

### `SessionMetadata`

```typescript
interface SessionMetadata {
  sessionId: string;          // UUID v4
  engineVersion: string;      // ENGINE_VERSION at recording time
  nodeVersion: string;        // process.version at recording time
  recordedAt: string;         // ISO 8601 timestamp
  startTick: number;          // tick at connect()
  endTick: number;            // tick at disconnect() (live world.tick)
  persistedEndTick: number;   // tick of last successfully persisted snapshot
  durationTicks: number;      // endTick - startTick
  sourceKind: 'session' | 'scenario' | 'synthetic';  // 'synthetic' added in v0.8.0 (b-bump per ADR 20)
  sourceLabel?: string;
  incomplete?: true;          // set when recorder did not reach disconnect cleanly
  failedTicks?: number[];     // ticks at-or-after which replay refuses (TickFailure spans)
  policySeed?: number;        // populated only when sourceKind === 'synthetic' (added in v0.8.0)
}
```

`endTick` is the live world tick at finalization regardless of persistence success; `persistedEndTick` is the upper bound for incomplete-bundle replay (per spec §5.2 manifest cadence).

### `Marker`

```typescript
type MarkerKind = 'annotation' | 'assertion' | 'checkpoint';
type MarkerProvenance = 'engine' | 'game';

interface EntityRef { id: number; generation: number; }

interface MarkerRefs {
  entities?: EntityRef[];                           // matched by id + generation
  cells?: Position[];                               // must be in-bounds
  tickRange?: { from: number; to: number };
}

interface Marker {
  id: string;                  // UUID v4
  tick: number;                // engine tick the marker references; >= 0
  kind: MarkerKind;
  provenance: MarkerProvenance;
  text?: string;
  refs?: MarkerRefs;
  data?: JsonValue;            // opaque game payload
  attachments?: string[];      // attachment ids
  createdAt?: string;          // ISO 8601 (recorder fills in if omitted)
  validated?: false;           // retroactive markers; entity-liveness skipped
}
```

`MarkerProvenance.engine` is reserved for `scenarioResultToBundle()`; recorder-added markers always get `provenance: 'game'`.

### `RecordedCommand`

```typescript
interface RecordedCommand<TCommandMap = Record<string, unknown>> {
  submissionTick: number;     // CommandSubmissionResult.tick (observable tick at submit)
  sequence: number;           // CommandSubmissionResult.sequence; orders within a tick
  type: keyof TCommandMap & string;
  data: TCommandMap[keyof TCommandMap];
  result: CommandSubmissionResult<keyof TCommandMap>;
}
```

Replay-ready: carries the original `data` payload that `CommandSubmissionResult` alone does not.

### `AttachmentDescriptor`

```typescript
interface AttachmentDescriptor {
  id: string;                 // UUID v4
  mime: string;
  sizeBytes: number;
  ref: { dataUrl: string } | { sidecar: true };
}
```

Two ref shapes: `{ dataUrl }` embeds bytes as `data:<mime>;base64,...` directly in the bundle JSON; `{ sidecar: true }` stores bytes externally (FileSink: `attachments/<id>.<ext>`; MemorySink: parallel internal map accessed via `source.readSidecar(id)`).

### Error Hierarchy

```typescript
class SessionRecordingError extends Error {
  readonly details: JsonValue | undefined;
  constructor(message: string, details?: JsonValue);
}

class MarkerValidationError extends SessionRecordingError {
  readonly referencesValidationRule: string | undefined;
  constructor(message: string, details?: JsonValue, referencesValidationRule?: string);
}

class RecorderClosedError extends SessionRecordingError;     // post-disconnect, poisoned-world, recorder_already_attached
class SinkWriteError extends SessionRecordingError;          // I/O failure during recording
class BundleVersionError extends SessionRecordingError;      // schemaVersion / engineVersion incompat
class BundleRangeError extends SessionRecordingError;        // openAt / tickEntriesBetween out-of-range
class BundleIntegrityError extends SessionRecordingError;    // structural; replay_across_failure / no_replay_payloads / no_initial_snapshot
class ReplayHandlerMissingError extends SessionRecordingError;  // worldFactory drift on a recorded command type
```

Catch sites that care about cause use `instanceof <Subclass>`; catch sites that just want "any session-recording problem" use `instanceof SessionRecordingError`.

### `ENGINE_VERSION`

```typescript
const ENGINE_VERSION: string;  // matches package.json's `version` field
```

Read by `SessionRecorder` and `scenarioResultToBundle()` for `metadata.engineVersion`. Kept in sync with `package.json`'s `version` by the release process.

## Session Recording — Sinks (SessionSink, SessionSource, MemorySink)

`SessionSink` (write) / `SessionSource` (read) interfaces plus `MemorySink` reference implementation. Bundle types travel through these.

### `SessionSink`

```typescript
interface SessionSink {
  open(metadata: SessionMetadata): void;
  writeTick(entry: SessionTickEntry): void;
  writeCommand(record: RecordedCommand): void;
  writeCommandExecution(result: CommandExecutionResult): void;
  writeTickFailure(failure: TickFailure): void;
  writeSnapshot(entry: SessionSnapshotEntry): void;
  writeMarker(marker: Marker): void;
  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor;
  close(): void;
}
```

All methods are synchronous (per spec §8 — composes with `World.onDiff`'s synchronous listener invariants). `writeAttachment` returns the finalized descriptor (sinks may rewrite `ref` from `{ dataUrl: '<placeholder>' }` to a populated data URL, or downgrade to sidecar).

### `SessionSource`

```typescript
interface SessionSource {
  readonly metadata: SessionMetadata;
  readSnapshot(tick: number): WorldSnapshot;
  readSidecar(id: string): Uint8Array;
  ticks(): IterableIterator<SessionTickEntry>;
  commands(): IterableIterator<RecordedCommand>;
  executions(): IterableIterator<CommandExecutionResult>;
  failures(): IterableIterator<TickFailure>;
  markers(): IterableIterator<Marker>;
  attachments(): IterableIterator<AttachmentDescriptor>;
  toBundle(): SessionBundle;
}
```

Read interface paired with `SessionSink`. `MemorySink` and `FileSink` both implement the union (`SessionSink & SessionSource`).

### `MemorySink`

```typescript
new MemorySink(options?: MemorySinkOptions);

interface MemorySinkOptions {
  allowSidecar?: boolean;          // default false; oversize attachments throw without it
  sidecarThresholdBytes?: number;  // default 65536 (64 KiB)
}
```

Holds writes in in-memory arrays. Sidecar attachment bytes go in a parallel internal `Map<string, Uint8Array>` accessed via `readSidecar(id)`.

Defaults: attachments under the threshold embed as `data:<mime>;base64,...` URLs in the manifest. Attachments over the threshold throw `SinkWriteError(code: 'oversize_attachment')` UNLESS `allowSidecar: true` is set, in which case they're stored as sidecars. Callers can also force sidecar storage explicitly by passing `ref: { sidecar: true }` to `writeAttachment`.

`toBundle()` returns the canonical strict-JSON `SessionBundle`. The first written snapshot becomes `bundle.initialSnapshot`; subsequent snapshots populate `bundle.snapshots[]`. Throws `SinkWriteError(code: 'no_snapshots')` if no snapshots have been written.

## Session Recording — FileSink

Disk-backed `SessionSink & SessionSource`.

### `FileSink`

```typescript
new FileSink(bundleDir: string);
```

On-disk layout:

```
<bundleDir>/
  manifest.json            // SessionMetadata + dataUrl attachments + sidecar refs
  ticks.jsonl              // append-only; one SessionTickEntry per line
  commands.jsonl           // append-only; one RecordedCommand per line
  executions.jsonl         // append-only; one CommandExecutionResult per line
  failures.jsonl           // append-only; one TickFailure per line
  markers.jsonl            // append-only; one Marker per line
  snapshots/<tick>.json    // one snapshot per file
  attachments/<id>.<ext>   // sidecar bytes (extension from MIME table)
```

Manifest is rewritten on `open()`, on each `writeSnapshot()` (advancing `metadata.persistedEndTick`), and on `close()` — atomic via `.tmp.json` → `.json` rename. Per-tick rewrites are NOT performed.

**Default attachment policy: sidecar.** FileSink is disk-backed; the disk-storage path is the natural default. Pass `descriptor.ref: { dataUrl: '<placeholder>' }` to opt into manifest embedding (only useful for very small blobs).

**MIME → file extension table:** `image/png` → `.png`, `image/jpeg` → `.jpg`, `image/gif` → `.gif`, `image/webp` → `.webp`, `image/svg+xml` → `.svg`, `application/json` → `.json`, `application/octet-stream` → `.bin`, `text/plain` → `.txt`, `text/csv` → `.csv`. Unknown MIMEs fall back to `.bin`. The manifest carries the full MIME so readers can recover the original.

`SessionSource` methods:
- `readSnapshot(tick)`: reads from `snapshots/<tick>.json`. Throws if missing.
- `readSidecar(id)`: reads from `attachments/<id>.<ext>`. Throws if the descriptor is `dataUrl`-mode rather than sidecar.
- `ticks()`, `commands()`, `executions()`, `failures()`, `markers()`: lazy generators streaming the JSONL files. Tolerate a trailing partial line (e.g. a crash mid-write).
- `toBundle()`: reads all snapshot files, sorts numerically, returns a `SessionBundle` whose `initialSnapshot` is the lowest-tick snapshot.

## Session Recording — SessionRecorder

```typescript
class SessionRecorder<TEventMap, TCommandMap, TDebug = JsonValue> {
  constructor(config: SessionRecorderConfig<TEventMap, TCommandMap, TDebug>);
  readonly sessionId: string;
  readonly tickCount: number;
  readonly markerCount: number;
  readonly snapshotCount: number;
  readonly isConnected: boolean;
  readonly isClosed: boolean;
  readonly lastError: SessionRecordingError | null;
  connect(): void;
  disconnect(): void;
  addMarker(marker: NewMarker): string;
  attach(blob: { mime: string; data: Uint8Array }, options?: { sidecar?: boolean }): string;
  takeSnapshot(): SessionSnapshotEntry;
  toBundle(): SessionBundle<TEventMap, TCommandMap, TDebug>;
}

interface SessionRecorderConfig {
  world: World;
  sink?: SessionSink & SessionSource;       // default: new MemorySink()
  snapshotInterval?: number | null;          // default: 1000; null disables periodic
  terminalSnapshot?: boolean;                // default: true
  debug?: { capture(): TDebug | null };
  sourceLabel?: string;
  sourceKind?: 'session' | 'scenario' | 'synthetic';  // default: 'session'. Added in v0.8.0; set by harnesses (e.g., runSynthPlaytest passes 'synthetic'). See ADR 20a.
  policySeed?: number;                        // populated when sourceKind === 'synthetic'. Added in v0.8.0.
}

type NewMarker = Omit<Marker, 'id' | 'createdAt' | 'provenance' | 'tick'> & { tick?: number };
```

`connect()` rejects: poisoned world (`code: 'world_poisoned'`); already-attached payload-capturing recorder (`code: 'recorder_already_attached'`); post-disconnect (`code: 'already_closed'`).

`addMarker(input)` validates per spec §6.1: live-tick `EntityRef`s match via `world.isCurrent`; cells in-bounds; tickRange well-formed; attachment ids registered via `attach()` first. Retroactive markers (tick < world.tick) skip entity liveness and are stamped `validated: false`. All recorder-added markers get `provenance: 'game'`.

`attach(blob, options)` defaults to "no preference; each sink applies its own default policy" — `MemorySink` routes under-threshold attachments to `dataUrl` and oversize to sidecar (with `allowSidecar`); `FileSink` keeps every blob as a sidecar file. Pass `options.sidecar: true` to force sidecar regardless of sink, or `options.sidecar: false` to force `dataUrl` embedding.

## Session Recording — SessionReplayer

```typescript
class SessionReplayer<TEventMap, TCommandMap, TDebug> {
  static fromBundle(bundle: SessionBundle, config: ReplayerConfig): SessionReplayer;
  static fromSource(source: SessionSource, config: ReplayerConfig): SessionReplayer;
  readonly metadata: SessionMetadata;
  readonly markerCount: number;
  markers(): Marker[];
  markersAt(tick: number): Marker[];
  markersOfKind(kind: MarkerKind): Marker[];
  markersByEntity(ref: EntityRef): Marker[];   // exact id+generation match
  markersByEntityId(id: number): Marker[];     // any generation
  snapshotTicks(): number[];
  ticks(): number[];
  openAt(tick: number): World;
  stateAtTick(tick: number): WorldSnapshot;
  tickEntriesBetween(fromTick: number, toTick: number): SessionTickEntry[];  // inclusive both ends
  selfCheck(options?: SelfCheckOptions): SelfCheckResult;
  validateMarkers(): MarkerValidationResult;
}

interface ReplayerConfig {
  worldFactory: (snapshot: WorldSnapshot) => World;  // part of determinism contract per ADR 4
}

interface SelfCheckOptions {
  stopOnFirstDivergence?: boolean;   // default false
  checkState?: boolean;              // default true
  checkEvents?: boolean;             // default true
  checkExecutions?: boolean;         // default true
}

interface SelfCheckResult {
  ok: boolean;
  checkedSegments: number;
  stateDivergences: StateDivergence[];
  eventDivergences: EventDivergence[];
  executionDivergences: ExecutionDivergence[];
  skippedSegments: SkippedSegment[];      // segments containing failedTicks
}

function deepEqualWithPath(a: unknown, b: unknown, path?: string): { equal: boolean; firstDifferingPath?: string };
```

Range checks per spec §9.1: `< startTick` or `> endTick` (or `> persistedEndTick` for incomplete bundles) throws `BundleRangeError`. `tick` at-or-after first `failedTicks` throws `BundleIntegrityError(code: 'replay_across_failure')`. Replay forward without payloads throws `BundleIntegrityError(code: 'no_replay_payloads')`. Missing handler in factory throws `ReplayHandlerMissingError`. Engine version cross-`b` throws `BundleVersionError`; within-`b` warns. Cross-Node-major warns.

`selfCheck` walks consecutive snapshot pairs (initial + periodic + terminal). 3-stream comparison: state via `deepEqualWithPath`, events ordered structural equality, executions ordered structural equality (excluding `submissionSequence` which resets per segment until snapshot v6 lands). Failure spans skipped.

## Session Recording — scenarioResultToBundle

```typescript
function scenarioResultToBundle(
  result: ScenarioResult,
  options?: ScenarioResultToBundleOptions,
): SessionBundle;

interface ScenarioResultToBundleOptions {
  sourceLabel?: string;       // default: result.name
  nodeVersion?: string;        // default: process.version
}
```

Translates `runScenario` output to a `SessionBundle` with `sourceKind: 'scenario'`. One `kind: 'assertion'` marker per `result.checks` outcome with `provenance: 'engine'`. `metadata.startTick` from `result.history.initialSnapshot.tick` (NOT hardcoded 0). Throws `BundleIntegrityError(code: 'no_initial_snapshot')` when scenario was configured with `captureInitialSnapshot: false`. Replayable bundle requires `runScenario({ history: { captureCommandPayloads: true } })`; otherwise `bundle.commands` is empty and replay refuses with `BundleIntegrityError(code: 'no_replay_payloads')`.

## Synthetic Playtest — Policies (v0.7.20)

The synthetic playtest harness drives a `World` via pluggable `Policy` functions for `N` ticks, producing a `SessionBundle` for AI-first feedback loops (Tier 1 of `docs/design/ai-first-dev-roadmap.md`). T1 ships the policy types and three built-in factories. The end-to-end harness `runSynthPlaytest` ships in v0.8.0 (T2).

```typescript
import type { World, ComponentRegistry } from 'civ-engine';

interface PolicyContext<TEventMap, TCommandMap, TComponents = Record<string, unknown>, TState = Record<string, unknown>> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  readonly tick: number;       // The tick about to execute (commands submitted now run during this tick).
  readonly random: () => number;  // Seeded sub-RNG independent of world.rng. Use this, NOT world.random().
}

interface StopContext<TEventMap, TCommandMap, TComponents, TState> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  readonly tick: number;       // The tick that just executed (post-step world.tick).
  readonly random: () => number;
}

type PolicyCommand<TCommandMap> = {
  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];

type Policy<TEventMap, TCommandMap, TComponents, TState> = (
  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
) => PolicyCommand<TCommandMap>[];
```

**Determinism contract:** Policies are external coordinators per spec §11.1 clause 2. They MUST be deterministic given their inputs (`world` state, `tick`, `random()`). Any randomness MUST flow through `ctx.random()` — `Math.random()`, `world.random()`, `Date.now()`, `process.env`, and other non-deterministic sources are forbidden. Policies MUST NOT mutate the world directly; mutation goes through the returned `PolicyCommand[]` which the harness submits via `world.submitWithResult`. `SessionReplayer.selfCheck` is the verification mechanism for non-poisoned bundles.

### `noopPolicy()`

```typescript
function noopPolicy<TEventMap, TCommandMap, TComponents, TState>(): Policy<TEventMap, TCommandMap, TComponents, TState>;
```

Submits nothing. Useful for letting world systems advance without external input.

### `randomPolicy(config)`

```typescript
interface RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState> {
  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap, TComponents, TState>) => PolicyCommand<TCommandMap>>;
  frequency?: number;  // default 1
  offset?: number;     // default 0; must be < frequency
  burst?: number;      // default 1
}

function randomPolicy<TEventMap, TCommandMap, TComponents, TState>(
  config: RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>,
): Policy<TEventMap, TCommandMap, TComponents, TState>;
```

Picks a random catalog entry per emit via `ctx.random()`. Emits on ticks where `tick % frequency === offset`. `burst` controls commands per fired tick. Catalog functions receive `PolicyContext` so they can reference live world state. Throws `RangeError` for empty catalog, non-positive-integer frequency/burst, or out-of-range offset.

### `scriptedPolicy(sequence)`

```typescript
type ScriptedPolicyEntry<TCommandMap> = {
  [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];

function scriptedPolicy<TEventMap, TCommandMap, TComponents, TState>(
  sequence: ScriptedPolicyEntry<TCommandMap>[],
): Policy<TEventMap, TCommandMap, TComponents, TState>;
```

Plays back a pre-recorded list of `{ tick, type, data }` entries. Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the sequence emit nothing. `entry.tick` is matched against `PolicyContext.tick` (the tick about to execute), NOT `world.tick` at submit time. **Bundle → script conversion** (e.g., for regression playback of a recorded bug): bundle `RecordedCommand.submissionTick` is one less than the executing tick, so:

```typescript
const sequence = bundle.commands.map((cmd) => ({
  tick: cmd.submissionTick + 1,
  type: cmd.type,
  data: cmd.data,
}));
```

## Synthetic Playtest — Harness (v0.8.0)

`runSynthPlaytest` drives a `World` via pluggable policies for `N` ticks and produces a `SessionBundle`. T2 of Spec 3.

### `runSynthPlaytest(config)`

```typescript
function runSynthPlaytest<TEventMap, TCommandMap, TComponents, TState, TDebug = JsonValue>(
  config: SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState>,
): SynthPlaytestResult<TEventMap, TCommandMap, TDebug>;
```

Lifecycle (per spec v10 §7.1):
1. **Validate** `maxTicks >= 1`, `policySeed` is finite integer.
2. **Init sub-RNG** from `policySeed` (default: `Math.floor(world.random() * 0x1_0000_0000)`). Happens BEFORE `recorder.connect()` so the initial snapshot captures post-derivation `world.rng` state.
3. **Attach** `SessionRecorder` with `sourceKind: 'synthetic'` and `terminalSnapshot: true` hardcoded. If `recorder.lastError` is set after `connect()` (sink open failure), re-throw — no coherent bundle to return.
4. **Tick loop**: per tick, build `policyCtx`, call each policy in array order, submit returned commands via `world.submitWithResult`, call `world.step()`, check `recorder.lastError`, increment `ticksRun`, evaluate `stopWhen` with a fresh `StopContext`. Stop conditions: `maxTicks`, `stopWhen`, `poisoned`, `policyError`, `sinkError` (mid-tick).
5. **Disconnect** + return `{ bundle, ticksRun, stopReason, ok, policyError? }`.

`ok` is `true` for `'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError'` (bundle is valid up to the failure point); `false` for `'sinkError'`. **Edge case:** `ok` also flips to `false` if a sink failure occurs during `disconnect()` (e.g., the terminal-snapshot write throws). In that case `stopReason` reports the original loop-exit reason but `recorder.lastError !== null`. CI guards should check `result.ok` rather than just `stopReason !== 'sinkError'`.

### `SynthPlaytestConfig`

```typescript
interface SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState> {
  world: World<TEventMap, TCommandMap, TComponents, TState>;
  policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
  maxTicks: number;                    // required, >= 1
  sink?: SessionSink & SessionSource;  // default: new MemorySink()
  sourceLabel?: string;                 // default: 'synthetic'
  policySeed?: number;                  // default: derived from world.random() at construction
  stopWhen?: (ctx: StopContext<...>) => boolean;
  snapshotInterval?: number | null;    // default 1000; null disables periodic snapshots
}
```

`terminalSnapshot` is intentionally NOT exposed — the harness always passes `terminalSnapshot: true` to `SessionRecorder` so every bundle has the `(initial, terminal)` segment for `selfCheck`.

### `SynthPlaytestResult`

```typescript
interface SynthPlaytestResult<TEventMap, TCommandMap, TDebug = JsonValue> {
  bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
  ticksRun: number;
  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError';
  ok: boolean;
  policyError?: { policyIndex: number; tick: number; error: { name; message; stack } };
}
```

`ticksRun` = count of `world.step()` invocations that completed AND were followed by a clean `recorder.lastError` check. With `K = world.tick - startTick`:

| stopReason | ticksRun |
|---|---|
| `'maxTicks'`, `'stopWhen'`, `'policyError'` | `K` |
| `'poisoned'`, `'sinkError'` (mid-tick) | `K - 1` |

`policyError` is populated only when `stopReason === 'policyError'`. `bundle.failures` is NOT modified for policy throws — `failedTicks` is reserved for world-level tick failures.

### Determinism — CI guard pattern

`SessionReplayer.selfCheck()` is meaningful for non-poisoned synthetic bundles where `ticksRun >= 1`. For `stopReason === 'poisoned'` bundles, `selfCheck()` re-throws the original tick failure (the failed-tick-bounded final segment is replayed). For `ticksRun === 0`, the terminal snapshot equals the initial → `selfCheck()` returns `ok:true` vacuously.

```typescript
if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
  expect(replayer.selfCheck().ok).toBe(true);
}
```

### Updated existing surface

- `SessionMetadata.sourceKind` widened to `'session' | 'scenario' | 'synthetic'`. **Breaking** for downstream `assertNever` exhaustive switches (b-bump in 0.8.0).
- `SessionMetadata.policySeed?: number` added. Populated when `sourceKind === 'synthetic'`.
- `SessionRecorderConfig.sourceKind?: 'session' | 'scenario' | 'synthetic'` added (default `'session'`).
- `SessionRecorderConfig.policySeed?: number` added.

## Bundle Corpus Index (v0.8.3)

Manifest-first corpus index over closed `FileSink` bundle directories. `BundleCorpus` lists and filters bundle metadata without reading JSONL streams, snapshots, or sidecar bytes, then lazily opens `FileSink` sources or full `SessionBundle`s when a caller asks for one.

### `BundleCorpus`

```typescript
class BundleCorpus implements Iterable<SessionBundle> {
  constructor(rootDir: string, options?: BundleCorpusOptions);
  readonly rootDir: string;
  readonly invalidEntries: readonly InvalidCorpusEntry[];
  entries(query?: BundleQuery): readonly BundleCorpusEntry[];
  bundles(query?: BundleQuery): IterableIterator<SessionBundle>;
  get(key: string): BundleCorpusEntry | undefined;
  openSource(key: string): SessionSource;
  loadBundle<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug>;
  [Symbol.iterator](): IterableIterator<SessionBundle>;
}
```

`entries()` returns a frozen array of frozen entry objects. `bundles()` and `[Symbol.iterator]()` are lazy: each iterator step loads exactly one full bundle through `FileSink.toBundle()`. This composes directly with `runMetrics(corpus.bundles(query), metrics)` because Spec 8 accepts any synchronous `Iterable<SessionBundle>`.

Corpus order is deterministic: entries sort by `metadata.recordedAt`, then `metadata.sessionId`, then `key`, using JavaScript code-unit string ordering. The root bundle key is `'.'`; child bundles use slash-separated relative paths, regardless of host path separator.

`get(key)` returns `undefined` for a missing key. `openSource(key)` and `loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'`.

### `BundleCorpusScanDepth`

```typescript
type BundleCorpusScanDepth = 'root' | 'children' | 'all';
```

`'root'` indexes only `rootDir` when it is itself a bundle directory. `'children'` checks `rootDir` and one directory level below it. `'all'` recursively scans descendants and is the default. An explicit symlink or junction supplied as `rootDir` is accepted and `rootDir`/`entry.dir` preserve the caller-supplied path. During traversal, discovered symlinked directories and symlinked `manifest.json` files are skipped. Discovery stops once a directory contains a direct regular-file `manifest.json`, so a root bundle is the corpus boundary for child/all scans.

### `BundleCorpusOptions`

```typescript
interface BundleCorpusOptions {
  scanDepth?: BundleCorpusScanDepth; // default 'all'
  skipInvalid?: boolean;             // default false
}
```

Strict mode (`skipInvalid !== true`) throws on the first invalid manifest. Diagnostic mode (`skipInvalid: true`) skips invalid manifest entries and exposes them through `invalidEntries`. Duplicate keys and a missing/non-directory root always throw.

### `BundleCorpusEntry`

```typescript
interface BundleCorpusEntry {
  readonly key: string;
  readonly dir: string;
  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  readonly metadata: BundleCorpusMetadata;
  readonly attachmentCount: number;
  readonly attachmentBytes: number;
  readonly attachmentMimes: readonly string[];
  readonly hasFailures: boolean;
  readonly failedTickCount: number;
  readonly materializedEndTick: number;
  openSource(): SessionSource;
  loadBundle<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
}
```

### `BundleCorpusMetadata`

```typescript
type BundleCorpusMetadata = Readonly<Omit<SessionMetadata, 'failedTicks'>> & {
  readonly failedTicks?: readonly number[];
};
```

`BundleCorpusEntry.metadata` is frozen at runtime and models `failedTicks` as a readonly nested array at the type level.

`materializedEndTick` is a persisted-content horizon, not a replay guarantee. Complete bundles use `metadata.endTick`; incomplete bundles use `metadata.persistedEndTick`. Replay rules still belong to `SessionReplayer`, including failure-bounded replay refusal.

`attachmentBytes` and `attachmentMimes` are derived from manifest descriptors. Sidecar bytes are not read or validated during listing or `loadBundle()`; call `entry.openSource().readSidecar(id)` when you need the actual bytes. Attachments explicitly embedded as `dataUrl` live inside `manifest.json`, so their bytes are part of manifest parse cost and are not a separate content index.

### `BundleQuery`

```typescript
interface BundleQuery {
  key?: string | RegExp;
  sessionId?: OneOrMany<string>;
  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
  sourceLabel?: OneOrMany<string>;
  engineVersion?: OneOrMany<string>;
  nodeVersion?: OneOrMany<string>;
  incomplete?: boolean;
  durationTicks?: NumberRange;
  startTick?: NumberRange;
  endTick?: NumberRange;
  persistedEndTick?: NumberRange;
  materializedEndTick?: NumberRange;
  failedTickCount?: NumberRange;
  policySeed?: number | NumberRange;
  recordedAt?: IsoTimeRange;
  attachmentMime?: OneOrMany<string>;
}
```

All query fields are ANDed. `OneOrMany<T>` fields match any requested value. Missing optional manifest fields do not match a concrete requested value: for example, `sourceLabel: 'random'` excludes entries without `metadata.sourceLabel`. `incomplete: false` matches entries where `metadata.incomplete !== true`.

`key` as a string matches exact corpus key. `key` as a `RegExp` is tested against each key and has `lastIndex` reset before and after each test so stateful regexes are deterministic. `attachmentMime` is any-match: an entry matches if any indexed MIME equals any requested MIME.

Numeric ranges are inclusive and require finite integers. `recordedAt.from` and `recordedAt.to` must be normalized UTC strings that round-trip through `Date.toISOString()`, and `from <= to`. Malformed JavaScript caller shapes, such as unknown query/range keys, non-plain-object ranges, non-boolean `incomplete`, non-string scalar fields, or non-string/non-`RegExp` keys, throw `CorpusIndexError` with code `query_invalid`.

### Query helper types

```typescript
type OneOrMany<T> = T | readonly T[];

interface NumberRange {
  min?: number;
  max?: number;
}

interface IsoTimeRange {
  from?: string;
  to?: string;
}
```

### Errors and invalid entries

```typescript
type CorpusIndexErrorCode =
  | 'root_missing'
  | 'manifest_parse'
  | 'manifest_invalid'
  | 'schema_unsupported'
  | 'duplicate_key'
  | 'query_invalid'
  | 'entry_missing';

interface CorpusIndexErrorDetails {
  readonly [key: string]: JsonValue;
  readonly code: CorpusIndexErrorCode;
  readonly path: string | null;
  readonly key: string | null;
  readonly message: string | null;
}

class CorpusIndexError extends SessionRecordingError {
  readonly details: CorpusIndexErrorDetails;
}

interface InvalidCorpusEntry {
  readonly path: string;
  readonly error: CorpusIndexError;
}
```

The error class extends `SessionRecordingError` so corpus failures compose with existing session-recording error handling. `details` is JSON-safe for logging and machine triage.

## Behavioral Metrics (v0.8.2)

A pure-function corpus reducer over `Iterable<SessionBundle>`. Computes built-in + user-defined metrics; compares baseline vs. current. Tier-2 of the AI-first feedback loop (Spec 8).

### `Metric<TState, TResult>`

```typescript
interface Metric<TState, TResult> {
  readonly name: string;             // unique within a runMetrics call
  create(): TState;                  // initial accumulator state
  observe(state: TState, bundle: SessionBundle): TState;  // pure (output depends only on inputs); in-place mutation OK
  finalize(state: TState): TResult;
  merge?(a: TState, b: TState): TState;  // optional; reserved for v2 parallel processing
  readonly orderSensitive?: boolean; // doc-only; runMetrics does NOT auto-detect
}
```

### `Stats`

```typescript
interface Stats {
  count: number;
  min: number | null;   // null when count === 0 (JSON-stable; NaN would not be)
  max: number | null;
  mean: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}
```

Percentile method: NumPy linear (R-quantile type 7). For `count === 1`, all percentiles equal the single value. For `count === 0`, all numeric fields are `null`.

### `runMetrics(bundles, metrics)`

```typescript
function runMetrics<TEventMap, TCommandMap, TDebug = JsonValue>(
  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
  metrics: Metric<unknown, unknown>[],
): MetricsResult;
```

Single-pass-multiplexed reducer. Iterates `bundles` once; for each bundle, calls every metric's `observe`. Throws `RangeError` on duplicate metric names. The iterable is consumed once — generators get exhausted. `MetricsResult` is `Record<string, unknown>`; per-metric narrowing happens at the consumption site via type assertion.

### Built-in metrics

11 engine-generic metric factories that read only fields the engine guarantees on `SessionBundle`:

| Factory | Reads | Result | Notes |
|---|---|---|---|
| `bundleCount()` | (counter) | `number` | total bundles |
| `sessionLengthStats()` | `metadata.durationTicks` | `Stats` | per-bundle session lengths |
| `commandRateStats()` | `commands.length / durationTicks` | `Stats` | counts SUBMISSIONS (rejected included) |
| `eventRateStats()` | `sum(ticks[].events.length) / durationTicks` | `Stats` | |
| `commandTypeCounts()` | `commands[].type` | `Record<string, number>` | counts SUBMISSIONS by type |
| `eventTypeCounts()` | `ticks[].events[].type` | `Record<string, number>` | |
| `failureBundleRate()` | `metadata.failedTicks?.length > 0` | `number` (ratio) | bundles with any tick failure |
| `failedTickRate()` | `sum(failedTicks) / sum(durationTicks)` | `number` (ratio) | |
| `incompleteBundleRate()` | `metadata.incomplete === true` | `number` (ratio) | recorder-terminated bundles |
| `commandValidationAcceptanceRate()` | `commands[].result.accepted` | `number` (ratio) | submission-stage validator-gate signal |
| `executionFailureRate()` | `executions[].executed === false` | `number` (ratio) | execution-stage handler-failure signal |

`commandValidationAcceptanceRate` and `executionFailureRate` read different bundle sources by design: validator-rejected commands appear in `bundle.commands[].result.accepted=false` but NEVER in `bundle.executions` (validators short-circuit before queueing). The two metrics together cover both regression types.

### `compareMetricsResults(baseline, current)`

```typescript
type NumericDelta = { baseline: number | null; current: number | null; delta: number | null; pctChange: number | null };
type OpaqueDelta = { baseline: unknown; current: unknown; equal: boolean };
type OnlyInComparison = { baseline?: unknown; current?: unknown; onlyIn: 'baseline' | 'current' };
type MetricDelta = NumericDelta | OpaqueDelta | { [key: string]: MetricDelta | OnlyInComparison };
type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;

function compareMetricsResults(baseline: MetricsResult, current: MetricsResult): MetricsComparison;
```

Pure delta computation, no regression judgment. Numeric leaves get `delta` and `pctChange`; non-numeric leaves get `equal: deepEqual(a, b)`. Recurses through nested records (e.g., `commandTypeCounts: Record<string, number>` reports per-key only-in-side at the inner level too). `pctChange` conventions: `0/0 → 0`, `nonzero/0 → ±Infinity`, `null` inputs propagate to `null` deltas. Arrays are opaque (no per-element diff in v1).


## Bundle Viewer (v0.8.7)

`BundleViewer` is a programmatic agent-driver API over a `SessionBundle`. See `docs/guides/bundle-viewer.md` for the full guide.

### `BundleViewer<TEventMap, TCommandMap, TDebug>`

```ts
class BundleViewer<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  constructor(
    bundle: SessionBundle<TEventMap, TCommandMap, TDebug>,
    options?: BundleViewerOptions<TEventMap, TCommandMap>,
  );

  static fromSource<TEventMap, TCommandMap, TDebug>(
    source: SessionSource,
    options?: BundleViewerOptions<TEventMap, TCommandMap>,
  ): BundleViewer<TEventMap, TCommandMap, TDebug>;

  readonly bundle: Readonly<SessionBundle<TEventMap, TCommandMap, TDebug>>;
  readonly metadata: Readonly<SessionMetadata>;
  readonly recordedRange: { readonly start: number; readonly end: number };
  readonly replayableRange: { readonly start: number; readonly end: number };
  readonly markerIndex: ReadonlyMap<string, Marker>;

  ticks(): readonly number[];
  atTick(tick: number): TickFrame<TEventMap, TCommandMap, TDebug>;
  atMarker(id: string): TickFrame<TEventMap, TCommandMap, TDebug>;
  timeline(): IterableIterator<TickFrame<TEventMap, TCommandMap, TDebug>>;

  markers(query?: MarkerQuery): IterableIterator<Marker>;
  events(query?: EventQuery<TEventMap>): IterableIterator<RecordedTickEvent<TEventMap>>;
  commands(query?: CommandQuery<TCommandMap>): IterableIterator<RecordedCommand<TCommandMap>>;
  executions(query?: ExecutionQuery<TCommandMap>): IterableIterator<CommandExecutionResult<keyof TCommandMap>>;
  failures(query?: TickRange): IterableIterator<TickFailure>;

  replayer(): SessionReplayer<TEventMap, TCommandMap, TDebug>;
}
```

`recordedRange.end = min(metadata.endTick, max stream tick)` is content-bounded. `replayableRange.end = metadata.incomplete ? metadata.persistedEndTick : metadata.endTick`. `atTick(t)` accepts `t in recordedRange`; `frame.state()` enforces `replayableRange` via `openAt`.

### `BundleViewerOptions`

```ts
interface BundleViewerOptions<TEventMap, TCommandMap> {
  worldFactory?: ReplayerConfig<TEventMap, TCommandMap>['worldFactory'];
}
```

Required for `frame.state()`, `frame.snapshot()`, snapshot-fallback `frame.diffSince()`, and `viewer.replayer()`. Pure-metadata navigation works without it.

### `TickFrame`

```ts
interface TickFrame<TEventMap, TCommandMap, TDebug> {
  readonly tick: number;
  readonly events: readonly RecordedTickFrameEvent<TEventMap>[];
  readonly commands: readonly RecordedCommand<TCommandMap>[];
  readonly executions: readonly CommandExecutionResult<keyof TCommandMap>[];
  readonly markers: readonly Marker[];
  readonly diff: Readonly<TickDiff> | null;
  readonly debug: Readonly<TDebug> | null;
  readonly metrics: Readonly<WorldMetrics> | null;
  state(): World<TEventMap, TCommandMap>;
  snapshot(): WorldSnapshot;
  diffSince(otherTick: number, options?: DiffOptions): BundleStateDiff;
}
```

Selective runtime freezing: outer frame `Object.freeze`d at construction, per-tick arrays frozen once at viewer construction, elements not individually frozen.

Sparse ticks (in `recordedRange` but no `SessionTickEntry`): `events: []`, `diff: null`, `metrics: null`, `debug: null`. Independent streams (`commands`, `executions`, `markers`, `failures`) still surface from per-tick indices when present.

### `RecordedTickFrameEvent` / `RecordedTickEvent`

```ts
interface RecordedTickFrameEvent<TEventMap> { type: keyof TEventMap & string; data: TEventMap[keyof TEventMap]; }
interface RecordedTickEvent<TEventMap> { tick: number; type: keyof TEventMap & string; data: TEventMap[keyof TEventMap]; }
```

Frame-anchored events omit `tick` (use `frame.tick`); iterator-yielded events carry `tick` because iteration spans ticks.

### `BundleStateDiff` and `DiffOptions`

```ts
interface BundleStateDiff {
  fromTick: number;       // = min(thisTick, otherTick)
  toTick: number;         // = max(thisTick, otherTick)
  source: 'tick-diffs' | 'snapshot';
  diff: TickDiff;
}

interface DiffOptions { fromSnapshot?: boolean; }
```

`frame.diffSince(otherTick)` folds recorded `TickDiff`s by default. Falls back to snapshot path (via `diffSnapshots`) when `options.fromSnapshot === true`, or any tick in `(fromTick, toTick]` lacks a `SessionTickEntry`, or any entity ID is recycled in the range. Failure-in-range throws `BundleIntegrityError({ code: 'replay_across_failure', failedTicks, fromTick, toTick })`.

### Query types

```ts
interface TickRange { from?: number; to?: number; }
interface MarkerQuery extends TickRange { kind?: OneOrMany<MarkerKind>; provenance?: OneOrMany<MarkerProvenance>; id?: string | RegExp; }
interface EventQuery<TEventMap> extends TickRange { type?: OneOrMany<keyof TEventMap & string>; }
interface CommandQuery<TCommandMap> extends TickRange { type?: OneOrMany<keyof TCommandMap & string>; outcome?: OneOrMany<'accepted' | 'rejected'>; }
interface ExecutionQuery<TCommandMap> extends TickRange { type?: OneOrMany<keyof TCommandMap & string>; executed?: boolean; }
```

Bound validation is eager (synchronous at the call site). `from > to` is a no-op.

### `BundleViewerError`

```ts
type BundleViewerErrorCode = 'marker_missing' | 'tick_out_of_range' | 'world_factory_required' | 'query_invalid';

interface BundleViewerErrorDetails {
  readonly [key: string]: JsonValue;
  readonly code: BundleViewerErrorCode;
  readonly tick: number | null;
  readonly markerId: string | null;
  readonly message: string | null;
}

class BundleViewerError extends SessionRecordingError {
  override readonly details: BundleViewerErrorDetails;
}
```

Codes are scoped to the class. Replay materialization paths bubble `BundleRangeError` / `BundleIntegrityError` / `ReplayHandlerMissingError` from `SessionReplayer`; `frame.diffSince` is the one place the viewer constructs a `BundleIntegrityError` itself (with enriched `details` for the range).

### `diffSnapshots`

```ts
function diffSnapshots(a: WorldSnapshot, b: WorldSnapshot, opts?: { tick?: number }): TickDiff;
```

Standalone snapshot-pair helper exported from `src/snapshot-diff.ts` and re-exported via `bundle-viewer.ts`. Returns a `TickDiff`-shaped result. Result `tick` defaults to `opts.tick ?? b.tick ?? 0`. Engine currently produces v5 `WorldSnapshot`s only; non-v5 inputs throw.

**Scope (intentional):** TickDiff slots only — `entities` (created/destroyed via alive transitions), `components`, `resources`, `state`, `tags`, `metadata`. Snapshot-only fields are excluded: `WorldSnapshot.config` and nested fields, `WorldSnapshot.rng`, `WorldSnapshot.componentOptions`, `WorldSnapshot.entities.{generations,alive,freeList}` directly, `WorldSnapshot.version`. These are registration / determinism invariants and belong outside a state diff.

### `BundleCorpusEntry.openViewer` (Spec 7 surface extension)

```ts
interface BundleCorpusEntry {
  // ... existing fields
  openViewer<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(
    options?: BundleViewerOptions<TEventMap, TCommandMap>,
  ): BundleViewer<TEventMap, TCommandMap, TDebug>;
}
```

One-line corpus-to-viewer composition. Calls `loadBundle()` and constructs a `BundleViewer`. The corpus entry remains frozen after the method is attached.


## Strict Mode (v0.8.8)

Opt-in `WorldConfig.strict` flag rejects content mutations called outside system phases / setup window / `runMaintenance(fn)` callbacks. See `docs/guides/strict-mode.md` for the full guide.

### `WorldConfig.strict?: boolean`

Default `false`. When `true`, the 22 gated mutation methods (createEntity, destroyEntity, addComponent, setComponent, removeComponent, patchComponent, setPosition, addResource, removeResource, setResourceMax, setProduction, setConsumption, addTransfer, removeTransfer, setState, deleteState, addTag, removeTag, setMeta, deleteMeta, emit, random) throw `StrictModeViolationError` when called outside a writable phase.

### `World.endSetup()` / `World.runMaintenance` / `World.isStrict` / `World.isInTick` / `World.isInSetup` / `World.isInMaintenance`

```ts
class World<...> {
  endSetup(): void;
  runMaintenance<T>(fn: () => T): T;
  isStrict(): boolean;
  isInTick(): boolean;
  isInSetup(): boolean;
  isInMaintenance(): boolean;
}
```

`endSetup()`: explicitly close the construction-time setup window. Idempotent. The first tick (any entry point) implicitly invokes it.

`runMaintenance(fn)`: out-of-tick mutation block. Depth-counted reentrant (no-op nesting; only outermost exit clears the gate). `try`/`finally` decrements the counter even when `fn` throws.

### `StrictModeViolationError`

```ts
type StrictModePhase = 'between-ticks' | 'after-failure';

interface StrictModeViolationDetails {
  readonly [key: string]: JsonValue;
  readonly code: 'strict_mode_violation';
  readonly method: string;
  readonly phase: StrictModePhase;
  readonly advice: string;
}

class StrictModeViolationError extends Error {
  readonly details: StrictModeViolationDetails;
}
```

Thrown by `assertWritable(this, 'methodName')` at the top of every gated mutation method when `strict: true` and none of `_inTickPhase`, `_inSetup`, `_maintenanceDepth > 0` is set.


## AI Playtester Agent (v0.8.9, extended v0.8.11)

Async sibling to `runSynthPlaytest` for LLM-driven (or any other async-decision) playtesters. See `docs/guides/ai-playtester.md` for the full guide. v0.8.11 added in-flight marker emission via the context — see `addMarker` / `attach` below.

### `AgentDriver<TEventMap, TCommandMap>`

```ts
interface AgentDriverContext<TEventMap, TCommandMap> {
  readonly world: World<TEventMap, TCommandMap>;
  // ctx.tick semantics differ between callbacks:
  // - decide(ctx): pre-step. ctx.tick === world.tick + 1 (the tick about to run).
  //   Calling addMarker({ tick: ctx.tick, ... }) throws MarkerValidationError
  //   code '6.1.tick_future' because the recorder rejects ticks > world.tick.
  // - stopWhen(ctx): post-step. ctx.tick === world.tick (the just-completed
  //   tick). Calling addMarker({ tick: ctx.tick, ... }) is valid.
  // Default behavior (omit input.tick) works in both — recorder defaults to
  // world.tick at the moment of call.
  readonly tick: number;
  readonly startTick: number;
  readonly tickIndex: number;
  // v0.8.11 additions: emit markers + attach blobs into the playtest's recorder.
  // Callers should typically OMIT input.tick.
  addMarker(input: NewMarker): string;
  // Default sink is MemorySink({ allowSidecar: true }) so oversize PNGs route
  // to sidecar storage instead of terminating the recorder.
  attach(blob: { mime: string; data: Uint8Array }, options?: { sidecar?: boolean }): string;
}

interface AgentDriver<TEventMap, TCommandMap> {
  decide(ctx: AgentDriverContext<TEventMap, TCommandMap>):
    Promise<readonly PolicyCommand<TCommandMap>[]> | readonly PolicyCommand<TCommandMap>[];
  report?(bundle: SessionBundle<TEventMap, TCommandMap>):
    Promise<unknown> | unknown;
}
```

### `runAgentPlaytest(config)`

```ts
interface AgentPlaytestConfig<TEventMap, TCommandMap, TComponents, TState> {
  world: World<TEventMap, TCommandMap, TComponents, TState>;
  agent: AgentDriver<TEventMap, TCommandMap>;
  maxTicks: number;
  stopWhen?(ctx: AgentDriverContext<TEventMap, TCommandMap>): boolean | Promise<boolean>;
  // Default sink (when omitted) is MemorySink({ allowSidecar: true }) as of v0.8.11
  // so agent-emitted screenshots over the 64 KiB threshold route to sidecar
  // instead of throwing oversize_attachment.
  sink?: SessionSink & SessionSource;
  sourceLabel?: string;
  snapshotInterval?: number | null;
}

type AgentStopReason = 'maxTicks' | 'stopWhen' | 'poisoned' | 'agentError' | 'sinkError';

interface AgentPlaytestResult<TEventMap, TCommandMap> {
  bundle: SessionBundle<TEventMap, TCommandMap>;
  // v0.8.11: same sink the runner used. Default-sink callers can call
  // `result.source.readSidecar(id)` to retrieve sidecar bytes for attachments.
  source: SessionSink & SessionSource;
  ticksRun: number;
  stopReason: AgentStopReason;
  ok: boolean;
  agentError?: { tick: number; error: { name: string; message: string; stack: string | null } };
  report?: unknown;
}

function runAgentPlaytest<...>(config): Promise<AgentPlaytestResult<...>>;
```

### `bundleSummary(bundle)`

```ts
interface BundleSummary {
  sessionId: string;
  recordedAt: string;
  engineVersion: string;
  nodeVersion: string;
  sourceKind: 'session' | 'scenario' | 'synthetic';
  sourceLabel: string | null;
  startTick: number;
  endTick: number;
  durationTicks: number;
  incomplete: boolean;
  totalCommands: number;
  acceptedCommands: number;
  acceptedCommandRate: number;
  commandTypeCounts: Record<string, number>;
  totalEvents: number;
  eventTypeCounts: Record<string, number>;
  markerCount: number;
  markersByKind: Record<string, number>;
  failureCount: number;
  failedTicks: number[];
}

function bundleSummary(bundle: SessionBundle): BundleSummary;
```

Pure function. JSON-serializable result designed to fit a small LLM context window.
