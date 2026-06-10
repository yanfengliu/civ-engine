# LOC budget enforcement — implementation plan

**Objective:** every file under `src/` ≤ 500 lines, enforced by a regression test; oversized `tests/` files pinned by a no-growth ratchet. Pure internal refactor — zero public-API or behavior change. Ships as v0.8.15 in one commit.

**Why now:** AGENTS.md's review aspect 4 declares "No file > 500 LOC" a hard rule, and `src/world-strict-mode.ts`'s own header documents that Spec 6 was shaped around "the existing 2379-LOC overage." Five files violate the rule today: `world.ts` (2480), `occupancy-grid.ts` (1602), `history-recorder.ts` (546), `session-replayer.ts` (534), `world-debugger.ts` (509). Without a budget test, the rule only binds when a reviewer remembers it.

**Line metric:** raw file lines (what `wc -l` reports — content lines; a single trailing newline does not add a line). Comments and blanks count: this is a file-length rule, not a logic-density rule.

## 1. Budget test (`tests/loc-budget.test.ts`) — written first

- Every `src/*.ts` file must be ≤ 500 lines. **No grandfather list in the committed state** — the refactors below get all five violators under the limit before the commit.
- `tests/*.ts` ratchet: files currently over 500 are pinned at their current size (`layer.test.ts` 857, `command-transaction.test.ts` 848, `world.test.ts` 811, `world-commands.test.ts` 717, `serializer.test.ts` 675, `session-fork.test.ts` 648, `behavior-tree.test.ts` 565) and may only shrink; all other test files ≤ 500. Splitting the oversized suites is follow-up work — the ratchet stops the bleeding without churning 5k lines of test code in this same diff.
- TDD shape: the test lands first and fails on the five src violators; the refactor drives it green.

## 2. `world.ts` split — layered class chain

`World` is one class with ~92 public methods (~130 declaration lines with overloads). Even with every method body extracted to helper modules, a single facade file holding all signatures + fields + constructor lands ≈ 525-560 lines — over budget. So the class itself must split. TypeScript options considered:

- **Helper-function modules over a view interface** (the `world-strict-mode.ts` precedent): keeps one class; rejected because the facade alone still exceeds 500 (measured estimate above).
- **Prototype mixing / declaration merging:** rejected — breaks `tsc` declaration emit ergonomics and type safety for a 4-generic class.
- **Composition (subsystem controller objects):** rejected for the same facade-size reason, plus every controller needs shared mutable access to cross-cutting state (`entitySignatures`, `previousPositions`, poison flags), forcing a state-bag indirection through every hot path.
- **Layered inheritance chain (chosen):** internal abstract classes, each ≤ 500 lines, composing the same single runtime class. This is a file-organization device, not domain modeling — the AGENTS.md composition-over-inheritance preference targets the latter. Zero behavior change; `new World(...)` and `instanceof World` unchanged; hot paths gain nothing but a longer prototype chain (method lookup is memoized by V8 inline caches).

Layer order (bottom → top; each file exports one abstract class; none re-exported via `index.ts`):

