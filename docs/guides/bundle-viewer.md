# Bundle Viewer

`BundleViewer` is a programmatic agent-driver API over a `SessionBundle`. It collapses the boilerplate of "find marker, look up commands at that tick, build a `SessionReplayer`, call `openAt`, compare snapshots" into a fluent surface so an agent can write `viewer.atMarker(id).state()` and get a paused `World` back.

It is **Tier-3** of the AI-first feedback loop. UI is intentionally out of scope for v1; the API is structured so a UI could later be built on top without rework.

## Quickstart

```ts
import {
  BundleViewer,
  MemorySink,
  SessionRecorder,
  World,
  type WorldSnapshot,
} from 'civ-engine';

// 1. Record (or load) a SessionBundle.
const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
world.registerHandler('move', () => undefined);
const sink = new MemorySink();
const rec = new SessionRecorder({ world, sink });
rec.connect();
world.submit('move', { x: 1, y: 2 });
world.step();
rec.disconnect();
const bundle = rec.toBundle();

// 2. Construct a viewer. `worldFactory` is required only for state materialization
//    (frame.state, frame.snapshot, snapshot-fallback diffSince, viewer.replayer);
//    metadata navigation works without it.
const worldFactory = (snap: WorldSnapshot) => {
  const w = new World({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
  w.registerHandler('move', () => undefined);
  w.applySnapshot(snap);
  return w;
};
const viewer = new BundleViewer(bundle, { worldFactory });

// 3. Navigate and inspect.
const frame = viewer.atTick(1);
console.log(frame.commands);                    // commands submitted at tick 1
console.log(frame.events);                      // events recorded at tick 1
console.log(frame.diff);                        // recorded TickDiff or null

const opened = frame.state();                   // a paused World at tick 1
console.log(opened.tick);                       // 1
```

## Marker-Anchored Navigation

```ts
const viewer = new BundleViewer(bundle, { worldFactory });

for (const m of viewer.markers({ kind: 'assertion' })) {
  const f = viewer.atMarker(m.id);
  console.log(`marker ${m.id} at tick ${f.tick}: ${f.events.length} events`);
}
```

`atMarker(id)` throws `BundleViewerError({ code: 'marker_missing' })` if the id is unknown. If the marker's tick is in `recordedRange` but beyond `replayableRange.end`, you still get a frame; only `frame.state()` / `frame.snapshot()` would throw `BundleRangeError({ code: 'too_high' })` from `SessionReplayer.openAt`.

## Tick Iteration

```ts
// Every recorded tick (those that have a SessionTickEntry) in ascending order.
for (const f of viewer.timeline()) { /* ... */ }

// Streaming generators with optional filters; all yield deterministically.
for (const ev of viewer.events({ from: 5, to: 20, type: 'spawned' })) { /* ... */ }
for (const cmd of viewer.commands({ type: ['move', 'attack'], outcome: 'rejected' })) { /* ... */ }
for (const exec of viewer.executions({ executed: false })) { /* ... */ }
for (const m of viewer.markers({ provenance: 'engine' })) { /* ... */ }
for (const f of viewer.failures()) { /* ... */ }
```

Bound validation is **eager**: invalid `from`/`to` (NaN, non-finite, non-integer) throws synchronously at the call site, before any iteration begins. Body iteration is lazy. `from > to` is a no-op (yields nothing) rather than throwing.

Iteration ordering:

- `events()` — `(tick ASC, original index ASC within `bundle.ticks[i].events`)`.
- `commands()` — `(submissionTick ASC, sequence ASC)`.
- `executions()` — `(tick ASC, original index ASC)`.
- `markers()` — `(tick ASC, marker.id ASC by JS code-unit)`.
- `failures()` — `(tick ASC)`. The recorder's contract is one `TickFailure` per tick.

## `recordedRange` vs `replayableRange`

`BundleViewer` exposes two ranges:

- `recordedRange` — the metadata/content range. For complete bundles `recordedRange.end === metadata.endTick`. For incomplete bundles where the recorder terminated and the world advanced past termination, `recordedRange.end` is **content-bounded** to `min(metadata.endTick, max stream tick)` so the API never lies about ticks that have nothing recorded.
- `replayableRange` — the `openAt(tick)`-able range. End equals `metadata.endTick` for complete bundles and `metadata.persistedEndTick` for incomplete bundles (matches `SessionReplayer.openAt`'s upper bound).

`atTick(t)` accepts any `t` in `recordedRange`. State materialization (`frame.state()`, `frame.snapshot()`, snapshot-fallback `frame.diffSince()`) bubbles `BundleRangeError({ code: 'too_high' })` from `openAt` when `t` is in `recordedRange` but beyond `replayableRange.end`.

## `frame.diffSince(otherTick)`

```ts
const f = viewer.atTick(20);
const d = f.diffSince(10);
console.log(d.fromTick, d.toTick, d.source);
// 10 20 'tick-diffs'   (folded by default)

const dSnap = f.diffSince(10, { fromSnapshot: true });
console.log(dSnap.source); // 'snapshot' (forced via openAt + diffSnapshots)
```

The result `BundleStateDiff` always carries `fromTick === min(thisTick, otherTick)` and `toTick === max(...)` regardless of caller order. Equal endpoints (`from === to`) return an empty diff with `source: 'tick-diffs'`.

`diffSince` chooses one of two paths:

1. **Tick-diff folding (default).** Folds `bundle.ticks[].diff` for every tick in `(fromTick, toTick]` if all of:
   - both endpoints in the same non-failure segment,
   - every tick in `(fromTick, toTick]` has a `SessionTickEntry`,
   - no entity ID appears in both `entities.created` and `entities.destroyed` within `(fromTick, toTick]` (no recycling — `TickDiff` carries no generation, so folding would alias lifetimes).
2. **Snapshot fallback.** Forced via `options.fromSnapshot`, or triggered automatically when path 1 is unsafe. Calls `replayer.openAt(fromTick).serialize()` and `replayer.openAt(toTick).serialize()`, then `diffSnapshots(snapA, snapB, { tick: toTick })`. Requires `worldFactory`.

If a recorded `TickFailure` falls in `(fromTick, toTick]`, neither path is sound and `diffSince` throws `BundleIntegrityError({ code: 'replay_across_failure', failedTicks, fromTick, toTick })` — the same error class `openAt` throws, with `details` enriched for the range.

NaN / non-integer `otherTick` throws `BundleViewerError({ code: 'query_invalid' })`. Out-of-`recordedRange` `otherTick` throws `BundleViewerError({ code: 'tick_out_of_range' })`.

## `worldFactory` Requirements

Without a `worldFactory`, the following throw `BundleViewerError({ code: 'world_factory_required' })`:

- `frame.state()`
- `frame.snapshot()`
- `frame.diffSince(...)` snapshot-fallback path (forced or automatic)
- `viewer.replayer()`

Everything else — frames, iteration, marker index, tick-diff-folded `diffSince` — works without a `worldFactory`.

## Freezing Model

Selective runtime freezing (one-time per allocation, no per-frame linear cost):

- **Frame objects** are `Object.freeze`d at construction (one freeze per `atTick` call on a fresh object).
- **Per-tick arrays** (`frame.events`, `frame.commands`, `frame.executions`, `frame.markers`) are frozen once at viewer construction and reused across `atTick` calls — `O(1)` per-call cost.
- **Array elements** (a single event's `data`, a single marker's `refs`) are NOT individually frozen because that would be `O(events + commands + executions + markers)` at construction, the wrong tradeoff for long captures.

Tests pin the layered contract:

```ts
frame.tick = 99;                                     // throws (frame frozen)
frame.events.push(x);                                // throws (array frozen)
(frame.events[0] as any).data.id = 999;              // succeeds (element bypass — documented)
```

## Sparse Ticks

A tick within `recordedRange` may not have a `SessionTickEntry` if the recorder skipped it (e.g., during a hand-built test bundle, or in some incomplete-bundle scenarios). The frame's behavior:

- **SessionTickEntry-derived (`events`, `diff`, `metrics`, `debug`):** default to `[]` / `null` when no entry exists for that tick.
- **Independent streams (`commands`, `executions`, `markers`, `failures`):** always sourced from per-tick indices keyed by their own `submissionTick`/`tick` field. A sparse tick can still surface non-empty arrays for these.

`viewer.timeline()` iterates only ticks that have a `SessionTickEntry`. Callers wanting every integer tick iterate `recordedRange` themselves and call `atTick`.

## Failure-in-Range Behavior

`frame.diffSince` proactively guards against folding across recorded `TickFailure`s. If any `ft` satisfies `fromTick < ft <= toTick`, it throws `BundleIntegrityError({ code: 'replay_across_failure' })` constructed at the call site with enriched `details`. The class and `details.code` match what `SessionReplayer.openAt` throws so callers can use a single error class for both single-tick and range-tick failures.

For `frame.state()` / `frame.snapshot()`, `openAt`'s own `replay_across_failure` check applies as documented in `session-recording.md`.

## `BundleCorpus` Integration

```ts
import { BundleCorpus } from 'civ-engine';
const corpus = new BundleCorpus('./artifacts/synth-corpus');
const entry = corpus.entries({ failedTickCount: { min: 1 } })[0];
if (entry) {
  const viewer = entry.openViewer({ worldFactory });
  const firstFailure = viewer.bundle.metadata.failedTicks?.[0];
  if (firstFailure && firstFailure > viewer.replayableRange.start) {
    const beforeFailure = viewer.atTick(firstFailure - 1);
    const world = beforeFailure.state();
    // inspect world ...
  }
}
```

`BundleCorpusEntry.openViewer(options?)` is the one-line corpus-to-viewer composition. The corpus entry remains frozen after the method is attached; mutation of the entry still throws.

## `SessionReplayer` Integration

`viewer.replayer()` lazily constructs and memoizes a `SessionReplayer` from the supplied `worldFactory`. Subsequent `frame.state()` / `frame.snapshot()` / `viewer.replayer()` calls reuse the same replayer instance. Useful when you want the replayer for `selfCheck()` or its own `openAt` directly:

```ts
const viewer = new BundleViewer(bundle, { worldFactory });
const replayer = viewer.replayer();        // lazy build
const result = replayer.selfCheck();
console.log(result.ok);
```

Without a `worldFactory`, `viewer.replayer()` throws `world_factory_required`.

## `diffSnapshots`

`diffSnapshots(a, b, opts?)` is a standalone snapshot-pair helper exported alongside the viewer. It returns a `TickDiff`-shaped object capturing the TickDiff-representable subset of changes between `a` and `b`:

```ts
import { diffSnapshots } from 'civ-engine';
const td = diffSnapshots(snapA, snapB, { tick: 42 });
// td.tick === 42, td.entities, td.components, td.resources, td.state, td.tags, td.metadata
```

The result's `tick` field defaults to `opts.tick ?? b.tick ?? 0`.

**Scope is intentionally narrow.** Snapshot fields that fall outside the `TickDiff` schema are excluded:

- `WorldSnapshot.rng` — divergences here are determinism violations; selfCheck's domain.
- `WorldSnapshot.componentOptions` — registration invariant.
- `WorldSnapshot.config` and any nested fields — registration invariant.
- `WorldSnapshot.entities.{generations,alive,freeList}` directly (alive transitions surface as `TickDiff.entities.created/destroyed`).
- `WorldSnapshot.version` — must agree by construction within one bundle.

Use `diffSnapshots` for any TickDiff-shape comparison between two `WorldSnapshot`s; the viewer uses it internally for `frame.diffSince`'s snapshot fallback path.

## Performance

- Construction is `O(events + commands + executions + markers + failures + ticks)`. One pass per stream to build per-tick indices.
- `atTick(t)` is `O(1)` — hash lookup plus a single `Object.freeze` on the freshly allocated frame.
- Iterators are lazy generators; filtering is `O(items in range)`.
- `frame.state()` / `frame.snapshot()` delegate to the memoized replayer's `openAt`.
- `frame.diffSince()` folded path is `O(ticks in range × per-tick change set size)`. Snapshot fallback pays two `openAt` calls plus one `diffSnapshots`.

No persistent state is written; constructing N viewers over the same bundle pays the indexing cost N times. Reuse one viewer per long-lived inspection session.

## Errors

| Error class | Code | When |
| --- | --- | --- |
| `BundleViewerError` | `marker_missing` | `atMarker(id)` for unknown id |
| `BundleViewerError` | `tick_out_of_range` | `atTick(t)` / `diffSince(otherTick)` outside `recordedRange` |
| `BundleViewerError` | `world_factory_required` | `frame.state()`, `frame.snapshot()`, snapshot-fallback `diffSince`, `viewer.replayer()` without a `worldFactory` |
| `BundleViewerError` | `query_invalid` | NaN / non-integer / non-finite `from`/`to`/`otherTick` |
| `BundleVersionError` | `unsupported_schema` | viewer construction with a non-v1 `schemaVersion` |
| `BundleIntegrityError` | `duplicate_marker_id` | viewer construction with two markers sharing an id |
| `BundleIntegrityError` | `replay_across_failure` | `diffSince` range crosses a recorded `TickFailure`; or replay materialization on a failed tick |
| `BundleRangeError` | `too_high` / `too_low` | replay materialization outside `replayableRange` |
| `ReplayHandlerMissingError` | `handler_missing` | replay needs a command handler not registered by `worldFactory` |

`BundleViewerError` codes are scoped to that class; other subsystems (e.g., `CorpusIndexError`) reuse some code strings (`query_invalid`) but the class differs, so `instanceof` checks separate them cleanly.
