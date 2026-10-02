# Review 2: implementation

## Target

Historical metadata recovery R0: original42-input manifest SHA25615cebfdff8f10516263e41bb5df4e8fb6fad0e37e9a562687d7d494cc80d3887; original restore-additive.cjs SHA25695d071e3d839b62772dd51c013ad6d277552c0a4865e3ab6c1b7055dd15409e9. Original proposal, payload, opening/closing witnesses and script remain retained under aoe2/tmp/engine-feedback-core-recovery-1001/revision0-retained and the original packet. The complete report below is historical and is reproduced without edits.

## Reviewers and coverage

Internal independent /root/core_metadata_recovery_review, assigned by root with the fleet Astra/xhigh pin. The requested pin is assignment provenance, not provider telemetry. No external CLI lane ran. Source/read-only preservation and object/index checks were executed within the original report's bounds; apply and failure controls were not run by this reviewer.

## Reports

### Original attributed metadata recovery report

The following 16997 original bytes have SHA256 aaef98c4ef7364e301bfa0d71625266b87bdbcfccf5e92438ac88b95185c4918. Its historical statements are unchanged.

<!-- Original authored report begins; preserve exact bytes. -->
# Independent review: additive civ-engine Git metadata recovery

Reviewer: `/root/core_metadata_recovery_review`, an internal independent read-only reviewer assigned by `/root`. Review pin requested by the assignment: the current fleet Codex pin, Astra at xhigh. The fleet runbook was read directly. No external Codex or Claude CLI review lane was launched, and this report does not claim one.

Date: 2026-10-01. Outcome: **CHANGES REQUESTED on the frozen recovery script**, for REC-001 and REC-002 below. The preservation evidence and proposed object/index content pass the bounded checks described here. The primary recovery has NOT been applied. This report grants no application permission.

## Exact reviewed target

Packet: `C:/Users/38909/Documents/github/aoe2/tmp/engine-feedback-core-recovery-1001`.

- `proposal.md`: SHA-256 `aa42dc1e7863d1d45704933faca7e69d0d146fb888779ab0fc186eb85dd334d5`.
- `restore-additive.cjs`: SHA-256 `95d071e3d839b62772dd51c013ad6d277552c0a4865e3ab6c1b7055dd15409e9`.
- `review-manifest.json`: 14,471 bytes, SHA-256 `15cebfdff8f10516263e41bb5df4e8fb6fad0e37e9a562687d7d494cc80d3887`, with 42 inputs.

I read the actual script in full, the proposal, all frozen payload metadata and recovery receipts, the clone worker wrapper, and the preserved administration relevant to the linked worktree. I independently hashed all 42 manifest inputs at opening and closing; both passes matched every expected byte count and SHA-256 digest. The review-manifest digest itself also matched at both ends. The complete records are in `opening-manifest.json` and `closing-manifest.json` in this review directory. Those manifests identify the packet by content; the packet itself remains retained because a digest alone would not preserve its contents.

## Findings requiring disposition before apply

### REC-001 — P2: failed apply receipts omit the actual addition inventory

Location: `C:/Users/38909/Documents/github/aoe2/tmp/engine-feedback-core-recovery-1001/restore-additive.cjs:33`, with the reporting paths at lines 40, 43–45.

The script records each exclusive creation in `createdFiles` and each created directory in `createdDirectories`, but copies `createdFiles` into the result only after every success check, at line 40. On a caught failure, line 43 records only the exception. If rollback cannot proceed, line 44 records only `complete:false`, a message and the rollback bound. The finally path persists `mutationStarted` but neither ownership list. Created directories are never listed in the receipt, including on success.

A concrete affected case is an I/O error after a file has been opened with `wx` and partially written. The script correctly refuses rollback because the partial file does not match its expected digest. It then leaves the partial recovery for the owner, but the persisted receipt does not identify which files and directories this attempt actually created. A foreign metadata change during the later Git checks reaches the same incomplete handoff. This is exactly the state in which the owner needs the recorded ownership inventory to distinguish observed creations from all 22 merely planned destinations. The preflight manifest cannot establish which creations happened before the error.

