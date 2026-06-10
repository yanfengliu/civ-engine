import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileSink, SESSION_BUNDLE_SCHEMA_VERSION, SessionRecorder, World, type SessionMetadata } from '../src/index.js';

const mkMetadata = (): SessionMetadata => ({
  sessionId: '00000000-0000-0000-0000-000000000000',
  engineVersion: '0.7.8',
  nodeVersion: 'v22.0.0',
  recordedAt: '2026-04-27T00:00:00Z',
  startTick: 0, endTick: 0, persistedEndTick: 0, durationTicks: 0,
  sourceKind: 'session',
});

const mkSnapshot = (tick: number) => ({
  version: 5, tick,
  config: { gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' },
  entities: { generations: [], alive: [], freeList: [] },
  components: {}, resources: { pools: {}, rates: {}, transfers: {} },
  rng: { state: '0' }, state: {}, tags: {}, metadata: {},
} as never);

describe('FileSink', () => {
  let bundleDir: string;

  beforeEach(() => {
    bundleDir = mkdtempSync(join(tmpdir(), 'civ-engine-bundle-'));
  });

  afterEach(() => {
    try { rmSync(bundleDir, { recursive: true, force: true }); } catch { /* swallow */ }
  });

  it('open() creates the directory layout (manifest, jsonl streams, snapshots/, attachments/)', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.close();
    expect(existsSync(join(bundleDir, 'manifest.json'))).toBe(true);
    expect(existsSync(join(bundleDir, 'ticks.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'commands.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'executions.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'failures.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'markers.jsonl'))).toBe(true);
    expect(existsSync(join(bundleDir, 'snapshots'))).toBe(true);
    expect(existsSync(join(bundleDir, 'attachments'))).toBe(true);
  });

  it('writeSnapshot persists to snapshots/<tick>.json and advances persistedEndTick in manifest', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 100, snapshot: mkSnapshot(100) });
    const onDisk = JSON.parse(readFileSync(join(bundleDir, 'snapshots', '100.json'), 'utf-8'));
    expect(onDisk.tick).toBe(100);
    const manifest = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    expect(manifest.metadata.persistedEndTick).toBe(100);
    sink.close();
  });

  it('manifest atomic-rename: tmp file does not linger after writeSnapshot', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 50, snapshot: mkSnapshot(50) });
    expect(existsSync(join(bundleDir, 'manifest.tmp.json'))).toBe(false);
    expect(existsSync(join(bundleDir, 'manifest.json'))).toBe(true);
    sink.close();
  });

  it('writeAttachment defaults to sidecar (FileSink is disk-backed)', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const desc = sink.writeAttachment(
      { id: 'small', mime: 'image/png', sizeBytes: 5, ref: { sidecar: true } },
      new Uint8Array([1, 2, 3, 4, 5]),
    );
    expect(desc.ref).toEqual({ sidecar: true });
    expect(existsSync(join(bundleDir, 'attachments', 'small.png'))).toBe(true);
    sink.close();
    const m = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    const a = m.attachments.find((x: { id: string }) => x.id === 'small');
    expect(a.ref).toEqual({ sidecar: true });
  });

  it('writeAttachment with explicit { dataUrl } embeds in manifest', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeAttachment(
      { id: 'tiny', mime: 'text/plain', sizeBytes: 5, ref: { dataUrl: '' } },
      new Uint8Array([104, 101, 108, 108, 111]),
    );
    sink.close();
    const m = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    const a = m.attachments.find((x: { id: string }) => x.id === 'tiny');
    expect(a.ref).toHaveProperty('dataUrl');
    expect(a.ref.dataUrl).toMatch(/^data:text\/plain;base64,/);
    // No file written for dataUrl mode
    expect(existsSync(join(bundleDir, 'attachments', 'tiny.txt'))).toBe(false);
  });

  it('MIME → file extension mapping for sidecar attachments', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const cases = [
      { id: 'a1', mime: 'image/png', ext: '.png' },
      { id: 'a2', mime: 'image/jpeg', ext: '.jpg' },
      { id: 'a3', mime: 'application/json', ext: '.json' },
      { id: 'a4', mime: 'application/octet-stream', ext: '.bin' },
      { id: 'a5', mime: 'text/plain', ext: '.txt' },
      { id: 'a6', mime: 'application/x-custom', ext: '.bin' },
    ];
    for (const c of cases) {
      sink.writeAttachment(
        { id: c.id, mime: c.mime, sizeBytes: 4, ref: { sidecar: true } },
        new Uint8Array([1, 2, 3, 4]),
      );
    }
    sink.close();
    for (const c of cases) {
      expect(existsSync(join(bundleDir, 'attachments', `${c.id}${c.ext}`))).toBe(true);
    }
  });

  it('writeTick / writeCommand / writeMarker append to JSONL streams', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeTick({ tick: 1, diff: { tick: 1 } as never, events: [], metrics: null, debug: null });
    sink.writeTick({ tick: 2, diff: { tick: 2 } as never, events: [], metrics: null, debug: null });
    sink.writeCommand({
      type: 'spawn', data: { x: 1 }, sequence: 1, submissionTick: 1,
      result: { schemaVersion: 1 as never, accepted: true, commandType: 'spawn',
        code: 'ok', message: '', details: null, tick: 1, sequence: 1, validatorIndex: null },
    });
    sink.writeMarker({ id: 'm1', tick: 1, kind: 'annotation', provenance: 'game' });
    sink.close();

    const ticks = readFileSync(join(bundleDir, 'ticks.jsonl'), 'utf-8').trim().split('\n');
    expect(ticks).toHaveLength(2);
    const cmds = readFileSync(join(bundleDir, 'commands.jsonl'), 'utf-8').trim().split('\n');
    expect(cmds).toHaveLength(1);
    const markers = readFileSync(join(bundleDir, 'markers.jsonl'), 'utf-8').trim().split('\n');
    expect(markers).toHaveLength(1);
  });

  it('close() rewrites manifest with terminal metadata', () => {
    const sink = new FileSink(bundleDir);
    const md = mkMetadata();
    md.endTick = 100;
    md.durationTicks = 100;
    sink.open(md);
    sink.writeSnapshot({ tick: 100, snapshot: mkSnapshot(100) });
    sink.close();
    const m = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    expect(m.metadata.endTick).toBe(100);
    expect(m.metadata.durationTicks).toBe(100);
  });

  it('SessionSource: ticks() / commands() / markers() yield in write order', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeTick({ tick: 1, diff: { tick: 1 } as never, events: [], metrics: null, debug: null });
    sink.writeTick({ tick: 2, diff: { tick: 2 } as never, events: [], metrics: null, debug: null });
    sink.writeMarker({ id: 'm1', tick: 1, kind: 'annotation', provenance: 'game' });
    sink.writeMarker({ id: 'm2', tick: 2, kind: 'annotation', provenance: 'game' });
    expect([...sink.ticks()].map((t) => t.tick)).toEqual([1, 2]);
    expect([...sink.markers()].map((m) => m.id)).toEqual(['m1', 'm2']);
    sink.close();
  });

  it('readSnapshot reads from disk', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 50, snapshot: mkSnapshot(50) });
    expect((sink.readSnapshot(50) as { tick: number }).tick).toBe(50);
    expect(() => sink.readSnapshot(999)).toThrow(/not found/);
    sink.close();
  });

  it('readSidecar reads attachment bytes from disk', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    const data = new Uint8Array([10, 20, 30, 40, 50]);
    sink.writeAttachment(
      { id: 'x', mime: 'application/octet-stream', sizeBytes: 5, ref: { sidecar: true } },
      data,
    );
    const recovered = sink.readSidecar('x');
    expect([...recovered]).toEqual([10, 20, 30, 40, 50]);
    sink.close();
  });

  it('readSidecar throws for dataUrl-mode attachments', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeAttachment(
      { id: 'd', mime: 'text/plain', sizeBytes: 5, ref: { dataUrl: '' } },
      new Uint8Array([104, 101, 108, 108, 111]),
    );
    expect(() => sink.readSidecar('d')).toThrow(/not a sidecar/);
    sink.close();
  });

  it('toBundle() produces bundle equivalent to MemorySink for the same writes', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeTick({ tick: 1, diff: { tick: 1 } as never, events: [], metrics: null, debug: null });
    sink.writeMarker({ id: 'm1', tick: 1, kind: 'annotation', provenance: 'game' });
    sink.writeSnapshot({ tick: 1, snapshot: mkSnapshot(1) });
    sink.close();

    const bundle = sink.toBundle();
    expect(bundle.schemaVersion).toBe(1);
    expect((bundle.initialSnapshot as { tick: number }).tick).toBe(0);
    expect(bundle.snapshots).toHaveLength(1);
    expect(bundle.snapshots[0].tick).toBe(1);
    expect(bundle.markers).toHaveLength(1);
    expect(bundle.ticks).toHaveLength(1);
  });

  it('toBundle() throws if no snapshots written', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.close();
    expect(() => sink.toBundle()).toThrow(/snapshots/);
  });

  it('writeTickFailure populates metadata.failedTicks', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.writeTickFailure({ tick: 5, code: 'system_throw', message: 'boom', details: null } as never);
    sink.close();
    const m = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf-8'));
    expect(m.metadata.failedTicks).toEqual([5]);
  });
});

