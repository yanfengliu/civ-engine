# Engine Feedback Design Spec — 2026-04-23

**Source:** `civ-sim-web/docs/engine-feedback.md` (entries dated 2026-04-19)

Two friction points identified by `civ-sim-web` while operating the engine. Both changes are additive and backwards-compatible. No existing API signatures change. No snapshot version bump required.

---

## 1. Behavior-tree interrupt/preemption escape hatch

### Problem

`SelectorNode.tick()` and `SequenceNode.tick()` (src/behavior-tree.ts) resume from `state.running[this.index]` whenever it is `>= 0`. When higher-priority needs surface (sleep, eat, loot pickup, job reassignment), the resume position keeps the tree stuck on the previously running branch. `civ-sim-web` had to add app-side invalidation that reaches into `state.running` to clear indices, which requires knowing the tree's internal index layout — a leak of an implementation detail.

### Design

Two additive affordances:

1. **Reactive node builders** — `reactiveSelector` / `reactiveSequence` that never persist running state across ticks. Each tick re-evaluates children from index 0. `RUNNING` still propagates out, but the parent does not write to `state.running[this.index]`.
2. **Subtree state reset helper** — `clearRunningState(state, node?)`. Without `node`, resets the entire `running` array to `-1`. With `node`, resets the slice `[node.index, node.index + node.nodeCount)`.

#### Public API additions

```ts
// src/behavior-tree.ts

export interface TreeBuilder<TContext> {
  action(fn: (ctx: TContext) => NodeStatus): BTNode<TContext>;
  condition(fn: (ctx: TContext) => boolean): BTNode<TContext>;
  selector(children: BTNode<TContext>[]): BTNode<TContext>;
  sequence(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSelector(children: BTNode<TContext>[]): BTNode<TContext>; // NEW
  reactiveSequence(children: BTNode<TContext>[]): BTNode<TContext>; // NEW
}

export function clearRunningState(
  state: BTState,
  node?: BTNode<unknown>,
): void; // NEW
```

#### Semantics

**Reactive selector:**
- On tick, iterate children from index 0 (ignore `state.running[this.index]`).
- If a child returns `RUNNING`, return `RUNNING` without writing to `state.running[this.index]`.
- If a child returns `SUCCESS`, return `SUCCESS` and do not write running state.
- If all fail, return `FAILURE`.
- Grandchild nodes (normal selectors/sequences inside the reactive node) retain their own resume behavior via their own `state.running` slots. Reactive nodes only disable *their own* resume, not descendants.

**Reactive sequence:** symmetric — iterate from 0, propagate `RUNNING` without persisting index, propagate `FAILURE` on any failure, `SUCCESS` only if all succeed.

**`clearRunningState`:**
- Without `node`: sets every entry in `state.running` to `-1`.
- With `node`: sets entries `[node.index, node.index + node.nodeCount)` to `-1`. Root-node cleanup covers the whole tree; any interior node covers its subtree.

#### Tests

- `reactiveSelector` re-evaluates higher-priority children each tick even when a later child returned RUNNING last tick.
- `reactiveSelector` returning RUNNING does not write to `state.running[index]`.
- `reactiveSequence` restarts from child 0 when a later child was running.
- `clearRunningState(state)` resets all indices to -1.
- `clearRunningState(state, subtreeRoot)` resets only that subtree's slice.
- Nested normal selectors inside a reactive selector retain their own resume behavior.

#### Non-goals

- No automatic guard-condition interrupts. Games can wrap a `condition` node inside a `reactiveSequence` to get guard-then-body semantics with fresh re-evaluation each tick.
- No change to existing `selector` / `sequence` semantics.

---

## 2. Per-component semantic diff mode

### Problem

