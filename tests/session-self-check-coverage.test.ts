// Bound: comparisons performed against supplied snapshot-bounded recordings.
// Literal interval/end-point expectations do not use production coverage helpers.
import { describe, expect, it, vi } from 'vitest';
import {
  MemorySink, SessionRecorder, SessionReplayer, World,
  type SelfCheckResult, type SessionBundle, type WorldSnapshot,
} from '../src/index.js';

type Events = { beat: { count: number } };
type Commands = { spawn: { x: number } };
type TestWorld = World<Events, Commands, Record<string, unknown>, { count: number }>;
type Bundle = SessionBundle<Events, Commands>;

function freshWorld(onStep: () => void = () => undefined): TestWorld {
  const world = new World<Events, Commands, Record<string, unknown>, { count: number }>({
    gridWidth: 4, gridHeight: 4, tps: 60, positionKey: 'position',
  });
  world.registerHandler('spawn', () => undefined);
  world.registerSystem({ name: 'counter', phase: 'update', execute: (w) => {
    const count = (w.getState('count') ?? 0) + 1;
    w.setState('count', count);
    w.emit('beat', { count });
    onStep();
  } });
  return world;
}

function record(steps = 9, options: {
  interval?: number | null; terminal?: boolean; startTick?: number;
} = {}): Bundle {
  const world = freshWorld();
  for (let tick = 0; tick < (options.startTick ?? 0); tick++) world.step();
  const recorder = new SessionRecorder({
    world, sink: new MemorySink(), snapshotInterval: options.interval === undefined ? 5 : options.interval,
    terminalSnapshot: options.terminal ?? true,
  });
  recorder.connect();
  for (let tick = 0; tick < steps; tick++) {
    world.submit('spawn', { x: tick });
    world.step();
  }
  recorder.disconnect();
  return recorder.toBundle() as unknown as Bundle;
}

function replay(bundle: Bundle) {
  let steps = 0;
  const factory = vi.fn((snapshot: WorldSnapshot) => {
    const world = freshWorld(() => steps++);
    world.applySnapshot(snapshot);
    return world;
  });
  return { replayer: SessionReplayer.fromBundle(bundle, { worldFactory: factory }), factory,
    stepCount: () => steps };
}

function coverage(result: SelfCheckResult) {
  expect(result.coverage, 'selfCheck must always report its comparison coverage').toBeDefined();
  return result.coverage!;
}

const allChecks = { state: true, events: true, executions: true };

