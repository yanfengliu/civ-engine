import { describe, expect, it } from 'vitest';
import {
  BundleIntegrityError,
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
  type SessionBundle,
  type WorldConfig,
  type WorldSnapshot,
} from '../src/index.js';
import { BundleViewer } from '../src/bundle-viewer.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 8, gridHeight: 8, tps: 60 });

type Events = Record<string, never>;
interface Cmds { spawn: { n: number } }

function registerAll(w: World<Events, Cmds>): void {
  w.registerComponent<{ x: number; y: number }>('position');
  w.registerComponent<{ hp: number }>('health');
  w.registerResource('wood');
  w.registerHandler('spawn', () => undefined);
  w.registerValidator('spawn', () => true);
  w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
  w.registerSystem({ name: 'beta', phase: 'update', execute: () => undefined });
  w.onDestroy(() => undefined);
}

function recordBundle(): SessionBundle<Events, Cmds> {
  const world = new World<Events, Cmds>(mkConfig());
  registerAll(world);
  const rec = new SessionRecorder({ world, sink: new MemorySink() });
  rec.connect();
  world.submit('spawn', { n: 1 });
  world.step();
  world.step();
  rec.disconnect();
  return rec.toBundle() as unknown as SessionBundle<Events, Cmds>;
}

const faithfulFactory = (snap: WorldSnapshot): World<Events, Cmds> => {
  const w = new World<Events, Cmds>(mkConfig());
  registerAll(w);
  w.applySnapshot(snap);
  return w;
};

function expectMismatch(
  fn: () => unknown,
): Record<string, unknown> {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BundleIntegrityError);
    const details = (error as BundleIntegrityError).details as Record<string, unknown>;
    expect(details.code).toBe('registration_mismatch');
    expect((error as Error).message).toContain('skipRegistrationCheck');
    return details;
  }
  throw new Error('expected registration_mismatch');
}

