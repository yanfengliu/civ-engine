# Session Recording & Replay

Capture deterministic, replayable bundles of any `World` run. Inspect a recording at any tick, verify replay integrity, annotate moments, and use scenarios as replayable test artifacts.

The session-recording subsystem is the substrate for civ-engine's AI-first debugging vision. It allows agents (and humans) to load a recorded session, jump to a marked tick, inspect game state, replay forward, and verify determinism.

See `docs/threads/done/session-recording/DESIGN.md` for the full design spec and `docs/design/ai-first-dev-roadmap.md` for the broader vision.

## Quickstart

```ts
import { World, SessionRecorder, SessionReplayer, MemorySink } from 'civ-engine';

// 1. Record a session
const world = new World({ gridWidth: 64, gridHeight: 64, tps: 60 });
const sink = new MemorySink();
const recorder = new SessionRecorder({ world, sink });
recorder.connect();

// ...run your game / scenario...
recorder.addMarker({ kind: 'annotation', text: 'unit got stuck' });

recorder.disconnect();
const bundle = recorder.toBundle();

// 2. Replay
const replayer = SessionReplayer.fromBundle(bundle, {
  worldFactory: (snap) => {
    const w = new World({ gridWidth: 64, gridHeight: 64, tps: 60 });
    // re-register components/handlers/validators/systems on `w` here, then:
    w.applySnapshot(snap);
    return w;
  },
});

// Open the world at any tick, inspect freely
const stuckTick = replayer.markersOfKind('annotation')[0].tick;
const inspectable = replayer.openAt(stuckTick);
console.log(inspectable.tick, inspectable.getEvents());
```

## Sinks

Two built-in sinks; both implement `SessionSink & SessionSource`.

| Sink         | Use case                                      |
| ------------ | --------------------------------------------- |
| `MemorySink` | Default. In-memory; `toBundle()` returns sync. Best for short captures and tests. |
| `FileSink`   | Disk-backed. Streams to a directory layout (manifest + jsonl streams + snapshots/ + attachments/). Best for long captures and production. |

```ts
import { MemorySink, FileSink } from 'civ-engine';

const memory = new MemorySink();
const memoryWithSidecars = new MemorySink({ allowSidecar: true });
const file = new FileSink('/path/to/bundle-dir');
```

`FileSink` defaults to **sidecar** for attachments (disk-backed sink keeps blobs as files). Pass `attach(blob, { sidecar: false })` to opt into manifest embedding for very small attachments.

`MemorySink` defaults to **dataUrl** for under-threshold attachments (default 64 KiB). Oversize attachments throw `SinkWriteError(code: 'oversize_attachment')` unless constructed with `MemorySinkOptions.allowSidecar: true`.

## Indexing FileSink Bundles

Use `BundleCorpus` after FileSink writers have closed to list, filter, and lazily reload disk-backed bundles:

```ts
import { BundleCorpus } from 'civ-engine';

const corpus = new BundleCorpus('/path/to/corpus', { scanDepth: 'all' });
const failedSynthetic = corpus.entries({
  sourceKind: 'synthetic',
  failedTickCount: { min: 1 },
});

for (const entry of failedSynthetic) {
  const source = entry.openSource();
  console.log(entry.key, source.readSnapshot(entry.metadata.startTick));
}
```

`BundleCorpus.entries()` reads only `manifest.json` metadata and manifest attachment descriptors. It does not read JSONL streams, snapshots, or sidecar bytes until you call `entry.openSource()`, `entry.loadBundle()`, or `corpus.bundles()`. See `docs/guides/bundle-corpus-index.md` for the full query surface.

## Markers

Three kinds:

| Kind         | Use                                                   | Provenance                |
| ------------ | ----------------------------------------------------- | ------------------------- |
| `annotation` | Human-authored note ("unit got stuck here")           | always `'game'`           |
| `assertion`  | Programmatic check (engine-emitted from scenarios)    | `'engine'` (from adapter) |
| `checkpoint` | Developer-marked interesting moment ("decision point") | always `'game'`           |

```ts
recorder.addMarker({
  kind: 'annotation',
  text: 'these units are stuck',
  refs: {
    entities: [{ id: 42, generation: 0 }, { id: 51, generation: 0 }],
    cells: [{ x: 12, y: 8 }],
  },
});
```

Marker references use `EntityRef` (id + generation) to handle entity recycling. The engine validates entity refs against the live `EntityManager` for live-tick markers (`marker.tick === world.tick`); retroactive markers (`marker.tick < world.tick`) skip liveness validation and are stamped `validated: false`.

## Replay

