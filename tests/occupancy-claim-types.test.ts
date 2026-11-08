import { expect, expectTypeOf, it } from 'vitest';
import { OccupancyBinding, type OccupancyBindingClaimOptions, type OccupancyBindingOccupyOptions,
  type OccupancyCellClaim } from '../src/index.js';
import type { OccupancyBindingOccupyOptions as BrowserOccupyOptions } from '../src/index.browser.js';

it('retains metadata options and exposes the occupy-only policy in both public entries', () => {
  const binding = new OccupancyBinding(4, 4);
  const oldOptions: OccupancyBindingClaimOptions = { metadata: { kind: 'farm' } };
  const options: OccupancyBindingOccupyOptions = { ...oldOptions, blocksMovement: false };
  expectTypeOf<OccupancyBindingOccupyOptions>().toEqualTypeOf<BrowserOccupyOptions>();
  expectTypeOf<OccupancyCellClaim['blocksMovement']>().toEqualTypeOf<boolean | undefined>();
  expect(binding.occupy(1, [{ x: 1, y: 1 }], options)).toBe(true);
  expect(binding.isBlocked(1, 1)).toBe(false);
  expect(binding.occupy(2, [{ x: 2, y: 2 }], oldOptions)).toBe(true);
  expect(binding.isBlocked(2, 2)).toBe(true);
  // @ts-expect-error A string is not the public boolean movement policy.
  const invalid: OccupancyBindingOccupyOptions = { blocksMovement: 'false' };
  expect(invalid.blocksMovement).toBe('false');
  // @ts-expect-error Reserve options do not introduce a movement policy.
  binding.reserve(3, [{ x: 3, y: 3 }], { blocksMovement: false });
  expect(binding.isBlocked(3, 3)).toBe(true);
  // @ts-expect-error Static blockers do not introduce a movement policy.
  binding.block([{ x: 0, y: 0 }], { blocksMovement: false });
  expect(binding.isBlocked(0, 0)).toBe(true);
});
