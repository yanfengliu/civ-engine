# civ-engine

A general-purpose, headless, AI-native 2D grid-based game engine. Built in TypeScript with a strict ECS (Entity-Component-System) architecture. Zero runtime dependencies.

**AI-native** means the engine is designed to be operated by AI agents, not human players directly. Humans provide high-level game designs; AI agents write game logic, submit commands, and observe state through structured, machine-readable interfaces.

The engine provides reusable infrastructure that game projects consume — it has no game-specific logic, rendering, or UI code.

## Quick Start

```bash
npm install
npm test        # run all tests
npm run lint    # lint
npm run typecheck
npm run build   # emit dist package files
```

Requires Node.js 18+.

## Documentation

- **[Changelog](docs/changelog.md)** - Release notes and breaking changes
- **[API Reference](docs/api-reference.md)** — Complete reference for every public type, method, and module

### Tutorials

- **[Getting Started](docs/tutorials/getting-started.md)** — Core concepts, minimal example, and feature walkthrough
- **[Building a Complete Game](docs/tutorials/building-a-game.md)** — Step-by-step tutorial building a colony survival simulation using every engine feature

### Guides

- **[Public API & Invariants](docs/guides/public-api-and-invariants.md)** - Package imports, JSON-safe data, explicit writes, entity refs
- **[Core Concepts](docs/guides/concepts.md)** — ECS architecture, tick lifecycle, determinism, AI-native design
- **[Entities & Components](docs/guides/entities-and-components.md)** — Lifecycle, storage, querying, batch access, destroy hooks
- **[Systems & Simulation](docs/guides/systems-and-simulation.md)** — System design, tick order, real-time loop, speed control
- **[Spatial Grid](docs/guides/spatial-grid.md)** — Auto-sync, neighbor queries, range searches, collision patterns
- **[Commands & Events](docs/guides/commands-and-events.md)** — Input/output protocol, validators, handlers, event lifecycle
- **[Resources](docs/guides/resources.md)** — Pools, production, consumption, transfers, supply chains
- **[Serialization & Diffs](docs/guides/serialization-and-diffs.md)** — Save/load, per-tick change tracking, client sync
- **[Map Generation](docs/guides/map-generation.md)** — Simplex noise, cellular automata, terrain recipes
- **[Pathfinding](docs/guides/pathfinding.md)** — A* on grids and graphs, terrain costs, ECS integration
- **[Behavior Trees](docs/guides/behavior-trees.md)** — AI decision-making, ECS integration, shared trees
- **[Client Protocol](docs/guides/client-protocol.md)** — Transport-agnostic client streaming, WebSocket/stdio examples

## What You Can Build

```typescript
import { World, type Position } from 'civ-engine';

const world = new World({ gridWidth: 64, gridHeight: 64, tps: 10 });
world.registerComponent<Position>('position');
world.registerComponent<{ hp: number }>('health');

// Create entities, attach data
const unit = world.createEntity();
world.setPosition(unit, { x: 0, y: 0 });
world.addComponent(unit, 'health', { hp: 100 });

// Game logic is pure functions that run each tick
world.registerSystem((w) => {
  for (const id of w.query('position', 'health')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const hp = w.getComponent<{ hp: number }>(id, 'health')!;
    // your logic here
  }
});

// Step the simulation
world.step();
```

## Feature Overview

| Feature | What it does |
|---|---|
| **Entities & Components** | Create entities (numeric IDs), attach typed data objects by key |
| **Systems** | Pure functions `(world) => void` that run each tick in order |
| **Spatial Grid** | 2D grid auto-synced with position components, neighbor queries |
| **Commands** | Typed input buffer with validators and handlers — how AI agents send instructions |
| **Events** | Typed pub/sub — how systems communicate and how observers read what happened |
| **Resources** | Numeric pools (current/max) per entity with production, consumption, transfers |
| **Map Generation** | Seedable simplex noise, octave layering, cellular automata, tile grid helper |
| **Pathfinding** | Generic A* on any graph — provide neighbors/cost/heuristic/hash callbacks |
| **Behavior Trees** | Generic BT framework with action, condition, selector, sequence nodes |
| **Speed Control** | Runtime speed multiplier, pause/resume; `step()` ignores both for testing |
| **Serialization** | JSON snapshot save/load via `serialize()`/`deserialize()` |
| **State Diffs** | Per-tick change sets: what entities/components/resources changed |
| **Client Protocol** | Transport-agnostic typed messages, ClientAdapter bridges World to any transport |

