import { describe, expect, it } from 'vitest';
import { gridDistanceField } from '../src/index.js';

describe('gridDistanceField maxCost JavaScript boundary', () => {
  const invalid: Array<{ label: string; value: unknown }> = [
    { label: 'nonnumeric string', value: 'bad' },
    { label: 'numeric string', value: '1' },
    { label: 'empty string', value: '' },
    { label: 'false', value: false },
    { label: 'true', value: true },
    { label: 'null', value: null },
    { label: 'array', value: [1] },
    { label: 'plain object', value: {} },
    { label: 'boxed number', value: new Number(1) },
    { label: 'bigint', value: 1n },
    { label: 'symbol', value: Symbol('cost') },
    { label: 'function', value: () => 1 },
    { label: 'negative finite', value: -1 },
    { label: 'negative infinity', value: -Infinity },
    { label: 'NaN', value: NaN },
  ];

  it.each(invalid)('rejects $label with the documented error before every callback', ({ value }) => {
    const calls = { occupancy: 0, blocked: 0, cost: 0 };
    let error: unknown;
    try {
      gridDistanceField([{ x: 0, y: 0 }], {
        occupancy: { width: 2, height: 1, version: 0, isBlocked: () => { calls.occupancy++; return false; } },
        blocked: () => { calls.blocked++; return false; },
        cost: () => { calls.cost++; return 1; },
        maxCost: value as number,
      });
    } catch (caught) { error = caught; }
    expect(error).toMatchObject({ code: 'distance_field_cost_invalid' });
    expect(calls).toEqual({ occupancy: 0, blocked: 0, cost: 0 });
  });

  it('rejects coercible objects without invoking user conversion', () => {
    let coercions = 0;
    const value = { valueOf: () => { coercions++; return 1; } };
    let error: unknown;
    try {
      gridDistanceField([{ x: 0, y: 0 }], { width: 2, height: 1, maxCost: value as unknown as number });
    } catch (caught) { error = caught; }
    expect(error).toMatchObject({ code: 'distance_field_cost_invalid' });
    expect(coercions).toBe(0);
  });

  it.each([
    { label: 'zero', value: 0, expected: [0, Infinity] },
    { label: 'finite inclusive bound', value: 1, expected: [0, 1] },
    { label: 'infinity', value: Infinity, expected: [0, 1] },
    { label: 'undefined default', value: undefined, expected: [0, 1] },
  ])('preserves $label', ({ value, expected }) => {
    expect([...gridDistanceField([{ x: 0, y: 0 }], { width: 2, height: 1, maxCost: value }).distances]).toEqual(expected);
  });
});

it('reads a maxCost accessor once and retains that bound', () => {
  let reads = 0;
  const result = gridDistanceField([{ x: 0, y: 0 }], {
    width: 2, height: 1,
    get maxCost() { reads++; return reads === 1 ? 0 : Infinity; },
  });
  expect(reads).toBe(1);
  expect([...result.distances]).toEqual([0, Infinity]);
});
