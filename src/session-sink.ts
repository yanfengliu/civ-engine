import { assertJsonCompatible, bytesToBase64 } from './json.js';
import type { WorldSnapshot } from './serializer.js';
import type {
  AttachmentDescriptor,
  Marker,
  RecordedCommand,
  SessionBundle,
  SessionMetadata,
  SessionSnapshotEntry,
  SessionTickEntry,
} from './session-bundle.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
import { SinkWriteError } from './session-errors.js';
import type { CommandExecutionResult, TickFailure } from './world.js';

/**
 * Synchronous write interface for session-recording sinks. The
 * `SessionRecorder` (T5) calls these methods from its `World` listener
 * callbacks; per spec §8 v1 sinks are synchronous to compose with the
 * engine's synchronous listener invariants.
 */
export interface SessionSink {
  open(metadata: SessionMetadata): void;
  writeTick(entry: SessionTickEntry): void;
  writeCommand(record: RecordedCommand): void;
  writeCommandExecution(result: CommandExecutionResult): void;
  writeTickFailure(failure: TickFailure): void;
  writeSnapshot(entry: SessionSnapshotEntry): void;
  writeMarker(marker: Marker): void;
  /**
   * Stores the attachment bytes per the requested `descriptor.ref` policy
   * (`{ dataUrl }` → embed in manifest as base64 data URL; `{ sidecar: true }`
   * → store bytes externally). Returns the FINAL descriptor with `ref`
   * resolved (sinks may rewrite `dataUrl` placeholder values to populated
   * data URLs, or downgrade dataUrl to sidecar if the sink does not embed).
   * Recorders MUST use the returned descriptor as the source of truth.
   */
  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor;
  close(): void;
}

/**
 * Read interface paired with `SessionSink`. Both `MemorySink` and `FileSink`
 * implement the union (`SessionSink & SessionSource`). The `SessionReplayer`
 * (T6) consumes a `SessionSource` to rehydrate bundle data lazily.
 */
export interface SessionSource {
  readonly metadata: SessionMetadata;
  readSnapshot(tick: number): WorldSnapshot;
  readSidecar(id: string): Uint8Array;
  ticks(): IterableIterator<SessionTickEntry>;
  commands(): IterableIterator<RecordedCommand>;
  executions(): IterableIterator<CommandExecutionResult>;
  failures(): IterableIterator<TickFailure>;
  markers(): IterableIterator<Marker>;
  attachments(): IterableIterator<AttachmentDescriptor>;
  /** Finalize and return the canonical strict-JSON `SessionBundle`. */
  toBundle(): SessionBundle;
}

const DEFAULT_SIDECAR_THRESHOLD_BYTES = 64 * 1024;

export interface MemorySinkOptions {
  /**
   * Allow attachments larger than `sidecarThresholdBytes` to be stored as
   * sidecars (in a parallel internal `Map<string, Uint8Array>` accessed via
   * `readSidecar(id)`). Default `false` — oversize attachments throw
   * `SinkWriteError(code: 'oversize_attachment')` so that callers who treat
   * the bundle as pure JSON do not encounter surprise external state.
   */
  allowSidecar?: boolean;
  /**
   * Threshold for the dataUrl-vs-sidecar default decision. Attachments at or
   * below this size embed as `dataUrl` in the manifest; above, sidecar (if
   * `allowSidecar: true`) or throw. Default 64 KiB.
   */
  sidecarThresholdBytes?: number;
}

/**
 * In-memory `SessionSink & SessionSource`. Holds writes in arrays and an
 * attachment map; `toBundle()` returns a strict-JSON `SessionBundle`
 * synchronously.
 */
export class MemorySink implements SessionSink, SessionSource {
  private _metadata: SessionMetadata | null = null;
  private readonly _ticks: SessionTickEntry[] = [];
  private readonly _commands: RecordedCommand[] = [];
  private readonly _executions: CommandExecutionResult[] = [];
  private readonly _failures: TickFailure[] = [];
  private readonly _snapshots: SessionSnapshotEntry[] = [];
  private readonly _markers: Marker[] = [];
  private readonly _attachments: AttachmentDescriptor[] = [];
  private readonly _sidecars = new Map<string, Uint8Array>();
  private readonly _allowSidecar: boolean;
  private readonly _threshold: number;
  private _closed = false;

  constructor(options?: MemorySinkOptions) {
    this._allowSidecar = options?.allowSidecar ?? false;
    this._threshold = options?.sidecarThresholdBytes ?? DEFAULT_SIDECAR_THRESHOLD_BYTES;
  }

