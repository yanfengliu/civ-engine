diff --git a/docs/design/2026-04-27-behavioral-metrics-design.md b/docs/design/2026-04-27-behavioral-metrics-design.md
index 2102c40..9662cf5 100644
--- a/docs/design/2026-04-27-behavioral-metrics-design.md
+++ b/docs/design/2026-04-27-behavioral-metrics-design.md
@@ -1,6 +1,6 @@
 # Behavioral Metrics over Corpus — Design Spec
 
-**Status:** Draft v3 (2026-04-27). Awaiting iter-3 multi-CLI review. Iter-1, 2 syntheses at `docs/reviews/behavioral-metrics/2026-04-27/design-{1,2}/REVIEW.md`. v3 addresses iter-2's H-EXEC-SEMANTICS (`commandValidationAcceptanceRate` read from wrong source — validator rejections don't reach `bundle.executions`) + M-FAILEDTICK-DIVZERO (§6.8 zero-tick-corpus guard) + 6 NITs. Iter-1 already addressed 7 HIGH + 6 MED + 4 LOW.
+**Status:** Draft v4 (2026-04-27). Awaiting iter-4 multi-CLI review. Iter-1, 2, 3 syntheses at `docs/reviews/behavioral-metrics/2026-04-27/design-1/REVIEW.md`, `docs/reviews/behavioral-metrics/2026-04-27/design-2/REVIEW.md`, and `docs/reviews/behavioral-metrics/2026-04-27/design-3/REVIEW.md`. v4 addresses iter-3's MED (stale §12 `NaN`s + 9-built-in count + ADR 24's "9 built-ins" not updated to v3's 11) + 2 NITs. Iter-1 fixed 7 HIGH + 6 MED + 4 LOW; iter-2 fixed 1 HIGH + 1 MED.
 
 **Scope:** Tier-2 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 8). Builds on the Synthetic Playtest Harness (Spec 3, merged v0.7.20 → v0.8.1). Out of scope: persistent corpus storage / indexing (Spec 7), bundle search (Spec 7), AI playtester agent (Spec 9), counterfactual replay (Spec 5), annotation UI (Spec 2), bundle viewer (Spec 4).
 
@@ -379,7 +379,7 @@ Game-specific judgment ("18% shift in p95 duration is bad") is up to the caller
 
 Two `runMetrics(bundles, metrics)` calls with the same bundles (deep-equal, in any order if all metrics are order-insensitive) produce structurally-equal results. v1 built-ins are all order-insensitive. Order-sensitive user metrics declare via `orderSensitive: true` and the caller is responsible for stable iteration.
 
-Volatile bundle metadata (`sessionId`, `recordedAt`) is NOT used by any built-in metric. User-defined metrics that read these get fragile results — §6.12 documents the deliberate exclusion.
+Volatile bundle metadata (`sessionId`, `recordedAt`) is NOT used by any built-in metric. User-defined metrics that read these get fragile results — flaky deltas in `compareMetricsResults` because every run produces a fresh UUID and timestamp.
 
 `Stats` percentile calc uses linear interpolation between sorted samples (the standard method). Implementation: sort numeric buffer on `finalize`, then index. Exact, deterministic, O(n log n) per metric.
 
@@ -451,14 +451,14 @@ Unit / integration tests target:
 
 - **Built-in metrics:**
     - `bundleCount` over empty / single / many bundles.
-    - `*Stats` — empty corpus returns `count: 0` + `NaN`s; 1-bundle corpus has `count: 1` + degenerate `min === max === mean === p50 === ...`; multi-bundle corpus matches hand-computed percentiles.
+    - `*Stats` — empty corpus returns `count: 0` + `null` numeric fields (per §6.2 — JSON-stable); 1-bundle corpus has `count: 1` + degenerate `min === max === mean === p50 === ...`; multi-bundle corpus matches hand-computed percentiles (NumPy linear / R type 7).
     - `commandTypeCounts` aggregates across multiple bundles; respects discriminated-union `type` field on `RecordedCommand`.
     - `eventTypeCounts` similarly.
     - `failureBundleRate` over corpus with mix of failed/clean bundles.
     - `failedTickRate` over corpus with various failedTicks counts; clean corpus → 0.
     - `incompleteBundleRate` similarly.
 - **`runMetrics`:**
-    - Multiplexing: 9 built-ins in one pass produces all 9 results.
+    - Multiplexing: 11 built-ins in one pass produces all 11 results.
     - Empty corpus: each metric produces its zero-state result.
     - Duplicate metric names: throws `RangeError`.
     - User-defined metric: implements the contract, observes correctly, finalizes correctly.
@@ -472,7 +472,7 @@ Unit / integration tests target:
     - Two `runMetrics` calls on structurally-equal corpora produce deep-equal `MetricsResult`.
     - Sub-tests for each built-in's result stability.
 
-Acceptance criterion: 100% of new code covered by tests.
+Acceptance criterion: every case enumerated above has at least one test. (No coverage-percent target — concrete case enumeration is the actionable bar.)
 
 ## 13. Documentation Surface
 
@@ -520,7 +520,7 @@ Plan structure (estimated 2 commits):
 
 ### ADR 24: Engine-generic built-ins only; game-semantic metrics are user-defined
 
-**Decision:** v1 ships 9 built-in metrics that read only `SessionBundle` fields the engine guarantees (`metadata.durationTicks`, `commands[].type`, etc.). Game-semantic metrics like "resource Gini" or "time-to-first-conflict" are NOT built in — they require standard event/marker contracts that the engine doesn't define.
+**Decision:** v1 ships 11 built-in metrics that read only `SessionBundle` fields the engine guarantees (`metadata.durationTicks`, `commands[].type`, `commands[].result.accepted`, `executions[].executed`, `metadata.failedTicks`, `metadata.incomplete`, etc.). Game-semantic metrics like "resource Gini" or "time-to-first-conflict" are NOT built in — they require standard event/marker contracts that the engine doesn't define.
 
 **Rationale:** civ-engine is a general-purpose engine; metrics shipped in the engine package must work for any consuming game. Game-semantic metrics need game-specific event names, component shapes, and marker conventions. Game projects implement those as user-defined `Metric<TState, TResult>` instances and compose them into their own `runMetrics(bundles, [...builtins, ...gameMetrics])` calls.
 
@@ -558,7 +558,7 @@ Plan structure (estimated 2 commits):
 | ------------------------------------ | --------------------------------------------------------------------------- |
 | #7 Bundle Search / Corpus Index      | Persistent corpus → wraps as `Iterable<SessionBundle>` for `runMetrics`.    |
 | #9 AI Playtester Agent               | LLM-driven Policy + LLM-interpretable `MetricsResult` for analysis.         |
-| Future: Async corpus reducer (v2)    | `AsyncIterable` overload for I/O-backed sources.                            |
+| Future: Async corpus reducer (v2)    | Separate `runMetricsAsync(bundles: AsyncIterable<...>, metrics): Promise<MetricsResult>` for I/O-backed sources. Distinct function (not an overload of `runMetrics`) per ADR 26. |
 | Future: Parallel corpus reducer       | Worker-distributed `runMetricsParallel` with accumulator `merge`.           |
 | Future: stopReason persistence        | Spec 3 follow-up to put `stopReason` in `metadata`; trivializes histogram.  |
 
