# Thread Design Relocation Review - Iteration 1

## Scope

Reviewed the v0.8.5 diff that moves thread-specific design and implementation plans to `DESIGN.md` / `PLAN.md` at thread roots, updates live references and process docs, and extends the thread-structure regression test.

## Codex

- **MED:** `tests/docs-threads.test.ts` required thread-root docs through a fixed four-thread list, so a future thread with `design-N` or `plan-N` review iterations could miss `DESIGN.md` / `PLAN.md`. Fixed by deriving requirements from observed design/plan review folders and mapping the grandfathered split session-recording review threads to the parent objective.
- **MED:** the forbidden-artifact test did not reject common `.txt` captures such as `stdout.txt`, `stderr.txt`, `error.txt`, `prompt.txt`, or `diff.txt`. Fixed by adding exact `.txt` and reviewer-output basename bans.
- **LOW:** `docs/threads/done/bundle-corpus-index/PLAN.md` had a mechanically invalid `docs/design/docs/threads/...` path. Fixed by replacing it with the thread-root paths.

## Claude

- **MED:** the detailed devlog entry for v0.8.5 was missing. Fixed by appending the thread design relocation entry with reviewer comments, result, reasoning, validation, and notes.
- **NIT:** the AI-first roadmap status table linked the session-recording `DESIGN.md` without the sibling `PLAN.md`. Fixed by adding the `PLAN.md` link.

## Result

Real findings were addressed. A second review iteration should verify the fixes and close the thread if reviewers accept.
