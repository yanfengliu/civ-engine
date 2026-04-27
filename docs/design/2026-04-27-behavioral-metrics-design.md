# Behavioral Metrics over Corpus — Design Spec

**Status:** Draft v4 (2026-04-27). Awaiting iter-4 multi-CLI review. Iter-1, 2, 3 syntheses at `docs/reviews/behavioral-metrics/2026-04-27/design-1/REVIEW.md`, `docs/reviews/behavioral-metrics/2026-04-27/design-2/REVIEW.md`, and `docs/reviews/behavioral-metrics/2026-04-27/design-3/REVIEW.md`. v4 addresses iter-3's MED (stale §12 `NaN`s + 9-built-in count + ADR 24's "9 built-ins" not updated to v3's 11) + 2 NITs. Iter-1 fixed 7 HIGH + 6 MED + 4 LOW; iter-2 fixed 1 HIGH + 1 MED.

**Scope:** Tier-2 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 8). Builds on the Synthetic Playtest Harness (Spec 3, merged v0.7.20 → v0.8.1). Out of scope: persistent corpus storage / indexing (Spec 7), bundle search (Spec 7), AI playtester agent (Spec 9), counterfactual replay (Spec 5), annotation UI (Spec 2), bundle viewer (Spec 4).

**Author:** civ-engine team

**Related primitives:** `SessionBundle`, `runSynthPlaytest`, `SessionMetadata`, `RecordedCommand`, `SessionTickEntry`.

## 1. Goals

This spec defines an engine-level **corpus-reducer** that:

- Computes aggregate **behavioral metrics** over an `Iterable<SessionBundle>` (which arrays, generators, and future filesystem readers all satisfy).
- Ships a small set of **engine-generic built-in metrics** derivable from bundle data alone (no game semantics).
- Exposes an **accumulator contract** for user-defined metrics that stays streaming-friendly and one-pass-multiplex-able.
- Provides a **thin comparison helper** for baseline vs. current — returning deltas, not regression judgments.
- Is deterministic given the same bundle set, regardless of bundle iteration order (where order-insensitive metrics are the default).

The deliverable is an opt-in API surface; existing engine consumers see no behavioral change.

## 2. Non-Goals

- **Persistent corpus management.** Loading thousands of bundles from disk, indexing them by metadata, querying by tags, retention policies — all Spec 7's job.
- **Async/streaming ingestion.** v1 accepts `Iterable<SessionBundle>` only. `AsyncIterable` defers to when Spec 7 lands or when corpus loading stops being trivially local.
- **Game-semantic metrics.** "Resource Gini coefficient", "time-to-first-conflict", "dominant strategy distribution", "decision points per minute" — these need standard event/marker contracts that the engine doesn't define. Game projects implement these as user-defined metrics.
- **Regression judgment.** "Is this 18% shift bad?" is game- and policy-specific. v1 ships `compareMetricsResults` which returns deltas + percent changes; the threshold/judgment layer is the caller's.
- **Per-tick runtime instrumentation.** `WorldMetrics.durationMs` and similar are runtime-perf data, not behavior data. Mixing them into Spec 8 blurs the spec.
- **Distributed/parallel merge.** The accumulator contract reserves an optional `merge` hook for future parallel processing, but v1 doesn't implement parallel corpus-pass.
- **`stopReason` aggregation.** `SynthPlaytestResult.stopReason` is returned by the harness but NOT persisted in the bundle (per Spec 3 v10 §8). Aggregating it would require a Spec 3 follow-up to persist it; deferred.
- **Approximate sketches.** v1 metrics are exact. HyperLogLog / t-digest / etc. land if/when corpora exceed memory.

## 3. Background

Spec 3 produces `SessionBundle`s via `runSynthPlaytest`. A typical workflow generates many bundles in CI: random-policy variations, scripted regression replays, scheduled overnight runs. Today the only way to spot trends across this corpus is reading individual bundles, which doesn't scale.

Spec 8 fills the gap with a pure-function reducer: feed in bundles, get out structured metrics. CI compares `metrics(today's bundles)` against `metrics(yesterday's bundles)` to detect emergent-behavior regressions before they reach players.

The reducer is intentionally divorced from corpus storage. Bundles arrive as `Iterable<SessionBundle>` — callers materialize from arrays, filesystem readers, or future Spec 7 indexes. Spec 8 doesn't care.

## 4. Architecture Overview

Three new symbols in `src/behavioral-metrics.ts`:

