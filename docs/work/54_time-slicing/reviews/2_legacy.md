# time-slicing — design review, iteration 2 (confirmation round)

**Reviewed:** DESIGN.md v2. **Reviewers:** Gemini (3.1-pro plan), Claude (fable-5 1m max); Codex hit its usage quota mid-review (output truncated by the provider; exhausted until 2026-07-10) — per the AGENTS.md unreachable-CLI protocol, two converging codebase-grounded reviews carry the round.

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Gemini | CONVERGED | none — all four design-1 adoptions verified against live code |
| Claude | CONVERGED | 1 LOW factual correction (one parenthetical), 1 guide-corner note |
| Codex | quota-exhausted mid-run | n/a |

Verified by both: Rule 4 + snapshot-anchoring rationale (openAt/forkAt/selfCheck reconstruct from nearest snapshots via worldFactory — closure state genuinely starts at factory-initial values per segment); determinism-contract item count (9 today, Rule-4 item appends as #10 preserving Rule 3's cross-reference numbering); PathRequestQueue caveat (private pending/head/nextId, no getState/fromState, count-validated FIFO drain); primitive respec; Rule-3 contract citations verbatim.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Claude 4 | LOW | Candidate-table parenthetical misattributed the class-in-component guard: `setComponent` performs NO JSON validation; the real guard is `serialize()`'s `assertJsonCompatible`, which THROWS `json_incompatible` (loud at first snapshot) rather than rejecting at write time or silently stripping. The guide would have taught the wrong error model | FIXED in v3 — parenthetical replaced with the verified mechanism (class instance survives at runtime, breaks loudly the moment recording connects) |
| Claude 3 note | — | `nextId` never resets (`clearPending` resets only pending/head), so same-tick-drain replay safety holds only if returned request ids don't escape into state/events | FIXED in v3 — caveat clause added; Rule 4's next-id enumeration already covered the principle |

## Disposition

CONVERGED at v3 (both available reviewers; the remaining deltas were single-clause text accuracy). Proceed to doc deliverables: guide section, determinism-contract item #10, roadmap entry.
