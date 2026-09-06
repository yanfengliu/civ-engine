# Core Engine Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core engine foundation — ECS registry, spatial grid, game loop, and World API — for a headless 2D civilization simulation engine.

**Architecture:** A single `World` class owns an `EntityManager`, per-type `ComponentStore` sparse arrays, a `SpatialGrid`, and a `GameLoop`. Systems are plain functions receiving `World`. The spatial grid is synced automatically by an internal spatial-index routine that runs before user systems each tick.

**Tech Stack:** Node.js 18+, TypeScript (strict, ESM), Vitest, ESLint + typescript-eslint

---

## File Structure

```
civ-engine/
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── src/
│   ├── types.ts            — EntityId, Position, WorldConfig
│   ├── entity-manager.ts   — Free-list entity creation/destruction/generations
│   ├── component-store.ts  — Sparse array per component type, generation counter
│   ├── spatial-grid.ts     — Flat array grid, lazy Set per cell
│   ├── game-loop.ts        — Fixed-timestep loop, step(), start()/stop()
│   └── world.ts            — World class, System type, spatial index sync
├── tests/
│   ├── entity-manager.test.ts
│   ├── component-store.test.ts
│   ├── spatial-grid.test.ts
│   ├── game-loop.test.ts
│   └── world.test.ts
└── docs/
    ├── ARCHITECTURE.md
    ├── devlog-detailed.md
    └── devlog-summary.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `eslint.config.js`
- Create: `src/types.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src tests docs
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "civ-engine",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests",
    "typecheck": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {},
});
```

- [ ] **Step 6: Create `eslint.config.js`**

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**'],
  },
);
```

- [ ] **Step 7: Create `src/types.ts`**

```typescript
export type EntityId = number;

export interface Position {
  x: number;
  y: number;
}

export interface WorldConfig {
  gridWidth: number;
  gridHeight: number;
  tps: number;
}
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, lockfile generated.

- [ ] **Step 9: Verify toolchain**

Run: `npx tsc`
Expected: No errors (types.ts has no issues).

Run: `npx vitest run`
Expected: "No test files found" or 0 tests — no failures.

Run: `npx eslint src tests`
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vitest.config.ts eslint.config.js src/types.ts
git commit -m "feat: scaffold project with TypeScript, Vitest, ESLint"
```

---

### Task 2: EntityManager

**Files:**
- Create: `tests/entity-manager.test.ts`
- Create: `src/entity-manager.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/entity-manager.test.ts
import { describe, it, expect } from 'vitest';
import { EntityManager } from '../src/entity-manager.js';

describe('EntityManager', () => {
  it('creates entities with sequential IDs starting from 0', () => {
    const em = new EntityManager();
    expect(em.create()).toBe(0);
    expect(em.create()).toBe(1);
    expect(em.create()).toBe(2);
  });

  it('reports created entities as alive', () => {
    const em = new EntityManager();
    const id = em.create();
    expect(em.isAlive(id)).toBe(true);
  });

  it('reports destroyed entities as not alive', () => {
    const em = new EntityManager();
    const id = em.create();
    em.destroy(id);
    expect(em.isAlive(id)).toBe(false);
  });

  it('recycles destroyed entity IDs', () => {
    const em = new EntityManager();
    const id0 = em.create();
    em.create(); // id1
    em.destroy(id0);
    const id2 = em.create();
    expect(id2).toBe(id0);
  });

  it('increments generation on destroy', () => {
    const em = new EntityManager();
    const id = em.create();
    expect(em.getGeneration(id)).toBe(0);
    em.destroy(id);
    expect(em.getGeneration(id)).toBe(1);
  });

  it('returns false for never-created entity IDs', () => {
    const em = new EntityManager();
    expect(em.isAlive(99)).toBe(false);
  });

  it('does not double-destroy', () => {
    const em = new EntityManager();
    const id = em.create();
    em.destroy(id);
    em.destroy(id);
    expect(em.getGeneration(id)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/entity-manager.test.ts`
Expected: FAIL — cannot import `EntityManager`.

- [ ] **Step 3: Write implementation**

