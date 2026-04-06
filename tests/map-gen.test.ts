import { describe, it, expect } from 'vitest';
import { createTileGrid } from '../src/map-gen.js';
import type { MapGenerator } from '../src/map-gen.js';
import type { Position } from '../src/types.js';
import { World } from '../src/world.js';

describe('createTileGrid', () => {
  it('creates width * height entities with position components', () => {
    const world = new World({ gridWidth: 4, gridHeight: 3, tps: 60 });
    world.registerComponent<Position>('position');
    const tiles = createTileGrid(world);

    expect(tiles).toHaveLength(3); // height rows
    expect(tiles[0]).toHaveLength(4); // width columns

    let count = 0;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        const id = tiles[y][x];
        expect(world.isAlive(id)).toBe(true);
        const pos = world.getComponent<Position>(id, 'position');
        expect(pos).toEqual({ x, y });
        count++;
      }
    }
    expect(count).toBe(12);
  });

  it('throws if position component is not registered', () => {
    const world = new World({ gridWidth: 4, gridHeight: 3, tps: 60 });
    expect(() => createTileGrid(world)).toThrow();
  });
});

describe('MapGenerator interface', () => {
  it('generate receives world and tiles, can add components', () => {
    const world = new World({ gridWidth: 3, gridHeight: 3, tps: 60 });
    world.registerComponent<Position>('position');
    world.registerComponent<{ type: number }>('terrain');

    const tiles = createTileGrid(world);

    const generator: MapGenerator = {
      generate(w, t) {
        for (let y = 0; y < t.length; y++) {
          for (let x = 0; x < t[y].length; x++) {
            w.addComponent(t[y][x], 'terrain', { type: x + y });
          }
        }
      },
    };

    generator.generate(world, tiles);

    const terrain = world.getComponent<{ type: number }>(tiles[1][2], 'terrain');
    expect(terrain).toEqual({ type: 3 }); // x=2, y=1
  });
});
