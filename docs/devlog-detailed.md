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

## [2026-04-04 17:23, UTC] — Task 5: GameLoop

**Action:** Created `src/game-loop.ts` and `tests/game-loop.test.ts` using TDD. Wrote tests first, verified failure (missing module), then wrote implementation.
**Result:** Success. All 4 tests pass, ESLint reports no errors, committed to main.
**Files changed:** src/game-loop.ts, tests/game-loop.test.ts
**Reasoning:** Fixed-timestep design with `step()` for deterministic testing and `start()`/`stop()` for real-time execution. `performance.now()` provides sub-millisecond timing. Caps catch-up ticks to `maxTicksPerFrame = 4` to prevent spiral-of-death; resets accumulated time if cap is hit.
**Notes:** `start()`/`stop()` are not covered by the test suite (real-time behavior is environment-dependent); only deterministic `step()` behavior is tested.

## [2026-04-04 17:27, UTC] — Task 6: World

**Action:** Created `src/world.ts` and `tests/world.test.ts` using TDD. Wrote tests first, verified failure (missing module), then wrote implementation.
**Result:** Success. All 14 world tests pass, total suite 45/45 pass, ESLint and tsc report no errors, committed to main.
**Files changed:** src/world.ts, tests/world.test.ts
**Reasoning:** World is the integration layer: it owns EntityManager, ComponentStore registry (Map<string, ComponentStore>), SpatialGrid, and GameLoop. Public API is flat on World. `syncSpatialIndex()` runs before user systems each tick to keep the grid consistent with Position components. `destroyEntity` uses `previousPositions` (not current component data) for grid cleanup, because position may be mutated between ticks without stepping. `query()` iterates the smallest component store for efficiency.
**Notes:** The `position` component key is special — World hardcodes it in `syncSpatialIndex()`. Users must register it under the key `'position'` for grid sync to work.

## [2026-04-04 17:35, UTC] — Task 7: Documentation

**Action:** Created `docs/ARCHITECTURE.md` with component map, data flow, boundaries, technology map, key architectural decisions, and drift log.
**Result:** Success. All project documentation in place.
**Files changed:** docs/ARCHITECTURE.md
**Reasoning:** Required by CLAUDE.md rules for architecture tracking. Documents the initial engine foundation structure.
**Notes:** Devlog files were created during Task 1 and maintained throughout by subagents.

## [2026-04-04 17:46, UTC] — README: comprehensive usage guide

**Action:** Rewrote README.md with full engine documentation: quick start, core concepts, entities, components, querying, systems, spatial grid, simulation control, full example, entity destruction, project structure, API reference table, and design decisions.
**Result:** Success. README covers both human and AI audiences with runnable code examples.
**Files changed:** README.md
**Reasoning:** User requested a README that teaches people and AI how to use the engine. Structured around the World API since it's the only public entry point, with progressive disclosure from quick start to full API reference.
**Notes:** No code changes — documentation only.

## [2026-04-05 10:54, UTC] — EventBus: emit and listener dispatch

**Action:** Created `src/event-bus.ts` and `tests/event-bus.test.ts` using TDD. Wrote 4 tests first (verified they fail — missing module), then wrote implementation.
**Result:** Success. All 4 EventBus tests pass, full suite 49/49 pass, ESLint and tsc report no errors, committed to main.
**Files changed:** src/event-bus.ts, tests/event-bus.test.ts
**Reasoning:** EventBus is a standalone generic class keyed by a typed event map. Uses a `Map<keyof TEventMap, Set<Listener>>` for O(1) dispatch per type. Also maintains a `buffer` array for `getEvents()` / `clear()` — enables replay and inspection. Generic constraint changed from `Record<string, unknown>` to `Record<keyof TEventMap, unknown>` to allow plain interfaces without an index signature (required for strict-mode tsc compatibility).
**Notes:** The constraint change was discovered during `tsc` run after tests already passed — Vitest is lenient about generic constraints. The fix is non-breaking and more permissive (callers no longer need to add `[key: string]: unknown` to their event map interfaces).
