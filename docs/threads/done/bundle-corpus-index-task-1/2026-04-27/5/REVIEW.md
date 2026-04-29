# Spec 7 T1 Code Review Iteration 5

Status: REJECTED - Codex accepted, but Codex-2 found real issues. Claude/Opus was unreachable due quota exhaustion (`You've hit your limit · resets 7pm (America/Los_Angeles)`).

## Findings

### H1. Query-shape validation still accepted non-plain objects (Codex-2)

`assertQueryRecord()` rejected primitives, `null`, and arrays, but accepted any object. That allowed malformed values such as `new Date()` as the top-level query, numeric range, or `recordedAt` range. Those objects have no relevant fields, so they silently widened filters instead of throwing documented `CorpusIndexError` code `query_invalid`.

Resolution: Pending in iteration 6. Add tests for non-plain query/range/recordedAt objects and require query records to be plain objects or null-prototype records.

### M1. Devlog process state was inconsistent (Codex-2)

The summary said the feature was recorded "after review fixes" while the detailed devlog still said final re-review remained required before commit.

Resolution: Pending in iteration 6. Remove the ambiguous summary phrasing and update the detailed entry with iteration 5 status; finalize it after convergence.

## Notes

- Codex-1 returned `ACCEPT`.
- Claude/Opus remains quota-blocked.
