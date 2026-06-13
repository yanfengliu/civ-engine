# Full-codebase review — 2026-06-13, iteration 2 (re-review of the iter-1 fix batch)

**Reviewers:** Claude opus[1m] max + Codex gpt-5.5 xhigh on the 923-line iter-1 fix diff, grounded against the live code + the iter-1 `REVIEW.md` + `docs/learning/lessons.md`. **Gemini unreachable** (persistent SSL). Both verified each of the 14 iter-1 fixes (H1, H2, M1–M6, L1–L5, NIT).

## Verdict

Both reviewers **confirmed all 14 iter-1 fixes correct and complete**, no vacuous tests, no silently-rewritten tests. **Claude: "converges — reviewers are now nitpicking."** But Codex caught a real **regression** Claude approved — the multi-reviewer payoff.

## Codex findings (all fixed in iteration 2)

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| R1 | **MEDIUM (regression)** | **L3's terminal-snapshot skip lost state.** The iter-1 fix skipped the terminal snapshot whenever `_lastSnapshotTick === world.tick` — but if the world mutates at the same tick AFTER the last snapshot (setup window / `runMaintenance` / a `strict:false` write before a no-step disconnect), the terminal is skipped and the bundle keeps the STALE snapshot. Claude had approved this fix. | **Reworked:** reverted the recorder-side skip (terminal is ALWAYS written); `MemorySink.writeSnapshot` now **coalesces by tick** (replace-in-place, last-write-wins) to match FileSink's `snapshots/<tick>.json` overwrite. State preserved AND ticks unique. New test pins the setup-mutate case (mutation after a same-tick manual snapshot survives). |
| R2 | HIGH (incomplete) | H1 left the standalone exported `SpatialGrid.getAt` returning the raw live Set (insertion order + write-through), while its siblings `getNeighbors`/`getInRadius` now id-sort. | `SpatialGrid.getAt` now returns a fresh id-sorted copy; the World `getAt` view forwards it directly (no double-copy). New standalone test. |
| R3 | LOW (incomplete) | L2 annotated `bundle_snapshots` but not `viewer_frame` `includeState`, which also returns a hydrated snapshot. | Added `stateCarriedForward` to `viewer_frame`. |
| R4 | LOW (edge) | H2's `failPolicy` did `err as Error` — a policy/validator throwing `null`/string would crash `failPolicy` with a TypeError instead of classifying as `policyError`. | `failPolicy` is now non-Error-safe (mirrors the async `errorShape`). New test (`throw 'string-boom'` → `policyError`). |

## Claude observations (LOW/INFO — dispositions)

- **H1 standalone `SpatialGrid.getAt`** — same as Codex R2; **FIXED**.
- **H2 sync-vs-async `stopWhen`-throw parity** — sync `runSynthPlaytest` propagates a throwing `stopWhen` (after cleanup) while async `runAgentPlaytest` catches it as `agentError`. **Accepted as-is** (defensible, not a regression, no `agentError`/`stopWhenError` slot in the sync taxonomy; both reviewers agree it's defensible). Noted in the H2 fix comment.
- **`clearStateDirty` (world-state) still full-rebuilds** — INFO only; world-state keys are top-level/few, not the per-entity scaling case M6 targeted. **Deferred** with a note; not a finding.

Both reviewers independently confirmed **M6 (incremental clearDirty) is correct** — the hardest-to-verify fix — by tracing every population path (set/remove/fromEntries/deserialize/applySnapshot) and the dirty/removed-set mutual exclusivity. L6/L7 deferrals reaffirmed reasonable.

## Validation after iteration-2 fixes

Root `npm test` 1227 passed + 1 todo; mcp 20; typecheck/lint/build + benchmark green. New iter-2 tests: standalone `SpatialGrid.getAt` ordering, L3 setup-mutate no-loss, H2 non-Error throw. Iteration 3 re-reviews this iter-2 fix diff (esp. the L3 sink-coalesce design).
