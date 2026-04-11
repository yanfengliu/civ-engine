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
| OccupancyGrid  | `src/occupancy-grid.ts`  | Deterministic blocked-cell, footprint, occupancy, and reservation tracking             |
| JSON helpers   | `src/json.ts`            | JSON-compatible component validation and fingerprints for mutation detection           |
| Noise          | `src/noise.ts`           | Seedable 2D simplex noise, octave layering utility                                     |
| Cellular       | `src/cellular.ts`        | Cellular automata step function, immutable CellGrid                                    |
| MapGen         | `src/map-gen.ts`         | MapGenerator interface, createTileGrid bulk tile-entity helper                         |
| Pathfinding    | `src/pathfinding.ts`     | Generic A* pathfinding, graph-agnostic with user-defined callbacks          |
| Path Service   | `src/path-service.ts`    | Grid path helper, deterministic path queue, and cache for batched request handling     |
| RenderAdapter  | `src/render-adapter.ts`  | Projects world state into renderer-facing snapshots and diffs with generation-aware refs |
| VisibilityMap  | `src/visibility-map.ts`  | Per-player visible/explored cell tracking for fog-of-war style mechanics               |
| WorldDebugger  | `src/world-debugger.ts`  | Structured debug snapshots, warnings, and probe helpers for engine and standalone utilities |
| ClientAdapter  | `src/client-adapter.ts`  | Bridges World API to typed client messages via send callback |
| BehaviorTree   | `src/behavior-tree.ts`   | Generic BT framework: NodeStatus, BTNode, Selector, Sequence, Action, Condition, BTState, createBehaviorTree |
| Public exports | `src/index.ts`           | Barrel export for the intended package API                                             |
| Types          | `src/types.ts`           | Shared type definitions (EntityId, EntityRef, Position, WorldConfig)                   |

## Data Flow

```
World.step()
  -> GameLoop.step()
    -> World.executeTick()
      -> World.eventBus.clear()       [reset buffer from previous tick]
      -> World.entityManager.clearDirty()
      -> World.clearComponentDirty()   [clear dirty flags on all stores]
      -> World.processCommands()       [drain queue, run handlers]
      -> World.syncSpatialIndex()      [optional direct-mutation fallback scan]
      -> input systems
      -> preUpdate systems
      -> update systems
      -> postUpdate systems
      -> output systems
      -> World.resourceStore.processTick()  [production, consumption, transfers]
      -> World.buildDiff()             [collect dirty state into TickDiff]
      -> World.getMetrics() state updated
      -> notify onDiff listeners
    -> tick++
```

### Spatial Index Sync

Each tick, before user systems run, `syncSpatialIndex()`:
1. Iterates all entities with the configured position component (default `'position'`, configurable via `positionKey` in `WorldConfig`) when `detectInPlacePositionMutations` is enabled
2. Compares current position to `previousPositions` map
3. Inserts new entities into grid, moves changed ones, removes stale ones

Position writes through `world.setPosition()` or `world.setComponent()` with the configured position key update the component store and spatial grid immediately. Direct object mutation is still picked up by the next tick's sync pass by default. Large simulations can set `detectInPlacePositionMutations: false` and call `world.markPositionDirty(entity)` after an in-place position mutation to avoid the full scan.

### Entity Destruction

`destroyEntity(id)` performs immediate cleanup:
- Removes entity from grid using `previousPositions` (not current component data, which may have been mutated since last sync)
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
- **CommandQueue** is owned by World. External code submits commands via `world.submit()`, registers validators via `world.registerValidator()`, and registers handlers via `world.registerHandler()`. Do not access the queue directly.
- **Serialization** is accessed via `world.serialize()` and `World.deserialize()`. Snapshot version 3 includes resource state and deterministic RNG state; version 1 and 2 snapshots remain readable for compatibility. The `WorldSnapshot` type is exported from `src/serializer.ts`. Snapshots are plain JSON-serializable objects.
- **State Diffs** are accessed via `world.getDiff()` (pull) or `world.onDiff()` (push). The `TickDiff` type is exported from `src/diff.ts`. Diffs capture entity creation/destruction, component mutations, and resource changes per tick.
- **Metrics** are accessed via `world.getMetrics()` after a tick. They report section timings, per-system timings, query cache hit/miss counts, entity counts, and spatial scan counts.
- **Rendering** belongs outside the engine. Renderer clients should consume snapshots and tick diffs through `ClientAdapter`, keep visual objects in renderer-owned state, and submit input back as commands. See `docs/guides/rendering.md` for the recommended renderer boundary and Pixi-first reference client shape.
- **RenderAdapter** is an optional projection helper. It turns current world state plus `TickDiff` into renderer-facing `renderSnapshot` and `renderTick` messages using game-owned callbacks. It does not own renderer objects or backend assumptions.
- **Resources** are managed via `world.registerResource()`, `world.addResource()`, `world.removeResource()`, etc. The ResourceStore is owned by World as a private subsystem. Resource rates and transfers are processed automatically after user systems each tick.
- **Noise, Cellular, MapGen** are standalone utilities. They are not owned by World and have no integration point in the tick loop. Game code imports them directly and uses them during setup (before the simulation runs).
- **OccupancyGrid** is a standalone utility. It models blocked cells, occupied footprints, and temporary reservations. It is intentionally separate from `SpatialGrid`, which answers proximity rather than passability.
- **Pathfinding** is a standalone utility. It has no knowledge of the spatial grid, entities, or the tick loop. Game code provides `neighbors`, `cost`, `heuristic`, and `hash` callbacks to wire it to any graph topology.
- **Path Service** is a standalone utility built on top of `findPath`. It provides `findGridPath`, `PathCache`, `PathRequestQueue`, and `createGridPathQueue` for deterministic batched path processing.
- **VisibilityMap** is a standalone utility. It tracks per-player visible and explored cells and remains independent of rendering and UI code.
- **WorldDebugger** is a standalone inspection utility. It captures structured summaries of world state, metrics, events, last-diff data, and custom probe output for standalone utilities such as occupancy, visibility, and path queues.
- **BehaviorTree** is a standalone utility. It has no knowledge of World, entities, or the tick loop. Game code defines tree structure via `createBehaviorTree`, stores `BTState` as a component, and ticks trees from a system. The `TContext` generic is game-defined — the engine does not prescribe what context contains beyond a BTState accessor.
- **ClientAdapter** reads World state and subscribes to diffs. It does not modify World internals directly — it uses only the public API (`serialize`, `onDiff`/`offDiff`, `getEvents`, `submit`).