| File | Class | Contents |
|---|---|---|
| `world-types.ts` | — | All currently-exported types/interfaces (`System`, `SystemRegistration`, `WorldMetrics`, `TickFailure`, `WorldTickFailureError`, …) plus shared internal types (`RegisteredSystem`, `QueryCacheEntry`, `TickRunOptions`, `ComponentTuple`). |
| `world-core.ts` | `WorldCore` | All protected fields, constructor (grid view, game loop wiring), strict-mode surface, poison/recover/warn, loop passthroughs (start/stop/speed/pause/tick), `random()`, tiny shared helpers (`assertAlive`, `getStore`, `getObservableTick`), `protected abstract executeTickOrThrow()`. |
| `world-queries.ts` | `WorldQueries` | Component-bit/signature cluster, query cache, `query`/`queryInRadius`/`findNearest`, spatial sync helpers (`syncSpatialEntity`, `rebuildSpatialIndex`, `removeFromSpatialIndex`). |
| `world-tags-meta.ts` | `WorldTagsMeta` | Tag/meta publics + internals (`addTagInternal`, `setMetaInternal`, destroy-time cleanup). |
| `world-entities.ts` | `WorldEntities` | Entity lifecycle (`createEntity`/`destroyEntity`/refs/generations/destroy callbacks) + component CRUD (`registerComponent`/`set`/`get`/`patch`/`remove`/`setPosition`). |
| `world-observers.ts` | `WorldObservers` | Events (`emit`/`on`/`off`/`getEvents`), resources delegates, state store, diff/metrics getters, all listener registries (`onDiff`, `onCommandResult`, `onCommandExecution`, `onTickFailure` + offs). |
| `world-commands.ts` | `WorldCommands` | `submit`/`submitWithResult`/`transaction`/validators/handlers, command result/execution creation + emission, `processCommands`, `dropPendingCommands`, `createTickFailure`, `emitTickFailure`. |
| `world-systems.ts` | `WorldSystems` | `registerSystem`, registration normalization, ordering resolution, `topologicalSort`, `executeSystems`. |
| `world-tick.ts` | `WorldTick` | `step`/`stepWithResult`, `executeTickOrThrow` (implements the abstract), `runTick`, `finalizeTickFailure`, `buildDiff`, dirty-tracking helpers. |
| `world.ts` | `World` | `serialize`, `static deserialize`, `applySnapshot`, `_replaceStateFrom`; re-exports the exact current public-type surface from `world-types.ts` (no layer classes leak through `index.ts`'s `export * from './world.js'`). |

Mechanics: fields change `private` → `protected` (names unchanged — no call-site churn); upward references (`executeTickOrThrow` from the constructor's game-loop callback) go through `protected abstract`; the handful of sites that pass `this` where `World<…>` is expected (system execute, handlers, validators, destroy callbacks) use one `protected asWorld()` helper in `WorldCore` containing the single `this as unknown as World<…>` cast, with a type-only (cycle-safe, erased) import of `World`. Static `deserialize` keeps protected access through its `World`-typed receiver. d.ts visibility shifts `private` → `protected` for internal fields; acceptable — TS privacy was always erasure-only, the fields stay undocumented, and `World` subclassing remains unsupported.

## 3. `occupancy-grid.ts` split — by class (natural seams)

| File | Contents |
|---|---|
| `occupancy-types.ts` | All shared exported interfaces/types (`OccupancyRect`, `OccupancyArea`, `GridPassability`, claim/metadata/binding types, state/metrics shapes). |
| `occupancy-internal.ts` | Shared validators (`assertCellIndex`, `assertPositiveInteger`, …) + metrics factories/cloners. |
| `occupancy-grid.ts` | `OccupancyGrid` class; re-exports everything currently exported from this path (import-path + `index.ts` star-export stability). |
| `occupancy-subcell.ts` | `SubcellOccupancyGrid` + slot-offset constants + subcell helpers. |
| `occupancy-binding.ts` | `OccupancyBinding` + its hooks/options helpers. |

## 4. Borderline trims

- `history-recorder.ts` (546): move `summarizeWorldHistoryRange` + its private helpers to `history-range-summary.ts`; re-export from `history-recorder.ts`.
- `session-replayer.ts` (534): move `deepEqualWithPath` + `deepEqualOrdered` to `session-deep-equal.ts`; re-export `deepEqualWithPath` (public via `index.ts` named block — verify the name list at implementation time).
- `world-debugger.ts` (509): move `createOccupancyDebugProbe` / `createVisibilityDebugProbe` / `createPathQueueDebugProbe` + their private helpers to `world-debug-probes.ts`; re-export (public via `index.ts` star-export).

## 5. Verification & docs

- Gates after each file-group lands (affected tests during iteration; full suite + typecheck + lint + build before commit).
- `npm pack --dry-run` sanity (new dist modules ship under `dist/`).
- Public-surface invariance check: `git stash`-free comparison of `dist/index.d.ts` exported names before/after (build pre-refactor, save the name list, diff post-refactor).
- Multi-CLI review of the full diff per AGENTS.md; REVIEW.md iterations under this objective's date folders.
- Docs: changelog 0.8.15 entry; devlog summary + detailed; ARCHITECTURE.md Component Map file columns for World / OccupancyGrid rows (+ a sentence on the layer-file convention); drift-log row (structural file split, boundaries unchanged); README badge; `src/version.ts`.

## Risks

- **Behavior drift during the move** — mitigated by zero-logic-change discipline (method bodies move verbatim), the 1075-test suite (world/serializer/determinism/strict-mode contracts all exercise the moved code), and reviewer focus on "is this a pure move."
- **Public-surface leak or loss** — mitigated by the d.ts exported-name diff and reviewers checking `index.ts` + `world.ts` re-export lists.
- **Type-only import cycles** (`world-types.ts` ↔ `world.ts`) — legal under Node16 ESM since type imports erase; verified by `tsc` in gates.
