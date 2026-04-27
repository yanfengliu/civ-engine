I've cross-checked the spec against the actual `SessionBundle`, `RecordedCommand`, recorder, and synth-playtest implementations. Findings below.

---

## Review — Behavioral Metrics over Corpus (Spec 8 design v1)

### HIGH

**[HIGH-1] §6.3 `commandRateStats` — internal contradiction between formula and zero-duration semantics.**
Spec says: *"buffered (bundle.commands.length / max(durationTicks, 1)) values"* AND *"Bundles with durationTicks === 0 contribute 0 (avoids divide-by-zero)"*. These are inconsistent: the formula `N / max(0, 1) = N / 1 = N`, not 0. An implementer + test author will pick one and the other will be wrong. Pick: either change the formula to `durationTicks > 0 ? commands.length / durationTicks : 0`, or drop the "contribute 0" sentence and document that 0-duration bundles contribute their raw command count as a rate. Same issue applies to §6.4 `eventRateStats`.

**[HIGH-2] `Stats` percentile method is underspecified.**
*"Linear interpolation between sorted samples (the standard method)"* — there are 9 R-quantile types, NumPy supports `linear`/`lower`/`higher`/`nearest`/`midpoint`. Different methods give different answers for the same sorted sample, which breaks "tests match hand-computed percentiles" (§12). Lock down: e.g., NumPy `linear` (R type 7), specify the formula `index = (count - 1) * p; lo = floor(index); hi = ceil(index); v = sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo)`. Also pin behavior for `count === 1` so the §12 "degenerate min === max === p50 === p95 === p99" claim is unambiguous.

**[HIGH-3] `commandTypeCounts` / `commandRateStats` silently include rejected commands.**
`SessionRecorder._captureCommand` (`session-recorder.ts:459-480`) calls the sink for *every* submission regardless of `result.accepted`. So `bundle.commands` is the submission log, not the executed log. The spec aggregates over `bundle.commands.length` and `bundle.commands[].type` without addressing this. Two real issues:
- A misbehaving validator that rejects 100% of inputs would inflate `commandTypeCounts` and `commandRateStats` exactly like a healthy run that accepted them.
- The natural game-CI question is "what commands ran," not "what commands the policy submitted."
Pick: either filter on `cmd.result.accepted` in built-ins, ship both `submittedCommandRate` and `acceptedCommandRate`, or call out the semantics explicitly ("counts include rejected submissions; for accepted-only, use `bundle.executions`"). Note that `bundle.executions: CommandExecutionResult[]` is the right source for "what actually executed" — built-ins ignore it entirely, which is also worth a §6.10 line.

