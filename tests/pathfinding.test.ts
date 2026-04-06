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
