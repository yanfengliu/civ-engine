import { describe, expect, it } from 'vitest';
import {
  bundleHotspots,
  MemorySink,
  SessionRecorder,
  World,
  type BundleHotspot,
  type SessionBundle,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position',
});

interface Cmds { spawn: { x: number; y: number } }

function recordSession(
  steps: number,
  options: { handler?: (data: { x: number; y: number }) => void; markersAt?: number[] } = {},
): SessionBundle<Record<string, never>, Cmds> {
  const world = new World<Record<string, never>, Cmds>(mkConfig());
  world.registerHandler('spawn', options.handler ?? (() => undefined));
  const sink = new MemorySink();
  const rec = new SessionRecorder({ world, sink });
  rec.connect();
  for (let i = 0; i < steps; i++) {
    if (i % 3 === 0) world.submit('spawn', { x: i, y: i });
    if (options.markersAt?.includes(i)) {
      rec.addMarker({ tick: i, kind: 'annotation', text: `marker at tick ${i}` });
    }
    world.step();
  }
  rec.disconnect();
  return sink.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds>;
}

describe('bundleHotspots', () => {
  it('clean bundle (no failures, no markers, no duration outliers) returns []', () => {
    const bundle = recordSession(5);
    const hotspots = bundleHotspots(bundle, { includeMarkers: false });
    expect(hotspots).toEqual([]);
  });

  it('flags tick failures with severity:high', () => {
    const handler = (data: { x: number; y: number }): void => {
      if (data.y === 999) throw new Error('poison spawn');
    };
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', handler);
    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    world.submit('spawn', { x: 0, y: 0 });
    world.step();
    world.submit('spawn', { x: 1, y: 999 }); // poison
    expect(() => world.step()).toThrow();
    rec.disconnect();
    const bundle = sink.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds>;
    const hotspots = bundleHotspots(bundle, { includeMarkers: false });
    const failures = hotspots.filter((h: BundleHotspot) => h.kind === 'tick_failure');
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].severity).toBe('high');
  });

  it('flags markers as severity:low when includeMarkers is true (default)', () => {
    const bundle = recordSession(5, { markersAt: [2] });
    const hotspots = bundleHotspots(bundle);
    const markers = hotspots.filter((h: BundleHotspot) => h.kind === 'marker');
    expect(markers.length).toBe(1);
    expect(markers[0].severity).toBe('low');
    expect(markers[0].tick).toBe(2);
  });

  it('omits markers when includeMarkers is false', () => {
    const bundle = recordSession(5, { markersAt: [2] });
    const hotspots = bundleHotspots(bundle, { includeMarkers: false });
    expect(hotspots.filter((h) => h.kind === 'marker')).toEqual([]);
  });

  it('detects duration outliers when one tick is slow', () => {
    // Build a bundle where one tick is artificially slow. Since we can't
    // easily make world.step() take a measurably-different time in a unit
    // test, we'll mutate the recorded metrics directly to simulate an outlier.
    const bundle = recordSession(20);
    // Find a tick with metrics and inflate its durationMs.total to be a clear
    // outlier (mean + 5*stdev).
    const target = bundle.ticks.find((t) => t.metrics !== null);
    expect(target).toBeDefined();
    if (target?.metrics) {
      // Build a mutated copy with one outlier tick.
      const mutatedTicks = bundle.ticks.map((t) => {
        if (t === target) {
          return {
            ...t,
            metrics: {
              ...t.metrics!,
              durationMs: { ...t.metrics!.durationMs, total: 1000 }, // 1 second — way above any baseline
            },
          };
        }
        return t;
      });
      const mutated: SessionBundle<Record<string, never>, Cmds> = { ...bundle, ticks: mutatedTicks };
      const hotspots = bundleHotspots(mutated, { includeMarkers: false });
      const outliers = hotspots.filter((h) => h.kind === 'duration_outlier');
      expect(outliers.length).toBeGreaterThan(0);
      expect(outliers[0].tick).toBe(target.tick);
    }
  });

  it('respects durationStdevThreshold (Infinity disables duration outlier detection)', () => {
    const bundle = recordSession(20);
    const target = bundle.ticks.find((t) => t.metrics !== null)!;
    const mutated: SessionBundle<Record<string, never>, Cmds> = {
      ...bundle,
      ticks: bundle.ticks.map((t) =>
        t === target
          ? { ...t, metrics: { ...t.metrics!, durationMs: { ...t.metrics!.durationMs, total: 1000 } } }
          : t,
      ),
    };
    const hotspots = bundleHotspots(mutated, {
      includeMarkers: false,
      durationStdevThreshold: Infinity,
    });
    expect(hotspots.filter((h) => h.kind === 'duration_outlier')).toEqual([]);
  });

  it('returns hotspots sorted ascending by tick', () => {
    const bundle = recordSession(10, { markersAt: [3, 7] });
    const hotspots = bundleHotspots(bundle);
    for (let i = 1; i < hotspots.length; i++) {
      expect(hotspots[i].tick).toBeGreaterThanOrEqual(hotspots[i - 1].tick);
    }
  });

  // Note: this test is now folded into the dedicated cap test below at
  // 'caps duration outliers at maxDurationOutliers (with a low threshold so multiple ticks qualify)'.
  // The previous default-threshold variant was vacuous — inflating 15 of 30 ticks by ~1 stdev never
  // produced any outliers under threshold=3, so the cap assertion was unreachable. Removed.

  it('handles bundle with < 3 metric samples (not enough for z-score) gracefully', () => {
    const bundle = recordSession(2); // only 2 ticks
    const hotspots = bundleHotspots(bundle, { includeMarkers: false });
    expect(hotspots.filter((h) => h.kind === 'duration_outlier')).toEqual([]);
  });

  it('handles bundle with all-identical durations (stdev === 0)', () => {
    const bundle = recordSession(10);
    // Force all metrics' durationMs.total to a constant.
    const mutated: SessionBundle<Record<string, never>, Cmds> = {
      ...bundle,
      ticks: bundle.ticks.map((t) =>
        t.metrics ? { ...t, metrics: { ...t.metrics, durationMs: { ...t.metrics.durationMs, total: 5 } } } : t,
      ),
    };
    const hotspots = bundleHotspots(mutated, { includeMarkers: false });
    expect(hotspots.filter((h) => h.kind === 'duration_outlier')).toEqual([]);
  });

  it('flags execution_failure hotspots from bundle.executions[].executed === false', () => {
    // The engine writes executions[].executed === false in three cases
    // (per src/world.ts:1783-1875): missing handler, thrown handler (in
    // tandem with a TickFailure for the same tick), and commands dropped
    // because the tick already aborted. Constructing one of those scenarios
    // organically requires registering a thrower or simulating an
    // already-aborted tick; for unit-test simplicity we synthesize a bundle
    // with the executed:false entry directly.
    const bundle = recordSession(5);
    const synthetic: SessionBundle<Record<string, never>, Cmds> = {
      ...bundle,
      executions: [
        {
          schemaVersion: 1,
          submissionSequence: 7,
          executed: false,
          commandType: 'spawn',
          code: 'handler_threw',
          message: 'simulated handler failure',
          details: null,
          tick: 3,
        },
      ] as SessionBundle<Record<string, never>, Cmds>['executions'],
    };
    const hotspots = bundleHotspots(synthetic, { includeMarkers: false });
    const execFailures = hotspots.filter((h) => h.kind === 'execution_failure');
    expect(execFailures.length).toBe(1);
    expect(execFailures[0].tick).toBe(3);
    expect(execFailures[0].severity).toBe('medium');
    expect(execFailures[0].message).toContain('spawn');
    expect(execFailures[0].message).toContain('handler_threw');
  });

  it('within a single tick, hotspots are ordered tick_failure → execution_failure → duration_outlier → marker', () => {
    // Build a synthetic fixture with all FOUR kinds at the same tick.
    // To trigger a duration_outlier at tick 3, inflate the SessionTickEntry
    // matching that tick's submission window. SessionTickEntry.tick =
    // submissionTick + 1, so submissionTick=3 → entryTick=4. We need to find
    // the entry whose tick value matches 3 in the bundleHotspots output —
    // that's the entry whose recorded SessionTickEntry.tick === 3, which
    // corresponds to processing submission-tick 2.
    const bundle = recordSession(20, { markersAt: [3] });
    // Inflate the metrics of the SessionTickEntry whose .tick === 3 (so the
    // duration outlier surfaces at tick=3 in the output).
    const inflatedTicks = bundle.ticks.map((t) =>
      t.tick === 3 && t.metrics
        ? { ...t, metrics: { ...t.metrics, durationMs: { ...t.metrics.durationMs, total: 1000 } } }
        : t,
    );
    const synthetic: SessionBundle<Record<string, never>, Cmds> = {
      ...bundle,
      ticks: inflatedTicks,
      failures: [
        {
          schemaVersion: 1,
          tick: 3,
          phase: 'commands',
          code: 'simulated_tick_failure',
          message: 'synthetic tick failure for ordering test',
          subsystem: 'test',
          commandType: null,
          submissionSequence: null,
        },
      ] as SessionBundle<Record<string, never>, Cmds>['failures'],
      executions: [
        {
          schemaVersion: 1,
          submissionSequence: 7,
          executed: false,
          commandType: 'spawn',
          code: 'handler_threw',
          message: 'synthetic exec failure for ordering test',
          details: null,
          tick: 3,
        },
      ] as SessionBundle<Record<string, never>, Cmds>['executions'],
    };
    const hotspots = bundleHotspots(synthetic);
    // Filter to just tick=3 entries.
    const atTick3 = hotspots.filter((h) => h.tick === 3);
    expect(atTick3.length).toBe(4); // failure + exec + duration_outlier + marker
    // Full priority order: tick_failure → execution_failure → duration_outlier → marker.
    expect(atTick3[0].kind).toBe('tick_failure');
    expect(atTick3[1].kind).toBe('execution_failure');
    expect(atTick3[2].kind).toBe('duration_outlier');
    expect(atTick3[3].kind).toBe('marker');
  });

  it('caps duration outliers at maxDurationOutliers (with a low threshold so multiple ticks qualify)', () => {
    // Use a low threshold (1.0) so multiple inflated ticks qualify as outliers,
    // then verify that maxDurationOutliers caps the returned set to N.
    const bundle = recordSession(20);
    const ticksWithMetrics = bundle.ticks.filter((t) => t.metrics !== null);
    expect(ticksWithMetrics.length).toBeGreaterThanOrEqual(10);
    // Inflate 7 ticks to be moderate outliers (z ≈ 1.4 against threshold 1.0
    // → all 7 should pass the threshold check, then cap to 3 should apply).
    const inflated = new Set(ticksWithMetrics.slice(0, 7).map((t) => t.tick));
    const mutated: SessionBundle<Record<string, never>, Cmds> = {
      ...bundle,
      ticks: bundle.ticks.map((t) =>
        inflated.has(t.tick) && t.metrics
          ? { ...t, metrics: { ...t.metrics, durationMs: { ...t.metrics.durationMs, total: 100 } } }
          : t.metrics
            ? { ...t, metrics: { ...t.metrics, durationMs: { ...t.metrics.durationMs, total: 10 } } }
            : t,
      ),
    };
    // Sanity: with threshold=1.0 and no cap, multiple outliers should be detected.
    const uncapped = bundleHotspots(mutated, {
      includeMarkers: false,
      durationStdevThreshold: 1.0,
    });
    const uncappedOutliers = uncapped.filter((h) => h.kind === 'duration_outlier');
    expect(uncappedOutliers.length).toBeGreaterThan(3);
    // Now cap at 3 — should return exactly 3, not all 7.
    const capped = bundleHotspots(mutated, {
      includeMarkers: false,
      durationStdevThreshold: 1.0,
      maxDurationOutliers: 3,
    });
    const cappedOutliers = capped.filter((h) => h.kind === 'duration_outlier');
    expect(cappedOutliers.length).toBe(3);
  });
});
