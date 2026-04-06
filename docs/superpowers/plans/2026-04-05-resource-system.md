# Resource System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a resource subsystem with registered types, per-entity pools, production/consumption rates, automatic transfers, and diff integration.

**Architecture:** A new `ResourceStore` class owns all resource state (pools, rates, transfers). World owns a ResourceStore instance and delegates all resource methods to it. The built-in resource processing runs after user systems in `executeTick()`. Dirty tracking follows the same pattern as ComponentStore.

**Tech Stack:** TypeScript 5.7+ (strict mode, ESM, Node16 resolution), Vitest 3

**Spec:** `docs/superpowers/specs/2026-04-05-resource-system-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/resource-store.ts` | Create | ResourceStore class, ResourcePool type, Transfer type |
| `src/diff.ts` | Modify | Add `resources` field to TickDiff |
| `src/world.ts` | Modify | Add ResourceStore as subsystem; proxy methods; wire into executeTick, buildDiff, destroyEntity |
| `tests/resource-store.test.ts` | Create | Unit tests for ResourceStore |
| `tests/resource.test.ts` | Create | Integration tests via World |
| `docs/ARCHITECTURE.md` | Modify | Component map, tick flow, boundaries, drift log |
| `docs/ROADMAP.md` | Modify | Move "Resource system" to Built |

---

## Task 1: ResourceStore — registration and pool basics

**Files:**
- Create: `src/resource-store.ts`
- Create: `tests/resource-store.test.ts`

- [ ] **Step 1: Write failing tests for registration and pool CRUD**

Create `tests/resource-store.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ResourceStore } from '../src/resource-store.js';

describe('ResourceStore', () => {
  it('register creates a new resource type', () => {
    const store = new ResourceStore();
    store.register('food');
    expect(() => store.register('food')).toThrow("Resource 'food' is already registered");
  });

  it('addResource creates pool and returns amount added', () => {
    const store = new ResourceStore();
    store.register('food');
    const added = store.addResource(0, 'food', 50);
    expect(added).toBe(50);
    expect(store.getResource(0, 'food')).toEqual({ current: 50, max: Infinity });
  });

  it('addResource caps at max', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 100 });
    store.addResource(0, 'food', 80);
    const added = store.addResource(0, 'food', 50);
    expect(added).toBe(20);
    expect(store.getResource(0, 'food')!.current).toBe(100);
  });

  it('removeResource returns actual amount removed', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 30);
    const removed = store.removeResource(0, 'food', 50);
    expect(removed).toBe(30);
    expect(store.getResource(0, 'food')!.current).toBe(0);
  });

  it('getResource returns undefined for missing pool', () => {
    const store = new ResourceStore();
    store.register('food');
    expect(store.getResource(0, 'food')).toBeUndefined();
  });

  it('setResourceMax clamps current when lowered', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 80);
    store.setResourceMax(0, 'food', 50);
    const pool = store.getResource(0, 'food')!;
    expect(pool.max).toBe(50);
    expect(pool.current).toBe(50);
  });

  it('getResourceEntities yields entities with pools', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 10);
    store.addResource(5, 'food', 20);
    const ids = [...store.getResourceEntities('food')];
    expect(ids).toEqual([0, 5]);
  });

  it('throws on unregistered resource key', () => {
    const store = new ResourceStore();
    expect(() => store.addResource(0, 'gold', 10)).toThrow("Resource 'gold' is not registered");
    expect(() => store.removeResource(0, 'gold', 10)).toThrow("Resource 'gold' is not registered");
    expect(() => store.getResource(0, 'gold')).toThrow("Resource 'gold' is not registered");
    expect(() => store.setResourceMax(0, 'gold', 10)).toThrow("Resource 'gold' is not registered");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/resource-store.test.ts`
Expected: FAIL — cannot find module `../src/resource-store.js`.

- [ ] **Step 3: Implement ResourceStore with registration and pool CRUD**

Create `src/resource-store.ts`:

