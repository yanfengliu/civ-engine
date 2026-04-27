commit 930e679bae8dd458fae8bac34e96061e1075d57a
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 00:57:32 2026 -0700

    docs(design): session-recording spec iter-3 review fixes (v3 → v4)
    
    Iter-3 multi-CLI review (Codex + Opus; Gemini quota-out 10th iter)
    verified iter-2 closures (24 of 25 fully closed by Opus; 18 closed +
    7 partial by Codex) and surfaced 4 High, 3 Medium, 5 Low spec-text
    issues introduced by v3. v4 closes all of them. No architectural
    change.
    
    Highlights:
    - §7.3 single-wrap protocol: only wrap submitWithResult, not submit.
      submit delegates through submitWithResult per world.ts:720-728, so
      a single wrap captures both code paths once each. Wrapping both
      was double-capturing every submit() call.
    - §7.1 + ADR 1 mutual exclusion: payload-capturing recorders
      (SessionRecorder OR WorldHistoryRecorder({ captureCommandPayloads:
      true })) are mutually exclusive per world. Default-config
      WorldHistoryRecorder still composes freely. Eliminates the wrap-
      chain teardown ambiguity for the mixed case.
    - §5.1 + §5.2 + §7.1 + §9.1: persistedEndTick metadata field tracks
      the last successfully persisted snapshot tick separately from
      endTick (live world tick at finalization). Incomplete bundles
      bound replay by persistedEndTick, not endTick, so abnormal
      disconnect cannot overstate the persisted prefix.
    - §10.2: WorldHistoryState.recordedCommands?: RecordedCommand[] is
      a NEW additive field rather than widening the existing commands
      type. Pure additive change — no public-type breaking, c-bump only.
    - §10.1: scenario adapter throws BundleIntegrityError on null
      initialSnapshot; §10.2 quickstart names captureInitialSnapshot:
      true alongside captureCommandPayloads: true as the joint
      requirement for replayable scenario bundles.
    - §10.2 quickstart code sample fixes: drop await (runScenario is
      synchronous per src/scenario-runner.ts:133); rename steps: to
      run: (matches ScenarioConfig at :106).
    - §7.1 step 4: submissionTick uses result.tick (which submitWithResult
      populates from getObservableTick() internally) instead of calling
      the private method directly.
    - §13.5 + §18: CI gate single rule — all engine scenarios opted in
      by end of implementation phase; warning path is for user code's
      diagnostic-only bundles only.
    - §13.4 cross-b/cross-a engine version test cases match §11.1
      clause 9 unified rule.
    - §13.1 stale wording cleanups (no submitWithResult flag; FileSink
      attachment policy matches §7.1 step 5).
    - §7.1 step 6: lastError wraps arbitrary throws into
      SessionRecordingError subclass.
    - §5.1 reference §11.5 (dead) → §11.1 clause 2.
    
    Iter-4 review queued for convergence verification.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

 ...26-04-26-session-recording-and-replay-design.md |   82 +-
 .../session-recording-spec/2026-04-27/3/REVIEW.md  |  155 +
 .../session-recording-spec/2026-04-27/3/diff.md    |  568 +++
 .../2026-04-27/3/raw/codex.md                      |   48 +
 .../2026-04-27/3/raw/codex.stderr.log              | 4358 ++++++++++++++++++++
 .../2026-04-27/3/raw/gemini.md                     |    1 +
 .../2026-04-27/3/raw/opus.md                       |   98 +
 .../2026-04-27/3/raw/opus.stderr.log               |    0
 8 files changed, 5274 insertions(+), 36 deletions(-)

--- v3->v4 spec diff ---

commit 930e679bae8dd458fae8bac34e96061e1075d57a
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 00:57:32 2026 -0700

    docs(design): session-recording spec iter-3 review fixes (v3 → v4)
    
    Iter-3 multi-CLI review (Codex + Opus; Gemini quota-out 10th iter)
    verified iter-2 closures (24 of 25 fully closed by Opus; 18 closed +
    7 partial by Codex) and surfaced 4 High, 3 Medium, 5 Low spec-text
    issues introduced by v3. v4 closes all of them. No architectural
    change.
    
    Highlights:
    - §7.3 single-wrap protocol: only wrap submitWithResult, not submit.
      submit delegates through submitWithResult per world.ts:720-728, so
      a single wrap captures both code paths once each. Wrapping both
      was double-capturing every submit() call.
    - §7.1 + ADR 1 mutual exclusion: payload-capturing recorders
      (SessionRecorder OR WorldHistoryRecorder({ captureCommandPayloads:
      true })) are mutually exclusive per world. Default-config
      WorldHistoryRecorder still composes freely. Eliminates the wrap-
      chain teardown ambiguity for the mixed case.
    - §5.1 + §5.2 + §7.1 + §9.1: persistedEndTick metadata field tracks
      the last successfully persisted snapshot tick separately from
      endTick (live world tick at finalization). Incomplete bundles
      bound replay by persistedEndTick, not endTick, so abnormal
      disconnect cannot overstate the persisted prefix.
    - §10.2: WorldHistoryState.recordedCommands?: RecordedCommand[] is
      a NEW additive field rather than widening the existing commands
      type. Pure additive change — no public-type breaking, c-bump only.
    - §10.1: scenario adapter throws BundleIntegrityError on null
      initialSnapshot; §10.2 quickstart names captureInitialSnapshot:
      true alongside captureCommandPayloads: true as the joint
      requirement for replayable scenario bundles.
    - §10.2 quickstart code sample fixes: drop await (runScenario is
      synchronous per src/scenario-runner.ts:133); rename steps: to
      run: (matches ScenarioConfig at :106).
    - §7.1 step 4: submissionTick uses result.tick (which submitWithResult
      populates from getObservableTick() internally) instead of calling
      the private method directly.
    - §13.5 + §18: CI gate single rule — all engine scenarios opted in
      by end of implementation phase; warning path is for user code's
      diagnostic-only bundles only.
    - §13.4 cross-b/cross-a engine version test cases match §11.1
      clause 9 unified rule.
    - §13.1 stale wording cleanups (no submitWithResult flag; FileSink
      attachment policy matches §7.1 step 5).
    - §7.1 step 6: lastError wraps arbitrary throws into
      SessionRecordingError subclass.
    - §5.1 reference §11.5 (dead) → §11.1 clause 2.
    
    Iter-4 review queued for convergence verification.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/docs/design/2026-04-26-session-recording-and-replay-design.md b/docs/design/2026-04-26-session-recording-and-replay-design.md
