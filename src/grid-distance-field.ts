import { EngineError, EngineRangeError } from './engine-error.js';
import { ALL_DIRECTIONS, ORTHOGONAL } from './spatial-grid.js';
import type { GridPathConfig } from './path-service.js';
import type { Position } from './types.js';

/** Stable, synchronous grid geometry and edge costs, matching GridPathConfig. */
export type GridDistanceFieldOptions = Pick<GridPathConfig,
  'width' | 'height' | 'occupancy' | 'movingEntity' | 'includeReservations'
  | 'allowDiagonal' | 'preventCornerCutting' | 'blocked' | 'cost' | 'maxCost'>;

export interface GridDistanceFieldResult {
  width: number;
  height: number;
  /** Row-major costs FROM each cell TO its nearest destination; Infinity if unreachable. */
  distances: Float64Array;
  /** Original destination input index, earliest on equal cost; -1 if unreachable. */
  sourceIndices: Int32Array;
}

interface Entry { cell: number; distance: number; source: number }
function before(a: Entry, b: Entry): boolean {
  return a.distance < b.distance || (a.distance === b.distance
    && (a.source < b.source || (a.source === b.source && a.cell < b.cell)));
}
function push(heap: Entry[], entry: Entry): void {
  let i = heap.length;
  heap.push(entry);
  while (i > 0) {
    const parent = (i - 1) >>> 1;
    if (!before(entry, heap[parent])) break;
    heap[i] = heap[parent];
    i = parent;
  }
  heap[i] = entry;
}
function pop(heap: Entry[]): Entry {
  const first = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    let i = 0;
    while (i * 2 + 1 < heap.length) {
      let child = i * 2 + 1;
      if (child + 1 < heap.length && before(heap[child + 1], heap[child])) child++;
      if (!before(heap[child], last)) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = last;
  }
  return first;
}

/**
 * Compute a complete multi-source field. Directed edges are relaxed backwards:
 * cost(from, to) always means travel from a queried cell towards a destination.
 * Inputs/callbacks must remain stable during this synchronous call. Returned
 * arrays are caller-owned; no cache or mutable input references are retained.
 */
export function gridDistanceField(
  sources: readonly Position[], options: GridDistanceFieldOptions,
): GridDistanceFieldResult {
  const width = options.width ?? options.occupancy?.width;
  const height = options.height ?? options.occupancy?.height;
  if (width === undefined || height === undefined) {
    throw new EngineError('path_config_missing_grid', 'Grid distance fields require width/height or an occupancy grid');
  }
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new EngineError('path_value_invalid', 'Grid dimensions must be positive safe integers');
  }
  const size = width * height;
  if (!Number.isSafeInteger(size) || size > 0xffff_ffff || sources.length > 0x7fff_ffff) {
    throw new EngineRangeError('distance_field_size_invalid', 'Grid or destination count exceeds the field index range');
  }
  const rawMaxCost = options.maxCost;
  const maxCost = rawMaxCost === undefined ? Infinity : rawMaxCost;
  if (typeof maxCost !== 'number' || Number.isNaN(maxCost) || maxCost < 0) {
    throw new EngineError('distance_field_cost_invalid', 'maxCost must be nonnegative or Infinity');
  }
  const seeds = sources.map((source, index) => {
    const { x, y } = source;
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new EngineError('path_coords_not_integer', 'Destination position must use integer coordinates', { details: { index } });
    }
    if (x < 0 || x >= width || y < 0 || y >= height) {
      throw new EngineRangeError('path_out_of_bounds', 'Destination position is out of bounds', { details: { index, x, y } });
    }
    return y * width + x;
  });
  const result: GridDistanceFieldResult = {
    width, height,
    distances: new Float64Array(size).fill(Infinity),
    sourceIndices: new Int32Array(size).fill(-1),
  };
  if (seeds.length === 0) return result;
  const blocked = new Uint8Array(size);
  const query = { ignoreEntity: options.movingEntity, includeReservations: options.includeReservations ?? true };
  for (let cell = 0; cell < size; cell++) {
    const x = cell % width;
    const y = Math.floor(cell / width);
    blocked[cell] = options.occupancy?.isBlocked(x, y, query) || options.blocked?.(x, y) ? 1 : 0;
  }
  const { distances, sourceIndices } = result;
  if (!options.cost && !options.allowDiagonal) {
    const queue = new Uint32Array(size);
    let head = 0;
    let tail = 0;
    seeds.forEach((cell, source) => {
      if (blocked[cell] || distances[cell] === 0) return;
      distances[cell] = 0;
      sourceIndices[cell] = source;
      queue[tail++] = cell;
    });
    while (head < tail) {
      const cell = queue[head++];
      const x = cell % width;
      const y = Math.floor(cell / width);
      const distance = distances[cell] + 1;
      if (distance > maxCost) continue;
      for (const [dx, dy] of ORTHOGONAL) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (blocked[next] || distances[next] !== Infinity) continue;
        distances[next] = distance;
        sourceIndices[next] = sourceIndices[cell];
        queue[tail++] = next;
      }
    }
    return result;
  }
  const heap: Entry[] = [];
  seeds.forEach((cell, source) => {
    if (blocked[cell] || distances[cell] === 0) return;
    distances[cell] = 0;
    sourceIndices[cell] = source;
    push(heap, { cell, distance: 0, source });
  });
  const offsets = options.allowDiagonal ? ALL_DIRECTIONS : ORTHOGONAL;
  while (heap.length > 0) {
    const current = pop(heap);
    if (current.distance !== distances[current.cell] || current.source !== sourceIndices[current.cell]) continue;
    const x = current.cell % width;
    const y = Math.floor(current.cell / width);
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const next = ny * width + nx;
      if (blocked[next]) continue;
      const diagonal = dx !== 0 && dy !== 0;
      if (diagonal && (options.preventCornerCutting ?? true)
        && (blocked[y * width + nx] || blocked[ny * width + x])) continue;
      const edge = options.cost ? options.cost({ x: nx, y: ny }, { x, y }) : diagonal ? Math.SQRT2 : 1;
      if (!Number.isFinite(edge) || edge < 0) continue;
      const distance = current.distance + edge;
      if (!Number.isFinite(distance) || distance > maxCost) continue;
      if (distance < distances[next]
        || (distance === distances[next] && current.source < sourceIndices[next])) {
        distances[next] = distance;
        sourceIndices[next] = current.source;
        push(heap, { cell: next, distance, source: current.source });
      }
    }
  }
  return result;
}
