# Behavioral Metrics over Corpus

Tier-2 of the AI-first feedback loop (Spec 8). A pure-function corpus reducer over `Iterable<SessionBundle>`, commonly fed by a `BundleCorpus` over closed `FileSink` bundles from synthetic playtests. Computes engine-generic + user-defined metrics; compares baseline vs. current to detect emergent-behavior regressions.

## Quickstart

```typescript
import {
  BundleCorpus,
  runMetrics,
  bundleCount, sessionLengthStats, commandRateStats,
  commandValidationAcceptanceRate, executionFailureRate,
} from 'civ-engine';

// 1. Open a closed FileSink corpus produced by synthetic playtests.
const corpus = new BundleCorpus('artifacts/playtests', { scanDepth: 'all' });

// 2. Compute metrics in one pass over lazily loaded bundles.
const current = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
  bundleCount(),
  sessionLengthStats(),
  commandRateStats(),
  commandValidationAcceptanceRate(),
  executionFailureRate(),
]);

console.log(current);
// { bundleCount: 64, sessionLengthStats: { count: 64, min: ..., p95: ..., ... }, ... }
```

For small tests, arrays are still fine because `runMetrics` accepts any synchronous iterable:

```typescript
const current = runMetrics([bundleA, bundleB], [bundleCount()]);
```

## Authoring a custom metric

The accumulator contract: `create()` → state → `observe(state, bundle)` → updated state → `finalize(state)` → result.

```typescript
import type { Metric } from 'civ-engine';

const distinctSeedCount: Metric<Set<number>, number> = {
  name: 'distinctSeedCount',
  create: () => new Set<number>(),
  observe: (state, bundle) => {
    if (bundle.metadata.policySeed !== undefined) {
      state.add(bundle.metadata.policySeed);
    }
    return state;  // in-place mutation OK; same reference returned
  },
  finalize: (state) => state.size,
};
```

The metric multiplexes alongside built-ins — `runMetrics` calls every metric's `observe` per bundle in a single pass:

```typescript
const result = runMetrics(bundles, [bundleCount(), sessionLengthStats(), distinctSeedCount]);
console.log(result.distinctSeedCount);  // e.g., 32 if 32 distinct seeds in corpus
```

### Determinism contract

Metrics MUST be deterministic given the same bundles. Built-ins are all order-insensitive (counts, sums, sorted-on-finalize percentiles). User metrics that depend on iteration order should declare `orderSensitive: true` (doc-only marker) and the caller is responsible for stable iteration order.

Volatile bundle metadata (`sessionId`, `recordedAt`) is NOT read by any built-in. User metrics reading these get fragile results — every run produces fresh values, so deltas in `compareMetricsResults` will be unstable.

### Stats and percentiles

Built-in metrics ending in `Stats` return:

```typescript
interface Stats {
  count: number;
  min: number | null;   // null when count === 0 (JSON-stable)
  max: number | null;
  mean: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}
```

Percentiles use NumPy linear (R-quantile type 7). Empty corpus produces `null` numeric fields (NOT `NaN`, which would not survive `JSON.stringify`/`JSON.parse` round-trip).

## CI pattern: regression detection

```typescript
import * as fs from 'node:fs';
import { compareMetricsResults, type NumericDelta } from 'civ-engine';

// Load baseline from previous CI run.
const baseline = JSON.parse(fs.readFileSync('baseline-metrics.json', 'utf-8'));

// Compute current from this run's corpus.
const current = runMetrics(bundles, metrics);

// Compare.
const cmp = compareMetricsResults(baseline, current);

// Caller decides what's a regression. MetricsComparison entries can be:
// - NumericDelta: { baseline, current, delta, pctChange }
// - OpaqueDelta: { baseline, current, equal }
// - OnlyInComparison: { baseline?, current?, onlyIn: 'baseline' | 'current' }
// - Nested record: recursive structure (e.g., commandTypeCounts)

// Type-narrowing pattern: handle missing-key case explicitly to avoid silent skips.
const sessionLengthEntry = cmp.sessionLengthStats;
if (sessionLengthEntry === undefined || 'onlyIn' in sessionLengthEntry) {
  throw new Error(`sessionLengthStats missing or unilateral in comparison`);
}
const p95 = (sessionLengthEntry as { p95: NumericDelta }).p95;
if (p95.pctChange !== null && Math.abs(p95.pctChange) > 0.20) {
  throw new Error(`p95 session length shifted ${(p95.pctChange * 100).toFixed(1)}%`);
}

// Save current as next run's baseline.
fs.writeFileSync('baseline-metrics.json', JSON.stringify(current, null, 2));
```

`pctChange` conventions: `0/0 → 0`; `nonzero/0 → ±Infinity`; `null` inputs (e.g., empty-corpus baseline `Stats.p95`) propagate to `null` deltas — consumers can detect "no baseline data" or "no current data" via `=== null`.

## Submission vs. execution semantics

Two metrics handle two distinct stages of command processing:

- `commandValidationAcceptanceRate` reads `bundle.commands[].result.accepted`. Validator-rejected commands appear here with `accepted: false` but never reach `bundle.executions` (they short-circuit in `world.processCommands` before queueing).
- `executionFailureRate` reads `bundle.executions[].executed`. Captures handler-side failures: `missing_handler`, `command_handler_threw`, or `tick_aborted_before_handler`.

Pair them to detect both regression types:
- `commandValidationAcceptanceRate` dropping → validator regression (a guard tightened, or behavior shifted to send invalid commands).
- `executionFailureRate` rising → handler/tick-pipeline regression.

## What's not built in (deliberately)

- `stopReasonHistogram`: `SynthPlaytestResult.stopReason` lives outside `SessionBundle`; aggregating requires a Spec 3 follow-up to persist it. ADR 27.
- Per-phase failure metrics: `bundle.failures: TickFailure[]` carries the phase + error info. Built-ins read only `metadata.failedTicks`. User-defined.
- Game-semantic metrics: "resource Gini", "time-to-first-conflict", "decision points per minute" — these need standard event/marker contracts the engine doesn't define. Game projects implement these as user-defined metrics.
- `WorldMetrics.durationMs` aggregation: runtime instrumentation, not behavior data.

## See also

- `docs/design/2026-04-27-behavioral-metrics-design.md` — full spec (v4, converged).
- `docs/architecture/decisions.md` — ADRs 23-27.
- `docs/guides/synthetic-playtest.md` — Spec 3 harness that produces the corpus.
- `docs/guides/bundle-corpus-index.md` - Spec 7 disk-backed corpus listing and lazy bundle loading.
- `docs/guides/ai-integration.md` — Tier-2 of the AI feedback loop.
