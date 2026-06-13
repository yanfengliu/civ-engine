# Full-codebase review — 2026-06-13, iteration 4 (final verification — CONVERGED)

**Reviewers:** Claude opus[1m] max + Codex gpt-5.5 xhigh on the complete fix diff, focused on the iter-3 changes (L2 gate, findNearest/getAtRaw, H2 test, NITs), grounded against live code + iter-1/2/3 `REVIEW.md`. Gemini unreachable.

## Verdict: CONVERGED

Both reviewers verified the iter-3 changes correct, complete, and regression-free. **Claude: "This batch is converged — nitpicks only."** No BLOCKER/HIGH/MEDIUM/LOW correctness or regression issues. Per-area confirmations:

- **L2 gate** (viewer_frame `carriedForward`) — correct: the gate `tick === startTick || snapshots.some(...)` is *exactly* the set of ticks where `hydrateAtTick` returns verbatim (the fold loop is empty iff `submissionTick === best.tick`), so `carriedForward` is flagged iff rng/config are genuinely stale; semantics identical to `bundle_snapshots` (both treat `{startTick} ∪ {snapshots}` as recorded); key name unified; both present/absent cases pinned.
- **findNearest** — `getAtRaw` was provably order-safe (min-reduce by (distSq,id)), H1 intact, single caller, no mutation — but see the surface item below.
- **H2 test** — now genuinely pins the crash path: `throw null` makes the OLD `err as Error` → `e.name` throw a TypeError that escapes the catch (the iter-2 string-throw auto-boxed and never crashed). Verified by both.
- **L3 sink-coalesce** (iter-2) — still sound in the combined state; the iter-3 changes don't touch the recorder/sink path.
- NITs (stale comment, api-reference getAt, tool descriptions) — all done.

## The one open item — `getAtRaw` public surface in a patch (both reviewers; Codex MEDIUM / Claude NIT)

`getAtRaw` was a new public method on the exported `SpatialGrid` — additive surface, which the post-1.0 semver convention (`AGENTS.md`) puts on the **minor** axis, not patch. The name-level `public-surface.test.ts` doesn't catch method additions (it pins export names, deferring signatures to a d.ts-diff step), so nothing auto-forced it. Resolution offered by both: tag `@internal`(+stripInternal) or bump minor.

**Disposition — REVERTED.** `getAtRaw` existed only to skip a benchmark-tolerable per-cell sort in `findNearest`'s internal scan; both reviewers had already deemed that sorted-copy cost acceptable (iter-2/3 benchmarks green with it). Rather than add public surface (or build-config `stripInternal`) in what is otherwise a pure-bugfix batch, `findNearest` reverts to the sorted-copy `getAt` with a comment noting the accepted, benchmark-validated cost. This keeps the full-review batch a clean **patch (1.1.3)** with zero surface change under the 1.0 freeze. H1's public `getAt` id-sort stays.

## Convergence summary across 4 iterations

iter-1: 2 HIGH + 6 MEDIUM + 6 LOW found and fixed. iter-2: Codex caught a real L3 state-loss **regression** Claude had approved (the multi-reviewer payoff) + 3 completeness items — all fixed. iter-3: Claude found 4 polish items (L2 over-claim, findNearest perf, naming, mis-targeted test) — all fixed. iter-4: both converged; the lone surface/versioning item resolved by reverting `getAtRaw`. Severity strictly decreased each round (real bugs → regression → polish → versioning-nit). **No outstanding correctness, regression, or surface issue.**

## Final validation

Root `npm test` (post-revert) green; mcp 20; typecheck/lint/build + benchmark + `npm audit` confirmed at the version-bump/commit step.
