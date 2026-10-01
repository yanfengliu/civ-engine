# M1: self-check coverage contract (accepted)

Base: civ-engine a2bfe02a6c722274a16e718692bd56902372a092 with the pending M0 dependency-only repair. Owner: engine-feedback worker; interface approver and downstream adoption owner: root. E22 is the sole behavior change in M1. No recording, metadata, snapshot or bundle format changes. Root accepted this exact contract on 2026-10-01. Implementation begins after M0 lands and its remote matrix/publish-dist boundary is green.

## Public types

```ts
export interface SelfCheckRange {
  fromTick: number;
  toTick: number;
}

export interface SelfCheckUncoveredRange extends SelfCheckRange {
  reason: 'no_payloads' | 'no_snapshot_segment' | 'failure_in_segment'
    | 'stopped_on_divergence' | 'all_checks_disabled';
}

export interface SelfCheckCoverage {
  horizon: SelfCheckRange;
  enabledChecks: { state: boolean; events: boolean; executions: boolean };
  checkedRanges: SelfCheckRange[];
  stateComparisonTicks: number[];
  uncoveredRanges: SelfCheckUncoveredRange[];
  complete: boolean;
  notRunReason?: 'empty_horizon' | 'no_payloads' | 'no_segments'
    | 'all_checks_disabled' | 'all_segments_skipped';
}

// Existing fields remain unchanged.
export interface SelfCheckResult {
  // ... existing fields ...
  coverage?: SelfCheckCoverage;
}
```

Coverage is optional on the interface so old consumer-created result objects remain assignable. Every successful return from SessionReplayer.selfCheck includes it. New interfaces are exported through the same curated root barrel as SelfCheckResult and covered by public-surface fixtures. No new runtime symbol or dependency is required.

## Meaning and bounds

Every range describes transitions `(fromTick, toTick]`, with integer ticks and fromTick strictly below toTick. The horizon itself may be empty. Its start is metadata.startTick. Its end is the existing replayableUpperBound: complete recordings use max(endTick, persistedEndTick); incomplete recordings use persistedEndTick. No recorded or declared tick beyond that bound becomes covered. Snapshot endpoints outside the horizon are excluded from the self-check segment list; eligible endpoints use ascending tick order and zero-length pairs make no comparison claim. Valid recorder/sink output keeps its current replay work and segment counts.

checkedRanges retains one interval per actually completed segment, including a segment that found a divergence. It is not a count of checked world snapshots. With state enabled, stateComparisonTicks lists each actual terminal snapshot comparison; state at intermediate ticks is not compared and is never implied to be. Enabled event and execution streams are compared for each replayed transition in a checked interval. Disabled checks remain false in enabledChecks and make no comparison claim. No new replay of an unanchored tail is added.

complete means at least one positive-length interval made a requested comparison, and the entire positive horizon is covered for the enabled checks without an uncovered range. It is independent of ok: complete true with ok false means all requested comparisons ran and a divergence was found. Partial flag selection can be complete for that selection; callers requiring all three must also inspect enabledChecks. All-disabled, empty-horizon, no-payload, no-segment and all-skipped cases are incomplete even when ok remains true. checkedSegments preserves its existing attempted-segment meaning for compatibility, including its existing value when all flags are disabled; that value alone is not evidence that a comparison ran.

uncoveredRanges partitions the remaining positive horizon with explicit causes. A tail without a later snapshot has no_snapshot_segment. A skipped failure segment has failure_in_segment. After stopOnFirstDivergence, all remaining transitions use stopped_on_divergence, including an otherwise unanchored tail. When no comparison runs, notRunReason explains why even for an empty horizon where no positive uncovered range exists. Reason precedence is empty_horizon, existing no-payload short circuit, all_checks_disabled, no_segments, all_segments_skipped. Missing tick entries inside an otherwise checked segment cannot support event-stream coverage: propose applying the existing assertContiguousTickEntries guard before segment replay, reporting its existing BundleIntegrityError/missing_tick_entries diagnostic rather than returning a fabricated complete result. Root accepted this bounded guard with the contract on 2026-10-01.

