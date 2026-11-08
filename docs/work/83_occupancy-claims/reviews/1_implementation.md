# Independent implementation review: placement-only occupancy

## Target

Repository: C:/Users/38909/Documents/github/civ-engine-worktrees/occupancy-claims-1107. Base/HEAD 301dd86823762bd4dd50c6170591b7b0cd8c9de9; branch codex/occupancy-claims-1107; exact final staged tree 91116fe9b926f3454a90dc887541db25891d099b, candidate version 2.10.0. The target contains 43 changed paths. The original source freeze was daf5b94ab9f3357d37eab7ced2f79740c12914e3; final product source is unchanged from that tree. The five-path delta adds two negative empty-input tests, investigation records and root's two canonical status documents.

The final packet at tmp/occupancy-claims-1107/review-packet-final.json has SHA256 F525CE088930152DBE63520B35A0EF652B1BF7FE2D3391EF7541D0CED871065D; review-candidate-final.patch has SHA256 2A344AA8CDCC46114BAACD9D601AE816DB03AFE7A656006F194CFF1796BBBE9E. I independently checked every one of the 43 packet file hashes. All matched. Read-only Git comparison of the index against the final tree and of tracked working files against the index both exited 0 at initial and closing inspection. No write-tree, staging, source mutation or commit was used.

Accepted design inputs are preserved in snapshots/0_accepted-plan.md, SHA256 D7A16EB8AB9BEB17F736616D4FFB417987399E51B516713453D9E81AD2F1C36D, and snapshots/0_accepted-design.md, SHA256 A2DF26CFE74F6F978E7DB9A5031DCA13EC245A4A4C2568E10E1086B32C8AE7. I independently matched both hashes and read the coordinator's accepted contract. This report does not replace review 0.

## Reviewers and coverage

Reviewer: /root/publisher_review, assigned native Astra/xhigh independent lane. Owner: /root. I inspected the exact product/type/export/version/public-fixture changes, all four new test files, retained control source and logs, affected API/guides/architecture and task records, and relevant unchanged raw-grid, subcell, normalization, lifecycle and existing-test code.

The assignment was read-only except for this allocated review file. I ran no tests, builds, gates, benchmarks, installs, game runtime, browser, network request, external model CLI or subagent. I did not independently rerun worker evidence or hosted jobs. No reviewer-owned browser, GUI, server or persistent runtime process was launched.

## Reports

**Verdict: bounded SOURCE PASS, with no material implementation finding.** The candidate implements the accepted additive occupancy policy and failure boundary. The minor guide wording below should be corrected without another implementation review round. Full eleven-step gates, pack/publication, retained compiled-runtime acceptance, downstream adoption and final delivery remain root-owned and pending.

### Placement, movement and reservation semantics

src/occupancy-binding.ts:166 validates the area, then detached metadata, then the new boolean policy before claim mutation. The solid branch checks other crowded occupants; the passable branch permits a footprint beneath them. Both still call the unchanged raw OccupancyGrid.occupy at :175, so movement permission cannot bypass whole-cell placement or reservation exclusion. Only after raw success does :179 install/remove the policy, release the same owner's subcell and update metadata/lifecycle flags. A failed late footprint conflict leaves previous raw claims, reservation, subcell, metadata, policy and binding version intact.

The unchanged surrounding implementation is important: src/occupancy-cell-grid.ts:120 checks every requested cell before replaceClaim, then clears the same owner's reservation; :265 checks static, occupied and reservation identities. Its state shape and implementation are byte-identical to the base. This supports atomic placement reasoning independently of the candidate's helper or tests.

src/occupancy-binding-policy.ts:29 delegates directly to the raw isBlocked when the private policy set is empty. With a passable occupant it filters that occupied claim only; :35 retains the static check and :36-37 separately considers reservations against the actual querying ignoreEntity. Consequently a passable owner's reservation still blocks another mover, and includeReservations:false does not waive placement ownership. No movement query materializes getState or calls getCellStatus/free-slot logic recursively.

Binding isBlocked at src/occupancy-binding.ts:96 still adds full subcell crowding. The constructor's subcell blocker at :74 uses the same movement filter before the original custom veto. The unchanged src/occupancy-subcell.ts:252 still selects slots only after blocking checks, applies preferred-slot/offset validation and uses deterministic occupancy/ranking rules; :322 supplies the mover's default ignoreEntity. The candidate does not widen a custom subcell veto into the binding's separate isBlocked or status query. That deliberate existing scope is documented and tested.

