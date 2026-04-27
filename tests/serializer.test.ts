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

    expect(snapshot.version).toBe(5);
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
    if (snapshot.version !== 5) throw new Error('Expected version 5 snapshot');
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

  it('snapshot preserves maxTicksPerFrame and instrumentationProfile (H6)', () => {
    const world = new World({
      gridWidth: 4,
      gridHeight: 4,
      tps: 60,
      maxTicksPerFrame: 8,
      instrumentationProfile: 'release',
    });
    const snapshot = world.serialize();
    expect(snapshot.config.maxTicksPerFrame).toBe(8);
    expect(snapshot.config.instrumentationProfile).toBe('release');

    const restored = World.deserialize(snapshot);
    expect(restored.getInstrumentationProfile()).toBe('release');
  });

  it('snapshot preserves per-component diffMode (H7)', () => {
    const world = new World({ gridWidth: 4, gridHeight: 4, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position', { diffMode: 'semantic' });
    world.registerComponent<{ hp: number }>('health'); // strict (default)
    const e = world.createEntity();
    world.addComponent(e, 'position', { x: 1, y: 2 });
    world.addComponent(e, 'health', { hp: 10 });
    world.step();

    const snapshot = world.serialize();
    if (snapshot.version !== 5) throw new Error('Expected v5');
    expect(snapshot.componentOptions?.position).toEqual({ diffMode: 'semantic' });
    // strict (default) options either omitted or explicitly strict; both acceptable
    const healthOpts = snapshot.componentOptions?.health;
    if (healthOpts !== undefined) {
      expect(healthOpts.diffMode ?? 'strict').toBe('strict');
    }

    const restored = World.deserialize(snapshot);
    // Round-trip: identical rewrite should be suppressed in semantic mode
    restored.setComponent(e, 'position', { x: 1, y: 2 });
    restored.step();
    const diff = restored.getDiff()!;
    expect(diff.components.position?.set ?? []).toEqual([]);
  });

  it('EntityManager.fromState rejects mismatched array lengths (L8)', async () => {
    const { EntityManager } = await import('../src/entity-manager.js');
    expect(() =>
      EntityManager.fromState({
        generations: [0, 0],
        alive: [true],
        freeList: [],
      }),
    ).toThrow();
  });

  it('EntityManager.fromState rejects freeList ids that point to alive entities (L8)', async () => {
    const { EntityManager } = await import('../src/entity-manager.js');
    expect(() =>
      EntityManager.fromState({
        generations: [0, 0],
        alive: [true, true],
        freeList: [0],
      }),
    ).toThrow();
  });

  it('ResourceStore.fromState rejects duplicate transfer ids (M6)', async () => {
    const { ResourceStore } = await import('../src/resource-store.js');
    expect(() =>
      ResourceStore.fromState({
        registered: [['food', { defaultMax: null }]],
        pools: {},
        production: {},
        consumption: {},
        transfers: [
          { id: 0, from: 0, to: 1, resource: 'food', rate: 1 },
          { id: 0, from: 2, to: 3, resource: 'food', rate: 1 },
        ],
        nextTransferId: 1,
      }),
    ).toThrow();
  });

  it('ResourceStore.fromState normalizes nextTransferId above existing transfer ids (M6)', async () => {
    const { ResourceStore } = await import('../src/resource-store.js');
    const store = ResourceStore.fromState({
      registered: [['food', { defaultMax: null }]],
      pools: {},
      production: {},
      consumption: {},
      transfers: [
        { id: 5, from: 0, to: 1, resource: 'food', rate: 1 },
      ],
      nextTransferId: 1,
    });
    const id = store.addTransfer(0, 1, 'food', 1);
    expect(id).toBeGreaterThan(5);
  });

  it('ResourceStore.fromState clamps pool.current to pool.max (M6)', async () => {
    const { ResourceStore } = await import('../src/resource-store.js');
    const store = ResourceStore.fromState({
      registered: [['gold', { defaultMax: 100 }]],
      pools: {
        gold: [[0, { current: 999, max: 100 }]],
      },
      production: {},
      consumption: {},
      transfers: [],
      nextTransferId: 0,
    });
    expect(store.getResource(0, 'gold')).toEqual({ current: 100, max: 100 });
  });

  it('VisibilityMap.getState returns up-to-date data without explicit update() (M5)', async () => {
    const { VisibilityMap } = await import('../src/visibility-map.js');
    const map = new VisibilityMap(8, 8);
    map.setSource(1, 'src1', { x: 4, y: 4, radius: 2 });
    const state = map.getState();
    const player = state.players.find(([id]) => id === 1);
    expect(player).toBeDefined();
    // explored cells should reflect the new source position even without explicit update
    const explored = (player![1] as { explored: number[] }).explored;
    expect(explored.length).toBeGreaterThan(0);
  });

  it('deserialize rejects non-integer entity-id keys in tags/metadata (L9)', () => {
    const bad = {
      version: 5 as const,
      config: { gridWidth: 10, gridHeight: 10, tps: 60 },
      tick: 0,
      entities: { generations: [], alive: [], freeList: [] },
      components: {},
      componentOptions: {},
      resources: {
        registered: [],
        pools: {},
        production: {},
        consumption: {},
        transfers: [],
        nextTransferId: 0,
      },
      rng: { state: 1 },
      state: {},
      tags: { abc: ['nope'] } as unknown as Record<number, string[]>,
      metadata: {},
    };
    expect(() => World.deserialize(bad as never)).toThrow();
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
    });
    world.random();
    const snapshot = world.serialize();
    const next = world.random();

    expect(snapshot.config.seed).toBe(1234);
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
      /generations\.length must equal alive\.length/,
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

  describe('snapshot isolation', () => {
    it('mutating a returned snapshot does not affect live world state', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent<{ x: number; y: number }>('position');
      const e = world.createEntity();
      world.addComponent(e, 'position', { x: 1, y: 2 });
      world.setState('terrain', { biome: 'grass' });

      const snapshot = world.serialize();
      if (snapshot.version !== 5) throw new Error('Expected version 5');

      const positionEntries = snapshot.components['position'];
      const [, posData] = positionEntries[0] as [number, { x: number; y: number }];
      posData.x = 999;
      (snapshot.state['terrain'] as { biome: string }).biome = 'lava';

      expect(world.getComponent(e, 'position')).toEqual({ x: 1, y: 2 });
      expect(world.getState('terrain')).toEqual({ biome: 'grass' });
    });

    it('mutating snapshot input does not affect deserialized world state', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent<{ x: number; y: number }>('position');
      const e = world.createEntity();
      world.addComponent(e, 'position', { x: 1, y: 2 });
      world.setState('terrain', { biome: 'grass' });

      const snapshot = world.serialize();
      const restored = World.deserialize(snapshot);

      if (snapshot.version !== 5) throw new Error('Expected version 5');
      const positionEntries = snapshot.components['position'];
      const [, posData] = positionEntries[0] as [number, { x: number; y: number }];
      posData.x = 999;
      (snapshot.state['terrain'] as { biome: string }).biome = 'lava';

      expect(restored.getComponent(e, 'position')).toEqual({ x: 1, y: 2 });
      expect(restored.getState('terrain')).toEqual({ biome: 'grass' });
    });
  });

  describe('deserialize rejects malformed snapshots', () => {
    it('throws when tags reference a dead entity', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const a = world.createEntity();
      const b = world.createEntity();
      world.addTag(a, 'live');
      world.addTag(b, 'dies');
      world.destroyEntity(b);

      const snapshot = world.serialize();
      if (snapshot.version !== 5) throw new Error('Expected version 5');
      // Manually corrupt: tag a dead entity id
      const deadId = b;
      snapshot.tags[deadId] = ['ghost'];

      expect(() => World.deserialize(snapshot)).toThrow(/references dead entity/);
    });

    it('throws when metadata references a dead entity', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const a = world.createEntity();
      world.setMeta(a, 'level', 1);

      const snapshot = world.serialize();
      if (snapshot.version !== 5) throw new Error('Expected version 5');
      // Manually corrupt: meta on a non-existent entity id
      snapshot.metadata[999] = { level: 99 };

      expect(() => World.deserialize(snapshot)).toThrow(/references dead entity/);
    });

    it('throws when tick is NaN (M2)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.step();
      const snapshot = world.serialize();
      (snapshot as { tick: number }).tick = NaN;
      expect(() => World.deserialize(snapshot)).toThrow(
        /tick must be a non-negative safe integer/,
      );
    });

    it('throws when tick is negative (M2)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const snapshot = world.serialize();
      (snapshot as { tick: number }).tick = -1;
      expect(() => World.deserialize(snapshot)).toThrow(
        /tick must be a non-negative safe integer/,
      );
    });

    it('throws when tick is fractional (M2)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const snapshot = world.serialize();
      (snapshot as { tick: number }).tick = 3.14;
      expect(() => World.deserialize(snapshot)).toThrow(
        /tick must be a non-negative safe integer/,
      );
    });

    it('throws when tick is Infinity (M2)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const snapshot = world.serialize();
      (snapshot as { tick: number }).tick = Infinity;
      expect(() => World.deserialize(snapshot)).toThrow(
        /tick must be a non-negative safe integer/,
      );
    });

    it('throws when tick is MAX_SAFE_INTEGER + 1 (L_NEW7)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const snapshot = world.serialize();
      (snapshot as { tick: number }).tick = Number.MAX_SAFE_INTEGER + 1;
      expect(() => World.deserialize(snapshot)).toThrow(
        /tick must be a non-negative safe integer/,
      );
    });
  });

  describe('deserialize tolerates legacy snapshot fields', () => {
    it('silently ignores config.detectInPlacePositionMutations on read', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent<{ hp: number }>('health');
      const e = world.createEntity();
      world.addComponent(e, 'health', { hp: 50 });

      const snapshot = world.serialize();
      // Inject the legacy field a v0.4.x snapshot would carry
      (snapshot.config as { detectInPlacePositionMutations?: boolean }).detectInPlacePositionMutations = false;

      const restored = World.deserialize(snapshot);
      expect(restored.getComponent(e, 'health')).toEqual({ hp: 50 });
    });

    it('silently ignores componentOptions[*].detectInPlaceMutations on read', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent<{ hp: number }>('health');
      const e = world.createEntity();
      world.addComponent(e, 'health', { hp: 50 });

      const snapshot = world.serialize();
      if (snapshot.version !== 5) throw new Error('Expected version 5');
      const opts = snapshot.componentOptions ?? {};
      opts['health'] = {
        ...(opts['health'] ?? {}),
        ...({ detectInPlaceMutations: false } as Record<string, unknown>),
      };
      snapshot.componentOptions = opts;

      const restored = World.deserialize(snapshot);
      expect(restored.getComponent(e, 'health')).toEqual({ hp: 50 });
    });
  });
});
