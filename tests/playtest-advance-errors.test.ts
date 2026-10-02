// Bound: both runners' synchronous callback diagnoses, observed counters, partial recording and cleanup.
import { describe, expect, it } from 'vitest';
import { MemorySink } from '../src/index.js';
import type { WorldTickFailureError } from '../src/index.js';
import { makeWorld, reconnect, run, runners } from './fixtures/advance-contract.js';
import type { TestWorld } from './fixtures/advance-contract.js';

const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

function poison(world: TestWorld): void {
  world.registerSystem({ name: 'failure', phase: 'update', execute: () => { throw new Error('literal failure'); } });
}

function forgedFailure(): WorldTickFailureError {
  const other = makeWorld(); poison(other);
  try { other.step(); } catch (e) { return e as WorldTickFailureError; }
  throw new Error('failure fixture did not poison');
}

class BrokenTickSink extends MemorySink {
  override writeTick(): void { throw new Error('literal tick sink failure'); }
}
class BrokenCloseSink extends MemorySink {
  override close(): void { super.close(); throw new Error('literal close sink failure'); }
}

describe.each(runners)('%s advance errors', (runner) => {
  it.each([0, 2])('rejects a %i-tick return before count/stopWhen and preserves partial work', async (steps) => {
    const world = makeWorld(); let calls = 0; let stops = 0;
    const result = await run(runner, world, (supplied) => {
      expect(supplied).toBe(world); calls++;
      for (let i = 0; i < steps; i++) supplied.step();
    }, { stopWhen: () => { stops++; return true; } });
    expect(result).toMatchObject({ ok: false, stopReason: 'advanceError', ticksRun: 0,
      advanceError: { fromTick: 0, toTick: steps, error: { code: 'advance_tick_delta' } } });
    expect(result.advanceError!.error.message).toMatch(/0/);
    expect(result.advanceError!.error.message).toMatch(/one|1/);
    expect(calls).toBe(1); expect(stops).toBe(0);
    expect(result.bundle.ticks.map((t) => t.tick)).toEqual(steps === 0 ? [] : [1, 2]);
    reconnect(world);
  });

  it.each([false, true])('attributes a foreign throw afterStep=%s and cleans up', async (after) => {
    const world = makeWorld(); let stops = 0;
    const thrown = new Error('literal callback error');
    const result = await run(runner, world, (supplied) => { if (after) supplied.step(); throw thrown; },
      { stopWhen: () => { stops++; return true; } });
    expect(result).toMatchObject({ ok: false, stopReason: 'advanceError', ticksRun: 0,
      advanceError: { fromTick: 0, toTick: after ? 1 : 0, error: { name: 'Error', message: thrown.message, code: null } } });
    expect(stops).toBe(0); reconnect(world);
  });

  it.each(['literal string', null])('serializes non-Error throw %j', async (thrown) => {
    const world = makeWorld();
    const result = await run(runner, world, () => { throw thrown; });
    expect(result.advanceError!.error).toEqual({ name: 'Error', message: String(thrown), stack: null, code: null });
    expect(() => JSON.stringify(result.advanceError)).not.toThrow(); reconnect(world);
  });

  it('serializes a hostile thrown value without a secondary getter failure', async () => {
    const world = makeWorld();
    const thrown = new Proxy({}, { get: () => { throw new Error('hostile error getter'); } });
    const result = await run(runner, world, () => { throw thrown; });
    expect(result).toMatchObject({ stopReason: 'advanceError', ok: false });
    expect(result.advanceError!.error).toEqual({ name: 'Error', message: '[unprintable thrown value]', stack: null, code: null });
    reconnect(world);
  });

  it('treats a forged WorldTickFailureError on an unpoisoned world as callback error', async () => {
    const world = makeWorld(); const forged = forgedFailure();
    const result = await run(runner, world, () => { throw forged; });
    expect(result).toMatchObject({ ok: false, stopReason: 'advanceError', ticksRun: 0,
      advanceError: { fromTick: 0, toTick: 0, error: { name: 'WorldTickFailureError', code: null } } });
    expect(world.isPoisoned()).toBe(false); reconnect(world);
  });

  it.each(['throw', 'swallow'] as const)('retains an actual %s poisoned tick and does not count it', async (mode) => {
    const world = makeWorld(); poison(world);
    const result = await run(runner, world, (supplied) => {
      if (mode === 'throw') supplied.step(); else supplied.stepWithResult();
    });
    expect(result.stopReason).toBe('poisoned');
    expect(result.ok).toBe(runner === 'synthetic'); // inherited default sibling difference
    expect(result.ticksRun).toBe(0); expect(result.advanceError).toBeUndefined();
    expect(result.bundle.failures).toHaveLength(1);
    expect(result.bundle.metadata.failedTicks).toEqual([1]);
  });

  it('checks a normally returned bad delta before classifying poison', async () => {
    const world = makeWorld(); poison(world);
    const result = await run(runner, world, (supplied) => {
      supplied.stepWithResult(); supplied.runMaintenance(() => supplied.recover()); supplied.stepWithResult();
    });
    expect(result).toMatchObject({ ok: false, stopReason: 'advanceError', ticksRun: 0,
      advanceError: { fromTick: 0, toTick: 2, error: { code: 'advance_tick_delta' } } });
  });

  it('prioritizes callback error over simultaneous recorder failure', async () => {
    const world = makeWorld();
    const result = await run(runner, world, (supplied) => { supplied.step(); throw new Error('after failed sink'); },
      { sink: new BrokenTickSink() });
    expect(result).toMatchObject({ stopReason: 'advanceError', ok: false, ticksRun: 0,
      advanceError: { fromTick: 0, toTick: 1, error: { message: 'after failed sink' } } });
    expect(result.bundle.metadata.incomplete).toBe(true); reconnect(world);
  });

  it('prioritizes recorder failure over counting an otherwise valid callback', async () => {
    const world = makeWorld();
    const result = await run(runner, world, (supplied) => { supplied.step(); }, { sink: new BrokenTickSink() });
    expect(result).toMatchObject({ stopReason: 'sinkError', ok: false, ticksRun: 0 });
    expect(result.advanceError).toBeUndefined(); reconnect(world);
  });

  it('retains the primary callback diagnosis when disconnect also fails', async () => {
    const world = makeWorld();
    const result = await run(runner, world, () => { throw new Error('primary'); }, { sink: new BrokenCloseSink() });
    expect(result).toMatchObject({ stopReason: 'advanceError', ok: false,
      advanceError: { error: { message: 'primary' } } });
    reconnect(world);
  });

  it('reads a throwing then getter once and retains its callback error', async () => {
    const world = makeWorld(); let getters = 0;
    const value = { get then() { getters++; throw new Error('literal then getter'); } };
    const result = await run(runner, world, () => value);
    expect(result).toMatchObject({ stopReason: 'advanceError', advanceError: {
      error: { message: 'literal then getter', code: null } } });
    expect(getters).toBe(1); reconnect(world);
  });

  it('rejects a thenable, calls the captured observer once, and retains the coded primary if it throws', async () => {
    const world = makeWorld(); let getters = 0; let observations = 0; let calls = 0;
    const value = { get then() { getters++; return function () { observations++; throw new Error('observer failure'); }; } };
    const result = await run(runner, world, () => { calls++; return value; });
    expect(result).toMatchObject({ stopReason: 'advanceError', ok: false, ticksRun: 0,
      advanceError: { fromTick: 0, toTick: 0, error: { code: 'advance_async_unsupported' } } });
    expect(result.advanceError!.error.message).toMatch(/synchronous/);
    expect([getters, observations, calls]).toEqual([1, 1, 1]); reconnect(world);
  });

  it('observes rejected native returns and rejected observer returns without supporting asynchronous work', async () => {
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => { unhandled.push(reason); };
    process.on('unhandledRejection', listener);
    try {
      for (const kind of ['native', 'observer'] as const) {
        const world = makeWorld(); let calls = 0;
        const invalidReturn = () => {
          calls++;
          if (kind === 'native') return Promise.reject(new Error('native rejection'));
          return { then: () => Promise.reject(new Error('observer return rejection')) };
        };
        // Deliberately invalid runtime return; the accepted synchronous API remains void.
        const result = await run(runner, world, invalidReturn as unknown as (supplied: TestWorld) => void);
        expect(result).toMatchObject({ stopReason: 'advanceError', ok: false,
          advanceError: { error: { code: 'advance_async_unsupported' } } });
        expect(calls).toBe(1); reconnect(world);
      }
      await nextTurn(); await nextTurn(); expect(unhandled).toEqual([]);
    } finally { process.off('unhandledRejection', listener); }
  });
});
