# Review 0: implementation

## Target

Engine90 base34de6af4af335f465322d084e43d13d36ef7dde6, staged tree dac39f20d84382c5b4ca3736b7d5ea5453f77634; exact23-file patch and files retained in tmp/folded-component-order-1108/review-1. Report and recoverable58-input binding remain in civ-engine/tmp/fold-order-review-1108.

## Reviewers and coverage

The independent native reviewer and exact coverage are attributed in the complete report below. External CLI coverage was unavailable; it is not inferred. The integration owner added this structural wrapper on 2026-11-08; authored report bytes are unchanged, SHA256 6491fd4292ea0c455e07b3496a192c1df968745c6c959eaa323345f1339bfcbb.

## Reports

# Work90 exact implementation and integration review

Date: 2026-11-08. Reviewer: independent native pinned Astra/xhigh lane `/root/spool_review`. **No material findings in the reviewed source/integration scope.** The component-order correction and regression coverage are acceptable for root's remaining full gates and retained-artifact verification. This is not shipping acceptance, a reproduced game result or external CLI coverage.

Target: `C:/Users/38909/Documents/github/civ-engine-worktrees/folded-component-order-1108` (R below). Verified base HEAD: `34de6af4af335f465322d084e43d13d36ef7dde6`. Reviewed staged tree: `dac39f20d84382c5b4ca3736b7d5ea5453f77634`. Frozen candidate manifest SHA256: `D31773C1DBACA33351CC2D0BACBC7F7E44AAA03B951D3DDDF62EA957702E4895`; patch SHA256: `A3BE978DF934E4A82C0BD3AAA43BDD128C54F2D65EE15108905450F51D096A42`.

## Correctness and scope

The only behavioral production change is [apply-tick-diff.ts:67](C:/Users/38909/Documents/github/civ-engine-worktrees/folded-component-order-1108/src/apply-tick-diff.ts:67): after applying one component type's set/removal operations, the fresh nonempty row array is sorted by numeric entity ID. `ComponentStore.entries()` traverses its sparse array in ascending index order at [component-store.ts:102](C:/Users/38909/Documents/github/civ-engine-worktrees/folded-component-order-1108/src/component-store.ts:102), and [world.ts:78](C:/Users/38909/Documents/github/civ-engine-worktrees/folded-component-order-1108/src/world.ts:78) serializes that traversal directly. A newly present lower ID otherwise goes to the end of the fold's Map. The comparator restores the actual producer order; it is neither lexicographic sorting nor a change to expected game data.

The change preserves complete values, duplicate-key reduction, removal precedence, empty-store behavior, entity generation/free-list logic and unmodified component stores. Sorting mutates only the newly allocated `Array.from(map)` array; it cannot reorder the input checkpoint or diff. The helper continues to reuse nested values internally, as before. Public [snapshotAtTick:407](C:/Users/38909/Documents/github/civ-engine-worktrees/folded-component-order-1108/src/session-bundle-diff.ts:407) validates continuity and returns a structured clone of the completed fold, preserving its detached public result. There is no new alias or input mutation introduced by this correction.

The game's `resource` component is distinct from engine resource pools. [resource-store.ts:273](C:/Users/38909/Documents/github/civ-engine-worktrees/folded-component-order-1108/src/resource-store.ts:273) deliberately emits pool/rate Map insertion order. The resource-pool branch at apply-tick-diff.ts:72–99 remains unchanged and unsorted. Applying the component correction to that branch would have been incorrect; this patch does not do so.

The existing partial-hydration bounds remain real: RNG, configuration, component options and non-pool resource bookkeeping come from the chosen checkpoint, and the helper's documented multiple-destroy/recreate-in-one-tick generation limitation remains unchanged. This repair is an ordering correction for represented component rows, not a general promise that a folded World equals a fully replayed World. The public docs explicitly say **changed** component rows; unchanged externally supplied array order is not silently normalized. Old checkpoint behavior, failure/range/continuity guards and bundle bytes are not changed.

I read the complete changed helper, its complete preimage and the new135-line regression file, then inspected the actual component-store traversal, World serialization, ResourceStore serialization, public fold selection/cloning, recorder periodic snapshot path, existing related assertions and partial-diff contract. The tree delta confirms no setter-observation implementation, public option/type export, schema or dependency change. A text search of src, public-surface fixture, README and API reference found none of the rejected WorldRuntimeOptions/stateObservation/setterOnlyKeys surface.

## Regression and retained-check evidence

[snapshot-component-order.test.ts:8](C:/Users/38909/Documents/github/civ-engine-worktrees/folded-component-order-1108/tests/snapshot-component-order.test.ts:8) runs each lifecycle from both an initial snapshot and an actual recorder-written periodic checkpoint. The public fixture creates literal IDs0–11, uses IDs2/10/11 to distinguish numeric from lexical order, registers a real system, steps a World, records through SessionRecorder/MemorySink and captures live serialization. No private fold substitute or hand-authored successful result stands in for the public path.

The three scenarios exercise late lower-ID component insertion, removal/re-addition, and destroy/recycle with a changed nested payload. Reuse requires actual ID2 and a live generation increment. Targets are strictly before the terminal end and after the selected base; [lines67–73](C:/Users/38909/Documents/github/civ-engine-worktrees/folded-component-order-1108/tests/snapshot-component-order.test.ts:67) require no target snapshot and require the periodic base when used. Thus a checkpoint-return shortcut cannot accidentally satisfy these cases. The recorder's actual periodic path at session-recorder.ts:398–401 supports that setup.

