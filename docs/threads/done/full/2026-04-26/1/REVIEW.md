# Full Codebase Review — 2026-04-26, iteration 1

Three independent reviewers ran in parallel against `main` (commit `d7f9511`, post-v0.5.11 + doc-drift fixes). Engine state: 569 tests passing, v0.5.11.

| Reviewer | Model | Mode | Output |
|---|---|---|---|
| Codex | `gpt-5.4`, `model_reasoning_effort=xhigh` | `codex exec`, sandbox `read-only`, `--ephemeral` | Codex summary |
| Gemini | `gemini-3.1-pro-preview` | `gemini -p` | Gemini summary |
| Claude | Opus 4.7 (1M context) | `claude -p`, read-only allowedTools | Opus summary |

The shared prompt is no longer retained under the summary-only policy. **No code has been changed yet.** This document is the deliverable for fix planning.

> **Gemini reachability note.** Gemini hit `429 RESOURCE_EXHAUSTED / MODEL_CAPACITY_EXHAUSTED` on the first attempt and the bg task was killed; however its retry-loop output produced a complete review document on disk (1119 lines incl. the in-line reasoning trace; the structured review section starts at `gemini.md:1061`). All three reviewers' findings are included.

---

## Executive summary

The v0.5.9–v0.5.11 features ship with sound core mechanics — interval scheduling math is correct, the `try/finally` on `CommandTransaction.commit()` correctly prevents double-apply on retry, snapshot v5 round-trips hold up. The remaining surface is concentrated in **two themes**: (1) `CommandTransaction` shipped without the v0.5.2 generic-threading discipline, so a third write surface ignores both the typed-component registry and the v0.5.1 `warnIfPoisoned` contract; (2) `Layer<T>` ships with two perf/correctness traps — its sparse-storage promise is broken on default-value writes, and every read clones via `structuredClone` even for primitive `T`.

**Three-reviewer consensus** flagged the `CommandTransaction` typed-generics regression independently. **Two-reviewer consensus** flagged the `Layer<T>` sparsity bug independently.

What the reviewers did **not** find: no determinism breaks, no new core ECS storage bugs, no entity-cleanup regressions, no security issues. Test coverage on the new files is thorough.

**Recommended fix order:** Critical → High (consensus first) → Medium → Low. Estimated 4–5 commits.

---

## Methodology notes

- All three reviewers got the same prompt (shared review prompt, not retained) and the same scope.
- Findings deduplicated, classified into a single severity scale based on actual observed impact, with reviewer attribution noted.
- **Verification status:** ✅ I read the code and confirmed the finding is real.

Spot-verifications I performed before recording each finding:
- Mutable preconditions (`command-transaction.ts:124-135`)
- Layer sparsity hole (`layer.ts:64,82,89`)
- Layer forEach unbounded clone (`layer.ts:94-105`)
- transaction() skips warnIfPoisoned (`world.ts:710-713` vs `world.ts:719,834`)
- CommandTransaction generic surface (`command-transaction.ts:25-26`)
- deserialize tick validation gap (`world.ts:1000` → `game-loop.ts:75-77`)
- world.ts / occupancy-grid.ts LOC vs 500-cap (`wc -l` confirms 2469 / 1602)
- Doc dead reference to `setTransfer` (`docs/guides/resources.md:194`)
- Listener-failure tick asymmetry (`world.ts:1397` vs `world.ts:1478`)
- Layer.fromState double-validation (`layer.ts:166-169` calling `assertJsonCompatible` then `jsonFingerprint`, which itself calls `assertJsonCompatible` per `json.ts:60`)

---

## CRITICAL

### C1. Mutable preconditions can violate `CommandTransaction`'s atomicity guarantee — ✅
**Reviewer:** Codex.

