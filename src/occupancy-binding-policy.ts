import { EngineError } from './engine-error.js';
import type { EntityId } from './types.js';
import type { OccupancyGrid } from './occupancy-cell-grid.js';
import type { OccupancyQueryOptions } from './occupancy-types.js';

export function normalizeMovementPolicy(blocksMovement: boolean | undefined): boolean {
  if (blocksMovement !== undefined && typeof blocksMovement !== 'boolean') {
    throw new EngineError('occupancy_movement_policy_invalid', 'blocksMovement must be a boolean');
  }
  return blocksMovement ?? true;
}

export function setMovementPolicy(
  placementOnly: Set<EntityId>, entity: EntityId, blocksMovement: boolean,
): boolean {
  if (blocksMovement) return placementOnly.delete(entity);
  if (placementOnly.has(entity)) return false;
  placementOnly.add(entity);
  return true;
}

export function isMovementBlocked(
  occupancy: OccupancyGrid,
  placementOnly: ReadonlySet<EntityId>,
  x: number,
  y: number,
  options?: OccupancyQueryOptions,
): boolean {
  // The default hot path retains the raw query, without extra lookups or claims.
  if (placementOnly.size === 0) return occupancy.isBlocked(x, y, options);
  const occupant = occupancy.getOccupant(x, y);
  if (occupant === null || occupant === options?.ignoreEntity || !placementOnly.has(occupant)) {
    return occupancy.isBlocked(x, y, options);
  }
  // Ignore only the passable occupied claim. Its owner's reservation is separate.
  if (occupancy.isBlocked(x, y, { ignoreEntity: occupant, includeReservations: false })) return true;
  const reservation = options?.includeReservations === false ? null : occupancy.getReservationOwner(x, y);
  return reservation !== null && reservation !== options?.ignoreEntity;
}
