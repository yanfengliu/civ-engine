# player-observation — implementation review, iteration 1

**Reviewed:** full v0.8.20 working-tree diff (player-observer.ts + prerequisites + 23 tests + docs). **Reviewers:** Gemini (3.1-pro plan, codebase-grounded). Codex hit its usage quota mid-batch (exhausted until 2026-07-10) and the Claude CLI hit its session limit — per the AGENTS.md unreachable-CLI protocol, the iteration proceeds on the remaining reviewer and iteration 2 runs two independent instances of the available CLI with distinct lenses.

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Gemini | 1 HIGH-class correctness bug + 1 coverage gap + 1 minor | generation identity |
| Codex | — quota-exhausted | n/a |
| Claude CLI | — session-limited | n/a |

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Gemini 1 | HIGH | **Generation-correctness bug:** transition logic compared bare `EntityId`s (`prev.has(id)` / `visible.has(id)`), so a visible entity dying and a new entity recycling its id IN THE SAME TICK read as one continuing entity — no `exited`, no `entered`, and an `updated` entry carrying the stale ref. The exact failure class the design's own EntityRef-identity decision exists to prevent | FIXED — `continuing(id)` now requires `prev.ref.generation === getEntityRef(id).generation` (current refs collected once per observeTick); entered/exited/updated all route through it |
| Gemini 2 | MEDIUM | No test pinned the recycled-id boundary | FIXED — regression test destroys a visible entity and recycles its id in-view same tick; asserts `exited` carries the OLD generation (reason destroyed), `entered` carries the NEW generation with full data, `updated` empty, plus the `recycled === victim` precondition |
| Gemini 3 | minor | `prime()` set `lastObservedTick` redundantly (primeFrom already does) | FIXED — duplicate line removed |

## Disposition

Fix landed; full gates re-green (1175 passed + 2 todo). Iteration 2 = confirmation round on the fix via two independent Gemini instances (adversarial-correctness lens + design/docs-conformance lens).
