import type { OccupancyArea, OccupancyRect } from './occupancy-types.js';

export function isOccupancyRect(area: OccupancyArea): area is OccupancyRect {
  return !Array.isArray(area);
}

export function normalizeOccupancyArea(
  area: OccupancyArea,
  width: number,
  height: number,
): number[] {
  if (!isOccupancyRect(area)) {
    if (area.length === 0) {
      throw new Error('Occupancy area must not be empty');
    }
    const cells = new Set<number>();
    for (const cell of area) {
      assertGridPoint(cell.x, cell.y, width, height);
      cells.add(cell.y * width + cell.x);
    }
    return [...cells].sort((a, b) => a - b);
  }

  assertPositiveInteger(area.width, 'Footprint width');
  assertPositiveInteger(area.height, 'Footprint height');
  assertGridPoint(area.x, area.y, width, height);
  assertGridPoint(
    area.x + area.width - 1,
    area.y + area.height - 1,
    width,
    height,
  );

  const cells: number[] = [];
  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      cells.push(y * width + x);
    }
  }
  return cells;
}

export function assertCellIndex(index: number, width: number, height: number): void {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= width * height
  ) {
    throw new Error(`Cell index ${index} is out of bounds`);
  }
}

export function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

export function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

export function assertGridPoint(
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error('Grid coordinates must be integers');
  }
  if (x < 0 || x >= width || y < 0 || y >= height) {
    throw new RangeError(`Grid coordinate (${x}, ${y}) is out of bounds`);
  }
}
