diff --git a/docs/design/2026-04-27-behavioral-metrics-design.md b/docs/design/2026-04-27-behavioral-metrics-design.md
index 6ce2440..3178e37 100644
--- a/docs/design/2026-04-27-behavioral-metrics-design.md
+++ b/docs/design/2026-04-27-behavioral-metrics-design.md
@@ -1,6 +1,6 @@
 # Behavioral Metrics over Corpus — Design Spec
 
-**Status:** Draft v1 (2026-04-27). Awaiting iter-1 multi-CLI review.
+**Status:** Draft v2 (2026-04-27). Awaiting iter-2 multi-CLI review. Iter-1 synthesis at `docs/reviews/behavioral-metrics/2026-04-27/design-1/REVIEW.md`. v2 addresses 7 HIGH (typing, version mismatch, immutability vs state-shape contradiction, NaN JSON, rate formula contradiction, percentile method underspecified, rejected-commands handling) + 6 MED + 4 LOW + 4 NIT.
 
 **Scope:** Tier-2 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 8). Builds on the Synthetic Playtest Harness (Spec 3, merged v0.7.20 → v0.8.1). Out of scope: persistent corpus storage / indexing (Spec 7), bundle search (Spec 7), AI playtester agent (Spec 9), counterfactual replay (Spec 5), annotation UI (Spec 2), bundle viewer (Spec 4).
 
@@ -46,8 +46,8 @@ Three new symbols in `src/behavioral-metrics.ts`:
 | Component                  | Status            | Responsibility                                                                |
 | -------------------------- | ----------------- | ----------------------------------------------------------------------------- |
 | `Metric<TState, TResult>`  | new (interface)   | Accumulator contract: `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`. |
-| `runMetrics(bundles, metrics)` | new (function) | One-pass-per-bundle reducer. Returns `Record<string, TResult>` keyed by metric name. |
-| Built-in metrics           | new (functions)   | `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`. |
+| `runMetrics(bundles, metrics)` | new (function) | One-pass-per-bundle reducer. Returns `MetricsResult` (Record<string, unknown>) keyed by metric name. |
+| Built-in metrics           | new (functions)   | `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandAcceptanceRate`, `executionFailureRate`. |
 
 Plus two helpers:
 
@@ -94,20 +94,33 @@ export interface Metric<TState, TResult> {
   readonly name: string;
   /** Initial accumulator state. Called once at start of run. */
   create(): TState;
-  /** Update the accumulator with a single bundle. Pure: must return new state, not mutate. */
+  /**
+   * Update the accumulator with a single bundle. Returns the updated state,
+   * which MAY be the same reference as the input state (in-place mutation
+   * is permitted for performance) or a new value. The contract is functional
+   * purity: output depends only on (state, bundle) and produces no global
+   * side effects. Concurrent calls observe()-ing the same state reference
+   * are NOT safe; v1's runMetrics is single-threaded so this is moot, but
+   * future parallel-merge implementations must give each worker its own
+   * accumulator state.
+   */
   observe(state: TState, bundle: SessionBundle): TState;
   /** Convert final accumulator state to the metric's result type. */
   finalize(state: TState): TResult;
   /**
    * Optional: merge two accumulator states. If provided, marks the metric as
    * suitable for future parallel-corpus processing. Not called by v1's
-   * synchronous runMetrics.
+   * synchronous runMetrics. Implied invariant: metrics that declare `merge`
+   * MUST be order-insensitive (you cannot meaningfully combine two partial
+   * accumulators if order matters across the boundary).
    */
   merge?(a: TState, b: TState): TState;
   /**
    * Optional: declare order-sensitivity. Default: false (order-insensitive).
-   * If true, runMetrics warns when bundles are passed in non-deterministic
-   * iteration order (e.g., from a Map).
+   * This is a doc-only declaration — runMetrics does NOT auto-detect or warn
+   * on non-deterministic iteration sources. When `orderSensitive: true` is
+   * set, the caller is responsible for materializing bundles in stable
+   * order before passing them to runMetrics.
    */
   readonly orderSensitive?: boolean;
 }
@@ -121,9 +134,9 @@ The alternative `(bundles) => TAgg` shape forces every metric to re-walk the cor
 
 ### 5.3 Determinism
 
