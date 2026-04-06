# Engine Improvements: Batch Access, Destroy Hooks, Behavior Trees

**Date:** 2026-04-06
**Status:** Approved
**Motivation:** Prepare the engine for real-world civ-sim game usage. All three improvements are grounded in concrete needs from [civ-sim-web](../../civ-sim-web), a town-life simulation game being refactored onto this engine.

---

## 1. Batch Component Access

### Problem

Systems and BT nodes frequently need 3-5 components per entity. Currently each requires a separate `world.getComponent()` call with repeated entity IDs and manual type annotations.

### Design

Add an overloaded `getComponents` method to `World`:

```typescript
type ComponentTuple<T extends unknown[]> = { [K in keyof T]: T[K] | undefined };

// On World class:
getComponents<T extends unknown[]>(id: EntityId, keys: string[]): ComponentTuple<T>
```

**Usage:**

```typescript
const [pos, hp, vitals] = world.getComponents<[Position, Health, Vitals]>(
  id, ['position', 'health', 'vitals']
);
// Each element: T | undefined
```

**Implementation:** Thin wrapper — iterates keys, calls the corresponding `ComponentStore.get()` for each, returns the results as an array. No new data structures or caching.

---

## 2. Entity Destroy Hooks

### Problem

Entities hold references to each other (family partners, children, combat targets, building assignments). When an entity is destroyed, those references go stale. Without hooks, a cleanup system must scan every entity every tick to find and remove stale references.

### Design

Add `onDestroy` / `offDestroy` to `World`:

```typescript
type DestroyCallback = (entityId: EntityId, world: World) => void;

// On World class:
onDestroy(callback: DestroyCallback): void
offDestroy(callback: DestroyCallback): void
```

**Timing:** Callbacks fire inside `destroyEntity()`, **before** components and resources are removed. This lets the callback read the dying entity's state to determine what to clean up on other entities.

**Execution order within `destroyEntity(id)`:**

1. Destroy callbacks fire (entity fully intact, components readable)
2. All components removed from stores
3. All resources removed
4. Spatial grid updated on next sync
5. Entity ID freed for reuse

**Scope:** Global callbacks only (no per-entity hooks). Callbacks receive the entity ID and filter themselves. One callback can handle all relationship types.

---

## 3. Behavior Tree Framework

### Problem

Civ-sim games need composable AI where tree structure is shared across entities but running state is per-entity and ECS-compatible (serializable, diffable).

### 3a. Node Types

Provided as an engine utility module (like pathfinding, noise):

```typescript
enum NodeStatus { SUCCESS, FAILURE, RUNNING }
```

**Abstract base:**

```typescript
abstract class BTNode<TContext> {
  readonly index: number;      // Auto-assigned during tree construction
  readonly nodeCount: number;  // Total nodes in subtree
  abstract tick(context: TContext): NodeStatus;
}
```

**Composite nodes:**

- `Selector<TContext>` — Tries children in order. Returns first SUCCESS or RUNNING. Tracks running child in BTState for resumption.
- `Sequence<TContext>` — Runs children in order. Fails on first FAILURE. Tracks running child in BTState for resumption.

**Leaf nodes:**

- `Action<TContext>` — Wraps `(ctx: TContext) => NodeStatus`.
- `Condition<TContext>` — Wraps `(ctx: TContext) => boolean`. Returns SUCCESS if true, FAILURE if false.

### 3b. State Management

```typescript
interface BTState {
  running: number[];  // Indexed by node.index
  // -1 = no child running (default)
  // >= 0 = index of running child within parent's children array
}

function createBTState(tree: BTNode<unknown>): BTState {
  return { running: new Array(tree.nodeCount).fill(-1) };
}
```

- Composite nodes read/write `state.running[this.index]`.
- Leaf nodes don't use state.
- State is a plain serializable object — works with engine's snapshot/diff system.

### 3c. Tree Construction

A builder API assigns indices and wires up state access:

```typescript
function createBehaviorTree<TContext>(
  getState: (ctx: TContext) => BTState,
  define: (b: TreeBuilder<TContext>) => BTNode<TContext>
): BTNode<TContext>
```

**`TreeBuilder<TContext>` provides:**

- `b.selector(children)` — Creates Selector, assigns indices
- `b.sequence(children)` — Creates Sequence, assigns indices
- `b.action(fn)` — Creates Action leaf
- `b.condition(fn)` — Creates Condition leaf

**Usage:**

```typescript
const residentTree = createBehaviorTree<ResidentBTContext>(
  (ctx) => ctx.state,
  (b) => b.selector([
    b.sequence([
      b.condition((ctx) => ctx.world.getComponent<Health>(ctx.entityId, 'health')!.hp < 20),
      b.action((ctx) => { /* flee logic */ return NodeStatus.RUNNING; }),
    ]),
    b.action((ctx) => NodeStatus.SUCCESS), // idle fallback
  ])
);
```

### 3d. Context is Game-Defined

The engine's BT is generic over `TContext`. The engine does not prescribe what context contains beyond the BTState accessor. Games define their own context:

```typescript
// Game-side — NOT part of engine
interface ResidentBTContext {
  entityId: EntityId;
  world: World;
  state: BTState;
  dt: number;
}
```

**Rationale:** Different games need different things in context — delta time, cached component lookups, blackboard data, shared queries. A generic context prevents the engine from becoming game-specific.

### 3e. Integration with ECS

The engine provides BT as a standalone utility. Integration is game-side:

- Game registers a `btState` component (type: `BTState`)
- Game writes a system that queries entities with `btState` and ticks their trees
- Game maps entity type to tree blueprint (e.g., all residents share `residentTree`)
- The engine's serialization handles `BTState` automatically since it's a plain component

---

## What This Does NOT Include

- **Query caching / archetypes** — Not needed at current game scale (<100 entities). Can be added later.
- **Per-entity destroy hooks** — Global callbacks with filtering are sufficient.
- **BT decorator nodes** (Inverter, Repeater, etc.) — Can be added later if games need them. Start minimal.
- **BT blackboard** — The ECS itself serves as the blackboard. Components are the shared state.
- **Parallel composite node** — Not needed for the reference game. Add when a game requires it.

---

## Files Changed (Engine)

| File | Change |
|------|--------|
| `src/world.ts` | Add `getComponents`, `onDestroy`, `offDestroy` |
| `src/entity-manager.ts` | Support destroy callback invocation |
| `src/behavior-tree.ts` | **New** — BTNode, Selector, Sequence, Action, Condition, BTState, createBehaviorTree |
| `tests/world.test.ts` | Tests for batch access and destroy hooks |
| `tests/behavior-tree.test.ts` | **New** — Full BT test suite |
| `docs/ARCHITECTURE.md` | Update with new modules |
