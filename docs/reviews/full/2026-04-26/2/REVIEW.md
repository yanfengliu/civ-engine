# Full Codebase Review — 2026-04-26, iteration 2

Three reviewers ran in parallel against branch `agent/full-review-2026-04-26-iter1` at HEAD `5b7b3d0`, post-batch-5. All five iter-1 fix commits in scope (v0.6.0 → v0.6.4).

| Reviewer | Model | Mode | Output |
|---|---|---|---|
| Codex | `gpt-5.4`, `model_reasoning_effort=xhigh` | `codex exec`, sandbox `read-only`, `--ephemeral` | `raw/codex.md` |
| Gemini | `gemini-3.1-pro-preview` | `gemini -p` | `raw/gemini.md` |
| Claude | Opus 4.7 (1M context) | `claude -p`, read-only allowedTools | `raw/opus.md` |

PROMPT is at `PROMPT.md`. Three-reviewer consensus on the headline regression.

---

## Executive summary

**The Critical iter-1 fix did not hold up.** All three reviewers independently flagged that the C1 `ReadOnlyTransactionWorld` denylist proxy is missing 9+ real mutating methods on `World` and contains 6 spurious entries. The biggest single hit: `random()` mutates `DeterministicRandom.state`, so a precondition that calls `world.random()` permanently advances the RNG sequence — which breaks the engine's determinism contract and snapshot replay correctness — and does so silently even when the transaction returns `precondition_failed`.

Two of three reviewers also caught a brand-new High introduced by the iter-1 fix: `Layer.forEachReadOnly` uses `??` instead of `=== undefined` for unset-cell fallback, so a `Layer<number | null>` with explicit `null` cells reads back as `defaultValue`. Sibling `forEach` correctly uses `=== undefined`.

Single-reviewer (Codex) flagged a separate Layer perf/correctness hole: the H4 primitive fast-path is computed once from `defaultValue` and reused for every value, so `Layer<unknown>` or `Layer<number | { n: number }>` with primitive default + later object writes bypasses the defensive-copy contract.

What held up: H1 typed-generics threading, H2 strip-at-write sparsity, H3 warnIfPoisoned in commit(), H4 primitive fast-path correctness for homogeneous T, M2 deserialize tick validation, L1 single tick capture, L7 saturation guard, M3 partial extraction.

**Recommended fix order:** C1 (re-fix the denylist exhaustively) → forEachReadOnly null bug → primitive fast-path bypass → writers double-validate → polish + docs. Estimated 1–2 commits depending on bundling.

---

## ITER-1 REGRESSIONS

### R1. C1 ReadOnlyTransactionWorld denylist is incomplete and inconsistent — ✅ three-reviewer consensus
**Reviewers:** Codex, Gemini, Opus. **Iter-1 ID:** C1.

- **Files:** `src/command-transaction.ts:11-53` (Omit type), `src/command-transaction.ts:69-110` (FORBIDDEN_IN_PRECONDITION runtime set); affects `docs/api-reference.md:3422`.
- **What's wrong:**
  - **Real mutating methods missing from BOTH the type-level Omit AND the runtime FORBIDDEN set** — predicate can call them, type-checks pass, runtime trap does not fire:
    - `random()` — mutates `DeterministicRandom.state` per `src/random.ts`. Predicate that calls `w.random()` advances RNG even when the transaction aborts, **breaking determinism contract and snapshot-replay correctness**. Most damaging case.
    - `setResourceMax`, `setProduction`, `setConsumption` — direct writes to resource pool max + per-tick flow rates
    - `start`, `stop`, `pause`, `resume`, `setSpeed` — game-loop lifecycle mutators
    - `onDestroy`, `offDestroy`
    - `onTickFailure`, `offTickFailure`, `onCommandResult`, `offCommandResult`, `onCommandExecution`, `offCommandExecution` — listener subscription mutators
  - **Spurious entries** that do not match any `World` method (Omit-of-nonexistent-key is a no-op in TypeScript; runtime trap on a name nobody types is dead code):
    - `'registerComponentOptions'`, `'setTickFailureListener'`, `'setCommandResultListener'`, `'setCommandExecutionListener'`, `'setOnDestroy'` — likely guessed names from the iter-1 fix
    - `'rebuildSpatialIndex'` — exists but is `private`, so the Omit is a no-op against the public surface
  - **Casted-internal escape (Codex extra):** Even with the lists fixed, the proxy still forwards arbitrary property reads. A casted caller can reach mutable subsystems (`gameLoop`, `resourceStore`, `rng`) through their public-property exposure on `World` and call mutating methods on those subobjects.
  - **Test gap:** Existing C1 tests only cover `setComponent` + `removeResource`, both of which are in the lists. The 9-method gap is invisible to the test suite.