Legacy limitations remain explicit: an empty commands array is still conservatively classified no_payloads when the horizon is positive; the current bundle schema cannot distinguish a genuinely commandless recording from stripped payloads. A bundle can carry valid-looking but dishonest data; coverage reports comparisons performed against the supplied recording, not provenance, game correctness or determinism outside those comparisons. Factory/registration/handler/continuity exceptions retain their exception semantics and produce no completed SelfCheckResult.

## Independent contract tests (literal expectations)

A small deterministic test fixture registers one spawn command and a deterministic per-tick value increment. It records actual commands and events through SessionRecorder/MemorySink. Expectations use literal tick intervals and recorded outcomes, never the production coverage helper or replayableUpperBound. Fresh failing tests are promoted to tests/session-self-check-coverage.test.ts after M0 lands; no red test is included in the M0 gate.

| Case | Recording and independent expectation |
|---|---|
| Clean terminal recording | 9 ticks, interval 5, terminal true: checked (0,5] and (5,9]; stateComparisonTicks [5,9], no uncovered range, complete true, ok true. |
| Live or terminal-disabled tail | 9 ticks, interval 5, terminal false: checked (0,5], uncovered (5,9] no_snapshot_segment; stateComparisonTicks [5], complete false, ok true. This is the reported class. |
| No snapshot segment | 4 ticks, interval null, terminal false, command payload present: no checked range, uncovered (0,4] no_snapshot_segment, notRunReason no_segments, complete false. |
| No payload | Strip commands from the otherwise terminal-complete 9-tick bundle: zero checkedSegments, warning preserved, no checked range, uncovered (0,9] no_payloads, notRunReason no_payloads, complete false, ok true. Factory spy must remain uncalled. |
| Empty recording | Connect and disconnect without stepping: horizon (0,0], no positive ranges or state comparisons, notRunReason empty_horizon, complete false. No claim from a zero-length snapshot pair. |
| Disabled comparisons | Complete 9-tick bundle, all three flags false: no comparison ranges or stateComparisonTicks, uncovered (0,9] all_checks_disabled, notRunReason all_checks_disabled, complete false; old checkedSegments value preserved. |
| Selected checks | Complete 9-tick bundle with state false and event/execution true: complete true for those flags, stateComparisonTicks [], explicit state false. Independent event tamper must produce ok false. |
| Failure boundary | Snapshots 0,2,4,6; failedTicks [4]: checked (0,2] and (4,6], skipped (2,4] with exact failure boundary, uncovered (2,4] failure_in_segment, complete false. Failure at a segment's start belongs to the prior interval. |
| Early stop | Snapshots 0,2,4,6; independently tamper expected state at tick 2; stopOnFirstDivergence true: checked (0,2], stateComparisonTicks [2], uncovered (2,6] stopped_on_divergence, complete false, ok false. Without stopping, all intervals checked, complete true, ok false. |
| All failure segments | Sole (0,4] segment with failedTicks [4]: no checked range, uncovered failure_in_segment, notRunReason all_segments_skipped, complete false. |
| Legacy metadata | Complete terminal 4-tick recording with endTick/durationTicks manually set 0 and persistedEndTick 4: horizon (0,4], checked (0,4], complete true. |
| Incomplete metadata | Actual 9-tick recording, snapshots 0,5,9; set incomplete true and persistedEndTick 5: horizon (0,5], checked only (0,5], no tick-9 world construction, stateComparisonTicks [5]. |
| Nonzero start | Start world at tick 3, record 4 more ticks with terminal: horizon (3,7], checked (3,7], complete true; no invented (0,3] coverage. |
| Gapped expected stream | Remove recorded tick 3 from a complete (0,4] bundle: existing missing_tick_entries diagnostic, no complete result. This verifies the coverage instrument rather than trusting absent expected events as empty. |
| Compatibility | A literal old SelfCheckResult without coverage typechecks; runtime return always has coverage. Existing checkedSegments/divergence/skipped arrays and warning behavior stay pinned. |

