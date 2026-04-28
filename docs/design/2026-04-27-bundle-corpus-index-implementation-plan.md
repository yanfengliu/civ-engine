# Bundle Corpus Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Plan revision:** v6 (2026-04-27) - fixes plan-review iteration 5 findings from `docs/reviews/bundle-corpus-index/2026-04-27/plan-5/`: code-review re-review prompts must include all prior task `REVIEW.md` files, not only the immediately previous iteration.

**Goal:** Implement Spec 7: Bundle Search / Corpus Index as a disk-backed manifest-first `BundleCorpus` that indexes closed FileSink bundle directories, filters metadata without loading content streams, and yields `SessionBundle`s lazily for `runMetrics`.

**Architecture:** Add a focused BundleCorpus subsystem: `src/bundle-corpus.ts` owns filesystem discovery, immutable entry construction, query validation/filtering, and FileSink-backed bundle/source loading; `src/bundle-corpus-types.ts` owns the public type/error surface; `src/bundle-corpus-manifest.ts` owns manifest-only validation/loading. The split keeps new source files below the repo's 500-LOC review cap while preserving a single public root export surface. The new subsystem composes with existing session recording, FileSink, SessionReplayer, and behavioral metrics without changing their signatures.

**Tech Stack:** TypeScript 5.7+, Node `fs`/`path`, Vitest 3, ESLint 9, ESM + Node16 module resolution.

**Branch:** None. Commit directly to `main` after plan review, implementation, full gates, staged multi-CLI code review, and final doc updates.

**Versioning:** Base is v0.8.2. Spec 7 is additive and non-breaking, so ship v0.8.3 with one coherent commit.

---

## File Map

- Create `src/bundle-corpus.ts`, `src/bundle-corpus-types.ts`, and `src/bundle-corpus-manifest.ts`: public corpus API, query helpers, manifest validation, error class, immutable entries, FileSink integration.
- Modify `src/index.ts`: export the Spec 7 public surface.
- Create `tests/bundle-corpus.test.ts`: FileSink-backed corpus tests plus focused malformed-manifest and malformed-stream cases.
- Modify `package.json`: bump `"version"` from `0.8.2` to `0.8.3`.
- Modify `src/version.ts`: bump `ENGINE_VERSION` from `'0.8.2'` to `'0.8.3'`.
- Modify `README.md`: version badge, Feature Overview row, Public Surface bullet.
- Modify `docs/api-reference.md`: add `Bundle Corpus Index (v0.8.3)` public API section.
- Create `docs/guides/bundle-corpus-index.md`: quickstart, query guide, metrics integration, replay investigation, scan depth, closed-corpus and sidecar boundaries.
- Modify `docs/guides/behavioral-metrics.md`: add disk-backed `BundleCorpus` example.
- Modify `docs/guides/session-recording.md`: add FileSink bundle indexing note.
- Modify `docs/guides/ai-integration.md`: add Tier-2 corpus query surface.
- Modify `docs/guides/concepts.md`: add `BundleCorpus` to standalone utilities.
- Modify `docs/README.md`: add guide index entry.
- Modify `docs/architecture/ARCHITECTURE.md`: Component Map row and boundary note for Bundle Corpus.
- Modify `docs/architecture/drift-log.md`: append Spec 7 drift row.
- Modify `docs/architecture/decisions.md`: append ADRs 28-31 from the accepted design.
- Modify `docs/design/ai-first-dev-roadmap.md`: mark Spec 7 implemented.
- Modify `docs/changelog.md`: add v0.8.3 entry.
- Modify `docs/devlog/summary.md`: add one newest-first Spec 7 line and keep the summary compact.
- Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md`: append the final task entry after code review artifacts exist.
- Create `docs/reviews/bundle-corpus-index-T1/2026-04-27/<iteration>/`: staged-diff code-review artifacts.

## Single Task: Spec 7 - Full Surface, Tests, Docs, Review, Commit

**Goal:** Land the entire Spec 7 surface in one v0.8.3 commit: tests, implementation, exports, docs, roadmap status, changelog/devlog, version bump, doc audit, gates, and staged multi-CLI code review.

**Files:**
- Create: `tests/bundle-corpus.test.ts`
- Create: `src/bundle-corpus.ts`, `src/bundle-corpus-types.ts`, `src/bundle-corpus-manifest.ts`
- Modify: `src/index.ts`
- Modify: docs and version files listed in File Map

### Step 1: Write failing corpus tests first

- [ ] Create `tests/bundle-corpus.test.ts` with FileSink-backed fixtures. Use canonical UTC `recordedAt` values because corpus construction validates UTC-Z strings.

```ts
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BundleCorpus,
  CorpusIndexError,
  FileSink,
  SessionRecordingError,
  bundleCount,
  runMetrics,
  type AttachmentDescriptor,
  type SessionMetadata,
  type SessionSnapshotEntry,
} from '../src/index.js';

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'civ-engine-corpus-'));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function metadata(id: string, overrides: Partial<SessionMetadata> = {}): SessionMetadata {
  return {
    sessionId: id,
    engineVersion: '0.8.2',
    nodeVersion: 'v20.0.0',
    recordedAt: '2026-04-27T00:00:00.000Z',
    startTick: 0,
    endTick: 10,
    persistedEndTick: 10,
    durationTicks: 10,
    sourceKind: 'session',
    ...overrides,
  };
}

function snapshot(tick: number): SessionSnapshotEntry {
  return {
    tick,
    snapshot: { tick } as never,
  };
}

function writeBundle(dir: string, meta: SessionMetadata, attachments: AttachmentDescriptor[] = []): void {
  const sink = new FileSink(dir);
  sink.open(meta);
  sink.writeSnapshot(snapshot(meta.startTick));
  if (meta.persistedEndTick !== meta.startTick) {
    sink.writeSnapshot(snapshot(meta.persistedEndTick));
  }
  for (const attachment of attachments) {
    sink.writeAttachment(attachment, new Uint8Array([1, 2, 3]));
  }
  sink.close();
}

