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

export interface SubcellSlotOffset {
  x: number;
  y: number;
}

export interface SubcellPlacement {
  position: Position;
  slot: number;
  offset: SubcellSlotOffset;
}

export interface SubcellNeighborSpace {
  position: Position;
  freeSlots: number;
  bestSlot: SubcellPlacement;
}

export interface SubcellOccupancyOptions extends OccupancyQueryOptions {
  preferredSlot?: number;
  preferredOffset?: SubcellSlotOffset;
}

export interface SubcellNeighborOptions extends SubcellOccupancyOptions {
  offsets?: ReadonlyArray<Position>;
}

export interface SubcellOccupancyGridOptions {
  slots?: ReadonlyArray<SubcellSlotOffset>;
  isCellBlocked?: (
    x: number,
    y: number,
    options?: OccupancyQueryOptions,
  ) => boolean;
}

export interface SubcellOccupancyGridState {
  width: number;
  height: number;
  slots: SubcellSlotOffset[];
  occupied: Array<[EntityId, { cell: number; slot: number }]>;
  version: number;
}

const DEFAULT_SUBCELL_SLOT_OFFSETS: ReadonlyArray<SubcellSlotOffset> = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 0, y: 0.5 },
  { x: 0.5, y: 0.5 },
];

const DEFAULT_SUBCELL_NEIGHBOR_OFFSETS: ReadonlyArray<Position> = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

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

export class SubcellOccupancyGrid {
  readonly width: number;
  readonly height: number;
  readonly slots: ReadonlyArray<SubcellSlotOffset>;
  private readonly isCellBlockedFn?: (
    x: number,
    y: number,
    options?: OccupancyQueryOptions,
  ) => boolean;
  private occupiedByCellSlot = new Map<number, EntityId>();
  private occupiedByEntity = new Map<EntityId, { cell: number; slot: number }>();
  private _version = 0;

  constructor(
    width: number,
    height: number,
    options: SubcellOccupancyGridOptions = {},
  ) {
    assertPositiveInteger(width, 'width');
    assertPositiveInteger(height, 'height');
    this.width = width;
    this.height = height;
    this.slots = normalizeSubcellSlots(
      options.slots ?? DEFAULT_SUBCELL_SLOT_OFFSETS,
    );
    this.isCellBlockedFn = options.isCellBlocked;
  }

  get version(): number {
    return this._version;
  }

  canOccupy(
    entity: EntityId,
    position: Position,
    options?: SubcellOccupancyOptions,
  ): boolean {
    return this.findBestSlot(entity, position, options) !== null;
  }

  bestSlotForUnit(
    entity: EntityId,
    position: Position,
    options?: SubcellOccupancyOptions,
  ): SubcellPlacement | null {
    const bestSlot = this.findBestSlot(entity, position, options);
    if (bestSlot === null) {
      return null;
    }

    const cell = this.toIndex(position.x, position.y);
    return this.toPlacement(cell, bestSlot);
  }

  occupy(
    entity: EntityId,
    position: Position,
    options?: SubcellOccupancyOptions,
  ): SubcellPlacement | null {
    const bestSlot = this.findBestSlot(entity, position, options);
    if (bestSlot === null) {
      return null;
    }

    const nextCell = this.toIndex(position.x, position.y);
    const current = this.occupiedByEntity.get(entity);
    if (current && current.cell === nextCell && current.slot === bestSlot) {
      return this.toPlacement(nextCell, bestSlot);
    }

    if (current) {
      this.occupiedByCellSlot.delete(this.toCellSlotKey(current.cell, current.slot));
    }

    this.occupiedByCellSlot.set(this.toCellSlotKey(nextCell, bestSlot), entity);
    this.occupiedByEntity.set(entity, { cell: nextCell, slot: bestSlot });
    this._version++;
    return this.toPlacement(nextCell, bestSlot);
  }

  release(entity: EntityId): void {
    const current = this.occupiedByEntity.get(entity);
    if (!current) {
      return;
    }

    this.occupiedByCellSlot.delete(this.toCellSlotKey(current.cell, current.slot));
    this.occupiedByEntity.delete(entity);
    this._version++;
  }