After green implementation, temporarily reintroduce the original missing coverage return and run the tail/no-payload/zero-segment cases; all must go red, then restore exact authored bytes. Also mutate the horizon calculation to endTick-only and run the legacy-metadata case, and reintroduce above-persisted snapshot checking for the incomplete case. Retain only authored conclusions in the permanent review; raw runs stay ignored until the milestone is accepted. A meaningful performance bound compares world-construction/step counts against the base for valid bundles; coverage must not replay the unchecked tail or add world construction. Gate: affected tests plus full engine gates on the final accepted revision, pinned independent exact implementation/integrated review, main merge/push and green remote matrix/publish-dist.

## Status

Accepted by root 2026-10-01: exact type/reason meanings, snapshot horizon normalization and existing continuity guard. M0 shipped at a839ad5 and its verified 2.4.2 dist is adopted. M1 is privately committed in work 72 with focused checks, all eleven local gates and both exact independent reviews green; main merge/push and remote release acceptance remain required. The accepted original contract remains recoverable at a839ad5.
# M2: coherent enclosing-step hook (accepted, no implementation)

E15 belongs to civ-engine with AoE2 adoption owned by root. Base for implementation will be the accepted M1 release after its main/remote boundary is green. This proposal changes three public configurations together and the private fork continuation path. Scenario adapters remain outside this runner-specific milestone. No callback, bridge, new state field or format version is persisted in a bundle. Core retains zero runtime dependencies.

## Observed compatibility constraints

SynthPlaytestConfig and AgentPlaytestConfig currently have no advance callback; direct world.step calls are at synthetic-playtest.ts:267 and ai-playtester.ts:226 on M0. Both submit policy/agent commands before stepping, inspect recorder.lastError before incrementing ticksRun and always disconnect in finally. Synthetic ok currently excludes sink failure only: poisoned or policyError can still have ok true. Agent ok excludes poisoned, agentError and sinkError. These established differences will remain when the hook is omitted; this milestone does not silently normalize them. Connect-time sink failures still throw before policy/agent work, and disconnect-time sink failure still makes ok false.

SessionReplayer openAt and selfCheck step directly; forkAt first calls openAt, then session-fork.ts steps the substituted target transition and each continuation transition. The fork path currently catches WorldTickFailureError into a partial fork and rethrows foreign errors. World failure can consume a tick before throwing, so a tick delta alone cannot identify successful work. stepWithResult can report failure without throwing. world.isPoisoned and getLastTickFailure provide live failure evidence; no unknown game long-walk cause is inferred from these facts.

## Proposed public additions

```ts
// Added to SynthPlaytestConfig, AgentPlaytestConfig and ReplayerConfig,
// preserving each interface's existing component/state generics.
advance?: (world: World<TEventMap, TCommandMap, TComponents, TState>) => void;

// Added to both runner stopReason unions only.
// Existing union members retain their meaning.
// ... | 'advanceError'

// Added optionally to both runner result interfaces.
advanceError?: {
  fromTick: number;
  toTick: number;
  error: {
    name: string;
    message: string;
    stack: string | null;
    code: string | null;
  };
};
```

No additional exported callback alias or error class is needed. Existing EngineError carries clock/synchronous-contract diagnostics. The new union member is additive under the engine's minor policy but consumers with exhaustive TypeScript switches must add its case; the changelog and downstream handoff will state that migration. Both runner results remain assignable when advanceError is omitted. No change to public ForkBuilder generics, ForkRunConfig or ForkResult is proposed.

## Synchronous step contract

