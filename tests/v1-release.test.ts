import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';
import { applyTickDiff } from '../src/apply-tick-diff.js';
import { diffSnapshots } from '../src/snapshot-diff.js';
import type { WorldSnapshotV6 } from '../src/serializer.js';

function makeWorld(strict?: boolean) {
  const world = new World({ gridWidth: 4, gridHeight: 4, tps: 60, ...(strict === undefined ? {} : { strict }) });
  world.registerComponent<{ v: number }>('hp');
  return world;
}

describe('1.0 decision 1 — strict defaults to true', () => {
  it('new worlds are strict by default; explicit false opts out', () => {
    expect(makeWorld().isStrict()).toBe(true);
    expect(makeWorld(false).isStrict()).toBe(false);
    expect(makeWorld(true).isStrict()).toBe(true);
  });

  it('legacy snapshots (version <= 5, absent strict) deserialize as NON-strict (compatibility clause)', () => {
    const legacy = makeWorld(false).serialize();
    // Simulate a pre-1.0 snapshot: downgrade to v5 with strict absent.
    const v5 = { ...legacy, version: 5 } as Record<string, unknown>;
    const cfg = { ...(legacy.config as unknown as Record<string, unknown>) };
    delete cfg.strict;
    v5.config = cfg;
    delete v5.poisoned;
    const world = World.deserialize(v5 as never);
    expect(world.isStrict()).toBe(false);
  });

  it('v6 snapshots carry strict explicitly both ways and round-trip it', () => {
    const strictSnap = makeWorld(true).serialize();
    const looseSnap = makeWorld(false).serialize();
    expect(strictSnap.config.strict).toBe(true);
    expect(looseSnap.config.strict).toBe(false);
    expect(World.deserialize(strictSnap).isStrict()).toBe(true);
    expect(World.deserialize(looseSnap).isStrict()).toBe(false);
  });
});

describe('1.0 decision 2 — snapshot v6 carries poison state (inspection-only)', () => {
  function poison(world: ReturnType<typeof makeWorld>) {
    world.registerSystem({
      name: 'boom',
      execute: () => {
        throw new Error('tick exploded');
      },
    });
    expect(world.stepWithResult().ok).toBe(false);
    expect(world.isPoisoned()).toBe(true);
  }

  it('serialize emits version 6 with poisoned: null on healthy worlds', () => {
    const snap = makeWorld(false).serialize();
    expect(snap.version).toBe(6);
    expect((snap as WorldSnapshotV6).poisoned).toBeNull();
  });

  it('a poisoned world serializes its failure for inspection', () => {
    const world = makeWorld(false);
    poison(world);
    const snap = world.serialize() as WorldSnapshotV6;
    expect(snap.poisoned?.code).toBe('system_threw');
    expect(snap.poisoned?.error?.message).toBe('tick exploded');
  });

  it('deserialize clears poison by default; restorePoison opts in; recover() clears it', () => {
    const world = makeWorld(false);
    poison(world);
    const snap = world.serialize();

    const clean = World.deserialize(snap);
    expect(clean.isPoisoned()).toBe(false);

    const faithful = World.deserialize(snap, undefined, { restorePoison: true });
    expect(faithful.isPoisoned()).toBe(true);
    expect(faithful.getLastTickFailure()?.code).toBe('system_threw');
    faithful.recover();
    expect(faithful.isPoisoned()).toBe(false);
  });

  it('applySnapshot clears poison by default and honors restorePoison', () => {
    const world = makeWorld(false);
    poison(world);
    const snap = world.serialize();

    const target = makeWorld(false);
    target.applySnapshot(snap);
    expect(target.isPoisoned()).toBe(false);

    const target2 = makeWorld(false);
    target2.applySnapshot(snap, { restorePoison: true });
    expect(target2.isPoisoned()).toBe(true);
  });

  it('diffSnapshots accepts v5 and v6 (poison excluded from diff semantics)', () => {
    const a = makeWorld(false);
    const b = makeWorld(false);
    poison(b);
    const snapA = a.serialize();
    const snapB = b.serialize();
    const asV5 = (s: ReturnType<typeof a.serialize>) => {
      const v5 = { ...s, version: 5 } as Record<string, unknown>;
      delete v5.poisoned;
      return v5 as never;
    };
    expect(() => diffSnapshots(snapA, snapB)).not.toThrow();
    expect(() => diffSnapshots(asV5(snapA), snapB)).not.toThrow();
    const diff = diffSnapshots(snapA, snapB);
    expect(JSON.stringify(diff)).not.toContain('tick exploded');
  });

  it('applyTickDiff accepts v6 snapshots', () => {
    const world = makeWorld(false);
    const e = world.createEntity();
    world.addComponent(e, 'hp', { v: 1 });
    const before = world.serialize();
    world.registerSystem({
      name: 'bump',
      execute: (w) => (w as typeof world).setComponent(e, 'hp', { v: 2 }),
    });
    world.step();
    const diff = world.getDiff()!;
    const after = applyTickDiff(before, diff);
    expect(after.version).toBe(6);
  });
});

describe('1.0 decisions 4+5 — surface trims', () => {
  it('FORBIDDEN_PRECONDITION_METHODS and gridPathPassabilityVersion are no longer package exports', async () => {
    const mod = (await import('../src/index.js')) as Record<string, unknown>;
    expect('FORBIDDEN_PRECONDITION_METHODS' in mod).toBe(false);
    expect('gridPathPassabilityVersion' in mod).toBe(false);
  });
});