```typescript
import type { EntityId } from './types.js';

export interface ResourcePool {
  current: number;
  max: number;
}

export interface Transfer {
  id: number;
  from: EntityId;
  to: EntityId;
  resource: string;
  rate: number;
}

export class ResourceStore {
  private registeredKeys = new Map<string, { defaultMax: number }>();
  private pools = new Map<string, Map<EntityId, ResourcePool>>();
  private production = new Map<string, Map<EntityId, number>>();
  private consumption = new Map<string, Map<EntityId, number>>();
  private transfers: Transfer[] = [];
  private nextTransferId = 0;
  private dirtyPools = new Map<string, Set<EntityId>>();
  private removedPools = new Map<string, Set<EntityId>>();

  register(key: string, options?: { defaultMax?: number }): void {
    if (this.registeredKeys.has(key)) {
      throw new Error(`Resource '${key}' is already registered`);
    }
    this.registeredKeys.set(key, { defaultMax: options?.defaultMax ?? Infinity });
    this.pools.set(key, new Map());
    this.production.set(key, new Map());
    this.consumption.set(key, new Map());
    this.dirtyPools.set(key, new Set());
    this.removedPools.set(key, new Set());
  }

  addResource(entityId: EntityId, key: string, amount: number): number {
    const opts = this.getOpts(key);
    const poolMap = this.pools.get(key)!;
    let pool = poolMap.get(entityId);
    if (!pool) {
      pool = { current: 0, max: opts.defaultMax };
      poolMap.set(entityId, pool);
    }
    const space = pool.max - pool.current;
    const actual = Math.min(amount, space);
    pool.current += actual;
    this.markDirty(key, entityId);
    return actual;
  }

  removeResource(entityId: EntityId, key: string, amount: number): number {
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return 0;
    const actual = Math.min(amount, pool.current);
    pool.current -= actual;
    this.markDirty(key, entityId);
    return actual;
  }

  getResource(entityId: EntityId, key: string): ResourcePool | undefined {
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return undefined;
    return { current: pool.current, max: pool.max };
  }

  setResourceMax(entityId: EntityId, key: string, max: number): void {
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return;
    pool.max = max;
    if (pool.current > max) {
      pool.current = max;
    }
    this.markDirty(key, entityId);
  }

  *getResourceEntities(key: string): IterableIterator<EntityId> {
    this.getOpts(key);
    yield* this.pools.get(key)!.keys();
  }

  setProduction(entityId: EntityId, key: string, rate: number): void {
    const opts = this.getOpts(key);
    if (rate === 0) {
      this.production.get(key)!.delete(entityId);
      return;
    }
    this.production.get(key)!.set(entityId, rate);
    const poolMap = this.pools.get(key)!;
    if (!poolMap.has(entityId)) {
      poolMap.set(entityId, { current: 0, max: opts.defaultMax });
      this.markDirty(key, entityId);
    }
  }

  getProduction(entityId: EntityId, key: string): number {
    this.getOpts(key);
    return this.production.get(key)!.get(entityId) ?? 0;
  }

  setConsumption(entityId: EntityId, key: string, rate: number): void {
    this.getOpts(key);
    if (rate === 0) {
      this.consumption.get(key)!.delete(entityId);
      return;
    }
    this.consumption.get(key)!.set(entityId, rate);
  }

  getConsumption(entityId: EntityId, key: string): number {
    this.getOpts(key);
    return this.consumption.get(key)!.get(entityId) ?? 0;
  }

  addTransfer(from: EntityId, to: EntityId, resource: string, rate: number): number {
    this.getOpts(resource);
    const id = this.nextTransferId++;
    this.transfers.push({ id, from, to, resource, rate });
    return id;
  }

  removeTransfer(id: number): void {
    const idx = this.transfers.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.transfers.splice(idx, 1);
    }
  }

  getTransfers(entityId: EntityId): Transfer[] {
    return this.transfers.filter((t) => t.from === entityId || t.to === entityId);
  }

  processTick(isAlive: (id: EntityId) => boolean): void {
    for (const [key, rateMap] of this.production) {
      const poolMap = this.pools.get(key)!;
      for (const [entityId, rate] of rateMap) {
        const pool = poolMap.get(entityId);
        if (!pool) continue;
        const space = pool.max - pool.current;
        const actual = Math.min(rate, space);
        if (actual > 0) {
          pool.current += actual;
          this.markDirty(key, entityId);
        }
      }
    }
    for (const [key, rateMap] of this.consumption) {
      const poolMap = this.pools.get(key)!;
      for (const [entityId, rate] of rateMap) {
        const pool = poolMap.get(entityId);
        if (!pool) continue;
        const actual = Math.min(rate, pool.current);
        if (actual > 0) {
          pool.current -= actual;
          this.markDirty(key, entityId);
        }
      }
    }
    const deadTransfers: number[] = [];
    for (const transfer of this.transfers) {
      if (!isAlive(transfer.from) || !isAlive(transfer.to)) {
        deadTransfers.push(transfer.id);
        continue;
      }
      const poolMap = this.pools.get(transfer.resource);
      if (!poolMap) continue;
      const srcPool = poolMap.get(transfer.from);
      const dstPool = poolMap.get(transfer.to);
      if (!srcPool || !dstPool) continue;
      const available = Math.min(transfer.rate, srcPool.current);
      const space = dstPool.max - dstPool.current;
      const actual = Math.min(available, space);
      if (actual > 0) {
        srcPool.current -= actual;
        dstPool.current += actual;
        this.markDirty(transfer.resource, transfer.from);
        this.markDirty(transfer.resource, transfer.to);
      }
    }
    for (const id of deadTransfers) {
      this.removeTransfer(id);
    }
  }

  removeEntity(entityId: EntityId): void {
    for (const [key, poolMap] of this.pools) {
      if (poolMap.has(entityId)) {
        poolMap.delete(entityId);
        this.dirtyPools.get(key)!.delete(entityId);
        this.removedPools.get(key)!.add(entityId);
      }
    }
    for (const rateMap of this.production.values()) {
      rateMap.delete(entityId);
    }
    for (const rateMap of this.consumption.values()) {
      rateMap.delete(entityId);
    }
    this.transfers = this.transfers.filter(
      (t) => t.from !== entityId && t.to !== entityId,
    );
  }

  getDirty(): Record<string, { set: Array<[EntityId, ResourcePool]>; removed: EntityId[] }> {
    const result: Record<string, { set: Array<[EntityId, ResourcePool]>; removed: EntityId[] }> = {};
    for (const [key, dirtySet] of this.dirtyPools) {
      const removedSet = this.removedPools.get(key)!;
      if (dirtySet.size === 0 && removedSet.size === 0) continue;
      const set: Array<[EntityId, ResourcePool]> = [];
      const poolMap = this.pools.get(key)!;
      for (const id of dirtySet) {
        const pool = poolMap.get(id);
        if (pool) {
          set.push([id, { current: pool.current, max: pool.max }]);
        }
      }
      result[key] = { set, removed: [...removedSet] };
    }
    return result;
  }

  clearDirty(): void {
    for (const dirtySet of this.dirtyPools.values()) {
      dirtySet.clear();
    }
    for (const removedSet of this.removedPools.values()) {
      removedSet.clear();
    }
  }

  private getOpts(key: string): { defaultMax: number } {
    const opts = this.registeredKeys.get(key);
    if (!opts) {
      throw new Error(`Resource '${key}' is not registered`);
    }
    return opts;
  }

  private markDirty(key: string, entityId: EntityId): void {
    this.dirtyPools.get(key)!.add(entityId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/resource-store.test.ts`
