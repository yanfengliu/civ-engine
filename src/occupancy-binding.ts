import { EngineError } from './engine-error.js';
import type { EntityId, Position } from './types.js';
import type {
  GridPassability,
  OccupancyArea,
  OccupancyBindingClaimOptions,
  OccupancyBindingOccupyOptions,
  OccupancyBindingMetrics,
  OccupancyBindingOptions,
  OccupancyBindingSubcellOptions,
  OccupancyBindingWorldHooks,
  OccupancyCellStatus,
  OccupancyMetadata,
  OccupancyQueryOptions,
  SubcellNeighborSpace,
  SubcellPlacement,
} from './occupancy-types.js';
import { OccupancyGrid } from './occupancy-cell-grid.js';
import { SubcellOccupancyGrid } from './occupancy-subcell.js';
import {
  assertGridPoint,
  assertPositiveInteger,
  normalizeOccupancyArea,
} from './occupancy-internal.js';
import {
  type OccupancyBindingEntityState,
  getEntityMetadata,
  normalizeOccupancyMetadata,
  sameOccupancyMetadata,
  setEntityState,
  toSubcellNeighborOptions,
  toSubcellOccupancyOptions,
} from './occupancy-binding-internal.js';

import { isMovementBlocked, normalizeMovementPolicy, setMovementPolicy } from './occupancy-binding-policy.js';
import { type BindingStatusSources, getBindingCellStatus } from './occupancy-binding-status.js';

export class OccupancyBinding implements GridPassability {
  readonly width: number;
  readonly height: number;
  private readonly occupancy: OccupancyGrid;
  private readonly crowding: SubcellOccupancyGrid | null;
  private staticMetadataByCell = new Map<number, OccupancyMetadata>();
  private entityStates = new Map<EntityId, OccupancyBindingEntityState>();
  private readonly placementOnly = new Set<EntityId>();
  private readonly statusSources: BindingStatusSources;
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
          if (isMovementBlocked(this.occupancy, this.placementOnly, x, y, queryOptions)) {
            return true;
          }
          return userBlocked?.(x, y, queryOptions) ?? false;
        },
      });
    }

    this.statusSources = {
      occupancy: this.occupancy, crowding: this.crowding, entityStates: this.entityStates,
      staticMetadataByCell: this.staticMetadataByCell, placementOnly: this.placementOnly, metrics: this.metrics,
    };
    if (options.world) {
      this.attachWorld(options.world);
    }
  }

  get version(): number {
    return this._version;
  }

  isBlocked(x: number, y: number, options?: OccupancyQueryOptions): boolean {
    if (isMovementBlocked(this.occupancy, this.placementOnly, x, y, options)) {
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
      throw new EngineError('occupancy_block_crowded',
        `Cannot block cells that still contain crowded occupants (${x}, ${y})`,
        { details: { x, y } },
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
    options: OccupancyBindingOccupyOptions = {},
  ): boolean {
    const cells = normalizeOccupancyArea(area, this.width, this.height);
    const metadata = getEntityMetadata(this.entityStates, entity, options.metadata, 'occupied');
    const blocksMovement = normalizeMovementPolicy(options.blocksMovement);
    if (blocksMovement && this.findCrowdingConflictCell(cells, entity) !== null) {
      return false;
    }

    const beforeOccupancyVersion = this.occupancy.version;
    const beforeCrowdingVersion = this.crowding?.version ?? 0;
    if (!this.occupancy.occupy(entity, area)) {
      return false;
    }

    let changed = setMovementPolicy(this.placementOnly, entity, blocksMovement)
      || beforeOccupancyVersion !== this.occupancy.version;
    if (this.crowding) {
      this.crowding.release(entity);
      changed = this.crowding.version !== beforeCrowdingVersion || changed;
    }
    changed = setEntityState(this.entityStates, entity, {
      metadata,
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
    const cells = normalizeOccupancyArea(area, this.width, this.height);
    const metadata = getEntityMetadata(this.entityStates, entity, options.metadata, 'reserved');
    const crowdedCell = this.findCrowdingConflictCell(cells, entity);
    if (crowdedCell !== null) {
      return false;
    }

    const beforeVersion = this.occupancy.version;
    if (!this.occupancy.reserve(entity, area)) {
      return false;
    }

    const changed =
      setEntityState(this.entityStates, entity, {
        metadata,
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
      setEntityState(this.entityStates, entity, {
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
    assertGridPoint(position.x, position.y, this.width, this.height);
    const metadata = getEntityMetadata(this.entityStates, entity, options.metadata, 'subcell');
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
    const policyChanged = this.placementOnly.delete(entity);
    const changed =
      setEntityState(this.entityStates, entity, {
        metadata,
        fallbackKind: 'subcell',
        occupied: false,
        reserved: false,
        subcell: true,
      }) ||
      policyChanged || crowding.version !== beforeCrowdingVersion ||
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
    const policyChanged = this.placementOnly.delete(entity);

    const changed =
      setEntityState(this.entityStates, entity, {
        fallbackKind: this.entityStates.get(entity)?.metadata.kind ?? 'occupied',
        occupied: false,
        reserved: false,
        subcell: false,
      }) ||
      this.occupancy.version !== beforeOccupancyVersion ||
      (this.crowding?.version ?? 0) !== beforeCrowdingVersion || policyChanged;
    this.bumpVersion(changed);
  }

  getCellStatus(
    x: number,
    y: number,
    options?: OccupancyQueryOptions,
  ): OccupancyCellStatus {
    return getBindingCellStatus(this.statusSources, x, y, options);
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
    this.metrics.cellStatusQueries = 0;
    this.metrics.crowdedSlotChecks = 0;
    this.occupancy.resetMetrics();
    this.crowding?.resetMetrics();
  }

  private requireCrowding(): SubcellOccupancyGrid {
    if (!this.crowding) {
      throw new EngineError('occupancy_crowding_disabled', 'OccupancyBinding crowding is disabled');
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

  private bumpVersion(changed: boolean): void {
    if (changed) {
      this._version++;
    }
  }

  private toPosition(index: number): Position {
    return {
      x: index % this.width,
      y: Math.floor(index / this.width),
    };
  }
}
