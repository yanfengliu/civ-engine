import { describe, expect, it } from 'vitest';
import * as debug from '../src/world-debugger.js';
import { OccupancyBinding, OccupancyGrid } from '../src/occupancy-grid.js';
import { World } from '../src/world.js';
import type { OccupancyCellStatus, OccupancyRect } from '../src/occupancy-types.js';

function probe(source: Parameters<typeof debug.createOccupancyBindingDebugProbe>[1],
  options: Parameters<typeof debug.createOccupancyBindingDebugProbe>[2]) {
  expect(debug.createOccupancyBindingDebugProbe).toBeTypeOf('function');
  return debug.createOccupancyBindingDebugProbe('claims', source, options);
}
const one = { x: 1, y: 1, width: 1, height: 1 };
function fixture() {
  const binding = new OccupancyBinding(10, 10, { crowding: {
    slots: [{ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 }],
  } });
  expect(binding.occupy(7, one, { metadata: { kind: 'farm' }, blocksMovement: false })).toBe(true);
  expect(binding.occupySubcell(9, { x: 1, y: 1 }, { metadata: { kind: 'villager' }, preferredSlot: 0 })).not.toBeNull();
  expect(binding.reserve(7, [{ x: 2, y: 1 }], { metadata: { kind: 'farm' } })).toBe(true);
  return binding;
}
function structural() {
  const calls: Array<[number, number]> = [];
  const source = {
    width: 10, height: 10, version: 4,
    getCellStatus(x: number, y: number): OccupancyCellStatus {
      calls.push([x, y]);
      return { position: { x, y }, blocked: true, freeSubcellSlots: null,
        blockedBy: [{ entity: null, kind: 'rock', claim: 'blocked' }], crowdedBy: [] };
    },
  };
  return { calls, source };
}

