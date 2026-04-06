# State Diff Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit minimal per-tick change sets so clients can efficiently consume state changes without polling the full world.

**Architecture:** ComponentStore and EntityManager gain dirty-flag tracking (sets/arrays populated during mutations, cleared at tick start). World collects dirty state into a `TickDiff` object after systems run. Clients access diffs via pull (`getDiff()`) or push (`onDiff(fn)`) API.

**Tech Stack:** TypeScript 5.7+ (strict mode, ESM, Node16 resolution), Vitest 3

**Spec:** `docs/superpowers/specs/2026-04-05-state-diff-output-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/diff.ts` | Create | TickDiff type export |
| `src/component-store.ts` | Modify | Add dirtySet, removedSet, getDirty(), clearDirty(); modify set(), remove() |
| `src/entity-manager.ts` | Modify | Add createdThisTick, destroyedThisTick, getDirty(), clearDirty(); modify create(), destroy() |
| `src/world.ts` | Modify | Add getDiff(), onDiff(), offDiff(), buildDiff(), clearComponentDirty(); update executeTick() |
| `tests/component-store.test.ts` | Modify | Add dirty tracking tests |
| `tests/entity-manager.test.ts` | Modify | Add dirty tracking tests |
| `tests/diff.test.ts` | Create | Integration tests for diff output |
| `docs/ARCHITECTURE.md` | Modify | Update component map, tick flow, boundaries, drift log |
| `docs/ROADMAP.md` | Modify | Move "State diff output" to Built |

---

## Task 1: ComponentStore — dirty tracking

**Files:**
- Modify: `src/component-store.ts`
- Modify: `tests/component-store.test.ts`

- [ ] **Step 1: Write failing tests for dirty tracking**

Append to the `describe('ComponentStore', ...)` block in `tests/component-store.test.ts`:

```typescript
  it('set marks entity as dirty', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    const dirty = store.getDirty();
    expect(dirty.set).toEqual([[0, { x: 1 }]]);
    expect(dirty.removed).toEqual([]);
  });

  it('remove marks entity as removed and clears from dirty', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.remove(0);
    const dirty = store.getDirty();
    expect(dirty.set).toEqual([]);
    expect(dirty.removed).toEqual([0]);
  });

  it('clearDirty resets both sets', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.set(1, { x: 2 });
    store.remove(1);
    store.clearDirty();
    const dirty = store.getDirty();
    expect(dirty.set).toEqual([]);
    expect(dirty.removed).toEqual([]);
  });

  it('getDirty returns set entries with current data', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.set(0, { x: 99 });
    store.set(3, { x: 3 });
    const dirty = store.getDirty();
    expect(dirty.set).toEqual([
      [0, { x: 99 }],
      [3, { x: 3 }],
    ]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/component-store.test.ts`
Expected: FAIL — `store.getDirty is not a function`.

- [ ] **Step 3: Implement dirty tracking on ComponentStore**

In `src/component-store.ts`, add two private fields after the existing `private _size = 0;` line:

```typescript
  private dirtySet = new Set<EntityId>();
  private removedSet = new Set<EntityId>();
```

Modify the `set` method — add `this.dirtySet.add(entityId);` as the last line:

```typescript
  set(entityId: EntityId, component: T): void {
    if (this.data[entityId] === undefined) {
      this._size++;
    }
    this.data[entityId] = component;
    this._generation++;
    this.dirtySet.add(entityId);
  }
```

Modify the `remove` method — add dirty tracking after the existing logic:

```typescript
  remove(entityId: EntityId): void {
    if (this.data[entityId] === undefined) return;
    this.data[entityId] = undefined;
    this._size--;
    this._generation++;
    this.dirtySet.delete(entityId);
    this.removedSet.add(entityId);
  }
```

Add `getDirty` and `clearDirty` methods after the `entries()` method:

