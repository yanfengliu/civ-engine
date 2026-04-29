# Thread Archive Migration Review - Iteration 3

## Verdict

REVISE. Previous fixes held, but reviewers found one active-thread state mismatch and one missed historical path note.

## Codex

- Medium: `docs/README.md` said there were no active threads while this migration thread still lived under `docs/threads/current/`. Fixed by closing the migration thread into `docs/threads/done/` before final review.

## Claude

- Verified iteration-1 and iteration-2 fixes, then flagged stale behavioral-metrics historical review prose that still taught obsolete task/raw-style destinations. Fixed by rewriting that critique as prose and pointing the resolved layout at the current summary-only thread convention.

## Verification After Fixes

- The migration thread was moved from `current` to `done` for the final archive shape.
- Stale thread policy audit remains clean outside this historical review summary after the behavioral-metrics rewrite.