index 19c4c08..1be8853 100644
--- a/docs/design/2026-04-26-session-recording-and-replay-design.md
+++ b/docs/design/2026-04-26-session-recording-and-replay-design.md
@@ -1,6 +1,6 @@
 # Session Recording & Replay — Design Spec
 
-**Status:** Draft v3 (2026-04-27). Revised after iter-2 multi-CLI review (Codex + Opus; Gemini quota-out 9th iter). See `docs/reviews/session-recording-spec/2026-04-26/1/REVIEW.md` (iter-1) and `docs/reviews/session-recording-spec/2026-04-27/2/REVIEW.md` (iter-2) for the findings folded into v2 and v3 respectively. Awaiting iter-3 convergence before writing-plans.
+**Status:** Draft v4 (2026-04-27). Revised after iter-3 multi-CLI review (Codex + Opus; Gemini quota-out 10th iter). See `docs/reviews/session-recording-spec/2026-04-26/1/REVIEW.md` (iter-1), `docs/reviews/session-recording-spec/2026-04-27/2/REVIEW.md` (iter-2), and `docs/reviews/session-recording-spec/2026-04-27/3/REVIEW.md` (iter-3) for the findings folded into each revision. Awaiting iter-4 convergence verification before writing-plans.
 
 **Scope:** Engine-level primitives only (Scope B from brainstorming). Game-side annotation UI, standalone viewer, synthetic playtest harness, counterfactual replay, and strict-mode determinism enforcement are explicitly out of scope and tracked in `docs/design/ai-first-dev-roadmap.md`.
 
@@ -117,11 +117,12 @@ interface SessionMetadata {
   nodeVersion: string;          // process.version at connect() time; replayer warns on mismatch
   recordedAt: string;           // ISO 8601 timestamp at connect()
   startTick: number;            // tick at connect()
-  endTick: number;              // tick at disconnect() or toBundle()
+  endTick: number;              // tick at disconnect() or toBundle() (the live world.tick at finalization, regardless of persistence success)
+  persistedEndTick: number;     // tick of last successfully persisted snapshot; advances on every successful sink.writeSnapshot() and on terminal snapshot success at disconnect()
   durationTicks: number;        // endTick - startTick
   sourceKind: 'session' | 'scenario';
   sourceLabel?: string;         // optional human label (scenario name, session label)
-  incomplete?: true;            // set if recorder did not reach disconnect() cleanly (sink failure, world destroy)
+  incomplete?: true;            // set if recorder did not reach disconnect() cleanly (sink failure, world destroy). When true, replay uses persistedEndTick as the upper bound
   failedTicks?: number[];       // ticks where TickFailure was recorded; replay refuses ticks at or after the first entry
 }
 