```ts
const replayer = SessionReplayer.fromBundle(bundle, { worldFactory });

// Jump to a specific tick — returns a paused, fully-functional World
const inspectable = replayer.openAt(1234);
console.log(inspectable.getComponent(42, 'position'));

// Step forward to watch the bug unfold
inspectable.step();
inspectable.step();
console.log(inspectable.getEvents());

// Filter markers by kind/entity
const annotations = replayer.markersOfKind('annotation');
const issuesForUnit42 = replayer.markersByEntity({ id: 42, generation: 0 });
```

The `worldFactory` is part of the determinism contract (per ADR 4 in the design spec). It must:

1. Construct a fresh `World` with the same registrations (components, handlers, validators, systems) as the recording.
2. Call `world.applySnapshot(snap)` to load the snapshot's state in-place. **Do NOT** use `World.deserialize(snap)` followed by re-registration — the deserialize path returns a fresh world with component stores already populated from the snapshot, and subsequent `registerComponent` calls would throw on duplicates.

```ts
function setupBehavior(world: World): void {
  world.registerComponent('position');
  world.registerHandler('move', moveHandler);
}

const replayer = SessionReplayer.fromBundle(bundle, {
  worldFactory: (snap) => {
    const w = new World(config);
    setupBehavior(w);            // register first
    w.applySnapshot(snap);       // then load state in-place
    return w;
  },
});
```

## selfCheck

`SessionReplayer.selfCheck()` walks consecutive snapshot pairs and verifies that replay produces the same state, events, and command executions as the recording. Divergences are reported in three categories:

```ts
const result = replayer.selfCheck();
result.ok;                  // false if any divergence found
result.checkedSegments;     // count of snapshot pairs checked
result.stateDivergences;    // [{ fromTick, toTick, expected, actual, firstDifferingPath }]
result.eventDivergences;    // [{ tick, expected: events[], actual: events[] }]
result.executionDivergences; // [{ tick, expected: results[], actual: results[] }]
result.skippedSegments;     // [{ fromTick, toTick, reason: 'failure_in_segment' }]
```

`selfCheck` returns `ok: true, checkedSegments: 0` (with a `console.warn`) on bundles without command payloads — diagnostic-only bundles can't be replayed. Bundles that crossed a recorded `TickFailure` get those segments skipped (replay-across-failure is out of scope per spec §2 / future spec).

## Determinism contract

For replay to produce the same state as recording, user code MUST:

1. **Route all input through `world.submit()`** from outside the tick loop.
2. **Do NOT call `world.submit()` from inside a system, handler, or listener.** Mid-tick submissions get captured AND re-issued by the system on replay → double-submit.
3. **Route all randomness through `world.random()`.** `Math.random()`, `crypto.getRandomValues()` are not reproducible.
4. **Validators must be pure.** Side-effecting validators run pre-queue with a live world; their effects aren't captured.
5. **Avoid wall-clock time inside systems.** `Date.now()` / `performance.now()` aren't reproducible. Use `world.tick`.
6. **Iterate ordered collections only.** `Map` insertion order is safe; unordered `Set` driving simulation is not.
7. **No environment-driven branching.** `process.env`, `globalThis` etc. inside a tick.
8. **Registration order must match between recording and replay.** The `worldFactory` is part of the contract — it must reproduce the same registrations in the same order.
9. **Replay determinism requires identical engine `b`-component AND Node major.** Engine cross-`b` throws `BundleVersionError`; cross-Node-major warns (transcendentals may diverge).

The engine does NOT structurally enforce these obligations in v1. `selfCheck` is the verification mechanism.

## Scenarios as replayable bundles

```ts
import { runScenario, scenarioResultToBundle } from 'civ-engine';

const result = runScenario({
  name: 'my-test', world,
  setup: (ctx) => setupBehavior(ctx.world),
  run: (ctx) => { ctx.submit('move', { entity: 0, x: 1, y: 1 }); ctx.step(); },
  checks: [{ name: 'unit moved', check: ctx => ctx.world.getComponent(0, 'position')?.x === 1 }],
  history: {
    capacity: Number.MAX_SAFE_INTEGER,
    captureCommandPayloads: true,    // required for replay
    captureInitialSnapshot: true,    // default; required for replay
  },
});

const bundle = scenarioResultToBundle(result);
// bundle.markers carries one assertion marker per check outcome
// (provenance: 'engine')
```

Without `captureCommandPayloads: true`, the bundle is diagnostic-only — `openAt(tick > startTick)` throws `BundleIntegrityError(code: 'no_replay_payloads')` and `selfCheck` returns `ok: true, checkedSegments: 0`.

## Synthetic-source bundles

