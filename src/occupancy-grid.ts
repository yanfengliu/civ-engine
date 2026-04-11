import type { EntityId, Position } from './types.js';

export interface OccupancyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OccupancyArea = OccupancyRect | ReadonlyArray<Position>;

export interface OccupancyQueryOptions {
  ignoreEntity?: EntityId;
  includeReservations?: boolean;
}

export interface OccupancyGridState {
  width: number;
  height: number;
  blocked: number[];
  occupied: Array<[EntityId, number[]]>;
  reservations: Array<[EntityId, number[]]>;
  version: number;
}

export class OccupancyGrid {
  readonly width: number;
  readonly height: number;
  private blocked = new Set<number>();
  private occupiedByCell = new Map<number, EntityId>();
  private occupiedByEntity = new Map<EntityId, number[]>();
  private reservationsByCell = new Map<number, EntityId>();
  private reservationsByEntity = new Map<EntityId, number[]>();
  private _version = 0;

  constructor(width: number, height: number) {
    assertPositiveInteger(width, 'width');
    assertPositiveInteger(height, 'height');
    this.width = width;
    this.height = height;
  }

  get version(): number {
    return this._version;
  }

  setBlocked(area: OccupancyArea, blocked: boolean): void {
    const cells = this.normalizeArea(area);
    let changed = false;

    if (blocked) {
      for (const cell of cells) {
        if (
          this.occupiedByCell.has(cell) ||
          this.reservationsByCell.has(cell)
        ) {
          const { x, y } = this.toPosition(cell);
          throw new Error(
            `Cannot block occupied or reserved cell (${x}, ${y})`,
          );
        }
      }
      for (const cell of cells) {
        if (!this.blocked.has(cell)) {
          this.blocked.add(cell);
          changed = true;
        }
      }
    } else {
      for (const cell of cells) {
        changed = this.blocked.delete(cell) || changed;
      }
    }

    if (changed) {
      this._version++;
    }
  }

  block(area: OccupancyArea): void {
    this.setBlocked(area, true);
  }

  unblock(area: OccupancyArea): void {
    this.setBlocked(area, false);
  }

  isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean {
    const cell = this.toIndex(x, y);
    if (this.blocked.has(cell)) return true;

    const ignoreEntity = options?.ignoreEntity;
    const occupant = this.occupiedByCell.get(cell);
    if (occupant !== undefined && occupant !== ignoreEntity) {
      return true;
    }

    const includeReservations = options?.includeReservations ?? true;
    if (!includeReservations) {
      return false;
    }

    const reserved = this.reservationsByCell.get(cell);
    return reserved !== undefined && reserved !== ignoreEntity;
  }

  canOccupy(
    entity: EntityId,
    area: OccupancyArea,
    options?: { includeReservations?: boolean },
  ): boolean {
    const cells = this.normalizeArea(area);
    return this.canClaim(entity, cells, options?.includeReservations ?? true);
  }

  occupy(entity: EntityId, area: OccupancyArea): boolean {
    const cells = this.normalizeArea(area);
    if (!this.canClaim(entity, cells, true)) {
      return false;
    }

    const occupancyChanged = this.replaceClaim(
      this.occupiedByEntity,
      this.occupiedByCell,
      entity,
      cells,
    );
    const reservationChanged = this.removeClaim(
      this.reservationsByEntity,
      this.reservationsByCell,
      entity,
    );

    if (occupancyChanged || reservationChanged) {
      this._version++;
    }
    return true;
  }

  canReserve(entity: EntityId, area: OccupancyArea): boolean {
    const cells = this.normalizeArea(area);
    return this.canClaim(entity, cells, true);
  }

  reserve(entity: EntityId, area: OccupancyArea): boolean {
    const cells = this.normalizeArea(area);
    if (!this.canClaim(entity, cells, true)) {
      return false;
    }

    if (
      !this.replaceClaim(
        this.reservationsByEntity,
        this.reservationsByCell,
        entity,
        cells,
      )
    ) {
      return true;
    }

    this._version++;
    return true;
  }

  clearReservation(entity: EntityId): void {
    if (
      this.removeClaim(this.reservationsByEntity, this.reservationsByCell, entity)
    ) {
      this._version++;
    }
  }

  release(entity: EntityId): void {
    const occupancyChanged = this.removeClaim(
      this.occupiedByEntity,
      this.occupiedByCell,
      entity,
    );
    const reservationChanged = this.removeClaim(
      this.reservationsByEntity,
      this.reservationsByCell,
      entity,
    );
    if (occupancyChanged || reservationChanged) {
      this._version++;
    }
  }

  getOccupant(x: number, y: number): EntityId | null {
    return this.occupiedByCell.get(this.toIndex(x, y)) ?? null;
  }

  getReservationOwner(x: number, y: number): EntityId | null {
    return this.reservationsByCell.get(this.toIndex(x, y)) ?? null;
  }

  getOccupiedCells(entity: EntityId): Position[] {
    return this.toPositions(this.occupiedByEntity.get(entity) ?? []);
  }

  getReservedCells(entity: EntityId): Position[] {
    return this.toPositions(this.reservationsByEntity.get(entity) ?? []);
  }

