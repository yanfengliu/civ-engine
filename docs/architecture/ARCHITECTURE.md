# Architecture

## Overview

Civ-engine is a general-purpose, headless, AI-native 2D grid-based game engine. Built in Node.js/TypeScript with a strict ECS (Entity-Component-System) architecture.

**AI-native** means the engine is designed to be operated by AI agents, not human players directly. Humans provide high-level game designs; AI agents write game logic, submit commands, and observe state. Every design decision prioritizes machine-readability: deterministic tick execution, JSON-serializable state, structured diffs, typed command/event interfaces, and a purely programmatic API with no interactive UI.

The engine provides reusable infrastructure (entities, components, spatial indexing, events, commands, resources, serialization) that game projects consume. It outputs state changes that a separate client can render; it contains no game-specific logic, rendering, or UI code.

## Component Map

| Component      | File                     | Responsibility                                                                         |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| World          | `src/world.ts`           | Top-level API, owns all subsystems, phased system pipeline, metrics, spatial index sync |
| EntityManager  | `src/entity-manager.ts`  | Entity creation/destruction, ID recycling via free-list, generation counters           |
| ComponentStore | `src/component-store.ts` | Sparse array storage per component type, generation counter for change detection       |
| SpatialGrid    | `src/spatial-grid.ts`    | Sparse occupied-cell grid plus read-only view, neighbor/radius queries                 |
| GameLoop       | `src/game-loop.ts`       | Fixed-timestep loop, step() for testing, start()/stop() for real-time, speed multiplier, pause/resume |
| EventBus       | `src/event-bus.ts`       | Typed pub/sub event bus, per-tick buffer, listener registry                            |
| CommandQueue   | `src/command-queue.ts`   | Typed command buffer, push/drain interface                                             |
| CommandTransaction | `src/command-transaction.ts` | Atomic propose-validate-commit-or-abort builder over World; buffers component/position/resource mutations + events + precondition predicates, applies all-or-nothing on `commit()` |
| Serializer     | `src/serializer.ts`      | Versioned WorldSnapshot types for state serialization                                  |
| Diff           | `src/diff.ts`            | TickDiff type for per-tick change sets                                                 |
| ResourceStore  | `src/resource-store.ts`  | Resource pools, production/consumption rates, transfers, dirty tracking                |
| OccupancyGrid  | `src/occupancy-grid.ts`  | Deterministic blocked-cell, footprint, reservation, lifecycle binding, blocker metadata, metrics, and sub-cell crowding tracking |
| Layer          | `src/layer.ts`           | Generic typed overlay map at configurable downsampled resolution; sparse cell storage with default-value semantics, JSON-serializable; multi-resolution field data (pollution, influence, weather, danger, etc.) |
| JSON helpers   | `src/json.ts`            | JSON-compatible component validation and fingerprints for mutation detection           |
| Noise          | `src/noise.ts`           | Seedable 2D simplex noise, octave layering utility                                     |
| Cellular       | `src/cellular.ts`        | Cellular automata step function, immutable CellGrid                                    |
| MapGen         | `src/map-gen.ts`         | MapGenerator interface, createTileGrid bulk tile-entity helper                         |
| Pathfinding    | `src/pathfinding.ts`     | Generic A* pathfinding, graph-agnostic with user-defined callbacks          |
| Path Service   | `src/path-service.ts`    | Grid path helper, deterministic path queue, and cache for batched request handling     |
| RenderAdapter  | `src/render-adapter.ts`  | Projects world state into renderer-facing snapshots and diffs with generation-aware refs |
| ScenarioRunner | `src/scenario-runner.ts` | Headless setup/run/check harness built on World, WorldDebugger, and WorldHistoryRecorder |
| VisibilityMap  | `src/visibility-map.ts`  | Per-player visible/explored cell tracking for fog-of-war style mechanics               |
| WorldDebugger  | `src/world-debugger.ts`  | Structured debug snapshots, warnings, and probe helpers for engine and standalone utilities |
| ClientAdapter  | `src/client-adapter.ts`  | Bridges World API to typed client messages via send callback |
| BehaviorTree   | `src/behavior-tree.ts`   | Generic BT framework: NodeStatus, BTNode, Selector, Sequence, ReactiveSelector, ReactiveSequence, Action, Condition, BTState, createBehaviorTree, clearRunningState |
| Public exports | `src/index.ts`           | Barrel export for the intended package API                                             |
| Types          | `src/types.ts`           | Shared type definitions (EntityId, EntityRef, Position, WorldConfig, InstrumentationProfile) |

## Data Flow

