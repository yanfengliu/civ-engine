# Retained M3 command precheck preparation

Promoted 2026-10-02 by /root/engine_precheck_m3 for coordinator /root during the docs-only M8 producer closure.

Source: primary aoe2/tmp/engine-precheck-m3-1002/1_preparation.md. Original body SHA256: 10a7921bde15003a1dd2b133e1ab7f44692a744a1a5b5541b32d2245687ceca2.

The complete authored body between the markers is copied byte-for-byte. Its baseline and held-M8 statements describe the time of preparation; they are retained as history. Root subsequently accepted Option A and the stated transaction, JSON, legacy-work, typed/public and consumer bounds. M8 is now accepted on main 48297848bf68576c87ae04ada193457d482d972a. M3 remains prepared, not implemented; no allocation 75, source change, runtime result or release is claimed. E03 and real game paused-save adoption remain open.

<!-- BEGIN RETAINED M3 PREPARATION; SHA256=10a7921bde15003a1dd2b133e1ab7f44692a744a1a5b5541b32d2245687ceca2 -->
# M3 command precheck preparation

Authored 2026-10-02 by /root/engine_precheck_m3 for coordinator /root. Status: PREPARATION ONLY; no implementation or runtime verification has begun. This ignored handoff is intentionally retained while M3 is active. It is not an allocated permanent engine work record, a review verdict, or a shipped E03 disposition.

## Ownership, release condition and baseline

The assigned outcome is the accepted additive `World.precheckCommand` and `CommandPrecheckResult` contract in engine `docs/work/71_engine-feedback/design.md:205–233`. The human has authorized the sibling engine scopes through root. This preparation does not seek a new API decision. Root separately accepted the necessary transaction-precondition guard and adversarial validator-side-effect control on 2026-10-02.

Source baseline observed with read-only Git commands: primary engine HEAD and origin/main are both `3c676619468ca431335158062cb104abd9742844`, package version `2.6.0`. M8 owns the isolated `engine-reader-m8-1002` candidate, permanent allocation 74, proof and full eleven-step gate. M3 implementation must wait for root's explicit resource release after M8 is main/remote accepted, then rebase the preparation against that actual revision. No allocation 75, registry edit, source edit, install, runtime/build/gate, provider export, GUI or server is authorized in this phase.

Read-only primary status reported foreign `.cursor/hooks/state/continual-learning.json` deletion, modified `docs/work/registry.json`, and untracked `docs/work/74_file-sink-streaming/`. These are not M3-owned and remain untouched. Worktree census also found the older `engine-feedback-1001` worker at `192990f3d6fc8b482875f14c5c1572cebd09bd36`; it is not reused or cleaned by M3. The initial Git read required per-command `-c safe.directory=...`; no shared Git configuration was changed.

The engine's actual AGENTS instructions, empty lessons queue, architecture, complete summary devlog and accepted M3 section were read. No nested AGENTS file was discovered by the scoped file inventory. The engine has no `docs/policies/local-rules.md` file at this baseline. Fleet self-improvement guidance was read and applied to reuse the existing command, transaction, recorder and surface gates; no new improvement scope is proposed.

## Fixed outcome and exclusions

The public result contains exactly `accepted`, `commandType`, `code`, `message`, `details`, `tick` and `validatorIndex`. It is generic over `PropertyKey` with default `string`; `precheckCommand<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): CommandPrecheckResult<K>` preserves command and payload inference. Accepted code/message are the literals `accepted` and `Command passed validation`. There is no sequence, schemaVersion, command identity, queued flag or durable acceptance claim.

Validators execute exactly once, in their existing registration order, with the original input object and actual World. The first rejecting validator supplies current normalized code/message/index. Rejection occurs before checking the accepted payload's JSON boundary. Rejection details are JSON-validated and detached before return. Missing handlers do not participate in validation, matching submission.

