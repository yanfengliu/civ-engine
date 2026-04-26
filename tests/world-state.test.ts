import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('World state store', () => {
  it('round-trips primitive values', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.setState('turnNumber', 42);
    expect(world.getState('turnNumber')).toBe(42);
    world.setState('name', 'test');
    expect(world.getState('name')).toBe('test');
  });

  it('round-trips object values', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const terrain = { biome: 'desert', moisture: 0.3 };
    world.setState('terrain', terrain);
    expect(world.getState('terrain')).toEqual({ biome: 'desert', moisture: 0.3 });
  });

  it('hasState returns true for existing keys', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.hasState('x')).toBe(false);
    world.setState('x', 1);
    expect(world.hasState('x')).toBe(true);
  });

  it('deleteState removes the key', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.setState('x', 1);
    world.deleteState('x');
    expect(world.hasState('x')).toBe(false);
    expect(world.getState('x')).toBeUndefined();
  });

  it('deleteState on missing key is a no-op', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.deleteState('missing');
    expect(world.hasState('missing')).toBe(false);
  });

  it('rejects non-JSON-compatible values', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() => world.setState('bad', () => {})).toThrow();
  });

  it('state survives serialize/deserialize', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.setState('config', { maxUnits: 50 });
    world.setState('turn', 7);
    world.step();

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);
    expect(restored.getState('config')).toEqual({ maxUnits: 50 });
    expect(restored.getState('turn')).toBe(7);
  });

  it('state changes appear in getDiff after tick', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerSystem((w) => {
      w.setState('counter', 1);
    });
    world.step();

    const diff = world.getDiff();
    expect(diff).not.toBeNull();
    expect(diff!.state.set).toEqual({ counter: 1 });
    expect(diff!.state.removed).toEqual([]);
  });

  it('state removals appear in getDiff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.setState('temp', 'value');
    world.step();

    world.registerSystem((w) => {
      w.deleteState('temp');
    });
    world.step();

    const diff = world.getDiff();
    expect(diff!.state.removed).toEqual(['temp']);
  });

  it('unchanged state does not appear in diff', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.setState('stable', 'unchanged');
    world.step();
    world.step();

    const diff = world.getDiff();
    expect(Object.keys(diff!.state.set)).toEqual([]);
    expect(diff!.state.removed).toEqual([]);
  });

  it('works with typed component registry for state keys', () => {
    type Components = { terrain: { biome: string }; turn: number };
    const world = new World<Record<string, never>, Record<string, never>, Components>({
      gridWidth: 10, gridHeight: 10, tps: 60,
    });
    world.setState('terrain', { biome: 'forest' });
    const terrain = world.getState('terrain');
    expect(terrain).toEqual({ biome: 'forest' });
  });

  it('typed registry threads through system, validator, handler, and onDestroy callbacks', () => {
    type Components = {
      health: { hp: number };
      position: { x: number; y: number };
    };
    type State = {
      kills: number;
      [key: string]: unknown;
    };
    type Cmds = { revive: { entity: number } };

    const world = new World<Record<string, never>, Cmds, Components, State>({
      gridWidth: 10, gridHeight: 10, tps: 60,
    });
    world.registerComponent<Components['health']>('health');
    world.registerComponent<Components['position']>('position');
    world.setState('kills', 0);

    let captured = 0;
    world.registerSystem((w) => {
      const kills = w.getState('kills') ?? 0;
      captured = kills;
    });
    world.registerValidator('revive', (data, w) => {
      return w.isAlive(data.entity) ? false : true;
    });
    world.registerHandler('revive', (_data, w) => {
      const cur = w.getState('kills') ?? 0;
      w.setState('kills', cur - 1);
    });
    world.onDestroy((_id, w) => {
      const cur = w.getState('kills') ?? 0;
      w.setState('kills', cur + 1);
    });

    const e = world.createEntity();
    world.addComponent(e, 'health', { hp: 100 });
    world.destroyEntity(e);
    world.step();

    expect(captured).toBe(1);
    expect(world.getState('kills')).toBe(1);
  });
});