```typescript
// src/entity-manager.ts
import type { EntityId } from './types.js';

export class EntityManager {
  private generations: number[] = [];
  private alive: boolean[] = [];
  private freeList: number[] = [];

  create(): EntityId {
    if (this.freeList.length > 0) {
      const id = this.freeList.pop()!;
      this.alive[id] = true;
      return id;
    }
    const id = this.generations.length;
    this.generations.push(0);
    this.alive.push(true);
    return id;
  }

  destroy(id: EntityId): void {
    if (!this.alive[id]) return;
    this.alive[id] = false;
    this.generations[id]++;
    this.freeList.push(id);
  }

  isAlive(id: EntityId): boolean {
    return id >= 0 && id < this.alive.length && this.alive[id];
  }

  getGeneration(id: EntityId): number {
    return this.generations[id] ?? 0;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/entity-manager.test.ts`
Expected: 7 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/entity-manager.ts tests/entity-manager.test.ts`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/entity-manager.ts tests/entity-manager.test.ts
git commit -m "feat: add EntityManager with free-list recycling and generations"
```

---

### Task 3: ComponentStore

**Files:**
- Create: `tests/component-store.test.ts`
- Create: `src/component-store.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/component-store.test.ts
import { describe, it, expect } from 'vitest';
import { ComponentStore } from '../src/component-store.js';

describe('ComponentStore', () => {
  it('stores and retrieves component data', () => {
    const store = new ComponentStore<{ x: number; y: number }>();
    store.set(0, { x: 10, y: 20 });
    expect(store.get(0)).toEqual({ x: 10, y: 20 });
  });

  it('returns undefined for missing entity', () => {
    const store = new ComponentStore<{ x: number }>();
    expect(store.get(99)).toBeUndefined();
  });

  it('removes component data', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 10 });
    store.remove(0);
    expect(store.get(0)).toBeUndefined();
  });

  it('reports has correctly', () => {
    const store = new ComponentStore<{ x: number }>();
    expect(store.has(0)).toBe(false);
    store.set(0, { x: 10 });
    expect(store.has(0)).toBe(true);
    store.remove(0);
    expect(store.has(0)).toBe(false);
  });

  it('increments generation on set', () => {
    const store = new ComponentStore<{ x: number }>();
    const gen0 = store.generation;
    store.set(0, { x: 10 });
    expect(store.generation).toBe(gen0 + 1);
  });

  it('increments generation on remove', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 10 });
    const gen = store.generation;
    store.remove(0);
    expect(store.generation).toBe(gen + 1);
  });

  it('does not increment generation on no-op remove', () => {
    const store = new ComponentStore<{ x: number }>();
    const gen = store.generation;
    store.remove(99);
    expect(store.generation).toBe(gen);
  });

  it('tracks size correctly', () => {
    const store = new ComponentStore<{ x: number }>();
    expect(store.size).toBe(0);
    store.set(0, { x: 1 });
    expect(store.size).toBe(1);
    store.set(5, { x: 2 });
    expect(store.size).toBe(2);
    store.remove(0);
    expect(store.size).toBe(1);
  });

  it('iterates over entities with components', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.set(3, { x: 2 });
    store.set(7, { x: 3 });
    const ids = [...store.entities()];
    expect(ids).toEqual([0, 3, 7]);
  });

  it('overwrites existing component data without double-counting size', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 10 });
    store.set(0, { x: 20 });
    expect(store.get(0)).toEqual({ x: 20 });
    expect(store.size).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/component-store.test.ts`
Expected: FAIL — cannot import `ComponentStore`.

- [ ] **Step 3: Write implementation**

```typescript
// src/component-store.ts
import type { EntityId } from './types.js';

export class ComponentStore<T> {
  private data: (T | undefined)[] = [];
  private _generation = 0;
  private _size = 0;

  set(entityId: EntityId, component: T): void {
    if (this.data[entityId] === undefined) {
      this._size++;
    }
    this.data[entityId] = component;
    this._generation++;
  }

  get(entityId: EntityId): T | undefined {
    return this.data[entityId];
  }

  has(entityId: EntityId): boolean {
    return this.data[entityId] !== undefined;
  }

  remove(entityId: EntityId): void {
    if (this.data[entityId] === undefined) return;
    this.data[entityId] = undefined;
    this._size--;
    this._generation++;
  }

  get generation(): number {
    return this._generation;
  }

  get size(): number {
    return this._size;
  }

  *entities(): IterableIterator<EntityId> {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== undefined) {
        yield i;
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/component-store.test.ts`
Expected: 10 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/component-store.ts tests/component-store.test.ts`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/component-store.ts tests/component-store.test.ts
git commit -m "feat: add ComponentStore with sparse array storage and generation tracking"
```