The engine observation itself must not enqueue, mint sequences, emit command-result/execution/diff/failure notifications, add recorder command entries, advance a tick, write state, recover poison or consume the poison-warning latch. Original thrown values propagate unchanged. Validators' own input/World side effects are not rolled back; strict-mode rules still apply in the caller's phase. Repeated checks reserve no future resource, acceptance or identity.

Normal submission keeps its current behavior and exactly one accepted payload clone. A later normal submission validates again against current state and may reject. Already queued commands continue to execute without a second validation at drain. No WorldSnapshot/CommandQueue/session format, consumer facade, paused-save UI, save migration, engine queue persistence, major dependency or provider change is in this worker's scope. E03 remains OPEN until root's separately assigned real game flow passes.

## Source facts that constrain the implementation

1. `src/world-commands.ts:45–84` owns the current submitWithResult path: poison warning, private validation, rejected result construction/emission, accepted clone, sequence allocation, queue push, then emission. M3 should leave this entire method byte-for-byte intact.
2. `src/world-commands.ts:356–385` owns `validateCommand`. It already passes the caller input and `asWorld()`, normalizes one validator at a time, returns the first rejection, and otherwise returns null. No new validator registry or second validator traversal is needed.
3. `src/world-internal.ts:74` normalizes booleans and structured rejections. False means `validation_failed` / `Validation failed`. Missing rejection message also uses `Validation failed`. Invalid return, empty code and invalid details keep their current EngineError behavior. Do not refactor or replace this normalizer.
4. `src/world-commands.ts:233–258` result construction allocates `nextCommandResultSequence`, and command-result emission fans out listeners. Reusing either for precheck is incorrect even if queue push is later undone.
5. `src/world-commands.ts:123–198` drains commands and calls handlers without validators. A missing handler is a tick-time `missing_handler` failure; precheck must not add a handler requirement.
6. `src/json.ts:8–83` provides both the JSON validator and existing validate-then-JSON-clone boundary. It rejects undefined, non-finite numbers, bigint/function/symbol, non-plain objects and cycles; repeated acyclic shared references are allowed. Input accessors and JSON serialization can throw, so catching and wrapping would lose thrown identity.
7. `src/world-core.ts:79–84,221–227,287–294` keeps queue/result counters and poison-warning state separately. `getObservableTick` is the existing tick observation, including failed/in-flight ticks; use it instead of inventing a tick rule.
8. `src/session-recorder.ts:174–191` and `src/history-recorder.ts:192–219` capture commands by wrapping submitWithResult, with history also observing command-result listeners. A direct observation must bypass both mechanisms naturally. Do not alter recorder wrapping or listener contracts.
9. `src/command-transaction.ts:12–54` builds both the runtime precondition deny-list and typed `ReadOnlyTransactionWorld` from the same `FORBIDDEN_PRECONDITION_METHODS` tuple. New precheck can call user validators with the real World; it must enter this tuple. The existing prototype-chain classification and deny-list call tests will then cover it.
10. `src/world.ts` re-exports world public types; both curated package barrels explicitly export those types. A new type must appear in all three places and both public-surface fixtures, with browser parity intact.

## Source-backed implementation options

### A — direct observation in the existing WorldCommands layer (recommended)

Add the seven-field interface beside CommandSubmissionResult in world-types.ts, re-export it through world.ts and both barrels, and add one public method to WorldCommands. Call existing private validateCommand once. On rejection, clone non-null normalized details and construct the independent seven-field result. On acceptance, use the current `cloneJsonValue(data, command label)` boundary and discard its temporary clone, then construct the accepted result. Read `getObservableTick()` when constructing the result. Call no submission creator/emitter, warning helper or queue method.

