# Session Recording & Replay — Design Spec

**Status:** Draft v2 (2026-04-27). Revised after iter-1 multi-CLI review (Codex + Opus; Gemini quota-out). See `docs/reviews/session-recording-spec/2026-04-26/1/REVIEW.md` for the iter-1 findings folded into this revision. Awaiting iter-2 convergence before writing-plans.

**Scope:** Engine-level primitives only (Scope B from brainstorming). Game-side annotation UI, standalone viewer, synthetic playtest harness, counterfactual replay, and strict-mode determinism enforcement are explicitly out of scope and tracked in `docs/design/ai-first-dev-roadmap.md`.

**Author:** civ-engine team

**Related primitives:** `WorldHistoryRecorder`, `ScenarioRunner`, `WorldSnapshot`, `TickDiff`, `EventBus`, `CommandQueue`, `world.random()`.

## 1. Goals

This spec defines engine-level primitives that:

- Capture a deterministic, replayable record of any `World` run over a span of clean ticks as a portable `SessionBundle`.
- Allow any consumer (agent, human, debugger, CI) to load a bundle, jump to any tick within the recorded clean span, inspect state, step forward, and verify replay integrity via a self-check that diffs state, per-tick events, and command execution streams.
- Unify session bundles with scenario test runs so a single bundle format and a single replayer serve both live captures and programmatic test runs.
- Provide a sink interface so bundles can persist to memory or disk without changes to the recorder API. Sinks are synchronous in v1 to match the engine's listener contract; async / streaming sinks are deferred until a consumer needs them.
- Support player-authored markers (annotations) and programmatic markers (assertions, checkpoints) with structured engine-validated references (entity refs with generation, cells, tick ranges) plus opaque game-defined payload.

The deliverable is an opt-in API surface; existing engine consumers see no behavioral change. Replay across recorded tick failures or `world.recover()` cycles is explicitly out of scope for v1 (see §2).

## 2. Non-Goals

The following are deliberately excluded from this spec to keep it focused:

- **Game-side annotation UI.** The hotkey, drawing tools, screenshot capture, and gesture-to-ref resolution all belong to game code. This spec only defines the marker schema the engine accepts.
- **Standalone viewer.** A future spec will define a bundle scrubber, timeline UI, and agent-driven query API.
- **Synthetic playtest harness.** A future spec will define an agent or scripted policy that drives `world.submit()` and produces bundles autonomously.
- **Counterfactual replay (forking).** Substituting inputs at tick N and replaying forward to observe divergence is high-value but architecturally distinct; future spec.
- **Strict-mode determinism enforcement.** Adding a `World({ strict: true })` flag that rejects mutations outside system phases is a parallel engine-wide change with its own design problem; future spec. This spec only documents the determinism contract and provides a `selfCheck()` to surface violations.
- **Replay across recorded tick failures or `world.recover()` cycles.** `WorldSnapshotV5` does not capture poison state (`isPoisoned()`, `lastTickFailure`), so a recorded session that crossed a tick failure cannot be exactly reconstructed from snapshot+commands. v1 records failures into `bundle.failures` for diagnostic inspection but `openAt(tick)` throws `BundleIntegrityError` if `tick` falls inside or after a recorded failure span. A future spec extends `WorldSnapshot` to v6 to lift this restriction.
- **Async / streaming sinks.** v1 sinks are synchronous to match `World`'s synchronous listener invariants. A future spec may add an async sink path concurrently with whatever engine-side restructuring it requires (e.g. a buffered-write proxy, or making listener invocation explicitly async-aware).
- **Bundle search / corpus index, behavioral metrics, AI playtester.** Tier-2 capabilities that depend on the synthetic playtest spec landing first.

## 3. Background

The engine already has most of the substrate this spec needs. Relevant existing primitives:

- **`WorldHistoryRecorder`** (`src/history-recorder.ts:87`). Listener-based recorder with bounded rolling buffer (default capacity 64 ticks). Captures initial snapshot, per-tick `diff`/`events`/`metrics`/`debug`, command submissions (as `CommandSubmissionResult` — note: this type does NOT carry the original command `data` payload), command executions, tick failures. Continues to serve runtime debugging unchanged. This spec adds a sibling primitive rather than extending it (see ADR 1 in §15).
- **`runScenario`** (`src/scenario-runner.ts:133`). A standalone function (not a class) that runs a scenario and returns a `ScenarioCapture` with snapshot + history + debug + metrics + diff + events. This spec adds a sibling adapter `scenarioCaptureToBundle()` that translates `ScenarioCapture` into a `SessionBundle` with `kind: 'assertion'` markers for each scenario check.
- **`WorldSnapshot v5`** (`src/serializer.ts:62`). Round-trips full deterministic state including seeded RNG, runtime config, and per-component `ComponentStoreOptions`. Does NOT carry poison state; v1 recording continues to capture failures via `bundle.failures` for diagnostics, but replay is scope-limited to clean tick spans (see §2).
- **`world.submit()` / `world.submitWithResult()`** (`src/world.ts`). Single typed input boundary for player intent. Validators run synchronously *before* the command is queued (with the live world available); handlers run later during `processCommands()` at the start of the next tick. **`CommandSubmissionResult.tick` is the *observable* tick at submission time**, which is one less than the tick during which the command's handler runs (since `gameLoop.tick` advances at the end of `runTick()`). The replayer's command-replay loop must respect this off-by-one (see §9.1).
- **`world.random()`**. Engine-owned seeded RNG. Already part of snapshot v3+. Routing all randomness through this is the basis of replay determinism.

## 4. Architecture Overview

Six new symbols, plus one new exported function:

| Component                      | Status            | Responsibility                                                                                      |
| ------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------- |
| `SessionRecorder`              | new (`src/session-recorder.ts`) | Wraps a live `World` (intercepting `submit`/`submitWithResult`), captures inputs/diffs/events/markers/snapshots, emits to a `SessionSink`. Synchronous throughout. |
| `SessionReplayer`              | new (`src/session-replayer.ts`) | Loads a bundle (or sink); opens a paused `World` at any tick within the bundle's clean span; runs replay self-check across state, events, and execution streams. |
| `SessionBundle`                | new (in `src/session-bundle.ts`) | Versioned strict-JSON archive type; shared by `SessionRecorder.toBundle()` and `scenarioCaptureToBundle()`. |
| `SessionSink` / `SessionSource` | new (in `src/session-sink.ts`) | Synchronous write interface (`Sink`) and read interface (`Source`); `MemorySink` and `FileSink` implement both. |
| `Marker`                       | new (in `src/session-bundle.ts`) | `{ tick, kind, text?, refs?, data?, attachments?, provenance }` with closed `kind` enum and `EntityRef`-typed entity refs. |
| `RecordedCommand`              | new (in `src/session-bundle.ts`) | Captures a submitted command's `type`, `data`, submission tick, sequence, and result. Replaces `CommandSubmissionResult[]` for replay-relevant purposes (the result-only type still travels for diagnostics). |
| `scenarioCaptureToBundle()`    | new exported function (`src/session-bundle.ts`) | Translates `ScenarioCapture` → `SessionBundle` with `sourceKind: 'scenario'` and `assertion` markers. Standalone function, not a class method, because `runScenario` is a function, not a class. |

`WorldHistoryRecorder` and `runScenario` are unchanged. `SessionRecorder` and the legacy recorder coexist with distinct purposes (rolling debug buffer vs persistent archive).

```
                  ┌────────────────────────────────────┐
                  │                World               │
                  └─┬────────────────────────────────┬─┘
                    │ onDiff / onCommandResult / ... │
        ┌───────────┴────────────┐         ┌─────────┴──────────┐
        │ WorldHistoryRecorder   │         │ SessionRecorder    │
        │ (rolling, in-memory)   │         │ (full, sink-based) │
        │ [unchanged]            │         │ [new]              │
        └───────────┬────────────┘         └────────┬───────────┘
                    │                               │
                    │                       ┌───────┴──────────┐
       scenarioCaptureToBundle(capture)     │ SessionSink/Source│
                    │                       │ (Memory | File)  │
                    └────────►┌─────────────┴──────────────────┴─────────────►
                              │           SessionBundle (strict JSON)         │
                              │ (canonical archive; identical for both paths) │
                              └─────────────┬─────────────────────────────────┘
                                            │
                                            ▼
                                   ┌────────────────────┐
                                   │  SessionReplayer   │
                                   │   .openAt(tick)    │
                                   │   .selfCheck()     │
                                   └────────┬───────────┘
                                            ▼
                                   ┌────────────────────┐
                                   │   paused World     │
                                   │ (deserialized +    │
                                   │  replayed forward) │
                                   └────────────────────┘
```

