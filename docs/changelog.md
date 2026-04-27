# Changelog

## 0.6.4 - 2026-04-26

Multi-CLI full-review iter-1 batch 5 (partial M3): standalone helper extraction. Non-breaking. 592 tests pass.

### Refactored

- **M3 (Opus Medium, partial):** extracted ~265 LOC of standalone helper functions (`createMetrics`, `getImplicitMetricsProfile`, `normalizeCommandValidationResult`, `cloneMetrics`, `cloneTickFailure`, `cloneTickDiff`, `createErrorDetails`, `errorMessage`, `now`, `phaseIndex`, `isSystemPhase`, `describeIntervalValue`, `validateSystemInterval`, `validateSystemIntervalOffset`, `insertSorted`, `validateWorldConfig`, `asPosition`) from `src/world.ts` into `src/world-internal.ts`. `src/world.ts` is now 2232 LOC (down from 2481). The deeper architectural split (serialize, system scheduling, tick pipeline, tags/state) into separate files is **deferred** to a follow-up task — those subsystems use private World methods/fields whose extraction requires a deliberate composition redesign rather than a mechanical move. AGENTS.md's 500 LOC cap is still violated by `world.ts` (2232), `occupancy-grid.ts` (1602), and marginally by `world-debugger.ts` (509); these will be re-flagged by iter-2 reviewers and addressed in a dedicated refactor branch.
- `TickMetricsProfile` is now exported (was internal) so the helper module can reference it.

## 0.6.3 - 2026-04-26

Multi-CLI full-review iter-1 batch 4: polish + doc fixes. Non-breaking. 592 tests pass (up from 591).

### Fixed

- **L1 (Opus Low):** `World.runTick` previously captured the executing tick in two places — `tick = metrics?.tick ?? this.gameLoop.tick + 1` for the in-progress paths (success + commands/systems/resources/diff failure), then re-derived `tick = metrics?.tick ?? this.gameLoop.tick` (no `+ 1`) in the listener-failure path because `gameLoop.advance()` had already run. The asymmetry was correct today but a maintenance hazard. Tick capture is now hoisted to a single declaration above the try block; both paths use the same value. Behavior unchanged.
- **L4 (Codex Low):** `docs/guides/resources.md:194` referenced a nonexistent `setTransfer(...)` API. Replaced with the actual pattern: `world.removeTransfer(...)` followed by `world.addTransfer(...)` with the new rate.
- **L7 (Gemini Low):** `GameLoop.advance()` previously incremented `_tick` without bound. After `Number.MAX_SAFE_INTEGER` ticks, modulo math used by interval scheduling silently corrupts. Practical concern is zero (~4.7 million years at 60 TPS), but the cost of a guard is one comparison. Now throws `RangeError('GameLoop tick counter saturated at Number.MAX_SAFE_INTEGER ...')` rather than silently producing a corrupted value.

## 0.6.2 - 2026-04-26

`World.deserialize` snapshot-tick validation. Multi-CLI full-review iter-1 batch 3. Non-breaking. 591 tests pass (up from 587).

### Fixed

- **M2 (Codex Medium):** `World.deserialize` previously passed `snapshot.tick` directly to `gameLoop.setTick()` without validation. A malformed snapshot containing `NaN`, a negative tick, a fractional tick, or `Infinity` would silently install the bad value, then propagate through `getObservableTick`, `TickDiff.tick`, and the new interval scheduling check `(tick - 1) % system.interval !== system.intervalOffset` — `(NaN - 1) % 5 === NaN`, so all interval-gated systems silently stop running. `deserialize` now validates `Number.isSafeInteger(snapshot.tick) && snapshot.tick >= 0` and throws `WorldSnapshot.tick must be a non-negative safe integer (got <value>)` on rejection.

## 0.6.1 - 2026-04-26

`Layer<T>` correctness + performance overhaul. Multi-CLI full-review iter-1 batch 2. Non-breaking — all changes are additive (`clear`, `clearAt`, `forEachReadOnly`) or internal optimization (strip-at-write, primitive fast-path, single-validate `fromState`, direct `clone`). 587 tests pass (up from 576).

### Added

- **`Layer.clear(cx, cy)` / `Layer.clearAt(wx, wy)`** — explicit "drop this cell back to default" methods. Both delete the underlying sparse-map entry; idempotent on already-default cells; bounds-validated.
- **`Layer.forEachReadOnly(cb)`** — zero-allocation traversal. Yields the live stored reference for non-default cells (or the live `_defaultValue` for unset cells). Caller must not mutate the value — for object `T` the reference is shared with internal storage. Use `forEach` if you need a defensive copy.

### Fixed

- **H2 (Codex + Gemini High):** `setCell` / `setAt` / `fill` previously stored every value, including ones equal to `defaultValue`, into the underlying `Map<number, T>`. Although `getState()` filtered default-equal entries on serialization, the live in-memory map could grow up to `width × height` entries — `layer.fill(defaultValue)` on a 1000×1000 layer allocated 1,000,000 entries. The strip-at-write fix: writes that match `defaultValue` (by `===` for primitive `T`, or by JSON fingerprint for object `T`) now `delete` the entry instead of storing it. `fill(defaultValue)` short-circuits to `cells.clear()`. The in-memory and canonical-sparse representations now agree without a `getState` round-trip.
- **H4 (Gemini High):** `Layer<T>` reads previously called `structuredClone` on every value, even for primitive `T` (`Layer<number>`, `Layer<boolean>`, `Layer<string>`, `Layer<null>`). The constructor now caches `_isPrimitive = isImmutablePrimitive(defaultValue)` and skips `structuredClone` on every read/write boundary when the value type is primitive. For object `T` the defensive-copy contract is unchanged. The new `forEachReadOnly` provides an explicit zero-allocation read path for object `T` consumers who own the no-mutate discipline.
- **M4 (Opus Medium):** `Layer.fromState` previously called `assertJsonCompatible(value, ...)` then `jsonFingerprint(value)` per cell, and `jsonFingerprint`'s implementation also calls `assertJsonCompatible` — paying validation twice. The explicit call was removed; validation is handled inside `jsonFingerprint`.
- **M5 (Gemini Medium):** `Layer.clone()` was implemented as `Layer.fromState(this.getState())`, paying two `structuredClone` passes per cell plus the intermediate `LayerState` object. Now implemented directly: instantiate a new layer, then iterate `this.cells` once with one clone per entry.

## 0.6.0 - 2026-04-26

`CommandTransaction` correctness + ergonomics overhaul. Multi-CLI full-review (Codex / Opus; Gemini quota-degraded but produced output) flagged a Critical (mutable preconditions broke the "all-or-nothing" guarantee) plus a three-reviewer consensus High (the new transaction surface dropped the v0.5.2 typed-component generics) plus several smaller hits. Breaking — `TransactionPrecondition` signature changed; `emit()` now validates JSON-compat at buffer time; `CommandTransaction` is now generic over `<TEventMap, TCommandMap, TComponents, TState>`. 576 tests pass (up from 569).

### Breaking

