# Review 1: implementation

## Target

Repaired M2 product/public target at worker HEAD192990f3d6fc8b482875f14c5c1572cebd09bd36 and main/merge-base eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8. Exact24 product/public snapshots plus7 unchanged context inputs remain in ignored aoe2/tmp/engine-feedback-resume-1001/m2-r4/product-inputs.json SHA25635c4dd2a10476e780541cc218075ddd8b9e7b5b97fd95e4f0a254a354521d1d1. Current review closed before repair5; the historical work71/work73 status snapshots retained in the review checkout are not part of that24-file product scope. Full repair4.patch/full-current.patch/scoped-main.patch and old frozen reviewed inputs remain recoverable in the same ignored packet.

## Reviewers and coverage

Independent in-session reviewer engine_m2_acceptance continued its source assessment against the exact local31 incoming snapshots. It accepted R1/N1/five-member repair and found the medium release mismatch M2-R2. Both networked provider lanes remain unavailable; their exact earlier rejections and cleanup are preserved in review0. This pass is not multi-CLI approval. Root confirmed the final633-file unchanged audit and zero task-owned processes before releasing repair5.

## Reports

### engine_m2_acceptance

The complete authored report follows without omissions. Its original bytes remain at aoe2/tmp/engine-feedback-resume-1001/m2-r4/re-review/REPORT.md SHA25610e228c557341a815c2d2935451e1d631d2b1cd69f7f7bcb6b5b8ebab2fee2ed.

# M2 repair4 focused independent source re-review

Verdict: the M2-R1 runtime repair, M2-N1 JSDoc repair and five-member fixture correction are accepted within this focused source/evidence review. Release remains CHANGES REQUIRED for M2-R2, the incomplete 2.6.0 version synchronization. This continues the existing in-session independent assessment; it is not a Codex CLI or Claude CLI approval.

## Exact reviewed target and scope

The frozen product manifest is `m2-r4/product-inputs.json`, SHA-256 `35c4dd2a10476e780541cc218075ddd8b9e7b5b97fd95e4f0a254a354521d1d1`. It lists24 product/public snapshots plus7 existing contexts. The private implementation HEAD is `192990f3d6fc8b482875f14c5c1572cebd09bd36`; the review baseline remains `eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8`.

The existing isolated checkout `C:/Users/38909/Documents/github/civ-engine-worktrees/engine-m2-review-1001` matched the prior632-file byte audit exactly before refresh. All31 incoming snapshots were checked against their byte counts and SHA-256 values before copying. The first offline copy attempt was denied by the filesystem sandbox at the first file, before any byte change; the authorized owner-context retry rechecked every preimage and copied only those31 local snapshot files. There was no provider network call. Exactly10 file contents changed, including one new hostile-value test;633 files form the refreshed tree. No source correction, normalization, dependency link or product runtime was introduced by this reviewer. `refreshed-overlay.json` records every old/new digest and path. Prior reports and frozen candidate inputs remain preserved.

The three old work71/work73 status documents retained in the checkout are historical context from the first review. This pass does not review the separately active status assembly or imply it is part of the frozen24-file product target. The owner must integrate only the scoped approved delta, not unrelated committed planning records from the private worker branch.

## Finding dispositions

### M2-R1 — resolved: preserve hostile foreign throw identity and runner results

`src/playtest-advance.ts:30-38` now puts the class/prototype check, live poison/tick checks, failure retrieval and failure comparison inside one try/catch. A revoked Proxy or throwing getPrototypeOf trap now returns false from the classifier. Both runners therefore reach the existing safe metadata normalization, while fork target/continuation catch blocks rethrow the original foreign value. The fix keeps the preexisting positive requirements for a real WorldTickFailureError: supplied World poisoned, exactly one consumed tick, live failure at the current tick, and matching failure data. It does not normalize all class instances into a world failure or bypass the tick/poison requirements.