- **File:** `src/command-transaction.ts:4-6, 93-100, 124-135`; doc contract: `docs/architecture/ARCHITECTURE.md:86`, `docs/api-reference.md:3415-3432`.
- **What's wrong:** `TransactionPrecondition` is `(world: World<TEventMap>) => true | false | string`. The predicate runs against the **live, mutable** world inside `commit()`'s try/finally. A predicate is free to call `world.setComponent`, `world.setState`, `world.removeResource`, `world.emit`, etc. while computing its verdict. If that predicate (or a later one) returns `false`, `commit()` returns `{ ok: false, code: 'precondition_failed' }` and the **buffered mutations are never applied** — but any side-effecting writes the predicate already made stay applied. The doc and architecture both promise "no mutation or event is applied" on precondition failure. That's only true for the buffered mutation list.
- **Why it matters:** This breaks the headline "all-or-nothing" safety guarantee that motivates the entire `CommandTransaction` API. An AI agent following the docs trusts that a failed precondition leaves the world untouched; in practice a side-effecting predicate silently debits a resource or mutates state during an "aborted" transaction. AI-native ergonomics: agents write predicates programmatically and may not consciously distinguish "read-only check" from "incidental write."
- **Recommended fix:** Two paths, ordered by safety:
  - **(A) Enforcement (preferred):** Run preconditions against a read-only `World` façade that exposes the read API (`getComponent`, `getEntities`, `getInRadius`, `getState`, `getResources`, etc.) but throws on `setComponent`/`setState`/`emit`/`addResource`/`removeResource`/`setPosition`/`destroyEntity`. Type the `TransactionPrecondition` parameter as `ReadOnlyWorld<TEventMap>`. This makes the contract structural — agents can't accidentally violate it.
  - **(B) Documentation (lighter):** Explicitly document at the precondition contract sites that "preconditions must be side-effect free; the engine does not guard against side-effects in predicates." Add a regression test asserting the foot-gun is documented behaviour. This codifies the limitation but does not protect callers.
  - Recommend (A): the engine already has a clear public read surface to base the façade on, and AI-native operators benefit from structural enforcement. The implementation is a thin proxy; no runtime perf concern since predicates are rare and synchronous.

---

## HIGH

### H1. `CommandTransaction` drops typed-component / typed-state generics — ✅
**Reviewers:** Codex (Medium), Opus (High), Gemini (High). **Three-reviewer consensus.**

