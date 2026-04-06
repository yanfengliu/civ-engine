# Pathfinding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic A* pathfinding function that works on any graph topology with user-defined cost, neighbors, heuristic, and hash callbacks.

**Architecture:** A single standalone module (`src/pathfinding.ts`) with no dependencies on World or SpatialGrid. Implements A* with an internal binary min-heap. Returns path + cost, with optional explored count. Supports early termination via maxCost and maxIterations.

**Tech Stack:** TypeScript 5.7+ (strict mode, ESM, Node16 resolution), Vitest 3

**Spec:** `docs/superpowers/specs/2026-04-06-pathfinding-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pathfinding.ts` | Create | `findPath<T>`, `PathConfig<T>`, `PathResult<T>`, internal min-heap |
| `tests/pathfinding.test.ts` | Create | All pathfinding tests (core + complex scenarios) |
| `docs/ARCHITECTURE.md` | Modify | Add pathfinding to component map, boundaries, drift log |
| `docs/ROADMAP.md` | Modify | Move "Pathfinding" to Built |

---

## Task 1: Core A* — types, implementation, and basic tests

**Files:**
- Create: `src/pathfinding.ts`
- Create: `tests/pathfinding.test.ts`

- [ ] **Step 1: Write failing tests for core behavior**

Create `tests/pathfinding.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { findPath } from '../src/pathfinding.js';
import type { PathConfig } from '../src/pathfinding.js';

// Helper: create a grid-based config for number nodes (flat index y*w+x)
function gridConfig(
  width: number,
  height: number,
  blocked: Set<number> = new Set(),
): PathConfig<number> {
  return {
    start: 0,
    goal: width * height - 1,
    neighbors: (node) => {
      const x = node % width;
      const y = Math.floor(node / width);
      const result: number[] = [];
      if (x > 0) result.push(node - 1);
      if (x < width - 1) result.push(node + 1);
      if (y > 0) result.push(node - width);
      if (y < height - 1) result.push(node + width);
      return result;
    },
    cost: (_from, to) => (blocked.has(to) ? Infinity : 1),
    heuristic: (node, goal) => {
      const nx = node % width;
      const ny = Math.floor(node / width);
      const gx = goal % width;
      const gy = Math.floor(goal / width);
      return Math.abs(nx - gx) + Math.abs(ny - gy);
    },
    hash: (node) => node,
  };
}

describe('findPath', () => {
  it('finds shortest path on a 3x3 grid', () => {
    const config = gridConfig(3, 3);
    const result = findPath(config);
    expect(result).not.toBeNull();
    expect(result!.path[0]).toBe(0);
    expect(result!.path[result!.path.length - 1]).toBe(8);
    expect(result!.cost).toBe(4);
  });

  it('returns null for disconnected graph', () => {
    const result = findPath<number>({
      start: 0,
      goal: 1,
      neighbors: () => [],
      cost: () => 1,
      heuristic: () => 0,
      hash: (n) => n,
    });
    expect(result).toBeNull();
  });

  it('routes around high-cost cells', () => {
    // 3x3 grid, center (4) is blocked
    const config = gridConfig(3, 3, new Set([4]));
    const result = findPath(config);
    expect(result).not.toBeNull();
    expect(result!.path).not.toContain(4);
    expect(result!.cost).toBe(4);
  });

  it('avoids impassable edges (cost = Infinity)', () => {
    // Linear graph: 0 - 1 - 2, but 0->1 is impassable
    const result = findPath<number>({
      start: 0,
      goal: 2,
      neighbors: (n) => {
        if (n === 0) return [1];
        if (n === 1) return [0, 2];
        return [1];
      },
      cost: (from, to) => (from === 0 && to === 1 ? Infinity : 1),
      heuristic: () => 0,
      hash: (n) => n,
    });
    expect(result).toBeNull();
  });

  it('respects maxCost', () => {
    const config = { ...gridConfig(5, 5), maxCost: 3 };
    const result = findPath(config);
    expect(result).toBeNull();
  });

  it('respects maxIterations', () => {
    const config = { ...gridConfig(100, 100), maxIterations: 5 };
    const result = findPath(config);
    expect(result).toBeNull();
  });

  it('returns explored count when trackExplored is true', () => {
    const config = { ...gridConfig(3, 3), trackExplored: true };
    const result = findPath(config);
    expect(result).not.toBeNull();
    expect(result!.explored).toBeDefined();
    expect(result!.explored).toBeGreaterThan(0);
  });

  it('omits explored when trackExplored is false or unset', () => {
    const config = gridConfig(3, 3);
    const result = findPath(config);
    expect(result).not.toBeNull();
    expect(result!.explored).toBeUndefined();
  });

  it('heuristic guides search — fewer explored with Manhattan than zero', () => {
    const base = gridConfig(10, 10);
    const withHeuristic = { ...base, trackExplored: true };
    const withZero = {
      ...base,
      heuristic: () => 0,
      trackExplored: true,
    };
    const r1 = findPath(withHeuristic)!;
    const r2 = findPath(withZero)!;
    expect(r1.cost).toBe(r2.cost);
    expect(r1.explored!).toBeLessThan(r2.explored!);
  });

  it('works with custom node types (objects)', () => {
    type Pos = { x: number; y: number };
    const result = findPath<Pos>({
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 0 },
      neighbors: (p) => {
        const result: Pos[] = [];
        if (p.x > 0) result.push({ x: p.x - 1, y: p.y });
        if (p.x < 2) result.push({ x: p.x + 1, y: p.y });
        return result;
      },
      cost: () => 1,
      heuristic: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
      hash: (p) => `${p.x},${p.y}`,
    });
    expect(result).not.toBeNull();
    expect(result!.path).toHaveLength(3);
    expect(result!.cost).toBe(2);
  });

  it('returns path with cost 0 when start equals goal', () => {
    const result = findPath<number>({
      start: 5,
      goal: 5,
      neighbors: () => [],
      cost: () => 1,
      heuristic: () => 0,
      hash: (n) => n,
    });
    expect(result).not.toBeNull();
    expect(result!.path).toEqual([5]);
    expect(result!.cost).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/pathfinding.test.ts`
