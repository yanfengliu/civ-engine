# Spatial Grid Guide

This guide covers the 2D spatial grid, how automatic synchronization works, and how to use spatial queries effectively.

## Table of Contents

1. [Overview](#overview)
2. [Automatic Synchronization](#automatic-synchronization)
3. [Querying the Grid](#querying-the-grid)
4. [Direction Offsets](#direction-offsets)
5. [Custom Position Key](#custom-position-key)
6. [Common Patterns](#common-patterns)

---

## Overview

The spatial grid is a sparse occupied-cell structure that tracks which entities are at each (x, y) cell. It is owned by the World. Use `world.setPosition()` for immediate component and grid updates, or mutate position components directly when next-tick grid sync is acceptable.

The grid exposed as `world.grid` is a read-only view. Mutating methods such as `insert()`, `remove()`, and `move()` are not available through the World API.

```typescript
const world = new World({ gridWidth: 64, gridHeight: 64, tps: 10 });
// world.grid is a read-only SpatialGridView with dimensions 64x64
```

## Synchronization

The grid is updated lock-step with position writes. Calling `world.setPosition(id, { x, y })` (or `world.setComponent(id, 'position', { x, y })` when `position` is the configured `positionKey`) inserts/moves the entity in the grid and updates the engine's `previousPositions` record in the same call. `world.removeComponent(id, 'position')` removes the entity from the grid.

In-place mutation of a position object (`world.getComponent(id, 'position').x = 5`) is **not** detected and the grid will not see the change. Game code must use `setPosition`/`setComponent` for movement to take effect.

```typescript
function movementSystem(w: World): void {
  for (const id of w.query('position', 'velocity')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const vel = w.getComponent<Velocity>(id, 'velocity')!;
    // setPosition keeps component state and grid state in sync immediately
    w.setPosition(id, { x: pos.x + vel.dx, y: pos.y + vel.dy });
  }
}
```

### Timing within a tick

```
syncSpatialIndex()  ← grid is up-to-date after this
system A            ← reads correct grid state
system B            ← reads correct grid state; direct position mutations
                       from system A are not reflected in the grid yet,
                       but setPosition updates the grid immediately
```

If system A directly mutates entity `5` from (0,0) to (1,0), system B (running after system A in the same tick) will still see entity `5` at (0,0) in the grid, but `getComponent('position')` will return (1,0). The grid updates at the start of the **next** tick. If system A calls `setPosition()`, both the component and grid reflect the move immediately.

## Querying the Grid

### Get entities at a cell

```typescript
const entities = world.grid.getAt(5, 3);
// Returns ReadonlySet<EntityId> | null
// null means no entities at that cell

if (entities) {
  console.log(`${entities.size} entities at (5, 3)`);
  for (const id of entities) {
    // process entity
  }
}
```

Throws `RangeError` for out-of-bounds coordinates:

```typescript
world.grid.getAt(-1, 0);  // RangeError: Position (-1, 0) is out of bounds
world.grid.getAt(64, 0);  // RangeError (if grid width is 64)
```

### Get neighbors

```typescript
import { ORTHOGONAL, DIAGONAL, ALL_DIRECTIONS } from 'civ-engine';

// 4 orthogonal neighbors (default)
const nearby = world.grid.getNeighbors(5, 3);

// 8 directions (orthogonal + diagonal)
const allNearby = world.grid.getNeighbors(5, 3, ALL_DIRECTIONS);

// Only diagonal
const diagNearby = world.grid.getNeighbors(5, 3, DIAGONAL);
```

Returns a flat `EntityId[]` of all entities in the neighboring cells. Automatically skips out-of-bounds cells (corners and edges have fewer neighbors).

Throws `RangeError` if the center position is out of bounds.

## Direction Offsets

Three built-in offset constants:

### `ORTHOGONAL` (default)

```
     [0,-1]
      ↑
[-1,0] ← → [1,0]
      ↓
     [0,1]
```

4 directions: up, down, left, right.

### `DIAGONAL`

```
[-1,-1]     [1,-1]
    ↖     ↗
      (x,y)
    ↙     ↘
[-1,1]     [1,1]
```

4 directions: the four corners.

### `ALL_DIRECTIONS`

All 8 neighbors (orthogonal + diagonal combined).

### Custom offsets

Pass any `ReadonlyArray<[number, number]>` for custom patterns:

```typescript
// Only check left and right
const horizontal: ReadonlyArray<[number, number]> = [[-1, 0], [1, 0]];
const neighbors = world.grid.getNeighbors(5, 3, horizontal);

// Extended range (2 cells away)
const longRange: ReadonlyArray<[number, number]> = [
  [0, -2], [0, 2], [-2, 0], [2, 0],
];
const farNeighbors = world.grid.getNeighbors(5, 3, longRange);
```

## Custom Position Key

By default, the grid syncs with the `'position'` component. Override with `positionKey`:

```typescript
const world = new World({
  gridWidth: 32, gridHeight: 32, tps: 10,
  positionKey: 'pos',
});

world.registerComponent<Position>('pos');
// Grid now syncs with 'pos' components
```

## Common Patterns

### Range queries

Find all entities within a radius:

```typescript
function getEntitiesInRange(
  world: World,
  centerX: number,
  centerY: number,
  range: number,
): EntityId[] {
  const result: EntityId[] = [];
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || x >= world.grid.width || y < 0 || y >= world.grid.height) continue;
      // Manhattan distance check
      if (Math.abs(dx) + Math.abs(dy) > range) continue;
      const entities = world.grid.getAt(x, y);
      if (entities) {
        for (const id of entities) result.push(id);
      }
    }
  }
  return result;
}
```

### Collision detection

Check if a cell is occupied before moving:

```typescript
function movementSystem(w: World): void {
  for (const id of w.query('position', 'velocity')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const vel = w.getComponent<Velocity>(id, 'velocity')!;
    
    const newX = pos.x + vel.dx;
    const newY = pos.y + vel.dy;
    
    // Bounds check
    if (newX < 0 || newX >= w.grid.width || newY < 0 || newY >= w.grid.height) continue;
    
    // Collision check (using current grid state)
    const occupants = w.grid.getAt(newX, newY);
    if (occupants && occupants.size > 0) continue; // cell occupied
    
    w.setPosition(id, { x: newX, y: newY });
  }
}
```

### Nearest entity search

Find the closest entity with a specific component:

```typescript
function findNearest(
  world: World,
  fromX: number,
  fromY: number,
  componentKey: string,
  maxRange: number,
): EntityId | null {
  for (let range = 1; range <= maxRange; range++) {
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== range) continue; // ring only
        const x = fromX + dx;
        const y = fromY + dy;
        if (x < 0 || x >= world.grid.width || y < 0 || y >= world.grid.height) continue;
        
        const entities = world.grid.getAt(x, y);
        if (!entities) continue;
        
        for (const id of entities) {
          if (world.getComponent(id, componentKey) !== undefined) {
            return id;
          }
        }
      }
    }
  }
  return null;
}
```

### Area-of-effect

Apply damage to all entities in a blast radius:

```typescript
function explode(world: World, centerX: number, centerY: number, radius: number, damage: number): void {
  const affected = getEntitiesInRange(world, centerX, centerY, radius);
  for (const id of affected) {
    const hp = world.getComponent<Health>(id, 'health');
    if (hp) {
      const pos = world.getComponent<Position>(id, 'position')!;
      const dist = Math.abs(pos.x - centerX) + Math.abs(pos.y - centerY);
      const falloff = 1 - dist / (radius + 1);
      hp.hp -= Math.floor(damage * falloff);
    }
  }
}
```
