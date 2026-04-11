# RTS Primitives Guide

This guide covers the engine-level utilities that make an RTS-scale simulation practical: occupancy and reservation, queued path requests, fog and visibility, and the benchmark harness.

## Table of Contents

1. [Occupancy and Reservation](#occupancy-and-reservation)
2. [Grid Pathfinding and Queues](#grid-pathfinding-and-queues)
3. [Fog and Visibility](#fog-and-visibility)
4. [Benchmarking](#benchmarking)

---

## Occupancy and Reservation

Use `OccupancyGrid` when the question is "can something stand here?" or "is this footprint reserved?".

It is intentionally separate from `SpatialGrid`:

- `SpatialGrid` answers who is near a cell.
- `OccupancyGrid` answers whether a cell or footprint is blocked, occupied, or reserved.

```typescript
import { OccupancyGrid } from 'civ-engine';

const occupancy = new OccupancyGrid(128, 128);

occupancy.block([{ x: 10, y: 10 }]);
occupancy.occupy(100, { x: 20, y: 20, width: 4, height: 4 }); // building

if (occupancy.canReserve(200, [{ x: 24, y: 20 }])) {
  occupancy.reserve(200, [{ x: 24, y: 20 }]);
}
```

Useful APIs:

- `block(area)` / `unblock(area)`
- `occupy(entity, area)`
- `reserve(entity, area)`
- `clearReservation(entity)`
- `release(entity)`
- `isBlocked(x, y, options?)`

The grid is deterministic and serializable:

```typescript
const snapshot = occupancy.getState();
const restored = OccupancyGrid.fromState(snapshot);
```

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
- Memory-sensitive counts from `process.memoryUsage()`

Use this before making storage or scheduling changes. It is there to keep RTS-scale work driven by measured bottlenecks instead of guesswork.
