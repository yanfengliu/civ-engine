import { EngineError } from './engine-error.js';
import type { DebugProbe } from './world-debugger.js';
import type { OccupancyCellClaim, OccupancyCellStatus, OccupancyRect } from './occupancy-types.js';

/** Read-only occupancy observations; queries may increment source metrics. */
export interface OccupancyDebugSource {
  readonly width: number;
  readonly height: number;
  readonly version: number;
  getCellStatus(x: number, y: number): OccupancyCellStatus;
}
export interface OccupancyBindingDebugOptions {
  region: Readonly<OccupancyRect>;
  /** Maximum source reads, in row-major order. Default64; zero is allowed. */
  maxCells?: number;
  /** Maximum retained claims across all cells. Default256; zero is allowed. */
  maxClaims?: number;
}
export interface OccupancyBindingDebugSnapshot {
  width: number;
  height: number;
  version: number;
  region: OccupancyRect;
  requestedCells: number;
  omittedCells: number;
  omittedClaims: number;
  cells: Array<OccupancyCellStatus & { omittedClaims: number }>;
}

function invalid(field: string): never {
  throw new EngineError('occupancy_probe_options_invalid', 'Invalid occupancy probe ' + field, { details: { field } });
}
function nonnegative(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) invalid(field);
  return value;
}
function positive(value: number, field: string): number {
  if (nonnegative(value, field) === 0) invalid(field);
  return value;
}
function detachClaim(claim: OccupancyCellClaim): OccupancyCellClaim {
  return {
    entity: claim.entity, kind: claim.kind, claim: claim.claim,
    ...(claim.blocksMovement === undefined ? {} : { blocksMovement: claim.blocksMovement }),
    ...(claim.slot === undefined ? {} : { slot: claim.slot }),
    ...(claim.offset === undefined ? {} : { offset: { x: claim.offset.x, y: claim.offset.y } }),
  };
}

/** Bounded detail capture; no full-grid totals or mutable grid access. */
export function createOccupancyBindingDebugProbe(
  key: string, source: OccupancyDebugSource, options: OccupancyBindingDebugOptions,
): DebugProbe<OccupancyBindingDebugSnapshot> {
  const width = positive(source.width, 'width');
  const height = positive(source.height, 'height');
  const input = options?.region;
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('region');
  const region = {
    x: nonnegative(input.x, 'region.x'), y: nonnegative(input.y, 'region.y'),
    width: positive(input.width, 'region.width'), height: positive(input.height, 'region.height'),
  };
  if (region.x >= width || region.width > width - region.x
    || region.y >= height || region.height > height - region.y) invalid('region.bounds');
  const requestedCells = positive(region.width * region.height, 'region.area');
  const maxCells = nonnegative(options.maxCells === undefined ? 64 : options.maxCells, 'maxCells');
  const maxClaims = nonnegative(options.maxClaims === undefined ? 256 : options.maxClaims, 'maxClaims');
  return {
    key,
    capture: () => {
      const snapshot: OccupancyBindingDebugSnapshot = {
        width, height, version: source.version, region: { ...region }, requestedCells,
        omittedCells: requestedCells - Math.min(requestedCells, maxCells), omittedClaims: 0, cells: [],
      };
      let remainingClaims = maxClaims;
      for (let index = 0; index < Math.min(requestedCells, maxCells); index++) {
        const x = region.x + index % region.width;
        const y = region.y + Math.floor(index / region.width);
        const status = source.getCellStatus(x, y);
        const blockedBy = status.blockedBy.slice(0, remainingClaims).map(detachClaim);
        remainingClaims -= blockedBy.length;
        const crowdedBy = status.crowdedBy.slice(0, remainingClaims).map(detachClaim);
        remainingClaims -= crowdedBy.length;
        const omittedClaims = status.blockedBy.length + status.crowdedBy.length - blockedBy.length - crowdedBy.length;
        snapshot.omittedClaims += omittedClaims;
        snapshot.cells.push({
          position: { x: status.position.x, y: status.position.y },
          blocked: status.blocked, freeSubcellSlots: status.freeSubcellSlots,
          blockedBy, crowdedBy, omittedClaims,
        });
      }
      return snapshot;
    },
  };
}