The omitted callback uses the existing direct world.step path and preserves its result/error semantics. A supplied callback runs exactly once after this transition's recorded commands are submitted, receives the exact current World instance and must synchronously execute exactly one engine tick. fromTick is captured immediately before invoking it; successful return requires world.tick === fromTick + 1 and an unpoisoned world. The callback may call an enclosing bridge.step which performs work before/after its one World step. It must neither restore/rewind/replace the world's tick nor retain or schedule later tick work. It is not an asynchronous hook: the agent runner's async decision/stopWhen remain separate from synchronous simulation advancement.

A normally returned thenable is rejected with EngineError code advance_async_unsupported. An invalid native Promise rejection must be observed so it cannot become an unhandled rejection after the runner reports the coded diagnosis; this observation neither supports asynchronous work nor claims cancellation. Read the candidate then getter once: a throwing getter is a deterministic callback error. Invoke the captured then function only for rejection observation, never invoke advance a second time. A throw while observing an already identified thenable preserves advance_async_unsupported as the primary diagnosis and captures the observation failure in safe error details. Literal controls must prove native rejected returns and hostile getter/then behavior neither crash later nor bypass cleanup. A normally returned non-thenable value is ignored, matching a void callback. A zero or multiple-tick return is rejected with EngineError code advance_tick_delta. Each message names fromTick, observed toTick and required single synchronous tick. The error details use those finite counters and the required expected tick. No rollback is promised for a callback that has already changed the world; the partial recording retains observed work. Runtime rejection of an already-started asynchronous function cannot cancel work it scheduled, so that work is explicitly outside the supported callback contract rather than treated as a valid completed tick.

Before interpreting a returned poisoned world as a valid step, reject a bad delta. With a valid one-tick delta and live matching getLastTickFailure evidence, a swallowed stepWithResult failure is surfaced as WorldTickFailureError. A thrown WorldTickFailureError is classified as an actual tick failure only when the world is poisoned with a recorded failure at the expected transition; an unpoisoned synthetic wrapper error of that class is a callback failure. Foreign callback throws retain their original thrown value for replay/fork, including a throw after a completed step. Real world failure evidence remains in the bundle even when a wrapper then throws a different error.

## Runner result and cleanup rules

| Callback outcome | Both runner behavior |
|---|---|
| One successful synchronous tick | Inspect recorder.lastError before counting; then increment ticksRun and call the existing post-step stopWhen. |
| Valid actual engine tick failure | Existing poisoned outcome and bundle failure evidence; no ticksRun increment or stopWhen. Synthetic's existing poisoned ok meaning remains; agent's existing false meaning remains. |
| Callback throw without a qualifying WorldTickFailureError, including post-step throw | stopReason advanceError, ok false, serialize the thrown value into advanceError with observed fromTick/toTick. No ticksRun increment or stopWhen. |
| Normal zero/multiple-tick or thenable return | stopReason advanceError, ok false, serialized coded diagnostic and observed counters. No counting or stopWhen. |
| Valid callback return but recorder tick write failed | Existing sinkError path wins before counting. |
| Callback itself fails and recorder also reports a failure | advanceError remains the primary stop reason; recorder.lastError and bundle termination evidence are retained, and ok false. No claim that a sink accepted a completed transition. |
| Disconnect-time sink failure | Existing primary stop reason remains; recorder.lastError makes ok false. Cleanup never changes advancement failure into success. |

Recorder attachment, submit wrapping, listener removal, its exclusive payload-capture slot, policy RNG derivation, agent report and terminal snapshot behavior retain their existing order. A callback error uses runner result semantics; stopWhen exceptions preserve their existing synthetic throw/agentError difference. No bridge-specific engine code or World.step monkeypatch is introduced.

## Replay and fork inheritance

