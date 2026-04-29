# Spec 7 T1 Code Review Iteration 8

Status: REJECTED - Codex-1 accepted; Codex-2 verified the unknown-key query fix and found only a process-doc completeness issue. Claude/Opus was unreachable due quota exhaustion (`You've hit your limit · resets 7pm (America/Los_Angeles)`).

## Findings

### M1. Detailed devlog was tied to iteration 7 while iteration 8 was reviewing the diff (Codex-2)

The code/API/test/docs change itself was accepted, but the detailed devlog result said all findings "through iteration 7" were addressed while the staged diff was under iteration 8 review. That would leave the committed devlog incomplete about the final convergence pass.

Resolution: Replace brittle pending/current review phrasing with durable wording that points at the committed per-iteration review artifacts and records that all real review findings were addressed.

## Accepted Checks

- Codex-1 returned `ACCEPT`.
- Codex-2 verified unknown top-level query keys, unknown number-range keys, unknown `policySeed` range keys, and unknown `recordedAt` keys now throw `query_invalid` with regression coverage.
