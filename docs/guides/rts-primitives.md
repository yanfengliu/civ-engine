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

When crowding is enabled, the binding treats fully packed sub-cell slots as blocked for passability and rejects whole-cell blockers that would be stamped on top of crowded units.

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

Useful `OccupancyBinding` APIs:

- `block(area)` / `unblock(area)` — entity-less terrain (walls, cliffs, world geometry)
- `occupy(entity, area)` — entity-owned footprint
- `reserve(entity, area)` — short-lived entity-owned hold
- `clearReservation(entity)`
- `release(entity)`
- `isBlocked(x, y, options?)` — `options.ignoreEntity` only ignores `occupy`/`reserve` claims of that entity, not static blocks
- `getCellStatus(x, y, options?)`
- `attachWorld(world)` / `detachWorld()`
- `getMetrics()` / `resetMetrics()`

**Static blocks vs occupancy.** `block()` is for terrain — cells that are impassable to everyone, with no notion of an owner. It does not accept an entity argument and is not affected by `options.ignoreEntity`. If you want a cell that blocks others but not the entity that placed it (a barricade, a construction site, an entity's own footprint), use `occupy(entity, area)` with an appropriately long lifetime — that path tracks the owner and `ignoreEntity` works correctly. Modeling all entity-blocking as occupancy keeps the passability surface simple and deterministic.

Use raw `OccupancyGrid` when you need deterministic serialization snapshots:

```typescript
const snapshot = occupancy.getState();
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

Use `VisibilityMap` for per-player visible and explored cells.

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

When a source moves, update only that source and recompute:

```typescript
visibility.setSource('player-1', 'scout-17', {
  x: 60,
  y: 12,
  radius: 5,
});
visibility.update();
```

The map tracks:

- Current visibility
- Persistent explored state
- Multiple players independently
- Serializable state via `getState()` / `fromState()`

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
- Query cache hits and misses
- Spatial sync scan counts
- Diff size
- Path request cost
- Occupancy benchmark counts for buildings, resources, and units
- Occupancy and crowding scan counters (`blockedQueries`, `claimCellChecks`, `cellStatusQueries`, `crowdedSlotChecks`, `slotChecks`)
- Memory-sensitive counts from `process.memoryUsage()`

Use this before making storage or scheduling changes. It is there to keep RTS-scale work driven by measured bottlenecks instead of guesswork.
