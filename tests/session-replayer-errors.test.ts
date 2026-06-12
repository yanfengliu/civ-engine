// Replayer error-quality audit (1.0.1, owner-requested): every failure mode
// must name the ACTUAL defect with a stable code and actionable guidance —
// never a downstream symptom, never silence. The two construction guards
// pinned here were found as SILENT failures: openAt returned a tick-0 world
// for a factory that forgot applySnapshot, and accepted a poisoned,
// tick-drifted factory world without complaint.
import { describe, expect, it } from 'vitest';
import {
  BundleIntegrityError,
  ForkBuilderConflictError,
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
} from '../src/index.js';
import type { SessionBundle } from '../src/index.js';

type Cmds = { bump: { n: number } };
type B = SessionBundle<Record<string, never>, Cmds>;

function freshWorld() {
  const w = new World<Record<string, never>, Cmds>({
    gridWidth: 4, gridHeight: 4, tps: 60, strict: false,
  });
  w.registerComponent<{ v: number }>('hp');
  w.registerHandler('bump', (data, world) => {
    const e = [...world.getAliveEntities()][0] ?? world.createEntity();
    world.setComponent(e, 'hp', { v: data.n });
  });
  return w;
}

function record(): B {
  const world = freshWorld();
  const recorder = new SessionRecorder({ world: world as never, sink: new MemorySink() });
  recorder.connect();
  world.submit('bump', { n: 1 });
  world.step();
  world.step();
  recorder.disconnect();
  return recorder.toBundle() as unknown as B;
}

function expectIntegrity(fn: () => unknown, code: string): BundleIntegrityError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(BundleIntegrityError);
    const err = e as BundleIntegrityError;
    expect((err.details as { code: string }).code).toBe(code);
    expect(err.code).toBe(code); // ADR 47 read-side mirror
    return err;
  }
  throw new Error(`expected BundleIntegrityError ${code}`);
}

describe('factory contract guards (silent-failure fixes)', () => {
  it('a factory that never applies the snapshot throws factory_snapshot_not_applied (was: silent tick-0 world)', () => {
    const bundle = record();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: () => freshWorld(), // BUG: ignores the snapshot
    });
    const err = expectIntegrity(
      () => replayer.openAt(bundle.metadata.endTick),
      'factory_snapshot_not_applied',
    );
    expect(err.message).toMatch(/applySnapshot/);
    expect(err.details).toMatchObject({ worldTick: 0, snapshotTick: bundle.metadata.endTick });
  });

  it('a factory returning a poisoned world throws factory_world_poisoned (was: silently accepted)', () => {
    const bundle = record();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = freshWorld();
        w.applySnapshot(snap as never);
        w.onDiff(() => {
          throw new Error('listener boom');
        });
        w.stepWithResult(); // poisons without touching the manifest surface
        return w;
      },
    });
    const err = expectIntegrity(
      () => replayer.openAt(bundle.metadata.endTick),
      'factory_world_poisoned',
    );
    expect(err.message).toMatch(/POISONED/);
    expect((err.details as { failureCode: string }).failureCode).toBe('diff_listener_threw');
  });
});

describe('malformed-bundle guard', () => {
  it('non-bundle input throws bundle_malformed naming the missing fields (was: misleading schemaVersion error)', () => {
    const err = expectIntegrity(
      () =>
        SessionReplayer.fromBundle({ ticks: [] } as never, {
          worldFactory: () => freshWorld() as never,
        }),
      'bundle_malformed',
    );
    expect((err.details as { missing: string[] }).missing).toEqual(
      expect.arrayContaining(['schemaVersion', 'metadata', 'initialSnapshot', 'commands', 'snapshots']),
    );
  });

  it('a bundle missing only metadata is named precisely', () => {
    const bundle = record();
    const broken = { ...bundle } as Record<string, unknown>;
    delete broken.metadata;
    const err = expectIntegrity(
      () => SessionReplayer.fromBundle(broken as never, { worldFactory: () => freshWorld() as never }),
      'bundle_malformed',
    );
    expect((err.details as { missing: string[] }).missing).toEqual(['metadata']);
  });
});

