# Review 3: implementation

## Target

Focused metadata recovery revision1:87-input manifest SHA2567cb62b0a54b1eab15678202cb61e716a6a6dd3c6fff10789304422c76e9d01a4; actual source12552B/SHA256c2173cd75f1ac96094816c18c3f029be35887f48c4cdbeeac7597c240d3b854e. Reviewed prepared wrapper SHA2567a076049df5ee374a7e5e2ef18309faa057d651aa7d57b15e9538cea99d13bfa and worker SHA256c236c0a4b3cb05ee303294a8dd490728d8574b54200fee145268fa0ebf0fec3a. Complete original report below predates application and retains that historical bound. Original proposal/source/control receipts/opening/closing witnesses remain ignored under aoe2/tmp/engine-feedback-core-recovery-1001.

## Reviewers and coverage

Same internal independent /root/core_metadata_recovery_review, root-assigned unchanged fleet Astra/xhigh pin; no external CLI. Full revised source, sixteen retained case records, failed attempt1, preflight and launcher read. All87 opening/closing inputs matched. Reviewer ran no apply, control, native preflight or product gate; retained evidence is attributed separately.

## Reports

### Original attributed metadata recovery report

The following 12644 original bytes have SHA256 74ed28e04e305c3138460e8e1dc6f1e8fa1120dd3f20d592e8aa4377289bef9d. Its historical statements are unchanged.

<!-- Original authored report begins; preserve exact bytes. -->
# Focused independent re-review: recovery revision1

Reviewer: `/root/core_metadata_recovery_review`, the same independent internal reviewer as R0, accountable to `/root`, under the assignment's unchanged fleet Astra/xhigh review pin. Date: 2026-10-01. No external review CLI was run.

Verdict: **PASS within the prepared-source and retained-control evidence bound. REC-001 and REC-002 are resolved in revision1. No new material finding or unresolved material issue was identified in this focused scope.** This is not an apply result or permission to apply. The primary recovery and prepared launcher remain unexecuted.

## Exact target and unchanged witnesses

Packet: `C:/Users/38909/Documents/github/aoe2/tmp/engine-feedback-core-recovery-1001`.

- `revision1-review-manifest.json`: 29,232 bytes, SHA-256 `7cb62b0a54b1eab15678202cb61e716a6a6dd3c6fff10789304422c76e9d01a4`, 87 inputs.
- `restore-additive-revision1.cjs`: 12,552 bytes, SHA-256 `c2173cd75f1ac96094816c18c3f029be35887f48c4cdbeeac7597c240d3b854e`.
- `proposal-revision1.md`: SHA-256 `cfee268d65d86a2d20441ef8d27bca49efb675c21a06b3eba39e735f4e43182e`.
- `revision1-final-binding.json`: 3,304 bytes, SHA-256 `379d8d223f7b1341fa05a108ae7574fe9ab42536cc5ea58aae5451ce4009637f`.
- Prepared wrapper `apply-revision1/run-owned-apply-job.ps1`: SHA-256 `7a076049df5ee374a7e5e2ef18309faa057d651aa7d57b15e9538cea99d13bfa`.
- Prepared worker `apply-revision1/run-apply.cjs`: SHA-256 `c236c0a4b3cb05ee303294a8dd490728d8574b54200fee145268fa0ebf0fec3a`.

I read the actual revised source, control runner, all sixteen attempt2 case records, attempt1 result and correction, preflight receipt, proposal, launch worker and wrapper in full, and the source/preparation generators relevant to the changes. All 87 frozen inputs matched their expected lengths and digests at opening and closing. The manifest itself matched the assigned digest at both ends. The final binding also remained unchanged between its separate opening witness and closing check. Full witnesses are retained in `opening-manifest.json`, `closing-manifest.json` and `binding-and-baseline.json` beside this report.

I checked that all original 42 manifest entries are included with their original paths, lengths and digests, and that the retained R0 report still has SHA-256 `aaef98c4ef7364e301bfa0d71625266b87bdbcfccf5e92438ac88b95185c4918`. Its CHANGES REQUESTED verdict is preserved as the historical verdict; this report does not replace or relabel it. The R0 object-store, exact commit/index identities and 881-primary/644-private preservation proof are inherited within their original bounds. I did not repeat those checks unnecessarily; the original content/payload inputs are unchanged, and the retained attempt2 opening/closing witnesses and native preflight report matching preservation counts.

## REC-001 disposition: resolved

`restore-additive-revision1.cjs:15`–25 introduces the separate creation and lifecycle state and the final ownership snapshot. Line 45 records an exclusive-open file immediately, freezes its expected path/size/digest, and separately records write attempted/completed, close attempted/completed, complete verification and rollback removal. The created-directory list remains distinct. Line 56 marks successful per-file rollback removals. The finalization path at lines 58–62 always adds the ownership snapshot, including when the operation failed or rollback refused.