| Component                  | Status            | Responsibility                                                                |
| -------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `Metric<TState, TResult>`  | new (interface)   | Accumulator contract: `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`. |
| `runMetrics(bundles, metrics)` | new (function) | One-pass-per-bundle reducer. Returns `MetricsResult` (Record<string, unknown>) keyed by metric name. |
| Built-in metrics           | new (functions)   | `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`. |

Plus two helpers:

- `compareMetricsResults(baseline, current)` — pure delta computation.
- `Stats` type — `{ count; min; max; mean; p50; p95; p99 }` for built-in stats metrics.

```
              ┌─────────────────────────────────────────┐
              │      runMetrics(bundles, metrics)       │
              │                                         │
              │  ┌──────────────────┐   ┌────────────┐  │
              │  │ for each bundle  │   │ for each   │  │
              │  │   for each metric│ ─▶│ metric:    │  │
              │  │     observe()    │   │ finalize() │  │
              │  └──────────────────┘   └────────────┘  │
              └─────────────────────────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ MetricsResult   │
                     │ {[name]: result}│
                     └─────────────────┘
                              │
                              ▼
                  ┌──────────────────────────┐
                  │ compareMetricsResults    │
                  │   (baseline, current)    │
                  └──────────────────────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │ MetricsDelta   │
                     │ {[name]: delta}│
                     └────────────────┘
```

## 5. Metric Contract

### 5.1 The `Metric` interface

```ts
export interface Metric<TState, TResult> {
  /** Human-readable name; used as the key in MetricsResult. Must be unique within a runMetrics call. */
  readonly name: string;
  /** Initial accumulator state. Called once at start of run. */
  create(): TState;
  /**
   * Update the accumulator with a single bundle. Returns the updated state,
   * which MAY be the same reference as the input state (in-place mutation
   * is permitted for performance) or a new value. The contract is functional
   * purity: output depends only on (state, bundle) and produces no global
   * side effects. Concurrent calls observe()-ing the same state reference
   * are NOT safe; v1's runMetrics is single-threaded so this is moot, but
   * future parallel-merge implementations must give each worker its own
   * accumulator state.
   */
  observe(state: TState, bundle: SessionBundle): TState;
  /** Convert final accumulator state to the metric's result type. */
  finalize(state: TState): TResult;
  /**
   * Optional: merge two accumulator states. If provided, marks the metric as
   * suitable for future parallel-corpus processing. Not called by v1's
   * synchronous runMetrics. Implied invariant: metrics that declare `merge`
   * MUST be order-insensitive (you cannot meaningfully combine two partial
   * accumulators if order matters across the boundary).
   */
  merge?(a: TState, b: TState): TState;
  /**
   * Optional: declare order-sensitivity. Default: false (order-insensitive).
   * This is a doc-only declaration — runMetrics does NOT auto-detect or warn
   * on non-deterministic iteration sources. When `orderSensitive: true` is
   * set, the caller is responsible for materializing bundles in stable
   * order before passing them to runMetrics.
   */
  readonly orderSensitive?: boolean;
}
```

### 5.2 Why accumulator-style and not `(bundle) => T` + `combine`

A `(bundle) => T` + `combine(values)` shape forces the caller to materialize one `T` per bundle, which is fine for cheap metrics (counts) but expensive for ones that buffer raw values for percentile calc. The accumulator contract lets each metric pick its own representation: `bundleCount` keeps a single integer; `sessionLengthStats` keeps a sorted-array-on-finalize buffer; `commandTypeCounts` keeps a `Map<string, number>`. One-pass through the corpus, multiplexed across all metrics.

The alternative `(bundles) => TAgg` shape forces every metric to re-walk the corpus. For N metrics, that's N scans. The accumulator contract is one scan total.

### 5.3 Determinism

A metric is **order-insensitive** if `metric(observe(observe(s, a), b)) === metric(observe(observe(s, b), a))` for any state `s` and bundles `a`, `b`. v1's built-ins are all order-insensitive (counts, sums, sorted-on-finalize percentiles). Order-sensitive user metrics declare `orderSensitive: true` as a doc-only marker; `runMetrics` does NOT auto-detect or warn on iteration source — the caller is responsible for stable order when an `orderSensitive` metric is in the list.

For the percentile metrics (`Stats` type), the implementation buffers all values and sorts on `finalize` — exact percentiles, deterministic regardless of bundle iteration order. Percentile method: NumPy `linear` (R-quantile type 7). Formula: `index = (count - 1) * p; lo = floor(index); hi = ceil(index); v = sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo)`. For `count === 1`, all percentiles equal that single value. For `count === 0`, all numeric fields are `null` (see §6.2).

## 6. Built-in Metrics

