# Opt-in setter-observed state with unchanged defaults

Status: active
Owner: Codex root
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

Current decision,2026-11-08: candidate rejected by the frozen usefulness rule; no runtime option or consumer adoption will ship. Earlier implementation checkpoints below remain historical.

The default engine fingerprints composite state at tick start and again for slots not explicitly dirtied. The audited AoE2 fog-memory slot already uses detached cache/read/write ownership and explicit publication, so its automatic scans may be avoidable. Add an optional runtime-only exact-key declaration with unchanged defaults, then adopt only for fog memory if whole-class correctness and the predeclared usefulness threshold pass. No gain is assumed.

## Scope

The owner explicitly approved the independently reviewed [design](design.md) and conditional adoption on2026-11-08. Exact proposal SHA2562fecadbc12cff7bcc4a30b7d219249b38c1673e93618f05eadd5417bf5b3fd39; independent design judgment is [work71 review5](../71_engine-feedback/reviews/5_design.md). This tree starts at34de6af4af335f465322d084e43d13d36ef7dde6, engine2.13.0. Source/test/API/docs/minor-release changes belong here; game adoption uses the root's separately controlled AoE2 worktree. No saved policy field, dependency/model/security change, default-scanner removal, other-slot adoption, work73 repair or visibility optimization is authorized.

## Approach

Copy exact-string setter-only keys into immutable per-World runtime configuration. Selected keys skip both automatic fingerprint phases but retain existing set/delete/full-serialize validation, identity and temporal bookkeeping; hidden in-place mutation and tick-scan getter/validation observations are intentionally outside the selected contract. Unselected/default keys retain all existing semantics. applySnapshot preserves receiver policy; explicitly configured construction/deserialize/live/load/replay factories restore it without serialized fields.

Use TDD with existing World runtime calls before implementation, meaningful default controls and exact original exception identities. Independent missed-publication controls use a one-sided mutant or literal expected fog appearance/removal; include read/write clone removal controls so both arms cannot silently share the same defect. Root owns exact review, integration, runtime scheduling and delivery. No runtime without the serialized lane grant.

### Prepared engine boundary

The proposed concrete public type is WorldRuntimeOptions with optional stateObservation.setterOnlyKeys: readonly string[]. World construction accepts it as the second argument; deserialize accepts WorldRuntimeOptions intersected with its existing restorePoison option in the third position. applySnapshot retains its existing restorePoison-only signature and the receiver's copied declaration. The implementation boundary is WorldCore construction, the two WorldTick fingerprint loops, deserialize forwarding, and type exports; setState/deleteState/serialize, WorldConfig and snapshot formats remain unchanged. Root accepted rejecting malformed present key lists with EngineTypeError config_invalid and details.field stateObservation.setterOnlyKeys; empty-string keys are valid exact keys. Runtime fields are registration, never snapshot data.

Three prepared test files call the existing World constructor/deserialize directly before implementation; the extra runtime argument is passed by Vitest transpilation rather than importing a nonexistent helper. Observation tests cover default/mixed worlds, original/read aliases, both between-tick counterexamples, equal/same-reference setter intent, full diff/order, deletion/reinsertion, immutable caller lists/nested options, exact case/whitespace/empty keys, late keys, primitives and strict windows. Error tests distinguish selected getter/toJSON scan omission from retained setter/full-serialize validation, original tick-start exceptions from diff-phase conversion/consumed tick, unselected failures, hidden invalid values and malformed declarations. Restoration tests cover unchanged snapshot/config shape, explicit/default deserialize, copied lists, receiver selection across present/absent/deleted/missing keys, registered listeners/systems, bookkeeping reset, legacy strict defaults and restorePoison/recover combinations.

