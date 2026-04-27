I've verified design v4 and engine facts. Here's my review.

## Verdict: **REJECT** (5 concrete issues, none architectural — all fixable inline)

The plan's bones are sound: TDD ordering correct, engine facts (`RecordedCommand.result.accepted`, `CommandExecutionResult.executed`, `SessionMetadata.failedTicks?: number[]`, `incomplete?: true`, `bundle.ticks[].events[].type`) all match the actual code. Re-export shape is consistent with `src/index.ts:1-101` patterns. Versioning is justified (0.8.1 → 0.8.2 → 0.8.3 c-bumps, additive). Spec coverage hits all 11 built-ins + `runMetrics` + `compareMetricsResults` + `Stats`. But there are real defects an executor will trip over.

### Issue 1 — ADR count contradicts itself in 4 places (HIGH)

Design v4 §15 has **5 ADRs** (23, 24, 25, 26, 27). The plan disagrees with itself about how many T1 lands:

| Location | Says |
|---|---|
| Section A "Per-task documentation" | "T1 also: ADRs **23 + 24**" |
| Step 12 first bullet | "append ADR 23 + ADR 24 ... Land **all four**" |
| Step 14 commit message | Lists **5** ADRs (23, 24, 25, 26, 27) |
| Final-pass cross-cutting checks | "ADRs **23-27** (5 new)" |

"Land all four" is also wrong on its face — 23+24+25+26+27 is five entries. An executor reading section A or Step 12 will likely land only 2 ADRs and miss 25/26/27. **Fix:** standardize to "5 ADRs (23-27)" in both section A and Step 12, and drop "Land all four".

### Issue 2 — Section A claims Spec 3 ADRs haven't landed (MED)

Section A: *"ADRs 23 + 24 in docs/architecture/decisions.md (numbered after Spec 3's ADRs 17-22 land)"*. But `docs/architecture/decisions.md:23-29` already shows ADRs 17-22 (and 20a) **landed**. The parenthetical is stale and would confuse the executor about whether they need to wait. **Fix:** drop the parenthetical or restate as "(continues numbering after Spec 3's ADRs 17-22 already in `decisions.md`)".

### Issue 3 — Step 7 violates the no-placeholder rule (HIGH)

Per the `writing-plans` skill: *"Steps that describe what to do without showing how (code blocks required for code steps)"* is a plan failure. Step 7 covers 9 of the 11 built-ins in one-liner bullets — no code, no tests:

> **`failureBundleRate`**: state `{ withFailure: number; total: number }`; observe increments `total` and `withFailure` if `bundle.metadata.failedTicks?.length > 0`; finalize returns `total > 0 ? withFailure / total : 0`.

The engineer reading `incompleteBundleRate`'s description ("observe counts `metadata.incomplete === true`") cannot tell whether `total` is also incremented unconditionally — same accumulator pattern but stated ambiguously. And `bundle.metadata.failedTicks?.length > 0` won't typecheck under strict mode (`(number | undefined) > 0` is rejected); the executor must reach for `(failedTicks?.length ?? 0) > 0` or similar — but the plan doesn't show it. **Fix:** expand Step 7 into 9 sub-steps, each with the actual factory code and 3 actual tests (empty/single/multi), modeled on Steps 1+3 (`bundleCount`) and Step 5 (`sessionLengthStats`). This is the bulk of the work; expanding it is essential for the writing-plans contract.

### Issue 4 — Step 14 commit message says "design v10" (LOW)

> "Implements Spec 8 (Behavioral Metrics over Corpus) per design **v10**."

Spec 8's design is v4. Only Spec 3's design ever reached v10 — this is a copy-paste from a prior commit message. **Fix:** change to "per design v4".

### Issue 5 — `mkBundle` test helper has no home (MED)

Step 1 defines `mkBundle` inline in `tests/behavioral-metrics-builtins.test.ts`. Step 8 says: *"(use mkBundle from -builtins.test.ts via shared helper or copy)"*. T2 Step 4 also uses `mkBundle` without resolving the question. This is an unresolved decision left to the executor, and "via shared helper" implies a file the plan never creates. **Fix:** pick one — extract to `tests/_helpers/session-bundle-factory.ts` and `import { mkBundle } from './_helpers/session-bundle-factory.js'` from all three test files, OR explicitly say "duplicate the helper in each test file; ~10 lines per file, no factor-out". Either is fine; the ambiguity is the bug.

---

## Things checked and found GOOD

- **Engine facts.** `RecordedCommand.result.accepted` (✓ via `CommandSubmissionResult.accepted`, `world.ts:135`); `CommandExecutionResult.executed` (✓ `world.ts:150`); `SessionMetadata.failedTicks?: number[]` and `incomplete?: true` (✓ `session-bundle.ts:99-100`); `bundle.ticks[].events[].type` (✓ `session-bundle.ts:55`). The plan's risk note about `bundle.failures` vs `metadata.failedTicks` correctly states the v1 stance.
- **TDD ordering.** Step 1 (failing test) → Step 2 (verify fail) → Step 3 (implement) → Step 4 (verify pass) is canonical. Same for Step 5–6 on `sessionLengthStats`.
- **Percentile reference values.** Step 5's hand-computed values for `[10,20,30,40,50]` (p50=30, p95=48, p99=49.6) match NumPy linear / R type 7 exactly. `toBeCloseTo(x, 6)` is appropriate.
- **`compareMetricsResults` semantics.** `pctChange` with `0/0 → 0`, `nonzero/0 → ±Infinity`, null-passthrough, opaque deep-equal, recursive record traversal, only-in-side at every level — all matches design §7.2.
- **T2 determinism test logic.** Re-running `runSynthPlaytest` with the same `policySeed: 42` over a fresh `setup()` world produces bundles whose metric results (over the chosen built-ins, which all ignore `sessionId`/`recordedAt`/`engineVersion`) are deep-equal. This works.
- **Versioning + commit cadence.** One bump per coherent change (T1=0.8.2, T2=0.8.3), c-bumps for purely additive surface, AGENTS.md doc discipline applied per-task — all clean.
- **Risk capture.** The five risks at the bottom are real (percentile precision, type narrowing, failedTicks vs failures, iterable-consumed-once, MetricsResult key absence vs null). No false alarms.

---

## Recommended action

Fix Issues 1–5 inline in `docs/design/2026-04-27-behavioral-metrics-plan.md` (or wherever the plan lives — I see it referenced as `plan v1` in the commit log but didn't see a file path). Issue 3 is the largest expansion; Issues 1, 2, 4 are 1-line edits; Issue 5 is a single decision. After those fixes, the plan is good to execute.
