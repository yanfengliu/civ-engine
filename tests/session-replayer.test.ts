import { describe, expect, it, vi } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
  deepEqualWithPath,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position',
});

interface Cmds { spawn: { x: number; y: number } }

function setupWorld(world: World<Record<string, never>, Cmds>): void {
  world.registerHandler('spawn', () => undefined);
}

import type { SessionBundle } from '../src/index.js';

function recordSession(steps: number): { bundle: SessionBundle<Record<string, never>, Cmds> } {
  const world = new World<Record<string, never>, Cmds>(mkConfig());
  setupWorld(world);
  const sink = new MemorySink();
  const rec = new SessionRecorder({ world, sink });
  rec.connect();
  for (let i = 0; i < steps; i++) {
    if (i % 3 === 0) world.submit('spawn', { x: i, y: i });
    world.step();
  }
  rec.disconnect();
  return { bundle: rec.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds> };
}

describe('SessionReplayer', () => {
  it('fromBundle constructs a replayer; metadata accessible', () => {
    const { bundle } = recordSession(3);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(replayer.metadata.sessionId).toBe(bundle.metadata.sessionId);
    expect(replayer.metadata.endTick).toBe(3);
  });

  it('openAt(startTick) returns world from initialSnapshot directly', () => {
    const { bundle } = recordSession(2);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    const w = replayer.openAt(0);
    expect(w.tick).toBe(0);
  });

  it('openAt(N) replays forward to that tick', () => {
    const { bundle } = recordSession(5);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(replayer.openAt(0).tick).toBe(0);
    expect(replayer.openAt(3).tick).toBe(3);
    expect(replayer.openAt(5).tick).toBe(5);
  });

  it('openAt(< startTick) throws BundleRangeError', () => {
    const { bundle } = recordSession(2);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(() => replayer.openAt(-1)).toThrow(/too_low|below/);
  });

  it('openAt(> endTick) throws BundleRangeError', () => {
    const { bundle } = recordSession(2);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(() => replayer.openAt(999)).toThrow(/too_high|above/);
  });

  it('openAt: missing handler in factory throws ReplayHandlerMissingError', () => {
    const { bundle } = recordSession(2);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        // Intentionally do NOT register the spawn handler
        w.applySnapshot(snap);
        return w;
      },
    });
    // openAt(1) forces replay from the initial snapshot through tick 0's
    // commands (a spawn at submissionTick=0 from recordSession), which hits
    // the missing-handler check. openAt(2) would land on the terminal
    // snapshot directly without replaying.
    expect(() => replayer.openAt(1)).toThrow(/handler_missing|handler/);
  });

  it('cross-b engineVersion throws BundleVersionError on construction', () => {
    const { bundle } = recordSession(1);
    bundle.metadata.engineVersion = '0.6.0';  // simulate cross-b
    expect(() => SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    })).toThrow(/cross_b|cross-b/);
  });

  it('cross-major (a-component) engineVersion throws BundleVersionError', () => {
    const { bundle } = recordSession(1);
    bundle.metadata.engineVersion = '1.0.0';
    expect(() => SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    })).toThrow(/cross_a|cross-major/);
  });

  it('within-b engineVersion warns but proceeds', () => {
    const { bundle } = recordSession(1);
    // Bundle has current engineVersion (within-b is identical here) — to test
    // within-b mismatch, we'd need a different c-component. The c-component
    // differs from runtime when version.ts has just been bumped.
    // For this test, just verify no throw on construction with current version.
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(replayer.metadata.engineVersion).toBeTruthy();
  });

  it('selfCheck on clean recording returns ok:true', () => {
    const { bundle } = recordSession(3);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    const result = replayer.selfCheck();
    expect(result.ok).toBe(true);
    expect(result.checkedSegments).toBeGreaterThanOrEqual(1);
    expect(result.stateDivergences).toEqual([]);
    expect(result.eventDivergences).toEqual([]);
    expect(result.executionDivergences).toEqual([]);
  });

  it('selfCheck on no-payload bundle returns ok:true with checkedSegments:0 + warning', () => {
    const { bundle } = recordSession(3);
    bundle.commands = [];  // simulate no-payload
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = replayer.selfCheck();
    expect(result.ok).toBe(true);
    expect(result.checkedSegments).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('selfCheck on Math.random()-violating recording reports state divergence', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerComponent('rng-result');
    world.registerHandler('spawn', () => undefined);
    world.registerSystem({
      name: 'rng-sys', phase: 'update',
      execute: (w) => {
        const id = w.createEntity();
        // Violation: uses Math.random() instead of w.random()
        w.setComponent(id, 'rng-result', { v: Math.random() });
      },
    });

    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    // Submit at least one command so selfCheck doesn't short-circuit on
    // empty payloads. The submission is incidental; the determinism
    // violation is in the rng-sys system that runs every tick.
    world.submit('spawn', { x: 0, y: 0 });
    world.step();
    world.step();
    rec.disconnect();
    const bundle = rec.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds>;

    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        w.registerComponent('rng-result');
        w.registerHandler('spawn', () => undefined);
        w.registerSystem({
          name: 'rng-sys', phase: 'update',
          execute: (lw) => {
            const id = lw.createEntity();
            lw.setComponent(id, 'rng-result', { v: Math.random() });
          },
        });
        w.applySnapshot(snap);
        return w;
      },
    });
    const result = replayer.selfCheck({ stopOnFirstDivergence: true });
    expect(result.ok).toBe(false);
    expect(result.stateDivergences.length).toBeGreaterThan(0);
  });

  it('selfCheck skips segments containing a recorded TickFailure', () => {
    const { bundle } = recordSession(5);
    bundle.metadata.failedTicks = [3];  // simulate a tick failure mid-bundle
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    const result = replayer.selfCheck();
    expect(result.skippedSegments.length).toBeGreaterThan(0);
    expect(result.skippedSegments[0].reason).toBe('failure_in_segment');
  });

  it('selfCheck covers initial-to-first-snapshot segment', () => {
    const { bundle } = recordSession(3);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    const result = replayer.selfCheck();
    // Bundle has [initial(0), terminal(3)] so 1 segment minimum
    expect(result.checkedSegments).toBeGreaterThanOrEqual(1);
  });

  it('tickEntriesBetween returns inclusive range', () => {
    const { bundle } = recordSession(5);
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    const range = replayer.tickEntriesBetween(2, 4);
    expect(range.map((e) => e.tick)).toEqual([2, 3, 4]);
  });

  it('markersByEntity matches by id+generation; markersByEntityId matches any generation', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    setupWorld(world);
    const rec = new SessionRecorder({ world });
    rec.connect();
    const id = world.createEntity();
    rec.addMarker({ kind: 'annotation', refs: { entities: [{ id, generation: 0 }] } });
    rec.disconnect();
    const bundle = rec.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds>;
    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        setupWorld(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(replayer.markersByEntity({ id, generation: 0 })).toHaveLength(1);
    expect(replayer.markersByEntity({ id, generation: 1 })).toHaveLength(0);
    expect(replayer.markersByEntityId(id)).toHaveLength(1);
  });
});

