# Map Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add composable map generation utilities — seedable 2D simplex noise, cellular automata, and a tile-creation helper with a MapGenerator interface.

**Architecture:** Three standalone modules (`noise.ts`, `cellular.ts`, `map-gen.ts`) with no changes to World. Noise provides a seeded simplex function and octave layering. Cellular automata provides immutable grid stepping. Map-gen provides a MapGenerator interface and a bulk tile-entity creation helper.

**Tech Stack:** TypeScript 5.7+ (strict mode, ESM, Node16 resolution), Vitest 3

**Spec:** `docs/superpowers/specs/2026-04-06-map-infrastructure-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/noise.ts` | Create | `createNoise2D`, `octaveNoise2D` — seedable simplex noise + octave layering |
| `src/cellular.ts` | Create | `CellGrid`, `CellRule`, `createCellGrid`, `stepCellGrid` — cellular automata |
| `src/map-gen.ts` | Create | `MapGenerator` interface, `createTileGrid` helper |
| `tests/noise.test.ts` | Create | Unit tests for noise functions |
| `tests/cellular.test.ts` | Create | Unit tests for cellular automata |
| `tests/map-gen.test.ts` | Create | Unit + integration tests for tile creation and MapGenerator |
| `docs/ARCHITECTURE.md` | Modify | Add noise, cellular, map-gen to component map; update drift log |
| `docs/ROADMAP.md` | Modify | Move "Map infrastructure" to Built |

---

## Task 1: Simplex noise — `createNoise2D`

**Files:**
- Create: `src/noise.ts`
- Create: `tests/noise.test.ts`

- [ ] **Step 1: Write failing tests for createNoise2D**

Create `tests/noise.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createNoise2D } from '../src/noise.js';

describe('createNoise2D', () => {
  it('returns a function', () => {
    const noise = createNoise2D(42);
    expect(typeof noise).toBe('function');
  });

  it('is deterministic — same seed produces same values', () => {
    const a = createNoise2D(42);
    const b = createNoise2D(42);
    expect(a(1.5, 2.3)).toBe(b(1.5, 2.3));
    expect(a(0, 0)).toBe(b(0, 0));
    expect(a(100.7, -50.2)).toBe(b(100.7, -50.2));
  });

  it('different seeds produce different values', () => {
    const a = createNoise2D(1);
    const b = createNoise2D(2);
    const sameCount = [
      a(1, 1) === b(1, 1),
      a(5.5, 3.2) === b(5.5, 3.2),
      a(10, 20) === b(10, 20),
    ].filter(Boolean).length;
    expect(sameCount).toBeLessThan(3);
  });

  it('output is always in [-1, 1]', () => {
    const noise = createNoise2D(123);
    for (let x = -50; x <= 50; x += 0.73) {
      for (let y = -50; y <= 50; y += 0.73) {
        const v = noise(x, y);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('nearby coordinates produce different values (not degenerate)', () => {
    const noise = createNoise2D(99);
    const values = new Set<number>();
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        values.add(noise(x * 0.5, y * 0.5));
      }
    }
    expect(values.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/noise.test.ts`
Expected: FAIL — module `../src/noise.js` does not exist

- [ ] **Step 3: Implement createNoise2D**

Create `src/noise.ts`:

```typescript
// 2D simplex noise gradients (8 directions)
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

// Skew/unskew factors for 2D simplex
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPermutationTable(seed: number): Uint8Array {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  return perm;
}

function dot2(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

export function createNoise2D(seed: number): (x: number, y: number) => number {
  const perm = buildPermutationTable(seed);

  return (x: number, y: number): number => {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = perm[(ii + perm[jj % 256]) % 256] % 8;
    const gi1 = perm[(ii + i1 + perm[(jj + j1) % 256]) % 256] % 8;
    const gi2 = perm[(ii + 1 + perm[(jj + 1) % 256]) % 256] % 8;

    let n0 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * dot2(GRAD2[gi0], x0, y0);
    }

    let n1 = 0;
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * dot2(GRAD2[gi1], x1, y1);
    }

    let n2 = 0;
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * dot2(GRAD2[gi2], x2, y2);
    }

    // Scale to [-1, 1]. The theoretical max of 2D simplex is ~0.8660.
    // Multiply by 70 to get close to [-1, 1], then clamp for safety.
    const raw = 70 * (n0 + n1 + n2);
    return Math.max(-1, Math.min(1, raw));
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/noise.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/noise.ts tests/noise.test.ts`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 6: Commit**