describe('registration verification', () => {
  it('faithful factory round-trips clean: openAt + selfCheck + forkAt + viewer', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, { worldFactory: faithfulFactory });
    expect(() => replayer.openAt(bundle.metadata.endTick)).not.toThrow();
    expect(replayer.selfCheck().stateDivergences).toEqual([]);
    expect(() => replayer.forkAt(1)).not.toThrow();
    const viewer = new BundleViewer(bundle, { worldFactory: faithfulFactory });
    expect(() => viewer.atTick(bundle.metadata.endTick).state()).not.toThrow();
  });

  it('missing system → registration_mismatch with names + order arrays', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>(mkConfig());
        w.registerComponent('position');
        w.registerComponent('health');
        w.registerResource('wood');
        w.registerHandler('spawn', () => undefined);
        w.registerValidator('spawn', () => true);
        w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
        w.onDestroy(() => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    const details = expectMismatch(() => replayer.openAt(bundle.metadata.endTick));
    expect(details.missingSystems).toEqual(['beta']);
    expect(details.recordedSystemOrder).toEqual(['alpha', 'beta']);
    expect(details.actualSystemOrder).toEqual(['alpha']);
  });

  it('reordered systems + detail drift are reported per index', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>(mkConfig());
        w.registerComponent('position');
        w.registerComponent('health');
        w.registerResource('wood');
        w.registerHandler('spawn', () => undefined);
        w.registerValidator('spawn', () => true);
        w.registerSystem({ name: 'beta', phase: 'update', execute: () => undefined });
        w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
        w.onDestroy(() => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    const details = expectMismatch(() => replayer.openAt(bundle.metadata.endTick));
    expect(details.recordedSystemOrder).toEqual(['alpha', 'beta']);
    expect(details.actualSystemOrder).toEqual(['beta', 'alpha']);
    expect((details.systemDetailMismatches as unknown[]).length).toBeGreaterThan(0);
  });

  it('missing handler / validator count / destroy-callback count drift are flagged', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>(mkConfig());
        w.registerComponent('position');
        w.registerComponent('health');
        w.registerResource('wood');
        w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
        w.registerSystem({ name: 'beta', phase: 'update', execute: () => undefined });
        w.applySnapshot(snap);
        return w;
      },
    });
    const details = expectMismatch(() => replayer.openAt(bundle.metadata.endTick));
    expect(details.missingHandlers).toEqual(['spawn']);
    expect(details.validatorCountMismatches).toEqual([{ key: 'spawn', recorded: 1, actual: 0 }]);
    expect(details.destroyCallbackCountMismatch).toEqual({ recorded: 1, actual: 0 });
  });

  it('snapshot-healed categories replay clean; genuinely extra component is flagged', () => {
    const bundle = recordBundle();
    // Missing component + missing resource: healed by applySnapshot — clean.
    const healedReplayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>(mkConfig());
        w.registerComponent('position');
        // no 'health', no 'wood'
        w.registerHandler('spawn', () => undefined);
        w.registerValidator('spawn', () => true);
        w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
        w.registerSystem({ name: 'beta', phase: 'update', execute: () => undefined });
        w.onDestroy(() => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(() => healedReplayer.openAt(bundle.metadata.endTick)).not.toThrow();
    // Extra component (in neither manifest nor snapshot): flagged.
    const extraReplayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>(mkConfig());
        registerAll(w);
        w.registerComponent('mana');
        w.applySnapshot(snap);
        return w;
      },
    });
    const details = expectMismatch(() => extraReplayer.openAt(bundle.metadata.endTick));
    expect(details.extraComponents).toEqual(['mana']);
  });

  it('positionKey drift is asserted against the snapshot config', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>({ ...mkConfig(), positionKey: 'pos' });
        w.registerComponent('pos');
        w.registerComponent('position');
        w.registerComponent('health');
        w.registerResource('wood');
        w.registerHandler('spawn', () => undefined);
        w.registerValidator('spawn', () => true);
        w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
        w.registerSystem({ name: 'beta', phase: 'update', execute: () => undefined });
        w.onDestroy(() => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    const details = expectMismatch(() => replayer.openAt(bundle.metadata.endTick));
    expect(details.positionKeyMismatch).toEqual({ snapshot: 'position', actual: 'pos' });
  });

  it('verdict is call-order independent (selfCheck-first vs openAt-first)', () => {
    const bundle = recordBundle();
    const driftedFactory = (snap: WorldSnapshot): World<Events, Cmds> => {
      const w = new World<Events, Cmds>(mkConfig());
      w.registerComponent('position');
      w.registerComponent('health');
      w.registerResource('wood');
      w.registerHandler('spawn', () => undefined);
      w.registerValidator('spawn', () => true);
      w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
      w.onDestroy(() => undefined);
      w.applySnapshot(snap);
      return w;
    };
    const r1 = SessionReplayer.fromBundle(bundle, { worldFactory: driftedFactory });
    const d1 = expectMismatch(() => r1.selfCheck());
    const r2 = SessionReplayer.fromBundle(bundle, { worldFactory: driftedFactory });
    const d2 = expectMismatch(() => r2.openAt(bundle.metadata.endTick));
    expect(d1.missingSystems).toEqual(d2.missingSystems);
  });

  it('skipRegistrationCheck bypasses on replayer and viewer; absent field skips', () => {
    const bundle = recordBundle();
    const driftedFactory = (snap: WorldSnapshot): World<Events, Cmds> => {
      const w = new World<Events, Cmds>(mkConfig());
      registerAll(w);
      w.registerSystem({ name: 'observer', phase: 'output', execute: () => undefined });
      w.applySnapshot(snap);
      return w;
    };
    // Without skip: extra system → throws.
    const strict = SessionReplayer.fromBundle(bundle, { worldFactory: driftedFactory });
    expectMismatch(() => strict.openAt(bundle.metadata.endTick));
    // With skip: instrumented replay allowed.
    const skipped = SessionReplayer.fromBundle(bundle, {
      worldFactory: driftedFactory,
      skipRegistrationCheck: true,
    });
    expect(() => skipped.openAt(bundle.metadata.endTick)).not.toThrow();
    // Viewer forwards the flag.
    const strictViewer = new BundleViewer(bundle, { worldFactory: driftedFactory });
    expect(() => strictViewer.atTick(bundle.metadata.endTick).state()).toThrow(BundleIntegrityError);
    const skippedViewer = new BundleViewer(bundle, {
      worldFactory: driftedFactory,
      skipRegistrationCheck: true,
    });
    expect(() => skippedViewer.atTick(bundle.metadata.endTick).state()).not.toThrow();
    // Old bundles (no field) never check.
    const legacy = recordBundle();
    delete legacy.metadata.registration;
    const legacyReplayer = SessionReplayer.fromBundle(legacy, { worldFactory: driftedFactory });
    expect(() => legacyReplayer.openAt(legacy.metadata.endTick)).not.toThrow();
  });
});

