# State Serialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON-based state serialization to save/load game state and produce snapshots for client sync.

**Architecture:** EntityManager and ComponentStore gain snapshot/restore class methods. World exposes `serialize()` and static `deserialize()`. A `serializer.ts` module exports the `WorldSnapshot` type. The actual serialize/deserialize logic lives on World (needs private field access). GameLoop gains `setTick()` for tick restoration.

**Tech Stack:** TypeScript 5.7+ (strict mode, ESM, Node16 resolution), Vitest 3

**Spec:** `docs/superpowers/specs/2026-04-05-state-serialization-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/entity-manager.ts` | Modify | Add getState(), static fromState() |
| `tests/entity-manager.test.ts` | Modify | Add getState/fromState round-trip tests |
| `src/component-store.ts` | Modify | Add entries(), static fromEntries() |
| `tests/component-store.test.ts` | Modify | Add entries/fromEntries round-trip tests |
| `src/game-loop.ts` | Modify | Add setTick() |
| `src/serializer.ts` | Create | WorldSnapshot type export |
| `src/world.ts` | Modify | Add serialize(), static deserialize() |
| `tests/serializer.test.ts` | Create | Round-trip, validation, and integration tests |
| `docs/ARCHITECTURE.md` | Modify | Add Serializer to component map, drift log |
| `docs/ROADMAP.md` | Modify | Move "State serialization" to Built |

---

## Task 1: EntityManager — getState() and static fromState()

**Files:**
- Modify: `src/entity-manager.ts`
- Modify: `tests/entity-manager.test.ts`

- [ ] **Step 1: Write failing tests for getState and fromState**

Append to the `describe('EntityManager', ...)` block in `tests/entity-manager.test.ts`:

```typescript
  it('getState returns internal state as copies', () => {
    const em = new EntityManager();
    em.create(); // id 0
    em.create(); // id 1
    em.destroy(0);
    const state = em.getState();
    expect(state.generations).toEqual([1, 0]);
    expect(state.alive).toEqual([false, true]);
    expect(state.freeList).toEqual([0]);
    // Verify they are copies, not references
    state.alive[1] = false;
    expect(em.isAlive(1)).toBe(true);
  });

  it('fromState restores entity manager and resumes correctly', () => {
    const em = new EntityManager();
    em.create(); // id 0
    em.create(); // id 1
    em.destroy(0);
    const state = em.getState();

    const restored = EntityManager.fromState(state);
    expect(restored.isAlive(0)).toBe(false);
    expect(restored.isAlive(1)).toBe(true);
    expect(restored.getGeneration(0)).toBe(1);
    // Creating a new entity should reuse the free-listed id 0
    const recycled = restored.create();
    expect(recycled).toBe(0);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/entity-manager.test.ts`
Expected: FAIL — `em.getState is not a function`.

- [ ] **Step 3: Implement getState and fromState**

Add to `src/entity-manager.ts`, inside the `EntityManager` class, after the `getGeneration` method:

```typescript
  getState(): {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  } {
    return {
      generations: [...this.generations],
      alive: [...this.alive],
      freeList: [...this.freeList],
    };
  }

  static fromState(state: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  }): EntityManager {
    const em = new EntityManager();
    em.generations = [...state.generations];
    em.alive = [...state.alive];
    em.freeList = [...state.freeList];
    return em;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/entity-manager.test.ts`