## Technology Map

| Technology                     | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| TypeScript 5.7+                | Language (strict mode, ES2022, ESM, Node16 module resolution) |
| Vitest 3                       | Test framework                                                |
| ESLint 9 + typescript-eslint 8 | Linting (flat config)                                         |
| Node.js 18+                    | Runtime                                                       |

## Key Architectural Decisions

| #   | Date       | Decision                                              | Rationale                                                                  |
| --- | ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | 2026-04-04 | Sparse arrays for component storage                   | Simple, O(1) lookup, sufficient for expected entity density                |
| 2   | 2026-04-04 | Fixed system pipeline (no scheduler)                  | Deterministic, easy to test and debug                                      |
| 3   | 2026-04-04 | Monolithic World object                               | Simple API surface, avoids premature decoupling                            |
| 4   | 2026-04-04 | Generation counters for change detection              | Minimal cost now, enables future diff/output layer                         |
| 5   | 2026-04-04 | Zero runtime dependencies                             | Performance and simplicity for a game engine                               |
| 6   | 2026-04-04 | Spatial index as internal World routine               | Non-bypassable, invisible to user systems, runs before all systems         |
| 7   | 2026-04-04 | destroyEntity uses previousPositions for grid cleanup | Handles the case where position was mutated between ticks without stepping |
| 8   | 2026-04-06 | BT state separated from tree structure via BTState   | Enables shared tree blueprints across entities while keeping per-entity state serializable in ECS |

## Drift Log

| Date       | Change                                | Reason                                                           |
| ---------- | ------------------------------------- | ---------------------------------------------------------------- |
| 2026-04-04 | Initial architecture                  | Core engine foundation implementation                            |
| 2026-04-05 | Added EventBus as World subsystem     | System-to-system and engine-to-client event communication        |
| 2026-04-05 | Added CommandQueue as World subsystem | Input command layer for player command validation and processing |
| 2026-04-05 | Added state serialization             | JSON snapshot save/load via World.serialize() and World.deserialize() |
| 2026-04-05 | Added state diff output               | Per-tick dirty tracking and TickDiff via getDiff/onDiff/offDiff       |
| 2026-04-05 | Added resource system                  | ResourceStore with pools, rates, transfers, diff integration          |
| 2026-04-06 | Added map infrastructure utilities     | Standalone noise, cellular automata, and tile-creation primitives for map generation |
| 2026-04-06 | Made hardcoded defaults configurable   | positionKey, maxTicksPerFrame, neighbor offsets, cellular offsets now have overridable defaults |
| 2026-04-06 | Added generic A* pathfinding        | Standalone graph-agnostic pathfinding with configurable callbacks and early termination |
| 2026-04-06 | Added simulation speed control       | Speed multiplier and pause/resume on GameLoop, proxied via World                             |
| 2026-04-06 | Added ClientAdapter | Transport-agnostic client protocol with typed messages for server-client communication |
| 2026-04-06 | Added getComponents batch API      | Reduces verbosity when systems need multiple components per entity        |
| 2026-04-06 | Added entity destroy hooks           | onDestroy/offDestroy callbacks fire before component removal for relationship cleanup |
| 2026-04-06 | Added behavior tree framework        | Standalone generic BT with ECS-compatible state (BTState) and game-defined TContext    |
| 2026-04-10 | Added RTS-scale standalone primitives | OccupancyGrid, queued grid path helpers, VisibilityMap, and benchmark harness |
| 2026-04-10 | Added render projection and debugger helpers | RenderAdapter for renderer-facing projections and WorldDebugger with probe support |
| 2026-04-10 | Hardened engine invariants           | Added JSON-safe component/resource state, entity refs, explicit write APIs, read-only grid exposure, resource snapshot v2, package exports/build, and CI |
