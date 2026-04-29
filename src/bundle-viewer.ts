import type { JsonValue } from './json.js';
import {
  bucketByTick,
  emptyTickDiff,
  EMPTY_FROZEN_ARRAY,
  foldTickDiffs,
  oneOrManySet,
} from './bundle-viewer-internal.js';
import {
  BundleViewerError,
  viewerError,
  type BundleStateDiff,
  type BundleViewerErrorCode,
  type BundleViewerErrorDetails,
  type BundleViewerOptions,
  type CommandQuery,
  type DiffOptions,
  type EventQuery,
  type ExecutionQuery,
  type MarkerQuery,
  type RecordedTickEvent,
  type RecordedTickFrameEvent,
  type TickFrame,
  type TickRange,
} from './bundle-viewer-types.js';
import {
  SESSION_BUNDLE_SCHEMA_VERSION,
  type Marker,
  type MarkerKind,
  type MarkerProvenance,
  type RecordedCommand,
  type SessionBundle,
  type SessionMetadata,
  type SessionTickEntry,
} from './session-bundle.js';
import { BundleIntegrityError, BundleVersionError } from './session-errors.js';
import { SessionReplayer, type ReplayerConfig } from './session-replayer.js';
import type { SessionSource } from './session-sink.js';
import type { TickDiff } from './diff.js';
import { diffSnapshots } from './snapshot-diff.js';
import type { CommandExecutionResult, TickFailure } from './world.js';

// Re-export the public type/error surface (callers import from
// `civ-engine` / `src/bundle-viewer.js` and shouldn't need to know
// about the types-file split).
export {
  BundleViewerError,
  diffSnapshots,
  type BundleStateDiff,
  type BundleViewerErrorCode,
  type BundleViewerErrorDetails,
  type BundleViewerOptions,
  type CommandQuery,
  type DiffOptions,
  type EventQuery,
  type ExecutionQuery,
  type MarkerQuery,
  type RecordedTickEvent,
  type RecordedTickFrameEvent,
  type TickFrame,
  type TickRange,
};

/**
 * Programmatic agent-driver API over a `SessionBundle`. The viewer treats the
 * input bundle as logically immutable: it builds frozen per-tick indices at
 * construction. Mutating the bundle after construction is not supported and
 * may desynchronize iterators (which read live bundle state for ordering)
 * from per-tick frame views (which use frozen construction-time indices).
 * Callers should treat the bundle as read-only after passing it to the viewer.
 */
