import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';
import type { WorldConfig } from '../src/types.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10,
  gridHeight: 10,
  tps: 60,
  positionKey: 'position',
});

describe('World.applySnapshot', () => {
  it('overwrites entity/component state in-place; preserves handler registrations', () => {
    interface Cmds { spawn: { x: number; y: number } }
    const w1 = new World<Record<string, never>, Cmds>(mkConfig());
    w1.registerComponent('position');
    const id = w1.createEntity();
    w1.setComponent(id, 'position', { x: 3, y: 4 });

    const w2 = new World<Record<string, never>, Cmds>(mkConfig());
    w2.registerComponent('position');
    let handlerCalls = 0;
    w2.registerHandler('spawn', () => { handlerCalls++; });
    expect(w2.hasCommandHandler('spawn')).toBe(true);

    const snap = w1.serialize();
    w2.applySnapshot(snap);

    // State copied
    expect(w2.getComponent(id, 'position')).toEqual({ x: 3, y: 4 });
    // Registration preserved
    expect(w2.hasCommandHandler('spawn')).toBe(true);
    // Handler still works
    w2.submit('spawn', { x: 1, y: 1 });
    w2.step();
    expect(handlerCalls).toBe(1);
  });

  it('replaces tick from snapshot', () => {
    const w1 = new World(mkConfig());
    w1.step(); w1.step(); w1.step();
    expect(w1.tick).toBe(3);

    const w2 = new World(mkConfig());
    expect(w2.tick).toBe(0);
    w2.applySnapshot(w1.serialize());
    expect(w2.tick).toBe(3);
  });

  it('overwrites entity manager: dead entities in old world become absent', () => {
    const w1 = new World(mkConfig());
    w1.registerComponent('position');
    const id = w1.createEntity();
    w1.setComponent(id, 'position', { x: 5, y: 5 });

    const w2 = new World(mkConfig());
    w2.registerComponent('position');
    const orphan = w2.createEntity();
    w2.setComponent(orphan, 'position', { x: 9, y: 9 });
    expect(w2.isAlive(orphan)).toBe(true);

    w2.applySnapshot(w1.serialize());
    // Orphan from w2's pre-applySnapshot state is gone (id 0 is now w1's id)
    expect(w2.getComponent(id, 'position')).toEqual({ x: 5, y: 5 });
    // Orphan id was 0; w1's id is also 0; the data is now w1's
    // (Verification: w2 only has 1 entity and its position is from w1)
    expect(w2.getComponent(id, 'position')).not.toEqual({ x: 9, y: 9 });
  });

  it('preserves systems registered before applySnapshot', () => {
    const w1 = new World(mkConfig());
    w1.step();

    const w2 = new World(mkConfig());
    let systemCalls = 0;
    w2.registerSystem({ name: 'counter', phase: 'update', execute: () => { systemCalls++; } });
    w2.step();
    expect(systemCalls).toBe(1);

    w2.applySnapshot(w1.serialize());
    // System still registered after applySnapshot
    w2.step();
    expect(systemCalls).toBe(2);
  });

  it('isCurrent works correctly after applySnapshot (id+generation matching)', () => {
    const w1 = new World(mkConfig());
    const id1 = w1.createEntity();
    w1.destroyEntity(id1);
    const recycled = w1.createEntity();
    expect(w1.isCurrent({ id: recycled, generation: 1 })).toBe(true);

    const w2 = new World(mkConfig());
    w2.applySnapshot(w1.serialize());
    expect(w2.isCurrent({ id: recycled, generation: 1 })).toBe(true);
    expect(w2.isCurrent({ id: recycled, generation: 0 })).toBe(false);
  });

  it('clears cached diff/metrics from prior ticks', () => {
    const w1 = new World(mkConfig());
    w1.step();
    const w2 = new World(mkConfig());
    w2.step();
    expect(w2.getDiff()).not.toBeNull();
    w2.applySnapshot(w1.serialize());
    // Cached diff cleared; getDiff returns null until next step
    expect(w2.getDiff()).toBeNull();
  });
});

describe('event buffer across applySnapshot (full-review 2026-06-10 L2)', () => {
  it('getEvents() is empty after an in-place applySnapshot', () => {
    type Events = { ping: { n: number } };
    const mk = () => {
      const w = new World<Events>({ gridWidth: 8, gridHeight: 8, tps: 60 });
      w.registerSystem((lw) => { lw.emit('ping', { n: lw.tick }); });
      return w;
    };
    const world = mk();
    world.step();
    expect(world.getEvents().length).toBe(1);
    const snapshot = new World<Events>({ gridWidth: 8, gridHeight: 8, tps: 60 }).serialize();
    world.applySnapshot(snapshot);
    expect(world.getEvents()).toEqual([]);
  });
});

describe('cross-registration in-place apply (pre-1.0 full review F1)', () => {
  it('a registered store absent from the snapshot keeps its REGISTRATION but not its DATA', () => {
    const source = new World({ gridWidth: 4, gridHeight: 4, tps: 60 });
    source.registerComponent<{ v: number }>('shared');
    const s0 = source.createEntity();
    source.addComponent(s0, 'shared', { v: 1 });
    const snapshot = source.serialize();

    const target = new World({ gridWidth: 4, gridHeight: 4, tps: 60 });
    target.registerComponent<{ v: number }>('shared');
    target.registerComponent<{ hp: number }>('extra'); // not in snapshot
    const t0 = target.createEntity();
    target.addComponent(t0, 'extra', { hp: 9 });

    target.applySnapshot(snapshot);

    // Registration survives (the documented merge contract)...
    expect(() => [...target.query('extra')]).not.toThrow();
    // ...but the old timeline's data must NOT leak onto recycled ids.
    expect(target.getComponent(0, 'extra')).toBeUndefined();
    expect([...target.query('extra')]).toEqual([]);
    // And the world must round-trip its own snapshot (no ghost dead-entity
    // entries exported by serialize).
    const roundTrip = target.serialize();
    expect(() => World.deserialize(roundTrip)).not.toThrow();
  });
});
