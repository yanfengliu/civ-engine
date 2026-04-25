You are reviewing the civ-engine codebase. The repository is at the current working directory.

## Context: this is iteration 2

A first full review on 2026-04-25 (iteration 1) produced ~25 findings. The team has since landed fixes for all of them across roughly 11 commits, ending at HEAD `5367430` ("release: bump engine to 0.4.0").

The summary report from iteration 1 is at:
- `docs/reviews/full/2026-04-25/1/REVIEW.md`

Read it first. Your job in this iteration has two parts:

1. **Regression / fix-quality check.** For each iter-1 finding (Critical, High, Medium, Low), spot-check that the implemented fix is correct, complete, and didn't introduce a new bug. Call out any iter-1 finding that is:
   - not actually fixed
   - fixed but with a regression in adjacent behavior
   - fixed in a way that is internally inconsistent with the rest of the codebase
   - "fixed" but in a form that creates a worse footgun than the original
   Reference the iter-1 ID (e.g. C1, H3, M7) when you flag this.

2. **Fresh review.** Independently re-review the current state of `src/` for any **new** issues — design flaws, bugs, edge-case failures, footguns, performance traps, broken invariants, doc drift. Do not feel constrained to only revisit iter-1's findings; the codebase has changed substantially and may have introduced new problems anywhere.

## Project context (read for grounding before reviewing)
- `AGENTS.md` and `CLAUDE.md` (root) — project rules
- `docs/architecture/ARCHITECTURE.md` — boundaries, data flow, decisions
- `docs/architecture/decisions.md` and `docs/architecture/drift-log.md`
- `docs/devlog/summary.md` — recent timeline
- `docs/devlog/detailed/*` — most recent file for current state
- `docs/changelog.md` — version 0.4.0 release notes summarize fixes from iter-1

## About the project
- TypeScript / Node.js general-purpose 2D grid-based game engine (NOT a game)
- AI-native: built to be operated by AI agents, not humans
- Strict ECS; World is the only public entry point; no rendering, no UI
- Tested with Vitest; lint with ESLint flat config; strict TypeScript
- Currently at v0.4.0 with a poison-on-tick-failure model, snapshot v5, semantic diff modes, etc.

## Scope (in priority order)
- `src/` — every file, but pay particular attention to anything touched in commits since `552e76e` (the iter-1 baseline). Use `git log 552e76e..HEAD --stat` to identify them.
- Test directories — `tests/` and `src/**/*.test.ts` for behavior coverage gaps in the new fixes
- `docs/architecture/*` — for consistency vs. code

## What we specifically want flagged
1. **Regression of an iter-1 fix.** "C1 was supposed to skip stringify in strict mode; line X still calls it." That kind of thing.
2. **Design flaws** — boundary violations, leaky abstractions, wrong responsibility allocation, problematic coupling, public API surface mistakes, missing/wrong invariants.
3. **Bugs** — incorrect logic, edge-case failures, off-by-one, race conditions or ordering hazards in the tick pipeline, broken determinism, incorrect cleanup on entity destruction, wrong defaults, mishandled empty/zero/NaN inputs.
4. **Unclean code** — duplication, dead code, overly complex flow, inconsistent naming, unnecessary indirection, missing tests, performance traps (accidental O(n²), unbounded allocation per tick).
5. **Documentation drift** — does the implementation match `docs/architecture/ARCHITECTURE.md`? Any silent boundary violations?
6. **Public API ergonomics** — footguns, awkward shapes, missing types, error-prone defaults, things an AI-agent operator would trip over.

## Output format

Return ONLY a single Markdown document with these sections, in this order:

```
# Review Summary
<3-5 sentence high-level take: did the iter-1 fixes hold up? overall code quality now? biggest remaining risks?>

# Iter-1 Regressions
<findings of the form: "iter-1 finding X was fixed in commit Y, but the fix is wrong/incomplete because Z". Use the iter-1 finding ID. If no regressions, write "None observed.">

# Critical
<NEW findings that should block release / could cause data loss / break determinism>

# High
<NEW findings that are clearly wrong or significant design issues>

# Medium
<NEW real issues but lower urgency>

# Low / Polish
<NEW nits, style, small ergonomics>

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

For Iter-1 Regressions, also include `- **Iter-1 ID**: C1 / H3 / M7 / etc.` as the first bullet.

## Rules
- Be specific. Always cite file paths and line ranges. No vague advice.
- Be honest. If something is well-designed, don't manufacture issues. Quality > quantity.
- Do NOT modify any files. This is a read-only review.
- Do NOT propose adding new features or refactors purely for "future-proofing".
- Skip generic advice ("add more tests", "improve docs") unless tied to a specific finding with file:line.
- If you are uncertain whether something is a bug vs. intended, list it under "Notes & Open Questions" with the file:line.
- Do NOT re-flag iter-1 findings that have been correctly fixed. Only mention them under "Iter-1 Regressions" if the fix is broken.