The new `tests/playtest-advance-hostile.test.ts` creates the two actual hostile values at lines9-18. Eight runner cases at lines32-57 assert no escaped secondary error, exact diagnosis, partial ticks, zero counted/stop-predicate work, one callback and recorder reconnection without advancing the World. Twelve replay cases at lines61-82 preserve exact original identity before/after a step across openAt/selfCheck/forkAt. Eight fork cases at lines84-107 cover both target and continuation throws before/after a step, exact identity, callback count, unchanged poison state, consumed builder and recorder release. These are public-flow checks, not tests of the private helper against itself.

The inspected pre-fix run used helper SHA-256 `6c92a61bd19d2941108a7ea3f3d8ac2b65af07bbfc4befe5998f30dd68ac6b0e` and the exact new test SHA-256 `93aff6027747e676bc1e418859964bc5849809a5b3ca21b3d3cd7ab9c41caf41`. It reported28 cases,12 passed,16 failed,0 skipped, native exit1. Four runner failures expose the revoked-Proxy getPrototypeOf TypeError, four expose the explicit secondary prototype error, and eight fork cases fail original-identity equality. The twelve already-passing direct replay cases are the expected unaffected controls. The green invocation uses revised helper SHA-256 `41bec4c07ea835a24f08d922a90feb1f9e2aa018271e6607f39f7e24af23aace` with the same test bytes.

The actual green affected report contains227/227 passes,0 failures/skips, native exit0. Independent comparison of test file/full-name identities retains all199 prior cases and adds exactly28 hostile-value cases. The original genuine/swallowed poison, forged unpoisoned failure, tick-delta, native-Promise and fork-cleanup cases remain present; their source bytes are unchanged. `case-preservation.json` records that comparison. This is inspected owner execution evidence, not tests rerun in the review session.

### M2-N1 — resolved: option JSDoc association

`src/session-replayer-types.ts:27-37` places advance and its own comment before the existing skipRegistrationCheck comment/declaration pair. The original registration-check explanation is attached to the intended option again. Generic parameters, declarations and runtime behavior did not change.

### M2 surface prerequisite — resolved in the supplied fixture

The fixture diff adds exactly `advance?` to AgentPlaytestConfig, ReplayerConfig and SynthPlaytestConfig, and exactly `advanceError?` to AgentPlaytestResult and SynthPlaytestResult. No other declaration/member is changed. The actual member-gate red report contains one failure/one pass, native1; green contains2/2 passes,0 skipped, native0. Both curated export files remain byte-identical to the preceding target. There is no new public helper alias, generic expansion or persistent callback field.

### M2-R2 — medium: complete all release version copies

The newly supplied `package.json:3`, root package-lock version fields, README badge and changelog now announce2.6.0. However, `src/version.ts:7` still exports `ENGINE_VERSION = '2.5.0'`, and `mcp/package-lock.json:26` still records packages['..'].version as2.5.0. Neither file is included in the24 product snapshot inputs, so the isolated exact candidate keeps those baseline bytes.

This is an observable release defect rather than optional prose cleanup. `src/session-recorder.ts:148` writes ENGINE_VERSION into recording metadata, so a package released as2.6.0 would label new recordings2.5.0. The existing checks at `tests/version-sync.test.ts:20-22` and `tests/version-sync.test.ts:79-82` require the runtime constant and linked MCP lock version to equal package.json and would reject this candidate. This reviewer did not run those tests and does not claim an observed red execution for them; the disagreement is established by directly read source/data and their literal assertions.

Minimal remedy: complete the already authorized2.6.0 release synchronization in the runtime constant and MCP linked-engine lock entry, keeping dependency resolutions and all other fields unchanged. Run the existing version-sync checks before the full gate and include those two exact files in the next reviewed manifest. This is one finding covering the missing version copies; no further API or save-format expansion is requested.

## Public contract and preserved behavior

The root package and root lock diffs contain only their version-number changes, with no dependency or export-map changes. The README adds one routing row for enclosing advancement. The changelog and updated guide/API paragraph explicitly require exhaustive consumer switches to handle advanceError, preserve original foreign replay/fork throws including hostile values, and retain the existing poison/partial-recording behavior. The no-rollback/no-cancellation and unsupported constructor/species-plus-noncallable-then detection bounds remain explicit. The2.6.0 minor classification follows the accepted additive public-member policy while documenting the exhaustive-switch migration.