-A metric is **order-insensitive** if `metric(observe(observe(s, a), b)) === metric(observe(observe(s, b), a))` for any state `s` and bundles `a`, `b`. v1's built-ins are all order-insensitive (counts, sums, sorted-on-finalize percentiles). Order-sensitive metrics declare `orderSensitive: true`; `runMetrics` warns when iterating a non-deterministic source (e.g., `Map.values()`).
+A metric is **order-insensitive** if `metric(observe(observe(s, a), b)) === metric(observe(observe(s, b), a))` for any state `s` and bundles `a`, `b`. v1's built-ins are all order-insensitive (counts, sums, sorted-on-finalize percentiles). Order-sensitive user metrics declare `orderSensitive: true` as a doc-only marker; `runMetrics` does NOT auto-detect or warn on iteration source — the caller is responsible for stable order when an `orderSensitive` metric is in the list.
 
-For the percentile metrics (`Stats` type), the implementation buffers all values and sorts on `finalize` — exact percentiles, deterministic regardless of bundle iteration order.
+For the percentile metrics (`Stats` type), the implementation buffers all values and sorts on `finalize` — exact percentiles, deterministic regardless of bundle iteration order. Percentile method: NumPy `linear` (R-quantile type 7). Formula: `index = (count - 1) * p; lo = floor(index); hi = ceil(index); v = sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo)`. For `count === 1`, all percentiles equal that single value. For `count === 0`, all numeric fields are `null` (see §6.2).
 
 ## 6. Built-in Metrics
 
@@ -136,29 +149,43 @@ function bundleCount(): Metric<{ count: number }, number>;
 // Result: total number of bundles in the corpus.
 ```
 
-### 6.2 `sessionLengthStats(name?)`
+### 6.2 `sessionLengthStats(name?)` and the `Stats` shape
 
 ```ts
+export interface Stats {
+  count: number;
+  min: number | null;   // null when count === 0
+  max: number | null;
+  mean: number | null;
+  p50: number | null;
+  p95: number | null;
+  p99: number | null;
+}
+
 function sessionLengthStats(name?: string): Metric<number[], Stats>;
 // State: buffered bundle.metadata.durationTicks values.
-// Result: { count, min, max, mean, p50, p95, p99 } over durationTicks.
+// Result: Stats over durationTicks.
 // Default name: 'sessionLengthStats'.
 ```
 
+The numeric fields are `number | null` — `null` represents "no data" and is JSON-stable (unlike `NaN`, which `JSON.stringify` coerces to `null` losslessly but `JSON.parse` cannot recover as `NaN`). For `count === 1`, `min === max === mean === p50 === p95 === p99 === <the single value>`. For `count === 0`, all are `null`.
+
 ### 6.3 `commandRateStats(name?)`
 
 ```ts
 function commandRateStats(name?: string): Metric<number[], Stats>;
-// State: buffered (bundle.commands.length / max(durationTicks, 1)) values.
-// Result: Stats over per-bundle command rates.
-// Bundles with durationTicks === 0 contribute 0 (avoids divide-by-zero).
+// Per-bundle rate: durationTicks > 0 ? bundle.commands.length / durationTicks : 0.
+// Bundles with durationTicks === 0 contribute 0 (no divide-by-zero; no inflation).
+// Note: counts SUBMITTED commands (rejected included). For accepted-only,
+// see commandAcceptanceRate (§6.10) and use bundle.executions in user-defined
+// metrics for an executed-rate variant.
 ```
 
 ### 6.4 `eventRateStats(name?)`
 
 ```ts
 function eventRateStats(name?: string): Metric<number[], Stats>;
-// State: buffered (sum of bundle.ticks[].events.length / max(durationTicks, 1)) values.
+// Per-bundle rate: durationTicks > 0 ? sum(bundle.ticks[].events.length) / durationTicks : 0.
 ```
 
 ### 6.5 `commandTypeCounts(name?)`
@@ -167,6 +194,10 @@ function eventRateStats(name?: string): Metric<number[], Stats>;
 function commandTypeCounts(name?: string): Metric<Map<string, number>, Record<string, number>>;
 // State: Map<command-type-string, count> aggregated across all bundles.
 // Result: plain object for JSON-friendliness.
+// Note: counts ALL submissions including rejected ones (bundle.commands is
+// the submission log, not the executed log — SessionRecorder records every
+// submitWithResult call regardless of result.accepted). For executed-only
+// type counts, define a user metric reading bundle.executions[].commandType.
 ```
 
 ### 6.6 `eventTypeCounts(name?)`
