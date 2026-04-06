import { describe, it, expect } from 'vitest';
import { createCellGrid, stepCellGrid } from '../src/cellular.js';
import type { CellRule } from '../src/cellular.js';

describe('createCellGrid', () => {
  it('creates grid with correct dimensions', () => {
    const grid = createCellGrid(4, 3, () => 0);
    expect(grid.width).toBe(4);
    expect(grid.height).toBe(3);
    expect(grid.cells).toHaveLength(12);
  });

  it('calls fill with correct coordinates', () => {
    const coords: [number, number][] = [];
    createCellGrid(3, 2, (x, y) => {
      coords.push([x, y]);
      return 0;
    });
    expect(coords).toEqual([
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
    ]);
  });

  it('stores fill values at correct indices', () => {
    const grid = createCellGrid(3, 2, (x, y) => x + y * 10);
    expect(grid.cells).toEqual([0, 1, 2, 10, 11, 12]);
  });
});

describe('stepCellGrid', () => {
  it('produces a new grid (immutability)', () => {
    const grid = createCellGrid(3, 3, () => 0);
    const next = stepCellGrid(grid, (current) => current);
    expect(next).not.toBe(grid);
    expect(next.cells).not.toBe(grid.cells);
    expect(next.width).toBe(3);
    expect(next.height).toBe(3);
  });

  it('corner cell receives 3 neighbors', () => {
    let neighborCount = -1;
    const grid = createCellGrid(3, 3, () => 1);
    stepCellGrid(grid, (current, neighbors) => {
      if (neighborCount === -1) neighborCount = neighbors.length;
      return current;
    });
    // (0,0) is processed first and has 3 neighbors: (1,0), (0,1), (1,1)
    expect(neighborCount).toBe(3);
  });

  it('edge cell receives 5 neighbors', () => {
    const counts: number[] = [];
    const grid = createCellGrid(3, 3, () => 1);
    stepCellGrid(grid, (current, neighbors) => {
      counts.push(neighbors.length);
      return current;
    });
    // (1,0) is an edge cell — index 1 — should have 5 neighbors
    expect(counts[1]).toBe(5);
  });

  it('center cell receives 8 neighbors', () => {
    const counts: number[] = [];
    const grid = createCellGrid(3, 3, () => 1);
    stepCellGrid(grid, (current, neighbors) => {
      counts.push(neighbors.length);
      return current;
    });
    // (1,1) is the center cell — index 4 — should have 8 neighbors
    expect(counts[4]).toBe(8);
  });

  it('known rule produces expected output', () => {
    // 3x3 grid, center is 1, rest is 0
    const grid = createCellGrid(3, 3, (x, y) => (x === 1 && y === 1 ? 1 : 0));
    // Rule: become 1 if any neighbor is 1, else stay 0
    const rule: CellRule = (_current, neighbors) =>
      neighbors.some((n) => n === 1) ? 1 : 0;
    const next = stepCellGrid(grid, rule);
    // All 8 neighbors of center should become 1; center has 0 neighbors that are 1?
    // Center (1,1) neighbors: all 0. So center becomes 0 under this rule.
    // All 8 cells adjacent to (1,1) have at least one neighbor (the center) that is 1, so they become 1.
    expect(next.cells).toEqual([
      1, 1, 1,
      1, 0, 1,
      1, 1, 1,
    ]);
  });
});