describe('selfCheck coverage: supplied recording, enabled comparisons and horizon only', () => {
  it('reports each complete segment and actual state comparison endpoint', () => {
    const { replayer, factory, stepCount } = replay(record());
    const result = replayer.selfCheck();
    expect(result.ok).toBe(true);
    expect(result.checkedSegments).toBe(2);
    expect(coverage(result)).toEqual({
      horizon: { fromTick: 0, toTick: 9 }, enabledChecks: allChecks,
      checkedRanges: [{ fromTick: 0, toTick: 5 }, { fromTick: 5, toTick: 9 }],
      stateComparisonTicks: [5, 9], uncoveredRanges: [], complete: true,
    });
    expect(factory).toHaveBeenCalledTimes(2);
    expect(stepCount()).toBe(9);
  });

  it('identifies the unanchored tail without replaying it', () => {
    const { replayer, factory, stepCount } = replay(record(9, { terminal: false }));
    const result = replayer.selfCheck();
    expect(result.ok).toBe(true);
    expect(result.checkedSegments).toBe(1);
    expect(coverage(result)).toEqual({
      horizon: { fromTick: 0, toTick: 9 }, enabledChecks: allChecks,
      checkedRanges: [{ fromTick: 0, toTick: 5 }], stateComparisonTicks: [5],
      uncoveredRanges: [{ fromTick: 5, toTick: 9, reason: 'no_snapshot_segment' }], complete: false,
    });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(stepCount()).toBe(5);
  });

  it('distinguishes zero snapshot segments from missing command payloads', () => {
    const { replayer, factory } = replay(record(4, { interval: null, terminal: false }));
    const result = replayer.selfCheck();
    expect(result.checkedSegments).toBe(0);
    expect(coverage(result)).toEqual({
      horizon: { fromTick: 0, toTick: 4 }, enabledChecks: allChecks, checkedRanges: [],
      stateComparisonTicks: [], uncoveredRanges: [{ fromTick: 0, toTick: 4, reason: 'no_snapshot_segment' }],
      complete: false, notRunReason: 'no_segments',
    });
    expect(factory).not.toHaveBeenCalled();
  });

  it('returns an explicit no-payload no-op and preserves its warning', () => {
    const bundle = record();
    bundle.commands = [];
    const { replayer, factory } = replay(bundle);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const result = replayer.selfCheck();
      expect(result.ok).toBe(true);
      expect(result.checkedSegments).toBe(0);
      expect(coverage(result)).toEqual({
        horizon: { fromTick: 0, toTick: 9 }, enabledChecks: allChecks, checkedRanges: [],
        stateComparisonTicks: [], uncoveredRanges: [{ fromTick: 0, toTick: 9, reason: 'no_payloads' }],
        complete: false, notRunReason: 'no_payloads',
      });
      expect(warning).toHaveBeenCalledTimes(1);
      expect(factory).not.toHaveBeenCalled();
    } finally { warning.mockRestore(); }
  });

  it('does not claim success from an empty horizon', () => {
    const { replayer, factory } = replay(record(0));
    expect(coverage(replayer.selfCheck())).toEqual({
      horizon: { fromTick: 0, toTick: 0 }, enabledChecks: allChecks, checkedRanges: [],
      stateComparisonTicks: [], uncoveredRanges: [], complete: false, notRunReason: 'empty_horizon',
    });
    expect(factory).not.toHaveBeenCalled();
  });

  it('does not claim comparisons when all checks were disabled', () => {
    const { replayer, stepCount } = replay(record());
    const result = replayer.selfCheck({ checkState: false, checkEvents: false, checkExecutions: false });
    expect(result.ok).toBe(true);
    expect(result.checkedSegments).toBe(2); // Existing attempted-segment count stays compatible.
    expect(coverage(result)).toEqual({
      horizon: { fromTick: 0, toTick: 9 }, enabledChecks: { state: false, events: false, executions: false },
      checkedRanges: [], stateComparisonTicks: [],
      uncoveredRanges: [{ fromTick: 0, toTick: 9, reason: 'all_checks_disabled' }],
      complete: false, notRunReason: 'all_checks_disabled',
    });
    expect(stepCount()).toBe(9);
  });

  it('reports selected checks without implying intermediate state comparisons', () => {
    const bundle = record();
    bundle.ticks[2].events[0].data.count += 100;
    const result = replay(bundle).replayer.selfCheck({ checkState: false });
    expect(result.ok).toBe(false);
    expect(result.eventDivergences.map(d => d.tick)).toEqual([3]);
    expect(coverage(result)).toMatchObject({
      enabledChecks: { state: false, events: true, executions: true },
      stateComparisonTicks: [], complete: true, uncoveredRanges: [],
    });
  });

  it('skips a failure endpoint and resumes after that boundary', () => {
    const bundle = record(6, { interval: 2 });
    bundle.metadata.failedTicks = [4];
    const result = replay(bundle).replayer.selfCheck();
    expect(result.skippedSegments).toEqual([{ fromTick: 2, toTick: 4, reason: 'failure_in_segment' }]);
    expect(coverage(result)).toEqual({
      horizon: { fromTick: 0, toTick: 6 }, enabledChecks: allChecks,
      checkedRanges: [{ fromTick: 0, toTick: 2 }, { fromTick: 4, toTick: 6 }], stateComparisonTicks: [2, 6],
      uncoveredRanges: [{ fromTick: 2, toTick: 4, reason: 'failure_in_segment' }], complete: false,
    });
  });

  it('reports unchecked remainder after early divergence, including a tail', () => {
    const bundle = record(7, { interval: 2, terminal: false });
    const expected = bundle.snapshots[0].snapshot;
    if (!('state' in expected)) throw new Error('Fixture requires a state-bearing snapshot');
    expected.state.count = 99;
    const result = replay(bundle).replayer.selfCheck({ stopOnFirstDivergence: true });
    expect(result.ok).toBe(false);
    expect(result.checkedSegments).toBe(1);
    expect(coverage(result)).toEqual({
      horizon: { fromTick: 0, toTick: 7 }, enabledChecks: allChecks,
      checkedRanges: [{ fromTick: 0, toTick: 2 }], stateComparisonTicks: [2],
      uncoveredRanges: [{ fromTick: 2, toTick: 7, reason: 'stopped_on_divergence' }], complete: false,
    });
  });

  it('can complete every requested comparison and still find a divergence', () => {
    const bundle = record(6, { interval: 2 });
    bundle.ticks[0].events[0].data.count = 99;
    const result = replay(bundle).replayer.selfCheck();
    expect(result.ok).toBe(false);
    expect(coverage(result).complete).toBe(true);
    expect(coverage(result).uncoveredRanges).toEqual([]);
  });

  it('distinguishes all-skipped from no snapshot segments', () => {
    const bundle = record(4, { interval: null });
    bundle.metadata.failedTicks = [4];
    const { replayer, factory } = replay(bundle);
    expect(coverage(replayer.selfCheck())).toEqual({
      horizon: { fromTick: 0, toTick: 4 }, enabledChecks: allChecks,
      checkedRanges: [], stateComparisonTicks: [],
      uncoveredRanges: [{ fromTick: 0, toTick: 4, reason: 'failure_in_segment' }],
      complete: false, notRunReason: 'all_segments_skipped',
    });
    expect(factory).not.toHaveBeenCalled();
  });

  it('recovers the complete legacy persisted bound when endTick is zero', () => {
    const bundle = record(4, { interval: null });
    bundle.metadata.endTick = 0;
    bundle.metadata.durationTicks = 0;
    const result = replay(bundle).replayer.selfCheck();
    expect(coverage(result)).toMatchObject({ horizon: { fromTick: 0, toTick: 4 },
      checkedRanges: [{ fromTick: 0, toTick: 4 }], stateComparisonTicks: [4], complete: true });
  });

  it('never constructs or checks an endpoint beyond the incomplete persisted cap', () => {
    const bundle = record();
    bundle.metadata.incomplete = true;
    bundle.metadata.persistedEndTick = 5;
    const { replayer, factory, stepCount } = replay(bundle);
    expect(coverage(replayer.selfCheck())).toEqual({
      horizon: { fromTick: 0, toTick: 5 }, enabledChecks: allChecks,
      checkedRanges: [{ fromTick: 0, toTick: 5 }], stateComparisonTicks: [5],
      uncoveredRanges: [], complete: true,
    });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(stepCount()).toBe(5);
  });

  it('does not invent coverage before a nonzero recording start', () => {
    const result = replay(record(4, { interval: null, startTick: 3 })).replayer.selfCheck();
    expect(coverage(result)).toEqual({
      horizon: { fromTick: 3, toTick: 7 }, enabledChecks: allChecks,
      checkedRanges: [{ fromTick: 3, toTick: 7 }], stateComparisonTicks: [7],
      uncoveredRanges: [], complete: true,
    });
  });

  it('rejects a missing expected tick row instead of treating its events as empty', () => {
    const bundle = record(4, { interval: null });
    bundle.ticks = bundle.ticks.filter(t => t.tick !== 3);
    expect(() => replay(bundle).replayer.selfCheck()).toThrowError(/missing_tick_entries|gapped/);
  });

  it.each([
    { ticks: 9, interval: 5, terminal: true, constructions: 2, replayTicks: 9 },
    { ticks: 9, interval: 5, terminal: false, constructions: 1, replayTicks: 5 },
    { ticks: 1000, interval: 1, terminal: true, constructions: 1000, replayTicks: 1000 },
  ])('preserves snapshot-only replay work for $ticks ticks / terminal $terminal', scenario => {
    const { replayer, factory, stepCount } = replay(record(scenario.ticks, scenario));
    replayer.selfCheck();
    expect(factory).toHaveBeenCalledTimes(scenario.constructions);
    expect(stepCount()).toBe(scenario.replayTicks);
  });

  it('orders eligible snapshot endpoints without mutating the source array', () => {
    const bundle = record();
    bundle.snapshots.reverse();
    const before = bundle.snapshots.map(s => s.tick);
    const result = replay(bundle).replayer.selfCheck();
    expect(coverage(result).checkedRanges).toEqual([{ fromTick: 0, toTick: 5 }, { fromTick: 5, toTick: 9 }]);
    expect(coverage(result).stateComparisonTicks).toEqual([5, 9]);
    expect(coverage(result).complete).toBe(true);
    expect(bundle.snapshots.map(s => s.tick)).toEqual(before);
  });

  it('keeps an old consumer result assignable while runtime returns coverage', () => {
    const old: SelfCheckResult = { ok: true, checkedSegments: 0, stateDivergences: [],
      eventDivergences: [], executionDivergences: [], skippedSegments: [] };
    expect(old.ok).toBe(true);
    expect(coverage(replay(record()).replayer.selfCheck())).toBeDefined();
  });
});