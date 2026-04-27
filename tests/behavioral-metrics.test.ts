import { describe, expect, it } from 'vitest';
import {
  bundleCount,
  commandRateStats,
  commandTypeCounts,
  commandValidationAcceptanceRate,
  compareMetricsResults,
  eventRateStats,
  eventTypeCounts,
  executionFailureRate,
  failedTickRate,
  failureBundleRate,
  incompleteBundleRate,
  runMetrics,
  sessionLengthStats,
} from '../src/behavioral-metrics.js';
import type {
  Metric,
  NumericDelta,
  Stats,
} from '../src/behavioral-metrics.js';
import type {
  CommandSubmissionResult,
  CommandExecutionResult,
} from '../src/world.js';
import type { SessionBundle } from '../src/index.js';

const mkBundle = (overrides: Partial<SessionBundle> = {}): SessionBundle =>
  ({
    schemaVersion: 1,
    metadata: {
      sessionId: 's-1',
      engineVersion: '0.8.2',
      nodeVersion: 'v20',
      recordedAt: 't',
      startTick: 0,
      endTick: 10,
      persistedEndTick: 10,
      durationTicks: 10,
      sourceKind: 'session',
    },
    initialSnapshot: {} as never,
    ticks: [],
    commands: [],
    executions: [],
    failures: [],
    snapshots: [],
    markers: [],
    attachments: [],
    ...overrides,
  }) as SessionBundle;

const mkSubmissionResult = (accepted: boolean): CommandSubmissionResult => ({
  schemaVersion: 1 as never,
  accepted,
  commandType: 'spawn',
  code: accepted ? 'OK' : 'REJECT',
  message: '',
  details: null,
  tick: 0,
  sequence: 0,
  validatorIndex: null,
});

const mkCommand = (type: string = 'spawn', accepted: boolean = true) => ({
  submissionTick: 0,
  sequence: 0,
  type,
  data: { id: 1 },
  result: { ...mkSubmissionResult(accepted), commandType: type },
});

const mkExecution = (executed: boolean): CommandExecutionResult => ({
  schemaVersion: 1 as never,
  submissionSequence: 0,
  executed,
  commandType: 'spawn',
  code: executed ? 'OK' : 'command_handler_threw',
  message: '',
  details: null,
  tick: 1,
});

// ---------- Stats type ----------
describe('Stats shape', () => {
  it('numeric fields are number | null and JSON-round-trip preserves null', () => {
    const empty: Stats = { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
    expect(JSON.parse(JSON.stringify(empty))).toEqual(empty);
  });
});

// ---------- bundleCount ----------
describe('bundleCount', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [bundleCount()]).bundleCount).toBe(0);
  });
  it('counts correctly across multi-bundle corpora', () => {
    expect(runMetrics([mkBundle(), mkBundle(), mkBundle()], [bundleCount()]).bundleCount).toBe(3);
  });
});

// ---------- sessionLengthStats ----------
describe('sessionLengthStats', () => {
  it('empty corpus returns count:0 + null fields', () => {
    expect(runMetrics([], [sessionLengthStats()]).sessionLengthStats).toEqual({
      count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null,
    });
  });
  it('single-bundle corpus has degenerate equal stats', () => {
    const b = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 42 } });
    const s = runMetrics([b], [sessionLengthStats()]).sessionLengthStats as Stats;
    expect(s).toEqual({ count: 1, min: 42, max: 42, mean: 42, p50: 42, p95: 42, p99: 42 });
  });
  it('multi-bundle corpus matches NumPy linear / R type 7 percentiles', () => {
    // values [10,20,30,40,50] → p50=30, p95=48, p99=49.6
    const bs = [10, 20, 30, 40, 50].map((v) => mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: v } }));
    const s = runMetrics(bs, [sessionLengthStats()]).sessionLengthStats as Stats;
    expect(s.count).toBe(5);
    expect(s.min).toBe(10);
    expect(s.max).toBe(50);
    expect(s.mean).toBe(30);
    expect(s.p50).toBe(30);
    expect(s.p95).toBeCloseTo(48, 6);
    expect(s.p99).toBeCloseTo(49.6, 6);
  });
});

