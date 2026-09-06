# Pathfinding Design

**Date:** 2026-04-06
**Status:** Approved

## Overview

Add a generic A* pathfinding utility to civ-engine. The `findPath<T>` function operates on any graph topology — it has no knowledge of grids, entities, or the spatial index. Game code provides callbacks for neighbors, cost, heuristic, and node hashing. The module is standalone with no dependencies on World or SpatialGrid.

## Module

| File | Responsibility |
|---|---|
| `src/pathfinding.ts` | `findPath<T>`, `PathConfig<T>`, `PathResult<T>` |

## API

```typescript
export interface PathConfig<T> {
  start: T;
  goal: T;
  neighbors: (node: T) => T[];
  cost: (from: T, to: T) => number;
  heuristic: (node: T, goal: T) => number;
  hash: (node: T) => string | number;
  maxCost?: number;         // default: Infinity
  maxIterations?: number;   // default: 10_000
  trackExplored?: boolean;  // default: false
}

export interface PathResult<T> {
  path: T[];        // ordered nodes from start to goal (inclusive)
  cost: number;     // total path cost
  explored?: number; // only present when trackExplored is true
}

export function findPath<T>(config: PathConfig<T>): PathResult<T> | null;
```

## Behavior

- Standard A* algorithm with a binary min-heap priority queue for the open set.
- Returns `null` if the goal is unreachable, `maxCost` is exceeded, or `maxIterations` is exceeded.
- `cost` returning `Infinity` marks an edge as impassable (the target node is skipped).
- `path` includes both `start` and `goal`.
- When `start` equals `goal` (same hash), returns `{ path: [start], cost: 0 }`.
- `heuristic` must be admissible (never overestimates) for optimal paths. The engine does not enforce this — it is the caller's responsibility. An inadmissible heuristic will still produce a valid (but possibly non-optimal) path.

## Implementation Details

- **Open set:** Binary min-heap keyed on `f = g + h`. Implemented as a simple array-based heap within the module (~30 lines for push/pop). Not exported — internal implementation detail.
- **Closed set / best-cost map:** A `Map<string | number, number>` mapping node hash to best-known g-cost. When a node is popped and its g-cost is worse than the recorded best, it is skipped (lazy deletion).
- **Path reconstruction:** Parent pointers stored in a `Map<string | number, T>`. Walk from goal to start via parent chain, then reverse.
- **Early termination:** Before expanding a node, check `g > maxCost` (a node at exactly `maxCost` is still expanded — it might be the goal). Increment an iteration counter on each pop and check against `maxIterations`.
- **Explored tracking:** If `trackExplored` is true, count the number of nodes popped from the open set and include as `explored` in the result. If false, the `explored` field is omitted from the result.

No external dependencies. Zero changes to existing engine code.

## Testing

### `tests/pathfinding.test.ts`

**Core behavior:**
- Basic path: 3x3 grid helper, uniform cost 1, finds shortest path from corner to corner
- No path: disconnected graph, returns `null`
- Cost function respected: grid with a high-cost cell, pathfinder routes around it
- Impassable edge: cost returns `Infinity`, node is avoided
- maxCost: path exists but total cost exceeds limit, returns `null`
- maxIterations: large graph with low iteration cap, returns `null`
- trackExplored: returns explored count when true, omits field when false
- Heuristic guides search: Manhattan heuristic explores fewer nodes than zero heuristic
- Custom node type: uses `{x, y}` objects with a hash function, verifying generic `<T>` works
- Start equals goal: returns `{ path: [start], cost: 0 }`

**Complex scenarios:**
- Optimal path selection: diamond-shaped graph with two paths of different costs, verifies cheaper one chosen
- Large grid performance: 100x100 grid, path from (0,0) to (99,99), completes within maxIterations
- Winding maze: predefined maze where optimal path avoids dead ends, verifies correct path and cost
- Multiple equal-cost paths: grid where several paths have identical cost, verifies result cost is optimal
- One-way edges: directed graph with asymmetric neighbors, verifies correct traversal
- Inadmissible heuristic: overestimating heuristic still produces a valid path without crashing
- Diagonal movement with varying costs: 5x5 grid, 8-directional, diagonal costs sqrt(2), verifies diagonal preference
- Revisiting a node with lower cost: graph where a node is first reached via expensive route then rediscovered cheaper, verifies cheaper route wins

## Out of Scope

- SpatialGrid convenience wrapper (game code wires callbacks in a few lines)
- World integration (no new methods on World)
- Pathfinding result caching/memoization
- Flow fields or multi-target pathfinding
- Serialization of path state
