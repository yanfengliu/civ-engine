commit 41c3f48f9ecd7e8f57502d748e957d5cd60c3079
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 00:41:21 2026 -0700

    AGENTS.md: require multi-CLI brainstorming before implementing
    
    Plan-and-brainstorm becomes a hard rule: write a plan, then ask
    Codex and Claude to review/brainstorm with you, iterate until
    opinions converge on approval before implementing. Mirrors the
    existing multi-CLI code review pattern for the design phase.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

 AGENTS.md | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

--- v2->v3 spec diff ---

commit c3fc119443894fe95808721813b781143000eaa7
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 00:40:55 2026 -0700

    docs(design): session-recording spec iter-2 review fixes (v2 → v3)
    
    Iter-2 multi-CLI review (Codex + Opus; Gemini quota-out 9th iter)
    verified iter-1 closures and surfaced 1 Critical, 9 High, 7 Medium,
    4 Low, 2 Note new findings — mostly spec-text inconsistencies the v2
    revision introduced. v3 closes all of them. No architectural change.
    
    Highlights:
    - §10 rewritten: scenarioResultToBundle takes ScenarioResult (not
      ScenarioCapture); startTick from history.initialSnapshot.tick (not
      hardcoded to 0); commits captureCommandPayloads:true on
      WorldHistoryRecorder as the path to replayable scenario bundles.
    - §7 single command-capture path: submit/submitWithResult wrap is the
      sole writer; onCommandResult listener dropped to avoid double-write.
    - §7 wrap installation deferred from construction to connect() so
      pre-connect submissions are not silently lost.
    - §7 multi-recorder restriction: v1 allows one SessionRecorder per
      world (eliminates wrap-chain teardown ambiguity).
    - §7 poisoned-world rejection: connect() throws on poisoned world
      rather than producing non-replayable bundle silently.
    - §7 captureInitialSnapshot option removed (was producing non-
      replayable bundles silently); initial snapshot now mandatory.
    - §7 terminalSnapshot:true default ensures every bundle has at least
      the (initial, terminal) segment for selfCheck (was no-op for short
      sessions with no periodic snapshots).
    - §9 unified snapshot list normalizes initialSnapshot into the
      segment-pair iteration; eventsBetween renamed tickEntriesBetween;
      selfCheck commits to onCommandExecution listener for execution
      comparison (no nonexistent getCommandExecutionResults method).
    - §9 always replay via submitWithResult (drops the imagined
      RecordedCommand flag for submit vs submitWithResult).
    - §11.1 clause 9 unified version-compatibility rule: cross-b-version
      engine throws (matching civ-engine's pre-1.0 breaking-change axis
      per AGENTS.md); within-b warns; cross-Node-major warns. §9.1 and
      §13.4 reference §11.1 instead of restating.
    - §12 error table updated: RecorderClosedError codes for poisoned-
      world and recorder-already-attached; SinkWriteError semantics
      unified (recorder catches, sets incomplete, exposes via lastError).
    - §5.2 manifest rewrite cadence specified: open() + per-snapshot +
      close(), atomic-rename via .tmp.json.
    - §5.1 strict-JSON wording fixed (sidecar bytes are referenced by id,
      not part of JSON.stringify shape but always retrievable via
      source.readSidecar).
    - §10.2 commits captureCommandPayloads:boolean to
      WorldHistoryRecorder; closes iter-1 §16.6 Open Question.
    - §13.5 path corrected (tests/scenario-runner.test.ts);
      CI gate accommodates incremental scenario migration.
    - L-rename: failedTicks (was failureSpans);
      referencesValidationRule on MarkerValidationError (was
      referencesContractClause); referencesContractClause dropped from
      divergence types (not derivable in general).
    
    Iter-3 review queued to verify convergence.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/docs/design/2026-04-26-session-recording-and-replay-design.md b/docs/design/2026-04-26-session-recording-and-replay-design.md
index 71b7226..19c4c08 100644
--- a/docs/design/2026-04-26-session-recording-and-replay-design.md
+++ b/docs/design/2026-04-26-session-recording-and-replay-design.md
@@ -1,6 +1,6 @@
 # Session Recording & Replay — Design Spec
 
-**Status:** Draft v2 (2026-04-27). Revised after iter-1 multi-CLI review (Codex + Opus; Gemini quota-out). See `docs/reviews/session-recording-spec/2026-04-26/1/REVIEW.md` for the iter-1 findings folded into this revision. Awaiting iter-2 convergence before writing-plans.
+**Status:** Draft v3 (2026-04-27). Revised after iter-2 multi-CLI review (Codex + Opus; Gemini quota-out 9th iter). See `docs/reviews/session-recording-spec/2026-04-26/1/REVIEW.md` (iter-1) and `docs/reviews/session-recording-spec/2026-04-27/2/REVIEW.md` (iter-2) for the findings folded into v2 and v3 respectively. Awaiting iter-3 convergence before writing-plans.
 
 **Scope:** Engine-level primitives only (Scope B from brainstorming). Game-side annotation UI, standalone viewer, synthetic playtest harness, counterfactual replay, and strict-mode determinism enforcement are explicitly out of scope and tracked in `docs/design/ai-first-dev-roadmap.md`.
 
@@ -38,7 +38,7 @@ The following are deliberately excluded from this spec to keep it focused:
 The engine already has most of the substrate this spec needs. Relevant existing primitives:
 
 - **`WorldHistoryRecorder`** (`src/history-recorder.ts:87`). Listener-based recorder with bounded rolling buffer (default capacity 64 ticks). Captures initial snapshot, per-tick `diff`/`events`/`metrics`/`debug`, command submissions (as `CommandSubmissionResult` — note: this type does NOT carry the original command `data` payload), command executions, tick failures. Continues to serve runtime debugging unchanged. This spec adds a sibling primitive rather than extending it (see ADR 1 in §15).
-- **`runScenario`** (`src/scenario-runner.ts:133`). A standalone function (not a class) that runs a scenario and returns a `ScenarioCapture` with snapshot + history + debug + metrics + diff + events. This spec adds a sibling adapter `scenarioCaptureToBundle()` that translates `ScenarioCapture` into a `SessionBundle` with `kind: 'assertion'` markers for each scenario check.
+- **`runScenario`** (`src/scenario-runner.ts:133`). A standalone function (not a class) that runs a scenario and returns a `ScenarioResult` (which extends `ScenarioCapture` with `name`, `passed`, `failure`, `checks`, `issues` per `:122-131`). This spec adds a sibling adapter `scenarioResultToBundle()` that translates `ScenarioResult` into a `SessionBundle` with `kind: 'assertion'` markers for each scenario check outcome.
 - **`WorldSnapshot v5`** (`src/serializer.ts:62`). Round-trips full deterministic state including seeded RNG, runtime config, and per-component `ComponentStoreOptions`. Does NOT carry poison state; v1 recording continues to capture failures via `bundle.failures` for diagnostics, but replay is scope-limited to clean tick spans (see §2).
 - **`world.submit()` / `world.submitWithResult()`** (`src/world.ts`). Single typed input boundary for player intent. Validators run synchronously *before* the command is queued (with the live world available); handlers run later during `processCommands()` at the start of the next tick. **`CommandSubmissionResult.tick` is the *observable* tick at submission time**, which is one less than the tick during which the command's handler runs (since `gameLoop.tick` advances at the end of `runTick()`). The replayer's command-replay loop must respect this off-by-one (see §9.1).
 - **`world.random()`**. Engine-owned seeded RNG. Already part of snapshot v3+. Routing all randomness through this is the basis of replay determinism.
@@ -51,11 +51,12 @@ Six new symbols, plus one new exported function:
 | ------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------- |
 | `SessionRecorder`              | new (`src/session-recorder.ts`) | Wraps a live `World` (intercepting `submit`/`submitWithResult`), captures inputs/diffs/events/markers/snapshots, emits to a `SessionSink`. Synchronous throughout. |
 | `SessionReplayer`              | new (`src/session-replayer.ts`) | Loads a bundle (or sink); opens a paused `World` at any tick within the bundle's clean span; runs replay self-check across state, events, and execution streams. |
-| `SessionBundle`                | new (in `src/session-bundle.ts`) | Versioned strict-JSON archive type; shared by `SessionRecorder.toBundle()` and `scenarioCaptureToBundle()`. |
+| `SessionBundle`                | new (in `src/session-bundle.ts`) | Versioned strict-JSON archive type; shared by `SessionRecorder.toBundle()` and `scenarioResultToBundle()`. |
 | `SessionSink` / `SessionSource` | new (in `src/session-sink.ts`) | Synchronous write interface (`Sink`) and read interface (`Source`); `MemorySink` and `FileSink` implement both. |
 | `Marker`                       | new (in `src/session-bundle.ts`) | `{ tick, kind, text?, refs?, data?, attachments?, provenance }` with closed `kind` enum and `EntityRef`-typed entity refs. |
 | `RecordedCommand`              | new (in `src/session-bundle.ts`) | Captures a submitted command's `type`, `data`, submission tick, sequence, and result. Replaces `CommandSubmissionResult[]` for replay-relevant purposes (the result-only type still travels for diagnostics). |
