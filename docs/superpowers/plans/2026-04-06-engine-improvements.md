# Engine Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add batch component access, entity destroy hooks, and a generic behavior tree framework to civ-engine.

**Architecture:** Three independent features added to the engine. Batch access and destroy hooks extend `World` directly. The BT framework is a standalone utility module (like pathfinding/noise) with no World integration — games wire it via components and systems.

**Tech Stack:** TypeScript 5.7+, Vitest 3, ESLint 9

**Spec:** `docs/superpowers/specs/2026-04-06-engine-improvements-design.md`

**Engine commands:**
```bash
npx vitest run              # Run all tests
tsc --noEmit                # Type check
npm run lint                # ESLint
```

**Engine location:** `C:\Users\38909\Documents\github\civ-engine`

**CLAUDE.md rules (engine):**
- CRITICAL: Never use compound commands (`&&`, `|`, `;`). Execute commands as separate sequential tool calls.
- Never use `cd` with `git`. Always use `git -C <path> <command>`.
- After every code change: run `tsc --noEmit`, `npm run lint`, and `npx vitest run` — all must pass.
- No magic numbers.
- Files under 500 lines.
- Remove dead code, unused imports, duplicated logic.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/world.ts` | Modify | Add `getComponents`, `onDestroy`, `offDestroy`, fire destroy callbacks |
| `src/behavior-tree.ts` | Create | BTNode, Selector, Sequence, Action, Condition, NodeStatus, BTState, createBehaviorTree |
| `tests/world.test.ts` | Modify | Tests for batch access and destroy hooks |
| `tests/behavior-tree.test.ts` | Create | Full BT test suite |
| `docs/ARCHITECTURE.md` | Modify | Add BehaviorTree row to Component Map, update Boundaries, add Drift Log entries |

---

### Task 1: Batch Component Access — Tests

**Files:**
- Modify: `tests/world.test.ts`

- [ ] **Step 1: Write failing tests for getComponents**

Append this describe block at the end of the existing `describe('World', ...)` block in `tests/world.test.ts`:

```typescript
describe('getComponents', () => {
  it('returns all requested components as a tuple', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'health', { hp: 100 });
    world.addComponent(id, 'position', { x: 5, y: 5 });

    const [hp, pos] = world.getComponents<[{ hp: number }, { x: number; y: number }]>(
      id, ['health', 'position']
    );
    expect(hp).toEqual({ hp: 100 });
    expect(pos).toEqual({ x: 5, y: 5 });
  });

  it('returns undefined for missing components', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'health', { hp: 50 });

    const [hp, pos] = world.getComponents<[{ hp: number }, { x: number; y: number }]>(
      id, ['health', 'position']
    );
    expect(hp).toEqual({ hp: 50 });
    expect(pos).toBeUndefined();
  });

  it('returns all undefined for nonexistent entity', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    world.registerComponent<{ x: number; y: number }>('position');

    const [hp, pos] = world.getComponents<[{ hp: number }, { x: number; y: number }]>(
      999, ['health', 'position']
    );
    expect(hp).toBeUndefined();
    expect(pos).toBeUndefined();
  });

  it('works with a single key', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.addComponent(id, 'health', { hp: 75 });

    const [hp] = world.getComponents<[{ hp: number }]>(id, ['health']);
    expect(hp).toEqual({ hp: 75 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/world.test.ts` (from engine directory)
Expected: FAIL — `world.getComponents is not a function`

---

### Task 2: Batch Component Access — Implementation

**Files:**
- Modify: `src/world.ts`

- [ ] **Step 1: Add getComponents method to World**

Add this type alias above the `World` class definition, after the existing `System` type alias:

```typescript
type ComponentTuple<T extends unknown[]> = { [K in keyof T]: T[K] | undefined };
```

Add this method to the `World` class, right after the existing `getComponent` method (after line 92):

```typescript
getComponents<T extends unknown[]>(
  entity: EntityId,
  keys: string[],
): ComponentTuple<T> {
  return keys.map((key) => {
    const store = this.componentStores.get(key);
    return store?.get(entity);
  }) as ComponentTuple<T>;
}
```

- [ ] **Step 2: Run type check**

Run: `tsc --noEmit` (from engine directory)
Expected: PASS

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/world.test.ts`
Expected: PASS — all getComponents tests green

- [ ] **Step 4: Run lint**

Run: `npm run lint` (from engine directory)
Expected: PASS

- [ ] **Step 5: Commit**

```
git -C /c/Users/38909/Documents/github/civ-engine add src/world.ts tests/world.test.ts
git -C /c/Users/38909/Documents/github/civ-engine commit -m "feat: add getComponents for batch component access"
```

---

### Task 3: Entity Destroy Hooks — Tests

**Files:**
- Modify: `tests/world.test.ts`

- [ ] **Step 1: Write failing tests for onDestroy/offDestroy**

Append this describe block inside the existing `describe('World', ...)` block in `tests/world.test.ts`:

```typescript
describe('onDestroy / offDestroy', () => {
  it('fires callback when entity is destroyed', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const destroyed: number[] = [];
    world.onDestroy((id) => destroyed.push(id));

    const e = world.createEntity();
    world.destroyEntity(e);
    expect(destroyed).toEqual([e]);
  });

  it('callback can read dying entity components', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 42 });

    let readHp: number | undefined;
    world.onDestroy((id, w) => {
      readHp = w.getComponent<{ hp: number }>(id, 'health')?.hp;
    });
    world.destroyEntity(e);
    expect(readHp).toBe(42);
  });

  it('components are removed after callbacks fire', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 100 });

    world.onDestroy(() => {});
    world.destroyEntity(e);
    expect(world.getComponent(e, 'health')).toBeUndefined();
  });

  it('does not fire for already dead entities', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const destroyed: number[] = [];
    world.onDestroy((id) => destroyed.push(id));

    const e = world.createEntity();
    world.destroyEntity(e);
    world.destroyEntity(e); // second call — should be no-op
    expect(destroyed).toEqual([e]);
  });

  it('offDestroy removes callback', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const destroyed: number[] = [];
    const callback = (id: number) => { destroyed.push(id); };
    world.onDestroy(callback);
    world.offDestroy(callback);

    const e = world.createEntity();
    world.destroyEntity(e);
    expect(destroyed).toEqual([]);
  });

  it('multiple callbacks fire in registration order', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.onDestroy(() => order.push('A'));
    world.onDestroy(() => order.push('B'));

    const e = world.createEntity();
    world.destroyEntity(e);
    expect(order).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/world.test.ts`
Expected: FAIL — `world.onDestroy is not a function`

---

### Task 4: Entity Destroy Hooks — Implementation

**Files:**
- Modify: `src/world.ts`

- [ ] **Step 1: Add destroy callback storage to World**

Add this field to the `World` class, after the `diffListeners` field (after line 39):

```typescript
private destroyCallbacks: Array<(id: EntityId, world: World<TEventMap, TCommandMap>) => void> = [];
```

- [ ] **Step 2: Add onDestroy and offDestroy methods**

Add these methods to the `World` class, after the `offDiff` method (after line 297):

```typescript
onDestroy(
  callback: (id: EntityId, world: World<TEventMap, TCommandMap>) => void,
): void {
  this.destroyCallbacks.push(callback);
}

offDestroy(
  callback: (id: EntityId, world: World<TEventMap, TCommandMap>) => void,
): void {
  const index = this.destroyCallbacks.indexOf(callback);
  if (index !== -1) {
    this.destroyCallbacks.splice(index, 1);
  }
}
```

- [ ] **Step 3: Fire callbacks in destroyEntity before cleanup**

Replace the `destroyEntity` method (lines 57-69) with:

```typescript
destroyEntity(id: EntityId): void {
  if (!this.entityManager.isAlive(id)) return;

  for (const callback of this.destroyCallbacks) {
    callback(id, this);
  }

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

Note: The early return for dead entities was not in the original code. This is needed so that `onDestroy` callbacks don't fire for already-dead entities, and it also makes the method idempotent which is safer.

- [ ] **Step 4: Run type check**

Run: `tsc --noEmit` (from engine directory)
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/world.test.ts`
Expected: PASS — all onDestroy/offDestroy tests green, plus existing `destroys entities` test still passes

- [ ] **Step 6: Run lint**

Run: `npm run lint` (from engine directory)
Expected: PASS

- [ ] **Step 7: Commit**

```
git -C /c/Users/38909/Documents/github/civ-engine add src/world.ts tests/world.test.ts
git -C /c/Users/38909/Documents/github/civ-engine commit -m "feat: add entity destroy hooks (onDestroy/offDestroy)"
```

---

### Task 5: Behavior Tree — Core Types and Leaf Nodes — Tests

**Files:**
- Create: `tests/behavior-tree.test.ts`

- [ ] **Step 1: Write tests for NodeStatus, Action, and Condition**

Create `tests/behavior-tree.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  NodeStatus,
  createBehaviorTree,
  createBTState,
} from '../src/behavior-tree.js';

interface TestContext {
  state: { running: number[] };
  value: number;
}

const getState = (ctx: TestContext) => ctx.state;

describe('BehaviorTree', () => {
  function makeCtx(value = 0): TestContext {
    return { state: { running: [] }, value };
  }

  describe('Action', () => {
    it('returns the status from its function', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.action(() => NodeStatus.SUCCESS),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('can return RUNNING', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.action(() => NodeStatus.RUNNING),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
    });

    it('can return FAILURE', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.action(() => NodeStatus.FAILURE),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });
  });

  describe('Condition', () => {
    it('returns SUCCESS when predicate is true', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.condition((ctx) => ctx.value > 0),
      );
      const ctx = makeCtx(5);
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('returns FAILURE when predicate is false', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.condition((ctx) => ctx.value > 0),
      );
      const ctx = makeCtx(0);
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: FAIL — cannot resolve `../src/behavior-tree.js`

---

### Task 6: Behavior Tree — Core Types and Leaf Nodes — Implementation

**Files:**
- Create: `src/behavior-tree.ts`

- [ ] **Step 1: Create behavior-tree.ts with NodeStatus, BTState, leaf nodes, and createBehaviorTree**

Create `src/behavior-tree.ts`:

```typescript
export enum NodeStatus {
  SUCCESS,
  FAILURE,
  RUNNING,
}

export interface BTState {
  running: number[];
}

export abstract class BTNode<TContext> {
  readonly index: number;
  readonly nodeCount: number;

  constructor(index: number, nodeCount: number) {
    this.index = index;
    this.nodeCount = nodeCount;
  }

  abstract tick(context: TContext): NodeStatus;
}

class ActionNode<TContext> extends BTNode<TContext> {
  private fn: (ctx: TContext) => NodeStatus;

  constructor(index: number, fn: (ctx: TContext) => NodeStatus) {
    super(index, 1);
    this.fn = fn;
  }

  tick(context: TContext): NodeStatus {
    return this.fn(context);
  }
}

class ConditionNode<TContext> extends BTNode<TContext> {
  private fn: (ctx: TContext) => boolean;

  constructor(index: number, fn: (ctx: TContext) => boolean) {
    super(index, 1);
    this.fn = fn;
  }

  tick(context: TContext): NodeStatus {
    return this.fn(context) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  }
}

class SelectorNode<TContext> extends BTNode<TContext> {
  readonly children: BTNode<TContext>[];
  private getState: (ctx: TContext) => BTState;

  constructor(
    index: number,
    nodeCount: number,
    children: BTNode<TContext>[],
    getState: (ctx: TContext) => BTState,
  ) {
    super(index, nodeCount);
    this.children = children;
    this.getState = getState;
  }

  tick(context: TContext): NodeStatus {
    const state = this.getState(context);
    const startIndex = Math.max(state.running[this.index], 0);

    for (let i = startIndex; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        state.running[this.index] = i;
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.SUCCESS) {
        state.running[this.index] = -1;
        return NodeStatus.SUCCESS;
      }
    }

    state.running[this.index] = -1;
    return NodeStatus.FAILURE;
  }
}

class SequenceNode<TContext> extends BTNode<TContext> {
  readonly children: BTNode<TContext>[];
  private getState: (ctx: TContext) => BTState;

  constructor(
    index: number,
    nodeCount: number,
    children: BTNode<TContext>[],
    getState: (ctx: TContext) => BTState,
  ) {
    super(index, nodeCount);
    this.children = children;
    this.getState = getState;
  }

  tick(context: TContext): NodeStatus {
    const state = this.getState(context);
    const startIndex = Math.max(state.running[this.index], 0);

    for (let i = startIndex; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        state.running[this.index] = i;
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.FAILURE) {
        state.running[this.index] = -1;
        return NodeStatus.FAILURE;
      }
    }

    state.running[this.index] = -1;
    return NodeStatus.SUCCESS;
  }
}

export interface TreeBuilder<TContext> {
  action(fn: (ctx: TContext) => NodeStatus): BTNode<TContext>;
  condition(fn: (ctx: TContext) => boolean): BTNode<TContext>;
  selector(children: BTNode<TContext>[]): BTNode<TContext>;
  sequence(children: BTNode<TContext>[]): BTNode<TContext>;
}

export function createBTState(tree: BTNode<unknown>): BTState {
  return { running: new Array(tree.nodeCount).fill(-1) };
}

export function createBehaviorTree<TContext>(
  getState: (ctx: TContext) => BTState,
  define: (builder: TreeBuilder<TContext>) => BTNode<TContext>,
): BTNode<TContext> {
  let nextIndex = 0;

  const builder: TreeBuilder<TContext> = {
    action(fn) {
      return new ActionNode(nextIndex++, fn);
    },
    condition(fn) {
      return new ConditionNode(nextIndex++, fn);
    },
    selector(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new SelectorNode(index, 1 + childCount, children, getState);
    },
    sequence(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new SequenceNode(index, 1 + childCount, children, getState);
    },
  };

  return define(builder);
}
```

- [ ] **Step 2: Run type check**

Run: `tsc --noEmit` (from engine directory)
Expected: PASS

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: PASS — Action and Condition tests green

- [ ] **Step 4: Run lint**

Run: `npm run lint` (from engine directory)
Expected: PASS

- [ ] **Step 5: Commit**

```
git -C /c/Users/38909/Documents/github/civ-engine add src/behavior-tree.ts tests/behavior-tree.test.ts
git -C /c/Users/38909/Documents/github/civ-engine commit -m "feat: add behavior tree core — Action, Condition, createBehaviorTree"
```

---

### Task 7: Behavior Tree — Selector Node — Tests

**Files:**
- Modify: `tests/behavior-tree.test.ts`

- [ ] **Step 1: Add Selector tests**

Append inside the existing `describe('BehaviorTree', ...)` block:

```typescript
describe('Selector', () => {
  it('returns SUCCESS on first child success', () => {
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.action(() => NodeStatus.SUCCESS),
        b.action(() => NodeStatus.FAILURE),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);
    expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
  });

  it('skips failed children and returns next success', () => {
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.action(() => NodeStatus.FAILURE),
        b.action(() => NodeStatus.SUCCESS),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);
    expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
  });

  it('returns FAILURE when all children fail', () => {
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.action(() => NodeStatus.FAILURE),
        b.action(() => NodeStatus.FAILURE),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);
    expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
  });

  it('returns RUNNING and resumes from running child', () => {
    let callCount = 0;
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.action(() => NodeStatus.FAILURE),
        b.action(() => {
          callCount++;
          return callCount === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
        }),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);

    // First tick: child 0 fails, child 1 returns RUNNING
    expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);

    // Second tick: resumes at child 1, which now returns SUCCESS
    expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
  });

  it('resets running state after success', () => {
    let callCount = 0;
    const ticked: number[] = [];
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.action(() => {
          ticked.push(0);
          return callCount > 0 ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
        }),
        b.action(() => {
          ticked.push(1);
          callCount++;
          return NodeStatus.SUCCESS;
        }),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);

    // First tick: child 0 fails, child 1 succeeds
    tree.tick(ctx);
    // Second tick: should start from child 0 again (state reset)
    tree.tick(ctx);
    expect(ticked).toEqual([0, 1, 0]);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: PASS — Selector tests green (implementation already exists from Task 6)

---

### Task 8: Behavior Tree — Sequence Node — Tests

**Files:**
- Modify: `tests/behavior-tree.test.ts`

- [ ] **Step 1: Add Sequence tests**

Append inside the existing `describe('BehaviorTree', ...)` block:

```typescript
describe('Sequence', () => {
  it('returns SUCCESS when all children succeed', () => {
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.sequence([
        b.action(() => NodeStatus.SUCCESS),
        b.action(() => NodeStatus.SUCCESS),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);
    expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
  });

  it('returns FAILURE on first child failure', () => {
    const ticked: number[] = [];
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.sequence([
        b.action(() => { ticked.push(0); return NodeStatus.SUCCESS; }),
        b.action(() => { ticked.push(1); return NodeStatus.FAILURE; }),
        b.action(() => { ticked.push(2); return NodeStatus.SUCCESS; }),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);
    expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    // Child 2 should not have been ticked
    expect(ticked).toEqual([0, 1]);
  });

  it('returns RUNNING and resumes from running child', () => {
    let callCount = 0;
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.sequence([
        b.action(() => NodeStatus.SUCCESS),
        b.action(() => {
          callCount++;
          return callCount === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
        }),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);

    // First tick: child 0 succeeds, child 1 returns RUNNING
    expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);

    // Second tick: resumes at child 1, which now returns SUCCESS
    expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
  });

  it('resets running state after completion', () => {
    let tick = 0;
    const ticked: number[] = [];
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.sequence([
        b.action(() => {
          ticked.push(0);
          return NodeStatus.SUCCESS;
        }),
        b.action(() => {
          ticked.push(1);
          tick++;
          return tick === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
        }),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);

    tree.tick(ctx); // child 0 OK, child 1 RUNNING
    tree.tick(ctx); // resumes child 1, SUCCESS
    tree.tick(ctx); // fresh start: child 0, child 1
    expect(ticked).toEqual([0, 1, 1, 0, 1]);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: PASS — Sequence tests green (implementation already exists from Task 6)

---

### Task 9: Behavior Tree — Nested Composition Tests

**Files:**
- Modify: `tests/behavior-tree.test.ts`

- [ ] **Step 1: Add nested tree tests**

Append inside the existing `describe('BehaviorTree', ...)` block:

```typescript
describe('nested trees', () => {
  it('selector containing sequences', () => {
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.sequence([
          b.condition((ctx) => ctx.value > 10),
          b.action(() => NodeStatus.SUCCESS),
        ]),
        b.action(() => NodeStatus.SUCCESS), // fallback
      ]),
    );
    // value = 0 → condition fails → sequence fails → fallback runs
    const ctx = makeCtx(0);
    ctx.state = createBTState(tree);
    expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
  });

  it('tracks correct nodeCount through nesting', () => {
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.sequence([
          b.condition(() => true),
          b.action(() => NodeStatus.SUCCESS),
        ]),
        b.action(() => NodeStatus.FAILURE),
      ]),
    );
    // selector(1) + sequence(1) + condition(1) + action(1) + action(1) = 5
    expect(tree.nodeCount).toBe(5);
  });

  it('createBTState allocates correct array size', () => {
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.sequence([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.SUCCESS),
        ]),
        b.action(() => NodeStatus.FAILURE),
      ]),
    );
    const state = createBTState(tree);
    expect(state.running.length).toBe(tree.nodeCount);
    expect(state.running.every((v) => v === -1)).toBe(true);
  });

  it('RUNNING state in nested child resumes correctly', () => {
    let innerTicks = 0;
    const tree = createBehaviorTree<TestContext>(getState, (b) =>
      b.selector([
        b.sequence([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => {
            innerTicks++;
            return innerTicks === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
          }),
        ]),
      ]),
    );
    const ctx = makeCtx();
    ctx.state = createBTState(tree);

    expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
    expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: PASS — all nested tests green

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run` (from engine directory)
Expected: PASS — all tests green

- [ ] **Step 4: Run lint**

Run: `npm run lint` (from engine directory)
Expected: PASS

- [ ] **Step 5: Commit**

```
git -C /c/Users/38909/Documents/github/civ-engine add tests/behavior-tree.test.ts
git -C /c/Users/38909/Documents/github/civ-engine commit -m "test: add Selector, Sequence, and nested composition tests for BT"
```

---

### Task 10: Update ARCHITECTURE.md

**Files:**
- Modify: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Add BehaviorTree to Component Map**

Add this row to the Component Map table after the ClientAdapter row:

```
| BehaviorTree   | `src/behavior-tree.ts`   | Generic BT framework: NodeStatus, BTNode, Selector, Sequence, Action, Condition, BTState, createBehaviorTree |
```

- [ ] **Step 2: Add BT to Boundaries section**

Add this bullet after the Pathfinding boundary bullet:

```
- **BehaviorTree** is a standalone utility. It has no knowledge of World, entities, or the tick loop. Game code defines tree structure via `createBehaviorTree`, stores `BTState` as a component, and ticks trees from a system. The `TContext` generic is game-defined — the engine does not prescribe what context contains beyond a BTState accessor.
```

- [ ] **Step 3: Add Drift Log entries**

Add these rows to the Drift Log table:

```
| 2026-04-06 | Added getComponents batch API      | Reduces verbosity when systems need multiple components per entity        |
| 2026-04-06 | Added entity destroy hooks           | onDestroy/offDestroy callbacks fire before component removal for relationship cleanup |
| 2026-04-06 | Added behavior tree framework        | Standalone generic BT with ECS-compatible state (BTState) and game-defined TContext    |
```

- [ ] **Step 4: Add Key Architectural Decision**

Add this row to the Key Architectural Decisions table:

```
| 8   | 2026-04-06 | BT state separated from tree structure via BTState   | Enables shared tree blueprints across entities while keeping per-entity state serializable in ECS |
```

- [ ] **Step 5: Commit**

```
git -C /c/Users/38909/Documents/github/civ-engine add docs/ARCHITECTURE.md
git -C /c/Users/38909/Documents/github/civ-engine commit -m "docs: update ARCHITECTURE.md with batch access, destroy hooks, BT framework"
```
