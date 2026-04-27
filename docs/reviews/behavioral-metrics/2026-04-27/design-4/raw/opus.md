All field references verified. Now I have enough to finalize the review.

# Review — Spec 8 Behavioral Metrics, design v4

## Iter-3 findings — all fixes verified landed

| Iter-3 finding | Location | Verified in v4 |
|---|---|---|
| M-DRIFT #1: `*Stats` empty corpus says `NaN` | §12 line 454 | ✅ Now `null` numeric fields, with §6.2 cross-ref + JSON-stable rationale + NumPy/R type 7 percentile note |
| M-DRIFT #2: multiplexing test "9 built-ins" | §12 line 461 | ✅ Now "11 built-ins…all 11 results" |
| M-DRIFT #3: ADR 24 "9 built-ins" + stale field list | §15 line 523 | ✅ Now "11"; field list includes `commands[].result.accepted`, `executions[].executed`, `metadata.failedTicks`, `metadata.incomplete` |
| N-100PCT: "100% of new code covered" | §12 line 475 | ✅ Replaced with case-enumeration acceptance: "every case enumerated above has at least one test" |
| N-BRACE: shell `design-{1,2}` brace expansion | line 3 | ✅ Expanded to three explicit `design-{1,2,3}/REVIEW.md` paths |
| N-§8-XREF: bad §6.12 cross-ref | §8 line 382 | ✅ §6.12 ref dropped; replaced with direct "flaky deltas in `compareMetricsResults` because every run produces a fresh UUID and timestamp" |
| §17 row "AsyncIterable overload" silently contradicting ADR 26 | §17 line 561 | ✅ Now reads "Separate `runMetricsAsync(...): Promise<MetricsResult>` for I/O-backed sources. Distinct function (not an overload of `runMetrics`) per ADR 26." |

## Engine-fact alignment

Spot-checked ADR 24's expanded field list against the actual engine surface:

- `metadata.durationTicks`, `metadata.failedTicks`, `metadata.incomplete` — `session-bundle.ts:91/100/99` ✓
- `commands[].type`, `commands[].result.accepted` — `RecordedCommand` at `session-bundle.ts:41-47` carries `result: CommandSubmissionResult`; `accepted` populated at `world.ts:740/751` ✓
- `executions[].executed` — `SessionBundle.executions: CommandExecutionResult[]` at `session-bundle.ts:119`; `executed` set at `world.ts:1686/1711/1721/1769` (the three `executed: false` codes the iter-3 review verified) ✓
- `world.ts:732-748` validator early-return + `session-recorder.ts:163-172` capture wrap — both confirm validator-rejected commands are in `bundle.commands` (with `result.accepted: false`) but NEVER in `bundle.executions`, matching the §6.10/§6.11 semantic split ✓

## Internal consistency

- §2 / §7.1 / ADR 26 / §17 all converge on "v1 is sync; async is a separate `runMetricsAsync` function, not an overload."
- §5.3 "NumPy linear (R-quantile type 7)" ↔ §6.2 percentile rules ↔ §12's new "(NumPy linear / R type 7)" callout — consistent.
- 11-built-in count consistent across §4 table, §6.x sections, §12 multiplexing test, §13 docs, §14 plan, §15 ADR 24, §18 acceptance.
- §6.12 left unchanged (Opus' N-§8-XREF offered "drop ref OR add §6.12 bullet"; v4 chose drop — valid).

## New observations

- **NIT (bookkeeping):** Line 3 status header says "+ 2 NITs", but iter-3 actually had 3 distinct NITs (N-100PCT, N-BRACE, N-§8-XREF), all addressed by this diff. Undercount by 1 in the bookkeeping line; doesn't affect technical content.
- **NIT (parallel to ADR 24's old issue):** §9 line 390 enumerates "fields read by built-ins (`metadata.durationTicks`, `metadata.failedTicks`, `metadata.incomplete`, `commands[].type`, `ticks[].events[].type`)" — same incomplete-list pattern that iter-3 caught in ADR 24 but in §9. Missing `commands[].result.accepted` and `executions[].executed`. The surrounding sentence's actual claim ("these fields are present in v0.8.0+ bundles") is still true, and §9 isn't a normative source for which fields metrics read (§6.10/§6.11 are), so this is below MED.

Neither is blocking and neither was flagged by either reviewer in iter-3.

## Verdict: **ACCEPT**

No remaining BLOCKER / HIGH / MED issues. All convergent iter-3 findings landed; engine-fact references are verified valid; the §17/ADR 26 contradiction the iter-3 reviewers correctly predicted was bundled in. The two NITs above are documentation-bookkeeping details, not implementation blockers — fold them into a future revision if convenient, but they do not gate convergence. This spec is ready for implementation.
