import { randomUUID } from 'node:crypto';
import { cloneJsonValue, type JsonValue } from './json.js';
import type { TickDiff } from './diff.js';
import type {
  AttachmentDescriptor,
  Marker,
  MarkerProvenance,
  RecordedCommand,
  SessionBundle,
  SessionMetadata,
  SessionSnapshotEntry,
  SessionTickEntry,
} from './session-bundle.js';
import {
  RecorderClosedError,
  SessionRecordingError,
  SinkWriteError,
} from './session-errors.js';
import { validateNewMarker } from './session-marker-validation.js';
import './session-internals.js';
import { MemorySink, type SessionSink, type SessionSource } from './session-sink.js';
import { ENGINE_VERSION } from './version.js';
import type {
  CommandExecutionResult,
  CommandSubmissionResult,
  ComponentRegistry,
  TickFailure,
  World,
} from './world.js';

// Re-export type alias for ergonomic public API.
// `tick` is omitted from the base Marker (it's required there) and re-added
// as optional — the recorder defaults `tick` to `world.tick` when omitted.
export type NewMarker = Omit<Marker, 'id' | 'createdAt' | 'provenance' | 'tick'> & { tick?: number };

type SubmitWithResultFn<TCommandMap extends Record<keyof TCommandMap, unknown>> = <
  K extends keyof TCommandMap,
>(type: K, data: TCommandMap[K]) => CommandSubmissionResult<keyof TCommandMap>;

export interface SessionRecorderConfig<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
  // TComponents/TState mirror World's generics so a component-typed world flows
  // in without erasing its registry (recorder-generics objective). Appended
  // after TDebug to keep existing explicit type arguments non-breaking; the
  // typed path works via inference (call with no explicit type args).
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  world: World<TEventMap, TCommandMap, TComponents, TState>;
  /** Default: new MemorySink(). Sink must implement both write (SessionSink) and read (SessionSource) interfaces; both built-in sinks (MemorySink, FileSink) satisfy this. */
  sink?: SessionSink & SessionSource;
  /** Default: 1000. `null` disables periodic snapshots (only initial + terminal taken). */
  snapshotInterval?: number | null;
  /** Default: true. Writes a final snapshot on `disconnect()` so every bundle has at least the (initial, terminal) segment for selfCheck. */
  terminalSnapshot?: boolean;
  /** Optional debug capture hook; result attached to each `SessionTickEntry`. */
  debug?: { capture(): TDebug | null };
  /** Optional human label propagated into bundle metadata. */
  sourceLabel?: string;
  /**
   * Default: 'session'. Set by harnesses (e.g., runSynthPlaytest passes
   * 'synthetic'). Added in v0.8.0 — see SessionMetadata ADR 20.
   */
  sourceKind?: 'session' | 'scenario' | 'synthetic';
  /**
   * Optional. Populated only when sourceKind === 'synthetic'. Stored as
   * SessionMetadata.policySeed. Added in v0.8.0.
   */
  policySeed?: number;
}

