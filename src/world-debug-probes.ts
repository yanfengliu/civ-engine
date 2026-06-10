// Standalone-utility debug probes (occupancy, visibility, path queue) for
// `WorldDebugger`. Extracted from `src/world-debugger.ts` (LOC-budget split,
// v0.8.15); re-exported from there so the import path and `index.ts`
// star-export are unchanged.

import type { OccupancyGrid } from './occupancy-grid.js';
import type { PathRequestQueueStats } from './path-service.js';
import type { VisibilityMap, VisibilityPlayerId } from './visibility-map.js';
import type { EntityId } from './types.js';
import type {
  DebugProbe,
  OccupancyDebugSnapshot,
  VisibilityDebugSnapshot,
  VisibilityPlayerDebugSnapshot,
} from './world-debugger.js';

export function createOccupancyDebugProbe(
  key: string,
  occupancy: OccupancyGrid,
): DebugProbe<OccupancyDebugSnapshot> {
  return {
    key,
    capture: () => {
      const state = occupancy.getState();
      return {
        width: state.width,
        height: state.height,
        version: state.version,
        blockedCells: state.blocked.length,
        occupiedEntities: state.occupied.length,
        occupiedCells: sumCellClaims(state.occupied),
        reservedEntities: state.reservations.length,
        reservedCells: sumCellClaims(state.reservations),
      };
    },
  };
}

export function createVisibilityDebugProbe(
  key: string,
  visibility: VisibilityMap,
): DebugProbe<VisibilityDebugSnapshot> {
  return {
    key,
    capture: () => {
      const state = visibility.getState();
      return {
        width: state.width,
        height: state.height,
        players: state.players
          .map(([playerId, player]) => ({
            playerId,
            sourceCount: player.sources.length,
            visibleCells: visibility.getVisibleCells(playerId).length,
            exploredCells: player.explored.length,
          }))
          .sort(compareByPlayerId),
      };
    },
  };
}

export function createPathQueueDebugProbe(
  key: string,
  queue: { getStats(): PathRequestQueueStats },
): DebugProbe<PathRequestQueueStats> {
  return {
    key,
    capture: () => queue.getStats(),
  };
}

function sumCellClaims(
  claims: Array<[EntityId, number[]]>,
): number {
  return claims.reduce((sum, [, cells]) => sum + cells.length, 0);
}

function compareByPlayerId(
  a: VisibilityPlayerDebugSnapshot,
  b: VisibilityPlayerDebugSnapshot,
): number {
  return normalizePlayerId(a.playerId).localeCompare(normalizePlayerId(b.playerId));
}

function normalizePlayerId(playerId: VisibilityPlayerId): string {
  return typeof playerId === 'number' ? `n:${playerId}` : `s:${playerId}`;
}
