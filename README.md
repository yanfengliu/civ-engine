# civ-engine

A headless, AI-native game engine for 2D grid-based civilization-scale simulation. Built in TypeScript with a strict ECS (Entity-Component-System) architecture. Zero runtime dependencies.

The engine outputs state changes that a separate client can consume — it has no rendering or UI code.

## Quick Start

```bash
npm install
npm test        # run all tests
npm run lint    # lint
npm run typecheck
```

Requires Node.js 18+.

## Core Concepts

Everything flows through a single `World` object.

- **Entities** are plain numeric IDs.
- **Components** are plain data objects attached to entities by string key.
- **Systems** are functions `(world: World) => void` that run each tick.
- **Spatial grid** tracks entities with a `'position'` component automatically.

```typescript
import { World } from './src/world.js';

const world = new World({ gridWidth: 64, gridHeight: 64, tps: 60 });
```

## Entities

```typescript
const entity = world.createEntity();

world.isAlive(entity);    // true
world.destroyEntity(entity);
world.isAlive(entity);    // false
```

Destroyed entity IDs are recycled via a free-list. Generation counters prevent stale references.

## Components

Register a component type before using it. Components are pure data — no methods, no inheritance.

```typescript
interface Health { hp: number; maxHp: number }
interface Velocity { dx: number; dy: number }

world.registerComponent<Health>('health');
world.registerComponent<Velocity>('velocity');
```

Attach, read, and remove components on entities:

```typescript
world.addComponent(entity, 'health', { hp: 100, maxHp: 100 });

const hp = world.getComponent<Health>(entity, 'health');
// hp is Health | undefined

world.removeComponent(entity, 'health');
```

### The `'position'` Component

Position is special. The engine automatically syncs any entity with a `'position'` component into the spatial grid before each tick. You must register it under exactly this key:

```typescript
import type { Position } from './src/types.js';

world.registerComponent<Position>('position');
world.addComponent(entity, 'position', { x: 10, y: 5 });
```

## Querying Entities

Query returns an iterator over entity IDs that have **all** specified components:

```typescript
for (const id of world.query('position', 'health')) {
  const pos = world.getComponent<Position>(id, 'position')!;
  const hp = world.getComponent<Health>(id, 'health')!;
  // ...
}

// Collect into array if needed
const soldiers = [...world.query('position', 'health', 'attack')];
```

Internally, the query scans the smallest component store first for efficiency.

## Systems

Systems are plain functions registered in the order they should run:

```typescript
function movementSystem(world: World): void {
  for (const id of world.query('position', 'velocity')) {
    const pos = world.getComponent<Position>(id, 'position')!;
    const vel = world.getComponent<Velocity>(id, 'velocity')!;
    pos.x += vel.dx;
    pos.y += vel.dy;
  }
}

function damageSystem(world: World): void {
  for (const id of world.query('health')) {
    const hp = world.getComponent<Health>(id, 'health')!;
    if (hp.hp <= 0) {
      world.destroyEntity(id);
    }
  }
}

world.registerSystem(movementSystem);
world.registerSystem(damageSystem);
```

Each tick, the engine runs spatial index sync first, then all registered systems in order.

## Spatial Grid

The grid is a 2D flat array of `Set<EntityId>`. Multiple entities can occupy the same cell. Access it via `world.grid`:

```typescript
// Get all entities at a cell
const entities = world.grid.getAt(5, 3);  // ReadonlySet<EntityId> | null

// Get entities in the 4 orthogonal neighbors (up/down/left/right)
const neighbors = world.grid.getNeighbors(5, 3);  // EntityId[]
```

The grid syncs automatically — do not call `grid.insert/remove/move` directly. Just mutate position components and the engine handles it on the next `step()`.

## Running the Simulation

### Deterministic stepping (for tests and AI)

```typescript
world.step();  // advance exactly one tick
world.step();
world.tick;    // 2
```

### Real-time loop

```typescript
world.start();   // begins fixed-timestep loop at configured TPS
// ...later
world.stop();
```