@@ -158,7 +159,7 @@ interface AttachmentDescriptor {
 }
 ```
 
-`Marker` is defined in §6. `RecordedCommand` is the canonical replay input (`CommandSubmissionResult` alone does not carry the original `data` payload, so it cannot drive replay). Per §11.5, `RecordedCommand` MUST originate from outside the tick loop — submissions made from inside a system, command handler, or event listener are a determinism contract violation and break replay.
+`Marker` is defined in §6. `RecordedCommand` is the canonical replay input (`CommandSubmissionResult` alone does not carry the original `data` payload, so it cannot drive replay). Per §11.1 clause 2, `RecordedCommand` MUST originate from outside the tick loop — submissions made from inside a system, command handler, or event listener are a determinism contract violation and break replay.
 
 `SessionBundle` is strict JSON: `JSON.stringify(bundle)` is a complete, lossless representation **of everything in the JSON shape itself** — metadata, snapshots, ticks, commands, executions, failures, markers, and dataUrl-embedded attachment payloads. Sidecar attachment bytes are referenced by id from `AttachmentDescriptor.ref.sidecar` and stored externally to the bundle (FileSink: `attachments/<id>.<ext>`; MemorySink: parallel internal map); consumers retrieve them via `source.readSidecar(id)` (see §8). ADR 2 in §15 notes the MemorySink/FileSink shape symmetry: both implement `SessionSink & SessionSource`; the JSON-typed bundle is identical regardless of producer (modulo whether each `AttachmentDescriptor.ref` is `dataUrl` or `sidecar`).
 
@@ -183,10 +184,10 @@ interface AttachmentDescriptor {
 **Manifest rewrite cadence.** The manifest is rewritten at three explicit points:
 
 1. **`open()`** — initial manifest with `metadata.startTick`, `metadata.recordedAt`, and zero values for `endTick` / `durationTicks`.
-2. **On each snapshot write** — manifest's snapshot index updated and `metadata.endTick` advanced to `world.tick` (so a crash mid-run leaves a manifest pointing at the last successfully written snapshot).
-3. **`close()`** — final rewrite with `metadata.endTick` = `world.tick` at disconnect, `metadata.durationTicks` populated, `metadata.incomplete` cleared (or set to `true` if disconnect path was abnormal).
+2. **On each successful snapshot write** — manifest's snapshot index updated and `metadata.persistedEndTick` advanced to `world.tick` (so a crash mid-run leaves a manifest pointing at the last successfully persisted snapshot tick). `metadata.endTick` is unchanged here (it advances only at finalization).
+3. **`close()`** — final rewrite with `metadata.endTick` = `world.tick` at disconnect, `metadata.durationTicks` = `endTick - startTick`, `metadata.incomplete` either omitted (clean disconnect) or set to `true` (abnormal — sink failure or destroyed world). On clean disconnect, `metadata.persistedEndTick === metadata.endTick` (terminal snapshot succeeded). On abnormal disconnect, `persistedEndTick < endTick` and `incomplete: true`.
 
-Each rewrite is atomic-rename (`manifest.tmp.json` → `manifest.json` via `fs.renameSync`) so a crash mid-write never produces a corrupted manifest. Per-tick manifest rewrites are NOT performed — that would be hot-path I/O. A reader of an `incomplete: true` bundle can replay up to the most recent snapshot tick (which is also `metadata.endTick` for incomplete bundles).
+Each rewrite is atomic-rename (`manifest.tmp.json` → `manifest.json` via `fs.renameSync`) so a crash mid-write never produces a corrupted manifest. Per-tick manifest rewrites are NOT performed — that would be hot-path I/O. A reader of an `incomplete: true` bundle can replay up to `metadata.persistedEndTick` (the last persisted snapshot tick), not `metadata.endTick` (which may overstate the persisted prefix).
 
 `SessionReplayer.fromSource(fileSource)` reads `manifest.json` eagerly, then streams individual JSONL files lazily as needed. Snapshots are loaded on demand via `source.readSnapshot(tick)`.
 
@@ -288,11 +289,11 @@ type AttachmentId = string;
 ### 7.1 Recorder lifecycle
 
 1. **Construction.** Generates `sessionId`, validates config, prepares listener and wrap *closures* but does NOT install them. The world is not yet observed.
-2. **`connect()`.** Calls `sink.open(initialMetadata)` where `initialMetadata.startTick = world.tick`, `recordedAt = now()`, `engineVersion` and `nodeVersion` populated, `endTick` and `durationTicks` zero (rewritten at finalization). Calls `world.serialize()` and writes the initial snapshot via `sink.writeSnapshot()`. **Then** installs the `submit`/`submitWithResult` wrap (§7.3) and subscribes to `world.onDiff`, `world.onCommandExecution`, `world.onTickFailure`. Subsequent ticks emit live to the sink. Calling `connect()` while already connected is a no-op; calling `connect()` after `disconnect()` throws `RecorderClosedError`. **Calling `connect()` on a poisoned world** throws `RecorderClosedError(code: 'world_poisoned')` — recording a known-broken world produces a non-replayable bundle (the snapshot lacks poison state per `WorldSnapshotV5`); a future spec extends `WorldSnapshot` to v6 and lifts this restriction. **Calling `connect()` when another `SessionRecorder` is already attached to the same world** throws `RecorderClosedError(code: 'recorder_already_attached')` — v1 restricts to a single SessionRecorder per world to avoid the wrap-chain teardown ambiguity (multiple `WorldHistoryRecorder` instances are still allowed; only `SessionRecorder` has the single-instance constraint, tracked via a hidden `world.__sessionRecorder` slot).
+2. **`connect()`.** Calls `sink.open(initialMetadata)` where `initialMetadata.startTick = world.tick`, `persistedEndTick = world.tick`, `recordedAt = now()`, `engineVersion` and `nodeVersion` populated, `endTick` and `durationTicks` zero (rewritten at finalization). Calls `world.serialize()` and writes the initial snapshot via `sink.writeSnapshot()` (which advances `metadata.persistedEndTick` to `world.tick`). **Then** installs the `submitWithResult` wrap (§7.3) and subscribes to `world.onDiff`, `world.onCommandExecution`, `world.onTickFailure`. Subsequent ticks emit live to the sink. Calling `connect()` while already connected is a no-op; calling `connect()` after `disconnect()` throws `RecorderClosedError`. **Calling `connect()` on a poisoned world** throws `RecorderClosedError(code: 'world_poisoned')` — recording a known-broken world produces a non-replayable bundle (the snapshot lacks poison state per `WorldSnapshotV5`); a future spec extends `WorldSnapshot` to v6 and lifts this restriction. **Calling `connect()` when another payload-capturing recorder is already attached to the same world** throws `RecorderClosedError(code: 'recorder_already_attached')`. v1 restricts to a single payload-capturing recorder per world to avoid wrap-chain teardown ambiguity. The "payload-capturing" set is: any `SessionRecorder`, plus any `WorldHistoryRecorder` constructed with `captureCommandPayloads: true`. These are mutually exclusive on a given world. Default-config `WorldHistoryRecorder` instances (without `captureCommandPayloads`) do NOT wrap and remain freely composable with `SessionRecorder`. The constraint is tracked via a hidden `world.__payloadCapturingRecorder` slot.
 3. **Per-tick capture.** On each `onDiff`, the recorder builds a `SessionTickEntry`, clones via existing `cloneJsonValue` discipline, calls `sink.writeTick()` synchronously. If `world.tick % snapshotInterval === 0`, calls `world.serialize()` and `sink.writeSnapshot()` synchronously. `onCommandExecution` is the source for executions; `onTickFailure` for failures (and updates `metadata.failedTicks`).
-4. **Submission capture (single path).** The wrapped `submit`/`submitWithResult` is the SOLE writer to `commands.jsonl`. It captures `{ type, data, sequence, submissionTick: world.getObservableTick(), result }` into a `RecordedCommand` and calls `sink.writeCommand()` synchronously before returning the result to the caller. The `onCommandResult` listener is NOT subscribed (it would double-write since the wrap already produces the result-carrying record).
+4. **Submission capture (single wrap).** The wrapped `submitWithResult` is the SOLE writer to `commands.jsonl`. The recorder wraps **only** `submitWithResult`, NOT `submit` — because per `src/world.ts:720-728`, `world.submit()` calls `this.submitWithResult().accepted` internally, so wrapping at `submitWithResult` captures both code paths once each. Wrapping both would double-capture. The wrap captures `{ type, data, sequence: result.sequence, submissionTick: result.tick, result }` into a `RecordedCommand` (using `result.tick` directly — `submitWithResult` populates this from `getObservableTick()` internally per `src/world.ts:1694`, so there is no need to call the private method directly) and calls `sink.writeCommand()` synchronously before returning the result to the caller. The `onCommandResult` listener is NOT subscribed (it would double-write since the wrap already produces the result-carrying record).
 5. **Marker / attachment additions.** Validated per §6.1, then `sink.writeMarker()` / `sink.writeAttachment()` synchronously. Attachments: `MemorySink` defaults to `dataUrl` mode when `data.byteLength <= 65536` (64 KiB) and rejects oversize blobs unless `attach(..., { sidecar: true })` is passed; `FileSink` defaults to **sidecar** for any blob (the disk-backed sink keeps blobs as files; pass `{ sidecar: false }` to force `dataUrl` embedding into the manifest, only useful for very small attachments).
-6. **`disconnect()`.** If `terminalSnapshot !== false`, writes a final snapshot via `world.serialize()` + `sink.writeSnapshot()` (this guarantees every bundle has at least the `(initialSnapshot, terminalSnapshot)` segment for selfCheck — fixes H-new-4). Uninstalls the wrap, unsubscribes listeners, finalizes `metadata.endTick = world.tick` and `metadata.durationTicks`, calls `sink.close()` (which rewrites `manifest.json` with the final metadata for `FileSink`). Tolerates a destroyed world: if `world.serialize()` throws, catches the error, sets `metadata.incomplete = true` and `lastError`, skips terminal snapshot, proceeds to close. After disconnect, `addMarker`, `attach`, and `takeSnapshot` throw `RecorderClosedError`. The recorder cannot be reconnected.
+6. **`disconnect()`.** If `terminalSnapshot !== false`, writes a final snapshot via `world.serialize()` + `sink.writeSnapshot()` (this guarantees every bundle has at least the `(initialSnapshot, terminalSnapshot)` segment for selfCheck). On terminal snapshot success, `metadata.persistedEndTick` is advanced to `world.tick`. Uninstalls the wrap, unsubscribes listeners, finalizes `metadata.endTick = world.tick` and `metadata.durationTicks`, calls `sink.close()` (which rewrites `manifest.json` with the final metadata for `FileSink`). Tolerates a destroyed world: if `world.serialize()` throws, catches the error, **wraps it into a `SessionRecordingError` subclass** (so `recorder.lastError`'s `SessionRecordingError | null` type holds), sets `metadata.incomplete = true` and `recorder.lastError`, skips terminal snapshot (so `persistedEndTick` stays at the last successful snapshot), proceeds to close. After disconnect, `addMarker`, `attach`, and `takeSnapshot` throw `RecorderClosedError`. The recorder cannot be reconnected.
 7. **`toBundle()`.** Returns the canonical strict-JSON `SessionBundle` from `sink.toBundle()`. May be called before or after `disconnect()`. If called before `disconnect()`, the bundle reflects current on-disk state with `metadata.incomplete = true` (since `disconnect()` is what clears that flag).
 
 ### 7.2 Failure modes
@@ -300,32 +301,29 @@ type AttachmentId = string;
 - **Sink write failure.** The recorder catches `SinkWriteError` from sink methods, sets `metadata.incomplete = true`, sets `recorder.lastError`, marks the recorder terminal so subsequent listener invocations short-circuit (the listener body becomes a no-op). The error is observable via `recorder.lastError` and via the bundle's `incomplete` flag. The error does NOT propagate to the engine's listener invocation site (engine listener exceptions are caught and `console.error`'d by `World`; the recorder's catch is what produces the actionable signal).
 - **World destroyed while connected.** Per step 6 above, `disconnect()` tolerates serialize failure; `metadata.incomplete = true`, terminal snapshot skipped. Caller still must call `disconnect()` to finalize. Once disconnected, listener invocations from any post-destroy events are no-ops because the recorder has unsubscribed.
 - **Recorder constructed against a poisoned world.** Construction succeeds (just stores the world reference). `connect()` rejects: throws `RecorderClosedError(code: 'world_poisoned')`. The world must be `recover()`-ed before `SessionRecorder.connect()` will accept it. Recording a poisoned world is a future-spec capability.
-- **Multiple recorders attached to one world.** v1 restricts to a single `SessionRecorder` per world (per step 2 above; throws on second `connect()`). `WorldHistoryRecorder` is unrestricted and can run alongside. A future spec may extend to multiple-`SessionRecorder` chain protocol if a real consumer needs it.
+- **Multiple recorders attached to one world.** v1 restricts to a single payload-capturing recorder per world (`SessionRecorder` OR `WorldHistoryRecorder({ captureCommandPayloads: true })` — not both, not two of either; second `connect()` throws `RecorderClosedError(code: 'recorder_already_attached')`). Default-config `WorldHistoryRecorder` instances (no payload capture) do NOT wrap `submitWithResult` and freely compose with any other recorder. A future spec may extend to a chain protocol if a real consumer needs concurrent payload capture.
 
-### 7.3 `submit`/`submitWithResult` wrap protocol
+### 7.3 `submitWithResult` wrap protocol
 
-The recorder installs its wraps in `connect()` and removes them in `disconnect()`. Single-recorder restriction (per §7.2) eliminates the chain-teardown ambiguity flagged in iter-2 review. Implementation:
+The recorder installs a single wrap on `world.submitWithResult` in `connect()` and removes it in `disconnect()`. **Only `submitWithResult` is wrapped, not `submit`** — `world.submit()` delegates to `this.submitWithResult().accepted` per `src/world.ts:720-728`, so the single wrap covers both code paths. Wrapping both would double-capture every `submit()` call.
+
+Implementation:
 
 ```ts
 // At connect():
