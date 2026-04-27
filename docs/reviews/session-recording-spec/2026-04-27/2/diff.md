commit 4eef1c39cf364cb3ee77f78ab84e2b83c1dd9005
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 00:21:23 2026 -0700

    docs(design): session-recording spec iter-1 review fixes
    
    Revises spec v1 → v2 in response to multi-CLI design review (Codex + Opus;
    Gemini quota-out 8th iter in a row). Iter-1 surfaced 6 Critical, 9 High,
    9 Medium, 4 Low, 3 Note findings. All addressed in this revision.
    
    Critical fixes:
    - New `RecordedCommand` type captures raw command type+data+sequence;
      `CommandSubmissionResult` alone is payload-less and can't drive replay.
    - Sinks are synchronous in v1 (sync `World` listeners can't await async
      sink writes); FileSink uses `fs.writeSync`; async sinks deferred.
    - Replay scope-limited to clean tick spans; `WorldSnapshotV5` doesn't
      capture poison state, so `openAt()` across recorded TickFailure throws
      `BundleIntegrityError`. Future spec extends snapshot to v6.
    - §9.1 replay loop fixed for `getObservableTick()` off-by-one (commands
      at submissionTick=t are processed by the step that advances t→t+1).
    - Determinism contract forbids mid-tick `submit()` (would double-submit
      on replay through both recorder capture and system re-run).
    - `SessionBundle` is strict JSON; sidecar bytes via `source.readSidecar`
      (was inline Map<string,Uint8Array> mixed into JSON-typed shape).
    
    Other notable changes:
    - §10 rewritten: `scenarioCaptureToBundle()` standalone function (not a
      class method — `runScenario` is a function, not a class).
    - New `SessionSource` read interface paired with `SessionSink`; both
      implemented by MemorySink and FileSink.
    - selfCheck() now compares state, events, AND command executions across
      initial-to-first-snapshot segment (was only state, only between
      snapshot pairs — silently no-op on scenario bundles).
    - Marker `entities` use `EntityRef` (id+generation) not `EntityId` to
      handle ID recycling.
    - Determinism contract extended: validators must be pure; no mid-tick
      submit; engine+Node major version coupling; registration order is
      part of the contract.
    - New ADR 4 promotes `worldFactory` to formal contract obligation.
    - §13 paired tests for each contract clause; CI gate via existing
      scenario suite running selfCheck on every `npm test`.
    - Doc surface §14 expanded per AGENTS.md mandatory updates: concepts,
      ai-integration, getting-started, building-a-game.
    
    Folder: docs/reviews/session-recording-spec/2026-04-26/1/ contains the
    full iter-1 raw outputs (codex.md, opus.md, gemini placeholder), the
    diff under review, and synthesized REVIEW.md per AGENTS.md convention.
    
    Iter-2 review queued to verify convergence.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

 ...26-04-26-session-recording-and-replay-design.md |  541 +-
 .../session-recording-spec/2026-04-26/1/REVIEW.md  |  281 +
 .../session-recording-spec/2026-04-26/1/diff.md    |  822 +++
 .../session-recording-spec/2026-04-26/1/prompt.txt |   29 +
 .../2026-04-26/1/raw/codex.md                      |   28 +
 .../2026-04-26/1/raw/codex.stderr.log              | 6253 ++++++++++++++++++++
 .../2026-04-26/1/raw/gemini.md                     |    1 +
 .../2026-04-26/1/raw/gemini.stderr.log             |   21 +
 .../2026-04-26/1/raw/opus.md                       |  168 +
 .../2026-04-26/1/raw/opus.stderr.log               |    0
 10 files changed, 7975 insertions(+), 169 deletions(-)

---

commit 4eef1c39cf364cb3ee77f78ab84e2b83c1dd9005
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 00:21:23 2026 -0700

    docs(design): session-recording spec iter-1 review fixes
    
    Revises spec v1 → v2 in response to multi-CLI design review (Codex + Opus;
    Gemini quota-out 8th iter in a row). Iter-1 surfaced 6 Critical, 9 High,
    9 Medium, 4 Low, 3 Note findings. All addressed in this revision.
    
    Critical fixes:
    - New `RecordedCommand` type captures raw command type+data+sequence;
      `CommandSubmissionResult` alone is payload-less and can't drive replay.
    - Sinks are synchronous in v1 (sync `World` listeners can't await async
      sink writes); FileSink uses `fs.writeSync`; async sinks deferred.
    - Replay scope-limited to clean tick spans; `WorldSnapshotV5` doesn't
      capture poison state, so `openAt()` across recorded TickFailure throws
      `BundleIntegrityError`. Future spec extends snapshot to v6.
    - §9.1 replay loop fixed for `getObservableTick()` off-by-one (commands
      at submissionTick=t are processed by the step that advances t→t+1).
    - Determinism contract forbids mid-tick `submit()` (would double-submit
      on replay through both recorder capture and system re-run).
    - `SessionBundle` is strict JSON; sidecar bytes via `source.readSidecar`
      (was inline Map<string,Uint8Array> mixed into JSON-typed shape).
    
    Other notable changes:
    - §10 rewritten: `scenarioCaptureToBundle()` standalone function (not a
      class method — `runScenario` is a function, not a class).
    - New `SessionSource` read interface paired with `SessionSink`; both
      implemented by MemorySink and FileSink.
    - selfCheck() now compares state, events, AND command executions across
      initial-to-first-snapshot segment (was only state, only between
      snapshot pairs — silently no-op on scenario bundles).
    - Marker `entities` use `EntityRef` (id+generation) not `EntityId` to
      handle ID recycling.
    - Determinism contract extended: validators must be pure; no mid-tick
      submit; engine+Node major version coupling; registration order is
      part of the contract.
    - New ADR 4 promotes `worldFactory` to formal contract obligation.
    - §13 paired tests for each contract clause; CI gate via existing
      scenario suite running selfCheck on every `npm test`.
    - Doc surface §14 expanded per AGENTS.md mandatory updates: concepts,
      ai-integration, getting-started, building-a-game.
    
    Folder: docs/reviews/session-recording-spec/2026-04-26/1/ contains the
    full iter-1 raw outputs (codex.md, opus.md, gemini placeholder), the
    diff under review, and synthesized REVIEW.md per AGENTS.md convention.
    
    Iter-2 review queued to verify convergence.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/docs/design/2026-04-26-session-recording-and-replay-design.md b/docs/design/2026-04-26-session-recording-and-replay-design.md
index 5b111e9..71b7226 100644
--- a/docs/design/2026-04-26-session-recording-and-replay-design.md
+++ b/docs/design/2026-04-26-session-recording-and-replay-design.md
@@ -1,6 +1,6 @@
 # Session Recording & Replay — Design Spec
 
-**Status:** Draft (2026-04-26). Accepted for implementation pending review of this document.
+**Status:** Draft v2 (2026-04-27). Revised after iter-1 multi-CLI review (Codex + Opus; Gemini quota-out). See `docs/reviews/session-recording-spec/2026-04-26/1/REVIEW.md` for the iter-1 findings folded into this revision. Awaiting iter-2 convergence before writing-plans.
 
 **Scope:** Engine-level primitives only (Scope B from brainstorming). Game-side annotation UI, standalone viewer, synthetic playtest harness, counterfactual replay, and strict-mode determinism enforcement are explicitly out of scope and tracked in `docs/design/ai-first-dev-roadmap.md`.
 
@@ -12,13 +12,13 @@
 
 This spec defines engine-level primitives that:
 
-- Capture a complete, deterministic, replayable record of any `World` run as a portable `SessionBundle`.
-- Allow any consumer (agent, human, debugger, CI) to load a bundle, jump to any tick, inspect state, step forward, and verify replay integrity.
+- Capture a deterministic, replayable record of any `World` run over a span of clean ticks as a portable `SessionBundle`.
+- Allow any consumer (agent, human, debugger, CI) to load a bundle, jump to any tick within the recorded clean span, inspect state, step forward, and verify replay integrity via a self-check that diffs state, per-tick events, and command execution streams.
 - Unify session bundles with scenario test runs so a single bundle format and a single replayer serve both live captures and programmatic test runs.
-- Provide a sink interface so bundles can stream to memory or disk (or future blob stores) without changes to the recorder API.
-- Support player-authored markers (annotations) and programmatic markers (assertions, checkpoints) with structured engine-validated references plus opaque game-defined payload.
+- Provide a sink interface so bundles can persist to memory or disk without changes to the recorder API. Sinks are synchronous in v1 to match the engine's listener contract; async / streaming sinks are deferred until a consumer needs them.
+- Support player-authored markers (annotations) and programmatic markers (assertions, checkpoints) with structured engine-validated references (entity refs with generation, cells, tick ranges) plus opaque game-defined payload.
 
-The deliverable is an opt-in API surface; existing engine consumers see no behavioral change.
+The deliverable is an opt-in API surface; existing engine consumers see no behavioral change. Replay across recorded tick failures or `world.recover()` cycles is explicitly out of scope for v1 (see §2).
 
 ## 2. Non-Goals
 
@@ -29,32 +29,35 @@ The following are deliberately excluded from this spec to keep it focused:
 - **Synthetic playtest harness.** A future spec will define an agent or scripted policy that drives `world.submit()` and produces bundles autonomously.
 - **Counterfactual replay (forking).** Substituting inputs at tick N and replaying forward to observe divergence is high-value but architecturally distinct; future spec.
 - **Strict-mode determinism enforcement.** Adding a `World({ strict: true })` flag that rejects mutations outside system phases is a parallel engine-wide change with its own design problem; future spec. This spec only documents the determinism contract and provides a `selfCheck()` to surface violations.
+- **Replay across recorded tick failures or `world.recover()` cycles.** `WorldSnapshotV5` does not capture poison state (`isPoisoned()`, `lastTickFailure`), so a recorded session that crossed a tick failure cannot be exactly reconstructed from snapshot+commands. v1 records failures into `bundle.failures` for diagnostic inspection but `openAt(tick)` throws `BundleIntegrityError` if `tick` falls inside or after a recorded failure span. A future spec extends `WorldSnapshot` to v6 to lift this restriction.
+- **Async / streaming sinks.** v1 sinks are synchronous to match `World`'s synchronous listener invariants. A future spec may add an async sink path concurrently with whatever engine-side restructuring it requires (e.g. a buffered-write proxy, or making listener invocation explicitly async-aware).
 - **Bundle search / corpus index, behavioral metrics, AI playtester.** Tier-2 capabilities that depend on the synthetic playtest spec landing first.
 
 ## 3. Background
 
 The engine already has most of the substrate this spec needs. Relevant existing primitives:
 
