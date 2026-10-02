# Review 0: implementation

## Target

Frozen M2 source packet at private HEAD192990f3d6fc8b482875f14c5c1572cebd09bd36, main and merge-base eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8. The exact21 candidate and7 context inputs are retained in ignored aoe2/tmp/engine-feedback-resume-1001/m2-size-source/review-inputs.json (SHA25605bef153f522c9027b94b2e38eb00ffde1ecf792819444ea61afbb0b5bba5df6) and full-current.patch (SHA2565d582101a30fd99db3853f56ca27ca6bfe11b93d6daf14ae17f0b60415913f8f). The owned review checkout engine-m2-review-1001 remains at its old frozen target.

## Reviewers and coverage

Independent in-session reviewer engine_m2_acceptance completed the authored source assessment. Both provider CLI lanes produced no authored report; the complete account and exact authorization rejection appear in the preserved report below. Root accepted CHANGES REQUIRED and released scoped repair4/5. This report does not transfer coverage to that repair.

## Reports

### engine_m2_acceptance

The complete authored handoff follows without omissions. Its original UTF-8 bytes remain recoverable at aoe2/tmp/engine-feedback-resume-1001/m2-review/REVIEW.md, SHA25628b559016e9b438cf9ed9fa104afd92600406bb44b9179e9ef03d91125c80e09.

# M2 independent review handoff

Verdict: CHANGES REQUIRED for M2-R1. This packet includes a complete independent source assessment and inspected prior execution evidence. Neither pinned external CLI produced an authored review; both owner-context network routes were rejected before launch. An unavailable review is not a PASS.

The reviewed source remained frozen. The isolated checkout is C:/Users/38909/Documents/github/civ-engine-worktrees/engine-m2-review-1001 at eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8 plus exactly21 candidate/7 context overlays. The overlay manifest SHA-256 is d9d68de180ae78976ef4cbf8d228dc9f55632dc570b5eaeb95c709411d5eeb6a. Private candidate HEAD192990f3d6fc8b482875f14c5c1572cebd09bd36 carries additional background planning records that were excluded from this isolated target. The original tracked diff and new files are recoverable from the frozen snapshot packet.

## Review lanes

| Lane | Actual outcome |
| --- | --- |
| Independent in-session source reviewer | Complete authored report below; one medium material finding and one optional documentation association issue. |
| Codex0.158.0, Astra/xhigh source-reading smoke | Restricted transport returned socket error10013; no source reading or authored report. Cancelled root native exit-1; owned Job cleanup confirmed. Separate owner-context request rejected before launch. |
| Codex Sol/xhigh smoke | Prepared/not run. No claim of model availability or source-reading ability. |
| Full Codex Astra/xhigh review | Prepared/not run because source-reading/network authorization remained unavailable. |
| Claude2.1.281, claude-opus-5-5[1m]/max review | Restricted capture has one matching system/init plus nine api_retry events, no assistant read, result or final modelUsage. Cancelled root native exit-1; owned Job cleanup confirmed. Owner-context request rejected before launch. |

The Codex restricted log contains no STATUS_DLL_INIT_FAILED or -1073741502 marker, but that absence cannot turn a transport failure into a source-reading proof. Claude's init model identifies the requested configuration, not actual billed model execution; the runbook-required exact final modelUsage is unavailable. No provider report has been synthesized or invented.

## Preservation and cleanup

All28 frozen packet inputs matched their declared SHA-256 values. Whole isolated checkout manifests before launch, after restricted cancellation and at final handoff cover632 files with identical SHA-25673821c99ba1a735226fbed273e0f5c9dc7aa6bee271b639468f703a5cc6f0776. They show zero byte changes, additions or deletions. The audit rejects reparse points and encountered none. The seven context overlays' actual content diff from baseline is empty; their transient Git status markers are not interpreted as source changes.

Only two restricted CLI Job trees launched. Kill-on-close Job assignment happened before each worker was released. Cancellation targeted recorded root PID plus start time; finally closed each exclusive Job and checked member PID/start-time identities. Both cleanupProof values are true and final-process-audit.json records zero surviving identities. No browser, GUI, server, product test/build/install, Git mutation or publication ran in this review. The isolated checkout remains intentionally retained for the integration owner to preserve evidence and retire through the maintained controller; this reviewer does not own its creation/retirement.

Raw captures, prompts, wrapper source and process evidence remain in ignored aoe2/tmp/engine-feedback-resume-1001/m2-review. They are retained for the pending authorization/repair handoff. The owner should promote the substantive authored report and dispositions into engine work73; raw transport logs should remain ignored. The repair counter was3/5 at this frozen target; this source review performed zero product repair attempts.

