import { describe, expect, it } from 'vitest';
import {
  checkReport,
  medianOf,
  renderMarkdown,
  validateBaseline,
} from '../scripts/benchmark-gate.mjs';

import type { Baseline, RunScenario } from '../scripts/benchmark-gate.mjs';

const baseline = (): Baseline => ({
  schemaVersion: 1,
  generatedWith: { engineVersion: '0.8.17', node: 'v22.0.0', date: '2026-06-10' },
  scenarios: {
    medium: { counters: { cacheHits: 100, diffBytes: 5000 }, timeRatio: 0.5 },
    churn: { counters: { membershipChecks: 24000 }, timeRatio: 1.2 },
  },
});

const runReport = (): { scenarios: RunScenario[] } => ({
  scenarios: [
    { name: 'medium', counters: { cacheHits: 100, diffBytes: 5000 }, timeRatio: 0.55 },
    { name: 'churn', counters: { membershipChecks: 24000 }, timeRatio: 1.1 },
  ],
});

describe('validateBaseline', () => {
  it('accepts the v1 shape', () => {
    expect(validateBaseline(baseline())).toEqual({ ok: true, errors: [] });
  });

  it('rejects wrong schemaVersion, missing scenarios, non-integer counters', () => {
    const bad1 = { ...baseline(), schemaVersion: 2 };
    expect(validateBaseline(bad1).ok).toBe(false);
    const bad2 = { schemaVersion: 1, generatedWith: {}, scenarios: undefined };
    expect(validateBaseline(bad2).ok).toBe(false);
    const bad3 = baseline();
    bad3.scenarios.medium.counters.cacheHits = 1.5;
    const res3 = validateBaseline(bad3);
    expect(res3.ok).toBe(false);
    expect(res3.errors.join(' ')).toMatch(/cacheHits/);
  });
});

describe('checkReport', () => {
  it('passes when counters match exactly and ratios are within bound', () => {
    const result = checkReport(baseline(), runReport(), { ratioMax: 3.0 });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('fails on any counter drift with expected/actual detail', () => {
    const run = runReport();
    run.scenarios[1].counters.membershipChecks = 24001;
    const result = checkReport(baseline(), run, { ratioMax: 3.0 });
    expect(result.ok).toBe(false);
    expect(result.failures).toContainEqual({
      kind: 'counter', scenario: 'churn', counter: 'membershipChecks',
      expected: 24000, actual: 24001,
    });
  });

  it('fails on counters present on only one side', () => {
    const run = runReport();
    delete run.scenarios[0].counters.diffBytes;
    const result = checkReport(baseline(), run, { ratioMax: 3.0 });
    expect(result.failures.some((f) => f.kind === 'counter' && f.counter === 'diffBytes')).toBe(true);
  });

  it('fails on scenario-set mismatch in either direction', () => {
    const run = runReport();
    run.scenarios.pop();
    const r1 = checkReport(baseline(), run, { ratioMax: 3.0 });
    expect(r1.failures.some((f) => f.kind === 'scenario_set')).toBe(true);
    const run2 = runReport();
    run2.scenarios.push({ name: 'stress', counters: {}, timeRatio: 1 });
    const r2 = checkReport(baseline(), run2, { ratioMax: 3.0 });
    expect(r2.failures.some((f) => f.kind === 'scenario_set')).toBe(true);
  });

  it('fails time ratio only above the multiplier', () => {
    const run = runReport();
    run.scenarios[0].timeRatio = 0.5 * 3.0 + 0.01;
    const over = checkReport(baseline(), run, { ratioMax: 3.0 });
    expect(over.failures).toContainEqual(
      expect.objectContaining({ kind: 'time_ratio', scenario: 'medium' }),
    );
    run.scenarios[0].timeRatio = 0.5 * 3.0 - 0.01;
    expect(checkReport(baseline(), run, { ratioMax: 3.0 }).ok).toBe(true);
  });
});

describe('medianOf', () => {
  it('returns the median of n samples', () => {
    const samples = [5, 1, 3];
    let i = 0;
    expect(medianOf(() => samples[i++], 3)).toBe(3);
  });
});

describe('renderMarkdown', () => {
  it('renders a report without throwing and includes explicit-sync and churn lines', () => {
    const report = {
      command: 'npm run benchmark:rts',
      format: 'markdown',
      scenarios: [{
        name: 'medium',
        grid: { width: 8, height: 8 },
        entities: 10,
        ticksMeasured: 2,
        tickDurationMs: { min: 0.1, avg: 0.2, max: 0.3 },
        queryCacheHits: { min: 1, avg: 1, max: 1 },
        queryCacheMisses: { min: 0, avg: 0, max: 0 },
        spatialExplicitSyncs: { min: 10, avg: 10, max: 10 },
        diffSizeBytes: { min: 100, avg: 100, max: 100 },
        counters: { cacheHits: 2, membershipChecks: 0 },
        timeRatio: 0.4,
        pathfinding: {
          requests: 4, budgetPerProcessCall: 2,
          uncachedDurationMs: 1, cachedDurationMs: 0.5,
          uncachedMsPerRequest: 0.25, cachedMsPerRequest: 0.125,
          cacheHitsSecondPass: 4, cacheMissesSecondPass: 0,
        },
        occupancyCosts: {
          buildings: 1, resources: 2, units: 3, queryCount: 4,
          blockedHits: 0, crowdedClaimsObserved: 0, durationMs: 0.1,
          bindingQueries: { cellStatusQueries: 4, crowdedSlotChecks: 0 },
          occupancy: { blockedQueries: 1, claimCellChecks: 1 },
          crowding: { slotChecks: 0 },
        },
        memory: { beforeMB: 1, afterMB: 2, deltaMB: 1 },
      }, {
        // Churn scenarios carry a sparse shape: no pathfinding/occupancy/
        // memory/summary fields (B impl-review HIGH: the renderer must not
        // assume the standard shape).
        name: 'churn',
        grid: { width: 96, height: 96 },
        entities: 4000,
        ticksMeasured: 20,
        tickDurationMs: { min: 1, avg: 2, max: 3 },
        churn: { created: 3000, destroyed: 3000, perTick: 150, cachedShapes: 8 },
        counters: { membershipChecks: 96000 },
        timeRatio: 5,
      }],
    };
    const md = renderMarkdown(report);
    expect(md).toContain('Spatial explicit syncs');
    expect(md).toContain('medium');
    expect(md).toContain('Churn: 3000 created / 3000 destroyed');
    expect(md).not.toContain('undefined');
  });
});
