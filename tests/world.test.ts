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

  it('submit with no validators queues and returns true', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerHandler('move', () => {});
    const result = world.submit('move', { x: 1, y: 2 });
    expect(result).toBe(true);
  });

  it('submit with passing validator queues and returns true', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', (data) => data.x >= 0 && data.y >= 0);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: 1, y: 2 })).toBe(true);
  });

  it('submit with failing validator rejects and returns false', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', (data) => data.x >= 0 && data.y >= 0);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: -1, y: 2 })).toBe(false);
  });

  it('all validators must pass for submit to accept', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', () => true);
    world.registerValidator('move', () => false);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: 1, y: 2 })).toBe(false);
  });

  it('handler runs on step and receives correct data', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const received: Array<{ x: number; y: number }> = [];
    world.registerHandler('move', (data) => received.push(data));
    world.submit('move', { x: 3, y: 4 });
    world.step();
    expect(received).toEqual([{ x: 3, y: 4 }]);
  });

  it('handler can emit events and modify components', () => {
    type Events = { moved: { entityId: number } };
    type Cmds = { move: { entityId: number; x: number; y: number } };
    const world = new World<Events, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 0, y: 0 });

    world.registerHandler('move', (data, w) => {
      const pos = w.getComponent<{ x: number; y: number }>(
        data.entityId,
        'position',
      )!;
      pos.x = data.x;
      pos.y = data.y;
      w.emit('moved', { entityId: data.entityId });
    });

    world.submit('move', { entityId: id, x: 5, y: 5 });
    world.step();

    expect(world.getComponent(id, 'position')).toEqual({ x: 5, y: 5 });
    expect(world.getEvents()).toEqual([
      { type: 'moved', data: { entityId: id } },
    ]);
  });

  it('throws when registering duplicate handler', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerHandler('move', () => {});
    expect(() => world.registerHandler('move', () => {})).toThrow(
      "Handler already registered for command 'move'",
    );
  });

  it('throws when no handler registered at drain time', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.submit('move', { x: 1 });
    expect(() => world.step()).toThrow(
      "No handler registered for command 'move'",
    );
  });

  it('commands submitted by a system during tick are processed next tick', () => {
    type Cmds = { ping: { n: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const handled: number[] = [];
    world.registerHandler('ping', (data) => handled.push(data.n));

    // System submits a command during its tick
    world.registerSystem((w) => {
      if (w.tick === 0) {
        w.submit('ping', { n: 42 });
      }
    });

    world.step(); // tick 0: system submits, but drain already happened
    expect(handled).toEqual([]);

    world.step(); // tick 1: command from previous tick is processed
    expect(handled).toEqual([42]);
  });

  it('commands drain before spatial sync so handler position changes appear in grid', () => {
    type Cmds = { spawn: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerComponent<{ x: number; y: number }>('position');

    let spawnedId: number | undefined;
    world.registerHandler('spawn', (data, w) => {
      spawnedId = w.createEntity();
      w.addComponent(spawnedId, 'position', { x: data.x, y: data.y });
    });

    // System checks grid — entity should be there because spatial sync
    // runs after processCommands
    let foundInGrid = false;
    world.registerSystem((w) => {
      if (spawnedId !== undefined) {
        const cell = w.grid.getAt(3, 4);
        foundInGrid = cell !== null && cell.has(spawnedId);
      }
    });

    world.submit('spawn', { x: 3, y: 4 });
    world.step();

    expect(spawnedId).toBeDefined();
    expect(foundInGrid).toBe(true);
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