-- **`WorldHistoryRecorder`** (`src/history-recorder.ts:87`). Listener-based recorder with bounded rolling buffer (default capacity 64 ticks). Captures initial snapshot, per-tick `diff`/`events`/`metrics`/`debug`, command submissions, command executions, tick failures. Continues to serve runtime debugging unchanged. This spec adds a sibling primitive rather than extending it (see ADR in §15).
-- **`ScenarioRunner`** (`src/scenario-runner.ts`). Already wraps `WorldHistoryRecorder` and produces `ScenarioCapture` with snapshot + history + debug + metrics + diff + events. This spec adds a `toBundle()` adapter that translates `ScenarioCapture` into the new `SessionBundle` format with `kind: 'assertion'` markers for each scenario check.
-- **`WorldSnapshot v5`** (`src/serializer.ts`). Round-trips full deterministic state including seeded RNG, runtime config, and per-component `ComponentStoreOptions`. Sufficient as the snapshot type carried in bundles.
-- **`world.submit()`** (`src/world.ts`). Single typed input boundary for player intent. Already enforced as the only ingress for command-shaped state changes during normal operation.
+- **`WorldHistoryRecorder`** (`src/history-recorder.ts:87`). Listener-based recorder with bounded rolling buffer (default capacity 64 ticks). Captures initial snapshot, per-tick `diff`/`events`/`metrics`/`debug`, command submissions (as `CommandSubmissionResult` — note: this type does NOT carry the original command `data` payload), command executions, tick failures. Continues to serve runtime debugging unchanged. This spec adds a sibling primitive rather than extending it (see ADR 1 in §15).
+- **`runScenario`** (`src/scenario-runner.ts:133`). A standalone function (not a class) that runs a scenario and returns a `ScenarioCapture` with snapshot + history + debug + metrics + diff + events. This spec adds a sibling adapter `scenarioCaptureToBundle()` that translates `ScenarioCapture` into a `SessionBundle` with `kind: 'assertion'` markers for each scenario check.
+- **`WorldSnapshot v5`** (`src/serializer.ts:62`). Round-trips full deterministic state including seeded RNG, runtime config, and per-component `ComponentStoreOptions`. Does NOT carry poison state; v1 recording continues to capture failures via `bundle.failures` for diagnostics, but replay is scope-limited to clean tick spans (see §2).
+- **`world.submit()` / `world.submitWithResult()`** (`src/world.ts`). Single typed input boundary for player intent. Validators run synchronously *before* the command is queued (with the live world available); handlers run later during `processCommands()` at the start of the next tick. **`CommandSubmissionResult.tick` is the *observable* tick at submission time**, which is one less than the tick during which the command's handler runs (since `gameLoop.tick` advances at the end of `runTick()`). The replayer's command-replay loop must respect this off-by-one (see §9.1).
 - **`world.random()`**. Engine-owned seeded RNG. Already part of snapshot v3+. Routing all randomness through this is the basis of replay determinism.
 
 ## 4. Architecture Overview
 
-Five new symbols, plus one method on an existing symbol:
+Six new symbols, plus one new exported function:
 
-| Component              | Status            | Responsibility                                                                                      |
-| ---------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
-| `SessionRecorder`      | new (`src/session-recorder.ts`) | Subscribes to a live `World`, captures inputs/diffs/events/markers/snapshots, emits to a `SessionSink`. |
-| `SessionReplayer`      | new (`src/session-replayer.ts`) | Loads a bundle (or sink); opens a paused `World` at any tick; runs replay self-check.                |
-| `SessionBundle`        | new (in `src/session-bundle.ts`) | Versioned JSON-compatible archive type; shared by `SessionRecorder.toBundle()` and `ScenarioRunner.toBundle()`. |
-| `SessionSink`          | new (in `src/session-sink.ts`) | Persistence interface plus `MemorySink` (default) and `FileSink` (JSONL + sidecar attachments).      |
-| `Marker`               | new (in `src/session-bundle.ts`) | `{ tick, kind, text?, refs?, data?, attachments? }` with closed `kind` enum.                         |
-| `ScenarioRunner.toBundle()` | new method on existing class | Translates `ScenarioCapture` → `SessionBundle` with `sourceKind: 'scenario'` and `assertion` markers. |
+| Component                      | Status            | Responsibility                                                                                      |
+| ------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------- |
+| `SessionRecorder`              | new (`src/session-recorder.ts`) | Wraps a live `World` (intercepting `submit`/`submitWithResult`), captures inputs/diffs/events/markers/snapshots, emits to a `SessionSink`. Synchronous throughout. |
+| `SessionReplayer`              | new (`src/session-replayer.ts`) | Loads a bundle (or sink); opens a paused `World` at any tick within the bundle's clean span; runs replay self-check across state, events, and execution streams. |
+| `SessionBundle`                | new (in `src/session-bundle.ts`) | Versioned strict-JSON archive type; shared by `SessionRecorder.toBundle()` and `scenarioCaptureToBundle()`. |
+| `SessionSink` / `SessionSource` | new (in `src/session-sink.ts`) | Synchronous write interface (`Sink`) and read interface (`Source`); `MemorySink` and `FileSink` implement both. |
+| `Marker`                       | new (in `src/session-bundle.ts`) | `{ tick, kind, text?, refs?, data?, attachments?, provenance }` with closed `kind` enum and `EntityRef`-typed entity refs. |
+| `RecordedCommand`              | new (in `src/session-bundle.ts`) | Captures a submitted command's `type`, `data`, submission tick, sequence, and result. Replaces `CommandSubmissionResult[]` for replay-relevant purposes (the result-only type still travels for diagnostics). |
+| `scenarioCaptureToBundle()`    | new exported function (`src/session-bundle.ts`) | Translates `ScenarioCapture` → `SessionBundle` with `sourceKind: 'scenario'` and `assertion` markers. Standalone function, not a class method, because `runScenario` is a function, not a class. |
 
-`WorldHistoryRecorder` is unchanged. The two recorders coexist with distinct purposes (rolling debug buffer vs persistent archive).
+`WorldHistoryRecorder` and `runScenario` are unchanged. `SessionRecorder` and the legacy recorder coexist with distinct purposes (rolling debug buffer vs persistent archive).
 
 ```
                   ┌────────────────────────────────────┐
@@ -68,10 +71,10 @@ Five new symbols, plus one method on an existing symbol:
         └───────────┬────────────┘         └────────┬───────────┘
                     │                               │
                     │                       ┌───────┴──────────┐
-            ScenarioRunner.toBundle()       │   SessionSink    │
+       scenarioCaptureToBundle(capture)     │ SessionSink/Source│
                     │                       │ (Memory | File)  │
                     └────────►┌─────────────┴──────────────────┴─────────────►
-                              │           SessionBundle                       │
+                              │           SessionBundle (strict JSON)         │
                               │ (canonical archive; identical for both paths) │
                               └─────────────┬─────────────────────────────────┘
                                             │
@@ -99,23 +102,34 @@ interface SessionBundle<TEventMap, TCommandMap, TDebug = JsonValue> {
   metadata: SessionMetadata;
   initialSnapshot: WorldSnapshot;
   ticks: SessionTickEntry<TEventMap, TDebug>[];
-  commands: CommandSubmissionResult<keyof TCommandMap>[];
-  executions: CommandExecutionResult<keyof TCommandMap>[];
-  failures: TickFailure[];
+  commands: RecordedCommand<TCommandMap>[];               // includes raw type+data; replay-ready
+  executions: CommandExecutionResult<keyof TCommandMap>[]; // diagnostic; not used by replay
+  failures: TickFailure[];                                 // diagnostic; replay refuses spans across these
   snapshots: SessionSnapshotEntry[];
   markers: Marker[];
   attachments: AttachmentDescriptor[];
 }
 
 interface SessionMetadata {
-  sessionId: string;            // UUID v4 generated at recorder.connect()
-  engineVersion: string;        // package.json version at capture time
-  recordedAt: string;           // ISO 8601 timestamp
-  durationTicks: number;        // tick count from initial to final snapshot inclusive
-  startTick: number;            // tick at recorder.connect()
-  endTick: number;              // tick at recorder.disconnect() or toBundle()
+  sessionId: string;            // UUID v4 generated at SessionRecorder construction
+  engineVersion: string;        // package.json version at connect() time
+  nodeVersion: string;          // process.version at connect() time; replayer warns on mismatch
+  recordedAt: string;           // ISO 8601 timestamp at connect()
+  startTick: number;            // tick at connect()
+  endTick: number;              // tick at disconnect() or toBundle()
+  durationTicks: number;        // endTick - startTick
   sourceKind: 'session' | 'scenario';
   sourceLabel?: string;         // optional human label (scenario name, session label)
+  incomplete?: true;            // set if recorder did not reach disconnect() cleanly (sink failure, world destroy)
+  failureSpans?: Array<{ failedTick: number }>; // ticks where TickFailure was recorded; replay refuses these
+}
+
+interface RecordedCommand<TCommandMap = Record<string, unknown>> {
+  submissionTick: number;       // observable tick at submission time (CommandSubmissionResult.tick)
+  sequence: number;             // CommandSubmissionResult.sequence; orders within a tick
+  type: keyof TCommandMap & string;
+  data: TCommandMap[keyof TCommandMap];
+  result: CommandSubmissionResult<keyof TCommandMap>;  // accepted/rejected outcome; for diagnostics
 }
 
 interface SessionTickEntry<TEventMap, TDebug> {
@@ -135,32 +149,37 @@ interface AttachmentDescriptor {
   id: string;                   // UUID v4
   mime: string;                 // e.g. 'image/png'
   sizeBytes: number;
-  ref: 'inline' | 'sidecar' | { dataUrl: string };
-  // 'inline'   → bytes embedded in bundle.attachmentsInline (in-memory only)
-  // 'sidecar'  → bytes live in sink-specific external storage (FileSink: attachments/<id>.<ext>)
-  // dataUrl    → small attachments embedded as base64 data URLs (max 64 KiB)
+  ref: { dataUrl: string } | { sidecar: true };
+  // dataUrl  → small attachments embedded as base64 data URLs (default cap 64 KiB; oversize blobs require sidecar)
+  // sidecar  → bytes live outside the strict-JSON bundle (FileSink: attachments/<id>.<ext>;
+  //            MemorySink: parallel Map accessed via sink.getSidecar(id); sidecars require explicit
+  //            opt-in on MemorySink to avoid surprising consumers who treat the bundle as pure JSON)
 }
 ```
 
-`Marker` is defined in §6.
+`Marker` is defined in §6. `RecordedCommand` is the canonical replay input (`CommandSubmissionResult` alone does not carry the original `data` payload, so it cannot drive replay). Per §11.5, `RecordedCommand` MUST originate from outside the tick loop — submissions made from inside a system, command handler, or event listener are a determinism contract violation and break replay.
 
-For an in-memory bundle produced by `MemorySink`, attachments default to `'inline'` and the bundle additionally carries an `attachmentsInline: Map<string, Uint8Array>` field that is *not* part of the JSON-serializable shape — it is serialized lazily on `toBundle()` to either inline data URLs (if under threshold) or written to the sink as sidecar files (FileSink only).
+`SessionBundle` is strict JSON: `JSON.stringify(bundle)` produces a complete, lossless representation. Sidecar attachment bytes live outside the JSON shape; consumers retrieve them via `source.readSidecar(id)` (see §8). ADR 2 in §15 notes the MemorySink/FileSink shape symmetry: both implement `SessionSink & SessionSource`; the JSON-typed bundle is identical regardless of producer.
 
 ### 5.2 On-disk layout (FileSink)
 
 ```
 <bundleDir>/
-  manifest.json           # SessionBundle minus ticks (which live in JSONL) and attachment payloads
+  manifest.json           # SessionMetadata + index of streams + AttachmentDescriptor[] (sidecar refs only)
   ticks.jsonl             # one SessionTickEntry per line, ordered by tick
+  commands.jsonl          # one RecordedCommand per line, ordered by (submissionTick, sequence)
+  executions.jsonl        # one CommandExecutionResult per line, ordered by (tick, sequence)
+  failures.jsonl          # one TickFailure per line, ordered by tick
+  markers.jsonl           # one Marker per line, ordered by createdAt
   snapshots/
     <tick>.json           # one WorldSnapshot per recorded snapshot
   attachments/
-    <id>.<ext>            # binary blobs, ext inferred from mime
+    <id>.<ext>            # binary blobs, ext inferred from mime; only when AttachmentDescriptor.ref.sidecar
 ```
 
