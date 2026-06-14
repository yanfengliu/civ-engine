import type { TickDiff } from './diff.js';
import type { JsonValue } from './json.js';
import type { WorldSnapshot } from './serializer.js';
import type { Position } from './types.js';
import type {
  CommandExecutionResult,
  CommandSubmissionResult,
  TickFailure,
  WorldMetrics,
} from './world.js';
import type { ComponentStoreOptions } from './component-store.js';
import type { SystemPhase } from './world-internal.js';

/**
 * Connect-time registration fingerprint recorded into bundle metadata
 * (registration-manifest objective). Replay verification compares only the
 * factory-owned categories (systems / handlers / validators /
 * destroyCallbackCount); components/options/resources are capture-only —
 * `applySnapshot` heals them from the snapshot. See
 * `docs/threads/done/registration-manifest/DESIGN.md` §1.
 */
export interface RegistrationManifest {
  schemaVersion: 1;
  /** Registration order preserved (execution-relevant for systems;
   *  informational for components). */
  components: Array<{ key: string; options?: ComponentStoreOptions }>;
  systems: Array<{
    name: string;
    phase: SystemPhase;
    interval: number;
    intervalOffset: number;
    before: string[];
    after: string[];
  }>;
  /** Sorted. */
  handlers: string[];
  /** Sorted by key; within-key order is not fingerprintable. */
  validators: Array<{ key: string; count: number }>;
  /** Sorted; capture-only (snapshot-healed). */
  resources: string[];
  destroyCallbackCount: number;
}

export const SESSION_BUNDLE_SCHEMA_VERSION = 1 as const;

export type MarkerKind = 'annotation' | 'assertion' | 'checkpoint';
export type MarkerProvenance = 'engine' | 'game';

export interface EntityRef {
  id: number;
  generation: number;
}

export interface MarkerRefs {
  entities?: EntityRef[];
  cells?: Position[];
  tickRange?: { from: number; to: number };
}

export interface Marker {
  id: string;
  tick: number;
  kind: MarkerKind;
  provenance: MarkerProvenance;
  text?: string;
  refs?: MarkerRefs;
  data?: JsonValue;
  attachments?: string[];
  createdAt?: string;
  validated?: false;
}

export interface RecordedCommand<TCommandMap = Record<string, unknown>> {
  submissionTick: number;
  sequence: number;
  type: keyof TCommandMap & string;
  data: TCommandMap[keyof TCommandMap];
  result: CommandSubmissionResult<keyof TCommandMap>;
}

export interface SessionTickEntry<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  tick: number;
  diff: TickDiff;
  events: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
  metrics: WorldMetrics | null;
  debug: TDebug | null;
}

export interface SessionSnapshotEntry {
  tick: number;
  snapshot: WorldSnapshot;
}

export interface AttachmentDescriptor {
  id: string;
  mime: string;
  sizeBytes: number;
  /**
   * Storage policy for the attachment. Sinks finalize this on `writeAttachment`:
   * - `{ dataUrl: '...' }`: bytes embedded in the manifest as `data:<mime>;base64,...`.
   *   Caller passing `{ dataUrl: '' }` opts into manifest embedding; sink populates the URL.
   * - `{ sidecar: true }`: bytes stored externally (FileSink: `attachments/<id>.<ext>`;
   *   MemorySink: parallel internal Map accessed via `source.readSidecar(id)`).
   * - `{ auto: true }`: caller has no preference; each sink applies its own default
   *   (FileSink → sidecar; MemorySink → dataUrl under threshold, sidecar over with
   *   `allowSidecar: true`, otherwise throw). The `SessionRecorder.attach()` API
   *   uses `auto` when caller didn't pass `options.sidecar`.
   */
  ref: { dataUrl: string } | { sidecar: true } | { auto: true };
}

export interface SessionMetadata {
  sessionId: string;
  engineVersion: string;
  nodeVersion: string;
  recordedAt: string;
  startTick: number;
  endTick: number;
  persistedEndTick: number;
  durationTicks: number;
  /**
   * 'synthetic' added in v0.8.0 (Spec 3 T2). Widening from 'session' | 'scenario'
   * is a breaking change for downstream `assertNever`-style exhaustive switches;
   * b-bump per AGENTS.md. See ADR 20 in docs/architecture/decisions.md.
   */
  sourceKind: 'session' | 'scenario' | 'synthetic';
  sourceLabel?: string;
  incomplete?: true;
  failedTicks?: number[];
  /**
   * Populated only when sourceKind === 'synthetic'. The seed used for the
   * harness's policy sub-RNG; preserved for future replay-via-policy work.
   * Spec 3 §5.4.
   */
  policySeed?: number;
  /**
   * Connect-time registration fingerprint (registration-manifest objective,
   * v0.8.18+). Absent on older bundles and scenario bundles built without it
   * — replay verification then skips, exactly as before.
   */
  registration?: RegistrationManifest;
}

/**
 * Highest tick a bundle can be replayed / inspected to.
 *
 * Complete bundle → `max(endTick, persistedEndTick)`. For a cleanly finalized
 * bundle this equals `endTick` (`persistedEndTick` is the last *snapshot* tick,
 * always ≤ the last recorded tick = `endTick`). The `max` recovers legacy
 * bundles whose `endTick` was never finalized — exported via a live `toBundle()`
 * before `disconnect()`, so it stayed at `startTick` while the sink kept
 * `persistedEndTick` current (pre-1.1.4; see docs/learning/lessons.md). Since
 * 1.1.4 the sinks finalize `endTick` on every `writeTick`, so new bundles need no
 * recovery and `max` is a no-op for them. Incomplete (sink-failure) bundles
 * intentionally cap at `persistedEndTick`, the last durable snapshot.
 *
 * Internal cross-module helper (SessionReplayer + BundleViewer); intentionally
 * NOT part of the public `civ-engine` surface (absent from `src/index.ts`).
 */
export function replayableUpperBound(
  md: Pick<SessionMetadata, 'incomplete' | 'endTick' | 'persistedEndTick'>,
): number {
  return md.incomplete ? md.persistedEndTick : Math.max(md.endTick, md.persistedEndTick);
}

export interface SessionBundle<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  initialSnapshot: WorldSnapshot;
  ticks: SessionTickEntry<TEventMap, TDebug>[];
  commands: RecordedCommand<TCommandMap>[];
  executions: CommandExecutionResult<keyof TCommandMap>[];
  failures: TickFailure[];
  snapshots: SessionSnapshotEntry[];
  markers: Marker[];
  attachments: AttachmentDescriptor[];
}