-const originalSubmit = world.submit.bind(world);
 const originalSubmitWithResult = world.submitWithResult.bind(world);
-world.submit = function recordedSubmit(type, data) {
-  const result = originalSubmit(type, data);
-  recorder._captureCommand({ type, data, result });
-  return result;
-};
 world.submitWithResult = function recordedSubmitWithResult(type, data) {
   const result = originalSubmitWithResult(type, data);
   recorder._captureCommand({ type, data, result });
   return result;
 };
 // At disconnect():
-world.submit = originalSubmit;
 world.submitWithResult = originalSubmitWithResult;
 ```
 
-The recorder always replays via `world.submitWithResult()` regardless of which method was originally used — `world.submit()` is just `world.submitWithResult().accepted` (`world.ts:720-722`), so the replayer can call `submitWithResult` and discard the boolean. No flag is needed on `RecordedCommand`.
+The recorder always replays via `world.submitWithResult()` regardless of which method was originally used — `world.submit()` is just `world.submitWithResult().accepted`, so the replayer can call `submitWithResult` and discard the `accepted` boolean. No flag is needed on `RecordedCommand`.
+
+The single-payload-capturing-recorder restriction (§7.2) ensures only one wrap exists at a time, eliminating chain-teardown ambiguity. `world.submitWithResult` is restored to its original implementation when the recorder disconnects; subsequent recorders see a clean `world.submitWithResult` and may install their own wrap.
 
 ## 8. SessionSink and SessionSource Interfaces
 
@@ -462,7 +460,8 @@ interface MarkerValidationResult {
 
 **Range and integrity preconditions:**
 
-- If `tick < bundle.metadata.startTick` or `tick > bundle.metadata.endTick`, throws `BundleRangeError`. **Incomplete bundles (`metadata.incomplete === true`) are accepted up to `metadata.endTick`** — the recorder advances `endTick` as snapshots write to disk, so an incomplete bundle's `endTick` is the last successfully written snapshot tick (see §5.2 manifest cadence).
+- For complete bundles (no `metadata.incomplete`): if `tick < bundle.metadata.startTick` or `tick > bundle.metadata.endTick`, throws `BundleRangeError`.
+- For incomplete bundles (`metadata.incomplete === true`): the upper bound is `metadata.persistedEndTick` (the last successfully persisted snapshot tick), not `metadata.endTick` (which may overstate the prefix that actually made it to disk). `tick > metadata.persistedEndTick` throws `BundleRangeError`.
 - If `tick === bundle.metadata.startTick`, returns `worldFactory(bundle.initialSnapshot)` directly without replay.
 - If `tick` falls at or after the first entry in `metadata.failedTicks`, throws `BundleIntegrityError` with `code: 'replay_across_failure'`. Replay across tick failures is out of scope (see §2; future spec extends `WorldSnapshot` to v6 to lift this).
 - Engine version and Node version compatibility per §11.1 clause 9: cross-`b` engine throws `BundleVersionError`; within-`b` warns; cross-Node-major warns but proceeds.
@@ -548,12 +547,12 @@ export function scenarioResultToBundle<TEventMap, TCommandMap>(
 
 - `metadata.sourceKind = 'scenario'`, `metadata.sourceLabel = options?.sourceLabel ?? result.name`.
 - `metadata.engineVersion` ← `package.json` version at translate time. `metadata.nodeVersion` ← `options?.nodeVersion ?? process.version`.
-- `metadata.startTick` ← `result.history.initialSnapshot?.tick ?? 0`. **Not hardcoded to 0.** `runScenario` may be invoked on a world that has already advanced beyond tick 0 (e.g., from a deserialized snapshot, or from setup-time `world.step()` calls). `result.history.initialSnapshot.tick` is the authoritative starting point — `runScenario` calls `history.clear()` after `setup` runs (`src/scenario-runner.ts:175`) which rebases `initialSnapshot` to the post-setup, pre-run state.
+- `metadata.startTick` ← `result.history.initialSnapshot.tick`. **Not hardcoded to 0.** `runScenario` may be invoked on a world that has already advanced beyond tick 0 (e.g., from a deserialized snapshot, or from setup-time `world.step()` calls). `result.history.initialSnapshot.tick` is the authoritative starting point — `runScenario` calls `history.clear()` after `setup` runs (`src/scenario-runner.ts:175`) which rebases `initialSnapshot` to the post-setup, pre-run state. **Precondition:** `result.history.initialSnapshot !== null`. If null (which happens when the scenario's `WorldHistoryRecorder` was configured with `captureInitialSnapshot: false` — still allowed on the legacy recorder), `scenarioResultToBundle()` throws `BundleIntegrityError(code: 'no_initial_snapshot')`. Replayable scenario bundles require BOTH `captureInitialSnapshot: true` (the default) AND `captureCommandPayloads: true` on the scenario's history config — see §10.2.
 - `metadata.endTick` ← `result.tick` (final tick when checks ran).
 - `metadata.durationTicks` ← `metadata.endTick - metadata.startTick`.
 - `initialSnapshot` ← `result.history.initialSnapshot`. **Note:** post-setup, not pre-setup. Replaying a scenario-derived bundle reproduces the run from the post-setup state forward; consumers that want to replay from raw `World` construction must reproduce `setup()` in their `worldFactory` before deserializing the snapshot. Document in §14's scenario-runner guide section.
 - `ticks` ← `result.history.ticks`.
-- `commands` ← `result.history.commands` (now `RecordedCommand[]` because §10.2 commits `WorldHistoryRecorder` to the `captureCommandPayloads: true` configuration that scenarios MUST opt into for replayable bundles).
+- `commands` ← `result.history.recordedCommands ?? []` (a new optional field on `WorldHistoryState` populated only when the scenario's `WorldHistoryRecorder` was constructed with `captureCommandPayloads: true`; see §10.2). When this field is absent or empty, the resulting bundle is diagnostic-only (`openAt` throws `BundleIntegrityError(code: 'no_replay_payloads')`). The legacy `result.history.commands: CommandSubmissionResult[]` field is unchanged for backward compatibility — it travels in the bundle's `commands` field too only if a future schema decides to denormalize; for v1 the bundle uses just `recordedCommands`-derived data.
 - `executions` ← `result.history.executions`.
 - `failures` ← `result.history.failures`.
 - `snapshots` ← `[{ tick: result.tick, snapshot: result.snapshot }]`. Single entry; selfCheck will check the segment from `initialSnapshot` to this final snapshot. Future enhancement could add periodic snapshots via a scenario option.
@@ -569,22 +568,29 @@ export function scenarioResultToBundle<TEventMap, TCommandMap>(
 
 For scenarios to produce replayable bundles, `WorldHistoryRecorder` must capture full `RecordedCommand` payloads (not just `CommandSubmissionResult` results). This spec **commits to adding a `captureCommandPayloads: boolean` option to `WorldHistoryRecorder`'s constructor** (defaulting to `false` to preserve the existing rolling-buffer-debug use case). When `true`:
 
-- The recorder's `submit`/`submitWithResult` is wrapped (matching `SessionRecorder`'s pattern) to capture `{ type, data, sequence, submissionTick, result }` into a `commands: RecordedCommand[]` field on the `WorldHistoryState`.
-- `WorldHistoryState.commands` becomes `RecordedCommand[]` when this option is enabled (was `CommandSubmissionResult[]`). The type is widened to `Array<CommandSubmissionResult | RecordedCommand>` for backward compatibility — the discriminator is the presence of `data`.
+- The recorder wraps `submitWithResult` (matching `SessionRecorder`'s pattern; `submit` delegates through it) to capture `{ type, data, sequence, submissionTick, result }` into a NEW field on `WorldHistoryState`: `recordedCommands?: RecordedCommand[]`.
+- The existing `WorldHistoryState.commands: CommandSubmissionResult[]` field is unchanged. Public-type contract is preserved — adding a new optional field is purely additive (per `AGENTS.md` `c`-bump policy).
+- Per §7.1 step 2, `WorldHistoryRecorder({ captureCommandPayloads: true })` and `SessionRecorder` are mutually exclusive on a given world (only one payload-capturing wrap may exist; second `connect()` throws `RecorderClosedError(code: 'recorder_already_attached')`). Default-config `WorldHistoryRecorder` instances (no payload capture) compose freely with `SessionRecorder`.
 
-This is an additive, opt-in change to `WorldHistoryRecorder`. The default behavior (capacity 64, payload-less command capture) is preserved for existing consumers. Scenarios that want replayable bundles opt in:
+This is an additive, opt-in change to `WorldHistoryRecorder`. The default behavior (capacity 64, payload-less command capture, no wrap) is preserved for existing consumers. Scenarios that want replayable bundles opt in:
 
 ```ts
