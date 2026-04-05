# Detailed Devlog

## [2026-04-04 16:45, UTC] — Task 1: Project Scaffolding

**Action:** Created TypeScript/Node.js project foundation: package.json, tsconfig.json, vitest.config.ts, eslint.config.js, src/types.ts. Ran npm install and verified toolchain.
**Result:** Success. tsc, vitest run, and eslint all pass with no errors.
**Files changed:** package.json, tsconfig.json, vitest.config.ts, eslint.config.js, src/types.ts
**Reasoning:** Greenfield setup following task spec. Added `passWithNoTests: true` to vitest config so `vitest run` exits 0 when no test files exist. Added `--no-error-on-unmatched-pattern` to lint script so ESLint does not error when tests/ directory is empty.
**Notes:** .gitignore already existed in the repo with required entries (node_modules/, dist/). ARCHITECTURE.md and devlog files did not exist prior to this task — created devlog files now as required by CLAUDE.md.

## [2026-04-04 17:11, UTC] — Task 2: EntityManager

**Action:** Created `src/entity-manager.ts` and `tests/entity-manager.test.ts` using TDD. Wrote tests first, verified failure, then wrote implementation.
**Result:** Success. All 7 tests pass, ESLint reports no errors, committed to main.
**Files changed:** src/entity-manager.ts, tests/entity-manager.test.ts
**Reasoning:** Used a free-list (stack) for ID recycling and per-slot generation counters to support stale reference detection. Double-destroy guard prevents generation inflation and free-list duplication.
**Notes:** LF-to-CRLF line ending warnings from git are expected on Windows and do not affect functionality.

## [2026-04-04 17:15, UTC] — Task 3: ComponentStore

**Action:** Created `src/component-store.ts` and `tests/component-store.test.ts` using TDD. Wrote tests first, verified failure (missing module), then wrote implementation.
**Result:** Success. All 10 tests pass, ESLint reports no errors, committed to main.
**Files changed:** src/component-store.ts, tests/component-store.test.ts
**Reasoning:** Sparse array (indexed by EntityId) provides O(1) get/set/remove. Generation counter increments on every mutation (set or real remove) to support cheap change detection by callers. Size counter maintained inline to avoid O(n) scan.
**Notes:** No-op remove (entity not present) does not increment generation or size, matching expected test behavior.

## [2026-04-04 17:20, UTC] — Task 4: SpatialGrid

**Action:** Created `src/spatial-grid.ts` and `tests/spatial-grid.test.ts` using TDD. Wrote tests first, verified failure (missing module), then wrote implementation.
**Result:** Success. All 10 tests pass, ESLint reports no errors, committed to main.
**Files changed:** src/spatial-grid.ts, tests/spatial-grid.test.ts
**Reasoning:** Flat array of nullable Sets provides O(1) cell lookup by index (y * width + x). Lazy Set allocation avoids memory overhead for sparse grids. 4-directional neighbor queries skip diagonals by design. Bounds checking via shared `assertBounds` prevents silent index wrap-around.
**Notes:** `getAt` returns `ReadonlySet<EntityId> | null` — callers cannot mutate the internal Set. `move` is composed from `remove` + `insert`, keeping logic DRY.