Minimal repair: include the immutable per-attempt `createdFiles` and `createdDirectories` inventories in every result path, including caught failures and refused rollback. Keep expected digest/size separate from verified-complete state, so a recorded open/partial file is not represented as fully verified. Do not add a broad cleanup or delete an unexpected file to make the receipt simpler. A crash or forced termination can still prevent a final receipt; this request concerns the script's catchable failure paths and does not demand filesystem transactionality.

Suggested focused verification for the owner: an isolated fixture or mocked filesystem failure after exclusive open and partway through a write must retain the partial file, return failure, and record its path plus every created directory. A post-install foreign-entry failure must retain that entry and the exact owned-addition inventory. No primary apply is needed to exercise these reporting contracts.

### REC-002 — P2: lock cleanup can erase unexpected state or bypass the failure receipt

Location: `C:/Users/38909/Documents/github/aoe2/tmp/engine-feedback-core-recovery-1001/restore-additive.cjs:45`; lock creation is at line 31.

The finally block reads and parses `restore.lock` before writing the result, outside any cleanup-specific error handling. If the file is missing, unreadable or malformed, or its unlink fails, the exception escapes finally and prevents `primary-restoration-result.json` from being attempted. This can occur after a fully installed recovery or after an already refused rollback. The operator then gets a native failure without the script's actual mutation/rollback result even when the receipt path remains writable.

The alternative branch is also inconsistent with the fail-closed contract: if the parsed lock contains a different PID, the script preserves it but leaves an otherwise successful `nativeExit:0`. Conversely, matching only the PID is insufficient to recognize unchanged owned bytes. If another writer changes the existing JSON while keeping its PID field, the script unlinks the changed lock despite the unexpected state. The proposal promises to preserve foreign or changed state for inspection (`proposal.md:35` and `proposal.md:37`).

Minimal repair: retain the exact lock identity written by this attempt and verify plain-file type and unchanged bytes before removal. Treat missing, changed, malformed, unreadable or unremovable lock state as an explicit nonzero cleanup failure and preserve unexpected state. Catch that cleanup failure separately so the result receipt is still attempted, with the original apply/rollback outcome and the cleanup error both retained. Failure to write the receipt itself remains a separate I/O failure; this request does not assume that a full disk or process kill can always produce a receipt.

Suggested focused verification for the owner: independently exercise missing lock, malformed lock, changed JSON with the same PID, different PID, and unlink failure. Each must preserve unexpected data, return failure and attempt a receipt containing the addition/rollback state. Exercise the ordinary unchanged-lock cleanup as the passing control.

## Independently verified preservation and content

I checked the actual files, not only the preparation summaries:

- All 644 private/admin/retained-input source files and all 644 corresponding backup files matched their manifest lengths and SHA-256 digests.
- All 881 primary preservation files and all 881 corresponding backup files matched their manifest lengths and SHA-256 digests. This is 3,050 file checks over 1,525 source/backup pairs. No checked leaf file was a reparse point. The results, with exact paths, are in `preservation-check.json`.
- The live primary `.git` inventory matched the frozen 92 entries exactly: 20 files and 72 directories, with no extra entry and no reparse point in the enumerated metadata. The checked primary, `.git`, private worktree and payload roots were plain directories. `HEAD`, `config`, `index` and `objects` remained absent, including at closing. See `inventory-check.json` and `closing-manifest.json`.
- The owned store has exactly the 19 object files listed by the payload: 16 loose files and the pack/idx/rev triplet. The full object-file inventory, lengths and digests match `integration-ready/objects` through the frozen payload manifest, with no additional store object file required to make the store's graph checks pass.
- In the owned `public-no-checkout` store only, I ran read-only `git fsck --full --strict --no-reflogs --no-dangling` with the private and main commits as roots. Native exit was 0 and output was empty. Read-only batch object checks found all 608 unique private-index IDs, each of type blob. The nine distinct direct object IDs from the ten direct refs are commits; the eleventh ref is the retained symbolic origin HEAD. The symbolic target and main/private ref bytes were read directly. See `owned-store-check.json`.
- I independently decoded the live private index and the prepared main index as DIRC v2, verified each trailing SHA-1 checksum, and compared every path, file mode and blob with the relevant commit's recursive tree. All 622 private entries match private commit `192990f3d6fc8b482875f14c5c1572cebd09bd36`; all 621 prepared primary entries match main `eb61e448789a95ef907ae6f6e28e2dd33ae4c8a8`. The independent private decoder also matches all saved decoded entries. See `index-check.json`.
- I independently computed Git object IDs from the two recovered historical-plan files using their literal bytes and the Git blob header. They are exactly `39190cea0d4b90e042d72585af066ec6c9169c99` and `68a68a97d2839725517654d0558287489875719f`. Computing the commit ID from the retained commit text yields exactly `192990f3d6fc8b482875f14c5c1572cebd09bd36`. See `reconstructed-identity-check.json`. I did not read or export a raw task transcript; the exact-byte identity result independently supports the historical content, while the authorship/source-operation provenance remains attributed to the worker's receipt.

