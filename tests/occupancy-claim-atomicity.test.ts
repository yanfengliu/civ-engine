import { describe, expect, it } from 'vitest';
import { OccupancyBinding } from '../src/occupancy-grid.js';

const snapshot = (binding: OccupancyBinding) => ({
  version: binding.version,
  cells: Array.from({ length: 16 }, (_, index) => binding.getCellStatus(index % 4, Math.floor(index / 4))),
});
const invalid = { metadata: { kind: '' } };
const methods = ['occupy', 'reserve', 'occupySubcell'] as const;

function invalidClaim(binding: OccupancyBinding, method: typeof methods[number]) {
  return method === 'occupySubcell'
    ? binding.occupySubcell(1, { x: 2, y: 2 }, invalid)
    : binding[method](1, [{ x: 2, y: 2 }], invalid);
}

describe('OccupancyBinding claim failure atomicity', () => {
  it.each(methods)('%s validates metadata before replacing an existing claim', (method) => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(1, [{ x: 0, y: 0 }], { metadata: { kind: 'old' } });
    binding.reserve(1, [{ x: 0, y: 1 }]);
    const before = snapshot(binding);
    expect(() => invalidClaim(binding, method)).toThrow('Occupancy metadata kind must not be empty');
    expect(snapshot(binding)).toEqual(before);
  });

  it.each(methods)('%s rejects invalid metadata even when the target has a whole-cell conflict', (method) => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(1, [{ x: 0, y: 0 }]);
    binding.occupy(2, [{ x: 2, y: 2 }]);
    const before = snapshot(binding);
    expect(() => invalidClaim(binding, method)).toThrow('Occupancy metadata kind must not be empty');
    expect(snapshot(binding)).toEqual(before);
  });

  it.each(['occupy', 'reserve'] as const)('%s validates metadata before crowded-cell conflict checks', (method) => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupySubcell(2, { x: 2, y: 2 });
    const before = snapshot(binding);
    expect(() => invalidClaim(binding, method)).toThrow('Occupancy metadata kind must not be empty');
    expect(snapshot(binding)).toEqual(before);
  });

  it('rejects a nonboolean movement policy without changing old cells, slots or metadata', () => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupySubcell(1, { x: 0, y: 0 });
    const before = snapshot(binding);
    // @ts-expect-error The new occupy policy is a boolean, not a truthy string.
    expect(() => binding.occupy(1, [{ x: 2, y: 2 }], { blocksMovement: 'false' }))
      .toThrow('blocksMovement must be a boolean');
    expect(snapshot(binding)).toEqual(before);
  });

  it.each(methods)('%s validates coordinates before invalid metadata and preserves state', (method) => {
    const binding = new OccupancyBinding(4, 4);
    binding.occupy(1, [{ x: 0, y: 0 }]);
    const before = snapshot(binding);
    expect(() => method === 'occupySubcell'
      ? binding.occupySubcell(1, { x: 4, y: 2 }, invalid)
      : binding[method](1, [{ x: 4, y: 2 }], invalid))
      .toThrow('out of bounds');
    expect(snapshot(binding)).toEqual(before);
  });
});
