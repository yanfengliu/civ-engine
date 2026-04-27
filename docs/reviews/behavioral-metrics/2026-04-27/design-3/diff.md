diff --git a/docs/design/2026-04-27-behavioral-metrics-design.md b/docs/design/2026-04-27-behavioral-metrics-design.md
index 3178e37..2102c40 100644
--- a/docs/design/2026-04-27-behavioral-metrics-design.md
+++ b/docs/design/2026-04-27-behavioral-metrics-design.md
@@ -1,6 +1,6 @@
 # Behavioral Metrics over Corpus — Design Spec
 
-**Status:** Draft v2 (2026-04-27). Awaiting iter-2 multi-CLI review. Iter-1 synthesis at `docs/reviews/behavioral-metrics/2026-04-27/design-1/REVIEW.md`. v2 addresses 7 HIGH (typing, version mismatch, immutability vs state-shape contradiction, NaN JSON, rate formula contradiction, percentile method underspecified, rejected-commands handling) + 6 MED + 4 LOW + 4 NIT.
+**Status:** Draft v3 (2026-04-27). Awaiting iter-3 multi-CLI review. Iter-1, 2 syntheses at `docs/reviews/behavioral-metrics/2026-04-27/design-{1,2}/REVIEW.md`. v3 addresses iter-2's H-EXEC-SEMANTICS (`commandValidationAcceptanceRate` read from wrong source — validator rejections don't reach `bundle.executions`) + M-FAILEDTICK-DIVZERO (§6.8 zero-tick-corpus guard) + 6 NITs. Iter-1 already addressed 7 HIGH + 6 MED + 4 LOW.
 
 **Scope:** Tier-2 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 8). Builds on the Synthetic Playtest Harness (Spec 3, merged v0.7.20 → v0.8.1). Out of scope: persistent corpus storage / indexing (Spec 7), bundle search (Spec 7), AI playtester agent (Spec 9), counterfactual replay (Spec 5), annotation UI (Spec 2), bundle viewer (Spec 4).
 
@@ -47,7 +47,7 @@ Three new symbols in `src/behavioral-metrics.ts`:
 | -------------------------- | ----------------- | ----------------------------------------------------------------------------- |
 | `Metric<TState, TResult>`  | new (interface)   | Accumulator contract: `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`. |
 | `runMetrics(bundles, metrics)` | new (function) | One-pass-per-bundle reducer. Returns `MetricsResult` (Record<string, unknown>) keyed by metric name. |
-| Built-in metrics           | new (functions)   | `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandAcceptanceRate`, `executionFailureRate`. |
+| Built-in metrics           | new (functions)   | `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`. |
 
 Plus two helpers:
 
@@ -168,7 +168,7 @@ function sessionLengthStats(name?: string): Metric<number[], Stats>;
 // Default name: 'sessionLengthStats'.
 ```
 
-The numeric fields are `number | null` — `null` represents "no data" and is JSON-stable (unlike `NaN`, which `JSON.stringify` coerces to `null` losslessly but `JSON.parse` cannot recover as `NaN`). For `count === 1`, `min === max === mean === p50 === p95 === p99 === <the single value>`. For `count === 0`, all are `null`.
+The numeric fields are `number | null` — `null` represents "no data" and is JSON-stable. `NaN` is NOT used because `JSON.stringify(NaN) === 'null'` and `JSON.parse('null')` produces `null` (not `NaN`) — so a `NaN`-using baseline saved to disk and reloaded would silently change shape (lossy round-trip). For `count === 1`, `min === max === mean === p50 === p95 === p99 === <the single value>`. For `count === 0`, all are `null`.
 
 ### 6.3 `commandRateStats(name?)`
 
@@ -177,7 +177,7 @@ function commandRateStats(name?: string): Metric<number[], Stats>;
 // Per-bundle rate: durationTicks > 0 ? bundle.commands.length / durationTicks : 0.
 // Bundles with durationTicks === 0 contribute 0 (no divide-by-zero; no inflation).
 // Note: counts SUBMITTED commands (rejected included). For accepted-only,
-// see commandAcceptanceRate (§6.10) and use bundle.executions in user-defined
+// see commandValidationAcceptanceRate (§6.10) and use bundle.executions in user-defined
 // metrics for an executed-rate variant.
 ```
 