-`manifest.json` references snapshots by tick and attachments by id; `ticks.jsonl` is streamed during recording and read line-by-line during replay.
+`manifest.json` references snapshots by tick, ticks/commands/executions/failures/markers by JSONL filename, and sidecar attachments by id; `dataUrl`-mode attachments are embedded in the manifest. The five JSONL streams are written incrementally; the manifest is rewritten on each significant change so a reader of an `incomplete: true` bundle can still read the prefix that landed.
 
-`SessionReplayer.fromSink(fileSink)` reads `manifest.json` eagerly, then streams `ticks.jsonl` lazily; it does not load all snapshots into memory until requested.
+`SessionReplayer.fromSource(fileSource)` reads `manifest.json` eagerly, then streams individual JSONL files lazily as needed. Snapshots are loaded on demand via `source.readSnapshot(tick)`.
 
 ### 5.3 Versioning
 
@@ -170,34 +189,51 @@ For an in-memory bundle produced by `MemorySink`, attachments default to `'inlin
 
 ```ts
 type MarkerKind = 'annotation' | 'assertion' | 'checkpoint';
+type MarkerProvenance = 'engine' | 'game';
 
 interface Marker {
   id: string;                    // UUID v4
   tick: number;                  // engine tick the marker references; >= 0
   kind: MarkerKind;
+  provenance: MarkerProvenance;  // 'engine' for assertions added by scenarioCaptureToBundle();
+                                 // 'game' for any marker added via recorder.addMarker() by user code
   text?: string;                 // free-form human description
   refs?: MarkerRefs;             // engine-validated structured references
   data?: JsonValue;              // opaque game-defined payload
   attachments?: string[];        // attachment ids referenced by this marker
   createdAt?: string;            // ISO 8601 timestamp; recorder fills in if omitted
+  validated?: false;             // set on retroactive markers whose liveness checks were skipped (see §6.1)
 }
 
 interface MarkerRefs {
-  entities?: EntityId[];                        // must be alive at marker.tick
+  entities?: EntityRef[];                       // { id, generation }; must match a live entity at marker.tick (live markers only)
   cells?: Position[];                           // must be in-bounds for the world's grid
-  tickRange?: { from: number; to: number };     // both >= 0; from <= to; to <= bundle endTick
+  tickRange?: { from: number; to: number };     // both >= 0; from <= to; to constrained against bundle endTick at finalization
 }
 ```
 
+`EntityRef` (id + generation) is required because the engine recycles entity IDs via the free-list. A bare `EntityId` could silently match a recycled entity that has nothing to do with the original referent. Marker validation rejects refs that name a generation that has never existed.
+
 ### 6.1 Validation rules
 
 `SessionRecorder.addMarker()` validates a marker before storing it:
 
+**Live-tick markers (`marker.tick === world.tick`)** are validated strictly:
+
 - `tick` must be `>= 0` and `<= world.tick`. Markers cannot point to the future.
-- `refs.entities`: every id must be alive in the engine's `EntityManager` at `marker.tick`. Liveness check uses the most recent snapshot at or before `marker.tick` plus subsequent diffs (or the live world if `tick === world.tick`). Dead or never-existed ids throw `MarkerValidationError`.
+- `refs.entities`: every `EntityRef` must match a live entity at `world.tick` — both `id` and `generation` must match the engine's current `EntityManager` state. Refs to dead entities, recycled-id entities of a different generation, or never-existed ids throw `MarkerValidationError`.
 - `refs.cells`: every cell must be within the world's configured bounds. Out-of-bounds cells throw `MarkerValidationError`.
-- `refs.tickRange`: `from` and `to` must satisfy `0 <= from <= to`. The recorder does not require `to <= world.tick` because tick ranges may extend slightly past current tick if the player is annotating an in-flight event; replay validates `to` against bundle `endTick` instead.
-- `kind: 'assertion'` markers are produced only by `ScenarioRunner.toBundle()`. User code calling `recorder.addMarker({ kind: 'assertion', ... })` succeeds but is discouraged; `ScenarioRunner` is the canonical producer.
+- `refs.tickRange`: `from` and `to` must satisfy `0 <= from <= to`. `to <= world.tick + 1` is recommended but not enforced (the recorder does not know the eventual `endTick`); finalization in `toBundle()` clamps any `to > endTick` to `endTick` and records this in a `BundleIntegrityError` warning if the manifest is later read with `strict: true`.
+
+**Retroactive markers (`marker.tick < world.tick`)** are validated leniently:
+
+- `tick` and `refs.cells`/`refs.tickRange` are validated as above (these don't require historical state reconstruction).
+- `refs.entities` liveness is **not** validated — the recorder does not maintain a historical entity-liveness index, and reconstructing it from snapshots+diffs would make `addMarker()` O(N) in tick distance with disk I/O on `FileSink`. Retroactive markers get `validated: false` set on the marker so downstream consumers (viewer, agent search) know the entity refs are best-effort.
+- Replay-time validation in `SessionReplayer` may opt to verify retroactive marker entity refs against the deserialized snapshot at `marker.tick`. This is an explicit `replayer.validateMarkers()` call, not part of `selfCheck()`.
+
+**Universal rules (both live and retroactive):**
+
+- `kind: 'assertion'` markers added via `recorder.addMarker()` get `provenance: 'game'`. Engine-validated assertions added via `scenarioCaptureToBundle()` get `provenance: 'engine'`. Downstream consumers (viewer, corpus search) should distinguish these.
 - `data` is validated as JSON-compatible via the existing `assertJsonCompatible` helper.
 - `attachments` ids must reference attachments registered via `recorder.attach()`.
 
@@ -221,62 +257,84 @@ class SessionRecorder<TEventMap, TCommandMap, TDebug = JsonValue> {
   readonly markerCount: number;
   readonly snapshotCount: number;             // counts initial + periodic + manual
   readonly isConnected: boolean;
+  readonly isClosed: boolean;                 // true after disconnect(); recorder is single-use
 
   connect(): void;                            // hook listeners; capture initial snapshot; sink.open()
-  disconnect(): void;                         // unhook listeners; sink.close()
-
+  disconnect(): void;                         // unhook listeners; sink.close(); marks recorder closed
   addMarker(marker: NewMarker): MarkerId;     // tick defaults to world.tick if omitted
-  attach(blob: { mime: string; data: Uint8Array }): AttachmentId;
+  attach(blob: { mime: string; data: Uint8Array }, options?: { sidecar?: boolean }): AttachmentId;
   takeSnapshot(): SessionSnapshotEntry;       // manual snapshot at current tick
-
   toBundle(): SessionBundle<TEventMap, TCommandMap, TDebug>;
 }
 
-type NewMarker = Omit<Marker, 'id' | 'createdAt'> & { tick?: number };
+type NewMarker = Omit<Marker, 'id' | 'createdAt' | 'provenance'> & { tick?: number };
+//   provenance is fixed to 'game' for recorder-added markers; user cannot set 'engine'.
 type MarkerId = string;
 type AttachmentId = string;
 ```
 
 ### 7.1 Recorder lifecycle
 
-1. **Construction.** Generates `sessionId`, validates config, prepares (does not subscribe).
-2. **`connect()`.** Calls `sink.open(metadata)`. If `captureInitialSnapshot`, calls `world.serialize({ inspectPoisoned: true })` and writes the initial snapshot via `sink.writeSnapshot()`. Subscribes to `world.onDiff`, `world.onCommandResult`, `world.onCommandExecution`, `world.onTickFailure`. Subsequent ticks emit live to the sink. Calling `connect()` while already connected is a no-op.
-3. **Per-tick capture.** On each `onDiff`, the recorder builds a `SessionTickEntry` (clones via existing `cloneJsonValue` discipline), writes to sink, and if `world.tick % snapshotInterval === 0`, calls `world.serialize()` and writes a snapshot.
-4. **Marker / attachment additions.** Validated, written to sink incrementally so streaming sinks see them in order.
-5. **`disconnect()`.** Unhooks all listeners, calls `sink.close()`. After disconnect, `addMarker` and `takeSnapshot` throw `RecorderClosedError`.
-6. **`toBundle()`.** Returns the canonical in-memory `SessionBundle`. May be called before or after `disconnect()`. For `FileSink`, `toBundle()` requires the sink to be closed and reads back from disk.
+1. **Construction.** Generates `sessionId`, validates config, **wraps the live `world.submit()` and `world.submitWithResult()` methods** so the recorder can capture the raw `type` + `data` payload for every submission (not subscribed yet — wrapping is reversible). Records `engineVersion` and `nodeVersion` placeholders. Does not subscribe to listeners yet.
+2. **`connect()`.** Calls `sink.open(initialMetadata)` where `initialMetadata` has `startTick = world.tick`, `recordedAt = now()`, `endTick` and `durationTicks` left as zero (rewritten at finalization). If `captureInitialSnapshot`, calls `world.serialize()` and writes the initial snapshot via `sink.writeSnapshot()`. Subscribes to `world.onDiff`, `world.onCommandResult`, `world.onCommandExecution`, `world.onTickFailure`. Subsequent ticks emit live to the sink. Calling `connect()` while already connected is a no-op; calling `connect()` after `disconnect()` throws `RecorderClosedError` (recorder is single-use).
+3. **Per-tick capture.** On each `onDiff`, the recorder builds a `SessionTickEntry`, clones via existing `cloneJsonValue` discipline, calls `sink.writeTick()` synchronously. If `world.tick % snapshotInterval === 0`, calls `world.serialize()` and `sink.writeSnapshot()` synchronously.
+4. **Submission capture.** The wrapped `submit`/`submitWithResult` builds a `RecordedCommand` from `{ type, data, result }` and calls `sink.writeCommand()` synchronously before returning the result to the caller.
+5. **Marker / attachment additions.** Validated per §6.1, then `sink.writeMarker()` / `sink.writeAttachment()` synchronously. Attachments default to `dataUrl` mode if under `MemorySink`'s threshold (64 KiB by default) or unconditionally on `FileSink`; pass `{ sidecar: true }` to force sidecar storage.
+6. **`disconnect()`.** Unwraps `submit`/`submitWithResult`, unhooks all listeners, finalizes `metadata.endTick = world.tick` and `metadata.durationTicks`, calls `sink.close()` (which rewrites `manifest.json` with the final metadata for `FileSink`). Tolerates a destroyed world: if `world.serialize()` would throw, sets `metadata.incomplete = true` and proceeds. After disconnect, `addMarker`, `attach`, and `takeSnapshot` throw `RecorderClosedError`. The recorder cannot be reconnected.
+7. **`toBundle()`.** Returns the canonical strict-JSON `SessionBundle` from `sink.toBundle()`. May be called before or after `disconnect()`. If called before disconnect on a `FileSink`, the bundle is built from the current on-disk state with `incomplete: true` if `disconnect()` has not been called.
 
 ### 7.2 Failure modes
 
