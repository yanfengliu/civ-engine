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

  // ----- Clause 1: route input through world.submit() from outside the tick loop -----

  it('clause 1 (clean): external mutations only via submit/handler — selfCheck passes', () => {
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('counter');
      const e = w.createEntity();
      w.setComponent(e, 'counter', { v: 0 });
    };
    // Record + replay use identical setup; no mid-loop external setComponent.
    const { bundle } = recordWith(setup, 3);
    const result = replayWith(bundle, setup);
    expect(result.ok).toBe(true);
  });

  it('clause 1 (violation): external setComponent between ticks (during recording) — replay state diverges', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerComponent('counter');
    world.registerHandler('tick', () => undefined);
    const e = world.createEntity();
    world.setComponent(e, 'counter', { v: 0 });

    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    world.submit('tick', {});
    world.step();
    // VIOLATION: external mutation between ticks (not via submit/handler).
    // The mutation is captured in the snapshot at end of recording, but
    // not in the bundle.commands stream. Replay reconstructs initial,
    // re-runs commands, and produces state without this mutation —
    // diverges from terminal snapshot.
    world.setComponent(e, 'counter', { v: 999 });
    world.submit('tick', {});
    world.step();
    rec.disconnect();
    const bundle = rec.toBundle() as unknown as Bundle;

    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        w.registerComponent('counter');
        w.registerHandler('tick', () => undefined);
        w.applySnapshot(snap);
        return w;
      },
    });
    const checkResult = replayer.selfCheck();
    expect(checkResult.ok).toBe(false);
    expect(checkResult.stateDivergences.length).toBeGreaterThan(0);
  });

  // ----- Clause 2: no mid-tick submit() from systems / handlers / listeners -----

  it('clause 2 (clean): systems do not submit — selfCheck passes', () => {
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('count');
      w.registerSystem({
        name: 'counter', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          lw.setComponent(id, 'count', { v: lw.tick });
        },
      });
    };
    const { bundle } = recordWith(setup, 3);
    const result = replayWith(bundle, setup);
    expect(result.ok).toBe(true);
  });

  it('clause 2 (violation): system calls world.submit() mid-tick — replay diverges', () => {
    // The mid-tick submission is captured by the recorder's wrap. On replay,
    // the replayer feeds bundle.commands at each submissionTick, AND the
    // system runs again and submits its follow-up. Result: replay processes
    // the follow-up command twice; state and execution streams diverge.
    // Note: setup registers `tick-counter` component and a system that
    // submits 'tick' mid-step on tick=1. recordWith's `tick` handler is a
    // no-op, so the bonus submission only inflates the command stream
    // count — the side effect is the doubled submission count itself.
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('submit-counter');
      const e = w.createEntity();
      w.setComponent(e, 'submit-counter', { v: 0 });
      w.registerSystem({
        name: 'mid-tick-submitter', phase: 'update',
        execute: (lw) => {
          if (lw.tick === 1) {
            // VIOLATION: system submits another command from inside step().
            // Recording's wrap captures this submission. On replay, the
            // replayer pre-feeds the captured submission at the appropriate
            // tick AND the system runs again and submits — double-submit.
            lw.submit('tick', {});
          }
          // Increment counter on the entity to give selfCheck something
          // observable to compare. Each tick increments by 1 + (number of
          // queued commands processed this step).
          for (const id of lw.query('submit-counter')) {
            const cur = lw.getComponent<{ v: number }>(id, 'submit-counter');
            lw.setComponent(id, 'submit-counter', { v: (cur?.v ?? 0) + 1 });
          }
        },
      });
    };
    const { bundle } = recordWith(setup, 4);
    const result = replayWith(bundle, setup);
    // The double-submit on replay means the bundle's recorded commands
    // include the mid-tick one, AND the system re-submits it during
    // replay's step(). Outcome: replay processes the command twice (once
    // from bundle.commands feed, once from the system) — execution stream
    // count differs from recording's. Manifests as executionDivergences.
    expect(result.ok).toBe(false);
    expect(result.stateDivergences + result.executionDivergences).toBeGreaterThan(0);
  });

  // ----- Clause 4: validators must be pure (no side effects) -----

  it.todo('clause 4: impure validators with side effects — selfCheck reports divergence (test requires fixture for stateful side effect that diverges across record/replay; deferred)');

  // ----- Clause 6: iterate ordered collections only (no unordered Set driving simulation) -----

  it.todo('clause 6: unordered Set drives simulation state — selfCheck divergence (test fixture requires construction of a Set whose iteration order differs between record and replay; hard to engineer without crossing into other clauses; deferred)');

  // ----- Clause 7: no environment-driven branching inside ticks -----

  it('clause 7 (clean): system branches on world.state — selfCheck passes', () => {
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('branched');
      w.setState('mode', 'A');
      w.registerSystem({
        name: 'branch-sys', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          const mode = lw.getState('mode');
          lw.setComponent(id, 'branched', { mode });
        },
      });
    };
    const { bundle } = recordWith(setup, 3);
    const result = replayWith(bundle, setup);
    expect(result.ok).toBe(true);
  });

  it('clause 7 (violation): system reads process.env mid-tick — replay state diverges when env differs', () => {
    // Stub the env value during record; restore during replay (different
    // value). The system's tick output reflects the env, and the snapshot
    // captures it; replay produces different state.
    const setup = (w: World<Record<string, never>, Cmds>) => {
      w.registerComponent('env-flag');
      w.registerSystem({
        name: 'env-reader', phase: 'update',
        execute: (lw) => {
          const id = lw.createEntity();
          // VIOLATION: reading process.env from inside a tick.
          const flag = process.env.SESSION_RECORDING_TEST_FLAG ?? 'default';
          lw.setComponent(id, 'env-flag', { flag });
        },
      });
    };

    const previous = process.env.SESSION_RECORDING_TEST_FLAG;
    try {
      process.env.SESSION_RECORDING_TEST_FLAG = 'recording';
      const { bundle } = recordWith(setup, 2);
      // Flip the env to a different value for replay
      process.env.SESSION_RECORDING_TEST_FLAG = 'replay';
      const result = replayWith(bundle, setup);
      expect(result.ok).toBe(false);
      expect(result.stateDivergences).toBeGreaterThan(0);
    } finally {
      if (previous === undefined) delete process.env.SESSION_RECORDING_TEST_FLAG;
      else process.env.SESSION_RECORDING_TEST_FLAG = previous;
    }
  });
});