All built-ins return their `Metric<TState, TResult>` value from a factory function, mirroring Spec 3's `noopPolicy()` / `randomPolicy(config)` pattern.

### 6.1 `bundleCount()`

```ts
function bundleCount(): Metric<{ count: number }, number>;
// Result: total number of bundles in the corpus.
```

### 6.2 `sessionLengthStats(name?)` and the `Stats` shape

```ts
export interface Stats {
  count: number;
  min: number | null;   // null when count === 0
  max: number | null;
  mean: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}

function sessionLengthStats(name?: string): Metric<number[], Stats>;
// State: buffered bundle.metadata.durationTicks values.
// Result: Stats over durationTicks.
// Default name: 'sessionLengthStats'.
```

The numeric fields are `number | null` — `null` represents "no data" and is JSON-stable. `NaN` is NOT used because `JSON.stringify(NaN) === 'null'` and `JSON.parse('null')` produces `null` (not `NaN`) — so a `NaN`-using baseline saved to disk and reloaded would silently change shape (lossy round-trip). For `count === 1`, `min === max === mean === p50 === p95 === p99 === <the single value>`. For `count === 0`, all are `null`.

### 6.3 `commandRateStats(name?)`

```ts
function commandRateStats(name?: string): Metric<number[], Stats>;
// Per-bundle rate: durationTicks > 0 ? bundle.commands.length / durationTicks : 0.
// Bundles with durationTicks === 0 contribute 0 (no divide-by-zero; no inflation).
// Note: counts SUBMITTED commands (rejected included). For accepted-only,
// see commandValidationAcceptanceRate (§6.10) and use bundle.executions in user-defined
// metrics for an executed-rate variant.
```

### 6.4 `eventRateStats(name?)`

```ts
function eventRateStats(name?: string): Metric<number[], Stats>;
// Per-bundle rate: durationTicks > 0 ? sum(bundle.ticks[].events.length) / durationTicks : 0.
```

### 6.5 `commandTypeCounts(name?)`

```ts
function commandTypeCounts(name?: string): Metric<Map<string, number>, Record<string, number>>;
// State: Map<command-type-string, count> aggregated across all bundles.
// Result: plain object for JSON-friendliness.
// Note: counts ALL submissions including rejected ones (bundle.commands is
// the submission log, not the executed log — SessionRecorder records every
// submitWithResult call regardless of result.accepted). For executed-only
// type counts, define a user metric reading bundle.executions[].commandType.
```

### 6.6 `eventTypeCounts(name?)`

```ts
function eventTypeCounts(name?: string): Metric<Map<string, number>, Record<string, number>>;
// Same shape as commandTypeCounts but over bundle.ticks[].events[].type.
```

### 6.7 `failureBundleRate(name?)`

```ts
function failureBundleRate(name?: string): Metric<{ withFailure: number; total: number }, number>;
// Counts bundles where metadata.failedTicks?.length > 0.
// Result: failureBundleCount / totalBundles in [0, 1]. Empty corpus → 0.
// Note: orthogonal to incompleteBundleRate. A bundle can have failedTicks
// without being incomplete (in-flight tick failures the world recovered
// from), and could in principle be incomplete with empty failedTicks
// (sink failure that happened to not coincide with a tick failure).
```

### 6.8 `failedTickRate(name?)`

```ts
function failedTickRate(name?: string): Metric<{ failedTicks: number; durationTicks: number }, number>;
// Sums failedTicks count and durationTicks across all bundles.
// Result: totalDurationTicks > 0 ? totalFailedTicks / totalDurationTicks : 0.
// Empty corpus OR zero-tick corpus (every bundle aborted on tick 0, e.g.,
// all-policyError) → 0. Avoids 0/0 NaN when bundles exist but no ticks ran.
```

### 6.9 `incompleteBundleRate(name?)`

```ts
function incompleteBundleRate(name?: string): Metric<{ incomplete: number; total: number }, number>;
// Counts bundles where metadata.incomplete === true.
// Result: incompleteBundleCount / totalBundles in [0, 1]. Empty corpus → 0.
// Note: orthogonal to failureBundleRate (see §6.7).
```

### 6.10 `commandValidationAcceptanceRate(name?)`

```ts
function commandValidationAcceptanceRate(name?: string): Metric<{ accepted: number; total: number }, number>;
// Numerator: count of bundle.commands[] where result.accepted === true.
// Denominator: total bundle.commands[] across all bundles (every submitWithResult call).
// Result: accepted / total in [0, 1]. Empty corpus or zero-submission corpus → 0.
//
// This is the SUBMISSION-stage / validator-gate metric. Validator-rejected
// commands appear in bundle.commands with result.accepted === false but
// NEVER reach bundle.executions — they're dropped before queueing per
// world.ts:732-748. So this metric is the only way to detect a regression
// where validators start rejecting more (or fewer) commands.
```

