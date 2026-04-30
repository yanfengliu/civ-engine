# Bundle Hotspots Implementation Iter-1 Review

**Date:** 2026-04-30
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE → produces iter-2 (all findings addressed)

## Convergent findings (all real, all addressed)

### F1 (Codex H, Claude implicit) — Missing api-reference.md "Bundle Hotspots (v0.8.13+)" section + missing README Public Surface bullet
The `src/index.ts` comment pointed at a section that didn't exist; the public-surface bullet was also missing. AGENTS.md doc rule violation.

**Fix:** Added full "Bundle Hotspots (v0.8.13+)" section to `docs/api-reference.md` covering signature, severity rules, ordering invariant, short-bundle note, and edge cases. Added a Public Surface bullet to README + a Feature Overview row.

### F2 (Codex M) — `maxDurationOutliers` test inflated 15 of 30 samples to ~1 stdev → no outliers triggered, cap test passed vacuously
The test asserted `<= 5` but never actually produced any outliers, so it would pass even if the cap were ignored.

**Fix:** Replaced with a test that uses `durationStdevThreshold: 1.0` (override default 3) and inflates 7 of 20 ticks to clear the threshold. Sanity-check confirms uncapped run produces > 3 outliers; capped run produces exactly 3.

### F3 (Claude doc-medium) — Changelog claim "failures are always high" is inaccurate
The implementation has `tick_failure` → high but `execution_failure` → medium. Doc needed correction.

**Fix:** Changelog severity-rules wording updated to be specific: "tick failures are `high`; execution failures are `medium` (handler-time error, not fatal to the tick); duration outliers scale with z-score; markers are always `low`."

### F4 (Claude test-medium) — `execution_failure` code path fully untested
No test produced a bundle with `executions[i].executed === false`, so `executionFailureHotspot()` + the `if (!e.executed)` filter + severity:'medium' assertion + message formatting were all unexercised.

**Fix:** Added test that constructs a synthetic bundle with `executions[].executed === false` and asserts the hotspot's kind, severity, and message.

### F5 (Claude test-low/medium) — Within-tick kind-ordering invariant untested
The sort-by-`KIND_ORDER` (`tick_failure → execution_failure → duration_outlier → marker`) was claimed in doc and changelog but had no test. If `KIND_ORDER` values were swapped, the existing test suite wouldn't catch it.

**Fix:** Added test that builds a synthetic bundle with multiple kinds at the same tick and asserts the kind sequence matches the documented priority.

## Smaller observations (Claude NITs, addressed)

### N1 — Dead `metrics` field on samples array
`samples[].metrics` was collected but never read. Cosmetic.

**Fix:** Removed; samples now carry only `{ tick, duration }`.

### N2 — Doc-comment doesn't note short-bundle limitation
With population stdev, max possible z = (n-1)/√n. For n ≤ 10, this is < 3, so the default threshold of 3 can never produce outliers on short bundles.

**Fix:** Added a "Short-bundle note for duration outliers" paragraph to the function's doc-comment AND to the api-reference.md section.

## Not addressed (intentional design choices)

- Marker `details` omits `data`, `refs`, `attachments`, `createdAt`. This is intentional — the hotspot output is a triage list; agents that want the full marker can index `bundle.markers` by id (returned in `details.markerId`). Could be revisited if agent workflows surface the need.
- Variable shadowing of `b` (outer cast vs sort comparator parameter) — cosmetic, low value to fix.

## Verified clean

- z-score math (population stdev, divide by n)
- High-tail-only filtering
- ≥3 sample requirement
- stdev=0 short-circuit
- Sort order
- Generic-erasure pattern (signature lets callers use `SessionBundle<MyEvents, MyCmds>` without forcing internal type-parameter knowledge)
- Additive-only public surface (no breaking changes; c-bump 0.8.12 → 0.8.13 correct)

## Disposition

ITERATE → all findings addressed; iter-2 dispatch follows.
