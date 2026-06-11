// Benchmark regression-gate library: baseline schema validation, two-tier
// comparison (exact deterministic counters + coarse calibrated time ratio),
// calibration workload, and the markdown renderer (moved here from
// rts-benchmark.mjs so it is unit-testable). Design:
// docs/threads/done/benchmark-gate/DESIGN.md.

import { performance } from 'node:perf_hooks';

export const BASELINE_SCHEMA_VERSION = 1;
export const DEFAULT_RATIO_MAX = 3.0;

export function validateBaseline(json) {
  const errors = [];
  if (!json || typeof json !== 'object') {
    return { ok: false, errors: ['baseline must be an object'] };
  }
  if (json.schemaVersion !== BASELINE_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${BASELINE_SCHEMA_VERSION} (got ${json.schemaVersion})`);
  }
  if (!json.scenarios || typeof json.scenarios !== 'object') {
    errors.push('scenarios must be an object keyed by scenario name');
  } else {
    for (const [name, entry] of Object.entries(json.scenarios)) {
      if (!entry || typeof entry !== 'object') {
        errors.push(`scenarios.${name} must be an object`);
        continue;
      }
      if (!entry.counters || typeof entry.counters !== 'object') {
        errors.push(`scenarios.${name}.counters must be an object`);
      } else {
        for (const [counter, value] of Object.entries(entry.counters)) {
          if (!Number.isInteger(value)) {
            errors.push(`scenarios.${name}.counters.${counter} must be an integer (got ${value})`);
          }
        }
      }
      if (typeof entry.timeRatio !== 'number' || !(entry.timeRatio > 0)) {
        errors.push(`scenarios.${name}.timeRatio must be a positive number`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Two-tier comparison. `baseline` is the committed baseline file content;
 * `run` is a report with `scenarios: [{ name, counters, timeRatio }]`.
 * Tier 1: every counter in either side must exist on both sides and match
 * exactly. Tier 2: run timeRatio must not exceed baseline timeRatio ×
 * ratioMax. Scenario sets must be identical in both directions.
 */
export function checkReport(baseline, run, options = {}) {
  const ratioMax = options.ratioMax ?? DEFAULT_RATIO_MAX;
  const failures = [];
  const baselineNames = Object.keys(baseline.scenarios).sort();
  const runByName = new Map(run.scenarios.map((s) => [s.name, s]));
  const runNames = [...runByName.keys()].sort();

  for (const name of baselineNames) {
    if (!runByName.has(name)) {
      failures.push({ kind: 'scenario_set', scenario: name, problem: 'missing_from_run' });
    }
  }
  for (const name of runNames) {
    if (!(name in baseline.scenarios)) {
      failures.push({ kind: 'scenario_set', scenario: name, problem: 'missing_from_baseline' });
    }
  }

  for (const name of baselineNames) {
    const expected = baseline.scenarios[name];
    const actual = runByName.get(name);
    if (!actual) continue;

    const counterKeys = new Set([
      ...Object.keys(expected.counters),
      ...Object.keys(actual.counters ?? {}),
    ]);
    for (const counter of [...counterKeys].sort()) {
      const want = expected.counters[counter] ?? null;
      const got = (actual.counters ?? {})[counter] ?? null;
      if (want !== got) {
        failures.push({ kind: 'counter', scenario: name, counter, expected: want, actual: got });
      }
    }

    if (typeof actual.timeRatio === 'number' && actual.timeRatio > expected.timeRatio * ratioMax) {
      failures.push({
        kind: 'time_ratio',
        scenario: name,
        baselineRatio: expected.timeRatio,
        actualRatio: actual.timeRatio,
        multiplier: ratioMax,
      });
    }
  }

  return { ok: failures.length === 0, failures };
}

export function formatFailures(failures) {
  return failures.map((f) => {
    if (f.kind === 'scenario_set') {
      return `scenario set mismatch: '${f.scenario}' is ${f.problem === 'missing_from_run' ? 'in the baseline but not this run' : 'in this run but not the baseline'}`;
    }
    if (f.kind === 'counter') {
      return `counter drift [${f.scenario}.${f.counter}]: expected ${f.expected}, got ${f.actual} — algorithmic change; regenerate with --update-baseline if intended`;
    }
    return `time-ratio regression [${f.scenario}]: ${f.actualRatio.toFixed(3)} vs baseline ${f.baselineRatio.toFixed(3)} (allowed ×${f.multiplier})`;
  });
}

export function round(value) {
  return Math.round(value * 1000) / 1000;
}

export function medianOf(fn, n) {
  const samples = [];
  for (let i = 0; i < n; i++) samples.push(fn());
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

/**
 * Fixed arithmetic workload (~tens of ms class). The checksum is returned
 * and asserted by the caller so V8 cannot dead-code the loop. Pure CPU —
 * normalizes clock speed, not GC behavior (accepted; DESIGN §4).
 */
export function calibrationWorkload() {
  let sum = 0;
  for (let i = 1; i <= 5_000_000; i++) {
    sum += Math.sqrt(i) - Math.sqrt(i - 1);
  }
  return sum;
}

export function runCalibration() {
  return medianOf(() => {
    const start = performance.now();
    const checksum = calibrationWorkload();
    const elapsed = performance.now() - start;
    if (!(checksum > 0)) throw new Error('calibration checksum invalid');
    return elapsed;
  }, 3);
}

export function renderMarkdown(report) {
  const lines = ['# RTS Benchmark', '', 'Command: `npm run benchmark:rts`', ''];
  for (const scenario of report.scenarios) {
    lines.push(`## ${scenario.name}`);
    lines.push('');
    lines.push(
      `- Grid: ${scenario.grid.width}x${scenario.grid.height}, entities: ${scenario.entities}, ticks: ${scenario.ticksMeasured}`,
    );
    lines.push(
      `- Tick duration ms (min/avg/max): ${scenario.tickDurationMs.min} / ${scenario.tickDurationMs.avg} / ${scenario.tickDurationMs.max}`,
    );
    if (scenario.queryCacheHits) {
      lines.push(
        `- Query cache hits (min/avg/max): ${scenario.queryCacheHits.min} / ${scenario.queryCacheHits.avg} / ${scenario.queryCacheHits.max}`,
      );
    }
    if (scenario.queryCacheMisses) {
      lines.push(
        `- Query cache misses (min/avg/max): ${scenario.queryCacheMisses.min} / ${scenario.queryCacheMisses.avg} / ${scenario.queryCacheMisses.max}`,
      );
    }
    if (scenario.spatialExplicitSyncs) {
      lines.push(
        `- Spatial explicit syncs (min/avg/max): ${scenario.spatialExplicitSyncs.min} / ${scenario.spatialExplicitSyncs.avg} / ${scenario.spatialExplicitSyncs.max}`,
      );
    }
    if (scenario.diffSizeBytes) {
      lines.push(
        `- Diff size bytes (min/avg/max): ${scenario.diffSizeBytes.min} / ${scenario.diffSizeBytes.avg} / ${scenario.diffSizeBytes.max}`,
      );
    }
    if (scenario.counters) {
      const counterParts = Object.entries(scenario.counters)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      lines.push(`- Deterministic counters: ${counterParts}`);
    }
    if (typeof scenario.timeRatio === 'number') {
      lines.push(`- Calibrated time ratio: ${scenario.timeRatio}`);
    }
    if (scenario.churn) {
      lines.push(
        `- Churn: ${scenario.churn.created} created / ${scenario.churn.destroyed} destroyed across ${scenario.ticksMeasured} ticks`,
      );
    }
    if (scenario.pathfinding) {
      lines.push(
        `- Path requests: ${scenario.pathfinding.requests}, uncached ms/request: ${scenario.pathfinding.uncachedMsPerRequest}, cached ms/request: ${scenario.pathfinding.cachedMsPerRequest}`,
      );
      lines.push(
        `- Path cache hits on second pass: ${scenario.pathfinding.cacheHitsSecondPass}`,
      );
    }
    if (scenario.occupancyCosts) {
      lines.push(
        `- Occupancy benchmark: ${scenario.occupancyCosts.buildings} buildings, ${scenario.occupancyCosts.resources} resources, ${scenario.occupancyCosts.units} units over ${scenario.occupancyCosts.queryCount} query rounds in ${scenario.occupancyCosts.durationMs} ms`,
      );
      lines.push(
        `- Occupancy scans: blockedQueries=${scenario.occupancyCosts.occupancy.blockedQueries}, claimCellChecks=${scenario.occupancyCosts.occupancy.claimCellChecks}, cellStatusQueries=${scenario.occupancyCosts.bindingQueries.cellStatusQueries}, crowdedSlotChecks=${scenario.occupancyCosts.bindingQueries.crowdedSlotChecks}, subcellSlotChecks=${scenario.occupancyCosts.crowding?.slotChecks ?? 0}`,
      );
    }
    if (scenario.memory) {
      lines.push(`- Memory delta MB: ${scenario.memory.deltaMB}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}
