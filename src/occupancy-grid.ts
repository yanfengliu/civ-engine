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

export interface GridPassability {
  readonly width: number;
  readonly height: number;
  readonly version: number;
  isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean;
}

export interface OccupancyGridState {
  width: number;
  height: number;
  blocked: number[];
  occupied: Array<[EntityId, number[]]>;
  reservations: Array<[EntityId, number[]]>;
  version: number;
}

export interface OccupancyGridMetrics {
  blockedQueries: number;
  blockedCellChecks: number;
  claimQueries: number;
  claimCellChecks: number;
  areaNormalizations: number;
  normalizedCellCount: number;
  stateSnapshots: number;
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

export interface SubcellOccupancyGridMetrics {
  placementQueries: number;
  blockedQueries: number;
  blockedCellChecks: number;
  slotChecks: number;
  neighborQueries: number;
  neighborCellChecks: number;
  freeSlotQueries: number;
  freeSlotChecks: number;
  stateSnapshots: number;
}

export interface OccupancyMetadata {
  kind: string;
}

export type OccupancyClaimType =
  | 'blocked'
  | 'occupied'
  | 'reserved'
  | 'subcell';

export interface OccupancyCellClaim {
  entity: EntityId | null;
  kind: string;
  claim: OccupancyClaimType;
  slot?: number;
  offset?: SubcellSlotOffset;
}

export interface OccupancyCellStatus {
  position: Position;
  blocked: boolean;
  blockedBy: OccupancyCellClaim[];
  crowdedBy: OccupancyCellClaim[];
  freeSubcellSlots: number | null;
}

export interface OccupancyBindingClaimOptions {
  metadata?: OccupancyMetadata;
}

export interface OccupancyBindingSubcellOptions
  extends SubcellOccupancyOptions {
  metadata?: OccupancyMetadata;
}

export interface OccupancyBindingWorldHooks {
  onDestroy(callback: (id: EntityId) => void): void;
  offDestroy(callback: (id: EntityId) => void): void;
}

export interface OccupancyBindingOptions {
  crowding?: false | SubcellOccupancyGridOptions;
  world?: OccupancyBindingWorldHooks;
}

export interface OccupancyBindingMetrics {
  version: number;
  cellStatusQueries: number;
  crowdedSlotChecks: number;
  occupancy: OccupancyGridMetrics;
  crowding: SubcellOccupancyGridMetrics | null;
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

export class OccupancyGrid implements GridPassability {
  readonly width: number;
  readonly height: number;
  private blocked = new Set<number>();
  private occupiedByCell = new Map<number, EntityId>();
  private occupiedByEntity = new Map<EntityId, number[]>();
  private reservationsByCell = new Map<number, EntityId>();
  private reservationsByEntity = new Map<EntityId, number[]>();
  private _version = 0;
  private metrics = createOccupancyGridMetrics();

  constructor(width: number, height: number) {
    assertPositiveInteger(width, 'width');
    assertPositiveInteger(height, 'height');
    this.width = width;
    this.height = height;
  }

  get version(): number {
    return this._version;
  }

  getMetrics(): OccupancyGridMetrics {
    return cloneOccupancyGridMetrics(this.metrics);
  }

