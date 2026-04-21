import { describe, expect, it } from 'vitest';
import {
  OccupancyBinding,
  OccupancyGrid,
  SubcellOccupancyGrid,
} from '../src/occupancy-grid.js';
import { findGridPath } from '../src/path-service.js';
import { World } from '../src/world.js';

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

  it('reports scan metrics for blocking and footprint checks', () => {
    const grid = new OccupancyGrid(8, 8);

    grid.block([{ x: 2, y: 2 }, { x: 3, y: 2 }]);
    grid.canOccupy(10, { x: 0, y: 0, width: 2, height: 1 });
    grid.isBlocked(2, 2);

    expect(grid.getMetrics()).toEqual({
      blockedQueries: 1,
      blockedCellChecks: 1,
      claimQueries: 1,
      claimCellChecks: 2,
      areaNormalizations: 2,
      normalizedCellCount: 4,
      stateSnapshots: 0,
    });
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

  it('reports slot and neighbor metrics', () => {
    const blocked = new Set(['0,1']);
    const grid = new SubcellOccupancyGrid(4, 4, {
      isCellBlocked: (x, y) => blocked.has(`${x},${y}`),
    });

    grid.occupy(4, { x: 1, y: 1 });
    grid.bestSlotForUnit(5, { x: 1, y: 1 });
    grid.neighborsWithSpace(6, { x: 1, y: 1 });

    expect(grid.getMetrics()).toEqual({
      placementQueries: 6,
      blockedQueries: 6,
      blockedCellChecks: 6,
      slotChecks: 5,
      neighborQueries: 1,
      neighborCellChecks: 4,
      freeSlotQueries: 3,
      freeSlotChecks: 12,
      stateSnapshots: 0,
    });
  });
});