// ---------- commandRateStats ----------
describe('commandRateStats', () => {
  it('empty corpus → null Stats', () => {
    const s = runMetrics([], [commandRateStats()]).commandRateStats as Stats;
    expect(s.count).toBe(0);
    expect(s.min).toBeNull();
  });
  it('zero-durationTicks contributes 0 (no divide-by-zero)', () => {
    const b = mkBundle({
      metadata: { ...mkBundle().metadata, durationTicks: 0 },
      commands: [mkCommand()] as never,
    });
    const s = runMetrics([b], [commandRateStats()]).commandRateStats as Stats;
    expect(s.min).toBe(0);
  });
  it('per-bundle rate: commands.length / durationTicks', () => {
    const a = mkBundle({
      metadata: { ...mkBundle().metadata, durationTicks: 10 },
      commands: Array.from({ length: 10 }, () => mkCommand()) as never,  // rate 1.0
    });
    const b = mkBundle({
      metadata: { ...mkBundle().metadata, durationTicks: 10 },
      commands: Array.from({ length: 5 }, () => mkCommand()) as never,  // rate 0.5
    });
    const s = runMetrics([a, b], [commandRateStats()]).commandRateStats as Stats;
    expect(s.min).toBe(0.5);
    expect(s.max).toBe(1.0);
    expect(s.mean).toBe(0.75);
  });
});

// ---------- eventRateStats ----------
describe('eventRateStats', () => {
  it('empty corpus → null Stats', () => {
    expect((runMetrics([], [eventRateStats()]).eventRateStats as Stats).count).toBe(0);
  });
  it('per-bundle rate: sum of events / durationTicks', () => {
    const b = mkBundle({
      metadata: { ...mkBundle().metadata, durationTicks: 10 },
      ticks: [
        { tick: 1, diff: {} as never, events: [{ type: 'a', data: {} }, { type: 'b', data: {} }], metrics: null, debug: null },
        { tick: 2, diff: {} as never, events: [{ type: 'c', data: {} }], metrics: null, debug: null },
      ] as never,
    });
    const s = runMetrics([b], [eventRateStats()]).eventRateStats as Stats;
    expect(s.min).toBe(0.3);  // 3 events / 10 ticks
  });
});

// ---------- commandTypeCounts ----------
describe('commandTypeCounts', () => {
  it('empty corpus → {}', () => {
    expect(runMetrics([], [commandTypeCounts()]).commandTypeCounts).toEqual({});
  });
  it('aggregates type counts across bundles', () => {
    const a = mkBundle({ commands: [mkCommand('move'), mkCommand('spawn'), mkCommand('move')] as never });
    const b = mkBundle({ commands: [mkCommand('attack'), mkCommand('move')] as never });
    expect(runMetrics([a, b], [commandTypeCounts()]).commandTypeCounts).toEqual({
      move: 3, spawn: 1, attack: 1,
    });
  });
});

// ---------- eventTypeCounts ----------
describe('eventTypeCounts', () => {
  it('empty corpus → {}', () => {
    expect(runMetrics([], [eventTypeCounts()]).eventTypeCounts).toEqual({});
  });
  it('aggregates event types across all ticks', () => {
    const b = mkBundle({
      ticks: [
        { tick: 1, diff: {} as never, events: [{ type: 'fire', data: {} }, { type: 'spawn', data: {} }], metrics: null, debug: null },
        { tick: 2, diff: {} as never, events: [{ type: 'fire', data: {} }], metrics: null, debug: null },
      ] as never,
    });
    expect(runMetrics([b], [eventTypeCounts()]).eventTypeCounts).toEqual({ fire: 2, spawn: 1 });
  });
});

// ---------- failureBundleRate ----------
describe('failureBundleRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [failureBundleRate()]).failureBundleRate).toBe(0);
  });
  it('all-clean → 0', () => {
    expect(runMetrics([mkBundle(), mkBundle()], [failureBundleRate()]).failureBundleRate).toBe(0);
  });
  it('mixed → ratio', () => {
    const failing = mkBundle({ metadata: { ...mkBundle().metadata, failedTicks: [3] } });
    expect(runMetrics([mkBundle(), failing, mkBundle(), failing], [failureBundleRate()]).failureBundleRate).toBe(0.5);
  });
});

// ---------- failedTickRate ----------
describe('failedTickRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [failedTickRate()]).failedTickRate).toBe(0);
  });
  it('zero-tick corpus → 0 (no divide-by-zero)', () => {
    const aborted = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 0 } });
    expect(runMetrics([aborted, aborted], [failedTickRate()]).failedTickRate).toBe(0);
  });
  it('total failed ticks / total duration ticks', () => {
    const a = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 100, failedTicks: [50] } });
    const b = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 100, failedTicks: [] } });
    expect(runMetrics([a, b], [failedTickRate()]).failedTickRate).toBe(0.005);
  });
});

