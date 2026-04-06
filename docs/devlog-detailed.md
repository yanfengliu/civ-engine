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

## [2026-04-05 11:01, UTC] — EventBus: remaining unit tests (off, clear, getEvents)

**Action:** Appended 5 new tests to `tests/event-bus.test.ts` covering `off` (removes listener), `off` with non-registered listener (no-op), `getEvents` buffer population, `clear` emptying buffer while preserving listeners, and `getEvents` on empty bus.
**Result:** Success. All 9 EventBus tests pass (54 total), ESLint reports no errors, committed to main.
**Files changed:** tests/event-bus.test.ts
**Reasoning:** Tests exercise already-implemented methods; no implementation changes needed. Each test isolates a single behavior.
**Notes:** None.

## [2026-04-05 11:22, UTC] — World integration: generic param and event methods

**Action:** Added `EventBus` import to `src/world.ts`. Made `World` and `System` generic with `TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>`. Added private `eventBus` field. Added public `emit`, `on`, `off`, `getEvents` methods delegating to the bus. Added `this.eventBus.clear()` as the first line of `executeTick()`. Added 5 new tests to `tests/world.test.ts` (plus `vi` import) covering listener dispatch, system-to-system event delivery in same tick, `getEvents` during a tick, event clearing between ticks, and event independence from entity lifecycle.
**Result:** Success. All 59 tests pass (19 world, 9 event-bus, 10 spatial-grid, 10 component-store, 7 entity-manager, 4 game-loop), ESLint reports no errors, tsc reports no errors, committed to main.
**Files changed:** src/world.ts, tests/world.test.ts
**Reasoning:** EventBus is owned by World as a private subsystem, consistent with how GameLoop, SpatialGrid, and EntityManager are owned. Making World generic (defaulting to `Record<string, never>`) allows callers to opt into a typed event map without breaking existing no-param usage. Making `System` generic with the same default keeps the registered-system array fully type-safe.
**Notes:** The `System` type needed to become `System<TEventMap>` (not `System<any>`) to allow systems that call `w.emit(...)` to be properly typed. Existing tests that pass plain `() => ...` arrow functions still compile because TypeScript infers the system's world parameter from the array type, which is `System<Record<string, never>>` when no type param is given.

## [2026-04-05, UTC] — EventBus implementation complete

**Action:** Implemented EventBus class and integrated into World as a subsystem
**Result:** Success — 59 tests pass (9 event-bus unit + 5 world integration + 45 existing), lint clean, typecheck clean
**Files changed:** src/event-bus.ts (new), src/world.ts (modified), tests/event-bus.test.ts (new), tests/world.test.ts (modified), docs/ARCHITECTURE.md, docs/ROADMAP.md
**Reasoning:** Event system needed for system-to-system communication and future engine-to-client state output. Chose standalone class to match existing subsystem pattern.
**Notes:** World is now generic over TEventMap. Default is Record<string, never> so existing non-event code is unaffected. System type also made generic to match.

## [2026-04-05 20:05, UTC] — Task 2 (Input Command Layer): add TCommandMap generic to World and System

**Action:** Added second generic parameter `TCommandMap` to `System` type and `World` class; updated `systems` field and `registerSystem` parameter to use `System<TEventMap, TCommandMap>`.
**Result:** Success — all 63 tests pass, lint and typecheck clean.
**Files changed:** src/world.ts
**Reasoning:** Pure generic extension needed as groundwork for World owning a CommandQueue and exposing submit/drain APIs. Default `Record<string, never>` preserves backward compatibility for all existing code.
**Notes:** No behaviour change. Only type-level change.

## [2026-04-05 20:00, UTC] — CommandQueue: typed push/drain buffer

**Action:** Implemented CommandQueue<TCommandMap> with push, drain, and pending getter; created tests following TDD (tests written first, verified failing, then implemented).
**Result:** Success — 4 new tests pass; 63 total pass, lint clean.
**Files changed:** src/command-queue.ts (new), tests/command-queue.test.ts (new)
**Reasoning:** Standalone typed buffer class following the same subsystem pattern as EventBus. World will own it as a private field in a later task.

## [2026-04-05 20:13, UTC] — World: submit, registerValidator, registerHandler

