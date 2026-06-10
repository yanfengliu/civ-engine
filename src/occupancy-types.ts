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