### 6.11 `executionFailureRate(name?)`

```ts
function executionFailureRate(name?: string): Metric<{ failed: number; total: number }, number>;
// Numerator: count of bundle.executions[] where executed === false.
// Denominator: total bundle.executions[] across all bundles.
// Result: failed / total in [0, 1]. Empty corpus or zero-execution corpus → 0.
//
// This is the EXECUTION-stage metric. Captures handler-side failures only,
// NOT validator rejections (those don't reach bundle.executions). Per
// world.ts:1686/1721/1769, executed === false comes from one of: missing
// handler, command_handler_threw, or tick_aborted_before_handler.
//
// Pair with commandValidationAcceptanceRate to get the full picture:
// - commandValidationAcceptanceRate dropping → validator regression.
// - executionFailureRate rising → handler/tick-pipeline regression.
```

### 6.12 What's deliberately NOT built in

- `stopReasonHistogram` — `stopReason` is `SynthPlaytestResult.stopReason`, NOT in `bundle.metadata`. Aggregating it would require a Spec 3 follow-up to persist it. Deferred.
- `sourceKindHistogram` — possible from `bundle.metadata.sourceKind`, but every bundle in a synth-corpus is `'synthetic'` by construction. Trivial counter; user-defined.
- `durationMsStats` — `WorldMetrics.durationMs` is runtime instrumentation (`performance.now()`-backed), not behavior data. Out of scope per §2.
- Per-phase failure metrics ("what fraction of failures are in `phase: 'systems'`") — `bundle.failures: TickFailure[]` carries the phase + error info. v1 only reads `metadata.failedTicks` (just the tick numbers). User-defined for now; ship a built-in if a clear engine-generic shape emerges.
- Executed-only command/event type histograms — see notes in §6.5/§6.6. User-defined via `bundle.executions[].commandType`.
- Game-semantic metrics — out of scope per §2.

## 7. Harness API

### 7.1 `runMetrics`

```ts
export interface MetricsResult {
  [name: string]: unknown;  // each metric's finalize() output, keyed by metric.name
}

import type { JsonValue } from './json.js';

export function runMetrics<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
>(
  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
  metrics: Metric<unknown, unknown>[],
): MetricsResult;
```

