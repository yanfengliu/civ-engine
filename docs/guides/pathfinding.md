# Pathfinding Guide

This guide covers the generic A* pathfinding module and how to use it with the spatial grid.

## Table of Contents

1. [Overview](#overview)
2. [Basic Usage](#basic-usage)
3. [Grid Pathfinding](#grid-pathfinding)
4. [Blocked Cells and Terrain Cost](#blocked-cells-and-terrain-cost)
5. [Non-Grid Graphs](#non-grid-graphs)
6. [Performance Tuning](#performance-tuning)
7. [Integration with ECS](#integration-with-ecs)

---

## Overview

The pathfinding module provides a generic A* implementation that works on **any graph topology**. It has no knowledge of the spatial grid, entities, or the tick loop. You wire it to your game's graph by providing four callbacks:

| Callback | Purpose |
|---|---|
| `neighbors(node)` | Returns adjacent nodes |
| `cost(from, to)` | Returns the edge cost (Infinity = impassable) |
| `heuristic(node, goal)` | Estimated cost to goal (must be admissible for optimality) |
| `hash(node)` | Unique identifier for deduplication |

## Basic Usage

```typescript
import { findPath, type PathResult } from 'civ-engine';

const result = findPath<number>({
  start: 0,
  goal: 10,
  neighbors: (node) => [node - 1, node + 1].filter(n => n >= 0 && n <= 10),
  cost: () => 1,
  heuristic: (node, goal) => Math.abs(node - goal),
  hash: (node) => node,
});

if (result) {
  console.log(result.path); // [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  console.log(result.cost); // 10
}
```

Returns `null` if no path exists.

## Grid Pathfinding

The most common use case is pathfinding on the 2D grid. Encode cells as flat indices (`y * width + x`):

```typescript
const WIDTH = 32;
const HEIGHT = 32;

function findGridPath(
  fromX: number, fromY: number,
  toX: number, toY: number,
): PathResult<number> | null {
  return findPath<number>({
    start: fromY * WIDTH + fromX,
    goal: toY * WIDTH + toX,
    neighbors: (node) => {
      const x = node % WIDTH;
      const y = Math.floor(node / WIDTH);
      const result: number[] = [];
      if (x > 0) result.push(node - 1);
      if (x < WIDTH - 1) result.push(node + 1);
      if (y > 0) result.push(node - WIDTH);
      if (y < HEIGHT - 1) result.push(node + WIDTH);
      return result;
    },
    cost: () => 1,
    heuristic: (node, goal) => {
      return Math.abs((node % WIDTH) - (goal % WIDTH))
           + Math.abs(Math.floor(node / WIDTH) - Math.floor(goal / WIDTH));
    },
    hash: (node) => node,
  });
}
```

### Converting results to coordinates

```typescript
const result = findGridPath(0, 0, 10, 10);
if (result) {
  const coords = result.path.map(node => ({
    x: node % WIDTH,
    y: Math.floor(node / WIDTH),
  }));
  // [{x:0, y:0}, {x:1, y:0}, ..., {x:10, y:10}]
}
```

### Diagonal movement

Add diagonal neighbors for 8-directional movement:

```typescript
neighbors: (node) => {
  const x = node % WIDTH;
  const y = Math.floor(node / WIDTH);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT) {
        result.push(ny * WIDTH + nx);
      }
    }
  }
  return result;
},
cost: (from, to) => {
  const fx = from % WIDTH;
  const fy = Math.floor(from / WIDTH);
  const tx = to % WIDTH;
  const ty = Math.floor(to / WIDTH);
  // Diagonal costs more (sqrt(2) ≈ 1.414)
  return (fx !== tx && fy !== ty) ? 1.414 : 1;
},
heuristic: (node, goal) => {
  // Octile distance for 8-directional movement
  const dx = Math.abs((node % WIDTH) - (goal % WIDTH));
  const dy = Math.abs(Math.floor(node / WIDTH) - Math.floor(goal / WIDTH));
  return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
},
```

## Blocked Cells and Terrain Cost

### Impassable cells

Return `Infinity` from the `cost` function to mark cells as impassable:

```typescript
cost: (from, to) => {
  const x = to % WIDTH;
  const y = Math.floor(to / WIDTH);
  // Check if tile is blocked (e.g., has a 'wall' component)
  const entities = world.grid.getAt(x, y);
  if (entities) {
    for (const id of entities) {
      if (world.getComponent(id, 'wall')) return Infinity;
    }
  }
  return 1;
},
```

### Variable terrain costs

```typescript
cost: (from, to) => {
  const x = to % WIDTH;
  const y = Math.floor(to / WIDTH);
  const tile = tiles[y][x];
  const terrain = world.getComponent<{ type: string }>(tile, 'terrain');
  if (!terrain) return 1;
  
  switch (terrain.type) {
    case 'road': return 0.5;
    case 'grass': return 1;
    case 'forest': return 2;
    case 'mountain': return 4;
    case 'water': return Infinity;
    default: return 1;
  }
},
```

### Entity avoidance

Route around occupied cells:

```typescript
cost: (from, to) => {
  const x = to % WIDTH;
  const y = Math.floor(to / WIDTH);
  const entities = world.grid.getAt(x, y);
  if (entities && entities.size > 0) {
    return 5; // high cost to discourage but not block
  }
  return 1;
},
```

## Non-Grid Graphs

The pathfinder works on any graph, not just grids. Use string hashes for non-numeric nodes:

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

Limits how many nodes A* explores before giving up. Default: `10,000`. Increase for large maps, decrease for tighter time budgets:

```typescript
findPath({
  // ...
  maxIterations: 50_000, // large map
});
```

### `maxCost`

Limits the total path cost. If the best-known cost exceeds this, the search terminates:

```typescript
findPath({
  // ...
  maxCost: 100, // don't find paths longer than 100 total cost
});
```

### `trackExplored`

Enable to see how many nodes were explored (useful for debugging performance):

```typescript
const result = findPath({
  // ...
  trackExplored: true,
});

if (result) {
  console.log(`Explored ${result.explored} nodes`);
}
```

### Heuristic quality

An **admissible** heuristic (never overestimates) guarantees optimal paths. An **inadmissible** heuristic (sometimes overestimates) finds paths faster but they may not be optimal. For game AI, slightly inadmissible heuristics are often acceptable:

```typescript
// Admissible (optimal paths, slower)
heuristic: (node, goal) => manhattanDistance(node, goal),

// Inadmissible (faster, possibly non-optimal)
heuristic: (node, goal) => manhattanDistance(node, goal) * 1.1,
```

## Integration with ECS

### Pathfinding as a command handler

```typescript
world.registerHandler('moveUnit', (data, w) => {
  const pos = w.getComponent<Position>(data.entityId, 'position')!;
  
  const result = findGridPath(pos.x, pos.y, data.targetX, data.targetY);
  if (result) {
    // Store path as a component, skip the first node (current position)
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
    const pos = w.getComponent<Position>(id, 'position')!;
    const moveTo = w.getComponent<MoveTo>(id, 'moveTo')!;

    if (moveTo.step >= moveTo.path.length) {
      w.removeComponent(id, 'moveTo'); // arrived
      continue;
    }

    const next = moveTo.path[moveTo.step];
    w.setPosition(id, { x: next % WIDTH, y: Math.floor(next / WIDTH) });
    moveTo.step++;
  }
}
```

### Re-pathing

Recompute paths when blocked:

```typescript
function repathSystem(w: World): void {
  for (const id of w.query('position', 'moveTo', 'moveTarget')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const moveTo = w.getComponent<MoveTo>(id, 'moveTo')!;
    const target = w.getComponent<MoveTarget>(id, 'moveTarget')!;

    if (moveTo.step >= moveTo.path.length) continue;

    // Check if next cell is now blocked
    const next = moveTo.path[moveTo.step];
    const nx = next % WIDTH;
    const ny = Math.floor(next / WIDTH);
    const occupants = w.grid.getAt(nx, ny);
    
    if (occupants && occupants.size > 0) {
      // Recompute path
      const result = findGridPath(pos.x, pos.y, target.x, target.y);
      if (result) {
        w.addComponent(id, 'moveTo', { path: result.path.slice(1), step: 0 });
      } else {
        w.removeComponent(id, 'moveTo'); // no path available
      }
    }
  }
}
```
