commit c469822c462f59312a55234c3792cffdbaa94af7
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 14:19:22 2026 -0700

    docs(design): behavioral metrics — design v1 (Spec 8)
    
    Tier-2 spec from ai-first-dev-roadmap. Builds on Spec 3's SessionBundle
    output. Defines a pure-function corpus-reducer + accumulator-style
    metric contract.
    
    Architecture:
    - Metric<TState, TResult>: create() / observe(state, bundle) / finalize(state)
      + optional merge(). Streaming-friendly, one-pass-multiplex-able.
    - runMetrics(bundles, metrics): MetricsResult — pure function over
      Iterable<SessionBundle>.
    - 9 built-in engine-generic metrics: bundleCount, sessionLengthStats,
      commandRateStats, eventRateStats, commandTypeCounts, eventTypeCounts,
      failureBundleRate, failedTickRate, incompleteBundleRate.
    - compareMetricsResults(baseline, current): thin delta helper, no
      regression judgment.
    
    Scope discipline (per Codex brainstorm):
    - Pure synchronous Iterable<SessionBundle> source. AsyncIterable
      deferred to Spec 7's corpus-loading.
    - No game-semantic metrics (resource Gini, time-to-first-conflict,
      etc.) — those need standard event/marker contracts engine doesn't
      define. User-defined.
    - No stopReason histogram — stopReason lives outside SessionBundle;
      needs separate Spec 3 follow-up to persist before aggregation makes
      sense.
    - No regression judgment — caller decides thresholds.
    - No persistent corpus storage — that's Spec 7.
    - No async/parallel/sketch — exact synchronous v1, future hooks
      reserved (merge optional).
    
    Versioning: v0.8.2 (T1 c-bump, additive) + v0.8.3 (T2 c-bump,
    integration tests + arch docs).
    
    ADRs: 23 (accumulator contract), 24 (engine-generic only), 25
    (comparison returns deltas not judgments), 26 (Iterable only in v1),
    27 (no stopReason aggregation).
    
    Awaiting iter-1 multi-CLI review.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/docs/design/2026-04-27-behavioral-metrics-design.md b/docs/design/2026-04-27-behavioral-metrics-design.md
