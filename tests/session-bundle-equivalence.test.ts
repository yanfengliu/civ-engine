import { describe, expect, it } from 'vitest';
import { deepStructuralEqual } from '../src/session-bundle-equivalence.js';

// full-review 2026-06-13 M3: the object branch didn't reject `b` being an
// array, so {} vs [] was asymmetric ({},[])→true but ([],{})→false. This
// drives fork/bundle divergence detection (commandsEquivalent/eventsEquivalent
// + diffBundles), so a flipped {}↔[] payload could read as "equivalent" by
// argument order.
describe('deepStructuralEqual (full-review M3)', () => {
  it('is symmetric for {} vs [] (object vs array is never equal, both ways)', () => {
    expect(deepStructuralEqual({}, [])).toBe(false);
    expect(deepStructuralEqual([], {})).toBe(false);
    expect(deepStructuralEqual({ a: {} }, { a: [] })).toBe(false);
    expect(deepStructuralEqual({ a: [] }, { a: {} })).toBe(false);
  });

  it('still equates structurally-equal values and distinguishes different ones', () => {
    expect(deepStructuralEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] })).toBe(true);
    expect(deepStructuralEqual([1, 2], [1, 2])).toBe(true);
    expect(deepStructuralEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepStructuralEqual([1], [1, 2])).toBe(false);
    expect(deepStructuralEqual(null, {})).toBe(false);
    expect(deepStructuralEqual(null, null)).toBe(true);
  });
});