  getState(): OccupancyGridState {
    return {
      width: this.width,
      height: this.height,
      blocked: [...this.blocked].sort((a, b) => a - b),
      occupied: [...this.occupiedByEntity.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([entity, cells]) => [entity, [...cells]]),
      reservations: [...this.reservationsByEntity.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([entity, cells]) => [entity, [...cells]]),
      version: this._version,
    };
  }

  static fromState(state: OccupancyGridState): OccupancyGrid {
    const grid = new OccupancyGrid(state.width, state.height);

    assertNonNegativeInteger(state.version, 'version');
    for (const cell of state.blocked) {
      assertCellIndex(cell, grid.width, grid.height);
      grid.blocked.add(cell);
    }

    for (const [entity, cells] of state.occupied) {
      const normalized = normalizeIndexes(cells, grid.width, grid.height);
      if (!grid.canClaim(entity, normalized, false)) {
        throw new Error(`Invalid occupied footprint for entity ${entity}`);
      }
      grid.replaceClaim(
        grid.occupiedByEntity,
        grid.occupiedByCell,
        entity,
        normalized,
      );
    }

    for (const [entity, cells] of state.reservations) {
      const normalized = normalizeIndexes(cells, grid.width, grid.height);
      if (!grid.canClaim(entity, normalized, true)) {
        throw new Error(`Invalid reservation footprint for entity ${entity}`);
      }
      grid.replaceClaim(
        grid.reservationsByEntity,
        grid.reservationsByCell,
        entity,
        normalized,
      );
    }

    grid._version = state.version;
    return grid;
  }

  private canClaim(
    entity: EntityId,
    cells: number[],
    includeReservations: boolean,
  ): boolean {
    for (const cell of cells) {
      if (this.blocked.has(cell)) {
        return false;
      }

      const occupant = this.occupiedByCell.get(cell);
      if (occupant !== undefined && occupant !== entity) {
        return false;
      }

      if (!includeReservations) continue;

      const reserved = this.reservationsByCell.get(cell);
      if (reserved !== undefined && reserved !== entity) {
        return false;
      }
    }
    return true;
  }

  private replaceClaim(
    entityMap: Map<EntityId, number[]>,
    cellMap: Map<number, EntityId>,
    entity: EntityId,
    cells: number[],
  ): boolean {
    const current = entityMap.get(entity) ?? [];
    if (sameCells(current, cells)) {
      return false;
    }

    for (const cell of current) {
      cellMap.delete(cell);
    }
    entityMap.delete(entity);

    for (const cell of cells) {
      cellMap.set(cell, entity);
    }
    entityMap.set(entity, [...cells]);
    return true;
  }

  private removeClaim(
    entityMap: Map<EntityId, number[]>,
    cellMap: Map<number, EntityId>,
    entity: EntityId,
  ): boolean {
    const current = entityMap.get(entity);
    if (!current) {
      return false;
    }

    for (const cell of current) {
      cellMap.delete(cell);
    }
    entityMap.delete(entity);
    return true;
  }

  private normalizeArea(area: OccupancyArea): number[] {
    if (!isOccupancyRect(area)) {
      if (area.length === 0) {
        throw new Error('Occupancy area must not be empty');
      }
      const cells = new Set<number>();
      for (const cell of area) {
        assertGridPoint(cell.x, cell.y, this.width, this.height);
        cells.add(this.toIndex(cell.x, cell.y));
      }
      return [...cells].sort((a, b) => a - b);
    }

    assertPositiveInteger(area.width, 'Footprint width');
    assertPositiveInteger(area.height, 'Footprint height');
    assertGridPoint(area.x, area.y, this.width, this.height);
    assertGridPoint(
      area.x + area.width - 1,
      area.y + area.height - 1,
      this.width,
      this.height,
    );

    const cells: number[] = [];
    for (let y = area.y; y < area.y + area.height; y++) {
      for (let x = area.x; x < area.x + area.width; x++) {
        cells.push(this.toIndex(x, y));
      }
    }
    return cells;
  }

  private toPositions(cells: number[]): Position[] {
    return cells.map((cell) => this.toPosition(cell));
  }

  private toIndex(x: number, y: number): number {
    assertGridPoint(x, y, this.width, this.height);
    return y * this.width + x;
  }

  private toPosition(index: number): Position {
    return {
      x: index % this.width,
      y: Math.floor(index / this.width),
    };
  }
}

function isOccupancyRect(area: OccupancyArea): area is OccupancyRect {
  return !Array.isArray(area);
}

function sameCells(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function normalizeIndexes(
  cells: number[],
  width: number,
  height: number,
): number[] {
  if (cells.length === 0) {
    throw new Error('Occupancy footprint must not be empty');
  }
  const unique = new Set<number>();
  for (const cell of cells) {
    assertCellIndex(cell, width, height);
    unique.add(cell);
  }
  return [...unique].sort((a, b) => a - b);
}

function assertCellIndex(index: number, width: number, height: number): void {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= width * height
  ) {
    throw new Error(`Cell index ${index} is out of bounds`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
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