Discarding the accepted clone is deliberate: it reuses the exact existing JSON validation plus serialization failure boundary without retaining or queueing payload data. It changes no legacy submission work. An assert-only variant is smaller and allocation-free, but it can diverge from actual submit's cloning failures for hostile plain objects with non-enumerable toJSON or accessors that change/throw on a second traversal. The current helper avoids quietly claiming acceptance for a payload that already fails the existing submission clone boundary. This is still an observation, and the caller must copy staged data for its own persistence.

Keep submitWithResult, validateCommand and normalizer bodies unchanged. Add precheckCommand to FORBIDDEN_PRECONDITION_METHODS with a comment that validator callbacks may mutate their World/input. This is a required existing-boundary integration, accepted by root, rather than a new readonly design.

This option needs no new source module, exported constructor/helper, registry, snapshot field, queue change or recorder change. Current world-commands.ts is 402 raw lines, leaving 98; a roughly 35–50-line method/JSDoc/import fits below 500. world-types.ts is 211, world.ts 467 and command-transaction.ts 368; expected additions fit. Verify exact counts after implementation.

### B — a dedicated internal result helper

Keep validateCommand in WorldCommands and pass its normalized rejection, command key and observable tick to a pure internal helper in a new command-precheck module. The helper performs accepted JSON checking or detached rejection cloning and constructs the observation. Do not route legacy submit through this helper. This can isolate result construction if the layer later exceeds 500 lines, but at today's size it adds a module and an interface boundary without eliminating a duplicate contract. It is less minimal and would require architecture/component-map review if the new module changes documented structure.

### Closed route — submitWithResult with cleanup or suppressed listeners

Do not call submitWithResult and undo/ignore its result. Submission consumes a sequence, writes the queue, touches the warning latch, emits observers and traverses recorder wrappers before a cleanup could make it appear read-only. Removing listeners or draining afterward additionally disturbs unrelated state. Structural extra fields would still type-assign to the narrower result, so typed correctness alone does not close this route; literal results and side-effect spies must.

## Literal TDD matrix

New tests should live in focused files rather than growing ratcheted suites. world-commands.test.ts is exactly its 717-line shrink-only pin; command-transaction.test.ts is exactly its 861-line pin. Do not raise either pin or extend those files. Proposed files: world-command-precheck.test.ts for ordinary semantics; world-command-precheck-errors.test.ts for JSON/error order; world-command-precheck-boundaries.test.ts for engine effects/recorders/transaction guard; command-precheck-types.test.ts for consumer slots and runtime counterparts. Keep each below 500 lines; split by role only if necessary.

The first test run after release must fail because the approved method/type are absent. Record that failure honestly before source implementation. Every expected result below is a hand-authored literal, never copied from submit output or generated by an implementation helper. Spy and snapshot baselines establish the engine-owned-effects bound; validator mutation tests are separate so permitted callback effects do not masquerade as engine effects.

