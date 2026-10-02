// Bound: public runner/replay/fork diagnoses and caller identity when native observation fails.
// These resolved Promises exercise the failure path without emitting an unhandled test-worker rejection.
// Actual rejected hostile native events have a separate isolated receipt in work73.
// Negative native-return fixtures cross the synchronous type contract through an explicit void cast.
import { describe, expect, it } from 'vitest';
import { BuilderConsumedError, EngineError, SessionReplayer } from '../src/index.js';
import { makeWorld, reconnect, run, runners, worldFactory } from './fixtures/advance-contract.js';
import type { TestWorld } from './fixtures/advance-contract.js';

const modes = ['constructor', 'species'] as const;
type Mode = typeof modes[number];

function hostileResolvedPromise(mode: Mode): Promise<void> {
  const returned = Promise.resolve();
  const error = new Error('literal ' + mode + ' observation failure');
  if (mode === 'constructor') {
    void Object.defineProperty(returned, 'constructor', { get() { throw error; } });
  } else {
    const constructor = Object.freeze({ get [Symbol.species]() { throw error; } });
    void Object.defineProperty(returned, 'constructor', { value: constructor });
  }
  return Object.freeze(returned);
}

describe.each(runners)('%s native Promise observation failure', (runner) => {
  it.each(modes)('retains the coded diagnosis, partial tick and frozen %s input', async (mode) => {
    const world = makeWorld();
    const returned = hostileResolvedPromise(mode);
    const descriptors = Object.getOwnPropertyDescriptors(returned);
    let calls = 0; let stops = 0;
    const result = await run(runner, world, (supplied) => {
      expect(supplied).toBe(world); calls++; supplied.step(); return returned as unknown as void;
    }, { stopWhen: () => { stops++; return true; } });
    expect(result).toMatchObject({ ok: false, stopReason: 'advanceError', ticksRun: 0,
      advanceError: { fromTick: 0, toTick: 1, error: { code: 'advance_async_unsupported' } } });
    expect(result.bundle.ticks.map(entry => entry.tick)).toEqual([1]);
    expect(result.advanceError!.error.message).toMatch(/not cancelled/);
    expect([calls, stops]).toEqual([1, 0]);
    expect(Object.isFrozen(returned)).toBe(true);
    expect(Object.getOwnPropertyDescriptors(returned)).toEqual(descriptors);
    reconnect(world);
  });
});

describe.each(['openAt', 'selfCheck', 'forkAt', 'forkRun'] as const)('%s native observation failure', (entry) => {
  it.each(modes)('retains primary code and safe %s error details without mutating input', async (mode) => {
    const recording = await run('synthetic', makeWorld());
    const returned = hostileResolvedPromise(mode);
    const descriptors = Object.getOwnPropertyDescriptors(returned);
    let calls = 0;
    let advancedWorld: TestWorld | undefined;
    const replayer = SessionReplayer.fromBundle(recording.bundle, { worldFactory, advance: (world) => {
      advancedWorld = world; calls++; world.step(); return returned as unknown as void;
    } });
    const builder = entry === 'forkRun' ? replayer.forkAt(0) : undefined;
    let thrown: unknown;
    try {
      if (entry === 'openAt') replayer.openAt(1);
      else if (entry === 'selfCheck') replayer.selfCheck();
      else if (entry === 'forkAt') replayer.forkAt(1);
      else builder!.run({ untilTick: 2 });
    } catch (error) { thrown = error; }
    expect(thrown).toBeInstanceOf(EngineError);
    expect(thrown).toMatchObject({ code: 'advance_async_unsupported', details: {
      fromTick: 0, toTick: 1, expectedTick: 1, observationError: {
        name: 'Error', message: 'literal ' + mode + ' observation failure', code: null,
      },
    } });
    expect(calls).toBe(1);
    expect(Object.isFrozen(returned)).toBe(true);
    expect(Object.getOwnPropertyDescriptors(returned)).toEqual(descriptors);
    expect(advancedWorld).toBeDefined();
    reconnect(advancedWorld!);
    if (builder) expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
  });
});
