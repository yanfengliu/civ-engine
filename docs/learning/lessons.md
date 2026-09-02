# Lessons

A queue, not an index. Read at session start; it is short by construction, and empty is the goal state.

An entry lands the session its lesson is learned, and is deleted in the commit that lands the gate retiring it. Every rule here therefore carries three things: the one-line claim, a link into [lessons-evidence.md](lessons-evidence.md) for the war story and its anchor, and `(gate: …)` naming the test, lint rule, schema check, or fixed command that will retire it.

A rule that can name no gate is not a lesson. Fleet-wide knowledge is staged in [canon-candidates.md](canon-candidates.md) for the constitution; repo-only knowledge goes to `docs/policies/local-rules.md`; a claim about a reviewer CLI or a review workflow goes to [skill-candidates.md](skill-candidates.md); the rest is folklore and is dropped.

A gate counts only once it has been made to go red by reintroducing the defect — at the call site, and across the full range the defect lives in. The proofs are recorded in [gate-proofs.md](gate-proofs.md), which stays.

`docs/learning/defect-register.md` is a different thing and is not a queue: its entries stay after they become gates, because the register is the standing list of what the gates could not see.

The pairing is enforced by `tests/lessons-pairing.test.ts` (run by `npm test`, so by `npm run gates` and CI) and reproducible standalone with `npm run lessons:check`: a rule always has an entry, an entry always has a rule, every link resolves, and every rule names its gate.

## Rules
