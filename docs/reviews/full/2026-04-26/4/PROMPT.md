You are reviewing the civ-engine codebase. The repository is at the current working directory.

## Context: this is iteration 4 (verification of iter-3 fixes)

Iteration 3 (`docs/reviews/full/2026-04-26/3/REVIEW.md`) caught 2 iter-2 fix-quality regressions + 3 Low + a few Notes. The team has since landed one fix commit `1e79630` (v0.7.1, non-breaking) that:

- Adds `'warnIfPoisoned'` to `FORBIDDEN_PRECONDITION_METHODS` (closes R2_REG1).
- Restores `Layer.getState()`'s default-equality filter for object T only as a defensive backstop against `forEachReadOnly` contract violations (closes R2_REG2).
- Updates `docs/api-reference.md` `commit()` doc to reflect post-L_NEW1 terminalReason-aware error message (closes L_REG1).
- Adds an explicit regression test for L_NEW2's single-clone fix (closes L_REG3).
- Adds a meta-test that cross-checks `FORBIDDEN_PRECONDITION_METHODS` against `Object.getOwnPropertyNames(World.prototype)` with a curated read-only + private allowlist (closes L_REG2; provides safety net so future R1-style holes fail the suite).

Current HEAD is `1e79630`. v0.7.1. 604 tests pass.

Read iter-3's REVIEW.md first. Your job:

1. **Regression check on iter-3 fixes.** Verify each iter-3 finding (R2_REG1, R2_REG2, L_REG1, L_REG2, L_REG3) is correctly addressed and that the meta-test would actually catch a future denylist hole (e.g., if a new `World` method were added without classification, the meta-test should fail).

2. **Fresh review.** Independently re-review `src/` for any **new** issues introduced by the v0.7.1 commit. The diff is small (~80 LOC of source + ~50 LOC of tests). New bugs are unlikely but possible.

## Convergence expectation

This iteration is intended as a verification pass before merge. **If there are no real issues, write "None observed." in every section.** The chain has been running through three review iterations; the codebase quality has improved each cycle. Do NOT pad the report with nitpicks to look thorough. Quality > quantity.

## Project context (read for grounding before reviewing)
- `AGENTS.md` and `CLAUDE.md` (root) — project rules
- `docs/architecture/ARCHITECTURE.md`
- `docs/devlog/summary.md` and `docs/devlog/detailed/2026-04-26_2026-04-26.md`
- `docs/changelog.md` — v0.7.1 entry
- `docs/reviews/full/2026-04-26/2/REVIEW.md` and `docs/reviews/full/2026-04-26/3/REVIEW.md` for context

## Scope
- `src/command-transaction.ts` — verify warnIfPoisoned now in FORBIDDEN
- `src/layer.ts` — verify getState filter restored for object T only
- `tests/command-transaction.test.ts` — verify meta-test logic, exhaustiveness
- `tests/layer.test.ts` — verify forEachReadOnly safety-net test, single-clone test
- `docs/api-reference.md` — verify commit() doc reflects terminalReason

## Output format

Return ONLY a single Markdown document with these sections, in this order:

```
# Review Summary
<2-3 sentences>

# Iter-3 Regressions
<findings; "None observed." if clean>

# Critical / High / Medium / Low / Polish
<one section per severity; "None observed." if clean>

# Notes & Open Questions
<open questions only>
```

## Rules
- Be specific. Always cite file paths and line ranges.
- Be honest. **No nitpicks.** If clean, say so.
- Do NOT modify files.
- Do NOT re-flag deferred items (world.ts deeper split, occupancy-grid LOC, `as any` on emit dispatch, world-internal.ts ↔ world.ts circular import).
