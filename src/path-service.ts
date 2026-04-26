import { ALL_DIRECTIONS, ORTHOGONAL } from './spatial-grid.js';
import { findPath } from './pathfinding.js';
import type { PathResult } from './pathfinding.js';
import type { EntityId, Position } from './types.js';
import type { GridPassability } from './occupancy-grid.js';

export interface GridPathConfig {
  start: Position;
  goal: Position;
  width?: number;
  height?: number;
  occupancy?: GridPassability;
  movingEntity?: EntityId;
  includeReservations?: boolean;
  allowDiagonal?: boolean;
  preventCornerCutting?: boolean;
  blocked?: (x: number, y: number) => boolean;
  cost?: (from: Position, to: Position) => number;
  heuristic?: (node: Position, goal: Position) => number;
  maxCost?: number;
  maxIterations?: number;
  trackExplored?: boolean;
}

export interface GridPathRequest extends GridPathConfig {
  passabilityVersion?: number;
  cacheKey?: string;
}

export interface PathRequestQueueEntry<TRequest, TResult> {
  id: number;
  request: TRequest;
  result: TResult;
  fromCache: boolean;
}

export interface PathRequestQueueStats {
  enqueued: number;
  processed: number;
  cacheHits: number;
  cacheMisses: number;
  pending: number;
  cacheSize: number;
}

export interface PathRequestQueueOptions<TRequest, TResult> {
  resolve: (request: TRequest) => TResult;
  cacheKey?: (request: TRequest) => string | undefined;
  passabilityVersion?: (request: TRequest) => number;
  cloneResult?: (result: TResult) => TResult;
}

export class PathCache<TResult> {
  private entries = new Map<string, { version: number; result: TResult }>();

  get(key: string, version: number): TResult | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.version !== version) {
      return undefined;
    }
    return entry.result;
  }

  set(key: string, version: number, result: TResult): void {
    this.entries.set(key, { version, result });
  }

  clear(): void {
    this.entries.clear();
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }
}