---
# M2 independent source review

Reviewer: engine_m2_acceptance. Scope: optional synchronous advancement across synthetic and agent playtests, replay reconstruction/self-check, and fork continuation. This is a source review of the frozen candidate, not a release or full engine acceptance.

The reviewed packet has review-inputs.json SHA-256 `05bef153f522c9027b94b2e38eb00ffde1ecf792819444ea61afbb0b5bba5df6` and full-current.patch SHA-256 `5d582101a30fd99db3853f56ca27ca6bfe11b93d6daf14ae17f0b60415913f8f`. All21 candidate snapshots and7 unchanged context snapshots match their listed digests. The private implementation HEAD is `192990f3d6fc8b482875f14c5c1572cebd09bd36`; source main/merge-base is `eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8`. The source helper reviewed is `src/playtest-advance.ts` SHA-256 `6c92a61bd19d2941108a7ea3f3d8ac2b65af07bbfc4befe5998f30dd68ac6b0e`.

## Material finding M2-R1 — guard the failure classifier's own property-sensitive operations

Severity: medium. `src/playtest-advance.ts:31` evaluates `value instanceof WorldTickFailureError` before entering any try/catch. A JavaScript thrown value can be a revoked Proxy, or a Proxy whose `getPrototypeOf` trap throws. The `instanceof` operation then throws a secondary error before the callback error can be classified or serialized.

Both runner catch blocks call this classifier before `describeAdvanceError` (`src/synthetic-playtest.ts:280`, `src/ai-playtester.ts:240`). With such a thrown value, the synthetic runner throws and the agent runner rejects instead of returning the contracted `advanceError` result. The fork target and continuation catch blocks also call it (`src/session-fork.ts:372`, `src/session-fork.ts:395`), so they throw the secondary error instead of preserving the original foreign thrown value. Finally cleanup still runs; the defect is error identity and result semantics, not a demonstrated recorder leak.

The contract explicitly handles unknown callback throws and safely serialized metadata. `advanceErrorShape` already guards property access and string conversion (`src/playtest-advance.ts:12-24`), but the classifier runs before that protection. The current hostile-throw test (`tests/playtest-advance-errors.test.ts:61-69`) traps only `get`; its default prototype lookup does not exercise this failure. The original foreign-identity matrix uses a plain frozen object (`tests/playtest-advance-replay-errors.test.ts:27-47`).

Minimal remedy: make the classifier total for arbitrary thrown values, returning false when inspecting class identity or the candidate failure cannot safely complete. Preserve the existing live-world poison/tick/failure checks. Add literal revoked-Proxy and throwing-getPrototypeOf cases through both runners and both fork phases, asserting the primary result/identity and unchanged recorder cleanup. Include the original replayer entries in the identity matrix to establish consistent behavior. This finding is grounded by source control flow; no new product execution or test was authorized for this reviewer.

## Optional observation M2-N1 — keep the existing option's JSDoc attached

`src/session-replayer-types.ts:27-36` inserts the advance declaration between the existing skipRegistrationCheck JSDoc and its declaration. Move the advance declaration outside that comment/declaration pair so generated declarations and editor help associate the registration-check explanation with the correct option. This is a documentation association issue; it does not change runtime behavior.

## Integration prerequisites and verified bounds

The existing member-surface gate (`tests/public-surface-members.test.ts:37-48`) compares every exported declaration's members with `tests/fixtures/public-surface-members.json`. The candidate adds advance to three configs and advanceError to two results; the frozen21-file proposal does not update that fixture. The release owner must deliberately update/review those additive members and the minor-release metadata before the full gate. This is recorded as pending release work, not a gate pass or a second runtime defect.

The omitted-hook code still directly calls world.step. The helper is invoked only on configured paths. The source and tests retain the callback-before-count/stopWhen order, observed partial work, exact supplied World identity, and foreign replay propagation. No serializer or SessionBundle field was added. Both public barrels retain their existing export lists; the newly introduced helpers are private to the package's curated exports.

The Promise boundary is intentionally bounded. The intrinsic observer is attempted first, successful attachment bypasses caller then, and failed attachment falls back to one candidate then read. Callable thenables retain the coded asynchronous-return diagnosis despite observer failure. Hidden native constructor/species failure combined with noncallable then is documented as undetectable by this portable observer; this review does not request unsupported cancellation, universal containment, caller descriptor mutation or a process-global rejection policy.

Read outside changed hunks: `src/session-recorder.ts:224-235` restores submitWithResult, removes all three listeners and releases its owned payload-recorder slot; `src/world-core.ts:213-219` only clears poison/failure/diff/metrics/warning state in recover and does not release recorder ownership. These facts support the supplied partial-fork cleanup control. `src/world-observers.ts:95-96` returns a cloned live tick failure; `src/world-types.ts:170-177` defines WorldTickFailureError as a normal Error subclass carrying the supplied failure record.

