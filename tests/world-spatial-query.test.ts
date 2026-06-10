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

  it('finds entity in the diagonal corner of a small grid', () => {
    const world = new World({ gridWidth: 4, gridHeight: 4, tps: 60 });
    world.registerComponent<Position>('position');
    const corner = world.createEntity();
    world.setPosition(corner, { x: 3, y: 3 });
    expect(world.findNearest(0, 0)).toBe(corner);
  });

  it('finds diagonal entity on a non-square grid', () => {
    const world = new World({ gridWidth: 10, gridHeight: 4, tps: 60 });
    world.registerComponent<Position>('position');
    const corner = world.createEntity();
    world.setPosition(corner, { x: 9, y: 3 });
    expect(world.findNearest(0, 0)).toBe(corner);
  });
});

describe('findNearest correctness + determinism (full-review 2026-06-10 M5)', () => {
  it('matches brute force with (distance, id) ordering on a seeded layout', () => {
    const world = createWorld();
    const placed: Array<{ id: number; x: number; y: number }> = [];
    // Deterministic pseudo-random layout (LCG), no Math.random.
    let s = 12345;
    const next = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(next() * 20);
      const y = Math.floor(next() * 20);
      const id = placeEntity(world, x, y, { health: { hp: 1 } });
      placed.push({ id, x, y });
    }
    const queries: Array<[number, number]> = [[0, 0], [10, 10], [19, 19], [5, 14], [14, 3]];
    for (const [cx, cy] of queries) {
      const got = world.findNearest(cx, cy, 'health');
      let best: { id: number; d: number } | null = null;
      for (const p of placed) {
        const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
        if (!best || d < best.d || (d === best.d && p.id < best.id)) best = { id: p.id, d };
      }
      expect(got).toBe(best!.id);
    }
  });

  it('breaks exact-distance ties by lowest entity id', () => {
    const world = createWorld();
    const a = placeEntity(world, 12, 10, { health: { hp: 1 } });
    const b = placeEntity(world, 8, 10, { health: { hp: 1 } });
    // Both at distance 2 from (10,10); lower id wins regardless of scan order.
    expect(world.findNearest(10, 10, 'health')).toBe(Math.min(a, b));
  });

  it('returns undefined when no candidate exists', () => {
    const world = createWorld();
    expect(world.findNearest(10, 10, 'health')).toBeUndefined();
  });
});

describe('findNearest degenerate inputs (full-review 2026-06-10 iter-2)', () => {
  it('throws RangeError on non-integer coordinates instead of hanging', () => {
    const world = createWorld();
    placeEntity(world, 5, 5, { health: { hp: 1 } });
    expect(() => world.findNearest(Infinity, 5, 'health')).toThrow(RangeError);
    expect(() => world.findNearest(5, -Infinity, 'health')).toThrow(RangeError);
    expect(() => world.findNearest(NaN, 5, 'health')).toThrow(RangeError);
    expect(() => world.findNearest(2.5, 5, 'health')).toThrow(RangeError);
  });

  it('answers modest out-of-bounds queries', () => {
    const world = createWorld();
    const a = placeEntity(world, 0, 0, { health: { hp: 1 } });
    expect(world.findNearest(-5, 0, 'health')).toBe(a);
  });

  it('answers far out-of-bounds queries in O(grid), not O(distance²)', () => {
    const world = createWorld();
    const a = placeEntity(world, 19, 19, { health: { hp: 1 } });
    const start = performance.now();
    expect(world.findNearest(1_000_000, 1_000_000, 'health')).toBe(a);
    expect(performance.now() - start).toBeLessThan(250);
  });
});
