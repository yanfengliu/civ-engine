# Spec 7 T1 Code Review Iteration 7

Status: REJECTED - Codex-1 accepted, Codex-2 found one real query-shape gap. Claude/Opus was unreachable due quota exhaustion (`You've hit your limit · resets 7pm (America/Los_Angeles)`).

## Findings

### H1. Plain object ranges with unknown keys silently widened filters (Codex-2)

`assertNumberRange()` and `normalizeRecordedAt()` accepted arbitrary plain objects. Values such as `{ durationTicks: { foo: 1 } }`, `{ policySeed: { foo: 1 } }`, and `{ recordedAt: { foo: 'bar' } }` therefore behaved like unbounded filters instead of throwing `CorpusIndexError` code `query_invalid`. That contradicted the documented malformed-query contract.

Resolution: Pending in iteration 8. Add unknown-key validation for number/ISO range objects and regression tests for those JavaScript caller shapes.

## Accepted Checks

- Codex-1 accepted the final devlog wording and verified the non-plain object query fix.
- Claude/Opus remains quota-blocked.