The runner/replayer/fork implementations and original tests retain the exact hashes read in the prior broad assessment. The only runtime implementation change in this repair is the total-for-throwing-input classifier guard. This focused pass does not claim to have repeated the entire earlier Promise/default-path investigation. Earlier reviewed behavior is reused only where byte identity preserves it; the owner227-case artifact supplies current affected-test evidence. The omitted-hook direct stepping paths remain unchanged. SessionBundle, serializer and snapshot formats remain unchanged; callbacks remain runtime configuration only. Version metadata is precisely the open M2-R2 issue.

Unchanged-source citations checked for the repair: `src/world-observers.ts:95-96` returns cloned live failure data; `src/world-types.ts:170-177` defines the actual error class/failure member; `src/world-core.ts:213-219` clears poison state without clearing the recorder slot; `src/session-recorder.ts:224-235` restores submitWithResult, removes listeners and releases its slot. The source worker's prior omitted-disconnect mutation proof therefore remains applicable to the byte-identical fork code, but it was not rerun here.

## Verification and availability bounds

The inspected owner artifacts report strict src/tests noEmit and15-file lint native0. Both red/green owned Job receipts report assigned-before-release, successful membership/accounting queries and close, activeProcesses0, cleanupProof true and zero leftovers. Their actual native statuses remain distinct: the expected red Job exited1; green exited0. The reviewer launched no model CLI, product test, build, install, browser, GUI, server, commit or publication in this pass. The offline copy operation was explicitly allowed after its initial filesystem denial; it is unrelated to the rejected provider exports.

Both external source-review destinations remain blocked by the prior automatic approval rejections pending destination-specific human authorization. No retry or substitute transport occurred. There is no new Astra/Sol source-reading proof, full Codex review, Claude final modelUsage or authored Claude report; neither lane counts as PASS. The earlier full authored source review and exact rejection/cleanup records remain under m2-review.

Full eleven engine gates, build/pack, dependency audits, benchmark/MCP checks, Node20/22 compatibility, final integrated review, main commit/merge/push, hosted matrix/publish-dist acceptance and actual consumer adoption remain unrun/unaccepted for this target. Version-sync execution is also unrun here; its two pending mismatches are material. Repair budget is4/5 as declared by the input manifest; this review added no product repair attempt. The review checkout is intentionally retained for root-controlled refresh/cleanup.


## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 (M2-R1) | Hostile classifier replaces foreign callback errors. | Resolved by focused source review and inspected227-case evidence. | Exact helper41bec4c07ea835a24f08d922a90feb1f9e2aa018271e6607f39f7e24af23aace. |
| F1 (M2-N1) | Option JSDoc association. | Resolved by exact source inspection. | ReplayerConfigbfc509287f8453368de7fc87a6ad105aabddf0c14cfd74366b176cef84a2d787. |
| F2 (M2-R2) | Runtime constant and MCP parent-lock version still2.5.0 while package announces2.6.0. | Accepted material release defect. | Root released only minimal version synchronization in repair5/5; fresh focused review required. |

## Verification

Reviewer inspected actual227 affected passes and2 member passes, strict noEmit/lint native0, RED sensitivity and Job cleanup. It ran no product test/build or provider CLI in this round. Root confirmed the closed633-file audit and zero owned processes. Subsequent owner tests-first version-sync run produced6 total,4pass,2fail,0skip native1 at the exact stale runtime/MCP copies; those later artifacts remain ignored in aoe2/tmp/engine-feedback-resume-1001/m2-r5/red. They do not rewrite the reviewer's unexecuted-runtime bound.

## Round outcome

R1/N1/member prerequisites resolved within focused review. Release CHANGES REQUIRED for F2; repair5 and exact re-review are required before root considers full gates/integration. Both CLI lanes, full11 gates, build/pack/hosted release and consumer adoption remain unavailable or unrun as stated. No final acceptance is claimed.