## Architecture

Everything flows through a single `World` object:

```
World.step()
  -> process commands     (drain queue, run handlers)
  -> sync spatial grid    (match grid to position components)
  -> run systems          (your game logic, in registration order)
  -> process resources    (production, consumption, transfers)
  -> build diff           (collect changes for observers)
  -> tick++
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed documentation.

## Project Structure

```
src/
  index.ts            Public package export barrel
  world.ts            Top-level API — the only public entry point
  entity-manager.ts   Entity creation/destruction, ID recycling, generations
  component-store.ts  Sparse array storage per component type
  spatial-grid.ts     2D flat array grid, neighbor queries
  game-loop.ts        Fixed-timestep loop, speed control, pause/resume
  event-bus.ts        Typed pub/sub event bus
  command-queue.ts    Typed command buffer
  serializer.ts       WorldSnapshot type
  diff.ts             TickDiff type
  resource-store.ts   Resource pools, rates, transfers
  noise.ts            Seedable 2D simplex noise
  cellular.ts         Cellular automata
  map-gen.ts          MapGenerator interface, createTileGrid helper
  pathfinding.ts      Generic A* pathfinding
  behavior-tree.ts    Generic behavior tree framework
  client-adapter.ts   Transport-agnostic client protocol
  types.ts            Shared types (EntityId, EntityRef, Position, WorldConfig)
tests/
  *.test.ts           Unit and integration tests per module
docs/
  ARCHITECTURE.md     Detailed architecture documentation
  ROADMAP.md          Feature tracker
  tutorials/          Getting started guide and game-building tutorial
