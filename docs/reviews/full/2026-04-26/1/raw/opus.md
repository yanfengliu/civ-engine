Have enough context. Writing review now.

# Review Summary

The v0.5.9–v0.5.11 features land cleanly. Per-system `interval`/`intervalOffset` scheduling has tight validation, well-targeted tests (legacy-parity, failed-tick interaction, 3-way stagger, MAX_SAFE_INTEGER), and the `(tick-1) % interval === offset` formula is correct because `tick` is always >= 1 when `executeSystems` runs. `Layer<T>` is over-engineered in a good way — defensive copies at every boundary, sparse storage with canonical-on-load semantics, comprehensive bounds/integer/JSON validation, and the documented key-order foot-gun is the only sharp edge. `CommandTransaction`'s `try/finally` correctly poisons the transaction on mid-commit throw, the precondition state machine is sound, and the iter-1 review's mid-commit-double-apply hazard is fixed.

The biggest remaining risk is **API surface ergonomics**, not correctness: `world.transaction()` was added later than the v0.5.1 `warnIfPoisoned` and v0.5.2 `TComponents`/`TState` threading work, and it picked up neither — so transactions silently mutate poisoned worlds and the typed-component registry that a v0.5.2 user expects inside `world.setComponent(...)` does not survive into `tx.setComponent(...)`. Plus `world.ts` continues to grow (now 2469 LOC vs the project's 500-LOC cap explicitly tightened in `d7f9511`).

# Critical

None observed. The new features ship correctness-clean; the prior chain's Critical findings (snapshot aliasing, `findNearest` corner) remain fixed.

# High

### CommandTransaction loses `TComponents` / `TState` typing — undermines v0.5.2 fix
- **File**: `src/command-transaction.ts:25-34`, `src/command-transaction.ts:36-59`, `src/world.ts:710-713`
- **Problem**: `CommandTransaction` is generic only over `TEventMap`. Its `setComponent<T>(entity, key: string, data: T)`, `addComponent`, `patchComponent<T>(... patch: (data: T) => T | void)`, and `removeComponent(entity, key: string)` accept `string` keys with unconstrained `T`. The v0.5.2 fix specifically threaded `TComponents`/`TState` through `System`, `SystemRegistration`, `registerSystem`, `registerValidator`, `registerHandler`, `onDestroy`, and `deserialize` so authoring surfaces would be type-checked against the typed component registry. `world.transaction()` is a brand-new authoring surface that bypasses this. Concrete: in `World<{}, {}, { hp: { current: number } }, {}>`, `world.setComponent(e, 'hp', { wrong: 5 })` fails to compile, but `world.transaction().setComponent(e, 'hp', { wrong: 5 }).commit()` compiles, then crashes at runtime when something reads `hp.current` and gets `undefined`.
- **Why it matters**: The headline ergonomic from v0.5.2 ("typed component access works inside system callbacks") evaporates the moment a system uses a transaction. AI-native operators routing actions through transactions get `unknown`-typed mutations.
- **Suggested fix**: Make `CommandTransaction` generic over `<TEventMap, TComponents, TState>`, mirror the World's typed/loose `setComponent` overloads on the transaction, and update `world.transaction()` to return `CommandTransaction<TEventMap, TComponents, TState>` and pass the world without the `as unknown as World<TEventMap, any, any, any>` cast. Mostly type-only refactor; runtime stays the same. `TransactionPrecondition` should likewise widen so `predicate(world)` sees the typed world. Cast in the constructor (`World<TEventMap, any, any, any>`) becomes unnecessary if the transaction's generics align with World's.

### `world.transaction()` does not warn on a poisoned world (regresses v0.5.1 contract)
- **File**: `src/world.ts:710-713` vs `src/world.ts:715-745` (`submitWithResult` calls `warnIfPoisoned('submit')`) and `src/world.ts:832-835` (`serialize` calls `warnIfPoisoned('serialize')`)
- **Problem**: `transaction()` skips the `warnIfPoisoned` guard added in v0.5.1 for `submit` / `serialize`. A user who has hit a tick failure and forgotten to `recover()` can still call `world.transaction().setComponent(...).commit()`, the buffered mutations apply against the live (poisoned) world via the public mutation API, and no diagnostic fires. Once they finally call `step()`, the world throws `WorldTickFailureError` for being poisoned — but state has already drifted from the snapshot taken at the failure tick.
- **Why it matters**: H_NEW2 from the iter-2 review explicitly chose "warn, do not block" as the policy for `submit`/`serialize`. Adding a third write surface that ignores both halves of that policy is a strict regression of the pattern. AI agents calling `transaction()` on a poisoned world get zero feedback.
- **Suggested fix**: Add `this.warnIfPoisoned('transaction');` to `world.transaction()` (or to `CommandTransaction.commit()` so it fires on actual write rather than instantiation — instantiation could be cheap polling). Add a regression test mirroring `submit`'s warn-once-per-poison-cycle assertion. No behavior change for the non-poisoned path.

# Medium

### `world.ts` is 2469 LOC — 5× the project cap
- **File**: `src/world.ts` (whole file)
- **Problem**: `AGENTS.md` (commit `d7f9511`, the immediate prior commit on `main`) tightens the rule to "No file > 500 LOC". `world.ts` was already over budget before this round; v0.5.9 / v0.5.11 added scheduling and transaction wiring without splitting. `occupancy-grid.ts` is also over (1602 LOC). Both files now mix multiple concerns that have natural seams.
- **Why it matters**: Every new feature lands here and grows the file further. The rule was just tightened, so this is the moment to flag it.
- **Suggested fix**: Pull the natural seams out of `world.ts`: serialization (`serialize`/`deserialize`/cloners) → `world-serialize.ts`; system scheduling (`normalizeSystemRegistration`, `validateSystemInterval`, `validateSystemIntervalOffset`, `resolveSystemOrder`, `topologicalSort`, `executeSystems`) → `world-systems.ts`; tick pipeline (`runTick`, `processCommands`, `dropPendingCommands`, `finalizeTickFailure`, `createTickFailure`, `emitTickFailure`, listener emit helpers) → `world-tick.ts`; tags/meta + state store → `world-state.ts`. Keeps `World` as the orchestrator and brings every file under 500. Don't mix this with feature work — it's a pure mechanical split.

### Mid-emit JSON-compat failure leaves mutations applied
- **File**: `src/command-transaction.ts:108-154` (commit loop), `src/event-bus.ts:18-27` (emit-time validation), `tests/command-transaction.test.ts:429-434` (pinned behavior)
- **Problem**: `commit()` runs preconditions → mutations → events. Event payloads are JSON-validated by `EventBus.emit` only at emit time, AFTER mutations have already applied. A typo'd event payload (`{ fn: () => 1 }`) inside an otherwise-valid transaction causes mutations 0..M to land, then event N to throw. Caller sees the throw with no recoverable state — the transaction is consumed (good — no double-apply), but the world has mutations without the corresponding event.
- **Why it matters**: The transaction's name and worked example sell "all-or-nothing." The all-or-nothing guarantee only covers preconditions; a foot-fault on an event payload becomes a partial-apply. The architecture doc and changelog acknowledge this as a "v1 limitation" — but the cheap fix (validate event payloads at `emit()` buffer time, not at `commit()` apply time) is right here.
- **Suggested fix**: Move `assertJsonCompatible(data, ...)` from `EventBus.emit` (still keep it there as the second line of defense) to the transaction's `emit()` builder method, so an invalid payload is rejected at buffer time before any mutation runs. Add a regression test: buffer a `setComponent` then `emit` with a `() => 1` payload; assert the throw happens before the component changes, not after.

### `setState` and `deleteState` not buffered by `CommandTransaction`
- **File**: `src/command-transaction.ts` (no `setState` method), `src/world.ts:1114-1137` (live API)
- **Problem**: This is documented as a v1 limitation (changelog 0.5.11, "Unbuffered ops"). But the rationale "v1 surface" elides a real composition gap: a precondition can read `world.getState(...)` but a transaction cannot atomically write state alongside its component mutations. An AI agent that wants to advance the world clock + apply a component mutation atomically has to either (a) write the state outside the transaction (defeating atomicity) or (b) call `setState` from inside a buffered `setComponent` that does the work in the patch closure (defeating the audit trail).
- **Why it matters**: `TState` was the v0.5.2 headline addition; not having it on the transaction surface for v0.5.11 leaves the most useful "advance simulation step" pattern unmodelable. Plus the omission interacts with the `TComponents`/`TState` typing gap above — even if the transaction were typed, you can't write state through it.
- **Suggested fix**: Either (a) add `setState`/`deleteState`/`setMeta`/`addTag`/`removeTag` to `CommandTransaction` as v2 work — explicitly call this out in `decisions.md` so the limitation is a decision, not a residual; or (b) document explicitly in the api-reference v1-limitations section that "transactions do not span world state and tags/metadata; co-locate state writes after a successful `commit()`," with a worked example. Today the doc lists the missing ops as a bare bullet without guidance.

### `Layer.fromState` re-validates each value twice on load
- **File**: `src/layer.ts:166-169`
- **Problem**: For each cell entry the code calls `assertJsonCompatible(value, 'Layer cell value')` (line 166), then `jsonFingerprint(value)` (line 168), and `jsonFingerprint` calls `assertJsonCompatible(value, label)` again (`src/json.ts:60`). For a snapshot with 100k cells this doubles the validation cost on load.
- **Why it matters**: Layer is positioned as a hot-path utility (pollution / influence / weather). Snapshot deserialize is a startup cost amplifier.
- **Suggested fix**: Either drop the explicit `assertJsonCompatible(value, ...)` at line 166 (let `jsonFingerprint` do it implicitly — error message will lose its "Layer cell value" label, mitigate by passing the label through), or skip the fingerprint comparison when value is a primitive (string/number/boolean/null) and just compare directly. The more invasive fix: cache `_defaultFingerprint` once (already done), and add a `compareToDefault(value)` fast path that short-circuits on primitive equality before stringifying.

# Low / Polish

### `Layer.getState` recomputes fingerprint per stored cell
- **File**: `src/layer.ts:107-121`
- **Problem**: Same redundancy as `fromState`. Each `getState()` call iterates all stored cells and runs `jsonFingerprint(value)` (which re-validates JSON-shape) to filter default-equal entries. Values were already validated on `setCell` / `setAt` / `fill`. Save a per-call O(N · stringify) by caching a "fingerprint of last-stored value" alongside the value, or by stripping at write time (move the strip from getState into setCell). The latter is a one-line behavior change in setCell — `if (jsonFingerprint(value) === this._defaultFingerprint) { this.cells.delete(this.cellIndex(cx, cy)); return; }`. That also fixes a related foot-gun: today `setCell(x, y, defaultValue)` stores the marker in memory but `getState()` strips it; the in-memory and canonical-sparse representations diverge until `getState`-then-`fromState` round-trips. Strip-at-write makes the two representations match.

### `Layer` has no `clear(cx, cy)` to drop a cell back to default storage
- **File**: `src/layer.ts:61-65`
- **Problem**: To shrink storage you have to `setCell(cx, cy, defaultValue)` (which stores a marker, doesn't free), then `getState()` → `fromState()` round-trip. Strip-at-write (above) addresses one half; an explicit `clear(cx, cy)` / `clearAt(wx, wy)` is the more honest API.
- **Suggested fix**: Add `clear(cx, cy): void` and `clearAt(wx, wy): void` that call `this.cells.delete(this.cellIndex(cx, cy))`. One-line each; tests one each. Leaves user intent visible in code.

### `CommandTransaction` constructor takes `World<TEventMap, any, any, any>` — eslint-disable on `any`
- **File**: `src/command-transaction.ts:33-34`, `src/world.ts:711-712`
- **Problem**: Two `eslint-disable-next-line @typescript-eslint/no-explicit-any`s and an `as unknown as` cast that exists only because the transaction's generics don't align with World's. Threading TComponents/TState through CommandTransaction (the High finding above) eliminates both.
- **Suggested fix**: Falls out of the High fix.

### Status state-machine: commit-after-abort flips status to "committed", error message diverges
- **File**: `src/command-transaction.ts:108-117, 187-191`
- **Problem**: `commit()` after `abort()` returns `{ ok: false, code: 'aborted' }` and flips status to `committed`. A subsequent builder method then throws "already committed" rather than "already aborted" — the user's mental model is "I aborted this; the error should reflect that." Minor wording inconsistency.
- **Suggested fix**: Track terminal status as either `committed` or `aborted` separately so the error message reflects the original terminal state. Or add a `terminalReason: 'committed' | 'aborted'` private field. Cosmetic — the contract is sound either way.

### `runTick` reads `metrics?.tick ?? this.gameLoop.tick` in the listener-failure branch
- **File**: `src/world.ts:1478`
- **Problem**: After the inner block at line 1468 calls `this.gameLoop.advance()`, `this.gameLoop.tick` is the post-advance tick. If `metrics` is null (release profile), the listener-failure path uses the post-advance tick rather than the executing tick. The success-path calls already use `metrics?.tick ?? this.gameLoop.tick + 1` (line 1397). Asymmetry.
- **Suggested fix**: Capture `tick` once at the top of `runTick` (line 1397's value), reuse it in both the inner-block failure paths and the post-advance listener path. Eliminates the `+1` / no-`+1` divergence.

# Notes & Open Questions

### `EventBus.emit` synchronously calls listeners; transaction emit-time partial delivery is undocumented
- **File**: `src/event-bus.ts:18-27`, `src/command-transaction.ts:143-148`
- **Note**: If a `world.on('hit', listener)` callback throws, `EventBus.emit` propagates the throw. Inside a transaction commit, this means events 0..N-1 fired (with their full listener fan-out), event N's listener X threw before listeners Y/Z ran for that event, mutations 0..M applied. The api-reference's "Mid-emit throw → partial event delivery" note (line 3447) covers events but not partial within-event listener delivery. Open question: is this worth tightening the wording, or is it fine to leave at "emit-time exceptions are not atomic"? Leaning toward "fine" — emit semantics are not transaction-specific — but flagging in case the user wants to add a sentence.

### Listener exceptions: diff-listener vs other listeners — intentional asymmetry?
- **File**: `src/world.ts:1473-1491` (diff listener → poison) vs `src/world.ts:1664-1692` (other listeners → swallow + console.error)
- **Note**: Per devlog v0.5.1, `commandResultListener`/`commandExecutionListener`/`tickFailureListener` thrown exceptions are caught and `console.error`'d. The diff-listener loop instead routes errors through `finalizeTickFailure` (which poisons the world). The rationale: diff listeners produce TickDiffs that fail-fast contracts depend on; observation listeners are fire-and-forget. That's defensible. Not a bug per se, but the asymmetry is non-obvious and not documented in `ARCHITECTURE.md`'s "Tick failure semantics" paragraph. Open question: add one sentence to ARCHITECTURE.md clarifying which listener channels are observation-only (errors swallowed) vs which participate in the poison contract (errors poison)? I lean yes; flagging for user judgment.

### `recover()` does not drain commands queued during the failed tick — still by design?
- **File**: `src/world.ts:627-633`
- **Note**: M_NEW1 from the iter-2 review flagged this; the user closed iter-2 without an explicit decision and `recover()` still does not touch the command queue or event buffer. The fact that intervals correctly handle "failed tick consumes a slot" (test at `tests/system-interval.test.ts:301-325`) strengthens the "this is by design" reading. But the architecture doc's `recover()` paragraph still says "clears the poison flag along with the cached `lastTickFailure`/`currentDiff`/`currentMetrics`" — without mentioning the survived queue. Open question: add a one-line note to `ARCHITECTURE.md` documenting that mid-failed-tick `submit`-queued commands survive to the post-recovery tick, or actually drain in `recover()`? Either is fine; current state is silent.

### `Layer` fingerprint key-order foot-gun on object-typed defaults
- **File**: `src/layer.ts:107-110, 168` and `docs/api-reference.md:3588`
- **Note**: Documented in the api-reference: `jsonFingerprint` uses `JSON.stringify`, which is insertion-order-sensitive. `setCell({a:1,b:2})` does not strip when defaultValue was constructed as `{b:2,a:1}`. The doc's fix is "write your values with the same key order as `defaultValue`" — workable, but for an AI-native engine where agents synthesize component data programmatically, key-order discipline is fragile. Open question: canonicalize fingerprints by sorting keys before stringifying (one-line change in `src/json.ts:62`, but a behavior change for existing semantic-mode diff baselines and snapshot canonicalization)? If yes, that's a v0.6.0 breaking-style change. If no, the current foot-gun stays. Flagging for user judgment, not recommending one way.
