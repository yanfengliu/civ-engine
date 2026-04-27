Findings (saved to `docs/reviews/behavioral-metrics/2026-04-27/design-2/raw/opus.md`):

## REJECT — 1 HIGH + 1 MED above the ACCEPT bar

### HIGH

**H-EXEC-SEMANTICS — §6.10 misstates engine semantics.** The closing comment "`CommandExecutionResult.executed === false` captures both validator rejections and handler-side failures" is factually wrong. `world.ts:732-748` shows validator-rejected submissions return early after `emitCommandResult` and never enter the queue, so they never produce a `CommandExecutionResult`. The actual `executed: false` causes (per `world.ts:1686, 1721, 1769`) are `missing_handler`, `command_handler_threw`, and `tick_aborted_before_handler` — none are validator rejections, which live solely on `bundle.commands[].result.accepted === false`.

Two consequences:
1. **Iter-1 H-REJECTED-COMMANDS is partially unsolved.** A 100%-validator-reject corpus has zero executions → `commandAcceptanceRate` divides 0/0 → returns 0 per the zero-execution guard. No regression signal surfaces.
2. **Metric name is misleading.** "Acceptance" idiomatically evokes the validator gate, but the metric measures handler execution.

Recommended fix: rename to `commandExecutionSuccessRate` AND add a 12th built-in `commandValidationAcceptanceRate` reading `bundle.commands[].result.accepted` (~3 lines of doc, closes iter-1 gap).

### MED

**M-FAILEDTICK-DIVZERO — §6.8 undefined when corpus has bundles but `sum(durationTicks) === 0`.** The "Empty corpus → 0" guard only covers `bundles.length === 0`. A non-empty corpus where every bundle aborted on tick 0 (e.g., all-`policyError`) yields 0/0 = NaN. Sister metrics §6.10/§6.11 already use the right shape ("zero-execution corpus → 0"). Apply the same: `totalDurationTicks > 0 ? rate : 0`.

### NITs (cheap, fold in same revision)

- **N-CROSSREF (§8):** "the §6.10 list" — §6.10 is a metric definition, not a list. Should be §6.12.
- **N-NAN-LOSSLESS (§6.2):** "JSON.stringify coerces to null *losslessly*" reads as the opposite of intent — the round-trip is lossy.
- **N-DUP-METRIC:** `commandAcceptanceRate` + `executionFailureRate` sum to 1; one is `1 - other`. Defer one to user-defined.
- **N-ASYNC-NONBREAK (ADR 26):** Async widening would force return type widening — not non-breaking. The non-breaking path is a separate `runMetricsAsync`.
- **N-PCTCHANGE-NEG (§7.2):** `(c - b) / b` is unintuitive for `b < 0`. Fine for v1's non-negative built-ins; one-line caveat for user metrics.
- **N-COMP-EXAMPLE-CAST (§10):** Cast ignores `OnlyInComparison`; schema mismatch silently skips regression check at runtime.

What landed cleanly: bundle generics, version sync, immutability relaxation, JSON-stable null Stats, rate formula, percentile pinning, doc-only orderSensitive, comparison recursion + null + opaque-array + OnlyInComparison, all four LOWs, and three of five iter-1 NITs.

Expect convergence after v3 if H-EXEC-SEMANTICS option (b) and M-FAILEDTICK-DIVZERO are addressed.
ame as (a), PLUS add a 12th built-in `commandValidationAcceptanceRate` reading `bundle.commands[].result.accepted`. Closes the iter-1 H-REJECTED-COMMANDS gap fully.
- **(c)** Keep names; rewrite §6.10's third paragraph so it lists the actual three causes; explicitly call out that validator rejections are NOT captured and direct users to define a custom metric over `bundle.commands[].result.accepted`. Smallest spec churn but leaves the misleading name.

I'd recommend (b). It's one extra built-in and 2-3 lines of doc, and it actually closes the iter-1 finding instead of partially closing it.

## MED

### M-FAILEDTICK-DIVZERO — §6.8 `failedTickRate` undefined when corpus has bundles but zero total ticks

§6.8: "Result: `totalFailedTicks / totalDurationTicks` in [0, 1]. Empty corpus → 0."

The empty-corpus guard only covers `bundles.length === 0`. The other divide-by-zero case — non-empty corpus where every bundle aborted before completing a tick (sum of `durationTicks` is 0) — is unspecified. This isn't theoretical: a synth-playtest corpus where every run hit `policyError` on tick 0 would land here. The current spec reads as `0 / 0`, which is `NaN` (not 0).

Sister metrics handle this correctly:
- §6.10 `commandAcceptanceRate`: "Empty corpus or **zero-execution corpus** → 0."
- §6.11 `executionFailureRate`: same.

