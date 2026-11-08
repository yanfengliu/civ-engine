# Review 0: implementation

## Target

Engine work86 E09/E10 structural occupancy-binding diagnostics in `C:/Users/38909/Documents/github/civ-engine-worktrees/occupancy-probes-1107`. Base/HEAD `22f3e19746cd50da264aaba259856d625b833e2a`; frozen staged tree `0f9e08aa0335180699d6b8a172f93c6e03f54dae`, 15 changed paths. I verified that the index equals this tree and the tracked worktree equals the index, and independently checked all 15 manifest file sizes and SHA-256 hashes.

The retained patch `tmp/occupancy-probes/review-candidate.patch` is 36,703 bytes, SHA-256 `31C535AC9BD3DFA31CE74AFEF2B4B0AA6D102A67944CC502CE11A3FCA138619F`; `review-candidate.json` binds the full base, tree and file census. The reviewed helper `src/occupancy-debug-probe.ts` is 4,274 bytes, SHA-256 `D4CD0920BF50248A016523ED219F5033B2D1A9A9FCDE4A831C76D8F3A63C8C06`.

This is an unshipped implementation review. Package version remains the base 2.10.1 intentionally. Refresh onto work85, a separate additive version, changelog/devlog updates, all eleven gates and delivery are explicitly pending; their absence is not treated as an accidental release of the new API under 2.10.1. Coverage does not automatically transfer to the refreshed tree.

## Reviewers and coverage

Independent native Astra/xhigh reviewer `/root/publisher_review`, assigned by root. I inspected the entire new helper, public exports/type pins, complete new test file, all changed public documentation and the current plan, plus the unchanged raw debugger probe, WorldDebugger capture path, occupancy cell types, binding query implementation and metric behavior. I inspected the retained baseline/final logs, correction history, all three mutation failures and their restoration receipts.

This was read-only source/evidence review: no test, runtime, build, benchmark, install, browser, gate, network query or external reviewer/source export. The only authorized write is this full review record. Root owns implementation, execution, refresh and release.

## Reports

### Independent native Astra/xhigh source review

**Conclusion.** No material finding was identified in the exact frozen candidate. The separate structural factory supplies bounded retained detail without exposing a mutable raw grid, changing the old raw probe, or presenting sampled counts as global occupancy totals. The API and docs correctly distinguish read-only occupancy state from observable query instrumentation, and distinguish limits on calls/retained output from the complete status allocation performed by the underlying source.

**Structural API and unchanged contracts.** `src/occupancy-debug-probe.ts:6` requires only readonly width/height/version and a getCellStatus method. OccupancyBinding satisfies this directly; the implementation never reaches into its private grids, policy set, metadata map or lifecycle hooks. Calling `source.getCellStatus(x, y)` retains the source receiver, so the binding method works without an adapter or rebinding. There is no new automatic tick hook, default debugger registration, occupancy mutation or persisted format.

The factory and its three public types are re-exported through world-debugger and both Node/browser barrels. The public-surface fixture adds exactly the new factory and types at the relevant surfaces. The helper's reference back to DebugProbe is type-only, introducing no executable import cycle or Node-only browser dependency. The helper is 94 lines and world-debugger is 447 lines, below the repository's 500-line target.

The old `createOccupancyDebugProbe` implementation in `src/world-debug-probes.ts:18` is byte-unchanged from the base. It still reads getState and returns width, height, version, blockedCells, occupiedEntities, occupiedCells, reservedEntities and reservedCells. The new test requires exact object equality for those eight fields with real blocked, occupied and reserved grid claims. No sampled binding detail replaces these existing totals.

**Input validation precedes cell reads.** At `occupancy-debug-probe.ts:54`, width and height must be positive safe integers. The explicit region must be an object rather than an array, with nonnegative safe coordinates and positive safe dimensions. Subtraction-based bounds checks avoid accepting an overflowed coordinate-plus-size sum; the region area must independently be a positive safe integer. Both limits are nonnegative safe integers, with defaults 64 and 256 and zero explicitly allowed. Invalid limits and rectangle fields throw the documented EngineError code and field detail before getCellStatus is called.

