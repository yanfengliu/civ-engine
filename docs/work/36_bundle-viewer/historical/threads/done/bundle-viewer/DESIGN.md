# Standalone Bundle Viewer — Design Spec

**Status:** Accepted v6 (2026-04-28) under `docs/threads/current/bundle-viewer/2026-04-28/design-6/REVIEW.md` (both reviewers ACCEPT). Adopts a selective runtime freezing model (outer frame + outer arrays frozen one-time, array elements not individually frozen) and fixes the `WorldSnapshot.config.*` paths. Three post-acceptance nits folded into the same v6 doc.

**Scope:** Tier-3 Spec 4 from `docs/design/ai-first-dev-roadmap.md`. Builds on Session Recording / Replay (Spec 1), composes naturally with Bundle Corpus Index (Spec 7). v1 ships a programmatic agent-driver API for navigating, slicing, and diffing a `SessionBundle`. UI is intentionally out of scope for v1; the API is structured so a UI could later be built on top without rework.

**Author:** civ-engine team

**Related primitives:** `SessionBundle`, `SessionReplayer`, `Marker`, `TickDiff`, `WorldSnapshot`, `RecordedCommand`, `BundleCorpus`.

## 1. Goals

This spec defines a first-class **bundle viewer / driver** API that:

- Wraps an in-memory `SessionBundle` and exposes navigation by tick number, by marker ID, and by linear timeline iteration.
- Returns lightweight `TickFrame` views per anchored tick, with the events, commands, executions, markers, and tick-diff visible at that tick already pre-grouped for O(1) lookup.
- Lazily opens a paused `World` at any reachable tick via the existing `SessionReplayer.openAt`, requiring a `worldFactory` only when state materialization is requested.
- Computes state diffs between any two reachable ticks using the existing `TickDiff` substrate when both anchors are within the same persisted, failure-free segment with no entity-ID recycling, and falls back to snapshot-vs-snapshot comparison through `WorldSnapshot` when those conditions are not met.
- Iterates events, commands, executions, and markers over arbitrary tick ranges as ordered, deterministic streams.
- Composes cleanly with `BundleCorpus` (`viewer = corpus.get(key)?.openViewer()`) and with explicit construction from a `SessionBundle` or `SessionSource`.

The deliverable is an additive API surface. Existing `SessionReplayer`, `SessionBundle`, and `BundleCorpus` behavior remain unchanged. (Iter-1 considered a `SessionReplayer.bundle` getter to support a `BYO replayer` option; v3 drops that option per ADR 35, removing the need to extend `SessionReplayer`.)

## 2. Non-Goals

- **No GUI in v1.** The viewer is a programmatic library. A separate package can later render the same API as a timeline UI.
- **No counterfactual / fork.** Substituting commands at tick N and replaying forward is Spec 5; the viewer only inspects what was recorded.
- **No persistence.** The viewer does not write derived indices, snapshots, or summaries to disk. Constructing a viewer is cheap; callers can rebuild on demand.
- **No content rewriting.** Markers, events, commands, and executions are read-only views.
- **No async / remote.** v1 operates on an already-loaded `SessionBundle` (or a `SessionSource` that materializes synchronously, matching the existing `SessionReplayer.fromSource` story).
- **No multi-bundle correlation in v1.** Cross-bundle diffs and divergence trees belong to Specs 5 and a future divergence-analysis spec. The viewer is single-bundle.
- **No new schema versions.** v1 reads `SESSION_BUNDLE_SCHEMA_VERSION === 1`; future schema migration is shared with `SessionReplayer` rather than duplicated.
- **No mutation of the underlying bundle through the viewer's surface.** The viewer uses **selective runtime freezing** combined with TypeScript `readonly` / `Readonly<>` casts: outer `TickFrame` objects are `Object.freeze`d at construction (one-time per `atTick` call, on a fresh frame object), and the per-tick arrays the frame exposes (`frame.events`, `frame.commands`, `frame.executions`, `frame.markers`) are frozen once at viewer construction so they can be reused across `atTick` calls without per-call cost. Individual array elements (e.g., a single `RecordedTickFrameEvent`'s `data` payload) are NOT individually frozen — that would be O(events) per atTick and is the wrong tradeoff. Callers who cast through the readonly type to mutate an array element succeed (and the change is observable on shared references); callers who try to mutate the frame object or push/replace an array element fail at runtime. See ADR 33 for the rationale and §10 for cost implications.

## 3. Background

Today, an agent that wants to investigate "what happened around marker X" must:

1. Pull `bundle.markers` and find the marker by id.
2. Pull `bundle.ticks` and filter for that tick.
3. Pull `bundle.commands` and filter for that tick (or the previous tick, depending on submission boundaries).
4. Build a `SessionReplayer` and call `openAt(marker.tick)` to get a paused World.
5. If they want a state diff vs an earlier tick, call `openAt` twice and compare snapshots manually.

This is straightforward, but it forces every consumer (agent or human) to reimplement the same lookups, ordering, and pre-grouping. The viewer collapses those lookups into a cohesive, fluent surface so agents can write `viewer.atMarker(id).state()` instead of a half-page of bundle-walking code.

