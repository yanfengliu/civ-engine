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

    expect(snapshot.version).toBe(3);
    expect(snapshot.config).toEqual({ gridWidth: 16, gridHeight: 16, tps: 30, positionKey: 'position' });
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
    if (snapshot.version !== 3) throw new Error('Expected version 3 snapshot');
    expect(snapshot.resources).toEqual({
      registered: [],
      pools: {},
      production: {},
      consumption: {},
      transfers: [],
      nextTransferId: 0,
    });
    expect(snapshot.rng.state).toEqual(expect.any(Number));
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

  it('loads version 1 snapshots for backward compatibility', () => {
    const snapshot = {
      version: 1 as const,
      config: { gridWidth: 10, gridHeight: 10, tps: 60 },
      tick: 0,
      entities: { generations: [0], alive: [true], freeList: [] },
      components: { health: [[0, { hp: 10 }]] as Array<[number, unknown]> },
    };

    const restored = World.deserialize(snapshot);
    expect(restored.isAlive(0)).toBe(true);
    expect(restored.getComponent(0, 'health')).toEqual({ hp: 10 });
  });

  it('round-trips resources and remains JSON-safe', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerResource('food');
    world.registerResource('gold', { defaultMax: 100 });
    const a = world.createEntity();
    const b = world.createEntity();
    world.addResource(a, 'food', 50);
    world.setProduction(a, 'food', 5);
    world.setConsumption(a, 'food', 2);
    world.addResource(b, 'food', 0);
    world.addTransfer(a, b, 'food', 3);

    const restored = World.deserialize(
      JSON.parse(JSON.stringify(world.serialize())),
    );

    expect(restored.getResource(a, 'food')).toEqual({ current: 50, max: null });
    expect(restored.getProduction(a, 'food')).toBe(5);
    expect(restored.getConsumption(a, 'food')).toBe(2);
    expect(restored.getTransfers(a)).toEqual([
      { id: 0, from: a, to: b, resource: 'food', rate: 3 },
    ]);
  });

  it('round-trips deterministic random state', () => {
    const world = new World({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      seed: 1234,
      detectInPlacePositionMutations: false,
    });
    world.random();
    const snapshot = world.serialize();
    const next = world.random();

    expect(snapshot.config.seed).toBe(1234);
    expect(snapshot.config.detectInPlacePositionMutations).toBe(false);
    const restored = World.deserialize(JSON.parse(JSON.stringify(snapshot)));
    expect(restored.random()).toBe(next);
  });

  it('serialize rejects direct mutations that make components non-JSON', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ value: unknown }>('state');
    const entity = world.createEntity();
    world.addComponent(entity, 'state', { value: 1 });

    world.getComponent<{ value: unknown }>(entity, 'state')!.value = () => undefined;

    expect(() => world.serialize()).toThrow(
      "component 'state' on entity 0.value is not JSON-compatible",
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

  it('preserves dead entities and free-list across round-trip', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');

    const e0 = world.createEntity();
    world.createEntity(); // e1
    world.addComponent(e0, 'health', { hp: 100 });
    world.destroyEntity(e0);

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    expect(restored.isAlive(0)).toBe(false);
    expect(restored.isAlive(1)).toBe(true);
    // New entity should reuse recycled id 0
    const recycled = restored.createEntity();
    expect(recycled).toBe(0);
  });

  it('round-trips components with nested object data', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ items: string[]; stats: { str: number; dex: number } }>('inventory');

    const e = world.createEntity();
    world.addComponent(e, 'inventory', {
      items: ['sword', 'shield'],
      stats: { str: 10, dex: 5 },
    });

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    expect(restored.getComponent(e, 'inventory')).toEqual({
      items: ['sword', 'shield'],
      stats: { str: 10, dex: 5 },
    });
  });

  it('deserialized world can continue stepping with systems', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');

    const e = world.createEntity();
    world.addComponent(e, 'position', { x: 0, y: 0 });

    const moveRight = (w: World) => {
      for (const id of w.query('position')) {
        const pos = w.getComponent<{ x: number; y: number }>(id, 'position')!;
        pos.x += 1;
      }
    };
    world.registerSystem(moveRight);
    world.step(); // tick 1, x = 1

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot, [moveRight]);

    restored.step(); // tick 2, x = 2
    expect(restored.tick).toBe(2);
    expect(restored.getComponent(e, 'position')).toEqual({ x: 2, y: 0 });
  });

  it('deserialized world syncs spatial grid immediately', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');

    const e = world.createEntity();
    world.addComponent(e, 'position', { x: 3, y: 4 });
    world.step(); // sync grid

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    expect(restored.grid.getAt(3, 4)!.has(e)).toBe(true);
  });

  it('deserialize with no systems produces a world with empty pipeline', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 100 });

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);

    // Can step without error (no systems to run)
    restored.step();
    expect(restored.tick).toBe(1);
    expect(restored.getComponent(e, 'health')).toEqual({ hp: 100 });
  });
});
