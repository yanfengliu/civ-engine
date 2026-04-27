You are reviewing the civ-engine codebase. The repository is at the current working directory.

## Context: this is a fresh full-codebase review (2026-04-26, iteration 1)

A previous chain on 2026-04-25 ran two iterations (full review + 6 fix-review iterations) and converged with all three reviewers CLEAN at v0.5.8. Since then:
- v0.5.9 — per-system `interval` / `intervalOffset` cadence (commit `87cfe66`)
- v0.5.10 — `Layer<T>` standalone overlay-map utility (commit `e8c4915`)
- v0.5.11 — `CommandTransaction` atomic propose/commit builder (commit `745cb31`)
- 7a00376 — post-shipping doc sweep
- 33a52ae — six documentation-drift fixes (no code change)
- Several `AGENTS.md` and devlog-template tweaks (no code change)

Today's HEAD is `d7f9511` on `main`. Engine is at v0.5.11, 569 tests passing.

This is **NOT** a re-review of the prior chain — those iterations are already closed. Treat this as a fresh full review against the current state of `main`. The summary report from the latest prior iteration is at `docs/reviews/full/2026-04-25/2/REVIEW.md` for context only — do not re-flag findings that the codebase clearly addressed.

## Your job

1. **Fix-quality spot-check on the new v0.5.9–v0.5.11 features.** These three features landed after the prior review chain converged, so they have NOT been reviewed by all three CLIs together. Look hard at:
   - `src/world.ts` — per-system `interval` / `intervalOffset` scheduling (search for `interval`, `intervalOffset`, the `shouldRunSystem` predicate, MAX_SAFE_INTEGER guard, failed-tick interaction)
   - `src/layer.ts` and `tests/layer.test.ts` — defensive copies, sparse storage semantics, `fromState` validation, world-coord vs cell-coord boundaries
   - `src/command-transaction.ts` and `tests/command-transaction.test.ts` — try/finally on commit, status state machine, aliasing window for buffered values, precondition ordering, single-use guards, abort/double-commit behaviour
   Call out anything not actually fixed, fixed-but-with-a-regression, or fixed in a footgun-creating way.

2. **Fresh full-codebase review** of `src/` for any **new** issues — design flaws, bugs, edge-case failures, footguns, performance traps, broken invariants, doc drift. The codebase grew by ~3 files since the prior chain so don't artificially constrain yourself to the new files; old files may have new bugs introduced by recent integrations.

## Project context (read for grounding before reviewing)
- `AGENTS.md` and `CLAUDE.md` (root) — project rules
- `docs/architecture/ARCHITECTURE.md` — boundaries, data flow, decisions
- `docs/architecture/decisions.md` and `docs/architecture/drift-log.md`
- `docs/devlog/summary.md` — recent timeline (entries from 2026-04-25 and 2026-04-26 cover the new work)
- `docs/devlog/detailed/<latest>.md` — current detailed devlog
- `docs/changelog.md` — entries for 0.5.9 / 0.5.10 / 0.5.11
- `docs/reviews/full/2026-04-25/2/REVIEW.md` — prior chain's final summary (for context, not re-review)

## About the project
- TypeScript / Node.js general-purpose 2D grid-based game engine (NOT a game)
- AI-native: built to be operated by AI agents, not humans
- Strict ECS; World is the only public entry point; no rendering, no UI
- Tested with Vitest; lint with ESLint flat config; strict TypeScript
- Currently v0.5.11 with poison-on-tick-failure, snapshot v5, semantic diff modes, per-system interval cadence, Layer<T>, CommandTransaction

## Scope (in priority order)
- `src/world.ts`, `src/layer.ts`, `src/command-transaction.ts` — heaviest scrutiny on the new surface
- `src/index.ts` — exported public surface; verify new types/functions export correctly
- The rest of `src/` — full sweep, with extra attention on any file recently touched (use `git log 552e76e..HEAD --stat`)
- `tests/` — coverage gaps for the new behaviour
- `docs/architecture/*` and `docs/api-reference.md` — consistency vs. code

## What we specifically want flagged
1. **Bugs in the new features** — any logical, ordering, or state-machine error in interval scheduling, `Layer`, or `CommandTransaction`.
2. **Design flaws** — boundary violations, leaky abstractions, wrong responsibility allocation, problematic coupling, public API surface mistakes, missing/wrong invariants.
3. **Bugs anywhere in `src/`** — incorrect logic, edge-case failures, off-by-one, race conditions or ordering hazards in the tick pipeline, broken determinism, incorrect cleanup on entity destruction, wrong defaults, mishandled empty/zero/NaN inputs.
4. **Unclean code** — duplication, dead code, overly complex flow, inconsistent naming, unnecessary indirection, missing tests, performance traps (accidental O(n²), unbounded allocation per tick), files > 500 LOC.
5. **Documentation drift** — does the implementation match `docs/architecture/ARCHITECTURE.md` and `docs/api-reference.md`? Any stale signatures, removed APIs still mentioned, missing coverage of new APIs in canonical guides?
6. **Public API ergonomics** — footguns, awkward shapes, missing types, error-prone defaults, things an AI-agent operator would trip over.

## Output format

Return ONLY a single Markdown document with these sections, in this order:

```
# Review Summary
<3-5 sentence high-level take: how do v0.5.9–v0.5.11 hold up? overall code quality now? biggest remaining risks?>

# Critical
<findings that should block release / could cause data loss / break determinism>

# High
<findings that are clearly wrong or significant design issues>

# Medium
<real issues but lower urgency>

# Low / Polish
<nits, style, small ergonomics>

# Notes & Open Questions
<anything you weren't sure about, or that needs user clarification>
```

Each finding under any section MUST follow this format:
```
### <short title>
- **File**: `src/foo.ts:123-145` (or range)
- **Problem**: <what is wrong, concretely>
- **Why it matters**: <impact in 1 sentence>
- **Suggested fix**: <concrete recommendation, may include code sketch>
```

## Rules
- Be specific. Always cite file paths and line ranges. No vague advice.
- Be honest. If something is well-designed, don't manufacture issues. **Quality > quantity. If there are no issues at a severity, write "None observed."** Do not pad the report with nits to look thorough.
- Do NOT modify any files. This is a read-only review.
- Do NOT propose adding new features or refactors purely for "future-proofing".
- Skip generic advice ("add more tests", "improve docs") unless tied to a specific finding with file:line.
- If you are uncertain whether something is a bug vs. intended, list it under "Notes & Open Questions" with the file:line.
