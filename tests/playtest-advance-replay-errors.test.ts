// Bound: replay/fork foreign identity, contract errors and actual failure classification with cleanup.
import { describe, expect, it } from 'vitest';
import { BuilderConsumedError, EngineError, MemorySink, SessionRecorder, SessionReplayer, WorldTickFailureError } from '../src/index.js';
import { makeWorld, reconnect, run, worldFactory } from './fixtures/advance-contract.js';
import type { TestWorld } from './fixtures/advance-contract.js';

const entries = ['openAt', 'selfCheck', 'forkAt', 'forkRun'] as const;
function fail(world: TestWorld): void {
  world.registerSystem({ name: 'literal replay failure', phase: 'update', execute: () => { throw new Error('literal system failure'); } });
}
function forgedFailure(): WorldTickFailureError {
  const other = makeWorld(); fail(other);
  try { other.step(); } catch (error) { return error as WorldTickFailureError; }
  throw new Error('literal fixture failed to poison');
}

async function fixture(advance: (world: TestWorld) => void) {
  const recording = await run('synthetic', makeWorld());
  const worlds: TestWorld[] = [];
  const replayer = SessionReplayer.fromBundle(recording.bundle, {
    worldFactory: snapshot => { const world = worldFactory(snapshot); worlds.push(world); return world; }, advance,
  });
  return { replayer, worlds };
}

describe.each(entries)('%s configured error contract', entry => {
  it.each([false, true])('preserves foreign throw identity afterStep=%s and recorder cleanup', async afterStep => {
    const thrown = Object.freeze({ literal: 'foreign thrown value' });
    let calls = 0; let advanced: TestWorld | undefined;
    const { replayer } = await fixture(world => { advanced = world; calls++; if (afterStep) world.step(); throw thrown; });
    const builder = entry === 'forkRun' ? replayer.forkAt(0) : undefined;
    let caught: unknown;
    try {
      if (entry === 'openAt') replayer.openAt(1);
      else if (entry === 'selfCheck') replayer.selfCheck();
      else if (entry === 'forkAt') replayer.forkAt(1);
      else builder!.run({ untilTick: 2 });
    } catch (error) { caught = error; }
    expect(caught).toBe(thrown);
    expect(calls).toBe(1);
    expect(advanced!.tick).toBe(afterStep ? 1 : 0);
    reconnect(advanced!);
    if (builder) expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
  });

  it.each([0, 2])('rejects literal %i-step return without a completed replay result', async steps => {
    let calls = 0; let advanced: TestWorld | undefined;
    const { replayer } = await fixture(world => {
      advanced = world; calls++;
      for (let tick = 0; tick < steps; tick++) world.step();
    });
    const builder = entry === 'forkRun' ? replayer.forkAt(0) : undefined;
    let caught: unknown;
    try {
      if (entry === 'openAt') replayer.openAt(1);
      else if (entry === 'selfCheck') replayer.selfCheck();
      else if (entry === 'forkAt') replayer.forkAt(1);
      else builder!.run({ untilTick: 2 });
    } catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught).toMatchObject({ code: 'advance_tick_delta', details: { fromTick: 0, toTick: steps, expectedTick: 1 } });
    expect(calls).toBe(1);
    reconnect(advanced!);
    if (builder) expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
  });

  it('rethrows forged failure identity instead of fabricating poison or a partial fork', async () => {
    const thrown = forgedFailure();
    let calls = 0; let advanced: TestWorld | undefined;
    const { replayer } = await fixture(world => { advanced = world; calls++; throw thrown; });
    const builder = entry === 'forkRun' ? replayer.forkAt(0) : undefined;
    let caught: unknown;
    try {
      if (entry === 'openAt') replayer.openAt(1);
      else if (entry === 'selfCheck') replayer.selfCheck();
      else if (entry === 'forkAt') replayer.forkAt(1);
      else builder!.run({ untilTick: 2 });
    } catch (error) { caught = error; }
    expect(caught).toBe(thrown);
    expect(calls).toBe(1);
    expect(advanced!.isPoisoned()).toBe(false);
    reconnect(advanced!);
    if (builder) expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
  });

  it('reads a nonnative throwing then getter once and preserves its foreign identity', async () => {
    const thrown = new Error('literal candidate getter failure');
    let reads = 0; let calls = 0; let advanced: TestWorld | undefined;
    const returned = Object.freeze({ get then() { reads++; throw thrown; } });
    const { replayer } = await fixture(world => { advanced = world; calls++; world.step(); return returned; });
    const builder = entry === 'forkRun' ? replayer.forkAt(0) : undefined;
    let caught: unknown;
    try {
      if (entry === 'openAt') replayer.openAt(1);
      else if (entry === 'selfCheck') replayer.selfCheck();
      else if (entry === 'forkAt') replayer.forkAt(1);
      else builder!.run({ untilTick: 2 });
    } catch (error) { caught = error; }
    expect(caught).toBe(thrown);
    expect([calls, reads]).toEqual([1, 1]);
    reconnect(advanced!);
    if (builder) expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
  });
});

it.each(['openAt', 'selfCheck', 'forkAt'] as const)('%s propagates a swallowed live tick failure', async entry => {
  let calls = 0; let advanced: TestWorld | undefined;
  const { replayer } = await fixture(world => { advanced = world; calls++; fail(world); world.stepWithResult(); });
  let caught: unknown;
  try {
    if (entry === 'openAt') replayer.openAt(1);
    else if (entry === 'selfCheck') replayer.selfCheck();
    else replayer.forkAt(1);
  } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(WorldTickFailureError);
  expect(caught).toMatchObject({ failure: { tick: 1 } });
  expect(calls).toBe(1);
  expect(advanced!.isPoisoned()).toBe(true);
});

it.each([0, 1])('fork preserves live failure at callback fromTick=%i as a partial recording', async fromTick => {
  let calls = 0; let advanced: TestWorld | undefined;
  const { replayer } = await fixture(world => {
    advanced = world; calls++;
    if (world.tick === fromTick) { fail(world); world.stepWithResult(); } else world.step();
  });
  const builder = replayer.forkAt(0);
  const result = builder.run({ untilTick: 3 });
  expect(calls).toBe(fromTick + 1);
  expect(result.bundle.metadata.failedTicks).toEqual([fromTick + 1]);
  expect(result.bundle.failures).toHaveLength(1);
  expect(result.bundle.failures[0].tick).toBe(fromTick + 1);
  expect(advanced!.tick).toBe(fromTick + 1);
  expect(advanced!.isPoisoned()).toBe(true);
  expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
  // Recovery satisfies connect()'s poison guard; no step is needed to prove recorder release.
  advanced!.recover();
  expect(advanced!.tick).toBe(fromTick + 1);
  expect(advanced!.isPoisoned()).toBe(false);
  const recorder = new SessionRecorder({ world: advanced!, sink: new MemorySink() });
  try { recorder.connect(); expect(recorder.isConnected).toBe(true); } finally { recorder.disconnect(); }
});