  resetMetrics(): void {
    this.metrics = createOccupancyGridMetrics();
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
    this.metrics.blockedQueries++;
    this.metrics.blockedCellChecks++;
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
    this.metrics.stateSnapshots++;
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
    this.metrics.claimQueries++;
    for (const cell of cells) {
      this.metrics.claimCellChecks++;
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
    this.metrics.areaNormalizations++;
    const cells = normalizeOccupancyArea(area, this.width, this.height);
    this.metrics.normalizedCellCount += cells.length;
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
  private metrics = createSubcellOccupancyGridMetrics();

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

  getMetrics(): SubcellOccupancyGridMetrics {
    return cloneSubcellOccupancyGridMetrics(this.metrics);
  }

  resetMetrics(): void {
    this.metrics = createSubcellOccupancyGridMetrics();
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
    this.metrics.neighborQueries++;
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
      this.metrics.neighborCellChecks++;

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
    this.metrics.stateSnapshots++;
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
    this.metrics.placementQueries++;
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
      this.metrics.slotChecks++;
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
    this.metrics.freeSlotQueries++;
    let freeSlots = 0;
    for (let slot = 0; slot < this.slots.length; slot++) {
      this.metrics.freeSlotChecks++;
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
    this.metrics.blockedQueries++;
    if (!this.isCellBlockedFn) {
      return false;
    }

    const queryOptions: OccupancyQueryOptions = {
      ignoreEntity: options?.ignoreEntity ?? entity,
    };
    if (options?.includeReservations !== undefined) {
      queryOptions.includeReservations = options.includeReservations;
    }
    this.metrics.blockedCellChecks++;
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

interface OccupancyBindingEntityState {
  metadata: OccupancyMetadata;
  occupied: boolean;
  reserved: boolean;
  subcell: boolean;
}

export class OccupancyBinding implements GridPassability {
  readonly width: number;
  readonly height: number;
  private readonly occupancy: OccupancyGrid;
  private readonly crowding: SubcellOccupancyGrid | null;
  private staticMetadataByCell = new Map<number, OccupancyMetadata>();
  private entityStates = new Map<EntityId, OccupancyBindingEntityState>();
  private metrics = {
    cellStatusQueries: 0,
    crowdedSlotChecks: 0,
  };
  private destroyHooks: OccupancyBindingWorldHooks | null = null;
  private readonly destroyCallback = (id: EntityId) => {
    this.release(id);
  };
  private _version = 0;

  constructor(
    width: number,
    height: number,
    options: OccupancyBindingOptions = {},
  ) {
    assertPositiveInteger(width, 'width');
    assertPositiveInteger(height, 'height');
    this.width = width;
    this.height = height;
    this.occupancy = new OccupancyGrid(width, height);

    if (options.crowding === false) {
      this.crowding = null;
    } else {
      const userBlocked = options.crowding?.isCellBlocked;
      this.crowding = new SubcellOccupancyGrid(width, height, {
        ...options.crowding,
        isCellBlocked: (x, y, queryOptions) => {
          if (this.occupancy.isBlocked(x, y, queryOptions)) {
            return true;
          }
          return userBlocked?.(x, y, queryOptions) ?? false;
        },
      });
    }

    if (options.world) {
      this.attachWorld(options.world);
    }
  }

  get version(): number {
    return this._version;
  }

  isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean {
    if (this.occupancy.isBlocked(x, y, options)) {
      return true;
    }
    if (!this.crowding) {
      return false;
    }
    return this.countCrowdingFreeSlots(x, y, options?.ignoreEntity) === 0;
  }

  attachWorld(world: OccupancyBindingWorldHooks): void {
    if (this.destroyHooks === world) {
      return;
    }
    this.detachWorld();
    world.onDestroy(this.destroyCallback);
    this.destroyHooks = world;
  }

  detachWorld(): void {
    if (!this.destroyHooks) {
      return;
    }
    this.destroyHooks.offDestroy(this.destroyCallback);
    this.destroyHooks = null;
  }

  block(
    area: OccupancyArea,
    options: OccupancyBindingClaimOptions = {},
  ): void {
    const cells = normalizeOccupancyArea(area, this.width, this.height);
    const crowdedCell = this.findCrowdingConflictCell(cells);
    if (crowdedCell !== null) {
      const { x, y } = this.toPosition(crowdedCell);
      throw new Error(
        `Cannot block cells that still contain crowded occupants (${x}, ${y})`,
      );
    }
    const metadata = normalizeOccupancyMetadata(options.metadata, 'blocked');
    const beforeVersion = this.occupancy.version;
    this.occupancy.block(area);

    let changed = beforeVersion !== this.occupancy.version;
    for (const cell of cells) {
      changed = this.setStaticMetadata(cell, metadata) || changed;
    }

    this.bumpVersion(changed);
  }

  unblock(area: OccupancyArea): void {
    const cells = normalizeOccupancyArea(area, this.width, this.height);
    const beforeVersion = this.occupancy.version;
    this.occupancy.unblock(area);

    let changed = beforeVersion !== this.occupancy.version;
    for (const cell of cells) {
      changed = this.removeStaticMetadata(cell) || changed;
    }

    this.bumpVersion(changed);
  }

  occupy(
    entity: EntityId,
    area: OccupancyArea,
    options: OccupancyBindingClaimOptions = {},
  ): boolean {
    const crowdedCell = this.findCrowdingConflictCell(
      normalizeOccupancyArea(area, this.width, this.height),
      entity,
    );
    if (crowdedCell !== null) {
      return false;
    }

    const beforeOccupancyVersion = this.occupancy.version;
    const beforeCrowdingVersion = this.crowding?.version ?? 0;
    if (!this.occupancy.occupy(entity, area)) {
      return false;
    }

    let changed = beforeOccupancyVersion !== this.occupancy.version;
    if (this.crowding) {
      this.crowding.release(entity);
      changed = this.crowding.version !== beforeCrowdingVersion || changed;
    }
    changed = this.setEntityState(entity, {
      metadata: options.metadata,
      fallbackKind: 'occupied',
      occupied: true,
      reserved: false,
      subcell: false,
    }) || changed;

    this.bumpVersion(changed);
    return true;
  }

  reserve(
    entity: EntityId,
    area: OccupancyArea,
    options: OccupancyBindingClaimOptions = {},
  ): boolean {
    const crowdedCell = this.findCrowdingConflictCell(
      normalizeOccupancyArea(area, this.width, this.height),
      entity,
    );
    if (crowdedCell !== null) {
      return false;
    }

    const beforeVersion = this.occupancy.version;
    if (!this.occupancy.reserve(entity, area)) {
      return false;
    }

    const changed =
      this.setEntityState(entity, {
        metadata: options.metadata,
        fallbackKind: 'reserved',
        reserved: true,
      }) || beforeVersion !== this.occupancy.version;
    this.bumpVersion(changed);
    return true;
  }

  clearReservation(entity: EntityId): void {
    const beforeVersion = this.occupancy.version;
    this.occupancy.clearReservation(entity);
    const changed =
      this.setEntityState(entity, {
        fallbackKind: this.entityStates.get(entity)?.metadata.kind ?? 'reserved',
        reserved: false,
      }) || beforeVersion !== this.occupancy.version;
    this.bumpVersion(changed);
  }

  canOccupySubcell(
    entity: EntityId,
    position: Position,
    options?: OccupancyBindingSubcellOptions,
  ): boolean {
    return (
      this.requireCrowding().canOccupy(entity, position, toSubcellOccupancyOptions(options))
    );
  }

  bestSubcellPlacement(
    entity: EntityId,
    position: Position,
    options?: OccupancyBindingSubcellOptions,
  ): SubcellPlacement | null {
    return this.requireCrowding().bestSlotForUnit(
      entity,
      position,
      toSubcellOccupancyOptions(options),
    );
  }

  occupySubcell(
    entity: EntityId,
    position: Position,
    options: OccupancyBindingSubcellOptions = {},
  ): SubcellPlacement | null {
    const crowding = this.requireCrowding();
    const beforeCrowdingVersion = crowding.version;
    const beforeOccupancyVersion = this.occupancy.version;
    const placement = crowding.occupy(
      entity,
      position,
      toSubcellOccupancyOptions(options),
    );
    if (!placement) {
      return null;
    }

    this.occupancy.release(entity);
    const changed =
      this.setEntityState(entity, {
        metadata: options.metadata,
        fallbackKind: 'subcell',
        occupied: false,
        reserved: false,
        subcell: true,
      }) ||
      crowding.version !== beforeCrowdingVersion ||
      this.occupancy.version !== beforeOccupancyVersion;
    this.bumpVersion(changed);
    return placement;
  }

  neighborsWithSpace(
    entity: EntityId,
    origin: Position,
    options?: OccupancyBindingSubcellOptions,
  ): SubcellNeighborSpace[] {
    return this.requireCrowding().neighborsWithSpace(
      entity,
      origin,
      toSubcellNeighborOptions(options),
    );
  }

  release(entity: EntityId): void {
    const beforeOccupancyVersion = this.occupancy.version;
    const beforeCrowdingVersion = this.crowding?.version ?? 0;
    this.occupancy.release(entity);
    this.crowding?.release(entity);

    const changed =
      this.setEntityState(entity, {
        fallbackKind: this.entityStates.get(entity)?.metadata.kind ?? 'occupied',
        occupied: false,
        reserved: false,
        subcell: false,
      }) ||
      this.occupancy.version !== beforeOccupancyVersion ||
      (this.crowding?.version ?? 0) !== beforeCrowdingVersion;
    this.bumpVersion(changed);
  }

  getCellStatus(
    x: number,
    y: number,
    options?: OccupancyQueryOptions,
  ): OccupancyCellStatus {
    assertGridPoint(x, y, this.width, this.height);
    this.metrics.cellStatusQueries++;

    const blockedBy: OccupancyCellClaim[] = [];
    const crowdedBy: OccupancyCellClaim[] = [];
    const ignoreEntity = options?.ignoreEntity;
    const includeReservations = options?.includeReservations ?? true;
    const cell = this.toIndex(x, y);

    const staticMetadata = this.staticMetadataByCell.get(cell);
    if (staticMetadata) {
      blockedBy.push({
        entity: null,
        kind: staticMetadata.kind,
        claim: 'blocked',
      });
    }

    const occupant = this.occupancy.getOccupant(x, y);
    if (occupant !== null && occupant !== ignoreEntity) {
      blockedBy.push(this.createEntityClaim(occupant, 'occupied'));
    }

    if (includeReservations) {
      const reservationOwner = this.occupancy.getReservationOwner(x, y);
      if (reservationOwner !== null && reservationOwner !== ignoreEntity) {
        blockedBy.push(this.createEntityClaim(reservationOwner, 'reserved'));
      }
    }

    if (this.crowding) {
      for (let slot = 0; slot < this.crowding.slots.length; slot++) {
        this.metrics.crowdedSlotChecks++;
        const crowdedEntity = this.crowding.getSlotOccupant(x, y, slot);
        if (crowdedEntity === null || crowdedEntity === ignoreEntity) {
          continue;
        }
        crowdedBy.push(
          this.createEntityClaim(crowdedEntity, 'subcell', {
            slot,
            offset: { ...this.crowding.slots[slot]! },
          }),
        );
      }
    }

    const freeSubcellSlots = this.crowding
      ? this.crowding.slots.length - crowdedBy.length
      : null;

    return {
      position: { x, y },
      blocked: blockedBy.length > 0 || freeSubcellSlots === 0,
      blockedBy,
      crowdedBy,
      freeSubcellSlots,
    };
  }

  getMetrics(): OccupancyBindingMetrics {
    return {
      version: this._version,
      cellStatusQueries: this.metrics.cellStatusQueries,
      crowdedSlotChecks: this.metrics.crowdedSlotChecks,
      occupancy: this.occupancy.getMetrics(),
      crowding: this.crowding?.getMetrics() ?? null,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      cellStatusQueries: 0,
      crowdedSlotChecks: 0,
    };
    this.occupancy.resetMetrics();
    this.crowding?.resetMetrics();
  }

  private requireCrowding(): SubcellOccupancyGrid {
    if (!this.crowding) {
      throw new Error('OccupancyBinding crowding is disabled');
    }
    return this.crowding;
  }

  private findCrowdingConflictCell(
    cells: number[],
    ignoreEntity?: EntityId,
  ): number | null {
    if (!this.crowding) {
      return null;
    }

    for (const cell of cells) {
      const { x, y } = this.toPosition(cell);
      if (this.hasCrowdingOccupant(x, y, ignoreEntity)) {
        return cell;
      }
    }

    return null;
  }

  private hasCrowdingOccupant(
    x: number,
    y: number,
    ignoreEntity?: EntityId,
  ): boolean {
    if (!this.crowding) {
      return false;
    }

    for (let slot = 0; slot < this.crowding.slots.length; slot++) {
      const occupant = this.crowding.getSlotOccupant(x, y, slot);
      if (occupant !== null && occupant !== ignoreEntity) {
        return true;
      }
    }

    return false;
  }

  private countCrowdingFreeSlots(
    x: number,
    y: number,
    ignoreEntity?: EntityId,
  ): number {
    if (!this.crowding) {
      return 0;
    }

    let freeSlots = 0;
    for (let slot = 0; slot < this.crowding.slots.length; slot++) {
      const occupant = this.crowding.getSlotOccupant(x, y, slot);
      if (occupant === null || occupant === ignoreEntity) {
        freeSlots++;
      }
    }
    return freeSlots;
  }

  private setStaticMetadata(cell: number, metadata: OccupancyMetadata): boolean {
    const current = this.staticMetadataByCell.get(cell);
    if (current && sameOccupancyMetadata(current, metadata)) {
      return false;
    }
    this.staticMetadataByCell.set(cell, metadata);
    return true;
  }

  private removeStaticMetadata(cell: number): boolean {
    return this.staticMetadataByCell.delete(cell);
  }

  private setEntityState(
    entity: EntityId,
    config: {
      metadata?: OccupancyMetadata;
      fallbackKind: string;
      occupied?: boolean;
      reserved?: boolean;
      subcell?: boolean;
    },
  ): boolean {
    const current = this.entityStates.get(entity);
    const next: OccupancyBindingEntityState = {
      metadata: normalizeOccupancyMetadata(
        config.metadata ?? current?.metadata,
        current?.metadata.kind ?? config.fallbackKind,
      ),
      occupied: config.occupied ?? current?.occupied ?? false,
      reserved: config.reserved ?? current?.reserved ?? false,
      subcell: config.subcell ?? current?.subcell ?? false,
    };

    if (!next.occupied && !next.reserved && !next.subcell) {
      if (!current) {
        return false;
      }
      this.entityStates.delete(entity);
      return true;
    }

    if (
      current &&
      sameOccupancyMetadata(current.metadata, next.metadata) &&
      current.occupied === next.occupied &&
      current.reserved === next.reserved &&
      current.subcell === next.subcell
    ) {
      return false;
    }

    this.entityStates.set(entity, next);
    return true;
  }

  private createEntityClaim(
    entity: EntityId,
    claim: OccupancyClaimType,
    options: {
      slot?: number;
      offset?: SubcellSlotOffset;
    } = {},
  ): OccupancyCellClaim {
    return {
      entity,
      kind: this.entityStates.get(entity)?.metadata.kind ?? claim,
      claim,
      ...(options.slot === undefined ? {} : { slot: options.slot }),
      ...(options.offset === undefined ? {} : { offset: options.offset }),
    };
  }

  private bumpVersion(changed: boolean): void {
    if (changed) {
      this._version++;
    }
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

function sameOccupancyMetadata(
  a: OccupancyMetadata,
  b: OccupancyMetadata,
): boolean {
  return a.kind === b.kind;
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

function normalizeOccupancyArea(
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

function normalizeOccupancyMetadata(
  metadata: OccupancyMetadata | undefined,
  fallbackKind: string,
): OccupancyMetadata {
  const kind = metadata?.kind ?? fallbackKind;
  if (kind.length === 0) {
    throw new Error('Occupancy metadata kind must not be empty');
  }
  return { kind };
}

function toSubcellOccupancyOptions(
  options?: OccupancyBindingSubcellOptions,
): SubcellOccupancyOptions | undefined {
  if (!options) {
    return undefined;
  }
  return {
    preferredSlot: options.preferredSlot,
    preferredOffset: options.preferredOffset,
    ignoreEntity: options.ignoreEntity,
    includeReservations: options.includeReservations,
  };
}

function toSubcellNeighborOptions(
  options?: OccupancyBindingSubcellOptions,
): SubcellNeighborOptions | undefined {
  if (!options) {
    return undefined;
  }
  return {
    ...toSubcellOccupancyOptions(options),
  };
}

function createOccupancyGridMetrics(): OccupancyGridMetrics {
  return {
    blockedQueries: 0,
    blockedCellChecks: 0,
    claimQueries: 0,
    claimCellChecks: 0,
    areaNormalizations: 0,
    normalizedCellCount: 0,
    stateSnapshots: 0,
  };
}

function cloneOccupancyGridMetrics(
  metrics: OccupancyGridMetrics,
): OccupancyGridMetrics {
  return { ...metrics };
}

function createSubcellOccupancyGridMetrics(): SubcellOccupancyGridMetrics {
  return {
    placementQueries: 0,
    blockedQueries: 0,
    blockedCellChecks: 0,
    slotChecks: 0,
    neighborQueries: 0,
    neighborCellChecks: 0,
    freeSlotQueries: 0,
    freeSlotChecks: 0,
    stateSnapshots: 0,
  };
}

function cloneSubcellOccupancyGridMetrics(
  metrics: SubcellOccupancyGridMetrics,
): SubcellOccupancyGridMetrics {
  return { ...metrics };
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
