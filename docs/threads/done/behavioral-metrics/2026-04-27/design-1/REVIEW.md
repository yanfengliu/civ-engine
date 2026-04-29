# Spec 8 (Behavioral Metrics) — Design iter-1 Review Synthesis

**Iteration:** 1. **Subject:** v1 (commit c469822). **Reviewers:** Codex 3 HIGH + 2 MED + 1 LOW; Opus 4 HIGH + 6 MED + 4 LOW + 5 NIT.

**Verdict:** REJECT — re-spin to v2 required. Architecture (accumulator contract, engine-generic-only built-ins, deltas-not-judgments, Iterable-only) is sound per both reviewers. The HIGH issues are spec-tightening and missing-feature additions, not architecture.

## Convergent HIGHs

### H-TYPING — runMetrics signature typing is too weak

Codex HIGH-2 + Opus HIGH-4. Two distinct sub-issues:

- **Codex HIGH-2:** `runMetrics(..., Metric<unknown, unknown>[]) => MetricsResult` erases per-metric result shape. The §10 CI example dereferences `comparison.sessionLengthStats?.p95` — that doesn't typecheck against `Record<string, unknown>`. Acceptance criterion "full TypeScript types" not met.

- **Opus HIGH-4:** `bundles: Iterable<SessionBundle>` defaults to `SessionBundle<Record<string, never>, Record<string, never>, JsonValue>`. A user holding `SessionBundle<MyEvents, MyCommands>[]` won't assign it ergonomically.

**Fix (v2):** `runMetrics<E, C, D>(bundles: Iterable<SessionBundle<E, C, D>>, metrics: Metric[]): MetricsResult` for the bundle generics. For the result-shape typing, accept the runtime reality: `MetricsResult = Record<string, unknown>` with the example using a type assertion `(comparison.sessionLengthStats as MetricDelta<Stats>)?.p95.pctChange`. A fully-typed-name-tuple builder is doable but adds complexity we don't need in v1; document the type assertion as the v1 idiom and consider a typed builder in v2.

### H-VERSION — §13 vs §14 version mismatch

Codex LOW-1 + Opus MED-6. §13 doc-section heading says "Behavioral Metrics (v0.9.0)"; §14 says T1 = v0.8.2 / T2 = v0.8.3.

**Fix (v2):** §13 → v0.8.2. Drop v0.9.0. §14 keeps c-bump.

## Codex HIGHs (unique)

### H-IMMUTABLE — Accumulator immutability contradicts state-shape choices

Codex HIGH-1. §5.1 says `observe` is pure: "must return new state, not mutate." But built-in state shapes are `number[]` and `Map<string, number>`. Honoring immutability forces clone-per-bundle (`[...state, x]`, `new Map(state)`), killing the one-pass/low-memory story in §5.2 and §11.

**Fix (v2):** Relax the contract. `observe(state, bundle)` returns the updated state, which MAY be the same reference (in-place mutation allowed for performance) or a new value. The contract is functional purity (output depends only on inputs, no global side effects), not reference-immutability. Update §5.1 wording. Add a sentence: "Implementations are responsible for ensuring concurrent calls observe() with the same state are not safe; v1's runMetrics is single-threaded so this is moot, but parallel-merge implementations must avoid sharing accumulator state."

### H-JSON-NAN — Empty-corpus NaN breaks JSON round-trip

Codex HIGH-3. `JSON.stringify(NaN) === 'null'`. Empty-corpus `Stats { p95: NaN }` doesn't round-trip through `baseline-metrics.json`. The §10 CI workflow loads `JSON.parse(fs.readFileSync(...))` — the parsed `null` doesn't compare correctly against runtime `NaN`.

**Fix (v2):** Empty-corpus `Stats` returns numeric fields as `null` rather than `NaN`. Final shape: `{ count: number; min: number | null; max: number | null; mean: number | null; p50: number | null; p95: number | null; p99: number | null }`. JSON-stable. `compareMetricsResults` treats `null` deltas explicitly (see MED-3).

## Opus HIGHs (unique)

### H-RATE-FORMULA — commandRateStats formula contradicts zero-duration semantics

Opus HIGH-1. §6.3 says "buffered (bundle.commands.length / max(durationTicks, 1))" AND "Bundles with durationTicks === 0 contribute 0". These contradict — `N / max(0, 1) = N`, not 0.

**Fix (v2):** §6.3 + §6.4 use `durationTicks > 0 ? rate : 0`. Drop the `max(...)` formula.

### H-PERCENTILE — Stats percentile method underspecified

Opus HIGH-2. "Linear interpolation between sorted samples (the standard method)" is ambiguous — there are 9 R-quantile types. Different methods → different answers → tests can't unambiguously match hand-computed values.

**Fix (v2):** Pin NumPy `linear` (R type 7): `index = (count - 1) * p; lo = floor(index); hi = ceil(index); v = sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo)`. Pin `count === 1` behavior: all percentiles equal that single value. Pin `count === 0`: see H-JSON-NAN above (`null`).

### H-REJECTED-COMMANDS — bundle.commands includes rejected submissions

Opus HIGH-3. `SessionRecorder._captureCommand` records every submission regardless of `result.accepted`. So `bundle.commands.length` = submissions, not executions. Built-ins aggregate over `bundle.commands.length` and `bundle.commands[].type` without addressing this.

