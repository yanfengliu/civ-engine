// Bound: observable native returns bypass caller then, plus the explicit unrecognized-native bound.
// Resolved hostile constructors/species isolate detection without test-worker unhandled rejections.
// Negative native-return fixtures cross the synchronous type contract through an explicit void cast.
import { describe, expect, it } from 'vitest';
import { BuilderConsumedError, EngineError, SessionReplayer } from '../src/index.js';
import { makeWorld, reconnect, run, runners, worldFactory } from './fixtures/advance-contract.js';
import type { TestWorld } from './fixtures/advance-contract.js';

const observedModes = ['throwing-getter', 'undefined', 'numeric'] as const;
const noncallableModes = ['undefined', 'numeric'] as const;
const hiddenModes = ['constructor', 'species'] as const;
const hiddenCases = hiddenModes.flatMap(mode => noncallableModes.map(thenMode => ({ mode, thenMode })));
const replayEntries = ['openAt', 'selfCheck', 'forkAt', 'forkRun'] as const;
const nextTurn = () => new Promise<void>(resolve => setImmediate(resolve));

function observableNative(mode: typeof observedModes[number], rejected = false) {
  const returned = rejected ? Promise.reject(new Error('literal observed rejection')) : Promise.resolve();
  let reads = 0;
  if (mode === 'throwing-getter') {
    void Object.defineProperty(returned, 'then', { get() { reads++; throw new Error('caller then must be bypassed'); } });
  } else {
    void Object.defineProperty(returned, 'then', { value: mode === 'undefined' ? undefined : 17 });
  }
  return { returned: Object.freeze(returned), reads: () => reads };
}

function hiddenNative(mode: typeof hiddenModes[number], thenMode: typeof noncallableModes[number] | 'throwing-getter') {
  const returned = Promise.resolve();
  const failure = new Error('literal hidden ' + mode);
  let attempts = 0; let reads = 0;
  const thenError = new Error('literal hidden then getter');
  if (thenMode === 'throwing-getter') {
    void Object.defineProperty(returned, 'then', { get() { reads++; throw thenError; } });
  } else {
    void Object.defineProperty(returned, 'then', { value: thenMode === 'undefined' ? undefined : 17 });
  }
  if (mode === 'constructor') {
    void Object.defineProperty(returned, 'constructor', { get() { attempts++; throw failure; } });
  } else {
    const constructor = Object.freeze({ get [Symbol.species]() { attempts++; throw failure; } });
    void Object.defineProperty(returned, 'constructor', { value: constructor });
  }
  return { returned: Object.freeze(returned), attempts: () => attempts, reads: () => reads, thenError };
}

describe.each(runners)('%s observable native return', runner => {
  it.each(observedModes)('retains async diagnosis and bypasses %s then after native attachment', async mode => {
    const world = makeWorld();
    const fixture = observableNative(mode);
    const descriptors = Object.getOwnPropertyDescriptors(fixture.returned);
    let callbacks = 0; let stops = 0;
    const result = await run(runner, world, supplied => {
      expect(supplied).toBe(world); callbacks++; supplied.step(); return fixture.returned as unknown as void;
    }, { maxTicks: 1, stopWhen: () => { stops++; return true; } });
    expect(result).toMatchObject({ ok: false, stopReason: 'advanceError', ticksRun: 0,
      advanceError: { fromTick: 0, toTick: 1, error: { code: 'advance_async_unsupported' } } });
    expect(result.bundle.ticks.map(entry => entry.tick)).toEqual([1]);
    expect([callbacks, stops, fixture.reads()]).toEqual([1, 0, 0]);
    expect(Object.getOwnPropertyDescriptors(fixture.returned)).toEqual(descriptors);
    reconnect(world);
  });

  it.each(observedModes)('consumes ordinary rejected native work with %s then without reading caller getters', async mode => {
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => { unhandled.push(reason); };
    process.on('unhandledRejection', listener);
    try {
      const world = makeWorld();
      const fixture = observableNative(mode, true);
      const result = await run(runner, world, supplied => { supplied.step(); return fixture.returned as unknown as void; }, { maxTicks: 1 });
      expect(result).toMatchObject({ ok: false, stopReason: 'advanceError',
        advanceError: { error: { code: 'advance_async_unsupported' } } });
      expect(fixture.reads()).toBe(0);
      await nextTurn(); await nextTurn();
      expect(unhandled).toEqual([]);
      reconnect(world);
    } finally { process.off('unhandledRejection', listener); }
  });

  it.each(hiddenCases)('documents unrecognized native $mode failure with $thenMode then', async ({ mode, thenMode }) => {
    const world = makeWorld();
    const fixture = hiddenNative(mode, thenMode);
    const descriptors = Object.getOwnPropertyDescriptors(fixture.returned);
    let callbacks = 0;
    const result = await run(runner, world, supplied => { callbacks++; supplied.step(); return fixture.returned as unknown as void; }, { maxTicks: 1 });
    // This invalid native input is outside detection/containment, not supported asynchronous advancement.
    expect(result).toMatchObject({ ok: true, stopReason: 'maxTicks', ticksRun: 1 });
    expect(result.advanceError).toBeUndefined();
    expect([callbacks, fixture.attempts()]).toEqual([1, 1]);
    expect(Object.getOwnPropertyDescriptors(fixture.returned)).toEqual(descriptors);
    reconnect(world);
  });

  it.each(hiddenModes)('preserves the original candidate getter error after native %s attachment failure', async mode => {
    const world = makeWorld();
    const fixture = hiddenNative(mode, 'throwing-getter');
    const descriptors = Object.getOwnPropertyDescriptors(fixture.returned);
    let callbacks = 0;
    const result = await run(runner, world, supplied => { callbacks++; supplied.step(); return fixture.returned as unknown as void; }, { maxTicks: 1 });
    expect(result).toMatchObject({ ok: false, stopReason: 'advanceError', ticksRun: 0,
      advanceError: { fromTick: 0, toTick: 1, error: { message: 'literal hidden then getter', code: null } } });
    expect([callbacks, fixture.attempts(), fixture.reads()]).toEqual([1, 1, 1]);
    expect(Object.getOwnPropertyDescriptors(fixture.returned)).toEqual(descriptors);
    reconnect(world);
  });
  it('keeps a spoofed Promise-tag synchronous report without observing its constructor', async () => {
    const world = makeWorld(); let constructorReads = 0;
    const returned = Object.freeze({ [Symbol.toStringTag]: 'Promise', then: 17, get constructor() { constructorReads++; throw new Error('not a Promise'); } });
    const result = await run(runner, world, supplied => { supplied.step(); return returned; }, { maxTicks: 1 });
    expect(result).toMatchObject({ ok: true, ticksRun: 1 });
    expect(constructorReads).toBe(0);
    reconnect(world);
  });
});