- **File:** `src/command-transaction.ts:25-26, 36-65`, `src/world.ts:710-713`.
- **What's wrong:** `CommandTransaction` is generic only over `<TEventMap>`. Its builder methods take `key: string` and `T = unknown` payloads, and `TransactionPrecondition` only sees `World<TEventMap>`, so the v0.5.2 `TComponents`/`TState`/`TCommandMap` registry is invisible inside transactions. Concrete: in `World<TEventMap, TCommandMap, { hp: { current: number } }, TState>`, `world.setComponent(e, 'hp', { wrong: 5 })` fails to compile, but `world.transaction().setComponent(e, 'hp', { wrong: 5 }).commit()` compiles, then crashes at runtime when something reads `hp.current`. The constructor at `command-transaction.ts:33-34` and the call site at `world.ts:711-712` carry two `eslint-disable @typescript-eslint/no-explicit-any` and an `as unknown as` cast that exist solely because the transaction's generics don't align with World's.
- **Why it matters:** The v0.5.2 fix specifically threaded typed component access into every authoring surface (`System`, `SystemRegistration`, `registerValidator`, `registerHandler`, `onDestroy`, `deserialize`). Adding a brand-new write surface that ignores this is a strict regression of the v0.5.2 ergonomic promise. AI agents routing actions through transactions get `unknown`-typed mutations exactly where strong typing would catch the most bugs.
- **Recommended fix:** Make `CommandTransaction` generic over `<TEventMap, TCommandMap, TComponents, TState>` (mirror World's exact generic order). Mirror World's typed/loose `setComponent`/`addComponent`/`patchComponent`/`removeComponent` overloads on the transaction. Update `world.transaction()` to return `CommandTransaction<TEventMap, TCommandMap, TComponents, TState>` and pass `this` without the `as unknown as` cast. `TransactionPrecondition` likewise widens so `predicate(world)` sees the typed world (this is also where C1's read-only façade typing belongs). Mostly a type-only refactor; runtime stays the same.

### H2. `Layer<T>` doesn't actually stay sparse after writes back to `defaultValue` — ✅
**Reviewers:** Codex, Gemini. **Two-reviewer consensus.**

- **File:** `src/layer.ts:61-65, 77-83, 85-92, 107-121`.
- **What's wrong:** `setCell`, `setAt`, and `fill` always store cloned values into `this.cells`, even when the new value's fingerprint matches `_defaultFingerprint`. `getState()` strips default-equal entries during serialization (`layer.ts:110`), but the live `Map<number, T>` retains them. Reverting cells to default or calling `fill(defaultValue)` leaves resident entries behind — the in-memory and canonical-sparse representations diverge. On a 1000×1000 layer, `fill(defaultValue)` allocates 1,000,000 Map entries.
- **Why it matters:** The headline scaling promise of `Layer<T>` is sparse field-data storage. A system that "clears" cells back to default routinely (e.g., resetting a pollution layer at scenario reset) produces full-map memory cost. The api-reference and ARCHITECTURE both advertise sparse storage as a contract.
- **Recommended fix:** Strip-at-write. In `setCell`, `setAt`, and `fill`, compare `jsonFingerprint(value) === this._defaultFingerprint` and `delete` the cell entry instead of storing it; `fill(defaultValue)` becomes `this.cells.clear()`. This also fixes the H2-adjacent foot-gun that today the in-memory and canonical-sparse representations diverge until a `getState`-then-`fromState` round-trip. Update the existing test asserting "setCell with default value still stores the marker" to instead assert sparsity — the test is locked-in to the broken behaviour.

### H3. `world.transaction()` skips `warnIfPoisoned` — regresses v0.5.1 contract — ✅
**Reviewer:** Opus.

- **File:** `src/world.ts:710-713` vs `src/world.ts:719` (`submitWithResult` calls `warnIfPoisoned('submit')`) and `src/world.ts:834` (`serialize` calls `warnIfPoisoned('serialize')`).
- **What's wrong:** v0.5.1 added "warn-once-per-poison-cycle" to the public write/inspect surfaces (`submit`, `serialize`) so a caller who hit a tick failure and forgot to `recover()` gets a `console.warn` diagnostic before silently continuing. `transaction()` was added in v0.5.11 and skips the guard entirely. A user who never called `recover()` can still build a transaction, call `commit()`, have the buffered mutations apply against the live (poisoned) world via the public mutation API, and receive **zero** diagnostic. Once they finally call `step()`, the world throws `WorldTickFailureError` — but state has already drifted from the snapshot taken at the failure tick.
- **Why it matters:** Iter-2's H_NEW2 deliberately chose "warn, do not block" as the v0.5.1 policy for `submit`/`serialize`. Adding a third write surface that ignores both halves of the policy is a strict pattern regression. AI agents calling `transaction()` on a poisoned world get zero feedback.
- **Recommended fix:** Add `this.warnIfPoisoned('transaction');` either in `world.transaction()` (fires on instantiation — cheap polling could spam warnings) or in `CommandTransaction.commit()` (fires on actual write — more robust). Recommend the latter to match the "fire on write attempt" intent. Add a regression test mirroring `submit`'s warn-once-per-poison-cycle assertion. No behaviour change for the non-poisoned path.

### H4. `Layer.forEach` / `getCell` / `getAt` clone every value via `structuredClone` — perf trap — ✅
**Reviewer:** Gemini.

- **File:** `src/layer.ts:53-59, 67-75, 94-105`.
- **What's wrong:** Every read operation, including each iteration of `forEach`, runs `structuredClone(stored)` (or `structuredClone(_defaultValue)` for unset cells). On a 250×250 layer, a single `forEach` performs 62,500 `structuredClone` calls per traversal; if a system iterates the layer every tick, that's 62,500/tick. Even worse: for unset cells, `forEach` clones `_defaultValue` once per cell (`layer.ts:99-101`) — the entire default object is reconstructed for every empty cell, of which there can be `width × height`.
- **Why it matters:** `Layer<T>` is positioned as a hot-path utility (pollution, influence, weather, danger field data). The defensive-copy contract is sound for object `T`, but agents reading scalar layers (`Layer<number>`, `Layer<boolean>`) pay the same overhead despite the value being immutable on the JS side. The TPS impact is severe enough to make the utility unusable for the field-data use cases it was built for.
- **Recommended fix:** Two-tier copy:
  - **Fast-path for primitives:** if `_defaultValue` is `number | string | boolean | null`, skip `structuredClone` on read. Detection: cache `private readonly _isPrimitive: boolean = isPrimitiveValue(this._defaultValue)` in the constructor; gate every read on `this._isPrimitive ? stored : structuredClone(stored)`. Numbers/strings/booleans/nulls are immutable in JS — no defensive-copy needed.
  - **Object-T `forEach`:** add a `forEachReadOnly(cb)` that returns the live reference and explicitly documents the aliasing risk. Existing `forEach` keeps the safe-clone behaviour. Lets users opt into zero-allocation traversal without breaking the safe default.

---

## MEDIUM

### M1. Mid-emit JSON-compat failure leaves mutations applied — ✅
**Reviewer:** Opus.

- **File:** `src/command-transaction.ts:108-154` (commit loop), `src/event-bus.ts:18-27` (emit-time validation), pinned by `tests/command-transaction.test.ts:429-434`.
- **What's wrong:** `commit()` runs preconditions → mutations → events. Event payloads pass through `assertJsonCompatible` at `EventBus.emit` (line 19-27) — but emit happens **after** all mutations have already applied. A typo'd event payload (`{ fn: () => 1 }`) inside an otherwise-valid transaction lets mutations 0..M land, then event N throws. Caller sees the throw with the world partially mutated (no event N, but mutations M done) and no path to retry (the `try/finally` consumes the transaction, which is correct).
- **Why it matters:** The transaction's name and worked example sell "all-or-nothing." The all-or-nothing guarantee currently only covers the precondition phase; emit-time JSON-compat failures degrade silently to a partial-apply. The cheap fix is to validate at buffer time, before any mutation runs.
- **Recommended fix:** Move `assertJsonCompatible(data, 'CommandTransaction.emit payload')` to `CommandTransaction.emit()` (line 87), so an invalid payload is rejected at buffer time. Keep the `EventBus.emit` validation as defense-in-depth. Add a regression test: buffer a `setComponent` then `emit` with a `() => 1` payload; assert the throw happens at `emit()` (buffer time), and that the world's component value is unchanged.

### M2. `World.deserialize()` doesn't validate `snapshot.tick` — ✅
**Reviewer:** Codex.

- **File:** `src/world.ts:1000` (passes `snapshot.tick` straight to `gameLoop.setTick`); `src/game-loop.ts:75-77` (`setTick` blindly assigns).
- **What's wrong:** `setTick(value: number) { this._tick = value; }` accepts any number. A malformed snapshot can install `NaN`, a fractional tick, a negative tick, or `Infinity`. That value then flows into:
  - `getObservableTick()` (used in command submission results)
  - `TickDiff.tick`
  - The new interval scheduling check `(tick - 1) % system.interval !== system.intervalOffset` (`world.ts:1776`) — `(NaN - 1) % 5 === NaN`, so all interval-gated systems silently stop running
  - Snapshot `tick++` on `advance()` — `NaN++` stays `NaN`
- **Why it matters:** One bad snapshot silently corrupts multiple sequencing contracts instead of failing fast at load time. Snapshots come from disk / network / agent-emitted state, all of which can be corrupted.
- **Recommended fix:** Validate at `deserialize`'s boundary (preferred — boundary validation pattern matches the rest of the file) or centralize in `GameLoop.setTick`. Recommend: in `world.ts` deserialize, before `gameLoop.setTick(snapshot.tick)`, assert `Number.isSafeInteger(snapshot.tick) && snapshot.tick >= 0` and throw a clear error. Mirrors the validation style of `EntityManager.fromState`, `ResourceStore.fromState`, `Layer.fromState`. Add a regression test for `NaN` / negative / fractional tick rejection.

### M3. `world.ts` is 2469 LOC; `occupancy-grid.ts` is 1602 LOC — both 3×–5× the 500 LOC project cap — ✅
**Reviewer:** Opus.

- **File:** `src/world.ts` (whole file), `src/occupancy-grid.ts` (whole file).
- **What's wrong:** `AGENTS.md` (commit `d7f9511`, the immediate prior commit on `main`) makes the rule explicit: "No file > 500 LOC." Both files were already over budget; v0.5.9 / v0.5.11 added scheduling and transaction wiring to `world.ts` without splitting. Both files mix multiple concerns that have natural seams.
- **Why it matters:** Every new feature lands in `world.ts` and grows it further. The rule was just tightened on `d7f9511` — flagging now is timely. Files this size make code review harder, are more prone to merge conflicts, and accumulate cross-concern coupling.
- **Recommended fix:** Pull the natural seams out of `world.ts` into adjacent modules (no behaviour change — pure mechanical split):
  - serialization (`serialize`/`deserialize` + private clone helpers) → `world-serialize.ts`
  - system scheduling (`normalizeSystemRegistration`, `validateSystemInterval`, `validateSystemIntervalOffset`, `resolveSystemOrder`, `topologicalSort`, `executeSystems`) → `world-systems.ts`
  - tick pipeline (`runTick`, `processCommands`, `dropPendingCommands`, `finalizeTickFailure`, `createTickFailure`, `emitTickFailure`, listener-emit helpers) → `world-tick.ts`
  - tags/meta + state store → `world-state.ts`
  - `World` class itself stays as the orchestrator (entity, component, grid, resource ownership; public API surface; method delegation to the split modules)
  Keep this fix on its own commit — do not bundle with feature work. `occupancy-grid.ts` split is similarly scoped; defer to a separate commit if scope-creep is a concern.

### M4. `Layer.fromState` validates each value twice on load — ✅
**Reviewer:** Opus.

- **File:** `src/layer.ts:166-169`, with `jsonFingerprint` defined at `src/json.ts:60` calling `assertJsonCompatible` internally.
- **What's wrong:** Per cell entry: `assertJsonCompatible(value, 'Layer cell value')` (line 166), then `jsonFingerprint(value)` (line 168), and `jsonFingerprint`'s implementation also calls `assertJsonCompatible(value, label)`. So every cell pays validation twice. For a 100k-cell snapshot that doubles the load cost.
- **Why it matters:** Snapshot deserialize is a startup-cost amplifier and a hot path for save/load tooling. Layer is positioned as a hot-path utility.
- **Recommended fix:** Drop the explicit `assertJsonCompatible` at line 166 — `jsonFingerprint` already validates implicitly. To preserve the "Layer cell value" label in error messages, ensure `jsonFingerprint`'s implementation accepts an optional label arg (or wrap the call in a try/catch that re-throws with the right label). Either way, one validation per cell.

### M5. `Layer.clone()` performs redundant double-clone — ✅
**Reviewer:** Gemini.

- **File:** `src/layer.ts:174-176`.
- **What's wrong:** `clone()` is implemented as `Layer.fromState(this.getState())`. Both `getState()` (line 111) and `fromState()` (line 169) `structuredClone` every non-default cell. So cloning a layer pays 2× per-cell `structuredClone` plus an intermediate `LayerState<T>` object allocation.
- **Why it matters:** Wastes CPU and triggers unnecessary GC. Layers are positioned as field-data utilities — clone is plausibly called for snapshot capture, scenario setup, and rollback.
- **Recommended fix:** Implement `clone()` directly: instantiate a new `Layer` with the same options, then iterate `this.cells` once and copy each entry with one `structuredClone`. Bypasses the intermediate `getState`/`fromState` overhead. One-method change, ~10 lines.

---

## LOW / POLISH

### L1. `runTick` listener-failure tick asymmetry — ✅
**Reviewer:** Opus.

- **File:** `src/world.ts:1397` (success path: `metrics?.tick ?? this.gameLoop.tick + 1`) vs `src/world.ts:1478` (listener-failure path: `metrics?.tick ?? this.gameLoop.tick`).
- **What's wrong:** The success path captures `tick` at `runTick` start using `gameLoop.tick + 1` (the tick that's about to execute). The listener-failure path is reached **after** `gameLoop.advance()` ran at line 1468, so `gameLoop.tick` is already the post-advance value — and the path drops the `+1`. The result is consistent (both express "the tick that just executed"), but the asymmetry is subtle and brittle: anyone refactoring `runTick` and not noticing the advance-then-no-`+1` quirk introduces an off-by-one.
- **Why it matters:** Latent maintenance hazard. Behaviour today is correct — this is a robustness/readability fix.
- **Recommended fix:** Capture `tick` once at the top of `runTick` (use the line 1397 value), and reuse it in both success and listener-failure paths. Eliminates the `+1` / no-`+1` asymmetry; the listener-failure block becomes `return this.finalizeTickFailure(this.createTickFailure({ tick, ... }), ...)`.

### L2. `commit()` after `abort()` flips status to `'committed'` — semantic confusion — ✅
**Reviewers:** Opus, Gemini.

- **File:** `src/command-transaction.ts:108-117, 187-191`.
- **What's wrong:** `commit()` after `abort()` returns `{ ok: false, code: 'aborted' }` and sets `this.status = 'committed'`. A subsequent builder method (e.g., `tx.setComponent(...)`) then throws `"CommandTransaction already committed"` rather than `"CommandTransaction already aborted"`. The user's mental model is "I aborted this; the error should reflect that."
- **Why it matters:** Cosmetic — the contract is sound either way. Just inconsistent wording.
- **Recommended fix:** Track terminal status separately. Introduce a `'consumed'` state that both `commit()` and `abort()` finalize to, with a private `terminalReason: 'committed' | 'aborted' | 'mid-throw'` field for error-message clarity. Or simpler: change `assertPending` to inspect `status` and emit the matching error string ("aborted" if previously aborted, "committed" if previously committed-cleanly). Pick whichever the team prefers.

### L3. `jsonFingerprint` is sensitive to object key insertion order — ✅
**Reviewers:** Opus (Note), Gemini (Low).

- **File:** `src/json.ts:45-48` (definition), `src/layer.ts:110, 168` (use sites in Layer's sparsity check).
- **What's wrong:** `jsonFingerprint` delegates to native `JSON.stringify`, which is sensitive to insertion order. `setCell({ a: 1, b: 2 })` retains the entry if `defaultValue` was constructed `{ b: 2, a: 1 }` — logically equivalent, fingerprint-different. Already documented as a foot-gun in `docs/api-reference.md:3588`, with the documented workaround "use the same key order as `defaultValue`."
- **Why it matters:** Known limitation; documented. The concern is that AI agents synthesizing component data programmatically may not respect key-order discipline. Fingerprint-based default-stripping (H2 fix) would inherit this foot-gun.
- **Recommended fix:** Open question for user judgment, not a recommendation:
  - **(A)** Canonicalize: `jsonFingerprint` sorts keys before stringifying. One-line change in `src/json.ts:62`. **Behavior change** for existing semantic-mode diff baselines and snapshot canonicalization — counts as a v0.6.0 breaking-style change because some existing fingerprint comparisons would flip from inequal-to-equal.
  - **(B)** Status quo: leave the foot-gun, keep the doc note. Layer's H2 fix becomes "strip-at-write only when the user passes the same key order; otherwise the user pays for the doc."
  - **(C)** Add a `Layer`-specific `canonicalFingerprint` that sort-canonicalizes and use it only inside Layer. Localizes the fix without breaking other fingerprint consumers.
  - I lean **(C)** as a defensible middle ground, but flagging for user choice.

### L4. Resources guide references nonexistent `setTransfer(...)` API — ✅
**Reviewer:** Codex.

- **File:** `docs/guides/resources.md:194`.
- **What's wrong:** Starvation-handling section reads "...call `setTransfer(...)` (or remove + re-add) to set per-tick rates that respect your priority." The public surface (`world.ts:1087-1099`) only exposes `addTransfer` and `removeTransfer`. There is no `setTransfer`.
- **Why it matters:** Readers following the guide hit a dead end.
- **Recommended fix:** Rewrite the sentence to use `removeTransfer(...)` followed by `addTransfer(...)` with the new rate, and drop the nonexistent API name. One-line doc fix.

### L5. `Layer` lacks `clear(cx, cy)` / `clearAt(wx, wy)` — falls out of H2 fix — ✅
**Reviewer:** Opus.

- **File:** `src/layer.ts` (no such method today).
- **What's wrong:** To shrink storage, a user has to `setCell(cx, cy, defaultValue)` (which today stores a marker, doesn't free) and round-trip through `getState`/`fromState`. After H2's strip-at-write fix, `setCell(..., defaultValue)` correctly frees the entry — but an explicit `clear(cx, cy)` / `clearAt(wx, wy)` method is the more honest API for "drop this cell back to default."
- **Why it matters:** Intent visibility — `clear(0, 0)` is more readable than `setCell(0, 0, defaultValue)`.
- **Recommended fix:** After H2 lands, add `clear(cx, cy): void` and `clearAt(wx, wy): void` that delegate to `this.cells.delete(this.cellIndex(cx, cy))`. One-line each, one test each.

### L6. CommandTransaction constructor `as unknown as` cast + eslint-disables — falls out of H1 — ✅
**Reviewer:** Opus.

- **File:** `src/command-transaction.ts:33-34`, `src/world.ts:711-712`.
- **What's wrong:** Two `// eslint-disable-next-line @typescript-eslint/no-explicit-any`s and an `as unknown as` cast that exist solely because the transaction's generics don't align with World's. H1's fix eliminates both.
- **Recommended fix:** Falls out of H1 fix.

### L7. `GameLoop.advance()` lacks `MAX_SAFE_INTEGER` guard on `_tick` — theoretical
**Reviewer:** Gemini.

- **File:** `src/game-loop.ts:47-49`.
- **Note:** `advance()` is `this._tick++` with no upper bound. After `MAX_SAFE_INTEGER` ticks (~9×10¹⁵), modulo math used by interval scheduling silently corrupts. **At 60 TPS this is ~4.7 million years of continuous simulation.** Practical concern: zero. Theoretical concern: yes — it's a contract violation that goes silent.
- **Recommended fix:** Either accept the limit (close as wontfix; document the bound somewhere if any user could plausibly hit it — they cannot) or add a single `if (this._tick >= Number.MAX_SAFE_INTEGER) throw new RangeError('tick counter saturated')` guard at advance(). Three-line change, no measurable cost. **Lean wontfix** — flagging only because Gemini did and the cost of the fix is trivial.

---

## NOTES & OPEN QUESTIONS (decisions needed from user, not findings)

### N1. `recover()` does not drain commands queued during the failed tick — by design?
**Reviewer:** Opus, prior-iter-2 deferred (M_NEW1).

- **File:** `src/world.ts:627-633`, doc reference: `ARCHITECTURE.md:90`.
- **Note:** Iter-2's M_NEW1 flagged this; the user closed iter-2 without an explicit decision. The fact that intervals correctly handle "failed tick consumes a slot" (`tests/system-interval.test.ts`) strengthens the "this is by design" reading. But the architecture doc's `recover()` paragraph does not mention that mid-failed-tick `submit`-queued commands survive to the post-recovery tick. Open question: add a one-line note to `ARCHITECTURE.md`, or actually drain in `recover()`?

### N2. Listener exception asymmetry — diff vs commandResult/Execution — by design?
**Reviewer:** Opus.

- **File:** `src/world.ts:1473-1491` (diff listener → poison) vs `src/world.ts:1664-1692` (other listeners → swallow + console.error).
- **Note:** Per devlog v0.5.1, `commandResultListener`/`commandExecutionListener`/`tickFailureListener` thrown exceptions are caught and `console.error`'d. The diff-listener loop instead routes errors through `finalizeTickFailure` (which poisons the world). The rationale: diff listeners produce TickDiffs that fail-fast contracts depend on; observation listeners are fire-and-forget. That's defensible. Not a bug — but the asymmetry is non-obvious and not documented in `ARCHITECTURE.md`'s "Tick failure semantics" paragraph. Open question: add one sentence to `ARCHITECTURE.md` clarifying which listener channels participate in the poison contract vs which are observation-only?

### N3. `setState` / `setMeta` / `addTag` / `removeTag` not buffered by `CommandTransaction`
**Reviewer:** Opus.

- **File:** `src/command-transaction.ts` (no methods), `src/world.ts:1114-1137` (live API for state).
- **Note:** Documented as a v1 limitation in changelog 0.5.11. The composition gap: a precondition can read `world.getState(...)` but a transaction cannot atomically write state alongside its component mutations. AI agents wanting to advance world clock + apply a component mutation atomically have to write state outside the transaction. Open question: ship as v1 limitation forever (record in `decisions.md`), or commit to v2 work to extend the buffered surface? Either is fine; current state is silent.

---

## Fix plan / batching

Recommended commit ordering:

| Commit | Scope | Includes | Severity |
|--------|-------|----------|----------|
| 1 | `CommandTransaction` correctness + ergonomics | C1 (read-only precondition façade), H1 (typed generics), H3 (warnIfPoisoned), M1 (buffer-time event validation), L2 (terminal status), L6 (cast/disable cleanup falls out of H1) | C / H / M / L |
| 2 | `Layer<T>` correctness + perf | H2 (strip-at-write sparsity), H4 (primitive fast-path + readOnly forEach), M4 (single-validate fromState), M5 (direct clone), L5 (clear/clearAt) | H / M / L |
| 3 | World deserialize hardening | M2 (validate snapshot.tick) | M |
| 4 | Doc fix | L4 (`setTransfer` removal), N1/N2/N3 docs decisions if user picks "document" | L |
| 5 | `world.ts` mechanical split | M3 (split serialize/systems/tick/state into adjacent files) | M |

L3 (key-order fingerprint) and L7 (MAX_SAFE_INTEGER guard) are decisions for user, deferred until called.

Estimated 4–5 commits across iter-1. Each commit triggers a per-task multi-CLI diff review per AGENTS.md before iteration N+1.

---

End of REVIEW.md.