```
git add src/noise.ts tests/noise.test.ts
git commit -m "feat: add seedable 2D simplex noise (createNoise2D)"
```

---

## Task 2: Octave noise layering — `octaveNoise2D`

**Files:**
- Modify: `src/noise.ts`
- Modify: `tests/noise.test.ts`

- [ ] **Step 1: Write failing tests for octaveNoise2D**

Append to `tests/noise.test.ts`:

```typescript
import { createNoise2D, octaveNoise2D } from '../src/noise.js';

describe('octaveNoise2D', () => {
  it('output is always in [-1, 1]', () => {
    const noise = createNoise2D(42);
    for (let x = -20; x <= 20; x += 1.3) {
      for (let y = -20; y <= 20; y += 1.3) {
        const v = octaveNoise2D(noise, x, y, 6);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('result differs from single-octave noise', () => {
    const noise = createNoise2D(42);
    let same = 0;
    for (let i = 0; i < 10; i++) {
      const x = i * 1.1;
      const y = i * 0.7;
      if (noise(x, y) === octaveNoise2D(noise, x, y, 4)) same++;
    }
    expect(same).toBeLessThan(10);
  });

  it('respects persistence and lacunarity parameters', () => {
    const noise = createNoise2D(42);
    const a = octaveNoise2D(noise, 5, 5, 4, 0.3, 3.0);
    const b = octaveNoise2D(noise, 5, 5, 4, 0.7, 1.5);
    expect(a).not.toBe(b);
  });

  it('single octave matches base noise', () => {
    const noise = createNoise2D(42);
    expect(octaveNoise2D(noise, 3.5, 7.2, 1)).toBe(noise(3.5, 7.2));
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run tests/noise.test.ts`
Expected: FAIL — `octaveNoise2D` is not exported

- [ ] **Step 3: Implement octaveNoise2D**

Add to `src/noise.ts`:

```typescript
export function octaveNoise2D(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
  persistence = 0.5,
  lacunarity = 2.0,
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxAmplitude;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/noise.test.ts`
Expected: all 9 tests PASS

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/noise.ts tests/noise.test.ts`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 6: Commit**

```
git add src/noise.ts tests/noise.test.ts
git commit -m "feat: add octave noise layering (octaveNoise2D)"
```

---

## Task 3: Cellular automata — `createCellGrid` and `stepCellGrid`

**Files:**
- Create: `src/cellular.ts`
- Create: `tests/cellular.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/cellular.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createCellGrid, stepCellGrid } from '../src/cellular.js';
import type { CellGrid, CellRule } from '../src/cellular.js';

describe('createCellGrid', () => {
  it('creates grid with correct dimensions', () => {
    const grid = createCellGrid(4, 3, () => 0);
    expect(grid.width).toBe(4);
    expect(grid.height).toBe(3);
    expect(grid.cells).toHaveLength(12);
  });

  it('calls fill with correct coordinates', () => {
    const coords: [number, number][] = [];
    createCellGrid(3, 2, (x, y) => {
      coords.push([x, y]);
      return 0;
    });
    expect(coords).toEqual([
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
    ]);
  });

  it('stores fill values at correct indices', () => {
    const grid = createCellGrid(3, 2, (x, y) => x + y * 10);
    expect(grid.cells).toEqual([0, 1, 2, 10, 11, 12]);
  });
});

