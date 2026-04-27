# Spec 3 — Design iter-10: CONVERGED

**Iter:** 10. **Subject:** v10 (commit 07859ef). **Reviewers:** Opus ACCEPT; Codex ACCEPT.

Both reviewers approve. Design phase complete after 10 iterations.

## Convergence trajectory

| Iter | Codex | Opus | Findings closed |
|------|-------|------|-----------------|
| 1 | REJECT (4 BLOCKER/HIGH + 2 MED) | REJECT (1 BLOCKER + 2 HIGH + 5 MED + 6 LOW/NIT) | Determinism story, sourceKind mutation, policy-throw category error, generics, etc. |
| 2 | 2 HIGH + 1 MED | NOT ACCEPT (1 BLOCKER + 1 HIGH + 2 MED) | Default seed=0, ADR 6 over-claim, sinkError control flow |
| 3 | 2 HIGH + 1 MED | ACCEPT (1 LOW + 2 NIT) | connect-time toBundle, missing TComponents/TState, ticksRun |
| 4 | 2 MED | ACCEPT-ish (1 MED + 3 NIT) | ticksRun docstring, sourceKind c→b bump, vacuous selfCheck |
| 5 | 3 MED + 2 NIT | ACCEPT | leftover c-bump, incomplete vacuous-segment guard, policy submission model |
| 6 | 2 MED | ACCEPT (2 NIT) | stopOnPoisoned undefined, pre-step abort vacuous selfCheck |
| 7 | 1 MED + 1 LOW | ACCEPT (3 NIT) | selfCheck overclaim on poisoned, stale stopOnPoisoned ref |
| 8 | 1 MED | ACCEPT | RecordedCommand.sequence vs submissionSequence schema name |
| 9 | 1 MED | ACCEPT | Off-by-one between PolicyContext.tick and submissionTick for scripted policy |
| **10** | **ACCEPT** | **ACCEPT** | — |

## Key architectural decisions captured (v10)

- ADR 1: Policy is a function, not a class hierarchy.
- ADR 2: Read-only world, mutation via returned commands.
- ADR 3: SessionMetadata.sourceKind extended (b-bump because of assertNever break).
- ADR 3a: SessionRecorderConfig.sourceKind set at construction (no post-hoc mutation).
- ADR 4: Synchronous, single-process harness.
- ADR 5: Sub-RNG for policy randomness with literal seed expression `Math.floor(world.random() * 0x1_0000_0000)`.
- ADR 6: Composed policies don't observe each other within a tick.

## Versioning plan

- T1: v0.7.20 (c-bump, additive). Policy types + built-in policies.
- T2: v0.8.0 (b-bump, sourceKind union widening). runSynthPlaytest harness.
- T3: v0.8.1 (c-bump, additive). Determinism integration tests + arch docs.

## Next: implementation plan

Per AGENTS.md, write `docs/design/2026-04-27-synthetic-playtest-implementation-plan.md`; multi-CLI review on the plan; iterate to convergence; then implement T1/T2/T3 with TDD per AGENTS.md.
