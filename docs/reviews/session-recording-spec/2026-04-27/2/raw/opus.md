I have enough grounding. Writing the iter-2 review now.

# Multi-CLI Design Review — Session Recording & Replay Spec, Iteration 2

**Reviewer:** Opus (claude opus xhigh, acting as senior software architect for synthesis).
**Inputs:** `docs/reviews/session-recording-spec/2026-04-26/1/REVIEW.md`, `docs/design/2026-04-26-session-recording-and-replay-design.md` (v2 draft), `ai-first-dev-roadmap.md`, `ARCHITECTURE.md`, `AGENTS.md`, engine source (`world.ts`, `history-recorder.ts`, `scenario-runner.ts`, `serializer.ts`).

## A. Iter-1 Finding Closure

| # | Verdict | Note |
| - | ------- | ---- |
| CR1 | Closed | `RecordedCommand` added (§4 row, §5.1, §7.1 step 1+4); replaces `CommandSubmissionResult[]` for replay. |
| CR2 | Closed | All sink methods are sync (§8); `await`/`Promise` removed; §8 explicitly justifies. |
| CR3 | Closed | Replay-across-failure is non-goal (§2); `BundleIntegrityError(code:'replay_across_failure')` (§9.1, §12). |
| CR4 | Closed | §9.1 explicitly walks `t = startTick … targetTick - 1`, submits then steps. "Why this off-by-one is correct" paragraph correct vs `world.ts:1275-1281` and `world.ts:1537,1561,1729-1739`. |
| CR5 | Closed | §11.1 clause 2 forbids mid-tick submit; §9.1 paragraph confirms selfCheck surfaces double-submit as command-stream divergence. |
| CR6 | Closed | `'inline'` ref dropped (§5.1); `dataUrl` / `sidecar` only; sidecar bytes via `source.readSidecar(id)`. |
| H1 | Closed | §9.3 explicitly includes `(initialSnapshot, snapshots[0])` segment + scenario one-segment fallback. |
| H2 | Closed | §10 uses standalone `scenarioCaptureToBundle()`; per-check tick limitation acknowledged with `tick: capture.tick`. |
| H3 | Closed | `commands.jsonl`/`executions.jsonl`/`failures.jsonl`/`markers.jsonl` in §5.2; `SessionSource` interface in §8. |
| H4 | Closed | §11.1 clause 4 — validators must be pure. |
| H5 | Closed | §11.1 clauses 8 (registration order, factory part of contract) and 9 (engine + Node major coupling, transcendentals). |
| H6 | Closed | `SelfCheckResult` has `stateDivergences/eventDivergences/executionDivergences`; §9.3 algorithm checks all three. |
| H7 | Closed | §9.1 lists `BundleRangeError` for `< startTick` / `> endTick`; `startTick` short-circuit; `BundleIntegrityError` for failure span. |
| H8 | Closed | §10 explicitly documents post-setup `initialSnapshot` and the implication for `worldFactory`. |
| H9 | Closed | §6 `MarkerRefs.entities: EntityRef[]`; rationale included. |
| M1 | Closed | §6.1 splits live (strict) vs retroactive (lenient + `validated:false`). |
| M2 | Closed | §7.1 lifecycle is consistent; `RecorderClosedError` for re-connect; destroyed-world tolerance. |
| M3 | Closed | §14 lists `concepts.md`, `ai-integration.md`, `getting-started.md`, `building-a-game.md` as mandatory. |
| M4 | Closed | §9.1 + §12: warn on minor, throw `BundleVersionError` on major. |
| M5 | Closed | §9 method comment: "Inclusive on both ends." |
| M6 | Closed | §13.3 paired tests for clauses 1–9 enumerated. |
| M7 | Closed | §13.2: "≥ 5x recording throughput **when openAt() walks a single segment**; selfCheck across N segments scales linearly." |
| M8 | Closed | ADR 4 added to §15. |
| M9 | Closed | §12 `BundleIntegrityError` row explicitly excludes stale entity refs. |
| L1 | Closed | `provenance: 'engine' | 'game'` field on `Marker`; `scenarioCaptureToBundle()` writes `'engine'`. |
| L2 | Closed | §16 Open Question 5; §5.2 note. |
| L3 | Closed | §8 `BufferedSink` mention + §16 Open Question 7. |
| L4 | Closed | ADR 1: "~80–100 LOC." |
| N1 | Partially | §5.2 notes the manifest rewrite enables prefix reads of `incomplete:true` bundles, but §9.1 / §12 don't *explicitly* state that `openAt()` accepts incomplete bundles up to `metadata.endTick`. Behavior is inferable from `endTick` semantics; one explicit sentence in §9.1 would close this. |
| N2 | Closed | §9.3 + §16 Open Question 1: Map insertion-order invariant stated. |
| N3 | Closed | §13.5 CI gate (with caveat — see new finding M-new-4 below). |

**Closure summary:** 30 of 31 fully closed; N1 has a minor wording gap. No iter-1 fix introduced an obviously-broken regression.

## B. New Issues Introduced by the Revision

