commit e59d8c7aeebf589fe6023a40eab8875c96d9b5fb
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Sun Apr 26 23:43:39 2026 -0700

    docs(design): session recording & replay spec + AI-first roadmap
    
    Drafts two new design docs:
    
    - 2026-04-26-session-recording-and-replay-design.md — engine-level spec
      for SessionRecorder/SessionReplayer/SessionBundle/SessionSink/Marker
      primitives plus ScenarioRunner.toBundle() integration. Scope B:
      engine-only; game UI, viewer, synthetic playtest, counterfactual
      replay, and strict-mode enforcement deferred to follow-up specs.
    
    - ai-first-dev-roadmap.md — living roadmap of nine specs across three
      tiers covering the full AI-first game-dev environment vision (recording,
      synthetic playtest, behavioral metrics, viewer, annotation UI, counter-
      factual replay, strict-mode, corpus index, AI playtester). Captures
      dependencies and suggested build order so the broader plan is not lost
      while a single spec is in flight.
    
    No code changes; design phase only. Implementation plan to follow.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

 ...26-04-26-session-recording-and-replay-design.md | 584 +++++++++++++++++++++
 docs/design/ai-first-dev-roadmap.md                | 170 ++++++
 2 files changed, 754 insertions(+)

---

commit e59d8c7aeebf589fe6023a40eab8875c96d9b5fb
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Sun Apr 26 23:43:39 2026 -0700

    docs(design): session recording & replay spec + AI-first roadmap
    
    Drafts two new design docs:
    
    - 2026-04-26-session-recording-and-replay-design.md — engine-level spec
      for SessionRecorder/SessionReplayer/SessionBundle/SessionSink/Marker
      primitives plus ScenarioRunner.toBundle() integration. Scope B:
      engine-only; game UI, viewer, synthetic playtest, counterfactual
      replay, and strict-mode enforcement deferred to follow-up specs.
    
    - ai-first-dev-roadmap.md — living roadmap of nine specs across three
      tiers covering the full AI-first game-dev environment vision (recording,
      synthetic playtest, behavioral metrics, viewer, annotation UI, counter-
      factual replay, strict-mode, corpus index, AI playtester). Captures
      dependencies and suggested build order so the broader plan is not lost
      while a single spec is in flight.
    
    No code changes; design phase only. Implementation plan to follow.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/docs/design/2026-04-26-session-recording-and-replay-design.md b/docs/design/2026-04-26-session-recording-and-replay-design.md
