import { describe, expect, it } from 'vitest';
import { OccupancyGrid } from '../src/occupancy-grid.js';

describe('OccupancyGrid', () => {
  it('occupies a single cell and reports blocking', () => {
    const grid = new OccupancyGrid(8, 8);

    expect(grid.occupy(1, [{ x: 2, y: 3 }])).toBe(true);
    expect(grid.isBlocked(2, 3)).toBe(true);
    expect(grid.getOccupant(2, 3)).toBe(1);
    expect(grid.getOccupiedCells(1)).toEqual([{ x: 2, y: 3 }]);
  });

  it('supports multi-tile rectangular footprints', () => {
    const grid = new OccupancyGrid(8, 8);

    expect(grid.occupy(7, { x: 1, y: 2, width: 2, height: 3 })).toBe(true);
    expect(grid.getOccupiedCells(7)).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
    ]);
    expect(grid.isBlocked(2, 4)).toBe(true);
  });

  it('rejects overlapping occupancy', () => {
    const grid = new OccupancyGrid(8, 8);

    expect(grid.occupy(1, [{ x: 3, y: 3 }])).toBe(true);
    expect(grid.occupy(2, [{ x: 3, y: 3 }])).toBe(false);
  });

  it('tracks reservations separately and enforces conflicts deterministically', () => {
    const grid = new OccupancyGrid(8, 8);

    expect(grid.reserve(1, [{ x: 4, y: 4 }])).toBe(true);
    expect(grid.canReserve(2, [{ x: 4, y: 4 }])).toBe(false);
    expect(grid.reserve(2, [{ x: 4, y: 4 }])).toBe(false);
    expect(grid.getReservationOwner(4, 4)).toBe(1);
  });

  it('lets the same entity update its own occupancy and reservation', () => {
    const grid = new OccupancyGrid(8, 8);

    expect(grid.occupy(1, [{ x: 1, y: 1 }])).toBe(true);
    expect(grid.reserve(1, [{ x: 1, y: 1 }, { x: 2, y: 1 }])).toBe(true);
    expect(grid.canOccupy(1, [{ x: 2, y: 1 }])).toBe(true);
    expect(grid.occupy(1, [{ x: 2, y: 1 }])).toBe(true);
    expect(grid.getReservedCells(1)).toEqual([]);
    expect(grid.getOccupiedCells(1)).toEqual([{ x: 2, y: 1 }]);
  });

  it('releases occupancy and reservation together', () => {
    const grid = new OccupancyGrid(8, 8);

    grid.occupy(1, [{ x: 0, y: 0 }]);
    grid.reserve(1, [{ x: 1, y: 0 }]);
    grid.release(1);

    expect(grid.isBlocked(0, 0)).toBe(false);
    expect(grid.getOccupant(0, 0)).toBeNull();
    expect(grid.getReservationOwner(1, 0)).toBeNull();
  });

  it('blocks static cells and rejects occupying or reserving them', () => {
    const grid = new OccupancyGrid(8, 8);

    grid.block([{ x: 5, y: 5 }]);
    expect(grid.isBlocked(5, 5)).toBe(true);
    expect(grid.canOccupy(1, [{ x: 5, y: 5 }])).toBe(false);
    expect(grid.reserve(1, [{ x: 5, y: 5 }])).toBe(false);
  });

  it('rejects out-of-bounds footprints', () => {
    const grid = new OccupancyGrid(8, 8);

    expect(() => grid.occupy(1, [{ x: -1, y: 0 }])).toThrow();
    expect(() =>
      grid.reserve(1, { x: 7, y: 7, width: 2, height: 1 }),
    ).toThrow();
  });

  it('does not allow blocking occupied or reserved cells', () => {
    const grid = new OccupancyGrid(8, 8);

    grid.occupy(1, [{ x: 2, y: 2 }]);
    expect(() => grid.block([{ x: 2, y: 2 }])).toThrow(
      'Cannot block occupied or reserved cell (2, 2)',
    );
  });

  it('round-trips state including blocked cells, occupancy, reservations, and version', () => {
    const grid = new OccupancyGrid(8, 8);

    grid.block([{ x: 0, y: 1 }]);
    grid.occupy(1, { x: 3, y: 3, width: 2, height: 2 });
    grid.reserve(2, [{ x: 6, y: 6 }]);

    const restored = OccupancyGrid.fromState(grid.getState());

    expect(restored.getOccupant(3, 3)).toBe(1);
    expect(restored.getOccupant(4, 4)).toBe(1);
    expect(restored.getReservationOwner(6, 6)).toBe(2);
    expect(restored.isBlocked(0, 1)).toBe(true);
    expect(restored.version).toBe(grid.version);
  });
});
