# LOC budget enforcement (v0.8.15) — review iteration 1

**Diff:** working tree vs HEAD (0c3b411) — budget test, World layer-chain split (10 files), occupancy barrel split (7 files), three borderline-file trims, version bump + docs. ~4.7k insertions / ~4k deletions across 36 files.

**Reviewers:** Codex `gpt-5.5` (xhigh, read-only), Gemini `gemini-3.1-pro-preview` (plan mode), Claude `claude-opus-4-7[1m]` (max effort, Read/git tools). All three independently verified the export surface (including type-only names) against HEAD and confirmed the layer-chain `World` imports are type-only/erased.

## Findings

| # | Severity | Reviewer(s) | Finding | Disposition |
|---|----------|-------------|---------|-------------|
| 1 | MEDIUM | Codex | Changelog/devlog/source comments reference `docs/threads/done/loc-budget/...` but the thread still lives under `docs/threads/current/` at diff time — stale-before-merge pointers. | **Resolved by process** — the thread moves to `done/` in the same commit that ships the diff (this REVIEW.md travels with it), at which point every pointer is correct. Verified post-move in the final commit. |
| 2 | MINOR (real) | Gemini | The ratchet's "honesty" test only fired when a pinned file dropped ≤ 500; a pinned file shrinking from 861 → 800 would keep its 861 pin, letting the headroom silently regrow. The "may only shrink" comment overpromised. | **Fixed** — honesty test now asserts `lines === pin`: any shrink forces the pin down in the same commit. All 9 pins verified equal to exact current sizes; budget suite re-run green. Claude independently raised the same comment-vs-enforcement gap (its diff snapshot predated the fix). |
| 3 | NIT | Claude | Devlog post-trim line counts stale by 2-3 lines (546 → "363" vs actual 360; 509 → "442" vs actual 440) — later unused-import cleanups shrank the files after the numbers were written. | **Fixed** — devlog updated to 360 / 440; mangled "largest src file" sentence cleaned up. |
| 4 | NIT | Claude | `countLines` header comment claimed exact `wc -l` parity; off-by-one for files lacking a trailing newline (none exist in repo). | **Fixed** — comment now states the trailing-newline assumption. |
| 5 | NOTE | Gemini | `runTick`'s nested unindented `try { try {` block is a pre-existing formatting anomaly moved verbatim. | **No action** per reviewer ("no immediate change required"); preserving it is consistent with pure-move discipline. |

## Verifications reported clean (convergent)

- **Behavior drift:** Claude byte-diffed `serialize`/`deserialize`/`applySnapshot`/`_replaceStateFrom` and the occupancy moves against HEAD — verbatim. The three declared deviations (`getComponentForQuery`, `OccupancyBinding` `entityStates` module functions with 8 call sites, meta-test prototype-chain walk) each verified behavior-neutral by Claude and Gemini.
- **Public surface:** all three reviewers — `world.ts` + `occupancy-grid.ts` re-export sets match HEAD exactly (runtime AND type-only names); `world-types.ts` internals (`RegisteredSystem` etc.) do not leak through `index.ts`; package `exports` map exposes only `"."`.
- **Layer chain:** abstract `executeTickOrThrow` wiring via constructor closure is call-time-resolved and correct; `StrictModeWorldView` still structurally satisfied; `nextSystemOrder` semantics preserved; all `World` import cycles are `import type`.
- **Docs:** ADR 43, drift-log, ARCHITECTURE component-map rows, changelog accuracy confirmed (modulo finding 3).

## Disposition

**ACCEPT after inline fixes — no iteration 2.** Zero correctness/security/performance findings across three reviewers on a ~4.7k-line diff; the one real (minor) finding was a test-strictness gap in the brand-new budget test, fixed and re-verified. Convergence bar ("reviewers nitpick instead of catching real bugs") met in one iteration.