Preparation inputs and nine source/document preimages are retained under ignored tmp/setter-state-observation-1108; the manifest also binds all131 existing test files. The approved design remains byte-identical at SHA2562FECADBC12CFF7BCC4A30B7D219249B38C1673E93618F05EADD5417BF5B3FD39. At that preparation checkpoint no existing tests or production files were edited. The first execution and source preparation are recorded below. Engine recording/seek/fold/fork controls and consumer C0 clone/publication controls remain required follow-on acceptance; they are not replaced by these focused runtime-boundary tests.

## Acceptance criteria

- [x] Genuine baseline RED for the selected contract, with default/unselected controls intact; no missing import or compiler failure presented as behavioral RED.
- [ ] All temporal, alias, setter intent, deletion/reinsert, invalid-value/getter/error phase and mixed-key contracts pass; selection cannot change through caller-list mutation, missing/deleted keys or snapshot replacement.
- [ ] Live/load/deserialize/applySnapshot/replay/seek/fork restoration is explicit and tested, with no snapshot/save/bundle field added.
- [ ] Independent exact implementation review, public-surface fixture, own API sections/guides/architecture as applicable and one additive minor release reconcile truthfully. Existing engine gates pass before code commit/push; retained artifact and hosted matrix pass.
- [ ] Candidate-default versus shipped default and selected versus default isolate feature-off overhead and policy benefit. Actual120/168 saves, idle and fog-write-heavy fixtures preserve full state/diffs/events/execution/economy/non-timing observations and ordinary recording/seek/fold contracts.
- [ ] Before any measurement, freeze exact A/A arithmetic, paired-ratio aggregation, sample/warmup exclusions and time/memory/artifact/attempt limits. Require at least5% median whole-step CPU improvement on both late inputs beyond A/A noise, consistent sign across the fixed alternating pairs, and no greater-than5% regression beyond noise on write-heavy/default controls. Insufficient benefit records rejection rather than weaker criteria.
- [ ] Conditional AoE2 fog-memory-only adoption passes its required integrated/native/full-match/clean/hosted acceptance; main/push and owned cleanup complete. No universal speedup or constant-memory claim.

## Implementation steps

- [x] Preserve the owner-approved proposal and independent proof clarifications; allocate89 and create a separate tree with private physical dependencies.
- [x] Prepare meaningful contract tests and exact API option design; execute the bounded baseline lane before source changes.
- [ ] Implement narrow engine policy and focused controls/mutations; freeze source for independent review.
- [ ] Freeze consumer and measurement plans against actual current source/artifact, then run bounded parity/cost acceptance in the serialized lane.
- [ ] Ship the justified coherent change with required documentation, full gates, main/push/hosted/retained-runtime verification and cleanup; otherwise record an explicit rejected experiment.

## Outcome

The root-inspected baseline ran once against the unchanged existing World runtime on2026-11-08:70 cases,34 genuine expected assertion failures and36 passing controls; native exit1,1.72s Vitest duration, no setup/import error or timeout. The failed assertions cover selected scan omission, validation/input boundaries and restoration; default/unselected behavior and setter intent controls passed. Root accepted this RED before production changes. Exact receipt tmp/setter-state-observation-1108/red/receipt.json SHA25681081C1B463FE5ED492DEC741B2B3D27ED192C508DEE8708A4BC59AE6F809FD7 records four observed owned processes, zero stopped/leftovers, fresh task runtime census zero, unchanged protected baseline source/all131 prior test files and no shared-lock operation. This is correctness evidence only; it ran alongside root's separate untimed observer, not a timing experiment.