describe('stepCellGrid', () => {
  it('produces a new grid (immutability)', () => {
    const grid = createCellGrid(3, 3, () => 0);
    const next = stepCellGrid(grid, (current) => current);
    expect(next).not.toBe(grid);
    expect(next.cells).not.toBe(grid.cells);
    expect(next.width).toBe(3);
    expect(next.height).toBe(3);
  });

  it('corner cell receives 3 neighbors', () => {
    let neighborCount = -1;
    const grid = createCellGrid(3, 3, () => 1);
    stepCellGrid(grid, (current, neighbors) => {
      if (neighborCount === -1) neighborCount = neighbors.length;
      return current;
    });
    // (0,0) is processed first and has 3 neighbors: (1,0), (0,1), (1,1)
    expect(neighborCount).toBe(3);
  });

  it('edge cell receives 5 neighbors', () => {
    const counts: number[] = [];
    const grid = createCellGrid(3, 3, () => 1);
    stepCellGrid(grid, (current, neighbors) => {
      counts.push(neighbors.length);
      return current;
    });
    // (1,0) is an edge cell — index 1 — should have 5 neighbors
    expect(counts[1]).toBe(5);
  });

  it('center cell receives 8 neighbors', () => {
    const counts: number[] = [];
    const grid = createCellGrid(3, 3, () => 1);
    stepCellGrid(grid, (current, neighbors) => {
      counts.push(neighbors.length);
      return current;
    });
    // (1,1) is the center cell — index 4 — should have 8 neighbors
    expect(counts[4]).toBe(8);
  });

  it('known rule produces expected output', () => {
    // 3x3 grid, center is 1, rest is 0
    const grid = createCellGrid(3, 3, (x, y) => (x === 1 && y === 1 ? 1 : 0));
    // Rule: become 1 if any neighbor is 1, else stay 0
    const rule: CellRule = (_current, neighbors) =>
      neighbors.some((n) => n === 1) ? 1 : 0;
    const next = stepCellGrid(grid, rule);
    // All 8 neighbors of center should become 1; center has 0 neighbors that are 1?
    // Center (1,1) neighbors: all 0. So center becomes 0 under this rule.
    // All 8 cells adjacent to (1,1) have at least one neighbor (the center) that is 1, so they become 1.
    expect(next.cells).toEqual([
      1, 1, 1,
      1, 0, 1,
      1, 1, 1,
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/cellular.test.ts`
Expected: FAIL — module `../src/cellular.js` does not exist

- [ ] **Step 3: Implement createCellGrid and stepCellGrid**

Create `src/cellular.ts`:

```typescript
export type CellGrid = {
  readonly width: number;
  readonly height: number;
  readonly cells: number[];
};

export type CellRule = (current: number, neighbors: number[]) => number;

export function createCellGrid(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): CellGrid {
  const cells = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells[y * width + x] = fill(x, y);
    }
  }
  return { width, height, cells };
}

const MOORE_OFFSETS: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

function getNeighbors(
  cells: number[],
  width: number,
  height: number,
  x: number,
  y: number,
): number[] {
  const result: number[] = [];
  for (const [dx, dy] of MOORE_OFFSETS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      result.push(cells[ny * width + nx]);
    }
  }
  return result;
}

export function stepCellGrid(grid: CellGrid, rule: CellRule): CellGrid {
  const { width, height, cells } = grid;
  const next = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const neighbors = getNeighbors(cells, width, height, x, y);
      next[idx] = rule(cells[idx], neighbors);
    }
  }
  return { width, height, cells: next };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/cellular.test.ts`
Expected: all 7 tests PASS

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/cellular.ts tests/cellular.test.ts`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 6: Commit**

```
git add src/cellular.ts tests/cellular.test.ts
git commit -m "feat: add cellular automata (createCellGrid, stepCellGrid)"
```

---

## Task 4: Map generation — `MapGenerator` interface and `createTileGrid`

**Files:**
- Create: `src/map-gen.ts`
- Create: `tests/map-gen.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/map-gen.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createTileGrid } from '../src/map-gen.js';
import type { MapGenerator } from '../src/map-gen.js';
import type { Position } from '../src/types.js';
import { World } from '../src/world.js';

describe('createTileGrid', () => {
  it('creates width * height entities with position components', () => {
    const world = new World({ gridWidth: 4, gridHeight: 3, tps: 60 });
    world.registerComponent<Position>('position');
    const tiles = createTileGrid(world);

    expect(tiles).toHaveLength(3); // height rows
    expect(tiles[0]).toHaveLength(4); // width columns

    let count = 0;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        const id = tiles[y][x];
        expect(world.isAlive(id)).toBe(true);
        const pos = world.getComponent<Position>(id, 'position');
        expect(pos).toEqual({ x, y });
        count++;
      }
    }
    expect(count).toBe(12);
  });

  it('throws if position component is not registered', () => {
    const world = new World({ gridWidth: 4, gridHeight: 3, tps: 60 });
    expect(() => createTileGrid(world)).toThrow();
  });
});

describe('MapGenerator interface', () => {
  it('generate receives world and tiles, can add components', () => {
    const world = new World({ gridWidth: 3, gridHeight: 3, tps: 60 });
    world.registerComponent<Position>('position');
    world.registerComponent<{ type: number }>('terrain');

    const tiles = createTileGrid(world);

    const generator: MapGenerator = {
      generate(w, t) {
        for (let y = 0; y < t.length; y++) {
          for (let x = 0; x < t[y].length; x++) {
            w.addComponent(t[y][x], 'terrain', { type: x + y });
          }
        }
      },
    };

    generator.generate(world, tiles);

    const terrain = world.getComponent<{ type: number }>(tiles[1][2], 'terrain');
    expect(terrain).toEqual({ type: 3 }); // x=2, y=1
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/map-gen.test.ts`
Expected: FAIL — module `../src/map-gen.js` does not exist

- [ ] **Step 3: Implement MapGenerator and createTileGrid**

Create `src/map-gen.ts`:

```typescript
import type { EntityId } from './types.js';
import type { World } from './world.js';

export interface MapGenerator {
  generate(world: World, tiles: EntityId[][]): void;
}

export function createTileGrid(world: World): EntityId[][] {
  // Verify 'position' component is registered by attempting a query
  // world.query throws if the component is not registered
  // We consume the iterator to trigger the check, then proceed
  const testIter = world.query('position');
  testIter.next();
  // If we reach here, 'position' is registered

  const width = world.grid.width;
  const height = world.grid.height;
  const tiles: EntityId[][] = [];

  for (let y = 0; y < height; y++) {
    const row: EntityId[] = [];
    for (let x = 0; x < width; x++) {
      const id = world.createEntity();
      world.addComponent(id, 'position', { x, y });
      row.push(id);
    }
    tiles.push(row);
  }

  return tiles;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/map-gen.test.ts`
Expected: all 3 tests PASS

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/map-gen.ts tests/map-gen.test.ts`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 6: Commit**

```
git add src/map-gen.ts tests/map-gen.test.ts
git commit -m "feat: add MapGenerator interface and createTileGrid"
```

---

## Task 5: Full test suite pass + docs update

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (134 existing + 19 new = 153 total)

- [ ] **Step 2: Run lint and typecheck on entire project**

Run: `npx eslint .`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Update ARCHITECTURE.md**

Add to the Component Map table:

```markdown
| Noise          | `src/noise.ts`           | Seedable 2D simplex noise, octave layering utility                         |
| Cellular       | `src/cellular.ts`        | Cellular automata step function, immutable CellGrid                        |
| MapGen         | `src/map-gen.ts`         | MapGenerator interface, createTileGrid bulk tile-entity helper             |
```

Add to the Boundaries section:

```markdown
- **Noise, Cellular, MapGen** are standalone utilities. They are not owned by World and have no integration point in the tick loop. Game code imports them directly and uses them during setup (before the simulation runs).
```

Add to the Drift Log:

```markdown
| 2026-04-06 | Added map infrastructure utilities | Standalone noise, cellular automata, and tile-creation primitives for map generation |
```

- [ ] **Step 4: Update ROADMAP.md**

Move "Map infrastructure" from "Planned — Engine Primitives" to the "Built" table:

```markdown
| Map infrastructure     | `noise.ts`, `cellular.ts`, `map-gen.ts` | 2026-04-06 | Simplex noise, cellular automata, MapGenerator interface, createTileGrid |
```

Remove the row from "Planned — Engine Primitives".

- [ ] **Step 5: Commit**

```
git add docs/ARCHITECTURE.md docs/ROADMAP.md
git commit -m "docs: update architecture and roadmap for map infrastructure"
```