- **Why it matters:** C1 was iter-1's only Critical. Its headline guarantee — "predicates must be side-effect free or the all-or-nothing guarantee is meaningless, enforced at compile and runtime" — is currently false for `random()` (the deterministic-replay killer), `setResourceMax`/`setProduction`/`setConsumption` (silent resource-rate corruption on a precondition-failed path), and the lifecycle methods.
- **Recommended fix:** Two parts.
  1. **Single source of truth.** Define `FORBIDDEN_IN_PRECONDITION` once as a `const … as const` array. Derive `ReadOnlyTransactionWorld` as `Omit<World, typeof FORBIDDEN_IN_PRECONDITION[number]>`. Eliminates drift between the two lists by construction.
  2. **Exhaustive against `World`'s real public surface.** Walk `World`'s public methods (use `git grep -n "^  [a-z]" src/world.ts` or similar) and include every state-mutating, lifecycle-changing, or RNG-advancing method — including `random`, `setResourceMax`, `setProduction`, `setConsumption`, `start`, `stop`, `pause`, `resume`, `setSpeed`, `onDestroy`, `offDestroy`, `onTickFailure`, `offTickFailure`, `onCommandResult`, `offCommandResult`, `onCommandExecution`, `offCommandExecution`. Drop the spurious entries.
  3. **Property-based regression test.** Iterate the FORBIDDEN list and assert every name throws when called from inside a precondition. Add explicit tests for `random()`, `setResourceMax`/`setProduction`/`setConsumption`, and one `on*` subscription so the headline cases are pinned.
  4. **Optionally** address Codex's casted-internal escape by also blocking property reads of `gameLoop`/`resourceStore`/`rng` from the proxy, with a runtime throw. That's a tighter net but adds surface.

---

## CRITICAL

None observed.

---

## HIGH

### H_NEW1. `Layer.forEachReadOnly` substitutes `defaultValue` for explicitly-stored `null` cells — ✅ two-reviewer consensus
**Reviewers:** Gemini, Opus.

- **File:** `src/layer.ts:158-165` (`forEachReadOnly`).
- **What's wrong:** `cb(stored ?? this._defaultValue, cx, cy)`. The `??` operator treats `null` as nullish, so a cell explicitly stored as `null` (with a non-null `defaultValue`) reads back as `defaultValue`. Repro: `const layer = new Layer<number | null>({ worldWidth: 2, worldHeight: 2, defaultValue: 0 }); layer.setCell(0, 0, null);` — `null !== 0`, strip-at-write keeps the entry; `forEachReadOnly` yields `0` instead of `null`. Sibling `forEach` correctly uses `stored === undefined` (line 138-148).
- **Why it matters:** `Layer<T | null>` with explicit `null` cells is a plausible engine-consistent pattern — `null` is JSON-compatible, primitive, and a natural sentinel. H4's headline promise is zero-allocation primitive traversal; the fast path silently reports wrong values. The new test at `tests/layer.test.ts:626-644` only covers `Layer<{ n: number }>` (object T, no null), so the regression is not caught.
- **Recommended fix:** Mirror `forEach`'s pattern. `Map.get` only returns `undefined` for absent keys, and `assertJsonCompatible` rejects writes of `undefined`, so `=== undefined` is the safe sentinel:
  ```ts
  cb(stored === undefined ? this._defaultValue : stored, cx, cy);
  ```
  Add a regression test on `Layer<number | null>` with `defaultValue: 0` and `setCell(0, 0, null)` asserting `forEachReadOnly` yields `null` at `(0, 0)`.

### H_NEW2. Primitive fast-path trusts `defaultValue` instead of the actual stored value
**Reviewer:** Codex.

- **File:** `src/layer.ts:50-80, 87-104, 127-173, 234-255`.
- **What's wrong:** `_isPrimitive` is computed once from `defaultValue` in the constructor and then reused for every storage, read, clone, and serialization boundary. If a caller constructs `Layer<unknown>` or `Layer<number | { n: number }>` with a primitive `defaultValue` and later stores an object via `setCell`, the object is stored without cloning, returned without cloning, emitted from `getState()` without cloning, and copied into `clone()` by reference.
- **Why it matters:** Breaks the documented defensive-copy contract for mixed-type `T`. Silent aliasing between caller-owned objects, live layer state, serialized snapshots, and cloned layers. Less common than C1 but a real correctness hole for `Layer<unknown>` use cases (which are plausible for AI agents synthesizing dynamic data).
- **Recommended fix:** Decide clone behavior from the actual value crossing the boundary, not only from `defaultValue`. Replace `_isPrimitive ? value : structuredClone(value)` with `isImmutablePrimitive(value) ? value : structuredClone(value)` on every read/write/clone/serialize path. Or alternatively reject writes whose primitive-ness differs from the layer's declared shape — but the per-value check is more permissive and matches the type system. Add regression tests for primitive-default layers that later store objects via `setCell`, `setAt`, `fill`, `getState`, and `clone`.

