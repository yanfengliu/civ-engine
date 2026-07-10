---
name: multi-cli-review
description: Use when running the multi-CLI (Codex + Claude) adversarial code review on high-risk changes or full-codebase audits — routes to the fleet-canonical runbook (pins, commands, output extraction, failure modes) plus civ-engine-specific notes.
---

# Multi-CLI review — civ-engine stub

**Read the fleet-canonical runbook now:** `../loop-ops/docs/skills/multi-cli-review.md` — current review model pins (the fleet's single bump site), exact CLI commands, `-o` output extraction, Windows gotchas, and failure modes. Do not act from memory of an older per-repo copy of this skill.

civ-engine-specific notes:

- Reviewer pin sites in scripts: NONE (verified 2026-07-10 — `git grep` for reviewer model strings across `scripts/`, `tests/`, and `src/` finds no hard-coded reviewer pins).
- App-facing pin disclaimer: the `claude-fable-5` string in `tests/improvement-loop.test.ts` is an app-facing improvement-loop contract fixture (a sample `ImprovementRunManifest.model` value in the run-manifest lifecycle test), not a reviewer pin — never touch it on a review-pin bump.
- Doc-accuracy addendum: this repo defines one — every review prompt must include the addendum quoted in AGENTS.md → Documentation → Discipline → Verification step ("verify docs in the diff match implementation; flag any stale signatures, removed APIs still mentioned, missing coverage of new APIs in canonical guides, or thread design/plan docs that are missing from the objective root").
- Capture convention: no override — the canonical default `tmp/review-runs/<objective>/<date>/<iteration_number>/` applies (committed in AGENTS.md → Team of subagents); synthesized summaries land in `docs/threads/current/<objective>/<date>/<iteration_number>/REVIEW.md` per AGENTS.md → Code review.