The reviewer inspected actual owner artifacts: focused-5/tests.json reports199 total/passed,0 failed/pending across9 affected files, with native exit0 recorded separately; source-checks-2/results.json records strict noEmit and14-file lint native0. cleanup-control's mutant-tests.json records exactly two RecorderClosedError failures after recovery, while control-result.json records restored2passed/0failed,27 filtered skips per arm, and the exact restored fork source digest. These are inspected prior execution artifacts, not tests rerun by this reviewer.

The reviewer's initial required `npm run ci:status` in AoE2 returned native1, `UNKNOWN — could not resolve the commit to report on`. It establishes no current CI pass. The owner separately reports engine main CI36816404419 green at eb61; that is base evidence, not M2 candidate verification. Full eleven engine gates, Node20/22 compatibility, final integrated review, main integration/push, hosted acceptance, release/distribution and game adoption remain outside this pass.

Final source-review verdict: changes required for M2-R1. Neither independent pinned CLI completed: restricted launch transport failed, and the separate owner-context requests for Anthropic and OpenAI source transmission were rejected by automatic approval. No unavailable lane is counted as a PASS. The combined handoff retains those exact reasons and the byte/process audits separately. Source/tests were not edited and no new product checks were run by this reviewer.

---

# Networked review blocked by automatic approval

Action: `exec_command` with `sandbox_permissions: require_escalated`, invoking the task-owned run-review.ps1 wrapper for Claude on the frozen isolated checkout. Requested command used the pinned claude-opus-5-5[1m] model, max effort, read-only tool allowlist, bounded900-second owned Job cleanup and no product execution. The command did not launch.

Exact rejection reason:

> This networked review would transmit private repository source and review prompts to an external Claude provider; the user authorized orchestration/review work but did not specifically authorize exporting this sensitive payload to that destination.

The rejection also explicitly instructed not to bypass it through a workaround or indirect execution. It was relayed to the coordinator. No alternate launcher or destination was used. The subsequent intended owner-context Astra smoke call was not reached after the exception. Prepared inputs remain preserved as prepared, not executed.

The preceding restricted launch had already been stopped through its owned root identities. Both Job wrappers closed their handles in finally, reported cleanupProof true and zero leftovers. The Astra smoke recorded socket error10013 and no authored report. The Claude capture eventually flushed one system/init event for claude-opus-5-5[1m] and nine system/api_retry events; it contains no assistant source read, final result or modelUsage. Both roots record cancellation exit-1. Neither attempt is a completed independent review or a PASS.

Further networked Claude source review needs direct user authorization for sending this review payload to that destination, or fresh exact authorization evidence accepted by automatic review. No permission is inferred here. Independent source assessment and preserved owner execution evidence remain useful within their stated bounds.

## Separate OpenAI lane

After the coordinator instructed an independent request for the originally planned OpenAI lane, `exec_command` with require_escalated attempted the pinned Astra source-reading smoke. Automatic approval rejected this command before process creation too. This was the first reached owner-context Astra request; the Astra call following the earlier Claude rejection had not run.

Exact rejection reason:

> This action would transmit private engine source and review prompts to OpenAI over the network; the user authorized orchestration and reviews but has not specifically approved exporting this payload to that destination.

The same no-bypass instruction applied. The rejection was relayed immediately and this lane stopped. Sol smoke and full Astra review remain NOT RUN. There is no owner-context model response, source-reading proof or provider verdict from either destination. The coordinator owns the pending human authorization decision; no reviewer retry is left running.


## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 (M2-R1) | Hostile thrown-value prototype inspection replaces the callback failure. | Accepted; classifier must be total without treating forged errors as live failures. | Tests-first repair4/5 and fresh focused independent source review. |
| F1 (M2-N1) | advance JSDoc separates the skipRegistrationCheck comment from its member. | Accepted documentation correction. | Move advance before the existing comment/member pair. |

## Verification

The reviewer inspected prior199 passing tests, strict noEmit/lint, and the two omitted-disconnect RED controls with exact restored GREEN counterparts. It ran no product test or build. Its final audit retained632 identical review files and zero owned processes. Provider source-export routes were rejected before owner-context launch; no retry or substitute transport is authorized.

## Round outcome

CHANGES REQUIRED. F0 is material; F1 is optional and accepted. The public-member fixture and additive minor release preparation, full11 gates, hosted acceptance, shipment and game adoption remain open. The root owns release boundaries.