### High

**H-new-1. Command capture has two overlapping paths; spec doesn't reconcile them.**
§7.1 step 2 subscribes to `world.onCommandResult` *and* step 4 wraps `submit/submitWithResult` to write `RecordedCommand` from `{type, data, result}`. Both fire for every accepted command. Without an explicit reconciliation rule, the recorder will write each submission to `commands.jsonl` twice (once via wrap, once via listener) — corrupting `bundle.commands` and `selfCheck()` execution streams. Pick one path and say so. (Recommended: wrap is the sole `commands` writer; the listener subscription is dropped, since wrap covers the same surface and additionally has the payload.)

**H-new-2. §9.1 step 3b references a `submitWithResult` flag on `RecordedCommand` that the §5.1 type does not declare.**
Step 3b: "(or `submitWithResult` if the recorded result was from `submitWithResult`; the recorder distinguishes via a flag on `RecordedCommand`)". §5.1 `RecordedCommand` has `submissionTick / sequence / type / data / result` — no flag. Implementation will either silently drop the disambiguation (defaulting to `submit`) or hit a missing-field error. The flag is also unnecessary since `world.submit()` is literally `world.submitWithResult().accepted` (`world.ts:720-722`); the replayer can always call `submitWithResult` and discard the boolean. Drop the flag clause; commit to "always replay via `submitWithResult`."

**H-new-3. Multi-recorder wrap-chain teardown is undefined and will misbehave.**
§7.2: "Multiple recorders attached to one world. Supported; both wrap `submit`/`submitWithResult` (forming a chain)". §7.1 step 6 says disconnect "Unwraps `submit`/`submitWithResult`". The naive `world.submit = saved_original` restore breaks the chain whenever the *inner* recorder disconnects first: the outer recorder's wrap (which closed over the now-replaced `world.submit`) is dropped, while its listener subscription remains — a third capture path emerges and the outer's bundle loses payload data without any error. Each recorder must track its predecessor wrap and remove only its own link from the chain on disconnect. Either spec the chain protocol, or restrict v1 to a single recorder and document it.

### Medium

**M-new-1. §7.1 step 5 attachment defaults are phrased to mean FileSink stuffs all attachments into the manifest as base64.**
Quote: "Attachments default to `dataUrl` mode if under `MemorySink`'s threshold (64 KiB by default) **or unconditionally on `FileSink`**; pass `{ sidecar: true }` to force sidecar storage." That parses as "FileSink → always dataUrl." This contradicts §5.2 (which carves out `attachments/<id>.<ext>`) and the obvious sensible policy (disk-backed sinks should default to sidecar). The wording is reversed: `FileSink` should default to **sidecar** for any blob (or for over-cap blobs, with under-cap going to manifest as dataUrl); `MemorySink` defaults to dataUrl until threshold and rejects oversize unless `allowSidecar` was set per CR6's fix. Fix the §7.1 sentence.

**M-new-2. §10 `scenarioCaptureToBundle()` signature does not accept the `commands` parameter the prose requires.**
Signature in §10: `(capture, options?: { sourceLabel?: string; nodeVersion?: string })`. Prose later: "the simplest path in v1: `scenarioCaptureToBundle()` accepts an additional optional `commands?: RecordedCommand[]` parameter that the scenario author supplies if they want a replayable bundle." Without this in the signature, replayable scenario bundles are unreachable and §13.5's CI gate cannot work. Either widen the signature or commit to the alternative ("`captureCommandPayloads: true` on `WorldHistoryRecorder`") and remove the prose claim. Today the spec states both options as TBD in §16.6, but §10's prose treats one of them as the contract.

**M-new-3. §10 hardcodes `metadata.startTick = 0` "by convention."**
Engine permits constructing a `World` with any tick (e.g., from a deserialized snapshot) and passing it to `runScenario`. In that case, `capture.history.initialSnapshot.tick` ≠ 0, but `metadata.startTick = 0` plus `metadata.endTick = capture.tick` makes `durationTicks` wrong and the §9.1 range checks reject every legitimate `openAt(tick)` for `tick < snapshot.tick`. Use `capture.history.initialSnapshot.tick` (or `capture.tick - capture.history.ticks.length`).

**M-new-4. §13.5 CI gate is incompatible with §10 unless every existing scenario is migrated to capture command payloads.**
§10: "Without payloads, the bundle is diagnostic-only … `openAt(tick)` throws `BundleIntegrityError(code: 'no_replay_payloads')`." §13.5: "every existing scenario … is wrapped with `scenarioCaptureToBundle(capture)` followed by `replayer.selfCheck()`. selfCheck failures fail `npm test`." `selfCheck()` walks `openAt`-style replay, so non-replayable bundles either crash or no-op. Either: (a) migrate every existing scenario to enable `captureCommandPayloads` (whose implementation is itself an Open Question — §16.6); or (b) explicitly say "`selfCheck()` returns `ok: true, checkedSegments: 0` and emits a warning when payloads are absent" and frame the CI gate as best-effort. Pick one before §18 acceptance.