```
World.step()
  -> GameLoop.step()
    -> World.executeTick()
      -> World.eventBus.clear()       [reset buffer from previous tick]
      -> World.entityManager.clearDirty()
      -> World.clearComponentDirty()   [clear dirty flags on all stores]
      -> World.processCommands()       [drain queue, run handlers]
      -> input systems
      -> preUpdate systems
      -> update systems
      -> postUpdate systems
      -> output systems
      -> World.resourceStore.processTick()  [production, consumption, transfers]
      -> World.buildDiff()             [collect dirty state into TickDiff]
      -> World.getMetrics() state updated   [detailed in `full`, coarse in `minimal`, skipped by implicit `step()` in `release`]
      -> notify onDiff listeners
    -> tick++
```

### Spatial Index Sync

Position writes through `world.setPosition()` or `world.setComponent()` with the configured position component (default `'position'`, configurable via `positionKey` in `WorldConfig`) update the component store and spatial grid in lockstep — the grid stays consistent without any per-tick scan. In-place mutation of position objects (e.g. `world.getComponent(id, 'position').x = 5`) is **not** auto-detected and is a no-op for the grid; game code must call `setPosition` for movement to take effect.

### Entity Destruction

`destroyEntity(id)` performs immediate cleanup:
- Removes entity from grid using `previousPositions` (the grid's last-seen position, kept in sync by `setPosition`)
- Removes all components from all stores
- Removes all resource pools, rates, and transfers for the entity
- Marks entity as dead in EntityManager (ID available for recycling)

## Boundaries

- **World** is the only public entry point. EntityManager, ComponentStore, GameLoop are internal implementation details.
- **Systems** are pure functions `(world: World) => void` or registration objects with a `phase` and `name`. Phases are intentionally lightweight and ordered as `input`, `preUpdate`, `update`, `postUpdate`, `output`.
- **Components** are pure data interfaces. No methods, no inheritance.
- **SpatialGrid** is a sparse map of occupied cells. The grid is updated lock-step with position writes — every `world.setPosition` / `world.setComponent` on the configured `positionKey` inserts/moves the entity in the grid in the same call, so no per-tick scan is needed. User systems read grid state via `world.grid.getAt()` / `world.grid.getNeighbors()` / `world.grid.getInRadius()`. The `world.grid` property is a read-only delegate at runtime: `getAt()` returns a fresh `Set` copy on each call, the mutating `insert`/`remove`/`move` methods of the underlying `SpatialGrid` are not exposed, and the delegate object itself is `Object.freeze`d in the constructor (since v0.7.3) so attempts to monkey-patch its methods throw `TypeError` in strict mode. This makes the read-only-delegate promise structural rather than convention-only.
- **GameLoop** handles timing only. It knows nothing about entities, components, or systems.
- **EventBus** is owned by World. Systems emit and subscribe via `world.emit()` / `world.on()`. External consumers read events via `world.getEvents()` between ticks. Do not call `eventBus.clear()` directly — World handles this.
- **CommandQueue** is owned by World. External code submits commands via `world.submit()` or `world.submitWithResult()`, registers validators via `world.registerValidator()`, and registers handlers via `world.registerHandler()`. Do not access the queue directly.
- **CommandTransaction** is a synchronous builder created via `world.transaction()`. It is generic over `<TEventMap, TCommandMap, TComponents, TState>` (matching `World`'s generic order); typed component / state access works inside the transaction the same way it works inside `world.setComponent` / `world.setState`. The transaction buffers proposed mutations (`setComponent`/`addComponent`/`patchComponent`/`removeComponent`/`setPosition`/`addResource`/`removeResource`), buffered events (`emit` — JSON-compat validated at buffer time, not at commit), and `require()` precondition predicates. **Predicates receive a `ReadOnlyTransactionWorld` façade**, not the live `World` — write methods (`setComponent`, `setState`, `emit`, `addResource`, `removeResource`, `destroyEntity`, etc.) are excluded at the type level and rejected at runtime so a side-effecting predicate cannot violate the "world untouched on precondition failure" guarantee. On `commit()` the engine calls `world.warnIfPoisoned('transaction')` (warns once per poison cycle), then runs all preconditions in registration order; if any returns `false` or a string, no mutation or event is applied and the transaction returns `{ ok: false, code: 'precondition_failed', reason }`. Otherwise mutations are applied to the world in registration order via the existing public mutation API (so they get the same liveness/JSON-compat validation as direct calls), then events are emitted via `EventBus`. Transactions are single-use: `commit()` after a previous `commit()` throws; `commit()` after `abort()` returns `{ ok: false, code: 'aborted' }` without mutation, and subsequent builder calls throw an "already aborted" error (not "already committed"). If a buffered mutation throws mid-commit, the transaction is still consumed (status flips to `committed` in a `finally` block) so the caller cannot retry and double-apply earlier mutations — the world is in a partially-applied state that the caller must reconcile. Reads inside a precondition or after commit see live world state; transactions do not provide a "shadow" overlay view of their own proposed mutations. Buffered values are stored by reference; caller must not mutate buffered objects between buffering and `commit()`. Entity create/destroy, tags, metadata, and world-state writes are not yet wrapped (v1 surface).
- **Serialization** is accessed via `world.serialize()` and `World.deserialize()`. Snapshot version 5 (WorldSnapshotV5) is the current write format and additionally round-trips per-component `ComponentStoreOptions` (the `componentOptions` field) so `diffMode` survives save/load; version 4 includes state, tags, and metadata; version 3 includes resource state and deterministic RNG state; versions 1 and 2 remain readable for compatibility. `WorldConfig.maxTicksPerFrame` and `WorldConfig.instrumentationProfile` are also serialized when non-default. The `WorldSnapshot` type is exported from `src/serializer.ts`. Snapshots are plain JSON-serializable objects, and component data plus state values are `structuredClone`d at both serialize and deserialize boundaries so callers cannot write through.
- **State Diffs** are accessed via `world.getDiff()` (pull) or `world.onDiff()` (push). The `TickDiff` type is exported from `src/diff.ts`. Diffs capture entity creation/destruction, component mutations, and resource changes per tick. `getDiff()` returns a JSON-deep-cloned defensive copy — callers cannot write through to live engine state. During `onDiff` listeners `world.tick === diff.tick`.

- **Tick failure semantics** are fail-fast. A failure in any tick phase (commands, systems, resources, diff, listeners) marks the world as **poisoned**. While poisoned, `world.step()` throws `WorldTickFailureError` and `world.stepWithResult()` returns a `world_poisoned` failure result. `world.isPoisoned()` reports the state; `world.recover()` clears the poison flag along with the cached `lastTickFailure`/`currentDiff`/`currentMetrics`. Failed ticks consume a tick number — if a tick fails at tick `N+1`, the next successful tick after `recover()` is `N+2`, so failed-tick events and successful-tick events never share a tick number.
- **Metrics** are accessed via `world.getMetrics()` after a tick. They report section timings, per-system timings, query cache hit/miss counts, entity counts, and explicit-sync counts (`spatial.explicitSyncs`, incremented by every `setPosition`-style write). `instrumentationProfile: 'full'` keeps the detailed implicit metrics path, `minimal` keeps coarse implicit metrics, and `release` disables implicit metrics collection on `step()` so shipping runtimes do not pay that cost unless they explicitly use `stepWithResult()`.
- **Rendering** belongs outside the engine. Renderer clients should consume snapshots and tick diffs through `ClientAdapter`, keep visual objects in renderer-owned state, and submit input back as commands. See `docs/guides/rendering.md` for the recommended renderer boundary and Pixi-first reference client shape.
- **RenderAdapter** is an optional projection helper. It turns current world state plus `TickDiff` into renderer-facing `renderSnapshot` and `renderTick` messages using game-owned callbacks. It does not own renderer objects or backend assumptions.
- **Resources** are managed via `world.registerResource()`, `world.addResource()`, `world.removeResource()`, etc. The ResourceStore is owned by World as a private subsystem. Resource rates and transfers are processed automatically after user systems each tick.
- **Noise, Cellular, MapGen** are standalone utilities. They are not owned by World and have no integration point in the tick loop. Game code imports them directly and uses them during setup (before the simulation runs).
- **OccupancyGrid** is a standalone utility. It models blocked cells, occupied footprints, and temporary reservations. `OccupancyBinding` composes it with blocker metadata, destroy-time cleanup hooks, optional sub-cell crowding, and scan metrics when game code wants a higher-level passability surface. These occupancy helpers remain intentionally separate from `SpatialGrid`, which answers proximity rather than passability.
- **Layer** is a standalone typed overlay map. `Layer<T>` represents field data at a configurable downsampled resolution (e.g., a `pollution` map at half-res of the world, or an `influence` map at quarter-res). World coordinates are auto-bucketed via `getAt(worldX, worldY)` / `setAt(worldX, worldY, value)`; cell coordinates are accessible via `getCell` / `setCell`. Storage is **strip-at-write sparse**: writes equal to `defaultValue` delete the underlying entry instead of storing a marker, so the in-memory map and the serialized form agree without a `getState` round-trip. Explicit `clear(cx, cy)` / `clearAt(wx, wy)` methods provide an honest "drop this cell" API. Defensive copies on every read/write boundary protect callers from internal-state aliasing for object `T`; for **primitive `T`** (`number`, `string`, `boolean`, `null`) clones are skipped because primitives are immutable on the JS side, making `Layer<number>` etc. zero-allocation across reads and writes. `forEachReadOnly(cb)` is an explicit zero-allocation read path for object `T` consumers who own the no-mutate discipline. Layers are JSON-serializable through `getState()` / `Layer.fromState()` and value writes are validated via `assertJsonCompatible`. Layers are independent of `World`; game code instantiates and ticks them from systems. They are a sibling utility to `OccupancyGrid` and `VisibilityMap` — the engine does not own per-game field data, only the data structure.
- **Pathfinding** is a standalone utility. It has no knowledge of the spatial grid, entities, or the tick loop. Game code provides `neighbors`, `cost`, `heuristic`, and `hash` callbacks to wire it to any graph topology.
- **Path Service** is a standalone utility built on top of `findPath`. It provides `findGridPath`, `PathCache`, `PathRequestQueue`, and `createGridPathQueue` for deterministic batched path processing.
- **VisibilityMap** is a standalone utility. It tracks per-player visible and explored cells and remains independent of rendering and UI code.
- **WorldDebugger** is a standalone inspection utility. It captures structured summaries of world state, metrics, events, last-diff data, and custom probe output for standalone utilities such as occupancy, visibility, and path queues.
- **ScenarioRunner** is a standalone orchestration utility. It pairs prepared setup, deterministic stepping, checks, debugger output, and short-horizon history into one machine-readable result for AI agents and harnesses.
- **BehaviorTree** is a standalone utility. It has no knowledge of World, entities, or the tick loop. Game code defines tree structure via `createBehaviorTree`, stores `BTState` as a component, and ticks trees from a system. The `TContext` generic is game-defined — the engine does not prescribe what context contains beyond a BTState accessor. Reactive variants (`reactiveSelector`, `reactiveSequence`) re-evaluate from the root each tick without persisting running state; `clearRunningState` provides imperative subtree resets.
- **ClientAdapter** reads World state and subscribes to diffs. It does not modify World internals directly — it uses only the public API (`serialize`, `onDiff`/`offDiff`, `getEvents`, `submitWithResult`).
- **World State** is owned by World as a private Map. Systems read/write via `world.setState()`/`world.getState()`. State is non-entity structured data (terrain config, simulation time, etc.). Typed against the `TState` generic on `World` (default `Record<string, unknown>`) — independent of the `TComponents` registry. Included in serialization and diffs.
- **Tags & Metadata** are owned by World. Tags are string labels with reverse-index lookup via `world.getByTag()`. Metadata is key-value per entity with unique reverse-index via `world.getByMeta()` — `setMeta` throws if another live entity already owns the `(key, value)` pair. Both cleaned up on entity destruction; the cleanup is reflected in `TickDiff.tags`/`TickDiff.metadata` as `{ entity, tags: [] }` / `{ entity, meta: {} }`.
- **System Ordering** supports optional `before`/`after` named constraints in `SystemRegistration`. Constraints resolve via topological sort within each phase at first tick (or after dynamic registration). Cross-phase constraints are errors.

## Technology Map

| Technology                     | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| TypeScript 5.7+                | Language (strict mode, ES2022, ESM, Node16 module resolution) |
| Vitest 3                       | Test framework                                                |
| ESLint 9 + typescript-eslint 8 | Linting (flat config)                                         |
| Node.js 18+                    | Runtime                                                       |

For architectural decisions, see `docs/architecture/decisions.md`.
For architecture drift history, see `docs/architecture/drift-log.md`.

## Drift Log

Structural mismatches detected during periodic doc audits but not addressed in the same pass. Use this list to schedule follow-ups; it is intentionally short-form and dated.

| Date       | Detected drift / structural change                                                                                                                                                                                                                                                                            | Status                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| 2026-05-01 | `docs/devlog/detailed/2026-04-25_2026-04-25.md` is 542 lines (over the ~500-line cap). Should be archived (rename `END_DATE` to last-entry date) and a new active file rotated in. Not edited in this audit pass.                                                                                              | Deferred — archive on next devlog work          |
| 2026-05-01 | `src/world.ts` is 2270 lines, far above the 500 LOC review preference; previous extraction (v0.6.4) split out `world-internal.ts` but the deeper class-method extraction (serialize, system scheduling, tick pipeline) is still pending per drift-log row 2026-04-26 (`world-internal.ts` extraction). | Deferred — composition redesign required        |
| 2026-05-01 | `src/occupancy-grid.ts` is 42KB / ~1500 LOC and combines `OccupancyGrid`, `OccupancyBinding`, and `SubcellOccupancyGrid` in one file; per devlog summary the split is deferred until composition redesign. Not edited in this audit pass.                                                                | Deferred — composition redesign required        |