The rectangle and numeric limits are captured at construction. Later mutations of the caller's options do not change the query region or budgets. The structural source itself remains live, with version and current cell status read for each capture; there is no status cache. The readonly dimension contract is the basis for retaining width/height at construction, consistent with OccupancyBinding's immutable dimensions. The factory is not a validator or isolation wrapper for malicious/custom sources that violate their declared return types.

**Limits, ordering and omission semantics are coherent.** At lines 75–78, at most min(requestedCells, maxCells) cells are queried once, in row-major order within the requested rectangle. No query is made outside that prefix. Zero maxCells performs no cell read and reports the full region as omitted; it does not imply that omitted cells contain no claims.

The single remainingClaims counter at line 74 spans every captured cell. Lines 79–82 retain blockedBy before crowdedBy, preserving the order within each source array, and decrement the same budget after each retained list. Claims are not independently re-budgeted per cell. Each row's omittedClaims is its actual returned source-array lengths minus retained entries; the snapshot sums these omissions over captured cells only. Omitted cells have their own exact count, and their unknown claim count is not guessed. This matches the API documentation.

The probe copies the source's blocked and freeSubcellSlots values unchanged, even when maxClaims is zero or the retained claim lists are incomplete. It therefore cannot falsely report an unblocked cell merely because the claim budget was exhausted. The output names requestedCells and omission counts and contains none of the old raw probe's global occupied/reserved/blocked counters.

**Policy, metadata, capacity and instrumentation retain their real meanings.** `detachClaim` at line 41 copies entity identity, kind and claim type, and conditionally copies blocksMovement, slot and offset. Its explicit undefined check preserves false rather than losing placement-only movement policy through a truthiness check. Offset objects, positions, claim objects, arrays and each returned region are new objects. Mutating one snapshot cannot alter the binding, original options or later output. No untyped internal metadata object is exposed.

Unchanged surrounding source confirms why the probe must preserve rather than recompute these facts. `src/occupancy-binding.ts:323` delegates getCellStatus to the existing status helper. In `src/occupancy-binding-status.ts:22`, a query increments cellStatusQueries; its slot loop at line 55 increments crowdedSlotChecks. The helper emits terrain, occupied and reservation claims before subcell claims, retains placement-only false on occupied claims, computes full free capacity at lines 69–71 and computes blocked from policy/full capacity at lines 75–76. The probe passes no ignoreEntity or includeReservations override, so ordinary default reservation and identity behavior stays visible.

The fixture test captures a placement-only farm, a villager subcell with slot/offset, and a reservation belonging to the same farm. It requires literal identities/kinds/policy and actual capacity, then checks two cell queries and four slot checks with unchanged version. The 300-slot fixture requires only 256 retained claims and 44 omissions while preserving full capacity zero and blocked true. Entity destruction is observed on a later capture through the binding's existing release lifecycle. The source code performs no release, resetMetrics, mutation or version write.

The limits are deliberately not an arbitrary-source CPU or constant-memory guarantee. Each visited getCellStatus can materialize its complete cell arrays and scan a large custom subcell layout before the probe truncates them. Retained output is bounded by the requested cell/claim limits, but one complete visited status remains part of transient cost. This limitation is explicit in the plan, API and debugging guide. A caller can intentionally choose larger safe limits; the defaults are not an immutable global ceiling.

**Exceptions and debugger integration remain straightforward.** There is no catch or replacement of a source exception. The dedicated sentinel test requires object identity on a thrown source error. Unchanged `src/world-debugger.ts:183` invokes each registered capture and validates its returned JSON before storing it, and addProbe at line 131 accepts the new factory through the existing DebugProbe contract. The actual binding integration test captures through WorldDebugger and checks JSON round-trip equality. The docs' addProbe example uses that real method.

