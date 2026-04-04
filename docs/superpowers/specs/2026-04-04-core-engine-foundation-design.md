# Core Engine Foundation — Design Spec

**Date:** 2026-04-04
**Scope:** ECS registry, spatial grid, game loop, World API
**Out of scope:** State diff serialization, networking/WebSocket transport, simulation logic

---

## Overview

A headless, AI-native game engine foundation for a 2D grid-based civilization-scale simulation. Built in Node.js/TypeScript with a strict ECS architecture. This spec covers the core engine layer: entity management, component storage, spatial indexing, a fixed-timestep game loop, and the top-level World API that ties them together.

---

## 1. ECS Registry (EntityManager + ComponentStore)

### Entity IDs

- `EntityId` is a plain `number`.
- Managed via a free-list for recycling destroyed entity slots.
- A generation counter per slot detects stale references (e.g., an ID that was destroyed and recycled).

### EntityManager API

```typescript
type EntityId = number;

interface EntityManager {
  create(): EntityId;
  destroy(id: EntityId): void;
  isAlive(id: EntityId): boolean;
}
```

### Component Storage

- One sparse array per component type, indexed by entity ID.
- Components are registered by a string key and a TypeScript interface.
- Components are pure data — no methods, no inheritance.
- Each component store tracks a `generation` counter that increments on any mutation (add, remove, or update). This is the minimal hook for future diff/change-detection support.

### Component API

```typescript
world.registerComponent<Position>('position');
world.addComponent(entity, 'position', { x: 0, y: 0 });
world.getComponent(entity, 'position');       // Position | undefined
world.removeComponent(entity, 'position');
```

### Querying

- Specify a list of required component keys. Returns an iterator over matching entity IDs.
- Implementation: linear scan over the smallest component array, filtering by presence in all other requested stores.
- No caching initially.

```typescript
for (const id of world.query('position', 'health')) {
  const pos = world.getComponent(id, 'position')!;
  const hp = world.getComponent(id, 'health')!;
}
```

---

## 2. Spatial Grid

A flat `Array` of size `width * height`. Each cell holds a `Set<EntityId>`, allocated lazily (null until first entity placed).

### SpatialGrid API

```typescript
interface SpatialGrid {
  width: number;
  height: number;

  insert(entity: EntityId, x: number, y: number): void;
  remove(entity: EntityId, x: number, y: number): void;
  move(entity: EntityId, fromX: number, fromY: number, toX: number, toY: number): void;
  getAt(x: number, y: number): ReadonlySet<EntityId> | null;
  getNeighbors(x: number, y: number): EntityId[];  // 4-directional
}
```

### Key Details

- The grid is **not** a component. It is a parallel data structure owned by `World`, kept in sync by a dedicated `SpatialIndexSystem` that runs first in the system pipeline.
- Index math: `index = y * width + x`. Bounds-checked — out-of-bounds calls throw.
- `getNeighbors` returns entities in the 4 orthogonal cells (up, down, left, right). No diagonals.
- Multiple entities can coexist on the same cell.
- Maximum supported size: 4096x4096.

---

## 3. Game Loop

A fixed-timestep loop targeting 60 TPS (16.667ms per tick). Uses `performance.now()` for high-resolution timing.

### GameLoop API

```typescript
interface GameLoop {
  start(): void;
  stop(): void;
  step(): void;          // advance exactly one tick (for testing)
  readonly tick: number;  // current tick count
  readonly tps: number;   // configured ticks per second
}
```

### Tick Execution Model

1. Accumulate elapsed time since last frame.
2. While accumulated time >= tick duration (16.667ms), consume one tick:
   - Run each system in pipeline order, passing `World`.
   - Increment tick counter.
   - (Component store generation counters increment at mutation time, not batched here.)
3. If the loop falls behind, cap catch-up to **4 ticks per frame** to prevent spiral-of-death.

### System Registration

```typescript
type System = (world: World) => void;

world.registerSystem(spatialIndexSystem);
world.registerSystem(movementSystem);
```

Systems are plain functions. No classes, no lifecycle hooks. Pipeline order = registration order — explicit and deterministic.

### Testing

`step()` is the primary testing interface. Tests never use `start()`/`stop()`. They call `step()` to advance exactly one tick and assert world state. This keeps tests deterministic and fast.

---

## 4. World (Top-level API)

