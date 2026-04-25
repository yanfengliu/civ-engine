You are reviewing the civ-engine codebase. The repository is at the current working directory.

Project context (read these for grounding before reviewing):
- AGENTS.md and CLAUDE.md (root) — project rules
- docs/architecture/ARCHITECTURE.md — boundaries, data flow, decisions
- docs/architecture/decisions.md and docs/architecture/drift-log.md
- docs/devlog/summary.md — recent timeline
- docs/devlog/detailed/* — most recent file for current state

About the project:
- TypeScript / Node.js general-purpose 2D grid-based game engine (NOT a game)
- AI-native: built to be operated by AI agents, not humans
- Strict ECS; World is the only public entry point; no rendering, no UI
- Tested with Vitest; lint with ESLint flat config; strict TypeScript

Your job: thoroughly review the codebase for design flaws, bugs, and unclean code.

Specifically look for:
1. **Design flaws** — boundary violations, leaky abstractions, wrong responsibility allocation, problematic coupling between subsystems, public API surface mistakes, missing or wrong invariants.
2. **Bugs** — incorrect logic, edge-case failures, off-by-one errors, race conditions or ordering hazards in the tick pipeline, broken determinism, incorrect cleanup on entity destruction, wrong defaults, mishandled empty/zero/NaN inputs.
3. **Unclean code** — duplication, dead code, overly complex flow that could be simpler, inconsistent naming, unnecessary indirection, missing tests for non-trivial logic, over-engineered or under-tested areas, performance traps (accidental O(n^2), unbounded allocation per tick).
4. **Documentation drift** — does the implementation actually match docs/architecture/ARCHITECTURE.md? Any silent boundary violations?
5. **Public API ergonomics** — footguns, awkward shapes, missing types, error-prone defaults, things an AI agent operator would trip over.

Scope (in priority order):
- src/ — every file
- tests under src/**/*.test.ts and tests/ — for behavior coverage gaps
- docs/architecture/* — for consistency vs. code

Output format — return ONLY a single Markdown document with these sections, in this order:

```
# Review Summary
<3-5 sentence high-level take: overall code quality, biggest risks, biggest wins>

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

Each finding under Critical/High/Medium/Low MUST follow this format:
```
### <short title>
- **File**: `src/foo.ts:123-145` (or range)
- **Problem**: <what is wrong, concretely>
- **Why it matters**: <impact in 1 sentence>
- **Suggested fix**: <concrete recommendation, may include code sketch>
```

Rules:
- Be specific. Always cite file paths and line ranges. No vague advice.
- Be honest. If something is well-designed, don't manufacture issues. Quality > quantity.
- Do NOT modify any files. This is a read-only review.
- Do NOT propose adding new features or refactors purely for "future-proofing".
- Skip generic advice ("add more tests", "improve docs") unless tied to a specific finding with a file:line.
- If you are uncertain whether something is a bug vs. intended, list it under "Notes & Open Questions" with the file:line.
