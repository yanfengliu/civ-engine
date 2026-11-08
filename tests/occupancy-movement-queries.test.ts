import { afterEach, describe, expect, it, vi } from 'vitest';
import { OccupancyBinding, OccupancyGrid } from '../src/occupancy-grid.js';

afterEach(() => vi.restoreAllMocks());

describe('OccupancyBinding bounded movement queries', () => {
  it('keeps the default raw query path without identity lookups or status/state construction', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, [{ x: 1, y: 1 }]);
    const occupant = vi.spyOn(OccupancyGrid.prototype, 'getOccupant');
    const reservation = vi.spyOn(OccupancyGrid.prototype, 'getReservationOwner');
    const state = vi.spyOn(OccupancyGrid.prototype, 'getState');
    const status = vi.spyOn(binding, 'getCellStatus');
    binding.resetMetrics();
    expect(binding.isBlocked(1, 1)).toBe(true);
    expect(binding.isBlocked(0, 0)).toBe(false);
    expect(binding.canOccupySubcell(1, { x: 0, y: 0 })).toBe(true);
    expect(binding.bestSubcellPlacement(1, { x: 1, y: 1 })).toBeNull();
    expect(occupant).not.toHaveBeenCalled();
    expect(reservation).not.toHaveBeenCalled();
    expect(state).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(binding.getMetrics().occupancy).toMatchObject({ blockedQueries: 4, blockedCellChecks: 4, stateSnapshots: 0 });
  });

  it('filters opt-in claims without querying full state or recursing into cell status', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, [{ x: 1, y: 1 }], { blocksMovement: false });
    const state = vi.spyOn(OccupancyGrid.prototype, 'getState').mockImplementation(() => { throw Error('full state queried'); });
    const status = vi.spyOn(binding, 'getCellStatus').mockImplementation(() => { throw Error('status recursion'); });
    binding.resetMetrics();
    expect(binding.isBlocked(1, 1)).toBe(false);
    expect(binding.canOccupySubcell(1, { x: 1, y: 1 })).toBe(true);
    expect(binding.bestSubcellPlacement(1, { x: 1, y: 1 })).not.toBeNull();
    expect(binding.occupySubcell(1, { x: 1, y: 1 })).not.toBeNull();
    expect(state).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(binding.getMetrics().occupancy).toMatchObject({ blockedQueries: 4, blockedCellChecks: 4, stateSnapshots: 0 });
  });

  it('returns to the default query path after release, solid replacement, or subcell conversion', () => {
    for (const transition of ['release', 'solid', 'subcell']) {
      const binding = new OccupancyBinding(4, 4);
      binding.occupy(100, [{ x: 1, y: 1 }], { blocksMovement: false });
      if (transition === 'release') binding.release(100);
      if (transition === 'solid') binding.occupy(100, [{ x: 1, y: 1 }]);
      if (transition === 'subcell') binding.occupySubcell(100, { x: 1, y: 1 });
      const occupant = vi.spyOn(OccupancyGrid.prototype, 'getOccupant');
      binding.isBlocked(0, 0);
      expect(occupant).not.toHaveBeenCalled();
      occupant.mockRestore();
    }
  });

  it('keeps reset status counters live and reports invalid preflight without claim scans', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.getCellStatus(1, 1);
    binding.resetMetrics();
    binding.getCellStatus(1, 1);
    expect(binding.getMetrics()).toMatchObject({ cellStatusQueries: 1, crowdedSlotChecks: 4 });
    binding.resetMetrics();
    expect(() => binding.occupy(1, [{ x: 1, y: 1 }], { metadata: { kind: '' } })).toThrow();
    expect(binding.getMetrics().occupancy).toEqual({
      blockedQueries: 0, blockedCellChecks: 0, claimQueries: 0, claimCellChecks: 0,
      areaNormalizations: 0, normalizedCellCount: 0, stateSnapshots: 0,
    });
  });

  it.each([false, true])('rejects empty requests without changing the prior policy (occupied=%s)', (occupied) => {
    const binding = new OccupancyBinding(4, 4);
    if (occupied) binding.occupy(100, [{ x: 1, y: 1 }], { blocksMovement: false });
    const version = binding.version;
    const before = binding.getCellStatus(1, 1);
    expect(() => binding.occupy(100, [], { blocksMovement: false })).toThrow('Occupancy area must not be empty');
    expect(binding.version).toBe(version);
    expect(binding.getCellStatus(1, 1)).toEqual(before);
    const occupant = vi.spyOn(OccupancyGrid.prototype, 'getOccupant');
    expect(binding.isBlocked(1, 1)).toBe(false);
    expect(binding.canOccupySubcell(1, { x: 1, y: 1 })).toBe(true);
    if (occupied) expect(occupant).toHaveBeenCalledTimes(2);
    else expect(occupant).not.toHaveBeenCalled();
  });
});
