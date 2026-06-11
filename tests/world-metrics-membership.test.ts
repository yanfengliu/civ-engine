import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';

// benchmark-gate DESIGN v2 §1: query-cache membership maintenance gets an
// exact operation counter so the churn wall is tier-1-gateable instead of
// hiding under the coarse time ratio.
describe('WorldMetrics.query.membershipChecks', () => {
  const mkWorld = () => {
    const w = new World({ gridWidth: 8, gridHeight: 8, tps: 60 });
    w.registerComponent<{ v: number }>('a');
    w.registerComponent<{ v: number }>('b');
    return w;
  };

  it('counts cache entries examined per in-tick signature change', () => {
    const world = mkWorld();
    let churned = false;
    world.registerSystem((w) => {
      // Populate two cached shapes on every tick.
      void [...w.query('a')];
      void [...w.query('a', 'b')];
      if (!churned) return;
      // Tick 2: one entity gains 'a' then 'b' (2 signature changes), a second
      // entity gains 'a' then is destroyed (2 signature changes: add + zero).
      const e1 = w.createEntity();
      w.addComponent(e1, 'a', { v: 1 });
      w.addComponent(e1, 'b', { v: 2 });
      const e2 = w.createEntity();
      w.addComponent(e2, 'a', { v: 3 });
      w.destroyEntity(e2);
    });
    world.step(); // tick 1: caches created; no churn
    churned = true;
    world.step(); // tick 2: 4 signature changes × 2 cache entries
    const metrics = world.getMetrics();
    expect(metrics).not.toBeNull();
    expect(metrics!.query.membershipChecks).toBe(8);
  });

  it('is zero when no query caches exist', () => {
    const world = mkWorld();
    world.registerSystem((w) => {
      const e = w.createEntity();
      w.addComponent(e, 'a', { v: 1 });
    });
    world.step();
    expect(world.getMetrics()!.query.membershipChecks).toBe(0);
  });

  it('survives getMetrics() defensive cloning', () => {
    const world = mkWorld();
    world.registerSystem((w) => {
      void [...w.query('a')];
      const e = w.createEntity();
      w.addComponent(e, 'a', { v: 1 });
    });
    world.step();
    world.step();
    const m = world.getMetrics()!;
    m.query.membershipChecks = 999;
    expect(world.getMetrics()!.query.membershipChecks).not.toBe(999);
  });
});
