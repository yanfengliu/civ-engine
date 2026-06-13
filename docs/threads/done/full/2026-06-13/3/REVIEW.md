# Full-codebase review — 2026-06-13, iteration 3 (verification of the iter-2 fix batch)

**Reviewers:** Claude opus[1m] max + Codex gpt-5.5 xhigh on the 243-line iter-2 fix diff (L3 rework, H1 standalone getAt, L2 viewer_frame, H2 non-Error), grounded against live code + iter-2 `REVIEW.md`. Gemini unreachable.

## Verdict

Both confirmed the iter-2 fixes functionally correct — **Codex: "no BLOCKER/HIGH/MEDIUM/LOW," all four VERIFIED**; **Claude: "converging, no regression in the L3 rework"** (it even proved the L3 coalesce *eliminates* a latent same-tick selfCheck false-divergence). But Claude — the sharper pass — found 4 real polish items the iter-2 fixes left, all now fixed in iteration 3.

## Findings & iteration-3 fixes

| # | Sev | Reviewer | Finding | Fix |
|---|-----|----------|---------|-----|
| 1 | MEDIUM | Claude | **L2 over-claim.** `viewer_frame` stamped `stateCarriedForward` unconditionally, but `snapshotAtTick` returns verbatim accurate state at recorded ticks (startTick / periodic / terminal — common inspection targets), so the annotation misinformed an agent that final-state rng is stale when it is exact. `bundle_snapshots` gates this correctly. | **FIXED** — gated to hydrated (non-recorded) ticks only (`tick === startTick \|\| snapshots.some(...)` ⇒ no flag), matching `bundle_snapshots`. Test pins present (tick 1) + absent (startTick 0). |
| 2 | MEDIUM | Claude | **findNearest perf.** Sorting the standalone `SpatialGrid.getAt` (iter-2 H1) taxed `findNearest`'s internal ring scan with a per-cell sort+alloc — correctness-neutral (it min-reduces by (distSq,id)) but wasteful on a hot RTS query. | **FIXED** — new internal `SpatialGrid.getAtRaw` (raw live cell, no copy/sort); `findNearest` uses it. Public `getAt` keeps the sorted copy (H1 intact). Benchmark *improved* (large 86→82, churn 5.14→4.88). |
| 3 | LOW | Claude | L2 key-name divergence: `stateCarriedForward` (viewer_frame) vs `carriedForward` (bundle_snapshots) — the lessons.md cross-surface duplication-of-a-fact trap. | **FIXED** — unified to `carriedForward` across both MCP tools. |
| 4 | LOW | Claude | **H2 test mis-targeted.** The iter-2 test threw a *string* — which auto-boxes and never crashed the old `err as Error` code, so it passed on buggy AND fixed code. The real crash path is `null`/`undefined`. | **FIXED** — test now throws `null`/`undefined` (genuinely fails the old code, passes the new `(err ?? {})`). |
| NIT | — | Codex/Claude | stale "skipped" comment in `session-recorder.test.ts`; `viewer_frame` description didn't mention `carriedForward`; api-reference `getAt` doc not updated for id-sorted + getAtRaw. | **FIXED** — comment, tool description, and api-reference all updated. |

## Confirmed correct by both (no action)

L3 sink-coalesce (Claude traced all 5 sub-invariants — initialSnapshot/slice/persistedEndTick/replayer/no-stale-tick — and confirmed it *hardens* the selfCheck invariant); H1 standalone getAt sorted copy + view forwarding; M6/M1–M5/L1/L4/L5 from prior iterations. Codex's informational note (MemorySink preserves write-order vs FileSink sorts on `toBundle`, divergent only on an out-of-contract non-monotonic timeline-rewind-while-recording path) is pre-existing and explicitly *not introduced by this diff* — left as-is (out of the monotonic recording contract).

## Validation

Root `npm test` 1228 passed + 1 todo; mcp 20; typecheck/lint/build + benchmark green (improved). Iteration 4 verifies these iter-3 changes (getAtRaw + the L2 gate are new code) to confirm convergence.