// ---------- incompleteBundleRate ----------
describe('incompleteBundleRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [incompleteBundleRate()]).incompleteBundleRate).toBe(0);
  });
  it('mixed → ratio', () => {
    const inc = mkBundle({ metadata: { ...mkBundle().metadata, incomplete: true } });
    expect(runMetrics([mkBundle(), inc, mkBundle(), inc], [incompleteBundleRate()]).incompleteBundleRate).toBe(0.5);
  });
});

// ---------- commandValidationAcceptanceRate ----------
describe('commandValidationAcceptanceRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0);
  });
  it('zero-submission corpus → 0', () => {
    expect(runMetrics([mkBundle()], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0);
  });
  it('reads bundle.commands[].result.accepted', () => {
    const b = mkBundle({
      commands: [mkCommand('spawn', true), mkCommand('spawn', true), mkCommand('spawn', false), mkCommand('spawn', true)] as never,
    });
    expect(runMetrics([b], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0.75);
  });
});

// ---------- executionFailureRate ----------
describe('executionFailureRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [executionFailureRate()]).executionFailureRate).toBe(0);
  });
  it('zero-execution corpus → 0', () => {
    expect(runMetrics([mkBundle()], [executionFailureRate()]).executionFailureRate).toBe(0);
  });
  it('reads bundle.executions[].executed', () => {
    const b = mkBundle({
      executions: [mkExecution(true), mkExecution(false), mkExecution(true), mkExecution(false)] as never,
    });
    expect(runMetrics([b], [executionFailureRate()]).executionFailureRate).toBe(0.5);
  });
});

// ---------- runMetrics ----------
describe('runMetrics', () => {
  it('multiplexes 11 built-ins in a single pass (verified by side-effecting iterator counter)', () => {
    let bundlesIterated = 0;
    function* source(count: number): Generator<SessionBundle> {
      for (let i = 0; i < count; i++) {
        bundlesIterated++;
        yield mkBundle();
      }
    }
    const metrics: Metric<unknown, unknown>[] = [
      bundleCount() as Metric<unknown, unknown>,
      sessionLengthStats() as Metric<unknown, unknown>,
      commandRateStats() as Metric<unknown, unknown>,
      eventRateStats() as Metric<unknown, unknown>,
      commandTypeCounts() as Metric<unknown, unknown>,
      eventTypeCounts() as Metric<unknown, unknown>,
      failureBundleRate() as Metric<unknown, unknown>,
      failedTickRate() as Metric<unknown, unknown>,
      incompleteBundleRate() as Metric<unknown, unknown>,
      commandValidationAcceptanceRate() as Metric<unknown, unknown>,
      executionFailureRate() as Metric<unknown, unknown>,
    ];
    const result = runMetrics(source(5), metrics);
    expect(bundlesIterated).toBe(5);  // not 5*11 = 55
    expect(Object.keys(result)).toHaveLength(11);
    expect(result.bundleCount).toBe(5);
  });

  it('throws RangeError on duplicate metric names', () => {
    expect(() => runMetrics([], [bundleCount(), bundleCount()])).toThrow(RangeError);
  });

  it('iterates iterable once: same generator gives 0 on second call', () => {
    function* source(): Generator<SessionBundle> { yield mkBundle(); yield mkBundle(); }
    const it = source();
    expect(runMetrics(it, [bundleCount()]).bundleCount).toBe(2);
    expect(runMetrics(it, [bundleCount()]).bundleCount).toBe(0);
  });

  it('Iterable<T> contract: arrays and Sets work', () => {
    expect(runMetrics([mkBundle(), mkBundle()], [bundleCount()]).bundleCount).toBe(2);
    expect(runMetrics(new Set([mkBundle(), mkBundle(), mkBundle()]), [bundleCount()]).bundleCount).toBe(3);
  });
});

