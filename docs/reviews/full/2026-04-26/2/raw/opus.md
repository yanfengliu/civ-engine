Review written: `docs/reviews/full/2026-04-26/2/raw/opus.md`.

Key finding — **C1 fix incomplete**:
- `FORBIDDEN_IN_PRECONDITION` set + `Omit` type assembled from guessed names. 6 spurious entries (no matching method on `World`), 9+ real mutating methods missing.
- Most damaging: `random()` mutates RNG state → predicate calls break determinism even when transaction aborts.
- Also missing: `setResourceMax`/`setProduction`/`setConsumption`, `start`/`stop`/`pause`/`resume`/`setSpeed`, all `on*`/`off*` listener subscriptions, `onDestroy`/`offDestroy`.
- Spurious: `setOnDestroy`, `setTickFailureListener`, `setCommandResultListener`, `setCommandExecutionListener`, `registerComponentOptions`, `rebuildSpatialIndex` (private).
- Existing C1 tests only cover `setComponent` + `removeResource` (both *are* in lists) — gap invisible to test suite.

Other findings:
- **High**: `Layer.forEachReadOnly` uses `??` → `Layer<T | null>` with explicit null cells reads back as `defaultValue`. `forEach` correctly uses `=== undefined`.
- **Medium**: `setCell`/`setAt`/`fill` double-validate non-primitive `T` (M4 hole — fixed in `fromState`, missed in writers).
- **Low**: `getState` defensive fingerprint is dead code post strip-at-write; stale test name "still stores the marker"; `commit()` retains `as any` cast on emit dispatch.