-const result = await runScenario({
+const result = runScenario({
   name: 'my-scenario',
   setup: ...,
-  steps: ...,
+  run: ...,           // 'run', not 'steps' — matches ScenarioConfig at src/scenario-runner.ts:106
   checks: ...,
-  history: { capacity: Number.MAX_SAFE_INTEGER, captureCommandPayloads: true },
+  history: {
+    capacity: Number.MAX_SAFE_INTEGER,    // unbounded; default capacity 64 silently truncates long scenarios
+    captureCommandPayloads: true,         // required for replay
+    captureInitialSnapshot: true,         // default true; explicitly named to underscore the requirement (replayable bundles need an initial snapshot)
+  },
 });
 const bundle = scenarioResultToBundle(result);
 ```
 
+`runScenario` is synchronous (returns `ScenarioResult`, not `Promise<ScenarioResult>` — verified at `src/scenario-runner.ts:133`); no `await` needed.
+
 ### 10.3 Constraints
 
 **Bounded history truncates long scenarios.** `WorldHistoryRecorder` defaults to capacity 64 ticks. Scenarios longer than that with default config silently truncate, producing a non-replayable bundle. Document this prominently in `docs/guides/scenario-runner.md` per §14.
@@ -655,10 +661,10 @@ The engine's existing test discipline (Vitest, TDD per AGENTS.md) applies. Test
 ### 13.1 Unit tests
 
 - **`SessionRecorder`**: listener wiring; submit/submitWithResult interception captures `RecordedCommand` with payload; lifecycle (construct/connect/disconnect/double-connect-noop/post-disconnect-throws/connect-after-disconnect-throws); single-use semantics; tolerance of destroyed-world during disconnect; marker validation (each §6.1 rule has a test pair: valid + invalid; live vs retroactive paths); attachment ID generation and dataUrl/sidecar policy selection; snapshot cadence (manual + automatic); debug capture integration; multiple recorders attached to one world.
-- **`RecordedCommand`**: round-trip (type + data + result preserved); ordering within a tick by sequence; submitWithResult variant flag.
+- **`RecordedCommand`**: round-trip (type + data + result preserved); ordering within a tick by sequence.
 - **`SessionBundle` schema**: strict-JSON round-trip via `JSON.stringify` + `JSON.parse`; rejection of malformed bundles by `assertJsonCompatible`; sidecar attachment refs are present in JSON but bytes are NOT.
 - **`MemorySink` / `MemorySource`**: in-memory accumulation, `toBundle()` correctness, sync method semantics, `readSidecar` for sidecar-mode attachments, sidecar opt-in flag.
-- **`FileSink` / `FileSource`**: full file layout (manifest + 5 jsonl streams + snapshots/ + attachments/); manifest rewrites on close; JSONL append-only invariant; attachment policy (dataUrl under cap, sidecar over cap); recovery from `incomplete: true` bundles (read prefix); tolerance of partial JSONL line on read.
+- **`FileSink` / `FileSource`**: full file layout (manifest + 5 jsonl streams + snapshots/ + attachments/); manifest rewrites at open / per-snapshot / close per §5.2; atomic-rename invariant; JSONL append-only invariant; attachment policy (FileSink defaults to sidecar; explicit `{ sidecar: false }` opts into dataUrl embedding for small blobs only); recovery from `incomplete: true` bundles (read prefix up to `metadata.persistedEndTick`); tolerance of partial JSONL line on read.
 - **`Marker`**: kind enum exhaustiveness; `EntityRef` validation (id+generation matching); cells; tickRange; opaque `data` round-trip; provenance discrimination.
 - **`scenarioResultToBundle()`**: assertion markers produced one per `result.checks` outcome with `provenance: 'engine'`; `metadata.sourceKind`/`sourceLabel`/`startTick` (from `result.history.initialSnapshot.tick`)/`endTick` (from `result.tick`) populated correctly; bundle without command payloads warns and `selfCheck()` returns `checkedSegments: 0`; bundle WITH payloads (scenario opted into `captureCommandPayloads: true`) is replayable.
 
@@ -699,14 +705,18 @@ Plus:
 - **Bundle range error:** `openAt(metadata.endTick + 1)` throws `BundleRangeError`.
 - **Replay across tick failure:** record a poisoned-tick scenario; `openAt(failureTick)` throws `BundleIntegrityError(code: 'replay_across_failure')`. Bundle still inspectable for ticks before the failure.
 - **Replay handler missing:** `worldFactory` registers a different command set than the recording; `openAt(N)` throws `ReplayHandlerMissingError` naming the missing command type.
-- **Engine version mismatch:** bundle with `engineVersion: '0.6.0'` against running 0.7.x — warning via `console.warn` (minor differs); cross-major (0.x → 1.x) throws `BundleVersionError`.
+- **Engine version mismatch (within-`b`):** bundle with `engineVersion: '0.7.5'` against running `0.7.8` — warning via `console.warn`; replay proceeds (per §11.1 clause 9 the breaking-change axis is `b`-component, not `c`).
+- **Engine version mismatch (cross-`b`):** bundle with `engineVersion: '0.6.0'` against running `0.7.x` — throws `BundleVersionError` (`b` differs).
+- **Engine version mismatch (cross-`a`):** bundle with `engineVersion: '0.x.y'` against running `1.x.y` — throws `BundleVersionError` (`a` also implies cross-major-breaking).
 - **Node version mismatch:** bundle with mismatched `nodeVersion` major — warning logged but replay proceeds; selfCheck catches actual divergences.
 
 ### 13.5 CI gate (per N3 in iter-1 review)
 
-Every existing scenario in the engine test suite (which currently lives in `tests/scenario-runner.test.ts` plus any scenarios added in `tests/scenarios/` going forward) is migrated to opt into `captureCommandPayloads: true` on `WorldHistoryRecorder` (a one-line addition to the scenario's history config) and is wrapped with `scenarioResultToBundle(result)` followed by `replayer.selfCheck()`. selfCheck failures fail `npm test`. This converts the documented determinism contract into a gate enforced by the engine's existing scenario corpus, without strict-mode engine changes.
+**v1 acceptance bar:** every existing scenario in the engine test suite (currently `tests/scenario-runner.test.ts` plus any scenarios added in `tests/scenarios/` going forward) is migrated as part of the implementation phase to opt into `captureCommandPayloads: true` on its `WorldHistoryRecorder` (a one-line addition to the scenario's history config), wrapped with `scenarioResultToBundle(result)` and `replayer.selfCheck()`, and verified to converge cleanly. selfCheck failures fail `npm test`. The `npm test` step in §18 acceptance criteria depends on this — v1 ships with **all engine scenarios opted in**.
+
+The selfCheck-on-no-payload warning path (§10.3) is for *user* code's intentionally diagnostic-only bundles (where the user does not need replay verification), not for the engine's own corpus. The engine corpus is the gate.
 
-Scenarios that are not migrated (or that intentionally don't capture payloads) continue to produce diagnostic-only bundles; the CI gate skips selfCheck for these with a console warning per §10.3, so the migration can proceed incrementally.
+This converts the documented determinism contract (§11) into an enforced-by-corpus gate without strict-mode engine changes.
 
 ## 14. Documentation Surface
 
@@ -852,7 +862,7 @@ This spec is implemented when:
 - All six new symbols (`SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`/`SessionSource`, `Marker`, `RecordedCommand`) are exported from `src/index.ts` with full TypeScript types, plus the `scenarioResultToBundle()` function.
 - `MemorySink` (implementing `SessionSink & SessionSource`) and `FileSink` (implementing `SessionSink & SessionSource`) ship as concrete implementations.
 - `scenarioResultToBundle()` is added and produces replayable bundles with `provenance: 'engine'` assertion markers, given a scenario configured with `history: { captureCommandPayloads: true }`.
-- `WorldHistoryRecorder` gains the additive `captureCommandPayloads: boolean` constructor option (default `false` for backward compat). When `true`, the recorder wraps `submit`/`submitWithResult` to capture `RecordedCommand` payloads into `WorldHistoryState.commands`.
+- `WorldHistoryRecorder` gains the additive `captureCommandPayloads: boolean` constructor option (default `false` for backward compat). When `true`, the recorder wraps `submitWithResult` (single wrap; `submit` delegates) and writes `RecordedCommand` entries into a NEW additive field `WorldHistoryState.recordedCommands?: RecordedCommand[]`. The existing `WorldHistoryState.commands: CommandSubmissionResult[]` field is unchanged. Mutual exclusion with `SessionRecorder` is enforced (only one payload-capturing wrap per world).
 - §13 test coverage is in place; all four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
 - `selfCheck()` correctly identifies deliberately introduced determinism violations across each clause of §11.1.
 - §13.5 CI gate is wired: every existing scenario in the engine test suite passes selfCheck during `npm test`.
