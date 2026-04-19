import { describe, expect, it } from 'vitest';
import {
  OccupancyGrid,
  SubcellOccupancyGrid,
} from '../src/occupancy-grid.js';

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

describe('SubcellOccupancyGrid', () => {
  it('packs multiple entities into deterministic quarter-cell slots', () => {
    const grid = new SubcellOccupancyGrid(4, 4);

    expect(grid.occupy(4, { x: 1, y: 1 })).toEqual({
      position: { x: 1, y: 1 },
      slot: 0,
      offset: { x: 0, y: 0 },
    });
    expect(grid.occupy(5, { x: 1, y: 1 })).toEqual({
      position: { x: 1, y: 1 },
      slot: 1,
      offset: { x: 0.5, y: 0 },
    });
    expect(grid.occupy(6, { x: 1, y: 1 })).toEqual({
      position: { x: 1, y: 1 },
      slot: 2,
      offset: { x: 0, y: 0.5 },
    });
    expect(grid.occupy(7, { x: 1, y: 1 })).toEqual({
      position: { x: 1, y: 1 },
      slot: 3,
      offset: { x: 0.5, y: 0.5 },
    });

    expect(grid.canOccupy(8, { x: 1, y: 1 })).toBe(false);
    expect(grid.getSlotOccupant(1, 1, 2)).toBe(6);
  });

  it('keeps an entity in the same slot when moving between cells', () => {
    const grid = new SubcellOccupancyGrid(4, 4);

    expect(grid.occupy(5, { x: 0, y: 0 })?.slot).toBe(1);
    expect(grid.occupy(5, { x: 1, y: 0 })?.slot).toBe(1);
    expect(grid.getSlotOccupant(0, 0, 1)).toBeNull();
    expect(grid.getSlotOccupant(1, 0, 1)).toBe(5);

    grid.release(5);
    expect(grid.getOccupiedPlacement(5)).toBeNull();
    expect(grid.getSlotOccupant(1, 0, 1)).toBeNull();
  });

  it('chooses the nearest free slot to a preferred offset', () => {
    const grid = new SubcellOccupancyGrid(4, 4);

    grid.occupy(7, { x: 2, y: 2 }, { preferredSlot: 1 });
    const placement = grid.bestSlotForUnit(8, { x: 2, y: 2 }, {
      preferredOffset: { x: 0.49, y: 0.09 },
    });

    expect(placement).toEqual({
      position: { x: 2, y: 2 },
      slot: 3,
      offset: { x: 0.5, y: 0.5 },
    });
  });

  it('filters neighbor cells by base blockers and reports remaining slot capacity', () => {
    const blocked = new Set(['2,1']);
    const grid = new SubcellOccupancyGrid(4, 4, {
      isCellBlocked: (x, y) => blocked.has(`${x},${y}`),
    });

    grid.occupy(10, { x: 1, y: 0 });
    grid.occupy(11, { x: 1, y: 0 });
    grid.occupy(12, { x: 1, y: 2 });

    expect(grid.neighborsWithSpace(4, { x: 1, y: 1 })).toEqual([
      {
        position: { x: 0, y: 1 },
        freeSlots: 4,
        bestSlot: {
          position: { x: 0, y: 1 },
          slot: 0,
          offset: { x: 0, y: 0 },
        },
      },
      {
        position: { x: 1, y: 2 },
        freeSlots: 3,
        bestSlot: {
          position: { x: 1, y: 2 },
          slot: 1,
          offset: { x: 0.5, y: 0 },
        },
      },
      {
        position: { x: 1, y: 0 },
        freeSlots: 2,
        bestSlot: {
          position: { x: 1, y: 0 },
          slot: 0,
          offset: { x: 0, y: 0 },
        },
      },
    ]);
  });

  it('round-trips occupied slot assignments and version', () => {
    const grid = new SubcellOccupancyGrid(4, 4);

    grid.occupy(4, { x: 3, y: 1 });
    grid.occupy(5, { x: 3, y: 1 });

    const restored = SubcellOccupancyGrid.fromState(grid.getState());

    expect(restored.getOccupiedPlacement(4)).toEqual({
      position: { x: 3, y: 1 },
      slot: 0,
      offset: { x: 0, y: 0 },
    });
    expect(restored.getOccupiedPlacement(5)).toEqual({
      position: { x: 3, y: 1 },
      slot: 1,
      offset: { x: 0.5, y: 0 },
    });
    expect(restored.version).toBe(grid.version);
  });
});