describe('attachment-id safety + directory reuse (full-review 2026-06-10 H2/H3/M2)', () => {
  let bundleDir: string;
  beforeEach(() => { bundleDir = mkdtempSync(join(tmpdir(), 'civ-engine-bundle-')); });
  afterEach(() => { try { rmSync(bundleDir, { recursive: true, force: true }); } catch { /* swallow */ } });
  it('writeAttachment rejects ids containing path separators', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    expect(() =>
      sink.writeAttachment(
        { id: '../evil', mime: 'text/plain', sizeBytes: 3, ref: { sidecar: true } },
        new Uint8Array([1, 2, 3]),
      ),
    ).toThrow(/invalid attachment id/);
    expect(existsSync(join(bundleDir, 'evil.txt'))).toBe(false);
    sink.close();
  });

  it('readSidecar rejects manifest-supplied ids that escape attachments/', () => {
    const manifest = {
      schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
      metadata: mkMetadata(),
      attachments: [
        { id: '../manifest', mime: 'application/json', sizeBytes: 1, ref: { sidecar: true } },
      ],
    };
    writeFileSync(join(bundleDir, 'manifest.json'), JSON.stringify(manifest));
    const sink = new FileSink(bundleDir);
    expect(() => sink.readSidecar('../manifest')).toThrow(/invalid attachment id/);
  });

  it('open() refuses a directory that already contains a recording', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.close();
    const reopened = new FileSink(bundleDir);
    expect(() => reopened.open(mkMetadata())).toThrow(/already contains a recording/);
  });

  it('writeSnapshot leaves no tmp file and toBundle() ignores stray *.json.tmp', () => {
    const sink = new FileSink(bundleDir);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    writeFileSync(join(bundleDir, 'snapshots', '5.json.tmp'), '{"tick":5,"snapsho');
    sink.close();
    const snapshotFiles = readdirSync(join(bundleDir, 'snapshots'));
    expect(snapshotFiles.filter((f) => f.endsWith('.tmp')).length).toBe(1);
    const bundle = sink.toBundle();
    expect(bundle.snapshots.some((s) => s.tick === 5)).toBe(false);
  });
});