-- World poisoned at `connect()` time: recorder still records the failure-state initial snapshot (`inspectPoisoned: true`); subsequent failed ticks are captured via `onTickFailure`. Recording does not fail because the world is poisoned.
-- Sink write failure: throws `SinkWriteError` synchronously to the listener. The recorder does not auto-retry. Behavior on a partially written bundle is sink-defined (FileSink leaves a `manifest.json` with a `incomplete: true` flag).
-- World destroyed while connected: recorder's listeners are unhooked but `sink.close()` is not automatically called. Caller must call `disconnect()` to finalize. Future enhancement: auto-finalize on world destruction.
+- **Sink write failure (synchronous).** Throws `SinkWriteError` synchronously from the listener back to the engine. Per §11.5, the engine's `onDiff` / command listeners' exceptions are caught and `console.error`'d but do not propagate; the recorder additionally sets `metadata.incomplete = true` and best-effort closes the sink so the bundle is still consumable. Subsequent listener invocations short-circuit (the recorder enters a terminal `incomplete` state).
+- **World destroyed while connected.** Recorder's `disconnect()` is tolerant: any `world.serialize()` failure during finalization is caught; `metadata.incomplete = true` is recorded. Caller still must call `disconnect()` to finalize.
+- **Recorder constructed against a poisoned world.** Recording proceeds; `connect()` writes the failure-state snapshot via `serialize({ inspectPoisoned: true })`. Subsequent failed ticks are captured to `bundle.failures`. Replay refuses ticks at or after the first failure (per CR3 / §9.1).
+- **Multiple recorders attached to one world.** Supported; both wrap `submit`/`submitWithResult` (forming a chain) and both subscribe to listeners. Bundle outputs are independent.
+
+## 8. SessionSink and SessionSource Interfaces
+
+The sink interface is **synchronous** in v1 to compose with `World`'s synchronous listener contract (`onDiff` listeners cannot be awaited). Async / streaming sinks would require restructuring engine listener invocation and are deferred to a future spec.
 
-## 8. SessionSink Interface
+The sink contract is split in two: `SessionSink` writes; `SessionSource` reads. Both `MemorySink` and `FileSink` implement the union (`SessionSink & SessionSource`).
 
 ```ts
 interface SessionSink {
-  open(metadata: SessionMetadata): void | Promise<void>;
-  writeTick(entry: SessionTickEntry): void | Promise<void>;
-  writeCommandSubmission(result: CommandSubmissionResult): void | Promise<void>;
-  writeCommandExecution(result: CommandExecutionResult): void | Promise<void>;
-  writeTickFailure(failure: TickFailure): void | Promise<void>;
-  writeSnapshot(entry: SessionSnapshotEntry): void | Promise<void>;
-  writeMarker(marker: Marker): void | Promise<void>;
-  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): void | Promise<void>;
-  close(): void | Promise<void>;
-  toBundle(): SessionBundle | Promise<SessionBundle>;  // required: finalize and return canonical shape
+  open(metadata: SessionMetadata): void;
+  writeTick(entry: SessionTickEntry): void;
+  writeCommand(record: RecordedCommand): void;
+  writeCommandExecution(result: CommandExecutionResult): void;
+  writeTickFailure(failure: TickFailure): void;
+  writeSnapshot(entry: SessionSnapshotEntry): void;
+  writeMarker(marker: Marker): void;
+  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): void;
+  // descriptor.ref is mutated by the sink to reflect chosen storage policy (dataUrl vs sidecar);
+  // recorder receives the finalized descriptor back via the AttachmentId returned from recorder.attach().
+  close(): void;
+}
+
+interface SessionSource {
+  readonly metadata: SessionMetadata;
+  readSnapshot(tick: number): WorldSnapshot;
+  readSidecar(id: string): Uint8Array;
+  ticks(): IterableIterator<SessionTickEntry>;
+  commands(): IterableIterator<RecordedCommand>;
+  executions(): IterableIterator<CommandExecutionResult>;
+  failures(): IterableIterator<TickFailure>;
+  markers(): IterableIterator<Marker>;
+  attachments(): IterableIterator<AttachmentDescriptor>;
+  toBundle(): SessionBundle;  // finalize and return strict-JSON shape (excludes sidecar bytes; use readSidecar for those)
 }
 ```
 
 V1 ships two implementations:
 
-- **`MemorySink`** (default). Holds everything in memory; `toBundle()` returns a synchronous in-memory `SessionBundle`. Synchronous methods throughout. Suitable for short captures and tests.
-- **`FileSink`**. Streams ticks to `ticks.jsonl`, snapshots to `snapshots/<tick>.json`, attachments to `attachments/<id>.<ext>`, and writes `manifest.json` on `close()`. Asynchronous methods (returns `Promise`). Suitable for long captures and synthetic playtest (future spec).
+- **`MemorySink`** (default). Holds writes in in-memory arrays and an attachment map. `toBundle()` returns the synchronous in-memory `SessionBundle`. `readSidecar(id)` looks up the parallel sidecar map (only populated when `attach({}, { sidecar: true })` was called explicitly). Suitable for short captures and tests.
+- **`FileSink`**. Writes ticks to `ticks.jsonl`, commands to `commands.jsonl`, executions to `executions.jsonl`, failures to `failures.jsonl`, markers to `markers.jsonl`, snapshots to `snapshots/<tick>.json`, sidecar attachments to `attachments/<id>.<ext>`, and `manifest.json` initially on `open()` and rewritten on `close()` with finalized metadata. All writes use synchronous Node `fs.writeFileSync` / `fs.appendFileSync`. Suitable for long captures.
 
-The recorder's listener wiring tolerates both sync and async sinks: it `await`s every sink call. For `MemorySink` (sync), the await is a no-op. For `FileSink`, backpressure is the sink's responsibility; if disk is slow, the engine's tick rate can be affected — caller's choice.
+The recorder's listener calls every sink method synchronously. There is no async path; if disk I/O on `FileSink` is slow, the engine's tick rate slows in lockstep — the user can pre-buffer in memory (`MemorySink`) and write once at end-of-session, or accept the I/O coupling.
 
-Future sinks (out of scope but the interface accommodates): `BlobStoreSink`, `S3Sink`, `IndexedDBSink` (browser).
+A buffered-write proxy (`BufferedSink` wrapping any `SessionSink`) is acknowledged as future work but not in v1: it would batch writes and flush on a worker, mitigating tick-rate impact for production captures.
+
+Future sinks (out of scope): `BlobStoreSink`, `S3Sink`, `IndexedDBSink` (browser). All would require either the buffered-write proxy or async-aware engine listeners.
 
 ## 9. SessionReplayer API
 
@@ -287,10 +345,10 @@ class SessionReplayer<TEventMap, TCommandMap, TDebug = JsonValue> {
     config: ReplayerConfig<TEventMap, TCommandMap>,
   ): SessionReplayer<TEventMap, TCommandMap, TDebug>;
 
-  static fromSink<TEventMap, TCommandMap, TDebug>(
-    sink: SessionSink,
+  static fromSource<TEventMap, TCommandMap, TDebug>(
+    source: SessionSource,
     config: ReplayerConfig<TEventMap, TCommandMap>,
-  ): Promise<SessionReplayer<TEventMap, TCommandMap, TDebug>>;
+  ): SessionReplayer<TEventMap, TCommandMap, TDebug>;
 
   readonly metadata: SessionMetadata;
   readonly markerCount: number;
@@ -298,96 +356,177 @@ class SessionReplayer<TEventMap, TCommandMap, TDebug = JsonValue> {
   markers(): Marker[];
   markersAt(tick: number): Marker[];
   markersOfKind(kind: MarkerKind): Marker[];
-  markersByEntity(id: EntityId): Marker[];
+  markersByEntity(ref: EntityRef): Marker[];           // exact id+generation match
+  markersByEntityId(id: EntityId): Marker[];           // any generation; logs warning per call
 
   snapshotTicks(): number[];
   ticks(): number[];
 
-  openAt(tick: number): World<TEventMap, TCommandMap>;
+  openAt(tick: number): World<TEventMap, TCommandMap>; // tick must be in [startTick, endTick] AND outside failure spans
   stateAtTick(tick: number): WorldSnapshot;
   eventsBetween(fromTick: number, toTick: number): SessionTickEntry<TEventMap, TDebug>[];
+  // Inclusive on both ends. Throws BundleRangeError if either tick is outside [startTick, endTick].
 
-  selfCheck(options?: { stopOnFirstDivergence?: boolean }): SelfCheckResult;
+  selfCheck(options?: SelfCheckOptions): SelfCheckResult;
+  validateMarkers(): MarkerValidationResult;          // re-validates retroactive markers against recorded snapshots
 }
 
 interface ReplayerConfig<TEventMap, TCommandMap> {
   // Same world-construction config the original recording used.
   // The replayer needs registered components, validators, handlers, and systems
   // to reconstruct an equivalent World. Caller supplies a factory.
+  // Per ADR 4 in §15, this factory is part of the determinism contract.
   worldFactory: (snapshot: WorldSnapshot) => World<TEventMap, TCommandMap>;
 }
 
+interface SelfCheckOptions {
+  stopOnFirstDivergence?: boolean;     // default: false
+  checkState?: boolean;                // default: true; deep-equal snapshots at each segment end
+  checkEvents?: boolean;               // default: true; deep-equal per-tick event streams
+  checkExecutions?: boolean;           // default: true; deep-equal per-tick CommandExecutionResult streams
+}
+
 interface SelfCheckResult {
   ok: boolean;
-  checkedSnapshotPairs: number;
-  divergences: SelfCheckDivergence[];
+  checkedSegments: number;             // includes the initial-to-first-snapshot segment
+  stateDivergences: StateDivergence[];
+  eventDivergences: EventDivergence[];
+  executionDivergences: ExecutionDivergence[];
+}
+
+interface StateDivergence {
+  fromTick: number;
+  toTick: number;
+  expected: WorldSnapshot;
+  actual: WorldSnapshot;
+  firstDifferingPath?: string;
+}
+
+interface EventDivergence {
+  tick: number;
+  expected: Array<{ type: PropertyKey; data: unknown }>;
+  actual: Array<{ type: PropertyKey; data: unknown }>;
 }
 