This repairs the original gap without treating all planned destinations as created files. Expected content and observed final state are separate. `observe()` at line 20 catches observation failures and records them, so an unreadable or removed addition does not prevent the remaining receipt attempt.

I inspected the concrete case receipts as well as the runner's assertions. The revised partial-write case records one created file, two created directories, 17 observed bytes, `writeCompleted:false`, `verifiedComplete:false`, native exit 1 and refused rollback. The post-install foreign-entry case records all 22 additions and 18 directories, leaves the foreign file present, and refuses rollback. The wrong-HEAD control removes only the 22 owned files and 18 empty directories, records all files as rollback-removed and absent, and leaves the original 20 metadata files. The combined partial-write/missing-lock case retains the operation error, refused rollback, lock cleanup error and actual creation inventory together. These are the concrete failure paths requested in REC-001.

The original-source RED control still records the missing ownership inventory under the partial-write condition. The repair is therefore supported by a demonstrated difference from the original behavior, not only by an assertion that the current source agrees with itself.

## REC-002 disposition: resolved

`restore-additive-revision1.cjs:26` records the exclusively opened lock's exact intended bytes and native `dev`, `ino` and `birthtimeNs` identity from the open descriptor. Line 27 checks plain-file type, identity and byte equality before unlinking. It does not rely on the PID field or parse potentially malformed replacement JSON.

At lines 58–60, `operationExit` is captured before cleanup and cleanup has its own catch. A cleanup failure records the error and final observation, preserves unexpected state, and changes the overall native result to 1. Final receipt writing is attempted afterward at line 62. Its independent error handling emits a nonzero I/O failure with stderr fallback instead of silently reporting success. This does not promise a durable full receipt after process termination or an unwritable destination; the proposal keeps that limit explicit.

The actual retained records cover missing, malformed, changed-same-PID, different-PID, unreadable, unlink-failure, identity-replaced and mocked nonplain locks. All revised cases have nonzero exit, no escaped VM exception and one receipt attempt. Unexpected existing locks remain. The same-PID case specifically retains the modified bytes that the R0 RED case deleted while returning exit 0. The identity-replacement case rejects a new file carrying the same bytes. The normal control removes the unchanged owned lock and returns zero. The receipt-write failure has no receipt, returns 1, and its stderr fallback retains operationExit 0, successful lock cleanup and the 22-file/18-directory ownership snapshot. The combined operation/cleanup failure also preserves both outcomes in the actual receipt.

These checks directly address the original failure-reporting and unsafe lock-identity conditions. General check/use races remain the already documented nontransactional bound, not a claim of atomic protection against concurrent writers.

## Retained controls and their limits

`run-failure-contracts.cjs:8`–10 hashes the actual original and revised source, then executes those exact strings at lines 44–45. It does not substitute an independently reimplemented recovery algorithm. Its filesystem shim at lines 17–42 maps mutating calls into a fresh case directory and rejects unknown destinations. File-descriptor writes are tied to descriptors opened through that shim. The require allowlist excludes other capabilities. Git is stubbed at line 43, so these controls establish the receipt/ownership/cleanup contracts and do not establish native Git recovery correctness.

I read all sixteen case records. Two carry the original source digest and fourteen the revised digest. The successful attempt2 result reports native exit 0, all cases complete and 19,634 ms. Every case records zero open descriptors and all mutable calls redirected. The two original cases reproduce the requested RED behaviors; the fourteen revised cases cover normal success and the named failure paths. The nonplain-lock control mocks the type result rather than creating an OS junction. Inspection of the control code and records supports those limits.

Attempt1 is retained as a failed instrument attempt: one RED case completed, then the HEAD-to-head mapping error changed the metadata inventory and the source correctly rejected it. Its result is not counted as completing the remaining controls. I inspected the corrected mapping at line 17 and the retained correction receipt. The original/revised sources and literal delta generator remain available even though the optional no-index patch preparation did not produce a patch. Neither the failed instrument run nor the omitted patch is hidden or represented as a passing recovery check.

I did not rerun any control, syntax check, native preflight or product gate during this re-review. The retained real preflight is native 0, mutationStarted false, operationExit 0, zero creations and no lock acquisition. I independently observed the four primary destinations still absent and the recovery lock, apply result, worker result and Job result absent. Prepared, tested in a fixture, preflighted and applied remain separate states.

## Prepared launcher source review

I read `apply-revision1/run-apply.cjs:1`–16 in full. It pins the exact revised recovery source and the original 42-input manifest/content, refuses existing named apply results, recovery lock and apply logs, rejects the listed Git repository/object/config redirect environment variables, and accepts only safe-directory config injection keys. It invokes the exact recovery path with literal `apply` through the current Node executable, with a 250-second timeout. It reads the actual apply receipt and checks operation/overall exit, lock cleanup and the 22 recorded creations before its own success. Child failure output is retained under exclusive log creation. This worker supplies an execution receipt, not a substitute for root's final status/preservation/cleanup acceptance.