describe('read-preloaded sinks must never rewrite existing bundles (full-review 2026-06-10 iter-2)', () => {
  it('failed connect() + disconnect() against an existing bundle dir leaves the manifest byte-identical', () => {
    const sink = new FileSink(bundleDir2);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.close();
    const before = readFileSync(join(bundleDir2, 'manifest.json'), 'utf-8');

    const reader = new FileSink(bundleDir2);
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const rec = new SessionRecorder({ world, sink: reader });
    rec.connect();                                   // open() throws bundle_dir_not_empty, swallowed
    expect(rec.lastError).not.toBeNull();
    expect(() => rec.disconnect()).not.toThrow();
    expect(readFileSync(join(bundleDir2, 'manifest.json'), 'utf-8')).toBe(before);
  });

  it('write methods on a read-preloaded (never-opened) sink throw not_opened', () => {
    const sink = new FileSink(bundleDir2);
    sink.open(mkMetadata());
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.close();
    const reader = new FileSink(bundleDir2);
    expect(() => reader.writeTick({ tick: 1, events: [], metrics: null, diff: null } as never))
      .toThrow(/not opened/);
    expect(reader.toBundle().metadata.sessionId).toBe(mkMetadata().sessionId); // read path intact
  });

  it('open() refuses a directory with orphaned snapshots even without a manifest', () => {
    mkdirSync(join(bundleDir2, 'snapshots'), { recursive: true });
    writeFileSync(join(bundleDir2, 'snapshots', '5.json'), JSON.stringify({ tick: 5, snapshot: mkSnapshot(5) }));
    const sink = new FileSink(bundleDir2);
    expect(() => sink.open(mkMetadata())).toThrow(/already contains a recording/);
  });

  let bundleDir2: string;
  beforeEach(() => { bundleDir2 = mkdtempSync(join(tmpdir(), 'civ-engine-bundle-')); });
  afterEach(() => { try { rmSync(bundleDir2, { recursive: true, force: true }); } catch { /* swallow */ } });
});
