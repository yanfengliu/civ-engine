# time-slicing — design review, iteration 1

**Reviewed:** DESIGN.md v1 (design-only objective; implementation demand-gated). **Reviewers:** Codex (gpt-5.5 xhigh), Gemini (3.1-pro plan), Claude (fable-5 1m max).

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Codex | MED (one missing rule) | Rule 4 needed |
| Gemini | CONVERGED (with the same Rule 4 called "critical") | Rule 4 needed |
| Claude | NOT CONVERGED | Same Rule 4 (MAJOR) + exemplar caveat (IMPORTANT) + AmortizedQueue shape + cross-refs |

All three reviewers independently verified the three v1 rules correct and necessary (count budgets — wall-clock would violate the tested determinism clause; deterministic drain order; adaptive budgets through the command stream — replay re-submits commands in sequence order so budget changes replay exactly). All codebase claims verified accurate; Gemini and Claude both endorsed demand-gating the primitive.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| ALL-1 (convergent) | MAJOR | **Missing Rule 4: sliced-work state is simulation state.** All three rules can be satisfied while holding the pending queue or adapted budget in a system closure — `openAt`/`forkAt`/`selfCheck` reconstruct from snapshots, so closure state silently starts empty on every snapshot-anchored segment. The recorded determinism contract's nine items never state this obligation; deferred work is exactly where closure state is most tempting | FIXED in v2 — Rule 4 added (pending items, cursors, next-ids, outcome-affecting caches, and active budget values must live in components/state/resources or in a primitive with explicit getState/fromState persisted there; caches that only change CPU cost are exempt — the crisp boundary is "changes when effects land = state"). Session-recording guide determinism contract gains the matching item (engine-wide gap this objective surfaced) |
| Claude 2 | IMPORTANT | `PathRequestQueue` cited as reference implementation is itself not snapshot-safe (private pending/head/nextId, no getState/fromState) — the guide would teach a pattern whose own exemplar breaks replay | FIXED in v2 — exemplar caveat: PathRequestQueue is replay-safe only when filled and drained within one tick, or when pending-across-ticks work is mirrored in world state and the queue rebuilt from it |
| Claude 3 | judgment | AmortizedQueue as a serializable *class* is subtly wrong for this engine's storage model (setComponent JSON validation + structuredClone strips prototypes); plain array in a component is already automatically serialized/diffed/selfCheck-compared | ADOPTED in v2 — primitive respecced as plain-data state + pure functions (or Layer-pattern getState/fromState), still demand-gated; "~80% achievable with a plain array" framing kept |
| Claude 4 | MINOR | Rule 3 should cross-reference determinism-contract items 1–2 and 5 (it is an application of the recorded contract, not new doctrine); Rule 2 "pure function of enqueue order" → "of queue contents" | FIXED in v2 |

## Disposition

DESIGN v2 applies all items; design-2 confirmation round follows.