| ID | Fixed input and control | Required literal observation and discriminator |
| --- | --- | --- |
| P01 | New World; no validators and no handler; payload { n: 3 } at tick 0 | Exactly { accepted: true, commandType: 'act', code: 'accepted', message: 'Command passed validation', details: null, tick: 0, validatorIndex: null }; no sequence/schemaVersion keys |
| P02 | Same command missing a handler; one precheck, then real submit and stepWithResult in an independent World | Precheck accepts; real submit sequence is 0 and accepts; tick failure code is missing_handler. No handler-presence check is added |
| P03 | Validator 0 returns true, 1 returns { code: 'no_budget', message: 'Need 4 wood', details: { cost: 4, have: 2 } }, 2 is a failing sentinel spy | Rejection fields are exactly the given code/message/details and validatorIndex 1; call order is [0,1], validator 2 never runs |
| P04 | One validator returns false; another fixture returns { code: 'blocked' } | False yields validation_failed / Validation failed / null / index 0; missing message yields blocked / Validation failed / null / index 0 |
| P05 | Three passing validators with distinct sentinels; capture input and World references | Registration order [0,1,2], each once, each sees the identical caller object and identical World; accepted index is null |
| P06 | Two rejected checks return a nested object/array owned by the validator; mutate original after first return, mutate first returned details, then inspect second | Each result is detached both from validator data and from other results; retained nested values match the specific pre-mutation literal |
| P07 | Validator returns false without reading a payload whose enumerable getter throws an object sentinel | Returns the rejection, getter is not read and no payload exception wins. Same with payload containing a function/cycle |
| P08 | First rejection has details { bad: NaN }; payload getter throws a different sentinel; later validator spy | Throws current json_incompatible with rejection-details context for that literal validator index, payload getter/later validator untouched |
| P09 | Accepted data matrix: undefined, NaN, Infinity, bigint, function, symbol, Date, cyclic object, undefined nested property | Each fails the existing command JSON boundary with current error class/code/context, no command observer/queue/sequence changes; no sanitization to null or rejection result |
| P10 | Accepted positive JSON data: primitive/null, nested arrays/plain objects, null-prototype record, acyclic repeated shared object | Each accepts. No new payload shape restriction beyond the existing JSON clone boundary |
| P11 | Validator throws Error object, frozen object, string and null (optionally undefined as an additional falsy control) | Catch with explicit didThrow boolean, then expect caught toBe(original); no wrapper/string coercion; later validator and all engine effect spies untouched |
| P12 | Accepted input getter throws a frozen sentinel; rejection-details getter throws a different sentinel | Original thrown-value identity survives the corresponding JSON boundary. A string/null getter variant makes falsy error handling observable |
| P13 | Invalid validator returns via deliberate fixture casts: null, string, object with no string code; separate empty-code fixture | Keeps validator_invalid_return or rejection_code_empty as current normalizer defines; never converts them to accepted/rejected observations |
| P14 | Pure accepted/rejected/error prechecks repeated before any real submit; observers attached; baseline serialize({ inspectPoisoned: true }) | Tick, snapshot/RNG, metrics/diff/failure and registration manifest stay at baseline; no onCommandResult/onCommandExecution/onDiff/onTickFailure calls; first real submit sequence 0 |
| P15 | Two real queued payloads surround many accepted/rejected checks | Real sequences stay 0 and 1; next tick pendingBeforeTick and processed are exactly 2; handlers see only the two queued payloads in their original order; another tick runs neither again |
| P16 | SessionRecorder connected to MemorySink, with default WorldHistoryRecorder composing; repeat all pure precheck branches before one real submit | Before real submit, bundle commands/executions/ticks and history commands/executions remain empty; after submit/one step/disconnect there is exactly one recorded command/execution and one handler call |
| P17 | Independent WorldHistoryRecorder({ captureCommandPayloads: true }) fixture (never concurrently with SessionRecorder) | recordedCommands, commands and executions remain empty through prechecks; exactly one of each appears for the one later real submission/execution; disconnect in finally |
| P18 | Handler poisons a World on tick 1; serialize inspection suppresses its warning; console.warn spy precedes repeated pure prechecks | Observation tick is 1; acceptance remains validator-relative; isPoisoned and failure remain unchanged; zero warning calls through prechecks; the next real submit emits the original one warning; subsequent serialize emits none |
| P19 | Caller stages a local detached intention after passing precheck; budget changes before actual submit; separate command already queued while valid | Later submit rejects no_budget with sequence 0 and no handler execution; already queued contrast still executes once without revalidation. This is engine semantics proof only, not the game paused-save gate |
| P20 | Passing/rejecting/throwing validators mutate caller data and World state in a permitted setup/strict:false phase | Mutations persist and subsequent validators observe them. No rollback/purity claim; result/order remains accurate. Separate pure tests continue to prove zero engine-owned effects |
| P21 | Strict World after endSetup; validator attempts world.setState; compare normal submit fixture and precheck | Both preserve existing StrictModeViolationError/caller-phase behavior; precheck does not open maintenance/tick/setup or catch the error |
| P22 | Transaction.require predicate casts readonly World and attempts precheckCommand; registered validator would mutate caller data and real World | Runtime proxy raises transaction_precondition_side_effect before method/validator runs; validator/input/state are untouched. Include explicit readonly type rejection, not just tuple-derived tests |
| P23 | Plain accepted submitWithResult with an enumerable payload getter, no recorder and no validators | Getter is read exactly twice (existing assertion and serialization), handler receives detached literal; legacy result is exactly schemaVersion 1 / Queued command / sequence 0. An added precheck/assert/clone on submit becomes observable |
| P24 | Precheck then repeated precheck after state/input change, before real submit | Each runs current validators again; first acceptance grants no cache/identity/reservation; later observation reflects current literal state and can reject |
| P25 | Precheck invoked inside a registered system while current observable tick exceeds loop's previous completed tick | Result tick matches the existing in-flight observable tick contract; no extra step/event/command is caused by observation |
| P26 | Accepted payload with non-enumerable toJSON returning undefined or throwing a frozen sentinel, in an independent fixture | The exact existing accepted clone boundary fails like submit; thrown sentinel identity preserved, no sequence/queue effects. This prevents assert-only acceptance drift if Option A is chosen |