```

## API Reference

### `new World(config)`

| Parameter                | Type     | Default        | Description                           |
| ------------------------ | -------- | -------------- | ------------------------------------- |
| `config.gridWidth`       | `number` | (required)     | Width of the spatial grid             |
| `config.gridHeight`      | `number` | (required)     | Height of the spatial grid            |
| `config.tps`             | `number` | (required)     | Ticks per second (e.g., 10 for sims)  |
| `config.positionKey`     | `string` | `'position'`   | Component key used for spatial sync   |
| `config.maxTicksPerFrame`| `number` | `4`            | Spiral-of-death cap for real-time loop|

### World Methods

| Method | Returns | Description |
|---|---|---|
| **Entity Management** | | |
| `createEntity()` | `EntityId` | Create a new entity |
| `destroyEntity(id)` | `void` | Destroy entity and all its components |
| `isAlive(id)` | `boolean` | Check if entity exists |
| `getEntityRef(id)` | `EntityRef \| null` | Get a generation-aware entity reference |
| `isCurrent(ref)` | `boolean` | Check whether an entity reference still points at the same lifetime |
| **Components** | | |
| `registerComponent<T>(key)` | `void` | Register a component type |
| `addComponent<T>(id, key, data)` | `void` | Attach component to entity (compatibility alias for `setComponent`) |
| `setComponent<T>(id, key, data)` | `void` | Set component data and mark it dirty |
| `patchComponent<T>(id, key, fn)` | `T` | Mutate or replace existing component data and mark it dirty |
| `setPosition(id, position, key?)` | `void` | Set position data and update the spatial grid immediately |
| `getComponent<T>(id, key)` | `T \| undefined` | Read component data |
| `getComponents<T>(id, keys)` | `ComponentTuple<T>` | Batch-read multiple components |
| `removeComponent(id, key)` | `void` | Detach component from entity |
| `query(...keys)` | `IterableIterator<EntityId>` | Find entities with all listed components |
| **Systems & Simulation** | | |
| `registerSystem(fn)` | `void` | Add a system to the pipeline |
| `step()` | `void` | Advance one tick (deterministic, ignores pause/speed) |
| `start()` | `void` | Begin real-time loop |
| `stop()` | `void` | Stop real-time loop |
| **Speed Control** | | |
| `setSpeed(multiplier)` | `void` | Set simulation speed (any positive float) |
| `getSpeed()` | `number` | Get current speed multiplier |
| `pause()` | `void` | Freeze simulation (preserves speed) |
| `resume()` | `void` | Unfreeze at current speed |
| `isPaused` | `boolean` | Whether simulation is paused |
| **Commands** | | |
| `submit(type, data)` | `boolean` | Submit a command (validated, queued) |
| `registerValidator(type, fn)` | `void` | Add a validator for a command type |
| `registerHandler(type, fn)` | `void` | Set the handler for a command type |
| `hasCommandHandler(type)` | `boolean` | Check whether a command handler is registered |
| **Events** | | |
| `emit(type, data)` | `void` | Emit an event (from systems) |
| `on(type, listener)` | `void` | Subscribe to event type |
| `off(type, listener)` | `void` | Unsubscribe from event type |
| `getEvents()` | `ReadonlyArray` | Get all events from current tick |
| **Resources** | | |
| `registerResource(key, options?)` | `void` | Register a resource type |
| `addResource(entity, key, amount)` | `number` | Add to resource pool (returns amount added) |
| `removeResource(entity, key, amount)` | `number` | Remove from pool (returns amount removed) |
| `getResource(entity, key)` | `{current, max} \| undefined` | Read resource pool (`max: null` means unbounded) |
| `setResourceMax(entity, key, max)` | `void` | Set pool maximum |
| `setProduction(entity, key, rate)` | `void` | Set production rate per tick |
| `setConsumption(entity, key, rate)` | `void` | Set consumption rate per tick |
| `getProduction(entity, key)` | `number` | Get production rate |
| `getConsumption(entity, key)` | `number` | Get consumption rate |
| `addTransfer(from, to, resource, rate)` | `number` | Create a resource transfer (returns ID) |
| `removeTransfer(id)` | `void` | Remove a transfer |
| `getTransfers(entity)` | `Array` | Get all transfers for an entity |
| `getResourceEntities(key)` | `IterableIterator<EntityId>` | All entities with this resource |
| **State** | | |
| `tick` | `number` | Current tick count |
| `grid` | `SpatialGridView` | Spatial index read-only view |
| `serialize()` | `WorldSnapshot` | Capture current state as JSON snapshot |
| `World.deserialize(snapshot, systems?)` | `World` | Restore world from snapshot (static) |
| `getDiff()` | `TickDiff \| null` | Get last tick's diff |
| `onDiff(fn)` | `void` | Subscribe to per-tick diffs |
| `offDiff(fn)` | `void` | Unsubscribe from diffs |
| **Entity Lifecycle** | | |
| `onDestroy(fn)` | `void` | Register callback fired before entity destruction |
| `offDestroy(fn)` | `void` | Unregister destroy callback |
| **Client Protocol** | | |
| `new ClientAdapter({ world, send, onError? })` | `ClientAdapter` | Create adapter with World and send/error callbacks |
| `adapter.connect()` | `void` | Send snapshot, start streaming tick diffs |
| `adapter.disconnect()` | `void` | Stop streaming tick diffs |
| `adapter.handleMessage(msg)` | `void` | Process incoming client message |

### Standalone Utilities (import directly, not via World)

| Module | Exports | Description |
|---|---|---|
| `pathfinding.ts` | `findPath<T>(config)` | Generic A* pathfinding |
| `noise.ts` | `createNoise2D(seed)`, `octaveNoise2D(...)` | Seedable simplex noise |
| `cellular.ts` | `createCellGrid(...)`, `stepCellGrid(...)` | Cellular automata |
| `map-gen.ts` | `createTileGrid(world)` | Bulk tile entity creation |
| `spatial-grid.ts` | `ORTHOGONAL`, `DIAGONAL`, `ALL_DIRECTIONS` | Direction offset presets |
| `resource-store.ts` | `ResourcePool`, `ResourceMax`, `Transfer` | Resource system types |
| `behavior-tree.ts` | `createBehaviorTree`, `createBTState`, `NodeStatus` | Generic behavior tree framework |
| `client-adapter.ts` | `ClientAdapter`, `ServerMessage`, `ClientMessage`, `GameEvent` | Transport-agnostic client protocol |

### SpatialGrid Methods

| Method | Returns | Description |
|---|---|---|
| `getAt(x, y)` | `ReadonlySet<EntityId> \| null` | Entities at cell |
| `getNeighbors(x, y, offsets?)` | `EntityId[]` | Entities in neighbor cells |
| `getInRadius(x, y, radius, metric?)` | `EntityId[]` | Entities in range |
| `width` | `number` | Grid width |
| `height` | `number` | Grid height |

## Design Decisions

- **Sparse arrays** for component storage — O(1) lookup, simple implementation
- **Fixed system pipeline** — deterministic execution, no scheduler overhead
- **Monolithic World** — flat API, internals are hidden
- **Zero runtime deps** — pure TypeScript, nothing to break
- **Generation counters** — minimal change detection for diff/serialization
- **Standalone utilities** — noise, cellular, map-gen, pathfinding are not World subsystems

## License

MIT
