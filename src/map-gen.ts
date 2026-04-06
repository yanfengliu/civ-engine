import type { EntityId } from './types.js';
import type { World } from './world.js';

export interface MapGenerator {
  generate(world: World, tiles: EntityId[][]): void;
}

export function createTileGrid(world: World): EntityId[][] {
  // Verify 'position' component is registered by attempting a query
  // world.query throws if the component is not registered
  // We consume the iterator to trigger the check, then proceed
  const testIter = world.query('position');
  testIter.next();
  // If we reach here, 'position' is registered

  const width = world.grid.width;
  const height = world.grid.height;
  const tiles: EntityId[][] = [];

  for (let y = 0; y < height; y++) {
    const row: EntityId[] = [];
    for (let x = 0; x < width; x++) {
      const id = world.createEntity();
      world.addComponent(id, 'position', { x, y });
      row.push(id);
    }
    tiles.push(row);
  }

  return tiles;
}
