import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';
import type { Position } from '../src/types.js';

function createWorld() {
  const world = new World({ gridWidth: 20, gridHeight: 20, tps: 60 });
  world.registerComponent<Position>('position');
  world.registerComponent<{ hp: number }>('health');
  world.registerComponent<{ label: string }>('label');
  return world;
}

function placeEntity(
  world: ReturnType<typeof createWorld>,
  x: number,
  y: number,
  components?: Record<string, unknown>,
) {
  const id = world.createEntity();
  world.setPosition(id, { x, y });
  if (components) {
    for (const [key, data] of Object.entries(components)) {
      world.addComponent(id, key, data);
    }
  }
  return id;
}

describe('queryInRadius', () => {
  it('returns entities within radius that have all listed components', () => {
    const world = createWorld();
    const a = placeEntity(world, 5, 5, { health: { hp: 100 } });
    placeEntity(world, 5, 6);
    const results = [...world.queryInRadius(5, 5, 2, 'health')];
    expect(results).toEqual([a]);
  });

  it('excludes entities missing required components', () => {
    const world = createWorld();
    placeEntity(world, 5, 5);
    placeEntity(world, 5, 6, { health: { hp: 50 } });
    const results = [...world.queryInRadius(5, 5, 0, 'health')];
    expect(results).toEqual([]);
  });

  it('excludes entities outside radius', () => {
    const world = createWorld();
    placeEntity(world, 0, 0, { health: { hp: 100 } });
    placeEntity(world, 19, 19, { health: { hp: 50 } });
    const results = [...world.queryInRadius(0, 0, 2, 'health')];
    expect(results).toHaveLength(1);
  });

  it('returns all entities in radius when no components specified', () => {
    const world = createWorld();
    const a = placeEntity(world, 5, 5);
    const b = placeEntity(world, 5, 6);
    const results = [...world.queryInRadius(5, 5, 2)];
    expect(results).toContain(a);
    expect(results).toContain(b);
  });

  it('supports multi-component filtering', () => {
    const world = createWorld();
    const a = placeEntity(world, 5, 5, { health: { hp: 100 }, label: { label: 'A' } });
    placeEntity(world, 5, 6, { health: { hp: 50 } });
    const results = [...world.queryInRadius(5, 5, 2, 'health', 'label')];
    expect(results).toEqual([a]);
  });
});

describe('findNearest', () => {
  it('returns the closest matching entity', () => {
    const world = createWorld();
    placeEntity(world, 10, 10, { health: { hp: 100 } });
    const near = placeEntity(world, 5, 6, { health: { hp: 50 } });
    const result = world.findNearest(5, 5, 'health');
    expect(result).toBe(near);
  });

  it('returns undefined on empty grid', () => {
    const world = createWorld();
    expect(world.findNearest(5, 5, 'health')).toBeUndefined();
  });

  it('skips entities missing required components', () => {
    const world = createWorld();
    placeEntity(world, 5, 5);
    const far = placeEntity(world, 8, 8, { health: { hp: 50 } });
    expect(world.findNearest(5, 5, 'health')).toBe(far);
  });

  it('returns entity at the same cell', () => {
    const world = createWorld();
    const same = placeEntity(world, 5, 5, { health: { hp: 100 } });
    expect(world.findNearest(5, 5, 'health')).toBe(same);
  });

  it('works without component constraints', () => {
    const world = createWorld();
    const a = placeEntity(world, 3, 3);
    placeEntity(world, 15, 15);
    expect(world.findNearest(3, 3)).toBe(a);
  });
});
