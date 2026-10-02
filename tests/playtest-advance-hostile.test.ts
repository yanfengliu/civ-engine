// Bound: hostile foreign throws preserve public runner diagnoses, replay identity and recorder release.
import { describe, expect, it } from 'vitest';
import { BuilderConsumedError, MemorySink, SessionRecorder, SessionReplayer } from '../src/index.js';
import { makeWorld, run, runners, worldFactory } from './fixtures/advance-contract.js';
import type { TestWorld } from './fixtures/advance-contract.js';

const kinds = ['revoked Proxy', 'throwing getPrototypeOf'] as const;
type Kind = typeof kinds[number];
function foreignThrow(kind: Kind): unknown {
  if (kind === 'revoked Proxy') {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    return proxy;
  }
  return new Proxy({ name: 'ForeignAdvance', message: 'literal prototype trap value', code: 'foreign_prototype' }, {
    getPrototypeOf: () => { throw new Error('literal secondary prototype trap failure'); },
  });
}
function expectRecorderReleased(world: TestWorld): void {
  const tick = world.tick;
  const recorder = new SessionRecorder({ world, sink: new MemorySink() });
  try { recorder.connect(); expect(recorder.isConnected).toBe(true); }
  finally { recorder.disconnect(); }
  expect(world.tick).toBe(tick);
}
async function replayFixture(advance: (world: TestWorld) => void) {
  const recording = await run('synthetic', makeWorld());
  return SessionReplayer.fromBundle(recording.bundle, { worldFactory, advance });
}

describe.each(runners)('%s hostile advance throw', runner => {
  describe.each(kinds)('%s', kind => {
    it.each([false, true])('returns the contracted diagnosis afterStep=%s and releases the recorder', async afterStep => {
      const world = makeWorld(); const thrown = foreignThrow(kind);
      let calls = 0; let stops = 0; let caught: unknown;
      let result: Awaited<ReturnType<typeof run>> | undefined;
      try {
        result = await run(runner, world, supplied => {
          expect(supplied).toBe(world); calls++;
          if (afterStep) supplied.step();
          throw thrown;
        }, { stopWhen: () => { stops++; return true; } });
      } catch (error) { caught = error; }
      expect(world.tick).toBe(afterStep ? 1 : 0);
      expect(world.isPoisoned()).toBe(false);
      expectRecorderReleased(world);
      expect(caught).toBeUndefined();
      expect(result).toMatchObject({ ok: false, stopReason: 'advanceError', ticksRun: 0,
        advanceError: { fromTick: 0, toTick: afterStep ? 1 : 0 } });
      expect(result!.advanceError!.error).toEqual(kind === 'revoked Proxy'
        ? { name: 'Error', message: '[unprintable thrown value]', stack: null, code: null }
        : { name: 'ForeignAdvance', message: 'literal prototype trap value', stack: null, code: 'foreign_prototype' });
      expect(result!.bundle.ticks.map(tick => tick.tick)).toEqual(afterStep ? [1] : []);
      expect(result!.bundle.failures).toEqual([]);
      expect([calls, stops]).toEqual([1, 0]);
    });
  });
});

describe.each(['openAt', 'selfCheck', 'forkAt'] as const)('%s hostile replay throw', entry => {
  describe.each(kinds)('%s', kind => {
    it.each([false, true])('preserves exact identity afterStep=%s', async afterStep => {
      const thrown = foreignThrow(kind); let calls = 0; let advanced: TestWorld | undefined;
      const replayer = await replayFixture(world => {
        advanced = world; calls++;
        if (afterStep) world.step();
        throw thrown;
      });
      let caught: unknown;
      try {
        if (entry === 'openAt') replayer.openAt(1);
        else if (entry === 'selfCheck') replayer.selfCheck();
        else replayer.forkAt(1);
      } catch (error) { caught = error; }
      expect(caught === thrown).toBe(true);
      expect(calls).toBe(1);
      expect(advanced!.tick).toBe(afterStep ? 1 : 0);
      expect(advanced!.isPoisoned()).toBe(false);
      expectRecorderReleased(advanced!);
    });
  });
});

describe.each([0, 1])('fork callback fromTick=%i hostile throw', fromTick => {
  describe.each(kinds)('%s', kind => {
    it.each([false, true])('preserves identity afterStep=%s and releases its recorder', async afterStep => {
      const thrown = foreignThrow(kind); let calls = 0; let advanced: TestWorld | undefined;
      const replayer = await replayFixture(world => {
        advanced = world; calls++;
        if (world.tick === fromTick) {
          if (afterStep) world.step();
          throw thrown;
        }
        world.step();
      });
      const builder = replayer.forkAt(0);
      let caught: unknown;
      try { builder.run({ untilTick: 3 }); } catch (error) { caught = error; }
      expect(advanced!.tick).toBe(fromTick + (afterStep ? 1 : 0));
      expect(advanced!.isPoisoned()).toBe(false);
      expectRecorderReleased(advanced!);
      expect(caught === thrown).toBe(true);
      expect(calls).toBe(fromTick + 1);
      expect(() => builder.snapshot()).toThrow(BuilderConsumedError);
    });
  });
});