The first owned-store Git attempt used backslash-form `safe.directory` arguments and was refused with native exit 128 before object access because the sandbox user differs from the repository owner. I corrected only the per-command argument to the actual forward-slash path and reran successfully. No global or repository configuration was changed. This reviewer setup failure is retained in `owned-store-check.json` and is not a defect in the reviewed script, whose primary/private path literals already use forward slashes.

## Safety conclusions and limits

The intended write set is explicit and content-pinned. `paths()` at line 17 restricts the destinations to the frozen object namespace and three top-level files and checks lexical containment. The actual frozen list is unique and contains the intended 22 destinations. The four frozen JSON inputs have literal digest guards at lines 9–12, and payload lengths/digests are checked at line 21. The private admin, source and backup preservation checks are explicit rather than inferred from `git status`.

The two preflights, missing-destination checks, plain-directory checks, existing metadata census, exclusive `wx` creation, and object/index/config/HEAD ordering provide a coherent additive recovery under the proposal's requirement that primary and linked writers be quiescent. HEAD is last. No reset, prune, checkout, ref write, source rewrite, global safe-directory mutation, build or publication is in the recovery script. Read-only Git commands disable optional locks, fsmonitor, automatic GC and automatic maintenance per invocation. The current inspected environment had only safe-directory Git config injection keys, and the inspected primary `.gitattributes:1` was `* text=auto`; I found no currently demonstrated filter or environment redirect in the reviewed launch context. Future launch-environment changes are outside this frozen-content check.

The rollback's central safety choice is sound: it first requires unchanged originals, exact original-plus-owned metadata, expected full added-file bytes and plain directories; then it removes individual created files in reverse order and only empty created directories. A partial file or foreign metadata delta causes retention instead of a recursive cleanup. The exclusive open is recorded before writing, so a partial write participates in that refusal. Neither finding asks to weaken these guards.

This is not an atomic filesystem transaction. There are check/use intervals during both installation and rollback. No independent read-only review can prove that a concurrent writer will not replace a path after a guard. The proposal already states this limit at line 37 and requires writer quiescence at line 29. I do not treat that explicitly accepted bound as a separate request for an unrelated filesystem redesign. Root must actually establish quiescence for any later apply and stop on changed preimages. The ignored recovery lock is not a Git-wide writer lock.

Config and the primary index are deliberate reconstructions. `integration-ready/config:1`–13 contains the documented clone defaults, matching origin and main tracking; it contains no claim to recover unknown local overrides. The surviving private index is preserved rather than reconstructed. The proposal correctly states that prior primary staging, local custom config, hooks and excludes are unknown. Restoring usability cannot certify those lost settings, and neither this report nor the owned-store check changes that uncertainty. Primary HEAD is an explicit choice of the retained main ref, not proof of a lost HEAD's former bytes.

The clone JobObject receipt reports native exit 0, assignment before release and zero remaining job members. I read the wrapper's held-worker/assignment/release path at `clone/run-owned-clone-job.ps1:163`–174 and its membership/close/identity-check cleanup at lines 190–270. These support the already completed clone receipt within its reported bounds. That frozen wrapper still invokes `clone/run-clone.cjs` at line 21; it is precedent, not a runnable apply wrapper. A later apply wrapper or command must be concretely bound to the accepted recovery revision and `apply` mode, must preserve the clone evidence, and must supply its own native result and cleanup proof. This report does not certify an apply launcher that is not present in the packet.