function writeInvalidManifest(dir: string, manifest: unknown): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

function expectCorpusError(fn: () => unknown, code: string): CorpusIndexError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(CorpusIndexError);
    expect(error).toBeInstanceOf(SessionRecordingError);
    expect((error as CorpusIndexError).details.code).toBe(code);
    return error as CorpusIndexError;
  }
  throw new Error(`expected CorpusIndexError ${code}`);
}
```

- [ ] Add discovery, ordering, and immutable-entry tests.

```ts
describe('BundleCorpus discovery and entries', () => {
  it('indexes a root bundle with key "." and freezes entry metadata', () => {
    const root = tempRoot();
    writeBundle(root, metadata('root', { recordedAt: '2026-04-27T00:00:01.000Z' }));

    const corpus = new BundleCorpus(root, { scanDepth: 'root' });
    const entries = corpus.entries();

    expect(entries.map((entry) => entry.key)).toEqual(['.']);
    expect(entries[0].dir).toBe(root);
    expect(Object.isFrozen(entries[0])).toBe(true);
    expect(Object.isFrozen(entries[0].metadata)).toBe(true);
    expect(corpus.get('.')).toBe(entries[0]);

    expect(() => {
      (entries[0].metadata as SessionMetadata).sessionId = 'mutated';
    }).toThrow(TypeError);
    expect(corpus.entries()[0].metadata.sessionId).toBe('root');
  });

  it('honors scanDepth and sorts by recordedAt, sessionId, then key', () => {
    const root = tempRoot();
    writeBundle(join(root, 'b'), metadata('s-2', { recordedAt: '2026-04-27T00:00:02.000Z' }));
    writeBundle(join(root, 'a'), metadata('s-1', { recordedAt: '2026-04-27T00:00:02.000Z' }));
    writeBundle(join(root, 'nested', 'c'), metadata('s-0', { recordedAt: '2026-04-27T00:00:00.000Z' }));

    expect(new BundleCorpus(root, { scanDepth: 'root' }).entries()).toEqual([]);
    expect(new BundleCorpus(root, { scanDepth: 'children' }).entries().map((entry) => entry.key)).toEqual(['a', 'b']);
    expect(new BundleCorpus(root, { scanDepth: 'all' }).entries().map((entry) => entry.key)).toEqual(['nested/c', 'a', 'b']);
  });

  it('stops descending once a directory is a bundle', () => {
    const root = tempRoot();
    writeBundle(join(root, 'outer'), metadata('outer'));
    writeBundle(join(root, 'outer', 'nested'), metadata('nested'));

    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['outer']);
  });

  it('uses locale-independent code-unit ordering for ties', () => {
    const root = tempRoot();
    writeBundle(join(root, 'lower'), metadata('alpha', { recordedAt: '2026-04-27T00:00:01.000Z' }));
    writeBundle(join(root, 'upper'), metadata('Zulu', { recordedAt: '2026-04-27T00:00:01.000Z' }));

    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.metadata.sessionId)).toEqual(['Zulu', 'alpha']);
  });

  it('skips symlinked directories when the platform permits creating them', () => {
    const root = tempRoot();
    const target = join(root, 'target');
    writeBundle(target, metadata('target'));
    try {
      symlinkSync(target, join(root, 'link'), 'junction');
    } catch {
      return;
    }

    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['target']);
  });
});
```

- [ ] Add manifest-only, sidecar, query, missing-key, invalid-manifest, FileSink, and metrics tests.

```ts
describe('BundleCorpus query and loading contracts', () => {
  it('lists from manifest without reading malformed streams until loadBundle', () => {
    const root = tempRoot();
    const dir = join(root, 'bad-stream');
    writeBundle(dir, metadata('bad-stream'));
    writeFileSync(join(dir, 'ticks.jsonl'), '{"tick":\n{}\n');

    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['bad-stream']);
    expect(() => corpus.loadBundle('bad-stream')).toThrow();
  });

  it('does not read missing sidecar bytes during listing or loadBundle', () => {
    const root = tempRoot();
    const dir = join(root, 'sidecar');
    writeBundle(dir, metadata('sidecar'), [
      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
    ]);
    rmSync(join(dir, 'attachments', 'screen.png'));

    const corpus = new BundleCorpus(root);
    const entry = corpus.entries({ attachmentMime: 'image/png' })[0];
    expect(entry.attachmentCount).toBe(1);
    expect(entry.attachmentBytes).toBe(3);
    expect(entry.attachmentMimes).toEqual(['image/png']);
    expect(entry.loadBundle().attachments).toHaveLength(1);
    expect(() => entry.openSource().readSidecar('screen')).toThrow();
  });

  it('loads bundles lazily one iterator step at a time', () => {
    const root = tempRoot();
    writeBundle(join(root, 'first'), metadata('first', { recordedAt: '2026-04-27T00:00:01.000Z' }));
    const second = join(root, 'second');
    writeBundle(second, metadata('second', { recordedAt: '2026-04-27T00:00:02.000Z' }));
    writeFileSync(join(second, 'ticks.jsonl'), '{"tick":\n{}\n');

    const iterator = new BundleCorpus(root).bundles();
    const first = iterator.next();
    expect(first.done).toBe(false);
    expect(first.value.metadata.sessionId).toBe('first');
    expect(() => iterator.next()).toThrow();
  });

  it('matches attachmentMime when any MIME overlaps the requested set', () => {
    const root = tempRoot();
    writeBundle(join(root, 'mixed'), metadata('mixed'), [
      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
      { id: 'trace', mime: 'application/json', sizeBytes: 3, ref: { sidecar: true } },
    ]);

    const corpus = new BundleCorpus(root);
    expect(corpus.get('mixed')?.attachmentMimes).toEqual(['application/json', 'image/png']);
    expect(corpus.entries({ attachmentMime: 'application/json' }).map((entry) => entry.key)).toEqual(['mixed']);
    expect(corpus.entries({ attachmentMime: ['text/plain', 'image/png'] }).map((entry) => entry.key)).toEqual(['mixed']);
    expect(corpus.entries({ attachmentMime: ['text/plain', 'text/csv'] }).map((entry) => entry.key)).toEqual([]);
  });

  it('filters by manifest fields and ANDs query fields', () => {
    const root = tempRoot();
    writeBundle(join(root, 'seeded'), metadata('seeded', {
      recordedAt: '2026-04-27T00:00:01.000Z',
      sourceKind: 'synthetic',
      sourceLabel: 'random',
      policySeed: 42,
      durationTicks: 30,
      endTick: 30,
      persistedEndTick: 30,
    }));
    writeBundle(join(root, 'unseeded'), metadata('unseeded', {
      recordedAt: '2026-04-27T00:00:02.000Z',
      sourceKind: 'synthetic',
      durationTicks: 5,
      endTick: 5,
      persistedEndTick: 5,
    }));

    const corpus = new BundleCorpus(root);
    expect(corpus.entries({ sourceKind: 'synthetic', policySeed: { min: 40, max: 50 } }).map((entry) => entry.key)).toEqual(['seeded']);
    expect(corpus.entries({ sourceLabel: 'random' }).map((entry) => entry.key)).toEqual(['seeded']);
    expect(corpus.entries({ durationTicks: { min: 10 }, recordedAt: { from: '2026-04-27T00:00:00.000Z', to: '2026-04-27T00:00:01.000Z' } }).map((entry) => entry.key)).toEqual(['seeded']);
    expect(corpus.entries({ key: /seed/ }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
    const stateful = /seed/g;
    expect(corpus.entries({ key: stateful }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
    expect(stateful.lastIndex).toBe(0);
  });

  it('derives failure counts and materializedEndTick from metadata', () => {
    const root = tempRoot();
    writeBundle(join(root, 'complete'), metadata('complete', { endTick: 20, persistedEndTick: 20, durationTicks: 20 }));
    writeBundle(join(root, 'incomplete'), metadata('incomplete', {
      incomplete: true,
      endTick: 50,
      persistedEndTick: 25,
      durationTicks: 50,
      failedTicks: [26, 27],
    }));

    const corpus = new BundleCorpus(root);
    expect(corpus.get('complete')?.materializedEndTick).toBe(20);
    expect(corpus.get('incomplete')?.materializedEndTick).toBe(25);
    expect(corpus.entries({ incomplete: true }).map((entry) => entry.key)).toEqual(['incomplete']);
    expect(corpus.entries({ incomplete: false }).map((entry) => entry.key)).toEqual(['complete']);
    expect(corpus.entries({ materializedEndTick: { max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
    expect(corpus.entries({ endTick: { min: 50 } }).map((entry) => entry.key)).toEqual(['incomplete']);
    const failedTicks = corpus.get('incomplete')!.metadata.failedTicks!;
    expect(Object.isFrozen(failedTicks)).toBe(true);
    expect(() => failedTicks.push(99)).toThrow(TypeError);
    expect(corpus.get('incomplete')!.metadata.failedTicks).toEqual([26, 27]);
  });

  it('rejects invalid query ranges and non-canonical recordedAt bounds', () => {
    const root = tempRoot();
    writeBundle(join(root, 'bundle'), metadata('bundle'));
    const corpus = new BundleCorpus(root);

    expectCorpusError(() => corpus.entries({ durationTicks: { min: 10, max: 1 } }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ startTick: { min: 0.5 } }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ policySeed: Number.POSITIVE_INFINITY }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ recordedAt: { from: '2026-04-27' } }), 'query_invalid');
  });

  it('returns undefined for get and throws entry_missing for strict missing-key APIs', () => {
    const root = tempRoot();
    writeBundle(join(root, 'bundle'), metadata('bundle'));
    const corpus = new BundleCorpus(root);

    expect(corpus.get('missing')).toBeUndefined();
    expectCorpusError(() => corpus.openSource('missing'), 'entry_missing');
    expectCorpusError(() => corpus.loadBundle('missing'), 'entry_missing');
  });

  it('handles invalid manifests strictly or through skipInvalid diagnostics', () => {
    const root = tempRoot();
    writeBundle(join(root, 'good'), metadata('good'));
    writeInvalidManifest(join(root, 'bad'), {
      schemaVersion: 1,
      metadata: metadata('bad', { recordedAt: '2026-04-27T00:00:00-07:00' }),
      attachments: [],
    });

    expectCorpusError(() => new BundleCorpus(root), 'manifest_invalid');
    const corpus = new BundleCorpus(root, { skipInvalid: true });
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['good']);
    expect(corpus.invalidEntries).toHaveLength(1);
    expect(corpus.invalidEntries[0].error.details.code).toBe('manifest_invalid');
  });

  it('loads FileSink bundles lazily and composes with runMetrics', () => {
    const root = tempRoot();
    writeBundle(join(root, 'one'), metadata('one', { recordedAt: '2026-04-27T00:00:01.000Z' }));
    writeBundle(join(root, 'two'), metadata('two', { recordedAt: '2026-04-27T00:00:02.000Z', sourceKind: 'synthetic' }));

    const corpus = new BundleCorpus(root);
    expect(corpus.openSource('one').readSnapshot(0)).toEqual(snapshot(0).snapshot);
    expect(corpus.loadBundle('one')).toEqual(new FileSink(join(root, 'one')).toBundle());
    expect([...corpus].map((bundle) => bundle.metadata.sessionId)).toEqual(['one', 'two']);
    expect(runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()]).bundleCount).toBe(1);
  });
});
```

- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: FAIL with module/export errors for `BundleCorpus` and `CorpusIndexError`.

### Step 2: Implement `src/bundle-corpus.ts`

- [ ] Create `src/bundle-corpus.ts` with the public API and query helpers, plus `src/bundle-corpus-types.ts` for public types/errors and `src/bundle-corpus-manifest.ts` for manifest validation. Keep the subsystem self-contained; do not modify FileSink, SessionSource, SessionBundle, SessionReplayer, or runMetrics.

```ts
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { JsonValue } from './json.js';
import type { AttachmentDescriptor, SessionBundle, SessionMetadata } from './session-bundle.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
import { SessionRecordingError } from './session-errors.js';
import { FileSink } from './session-file-sink.js';
import type { SessionSource } from './session-sink.js';

const MANIFEST_FILE = 'manifest.json';

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

export interface BundleCorpusEntry {
  readonly key: string;
  readonly dir: string;
  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  readonly metadata: Readonly<SessionMetadata>;
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
```

- [ ] Add implementation helpers in the same file with these exact responsibilities:

```ts
interface FileManifest {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  attachments: AttachmentDescriptor[];
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

function corpusError(message: string, details: CorpusIndexErrorDetailsInput): CorpusIndexError {
  return new CorpusIndexError(message, normalizeDetails(details));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertCanonicalIso(value: unknown, label: string, path: string): string {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    throw corpusError(`${label} must be a normalized UTC ISO string`, { code: 'manifest_invalid', path, message: label });
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw corpusError(`${label} must round-trip through Date.toISOString()`, { code: 'manifest_invalid', path, message: label });
  }
  return value;
}

function validateQueryIso(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    throw corpusError(`${label} must be a normalized UTC ISO string`, { code: 'query_invalid', message: label });
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw corpusError(`${label} must round-trip through Date.toISOString()`, { code: 'query_invalid', message: label });
  }
  return value;
}

function assertString(value: unknown, label: string, path: string): string {
  if (typeof value !== 'string') {
    throw corpusError(`${label} must be a string`, { code: 'manifest_invalid', path, message: label });
  }
  return value;
}

function assertInteger(value: unknown, label: string, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw corpusError(`${label} must be a finite integer`, { code: 'manifest_invalid', path, message: label });
  }
  return value;
}
```

- [ ] Validate manifests with runtime checks instead of trusting JSON casts.

```ts
function validateMetadata(value: unknown, path: string): SessionMetadata {
  if (!isRecord(value)) {
    throw corpusError('manifest metadata must be an object', { code: 'manifest_invalid', path, message: 'metadata' });
  }
  const sourceKind = value.sourceKind;
  if (sourceKind !== 'session' && sourceKind !== 'scenario' && sourceKind !== 'synthetic') {
    throw corpusError('metadata.sourceKind must be session, scenario, or synthetic', { code: 'manifest_invalid', path, message: 'sourceKind' });
  }
  const failedTicks = value.failedTicks === undefined
    ? undefined
    : Array.isArray(value.failedTicks)
      ? value.failedTicks.map((tick, index) => assertInteger(tick, `failedTicks[${index}]`, path))
      : (() => { throw corpusError('metadata.failedTicks must be an array', { code: 'manifest_invalid', path, message: 'failedTicks' }); })();
  const metadata: SessionMetadata = {
    sessionId: assertString(value.sessionId, 'sessionId', path),
    engineVersion: assertString(value.engineVersion, 'engineVersion', path),
    nodeVersion: assertString(value.nodeVersion, 'nodeVersion', path),
    recordedAt: assertCanonicalIso(value.recordedAt, 'recordedAt', path),
    startTick: assertInteger(value.startTick, 'startTick', path),
    endTick: assertInteger(value.endTick, 'endTick', path),
    persistedEndTick: assertInteger(value.persistedEndTick, 'persistedEndTick', path),
    durationTicks: assertInteger(value.durationTicks, 'durationTicks', path),
    sourceKind,
  };
  if (value.sourceLabel !== undefined) metadata.sourceLabel = assertString(value.sourceLabel, 'sourceLabel', path);
  if (value.incomplete !== undefined) {
    if (value.incomplete !== true) {
      throw corpusError('metadata.incomplete must be true when present', { code: 'manifest_invalid', path, message: 'incomplete' });
    }
    metadata.incomplete = true;
  }
  if (failedTicks) metadata.failedTicks = failedTicks;
  if (value.policySeed !== undefined) metadata.policySeed = assertInteger(value.policySeed, 'policySeed', path);
  return metadata;
}

function validateAttachment(value: unknown, path: string, index: number): AttachmentDescriptor {
  if (!isRecord(value)) {
    throw corpusError(`attachments[${index}] must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}]` });
  }
  const ref = value.ref;
  if (!isRecord(ref)) {
    throw corpusError(`attachments[${index}].ref must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
  }
  const refKeys = Object.keys(ref).filter((key) => ref[key] !== undefined);
  const validRef =
    (refKeys.length === 1 && typeof ref.dataUrl === 'string') ||
    (refKeys.length === 1 && ref.sidecar === true) ||
    (refKeys.length === 1 && ref.auto === true);
  if (!validRef) {
    throw corpusError(`attachments[${index}].ref must be dataUrl, sidecar, or auto`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
  }
  return {
    id: assertString(value.id, `attachments[${index}].id`, path),
    mime: assertString(value.mime, `attachments[${index}].mime`, path),
    sizeBytes: assertInteger(value.sizeBytes, `attachments[${index}].sizeBytes`, path),
    ref: ref as AttachmentDescriptor['ref'],
  };
}

function readManifest(manifestPath: string): FileManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf-8')) as unknown;
  } catch (error) {
    throw corpusError(`manifest parse failed: ${(error as Error).message}`, { code: 'manifest_parse', path: manifestPath, message: (error as Error).message });
  }
  if (!isRecord(parsed)) {
    throw corpusError('manifest must be an object', { code: 'manifest_invalid', path: manifestPath, message: 'manifest' });
  }
  if (parsed.schemaVersion !== SESSION_BUNDLE_SCHEMA_VERSION) {
    throw corpusError('unsupported bundle schema version', { code: 'schema_unsupported', path: manifestPath, message: String(parsed.schemaVersion) });
  }
  if (!Array.isArray(parsed.attachments)) {
    throw corpusError('manifest attachments must be an array', { code: 'manifest_invalid', path: manifestPath, message: 'attachments' });
  }
  return {
    schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
    metadata: validateMetadata(parsed.metadata, manifestPath),
    attachments: parsed.attachments.map((attachment, index) => validateAttachment(attachment, manifestPath, index)),
  };
}
```

- [ ] Add a locale-independent string comparator. Use it everywhere the corpus exposes deterministic ordering.

```ts
function compareCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
```

- [ ] Add `BundleCorpus` with synchronous construction, deterministic discovery, immutable entries, query filtering, and lazy bundle iteration.

```ts
export class BundleCorpus implements Iterable<SessionBundle> {
  readonly rootDir: string;
  readonly invalidEntries: readonly InvalidCorpusEntry[];
  private readonly _entries: readonly BundleCorpusEntry[];
  private readonly _byKey: ReadonlyMap<string, BundleCorpusEntry>;

  constructor(rootDir: string, options: BundleCorpusOptions = {}) {
    const root = resolve(rootDir);
    if (!existsSync(root) || !lstatSync(root).isDirectory()) {
      throw corpusError('corpus root is missing or is not a directory', { code: 'root_missing', path: root });
    }
    this.rootDir = realpathSync(root);
    const invalidEntries: InvalidCorpusEntry[] = [];
    const found = discoverBundleDirs(this.rootDir, options.scanDepth ?? 'all');
    const byKey = new Map<string, BundleCorpusEntry>();
    const entries: BundleCorpusEntry[] = [];

    for (const dir of found) {
      const key = keyForDir(this.rootDir, dir);
      if (byKey.has(key)) {
        throw corpusError(`duplicate corpus key ${key}`, { code: 'duplicate_key', path: dir, key });
      }
      try {
        const entry = makeEntry(dir, key, readManifest(join(dir, MANIFEST_FILE)));
        byKey.set(key, entry);
        entries.push(entry);
      } catch (error) {
        if (options.skipInvalid && error instanceof CorpusIndexError && error.details.code !== 'duplicate_key') {
          invalidEntries.push(Object.freeze({ path: join(dir, MANIFEST_FILE), error }));
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
    const predicate = query ? compileQuery(query) : () => true;
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
```

- [ ] Implement the remaining private helpers exactly enough to satisfy the tests and design:

```ts
function discoverBundleDirs(root: string, depth: BundleCorpusScanDepth): string[] {
  const out: string[] = [];
  function visit(dir: string, remaining: number | 'all'): void {
    if (existsSync(join(dir, MANIFEST_FILE))) {
      out.push(dir);
      return;
    }
    if (remaining === 0) return;
    const nextRemaining = remaining === 'all' ? 'all' : remaining - 1;
    const children = readdirSync(dir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && !dirent.isSymbolicLink())
      .map((dirent) => dirent.name)
      .sort(compareCodeUnit);
    for (const child of children) visit(join(dir, child), nextRemaining);
  }
  visit(root, depth === 'root' ? 0 : depth === 'children' ? 1 : 'all');
  return out;
}

function keyForDir(root: string, dir: string): string {
  const rel = relative(root, dir);
  if (rel.length === 0) return '.';
  return rel.split(sep).join('/');
}

function makeEntry(dir: string, key: string, manifest: FileManifest): BundleCorpusEntry {
  const frozenFailedTicks = manifest.metadata.failedTicks ? Object.freeze(manifest.metadata.failedTicks.slice()) : undefined;
  const metadata: Readonly<SessionMetadata> = Object.freeze({
    ...manifest.metadata,
    ...(frozenFailedTicks ? { failedTicks: frozenFailedTicks as number[] } : {}),
  });
  const attachmentMimes = Object.freeze([...new Set(manifest.attachments.map((attachment) => attachment.mime))].sort(compareCodeUnit));
  const materializedEndTick = metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick;
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
    >() => new FileSink(dir).toBundle() as SessionBundle<TEventMap, TCommandMap, TDebug>,
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
    throw corpusError(`corpus entry ${key} not found`, { code: 'entry_missing', key });
  }
  return entry;
}
```

- [ ] Implement `compileQuery(query)` with inclusive numeric ranges, one-or-many matching, optional-field exclusion, `attachmentMime` any-match, canonical `recordedAt` bounds, and AND semantics.

```ts
function asArray<T>(value: OneOrMany<T>): readonly T[] {
  return Array.isArray(value) ? value : [value];
}

function assertQueryInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw corpusError(`${label} must be a finite integer`, { code: 'query_invalid', message: label });
  }
  return value;
}

function assertNumberRange(range: NumberRange, label: string): Required<NumberRange> {
  if (range.min !== undefined) assertQueryInteger(range.min, `${label}.min`);
  if (range.max !== undefined) assertQueryInteger(range.max, `${label}.max`);
  const min = range.min ?? Number.NEGATIVE_INFINITY;
  const max = range.max ?? Number.POSITIVE_INFINITY;
  if (min > max) {
    throw corpusError(`${label}.min must be <= max`, { code: 'query_invalid', message: label });
  }
  return { min, max };
}

function matchesRange(value: number, range: Required<NumberRange>): boolean {
  return value >= range.min && value <= range.max;
}

function matchesOne<T>(value: T | undefined, expected: OneOrMany<T> | undefined): boolean {
  if (expected === undefined) return true;
  if (value === undefined) return false;
  return asArray(expected).includes(value);
}

function matchesKey(value: string, expected: string | RegExp | undefined): boolean {
  if (expected === undefined) return true;
  if (typeof expected === 'string') return value === expected;
  expected.lastIndex = 0;
  const matched = expected.test(value);
  expected.lastIndex = 0;
  return matched;
}

function compileQuery(query: BundleQuery): (entry: BundleCorpusEntry) => boolean {
  const ranges = {
    durationTicks: query.durationTicks ? assertNumberRange(query.durationTicks, 'durationTicks') : undefined,
    startTick: query.startTick ? assertNumberRange(query.startTick, 'startTick') : undefined,
    endTick: query.endTick ? assertNumberRange(query.endTick, 'endTick') : undefined,
    persistedEndTick: query.persistedEndTick ? assertNumberRange(query.persistedEndTick, 'persistedEndTick') : undefined,
    materializedEndTick: query.materializedEndTick ? assertNumberRange(query.materializedEndTick, 'materializedEndTick') : undefined,
    failedTickCount: query.failedTickCount ? assertNumberRange(query.failedTickCount, 'failedTickCount') : undefined,
    policySeed: typeof query.policySeed === 'object' ? assertNumberRange(query.policySeed, 'policySeed') : undefined,
  };
  const policySeedScalar = typeof query.policySeed === 'number' ? assertQueryInteger(query.policySeed, 'policySeed') : undefined;
  const recordedAtFrom = query.recordedAt?.from === undefined ? undefined : validateQueryIso(query.recordedAt.from, 'recordedAt.from');
  const recordedAtTo = query.recordedAt?.to === undefined ? undefined : validateQueryIso(query.recordedAt.to, 'recordedAt.to');
  if (recordedAtFrom && recordedAtTo && recordedAtFrom > recordedAtTo) {
    throw corpusError('recordedAt.from must be <= recordedAt.to', { code: 'query_invalid', message: 'recordedAt' });
  }

  return (entry) => {
    const m = entry.metadata;
    if (!matchesKey(entry.key, query.key)) return false;
    if (!matchesOne(m.sessionId, query.sessionId)) return false;
    if (!matchesOne(m.sourceKind, query.sourceKind)) return false;
    if (!matchesOne(m.sourceLabel, query.sourceLabel)) return false;
    if (!matchesOne(m.engineVersion, query.engineVersion)) return false;
    if (!matchesOne(m.nodeVersion, query.nodeVersion)) return false;
    if (query.incomplete !== undefined && (m.incomplete === true) !== query.incomplete) return false;
    if (ranges.durationTicks && !matchesRange(m.durationTicks, ranges.durationTicks)) return false;
    if (ranges.startTick && !matchesRange(m.startTick, ranges.startTick)) return false;
    if (ranges.endTick && !matchesRange(m.endTick, ranges.endTick)) return false;
    if (ranges.persistedEndTick && !matchesRange(m.persistedEndTick, ranges.persistedEndTick)) return false;
    if (ranges.materializedEndTick && !matchesRange(entry.materializedEndTick, ranges.materializedEndTick)) return false;
    if (ranges.failedTickCount && !matchesRange(entry.failedTickCount, ranges.failedTickCount)) return false;
    if (policySeedScalar !== undefined && m.policySeed !== policySeedScalar) return false;
    if (ranges.policySeed && (m.policySeed === undefined || !matchesRange(m.policySeed, ranges.policySeed))) return false;
    if (recordedAtFrom && m.recordedAt < recordedAtFrom) return false;
    if (recordedAtTo && m.recordedAt > recordedAtTo) return false;
    if (query.attachmentMime && !entry.attachmentMimes.some((mime) => asArray(query.attachmentMime!).includes(mime))) return false;
    return true;
  };
}
```

- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: tests compile, then failures point to any mismatch between test names and implementation details rather than missing exports.

### Step 3: Export the public surface

- [ ] Modify `src/index.ts` by adding this export block after the FileSink export and before SessionRecorder:

```ts
// Bundle Corpus Index - Spec 7 (v0.8.3+): manifest-first query/index layer
// over closed FileSink bundle directories, with lazy SessionBundle loading.
export {
  BundleCorpus,
  CorpusIndexError,
  type BundleCorpusScanDepth,
  type BundleCorpusOptions,
  type BundleCorpusEntry,
  type BundleCorpusMetadata,
  type BundleQuery,
  type OneOrMany,
  type NumberRange,
  type IsoTimeRange,
  type CorpusIndexErrorCode,
  type CorpusIndexErrorDetails,
  type InvalidCorpusEntry,
} from './bundle-corpus.js';
```

- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: PASS for the focused corpus test file.

### Step 4: Add public documentation and version bump

- [ ] Modify `package.json`:

```json
{
  "version": "0.8.3"
}
```

- [ ] Modify `src/version.ts`:

```ts
export const ENGINE_VERSION = '0.8.3' as const;
```

- [ ] Modify README version badge from `0.8.2` to `0.8.3`. Add a Feature Overview row for "Bundle Corpus Index" and a Public Surface bullet that names `BundleCorpus`, `BundleQuery`, `BundleCorpusEntry`, and `CorpusIndexError`.
- [ ] In `README.md`, update the existing Synthetic Playtest Harness row so it no longer says corpus indexing is "future Tier-2" work. It should say synthetic playtests produce FileSink/SessionBundle corpora that can now be indexed by `BundleCorpus` and reduced by behavioral metrics.
- [ ] Add `docs/guides/bundle-corpus-index.md` with these sections: `# Bundle Corpus Index`, `Quickstart`, `Metadata Queries`, `Behavioral Metrics Integration`, `Replay Investigation`, `Scan Depth`, `Closed Corpus Contract`, `Incomplete Bundle Behavior`, `Sidecar Boundary`, `Embedded dataUrl Attachment Cost`, `Limitations`.
- [ ] In `docs/guides/bundle-corpus-index.md`, include this quickstart:

```ts
import { BundleCorpus, bundleCount, runMetrics, sessionLengthStats } from 'civ-engine';

const corpus = new BundleCorpus('artifacts/synth-corpus');
const syntheticComplete = corpus.bundles({ sourceKind: 'synthetic', incomplete: false });
const metrics = runMetrics(syntheticComplete, [bundleCount(), sessionLengthStats()]);
console.log(metrics);
```

- [ ] Modify `docs/api-reference.md` with `## Bundle Corpus Index (v0.8.3)` and one subsection for each public type exported in Step 3, including `OneOrMany`. Include constructor, `entries`, `bundles`, `get`, `openSource`, `loadBundle`, and `[Symbol.iterator]` signatures exactly as accepted in the design. Document `materializedEndTick` as an incomplete-aware persisted-content horizon, not a replayability guarantee.
- [ ] In `docs/guides/bundle-corpus-index.md` and `docs/changelog.md`, explicitly document that explicit `dataUrl` attachment bytes are embedded in `manifest.json` and therefore count as manifest parse cost, not as a separate content index.
- [ ] Modify `docs/guides/behavioral-metrics.md` so the primary quickstart and corpus framing use disk-backed `BundleCorpus` with `runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()])`. Keep in-memory `SessionBundle[]` accumulation only as a small-test or advanced note, not as the main path.
- [ ] Modify `docs/guides/session-recording.md` by adding an "Indexing FileSink bundles" subsection that says `BundleCorpus` reads manifests only during listing and that callers should build the corpus after sinks close.
- [ ] Modify `docs/guides/ai-integration.md` by adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
- [ ] Modify `docs/guides/concepts.md` by adding `BundleCorpus` to standalone utilities with a one-sentence manifest-first description.
- [ ] Modify `docs/README.md` by adding a `bundle-corpus-index.md` guide link.
- [ ] Modify `docs/architecture/ARCHITECTURE.md` by adding a Component Map row for the three BundleCorpus source files and a Boundaries paragraph that says the subsystem reads manifests, does not mutate FileSink bundle directories, and delegates full loading to FileSink.
- [ ] Append a row to `docs/architecture/drift-log.md` for 2026-04-27: "Added manifest-first BundleCorpus subsystem" with reason "Spec 7 unblocks disk-resident corpora for metrics and bundle triage."
- [ ] Append ADRs 28-31 from `docs/design/2026-04-27-bundle-corpus-index-design.md` to `docs/architecture/decisions.md` without deleting existing ADRs.
- [ ] Modify `docs/design/ai-first-dev-roadmap.md` to mark Spec 7 as implemented in v0.8.3 and note that it provides disk-backed bundle listing/filtering for Spec 8. Scrub stale "Proposed", "not yet drafted", and "depends on Spec 4" language for Spec 7; Spec 4 should be described as a future consumer of the corpus picker rather than a prerequisite.
- [ ] Add a `## 0.8.3 - 2026-04-27` entry at the top of `docs/changelog.md` with what shipped, why, validation commands, and behavior callouts for scan depth, manifest-only listing, closed corpus, incomplete-bundle `materializedEndTick`, dataUrl manifest parse cost, and sidecar bytes.

### Step 5: Run focused validation and doc audit

- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
- [ ] Expected: PASS.
- [ ] Run: `npm run typecheck`
- [ ] Expected: PASS with no TypeScript errors.
- [ ] Run: `npm run lint`
- [ ] Expected: PASS with no ESLint errors.
- [ ] Run this doc audit command:

```powershell
$docFiles = @('README.md') + (Get-ChildItem docs -Recurse -File -Filter *.md | Select-Object -ExpandProperty FullName)
Select-String -Path $docFiles -Pattern "BundleCorpus|BundleCorpusScanDepth|BundleCorpusOptions|BundleCorpusEntry|BundleCorpusMetadata|BundleQuery|OneOrMany|NumberRange|IsoTimeRange|CorpusIndexError|CorpusIndexErrorCode|CorpusIndexErrorDetails|InvalidCorpusEntry|bundle-corpus-index|0.8.3"
```

- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, roadmap, and changelog mentions. No stale signatures are found during manual inspection of those hits. Spec 7 is additive, so there are no removed or renamed API names to audit beyond verifying that all new public names are covered in current docs. The final committed doc state is audited again after the devlog updates in Step 8.

### Step 6: Run full engine gates

- [ ] Run: `npm test`
- [ ] Expected: all tests pass and the existing pending tests remain pending.
- [ ] Run: `npm run typecheck`
- [ ] Expected: PASS.
- [ ] Run: `npm run lint`
- [ ] Expected: PASS.
- [ ] Run: `npm run build`
- [ ] Expected: PASS and `dist/bundle-corpus.d.ts` plus `dist/bundle-corpus.js` are emitted by the build.

### Step 7: Stage the coherent change and run multi-CLI code review

- [ ] Stage only the Spec 7 implementation, tests, docs, design/review artifacts, and version files:

```powershell
git add src\bundle-corpus.ts src\bundle-corpus-types.ts src\bundle-corpus-manifest.ts src\index.ts tests\bundle-corpus.test.ts package.json package-lock.json src\version.ts README.md docs\api-reference.md docs\guides\bundle-corpus-index.md docs\guides\behavioral-metrics.md docs\guides\session-recording.md docs\guides\ai-integration.md docs\guides\concepts.md docs\README.md docs\architecture\ARCHITECTURE.md docs\architecture\drift-log.md docs\architecture\decisions.md docs\design\ai-first-dev-roadmap.md docs\design\2026-04-27-bundle-corpus-index-design.md docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md docs\changelog.md docs\devlog\summary.md docs\devlog\detailed\2026-04-27_2026-04-27.md docs\reviews\bundle-corpus-index docs\reviews\bundle-corpus-index-T1
```

- [ ] Create code-review iteration 1 folders:

```powershell
New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw
git diff --staged | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\diff.md
```

- [ ] Run two independent Codex reviewers and Claude when available. Save raw outputs as `raw/codex.md`, `raw/codex-2.md`, and `raw/opus.md`. The second Codex pass follows the current handoff for this roadmap loop because Claude quota may be limited; when Claude is reachable, keep all three outputs.

```powershell
$prompt = @'
You are a senior code reviewer for civ-engine Spec 7: Bundle Search / Corpus Index. Review the staged diff only. The intent is an additive v0.8.3 API that adds BundleCorpus over closed FileSink bundle directories. Verify correctness, design, deterministic ordering, manifest validation, query validation, FileSink/runMetrics integration, tests, public exports, docs, version bump, and AGENTS.md doc discipline. Verify docs in the diff match implementation; flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides. Do NOT modify files. Only return real findings with severity, explanation, and suggested fix. If there are no real issues, say ACCEPT.
'@
$jobs = @()
$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex.md } -ArgumentList $prompt
$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex-2.md } -ArgumentList $prompt
$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $prompt --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\opus.md } -ArgumentList $prompt
Wait-Job -Job $jobs
$jobs | Receive-Job
```

- [ ] Synthesize `docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md` with provider-by-provider findings, severity, accepted/nitpick verdicts, and follow-up actions.
- [ ] Stage the generated code-review artifacts after each review iteration:

```powershell
git add docs\reviews\bundle-corpus-index-T1
```

- [ ] If a reviewer reports a real issue, fix it, rerun affected tests, rerun full gates if behavior or public docs changed, stage the updated diff plus `docs\reviews\bundle-corpus-index-T1`, and create iteration `2` with the same raw/diff/REVIEW layout. Stop when reviewers accept or only nitpick.
- [ ] For code-review iteration `2` or later, enrich the reviewer prompt with the previous iteration's `REVIEW.md` files and `docs/learning/lessons.md`. Use this prompt header before the task-specific review text:

```text
This is Spec 7 code-review iteration <N>. Before reviewing the new staged diff, read every prior review synthesis for this task:
- docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md through docs/reviews/bundle-corpus-index-T1/2026-04-27/<N-1>/REVIEW.md
- docs/learning/lessons.md

Verify every real finding from all previous iterations was addressed. Do not re-flag resolved findings unless the new diff reintroduced the bug. Review the new staged diff for remaining real issues only.
```

- [ ] If code-review consensus does not converge after 3 iterations, run the Opus tie-breaker and save its output before proceeding:

```powershell
New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker\raw
$tieBreakerPrompt = @'
You are the final tie-breaker for civ-engine Spec 7 Bundle Corpus Index after 3 unresolved code-review iterations. Read the staged diff, docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/2/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/3/REVIEW.md, and docs/learning/lessons.md. You must choose exactly one verdict:
ACCEPT - the current staged diff is safe to commit and remaining reviewer objections are overridden.
REJECT - the diff must not commit; include the mandatory prescriptive patch or exact file edits required.
'@
git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $tieBreakerPrompt --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker\raw\opus.md
git add docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker
```

- [ ] If the tie-breaker returns `REJECT`, apply the prescribed patch, rerun affected tests and full gates, stage the updated diff, and run one final verification review that references the tie-breaker output. If it returns `ACCEPT`, record the override in `docs/reviews/bundle-corpus-index-T1/2026-04-27/tie-breaker/REVIEW.md` and the detailed devlog entry.
- [ ] If Claude is unreachable because of quota or model access, keep `raw/opus.md` with the error text and proceed with the two Codex outputs, documenting the unreachable Claude reviewer in `REVIEW.md` and the devlog.

### Step 8: Write final devlog entries after code review convergence

- [ ] Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md` with a new timestamped entry for Spec 7. Include action, code reviewer comments by provider and theme, result, reasoning, and notes. Mention the final review iteration folder.
- [ ] Compact `docs/devlog/summary.md` before adding the Spec 7 line because the file is already above the AGENTS.md 50-line target. Preserve newest-first status for the recent Spec 1, Spec 3, Spec 8, and Spec 7 roadmap work, remove outdated repeated process chatter, then add one newest-first line: "2026-04-27 - Shipped Spec 7 Bundle Corpus Index in v0.8.3: manifest-first FileSink corpus discovery/query plus lazy bundle iteration for runMetrics."
- [ ] Stage the devlog files:

```powershell
git add docs\devlog\detailed\2026-04-27_2026-04-27.md docs\devlog\summary.md
```

- [ ] Re-run the full doc audit against the final doc state:

```powershell
$docFiles = @('README.md') + (Get-ChildItem docs -Recurse -File -Filter *.md | Select-Object -ExpandProperty FullName)
Select-String -Path $docFiles -Pattern "BundleCorpus|BundleCorpusScanDepth|BundleCorpusOptions|BundleCorpusEntry|BundleCorpusMetadata|BundleQuery|OneOrMany|NumberRange|IsoTimeRange|CorpusIndexError|CorpusIndexErrorCode|CorpusIndexErrorDetails|InvalidCorpusEntry|bundle-corpus-index|0.8.3"
```

- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, roadmap, changelog, and devlog mentions. No stale signatures are found during manual inspection of those hits.

- [ ] Run: `git diff --cached --stat`
- [ ] Expected: staged files are only the coherent Spec 7 implementation, tests, docs, review artifacts, and version bump.

### Step 9: Final verification and direct-to-main commit

- [ ] Run final gates after the devlog update:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

- [ ] Expected: all four commands pass.
- [ ] Commit directly on `main`:

```powershell
git commit -m "feat: add bundle corpus index"
```

- [ ] Expected: one v0.8.3 commit containing code, tests, docs, ADRs, roadmap status, changelog, devlog, review artifacts, and version bump.

## Acceptance Checklist

- [ ] Public exports include `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleCorpusMetadata`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
- [ ] Construction discovers root, child, and nested FileSink bundle directories according to `scanDepth`; root bundle key is `'.'`; descendant keys use `/`.
- [ ] Discovery skips symlinked directories and stops descending inside bundle directories.
- [ ] `entries(query?)` reads manifests only and returns deterministic frozen entries in `recordedAt`, `sessionId`, `key` order.
- [ ] `bundles(query?)` and `[Symbol.iterator]` lazily load full bundles through FileSink.
- [ ] `get` returns `undefined` for missing keys; `openSource` and `loadBundle` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
- [ ] Query filters cover exact, one-or-many, numeric range, ISO range, optional field, failure count, materialized end tick, key RegExp, and attachment MIME any-match semantics.
- [ ] Invalid query and invalid manifest errors use `CorpusIndexError` with JSON-shaped `details.code`.
- [ ] `skipInvalid` records invalid manifests and omits them from entries.
- [ ] `runMetrics(corpus.bundles(query), metrics)` is covered by tests.
- [ ] Docs, ADRs, roadmap, changelog, devlog, API reference, README badge, and version bump ship in the same commit.
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass before commit.
- [ ] Multi-CLI code review artifacts exist and converge under `docs/reviews/bundle-corpus-index-T1/2026-04-27/`.
