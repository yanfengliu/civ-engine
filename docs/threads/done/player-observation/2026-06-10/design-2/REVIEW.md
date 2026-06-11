# player-observation — design review, iteration 2 (confirmation round)

**Reviewed:** DESIGN.md v2. **Reviewers:** Codex (gpt-5.5 xhigh), Gemini (3.1-pro plan), Claude (fable-5 1m max).

## Verdicts

| Reviewer | Verdict | Substantive findings |
|---|---|---|
| Codex | NOT CONVERGED | 1 HIGH, 2 MEDIUM |
| Gemini | CONVERGED | none |
| Claude | NOT CONVERGED | 1 MEDIUM (same gap as Codex HIGH), 3 LOW, 5 nits |

All seven design-1 treatments verified adopted (EntityRef identity, four surfaces + removals, honest destroyed-vs-fog attribution — Claude verified implementability down to ComponentStore dirty-set mechanics — lifecycle, safe defaults, getStateKeys prerequisite, ordering/determinism). Codex confirmed the attribution rule implementable from `TickDiff.entities.destroyed` + previous visible set + `lastKnownPosition`.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Codex 1 / Claude M1 | HIGH | `ObservedEntity.meta` full-map not populatable via public APIs — `getMeta` is per-key, diff only covers changed-this-tick; entering entities need full current meta | FIXED in v3 — second additive prerequisite `World.getMetaEntries(entity): Record<string, string \| number>`, same justification as getStateKeys |
| Codex 2 | MEDIUM | Isolation clause covers components only; `getState` returns live references — worldState payloads must be cloned too | FIXED in v3 — all observation payloads deep-cloned, explicitly including worldState values |
| Codex 3 | MEDIUM | Tick-gap detection misses poisoned worlds: listener-phase failures leave the diff intact so a failed tick can look sequential | FIXED in v3 — observeTick() throws `player_observer_world_poisoned` when `world.isPoisoned()` |
| Claude L1 / Codex note | LOW | Mechanics wording "read from the diff's last position" contradicts the adopted rule (diff carries no destroyed positions) | FIXED in v3 — "observer's stored last-known position" |
| Claude L2 | LOW | applySnapshot landing on the expected tick evades gap detection | FIXED in v3 — reset() is the contract; detection documented as backstop only |
| Claude L3 | LOW | Construction-time priming unspecified | FIXED in v3 — construction ≡ implicit reset() (primes immediately) |
| Claude nit a | — | `VisibilityMap.isVisible` throws on out-of-grid coords; event resolvers may pass arbitrary payload coords | FIXED in v3 — observer's bound `isVisible(x, y)` returns false out-of-grid instead of throwing |
| Claude nits b–d | — | EngineError now unconditional; `grid.getAt(x, y)` wording; intersection against alive new-visible set | FIXED in v3 |
| Claude nit e | — | Test plan: position-component removal while visible | ADDED to test plan in v3 |

## Disposition

One substantive convergent gap (meta prerequisite) + two real MEDIUMs, all surgically fixable; Claude: "one more pass should be a formality." DESIGN.md v3 applies every item; design-3 confirmation round runs before implementation (HIGH-bearing iterations always get a confirmation pass).