## Adjacent context checked outside the prepared script

- `C:/Users/38909/Documents/github/civ-engine/.git/worktrees/engine-feedback-1001/commondir:1` is `../..`, and `HEAD:1` points at `refs/heads/engine-feedback-1001`. The linked worktree's `C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/.git:1` points back at this exact administration directory. This confirms why recovering the common object store while leaving the private admin/index untouched is the relevant boundary.
- `C:/Users/38909/Documents/github/civ-engine/.git/refs/heads/main:1` is the accepted main ID; `refs/heads/engine-feedback-1001:1` is the exact private ID. These are surviving inputs, not proposed ref rewrites.
- `C:/Users/38909/Documents/github/civ-engine/AGENTS.md:79` says a main push publishes the downstream engine tarball. That adjacent policy substantiates keeping push/publication outside this narrowly scoped metadata recovery. Its byte preservation is covered by the primary preservation check.
- `C:/Users/38909/Documents/github/fleet/docs/skills/multi-cli-review.md:7`–11 contains the review pins, and its retaining-review section requires the substantive attributed report rather than a replacement synthesis. This complete report is retained for the root's eventual authorized disposition/retention.

## Unavailable checks and handoff

No apply, primary Git command, source/index/ref/config mutation, native status after repair, rollback execution, failure injection, product runtime/test/build, browser, network action, external review CLI, commit, push or publication was performed. `npm run ci:status` and normal product gates were not run because this bounded assignment explicitly forbids network and product/runtime subprocess work; it is a read-only recovery review, not a product implementation acceptance. The root's earlier remote-gate status is not revalidated here.

I did not rerun the candidate's preflight because its existing receipt makes that exact script intentionally refuse another preflight attempt. Instead I inspected that native-0/mutationStarted-false receipt and independently rechecked its content claims as described above. Native application and rollback behavior remain unexecuted. REC-001 and REC-002 are static control-flow findings, with concrete failure conditions, not claims that primary corruption occurred during this review.

No browser, GUI or server was launched. The synchronous Git checks and the one polled hashing shell completed; no persistent task process was intentionally left running. Only this fresh review directory was written. No worktree, primary file, prepared-packet input or permanent document was modified. The review directory and its evidence are intentionally retained for the open findings and handoff.

Root should dispose REC-001 and REC-002 explicitly, preserve this authored round in full, and obtain focused review of a repaired frozen script if the findings are accepted. Following such repairs, apply remains a separate decision and must independently satisfy native HEAD/index/fsck/status, preservation, final metadata inventory and process/lock cleanup acceptance. No engine feedback row, runtime hold or publication milestone is retired by this report.

<!-- Original authored report ends. -->

## Findings and disposition

| ID | Original finding | Accepted disposition |
|---|---|---|
| REC-001 P2 | Failure and rollback-refused receipts omitted actual created-file/directory inventories. | Accepted by root and repaired in revision1; focused review3 resolves it. Expected payload metadata stays separate from observed open/partial/verified lifecycle. |
| REC-002 P2 | Finally lock handling could bypass receipts, delete changed same-PID data or report foreign-PID cleanup as success. | Accepted by root and repaired in revision1; focused review3 resolves it. Exact bytes/plain-file identity, nonzero cleanup failure and original-operation preservation are required. |

## Verification

Original reviewer independently checked42 frozen entries at opening/closing,3050 source/backup file checks,92 metadata entries, all608 unique private-index blob IDs, all11 surviving refs, private622/main621 index entries and exact recovered historical blobs. Owned-store fsck was native0. The initial backslash safe-directory attempt failed128 before object access; the corrected per-command path passed without config mutation. R0 did not apply or execute failure controls. Original opening/closing/preservation/index/object records remain ignored and retained; their original provenance is in the complete report.

## Round outcome

Historical CHANGES REQUESTED, preserved exactly. Both P2 findings were accepted and subsequently resolved by review3; this original round is not relabelled PASS. Root later accepted the separate actual recovery apply. No feedback item, source behavior or runtime/publication hold is retired by this review.
