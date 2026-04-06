import { describe, it, expect } from 'vitest';
import { SpatialGrid, ORTHOGONAL, DIAGONAL, ALL_DIRECTIONS } from '../src/spatial-grid.js';

describe('SpatialGrid', () => {
  it('inserts and retrieves entity at position', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 5);
    const cell = grid.getAt(5, 5);
    expect(cell).not.toBeNull();
    expect(cell!.has(0)).toBe(true);
  });

  it('returns null for empty cell', () => {
    const grid = new SpatialGrid(10, 10);
    expect(grid.getAt(0, 0)).toBeNull();
  });

  it('removes entity from cell', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 5);
    grid.remove(0, 5, 5);
    const cell = grid.getAt(5, 5);
    expect(cell === null || cell.size === 0).toBe(true);
  });

  it('moves entity between cells', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 2, 3);
    grid.move(0, 2, 3, 7, 8);
    const oldCell = grid.getAt(2, 3);
    expect(oldCell === null || !oldCell.has(0)).toBe(true);
    const newCell = grid.getAt(7, 8);
    expect(newCell).not.toBeNull();
    expect(newCell!.has(0)).toBe(true);
  });

  it('supports multiple entities in same cell', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 5);
    grid.insert(1, 5, 5);
    const cell = grid.getAt(5, 5);
    expect(cell!.size).toBe(2);
    expect(cell!.has(0)).toBe(true);
    expect(cell!.has(1)).toBe(true);
  });

  it('returns 4-directional neighbors only', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 4); // up
    grid.insert(1, 5, 6); // down
    grid.insert(2, 4, 5); // left
    grid.insert(3, 6, 5); // right
    grid.insert(4, 4, 4); // diagonal — should NOT appear
    const neighbors = grid.getNeighbors(5, 5);
    expect(neighbors.sort()).toEqual([0, 1, 2, 3]);
  });

  it('returns partial neighbors at corner', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 1, 0); // right of (0,0)
    grid.insert(1, 0, 1); // below (0,0)
    const neighbors = grid.getNeighbors(0, 0);
    expect(neighbors.sort()).toEqual([0, 1]);
  });

  it('throws on out-of-bounds insert', () => {
    const grid = new SpatialGrid(10, 10);
    expect(() => grid.insert(0, -1, 0)).toThrow(RangeError);
    expect(() => grid.insert(0, 10, 0)).toThrow(RangeError);
    expect(() => grid.insert(0, 0, -1)).toThrow(RangeError);
    expect(() => grid.insert(0, 0, 10)).toThrow(RangeError);
  });

  it('throws on out-of-bounds getAt', () => {
    const grid = new SpatialGrid(10, 10);
    expect(() => grid.getAt(-1, 0)).toThrow(RangeError);
    expect(() => grid.getAt(10, 0)).toThrow(RangeError);
  });

  it('throws on out-of-bounds getNeighbors', () => {
    const grid = new SpatialGrid(10, 10);
    expect(() => grid.getNeighbors(-1, 0)).toThrow(RangeError);
    expect(() => grid.getNeighbors(10, 0)).toThrow(RangeError);
  });

  it('getNeighbors with ALL_DIRECTIONS returns 8-directional neighbors', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 4); // up
    grid.insert(1, 5, 6); // down
    grid.insert(2, 4, 5); // left
    grid.insert(3, 6, 5); // right
    grid.insert(4, 4, 4); // diagonal
    const neighbors = grid.getNeighbors(5, 5, ALL_DIRECTIONS);
    expect(neighbors.sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('getNeighbors with DIAGONAL returns only diagonal neighbors', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 5, 4); // up (orthogonal)
    grid.insert(1, 4, 4); // diagonal
    grid.insert(2, 6, 6); // diagonal
    const neighbors = grid.getNeighbors(5, 5, DIAGONAL);
    expect(neighbors.sort()).toEqual([1, 2]);
  });

  it('getNeighbors with custom offsets works', () => {
    const grid = new SpatialGrid(10, 10);
    grid.insert(0, 7, 5); // 2 cells right
    const neighbors = grid.getNeighbors(5, 5, [[2, 0]]);
    expect(neighbors).toEqual([0]);
  });

  it('ORTHOGONAL has 4 entries, DIAGONAL 4, ALL_DIRECTIONS 8', () => {
    expect(ORTHOGONAL).toHaveLength(4);
    expect(DIAGONAL).toHaveLength(4);
    expect(ALL_DIRECTIONS).toHaveLength(8);
  });
});
