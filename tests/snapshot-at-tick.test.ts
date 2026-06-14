// snapshotAtTick (1.1.0 additive; mcp-server design-1 H1): pure-data state
// materialization from a bundle — initialSnapshot + folded TickDiffs, zero
// World construction, with the same failure-crossing guard diffSince
// enforces. The MCP server's state tools stand on this.
import { describe, expect, it } from 'vitest';
import {
  BundleIntegrityError,
  BundleRangeError,
  MemorySink,
  SessionRecorder,
  World,
  snapshotAtTick,
} from '../src/index.js';
import type { SessionBundle, WorldSnapshotV6 } from '../src/index.js';

type Cmds = { bump: { n: number } };
type B = SessionBundle<Record<string, never>, Cmds>;

function recordBundle(opts?: { failAtTick?: number; snapshotInterval?: number }): B {
  const world = new World<Record<string, never>, Cmds>({
    gridWidth: 4, gridHeight: 4, tps: 60, strict: false,
  });
  world.registerComponent<{ v: number }>('hp');
  const e = world.createEntity();
  world.addComponent(e, 'hp', { v: 0 });
  world.registerHandler('bump', (data, w) => {
    w.setComponent(e, 'hp', { v: data.n });
  });
  if (opts?.failAtTick !== undefined) {
    world.registerSystem({
      name: 'boom',
      execute: (w) => {
        if (w.tick + 1 === opts.failAtTick) throw new Error('planned failure');
      },
    });
  }
  const recorder = new SessionRecorder({
    world: world as never,
    sink: new MemorySink(),
    ...(opts?.snapshotInterval ? { snapshotInterval: opts.snapshotInterval } : {}),
  });
  recorder.connect();
  for (let i = 1; i <= 6; i++) {
    world.submit('bump', { n: i });
    const r = world.stepWithResult();
    if (!r.ok) break;
  }
  recorder.disconnect();
  return recorder.toBundle() as unknown as B;
}

function hpAt(snap: unknown): number {
  const s = snap as WorldSnapshotV6;
  const entries = s.components['hp'] as Array<[number, { v: number }]>;
  return entries[0][1].v;
}

describe('snapshotAtTick', () => {
  it('at startTick returns the initial snapshot state', () => {
    const bundle = recordBundle();
    const snap = snapshotAtTick(bundle, bundle.metadata.startTick);
    expect(snap.tick).toBe(bundle.metadata.startTick);
    expect(hpAt(snap)).toBe(0);
  });

  it('tolerates a legacy bundle whose endTick understates persistedEndTick', () => {
    // Pre-1.1.4 live-exported bundles shipped endTick:0 while persistedEndTick
    // stayed current. snapshotAtTick honors max(endTick, persistedEndTick) for
    // complete bundles, matching SessionReplayer.openAt, so pure-data hydration
    // of the existing corpus works. (aoe2 engine-feedback 2026-06-13.)
    const expected = snapshotAtTick(recordBundle(), 6);
    const broken = recordBundle();
    expect(broken.metadata.persistedEndTick).toBe(6);
    broken.metadata.endTick = 0;
    broken.metadata.durationTicks = 0;
    expect(() => snapshotAtTick(broken, 6)).not.toThrow();
    expect(snapshotAtTick(broken, 6)).toEqual(expected);
  });

  it('folds tick diffs to the state BEFORE stepping the requested submission tick', () => {
    const bundle = recordBundle();
    // Stepping submission-tick 0 applied bump n=1, so state-at-3 (before
    // stepping 3) has hp.v = 3 (bumps 1..3 applied by steps 0..2).
    const snap = snapshotAtTick(bundle, 3);
    expect(hpAt(snap)).toBe(3);
  });

  it('fold-from-initial agrees with a recorder-written interim snapshot at the same tick', () => {
    const bundle = recordBundle({ snapshotInterval: 2 });
    const interim = bundle.snapshots[0];
    // Strip the interim snapshots so hydration MUST fold from the initial
    // snapshot (review m1: with snapshots present, hydrating at interim.tick
    // just picks the recorded snapshot — a tautology).
    const stripped = { ...bundle, snapshots: [] } as typeof bundle;
    const hydrated = snapshotAtTick(stripped, interim.tick);
    expect(JSON.parse(JSON.stringify(hydrated))).toEqual(
      JSON.parse(JSON.stringify(interim.snapshot)),
    );
  });

  it('hydrates BELOW the first failure on failure-terminated bundles (the forensics path)', () => {
    const bundle = recordBundle({ failAtTick: 3 });
    const ft = bundle.metadata.failedTicks![0];
    const snap = snapshotAtTick(bundle, ft - 1);
    expect(snap.tick).toBe(ft - 1);
  });

  it('throws coded missing_tick_entries on a gapped (tampered) bundle body', () => {
    const bundle = recordBundle();
    const gapped = { ...bundle, ticks: bundle.ticks.filter((te) => te.tick !== 2) } as typeof bundle;
    try {
      snapshotAtTick(gapped, 3);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BundleIntegrityError);
      expect((e as BundleIntegrityError).code).toBe('missing_tick_entries');
    }
  });

  it('throws coded replay_across_failure when hydration would cross a recorded failure', () => {
    const bundle = recordBundle({ failAtTick: 3 });
    expect(bundle.metadata.failedTicks?.length).toBeTruthy();
    try {
      snapshotAtTick(bundle, bundle.metadata.failedTicks![0]);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BundleIntegrityError);
      expect((e as BundleIntegrityError).code).toBe('replay_across_failure');
    }
  });

  it('throws coded range errors outside the bundle tick range', () => {
    const bundle = recordBundle();
    for (const bad of [bundle.metadata.startTick - 1, bundle.metadata.endTick + 1]) {
      try {
        snapshotAtTick(bundle, bad);
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BundleRangeError);
      }
    }
  });

  it('rejects NaN/fractional/non-finite ticks with tick_not_integer (full-review M5)', () => {
    const bundle = recordBundle();
    for (const bad of [NaN, 2.5, Infinity, -0.5]) {
      try {
        snapshotAtTick(bundle, bad);
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BundleRangeError);
        expect((e as BundleRangeError).code).toBe('tick_not_integer');
      }
    }
  });

  it('returns a deep clone, not the live bundle snapshot reference (full-review M2)', () => {
    const bundle = recordBundle();
    // At startTick the fold returns initialSnapshot; the result must be a CLONE
    // — a caller mutating it must not corrupt the source bundle.
    const snap = snapshotAtTick(bundle, bundle.metadata.startTick);
    expect(snap).not.toBe(bundle.initialSnapshot);
    expect(snap).toEqual(bundle.initialSnapshot);
  });
});
