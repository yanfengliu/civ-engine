# Pathfinding Guide

This guide covers the generic A* pathfinding module and the grid-first helpers built on top of it.

## Table of Contents

1. [Overview](#overview)
2. [Basic Usage](#basic-usage)
3. [Grid Pathfinding](#grid-pathfinding)
4. [Blocked Cells and Terrain Cost](#blocked-cells-and-terrain-cost)
5. [Queued Path Requests](#queued-path-requests)
6. [Non-Grid Graphs](#non-grid-graphs)
7. [Performance Tuning](#performance-tuning)
8. [Integration with ECS](#integration-with-ecs)

---

## Overview

The engine exposes two layers:

- `findPath()` is the generic A* implementation for any graph topology.
- `findGridPath()` is the common 2D-grid adapter that returns `Position[]`.

Use `findPath()` when your graph is not a tile grid or when you need full control over node encoding. Use `findGridPath()` for most RTS or sim movement on integer cell coordinates.

## Basic Usage

```typescript
import { findPath, type PathResult } from 'civ-engine';

const result = findPath<number>({
  start: 0,
  goal: 10,
  neighbors: (node) => [node - 1, node + 1].filter((n) => n >= 0 && n <= 10),
  cost: () => 1,
  heuristic: (node, goal) => Math.abs(node - goal),
  hash: (node) => node,
});

if (result) {
  console.log(result.path);
  console.log(result.cost);
}
```

Returns `null` if no path exists, if the cost ceiling is exceeded, or if the search hits `maxIterations`.

## Grid Pathfinding

For ordinary tile movement, use `findGridPath()`:

```typescript
import { findGridPath } from 'civ-engine';

const result = findGridPath({
  width: 32,
  height: 32,
  start: { x: 0, y: 0 },
  goal: { x: 10, y: 10 },
});
```

The returned path is already in coordinate form:

```typescript
if (result) {
  console.log(result.path);
  // [{ x: 0, y: 0 }, { x: 1, y: 0 }, ..., { x: 10, y: 10 }]
}
```

### Diagonal movement

```typescript
const result = findGridPath({
  width: 32,
  height: 32,
  start: { x: 0, y: 0 },
  goal: { x: 10, y: 10 },
  allowDiagonal: true,
  preventCornerCutting: true,
});
```

By default:

- movement is orthogonal only
- diagonal cost uses `Math.SQRT2`
- corner cutting is blocked when diagonal movement is enabled

## Blocked Cells and Terrain Cost

### Impassable cells

Use the `blocked(x, y)` callback for custom passability:

```typescript
const walls = new Set(['4,3', '4,4', '4,5']);

const result = findGridPath({
  width: 32,
  height: 32,
  start: { x: 0, y: 0 },
  goal: { x: 10, y: 10 },
  blocked: (x, y) => walls.has(`${x},${y}`),
});
```

### Variable terrain costs

```typescript
const result = findGridPath({
  width: WIDTH,
  height: HEIGHT,
  start: { x: 0, y: 0 },
  goal: { x: 10, y: 10 },
  cost: (_from, to) => {
    const tile = tiles[to.y][to.x];
    const terrain = world.getComponent<{ type: string }>(tile, 'terrain');
    if (!terrain) return 1;

    switch (terrain.type) {
      case 'road':
        return 0.5;
      case 'grass':
        return 1;
      case 'forest':
        return 2;
      case 'mountain':
        return 4;
      case 'water':
        return Infinity;
      default:
        return 1;
    }
  },
});
```

### Occupancy-aware pathfinding

For unit or building collisions, pair `findGridPath()` with `OccupancyGrid`:

```typescript
import { OccupancyGrid, findGridPath } from 'civ-engine';

const occupancy = new OccupancyGrid(64, 64);
occupancy.block([{ x: 12, y: 7 }]);
occupancy.occupy(100, { x: 20, y: 20, width: 2, height: 2 });

const result = findGridPath({
  occupancy,
  movingEntity: 200,
  start: { x: 4, y: 4 },
  goal: { x: 30, y: 18 },
});
```

When `occupancy` is supplied, `width` and `height` can be omitted.

## Queued Path Requests

For RTS-scale work, path requests should usually be spread across ticks instead of all resolving in one system pass.

```typescript
import { createGridPathQueue } from 'civ-engine';

const queue = createGridPathQueue({ occupancy });

queue.enqueue({
  start: { x: 4, y: 4 },
  goal: { x: 30, y: 18 },
});

queue.enqueue({
  start: { x: 9, y: 9 },
  goal: { x: 50, y: 40 },
});

const completed = queue.process(1);
```

The queue provides:

- deterministic FIFO ordering
- per-call request budgets
- optional caching through `PathCache`
- cache invalidation through `OccupancyGrid.version` or `passabilityVersion`

If you use custom `blocked`, `cost`, or `heuristic` callbacks, provide an explicit `cacheKey` and `passabilityVersion` if you want those requests to be cached.

## Non-Grid Graphs

The pathfinder still works on any graph, not just grids:

```typescript
interface RoomNode {
  id: string;
  x: number;
  y: number;
}

const rooms: Map<string, RoomNode> = new Map([
  ['entrance', { id: 'entrance', x: 0, y: 0 }],
  ['hallway', { id: 'hallway', x: 5, y: 0 }],
  ['treasury', { id: 'treasury', x: 10, y: 5 }],
]);

const connections: Record<string, string[]> = {
  entrance: ['hallway'],
  hallway: ['entrance', 'treasury'],
  treasury: ['hallway'],
};

const result = findPath<string>({
  start: 'entrance',
  goal: 'treasury',
  neighbors: (room) => connections[room] ?? [],
  cost: (from, to) => {
    const a = rooms.get(from)!;
    const b = rooms.get(to)!;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  },
  heuristic: (room, goal) => {
    const a = rooms.get(room)!;
    const b = rooms.get(goal)!;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  },
  hash: (room) => room,
});
```

## Performance Tuning

### `maxIterations`

```typescript
findGridPath({
  width: WIDTH,
  height: HEIGHT,
  start,
  goal,
  maxIterations: 50_000,
});
```

### `maxCost`

```typescript
findGridPath({
  width: WIDTH,
  height: HEIGHT,
  start,
  goal,
  maxCost: 100,
});
```

### `trackExplored`

```typescript
const result = findGridPath({
  width: WIDTH,
  height: HEIGHT,
  start,
  goal,
  trackExplored: true,
});

if (result) {
  console.log(`Explored ${result.explored} nodes`);
}
```

### Heuristic quality

The default grid heuristics are sensible for orthogonal and diagonal movement. Override `heuristic` only when you understand the tradeoff between speed and optimality.

## Integration with ECS

### Pathfinding as a command handler

```typescript
world.registerHandler('moveUnit', (data, w) => {
  const pos = w.getComponent<Position>(data.entityId, 'position')!;

  const result = findGridPath({
    occupancy,
    movingEntity: data.entityId,
    start: pos,
    goal: { x: data.targetX, y: data.targetY },
  });

  if (result) {
    w.addComponent(data.entityId, 'moveTo', {
      path: result.path.slice(1),
      step: 0,
    });
  }
});
```

### Movement system consuming paths

```typescript
function movementSystem(w: World): void {
  for (const id of w.query('position', 'moveTo')) {
    const moveTo = w.getComponent<MoveTo>(id, 'moveTo')!;

    if (moveTo.step >= moveTo.path.length) {
      w.removeComponent(id, 'moveTo');
      continue;
    }

    const next = moveTo.path[moveTo.step];
    w.setPosition(id, next);
    moveTo.step++;
  }
}
```

### Re-pathing

```typescript
function repathSystem(w: World): void {
  for (const id of w.query('position', 'moveTo', 'moveTarget')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const moveTo = w.getComponent<MoveTo>(id, 'moveTo')!;
    const target = w.getComponent<MoveTarget>(id, 'moveTarget')!;

    if (moveTo.step >= moveTo.path.length) continue;

    const next = moveTo.path[moveTo.step];
    if (occupancy.isBlocked(next.x, next.y, { ignoreEntity: id })) {
      const result = findGridPath({
        occupancy,
        movingEntity: id,
        start: pos,
        goal: target,
      });

      if (result) {
        w.addComponent(id, 'moveTo', { path: result.path.slice(1), step: 0 });
      } else {
        w.removeComponent(id, 'moveTo');
      }
    }
  }
}
```

For a broader RTS-oriented setup, see [RTS Primitives](rts-primitives.md).