`ComponentStore.set()` unconditionally marks the entity dirty (src/component-store.ts:22). A game system that re-writes an unchanged value every tick (for example `civ-sim-web`'s building sync rewriting `position`, `transform`, `construction`, `buildingInventory`) still produces a dirty entry in `TickDiff`, masking real liveness signals. The existing fingerprint comparison in `getDirty()` only catches *additional* in-place mutations; it does not filter out redundant `set()` calls.

### Design

Add a `diffMode` option to component registration. In `semantic` mode, `set()` computes a fingerprint and skips dirty-marking when the value is unchanged relative to the baseline captured at the last `clearDirty()`.

#### Public API additions

```ts
// src/component-store.ts

export interface ComponentStoreOptions {
  diffMode?: 'strict' | 'semantic'; // default 'strict'
}

export class ComponentStore<T> {
  constructor(options?: ComponentStoreOptions); // NEW (defaults to strict)
  // ...existing methods unchanged
}

// src/world.ts

export interface ComponentOptions {
  diffMode?: 'strict' | 'semantic'; // default 'strict'
}

class World<...> {
  registerComponent<T>(key: string, options?: ComponentOptions): void; // overload
}
```

#### Semantics

**`strict` (default, current behavior):** every `set()` unconditionally marks dirty. Preserves existing semantics bit-for-bit.

**`semantic`:** `set()` computes `jsonFingerprint(data)` and compares to `baseline.get(entityId)`. If equal and the entity is already present in the store, skip `dirtySet.add(entityId)`. Still update `data[entityId]`, bump `_generation`, and all other side effects. New entity insertions always mark dirty (no baseline exists). Component removal is unchanged.

**`getDirty()`** behavior is otherwise unchanged. The in-place mutation scan still walks entries and compares against baseline. This means semantic mode also catches true in-place changes while skipping redundant writes — both paths route through the same fingerprint.

**`_generation`** still increments on every `set()` regardless of mode. Consumers that rely on generation counters (e.g. render adapters) are unaffected.

#### Performance

Semantic mode pays a `jsonFingerprint` cost on every `set()`. Games opt in per-component for noisy-write components, so the cost is paid deliberately for the components that benefit.

#### Tests

- Component registered as `semantic`: writing the same value twice produces one dirty entry in the first diff and none in the second.
- Component registered as `semantic`: writing a genuinely changed value marks dirty normally.
- Component registered as `strict` (default): identical rewrites still mark dirty (current behavior unchanged).
- Semantic mode + in-place mutation: in-place mutation is still detected by `getDirty()`.
- New entity insertion in semantic mode: always marks dirty.
- Component removal in semantic mode: appears in `removed`, not affected by mode.
- `_generation` increments on every `set()` in both modes.
- World-level: `registerComponent(key, { diffMode: 'semantic' })` wires the option through to the underlying store.

#### Non-goals

- No world-level `diffMode` flag. Per-component selectivity matches how the problem presents (specific high-churn components) and how the feedback describes the fix ("higher-signal buckets").
- No user-supplied `equalityCheck` callback. `jsonFingerprint` is the engine's change-detection primitive already and keeps the semantic path consistent with existing in-place detection.

---

## Architecture impact

- `src/behavior-tree.ts`: adds `ReactiveSelectorNode`, `ReactiveSequenceNode`, two builder methods, `clearRunningState` helper. ~60 LOC.
- `src/component-store.ts`: adds `ComponentStoreOptions`, optional fingerprint check in `set()`. ~30 LOC.
- `src/world.ts`: adds `ComponentOptions` type and plumbs options through `registerComponent` / `getStore`. ~10 LOC.
- `src/index.ts`: export new symbols.
- `docs/ARCHITECTURE.md`: add row to drift log, update Behavior Tree and ComponentStore component-map entries. No Key Architectural Decision entry needed — both are additive affordances, not boundary changes.
- `docs/devlog-detailed.md`: append entry per AGENTS.md workflow.
- `docs/devlog-summary.md`: add one-line summary per AGENTS.md.

No snapshot version bump. No breaking changes. No public API removals.