-interface SelfCheckDivergence {
-  fromTick: number;            // snapshot we replayed from
-  toTick: number;              // snapshot we expected to match
-  expected: WorldSnapshot;     // the recorded snapshot
-  actual: WorldSnapshot;       // the snapshot produced by replay
-  firstDifferingPath?: string; // best-effort dotted path into the snapshot, e.g. "components.position[42].x"
+interface ExecutionDivergence {
+  tick: number;
+  expected: CommandExecutionResult[];
+  actual: CommandExecutionResult[];
+}
+
+interface MarkerValidationResult {
+  ok: boolean;
+  invalidMarkers: Array<{ markerId: string; reason: string }>;
 }
 ```
 
 ### 9.1 `openAt(tick)` semantics
 
-1. Find the latest snapshot in the bundle with `snapshot.tick <= tick`. If none, use `bundle.initialSnapshot`.
-2. Use the supplied `worldFactory` to construct a fresh `World` from that snapshot.
-3. Replay forward tick by tick. For each tick `t` from `snapshot.tick + 1` to `tick` inclusive: drain every recorded `CommandSubmissionResult` from `bundle.commands` whose submission tick equals `t` and call `world.submit()` with the original `type` and `data`, then call `world.step()`. Commands are replayed regardless of original acceptance — the engine's validators run again and produce the same outcome given the same state. This faithfully reproduces both accepted and rejected submissions.
-4. Return the resulting `World` in a paused state.
+**Range and integrity preconditions:**
+
+- If `tick < bundle.metadata.startTick` or `tick > bundle.metadata.endTick`, throws `BundleRangeError`.
+- If `tick === bundle.metadata.startTick`, returns `worldFactory(bundle.initialSnapshot)` directly without replay.
+- If `tick` falls inside or after a recorded `TickFailure` span (per `metadata.failureSpans`), throws `BundleIntegrityError` with `code: 'replay_across_failure'`. Replay across tick failures is out of scope (see §2; future spec extends `WorldSnapshot` to v6 to lift this).
+- If `bundle.metadata.engineVersion` differs from the running engine version: warns when only patch / minor differs; throws `BundleVersionError` when major differs (cross-major-version replay is not supported).
+- If `bundle.metadata.nodeVersion` differs from `process.version` major: warns. Math transcendentals (`Math.sin`, `Math.log`, etc.) are not bit-identical across V8 majors and may cause spurious divergence; replay still proceeds, but `selfCheck()` failures should be triaged with this in mind.
+
+**Replay algorithm (clean span case):**
+
+1. Find the latest snapshot `S` in `bundle.snapshots ∪ {bundle.initialSnapshot}` with `S.tick <= tick`.
+2. Construct a fresh paused `World` via `worldFactory(S.snapshot)`.
+3. For each tick `t` from `S.tick` to `tick - 1` inclusive:
+   a. Drain every `RecordedCommand` from `bundle.commands` whose `submissionTick === t`, ordered by `sequence` ascending.
+   b. For each, call `world.submit(rc.type, rc.data)` (or `submitWithResult` if the recorded result was from `submitWithResult`; the recorder distinguishes via a flag on `RecordedCommand`).
+   c. Call `world.step()` (this advances the world from tick `t` to tick `t+1`, processing the queued commands at the start of `t+1` per `processCommands()` semantics).
+4. After the loop, `world.tick === tick` and the world is paused. Return the world.
+
+**Why this off-by-one is correct.** `CommandSubmissionResult.tick` records the *observable* tick at submission time, which equals `gameLoop.tick` *before* `runTick()` advances it. A command observed at `submissionTick === 0` is processed by the step that advances `0 → 1`. The replay loop submits at `t` and immediately steps `t → t+1`, matching this exactly. Replaying a bundle with `startTick === 0` and `targetTick === 5` runs five iterations (`t = 0, 1, 2, 3, 4`), each submitting that tick's commands then stepping; the resulting world is at `tick === 5`, which is the requested target.
+
+**Submission ordering within a tick.** Multiple commands at the same `submissionTick` are replayed in `sequence` ascending, matching the recorder's capture order, matching the original engine queue order. Mid-tick submissions (which violate §11.1) are out of scope for replay; if a system calls `world.submit()` during `step()`, both the recorded submission and the replayed system's re-submission will fire — `selfCheck()` will surface this as a command-stream divergence.
 
 The returned `World` is fully functional — caller can step further, inspect state, query events. This is the agent's primary debugging affordance.
 
 ### 9.2 Replay determinism guarantee
 
-`openAt(tick)` is deterministic given the same `worldFactory` and the same engine version. If the bundle's recorded snapshot at `tick` exists, replay produces a snapshot equal to it at every JSON path. Divergence indicates a determinism bug in user code (commands, systems, components, state management) — the contract in §11 was violated.
+`openAt(tick)` is deterministic given the same `worldFactory`, the same engine major version, and the same Node major version (per H5 in iter-1 review). If the bundle's recorded snapshot at `tick` exists, replay produces a snapshot equal to it at every JSON path AND a per-tick event stream and execution stream identical to the recording's. Divergence in any of the three streams indicates a determinism contract violation per §11, or (rarely) a transcendental-Math difference across V8 majors.
 
 The replayer does not silently mask divergence; `selfCheck()` is the explicit verification path.
 
 ### 9.3 `selfCheck()` algorithm
 
 ```
-For each consecutive pair (snapshotA, snapshotB) in bundle.snapshots:
+segments = [(initialSnapshot, snapshots[0]), (snapshots[0], snapshots[1]), ..., (snapshots[n-2], snapshots[n-1])]
+// For scenario bundles, snapshots may have only one entry; in that case segments = [(initialSnapshot, snapshots[0])]
+// For session bundles with no periodic snapshots, segments = [] and selfCheck() returns ok: true with checkedSegments: 0
+
+For each (snapshotA, snapshotB) in segments:
   worldA = worldFactory(snapshotA.snapshot)
-  for each tick in (snapshotA.tick, snapshotB.tick]:
-    apply recorded commands at this tick via worldA.submit()
+  for each tick t from snapshotA.tick to snapshotB.tick - 1:
+    drain RecordedCommands at submissionTick === t (ordered by sequence)
+    submit each via worldA
     worldA.step()
-  actualB = worldA.serialize()
-  if not deepEqual(actualB, snapshotB.snapshot):
-    record SelfCheckDivergence{ fromTick: snapshotA.tick, toTick: snapshotB.tick, ... }
-    if stopOnFirstDivergence: break
+    if checkEvents: capture worldA.getEvents() and compare to bundle's tick entry events at t+1
+    if checkExecutions: capture worldA.getCommandExecutionResults() (or via listener) and compare
+  if checkState: actualB = worldA.serialize(); compare to snapshotB.snapshot via fast deep-equal
+  record any divergences in the appropriate divergence array
+  if stopOnFirstDivergence and any divergence recorded: break
 ```
 
-Equality uses a fast deep-equal that walks both objects and short-circuits on first mismatch. `firstDifferingPath` is a best-effort dotted path returned by the deep-equal helper for triage. Equality is structural, not referential; the comparison is on two structurally-equivalent `WorldSnapshot` JSON objects.
+Notes:
 
-## 10. ScenarioRunner Integration
+- **Initial-to-first-snapshot segment is included.** `bundle.initialSnapshot` is the implicit segment-0 start; `snapshots[0]` is the first periodic snapshot. This is critical: a determinism bug in the first 1000 ticks would otherwise go undetected.
+- **Scenario bundles converge.** Scenario bundles produce `snapshots: [{ tick: capture.tick, snapshot: capture.snapshot }]` — exactly one entry — so `segments = [(initialSnapshot, snapshots[0])]`. selfCheck still verifies the full scenario span.
+- **State equality** uses a fast recursive deep-equal that short-circuits on first mismatch and produces a best-effort dotted `firstDifferingPath` (`"components.position[42].x"`). Snapshot key ordering is stable per the snapshot serialization invariant (Map insertion order); two equal snapshots have equal key order, so deep-equal need not canonicalize. **Open Question 1** (§16) covers algorithm choice; the spec commits to recursive walk + short-circuit unless benchmarking exposes a problem.
+- **Event/execution equality** is by ordered structural equality on the per-tick array. Order matters (a system that emits the same events in a different order is a determinism violation).
+- **Cost.** selfCheck replays the full timeline once. For a 10000-tick bundle with 10 snapshots, that's 10 segments × 1000 ticks = 10000 ticks of replay plus deserialize/factory cost per segment. This is fundamentally O(N) in tick count and not avoidable; cost benchmarks live in §13.2.
 
-`ScenarioRunner` gains one new method:
+## 10. Scenario Integration
 
-```ts
-class ScenarioRunner<TEventMap, TCommandMap> {
-  // ... existing API unchanged
+`runScenario` is a function (not a class), so the spec adds a sibling adapter function:
 
-  toBundle(): SessionBundle<TEventMap, TCommandMap, WorldDebugSnapshot>;
-}
+```ts
+export function scenarioCaptureToBundle<TEventMap, TCommandMap>(
+  capture: ScenarioCapture<TEventMap, TCommandMap>,
+  options?: { sourceLabel?: string; nodeVersion?: string },
+): SessionBundle<TEventMap, TCommandMap, WorldDebugSnapshot>;
 ```
 
-The implementation translates the in-memory `ScenarioCapture` into a `SessionBundle`:
+The function takes a `ScenarioCapture` (already produced by `runScenario`) plus optional metadata overrides and emits a `SessionBundle`. Translation:
 
-- `metadata.sourceKind = 'scenario'`, `metadata.sourceLabel = scenario.name`.
-- `initialSnapshot` ← the snapshot ScenarioRunner already captures at setup.
+- `metadata.sourceKind = 'scenario'`, `metadata.sourceLabel = options?.sourceLabel ?? scenario.name`.
+- `metadata.engineVersion` ← package.json version at translate time. `metadata.nodeVersion` ← `options?.nodeVersion ?? process.version`. `metadata.startTick` ← `0` (scenario start tick by convention). `metadata.endTick` ← `capture.tick` (final tick when checks ran). `metadata.durationTicks` ← `capture.tick`.
+- `initialSnapshot` ← the snapshot `ScenarioCapture.history.initialSnapshot` — note that this is the **post-setup** state, not pre-setup. `runScenario` calls `history.clear()` after `setup` runs (per `src/scenario-runner.ts:175`), which rebases `initialSnapshot` to the post-setup, pre-run state. Setup-phase commands and diffs are intentionally discarded by ScenarioRunner. **Implication:** replaying a scenario-derived bundle reproduces the run from the post-setup state forward; consumers that want to replay from raw `World` construction must reproduce `setup()` in their `worldFactory` before deserializing the snapshot.
 - `ticks` ← `ScenarioCapture.history.ticks`.
-- `commands`/`executions`/`failures` ← `ScenarioCapture.history.commands`/etc.
-- `snapshots` ← `[{ tick: capture.tick, snapshot: capture.snapshot }]` (scenario captures one final snapshot; future enhancement could add periodic snapshots if a scenario opts in).
-- `markers` ← one `{ kind: 'assertion', tick: <check.tick>, text: check.name, data: { passed, failure } }` per scenario check outcome. The tick used is the tick the check ran at, which `ScenarioRunner` already tracks.
-- `attachments` ← empty in v1; scenarios have no attachment producer.
+- `commands` ← derived from `ScenarioCapture.history.commands`. **Critical:** `WorldHistoryRecorder` records `CommandSubmissionResult` (no payload), so a scenario-derived bundle is NOT replayable unless the scenario was set up with a custom history recorder that captures `RecordedCommand` (or unless the engine adds a `recordCommandPayloads: true` option to `WorldHistoryRecorder`). The simplest path in v1: `scenarioCaptureToBundle()` accepts an additional optional `commands?: RecordedCommand[]` parameter that the scenario author supplies if they want a replayable bundle. Without payloads, the bundle is diagnostic-only (markers, snapshots, ticks, executions) and `openAt(tick)` throws `BundleIntegrityError` with `code: 'no_replay_payloads'`.
+- `executions` ← `ScenarioCapture.history.executions`.
+- `failures` ← `ScenarioCapture.history.failures`.
+- `snapshots` ← `[{ tick: capture.tick, snapshot: capture.snapshot }]`. Single entry; selfCheck will check the segment from `initialSnapshot` to this final snapshot. Future enhancement could add periodic snapshots via a scenario option.
+- `markers` ← one assertion marker per scenario check outcome:
+  ```
+  { id, tick: capture.tick, kind: 'assertion', provenance: 'engine',
+    text: check.name, data: { passed: outcome.passed, failure: outcome.failure } }
+  ```
+  Note: `ScenarioCheckOutcome` does NOT currently track per-check tick (verified at `src/scenario-runner.ts:44-48`). All assertion markers therefore share `tick === capture.tick`. A future spec extends `ScenarioCheckOutcome` to track per-check tick, after which the adapter can place each marker at its actual check tick.
+- `attachments` ← empty array; scenarios have no attachment producer.
+
+**Recommended scenario configuration for replayable bundles:**
 
-`ScenarioCapture` itself is unchanged; existing consumers continue to work.
+```ts
+const capture = await runScenario({
+  name: 'my-scenario',
+  setup: ...,
+  steps: ...,
+  checks: ...,
+  history: { capacity: Number.MAX_SAFE_INTEGER, captureCommandPayloads: true },
+  // captureCommandPayloads is a new opt-in flag on WorldHistoryRecorder (or a new
+  // SessionRecorder attached for the run); see Open Question §16.6.
+});
+const bundle = scenarioCaptureToBundle(capture, { sourceLabel: 'my-scenario' });
+```
 
-`ScenarioRunner.toBundle()` does not require `SessionRecorder`; it operates on the data ScenarioRunner already has.
+**Bounded history truncates long scenarios.** `WorldHistoryRecorder` defaults to capacity 64 ticks. Scenarios longer than that with default config silently truncate, producing a non-replayable bundle. Document this prominently in `docs/guides/scenario-runner.md` per §14.
+
+`ScenarioCapture` itself is unchanged; existing consumers continue to work. `scenarioCaptureToBundle()` does not require `SessionRecorder`; it operates on the data ScenarioRunner already has plus optional supplied command payloads.
 
 ## 11. Determinism Contract
 
@@ -395,40 +534,49 @@ The implementation translates the in-memory `ScenarioCapture` into a `SessionBun
 
 For replay to produce the same state as recording, user code MUST:
 
-1. **Route all input through `world.submit()`.** Mutations made via `world.setComponent`, `world.setPosition`, `world.setState`, `world.addResource`, etc. are valid only inside a registered system (executed during `world.step()`). External code outside a system phase MUST submit a command and let the registered handler perform the mutation. Direct external mutation breaks replay because the recorder only captures commands, not direct mutation calls.
+1. **Route all input through `world.submit()` from outside the tick loop.** External code outside a system phase submits commands and lets registered handlers perform mutations. Direct external mutation via `world.setComponent` / `world.setPosition` / `world.setState` / `world.addResource` between ticks breaks replay because the recorder only captures commands, not direct mutation calls.
+
+2. **Do NOT call `world.submit()` from inside a system, command handler, event listener, or any code that runs during `world.step()`** (the "no mid-tick submit" rule). Mid-tick submissions get captured by the recorder AND get re-issued by the system on replay, double-submitting the command. The engine does not enforce this in v1; selfCheck surfaces the violation as an execution-stream divergence. If a system needs to enqueue a follow-up command, it should emit an event that an *external* coordinator picks up and submits between ticks.
+
+3. **Route all randomness through `world.random()`.** `Math.random()`, `crypto.getRandomValues()`, or any non-engine RNG produces values not captured by the snapshot's RNG state and therefore not reproducible during replay.
+
+4. **Validators must be pure.** Command validators registered via `world.registerValidator()` run synchronously in `submitWithResult()` *before* the command is queued, with the live `World` available. Validators MUST be deterministic functions of world state and the command payload — no side effects, no I/O, no `Math.random()`, no `Date.now()`. A side-effecting validator produces uncaptured mutations that break replay even when all other contract clauses are satisfied.
+
+5. **Avoid wall-clock time inside systems.** `Date.now()`, `performance.now()`, or any external time source is non-deterministic across machines and runs. The canonical clock is `world.tick`; if a system needs simulated time, multiply the tick by a fixed `tickDurationMs` from world config.
 
-2. **Route all randomness through `world.random()`.** `Math.random()`, `crypto.getRandomValues()`, or any non-engine RNG produces values not captured by the snapshot's RNG state and therefore not reproducible during replay.
+6. **Iterate ordered collections only.** `Map` (insertion-ordered) and arrays are safe. `Set` is insertion-ordered for primitive keys but order can shift if elements are removed and re-added; prefer `Map<key, true>` for sets that drive simulation. Object key iteration is engine-version-dependent and SHOULD be avoided. Engine query helpers (component-store iteration, spatial-grid neighbors, path queues) iterate in deterministic order; user code may rely on engine-side determinism but must not introduce its own non-deterministic iteration.
 
-3. **Avoid wall-clock time inside systems.** `Date.now()`, `performance.now()`, or any external time source is non-deterministic across machines and runs. The canonical clock is `world.tick`; if a system needs simulated time, multiply the tick by a fixed `tickDurationMs` from world config.
+7. **No environment-driven branching.** No `process.env`, `globalThis`, browser APIs, file system reads, or network calls inside a tick.
 
-4. **Iterate ordered collections only.** `Map` (insertion-ordered) and arrays are safe. `Set` is insertion-ordered for primitive keys but order can shift if elements are removed and re-added; prefer `Map<key, true>` for sets that drive simulation. Object key iteration is engine-version-dependent and SHOULD be avoided.
+8. **System and component registration order must match between recording and replay.** The `worldFactory` provided to `SessionReplayer` is part of the determinism contract (per ADR 4 in §15); it must reproduce the same `registerComponent`, `registerValidator`, `registerHandler`, and `registerSystem` calls in the same order as the recording-time setup. Drift produces selfCheck divergences indistinguishable from genuine determinism violations.
 
-5. **No environment-driven branching.** No `process.env`, `globalThis`, browser APIs, file system reads, or network calls inside a tick.
+9. **Replay determinism requires identical engine major version AND identical Node/V8 major version.** Math transcendentals (`Math.sin`, `Math.cos`, `Math.log`, etc.) are not bit-identical across V8 majors. Cross-runtime replay may diverge on transcendental-heavy systems even when all other obligations are met. The bundle records `metadata.engineVersion` and `metadata.nodeVersion`; `SessionReplayer` warns when minor differs and refuses cross-major-version replay (per H5 in iter-1 review).
 
-The engine does NOT enforce these obligations in v1. Strict-mode enforcement is a future spec. This spec relies on the replay self-check to surface violations.
+The engine does NOT structurally enforce these obligations in v1. Strict-mode enforcement is a future spec (§17 entry #6). This spec relies on the replay self-check (§9.3) to surface violations.
 
 ### 11.2 Replay self-check
 
-`SessionReplayer.selfCheck()` is the verification mechanism. If recording violates the contract, replay diverges from the recorded snapshot at the first affected tick after the violation, and `selfCheck()` reports the divergence with `firstDifferingPath` for triage.
+`SessionReplayer.selfCheck()` is the verification mechanism. If recording violates any contract clause, replay diverges from the recorded run at the first affected tick after the violation, and `selfCheck()` reports the divergence in one of three categories: `stateDivergences` (snapshot deep-equal mismatch), `eventDivergences` (per-tick event stream mismatch), or `executionDivergences` (per-tick command execution result mismatch). All three are reported by default; pass `{ checkState: false, checkEvents: false, checkExecutions: false }` to selectively disable.
 
-`selfCheck()` is recommended after every recording in CI-like contexts; for live captures, the cost (deserialize + replay between every snapshot pair) makes it an explicit opt-in, not automatic.
+`selfCheck()` is **mandatory in CI**: per §13.3 and §18, every existing scenario in the engine test suite runs `selfCheck()` on its produced bundle as part of `npm test`. selfCheck failures fail the test suite. This converts the documented contract into an enforced-by-corpus gate without requiring strict-mode engine changes. For live captures (long sessions outside CI), selfCheck is an explicit opt-in to manage cost.
 
 ### 11.3 Documentation surface
 
-The contract is documented in `docs/guides/session-recording.md` (new) with concrete examples of each violation pattern. The `Marker` validation errors and `SelfCheckDivergence` reports include `referencesContractClause: number` for cross-referencing.
+The contract is documented in `docs/guides/session-recording.md` (new) with concrete examples of each violation pattern (one example per clause 1–9). `MarkerValidationError` and the three divergence types include `referencesContractClause: number` (1–9) for cross-referencing back to the offending clause.
 
 ## 12. Error Handling
 
 | Error                     | When                                                                                            |
 | ------------------------- | ----------------------------------------------------------------------------------------------- |
-| `MarkerValidationError`   | `addMarker()` receives a marker that fails §6.1 rules. Includes `details` naming the field.     |
-| `RecorderClosedError`     | `addMarker()` / `attach()` / `takeSnapshot()` called after `disconnect()`.                      |
-| `SinkWriteError`          | A sink write rejects (FileSink: ENOSPC, EACCES, etc.). Wraps the underlying I/O error.          |
-| `BundleVersionError`      | `SessionReplayer.fromBundle/fromSink` receives a bundle with a `schemaVersion` it does not understand. |
-| `BundleIntegrityError`    | Loaded bundle has missing snapshots, broken attachment refs, or non-monotonic tick entries.     |
-| `ReplayDivergenceError`   | `openAt()` cannot reach the requested tick because a recorded command's handler is not registered in the replayer's world factory. |
+| `MarkerValidationError`   | `addMarker()` receives a marker that fails §6.1 rules. Includes `details` naming the field and `referencesContractClause`. |
+| `RecorderClosedError`     | `connect()` after `disconnect()`; `addMarker()` / `attach()` / `takeSnapshot()` called after `disconnect()`. |
+| `SinkWriteError`          | A sink write fails (FileSink: ENOSPC, EACCES, etc.). Wraps the underlying I/O error. The recorder catches and sets `metadata.incomplete = true` rather than propagating, but the error is observable via the sink's lifecycle and the bundle's `incomplete` flag. |
+| `BundleVersionError`      | `SessionReplayer.fromBundle/fromSource` receives a bundle with a `schemaVersion` it does not understand, OR a bundle with `engineVersion` whose major differs from the running engine. |
+| `BundleRangeError`        | `openAt(tick)` / `eventsBetween(...)` called with a tick outside `[metadata.startTick, metadata.endTick]`. |
+| `BundleIntegrityError`    | Loaded bundle has missing snapshots, broken attachment refs, non-monotonic tick entries, an attempt to replay across a recorded `TickFailure` (`code: 'replay_across_failure'`), or a scenario bundle without command payloads being asked to replay (`code: 'no_replay_payloads'`). Stale entity refs in markers are NOT integrity errors — markers are point-in-time annotations and may legitimately reference entities that no longer exist by bundle finalization. |
+| `ReplayHandlerMissingError` | `openAt()` runs a `RecordedCommand` whose `type` has no registered handler in the replayer's `worldFactory`-built world. Distinguishes "world factory drift" from "determinism violation" (the prior `ReplayDivergenceError` name was ambiguous). |
 
-All errors extend a `SessionRecordingError` base class for `instanceof` discrimination. Engine fail-fast discipline applies: errors propagate, are not silently swallowed.
+All errors extend a `SessionRecordingError` base class for `instanceof` discrimination. Engine fail-fast discipline applies: errors propagate, are not silently swallowed (except `SinkWriteError` per the recorder's per-§7.2 handling).
 
 ## 13. Testing Strategy
 
@@ -436,31 +584,57 @@ The engine's existing test discipline (Vitest, TDD per AGENTS.md) applies. Test
 
 ### 13.1 Unit tests
 
-- **`SessionRecorder`**: listener wiring, lifecycle (construct/connect/disconnect/double-connect-noop/post-disconnect-throws), marker validation (each §6.1 rule has a test pair: valid + invalid), attachment ID generation, snapshot cadence (manual + automatic), debug capture integration.
-- **`SessionBundle` schema**: JSON round-trip; rejection of malformed bundles by `assertJsonCompatible`.
-- **`MemorySink`**: in-memory accumulation, `toBundle()` correctness, sync method semantics.
-- **`FileSink`**: file layout, manifest correctness, JSONL streaming, attachment writing, recovery from `incomplete: true` bundles.
-- **`Marker`**: kind enum exhaustiveness, ref-validation for all four ref types, opaque `data` round-trip.
-- **`ScenarioRunner.toBundle()`**: assertion markers produced for each check, sourceKind/sourceLabel set, tick alignment between ScenarioCapture and bundle.
+- **`SessionRecorder`**: listener wiring; submit/submitWithResult interception captures `RecordedCommand` with payload; lifecycle (construct/connect/disconnect/double-connect-noop/post-disconnect-throws/connect-after-disconnect-throws); single-use semantics; tolerance of destroyed-world during disconnect; marker validation (each §6.1 rule has a test pair: valid + invalid; live vs retroactive paths); attachment ID generation and dataUrl/sidecar policy selection; snapshot cadence (manual + automatic); debug capture integration; multiple recorders attached to one world.
+- **`RecordedCommand`**: round-trip (type + data + result preserved); ordering within a tick by sequence; submitWithResult variant flag.
+- **`SessionBundle` schema**: strict-JSON round-trip via `JSON.stringify` + `JSON.parse`; rejection of malformed bundles by `assertJsonCompatible`; sidecar attachment refs are present in JSON but bytes are NOT.
+- **`MemorySink` / `MemorySource`**: in-memory accumulation, `toBundle()` correctness, sync method semantics, `readSidecar` for sidecar-mode attachments, sidecar opt-in flag.
+- **`FileSink` / `FileSource`**: full file layout (manifest + 5 jsonl streams + snapshots/ + attachments/); manifest rewrites on close; JSONL append-only invariant; attachment policy (dataUrl under cap, sidecar over cap); recovery from `incomplete: true` bundles (read prefix); tolerance of partial JSONL line on read.
+- **`Marker`**: kind enum exhaustiveness; `EntityRef` validation (id+generation matching); cells; tickRange; opaque `data` round-trip; provenance discrimination.
+- **`scenarioCaptureToBundle()`**: assertion markers produced one per check outcome with `provenance: 'engine'`; sourceKind/sourceLabel set; metadata fields populated; bundle without command payloads throws `BundleIntegrityError` on `openAt()`.
 
 ### 13.2 Integration tests
 
-- **Record → replay → state-equal.** Build a small scenario (10 entities, 1000 ticks, varied commands), record with default snapshot interval, deserialize via `SessionReplayer.fromBundle`, call `openAt(N)` for representative ticks, assert `world.serialize()` deep-equals the corresponding recorded snapshot.
-- **MemorySink ↔ FileSink parity.** Record the same scenario via both sinks; assert the resulting bundles are structurally equal modulo attachment refs.
-- **Scenario integration.** Convert an existing ScenarioRunner test to also assert `runner.toBundle()` produces a valid replayable bundle with assertion markers matching scenario checks.
-- **Long capture smoke.** 10000-tick session with 50 commands per tick, default snapshot cadence (10 snapshots). Assert bundle loads, `selfCheck()` passes, replay throughput is ≥ 5x recording throughput.
+- **Record → replay → state-equal.** Build a small scenario (10 entities, 1000 ticks, varied commands including accepted+rejected, multiple validators), record with `snapshotInterval: 100`, serialize the bundle, deserialize via `SessionReplayer.fromBundle`, call `openAt(N)` for representative ticks (initial, mid-segment, snapshot boundary, last tick), assert `world.serialize()` deep-equals the corresponding recorded snapshot.
+- **MemorySink ↔ FileSink parity.** Record the same scenario via both sinks; assert the resulting bundles are structurally equal modulo `attachments[].ref` (dataUrl vs sidecar). Replay both; assert identical openAt results.
+- **Scenario integration.** Convert an existing scenario test (e.g. one of the existing `runScenario(...)` tests) to also assert `scenarioCaptureToBundle(capture)` produces a valid bundle with one `kind: 'assertion'` marker per check outcome, matching `outcome.passed` and `outcome.failure`.
+- **Long capture smoke.** 10000-tick session with 50 commands per tick, default snapshot cadence (10 snapshots), `MemorySink`. Assert bundle loads, `selfCheck()` passes, `openAt` for any tick completes within reasonable time. Throughput target: `openAt()` walking a single segment runs ≥ 5x recording throughput; `selfCheck()` over N segments scales linearly. Drop the conflated multiplier.
+- **Cross-snapshot replay.** `openAt(tick)` where `tick` falls between two snapshots — verify the replayer correctly walks from the prior snapshot through recorded commands.
 
 ### 13.3 Self-check tests
 
-- **Determinism violation surfaced.** A test scenario deliberately violates the contract (a system calls `Math.random()`); record, then `selfCheck()`; assert the result reports a divergence with the expected `fromTick` / `toTick`.
-- **Determinism upheld.** A clean scenario; `selfCheck()` reports `ok: true` with `divergences: []`.
-- **`stopOnFirstDivergence`**: with deliberate violations at multiple snapshot pairs, with the option set, assert only the first is reported.
+Each clause of §11.1 (1–9) gets a paired test: clean scenario passes selfCheck; deliberately violating scenario surfaces a divergence in the expected category (state / event / execution).
+
+- **Clause 1: external-only mutation.** Clean: command-driven mutation only. Violation: a setup callback calls `world.setComponent` between ticks during a recording. Expect state divergence.
+- **Clause 2: no mid-tick submit.** Clean: systems do not submit. Violation: a system calls `world.submit()`. Expect command-stream / execution divergence on replay.
+- **Clause 3: routed randomness.** Clean: systems use `world.random()`. Violation: a system uses `Math.random()`. Expect state divergence.
+- **Clause 4: pure validators.** Clean: validators are pure. Violation: a validator calls `world.setComponent` (mutation side effect). Expect state divergence.
+- **Clause 5: no wall-clock.** Clean: systems use `world.tick`. Violation: a system uses `Date.now()`. Expect state divergence.
+- **Clause 6: ordered iteration.** Clean: Maps/arrays. Violation: a system iterates an unordered Set whose contents differ across runs. Expect state divergence.
+- **Clause 7: no env branching.** Clean: pure logic. Violation: a system reads `process.env`. Expect state divergence (or skip if env is identical, which is the common case).
+- **Clause 8: registration order.** Clean: factory matches recorder. Violation: factory swaps two system registration order. Expect state divergence at the affected tick.
+- **Clause 9: cross-major-version.** Skipped on identical-version environments. When run on differing Node majors, expects either pass (no transcendentals used) or graceful selfCheck divergence with a flagged tick.
+
+Plus:
+
+- **Determinism upheld** baseline: a clean scenario; `selfCheck()` reports `ok: true` with empty divergence arrays.
+- **`stopOnFirstDivergence`**: with deliberate violations at multiple snapshot pairs and the option set, assert only the first is reported.
+- **selfCheck includes initial-to-first-snapshot segment.** Recording where a determinism violation occurs in the first 100 ticks (before the first periodic snapshot at `snapshotInterval: 1000`) — selfCheck must surface it because the segment `(initialSnapshot, snapshots[0])` is checked.
+- **selfCheck on scenario bundles.** A scenario bundle has `snapshots: [final]` only; selfCheck checks `(initialSnapshot, final)` — exactly one segment.
 
 ### 13.4 Failure-mode tests
 
-- Sink write failure during recording: assert `SinkWriteError` thrown to caller; the bundle is left in `incomplete: true` state for `FileSink`.
-- Marker validation: every error code in §12 has at least one test triggering it.
-- Bundle version mismatch: replayer rejects with `BundleVersionError`.
+- **Sink write failure during recording.** Inject ENOSPC into `FileSink.writeTick`; recorder catches, sets `metadata.incomplete = true`, sink is closed, bundle is consumable as a prefix.
+- **Marker validation:** every error code in §12 has at least one test triggering it.
+- **Bundle version mismatch:** replayer rejects with `BundleVersionError` for `schemaVersion: 99`.
+- **Bundle range error:** `openAt(metadata.endTick + 1)` throws `BundleRangeError`.
+- **Replay across tick failure:** record a poisoned-tick scenario; `openAt(failureTick)` throws `BundleIntegrityError(code: 'replay_across_failure')`. Bundle still inspectable for ticks before the failure.
+- **Replay handler missing:** `worldFactory` registers a different command set than the recording; `openAt(N)` throws `ReplayHandlerMissingError` naming the missing command type.
+- **Engine version mismatch:** bundle with `engineVersion: '0.6.0'` against running 0.7.x — warning via `console.warn` (minor differs); cross-major (0.x → 1.x) throws `BundleVersionError`.
+- **Node version mismatch:** bundle with mismatched `nodeVersion` major — warning logged but replay proceeds; selfCheck catches actual divergences.
+
+### 13.5 CI gate (per N3 in iter-1 review)
+
+Every existing scenario in the engine test suite (under `tests/scenarios/`) is wrapped with `scenarioCaptureToBundle(capture)` followed by `replayer.selfCheck()`. selfCheck failures fail `npm test`. This converts the documented determinism contract into a gate enforced by the engine's existing scenario corpus, without strict-mode engine changes.
 
 ## 14. Documentation Surface
 
@@ -468,28 +642,32 @@ This spec lands the following doc updates per the `AGENTS.md` Documentation disc
 
 **Always-update:**
 
-- `docs/changelog.md` — new entry describing the SessionRecorder/SessionReplayer/SessionBundle/SessionSink/Marker public API additions and `ScenarioRunner.toBundle()` method.
+- `docs/changelog.md` — new entry describing the SessionRecorder/SessionReplayer/SessionBundle/SessionSink/SessionSource/Marker/RecordedCommand public API additions and the `scenarioCaptureToBundle()` adapter function.
 - `docs/devlog/summary.md` — one line per shipped commit (recorder/replayer/sink/scenario-integration likely ship as multiple commits on the chained branch).
 - `docs/devlog/detailed/<latest>.md` — full per-task entries.
 - `package.json` — version bumps per the per-commit policy in `AGENTS.md` (current version v0.7.6). All additions in this spec are additive and non-breaking, so each shipped commit gets a `c`-bump (e.g., v0.7.7 for the recorder commit, v0.7.8 for the replayer commit, and so on). No `b`-bump expected for this spec.
 
 **API surface:**
 
-- `docs/api-reference.md` — new top-level sections for `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`, `MemorySink`, `FileSink`, `Marker`, `MarkerKind`, `MarkerRefs`, `AttachmentDescriptor`, `SessionMetadata`, `SelfCheckResult`, `SelfCheckDivergence`, `SessionRecordingError` and subclasses.
+- `docs/api-reference.md` — new top-level sections for `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`, `SessionSource`, `MemorySink`, `FileSink`, `Marker`, `MarkerKind`, `MarkerProvenance`, `MarkerRefs`, `RecordedCommand`, `AttachmentDescriptor`, `SessionMetadata`, `SelfCheckOptions`, `SelfCheckResult`, `StateDivergence`, `EventDivergence`, `ExecutionDivergence`, `SessionRecordingError` and subclasses (`MarkerValidationError`, `RecorderClosedError`, `SinkWriteError`, `BundleVersionError`, `BundleRangeError`, `BundleIntegrityError`, `ReplayHandlerMissingError`); plus the `scenarioCaptureToBundle()` standalone function.
 - `README.md` — Feature Overview table row for "Session recording & replay"; Public Surface bullets for the new top-level exports.
 - `docs/README.md` — index link to the new `session-recording.md` guide.
 
 **Architectural:**
 
-- `docs/architecture/ARCHITECTURE.md` — Component Map rows for SessionRecorder/SessionReplayer/SessionBundle/SessionSink; Boundaries paragraph clarifying the dual-recorder structure (WorldHistoryRecorder = rolling debug; SessionRecorder = persistent archive).
+- `docs/architecture/ARCHITECTURE.md` — Component Map rows for SessionRecorder, SessionReplayer, SessionBundle, SessionSink/SessionSource; Boundaries paragraph clarifying the dual-recorder structure (WorldHistoryRecorder = rolling debug; SessionRecorder = persistent archive). Tick-lifecycle ASCII updated to show `submit()` interception by SessionRecorder when attached.
 - `docs/architecture/drift-log.md` — entry: dual recorders, motivation, alternatives considered.
 - `docs/architecture/decisions.md` — Key Architectural Decision row: "Approach 2 — separate SessionRecorder alongside WorldHistoryRecorder rather than extending in place" with the trade-offs.
 
-**Topical guides:**
+**Topical guides (mandatory updates per AGENTS.md "Update if applicable" rules):**
 
-- `docs/guides/session-recording.md` (new) — recording quickstart, sink choice, marker authoring, replay, self-check, determinism contract with concrete violation examples.
-- `docs/guides/scenario-runner.md` (existing) — new section on `toBundle()` and how scenario runs integrate with the broader recording surface.
-- `docs/guides/debugging.md` (existing) — pointer to the new session-recording guide for replay-based debugging.
+- `docs/guides/session-recording.md` (new) — recording quickstart, sink choice, marker authoring, replay, self-check, full §11 determinism contract with one concrete violation example per clause 1–9.
+- `docs/guides/scenario-runner.md` (existing) — new section on `scenarioCaptureToBundle()`, the `WorldHistoryRecorder` capacity caveat for replayable bundles, and how scenario runs integrate with the broader recording surface.
+- `docs/guides/debugging.md` (existing) — pointer to the new session-recording guide for replay-based debugging; expand the diagnostic flow to include "load bundle → jump to marker → step forward."
+- `docs/guides/concepts.md` (existing) — add `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`/`SessionSource` to the standalone-utilities list; tick-lifecycle ASCII updated to show `submit()` interception by recorder when attached.
+- `docs/guides/ai-integration.md` (existing) — add a section on session recording as the foundation of AI-driven debugging: agent loads bundle, queries markers, opens at any tick, inspects state programmatically. This entire feature is the substrate of the AI-first roadmap; the guide must reflect it.
+- `docs/guides/getting-started.md` (existing) — add session-recording to the tutorial-grade feature list; brief example of `new SessionRecorder({ world })` → run → `toBundle()`.
+- `docs/guides/building-a-game.md` (existing) — add a "Recording sessions for debugging" section covering when to record, how to plug into game code, and how to share bundles with agents/teammates.
 
 **Doc-review verification:**
 
@@ -511,13 +689,13 @@ This spec lands the following doc updates per the `AGENTS.md` Documentation disc
 
 **Consequences:**
 
-- ~30 LOC of listener-wiring duplication between the two recorders. Acceptable.
-- Both recorders can attach to the same `World` simultaneously without interference.
+- ~80–100 LOC of structurally similar listener wiring (`onDiff`, `onCommandResult`, `onCommandExecution`, `onTickFailure`) plus per-tick `getEvents()`/`getMetrics()` collection plus `cloneJsonValue` discipline. Acceptable in v1; flagged honestly so the future "extract `TickStream` when third consumer materializes" trigger isn't gated on a wrong cost basis.
+- Both recorders can attach to the same `World` simultaneously without interference (each subscribes independently and chains the `submit()` wrap).
 - Future synthetic playtest spec will likely use `SessionRecorder` directly, not `WorldHistoryRecorder`.
 
 ### ADR 2: Bundle format as a first-class shared type, not a recorder-private shape
 
-**Decision:** `SessionBundle` is exported and shared between `SessionRecorder.toBundle()` and `ScenarioRunner.toBundle()`. The replayer accepts `SessionBundle` regardless of producer.
+**Decision:** `SessionBundle` is exported as a strict-JSON shared type and is identical regardless of producer. Both `SessionRecorder.toBundle()` and `scenarioCaptureToBundle()` emit the same shape; `MemorySink.toBundle()` and `FileSink.toBundle()` produce structurally equal bundles modulo `attachments[].ref` (dataUrl vs sidecar). Sidecar binary payloads live outside the JSON shape and are accessed via `source.readSidecar(id)`. The replayer accepts `SessionBundle` regardless of producer.
 
 **Context:** Recording sessions and running scenarios both produce "a deterministic timeline with markers." Forcing two formats would require the replayer/viewer to handle both, doubling validation surface and confusing consumers.
 
@@ -540,18 +718,42 @@ This spec lands the following doc updates per the `AGENTS.md` Documentation disc
 
 **Consequences:**
 
-- Replay can silently produce wrong state if user violates the contract and never runs `selfCheck()`. Mitigated by guide docs and recommending self-check in CI.
+- Replay can silently produce wrong state if user violates the contract and never runs `selfCheck()`. Mitigated by §13.5 CI gate (every existing scenario runs through selfCheck on every `npm test`).
 - Strict mode can land later as a focused spec without affecting the recorder/replayer API.
 
+### ADR 4: `worldFactory` is part of the determinism contract
+
+**Decision:** The `worldFactory` callback supplied to `SessionReplayer` is part of the determinism contract. Drift between record-time setup and replay-time `worldFactory` produces selfCheck divergences indistinguishable from genuine determinism violations in user code.
+
+**Context:** Bundle replay requires reconstructing the recording-time component / validator / handler / system registration set, in the same order, before deserializing the snapshot. None of these can be serialized into the bundle (functions are not JSON-compatible). The factory is the only mechanism for the replayer to obtain a `World` whose registration matches the recording.
+
+**Implications:**
+
+- The factory must reproduce *exactly* the same `registerComponent` / `registerValidator` / `registerHandler` / `registerSystem` calls in the same order as the recording-time setup.
+- Missing or extra registration is silently treated as a selfCheck divergence ("user code is non-deterministic") rather than as a clear "factory drift" error. This is a real ergonomic floor.
+- For the spec's stated goal of agent-driven debugging, a consumer who lacks access to the original codebase cannot replay a bundle. There is no "load and look at marker N" affordance without the factory.
+
+**Mitigations in v1:**
+
+- §11.1 clause 8 documents the factory obligation explicitly.
+- `ReplayHandlerMissingError` (§12) distinguishes "world factory drift on a known command type" from generic determinism divergence.
+- Recommended pattern: scenario authors and game projects export their setup function so it can be re-imported by replay code.
+
+**Future enhancement (out of scope for v1):**
+
+A future spec may persist a registration manifest in the bundle (component names + ordering, validator names, handler names, system names + ordering) so the replayer can fail fast with a clear "factory drift" diagnostic when a name doesn't match. This is shape-of-graph validation only — the factory still supplies behavior; the manifest just verifies the *shape* matches.
+
 ## 16. Open Questions / Deferred Decisions
 
 The following are intentionally left for the writing-plans phase or for future specs. They are not blocking spec acceptance.
 
-1. **Snapshot equality algorithm.** §9.3 calls for a fast deep-equal with best-effort `firstDifferingPath`. Concrete algorithm (recursive walk vs canonical-JSON hash + targeted diff) chosen during implementation. JSON-canonical hashing is appealing for speed but loses the path-of-first-divergence information. Implementation will likely use recursive walk with short-circuit; benchmark on the long-capture smoke test will validate throughput target.
+1. **Snapshot equality algorithm.** §9.3 commits to recursive walk + short-circuit (the alternative — canonical-JSON hash — loses `firstDifferingPath`). Snapshot key ordering is stable per the snapshot serialization invariant (Map insertion order), so deep-equal need not canonicalize. Benchmark on the long-capture smoke test will validate throughput target.
 2. **Versioning policy for breaking bundle changes.** When `schemaVersion` bumps to 2, do we ship a migrator (`migrate(bundle, fromVersion, toVersion)`) or simply reject older versions? Decision deferred to the first time a bump is needed.
 3. **Default `snapshotInterval` of 1000.** Validated by the long-capture smoke test in §13.2. May be tuned based on representative bundle sizes.
-4. **Async vs sync sink methods.** §8 declares both; the recorder awaits sink calls so both work. Whether to expose the sync/async distinction in the type system (`SyncSessionSink` vs `AsyncSessionSink` brand types) is an implementation-phase decision.
-5. **`ReplayerConfig.worldFactory` ergonomics.** Requiring callers to provide a factory that re-registers components/validators/handlers/systems is necessary because those can't be serialized. The spec doesn't define a higher-level helper that captures factory output for re-use; that's a candidate quality-of-life addition in a follow-up.
+4. **`ReplayerConfig.worldFactory` ergonomics.** Per ADR 4, the factory is part of the determinism contract. A future spec may add a registration-manifest shape-check to surface factory drift with a clearer diagnostic; not v1.
+5. **Bundle command/execution/marker stream sharding.** A 10000-tick × 50-command-per-tick session produces 500K command entries; `commands.jsonl` would be hundreds of MB. v1 ships single-file streams; future enhancement may rotate at a configurable size threshold (e.g. `commands.0001.jsonl`, `commands.0002.jsonl`). Manifest already references streams by filename, so adding rotation is non-breaking.
+6. **`captureCommandPayloads` flag on `WorldHistoryRecorder`.** §10 calls for `WorldHistoryRecorder` to optionally capture `RecordedCommand` (with payload) instead of just `CommandSubmissionResult` so scenario-derived bundles can be replayable without a separate `SessionRecorder`. This is a minor additive change to `WorldHistoryRecorder`'s constructor — implement during the spec build-out. Alternative: `runScenario` accepts a `bundle?: SessionRecorder` option that does the dual-recording. Final decision in implementation phase.
+7. **`BufferedSink` proxy.** A future enhancement that wraps any `SessionSink` and batches writes asynchronously to mitigate tick-rate impact for production captures. Not v1 because it requires either an explicit drain policy (write-on-tick-boundary, write-on-marker, max-buffer-size) or a complete async-aware listener restructure. Worth specifying when synthetic playtest needs it.
 
 ## 17. Future Specs (Backlog)
 
@@ -574,11 +776,12 @@ Vision and rationale for the full backlog are in `docs/design/ai-first-dev-roadm
 
 This spec is implemented when:
 
-- All five new symbols (`SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`, `Marker`) are exported from `src/index.ts` with full TypeScript types.
-- `MemorySink` and `FileSink` ship as concrete implementations.
-- `ScenarioRunner.toBundle()` is added and produces replayable bundles with assertion markers.
+- All six new symbols (`SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`/`SessionSource`, `Marker`, `RecordedCommand`) are exported from `src/index.ts` with full TypeScript types, plus the `scenarioCaptureToBundle()` function.
+- `MemorySink` (implementing `SessionSink & SessionSource`) and `FileSink` (implementing `SessionSink & SessionSource`) ship as concrete implementations.
+- `scenarioCaptureToBundle()` is added and produces replayable bundles with `provenance: 'engine'` assertion markers, given a scenario configured to capture command payloads.
 - §13 test coverage is in place; all four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
-- `selfCheck()` correctly identifies a deliberately introduced determinism violation in a smoke test.
+- `selfCheck()` correctly identifies deliberately introduced determinism violations across each clause of §11.1.
+- §13.5 CI gate is wired: every existing scenario in the engine test suite passes selfCheck during `npm test`.
 - All §14 doc updates land in the same merge.
-- A multi-CLI code review (Codex / Gemini / Opus) reaches consensus per `AGENTS.md`.
+- A multi-CLI code review (Codex / Gemini / Opus) reaches consensus per `AGENTS.md`. Two-CLI consensus is acceptable when one CLI is unreachable (quota exhaustion, model rejection).
 - The branch is rebase-clean against `main` and ready to merge on user authorization.