export class BundleViewer<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  readonly bundle: Readonly<SessionBundle<TEventMap, TCommandMap, TDebug>>;
  readonly metadata: Readonly<SessionMetadata>;
  readonly recordedRange: { readonly start: number; readonly end: number };
  readonly replayableRange: { readonly start: number; readonly end: number };
  readonly markerIndex: ReadonlyMap<string, Marker>;

  private readonly _worldFactory: ReplayerConfig<TEventMap, TCommandMap>['worldFactory'] | undefined;
  private readonly _eventsByTick: Map<number, readonly RecordedTickFrameEvent<TEventMap>[]>;
  private readonly _commandsByTick: Map<number, readonly RecordedCommand<TCommandMap>[]>;
  private readonly _executionsByTick: Map<number, readonly CommandExecutionResult<keyof TCommandMap>[]>;
  private readonly _markersByTick: Map<number, readonly Marker[]>;
  private readonly _failuresByTick: Map<number, TickFailure>;
  private readonly _tickEntriesByTick: Map<number, SessionTickEntry<TEventMap, TDebug>>;
  private readonly _sortedTicks: readonly number[];
  private readonly _sortedExecutionTicks: readonly number[];
  private readonly _sortedCommands: readonly RecordedCommand<TCommandMap>[];
  private readonly _sortedMarkers: readonly Marker[];
  private readonly _sortedFailures: readonly TickFailure[];
  private _replayer: SessionReplayer<TEventMap, TCommandMap, TDebug> | null = null;

  constructor(
    bundle: SessionBundle<TEventMap, TCommandMap, TDebug>,
    options?: BundleViewerOptions<TEventMap, TCommandMap>,
  ) {
    if (bundle.schemaVersion !== SESSION_BUNDLE_SCHEMA_VERSION) {
      throw new BundleVersionError(
        `unsupported bundle schemaVersion ${bundle.schemaVersion}; expected ${SESSION_BUNDLE_SCHEMA_VERSION}`,
        { code: 'unsupported_schema', schemaVersion: bundle.schemaVersion as number, expected: SESSION_BUNDLE_SCHEMA_VERSION },
      );
    }
    this.bundle = bundle;
    this.metadata = bundle.metadata;
    this._worldFactory = options?.worldFactory;

    const markerIndex = new Map<string, Marker>();
    for (const marker of bundle.markers) {
      if (markerIndex.has(marker.id)) {
        throw new BundleIntegrityError(
          `duplicate marker id "${marker.id}"`,
          { code: 'duplicate_marker_id', markerId: marker.id },
        );
      }
      markerIndex.set(marker.id, marker);
    }
    this.markerIndex = markerIndex;

    this._eventsByTick = new Map();
    this._tickEntriesByTick = new Map();
    for (const entry of bundle.ticks) {
      this._tickEntriesByTick.set(entry.tick, entry);
      const arr = entry.events as ReadonlyArray<RecordedTickFrameEvent<TEventMap>>;
      this._eventsByTick.set(entry.tick, Object.freeze(arr.slice()));
    }

    this._commandsByTick = bucketByTick(bundle.commands, (c) => c.submissionTick, (a, b) => a.sequence - b.sequence);
    this._executionsByTick = bucketByTick(bundle.executions, (e) => e.tick);
    this._markersByTick = bucketByTick(bundle.markers, (m) => m.tick, (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    this._failuresByTick = new Map();
    for (const f of bundle.failures) this._failuresByTick.set(f.tick, f);

    this._sortedTicks = Object.freeze([...this._tickEntriesByTick.keys()].sort((a, b) => a - b));
    this._sortedExecutionTicks = Object.freeze([...this._executionsByTick.keys()].sort((a, b) => a - b));
    this._sortedCommands = Object.freeze(
      [...bundle.commands].sort((a, b) => a.submissionTick - b.submissionTick || a.sequence - b.sequence),
    );
    this._sortedMarkers = Object.freeze(
      [...bundle.markers].sort((a, b) => a.tick - b.tick || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    );
    this._sortedFailures = Object.freeze([...bundle.failures].sort((a, b) => a.tick - b.tick));

    const md = bundle.metadata;
    let contentMaxTick = md.startTick;
    for (const t of bundle.ticks) if (t.tick > contentMaxTick) contentMaxTick = t.tick;
    for (const c of bundle.commands) if (c.submissionTick > contentMaxTick) contentMaxTick = c.submissionTick;
    for (const e of bundle.executions) if (e.tick > contentMaxTick) contentMaxTick = e.tick;
    for (const m of bundle.markers) if (m.tick > contentMaxTick) contentMaxTick = m.tick;
    for (const f of bundle.failures) if (f.tick > contentMaxTick) contentMaxTick = f.tick;
    this.recordedRange = Object.freeze({
      start: md.startTick,
      end: Math.min(md.endTick, contentMaxTick),
    });
    this.replayableRange = Object.freeze({
      start: md.startTick,
      end: md.incomplete ? md.persistedEndTick : md.endTick,
    });
  }

  static fromSource<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(
    source: SessionSource,
    options?: BundleViewerOptions<TEventMap, TCommandMap>,
  ): BundleViewer<TEventMap, TCommandMap, TDebug> {
    const bundle = source.toBundle() as unknown as SessionBundle<TEventMap, TCommandMap, TDebug>;
    return new BundleViewer<TEventMap, TCommandMap, TDebug>(bundle, options);
  }

  ticks(): readonly number[] { return this._sortedTicks; }

  atTick(tick: number): TickFrame<TEventMap, TCommandMap, TDebug> {
    if (!Number.isInteger(tick)) {
      throw viewerError('query_invalid', `tick must be an integer; got ${tick}`);
    }
    if (tick < this.recordedRange.start || tick > this.recordedRange.end) {
      throw viewerError(
        'tick_out_of_range',
        `tick ${tick} outside recordedRange [${this.recordedRange.start}, ${this.recordedRange.end}]`,
        { tick, start: this.recordedRange.start, end: this.recordedRange.end },
      );
    }
    return this._buildFrame(tick);
  }

  atMarker(id: string): TickFrame<TEventMap, TCommandMap, TDebug> {
    const marker = this.markerIndex.get(id);
    if (!marker) throw viewerError('marker_missing', `marker "${id}" not found`, { markerId: id });
    return this._buildFrame(marker.tick);
  }

  *timeline(): IterableIterator<TickFrame<TEventMap, TCommandMap, TDebug>> {
    for (const tick of this._sortedTicks) yield this._buildFrame(tick);
  }

  markers(query?: MarkerQuery): IterableIterator<Marker> {
    const range = this._normalizeRange(query);
    const kindFilter = oneOrManySet(query?.kind);
    const provFilter = oneOrManySet(query?.provenance);
    const idFilter = query?.id;
    return this._markersGen(range, kindFilter, provFilter, idFilter);
  }

  private *_markersGen(
    range: { from: number; to: number },
    kindFilter: Set<MarkerKind> | null,
    provFilter: Set<MarkerProvenance> | null,
    idFilter: string | RegExp | undefined,
  ): IterableIterator<Marker> {
    for (const m of this._sortedMarkers) {
      if (m.tick < range.from || m.tick > range.to) continue;
      if (kindFilter && !kindFilter.has(m.kind)) continue;
      if (provFilter && !provFilter.has(m.provenance)) continue;
      if (idFilter !== undefined) {
        if (typeof idFilter === 'string') { if (m.id !== idFilter) continue; }
        else if (!idFilter.test(m.id)) continue;
      }
      yield m;
    }
  }

  events(query?: EventQuery<TEventMap>): IterableIterator<RecordedTickEvent<TEventMap>> {
    const range = this._normalizeRange(query);
    const typeFilter = oneOrManySet(query?.type);
    return this._eventsGen(range, typeFilter);
  }

  private *_eventsGen(
    range: { from: number; to: number },
    typeFilter: Set<keyof TEventMap & string> | null,
  ): IterableIterator<RecordedTickEvent<TEventMap>> {
    for (const tick of this._sortedTicks) {
      if (tick < range.from || tick > range.to) continue;
      const events = this._eventsByTick.get(tick) ?? EMPTY_FROZEN_ARRAY;
      for (const ev of events) {
        if (typeFilter && !typeFilter.has(ev.type as keyof TEventMap & string)) continue;
        yield {
          tick,
          type: ev.type as keyof TEventMap & string,
          data: ev.data as TEventMap[keyof TEventMap],
        };
      }
    }
  }

  commands(query?: CommandQuery<TCommandMap>): IterableIterator<RecordedCommand<TCommandMap>> {
    const range = this._normalizeRange(query);
    const typeFilter = oneOrManySet(query?.type);
    const outcomeFilter = oneOrManySet(query?.outcome);
    return this._commandsGen(range, typeFilter, outcomeFilter);
  }

  private *_commandsGen(
    range: { from: number; to: number },
    typeFilter: Set<keyof TCommandMap & string> | null,
    outcomeFilter: Set<'accepted' | 'rejected'> | null,
  ): IterableIterator<RecordedCommand<TCommandMap>> {
    for (const c of this._sortedCommands) {
      if (c.submissionTick < range.from || c.submissionTick > range.to) continue;
      if (typeFilter && !typeFilter.has(c.type as keyof TCommandMap & string)) continue;
      if (outcomeFilter) {
        const outcome = c.result.accepted ? 'accepted' : 'rejected';
        if (!outcomeFilter.has(outcome)) continue;
      }
      yield c;
    }
  }

  executions(
    query?: ExecutionQuery<TCommandMap>,
  ): IterableIterator<CommandExecutionResult<keyof TCommandMap>> {
    const range = this._normalizeRange(query);
    const typeFilter = oneOrManySet(query?.type);
    return this._executionsGen(range, typeFilter, query?.executed);
  }

  private *_executionsGen(
    range: { from: number; to: number },
    typeFilter: Set<keyof TCommandMap & string> | null,
    executedFilter: boolean | undefined,
  ): IterableIterator<CommandExecutionResult<keyof TCommandMap>> {
    for (const tick of this._sortedExecutionTicks) {
      if (tick < range.from || tick > range.to) continue;
      const execs = this._executionsByTick.get(tick) ?? EMPTY_FROZEN_ARRAY;
      for (const e of execs) {
        if (typeFilter && !typeFilter.has(e.commandType as keyof TCommandMap & string)) continue;
        if (executedFilter !== undefined && e.executed !== executedFilter) continue;
        yield e as CommandExecutionResult<keyof TCommandMap>;
      }
    }
  }

  failures(query?: TickRange): IterableIterator<TickFailure> {
    const range = this._normalizeRange(query);
    return this._failuresGen(range);
  }

  private *_failuresGen(range: { from: number; to: number }): IterableIterator<TickFailure> {
    for (const f of this._sortedFailures) {
      if (f.tick < range.from || f.tick > range.to) continue;
      yield f;
    }
  }

  replayer(): SessionReplayer<TEventMap, TCommandMap, TDebug> {
    if (this._replayer) return this._replayer;
    if (!this._worldFactory) {
      throw viewerError('world_factory_required', 'BundleViewer requires options.worldFactory for replayer access');
    }
    this._replayer = SessionReplayer.fromBundle<TEventMap, TCommandMap, TDebug>(
      this.bundle,
      { worldFactory: this._worldFactory },
    );
    return this._replayer;
  }

  // -------------------------------------------------------------------------
  // Internal: range validation, frame factory, diff
  // -------------------------------------------------------------------------

  private _normalizeRange(q?: TickRange): { from: number; to: number } {
    const from = q?.from ?? this.recordedRange.start;
    const to = q?.to ?? this.recordedRange.end;
    if (!Number.isFinite(from) || !Number.isInteger(from)) {
      throw viewerError('query_invalid', `query.from must be a finite integer; got ${from}`);
    }
    if (!Number.isFinite(to) || !Number.isInteger(to)) {
      throw viewerError('query_invalid', `query.to must be a finite integer; got ${to}`);
    }
    return { from, to };
  }

  private _buildFrame(tick: number): TickFrame<TEventMap, TCommandMap, TDebug> {
    const entry = this._tickEntriesByTick.get(tick);
    const frame = {
      tick,
      events: this._eventsByTick.get(tick) ?? EMPTY_FROZEN_ARRAY,
      commands: this._commandsByTick.get(tick) ?? EMPTY_FROZEN_ARRAY,
      executions: this._executionsByTick.get(tick) ?? EMPTY_FROZEN_ARRAY,
      markers: this._markersByTick.get(tick) ?? EMPTY_FROZEN_ARRAY,
      diff: entry ? entry.diff : null,
      debug: entry ? entry.debug : null,
      metrics: entry ? entry.metrics : null,
      state: () => this.replayer().openAt(tick),
      snapshot: () => this.replayer().openAt(tick).serialize(),
      diffSince: (otherTick: number, options?: DiffOptions) =>
        this._diffSince(tick, otherTick, options),
    } satisfies TickFrame<TEventMap, TCommandMap, TDebug>;
    return Object.freeze(frame);
  }

  private _diffSince(thisTick: number, otherTick: number, options?: DiffOptions): BundleStateDiff {
    if (!Number.isFinite(otherTick) || !Number.isInteger(otherTick)) {
      throw viewerError('query_invalid', `otherTick must be a finite integer; got ${otherTick}`);
    }
    if (otherTick < this.recordedRange.start || otherTick > this.recordedRange.end) {
      throw viewerError(
        'tick_out_of_range',
        `otherTick ${otherTick} outside recordedRange [${this.recordedRange.start}, ${this.recordedRange.end}]`,
        { tick: otherTick, start: this.recordedRange.start, end: this.recordedRange.end },
      );
    }
    const fromTick = Math.min(thisTick, otherTick);
    const toTick = Math.max(thisTick, otherTick);

    if (fromTick === toTick) {
      return Object.freeze({
        fromTick, toTick, source: 'tick-diffs',
        diff: emptyTickDiff(toTick),
      }) as BundleStateDiff;
    }

    // Failure-in-range guard via per-tick failure index.
    const failedTicksInRange: number[] = [];
    for (const t of this._failuresByTick.keys()) {
      if (t > fromTick && t <= toTick) failedTicksInRange.push(t);
    }
    if (failedTicksInRange.length > 0) {
      throw new BundleIntegrityError(
        `cannot diff across recorded TickFailure(s) in (${fromTick}, ${toTick}]`,
        {
          code: 'replay_across_failure',
          failedTicks: failedTicksInRange.sort((a, b) => a - b),
          fromTick,
          toTick,
        },
      );
    }

    const fromSnapshot = options?.fromSnapshot === true;
    let usePath1 = !fromSnapshot;
    if (usePath1) {
      for (let t = fromTick + 1; t <= toTick; t++) {
        if (!this._tickEntriesByTick.has(t)) { usePath1 = false; break; }
      }
    }
    if (usePath1) {
      const created = new Set<number>();
      const destroyed = new Set<number>();
      for (let t = fromTick + 1; t <= toTick; t++) {
        const entry = this._tickEntriesByTick.get(t)!;
        for (const id of entry.diff.entities.created) created.add(id);
        for (const id of entry.diff.entities.destroyed) destroyed.add(id);
      }
      for (const id of created) {
        if (destroyed.has(id)) { usePath1 = false; break; }
      }
    }

    if (usePath1) {
      return {
        fromTick,
        toTick,
        source: 'tick-diffs',
        diff: foldTickDiffs<TEventMap, TDebug>(
          this._tickEntriesByTick as ReadonlyMap<number, SessionTickEntry<TEventMap, TDebug> & { tick: number; diff: TickDiff }>,
          fromTick,
          toTick,
        ),
      };
    }

    if (!this._worldFactory) {
      throw viewerError(
        'world_factory_required',
        'snapshot-fallback diffSince requires options.worldFactory',
        { fromTick, toTick },
      );
    }
    const replayer = this.replayer();
    const snapA = replayer.openAt(fromTick).serialize();
    const snapB = replayer.openAt(toTick).serialize();
    return {
      fromTick,
      toTick,
      source: 'snapshot',
      diff: diffSnapshots(snapA, snapB, { tick: toTick }),
    };
  }
}