// ---------- compareMetricsResults ----------
describe('compareMetricsResults', () => {
  it('numeric leaf: positive delta + pctChange', () => {
    const cmp = compareMetricsResults({ rate: 100 }, { rate: 110 });
    expect(cmp.rate).toEqual({ baseline: 100, current: 110, delta: 10, pctChange: 0.1 });
  });

  it('numeric leaf: 0/0 → pctChange 0', () => {
    const cmp = compareMetricsResults({ x: 0 }, { x: 0 });
    expect((cmp.x as NumericDelta).pctChange).toBe(0);
  });

  it('numeric leaf: nonzero/0 → +Infinity', () => {
    const cmp = compareMetricsResults({ x: 0 }, { x: 5 });
    expect((cmp.x as NumericDelta).pctChange).toBe(Infinity);
  });

  it('null inputs → null delta', () => {
    const cmp = compareMetricsResults({ x: null }, { x: 5 });
    expect(cmp.x).toEqual({ baseline: null, current: 5, delta: null, pctChange: null });
  });

  it('opaque leaf: arrays compared by structural equality', () => {
    const cmp = compareMetricsResults({ buckets: [1, 2, 3] }, { buckets: [1, 2, 3] });
    expect(cmp.buckets).toEqual({ baseline: [1, 2, 3], current: [1, 2, 3], equal: true });
  });

  it('only-in-side at top level', () => {
    const cmp = compareMetricsResults({ a: 1 }, { b: 2 });
    expect(cmp.a).toEqual({ baseline: 1, onlyIn: 'baseline' });
    expect(cmp.b).toEqual({ current: 2, onlyIn: 'current' });
  });

  it('only-in-side at nested record level (commandTypeCounts)', () => {
    const cmp = compareMetricsResults(
      { commandTypeCounts: { move: 100, attack: 50 } },
      { commandTypeCounts: { move: 90, build: 10 } },
    );
    const inner = cmp.commandTypeCounts as Record<string, unknown>;
    expect(inner.move).toEqual({ baseline: 100, current: 90, delta: -10, pctChange: -0.1 });
    expect(inner.attack).toEqual({ baseline: 50, onlyIn: 'baseline' });
    expect(inner.build).toEqual({ current: 10, onlyIn: 'current' });
  });

  it('type mismatch → opaque equal:false', () => {
    const cmp = compareMetricsResults({ x: 'foo' }, { x: 5 });
    expect(cmp.x).toEqual({ baseline: 'foo', current: 5, equal: false });
  });
});

// ---------- Cross-cutting: order-insensitivity ----------
describe('built-in order-insensitivity', () => {
  it('reverse iteration produces identical results for all 11 built-ins', () => {
    const bs = [
      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 10 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 20 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 30 } }),
    ];
    const allBuiltins = (): Metric<unknown, unknown>[] => [
      bundleCount() as Metric<unknown, unknown>,
      sessionLengthStats() as Metric<unknown, unknown>,
      commandRateStats() as Metric<unknown, unknown>,
      eventRateStats() as Metric<unknown, unknown>,
      commandTypeCounts() as Metric<unknown, unknown>,
      eventTypeCounts() as Metric<unknown, unknown>,
      failureBundleRate() as Metric<unknown, unknown>,
      failedTickRate() as Metric<unknown, unknown>,
      incompleteBundleRate() as Metric<unknown, unknown>,
      commandValidationAcceptanceRate() as Metric<unknown, unknown>,
      executionFailureRate() as Metric<unknown, unknown>,
    ];
    const r1 = runMetrics(bs, allBuiltins());
    const r2 = runMetrics([...bs].reverse(), allBuiltins());
    expect(r1).toEqual(r2);
  });
});

// ---------- Cross-cutting: user-defined metric integration ----------
describe('user-defined metric integration', () => {
  it('custom Metric implements the contract correctly + multiplexes alongside built-ins', () => {
    const distinctSeedCount: Metric<Set<number>, number> = {
      name: 'distinctSeedCount',
      create: () => new Set<number>(),
      observe: (state, bundle) => {
        if (bundle.metadata.policySeed !== undefined) state.add(bundle.metadata.policySeed);
        return state;
      },
      finalize: (state) => state.size,
    };
    const bs: SessionBundle[] = [
      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 1 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 2 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 1 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 3 } }),
    ];
    const result = runMetrics(bs, [bundleCount() as Metric<unknown, unknown>, distinctSeedCount as Metric<unknown, unknown>]);
    expect(result.bundleCount).toBe(4);
    expect(result.distinctSeedCount).toBe(3);
  });
});

