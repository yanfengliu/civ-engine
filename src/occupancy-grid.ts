// Barrel preserving the historical public surface of occupancy-grid.ts after
// the implementation was split across occupancy-types.ts, occupancy-cell-grid.ts,
// occupancy-subcell.ts, and occupancy-binding.ts to meet the 500-line budget.
export type {
  OccupancyRect,
  OccupancyArea,
  OccupancyQueryOptions,
  GridPassability,
  OccupancyGridState,
  OccupancyGridMetrics,
  SubcellSlotOffset,
  SubcellPlacement,
  SubcellNeighborSpace,
  SubcellOccupancyOptions,
  SubcellNeighborOptions,
  SubcellOccupancyGridOptions,
  SubcellOccupancyGridState,
  SubcellOccupancyGridMetrics,
  OccupancyMetadata,
  OccupancyClaimType,
  OccupancyCellClaim,
  OccupancyCellStatus,
  OccupancyBindingClaimOptions,
  OccupancyBindingSubcellOptions,
  OccupancyBindingWorldHooks,
  OccupancyBindingOptions,
  OccupancyBindingMetrics,
} from './occupancy-types.js';
export { OccupancyGrid } from './occupancy-cell-grid.js';
export { SubcellOccupancyGrid } from './occupancy-subcell.js';
export { OccupancyBinding } from './occupancy-binding.js';
