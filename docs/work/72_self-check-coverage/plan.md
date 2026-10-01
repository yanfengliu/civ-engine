# Report self-check comparison coverage

Status: active
Owner: Codex engine-feedback worker
Created: 2026-10-01
Updated: 2026-10-01

## Problem and outcome

SessionReplayer.selfCheck can return ok true after checking only snapshot-bounded segments, leaving an unanchored recorded tail or making no comparison at all. E22 in work 71 requires explicit coverage without changing ok's divergence meaning.

## Scope

Base a839ad5e5b435f36e7494b86ff63606573a10e47, engine 2.4.2. M0 is merged/pushed and remote CI36805053671 Node20/22/24 plus publish-dist passed. Its verified tarball SHA25642b038eaf48686ff090e978875806fc6219c22163c9d40e4123f41e33e207f5f is adopted by the game. This milestone changes self-check reporting, bounded snapshot selection and existing continuity enforcement only. No bundle/persistence fields, unanchored-tail replay, runner hooks, game code or new runtime dependency. Root owns the shared heavy slot; only this milestone's small tests run while gameverify is active. All writes/builds use the private engine-feedback-1001 worktree and private dependency tree.

## Approach

Root accepted the exact work-71 design.md contract, recoverable at a839ad5, including optional-on-type/always-returned coverage, enabled-comparison-relative completeness, explicit stateComparisonTicks and did-not-run reasons. Snapshot endpoints outside the existing metadata replay horizon are excluded without reticking snapshots; missing tick entries use the existing BundleIntegrityError guard before replay. Internal reporting is separated from replay lifecycle to respect the 500-line source cap. Existing ok, checkedSegments, divergences, skipped failure ranges and exception semantics remain.

## Acceptance criteria

- Literal tests distinguish clean complete checks, unchecked tail, zero segments, no payloads, empty horizon, all flags disabled and selected checks.
- Failure at a segment endpoint is skipped; failure at its start belongs to the previous segment. All-skipped and early-stop outcomes remain incomplete.
- Coverage pins complete legacy max(endTick,persistedEndTick), incomplete persisted cap and nonzero start; no world is built beyond the bounded horizon.
- State endpoints are reported explicitly; event/execution comparisons are not inferred from snapshot existence. A missing tick row cannot be falsely complete.
- Old consumer-created SelfCheckResult remains assignable. Public names/members, API reference, relevant guide, version2.5.0 and changelog reflect the additive contract.
- Original missing-coverage, raw-endTick-only and above-persisted-endpoint mutations go red, then exact source bytes restore. Actual world constructions/steps remain equal to base on valid recordings and never replay the uncovered tail.
- Final relevant tests and eleven-step gate pass, exact pinned independent implementation/integrated review resolves material findings, then main merge/push and remote matrix/publish-dist pass before downstream adoption.

## Implementation steps

- Write independent contract tests first, verify original implementation goes red with coverage absent.
- Implement public types, private coverage census and bounded segment selection/continuity guard within agreed contract.
- Pin the additive surface and old-result compatibility; update user-facing docs/version and defect record.
- Run affected checks and deliberate mutation controls with source restoration. Obtain exact independent read-only review.
- Reserve the released heavy slot for full gates; ship the final exact revision and update parent work-71 ledger.

## Outcome

M1 is implemented and committed privately at e6ac46c2f8d7a307cc932f955bdd91a9286ba88c. Original tests went red on M0; the final focused selection passed 167 tests across 12 files, typecheck and scoped lint passed, and five seeded regressions failed meaningfully before exact source restoration. Same-tree base/M1 controls passed equal replay-work counts for clean nine-tick, unanchored-tail nine-tick and 1000-segment recordings. Review 0 (Codex 0.158.0 / gpt-6-astra xhigh) passed on the exact 21-file patch SHA256 1b350e9f58622bd204ffb8a0af1007e83b4e2862e4217e375ce87b636d95c30f with no material findings. The eleven-step npm run gates passed on the exact reviewed source in attempt 1: actual exit 0, 1477 root tests plus one todo in 96 files, 22 MCP tests, typecheck/lint/build/pack and exact benchmark counters/time bounds. Core full/production audits have no findings; MCP retains the accepted Hono moderate bound. The owned JobObject gate took 58.091 seconds with cleanupProof true and zero leftovers. Common work-doc validation passed for 73 units. The exact reviewed source is committed privately at e6ac46c2f8d7a307cc932f955bdd91a9286ba88c; main merge/push and publish-dist require root final acceptance and completion of its brief primary dependency-install preservation window. The game continues using verified 2.4.2. All 23 parent work-71 outcomes remain accountable. M2 read-only source audit is complete; no hook implementation has begun.
Independent final integration review 1 passed on committed d7f9003 with all seven authored extra paths inspected and all 21 original blobs unchanged. No P1/P2 or required repair was found; one nonblocking stale design status sentence was corrected exactly as reported. Root confirmed all seven game remote fetches used 2.4.2 and lifted the distribution hold. Main merge/push, hosted gates/publish-dist and adoption remain pending acceptance.
