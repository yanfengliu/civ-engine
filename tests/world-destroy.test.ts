import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('onDestroy / offDestroy', () => {
  it('fires callback when entity is destroyed', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const destroyed: number[] = [];
    world.onDestroy((id) => destroyed.push(id));

    const e = world.createEntity();
    world.destroyEntity(e);
    expect(destroyed).toEqual([e]);
  });

  it('callback can read dying entity components', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 42 });

    let readHp: number | undefined;
    world.onDestroy((id, w) => {
      readHp = w.getComponent<{ hp: number }>(id, 'health')?.hp;
    });
    world.destroyEntity(e);
    expect(readHp).toBe(42);
  });

  it('components are removed after callbacks fire', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 100 });

    world.onDestroy(() => {});
    world.destroyEntity(e);
    expect(world.getComponent(e, 'health')).toBeUndefined();
  });

  it('callback re-entering destroyEntity for the same id does not recurse infinitely (H4)', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    let calls = 0;
    world.onDestroy((id, w) => {
      calls++;
      w.destroyEntity(id);
    });
    const e = world.createEntity();
    expect(() => world.destroyEntity(e)).not.toThrow();
    expect(calls).toBe(1);
  });

  it('does not fire for already dead entities', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const destroyed: number[] = [];
    world.onDestroy((id) => destroyed.push(id));

    const e = world.createEntity();
    world.destroyEntity(e);
    world.destroyEntity(e); // second call — should be no-op
    expect(destroyed).toEqual([e]);
  });

  it('offDestroy removes callback', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const destroyed: number[] = [];
    const callback = (id: number) => { destroyed.push(id); };
    world.onDestroy(callback);
    world.offDestroy(callback);

    const e = world.createEntity();
    world.destroyEntity(e);
    expect(destroyed).toEqual([]);
  });

  it('multiple callbacks fire in registration order', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.onDestroy(() => order.push('A'));
    world.onDestroy(() => order.push('B'));

    const e = world.createEntity();
    world.destroyEntity(e);
    expect(order).toEqual(['A', 'B']);
  });
});