new file mode 100644
index 0000000..5b111e9
--- /dev/null
+++ b/docs/design/2026-04-26-session-recording-and-replay-design.md
@@ -0,0 +1,584 @@
+# Session Recording & Replay — Design Spec
+
+**Status:** Draft (2026-04-26). Accepted for implementation pending review of this document.
+
+**Scope:** Engine-level primitives only (Scope B from brainstorming). Game-side annotation UI, standalone viewer, synthetic playtest harness, counterfactual replay, and strict-mode determinism enforcement are explicitly out of scope and tracked in `docs/design/ai-first-dev-roadmap.md`.
+
+**Author:** civ-engine team
+
+**Related primitives:** `WorldHistoryRecorder`, `ScenarioRunner`, `WorldSnapshot`, `TickDiff`, `EventBus`, `CommandQueue`, `world.random()`.
+
+## 1. Goals
+
+This spec defines engine-level primitives that:
+
+- Capture a complete, deterministic, replayable record of any `World` run as a portable `SessionBundle`.
+- Allow any consumer (agent, human, debugger, CI) to load a bundle, jump to any tick, inspect state, step forward, and verify replay integrity.
+- Unify session bundles with scenario test runs so a single bundle format and a single replayer serve both live captures and programmatic test runs.
+- Provide a sink interface so bundles can stream to memory or disk (or future blob stores) without changes to the recorder API.
+- Support player-authored markers (annotations) and programmatic markers (assertions, checkpoints) with structured engine-validated references plus opaque game-defined payload.
+
+The deliverable is an opt-in API surface; existing engine consumers see no behavioral change.
+
+## 2. Non-Goals
+
+The following are deliberately excluded from this spec to keep it focused:
+
+- **Game-side annotation UI.** The hotkey, drawing tools, screenshot capture, and gesture-to-ref resolution all belong to game code. This spec only defines the marker schema the engine accepts.
+- **Standalone viewer.** A future spec will define a bundle scrubber, timeline UI, and agent-driven query API.
+- **Synthetic playtest harness.** A future spec will define an agent or scripted policy that drives `world.submit()` and produces bundles autonomously.
+- **Counterfactual replay (forking).** Substituting inputs at tick N and replaying forward to observe divergence is high-value but architecturally distinct; future spec.
+- **Strict-mode determinism enforcement.** Adding a `World({ strict: true })` flag that rejects mutations outside system phases is a parallel engine-wide change with its own design problem; future spec. This spec only documents the determinism contract and provides a `selfCheck()` to surface violations.
+- **Bundle search / corpus index, behavioral metrics, AI playtester.** Tier-2 capabilities that depend on the synthetic playtest spec landing first.
+
+## 3. Background
+
+The engine already has most of the substrate this spec needs. Relevant existing primitives:
+
+- **`WorldHistoryRecorder`** (`src/history-recorder.ts:87`). Listener-based recorder with bounded rolling buffer (default capacity 64 ticks). Captures initial snapshot, per-tick `diff`/`events`/`metrics`/`debug`, command submissions, command executions, tick failures. Continues to serve runtime debugging unchanged. This spec adds a sibling primitive rather than extending it (see ADR in §15).
+- **`ScenarioRunner`** (`src/scenario-runner.ts`). Already wraps `WorldHistoryRecorder` and produces `ScenarioCapture` with snapshot + history + debug + metrics + diff + events. This spec adds a `toBundle()` adapter that translates `ScenarioCapture` into the new `SessionBundle` format with `kind: 'assertion'` markers for each scenario check.
+- **`WorldSnapshot v5`** (`src/serializer.ts`). Round-trips full deterministic state including seeded RNG, runtime config, and per-component `ComponentStoreOptions`. Sufficient as the snapshot type carried in bundles.
+- **`world.submit()`** (`src/world.ts`). Single typed input boundary for player intent. Already enforced as the only ingress for command-shaped state changes during normal operation.
+- **`world.random()`**. Engine-owned seeded RNG. Already part of snapshot v3+. Routing all randomness through this is the basis of replay determinism.
+
+## 4. Architecture Overview
+
+Five new symbols, plus one method on an existing symbol:
+
+| Component              | Status            | Responsibility                                                                                      |
+| ---------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
+| `SessionRecorder`      | new (`src/session-recorder.ts`) | Subscribes to a live `World`, captures inputs/diffs/events/markers/snapshots, emits to a `SessionSink`. |
+| `SessionReplayer`      | new (`src/session-replayer.ts`) | Loads a bundle (or sink); opens a paused `World` at any tick; runs replay self-check.                |
+| `SessionBundle`        | new (in `src/session-bundle.ts`) | Versioned JSON-compatible archive type; shared by `SessionRecorder.toBundle()` and `ScenarioRunner.toBundle()`. |
+| `SessionSink`          | new (in `src/session-sink.ts`) | Persistence interface plus `MemorySink` (default) and `FileSink` (JSONL + sidecar attachments).      |
+| `Marker`               | new (in `src/session-bundle.ts`) | `{ tick, kind, text?, refs?, data?, attachments? }` with closed `kind` enum.                         |
+| `ScenarioRunner.toBundle()` | new method on existing class | Translates `ScenarioCapture` → `SessionBundle` with `sourceKind: 'scenario'` and `assertion` markers. |
+
+`WorldHistoryRecorder` is unchanged. The two recorders coexist with distinct purposes (rolling debug buffer vs persistent archive).
+
+```
+                  ┌────────────────────────────────────┐
+                  │                World               │
+                  └─┬────────────────────────────────┬─┘
+                    │ onDiff / onCommandResult / ... │
+        ┌───────────┴────────────┐         ┌─────────┴──────────┐
+        │ WorldHistoryRecorder   │         │ SessionRecorder    │
+        │ (rolling, in-memory)   │         │ (full, sink-based) │
+        │ [unchanged]            │         │ [new]              │
+        └───────────┬────────────┘         └────────┬───────────┘
+                    │                               │
+                    │                       ┌───────┴──────────┐
+            ScenarioRunner.toBundle()       │   SessionSink    │
+                    │                       │ (Memory | File)  │
+                    └────────►┌─────────────┴──────────────────┴─────────────►
+                              │           SessionBundle                       │
+                              │ (canonical archive; identical for both paths) │
+                              └─────────────┬─────────────────────────────────┘
+                                            │
+                                            ▼
+                                   ┌────────────────────┐
+                                   │  SessionReplayer   │
+                                   │   .openAt(tick)    │
+                                   │   .selfCheck()     │
+                                   └────────┬───────────┘
+                                            ▼
+                                   ┌────────────────────┐
+                                   │   paused World     │
+                                   │ (deserialized +    │
+                                   │  replayed forward) │
+                                   └────────────────────┘
+```
+
+## 5. Bundle Format
+
+### 5.1 In-memory shape
+
+```ts
+interface SessionBundle<TEventMap, TCommandMap, TDebug = JsonValue> {
+  schemaVersion: 1;
+  metadata: SessionMetadata;
+  initialSnapshot: WorldSnapshot;
+  ticks: SessionTickEntry<TEventMap, TDebug>[];
+  commands: CommandSubmissionResult<keyof TCommandMap>[];
+  executions: CommandExecutionResult<keyof TCommandMap>[];
+  failures: TickFailure[];
+  snapshots: SessionSnapshotEntry[];
+  markers: Marker[];
+  attachments: AttachmentDescriptor[];
+}
+
+interface SessionMetadata {
+  sessionId: string;            // UUID v4 generated at recorder.connect()
+  engineVersion: string;        // package.json version at capture time
+  recordedAt: string;           // ISO 8601 timestamp
+  durationTicks: number;        // tick count from initial to final snapshot inclusive
+  startTick: number;            // tick at recorder.connect()
+  endTick: number;              // tick at recorder.disconnect() or toBundle()
+  sourceKind: 'session' | 'scenario';
+  sourceLabel?: string;         // optional human label (scenario name, session label)
+}
+
+interface SessionTickEntry<TEventMap, TDebug> {
+  tick: number;
+  diff: TickDiff;
+  events: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
+  metrics: WorldMetrics | null;
+  debug: TDebug | null;
+}
+
+interface SessionSnapshotEntry {
+  tick: number;
+  snapshot: WorldSnapshot;
+}
+
+interface AttachmentDescriptor {
+  id: string;                   // UUID v4
+  mime: string;                 // e.g. 'image/png'
+  sizeBytes: number;
+  ref: 'inline' | 'sidecar' | { dataUrl: string };
+  // 'inline'   → bytes embedded in bundle.attachmentsInline (in-memory only)
+  // 'sidecar'  → bytes live in sink-specific external storage (FileSink: attachments/<id>.<ext>)
+  // dataUrl    → small attachments embedded as base64 data URLs (max 64 KiB)
+}
+```
+
+`Marker` is defined in §6.
+
+For an in-memory bundle produced by `MemorySink`, attachments default to `'inline'` and the bundle additionally carries an `attachmentsInline: Map<string, Uint8Array>` field that is *not* part of the JSON-serializable shape — it is serialized lazily on `toBundle()` to either inline data URLs (if under threshold) or written to the sink as sidecar files (FileSink only).
+
+### 5.2 On-disk layout (FileSink)
+
+```
+<bundleDir>/
+  manifest.json           # SessionBundle minus ticks (which live in JSONL) and attachment payloads
+  ticks.jsonl             # one SessionTickEntry per line, ordered by tick
+  snapshots/
+    <tick>.json           # one WorldSnapshot per recorded snapshot
+  attachments/
+    <id>.<ext>            # binary blobs, ext inferred from mime
+```
+
+`manifest.json` references snapshots by tick and attachments by id; `ticks.jsonl` is streamed during recording and read line-by-line during replay.
+
+`SessionReplayer.fromSink(fileSink)` reads `manifest.json` eagerly, then streams `ticks.jsonl` lazily; it does not load all snapshots into memory until requested.
+
+### 5.3 Versioning
+
+`schemaVersion: 1` is the initial format. Loaders MUST accept the version they were built against; mismatched versions throw `BundleVersionError` with the bundle's version and the loader's expected version. Migration is out of scope for v1; future bumps will document migration policy at that time.
+
+## 6. Marker Schema
+
+```ts
+type MarkerKind = 'annotation' | 'assertion' | 'checkpoint';
+
+interface Marker {
+  id: string;                    // UUID v4
+  tick: number;                  // engine tick the marker references; >= 0
+  kind: MarkerKind;
+  text?: string;                 // free-form human description
+  refs?: MarkerRefs;             // engine-validated structured references
+  data?: JsonValue;              // opaque game-defined payload
+  attachments?: string[];        // attachment ids referenced by this marker
+  createdAt?: string;            // ISO 8601 timestamp; recorder fills in if omitted
+}
+
+interface MarkerRefs {
+  entities?: EntityId[];                        // must be alive at marker.tick
+  cells?: Position[];                           // must be in-bounds for the world's grid
+  tickRange?: { from: number; to: number };     // both >= 0; from <= to; to <= bundle endTick
+}
+```
+
+### 6.1 Validation rules
+
+`SessionRecorder.addMarker()` validates a marker before storing it:
+
+- `tick` must be `>= 0` and `<= world.tick`. Markers cannot point to the future.
+- `refs.entities`: every id must be alive in the engine's `EntityManager` at `marker.tick`. Liveness check uses the most recent snapshot at or before `marker.tick` plus subsequent diffs (or the live world if `tick === world.tick`). Dead or never-existed ids throw `MarkerValidationError`.
+- `refs.cells`: every cell must be within the world's configured bounds. Out-of-bounds cells throw `MarkerValidationError`.
+- `refs.tickRange`: `from` and `to` must satisfy `0 <= from <= to`. The recorder does not require `to <= world.tick` because tick ranges may extend slightly past current tick if the player is annotating an in-flight event; replay validates `to` against bundle `endTick` instead.
+- `kind: 'assertion'` markers are produced only by `ScenarioRunner.toBundle()`. User code calling `recorder.addMarker({ kind: 'assertion', ... })` succeeds but is discouraged; `ScenarioRunner` is the canonical producer.
+- `data` is validated as JSON-compatible via the existing `assertJsonCompatible` helper.
+- `attachments` ids must reference attachments registered via `recorder.attach()`.
+
+Invalid markers throw `MarkerValidationError` with a structured `details` field naming the offending field. The recorder does not silently drop or coerce markers.
+
+## 7. SessionRecorder API
+
+```ts
+class SessionRecorder<TEventMap, TCommandMap, TDebug = JsonValue> {
+  constructor(config: {
+    world: World<TEventMap, TCommandMap>;
+    sink?: SessionSink;                       // default: new MemorySink()
+    snapshotInterval?: number | null;         // default: 1000; null disables periodic snapshots
+    captureInitialSnapshot?: boolean;         // default: true
+    debug?: { capture(): TDebug | null };
+    sourceLabel?: string;                     // optional metadata field
+  });
+
+  readonly sessionId: string;                 // generated at construction
+  readonly tickCount: number;                 // number of recorded ticks
+  readonly markerCount: number;
+  readonly snapshotCount: number;             // counts initial + periodic + manual
+  readonly isConnected: boolean;
+
+  connect(): void;                            // hook listeners; capture initial snapshot; sink.open()
+  disconnect(): void;                         // unhook listeners; sink.close()
+
+  addMarker(marker: NewMarker): MarkerId;     // tick defaults to world.tick if omitted
+  attach(blob: { mime: string; data: Uint8Array }): AttachmentId;
+  takeSnapshot(): SessionSnapshotEntry;       // manual snapshot at current tick
+
+  toBundle(): SessionBundle<TEventMap, TCommandMap, TDebug>;
+}
+
+type NewMarker = Omit<Marker, 'id' | 'createdAt'> & { tick?: number };
+type MarkerId = string;
+type AttachmentId = string;
+```
+
+### 7.1 Recorder lifecycle
+
+1. **Construction.** Generates `sessionId`, validates config, prepares (does not subscribe).
+2. **`connect()`.** Calls `sink.open(metadata)`. If `captureInitialSnapshot`, calls `world.serialize({ inspectPoisoned: true })` and writes the initial snapshot via `sink.writeSnapshot()`. Subscribes to `world.onDiff`, `world.onCommandResult`, `world.onCommandExecution`, `world.onTickFailure`. Subsequent ticks emit live to the sink. Calling `connect()` while already connected is a no-op.
+3. **Per-tick capture.** On each `onDiff`, the recorder builds a `SessionTickEntry` (clones via existing `cloneJsonValue` discipline), writes to sink, and if `world.tick % snapshotInterval === 0`, calls `world.serialize()` and writes a snapshot.
+4. **Marker / attachment additions.** Validated, written to sink incrementally so streaming sinks see them in order.
+5. **`disconnect()`.** Unhooks all listeners, calls `sink.close()`. After disconnect, `addMarker` and `takeSnapshot` throw `RecorderClosedError`.
+6. **`toBundle()`.** Returns the canonical in-memory `SessionBundle`. May be called before or after `disconnect()`. For `FileSink`, `toBundle()` requires the sink to be closed and reads back from disk.
+
+### 7.2 Failure modes
+
+- World poisoned at `connect()` time: recorder still records the failure-state initial snapshot (`inspectPoisoned: true`); subsequent failed ticks are captured via `onTickFailure`. Recording does not fail because the world is poisoned.
+- Sink write failure: throws `SinkWriteError` synchronously to the listener. The recorder does not auto-retry. Behavior on a partially written bundle is sink-defined (FileSink leaves a `manifest.json` with a `incomplete: true` flag).
+- World destroyed while connected: recorder's listeners are unhooked but `sink.close()` is not automatically called. Caller must call `disconnect()` to finalize. Future enhancement: auto-finalize on world destruction.
+
+## 8. SessionSink Interface
+
+```ts
+interface SessionSink {
+  open(metadata: SessionMetadata): void | Promise<void>;
+  writeTick(entry: SessionTickEntry): void | Promise<void>;
+  writeCommandSubmission(result: CommandSubmissionResult): void | Promise<void>;
+  writeCommandExecution(result: CommandExecutionResult): void | Promise<void>;
+  writeTickFailure(failure: TickFailure): void | Promise<void>;
+  writeSnapshot(entry: SessionSnapshotEntry): void | Promise<void>;
+  writeMarker(marker: Marker): void | Promise<void>;
+  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): void | Promise<void>;
+  close(): void | Promise<void>;
+  toBundle(): SessionBundle | Promise<SessionBundle>;  // required: finalize and return canonical shape
+}
+```
+
+V1 ships two implementations:
+
+- **`MemorySink`** (default). Holds everything in memory; `toBundle()` returns a synchronous in-memory `SessionBundle`. Synchronous methods throughout. Suitable for short captures and tests.
+- **`FileSink`**. Streams ticks to `ticks.jsonl`, snapshots to `snapshots/<tick>.json`, attachments to `attachments/<id>.<ext>`, and writes `manifest.json` on `close()`. Asynchronous methods (returns `Promise`). Suitable for long captures and synthetic playtest (future spec).
+
+The recorder's listener wiring tolerates both sync and async sinks: it `await`s every sink call. For `MemorySink` (sync), the await is a no-op. For `FileSink`, backpressure is the sink's responsibility; if disk is slow, the engine's tick rate can be affected — caller's choice.
+
+Future sinks (out of scope but the interface accommodates): `BlobStoreSink`, `S3Sink`, `IndexedDBSink` (browser).
+
+## 9. SessionReplayer API
+
+```ts
+class SessionReplayer<TEventMap, TCommandMap, TDebug = JsonValue> {
+  static fromBundle<TEventMap, TCommandMap, TDebug>(
+    bundle: SessionBundle<TEventMap, TCommandMap, TDebug>,
+    config: ReplayerConfig<TEventMap, TCommandMap>,
+  ): SessionReplayer<TEventMap, TCommandMap, TDebug>;
+
+  static fromSink<TEventMap, TCommandMap, TDebug>(
+    sink: SessionSink,
+    config: ReplayerConfig<TEventMap, TCommandMap>,
+  ): Promise<SessionReplayer<TEventMap, TCommandMap, TDebug>>;
+
+  readonly metadata: SessionMetadata;
+  readonly markerCount: number;
+
+  markers(): Marker[];
+  markersAt(tick: number): Marker[];
+  markersOfKind(kind: MarkerKind): Marker[];
+  markersByEntity(id: EntityId): Marker[];
+
+  snapshotTicks(): number[];
+  ticks(): number[];
+
+  openAt(tick: number): World<TEventMap, TCommandMap>;
+  stateAtTick(tick: number): WorldSnapshot;
+  eventsBetween(fromTick: number, toTick: number): SessionTickEntry<TEventMap, TDebug>[];
+
+  selfCheck(options?: { stopOnFirstDivergence?: boolean }): SelfCheckResult;
+}
+
+interface ReplayerConfig<TEventMap, TCommandMap> {
+  // Same world-construction config the original recording used.
+  // The replayer needs registered components, validators, handlers, and systems
+  // to reconstruct an equivalent World. Caller supplies a factory.
+  worldFactory: (snapshot: WorldSnapshot) => World<TEventMap, TCommandMap>;
+}
+
+interface SelfCheckResult {
+  ok: boolean;
+  checkedSnapshotPairs: number;
+  divergences: SelfCheckDivergence[];
+}
+
+interface SelfCheckDivergence {
+  fromTick: number;            // snapshot we replayed from
+  toTick: number;              // snapshot we expected to match
+  expected: WorldSnapshot;     // the recorded snapshot
+  actual: WorldSnapshot;       // the snapshot produced by replay
+  firstDifferingPath?: string; // best-effort dotted path into the snapshot, e.g. "components.position[42].x"
+}
+```
+
+### 9.1 `openAt(tick)` semantics
+
+1. Find the latest snapshot in the bundle with `snapshot.tick <= tick`. If none, use `bundle.initialSnapshot`.
+2. Use the supplied `worldFactory` to construct a fresh `World` from that snapshot.
+3. Replay forward tick by tick. For each tick `t` from `snapshot.tick + 1` to `tick` inclusive: drain every recorded `CommandSubmissionResult` from `bundle.commands` whose submission tick equals `t` and call `world.submit()` with the original `type` and `data`, then call `world.step()`. Commands are replayed regardless of original acceptance — the engine's validators run again and produce the same outcome given the same state. This faithfully reproduces both accepted and rejected submissions.
+4. Return the resulting `World` in a paused state.
+
+The returned `World` is fully functional — caller can step further, inspect state, query events. This is the agent's primary debugging affordance.
+
+### 9.2 Replay determinism guarantee
+
+`openAt(tick)` is deterministic given the same `worldFactory` and the same engine version. If the bundle's recorded snapshot at `tick` exists, replay produces a snapshot equal to it at every JSON path. Divergence indicates a determinism bug in user code (commands, systems, components, state management) — the contract in §11 was violated.
+
+The replayer does not silently mask divergence; `selfCheck()` is the explicit verification path.
+
+### 9.3 `selfCheck()` algorithm
+
+```
+For each consecutive pair (snapshotA, snapshotB) in bundle.snapshots:
+  worldA = worldFactory(snapshotA.snapshot)
+  for each tick in (snapshotA.tick, snapshotB.tick]:
+    apply recorded commands at this tick via worldA.submit()
+    worldA.step()
+  actualB = worldA.serialize()
+  if not deepEqual(actualB, snapshotB.snapshot):
+    record SelfCheckDivergence{ fromTick: snapshotA.tick, toTick: snapshotB.tick, ... }
+    if stopOnFirstDivergence: break
+```
+
+Equality uses a fast deep-equal that walks both objects and short-circuits on first mismatch. `firstDifferingPath` is a best-effort dotted path returned by the deep-equal helper for triage. Equality is structural, not referential; the comparison is on two structurally-equivalent `WorldSnapshot` JSON objects.
+
+## 10. ScenarioRunner Integration
+
+`ScenarioRunner` gains one new method:
+
+```ts
+class ScenarioRunner<TEventMap, TCommandMap> {
+  // ... existing API unchanged
+
+  toBundle(): SessionBundle<TEventMap, TCommandMap, WorldDebugSnapshot>;
+}
+```
+
+The implementation translates the in-memory `ScenarioCapture` into a `SessionBundle`:
+
+- `metadata.sourceKind = 'scenario'`, `metadata.sourceLabel = scenario.name`.
+- `initialSnapshot` ← the snapshot ScenarioRunner already captures at setup.
+- `ticks` ← `ScenarioCapture.history.ticks`.
+- `commands`/`executions`/`failures` ← `ScenarioCapture.history.commands`/etc.
+- `snapshots` ← `[{ tick: capture.tick, snapshot: capture.snapshot }]` (scenario captures one final snapshot; future enhancement could add periodic snapshots if a scenario opts in).
+- `markers` ← one `{ kind: 'assertion', tick: <check.tick>, text: check.name, data: { passed, failure } }` per scenario check outcome. The tick used is the tick the check ran at, which `ScenarioRunner` already tracks.
+- `attachments` ← empty in v1; scenarios have no attachment producer.
+
+`ScenarioCapture` itself is unchanged; existing consumers continue to work.
+
+`ScenarioRunner.toBundle()` does not require `SessionRecorder`; it operates on the data ScenarioRunner already has.
+
+## 11. Determinism Contract
+
+### 11.1 User obligations
+
+For replay to produce the same state as recording, user code MUST:
+
+1. **Route all input through `world.submit()`.** Mutations made via `world.setComponent`, `world.setPosition`, `world.setState`, `world.addResource`, etc. are valid only inside a registered system (executed during `world.step()`). External code outside a system phase MUST submit a command and let the registered handler perform the mutation. Direct external mutation breaks replay because the recorder only captures commands, not direct mutation calls.
+
+2. **Route all randomness through `world.random()`.** `Math.random()`, `crypto.getRandomValues()`, or any non-engine RNG produces values not captured by the snapshot's RNG state and therefore not reproducible during replay.
+
+3. **Avoid wall-clock time inside systems.** `Date.now()`, `performance.now()`, or any external time source is non-deterministic across machines and runs. The canonical clock is `world.tick`; if a system needs simulated time, multiply the tick by a fixed `tickDurationMs` from world config.
+
+4. **Iterate ordered collections only.** `Map` (insertion-ordered) and arrays are safe. `Set` is insertion-ordered for primitive keys but order can shift if elements are removed and re-added; prefer `Map<key, true>` for sets that drive simulation. Object key iteration is engine-version-dependent and SHOULD be avoided.
+
+5. **No environment-driven branching.** No `process.env`, `globalThis`, browser APIs, file system reads, or network calls inside a tick.
+
+The engine does NOT enforce these obligations in v1. Strict-mode enforcement is a future spec. This spec relies on the replay self-check to surface violations.
+
+### 11.2 Replay self-check
+
+`SessionReplayer.selfCheck()` is the verification mechanism. If recording violates the contract, replay diverges from the recorded snapshot at the first affected tick after the violation, and `selfCheck()` reports the divergence with `firstDifferingPath` for triage.
+
+`selfCheck()` is recommended after every recording in CI-like contexts; for live captures, the cost (deserialize + replay between every snapshot pair) makes it an explicit opt-in, not automatic.
+
+### 11.3 Documentation surface
+
+The contract is documented in `docs/guides/session-recording.md` (new) with concrete examples of each violation pattern. The `Marker` validation errors and `SelfCheckDivergence` reports include `referencesContractClause: number` for cross-referencing.
+
+## 12. Error Handling
+
+| Error                     | When                                                                                            |
+| ------------------------- | ----------------------------------------------------------------------------------------------- |
+| `MarkerValidationError`   | `addMarker()` receives a marker that fails §6.1 rules. Includes `details` naming the field.     |
+| `RecorderClosedError`     | `addMarker()` / `attach()` / `takeSnapshot()` called after `disconnect()`.                      |
+| `SinkWriteError`          | A sink write rejects (FileSink: ENOSPC, EACCES, etc.). Wraps the underlying I/O error.          |
+| `BundleVersionError`      | `SessionReplayer.fromBundle/fromSink` receives a bundle with a `schemaVersion` it does not understand. |
+| `BundleIntegrityError`    | Loaded bundle has missing snapshots, broken attachment refs, or non-monotonic tick entries.     |
+| `ReplayDivergenceError`   | `openAt()` cannot reach the requested tick because a recorded command's handler is not registered in the replayer's world factory. |
+
+All errors extend a `SessionRecordingError` base class for `instanceof` discrimination. Engine fail-fast discipline applies: errors propagate, are not silently swallowed.
+
+## 13. Testing Strategy
+
+The engine's existing test discipline (Vitest, TDD per AGENTS.md) applies. Test coverage targets:
+
+### 13.1 Unit tests
+
+- **`SessionRecorder`**: listener wiring, lifecycle (construct/connect/disconnect/double-connect-noop/post-disconnect-throws), marker validation (each §6.1 rule has a test pair: valid + invalid), attachment ID generation, snapshot cadence (manual + automatic), debug capture integration.
+- **`SessionBundle` schema**: JSON round-trip; rejection of malformed bundles by `assertJsonCompatible`.
+- **`MemorySink`**: in-memory accumulation, `toBundle()` correctness, sync method semantics.
+- **`FileSink`**: file layout, manifest correctness, JSONL streaming, attachment writing, recovery from `incomplete: true` bundles.
+- **`Marker`**: kind enum exhaustiveness, ref-validation for all four ref types, opaque `data` round-trip.
+- **`ScenarioRunner.toBundle()`**: assertion markers produced for each check, sourceKind/sourceLabel set, tick alignment between ScenarioCapture and bundle.
+
+### 13.2 Integration tests
+
+- **Record → replay → state-equal.** Build a small scenario (10 entities, 1000 ticks, varied commands), record with default snapshot interval, deserialize via `SessionReplayer.fromBundle`, call `openAt(N)` for representative ticks, assert `world.serialize()` deep-equals the corresponding recorded snapshot.
+- **MemorySink ↔ FileSink parity.** Record the same scenario via both sinks; assert the resulting bundles are structurally equal modulo attachment refs.
+- **Scenario integration.** Convert an existing ScenarioRunner test to also assert `runner.toBundle()` produces a valid replayable bundle with assertion markers matching scenario checks.
+- **Long capture smoke.** 10000-tick session with 50 commands per tick, default snapshot cadence (10 snapshots). Assert bundle loads, `selfCheck()` passes, replay throughput is ≥ 5x recording throughput.
+
+### 13.3 Self-check tests
+
+- **Determinism violation surfaced.** A test scenario deliberately violates the contract (a system calls `Math.random()`); record, then `selfCheck()`; assert the result reports a divergence with the expected `fromTick` / `toTick`.
+- **Determinism upheld.** A clean scenario; `selfCheck()` reports `ok: true` with `divergences: []`.
+- **`stopOnFirstDivergence`**: with deliberate violations at multiple snapshot pairs, with the option set, assert only the first is reported.
+
+### 13.4 Failure-mode tests
+
+- Sink write failure during recording: assert `SinkWriteError` thrown to caller; the bundle is left in `incomplete: true` state for `FileSink`.
+- Marker validation: every error code in §12 has at least one test triggering it.
+- Bundle version mismatch: replayer rejects with `BundleVersionError`.
+
+## 14. Documentation Surface
+
+This spec lands the following doc updates per the `AGENTS.md` Documentation discipline:
+
+**Always-update:**
+
+- `docs/changelog.md` — new entry describing the SessionRecorder/SessionReplayer/SessionBundle/SessionSink/Marker public API additions and `ScenarioRunner.toBundle()` method.
+- `docs/devlog/summary.md` — one line per shipped commit (recorder/replayer/sink/scenario-integration likely ship as multiple commits on the chained branch).
+- `docs/devlog/detailed/<latest>.md` — full per-task entries.
+- `package.json` — version bumps per the per-commit policy in `AGENTS.md` (current version v0.7.6). All additions in this spec are additive and non-breaking, so each shipped commit gets a `c`-bump (e.g., v0.7.7 for the recorder commit, v0.7.8 for the replayer commit, and so on). No `b`-bump expected for this spec.
+
+**API surface:**
+
+- `docs/api-reference.md` — new top-level sections for `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`, `MemorySink`, `FileSink`, `Marker`, `MarkerKind`, `MarkerRefs`, `AttachmentDescriptor`, `SessionMetadata`, `SelfCheckResult`, `SelfCheckDivergence`, `SessionRecordingError` and subclasses.
+- `README.md` — Feature Overview table row for "Session recording & replay"; Public Surface bullets for the new top-level exports.
+- `docs/README.md` — index link to the new `session-recording.md` guide.
+
+**Architectural:**
+
+- `docs/architecture/ARCHITECTURE.md` — Component Map rows for SessionRecorder/SessionReplayer/SessionBundle/SessionSink; Boundaries paragraph clarifying the dual-recorder structure (WorldHistoryRecorder = rolling debug; SessionRecorder = persistent archive).
+- `docs/architecture/drift-log.md` — entry: dual recorders, motivation, alternatives considered.
+- `docs/architecture/decisions.md` — Key Architectural Decision row: "Approach 2 — separate SessionRecorder alongside WorldHistoryRecorder rather than extending in place" with the trade-offs.
+
+**Topical guides:**
+
+- `docs/guides/session-recording.md` (new) — recording quickstart, sink choice, marker authoring, replay, self-check, determinism contract with concrete violation examples.
+- `docs/guides/scenario-runner.md` (existing) — new section on `toBundle()` and how scenario runs integrate with the broader recording surface.
+- `docs/guides/debugging.md` (existing) — pointer to the new session-recording guide for replay-based debugging.
+
+**Doc-review verification:**
+
+- Run the `doc-review` skill before declaring complete; grep for removed/renamed APIs to ensure no doc drift.
+- Multi-CLI code review prompt explicitly instructs reviewers to verify doc accuracy (per `AGENTS.md` Documentation discipline).
+
+## 15. Architectural Decisions
+
+### ADR 1: Separate `SessionRecorder` rather than extend `WorldHistoryRecorder`
+
+**Decision:** Introduce `SessionRecorder` as a new primitive alongside `WorldHistoryRecorder`. Do not extend the existing recorder.
+
+**Context:** `WorldHistoryRecorder` is an in-memory bounded rolling buffer (default capacity 64) with a range-summary helper, designed for runtime debugging and AI agent inspection during a live run. Session recording needs unbounded capture, sink-based streaming, marker API, and a replayer companion. Two genuinely different use cases.
+
+**Alternatives considered:**
+
+- **Extend `WorldHistoryRecorder` in place.** Rejected: bloats the existing recorder API; conflates rolling-buffer-with-summary semantics with full-archive-with-replay semantics; risks regressing existing debug consumers (`ScenarioRunner`, `WorldDebugger`).
+- **Refactor: extract a `TickStream` primitive both recorders share.** Rejected for v1: optimizes for unknown future requirements (synthetic playtest hasn't been specced yet); pays a refactor cost upfront for benefit that depends on details not yet defined. Reconsider when the third consumer materializes and forces the abstraction.
+
+**Consequences:**
+
+- ~30 LOC of listener-wiring duplication between the two recorders. Acceptable.
+- Both recorders can attach to the same `World` simultaneously without interference.
+- Future synthetic playtest spec will likely use `SessionRecorder` directly, not `WorldHistoryRecorder`.
+
+### ADR 2: Bundle format as a first-class shared type, not a recorder-private shape
+
+**Decision:** `SessionBundle` is exported and shared between `SessionRecorder.toBundle()` and `ScenarioRunner.toBundle()`. The replayer accepts `SessionBundle` regardless of producer.
+
+**Context:** Recording sessions and running scenarios both produce "a deterministic timeline with markers." Forcing two formats would require the replayer/viewer to handle both, doubling validation surface and confusing consumers.
+
+**Consequences:**
+
+- One bundle format ages collectively. Schema bumps coordinate across all producers.
+- Synthetic playtest (future spec) will produce the same bundle format; viewer (future spec) handles one input shape.
+- Producer is identified via `metadata.sourceKind` for consumers that care about provenance.
+
+### ADR 3: Determinism contract documented, not enforced (in this spec)
+
+**Decision:** Document user obligations for replay determinism. Do not add engine-level enforcement (e.g., a strict-mode flag that rejects external mutations). Provide `SessionReplayer.selfCheck()` as the verification mechanism.
+
+**Context:** Strict-mode enforcement is a behaviorally invasive engine-wide change (audit every mutation method, gate on inside-tick state, provide escape hatches for setup/deserialize). Conflating it with session recording would make this spec significantly larger and the implementation riskier.
+
+**Alternatives considered:**
+
+- **Strict mode in this spec.** Rejected: scope creep; would block the spec on resolving the strict-mode design problem.
+- **Best-effort enforcement (warnings only).** Rejected: ambiguous; either enforce or don't.
+
+**Consequences:**
+
+- Replay can silently produce wrong state if user violates the contract and never runs `selfCheck()`. Mitigated by guide docs and recommending self-check in CI.
+- Strict mode can land later as a focused spec without affecting the recorder/replayer API.
+
+## 16. Open Questions / Deferred Decisions
+
+The following are intentionally left for the writing-plans phase or for future specs. They are not blocking spec acceptance.
+
+1. **Snapshot equality algorithm.** §9.3 calls for a fast deep-equal with best-effort `firstDifferingPath`. Concrete algorithm (recursive walk vs canonical-JSON hash + targeted diff) chosen during implementation. JSON-canonical hashing is appealing for speed but loses the path-of-first-divergence information. Implementation will likely use recursive walk with short-circuit; benchmark on the long-capture smoke test will validate throughput target.
+2. **Versioning policy for breaking bundle changes.** When `schemaVersion` bumps to 2, do we ship a migrator (`migrate(bundle, fromVersion, toVersion)`) or simply reject older versions? Decision deferred to the first time a bump is needed.
+3. **Default `snapshotInterval` of 1000.** Validated by the long-capture smoke test in §13.2. May be tuned based on representative bundle sizes.
+4. **Async vs sync sink methods.** §8 declares both; the recorder awaits sink calls so both work. Whether to expose the sync/async distinction in the type system (`SyncSessionSink` vs `AsyncSessionSink` brand types) is an implementation-phase decision.
+5. **`ReplayerConfig.worldFactory` ergonomics.** Requiring callers to provide a factory that re-registers components/validators/handlers/systems is necessary because those can't be serialized. The spec doesn't define a higher-level helper that captures factory output for re-use; that's a candidate quality-of-life addition in a follow-up.
+
+## 17. Future Specs (Backlog)
+
+This spec is the substrate. Follow-up specs in dependency order:
+
+| #  | Spec                                              | Depends on   | Status   |
+| -- | ------------------------------------------------- | ------------ | -------- |
+| 2  | Game-side annotation UI (hotkey, gestures, refs)  | This spec    | Proposed |
+| 3  | Synthetic playtest harness (policies, runners)    | This spec    | Proposed |
+| 4  | Standalone bundle viewer (scrubber, agent driver) | This spec    | Proposed |
+| 5  | Counterfactual replay / fork (substitution, divergence) | This spec | Proposed |
+| 6  | Engine strict-mode determinism enforcement        | Independent  | Proposed |
+| 7  | Bundle search / corpus index                      | #3, #4       | Proposed |
+| 8  | Behavioral metrics over corpus                    | #3           | Proposed |
+| 9  | AI playtester agent                               | #3           | Proposed |
+
+Vision and rationale for the full backlog are in `docs/design/ai-first-dev-roadmap.md`.
+
+## 18. Acceptance Criteria
+
+This spec is implemented when:
+
+- All five new symbols (`SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`, `Marker`) are exported from `src/index.ts` with full TypeScript types.
+- `MemorySink` and `FileSink` ship as concrete implementations.
+- `ScenarioRunner.toBundle()` is added and produces replayable bundles with assertion markers.
+- §13 test coverage is in place; all four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
+- `selfCheck()` correctly identifies a deliberately introduced determinism violation in a smoke test.
+- All §14 doc updates land in the same merge.
+- A multi-CLI code review (Codex / Gemini / Opus) reaches consensus per `AGENTS.md`.
+- The branch is rebase-clean against `main` and ready to merge on user authorization.
diff --git a/docs/design/ai-first-dev-roadmap.md b/docs/design/ai-first-dev-roadmap.md
new file mode 100644
index 0000000..d64c197
--- /dev/null
+++ b/docs/design/ai-first-dev-roadmap.md
@@ -0,0 +1,170 @@
+# AI-First Game Development Roadmap
+
+**Status:** Living document. Updated whenever a spec lands or scope shifts.
+
+**Vision:** civ-engine should support an environment where AI agents do as much game-development work as possible without human intervention — generating, exercising, debugging, and verifying game logic autonomously, with humans involved only for design intent and judgment calls. This document captures the multi-spec roadmap that delivers that environment.
+
+A single recording-and-replay spec is the substrate. The full vision spans nine specs across three tiers; specs are tracked individually under `docs/design/<date>-<topic>-design.md`.
+
+## Tier 1 — Foundational
+
+Without these, "AI-first" is aspirational. They are the irreducible substrate for autonomous feedback loops.
+
+### Spec 1: Session Recording & Replay (engine primitives)
+
+Status: **Drafted 2026-04-26.** See `2026-04-26-session-recording-and-replay-design.md`.
+
+What it delivers: deterministic capture of any World run as a portable `SessionBundle`; replay engine that opens a paused World at any tick; marker API for human and programmatic annotations; sink interface for memory and disk persistence; unification with `ScenarioRunner` so test runs and live captures share the same bundle format and replayer.
+
+What it unlocks: every other spec in this roadmap.
+
+### Spec 3: Synthetic Playtest Harness
+
+Status: **Proposed.**
+
+What it delivers: a harness that constructs a `World`, attaches a `SessionRecorder`, drives `world.submit()` from a pluggable policy (random / scripted / LLM-driven / heuristic agents), runs for N ticks, and saves the bundle. Trivially parallelizable across cores or machines. Produces a corpus of bundles per commit.
+
+What it unlocks: the actual feedback loop. Without synthetic playtest, recording just makes human bug reports nicer; with it, every commit gets autonomous exploration. Agents review the corpus and self-file regressions before any human plays the game.
+
+Why it depends on Spec 1: synthetic playtest is just "policy → submit() → SessionBundle"; without recording there is no artifact to analyze.
+
+### Spec 8: Behavioral Metrics over Corpus
+
+Status: **Proposed.**
+
+What it delivers: a metrics layer that ingests bundles from the synthetic playtest corpus, computes design-relevant statistics (median session length, decision points per minute, resource Gini, time-to-first-conflict, dominant strategy distribution, etc.), and tracks these across commits. Regression detection: "the median session length dropped 30% after this commit" gets surfaced automatically.
+
+What it unlocks: a meaningful definition of "regression" for emergent behavior, which unit tests can't capture. Designers and agents share a common quantitative vocabulary for "is the game still doing what we want."
+
+### Scenario library (continuous, no spec)
+
+The convention that every annotated bug bundle gets promoted to a permanent regression scenario. Implemented incrementally as part of Specs 1, 3, and 4. The library compounds: it becomes the project's institutional memory of "what's known to be hard."
+
+## Tier 2 — Multipliers
+
+Tier 1 makes AI-first possible. Tier 2 makes it powerful.
+
+### Spec 9: AI Playtester Agent
+
+Status: **Proposed.**
+
+What it delivers: a separate LLM-driven agent that plays the game (via the same `submit()` boundary), then writes natural-language qualitative feedback ("I found myself doing X repetitively in the early game; the second hour felt aimless"). Distinct from coding agents — its job is to *play and report*, not to edit code.
+
+What it unlocks: the closest approximation to "is it fun?" that doesn't require a human. Combined with Spec 8's quantitative metrics, the design loop closes.
+
+Why it depends on Spec 3: the playtester is just a specific class of policy plugged into the synthetic harness, plus an LLM-driven post-run report.
+
+### Spec 7: Bundle Search / Corpus Index
+
+Status: **Proposed.**
+
+What it delivers: an index over the bundle corpus with structured query: "show me all sessions where pathfinding flagged stuck units in the first 1000 ticks," "find sessions with high decision-point variance," "find sessions where the player's resource balance crashed below threshold X." Bundle metadata is indexed; bundle content is queryable on demand via the replayer.
+
+What it unlocks: the corpus stops being a folder of files and becomes a query surface for both agents and humans.
+
+Why it depends on Specs 3 and 4: the corpus needs to exist (3) and be navigable (4) before indexing it earns its keep.
+
+### Anomaly detection over the corpus (continuous, no spec)
+
+A continuous capability that surfaces statistical outliers in tick timing, state divergences, surprise event sequences, etc. Implemented incrementally on top of Specs 7 and 8. The agent surfaces these and investigates without prompting.
+
+## Tier 3 — Productivity Tooling
+
+Tier 3 is leverage on top of an already-working autonomous loop. Defer until Tier 1 and 2 are mature.
+
+### Spec 4: Standalone Bundle Viewer
+
+Status: **Proposed.**
+
+What it delivers: a separate package (in this repo, sibling to engine sources) that loads bundles, scrubs a timeline, jumps to markers, diffs state between any two ticks, and replays into a paused World. Includes a programmatic agent-driver API: `bundle.atMarker(id).state(...).events(...).diffSince(...)`. UI optional in v1; CLI / library is sufficient.
+
+What it unlocks: human productivity. Agents can drive the bundle programmatically without it; humans benefit from the GUI scrubber.
+
+Why it depends on Spec 1: the viewer reads bundles.
+
+### Spec 2: Game-Side Annotation UI
+
+Status: **Proposed.**
+
+What it delivers: in-game hotkey + annotation form + drawing tools (entity selection, region lasso, suggested-path arrow, freehand scribble, screenshot capture). Resolves visual gestures to engine references (entity IDs, world coordinates) at annotation time, attaching the resolved refs to the marker. Free-text and screenshot blob travel as supplementary attachments. Game-specific code per game; this spec defines the conventions.
+
+What it unlocks: rich, structured human bug reports. Player annotations populate the scenario library (Tier 1).
+
+Why it depends on Spec 1: the marker schema is engine-side; the UI just produces markers.
+
+### Spec 5: Counterfactual Replay / Fork
+
+Status: **Proposed.**
+
+What it delivers: `SessionReplayer.forkAt(tick).substitute(commands).run()` — change inputs at tick N, replay forward, observe how the simulation diverges from the original. Two-bundle diff utility for visualizing divergence. Substitution semantics, divergence detection, replay-fork tree.
+
+What it unlocks: the most powerful debugging primitive. "If the player had done X instead of Y, what would have happened?" becomes a single API call.
+
+Why it's deferred: high architectural complexity (input substitution, divergence representation, fork trees), and the agent's main debugging workflow (load, jump to marker, inspect, step) is fully served by Spec 1's `openAt`. Build it when synthetic playtest reveals concrete counterfactual queries the agent wants to issue.
+
+### Spec 6: Engine Strict-Mode Determinism Enforcement
+
+Status: **Proposed.** Independent of the other specs in this roadmap.
+
+What it delivers: `World({ strict: true })` flag that rejects mutations from outside system phases. All external state changes must go through `submit()`. Includes escape hatches for setup, deserialization, and explicit out-of-tick maintenance. Auditing of all mutation methods to gate on inside-tick state.
+
+What it unlocks: structural enforcement of the determinism contract that Spec 1 only documents. Replays can no longer silently diverge — violations throw at the source.
+
+Why it's deferred: it's a meaty engine-wide behavioral change with its own design problem (escape hatches, migration, false-positive risk for legitimate setup code). Best handled as a focused spec when its costs and benefits can be evaluated standalone. Spec 1's `selfCheck()` provides 80% of the safety with 0% of the engine surgery in the meantime.
+
+## Spec Dependency Graph
+
+```
+                       ┌──────────────────────────────────────┐
+                       │  Spec 1: Session Recording & Replay  │
+                       │           (foundation)               │
+                       └─┬────────────┬───────────────┬───────┘
+                         │            │               │
+                ┌────────┴───┐  ┌─────┴─────┐   ┌─────┴─────────┐
+                │ Spec 2:    │  │ Spec 3:   │   │ Spec 4:       │
+                │ Annotation │  │ Synthetic │   │ Standalone    │
+                │ UI (game)  │  │ Playtest  │   │ Viewer        │
+                └────────────┘  └─┬───────┬─┘   └────────────┬──┘
+                                  │       │                  │
+                          ┌───────┴──┐  ┌─┴────────┐  ┌──────┴───┐
+                          │ Spec 8:  │  │ Spec 9:  │  │ Spec 7:  │
+                          │ Behav.   │  │ AI Play- │  │ Corpus   │
+                          │ Metrics  │  │ tester   │  │ Index    │
+                          └──────────┘  └──────────┘  └──────────┘
+
+       (independent, parallelizable)
+       ┌──────────────────────────────────────┐
+       │  Spec 5: Counterfactual / Fork       │  → depends on Spec 1
+       └──────────────────────────────────────┘
+       ┌──────────────────────────────────────┐
+       │  Spec 6: Strict-Mode Enforcement     │  → independent of all
+       └──────────────────────────────────────┘
+```
+
+## Suggested Build Order
+
+1. Spec 1 (recording & replay) — substrate for everything.
+2. Spec 3 (synthetic playtest) — turns recording from "improve human bug reports" into "infinite autonomous bug discovery." Highest leverage.
+3. Spec 8 (behavioral metrics) — pairs with Spec 3 to define regressions for emergent behavior.
+4. Spec 2 (game-side annotation UI) — humans plug into the same system; game-specific work that can ship in parallel with Spec 4.
+5. Spec 4 (standalone viewer) — productivity multiplier for both agents and humans.
+6. Spec 7 (corpus index) — once corpus is large enough that browsing it linearly hurts.
+7. Spec 9 (AI playtester) — once Specs 3 and 8 are mature enough to drive qualitative feedback usefully.
+8. Spec 5 (counterfactual) — once concrete counterfactual queries emerge from agent workflows.
+9. Spec 6 (strict-mode) — independent, can ship at any point. Schedule based on determinism-bug pain.
+
+## Status Tracker
+
+| Spec | Title                                | Status     | File                                                      |
+| ---- | ------------------------------------ | ---------- | --------------------------------------------------------- |
+| 1    | Session Recording & Replay           | Drafted    | `2026-04-26-session-recording-and-replay-design.md`       |
+| 2    | Game-Side Annotation UI              | Proposed   | not yet drafted                                           |
+| 3    | Synthetic Playtest Harness           | Proposed   | not yet drafted                                           |
+| 4    | Standalone Bundle Viewer             | Proposed   | not yet drafted                                           |
+| 5    | Counterfactual Replay / Fork         | Proposed   | not yet drafted                                           |
+| 6    | Strict-Mode Determinism Enforcement  | Proposed   | not yet drafted                                           |
+| 7    | Bundle Search / Corpus Index         | Proposed   | not yet drafted                                           |
+| 8    | Behavioral Metrics over Corpus       | Proposed   | not yet drafted                                           |
+| 9    | AI Playtester Agent                  | Proposed   | not yet drafted                                           |
+
+Update this row as specs are drafted, accepted, implemented, and merged.
