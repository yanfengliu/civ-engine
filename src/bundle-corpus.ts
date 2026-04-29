import { existsSync, lstatSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { JsonValue } from './json.js';
import { BundleViewer, type BundleViewerOptions } from './bundle-viewer.js';
import type { SessionBundle, SessionMetadata } from './session-bundle.js';
import { FileSink } from './session-file-sink.js';
import type { SessionSource } from './session-sink.js';
import { readManifest, type FileManifest } from './bundle-corpus-manifest.js';
import {
  compareCodeUnit,
  corpusError,
  CorpusIndexError,
  type BundleCorpusEntry,
  type BundleCorpusMetadata,
  type BundleCorpusOptions,
  type BundleCorpusScanDepth,
  type BundleQuery,
  type InvalidCorpusEntry,
} from './bundle-corpus-types.js';

export {
  CorpusIndexError,
  type BundleCorpusEntry,
  type BundleCorpusMetadata,
  type BundleCorpusOptions,
  type BundleCorpusScanDepth,
  type BundleQuery,
  type CorpusIndexErrorCode,
  type CorpusIndexErrorDetails,
  type InvalidCorpusEntry,
  type IsoTimeRange,
  type NumberRange,
  type OneOrMany,
} from './bundle-corpus-types.js';

const MANIFEST_FILE = 'manifest.json';
const SOURCE_KINDS = new Set<SessionMetadata['sourceKind']>(['session', 'scenario', 'synthetic']);
const QUERY_KEYS = new Set([
  'key',
  'sessionId',
  'sourceKind',
  'sourceLabel',
  'engineVersion',
  'nodeVersion',
  'incomplete',
  'durationTicks',
  'startTick',
  'endTick',
  'persistedEndTick',
  'materializedEndTick',
  'failedTickCount',
  'policySeed',
  'recordedAt',
  'attachmentMime',
]);
const NUMBER_RANGE_KEYS = new Set(['min', 'max']);
const ISO_TIME_RANGE_KEYS = new Set(['from', 'to']);

export class BundleCorpus implements Iterable<SessionBundle> {
  readonly rootDir: string;
  readonly invalidEntries: readonly InvalidCorpusEntry[];
  private readonly _entries: readonly BundleCorpusEntry[];
  private readonly _byKey: ReadonlyMap<string, BundleCorpusEntry>;

  constructor(rootDir: string, options: BundleCorpusOptions = {}) {
    const root = resolve(rootDir);
    if (!existsSync(root) || !safeIsDirectory(root)) {
      throw corpusError('corpus root is missing or is not a directory', {
        code: 'root_missing',
        path: root,
      });
    }

    this.rootDir = root;
    const invalidEntries: InvalidCorpusEntry[] = [];
    const entries: BundleCorpusEntry[] = [];
    const byKey = new Map<string, BundleCorpusEntry>();

    for (const dir of discoverBundleDirs(this.rootDir, options.scanDepth ?? 'all')) {
      const key = keyForDir(this.rootDir, dir);
      if (byKey.has(key)) {
        throw corpusError(`duplicate corpus key ${key}`, {
          code: 'duplicate_key',
          path: dir,
          key,
        });
      }

      try {
        const entry = makeEntry(dir, key, readManifest(join(dir, MANIFEST_FILE)));
        byKey.set(key, entry);
        entries.push(entry);
      } catch (error) {
        if (options.skipInvalid && error instanceof CorpusIndexError && error.details.code !== 'duplicate_key') {
          invalidEntries.push(Object.freeze({
            path: join(dir, MANIFEST_FILE),
            error,
          }));
          continue;
        }
        throw error;
      }
    }

    entries.sort(compareEntries);
    this._entries = Object.freeze(entries.slice());
    this._byKey = new Map(entries.map((entry) => [entry.key, entry]));
    this.invalidEntries = Object.freeze(invalidEntries.slice());
  }

  entries(query?: BundleQuery): readonly BundleCorpusEntry[] {
    const predicate = query === undefined ? () => true : compileQuery(query);
    return Object.freeze(this._entries.filter(predicate));
  }

  *bundles(query?: BundleQuery): IterableIterator<SessionBundle> {
    for (const entry of this.entries(query)) {
      yield entry.loadBundle();
    }
  }

  get(key: string): BundleCorpusEntry | undefined {
    return this._byKey.get(key);
  }

  openSource(key: string): SessionSource {
    return requireEntry(this._byKey, key).openSource();
  }

  loadBundle<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug> {
    return requireEntry(this._byKey, key).loadBundle<TEventMap, TCommandMap, TDebug>();
  }

  [Symbol.iterator](): IterableIterator<SessionBundle> {
    return this.bundles();
  }
}

function safeIsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function discoverBundleDirs(root: string, depth: BundleCorpusScanDepth): string[] {
  const out: string[] = [];
  const initialRemaining = depth === 'root' ? 0 : depth === 'children' ? 1 : 'all';

  function visit(dir: string, remaining: number | 'all'): void {
    if (hasRegularManifest(dir)) {
      out.push(dir);
      return;
    }
    if (remaining === 0) return;

    const nextRemaining = remaining === 'all' ? 'all' : remaining - 1;
    const children = readdirSync(dir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && !dirent.isSymbolicLink())
      .map((dirent) => dirent.name)
      .sort(compareCodeUnit);

    for (const child of children) {
      visit(join(dir, child), nextRemaining);
    }
  }

  visit(root, initialRemaining);
  return out;
}

function hasRegularManifest(dir: string): boolean {
  const manifestPath = join(dir, MANIFEST_FILE);
  try {
    const stat = lstatSync(manifestPath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function keyForDir(root: string, dir: string): string {
  const rel = relative(root, dir);
  if (rel.length === 0) return '.';
  return rel.split(sep).join('/');
}

function makeEntry(dir: string, key: string, manifest: FileManifest): BundleCorpusEntry {
  const frozenFailedTicks = manifest.metadata.failedTicks
    ? Object.freeze(manifest.metadata.failedTicks.slice())
    : undefined;
  const metadata: BundleCorpusMetadata = Object.freeze({
    ...manifest.metadata,
    ...(frozenFailedTicks ? { failedTicks: frozenFailedTicks } : {}),
  });
  const attachmentMimes = Object.freeze(
    [...new Set(manifest.attachments.map((attachment) => attachment.mime))].sort(compareCodeUnit),
  );
  const materializedEndTick = metadata.incomplete === true
    ? metadata.persistedEndTick
    : metadata.endTick;

  const entry: BundleCorpusEntry = {
    key,
    dir,
    schemaVersion: manifest.schemaVersion,
    metadata,
    attachmentCount: manifest.attachments.length,
    attachmentBytes: manifest.attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0),
    attachmentMimes,
    hasFailures: (metadata.failedTicks?.length ?? 0) > 0,
    failedTickCount: metadata.failedTicks?.length ?? 0,
    materializedEndTick,
    openSource: () => new FileSink(dir),
    loadBundle: <
      TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
      TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
      TDebug = JsonValue,
    >() => new FileSink(dir).toBundle() as unknown as SessionBundle<TEventMap, TCommandMap, TDebug>,
    openViewer: <
      TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
      TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
      TDebug = JsonValue,
    >(options?: BundleViewerOptions<TEventMap, TCommandMap>) => {
      const bundle = new FileSink(dir).toBundle() as unknown as SessionBundle<TEventMap, TCommandMap, TDebug>;
      return new BundleViewer<TEventMap, TCommandMap, TDebug>(bundle, options);
    },
  };

  return Object.freeze(entry);
}

function compareEntries(a: BundleCorpusEntry, b: BundleCorpusEntry): number {
  return compareCodeUnit(a.metadata.recordedAt, b.metadata.recordedAt)
    || compareCodeUnit(a.metadata.sessionId, b.metadata.sessionId)
    || compareCodeUnit(a.key, b.key);
}

function requireEntry(map: ReadonlyMap<string, BundleCorpusEntry>, key: string): BundleCorpusEntry {
  const entry = map.get(key);
  if (!entry) {
    throw corpusError(`corpus entry ${key} not found`, {
      code: 'entry_missing',
      key,
    });
  }
  return entry;
}

function queryError(message: string, label: string): CorpusIndexError {
  return corpusError(message, {
    code: 'query_invalid',
    message: label,
  });
}

function assertQueryRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw queryError(`${label} must be an object`, label);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw queryError(`${label} must be a plain object`, label);
  }
  return value as Record<string, unknown>;
}

function assertKnownKeys(record: Record<string, unknown>, label: string, allowedKeys: ReadonlySet<string>): void {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw queryError(`${label}.${key} is not a supported query field`, `${label}.${key}`);
    }
  }
}

function assertQueryInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw queryError(`${label} must be a finite integer`, label);
  }
  return value;
}

function validateQueryIso(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    throw queryError(`${label} must be a normalized UTC ISO string`, label);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw queryError(`${label} must round-trip through Date.toISOString()`, label);
  }
  return value;
}

interface NormalizedNumberRange {
  min: number;
  max: number;
}

function assertNumberRange(range: unknown, label: string): NormalizedNumberRange {
  const record = assertQueryRecord(range, label);
  assertKnownKeys(record, label, NUMBER_RANGE_KEYS);
  if (record.min !== undefined) assertQueryInteger(record.min, `${label}.min`);
  if (record.max !== undefined) assertQueryInteger(record.max, `${label}.max`);

  const min = typeof record.min === 'number' ? record.min : Number.NEGATIVE_INFINITY;
  const max = typeof record.max === 'number' ? record.max : Number.POSITIVE_INFINITY;
  if (min > max) {
    throw queryError(`${label}.min must be <= max`, label);
  }
  return { min, max };
}

function matchesRange(value: number, range: NormalizedNumberRange): boolean {
  return value >= range.min && value <= range.max;
}

function matchesOne<T>(value: T | undefined, expected: readonly T[] | undefined): boolean {
  if (expected === undefined) return true;
  if (value === undefined) return false;
  return expected.includes(value);
}