ReplayerConfig.advance is used by openAt, each selfCheck segment and forkAt's initial reconstruction. ForkBuilder receives a private zero-argument closure bound to that exact constructed typed World and the same callback, then uses it for the substituted target transition and all continuation transitions. A builder cannot silently fall back to world.step after a configured replay hook. The closure avoids adding component/state generics to the public two-generic ForkBuilder. The caller's worldFactory remains responsible for building and associating the matching enclosing bridge for every reconstructed World; closures over the original live bridge do not serve reconstructed worlds.

Replay callback or contract exceptions propagate; they do not fabricate a completed SelfCheckResult or covered interval. A real WorldTickFailureError keeps replay's existing throw semantics and fork's existing partial-fork handling; callback failures rethrow their original values in both target and continuation paths after finally cleanup. This prevents a forged unpoisoned WorldTickFailureError from being swallowed as a real fork failure. Source commands are submitted once in their current order before each callback. No additional world construction, callback invocation or tail replay is introduced by M1 coverage.

## Independent acceptance matrix

- Omitted callbacks pin current runner bundles, stop reasons, ok differences, command ordering, ticksRun and stopWhen behavior; no public fixture drift beyond the agreed additions.
- A bridge-shaped fixture has visible pre-step and post-step effects. The callback is called once per transition with the exact World; both runners' recorded state/events/executions reflect those effects. Matching replay hook passes selfCheck and openAt; omitting it fails the independent expected state/event contract.
- Zero-step and double-step callbacks return coded advanceError with literal counters, false ok, no stopWhen/count, and recoverable partial bundle rather than hanging or overshooting silently.
- Throws before a step and after one successful step retain their input error shapes and observed counters; string/null throws remain serializable. Replay/fork preserve thrown identity after cleanup.
- An actual failing system and a swallowed stepWithResult failure retain engine poison/bundle failure semantics. An unpoisoned constructed WorldTickFailureError is callback failure; fork does not swallow it.
- A thenable-returning callback is rejected without being counted complete. Tests cover async return after a synchronous step and a resolved/rejected return without scheduling future world work; unsupported delayed advancement is documented rather than falsely cancelled.
- A tick-write sink failure and terminal-disconnect failure preserve primary result ordering, tick count, false ok and evidence. Connect failure prevents callback/policy/agent invocation.
- forkAt reconstruction, substituted target and every continuation use the same configured hook. Target/continuation actual failures preserve partial-fork behavior; callback/clock errors rethrow and leave the builder consumed.
- Every runner and fork error case proves submission method identity, listeners and recorder exclusive slot are restored. A second recorder can attach afterward when the World itself is usable; no owned async/browser process exists.
- Typed component/state callbacks infer correctly, old result constructors remain valid, both platform names/member fixtures and docs/version agree. No callback appears in serialized snapshot/bundle data.
- Deliberately restore a direct world.step call independently at each runner, openAt, selfCheck and fork continuation/target path: the bridge contract must fail for each affected lane. Restore exact source bytes after every control.
- After scoped checks, the eleven-step final gate, independent pinned exact review and final integrated acceptance precede commit/main/push; remote matrix/publish-dist and actual AoE2 adoption precede claiming E15 shipped.

## Decisions requested from root

Root approved the scope and exact callbacks/error/ordering/fork contract on 2026-10-01 after M1 shipping, with two explicit acceptance additions now included: advanceError is an additive union member under the actual engine version policy but is not universally source-compatible for exhaustive consumer switches; invalid Promise rejection is observed, with deterministic single getter/assimilation handling and no cancellation claim. The existing default ok inconsistency remains a documented inherited bound. Scenario adapter steps remain out of scope. Implementation waits for the M1 green/main boundary and agreed resources; read-only investigation of later ledger items continues independently.
# M9: voxel feedback contracts and workspace (bounded phase approved)

## Fresh repository and release evidence

