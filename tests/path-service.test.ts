import { describe, expect, it } from 'vitest';
import { OccupancyGrid } from '../src/occupancy-grid.js';
import {
  createGridPathQueue,
  findGridPath,
  PathRequestQueue,
} from '../src/path-service.js';

describe('findGridPath', () => {
  it('finds a basic orthogonal grid path', () => {
    const result = findGridPath({
      width: 5,
      height: 5,
      start: { x: 0, y: 0 },
      goal: { x: 4, y: 4 },
    });

    expect(result).not.toBeNull();
    expect(result!.path[0]).toEqual({ x: 0, y: 0 });
    expect(result!.path[result!.path.length - 1]).toEqual({ x: 4, y: 4 });
    expect(result!.cost).toBe(8);
  });

  it('supports occupancy-aware blocking and ignores the moving entity', () => {
    const occupancy = new OccupancyGrid(8, 8);
    occupancy.occupy(1, [{ x: 0, y: 0 }]);
    occupancy.occupy(2, [{ x: 1, y: 0 }]);

    const result = findGridPath({
      occupancy,
      movingEntity: 1,
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 0 },
    });

    expect(result).not.toBeNull();
    expect(result!.path).not.toContainEqual({ x: 1, y: 0 });
  });

  it('prevents diagonal corner cutting by default', () => {
    const occupancy = new OccupancyGrid(4, 4);
    occupancy.block([{ x: 1, y: 0 }, { x: 0, y: 1 }]);

    const blocked = findGridPath({
      occupancy,
      start: { x: 0, y: 0 },
      goal: { x: 1, y: 1 },
      allowDiagonal: true,
    });
    expect(blocked).toBeNull();

    const allowed = findGridPath({
      occupancy,
      start: { x: 0, y: 0 },
      goal: { x: 1, y: 1 },
      allowDiagonal: true,
      preventCornerCutting: false,
    });
    expect(allowed).not.toBeNull();
    expect(allowed!.cost).toBeCloseTo(Math.SQRT2, 5);
  });
});

describe('PathRequestQueue', () => {
  it('processes requests in FIFO order and honors a per-call budget', () => {
    const queue = new PathRequestQueue<number, number>({
      resolve: (request) => request * 10,
    });

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    expect(queue.process(2)).toEqual([
      { id: 0, request: 1, result: 10, fromCache: false },
      { id: 1, request: 2, result: 20, fromCache: false },
    ]);
    expect(queue.pendingCount).toBe(1);
    expect(queue.process(2)).toEqual([
      { id: 2, request: 3, result: 30, fromCache: false },
    ]);
  });

  it('caches grid path results and invalidates them when passability changes', () => {
    const occupancy = new OccupancyGrid(8, 8);
    const queue = createGridPathQueue({ occupancy });
    const request = {
      start: { x: 0, y: 0 },
      goal: { x: 4, y: 0 },
    };

    queue.enqueue(request);
    const first = queue.process(1)[0];
    expect(first.fromCache).toBe(false);

    queue.enqueue(request);
    const second = queue.process(1)[0];
    expect(second.fromCache).toBe(true);

    occupancy.block([{ x: 1, y: 0 }]);
    queue.enqueue(request);
    const third = queue.process(1)[0];
    expect(third.fromCache).toBe(false);
    expect(queue.getStats().cacheHits).toBe(1);
  });

  it('does not cache custom blocked callbacks without an explicit cache key', () => {
    const queue = createGridPathQueue({ width: 8, height: 8 });
    const request = {
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 0 },
      blocked: (x: number, y: number) => x === 1 && y === 0,
    };

    queue.enqueue(request);
    expect(queue.process(1)[0].fromCache).toBe(false);
    queue.enqueue(request);
    expect(queue.process(1)[0].fromCache).toBe(false);
  });

  it('returns cloned cached results so callers cannot mutate the cache entry', () => {
    const queue = createGridPathQueue({ width: 8, height: 8 });
    const request = {
      start: { x: 0, y: 0 },
      goal: { x: 2, y: 0 },
    };

    queue.enqueue(request);
    const first = queue.process(1)[0];
    first.result!.path[0].x = 999;

    queue.enqueue(request);
    const second = queue.process(1)[0];
    expect(second.fromCache).toBe(true);
    expect(second.result!.path[0]).toEqual({ x: 0, y: 0 });
  });
});