§6.8 should adopt the same shape: "Empty corpus or **zero-tick corpus** → 0."

**Fix:** Change §6.8 result line to `totalDurationTicks > 0 ? totalFailedTicks / totalDurationTicks : 0`, matching §6.3/§6.4 per-bundle rate guards and §6.10/§6.11 corpus-level guards.

## NITs

- **N-CROSSREF (§8):** "User-defined metrics that read these get fragile results — the §6.10 list documents the deliberate exclusion." §6.10 is the `commandAcceptanceRate` definition, not a list. The "deliberate exclusion" list is §6.12. Wrong cross-reference.

- **N-NAN-LOSSLESS (§6.2):** The parenthetical "unlike `NaN`, which `JSON.stringify` coerces to `null` losslessly but `JSON.parse` cannot recover as `NaN`" — calling the round-trip "lossless" is the opposite of what's intended. The point is precisely that `NaN → null → null` is **lossy**, which is why `null` is preferred. Reword: "unlike `NaN`, which `JSON.stringify` coerces to `null` and `JSON.parse` cannot recover (so `NaN` would silently become `null` after a save/reload — a lossy round-trip)."

- **N-DUP-METRIC (§6.11):** `commandAcceptanceRate` + `executionFailureRate` are algebraically inverse over a non-empty corpus (sum to 1, as §6.11 itself notes). Shipping both is API duplication for the trivial `1 - x` case. Justification "callers usually want one or the other based on the regression direction they're watching for" is weak — the abs delta is the same magnitude. Defer one to user-defined.

- **N-ASYNC-NONBREAK (ADR 26):** "Adding async now is abstraction-before-pressure; adding it later is a non-breaking signature widening (overload)." Widening `Iterable<SessionBundle>` to also accept `AsyncIterable<SessionBundle>` would force the return type to widen to `MetricsResult | Promise<MetricsResult>`, which IS breaking for callers that assume sync. The non-breaking path is a separate `runMetricsAsync` function. Reword the parenthetical.

- **N-PCTCHANGE-NEG (§7.2):** `pctChange = (current - baseline) / baseline` produces unintuitive results when `baseline < 0` (a value increase from -5 → 5 yields pctChange = -2). Fine for v1 since all built-in metric values are non-negative (counts, rates in [0,1], stats over non-negative domains), but a one-line caveat for user-defined metrics would prevent confusion.

- **N-COMP-EXAMPLE-CAST (§10):** The `as { p95: NumericDelta } | undefined` cast silently coerces an `OnlyInComparison` value to a record-shaped one. At runtime the optional chain `?.p95` returns undefined and the regression check is silently skipped. That's probably wrong for production CI — schema mismatch between baseline and current should error out, not pass quietly. Either add a `'onlyIn' in val` type guard, or comment that this example assumes the metric is present in both sides.

## What landed cleanly

- H-TYPING: bundle generics on `runMetrics` ✅
- H-VERSION: §13 → v0.8.2 ✅
- H-IMMUTABLE: §5.1 wording relaxed; in-place mutation OK; concurrency caveat present ✅
- H-JSON-NAN: empty-corpus `Stats` numeric fields are `number | null` ✅
- H-RATE-FORMULA: §6.3/§6.4 use `durationTicks > 0 ? rate : 0` ✅
- H-PERCENTILE: NumPy linear R-type-7 pinned with literal formula; count===1 + count===0 edge cases pinned ✅
- M-ORDER: orderSensitive is doc-only; no auto-detect; §16 filter example uses generator pattern ✅
- M-COMPARE-RECURSE: §7.2 spells out per-key recursion at every record level ✅
- M-COMPARE-NULL: null inputs → null deltas, explicitly stated ✅
- M-COMPARE-ARRAY: arrays opaque, explicit ✅
- M-COMPARE-TYPE: `MetricsComparison = Record<string, MetricDelta | OnlyInComparison>` ✅
- L-1: orthogonality notes in §6.7 + §6.9 ✅
- L-2: bundle.failures deferral in §6.12 ✅
- L-3: merge × orderSensitive invariant in §5.1 ✅
- L-4: ADR 26 covers AsyncIterable rationale (modulo N-ASYNC-NONBREAK above) ✅
- NIT-2: dropped "100% of new code" line ✅
- NIT-4: iterable-consumed-once in §7.1 ✅
- NIT-5: schemaVersion validation deferred in §16 ✅

## Verdict

**REJECT** for v3. 1 HIGH (H-EXEC-SEMANTICS) + 1 MED (M-FAILEDTICK-DIVZERO) above the ACCEPT bar. NITs optional but cheap; fold them into the same revision.

After v3 lands, expect convergence on iter-3.