Primary voxel is at 9cc3f5da69d3903d06198b2f62a51e4447d91158 on main with only a pre-existing AGENTS.md modification and no other worktree. Its two origin/main commits are docs-only canon changes, latest 7b27d70719ca93d6b0ded380240d60f7a082a393; product source used by this audit is unchanged across them. Fresh PUBLIC/isPrivate false and matching GitHub repository identity were checked. Remote CI36666621008 on 25b5a781512a7b25a0c352923d2408d079a24bf8 failed full dependency audit and complete-gate supply-chain on brace-expansion high; runtime audit passed, Vitest findings were moderate and nonblocking. Portable jobs were cancelled, so no complete portable acceptance is inferred. Raw failed logs remain ignored in this engine worktree. No voxel write, dependency install, gate, build or browser has run for this task.

Voxel requires Node24, npm run verify, public API/consumer/package/supply-chain checks and headless browser proof, with Linux/Windows complete remote lanes and Node22 portable lanes. The inherited red audit must be freshly reproduced privately and repaired first in a bounded dependency milestone before a feature release. No npm audit fix --force, broad solver upgrade or shared primary dependency rebuild is proposed.

## E05: curved and blended surfaces through the existing public geometry lane

GeometryResourceV1 (core/contracts.ts:177-189) already admits indexed triangles, Float32 positions/normals, Uint8 per-vertex sRGB8 colors, material groups, bounds and pivot. The public core/three presentation accepts it through an instance batch; current pick output identifies geometry/batch/instance. A useful consumer contract is one custom top-surface geometry per terrain region/chunk and one identity-transformed instance per region, with positions/colors shared at adjacent region seams. This is one surface resource per region, not thousands of separate voxel boxes. It can express a curved shore within a cell and interpolate terrain tint inside triangles while keeping the game's authoritative occupancy separate.

Before claiming already supported, build a public-import-only downstream-shaped fixture with two adjacent regions, a non-axis-aligned curved shoreline and per-vertex land/water colors. Literal independent checks pin region seam positions/normals/colors, triangle winding, Float32 bounds, resource/instance counts and fractional hit points; public presentation/picking must consume those exact resources. Headless fixed-angle/zoom images and pixel samples prove the curve is actual geometry with smoothly interpolated surface tint, then a mutation to cell-aligned geometry and constant per-cell color must fail. Snapshot/delta resource revisions, replacement/disposal and pick identifiers remain correct. The reusable example/contract may resolve the present capability ask without a new first-class chunk hook; it cannot establish automatic terrain stitching, LOD or caller meshing correctness. If the actual consumer requirement still needs a dense-chunk mesh hook after this proof, present that failing case and a separate public contract instead of declaring E05 closed.

## E07: quarter-height dense voxels, bounds and picking

CoordinateConventionV1.worldUnitsPerVoxel already accepts a positive finite Vec3, including fractional y. chunkPresenter.ts scales mesh positions/bounds/origin per axis; presentedVoxelStore.ts:313-337 and 379-397 builds world AABBs and transforms rays back to integer grid space. Current nonuniform test covers 2/3/4, not y=0.25. The original ask needs terrain voxel levels shorter than an X/Z tile; global y=0.25 directly supplies that scale without a per-chunk field or fractional grid origin.

Prove a public chunk snapshot with x/z scale 1 and y scale 0.25, multiple integral levels and neighboring regions. Literal world bounds must include top surfaces at 0.25, 0.5 and 0.75; public picks return those fractional world hit positions while voxel cell coordinates remain integer. Add float-positioned unit/tree-shaped geometry at the same expected top elevations and verify projected ground contact, frustum inclusion and committed world bounds. Native images at fixed angles/zooms and a scale-to-one mutation expose the old whole-tile mesa. Axis-aligned voxel-face normals remain valid under this anisotropic scale; custom curved geometry uses its own batch positions/normals rather than assuming the chunk presenter inverse-transposes arbitrary normals. Consumer adoption, not a new VoxelChunk field, may retire E07 only after this full capability proof and root's actual game integration contract.