  getSlotOccupant(x: number, y: number, slot: number): EntityId | null {
    return (
      this.occupiedByCellSlot.get(
        this.toCellSlotKey(this.toIndex(x, y), normalizeSubcellSlotIndex(slot, this.slots.length)),
      ) ?? null
    );
  }

  getOccupiedPlacement(entity: EntityId): SubcellPlacement | null {
    const current = this.occupiedByEntity.get(entity);
    if (!current) {
      return null;
    }

    return this.toPlacement(current.cell, current.slot);
  }

  neighborsWithSpace(
    entity: EntityId,
    origin: Position,
    options?: SubcellNeighborOptions,
  ): SubcellNeighborSpace[] {
    assertGridPoint(origin.x, origin.y, this.width, this.height);
    const offsets = options?.offsets ?? DEFAULT_SUBCELL_NEIGHBOR_OFFSETS;
    const seen = new Set<number>();
    const neighbors: SubcellNeighborSpace[] = [];

    for (const offset of offsets) {
      if (!Number.isInteger(offset.x) || !Number.isInteger(offset.y)) {
        throw new Error('Neighbor offsets must use integer grid coordinates');
      }

      const x = origin.x + offset.x;
      const y = origin.y + offset.y;
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        continue;
      }

      const cell = this.toIndex(x, y);
      if (seen.has(cell)) {
        continue;
      }
      seen.add(cell);

      const placement = this.bestSlotForUnit(entity, { x, y }, options);
      if (!placement) {
        continue;
      }

      neighbors.push({
        position: placement.position,
        freeSlots: this.countFreeSlots(entity, cell),
        bestSlot: placement,
      });
    }

