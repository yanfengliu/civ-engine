import { EngineError, EngineRangeError } from './engine-error.js';
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
      throw new EngineError('occupancy_area_empty', 'Occupancy area must not be empty');
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
    throw new EngineError('occupancy_index_out_of_bounds', `Cell index ${index} is out of bounds`, { details: { index } });
  }
}

export function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new EngineError('occupancy_value_invalid', `${label} must be a positive integer`, { details: { label } });
  }
}

export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new EngineError('occupancy_value_invalid', `${label} must be a non-negative integer`, { details: { label } });
  }
}

export function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new EngineError('occupancy_value_invalid', `${label} must be a finite number`, { details: { label } });
  }
}

export function assertGridPoint(
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new EngineError('occupancy_coords_not_integer', 'Grid coordinates must be integers');
  }
  if (x < 0 || x >= width || y < 0 || y >= height) {
    throw new EngineRangeError('occupancy_out_of_bounds', `Grid coordinate (${x}, ${y}) is out of bounds`, { details: { x, y } });
  }
}