## E08: single blend per selected presentation group, including coplanar overlap

The real feedback names coplanar apron/tunic overlap and two deliberately coincident silhouette passes. Existing singleLayerTransparencyInternal.ts admits exact equal-depth ties to both blend; its companion prepass supports only non-paged instance batches, and a marked chunk/paged mesh can draw nothing. The internal material decorator is not publicly available and is rejected alongside voxelWorkers. Exporting that helper alone is not an acceptable fix.

The proposed consumer-facing property is one alpha blend per selected group per pixel, for self-overlap across parts/instances including exact coplanar ties, with opaque geometry still occluding the group correctly. Deliberate separate silhouette passes remain separate groups and may each blend once. Omitted configuration preserves normal transparency and all existing presenter paths. Provisional runtime-only shape, to finalize after a bounded prototype rather than add persisted MaterialResource fields:

```ts
singleLayerTransparency?: {
  groups: readonly {
    key: string;
    materialKeys: readonly string[];
  }[];
};
```

Groups are deterministic and nonempty, and a material key belongs to at most one group. Selected materials must have actual transparent presentation opacity strictly between 0 and 1, including color alpha. Unsupported selected uses in chunk/paged/worker lanes fail with a diagnostic before invisible geometry is adopted. Initial public support may be the ordinary instance-batch lane only if it meets AoE2's actual consumer path; no success is inferred for unimplemented lanes. Duplicate/dangling key policy, staged transaction rejection and context capability errors must be stated precisely in the final reviewed contract. A prototype must settle whether depth plus a per-group tie mask can meet the property; a stencil-dependent route must verify the owned/borrowed renderer or target capability and report an unsupported host honestly, not corrupt another host's buffers.

Independent pixel proof solves alpha from background/opaque/translucent captures: a 0.55 group must stay at 0.55 on single, noncoplanar double/triple and exactly coplanar self-overlap; the double-composite 0.7975/0.9089 controls must fail. Two intentional 0.5 groups remain two blends with the independently expected composition. Test nearby independent bodies, opaque occlusion, group ordering, mixed marked/unmarked materials, unsupported presenter refusals, snapshot/delta replacement, disposal and context restoration. Bind native-resolution inspected images to bytes and inspect several fixed angles/zooms; a sheet alone is not proof. Mutating either public selection or tie-mask behavior must fail the affected contract. No public E08 API is selected or implemented until root approves the bounded prototype and resulting exact shape.

## Proposed isolated workspace and dependencies

After root approval, use the existing cwd-generic controller from the voxel primary to create a separately owned voxel-worktrees/engine-feedback-voxel-1001 checkout from its verified origin/main, branch codex/engine-feedback-voxel-1001 if supported by the controller's explicit naming. Inspect controller output and junction targets first; detach only the newly created node_modules link non-recursively and install private dependencies. Preserve primary AGENTS bytes and shared dist/dependencies. Allocate voxel permanent work records through the common primary allocator and carry its own registry placeholder into the private branch. No two products are edited in one tree, no heavy gate overlaps root/game/engine, and all headless renderer processes/contexts/servers use uniquely owned finally cleanup. Do not recursively remove a checkout across junctions; use controller cleanup after safe link census and completed main/push.

The first voxel milestone is the minimal freshly reproduced audit repair, followed by existing E05/E07 capability proof and the separately accepted E08 prototype/implementation. Each executable milestone requires exact pinned independent sibling review, full local verify, main/push and actual remote completion before root adopts it. No new runtime dependency, physics change, Studio rewrite, broad renderer extension framework, deployment or manual publication is proposed. Root approved the bounded phase on 2026-10-01: isolated worktree/private install, minimal fresh brace high repair, public-import-only E05/E07 capability fixtures and bounded E08 prototype. Public API/material-format selection still needs prototype and final contract review. E05/E07/E08 remain open through actual game adoption, and build/browser/full verify wait for the shared heavy resource grant.
# M3: command precheck enabling application-persisted intentions (accepted, no implementation)

