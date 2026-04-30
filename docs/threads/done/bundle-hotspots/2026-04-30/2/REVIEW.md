# Bundle Hotspots Implementation Iter-2 Review

**Date:** 2026-04-30
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE → produces iter-3 (all findings addressed; will dispatch iter-3 sanity check)

## Convergent (real, all addressed)

### F1 — Stale doc test counts
Both reviewers flagged: iter-1 added 10 tests (1063 → 1073) but iter-2 added 3 more (1073 → 1076), and the docs were not updated. Plus the changelog Validation paragraph still claimed "Multi-CLI implementation review pending" after iter-1 had completed; the devlog "Code reviewer comments: Pending" line was similarly stale; the api-reference "extension deferred until impl-review iter-1 lands" parenthetical was no longer true.

**Fix:** All counts updated (final: 1075 passed + 2 todo, +12 from v0.8.12; one of the iter-2 tests was removed per Claude NIT-1, so the net is +12 not +13). Validation paragraph rewritten to summarize both iter-1 and iter-2 findings + resolutions. Devlog "Code reviewer comments" section rewritten with full iter-1 + iter-2 details. Stale parenthetical removed.

## Claude NITs (all addressed)

### NIT-1 — Vacuous default-threshold cap test still present
The original `'caps duration outliers at maxDurationOutliers (default 10)'` test inflated 15 of 30 ticks by ~1 stdev under default threshold 3, producing zero outliers — the `<= 5` assertion was satisfied vacuously. iter-1 added a working replacement using `durationStdevThreshold: 1.0` but didn't remove the old test.

**Fix:** Removed the original vacuous test outright (with a comment in the test file noting the removal and pointing to the working replacement). Net test count: 12 (was 13 in iter-2).

### NIT-2 — "deduped per tick" comment is misleading
`src/bundle-hotspots.ts:91`'s "Execution failures (always reported, deduped per tick)" was inaccurate — the code does NOT dedupe; multiple failures at the same tick produce multiple hotspots.

**Fix:** Comment rewritten: "Execution failures (always reported, one hotspot per failed execution). … Multiple failures at the same tick produce multiple hotspots — each failed command is independent triage signal."

### NIT-3 — Within-tick ordering test only exercises 3 of 4 kinds
The new ordering test built a fixture with `tick_failure`, `execution_failure`, and `marker` at the same tick but no `duration_outlier`. A regression that swapped `duration_outlier` and `marker` priorities wouldn't be caught.

**Fix:** Test extended to inflate the SessionTickEntry whose `.tick === 3` so a `duration_outlier` at that tick gets surfaced too. Now asserts `[tick_failure, execution_failure, duration_outlier, marker]` — all four kinds, full priority chain.

## Verified clean

All iter-1 fixes verified holding (api-reference + README, severity wording, execution_failure code path test, samples-array dead field removal, short-bundle z-score note). z-score math, KIND_ORDER values, generic-erasure pattern all correct.

## Disposition

ITERATE → 4 fixes addressed; iter-3 sanity check will follow to confirm doc counts settle and no fresh issues from the test removal.
