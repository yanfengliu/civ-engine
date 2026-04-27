import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position',
});

interface Cmds { tick: Record<string, never> }

/**
 * Determinism contract paired tests per spec §11.1 clauses 1-8.
 * Each clause has a clean test (no violation; selfCheck.ok === true)
 * and a violating test (selfCheck reports the expected divergence
 * category). Clause 9 (cross-`b`/cross-Node-major version compat)
 * is enforced at construction by `BundleVersionError` and is covered
 * in tests/session-replayer.test.ts, not via selfCheck.
 */

import type { SessionBundle } from '../src/index.js';
type Bundle = SessionBundle<Record<string, never>, Cmds>;

function recordWith(setup: (w: World<Record<string, never>, Cmds>) => void, steps: number): {
  bundle: Bundle;
} {
  const world = new World<Record<string, never>, Cmds>(mkConfig());
  setup(world);
  world.registerHandler('tick', () => undefined);
  const sink = new MemorySink();
  const rec = new SessionRecorder({ world, sink });
  rec.connect();
  for (let i = 0; i < steps; i++) {
    world.submit('tick', {});
    world.step();
  }
  rec.disconnect();
  return { bundle: rec.toBundle() as unknown as Bundle };
}

function replayWith(bundle: Bundle, setup: (w: World<Record<string, never>, Cmds>) => void): {
  ok: boolean;
  stateDivergences: number;
  eventDivergences: number;
  executionDivergences: number;
} {
  const replayer = SessionReplayer.fromBundle(bundle, {
    worldFactory: (snap) => {
      const w = new World<Record<string, never>, Cmds>(mkConfig());
      setup(w);
      w.registerHandler('tick', () => undefined);
      w.applySnapshot(snap);
      return w;
    },
  });
  const result = replayer.selfCheck();
  return {
    ok: result.ok,
    stateDivergences: result.stateDivergences.length,
    eventDivergences: result.eventDivergences.length,
    executionDivergences: result.executionDivergences.length,
  };
}

describe('Determinism contract — paired tests per spec §11.1', () => {
  // ----- Clause 3: route randomness through world.random() -----

  it('clause 3 (clean): system uses world.random() — selfCheck passes', () => {
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('rng-result');
      w.registerSystem({
        name: 'rng-sys', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          lw.setComponent(id, 'rng-result', { v: lw.random() });
        },
      });
    };
    const { bundle } = recordWith(setup, 3);
    const result = replayWith(bundle, setup);
    expect(result.ok).toBe(true);
  });

  it('clause 3 (violation): system uses Math.random() — selfCheck reports state divergence', () => {
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('rng-result');
      w.registerSystem({
        name: 'rng-sys', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          lw.setComponent(id, 'rng-result', { v: Math.random() });
        },
      });
    };
    const { bundle } = recordWith(setup, 3);
    const result = replayWith(bundle, setup);
    expect(result.ok).toBe(false);
    expect(result.stateDivergences).toBeGreaterThan(0);
  });

  // ----- Clause 5: no wall-clock time inside systems -----

  it('clause 5 (clean): system uses world.tick — selfCheck passes', () => {
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('time');
      w.registerSystem({
        name: 'time-sys', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          lw.setComponent(id, 'time', { t: lw.tick });
        },
      });
    };
    const { bundle } = recordWith(setup, 3);
    const result = replayWith(bundle, setup);
    expect(result.ok).toBe(true);
  });

  it('clause 5 (violation): system uses Date.now() — selfCheck reports state divergence', () => {
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('time');
      w.registerSystem({
        name: 'time-sys', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          lw.setComponent(id, 'time', { t: Date.now() });
        },
      });
    };
    const { bundle } = recordWith(setup, 3);
    // Wait a tiny bit so Date.now() values plausibly differ
    const start = Date.now(); while (Date.now() === start) { /* spin */ }
    const result = replayWith(bundle, setup);
    expect(result.ok).toBe(false);
    expect(result.stateDivergences).toBeGreaterThan(0);
  });

  // ----- Clause 8: registration order matches between record and replay -----

  it('clause 8 (clean): factory registers in same order — selfCheck passes', () => {
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('a');
      w.registerComponent('b');
      w.registerSystem({
        name: 'shared-write', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          lw.setComponent(id, 'a', { v: 1 });
          lw.setComponent(id, 'b', { v: 2 });
        },
      });
    };
    const { bundle } = recordWith(setup, 3);
    const result = replayWith(bundle, setup);
    expect(result.ok).toBe(true);
  });

  it('clause 8 (violation): factory swaps two-system order — selfCheck reports state divergence', () => {
    const setupRec = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('shared');
      w.registerSystem({
        name: 's-first', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          lw.setComponent(id, 'shared', { v: 1 });
        },
      });
      w.registerSystem({
        name: 's-second', phase: 'update',
        execute: (lw) => {
          // Last writer wins; if we register s-first first, then on each tick a fresh
          // entity gets set to 1, then to 2. Final value: 2 (per entity).
          for (const id of lw.query('shared')) {
            lw.setComponent(id, 'shared', { v: 2 });
          }
        },
      });
    };
    const setupReplay = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('shared');
      // Swap order: s-second first
      w.registerSystem({
        name: 's-second', phase: 'update',
        execute: (lw) => {
          for (const id of lw.query('shared')) {
            lw.setComponent(id, 'shared', { v: 2 });
          }
        },
      });
      w.registerSystem({
        name: 's-first', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          lw.setComponent(id, 'shared', { v: 1 });
        },
      });
    };
    const { bundle } = recordWith(setupRec, 2);
    const result = replayWith(bundle, setupReplay);
    expect(result.ok).toBe(false);
    expect(result.stateDivergences).toBeGreaterThan(0);
  });
});