No extra unowned process is needed for any engine test. All recorder connections use finally cleanup, so a failing assertion cannot leave a wrapped method or payload recorder mutex on a shared fixture. Tests construct independent Worlds and use fixed input literals; no time-based assertion, engine internals cast or consumer code is required to prove queue order/absence.

## Typed fixtures and surface review

Use public imports from src/index.js, with the same result type also imported from src/index.browser.js. A typed World with `move: { target: { x: number; y: number } }`, `cancel: { entity: number }`, numeric key and unique-symbol key should produce the exact command-key type for each precheck. Default `CommandPrecheckResult` consumer slots accept string-key results without changing existing output generic contracts.

Compile-only assertions must reject unknown command keys, wrong payload fields, assigning a precheck result to CommandSubmissionResult, accessing .sequence/.schemaVersion and calling .precheckCommand on ReadOnlyTransactionWorld. Back these with runtime calls for the same typed command and literal fields, so an unusable declaration is not mistaken for implemented behavior. Existing CommandSubmissionResult, boolean submit and consumer-back-compat slots remain unchanged.

Expected fixture diff: declaration allowlist gains only CommandPrecheckResult; runtime allowlist gains nothing. Members allowlist gains the seven fields for CommandPrecheckResult and inherited World.precheckCommand. Both barrels expose the same type; existing browser-entry runtime identity/graph-purity tests stay intact. The exported FORBIDDEN_PRECONDITION_METHODS tuple gains precheckCommand; inspect any tuple/member fixture consequences, rather than blindly accepting generator output. Run the maintained member updater only after root release and read its actual diff.

## Seeded red controls and proof bounds

After green implementation, inject each scoped mutation separately, run only its named discriminator, capture nonzero exit and actual failed node IDs under ignored evidence, restore exact source bytes, then re-run the affected suite green. Do not mutate source while a review or full gate owns the revision. A red control is not complete merely because TypeScript rejects the mutation; use compilable runtime mutations for the behavior claims.

