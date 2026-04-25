# Review Summary
The team made excellent progress addressing the core stability and determinism risks flagged in iteration 1. The transition to fail-fast semantics for tick aborts, the robust closure of re-entrancy hazards, and the introduction of strict validation across serialization boundaries significantly harden the engine. However, two of the most critical performance fixes (C1 and H3) were implemented in ways that completely bypassed their intended optimizations, leaving the engine vulnerable to O(N) and O(R³) traps on the hot path. A few new minor issues were also identified in the newly added resource processing and path queue paths.

# Iter-1 Regressions

### C1: `ComponentStore` still runs `JSON.stringify` on the hot path in strict mode
- **Iter-1 ID**: C1
- **File**: `src/component-store.ts:20` and `src/component-store.ts:80-100`
- **Problem**: The fix added a `detectInPlaceMutations` flag but defaulted it to `true`. This means `getDirty()` still iterates every single entry in the store and runs `jsonFingerprint` by default, even in `'strict'` mode. 
- **Why it matters**: This defeats the entire purpose of the C1 fix. Strict mode users still pay the massive O(N) serialization cost per component per tick by default.
- **Suggested fix**: Default `detectInPlaceMutations` to `false`, aligning with the "strict is fast" mental model, or only iterate when `detectInPlaceMutations` was explicitly enabled by the caller.

### H3: `findNearest` is still computationally O(R³)
- **Iter-1 ID**: H3
- **File**: `src/world.ts:499-529`
- **Problem**: While the fix correctly added a `seen` Set to prevent processing the same entity multiple times, the outer loop still calls `this.spatialGrid.getInRadius(cx, cy, r)` for every `r` from 0 to `maxRadius`. `getInRadius` iterates over the entire `(2r+1)²` bounding box of cells every time it is called.
- **Why it matters**: The number of cells scanned is `Σ(2r+1)²`, which remains an O(R³) iteration cost on the AI hot path.
- **Suggested fix**: Implement `getInShell(cx, cy, r)` on `SpatialGrid` that only iterates the perimeter cells of the radius `r`, or call `getInRadius(cx, cy, maxRadius)` exactly once outside the loop and sort the results.

### M1: `world.grid` remains mutable at runtime
- **Iter-1 ID**: M1
- **File**: `src/world.ts:281`
- **Problem**: The fix correctly secured `getEvents`, `getByTag`, etc., by returning copies, but left `world.grid` as a direct reference to the internal `SpatialGrid` instance (`this.grid = this.spatialGrid;`). It is only "read-only" via TypeScript types.
- **Why it matters**: A renderer adapter or AI agent can still bypass the type system (`(world.grid as any).insert(...)`) and corrupt the spatial index.
- **Suggested fix**: Wrap the spatial grid in a lightweight proxy or object that only delegates the read methods: `this.grid = { width: this.spatialGrid.width, height: this.spatialGrid.height, getAt: (x, y) => this.spatialGrid.getAt(x, y), getNeighbors: ... }`.

# Critical
None observed.

# High
None observed.

# Medium

### Resource transfer processing order causes silent starvation
- **File**: `src/resource-store.ts:285-300`
- **Problem**: In `processTick`, resource transfers are evaluated in a single sequential loop in the exact order they were created. If multiple transfers withdraw from the same entity's pool, and the pool lacks sufficient resources to fulfill all of them, the oldest transfers will greedily drain the pool.
- **Why it matters**: AI agents setting up complex resource logistics (e.g., distributing power or minerals to multiple buildings) will see deterministic but opaque starvation, where some buildings receive 100% and others receive 0%, purely based on the invisible order the transfers were registered.
- **Suggested fix**: Implement a proportional distribution pass for transfers pulling from the same source when demand exceeds supply, or explicitly document the FIFO priority so AI agents know they must manage transfer allocations manually.

# Low / Polish

### Unnecessary double-cloning on path cache miss
- **File**: `src/path-service.ts:133-144`
- **Problem**: When a path request is not cached, `this.options.resolve(current.request)` returns a newly instantiated path object. The code then calls `this.clone(resolved)` twice: once to store it in the cache, and again to push it to the `completed` array.
- **Why it matters**: Path arrays can be large. This causes 3x the required object allocation (the original, plus two clones) per cache miss, generating unnecessary garbage.
- **Suggested fix**: Clone only once for the cache, and yield the original `resolved` object directly to the `completed` array:
  ```typescript
  if (key !== undefined) {
    this.cache.set(key, version, this.clone(resolved));
  }
  completed.push({ ..., result: resolved, fromCache: false });
  ```

# Notes & Open Questions
- **M10 follow-up:** The `OccupancyBinding.crowding` static block behavior (M10) was left unchanged. Since `block()` does not accept an entity parameter, static blocks are correctly treated as "true terrain" and ignoring entities shouldn't bypass them. This effectively resolves the ambiguity from iter-1.