Game-CI question is usually "what commands ran." A misbehaving validator that rejects 100% of inputs would inflate `commandTypeCounts` and `commandRateStats` exactly like a healthy run.

**Fix (v2):** Document the semantics explicitly: built-ins like `commandTypeCounts` count **submissions** (including rejected). Add **two new built-ins** (Codex MED-2 also asks for these) that read `bundle.executions` for the executed view:

- `commandAcceptanceRate`: from `bundle.executions[].executed`. Numerator: count where `executed === true`. Denominator: total executions. Returns ratio in [0, 1].
- `executionFailureRate`: numerator: count where `executed === false`. Denominator: total executions. Returns ratio.

Plus a §6.10 note that for "executed-only" command-type histograms, use `bundle.executions[].commandType` as a user-defined metric.

## Convergent MED — orderSensitive over-promises

Codex MED-1 + Opus MED-1. Spec promises `runMetrics` warns when iterating non-deterministic source (e.g., `Map.values()`). Real issues:
- No portable way to introspect arbitrary `Iterable<T>`'s ordering.
- `Map.values()` IS deterministic (insertion order) — wrong example.
- Engine has no logger primitive — where does the warning go?

**Fix (v2):** Drop the auto-detect promise. `orderSensitive: true` is a doc-only declaration; the caller is responsible for passing bundles in stable order. Update §5.3 + §8 wording. Drop §16's `bundles.filter(...)` example since `.filter` isn't on generic iterables.

## Codex MED — Missing engine-generic execution metrics

Codex MED-2. v1 tells you command volume changed but not that 30% of executions failed. `bundle.executions[].executed` is engine-generic + bundle-derivable.

**Fix (v2):** add `commandAcceptanceRate` and `executionFailureRate` built-ins (folded into H-REJECTED-COMMANDS fix above).

## Opus MEDs

- **M-COMPARE-RECURSE (Opus MED-2):** `compareMetricsResults` only-in-key handling needs to recurse into nested records (e.g., `commandTypeCounts: Record<string, number>`). Spec implies but doesn't say. **Fix:** state explicitly. Per-key only-in-side reporting at every record-typed level.
- **M-COMPARE-NAN (Opus MED-3):** `null` (was NaN) propagation undefined. **Fix:** `null` inputs → `null` deltas; consumers can detect "no baseline" or "no current" via `=== null`.
- **M-COMPARE-ARRAY (Opus MED-4):** arrays as opaque. **Fix:** state explicitly in §7.2. Per-element diff is overkill for v1.
- **M-COMPARE-TYPE (Opus MED-5):** `MetricsComparison` index sig `[name: string]: MetricDelta` is incomplete — also needs only-in-side variant. **Fix:** `MetricsComparison = Record<string, MetricDelta | OnlyInComparison>`.

## Opus LOWs (apply)

- **LOW-1:** `incomplete` vs `failedTicks` orthogonality. **Fix:** one sentence in §6.7/§6.9.
- **LOW-2:** `bundle.failures` unused. **Fix:** §6.10 line deferring per-phase failure metrics.
- **LOW-3:** `merge?` × `orderSensitive` invariant. **Fix:** §5.1 sentence.
- **LOW-4:** AsyncIterable overload returns Promise. **Fix:** ADR 26 parenthetical.

## NITs (apply where trivial, defer otherwise)

- **NIT-1 (Opus):** §14 self-correcting v0.9.0 reference. Already covered by H-VERSION fix.
- **NIT-2 (Opus):** "100% of new code covered" performative. Drop.
- **NIT-3 (Opus):** rename `failureBundleRate` → `bundleFailureRate`. **Defer** — minor renaming churn for cosmetic gain.
- **NIT-4 (Opus):** Iterable consumed once. **Fix:** one sentence in §7.1.
- **NIT-5 (Opus):** `SESSION_BUNDLE_SCHEMA_VERSION` not validated. **Fix:** §16 deferral note.

## Action plan for v2

1. **H-TYPING:** generic over `<E, C, D>` for bundle types; document `MetricsResult` typing reality + assertion idiom in §10 example.
2. **H-VERSION:** §13 → v0.8.2.
3. **H-IMMUTABLE:** relax §5.1 contract — in-place mutation allowed; functional purity is the contract.
4. **H-JSON-NAN:** empty-corpus `Stats` returns `null` for numeric fields, not `NaN`.
5. **H-RATE-FORMULA:** §6.3/§6.4 use `durationTicks > 0 ? rate : 0`.
6. **H-PERCENTILE:** pin NumPy linear (R type 7) with literal formula.
7. **H-REJECTED-COMMANDS:** document submission-semantics; add `commandAcceptanceRate` + `executionFailureRate` built-ins (10 → 11 built-ins).
8. **M-ORDER:** drop auto-detect; doc-only declaration. Update §16 filter example.
9. **M-COMPARE-RECURSE:** explicit recursive only-in-side handling.
10. **M-COMPARE-NAN:** define null-input propagation.
11. **M-COMPARE-ARRAY:** state opaque-equality explicitly.
12. **M-COMPARE-TYPE:** `MetricsComparison` includes `OnlyInComparison` variant.
13. **L-1, L-2, L-3, L-4, NIT-2, NIT-4, NIT-5:** apply per above.

After v2, request iter-2 review. Expecting convergence (no remaining HIGH).
