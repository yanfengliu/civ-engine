# Engine Feedback (2026-04-23) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address two civ-sim-web feedback items — behavior-tree interrupt/preemption affordances and per-component semantic diff mode — both additive and backwards-compatible.

**Architecture:** Two independent additions.
1. `src/behavior-tree.ts` gets reactive node variants (`reactiveSelector`, `reactiveSequence`) that do not persist running state, plus a `clearRunningState(state, node?)` helper for imperative subtree resets.
2. `src/component-store.ts` gets a `diffMode: 'strict' | 'semantic'` option; semantic mode fingerprints values in `set()` and skips dirty-marking when unchanged. `src/world.ts` exposes this via a new `ComponentOptions` parameter on `registerComponent`.

**Tech Stack:** TypeScript 5.7+ (strict, ESM, Node16), Vitest 3, ESLint 9.

**Spec:** `docs/superpowers/specs/2026-04-23-engine-feedback-design.md`

**Validation gates (AGENTS.md requires all to pass at the end):**
- `npx vitest run`
- `npx tsc --noEmit`
- `npx vite build` — *NB:* this repo uses `npm run build`; see Task 5.

---

## File Structure

**Modified:**
- `src/behavior-tree.ts` — add `ReactiveSelectorNode`, `ReactiveSequenceNode`, `reactiveSelector` / `reactiveSequence` builders, `clearRunningState` helper.
- `src/component-store.ts` — add `ComponentStoreOptions`, constructor, semantic-mode fingerprint check in `set()`.
- `src/world.ts` — add exported `ComponentOptions` type, plumb options into `registerComponent` → `new ComponentStore(options)`.
- `tests/behavior-tree.test.ts` — tests for reactive nodes and `clearRunningState`.
- `tests/component-store.test.ts` — tests for semantic diff mode at the store level.
- `tests/diff.test.ts` — tests for world-level `registerComponent({ diffMode: 'semantic' })` wiring.
- `docs/ARCHITECTURE.md` — drift log row, BehaviorTree row refresh.
- `docs/devlog-detailed.md` — append final entry.
- `docs/devlog-summary.md` — one-line summary.
- `docs/changelog.md` — append to `## Unreleased` section.

**Created:** none. All additions fit inside existing files.

**Out of scope:** `docs/api-reference.md` and guide updates — not strictly required by AGENTS.md's architectural-change gate, keep this change tight.

---

## Task 1: Reactive Selector + Reactive Sequence

**Files:**
- Modify: `src/behavior-tree.ts`
- Test: `tests/behavior-tree.test.ts`

- [ ] **Step 1: Write the first failing test — reactive selector re-evaluates priorities**

Append to `tests/behavior-tree.test.ts` after the existing `describe('Sequence', ...)` block, inside the top-level `describe('BehaviorTree', ...)`:

```ts
  describe('Reactive Selector', () => {
    it('re-evaluates higher-priority children each tick even when later child was RUNNING', () => {
      let highPrioritySucceeds = false;
      let lowPriorityTicks = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          b.condition(() => highPrioritySucceeds),
          b.action(() => {
            lowPriorityTicks++;
            return NodeStatus.RUNNING;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(lowPriorityTicks).toBe(1);

      highPrioritySucceeds = true;
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
      expect(lowPriorityTicks).toBe(1);
    });

    it('does not write to state.running[index] when returning RUNNING', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([b.action(() => NodeStatus.RUNNING)]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      expect(ctx.state.running[tree.index]).toBe(-1);
    });

    it('returns SUCCESS on first child success', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.FAILURE),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('returns FAILURE when all children fail', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          b.action(() => NodeStatus.FAILURE),
          b.action(() => NodeStatus.FAILURE),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });

    it('does not suppress nested selector resume behavior', () => {
      let innerTicks = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          b.selector([
            b.action(() => NodeStatus.FAILURE),
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
      expect(innerTicks).toBe(2);
    });
  });

  describe('Reactive Sequence', () => {
    it('restarts from child 0 when a later child was RUNNING', () => {
      const ticked: number[] = [];
      let childTwoCalls = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([
          b.action(() => {
            ticked.push(0);
            return NodeStatus.SUCCESS;
          }),
          b.action(() => {
            ticked.push(1);
            childTwoCalls++;
            return childTwoCalls === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
      expect(ticked).toEqual([0, 1, 0, 1]);
    });

    it('does not write to state.running[index] when returning RUNNING', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([b.action(() => NodeStatus.RUNNING)]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      expect(ctx.state.running[tree.index]).toBe(-1);
    });

    it('returns SUCCESS when all children succeed', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('returns FAILURE on first child failure', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([
          b.action(() => NodeStatus.FAILURE),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });

    it('condition + reactiveSequence gives guard-then-body re-check each tick', () => {
      let guardTrue = true;
      let bodyTicks = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([
          b.condition(() => guardTrue),
          b.action(() => {
            bodyTicks++;
            return NodeStatus.RUNNING;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(bodyTicks).toBe(1);

      guardTrue = false;
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
      expect(bodyTicks).toBe(1);
    });
  });
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: FAIL. The `b.reactiveSelector` and `b.reactiveSequence` builder methods do not exist yet. Vitest reports a type/runtime error on every reactive test.

- [ ] **Step 3: Implement `ReactiveSelectorNode` and `ReactiveSequenceNode`**

In `src/behavior-tree.ts`, after `SequenceNode` (around current line 119), append:

```ts
class ReactiveSelectorNode<TContext> extends BTNode<TContext> {
  readonly children: BTNode<TContext>[];

  constructor(index: number, nodeCount: number, children: BTNode<TContext>[]) {
    super(index, nodeCount);
    this.children = children;
  }

  tick(context: TContext): NodeStatus {
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.SUCCESS) {
        return NodeStatus.SUCCESS;
      }
    }
    return NodeStatus.FAILURE;
  }
}

class ReactiveSequenceNode<TContext> extends BTNode<TContext> {
  readonly children: BTNode<TContext>[];

  constructor(index: number, nodeCount: number, children: BTNode<TContext>[]) {
    super(index, nodeCount);
    this.children = children;
  }

