You are reviewing the civ-engine codebase. Repository at the current working directory.

## Context: this is iteration 9 — verify iter-8's N3 fix + final convergence sweep

Iter-7 (`docs/reviews/full/2026-04-26/7/REVIEW.md`) shipped 7 fixes (v0.7.5). Iter-8 (`docs/reviews/full/2026-04-26/8/REVIEW.md`) verified all 7 cleanly + closed one Note (N3) — a parallel-class gap to L2 in `ComponentStore.set`'s strict-path branch (taken when `wasPresent === false`, e.g. after `remove()` or on first insert when a baseline exists).

Commit `2942f0d` (v0.7.6) shipped the N3 fix:

- `ComponentStore.set` strict-path branch now checks the baseline-fingerprint match when `diffMode === 'semantic'` and short-circuits dirty-marking on revert. Strict mode untouched (gated on `diffMode`).
- 3 new regression tests: `remove() + set-to-baseline` collapses; `remove() + set-to-different` still marks dirty; first insert with no baseline still marks dirty.

**Current HEAD:** `2942f0d` (v0.7.6). 630 tests pass. typecheck/lint/build clean.

## Your job

1. **Verify the N3 fix landed correctly.** Specifically:
   - The strict-path baseline check is gated on `diffMode === 'semantic'` — strict mode must still mark dirty on every set (no behavior change).
   - The check fires correctly for `wasPresent === false` after `remove()` when the new value matches the cached baseline.
   - The check does NOT fire on first-ever insert (no baseline yet) — verify by walking the `clearDirty` re-baseline logic.
   - The fingerprint computation cost is acceptable (O(serialize(component)) on every semantic-mode set, including never-seen entities). Is this expected? Documented?
   - The interaction with the L2 fix (the `wasPresent === true` early return at lines 32-37) is clean — both branches now uniformly honor the "skip dirty-marking on baseline match" contract.

2. **Look for iter-8 regressions.** Did the N3 fix introduce a new bug?
   - Strict mode test coverage: any sets in strict mode that no longer mark dirty when they should?
   - Semantic mode performance: did the new fingerprint call on the strict-path slow down legitimate insert-heavy workloads?
   - Did the gate `if (this.diffMode === 'semantic')` correctly preserve the old strict-mode short-circuit (no fingerprint cost when not in semantic mode)?

3. **Final outside-iter-7/8-scope sweep.** Iter-7 was the broader sweep, iter-8 was the convergence + N3. Iter-9 is the closing convergence check. If you find something new, flag it — but **only if it is real and important.** No nitpicks.

## Convergence expectation

Iters 1–6: closed `CommandTransaction` chain. Iter-7: 7 broader-sweep findings closed. Iter-8: verified + N3 closed. **Iter-9 is the closing convergence check.** If clean, write "None observed." everywhere — that ends the loop.

## Project context

- `AGENTS.md`, `CLAUDE.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/devlog/detailed/2026-04-26_2026-04-26.md` (iter-7 + iter-8 entries near the bottom)
- `docs/changelog.md` (v0.7.5 + v0.7.6 entries)
- `docs/reviews/full/2026-04-26/{7,8}/REVIEW.md`

## Output format

```
# Review Summary
<2-3 sentences>

# N3 Fix Verification
<verified or regressed>

# Critical / High / Medium / Low
<one section per severity; "None observed." if clean>

# Notes & Open Questions
<open questions only>
```

## Rules
- **No nitpicks.** Closing convergence check.
- Be specific: file:line, exact symbol, exact bug.
- Do NOT modify files.
- Do NOT re-flag deferred items from iter-1–8 unless they regressed.