describe('bounded occupancy binding debug probe', () => {
  it('preserves the original raw-grid eight-field snapshot exactly', () => {
    const raw = new OccupancyGrid(4, 3);
    raw.block([{ x: 0, y: 0 }]);
    raw.occupy(2, [{ x: 1, y: 0 }, { x: 2, y: 0 }]);
    raw.reserve(3, [{ x: 3, y: 2 }]);
    expect(debug.createOccupancyDebugProbe('old', raw).capture()).toEqual({
      width: 4, height: 3, version: raw.version, blockedCells: 1,
      occupiedEntities: 1, occupiedCells: 2, reservedEntities: 1, reservedCells: 1,
    });
  });

  it('captures actual placement-only, reservation and subcell identities without a raw grid', () => {
    const binding = fixture();
    const before = binding.getMetrics();
    const region = { ...one, width: 2 };
    const snapshot = probe(binding, { region }).capture();
    expect(snapshot).toEqual({
      width: 10, height: 10, version: binding.version, region,
      requestedCells: 2, omittedCells: 0, omittedClaims: 0,
      cells: [{
        position: { x: 1, y: 1 }, blocked: false, freeSubcellSlots: 1, omittedClaims: 0,
        blockedBy: [
          { entity: 7, kind: 'farm', claim: 'occupied', blocksMovement: false },
        ],
        crowdedBy: [{ entity: 9, kind: 'villager', claim: 'subcell', slot: 0, offset: { x: 0.25, y: 0.5 } }],
      }, {
        position: { x: 2, y: 1 }, blocked: true, freeSubcellSlots: 2, omittedClaims: 0,
        blockedBy: [{ entity: 7, kind: 'farm', claim: 'reserved' }], crowdedBy: [],
      }],
    });
    const after = binding.getMetrics();
    expect(after.version).toBe(before.version);
    expect(after.cellStatusQueries - before.cellStatusQueries).toBe(2);
    expect(after.crowdedSlotChecks - before.crowdedSlotChecks).toBe(4);
  });

  it('bounds source calls in a deterministic row-major prefix and reports omitted cells', () => {
    const { calls, source } = structural();
    const result = probe(source, { region: { x: 2, y: 3, width: 3, height: 2 }, maxCells: 4 }).capture();
    expect(calls).toEqual([[2, 3], [3, 3], [4, 3], [2, 4]]);
    expect(result.requestedCells).toBe(6);
    expect(result.omittedCells).toBe(2);
    expect(result.cells.map(c => c.position)).toEqual([{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 2, y: 4 }]);
    expect(result).not.toHaveProperty('blockedCells');
    expect(result).not.toHaveProperty('occupiedEntities');
  });

  it('uses an aggregate claim budget without changing actual blocked/free-slot facts', () => {
    const binding = fixture();
    const result = probe(binding, { region: { ...one, width: 2 }, maxClaims: 1 }).capture();
    expect(result.cells[0]!.blockedBy).toHaveLength(1);
    expect(result.cells[0]!.crowdedBy).toEqual([]);
    expect(result.cells[0]!.blocked).toBe(false);
    expect(result.cells[0]!.freeSubcellSlots).toBe(1);
    expect(result.cells[0]!.omittedClaims).toBe(1);
    expect(result.cells[1]!.blockedBy).toEqual([]);
    expect(result.cells[1]!.blocked).toBe(true);
    expect(result.cells[1]!.omittedClaims).toBe(1);
    expect(result.omittedClaims).toBe(2);
  });

  it('honors zero cell and claim limits and default cell limit64', () => {
    const { calls, source } = structural();
    const region = { x: 0, y: 0, width: 10, height: 10 };
    const empty = probe(source, { region, maxCells: 0 }).capture();
    expect(empty.cells).toEqual([]);
    expect(empty.omittedCells).toBe(100);
    expect(calls).toEqual([]);
    const noClaims = probe(source, { region, maxCells: 1, maxClaims: 0 }).capture();
    expect(noClaims.cells[0]!.blockedBy).toEqual([]);
    expect(noClaims.omittedClaims).toBe(1);
    const defaulted = probe(source, { region }).capture();
    expect(defaulted.cells).toHaveLength(64);
    expect(defaulted.cells[63]!.position).toEqual({ x: 3, y: 6 });
    expect(defaulted.omittedCells).toBe(36);
  });

  it.each([
    { x: -1, y: 0, width: 1, height: 1 },
    { x: 0.5, y: 0, width: 1, height: 1 },
    { x: 0, y: 0, width: 0, height: 1 },
    { x: 9, y: 0, width: 2, height: 1 },
    { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 1 },
  ])('rejects an invalid region before any source query: %j', region => {
    const { calls, source } = structural();
    expect(debug.createOccupancyBindingDebugProbe).toBeTypeOf('function');
    expect(() => probe(source, { region })).toThrow();
    expect(calls).toEqual([]);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid limits before reads: %s', limit => {
      const { calls, source } = structural();
      expect(debug.createOccupancyBindingDebugProbe).toBeTypeOf('function');
      expect(() => probe(source, { region: one, maxCells: limit })).toThrow();
      expect(() => probe(source, { region: one, maxClaims: limit })).toThrow();
      expect(calls).toEqual([]);
    });

  it('detaches options and all returned nested claim values between captures', () => {
    const binding = fixture();
    const region: OccupancyRect = { ...one };
    const options = { region, maxCells: 1, maxClaims: 3 };
    const capture = probe(binding, options);
    region.x = 8;
    options.maxClaims = 0;
    const first = capture.capture();
    expect(first.region).toEqual(one);
    first.region.x = 5;
    first.cells[0]!.position.x = 5;
    first.cells[0]!.blockedBy[0]!.kind = 'changed';
    first.cells[0]!.crowdedBy[0]!.offset!.x = 99;
    first.cells[0]!.crowdedBy.length = 0;
    const second = capture.capture();
    expect(second.region).toEqual(one);
    expect(second.cells[0]!.blockedBy[0]!.kind).toBe('farm');
    expect(second.cells[0]!.crowdedBy[0]!.offset).toEqual({ x: 0.25, y: 0.5 });
  });

  it('observes release and destruction on each capture without changing gameplay state', () => {
    const world = new World({ gridWidth: 3, gridHeight: 3, tps: 10 });
    const id = world.createEntity();
    const binding = new OccupancyBinding(3, 3, { world, crowding: false });
    binding.occupy(id, one, { metadata: { kind: 'house' } });
    const capture = probe(binding, { region: one });
    expect(capture.capture().cells[0]!.blockedBy[0]!.entity).toBe(id);
    expect(binding.isBlocked(1, 1)).toBe(true);
    world.destroyEntity(id);
    const empty = capture.capture();
    expect(empty.cells[0]!.blocked).toBe(false);
    expect(empty.cells[0]!.blockedBy).toEqual([]);
    expect(empty.version).toBe(binding.version);
  });


  it('defaults to256 retained claims while reporting the full actual cell capacity', () => {
    const slots = Array.from({ length: 300 }, (_, index) => ({ x: (index + 0.5) / 300, y: 0.5 }));
    const binding = new OccupancyBinding(1, 1, { crowding: { slots } });
    for (let id = 0; id < 300; id++) {
      expect(binding.occupySubcell(id, { x: 0, y: 0 }, { preferredSlot: id })).not.toBeNull();
    }
    const result = probe(binding, { region: { x: 0, y: 0, width: 1, height: 1 } }).capture();
    expect(result.cells[0]!.crowdedBy).toHaveLength(256);
    expect(result.cells[0]!.crowdedBy[255]!.entity).toBe(255);
    expect(result.cells[0]!.freeSubcellSlots).toBe(0);
    expect(result.cells[0]!.blocked).toBe(true);
    expect(result.omittedClaims).toBe(44);
  });

  it('rejects unsafe rectangle area before reads even on a structural large grid', () => {
    const { calls, source } = structural();
    source.width = Number.MAX_SAFE_INTEGER;
    source.height = 2;
    expect(debug.createOccupancyBindingDebugProbe).toBeTypeOf('function');
    expect(() => probe(source, {
      region: { x: 0, y: 0, width: Number.MAX_SAFE_INTEGER, height: 2 }, maxCells: 1,
    })).toThrow();
    expect(calls).toEqual([]);
  });

  it('works as a detached JSON probe in WorldDebugger', () => {
    const binding = fixture();
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 10 });
    const capture = probe(binding, { region: one });
    const result = new debug.WorldDebugger({ world, probes: [capture] }).capture();
    expect(result.probes.claims).toEqual(capture.capture());
    expect(JSON.parse(JSON.stringify(result.probes.claims))).toEqual(result.probes.claims);
  });

  it('propagates the actual source exception identity', () => {
    const sentinel = new Error('source read failed');
    const { source } = structural();
    source.getCellStatus = () => { throw sentinel; };
    const capture = probe(source, { region: one });
    let thrown: unknown;
    try { capture.capture(); } catch (error) { thrown = error; }
    expect(thrown).toBe(sentinel);
  });
});