## 5. Bundle Format

### 5.1 In-memory shape

```ts
interface SessionBundle<TEventMap, TCommandMap, TDebug = JsonValue> {
  schemaVersion: 1;
  metadata: SessionMetadata;
  initialSnapshot: WorldSnapshot;
  ticks: SessionTickEntry<TEventMap, TDebug>[];
  commands: RecordedCommand<TCommandMap>[];               // includes raw type+data; replay-ready
  executions: CommandExecutionResult<keyof TCommandMap>[]; // diagnostic; not used by replay
  failures: TickFailure[];                                 // diagnostic; replay refuses spans across these
  snapshots: SessionSnapshotEntry[];
  markers: Marker[];
  attachments: AttachmentDescriptor[];
}

interface SessionMetadata {
  sessionId: string;            // UUID v4 generated at SessionRecorder construction
  engineVersion: string;        // package.json version at connect() time
  nodeVersion: string;          // process.version at connect() time; replayer warns on mismatch
  recordedAt: string;           // ISO 8601 timestamp at connect()
  startTick: number;            // tick at connect()
  endTick: number;              // tick at disconnect() or toBundle()
  durationTicks: number;        // endTick - startTick
  sourceKind: 'session' | 'scenario';
  sourceLabel?: string;         // optional human label (scenario name, session label)
  incomplete?: true;            // set if recorder did not reach disconnect() cleanly (sink failure, world destroy)
  failureSpans?: Array<{ failedTick: number }>; // ticks where TickFailure was recorded; replay refuses these
}

interface RecordedCommand<TCommandMap = Record<string, unknown>> {
  submissionTick: number;       // observable tick at submission time (CommandSubmissionResult.tick)
  sequence: number;             // CommandSubmissionResult.sequence; orders within a tick
  type: keyof TCommandMap & string;
  data: TCommandMap[keyof TCommandMap];
  result: CommandSubmissionResult<keyof TCommandMap>;  // accepted/rejected outcome; for diagnostics
}

interface SessionTickEntry<TEventMap, TDebug> {
  tick: number;
  diff: TickDiff;
  events: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
  metrics: WorldMetrics | null;
  debug: TDebug | null;
}

interface SessionSnapshotEntry {
  tick: number;
  snapshot: WorldSnapshot;
}

interface AttachmentDescriptor {
  id: string;                   // UUID v4
  mime: string;                 // e.g. 'image/png'
  sizeBytes: number;
  ref: { dataUrl: string } | { sidecar: true };
  // dataUrl  → small attachments embedded as base64 data URLs (default cap 64 KiB; oversize blobs require sidecar)
  // sidecar  → bytes live outside the strict-JSON bundle (FileSink: attachments/<id>.<ext>;
  //            MemorySink: parallel Map accessed via sink.getSidecar(id); sidecars require explicit
  //            opt-in on MemorySink to avoid surprising consumers who treat the bundle as pure JSON)
}
```

`Marker` is defined in §6. `RecordedCommand` is the canonical replay input (`CommandSubmissionResult` alone does not carry the original `data` payload, so it cannot drive replay). Per §11.5, `RecordedCommand` MUST originate from outside the tick loop — submissions made from inside a system, command handler, or event listener are a determinism contract violation and break replay.

`SessionBundle` is strict JSON: `JSON.stringify(bundle)` produces a complete, lossless representation. Sidecar attachment bytes live outside the JSON shape; consumers retrieve them via `source.readSidecar(id)` (see §8). ADR 2 in §15 notes the MemorySink/FileSink shape symmetry: both implement `SessionSink & SessionSource`; the JSON-typed bundle is identical regardless of producer.

### 5.2 On-disk layout (FileSink)

```
<bundleDir>/
  manifest.json           # SessionMetadata + index of streams + AttachmentDescriptor[] (sidecar refs only)
  ticks.jsonl             # one SessionTickEntry per line, ordered by tick
  commands.jsonl          # one RecordedCommand per line, ordered by (submissionTick, sequence)
  executions.jsonl        # one CommandExecutionResult per line, ordered by (tick, sequence)
  failures.jsonl          # one TickFailure per line, ordered by tick
  markers.jsonl           # one Marker per line, ordered by createdAt
  snapshots/
    <tick>.json           # one WorldSnapshot per recorded snapshot
  attachments/
    <id>.<ext>            # binary blobs, ext inferred from mime; only when AttachmentDescriptor.ref.sidecar
```

`manifest.json` references snapshots by tick, ticks/commands/executions/failures/markers by JSONL filename, and sidecar attachments by id; `dataUrl`-mode attachments are embedded in the manifest. The five JSONL streams are written incrementally; the manifest is rewritten on each significant change so a reader of an `incomplete: true` bundle can still read the prefix that landed.

`SessionReplayer.fromSource(fileSource)` reads `manifest.json` eagerly, then streams individual JSONL files lazily as needed. Snapshots are loaded on demand via `source.readSnapshot(tick)`.

### 5.3 Versioning

`schemaVersion: 1` is the initial format. Loaders MUST accept the version they were built against; mismatched versions throw `BundleVersionError` with the bundle's version and the loader's expected version. Migration is out of scope for v1; future bumps will document migration policy at that time.

## 6. Marker Schema

```ts
type MarkerKind = 'annotation' | 'assertion' | 'checkpoint';
type MarkerProvenance = 'engine' | 'game';

interface Marker {
  id: string;                    // UUID v4
  tick: number;                  // engine tick the marker references; >= 0
  kind: MarkerKind;
  provenance: MarkerProvenance;  // 'engine' for assertions added by scenarioCaptureToBundle();
                                 // 'game' for any marker added via recorder.addMarker() by user code
  text?: string;                 // free-form human description
  refs?: MarkerRefs;             // engine-validated structured references
  data?: JsonValue;              // opaque game-defined payload
  attachments?: string[];        // attachment ids referenced by this marker
  createdAt?: string;            // ISO 8601 timestamp; recorder fills in if omitted
  validated?: false;             // set on retroactive markers whose liveness checks were skipped (see §6.1)
}

interface MarkerRefs {
  entities?: EntityRef[];                       // { id, generation }; must match a live entity at marker.tick (live markers only)
  cells?: Position[];                           // must be in-bounds for the world's grid
  tickRange?: { from: number; to: number };     // both >= 0; from <= to; to constrained against bundle endTick at finalization
}
```

`EntityRef` (id + generation) is required because the engine recycles entity IDs via the free-list. A bare `EntityId` could silently match a recycled entity that has nothing to do with the original referent. Marker validation rejects refs that name a generation that has never existed.

### 6.1 Validation rules

`SessionRecorder.addMarker()` validates a marker before storing it:

**Live-tick markers (`marker.tick === world.tick`)** are validated strictly:

- `tick` must be `>= 0` and `<= world.tick`. Markers cannot point to the future.
- `refs.entities`: every `EntityRef` must match a live entity at `world.tick` — both `id` and `generation` must match the engine's current `EntityManager` state. Refs to dead entities, recycled-id entities of a different generation, or never-existed ids throw `MarkerValidationError`.
- `refs.cells`: every cell must be within the world's configured bounds. Out-of-bounds cells throw `MarkerValidationError`.
- `refs.tickRange`: `from` and `to` must satisfy `0 <= from <= to`. `to <= world.tick + 1` is recommended but not enforced (the recorder does not know the eventual `endTick`); finalization in `toBundle()` clamps any `to > endTick` to `endTick` and records this in a `BundleIntegrityError` warning if the manifest is later read with `strict: true`.

**Retroactive markers (`marker.tick < world.tick`)** are validated leniently:

- `tick` and `refs.cells`/`refs.tickRange` are validated as above (these don't require historical state reconstruction).
- `refs.entities` liveness is **not** validated — the recorder does not maintain a historical entity-liveness index, and reconstructing it from snapshots+diffs would make `addMarker()` O(N) in tick distance with disk I/O on `FileSink`. Retroactive markers get `validated: false` set on the marker so downstream consumers (viewer, agent search) know the entity refs are best-effort.
- Replay-time validation in `SessionReplayer` may opt to verify retroactive marker entity refs against the deserialized snapshot at `marker.tick`. This is an explicit `replayer.validateMarkers()` call, not part of `selfCheck()`.

**Universal rules (both live and retroactive):**

- `kind: 'assertion'` markers added via `recorder.addMarker()` get `provenance: 'game'`. Engine-validated assertions added via `scenarioCaptureToBundle()` get `provenance: 'engine'`. Downstream consumers (viewer, corpus search) should distinguish these.
- `data` is validated as JSON-compatible via the existing `assertJsonCompatible` helper.
- `attachments` ids must reference attachments registered via `recorder.attach()`.

Invalid markers throw `MarkerValidationError` with a structured `details` field naming the offending field. The recorder does not silently drop or coerce markers.

## 7. SessionRecorder API

```ts
class SessionRecorder<TEventMap, TCommandMap, TDebug = JsonValue> {
  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    sink?: SessionSink;                       // default: new MemorySink()
    snapshotInterval?: number | null;         // default: 1000; null disables periodic snapshots
    captureInitialSnapshot?: boolean;         // default: true
    debug?: { capture(): TDebug | null };
    sourceLabel?: string;                     // optional metadata field
  });

  readonly sessionId: string;                 // generated at construction
  readonly tickCount: number;                 // number of recorded ticks
  readonly markerCount: number;
  readonly snapshotCount: number;             // counts initial + periodic + manual
  readonly isConnected: boolean;
  readonly isClosed: boolean;                 // true after disconnect(); recorder is single-use

  connect(): void;                            // hook listeners; capture initial snapshot; sink.open()
  disconnect(): void;                         // unhook listeners; sink.close(); marks recorder closed
  addMarker(marker: NewMarker): MarkerId;     // tick defaults to world.tick if omitted
  attach(blob: { mime: string; data: Uint8Array }, options?: { sidecar?: boolean }): AttachmentId;
  takeSnapshot(): SessionSnapshotEntry;       // manual snapshot at current tick
  toBundle(): SessionBundle<TEventMap, TCommandMap, TDebug>;
}

type NewMarker = Omit<Marker, 'id' | 'createdAt' | 'provenance'> & { tick?: number };
//   provenance is fixed to 'game' for recorder-added markers; user cannot set 'engine'.
type MarkerId = string;
type AttachmentId = string;
```

### 7.1 Recorder lifecycle

1. **Construction.** Generates `sessionId`, validates config, **wraps the live `world.submit()` and `world.submitWithResult()` methods** so the recorder can capture the raw `type` + `data` payload for every submission (not subscribed yet — wrapping is reversible). Records `engineVersion` and `nodeVersion` placeholders. Does not subscribe to listeners yet.
2. **`connect()`.** Calls `sink.open(initialMetadata)` where `initialMetadata` has `startTick = world.tick`, `recordedAt = now()`, `endTick` and `durationTicks` left as zero (rewritten at finalization). If `captureInitialSnapshot`, calls `world.serialize()` and writes the initial snapshot via `sink.writeSnapshot()`. Subscribes to `world.onDiff`, `world.onCommandResult`, `world.onCommandExecution`, `world.onTickFailure`. Subsequent ticks emit live to the sink. Calling `connect()` while already connected is a no-op; calling `connect()` after `disconnect()` throws `RecorderClosedError` (recorder is single-use).
3. **Per-tick capture.** On each `onDiff`, the recorder builds a `SessionTickEntry`, clones via existing `cloneJsonValue` discipline, calls `sink.writeTick()` synchronously. If `world.tick % snapshotInterval === 0`, calls `world.serialize()` and `sink.writeSnapshot()` synchronously.
4. **Submission capture.** The wrapped `submit`/`submitWithResult` builds a `RecordedCommand` from `{ type, data, result }` and calls `sink.writeCommand()` synchronously before returning the result to the caller.
5. **Marker / attachment additions.** Validated per §6.1, then `sink.writeMarker()` / `sink.writeAttachment()` synchronously. Attachments default to `dataUrl` mode if under `MemorySink`'s threshold (64 KiB by default) or unconditionally on `FileSink`; pass `{ sidecar: true }` to force sidecar storage.
6. **`disconnect()`.** Unwraps `submit`/`submitWithResult`, unhooks all listeners, finalizes `metadata.endTick = world.tick` and `metadata.durationTicks`, calls `sink.close()` (which rewrites `manifest.json` with the final metadata for `FileSink`). Tolerates a destroyed world: if `world.serialize()` would throw, sets `metadata.incomplete = true` and proceeds. After disconnect, `addMarker`, `attach`, and `takeSnapshot` throw `RecorderClosedError`. The recorder cannot be reconnected.
7. **`toBundle()`.** Returns the canonical strict-JSON `SessionBundle` from `sink.toBundle()`. May be called before or after `disconnect()`. If called before disconnect on a `FileSink`, the bundle is built from the current on-disk state with `incomplete: true` if `disconnect()` has not been called.

### 7.2 Failure modes

- **Sink write failure (synchronous).** Throws `SinkWriteError` synchronously from the listener back to the engine. Per §11.5, the engine's `onDiff` / command listeners' exceptions are caught and `console.error`'d but do not propagate; the recorder additionally sets `metadata.incomplete = true` and best-effort closes the sink so the bundle is still consumable. Subsequent listener invocations short-circuit (the recorder enters a terminal `incomplete` state).
- **World destroyed while connected.** Recorder's `disconnect()` is tolerant: any `world.serialize()` failure during finalization is caught; `metadata.incomplete = true` is recorded. Caller still must call `disconnect()` to finalize.
- **Recorder constructed against a poisoned world.** Recording proceeds; `connect()` writes the failure-state snapshot via `serialize({ inspectPoisoned: true })`. Subsequent failed ticks are captured to `bundle.failures`. Replay refuses ticks at or after the first failure (per CR3 / §9.1).
- **Multiple recorders attached to one world.** Supported; both wrap `submit`/`submitWithResult` (forming a chain) and both subscribe to listeners. Bundle outputs are independent.

## 8. SessionSink and SessionSource Interfaces

The sink interface is **synchronous** in v1 to compose with `World`'s synchronous listener contract (`onDiff` listeners cannot be awaited). Async / streaming sinks would require restructuring engine listener invocation and are deferred to a future spec.

The sink contract is split in two: `SessionSink` writes; `SessionSource` reads. Both `MemorySink` and `FileSink` implement the union (`SessionSink & SessionSource`).

```ts
interface SessionSink {
  open(metadata: SessionMetadata): void;
  writeTick(entry: SessionTickEntry): void;
  writeCommand(record: RecordedCommand): void;
  writeCommandExecution(result: CommandExecutionResult): void;
  writeTickFailure(failure: TickFailure): void;
  writeSnapshot(entry: SessionSnapshotEntry): void;
  writeMarker(marker: Marker): void;
  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): void;
  // descriptor.ref is mutated by the sink to reflect chosen storage policy (dataUrl vs sidecar);
  // recorder receives the finalized descriptor back via the AttachmentId returned from recorder.attach().
  close(): void;
}

interface SessionSource {
  readonly metadata: SessionMetadata;
  readSnapshot(tick: number): WorldSnapshot;
  readSidecar(id: string): Uint8Array;
  ticks(): IterableIterator<SessionTickEntry>;
  commands(): IterableIterator<RecordedCommand>;
  executions(): IterableIterator<CommandExecutionResult>;
  failures(): IterableIterator<TickFailure>;
  markers(): IterableIterator<Marker>;
  attachments(): IterableIterator<AttachmentDescriptor>;
  toBundle(): SessionBundle;  // finalize and return strict-JSON shape (excludes sidecar bytes; use readSidecar for those)
}
```

V1 ships two implementations:

- **`MemorySink`** (default). Holds writes in in-memory arrays and an attachment map. `toBundle()` returns the synchronous in-memory `SessionBundle`. `readSidecar(id)` looks up the parallel sidecar map (only populated when `attach({}, { sidecar: true })` was called explicitly). Suitable for short captures and tests.
- **`FileSink`**. Writes ticks to `ticks.jsonl`, commands to `commands.jsonl`, executions to `executions.jsonl`, failures to `failures.jsonl`, markers to `markers.jsonl`, snapshots to `snapshots/<tick>.json`, sidecar attachments to `attachments/<id>.<ext>`, and `manifest.json` initially on `open()` and rewritten on `close()` with finalized metadata. All writes use synchronous Node `fs.writeFileSync` / `fs.appendFileSync`. Suitable for long captures.

The recorder's listener calls every sink method synchronously. There is no async path; if disk I/O on `FileSink` is slow, the engine's tick rate slows in lockstep — the user can pre-buffer in memory (`MemorySink`) and write once at end-of-session, or accept the I/O coupling.

A buffered-write proxy (`BufferedSink` wrapping any `SessionSink`) is acknowledged as future work but not in v1: it would batch writes and flush on a worker, mitigating tick-rate impact for production captures.

Future sinks (out of scope): `BlobStoreSink`, `S3Sink`, `IndexedDBSink` (browser). All would require either the buffered-write proxy or async-aware engine listeners.

## 9. SessionReplayer API

```ts
class SessionReplayer<TEventMap, TCommandMap, TDebug = JsonValue> {
  static fromBundle<TEventMap, TCommandMap, TDebug>(
    bundle: SessionBundle<TEventMap, TCommandMap, TDebug>,
    config: ReplayerConfig<TEventMap, TCommandMap>,
  ): SessionReplayer<TEventMap, TCommandMap, TDebug>;

  static fromSource<TEventMap, TCommandMap, TDebug>(
    source: SessionSource,
    config: ReplayerConfig<TEventMap, TCommandMap>,
  ): SessionReplayer<TEventMap, TCommandMap, TDebug>;

  readonly metadata: SessionMetadata;
  readonly markerCount: number;

  markers(): Marker[];
  markersAt(tick: number): Marker[];
  markersOfKind(kind: MarkerKind): Marker[];
  markersByEntity(ref: EntityRef): Marker[];           // exact id+generation match
  markersByEntityId(id: EntityId): Marker[];           // any generation; logs warning per call

  snapshotTicks(): number[];
  ticks(): number[];

  openAt(tick: number): World<TEventMap, TCommandMap>; // tick must be in [startTick, endTick] AND outside failure spans
  stateAtTick(tick: number): WorldSnapshot;
  eventsBetween(fromTick: number, toTick: number): SessionTickEntry<TEventMap, TDebug>[];
  // Inclusive on both ends. Throws BundleRangeError if either tick is outside [startTick, endTick].

  selfCheck(options?: SelfCheckOptions): SelfCheckResult;
  validateMarkers(): MarkerValidationResult;          // re-validates retroactive markers against recorded snapshots
}

interface ReplayerConfig<TEventMap, TCommandMap> {
  // Same world-construction config the original recording used.
  // The replayer needs registered components, validators, handlers, and systems
  // to reconstruct an equivalent World. Caller supplies a factory.
  // Per ADR 4 in §15, this factory is part of the determinism contract.
  worldFactory: (snapshot: WorldSnapshot) => World<TEventMap, TCommandMap>;
}

interface SelfCheckOptions {
  stopOnFirstDivergence?: boolean;     // default: false
  checkState?: boolean;                // default: true; deep-equal snapshots at each segment end
  checkEvents?: boolean;               // default: true; deep-equal per-tick event streams
  checkExecutions?: boolean;           // default: true; deep-equal per-tick CommandExecutionResult streams
}

interface SelfCheckResult {
  ok: boolean;
  checkedSegments: number;             // includes the initial-to-first-snapshot segment
  stateDivergences: StateDivergence[];
  eventDivergences: EventDivergence[];
  executionDivergences: ExecutionDivergence[];
}

interface StateDivergence {
  fromTick: number;
  toTick: number;
  expected: WorldSnapshot;
  actual: WorldSnapshot;
  firstDifferingPath?: string;
}

interface EventDivergence {
  tick: number;
  expected: Array<{ type: PropertyKey; data: unknown }>;
  actual: Array<{ type: PropertyKey; data: unknown }>;
}

interface ExecutionDivergence {
  tick: number;
  expected: CommandExecutionResult[];
  actual: CommandExecutionResult[];
}

interface MarkerValidationResult {
  ok: boolean;
  invalidMarkers: Array<{ markerId: string; reason: string }>;
}
```

### 9.1 `openAt(tick)` semantics

**Range and integrity preconditions:**

- If `tick < bundle.metadata.startTick` or `tick > bundle.metadata.endTick`, throws `BundleRangeError`.
- If `tick === bundle.metadata.startTick`, returns `worldFactory(bundle.initialSnapshot)` directly without replay.
- If `tick` falls inside or after a recorded `TickFailure` span (per `metadata.failureSpans`), throws `BundleIntegrityError` with `code: 'replay_across_failure'`. Replay across tick failures is out of scope (see §2; future spec extends `WorldSnapshot` to v6 to lift this).
- If `bundle.metadata.engineVersion` differs from the running engine version: warns when only patch / minor differs; throws `BundleVersionError` when major differs (cross-major-version replay is not supported).
- If `bundle.metadata.nodeVersion` differs from `process.version` major: warns. Math transcendentals (`Math.sin`, `Math.log`, etc.) are not bit-identical across V8 majors and may cause spurious divergence; replay still proceeds, but `selfCheck()` failures should be triaged with this in mind.

**Replay algorithm (clean span case):**

1. Find the latest snapshot `S` in `bundle.snapshots ∪ {bundle.initialSnapshot}` with `S.tick <= tick`.
2. Construct a fresh paused `World` via `worldFactory(S.snapshot)`.
3. For each tick `t` from `S.tick` to `tick - 1` inclusive:
   a. Drain every `RecordedCommand` from `bundle.commands` whose `submissionTick === t`, ordered by `sequence` ascending.
   b. For each, call `world.submit(rc.type, rc.data)` (or `submitWithResult` if the recorded result was from `submitWithResult`; the recorder distinguishes via a flag on `RecordedCommand`).
   c. Call `world.step()` (this advances the world from tick `t` to tick `t+1`, processing the queued commands at the start of `t+1` per `processCommands()` semantics).
4. After the loop, `world.tick === tick` and the world is paused. Return the world.

**Why this off-by-one is correct.** `CommandSubmissionResult.tick` records the *observable* tick at submission time, which equals `gameLoop.tick` *before* `runTick()` advances it. A command observed at `submissionTick === 0` is processed by the step that advances `0 → 1`. The replay loop submits at `t` and immediately steps `t → t+1`, matching this exactly. Replaying a bundle with `startTick === 0` and `targetTick === 5` runs five iterations (`t = 0, 1, 2, 3, 4`), each submitting that tick's commands then stepping; the resulting world is at `tick === 5`, which is the requested target.

**Submission ordering within a tick.** Multiple commands at the same `submissionTick` are replayed in `sequence` ascending, matching the recorder's capture order, matching the original engine queue order. Mid-tick submissions (which violate §11.1) are out of scope for replay; if a system calls `world.submit()` during `step()`, both the recorded submission and the replayed system's re-submission will fire — `selfCheck()` will surface this as a command-stream divergence.

The returned `World` is fully functional — caller can step further, inspect state, query events. This is the agent's primary debugging affordance.

### 9.2 Replay determinism guarantee

`openAt(tick)` is deterministic given the same `worldFactory`, the same engine major version, and the same Node major version (per H5 in iter-1 review). If the bundle's recorded snapshot at `tick` exists, replay produces a snapshot equal to it at every JSON path AND a per-tick event stream and execution stream identical to the recording's. Divergence in any of the three streams indicates a determinism contract violation per §11, or (rarely) a transcendental-Math difference across V8 majors.

The replayer does not silently mask divergence; `selfCheck()` is the explicit verification path.

### 9.3 `selfCheck()` algorithm

```
segments = [(initialSnapshot, snapshots[0]), (snapshots[0], snapshots[1]), ..., (snapshots[n-2], snapshots[n-1])]
// For scenario bundles, snapshots may have only one entry; in that case segments = [(initialSnapshot, snapshots[0])]
// For session bundles with no periodic snapshots, segments = [] and selfCheck() returns ok: true with checkedSegments: 0

For each (snapshotA, snapshotB) in segments:
  worldA = worldFactory(snapshotA.snapshot)
  for each tick t from snapshotA.tick to snapshotB.tick - 1:
    drain RecordedCommands at submissionTick === t (ordered by sequence)
    submit each via worldA
    worldA.step()
    if checkEvents: capture worldA.getEvents() and compare to bundle's tick entry events at t+1
    if checkExecutions: capture worldA.getCommandExecutionResults() (or via listener) and compare
  if checkState: actualB = worldA.serialize(); compare to snapshotB.snapshot via fast deep-equal
  record any divergences in the appropriate divergence array
  if stopOnFirstDivergence and any divergence recorded: break
```

Notes:

- **Initial-to-first-snapshot segment is included.** `bundle.initialSnapshot` is the implicit segment-0 start; `snapshots[0]` is the first periodic snapshot. This is critical: a determinism bug in the first 1000 ticks would otherwise go undetected.
- **Scenario bundles converge.** Scenario bundles produce `snapshots: [{ tick: capture.tick, snapshot: capture.snapshot }]` — exactly one entry — so `segments = [(initialSnapshot, snapshots[0])]`. selfCheck still verifies the full scenario span.
- **State equality** uses a fast recursive deep-equal that short-circuits on first mismatch and produces a best-effort dotted `firstDifferingPath` (`"components.position[42].x"`). Snapshot key ordering is stable per the snapshot serialization invariant (Map insertion order); two equal snapshots have equal key order, so deep-equal need not canonicalize. **Open Question 1** (§16) covers algorithm choice; the spec commits to recursive walk + short-circuit unless benchmarking exposes a problem.
- **Event/execution equality** is by ordered structural equality on the per-tick array. Order matters (a system that emits the same events in a different order is a determinism violation).
- **Cost.** selfCheck replays the full timeline once. For a 10000-tick bundle with 10 snapshots, that's 10 segments × 1000 ticks = 10000 ticks of replay plus deserialize/factory cost per segment. This is fundamentally O(N) in tick count and not avoidable; cost benchmarks live in §13.2.

## 10. Scenario Integration

`runScenario` is a function (not a class), so the spec adds a sibling adapter function:

```ts
export function scenarioCaptureToBundle<TEventMap, TCommandMap>(
  capture: ScenarioCapture<TEventMap, TCommandMap>,
  options?: { sourceLabel?: string; nodeVersion?: string },
): SessionBundle<TEventMap, TCommandMap, WorldDebugSnapshot>;
```

The function takes a `ScenarioCapture` (already produced by `runScenario`) plus optional metadata overrides and emits a `SessionBundle`. Translation:

- `metadata.sourceKind = 'scenario'`, `metadata.sourceLabel = options?.sourceLabel ?? scenario.name`.
- `metadata.engineVersion` ← package.json version at translate time. `metadata.nodeVersion` ← `options?.nodeVersion ?? process.version`. `metadata.startTick` ← `0` (scenario start tick by convention). `metadata.endTick` ← `capture.tick` (final tick when checks ran). `metadata.durationTicks` ← `capture.tick`.
- `initialSnapshot` ← the snapshot `ScenarioCapture.history.initialSnapshot` — note that this is the **post-setup** state, not pre-setup. `runScenario` calls `history.clear()` after `setup` runs (per `src/scenario-runner.ts:175`), which rebases `initialSnapshot` to the post-setup, pre-run state. Setup-phase commands and diffs are intentionally discarded by ScenarioRunner. **Implication:** replaying a scenario-derived bundle reproduces the run from the post-setup state forward; consumers that want to replay from raw `World` construction must reproduce `setup()` in their `worldFactory` before deserializing the snapshot.
- `ticks` ← `ScenarioCapture.history.ticks`.
- `commands` ← derived from `ScenarioCapture.history.commands`. **Critical:** `WorldHistoryRecorder` records `CommandSubmissionResult` (no payload), so a scenario-derived bundle is NOT replayable unless the scenario was set up with a custom history recorder that captures `RecordedCommand` (or unless the engine adds a `recordCommandPayloads: true` option to `WorldHistoryRecorder`). The simplest path in v1: `scenarioCaptureToBundle()` accepts an additional optional `commands?: RecordedCommand[]` parameter that the scenario author supplies if they want a replayable bundle. Without payloads, the bundle is diagnostic-only (markers, snapshots, ticks, executions) and `openAt(tick)` throws `BundleIntegrityError` with `code: 'no_replay_payloads'`.
- `executions` ← `ScenarioCapture.history.executions`.
- `failures` ← `ScenarioCapture.history.failures`.
- `snapshots` ← `[{ tick: capture.tick, snapshot: capture.snapshot }]`. Single entry; selfCheck will check the segment from `initialSnapshot` to this final snapshot. Future enhancement could add periodic snapshots via a scenario option.
- `markers` ← one assertion marker per scenario check outcome:
  ```
  { id, tick: capture.tick, kind: 'assertion', provenance: 'engine',
    text: check.name, data: { passed: outcome.passed, failure: outcome.failure } }
  ```
  Note: `ScenarioCheckOutcome` does NOT currently track per-check tick (verified at `src/scenario-runner.ts:44-48`). All assertion markers therefore share `tick === capture.tick`. A future spec extends `ScenarioCheckOutcome` to track per-check tick, after which the adapter can place each marker at its actual check tick.
- `attachments` ← empty array; scenarios have no attachment producer.

**Recommended scenario configuration for replayable bundles:**

```ts
const capture = await runScenario({
  name: 'my-scenario',
  setup: ...,
  steps: ...,
  checks: ...,
  history: { capacity: Number.MAX_SAFE_INTEGER, captureCommandPayloads: true },
  // captureCommandPayloads is a new opt-in flag on WorldHistoryRecorder (or a new
  // SessionRecorder attached for the run); see Open Question §16.6.
});
const bundle = scenarioCaptureToBundle(capture, { sourceLabel: 'my-scenario' });
```

**Bounded history truncates long scenarios.** `WorldHistoryRecorder` defaults to capacity 64 ticks. Scenarios longer than that with default config silently truncate, producing a non-replayable bundle. Document this prominently in `docs/guides/scenario-runner.md` per §14.

`ScenarioCapture` itself is unchanged; existing consumers continue to work. `scenarioCaptureToBundle()` does not require `SessionRecorder`; it operates on the data ScenarioRunner already has plus optional supplied command payloads.

## 11. Determinism Contract

### 11.1 User obligations

For replay to produce the same state as recording, user code MUST:

1. **Route all input through `world.submit()` from outside the tick loop.** External code outside a system phase submits commands and lets registered handlers perform mutations. Direct external mutation via `world.setComponent` / `world.setPosition` / `world.setState` / `world.addResource` between ticks breaks replay because the recorder only captures commands, not direct mutation calls.

2. **Do NOT call `world.submit()` from inside a system, command handler, event listener, or any code that runs during `world.step()`** (the "no mid-tick submit" rule). Mid-tick submissions get captured by the recorder AND get re-issued by the system on replay, double-submitting the command. The engine does not enforce this in v1; selfCheck surfaces the violation as an execution-stream divergence. If a system needs to enqueue a follow-up command, it should emit an event that an *external* coordinator picks up and submits between ticks.

3. **Route all randomness through `world.random()`.** `Math.random()`, `crypto.getRandomValues()`, or any non-engine RNG produces values not captured by the snapshot's RNG state and therefore not reproducible during replay.

4. **Validators must be pure.** Command validators registered via `world.registerValidator()` run synchronously in `submitWithResult()` *before* the command is queued, with the live `World` available. Validators MUST be deterministic functions of world state and the command payload — no side effects, no I/O, no `Math.random()`, no `Date.now()`. A side-effecting validator produces uncaptured mutations that break replay even when all other contract clauses are satisfied.

5. **Avoid wall-clock time inside systems.** `Date.now()`, `performance.now()`, or any external time source is non-deterministic across machines and runs. The canonical clock is `world.tick`; if a system needs simulated time, multiply the tick by a fixed `tickDurationMs` from world config.

6. **Iterate ordered collections only.** `Map` (insertion-ordered) and arrays are safe. `Set` is insertion-ordered for primitive keys but order can shift if elements are removed and re-added; prefer `Map<key, true>` for sets that drive simulation. Object key iteration is engine-version-dependent and SHOULD be avoided. Engine query helpers (component-store iteration, spatial-grid neighbors, path queues) iterate in deterministic order; user code may rely on engine-side determinism but must not introduce its own non-deterministic iteration.

7. **No environment-driven branching.** No `process.env`, `globalThis`, browser APIs, file system reads, or network calls inside a tick.

8. **System and component registration order must match between recording and replay.** The `worldFactory` provided to `SessionReplayer` is part of the determinism contract (per ADR 4 in §15); it must reproduce the same `registerComponent`, `registerValidator`, `registerHandler`, and `registerSystem` calls in the same order as the recording-time setup. Drift produces selfCheck divergences indistinguishable from genuine determinism violations.

9. **Replay determinism requires identical engine major version AND identical Node/V8 major version.** Math transcendentals (`Math.sin`, `Math.cos`, `Math.log`, etc.) are not bit-identical across V8 majors. Cross-runtime replay may diverge on transcendental-heavy systems even when all other obligations are met. The bundle records `metadata.engineVersion` and `metadata.nodeVersion`; `SessionReplayer` warns when minor differs and refuses cross-major-version replay (per H5 in iter-1 review).

The engine does NOT structurally enforce these obligations in v1. Strict-mode enforcement is a future spec (§17 entry #6). This spec relies on the replay self-check (§9.3) to surface violations.

### 11.2 Replay self-check

`SessionReplayer.selfCheck()` is the verification mechanism. If recording violates any contract clause, replay diverges from the recorded run at the first affected tick after the violation, and `selfCheck()` reports the divergence in one of three categories: `stateDivergences` (snapshot deep-equal mismatch), `eventDivergences` (per-tick event stream mismatch), or `executionDivergences` (per-tick command execution result mismatch). All three are reported by default; pass `{ checkState: false, checkEvents: false, checkExecutions: false }` to selectively disable.

`selfCheck()` is **mandatory in CI**: per §13.3 and §18, every existing scenario in the engine test suite runs `selfCheck()` on its produced bundle as part of `npm test`. selfCheck failures fail the test suite. This converts the documented contract into an enforced-by-corpus gate without requiring strict-mode engine changes. For live captures (long sessions outside CI), selfCheck is an explicit opt-in to manage cost.

### 11.3 Documentation surface

The contract is documented in `docs/guides/session-recording.md` (new) with concrete examples of each violation pattern (one example per clause 1–9). `MarkerValidationError` and the three divergence types include `referencesContractClause: number` (1–9) for cross-referencing back to the offending clause.

## 12. Error Handling

| Error                     | When                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `MarkerValidationError`   | `addMarker()` receives a marker that fails §6.1 rules. Includes `details` naming the field and `referencesContractClause`. |
| `RecorderClosedError`     | `connect()` after `disconnect()`; `addMarker()` / `attach()` / `takeSnapshot()` called after `disconnect()`. |
| `SinkWriteError`          | A sink write fails (FileSink: ENOSPC, EACCES, etc.). Wraps the underlying I/O error. The recorder catches and sets `metadata.incomplete = true` rather than propagating, but the error is observable via the sink's lifecycle and the bundle's `incomplete` flag. |
| `BundleVersionError`      | `SessionReplayer.fromBundle/fromSource` receives a bundle with a `schemaVersion` it does not understand, OR a bundle with `engineVersion` whose major differs from the running engine. |
| `BundleRangeError`        | `openAt(tick)` / `eventsBetween(...)` called with a tick outside `[metadata.startTick, metadata.endTick]`. |
| `BundleIntegrityError`    | Loaded bundle has missing snapshots, broken attachment refs, non-monotonic tick entries, an attempt to replay across a recorded `TickFailure` (`code: 'replay_across_failure'`), or a scenario bundle without command payloads being asked to replay (`code: 'no_replay_payloads'`). Stale entity refs in markers are NOT integrity errors — markers are point-in-time annotations and may legitimately reference entities that no longer exist by bundle finalization. |
| `ReplayHandlerMissingError` | `openAt()` runs a `RecordedCommand` whose `type` has no registered handler in the replayer's `worldFactory`-built world. Distinguishes "world factory drift" from "determinism violation" (the prior `ReplayDivergenceError` name was ambiguous). |

All errors extend a `SessionRecordingError` base class for `instanceof` discrimination. Engine fail-fast discipline applies: errors propagate, are not silently swallowed (except `SinkWriteError` per the recorder's per-§7.2 handling).

## 13. Testing Strategy

The engine's existing test discipline (Vitest, TDD per AGENTS.md) applies. Test coverage targets:

### 13.1 Unit tests

- **`SessionRecorder`**: listener wiring; submit/submitWithResult interception captures `RecordedCommand` with payload; lifecycle (construct/connect/disconnect/double-connect-noop/post-disconnect-throws/connect-after-disconnect-throws); single-use semantics; tolerance of destroyed-world during disconnect; marker validation (each §6.1 rule has a test pair: valid + invalid; live vs retroactive paths); attachment ID generation and dataUrl/sidecar policy selection; snapshot cadence (manual + automatic); debug capture integration; multiple recorders attached to one world.
- **`RecordedCommand`**: round-trip (type + data + result preserved); ordering within a tick by sequence; submitWithResult variant flag.
- **`SessionBundle` schema**: strict-JSON round-trip via `JSON.stringify` + `JSON.parse`; rejection of malformed bundles by `assertJsonCompatible`; sidecar attachment refs are present in JSON but bytes are NOT.
- **`MemorySink` / `MemorySource`**: in-memory accumulation, `toBundle()` correctness, sync method semantics, `readSidecar` for sidecar-mode attachments, sidecar opt-in flag.
- **`FileSink` / `FileSource`**: full file layout (manifest + 5 jsonl streams + snapshots/ + attachments/); manifest rewrites on close; JSONL append-only invariant; attachment policy (dataUrl under cap, sidecar over cap); recovery from `incomplete: true` bundles (read prefix); tolerance of partial JSONL line on read.
- **`Marker`**: kind enum exhaustiveness; `EntityRef` validation (id+generation matching); cells; tickRange; opaque `data` round-trip; provenance discrimination.
- **`scenarioCaptureToBundle()`**: assertion markers produced one per check outcome with `provenance: 'engine'`; sourceKind/sourceLabel set; metadata fields populated; bundle without command payloads throws `BundleIntegrityError` on `openAt()`.

### 13.2 Integration tests

- **Record → replay → state-equal.** Build a small scenario (10 entities, 1000 ticks, varied commands including accepted+rejected, multiple validators), record with `snapshotInterval: 100`, serialize the bundle, deserialize via `SessionReplayer.fromBundle`, call `openAt(N)` for representative ticks (initial, mid-segment, snapshot boundary, last tick), assert `world.serialize()` deep-equals the corresponding recorded snapshot.
- **MemorySink ↔ FileSink parity.** Record the same scenario via both sinks; assert the resulting bundles are structurally equal modulo `attachments[].ref` (dataUrl vs sidecar). Replay both; assert identical openAt results.
- **Scenario integration.** Convert an existing scenario test (e.g. one of the existing `runScenario(...)` tests) to also assert `scenarioCaptureToBundle(capture)` produces a valid bundle with one `kind: 'assertion'` marker per check outcome, matching `outcome.passed` and `outcome.failure`.
- **Long capture smoke.** 10000-tick session with 50 commands per tick, default snapshot cadence (10 snapshots), `MemorySink`. Assert bundle loads, `selfCheck()` passes, `openAt` for any tick completes within reasonable time. Throughput target: `openAt()` walking a single segment runs ≥ 5x recording throughput; `selfCheck()` over N segments scales linearly. Drop the conflated multiplier.
- **Cross-snapshot replay.** `openAt(tick)` where `tick` falls between two snapshots — verify the replayer correctly walks from the prior snapshot through recorded commands.

### 13.3 Self-check tests

Each clause of §11.1 (1–9) gets a paired test: clean scenario passes selfCheck; deliberately violating scenario surfaces a divergence in the expected category (state / event / execution).

- **Clause 1: external-only mutation.** Clean: command-driven mutation only. Violation: a setup callback calls `world.setComponent` between ticks during a recording. Expect state divergence.
- **Clause 2: no mid-tick submit.** Clean: systems do not submit. Violation: a system calls `world.submit()`. Expect command-stream / execution divergence on replay.
- **Clause 3: routed randomness.** Clean: systems use `world.random()`. Violation: a system uses `Math.random()`. Expect state divergence.
- **Clause 4: pure validators.** Clean: validators are pure. Violation: a validator calls `world.setComponent` (mutation side effect). Expect state divergence.
- **Clause 5: no wall-clock.** Clean: systems use `world.tick`. Violation: a system uses `Date.now()`. Expect state divergence.
- **Clause 6: ordered iteration.** Clean: Maps/arrays. Violation: a system iterates an unordered Set whose contents differ across runs. Expect state divergence.
- **Clause 7: no env branching.** Clean: pure logic. Violation: a system reads `process.env`. Expect state divergence (or skip if env is identical, which is the common case).
- **Clause 8: registration order.** Clean: factory matches recorder. Violation: factory swaps two system registration order. Expect state divergence at the affected tick.
- **Clause 9: cross-major-version.** Skipped on identical-version environments. When run on differing Node majors, expects either pass (no transcendentals used) or graceful selfCheck divergence with a flagged tick.

Plus:

- **Determinism upheld** baseline: a clean scenario; `selfCheck()` reports `ok: true` with empty divergence arrays.
- **`stopOnFirstDivergence`**: with deliberate violations at multiple snapshot pairs and the option set, assert only the first is reported.
- **selfCheck includes initial-to-first-snapshot segment.** Recording where a determinism violation occurs in the first 100 ticks (before the first periodic snapshot at `snapshotInterval: 1000`) — selfCheck must surface it because the segment `(initialSnapshot, snapshots[0])` is checked.
- **selfCheck on scenario bundles.** A scenario bundle has `snapshots: [final]` only; selfCheck checks `(initialSnapshot, final)` — exactly one segment.

### 13.4 Failure-mode tests

- **Sink write failure during recording.** Inject ENOSPC into `FileSink.writeTick`; recorder catches, sets `metadata.incomplete = true`, sink is closed, bundle is consumable as a prefix.
- **Marker validation:** every error code in §12 has at least one test triggering it.
- **Bundle version mismatch:** replayer rejects with `BundleVersionError` for `schemaVersion: 99`.
- **Bundle range error:** `openAt(metadata.endTick + 1)` throws `BundleRangeError`.
- **Replay across tick failure:** record a poisoned-tick scenario; `openAt(failureTick)` throws `BundleIntegrityError(code: 'replay_across_failure')`. Bundle still inspectable for ticks before the failure.
- **Replay handler missing:** `worldFactory` registers a different command set than the recording; `openAt(N)` throws `ReplayHandlerMissingError` naming the missing command type.
- **Engine version mismatch:** bundle with `engineVersion: '0.6.0'` against running 0.7.x — warning via `console.warn` (minor differs); cross-major (0.x → 1.x) throws `BundleVersionError`.
- **Node version mismatch:** bundle with mismatched `nodeVersion` major — warning logged but replay proceeds; selfCheck catches actual divergences.

### 13.5 CI gate (per N3 in iter-1 review)

Every existing scenario in the engine test suite (under `tests/scenarios/`) is wrapped with `scenarioCaptureToBundle(capture)` followed by `replayer.selfCheck()`. selfCheck failures fail `npm test`. This converts the documented determinism contract into a gate enforced by the engine's existing scenario corpus, without strict-mode engine changes.

## 14. Documentation Surface

This spec lands the following doc updates per the `AGENTS.md` Documentation discipline:

**Always-update:**

- `docs/changelog.md` — new entry describing the SessionRecorder/SessionReplayer/SessionBundle/SessionSink/SessionSource/Marker/RecordedCommand public API additions and the `scenarioCaptureToBundle()` adapter function.
- `docs/devlog/summary.md` — one line per shipped commit (recorder/replayer/sink/scenario-integration likely ship as multiple commits on the chained branch).
- `docs/devlog/detailed/<latest>.md` — full per-task entries.
- `package.json` — version bumps per the per-commit policy in `AGENTS.md` (current version v0.7.6). All additions in this spec are additive and non-breaking, so each shipped commit gets a `c`-bump (e.g., v0.7.7 for the recorder commit, v0.7.8 for the replayer commit, and so on). No `b`-bump expected for this spec.

**API surface:**

- `docs/api-reference.md` — new top-level sections for `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`, `SessionSource`, `MemorySink`, `FileSink`, `Marker`, `MarkerKind`, `MarkerProvenance`, `MarkerRefs`, `RecordedCommand`, `AttachmentDescriptor`, `SessionMetadata`, `SelfCheckOptions`, `SelfCheckResult`, `StateDivergence`, `EventDivergence`, `ExecutionDivergence`, `SessionRecordingError` and subclasses (`MarkerValidationError`, `RecorderClosedError`, `SinkWriteError`, `BundleVersionError`, `BundleRangeError`, `BundleIntegrityError`, `ReplayHandlerMissingError`); plus the `scenarioCaptureToBundle()` standalone function.
- `README.md` — Feature Overview table row for "Session recording & replay"; Public Surface bullets for the new top-level exports.
- `docs/README.md` — index link to the new `session-recording.md` guide.

**Architectural:**

- `docs/architecture/ARCHITECTURE.md` — Component Map rows for SessionRecorder, SessionReplayer, SessionBundle, SessionSink/SessionSource; Boundaries paragraph clarifying the dual-recorder structure (WorldHistoryRecorder = rolling debug; SessionRecorder = persistent archive). Tick-lifecycle ASCII updated to show `submit()` interception by SessionRecorder when attached.
- `docs/architecture/drift-log.md` — entry: dual recorders, motivation, alternatives considered.
- `docs/architecture/decisions.md` — Key Architectural Decision row: "Approach 2 — separate SessionRecorder alongside WorldHistoryRecorder rather than extending in place" with the trade-offs.

**Topical guides (mandatory updates per AGENTS.md "Update if applicable" rules):**

- `docs/guides/session-recording.md` (new) — recording quickstart, sink choice, marker authoring, replay, self-check, full §11 determinism contract with one concrete violation example per clause 1–9.
- `docs/guides/scenario-runner.md` (existing) — new section on `scenarioCaptureToBundle()`, the `WorldHistoryRecorder` capacity caveat for replayable bundles, and how scenario runs integrate with the broader recording surface.
- `docs/guides/debugging.md` (existing) — pointer to the new session-recording guide for replay-based debugging; expand the diagnostic flow to include "load bundle → jump to marker → step forward."
- `docs/guides/concepts.md` (existing) — add `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`/`SessionSource` to the standalone-utilities list; tick-lifecycle ASCII updated to show `submit()` interception by recorder when attached.
- `docs/guides/ai-integration.md` (existing) — add a section on session recording as the foundation of AI-driven debugging: agent loads bundle, queries markers, opens at any tick, inspects state programmatically. This entire feature is the substrate of the AI-first roadmap; the guide must reflect it.
- `docs/guides/getting-started.md` (existing) — add session-recording to the tutorial-grade feature list; brief example of `new SessionRecorder({ world })` → run → `toBundle()`.
- `docs/guides/building-a-game.md` (existing) — add a "Recording sessions for debugging" section covering when to record, how to plug into game code, and how to share bundles with agents/teammates.

**Doc-review verification:**

- Run the `doc-review` skill before declaring complete; grep for removed/renamed APIs to ensure no doc drift.
- Multi-CLI code review prompt explicitly instructs reviewers to verify doc accuracy (per `AGENTS.md` Documentation discipline).

## 15. Architectural Decisions

### ADR 1: Separate `SessionRecorder` rather than extend `WorldHistoryRecorder`

**Decision:** Introduce `SessionRecorder` as a new primitive alongside `WorldHistoryRecorder`. Do not extend the existing recorder.

**Context:** `WorldHistoryRecorder` is an in-memory bounded rolling buffer (default capacity 64) with a range-summary helper, designed for runtime debugging and AI agent inspection during a live run. Session recording needs unbounded capture, sink-based streaming, marker API, and a replayer companion. Two genuinely different use cases.

**Alternatives considered:**

- **Extend `WorldHistoryRecorder` in place.** Rejected: bloats the existing recorder API; conflates rolling-buffer-with-summary semantics with full-archive-with-replay semantics; risks regressing existing debug consumers (`ScenarioRunner`, `WorldDebugger`).
- **Refactor: extract a `TickStream` primitive both recorders share.** Rejected for v1: optimizes for unknown future requirements (synthetic playtest hasn't been specced yet); pays a refactor cost upfront for benefit that depends on details not yet defined. Reconsider when the third consumer materializes and forces the abstraction.

**Consequences:**

- ~80–100 LOC of structurally similar listener wiring (`onDiff`, `onCommandResult`, `onCommandExecution`, `onTickFailure`) plus per-tick `getEvents()`/`getMetrics()` collection plus `cloneJsonValue` discipline. Acceptable in v1; flagged honestly so the future "extract `TickStream` when third consumer materializes" trigger isn't gated on a wrong cost basis.
- Both recorders can attach to the same `World` simultaneously without interference (each subscribes independently and chains the `submit()` wrap).
- Future synthetic playtest spec will likely use `SessionRecorder` directly, not `WorldHistoryRecorder`.

### ADR 2: Bundle format as a first-class shared type, not a recorder-private shape

**Decision:** `SessionBundle` is exported as a strict-JSON shared type and is identical regardless of producer. Both `SessionRecorder.toBundle()` and `scenarioCaptureToBundle()` emit the same shape; `MemorySink.toBundle()` and `FileSink.toBundle()` produce structurally equal bundles modulo `attachments[].ref` (dataUrl vs sidecar). Sidecar binary payloads live outside the JSON shape and are accessed via `source.readSidecar(id)`. The replayer accepts `SessionBundle` regardless of producer.

**Context:** Recording sessions and running scenarios both produce "a deterministic timeline with markers." Forcing two formats would require the replayer/viewer to handle both, doubling validation surface and confusing consumers.

**Consequences:**

- One bundle format ages collectively. Schema bumps coordinate across all producers.
- Synthetic playtest (future spec) will produce the same bundle format; viewer (future spec) handles one input shape.
- Producer is identified via `metadata.sourceKind` for consumers that care about provenance.

### ADR 3: Determinism contract documented, not enforced (in this spec)

**Decision:** Document user obligations for replay determinism. Do not add engine-level enforcement (e.g., a strict-mode flag that rejects external mutations). Provide `SessionReplayer.selfCheck()` as the verification mechanism.

**Context:** Strict-mode enforcement is a behaviorally invasive engine-wide change (audit every mutation method, gate on inside-tick state, provide escape hatches for setup/deserialize). Conflating it with session recording would make this spec significantly larger and the implementation riskier.

**Alternatives considered:**

- **Strict mode in this spec.** Rejected: scope creep; would block the spec on resolving the strict-mode design problem.
- **Best-effort enforcement (warnings only).** Rejected: ambiguous; either enforce or don't.

**Consequences:**

- Replay can silently produce wrong state if user violates the contract and never runs `selfCheck()`. Mitigated by §13.5 CI gate (every existing scenario runs through selfCheck on every `npm test`).
- Strict mode can land later as a focused spec without affecting the recorder/replayer API.

### ADR 4: `worldFactory` is part of the determinism contract

**Decision:** The `worldFactory` callback supplied to `SessionReplayer` is part of the determinism contract. Drift between record-time setup and replay-time `worldFactory` produces selfCheck divergences indistinguishable from genuine determinism violations in user code.

**Context:** Bundle replay requires reconstructing the recording-time component / validator / handler / system registration set, in the same order, before deserializing the snapshot. None of these can be serialized into the bundle (functions are not JSON-compatible). The factory is the only mechanism for the replayer to obtain a `World` whose registration matches the recording.

**Implications:**

- The factory must reproduce *exactly* the same `registerComponent` / `registerValidator` / `registerHandler` / `registerSystem` calls in the same order as the recording-time setup.
- Missing or extra registration is silently treated as a selfCheck divergence ("user code is non-deterministic") rather than as a clear "factory drift" error. This is a real ergonomic floor.
- For the spec's stated goal of agent-driven debugging, a consumer who lacks access to the original codebase cannot replay a bundle. There is no "load and look at marker N" affordance without the factory.

**Mitigations in v1:**

- §11.1 clause 8 documents the factory obligation explicitly.
- `ReplayHandlerMissingError` (§12) distinguishes "world factory drift on a known command type" from generic determinism divergence.
- Recommended pattern: scenario authors and game projects export their setup function so it can be re-imported by replay code.

**Future enhancement (out of scope for v1):**

A future spec may persist a registration manifest in the bundle (component names + ordering, validator names, handler names, system names + ordering) so the replayer can fail fast with a clear "factory drift" diagnostic when a name doesn't match. This is shape-of-graph validation only — the factory still supplies behavior; the manifest just verifies the *shape* matches.

## 16. Open Questions / Deferred Decisions

The following are intentionally left for the writing-plans phase or for future specs. They are not blocking spec acceptance.

1. **Snapshot equality algorithm.** §9.3 commits to recursive walk + short-circuit (the alternative — canonical-JSON hash — loses `firstDifferingPath`). Snapshot key ordering is stable per the snapshot serialization invariant (Map insertion order), so deep-equal need not canonicalize. Benchmark on the long-capture smoke test will validate throughput target.
2. **Versioning policy for breaking bundle changes.** When `schemaVersion` bumps to 2, do we ship a migrator (`migrate(bundle, fromVersion, toVersion)`) or simply reject older versions? Decision deferred to the first time a bump is needed.
3. **Default `snapshotInterval` of 1000.** Validated by the long-capture smoke test in §13.2. May be tuned based on representative bundle sizes.
4. **`ReplayerConfig.worldFactory` ergonomics.** Per ADR 4, the factory is part of the determinism contract. A future spec may add a registration-manifest shape-check to surface factory drift with a clearer diagnostic; not v1.
5. **Bundle command/execution/marker stream sharding.** A 10000-tick × 50-command-per-tick session produces 500K command entries; `commands.jsonl` would be hundreds of MB. v1 ships single-file streams; future enhancement may rotate at a configurable size threshold (e.g. `commands.0001.jsonl`, `commands.0002.jsonl`). Manifest already references streams by filename, so adding rotation is non-breaking.
6. **`captureCommandPayloads` flag on `WorldHistoryRecorder`.** §10 calls for `WorldHistoryRecorder` to optionally capture `RecordedCommand` (with payload) instead of just `CommandSubmissionResult` so scenario-derived bundles can be replayable without a separate `SessionRecorder`. This is a minor additive change to `WorldHistoryRecorder`'s constructor — implement during the spec build-out. Alternative: `runScenario` accepts a `bundle?: SessionRecorder` option that does the dual-recording. Final decision in implementation phase.
7. **`BufferedSink` proxy.** A future enhancement that wraps any `SessionSink` and batches writes asynchronously to mitigate tick-rate impact for production captures. Not v1 because it requires either an explicit drain policy (write-on-tick-boundary, write-on-marker, max-buffer-size) or a complete async-aware listener restructure. Worth specifying when synthetic playtest needs it.

## 17. Future Specs (Backlog)

This spec is the substrate. Follow-up specs in dependency order:

| #  | Spec                                              | Depends on   | Status   |
| -- | ------------------------------------------------- | ------------ | -------- |
| 2  | Game-side annotation UI (hotkey, gestures, refs)  | This spec    | Proposed |
| 3  | Synthetic playtest harness (policies, runners)    | This spec    | Proposed |
| 4  | Standalone bundle viewer (scrubber, agent driver) | This spec    | Proposed |
| 5  | Counterfactual replay / fork (substitution, divergence) | This spec | Proposed |
| 6  | Engine strict-mode determinism enforcement        | Independent  | Proposed |
| 7  | Bundle search / corpus index                      | #3, #4       | Proposed |
| 8  | Behavioral metrics over corpus                    | #3           | Proposed |
| 9  | AI playtester agent                               | #3           | Proposed |

Vision and rationale for the full backlog are in `docs/design/ai-first-dev-roadmap.md`.

## 18. Acceptance Criteria

This spec is implemented when:

- All six new symbols (`SessionRecorder`, `SessionReplayer`, `SessionBundle`, `SessionSink`/`SessionSource`, `Marker`, `RecordedCommand`) are exported from `src/index.ts` with full TypeScript types, plus the `scenarioCaptureToBundle()` function.
- `MemorySink` (implementing `SessionSink & SessionSource`) and `FileSink` (implementing `SessionSink & SessionSource`) ship as concrete implementations.
- `scenarioCaptureToBundle()` is added and produces replayable bundles with `provenance: 'engine'` assertion markers, given a scenario configured to capture command payloads.
- §13 test coverage is in place; all four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
- `selfCheck()` correctly identifies deliberately introduced determinism violations across each clause of §11.1.
- §13.5 CI gate is wired: every existing scenario in the engine test suite passes selfCheck during `npm test`.
- All §14 doc updates land in the same merge.
- A multi-CLI code review (Codex / Gemini / Opus) reaches consensus per `AGENTS.md`. Two-CLI consensus is acceptable when one CLI is unreachable (quota exhaustion, model rejection).
- The branch is rebase-clean against `main` and ready to merge on user authorization.
