# Review 0: implementation

## Target

civ-engine commita7a846c78a55ff729a5cf248e84168eaa8daebd2, tree40bce2399898809bc40316fa392e79c332bfbe18 against base228380beb3673189ea9a6cc848362076777e6440. Accepted Option A command precheck, API/type/transaction boundary and compatibility evidence.

## Reviewers and coverage

Independent in-session gpt-6-astra/xhigh, read-only exact tree and evidence. External CLI source export was rejected earlier in this task and was not retried; no provider CLI report is claimed.

## Reports

### gpt-6-astra / xhigh

No material findings in frozen staged tree `40bce2399898809bc40316fa392e79c332bfbe18` against base `228380beb3673189ea9a6cc848362076777e6440`. Read-only Git comparisons confirmed that the index and working files matched the supplied tree.

Verified against the accepted Option A contract:

- World.precheckCommand (src/world-commands.ts:48) invokes the existing validator pipeline once. Rejection precedes payload traversal, returns the first normalized rejection/index, and clones its details. Acceptance runs and discards the existing JSON clone. Both branches construct exactly the seven approved fields.
- The method introduces no queue operation, sequence allocation, emission, warning-latch access, tick advance, or mutation-phase wrapper. It preserves thrown-value identity and permits the documented callback side effects.
- The diff leaves `submitWithResult`, `validateCommand`, and `normalizeCommandValidationResult` unchanged. The retained body-proof report agrees with that diff. Existing submission still performs its original validation, clone, sequence allocation, enqueue, and emission.
- Transaction exclusion (src/command-transaction.ts:24) feeds both the readonly type and runtime proxy. P22 verifies rejection before validator effects; the independent negative consumer assertion checks the type boundary.
- Node/browser/facade exports, literal-key inference, public-surface fixtures, and 2.9.0 metadata match the additive API. Documentation distinguishes current observation from queue acceptance, durable persistence, and later execution. E03 game adoption remains explicitly open.

**Surrounding code verified outside the diff:** cloneJsonValue (src/json.ts:71) validates and then serializes, supporting the accepted getter/`toJSON` failure boundary. SessionRecorder (src/session-recorder.ts:174) wraps `submitWithResult`, which direct precheck bypasses. getObservableTick (src/world-core.ts:287) reads completed/published/failure ticks; tick publication (src/world-tick.ts:201) occurs after systems and before diff listeners. These support the corrected P25 expectations of `[0,1]` inside systems and `[1,2]` in diff callbacks.

The tests provide substantive coverage of acceptance/rejection ordering, defensive copies, hostile JSON, original exceptions, queue preservation, recorder/history absence, poison warnings, strict caller phase, revalidation, and legacy clone work. Retained logs show actual assertion failures for C01–C12, the C09 negative-type failure, and all eleven gates passing with1,907 root tests plus one TODO and22 MCP tests. Current source hashes match the control-restoration receipt.

**Evidence limitation:** each mutation ran its selected discriminator—for example, C01 ran P01. The logs do not demonstrate every additional discriminator listed in the preparation table turning red. This limits the mutation-proof claim; it does not establish an implementation defect.

Bounds: read-only in-session review; no mutations, tests, gates, benchmarks, installations, network requests, or external reviewer CLI were run. Gate/control results were inspected from retained evidence rather than reproduced. Prior milestone delivery and ownership-approval records were checked for consistency, not independently verified externally. Integration, hosted publication, artifact verification, and the actual paused-save consumer flow remain outside this review.

## Findings and disposition

No material findings. Root accepts the reviewed candidate. Mutation evidence establishes twelve selected failing discriminators, not every possible row in the preparation table; no broader claim is made.

## Verification

Root inspected the exact API diff, transaction guard, seven-field type, immutable legacy-body evidence, full-gate completion, work-document structure and credential-marker scan. The reviewed tree is recoverable ata7a846c. Final delivery gates and hosted artifact verification follow separately.

## Round outcome

Accepted without implementation repair. E03 paused-save game adoption remains open; this API alone does not persist commands.
