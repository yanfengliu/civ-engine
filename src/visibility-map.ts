import type { Position } from './types.js';

export type VisibilityPlayerId = number | string;
export type VisionSourceId = number | string;

export interface VisionSource {
  x: number;
  y: number;
  radius: number;
}

export interface VisibilityMapState {
  width: number;
  height: number;
  players: Array<
    [
      VisibilityPlayerId,
      {
        sources: Array<[VisionSourceId, VisionSource]>;
        explored: number[];
      },
    ]
  >;
}

interface PlayerVisibilityState {
  sources: Map<VisionSourceId, VisionSource>;
  visible: Set<number>;
  explored: Set<number>;
}

export class VisibilityMap {
  readonly width: number;
  readonly height: number;
  private players = new Map<VisibilityPlayerId, PlayerVisibilityState>();
  private dirtyPlayers = new Set<VisibilityPlayerId>();

  constructor(width: number, height: number) {
    assertPositiveInteger(width, 'width');
    assertPositiveInteger(height, 'height');
    this.width = width;
    this.height = height;
  }

  setSource(
    playerId: VisibilityPlayerId,
    sourceId: VisionSourceId,
    source: VisionSource,
  ): void {
    assertGridPoint(source.x, source.y, this.width, this.height);
    assertNonNegativeFinite(source.radius, 'Vision radius');

    const player = this.ensurePlayer(playerId);
    const current = player.sources.get(sourceId);
    if (
      current &&
      current.x === source.x &&
      current.y === source.y &&
      current.radius === source.radius
    ) {
      return;
    }

    player.sources.set(sourceId, {
      x: source.x,
      y: source.y,
      radius: source.radius,
    });
    this.dirtyPlayers.add(playerId);
  }

  removeSource(playerId: VisibilityPlayerId, sourceId: VisionSourceId): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.sources.delete(sourceId)) {
      this.dirtyPlayers.add(playerId);
    }
  }

  clearPlayer(playerId: VisibilityPlayerId): void {
    if (this.players.delete(playerId)) {
      this.dirtyPlayers.delete(playerId);
    }
  }

  update(): void {
    for (const playerId of [...this.dirtyPlayers]) {
      const player = this.players.get(playerId);
      if (!player) {
        this.dirtyPlayers.delete(playerId);
        continue;
      }

      const visible = this.computeVisible(player.sources);
      player.visible = visible;
      for (const cell of visible) {
        player.explored.add(cell);
      }
      this.dirtyPlayers.delete(playerId);
    }
  }

  isVisible(playerId: VisibilityPlayerId, x: number, y: number): boolean {
    return this.ensureUpdated(playerId).visible.has(this.toIndex(x, y));
  }

  isExplored(playerId: VisibilityPlayerId, x: number, y: number): boolean {
    return this.ensureUpdated(playerId).explored.has(this.toIndex(x, y));
  }

  getVisibleCells(playerId: VisibilityPlayerId): Position[] {
    return this.toPositions(this.ensureUpdated(playerId).visible);
  }

  getExploredCells(playerId: VisibilityPlayerId): Position[] {
    return this.toPositions(this.ensureUpdated(playerId).explored);
  }

  getSources(
    playerId: VisibilityPlayerId,
  ): Array<[VisionSourceId, VisionSource]> {
    const player = this.ensureUpdated(playerId);
    return [...player.sources.entries()]
      .sort(compareByNormalizedKey)
      .map(([sourceId, source]) => [sourceId, { ...source }]);
  }

  getState(): VisibilityMapState {
    this.update();
    const players: VisibilityMapState['players'] = [...this.players.entries()]
      .sort(compareByNormalizedKey)
      .map(([playerId, player]) => [
        playerId,
        {
          sources: [...player.sources.entries()]
            .sort(compareByNormalizedKey)
            .map(([sourceId, source]) => [sourceId, { ...source }]),
          explored: [...player.explored].sort((a, b) => a - b),
        },
      ]);

    return {
      width: this.width,
      height: this.height,
      players,
    };
  }

  static fromState(state: VisibilityMapState): VisibilityMap {
    const map = new VisibilityMap(state.width, state.height);

    for (const [playerId, player] of state.players) {
      const target = map.ensurePlayer(playerId);
      for (const [sourceId, source] of player.sources) {
        assertGridPoint(source.x, source.y, map.width, map.height);
        assertNonNegativeFinite(source.radius, 'Vision radius');
        target.sources.set(sourceId, { ...source });
      }
      for (const cell of player.explored) {
        assertCellIndex(cell, map.width, map.height);
        target.explored.add(cell);
      }
      map.dirtyPlayers.add(playerId);
    }

    map.update();
    return map;
  }

  private ensurePlayer(playerId: VisibilityPlayerId): PlayerVisibilityState {
    let player = this.players.get(playerId);
    if (!player) {
      player = {
        sources: new Map(),
        visible: new Set(),
        explored: new Set(),
      };
      this.players.set(playerId, player);
    }
    return player;
  }

  private ensureUpdated(playerId: VisibilityPlayerId): PlayerVisibilityState {
    const player = this.ensurePlayer(playerId);
    if (this.dirtyPlayers.has(playerId)) {
      this.update();
    }
    return player;
  }

  private computeVisible(
    sources: Map<VisionSourceId, VisionSource>,
  ): Set<number> {
    const visible = new Set<number>();
    const sortedSources = [...sources.entries()].sort(compareByNormalizedKey);

    for (const [, source] of sortedSources) {
      const minX = Math.max(0, Math.floor(source.x - source.radius));
      const maxX = Math.min(this.width - 1, Math.ceil(source.x + source.radius));
      const minY = Math.max(0, Math.floor(source.y - source.radius));
      const maxY = Math.min(
        this.height - 1,
        Math.ceil(source.y + source.radius),
      );
      const radiusSq = source.radius * source.radius;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - source.x;
          const dy = y - source.y;
          if (dx * dx + dy * dy <= radiusSq) {
            visible.add(this.toIndex(x, y));
          }
        }
      }
    }

    return visible;
  }

  private toPositions(cells: Set<number>): Position[] {
    return [...cells]
      .sort((a, b) => a - b)
      .map((cell) => ({
        x: cell % this.width,
        y: Math.floor(cell / this.width),
      }));
  }

  private toIndex(x: number, y: number): number {
    assertGridPoint(x, y, this.width, this.height);
    return y * this.width + x;
  }
}

function compareByNormalizedKey<T extends string | number>(
  a: [T, unknown],
  b: [T, unknown],
): number {
  return normalizeKey(a[0]).localeCompare(normalizeKey(b[0]));
}

function normalizeKey(value: string | number): string {
  return typeof value === 'number' ? `n:${value}` : `s:${value}`;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

function assertCellIndex(index: number, width: number, height: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= width * height) {
    throw new Error(`Cell index ${index} is out of bounds`);
  }
}

function assertGridPoint(
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
