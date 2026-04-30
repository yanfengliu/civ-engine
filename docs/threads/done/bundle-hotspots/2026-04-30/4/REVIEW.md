# Bundle Hotspots Implementation Iter-4 Review

**Date:** 2026-04-30
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE → produces iter-5 (both findings addressed)

## Convergent (real, both addressed)

### F1 (MEDIUM) — iter-3 execution_failure fix incomplete in source comment
iter-3 corrected the api-reference, changelog, and test rationale to describe the three engine causes (missing handler, thrown handler, dropped command after tick abort) for `executions[i].executed === false`. But `src/bundle-hotspots.ts:92-96` still had the iter-1 wording "handler-time failure (the command was accepted by the validator but the handler threw)." Source comments are the first thing a reader of `src/bundle-hotspots.ts` sees, so leaving this stale recreates the same drift F1 was meant to fix.

**Fix:** Source comment rewritten to mirror api-reference's three-cause description: "The engine writes `executions[i].executed === false` (per src/world.ts:1783-1875) for missing handlers, thrown handlers (which also produce a TickFailure at the same tick), and commands dropped because the tick already aborted — so an execution_failure hotspot may accompany a tick_failure at the same tick."

### F2 (LOW) — Devlog still has stale `(n-1)/√n` formula + missing iter-3/iter-4 entries
The iter-1 line in `docs/devlog/detailed/2026-04-29_2026-04-30.md` cited the (now-corrected) `(n-1)/√n` upper bound. A reader of the devlog gets no signal that the formula was corrected to `√(n-1)` in iter-3. Plus the devlog "Code reviewer comments" section listed iter-1 and iter-2 only — iter-3 and iter-4 were missing entirely.

**Fix:** iter-1 line updated with a parenthetical noting the iter-3 correction. Full iter-3 and iter-4 entries added with findings + resolutions.

## Verified clean (Claude spot-checks)

- F2 (z-score formula) from iter-3 — fully landed in source + api-reference; math verified for population stdev.
- Sort stability, severity boundaries, edge-case test coverage, `Number.isFinite(stdevThreshold)` guard, generic erasure pattern — all clean.

## Disposition

ITERATE → 2 fixes addressed; iter-5 sanity check follows.
