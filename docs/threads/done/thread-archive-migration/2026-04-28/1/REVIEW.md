# Thread Archive Migration Review - Iteration 1

## Verdict

REVISE. Both reviewers agreed the thread tree shape was correct, but they found stale path references and an encoding regression that needed cleanup before commit.

## Codex

- Medium: `docs/design/2026-04-27-synthetic-playtest-implementation-plan.md` still pointed a final checklist at the old synthetic-playtest task brace pattern even though the migrated objective folders use `synthetic-playtest-task-1`, `synthetic-playtest-task-2`, and `synthetic-playtest-task-3`. Fixed by updating the checklist to the real folder names.
- Medium: historical summaries in `docs/threads/done/session-recording-plan/2026-04-27/1/REVIEW.md` and `docs/threads/done/expert-review-remaining/2026-04-11/1/REVIEW.md` still described invalid in-tree capture or old todo locations. Fixed by rewriting those notes to preserve history without teaching nonexistent thread destinations.
- Low: design status lines used brace-expansion pseudo-paths such as `design-{1,2,3,4}` and `plan-{1..6}`. Fixed by rewriting them as prose that points at real per-iteration folders.

## Claude

- Medium: 23 modified text files had UTF-8 BOMs from an earlier PowerShell write path. Fixed by rewriting BOM-bearing files as UTF-8 without BOM.
- Medium: same stale synthetic-playtest task checklist noted by Codex. Fixed as above.

## Verification After Fixes

- BOM audit: no BOM-bearing source or documentation files found outside ignored temp paths.
- Stale thread policy audit: no `raw`/prompt/diff artifact references remain outside ignored temp paths.
- Structure audit: `docs/threads` contains only `current` and `done`; committed iteration folders contain only `REVIEW.md`.
