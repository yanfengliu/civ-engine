# Map Generation Guide

This guide covers procedural map generation using civ-engine's standalone utilities: simplex noise, cellular automata, and the tile grid helper.

## Table of Contents

1. [Overview](#overview)
2. [Tile Grid](#tile-grid)
3. [Simplex Noise](#simplex-noise)
4. [Octave Noise (Fractal Brownian Motion)](#octave-noise-fractal-brownian-motion)
5. [Cellular Automata](#cellular-automata)
6. [Combining Techniques](#combining-techniques)
7. [Practical Recipes](#practical-recipes)

---

## Overview

Map generation in civ-engine uses three standalone modules that have no dependency on World:

| Module | Purpose |
|---|---|
| `noise.ts` | Seedable simplex noise for smooth, continuous terrain |
| `cellular.ts` | Cellular automata for structured, organic patterns |
| `map-gen.ts` | Tile grid creation helper |

The typical workflow:
1. Create tile entities with `createTileGrid()`
2. Generate terrain values with noise and/or cellular automata
3. Attach terrain components to tile entities

All map generation happens **before** the simulation runs — these are setup utilities, not tick-loop systems.

## Tile Grid

`createTileGrid` creates one entity per grid cell, each with a position component:

```typescript
import { World } from './src/world.js';
import { createTileGrid } from './src/map-gen.js';
import type { Position } from './src/types.js';

const world = new World({ gridWidth: 64, gridHeight: 64, tps: 10 });
world.registerComponent<Position>('position');

const tiles = createTileGrid(world);
// tiles[y][x] = EntityId at position (x, y)
// tiles[0][0] = top-left corner
// tiles[63][63] = bottom-right corner
```

Each tile entity has a position component, so it appears in the spatial grid. You then attach additional components (terrain type, elevation, moisture, etc.) based on your generation logic.

```typescript
interface Terrain {
  type: 'water' | 'grass' | 'forest' | 'mountain';
  elevation: number;
}

world.registerComponent<Terrain>('terrain');

// Attach terrain to every tile
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    world.addComponent(tiles[y][x], 'terrain', {
      type: 'grass',
      elevation: 0,
    });
  }
}
```

If your position component uses a custom key, pass it as the second argument:

```typescript
const tiles = createTileGrid(world, 'pos'); // uses 'pos' instead of 'position'
```

## Simplex Noise

Simplex noise generates smooth, continuous values across 2D space. It's seedable — the same seed always produces the same output.

```typescript
import { createNoise2D } from './src/noise.js';

const noise = createNoise2D(42); // seed = 42
```

The returned function takes `(x, y)` and returns a value in `[-1, 1]`:

```typescript
noise(0, 0);     // some value in [-1, 1]
noise(0.5, 0.5); // a different value
noise(100, 200); // works at any scale
```

### Controlling scale

Noise operates in a continuous space. The distance between your input coordinates controls the **scale** of features:

```typescript
// Large features (smooth terrain) — multiply coordinates by a small factor
noise(x * 0.01, y * 0.01);

// Medium features — moderate factor
noise(x * 0.05, y * 0.05);

// Small features (noisy, detailed) — larger factor
noise(x * 0.2, y * 0.2);
```

### Using noise for terrain

```typescript
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const elevation = noise(x * 0.05, y * 0.05);
    // elevation is in [-1, 1]
    // Map to terrain types:
    let type: string;
    if (elevation < -0.3) type = 'water';
    else if (elevation < 0.2) type = 'grass';
    else if (elevation < 0.5) type = 'forest';
    else type = 'mountain';

    world.addComponent(tiles[y][x], 'terrain', { type, elevation });
  }
}
```

### Reproducibility

The same seed always produces the same noise. Use different seeds for different maps:

```typescript
const map1 = createNoise2D(1);
const map2 = createNoise2D(2);
// map1 and map2 produce completely different terrain
```

## Octave Noise (Fractal Brownian Motion)

Single-octave noise produces smooth but uniform terrain. Real terrain has both large-scale features (continents, mountain ranges) and small-scale detail (hills, ridges). Octave noise layers multiple noise samples to achieve this.

```typescript
import { createNoise2D, octaveNoise2D } from './src/noise.js';

const noise = createNoise2D(42);
const value = octaveNoise2D(noise, x * 0.05, y * 0.05, 4);
// 4 octaves: combines detail at multiple scales
```

### Parameters

| Parameter | Default | Effect |
|---|---|---|
| `octaves` | (required) | More octaves = more detail, more computation |
| `persistence` | `0.5` | How much each octave contributes. Lower = smoother |
| `lacunarity` | `2.0` | Frequency multiplier per octave. Higher = more detail |

```typescript
// Smooth terrain (low detail)
octaveNoise2D(noise, x * 0.05, y * 0.05, 2, 0.3, 2.0);

// Rough terrain (high detail)
octaveNoise2D(noise, x * 0.05, y * 0.05, 6, 0.7, 2.5);

// Default: good general-purpose terrain
octaveNoise2D(noise, x * 0.05, y * 0.05, 4);
```

### Combining noise layers

Use multiple noise functions (different seeds or different scales) for different terrain properties:

```typescript
const elevationNoise = createNoise2D(1);
const moistureNoise = createNoise2D(2);
const temperatureNoise = createNoise2D(3);

for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const elevation = octaveNoise2D(elevationNoise, x * 0.03, y * 0.03, 4);
    const moisture = octaveNoise2D(moistureNoise, x * 0.05, y * 0.05, 3);
    const temperature = octaveNoise2D(temperatureNoise, x * 0.02, y * 0.02, 2);

    // Combine to determine biome
    let biome: string;
    if (elevation < -0.2) biome = 'ocean';
    else if (moisture > 0.3 && temperature > 0) biome = 'jungle';
    else if (moisture > 0.3) biome = 'forest';
    else if (temperature < -0.3) biome = 'tundra';
    else if (moisture < -0.3) biome = 'desert';
    else biome = 'grassland';

    world.addComponent(tiles[y][x], 'terrain', { biome, elevation, moisture });
  }
}
```

## Cellular Automata

Cellular automata apply rules to a grid repeatedly to generate organic patterns. Each step produces a new grid (the original is not mutated).

```typescript
import { createCellGrid, stepCellGrid, MOORE_OFFSETS, VON_NEUMANN_OFFSETS } from './src/cellular.js';
```

### Creating a cell grid

```typescript
// Random binary grid
const grid = createCellGrid(64, 64, () => Math.random() > 0.5 ? 1 : 0);

// Noise-seeded grid (deterministic)
const noise = createNoise2D(42);
const grid = createCellGrid(64, 64, (x, y) =>
  octaveNoise2D(noise, x * 0.1, y * 0.1, 3) > 0 ? 1 : 0
);
```

### Stepping with rules

A `CellRule` receives the current cell value and an array of neighbor values, and returns the new value:

```typescript
// Cave generation: smooth noise into cave-like structures
const caveRule = (current: number, neighbors: number[]): number => {
  const walls = neighbors.filter(n => n === 1).length;
  if (walls >= 5) return 1;  // surrounded by walls → become wall
  if (walls <= 2) return 0;  // few walls → become open
  return current;             // otherwise, keep current
};

let cells = createCellGrid(64, 64, (x, y) =>
  noise(x * 0.1, y * 0.1) > 0 ? 1 : 0
);

// Apply 4 smoothing steps
for (let i = 0; i < 4; i++) {
  cells = stepCellGrid(cells, caveRule);
}
```

### Neighborhood types

| Constant | Cells checked | Use for |
|---|---|---|
| `MOORE_OFFSETS` | 8 (all surrounding) | Default. Good for caves, islands |
| `VON_NEUMANN_OFFSETS` | 4 (orthogonal only) | Sharper features, corridor-like |

```typescript
// Von Neumann neighborhood (4 neighbors)
cells = stepCellGrid(cells, caveRule, VON_NEUMANN_OFFSETS);
```

### Reading results

`CellGrid` stores cells in a flat array indexed as `y * width + x`:

```typescript
for (let y = 0; y < cells.height; y++) {
  for (let x = 0; x < cells.width; x++) {
    const value = cells.cells[y * cells.width + x];
    if (value === 1) {
      world.addComponent(tiles[y][x], 'terrain', { type: 'wall' });
    } else {
      world.addComponent(tiles[y][x], 'terrain', { type: 'floor' });
    }
  }
}
```

## Combining Techniques

The most interesting maps combine noise for macro structure with cellular automata for micro detail.

### Noise for elevation, cellular for caves

```typescript
const noise = createNoise2D(42);

// Generate elevation with noise
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const elevation = octaveNoise2D(noise, x * 0.04, y * 0.04, 4);
    world.addComponent(tiles[y][x], 'terrain', {
      type: elevation < -0.2 ? 'water' : 'land',
      elevation,
    });
  }
}

// Generate cave overlay with cellular automata
let caves = createCellGrid(64, 64, (x, y) => {
  // Only place caves on land
  const elevation = octaveNoise2D(noise, x * 0.04, y * 0.04, 4);
  if (elevation < -0.2) return 0; // no caves in water
  return noise(x * 0.2, y * 0.2) > 0 ? 1 : 0;
});

for (let i = 0; i < 3; i++) {
  caves = stepCellGrid(caves, (current, neighbors) => {
    const walls = neighbors.filter(n => n === 1).length;
    return walls >= 5 ? 1 : walls <= 2 ? 0 : current;
  });
}

// Mark cave tiles
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    if (caves.cells[y * 64 + x] === 1) {
      const terrain = world.getComponent(tiles[y][x], 'terrain');
      if (terrain) terrain.type = 'cave';
    }
  }
}
```

## Practical Recipes

### Island map

Islands with water borders:

```typescript
const noise = createNoise2D(42);

for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const nx = x / 64 - 0.5;
    const ny = y / 64 - 0.5;
    // Distance from center (0 at center, ~0.7 at corners)
    const dist = Math.sqrt(nx * nx + ny * ny) * 2;
    // Noise-based elevation, pulled down at edges
    const elevation = octaveNoise2D(noise, x * 0.05, y * 0.05, 4) - dist;

    let type: string;
    if (elevation < -0.1) type = 'water';
    else if (elevation < 0.05) type = 'beach';
    else if (elevation < 0.4) type = 'grass';
    else type = 'mountain';

    world.addComponent(tiles[y][x], 'terrain', { type, elevation });
  }
}
```

### Resource scattering

Place resources using noise thresholds:

```typescript
const resourceNoise = createNoise2D(99);

for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const terrain = world.getComponent(tiles[y][x], 'terrain');
    if (!terrain || terrain.type === 'water') continue;

    const value = octaveNoise2D(resourceNoise, x * 0.1, y * 0.1, 3);
    if (value > 0.4) {
      world.addComponent(tiles[y][x], 'resourceSource', {
        resource: 'iron',
        remaining: Math.floor((value - 0.4) * 100),
      });
    }
  }
}
```

### River generation (simple)

Use a threshold band of noise as a river:

```typescript
const riverNoise = createNoise2D(77);

for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const value = octaveNoise2D(riverNoise, x * 0.03, y * 0.03, 2);
    // River where noise is close to 0
    if (Math.abs(value) < 0.05) {
      const terrain = world.getComponent(tiles[y][x], 'terrain');
      if (terrain) terrain.type = 'river';
    }
  }
}
```

### Multi-state cellular automata

Cellular automata aren't limited to binary. Use multiple states for richer patterns:

```typescript
// 0 = water, 1 = sand, 2 = grass, 3 = forest
let grid = createCellGrid(64, 64, (x, y) => {
  const e = octaveNoise2D(noise, x * 0.05, y * 0.05, 4);
  if (e < -0.3) return 0;
  if (e < 0) return 1;
  if (e < 0.3) return 2;
  return 3;
});

// Smooth: cells tend to match their majority neighbor
const majorityRule = (current: number, neighbors: number[]): number => {
  const counts = [0, 0, 0, 0];
  for (const n of neighbors) counts[n]++;
  // Find the most common neighbor type
  let maxCount = counts[current];
  let maxType = current;
  for (let i = 0; i < 4; i++) {
    if (counts[i] > maxCount) {
      maxCount = counts[i];
      maxType = i;
    }
  }
  return maxType;
};

for (let i = 0; i < 3; i++) {
  grid = stepCellGrid(grid, majorityRule);
}
```
