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

  it('registers components and round-trips data', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerComponent<{ hp: number }>('health');
    const id = world.createEntity();
    world.addComponent(id, 'health', { hp: 100 });
    expect(world.getComponent(id, 'health')).toEqual({ hp: 100 });
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

  it('runs systems in registration order on step()', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem(() => order.push('A'));
    world.registerSystem(() => order.push('B'));
    world.step();
    expect(order).toEqual(['A', 'B']);
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
});
