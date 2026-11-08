import { describe, expect, it } from 'vitest';
import { OccupancyBinding } from '../src/occupancy-grid.js';
import { findGridPath } from '../src/path-service.js';
import { World } from '../src/world.js';

const farm = { metadata: { kind: 'farm' }, blocksMovement: false };
const cell = { x: 1, y: 1 };
const area = [cell];
const snapshot = (binding: OccupancyBinding) => ({
  version: binding.version,
  cells: Array.from({ length: binding.width * binding.height }, (_, index) =>
    binding.getCellStatus(index % binding.width, Math.floor(index / binding.width))),
});

function placeUnit(binding: OccupancyBinding, entity: number, x = 1, y = 1, slot = 0) {
  const result = binding.occupySubcell(entity, { x, y }, {
    preferredSlot: slot, metadata: { kind: 'unit' },
  });
  expect(result).not.toBeNull();
  return result;
}

describe('OccupancyBinding placement-only claims', () => {
  it('retains exclusive placement while exposing movement and the explicit claim policy', () => {
    const binding = new OccupancyBinding(4, 4);
    expect(binding.occupy(100, area, farm)).toBe(true);
    expect(binding.isBlocked(1, 1)).toBe(false);
    expect(binding.getCellStatus(1, 1)).toEqual({
      position: cell, blocked: false,
      blockedBy: [{ entity: 100, kind: 'farm', claim: 'occupied', blocksMovement: false }],
      crowdedBy: [], freeSubcellSlots: 4,
    });
    expect(binding.occupy(200, area, farm)).toBe(false);
    expect(binding.reserve(200, area)).toBe(false);
    expect(() => binding.block(area)).toThrow('Cannot block occupied or reserved cell');
  });

  it.each([undefined, true])('preserves solid defaults for blocksMovement=%s', (blocksMovement) => {
    const binding = new OccupancyBinding(4, 4);
    expect(binding.occupy(100, area, { blocksMovement, metadata: { kind: 'building' } })).toBe(true);
    expect(binding.isBlocked(1, 1)).toBe(true);
    expect(binding.getCellStatus(1, 1).blockedBy).toEqual([
      { entity: 100, kind: 'building', claim: 'occupied' },
    ]);
    expect(binding.occupySubcell(1, cell)).toBeNull();
  });

  it('can claim beneath existing units without moving their slots or metadata', () => {
    const binding = new OccupancyBinding(4, 4);
    placeUnit(binding, 1, 1, 1, 0);
    placeUnit(binding, 2, 1, 1, 3);
    const before = binding.getCellStatus(1, 1).crowdedBy;
    expect(binding.occupy(100, area, farm)).toBe(true);
    expect(binding.getCellStatus(1, 1).crowdedBy).toEqual(before);
    expect(binding.getCellStatus(1, 1).freeSubcellSlots).toBe(2);
    expect(binding.isBlocked(1, 1)).toBe(false);
  });

  it('admits every subcell query and allocator without losing slot capacity rules', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, area, farm);
    expect(binding.canOccupySubcell(1, cell)).toBe(true);
    expect(binding.bestSubcellPlacement(1, cell, { preferredSlot: 2 })).toEqual({
      position: cell, slot: 2, offset: { x: 0, y: 0.5 },
    });
    expect(binding.neighborsWithSpace(1, { x: 0, y: 1 }).some(
      (neighbor) => neighbor.position.x === 1 && neighbor.position.y === 1,
    )).toBe(true);
    for (let slot = 0; slot < 4; slot++) placeUnit(binding, slot + 1, 1, 1, slot);
    expect(binding.isBlocked(1, 1)).toBe(true);
    expect(binding.getCellStatus(1, 1).freeSubcellSlots).toBe(0);
    expect(binding.canOccupySubcell(5, cell)).toBe(false);
    expect(binding.occupySubcell(5, cell)).toBeNull();
    expect(binding.isBlocked(1, 1, { ignoreEntity: 1 })).toBe(false);
    expect(binding.getCellStatus(1, 1, { ignoreEntity: 1 }).freeSubcellSlots).toBe(1);
    expect(binding.bestSubcellPlacement(1, cell)?.slot).toBe(0);
  });

  it('routes across a claimed corridor through the public path service', () => {
    const binding = new OccupancyBinding(4, 1);
    binding.occupy(100, { x: 1, y: 0, width: 2, height: 1 }, farm);
    expect(findGridPath({ occupancy: binding, start: { x: 0, y: 0 }, goal: { x: 3, y: 0 } })?.path)
      .toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
  });

  it('does not hide the passable owner reservation from unrelated movers', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, area, farm);
    expect(binding.reserve(100, area)).toBe(true);
    expect(binding.isBlocked(1, 1)).toBe(true);
    expect(binding.isBlocked(1, 1, { ignoreEntity: 200 })).toBe(true);
    expect(binding.isBlocked(1, 1, { ignoreEntity: 100 })).toBe(false);
    expect(binding.isBlocked(1, 1, { includeReservations: false })).toBe(false);
    expect(binding.occupySubcell(1, cell)).toBeNull();
    expect(binding.bestSubcellPlacement(1, cell, { includeReservations: false })).not.toBeNull();
    expect(binding.getCellStatus(1, 1, { includeReservations: false })).toMatchObject({
      blocked: false,
      blockedBy: [{ entity: 100, kind: 'farm', claim: 'occupied', blocksMovement: false }],
    });
    expect(binding.occupy(200, area, farm)).toBe(false);
    binding.clearReservation(100);
    expect(binding.isBlocked(1, 1)).toBe(false);
    expect(binding.occupy(200, area)).toBe(false);
    placeUnit(binding, 1);
    const before = snapshot(binding);
    expect(binding.reserve(100, area)).toBe(false);
    expect(snapshot(binding)).toEqual(before);
  });

  it('keeps normalized repeats idempotent and versions metadata and policy changes once', () => {
    const binding = new OccupancyBinding(4, 4);
    const footprint = { x: 1, y: 1, width: 2, height: 1 };
    binding.occupy(100, footprint, farm);
    expect(binding.version).toBe(1);
    binding.occupy(100, [{ x: 2, y: 1 }, cell, cell], farm);
    expect(binding.version).toBe(1);
    binding.occupy(100, footprint, { blocksMovement: false, metadata: { kind: 'field' } });
    expect(binding.version).toBe(2);
    binding.occupy(100, footprint, { blocksMovement: true });
    expect(binding.version).toBe(3);
    expect(binding.getCellStatus(1, 1).blockedBy).toEqual([
      { entity: 100, kind: 'field', claim: 'occupied' },
    ]);
    binding.occupy(100, footprint);
    expect(binding.version).toBe(3);
    binding.occupy(100, footprint, { blocksMovement: false });
    expect(binding.version).toBe(4);
    binding.occupy(100, footprint);
    expect(binding.version).toBe(5);
    expect(binding.isBlocked(1, 1)).toBe(true);
  });

  it('moves a passable footprint beneath units while preserving units at both ends', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, area, farm);
    placeUnit(binding, 1);
    placeUnit(binding, 2, 2, 1, 3);
    expect(binding.occupy(100, [{ x: 2, y: 1 }], farm)).toBe(true);
    expect(binding.getCellStatus(1, 1)).toMatchObject({ blockedBy: [], crowdedBy: [{ entity: 1, slot: 0 }] });
    expect(binding.getCellStatus(2, 1)).toMatchObject({
      blocked: false, blockedBy: [{ entity: 100, blocksMovement: false }], crowdedBy: [{ entity: 2, slot: 3 }],
    });
  });

  it.each([false, true])('preserves all old claims on a late footprint conflict (policy=%s)', (blocksMovement) => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, area, farm);
    binding.reserve(100, [{ x: 0, y: 0 }]);
    binding.occupy(200, [{ x: 3, y: 2 }]);
    const before = snapshot(binding);
    expect(binding.occupy(100, { x: 2, y: 2, width: 2, height: 1 }, {
      blocksMovement, metadata: { kind: 'replacement' },
    })).toBe(false);
    expect(snapshot(binding)).toEqual(before);
  });

  it('refuses a solid transition over units without changing the passable claim', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, area, farm);
    placeUnit(binding, 1);
    const before = snapshot(binding);
    expect(binding.occupy(100, area, { blocksMovement: true, metadata: { kind: 'wall' } })).toBe(false);
    expect(snapshot(binding)).toEqual(before);
    binding.release(1);
    expect(binding.occupy(100, area, { blocksMovement: true })).toBe(true);
    expect(binding.isBlocked(1, 1)).toBe(true);
  });

  it('converts the same owner between slot and footprint while retaining other units', () => {
    const binding = new OccupancyBinding(4, 4);
    placeUnit(binding, 100, 1, 1, 0);
    placeUnit(binding, 2, 1, 1, 3);
    expect(binding.occupy(100, area, farm)).toBe(true);
    expect(binding.getCellStatus(1, 1).crowdedBy.map((claim) => claim.entity)).toEqual([2]);
    expect(binding.occupySubcell(100, cell, { preferredSlot: 0 })).not.toBeNull();
    expect(binding.getCellStatus(1, 1).blockedBy).toEqual([]);
    binding.release(2);
    binding.release(100);
    binding.occupy(100, area);
    expect(binding.isBlocked(1, 1)).toBe(true);
  });

  it('release removes footprint/reservation/policy, keeps other units and is idempotent', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, area, farm);
    binding.reserve(100, [{ x: 2, y: 2 }]);
    placeUnit(binding, 1);
    binding.release(100);
    expect(binding.getCellStatus(1, 1)).toMatchObject({ blockedBy: [], crowdedBy: [{ entity: 1 }] });
    expect(binding.getCellStatus(2, 2).blockedBy).toEqual([]);
    const version = binding.version;
    binding.release(100);
    expect(binding.version).toBe(version);
    binding.occupy(100, [{ x: 2, y: 2 }]);
    expect(binding.isBlocked(2, 2)).toBe(true);
  });

  it('destroy cleanup and detach/reattach do not retain stale policy', () => {
    const world = new World({ gridWidth: 4, gridHeight: 4, tps: 60 });
    const binding = new OccupancyBinding(4, 4, { world });
    const owner = world.createEntity();
    binding.occupy(owner, area, farm);
    binding.attachWorld(world);
    world.destroyEntity(owner);
    expect(binding.getCellStatus(1, 1).blockedBy).toEqual([]);
    expect(binding.version).toBe(2);
    binding.occupy(owner, area);
    expect(binding.isBlocked(1, 1)).toBe(true);
    binding.release(owner);
    const detached = world.createEntity();
    binding.occupy(detached, area, farm);
    binding.detachWorld();
    world.destroyEntity(detached);
    expect(binding.getCellStatus(1, 1).blockedBy).toHaveLength(1);
    binding.release(detached);
    binding.attachWorld(world);
    const reattached = world.createEntity();
    binding.occupy(reattached, area, farm);
    world.destroyEntity(reattached);
    expect(binding.getCellStatus(1, 1).blockedBy).toEqual([]);
  });

  it('retains custom subcell vetoes and supports disabled crowding without changing defaults', () => {
    const vetoed = new OccupancyBinding(4, 4, { crowding: { isCellBlocked: (x) => x === 1 } });
    vetoed.occupy(100, area, farm);
    expect(vetoed.isBlocked(1, 1)).toBe(false);
    expect(vetoed.canOccupySubcell(1, cell)).toBe(false);
    expect(vetoed.bestSubcellPlacement(1, cell)).toBeNull();
    const disabled = new OccupancyBinding(4, 4, { crowding: false });
    disabled.occupy(100, area, farm);
    expect(disabled.getCellStatus(1, 1)).toMatchObject({ blocked: false, freeSubcellSlots: null });
    expect(() => disabled.occupySubcell(1, cell)).toThrow('crowding is disabled');
  });

  it('copies metadata/policy values and returns independent claim objects', () => {
    const binding = new OccupancyBinding(4, 4);
    const options = { blocksMovement: false, metadata: { kind: 'farm' } };
    binding.occupy(100, area, options);
    options.blocksMovement = true;
    options.metadata.kind = 'changed';
    const status = binding.getCellStatus(1, 1);
    status.blockedBy[0]!.kind = 'changed again';
    expect(binding.getCellStatus(1, 1).blockedBy).toEqual([
      { entity: 100, kind: 'farm', claim: 'occupied', blocksMovement: false },
    ]);
    expect(binding.isBlocked(1, 1)).toBe(false);
  });

  it('moves and repeats reservations without losing the occupied movement policy', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, area, farm);
    binding.reserve(100, [{ x: 2, y: 1 }]);
    expect(binding.version).toBe(2);
    binding.reserve(100, [{ x: 2, y: 1 }, { x: 2, y: 1 }]);
    expect(binding.version).toBe(2);
    binding.reserve(100, [{ x: 3, y: 1 }], { metadata: { kind: 'field' } });
    expect(binding.version).toBe(3);
    expect(binding.getCellStatus(2, 1).blockedBy).toEqual([]);
    expect(binding.getCellStatus(3, 1).blockedBy).toEqual([{ entity: 100, kind: 'field', claim: 'reserved' }]);
    expect(binding.getCellStatus(1, 1).blockedBy).toEqual([
      { entity: 100, kind: 'field', claim: 'occupied', blocksMovement: false },
    ]);
    binding.clearReservation(100);
    binding.clearReservation(100);
    expect(binding.version).toBe(4);
    expect(binding.isBlocked(1, 1)).toBe(false);
  });

  it.each(['static', 'reserved', 'crowded'] as const)('preserves an old unit on a late %s solid footprint conflict', (conflict) => {
    const binding = new OccupancyBinding(4, 4);
    placeUnit(binding, 100, 0, 0, 2);
    binding.reserve(100, [{ x: 0, y: 1 }]);
    if (conflict === 'static') binding.block([{ x: 3, y: 2 }]);
    if (conflict === 'reserved') binding.reserve(200, [{ x: 3, y: 2 }]);
    if (conflict === 'crowded') placeUnit(binding, 200, 3, 2, 1);
    const before = snapshot(binding);
    expect(binding.occupy(100, { x: 2, y: 2, width: 2, height: 1 })).toBe(false);
    expect(snapshot(binding)).toEqual(before);
  });

  it.each(['static', 'reserved', 'occupied', 'full'] as const)('keeps a passable footprint when converting to a %s subcell fails', (conflict) => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(100, area, farm);
    binding.reserve(100, [{ x: 0, y: 0 }]);
    const target = { x: 2, y: 2 };
    if (conflict === 'static') binding.block([target]);
    if (conflict === 'reserved') binding.reserve(200, [target]);
    if (conflict === 'occupied') binding.occupy(200, [target]);
    if (conflict === 'full') for (let slot = 0; slot < 4; slot++) placeUnit(binding, slot + 1, 2, 2, slot);
    const before = snapshot(binding);
    expect(binding.occupySubcell(100, target, { metadata: { kind: 'moving' } })).toBeNull();
    expect(snapshot(binding)).toEqual(before);
  });
});