---

## MEDIUM

### M_NEW1. `Layer.setCell` / `setAt` / `fill` double-validate non-primitive `T` per write (M4 hole reintroduced)
**Reviewer:** Opus.

- **File:** `src/layer.ts:72-81, 94-105, 119-133, 254-257`; `src/json.ts:60` (jsonFingerprint internally calls assertJsonCompatible).
- **What's wrong:** For non-primitive `T`, every write does `assertJsonCompatible(value, ...)` (line 74 / 96 / 120) and then `matchesDefault(value)` (line 254-257) which calls `jsonFingerprint(value)` which itself calls `assertJsonCompatible` per `src/json.ts:60`. That's two full JSON-compat walks of the value per write. Iter-1's M4 fix removed this exact pattern from `Layer.fromState`; the same pattern then survived (or was reintroduced by the strip-at-write H2 commit) in the writer paths. Primitive `T` is unaffected because `matchesDefault` short-circuits to `===`.
- **Why it matters:** Object-typed Layers are the heaviest field-data use case. A 1000×1000 fill of an object Layer pays 2,000,000 JSON-compat walks instead of 1,000,000 — the same trap M4 was meant to retire. Not a correctness bug; a perf regression of M4's principle.
- **Recommended fix:** Drop the explicit `assertJsonCompatible` for the object path; rely on the one inside `jsonFingerprint`. Either gate the explicit call behind `if (this._isPrimitive)`, or hoist a single validation that branches on primitivity.

### M_NEW2. `Layer.fromState` stringifies primitives for sparsity check (also M4-adjacent)
**Reviewer:** Gemini.

- **File:** `src/layer.ts:166-169`.
- **What's wrong:** `fromState` computes `jsonFingerprint(value)` for every loaded cell to check default-equality. For primitive layers (`_isPrimitive === true`), this incurs `JSON.stringify` overhead per cell on load, ignoring the H4 primitive fast-path that the writers use.
- **Recommended fix:** Inline the `matchesDefault` logic in fromState too: `const isDefault = layer._isPrimitive ? value === layer._defaultValue : jsonFingerprint(value) === layer._defaultFingerprint;` then `if (isDefault) continue;`. Pairs with M_NEW1.

---

## LOW / POLISH

### L_NEW1. `commit()` after `abort()` then double-`commit()` throws hardcoded "already committed"
**Reviewer:** Gemini.

- **File:** `src/command-transaction.ts:109` (the early-throw at the top of `commit()`).
- **What's wrong:** L2's fix added `terminalReason: 'committed' | 'aborted' | null` and updated `assertPending` to use it. But `commit()` itself still hardcodes `throw new Error('CommandTransaction already committed')` at the top. After `tx.abort()` then a first `tx.commit()` (which sets `status='committed'` while keeping `terminalReason='aborted'`), the **second** `tx.commit()` throws "already committed" instead of "already aborted." Builder methods correctly throw "already aborted" in this scenario.
- **Recommended fix:** Replace the hardcoded string with `terminalReason`-aware: `const reason = this.terminalReason ?? 'committed'; throw new Error(\`CommandTransaction already ${reason}\`);`.

### L_NEW2. `Layer.clone()` double-clones `defaultValue` through the constructor
**Reviewer:** Gemini.

- **File:** `src/layer.ts:178-180`.
- **What's wrong:** `clone()` passes `structuredClone(this._defaultValue)` to the new `Layer` constructor. The constructor itself defensive-clones `options.defaultValue` (`layer.ts:45`), so object-T defaults pay two clones per `clone()` call.
- **Recommended fix:** Pass `this._defaultValue` by reference; let the constructor clone exactly once.

### L_NEW3. `Layer.getState` defensive fingerprint check is dead code post strip-at-write
**Reviewer:** Opus.

- **File:** `src/layer.ts:167-185` (line 172 specifically — the defensive `if (jsonFingerprint(value) === this._defaultFingerprint) continue;`).
- **What's wrong:** Post-H2, every public path that puts an entry into `this.cells` (`setCell`, `setAt`, `fill`, `Layer.fromState`) already strips default-equal values. There is no public bypass — `cells` is `private`. The defensive check at line 172 runs `jsonFingerprint` once per stored cell on every `getState` call to verify a property the writers already guarantee. Per-cell `JSON.stringify` cost on every snapshot.
- **Recommended fix:** Trust strip-at-write and drop the check. Loop becomes `for (const [index, value] of this.cells) entries.push([index, this._isPrimitive ? value : structuredClone(value)]);`.

### L_NEW4. `World.warnIfPoisoned(api)` is public but absent from api-reference.md
**Reviewer:** Codex.

