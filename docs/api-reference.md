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
- [Path Service](#path-service)
- [VisibilityMap](#visibilitymap)
- [Noise](#noise)
- [Cellular Automata](#cellular-automata)
- [Map Generation](#map-generation)
- [Behavior Tree](#behavior-tree)
- [Client Adapter](#client-adapter)
- [Render Adapter](#render-adapter)
- [Scenario Runner](#scenario-runner)
- [World History Recorder](#world-history-recorder)
- [World Debugger](#world-debugger)

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
- `minimal` is the QA/staging profile. `step()` records coarse per-tick metrics such as counts and total duration, but skips detailed phase timings and per-system timing entries. `submit()` takes the lower-overhead boolean fast path when no command-result listeners are attached.
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
  detectInPlacePositionMutations?: boolean; // Full-scan fallback (default: true)
  instrumentationProfile?: InstrumentationProfile; // Implicit instrumentation level (default: 'full')
}
```

### `System`

```typescript
// src/world.ts
type System<TEventMap, TCommandMap> = (world: World<TEventMap, TCommandMap>) => void;
```

A system is a pure function that receives the `World` and runs game logic. Systems execute by phase, preserving registration order within each phase. Bare function registrations default to the `update` phase.

### `SystemRegistration`

```typescript
// src/world.ts
interface SystemRegistration<TEventMap, TCommandMap> {
  name?: string;
  phase?: 'input' | 'preUpdate' | 'update' | 'postUpdate' | 'output';
  before?: string[];
  after?: string[];
  execute: System<TEventMap, TCommandMap>;
}
```

Optional system registration object for naming systems and assigning a lifecycle phase. The `before` and `after` fields declare ordering constraints between named systems within the same phase (see [System Ordering Constraints](#registersystemfnorconfig)).

### `LooseSystem`

```typescript
// src/world.ts
type LooseSystem = (world: World<any, any>) => void;
```

A system typed against a bare `World` that does not need explicit casts when registered into a generically typed world. Useful for utility systems that do not depend on specific event or command maps.

### `LooseSystemRegistration`

```typescript
// src/world.ts
interface LooseSystemRegistration {
  name?: string;
  phase?: 'input' | 'preUpdate' | 'update' | 'postUpdate' | 'output';
  before?: string[];
  after?: string[];
  execute: LooseSystem;
}
```

Same shape as `SystemRegistration` but uses `LooseSystem` instead.

### `ComponentRegistry`

```typescript
// src/types.ts
type ComponentRegistry = Record<string, unknown>;
```

Optional third type parameter to `World<TEventMap, TCommandMap, TComponents>`. When specified, component methods (`addComponent`, `getComponent`, `setComponent`, `patchComponent`, `removeComponent`, `query`) infer value types from the registry keys, eliminating manual generic annotations.

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
  spatial: { fullScans: number; scannedEntities: number; explicitSyncs: number };
  durationMs: {
    total: number;
    commands: number;
    spatialSync: number;
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
  | 'spatialSync'
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

Compatibility error thrown by `world.step()` when the tick fails at runtime.

### `WorldSnapshot`

```typescript
// src/serializer.ts
interface WorldSnapshot {
  version: 4;
  config: WorldConfig;
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
  resources: ResourceStoreState;
  rng: RandomState;
  state: Record<string, unknown>;
  tags: Record<string, EntityId[]>;
  metadata: Record<string, Array<[EntityId, Record<string, string | number>]>>;
}
```

JSON-serializable snapshot of the entire world state. Used by `serialize()` and `World.deserialize()`. Version 4 adds world-level state, entity tags, and entity metadata. Version 3 includes deterministic RNG state so a saved simulation resumes the same random sequence. Version 2 includes resource registrations, pools, rates, transfers, and the next transfer ID. Version 1, 2, and 3 snapshots are still accepted by `World.deserialize()` for backward compatibility. Systems, validators, handlers, and event listeners are not included (they are functions, not data).

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

### `GridPathConfig`

```typescript
// src/path-service.ts
interface GridPathConfig {
  start: Position;
  goal: Position;
  width?: number;
  height?: number;
  occupancy?: OccupancyGrid;
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

Configuration for `findGridPath()`. Supply `width` and `height` directly, or pass an `OccupancyGrid` and dimensions are inferred.

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
| `config.detectInPlacePositionMutations` | `boolean` | No | Whether each tick scans position components to detect direct object mutations (default: `true`) |

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

### Components

#### `registerComponent<T>(key)`

```typescript
registerComponent<T>(key: string): void
```

Registers a component type by string key. Must be called before using `addComponent`, `getComponent`, `removeComponent`, or `query` with this key.

**Throws:** `Error` if a component with this key is already registered.

```typescript
interface Health { hp: number; maxHp: number }
world.registerComponent<Health>('health');
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

#### `markPositionDirty(entity, key?)`

```typescript
markPositionDirty(entity: EntityId, key?: string): void
```

Synchronizes a position component that was mutated in place. This is mainly useful when `detectInPlacePositionMutations` is set to `false` and callers want to avoid the per-tick full-scan fallback.

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

**Throws:**
- `Error` if a constraint creates a cycle within a phase
- `Error` if a constraint references a system in a different phase
- `Error` if a constraint references a non-existent system name

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
4. Sync spatial index (optional direct-position-mutation fallback scan)
5. Run systems (`input`, `preUpdate`, `update`, `postUpdate`, `output`)
6. Process resource rates and transfers
7. Build diff (collect dirty state into `TickDiff`)
8. Update metrics
9. Notify diff listeners
10. Increment tick counter

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

**Returns:** `true` if the command passed all validators and was queued, `false` if rejected. This is the compatibility wrapper over `submitWithResult()`.

When `instrumentationProfile` is `'minimal'` or `'release'` and no command-result listeners are attached, `submit()` takes a boolean fast path and does not allocate a `CommandSubmissionResult`. Use `submitWithResult()` when the caller explicitly needs the structured outcome.

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
    world: World<TEventMap, TCommandMap>,
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
  fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => void,
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

Non-entity structured state stored at the world level. Values must be JSON-compatible. World state is included in serialization (snapshot v4) and tick diffs.

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

String tags and key-value metadata attached to individual entities. Both are cleaned up automatically on `destroyEntity()` and included in serialization (snapshot v4) and tick diffs.

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

#### `serialize()`

```typescript
serialize(): WorldSnapshot
```

Captures the entire world state as a JSON-serializable snapshot. Includes entity state, all component data, resource state, grid config, and tick count. Does **not** include systems, validators, handlers, or event listeners (they are functions).

```typescript
const snapshot = world.serialize();
const json = JSON.stringify(snapshot);
```

#### `World.deserialize(snapshot, systems?)`

```typescript
static deserialize<TEventMap, TCommandMap>(
  snapshot: WorldSnapshot,
  systems?: Array<System<TEventMap, TCommandMap> | SystemRegistration<TEventMap, TCommandMap>>,
): World<TEventMap, TCommandMap>
```

Restores a world from a snapshot. Optionally accepts systems to re-register. After deserializing, you must also re-register:
- Command validators and handlers
- Event listeners

**Throws:**
- `Error` if `snapshot.version` is not `1`, `2`, `3`, or `4`
- `Error` if entity state arrays have mismatched lengths

Version 1 snapshots load with an empty resource store. Version 2 snapshots restore resource registrations, pools, rates, transfers, and the next transfer ID. Version 3 snapshots also restore deterministic RNG state. Version 4 snapshots also restore world-level state, entity tags, and entity metadata.

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

Returns timing and count instrumentation from the most recent tick, or `null` before the first tick. Metrics include simulation budget data, last-tick command counts, entity/component counts, query cache hit/miss counts, spatial scan counts, system timings, and tick section timings.

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
  callback: (id: EntityId, world: World<TEventMap, TCommandMap>) => void,
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
  callback: (id: EntityId, world: World<TEventMap, TCommandMap>) => void,
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

Builds the default cache key used by `createGridPathQueue()`. Returns `undefined` when the request contains custom `blocked`, `cost`, or `heuristic` functions and no explicit `cacheKey` is supplied.

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

Layers multiple noise samples at increasing frequency and decreasing amplitude (fractal Brownian motion). Produces more natural-looking terrain than single-octave noise. Returns values in `[-1, 1]`.

| Parameter | Default | Description |
|---|---|---|
| `octaves` | (required) | Number of noise layers |
| `persistence` | `0.5` | Amplitude multiplier per octave (lower = smoother) |
| `lacunarity` | `2.0` | Frequency multiplier per octave (higher = more detail) |

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