**M-new-5. Cross-references and failure-mode wording in §7.2 / §12 are inconsistent.**
- §7.2 references "§11.5" — §11 only has 11.1, 11.2, 11.3.
- §7.2: "Throws `SinkWriteError` synchronously from the listener back to the engine. Per §11.5, the engine's `onDiff` / command listeners' exceptions are caught and `console.error`'d but do not propagate; the recorder additionally sets `metadata.incomplete = true`…"
- §12: "The recorder catches and sets `metadata.incomplete = true` rather than propagating."

These are three different stories about whether `SinkWriteError` propagates out of the listener: one says throws, one says caught-by-engine, one says caught-by-recorder. The intended policy (recorder catches, sets `incomplete`, short-circuits future writes) is sound; the wording should be unified in §7.2 and the §11.5 reference removed.

**M-new-6. Wrap timing pre-`connect()` is undefined.**
§7.1 step 1 (Construction) wraps `submit`/`submitWithResult`. Step 2 (`connect()`) opens the sink. What does the wrap do for submissions made between `new SessionRecorder(world)` and `recorder.connect()`? Three plausible behaviors (write to a not-yet-open sink → error; buffer in memory and flush on connect; silently no-op the capture). Spec is silent. Defer the wrap to `connect()` (recommended), or spec the buffer policy.

**M-new-7. §5.2 manifest rewrite cadence is undefined.**
"the manifest is rewritten on each significant change." If "significant" = every tick, that's hot-path I/O on `FileSink` (read + parse + serialize + write per tick) and the spec's "engine slows in lockstep" comment in §8 understates the cost. If "significant" = only `disconnect()`, then `incomplete:true` bundles can't be replayed after a crash because the manifest's `endTick` is the construction-time placeholder (per §7.1 step 2: "rewritten at finalization"). Pick a cadence (e.g., per snapshot interval, per N ticks, or atomic-rename on each tick) and document it.

### Low

**L-new-1. `referencesContractClause` field is asserted in §11.3 but missing from the §9 / §12 type definitions and is generally not derivable.**
§11.3: "`MarkerValidationError` and the three divergence types include `referencesContractClause: number` (1–9) for cross-referencing back to the offending clause." But §9 `StateDivergence`/`EventDivergence`/`ExecutionDivergence` don't carry the field, and the replayer cannot in general infer which clause caused a state-divergence (a wrong number could come from many root causes). For `MarkerValidationError` it makes sense (validator knows which rule fired). For divergence types, drop the requirement or clarify it as best-effort `referencesContractClause?: number`.

**L-new-2. §9.3 references a nonexistent `worldA.getCommandExecutionResults()`.**
"if checkExecutions: capture `worldA.getCommandExecutionResults()` (or via listener)". `World` has no such method (`world.ts` exposes `onCommandExecution`/`offCommandExecution`). Listener is the only path. Drop the parenthetical and commit.

**L-new-3. `SessionMetadata.failureSpans` naming and shape mismatch.**
Field is `Array<{ failedTick: number }>` (a bag of single ticks), but §9.1 talks about "inside or after a recorded `TickFailure` span," implying ranges. Per `world.ts:1763-1782`, a failed tick consumes a tick number and recovery resumes at `failedTick + 1`; the engine never produces a multi-tick failure region. Rename to `failedTicks: number[]` and tighten §9.1's language to "ticks at or after the first entry of `metadata.failedTicks`."

### Note

**N-new-1. §9.1 step 1's discriminator between `bundle.snapshots[i]` (a `SessionSnapshotEntry` with outer `.tick`) and `bundle.initialSnapshot` (a raw `WorldSnapshot` with internal `.tick`) is implicit.**
Step 1: "Find the latest snapshot S in `bundle.snapshots ∪ {bundle.initialSnapshot}` with `S.tick <= tick`." A reader has to know which `.tick` is meant for each. Replace with `bundle.metadata.startTick` for the initial snapshot, or normalize to a uniform `{tick, snapshot}` shape over the union.

**N-new-2. `eventsBetween(fromTick, toTick)` returns `SessionTickEntry[]`, not events.**
Naming bug only. Either rename (`tickEntriesBetween`) or change return type. Cosmetic.

## C. Remaining Real Issues at Any Severity

The remaining items above (H-new-1 through N-new-2) are the ones I'd hold the spec on. Iter-1's iter-2 plan has otherwise landed cleanly; the v2 spec is structurally sound and the determinism contract is now coherent enough to plan against.

The single iter-1 holdover is N1's incomplete-bundle wording (one sentence in §9.1 / §12 saying "openAt accepts `incomplete:true` bundles up to `metadata.endTick`").

## Overall Assessment

**Ship after addressing H-new-1, H-new-2, H-new-3, M-new-1, M-new-2, M-new-3, M-new-4, M-new-5.** All eight are spec-clarification fixes (one to a few paragraphs each), not redesigns. The medium-to-low remainder can fold into the same revision pass. After that, the spec is implementation-ready and writing-plans can begin. One more short iteration (iter-3) should converge.