- **File:** `src/world.ts:653-658`; `docs/api-reference.md` between `recover()` and `start()`.
- **What's wrong:** v0.6.0 changelog calls out making `warnIfPoisoned` public. The api-reference does not document it.
- **Recommended fix:** Add a `### warnIfPoisoned(api)` section near `recover()` describing the once-per-poison-cycle warning behavior and its use as the integration point for new write surfaces.

### L_NEW5. Stale test name "setCell with default value still stores the marker (round-trips)"
**Reviewer:** Opus.

- **File:** `tests/layer.test.ts:118-127`.
- **What's wrong:** Test name asserts pre-H2 behavior ("still stores the marker"). Body just verifies `getCell` returns 0 after `setCell(_, _, 0)`. A future reader sees the name and concludes the engine still stores markers. The actual sparsity assertion lives at `tests/layer.test.ts:498-510` in the new H2 block.
- **Recommended fix:** Rename to `setCell with default value reads back as default`, or delete the test entirely as redundant with the H2 block.

### L_NEW6. `commit()` retains `as any` cast on `world.emit` dispatch
**Reviewer:** Opus.

- **File:** `src/command-transaction.ts:300-305`.
- **What's wrong:** Buffered events store as `BufferedEvent = { type: string; data: unknown }`, so dispatching uses `this.world.emit(event.type as any, event.data as any)` with one `eslint-disable-next-line @typescript-eslint/no-explicit-any`. Cosmetic — runtime is correct because `EventBus.emit` validates payloads — but L6's stated goal was eliminating the `any`/eslint-disable lifecycle.
- **Recommended fix:** Either type buffered events tightly (more invasive), or accept the dispatch cast as the residual cost of buffering loose-typed events. Pragmatic choice: keep the cast, drop the iter-1 claim that L6 fully eliminated the `any` surface (it eliminated it from `world.transaction()`, which is what mattered).

### L_NEW7. M2 test suite missing explicit `Number.MAX_SAFE_INTEGER + 1` case
**Reviewer:** Codex.

- **File:** `tests/serializer.test.ts:477-512`.
- **What's wrong:** NaN, negative, fractional, and Infinity are tested. `MAX_SAFE_INTEGER + 1` is not, even though `Number.isSafeInteger` rejection of it is the validation's headline reason. Covered transitively (same throw path as the others) but unpinned.
- **Recommended fix:** Add one regression test mutating `snapshot.tick` to `Number.MAX_SAFE_INTEGER + 1` and asserting the same error. 4 lines; trivial.

---

## NOTES & OPEN QUESTIONS

### N1. world-internal.ts ↔ world.ts circular import (smell, not bug)
**Reviewer:** Opus.

- **File:** `src/world-internal.ts:4-11` imports from `./world.js`; `src/world.ts:29-46` imports from `./world-internal.js`.
- **Note:** `world-internal.ts` imports `SYSTEM_PHASES` (a runtime value) plus types from `world.js`, while `world.ts` imports value functions from `world-internal.js`. The circular value-import works only because `SYSTEM_PHASES` is read inside function bodies (`phaseIndex`, `isSystemPhase`), not at module top level — so by the time any function runs, both modules have fully evaluated. ES module live bindings make this safe today, but it's a structural smell. The deeper-split refactor is the natural moment to clean this up — move `SYSTEM_PHASES` and `SystemPhase` into `world-internal.ts` (or a dedicated `system-phases.ts`).

### N2. M3 deferral remains acknowledged
**Reviewer:** Opus, Codex, Gemini.

- **File:** `src/world.ts` (2232 LOC), `src/occupancy-grid.ts` (1602 LOC), `src/world-debugger.ts` (509 LOC).
- **Note:** All three reviewers respected the prompt's "do not re-flag" instruction. The partial extraction is sound — every helper in `world-internal.ts` is genuinely standalone, the import block is complete, and `topologicalSort` correctly stayed in `world.ts`. The deeper class-method split is queued for a dedicated refactor branch.

---

## Fix plan / batching

| Commit | Scope | Includes | Severity |
|--------|-------|----------|----------|
| 6 | C1 re-fix exhaustively | R1 (denylist single-source-of-truth + exhaustive vs World public surface + property-based test) | Critical |
| 7 | Layer correctness + perf | H_NEW1 (forEachReadOnly null), H_NEW2 (primitive fast-path per-value), M_NEW1 + M_NEW2 (writer / fromState double-validate), L_NEW2 (clone double-clone), L_NEW3 (getState dead check) | H + M + L |
| 8 | Polish | L_NEW1 (commit terminalReason), L_NEW4 (warnIfPoisoned doc), L_NEW5 (test rename), L_NEW7 (MAX_SAFE_INTEGER test) | L |

L_NEW6 (`as any` cast) is acknowledged-residual; do not bundle into a fix commit. Keep the existing L2/L6 docs honest about what was eliminated vs what remains.

---

End of REVIEW.md.
