# Mandatory loop defaults (engine 2.0.0 + fleet)

Owner directive (2026-07-08): the proper recursive loop must be the mandatory behavior, not a set of optional flags — in the engine and in every repo that runs the loop.

## What "proper loop" means, and what flips

Two of the loop's honesty invariants were opt-in engine config; they become defaults in 2.0.0:

1. **Hidden-state wall at the agent boundary.** `agentObservation` defaults to `'redacted'`: `decide()` receives `observationForAgent(observation, promptMode)` and an audience-filtered agent-facing trace. Explicit `'raw'` opts out. The `result.trace` debugging/replay channel stays under `traceObservation` (the owner's original spec wants full internal access for debugging — that channel is not the agent's eyes).
2. **Strict verification evidence.** `assertImprovementFinding` defaults `requireVerificationEvidence: true`: a `verified` finding needs an addressed replayable evidence ref + `verificationMethod` at every construction, recording, and validation point. `{ requireVerificationEvidence: false }` remains only for reading pre-2.0 historical payloads; `improvementFindingsFromMarkers` reads leniently by design (writes strict, reads lenient).

Not flipped, deliberately: budgets / `signal` / `onActionFailure` are operational tuning, not honesty invariants (`maxSteps` already bounds every run mandatorily); `traceObservation` already defaults `'redacted'` for safe traces and governs the reviewer artifact, not the agent boundary.

## Fleet consequences

- farm and townscaper never opted into the wall — the flip closes a live gap in both; city/aoe2 already complied explicitly.
- aoe2's pass script gets the same treatment at the orchestration level: the full loop (propose → apply+gate on a branch → rerun → prove; never auto-merge) becomes the default pass, `--propose-only` the opt-out, and episodic memory (`--known-findings`) defaults to the accumulated ledger when present.
- The fleet invariant line changes from "proposal-only is the default autonomy" to "the full loop is the default; autonomy stays bounded by branch isolation, repo gates, and no auto-merge". Where no automated fix arm exists (farm/city/townscaper), the driving agent remains the mandatory fix arm ("a pass is not done at proposal-only", shipped 2026-07-08 across skill + repo docs).

## Non-goals

No API removals or signature changes; no auto-merge anywhere; no default budgets (arbitrary numbers would be false precision); no forcing an automated `--apply` arm onto repos that don't have one.
