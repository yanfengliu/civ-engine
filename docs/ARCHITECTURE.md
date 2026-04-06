# Architecture

## Overview

Civ-engine is a general-purpose, headless, AI-native 2D grid-based game engine. Built in Node.js/TypeScript with a strict ECS (Entity-Component-System) architecture.

**AI-native** means the engine is designed to be operated by AI agents, not human players directly. Humans provide high-level game designs; AI agents write game logic, submit commands, and observe state. Every design decision prioritizes machine-readability: deterministic tick execution, JSON-serializable state, structured diffs, typed command/event interfaces, and a purely programmatic API with no interactive UI.

The engine provides reusable infrastructure (entities, components, spatial indexing, events, commands, resources, serialization) that game projects consume. It outputs state changes that a separate client can render; it contains no game-specific logic, rendering, or UI code.

## Component Map

| Component      | File                     | Responsibility                                                                         |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| World          | `src/world.ts`           | Top-level API, owns all subsystems, system pipeline, spatial index sync                |
| EntityManager  | `src/entity-manager.ts`  | Entity creation/destruction, ID recycling via free-list, generation counters           |
| ComponentStore | `src/component-store.ts` | Sparse array storage per component type, generation counter for change detection       |
| SpatialGrid    | `src/spatial-grid.ts`    | 2D flat array grid, lazy Set allocation per cell, 4-directional neighbor queries       |
| GameLoop       | `src/game-loop.ts`       | Fixed-timestep loop (60 TPS default), step() for testing, start()/stop() for real-time |
| EventBus       | `src/event-bus.ts`       | Typed pub/sub event bus, per-tick buffer, listener registry                            |
| CommandQueue   | `src/command-queue.ts`   | Typed command buffer, push/drain interface                                             |
| Serializer     | `src/serializer.ts`      | WorldSnapshot type for state serialization                                             |
| Diff           | `src/diff.ts`            | TickDiff type for per-tick change sets                                                 |
| ResourceStore  | `src/resource-store.ts`  | Resource pools, production/consumption rates, transfers, dirty tracking                |
| Noise          | `src/noise.ts`           | Seedable 2D simplex noise, octave layering utility                                     |
| Cellular       | `src/cellular.ts`        | Cellular automata step function, immutable CellGrid                                    |
| MapGen         | `src/map-gen.ts`         | MapGenerator interface, createTileGrid bulk tile-entity helper                         |
| Types          | `src/types.ts`           | Shared type definitions (EntityId, Position, WorldConfig)                              |

## Data Flow

```
World.step()
  -> GameLoop.step()
    -> World.executeTick()
      -> World.eventBus.clear()       [reset buffer from previous tick]
      -> World.entityManager.clearDirty()
      -> World.clearComponentDirty()   [clear dirty flags on all stores]
      -> World.processCommands()       [drain queue, run handlers]
      -> World.syncSpatialIndex()      [sync grid with Position components]
      -> System A(world)               [user systems in registration order]
      -> System B(world)
      -> ...
      -> World.resourceStore.processTick()  [production, consumption, transfers]
      -> World.buildDiff()             [collect dirty state into TickDiff]
      -> notify onDiff listeners
    -> tick++
```

### Spatial Index Sync

Each tick, before user systems run, `syncSpatialIndex()`:
1. Iterates all entities with the configured position component (default `'position'`, configurable via `positionKey` in `WorldConfig`)
2. Compares current position to `previousPositions` map
3. Inserts new entities into grid, moves changed ones, removes stale ones

### Entity Destruction

`destroyEntity(id)` performs immediate cleanup:
- Removes entity from grid using `previousPositions` (not current component data, which may have been mutated since last sync)
- Removes all components from all stores
- Removes all resource pools, rates, and transfers for the entity
- Marks entity as dead in EntityManager (ID available for recycling)

## Boundaries

- **World** is the only public entry point. EntityManager, ComponentStore, GameLoop are internal implementation details.
- **Systems** are pure functions `(world: World) => void`. No classes, no lifecycle hooks.
- **Components** are pure data interfaces. No methods, no inheritance.
- **SpatialGrid** is synced automatically by World's internal spatial index routine. User systems should read grid state via `world.grid.getAt()` / `world.grid.getNeighbors()` but should not call `grid.insert/remove/move` directly.
- **GameLoop** handles timing only. It knows nothing about entities, components, or systems.
- **EventBus** is owned by World. Systems emit and subscribe via `world.emit()` / `world.on()`. External consumers read events via `world.getEvents()` between ticks. Do not call `eventBus.clear()` directly — World handles this.
- **CommandQueue** is owned by World. External code submits commands via `world.submit()`, registers validators via `world.registerValidator()`, and registers handlers via `world.registerHandler()`. Do not access the queue directly.
- **Serialization** is accessed via `world.serialize()` and `World.deserialize()`. The `WorldSnapshot` type is exported from `src/serializer.ts`. Snapshots are plain JSON-serializable objects.
- **State Diffs** are accessed via `world.getDiff()` (pull) or `world.onDiff()` (push). The `TickDiff` type is exported from `src/diff.ts`. Diffs capture entity creation/destruction, component mutations, and resource changes per tick.
- **Resources** are managed via `world.registerResource()`, `world.addResource()`, `world.removeResource()`, etc. The ResourceStore is owned by World as a private subsystem. Resource rates and transfers are processed automatically after user systems each tick.
- **Noise, Cellular, MapGen** are standalone utilities. They are not owned by World and have no integration point in the tick loop. Game code imports them directly and uses them during setup (before the simulation runs).

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
