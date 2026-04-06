import type { EntityId } from './types.js';
import type { World } from './world.js';

export interface MapGenerator {
  generate(world: World, tiles: EntityId[][]): void;
}

export function createTileGrid(
  world: World,
  positionKey = 'position',
): EntityId[][] {
  // Verify position component is registered by attempting a query
  // world.query throws if the component is not registered
  const testIter = world.query(positionKey);
  testIter.next();

  const width = world.grid.width;
  const height = world.grid.height;
  const tiles: EntityId[][] = [];

  for (let y = 0; y < height; y++) {
    const row: EntityId[] = [];
    for (let x = 0; x < width; x++) {
      const id = world.createEntity();
      world.addComponent(id, positionKey, { x, y });
      row.push(id);
    }
    tiles.push(row);
  }

  return tiles;
}