- **`TransactionPrecondition` receives a read-only world façade, not the live `World`.** The new `ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState>` type is `Omit<World, ...write methods>`. Predicates that previously called `world.setComponent(...)` etc. inside the predicate now fail to typecheck, and (if the type is cast away) throw at runtime: `CommandTransaction precondition cannot call '<method>': preconditions must be side-effect free`. The contract docs already promised "world untouched on precondition failure"; the implementation now enforces it. Predicates may freely call read methods (`getComponent`, `hasResource`, `getState`, `getInRadius`, etc.).
- **`CommandTransaction.emit(type, data)` validates JSON-compat at buffer time, not at `commit()`.** Calling `emit()` with a non-JSON-cloneable payload (e.g. `{ fn: () => 1 }`) throws immediately at the builder call. Previously the throw fired during `commit()` after all buffered mutations had already applied — partial-apply hazard. Buffer-time validation moves the failure to before any state change.
- **`CommandTransaction` is now generic over four params:** `<TEventMap, TCommandMap, TComponents, TState>` (mirroring `World`'s generic order). `world.transaction()` returns `CommandTransaction<TEventMap, TCommandMap, TComponents, TState>` so typed component / state access works inside transactions. Callers using the inferred return type need no change. Callers that explicitly typed `CommandTransaction<TEventMap>` need to drop the explicit annotation or update to four generics.

### Added

- **`ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState>` type export** (`src/command-transaction.ts`) — covers the read surface available inside a precondition.
- **Typed builder overloads** on `CommandTransaction.setComponent` / `addComponent` / `patchComponent` / `removeComponent` matching `World`'s typed/loose pattern. `world.transaction().setComponent(e, 'hp', { wrong: 5 })` against a `World<..., ..., { hp: { current: number } }, ...>` now produces a TypeScript error matching `world.setComponent`.
- **`World.warnIfPoisoned(api)` is now public** (was private). The `CommandTransaction.commit()` path calls it with `api='transaction'` so a poisoned world emits the standard "warn-once-per-poison-cycle" diagnostic before applying any buffered mutation.

### Fixed

- **C1 (Critical, single-reviewer):** mutable preconditions could violate the transaction's atomicity guarantee. A predicate could call `setComponent` / `removeResource` / `emit` etc. on the live world, then return `false`; `commit()` would report `precondition_failed` while the predicate's writes stayed applied. The new read-only façade enforces side-effect freedom both at the type level (`Omit` excludes write methods) and at runtime (Proxy throws on forbidden method names + property writes).
- **H1 (High, three-reviewer consensus):** `CommandTransaction` previously had only `<TEventMap>`. Generic threading is restored.
- **H3 (High):** `world.transaction()` skipped the v0.5.1 `warnIfPoisoned` policy. `commit()` now emits the warning once per poison cycle.
- **M1 (Medium):** mid-emit JSON-compat failure used to leave mutations applied. Validation moved to buffer time.
- **L2 (Low):** after `abort()`, builder methods now throw "already aborted" (not "already committed"). A separate `terminalReason` field tracks the original terminal state so error messages stay honest.
- **L6 (Low):** the `as unknown as World<TEventMap, any, any, any>` cast and two `eslint-disable @typescript-eslint/no-explicit-any` comments at the `world.transaction()` site were obsoleted by H1 and removed.

### Documented

- **`docs/architecture/ARCHITECTURE.md`** — `CommandTransaction` Boundaries paragraph updated: predicates receive a read-only façade; `commit()` warns on poisoned world; `emit()` validates payloads at buffer time.
- **`docs/api-reference.md`** — `## Command Transaction` section updated with the new generic signature, `ReadOnlyTransactionWorld` type, and the buffer-time-validation note.

## 0.5.11 - 2026-04-25

`CommandTransaction` — atomic propose-validate-commit-or-abort builder over `World`. Inspired by MicropolisCore's `ToolEffects` (`MicropolisEngine/src/tool.h:171–305`), where a tool gathers a `WorldModificationsMap` of position-to-tile changes plus a cost, then `modifyIfEnoughFunding()` commits atomically or discards. For an AI-native engine this is the natural shape of "agent proposes an action, engine validates cost/preconditions, mutations + events apply or none do." 569 tests pass (up from 540).

### Added

- **`CommandTransaction<TEventMap>` class (`src/command-transaction.ts`)** — exported from package root.
- **`world.transaction()` method** — returns a fresh transaction bound to the world. The returned transaction inherits the world's `TEventMap`.
- **Builder methods (chainable):** `setComponent`, `addComponent`, `patchComponent`, `removeComponent`, `setPosition`, `addResource`, `removeResource`, `emit`, `require`. Each returns `this`. Each throws if the transaction has already been committed or aborted.
- **`require(predicate)`** — buffers a precondition. `predicate(world)` returns `true` (pass), `false` (fail with default reason), or a `string` (fail with the string as reason). Predicates run in registration order at the start of `commit()` and short-circuit on first failure. Each predicate sees the **current live world state**, not the transaction's proposed mutations.
- **`commit()`** — runs preconditions; on failure returns `{ ok: false, code: 'precondition_failed', reason }` with **no mutation or event applied**. On success applies every buffered mutation in order through the corresponding public `World` API, emits every buffered event through `EventBus`, and returns `{ ok: true, mutationsApplied, eventsEmitted }`.
- **`abort()`** — marks a pending transaction as aborted. Subsequent `commit()` returns `{ ok: false, code: 'aborted' }`. Idempotent — `abort()` on a committed or already-aborted transaction is a no-op.
- **`TransactionResult` type export** — discriminated union covering the three outcomes.
- **`TransactionPrecondition` type export** — for callers that want to type predicates separately.

### Atomicity guarantees

- **Precondition failure → world untouched.** No buffered mutation, no buffered event runs. Verified by the `precondition failure leaves world untouched (no partial state)` test which buffers `removeResource` + two `setComponent` calls + a precondition that returns a string, and asserts every original value is unchanged after `commit()`.
- **Preconditions see the pre-commit baseline.** Verified by the `all preconditions run before any mutation applies` test: a transaction sets `hp` to 999 and adds a precondition that reads `hp` from the world; the precondition observes the original value (50), not the proposed 999.
- **Within a tick, transaction mutations all appear in the same `TickDiff`.** Verified by the `within a tick, transaction mutations all appear in the same TickDiff` test which runs a transaction inside a system and asserts both component types appear in the resulting diff.

### v1 limitations (documented, not yet implemented)

- **Unbuffered ops:** `createEntity`, `destroyEntity`, `addTag`, `removeTag`, `setMeta`, `deleteMeta`, `setState`, `deleteState`, and resource registration / `setResourceMax`. v1 covers components (set / add / patch / remove), position, events, and resource add / remove.
- **Aliasing window.** Buffered values are stored by reference. Mutating a buffered object between the builder call and `commit()` is observable at apply time. Treat buffered values as owned by the transaction once handed over.
- **Mid-commit throw → partial state, transaction consumed.** If a buffered mutation throws mid-commit, the error propagates and earlier mutations stay applied. The transaction is still consumed (status flips to `committed` in a `finally` block) so calling `commit()` again throws — the caller cannot retry and silently double-apply earlier mutations (e.g., double-debit a resource). Validate entity liveness via `require((w) => w.isAlive(entity) || 'entity dead')` before mutating.
- **Mid-emit throw → partial event delivery.** Events fire synchronously in registration order after all mutations apply. If event N's listeners throw or the JSON-compat check rejects payload N, mutations 0..M and events 0..N-1 are already applied / fired. The transaction-level "all-or-nothing" promise covers preconditions, not emit-time exceptions.

### Documented

- **`docs/architecture/ARCHITECTURE.md`** — `CommandTransaction` added to the Component Map and a Boundaries paragraph describing the propose-validate-commit-or-abort contract, the "preconditions see live state, not the proposed projection" rule, and the v1 surface limits.
- **`docs/api-reference.md`** — new `## Command Transaction` section between `## VisibilityMap` and `## Layer` covering `world.transaction()`, the builder methods table, the `TransactionPrecondition` and `TransactionResult` types, the `commit`/`abort` semantics, the v1 limitations, and a worked cost-checked build example.

## 0.5.10 - 2026-04-25

`Layer<T>` — generic typed overlay map utility for downsampled field data. Inspired by MicropolisCore's `Map<DATA, BLKSIZE>` template (`MicropolisEngine/src/map_type.h:111`), where pollution, traffic-density, fire-station influence, etc., are each typed maps at different downsampled resolutions of the world. Standalone utility, no `World` dependency. Sibling of `OccupancyGrid` / `VisibilityMap`. 540 tests pass (up from 491).

### Added

- **`Layer<T>` (`src/layer.ts`)** — exported from package root. Constructor takes `LayerOptions<T>`: `worldWidth`, `worldHeight`, optional `blockSize` (default `1`), and `defaultValue`. Cell grid dimensions derive as `Math.ceil(worldWidth / blockSize)` × `Math.ceil(worldHeight / blockSize)`.
- **`Layer<T>.getCell(cx, cy)` / `setCell(cx, cy, value)`** — cell-coordinate access with bounds and integer-coordinate validation.
- **`Layer<T>.getAt(worldX, worldY)` / `setAt(worldX, worldY, value)`** — world-coordinate access; auto-buckets to `Math.floor(world / blockSize)`. Bounds-validates against `worldWidth`/`worldHeight`.
- **`Layer<T>.fill(value)`** — sets every cell to `value`.
- **`Layer<T>.forEach(cb)`** — visits every cell in row-major order, including unset cells (which yield `defaultValue`).
- **`Layer<T>.getState()` / `Layer.fromState<T>(state)`** — sparse JSON-serializable round-trip; cells matching `defaultValue` (by JSON fingerprint) are stripped from the snapshot; entries are sorted by cell index for determinism.
- **`Layer<T>.clone()`** — independent deep copy.
- **`LayerState<T>` and `LayerOptions<T>` type exports** — for consumers building higher-level abstractions on top.

### Validated

- `worldWidth`, `worldHeight`, `blockSize` must be **safe positive integers** (`Number.isSafeInteger`). The constructor also rejects `width * height` products that exceed `Number.MAX_SAFE_INTEGER`.
- `defaultValue` and every written cell value must satisfy `assertJsonCompatible` — no functions, symbols, BigInt, circular references, or class instances.
- Cell coordinates must be integers in `[0, width)` × `[0, height)`; world coordinates must be integers in `[0, worldWidth)` × `[0, worldHeight)`. Both out-of-range and non-integer inputs throw `RangeError` (consistent error type).
- `Layer.fromState` validates state shape (non-null object, `state.cells` is an array of `[index, value]` tuples, `state.blockSize` is present), validates each cell index is a safe integer in range, rejects duplicates, JSON-compatibility-checks each value, and **canonicalizes** by stripping any cell whose value matches `defaultValue`.

### Defensive-copy contract

Inspired by the v0.4.0+ direction (`world.grid.getAt()` returns a fresh `Set` copy; `getDiff`/`getEvents`/`serialize` deep-clone), `Layer<T>` `structuredClone`s on every value boundary:

- **Writes** (`setCell`, `setAt`, `fill`): the input value is cloned before storage. Mutating the original after the call cannot affect the Layer.
- **Reads** (`getCell`, `getAt`, `forEach`, the `defaultValue` getter): the returned value is a fresh clone of internal storage. Mutating the returned value cannot affect the Layer or other readers.
- **Serialization** (`getState`, `Layer.fromState`, `clone`): values are cloned at both ends.

For primitive `T` (`number`, `string`, `boolean`, `null`) the clones are zero-cost. For object `T`, every read pays `structuredClone(value)` — if profiling shows this dominates a hot loop, batch reads via `getState()` (one bulk clone) instead.

The default-value-strip comparison uses `jsonFingerprint` (canonical with `src/json.ts`), which under the hood is `JSON.stringify`. Two objects that are deeply equal but constructed with different key orders will not match — for object-typed `T` defaults, write your values with the same key order as `defaultValue` if you want them stripped on serialize.

### Design notes

- Storage is **sparse**: only cells that have been explicitly written are kept in the backing `Map`. Reads of unset cells return a fresh clone of `defaultValue`.
- The fingerprint of `defaultValue` is computed once at construction and cached, so `getState()` and `Layer.fromState()` strip default-valued entries in O(n) `jsonFingerprint` calls (one per stored cell), not O(n²).
- Layers are intentionally **not owned by `World`**. Game code instantiates a layer per concern (one for pollution, one for influence, one for danger) and ticks them from systems. This mirrors the existing pattern for `OccupancyGrid` / `VisibilityMap` / `Pathfinding`.

### Documented

- **`docs/architecture/ARCHITECTURE.md`** — Layer added to the Component Map and Boundaries sections, positioned next to `OccupancyGrid` and `VisibilityMap`.
- **`docs/api-reference.md`** — new `## Layer` section between `## VisibilityMap` and `## Noise` covering `LayerOptions<T>`, `LayerState<T>`, the constructor, every method, properties, the defensive-copy contract, the `fromState` validation throw list, the fingerprint key-order caveat, and a worked pollution example.

## 0.5.9 - 2026-04-25

Per-system cadence scheduling. Inspired by MicropolisCore's `simCycle % speedTable[idx]` pattern (`MicropolisEngine/src/simulate.cpp:134–143`): different sub-systems should run at different rates without each one re-implementing modulo gating. Additive, no migration needed for callers using the legacy `if (w.tick % N !== 0) return;` pattern. 491 tests pass (up from 467).

### Added

- **`SystemRegistration.interval` and `LooseSystemRegistration.interval`** (default `1`). The engine skips the system on ticks where `(executingTick - 1) % interval !== intervalOffset`, where `executingTick` is the tick number being processed (equal to `world.tick + 1` while the system is running). With `interval: N` and the default `intervalOffset: 0`, the system fires on ticks 1, N+1, 2N+1, … This matches the legacy `if (world.tick % N !== 0) return;` schedule exactly, so existing periodic systems migrate to the field by direct substitution without changing when the first fire happens.
- **`SystemRegistration.intervalOffset` and `LooseSystemRegistration.intervalOffset`** (default `0`, must satisfy `0 <= intervalOffset < interval`). Shifts the cadence so two interval-N systems can be staggered onto disjoint ticks. Three systems with `interval: 3` and offsets `0`/`1`/`2` partition every tick into a stable round-robin.
- Skipped systems do not invoke their `execute` body and do not push a per-system entry into `WorldMetrics.systems`. The cheap `(tick - 1) % interval` check still runs across all registered systems, so `WorldMetrics.durationMs.systems` (the per-tick total measured around the whole systems pass) is not literally zero for skip ticks — the savings come from the body, not from the dispatch.

### Validated

- `interval` must satisfy `Number.isSafeInteger(interval) && interval >= 1`; rejected otherwise at `registerSystem` time with a descriptive error that quotes the offending value with its type. Bounding to safe-integer range avoids non-deterministic modulo results past `2^53`.
- `intervalOffset` must satisfy `Number.isSafeInteger(intervalOffset) && 0 <= intervalOffset < interval`; rejected otherwise at `registerSystem` time.
- Validation runs **before** the order counter and resolved-order cache mutate, so a rejected registration does not burn an order slot or invalidate the cached system order.
- Ordering constraints (`before`/`after`) remain independent of cadence — topological sort still resolves intra-phase order, and skipped systems do not break the determinism of un-skipped systems' ordering.

### Behavior callouts

- **Failed ticks consume a cadence slot.** If a tick aligned with a periodic system's modulo fails, that fire opportunity is lost; the engine does not retry on the next successful tick. Tested by `failed tick consumes a cadence slot`.
- **Mid-game registration is anchored to absolute tick numbering.** Registering `interval: 10, intervalOffset: 5` at tick 7 means the next fire is the next tick where `(tick - 1) % 10 === 5`, not "5 ticks from now."
- **`metrics.systems[].name` shape becomes tick-variable** when periodic systems are registered: a periodic system is present in `metrics.systems` on its fire ticks and absent on skip ticks. Existing telemetry consumers that assumed a stable shape across ticks should note this.

### Documented

- **`docs/api-reference.md`** — `SystemRegistration` and `LooseSystemRegistration` interfaces include the new fields; `registerSystem` table lists `interval`/`intervalOffset`; throws list extended; example block shows a `Weather` system on `interval: 12` and a stagger pattern. The semantics of `executingTick` are pinned (equal to `world.tick + 1` during system execution).
- **`docs/guides/systems-and-simulation.md`** — "Periodic systems" section rewritten to recommend the `interval` field over the manual `if (w.tick % N !== 0) return;` pattern, with a stagger example and explicit notes on (a) failed-tick cadence semantics, (b) mid-game registration anchoring, and (c) when the legacy manual form is still appropriate (runtime-varying cadence).

## 0.5.8 - 2026-04-25

Iter-2 fix-review iteration 5 — **Codex CLEAN, Gemini CLEAN, Opus** flagged one remaining inconsistency in `serialization-and-diffs.md:74` ("still accepts versions 1–4" — internally inconsistent with the file's own lines 116/120, which correctly say 1–5). Fixed.

### Documented

- **`docs/guides/serialization-and-diffs.md:74`** — corrected "still accepts versions 1–4" to "accepts versions 1–5" so it lines up with the deserialize description below it and `src/world.ts` validation (which accepts `1..5`).

## 0.5.7 - 2026-04-25

Iter-2 fix-review iteration 4 — Gemini CLEAN; Codex and Opus both flagged the same residual canonical-guide drift across 7 files (the v0.5.6 cleanup only covered the three files Codex iter-3 explicitly cited). All addressed.

### Documented

- **`docs/guides/concepts.md`** — corrected the "direct mutations are diff-detected" line; removed the `Sync spatial index` step from the tick-lifecycle ASCII art; rewrote the "Spatial grid syncs before systems" implication line.
- **`docs/guides/spatial-grid.md`** — Overview rewritten (lock-step write-time sync, runtime-immutable read-only delegate, `getAt` returns a fresh `Set`); replaced the `Timing within a tick` block with the explicit-write contract.
- **`docs/guides/systems-and-simulation.md`** — removed `syncSpatialIndex()` from the tick-lifecycle numbered list; added an explicit note that the grid is in sync at all times; replaced the "Spatial sync before systems" implication row with "Grid is updated at every position write".
- **`docs/guides/getting-started.md`** — corrected the spatial-grid section ("direct position mutations are picked up by the next tick's spatial sync" → "Direct in-place mutation is not auto-detected and the grid will not reflect it").
- **`docs/guides/entities-and-components.md`** — corrected the "Mutations are immediate and are detected for diffs" line.
- **`docs/guides/serialization-and-diffs.md`** — corrected the "In-place mutation detection still works" line (no longer true in either mode); updated the deserialize version range to `1..5` and added the `references dead entity` throw to the list.
- **`docs/guides/debugging.md`** — softened the wording on the in-place-position-mutation tip so it doesn't imply the mutation gets auto-synced later.

## 0.5.6 - 2026-04-25

Iter-2 fix-review iteration 3 — Gemini and Opus signed off CLEAN; Codex flagged remaining doc drift in canonical guides and the `api-reference.md` System / SystemRegistration / callback signatures (still 2-generic in docs even though src was updated to 4-generic in v0.5.2). All addressed.

### Documented

- **`docs/guides/public-api-and-invariants.md`** — corrected the prose describing component writes: in-place mutations of `getComponent()`-returned objects are NOT diff-detected; all changes must go through `setComponent` / `addComponent` / `patchComponent` / `setPosition`. The pre-v0.5.0 wording suggesting otherwise is gone.
- **`docs/guides/commands-and-events.md`** — removed `syncSpatialIndex()` from the tick-timing diagram (the per-tick scan was removed in v0.5.0).
- **`docs/api-reference.md`** — `System`, `SystemRegistration`, `LooseSystem`, `LooseSystemRegistration` now show the four-generic signature with `TComponents` and `TState`; `ComponentRegistry` description mentions both registry generics; callback parameter signatures for `registerValidator`, `registerHandler`, `onDestroy`, `offDestroy` show the four-generic `World<TEventMap, TCommandMap, TComponents, TState>` form. The 2-generic form was the v0.5.1 baseline; v0.5.2 already updated the source.

## 0.5.5 - 2026-04-25

Iter-2 fix-review iteration 2 — multi-CLI re-review (Codex/Gemini/Opus). Gemini signed off CLEAN; Codex and Opus flagged remaining doc drift + missing regression tests. All addressed. 467 tests pass.

### Fixed

- **`cloneTickFailure` now uses `JSON.parse(JSON.stringify())`** to match `cloneTickDiff`. The previous `structuredClone` rationale (preserve Error stack) was incorrect: `createTickFailure` already normalizes `error` via `createErrorDetails` to a plain `{name, message, stack}` object before storage, so the `error` field is never an Error instance at clone time. Both helpers now use the same JSON path with a comment explaining why.
- **`docs/architecture/ARCHITECTURE.md` Boundaries section** — three lines that still described removed v0.5.0 features cleaned up: `SpatialGrid` description now reflects lock-step write-time sync (no scan); snapshot description drops `detectInPlaceMutations`; metrics description drops "spatial scan counts" in favor of `spatial.explicitSyncs`.
- **`docs/guides/debugging.md`** — `spatialSync` failure phase, `spatial_sync_threw` code, and `spatial-full-scan` debugger issue removed from the failure-codes / issue-codes tables; the bottleneck-finding example no longer reads removed metrics fields.
- **`docs/guides/public-api-and-invariants.md`** — `getMetrics()` description updated to "explicit-sync counts".
- **`docs/api-reference.md`** — `getMetrics()` description updated to mention `spatial.explicitSyncs` instead of "spatial scan counts".

### Added

- **Regression test for `world.grid.getAt()` Set isolation** — `mutating the Set returned by getAt does not corrupt the engine grid` directly tests the v0.5.4 fix.
- **Regression test for `getLastTickFailure()` reference isolation** — `getLastTickFailure returns isolated copies; mutation does not bleed across calls` locks in the per-call clone contract.

### Polish

- Trailing blank lines inside `new World({ ... })` config literals removed in `tests/world-debugger.test.ts`, `tests/history-recorder.test.ts`, `tests/scenario-runner.test.ts` — left over after the v0.5.0 `detectInPlacePositionMutations` field removal.

## 0.5.4 - 2026-04-25

Iter-2 fix-review iteration 1 — multi-CLI review (Codex/Gemini/Opus) caught real issues in the v0.5.0–0.5.3 chain. 465 tests pass.

### Fixed

- **`world.grid.getAt()` no longer returns the live backing `Set`.** The delegate now returns a fresh `Set` copy (or `null`) so `(world.grid as any).getAt(x, y).clear()` cannot corrupt the spatial index. Closes the runtime read-only hardening hole that the v0.5.0 delegate left open.
- **`getLastTickFailure()` returns a fresh defensive copy on every call.** Reverts the v0.5.3 cache that returned the same object reference to repeat callers — different consumers could mutate each other's view of the failure. Per-call `cloneTickFailure(...)` matches the contract of `getDiff`/`getEvents`.
- **`cloneTickDiff()` reverts to `JSON.parse(JSON.stringify())`.** `TickDiff` is JSON-shaped by contract (assertJsonCompatible at write time), and the JSON round-trip is faster than `structuredClone` for plain objects on V8. `cloneTickFailure()` keeps `structuredClone` because `TickFailure.error` may carry an `Error` instance whose stack `JSON.stringify` would erase.
- **`EventBus.getEvents()` reverts to `JSON.parse(JSON.stringify())`** for the same reason — emit-time validation guarantees JSON shape.

### Added

- **`World.serialize({ inspectPoisoned: true })` opt-out for the poisoned-world warn.** Engine-internal debug tooling (`WorldDebugger.capture()`, `scenario-runner.captureScenarioState()`, `WorldHistoryRecorder` snapshots) now passes this option so it doesn't trigger its own warning when inspecting a poisoned world. The default behavior — warn on `serialize()` and `submit()` from a poisoned world — is unchanged for normal callers.
- **Regression tests:**
  - `World.deserialize` rejects malformed snapshots whose `tags` or `metadata` reference dead entities (locks in L_NEW4).
  - Legacy v0.4.x snapshot fields (`config.detectInPlacePositionMutations`, `componentOptions[*].detectInPlaceMutations`) are silently ignored on read (locks in the v0.5.0 backward-compat promise).
  - Warn-once invariant: `submit + submit + serialize + serialize` after a single failure produces exactly one `console.warn`, and `recover()` re-arms the latch for the next poison cycle.
  - `serialize({ inspectPoisoned: true })` does not warn.

### Documented

- **`docs/api-reference.md`** — removed `'spatialSync'` from `TickFailurePhase`; updated `World.deserialize` signature to four-generic form (with `LooseSystem`/`LooseSystemRegistration` in the systems-array union); updated `serialize()` docs with the new `inspectPoisoned` option and the deep-clone behavior; removed stale "submit fast path" prose under the instrumentation profile docs and the `submit()` reference; added the `references dead entity` throw to deserialize's `Throws` list.
- **`docs/architecture/ARCHITECTURE.md`** — removed `World.syncSpatialIndex()` from the data-flow diagram and the `spatialSync` phase from the tick-failure list.
- **`examples/debug-client/app.js`** — debug client metrics row now reads only `metrics.spatial.explicitSyncs`.
- **`examples/debug-client/worker.js`** — removed the dead `detectInPlacePositionMutations: false` literal.
- **`scripts/rts-benchmark.mjs`** — removed `metrics.spatial.fullScans`/`scannedEntities` reads (both `undefined` post-v0.5.0); removed the dead config field; benchmark report now publishes `spatialExplicitSyncs`.

### Polish

- `normalizeSystemRegistration` casts now use the four-generic `System<TEventMap, TCommandMap, TComponents, TState>` form, matching the rest of the v0.5.2 H_NEW3 refactor.
- Trailing whitespace cleanup in `tests/world-debugger.test.ts`, `tests/history-recorder.test.ts`, `tests/scenario-runner.test.ts` left over from the v0.5.0 field removal.

## 0.5.3 - 2026-04-25

Iter-2 batch 5 — medium + polish items from the iter-2 review. 459 tests pass.

### Fixed

- **`setMeta` rejects non-finite numbers** (`NaN`, `Infinity`, `-Infinity`). Previously these were accepted and silently coerced to `null` by `JSON.stringify`, causing in-memory state to diverge from the persisted snapshot. (M_NEW2)
- **`findPath` no longer pushes overcost neighbors onto the heap or `bestG`.** When a candidate's `newG > maxCost`, the loop now skips it before allocating heap/`cameFrom`/`bestG` entries. Pure efficiency win for path queries that exceed `maxCost`. (M_NEW3)
- **`World.deserialize` rejects `tags`/`metadata` for dead entities.** Previously a malformed snapshot could create reverse-index entries that bled into recycled IDs when `createEntity()` reused them. (L_NEW4)
- **`EntityManager.fromState` validates each `alive[i]` is a boolean and each `generations[i]` is a non-negative integer.** Previously only `freeList` shape was checked. (R4 from iter-2)
- **`World.registerComponent` and `World.deserialize` clone `ComponentStoreOptions`** before storing them, so later caller mutation can't desync the snapshot's reported options from the constructed `ComponentStore`. (L_NEW7)
- **Path cache no longer double-clones on cache miss.** The resolved path is cloned once for the cache; the original is yielded to the caller. ~3× → 2× allocation per miss. (L_NEW2)

### Improved

- **`getLastTickFailure()` is now O(1) on repeat calls.** The clone is cached on first read and invalidated on `recover()` or new failure. (M_NEW5)
- **`cloneTickFailure` and `cloneTickDiff` use `structuredClone` instead of `JSON.parse(JSON.stringify())`.** Faster on hot listener paths; the JSON-shape contract is still enforced at the write side via `assertJsonCompatible`. (L_NEW1)
- **`findNearest` early-out comment clarified** to call out the Chebyshev-bound vs Euclidean-distance distinction explicitly. (L_NEW6)

### Documented

- **`docs/guides/resources.md`** — added explicit FIFO priority semantics for transfers from a shared source. Per the iter-2 Q5 user decision: when demand exceeds supply, transfers drain the source in registration order. Game code that needs proportional/priority distribution must manage allocation manually. (M_NEW4)
- **`docs/guides/rts-primitives.md`** — added a "Static blocks vs occupancy" section clarifying that `OccupancyBinding.block()` is for entity-less terrain only, `ignoreEntity` does not apply to static blocks, and entity-owned blocking should use `occupy()` instead. Per the iter-2 Q2 user decision (Option A). (R5/M10)

## 0.5.2 - 2026-04-25

Iter-2 batch 4 — typed registries thread through every callback boundary (H_NEW3). Type-only refactor; runtime behavior unchanged. 453 tests pass.

### Changed

- **`System`, `SystemRegistration`, and `RegisteredSystem` now accept `TComponents` and `TState` generics** (in addition to `TEventMap` / `TCommandMap`). Defaults match the previous behavior so existing call sites continue to compile.
- **`registerSystem`, `registerValidator`, `registerHandler`, `onDestroy`/`offDestroy`, and `World.deserialize`** now thread the world's full generic signature into their callback parameters. Inside a system, validator, handler, or destroy hook, `world.getComponent`/`world.getState` and friends preserve the typed-registry signatures established at construction.
- **`destroyCallbacks` field type** updated to match.

### Migration

No runtime change. Existing code without explicit type annotations continues to work. Code that wrote callbacks with the explicit `(world: World<Events, Commands>) => void` signature can now widen to `(world: World<Events, Commands, Components, State>) => void` to gain compile-time access to the typed component and state APIs inside the callback body.

## 0.5.1 - 2026-04-25

Iter-2 batch 3 — poison-contract integrity (H_NEW1 + H_NEW2). 452 tests pass.

### Fixed

- **Listener exceptions no longer bypass the fail-fast contract.** `commandExecutionListener`, `commandResultListener`, and `tickFailureListener` invocations are now wrapped in `try/catch`. A throwing listener logs to `console.error` and the engine continues. Previously, a synchronous listener throw inside `processCommands` propagated up through `runTick` past `finalizeTickFailure` — the world was partially mutated but `this.poisoned` was never set, so subsequent `step()` calls happily ran on inconsistent state. Listener bugs are observability bugs and no longer corrupt engine state.

### Added

- **`submit()` and `serialize()` warn (once per poison cycle) when called on a poisoned world.** The APIs remain available — debug/repair workflows often need to inspect or queue work against a poisoned world — but the engine now emits a single `console.warn` per `(poison → recover)` cycle so an AI-agent operator notices when their loop is missing the recovery step. The warning resets on `world.recover()`.

## 0.5.0 - 2026-04-25

Breaking release. Removes the in-place mutation auto-detection paths (component-store and spatial-index), tightens `world.grid` to a runtime-immutable delegate, and rejects non-JSON-compatible event payloads at `EventBus.emit`. All component and position writes must now go through `setComponent`/`addComponent`/`setPosition`. Iter-2 `R1` and `R3` from the same-day full-codebase review.

### Breaking Changes

- **Removed `ComponentStoreOptions.detectInPlaceMutations`.** `getDirty()` now reports only entries marked dirty via `set()` / `remove()`. `clearDirty()` only rebuilds the fingerprint baseline when `diffMode === 'semantic'`. Direct in-place mutation of component objects (`world.getComponent(id, 'pos').x = 5`) is no longer detected — game logic must call `setComponent` (or `setPosition`) for changes to land in the diff.
- **Removed `WorldConfig.detectInPlacePositionMutations`.** The per-tick spatial index full-scan is gone. Position writes that go through `setPosition`/`setComponent` already update the grid and `previousPositions` immediately; the scan was only the fallback for in-place mutators.
- **Removed `World.markPositionDirty()`.** It existed solely to flush in-place position mutations into the grid; without that pattern there's nothing to flush. Use `setPosition` instead.
- **Removed `WorldMetrics.spatial.fullScans` and `.scannedEntities`.** The full-scan is gone. `WorldMetrics.spatial.explicitSyncs` (incremented by every `setPosition`-style write) and `WorldMetrics.durationMs.spatialSync` (likewise removed) are no longer reported.
- **Removed `'spatialSync'` from `TickFailurePhase`.** No phase to fail in.
- **`world.grid` is now a runtime-immutable read-only delegate.** Previously typed `SpatialGridView` but assigned `this.spatialGrid` directly, so `(world.grid as any).insert(...)` could mutate the index. Now `world.grid` is a small object exposing only `width`, `height`, `getAt`, `getNeighbors`, `getInRadius`. Mutating SpatialGrid methods are not present at runtime.
- **`EventBus.emit` now rejects non-JSON-compatible payloads** (functions, symbols, BigInt, circular references, class instances) via `assertJsonCompatible`. The previous behavior was to accept anything and silently degrade `getEvents()` to a shared reference for unclonable payloads. Migration: ensure event payloads are plain JSON-shaped objects.
- **`getEvents()` no longer falls back to a shared reference on clone failure.** It always returns a deep `structuredClone`. Combined with the emit-time validation above, this means `getEvents()` cannot return live engine references.

### Migration

Most consumers should be unaffected — `setPosition`, `setComponent`, and `addComponent` were already the documented write paths. Code that mutated component objects in place (`pos.x = 5`) and relied on the per-tick scan to find the change must switch to `setPosition`/`setComponent`. Snapshots from v0.4.0 still load: extra fields (`detectInPlacePositionMutations`, `componentOptions[*].detectInPlaceMutations`) are ignored on read.

## 0.4.1 - 2026-04-25

Iter-2 critical fixes from the same-day full-codebase review (`docs/reviews/full/2026-04-25/2/`). Two correctness/isolation bugs the iter-1 fixes left open. 450 tests pass (up from 446 in 0.4.0).

### Fixed

- **`findNearest` returns the entity at the diagonal corner of any non-tiny grid.** Previously the loop bound was `Math.max(width, height)` (Chebyshev), but `getInRadius` filters by Euclidean distance — so on any grid where `hypot(W-1, H-1) > max(W, H)`, entities in the diagonal corner from the search point silently returned `undefined`. Bound is now `Math.ceil(Math.hypot(W-1, H-1))`. Reproducible repro: 4×4 grid, entity at `(3, 3)`, `findNearest(0, 0)` now returns the entity.
- **`World.serialize()` and `World.deserialize()` no longer alias caller-owned objects.** Both boundaries `structuredClone` component data and state values; mutating the returned snapshot after `serialize()` no longer mutates live engine state, and mutating the snapshot input after `deserialize()` no longer mutates the deserialized world. Other public boundaries (`getDiff`/`getEvents`/`getByTag`) already had this property in 0.4.0.

## 0.4.0 - 2026-04-25

This release is the result of a multi-CLI full-codebase review (Codex `gpt-5.4`, Gemini `gemini-3.1-pro-preview`, and Claude Opus 4.7 1M-context). 25 distinct findings consolidated and addressed across the tick pipeline, snapshot fidelity, command pipeline, behavior tree, and defensive-view contracts. Two post-fix review iterations caught regressions in the fixes themselves; both were resolved before merge. 446 tests pass (up from 415).

### Breaking Changes

- **Tick failure semantics are now fail-fast.** Any tick failure marks the world as poisoned. `world.step()` throws `WorldTickFailureError` and `world.stepWithResult()` returns a `world_poisoned` failure result until `world.recover()` is called. Previously, callers could `step()` again immediately and observe a partially-mutated world.
- **Failed ticks consume a tick number.** A failure at would-be tick N+1 advances `gameLoop.tick` to N+1; the next successful tick after `recover()` is N+2. Previously the failed tick number was reused by the next successful tick. Failed-tick events and successful-tick events are now disjoint by `tick`.
- **`destroyEntity` callbacks observe `isAlive(id) === false`** for the dying entity. The entity is marked dying (alive=false, generation bumped) BEFORE callbacks run; the id is held off the free list until cleanup completes (try/finally), so a callback that calls `world.createEntity()` cannot recycle the dying id mid-cleanup. Cleanup also runs even if a callback throws.
- **`setMeta` throws on duplicate `(key, value)` pairs.** Previously the second writer silently overwrote the reverse index, and `getByMeta(key, value)` returned only one of the entities sharing the value. The unique-reverse-index invariant is now enforced at write time.
- **`getDiff()` returns a JSON deep-clone.** Mutations through the returned object no longer write through to the live engine. Callers that previously relied on mutating the live diff to influence engine state (always undocumented; types said `Readonly`) will silently observe no effect.
- **`getEvents()` deep-clones each event payload.** Same as above — mutations through the returned array of events are no longer observable to the engine or to other consumers of `getEvents()`.
- **Tag and metadata removal on entity destruction now appears in `TickDiff`** as `{ entity, tags: [] }` / `{ entity, meta: {} }`. Previously, consumers had to correlate `entities.destroyed` with the previous tick's `tags`/`metadata` to infer the cleanup. ARCHITECTURE.md documented this contract; the diff now matches it.
- **`WorldSnapshot` is now version 5** and round-trips `WorldConfig.maxTicksPerFrame`, `WorldConfig.instrumentationProfile`, and per-component `ComponentStoreOptions` (`diffMode` and `detectInPlaceMutations`). Versions 1–4 still load for compatibility; v4 stores fall back to default `ComponentStoreOptions`.
- **`submit()` always assigns a `submissionSequence`.** Previously, the non-`full` profile + no-listener fast path queued commands with `submissionSequence: null`, which `ClientAdapter` filtered out — so the same command could be invisible on the wire depending on profile and listener attachment. `submit()` now delegates to `submitWithResult()`; the listener-loop fast-path optimization remains inside `emitCommandResult` / `emitCommandExecution`.
- **Failed ticks now emit `tick_aborted_before_handler` execution events** for every command queued for the failed tick that did not run, and record their `submissionSequence`s in `failure.details.droppedCommands`. Previously these commands were silently lost (the queue was drained before iteration).
- **Reactive BT nodes (`reactiveSelector` / `reactiveSequence`) now clear the running-state slice of every child they skip past on a given tick.** A high-priority preemption that interrupts a stateful `Sequence` child no longer leaves that sequence at its mid-execution index; next time the reactive node falls back to it, the sequence restarts from child 0.
- **`GameLoop.step()` no longer auto-advances the tick.** Callers (only `World` in this codebase — `GameLoop` is not exported from `src/index.ts`) call `gameLoop.advance()` explicitly. `World.runTick` advances on success before diff listeners fire so `world.tick === diff.tick` during the listener phase, and on failure inside `finalizeTickFailure` (so the failed tick consumes its number).

### Added

- **`World.isPoisoned()` and `World.recover()`** to inspect/clear the poison flag set by tick failures. `recover()` also clears `lastTickFailure`, `currentDiff`, and `currentMetrics`.
- **`World.getAliveEntities()` and `World.getEntityGeneration(id)`** primitives. `RenderAdapter.connect()` now uses them instead of `world.serialize()` so connecting renderers no longer pay a snapshot-sized JSON-compat walk.
- **`ComponentStoreOptions.detectInPlaceMutations`** (default `true`). When `false`, `getDirty()` and `clearDirty()` skip the per-tick all-entries fingerprint scan; callers commit to writing only through `setComponent`. Pairs with `diffMode` and is round-tripped in v5 snapshots.
- **`SubcellOccupancyGrid`** for deterministic slot-based crowding on top of coarse cell blockers, including `bestSlotForUnit()`, `occupy()`, and `neighborsWithSpace()` for smaller-than-cell unit packing.
- **`OccupancyBinding`** for higher-level passability ownership: blocker metadata (`building` / `resource` / `unit` etc.), destroy-time lifecycle cleanup via `world.onDestroy()`, optional sub-cell crowding, crowding-aware `isBlocked()` path queries, and a `GridPassability`-compatible surface that plugs directly into `findGridPath()`.
- **`getMetrics()` / `resetMetrics()`** on `OccupancyGrid` and `SubcellOccupancyGrid`, plus occupancy-cost reporting in `npm run benchmark:rts`.
- **`reactiveSelector` and `reactiveSequence`** BT builder methods that do not persist running state across ticks, plus a `clearRunningState(state, node?)` helper for imperative subtree resets. Existing `selector` / `sequence` semantics are unchanged.
- **`ComponentOptions.diffMode: 'strict' | 'semantic'`** on `World.registerComponent`. Semantic mode fingerprints values in `set()` and skips dirty-marking on unchanged rewrites. Strict mode remains the default.
- **Fourth `TState` generic on `World`** (default `Record<string, unknown>`). `setState`/`getState`/`hasState`/`deleteState` type against `TState` so state and components have separate type registries — the previous overload that aliased `TState` to `TComponents` was an accidental conflation.
- **`SpatialGrid.assertBounds(x, y)`** is now public so `World.assertPositionInBounds` can validate explicitly instead of relying on `getAt`'s side effect.
- **`GameLoop.advance()`, `GameLoop.getMaxTicksPerFrame()`, `DEFAULT_MAX_TICKS_PER_FRAME`** exported from `src/game-loop.ts`.
- **`EntityManager.markDying()`, `releaseId()`, `aliveEntities()`** to support the split destroy lifecycle and the new `World.getAliveEntities()`.

### Fixed

- **`ComponentStore` strict-mode hot path** no longer computes `JSON.stringify` per `set()`; the fingerprint is only built when needed for semantic-mode rewrite suppression. JSON-compat validation still runs in both modes.
- **`ComponentStore.set()` clears the entity from `removedSet`** so a `remove()` followed by `set()` in the same tick produces a single `set` entry in the diff (was producing both `set` and `removed`).
- **`findNearest`** uses an expanding-radius walk with a `seen` set and an early-out when `bestDistSq <= (r-1)²`. The previous implementation was O(R³) for far targets; the prior fix made it O(W·H) on every call. The current implementation is O(R²) common-case with a clean early exit.
- **Pathfinding** no longer aborts the search on the first node whose `g > maxCost`; it `continue`s past such nodes so inadmissible-heuristic paths still terminate correctly. Negative edge costs are filtered out (`continue`).
- **`VisibilityMap.getState()`** now flushes dirty players via `update()` before reading, so a snapshot taken after `setSource()`/`removeSource()` reflects current data.
- **`ResourceStore.fromState()`** rejects duplicate transfer ids, normalizes `nextTransferId` to be greater than every existing id, and clamps `pool.current` to `pool.max` on load.
- **`EntityManager.fromState()`** validates `generations.length === alive.length`, that every freelist id is in range, dead, and unique.
- **`World.deserialize`** rejects non-integer or negative entity-id keys in `snapshot.tags` / `snapshot.metadata`.
- **`WorldHistoryRecorder.recordTick()`** deep-clones the user's debug payload at record time so a memoized live structure cannot retroactively corrupt the recorded tick history.
- **`getByTag()` / `getTags()`** allocate fresh empty `Set`s on miss instead of returning a shared sentinel that could be mutated by a careless cast.
- **Reactive BT nodes** are now wired to `BTState` so they can call `clearRunningState` on preempted children.
- **`SelectorNode` / `SequenceNode`** default `state.running[index]` to `-1` via `?? -1` instead of relying on `Math.max(undefined, 0) === NaN`.
- **`noise.GRAD2`** is `as const` with element type `readonly [number, number]`; index masking switched from `% 8` to `& 7` to make the length invariant explicit.
- **`OccupancyBindingWorldHooks`** callback signature drops the unused `world: unknown` argument.

### Documentation

- New `docs/devlog/detailed/2026-04-25_2026-04-25.md` with the full per-batch breakdown.
- New `docs/superpowers/plans/2026-04-25-full-review-fixes.md` plan file used to drive the implementation.
- New `docs/reviews/full/2026-04-25/1/` review artifacts (`PROMPT.md`, `REVIEW.md`, `raw/codex.md`, `raw/gemini.md`, `raw/opus.md`).
- 5 new rows in `docs/architecture/drift-log.md` covering fail-fast semantics, `TState` generic, snapshot v5, `detectInPlaceMutations`, and the GameLoop tick-advance change.
- ARCHITECTURE.md updated for snapshot v5, the new tick-failure section, the `TState` generic, and the `setMeta` uniqueness throw.
- Updated the README, architecture notes, API reference, RTS primitives guide, and sub-grid movement guide to document the higher-level occupancy binding and the new occupancy benchmark metrics.

### Known Deferred (not regressions)

- **M10**: `OccupancyBinding` owner-aware blocks + `ignoreEntity` for static cells — needs a separate brainstorm; current behavior treats blocks as entity-less terrain.
- Snapshot validation for component count > 64 (silent overflow today).
- Reactive-BT deeper sibling cleanup (current implementation clears children at `> i`; deeper failed-branch interiors are not recursively cleared).
- `getDiff()` clone-cost optimization (always clones today; an opt-in `getDiffReadOnly()` could skip the clone for read-only consumers).

## 0.3.0 - 2026-04-12

This release addresses six ergonomics friction points identified by game projects consuming the engine. All changes are additive and backwards-compatible.

### Breaking Changes

- `WorldSnapshot` is now version 4 and includes `state`, `tags`, and `metadata` fields. Version 1-3 snapshots still load for compatibility.
- `TickDiff` now includes `state`, `tags`, and `metadata` fields.

### Added

- **Loose system typing:** `LooseSystem` and `LooseSystemRegistration` types allow systems typed against bare `World` or `World<any, any>` to be registered without casts into generic worlds. `registerSystem` accepts both strict and loose system types via overloads.
- **Typed component registry:** Optional third type parameter `TComponents` on `World<TEventMap, TCommandMap, TComponents>`. When provided, `getComponent`, `setComponent`, `addComponent`, `patchComponent`, `removeComponent`, and `query` infer types from component keys. Falls back to the existing string-based API when omitted.
- **World-level state store:** `setState(key, value)`, `getState(key)`, `deleteState(key)`, `hasState(key)` for non-entity structured state (terrain config, simulation parameters, etc.). Included in serialization and diffs. JSON-compatible values only.
- **Spatial query helpers:** `queryInRadius(cx, cy, radius, ...components)` combines spatial proximity with component filtering. `findNearest(cx, cy, ...components)` returns the closest entity matching all components.
- **System ordering constraints:** `SystemRegistration.before` and `SystemRegistration.after` accept arrays of system names. Constraints resolve via topological sort within each phase. Cycles, cross-phase constraints, and missing name references throw descriptive errors. Order re-resolves when systems are added dynamically.
- **Entity tags:** `addTag`, `removeTag`, `hasTag`, `getByTag` (reverse-indexed), `getTags`. Multiple entities can share a tag. Tags cleaned up on entity destruction, included in serialization and diffs.
- **Entity metadata:** `setMeta`, `getMeta`, `deleteMeta`, `getByMeta` (unique reverse-indexed). Designed for external IDs and stable gameplay IDs. Metadata cleaned up on entity destruction, included in serialization and diffs.

## 0.2.0 - 2026-04-10

This release hardens the engine API and package boundary while adding RTS-scale primitives, render/debug infrastructure, and a browser reference debug client for reusable 2D civilization simulation projects.

### Breaking Changes

- Resource pools now use `max: null` for unbounded capacity instead of `Infinity`.
- Component data must be JSON-compatible. Components containing `undefined`, non-finite numbers, functions, symbols, bigints, class instances, or circular references are rejected.
- Component and resource writes through `World` now validate entity liveness and throw for dead or never-created entities.
- Position writes validate integer grid bounds before mutating component state.
- `WorldSnapshot` is now version 3 and includes resource state plus deterministic RNG state. Version 1 and 2 snapshots still load for compatibility.

### Added

- `EntityRef`, `world.getEntityRef(id)`, and `world.isCurrent(ref)` for stale-reference checks across recycled entity IDs.
- `world.setComponent()`, `world.patchComponent()`, and `world.setPosition()` as explicit write APIs.
- In-place component mutation detection for tick diffs.
- Read-only `world.grid` view, while `SpatialGrid` remains available as a standalone utility.
- Resource store snapshot state, including registrations, pools, rates, transfers, and next transfer ID.
- `world.random()` and `WorldConfig.seed` for deterministic pseudo-random simulation logic.
- Phase-aware system registration with `input`, `preUpdate`, `update`, `postUpdate`, and `output` phases.
- `world.getMetrics()` for per-tick timing, query cache, system, and spatial sync instrumentation.
- `WorldConfig.detectInPlacePositionMutations` and `world.markPositionDirty()` for large simulations that want to avoid the compatibility full-scan spatial sync path.
- `OccupancyGrid` for deterministic blocked-cell, footprint, occupancy, and reservation tracking.
- `findGridPath`, `PathCache`, `PathRequestQueue`, and `createGridPathQueue` for RTS-scale deterministic grid path processing.
- `VisibilityMap` for per-player visible and explored cell tracking.
- `RenderAdapter` for renderer-facing projected snapshots and diffs with generation-aware entity refs.
- `WorldDebugger` plus occupancy, visibility, and path queue probe helpers for headless inspection.
- Machine-readable `WorldDebugger.issues` alongside compatibility `warnings`.
- `world.submitWithResult()`, structured validator rejections, and command-result listeners.
- `CommandExecutionResult`, `world.onCommandExecution()`, and submission-sequence tracking so queued commands can be matched to tick-time execution or failure.
- `WorldHistoryRecorder` for short-horizon command outcomes and tick history capture.
- `TickFailure`, `WorldStepResult`, `WorldTickFailureError`, `world.stepWithResult()`, and `world.getLastTickFailure()` for structured runtime failure handling without forcing AI loops through thrown exceptions.
- `WorldDebugger.tickFailure` plus machine-readable runtime error issues derived from the latest failed tick.
- `WorldHistoryRecorder` capture for command execution results and tick failures, plus range summaries that aggregate execution outcomes and failure codes.
- Explicit AI contract version exports plus `schemaVersion` markers on command outcomes, debugger snapshots, history state, and scenario results.
- `summarizeWorldHistoryRange()` for AI-facing tick-window summaries over command outcomes, changed entities, events, and issues.
- `runScenario()` for headless setup, scripted stepping, checks, and structured AI-facing results.
- A browser debug client example backed by a worker-owned simulation, `RenderAdapter`, and `WorldDebugger`.
- `npm run benchmark:rts` for deterministic RTS-scale benchmark scenarios and metrics output.
- Runtime validation for world config, game-loop config, resource amounts/rates/maxima, and spatial coordinates.
- `ClientAdapter` runtime message guarding, structured `commandAccepted`/`commandRejected` outcomes, and optional `onError` callback for send failures.
- `ClientAdapter` streaming for `commandExecuted`, `commandFailed`, and `tickFailed` messages so remote agents can distinguish queued commands from executed commands and read structured tick failures.
- Client protocol version markers on server message envelopes.
- Tick-budget metrics plus `tick-budget-exceeded` debugger issues with slow-system context.
- `InstrumentationProfile` and `WorldConfig.instrumentationProfile` with `full`, `minimal`, and `release` modes for development, QA/staging, and shipping runtime overhead control.
- Lazy command execution feedback allocation so runtime execution results are only built when listeners are attached.
- Root package export barrel, declaration build config, npm package metadata, and CI workflow.

### Documentation

- Added `docs/README.md`.
- Added `docs/reviews/done/ENGINE_HARDENING_PLAN.md`.
- Added `docs/guides/public-api-and-invariants.md`.
- Added `docs/guides/ai-integration.md`.
- Added `docs/guides/scenario-runner.md`.
- Added `docs/guides/rendering.md`.
- Added `docs/guides/rts-primitives.md`.
- Added `docs/guides/debugging.md`.
- Added `docs/reviews/done/AI_FIRST_ENGINE_PLAN.md`.
- Added `docs/reviews/done/AI_FINAL_FORM_PLAN.md`.
- Added `docs/reviews/done/AI_RUNTIME_FEEDBACK_PLAN.md`.
- Renamed the completed render/debugger review doc to `docs/reviews/done/RENDER_CONTRACT_AND_DEBUGGER_PLAN.md` and trimmed the root README back to an overview so `docs/api-reference.md` remains the single authoritative API surface.
- Added the `examples/debug-client/` browser reference viewer and `npm run debug:client`.
- Reorganized documentation entry points around the docs hub and focused plan/review docs.
- Updated README, API reference, guides, and tutorials for package-root imports, explicit write APIs, `EntityRef`, structured command submission and execution outcomes, structured tick failures, AI-facing debugging/history tools, versioned machine contracts, client protocol version markers, JSON-compatible component data, resource `max: null`, snapshot v3, client-adapter message handling, render projection, and debugging helpers.
- Documented the instrumentation profile model and the boundary between explicit AI diagnostics (`submitWithResult()`, `stepWithResult()`) and lower-overhead implicit runtime paths (`submit()`, `step()` in `minimal` and `release`).