function matchesKey(value: string, expected: string | RegExp | undefined): boolean {
  if (expected === undefined) return true;
  if (typeof expected === 'string') return value === expected;
  expected.lastIndex = 0;
  const matched = expected.test(value);
  expected.lastIndex = 0;
  return matched;
}

function normalizeKey(value: unknown): string | RegExp | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string' || value instanceof RegExp) return value;
  throw queryError('key must be a string or RegExp', 'key');
}

function normalizeOneOrMany<T>(
  value: unknown,
  label: string,
  guard: (item: unknown) => item is T,
): readonly T[] | undefined {
  if (value === undefined) return undefined;
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    if (!guard(item)) {
      throw queryError(`${label} must be a value or array of values with the expected type`, label);
    }
  }
  return values as readonly T[];
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isSourceKind(value: unknown): value is SessionMetadata['sourceKind'] {
  return typeof value === 'string' && SOURCE_KINDS.has(value as SessionMetadata['sourceKind']);
}

function normalizeBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw queryError(`${label} must be a boolean`, label);
  return value;
}

function normalizeRange(value: unknown, label: string): NormalizedNumberRange | undefined {
  return value === undefined ? undefined : assertNumberRange(value, label);
}

function normalizePolicySeed(value: unknown): {
  readonly scalar?: number;
  readonly range?: NormalizedNumberRange;
} {
  if (value === undefined) return {};
  if (typeof value === 'number') {
    return { scalar: assertQueryInteger(value, 'policySeed') };
  }
  return { range: assertNumberRange(value, 'policySeed') };
}

