// Public type and error surface for the Bundle Viewer (Spec 4).
// Split from `src/bundle-viewer.ts` to keep that file under the 500-LOC cap.

import type { OneOrMany } from './bundle-corpus-types.js';
import type { TickDiff } from './diff.js';
import type { JsonValue } from './json.js';
import type {
  Marker,
  MarkerKind,
  MarkerProvenance,
  RecordedCommand,
} from './session-bundle.js';
import { SessionRecordingError } from './session-errors.js';
import type { ReplayerConfig } from './session-replayer.js';
import type { WorldSnapshot } from './serializer.js';
import type { CommandExecutionResult, World, WorldMetrics } from './world.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

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
  constructor(message: string, details: BundleViewerErrorDetails) {
    super(message, details as unknown as JsonValue);
    this.name = 'BundleViewerError';
    this.details = details;
  }
}

export function viewerError(
  code: BundleViewerErrorCode,
  message: string,
  extras: { tick?: number | null; markerId?: string | null; [key: string]: JsonValue | undefined } = {},
): BundleViewerError {
  const filtered: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(extras)) {
    if (value !== undefined && key !== 'tick' && key !== 'markerId') {
      filtered[key] = value as JsonValue;
    }
  }
  const details: BundleViewerErrorDetails = {
    ...filtered,
    code,
    tick: extras.tick ?? null,
    markerId: extras.markerId ?? null,
    message,
  };
  return new BundleViewerError(message, details);
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BundleViewerOptions<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  worldFactory?: ReplayerConfig<TEventMap, TCommandMap>['worldFactory'];
}

export interface RecordedTickFrameEvent<TEventMap> {
  type: keyof TEventMap & string;
  data: TEventMap[keyof TEventMap];
}

export interface RecordedTickEvent<TEventMap> {
  tick: number;
  type: keyof TEventMap & string;
  data: TEventMap[keyof TEventMap];
}

export interface DiffOptions { fromSnapshot?: boolean }

export interface BundleStateDiff {
  fromTick: number;
  toTick: number;
  source: 'tick-diffs' | 'snapshot';
  diff: TickDiff;
}

export interface TickRange { from?: number; to?: number }

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
  executed?: boolean;
}

export interface TickFrame<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TDebug,
> {
  readonly tick: number;
  readonly events: readonly RecordedTickFrameEvent<TEventMap>[];
  readonly commands: readonly RecordedCommand<TCommandMap>[];
  readonly executions: readonly CommandExecutionResult<keyof TCommandMap>[];
  readonly markers: readonly Marker[];
  readonly diff: Readonly<TickDiff> | null;
  readonly debug: Readonly<TDebug> | null;
  readonly metrics: Readonly<WorldMetrics> | null;
  state(): World<TEventMap, TCommandMap>;
  snapshot(): WorldSnapshot;
  diffSince(otherTick: number, options?: DiffOptions): BundleStateDiff;
}
