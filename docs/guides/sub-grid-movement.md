# Sub-Grid Movement and Grid Resolution Guide

This guide explains what the engine supports today for movement, occupancy, pathfinding, and collision, and how to structure a game when units need finer movement than buildings.

## Table of Contents

1. [Current Engine Model](#current-engine-model)
2. [What the Engine Does Not Do](#what-the-engine-does-not-do)
3. [Recommended Resolution Strategy](#recommended-resolution-strategy)
4. [Coarse Buildings on a Fine Navigation Grid](#coarse-buildings-on-a-fine-navigation-grid)
5. [Visual Sub-Cell Motion](#visual-sub-cell-motion)
6. [When to Use a Custom Graph Instead](#when-to-use-a-custom-graph-instead)
7. [Rule of Thumb](#rule-of-thumb)

---

## Current Engine Model

The engine currently assumes one integer grid for its built-in spatial and pathing helpers:

- `world.setPosition()` and the World's configured position component use integer `(x, y)` coordinates
- `world.grid` tracks which entities are in each integer cell
- `OccupancyGrid` tracks blocked, occupied, and reserved integer cells
- `findGridPath()` searches across integer grid cells

These pieces are intentionally separate:

- `SpatialGrid` answers "who is near this cell?"
- `OccupancyGrid` answers "can something stand or move here?"
- `findGridPath()` answers "what route through that grid is available?"

That separation is important. `world.grid` is a proximity index, not a collision solver or pathing authority.

## What the Engine Does Not Do

The engine does not currently provide a built-in continuous movement or physics layer.

That means there is no first-class support for:

- fractional `position` coordinates in the World's spatial grid
- sub-cell occupancy in `OccupancyGrid`
- sub-cell pathfinding in `findGridPath()`
- built-in collision resolution, steering, or separation forces

If you need those behaviors, they should be modeled in game code or renderer code instead of changing what `position` means per entity.

## Recommended Resolution Strategy

For most strategy, RTS, colony, and civ-style games, the cleanest approach is:

1. Pick one authoritative simulation grid for movement and passability.
2. Make that grid fine enough for your smallest meaningful moving unit.
3. Represent larger objects as footprints on that same grid.
4. Keep any visual smoothness separate from simulation occupancy.

In practice:

- units move on the fine navigation grid
- buildings snap to a coarser rule, but still occupy many fine cells
- pathfinding uses the fine grid
- collision and placement checks use the fine grid
- rendering may interpolate between cells for smooth motion

This keeps the engine's built-in helpers coherent instead of forcing per-entity grid semantics into the World.

## Coarse Buildings on a Fine Navigation Grid

Suppose your game wants:

- buildings placed only every 4 cells
- units moving one cell at a time on the finer lattice

Use a fine navigation grid as the source of truth, then snap buildings onto it:

```typescript
import {
  OccupancyGrid,
  World,
  findGridPath,
  type EntityId,
  type Position,
} from 'civ-engine';

const BUILDING_STRIDE = 4;
const BUILDING_FOOTPRINT = 4;

interface Building {
  kind: 'town-center' | 'house';
}

function snapBuildingOrigin(pos: Position): Position {
  return {
    x: Math.floor(pos.x / BUILDING_STRIDE) * BUILDING_STRIDE,
    y: Math.floor(pos.y / BUILDING_STRIDE) * BUILDING_STRIDE,
  };
}

function placeBuilding(
  world: World,
  occupancy: OccupancyGrid,
  entity: EntityId,
  requested: Position,
  kind: Building['kind'],
): boolean {
  const origin = snapBuildingOrigin(requested);
  const footprint = {
    x: origin.x,
    y: origin.y,
    width: BUILDING_FOOTPRINT,
    height: BUILDING_FOOTPRINT,
  };

  if (!occupancy.canOccupy(entity, footprint)) {
    return false;
  }

  occupancy.occupy(entity, footprint);
  world.addComponent<Building>(entity, 'building', { kind });
  world.setPosition(entity, origin);
  return true;
}

function pathUnit(
  occupancy: OccupancyGrid,
  unit: EntityId,
  start: Position,
  goal: Position,
): Position[] | null {
  const result = findGridPath({
    occupancy,
    movingEntity: unit,
    start,
    goal,
  });

  return result?.path ?? null;
}
```

In that model:

- buildings still have one integer origin cell in the World
- placement is snapped by game rules, not by the engine core
- occupancy uses the building footprint on the fine grid
- units path around those occupied cells normally

This is usually better than giving buildings and units different meanings for the same `position` component.

## Visual Sub-Cell Motion

Many games want smooth movement without changing simulation correctness.

The usual answer is to keep simulation and presentation separate:

- simulation uses integer `position`
- occupancy/pathfinding use integer cells
- the renderer interpolates between previous and current positions

If only the visuals need sub-cell movement, keep that logic out of the engine state entirely and let the renderer tween from one grid cell to the next.

If gameplay itself needs continuous world-space values, add a separate component for them:

```typescript
import { World, type Position } from 'civ-engine';

interface Transform {
  x: number;
  y: number;
}

const world = new World({ gridWidth: 128, gridHeight: 128, tps: 10 });

world.registerComponent<Position>('position');
world.registerComponent<Transform>('transform');
```

Then treat those components differently:

- `position` is the integer simulation cell used by `world.grid`
- `transform` is optional float world-space data owned by your game logic or renderer

Do not expect `world.grid`, `OccupancyGrid`, or `findGridPath()` to understand `transform`.

## When to Use a Custom Graph Instead

The built-in `findGridPath()` helper is for integer grid movement.

If your game needs:

- roads, lanes, or spline paths
- polygonal regions
- portals between layers
- multiple navigation resolutions
- continuous world-space movement with custom collision

use the generic `findPath<T>()` utility or your own movement model.

That lets game code define nodes however it wants while keeping the engine's core World model simple.

A practical split is:

- keep `World` and `world.grid` on one simulation lattice for general ECS queries
- keep a separate game-owned nav graph for special movement rules
- project results from that graph back into components your systems understand

## Rule of Thumb

Use one fine grid inside the engine unless you have a measured reason not to.

- If you need coarse building placement, snap building origins and footprints in game code.
- If you need smooth visuals, interpolate in the renderer or store a separate float transform.
- If you need continuous collision or non-grid navigation, that belongs in game code, not in `World.position`.

The engine is already structured for this boundary: proximity, occupancy, pathfinding, and rendering are separate concerns. Lean into that separation instead of trying to make one position component mean different resolutions for different entity classes.
