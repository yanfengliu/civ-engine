import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BundleCorpus,
  BundleViewer,
  FileSink,
  MemorySink,
  SessionRecorder,
  World,
  type WorldConfig,
  type WorldSnapshot,
} from '../src/index.js';

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'civ-engine-bv-'));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

interface Cmds { step: { value: number } }
interface Events { spawned: { id: number } }

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });

const mkWorld = (): World<Events, Cmds> => {
  const w = new World<Events, Cmds>(mkConfig());
  w.registerHandler('step', () => undefined);
  return w;
};

const worldFactory = (snap: WorldSnapshot): World<Events, Cmds> => {
  const w = mkWorld();
  w.applySnapshot(snap);
  return w;
};

function recordToFile(dir: string): void {
  const world = mkWorld();
  const sink = new FileSink(dir);
  const rec = new SessionRecorder<Events, Cmds>({ world, sink });
  rec.connect();
  for (let i = 0; i < 3; i++) {
    world.submit('step', { value: i });
    world.step();
  }
  rec.disconnect();
}

describe('BundleCorpusEntry.openViewer', () => {
  it('returns a BundleViewer over the corpus entry bundle', () => {
    const root = tempRoot();
    const bundleDir = join(root, 'b1');
    recordToFile(bundleDir);
    const corpus = new BundleCorpus(root);
    const entry = corpus.entries()[0];
    expect(entry).toBeDefined();
    const viewer = entry.openViewer<Events, Cmds>({ worldFactory });
    expect(viewer).toBeInstanceOf(BundleViewer);
    expect(viewer.bundle.metadata.sessionId).toBe(entry.metadata.sessionId);
  });

  it('viewer.recordedRange matches the corpus entry materialized horizon', () => {
    const root = tempRoot();
    const bundleDir = join(root, 'b1');
    recordToFile(bundleDir);
    const corpus = new BundleCorpus(root);
    const entry = corpus.entries()[0];
    const viewer = entry.openViewer<Events, Cmds>();
    expect(viewer.recordedRange.start).toBe(entry.metadata.startTick);
    expect(viewer.recordedRange.end).toBe(entry.metadata.endTick);
  });

  it('the corpus entry remains frozen after openViewer is attached', () => {
    const root = tempRoot();
    const bundleDir = join(root, 'b1');
    recordToFile(bundleDir);
    const corpus = new BundleCorpus(root);
    const entry = corpus.entries()[0];
    expect(Object.isFrozen(entry)).toBe(true);
    expect(typeof entry.openViewer).toBe('function');
    // Mutation attempts must throw under strict mode — confirms the freeze
    // actually rejects writes (not just that the object reports as frozen).
    expect(() => {
      (entry as unknown as { openViewer: () => void }).openViewer = () => undefined;
    }).toThrow();
    expect(() => {
      (entry as unknown as { newField: number }).newField = 1;
    }).toThrow();
  });

  it('frame.state() works through the corpus path with a worldFactory', () => {
    const root = tempRoot();
    const bundleDir = join(root, 'b1');
    recordToFile(bundleDir);
    const corpus = new BundleCorpus(root);
    const entry = corpus.entries()[0];
    const viewer = entry.openViewer<Events, Cmds>({ worldFactory });
    const frame = viewer.atTick(2);
    const world = frame.state();
    expect(world.tick).toBe(2);
  });

  it('also works for a MemorySink-backed corpus path', () => {
    // Build a bundle with MemorySink, materialize via fromSource for parity testing.
    const world = mkWorld();
    const sink = new MemorySink();
    const rec = new SessionRecorder<Events, Cmds>({ world, sink });
    rec.connect();
    world.step();
    rec.disconnect();
    const viewer = BundleViewer.fromSource<Events, Cmds>(sink, { worldFactory });
    expect(viewer.recordedRange.end).toBe(1);
  });
});