Expected: All 9 tests PASS (7 existing + 2 new).

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/entity-manager.ts tests/entity-manager.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 6: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/entity-manager.ts tests/entity-manager.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add getState and fromState to EntityManager"
```

---

## Task 2: ComponentStore — entries() and static fromEntries()

**Files:**
- Modify: `src/component-store.ts`
- Modify: `tests/component-store.test.ts`

- [ ] **Step 1: Write failing tests for entries and fromEntries**

Append to the `describe('ComponentStore', ...)` block in `tests/component-store.test.ts`:

```typescript
  it('entries yields populated slots as [id, data] pairs', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.set(5, { x: 2 });
    store.set(3, { x: 3 });
    const entries = [...store.entries()];
    expect(entries).toEqual([
      [0, { x: 1 }],
      [3, { x: 3 }],
      [5, { x: 2 }],
    ]);
  });

  it('fromEntries restores a component store from entry pairs', () => {
    const original = new ComponentStore<{ x: number; y: number }>();
    original.set(0, { x: 1, y: 2 });
    original.set(5, { x: 3, y: 4 });
    const entries = [...original.entries()];

    const restored = ComponentStore.fromEntries(entries);
    expect(restored.get(0)).toEqual({ x: 1, y: 2 });
    expect(restored.get(5)).toEqual({ x: 3, y: 4 });
    expect(restored.has(1)).toBe(false);
    expect(restored.size).toBe(2);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/component-store.test.ts`
Expected: FAIL — `store.entries is not a function`.

- [ ] **Step 3: Implement entries and fromEntries**

Add to `src/component-store.ts`, inside the `ComponentStore` class, after the `entities()` method:

```typescript
  *entries(): IterableIterator<[EntityId, T]> {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== undefined) {
        yield [i, this.data[i] as T];
      }
    }
  }

  static fromEntries<T>(entries: Array<[EntityId, T]>): ComponentStore<T> {
    const store = new ComponentStore<T>();
    for (const [id, data] of entries) {
      store.set(id, data);
    }
    return store;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/component-store.test.ts`
Expected: All 12 tests PASS (10 existing + 2 new).

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/component-store.ts tests/component-store.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 6: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/component-store.ts tests/component-store.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add entries and fromEntries to ComponentStore"
```

---

## Task 3: GameLoop — setTick()

**Files:**
- Modify: `src/game-loop.ts`

- [ ] **Step 1: Add setTick method to GameLoop**

Add to `src/game-loop.ts`, inside the `GameLoop` class, after the `get tps()` getter:

```typescript
  setTick(value: number): void {
    this._tick = value;
  }
```

- [ ] **Step 2: Run all tests to verify nothing breaks**

Run: `npx vitest run`
Expected: All 73 tests PASS.

- [ ] **Step 3: Run lint and typecheck**

Run: `npx eslint src/game-loop.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 4: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/game-loop.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add setTick to GameLoop for state restoration"
```

---

## Task 4: WorldSnapshot type and World.serialize()

**Files:**
- Create: `src/serializer.ts`
- Modify: `src/world.ts`
- Create: `tests/serializer.test.ts`

- [ ] **Step 1: Write failing test for serialize**

Create `tests/serializer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('Serialization', () => {
  it('serialize produces a valid snapshot with version, config, tick, entities, and components', () => {
    const world = new World({ gridWidth: 16, gridHeight: 16, tps: 30 });
    world.registerComponent<{ x: number; y: number }>('position');
    world.registerComponent<{ hp: number }>('health');

    const e0 = world.createEntity();
    world.addComponent(e0, 'position', { x: 1, y: 2 });
    world.addComponent(e0, 'health', { hp: 100 });

    const e1 = world.createEntity();
    world.addComponent(e1, 'position', { x: 3, y: 4 });

    world.step();
    world.step();

    const snapshot = world.serialize();

    expect(snapshot.version).toBe(1);
    expect(snapshot.config).toEqual({ gridWidth: 16, gridHeight: 16, tps: 30 });
    expect(snapshot.tick).toBe(2);
    expect(snapshot.entities.alive).toEqual([true, true]);
    expect(snapshot.entities.generations).toEqual([0, 0]);
    expect(snapshot.entities.freeList).toEqual([]);
    expect(snapshot.components['position']).toEqual([
      [0, { x: 1, y: 2 }],
      [1, { x: 3, y: 4 }],
    ]);
    expect(snapshot.components['health']).toEqual([
      [0, { hp: 100 }],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/serializer.test.ts`
Expected: FAIL — `world.serialize is not a function`.

- [ ] **Step 3: Create serializer.ts with WorldSnapshot type**

Create `src/serializer.ts`:

```typescript
import type { EntityId, WorldConfig } from './types.js';

export interface WorldSnapshot {
  version: 1;
  config: WorldConfig;
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
}
```

- [ ] **Step 4: Add serialize() to World**

Add import at top of `src/world.ts`:

```typescript
import type { WorldSnapshot } from './serializer.js';
```

Add `serialize` method to the `World` class, after the `getEvents` method:

```typescript
  serialize(): WorldSnapshot {
    const components: Record<string, Array<[EntityId, unknown]>> = {};
    for (const [key, store] of this.componentStores) {
      components[key] = [...store.entries()];
    }
    return {
      version: 1,
      config: {
        gridWidth: this.grid.width,
        gridHeight: this.grid.height,
        tps: this.gameLoop.tps,
      },
      tick: this.gameLoop.tick,
      entities: this.entityManager.getState(),
      components,
    };
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (77 existing + 1 new = 78).

- [ ] **Step 6: Run lint and typecheck**

Run: `npx eslint src/serializer.ts src/world.ts tests/serializer.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 7: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/serializer.ts src/world.ts tests/serializer.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add WorldSnapshot type and World.serialize()"
```

---

## Task 5: World.deserialize() with validation

**Files:**
- Modify: `src/world.ts`
- Modify: `tests/serializer.test.ts`

- [ ] **Step 1: Write failing tests for deserialize and validation**

Append to the `describe('Serialization', ...)` block in `tests/serializer.test.ts`:

```typescript
  it('round-trip: serialize then deserialize preserves all state', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    world.registerComponent<{ hp: number }>('health');

    const e0 = world.createEntity();
    world.addComponent(e0, 'position', { x: 5, y: 5 });
    world.addComponent(e0, 'health', { hp: 100 });

    const e1 = world.createEntity();
    world.addComponent(e1, 'health', { hp: 50 });

    world.step();

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    expect(restored.tick).toBe(1);
    expect(restored.isAlive(e0)).toBe(true);
    expect(restored.isAlive(e1)).toBe(true);
    expect(restored.getComponent(e0, 'position')).toEqual({ x: 5, y: 5 });
    expect(restored.getComponent(e0, 'health')).toEqual({ hp: 100 });
    expect(restored.getComponent(e1, 'health')).toEqual({ hp: 50 });
    expect(restored.getComponent(e1, 'position')).toBeUndefined();
  });

  it('deserialize throws on unsupported version', () => {
    const bad = {
      version: 99,
      config: { gridWidth: 10, gridHeight: 10, tps: 60 },
      tick: 0,
      entities: { generations: [], alive: [], freeList: [] },
      components: {},
    };
    expect(() => World.deserialize(bad as never)).toThrow(
      'Unsupported snapshot version: 99',
    );
  });

  it('deserialize throws on entity state array length mismatch', () => {
    const bad = {
      version: 1 as const,
      config: { gridWidth: 10, gridHeight: 10, tps: 60 },
      tick: 0,
      entities: { generations: [0, 0], alive: [true], freeList: [] },
      components: {},
    };
    expect(() => World.deserialize(bad)).toThrow(
      'Invalid entity state: array length mismatch',
    );
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/serializer.test.ts`
Expected: FAIL — `World.deserialize is not a function`.

- [ ] **Step 3: Implement static deserialize on World**

Add the static `deserialize` method to the `World` class, after the `serialize` method:

```typescript
  static deserialize<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  >(
    snapshot: WorldSnapshot,
    systems?: System<TEventMap, TCommandMap>[],
  ): World<TEventMap, TCommandMap> {
    if (snapshot.version !== 1) {
      throw new Error(`Unsupported snapshot version: ${snapshot.version}`);
    }
    if (
      snapshot.entities.generations.length !== snapshot.entities.alive.length
    ) {
      throw new Error('Invalid entity state: array length mismatch');
    }

    const world = new World<TEventMap, TCommandMap>(snapshot.config);
    world.entityManager = EntityManager.fromState(snapshot.entities);

    world.componentStores.clear();
    for (const [key, entries] of Object.entries(snapshot.components)) {
      world.componentStores.set(
        key,
        ComponentStore.fromEntries(entries as Array<[number, unknown]>),
      );
    }

    world.gameLoop.setTick(snapshot.tick);

    if (systems) {
      for (const system of systems) {
        world.systems.push(system);
      }
    }

    return world;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (78 + 3 = 81).

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/world.ts tests/serializer.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 6: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/world.ts tests/serializer.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add World.deserialize with validation"
```

---

## Task 6: Advanced round-trip tests

**Files:**
- Modify: `tests/serializer.test.ts`

- [ ] **Step 1: Write advanced round-trip tests**

Append to the `describe('Serialization', ...)` block in `tests/serializer.test.ts`:

```typescript
  it('preserves dead entities and free-list across round-trip', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');

    const e0 = world.createEntity();
    world.createEntity(); // e1
    world.addComponent(e0, 'health', { hp: 100 });
    world.destroyEntity(e0);

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    expect(restored.isAlive(0)).toBe(false);
    expect(restored.isAlive(1)).toBe(true);
    // New entity should reuse recycled id 0
    const recycled = restored.createEntity();
    expect(recycled).toBe(0);
  });

  it('round-trips components with nested object data', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ items: string[]; stats: { str: number; dex: number } }>('inventory');

    const e = world.createEntity();
    world.addComponent(e, 'inventory', {
      items: ['sword', 'shield'],
      stats: { str: 10, dex: 5 },
    });

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    expect(restored.getComponent(e, 'inventory')).toEqual({
      items: ['sword', 'shield'],
      stats: { str: 10, dex: 5 },
    });
  });

  it('deserialized world can continue stepping with systems', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');

    const e = world.createEntity();
    world.addComponent(e, 'position', { x: 0, y: 0 });

    const moveRight = (w: World) => {
      for (const id of w.query('position')) {
        const pos = w.getComponent<{ x: number; y: number }>(id, 'position')!;
        pos.x += 1;
      }
    };
    world.registerSystem(moveRight);
    world.step(); // tick 1, x = 1

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot, [moveRight]);

    restored.step(); // tick 2, x = 2
    expect(restored.tick).toBe(2);
    expect(restored.getComponent(e, 'position')).toEqual({ x: 2, y: 0 });
  });

  it('deserialized world syncs spatial grid on first step', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');

    const e = world.createEntity();
    world.addComponent(e, 'position', { x: 3, y: 4 });
    world.step(); // sync grid

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    // Grid is empty before first step
    expect(restored.grid.getAt(3, 4)?.has(e) ?? false).toBe(false);

    restored.step();
    // Grid is populated after step
    expect(restored.grid.getAt(3, 4)!.has(e)).toBe(true);
  });

  it('deserialize with no systems produces a world with empty pipeline', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 100 });

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    // Can step without error (no systems to run)
    restored.step();
    expect(restored.tick).toBe(1);
    expect(restored.getComponent(e, 'health')).toEqual({ hp: 100 });
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (81 + 5 = 86).

