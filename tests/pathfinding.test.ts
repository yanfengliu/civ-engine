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
    // S=0, G=24, walls = {2, 5, 7, 10, 16, 17, 22}
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
});
