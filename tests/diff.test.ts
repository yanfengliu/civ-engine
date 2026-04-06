import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('State Diff', () => {
  it('getDiff returns null before any tick', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.getDiff()).toBeNull();
  });

  it('getDiff returns component set changes after step', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.step(); // tick 0: dirty cleared at tick start

    world.registerSystem((w) => {
      w.addComponent(id, 'health', { hp: 50 });
    });
    world.step(); // tick 1: system adds health

    const diff = world.getDiff()!;
    expect(diff.tick).toBe(2);
    expect(diff.components['health'].set).toEqual([[id, { hp: 50 }]]);
  });

  it('getDiff returns entity created and destroyed', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');

    let createdId: number | undefined;
    world.registerSystem((w) => {
      if (w.tick === 0) {
        createdId = w.createEntity();
      }
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.entities.created).toEqual([createdId]);
  });

  it('empty tick produces empty diff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.step();
    const diff = world.getDiff()!;
    expect(diff.entities.created).toEqual([]);
    expect(diff.entities.destroyed).toEqual([]);
    expect(diff.components).toEqual({});
  });

  it('entity created and destroyed in same tick appears in both', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerSystem((w) => {
      if (w.tick === 0) {
        const id = w.createEntity();
        w.destroyEntity(id);
      }
    });
    world.step();
    const diff = world.getDiff()!;
    expect(diff.entities.created).toContain(0);
    expect(diff.entities.destroyed).toContain(0);
  });

  it('component set then removed in same tick appears only in removed', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.step(); // clear pre-tick dirty

    world.registerSystem((w) => {
      if (w.tick === 1) {
        w.addComponent(e, 'health', { hp: 100 });
        w.removeComponent(e, 'health');
      }
    });
    world.step(); // tick 1

    const diff = world.getDiff()!;
    expect(diff.components['health'].set).toEqual([]);
    expect(diff.components['health'].removed).toEqual([e]);
  });
});