E03 can be addressed without changing WorldSnapshot or CommandQueue persistence. Current submitWithResult runs private validateCommand, clones accepted JSON, mints a sequence, enqueues and emits submission results (world-commands.ts:49-83). The queue is transient and processCommands does not revalidate queued commands. AoE2 already persists its own pendingCommands intentions; its human callers need immediate accept/reject for feedback. The minimal proposed engine API makes that validation observation available without enqueuing or flushing a tick, with downstream adoption remaining a required dependency rather than claiming engine exposure alone fixes the save window.

```ts
export interface CommandPrecheckResult<TCommandType extends PropertyKey = string> {
  accepted: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
  validatorIndex: number | null;
}

world.precheckCommand<K extends keyof TCommandMap>(
  type: K, data: TCommandMap[K],
): CommandPrecheckResult<K>;
```

The result is an observation, not CommandSubmissionResult: it has no submission sequence or wire schemaVersion and does not claim a command was queued. Accepted code is accepted with message Command passed validation. Rejected code/message/index follow the current first rejecting validator; returned details are JSON-validated and detached for consumer retention. Missing handlers remain outside submission validation, matching current submit behavior. Validators run once in the same order and receive the same World and input contract as submission; an accepted payload must also be JSON-compatible, with rejection-before-payload-check ordering preserved. Default submitWithResult still performs its existing single payload clone and its sequence/listener/queue behavior; no extra accepted-command deep walk is added to that path.

The engine precheck introduces no queue entry, sequence consumption, command-result/execution notification, recorder command entry, tick advance, state write or poison-warning mutation. A throwing validator or non-JSON accepted payload preserves the original exception and consumes no engine-owned queue/sequence/listener state. This cannot promise user validators are pure: their existing input/World side effects are not rolled back, and the public docs must state that boundary. Poisoned-world validation remains validator-relative like current submission, not a new guarantee that a poisoned World can execute; precheck does not recover it. Repeated checks reserve no future acceptance, resources or identity.

A caller that stages a checked intention must copy its payload into its own persisted queue and later call the normal submission API. That later call validates again against then-current world state and may reject. This is an explicit difference from an already accepted engine queue entry, which processCommands executes without validation again; it must not be disguised as durable engine acceptance. The precheck enables the two-stage application design requested in the feedback. If preserving original once-accepted engine semantics is required for a consumer, root should choose a separate pending-queue persistence contract instead; this proposal does not silently smuggle one into snapshot format.

Acceptance uses literal validators/results and observer spies: first rejection/index and short circuit; no-validator acceptance including missing-handler behavior; JSON rejection/error/details isolation; string/null validator throws; repeated accepted/rejected checks followed by a real submit proving its first sequence and exactly one queue execution/recorder entry; validators' stated side-effect bounds; typed command inference and old SubmissionResult fixtures; identical legacy submit behavior/work. A mutation routing precheck through submitWithResult must fail queue, sequence, observer and paused-save controls. Engine gates and exact pinned review precede minor release/main/remote acceptance.

The game-owned dependency is concrete: human facade prechecks produce the existing immediate acknowledgement/toast, then stage a detached agentIssued=false intention in the already persisted pendingCommands queue; paused Save/Load keeps its command type/data/order without a World tick. On resume, exactly one actual submission/handler executes, rejected commands never stage, and later rejection is explicitly surfaced. A whole-class gate covers accepted human command families routed through the common facade, not only one move order; authoritative specs and feedback current/past remain root/game-owned. E03 stays open until that actual adopted paused-save flow passes. Root approved the precheck-only shape and all stated engine-effect/JSON/error/order/later-revalidation bounds on 2026-10-01 after prior green milestones. Game adoption is a separate root-assigned dependency after release; no pending-queue persistence/format API is approved. No M3 code has begun.