---

### Task 4: SpatialGrid

**Files:**
- Create: `tests/spatial-grid.test.ts`
- Create: `src/spatial-grid.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/spatial-grid.test.ts
import { describe, it, expect } from 'vitest';
import { SpatialGrid } from '../src/spatial-grid.js';

describe('SpatialGrid', () => {
  it('inserts and retrieves entity at position', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 5);
    const cell = grid.getAt(5, 5);
    expect(cell).not.toBeNull();
    expect(cell!.has(0)).toBe(true);
  });

  it('returns null for empty cell', () => {
    const grid = new SpatialGrid(10, 10);
    expect(grid.getAt(0, 0)).toBeNull();
  });

  it('removes entity from cell', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 5);
    grid.remove(0, 5, 5);
    const cell = grid.getAt(5, 5);
    expect(cell === null || cell.size === 0).toBe(true);
  });

  it('moves entity between cells', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 2, 3);
    grid.move(0, 2, 3, 7, 8);
    const oldCell = grid.getAt(2, 3);
    expect(oldCell === null || !oldCell.has(0)).toBe(true);
    const newCell = grid.getAt(7, 8);
    expect(newCell).not.toBeNull();
    expect(newCell!.has(0)).toBe(true);
  });

  it('supports multiple entities in same cell', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 5);
    grid.insert(1, 5, 5);
    const cell = grid.getAt(5, 5);
    expect(cell!.size).toBe(2);
    expect(cell!.has(0)).toBe(true);
    expect(cell!.has(1)).toBe(true);
  });

  it('returns 4-directional neighbors only', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 4); // up
    grid.insert(1, 5, 6); // down
    grid.insert(2, 4, 5); // left
    grid.insert(3, 6, 5); // right
    grid.insert(4, 4, 4); // diagonal — should NOT appear
    const neighbors = grid.getNeighbors(5, 5);
    expect(neighbors.sort()).toEqual([0, 1, 2, 3]);
  });

  it('returns partial neighbors at corner', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 1, 0); // right of (0,0)
    grid.insert(1, 0, 1); // below (0,0)
    const neighbors = grid.getNeighbors(0, 0);
    expect(neighbors.sort()).toEqual([0, 1]);
  });

  it('throws on out-of-bounds insert', () => {
    const grid = new SpatialGrid(10, 10);
    expect(() => grid.insert(0, -1, 0)).toThrow(RangeError);
    expect(() => grid.insert(0, 10, 0)).toThrow(RangeError);
    expect(() => grid.insert(0, 0, -1)).toThrow(RangeError);
    expect(() => grid.insert(0, 0, 10)).toThrow(RangeError);
  });

  it('throws on out-of-bounds getAt', () => {
    const grid = new SpatialGrid(10, 10);
    expect(() => grid.getAt(-1, 0)).toThrow(RangeError);
    expect(() => grid.getAt(10, 0)).toThrow(RangeError);
  });

  it('throws on out-of-bounds getNeighbors', () => {
    const grid = new SpatialGrid(10, 10);
    expect(() => grid.getNeighbors(-1, 0)).toThrow(RangeError);
    expect(() => grid.getNeighbors(10, 0)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/spatial-grid.test.ts`
Expected: FAIL — cannot import `SpatialGrid`.

- [ ] **Step 3: Write implementation**