-| `scenarioCaptureToBundle()`    | new exported function (`src/session-bundle.ts`) | Translates `ScenarioCapture` → `SessionBundle` with `sourceKind: 'scenario'` and `assertion` markers. Standalone function, not a class method, because `runScenario` is a function, not a class. |
+| `scenarioResultToBundle()`     | new exported function (`src/session-bundle.ts`) | Translates `ScenarioResult` → `SessionBundle` with `sourceKind: 'scenario'` and `assertion` markers. Takes `ScenarioResult` (not `ScenarioCapture`) because the adapter needs `result.name` and `result.checks`. |
+| `WorldHistoryRecorder.captureCommandPayloads` | new constructor option | Additive, opt-in. When `true`, records full `RecordedCommand` (with payload) instead of payload-less `CommandSubmissionResult`. Required for scenario-derived replayable bundles. |
 
 `WorldHistoryRecorder` and `runScenario` are unchanged. `SessionRecorder` and the legacy recorder coexist with distinct purposes (rolling debug buffer vs persistent archive).
 
@@ -71,7 +72,7 @@ Six new symbols, plus one new exported function:
         └───────────┬────────────┘         └────────┬───────────┘
                     │                               │
                     │                       ┌───────┴──────────┐
-       scenarioCaptureToBundle(capture)     │ SessionSink/Source│
+       scenarioResultToBundle(result)       │ SessionSink/Source│
                     │                       │ (Memory | File)  │
                     └────────►┌─────────────┴──────────────────┴─────────────►
                               │           SessionBundle (strict JSON)         │
