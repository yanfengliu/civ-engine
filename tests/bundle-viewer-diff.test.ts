import { describe, expect, it } from 'vitest';
import {
  BundleIntegrityError,
  MemorySink,
  SessionRecorder,
  World,
  type SessionBundle,
  type WorldConfig,
  type WorldSnapshot,
} from '../src/index.js';
import { BundleViewer, BundleViewerError } from '../src/bundle-viewer.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10,
  gridHeight: 10,
  tps: 60,
  positionKey: 'position',
});

interface Cmds {
  step: { value: number };
}
interface Events {
  spawned: { id: number };
}

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

function recordSimpleBundle(steps: number): SessionBundle<Events, Cmds> {
  const world = mkWorld();
  const sink = new MemorySink();
  const rec = new SessionRecorder<Events, Cmds>({ world, sink });
  rec.connect();
  for (let i = 0; i < steps; i++) {
    world.submit('step', { value: i });
    world.step();
  }
  rec.disconnect();
  return rec.toBundle() as unknown as SessionBundle<Events, Cmds>;
}

describe('BundleViewer.frame.diffSince', () => {
  it('equal endpoints return empty BundleStateDiff with source tick-diffs', () => {
    const bundle = recordSimpleBundle(3);
    const viewer = new BundleViewer(bundle);
    const frame = viewer.atTick(1);
    const d = frame.diffSince(1);
    expect(d.fromTick).toBe(1);
    expect(d.toTick).toBe(1);
    expect(d.source).toBe('tick-diffs');
    expect(d.diff.entities.created).toEqual([]);
    expect(d.diff.entities.destroyed).toEqual([]);
  });

  it('direction normalization: from = min, to = max regardless of caller order', () => {
    const bundle = recordSimpleBundle(3);
    const viewer = new BundleViewer(bundle);
    const frame3 = viewer.atTick(3);
    const d = frame3.diffSince(1);
    expect(d.fromTick).toBe(1);
    expect(d.toTick).toBe(3);
  });

  it('NaN otherTick throws query_invalid', () => {
    const bundle = recordSimpleBundle(2);
    const viewer = new BundleViewer(bundle);
    const frame = viewer.atTick(1);
    try {
      frame.diffSince(NaN);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BundleViewerError);
      expect((e as BundleViewerError).details.code).toBe('query_invalid');
    }
  });

  it('out-of-range otherTick throws tick_out_of_range', () => {
    const bundle = recordSimpleBundle(2);
    const viewer = new BundleViewer(bundle);
    const frame = viewer.atTick(1);
    try {
      frame.diffSince(999);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BundleViewerError);
      expect((e as BundleViewerError).details.code).toBe('tick_out_of_range');
    }
  });

  it('options.fromSnapshot forces source = snapshot (and requires worldFactory)', () => {
    const bundle = recordSimpleBundle(3);
    const viewer = new BundleViewer(bundle, { worldFactory });
    const frame = viewer.atTick(3);
    const d = frame.diffSince(1, { fromSnapshot: true });
    expect(d.source).toBe('snapshot');
  });

  it('options.fromSnapshot without worldFactory throws world_factory_required', () => {
    const bundle = recordSimpleBundle(3);
    const viewer = new BundleViewer(bundle);
    const frame = viewer.atTick(3);
    try {
      frame.diffSince(1, { fromSnapshot: true });
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BundleViewerError);
      expect((e as BundleViewerError).details.code).toBe('world_factory_required');
    }
  });

  it('failure-in-range throws BundleIntegrityError with enriched details', () => {
    const bundle = recordSimpleBundle(3);
    bundle.failures = [
      { tick: 2, phase: 'systems', error: { name: 'IntentionalError', message: 'test' } },
    ] as unknown as typeof bundle.failures;
    const viewer = new BundleViewer(bundle);
    const frame = viewer.atTick(3);
    try {
      frame.diffSince(1);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BundleIntegrityError);
      const det = (e as InstanceType<typeof BundleIntegrityError>).details as {
        code: string; failedTicks: number[]; fromTick: number; toTick: number;
      };
      expect(det.code).toBe('replay_across_failure');
      expect(det.failedTicks).toEqual([2]);
      expect(det.fromTick).toBe(1);
      expect(det.toTick).toBe(3);
    }
  });

  it('automatic snapshot fallback when intermediate tick lacks a SessionTickEntry', () => {
    const bundle = recordSimpleBundle(3);
    bundle.ticks = bundle.ticks.filter((t) => t.tick !== 2);
    const viewer = new BundleViewer(bundle, { worldFactory });
    const frame = viewer.atTick(3);
    const d = frame.diffSince(1);
    expect(d.source).toBe('snapshot');
  });

  it('automatic snapshot fallback when entity ID is recycled within the range', () => {
    const bundle = recordSimpleBundle(3);
    bundle.ticks[0].diff.entities = { created: [42], destroyed: [] };
    bundle.ticks[1].diff.entities = { created: [], destroyed: [42] };
    bundle.ticks[2].diff.entities = { created: [42], destroyed: [] };
    const viewer = new BundleViewer(bundle, { worldFactory });
    const frame = viewer.atTick(3);
    const d = frame.diffSince(0);
    expect(d.source).toBe('snapshot');
  });

  it('folded tick-diff path coalesces last-write-wins for components and removed dominates set', () => {
    const bundle = recordSimpleBundle(3);
    bundle.ticks[0].diff.components = { health: { set: [[1, { hp: 100 }]], removed: [] } };
    bundle.ticks[1].diff.components = { health: { set: [[1, { hp: 50 }]], removed: [] } };
    bundle.ticks[2].diff.components = { health: { set: [], removed: [1] } };
    const viewer = new BundleViewer(bundle);
    const frame = viewer.atTick(3);
    const d = frame.diffSince(0);
    expect(d.source).toBe('tick-diffs');
    expect(d.diff.components.health?.set).toEqual([]);
    expect(d.diff.components.health?.removed).toEqual([1]);
  });

  it('folded tick-diff path: state coalescing — set wins over later, removed dominates', () => {
    const bundle = recordSimpleBundle(3);
    bundle.ticks[0].diff.state = { set: { score: 10, mode: 'play' }, removed: [] };
    bundle.ticks[1].diff.state = { set: { score: 20 }, removed: ['mode'] };
    bundle.ticks[2].diff.state = { set: { score: 30 }, removed: [] };
    const viewer = new BundleViewer(bundle);
    const frame = viewer.atTick(3);
    const d = frame.diffSince(0);
    expect(d.source).toBe('tick-diffs');
    expect(d.diff.state.set.score).toBe(30);
    expect(d.diff.state.removed).toContain('mode');
    expect(d.diff.state.set).not.toHaveProperty('mode');
  });
});