describe('fork bundles inherit the factory manifest', () => {
  it('forked bundle metadata carries the fork recorder connect-time manifest', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, { worldFactory: faithfulFactory });
    const fork = replayer.forkAt(1).run({ untilTick: 2 });
    expect(fork.bundle.metadata.registration).toBeDefined();
    expect(fork.bundle.metadata.registration!.systems.map((s) => s.name)).toEqual(['alpha', 'beta']);
  });
});

describe('impl-review-1 coverage additions', () => {
  it('duplicate-name length drift is caught via ordered name arrays (Codex HIGH)', () => {
    const world = new World<Events, Cmds>(mkConfig());
    registerAll(world);
    world.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined }); // duplicate, legal
    const rec = new SessionRecorder({ world, sink: new MemorySink() });
    rec.connect();
    world.submit('spawn', { n: 1 });
    world.step();
    rec.disconnect();
    const bundle = rec.toBundle() as unknown as SessionBundle<Events, Cmds>;
    const replayer = SessionReplayer.fromBundle(bundle, { worldFactory: faithfulFactory }); // only one 'alpha'
    const details = expectMismatch(() => replayer.openAt(bundle.metadata.endTick));
    expect(details.recordedSystemOrder).toEqual(['alpha', 'beta', 'alpha']);
    expect(details.actualSystemOrder).toEqual(['alpha', 'beta']);
    expect(details.missingSystems).toEqual([]); // sets are blind here — order arrays carry the evidence
  });

  it('system detail drift (interval change) is reported per field', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>(mkConfig());
        w.registerComponent('position');
        w.registerComponent('health');
        w.registerResource('wood');
        w.registerHandler('spawn', () => undefined);
        w.registerValidator('spawn', () => true);
        w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
        w.registerSystem({ name: 'beta', phase: 'update', interval: 4, execute: () => undefined });
        w.onDestroy(() => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    const details = expectMismatch(() => replayer.openAt(bundle.metadata.endTick));
    expect(details.systemDetailMismatches).toContainEqual({
      index: 1, name: 'beta', field: 'interval', recorded: 1, actual: 4,
    });
  });

  it('extra handler + extra validator are reported', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds & { nuke: Record<string, never> }>(mkConfig());
        registerAll(w as unknown as World<Events, Cmds>);
        w.registerHandler('nuke', () => undefined);
        w.registerValidator('nuke', () => true);
        w.applySnapshot(snap);
        return w as unknown as World<Events, Cmds>;
      },
    });
    const details = expectMismatch(() => replayer.openAt(bundle.metadata.endTick));
    expect(details.extraHandlers).toEqual(['nuke']);
    expect(details.validatorCountMismatches).toContainEqual({ key: 'nuke', recorded: 0, actual: 1 });
  });

  it('extra-system details are populated (not just thrown)', () => {
    const bundle = recordBundle();
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>(mkConfig());
        registerAll(w);
        w.registerSystem({ name: 'observer', phase: 'output', execute: () => undefined });
        w.applySnapshot(snap);
        return w;
      },
    });
    const details = expectMismatch(() => replayer.openAt(bundle.metadata.endTick));
    expect(details.extraSystems).toEqual(['observer']);
  });

  it('the check fires before any replay stepping (no handler invocations)', () => {
    const bundle = recordBundle();
    const invocations: number[] = [];
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Cmds>(mkConfig());
        w.registerComponent('position');
        w.registerComponent('health');
        w.registerResource('wood');
        w.registerHandler('spawn', (data) => { invocations.push(data.n); });
        w.registerValidator('spawn', () => true);
        w.registerSystem({ name: 'alpha', phase: 'update', execute: () => undefined });
        // 'beta' missing -> mismatch must fire before openAt(1) replays tick 1
        w.onDestroy(() => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    expectMismatch(() => replayer.openAt(1));
    expect(invocations).toEqual([]);
  });
});