Expected: FAIL — module `../src/pathfinding.js` does not exist

- [ ] **Step 3: Implement findPath with internal min-heap**

Create `src/pathfinding.ts`:

```typescript
export interface PathConfig<T> {
  start: T;
  goal: T;
  neighbors: (node: T) => T[];
  cost: (from: T, to: T) => number;
  heuristic: (node: T, goal: T) => number;
  hash: (node: T) => string | number;
  maxCost?: number;
  maxIterations?: number;
  trackExplored?: boolean;
}

export interface PathResult<T> {
  path: T[];
  cost: number;
  explored?: number;
}

interface HeapEntry<T> {
  node: T;
  f: number;
  g: number;
}

function heapPush<T>(heap: HeapEntry<T>[], entry: HeapEntry<T>): void {
  heap.push(entry);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].f <= heap[i].f) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}

function heapPop<T>(heap: HeapEntry<T>[]): HeapEntry<T> {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < heap.length && heap[left].f < heap[smallest].f) {
        smallest = left;
      }
      if (right < heap.length && heap[right].f < heap[smallest].f) {
        smallest = right;
      }
      if (smallest === i) break;
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
  }
  return top;
}

function reconstructPath<T>(
  cameFrom: Map<string | number, T>,
  hash: (node: T) => string | number,
  current: T,
): T[] {
  const path: T[] = [current];
  let key = hash(current);
  while (cameFrom.has(key)) {
    current = cameFrom.get(key)!;
    key = hash(current);
    path.push(current);
  }
  path.reverse();
  return path;
}

export function findPath<T>(config: PathConfig<T>): PathResult<T> | null {
  const {
    start,
    goal,
    neighbors,
    cost,
    heuristic,
    hash,
    maxCost = Infinity,
    maxIterations = 10_000,
    trackExplored = false,
  } = config;

  const startHash = hash(start);
  const goalHash = hash(goal);

  if (startHash === goalHash) {
    const result: PathResult<T> = { path: [start], cost: 0 };
    if (trackExplored) result.explored = 0;
    return result;
  }

  const open: HeapEntry<T>[] = [];
  const bestG = new Map<string | number, number>();
  const cameFrom = new Map<string | number, T>();

  bestG.set(startHash, 0);
  heapPush(open, { node: start, f: heuristic(start, goal), g: 0 });

  let iterations = 0;
  let explored = 0;

  while (open.length > 0) {
    if (iterations >= maxIterations) return null;
    iterations++;

    const current = heapPop(open);
    const currentHash = hash(current.node);

    const recorded = bestG.get(currentHash);
    if (recorded !== undefined && current.g > recorded) continue;

    explored++;

    if (current.g > maxCost) return null;

    if (currentHash === goalHash) {
      const path = reconstructPath(cameFrom, hash, current.node);
      const result: PathResult<T> = { path, cost: current.g };
      if (trackExplored) result.explored = explored;
      return result;
    }

    for (const neighbor of neighbors(current.node)) {
      const edgeCost = cost(current.node, neighbor);
      if (!isFinite(edgeCost)) continue;

      const newG = current.g + edgeCost;
      const neighborHash = hash(neighbor);
      const prevG = bestG.get(neighborHash);

      if (prevG === undefined || newG < prevG) {
        bestG.set(neighborHash, newG);
        cameFrom.set(neighborHash, current.node);
        const f = newG + heuristic(neighbor, goal);
        heapPush(open, { node: neighbor, f, g: newG });
      }
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/pathfinding.test.ts`
Expected: all 10 tests PASS

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/pathfinding.ts tests/pathfinding.test.ts`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 6: Commit**

```
git add src/pathfinding.ts tests/pathfinding.test.ts
git commit -m "feat: add generic A* pathfinding (findPath)"
```

---

## Task 2: Complex scenario tests

**Files:**
- Modify: `tests/pathfinding.test.ts`

- [ ] **Step 1: Add complex scenario tests**

Append to `tests/pathfinding.test.ts` inside the existing `describe('findPath', ...)` block:

```typescript
  it('chooses cheaper path in diamond graph', () => {
    // Graph: 0 --(1)--> 1 --(1)--> 3
    //        0 --(5)--> 2 --(1)--> 3
    // Cheap path: 0 -> 1 -> 3 (cost 2)
    // Expensive path: 0 -> 2 -> 3 (cost 6)
    const result = findPath<number>({
      start: 0,
      goal: 3,
      neighbors: (n) => {
        if (n === 0) return [1, 2];
        if (n === 1) return [3];
        if (n === 2) return [3];
        return [];
      },
      cost: (from, to) => {
        if (from === 0 && to === 2) return 5;
        return 1;
      },
      heuristic: () => 0,
      hash: (n) => n,
    });
    expect(result).not.toBeNull();
    expect(result!.path).toEqual([0, 1, 3]);
    expect(result!.cost).toBe(2);
  });

  it('handles large grid (100x100)', () => {
    const config = { ...gridConfig(100, 100), maxIterations: 50_000 };
    const result = findPath(config);
    expect(result).not.toBeNull();
    expect(result!.path[0]).toBe(0);
    expect(result!.path[result!.path.length - 1]).toBe(9999);
    expect(result!.cost).toBe(198); // Manhattan distance on 100x100
  });

  it('navigates a winding maze', () => {
    // 5x5 grid maze:
    // S . # . .
    // # . # . .
    // # . . . #
    // . # # . .
    // . . . . G
    // S=0, G=24, walls = {2, 5, 7, 10, 24-no, 16, 17, 22-no}
    const walls = new Set([2, 5, 7, 10, 16, 17, 22]);
    const config = { ...gridConfig(5, 5, walls) };
    const result = findPath(config);
    expect(result).not.toBeNull();
    expect(result!.path[0]).toBe(0);
    expect(result!.path[result!.path.length - 1]).toBe(24);
    // Path must avoid all walls
    for (const node of result!.path) {
      expect(walls.has(node)).toBe(false);
    }
    // Verify cost equals path length - 1 (uniform cost 1)
    expect(result!.cost).toBe(result!.path.length - 1);
  });

  it('finds optimal cost when multiple equal-cost paths exist', () => {
    // 3x3 grid, no walls — multiple shortest paths of cost 4
    const config = gridConfig(3, 3);
    const result = findPath(config);
    expect(result).not.toBeNull();
    expect(result!.cost).toBe(4);
    expect(result!.path).toHaveLength(5);
  });

  it('handles one-way (directed) edges', () => {
    // 0 -> 1 -> 2 (one-way only)
    const result = findPath<number>({
      start: 0,
      goal: 2,
      neighbors: (n) => {
        if (n === 0) return [1];
        if (n === 1) return [2];
        return [];
      },
      cost: () => 1,
      heuristic: () => 0,
      hash: (n) => n,
    });
    expect(result).not.toBeNull();
    expect(result!.path).toEqual([0, 1, 2]);

    // Reverse direction should fail
    const reverse = findPath<number>({
      start: 2,
      goal: 0,
      neighbors: (n) => {
        if (n === 0) return [1];
        if (n === 1) return [2];
        return [];
      },
      cost: () => 1,
      heuristic: () => 0,
      hash: (n) => n,
    });
    expect(reverse).toBeNull();
  });

  it('handles inadmissible heuristic without crashing', () => {
    const config = {
      ...gridConfig(5, 5),
      heuristic: (node: number, goal: number) => {
        const nx = node % 5;
        const ny = Math.floor(node / 5);
        const gx = goal % 5;
        const gy = Math.floor(goal / 5);
        return (Math.abs(nx - gx) + Math.abs(ny - gy)) * 10; // overestimates 10x
      },
    };
    const result = findPath(config);
    expect(result).not.toBeNull();
    expect(result!.path[0]).toBe(0);
    expect(result!.path[result!.path.length - 1]).toBe(24);
    // Path may not be optimal, but must be valid
    expect(result!.cost).toBeGreaterThanOrEqual(8);
  });

  it('handles diagonal movement with varying costs', () => {
    // 5x5 grid with 8-directional movement
    // Cardinal moves cost 1, diagonal moves cost sqrt(2)
    const width = 5;
    const height = 5;
    const result = findPath<number>({
      start: 0,
      goal: 24,
      neighbors: (node) => {
        const x = node % width;
        const y = Math.floor(node / width);
        const result: number[] = [];
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              result.push(ny * width + nx);
            }
          }
        }
        return result;
      },
      cost: (from, to) => {
        const fx = from % width;
        const fy = Math.floor(from / width);
        const tx = to % width;
        const ty = Math.floor(to / width);
        const dx = Math.abs(fx - tx);
        const dy = Math.abs(fy - ty);
        return dx + dy === 2 ? Math.SQRT2 : 1;
      },
      heuristic: (node, goal) => {
        const nx = node % width;
        const ny = Math.floor(node / width);
        const gx = goal % width;
        const gy = Math.floor(goal / width);
        const dx = Math.abs(nx - gx);
        const dy = Math.abs(ny - gy);
        return Math.min(dx, dy) * Math.SQRT2 + Math.abs(dx - dy);
      },
      hash: (n) => n,
    });
    expect(result).not.toBeNull();
    // Diagonal path from (0,0) to (4,4): 4 diagonal moves = 4*sqrt(2)
    expect(result!.cost).toBeCloseTo(4 * Math.SQRT2, 5);
    expect(result!.path).toHaveLength(5); // 5 nodes for 4 moves
  });

  it('revisits a node when a cheaper route is found', () => {
    // Graph where node 2 is first reached expensively, then cheaply:
    // 0 --(10)--> 2 --(1)--> 3
    // 0 --(1)-->  1 --(1)--> 2
    // Cheap: 0->1->2->3 (cost 3)
    // Expensive first discovery of 2: 0->2 (cost 10)
    const result = findPath<number>({
      start: 0,
      goal: 3,
      neighbors: (n) => {
        if (n === 0) return [1, 2];
        if (n === 1) return [2];
        if (n === 2) return [3];
        return [];
      },
      cost: (from, to) => {
        if (from === 0 && to === 2) return 10;
        return 1;
      },
      heuristic: () => 0,
      hash: (n) => n,
    });
    expect(result).not.toBeNull();
    expect(result!.path).toEqual([0, 1, 2, 3]);
    expect(result!.cost).toBe(3);
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/pathfinding.test.ts`
Expected: all 18 tests PASS

- [ ] **Step 3: Run lint and typecheck**

Run: `npx eslint tests/pathfinding.test.ts`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 4: Commit**

```
git add tests/pathfinding.test.ts
git commit -m "test: add complex pathfinding scenario tests"
```

---

## Task 3: Full test suite pass + docs update

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (164 existing + 18 new = 182 total)

- [ ] **Step 2: Run lint and typecheck on entire project**

Run: `npx eslint .`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Update ARCHITECTURE.md**

Add to the Component Map table:

```markdown
| Pathfinding    | `src/pathfinding.ts`     | Generic A* pathfinding, graph-agnostic with user-defined callbacks          |
```

Add to the Boundaries section:

```markdown
- **Pathfinding** is a standalone utility. It has no knowledge of the spatial grid, entities, or the tick loop. Game code provides `neighbors`, `cost`, `heuristic`, and `hash` callbacks to wire it to any graph topology.
```

Add to the Drift Log:

```markdown
| 2026-04-06 | Added generic A* pathfinding        | Standalone graph-agnostic pathfinding with configurable callbacks and early termination |
```

- [ ] **Step 4: Update ROADMAP.md**

Move "Pathfinding" from "Planned — Engine Primitives" to the "Built" table:

```markdown
| Pathfinding              | `pathfinding.ts`         | 2026-04-06 | Generic A*, graph-agnostic, user-defined cost/neighbors/heuristic/hash    |
```

Remove the row from "Planned — Engine Primitives".

- [ ] **Step 5: Commit**

```
git add docs/ARCHITECTURE.md docs/ROADMAP.md
git commit -m "docs: update architecture and roadmap for pathfinding"
```
