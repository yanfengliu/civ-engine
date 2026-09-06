# Map Infrastructure Design

**Date:** 2026-04-06
**Status:** Approved

## Overview

Add map infrastructure to civ-engine: composable utilities for procedural map generation. The engine provides a `MapGenerator` interface, a tile-creation helper, seedable 2D simplex noise, and a cellular automata primitive. Game projects import and compose these to build their own map generators.

No changes to World. No game-specific terrain types or biome logic.

## Modules

| File | Responsibility |
|---|---|
| `src/noise.ts` | Seedable 2D simplex noise + octave layering |
| `src/cellular.ts` | Cellular automata step function with configurable rules |
| `src/map-gen.ts` | `MapGenerator` interface + `createTileGrid` helper |

## API

### `noise.ts`

```typescript
function createNoise2D(seed: number): (x: number, y: number) => number;
```

- Builds a seeded permutation table (256 entries) using a simple PRNG (mulberry32 or similar)
- Standard 2D simplex algorithm: skew to simplex grid, find containing triangle, gradient contributions from 3 corners
- 8-direction gradient table, selected via permutation table lookup
- Returns values normalized to [-1, 1]
- Deterministic: same seed always produces same output
- Pure function, no shared mutable state

```typescript
function octaveNoise2D(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
  persistence?: number,  // amplitude falloff per octave, default 0.5
  lacunarity?: number,   // frequency multiplier per octave, default 2.0
): number;
```

- Layers multiple calls at increasing frequency and decreasing amplitude
- Result normalized back to [-1, 1]

### `cellular.ts`

```typescript
type CellGrid = { width: number; height: number; cells: number[] };
type CellRule = (current: number, neighbors: number[]) => number;

function createCellGrid(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): CellGrid;

function stepCellGrid(grid: CellGrid, rule: CellRule): CellGrid;
```

- `CellGrid.cells` is a flat `number[]` indexed `y * width + x`
- `createCellGrid` calls `fill(x, y)` for each cell to seed initial state
- `stepCellGrid` produces a new grid (immutable). The rule receives current cell state and an array of 8 Moore-neighborhood states. Out-of-bounds neighbors are omitted (edge cells get fewer neighbors).
- Game code defines what the numbers mean and what the rules do

### `map-gen.ts`

```typescript
import type { EntityId } from './types.js';
import type { World } from './world.js';

interface MapGenerator {
  generate(world: World, tiles: EntityId[][]): void;
}

function createTileGrid(world: World): EntityId[][];
```

- `createTileGrid` creates `width * height` entities, each with a `'position'` component. Returns `tiles[y][x]`.
- Requires `'position'` component to be registered first; throws `Error` with descriptive message if not.
- `MapGenerator.generate` receives the world and tile array. The generator adds whatever components it wants.

## Usage Example (game code, not in engine)

```typescript
world.registerComponent<Position>('position');
world.registerComponent<MyTerrain>('terrain');

const tiles = createTileGrid(world);
myGenerator.generate(world, tiles);
```

## Testing

### `tests/noise.test.ts`
- Determinism: same seed produces same values
- Different seeds produce different values
- Output range: values always in [-1, 1]
- Spatial variation: nearby coordinates produce different (non-degenerate) values
- Octave layering: result still in [-1, 1]; differs from single-octave

### `tests/cellular.test.ts`
- `createCellGrid`: correct dimensions, fill function called with correct coordinates
- `stepCellGrid`: produces new grid (immutability), correct dimensions
- Rule receives correct neighbor counts at edges/corners/center
- Known rule produces expected output for a small handcrafted grid

### `tests/map-gen.test.ts`
- `createTileGrid`: creates `width * height` entities, each has position, positions match grid coordinates
- `createTileGrid` throws if `'position'` not registered
- `MapGenerator.generate` receives correct tile array, can add components to tiles

## Out of Scope

- Terrain types, biome tables, or any game-specific logic
- World integration (no new methods on World)
- CellGrid serialization (transient generation artifact)
- 3D noise (engine is 2D)
- Built-in random seeding from World (game code provides seeds)