@@ -121,7 +122,7 @@ interface SessionMetadata {
   sourceKind: 'session' | 'scenario';
   sourceLabel?: string;         // optional human label (scenario name, session label)
   incomplete?: true;            // set if recorder did not reach disconnect() cleanly (sink failure, world destroy)
-  failureSpans?: Array<{ failedTick: number }>; // ticks where TickFailure was recorded; replay refuses these
+  failedTicks?: number[];       // ticks where TickFailure was recorded; replay refuses ticks at or after the first entry
 }
 
 interface RecordedCommand<TCommandMap = Record<string, unknown>> {
@@ -159,7 +160,7 @@ interface AttachmentDescriptor {
 
 `Marker` is defined in §6. `RecordedCommand` is the canonical replay input (`CommandSubmissionResult` alone does not carry the original `data` payload, so it cannot drive replay). Per §11.5, `RecordedCommand` MUST originate from outside the tick loop — submissions made from inside a system, command handler, or event listener are a determinism contract violation and break replay.
 
-`SessionBundle` is strict JSON: `JSON.stringify(bundle)` produces a complete, lossless representation. Sidecar attachment bytes live outside the JSON shape; consumers retrieve them via `source.readSidecar(id)` (see §8). ADR 2 in §15 notes the MemorySink/FileSink shape symmetry: both implement `SessionSink & SessionSource`; the JSON-typed bundle is identical regardless of producer.
+`SessionBundle` is strict JSON: `JSON.stringify(bundle)` is a complete, lossless representation **of everything in the JSON shape itself** — metadata, snapshots, ticks, commands, executions, failures, markers, and dataUrl-embedded attachment payloads. Sidecar attachment bytes are referenced by id from `AttachmentDescriptor.ref.sidecar` and stored externally to the bundle (FileSink: `attachments/<id>.<ext>`; MemorySink: parallel internal map); consumers retrieve them via `source.readSidecar(id)` (see §8). ADR 2 in §15 notes the MemorySink/FileSink shape symmetry: both implement `SessionSink & SessionSource`; the JSON-typed bundle is identical regardless of producer (modulo whether each `AttachmentDescriptor.ref` is `dataUrl` or `sidecar`).
 
 ### 5.2 On-disk layout (FileSink)
 
@@ -177,7 +178,15 @@ interface AttachmentDescriptor {
     <id>.<ext>            # binary blobs, ext inferred from mime; only when AttachmentDescriptor.ref.sidecar
 ```
 
-`manifest.json` references snapshots by tick, ticks/commands/executions/failures/markers by JSONL filename, and sidecar attachments by id; `dataUrl`-mode attachments are embedded in the manifest. The five JSONL streams are written incrementally; the manifest is rewritten on each significant change so a reader of an `incomplete: true` bundle can still read the prefix that landed.
+`manifest.json` references snapshots by tick, ticks/commands/executions/failures/markers by JSONL filename, and sidecar attachments by id; `dataUrl`-mode attachments are embedded in the manifest. The five JSONL streams are append-only and written incrementally per write call.
+
+**Manifest rewrite cadence.** The manifest is rewritten at three explicit points:
+
+1. **`open()`** — initial manifest with `metadata.startTick`, `metadata.recordedAt`, and zero values for `endTick` / `durationTicks`.
+2. **On each snapshot write** — manifest's snapshot index updated and `metadata.endTick` advanced to `world.tick` (so a crash mid-run leaves a manifest pointing at the last successfully written snapshot).
+3. **`close()`** — final rewrite with `metadata.endTick` = `world.tick` at disconnect, `metadata.durationTicks` populated, `metadata.incomplete` cleared (or set to `true` if disconnect path was abnormal).
+
+Each rewrite is atomic-rename (`manifest.tmp.json` → `manifest.json` via `fs.renameSync`) so a crash mid-write never produces a corrupted manifest. Per-tick manifest rewrites are NOT performed — that would be hot-path I/O. A reader of an `incomplete: true` bundle can replay up to the most recent snapshot tick (which is also `metadata.endTick` for incomplete bundles).
 
 `SessionReplayer.fromSource(fileSource)` reads `manifest.json` eagerly, then streams individual JSONL files lazily as needed. Snapshots are loaded on demand via `source.readSnapshot(tick)`.
 
@@ -195,7 +204,7 @@ interface Marker {
   id: string;                    // UUID v4
   tick: number;                  // engine tick the marker references; >= 0
   kind: MarkerKind;
-  provenance: MarkerProvenance;  // 'engine' for assertions added by scenarioCaptureToBundle();
+  provenance: MarkerProvenance;  // 'engine' for assertions added by scenarioResultToBundle();
                                  // 'game' for any marker added via recorder.addMarker() by user code
   text?: string;                 // free-form human description
   refs?: MarkerRefs;             // engine-validated structured references
@@ -233,7 +242,7 @@ interface MarkerRefs {
 
 **Universal rules (both live and retroactive):**
 
-- `kind: 'assertion'` markers added via `recorder.addMarker()` get `provenance: 'game'`. Engine-validated assertions added via `scenarioCaptureToBundle()` get `provenance: 'engine'`. Downstream consumers (viewer, corpus search) should distinguish these.
+- `kind: 'assertion'` markers added via `recorder.addMarker()` get `provenance: 'game'`. Engine-validated assertions added via `scenarioResultToBundle()` get `provenance: 'engine'`. Downstream consumers (viewer, corpus search) should distinguish these.
 - `data` is validated as JSON-compatible via the existing `assertJsonCompatible` helper.
 - `attachments` ids must reference attachments registered via `recorder.attach()`.
 
@@ -247,7 +256,7 @@ class SessionRecorder<TEventMap, TCommandMap, TDebug = JsonValue> {
     world: World<TEventMap, TCommandMap>;
     sink?: SessionSink;                       // default: new MemorySink()
     snapshotInterval?: number | null;         // default: 1000; null disables periodic snapshots
-    captureInitialSnapshot?: boolean;         // default: true
+    terminalSnapshot?: boolean;               // default: true; writes a final snapshot on disconnect()
     debug?: { capture(): TDebug | null };
     sourceLabel?: string;                     // optional metadata field
   });
@@ -255,12 +264,13 @@ class SessionRecorder<TEventMap, TCommandMap, TDebug = JsonValue> {
   readonly sessionId: string;                 // generated at construction
   readonly tickCount: number;                 // number of recorded ticks
   readonly markerCount: number;
-  readonly snapshotCount: number;             // counts initial + periodic + manual
+  readonly snapshotCount: number;             // counts initial + periodic + manual + terminal
   readonly isConnected: boolean;
   readonly isClosed: boolean;                 // true after disconnect(); recorder is single-use
+  readonly lastError: SessionRecordingError | null;  // last sink write or finalize error, if any
 
-  connect(): void;                            // hook listeners; capture initial snapshot; sink.open()
-  disconnect(): void;                         // unhook listeners; sink.close(); marks recorder closed
+  connect(): void;                            // capture initial snapshot; install wrap; subscribe listeners; sink.open()
+  disconnect(): void;                         // write terminal snapshot; uninstall wrap; unsubscribe; sink.close()
   addMarker(marker: NewMarker): MarkerId;     // tick defaults to world.tick if omitted
   attach(blob: { mime: string; data: Uint8Array }, options?: { sidecar?: boolean }): AttachmentId;
   takeSnapshot(): SessionSnapshotEntry;       // manual snapshot at current tick
@@ -273,22 +283,49 @@ type MarkerId = string;
 type AttachmentId = string;
 ```
 
+`captureInitialSnapshot` from v2 has been removed — initial snapshot capture is mandatory. A bundle without an initial snapshot cannot be replayed (§9.1 step 1 falls back to `bundle.initialSnapshot` when no preceding snapshot exists), so disabling it produced a non-replayable bundle silently. If a caller really wants no initial snapshot for diagnostic-only use, the right primitive is `WorldHistoryRecorder`, not `SessionRecorder`.
+
 ### 7.1 Recorder lifecycle
 
-1. **Construction.** Generates `sessionId`, validates config, **wraps the live `world.submit()` and `world.submitWithResult()` methods** so the recorder can capture the raw `type` + `data` payload for every submission (not subscribed yet — wrapping is reversible). Records `engineVersion` and `nodeVersion` placeholders. Does not subscribe to listeners yet.
-2. **`connect()`.** Calls `sink.open(initialMetadata)` where `initialMetadata` has `startTick = world.tick`, `recordedAt = now()`, `endTick` and `durationTicks` left as zero (rewritten at finalization). If `captureInitialSnapshot`, calls `world.serialize()` and writes the initial snapshot via `sink.writeSnapshot()`. Subscribes to `world.onDiff`, `world.onCommandResult`, `world.onCommandExecution`, `world.onTickFailure`. Subsequent ticks emit live to the sink. Calling `connect()` while already connected is a no-op; calling `connect()` after `disconnect()` throws `RecorderClosedError` (recorder is single-use).
-3. **Per-tick capture.** On each `onDiff`, the recorder builds a `SessionTickEntry`, clones via existing `cloneJsonValue` discipline, calls `sink.writeTick()` synchronously. If `world.tick % snapshotInterval === 0`, calls `world.serialize()` and `sink.writeSnapshot()` synchronously.
-4. **Submission capture.** The wrapped `submit`/`submitWithResult` builds a `RecordedCommand` from `{ type, data, result }` and calls `sink.writeCommand()` synchronously before returning the result to the caller.
-5. **Marker / attachment additions.** Validated per §6.1, then `sink.writeMarker()` / `sink.writeAttachment()` synchronously. Attachments default to `dataUrl` mode if under `MemorySink`'s threshold (64 KiB by default) or unconditionally on `FileSink`; pass `{ sidecar: true }` to force sidecar storage.
-6. **`disconnect()`.** Unwraps `submit`/`submitWithResult`, unhooks all listeners, finalizes `metadata.endTick = world.tick` and `metadata.durationTicks`, calls `sink.close()` (which rewrites `manifest.json` with the final metadata for `FileSink`). Tolerates a destroyed world: if `world.serialize()` would throw, sets `metadata.incomplete = true` and proceeds. After disconnect, `addMarker`, `attach`, and `takeSnapshot` throw `RecorderClosedError`. The recorder cannot be reconnected.
-7. **`toBundle()`.** Returns the canonical strict-JSON `SessionBundle` from `sink.toBundle()`. May be called before or after `disconnect()`. If called before disconnect on a `FileSink`, the bundle is built from the current on-disk state with `incomplete: true` if `disconnect()` has not been called.
+1. **Construction.** Generates `sessionId`, validates config, prepares listener and wrap *closures* but does NOT install them. The world is not yet observed.
+2. **`connect()`.** Calls `sink.open(initialMetadata)` where `initialMetadata.startTick = world.tick`, `recordedAt = now()`, `engineVersion` and `nodeVersion` populated, `endTick` and `durationTicks` zero (rewritten at finalization). Calls `world.serialize()` and writes the initial snapshot via `sink.writeSnapshot()`. **Then** installs the `submit`/`submitWithResult` wrap (§7.3) and subscribes to `world.onDiff`, `world.onCommandExecution`, `world.onTickFailure`. Subsequent ticks emit live to the sink. Calling `connect()` while already connected is a no-op; calling `connect()` after `disconnect()` throws `RecorderClosedError`. **Calling `connect()` on a poisoned world** throws `RecorderClosedError(code: 'world_poisoned')` — recording a known-broken world produces a non-replayable bundle (the snapshot lacks poison state per `WorldSnapshotV5`); a future spec extends `WorldSnapshot` to v6 and lifts this restriction. **Calling `connect()` when another `SessionRecorder` is already attached to the same world** throws `RecorderClosedError(code: 'recorder_already_attached')` — v1 restricts to a single SessionRecorder per world to avoid the wrap-chain teardown ambiguity (multiple `WorldHistoryRecorder` instances are still allowed; only `SessionRecorder` has the single-instance constraint, tracked via a hidden `world.__sessionRecorder` slot).
+3. **Per-tick capture.** On each `onDiff`, the recorder builds a `SessionTickEntry`, clones via existing `cloneJsonValue` discipline, calls `sink.writeTick()` synchronously. If `world.tick % snapshotInterval === 0`, calls `world.serialize()` and `sink.writeSnapshot()` synchronously. `onCommandExecution` is the source for executions; `onTickFailure` for failures (and updates `metadata.failedTicks`).
+4. **Submission capture (single path).** The wrapped `submit`/`submitWithResult` is the SOLE writer to `commands.jsonl`. It captures `{ type, data, sequence, submissionTick: world.getObservableTick(), result }` into a `RecordedCommand` and calls `sink.writeCommand()` synchronously before returning the result to the caller. The `onCommandResult` listener is NOT subscribed (it would double-write since the wrap already produces the result-carrying record).
+5. **Marker / attachment additions.** Validated per §6.1, then `sink.writeMarker()` / `sink.writeAttachment()` synchronously. Attachments: `MemorySink` defaults to `dataUrl` mode when `data.byteLength <= 65536` (64 KiB) and rejects oversize blobs unless `attach(..., { sidecar: true })` is passed; `FileSink` defaults to **sidecar** for any blob (the disk-backed sink keeps blobs as files; pass `{ sidecar: false }` to force `dataUrl` embedding into the manifest, only useful for very small attachments).
+6. **`disconnect()`.** If `terminalSnapshot !== false`, writes a final snapshot via `world.serialize()` + `sink.writeSnapshot()` (this guarantees every bundle has at least the `(initialSnapshot, terminalSnapshot)` segment for selfCheck — fixes H-new-4). Uninstalls the wrap, unsubscribes listeners, finalizes `metadata.endTick = world.tick` and `metadata.durationTicks`, calls `sink.close()` (which rewrites `manifest.json` with the final metadata for `FileSink`). Tolerates a destroyed world: if `world.serialize()` throws, catches the error, sets `metadata.incomplete = true` and `lastError`, skips terminal snapshot, proceeds to close. After disconnect, `addMarker`, `attach`, and `takeSnapshot` throw `RecorderClosedError`. The recorder cannot be reconnected.
+7. **`toBundle()`.** Returns the canonical strict-JSON `SessionBundle` from `sink.toBundle()`. May be called before or after `disconnect()`. If called before `disconnect()`, the bundle reflects current on-disk state with `metadata.incomplete = true` (since `disconnect()` is what clears that flag).
 
 ### 7.2 Failure modes
 
-- **Sink write failure (synchronous).** Throws `SinkWriteError` synchronously from the listener back to the engine. Per §11.5, the engine's `onDiff` / command listeners' exceptions are caught and `console.error`'d but do not propagate; the recorder additionally sets `metadata.incomplete = true` and best-effort closes the sink so the bundle is still consumable. Subsequent listener invocations short-circuit (the recorder enters a terminal `incomplete` state).
-- **World destroyed while connected.** Recorder's `disconnect()` is tolerant: any `world.serialize()` failure during finalization is caught; `metadata.incomplete = true` is recorded. Caller still must call `disconnect()` to finalize.
-- **Recorder constructed against a poisoned world.** Recording proceeds; `connect()` writes the failure-state snapshot via `serialize({ inspectPoisoned: true })`. Subsequent failed ticks are captured to `bundle.failures`. Replay refuses ticks at or after the first failure (per CR3 / §9.1).
-- **Multiple recorders attached to one world.** Supported; both wrap `submit`/`submitWithResult` (forming a chain) and both subscribe to listeners. Bundle outputs are independent.
+- **Sink write failure.** The recorder catches `SinkWriteError` from sink methods, sets `metadata.incomplete = true`, sets `recorder.lastError`, marks the recorder terminal so subsequent listener invocations short-circuit (the listener body becomes a no-op). The error is observable via `recorder.lastError` and via the bundle's `incomplete` flag. The error does NOT propagate to the engine's listener invocation site (engine listener exceptions are caught and `console.error`'d by `World`; the recorder's catch is what produces the actionable signal).
+- **World destroyed while connected.** Per step 6 above, `disconnect()` tolerates serialize failure; `metadata.incomplete = true`, terminal snapshot skipped. Caller still must call `disconnect()` to finalize. Once disconnected, listener invocations from any post-destroy events are no-ops because the recorder has unsubscribed.
+- **Recorder constructed against a poisoned world.** Construction succeeds (just stores the world reference). `connect()` rejects: throws `RecorderClosedError(code: 'world_poisoned')`. The world must be `recover()`-ed before `SessionRecorder.connect()` will accept it. Recording a poisoned world is a future-spec capability.
+- **Multiple recorders attached to one world.** v1 restricts to a single `SessionRecorder` per world (per step 2 above; throws on second `connect()`). `WorldHistoryRecorder` is unrestricted and can run alongside. A future spec may extend to multiple-`SessionRecorder` chain protocol if a real consumer needs it.
+
+### 7.3 `submit`/`submitWithResult` wrap protocol
+
+The recorder installs its wraps in `connect()` and removes them in `disconnect()`. Single-recorder restriction (per §7.2) eliminates the chain-teardown ambiguity flagged in iter-2 review. Implementation:
+
+```ts
+// At connect():
+const originalSubmit = world.submit.bind(world);
+const originalSubmitWithResult = world.submitWithResult.bind(world);
+world.submit = function recordedSubmit(type, data) {
+  const result = originalSubmit(type, data);
+  recorder._captureCommand({ type, data, result });
+  return result;
+};
+world.submitWithResult = function recordedSubmitWithResult(type, data) {
+  const result = originalSubmitWithResult(type, data);
+  recorder._captureCommand({ type, data, result });
+  return result;
+};
+// At disconnect():
+world.submit = originalSubmit;
+world.submitWithResult = originalSubmitWithResult;
+```
+
+The recorder always replays via `world.submitWithResult()` regardless of which method was originally used — `world.submit()` is just `world.submitWithResult().accepted` (`world.ts:720-722`), so the replayer can call `submitWithResult` and discard the boolean. No flag is needed on `RecordedCommand`.
 
 ## 8. SessionSink and SessionSource Interfaces
 
@@ -364,8 +401,9 @@ class SessionReplayer<TEventMap, TCommandMap, TDebug = JsonValue> {
 
   openAt(tick: number): World<TEventMap, TCommandMap>; // tick must be in [startTick, endTick] AND outside failure spans
   stateAtTick(tick: number): WorldSnapshot;
-  eventsBetween(fromTick: number, toTick: number): SessionTickEntry<TEventMap, TDebug>[];
+  tickEntriesBetween(fromTick: number, toTick: number): SessionTickEntry<TEventMap, TDebug>[];
   // Inclusive on both ends. Throws BundleRangeError if either tick is outside [startTick, endTick].
+  // (Renamed from eventsBetween — the return type is full tick entries, not just events.)
 
   selfCheck(options?: SelfCheckOptions): SelfCheckResult;
   validateMarkers(): MarkerValidationResult;          // re-validates retroactive markers against recorded snapshots
@@ -424,19 +462,18 @@ interface MarkerValidationResult {
 
 **Range and integrity preconditions:**
 
-- If `tick < bundle.metadata.startTick` or `tick > bundle.metadata.endTick`, throws `BundleRangeError`.
+- If `tick < bundle.metadata.startTick` or `tick > bundle.metadata.endTick`, throws `BundleRangeError`. **Incomplete bundles (`metadata.incomplete === true`) are accepted up to `metadata.endTick`** — the recorder advances `endTick` as snapshots write to disk, so an incomplete bundle's `endTick` is the last successfully written snapshot tick (see §5.2 manifest cadence).
 - If `tick === bundle.metadata.startTick`, returns `worldFactory(bundle.initialSnapshot)` directly without replay.
-- If `tick` falls inside or after a recorded `TickFailure` span (per `metadata.failureSpans`), throws `BundleIntegrityError` with `code: 'replay_across_failure'`. Replay across tick failures is out of scope (see §2; future spec extends `WorldSnapshot` to v6 to lift this).
-- If `bundle.metadata.engineVersion` differs from the running engine version: warns when only patch / minor differs; throws `BundleVersionError` when major differs (cross-major-version replay is not supported).
-- If `bundle.metadata.nodeVersion` differs from `process.version` major: warns. Math transcendentals (`Math.sin`, `Math.log`, etc.) are not bit-identical across V8 majors and may cause spurious divergence; replay still proceeds, but `selfCheck()` failures should be triaged with this in mind.
+- If `tick` falls at or after the first entry in `metadata.failedTicks`, throws `BundleIntegrityError` with `code: 'replay_across_failure'`. Replay across tick failures is out of scope (see §2; future spec extends `WorldSnapshot` to v6 to lift this).
+- Engine version and Node version compatibility per §11.1 clause 9: cross-`b` engine throws `BundleVersionError`; within-`b` warns; cross-Node-major warns but proceeds.
 
 **Replay algorithm (clean span case):**
 
-1. Find the latest snapshot `S` in `bundle.snapshots ∪ {bundle.initialSnapshot}` with `S.tick <= tick`.
+1. Find the snapshot to start from. Build a unified candidate set as `[{ tick: bundle.metadata.startTick, snapshot: bundle.initialSnapshot }, ...bundle.snapshots]` (so the initial snapshot is normalized to the same `{tick, snapshot}` shape as periodic snapshots, with `tick = metadata.startTick`). Find the latest entry `S` with `S.tick <= tick`. There is always at least one (the initial entry) given `tick >= metadata.startTick` from the precondition check.
 2. Construct a fresh paused `World` via `worldFactory(S.snapshot)`.
 3. For each tick `t` from `S.tick` to `tick - 1` inclusive:
    a. Drain every `RecordedCommand` from `bundle.commands` whose `submissionTick === t`, ordered by `sequence` ascending.
-   b. For each, call `world.submit(rc.type, rc.data)` (or `submitWithResult` if the recorded result was from `submitWithResult`; the recorder distinguishes via a flag on `RecordedCommand`).
+   b. For each, call `world.submitWithResult(rc.type, rc.data)`. Always replay via `submitWithResult` regardless of which method was originally used — `world.submit()` is `world.submitWithResult().accepted` per `src/world.ts:720-722`, so this faithfully reproduces both submission paths.
    c. Call `world.step()` (this advances the world from tick `t` to tick `t+1`, processing the queued commands at the start of `t+1` per `processCommands()` semantics).
 4. After the loop, `world.tick === tick` and the world is paused. Return the world.
 
@@ -455,18 +492,30 @@ The replayer does not silently mask divergence; `selfCheck()` is the explicit ve
 ### 9.3 `selfCheck()` algorithm
 
 ```
-segments = [(initialSnapshot, snapshots[0]), (snapshots[0], snapshots[1]), ..., (snapshots[n-2], snapshots[n-1])]
-// For scenario bundles, snapshots may have only one entry; in that case segments = [(initialSnapshot, snapshots[0])]
-// For session bundles with no periodic snapshots, segments = [] and selfCheck() returns ok: true with checkedSegments: 0
+// Build snapshot list normalized as { tick, snapshot } including the initial snapshot
+allSnapshots = [{ tick: metadata.startTick, snapshot: initialSnapshot }, ...bundle.snapshots]
+// segments are consecutive pairs
+segments = pairs(allSnapshots)
+// segments has at least one entry because the recorder writes a terminal snapshot on disconnect()
+// by default (see §7.1 step 6 / `terminalSnapshot` config option). A bundle with terminalSnapshot: false
+// AND no periodic snapshots produces segments = [] and selfCheck() returns
+// { ok: true, checkedSegments: 0 } with a console warning — diagnostic-only mode.
 
 For each (snapshotA, snapshotB) in segments:
   worldA = worldFactory(snapshotA.snapshot)
+
+  // Subscribe to onCommandExecution to accumulate replay-side execution results
+  replayExecutions = []
+  worldA.onCommandExecution(r => replayExecutions.push(r))
+
   for each tick t from snapshotA.tick to snapshotB.tick - 1:
     drain RecordedCommands at submissionTick === t (ordered by sequence)
-    submit each via worldA
+    submitWithResult each via worldA
     worldA.step()
-    if checkEvents: capture worldA.getEvents() and compare to bundle's tick entry events at t+1
-    if checkExecutions: capture worldA.getCommandExecutionResults() (or via listener) and compare
+    if checkEvents: compare worldA.getEvents() to bundle's tick entry events at t+1
+    if checkExecutions: compare replayExecutions filtered to tick === t+1 to
+                        bundle.executions filtered to tick === t+1
+
   if checkState: actualB = worldA.serialize(); compare to snapshotB.snapshot via fast deep-equal
   record any divergences in the appropriate divergence array
   if stopOnFirstDivergence and any divergence recorded: break
@@ -474,59 +523,75 @@ For each (snapshotA, snapshotB) in segments:
 
 Notes:
 
-- **Initial-to-first-snapshot segment is included.** `bundle.initialSnapshot` is the implicit segment-0 start; `snapshots[0]` is the first periodic snapshot. This is critical: a determinism bug in the first 1000 ticks would otherwise go undetected.
-- **Scenario bundles converge.** Scenario bundles produce `snapshots: [{ tick: capture.tick, snapshot: capture.snapshot }]` — exactly one entry — so `segments = [(initialSnapshot, snapshots[0])]`. selfCheck still verifies the full scenario span.
-- **State equality** uses a fast recursive deep-equal that short-circuits on first mismatch and produces a best-effort dotted `firstDifferingPath` (`"components.position[42].x"`). Snapshot key ordering is stable per the snapshot serialization invariant (Map insertion order); two equal snapshots have equal key order, so deep-equal need not canonicalize. **Open Question 1** (§16) covers algorithm choice; the spec commits to recursive walk + short-circuit unless benchmarking exposes a problem.
-- **Event/execution equality** is by ordered structural equality on the per-tick array. Order matters (a system that emits the same events in a different order is a determinism violation).
-- **Cost.** selfCheck replays the full timeline once. For a 10000-tick bundle with 10 snapshots, that's 10 segments × 1000 ticks = 10000 ticks of replay plus deserialize/factory cost per segment. This is fundamentally O(N) in tick count and not avoidable; cost benchmarks live in §13.2.
+- **Initial-to-first-snapshot segment is included.** Normalizing the initial snapshot into the unified snapshot list is critical: a determinism bug in the first 1000 ticks (before the first periodic snapshot) would otherwise go undetected.
+- **Terminal snapshot guarantees coverage of short sessions.** Per §7.1 step 6, `disconnect()` writes a terminal snapshot by default. A 500-tick session with default `snapshotInterval: 1000` thus has `allSnapshots = [initial, terminal]`, producing one segment that selfCheck verifies. Without this, the §13.5 CI gate would silently pass on every short scenario.
+- **Scenario bundles converge.** Scenario bundles produce `bundle.snapshots: [{ tick: result.tick, snapshot: result.snapshot }]` — one entry — plus the initial snapshot, so `segments = [(initial, final)]`. selfCheck verifies the full scenario span.
+- **Execution stream comparison via listener.** The replay world's `onCommandExecution` listener accumulates results during each segment's replay; the bundle's `executions` array is filtered to the same tick range and compared. There is no `world.getCommandExecutionResults()` getter — the listener is the only path.
+- **State equality** uses a fast recursive deep-equal that short-circuits on first mismatch and produces a best-effort dotted `firstDifferingPath` (`"components.position[42].x"`). Snapshot key ordering is stable per the snapshot serialization invariant (Map insertion order); two equal snapshots have equal key order, so deep-equal need not canonicalize.
+- **Event/execution equality** is by ordered structural equality on the per-tick array. Order matters.
+- **Cost.** selfCheck replays the full timeline once. For a 10000-tick bundle with 10 snapshots + initial + terminal = 11 segments, that's roughly 11 × ~900 = ~10000 ticks of replay plus deserialize/factory cost per segment. Cost benchmarks live in §13.2.
 
 ## 10. Scenario Integration
 
-`runScenario` is a function (not a class), so the spec adds a sibling adapter function:
+`runScenario` is a function (not a class), and it returns `ScenarioResult` (which extends `ScenarioCapture` with `name`, `passed`, `failure`, `checks`, `issues` — verified at `src/scenario-runner.ts:122-131`). The spec adds a sibling adapter function that takes a `ScenarioResult`:
 
 ```ts
-export function scenarioCaptureToBundle<TEventMap, TCommandMap>(
-  capture: ScenarioCapture<TEventMap, TCommandMap>,
+export function scenarioResultToBundle<TEventMap, TCommandMap>(
+  result: ScenarioResult<TEventMap, TCommandMap>,
   options?: { sourceLabel?: string; nodeVersion?: string },
 ): SessionBundle<TEventMap, TCommandMap, WorldDebugSnapshot>;
 ```
 
-The function takes a `ScenarioCapture` (already produced by `runScenario`) plus optional metadata overrides and emits a `SessionBundle`. Translation:
-
-- `metadata.sourceKind = 'scenario'`, `metadata.sourceLabel = options?.sourceLabel ?? scenario.name`.
-- `metadata.engineVersion` ← package.json version at translate time. `metadata.nodeVersion` ← `options?.nodeVersion ?? process.version`. `metadata.startTick` ← `0` (scenario start tick by convention). `metadata.endTick` ← `capture.tick` (final tick when checks ran). `metadata.durationTicks` ← `capture.tick`.
-- `initialSnapshot` ← the snapshot `ScenarioCapture.history.initialSnapshot` — note that this is the **post-setup** state, not pre-setup. `runScenario` calls `history.clear()` after `setup` runs (per `src/scenario-runner.ts:175`), which rebases `initialSnapshot` to the post-setup, pre-run state. Setup-phase commands and diffs are intentionally discarded by ScenarioRunner. **Implication:** replaying a scenario-derived bundle reproduces the run from the post-setup state forward; consumers that want to replay from raw `World` construction must reproduce `setup()` in their `worldFactory` before deserializing the snapshot.
-- `ticks` ← `ScenarioCapture.history.ticks`.
-- `commands` ← derived from `ScenarioCapture.history.commands`. **Critical:** `WorldHistoryRecorder` records `CommandSubmissionResult` (no payload), so a scenario-derived bundle is NOT replayable unless the scenario was set up with a custom history recorder that captures `RecordedCommand` (or unless the engine adds a `recordCommandPayloads: true` option to `WorldHistoryRecorder`). The simplest path in v1: `scenarioCaptureToBundle()` accepts an additional optional `commands?: RecordedCommand[]` parameter that the scenario author supplies if they want a replayable bundle. Without payloads, the bundle is diagnostic-only (markers, snapshots, ticks, executions) and `openAt(tick)` throws `BundleIntegrityError` with `code: 'no_replay_payloads'`.
-- `executions` ← `ScenarioCapture.history.executions`.
-- `failures` ← `ScenarioCapture.history.failures`.
-- `snapshots` ← `[{ tick: capture.tick, snapshot: capture.snapshot }]`. Single entry; selfCheck will check the segment from `initialSnapshot` to this final snapshot. Future enhancement could add periodic snapshots via a scenario option.
-- `markers` ← one assertion marker per scenario check outcome:
+`ScenarioResult` (not `ScenarioCapture`) is the input because it carries `result.name` and `result.checks` which the adapter needs for metadata and assertion markers.
+
+### 10.1 Translation
+
+- `metadata.sourceKind = 'scenario'`, `metadata.sourceLabel = options?.sourceLabel ?? result.name`.
+- `metadata.engineVersion` ← `package.json` version at translate time. `metadata.nodeVersion` ← `options?.nodeVersion ?? process.version`.
+- `metadata.startTick` ← `result.history.initialSnapshot?.tick ?? 0`. **Not hardcoded to 0.** `runScenario` may be invoked on a world that has already advanced beyond tick 0 (e.g., from a deserialized snapshot, or from setup-time `world.step()` calls). `result.history.initialSnapshot.tick` is the authoritative starting point — `runScenario` calls `history.clear()` after `setup` runs (`src/scenario-runner.ts:175`) which rebases `initialSnapshot` to the post-setup, pre-run state.
+- `metadata.endTick` ← `result.tick` (final tick when checks ran).
+- `metadata.durationTicks` ← `metadata.endTick - metadata.startTick`.
+- `initialSnapshot` ← `result.history.initialSnapshot`. **Note:** post-setup, not pre-setup. Replaying a scenario-derived bundle reproduces the run from the post-setup state forward; consumers that want to replay from raw `World` construction must reproduce `setup()` in their `worldFactory` before deserializing the snapshot. Document in §14's scenario-runner guide section.
+- `ticks` ← `result.history.ticks`.
+- `commands` ← `result.history.commands` (now `RecordedCommand[]` because §10.2 commits `WorldHistoryRecorder` to the `captureCommandPayloads: true` configuration that scenarios MUST opt into for replayable bundles).
+- `executions` ← `result.history.executions`.
+- `failures` ← `result.history.failures`.
+- `snapshots` ← `[{ tick: result.tick, snapshot: result.snapshot }]`. Single entry; selfCheck will check the segment from `initialSnapshot` to this final snapshot. Future enhancement could add periodic snapshots via a scenario option.
+- `markers` ← one assertion marker per `result.checks` outcome:
   ```
-  { id, tick: capture.tick, kind: 'assertion', provenance: 'engine',
-    text: check.name, data: { passed: outcome.passed, failure: outcome.failure } }
+  { id, tick: result.tick, kind: 'assertion', provenance: 'engine',
+    text: outcome.name, data: { passed: outcome.passed, failure: outcome.failure } }
   ```
-  Note: `ScenarioCheckOutcome` does NOT currently track per-check tick (verified at `src/scenario-runner.ts:44-48`). All assertion markers therefore share `tick === capture.tick`. A future spec extends `ScenarioCheckOutcome` to track per-check tick, after which the adapter can place each marker at its actual check tick.
+  `ScenarioCheckOutcome` does NOT currently track per-check tick (verified at `src/scenario-runner.ts:44-48`). All assertion markers share `tick === result.tick`. A future spec extends `ScenarioCheckOutcome` to track per-check tick, after which the adapter can place each marker at its actual check tick.
 - `attachments` ← empty array; scenarios have no attachment producer.
 
-**Recommended scenario configuration for replayable bundles:**
+### 10.2 `captureCommandPayloads` on `WorldHistoryRecorder`
+
+For scenarios to produce replayable bundles, `WorldHistoryRecorder` must capture full `RecordedCommand` payloads (not just `CommandSubmissionResult` results). This spec **commits to adding a `captureCommandPayloads: boolean` option to `WorldHistoryRecorder`'s constructor** (defaulting to `false` to preserve the existing rolling-buffer-debug use case). When `true`:
+
+- The recorder's `submit`/`submitWithResult` is wrapped (matching `SessionRecorder`'s pattern) to capture `{ type, data, sequence, submissionTick, result }` into a `commands: RecordedCommand[]` field on the `WorldHistoryState`.
+- `WorldHistoryState.commands` becomes `RecordedCommand[]` when this option is enabled (was `CommandSubmissionResult[]`). The type is widened to `Array<CommandSubmissionResult | RecordedCommand>` for backward compatibility — the discriminator is the presence of `data`.
+
+This is an additive, opt-in change to `WorldHistoryRecorder`. The default behavior (capacity 64, payload-less command capture) is preserved for existing consumers. Scenarios that want replayable bundles opt in:
 
 ```ts
-const capture = await runScenario({
+const result = await runScenario({
   name: 'my-scenario',
   setup: ...,
   steps: ...,
   checks: ...,
   history: { capacity: Number.MAX_SAFE_INTEGER, captureCommandPayloads: true },
-  // captureCommandPayloads is a new opt-in flag on WorldHistoryRecorder (or a new
-  // SessionRecorder attached for the run); see Open Question §16.6.
 });
-const bundle = scenarioCaptureToBundle(capture, { sourceLabel: 'my-scenario' });
+const bundle = scenarioResultToBundle(result);
 ```
 
+### 10.3 Constraints
+
 **Bounded history truncates long scenarios.** `WorldHistoryRecorder` defaults to capacity 64 ticks. Scenarios longer than that with default config silently truncate, producing a non-replayable bundle. Document this prominently in `docs/guides/scenario-runner.md` per §14.
 
-`ScenarioCapture` itself is unchanged; existing consumers continue to work. `scenarioCaptureToBundle()` does not require `SessionRecorder`; it operates on the data ScenarioRunner already has plus optional supplied command payloads.
+**Non-replayable scenarios.** Scenarios that did not opt into `captureCommandPayloads` produce diagnostic-only bundles. The adapter still runs, but `commands` is empty. `openAt(tick)` on such a bundle throws `BundleIntegrityError(code: 'no_replay_payloads')` for any tick that requires command replay (i.e., any tick `> startTick`). `selfCheck()` returns `{ ok: true, checkedSegments: 0 }` with a console warning ("scenario bundle has no command payloads; skipping replay verification"). The §13.5 CI gate accommodates this case by checking only scenarios opted into payload capture.
+
+**`ScenarioCapture` itself is unchanged**; existing consumers continue to work.
 
 ## 11. Determinism Contract
 
@@ -550,7 +615,12 @@ For replay to produce the same state as recording, user code MUST:
 
 8. **System and component registration order must match between recording and replay.** The `worldFactory` provided to `SessionReplayer` is part of the determinism contract (per ADR 4 in §15); it must reproduce the same `registerComponent`, `registerValidator`, `registerHandler`, and `registerSystem` calls in the same order as the recording-time setup. Drift produces selfCheck divergences indistinguishable from genuine determinism violations.
 
-9. **Replay determinism requires identical engine major version AND identical Node/V8 major version.** Math transcendentals (`Math.sin`, `Math.cos`, `Math.log`, etc.) are not bit-identical across V8 majors. Cross-runtime replay may diverge on transcendental-heavy systems even when all other obligations are met. The bundle records `metadata.engineVersion` and `metadata.nodeVersion`; `SessionReplayer` warns when minor differs and refuses cross-major-version replay (per H5 in iter-1 review).
+9. **Replay determinism is bounded by engine and Node version compatibility.** The bundle records `metadata.engineVersion` (the engine's `package.json` version, e.g. `0.7.6`) and `metadata.nodeVersion` (e.g. `v22.14.0`). At replay time:
+
+   - **Engine version compatibility uses civ-engine's own breaking-change axis** (the `b` component in `a.b.c` per `AGENTS.md`'s versioning convention, since the engine is pre-1.0 and `b`-bumps signal breaking changes). Cross-`b` engine version replay (e.g., bundle from `0.6.x` against running `0.7.x`) throws `BundleVersionError`. Within-`b` differences (`0.7.5` vs `0.7.8`) warn via `console.warn` but proceed.
+   - **Node major version mismatch** warns but proceeds. Math transcendentals (`Math.sin`, `Math.cos`, `Math.log`, etc.) are not bit-identical across V8 majors; cross-runtime replay may diverge on transcendental-heavy systems. selfCheck() will surface any actual divergence; the warning is a triage hint, not a refusal. Most determinism-critical systems do not use transcendentals, so cross-major Node replay typically succeeds.
+
+   These rules live in §11.1 and are referenced (not re-stated) by §9.1 preconditions and §13.4 failure-mode tests, to keep a single source of truth.
 
 The engine does NOT structurally enforce these obligations in v1. Strict-mode enforcement is a future spec (§17 entry #6). This spec relies on the replay self-check (§9.3) to surface violations.
 
@@ -562,19 +632,19 @@ The engine does NOT structurally enforce these obligations in v1. Strict-mode en
 
 ### 11.3 Documentation surface
 
-The contract is documented in `docs/guides/session-recording.md` (new) with concrete examples of each violation pattern (one example per clause 1–9). `MarkerValidationError` and the three divergence types include `referencesContractClause: number` (1–9) for cross-referencing back to the offending clause.
+The contract is documented in `docs/guides/session-recording.md` (new) with concrete examples of each violation pattern (one example per clause 1–9). `MarkerValidationError` includes a `referencesValidationRule?: string` field (e.g., `"6.1.entity_liveness"`) for cross-referencing back to the §6.1 marker-validation rule that fired — markers map cleanly to validation rules. The three divergence types (`StateDivergence`, `EventDivergence`, `ExecutionDivergence`) do NOT carry a `referencesContractClause` field: a divergence's root cause is generally not derivable from the divergence pattern alone, and a wrong attribution would be misleading. The guide enumerates triage heuristics ("Math.sin in a hot path? probably clause 9; entity-iteration divergence? probably clause 6 or 8") for the agent / human reader.
 
 ## 12. Error Handling
 
 | Error                     | When                                                                                            |
 | ------------------------- | ----------------------------------------------------------------------------------------------- |
-| `MarkerValidationError`   | `addMarker()` receives a marker that fails §6.1 rules. Includes `details` naming the field and `referencesContractClause`. |
-| `RecorderClosedError`     | `connect()` after `disconnect()`; `addMarker()` / `attach()` / `takeSnapshot()` called after `disconnect()`. |
-| `SinkWriteError`          | A sink write fails (FileSink: ENOSPC, EACCES, etc.). Wraps the underlying I/O error. The recorder catches and sets `metadata.incomplete = true` rather than propagating, but the error is observable via the sink's lifecycle and the bundle's `incomplete` flag. |
-| `BundleVersionError`      | `SessionReplayer.fromBundle/fromSource` receives a bundle with a `schemaVersion` it does not understand, OR a bundle with `engineVersion` whose major differs from the running engine. |
-| `BundleRangeError`        | `openAt(tick)` / `eventsBetween(...)` called with a tick outside `[metadata.startTick, metadata.endTick]`. |
+| `MarkerValidationError`   | `addMarker()` receives a marker that fails §6.1 rules. Includes `details` naming the field and optional `referencesValidationRule` (e.g., `"6.1.entity_liveness"`). |
+| `RecorderClosedError`     | `connect()` after `disconnect()`; `connect()` on a poisoned world (`code: 'world_poisoned'`); `connect()` when another `SessionRecorder` is attached (`code: 'recorder_already_attached'`); `addMarker()` / `attach()` / `takeSnapshot()` after `disconnect()`. |
+| `SinkWriteError`          | A sink write fails (FileSink: ENOSPC, EACCES, etc.). Wraps the underlying I/O error. The recorder catches the error, sets `metadata.incomplete = true`, sets `recorder.lastError`, and marks itself terminal (subsequent listener invocations short-circuit). The error is observable via `recorder.lastError` and via the bundle's `incomplete` flag — never propagates out of the engine listener invocation. |
+| `BundleVersionError`      | `SessionReplayer.fromBundle/fromSource` receives a bundle with a `schemaVersion` it does not understand, OR a bundle with `engineVersion` whose `b`-component differs from the running engine (per §11.1 clause 9). Within-`b` mismatches warn but proceed. |
+| `BundleRangeError`        | `openAt(tick)` / `tickEntriesBetween(...)` / `stateAtTick(...)` called with a tick outside `[metadata.startTick, metadata.endTick]`. |
 | `BundleIntegrityError`    | Loaded bundle has missing snapshots, broken attachment refs, non-monotonic tick entries, an attempt to replay across a recorded `TickFailure` (`code: 'replay_across_failure'`), or a scenario bundle without command payloads being asked to replay (`code: 'no_replay_payloads'`). Stale entity refs in markers are NOT integrity errors — markers are point-in-time annotations and may legitimately reference entities that no longer exist by bundle finalization. |
-| `ReplayHandlerMissingError` | `openAt()` runs a `RecordedCommand` whose `type` has no registered handler in the replayer's `worldFactory`-built world. Distinguishes "world factory drift" from "determinism violation" (the prior `ReplayDivergenceError` name was ambiguous). |
+| `ReplayHandlerMissingError` | `openAt()` runs a `RecordedCommand` whose `type` has no registered handler in the replayer's `worldFactory`-built world. Distinguishes "world factory drift" from "determinism violation". |
 
 All errors extend a `SessionRecordingError` base class for `instanceof` discrimination. Engine fail-fast discipline applies: errors propagate, are not silently swallowed (except `SinkWriteError` per the recorder's per-§7.2 handling).
 
@@ -590,13 +660,13 @@ The engine's existing test discipline (Vitest, TDD per AGENTS.md) applies. Test
 - **`MemorySink` / `MemorySource`**: in-memory accumulation, `toBundle()` correctness, sync method semantics, `readSidecar` for sidecar-mode attachments, sidecar opt-in flag.
 - **`FileSink` / `FileSource`**: full file layout (manifest + 5 jsonl streams + snapshots/ + attachments/); manifest rewrites on close; JSONL append-only invariant; attachment policy (dataUrl under cap, sidecar over cap); recovery from `incomplete: true` bundles (read prefix); tolerance of partial JSONL line on read.
 - **`Marker`**: kind enum exhaustiveness; `EntityRef` validation (id+generation matching); cells; tickRange; opaque `data` round-trip; provenance discrimination.
-- **`scenarioCaptureToBundle()`**: assertion markers produced one per check outcome with `provenance: 'engine'`; sourceKind/sourceLabel set; metadata fields populated; bundle without command payloads throws `BundleIntegrityError` on `openAt()`.
+- **`scenarioResultToBundle()`**: assertion markers produced one per `result.checks` outcome with `provenance: 'engine'`; `metadata.sourceKind`/`sourceLabel`/`startTick` (from `result.history.initialSnapshot.tick`)/`endTick` (from `result.tick`) populated correctly; bundle without command payloads warns and `selfCheck()` returns `checkedSegments: 0`; bundle WITH payloads (scenario opted into `captureCommandPayloads: true`) is replayable.
 
 ### 13.2 Integration tests
 
 - **Record → replay → state-equal.** Build a small scenario (10 entities, 1000 ticks, varied commands including accepted+rejected, multiple validators), record with `snapshotInterval: 100`, serialize the bundle, deserialize via `SessionReplayer.fromBundle`, call `openAt(N)` for representative ticks (initial, mid-segment, snapshot boundary, last tick), assert `world.serialize()` deep-equals the corresponding recorded snapshot.
 - **MemorySink ↔ FileSink parity.** Record the same scenario via both sinks; assert the resulting bundles are structurally equal modulo `attachments[].ref` (dataUrl vs sidecar). Replay both; assert identical openAt results.
-- **Scenario integration.** Convert an existing scenario test (e.g. one of the existing `runScenario(...)` tests) to also assert `scenarioCaptureToBundle(capture)` produces a valid bundle with one `kind: 'assertion'` marker per check outcome, matching `outcome.passed` and `outcome.failure`.
+- **Scenario integration.** Convert an existing scenario test (e.g. one of the existing `runScenario(...)` tests) to also assert `scenarioResultToBundle(result)` produces a valid bundle with one `kind: 'assertion'` marker per `result.checks` outcome, matching `outcome.passed` and `outcome.failure`.
 - **Long capture smoke.** 10000-tick session with 50 commands per tick, default snapshot cadence (10 snapshots), `MemorySink`. Assert bundle loads, `selfCheck()` passes, `openAt` for any tick completes within reasonable time. Throughput target: `openAt()` walking a single segment runs ≥ 5x recording throughput; `selfCheck()` over N segments scales linearly. Drop the conflated multiplier.
 - **Cross-snapshot replay.** `openAt(tick)` where `tick` falls between two snapshots — verify the replayer correctly walks from the prior snapshot through recorded commands.
 
@@ -634,7 +704,9 @@ Plus:
 
 ### 13.5 CI gate (per N3 in iter-1 review)
 
-Every existing scenario in the engine test suite (under `tests/scenarios/`) is wrapped with `scenarioCaptureToBundle(capture)` followed by `replayer.selfCheck()`. selfCheck failures fail `npm test`. This converts the documented determinism contract into a gate enforced by the engine's existing scenario corpus, without strict-mode engine changes.
+Every existing scenario in the engine test suite (which currently lives in `tests/scenario-runner.test.ts` plus any scenarios added in `tests/scenarios/` going forward) is migrated to opt into `captureCommandPayloads: true` on `WorldHistoryRecorder` (a one-line addition to the scenario's history config) and is wrapped with `scenarioResultToBundle(result)` followed by `replayer.selfCheck()`. selfCheck failures fail `npm test`. This converts the documented determinism contract into a gate enforced by the engine's existing scenario corpus, without strict-mode engine changes.
+
+Scenarios that are not migrated (or that intentionally don't capture payloads) continue to produce diagnostic-only bundles; the CI gate skips selfCheck for these with a console warning per §10.3, so the migration can proceed incrementally.
 
 ## 14. Documentation Surface
 
@@ -642,14 +714,14 @@ This spec lands the following doc updates per the `AGENTS.md` Documentation disc
 
 **Always-update:**
 
-- `docs/changelog.md` — new entry describing the SessionRecorder/SessionReplayer/SessionBundle/SessionSink/SessionSource/Marker/RecordedCommand public API additions and the `scenarioCaptureToBundle()` adapter function.
+- `docs/changelog.md` — new entry describing the SessionRecorder/SessionReplayer/SessionBundle/SessionSink/SessionSource/Marker/RecordedCommand public API additions and the `scenarioResultToBundle()` adapter function.
 - `docs/devlog/summary.md` — one line per shipped commit (recorder/replayer/sink/scenario-integration likely ship as multiple commits on the chained branch).
 - `docs/devlog/detailed/<latest>.md` — full per-task entries.
 - `package.json` — version bumps per the per-commit policy in `AGENTS.md` (current version v0.7.6). All additions in this spec are additive and non-breaking, so each shipped commit gets a `c`-bump (e.g., v0.7.7 for the recorder commit, v0.7.8 for the replayer commit, and so on). No `b`-bump expected for this spec.
 
 **API surface:**
 
-- `docs/api-reference.md` — new top-level sections for `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`, `SessionSource`, `MemorySink`, `FileSink`, `Marker`, `MarkerKind`, `MarkerProvenance`, `MarkerRefs`, `RecordedCommand`, `AttachmentDescriptor`, `SessionMetadata`, `SelfCheckOptions`, `SelfCheckResult`, `StateDivergence`, `EventDivergence`, `ExecutionDivergence`, `SessionRecordingError` and subclasses (`MarkerValidationError`, `RecorderClosedError`, `SinkWriteError`, `BundleVersionError`, `BundleRangeError`, `BundleIntegrityError`, `ReplayHandlerMissingError`); plus the `scenarioCaptureToBundle()` standalone function.
+- `docs/api-reference.md` — new top-level sections for `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`, `SessionSource`, `MemorySink`, `FileSink`, `Marker`, `MarkerKind`, `MarkerProvenance`, `MarkerRefs`, `RecordedCommand`, `AttachmentDescriptor`, `SessionMetadata`, `SelfCheckOptions`, `SelfCheckResult`, `StateDivergence`, `EventDivergence`, `ExecutionDivergence`, `SessionRecordingError` and subclasses (`MarkerValidationError`, `RecorderClosedError`, `SinkWriteError`, `BundleVersionError`, `BundleRangeError`, `BundleIntegrityError`, `ReplayHandlerMissingError`); plus the `scenarioResultToBundle()` standalone function.
 - `README.md` — Feature Overview table row for "Session recording & replay"; Public Surface bullets for the new top-level exports.
 - `docs/README.md` — index link to the new `session-recording.md` guide.
 
@@ -662,7 +734,7 @@ This spec lands the following doc updates per the `AGENTS.md` Documentation disc
 **Topical guides (mandatory updates per AGENTS.md "Update if applicable" rules):**
 
 - `docs/guides/session-recording.md` (new) — recording quickstart, sink choice, marker authoring, replay, self-check, full §11 determinism contract with one concrete violation example per clause 1–9.
-- `docs/guides/scenario-runner.md` (existing) — new section on `scenarioCaptureToBundle()`, the `WorldHistoryRecorder` capacity caveat for replayable bundles, and how scenario runs integrate with the broader recording surface.
+- `docs/guides/scenario-runner.md` (existing) — new section on `scenarioResultToBundle()`, the `WorldHistoryRecorder` capacity caveat for replayable bundles, and how scenario runs integrate with the broader recording surface.
 - `docs/guides/debugging.md` (existing) — pointer to the new session-recording guide for replay-based debugging; expand the diagnostic flow to include "load bundle → jump to marker → step forward."
 - `docs/guides/concepts.md` (existing) — add `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`/`SessionSource` to the standalone-utilities list; tick-lifecycle ASCII updated to show `submit()` interception by recorder when attached.
 - `docs/guides/ai-integration.md` (existing) — add a section on session recording as the foundation of AI-driven debugging: agent loads bundle, queries markers, opens at any tick, inspects state programmatically. This entire feature is the substrate of the AI-first roadmap; the guide must reflect it.
@@ -695,7 +767,7 @@ This spec lands the following doc updates per the `AGENTS.md` Documentation disc
 
 ### ADR 2: Bundle format as a first-class shared type, not a recorder-private shape
 
-**Decision:** `SessionBundle` is exported as a strict-JSON shared type and is identical regardless of producer. Both `SessionRecorder.toBundle()` and `scenarioCaptureToBundle()` emit the same shape; `MemorySink.toBundle()` and `FileSink.toBundle()` produce structurally equal bundles modulo `attachments[].ref` (dataUrl vs sidecar). Sidecar binary payloads live outside the JSON shape and are accessed via `source.readSidecar(id)`. The replayer accepts `SessionBundle` regardless of producer.
+**Decision:** `SessionBundle` is exported as a strict-JSON shared type and is identical regardless of producer. Both `SessionRecorder.toBundle()` and `scenarioResultToBundle()` emit the same shape; `MemorySink.toBundle()` and `FileSink.toBundle()` produce structurally equal bundles modulo `attachments[].ref` (dataUrl vs sidecar). Sidecar binary payloads live outside the JSON shape and are accessed via `source.readSidecar(id)`. The replayer accepts `SessionBundle` regardless of producer.
 
 **Context:** Recording sessions and running scenarios both produce "a deterministic timeline with markers." Forcing two formats would require the replayer/viewer to handle both, doubling validation surface and confusing consumers.
 
@@ -752,8 +824,9 @@ The following are intentionally left for the writing-plans phase or for future s
 3. **Default `snapshotInterval` of 1000.** Validated by the long-capture smoke test in §13.2. May be tuned based on representative bundle sizes.
 4. **`ReplayerConfig.worldFactory` ergonomics.** Per ADR 4, the factory is part of the determinism contract. A future spec may add a registration-manifest shape-check to surface factory drift with a clearer diagnostic; not v1.
 5. **Bundle command/execution/marker stream sharding.** A 10000-tick × 50-command-per-tick session produces 500K command entries; `commands.jsonl` would be hundreds of MB. v1 ships single-file streams; future enhancement may rotate at a configurable size threshold (e.g. `commands.0001.jsonl`, `commands.0002.jsonl`). Manifest already references streams by filename, so adding rotation is non-breaking.
-6. **`captureCommandPayloads` flag on `WorldHistoryRecorder`.** §10 calls for `WorldHistoryRecorder` to optionally capture `RecordedCommand` (with payload) instead of just `CommandSubmissionResult` so scenario-derived bundles can be replayable without a separate `SessionRecorder`. This is a minor additive change to `WorldHistoryRecorder`'s constructor — implement during the spec build-out. Alternative: `runScenario` accepts a `bundle?: SessionRecorder` option that does the dual-recording. Final decision in implementation phase.
-7. **`BufferedSink` proxy.** A future enhancement that wraps any `SessionSink` and batches writes asynchronously to mitigate tick-rate impact for production captures. Not v1 because it requires either an explicit drain policy (write-on-tick-boundary, write-on-marker, max-buffer-size) or a complete async-aware listener restructure. Worth specifying when synthetic playtest needs it.
+6. **`BufferedSink` proxy.** A future enhancement that wraps any `SessionSink` and batches writes asynchronously to mitigate tick-rate impact for production captures. Not v1 because it requires either an explicit drain policy (write-on-tick-boundary, write-on-marker, max-buffer-size) or a complete async-aware listener restructure. Worth specifying when synthetic playtest needs it.
+
+(Iter-2 review's Open Question 6 — `captureCommandPayloads` on `WorldHistoryRecorder` — is now resolved and committed in §10.2 of this spec.)
 
 ## 17. Future Specs (Backlog)
 
@@ -776,9 +849,10 @@ Vision and rationale for the full backlog are in `docs/design/ai-first-dev-roadm
 
 This spec is implemented when:
 
-- All six new symbols (`SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`/`SessionSource`, `Marker`, `RecordedCommand`) are exported from `src/index.ts` with full TypeScript types, plus the `scenarioCaptureToBundle()` function.
+- All six new symbols (`SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`/`SessionSource`, `Marker`, `RecordedCommand`) are exported from `src/index.ts` with full TypeScript types, plus the `scenarioResultToBundle()` function.
 - `MemorySink` (implementing `SessionSink & SessionSource`) and `FileSink` (implementing `SessionSink & SessionSource`) ship as concrete implementations.
-- `scenarioCaptureToBundle()` is added and produces replayable bundles with `provenance: 'engine'` assertion markers, given a scenario configured to capture command payloads.
+- `scenarioResultToBundle()` is added and produces replayable bundles with `provenance: 'engine'` assertion markers, given a scenario configured with `history: { captureCommandPayloads: true }`.
+- `WorldHistoryRecorder` gains the additive `captureCommandPayloads: boolean` constructor option (default `false` for backward compat). When `true`, the recorder wraps `submit`/`submitWithResult` to capture `RecordedCommand` payloads into `WorldHistoryState.commands`.
 - §13 test coverage is in place; all four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
 - `selfCheck()` correctly identifies deliberately introduced determinism violations across each clause of §11.1.
 - §13.5 CI gate is wired: every existing scenario in the engine test suite passes selfCheck during `npm test`.
