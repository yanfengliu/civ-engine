import { describe, expect, it, vi } from 'vitest';
import { MemorySink, SessionRecorder, World, WorldHistoryRecorder } from '../src/index.js';

const createWorld = () => new World<Record<string, never>, { act: { n: number } }>({
  gridWidth: 4, gridHeight: 4, tps: 10,
});

function repeatObservations(world: ReturnType<typeof createWorld>): void {
  for (let count = 0; count < 3; count++) {
    expect(world.precheckCommand('act', { n: 3 }).accepted).toBe(true);
    expect(world.precheckCommand('act', { n: -1 }).accepted).toBe(false);
    expect(() => world.precheckCommand('act', { n: NaN })).toThrow();
  }
}

describe('command precheck engine-owned effect boundary', () => {
  it('P14 leaves snapshots, counters, observers, registration and sequence untouched', () => {
    const world = createWorld();
    world.registerValidator('act', data => data.n !== -1);
    const observer = vi.fn();
    world.onCommandResult(observer);
    world.onCommandExecution(observer);
    world.onDiff(observer);
    world.onTickFailure(observer);
    const before = {
      snapshot: world.serialize({ inspectPoisoned: true }), metrics: world.getMetrics(),
      diff: world.getDiff(), failure: world.getLastTickFailure(), registration: world.getRegistrationManifest(),
    };
    repeatObservations(world);
    expect({
      snapshot: world.serialize({ inspectPoisoned: true }), metrics: world.getMetrics(),
      diff: world.getDiff(), failure: world.getLastTickFailure(), registration: world.getRegistrationManifest(),
    }).toEqual(before);
    expect(observer).not.toHaveBeenCalled();
    expect(world.tick).toBe(0);
    expect(world.submitWithResult('act', { n: 3 }).sequence).toBe(0);
  });

  it('P15 leaves unrelated queued work and its order intact', () => {
    const world = createWorld();
    const handled: number[] = [];
    world.registerValidator('act', data => data.n !== -1);
    world.registerHandler('act', data => { handled.push(data.n); });
    expect(world.submitWithResult('act', { n: 10 }).sequence).toBe(0);
    repeatObservations(world);
    expect(world.submitWithResult('act', { n: 20 }).sequence).toBe(1);
    world.step();
    expect(handled).toEqual([10, 20]);
    expect(world.getMetrics()?.commandStats).toMatchObject({ pendingBeforeTick: 2, processed: 2 });
    world.step();
    expect(handled).toEqual([10, 20]);
  });

  it('P16 stays absent from SessionRecorder and composed default history', () => {
    const world = createWorld();
    const handler = vi.fn();
    world.registerHandler('act', handler);
    world.registerValidator('act', data => data.n !== -1);
    const recorder = new SessionRecorder({ world, sink: new MemorySink() });
    const history = new WorldHistoryRecorder({ world });
    recorder.connect();
    try {
      history.connect();
      try {
        repeatObservations(world);
        expect(recorder.toBundle()).toMatchObject({ commands: [], executions: [], ticks: [] });
        expect(history.getState()).toMatchObject({ commands: [], executions: [], ticks: [] });
        world.submitWithResult('act', { n: 3 });
        world.step();
        expect(recorder.toBundle().commands).toHaveLength(1);
        expect(recorder.toBundle().executions).toHaveLength(1);
        expect(history.getState().commands).toHaveLength(1);
        expect(history.getState().executions).toHaveLength(1);
        expect(handler).toHaveBeenCalledTimes(1);
      } finally { history.disconnect(); }
    } finally { recorder.disconnect(); }
  });

  it('P17 stays absent from independent payload-capturing history', () => {
    const world = createWorld();
    const handler = vi.fn();
    world.registerHandler('act', handler);
    world.registerValidator('act', data => data.n !== -1);
    const history = new WorldHistoryRecorder({ world, captureCommandPayloads: true });
    history.connect();
    try {
      repeatObservations(world);
      expect(history.getState()).toMatchObject({ recordedCommands: [], commands: [], executions: [] });
      world.submitWithResult('act', { n: 3 });
      world.step();
      const recorded = history.getState();
      expect(recorded.recordedCommands).toHaveLength(1);
      expect(recorded.commands).toHaveLength(1);
      expect(recorded.executions).toHaveLength(1);
      expect(handler).toHaveBeenCalledTimes(1);
    } finally { history.disconnect(); }
  });

  it('P18 observes poison without recovering or consuming its warning latch', () => {
    const world = createWorld();
    world.registerHandler('act', () => { throw new Error('poison'); });
    world.submitWithResult('act', { n: 3 });
    expect(world.stepWithResult().ok).toBe(false);
    const before = world.serialize({ inspectPoisoned: true });
    const failure = world.getLastTickFailure();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      for (let i = 0; i < 3; i++) {
        expect(world.precheckCommand('act', { n: 3 })).toMatchObject({ accepted: true, tick: 1 });
      }
      expect(world.isPoisoned()).toBe(true);
      expect(world.getLastTickFailure()).toEqual(failure);
      expect(world.serialize({ inspectPoisoned: true })).toEqual(before);
      expect(warn).not.toHaveBeenCalled();
      world.submitWithResult('act', { n: 3 });
      expect(warn).toHaveBeenCalledTimes(1);
      world.serialize();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally { warn.mockRestore(); }
  });

  it('P21 preserves strict caller phase instead of opening a mutation window', () => {
    for (const method of ['precheckCommand', 'submitWithResult'] as const) {
      const world = createWorld();
      world.registerValidator('act', (_data, active) => { active.setState('changed', true); return true; });
      world.endSetup();
      expect(() => world[method]('act', { n: 3 })).toThrow(expect.objectContaining({ name: 'StrictModeViolationError' }));
      expect(world.getState('changed')).toBeUndefined();
    }
  });

  it('P22 forbids precheck in transaction predicates before validator effects', () => {
    const world = createWorld();
    const input = { n: 3 };
    const validator = vi.fn((data: { n: number }, active: ReturnType<typeof createWorld>) => {
      data.n = 99;
      active.setState('changed', true);
      return true;
    });
    world.registerValidator('act', validator);
    const tx = world.transaction().require(readonly => {
      (readonly as unknown as ReturnType<typeof createWorld>).precheckCommand('act', input);
      return true;
    });
    expect(() => tx.commit()).toThrow(expect.objectContaining({ code: 'transaction_precondition_side_effect' }));
    expect(validator).not.toHaveBeenCalled();
    expect(input).toEqual({ n: 3 });
    expect(world.getState('changed')).toBeUndefined();
  });
});
