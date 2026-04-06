import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('Resource System', () => {
  it('registerResource and addResource/getResource round-trip', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food', { defaultMax: 100 });
    const e = world.createEntity();
    const added = world.addResource(e, 'food', 50);
    expect(added).toBe(50);
    expect(world.getResource(e, 'food')).toEqual({ current: 50, max: 100 });
  });

  it('resource rates processed after user systems', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food', { defaultMax: 1000 });
    const e = world.createEntity();
    world.addResource(e, 'food', 50);
    world.setProduction(e, 'food', 10);
    world.setConsumption(e, 'food', 3);

    let foodDuringSystem: number | undefined;
    world.registerSystem((w) => {
      foodDuringSystem = w.getResource(e, 'food')!.current;
    });

    world.step();
    expect(foodDuringSystem).toBe(50);
    expect(world.getResource(e, 'food')!.current).toBe(57);
  });

  it('addResource and removeResource return clamped values', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('gold', { defaultMax: 50 });
    const e = world.createEntity();
    world.addResource(e, 'gold', 40);
    expect(world.addResource(e, 'gold', 20)).toBe(10);
    expect(world.removeResource(e, 'gold', 100)).toBe(50);
  });

  it('destroyEntity cleans up resource state', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food');
    const e = world.createEntity();
    world.addResource(e, 'food', 50);
    world.setProduction(e, 'food', 5);
    world.destroyEntity(e);
    expect(world.getResource(e, 'food')).toBeUndefined();
  });

  it('resource changes appear in TickDiff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food');
    const e = world.createEntity();
    world.step();

    world.registerSystem((w) => {
      if (w.tick === 1) {
        w.addResource(e, 'food', 30);
      }
    });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.resources['food'].set).toEqual([[e, { current: 30, max: Infinity }]]);
  });

  it('transfer between two entities via world API', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food');
    const a = world.createEntity();
    const b = world.createEntity();
    world.addResource(a, 'food', 100);
    world.addResource(b, 'food', 0);
    world.addTransfer(a, b, 'food', 20);
    world.step();
    expect(world.getResource(a, 'food')!.current).toBe(80);
    expect(world.getResource(b, 'food')!.current).toBe(20);
  });

  it('command handler can modify resources and changes appear in diff', () => {
    type Cmds = { gather: { entity: number; amount: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerResource('food');
    const e = world.createEntity();
    world.addResource(e, 'food', 0);
    world.step();

    world.registerHandler('gather', (data, w) => {
      w.addResource(data.entity, 'food', data.amount);
    });
    world.submit('gather', { entity: e, amount: 25 });
    world.step();

    const diff = world.getDiff()!;
    expect(diff.resources['food'].set).toEqual([[e, { current: 25, max: Infinity }]]);
  });
});
