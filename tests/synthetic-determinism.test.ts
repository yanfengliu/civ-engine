import { describe, expect, it } from 'vitest';
import {
  SessionReplayer,
  World,
  randomPolicy,
  runSynthPlaytest,
  scriptedPolicy,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });

interface Cmds { spawn: { id: number } }

const setupWorld = (): World<Record<string, never>, Cmds> => {
  const w = new World<Record<string, never>, Cmds>(mkConfig());
  w.registerHandler('spawn', () => undefined);
  w.registerComponent('rng-result');
  w.registerSystem({
    name: 'rng-system',
    phase: 'update',
    execute: (lw) => {
      const id = lw.createEntity();
      lw.setComponent(id, 'rng-result', { v: lw.random() });
    },
  });
  return w;
};

describe('synthetic-playtest determinism — selfCheck round-trip', () => {
  it('non-poisoned bundle with ticksRun>=1 passes selfCheck.ok', () => {
    const result = runSynthPlaytest({
      world: setupWorld(),
      policies: [randomPolicy<Record<string, never>, Cmds>({
        catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      })],
      maxTicks: 30,
      policySeed: 42,
    });
    expect(result.ok).toBe(true);
    expect(result.stopReason).toBe('maxTicks');
    expect(result.ticksRun).toBeGreaterThanOrEqual(1);

    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => {
        const w = setupWorld();
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(replayer.selfCheck().ok).toBe(true);
  });
});

describe('synthetic-playtest production-determinism (dual-run)', () => {
  it('same policySeed + same setup produces structurally identical bundles', () => {
    // Multi-entry catalog so randomPolicy's catalog-selection is seed-driven,
    // not just tick-driven. This exercises the harness seed path: if
    // runSynthPlaytest ignored policySeed, the two runs would still pick from
    // the same catalog by chance only.
    const opts = {
      policies: [randomPolicy<Record<string, never>, Cmds>({
        catalog: [
          (ctx) => ({ type: 'spawn' as const, data: { id: ctx.tick * 100 + 1 } }),
          (ctx) => ({ type: 'spawn' as const, data: { id: ctx.tick * 100 + 2 } }),
          (ctx) => ({ type: 'spawn' as const, data: { id: ctx.tick * 100 + 3 } }),
          (ctx) => ({ type: 'spawn' as const, data: { id: Math.floor(ctx.random() * 100) } }),
        ],
      })],
      maxTicks: 25,
      policySeed: 7,
    };
    const r1 = runSynthPlaytest({ world: setupWorld(), ...opts });
    const r2 = runSynthPlaytest({ world: setupWorld(), ...opts });

    expect(r1.bundle.commands).toEqual(r2.bundle.commands);
    expect(r1.bundle.executions).toEqual(r2.bundle.executions);

    // Tick entries: deterministic fields only (strip metrics — durationMs is performance.now()-backed).
    const stripTickMetrics = (t: typeof r1.bundle.ticks[number]) => ({
      tick: t.tick, diff: t.diff, events: t.events, debug: t.debug,
    });
    expect(r1.bundle.ticks.map(stripTickMetrics)).toEqual(r2.bundle.ticks.map(stripTickMetrics));

    expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
    expect(r1.bundle.snapshots).toEqual(r2.bundle.snapshots);
    expect(r1.bundle.failures).toEqual(r2.bundle.failures);

    const stripVolatile = (m: typeof r1.bundle.metadata) => {
      const copy = { ...m };
      delete (copy as Partial<typeof copy>).sessionId;
      delete (copy as Partial<typeof copy>).recordedAt;
      return copy;
    };
    expect(stripVolatile(r1.bundle.metadata)).toEqual(stripVolatile(r2.bundle.metadata));
  });
});

describe('synthetic-playtest sub-RNG isolation', () => {
  // Each policy emits at least one command per tick so the bundle has command payloads.
  // SessionReplayer.selfCheck (session-replayer.ts:270-276) short-circuits on no-payload
  // bundles with a console.warn — we need a non-empty bundle to drive the actual segment
  // comparison and detect (or fail to detect) RNG divergence.

  it('positive: policy using ctx.random() is replay-deterministic', () => {
    const result = runSynthPlaytest({
      world: setupWorld(),
      policies: [(ctx) => {
        const r = ctx.random();
        return [{ type: 'spawn' as const, data: { id: Math.floor(r * 1000) } }];
      }],
      maxTicks: 20,
    });
    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
    });
    expect(replayer.selfCheck().ok).toBe(true);
  });

  it('negative: policy calling world.random() directly causes selfCheck divergence', () => {
    const result = runSynthPlaytest({
      world: setupWorld(),
      policies: [(ctx) => {
        // Contract violation: perturbs world.rng between ticks. Replay won't reproduce
        // these calls (replay never invokes policies), so world.rng state at snapshots
        // diverges.
        const r = ctx.world.random();
        return [{ type: 'spawn' as const, data: { id: Math.floor(r * 1000) } }];
      }],
      maxTicks: 20,
    });
    expect(result.ok).toBe(true);
    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
    });
    const checkResult = replayer.selfCheck();
    expect(checkResult.ok).toBe(false);
    expect(checkResult.stateDivergences.length).toBeGreaterThan(0);
  });
});