| Control | Scoped mutation | Required red discriminators |
| --- | --- | --- |
| C01 | Implement precheck by returning submitWithResult | P01 exact keys/message, P14/P15 sequence and queue, P16/P17 observer/recorder absence; root's later paused-save gate is an additional consumer control |
| C02 | Check/clone payload before validators | P07 rejection wins over payload getter/function/cycle; P08 rejection-details error precedes payload error |
| C03 | Return normalized rejection details without detaching | P06 original/result/cross-result mutation isolation |
| C04 | Skip accepted JSON validation/clone | P09 non-JSON matrix and P12 getter identity; P26 accepted serialization boundary |
| C05 | Run validation twice or skip/continue a rejection | P03/P05 order/count/short circuit, P20 observable callback input mutation |
| C06 | Force validatorIndex 0 or use last rejected result | P03 independent second-validator literal / third sentinel |
| C07 | Catch and wrap/stringify validator throws | P11 string/null/object identity and P12 getter identity |
| C08 | Call warnIfPoisoned or recover from precheck | P18 warning latch/state/failure observation |
| C09 | Omit precheckCommand from the transaction forbidden tuple or classify it as a public read | P22 explicit runtime callback-side-effect control and readonly @ts-expect-error; existing prototype classification supplies an additional check |
| C10 | Route accepted legacy submit through precheck or add another payload assertion/clone | P23 exact two getter reads, existing payload-isolation/replay fixtures; reviewer also confirms the legacy method bytes |
| C11 | Make precheck require a handler | P01/P02 missing-handler acceptance, followed by actual tick-time failure |
| C12 | Add memoization or bypass later normal submission validation | P19/P24 changed-state rejection; existing ordinary validator tests remain a second discriminator |

These proofs establish observation and current submission behavior for the pinned fixtures, not that user callbacks are pure, a save is durable, or every future game command family was adopted. A passing engine recorder fixture is not a browser Save/Load flow.

## Public/docs/migration scope after release

The API is additive surface, so ship the next minor derived from the actual post-M8 baseline (expected 2.7.0 if M8 ships 2.6.1). Update every committed version copy enforced by version-sync: package.json, root package-lock top-level/root package fields, src/version.ts, README badge, MCP lock's linked-engine version and newest changelog heading. Do not alter dependency ranges or install lockfiles merely to make a version edit.

Update docs/api-reference.md with a dedicated CommandPrecheckResult section and World command-method signature/semantics. Update commands-and-events.md with the third observation-only stage and a caller-owned staged intention example whose later submit validates again. Update ai-integration.md's command lifecycle and strict-mode.md's submit-time callback phase discussion; add precheck to the public-api-and-invariants.md ungated submission observation list and explain the transaction precondition exclusion where it is documented. Update README Commands overview and migration-focused changelog with the new method and honest bounds.

The required prose must state detached result details, no engine queue/sequence/listener/recorder/tick/poison-latch effects, callback side effects not rolled back, accepted payload JSON failure, original throws, missing-handler validation behavior, strict caller phase and later revalidation/no durable identity. Do not describe it as queue acceptance, a transaction, a once-accepted save, or an engine pending-queue API. Search overlapping guide examples before declaring documentation complete; avoid blanket claims that all accepted results are queued when the noun also covers precheck.

No structural change is needed for Option A, so no new architecture module/tick lifecycle is invented. If documentation needs a current command-boundary sentence, keep it narrowly aligned with the unchanged chain/lifecycle; append drift/decision entries only where repository rules actually require them. Work record, authored reviews, engine devlogs, defect register/gate-proof provenance and work71 shipping status are coordinated after permanent allocation; root owns the aggregate feedback/spec disposition and consumer migration.

## Next implementation sequence

