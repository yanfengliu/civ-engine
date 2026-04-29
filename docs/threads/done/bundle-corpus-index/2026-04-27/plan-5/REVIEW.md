# Spec 7 Bundle Corpus Index Plan Review - Iteration 5

**Scope:** v5 implementation plan and verification against the plan-4 review finding.

**Verdict:** Rejected. Codex-2 and Opus accepted, but Codex-1 found one remaining wording gap in the code-review re-review prompt template.

## Reviewer Summaries

- Codex summary
- Codex-2 summary
- Opus summary

Claude was reachable and returned `ACCEPT`.

## Finding

### High - Re-review template includes only `<N-1>/REVIEW.md`, not all prior review syntheses

Codex-1 found that the v5 prose says to include prior review context, but the concrete prompt header lists only `docs/threads/done/bundle-corpus-index-task-1/2026-04-27/<N-1>/REVIEW.md`. For iteration 3, that could omit iteration 1 findings.

**Action:** Update the template to require `docs/threads/done/bundle-corpus-index-task-1/2026-04-27/1/REVIEW.md` through `docs/threads/done/bundle-corpus-index-task-1/2026-04-27/<N-1>/REVIEW.md`.

## Accepted Coverage

The Opus tie-breaker path is present and accepted by reviewers. All prior plan-1 through plan-4 product, API, TDD, docs, and process findings remain addressed.
