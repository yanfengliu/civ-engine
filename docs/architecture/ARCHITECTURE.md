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
| Serializer     | `src/serializer.ts`      | Versioned WorldSnapshot types for state serialization                                  |
| Diff           | `src/diff.ts`            | TickDiff type for per-tick change sets                                                 |
| ResourceStore  | `src/resource-store.ts`  | Resource pools, production/consumption rates, transfers, dirty tracking                |
| OccupancyGrid  | `src/occupancy-grid.ts`  | Deterministic blocked-cell, footprint, reservation, lifecycle binding, blocker metadata, metrics, and sub-cell crowding tracking |
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
- **SpatialGrid** is a sparse map of occupied cells and is synced automatically by World's internal spatial index routine. User systems read grid state via `world.grid.getAt()` / `world.grid.getNeighbors()` / `world.grid.getInRadius()`. The `world.grid` property exposes only a read-only view.
- **GameLoop** handles timing only. It knows nothing about entities, components, or systems.
- **EventBus** is owned by World. Systems emit and subscribe via `world.emit()` / `world.on()`. External consumers read events via `world.getEvents()` between ticks. Do not call `eventBus.clear()` directly — World handles this.
- **CommandQueue** is owned by World. External code submits commands via `world.submit()` or `world.submitWithResult()`, registers validators via `world.registerValidator()`, and registers handlers via `world.registerHandler()`. Do not access the queue directly.
- **Serialization** is accessed via `world.serialize()` and `World.deserialize()`. Snapshot version 5 (WorldSnapshotV5) is the current write format and additionally round-trips per-component `ComponentStoreOptions` (the `componentOptions` field) so `diffMode` and `detectInPlaceMutations` survive save/load; version 4 includes state, tags, and metadata; version 3 includes resource state and deterministic RNG state; versions 1 and 2 remain readable for compatibility. `WorldConfig.maxTicksPerFrame` and `WorldConfig.instrumentationProfile` are also serialized when non-default. The `WorldSnapshot` type is exported from `src/serializer.ts`. Snapshots are plain JSON-serializable objects.
- **State Diffs** are accessed via `world.getDiff()` (pull) or `world.onDiff()` (push). The `TickDiff` type is exported from `src/diff.ts`. Diffs capture entity creation/destruction, component mutations, and resource changes per tick. `getDiff()` returns a JSON-deep-cloned defensive copy — callers cannot write through to live engine state. During `onDiff` listeners `world.tick === diff.tick`.

- **Tick failure semantics** are fail-fast. A failure in any tick phase (commands, systems, resources, diff, listeners) marks the world as **poisoned**. While poisoned, `world.step()` throws `WorldTickFailureError` and `world.stepWithResult()` returns a `world_poisoned` failure result. `world.isPoisoned()` reports the state; `world.recover()` clears the poison flag along with the cached `lastTickFailure`/`currentDiff`/`currentMetrics`. Failed ticks consume a tick number — if a tick fails at tick `N+1`, the next successful tick after `recover()` is `N+2`, so failed-tick events and successful-tick events never share a tick number.
- **Metrics** are accessed via `world.getMetrics()` after a tick. They report section timings, per-system timings, query cache hit/miss counts, entity counts, and spatial scan counts. `instrumentationProfile: 'full'` keeps the detailed implicit metrics path, `minimal` keeps coarse implicit metrics, and `release` disables implicit metrics collection on `step()` so shipping runtimes do not pay that cost unless they explicitly use `stepWithResult()`.
- **Rendering** belongs outside the engine. Renderer clients should consume snapshots and tick diffs through `ClientAdapter`, keep visual objects in renderer-owned state, and submit input back as commands. See `docs/guides/rendering.md` for the recommended renderer boundary and Pixi-first reference client shape.
- **RenderAdapter** is an optional projection helper. It turns current world state plus `TickDiff` into renderer-facing `renderSnapshot` and `renderTick` messages using game-owned callbacks. It does not own renderer objects or backend assumptions.
- **Resources** are managed via `world.registerResource()`, `world.addResource()`, `world.removeResource()`, etc. The ResourceStore is owned by World as a private subsystem. Resource rates and transfers are processed automatically after user systems each tick.
- **Noise, Cellular, MapGen** are standalone utilities. They are not owned by World and have no integration point in the tick loop. Game code imports them directly and uses them during setup (before the simulation runs).
- **OccupancyGrid** is a standalone utility. It models blocked cells, occupied footprints, and temporary reservations. `OccupancyBinding` composes it with blocker metadata, destroy-time cleanup hooks, optional sub-cell crowding, and scan metrics when game code wants a higher-level passability surface. These occupancy helpers remain intentionally separate from `SpatialGrid`, which answers proximity rather than passability.
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