// ---------- Cross-cutting: typed-bundle user metric ----------
describe('typed-bundle user metric', () => {
  interface MyEvents { userAction: { actor: string; action: 'attack' | 'defend' } }
  interface MyCommands { spawn: { id: number; faction: 'red' | 'blue' } }

  it('Metric generic over <TState, TResult, TEventMap, TCommandMap> sees typed bundle data', () => {
    // A custom metric that reads typed command data — the data field's
    // type narrows to MyCommands['spawn'] (i.e., { id, faction }), not unknown.
    const factionSpawnRatio: Metric<
      { red: number; blue: number },
      number,
      MyEvents,
      MyCommands
    > = {
      name: 'factionSpawnRatio',
      create: () => ({ red: 0, blue: 0 }),
      observe: (state, bundle) => {
        for (const cmd of bundle.commands) {
          // bundle.commands[].data is typed (MyCommands['spawn'])[] union; cmd.data.faction is 'red' | 'blue'
          const faction = (cmd.data as { faction: 'red' | 'blue' }).faction;
          if (faction === 'red') state.red++;
          else state.blue++;
        }
        return state;
      },
      finalize: (s) => {
        const total = s.red + s.blue;
        return total > 0 ? s.red / total : 0;
      },
    };

    const mkTypedBundle = (faction: 'red' | 'blue'): SessionBundle<MyEvents, MyCommands> =>
      mkBundle({
        commands: [{ ...mkCommand('spawn', true), data: { id: 1, faction } }] as never,
      }) as unknown as SessionBundle<MyEvents, MyCommands>;

    const bundles = [
      mkTypedBundle('red'), mkTypedBundle('red'), mkTypedBundle('blue'), mkTypedBundle('red'),
    ];
    const result = runMetrics<MyEvents, MyCommands>(bundles, [
      factionSpawnRatio as unknown as Metric<unknown, unknown>,
    ]);
    expect(result.factionSpawnRatio).toBeCloseTo(0.75, 6);
  });
});

// ---------- Sorted-key serialization stability ----------
describe('commandTypeCounts / eventTypeCounts JSON-key sorting', () => {
  it('emits sorted keys regardless of bundle order (baseline-file stability)', () => {
    const a = mkBundle({ commands: [mkCommand('zoom'), mkCommand('alpha')] as never });
    const b = mkBundle({ commands: [mkCommand('move'), mkCommand('alpha')] as never });
    const r1 = runMetrics([a, b], [commandTypeCounts()]);
    const r2 = runMetrics([b, a], [commandTypeCounts()]);
    // Counts equal AND key insertion order equal (sorted alphabetically).
    expect(r1.commandTypeCounts).toEqual(r2.commandTypeCounts);
    const keys1 = Object.keys(r1.commandTypeCounts as Record<string, number>);
    const keys2 = Object.keys(r2.commandTypeCounts as Record<string, number>);
    expect(keys1).toEqual(['alpha', 'move', 'zoom']);
    expect(keys2).toEqual(['alpha', 'move', 'zoom']);
    // Critical: JSON-string equality (the actual baseline-file scenario).
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

// ---------- Negative pctChange ----------
describe('compareMetricsResults pctChange edge cases', () => {
  it('nonzero/0 with negative current → -Infinity', () => {
    const cmp = compareMetricsResults({ x: 0 }, { x: -5 });
    expect((cmp.x as NumericDelta).pctChange).toBe(-Infinity);
  });
});

// ---------- Cross-cutting: volatile-metadata exclusion ----------
describe('built-ins ignore volatile metadata', () => {
  it('sessionId / recordedAt do not affect built-in results', () => {
    const a = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'aaa', recordedAt: 'ta' } });
    const b = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'bbb', recordedAt: 'tb' } });
    const allBuiltins = (): Metric<unknown, unknown>[] => [
      bundleCount() as Metric<unknown, unknown>,
      sessionLengthStats() as Metric<unknown, unknown>,
      commandRateStats() as Metric<unknown, unknown>,
      eventRateStats() as Metric<unknown, unknown>,
      commandTypeCounts() as Metric<unknown, unknown>,
      eventTypeCounts() as Metric<unknown, unknown>,
      failureBundleRate() as Metric<unknown, unknown>,
      failedTickRate() as Metric<unknown, unknown>,
      incompleteBundleRate() as Metric<unknown, unknown>,
      commandValidationAcceptanceRate() as Metric<unknown, unknown>,
      executionFailureRate() as Metric<unknown, unknown>,
    ];
    expect(runMetrics([a], allBuiltins())).toEqual(runMetrics([b], allBuiltins()));
  });
});