```typescript
  getDirty(): { set: Array<[EntityId, T]>; removed: EntityId[] } {
    const set: Array<[EntityId, T]> = [];
    for (const id of this.dirtySet) {
      set.push([id, this.data[id] as T]);
    }
    return { set, removed: [...this.removedSet] };
  }

  clearDirty(): void {
    this.dirtySet.clear();
    this.removedSet.clear();
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/component-store.test.ts`
Expected: All 16 tests PASS (12 existing + 4 new).

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/component-store.ts tests/component-store.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 6: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/component-store.ts tests/component-store.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add dirty tracking to ComponentStore"
```

---

## Task 2: EntityManager — dirty tracking

**Files:**
- Modify: `src/entity-manager.ts`
- Modify: `tests/entity-manager.test.ts`

- [ ] **Step 1: Write failing tests for dirty tracking**

Append to the `describe('EntityManager', ...)` block in `tests/entity-manager.test.ts`:

```typescript
  it('create tracks created entities', () => {
    const em = new EntityManager();
    const id0 = em.create();
    const id1 = em.create();
    const dirty = em.getDirty();
    expect(dirty.created).toEqual([id0, id1]);
    expect(dirty.destroyed).toEqual([]);
  });

  it('destroy tracks destroyed entities', () => {
    const em = new EntityManager();
    const id = em.create();
    em.destroy(id);
    const dirty = em.getDirty();
    expect(dirty.created).toEqual([id]);
    expect(dirty.destroyed).toEqual([id]);
  });

  it('clearDirty resets both arrays', () => {
    const em = new EntityManager();
    em.create();
    em.clearDirty();
    const dirty = em.getDirty();
    expect(dirty.created).toEqual([]);
    expect(dirty.destroyed).toEqual([]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/entity-manager.test.ts`
Expected: FAIL — `em.getDirty is not a function`.

- [ ] **Step 3: Implement dirty tracking on EntityManager**

In `src/entity-manager.ts`, add two private fields after the existing `private freeList: number[] = [];` line:

```typescript
  private createdThisTick: EntityId[] = [];
  private destroyedThisTick: EntityId[] = [];
```

Modify the `create` method — add `this.createdThisTick.push(id);` before each `return id;` statement:

```typescript
  create(): EntityId {
    if (this.freeList.length > 0) {
      const id = this.freeList.pop()!;
      this.alive[id] = true;
      this.createdThisTick.push(id);
      return id;
    }
    const id = this.generations.length;
    this.generations.push(0);
    this.alive.push(true);
    this.createdThisTick.push(id);
    return id;
  }
```

Modify the `destroy` method — add `this.destroyedThisTick.push(id);` after the guard:

```typescript
  destroy(id: EntityId): void {
    if (!this.alive[id]) return;
    this.alive[id] = false;
    this.generations[id]++;
    this.freeList.push(id);
    this.destroyedThisTick.push(id);
  }
```

Add `getDirty` and `clearDirty` methods after the `getState` method:

```typescript
  getDirty(): { created: EntityId[]; destroyed: EntityId[] } {
    return {
      created: [...this.createdThisTick],
      destroyed: [...this.destroyedThisTick],
    };
  }

  clearDirty(): void {
    this.createdThisTick.length = 0;
    this.destroyedThisTick.length = 0;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/entity-manager.test.ts`
Expected: All 12 tests PASS (9 existing + 3 new).

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/entity-manager.ts tests/entity-manager.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 6: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/entity-manager.ts tests/entity-manager.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add dirty tracking to EntityManager"
```

---

## Task 3: TickDiff type and World diff wiring

**Files:**
- Create: `src/diff.ts`
- Modify: `src/world.ts`
- Create: `tests/diff.test.ts`

- [ ] **Step 1: Write failing tests for getDiff**

Create `tests/diff.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('State Diff', () => {
  it('getDiff returns null before any tick', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.getDiff()).toBeNull();
  });

  it('getDiff returns component set changes after step', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 100 });
    world.step();

    // After step, createEntity and addComponent happened before the tick,
    // but the system didn't mutate, so only the pre-tick mutations are in the diff.
    // Wait — dirty is cleared at tick start, so pre-tick mutations are NOT in the diff.
    // Let's set up mutations inside a system instead.
    const world2 = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world2.registerComponent<{ hp: number }>('health');
    const id = world2.createEntity();
    world2.step(); // tick 0: entity created, but dirty cleared at tick start so this tick's diff has creations from commands/systems only

    world2.registerSystem((w) => {
      w.addComponent(id, 'health', { hp: 50 });
    });
    world2.step(); // tick 1: system adds health

    const diff = world2.getDiff()!;
    expect(diff.tick).toBe(2);
    expect(diff.components['health'].set).toEqual([[id, { hp: 50 }]]);
  });

  it('getDiff returns entity created and destroyed', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');

    let createdId: number | undefined;
    world.registerSystem((w) => {
      if (w.tick === 0) {
        createdId = w.createEntity();
      }
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.entities.created).toEqual([createdId]);
  });

  it('empty tick produces empty diff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.step();
    const diff = world.getDiff()!;
    expect(diff.entities.created).toEqual([]);
    expect(diff.entities.destroyed).toEqual([]);
    expect(diff.components).toEqual({});
  });

  it('entity created and destroyed in same tick appears in both', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerSystem((w) => {
      if (w.tick === 0) {
        const id = w.createEntity();
        w.destroyEntity(id);
      }
    });
    world.step();
    const diff = world.getDiff()!;
    expect(diff.entities.created).toContain(0);
    expect(diff.entities.destroyed).toContain(0);
  });

  it('component set then removed in same tick appears only in removed', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.step(); // clear pre-tick dirty

    world.registerSystem((w) => {
      if (w.tick === 1) {
        w.addComponent(e, 'health', { hp: 100 });
        w.removeComponent(e, 'health');
      }
    });
    world.step(); // tick 1

    const diff = world.getDiff()!;
    expect(diff.components['health'].set).toEqual([]);
    expect(diff.components['health'].removed).toEqual([e]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/diff.test.ts`
Expected: FAIL — `world.getDiff is not a function`.

- [ ] **Step 3: Create diff.ts with TickDiff type**

Create `src/diff.ts`:

```typescript
import type { EntityId } from './types.js';

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
}
```

- [ ] **Step 4: Add getDiff, buildDiff, clearComponentDirty, and update executeTick on World**

Add import at top of `src/world.ts`:

```typescript
import type { TickDiff } from './diff.js';
```

Add private fields to the `World` class, after the existing `readonly grid: SpatialGrid;` line:

```typescript
  private currentDiff: TickDiff | null = null;
  private diffListeners = new Set<(diff: TickDiff) => void>();
```

Add `getDiff` method after the `serialize`/`deserialize` methods:

```typescript
  getDiff(): TickDiff | null {
    return this.currentDiff;
  }

  onDiff(fn: (diff: TickDiff) => void): void {
    this.diffListeners.add(fn);
  }

  offDiff(fn: (diff: TickDiff) => void): void {
    this.diffListeners.delete(fn);
  }
```

Add private `buildDiff` and `clearComponentDirty` methods before the existing `executeTick` method:

```typescript
  private clearComponentDirty(): void {
    for (const store of this.componentStores.values()) {
      store.clearDirty();
    }
  }

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
      tick: this.gameLoop.tick,
      entities,
      components,
    };
  }
```

Update `executeTick` to clear dirty state at tick start and build diff at tick end:

```typescript
  private executeTick(): void {
    this.eventBus.clear();
    this.entityManager.clearDirty();
    this.clearComponentDirty();
    this.processCommands();
    this.syncSpatialIndex();
    for (const system of this.systems) {
      system(this);
    }
    this.buildDiff();
    for (const listener of this.diffListeners) {
      listener(this.currentDiff!);
    }
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (86 existing + 6 new = 92).

- [ ] **Step 6: Run lint and typecheck**

Run: `npx eslint src/diff.ts src/world.ts tests/diff.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 7: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add src/diff.ts src/world.ts tests/diff.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "feat: add TickDiff type and World diff output with getDiff, onDiff, offDiff"
```

---

## Task 4: Push API and command handler diff tests

**Files:**
- Modify: `tests/diff.test.ts`

- [ ] **Step 1: Write tests for onDiff/offDiff and command handler mutations**

Append to the `describe('State Diff', ...)` block in `tests/diff.test.ts`:

```typescript
  it('onDiff callback fires each tick with correct diff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');

    const diffs: Array<{ tick: number }> = [];
    world.onDiff((diff) => diffs.push({ tick: diff.tick }));

    world.step();
    world.step();
    world.step();

    expect(diffs).toEqual([{ tick: 1 }, { tick: 2 }, { tick: 3 }]);
  });

  it('offDiff removes the callback', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const diffs: number[] = [];
    const fn = (diff: { tick: number }) => diffs.push(diff.tick);
    world.onDiff(fn);

    world.step();
    world.offDiff(fn);
    world.step();

    expect(diffs).toEqual([1]);
  });

  it('command handler mutations appear in diff', () => {
    type Cmds = { heal: { entityId: number; amount: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 50 });
    world.step(); // clear pre-tick dirty

    world.registerHandler('heal', (data, w) => {
      const hp = w.getComponent<{ hp: number }>(data.entityId, 'health')!;
      hp.hp += data.amount;
      w.addComponent(data.entityId, 'health', hp);
    });
    world.submit('heal', { entityId: e, amount: 30 });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.components['health'].set).toEqual([[e, { hp: 80 }]]);
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (92 + 3 = 95).

- [ ] **Step 3: Run lint**

Run: `npx eslint tests/diff.test.ts`
Expected: Clean.

- [ ] **Step 4: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add tests/diff.test.ts
git -C C:/Users/38909/Documents/github/civ-engine commit -m "test: add onDiff, offDiff, and command handler diff tests"
```

---

## Task 5: Update architecture, roadmap, and devlogs

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/devlog-detailed.md`
- Modify: `docs/devlog-summary.md`

- [ ] **Step 1: Update ARCHITECTURE.md**

Add Diff row to the Component Map table (after the Serializer row):

```
| Diff | `src/diff.ts` | TickDiff type for per-tick change sets |
```

Update the Data Flow tick diagram to:

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
      -> World.buildDiff()             [collect dirty state into TickDiff]
      -> notify onDiff listeners
    -> tick++
```

Add to Boundaries section after the Serialization bullet:

```
- **State Diffs** are accessed via `world.getDiff()` (pull) or `world.onDiff()` (push). The `TickDiff` type is exported from `src/diff.ts`. Diffs capture entity creation/destruction and component mutations per tick.
```

Add drift log entry:

```
| 2026-04-05 | Added state diff output | Per-tick dirty tracking and TickDiff via getDiff/onDiff |
```

- [ ] **Step 2: Update ROADMAP.md**

Add row to the Built table:

```
| State diff output | `diff.ts` | 2026-04-05 | Per-tick dirty tracking, getDiff/onDiff/offDiff, TickDiff type |
```

Remove the "State diff output" row from the "Planned — Output / Client Integration" table.

- [ ] **Step 3: Append to devlog-detailed.md**

```markdown
## [2026-04-05 23:00, UTC] — State diff output

**Action:** Implemented per-tick dirty tracking on ComponentStore and EntityManager, TickDiff type, and World.getDiff/onDiff/offDiff. Updated executeTick to clear dirty state at tick start and build diff at tick end.
**Result:** Success — 9 new tests, 95 total pass, lint and typecheck clean.
**Files changed:** src/diff.ts (new), src/component-store.ts, src/entity-manager.ts, src/world.ts, tests/diff.test.ts (new), tests/component-store.test.ts, tests/entity-manager.test.ts, docs/ARCHITECTURE.md, docs/ROADMAP.md
**Reasoning:** State diff output enables efficient client sync without full-state polling. Dirty-flag approach chosen for O(1) mutation tracking with zero scanning overhead.
**Notes:** Diffs only include stores that had changes (empty stores omitted from components record). getDiff returns null before first tick. onDiff listeners fire synchronously at tick end.
```

- [ ] **Step 4: Append to devlog-summary.md**

```markdown
- 2026-04-05: State diff output complete — TickDiff type, dirty tracking on ComponentStore/EntityManager, World.getDiff/onDiff/offDiff; 9 new tests, 95 total pass, lint and typecheck clean.
```

- [ ] **Step 5: Commit**

```
git -C C:/Users/38909/Documents/github/civ-engine add docs/ARCHITECTURE.md docs/ROADMAP.md docs/devlog-detailed.md docs/devlog-summary.md
git -C C:/Users/38909/Documents/github/civ-engine commit -m "docs: update architecture, roadmap, and devlogs for state diff output"
```