Iter-1 fixes verified clean: H2 strip-at-write, H4 primitive cache (`null`/`number`/`string`/`boolean` correct), M2 tick validation (NaN/negative/fractional/Infinity), L1 single tick capture, L7 saturation guard, M3 partial extraction (helpers genuinely standalone).
setResourceMax` / `setProduction` / `setConsumption`), `src/world.ts:678-700` (`start`/`stop`/`setSpeed`/`pause`/`resume`), `src/world.ts:394-406` (`onDestroy`/`offDestroy`), `src/world.ts:784-806` (`on/offCommandResult`, `on/offCommandExecution`), `src/world.ts:825-831` (`on/offTickFailure`)
- **Problem**: Both the type-level `Omit` and the runtime `FORBIDDEN_IN_PRECONDITION` set were assembled from guessed method names rather than from `World`'s actual public surface, and the two lists are also inconsistent with each other. Concretely:
  - **Real mutating methods missing from BOTH lists** (predicate can call them, type-checks pass, runtime trap does not fire):
    - `setResourceMax`, `setProduction`, `setConsumption` — direct writes to resource pool max and per-tick flow rates
    - `random()` — mutates `DeterministicRandom.state` on every call (`src/random.ts:15-25`); a predicate that calls `w.random()` advances the RNG even when the transaction aborts, **breaking determinism for every subsequent simulation step and snapshot replay**
    - `start`, `stop`, `setSpeed`, `pause`, `resume` — game-loop lifecycle mutators (the world's RAF/timer state)
    - `onDestroy`, `offDestroy` — register/unregister destroy callbacks
    - `onTickFailure`, `offTickFailure`, `onCommandResult`, `offCommandResult`, `onCommandExecution`, `offCommandExecution` — listener subscription mutators (the lists *do* contain the strings `'setTickFailureListener'`, `'setCommandResultListener'`, `'setCommandExecutionListener'`, `'setOnDestroy'`, but those are not the real method names on `World`)
  - **Spurious entries that don't match any `World` method** (Omit-of-nonexistent-key is a no-op in TypeScript; runtime trap on a name nobody types is dead code):
    - `'registerComponentOptions'`, `'setTickFailureListener'`, `'setCommandResultListener'`, `'setCommandExecutionListener'`, `'setOnDestroy'`
    - `'rebuildSpatialIndex'` — exists but is `private` (`src/world.ts:2005`), so the Omit is a no-op against the public surface; the runtime entry only triggers via `(world as any).rebuildSpatialIndex(...)` and is misleading because it implies parity with the public API
  - The drift also propagates into `docs/api-reference.md:3422` which states "every public mutation method on `World` is excluded" — that claim is now untrue.
- **Why it matters**: C1 was the iter-1 Critical. The fix's headline promise was that "predicates must be side-effect free or the all-or-nothing guarantee is meaningless," enforced at both compile and runtime. Today, a predicate that calls `w.random()` (the most damaging case — irreversibly advances RNG state, breaking the engine's v0.4.x determinism contract and snapshot-replay correctness), or `w.setProduction(...)` (mutates per-tick resource flow), or `w.start()` / `w.pause()` (mutates game-loop state) does so without compile or runtime feedback. AI-native operators following the documented contract may freely write predicates that invoke `random()` or set production rates and silently corrupt deterministic replay or shared resource flow even on a `precondition_failed` path. The two C1-targeted tests (`tests/command-transaction.test.ts:443-470`) only cover `setComponent` and `removeResource`, both of which *are* in the lists; the gap is invisible in the test suite.
- **Suggested fix**: Derive the Omit and FORBIDDEN list from a single source-of-truth set, exhaustive against `World`'s public methods. Concrete patch sketch:
  ```ts
  // One source of truth — every public method that has any side effect on World state.
  const FORBIDDEN_IN_PRECONDITION = new Set<string | symbol>([
    // Component / position writes
    'setComponent', 'addComponent', 'patchComponent', 'removeComponent', 'setPosition',
    // Entity lifecycle
    'createEntity', 'destroyEntity',
    // Tags / metadata / state
    'addTag', 'removeTag', 'setMeta', 'deleteMeta', 'setState', 'deleteState',
    // Resources (incl. flow / pool config)
    'addResource', 'removeResource', 'addTransfer', 'removeTransfer',
    'setResourceMax', 'setProduction', 'setConsumption',
    // Events / commands
    'emit', 'submit', 'submitWithResult',
    // Tick / lifecycle
    'step', 'stepWithResult', 'recover',
    'start', 'stop', 'setSpeed', 'pause', 'resume',
    // Registration (mutates engine config)
    'registerSystem', 'registerValidator', 'registerHandler',
    'registerComponent', 'registerResource',
    // Listener subscriptions
    'on', 'off',
    'onDestroy', 'offDestroy',
    'onTickFailure', 'offTickFailure',
    'onCommandResult', 'offCommandResult',
    'onCommandExecution', 'offCommandExecution',
    'onDiff', 'offDiff',
    // Sub-engine entry points
    'transaction', 'serialize',
    // RNG (mutates DeterministicRandom.state)
    'random',
  ]);
  // ReadOnlyTransactionWorld becomes Omit<World, ...> driven off the same set
  // (use a string-literal union derived from the Set's element type).
  ```
  Add a regression test that iterates the FORBIDDEN list and asserts every name throws when called from inside a precondition; that turns "the list is correct" into a property the suite verifies. Add explicit tests for `random()`, `setResourceMax`/`setProduction`/`setConsumption`, and one of the `on*` subscriptions to lock the headline cases.

# Critical

None observed.

# High

### `Layer.forEachReadOnly` substitutes `defaultValue` for explicitly-stored `null` cells
- **File**: `src/layer.ts:158-165`
- **Problem**: `forEachReadOnly` does `cb(stored ?? this._defaultValue, cx, cy)`. The `??` operator treats `null` as nullish, so a cell that was explicitly stored as `null` (with a non-null `defaultValue`) reads back as `defaultValue`. Reproduction: `const layer = new Layer<number | null>({ worldWidth: 2, worldHeight: 2, defaultValue: 0 }); layer.setCell(0, 0, null);` — `null !== 0`, so strip-at-write keeps the entry; then `forEachReadOnly` yields `0` instead of `null`. The sibling `forEach` correctly uses `stored === undefined` (`layer.ts:138-148`) so the safe-clone path is fine; only the new read-only fast path has the bug.
- **Why it matters**: `Layer<T | null>` with explicit `null` cells is a plausible and engine-consistent pattern — `null` is JSON-compatible, primitive (per `isImmutablePrimitive`), and a natural sentinel ("no entity here", "data missing", "explicitly cleared by an AI agent"). H4's headline promise is that primitives traverse zero-allocation; the fast path silently reports the wrong values for any layer that stores `null`. The new test at `tests/layer.test.ts:626-644` only covers `Layer<{ n: number }>` (object T, no null) so the regression is not caught.
- **Suggested fix**: Mirror `forEach`'s undefined-check pattern. `Map.get` only returns `undefined` for absent keys, and `assertJsonCompatible` rejects writes of `undefined`, so `=== undefined` is the safe sentinel:
  ```ts
  forEachReadOnly(cb: (value: T, cx: number, cy: number) => void): void {
    for (let cy = 0; cy < this.height; cy++) {
      for (let cx = 0; cx < this.width; cx++) {
        const stored = this.cells.get(this.cellIndex(cx, cy));
        cb(stored === undefined ? this._defaultValue : stored, cx, cy);
      }
    }
  }
  ```
  Add a regression test on `Layer<number | null>` with `defaultValue: 0` and `setCell(0, 0, null)` asserting `forEachReadOnly` yields `null` at `(0, 0)`.

# Medium

### `Layer.setCell` / `setAt` / `fill` double-validate non-primitive `T` per write (M4 hole)
- **File**: `src/layer.ts:72-81, 94-105, 119-133, 254-257`, `src/json.ts:60` (jsonFingerprint internally calls assertJsonCompatible)
- **Problem**: For non-primitive `T`, every write does `assertJsonCompatible(value, ...)` (line 74 / 96 / 120) and then `matchesDefault(value)` (line 254-257) which calls `jsonFingerprint(value)` which itself calls `assertJsonCompatible` per `src/json.ts:60`. That's two full JSON-compat walks of the value per write. Iter-1's M4 fix removed this exact pattern from `Layer.fromState`; the same pattern then survived (or was reintroduced by the strip-at-write H2 commit) in the writer paths. Primitive `T` is unaffected because `matchesDefault` short-circuits to `===`.
- **Why it matters**: Object-typed Layers are the heaviest field-data use case (influence, building footprints, weather, faction control). A 1000×1000 fill of an object Layer pays 2,000,000 JSON-compat walks instead of 1,000,000 — the same trap M4 was meant to retire. Not a correctness bug; a perf regression of M4's principle.
- **Suggested fix**: Drop the explicit `assertJsonCompatible` for the object path; rely on the one inside `jsonFingerprint`. Either gate `assertJsonCompatible` behind `if (this._isPrimitive)`, or hoist a single validation that branches on primitivity:
  ```ts
  setCell(cx: number, cy: number, value: T): void {
    this.assertCellInBounds(cx, cy);
    const idx = this.cellIndex(cx, cy);
    if (this._isPrimitive) {
      assertJsonCompatible(value, 'Layer cell value');
      if (value === this._defaultValue) { this.cells.delete(idx); return; }
      this.cells.set(idx, value);
      return;
    }
    // jsonFingerprint validates via assertJsonCompatible internally.
    if (jsonFingerprint(value) === this._defaultFingerprint) { this.cells.delete(idx); return; }
    this.cells.set(idx, structuredClone(value));
  }
  ```
  Apply the same shape to `setAt` and `fill`.

# Low / Polish

### `Layer.getState` defensive fingerprint check is dead code post strip-at-write
- **File**: `src/layer.ts:167-185` (especially the comment at 170-172)
- **Problem**: After H2's strip-at-write, every public path that puts an entry into `this.cells` (`setCell`, `setAt`, `fill`, `Layer.fromState` at line 232-234) already strips default-equal values. There is no public bypass — `cells` is `private`. The defensive `if (jsonFingerprint(value) === this._defaultFingerprint) continue;` at line 172 therefore runs `jsonFingerprint` once per stored cell on every `getState`/`clone`/`serialize` call to verify a property the writers already guarantee. The comment "in case caller pushed cells via fromState bypass" is incorrect — `fromState` strips at line 233.
- **Why it matters**: Per-cell `JSON.stringify` cost on serialize for every Layer in a snapshot. Negligible for small Layers; measurable for a 100k-cell pollution Layer that snapshots every save tick. Iter-1's M5 fix made `clone()` skip this path; `getState` is now the only routine snapshot path that pays the redundant cost.
- **Suggested fix**: Trust strip-at-write and drop the check. The loop becomes `for (const [index, value] of this.cells) entries.push([index, this._isPrimitive ? value : structuredClone(value)]);`. If genuine paranoia is wanted, gate behind a debug-mode check — but the sealed `private cells` makes even that hard to justify.

### Stale test name: "setCell with default value still stores the marker (round-trips)"
- **File**: `tests/layer.test.ts:118-127`
- **Problem**: The test name asserts the pre-H2 behavior ("still stores the marker") but the body just verifies `getCell` returns 0 after `setCell(_, _, 0)`, which is consistent with strip-at-write (since reading an unset cell yields the default). Iter-1's H2 recommendation explicitly said "Update the existing test asserting 'setCell with default value still stores the marker' to instead assert sparsity — the test is locked-in to the broken behaviour." The body was made compatible but the name was not updated; a future reader sees the name and concludes the engine still stores markers. The actual sparsity assertion was added separately at `tests/layer.test.ts:498-510` as part of the H2 test block, leaving the misleading name as a docstring relic.
- **Why it matters**: Misleading test name accumulates as documentation rot — the test name is now a lie about engine behavior. Future maintainers will believe markers are stored unless they read the body and the new H2 block.
- **Suggested fix**: Rename to `setCell with default value reads back as default` (drop "still stores the marker"), or delete the test entirely as redundant with the H2 block at `tests/layer.test.ts:498-510`.

### `CommandTransaction.commit` retains an `as any` cast on the `world.emit` dispatch
- **File**: `src/command-transaction.ts:300-305`
- **Problem**: After H1 cleaned up the `as unknown as World` cast at the `world.transaction()` call site (`src/world.ts:728-730` — confirmed clean), one `// eslint-disable-next-line @typescript-eslint/no-explicit-any` survives inside `commit()`'s emit loop because buffered events are stored as the loose `BufferedEvent = { type: string; data: unknown }` shape (`command-transaction.ts:151`) rather than the typed event-map shape. This is internally inconsistent with H1's stated goal of restoring typed-event access through transactions: the typed `emit` overload exists at `command-transaction.ts:236-243` but the buffered store throws the type information away.
- **Why it matters**: Cosmetic. The runtime is correct because `EventBus.emit` re-validates the payload at dispatch (it's the v0.5.0 invariant). But L6 was supposed to obsolete the `any`/eslint-disable lifecycle, and one survived at the dispatch.
- **Suggested fix**: Type buffered events as `{ readonly type: keyof TEventMap & string; readonly data: TEventMap[keyof TEventMap] }` — or, simpler, keep `BufferedEvent` loose and add a single typed re-cast at the dispatch site so the eslint-disable is the only `any` and is colocated with the cast.

# Notes & Open Questions

### `world-internal.ts` ↔ `world.ts` is a real circular import
- **File**: `src/world-internal.ts:4-11` (imports from `./world.js`), `src/world.ts:29-46` (imports from `./world-internal.js`).
- **Note**: `world-internal.ts` imports `SYSTEM_PHASES` (a runtime value) plus several types from `world.js`, while `world.js` imports value functions from `world-internal.js`. The circular value-import works only because `SYSTEM_PHASES` is read inside function bodies (`phaseIndex`, `isSystemPhase` — both at `world-internal.ts:167-173`), not at module top level — so by the time any of those functions runs, both modules have fully evaluated. ES module live bindings make this safe today, but it's a structural smell. Resolving the circular value import (move `SYSTEM_PHASES` and the `SystemPhase` type into `world-internal.ts`, or into a dedicated `system-phases.ts`) would remove the brittleness. Not a bug today; flagging because the deeper-split refactor that the changelog promises is the natural moment to clean this up.

### M3 deferral acknowledged
- **File**: `src/world.ts` (2232 LOC), `src/occupancy-grid.ts` (1602 LOC), `src/world-debugger.ts` (509 LOC).
- **Note**: The PROMPT explicitly tells me not to re-flag the LOC overage; I'm not. Recording as a note that the partial extraction is itself sound — every helper in `world-internal.ts` is genuinely standalone (no `this` references, all dependencies passed as args or imported), the import block in `world.ts:29-46` is complete, and `topologicalSort` correctly remained inside `world.ts` because it operates on the private `RegisteredSystem` interface. The deferral makes engineering sense; the deeper split needs the composition redesign the changelog already calls out, not a mechanical move.

### `World.deserialize` validates `snapshot.tick` after performing all entity/component reconstruction
- **File**: `src/world.ts:937-1026`
- **Note**: The validation at line 1017-1025 runs after `entityManager`, `componentStores`, `resources`, `rng`, `state`, `tags`, `metadata`, and `rebuildSpatialIndex` have all been reconstructed against the local `world` instance. If `snapshot.tick` is invalid, the function throws and the local instance becomes garbage — no observable state is leaked because the static method never returned the partially-constructed world. So this isn't a bug, but a malformed snapshot pays the full reconstruction cost before the cheap validation rejects it. Moving the tick check above line 948 (before `new World(snapshot.config)`) would short-circuit faster. Cosmetic.

### M2 test coverage is thorough but does not include `Number.MAX_SAFE_INTEGER + 1`
- **File**: `tests/serializer.test.ts:477-512`.
- **Note**: NaN, negative, fractional, and Infinity are all tested. `Number.MAX_SAFE_INTEGER + 1` is not explicitly tested but is covered transitively (`Number.isSafeInteger(MAX_SAFE_INTEGER + 1) === false`, hits the same throw path). The PROMPT specifically asked to verify this; I confirm the validation logic at `src/world.ts:1018-1021` covers it via the `Number.isSafeInteger` check. Adding the explicit test would be cheap belt-and-suspenders but is not a finding.