describe('synthetic-playtest poisoned-bundle replay', () => {
  it('selfCheck on a stopReason="poisoned" bundle re-throws the original tick failure', () => {
    const setup = (): World<Record<string, never>, Cmds> => {
      const w = setupWorld();
      w.registerSystem({
        name: 'poison-on-3', phase: 'update',
        execute: (lw) => { if (lw.tick === 3) throw new Error('intentional-poison'); },
      });
      return w;
    };
    const result = runSynthPlaytest({
      world: setup(),
      // Emit at least one command per tick so bundle.commands is non-empty —
      // otherwise selfCheck no-payload short-circuit at session-replayer.ts:270
      // returns ok:true vacuously instead of replaying.
      policies: [(ctx) => [{ type: 'spawn' as const, data: { id: ctx.tick } }]],
      maxTicks: 10,
    });
    expect(result.stopReason).toBe('poisoned');
    expect(result.bundle.commands.length).toBeGreaterThan(0);

    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => { const w = setup(); w.applySnapshot(snap); return w; },
    });
    // selfCheck doesn't return ok:false — it re-throws while replaying the failed segment.
    expect(() => replayer.selfCheck()).toThrow();
  });
});

describe('synthetic-playtest pre-step abort', () => {
  it('policy throws on tick 1: ticksRun=0, terminal at initial tick, selfCheck vacuously ok', () => {
    const result = runSynthPlaytest({
      world: setupWorld(),
      policies: [() => { throw new Error('throw-on-first-call'); }],
      maxTicks: 10,
    });
    expect(result.stopReason).toBe('policyError');
    expect(result.ticksRun).toBe(0);

    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
    });
    // No segments to validate (initial == terminal at tick 0); selfCheck returns ok:true vacuously.
    const checkResult = replayer.selfCheck();
    expect(checkResult.ok).toBe(true);
  });
});

describe('synthetic-playtest bundle->script conversion', () => {
  it('record → +1 conversion → replay reproduces identical command stream', () => {
    // 1. Record a synthetic bundle via randomPolicy.
    const r1 = runSynthPlaytest({
      world: setupWorld(),
      policies: [randomPolicy<Record<string, never>, Cmds>({
        catalog: [
          (ctx) => ({ type: 'spawn', data: { id: ctx.tick * 10 } }),
        ],
      })],
      maxTicks: 10,
      policySeed: 99,
    });
    expect(r1.bundle.commands.length).toBeGreaterThan(0);

    // 2. Convert with the +1 formula (per design v10 §6.3).
    const sequence = r1.bundle.commands.map((cmd) => ({
      tick: cmd.submissionTick + 1,
      type: cmd.type as keyof Cmds & string,
      data: cmd.data as Cmds[keyof Cmds],
    }));

    // 3. Replay through a fresh harness with scriptedPolicy.
    const r2 = runSynthPlaytest({
      world: setupWorld(),
      policies: [scriptedPolicy<Record<string, never>, Cmds>(sequence)],
      maxTicks: 10,
    });

    // 4. Assert identical command stream (types + data + submissionTicks).
    expect(r2.bundle.commands.length).toBe(r1.bundle.commands.length);
    for (let i = 0; i < r1.bundle.commands.length; i++) {
      expect(r2.bundle.commands[i].type).toBe(r1.bundle.commands[i].type);
      expect(r2.bundle.commands[i].data).toEqual(r1.bundle.commands[i].data);
      expect(r2.bundle.commands[i].submissionTick).toBe(r1.bundle.commands[i].submissionTick);
    }
  });
});