export class SessionRecorder<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly sessionId: string;
  private readonly _world: World<TEventMap, TCommandMap, TComponents, TState>;
  private readonly _sink: SessionSink & SessionSource;
  private readonly _snapshotInterval: number | null;
  private readonly _terminalSnapshot: boolean;
  private readonly _debugCapture?: () => TDebug | null;
  private readonly _sourceLabel?: string;
  private readonly _sourceKind?: 'session' | 'scenario' | 'synthetic';
  private readonly _policySeed?: number;

  private _connected = false;
  private _closed = false;
  private _sinkOpened = false;          // open() succeeded; safe to finalize metadata on disconnect
  private _terminated = false;          // true after a sink failure short-circuits writes
  private _startTick = 0;
  private _tickCount = 0;
  private _markerCount = 0;
  private _snapshotCount = 0;
  private _lastError: SessionRecordingError | null = null;
  private readonly _registeredAttachmentIds = new Set<string>();

  private _originalSubmitWithResult: SubmitWithResultFn<TCommandMap> | null = null;
  private _diffListener: ((d: TickDiff) => void) | null = null;
  private _executionListener: ((r: CommandExecutionResult<keyof TCommandMap>) => void) | null = null;
  private _failureListener: ((f: TickFailure) => void) | null = null;

  constructor(config: SessionRecorderConfig<TEventMap, TCommandMap, TDebug, TComponents, TState>) {
    this.sessionId = randomUUID();
    this._world = config.world;
    this._sink = config.sink ?? new MemorySink();
    this._snapshotInterval = config.snapshotInterval === undefined ? 1000 : config.snapshotInterval;
    this._terminalSnapshot = config.terminalSnapshot ?? true;
    this._debugCapture = config.debug?.capture.bind(config.debug);
    this._sourceLabel = config.sourceLabel;
    this._sourceKind = config.sourceKind;
    this._policySeed = config.policySeed;
  }

  get tickCount(): number { return this._tickCount; }
  get markerCount(): number { return this._markerCount; }
  get snapshotCount(): number { return this._snapshotCount; }
  get isConnected(): boolean { return this._connected; }
  get isClosed(): boolean { return this._closed; }
  get lastError(): SessionRecordingError | null { return this._lastError; }

  connect(): void {
    if (this._closed) {
      throw new RecorderClosedError('recorder is single-use; cannot reconnect after disconnect()',
        { code: 'already_closed' });
    }
    if (this._connected) return;
    if (this._world.isPoisoned()) {
      throw new RecorderClosedError('cannot connect to a poisoned world; call world.recover() first',
        { code: 'world_poisoned' });
    }
    if (this._world.__payloadCapturingRecorder) {
      throw new RecorderClosedError(
        `another payload-capturing recorder is attached (sessionId=${this._world.__payloadCapturingRecorder.sessionId})`,
        { code: 'recorder_already_attached', existing: this._world.__payloadCapturingRecorder.sessionId },
      );
    }

    this._world.__payloadCapturingRecorder = { sessionId: this.sessionId, lastError: null };
    this._startTick = this._world.tick;

    const initialMetadata: SessionMetadata = {
      sessionId: this.sessionId,
      engineVersion: ENGINE_VERSION,
      nodeVersion: typeof process !== 'undefined' && process.version ? process.version : 'unknown',
      recordedAt: new Date().toISOString(),
      startTick: this._startTick,
      endTick: this._startTick,
      persistedEndTick: this._startTick,
      durationTicks: 0,
      sourceKind: this._sourceKind ?? 'session',
      registration: this._world.getRegistrationManifest(),
      ...(this._sourceLabel ? { sourceLabel: this._sourceLabel } : {}),
      ...(this._policySeed !== undefined ? { policySeed: this._policySeed } : {}),
    };
    try {
      this._sink.open(initialMetadata);
      this._sinkOpened = true;
      // Write initial snapshot synchronously so bundles always have one.
      const initial = this._world.serialize();
      this._sink.writeSnapshot({ tick: this._startTick, snapshot: initial });
      this._snapshotCount++;
    } catch (e) {
      this._handleSinkError(e);
      // Still flip connected to ensure disconnect() is callable
      this._connected = true;
      return;
    }

    // Install single submitWithResult wrap (per spec §7.3).
    const original = this._world.submitWithResult.bind(this._world) as SubmitWithResultFn<TCommandMap>;
    this._originalSubmitWithResult = original;
    const capture = this._captureCommand.bind(this);
    (this._world as { submitWithResult: SubmitWithResultFn<TCommandMap> }).submitWithResult = <
      K extends keyof TCommandMap,
    >(type: K, data: TCommandMap[K]): CommandSubmissionResult<keyof TCommandMap> => {
      const result = original(type, data);
      capture(type, data, result);
      return result;
    };

    this._diffListener = (diff: TickDiff): void => this._onDiff(diff);
    this._executionListener = (r: CommandExecutionResult<keyof TCommandMap>): void => this._onExecution(r);
    this._failureListener = (f: TickFailure): void => this._onFailure(f);

    this._world.onDiff(this._diffListener);
    this._world.onCommandExecution(this._executionListener);
    this._world.onTickFailure(this._failureListener);

    this._connected = true;
  }

  disconnect(): void {
    if (!this._connected || this._closed) {
      this._closed = true;
      return;
    }
    // Always write the terminal snapshot (capturing any post-snapshot mutation
    // at this tick, e.g. a setup-window write before a no-step disconnect). Both
    // sinks coalesce by tick (FileSink overwrites the file; MemorySink replaces
    // in place — full-review 2026-06-13 L3), so this never duplicates a tick.
    if (this._terminalSnapshot && !this._terminated) {
      try {
        const terminal = this._world.serialize();
        this._sink.writeSnapshot({ tick: this._world.tick, snapshot: terminal });
        this._snapshotCount++;
      } catch (e) {
        this._handleSinkError(e);
      }
    }

    // Uninstall wrap + listeners.
    if (this._originalSubmitWithResult) {
      (this._world as { submitWithResult: SubmitWithResultFn<TCommandMap> }).submitWithResult =
        this._originalSubmitWithResult;
      this._originalSubmitWithResult = null;
    }
    if (this._diffListener) { this._world.offDiff(this._diffListener); this._diffListener = null; }
    if (this._executionListener) { this._world.offCommandExecution(this._executionListener); this._executionListener = null; }
    if (this._failureListener) { this._world.offTickFailure(this._failureListener); this._failureListener = null; }

    if (this._world.__payloadCapturingRecorder?.sessionId === this.sessionId) {
      delete this._world.__payloadCapturingRecorder;
    }

    // Finalize metadata via a fresh open() with the final values would be wrong;
    // sinks already track persistedEndTick on writeSnapshot. The spec calls
    // for finalized endTick + durationTicks at disconnect; we mutate the
    // sink's metadata and close() persists it. Finalize ONLY when OUR open()
    // succeeded: after a connect-time open() failure there is nothing to
    // finalize (full-review 2026-06-10 M3), and a read-preloaded FileSink
    // exposes the EXISTING bundle's metadata — mutating + close()-writing it
    // would destroy that bundle's manifest (full-review 2026-06-10 iter-2).
    let finalMetadata: SessionMetadata | null = null;
    if (this._sinkOpened) {
      try { finalMetadata = this._sink.metadata; } catch { finalMetadata = null; }
    }
    if (finalMetadata) {
      finalMetadata.endTick = this._world.tick;
      finalMetadata.durationTicks = this._world.tick - this._startTick;
      if (this._terminated) {
        finalMetadata.incomplete = true;
      }
    }

    try {
      this._sink.close();
    } catch (e) {
      this._handleSinkError(e);
    }

    this._connected = false;
    this._closed = true;
  }

  /**
   * Guard for `addMarker` / `attach` / `takeSnapshot`. Rejects calls on
   * disconnected, closed, or post-failure (`_terminated`) recorders. After
   * a partial-`connect()` sink failure, the recorder enters `_terminated`
   * state but stays nominally `_connected` so `disconnect()` can still
   * finalize cleanly. Iter-2 code review L2 fix: previously these methods
   * only checked `!_connected || _closed`, so post-failure calls re-entered
   * the failed sink path and re-threw `SinkWriteError` — now they fail
   * fast with `RecorderClosedError(code: 'recorder_terminated')`.
   */
  private _assertOperational(method: string): void {
    if (this._closed) {
      throw new RecorderClosedError(`cannot ${method} on closed recorder`,
        { code: 'already_closed' });
    }
    if (!this._connected) {
      throw new RecorderClosedError(`cannot ${method} on disconnected recorder`,
        { code: 'not_connected' });
    }
    if (this._terminated) {
      throw new RecorderClosedError(
        `cannot ${method} on terminated recorder (${this._lastError?.message ?? 'unknown error'})`,
        { code: 'recorder_terminated', lastErrorMessage: this._lastError?.message ?? null },
      );
    }
  }

  addMarker(input: NewMarker): string {
    this._assertOperational('addMarker');
    // §6.1 validation lives in session-marker-validation.ts (1.0.2 LOC split).
    const tick = validateNewMarker(input, this._world, this._registeredAttachmentIds);
    const isLive = tick === this._world.tick;
    // Clone refs/data/attachments arrays to detach from caller-owned references.
    // Otherwise post-call mutation by user code would corrupt the recorded
    // bundle. Iter-1 code review fix (Codex H3 / memory aliasing).
    const marker: Marker = cloneJsonValue({
      id: randomUUID(),
      tick,
      kind: input.kind,
      provenance: 'game' as MarkerProvenance,
      createdAt: new Date().toISOString(),
      ...(input.text !== undefined ? { text: input.text } : {}),
      ...(input.refs !== undefined ? { refs: input.refs } : {}),
      ...(input.data !== undefined ? { data: input.data } : {}),
      ...(input.attachments !== undefined ? { attachments: input.attachments } : {}),
      ...(isLive ? {} : { validated: false as const }),
    } as Marker, 'session marker');
    try {
      this._sink.writeMarker(marker);
    } catch (e) {
      this._handleSinkError(e);
      throw e;
    }
    this._markerCount++;
    return marker.id;
  }

  attach(blob: { mime: string; data: Uint8Array }, options?: { sidecar?: boolean }): string {
    this._assertOperational('attach');
    const id = randomUUID();
    // Default ref selection: when caller hasn't explicitly specified
    // `options.sidecar`, pass `{ auto: true }` so each sink applies its
    // own default policy:
    // - `MemorySink`: routes under-threshold attachments to dataUrl,
    //   oversize to sidecar (when `allowSidecar`) or throws.
    // - `FileSink`: keeps blobs as files (sidecar) — disk-backed sink
    //   default.
    // Caller can force a specific policy via `options.sidecar: true`
    // (sidecar) or `options.sidecar: false` (dataUrl).
    let ref: AttachmentDescriptor['ref'];
    if (options?.sidecar === false) {
      ref = { dataUrl: '' };  // explicit opt-in to manifest embedding
    } else if (options?.sidecar === true) {
      ref = { sidecar: true };  // explicit opt-in to sidecar storage
    } else {
      ref = { auto: true };    // no preference; each sink applies its own default
    }
    const desc: AttachmentDescriptor = {
      id, mime: blob.mime, sizeBytes: blob.data.byteLength, ref,
    };
    try {
      this._sink.writeAttachment(desc, blob.data);
      this._registeredAttachmentIds.add(id);
    } catch (e) {
      this._handleSinkError(e);
      throw e;
    }
    return id;
  }

  takeSnapshot(): SessionSnapshotEntry {
    this._assertOperational('takeSnapshot');
    const entry: SessionSnapshotEntry = {
      tick: this._world.tick, snapshot: this._world.serialize(),
    };
    try {
      this._sink.writeSnapshot(entry);
      this._snapshotCount++;
    } catch (e) {
      this._handleSinkError(e);
      throw e;
    }
    return entry;
  }

  // Returns the sink's default-generic bundle (the bundle is the serialized JSON
  // boundary). NOT parameterized with TComponents/TState/TEventMap — a typed
  // return would break consumers that hold the result in a default-generic
  // `SessionBundle` slot (verified against aoe2's runPlaytest). Component typing
  // is reasserted on replay via ReplayerConfig.worldFactory's return type.
  toBundle(): SessionBundle {
    return this._sink.toBundle();
  }

  // --- internal ---

  private _onDiff(diff: TickDiff): void {
    if (this._terminated) return;
    try {
      const events = [...this._world.getEvents()] as Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
      const entry: SessionTickEntry<TEventMap, TDebug> = cloneJsonValue({
        tick: diff.tick, diff,
        events,
        metrics: this._world.getMetrics(),
        debug: this._debugCapture?.() ?? null,
      } as SessionTickEntry<TEventMap, TDebug>, `session tick ${diff.tick}`);
      // Sink uses default-generic SessionTickEntry shape; runtime structure
      // is identical, cast reconciles compile-time generic variance.
      this._sink.writeTick(entry as unknown as SessionTickEntry);
      this._tickCount++;
      // Periodic snapshot: fire only after the start tick (initial snapshot
      // already covered) and at multiples of the configured interval.
      if (this._snapshotInterval !== null && this._world.tick > this._startTick && this._world.tick % this._snapshotInterval === 0) {
        this._sink.writeSnapshot({ tick: this._world.tick, snapshot: this._world.serialize() });
        this._snapshotCount++;
      }
    } catch (e) {
      this._handleSinkError(e);
    }
  }

  private _onExecution(result: CommandExecutionResult<keyof TCommandMap>): void {
    if (this._terminated) return;
    try {
      // SessionSink.writeCommandExecution accepts the default-generic shape;
      // the runtime structure is identical, the cast reconciles compile-time
      // variance over the TCommandMap key constraint.
      this._sink.writeCommandExecution(result as unknown as CommandExecutionResult);
    } catch (e) {
      this._handleSinkError(e);
    }
  }

  private _onFailure(failure: TickFailure): void {
    if (this._terminated) return;
    try {
      this._sink.writeTickFailure(failure);
    } catch (e) {
      this._handleSinkError(e);
    }
  }

  private _captureCommand<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
    result: CommandSubmissionResult<keyof TCommandMap>,
  ): void {
    if (this._terminated) return;
    try {
      // Clone via cloneJsonValue to detach from caller-owned references.
      // Otherwise post-submit mutation by user code would corrupt the
      // recorded bundle. Iter-1 code review fix (Codex H3).
      const record = cloneJsonValue<RecordedCommand<TCommandMap>>({
        submissionTick: result.tick,
        sequence: result.sequence,
        type: type as keyof TCommandMap & string,
        data,
        result,
      }, `recorded command ${result.sequence}`);
      this._sink.writeCommand(record as unknown as RecordedCommand);
    } catch (e) {
      this._handleSinkError(e);
    }
  }

  private _handleSinkError(e: unknown): void {
    const err = e instanceof SessionRecordingError ? e : new SinkWriteError(
      String((e as Error)?.message ?? e),
      { wrapped: true, original: String(e) },
    );
    this._lastError = err;
    if (this._world.__payloadCapturingRecorder) {
      this._world.__payloadCapturingRecorder.lastError = { message: err.message, details: err.details };
    }
    this._terminated = true;
  }
}

