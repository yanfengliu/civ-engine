import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

function writeBundle(
  dir: string,
  meta: SessionMetadata,
  attachments: AttachmentDescriptor[] = [],
): void {
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

function writeRawManifest(dir: string, raw: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'manifest.json'), raw);
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

  it('treats a root manifest as the corpus boundary for child scans', () => {
    const root = tempRoot();
    writeBundle(root, metadata('root'));
    writeBundle(join(root, 'child'), metadata('child'));

    expect(new BundleCorpus(root, { scanDepth: 'children' }).entries().map((entry) => entry.key)).toEqual(['.']);
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

  it('skips symlinked manifest files when the platform permits creating them', () => {
    const root = tempRoot();
    const target = join(root, 'target');
    const fake = join(root, 'fake');
    writeBundle(target, metadata('target'));
    mkdirSync(fake, { recursive: true });
    try {
      symlinkSync(join(target, 'manifest.json'), join(fake, 'manifest.json'), 'file');
    } catch {
      return;
    }

    const corpus = new BundleCorpus(root);
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['target']);
  });

  it('accepts an explicit symlinked root when the platform permits creating it', () => {
    const root = tempRoot();
    const target = join(root, 'target');
    const link = join(root, 'link');
    writeBundle(target, metadata('target'));
    try {
      symlinkSync(target, link, 'junction');
    } catch {
      return;
    }

    const corpus = new BundleCorpus(link, { scanDepth: 'root' });
    expect(corpus.entries().map((entry) => entry.key)).toEqual(['.']);
    expect(corpus.entries()[0].metadata.sessionId).toBe('target');
  });
});

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
    expect(() => (failedTicks as number[]).push(99)).toThrow(TypeError);
    expect(corpus.get('incomplete')!.metadata.failedTicks).toEqual([26, 27]);
  });

  it('rejects invalid query ranges and non-canonical recordedAt bounds', () => {
    const root = tempRoot();
    writeBundle(join(root, 'bundle'), metadata('bundle'));
    const corpus = new BundleCorpus(root);

    expectCorpusError(() => corpus.entries(null as never), 'query_invalid');
    expectCorpusError(() => corpus.entries(new Date() as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ foo: 1 } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ key: 1 } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ sessionId: [1] } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ sourceKind: 'battle' } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ incomplete: 'true' } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ durationTicks: null } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ durationTicks: new Date() } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ durationTicks: { foo: 1 } } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ durationTicks: { min: 10, max: 1 } }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ startTick: { min: 0.5 } }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ policySeed: Number.POSITIVE_INFINITY }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ policySeed: { foo: 1 } } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ recordedAt: '2026-04-27T00:00:00.000Z' } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ recordedAt: new Date() } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ recordedAt: { foo: 'bar' } } as never), 'query_invalid');
    expectCorpusError(() => corpus.entries({ recordedAt: { from: '2026-04-27' } }), 'query_invalid');
    expectCorpusError(() => corpus.entries({ attachmentMime: [1] } as never), 'query_invalid');
  });

  it('returns undefined for get and throws entry_missing for strict missing-key APIs', () => {
    const root = tempRoot();
    writeBundle(join(root, 'bundle'), metadata('bundle'));
    const corpus = new BundleCorpus(root);

    expect(corpus.get('missing')).toBeUndefined();
    expectCorpusError(() => corpus.openSource('missing'), 'entry_missing');
    expectCorpusError(() => corpus.loadBundle('missing'), 'entry_missing');
  });

  it('throws root_missing when the corpus root is absent', () => {
    const root = tempRoot();
    const missing = join(root, 'missing');

    expectCorpusError(() => new BundleCorpus(missing), 'root_missing');
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

  it('preserves manifest_parse and schema_unsupported as public error codes', () => {
    const root = tempRoot();
    writeRawManifest(join(root, 'broken-json'), '{');
    writeInvalidManifest(join(root, 'unsupported-schema'), {
      schemaVersion: 999,
      metadata: metadata('unsupported-schema'),
      attachments: [],
    });

    expectCorpusError(() => new BundleCorpus(root), 'manifest_parse');
    const corpus = new BundleCorpus(root, { skipInvalid: true });
    expect(corpus.entries()).toEqual([]);
    expect(corpus.invalidEntries.map((entry) => entry.error.details.code)).toEqual([
      'manifest_parse',
      'schema_unsupported',
    ]);
  });

  it('loads FileSink bundles and composes with runMetrics', () => {
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