- [ ] **Step 3: Run lint**

Run: `npx eslint tests/serializer.test.ts`
Expected: Clean.

- [ ] **Step 4: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add tests/serializer.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "test: add advanced round-trip serialization tests"
```

---

## Task 7: Update architecture, roadmap, and devlogs

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/devlog-detailed.md`
- Modify: `docs/devlog-summary.md`

- [ ] **Step 1: Update ARCHITECTURE.md**

Add Serializer row to the Component Map table (after the CommandQueue row):

```
| Serializer | `src/serializer.ts` | WorldSnapshot type for state serialization |
```

Add to Boundaries section after the CommandQueue bullet:

```
- **Serialization** is accessed via `world.serialize()` and `World.deserialize()`. The `WorldSnapshot` type is exported from `src/serializer.ts`. Snapshots are plain JSON-serializable objects.
```

Add drift log entry:

```
| 2026-04-05 | Added state serialization | JSON snapshot save/load via World.serialize() and World.deserialize() |
```

- [ ] **Step 2: Update ROADMAP.md**

Add row to the Built table:

```
| State serialization | `serializer.ts` | 2026-04-05 | JSON snapshot, World.serialize/deserialize, round-trip tested |
```

Remove the "State serialization" row from the "Planned — Engine Core" table.

- [ ] **Step 3: Append to devlog-detailed.md**