The bundle-side generics let a caller holding `SessionBundle<MyEvents, MyCommands>[]` pass it without assignability friction. `MetricsResult` is a `Record<string, unknown>`; per-metric result narrowing happens at the consumption site (see §10's CI example for the type-assertion idiom). A typed-name-tuple builder that derives `MetricsResult` from a `const`-asserted metric tuple is doable but defers to v2 — not worth the type-level complexity for v1's primary use case (read a few metrics by name in a known position).

Lifecycle:

1. **Validate** metric names are unique. Throws `RangeError` on collision.
2. **Init**: `state = metrics.map(m => m.create())`.
3. **Observe**: for each `bundle` in `bundles`, for each `(metric, i)`, `state[i] = metric.observe(state[i], bundle)`.
4. **Finalize**: `result[m.name] = m.finalize(state[i])`.
5. **Return**: `result`.

The `Iterable<SessionBundle>` constraint matches arrays, generators, `Set`, and any custom iterable. **The iterable is consumed once** — generator-source bundles are exhausted by the first `runMetrics` call, so a caller computing baseline + current from one stream must materialize first (e.g., `const arr = Array.from(stream)`).

No `AsyncIterable` in v1 (deferred to Spec 7's corpus-loading or v2).

### 7.2 `compareMetricsResults`

```ts
export type NumericDelta = {
  baseline: number | null;
  current: number | null;
  delta: number | null;       // current - baseline; null when either side is null
  pctChange: number | null;   // (current - baseline) / baseline; see conventions below
};

export type OpaqueDelta = {
  baseline: unknown;
  current: unknown;
  equal: boolean;            // structural deep-equal
};

export type OnlyInComparison = {
  baseline?: unknown;        // present iff key only in baseline
  current?: unknown;         // present iff key only in current
  onlyIn: 'baseline' | 'current';
};

export type MetricDelta =
  | NumericDelta
  | OpaqueDelta
  | { [key: string]: MetricDelta | OnlyInComparison };  // record-typed: recurse per-key

export type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;

export function compareMetricsResults(
  baseline: MetricsResult,
  current: MetricsResult,
): MetricsComparison;
```

**Recursion rule.** At every record-typed level (`MetricsResult` itself; nested `Record<string, number>` from `commandTypeCounts`; etc.), each key is one of:
- present in both sides → recurse with `compareMetricsResults` semantics on the values.
- present only in baseline → `{ baseline: <value>, onlyIn: 'baseline' }`.
- present only in current → `{ current: <value>, onlyIn: 'current' }`.

**Leaf rules.**
- Both sides numbers → `NumericDelta` with: `delta = current - baseline`; `pctChange = (current - baseline) / baseline`.
  - `0 / 0 → 0` (both zero, no change).
  - `nonzero / 0 → +Infinity` or `-Infinity` (sign of `current - baseline`).
- Either side `null` (e.g., empty-corpus `Stats` field) → both `delta` and `pctChange` are `null` (consumers can detect "no baseline data" or "no current data").
- Both sides non-numeric same shape → `OpaqueDelta` with `equal = deepEqual(a, b)`.
- Arrays are treated as opaque leaves — no per-element diff in v1. User metrics returning numeric arrays (e.g., histogram buckets) get only `equal: boolean`. (Per-element recursion is v2 territory.)
- Type mismatch (e.g., baseline number, current string) → `OpaqueDelta` with `equal: false`.

**Caveat for negative-baseline values.** `pctChange = (current - baseline) / baseline` is unintuitive when `baseline < 0` — e.g., `-5 → 5` yields `pctChange = -2` (not `+200%` as users might expect from "percent change"). All v1 built-in metrics return non-negative values (counts, rates in `[0, 1]`, `Stats` over non-negative domains), so this doesn't affect built-ins. User-defined metrics that can return negative values should compute their own pctChange via `Math.abs` or a domain-aware formula if "percent change" semantics matter.

Game-specific judgment ("18% shift in p95 duration is bad") is up to the caller — see §10.

### 7.3 Failure modes

- **Empty corpus.** `runMetrics([], metrics)` runs `create()` then `finalize()` for each metric — no `observe` calls. Built-ins handle this gracefully: `bundleCount` returns `0`; `*Rate` metrics return `0` (defined via `total === 0 → 0`); `*Stats` return `{ count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null }`. The `null` fields flag "no data" without throwing AND survive JSON round-trip (`NaN` would not — `JSON.stringify(NaN) === 'null'`, but `JSON.parse('null') !== NaN`, so a baseline saved to disk and reloaded would silently change shape).
- **Duplicate metric names.** Throws `RangeError('duplicate metric name: <name>')`.
- **Metric throws inside `observe`.** Propagates — the corpus pass is a pure user-controlled function; the harness doesn't catch.
- **Bundle with `failedTicks` populated.** Built-ins handle — `failureBundleRate` and `failedTickRate` are designed for this case. Other metrics aggregate the bundle's data normally.

## 8. Determinism

Two `runMetrics(bundles, metrics)` calls with the same bundles (deep-equal, in any order if all metrics are order-insensitive) produce structurally-equal results. v1 built-ins are all order-insensitive. Order-sensitive user metrics declare via `orderSensitive: true` and the caller is responsible for stable iteration.

Volatile bundle metadata (`sessionId`, `recordedAt`) is NOT used by any built-in metric. User-defined metrics that read these get fragile results — flaky deltas in `compareMetricsResults` because every run produces a fresh UUID and timestamp.

`Stats` percentile calc uses linear interpolation between sorted samples (the standard method). Implementation: sort numeric buffer on `finalize`, then index. Exact, deterministic, O(n log n) per metric.

## 9. Integration with Existing Primitives

- **`runSynthPlaytest`**: produces bundles that are the natural input to `runMetrics`. CI pattern: run N synthetic playtests in parallel → collect bundles → `runMetrics(bundles, metrics)` → compare against baseline.
- **`SessionRecorder` / `SessionReplayer`**: bundles produced by either (live recordings, scenario adapters, synthetic playtests) are accepted by `runMetrics` uniformly.
- **`SessionBundle` shape**: all fields read by built-ins (`metadata.durationTicks`, `metadata.failedTicks`, `metadata.incomplete`, `commands[].type`, `ticks[].events[].type`) are present in v0.8.0+ bundles. Older bundles (v0.7.x) work but lack `metadata.policySeed` (which v1 metrics don't read anyway).

## 10. CI Pattern

```ts
import { runSynthPlaytest, runMetrics, compareMetricsResults,
         bundleCount, sessionLengthStats, commandRateStats,
         commandTypeCounts, failureBundleRate } from 'civ-engine';

// Generate corpus.
const bundles: SessionBundle[] = [];
for (let i = 0; i < 64; i++) {
  const result = runSynthPlaytest({
    world: setup(),
    policies: [/* ... */],
    maxTicks: 1000,
    policySeed: i,  // distinct seed per run
  });
  if (result.ok) bundles.push(result.bundle);
}

// Compute metrics.
const metrics = [
  bundleCount(),
  sessionLengthStats(),
  commandRateStats(),
  commandTypeCounts(),
  failureBundleRate(),
];
const current = runMetrics(bundles, metrics);

// Compare against baseline (loaded from previous CI run).
const baseline = JSON.parse(fs.readFileSync('baseline-metrics.json', 'utf-8'));
const comparison = compareMetricsResults(baseline, current);

// Caller decides what's a regression. MetricsComparison is Record<string, ...>;
// per-metric narrowing happens at the consumption site via type assertion.
const sessionLengthEntry = comparison.sessionLengthStats;
if (sessionLengthEntry === undefined || 'onlyIn' in sessionLengthEntry) {
  // Either baseline or current is missing this metric — schema mismatch.
  // For CI, treating this as an error (rather than silently skipping) catches
  // baselines that drifted from the current metric set.
  throw new Error(`sessionLengthStats missing or unilateral in comparison`);
}
const p95 = (sessionLengthEntry as { p95: NumericDelta }).p95;
if (p95.pctChange !== null && Math.abs(p95.pctChange) > 0.20) {
  throw new Error(`p95 session length shifted ${(p95.pctChange * 100).toFixed(1)}%`);
}
```

The `'onlyIn' in val` runtime check + `as` assertion is the v1 type-narrowing pattern. v2 may add a typed-name-tuple builder (`runMetricsTyped(bundles, [bundleCount(), sessionLengthStats()] as const)` returning a literal-keyed result type). Out of scope for v1.

## 11. Performance

- **Per-bundle cost.** Each metric's `observe` is called once per bundle. Built-ins are O(1) (counts, sums) or O(commands+events) for the type-counts metrics. Total per-bundle cost: O(commands + events).
- **Memory.** `Stats` metrics buffer numeric values (one number per bundle). For 10k bundles, that's ~80KB per `Stats` metric — negligible. Type-count `Map`s are bounded by distinct command/event types (typically dozens).
- **Corpus size.** v1 holds the entire `Iterable` only as long as needed for one pass. With a generator source, bundles stream through; only the metric accumulator state is retained.

## 12. Testing Strategy

Unit / integration tests target:

- **Built-in metrics:**
    - `bundleCount` over empty / single / many bundles.
    - `*Stats` — empty corpus returns `count: 0` + `null` numeric fields (per §6.2 — JSON-stable); 1-bundle corpus has `count: 1` + degenerate `min === max === mean === p50 === ...`; multi-bundle corpus matches hand-computed percentiles (NumPy linear / R type 7).
    - `commandTypeCounts` aggregates across multiple bundles; respects discriminated-union `type` field on `RecordedCommand`.
    - `eventTypeCounts` similarly.
    - `failureBundleRate` over corpus with mix of failed/clean bundles.
    - `failedTickRate` over corpus with various failedTicks counts; clean corpus → 0.
    - `incompleteBundleRate` similarly.
- **`runMetrics`:**
    - Multiplexing: 11 built-ins in one pass produces all 11 results.
    - Empty corpus: each metric produces its zero-state result.
    - Duplicate metric names: throws `RangeError`.
    - User-defined metric: implements the contract, observes correctly, finalizes correctly.
    - Order-insensitivity: same bundles in different order → same result for built-ins.
- **`compareMetricsResults`:**
    - Numeric deltas + pctChange computed correctly.
    - 0/0 → 0; nonzero/0 → `+Infinity` (or `-Infinity`).
    - Non-numeric leaves report `equal: boolean`.
    - Keys-only-in-one-side reported correctly.
- **Determinism:**
    - Two `runMetrics` calls on structurally-equal corpora produce deep-equal `MetricsResult`.
    - Sub-tests for each built-in's result stability.

Acceptance criterion: every case enumerated above has at least one test. (No coverage-percent target — concrete case enumeration is the actionable bar.)

## 13. Documentation Surface

Per AGENTS.md:

- `docs/api-reference.md` — new section `## Behavioral Metrics (v0.8.2)` for `Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `NumericDelta`, `OpaqueDelta`, `OnlyInComparison`, `Stats`, `runMetrics`, `compareMetricsResults`, plus subsections for each of the 11 built-in metric factories.
- `docs/guides/behavioral-metrics.md` (new) — quickstart, custom-metric authoring guide, CI pattern, comparison-helper usage, determinism notes.
- `docs/guides/synthetic-playtest.md` — append a §"Computing metrics over bundles" cross-reference.
- `docs/guides/ai-integration.md` — note Spec 8 as a Tier-2 piece of the AI feedback loop.
- `docs/architecture/ARCHITECTURE.md` — Component Map row.
- `docs/architecture/decisions.md` — ADRs for the accumulator contract and the deliberate non-features.
- `docs/architecture/drift-log.md` — entry.
- `docs/changelog.md` — version entry (see §14).
- `docs/devlog/summary.md` + `detailed/` — per-task entries.
- `README.md` — Feature Overview row + Public Surface bullet + version badge.
- `docs/README.md` — index entry.
- `docs/design/ai-first-dev-roadmap.md` — Spec 8 status: Drafted → Implemented after T2 lands.

## 14. Versioning

Branch base: v0.8.1 (after Spec 3 merge). Direct-to-main commits per AGENTS.md (no branches).

Plan structure (estimated 2 commits):

- **T1 (v0.8.2 — c-bump, purely additive)**: ships:
  - `Metric` interface, `runMetrics`, all 11 built-in metric factories, `compareMetricsResults`, `Stats` + delta types.
  - Unit tests covering each built-in + `runMetrics` multiplexing + `compareMetricsResults`.
  - api-reference + guide + ADRs 23, 24 (accumulator contract; non-feature catalog).
- **T2 (v0.8.3 — c-bump)**: Determinism integration tests + structural docs:
  - Determinism integration tests (dual-run `runMetrics` produces deep-equal results; hand-computed-percentile tests; order-insensitivity verification).
  - `docs/architecture/ARCHITECTURE.md` Component Map row.
  - `docs/architecture/drift-log.md` entry.
  - `docs/design/ai-first-dev-roadmap.md` status update.
  - `docs/guides/ai-integration.md` Tier-2 reference.

(Alternative single-commit landing: v0.8.2. The two-commit split mirrors Spec 3's T2/T3 separation but is optional given Spec 8's smaller scope. Decision deferred to plan stage.)

## 15. Architectural Decisions

### ADR 23: Accumulator-style metric contract over reducer or per-bundle-map+combine

**Decision:** `Metric<TState, TResult>` exposes `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`. Stateful, streaming-friendly, one-pass-multiplex-able.

**Rationale:** A `(bundle) => T` + `combine(T[])` shape forces materializing one T per bundle and prevents per-metric representation choice (Stats wants a sorted buffer, counts wants an integer). A `(bundles) => TAgg` shape forces per-metric corpus walks (N scans for N metrics). Accumulator-style is one scan total, each metric picks its own state shape, and `merge` is a future-compat hook for parallel/distributed corpus processing without breaking the v1 contract.

### ADR 24: Engine-generic built-ins only; game-semantic metrics are user-defined

**Decision:** v1 ships 11 built-in metrics that read only `SessionBundle` fields the engine guarantees (`metadata.durationTicks`, `commands[].type`, `commands[].result.accepted`, `executions[].executed`, `metadata.failedTicks`, `metadata.incomplete`, etc.). Game-semantic metrics like "resource Gini" or "time-to-first-conflict" are NOT built in — they require standard event/marker contracts that the engine doesn't define.

**Rationale:** civ-engine is a general-purpose engine; metrics shipped in the engine package must work for any consuming game. Game-semantic metrics need game-specific event names, component shapes, and marker conventions. Game projects implement those as user-defined `Metric<TState, TResult>` instances and compose them into their own `runMetrics(bundles, [...builtins, ...gameMetrics])` calls.

### ADR 25: `compareMetricsResults` returns deltas, not regression judgments

**Decision:** The helper returns numeric deltas and percent changes; it does NOT classify changes as regressions, improvements, or noise.

**Rationale:** "Is an 18% shift in p95 session length a regression?" is game- and policy-specific. Some games consider longer sessions a feature; others a bug. Some metrics are noisy (small corpus, high variance); others stable. Encoding judgment thresholds into the engine would either bake the wrong defaults for half the consumers or require a config surface that's its own complexity tax. Caller-side judgment is the right boundary.

### ADR 26: `Iterable<SessionBundle>` only in v1; `AsyncIterable` deferred

**Decision:** v1 accepts only synchronous `Iterable<SessionBundle>`. Arrays, generators, sets, and any custom synchronous iterable work. `AsyncIterable` is NOT supported.

**Rationale:** Spec 3's harness is synchronous; the natural composition is synchronous corpus reduction. `AsyncIterable` is worth the complexity when corpus loading involves I/O — Spec 7's bundle index, network-backed corpora — none of which exist yet. Adding async now is abstraction-before-pressure. The future-compat path is a separate `runMetricsAsync` function (returns `Promise<MetricsResult>`), not an overload of `runMetrics` — overloading would force the return type to widen to `MetricsResult | Promise<MetricsResult>`, which IS breaking for existing callers that assume sync. Two named functions keeps the v1 surface stable.

### ADR 27: Do NOT aggregate `stopReason` in v1

**Decision:** No `stopReasonHistogram` built-in. `SynthPlaytestResult.stopReason` lives outside `SessionBundle`; aggregating it requires a separate Spec 3 follow-up to persist it into `metadata`.

**Rationale:** The right thing for game CI is to see "10% of synth runs ended in `policyError`" — but today that requires the test runner to track `result.stopReason` per harness call, not the corpus reducer. Forcing the metric into v1 would either (a) couple Spec 8 to Spec 3's result type (not bundle-only), or (b) require a Spec 3 follow-up that's better landed independently. Either way, v1 ships without it; users who want it accumulate `stopReason` outside `runMetrics`.

## 16. Open Questions / Deferred

1. **Persistent baseline storage.** This spec doesn't mandate where `baseline-metrics.json` lives. Test code or CI scripts persist their own baselines; future Spec 7 might index baselines alongside bundles.
2. **Per-tick metrics.** Could a metric look inside `bundle.ticks[]` to compute "average commands per tick over time"? Yes — the contract allows arbitrary bundle traversal. But shipping such metrics as built-ins would explode the surface area. User-defined.
3. **Approximate sketches.** HyperLogLog for distinct-event-type estimation, t-digest for percentiles over huge corpora. Not needed at current scales (< 10K bundles per CI run); land when memory pressure hits.
4. **Parallel corpus processing.** The `merge` hook is reserved but unused. v2 could expose `runMetricsParallel(bundleStreams, metrics)` that splits bundles across workers and merges accumulators. Out of scope for v1.
5. **`stopReason` persistence in `SessionMetadata`.** Separate Spec 3 follow-up. Once landed, `stopReasonHistogram` becomes a 1-day add-on.
6. **Bundle filtering / windowing.** "Compute metrics only over bundles where `metadata.policySeed % 2 === 0`." Caller-side: materialize first if needed (e.g., `Array.from(stream).filter(...)` since `Iterable<T>` doesn't have `.filter`). Or write a generator: `function* filtered() { for (const b of bundles) if (pred(b)) yield b; }`. No new API needed.
7. **`SESSION_BUNDLE_SCHEMA_VERSION` validation.** v1 doesn't check `bundle.schemaVersion` (only one version exists). When `schemaVersion > 1` ships, `runMetrics` should validate or accept a version-mapping option. Future spec.

## 17. Future Specs (this surface unlocks)

| Future Spec                          | What it adds                                                                |
| ------------------------------------ | --------------------------------------------------------------------------- |
| #7 Bundle Search / Corpus Index      | Persistent corpus → wraps as `Iterable<SessionBundle>` for `runMetrics`.    |
| #9 AI Playtester Agent               | LLM-driven Policy + LLM-interpretable `MetricsResult` for analysis.         |
| Future: Async corpus reducer (v2)    | Separate `runMetricsAsync(bundles: AsyncIterable<...>, metrics): Promise<MetricsResult>` for I/O-backed sources. Distinct function (not an overload of `runMetrics`) per ADR 26. |
| Future: Parallel corpus reducer       | Worker-distributed `runMetricsParallel` with accumulator `merge`.           |
| Future: stopReason persistence        | Spec 3 follow-up to put `stopReason` in `metadata`; trivializes histogram.  |

## 18. Acceptance Criteria

- All new symbols (`Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `NumericDelta`, `OpaqueDelta`, `OnlyInComparison`, `Stats`, `runMetrics`, `compareMetricsResults`, plus 11 built-in factories: `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`) exported from `src/index.ts` with TypeScript types.
- Test coverage: each built-in tested for empty / single / multi-bundle inputs; `runMetrics` multiplexing test; `compareMetricsResults` numeric + null + opaque + only-in-side + nested-record cases; user-defined-metric round-trip; order-insensitivity verification (apply-twice-with-different-orders).
- All four engine gates pass.
- §13 doc updates land in the same commits as the code that introduces each surface.
- Multi-CLI design review and code review reach convergence — reviewers nitpick rather than catching real issues, per AGENTS.md.
