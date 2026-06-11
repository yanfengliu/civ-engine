import { EngineError, EngineRangeError } from './engine-error.js';
import type { EntityId, Position } from './types.js';
import type {
  OccupancyQueryOptions,
  SubcellNeighborOptions,
  SubcellNeighborSpace,
  SubcellOccupancyGridMetrics,
  SubcellOccupancyGridOptions,
  SubcellOccupancyGridState,
  SubcellOccupancyOptions,
  SubcellPlacement,
  SubcellSlotOffset,
} from './occupancy-types.js';
import {
  assertCellIndex,
  assertFiniteNumber,
  assertGridPoint,
  assertNonNegativeInteger,
  assertPositiveInteger,
} from './occupancy-internal.js';

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
        throw new EngineError('occupancy_coords_not_integer', 'Neighbor offsets must use integer grid coordinates');
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
        throw new EngineError('subcell_state_invalid',
          `Invalid subcell occupancy for entity ${entity} at blocked cell (${position.x}, ${position.y})`,
          { details: { entity, x: position.x, y: position.y } },
        );
      }

      if (grid.occupiedByEntity.has(entity)) {
        throw new EngineError('subcell_state_invalid', `Duplicate subcell occupancy for entity ${entity}`, { details: { entity } });
      }

      const key = grid.toCellSlotKey(claim.cell, claim.slot);
      if (grid.occupiedByCellSlot.has(key)) {
        throw new EngineError('subcell_state_invalid',
          `Duplicate subcell slot ${claim.slot} at cell (${position.x}, ${position.y})`,
          { details: { slot: claim.slot, x: position.x, y: position.y } },
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
    throw new EngineError('subcell_slots_empty', 'Subcell slot offsets must not be empty');
  }

  const seen = new Set<string>();
  return Object.freeze(
    slots.map((slot) => {
      assertFiniteNumber(slot.x, 'Subcell slot x');
      assertFiniteNumber(slot.y, 'Subcell slot y');
      if (slot.x < 0 || slot.x >= 1 || slot.y < 0 || slot.y >= 1) {
        throw new EngineRangeError('subcell_slot_offset_invalid',
          `Subcell slot offset (${slot.x}, ${slot.y}) must be within [0, 1)`,
          { details: { x: slot.x, y: slot.y } },
        );
      }

      const key = `${slot.x},${slot.y}`;
      if (seen.has(key)) {
        throw new EngineError('subcell_slot_offset_duplicate', `Duplicate subcell slot offset (${slot.x}, ${slot.y})`, { details: { x: slot.x, y: slot.y } });
      }
      seen.add(key);
      return Object.freeze({ x: slot.x, y: slot.y });
    }),
  );
}

function normalizeSubcellSlotIndex(slot: number, slotCount: number): number {
  if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount) {
    throw new EngineRangeError('subcell_slot_out_of_bounds', `Subcell slot ${slot} is out of bounds`, { details: { slot } });
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
