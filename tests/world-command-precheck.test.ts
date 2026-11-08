import { describe, expect, it, vi } from 'vitest';
import { World } from '../src/index.js';

const createWorld = () => new World<Record<string, never>, { act: { n: number } }>({
  gridWidth: 4, gridHeight: 4, tps: 10,
});

describe('World.precheckCommand', () => {
  it('P01 observes seven literal fields without requiring a handler', () => {
    const world = createWorld();
    expect(world.precheckCommand('act', { n: 3 })).toEqual({
      accepted: true, commandType: 'act', code: 'accepted',
      message: 'Command passed validation', details: null, tick: 0, validatorIndex: null,
    });
  });

  it('P02 leaves missing-handler failure at execution, with first sequence zero', () => {
    const world = createWorld();
    expect(world.precheckCommand('act', { n: 3 }).accepted).toBe(true);
    expect(world.submitWithResult('act', { n: 3 })).toMatchObject({ accepted: true, sequence: 0 });
    expect(world.stepWithResult()).toMatchObject({ ok: false, failure: { code: 'missing_handler' } });
  });

  it('P03 stops once at the second validator and preserves its literal rejection', () => {
    const world = createWorld();
    const order: number[] = [];
    world.registerValidator('act', () => { order.push(0); return true; });
    world.registerValidator('act', () => {
      order.push(1);
      return { code: 'no_budget', message: 'Need 4 wood', details: { cost: 4, have: 2 } };
    });
    const later = vi.fn(() => { throw new Error('must not run'); });
    world.registerValidator('act', later);
    expect(world.precheckCommand('act', { n: 3 })).toEqual({
      accepted: false, commandType: 'act', code: 'no_budget', message: 'Need 4 wood',
      details: { cost: 4, have: 2 }, tick: 0, validatorIndex: 1,
    });
    expect(order).toEqual([0, 1]);
    expect(later).not.toHaveBeenCalled();
  });

  it.each([
    [false, 'validation_failed'], [{ code: 'blocked' }, 'blocked'],
  ] as const)('P04 preserves normalized defaults for %j', (rejection, code) => {
    const world = createWorld();
    world.registerValidator('act', () => rejection);
    expect(world.precheckCommand('act', { n: 3 })).toEqual({
      accepted: false, commandType: 'act', code, message: 'Validation failed',
      details: null, tick: 0, validatorIndex: 0,
    });
  });

  it('P05 calls all passing validators once in order with the original input and World', () => {
    const world = createWorld();
    const input = { n: 3 };
    const order: number[] = [];
    for (const index of [0, 1, 2]) world.registerValidator('act', (data, active) => {
      expect(data).toBe(input);
      expect(active).toBe(world);
      order.push(index);
      return true;
    });
    expect(world.precheckCommand('act', input).validatorIndex).toBeNull();
    expect(order).toEqual([0, 1, 2]);
  });

  it('P06 detaches nested rejection details from the validator and other results', () => {
    const world = createWorld();
    const details = { costs: [{ amount: 4 }] };
    world.registerValidator('act', () => ({ code: 'budget', details }));
    const first = world.precheckCommand('act', { n: 3 });
    details.costs[0].amount = 8;
    const second = world.precheckCommand('act', { n: 3 });
    expect(first.details).toEqual({ costs: [{ amount: 4 }] });
    (first.details as typeof details).costs[0].amount = 12;
    expect(second.details).toEqual({ costs: [{ amount: 8 }] });
    expect(details).toEqual({ costs: [{ amount: 8 }] });
  });

  it('P19 later submission revalidates, while an already queued command does not', () => {
    const world = createWorld();
    let budget = 4;
    const validate = vi.fn(() => budget >= 4 ? true : { code: 'no_budget' });
    const handler = vi.fn();
    world.registerValidator('act', validate);
    world.registerHandler('act', handler);
    const input = { n: 3 };
    expect(world.precheckCommand('act', input).accepted).toBe(true);
    const staged = structuredClone(input);
    budget = 0;
    expect(world.submitWithResult('act', staged)).toMatchObject({ accepted: false, code: 'no_budget', sequence: 0 });
    world.step();
    expect(handler).not.toHaveBeenCalled();
    budget = 4;
    expect(world.submitWithResult('act', staged).accepted).toBe(true);
    budget = 0;
    world.step();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledTimes(3);
  });

  it('P20 leaves validator input and World side effects visible on accept, reject and throw', () => {
    for (const outcome of ['accept', 'reject', 'throw']) {
      const world = createWorld();
      const input = { n: 3 };
      const sentinel = Object.freeze({ reason: 'callback' });
      world.registerValidator('act', (data, active) => {
        data.n += 1;
        active.setState('observed', data.n);
        return true;
      });
      world.registerValidator('act', (data, active) => {
        expect(data.n).toBe(4);
        expect(active.getState('observed')).toBe(4);
        if (outcome === 'throw') throw sentinel;
        return outcome === 'accept';
      });
      if (outcome === 'throw') {
        let caught: unknown;
        try { world.precheckCommand('act', input); } catch (error) { caught = error; }
        expect(caught).toBe(sentinel);
      } else expect(world.precheckCommand('act', input).accepted).toBe(outcome === 'accept');
      expect(input.n).toBe(4);
      expect(world.getState('observed')).toBe(4);
    }
  });

  it('P24 repeats validation against current state and input without reserving acceptance', () => {
    const world = createWorld();
    let budget = 4;
    const validator = vi.fn((data: { n: number }) => data.n <= budget ? true : { code: 'no_budget' });
    world.registerValidator('act', validator);
    const input = { n: 3 };
    expect(world.precheckCommand('act', input).accepted).toBe(true);
    budget = 2;
    expect(world.precheckCommand('act', input)).toMatchObject({ accepted: false, code: 'no_budget' });
    input.n = 1;
    expect(world.precheckCommand('act', input).accepted).toBe(true);
    expect(validator).toHaveBeenCalledTimes(3);
  });

  it('P25 matches existing submission ticks in systems and published diffs without advancing', () => {
    const world = createWorld();
    const ticks: number[] = [];
    const published: number[] = [];
    world.registerSystem(active => { ticks.push(active.precheckCommand('act', { n: 3 }).tick); });
    world.onDiff(() => { published.push(world.precheckCommand('act', { n: 3 }).tick); });
    world.step();
    world.step();
    // Coordinator-approved fixture correction: current helper observes published
    // metrics/diffs rather than activeMetrics. Preserve the existing API contract.
    expect(ticks).toEqual([0, 1]);
    expect(published).toEqual([1, 2]);
    expect(world.tick).toBe(2);
    const submitted = createWorld();
    const submissionTicks: number[] = [];
    submitted.registerHandler('act', () => undefined);
    submitted.registerSystem(active => { submissionTicks.push(active.submitWithResult('act', { n: 3 }).tick); });
    submitted.step();
    submitted.step();
    expect(submissionTicks).toEqual([0, 1]);
    expect(ticks).toEqual(submissionTicks);
  });
});
