# Bundle Hotspots Implementation Iter-5 Review

**Date:** 2026-04-30
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (final iteration — all findings addressed; further sanity checks would only produce more doc-currency churn since the implementation is correct + well-tested + all gates clean)

## Convergent (real, all addressed)

### F1 (Codex M / Claude #1) — Stale "ran in 2 iterations" wording
After iter-3 and iter-4 each ITERATEd on real issues, the changelog Validation paragraph still said "ran in 2 iterations" and the devlog summary one-liner said "2 impl-review iterations to ACCEPT." Underreporting the review effort and inconsistent with the thread history.

**Fix:** Changelog Validation rewritten as a 5-iteration enumeration with per-iter findings. Summary updated to "5 impl-review iterations."

## Claude additional findings (real, all addressed)

### #2 (LOW doc-accuracy) — Source-comment parenthetical attaches incorrectly
`src/bundle-hotspots.ts:92-97` had "thrown handlers (which also produce a TickFailure at the same tick), and commands dropped because the tick already aborted" — the parenthetical attaches grammatically to thrown handlers only. But missing handlers ALSO produce a TickFailure (verified at `src/world.ts:1794-1803`); only drop-after-abort doesn't add a fresh failure.

**Fix:** Source comment restructured as an enumerated three-bullet list: missing handler (also produces TickFailure), thrown handler (also produces TickFailure), drop-after-abort (no fresh failure; abort happened upstream).

### #3 (LOW doc-currency) — LOC count drift
Changelog said "200 LOC", devlog Result said "~205 LOC", actual is 225 (drift accumulated as iter-1→iter-4 adjustments grew the file).

**Fix:** Both surfaces updated to 225 LOC.

### #4 (very low wording) — "Single-pass scan" overclaim
Implementation has separate linear loops for failures, executions, mean/variance/candidates inside findDurationOutliers, markers, plus a final sort. Total cost is still linear-ish but "single-pass" is a slight overclaim.

**Fix:** Changelog Validation now adds a clarifying note: "The 'single-pass scan' framing is shorthand — the implementation has separate linear loops … Total cost is O(n_ticks + n_failures + n_executions + n_markers) plus the sort."

## Verified clean (Claude spot-checks)

- iter-4 fixes verified holding (source `executed: false` enumeration, `√(n-1)` formula).
- All 12 tests cover the documented kinds, severities, ordering, and edge cases.
- Same-tick ordering test correctly inflates the SessionTickEntry whose `.tick === 3` so duration_outlier surfaces alongside synthetic failure/exec-failure/marker.
- Cap test no longer vacuous: 7 ticks at z≈1.36 vs threshold 1.0; uncapped > 3, capped == 3.
- `package.json` / `package-lock.json` / `src/version.ts` / README badge all consistently 0.8.13.

## Disposition

ITERATE on doc-currency only; substantive implementation is correct and verified across all five iterations. The pattern of doc-currency findings (each iteration's fixes leave traces of the previous wording in adjacent narrative surfaces) has reached the point of diminishing returns: each iter found one or two doc-accuracy findings, addressed them, and the next iter found a slightly different doc-accuracy finding in a different surface. After this iter-5 round, all known wording surfaces are aligned. **Closing the review at iter-5 — not iterating further.**