export class PathRequestQueue<TRequest, TResult> {
  private pending: Array<{ id: number; request: TRequest }> = [];
  private head = 0;
  private nextId = 0;
  private cache = new PathCache<TResult>();
  private stats = {
    enqueued: 0,
    processed: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(
    private readonly options: PathRequestQueueOptions<TRequest, TResult>,
  ) {}

  enqueue(request: TRequest): number {
    const id = this.nextId++;
    this.pending.push({ id, request });
    this.stats.enqueued++;
    return id;
  }

  process(
    maxRequests = 1,
  ): Array<PathRequestQueueEntry<TRequest, TResult>> {
    if (!Number.isInteger(maxRequests) || maxRequests < 0) {
      throw new Error('maxRequests must be a non-negative integer');
    }

    const completed: Array<PathRequestQueueEntry<TRequest, TResult>> = [];
    while (completed.length < maxRequests && this.head < this.pending.length) {
      const current = this.pending[this.head++];
      const key = this.options.cacheKey?.(current.request);
      const version = key
        ? (this.options.passabilityVersion?.(current.request) ?? 0)
        : 0;

      if (key !== undefined) {
        const cached = this.cache.get(key, version);
        if (cached !== undefined) {
          this.stats.processed++;
          this.stats.cacheHits++;
          completed.push({
            id: current.id,
            request: current.request,
            result: this.clone(cached),
            fromCache: true,
          });
          continue;
        }
        this.stats.cacheMisses++;
      }

      const resolved = this.options.resolve(current.request);
      if (key !== undefined) {
        this.cache.set(key, version, this.clone(resolved));
      }

      this.stats.processed++;
      completed.push({
        id: current.id,
        request: current.request,
        result: resolved,
        fromCache: false,
      });
    }

    this.compact();
    return completed;
  }

  clearPending(): void {
    this.pending = [];
    this.head = 0;
  }

  clearCache(): void {
    this.cache.clear();
  }

  get pendingCount(): number {
    return this.pending.length - this.head;
  }

  getStats(): PathRequestQueueStats {
    return {
      enqueued: this.stats.enqueued,
      processed: this.stats.processed,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      pending: this.pendingCount,
      cacheSize: this.cache.size,
    };
  }

  private compact(): void {
    if (this.head === 0) return;
    if (this.head < 256 && this.head * 2 < this.pending.length) return;
    this.pending = this.pending.slice(this.head);
    this.head = 0;
  }

  private clone(result: TResult): TResult {
    return this.options.cloneResult ? this.options.cloneResult(result) : result;
  }
}

export function findGridPath(
  config: GridPathConfig,
): PathResult<Position> | null {
  const { width, height } = resolveDimensions(config);
  const start = clonePosition(config.start);
  const goal = clonePosition(config.goal);
  assertGridPoint(start, width, height, 'Start');
  assertGridPoint(goal, width, height, 'Goal');

  const allowDiagonal = config.allowDiagonal ?? false;
  const preventCornerCutting = config.preventCornerCutting ?? true;
  const blocked = createBlockedPredicate(config);

  if (blocked(start.x, start.y) || blocked(goal.x, goal.y)) {
    return null;
  }

  const offsets = allowDiagonal ? ALL_DIRECTIONS : ORTHOGONAL;
  const heuristic = config.heuristic ?? defaultHeuristic(allowDiagonal);
  const cost = config.cost ?? defaultCost;

  return findPath<Position>({
    start,
    goal,
    neighbors: (node) => {
      const neighbors: Position[] = [];
      for (const [dx, dy] of offsets) {
        const next = { x: node.x + dx, y: node.y + dy };
        if (!isInBounds(next.x, next.y, width, height)) continue;
        if (blocked(next.x, next.y)) continue;
        if (
          allowDiagonal &&
          preventCornerCutting &&
          dx !== 0 &&
          dy !== 0 &&
          (blocked(node.x + dx, node.y) || blocked(node.x, node.y + dy))
        ) {
          continue;
        }
        neighbors.push(next);
      }
      return neighbors;
    },
    cost: (from, to) => {
      const value = cost(from, to);
      return Number.isFinite(value) ? value : Infinity;
    },
    heuristic,
    hash: (node) => `${node.x},${node.y}`,
    maxCost: config.maxCost,
    maxIterations: config.maxIterations,
    trackExplored: config.trackExplored,
  });
}

export function createGridPathQueue(
  defaults: Omit<Partial<GridPathRequest>, 'start' | 'goal'> = {},
): PathRequestQueue<GridPathRequest, PathResult<Position> | null> {
  return new PathRequestQueue<GridPathRequest, PathResult<Position> | null>({
    resolve: (request) => findGridPath({ ...defaults, ...request }),
    cacheKey: (request) => createGridPathCacheKey({ ...defaults, ...request }),
    passabilityVersion: (request) =>
      gridPathPassabilityVersion({ ...defaults, ...request }),
    cloneResult: cloneGridPathResult,
  });
}

export function createGridPathCacheKey(
  request: GridPathRequest,
): string | undefined {
  if (request.cacheKey) {
    return request.cacheKey;
  }

  if (
    request.cost !== undefined ||
    request.heuristic !== undefined ||
    request.blocked !== undefined
  ) {
    return undefined;
  }

  const { width, height } = resolveDimensions(request);
  return [
    `${width}x${height}`,
    `${request.start.x},${request.start.y}`,
    `${request.goal.x},${request.goal.y}`,
    `entity:${request.movingEntity ?? 'none'}`,
    `diag:${request.allowDiagonal ? 1 : 0}`,
    `cut:${request.preventCornerCutting === false ? 0 : 1}`,
    `res:${request.includeReservations === false ? 0 : 1}`,
    `cost:${request.maxCost ?? 'inf'}`,
    `iter:${request.maxIterations ?? 'inf'}`,
    `track:${request.trackExplored ? 1 : 0}`,
  ].join('|');
}

export function gridPathPassabilityVersion(request: GridPathRequest): number {
  return request.passabilityVersion ?? request.occupancy?.version ?? 0;
}

function resolveDimensions(config: GridPathConfig): {
  width: number;
  height: number;
} {
  const width = config.width ?? config.occupancy?.width;
  const height = config.height ?? config.occupancy?.height;
  if (width === undefined || height === undefined) {
    throw new Error('Grid pathfinding requires width/height or an occupancy grid');
  }
  assertPositiveInteger(width, 'width');
  assertPositiveInteger(height, 'height');
  return { width, height };
}

function createBlockedPredicate(config: GridPathConfig): (x: number, y: number) => boolean {
  return (x: number, y: number) => {
    if (
      config.occupancy?.isBlocked(x, y, {
        ignoreEntity: config.movingEntity,
        includeReservations: config.includeReservations ?? true,
      })
    ) {
      return true;
    }
    return config.blocked?.(x, y) ?? false;
  };
}

function defaultCost(from: Position, to: Position): number {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  return dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
}

function defaultHeuristic(
  allowDiagonal: boolean,
): (node: Position, goal: Position) => number {
  if (!allowDiagonal) {
    return (node, goal) =>
      Math.abs(node.x - goal.x) + Math.abs(node.y - goal.y);
  }

  return (node, goal) => {
    const dx = Math.abs(node.x - goal.x);
    const dy = Math.abs(node.y - goal.y);
    return Math.min(dx, dy) * Math.SQRT2 + Math.abs(dx - dy);
  };
}

function cloneGridPathResult(
  result: PathResult<Position> | null,
): PathResult<Position> | null {
  if (result === null) {
    return null;
  }

  const clone: PathResult<Position> = {
    path: result.path.map(clonePosition),
    cost: result.cost,
  };
  if (result.explored !== undefined) {
    clone.explored = result.explored;
  }
  return clone;
}

function clonePosition(position: Position): Position {
  return { x: position.x, y: position.y };
}

function isInBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

function assertGridPoint(
  point: Position,
  width: number,
  height: number,
  label: string,
): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`${label} position must use integer coordinates`);
  }
  if (!isInBounds(point.x, point.y, width, height)) {
    throw new RangeError(
      `${label} position (${point.x}, ${point.y}) is out of bounds`,
    );
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}