describe('review hardening (iteration 2)', () => {
  it('fromBundle(null) and primitives say "not a bundle", never raw TypeError', () => {
    for (const garbage of [null, undefined, 42, 'bundle']) {
      const err = expectIntegrity(
        () => SessionReplayer.fromBundle(garbage as never, { worldFactory: () => freshWorld() as never }),
        'bundle_malformed',
      );
      expect(err.message).toMatch(/not a usable SessionBundle/);
    }
  });

  it('metadata without engineVersion is named precisely (was: raw TypeError on .split)', () => {
    const bundle = record();
    const broken = { ...bundle, metadata: { ...bundle.metadata } } as Record<string, unknown>;
    delete (broken.metadata as Record<string, unknown>).engineVersion;
    const err = expectIntegrity(
      () => SessionReplayer.fromBundle(broken as never, { worldFactory: () => freshWorld() as never }),
      'bundle_malformed',
    );
    expect((err.details as { missing: string[] }).missing).toEqual(['metadata.engineVersion']);
  });

  it('a forgetful factory is caught even at tick 0 via structural fingerprints (review C-M1)', () => {
    // Record a bundle whose tick-0 initial snapshot HAS content.
    const world = freshWorld();
    const e = world.createEntity();
    world.setComponent(e, 'hp', { v: 7 });
    world.setState('k', 1);
    const recorder = new SessionRecorder({ world: world as never, sink: new MemorySink() });
    recorder.connect();
    world.step();
    recorder.disconnect();
    const bundle = recorder.toBundle() as unknown as B;

    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: () => freshWorld(), // forgets applySnapshot; tick 0 === tick 0
    });
    const err = expectIntegrity(() => replayer.openAt(0), 'factory_snapshot_not_applied');
    expect((err.details as { fingerprint: string }).fingerprint).toBeTruthy();
  });

  it('selfCheck constructions are protected by the same guards', () => {
    const world = freshWorld();
    const e = world.createEntity();
    world.setComponent(e, 'hp', { v: 1 }); // content so fingerprints discriminate
    const recorder = new SessionRecorder({ world: world as never, sink: new MemorySink() });
    recorder.connect();
    world.submit('bump', { n: 1 }); // payload so selfCheck actually replays
    world.step();
    recorder.disconnect();
    const bundle = recorder.toBundle() as unknown as B;
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: () => freshWorld(), // forgets applySnapshot
    });
    expectIntegrity(() => replayer.selfCheck(), 'factory_snapshot_not_applied');
  });

  it('a CORRECT factory never false-positives, including on interim snapshots', () => {
    const world = freshWorld();
    const recorder = new SessionRecorder({
      world: world as never,
      sink: new MemorySink(),
      snapshotInterval: 2,
    });
    recorder.connect();
    for (let i = 0; i < 6; i++) {
      world.submit('bump', { n: i });
      world.step();
    }
    recorder.disconnect();
    const bundle = recorder.toBundle() as unknown as B;
    expect(bundle.snapshots.length).toBeGreaterThan(0); // interim snapshots exist

    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = freshWorld();
        w.applySnapshot(snap as never);
        return w;
      },
    });
    expect(() => replayer.openAt(bundle.metadata.endTick)).not.toThrow();
    expect(replayer.selfCheck().ok).toBe(true);
  });
});

describe('message actionability harmonization', () => {
  it('replay_across_failure tells the agent what TO do', () => {
    const bundle = record();
    bundle.metadata.failedTicks = [1];
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = freshWorld();
        w.applySnapshot(snap as never);
        return w;
      },
    });
    try {
      replayer.openAt(2);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as Error).message).toMatch(/openAt a tick below/);
      expect((e as Error).message).toMatch(/restorePoison/);
    }
  });

  it('forkBuilder.run untilTick validation is a coded ForkBuilderConflictError, not a bare RangeError', () => {
    const bundle = record();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = freshWorld();
        w.applySnapshot(snap as never);
        return w;
      },
    });
    const builder = replayer.forkAt(1);
    try {
      builder.run({ untilTick: 0 });
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ForkBuilderConflictError);
      expect((e as { code: string | null }).code).toBe('until_tick_invalid');
      expect((e as Error).message).toMatch(/untilTick > targetTick/);
    }
  });
});