**Tests and documentation support the stated scope.** The new file contains 21 expanded cases covering exact raw compatibility, real binding metadata/reservations/subcells, aggregate truncation, deterministic region prefix, zero/default limits, invalid regions/limits/unsafe area before queries, option/result detachment, destruction, a large real subcell layout, debugger JSON integration and exception identity. The invalid-input tests establish no cell reads on failure. The source inspection additionally checks the missing/null region and invalid source-dimension branches without claiming those were all independently exercised at runtime.

The API reference gives separate sections for all three types and the factory. The guide, RTS page, README and concepts text consistently describe detached sampled detail, explicit truncation and normal query metrics. Architecture records the helper and its inspection-only boundary without adding it to the World tick lifecycle. The underlying OccupancyBinding/status/types/raw probe and package metadata have no candidate diff. The scope does not promise a full-grid summary, a new mutable-grid escape hatch, occupancy lifecycle repair or game-specific policy.

## Findings and disposition

No material finding or required source repair was identified. The current implementation/contract is suitable for the planned work85 refresh and additive-release preparation.

No gate, release or downstream acceptance is inferred from this source pass. Version/changelog/devlog work is an explicit pending integration step, and the refreshed source must be checked for relevant differences before the final gate. The largest-cell cost and metric side effects are documented limitations rather than defects hidden behind the word bounded.

## Verification

I independently verified the frozen index and tracked worktree, all 15 candidate file sizes/hashes, the 36,703-byte patch hash, exact export/public-pin diff, unchanged surrounding contracts and line counts. I inspected retained evidence; I did not rerun it.

- Corrected baseline: `corrected-fixture-red.log` records 20 missing-factory assertion failures and one passing old raw-probe control. These failures establish absent surface, not twenty independently demonstrated behavioral defects. The retained harness restores the exact baseline world-debugger module for the run and restores candidate bytes in finally; its restoration hash matches the candidate debugger file.
- Initial failures remain visible. The earlier RED included three invalid custom-offset fixture errors. The first candidate run records 56 passes and five failures from the same centered-offset assumption; the actual custom slot contract is [0, 1). The corrected fixture values and complete current tests conform to that unchanged contract. No subcell-validation product repair or weakened assertion appears in the frozen candidate.
- `green-corrected.log` records 61 passing cases across five files. `final-focused-receipt.json` records final typecheck and affected lint exits 0 at 2026-11-08T05:17:19.1294127Z, with a task-path process count of zero. The successful type/lint logs are empty files; their silence is not independent output evidence beyond the exit receipt.
- Three retained source controls each exit 1 with the intended native assertion: removing the cell bound produces six calls instead of four; removing crowded-claim truncation retains 300 instead of 256; sharing the returned region lets a prior result's x=5 contaminate the next capture instead of x=1. Each control runs one selected case and skips the other 20; those skips are not counted as executed passing controls.
- All three control preimage hashes equal the current helper hash `D4CD0920BF50248A016523ED219F5033B2D1A9A9FCDE4A831C76D8F3A63C8C06`. I inspected their mutation anchors, actual assertion logs and finally restoration logic. The candidate index/worktree check also confirms the mutations were not left in the frozen source.
- The separate retained process check explicitly says its earlier unelevated CIM attempt was unavailable rather than counting that failed scan as a proven zero. I launched no runtime or process requiring cleanup in this review.

No full eleven-step gate, refreshed work85 integration, new version publication, hosted CI or retained-package runtime smoke was executed or accepted here. There is no timing, FPS, constant-RSS or game-adoption claim.

## Round outcome

SOURCE PASS, no material findings, for exact staged tree `0f9e08aa0335180699d6b8a172f93c6e03f54dae` against `22f3e19746cd50da264aaba259856d625b833e2a`. Root retains ownership of refresh, additive version/canonical shipping records, all eleven gates, main/push/CI and retained-package acceptance. Earlier records and product/index bytes are preserved.