describe.each(replayEntries)('%s observable native return', entry => {
  it.each(observedModes)('retains code and bypasses %s then in replay/fork', async mode => {
    const recording = await run('synthetic', makeWorld());
    const fixture = observableNative(mode);
    const descriptors = Object.getOwnPropertyDescriptors(fixture.returned);
    let callbacks = 0; let advanced: TestWorld | undefined;
    const replayer = SessionReplayer.fromBundle(recording.bundle, { worldFactory, advance: world => {
      advanced = world; callbacks++; world.step(); return fixture.returned as unknown as void;
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
      fromTick: 0, toTick: 1, expectedTick: 1, observationError: null,
    } });
    expect([callbacks, fixture.reads()]).toEqual([1, 0]);
    expect(Object.getOwnPropertyDescriptors(fixture.returned)).toEqual(descriptors);
    expect(advanced).toBeDefined();
    reconnect(advanced!);
    if (builder) expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
  });

  it.each(hiddenModes)('preserves candidate getter identity after native %s observation failure', async mode => {
    const recording = await run('synthetic', makeWorld());
    const fixture = hiddenNative(mode, 'throwing-getter');
    const descriptors = Object.getOwnPropertyDescriptors(fixture.returned);
    let callbacks = 0; let advanced: TestWorld | undefined;
    const replayer = SessionReplayer.fromBundle(recording.bundle, { worldFactory, advance: world => {
      advanced = world; callbacks++; world.step(); return fixture.returned as unknown as void;
    } });
    const builder = entry === 'forkRun' ? replayer.forkAt(0) : undefined;
    let thrown: unknown;
    try {
      if (entry === 'openAt') replayer.openAt(1);
      else if (entry === 'selfCheck') replayer.selfCheck();
      else if (entry === 'forkAt') replayer.forkAt(1);
      else builder!.run({ untilTick: 2 });
    } catch (error) { thrown = error; }
    expect(thrown).toBe(fixture.thenError);
    expect([callbacks, fixture.attempts(), fixture.reads()]).toEqual([1, 1, 1]);
    expect(Object.getOwnPropertyDescriptors(fixture.returned)).toEqual(descriptors);
    reconnect(advanced!);
    if (builder) expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
  });
  it.each(hiddenCases)('keeps the explicit hidden $mode/$thenMode detection bound', async ({ mode, thenMode }) => {
    const recording = await run('synthetic', makeWorld());
    const fixture = hiddenNative(mode, thenMode);
    const descriptors = Object.getOwnPropertyDescriptors(fixture.returned);
    let callbacks = 0;
    const replayer = SessionReplayer.fromBundle(recording.bundle, { worldFactory, advance: world => {
      callbacks++; world.step(); return fixture.returned as unknown as void;
    } });
    if (entry === 'openAt') expect(replayer.openAt(1).tick).toBe(1);
    else if (entry === 'selfCheck') expect(replayer.selfCheck()).toMatchObject({ ok: true, coverage: { complete: true } });
    else if (entry === 'forkAt') expect(replayer.forkAt(1).snapshot().tick).toBe(1);
    else {
      const builder = replayer.forkAt(0);
      expect(builder.run({ untilTick: 2 }).bundle.ticks.map(tick => tick.tick)).toEqual([1, 2]);
      expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
    }
    const expectedCalls = entry === 'selfCheck' ? 3 : entry === 'forkRun' ? 2 : 1;
    expect([callbacks, fixture.attempts()]).toEqual([expectedCalls, expectedCalls]);
    expect(Object.getOwnPropertyDescriptors(fixture.returned)).toEqual(descriptors);
  });
});
