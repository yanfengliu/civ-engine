import type { EntityId } from './types.js';
import type { OccupancyGrid } from './occupancy-cell-grid.js';
import type { SubcellOccupancyGrid } from './occupancy-subcell.js';
import type { OccupancyCellClaim, OccupancyCellStatus, OccupancyMetadata, OccupancyQueryOptions } from './occupancy-types.js';
import { assertGridPoint } from './occupancy-internal.js';
import { createEntityClaim, type OccupancyBindingEntityState } from './occupancy-binding-internal.js';

export interface BindingStatusSources {
  occupancy: OccupancyGrid;
  crowding: SubcellOccupancyGrid | null;
  entityStates: Map<EntityId, OccupancyBindingEntityState>;
  staticMetadataByCell: Map<number, OccupancyMetadata>;
  placementOnly: ReadonlySet<EntityId>;
  metrics: { cellStatusQueries: number; crowdedSlotChecks: number };
}

export function getBindingCellStatus(
  sources: BindingStatusSources, x: number, y: number, options?: OccupancyQueryOptions,
): OccupancyCellStatus {
  const { occupancy, crowding, entityStates, staticMetadataByCell, placementOnly, metrics } = sources;
  assertGridPoint(x, y, occupancy.width, occupancy.height);
  metrics.cellStatusQueries++;

  const blockedBy: OccupancyCellClaim[] = [];
  const crowdedBy: OccupancyCellClaim[] = [];
  const ignoreEntity = options?.ignoreEntity;
  const includeReservations = options?.includeReservations ?? true;
  const cell = y * occupancy.width + x;

  const staticMetadata = staticMetadataByCell.get(cell);
  if (staticMetadata) {
    blockedBy.push({
      entity: null,
      kind: staticMetadata.kind,
      claim: 'blocked',
    });
  }

  const occupant = occupancy.getOccupant(x, y);
  if (occupant !== null && occupant !== ignoreEntity) {
    const claim = createEntityClaim(entityStates, occupant, 'occupied');
    if (placementOnly.has(occupant)) claim.blocksMovement = false;
    blockedBy.push(claim);
  }

  if (includeReservations) {
    const reservationOwner = occupancy.getReservationOwner(x, y);
    if (reservationOwner !== null && reservationOwner !== ignoreEntity) {
      blockedBy.push(createEntityClaim(entityStates, reservationOwner, 'reserved'));
    }
  }

  if (crowding) {
    for (let slot = 0; slot < crowding.slots.length; slot++) {
      metrics.crowdedSlotChecks++;
      const crowdedEntity = crowding.getSlotOccupant(x, y, slot);
      if (crowdedEntity === null || crowdedEntity === ignoreEntity) {
        continue;
      }
      crowdedBy.push(
        createEntityClaim(entityStates, crowdedEntity, 'subcell', {
          slot,
          offset: { ...crowding.slots[slot]! },
        }),
      );
    }
  }

  const freeSubcellSlots = crowding
    ? crowding.slots.length - crowdedBy.length
    : null;

  return {
    position: { x, y },
    blocked: (placementOnly.size === 0 ? blockedBy.length > 0
      : blockedBy.some((claim) => claim.blocksMovement !== false)) || freeSubcellSlots === 0,
    blockedBy,
    crowdedBy,
    freeSubcellSlots,
  };
}