**Action:** Added CommandQueue import, private commandQueue/validators/handlers fields, and submit/registerValidator/registerHandler methods to World; added 4 new tests following TDD (tests-first, verified failing, then implemented).
**Result:** Success — 4 new tests pass; 67 total pass, lint and typecheck clean.
**Files changed:** src/world.ts, tests/world.test.ts
**Reasoning:** submit validates data through all registered validator functions (short-circuit on first failure), then pushes to commandQueue only if all pass. registerValidator appends to a per-type array allowing multiple validators. registerHandler stores a single handler per type, throwing on duplicate registration. Handlers are stored but not called yet — that is Task 4's responsibility.
**Notes:** Used `never` cast in private map types to avoid excessive generic propagation while keeping public APIs fully typed.
**Notes:** drain() clears the internal buffer using `this.buffer.length = 0` (avoids reallocation). push uses a constrained generic `K extends keyof TCommandMap` for precise type inference per command.

## [2026-04-05 20:20, UTC] — World: processCommands wired into executeTick

**Action:** Added private `processCommands()` method to World that drains the CommandQueue and dispatches each command to its registered handler (throwing if none found). Wired it into `executeTick()` between `eventBus.clear()` and `syncSpatialIndex()`. Added 4 new tests following TDD (tests-first, verified 3 fail as expected, then implemented).
**Result:** Success — 4 new tests pass; 71 total pass (all test files), lint and typecheck clean.
**Files changed:** src/world.ts, tests/world.test.ts
**Reasoning:** Ordering `processCommands()` before `syncSpatialIndex()` ensures entity mutations made by command handlers (e.g. position changes) are picked up by spatial sync in the same tick. The error on missing handler is a safety guard that surfaces bugs early rather than silently dropping commands.
**Notes:** The "throws when registering duplicate handler" test was already passing (registerHandler guard existed from Task 3); only the 3 execution tests were truly new failures.

## [2026-04-05 20:30, UTC] — Tick-boundary and spatial sync ordering tests

**Action:** Added 2 integration tests verifying command tick-boundary behavior and processCommands-before-syncSpatialIndex ordering.
**Result:** Success — 73 total tests pass, lint clean.
**Files changed:** tests/world.test.ts
**Reasoning:** These tests lock in two critical ordering guarantees: (1) commands submitted by systems during a tick are not processed until the next tick, (2) handler-created entities with positions appear in the spatial grid by the time systems run.
**Notes:** No implementation changes; test-only task.

## [2026-04-05 20:35, UTC] — Architecture and roadmap docs updated for input command layer

**Action:** Updated ARCHITECTURE.md (component map, data flow, boundaries, drift log) and ROADMAP.md (moved input command layer from Planned to Built).
**Result:** Success — docs reflect current architecture.
**Files changed:** docs/ARCHITECTURE.md, docs/ROADMAP.md
**Reasoning:** Architecture maintenance per CLAUDE.md rules — structural changes require doc updates.
**Notes:** Input command layer feature is now complete: CommandQueue buffer, World integration (submit/validate/handle/process), 14 new tests (73 total), all docs updated.

## [2026-04-05 22:30, UTC] — State serialization

**Action:** Implemented JSON state serialization with World.serialize() and World.deserialize(). Added getState/fromState to EntityManager, entries/fromEntries to ComponentStore, setTick to GameLoop, and WorldSnapshot type in serializer.ts.
**Result:** Success — 13 new tests, 86 total pass, lint and typecheck clean.
**Files changed:** src/serializer.ts (new), src/world.ts, src/entity-manager.ts, src/component-store.ts, src/game-loop.ts, tests/serializer.test.ts (new), tests/entity-manager.test.ts, tests/component-store.test.ts, docs/ARCHITECTURE.md, docs/ROADMAP.md
**Reasoning:** State serialization is needed for save/load and client sync. JSON format chosen for debuggability, zero-dependency simplicity, and wire-readiness.
**Notes:** Spatial grid is not serialized — it rebuilds from position components on first step. Systems, event listeners, validators, and handlers are not serialized (runtime-only). Snapshot includes version field for future format evolution.

## [2026-04-05 23:11, UTC] — Task 2: EntityManager dirty tracking

**Action:** Added `createdThisTick` and `destroyedThisTick` private fields to `EntityManager`. Modified `create()` to push to `createdThisTick` in both branches. Modified `destroy()` to push to `destroyedThisTick` after the free-list push. Added `getDirty()` (returns shallow copies) and `clearDirty()` methods. Added 3 new tests covering create tracking, destroy tracking, and clearDirty.
**Result:** Success. 12/12 tests pass, ESLint clean, tsc clean, committed to main (838cd1e).
**Files changed:** src/entity-manager.ts, tests/entity-manager.test.ts
**Reasoning:** Dirty tracking on EntityManager mirrors the pattern established in ComponentStore (Task 1), enabling World to collect a per-tick diff of entity lifecycle events for State Diff Output.
**Notes:** getDirty returns copies so callers cannot mutate internal state. clearDirty uses `.length = 0` to truncate in place rather than reassigning arrays.
