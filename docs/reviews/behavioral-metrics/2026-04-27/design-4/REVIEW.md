# Spec 8 (Behavioral Metrics) — Design iter-4 Review Synthesis

**Iteration:** 4. **Subject:** v4 (commit 43af9de). **Reviewers:** Codex 2 LOW; Opus 2 NIT.

**Verdict:** **ACCEPT.** Both reviewers independently say ACCEPT. No remaining BLOCKER / HIGH / MED issues. All three iter-3 M-DRIFT-PERSISTS sites + 3 NITs + the §17/ADR 26 contradiction byproduct landed cleanly. Reviewers nitpicked rather than catching real bugs — convergence reached per AGENTS.md.

## Convergence trajectory

| Iter | Codex | Opus | Substantive themes |
|------|-------|------|--------------------|
| 1 | 3 HIGH + 2 MED + 1 LOW | 4 HIGH + 6 MED + 4 LOW + 5 NIT | Typing, version mismatch, immutability, NaN-JSON, rate formula, percentile method, rejected-commands semantics |
| 2 | 1 HIGH + 1 MED | 1 HIGH + 1 MED + 6 NIT | H-EXEC-SEMANTICS (validator vs execution split), failedTickRate divzero |
| 3 | 1 MED + 2 NIT | 1 MED + 1 NIT | Stale §12 NaN / 9-built-ins, ADR 24 9-built-ins + field list, §17 stale "AsyncIterable overload" |
| **4** | **ACCEPT (2 LOW)** | **ACCEPT (2 NIT)** | — |

## What landed cleanly (iter-3 → iter-4)

| Iter-3 finding | Verified in v4 |
|---|---|
| M-DRIFT #1: §12 line 454 — `*Stats` empty corpus said `NaN` | `null` numeric fields with §6.2 cross-ref + JSON-stable rationale + NumPy/R type 7 percentile note |
| M-DRIFT #2: §12 line 461 — multiplexing test "9 built-ins" | "11 built-ins…all 11 results" |
| M-DRIFT #3: ADR 24 line 523 — "9 built-ins" + stale field list | "11"; field list now includes `commands[].result.accepted`, `executions[].executed`, `metadata.failedTicks`, `metadata.incomplete` |
| N-100PCT: §12 line 475 — "100% of new code covered" | Replaced with case-enumeration: "every case enumerated above has at least one test (No coverage-percent target — concrete case enumeration is the actionable bar)" |
| N-BRACE: line 3 — shell `design-{1,2}` brace expansion | Expanded to three explicit paths for design-1 / design-2 / design-3 |
| N-§8-XREF: §8 — bad §6.12 cross-ref | Dropped; replaced with direct "flaky deltas in `compareMetricsResults` because every run produces a fresh UUID and timestamp" |
| §17 row "AsyncIterable overload" contradicting ADR 26 | Now: "Separate `runMetricsAsync(...): Promise<MetricsResult>` for I/O-backed sources. Distinct function (not an overload of `runMetrics`) per ADR 26." |

## Engine-fact alignment (Opus spot-check)

- `metadata.durationTicks/failedTicks/incomplete` — `session-bundle.ts:91/99/100` ✓
- `commands[].type`, `commands[].result.accepted` — `session-bundle.ts:41-47` + `world.ts:740/751` ✓
- `executions[].executed` — `session-bundle.ts:119` + `world.ts:1686/1711/1721/1769` (the three `executed: false` codes) ✓
- Validator early-return at `world.ts:732-748` + capture wrap at `session-recorder.ts:163-172` confirm `bundle.commands` carries validator-rejected entries with `result.accepted: false` but they never reach `bundle.executions`, matching the §6.10 / §6.11 split ✓

## Internal consistency

- §2 / §7.1 / ADR 26 / §17 all converge on "v1 is sync; async is a separate `runMetricsAsync` function, not an overload."
- §5.3 NumPy-linear-R-type-7 ↔ §6.2 percentile rules ↔ §12's "(NumPy linear / R type 7)" callout — consistent.
- 11-built-in count consistent across §4 table, §6.x sections, §12 multiplexing test, §13 docs, §14 plan, §15 ADR 24, §18 acceptance.
- §6.12 "deliberately NOT built in" left unchanged (Opus's iter-3 N-§8-XREF offered "drop ref OR add §6.12 bullet"; v4 chose drop — valid).

## Sub-bar findings (NIT/LOW-class, NOT blocking)

### Convergent: §9 field-list incompleteness (Codex LOW + Opus NIT)

§9 line 390 enumerates "all fields read by built-ins (`metadata.durationTicks`, `metadata.failedTicks`, `metadata.incomplete`, `commands[].type`, `ticks[].events[].type`)" — same incomplete-list pattern that iter-3 caught in ADR 24 but in §9, missing `commands[].result.accepted` (§6.10) and `executions[].executed` (§6.11). The surrounding sentence's actual claim ("these fields are present in v0.8.0+ bundles") is still true, and §9 isn't a normative source for which fields metrics read (§6.10/§6.11 are). Codex framed as LOW (parallels iter-3 ADR 24 drift); Opus framed as NIT (§9 isn't normative). Both agree below the bar.

### Codex-only LOW: §12 detailed test bullets stop at original metric set

`commandValidationAcceptanceRate` (§6.10) and `executionFailureRate` (§6.11) get covered by the multiplexing bullet (now updated to 11) and §18's generic "each built-in tested" clause, but don't get dedicated semantic-case bullets the way `failureBundleRate` / `failedTickRate` / `incompleteBundleRate` do. Acceptance still binds via §18 — this is a thoroughness gap, not a coverage gap.

### Opus-only NIT: status header bookkeeping

Line 3 says "+ 2 NITs" addressed in v4, but iter-3 had 3 distinct NITs (N-100PCT, N-BRACE, N-§8-XREF), all addressed. Off-by-one in the bookkeeping line; doesn't affect technical content.

## Verdict

**ACCEPT for v4.** Both reviewers independently said ACCEPT. The two sub-bar findings (N-§9-FIELDLIST + the optional dedicated-test bullets for the two execution-stage metrics) are documentation polish — fold into the T1 implementation diff when docs touch code, or leave for a follow-up. Neither is implementation-blocking. Architecture, semantics, and engine-fact alignment all converged across iters 1→4.

Move to T1 implementation per §14.