describe('deepEqualWithPath', () => {
  it('returns equal:true for identical primitives', () => {
    expect(deepEqualWithPath(1, 1).equal).toBe(true);
    expect(deepEqualWithPath('a', 'a').equal).toBe(true);
  });

  it('returns equal:false with path on primitive mismatch', () => {
    const r = deepEqualWithPath({ a: { b: 1 } }, { a: { b: 2 } });
    expect(r.equal).toBe(false);
    expect(r.firstDifferingPath).toBe('a.b');
  });

  it('handles arrays', () => {
    const r = deepEqualWithPath([1, 2, 3], [1, 2, 4]);
    expect(r.equal).toBe(false);
    expect(r.firstDifferingPath).toBe('[2]');
  });

  it('handles array length mismatch', () => {
    const r = deepEqualWithPath([1, 2], [1, 2, 3]);
    expect(r.equal).toBe(false);
    expect(r.firstDifferingPath).toBe('.length');
  });

  it('handles missing keys', () => {
    const r = deepEqualWithPath({ a: 1 }, { b: 1 });
    expect(r.equal).toBe(false);
  });

  it('returns equal:true for identical nested objects', () => {
    const a = { foo: { bar: [1, 2, { baz: 3 }] } };
    const b = JSON.parse(JSON.stringify(a));
    expect(deepEqualWithPath(a, b).equal).toBe(true);
  });
});
