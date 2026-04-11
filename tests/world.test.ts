import { describe, it, expect, vi } from 'vitest';
import { World } from '../src/world.js';

describe('World', () => {
  it('creates and tracks entities', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    expect(world.isAlive(id)).toBe(true);
  });

  it('destroys entities', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.destroyEntity(id);
    expect(world.isAlive(id)).toBe(false);
  });

  it('returns generation-aware entity refs', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    const ref = world.getEntityRef(id)!;

    expect(ref).toEqual({ id, generation: 0 });
    expect(world.isCurrent(ref)).toBe(true);

    world.destroyEntity(id);
    const reused = world.createEntity();
    expect(reused).toBe(id);
    expect(world.isCurrent(ref)).toBe(false);
    expect(world.getEntityRef(999)).toBeNull();
  });

  it('registers components and round-trips data', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.addComponent(id, 'health', { hp: 100 });
    expect(world.getComponent(id, 'health')).toEqual({ hp: 100 });
  });

  it('setComponent and patchComponent update registered components', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.setComponent(id, 'health', { hp: 100 });
    world.patchComponent<{ hp: number }>(id, 'health', (hp) => {
      hp.hp -= 25;
    });
    expect(world.getComponent(id, 'health')).toEqual({ hp: 75 });
  });

  it('removes components', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.addComponent(id, 'health', { hp: 100 });
    world.removeComponent(id, 'health');
    expect(world.getComponent(id, 'health')).toBeUndefined();
  });

  it('queries entities by component keys', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    world.registerComponent<{ hp: number }>('health');

    const e1 = world.createEntity();
    world.addComponent(e1, 'position', { x: 0, y: 0 });
    world.addComponent(e1, 'health', { hp: 100 });

    const e2 = world.createEntity();
    world.addComponent(e2, 'position', { x: 1, y: 1 });

    const e3 = world.createEntity();
    world.addComponent(e3, 'health', { hp: 50 });

    const result = [...world.query('position', 'health')];
    expect(result).toEqual([e1]);
  });

  it('queries with single component key', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');

    const e1 = world.createEntity();
    world.addComponent(e1, 'health', { hp: 100 });
    const e2 = world.createEntity();
    world.addComponent(e2, 'health', { hp: 50 });
    world.createEntity(); // no health

    const result = [...world.query('health')];
    expect(result).toEqual([e1, e2]);
  });

  it('keeps cached query results current across component membership changes', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    world.registerComponent<{ hp: number }>('health');

    const e1 = world.createEntity();
    world.addComponent(e1, 'position', { x: 0, y: 0 });
    world.addComponent(e1, 'health', { hp: 100 });

    const e2 = world.createEntity();
    world.addComponent(e2, 'position', { x: 1, y: 1 });

    expect([...world.query('position', 'health')]).toEqual([e1]);

    world.addComponent(e2, 'health', { hp: 50 });
    expect([...world.query('position', 'health')]).toEqual([e1, e2]);

    world.removeComponent(e1, 'health');
    expect([...world.query('position', 'health')]).toEqual([e2]);

    world.destroyEntity(e2);
    expect([...world.query('position', 'health')]).toEqual([]);
  });

  it('runs systems in registration order on step()', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem(() => order.push('A'));
    world.registerSystem(() => order.push('B'));
    world.step();
    expect(order).toEqual(['A', 'B']);
  });

  it('runs systems by phase while preserving registration order within a phase', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];

    world.registerSystem({ phase: 'postUpdate', execute: () => order.push('post') });
    world.registerSystem(() => order.push('update-a'));
    world.registerSystem({ phase: 'preUpdate', execute: () => order.push('pre') });
    world.registerSystem(() => order.push('update-b'));
    world.registerSystem({ phase: 'input', execute: () => order.push('input') });
    world.registerSystem({ phase: 'output', execute: () => order.push('output') });

    world.step();
    expect(order).toEqual([
      'input',
      'pre',
      'update-a',
      'update-b',
      'post',
      'output',
    ]);
  });

  it('rejects unknown system phases at runtime', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        phase: 'bad-phase',
        execute: () => {},
      } as never),
    ).toThrow("Unknown system phase 'bad-phase'");
  });

  it('increments tick on step()', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.tick).toBe(0);
    world.step();
    expect(world.tick).toBe(1);
  });

  it('syncs spatial grid with position components on step()', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 5, y: 5 });
    world.step();
    const cell = world.grid.getAt(5, 5);
    expect(cell).not.toBeNull();
    expect(cell!.has(id)).toBe(true);
  });

  it('updates spatial grid when position changes between ticks', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 3, y: 3 });
    world.step();

    const pos = world.getComponent<{ x: number; y: number }>(id, 'position')!;
    pos.x = 7;
    pos.y = 7;
    world.step();

    expect(world.grid.getAt(3, 3)?.has(id) ?? false).toBe(false);
    expect(world.grid.getAt(7, 7)!.has(id)).toBe(true);
  });

  it('cleans up grid and components on destroyEntity', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 5, y: 5 });
    world.step();

    world.destroyEntity(id);
    expect(world.isAlive(id)).toBe(false);
    expect(world.getComponent(id, 'position')).toBeUndefined();
    expect(world.grid.getAt(5, 5)?.has(id) ?? false).toBe(false);
  });

  it('uses custom positionKey for spatial index sync', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'coords' });
    world.registerComponent<{ x: number; y: number }>('coords');
    const id = world.createEntity();
    world.addComponent(id, 'coords', { x: 5, y: 5 });
    world.step();
    const cell = world.grid.getAt(5, 5);
    expect(cell).not.toBeNull();
    expect(cell!.has(id)).toBe(true);
  });

  it('defaults positionKey to "position"', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.positionKey).toBe('position');
  });

  it('throws when registering duplicate component', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent('position');
    expect(() => world.registerComponent('position')).toThrow();
  });

  it('throws when adding component to unregistered key', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    expect(() => world.addComponent(id, 'nonexistent', {})).toThrow();
  });

  it('throws when writing components to dead or never-created entities', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.destroyEntity(id);

    expect(() => world.addComponent(id, 'health', { hp: 1 })).toThrow(
      'Entity 0 is not alive',
    );
    expect(() => world.removeComponent(999, 'health')).toThrow(
      'Entity 999 is not alive',
    );
  });

  it('setPosition updates the spatial grid immediately', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.setPosition(id, { x: 1, y: 1 });
    expect(world.grid.getAt(1, 1)!.has(id)).toBe(true);

    world.setPosition(id, { x: 2, y: 2 });
    expect(world.grid.getAt(1, 1)?.has(id) ?? false).toBe(false);
    expect(world.grid.getAt(2, 2)!.has(id)).toBe(true);
  });

  it('setPosition validates bounds before mutating component state', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.setPosition(id, { x: 1, y: 1 });

    expect(() => world.setPosition(id, { x: 10, y: 1 })).toThrow(RangeError);
    expect(world.getComponent(id, 'position')).toEqual({ x: 1, y: 1 });
    expect(world.grid.getAt(1, 1)!.has(id)).toBe(true);
  });

  it('can disable full-scan position mutation detection and sync explicit dirty positions', () => {
    const world = new World({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      detectInPlacePositionMutations: false,
    });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.setPosition(id, { x: 1, y: 1 });

    const pos = world.getComponent<{ x: number; y: number }>(id, 'position')!;
    pos.x = 2;
    pos.y = 2;
    world.step();

    expect(world.grid.getAt(1, 1)!.has(id)).toBe(true);
    expect(world.grid.getAt(2, 2)).toBeNull();
    expect(world.getMetrics()!.spatial.fullScans).toBe(0);

    world.markPositionDirty(id);
    expect(world.grid.getAt(1, 1)).toBeNull();
    expect(world.grid.getAt(2, 2)!.has(id)).toBe(true);
  });

  it('markPositionDirty validates the current position data', () => {
    const world = new World({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      detectInPlacePositionMutations: false,
    });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.setPosition(id, { x: 1, y: 1 });
    const pos = world.getComponent<{ x: number; y: number }>(id, 'position')!;
    pos.x = 99;

    expect(() => world.markPositionDirty(id)).toThrow(RangeError);
    expect(world.grid.getAt(1, 1)!.has(id)).toBe(true);
  });

  it('validates world config', () => {
    expect(() => new World({ gridWidth: 0, gridHeight: 10, tps: 60 })).toThrow(
      RangeError,
    );
    expect(() => new World({ gridWidth: 10, gridHeight: 10, tps: 0 })).toThrow(
      RangeError,
    );
    expect(
      () => new World({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: '' }),
    ).toThrow('positionKey must not be empty');
    expect(
      () =>
        new World({
          gridWidth: 10,
          gridHeight: 10,
          tps: 60,
          detectInPlacePositionMutations: 'yes' as never,
        }),
    ).toThrow('detectInPlacePositionMutations must be a boolean');
    expect(
      () =>
        new World({
          gridWidth: 10,
          gridHeight: 10,
          tps: 60,
          instrumentationProfile: 'debug' as never,
        }),
    ).toThrow("instrumentationProfile must be 'full', 'minimal', or 'release'");
  });

  it('removes entity from grid on destroy even if position was mutated since last sync', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 3, y: 3 });
    world.step();

    // Mutate position without stepping
    const pos = world.getComponent<{ x: number; y: number }>(id, 'position')!;
    pos.x = 9;
    pos.y = 9;

    // Destroy — should remove from grid at (3,3) where it actually lives
    world.destroyEntity(id);
    expect(world.grid.getAt(3, 3)?.has(id) ?? false).toBe(false);
  });

  it('emits events that trigger on() listeners', () => {
    const world = new World<{ damage: { amount: number } }>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const listener = vi.fn();
    world.on('damage', listener);
    world.emit('damage', { amount: 10 });
    expect(listener).toHaveBeenCalledWith({ amount: 10 });
  });

  it('system A emits, system B listener receives in same tick', () => {
    const world = new World<{ hit: { entity: number } }>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const received: Array<{ entity: number }> = [];
    world.on('hit', (e) => received.push(e));
    world.registerSystem((w) => w.emit('hit', { entity: 42 }));
    world.registerSystem(() => {
      /* system B exists to prove ordering */
    });
    world.step();
    expect(received).toEqual([{ entity: 42 }]);
  });

  it('getEvents returns events from current tick', () => {
    const world = new World<{ move: { dx: number } }>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerSystem((w) => w.emit('move', { dx: 1 }));
    world.step();
    expect(world.getEvents()).toEqual([{ type: 'move', data: { dx: 1 } }]);
  });

  it('clears events at the start of the next tick', () => {
    const world = new World<{ ping: { n: number } }>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerSystem((w) => {
      if (w.tick === 0) {
        w.emit('ping', { n: 1 });
      }
    });
    world.step();
    expect(world.getEvents()).toEqual([{ type: 'ping', data: { n: 1 } }]);
    world.step();
    expect(world.getEvents()).toEqual([]);
  });

  it('events work independently of entity lifecycle', () => {
    const world = new World<{ spawn: { id: number } }>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const listener = vi.fn();
    world.on('spawn', listener);
    const id = world.createEntity();
    world.emit('spawn', { id });
    world.destroyEntity(id);
    expect(listener).toHaveBeenCalledWith({ id });
  });

  it('setSpeed and getSpeed proxy to game loop', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.getSpeed()).toBe(1);
    world.setSpeed(3);
    expect(world.getSpeed()).toBe(3);
  });

  it('pause, resume, and isPaused proxy to game loop', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.isPaused).toBe(false);
    world.pause();
    expect(world.isPaused).toBe(true);
    world.resume();
    expect(world.isPaused).toBe(false);
  });

  it('step works while paused', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.pause();
    world.step();
    expect(world.tick).toBe(1);
  });

  it('provides deterministic random sequences from a seed', () => {
    const a = new World({ gridWidth: 10, gridHeight: 10, tps: 60, seed: 'map-42' });
    const b = new World({ gridWidth: 10, gridHeight: 10, tps: 60, seed: 'map-42' });
    const c = new World({ gridWidth: 10, gridHeight: 10, tps: 60, seed: 'map-43' });

    const seqA = [a.random(), a.random(), a.random()];
    const seqB = [b.random(), b.random(), b.random()];
    const seqC = [c.random(), c.random(), c.random()];

    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });

  it('reports per-tick metrics for systems, queries, and spatial sync', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ x: number; y: number }>('position');
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.setPosition(id, { x: 1, y: 1 });
    world.addComponent(id, 'health', { hp: 100 });
    world.registerSystem({
      name: 'HealthScan',
      phase: 'update',
      execute: (w) => {
        for (const entity of w.query('position', 'health')) {
          const pos = w.getComponent<{ x: number; y: number }>(entity, 'position')!;
          w.setPosition(entity, { x: pos.x + 1, y: pos.y });
        }
      },
    });

    world.step();
    const first = world.getMetrics()!;
    expect(first.tick).toBe(1);
    expect(first.entityCount).toBe(1);
    expect(first.componentStoreCount).toBe(2);
    expect(first.simulation.tps).toBe(60);
    expect(first.simulation.tickBudgetMs).toBeCloseTo(1000 / 60, 6);
    expect(first.commandStats).toEqual({
      pendingBeforeTick: 0,
      processed: 0,
    });
    expect(first.query).toMatchObject({
      calls: 1,
      cacheHits: 0,
      cacheMisses: 1,
      results: 1,
    });
    expect(first.spatial.fullScans).toBe(1);
    expect(first.spatial.scannedEntities).toBe(1);
    expect(first.spatial.explicitSyncs).toBe(1);
    expect(first.systems).toHaveLength(1);
    expect(first.systems[0].name).toBe('HealthScan');
    expect(first.systems[0].phase).toBe('update');
    expect(first.durationMs.total).toBeGreaterThanOrEqual(0);

    first.query.calls = 99;
    expect(world.getMetrics()!.query.calls).toBe(1);

    world.step();
    expect(world.getMetrics()!.query.cacheHits).toBe(1);
  });

  it('release instrumentation skips implicit metrics but preserves explicit stepWithResult diagnostics', () => {
    const world = new World({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'release',
    });

    expect(world.getInstrumentationProfile()).toBe('release');

    world.step();
    expect(world.getMetrics()).toBeNull();

    const result = world.stepWithResult();
    expect(result.ok).toBe(true);
    expect(world.getMetrics()).not.toBeNull();
    expect(world.getMetrics()!.tick).toBe(2);
  });

  it('minimal instrumentation keeps coarse implicit metrics and full explicit diagnostics', () => {
    const world = new World({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'minimal',
    });
    world.registerSystem({ name: 'Noop', execute: () => {} });

    expect(world.getInstrumentationProfile()).toBe('minimal');

    world.step();
    const implicit = world.getMetrics()!;
    expect(implicit.tick).toBe(1);
    expect(implicit.durationMs.total).toBeGreaterThanOrEqual(0);
    expect(implicit.durationMs.commands).toBe(0);
    expect(implicit.durationMs.systems).toBe(0);
    expect(implicit.systems).toEqual([]);

    const result = world.stepWithResult();
    expect(result.ok).toBe(true);
    const explicit = world.getMetrics()!;
    expect(explicit.tick).toBe(2);
    expect(explicit.systems).toHaveLength(1);
    expect(explicit.systems[0].name).toBe('Noop');
  });

  describe('getComponents', () => {
    it('returns all requested components as a tuple', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent<{ hp: number }>('health');
      world.registerComponent<{ x: number; y: number }>('position');
      const id = world.createEntity();
      world.addComponent(id, 'health', { hp: 100 });
      world.addComponent(id, 'position', { x: 5, y: 5 });

      const [hp, pos] = world.getComponents<[{ hp: number }, { x: number; y: number }]>(
        id, ['health', 'position']
      );
      expect(hp).toEqual({ hp: 100 });
      expect(pos).toEqual({ x: 5, y: 5 });
    });

    it('returns undefined for missing components', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent<{ hp: number }>('health');
      world.registerComponent<{ x: number; y: number }>('position');
      const id = world.createEntity();
      world.addComponent(id, 'health', { hp: 50 });

      const [hp, pos] = world.getComponents<[{ hp: number }, { x: number; y: number }]>(
        id, ['health', 'position']
      );
      expect(hp).toEqual({ hp: 50 });
      expect(pos).toBeUndefined();
    });

    it('returns all undefined for nonexistent entity', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent<{ hp: number }>('health');
      world.registerComponent<{ x: number; y: number }>('position');

      const [hp, pos] = world.getComponents<[{ hp: number }, { x: number; y: number }]>(
        999, ['health', 'position']
      );
      expect(hp).toBeUndefined();
      expect(pos).toBeUndefined();
    });

    it('works with a single key', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent<{ hp: number }>('health');
      const id = world.createEntity();
      world.addComponent(id, 'health', { hp: 75 });

      const [hp] = world.getComponents<[{ hp: number }]>(id, ['health']);
      expect(hp).toEqual({ hp: 75 });
    });
  });
});