1. Wait for root release after M8 main/remote acceptance. Root supplies the exact accepted engine base and heavy-resource owner. Re-read changed instructions/lessons/architecture and diff all hashed source inputs against that base.
2. Use an independently owned engine worktree under the approved controller/workspace; inspect private node_modules link/install ownership before any runtime. Do not reuse primary or old engine-feedback-1001. Allocate the next permanent work record through the primary common allocator only once root releases it; no guessed/manual registry ID.
3. Carry this plan and input provenance into the assigned permanent folder; establish unchanged submit method bytes as the legacy reference. Author the literal tests and typed fixtures first. Run only affected tests/typecheck and record the actual absent-API RED.
4. Implement Option A and the accepted transaction restriction. Keep legacy submit/validate/normalize/queue/recorder/snapshot bytes intact except new imports/exports where necessary. Run focused semantic/errors/boundary/types plus existing command payload, transaction, consumer, browser/surface and LOC tests; fix demonstrated failures within the standing repair budget.
5. Execute the separate seeded controls, restore and confirm green; complete docs and minor/version fixture diff. Record proof reach and unresolved conditions without closing E03.
6. Obtain exact pinned independent read-only sibling review using the fleet runbook root authorizes; fix material findings and request focused re-review where needed. Do not silently change reviewer defaults or treat an unavailable CLI as a completed provider review.
7. Acquire root's single heavy-gate resource for final revision; run the actual full eleven-step engine gate after all code/version/docs changes. Inspect every emitted artifact and actual exit, then integrate main/push through the accountable owner and follow hosted Node20/22/24 and publish-dist to completion. No compiled dist/tarball or remote outcome is claimed before actual inspection.
8. Hand root the released revision/version, exact review/gate/proof results, tarball digest and required game-adoption contract. Root's paused Save/Load facade flow remains a separate assignment; M3 engine exposure alone cannot close E03. Remove only owned temp/build/process resources when no active review/issue/handoff needs them, and complete the owned worktree lifecycle through integration.

## Actual work and verification status

Actual actions were filesystem reads, scoped rg queries, read-only Git status/revision/worktree/ignore checks and SHA256 hashing, then creation of this one ignored preparation artifact. Git check-ignore returned this exact path, proving the handoff is ignored. No source/index/registry/consumer mutation, runtime test, build, gate, install, audit, allocation, review model invocation, provider export, screenshot, GUI or localhost process was performed. All tests, controls, resource/review/gate steps and release outcomes above are planned; NONE has a runtime result yet. Total tool calls and elapsed compute are not a performance measurement; no speedup claim is made.

## SHA256 input provenance

Hashes were read from actual primary bytes on 2026-10-02. Paths below are relative to C:/Users/38909/Documents/github/civ-engine unless the fleet prefix is present. Mutable M8/current-work docs must be rehashed on release; hash equality is source identity evidence, not a runtime correctness verdict.

