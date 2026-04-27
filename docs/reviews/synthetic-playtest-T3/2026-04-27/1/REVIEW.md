# T3 Code Review iter-1: Effectively Converged

**Iter:** 1. **Subject:** T3 diff (~430 lines). **Reviewers:** Codex (1 MED + 2 LOW), Opus (ACCEPT + 1 LOW + 2 NIT).

## Codex MED — production-determinism test catalog only depends on ctx.tick

Codex correctly noted that the dual-run test's catalog had a single entry whose payload was derived only from `ctx.tick`, not from `ctx.random()`. So the run stayed deterministic even if `runSynthPlaytest` ignored `policySeed` or seeded the sub-RNG incorrectly.

**Fix (v2):** Multi-entry catalog with the last entry using `ctx.random()` for selection. Now the test actually exercises the harness seed path: if policySeed were ignored, the catalog selection sequence would still be deterministic-by-tick but the random-driven entry's value would diverge.

## Convergent LOW (both reviewers) — "first periodic snapshot" wording

Changelog + devlog said negative sub-RNG diverges at "first periodic snapshot", but test runs `maxTicks: 20` + default `snapshotInterval: 1000` → no periodic snapshots. Divergence is detected at terminal snapshot.

**Fix (v2):** Updated wording in changelog + devlog to mention "terminal-snapshot segment with default snapshotInterval" instead.

## Convergent LOW (both reviewers) — Spec 1 version range off

Roadmap had `v0.7.6 → v0.7.19`. Actual session-recording timeline starts at `v0.7.7-pre` (T0 setup) / `v0.7.7` (T1 bundle types).

**Fix (v2):** Corrected to `v0.7.7-pre → v0.7.19` in both roadmap and changelog T3 entry.

## Opus NIT — ARCHITECTURE row missed v0.8.1

Component Map row said `v0.7.20 + v0.8.0`; should include `v0.8.1` for parity with the drift-log entry.

**Fix (v2):** Added v0.8.1 to the Component Map row.

## Opus's verification (verbatim from review)

- All 4 gates pass (798 + 2 todo, 7 new in `synthetic-determinism.test.ts`).
- Engine-fact cross-check: World 4-generic at `world.ts:233` ✓; `CommandExecutionResult.tick` only ✓; no-payload short-circuit at `session-replayer.ts:270-276` ✓; failed-segment skip `failedTick >= a.tick && failedTick < b.tick` at `session-replayer.ts:286` ✓; `world.tick` advances on poison via `finalizeTickFailure` ✓.
- Each test traced individually for correctness — all 7 valid.
- Coverage vs. design v10 §12/§18 — complete; no gaps.
- Anti-regression: T1's 13 + T2's 19 + T3's 7 = 39 new tests on top of pre-Spec-3 corpus, all green.

## Verdict (post-v2)

ACCEPT. All HIGH/MED resolved; remaining NITs landed.
