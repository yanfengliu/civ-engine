import { describe, expect, it } from 'vitest';
import { getErrorCode, stateDigest } from '../src/index.js';

describe('stateDigest', () => {
  it('is stable across object key insertion order', () => {
    expect(stateDigest({ a: 1, b: { d: 4, c: 3 } })).toBe(stateDigest({ b: { c: 3, d: 4 }, a: 1 }));
  });

  it('distinguishes different values, array orders, and shapes', () => {
    expect(stateDigest([1, 2])).not.toBe(stateDigest([2, 1]));
    expect(stateDigest({ a: 1 })).not.toBe(stateDigest({ a: 2 }));
    expect(stateDigest({ a: 1 })).not.toBe(stateDigest([['a', 1]]));
    expect(stateDigest('x')).not.toBe(stateDigest('y'));
    expect(stateDigest(null)).toBe(stateDigest(null));
  });

  it('deep-omits keys by name via omitKeys, exempting them from validation', () => {
    const withClock = { zoom: 1.5, modifiedAt: 1719999999, nested: { modifiedAt: 3, keep: 1 } };
    const without = { zoom: 1.5, nested: { keep: 1 } };
    expect(stateDigest(withClock, { omitKeys: ['modifiedAt'] })).toBe(stateDigest(without));
    // An omitted subtree is not validated - a non-JSON value under an
    // omitted key must not throw.
    const handle: unknown = { keep: 1, gpuHandle: (): void => {} };
    expect(() => stateDigest(handle, { omitKeys: ['gpuHandle'] })).not.toThrow();
  });

  it('rejects non-JSON-compatible values with a coded error', () => {
    expect(() => stateDigest({ bad: Number.NaN })).toThrow(/state_digest_invalid|finite/);
    expect(() => stateDigest({ bad: undefined } as unknown)).toThrow(/state_digest_invalid|undefined/);
    const fn: unknown = (): void => {};
    expect(() => stateDigest(fn)).toThrow();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => stateDigest(circular)).toThrow(/circular/);
  });

  it('produces a 16-hex-char digest string', () => {
    expect(stateDigest({ tick: 312, town: 'harborform' })).toMatch(/^[0-9a-f]{16}$/);
  });

  it('matches pinned golden vectors - digests persist across processes, so encoding drift is breaking', () => {
    expect(stateDigest(null)).toBe('0d0f1dbc6a6118f8');
    expect(stateDigest({ a: 1, b: [true, 'x'] })).toBe('2474b4bb5f1c8e60');
  });

  it('throws the documented error code', () => {
    let code: string | null = null;
    try {
      stateDigest({ bad: Number.NaN });
    } catch (error) {
      code = getErrorCode(error);
    }
    expect(code).toBe('state_digest_invalid');
  });
});