src/occupancy-binding-status.ts:40 emits blocksMovement:false only for an opt-in occupied entry; the complete filtered placement ledger remains visible. Reservations, static and subcell entries keep their old shapes. :75 derives blocked from movement-relevant claims plus zero free slots. Claim objects and offsets are newly constructed. The shared metrics object remains valid because resetMetrics now resets its fields in place, rather than replacing the referenced object.

### Failure, lifecycle and versions

reserve at src/occupancy-binding.ts:202 and occupySubcell at :263 preflight coordinates/metadata before raw mutation. The latter commits subcell placement before clearing only that entity's whole-cell/reservation/policy state. Failure returns before the conversion. Empty metadata on conflicting targets intentionally throws where the old code returned false/null, and fewer raw scans may occur; API/changelog/design explicitly disclose that unsupported-invalid-input precedence and counter change. This is not a promise of identical error ordering for every malformed JavaScript object. Nonboolean movement policy rejects before mutation; omission means solid on every occupy call.

Policy changes participate in one binding-version increment, while normalized identical cells, metadata and policy remain idempotent. clearReservation does not remove occupied policy. release at :304 clears raw claims, subcells and policy, and attached-world destruction uses that same callback. Successful whole-cell-to-subcell conversion removes policy at :277. Default-solid replacement and release return movement queries to the empty-policy fast path. detachWorld keeps its pre-existing semantics: it stops automatic cleanup; the caller remains responsible for claims while detached. The tests explicitly release detached claims before reattachment, rather than claiming retroactive cleanup of missed destruction.

Empty areas already reject at unchanged src/occupancy-internal.ts:14 before any mutation. The later empty-area hypothesis therefore found no production defect. The worker restored the original source and added tests for the actual existing contract; I verified the final binding SHA256 remains 8B6EF1BE766DEFBF8AD50A6F84669A4A27EE822366FE0C094CA3AF40300E0C2D. No empty-area repair or regression sensitivity success is inferred from the mistaken test run.

### Public surface, defaults and documentation

The only new public named type is OccupancyBindingOccupyOptions, exported through occupancy-grid.ts and both curated entry points, with blocksMovement?: boolean and inherited metadata. OccupancyCellClaim adds the optional tag. Both public name/member pins change accordingly; reserve/block retain metadata-only declarations. Existing valid metadata options remain assignable to occupy. tests/occupancy-claim-types.test.ts checks Node/browser equality, old-options assignment and compile-time invalid strings/reserve/block literals.

Version 2.10.0 is synchronized in package.json, both root lock version fields, the MCP linked parent entry, src/version.ts, README and changelog. Lock diffs contain version fields only; no dependencies or package export-map behavior change. Raw OccupancyGridState, subcell state, world serialization and policy files remain unchanged. OccupancyBinding adds no persistence surface or mutable-grid accessor; consumers must store/reapply game policy themselves.

The API and affected guides distinguish blockedBy placement evidence from blocked movement, independent reservations, full capacity, custom veto scope, omission resetting policy, atomic failures and cleanup. Architecture records the private policy/status composition without adding automatic tick work. The runtime source remains under the repository's 500-line ceiling. The unchanged tests/occupancy-grid.test.ts:280 literal metadata shapes, :334 solid crowding conflicts and :380 capacity/ignoreEntity behavior remain intact, as does :101 raw state round-trip coverage.

The additional canonical priority/work71 edits truthfully describe occupancy as in review/unshipped, separate producer capability from downstream adoption, and preserve historical records. Their cross-project hosted/runtime statuses are coordinator-authored context, not newly reproduced by this review. Work84 is an allocated placeholder, not accepted implementation in this review. The owner decisions communicated after this frozen tree about fractional centers and combined chosen-route/schema3 work can be recorded separately; this source verdict grants neither implementation scope.

### Test and evidence assessment

The new literal matrix exercises default/explicit true/false claims; placement exclusion; footprints before and beneath units; free/full capacity; ignoreEntity; all named movement/subcell queries; a path through a two-cell claimed corridor; same-owner reservation independence; normalized repeated inputs; metadata/policy versions; successful moves; late static/reserved/occupied/crowded conflicts; failed conversion; release/destruction/reuse; detach/reattach; disabled crowding; custom vetoes; and input/output metadata detachment. Atomicity tests compare all 16 cell statuses plus binding version across the three mutation methods and coordinate/metadata/policy failures. The bounded-query tests spy on public raw lookup/state methods, forbid status recursion, verify raw counters and verify cleanup restores the default path. These tests observe contract outcomes rather than duplicating the policy helper.