| Input | SHA256 |
| --- | --- |
| AGENTS.md | efe4d651de7525ba028a02633c7c7779bb3bd94929d0a6d214474ee00f2756bd |
| docs/learning/lessons.md | 1161643076e4fc6731b31f98c8053f9a83c75b4f239456d893e563ddf889d84d |
| docs/devlog/summary.md | 03662493b79f06514c25cf2a3c3474a0c1ba746e7f598acd1ca9a8b009210b31 |
| docs/architecture/ARCHITECTURE.md | b6ea84b7068b18842c7b96203599bf70bc8689dc62c18bd75413154622910aad |
| docs/work/71_engine-feedback/design.md (M3 lines 205–233) | af1d3d2ff009c2355af93272b348291e702996de808105778281f32ab0f3090d |
| src/world-commands.ts | 9a97243b744b2c1cf0c4c7d1dce535eb50f260d42970be645191eaad7ba9bc35 |
| src/world-types.ts | 960b9b55b316752eb14c884f1e77159d1659ea625f3d855ea082118ba493ef51 |
| src/world-internal.ts | 9e1cf07d7116ff7982cb74936f1bcac322043a2ecf27af8bb78a35a0f60c701e |
| src/json.ts | 7cdfc551d3e59bf981f940f80f2a436c2d74056a9ce6e16566be0f877b0fc588 |
| src/world.ts | 187c1d0490ce787459e4aac17c18d6f28fe1b5cbde9996bef35c412758651710 |
| src/world-core.ts | 6f6021439ed8309061d0fb760fd487b9b3a2639e5ff34018ba33b02f3fcd7794 |
| src/world-observers.ts | 7bc3dc86eac1537b5c9a4764a72c2e4179072a9031fd011c64bdfcdc44496ee8 |
| src/command-queue.ts | 35b8b9403b4fd0c911d33dba6752f35e8ab2647292f2c64d73f9f2d850977515 |
| src/command-transaction.ts | 6d29355cf62741d67714057a7ac1ee6dd1b92015d8f6d1a9c598ff7ef850a98b |
| src/index.ts | 52577e5146aa2d45236d2f7a5b7692a2e6a7b4951296a909369f048824f4f2cc |
| src/index.browser.ts | eae53cb8bcc111826e4552566596a2eb3cbc5d63b14a0747c8c09a571bf229ab |
| src/session-recorder.ts | 5a7e81aef7cb0d40d2effaae601f672e4b3e60479726cecc8e73ae08c627598c |
| src/session-sink.ts | 967e5be4e65a1b5edb9a9d7a7722faf3ec277aadcad680c34d9d72f5cbd8c4b9 |
| src/history-recorder.ts | dabadead9cbc8232ef7603c60f7fd159667633e89318dc4b7bf17ec34b427d73 |
| tests/world-commands.test.ts | 5f9bd263701c2ff6d68e333553ba2f9b7764bc1429c8948564f91e41d4561ec6 |
| tests/command-payload-isolation.test.ts | f71136092af906b689e4f583b14ee6b02decf1122d465635973804c83bdc98c3 |
| tests/command-transaction.test.ts | 8e0c1308db23f64bf3ac7ed9103caac9b4d1a8356f3ebc4398b4346e9514846d |
| tests/consumer-back-compat.test.ts | e2da31c43062286ec3b114c8460ddfe814c2e28647f6259d679e9214e9459c0c |
| tests/public-surface.test.ts | d81995d285ecfa6cde85d9c03e2eae8c774497ed6ff4b9c4164d97a870b3449b |
| tests/public-surface-members.test.ts | 4cb97f85e380d2d58e15587ef334c9625df76b4630ce5f32fdc9db77252302a2 |
| tests/browser-entry.test.ts | d5b5d0d705da398d7740c63336be22d30f6125f06c8a813ec7aef8cb7b3256b5 |
| tests/loc-budget.test.ts | 4550ecf509dea758c46b11158cd1cc0156793e2e92538be645c93b187c62fd28 |
| tests/version-sync.test.ts | 90d9782fee80a2eb01e850fdfb656f54eda3cff5e0424b398295770d84140fc7 |
| docs/guides/commands-and-events.md | 209344a981e903475bae53ab316e648cf177a15cc0de4bbabd8666607711f59c |
| docs/guides/ai-integration.md | bab062217f9ff58c82f9a0d6137c745c96d8c13976b2aa059998af331241141d |
| docs/guides/public-api-and-invariants.md | 18bfde377bce2dbb8669a3c0f1d05088ff69492c963a101792ff4c4b65888701 |
| docs/guides/strict-mode.md | c4201957f57548aed775c4b66542f1272834ef68516ce68010d0de8de55699de |
| docs/api-reference.md | 3ea3c4f25c5389faf7bdd04ae9d01010b5dd2169cfbb07a558d04c782bc255f6 |
| README.md | 8bddf13a56848b69ffcb3f164416d38f2ffd3e0eb4b68cefabb555e4e45178d6 |
| package.json | d5fa5baa76953c74e77c3f52a73d0b45b036d3f8b2194673ad21f0102334e1a2 |
| tsconfig.json | 77d17a7d849c860f8718d45394c29b413eb9a4d691f3ca9ac7b4703a16e8c3e1 |
| ../fleet/docs/skills/self-improvement/SKILL.md | 6158ad7f472d589f87b5b789f302c0128d6e5c1d131dc2a39dada6a6ab46672c |
<!-- END RETAINED M3 PREPARATION -->

Retained-body verification: SHA256 10a7921bde15003a1dd2b133e1ab7f44692a744a1a5b5541b32d2245687ceca2. The envelope and footer are provenance only; the authored body was neither condensed nor rewritten.