The assertions compare literal expected rows, ordered folded IDs, complete live component arrays and the whole component object without sorting expected results. They retain a separate unaffected store, verify source bundle/live inputs before and after folding, and mutate returned arrays to test detachment. This is adequate focused coverage for the changed representation class. It does not claim every possible partial-hydration field or every entity lifecycle was newly proved.

I inspected actual JSON assertions and native child receipts. `red-1/receipt.json` has no child execution and failed a source-hash preflight; it is not behavioral RED. The actual preimage SHA256 is `A84CA551C59DC23B62DA0F7194CC723879AE25A4B85B5038F34814B4A23A888A`, matching red-2. All six red-2 assertions fail at the intended row-order check: actual `[10,11,2]`, expected `[2,10,11]`; child exit1, no signal. The unchanged regression file SHA256 is `F6232769986B4411600E95FCF673879F812B43C69D92E5F4EE65DFC4374F5C38`.

`green-1/tests.json` contains81 passed assertions in six actual files:11 applyTickDiff,34 viewer,10 bundle-diff,10 snapshotAtTick,6 new ordering cases and10 release cases. The receipt binds the repaired helper SHA256 `43F24E042B0F34DC386C53F9AE6A35FCE6B3D5976D371D8692A1AF7CE94D3342` and the same regression file. Focused tests, typecheck, lint and build each have a native-zero child receipt. Retained red/green process records report no timeout and no remaining observed owned processes; no new census was performed here.

Those checks built **2.13.0 metadata**, as the actual build stdout shows. The frozen final source/version/locks/README now say2.13.1. The work90 plan explicitly preserves this distinction and leaves the final build/full gates pending. The focused receipts validate the repaired helper/test bytes, not a previously completed final2.13.1 release build.

## Documentation and integration records

Patch2.13.1 is appropriate for restoring an existing serialization representation contract without an API or format addition. package.json, both root lock version locations, the MCP local-root lock entry, src/version.ts and README agree. The changelog explains the lower-ID trigger, unchanged values/bundle bytes, no migration and partial-replay limits. API reference, bundle-viewer guide and session-recording guide describe the same bounded behavior; no structural engine change requiring an architecture rewrite is introduced. The defect register records the observed class, exact regression file, genuine RED and focused GREEN without claiming full gates already passed.

Work89/game160 records are retained as a rejected experiment, not shipped option documentation. The current decision at work89 plan:10 and its rejection at line68 agree with the preserved independent result review:168 treatment pair2 ratio1.010242693 violates the frozen all-signs rule despite favorable medians. The work71 current22:48UTC paragraph explicitly supersedes older historical checkpoints and keeps work157's original fold assertion open. The priority/devlog updates preserve source, cost, replay, consumer and delivery boundaries. I reviewed these integration claims against the included authored result/diagnosis records; I did not rerun or independently recompute the24-pair screen or parse the large game recordings in this task.

The original work89 implementation review at reviews/0_implementation.md is byte-identical to my retained authored source review, SHA256 `542FD533391E0B4EDC7BCB1964FA28C9F3AFCE22B34F7963AE0FDEEFB9219299`. The accepted design remains `2FECADBC12CFF7BCC4A30B7D219249B38C1673E93618F05EADD5417BF5B3FD39`; its proposed API remains historical through the explicit rejection record. The new result review is preserved at `78210B859E6B75ED321807945D093E877C4B813BCCDAB0C2E4831324CA86F0B6`. The retained owned plan differs only by CRLF-to-LF normalization:13,506 original bytes to13,505 current bytes, with original content retained. No authored review was silently rewritten.

## Binding and remaining work

All23 candidate files match both the live tree and frozen files/ copies in byte length and SHA256. Their canonical LF Git blob hashes independently match all23 paths in tree `dac39f20d84382c5b4ca3736b7d5ea5453f77634`; the tree's delta from34de6af contains exactly those23 paths. Direct `git -C` reads were denied by the environment; bounded read-only access through the primary Git object store and worktree metadata verified the same tree/base without a mutation or approval escalation. This is an exact scoped review, not a full-codebase audit.

Root still owns all eleven final gates, rebuilding2.13.1, the unchanged retained-artifact verification, merge/main/push/CI, actual retained release adoption and cleanup. The original work157 ordered comparison must remain unchanged; this report does not convert its still-failed original receipt into acceptance. No performance gain, complete game proof or setter-option shipment is inferred.

This reviewer ran only bounded file/text/JSON/hash and read-only Git operations. No import, test, build, application/runtime, process operation, browser, lock, install, Git mutation or delegation was executed. Only this authored report and recoverable binding were written under `civ-engine/tmp/fold-order-review-1108`.


## Findings and disposition

No material findings. Root accepts the scoped numeric component-order repair, regression tests and integration record. Final gates, released artifact and the unchanged game comparison remain required.

## Verification

Reviewer verified all23 candidate files and canonical Git blobs, six genuine RED failures and81 focused passes/types/lint/build. First final2.13.1 gates passed10/11 steps; the only failed test was the work89 review Target heading, corrected by the structural wrapper above. All2118 other root tests and22 MCP tests passed; no code was changed for that failure.

## Round outcome

Exact implementation accepted for final gates and delivery. No performance or complete game acceptance claim.