@@ -224,7 +224,9 @@ function failureBundleRate(name?: string): Metric<{ withFailure: number; total:
 ```ts
 function failedTickRate(name?: string): Metric<{ failedTicks: number; durationTicks: number }, number>;
 // Sums failedTicks count and durationTicks across all bundles.
-// Result: totalFailedTicks / totalDurationTicks in [0, 1]. Empty corpus → 0.
+// Result: totalDurationTicks > 0 ? totalFailedTicks / totalDurationTicks : 0.
+// Empty corpus OR zero-tick corpus (every bundle aborted on tick 0, e.g.,
+// all-policyError) → 0. Avoids 0/0 NaN when bundles exist but no ticks ran.
 ```
 
 ### 6.9 `incompleteBundleRate(name?)`
@@ -236,18 +238,19 @@ function incompleteBundleRate(name?: string): Metric<{ incomplete: number; total
 // Note: orthogonal to failureBundleRate (see §6.7).
 ```
 
-### 6.10 `commandAcceptanceRate(name?)`
+### 6.10 `commandValidationAcceptanceRate(name?)`
 
 ```ts
-function commandAcceptanceRate(name?: string): Metric<{ accepted: number; total: number }, number>;
-// Numerator: count of bundle.executions[] where executed === true.
-// Denominator: total executions across all bundles.
-// Result: accepted / total in [0, 1]. Empty corpus or zero-execution corpus → 0.
+function commandValidationAcceptanceRate(name?: string): Metric<{ accepted: number; total: number }, number>;
+// Numerator: count of bundle.commands[] where result.accepted === true.
+// Denominator: total bundle.commands[] across all bundles (every submitWithResult call).
+// Result: accepted / total in [0, 1]. Empty corpus or zero-submission corpus → 0.
 //
-// Distinct from §6.5/§6.3: those count SUBMISSIONS (bundle.commands).
-// This counts EXECUTIONS (bundle.executions), filtered by executed flag.
-// CommandExecutionResult.executed === false captures both validator
-// rejections and handler-side failures.
+// This is the SUBMISSION-stage / validator-gate metric. Validator-rejected
+// commands appear in bundle.commands with result.accepted === false but
+// NEVER reach bundle.executions — they're dropped before queueing per
+// world.ts:732-748. So this metric is the only way to detect a regression
+// where validators start rejecting more (or fewer) commands.
 ```
 
 ### 6.11 `executionFailureRate(name?)`
@@ -255,12 +258,17 @@ function commandAcceptanceRate(name?: string): Metric<{ accepted: number; total:
 ```ts
 function executionFailureRate(name?: string): Metric<{ failed: number; total: number }, number>;
 // Numerator: count of bundle.executions[] where executed === false.
-// Denominator: total executions across all bundles.
+// Denominator: total bundle.executions[] across all bundles.
 // Result: failed / total in [0, 1]. Empty corpus or zero-execution corpus → 0.
 //
-// Note: commandAcceptanceRate + executionFailureRate === 1 over a non-empty
-// corpus. Both are shipped because callers usually want one or the other
-// based on the regression direction they're watching for.
+// This is the EXECUTION-stage metric. Captures handler-side failures only,
+// NOT validator rejections (those don't reach bundle.executions). Per
+// world.ts:1686/1721/1769, executed === false comes from one of: missing
+// handler, command_handler_threw, or tick_aborted_before_handler.
+//
+// Pair with commandValidationAcceptanceRate to get the full picture:
+// - commandValidationAcceptanceRate dropping → validator regression.
+// - executionFailureRate rising → handler/tick-pipeline regression.
 ```
 
 ### 6.12 What's deliberately NOT built in
@@ -356,6 +364,8 @@ export function compareMetricsResults(
 - Arrays are treated as opaque leaves — no per-element diff in v1. User metrics returning numeric arrays (e.g., histogram buckets) get only `equal: boolean`. (Per-element recursion is v2 territory.)
 - Type mismatch (e.g., baseline number, current string) → `OpaqueDelta` with `equal: false`.
 
+**Caveat for negative-baseline values.** `pctChange = (current - baseline) / baseline` is unintuitive when `baseline < 0` — e.g., `-5 → 5` yields `pctChange = -2` (not `+200%` as users might expect from "percent change"). All v1 built-in metrics return non-negative values (counts, rates in `[0, 1]`, `Stats` over non-negative domains), so this doesn't affect built-ins. User-defined metrics that can return negative values should compute their own pctChange via `Math.abs` or a domain-aware formula if "percent change" semantics matter.
+
 Game-specific judgment ("18% shift in p95 duration is bad") is up to the caller — see §10.
 
 ### 7.3 Failure modes
@@ -369,7 +379,7 @@ Game-specific judgment ("18% shift in p95 duration is bad") is up to the caller
 
 Two `runMetrics(bundles, metrics)` calls with the same bundles (deep-equal, in any order if all metrics are order-insensitive) produce structurally-equal results. v1 built-ins are all order-insensitive. Order-sensitive user metrics declare via `orderSensitive: true` and the caller is responsible for stable iteration.
 
-Volatile bundle metadata (`sessionId`, `recordedAt`) is NOT used by any built-in metric. User-defined metrics that read these get fragile results — the §6.10 list documents the deliberate exclusion.
+Volatile bundle metadata (`sessionId`, `recordedAt`) is NOT used by any built-in metric. User-defined metrics that read these get fragile results — §6.12 documents the deliberate exclusion.
 
 `Stats` percentile calc uses linear interpolation between sorted samples (the standard method). Implementation: sort numeric buffer on `finalize`, then index. Exact, deterministic, O(n log n) per metric.
 
@@ -414,14 +424,20 @@ const comparison = compareMetricsResults(baseline, current);
 
 // Caller decides what's a regression. MetricsComparison is Record<string, ...>;
 // per-metric narrowing happens at the consumption site via type assertion.
-const sessionLengthDelta = comparison.sessionLengthStats as { p95: NumericDelta } | undefined;
-const p95 = sessionLengthDelta?.p95;
-if (p95 && p95.pctChange !== null && Math.abs(p95.pctChange) > 0.20) {
+const sessionLengthEntry = comparison.sessionLengthStats;
+if (sessionLengthEntry === undefined || 'onlyIn' in sessionLengthEntry) {
+  // Either baseline or current is missing this metric — schema mismatch.
+  // For CI, treating this as an error (rather than silently skipping) catches
+  // baselines that drifted from the current metric set.
+  throw new Error(`sessionLengthStats missing or unilateral in comparison`);
+}
+const p95 = (sessionLengthEntry as { p95: NumericDelta }).p95;
+if (p95.pctChange !== null && Math.abs(p95.pctChange) > 0.20) {
   throw new Error(`p95 session length shifted ${(p95.pctChange * 100).toFixed(1)}%`);
 }
 ```
 
-This `as` assertion idiom is the v1 type-narrowing pattern. v2 may add a typed-name-tuple builder (`runMetricsTyped(bundles, [bundleCount(), sessionLengthStats()] as const)` returning a literal-keyed result type). Out of scope for v1.
+The `'onlyIn' in val` runtime check + `as` assertion is the v1 type-narrowing pattern. v2 may add a typed-name-tuple builder (`runMetricsTyped(bundles, [bundleCount(), sessionLengthStats()] as const)` returning a literal-keyed result type). Out of scope for v1.
 
 ## 11. Performance
 
@@ -518,7 +534,7 @@ Plan structure (estimated 2 commits):
 
 **Decision:** v1 accepts only synchronous `Iterable<SessionBundle>`. Arrays, generators, sets, and any custom synchronous iterable work. `AsyncIterable` is NOT supported.
 
-**Rationale:** Spec 3's harness is synchronous; the natural composition is synchronous corpus reduction. `AsyncIterable` is worth the complexity when corpus loading involves I/O — Spec 7's bundle index, network-backed corpora — none of which exist yet. Adding async now is abstraction-before-pressure; adding it later is a non-breaking signature widening (overload).
+**Rationale:** Spec 3's harness is synchronous; the natural composition is synchronous corpus reduction. `AsyncIterable` is worth the complexity when corpus loading involves I/O — Spec 7's bundle index, network-backed corpora — none of which exist yet. Adding async now is abstraction-before-pressure. The future-compat path is a separate `runMetricsAsync` function (returns `Promise<MetricsResult>`), not an overload of `runMetrics` — overloading would force the return type to widen to `MetricsResult | Promise<MetricsResult>`, which IS breaking for existing callers that assume sync. Two named functions keeps the v1 surface stable.
 
 ### ADR 27: Do NOT aggregate `stopReason` in v1
 
@@ -548,7 +564,7 @@ Plan structure (estimated 2 commits):
 
 ## 18. Acceptance Criteria
 
-- All new symbols (`Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `NumericDelta`, `OpaqueDelta`, `OnlyInComparison`, `Stats`, `runMetrics`, `compareMetricsResults`, plus 11 built-in factories: `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandAcceptanceRate`, `executionFailureRate`) exported from `src/index.ts` with TypeScript types.
+- All new symbols (`Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `NumericDelta`, `OpaqueDelta`, `OnlyInComparison`, `Stats`, `runMetrics`, `compareMetricsResults`, plus 11 built-in factories: `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`) exported from `src/index.ts` with TypeScript types.
 - Test coverage: each built-in tested for empty / single / multi-bundle inputs; `runMetrics` multiplexing test; `compareMetricsResults` numeric + null + opaque + only-in-side + nested-record cases; user-defined-metric round-trip; order-insensitivity verification (apply-twice-with-different-orders).
 - All four engine gates pass.
 - §13 doc updates land in the same commits as the code that introduces each surface.
