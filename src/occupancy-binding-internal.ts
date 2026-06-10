import type { EntityId } from './types.js';
import type {
  OccupancyBindingSubcellOptions,
  OccupancyCellClaim,
  OccupancyClaimType,
  OccupancyMetadata,
  SubcellNeighborOptions,
  SubcellOccupancyOptions,
  SubcellSlotOffset,
} from './occupancy-types.js';

export interface OccupancyBindingEntityState {
  metadata: OccupancyMetadata;
  occupied: boolean;
  reserved: boolean;
  subcell: boolean;
}

export function sameOccupancyMetadata(
  a: OccupancyMetadata,
  b: OccupancyMetadata,
): boolean {
  return a.kind === b.kind;
}

export function normalizeOccupancyMetadata(
  metadata: OccupancyMetadata | undefined,
  fallbackKind: string,
): OccupancyMetadata {
  const kind = metadata?.kind ?? fallbackKind;
  if (kind.length === 0) {
    throw new Error('Occupancy metadata kind must not be empty');
  }
  return { kind };
}

export function toSubcellOccupancyOptions(
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

export function toSubcellNeighborOptions(
  options?: OccupancyBindingSubcellOptions,
): SubcellNeighborOptions | undefined {
  if (!options) {
    return undefined;
  }
  return {
    ...toSubcellOccupancyOptions(options),
  };
}

export function setEntityState(
  entityStates: Map<EntityId, OccupancyBindingEntityState>,
  entity: EntityId,
  config: {
    metadata?: OccupancyMetadata;
    fallbackKind: string;
    occupied?: boolean;
    reserved?: boolean;
    subcell?: boolean;
  },
): boolean {
  const current = entityStates.get(entity);
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
    entityStates.delete(entity);
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

  entityStates.set(entity, next);
  return true;
}

export function createEntityClaim(
  entityStates: Map<EntityId, OccupancyBindingEntityState>,
  entity: EntityId,
  claim: OccupancyClaimType,
  options: {
    slot?: number;
    offset?: SubcellSlotOffset;
  } = {},
): OccupancyCellClaim {
  return {
    entity,
    kind: entityStates.get(entity)?.metadata.kind ?? claim,
    claim,
    ...(options.slot === undefined ? {} : { slot: options.slot }),
    ...(options.offset === undefined ? {} : { offset: options.offset }),
  };
}
