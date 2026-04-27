import { describe, expect, it } from 'vitest';
import { DeterministicRandom, World, type WorldConfig } from '../src/index.js';
import {
  noopPolicy,
  randomPolicy,
  scriptedPolicy,
  type PolicyContext,
  type RandomPolicyConfig,
  type ScriptedPolicyEntry,
} from '../src/synthetic-playtest.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });

interface Cmds { spawn: { id: number } }

const mkPolicyCtx = (tick: number, seed = 42): PolicyContext<Record<string, never>, Cmds> => {
  const rng = new DeterministicRandom(seed);
  return { world: new World<Record<string, never>, Cmds>(mkConfig()), tick, random: () => rng.random() };
};

describe('noopPolicy', () => {
  it('returns empty array regardless of context', () => {
    const policy = noopPolicy<Record<string, never>, Cmds>();
    expect(policy(mkPolicyCtx(1))).toEqual([]);
    expect(policy(mkPolicyCtx(99))).toEqual([]);
  });
});

describe('scriptedPolicy', () => {
  it('emits the right entry at the right tick', () => {
    const sequence: ScriptedPolicyEntry<Cmds>[] = [
      { tick: 1, type: 'spawn', data: { id: 100 } },
      { tick: 3, type: 'spawn', data: { id: 200 } },
    ];
    const policy = scriptedPolicy<Record<string, never>, Cmds>(sequence);
    expect(policy(mkPolicyCtx(1))).toEqual([{ type: 'spawn', data: { id: 100 } }]);
    expect(policy(mkPolicyCtx(2))).toEqual([]);
    expect(policy(mkPolicyCtx(3))).toEqual([{ type: 'spawn', data: { id: 200 } }]);
    expect(policy(mkPolicyCtx(4))).toEqual([]);
  });

  it('groups multiple entries on the same tick in declaration order', () => {
    const sequence: ScriptedPolicyEntry<Cmds>[] = [
      { tick: 1, type: 'spawn', data: { id: 1 } },
      { tick: 1, type: 'spawn', data: { id: 2 } },
      { tick: 1, type: 'spawn', data: { id: 3 } },
    ];
    const policy = scriptedPolicy<Record<string, never>, Cmds>(sequence);
    expect(policy(mkPolicyCtx(1))).toEqual([
      { type: 'spawn', data: { id: 1 } },
      { type: 'spawn', data: { id: 2 } },
      { type: 'spawn', data: { id: 3 } },
    ]);
  });

  it('handles empty sequence', () => {
    const policy = scriptedPolicy<Record<string, never>, Cmds>([]);
    expect(policy(mkPolicyCtx(1))).toEqual([]);
  });
});

describe('randomPolicy', () => {
  it('seeded selection is deterministic across cross-tick sequences', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [
        () => ({ type: 'spawn', data: { id: 1 } }),
        () => ({ type: 'spawn', data: { id: 2 } }),
        () => ({ type: 'spawn', data: { id: 3 } }),
      ],
    };
    const runOnce = (seed: number) => {
      const policy = randomPolicy<Record<string, never>, Cmds>(config);
      const rng = new DeterministicRandom(seed);
      const random = () => rng.random();
      const out: unknown[] = [];
      for (let t = 1; t <= 5; t++) {
        out.push(policy({ world: new World<Record<string, never>, Cmds>(mkConfig()), tick: t, random }));
      }
      return out;
    };
    expect(runOnce(42)).toEqual(runOnce(42));
    expect(runOnce(42)).not.toEqual(runOnce(99));
  });

  it('catalog functions receive PolicyContext (can read ctx.world.tick / ctx.tick)', () => {
    let observedTick = -1;
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [
        (ctx) => {
          observedTick = ctx.tick;
          return { type: 'spawn', data: { id: ctx.tick * 10 } };
        },
      ],
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    const out = policy(mkPolicyCtx(7));
    expect(observedTick).toBe(7);
    expect(out).toEqual([{ type: 'spawn', data: { id: 70 } }]);
  });

  it('respects frequency: emits only on ticks where tick % frequency === offset', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 3,
      offset: 0,
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    expect(policy(mkPolicyCtx(0))).toHaveLength(1);
    expect(policy(mkPolicyCtx(1))).toHaveLength(0);
    expect(policy(mkPolicyCtx(2))).toHaveLength(0);
    expect(policy(mkPolicyCtx(3))).toHaveLength(1);
  });

  it('respects burst: emits N commands per fired tick', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      burst: 5,
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    expect(policy(mkPolicyCtx(1))).toHaveLength(5);
  });

  it('respects offset != 0', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 3,
      offset: 2,
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    expect(policy(mkPolicyCtx(0))).toHaveLength(0);
    expect(policy(mkPolicyCtx(1))).toHaveLength(0);
    expect(policy(mkPolicyCtx(2))).toHaveLength(1);
    expect(policy(mkPolicyCtx(5))).toHaveLength(1);
  });

  it('rejects empty catalog with RangeError', () => {
    expect(() => randomPolicy<Record<string, never>, Cmds>({ catalog: [] })).toThrow(RangeError);
  });

  it('rejects non-positive-integer frequency', () => {
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 0,
    })).toThrow(RangeError);
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 1.5,
    })).toThrow(RangeError);
  });

  it('rejects non-positive-integer burst', () => {
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      burst: 0,
    })).toThrow(RangeError);
  });

  it('rejects negative or out-of-range offset', () => {
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      offset: -1,
    })).toThrow(RangeError);
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 3,
      offset: 3,
    })).toThrow(RangeError);
  });
});