Expected: All 8 tests PASS.

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/resource-store.ts tests/resource-store.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 6: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/resource-store.ts tests/resource-store.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add ResourceStore with registration and pool CRUD"
```

---

## Task 2: ResourceStore — rates and processTick

**Files:**
- Modify: `tests/resource-store.test.ts`

- [ ] **Step 1: Write failing tests for rates and processTick**

Append to the `describe('ResourceStore', ...)` block in `tests/resource-store.test.ts`:

```typescript
  it('setProduction and getProduction round-trip', () => {
    const store = new ResourceStore();
    store.register('food');
    store.setProduction(0, 'food', 5);
    expect(store.getProduction(0, 'food')).toBe(5);
  });

  it('setConsumption and getConsumption round-trip', () => {
    const store = new ResourceStore();
    store.register('food');
    store.setConsumption(0, 'food', 3);
    expect(store.getConsumption(0, 'food')).toBe(3);
  });

  it('setProduction auto-creates pool', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 200 });
    store.setProduction(0, 'food', 5);
    expect(store.getResource(0, 'food')).toEqual({ current: 0, max: 200 });
  });

  it('processTick applies production then consumption', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 100 });
    store.addResource(0, 'food', 50);
    store.setProduction(0, 'food', 10);
    store.setConsumption(0, 'food', 7);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(53); // 50 + 10 - 7
  });

  it('processTick caps production at max', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 100 });
    store.addResource(0, 'food', 95);
    store.setProduction(0, 'food', 10);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(100);
  });

  it('processTick caps consumption at 0', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 3);
    store.setConsumption(0, 'food', 10);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(0);
  });

  it('setting rate to 0 disables it', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.setProduction(0, 'food', 10);
    store.setProduction(0, 'food', 0);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(50);
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/resource-store.test.ts`
Expected: All 15 tests PASS (8 existing + 7 new). These should pass immediately since the implementation was included in Task 1.

- [ ] **Step 3: Run lint**

Run: `npx eslint tests/resource-store.test.ts`
Expected: Clean.

- [ ] **Step 4: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add tests/resource-store.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "test: add rate and processTick tests for ResourceStore"
```

---

## Task 3: ResourceStore — transfers

**Files:**
- Modify: `tests/resource-store.test.ts`

- [ ] **Step 1: Write tests for transfers**

Append to the `describe('ResourceStore', ...)` block in `tests/resource-store.test.ts`:

```typescript
  it('processTick processes transfers', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 0);
    store.addTransfer(0, 1, 'food', 25);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(75);
    expect(store.getResource(1, 'food')!.current).toBe(25);
  });

  it('processTick partial transfer when source insufficient', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 10);
    store.addResource(1, 'food', 0);
    store.addTransfer(0, 1, 'food', 25);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(0);
    expect(store.getResource(1, 'food')!.current).toBe(10);
  });

  it('processTick caps transfer at target max', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 20 });
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 15);
    store.addTransfer(0, 1, 'food', 25);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(95);
    expect(store.getResource(1, 'food')!.current).toBe(20);
  });

  it('processTick removes transfers with dead entities', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 0);
    store.addTransfer(0, 1, 'food', 10);
    store.processTick((id) => id !== 1); // entity 1 is dead
    expect(store.getResource(0, 'food')!.current).toBe(100);
    expect(store.getTransfers(0)).toEqual([]);
  });

  it('removeTransfer stops the flow', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 0);
    const tid = store.addTransfer(0, 1, 'food', 10);
    store.removeTransfer(tid);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(100);
  });

  it('getTransfers returns transfers involving entity', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 0);
    store.addResource(2, 'food', 0);
    store.addTransfer(0, 1, 'food', 10);
    store.addTransfer(0, 2, 'food', 5);
    const transfers = store.getTransfers(0);
    expect(transfers).toHaveLength(2);
    expect(transfers[0].to).toBe(1);
    expect(transfers[1].to).toBe(2);
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/resource-store.test.ts`
Expected: All 21 tests PASS (15 existing + 6 new). These should pass immediately since transfer logic was included in Task 1.

- [ ] **Step 3: Run lint**

Run: `npx eslint tests/resource-store.test.ts`
Expected: Clean.

- [ ] **Step 4: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add tests/resource-store.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "test: add transfer tests for ResourceStore"
```

---

## Task 4: ResourceStore — entity removal and dirty tracking

**Files:**
- Modify: `tests/resource-store.test.ts`

- [ ] **Step 1: Write tests for removeEntity and dirty tracking**

Append to the `describe('ResourceStore', ...)` block in `tests/resource-store.test.ts`:

```typescript
  it('removeEntity cleans up pools, rates, and transfers', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.setProduction(0, 'food', 5);
    store.setConsumption(0, 'food', 3);
    store.addResource(1, 'food', 0);
    store.addTransfer(0, 1, 'food', 10);
    store.removeEntity(0);
    expect(store.getResource(0, 'food')).toBeUndefined();
    expect(store.getProduction(0, 'food')).toBe(0);
    expect(store.getConsumption(0, 'food')).toBe(0);
    expect(store.getTransfers(1)).toEqual([]);
  });

  it('getDirty tracks pool mutations', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.addResource(1, 'food', 30);
    const dirty = store.getDirty();
    expect(dirty['food'].set).toEqual([
      [0, { current: 50, max: Infinity }],
      [1, { current: 30, max: Infinity }],
    ]);
    expect(dirty['food'].removed).toEqual([]);
  });

  it('clearDirty resets dirty state', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.clearDirty();
    const dirty = store.getDirty();
    expect(dirty).toEqual({});
  });

  it('removeEntity marks pool as removed in dirty', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.clearDirty();
    store.removeEntity(0);
    const dirty = store.getDirty();
    expect(dirty['food'].set).toEqual([]);
    expect(dirty['food'].removed).toEqual([0]);
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/resource-store.test.ts`
Expected: All 25 tests PASS (21 existing + 4 new).

- [ ] **Step 3: Run lint**

Run: `npx eslint tests/resource-store.test.ts`
Expected: Clean.

- [ ] **Step 4: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add tests/resource-store.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "test: add entity removal and dirty tracking tests for ResourceStore"
```

---

## Task 5: Update TickDiff and wire ResourceStore into World

**Files:**
- Modify: `src/diff.ts`
- Modify: `src/world.ts`
- Create: `tests/resource.test.ts`

- [ ] **Step 1: Write failing integration tests**

Create `tests/resource.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('Resource System', () => {
  it('registerResource and addResource/getResource round-trip', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food', { defaultMax: 100 });
    const added = world.addResource(0, 'food', 50);
    expect(added).toBe(50);
    // Entity 0 may not be created yet, but addResource auto-creates the pool
    expect(world.getResource(0, 'food')).toEqual({ current: 50, max: 100 });
  });

  it('resource rates processed after user systems', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food', { defaultMax: 1000 });
    const e = world.createEntity();
    world.addResource(e, 'food', 50);
    world.setProduction(e, 'food', 10);
    world.setConsumption(e, 'food', 3);

    let foodDuringSystem: number | undefined;
    world.registerSystem((w) => {
      foodDuringSystem = w.getResource(e, 'food')!.current;
    });

    world.step();
    // During system, food should still be 50 (rates not yet processed)
    expect(foodDuringSystem).toBe(50);
    // After step, food should be 50 + 10 - 3 = 57
    expect(world.getResource(e, 'food')!.current).toBe(57);
  });

  it('addResource and removeResource return clamped values', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('gold', { defaultMax: 50 });
    const e = world.createEntity();
    world.addResource(e, 'gold', 40);
    expect(world.addResource(e, 'gold', 20)).toBe(10);
    expect(world.removeResource(e, 'gold', 100)).toBe(50);
  });

  it('destroyEntity cleans up resource state', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food');
    const e = world.createEntity();
    world.addResource(e, 'food', 50);
    world.setProduction(e, 'food', 5);
    world.destroyEntity(e);
    expect(world.getResource(e, 'food')).toBeUndefined();
  });

  it('resource changes appear in TickDiff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food');
    const e = world.createEntity();
    world.step(); // clear pre-tick dirty

    world.registerSystem((w) => {
      if (w.tick === 1) {
        w.addResource(e, 'food', 30);
      }
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.resources['food'].set).toEqual([[e, { current: 30, max: Infinity }]]);
  });

  it('transfer between two entities via world API', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food');
    const a = world.createEntity();
    const b = world.createEntity();
    world.addResource(a, 'food', 100);
    world.addResource(b, 'food', 0);
    world.addTransfer(a, b, 'food', 20);
    world.step();
    expect(world.getResource(a, 'food')!.current).toBe(80);
    expect(world.getResource(b, 'food')!.current).toBe(20);
  });

  it('command handler can modify resources and changes appear in diff', () => {
    type Cmds = { gather: { entity: number; amount: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerResource('food');
    const e = world.createEntity();
    world.addResource(e, 'food', 0);
    world.step(); // clear pre-tick dirty

    world.registerHandler('gather', (data, w) => {
      w.addResource(data.entity, 'food', data.amount);
    });
    world.submit('gather', { entity: e, amount: 25 });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.resources['food'].set).toEqual([[e, { current: 25, max: Infinity }]]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/resource.test.ts`
Expected: FAIL — `world.registerResource is not a function`.

- [ ] **Step 3: Update TickDiff in src/diff.ts**

Replace the contents of `src/diff.ts` with:

```typescript
import type { EntityId } from './types.js';

export interface ResourcePool {
  current: number;
  max: number;
}

export interface TickDiff {
  tick: number;
  entities: {
    created: EntityId[];
    destroyed: EntityId[];
  };
  components: Record<
    string,
    {
      set: Array<[EntityId, unknown]>;
      removed: EntityId[];
    }
  >;
  resources: Record<
    string,
    {
      set: Array<[EntityId, ResourcePool]>;
      removed: EntityId[];
    }
  >;
}
```

- [ ] **Step 4: Wire ResourceStore into World**

In `src/world.ts`, add import at top:

```typescript
import { ResourceStore } from './resource-store.js';
```

Add private field after `readonly grid: SpatialGrid;`:

```typescript
  private resourceStore = new ResourceStore();
```

Add proxy methods after `offDiff`:

```typescript
  registerResource(key: string, options?: { defaultMax?: number }): void {
    this.resourceStore.register(key, options);
  }

  addResource(entity: EntityId, key: string, amount: number): number {
    return this.resourceStore.addResource(entity, key, amount);
  }

  removeResource(entity: EntityId, key: string, amount: number): number {
    return this.resourceStore.removeResource(entity, key, amount);
  }

  getResource(entity: EntityId, key: string): { current: number; max: number } | undefined {
    return this.resourceStore.getResource(entity, key);
  }

  setResourceMax(entity: EntityId, key: string, max: number): void {
    this.resourceStore.setResourceMax(entity, key, max);
  }

  *getResourceEntities(key: string): IterableIterator<EntityId> {
    yield* this.resourceStore.getResourceEntities(key);
  }

  setProduction(entity: EntityId, key: string, rate: number): void {
    this.resourceStore.setProduction(entity, key, rate);
  }

  setConsumption(entity: EntityId, key: string, rate: number): void {
    this.resourceStore.setConsumption(entity, key, rate);
  }

  getProduction(entity: EntityId, key: string): number {
    return this.resourceStore.getProduction(entity, key);
  }

  getConsumption(entity: EntityId, key: string): number {
    return this.resourceStore.getConsumption(entity, key);
  }

  addTransfer(from: EntityId, to: EntityId, resource: string, rate: number): number {
    return this.resourceStore.addTransfer(from, to, resource, rate);
  }

  removeTransfer(id: number): void {
    this.resourceStore.removeTransfer(id);
  }

  getTransfers(entity: EntityId): Array<{ id: number; from: EntityId; to: EntityId; resource: string; rate: number }> {
    return this.resourceStore.getTransfers(entity);
  }
```

Update `destroyEntity` — add `this.resourceStore.removeEntity(id);` before `this.entityManager.destroy(id);`:

```typescript
  destroyEntity(id: EntityId): void {
    const prev = this.previousPositions.get(id);
    if (prev) {
      this.grid.remove(id, prev.x, prev.y);
      this.previousPositions.delete(id);
    }
    for (const store of this.componentStores.values()) {
      store.remove(id);
    }
    this.resourceStore.removeEntity(id);
    this.entityManager.destroy(id);
  }
```

Update `executeTick` — add `resourceStore.clearDirty()` after `clearComponentDirty()` and `resourceStore.processTick()` after user systems:

```typescript
  private executeTick(): void {
    this.eventBus.clear();
    this.entityManager.clearDirty();
    this.clearComponentDirty();
    this.resourceStore.clearDirty();
    this.processCommands();
    this.syncSpatialIndex();
    for (const system of this.systems) {
      system(this);
    }
    this.resourceStore.processTick((id) => this.entityManager.isAlive(id));
    this.buildDiff();
    for (const listener of this.diffListeners) {
      listener(this.currentDiff!);
    }
  }
```

Update `buildDiff` — add resource dirty collection and include `resources` in the diff:

```typescript
  private buildDiff(): void {
    const entities = this.entityManager.getDirty();
    const components: Record<
      string,
      { set: Array<[EntityId, unknown]>; removed: EntityId[] }
    > = {};
    for (const [key, store] of this.componentStores) {
      const dirty = store.getDirty();
      if (dirty.set.length > 0 || dirty.removed.length > 0) {
        components[key] = dirty;
      }
    }
    this.currentDiff = {
      tick: this.gameLoop.tick + 1,
      entities,
      components,
      resources: this.resourceStore.getDirty(),
    };
  }
```

- [ ] **Step 5: Run all tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (102 existing + 25 resource-store + 7 resource integration = 134).

- [ ] **Step 6: Run lint and typecheck**

Run: `npx eslint src/diff.ts src/world.ts src/resource-store.ts tests/resource.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 7: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/diff.ts src/world.ts tests/resource.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: wire ResourceStore into World with diff integration"
```

---

## Task 6: Update architecture, roadmap, and devlogs

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/devlog-detailed.md`
- Modify: `docs/devlog-summary.md`

- [ ] **Step 1: Update ARCHITECTURE.md**

Add ResourceStore row to the Component Map table (after the Diff row):

```
| ResourceStore | `src/resource-store.ts` | Resource pools, production/consumption rates, transfers, dirty tracking |
```

Update the Data Flow tick diagram to:

```
World.step()
  -> GameLoop.step()
    -> World.executeTick()
      -> World.eventBus.clear()
      -> World.entityManager.clearDirty()
      -> World.clearComponentDirty()
      -> World.resourceStore.clearDirty()
      -> World.processCommands()
      -> World.syncSpatialIndex()
      -> System A(world)
      -> System B(world)
      -> ...
      -> World.resourceStore.processTick()  [production, consumption, transfers]
      -> World.buildDiff()
      -> notify onDiff listeners
    -> tick++
```

Add to Boundaries section after the State Diffs bullet:

```
- **Resources** are managed via `world.registerResource()`, `world.addResource()`, `world.removeResource()`, etc. The ResourceStore is owned by World as a private subsystem. Resource rates and transfers are processed automatically after user systems each tick.
```

Add drift log entry:

```
| 2026-04-05 | Added resource system | ResourceStore with pools, rates, transfers, diff integration |
```

- [ ] **Step 2: Update ROADMAP.md**

Add row to the Built table:

```
| Resource system          | `resource-store.ts`  | 2026-04-05 | Pools, production/consumption rates, transfers, diff integration |
```

Remove the "Resource system" row from the "Planned — Game Systems" table.

- [ ] **Step 3: Append to devlog-detailed.md**

```markdown
## [2026-04-05 HH:MM, UTC] — Resource system

**Action:** Implemented ResourceStore with registered resource types, per-entity pools (current/max), production/consumption rates, automatic transfers (supply lines), entity destruction cleanup, and dirty tracking. Wired into World with proxy methods. Updated TickDiff to include resources field. Built-in processTick runs after user systems.
**Result:** Success — 32 new tests (25 resource-store unit + 7 resource integration), N total pass, lint and typecheck clean.
**Files changed:** src/resource-store.ts (new), src/diff.ts (modified), src/world.ts (modified), tests/resource-store.test.ts (new), tests/resource.test.ts (new), docs/ARCHITECTURE.md, docs/ROADMAP.md
**Reasoning:** Dedicated ResourceStore chosen over component-based approach for clean boundaries and first-class transfer support. Built-in system runs after user systems so manual adjustments take effect before rate processing.
**Notes:** Resource rates are processed in order: production, consumption, transfers. Transfers compete for available resources in registration order.
```

- [ ] **Step 4: Append to devlog-summary.md**

```markdown
- 2026-04-05: Resource system complete — ResourceStore with pools, rates, transfers; World integration; TickDiff resources field; 32 new tests, N total pass, lint and typecheck clean.
```

- [ ] **Step 5: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add docs/ARCHITECTURE.md docs/ROADMAP.md docs/devlog-detailed.md docs/devlog-summary.md
git -C C:/Users/38909/Documents/github/civ-engine commit -m "docs: update architecture, roadmap, and devlogs for resource system"
```
