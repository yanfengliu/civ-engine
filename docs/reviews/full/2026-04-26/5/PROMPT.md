You are reviewing the civ-engine codebase. The repository is at the current working directory.

## Context: this is iteration 5 (final convergence check)

The chain has been running through 4 review iterations. Trajectory:
- iter-1: 1 Critical + 4 High + 5 Medium + 7 Low → fixed in 5 commits (v0.5.11 → v0.6.4)
- iter-2: 1 regression + 2 High + 2 Medium + 4 Low → fixed in 1 commit (v0.7.0)
- iter-3: 2 regressions + 3 Low → fixed in 1 commit (v0.7.1)
- iter-4: 1 vacuous-test Low → fixed in 1 test-only commit (no version bump)

Current HEAD is `0049ff6`. v0.7.1. 604 tests pass. The most recent commit replaced a vacuous L_NEW2 regression test with one that pins underlying-storage identity (`expect(copy._defaultValue).not.toBe(original._defaultValue)` via TypeScript-private bypass).

Read iter-4's REVIEW at `docs/reviews/full/2026-04-26/4/REVIEW.md` first.

This is the final pass before merge. **If there are no real issues, write "None observed." in every section.** No nitpicking — the chain is at convergence.

## Your job

1. **Verify the iter-4 test-only fix** (`tests/layer.test.ts` L_NEW2 regression test) actually pins L_NEW2's behavior.

2. **One final sweep** of `src/command-transaction.ts` and `src/layer.ts` — these have been the focus of three iterations and may now be brittle to subtle bugs introduced during the iteration churn.

## Project context (read for grounding before reviewing)
- `AGENTS.md`, `CLAUDE.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/devlog/summary.md`, `docs/devlog/detailed/2026-04-26_2026-04-26.md`
- `docs/changelog.md` — entries for v0.6.0 → v0.7.1
- `docs/reviews/full/2026-04-26/3/REVIEW.md` and `docs/reviews/full/2026-04-26/4/REVIEW.md`

## Output format

Same as before. **If clean at every severity, write "None observed." and the executive summary should state convergence.**

```
# Review Summary
<2-3 sentences>

# Iter-4 Regressions
<findings; "None observed." if clean>

# Critical / High / Medium / Low / Polish
<one section per severity; "None observed." if clean>

# Notes & Open Questions
<open questions only>
```

## Rules
- **No nitpicks.** This is a convergence check. If the codebase is in good shape, say so.
- Be honest. If you find a real bug, flag it. Otherwise: "None observed."
- Do NOT modify files.
- Do NOT re-flag deferred items.
