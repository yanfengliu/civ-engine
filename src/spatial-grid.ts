import type { EntityId } from './types.js';

export class SpatialGrid {
  readonly width: number;
  readonly height: number;
  private cells: (Set<EntityId> | null)[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Array<Set<EntityId> | null>(width * height).fill(null);
  }

  insert(entity: EntityId, x: number, y: number): void {
    const idx = this.index(x, y);
    if (this.cells[idx] === null) {
      this.cells[idx] = new Set();
    }
    this.cells[idx]!.add(entity);
  }

  remove(entity: EntityId, x: number, y: number): void {
    const idx = this.index(x, y);
    this.cells[idx]?.delete(entity);
  }

  move(
    entity: EntityId,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): void {
    this.remove(entity, fromX, fromY);
    this.insert(entity, toX, toY);
  }

  getAt(x: number, y: number): ReadonlySet<EntityId> | null {
    return this.cells[this.index(x, y)];
  }

  getNeighbors(x: number, y: number): EntityId[] {
    this.assertBounds(x, y);
    const result: EntityId[] = [];
    const directions: [number, number][] = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        const cell = this.cells[ny * this.width + nx];
        if (cell) {
          for (const entity of cell) {
            result.push(entity);
          }
        }
      }
    }
    return result;
  }

  private assertBounds(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError(`Position (${x}, ${y}) is out of bounds`);
    }
  }

  private index(x: number, y: number): number {
    this.assertBounds(x, y);
    return y * this.width + x;
  }
}