describe('OccupancyBinding', () => {
  it('tracks blocker metadata across blocked cells, occupied footprints, reservations, and subcell crowding', () => {
    const binding = new OccupancyBinding(8, 8);

    binding.block([{ x: 0, y: 0 }], { metadata: { kind: 'terrain' } });
    expect(
      binding.occupy(1, { x: 2, y: 2, width: 2, height: 2 }, {
        metadata: { kind: 'building' },
      }),
    ).toBe(true);
    expect(
      binding.reserve(2, [{ x: 5, y: 5 }], {
        metadata: { kind: 'resource' },
      }),
    ).toBe(true);
    expect(
      binding.occupySubcell(3, { x: 6, y: 1 }, {
        metadata: { kind: 'unit' },
      }),
    ).toEqual({
      position: { x: 6, y: 1 },
      slot: 3,
      offset: { x: 0.5, y: 0.5 },
    });

    expect(binding.getCellStatus(0, 0)).toEqual({
      position: { x: 0, y: 0 },
      blocked: true,
      blockedBy: [{ entity: null, kind: 'terrain', claim: 'blocked' }],
      crowdedBy: [],
      freeSubcellSlots: 4,
    });
    expect(binding.getCellStatus(3, 2).blockedBy).toEqual([
      { entity: 1, kind: 'building', claim: 'occupied' },
    ]);
    expect(binding.getCellStatus(5, 5).blockedBy).toEqual([
      { entity: 2, kind: 'resource', claim: 'reserved' },
    ]);
    expect(binding.getCellStatus(6, 1)).toEqual({
      position: { x: 6, y: 1 },
      blocked: false,
      blockedBy: [],
      crowdedBy: [
        {
          entity: 3,
          kind: 'unit',
          claim: 'subcell',
          slot: 3,
          offset: { x: 0.5, y: 0.5 },
        },
      ],
      freeSubcellSlots: 3,
    });
  });

  it('rejects whole-cell claims and reservations that would overlap crowded units', () => {
    const binding = new OccupancyBinding(4, 4);

    expect(
      binding.occupySubcell(3, { x: 1, y: 1 }, {
        metadata: { kind: 'unit' },
      }),
    ).toEqual({
      position: { x: 1, y: 1 },
      slot: 3,
      offset: { x: 0.5, y: 0.5 },
    });

    expect(
      binding.occupy(8, [{ x: 1, y: 1 }], {
        metadata: { kind: 'building' },
      }),
    ).toBe(false);
    expect(
      binding.reserve(9, [{ x: 1, y: 1 }], {
        metadata: { kind: 'resource' },
      }),
    ).toBe(false);
    expect(() =>
      binding.block([{ x: 1, y: 1 }], {
        metadata: { kind: 'terrain' },
      }),
    ).toThrow('Cannot block cells that still contain crowded occupants');

    expect(binding.getCellStatus(1, 1)).toEqual({
      position: { x: 1, y: 1 },
      blocked: false,
      blockedBy: [],
      crowdedBy: [
        {
          entity: 3,
          kind: 'unit',
          claim: 'subcell',
          slot: 3,
          offset: { x: 0.5, y: 0.5 },
        },
      ],
      freeSubcellSlots: 3,
    });
  });

  it('treats fully crowded cells as blocked for passability queries', () => {
    const binding = new OccupancyBinding(4, 4);

    expect(binding.occupySubcell(4, { x: 1, y: 1 })).not.toBeNull();
    expect(binding.occupySubcell(5, { x: 1, y: 1 })).not.toBeNull();
    expect(binding.occupySubcell(6, { x: 1, y: 1 })).not.toBeNull();
    expect(binding.occupySubcell(7, { x: 1, y: 1 })).not.toBeNull();

    expect(binding.isBlocked(1, 1)).toBe(true);
    expect(binding.isBlocked(1, 1, { ignoreEntity: 4 })).toBe(false);
    expect(binding.getCellStatus(1, 1)).toEqual({
      position: { x: 1, y: 1 },
      blocked: true,
      blockedBy: [],
      crowdedBy: [
        {
          entity: 4,
          kind: 'subcell',
          claim: 'subcell',
          slot: 0,
          offset: { x: 0, y: 0 },
        },
        {
          entity: 5,
          kind: 'subcell',
          claim: 'subcell',
          slot: 1,
          offset: { x: 0.5, y: 0 },
        },
        {
          entity: 6,
          kind: 'subcell',
          claim: 'subcell',
          slot: 2,
          offset: { x: 0, y: 0.5 },
        },
        {
          entity: 7,
          kind: 'subcell',
          claim: 'subcell',
          slot: 3,
          offset: { x: 0.5, y: 0.5 },
        },
      ],
      freeSubcellSlots: 0,
    });

    const result = findGridPath({
      occupancy: binding,
      start: { x: 0, y: 1 },
      goal: { x: 2, y: 1 },
      movingEntity: 8,
    });

    expect(result).not.toBeNull();
    expect(result!.path).not.toContainEqual({ x: 1, y: 1 });
  });

  it('releases tracked claims when the bound world destroys an entity', () => {
    const world = new World({ gridWidth: 8, gridHeight: 8, tps: 60 });
    const binding = new OccupancyBinding(8, 8, { world });
    const unit = world.createEntity();

    expect(
      binding.occupy(unit, [{ x: 3, y: 3 }], {
        metadata: { kind: 'unit' },
      }),
    ).toBe(true);
    expect(binding.isBlocked(3, 3)).toBe(true);

    world.destroyEntity(unit);

    expect(binding.isBlocked(3, 3)).toBe(false);
    expect(binding.getCellStatus(3, 3).blockedBy).toEqual([]);
  });

  it('can be used directly anywhere a passability grid is expected', () => {
    const binding = new OccupancyBinding(4, 4);

    binding.block([{ x: 1, y: 0 }], { metadata: { kind: 'terrain' } });

    const result = findGridPath({
      occupancy: binding,
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 0 },
    });

    expect(result).not.toBeNull();
    expect(result!.path).not.toContainEqual({ x: 1, y: 0 });
  });

  it('reports aggregate metadata-query and occupancy metrics', () => {
    const binding = new OccupancyBinding(4, 4);

    binding.block([{ x: 1, y: 1 }], { metadata: { kind: 'terrain' } });
    binding.getCellStatus(1, 1);

    expect(binding.getMetrics()).toEqual({
      version: 1,
      cellStatusQueries: 1,
      crowdedSlotChecks: 4,
      occupancy: {
        blockedQueries: 0,
        blockedCellChecks: 0,
        claimQueries: 0,
        claimCellChecks: 0,
        areaNormalizations: 1,
        normalizedCellCount: 1,
        stateSnapshots: 0,
      },
      crowding: {
        placementQueries: 0,
        blockedQueries: 0,
        blockedCellChecks: 0,
        slotChecks: 0,
        neighborQueries: 0,
        neighborCellChecks: 0,
        freeSlotQueries: 0,
        freeSlotChecks: 0,
        stateSnapshots: 0,
      },
    });
  });
});