**[HIGH-4] `runMetrics` signature loses the bundle's event/command-map generics.**
`bundles: Iterable<SessionBundle>` defaults to `SessionBundle<Record<string, never>, Record<string, never>, JsonValue>`. A user holding `SessionBundle<MyEvents, MyCommands>[]` will hit assignability friction (covariance only saves them if `MyEvents`/`MyCommands` happen to be exact-equal default-shapes, which they aren't). This signature won't ergonomically accept a real game's bundles. Make it generic: `runMetrics<E, C, D>(bundles: Iterable<SessionBundle<E, C, D>>, metrics: Metric<unknown, unknown>[]): MetricsResult`. The metric `observe` parameter still types as the default `SessionBundle` (which is fine since metrics that traverse `events[]`/`commands[]` will narrow internally).

### MED

**[MED-1] §5.3 / §8 promise that `runMetrics` "warns when iterating a non-deterministic source (e.g., `Map.values()`)" is impractical.**
There's no portable way to introspect whether a generic `Iterable<T>` was sourced from a `Map`, a `Set`, an unordered DB result, or a generator. The check would be either always-off (useless) or a special-case for known JS types (incomplete). Recommend: drop the auto-detect promise; just make it a doc-only warning ("when an `orderSensitive` metric is in the metric list, callers must materialize bundles in stable order"). This also removes an undefined "where does the warning go" question (engine has no logger primitive).

**[MED-2] `compareMetricsResults` only-in-key handling needs to recurse, not just live at top level.**
§7.2 says only-in-one-side keys at the top level of `MetricsComparison` get `{ baseline?, current?, onlyIn }`. But built-ins like `commandTypeCounts` return `Record<string, number>` — if baseline has `{move: 100, attack: 50}` and current has `{move: 90, build: 10}`, the consumer needs per-key only-in handling at the *nested* level too (`attack` only-in-baseline; `build` only-in-current). The recursive numeric-vs-non-numeric leaf detection has to handle key-set differences at every record-typed node. Spec implies this but doesn't say it — make it explicit, since it's the most common real-world case for the histogram metrics.

**[MED-3] `compareMetricsResults` NaN propagation is undefined.**
Empty-corpus baseline gives `Stats { p95: NaN, ... }`. Comparing against a populated current run computes `(real - NaN) / NaN = NaN` for both `delta` and `pctChange`. Spec defines 0/0 and nonzero/0 conventions but is silent on NaN. Specify: NaN inputs propagate to NaN outputs. This is the "saner empty-baseline UX" choice — alternative is throwing, which is worse.

**[MED-4] `compareMetricsResults` array handling.**
Arrays are listed under "non-numeric leaves" (opaque equality). User metrics returning `number[]` (e.g., a histogram bucket array) get `equal: boolean` — no per-element diff. That's a defensible v1 choice, but it should be stated explicitly so callers know not to ship array-returning numeric metrics expecting element-wise pctChange. (Alternative: recurse into arrays index-wise when both sides are same-length arrays of numbers. Probably overkill for v1.)

**[MED-5] `MetricsComparison` index-signature type is inconsistent with described behavior.**
Stated as `[name: string]: MetricDelta`, then prose adds *"keys present in only one side reported as `{ baseline?, current?, onlyIn }`"`. The index signature should be `MetricDelta | OnlyInComparison` (or split into two member shapes). Type currently wouldn't compile against the documented behavior.

**[MED-6] §13 doc-section heading "Behavioral Metrics (v0.9.0)" doesn't match §14 versioning plan (v0.8.2 / v0.8.3).**
v0.9.0 implies a `b`-bump that §14 explicitly disclaims. Either §13 should say "(v0.8.2)" to match the plan, or §14 should commit to a `b`-bump (and justify it). Fixing the heading is the simpler call.

### LOW

**[LOW-1] `incomplete` vs `failedTicks` distinction isn't called out.**
`failedTicks` is appended on every world tick failure (sink-side, regardless of `_terminated`). `incomplete` is set in `SessionRecorder.disconnect()` when the recorder was terminated mid-run by a sink failure. A bundle can have failedTicks but NOT be incomplete (in-flight tick failures the world recovered from), and could in principle be incomplete with empty failedTicks. The spec is right to ship both `failureBundleRate` and `incompleteBundleRate`, but a one-sentence note in §6.7/§6.9 explaining the orthogonality would prevent users from assuming they measure the same thing.

**[LOW-2] `bundle.failures: TickFailure[]` is unused.**
v1 reads `metadata.failedTicks` (just tick numbers) but never `bundle.failures` (full `TickFailure` records with `phase`, error info, etc.). For richer breakdowns ("what fraction of failures are in `phase: 'systems'`"), `bundle.failures` is the source. Add a §6.10 line explicitly deferring per-phase failure metrics to user-defined.

**[LOW-3] `merge?` × `orderSensitive` interaction is undefined.**
If a metric is `orderSensitive: true`, `merge(a, b)` doesn't make sense (you can't combine two partial accumulators if order matters across the boundary). One sentence in §5.1 documenting the implied invariant: "metrics that declare `merge` must be order-insensitive."

**[LOW-4] ADR 26's "non-breaking signature widening (overload)" claim deserves a hint.**
An `AsyncIterable<SessionBundle>` overload necessarily returns `Promise<MetricsResult>`, so the overload set has two distinct return types. That's still non-breaking but worth a parenthetical so future-you doesn't end up promising a sync return for an async input.

### NIT

**[NIT-1] §14 leads with "T1 (v0.9.0)" then immediately corrects to v0.8.2.**
Reads as a self-correcting draft. Drop the `v0.9.0` reference and just write "T1 (v0.8.2 — c-bump, purely additive)".

**[NIT-2] §12 "100% of new code covered by tests" acceptance criterion.**
The actual test list immediately above is the real acceptance bar. Coverage % is performative (instrumentation hits don't equal meaningful test). Drop the percentage; the concrete list is enough.

**[NIT-3] `failureBundleRate` vs `failedTickRate` naming.**
Differ by one word; very different meanings. Acceptable after reading the bodies, but `bundleFailureRate` (clearly per-bundle) vs `failedTickRate` (clearly per-tick) might read better. Optional.

**[NIT-4] Iterable consumed once.**
Generator-source bundles get exhausted by the first `runMetrics` call. A caller computing `runMetrics(bundles, baselineMetrics)` *and* `runMetrics(bundles, currentMetrics)` from one stream would silently get an empty second result. One sentence in §7.1.

**[NIT-5] `SESSION_BUNDLE_SCHEMA_VERSION` not validated.**
`runMetrics` doesn't check `bundle.schemaVersion`. Fine for v1 (only one version exists), but future schema bumps will silently accumulate stale-shape bundles. Worth one sentence in §16 deferring to "when schemaVersion > 1 ships, runMetrics should validate."

---

## Verdict

The accumulator contract (ADR 23), engine-generic-only built-ins (ADR 24), deltas-not-judgments (ADR 25), Iterable-only (ADR 26), and stopReason deferral (ADR 27) are all the right calls. The design's bones are solid.

The HIGH issues are all spec-tightening, not architectural — fix HIGH-1 (commandRateStats contradiction), HIGH-2 (lock the percentile method), HIGH-3 (rejected-commands semantics), and HIGH-4 (generic the runMetrics signature) and the spec is ready to implement.

**Not ACCEPT as-is** — HIGH-1 and HIGH-3 in particular will produce wrong numbers in v1 implementation if not resolved before code lands. Once the four HIGH items are addressed, the spec is good.
