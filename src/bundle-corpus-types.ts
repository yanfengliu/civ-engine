import type { JsonValue } from './json.js';
import type { SessionBundle, SessionMetadata } from './session-bundle.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
import { SessionRecordingError } from './session-errors.js';
import type { SessionSource } from './session-sink.js';

export type BundleCorpusScanDepth = 'root' | 'children' | 'all';

export interface BundleCorpusOptions {
  scanDepth?: BundleCorpusScanDepth;
  skipInvalid?: boolean;
}

export interface NumberRange {
  min?: number;
  max?: number;
}

export interface IsoTimeRange {
  from?: string;
  to?: string;
}

export type OneOrMany<T> = T | readonly T[];

export interface BundleQuery {
  key?: string | RegExp;
  sessionId?: OneOrMany<string>;
  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
  sourceLabel?: OneOrMany<string>;
  engineVersion?: OneOrMany<string>;
  nodeVersion?: OneOrMany<string>;
  incomplete?: boolean;
  durationTicks?: NumberRange;
  startTick?: NumberRange;
  endTick?: NumberRange;
  persistedEndTick?: NumberRange;
  materializedEndTick?: NumberRange;
  failedTickCount?: NumberRange;
  policySeed?: number | NumberRange;
  recordedAt?: IsoTimeRange;
  attachmentMime?: OneOrMany<string>;
}

export type CorpusIndexErrorCode =
  | 'root_missing'
  | 'manifest_parse'
  | 'manifest_invalid'
  | 'schema_unsupported'
  | 'duplicate_key'
  | 'query_invalid'
  | 'entry_missing';

export interface CorpusIndexErrorDetails {
  readonly [key: string]: JsonValue;
  readonly code: CorpusIndexErrorCode;
  readonly path: string | null;
  readonly key: string | null;
  readonly message: string | null;
}

export class CorpusIndexError extends SessionRecordingError {
  override readonly details: CorpusIndexErrorDetails;

  constructor(message: string, details: CorpusIndexErrorDetails) {
    super(message, details);
    this.name = 'CorpusIndexError';
    this.details = details;
  }
}

export interface InvalidCorpusEntry {
  readonly path: string;
  readonly error: CorpusIndexError;
}

export type BundleCorpusMetadata = Readonly<Omit<SessionMetadata, 'failedTicks'>> & {
  readonly failedTicks?: readonly number[];
};

export interface BundleCorpusEntry {
  readonly key: string;
  readonly dir: string;
  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  readonly metadata: BundleCorpusMetadata;
  readonly attachmentCount: number;
  readonly attachmentBytes: number;
  readonly attachmentMimes: readonly string[];
  readonly hasFailures: boolean;
  readonly failedTickCount: number;
  readonly materializedEndTick: number;
  openSource(): SessionSource;
  loadBundle<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
}

interface CorpusIndexErrorDetailsInput {
  readonly [key: string]: JsonValue | undefined;
  readonly code: CorpusIndexErrorCode;
  readonly path?: string;
  readonly key?: string;
  readonly message?: string;
}

function normalizeDetails(input: CorpusIndexErrorDetailsInput): CorpusIndexErrorDetails {
  const details: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) details[key] = value;
  }
  details.code = input.code;
  details.path = input.path ?? null;
  details.key = input.key ?? null;
  details.message = input.message ?? null;
  return Object.freeze(details) as CorpusIndexErrorDetails;
}

export function corpusError(message: string, details: CorpusIndexErrorDetailsInput): CorpusIndexError {
  return new CorpusIndexError(message, normalizeDetails(details));
}

export function compareCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
