# benchmark-gate — design review iteration 1

**Artifact:** DESIGN.md v1 (piped to all three reviewers as text). **Reviewers:** Codex `gpt-5.5` xhigh (file tools), Gemini `gemini-3.1-pro-preview` plan-mode (text-only), Claude `claude-fable-5[1m]` max (file tools).

## Verdicts

- **Gemini:** APPROVED all five review questions (counter determinism, two-tier semantics, churn scenario, scope, renderMarkdown bug).
- **Codex:** NOT APPROVED — 1 HIGH + 2 MEDIUM.
- **Claude:** conditional — 1 HIGH + 1 MEDIUM + implementation cautions; "fix those two and this is approved". Verified the counter-determinism chain end-to-end (no Math.random/Date.now/transcendentals in src; integer mulberry32 RNG; count-based path budgets; integer-only scenario data; spec-pinned JSON ordering).

## Findings → dispositions (all adopted in DESIGN v2)

| # | Sev | Reviewer(s) | Finding | v2 disposition |
|---|-----|-------------|---------|----------------|
| 1 | HIGH | Codex + Claude (convergent) | Churn projectiles (position+marker only) match no populated cached query shape — `insertSorted`/`indexOf`+`splice` only run on mask-match transitions, so the scenario would measure spawn bookkeeping, not the cached-array maintenance wall. | Projectiles now carry `position`+`velocity`+`projectile`; cached shapes pinned to an exact list of 8 including bare `position` and `position`+`projectile` — every spawn/destroy splices three populated arrays (incl. the ~4k movement array; LIFO id recycling makes destroys near-full `indexOf` scans). |
| 2 | MEDIUM | Claude | Membership maintenance had no operation counter — the wall was tier-2-only, so a 2× maintenance regression (or a future fix) would be invisible to the exact gate. | New additive engine metric `WorldMetrics.query.membershipChecks` (incremented per cache entry examined in `updateQueryCacheMembership`); gated tier-1. |
| 3 | MEDIUM | Codex | Gate `query.calls` and `query.results` (results catches membership-cardinality drift hits/misses cannot see). | Added to tier-1 counters; occupancy counters added too (Claude Q4). |
| 4 | MEDIUM | Codex | File-split plan insufficient — 427-line script cannot absorb churn + flags + fixes within budget. | Comparison/calibration/baseline-IO/markdown renderer all move to `scripts/benchmark-gate.mjs`. |
| 5 | LOW | Codex + Claude (convergent) | renderMarkdown bug is worse than designed: `--format markdown` throws TypeError (property read on undefined), it does not print "undefined". | Problem statement corrected; markdown smoke test required (renderer in the unit-testable module). |
| 6 | NOTES | Claude | Implementation cautions: consume the calibration checksum (V8 DCE); assert the 3 in-process runs produce identical counters (free determinism self-check); define `--check`×`--stress` (refuse) and exact-scenario-set comparison; store raw unrounded counter sums; `benchmark:check`/`update-baseline` npm scripts must chain `npm run build`; state tier-1's determinism invariants for future scenario authors; GC/allocator + TurboFan caveats on the time ratio. | All written into v2 §§1, 3, 4, 5. |

## Disposition

**Conditional approvals with exact prescriptions; every prescription adopted verbatim in DESIGN v2.** A design-2 confirmation round verifies v2 before implementation review; implementation of the review-stable parts (comparison library TDD, engine metric TDD) proceeds in parallel with that confirmation.