The `World` class ties everything together. Single entry point for all engine interaction.

### World API

```typescript
interface World {
  // Entity management
  createEntity(): EntityId;
  destroyEntity(id: EntityId): void;
  isAlive(id: EntityId): boolean;

  // Component management
  registerComponent<T>(key: string): void;
  addComponent<T>(entity: EntityId, key: string, data: T): void;
  getComponent<T>(entity: EntityId, key: string): T | undefined;
  removeComponent(entity: EntityId, key: string): void;

  // Querying
  query(...keys: string[]): Iterable<EntityId>;

  // Spatial grid
  readonly grid: SpatialGrid;

  // Systems & loop
  registerSystem(system: System): void;
  step(): void;
  start(): void;
  stop(): void;
  readonly tick: number;
}
```

### Construction

```typescript
const world = new World({ gridWidth: 256, gridHeight: 256, tps: 60 });
```

Grid dimensions and TPS are set at creation time and immutable.

### Ownership

World owns EntityManager, SpatialGrid, and GameLoop internally. These are implementation details — the public API is flat on World itself (e.g., `world.createEntity()`, not `world.entities.create()`).

### Destruction Cascade

When `destroyEntity` is called, all components are removed and the entity is cleaned out of the spatial grid in the same tick.

---

## 5. Project Setup & File Structure

```
civ-engine/
├── src/
│   ├── world.ts           # World class — top-level API
│   ├── entity-manager.ts  # Entity creation, destruction, free-list, generations
│   ├── component-store.ts # Sparse array storage per component type, generation counter
│   ├── spatial-grid.ts    # Flat array grid, insert/remove/move/query
│   ├── game-loop.ts       # Fixed-timestep loop, tick execution
│   └── types.ts           # Shared types (EntityId, System, config interfaces)
├── tests/
│   ├── entity-manager.test.ts
│   ├── component-store.test.ts
│   ├── spatial-grid.test.ts
│   ├── game-loop.test.ts
│   └── world.test.ts      # Integration tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── docs/
    └── ARCHITECTURE.md
```

### Toolchain

- **TypeScript** — strict mode, targeting ES2022+ (Node 18+)
- **Vitest** — testing framework
- **ESLint** — with `@typescript-eslint`
- **ESM modules** — `"type": "module"` in package.json
- No bundler (Node library, not browser app)

### Dependencies

- **Zero runtime dependencies.** Pure TypeScript.
- **Dev dependencies only:** typescript, vitest, eslint, @typescript-eslint

---

## 6. Testing Strategy

Test-driven: tests are written **before** implementation for every module.

### Unit Tests Per Module

- **entity-manager.test.ts** — create/destroy entities, ID recycling via free-list, generation counter detects stale references, `isAlive` correctness
- **component-store.test.ts** — register components, add/get/remove per entity, generation counter increments on mutation, returns `undefined` for missing components, handles destroyed entities
- **spatial-grid.test.ts** — insert/remove/move entities, `getAt` returns correct sets, `getNeighbors` returns 4-directional neighbors, bounds checking throws, lazy cell allocation, multiple entities per cell
- **game-loop.test.ts** — `step()` advances tick by 1, systems run in registration order, systems receive world, tick count is accurate
- **world.test.ts** — Integration: create entity with position, step world, verify spatial grid updated. Destroy entity, verify cleanup cascade. Full pipeline: register systems, step, assert mutations.

### Testing Principles

- Tests use `step()` exclusively — never `start()`/`stop()`. Deterministic, no timers.
- Each test creates a fresh `World` instance. No shared state between tests.
- Tests assert **behavior**, not implementation details.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component storage | Sparse arrays | Simple, O(1) lookup, good enough for civ-sim entity density |
| System execution | Fixed pipeline | Deterministic, easy to test, explicit ordering |
| World architecture | Monolithic World object | Simple API surface, systems are plain functions receiving World |
| Spatial grid | Flat array + lazy Sets | Fast index math, memory-efficient for partially populated grids |
| Change detection | Generation counters only | Minimal hook for future diff support without building full diff system now |
| Grid neighbors | 4-directional only | Matches 2D orthogonal constraint |
| Multiple entities per cell | Yes (Set per cell) | Supports stacking (unit + terrain + resource on same tile) |
| Test framework | Vitest | Native TS/ESM, fast, zero-config for this setup |