In v0.8.0, `SessionMetadata.sourceKind` widened to `'session' | 'scenario' | 'synthetic'` to distinguish bundles produced by the synthetic playtest harness (`runSynthPlaytest`). Synthetic bundles carry `metadata.sourceKind: 'synthetic'` plus an optional `metadata.policySeed: number` (the seed used for the harness's policy sub-RNG, preserved for future replay-via-policy work).

Replay treats synthetic bundles like organic recordings: `SessionReplayer.fromBundle` accepts them, `selfCheck()` validates them (modulo the poisoned-bundle caveat — `selfCheck` re-throws on `stopReason === 'poisoned'` synthetic bundles because the failed-tick-bounded final segment isn't skipped). See `docs/guides/synthetic-playtest.md` for the harness API and CI patterns.

`SessionRecorderConfig` now accepts optional `sourceKind?` and `policySeed?` fields; the synthetic playtest harness uses these to set the metadata at recorder construction time (no post-hoc sink mutation — see ADR 20a). For non-harness consumers, the defaults preserve the existing `sourceKind: 'session'` behavior.

## Limitations (v1)

- **Single payload-capturing recorder per world.** A `SessionRecorder` and a `WorldHistoryRecorder({ captureCommandPayloads: true })` cannot both attach to the same world. Default-config `WorldHistoryRecorder` (no payload capture) is unrestricted.
- **Replay across recorded `TickFailure` is out of scope.** `WorldSnapshotV5` doesn't carry poison state; future spec extends to v6.
- **Sinks are synchronous.** Composes with `World.onDiff`'s synchronous listener invariant. Async/streaming sinks revisit when synthetic playtest needs them.


## Inspecting bundles (v0.8.7+)

For programmatic navigation of a recorded bundle — marker-anchored frames, per-tick events/commands/markers/diff views, two-path state diffs — wrap the bundle in a `BundleViewer`:

```ts
import { BundleViewer } from 'civ-engine';
const viewer = new BundleViewer(bundle, { worldFactory });
const frame = viewer.atMarker('failure-checkpoint');
console.log(frame.events, frame.commands);
const world = frame.state();           // paused World at that tick
const delta = frame.diffSince(0);      // BundleStateDiff over [0, frame.tick]
```

`viewer.replayer()` returns the lazily-constructed memoized `SessionReplayer` if you need direct `selfCheck()` or `openAt()` access. See `docs/guides/bundle-viewer.md` for the full surface (sparse-tick semantics, content-bounded `recordedRange` for incomplete bundles, layered freezing model, and BundleCorpus integration).


## Counterfactual replay (v0.8.12+)

Spec 5 adds `SessionReplayer.forkAt(targetTick)` for "what if the agent had submitted X here instead?" experiments, plus `diffBundles(a, b)` for cross-bundle comparison. Both produce normal `SessionBundle`s, so the rest of the recording ecosystem (`BundleCorpus`, `runMetrics`, `BundleViewer`, `selfCheck`) treats counterfactual results as first-class citizens.

```ts
import { SessionReplayer, diffBundles } from 'civ-engine';

const replayer = SessionReplayer.fromBundle(bundle, { worldFactory });
const fork = replayer
  .forkAt(midTick)                                              // paused World at midTick
  .replace(originalSequence, { type: 'attack', data: { ... } }) // swap a recorded command
  .insert({ type: 'spawnUnit', data: { ... } })                 // inject a new one (after source cmds)
  .drop(otherSequence)                                          // remove an existing one
  .run({ untilTick: bundle.metadata.persistedEndTick });

console.log(fork.divergence.firstDivergentTick);  // earliest submission-tick with divergence (or null)
console.log(fork.divergence.equivalent);          // true iff no command/event divergence

// Full per-tick + state-level comparison:
const diff = diffBundles(bundle, fork.bundle, {
  commandSequenceMap: fork.divergence.commandSequenceMap,
});
for (const [t, delta] of diff.perTickDeltas) {
  console.log(t, delta.commands, delta.events, delta.stateDiff);
}
```

The fork builder is single-use (call after `.run()` throws `BuilderConsumedError`); conflict rules (duplicate replace, replace+drop on same seq) are enforced synchronously at builder-call time. See `docs/api-reference.md` "Counterfactual Replay / Fork (v0.8.12+)" section for the full surface.

**Equivalence invariant:** a no-substitution fork (`forkAt(midTick).run({ untilTick: source.persistedEndTick })`) is structurally equivalent to source's slice over `[midTick, persistedEndTick]` modulo per-recorder noise (sessionId, recordedAt, sequence range, metrics, markers/attachments — see `tests/session-fork-equivalence.test.ts`). This isolates substitution effects: any divergence is caused by your substitutions, not the fork primitive.


## Strict mode (v0.8.8+)

`SessionReplayer.selfCheck()` is the post-hoc determinism verification. Strict mode (`WorldConfig.strict`, Spec 6) is the **structural complement**: violations throw at the call site rather than surfacing as replay divergences. See `docs/guides/strict-mode.md`. Bundle output is byte-identical between strict and non-strict worlds for the same seed/inputs (modulo the `config.strict` flag in the snapshot).