new file mode 100644
index 0000000..6ce2440
--- /dev/null
+++ b/docs/design/2026-04-27-behavioral-metrics-design.md
@@ -0,0 +1,445 @@
+# Behavioral Metrics over Corpus — Design Spec
+
+**Status:** Draft v1 (2026-04-27). Awaiting iter-1 multi-CLI review.
+
+**Scope:** Tier-2 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 8). Builds on the Synthetic Playtest Harness (Spec 3, merged v0.7.20 → v0.8.1). Out of scope: persistent corpus storage / indexing (Spec 7), bundle search (Spec 7), AI playtester agent (Spec 9), counterfactual replay (Spec 5), annotation UI (Spec 2), bundle viewer (Spec 4).
+
+**Author:** civ-engine team
+
+**Related primitives:** `SessionBundle`, `runSynthPlaytest`, `SessionMetadata`, `RecordedCommand`, `SessionTickEntry`.
+
+## 1. Goals
+
+This spec defines an engine-level **corpus-reducer** that:
+
+- Computes aggregate **behavioral metrics** over an `Iterable<SessionBundle>` (which arrays, generators, and future filesystem readers all satisfy).
+- Ships a small set of **engine-generic built-in metrics** derivable from bundle data alone (no game semantics).
+- Exposes an **accumulator contract** for user-defined metrics that stays streaming-friendly and one-pass-multiplex-able.
+- Provides a **thin comparison helper** for baseline vs. current — returning deltas, not regression judgments.
+- Is deterministic given the same bundle set, regardless of bundle iteration order (where order-insensitive metrics are the default).
+
+The deliverable is an opt-in API surface; existing engine consumers see no behavioral change.
+
+## 2. Non-Goals
+
+- **Persistent corpus management.** Loading thousands of bundles from disk, indexing them by metadata, querying by tags, retention policies — all Spec 7's job.
+- **Async/streaming ingestion.** v1 accepts `Iterable<SessionBundle>` only. `AsyncIterable` defers to when Spec 7 lands or when corpus loading stops being trivially local.
+- **Game-semantic metrics.** "Resource Gini coefficient", "time-to-first-conflict", "dominant strategy distribution", "decision points per minute" — these need standard event/marker contracts that the engine doesn't define. Game projects implement these as user-defined metrics.
+- **Regression judgment.** "Is this 18% shift bad?" is game- and policy-specific. v1 ships `compareMetricsResults` which returns deltas + percent changes; the threshold/judgment layer is the caller's.
+- **Per-tick runtime instrumentation.** `WorldMetrics.durationMs` and similar are runtime-perf data, not behavior data. Mixing them into Spec 8 blurs the spec.
+- **Distributed/parallel merge.** The accumulator contract reserves an optional `merge` hook for future parallel processing, but v1 doesn't implement parallel corpus-pass.
+- **`stopReason` aggregation.** `SynthPlaytestResult.stopReason` is returned by the harness but NOT persisted in the bundle (per Spec 3 v10 §8). Aggregating it would require a Spec 3 follow-up to persist it; deferred.
+- **Approximate sketches.** v1 metrics are exact. HyperLogLog / t-digest / etc. land if/when corpora exceed memory.
+
+## 3. Background
+
+Spec 3 produces `SessionBundle`s via `runSynthPlaytest`. A typical workflow generates many bundles in CI: random-policy variations, scripted regression replays, scheduled overnight runs. Today the only way to spot trends across this corpus is reading individual bundles, which doesn't scale.
+
+Spec 8 fills the gap with a pure-function reducer: feed in bundles, get out structured metrics. CI compares `metrics(today's bundles)` against `metrics(yesterday's bundles)` to detect emergent-behavior regressions before they reach players.
+
+The reducer is intentionally divorced from corpus storage. Bundles arrive as `Iterable<SessionBundle>` — callers materialize from arrays, filesystem readers, or future Spec 7 indexes. Spec 8 doesn't care.
+
+## 4. Architecture Overview
+
+Three new symbols in `src/behavioral-metrics.ts`:
+
+| Component                  | Status            | Responsibility                                                                |
+| -------------------------- | ----------------- | ----------------------------------------------------------------------------- |
+| `Metric<TState, TResult>`  | new (interface)   | Accumulator contract: `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`. |
+| `runMetrics(bundles, metrics)` | new (function) | One-pass-per-bundle reducer. Returns `Record<string, TResult>` keyed by metric name. |
+| Built-in metrics           | new (functions)   | `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`. |
+
+Plus two helpers:
+
+- `compareMetricsResults(baseline, current)` — pure delta computation.
+- `Stats` type — `{ count; min; max; mean; p50; p95; p99 }` for built-in stats metrics.
+
+```
+              ┌─────────────────────────────────────────┐
+              │      runMetrics(bundles, metrics)       │
+              │                                         │
+              │  ┌──────────────────┐   ┌────────────┐  │
+              │  │ for each bundle  │   │ for each   │  │
+              │  │   for each metric│ ─▶│ metric:    │  │
+              │  │     observe()    │   │ finalize() │  │
+              │  └──────────────────┘   └────────────┘  │
+              └─────────────────────────────────────────┘
+                              │
+                              ▼
+                     ┌─────────────────┐
+                     │ MetricsResult   │
+                     │ {[name]: result}│
+                     └─────────────────┘
+                              │
+                              ▼
+                  ┌──────────────────────────┐
+                  │ compareMetricsResults    │
+                  │   (baseline, current)    │
+                  └──────────────────────────┘
+                              │
+                              ▼
+                     ┌────────────────┐
+                     │ MetricsDelta   │
+                     │ {[name]: delta}│
+                     └────────────────┘
+```
+
+## 5. Metric Contract
+
+### 5.1 The `Metric` interface
+
+```ts
+export interface Metric<TState, TResult> {
+  /** Human-readable name; used as the key in MetricsResult. Must be unique within a runMetrics call. */
+  readonly name: string;
+  /** Initial accumulator state. Called once at start of run. */
+  create(): TState;
+  /** Update the accumulator with a single bundle. Pure: must return new state, not mutate. */
+  observe(state: TState, bundle: SessionBundle): TState;
+  /** Convert final accumulator state to the metric's result type. */
+  finalize(state: TState): TResult;
+  /**
+   * Optional: merge two accumulator states. If provided, marks the metric as
+   * suitable for future parallel-corpus processing. Not called by v1's
+   * synchronous runMetrics.
+   */
+  merge?(a: TState, b: TState): TState;
+  /**
+   * Optional: declare order-sensitivity. Default: false (order-insensitive).
+   * If true, runMetrics warns when bundles are passed in non-deterministic
+   * iteration order (e.g., from a Map).
+   */
+  readonly orderSensitive?: boolean;
+}
+```
+
+### 5.2 Why accumulator-style and not `(bundle) => T` + `combine`
+
+A `(bundle) => T` + `combine(values)` shape forces the caller to materialize one `T` per bundle, which is fine for cheap metrics (counts) but expensive for ones that buffer raw values for percentile calc. The accumulator contract lets each metric pick its own representation: `bundleCount` keeps a single integer; `sessionLengthStats` keeps a sorted-array-on-finalize buffer; `commandTypeCounts` keeps a `Map<string, number>`. One-pass through the corpus, multiplexed across all metrics.
+
+The alternative `(bundles) => TAgg` shape forces every metric to re-walk the corpus. For N metrics, that's N scans. The accumulator contract is one scan total.
+
+### 5.3 Determinism
+
+A metric is **order-insensitive** if `metric(observe(observe(s, a), b)) === metric(observe(observe(s, b), a))` for any state `s` and bundles `a`, `b`. v1's built-ins are all order-insensitive (counts, sums, sorted-on-finalize percentiles). Order-sensitive metrics declare `orderSensitive: true`; `runMetrics` warns when iterating a non-deterministic source (e.g., `Map.values()`).
+
+For the percentile metrics (`Stats` type), the implementation buffers all values and sorts on `finalize` — exact percentiles, deterministic regardless of bundle iteration order.
+
+## 6. Built-in Metrics
+
+All built-ins return their `Metric<TState, TResult>` value from a factory function, mirroring Spec 3's `noopPolicy()` / `randomPolicy(config)` pattern.
+
+### 6.1 `bundleCount()`
+
+```ts
+function bundleCount(): Metric<{ count: number }, number>;
+// Result: total number of bundles in the corpus.
+```
+
+### 6.2 `sessionLengthStats(name?)`
+
+```ts
+function sessionLengthStats(name?: string): Metric<number[], Stats>;
+// State: buffered bundle.metadata.durationTicks values.
+// Result: { count, min, max, mean, p50, p95, p99 } over durationTicks.
+// Default name: 'sessionLengthStats'.
+```
+
+### 6.3 `commandRateStats(name?)`
+
+```ts
+function commandRateStats(name?: string): Metric<number[], Stats>;
+// State: buffered (bundle.commands.length / max(durationTicks, 1)) values.
+// Result: Stats over per-bundle command rates.
+// Bundles with durationTicks === 0 contribute 0 (avoids divide-by-zero).
+```
+
+### 6.4 `eventRateStats(name?)`
+
+```ts
+function eventRateStats(name?: string): Metric<number[], Stats>;
+// State: buffered (sum of bundle.ticks[].events.length / max(durationTicks, 1)) values.
+```
+
+### 6.5 `commandTypeCounts(name?)`
+
+```ts
+function commandTypeCounts(name?: string): Metric<Map<string, number>, Record<string, number>>;
+// State: Map<command-type-string, count> aggregated across all bundles.
+// Result: plain object for JSON-friendliness.
+```
+
+### 6.6 `eventTypeCounts(name?)`
+
+```ts
+function eventTypeCounts(name?: string): Metric<Map<string, number>, Record<string, number>>;
+// Same shape as commandTypeCounts but over bundle.ticks[].events[].type.
+```
+
+### 6.7 `failureBundleRate(name?)`
+
+```ts
+function failureBundleRate(name?: string): Metric<{ withFailure: number; total: number }, number>;
+// Counts bundles where metadata.failedTicks?.length > 0.
+// Result: failureBundleCount / totalBundles in [0, 1].
+```
+
+### 6.8 `failedTickRate(name?)`
+
+```ts
+function failedTickRate(name?: string): Metric<{ failedTicks: number; durationTicks: number }, number>;
+// Sums failedTicks count and durationTicks across all bundles.
+// Result: totalFailedTicks / totalDurationTicks in [0, 1].
+```
+
+### 6.9 `incompleteBundleRate(name?)`
+
+```ts
+function incompleteBundleRate(name?: string): Metric<{ incomplete: number; total: number }, number>;
+// Counts bundles where metadata.incomplete === true.
+// Result: incompleteBundleCount / totalBundles in [0, 1].
+```
+
+### 6.10 What's deliberately NOT built in
+
+- `stopReasonHistogram` — `stopReason` is `SynthPlaytestResult.stopReason`, NOT in `bundle.metadata`. Aggregating it would require a Spec 3 follow-up to persist it. Deferred.
+- `sourceKindHistogram` — possible from `bundle.metadata.sourceKind`, but every bundle in a synth-corpus is `'synthetic'` by construction. Trivial counter; user-defined.
+- `durationMsStats` — `WorldMetrics.durationMs` is runtime instrumentation (`performance.now()`-backed), not behavior data. Out of scope per §2.
+- Game-semantic metrics — out of scope per §2.
+
+## 7. Harness API
+
+### 7.1 `runMetrics`
+
+```ts
+export interface MetricsResult {
+  [name: string]: unknown;  // each metric's finalize() output, keyed by metric.name
+}
+
+export function runMetrics(
+  bundles: Iterable<SessionBundle>,
+  metrics: Metric<unknown, unknown>[],
+): MetricsResult;
+```
+
+Lifecycle:
+
+1. **Validate** metric names are unique. Throws `RangeError` on collision.
+2. **Init**: `state = metrics.map(m => m.create())`.
+3. **Observe**: for each `bundle` in `bundles`, for each `(metric, i)`, `state[i] = metric.observe(state[i], bundle)`.
+4. **Finalize**: `result[m.name] = m.finalize(state[i])`.
+5. **Return**: `result`.
+
+The `Iterable<SessionBundle>` constraint matches arrays, generators, `Set`, and any custom iterable. No `AsyncIterable` in v1 (deferred to Spec 7's corpus-loading or v2).
+
+### 7.2 `compareMetricsResults`
+
+```ts
+export interface MetricDelta {
+  /** Same key shape as the metric result. Numeric leaves get `{ baseline, current, delta, pctChange }`; non-numeric leaves get `{ baseline, current, equal }`. */
+  // (recursive shape — see TS source for exact type)
+}
+
+export interface MetricsComparison {
+  [name: string]: MetricDelta;
+  // Plus: keys present in only one side reported as `{ baseline?: ..., current?: ..., onlyIn: 'baseline' | 'current' }`.
+}
+
+export function compareMetricsResults(
+  baseline: MetricsResult,
+  current: MetricsResult,
+): MetricsComparison;
+```
+
+For numeric leaves, `pctChange = (current - baseline) / baseline`, with the conventional `0/0 → 0`, `nonzero/0 → +Infinity`, defined explicitly so consumers don't trip on it. For non-numeric leaves (strings, booleans, arrays, objects) the helper just reports `equal: deepEqual(a, b)`. Game-specific judgment ("18% shift in p95 duration is bad") is up to the caller.
+
+### 7.3 Failure modes
+
+- **Empty corpus.** `runMetrics([], metrics)` runs `create()` then `finalize()` for each metric — no `observe` calls. Built-ins handle this gracefully: `bundleCount` returns `0`; `*Rate` metrics return `0` (defined via `total === 0 → 0`); `*Stats` return `{ count: 0, min: NaN, max: NaN, mean: NaN, p50: NaN, p95: NaN, p99: NaN }`. The `NaN`s flag "no data" without throwing.
+- **Duplicate metric names.** Throws `RangeError('duplicate metric name: <name>')`.
+- **Metric throws inside `observe`.** Propagates — the corpus pass is a pure user-controlled function; the harness doesn't catch.
+- **Bundle with `failedTicks` populated.** Built-ins handle — `failureBundleRate` and `failedTickRate` are designed for this case. Other metrics aggregate the bundle's data normally.
+
+## 8. Determinism
+
+Two `runMetrics(bundles, metrics)` calls with the same bundles (deep-equal, in any order if all metrics are order-insensitive) produce structurally-equal results. v1 built-ins are all order-insensitive. Order-sensitive user metrics declare via `orderSensitive: true` and the caller is responsible for stable iteration.
+
+Volatile bundle metadata (`sessionId`, `recordedAt`) is NOT used by any built-in metric. User-defined metrics that read these get fragile results — the §6.10 list documents the deliberate exclusion.
+
+`Stats` percentile calc uses linear interpolation between sorted samples (the standard method). Implementation: sort numeric buffer on `finalize`, then index. Exact, deterministic, O(n log n) per metric.
+
+## 9. Integration with Existing Primitives
+
+- **`runSynthPlaytest`**: produces bundles that are the natural input to `runMetrics`. CI pattern: run N synthetic playtests in parallel → collect bundles → `runMetrics(bundles, metrics)` → compare against baseline.
+- **`SessionRecorder` / `SessionReplayer`**: bundles produced by either (live recordings, scenario adapters, synthetic playtests) are accepted by `runMetrics` uniformly.
+- **`SessionBundle` shape**: all fields read by built-ins (`metadata.durationTicks`, `metadata.failedTicks`, `metadata.incomplete`, `commands[].type`, `ticks[].events[].type`) are present in v0.8.0+ bundles. Older bundles (v0.7.x) work but lack `metadata.policySeed` (which v1 metrics don't read anyway).
+
+## 10. CI Pattern
+
+```ts
+import { runSynthPlaytest, runMetrics, compareMetricsResults,
+         bundleCount, sessionLengthStats, commandRateStats,
+         commandTypeCounts, failureBundleRate } from 'civ-engine';
+
+// Generate corpus.
+const bundles: SessionBundle[] = [];
+for (let i = 0; i < 64; i++) {
+  const result = runSynthPlaytest({
+    world: setup(),
+    policies: [/* ... */],
+    maxTicks: 1000,
+    policySeed: i,  // distinct seed per run
+  });
+  if (result.ok) bundles.push(result.bundle);
+}
+
+// Compute metrics.
+const metrics = [
+  bundleCount(),
+  sessionLengthStats(),
+  commandRateStats(),
+  commandTypeCounts(),
+  failureBundleRate(),
+];
+const current = runMetrics(bundles, metrics);
+
+// Compare against baseline (loaded from previous CI run).
+const baseline = JSON.parse(fs.readFileSync('baseline-metrics.json', 'utf-8'));
+const comparison = compareMetricsResults(baseline, current);
+
+// Caller decides what's a regression.
+const sessionLengthP95 = comparison.sessionLengthStats?.p95;
+if (sessionLengthP95 && Math.abs(sessionLengthP95.pctChange) > 0.20) {
+  throw new Error(`p95 session length shifted ${sessionLengthP95.pctChange * 100}%`);
+}
+```
+
+## 11. Performance
+
+- **Per-bundle cost.** Each metric's `observe` is called once per bundle. Built-ins are O(1) (counts, sums) or O(commands+events) for the type-counts metrics. Total per-bundle cost: O(commands + events).
+- **Memory.** `Stats` metrics buffer numeric values (one number per bundle). For 10k bundles, that's ~80KB per `Stats` metric — negligible. Type-count `Map`s are bounded by distinct command/event types (typically dozens).
+- **Corpus size.** v1 holds the entire `Iterable` only as long as needed for one pass. With a generator source, bundles stream through; only the metric accumulator state is retained.
+
+## 12. Testing Strategy
+
+Unit / integration tests target:
+
+- **Built-in metrics:**
+    - `bundleCount` over empty / single / many bundles.
+    - `*Stats` — empty corpus returns `count: 0` + `NaN`s; 1-bundle corpus has `count: 1` + degenerate `min === max === mean === p50 === ...`; multi-bundle corpus matches hand-computed percentiles.
+    - `commandTypeCounts` aggregates across multiple bundles; respects discriminated-union `type` field on `RecordedCommand`.
+    - `eventTypeCounts` similarly.
+    - `failureBundleRate` over corpus with mix of failed/clean bundles.
+    - `failedTickRate` over corpus with various failedTicks counts; clean corpus → 0.
+    - `incompleteBundleRate` similarly.
+- **`runMetrics`:**
+    - Multiplexing: 9 built-ins in one pass produces all 9 results.
+    - Empty corpus: each metric produces its zero-state result.
+    - Duplicate metric names: throws `RangeError`.
+    - User-defined metric: implements the contract, observes correctly, finalizes correctly.
+    - Order-insensitivity: same bundles in different order → same result for built-ins.
+- **`compareMetricsResults`:**
+    - Numeric deltas + pctChange computed correctly.
+    - 0/0 → 0; nonzero/0 → `+Infinity` (or `-Infinity`).
+    - Non-numeric leaves report `equal: boolean`.
+    - Keys-only-in-one-side reported correctly.
+- **Determinism:**
+    - Two `runMetrics` calls on structurally-equal corpora produce deep-equal `MetricsResult`.
+    - Sub-tests for each built-in's result stability.
+
+Acceptance criterion: 100% of new code covered by tests.
+
+## 13. Documentation Surface
+
+Per AGENTS.md:
+
+- `docs/api-reference.md` — new section `## Behavioral Metrics (v0.9.0)` for `Metric`, `MetricsResult`, `MetricsComparison`, `Stats`, `runMetrics`, `compareMetricsResults`, plus subsections for each of the 9 built-in metric factories.
+- `docs/guides/behavioral-metrics.md` (new) — quickstart, custom-metric authoring guide, CI pattern, comparison-helper usage, determinism notes.
+- `docs/guides/synthetic-playtest.md` — append a §"Computing metrics over bundles" cross-reference.
+- `docs/guides/ai-integration.md` — note Spec 8 as a Tier-2 piece of the AI feedback loop.
+- `docs/architecture/ARCHITECTURE.md` — Component Map row.
+- `docs/architecture/decisions.md` — ADRs for the accumulator contract and the deliberate non-features.
+- `docs/architecture/drift-log.md` — entry.
+- `docs/changelog.md` — version entry (see §14).
+- `docs/devlog/summary.md` + `detailed/` — per-task entries.
+- `README.md` — Feature Overview row + Public Surface bullet + version badge.
+- `docs/README.md` — index entry.
+- `docs/design/ai-first-dev-roadmap.md` — Spec 8 status: Drafted → Implemented after T2 lands.
+
+## 14. Versioning
+
+Branch base: v0.8.1 (after Spec 3 merge). Direct-to-main commits per AGENTS.md (no branches).
+
+Plan structure (estimated 2 commits):
+
+- **T1 (v0.9.0)** — `b`-bump? No — this is purely additive (no breaking changes to merged surface). c-bump: **v0.8.2**. Ships:
+  - `Metric` interface, `runMetrics`, all 9 built-in metric factories, `compareMetricsResults`, `Stats` type.
+  - Unit tests covering each built-in + `runMetrics` multiplexing + `compareMetricsResults`.
+  - api-reference + guide + ADRs 23, 24 (accumulator contract; non-feature catalog).
+- **T2 (v0.8.3)** — c-bump. Determinism integration tests + structural docs:
+  - Determinism integration tests (dual-run `runMetrics` produces deep-equal results; hand-computed-percentile tests; order-insensitivity verification).
+  - `docs/architecture/ARCHITECTURE.md` Component Map row.
+  - `docs/architecture/drift-log.md` entry.
+  - `docs/design/ai-first-dev-roadmap.md` status update.
+  - `docs/guides/ai-integration.md` Tier-2 reference.
+
+(Alternative single-commit landing: v0.8.2. The two-commit split mirrors Spec 3's T2/T3 separation but is optional given Spec 8's smaller scope. Decision deferred to plan stage.)
+
+## 15. Architectural Decisions
+
+### ADR 23: Accumulator-style metric contract over reducer or per-bundle-map+combine
+
+**Decision:** `Metric<TState, TResult>` exposes `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`. Stateful, streaming-friendly, one-pass-multiplex-able.
+
+**Rationale:** A `(bundle) => T` + `combine(T[])` shape forces materializing one T per bundle and prevents per-metric representation choice (Stats wants a sorted buffer, counts wants an integer). A `(bundles) => TAgg` shape forces per-metric corpus walks (N scans for N metrics). Accumulator-style is one scan total, each metric picks its own state shape, and `merge` is a future-compat hook for parallel/distributed corpus processing without breaking the v1 contract.
+
+### ADR 24: Engine-generic built-ins only; game-semantic metrics are user-defined
+
+**Decision:** v1 ships 9 built-in metrics that read only `SessionBundle` fields the engine guarantees (`metadata.durationTicks`, `commands[].type`, etc.). Game-semantic metrics like "resource Gini" or "time-to-first-conflict" are NOT built in — they require standard event/marker contracts that the engine doesn't define.
+
+**Rationale:** civ-engine is a general-purpose engine; metrics shipped in the engine package must work for any consuming game. Game-semantic metrics need game-specific event names, component shapes, and marker conventions. Game projects implement those as user-defined `Metric<TState, TResult>` instances and compose them into their own `runMetrics(bundles, [...builtins, ...gameMetrics])` calls.
+
+### ADR 25: `compareMetricsResults` returns deltas, not regression judgments
+
+**Decision:** The helper returns numeric deltas and percent changes; it does NOT classify changes as regressions, improvements, or noise.
+
+**Rationale:** "Is an 18% shift in p95 session length a regression?" is game- and policy-specific. Some games consider longer sessions a feature; others a bug. Some metrics are noisy (small corpus, high variance); others stable. Encoding judgment thresholds into the engine would either bake the wrong defaults for half the consumers or require a config surface that's its own complexity tax. Caller-side judgment is the right boundary.
+
+### ADR 26: `Iterable<SessionBundle>` only in v1; `AsyncIterable` deferred
+
+**Decision:** v1 accepts only synchronous `Iterable<SessionBundle>`. Arrays, generators, sets, and any custom synchronous iterable work. `AsyncIterable` is NOT supported.
+
+**Rationale:** Spec 3's harness is synchronous; the natural composition is synchronous corpus reduction. `AsyncIterable` is worth the complexity when corpus loading involves I/O — Spec 7's bundle index, network-backed corpora — none of which exist yet. Adding async now is abstraction-before-pressure; adding it later is a non-breaking signature widening (overload).
+
+### ADR 27: Do NOT aggregate `stopReason` in v1
+
+**Decision:** No `stopReasonHistogram` built-in. `SynthPlaytestResult.stopReason` lives outside `SessionBundle`; aggregating it requires a separate Spec 3 follow-up to persist it into `metadata`.
+
+**Rationale:** The right thing for game CI is to see "10% of synth runs ended in `policyError`" — but today that requires the test runner to track `result.stopReason` per harness call, not the corpus reducer. Forcing the metric into v1 would either (a) couple Spec 8 to Spec 3's result type (not bundle-only), or (b) require a Spec 3 follow-up that's better landed independently. Either way, v1 ships without it; users who want it accumulate `stopReason` outside `runMetrics`.
+
+## 16. Open Questions / Deferred
+
+1. **Persistent baseline storage.** This spec doesn't mandate where `baseline-metrics.json` lives. Test code or CI scripts persist their own baselines; future Spec 7 might index baselines alongside bundles.
+2. **Per-tick metrics.** Could a metric look inside `bundle.ticks[]` to compute "average commands per tick over time"? Yes — the contract allows arbitrary bundle traversal. But shipping such metrics as built-ins would explode the surface area. User-defined.
+3. **Approximate sketches.** HyperLogLog for distinct-event-type estimation, t-digest for percentiles over huge corpora. Not needed at current scales (< 10K bundles per CI run); land when memory pressure hits.
+4. **Parallel corpus processing.** The `merge` hook is reserved but unused. v2 could expose `runMetricsParallel(bundleStreams, metrics)` that splits bundles across workers and merges accumulators. Out of scope for v1.
+5. **`stopReason` persistence in `SessionMetadata`.** Separate Spec 3 follow-up. Once landed, `stopReasonHistogram` becomes a 1-day add-on.
+6. **Bundle filtering / windowing.** "Compute metrics only over bundles where `metadata.policySeed % 2 === 0`." Caller-side: just `runMetrics(bundles.filter(...), metrics)`. No new API needed.
+
+## 17. Future Specs (this surface unlocks)
+
+| Future Spec                          | What it adds                                                                |
+| ------------------------------------ | --------------------------------------------------------------------------- |
+| #7 Bundle Search / Corpus Index      | Persistent corpus → wraps as `Iterable<SessionBundle>` for `runMetrics`.    |
+| #9 AI Playtester Agent               | LLM-driven Policy + LLM-interpretable `MetricsResult` for analysis.         |
+| Future: Async corpus reducer (v2)    | `AsyncIterable` overload for I/O-backed sources.                            |
+| Future: Parallel corpus reducer       | Worker-distributed `runMetricsParallel` with accumulator `merge`.           |
+| Future: stopReason persistence        | Spec 3 follow-up to put `stopReason` in `metadata`; trivializes histogram.  |
+
+## 18. Acceptance Criteria
+
+- All new symbols (`Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `Stats`, `runMetrics`, `compareMetricsResults`, plus 9 built-in factories: `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`) exported from `src/index.ts` with full TypeScript types.
+- Test coverage: each built-in tested for empty / single / multi-bundle inputs; `runMetrics` multiplexing test; `compareMetricsResults` numeric + non-numeric + edge cases; user-defined-metric round-trip; order-insensitivity verification.
+- All four engine gates pass.
+- §13 doc updates land in the same commits as the code that introduces each surface.
+- Multi-CLI design review and code review reach convergence (this iteration is iter-1).