I independently derived the new wrapper in memory from the frozen clone wrapper and the four literal changes recorded in `apply-revision1/prepared.json`; the resulting text is exactly the reviewed wrapper. The changes are the worker path, lane label, command label and removal of the unused PREVIEW_PORT assignment. The source at `run-owned-apply-job.ps1:13`–22 waits for the parent's unique go signal. Lines 152–173 acquire the common `aoe2/tmp/gate.lock`, create the kill-on-close JobObject, start the hidden held worker, record its PID/start time, assign it to the Job, and only then release the signal. The outer 300-second limit is at line 175. Lines 189–269 retain the inherited finally membership query, Job close, PID/start identity checks and explicit cleanupProof result. Cleanup is limited to owned Job membership and named resources; there is no broad application kill.

The meaningful adjacent implementation checked outside the revised recovery script is the Job assignment-before-release sequence at `C:/Users/38909/Documents/github/aoe2/tmp/engine-feedback-core-recovery-1001/apply-revision1/run-owned-apply-job.ps1:170`–173. The explicit apply command in `proposal-revision1.md:23` supplies the required aoe2 RepoRoot and excludes custom-lock/smoke application. No launcher was executed during preparation or this review. The inherited wrapper's prior clone evidence remains relevant only to that already completed execution; the future apply must produce its own Job and cleanup evidence. In particular, native process exit alone is not cleanup acceptance: root must read cleanupProof, leftover membership and actual shared/recovery lock state.

## Remaining acceptance boundary

No material source-review issue remains open for REC-001, REC-002 or the reviewed launcher within this focused scope. Separate root authorization, real writer quiescence and the common gate slot are still prerequisites to any apply. The future apply must establish actual primary/private HEAD, native fsck, reconstructed index/status, unchanged preservation inputs, exact original-plus-owned metadata and process/lock cleanup before recovery can be accepted. The original primary staging, original local config/hooks/excludes and missing-metadata cause remain unknown. The reconstructed main index/config/HEAD are not asserted to be their lost originals.

No primary/sibling/private/admin/source mutation, Git command, product runtime/test/build, network, browser, external CLI review, commit or publication occurred in this re-review. I wrote only this assigned revision1 review directory. No browser, GUI, server or persistent task process was launched. All evidence here is intentionally retained for root's disposition and later authorized permanent review retention. This PASS does not retire engine feedback items or alter the runtime/publication hold.

<!-- Original authored report ends. -->

## Findings and disposition

| ID | Focused result | Acceptance |
|---|---|---|
| REC-001 P2 | Resolved: immutable actual additions and separate lifecycle/final observations persist on every catchable path. | Original partial-write control RED; revised partial/foreign/rollback/combined-failure receipts support the stated inventory bound. |
| REC-002 P2 | Resolved: owned lock bytes/type/identity guarded; cleanup caught separately; receipt always attempted and overall failure retained. | Original changed-same-PID control RED; revised named lock faults remain nonzero, unexpected state retained, normal cleanup0. Receipt-write failure has explicit stderr fallback. |

## Verification

Owner retained attempt2 native0/19.634s with16 completed controls: original2 RED and revised14 passing expectations. These execute the actual script in a filesystem fixture with Git stubs, establishing receipt/ownership/cleanup contracts, not native Git recovery. Attempt1 failed after one RED due a path-case instrument error; remaining controls DID NOT RUN. Native real preflight0 created nothing. Optional patch preparation DID NOT PRODUCE and the initial closing reader failed on PowerShell UTF8 BOM; all originals and the literal source repair remain recoverable. No apply retry occurred. Separately, root authorized one reviewed real apply: native operation/apply/fsck0;22 actual verified files and18 directories; primaryHEAD eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8/privateHEAD192990f3d6fc8b482875f14c5c1572cebd09bd36. Independent closing0 binds87 frozen inputs,881 primary and644 private/admin entries, exact132 metadata entries=92 original+40 owned additions. Job native0/2.399s/assignment-before-release/cleanup true, zero members/owned processes and both locks absent. Root FINAL ACCEPTED the recovery after independently reading the full bf3aba3847abd1cc9cd87e3f6388743e7c36e3f1e6880c0fefbb53758a67bc92 handoff and all ten bound artifacts. No runtime/product gate ran or is claimed.

## Round outcome

Focused prepared-source PASS resolves both accepted findings. Separate actual metadata-recovery acceptance is complete, with exact held source/runtime/private-index/refs/allocator preserved. Primary HEAD/config/index were deliberately reconstructed; original staging, local config/hooks/excludes and corruption cause remain unknown. Recovery is not an atomic filesystem transaction. All21 remaining feedback comments stay open; M2/native-font/runtime/publication actions remain held.