    return neighbors;
  }

  getState(): SubcellOccupancyGridState {
    return {
      width: this.width,
      height: this.height,
      slots: this.slots.map((slot) => ({ ...slot })),
      occupied: [...this.occupiedByEntity.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([entity, claim]) => [entity, { cell: claim.cell, slot: claim.slot }]),
      version: this._version,
    };
  }

  static fromState(
    state: SubcellOccupancyGridState,
    options: Omit<SubcellOccupancyGridOptions, 'slots'> = {},
  ): SubcellOccupancyGrid {
    const grid = new SubcellOccupancyGrid(state.width, state.height, {
      ...options,
      slots: state.slots,
    });

    assertNonNegativeInteger(state.version, 'version');
    for (const [entity, claim] of state.occupied) {
      assertCellIndex(claim.cell, grid.width, grid.height);
      normalizeSubcellSlotIndex(claim.slot, grid.slots.length);

      const position = grid.toPosition(claim.cell);
      if (grid.isBlocked(position.x, position.y, entity, undefined)) {
        throw new Error(
          `Invalid subcell occupancy for entity ${entity} at blocked cell (${position.x}, ${position.y})`,
        );
      }

      if (grid.occupiedByEntity.has(entity)) {
        throw new Error(`Duplicate subcell occupancy for entity ${entity}`);
      }

      const key = grid.toCellSlotKey(claim.cell, claim.slot);
      if (grid.occupiedByCellSlot.has(key)) {
        throw new Error(
          `Duplicate subcell slot ${claim.slot} at cell (${position.x}, ${position.y})`,
        );
      }

      grid.occupiedByEntity.set(entity, { cell: claim.cell, slot: claim.slot });
      grid.occupiedByCellSlot.set(key, entity);
    }

    grid._version = state.version;
    return grid;
  }

  private findBestSlot(
    entity: EntityId,
    position: Position,
    options?: SubcellOccupancyOptions,
  ): number | null {
    const cell = this.toIndex(position.x, position.y);
    if (this.isBlocked(position.x, position.y, entity, options)) {
      return null;
    }

    const current = this.occupiedByEntity.get(entity);
    const preferredSlot = normalizePreferredSubcellSlot(
      options?.preferredSlot,
      current?.slot ?? defaultSubcellSlot(entity, this.slots.length),
      this.slots.length,
    );

    for (const slot of this.rankSlots(preferredSlot, options?.preferredOffset)) {
      const occupant = this.occupiedByCellSlot.get(this.toCellSlotKey(cell, slot));
      if (occupant === undefined || occupant === entity) {
        return slot;
      }
    }

    return null;
  }

  private rankSlots(
    preferredSlot: number,
    preferredOffset?: SubcellSlotOffset,
  ): number[] {
    const slots = [...this.slots.keys()];
    if (!preferredOffset) {
      return slots.map((_, index) => (preferredSlot + index) % this.slots.length);
    }

    assertFiniteNumber(preferredOffset.x, 'preferredOffset.x');
    assertFiniteNumber(preferredOffset.y, 'preferredOffset.y');

    return slots.sort((a, b) => {
      const distanceA = squaredDistance(this.slots[a]!, preferredOffset);
      const distanceB = squaredDistance(this.slots[b]!, preferredOffset);
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }

      const orderA = slotPreferenceDistance(a, preferredSlot, this.slots.length);
      const orderB = slotPreferenceDistance(b, preferredSlot, this.slots.length);
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a - b;
    });
  }

  private countFreeSlots(entity: EntityId, cell: number): number {
    let freeSlots = 0;
    for (let slot = 0; slot < this.slots.length; slot++) {
      const occupant = this.occupiedByCellSlot.get(this.toCellSlotKey(cell, slot));
      if (occupant === undefined || occupant === entity) {
        freeSlots++;
      }
    }
    return freeSlots;
  }

  private isBlocked(
    x: number,
    y: number,
    entity: EntityId,
    options?: SubcellOccupancyOptions,
  ): boolean {
    if (!this.isCellBlockedFn) {
      return false;
    }

    const queryOptions: OccupancyQueryOptions = {
      ignoreEntity: options?.ignoreEntity ?? entity,
    };
    if (options?.includeReservations !== undefined) {
      queryOptions.includeReservations = options.includeReservations;
    }
    return this.isCellBlockedFn(x, y, queryOptions);
  }

  private toPlacement(cell: number, slot: number): SubcellPlacement {
    return {
      position: this.toPosition(cell),
      slot,
      offset: { ...this.slots[slot]! },
    };
  }

  private toCellSlotKey(cell: number, slot: number): number {
    return cell * this.slots.length + slot;
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

function normalizeSubcellSlots(
  slots: ReadonlyArray<SubcellSlotOffset>,
): ReadonlyArray<SubcellSlotOffset> {
  if (slots.length === 0) {
    throw new Error('Subcell slot offsets must not be empty');
  }

  const seen = new Set<string>();
  return Object.freeze(
    slots.map((slot) => {
      assertFiniteNumber(slot.x, 'Subcell slot x');
      assertFiniteNumber(slot.y, 'Subcell slot y');
      if (slot.x < 0 || slot.x >= 1 || slot.y < 0 || slot.y >= 1) {
        throw new RangeError(
          `Subcell slot offset (${slot.x}, ${slot.y}) must be within [0, 1)`,
        );
      }

      const key = `${slot.x},${slot.y}`;
      if (seen.has(key)) {
        throw new Error(`Duplicate subcell slot offset (${slot.x}, ${slot.y})`);
      }
      seen.add(key);
      return Object.freeze({ x: slot.x, y: slot.y });
    }),
  );
}

function normalizeSubcellSlotIndex(slot: number, slotCount: number): number {
  if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount) {
    throw new RangeError(`Subcell slot ${slot} is out of bounds`);
  }
  return slot;
}

function normalizePreferredSubcellSlot(
  preferredSlot: number | undefined,
  fallbackSlot: number,
  slotCount: number,
): number {
  if (preferredSlot === undefined) {
    return fallbackSlot;
  }
  return normalizeSubcellSlotIndex(preferredSlot, slotCount);
}

function defaultSubcellSlot(entity: EntityId, slotCount: number): number {
  return ((entity % slotCount) + slotCount) % slotCount;
}

function slotPreferenceDistance(
  slot: number,
  preferredSlot: number,
  slotCount: number,
): number {
  return (slot - preferredSlot + slotCount) % slotCount;
}

function squaredDistance(a: SubcellSlotOffset, b: SubcellSlotOffset): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
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

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
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
