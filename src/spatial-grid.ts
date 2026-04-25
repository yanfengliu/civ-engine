import type { EntityId } from './types.js';

export const ORTHOGONAL: ReadonlyArray<[number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

export const DIAGONAL: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

export const ALL_DIRECTIONS: ReadonlyArray<[number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

export interface SpatialGridView {
  readonly width: number;
  readonly height: number;
  getAt(x: number, y: number): ReadonlySet<EntityId> | null;
  getNeighbors(
    x: number,
    y: number,
    offsets?: ReadonlyArray<[number, number]>,
  ): EntityId[];
  getInRadius(
    cx: number,
    cy: number,
    radius: number,
    metric?: 'euclidean' | 'manhattan',
  ): EntityId[];
}

export class SpatialGrid {
  readonly width: number;
  readonly height: number;
  private cells = new Map<number, Set<EntityId>>();

  constructor(width: number, height: number) {
    assertPositiveInteger(width, 'width');
    assertPositiveInteger(height, 'height');
    this.width = width;
    this.height = height;
  }

  insert(entity: EntityId, x: number, y: number): void {
    const key = this.key(x, y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Set();
      this.cells.set(key, cell);
    }
    cell.add(entity);
  }

  remove(entity: EntityId, x: number, y: number): void {
    const key = this.key(x, y);
    const cell = this.cells.get(key);
    if (!cell) return;
    cell.delete(entity);
    if (cell.size === 0) {
      this.cells.delete(key);
    }
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
    return this.cells.get(this.key(x, y)) ?? null;
  }

  getNeighbors(
    x: number,
    y: number,
    offsets: ReadonlyArray<[number, number]> = ORTHOGONAL,
  ): EntityId[] {
    this.assertBounds(x, y);
    const result: EntityId[] = [];
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        const cell = this.cells.get(this.uncheckedKey(nx, ny));
        if (cell) {
          for (const entity of cell) {
            result.push(entity);
          }
        }
      }
    }
    return result;
  }

  getInRadius(
    cx: number,
    cy: number,
    radius: number,
    metric: 'euclidean' | 'manhattan' = 'euclidean',
  ): EntityId[] {
    this.assertBounds(cx, cy);
    if (!Number.isFinite(radius) || radius < 0) {
      throw new RangeError(`Radius ${radius} is invalid`);
    }
    const r = Math.ceil(radius);
    const minX = Math.max(0, cx - r);
    const maxX = Math.min(this.width - 1, cx + r);
    const minY = Math.max(0, cy - r);
    const maxY = Math.min(this.height - 1, cy + r);
    const radiusSq = radius * radius;
    const result: EntityId[] = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const inRange =
          metric === 'manhattan'
            ? Math.abs(dx) + Math.abs(dy) <= radius
            : dx * dx + dy * dy <= radiusSq;
        if (!inRange) continue;
        const cell = this.cells.get(this.uncheckedKey(x, y));
        if (cell) {
          for (const entity of cell) {
            result.push(entity);
          }
        }
      }
    }
    return result;
  }

  assertBounds(x: number, y: number): void {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new RangeError(`Position (${x}, ${y}) must use integer coordinates`);
    }
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError(`Position (${x}, ${y}) is out of bounds`);
    }
  }

  private key(x: number, y: number): number {
    this.assertBounds(x, y);
    return this.uncheckedKey(x, y);
  }

  private uncheckedKey(x: number, y: number): number {
    return y * this.width + x;
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`Grid ${label} must be a positive integer`);
  }
}