`SessionReplayer` already does the heavy lifting for state at a tick, including pre-grouped per-tick command/event/execution indices. The viewer reuses those primitives rather than rebuilding indices, and it adds the tick-frame and marker-anchored navigation that `SessionReplayer` deliberately leaves out (since `SessionReplayer`'s job is replay/verification, not inspection ergonomics).

## 4. Architecture Overview

New module: `src/bundle-viewer.ts` (core `BundleViewer` class, `TickFrame` view, query/range helpers, error class).

Snapshot-pair diff helper: `src/snapshot-diff.ts` (`diffSnapshots(a, b, opts?)`). The helper is engine-generic (operates on any two `WorldSnapshot`s) so it lives next to `src/diff.ts` rather than inside `bundle-viewer.ts`. `bundle-viewer.ts` re-exports it for the viewer's documented surface.

| Component | Responsibility |
| --- | --- |
| `BundleViewer` | Wraps a `SessionBundle`, lazily wraps a `SessionReplayer` when a `worldFactory` is supplied, exposes navigation/iteration/diff methods. |
| `TickFrame` | Immutable per-tick view: tick number, events at this tick, commands submitted at this tick, executions at this tick, markers anchored at this tick, the recorded tick-diff (if persisted), and lazy `state()` / `snapshot()` / `diffSince(otherTick)` accessors. |
| `BundleViewerError` | `SessionRecordingError` subclass for missing-marker, recorded-tick-out-of-range, and worldFactory-required conditions. Replay-materialization paths surface `BundleRangeError` / `BundleIntegrityError` / `ReplayHandlerMissingError` unchanged from `SessionReplayer`. |
| `diffSnapshots` (in `src/snapshot-diff.ts`) | Pure helper: `(a: WorldSnapshot, b: WorldSnapshot, opts?: { tick?: number }) => TickDiff`. Used internally by `frame.diffSince()`'s snapshot fallback and exported for callers comparing arbitrary snapshot pairs. |

Data flow:

```text
new BundleViewer(bundle, options?)
  -> validate bundle.schemaVersion (BundleVersionError on mismatch)
  -> build per-tick indices (events/commands/executions/markers/failures) once
  -> compute recordedRange (content-bounded; see §6 step 4)
  -> hold optional worldFactory for lazy replayer construction

viewer.atTick(t)
  -> validate t in recordedRange
  -> compose frozen TickFrame from per-tick indices

viewer.atMarker(id)
  -> markerIndex.get(id) (BundleViewerError 'marker_missing' if absent)
  -> atTick(marker.tick)

frame.state() / frame.snapshot()
  -> ensure replayer (lazy create from worldFactory; throws 'world_factory_required' if missing)
  -> replayer.openAt(frame.tick); throws BundleRangeError / BundleIntegrityError as openAt does

frame.diffSince(otherTick, opts?)
  -> normalize: from = min(tick, otherTick), to = max(...)
  -> if from === to: return empty BundleStateDiff source: 'tick-diffs'
  -> if any failure ft satisfies from < ft <= to: throw BundleIntegrityError (from openAt) wrapped with range
  -> if opts.fromSnapshot OR any tick in (from, to] lacks SessionTickEntry OR any entity ID appears in both
       entities.created and entities.destroyed within (from, to]:
       fall back to snapshot path -> openAt(from).serialize() vs openAt(to).serialize() -> diffSnapshots
  -> else fold bundle.ticks[].diff entries from (from..to] inclusive

viewer.events({ from?, to?, type? }) / commands / executions / markers / failures / timeline
  -> default range: recordedRange
  -> iterate per-tick indices in tick order, yield readonly entries (RecordedTickEvent etc.; see §2 for freezing layers)
```

## 5. API + Types

### 5.1 Construction

```ts
export interface BundleViewerOptions<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  /**
   * Optional worldFactory used to lazily construct the viewer's internal
   * SessionReplayer. Required for `frame.state()`, `frame.snapshot()`,
   * the snapshot-fallback path of `frame.diffSince()`, and
   * `viewer.replayer()`. Pure-metadata navigation does not need a
   * worldFactory.
   *
   * Callers who already constructed a SessionReplayer for selfCheck or
   * other replay work should pass the same `worldFactory` here; the viewer
   * builds its own internal replayer (per-tick command/event/execution
   * maps are rebuilt; cost is bounded by the bundle). Callers who only
   * need metadata navigation may omit `worldFactory` entirely; in that
   * mode `frame.state()`, `frame.snapshot()`, snapshot-fallback
   * `frame.diffSince()`, and `viewer.replayer()` all throw
   * `BundleViewerError({ code: 'world_factory_required' })`. Tick-diff
   * folding (the default `frame.diffSince()` path) does not require a
   * `worldFactory`.
   */
  worldFactory?: ReplayerConfig<TEventMap, TCommandMap>['worldFactory'];
}

export class BundleViewer<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  constructor(
    bundle: SessionBundle<TEventMap, TCommandMap, TDebug>,
    options?: BundleViewerOptions<TEventMap, TCommandMap>,
  );

  /**
   * Materializes the bundle from `source.toBundle()` and constructs a viewer.
   * Generics are caller assertions (consistent with `SessionReplayer.fromSource`):
   * the source's underlying schema is validated, but the engine cannot prove
   * `TEventMap` / `TCommandMap` / `TDebug` match the bundle's actual payload
   * shapes.
   */
  static fromSource<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(
    source: SessionSource,
    options?: BundleViewerOptions<TEventMap, TCommandMap>,
  ): BundleViewer<TEventMap, TCommandMap, TDebug>;

  readonly bundle: Readonly<SessionBundle<TEventMap, TCommandMap, TDebug>>;
  readonly metadata: Readonly<SessionMetadata>;
  /** Range over which content (events, commands, markers, etc.) was recorded. */
  readonly recordedRange: { readonly start: number; readonly end: number };
  /** Range over which `openAt(tick)` is guaranteed to succeed. End equals `endTick` for
   *  complete bundles and `persistedEndTick` for incomplete bundles. */
  readonly replayableRange: { readonly start: number; readonly end: number };
  readonly markerIndex: ReadonlyMap<string, Marker>;

  /** Ticks that have a recorded SessionTickEntry, sorted ascending. */
  ticks(): readonly number[];

  /** Frozen frame for any tick in `recordedRange`. Throws `tick_out_of_range` otherwise. */
  atTick(tick: number): TickFrame<TEventMap, TCommandMap, TDebug>;

  /** Frozen frame for the marker's tick. Throws `marker_missing` for unknown id.
   *  When the marker's tick is in `recordedRange` but beyond `replayableRange.end`,
   *  the frame is returned but `frame.state()` / `frame.snapshot()` throw
   *  `BundleRangeError({ code: 'too_high' })`. */
  atMarker(id: string): TickFrame<TEventMap, TCommandMap, TDebug>;

  /** Frozen frames for every recorded tick (every tick in bundle.ticks), ascending. */
  timeline(): IterableIterator<TickFrame<TEventMap, TCommandMap, TDebug>>;

  markers(query?: MarkerQuery): IterableIterator<Marker>;
  events(query?: EventQuery<TEventMap>): IterableIterator<RecordedTickEvent<TEventMap>>;
  commands(query?: CommandQuery<TCommandMap>): IterableIterator<RecordedCommand<TCommandMap>>;
  executions(query?: ExecutionQuery<TCommandMap>): IterableIterator<CommandExecutionResult<keyof TCommandMap>>;
  failures(query?: TickRange): IterableIterator<TickFailure>;

  /** Lazily constructs and memoizes the internal SessionReplayer.
   *  Throws `world_factory_required` if no `worldFactory` was supplied. */
  replayer(): SessionReplayer<TEventMap, TCommandMap, TDebug>;
}
```

`recordedRange.end` is **content-bounded**, not metadata-bounded. For a complete bundle (`metadata.incomplete` is missing), it equals `metadata.endTick` because the recorder writes a `SessionTickEntry` (or at minimum has `world.tick === endTick` at disconnect with normal `_onDiff` writes intact). For an incomplete bundle, the recorder may have hit `_terminated` and short-circuited subsequent `_onDiff` calls (`src/session-recorder.ts:414`) while the world kept advancing — at disconnect `metadata.endTick = world.tick` (`session-recorder.ts:226`) overstates actual recorded content. The viewer therefore computes:

```
contentMaxTick = max over all stream ticks of:
  bundle.ticks[].tick
  bundle.commands[].submissionTick
  bundle.executions[].tick
  bundle.markers[].tick
  bundle.failures[].tick
  metadata.startTick   // floor when no streams exist (degenerate empty bundle)

recordedRange.end = min(metadata.endTick, contentMaxTick)
```

For complete bundles, all streams agree with `metadata.endTick`, so `recordedRange.end === metadata.endTick`. For incomplete/terminated bundles, ticks beyond `recordedRange.end` are honestly absent from the viewer's API.

`replayableRange.end === metadata.incomplete ? metadata.persistedEndTick : metadata.endTick` matches `SessionReplayer.openAt`'s upper-bound logic and the existing convention that `metadata.incomplete` is `incomplete?: true` (truthy when present, missing otherwise).

### 5.2 Frames

```ts
/** Frame-anchored event view. The frame's tick is implicit (use `frame.tick`). */
export interface RecordedTickFrameEvent<TEventMap> {
  type: keyof TEventMap & string;
  data: TEventMap[keyof TEventMap];
}

/** Iterator-yielded event view. Carries `tick` because iteration spans multiple ticks. */
export interface RecordedTickEvent<TEventMap> {
  tick: number;
  type: keyof TEventMap & string;
  data: TEventMap[keyof TEventMap];
}

export interface TickFrame<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TDebug,
> {
  readonly tick: number;
  /** Bundle-shape events. The frame's tick is in `frame.tick`; not duplicated per-event. */
  readonly events: readonly RecordedTickFrameEvent<TEventMap>[];
  /** Commands submitted at `frame.tick`. Independent of SessionTickEntry presence. */
  readonly commands: readonly RecordedCommand<TCommandMap>[];
  /** Executions recorded at `frame.tick`. Independent of SessionTickEntry presence. */
  readonly executions: readonly CommandExecutionResult<keyof TCommandMap>[];
  /** Markers anchored to `frame.tick`. Independent of SessionTickEntry presence. */
  readonly markers: readonly Marker[];
  /** Recorded tick-diff for this tick. `null` if this tick has no SessionTickEntry. */
  readonly diff: Readonly<TickDiff> | null;
  /** Recorded debug payload. `null` if no SessionTickEntry or no debug at this tick. */
  readonly debug: Readonly<TDebug> | null;
  /** Recorded WorldMetrics. `null` if no SessionTickEntry or no metrics at this tick. */
  readonly metrics: Readonly<WorldMetrics> | null;

  /** Open a paused World at this tick. Requires the viewer to have a `worldFactory`.
   *  Throws `BundleRangeError` when `frame.tick` is outside `replayableRange`. */
  state(): World<TEventMap, TCommandMap>;

  /** Snapshot at this tick. Same prerequisites and errors as `state()`. */
  snapshot(): WorldSnapshot;

  /** Compare this tick against another tick in `recordedRange`. See §7 for path semantics. */
  diffSince(otherTick: number, options?: DiffOptions): BundleStateDiff;
}

export interface DiffOptions {
  /** Forces snapshot-vs-snapshot diff via openAt() instead of folding recorded TickDiffs.
   *  Default false. Caller pays two openAt costs but gets a snapshot-authoritative diff. */
  fromSnapshot?: boolean;
}

export interface BundleStateDiff {
  /** Equal to `min(frame.tick, otherTick)`. */
  fromTick: number;
  /** Equal to `max(frame.tick, otherTick)`. */
  toTick: number;
  /**
   * 'tick-diffs' folds bundle.ticks[].diff entries; 'snapshot' compares
   * serialize() outputs of two openAt() worlds via diffSnapshots().
   * Folded TickDiffs use last-write-wins per (component, entity) and per
   * state key; destroyed entities in (fromTick, toTick] clear earlier sets.
   */
  source: 'tick-diffs' | 'snapshot';
  diff: TickDiff;
}
```

`RecordedTickEvent.type` narrows to `keyof TEventMap & string` (the bundle's stored type is `keyof TEventMap`, so a cast at the boundary is required when constructing iterator entries; in practice all consumer event types are strings).

### 5.3 Queries

```ts
export interface TickRange {
  /** Inclusive lower bound. Default: viewer.recordedRange.start. Validated eagerly. */
  from?: number;
  /** Inclusive upper bound. Default: viewer.recordedRange.end. Validated eagerly. */
  to?: number;
}

export interface MarkerQuery extends TickRange {
  kind?: OneOrMany<MarkerKind>;
  provenance?: OneOrMany<MarkerProvenance>;
  id?: string | RegExp;
}

export interface EventQuery<TEventMap = Record<string, never>> extends TickRange {
  type?: OneOrMany<keyof TEventMap & string>;
}

export interface CommandQuery<TCommandMap = Record<string, never>> extends TickRange {
  type?: OneOrMany<keyof TCommandMap & string>;
  outcome?: OneOrMany<'accepted' | 'rejected'>;
}

export interface ExecutionQuery<TCommandMap = Record<string, never>> extends TickRange {
  type?: OneOrMany<keyof TCommandMap & string>;
  /** Filter by execution outcome. */
  executed?: boolean;
}
```

`OneOrMany<T>` is reused from `BundleCorpus` (already exported). Tick-range bounds are **validated eagerly** at the iterator-method call site (e.g., `viewer.events(badQuery)` throws synchronously, before any iteration); non-integer or non-finite values throw `BundleViewerError({ code: 'query_invalid' })`. The body of the iterator is lazy, but bounds validation runs before any generator is returned. `from > to` is a no-op (yields nothing) rather than throwing, mirroring how the metrics reducer handles empty inputs. Query type defaults match the class default (`Record<string, never>`); callers wanting to filter by type pass the typed map at the call site or in the viewer's generics.

### 5.4 Errors

```ts
export type BundleViewerErrorCode =
  | 'marker_missing'
  | 'tick_out_of_range'
  | 'world_factory_required'
  | 'query_invalid';

export interface BundleViewerErrorDetails {
  readonly [key: string]: JsonValue;
  readonly code: BundleViewerErrorCode;
  readonly tick: number | null;
  readonly markerId: string | null;
  readonly message: string | null;
}

export class BundleViewerError extends SessionRecordingError {
  override readonly details: BundleViewerErrorDetails;
}
```

**Error contract:**

- **Metadata navigation** (`atTick`, `atMarker`, query-bound validation) throws `BundleViewerError`. `tick_out_of_range` fires on `atTick(t)` when `t < recordedRange.start` or `t > recordedRange.end`.
- **Replay materialization** (`frame.state`, `frame.snapshot`, `viewer.replayer().openAt(...)`) bubbles `BundleRangeError` / `BundleIntegrityError` / `ReplayHandlerMissingError` unchanged from `SessionReplayer`. `BundleRangeError({ code: 'too_high' })` covers `replayableRange.end < t <= recordedRange.end`. (Snapshot-fallback `frame.diffSince` reaches `openAt` only when the §7 failure-in-range pre-check has already passed, so callers practically never see a `replay_across_failure` from that path.)
- **`frame.diffSince` failure-in-range** is a special case: the viewer constructs a `BundleIntegrityError({ code: 'replay_across_failure' })` at the call site with enriched `details` (see §7). The `instanceof` check and `details.code` parity with `openAt` is preserved so callers can use a single error class for both single-tick and range-tick failures, but the *details payload* is enriched with `fromTick`/`toTick`/`failedTicks` because the caller asked for a range. This is the only place in the viewer that constructs a `SessionReplayer`-class error rather than bubbling one.
- **Schema-version mismatch** at viewer construction throws `BundleVersionError` (existing). Cross-engine-version checks fire only when the lazy `SessionReplayer` is instantiated, surfacing whatever `SessionReplayer` already throws today.
- The `query_invalid` code is scoped to `BundleViewerError`; a `CorpusIndexError({ code: 'query_invalid' })` is a different class. Codes are not globally unique strings — they are unique within their error class.

`SessionReplayer.openAt`'s `replay_across_failure` is the authoritative error when `frame.state()` / `frame.snapshot()` / snapshot-fallback `frame.diffSince()` cross a recorded `TickFailure`. The viewer does not wrap it.

## 6. Lifecycle / Contracts

`BundleViewer` is constructed once over an immutable `SessionBundle`. Pre-grouped indices are built at construction:

1. Validate `bundle.schemaVersion === SESSION_BUNDLE_SCHEMA_VERSION`. Throw `BundleVersionError` on mismatch. Schema validation runs first because a bundle that does not parse cannot be navigated regardless of caller-side option mistakes.
2. Build `markerIndex: Map<string, Marker>`. Duplicate marker ids are an integrity error: throw `BundleIntegrityError({ code: 'duplicate_marker_id' })`.
3. Group events/commands/executions/markers/failures/tickEntries by tick into private `Map<number, ...>` indices. Public accessors only return frozen views.
4. Compute `recordedRange.end` content-bounded as in §5.1 (`min(metadata.endTick, contentMaxTick)`), and `replayableRange = { start: metadata.startTick, end: metadata.incomplete ? metadata.persistedEndTick : metadata.endTick }`. The `metadata.incomplete?: true` field's truthy/missing convention is preserved; `incomplete === undefined` means the bundle is complete.

Cross-engine-version checks (the ones inside `SessionReplayer._verifyVersionCompat`) fire only when the lazy replayer is instantiated on first `frame.state()` / `frame.snapshot()` / snapshot-fallback `frame.diffSince()` / `viewer.replayer()`. The viewer's constructor only validates the bundle's schema version, not engine/Node compatibility.

**`atTick(tick)`:** throws `BundleViewerError({ code: 'tick_out_of_range' })` when `tick < recordedRange.start` or `tick > recordedRange.end`. Recorded ticks beyond `replayableRange.end` are accepted by `atTick`; only `frame.state()` / `frame.snapshot()` enforce the replayable bound (via `BundleRangeError`).

**`atMarker(id)`:** throws `BundleViewerError({ code: 'marker_missing' })` when the id is unknown. Marker tick beyond `replayableRange.end` returns a frame; only state materialization on that frame fails.

**`viewer.replayer()`:** lazily constructs the internal `SessionReplayer` and memoizes it on the viewer. Subsequent `state()`, `snapshot()`, snapshot-fallback `diffSince()`, and `viewer.replayer()` calls reuse the same instance. Throws `BundleViewerError({ code: 'world_factory_required' })` if `worldFactory` was not supplied.

### 6.1 Sparse ticks

Within `recordedRange`, not every tick necessarily has a `SessionTickEntry`. `SessionTickEntry`s come from per-tick events/diff/metrics/debug captured by the recorder; a tick can have submitted commands or anchored markers without producing any of those.

Frame field defaults differ by source:

- **SessionTickEntry-derived (`events`, `diff`, `metrics`, `debug`):** default to `[]` / `null` when no entry exists for that tick.
- **Independent streams (`commands`, `executions`, `markers`, `failures`):** always sourced from per-tick indices keyed by their own field (`submissionTick` for commands; `tick` for executions/failures; `tick` for markers). A tick without a `SessionTickEntry` can still surface non-empty arrays for these.

`viewer.timeline()` iterates only ticks with a `SessionTickEntry` (matching `viewer.ticks()` and `SessionReplayer.ticks()`). Callers wanting every integer tick iterate `recordedRange` themselves and call `atTick`.

## 7. Diff Semantics

`frame.diffSince(otherTick, options)` returns a `BundleStateDiff` with `fromTick === min(frame.tick, otherTick)` and `toTick === max(frame.tick, otherTick)`. The result represents the state change from `fromTick` to `toTick`, regardless of caller-supplied ordering. Callers wanting the reverse direction must invert `set` / `removed` themselves.

**Edge cases:**

- `fromTick === toTick`: returns an empty `BundleStateDiff` with `source: 'tick-diffs'`, `diff.tick === fromTick`, all changes empty. No replayer is needed.
- Both endpoints in `recordedRange` are required. If either is outside `recordedRange`, `BundleViewerError({ code: 'tick_out_of_range' })` is thrown.
- Non-integer / non-finite / `NaN` `otherTick` throws `BundleViewerError({ code: 'query_invalid' })` (consistent with §5.3 query-bound validation; `tick_out_of_range` is reserved for legitimate-but-out-of-range integer ticks).
- Folded result's `diff.tick` is set to `toTick` (matches the `diffSnapshots(..., { tick: toTick })` contract for the snapshot path).

**Path selection:**

1. **Tick-diff folding (default).** Fold `bundle.ticks[].diff` entries for ticks in `(fromTick, toTick]` if all of:
   - both `fromTick` and `toTick` are within the same non-failure segment (no recorded `ft` satisfies `fromTick < ft <= toTick`);
   - every tick in `(fromTick, toTick]` has a recorded `SessionTickEntry`;
   - no entity ID appears in both `entities.created` and `entities.destroyed` within `(fromTick, toTick]`;
   - `options.fromSnapshot !== true`.

   The fold rule is last-write-wins per `(component, entity)` and per state key; entities destroyed within the range are excluded from `set` and added to `removed`; same coalescing for resources, tags, metadata. Result `BundleStateDiff.source === 'tick-diffs'`.

2. **Snapshot fallback.** When path 1 is unsafe (any of: caller forced `fromSnapshot`, sparse `SessionTickEntry` in `(fromTick, toTick]`, or entity-ID recycling in the range), open `replayer.openAt(fromTick)` and `replayer.openAt(toTick)`, serialize both, and call `diffSnapshots(snapA, snapB, { tick: toTick })`. Result `BundleStateDiff.source === 'snapshot'`. Requires a `worldFactory`; throws `BundleViewerError({ code: 'world_factory_required' })` otherwise. The snapshot path is bounded by `replayableRange`: if either endpoint is in `recordedRange` but beyond `replayableRange.end`, `openAt` throws `BundleRangeError({ code: 'too_high' })`. This is by design — the snapshot path can only succeed where state is materializable.

**Failure-in-range.** If any recorded `ft` satisfies `fromTick < ft <= toTick`, neither path is sound. The viewer throws a `BundleIntegrityError({ code: 'replay_across_failure' })` constructed at the `diffSince` call site with `details = { code, failedTicks: [...failedTicksInRange], fromTick, toTick }`. The `code` and class match what `SessionReplayer.openAt` already throws (so `instanceof` and `details.code` checks work uniformly), but the *details payload* is enriched with `fromTick`/`toTick` because the caller asked for a range, not a single tick. The §5.4 contract "replay materialization bubbles `BundleRangeError` / `BundleIntegrityError` / `ReplayHandlerMissingError` from `SessionReplayer`" still applies for the actual `openAt` call inside the snapshot path; this `diffSince` failure-in-range throw is a viewer-level guard that fires *before* the snapshot path's `openAt` would have, so the caller does not see two different error classes for the same condition.

**Snapshot fallback heuristic rationale.** The recorder writes a `SessionTickEntry` per successful tick, so dense coverage in `recordedRange` is the normal case. Sparseness arises with hand-constructed test bundles or with future recorder configurations that skip entries. Falling back whenever `(fromTick, toTick]` has any sparse tick is conservative but correct: systems can mutate state without commands or executions, so command/execution presence is not a sufficient signal that a missing entry would have been a no-op.

**Entity-ID recycling.** `TickDiff` carries numeric entity IDs without generations. Folding across a range where the same numeric ID is destroyed and recreated would alias two distinct entity lifetimes. The conservative path-1 guard scans `(fromTick, toTick]` for IDs that appear in both `entities.created` and `entities.destroyed` and forces the snapshot path when found.

`diffSnapshots(a, b, opts?)` is exported from `src/snapshot-diff.ts` as `(a: WorldSnapshot, b: WorldSnapshot, opts?: { tick?: number }) => TickDiff`. The result's `tick` field defaults to `opts.tick ?? b.tick ?? 0`.

**Scope of `diffSnapshots`:** the result is `TickDiff`-shaped — entity create/destroy, component set/removed, resource set/removed, state set/removed, tags, metadata. Snapshot fields that fall outside the `TickDiff` schema are intentionally excluded. With the v5 `WorldSnapshot` shape (`src/serializer.ts:62-78`):

- `WorldSnapshot.rng` (deterministic RNG state) — a divergence here is a determinism violation and belongs to `SessionReplayer.selfCheck`, not a state diff.
- `WorldSnapshot.componentOptions` (per-component `diffMode` etc.) — registration invariant; if it differs between two snapshots from the same bundle, the bundle's `worldFactory` is wrong.
- `WorldSnapshot.config` and any of its nested fields (`gridWidth`, `gridHeight`, `tps`, `positionKey`, `seed`, `maxTicksPerFrame`, `instrumentationProfile`, etc.) — also registration / construction invariants.
- `WorldSnapshot.entities.{generations,alive,freeList}` — internal entity-manager structure; the relevant entity-level facts (created/destroyed) are surfaced via `TickDiff.entities` already.
- `WorldSnapshot.version` — versions of two snapshots within one bundle must agree by construction.

These exclusions make `diffSnapshots` strictly TickDiff-representable, not snapshot-complete. Any other future `WorldSnapshot` field that does not have a corresponding `TickDiff` slot is also implicitly excluded: the helper diffs the TickDiff schema, period. `BundleStateDiff.source === 'snapshot'` therefore conveys "computed by serializing two paused worlds and structurally diffing the TickDiff-representable subset," not "identical to comparing every WorldSnapshot field." Callers who need full-snapshot comparison (e.g., for audit) can serialize both worlds themselves and compare via JSON-deep-equal or a dedicated tool.

Callers comparing live-world snapshots in tests can use it directly without building a `BundleViewer`. The viewer re-exports `diffSnapshots` from `bundle-viewer.ts` for the documented surface; both paths reach the same function.

## 8. Iteration / Ordering

Deterministic iteration is required for both agent reproducibility and CI diff stability:

- `events()` yields entries in `(tick ASC, original index ASC within bundle.ticks[i].events)`.
- `commands()` yields in `(submissionTick ASC, sequence ASC)`.
- `executions()` yields in `(tick ASC, original index ASC within bundle.executions filtered by tick)`.
- `markers()` yields in `(tick ASC, marker.id ASC by JS code-unit)`.
- `failures()` yields in `(tick ASC)`. The recorder's contract is one `TickFailure` per tick (the world is poisoned after a failure, blocking further ticks within the same lifetime), so this order is unambiguous.
- `timeline()` yields in `(tick ASC over bundle.ticks)`.

All iteration is lazy through generators. Iterating a query does not allocate the full filtered array up front. This matters for long captures (>100k events).

Bundle order for `bundle.ticks[i].events` is preserved as the within-tick tiebreaker because that is the order the recorder emitted them. Re-sorting by event type would lose the natural causal ordering observable in the world.

## 9. Integration Points

### 9.1 BundleCorpus

`BundleCorpusEntry` already exposes `loadBundle()`. To keep the surface fluent, the entry gets one additive non-optional method:

```ts
interface BundleCorpusEntry {
  // ... existing fields
  openViewer<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(
    options?: BundleViewerOptions<TEventMap, TCommandMap>,
  ): BundleViewer<TEventMap, TCommandMap, TDebug>;
}
```

`openViewer` calls `loadBundle()` and constructs a `BundleViewer` with the given options. Generics flow through the same caller-asserted contract that `loadBundle` already uses.

`BundleCorpus.makeEntry()` currently `Object.freeze`s the returned entry (`src/bundle-corpus.ts:226`). Implementation note: `openViewer` must be attached as a method (or an own property) before `Object.freeze` runs.

This is the only `BundleCorpus` change required for v1. It is additive and non-optional — existing constructed entries gain the method. It is not a runtime-breaking change because `BundleCorpusEntry` is constructed only by `BundleCorpus.makeEntry()`; no external implementer exists in this codebase. Per AGENTS.md the additive surface is a `c` bump (v0.8.7); the changelog entry calls out the new method explicitly under "Behavior callouts."

### 9.2 SessionReplayer

`SessionReplayer` does not change. The viewer lazily constructs its own internal `SessionReplayer` from the supplied `worldFactory` when state materialization is needed (`frame.state()`, `frame.snapshot()`, snapshot-fallback `frame.diffSince()`, `viewer.replayer()`). There is no replayer-side coupling beyond the existing public API (`fromBundle`, `fromSource`, `openAt`, `stateAtTick`, `tickEntriesBetween`, `selfCheck`, `ticks`, `markerCount`, `metadata`).

### 9.3 ScenarioRunner

Out of scope for the spec but worth noting: `scenarioResultToBundle()` already returns a `SessionBundle`, so the same viewer works on scenario output. No code change.

## 10. Performance

- Construction is O(events + commands + executions + markers + failures + ticks). One pass per stream to build per-tick `Map<number, ...>` indices. The viewer keeps its own marker/tickEntry/failure indices because `SessionReplayer` does not expose those today; events/commands/executions are re-indexed in the viewer (independent of the replayer's private indices) so the viewer can serve metadata without forcing replayer construction.
- `atTick(t)` is O(1) hash lookup + a single `Object.freeze` on the freshly allocated outer frame object. The per-tick arrays are pre-frozen at viewer construction (one freeze per stream per recorded tick, paid once) and reused across `atTick` calls; the frame holds references to those frozen arrays without any per-call freezing. Net per-call cost is O(1) regardless of stream length at that tick.
- `events(query)` etc. iterate the per-tick indices in tick order. Filtering by `type` is O(events in range); filtering by tick range is O(ticks in range). No global sort per call.
- `frame.state()` and `frame.snapshot()` delegate to the memoized replayer's `openAt(tick)` / `openAt(tick).serialize()`. The first call lazily builds the replayer (paying its construction cost once); subsequent calls reuse it.
- `frame.diffSince(otherTick)` via tick-diff folding is O(ticks in range × per-tick change set size). The snapshot fallback pays two `openAt` calls plus one snapshot diff. Callers who care about cost can choose the path explicitly via `options.fromSnapshot`.

No persistent state is written. Constructing N viewers over the same bundle pays the indexing cost N times; callers that materialize many viewers should reuse one.

## 11. Testing Strategy

Unit and integration tests target:

- **Construction:** valid bundle, schemaVersion mismatch (`BundleVersionError`), duplicate marker ids (`BundleIntegrityError({ code: 'duplicate_marker_id' })`).
- **`recordedRange` content-bounding:** for complete bundles `recordedRange.end === metadata.endTick`; for incomplete bundles where the recorder terminated and the world advanced past termination, `recordedRange.end < metadata.endTick` (clamped to the highest stream tick). A test fabricates this case by using `MemorySink` and a forced sink-write failure mid-run.
- **`recordedRange` vs `replayableRange`:** for complete bundles both ranges share the same end; for incomplete bundles `recordedRange.end >= replayableRange.end` (commands/markers may extend beyond `persistedEndTick` but cannot exceed `metadata.endTick`). `atTick(t)` accepts `t in recordedRange`; `frame.state()` for `t > replayableRange.end` throws `BundleRangeError`.
- **`atTick`:** in-range tick returns frame; `< startTick` and `> recordedRange.end` throw `tick_out_of_range`.
- **Sparse ticks:** an in-range tick without a `SessionTickEntry` returns a frame with `events: []`, `diff: null`, `metrics: null`, `debug: null` but still surfaces `commands`, `executions`, `markers`, `failures` from independent indices when present.
- **`atMarker`:** returns frame at marker tick; throws `marker_missing` for unknown id; for markers anchored beyond `replayableRange.end`, the frame is returned but `state()` throws `BundleRangeError({ code: 'too_high' })`.
- **Frame contents:** events/commands/executions/markers at a tick match the bundle's filtered values in original order; metrics/debug/diff propagate.
- **Frame freezing (layered):** `frame.tick = N` throws under strict mode (frame is `Object.freeze`d); `frame.events.push(x)` throws (per-tick array is frozen at viewer construction); `(frame.events[0] as any).type = 'foo'` succeeds (element is not individually frozen, by design — documented bypass). After all three attempts, subsequent `atTick(t)` calls return frames with the original (unmutated) per-tick arrays, but elements that were mutated through the bypass remain mutated (shared references). This is documented in §2 / ADR 33. `frame.events` is `RecordedTickFrameEvent[]` (no per-event tick); `viewer.events()` yields `RecordedTickEvent` (with tick).
- **`timeline`:** iterates only ticks with `SessionTickEntry`; ascending order.
- **Iterators:** `events`, `commands`, `executions`, `markers`, `failures` query filters (range, type, kind, provenance, outcome, executed, id regex) work; iteration is lazy and deterministic; default range is `recordedRange`.
- **`frame.state()` / `frame.snapshot()`:** delegate to memoized `SessionReplayer.openAt`, bubble `BundleRangeError` / `BundleIntegrityError` / `ReplayHandlerMissingError`.
- **`frame.diffSince(otherTick)` direction:** fromTick === min, toTick === max regardless of caller order.
- **`frame.diffSince(otherTick)` equal endpoints:** empty diff with `source: 'tick-diffs'`, `fromTick === toTick`.
- **`frame.diffSince(otherTick)` tick-diff path:** folds correctly for entity create/destroy across range, last-write-wins for component set, removed dominates set when destroy is later, state/tags/metadata coalescing.
- **`diffSince` snapshot fallback triggers:** `options.fromSnapshot === true`; sparse `SessionTickEntry` in `(fromTick, toTick]`; entity-ID recycling in `(fromTick, toTick]`.
- **`diffSince` failure-in-range:** any `ft` with `fromTick < ft <= toTick` throws `BundleIntegrityError({ code: 'replay_across_failure' })`.
- **`worldFactory` required:** `frame.state()` / `frame.snapshot()` / `viewer.replayer()` without `worldFactory` throw `world_factory_required`.
- **Replayer memoization:** `viewer.replayer()` returns the same instance across calls; `frame.state()` and `frame.snapshot()` share the same replayer.
- **`BundleCorpus.openViewer`:** corpus entry's `openViewer()` returns a `BundleViewer` whose bundle matches `loadBundle()`; entry is still frozen after `openViewer` is attached.
- **`fromSource`:** materializes a bundle through `SessionSource` and constructs a viewer; integration test uses `MemorySink`.
- **Lazy version check:** `SessionReplayer._verifyVersionCompat` errors fire only on first `frame.state()` / `frame.snapshot()` / `viewer.replayer()`, not at viewer construction.
- **`diffSnapshots` helper:** computes a `TickDiff`-shaped object from two `WorldSnapshot`s, matches what folding the recorded TickDiffs would produce when no failures, sparseness, or recycling are involved.
- **`diffSnapshots` scope:** snapshot-only fields per §7 (`WorldSnapshot.config.*`, `WorldSnapshot.entities.{generations,alive,freeList}`, `WorldSnapshot.componentOptions`, `WorldSnapshot.rng`, `WorldSnapshot.version`) are intentionally NOT in the returned `TickDiff`; a test pins this by serializing two worlds with deliberately differing `rng` state and asserting the result is empty for the `rng` field (which TickDiff has no slot for, so the test verifies absence).
- **`diffSince` failure-in-range details:** the thrown `BundleIntegrityError` has `details = { code: 'replay_across_failure', failedTicks: [...], fromTick, toTick }`; the `instanceof` and `details.code` match what `openAt` throws.
- **`diffSince` NaN/non-integer otherTick:** throws `BundleViewerError({ code: 'query_invalid' })`.
- **Eager query validation:** `viewer.events({ from: NaN })` throws synchronously at the call site, before any iteration begins.

Tests use real bundles produced through `SessionRecorder` and `runSynthPlaytest`; do not hand-construct partial bundle shapes except where the test specifically targets a malformed-input case.

## 12. Doc Surface

Per AGENTS.md, implementation updates:

- `docs/api-reference.md`: new `## Bundle Viewer (v0.8.7)` section for `BundleViewer`, `BundleViewerOptions`, `TickFrame`, `RecordedTickFrameEvent`, `RecordedTickEvent`, `BundleStateDiff`, `MarkerQuery`, `EventQuery`, `CommandQuery`, `ExecutionQuery`, `TickRange`, `DiffOptions`, `BundleViewerError`, `BundleViewerErrorCode`, `BundleViewerErrorDetails`, `diffSnapshots`.
- `docs/guides/bundle-viewer.md` (**new file**): quickstart, marker-anchored navigation, tick iteration, diff folding vs snapshot fallback, worldFactory requirements, integration with `BundleCorpus`, integration with `SessionReplayer`, sparse-tick behavior, content-bounded `recordedRange` for incomplete bundles, failure-in-range behavior, performance notes.
- `docs/guides/session-recording.md`: add an "Inspecting bundles" section pointing at the viewer.
- `docs/guides/bundle-corpus-index.md`: extend the replay-investigation example to use `entry.openViewer()`.
- `docs/guides/ai-integration.md`: add Spec 4 as a Tier-3 inspection surface for agents.
- `docs/guides/concepts.md`: add `BundleViewer` to the standalone utilities list.
- `docs/guides/serialization-and-diffs.md` (if present): note `diffSnapshots` as the snapshot-pair diff helper.
- `README.md`: Feature Overview row, Public Surface bullet, version badge update.
- `docs/README.md`: guide index entry for `bundle-viewer.md`.
- `docs/architecture/ARCHITECTURE.md`: Component Map row + Boundaries paragraph for Bundle Viewer; clarify that the viewer is a thin wrapper over `SessionReplayer` + bundle indices and that `diffSnapshots` lives in `src/snapshot-diff.ts`.
- `docs/architecture/drift-log.md`: append a row.
- `docs/architecture/decisions.md`: append ADRs 32-35.
- `docs/design/ai-first-dev-roadmap.md`: update Spec 4 status when implemented.
- `docs/changelog.md`, `docs/devlog/summary.md`, latest detailed devlog, `package.json`, `src/version.ts`: v0.8.7 additive release entry.

The implementation plan must include the mandatory doc audit. The code-review prompt must include doc accuracy verification.

## 13. Versioning

Current base is v0.8.6 (post commit `7479541`, the AGENTS.md model-bump release). Spec 4 v1 is additive and non-breaking:

- New `BundleViewer` subsystem.
- New public types (`BundleViewerOptions`, `TickFrame`, `RecordedTickFrameEvent`, `RecordedTickEvent`, `BundleStateDiff`, `DiffOptions`, query types) and error class.
- New public method on `BundleCorpusEntry` (`openViewer`). Additive non-optional method; runtime-safe because `BundleCorpus.makeEntry` is the only constructor and the implementation attaches the method before freeze.
- New `diffSnapshots` helper exported from `src/snapshot-diff.ts` (re-exported via `bundle-viewer.ts`).
- No changes to `SessionReplayer`, `SessionBundle`, `FileSink`, `MemorySink`, or other existing surfaces.

Ship as v0.8.7 (`c` bump). One coherent implementation commit should include code, tests, docs, ADRs, roadmap status, changelog, devlog, README badge, API reference, doc audit evidence, and version bump.

## 14. ADRs

### ADR 32: Viewer is a thin wrapper over SessionReplayer + bundle indices

**Decision:** `BundleViewer` does not duplicate `SessionReplayer.openAt`. It lazily constructs and memoizes its own internal `SessionReplayer` and adds only the marker/tick-entry/failure indices and frame ergonomics that `SessionReplayer` deliberately does not expose. `SessionReplayer` itself is unchanged.

**Rationale:** `SessionReplayer` is the authoritative replay primitive. Re-implementing snapshot navigation and per-tick command grouping would create a parallel codepath that could drift from replay semantics. Lazy construction keeps the worldFactory requirement scoped to the calls that actually materialize state. The viewer rebuilds its own per-tick command/event/execution indices independent of the replayer's private indices because the cost is bounded and avoiding cross-class private access keeps both modules simple.

### ADR 33: TickFrame is a value, not a reactive object

**Decision:** `TickFrame` is a plain frozen object returned by `atTick`/`atMarker`/`timeline`. There is no subscribe-to-changes API, no reverse pointer back to the viewer, and no method to "advance to next tick" on the frame itself. `frame.events` uses bundle-shape `{ type, data }` (no per-event tick); the iterator-yielded `RecordedTickEvent` is the form that adds tick because iteration spans ticks.

**Rationale:** v1 is for a closed, immutable bundle. Reactive APIs presuppose either live recording or an editing surface, neither of which is in scope. Plain-object frames are easy to test, easy to log, and free of allocation overhead for callers that just want one tick's data. Using two distinct event types (frame-anchored vs iterator-yielded) keeps both forms allocation-cheap: the frame reuses the bundle's stored event objects under a `Readonly` cast, and the iterator allocates `RecordedTickEvent` only for emitted entries. Immutability uses **selective runtime freezing**: outer frames are `Object.freeze`d once per `atTick` call (one freeze on a fresh object; not the linear cost of deep-freezing every event/command), and the per-tick arrays are frozen once at viewer construction (constant amortized cost across all `atTick` calls referring to the same tick). Individual array elements (event/command/execution/marker objects) are NOT runtime-frozen because that would be O(events + commands + executions + markers) at construction, the wrong tradeoff for long captures. Tests verify the layered contract: assignment to `frame.tick` throws (frame frozen), `frame.events.push(x)` throws (array frozen), `(frame.events[0] as any).type = 'foo'` succeeds (element not frozen — documented bypass with no integrity guarantee). This matches the engine's existing high-frequency-surface convention (`world.grid`'s frozen-delegate is one-shot at construction; `BundleCorpusEntry` freeze is per-entry at construction).

### ADR 34: diffSince has two paths and the source is observable

**Decision:** `frame.diffSince` defaults to folding recorded `TickDiff`s when *all* of these hold: both endpoints are in the same non-failure segment, every tick in `(fromTick, toTick]` has a `SessionTickEntry`, and no entity ID is recycled within `(fromTick, toTick]`. Otherwise it falls back to a snapshot-vs-snapshot diff via `replayer.openAt(...).serialize()` and `diffSnapshots`. The returned `BundleStateDiff.source` field tells the caller which path produced the result. When a recorded `TickFailure` falls within `(fromTick, toTick]`, neither path is sound and `frame.diffSince` throws `BundleIntegrityError({ code: 'replay_across_failure' })` — the same error `openAt` would throw at that boundary.

**Rationale:** Tick-diff folding is fast and does not require a `worldFactory`, but it is incorrect across failures, when intermediate ticks lack a `SessionTickEntry` (state can change without commands or executions, so absence of entry is the right fallback signal), and when entity IDs are recycled (`TickDiff` carries no generation, so folding aliases lifetimes). The snapshot fallback is correct under the same constraints `openAt` already enforces — and explicitly fails when failures are in range, just like `openAt` itself. Exposing the source field lets callers reason about which path produced the result, especially for tooling that displays "this diff was reconstructed from N tick-diffs" vs "this diff was computed from snapshots."

### ADR 35: No BYO `SessionReplayer` in v1

**Decision:** v3 of the design drops the iter-1/v2 `BundleViewerOptions.replayer` field. Callers cannot pass a pre-built `SessionReplayer` to the viewer. The viewer's only worldFactory access path is `BundleViewerOptions.worldFactory`; the internal replayer is lazily constructed and memoized.

**Rationale:** The original motivation was to avoid duplicate per-tick index construction when a caller already had a replayer. Two integration problems collapsed that: (a) `SessionReplayer.fromSource(source).bundle` materializes a fresh bundle (`src/session-replayer.ts:155`), so any `BundleViewer.fromSource(source, { replayer })` would fail an identity check between the viewer's bundle and the replayer's bundle even when the two are semantically equivalent; (b) `BundleCorpusEntry.openViewer({ replayer })` would similarly fail because `loadBundle()` materializes fresh on every call. The escape hatches (fingerprint compare, share-bundle invariants) all leak the implementation detail that bundles are reference-identity. Dropping the option in v1 simplifies the surface; callers wanting to share work between replayer and viewer should construct the viewer first, then call `viewer.replayer()` to get the memoized replayer.

## 15. Open Questions

1. **Should `BundleViewer` cache `frame.state()` worlds?** v1 says no — each `state()` call reconstructs a paused World via `openAt`. Caching changes mutability semantics (a returned World is a live mutable object) and complicates determinism. Defer until benchmark pressure proves it.
2. **Should `frame.diffSince` accept a `Marker` as the otherTick anchor?** v1 says no — callers compose `viewer.atMarker(id).tick` themselves. Adding overload signatures bloats the surface without adding capability.
3. **Should the viewer expose a "frames between" generator?** Possible follow-up, e.g. `viewer.framesBetween(fromTick, toTick)`. v1 keeps the surface minimal; callers can iterate `recordedRange` and call `atTick` if needed.

(OQs from v1 about marker-beyond-`persistedEndTick` resolution and `diffSnapshots` placement are now resolved in §6.1, §6, and §4 respectively.)

## 16. Future Specs

| Future Spec | What it adds |
| --- | --- |
| Spec 5: Counterfactual Replay / Fork | `viewer.atTick(t).fork().substituteCommands(...).run()` — substitutes inputs and replays forward. The viewer's tick-anchored API becomes the natural entry point. |
| Future: Bundle Viewer UI | A separate package consumes `BundleViewer` and renders timeline scrubbing, diff overlays, marker pins. v1 deliberately ships the data model so the UI is bolt-on. |
| Future: Cross-Bundle Diff | A `divergence` API that consumes two `BundleViewer`s and surfaces where they diverge. Pairs with Spec 5. |
| Future: Frame Caching | Optional opt-in cache on `frame.state()` for callers that re-open the same tick repeatedly (e.g., interactive tooling). |
| Future: Async Source | Async `fromSource` for remote/object-store bundles, paired with the async corpus future. |

## 17. Acceptance Criteria

- `BundleViewer`, `BundleViewerOptions`, `TickFrame`, `RecordedTickFrameEvent`, `RecordedTickEvent`, `BundleStateDiff`, `MarkerQuery`, `EventQuery`, `CommandQuery`, `ExecutionQuery`, `TickRange`, `DiffOptions`, `BundleViewerError`, `BundleViewerErrorCode`, `BundleViewerErrorDetails`, and `diffSnapshots` are exported from `src/index.ts`.
- `BundleCorpusEntry.openViewer(options?)` is exported and integration-tested. The corpus entry remains frozen after `openViewer` is attached.
- `BundleViewer` accepts a `SessionBundle` directly and a `SessionSource` via `fromSource`.
- `recordedRange` is content-bounded (clamped by stream max tick) and `replayableRange` matches `SessionReplayer.openAt`'s upper bound; documented relationships hold for complete and incomplete bundles.
- `atTick` and `atMarker` return frozen `TickFrame`s with deterministic content. Sparse ticks return frames with `events: []`, `diff: null`, `metrics: null`, `debug: null` but with `commands` / `executions` / `markers` / `failures` sourced from independent per-tick indices.
- `timeline()`, `events()`, `commands()`, `executions()`, `markers()`, and `failures()` iterate in the orderings defined in §8 and respect their query filters; query type defaults match the class default `Record<string, never>`.
- `frame.events` uses the bundle-shape `RecordedTickFrameEvent`; `viewer.events()` yields `RecordedTickEvent` with tick.
- `frame.state()`, `frame.snapshot()`, `frame.diffSince()` (snapshot path), and `viewer.replayer()` work when a `worldFactory` is supplied; throw `world_factory_required` otherwise. Replayer is memoized.
- `frame.diffSince()` folds tick-diffs by default and reports `source: 'tick-diffs'`; falls back to `source: 'snapshot'` for `options.fromSnapshot`, sparse intermediates, and entity-ID recycling. Throws `BundleIntegrityError({ code: 'replay_across_failure' })` for any `ft` in `(fromTick, toTick]`. `fromTick === min(...)`, `toTick === max(...)` regardless of caller order; equal endpoints yield empty diff with `source: 'tick-diffs'`. NaN / non-integer `otherTick` throws `query_invalid`.
- Errors carry `details.code`. Metadata navigation throws `BundleViewerError`; replay materialization bubbles `BundleRangeError` / `BundleIntegrityError` / `ReplayHandlerMissingError` from `SessionReplayer`.
- All four engine gates pass: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Multi-CLI design, plan, and code reviews converge per AGENTS.md.
- Docs, ADRs, roadmap, changelog, devlog, README badge, API reference, doc audit evidence, and version bump land in the same commit as code.