```markdown
## [2026-04-05 HH:MM, UTC] — State serialization

**Action:** Implemented JSON state serialization with World.serialize() and World.deserialize(). Added getState/fromState to EntityManager, entries/fromEntries to ComponentStore, setTick to GameLoop, and WorldSnapshot type in serializer.ts.
**Result:** Success — 13 new tests, 86 total pass, lint and typecheck clean.
**Files changed:** src/serializer.ts (new), src/world.ts, src/entity-manager.ts, src/component-store.ts, src/game-loop.ts, tests/serializer.test.ts (new), tests/entity-manager.test.ts, tests/component-store.test.ts, docs/ARCHITECTURE.md, docs/ROADMAP.md
**Reasoning:** State serialization is needed for save/load and client sync. JSON format chosen for debuggability, zero-dependency simplicity, and wire-readiness.
**Notes:** Spatial grid is not serialized — it rebuilds from position components on first step. Systems, event listeners, validators, and handlers are not serialized (runtime-only). Snapshot includes version field for future format evolution.
```

- [ ] **Step 4: Append to devlog-summary.md**

```markdown
- 2026-04-05: State serialization complete — WorldSnapshot type, World.serialize/deserialize, EntityManager getState/fromState, ComponentStore entries/fromEntries, GameLoop setTick; JSON round-trip tested; 13 new tests, 86 total pass, lint and typecheck clean.
```

- [ ] **Step 5: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add docs/ARCHITECTURE.md docs/ROADMAP.md docs/devlog-detailed.md docs/devlog-summary.md
git -C C:/Users/38909/Documents/github/civ-engine commit -m "docs: update architecture, roadmap, and devlogs for state serialization"
```