The real-time loop caps at 4 catch-up ticks per frame to prevent spiral-of-death when the host falls behind.

## Full Example

```typescript
import { World } from './src/world.js';
import type { Position } from './src/types.js';

interface Velocity { dx: number; dy: number }

// Create world
const world = new World({ gridWidth: 32, gridHeight: 32, tps: 60 });
world.registerComponent<Position>('position');
world.registerComponent<Velocity>('velocity');

// Movement system
world.registerSystem((w) => {
  for (const id of w.query('position', 'velocity')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const vel = w.getComponent<Velocity>(id, 'velocity')!;
    pos.x = Math.max(0, Math.min(31, pos.x + vel.dx));
    pos.y = Math.max(0, Math.min(31, pos.y + vel.dy));
  }
});

// Spawn entity
const unit = world.createEntity();
world.addComponent(unit, 'position', { x: 0, y: 0 });
world.addComponent(unit, 'velocity', { dx: 1, dy: 0 });

// Simulate 10 ticks
for (let i = 0; i < 10; i++) {
  world.step();
}

// Entity is now at (10, 0)
const pos = world.getComponent<Position>(unit, 'position')!;
console.log(pos.x, pos.y); // 10 0

// Query the grid
const atCell = world.grid.getAt(10, 0);
console.log(atCell?.has(unit)); // true
```

## Entity Destruction

`destroyEntity` performs immediate cleanup in one call:

1. Removes entity from the spatial grid (using its last-synced position, not current component data)
2. Removes all components from all stores
3. Marks the entity as dead (ID becomes available for recycling)

This means it's safe to destroy entities mid-system — even if their position was mutated since the last tick.

## Project Structure

```
src/
  world.ts            Top-level API — the only public entry point
  entity-manager.ts   Entity creation/destruction, ID recycling, generations
  component-store.ts  Sparse array storage per component type
  spatial-grid.ts     2D flat array grid, neighbor queries
  game-loop.ts        Fixed-timestep loop, spiral-of-death prevention
  types.ts            Shared types (EntityId, Position, WorldConfig)
tests/
  world.test.ts       Integration tests
  *.test.ts           Unit tests per module
docs/
  ARCHITECTURE.md     Detailed architecture documentation
```

## API Reference

### `new World(config)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.gridWidth` | `number` | Width of the spatial grid |
| `config.gridHeight` | `number` | Height of the spatial grid |
| `config.tps` | `number` | Ticks per second (e.g., 60) |

### World Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `createEntity()` | `EntityId` | Create a new entity |
| `destroyEntity(id)` | `void` | Destroy entity and all its components |
| `isAlive(id)` | `boolean` | Check if entity exists |
| `registerComponent<T>(key)` | `void` | Register a component type |
| `addComponent<T>(id, key, data)` | `void` | Attach component to entity |
| `getComponent<T>(id, key)` | `T \| undefined` | Read component data |
| `removeComponent(id, key)` | `void` | Detach component from entity |
| `query(...keys)` | `IterableIterator<EntityId>` | Find entities with all listed components |
| `registerSystem(fn)` | `void` | Add a system to the pipeline |
| `step()` | `void` | Advance one tick (deterministic) |
| `start()` | `void` | Begin real-time loop |
| `stop()` | `void` | Stop real-time loop |
| `tick` | `number` | Current tick count |
| `grid` | `SpatialGrid` | Spatial index (read-only access) |

### SpatialGrid Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getAt(x, y)` | `ReadonlySet<EntityId> \| null` | Entities at cell |
| `getNeighbors(x, y)` | `EntityId[]` | Entities in 4 adjacent cells |
| `width` | `number` | Grid width |
| `height` | `number` | Grid height |

## Design Decisions

- **Sparse arrays** for component storage — O(1) lookup, simple implementation
- **Fixed system pipeline** — deterministic execution, no scheduler overhead
- **Monolithic World** — flat API, internals are hidden
- **Zero runtime deps** — pure TypeScript, nothing to break
- **Generation counters** — minimal change detection for future diff/serialization layer

## License

MIT