The minimal runtime/type/pin candidate is prepared and frozen in ignored source-packet.json SHA2564B92C8D6B748ABD48859F8ADDFD8BEBA4BB86DB48EE5D768AD97589B9864BA41 with13 file hashes, exact tracked patch and full copies. The three RED files remain byte-identical; separate type and ordinary recording/seek/fold/fork controls were added but have not run. Both name/member pins expose the additive option and inherited protected registration field truthfully. Setters, serialize, JSON validation, WorldConfig/snapshot shapes, package/version/dependencies and root-owned canonical status files are unchanged. Root granted the four sequential once-only focused checks with30s child bounds. Focused GREEN passed123 cases across11 files in4.95s; typecheck, affected lint and normal private npm prebuild/build each exited0. Native receipts report20 observed processes across the four jobs, zero stopped/leftovers and fresh task-path census zero after each; all13 frozen source/test hashes remained unchanged and the shared lock was untouched. The build is an unpublished candidate still labeled2.13.0, not a released2.14 artifact. No full gates, cost evidence, independent implementation review, commit or release is claimed.

Two documentation writes were rejected before process creation because automatic approval review applied the earlier preparation hold despite the later root authorization. The worker preserved both rejections and unexecuted patches, did not retry the denied writes, and referred the current authorization to root. Root inspected/applied both the initial API/README/serialization patch and the remaining seven guide/architecture/ADR63/drift updates through the same approval path. The rejected-action records and unexecuted worker scripts remain retained; neither rejection was bypassed by the worker. This is an approval-context incident, not a request to change policy or repeat the owner's already explicit contract approval. The approved design and original authored review remain byte-exact.

Consumer adoption and measured usefulness remain separate gates. C0 requires independent one-sided/literal fog publication and clone controls; C1 requires frozen noise/aggregation/exclusion/resource/attempt rules before any cost run. Neither the new option nor this RED establishes a speedup or permission to ship conditional fog-memory adoption. Root owns all runtime scheduling, final review/integration and delivery.

The compiled review freeze contains405 files including package metadata,1,619,298 bytes, all copied bytes rehashed against the private build. Its manifest SHA256 is3AC80387D5AD70213A38AC5C5DCBB601A1F5C19BB33DAD6635A48881551D788C; candidate-1/acceptance-preparation.json SHA256CD5F756178EF1D2BF2C2168394B31070EAF189017D0080CA35E8C6E1014F4399 binds all four native receipts, the original source packet and13 feature documentation paths. Root-owned work71/work88/priority updates are preserved but excluded from this feature artifact. No consumer installation or runtime import of the frozen compiled copy has occurred.

## Source acceptance checkpoint, 2026-11-08

The root read the exact independent [implementation review](reviews/0_implementation.md), SHA256542FD533391E0B4EDC7BCB1964FA28C9F3AFCE22B34F7963AE0FDEEFB9219299, and accepted its no-material-source-findings verdict. The reviewer independently verified13 source/test/pin files,13 feature documents and405 frozen compiled files with no drift, and inspected the70-case baseline (34 intended failures/36 controls) and123 focused passing cases plus native type/lint/build receipts. No cost, consumer, full-gate or shipment acceptance follows from this source result. Work160 now owns the separate approved fog-only conditional adoption and predeclared24-pair screen. Its first15-case run exposed strict-mode test setup faults; those failed outputs are retained and do not count as the intended behavioral RED. No release version has been changed and the candidate is unpublished.

## Conditional rejection, 2026-11-08

The fixed24-pair CPU screen completed22:42:23UTC with all24 native children successful and no exclusions, then returned the correct negative exit2. Late120 CPU median was0.901269759; late168 median was0.907821229, but its second treatment ratio1.010242693 violated the predeclared requirement that all three pairs improve. The other control bounds and wall checks passed. Five intended faults failed their actual publication/clone/factory assertions. Independent result review78210b859e6b75ed321807945d093e877c4b813bccdab0c2e4831324ca86f0b6 reconciled every denominator, raw sum, pair and aggregate without discrepancies. Reject engine89 shipment and game160 adoption; keep default observation. Favorable medians do not override the fixed rule, and noisy small CPU samples are not speedup claims. No additional measurement, full-record/profile/heap stage or new minor release follows. The prepared conditional follow-up packet remains unexecuted evidence. Root cleanup/lock release at22:42:25 found zero owned leftovers; source preservation and record delivery remain.
