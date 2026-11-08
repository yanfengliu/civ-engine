import { describe, expect, it, vi } from 'vitest';
import { EngineError, World, type CommandValidationResult } from '../src/index.js';

const createWorld = () => new World<Record<string, never>, { act: unknown }>({
  gridWidth: 4, gridHeight: 4, tps: 10,
});

function thrownBy(fn: () => unknown): unknown {
  let threw = false;
  let caught: unknown;
  try { fn(); } catch (error) { threw = true; caught = error; }
  expect(threw).toBe(true);
  return caught;
}

describe('command precheck validation and JSON boundaries', () => {
  it('P07 rejects before traversing hostile, function or circular payloads', () => {
    const world = createWorld();
    world.registerValidator('act', () => false);
    const getter = vi.fn(() => { throw Object.freeze({ payload: true }); });
    const hostile = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    for (const data of [hostile, { fn: () => undefined }, cycle]) {
      expect(world.precheckCommand('act', data)).toEqual({
        accepted: false, commandType: 'act', code: 'validation_failed',
        message: 'Validation failed', details: null, tick: 0, validatorIndex: 0,
      });
    }
    expect(getter).not.toHaveBeenCalled();
  });

  it('P08 invalid rejection details win over payload traversal and later validators', () => {
    const world = createWorld();
    const getter = vi.fn(() => { throw Object.freeze({ payload: true }); });
    const data = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    const later = vi.fn(() => true);
    world.registerValidator('act', () => true);
    world.registerValidator('act', () => ({ code: 'blocked', details: { bad: NaN } }));
    world.registerValidator('act', later);
    expect(thrownBy(() => world.precheckCommand('act', data))).toMatchObject({
      code: 'json_incompatible',
      details: { context: 'command rejection details for validator 1.bad' },
    });
    expect(getter).not.toHaveBeenCalled();
    expect(later).not.toHaveBeenCalled();
  });

  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  it.each([
    ['undefined', undefined], ['NaN', NaN], ['Infinity', Infinity], ['bigint', 1n],
    ['function', () => undefined], ['symbol', Symbol('bad')], ['Date', new Date(0)],
    ['cycle', cycle], ['nested undefined', { missing: undefined }],
  ])('P09 rejects accepted non-JSON data: %s without sequence or queue effects', (_, data) => {
    const world = createWorld();
    const result = vi.fn();
    const handler = vi.fn();
    world.onCommandResult(result);
    world.registerHandler('act', handler);
    const error = thrownBy(() => world.precheckCommand('act', data));
    expect(error).toBeInstanceOf(EngineError);
    expect(error).toMatchObject({ code: 'json_incompatible' });
    expect((error as Error).message).toContain("command 'act'");
    expect(result).not.toHaveBeenCalled();
    world.step();
    expect(handler).not.toHaveBeenCalled();
    expect(world.submitWithResult('act', null).sequence).toBe(0);
  });

  const shared = { n: 3 };
  it.each([
    ['null', null], ['string', 'okay'], ['number', 3], ['boolean', true],
    ['nested', [{ a: [1, null, false] }]], ['null prototype', Object.assign(Object.create(null), { n: 3 })],
    ['acyclic sharing', { a: shared, b: shared }],
  ])('P10 accepts supported JSON shape: %s', (_, data) => {
    expect(createWorld().precheckCommand('act', data)).toEqual({
      accepted: true, commandType: 'act', code: 'accepted',
      message: 'Command passed validation', details: null, tick: 0, validatorIndex: null,
    });
  });

  it.each([new Error('validator'), Object.freeze({ problem: 4 }), 'raw', null, undefined])(
    'P11 propagates validator thrown value %j unchanged', sentinel => {
      const world = createWorld();
      const later = vi.fn(() => true);
      const result = vi.fn();
      world.onCommandResult(result);
      world.registerValidator('act', () => { throw sentinel; });
      world.registerValidator('act', later);
      expect(thrownBy(() => world.precheckCommand('act', { n: 3 }))).toBe(sentinel);
      expect(later).not.toHaveBeenCalled();
      expect(result).not.toHaveBeenCalled();
    },
  );

  it.each([Object.freeze({ getter: true }), 'getter', null])(
    'P12 preserves payload and rejection-details getter throws: %j', sentinel => {
      const data = Object.defineProperty({}, 'value', { enumerable: true, get: () => { throw sentinel; } });
      const accepted = createWorld();
      expect(thrownBy(() => accepted.precheckCommand('act', data))).toBe(sentinel);
      const rejected = createWorld();
      rejected.registerValidator('act', () => ({ code: 'blocked', details: data }));
      expect(thrownBy(() => rejected.precheckCommand('act', null))).toBe(sentinel);
    },
  );

  it.each([
    [null, 'validator_invalid_return'], ['bad', 'validator_invalid_return'],
    [{ code: 3 }, 'validator_invalid_return'], [{ code: '' }, 'rejection_code_empty'],
  ])('P13 keeps invalid-validator diagnostics for %j', (value, code) => {
    const world = createWorld();
    world.registerValidator('act', () => value as CommandValidationResult);
    expect(thrownBy(() => world.precheckCommand('act', null))).toMatchObject({ code });
  });

  it('P23 legacy accepted submit still reads a getter exactly twice and detaches its payload', () => {
    const world = createWorld();
    let n = 3;
    const getter = vi.fn(() => n);
    const input = Object.defineProperty({}, 'n', { enumerable: true, get: getter });
    const received: unknown[] = [];
    world.registerHandler('act', data => { received.push(data); });
    expect(world.submitWithResult('act', input)).toEqual({
      schemaVersion: 1, accepted: true, commandType: 'act', code: 'accepted',
      message: 'Queued command', details: null, tick: 0, sequence: 0, validatorIndex: null,
    });
    expect(getter).toHaveBeenCalledTimes(2);
    n = 99;
    world.step();
    expect(received).toEqual([{ n: 3 }]);
    expect(received[0]).not.toBe(input);
  });

  it('P26 accepted toJSON returning undefined preserves the existing clone failure boundary', () => {
    const input = Object.defineProperty({ n: 3 }, 'toJSON', { value: () => undefined });
    for (const method of ['precheckCommand', 'submitWithResult'] as const) {
      const world = createWorld();
      const result = vi.fn();
      const handler = vi.fn();
      world.onCommandResult(result);
      world.registerHandler('act', handler);
      expect(thrownBy(() => world[method]('act', input))).toBeInstanceOf(SyntaxError);
      expect(result).not.toHaveBeenCalled();
      world.step();
      expect(handler).not.toHaveBeenCalled();
      expect(world.submitWithResult('act', null).sequence).toBe(0);
    }
  });

  it('P26 accepted toJSON and second-traversal getter failures retain thrown identity', () => {
    const sentinel = Object.freeze({ clone: 'failed' });
    for (const method of ['precheckCommand', 'submitWithResult'] as const) {
      const world = createWorld();
      const input = Object.defineProperty({ n: 3 }, 'toJSON', { value: () => { throw sentinel; } });
      expect(thrownBy(() => world[method]('act', input))).toBe(sentinel);
      let reads = 0;
      const changing = Object.defineProperty({}, 'n', { enumerable: true, get: () => {
        if (++reads === 2) throw sentinel;
        return 3;
      } });
      expect(thrownBy(() => world[method]('act', changing))).toBe(sentinel);
      expect(reads).toBe(2);
      expect(world.submitWithResult('act', null).sequence).toBe(0);
    }
  });
});
