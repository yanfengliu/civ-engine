```markdown
# Review Summary
The civ-engine foundation demonstrates a solid understanding of strict ECS patterns, deterministic simulation, and robust AI-native APIs. The testing discipline is clearly high, and features like generic pathfinding, spatial indexing, and deterministic tick execution are implemented cleanly. However, the codebase suffers from a catastrophic performance regression introduced during the implementation of the "semantic diff" mode, alongside an accidental cubic time complexity trap in nearest-neighbor spatial queries. Resolving these performance issues and a few critical bugs in the Behavior Tree nodes and entity lifecycle will bring the engine to a highly resilient state.

# Critical

### Unbounded O(N) allocation and stringification per tick
- **File**: `src/component-store.ts:66-90`
- **Problem**: `clearDirty()` and `getDirty()` unconditionally iterate over ALL entries in the component store, calling `jsonFingerprint` (`JSON.stringify`) on every single component to save and compare baselines, entirely ignoring the `diffMode` setting.
- **Why it matters**: This turns an intended O(1) dirty-flag system into an O(N) full-state serialization every tick for *every* component store, causing massive performance degradation, tick budget exhaustion, and GC pressure at RTS scale.
- **Suggested fix**: Remove the implicit baseline loop from `clearDirty` and `getDirty`. Semantic diffing should be evaluated strictly inside `set()` when `diffMode === 'semantic'` by comparing the incoming fingerprint against a stored one. Unchanged rewrites will then cleanly bypass `dirtySet`. Do not attempt to catch silent in-place object mutations via an unconditional O(N) scan.

# High

### Accidental O(R^3) complexity in nearest-entity queries
- **File**: `src/world.ts:405-434`
- **Problem**: `findNearest` iterates `r` from `0` to `maxRadius`, calling `this.spatialGrid.getInRadius(cx, cy, r)` on each iteration. `getInRadius` performs a full bounding-box scan of `(2r+1)^2` cells every single time it is called.
- **Why it matters**: Searching for a distant nearest entity (or querying an empty grid) degenerates into an `O(R^3)` worst-case scenario, evaluating millions of cells redundantly and causing the game loop to freeze.
- **Suggested fix**: Use an expanding ring algorithm that only checks the perimeter cells exactly at distance `r` for each iteration, or simply query `getInRadius(maxRadius)` once and iterate its result array to find the minimum distance.

### Reactive BT nodes break stateful subtrees
- **File**: `src/behavior-tree.ts:111-141`
- **Problem**: When `ReactiveSelectorNode` or `ReactiveSequenceNode` changes its active child (preemption), it fails to clear the `RUNNING` state of the previously active child because these nodes do not maintain or reset state via `BTState`.
- **Why it matters**: If the reactive node later falls back to a preempted child (e.g., a Sequence), that child will incorrectly resume execution from the middle of its sequence instead of starting fresh, silently breaking agent logic.
- **Suggested fix**: Give reactive nodes access to `getState(context)` in their constructor, store their currently running child index in the `BTState`, and invoke `clearRunningState(state, this.children[prevActiveIndex])` whenever the active child changes.

### Re-entrancy infinite recursion in entity destruction
- **File**: `src/world.ts:167-187`
- **Problem**: `destroyEntity` invokes user-provided `destroyCallbacks` *before* setting the entity's `alive` state to `false` via `entityManager.destroy(id)`.
- **Why it matters**: If a destroy callback synchronously calls `world.destroyEntity(id)` on the exact same entity (e.g., via naive relationship cleanup logic), it bypasses the `isAlive` guard and triggers an infinite recursion stack overflow.
- **Suggested fix**: Immediately call `this.entityManager.destroy(id)` (which safely flags `alive[id] = false` and pushes to the free list) *before* firing the callbacks, ensuring any re-entrant calls hit the initial `isAlive` guard and return safely.

# Medium

### Components can appear simultaneously as 'set' and 'removed' in diffs
- **File**: `src/component-store.ts:37-44`
- **Problem**: When a component is removed, the entity is added to `removedSet`. If the component is subsequently added back in the same tick via `set()`, it is added to `dirtySet` but never removed from `removedSet`.
- **Why it matters**: `TickDiff` will report the entity in both the `set` and `removed` arrays. Client adapters processing removals after sets will incorrectly delete the newly added component.
- **Suggested fix**: Explicitly call `this.removedSet.delete(entityId)` inside `ComponentStore.set()`.

### Premature pathfinding abort on maxCost with inadmissible heuristics
- **File**: `src/pathfinding.ts:114-115`
- **Problem**: `findPath` aborts the entire search by returning `null` if it pops a node with `current.g > maxCost`.
- **Why it matters**: Because the engine explicitly supports inadmissible heuristics (per `docs/devlog/summary.md`), `f` is not a strict lower bound. A node with a valid path cost `g <= maxCost` might be pushed further down the heap by an inflated `h` and be popped after a node that exceeded `maxCost`. Returning `null` loses these valid paths.
- **Suggested fix**: Change `if (current.g > maxCost) return null;` to `continue;` to safely discard the expensive branch without killing the open set.

# Low / Polish

### EventBus buffer reference leak
- **File**: `src/event-bus.ts:37-42`
- **Problem**: `getEvents()` returns the internal `this.buffer` array. `clear()` truncates this exact array reference (`this.buffer.length = 0`).
- **Why it matters**: If a consumer (like a logging system or client adapter) stores the array reference returned by `getEvents()`, its contents will suddenly disappear at the start of the next engine tick.
- **Suggested fix**: `getEvents()` should return a shallow copy `[...this.buffer]` or `clear()` should assign a new array `this.buffer = []`.

# Notes & Open Questions

### Sparse Array Growth (`ComponentStore.entities()`)
- **File**: `src/component-store.ts:50-56`
- **Problem**: `ComponentStore` uses a sparse array. If 1,000,000 entities are created and destroyed, `this.data.length` remains 1,000,000. `entities()` and `entries()` generators iterate the entire length of the array even if it only contains 1 active entity. 
- **Note**: This was an explicit architecture decision (Decision 1: "Sparse arrays for component storage... sufficient for expected entity density"). However, if the engine is used in a high-churn environment with sparse component distribution, these queries will degrade from O(Size) to O(MaxEntityId). You may want to consider dense packing (like Archetypes or a dense-array/sparse-index pattern) if query performance becomes a bottleneck.
```
