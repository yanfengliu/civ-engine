# Report self-check comparison coverage

Status: complete
Owner: Codex engine-feedback worker
Created: 2026-10-01
Updated: 2026-10-02

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

M1 shipped as engine2.5.0 at main eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8. Root accepted the exact final integration and all21 original source blobs; review0 and final review1 are retained with their independent source/execution bounds. The original16 tests went red, final167 focused checks/type/lint passed, five seeded regressions failed before exact restoration, and equal base/new replay-work controls passed. All eleven local gates passed:1477 root tests plus one todo,22MCP,type/lint/build/pack and benchmark counters/time bounds; owned cleanup proved zero survivors. Core audits have no findings; accepted MCP Hono moderate remains explicit.

Hosted36816404419 passed Node20/22/24 and publish-dist on exacteb61e448. Published tarball648792 bytes SHA256478d0aa36b49bd02a9a75df87ad08f6e672801011bee570887f84e5217c17fff matches GitHub asset602452190 digest. Safe private extraction verified all376 distribution files, actual ENGINE_VERSION2.5.0 and the coverage declaration. Primary source is accepted main; foreign AGENTS bytes remain unchanged, and primary372-file dist stays verified2.4.2 until root coordinates the separate game adoption. No dependency install/build or adoption was performed in primary. Complete here means this engine milestone's local/review/main/hosted boundary passed; parent work71 still owns all23 outcomes and root owns game feedback reconciliation/adoption. M2 proceeds privately in work73 while future distributions remain held through the next game fetch boundary.


2026-10-02 reconciliation: the preceding complete outcome is recovered unchanged from privateHEAD192990f3d6fc8b482875f14c5c1572cebd09bd36:docs/work/72_self-check-coverage/plan.md and describes the historical M1 release boundary. Its source bytes are retained ignored in the closure/private-preimages packet. The historical M2 hold has since ended: work73 producer2.6.0 shipped57de5ce with hosted acceptance; work71/all21 remaining consumers stay OPEN. This closes the already-shipped M1 plan without re-running its gates or claiming current primary distribution/adoption state.