```typescript
// src/spatial-grid.ts
import type { EntityId } from './types.js';

export class SpatialGrid {
  readonly width: number;
  readonly height: number;
  private cells: (Set<EntityId> | null)[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Array<Set<EntityId> | null>(width * height).fill(null);
  }

  insert(entity: EntityId, x: number, y: number): void {
    const idx = this.index(x, y);
    if (this.cells[idx] === null) {
      this.cells[idx] = new Set();
    }
    this.cells[idx]!.add(entity);
  }

  remove(entity: EntityId, x: number, y: number): void {
    const idx = this.index(x, y);
    this.cells[idx]?.delete(entity);
  }

  move(
    entity: EntityId,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): void {
    this.remove(entity, fromX, fromY);
    this.insert(entity, toX, toY);
  }

  getAt(x: number, y: number): ReadonlySet<EntityId> | null {
    return this.cells[this.index(x, y)];
  }

  getNeighbors(x: number, y: number): EntityId[] {
    this.assertBounds(x, y);
    const result: EntityId[] = [];
    const directions: [number, number][] = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        const cell = this.cells[ny * this.width + nx];
        if (cell) {
          for (const entity of cell) {
            result.push(entity);
          }
        }
      }
    }
    return result;
  }

  private assertBounds(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError(`Position (${x}, ${y}) is out of bounds`);
    }
  }

  private index(x: number, y: number): number {
    this.assertBounds(x, y);
    return y * this.width + x;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/spatial-grid.test.ts`
Expected: 10 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/spatial-grid.ts tests/spatial-grid.test.ts`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/spatial-grid.ts tests/spatial-grid.test.ts
git commit -m "feat: add SpatialGrid with flat array, lazy Sets, 4-directional neighbors"
```

---

### Task 5: GameLoop

