// Bound: source-root TypeScript inference for the three optional callbacks and both replayer constructors.
import { expect, expectTypeOf, it } from 'vitest';
import { MemorySink, runAgentPlaytest, runSynthPlaytest, SessionReplayer } from '../src/index.js';
import { makeWorld, run, worldFactory } from './fixtures/advance-contract.js';
import type { TestWorld } from './fixtures/advance-contract.js';

it('infers the synthetic callback World from typed command/component/state input', () => {
  const input = makeWorld(); let callbacks = 0;
  const result = runSynthPlaytest({ world: input, policies: [], policySeed: 42, maxTicks: 1, advance(world) {
    expectTypeOf(world).toEqualTypeOf<TestWorld>();
    expectTypeOf(world.getState('prepared')).toEqualTypeOf<number | undefined>();
    if (world.tick < 0) {
      // @ts-expect-error: literal unknown command must not pass through an erased callback.
      world.submit('missing', { value: 1 });
      // @ts-expect-error: a known numeric state read cannot become a string.
      const wrongState: string = world.getState('prepared');
      void wrongState;
      world.patchComponent(1, 'token', data => {
        expectTypeOf(data).toEqualTypeOf<{ value: number }>();
        // @ts-expect-error: the real patch callback retains numeric component data.
        data.value = 'wrong';
      });
    }
    expect(world).toBe(input); callbacks++; world.step();
  } });
  expect(result).toMatchObject({ ok: true, ticksRun: 1 });
  expect(callbacks).toBe(1);
});

it('infers the agent callback World while preserving asynchronous driver decisions', async () => {
  const input = makeWorld(); let callbacks = 0;
  const result = await runAgentPlaytest({ world: input, agent: { decide: async () => [] }, maxTicks: 1, advance(world) {
    expectTypeOf(world).toEqualTypeOf<TestWorld>();
    expectTypeOf(world.getState('total')).toEqualTypeOf<number | undefined>();
    if (world.tick < 0) {
      // @ts-expect-error: command data retains the fixture's numeric contract.
      world.submit('add', { value: 'wrong' });
      // @ts-expect-error: a known numeric state read cannot become a string.
      const wrongState: string = world.getState('total');
      void wrongState;
    }
    expect(world).toBe(input); callbacks++; world.step();
  } });
  expect(result).toMatchObject({ ok: true, ticksRun: 1 });
  expect(callbacks).toBe(1);
});

it.each(['bundle', 'source'] as const)('infers a fresh typed replay callback from the %s factory', async (entry) => {
  const original = makeWorld();
  const sink = new MemorySink();
  const recording = await run('synthetic', original, undefined, { sink });
  let callbacks = 0;
  const config = { worldFactory, advance: (world: TestWorld) => { callbacks++; world.step(); } };
  const replayer = entry === 'bundle'
    ? SessionReplayer.fromBundle(recording.bundle, { worldFactory, advance(world) {
      expectTypeOf(world).toEqualTypeOf<TestWorld>();
      if (world.tick < 0) {
        world.patchComponent(1, 'token', data => {
          expectTypeOf(data).toEqualTypeOf<{ value: number }>();
          // @ts-expect-error: replay preserves component data without widening fork generics.
          data.value = 'wrong';
        });
      }
      expect(world).not.toBe(original); config.advance(world);
    } })
    : SessionReplayer.fromSource(sink, { worldFactory, advance(world) {
      expectTypeOf(world).toEqualTypeOf<TestWorld>();
      if (world.tick < 0) {
        // @ts-expect-error: source construction also retains command data.
        world.submit('add', { value: 'wrong' });
      }
      expect(world).not.toBe(original); config.advance(world);
    } });
  expectTypeOf(replayer.openAt(1)).toEqualTypeOf<TestWorld>();
  expect(callbacks).toBe(1);
});
