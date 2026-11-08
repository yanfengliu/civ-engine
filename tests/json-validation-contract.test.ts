import { describe, expect, it } from 'vitest';
import { EngineError } from '../src/engine-error.js';
import { assertJsonCompatible, cloneJsonValue, jsonFingerprint } from '../src/json.js';

function rejection(value: unknown, label = 'payload'): EngineError {
  try { assertJsonCompatible(value, label); } catch (error) {
    expect(error).toBeInstanceOf(EngineError);
    return error as EngineError;
  }
  throw new Error('Expected JSON rejection');
}

describe('JSON validation diagnostics and observation contract', () => {
  it.each([
    { value: undefined, reason: 'must not be undefined' },
    { value: NaN, reason: 'must be a finite JSON number' },
    { value: Infinity, reason: 'must be a finite JSON number' },
    { value: -Infinity, reason: 'must be a finite JSON number' },
    { value: 1n, reason: 'is not JSON-compatible' },
    { value: Symbol('bad'), reason: 'is not JSON-compatible' },
    { value: () => 1, reason: 'is not JSON-compatible' },
    { value: new Date(0), reason: 'must be a plain object, array, or primitive' },
  ])('preserves the exact nested diagnostic: $reason', ({ value, reason }) => {
    const error = rejection({ rows: [{ valid: true }, { 'odd.key[0]': value }] });
    expect(error.code).toBe('json_incompatible');
    expect(error.message).toBe(`payload.rows[1].odd.key[0] ${reason}`);
    expect(error.details).toEqual({ context: 'payload.rows[1].odd.key[0]' });
  });

  it('does not retain a previous sibling breadcrumb', () => {
    const error = rejection({ left: [{ leaf: 1 }], right: { no: undefined } }, 'state name');
    expect(error.message).toBe('state name.right.no must not be undefined');
    expect(error.details).toEqual({ context: 'state name.right.no' });
    expect(rejection(undefined, '').message).toBe(' must not be undefined');
  });

  it('distinguishes cycles from repeated non-cyclic references', () => {
    const shared = { number: 3, list: [true, null, 'a'] };
    const dag = { a: shared, b: [shared] };
    expect(() => assertJsonCompatible(dag)).not.toThrow();
    expect(jsonFingerprint(dag)).toBe('{"a":{"number":3,"list":[true,null,"a"]},"b":[{"number":3,"list":[true,null,"a"]}]}');
    const cycle: unknown[] = [shared];
    cycle.push(cycle);
    const error = rejection({ ring: cycle });
    expect(error.message).toBe('payload.ring[1] contains a circular reference');
    expect(error.details).toEqual({ context: 'payload.ring[1]' });
  });

  it('keeps array holes invalid and object numeric keys distinct from indexes', () => {
    const array = [1, 2, 3];
    delete array[1];
    expect(rejection({ array }).message).toBe('payload.array[1] must not be undefined');
    expect(rejection({ '1': undefined }).message).toBe('payload.1 must not be undefined');
  });

  it('reads enumerable object getters eagerly before visiting children', () => {
    const trace: string[] = [];
    const value = {
      get first() { trace.push('first'); return { bad: undefined }; },
      get second() { trace.push('second'); return 2; },
    };
    expect(rejection(value).message).toBe('payload.first.bad must not be undefined');
    expect(trace).toEqual(['first', 'second']);
  });

  it('propagates the original getter exception even after an invalid earlier value', () => {
    const failure = new Error('native getter failure');
    const value = { first: undefined, get second() { throw failure; } };
    expect(() => assertJsonCompatible(value)).toThrow(failure);
    try { assertJsonCompatible(value); } catch (error) { expect(error).toBe(failure); }
  });

  it('reads arrays lazily in index order and stops at the first invalid entry', () => {
    const trace: number[] = [];
    const value = [1, 2];
    Object.defineProperty(value, '0', { get() { trace.push(0); return undefined; } });
    Object.defineProperty(value, '1', { get() { trace.push(1); return 2; } });
    expect(rejection(value).message).toBe('payload[0] must not be undefined');
    expect(trace).toEqual([0]);
  });

  it('preserves null prototypes, ignored properties and detached JSON clones', () => {
    const value = Object.assign(Object.create(null) as Record<string | symbol, unknown>, { a: [-0, 1, null] });
    value[Symbol('ignored')] = undefined;
    Object.defineProperty(value, 'hidden', { value: undefined, enumerable: false });
    expect(jsonFingerprint(value)).toBe('{"a":[0,1,null]}');
    const copy = cloneJsonValue(value, 'clone');
    expect(copy).toEqual({ a: [0, 1, null] });
    expect(copy.a).not.toBe(value.a);
    expect(value.a).toEqual([-0, 1, null]);
  });
});