  tick(context: TContext): NodeStatus {
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.FAILURE) {
        return NodeStatus.FAILURE;
      }
    }
    return NodeStatus.SUCCESS;
  }
}
```

Note: these nodes do not take `getState` — they never read or write `state.running[this.index]`. Descendants that *do* need state still receive `getState` via the shared closure in `createBehaviorTree`.

- [ ] **Step 4: Extend `TreeBuilder` and `createBehaviorTree`**

In `src/behavior-tree.ts`, modify the `TreeBuilder` interface (currently around line 121) to add two builder methods:

```ts
export interface TreeBuilder<TContext> {
  action(fn: (ctx: TContext) => NodeStatus): BTNode<TContext>;
  condition(fn: (ctx: TContext) => boolean): BTNode<TContext>;
  selector(children: BTNode<TContext>[]): BTNode<TContext>;
  sequence(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSelector(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSequence(children: BTNode<TContext>[]): BTNode<TContext>;
}
```

Then in `createBehaviorTree` (currently around line 132), add two entries to the `builder` object after the existing `sequence` entry:

```ts
    reactiveSelector(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new ReactiveSelectorNode(index, 1 + childCount, children);
    },
    reactiveSequence(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new ReactiveSequenceNode(index, 1 + childCount, children);
    },
```

- [ ] **Step 5: Run tests and confirm they pass**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: PASS for all reactive tests plus all pre-existing BT tests (20+ total in this file).

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint src/behavior-tree.ts tests/behavior-tree.test.ts`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/behavior-tree.ts tests/behavior-tree.test.ts
git commit -m "$(cat <<'EOF'
Add reactiveSelector and reactiveSequence BT nodes

Reactive variants never persist running state across ticks, enabling
dynamic priority re-evaluation each tick. Existing selector/sequence
semantics are unchanged. Addresses civ-sim-web feedback about BT
resume stickiness when higher-priority needs emerge.
EOF
)"
```

---

## Task 2: `clearRunningState` helper

**Files:**
- Modify: `src/behavior-tree.ts`
- Test: `tests/behavior-tree.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the top-level `describe('BehaviorTree', ...)` block in `tests/behavior-tree.test.ts`, after the `describe('Reactive Sequence', ...)` block, importing `clearRunningState` at the top of the file (add to the existing `import { ... } from '../src/behavior-tree.js';` line):

```ts
  describe('clearRunningState', () => {
    it('resets every running index to -1 when called without a node', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.sequence([
            b.action(() => NodeStatus.SUCCESS),
            b.action(() => NodeStatus.RUNNING),
          ]),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      expect(ctx.state.running.some((v) => v !== -1)).toBe(true);

      clearRunningState(ctx.state);
      expect(ctx.state.running.every((v) => v === -1)).toBe(true);
    });

    it('resets only the given subtree slice when a node is provided', () => {
      let subtreeRoot!: BTNode<TestContext>;
      const tree = createBehaviorTree<TestContext>(getState, (b) => {
        subtreeRoot = b.sequence([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.RUNNING),
        ]);
        return b.selector([subtreeRoot, b.action(() => NodeStatus.SUCCESS)]);
      });
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      ctx.state.running[tree.index] = 0;

      clearRunningState(ctx.state, subtreeRoot);

      for (
        let i = subtreeRoot.index;
        i < subtreeRoot.index + subtreeRoot.nodeCount;
        i++
      ) {
        expect(ctx.state.running[i]).toBe(-1);
      }
      expect(ctx.state.running[tree.index]).toBe(0);
    });
  });
```

Also add `BTNode` to the imports at the top of the file:

```ts
import {
  NodeStatus,
  createBehaviorTree,
  createBTState,
  clearRunningState,
  BTNode,
} from '../src/behavior-tree.js';
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: FAIL. `clearRunningState` is not exported from `../src/behavior-tree.js`.

- [ ] **Step 3: Implement `clearRunningState`**

At the bottom of `src/behavior-tree.ts`, append:

```ts
export function clearRunningState(
  state: BTState,
  node?: BTNode<unknown>,
): void {
  if (node === undefined) {
    for (let i = 0; i < state.running.length; i++) {
      state.running[i] = -1;
    }
    return;
  }
  const end = node.index + node.nodeCount;
  for (let i = node.index; i < end; i++) {
    state.running[i] = -1;
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npx vitest run tests/behavior-tree.test.ts`
Expected: PASS for all tests in this file.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit` → no errors.
Run: `npx eslint src/behavior-tree.ts tests/behavior-tree.test.ts` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/behavior-tree.ts tests/behavior-tree.test.ts
git commit -m "$(cat <<'EOF'
Add clearRunningState helper for BT subtree resets

Complements reactive nodes by giving games an imperative escape
hatch: reset the whole BTState.running array, or a single subtree
slice, when external events (job reassignment, loot pickup) should
interrupt a running branch.
EOF
)"
```

---

## Task 3: ComponentStore semantic diff mode

**Files:**
- Modify: `src/component-store.ts`
- Test: `tests/component-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the end of `tests/component-store.test.ts` inside the top-level `describe` block (inspect that file first to confirm the outer describe name; the pattern in this codebase is `describe('ComponentStore', ...)`):

```ts
  describe('semantic diffMode', () => {
    it('defaults to strict mode (identical rewrites still mark dirty)', () => {
      const store = new ComponentStore<{ x: number }>();
      store.set(0, { x: 5 });
      store.clearDirty();

      store.set(0, { x: 5 });
      const dirty = store.getDirty();
      expect(dirty.set).toEqual([[0, { x: 5 }]]);
    });

    it('semantic mode skips dirty-marking for identical rewrites', () => {
      const store = new ComponentStore<{ x: number }>({ diffMode: 'semantic' });
      store.set(0, { x: 5 });
      store.clearDirty();

      store.set(0, { x: 5 });
      const dirty = store.getDirty();
      expect(dirty.set).toEqual([]);
    });

    it('semantic mode still marks dirty when value changes', () => {
      const store = new ComponentStore<{ x: number }>({ diffMode: 'semantic' });
      store.set(0, { x: 5 });
      store.clearDirty();

      store.set(0, { x: 6 });
      const dirty = store.getDirty();
      expect(dirty.set).toEqual([[0, { x: 6 }]]);
    });

    it('semantic mode marks dirty on first insert (no baseline)', () => {
      const store = new ComponentStore<{ x: number }>({ diffMode: 'semantic' });
      store.set(0, { x: 5 });

      const dirty = store.getDirty();
      expect(dirty.set).toEqual([[0, { x: 5 }]]);
    });

    it('semantic mode still detects in-place mutations via getDirty scan', () => {
      const store = new ComponentStore<{ x: number }>({ diffMode: 'semantic' });
      store.set(0, { x: 5 });
      store.clearDirty();

      const value = store.get(0)!;
      value.x = 99;

      const dirty = store.getDirty();
      expect(dirty.set).toEqual([[0, { x: 99 }]]);
    });

    it('semantic mode handles removal like strict', () => {
      const store = new ComponentStore<{ x: number }>({ diffMode: 'semantic' });
      store.set(0, { x: 5 });
      store.clearDirty();

      store.remove(0);
      const dirty = store.getDirty();
      expect(dirty.set).toEqual([]);
      expect(dirty.removed).toEqual([0]);
    });

    it('_generation still increments on every set() in both modes', () => {
      const strict = new ComponentStore<{ x: number }>();
      strict.set(0, { x: 5 });
      strict.clearDirty();
      const strictGenBefore = strict.generation;
      strict.set(0, { x: 5 });
      expect(strict.generation).toBe(strictGenBefore + 1);

      const semantic = new ComponentStore<{ x: number }>({ diffMode: 'semantic' });
      semantic.set(0, { x: 5 });
      semantic.clearDirty();
      const semanticGenBefore = semantic.generation;
      semantic.set(0, { x: 5 });
      expect(semantic.generation).toBe(semanticGenBefore + 1);
    });
  });
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npx vitest run tests/component-store.test.ts`
Expected: FAIL. `new ComponentStore({ diffMode: 'semantic' })` rejects the constructor argument with a type error (no constructor accepting options), or runtime passes the option into nothing and the semantic behavior does not occur.

- [ ] **Step 3: Implement `ComponentStoreOptions` and semantic behavior in `set()`**

Modify `src/component-store.ts`. Replace the class body entirely with:

```ts
import type { EntityId } from './types.js';
import { jsonFingerprint } from './json.js';

export interface ComponentStoreOptions {
  diffMode?: 'strict' | 'semantic';
}

export class ComponentStore<T> {
  private data: (T | undefined)[] = [];
  private _generation = 0;
  private _size = 0;
  private dirtySet = new Set<EntityId>();
  private removedSet = new Set<EntityId>();
  private baseline = new Map<EntityId, string>();
  private diffMode: 'strict' | 'semantic';

  constructor(options: ComponentStoreOptions = {}) {
    this.diffMode = options.diffMode ?? 'strict';
  }

  set(entityId: EntityId, component: T): void {
    if (component === undefined) {
      throw new Error('Component data must not be undefined');
    }
    const fingerprint = jsonFingerprint(component, `component ${entityId}`);
    const wasPresent = this.data[entityId] !== undefined;
    if (!wasPresent) {
      this._size++;
    }
    this.data[entityId] = component;
    this._generation++;
    if (this.diffMode === 'semantic' && wasPresent) {
      const baseline = this.baseline.get(entityId);
      if (baseline === fingerprint) {
        return;
      }
    }
    this.dirtySet.add(entityId);
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
    this.dirtySet.delete(entityId);
    this.removedSet.add(entityId);
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

  *entries(): IterableIterator<[EntityId, T]> {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== undefined) {
        yield [i, this.data[i] as T];
      }
    }
  }

  getDirty(): { set: Array<[EntityId, T]>; removed: EntityId[] } {
    const changed = new Set(this.dirtySet);
    for (const [id, data] of this.entries()) {
      if (changed.has(id)) continue;
      const previous = this.baseline.get(id);
      const current = jsonFingerprint(data, `component ${id}`);
      if (previous !== current) {
        changed.add(id);
      }
    }

    const set: Array<[EntityId, T]> = [];
    for (const id of changed) {
      if (this.data[id] !== undefined) {
        set.push([id, this.data[id] as T]);
      }
    }
    return { set, removed: [...this.removedSet] };
  }

  clearDirty(): void {
    this.dirtySet.clear();
    this.removedSet.clear();
    this.baseline.clear();
    for (const [id, data] of this.entries()) {
      this.baseline.set(id, jsonFingerprint(data, `component ${id}`));
    }
  }

  static fromEntries<T>(
    entries: Array<[EntityId, T]>,
    options?: ComponentStoreOptions,
  ): ComponentStore<T> {
    const store = new ComponentStore<T>(options);
    for (const [id, data] of entries) {
      store.set(id, data);
    }
    store.clearDirty();
    return store;
  }
}
```

Key changes:
- New `ComponentStoreOptions` interface.
- Constructor accepts optional options and stores `diffMode`.
- `set()` always computes fingerprint once; in semantic mode with an already-present entity, skip `dirtySet.add` when fingerprint matches baseline. In strict mode, skip the comparison and always mark dirty (preserves current behavior).
- New-entity insertions always mark dirty (the `wasPresent` gate).
- `_generation` still increments on every `set()` in both modes.
- `fromEntries` takes optional options and forwards them.

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npx vitest run tests/component-store.test.ts`
Expected: PASS for every test in the file — the new semantic tests and the pre-existing strict tests.

- [ ] **Step 5: Run the full test suite to catch regressions from the `set()` rewrite**

Run: `npx vitest run`
Expected: PASS. Snapshot tests, diff tests, and world tests all still pass because strict mode is the default and behavior is preserved.

If anything fails, stop and inspect. The likely causes are (a) an assumption in another test about `_generation` behavior, or (b) a snapshot fingerprint difference. Fix before continuing.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit` → no errors.
Run: `npx eslint src/component-store.ts tests/component-store.test.ts` → no errors.

- [ ] **Step 7: Commit**

```bash
git add src/component-store.ts tests/component-store.test.ts
git commit -m "$(cat <<'EOF'
Add semantic diffMode to ComponentStore

Semantic mode fingerprints values in set() and skips dirty-marking
when unchanged vs. the baseline captured at the last clearDirty().
Strict mode (default) keeps the existing per-write dirty semantics.
In-place mutation detection via getDirty() is unchanged in both
modes. _generation still increments on every set() regardless of
mode. Addresses civ-sim-web feedback about blind sync rewrites
surfacing as TickDiff churn.
EOF
)"
```

---

## Task 4: World `registerComponent` plumbing

**Files:**
- Modify: `src/world.ts`
- Test: `tests/diff.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/diff.test.ts` inside the top-level `describe('State Diff', ...)`:

```ts
  it('registerComponent with diffMode: "semantic" suppresses blind rewrites in the diff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('transform', {
      diffMode: 'semantic',
    });
    const e = world.createEntity();
    world.addComponent(e, 'transform', { x: 5, y: 5 });
    world.step();

    world.registerSystem((w) => {
      w.addComponent(e, 'transform', { x: 5, y: 5 });
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.components['transform']).toBeUndefined();
  });

  it('registerComponent without diffMode still marks identical rewrites as dirty', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('transform');
    const e = world.createEntity();
    world.addComponent(e, 'transform', { x: 5, y: 5 });
    world.step();

    world.registerSystem((w) => {
      w.addComponent(e, 'transform', { x: 5, y: 5 });
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.components['transform'].set).toEqual([[e, { x: 5, y: 5 }]]);
  });
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npx vitest run tests/diff.test.ts`
Expected: FAIL. `registerComponent` accepts only `(key)`, so the second argument is a type error; the first new test fails because the blind rewrite appears in the diff.

- [ ] **Step 3: Add `ComponentOptions` and plumb through `registerComponent`**

In `src/world.ts`, add an export near the other public types (around line 206 where `ComponentRegistry` lives):

```ts
export interface ComponentOptions {
  diffMode?: 'strict' | 'semantic';
}
```

Update the `registerComponent` overload stack (currently at lines 351-360). Replace with:

```ts
  registerComponent<K extends keyof TComponents & string>(
    key: K,
    options?: ComponentOptions,
  ): void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registerComponent<T>(key: string, options?: ComponentOptions): void;
  registerComponent(key: string, options?: ComponentOptions): void {
    if (this.componentStores.has(key)) {
      throw new Error(`Component '${key}' is already registered`);
    }
    this.componentStores.set(key, new ComponentStore<unknown>(options));
    this.registerComponentBit(key);
  }
```

Also ensure the import at the top of `src/world.ts` for `ComponentStore` still works — if the file uses `import { ComponentStore } from './component-store.js';`, that continues to work (the new `ComponentStoreOptions` type is not needed in world.ts because `ComponentOptions` is structurally identical and accepted by the store constructor via duck typing).

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npx vitest run tests/diff.test.ts`
Expected: PASS for all tests in the file.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit` → no errors.
Run: `npx eslint src/world.ts tests/diff.test.ts` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/world.ts tests/diff.test.ts
git commit -m "$(cat <<'EOF'
Plumb diffMode option through World.registerComponent

Exports a ComponentOptions type and forwards { diffMode: 'semantic' }
to the underlying ComponentStore constructor so games can opt
noisy-write components out of strict dirty-marking.
EOF
)"
```

---

## Task 5: Full validation gates

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS for every test in the repo. The total should match the prior baseline (394) plus the new tests in Tasks 1-4 (count them — roughly 14-16 new tests).

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run lint**

Run: `npx eslint .`
Expected: no errors.

- [ ] **Step 4: Run the build**

Check `package.json` for the build script name. This repo uses `npm run build`, not `vite build` — AGENTS.md lists `vite build` generically but the repo is a library.

Run: `npm run build`
Expected: clean build, no errors.

- [ ] **Step 5: No commit needed — verification only**

If any gate fails, go back to the failing task and fix before proceeding.

---

## Task 6: Documentation updates

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/devlog-detailed.md`
- Modify: `docs/devlog-summary.md`
- Modify: `docs/changelog.md`

- [ ] **Step 1: Update `docs/ARCHITECTURE.md` drift log**

Append a row to the `## Drift Log` table at the end of the file:

```
| 2026-04-23 | Added BT interrupt affordances and semantic diff mode | Address civ-sim-web feedback: reactive selector/sequence + clearRunningState helper; per-component diffMode opt-in to suppress blind-rewrite diff churn |
```

Also update the `BehaviorTree` row in the Component Map (around line 37) to mention reactive nodes:

Replace:
```
| BehaviorTree   | `src/behavior-tree.ts`   | Generic BT framework: NodeStatus, BTNode, Selector, Sequence, Action, Condition, BTState, createBehaviorTree |
```

With:
```
| BehaviorTree   | `src/behavior-tree.ts`   | Generic BT framework: NodeStatus, BTNode, Selector, Sequence, ReactiveSelector, ReactiveSequence, Action, Condition, BTState, createBehaviorTree, clearRunningState |
```

- [ ] **Step 2: Append entry to `docs/devlog-detailed.md`**

Append at the end of the file:

```
## [2026-04-23 HH:MM, UTC] — Engine Feedback (2026-04-19 items)

**Action:** Addressed two civ-sim-web feedback items. (1) Behavior-tree interrupt/preemption: added `reactiveSelector` and `reactiveSequence` builder methods that never persist running state across ticks, plus a `clearRunningState(state, node?)` helper for imperative subtree resets. (2) Per-component semantic diff mode: added a `diffMode: 'strict' | 'semantic'` option to `ComponentStore` and `World.registerComponent`. Semantic mode fingerprints values in `set()` and skips dirty-marking on unchanged rewrites; strict mode (default) preserves existing behavior.
**Code reviewer comments:** *(fill in per AGENTS.md review workflow — run Codex/Gemini/Claude CLI reviews on the diff and record each tool's findings here)*
**Result:** *(fill in after validation — expected: all tests pass, typecheck clean, lint clean, build clean)*
**Files changed:** src/behavior-tree.ts, src/component-store.ts, src/world.ts, tests/behavior-tree.test.ts, tests/component-store.test.ts, tests/diff.test.ts, docs/ARCHITECTURE.md, docs/changelog.md, docs/devlog-detailed.md, docs/devlog-summary.md, docs/superpowers/specs/2026-04-23-engine-feedback-design.md, docs/superpowers/plans/2026-04-23-engine-feedback.md
**Reasoning:** Both items map to additive, backwards-compatible affordances. Reactive BT nodes plus a state-reset helper cover both the declarative (priority re-evaluation) and imperative (external interrupt) patterns the feedback describes. Per-component semantic diff matches the feedback's "higher-signal buckets" language and lets games opt noisy-write components out without forcing a global behavior change.
**Notes:** No snapshot version bump. No existing API signatures change. Fill in `HH:MM` with the actual UTC time when committing. Replace the placeholder review/result sections with the real output before the final commit.
```

Replace `HH:MM` with the current UTC time when committing.

- [ ] **Step 3: Append one-line entry to `docs/devlog-summary.md`**

Append at the end of the file:

```
- 2026-04-23: Engine feedback (civ-sim-web 2026-04-19) — reactive BT nodes + clearRunningState helper + per-component semantic diff mode; additive, backwards-compatible; N new tests, M total pass.
```

Replace `N` and `M` with the actual counts after running the full suite in Task 5.

- [ ] **Step 4: Append to `docs/changelog.md` `## Unreleased` section**

Under the existing `## Unreleased` → `### Added` list, append two bullets:

```
- `reactiveSelector` and `reactiveSequence` BT builder methods that do not persist running state across ticks, plus a `clearRunningState(state, node?)` helper for imperative subtree resets. Existing `selector` / `sequence` semantics are unchanged.
- `ComponentOptions.diffMode: 'strict' | 'semantic'` on `World.registerComponent`. Semantic mode fingerprints values in `set()` and skips dirty-marking on unchanged rewrites. Strict mode remains the default.
```

- [ ] **Step 5: Final validation pass**

Run: `npx vitest run && npx tsc --noEmit && npx eslint . && npm run build`
Expected: every gate passes.

- [ ] **Step 6: Commit docs**

```bash
git add docs/ARCHITECTURE.md docs/devlog-detailed.md docs/devlog-summary.md docs/changelog.md
git commit -m "$(cat <<'EOF'
Document 2026-04-23 engine feedback changes

Drift log entry, component map refresh, changelog, and devlog entries
for reactive BT nodes, clearRunningState helper, and per-component
semantic diffMode.
EOF
)"
```

- [ ] **Step 7: Verify final branch state**

Run: `git log --oneline -6`
Expected: 6 commits (4 feature commits, 1 spec commit from brainstorming, 1 docs commit) in the reverse order they were created.

Run: `git status`
Expected: clean working tree.

---

## Self-Review (done by the plan author before handoff)

**Spec coverage:**
- Item 1 design (reactive nodes + helper) → Tasks 1 & 2. ✓
- Item 2 design (ComponentStore + World plumbing) → Tasks 3 & 4. ✓
- Non-goals (no guard-condition interrupts, no world-level flag, no equalityCheck callback) → enforced by what is *not* in the plan. ✓
- Architecture impact section (src file LOC, docs updates) → Task 6. ✓
- Validation gates from AGENTS.md → Task 5. ✓

**Placeholder scan:**
- One intentional placeholder in the devlog entry (`HH:MM`, code reviewer comments, result) — these require runtime data. Explicitly flagged as "fill in when committing". Acceptable because the devlog entry's structure is complete and the placeholders are unambiguous.
- No `TBD`/`TODO`/"implement later"/"add appropriate error handling" patterns.

**Type consistency:**
- `ComponentOptions` (exported from world.ts) and `ComponentStoreOptions` (internal to component-store.ts) are structurally compatible — both have `diffMode?: 'strict' | 'semantic'`. Called out in Task 4.
- `reactiveSelector` / `reactiveSequence` names match across spec, Task 1 tests, Task 1 impl, Task 6 changelog.
- `clearRunningState` signature `(state: BTState, node?: BTNode<unknown>)` matches across Task 2 tests, Task 2 impl, spec.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-engine-feedback.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
