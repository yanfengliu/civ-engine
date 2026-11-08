# RTS Primitives Guide

This guide covers the engine-level utilities that make an RTS-scale simulation practical: occupancy and reservation, sub-cell crowding, queued path requests, fog and visibility, and the benchmark harness.

## Table of Contents

1. [Occupancy and Reservation](#occupancy-and-reservation)
2. [Sub-Cell Crowding](#sub-cell-crowding)
3. [Grid Pathfinding and Queues](#grid-pathfinding-and-queues)
4. [Fog and Visibility](#fog-and-visibility)
5. [Benchmarking](#benchmarking)

---

## Occupancy and Reservation

Use `OccupancyGrid` when the question is "can something stand here?" or "is this footprint reserved?" and you only need the low-level footprint primitive.

Use `OccupancyBinding` when the game also needs:

- blocker metadata such as building-vs-resource-vs-unit
- automatic destroy-time cleanup through `world.onDestroy()`
- one passability surface that owns both whole-cell blockers and optional sub-cell crowding
- measurable occupancy and crowding scan counters for benchmarks

When crowding is enabled, the binding treats fully packed subcell slots as blocked for passability and rejects solid whole-cell claims over other crowded units. An opt-in `occupy(entity, area, { blocksMovement:false })` claim can reserve placement beneath those units while allowing them to move.

It is intentionally separate from `SpatialGrid`:

- `SpatialGrid` answers who is near a cell.
- `OccupancyGrid` answers whether a cell or footprint is blocked, occupied, or reserved.

```typescript
import { OccupancyBinding } from 'civ-engine';

const occupancy = new OccupancyBinding(128, 128);

occupancy.block([{ x: 10, y: 10 }], {
  metadata: { kind: 'terrain' },
});
occupancy.occupy(100, { x: 20, y: 20, width: 4, height: 4 }, {
  metadata: { kind: 'building' },
});
occupancy.reserve(200, [{ x: 24, y: 20 }], {
  metadata: { kind: 'resource' },
});

const status = occupancy.getCellStatus(20, 20);
status.blockedBy; // [{ entity: 100, kind: 'building', claim: 'occupied' }]
```

For bounded blocker inspection, pass a binding to `createOccupancyBindingDebugProbe(key, binding, { region, maxCells, maxClaims })`. It reports detached identities/kinds/reservations/subcells and explicit truncation, with normal query metrics. It exposes no mutable grid or sampled counts presented as global totals.

Useful `OccupancyBinding` APIs:

- `block(area)` / `unblock(area)` — entity-less terrain (walls, cliffs, world geometry)
- `occupy(entity, area)` — entity-owned footprint
- `reserve(entity, area)` — short-lived entity-owned hold
- `clearReservation(entity)`
- `release(entity)`
- `isBlocked(x, y, options?)` — `options.ignoreEntity` ignores that entity’s footprint, reservation and subcell claims for movement/capacity queries, not static blocks
- `getCellStatus(x, y, options?)`
- `attachWorld(world)` / `detachWorld()`
- `getMetrics()` / `resetMetrics()`

**Static blocks vs occupancy.** `block()` is for terrain — cells that are impassable to everyone, with no notion of an owner. It does not accept an entity argument and is not affected by `options.ignoreEntity`. If you want a cell that blocks others but not the entity that placed it (a barricade, a construction site, an entity's own footprint), use `occupy(entity, area)` with an appropriately long lifetime — that path tracks the owner and `ignoreEntity` works correctly. Modeling all entity-blocking as occupancy keeps the passability surface simple and deterministic.

For a farm or unstarted foundation that excludes new structures but admits units, select the policy explicitly; metadata labels never select it:

```typescript
occupancy.occupy(300, [{ x: 30, y: 20 }], {
  metadata: { kind: 'farm' }, blocksMovement: false,
});
occupancy.occupySubcell(400, { x: 30, y: 20 }); // succeeds when a slot is free
occupancy.occupy(500, [{ x: 30, y: 20 }]); // false: placement remains owned
```

The false-tagged occupied entry stays in `getCellStatus().blockedBy`; read `blocked` for movement. A same-owner reservation remains a separate blocker, unless the query sets `includeReservations:false`. Omit the policy on a later occupy call to restore a solid footprint; this fails unchanged if another unit remains beneath it. Identical claims do not increment the version. Invalid metadata is checked before mutations/conflicts in occupy/reserve/occupySubcell. Release, destroy cleanup and conversion to a slot clear the movement policy. Games own which objects are passable and reapply this runtime choice after loading.

Use raw `OccupancyGrid` when you need deterministic serialization snapshots (`OccupancyBinding` has no getState):

```typescript
const rawOccupancy = new OccupancyGrid(128, 128);
const snapshot = rawOccupancy.getState();
const restored = OccupancyGrid.fromState(snapshot);
```

## Sub-Cell Crowding

Use `SubcellOccupancyGrid` directly for the raw primitive, or `OccupancyBinding` when the same game also needs blocker metadata and lifecycle cleanup.

The higher-level binding is designed to layer whole-cell blockers and crowding together:

- `OccupancyBinding` owns building/resource/unit metadata plus destroy-time cleanup.
- `SubcellOccupancyGrid` still provides the deterministic slot-packing primitive under that binding.
- Fully crowded cells feed back into `isBlocked()` so `findGridPath()` and local crowding checks stay in sync.

```typescript
import { OccupancyBinding } from 'civ-engine';

const occupancy = new OccupancyBinding(128, 128);

occupancy.occupy(100, { x: 20, y: 20, width: 4, height: 4 }, {
  metadata: { kind: 'building' },
});

const placement = occupancy.occupySubcell(200, { x: 24, y: 20 }, {
  metadata: { kind: 'unit' },
});
if (placement) {
  placement.slot;   // deterministic slot index
  placement.offset; // relative offset within the cell
}

const egress = occupancy.neighborsWithSpace(200, { x: 24, y: 20 });
```

Useful crowding APIs on the binding:

- `canOccupySubcell(entity, position, options?)`
- `bestSubcellPlacement(entity, position, options?)`
- `occupySubcell(entity, position, options?)`
- `neighborsWithSpace(entity, origin, options?)`
- `release(entity)`

By default the grid uses four quarter-cell slots:

- `{ x: 0, y: 0 }`
- `{ x: 0.5, y: 0 }`
- `{ x: 0, y: 0.5 }`
- `{ x: 0.5, y: 0.5 }`

You can provide a custom `slots` array if your game wants a different packing pattern.

## Grid Pathfinding and Queues

The generic `findPath()` utility still exists, but RTS code usually wants a grid-first helper and a request queue.

For many origins sharing destinations, compute one `gridDistanceField` instead of asking for a separate path per origin. It accepts the same occupancy/blocking, corner and cost vocabulary as `findGridPath`; asymmetric `cost(from, to)` retains the direction of travel towards the destination. Recompute when those inputs change, since the helper owns no invalidation cache.

```typescript
import { gridDistanceField } from 'civ-engine';
const field = gridDistanceField([{ x: 12, y: 8 }, { x: 40, y: 25 }], { occupancy });
const index = cell.y * field.width + cell.x;
const travelCost = field.distances[index]; // Infinity if unreachable
const destinationIndex = field.sourceIndices[index]; // -1 if unreachable
```
Use `findGridPath()` for one-off grid paths:

```typescript
import { findGridPath } from 'civ-engine';

const result = findGridPath({
  occupancy,
  movingEntity: 200,
  start: { x: 24, y: 20 },
  goal: { x: 80, y: 65 },
  allowDiagonal: false,
});
```

Use `createGridPathQueue()` when many requests must be spread across ticks:

```typescript
import { createGridPathQueue } from 'civ-engine';

const queue = createGridPathQueue({ occupancy });

queue.enqueue({
  start: { x: 24, y: 20 },
  goal: { x: 80, y: 65 },
});

queue.enqueue({
  start: { x: 10, y: 12 },
  goal: { x: 50, y: 90 },
});

const completed = queue.process(1); // process one request this tick
```

The queue provides:

- Deterministic FIFO ordering
- Per-call request budgets
- Optional cache support through `PathCache`
- Automatic cache invalidation when `OccupancyGrid.version` changes

If you use custom cost or blocked callbacks, provide an explicit `cacheKey` and `passabilityVersion` if you want caching. Otherwise the queue safely bypasses the cache for that request.

## Fog and Visibility

Use `VisibilityMap` for per-player visible and explored cells. To project the world's observation surfaces (snapshot, per-tick changes, events, world state) through that visibility — so a fog-of-war agent or client sees only what its player sees — compose it with `PlayerObserver` (v0.8.20, `docs/api-reference.md` § "PlayerObserver"): one observer per player, `observeTick()` after each step, with explicit entered/updated/exited transition semantics that raw diff filtering cannot express.

```typescript
import { VisibilityMap } from 'civ-engine';

const visibility = new VisibilityMap(128, 128);

visibility.setSource('player-1', 'town-center', {
  x: 40,
  y: 40,
  radius: 8,
});
visibility.update();

visibility.isVisible('player-1', 42, 40);  // true
visibility.isExplored('player-1', 42, 40); // true
```

Source centers may be finite fractions inside the map. Visibility is evaluated at integer cell coordinates using the inclusive circle equation, without rounding or a half-cell offset. Batch source edits before calling `update()`; only the final positions contribute to explored history. Point queries still require integers. For a moving source:

```typescript
visibility.setSource('player-1', 'scout-17', {
  x: 60.5,
  y: 12.25,
  radius: 5,
});
visibility.update();
```

The map tracks:

- Current visibility
- Persistent explored state
- Multiple players independently
- Serializable state via `getState()` / `fromState()`
- Deterministic metrics via `getMetrics()` / `resetMetrics()` (recomputes, computed cells, visibility queries — parity with `OccupancyGrid`)

Repeated `getState()` and `getSources()` calls reuse private canonical orderings. Membership changes invalidate key order; genuinely new explored cells invalidate cell order. Returned arrays/source objects are still fresh, and snapshot construction still copies O(output size) data. The tradeoff is retained ID/cell arrays. Source rasterization and the three existing metrics are unchanged. Saved-state fields and old integer values remain unchanged; fractional centers require a reader supporting them and are rejected by older integer-only readers.

## Benchmarking

Run the built-in RTS benchmark harness with:

```bash
npm run benchmark:rts
```

Optional output modes:

```bash
npm run benchmark:rts -- --format markdown
npm run benchmark:rts -- --stress
```

The benchmark emits deterministic scenarios and reports:

- Tick duration
- Query cache hits, misses, and membership checks (`query.membershipChecks` — a tier-1 exact counter, stressed hardest by the churn scenario)
- Spatial explicit sync counts (`spatial.explicitSyncs`)
- Diff size
- Path request cost
- Occupancy benchmark counts for buildings, resources, and units
- Occupancy and crowding scan counters (`blockedQueries`, `claimCellChecks`, `cellStatusQueries`, `crowdedSlotChecks`, `slotChecks`)
- Memory-sensitive counts from `process.memoryUsage()`

Use this before making storage or scheduling changes. It is there to keep RTS-scale work driven by measured bottlenecks instead of guesswork.