  get metadata(): SessionMetadata {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened', { code: 'not_opened' });
    }
    return this._metadata;
  }

  open(metadata: SessionMetadata): void {
    if (this._closed) {
      throw new SinkWriteError('sink already closed', { code: 'already_closed' });
    }
    this._metadata = { ...metadata };
  }

  private _assertOpen(): void {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened', { code: 'not_opened' });
    }
    if (this._closed) {
      throw new SinkWriteError('sink already closed', { code: 'already_closed' });
    }
  }

  writeTick(entry: SessionTickEntry): void {
    this._assertOpen();
    assertJsonCompatible(entry, 'session tick entry');
    this._ticks.push(entry);
  }

  writeCommand(record: RecordedCommand): void {
    this._assertOpen();
    assertJsonCompatible(record, 'recorded command');
    this._commands.push(record);
  }

  writeCommandExecution(result: CommandExecutionResult): void {
    this._assertOpen();
    assertJsonCompatible(result, 'command execution result');
    this._executions.push(result);
  }

  writeTickFailure(failure: TickFailure): void {
    this._assertOpen();
    assertJsonCompatible(failure, 'tick failure');
    this._failures.push(failure);
    if (this._metadata) {
      this._metadata.failedTicks = [...(this._metadata.failedTicks ?? []), failure.tick];
    }
  }

  writeSnapshot(entry: SessionSnapshotEntry): void {
    this._assertOpen();
    assertJsonCompatible(entry, 'snapshot entry');
    this._snapshots.push(entry);
    if (this._metadata) {
      this._metadata.persistedEndTick = entry.tick;
    }
  }

  writeMarker(marker: Marker): void {
    this._assertOpen();
    assertJsonCompatible(marker, 'marker');
    this._markers.push(marker);
  }

  writeAttachment(descriptor: AttachmentDescriptor, data: Uint8Array): AttachmentDescriptor {
    this._assertOpen();
    const oversized = data.byteLength > this._threshold;
    const wantsSidecar = 'sidecar' in descriptor.ref;
    if (oversized && !wantsSidecar && !this._allowSidecar) {
      throw new SinkWriteError(
        `attachment ${descriptor.id} (${data.byteLength} bytes) exceeds threshold ` +
          `${this._threshold} and sidecar is not enabled (pass MemorySinkOptions.allowSidecar: true)`,
        { code: 'oversize_attachment', sizeBytes: data.byteLength, threshold: this._threshold },
      );
    }
    let final: AttachmentDescriptor;
    if (wantsSidecar || (oversized && this._allowSidecar)) {
      this._sidecars.set(descriptor.id, new Uint8Array(data));
      final = { id: descriptor.id, mime: descriptor.mime, sizeBytes: descriptor.sizeBytes, ref: { sidecar: true } };
    } else {
      const b64 = bytesToBase64(data);
      final = {
        id: descriptor.id, mime: descriptor.mime, sizeBytes: descriptor.sizeBytes,
        ref: { dataUrl: `data:${descriptor.mime};base64,${b64}` },
      };
    }
    this._attachments.push(final);
    return final;
  }

  close(): void {
    if (this._closed) return;
    this._closed = true;
  }

  // --- SessionSource ---

  readSnapshot(tick: number): WorldSnapshot {
    const found = this._snapshots.find((s) => s.tick === tick);
    if (!found) {
      throw new SinkWriteError(`snapshot at tick ${tick} not found`, { code: 'snapshot_missing', tick });
    }
    return found.snapshot;
  }

  readSidecar(id: string): Uint8Array {
    const found = this._sidecars.get(id);
    if (!found) {
      throw new SinkWriteError(`sidecar ${id} not found`, { code: 'sidecar_missing', id });
    }
    return new Uint8Array(found);
  }

  *ticks(): IterableIterator<SessionTickEntry> { for (const t of this._ticks) yield t; }
  *commands(): IterableIterator<RecordedCommand> { for (const c of this._commands) yield c; }
  *executions(): IterableIterator<CommandExecutionResult> { for (const e of this._executions) yield e; }
  *failures(): IterableIterator<TickFailure> { for (const f of this._failures) yield f; }
  *markers(): IterableIterator<Marker> { for (const m of this._markers) yield m; }
  *attachments(): IterableIterator<AttachmentDescriptor> { for (const a of this._attachments) yield a; }

  toBundle(): SessionBundle {
    if (!this._metadata) {
      throw new SinkWriteError('sink not opened; cannot build bundle', { code: 'not_opened' });
    }
    if (this._snapshots.length === 0) {
      throw new SinkWriteError(
        'no snapshots written; cannot build bundle (initialSnapshot is required)',
        { code: 'no_snapshots' },
      );
    }
    // The unparameterized `SessionBundle` resolves to defaults
    // <Record<string, never>, Record<string, never>, JsonValue>; the internal
    // arrays carry <Record<string, unknown>> (their default). Both shapes are
    // structurally identical at runtime; the cast reconciles the compile-time
    // variance. Consumers reading via SessionSource get the runtime shape
    // they expect; SessionReplayer (T6) parameterizes its own types.
    return {
      schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
      metadata: { ...this._metadata },
      initialSnapshot: this._snapshots[0].snapshot,
      ticks: this._ticks.slice() as SessionBundle['ticks'],
      commands: this._commands.slice() as unknown as SessionBundle['commands'],
      executions: this._executions.slice() as SessionBundle['executions'],
      failures: this._failures.slice(),
      snapshots: this._snapshots.slice(1),
      markers: this._markers.slice(),
      attachments: this._attachments.slice(),
    };
  }
}
