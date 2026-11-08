import { describe, expect, it } from 'vitest';
import { gridDistanceField, OccupancyGrid, type Position } from '../src/index.js';

interface Input {
  width: number;
  height: number;
  sources: Position[];
  blocked: boolean[];
  diagonal: boolean;
  corners: boolean;
  maxCost: number;
  weights?: number[];
}

// Independent forward Bellman-Ford, one start at a time. No production graph,
// directions, queue, heap, passability helper, or reverse relaxation is reused.
function oracle(input: Input): { distances: number[]; sourceIndices: number[] } {
  const { width, height, blocked, sources, diagonal, corners, weights, maxCost } = input;
  const size = width * height;
  const edges: Array<[number, number, number]> = [];
  for (let from = 0; from < size; from++) {
    for (let to = 0; to < size; to++) {
      if (blocked[from] || blocked[to]) continue;
      const fx = from % width, fy = Math.floor(from / width);
      const tx = to % width, ty = Math.floor(to / width);
      const dx = Math.abs(fx - tx), dy = Math.abs(fy - ty);
      if (dx > 1 || dy > 1 || dx + dy === 0 || (!diagonal && dx + dy !== 1)) continue;
      if (dx === 1 && dy === 1 && corners && (blocked[fy * width + tx] || blocked[ty * width + fx])) continue;
      const cost = weights ? weights[from * size + to] : dx + dy === 2 ? Math.SQRT2 : 1;
      if (Number.isFinite(cost) && cost >= 0) edges.push([from, to, cost]);
    }
  }
  const distances = Array<number>(size).fill(Infinity);
  const sourceIndices = Array<number>(size).fill(-1);
  for (let start = 0; start < size; start++) {
    if (blocked[start]) continue;
    const forward = Array<number>(size).fill(Infinity);
    forward[start] = 0;
    for (let iteration = 0; iteration < size - 1; iteration++) {
      let changed = false;
      for (const [from, to, cost] of edges) {
        const next = forward[from] + cost;
        if (next < forward[to]) { forward[to] = next; changed = true; }
      }
      if (!changed) break;
    }
    sources.forEach((source, index) => {
      const cell = source.y * width + source.x;
      const cost = forward[cell];
      if (!blocked[cell] && cost <= maxCost && cost < distances[start]) {
        distances[start] = cost;
        sourceIndices[start] = index;
      }
    });
  }
  return { distances, sourceIndices };
}

function seeded(seed: number): Input {
  let state = seed + 17;
  const random = (): number => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
  const width = 2 + seed % 4;
  const height = 2 + Math.floor(seed / 4) % 4;
  const size = width * height;
  const blocked = Array.from({ length: size }, () => random() % 7 === 0);
  const sourceCells = [random() % size, random() % size, random() % size];
  const sources = sourceCells.map(cell => ({ x: cell % width, y: Math.floor(cell / width) }));
  const weights = seed % 3 === 0 ? undefined : Array.from({ length: size * size }, () => {
    const choice = random() % 11;
    return choice === 0 ? Infinity : choice === 1 ? -1 : choice === 2 ? NaN : (choice - 3) / 4;
  });
  return { width, height, blocked, sources, weights, diagonal: seed % 2 === 0, corners: seed % 5 !== 0, maxCost: seed % 4 === 0 ? 0 : seed % 4 === 1 ? 3 : Infinity };
}

describe('gridDistanceField independent forward oracle', () => {
  it.each(Array.from({ length: 32 }, (_, seed) => seed))('matches all cells and nearest-destination ties for seeded directed grid %i', seed => {
    const input = seeded(seed);
    const size = input.width * input.height;
    const actual = gridDistanceField(input.sources, {
      width: input.width, height: input.height,
      blocked: (x, y) => input.blocked[y * input.width + x],
      allowDiagonal: input.diagonal, preventCornerCutting: input.corners, maxCost: input.maxCost,
      cost: input.weights ? (from, to) => input.weights![(from.y * input.width + from.x) * size + to.y * input.width + to.x] : undefined,
    });
    const expected = oracle(input);
    for (let cell = 0; cell < size; cell++) {
      if (Number.isFinite(expected.distances[cell])) expect(actual.distances[cell]).toBeCloseTo(expected.distances[cell], 12);
      else expect(actual.distances[cell]).toBe(Infinity);
      expect(actual.sourceIndices[cell], `seed ${seed}, cell ${cell}`).toBe(expected.sourceIndices[cell]);
    }
  });

  it('honors real OccupancyGrid reservations and moving-entity exemption without mutation', () => {
    const occupancy = new OccupancyGrid(5, 2);
    occupancy.occupy(7, [{ x: 0, y: 0 }]);
    occupancy.reserve(9, [{ x: 1, y: 0 }]);
    occupancy.block([{ x: 1, y: 1 }]);
    const version = occupancy.version;
    expect(gridDistanceField([{ x: 4, y: 0 }], { occupancy, movingEntity: 7 }).distances[0]).toBe(Infinity);
    const result = gridDistanceField([{ x: 4, y: 0 }], { occupancy, movingEntity: 7, includeReservations: false });
    expect(result.distances[0]).toBe(4);
    expect(gridDistanceField([{ x: 4, y: 0 }], { occupancy, includeReservations: false }).distances[0]).toBe(Infinity);
    expect(occupancy.version).toBe(version);
    expect(occupancy.isBlocked(0, 0)).toBe(true);
    expect(occupancy.isBlocked(1, 0)).toBe(true);
  });

  it('bounds passability work by cells rather than cells times destinations', () => {
    const width = 48, height = 32;
    const sources = Array.from({ length: 24 }, (_, index) => ({ x: index * 2, y: index % height }));
    let calls = 0;
    const field = gridDistanceField(sources, { width, height, blocked: () => { calls++; return false; } });
    expect(calls).toBeLessThanOrEqual(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distances = sources.map(source => Math.abs(source.x - x) + Math.abs(source.y - y));
        const minimum = Math.min(...distances);
        expect(field.distances[y * width + x]).toBe(minimum);
        expect(field.sourceIndices[y * width + x]).toBe(distances.indexOf(minimum));
      }
    }
  });
});