**Files:**
- Create: `tests/game-loop.test.ts`
- Create: `src/game-loop.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/game-loop.test.ts
import { describe, it, expect } from 'vitest';
import { GameLoop } from '../src/game-loop.js';

describe('GameLoop', () => {
  it('calls onTick when step() is invoked', () => {
    let called = false;
    const loop = new GameLoop({
      tps: 60,
      onTick: () => {
        called = true;
      },
    });
    loop.step();
    expect(called).toBe(true);
  });

  it('increments tick on step()', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(loop.tick).toBe(0);
    loop.step();
    expect(loop.tick).toBe(1);
    loop.step();
    expect(loop.tick).toBe(2);
  });

  it('returns configured tps', () => {
    const loop = new GameLoop({ tps: 30, onTick: () => {} });
    expect(loop.tps).toBe(30);
  });

  it('calls onTick the correct number of times across multiple steps', () => {
    let count = 0;
    const loop = new GameLoop({
      tps: 60,
      onTick: () => {
        count++;
      },
    });
    loop.step();
    loop.step();
    loop.step();
    expect(count).toBe(3);
    expect(loop.tick).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: FAIL — cannot import `GameLoop`.

- [ ] **Step 3: Write implementation**

```typescript
// src/game-loop.ts
export class GameLoop {
  private _tick = 0;
  private readonly _tps: number;
  private readonly tickDuration: number;
  private readonly onTick: () => void;
  private readonly maxTicksPerFrame = 4;
  private running = false;
  private lastTime = 0;
  private accumulated = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: { tps: number; onTick: () => void }) {
    this._tps = config.tps;
    this.tickDuration = 1000 / config.tps;
    this.onTick = config.onTick;
  }

  step(): void {
    this.onTick();
    this._tick++;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.accumulated = 0;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  get tick(): number {
    return this._tick;
  }

  get tps(): number {
    return this._tps;
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    this.accumulated += now - this.lastTime;
    this.lastTime = now;

    let ticksThisFrame = 0;
    while (
      this.accumulated >= this.tickDuration &&
      ticksThisFrame < this.maxTicksPerFrame
    ) {
      this.step();
      this.accumulated -= this.tickDuration;
      ticksThisFrame++;
    }

    if (ticksThisFrame >= this.maxTicksPerFrame) {
      this.accumulated = 0;
    }

    this.timer = setTimeout(() => this.loop(), 1);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/game-loop.ts tests/game-loop.test.ts`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/game-loop.ts tests/game-loop.test.ts
git commit -m "feat: add GameLoop with fixed-timestep and spiral-of-death prevention"
```

---

### Task 6: World

**Files:**
- Create: `tests/world.test.ts`
- Create: `src/world.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/world.test.ts
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('World', () => {
  it('creates and tracks entities', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    expect(world.isAlive(id)).toBe(true);
  });

  it('destroys entities', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.destroyEntity(id);
    expect(world.isAlive(id)).toBe(false);
  });

  it('registers components and round-trips data', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.addComponent(id, 'health', { hp: 100 });
    expect(world.getComponent(id, 'health')).toEqual({ hp: 100 });
  });

  it('removes components', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.addComponent(id, 'health', { hp: 100 });
    world.removeComponent(id, 'health');
    expect(world.getComponent(id, 'health')).toBeUndefined();
  });

  it('queries entities by component keys', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    world.registerComponent<{ hp: number }>('health');

    const e1 = world.createEntity();
    world.addComponent(e1, 'position', { x: 0, y: 0 });
    world.addComponent(e1, 'health', { hp: 100 });

    const e2 = world.createEntity();
    world.addComponent(e2, 'position', { x: 1, y: 1 });

    const e3 = world.createEntity();
    world.addComponent(e3, 'health', { hp: 50 });

    const result = [...world.query('position', 'health')];
    expect(result).toEqual([e1]);
  });

  it('queries with single component key', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');

    const e1 = world.createEntity();
    world.addComponent(e1, 'health', { hp: 100 });
    const e2 = world.createEntity();
    world.addComponent(e2, 'health', { hp: 50 });
    world.createEntity(); // no health

    const result = [...world.query('health')];
    expect(result).toEqual([e1, e2]);
  });

  it('runs systems in registration order on step()', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem(() => order.push('A'));
    world.registerSystem(() => order.push('B'));
    world.step();
    expect(order).toEqual(['A', 'B']);
  });

  it('increments tick on step()', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.tick).toBe(0);
    world.step();
    expect(world.tick).toBe(1);
  });

  it('syncs spatial grid with position components on step()', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 5, y: 5 });
    world.step();
    const cell = world.grid.getAt(5, 5);
    expect(cell).not.toBeNull();
    expect(cell!.has(id)).toBe(true);
  });

  it('updates spatial grid when position changes between ticks', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 3, y: 3 });
    world.step();

    const pos = world.getComponent<{ x: number; y: number }>(id, 'position')!;
    pos.x = 7;
    pos.y = 7;
    world.step();

    expect(world.grid.getAt(3, 3)?.has(id) ?? false).toBe(false);
    expect(world.grid.getAt(7, 7)!.has(id)).toBe(true);
  });

  it('cleans up grid and components on destroyEntity', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 5, y: 5 });
    world.step();

    world.destroyEntity(id);
    expect(world.isAlive(id)).toBe(false);
    expect(world.getComponent(id, 'position')).toBeUndefined();
    expect(world.grid.getAt(5, 5)?.has(id) ?? false).toBe(false);
  });

  it('throws when registering duplicate component', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent('position');
    expect(() => world.registerComponent('position')).toThrow();
  });

  it('throws when adding component to unregistered key', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    expect(() => world.addComponent(id, 'nonexistent', {})).toThrow();
  });

  it('removes entity from grid on destroy even if position was mutated since last sync', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 3, y: 3 });
    world.step();

    // Mutate position without stepping
    const pos = world.getComponent<{ x: number; y: number }>(id, 'position')!;
    pos.x = 9;
    pos.y = 9;

    // Destroy — should remove from grid at (3,3) where it actually lives
    world.destroyEntity(id);
    expect(world.grid.getAt(3, 3)?.has(id) ?? false).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/world.test.ts`
Expected: FAIL — cannot import `World`.

- [ ] **Step 3: Write implementation**

```typescript
// src/world.ts
import type { EntityId, Position, WorldConfig } from './types.js';
import { EntityManager } from './entity-manager.js';
import { ComponentStore } from './component-store.js';
import { SpatialGrid } from './spatial-grid.js';
import { GameLoop } from './game-loop.js';

export type System = (world: World) => void;

export class World {
  private entityManager: EntityManager;
  private componentStores = new Map<string, ComponentStore<unknown>>();
  private systems: System[] = [];
  private gameLoop: GameLoop;
  private previousPositions = new Map<EntityId, { x: number; y: number }>();
  readonly grid: SpatialGrid;

  constructor(config: WorldConfig) {
    this.entityManager = new EntityManager();
    this.grid = new SpatialGrid(config.gridWidth, config.gridHeight);
    this.gameLoop = new GameLoop({
      tps: config.tps,
      onTick: () => this.executeTick(),
    });
  }

  createEntity(): EntityId {
    return this.entityManager.create();
  }

  destroyEntity(id: EntityId): void {
    const prev = this.previousPositions.get(id);
    if (prev) {
      this.grid.remove(id, prev.x, prev.y);
      this.previousPositions.delete(id);
    }
    for (const store of this.componentStores.values()) {
      store.remove(id);
    }
    this.entityManager.destroy(id);
  }

  isAlive(id: EntityId): boolean {
    return this.entityManager.isAlive(id);
  }

  registerComponent<T>(key: string): void {
    if (this.componentStores.has(key)) {
      throw new Error(`Component '${key}' is already registered`);
    }
    this.componentStores.set(key, new ComponentStore<T>());
  }

  addComponent<T>(entity: EntityId, key: string, data: T): void {
    const store = this.getStore<T>(key);
    store.set(entity, data);
  }

  getComponent<T>(entity: EntityId, key: string): T | undefined {
    const store = this.componentStores.get(key) as
      | ComponentStore<T>
      | undefined;
    return store?.get(entity);
  }

  removeComponent(entity: EntityId, key: string): void {
    const store = this.componentStores.get(key);
    store?.remove(entity);
  }

  *query(...keys: string[]): IterableIterator<EntityId> {
    if (keys.length === 0) return;

    const stores = keys.map((k) => {
      const store = this.componentStores.get(k);
      if (!store) throw new Error(`Component '${k}' is not registered`);
      return store;
    });

    let smallest = stores[0];
    for (let i = 1; i < stores.length; i++) {
      if (stores[i].size < smallest.size) {
        smallest = stores[i];
      }
    }

    for (const id of smallest.entities()) {
      if (stores.every((s) => s.has(id))) {
        yield id;
      }
    }
  }

  registerSystem(system: System): void {
    this.systems.push(system);
  }

  step(): void {
    this.gameLoop.step();
  }

  start(): void {
    this.gameLoop.start();
  }

  stop(): void {
    this.gameLoop.stop();
  }

  get tick(): number {
    return this.gameLoop.tick;
  }

  private executeTick(): void {
    this.syncSpatialIndex();
    for (const system of this.systems) {
      system(this);
    }
  }

  private syncSpatialIndex(): void {
    const posStore = this.componentStores.get('position') as
      | ComponentStore<Position>
      | undefined;
    if (!posStore) return;

    const seen = new Set<EntityId>();

    for (const id of posStore.entities()) {
      seen.add(id);
      const pos = posStore.get(id)!;
      const prev = this.previousPositions.get(id);

      if (!prev) {
        this.grid.insert(id, pos.x, pos.y);
        this.previousPositions.set(id, { x: pos.x, y: pos.y });
      } else if (prev.x !== pos.x || prev.y !== pos.y) {
        this.grid.move(id, prev.x, prev.y, pos.x, pos.y);
        prev.x = pos.x;
        prev.y = pos.y;
      }
    }

    for (const [id, pos] of this.previousPositions) {
      if (!seen.has(id)) {
        this.grid.remove(id, pos.x, pos.y);
        this.previousPositions.delete(id);
      }
    }
  }

  private getStore<T>(key: string): ComponentStore<T> {
    const store = this.componentStores.get(key);
    if (!store) throw new Error(`Component '${key}' is not registered`);
    return store as ComponentStore<T>;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/world.test.ts`
Expected: 14 tests PASS.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All 45 tests PASS (7 + 10 + 10 + 4 + 14).

- [ ] **Step 6: Lint all files**

Run: `npx eslint src tests`
Expected: No errors.

- [ ] **Step 7: Type check**

Run: `npx tsc`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/world.ts tests/world.test.ts
git commit -m "feat: add World class with ECS, spatial index sync, and system pipeline"
```

---

### Task 7: Documentation

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/devlog-detailed.md`
- Create: `docs/devlog-summary.md`

- [ ] **Step 1: Create `docs/ARCHITECTURE.md`**

```markdown
# Architecture

## Overview

Civ-engine is a headless, AI-native game engine for a 2D grid-based civilization-scale simulation. Built in Node.js/TypeScript with a strict ECS (Entity-Component-System) architecture.

## Component Map

| Component | File | Responsibility |
|-----------|------|----------------|
| World | `src/world.ts` | Top-level API, owns all subsystems, system pipeline |
| EntityManager | `src/entity-manager.ts` | Entity creation/destruction, ID recycling, generations |
| ComponentStore | `src/component-store.ts` | Sparse array storage per component type |
| SpatialGrid | `src/spatial-grid.ts` | 2D flat array grid, entity spatial indexing |
| GameLoop | `src/game-loop.ts` | Fixed-timestep loop (60 TPS), timing |
| Types | `src/types.ts` | Shared type definitions |

## Data Flow

```
World.step()
  → GameLoop.step()
    → World.executeTick()
      → World.syncSpatialIndex()  (sync grid with Position components)
      → System A(world)           (user systems in registration order)
      → System B(world)
      → ...
    → tick++
```

## Boundaries

- **World** is the only public entry point. Internal classes (EntityManager, ComponentStore, GameLoop) are implementation details.
- **Systems** are pure functions `(world: World) => void`. No classes, no lifecycle hooks.
- **Components** are pure data interfaces. No methods, no inheritance.
- **SpatialGrid** is synced automatically by an internal spatial-index routine. User systems should not call grid.insert/remove/move directly.
- **GameLoop** handles timing only. It calls World's tick executor via an onTick callback.

## Technology Map

| Technology | Purpose |
|------------|---------|
| TypeScript | Language (strict mode, ES2022, ESM) |
| Vitest | Test framework |
| ESLint + typescript-eslint | Linting |
| Node.js 18+ | Runtime |

## Key Architectural Decisions

| # | Date | Decision | Rationale |
|---|------|----------|-----------|
| 1 | 2026-04-04 | Sparse arrays for component storage | Simple, O(1) lookup, sufficient for expected entity density |
| 2 | 2026-04-04 | Fixed system pipeline (no scheduler) | Deterministic, easy to test and debug |
| 3 | 2026-04-04 | Monolithic World object | Simple API surface, avoids premature decoupling |
| 4 | 2026-04-04 | Generation counters for change detection hooks | Minimal cost now, enables future diff/output layer |
| 5 | 2026-04-04 | Zero runtime dependencies | Performance and simplicity for a game engine |

## Drift Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-04 | Initial architecture | Foundation spec implementation |
```

- [ ] **Step 2: Create `docs/devlog-detailed.md`**

```markdown
# Devlog — Detailed

## [2026-04-04] — Core engine foundation implemented
**Action:** Implemented ECS registry (EntityManager + ComponentStore), SpatialGrid, GameLoop, and World API.
**Result:** Success — all tests passing (45 tests), lint clean, type check clean.
**Files changed:** src/types.ts, src/entity-manager.ts, src/component-store.ts, src/spatial-grid.ts, src/game-loop.ts, src/world.ts, tests/*.test.ts, docs/ARCHITECTURE.md
**Reasoning:** Foundation-first approach — build the core engine primitives before any simulation logic.
**Notes:** Spatial grid sync is asymmetric: inserts happen at tick start via syncSpatialIndex, but destroyEntity cleans up immediately.
```

- [ ] **Step 3: Create `docs/devlog-summary.md`**

```markdown
# Devlog — Summary

Read this file at session start to understand current project state.
Detailed log: `docs/devlog-detailed.md`

## Current State

- Core engine foundation complete: ECS, spatial grid, game loop, World API
- 45 tests passing, lint clean, type check clean
- Zero runtime dependencies, TypeScript strict mode, ESM

## History

- 2026-04-04: Scaffolded project, implemented EntityManager, ComponentStore, SpatialGrid, GameLoop, World
```

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md docs/devlog-detailed.md docs/devlog-summary.md
git commit -m "docs: add architecture docs, devlog setup"
```
