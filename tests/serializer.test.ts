import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('Serialization', () => {
  it('serialize produces a valid snapshot with version, config, tick, entities, and components', () => {
    const world = new World({ gridWidth: 16, gridHeight: 16, tps: 30 });
    world.registerComponent<{ x: number; y: number }>('position');
    world.registerComponent<{ hp: number }>('health');

    const e0 = world.createEntity();
    world.addComponent(e0, 'position', { x: 1, y: 2 });
    world.addComponent(e0, 'health', { hp: 100 });

    const e1 = world.createEntity();
    world.addComponent(e1, 'position', { x: 3, y: 4 });

    world.step();
    world.step();

    const snapshot = world.serialize();

    expect(snapshot.version).toBe(1);
    expect(snapshot.config).toEqual({ gridWidth: 16, gridHeight: 16, tps: 30 });
    expect(snapshot.tick).toBe(2);
    expect(snapshot.entities.alive).toEqual([true, true]);
    expect(snapshot.entities.generations).toEqual([0, 0]);
    expect(snapshot.entities.freeList).toEqual([]);
    expect(snapshot.components['position']).toEqual([
      [0, { x: 1, y: 2 }],
      [1, { x: 3, y: 4 }],
    ]);
    expect(snapshot.components['health']).toEqual([
      [0, { hp: 100 }],
    ]);
  });

  it('round-trip: serialize then deserialize preserves all state', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    world.registerComponent<{ hp: number }>('health');

    const e0 = world.createEntity();
    world.addComponent(e0, 'position', { x: 5, y: 5 });
    world.addComponent(e0, 'health', { hp: 100 });

    const e1 = world.createEntity();
    world.addComponent(e1, 'health', { hp: 50 });

    world.step();

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    expect(restored.tick).toBe(1);
    expect(restored.isAlive(e0)).toBe(true);
    expect(restored.isAlive(e1)).toBe(true);
    expect(restored.getComponent(e0, 'position')).toEqual({ x: 5, y: 5 });
    expect(restored.getComponent(e0, 'health')).toEqual({ hp: 100 });
    expect(restored.getComponent(e1, 'health')).toEqual({ hp: 50 });
    expect(restored.getComponent(e1, 'position')).toBeUndefined();
  });

  it('deserialize throws on unsupported version', () => {
    const bad = {
      version: 99,
      config: { gridWidth: 10, gridHeight: 10, tps: 60 },
      tick: 0,
      entities: { generations: [], alive: [], freeList: [] },
      components: {},
    };
    expect(() => World.deserialize(bad as never)).toThrow(
      'Unsupported snapshot version: 99',
    );
  });

  it('deserialize throws on entity state array length mismatch', () => {
    const bad = {
      version: 1 as const,
      config: { gridWidth: 10, gridHeight: 10, tps: 60 },
      tick: 0,
      entities: { generations: [0, 0], alive: [true], freeList: [] },
      components: {},
    };
    expect(() => World.deserialize(bad)).toThrow(
      'Invalid entity state: array length mismatch',
    );
  });
});