Retained red.log records 21 failures and 8 passes across the two original test files, with actual intended assertion failures, not a startup failure. The preimplementation atomicity test preimage is byte-identical to the current file (SHA256 2FCB4EA498AA0E4E1AE68A0404B381F7CA7E07236E75EB5393693A6A7493E4FC); the earlier placement-test preimage is separately retained because later coverage grew. The worker attributes this run to unchanged baseline source; I inspected its results and baseline/current code, but did not rerun it or manufacture a stronger runtime provenance claim.

I read all seven actual control failure outputs and run-controls.mjs. Each result is a selected executed assertion failure with native status 1: raw subcell blocker, placement exclusion result, solid crowding conflict, hidden reservation, omitted policy version, metadata-after-mutation and stale release policy. Other cases in those runs were intentionally filtered/skipped, not failed or independently exercised controls. The controller restores saved bytes after each arm and in finally; its restoration hashes for occupancy-binding.ts and occupancy-binding-policy.ts match the reviewed final files. This is seven bounded controls, not exhaustive mutation coverage.

restored-focused-final.log records 10 passing files and 91 passing tests with no skipped tests reported. Earlier logs retain 52, 79 and 89 passing populations. focused-receipt.json records focused/typecheck/lint exit 0 for the earlier receipt; final typecheck-final.log and affected-lint-final.log are empty, so their fresh success is worker-reported rather than independently established by text output. The final test-count log is inspected evidence, not a reviewer execution. work-docs.log reports 85 units checked. No full gate, benchmark, build, consumer test or throughput acceptance is claimed.

empty-footprint-red.log shows two unexpected occupancy_area_empty exceptions, with four filtered cases. empty-investigation.json separately reports the broader attempted run as 89 passes/2 failures and retracts the hypothesis. The two final negative cases now assert unchanged prior policy/version and correct fast-path lookup behavior; they are additional contract coverage, not evidence that empty requests were ever accepted.

## Findings and disposition

| ID | Priority | Finding | Disposition |
| --- | --- | --- | --- |
| V1 | Minor documentation | docs/guides/rts-primitives.md:59 says ignoreEntity only ignores occupy/reserve claims. The binding also ignores that entity's subcell for movement/free-capacity queries, already shown by unchanged occupancy-grid.test.ts:380 and the new placement-only tests. | Change the sentence to footprint, reservation and subcell claims, while keeping static blockers unaffected. Existing adjacent wording issue; not an implementation blocker and no new review round needed. |

No material atomicity, reservation, lifecycle, default-behavior, public-surface, persistence or unsupported acceptance-claim finding remains in the reviewed candidate.

## Verification

Initial and closing exact-index comparison to 91116fe9b926f3454a90dc887541db25891d099b: exit 0. Initial and closing tracked worktree comparison: exit 0. All 43 packet file hashes matched twice. Product source diff from original daf5 freeze is empty. Accepted plan/design snapshot hashes and control-restored source hashes match. Protected raw-grid/subcell/normalizer/old occupancy tests and AGENTS/policy paths have no candidate diff.

Worker preservation-pre-review.json reports five protected primary package/lock/dist/dependency hashes unchanged, private Node/MCP dependency roots, local MCP parent link and version-only locks. I read that receipt and independently verified the lock diffs; I did not rehash shared dependency trees or execute dependencies. focused-cleanup.json is a bounded task-path process scan with no matches, explicitly not a descendant census. No reviewer process cleanup was needed because no persistent task runtime was launched.

Only this review file is written by the reviewer. No prior authored report, source, test, registry, index, branch or history is changed.

## Round outcome

Accept the exact 91116fe9 candidate for the bounded implementation contract, subject to root's required full eleven-step gates and delivery acceptance. Correct V1 as a minor documentation follow-up. Keep the rejected empty-input hypothesis and its logs honestly attributed. Root owns final records, integration, full gates, pack/retained runtime verification, main/push/hosted publication and consumer adoption. This verdict proves no game policy, performance gain, persistent binding round trip or already-shipped capability.
