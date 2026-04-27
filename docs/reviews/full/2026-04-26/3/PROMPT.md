You are reviewing the civ-engine codebase. The repository is at the current working directory.

## Context: this is iteration 3 (verification of iter-2 fixes)

Iteration 2 happened on 2026-04-26 against branch `agent/full-review-2026-04-26-iter1`. It produced 1 iter-1 regression (R1: C1 was incomplete) + 2 High + 2 Medium + 7 Low + 2 Notes findings. The team has since landed one fix commit `eaac9b5` (v0.7.0, breaking) covering:

- R1: exhaustive `FORBIDDEN_PRECONDITION_METHODS` const array, single source of truth for type-level `Omit` and runtime `Set`. Property-based regression test added.
- H_NEW1: `Layer.forEachReadOnly` switched from `??` to `=== undefined`.
- H_NEW2: `Layer<T>` primitive fast-path now decides per-value via `cloneIfNeeded(value)` + `isImmutablePrimitive(value)`.
- M_NEW1 + M_NEW2: writers and `fromState` no longer double-validate.
- L_NEW1: `commit()` reads `terminalReason` instead of hardcoding "already committed".
- L_NEW2: `Layer.clone()` no longer double-clones default.
- L_NEW3: `Layer.getState()` defensive fingerprint check removed.
- L_NEW4: `warnIfPoisoned` documented in api-reference.md.
- L_NEW5: stale test name renamed.
- L_NEW7: explicit `MAX_SAFE_INTEGER + 1` test for deserialize.
- Acknowledged residual: L_NEW6 (`as any` cast on emit dispatch), N1 (`world-internal.ts ↔ world.ts` circular import smell).

The summary report from iteration 2 is at:
- `docs/reviews/full/2026-04-26/2/REVIEW.md`

Current HEAD is `eaac9b5`. v0.7.0. 600 tests pass.

Read iter-2's REVIEW.md first. Your job:

1. **Regression / fix-quality check on the iter-2 fixes.** For each iter-2 finding (R1, H_NEW1, H_NEW2, M_NEW1, M_NEW2, L_NEW1, L_NEW2, L_NEW3, L_NEW4, L_NEW5, L_NEW7), verify the fix is correct, complete, and didn't introduce a new bug. **Pay special attention to:**
   - **R1 / `FORBIDDEN_PRECONDITION_METHODS`:** Verify (a) every method in the array exists on `World`'s public surface (no spurious entries returned), (b) every public mutating/lifecycle/listener/RNG method on `World` is in the array (no holes), (c) the property-based test actually iterates and asserts (not skipped silently), (d) the runtime proxy's `get` trap correctly checks the set on every property read.
   - **H_NEW2 / per-value primitive check:** Verify the helper `cloneIfNeeded` correctly handles `null`, `undefined`-but-`undefined`-is-rejected-by-assertJsonCompatible-anyway-so-shouldn't-reach-this-path, and all writer paths use it consistently.
   - **M_NEW1 / single-validate writers:** Verify the new `_defaultIsPrimitive` branching does not skip validation for primitive-default layers receiving object values (e.g. `Layer<unknown>` with primitive default + object write must still be JSON-validated).
   - **L_NEW3 / getState dead-check removal:** Verify there is no public path to insert a default-equal entry post-removal — `setCell`, `setAt`, `fill`, `fromState` all strip; private `cells` Map has no other writer.

2. **Fresh review.** Independently re-review the current state of `src/` for any **new** issues introduced by the iter-2 fix commit. The diff is concentrated in `command-transaction.ts` and `layer.ts`; new bugs are possible in either.

## Project context (read for grounding before reviewing)
- `AGENTS.md` and `CLAUDE.md` (root) — project rules
- `docs/architecture/ARCHITECTURE.md` — boundaries, data flow, decisions
- `docs/devlog/summary.md` and `docs/devlog/detailed/2026-04-26_2026-04-26.md`
- `docs/changelog.md` — entries for v0.6.0 → v0.7.0
- `docs/reviews/full/2026-04-26/1/REVIEW.md` — iter-1 findings (most fixed by v0.6.0–v0.6.4)
- `docs/reviews/full/2026-04-26/2/REVIEW.md` — iter-2 findings (fixed by v0.7.0)

## About the project
- TypeScript / Node.js general-purpose 2D grid-based game engine (NOT a game)
- AI-native: built to be operated by AI agents, not humans
- Strict ECS; World is the only public entry point; no rendering, no UI
- Tested with Vitest; lint with ESLint flat config; strict TypeScript
- Currently v0.7.0

## Scope (in priority order)
- `src/command-transaction.ts` — verify `FORBIDDEN_PRECONDITION_METHODS` exhaustiveness
- `src/layer.ts` — verify `cloneIfNeeded` per-value semantics, primitive fast-path correctness, single-validate paths
- `tests/command-transaction.test.ts` — verify property-based test runs against the real list
- `tests/layer.test.ts` — verify new H_NEW1 / H_NEW2 regression tests pin the right behaviour
- The rest of `src/` — full sweep for anything new

## What we specifically want flagged
1. **Regression of an iter-2 fix.** "R1 still has a hole at X" — that kind of thing.
2. **Bugs in the new code.** Wrong branching in `_defaultIsPrimitive` paths, missing validation on edge cases, off-by-one in the property-based test loop, type-cast holes.
3. **Doc drift.** Did the v0.7.0 changelog and api-reference catch every behavior change?
4. **Test coverage gaps.** Did the iter-2 fixes add tests for every claimed fix? Are the property-based tests actually exhaustive?

## Output format

Return ONLY a single Markdown document with these sections, in this order:

```
# Review Summary
<3-5 sentence high-level take>

# Iter-2 Regressions
<findings of the form: "iter-2 finding X was fixed in commit Y, but the fix is wrong/incomplete because Z". Use the iter-2 finding ID. If no regressions, write "None observed.">

# Critical
<NEW findings>

# High
<NEW findings>

# Medium
<NEW findings>

# Low / Polish
<NEW findings>

# Notes & Open Questions
<anything you weren't sure about>
```

Each finding under any section MUST follow this format:
```
### <short title>
- **File**: `src/foo.ts:123-145` (or range)
- **Problem**: <what is wrong, concretely>
- **Why it matters**: <impact in 1 sentence>
- **Suggested fix**: <concrete recommendation>
```

For Iter-2 Regressions, also include `- **Iter-2 ID**: R1 / H_NEW1 / etc.` as the first bullet.

## Rules
- Be specific. Always cite file paths and line ranges. No vague advice.
- Be honest. **Quality > quantity. If there are no issues at a severity, write "None observed."** Do not pad.
- Do NOT modify any files.
- Do NOT re-flag the deferred items (`world.ts` deeper split, occupancy-grid LOC, `as any` on emit dispatch, world-internal.ts ↔ world.ts circular import) — they are explicitly acknowledged residual.
- Skip generic advice unless tied to a specific file:line finding.