function normalizeRecordedAt(value: unknown): {
  readonly from?: string;
  readonly to?: string;
} {
  if (value === undefined) return {};
  const range = assertQueryRecord(value, 'recordedAt');
  assertKnownKeys(range, 'recordedAt', ISO_TIME_RANGE_KEYS);
  const from = range.from === undefined ? undefined : validateQueryIso(range.from, 'recordedAt.from');
  const to = range.to === undefined ? undefined : validateQueryIso(range.to, 'recordedAt.to');
  if (from && to && from > to) {
    throw queryError('recordedAt.from must be <= recordedAt.to', 'recordedAt');
  }
  return { from, to };
}

function compileQuery(query: BundleQuery): (entry: BundleCorpusEntry) => boolean {
  const queryRecord = assertQueryRecord(query, 'query');
  assertKnownKeys(queryRecord, 'query', QUERY_KEYS);
  const ranges = {
    durationTicks: normalizeRange(queryRecord.durationTicks, 'durationTicks'),
    startTick: normalizeRange(queryRecord.startTick, 'startTick'),
    endTick: normalizeRange(queryRecord.endTick, 'endTick'),
    persistedEndTick: normalizeRange(queryRecord.persistedEndTick, 'persistedEndTick'),
    materializedEndTick: normalizeRange(queryRecord.materializedEndTick, 'materializedEndTick'),
    failedTickCount: normalizeRange(queryRecord.failedTickCount, 'failedTickCount'),
  };
  const key = normalizeKey(queryRecord.key);
  const sessionId = normalizeOneOrMany(queryRecord.sessionId, 'sessionId', isString);
  const sourceKind = normalizeOneOrMany(queryRecord.sourceKind, 'sourceKind', isSourceKind);
  const sourceLabel = normalizeOneOrMany(queryRecord.sourceLabel, 'sourceLabel', isString);
  const engineVersion = normalizeOneOrMany(queryRecord.engineVersion, 'engineVersion', isString);
  const nodeVersion = normalizeOneOrMany(queryRecord.nodeVersion, 'nodeVersion', isString);
  const incomplete = normalizeBoolean(queryRecord.incomplete, 'incomplete');
  const policySeed = normalizePolicySeed(queryRecord.policySeed);
  const recordedAt = normalizeRecordedAt(queryRecord.recordedAt);
  const attachmentMime = normalizeOneOrMany(queryRecord.attachmentMime, 'attachmentMime', isString);

  return (entry) => {
    const metadata = entry.metadata;
    if (!matchesKey(entry.key, key)) return false;
    if (!matchesOne(metadata.sessionId, sessionId)) return false;
    if (!matchesOne(metadata.sourceKind, sourceKind)) return false;
    if (!matchesOne(metadata.sourceLabel, sourceLabel)) return false;
    if (!matchesOne(metadata.engineVersion, engineVersion)) return false;
    if (!matchesOne(metadata.nodeVersion, nodeVersion)) return false;
    if (incomplete !== undefined && (metadata.incomplete === true) !== incomplete) return false;
    if (ranges.durationTicks && !matchesRange(metadata.durationTicks, ranges.durationTicks)) return false;
    if (ranges.startTick && !matchesRange(metadata.startTick, ranges.startTick)) return false;
    if (ranges.endTick && !matchesRange(metadata.endTick, ranges.endTick)) return false;
    if (ranges.persistedEndTick && !matchesRange(metadata.persistedEndTick, ranges.persistedEndTick)) return false;
    if (ranges.materializedEndTick && !matchesRange(entry.materializedEndTick, ranges.materializedEndTick)) return false;
    if (ranges.failedTickCount && !matchesRange(entry.failedTickCount, ranges.failedTickCount)) return false;
    if (policySeed.scalar !== undefined && metadata.policySeed !== policySeed.scalar) return false;
    if (policySeed.range && (metadata.policySeed === undefined || !matchesRange(metadata.policySeed, policySeed.range))) return false;
    if (recordedAt.from && metadata.recordedAt < recordedAt.from) return false;
    if (recordedAt.to && metadata.recordedAt > recordedAt.to) return false;
    if (attachmentMime && !entry.attachmentMimes.some((mime) => attachmentMime.includes(mime))) return false;
    return true;
  };
}
