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

  it('onDiff callback fires each tick with correct diff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');

    const diffs: Array<{ tick: number }> = [];
    world.onDiff((diff) => diffs.push({ tick: diff.tick }));

    world.step();
    world.step();
    world.step();

    expect(diffs).toEqual([{ tick: 1 }, { tick: 2 }, { tick: 3 }]);
  });

  it('offDiff removes the callback', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const diffs: number[] = [];
    const fn = (diff: { tick: number }) => diffs.push(diff.tick);
    world.onDiff(fn);

    world.step();
    world.offDiff(fn);
    world.step();

    expect(diffs).toEqual([1]);
  });

  it('command handler mutations appear in diff', () => {
    type Cmds = { heal: { entityId: number; amount: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 50 });
    world.step(); // clear pre-tick dirty

    world.registerHandler('heal', (data, w) => {
      const hp = w.getComponent<{ hp: number }>(data.entityId, 'health')!;
      hp.hp += data.amount;
      w.addComponent(data.entityId, 'health', hp);
    });
    world.submit('heal', { entityId: e, amount: 30 });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.components['health'].set).toEqual([[e, { hp: 80 }]]);
  });

  it('component mutations require setComponent to appear in diff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 50 });
    world.step();

    world.registerSystem((w) => {
      const hp = w.getComponent<{ hp: number }>(e, 'health')!;
      w.setComponent(e, 'health', { hp: hp.hp + 5 });
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.components['health'].set).toEqual([[e, { hp: 55 }]]);
  });

  it('registerComponent with diffMode: "semantic" suppresses blind rewrites in the diff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('transform', {
      diffMode: 'semantic',
    });
    const e = world.createEntity();
    world.addComponent(e, 'transform', { x: 5, y: 5 });
    world.step();

    world.registerSystem((w) => {
      w.addComponent(e, 'transform', { x: 5, y: 5 });
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.components['transform']).toBeUndefined();
  });

  it('registerComponent without diffMode still marks identical rewrites as dirty', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('transform');
    const e = world.createEntity();
    world.addComponent(e, 'transform', { x: 5, y: 5 });
    world.step();

    world.registerSystem((w) => {
      w.addComponent(e, 'transform', { x: 5, y: 5 });
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.components['transform'].set).toEqual([[e, { x: 5, y: 5 }]]);
  });
});