@@ -181,7 +212,11 @@ function eventTypeCounts(name?: string): Metric<Map<string, number>, Record<stri
 ```ts
 function failureBundleRate(name?: string): Metric<{ withFailure: number; total: number }, number>;
 // Counts bundles where metadata.failedTicks?.length > 0.
-// Result: failureBundleCount / totalBundles in [0, 1].
+// Result: failureBundleCount / totalBundles in [0, 1]. Empty corpus → 0.
+// Note: orthogonal to incompleteBundleRate. A bundle can have failedTicks
+// without being incomplete (in-flight tick failures the world recovered
+// from), and could in principle be incomplete with empty failedTicks
+// (sink failure that happened to not coincide with a tick failure).
 ```
 
 ### 6.8 `failedTickRate(name?)`
@@ -189,7 +224,7 @@ function failureBundleRate(name?: string): Metric<{ withFailure: number; total:
 ```ts
 function failedTickRate(name?: string): Metric<{ failedTicks: number; durationTicks: number }, number>;
 // Sums failedTicks count and durationTicks across all bundles.
-// Result: totalFailedTicks / totalDurationTicks in [0, 1].
+// Result: totalFailedTicks / totalDurationTicks in [0, 1]. Empty corpus → 0.
 ```
 
 ### 6.9 `incompleteBundleRate(name?)`
@@ -197,14 +232,44 @@ function failedTickRate(name?: string): Metric<{ failedTicks: number; durationTi
 ```ts
 function incompleteBundleRate(name?: string): Metric<{ incomplete: number; total: number }, number>;
 // Counts bundles where metadata.incomplete === true.
-// Result: incompleteBundleCount / totalBundles in [0, 1].
+// Result: incompleteBundleCount / totalBundles in [0, 1]. Empty corpus → 0.
+// Note: orthogonal to failureBundleRate (see §6.7).
+```
+
+### 6.10 `commandAcceptanceRate(name?)`
+
+```ts
+function commandAcceptanceRate(name?: string): Metric<{ accepted: number; total: number }, number>;
+// Numerator: count of bundle.executions[] where executed === true.
+// Denominator: total executions across all bundles.
+// Result: accepted / total in [0, 1]. Empty corpus or zero-execution corpus → 0.
+//
+// Distinct from §6.5/§6.3: those count SUBMISSIONS (bundle.commands).
+// This counts EXECUTIONS (bundle.executions), filtered by executed flag.
+// CommandExecutionResult.executed === false captures both validator
+// rejections and handler-side failures.
+```
+
+### 6.11 `executionFailureRate(name?)`
+
+```ts
+function executionFailureRate(name?: string): Metric<{ failed: number; total: number }, number>;
+// Numerator: count of bundle.executions[] where executed === false.
+// Denominator: total executions across all bundles.
+// Result: failed / total in [0, 1]. Empty corpus or zero-execution corpus → 0.
+//
+// Note: commandAcceptanceRate + executionFailureRate === 1 over a non-empty
+// corpus. Both are shipped because callers usually want one or the other
+// based on the regression direction they're watching for.
 ```
 
-### 6.10 What's deliberately NOT built in
+### 6.12 What's deliberately NOT built in
 
 - `stopReasonHistogram` — `stopReason` is `SynthPlaytestResult.stopReason`, NOT in `bundle.metadata`. Aggregating it would require a Spec 3 follow-up to persist it. Deferred.
 - `sourceKindHistogram` — possible from `bundle.metadata.sourceKind`, but every bundle in a synth-corpus is `'synthetic'` by construction. Trivial counter; user-defined.
 - `durationMsStats` — `WorldMetrics.durationMs` is runtime instrumentation (`performance.now()`-backed), not behavior data. Out of scope per §2.
+- Per-phase failure metrics ("what fraction of failures are in `phase: 'systems'`") — `bundle.failures: TickFailure[]` carries the phase + error info. v1 only reads `metadata.failedTicks` (just the tick numbers). User-defined for now; ship a built-in if a clear engine-generic shape emerges.
+- Executed-only command/event type histograms — see notes in §6.5/§6.6. User-defined via `bundle.executions[].commandType`.
 - Game-semantic metrics — out of scope per §2.
 
 ## 7. Harness API
@@ -216,12 +281,20 @@ export interface MetricsResult {
   [name: string]: unknown;  // each metric's finalize() output, keyed by metric.name
 }
 
-export function runMetrics(
-  bundles: Iterable<SessionBundle>,
+import type { JsonValue } from './json.js';
+
+export function runMetrics<
+  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+  TDebug = JsonValue,
+>(
+  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
   metrics: Metric<unknown, unknown>[],
 ): MetricsResult;
 ```
 
+The bundle-side generics let a caller holding `SessionBundle<MyEvents, MyCommands>[]` pass it without assignability friction. `MetricsResult` is a `Record<string, unknown>`; per-metric result narrowing happens at the consumption site (see §10's CI example for the type-assertion idiom). A typed-name-tuple builder that derives `MetricsResult` from a `const`-asserted metric tuple is doable but defers to v2 — not worth the type-level complexity for v1's primary use case (read a few metrics by name in a known position).
+
 Lifecycle:
 
 1. **Validate** metric names are unique. Throws `RangeError` on collision.
@@ -230,20 +303,38 @@ Lifecycle:
 4. **Finalize**: `result[m.name] = m.finalize(state[i])`.
 5. **Return**: `result`.
 
-The `Iterable<SessionBundle>` constraint matches arrays, generators, `Set`, and any custom iterable. No `AsyncIterable` in v1 (deferred to Spec 7's corpus-loading or v2).
+The `Iterable<SessionBundle>` constraint matches arrays, generators, `Set`, and any custom iterable. **The iterable is consumed once** — generator-source bundles are exhausted by the first `runMetrics` call, so a caller computing baseline + current from one stream must materialize first (e.g., `const arr = Array.from(stream)`).
+
+No `AsyncIterable` in v1 (deferred to Spec 7's corpus-loading or v2).
 
 ### 7.2 `compareMetricsResults`
 
 ```ts
-export interface MetricDelta {
-  /** Same key shape as the metric result. Numeric leaves get `{ baseline, current, delta, pctChange }`; non-numeric leaves get `{ baseline, current, equal }`. */
-  // (recursive shape — see TS source for exact type)
-}
-
-export interface MetricsComparison {
-  [name: string]: MetricDelta;
-  // Plus: keys present in only one side reported as `{ baseline?: ..., current?: ..., onlyIn: 'baseline' | 'current' }`.
-}
+export type NumericDelta = {
+  baseline: number | null;
+  current: number | null;
+  delta: number | null;       // current - baseline; null when either side is null
+  pctChange: number | null;   // (current - baseline) / baseline; see conventions below
+};
+
+export type OpaqueDelta = {
+  baseline: unknown;
+  current: unknown;
+  equal: boolean;            // structural deep-equal
+};
+
+export type OnlyInComparison = {
+  baseline?: unknown;        // present iff key only in baseline
+  current?: unknown;         // present iff key only in current
+  onlyIn: 'baseline' | 'current';
+};
+
+export type MetricDelta =
+  | NumericDelta
+  | OpaqueDelta
+  | { [key: string]: MetricDelta | OnlyInComparison };  // record-typed: recurse per-key
+
+export type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;
 
 export function compareMetricsResults(
   baseline: MetricsResult,
@@ -251,11 +342,25 @@ export function compareMetricsResults(
 ): MetricsComparison;
 ```
 
-For numeric leaves, `pctChange = (current - baseline) / baseline`, with the conventional `0/0 → 0`, `nonzero/0 → +Infinity`, defined explicitly so consumers don't trip on it. For non-numeric leaves (strings, booleans, arrays, objects) the helper just reports `equal: deepEqual(a, b)`. Game-specific judgment ("18% shift in p95 duration is bad") is up to the caller.
+**Recursion rule.** At every record-typed level (`MetricsResult` itself; nested `Record<string, number>` from `commandTypeCounts`; etc.), each key is one of:
+- present in both sides → recurse with `compareMetricsResults` semantics on the values.
+- present only in baseline → `{ baseline: <value>, onlyIn: 'baseline' }`.
+- present only in current → `{ current: <value>, onlyIn: 'current' }`.
+
+**Leaf rules.**
+- Both sides numbers → `NumericDelta` with: `delta = current - baseline`; `pctChange = (current - baseline) / baseline`.
+  - `0 / 0 → 0` (both zero, no change).
+  - `nonzero / 0 → +Infinity` or `-Infinity` (sign of `current - baseline`).
+- Either side `null` (e.g., empty-corpus `Stats` field) → both `delta` and `pctChange` are `null` (consumers can detect "no baseline data" or "no current data").
+- Both sides non-numeric same shape → `OpaqueDelta` with `equal = deepEqual(a, b)`.
+- Arrays are treated as opaque leaves — no per-element diff in v1. User metrics returning numeric arrays (e.g., histogram buckets) get only `equal: boolean`. (Per-element recursion is v2 territory.)
+- Type mismatch (e.g., baseline number, current string) → `OpaqueDelta` with `equal: false`.
+
+Game-specific judgment ("18% shift in p95 duration is bad") is up to the caller — see §10.
 
 ### 7.3 Failure modes
 
-- **Empty corpus.** `runMetrics([], metrics)` runs `create()` then `finalize()` for each metric — no `observe` calls. Built-ins handle this gracefully: `bundleCount` returns `0`; `*Rate` metrics return `0` (defined via `total === 0 → 0`); `*Stats` return `{ count: 0, min: NaN, max: NaN, mean: NaN, p50: NaN, p95: NaN, p99: NaN }`. The `NaN`s flag "no data" without throwing.
+- **Empty corpus.** `runMetrics([], metrics)` runs `create()` then `finalize()` for each metric — no `observe` calls. Built-ins handle this gracefully: `bundleCount` returns `0`; `*Rate` metrics return `0` (defined via `total === 0 → 0`); `*Stats` return `{ count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null }`. The `null` fields flag "no data" without throwing AND survive JSON round-trip (`NaN` would not — `JSON.stringify(NaN) === 'null'`, but `JSON.parse('null') !== NaN`, so a baseline saved to disk and reloaded would silently change shape).
 - **Duplicate metric names.** Throws `RangeError('duplicate metric name: <name>')`.
 - **Metric throws inside `observe`.** Propagates — the corpus pass is a pure user-controlled function; the harness doesn't catch.
 - **Bundle with `failedTicks` populated.** Built-ins handle — `failureBundleRate` and `failedTickRate` are designed for this case. Other metrics aggregate the bundle's data normally.
@@ -307,13 +412,17 @@ const current = runMetrics(bundles, metrics);
 const baseline = JSON.parse(fs.readFileSync('baseline-metrics.json', 'utf-8'));
 const comparison = compareMetricsResults(baseline, current);
 
-// Caller decides what's a regression.
-const sessionLengthP95 = comparison.sessionLengthStats?.p95;
-if (sessionLengthP95 && Math.abs(sessionLengthP95.pctChange) > 0.20) {
-  throw new Error(`p95 session length shifted ${sessionLengthP95.pctChange * 100}%`);
+// Caller decides what's a regression. MetricsComparison is Record<string, ...>;
+// per-metric narrowing happens at the consumption site via type assertion.
+const sessionLengthDelta = comparison.sessionLengthStats as { p95: NumericDelta } | undefined;
+const p95 = sessionLengthDelta?.p95;
+if (p95 && p95.pctChange !== null && Math.abs(p95.pctChange) > 0.20) {
+  throw new Error(`p95 session length shifted ${(p95.pctChange * 100).toFixed(1)}%`);
 }
 ```
 
+This `as` assertion idiom is the v1 type-narrowing pattern. v2 may add a typed-name-tuple builder (`runMetricsTyped(bundles, [bundleCount(), sessionLengthStats()] as const)` returning a literal-keyed result type). Out of scope for v1.
+
 ## 11. Performance
 
 - **Per-bundle cost.** Each metric's `observe` is called once per bundle. Built-ins are O(1) (counts, sums) or O(commands+events) for the type-counts metrics. Total per-bundle cost: O(commands + events).
@@ -353,7 +462,7 @@ Acceptance criterion: 100% of new code covered by tests.
 
 Per AGENTS.md:
 
-- `docs/api-reference.md` — new section `## Behavioral Metrics (v0.9.0)` for `Metric`, `MetricsResult`, `MetricsComparison`, `Stats`, `runMetrics`, `compareMetricsResults`, plus subsections for each of the 9 built-in metric factories.
+- `docs/api-reference.md` — new section `## Behavioral Metrics (v0.8.2)` for `Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `NumericDelta`, `OpaqueDelta`, `OnlyInComparison`, `Stats`, `runMetrics`, `compareMetricsResults`, plus subsections for each of the 11 built-in metric factories.
 - `docs/guides/behavioral-metrics.md` (new) — quickstart, custom-metric authoring guide, CI pattern, comparison-helper usage, determinism notes.
 - `docs/guides/synthetic-playtest.md` — append a §"Computing metrics over bundles" cross-reference.
 - `docs/guides/ai-integration.md` — note Spec 8 as a Tier-2 piece of the AI feedback loop.
@@ -372,11 +481,11 @@ Branch base: v0.8.1 (after Spec 3 merge). Direct-to-main commits per AGENTS.md (
 
 Plan structure (estimated 2 commits):
 
-- **T1 (v0.9.0)** — `b`-bump? No — this is purely additive (no breaking changes to merged surface). c-bump: **v0.8.2**. Ships:
-  - `Metric` interface, `runMetrics`, all 9 built-in metric factories, `compareMetricsResults`, `Stats` type.
+- **T1 (v0.8.2 — c-bump, purely additive)**: ships:
+  - `Metric` interface, `runMetrics`, all 11 built-in metric factories, `compareMetricsResults`, `Stats` + delta types.
   - Unit tests covering each built-in + `runMetrics` multiplexing + `compareMetricsResults`.
   - api-reference + guide + ADRs 23, 24 (accumulator contract; non-feature catalog).
-- **T2 (v0.8.3)** — c-bump. Determinism integration tests + structural docs:
+- **T2 (v0.8.3 — c-bump)**: Determinism integration tests + structural docs:
   - Determinism integration tests (dual-run `runMetrics` produces deep-equal results; hand-computed-percentile tests; order-insensitivity verification).
   - `docs/architecture/ARCHITECTURE.md` Component Map row.
   - `docs/architecture/drift-log.md` entry.
@@ -424,7 +533,8 @@ Plan structure (estimated 2 commits):
 3. **Approximate sketches.** HyperLogLog for distinct-event-type estimation, t-digest for percentiles over huge corpora. Not needed at current scales (< 10K bundles per CI run); land when memory pressure hits.
 4. **Parallel corpus processing.** The `merge` hook is reserved but unused. v2 could expose `runMetricsParallel(bundleStreams, metrics)` that splits bundles across workers and merges accumulators. Out of scope for v1.
 5. **`stopReason` persistence in `SessionMetadata`.** Separate Spec 3 follow-up. Once landed, `stopReasonHistogram` becomes a 1-day add-on.
-6. **Bundle filtering / windowing.** "Compute metrics only over bundles where `metadata.policySeed % 2 === 0`." Caller-side: just `runMetrics(bundles.filter(...), metrics)`. No new API needed.
+6. **Bundle filtering / windowing.** "Compute metrics only over bundles where `metadata.policySeed % 2 === 0`." Caller-side: materialize first if needed (e.g., `Array.from(stream).filter(...)` since `Iterable<T>` doesn't have `.filter`). Or write a generator: `function* filtered() { for (const b of bundles) if (pred(b)) yield b; }`. No new API needed.
+7. **`SESSION_BUNDLE_SCHEMA_VERSION` validation.** v1 doesn't check `bundle.schemaVersion` (only one version exists). When `schemaVersion > 1` ships, `runMetrics` should validate or accept a version-mapping option. Future spec.
 
 ## 17. Future Specs (this surface unlocks)
 
@@ -438,8 +548,8 @@ Plan structure (estimated 2 commits):
 
 ## 18. Acceptance Criteria
 
-- All new symbols (`Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `Stats`, `runMetrics`, `compareMetricsResults`, plus 9 built-in factories: `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`) exported from `src/index.ts` with full TypeScript types.
-- Test coverage: each built-in tested for empty / single / multi-bundle inputs; `runMetrics` multiplexing test; `compareMetricsResults` numeric + non-numeric + edge cases; user-defined-metric round-trip; order-insensitivity verification.
+- All new symbols (`Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `NumericDelta`, `OpaqueDelta`, `OnlyInComparison`, `Stats`, `runMetrics`, `compareMetricsResults`, plus 11 built-in factories: `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandAcceptanceRate`, `executionFailureRate`) exported from `src/index.ts` with TypeScript types.
+- Test coverage: each built-in tested for empty / single / multi-bundle inputs; `runMetrics` multiplexing test; `compareMetricsResults` numeric + null + opaque + only-in-side + nested-record cases; user-defined-metric round-trip; order-insensitivity verification (apply-twice-with-different-orders).
 - All four engine gates pass.
 - §13 doc updates land in the same commits as the code that introduces each surface.
-- Multi-CLI design review and code review reach convergence (this iteration is iter-1).
+- Multi-CLI design review and code review reach convergence — reviewers nitpick rather than catching real issues, per AGENTS.md.
