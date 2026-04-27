# Review Summary

v0.5.9’s interval cadence work holds up well: the scheduling math, failed-tick interaction, validation, and exports are consistent with the docs and tests. The bigger remaining risks are in v0.5.10 and v0.5.11: `Layer<T>` does not actually preserve sparse storage after default-value writes, and `CommandTransaction` still has one contract hole plus a type-surface regression. Outside the new feature files, I found one snapshot-validation gap that can corrupt tick semantics after deserialize, and one small guide drift. Overall code quality is still strong, but I would not treat `CommandTransaction`’s “world untouched on precondition failure” guarantee as release-safe until the precondition mutability hole is closed.

# Critical

### Mutable preconditions can violate the transaction’s atomicity guarantee
- **File**: `src/command-transaction.ts:4-6,93-149`; `docs/architecture/ARCHITECTURE.md:86-86`; `docs/api-reference.md:3404-3447`
- **Problem**: `require(predicate)` receives the live mutable `World`, and `commit()` executes each predicate directly before buffered mutations. A predicate can call `setComponent`, `setState`, `removeResource`, `emit`, etc. itself, then return `false` or let a later predicate fail. In that case `commit()` reports `precondition_failed`, but the world has already changed. The docs currently promise that a precondition failure leaves the world untouched, but the implementation only skips the buffered mutation list.
- **Why it matters**: This breaks the headline safety guarantee of `CommandTransaction` and can silently debit resources or mutate state during an “aborted” transaction.
- **Suggested fix**: Run preconditions against a read-only façade that exposes getters/query APIs only, or otherwise hard-block mutating `World` methods while predicate evaluation is in progress. If that is intentionally unsupported, the docs need to explicitly state that preconditions must be side-effect free, but the safer fix is to enforce it in code.

# High

### `Layer<T>` does not actually stay sparse after writes back to `defaultValue`
- **File**: `src/layer.ts:61-91,107-173`; `docs/architecture/ARCHITECTURE.md:97-97`; `docs/api-reference.md:3488-3516,3570-3577`
- **Problem**: `setCell`, `setAt`, and `fill` always store cloned values into `this.cells`, even when the new value fingerprints equal `defaultValue`. `getState()` strips those entries on serialization, but the live `Map<number, T>` stays dense, so reverting cells to default or calling `fill(defaultValue)` leaves resident entries behind. That contradicts the documented “only non-default cells are stored” contract.
- **Why it matters**: The main scaling promise of `Layer<T>` is sparse field-data storage; currently large layers can retain full-map memory/fingerprint cost even after being reset to default.
- **Suggested fix**: Canonicalize writes at mutation time: if the new value matches `_defaultFingerprint`, delete the cell entry instead of storing it. `fill(defaultValue)` should clear the map outright; non-default fills can remain dense.

# Medium

### `CommandTransaction` drops typed component/state ergonomics from the new API surface
- **File**: `src/world.ts:710-712`; `src/command-transaction.ts:4-6,25-93`
- **Problem**: `CommandTransaction` is generic only over `TEventMap`. Its component builders take `key: string` plus unconstrained payloads, and `TransactionPrecondition` only sees `World<TEventMap>`, so typed component registry/state inference is lost inside transactions even though the rest of `World` threads `TComponents`/`TState`.
- **Why it matters**: This makes one of the engine’s main ergonomics features disappear exactly where users are encouraged to compose multi-step actions.
- **Suggested fix**: Thread all four `World` generics through `CommandTransaction` and `world.transaction()`, then mirror `World`’s typed overloads for `setComponent`/`addComponent`/`patchComponent`/`removeComponent` and the precondition callback world type.

### `World.deserialize()` accepts invalid tick values and can poison cadence math
- **File**: `src/world.ts:931-1000,1211-1217`; `src/game-loop.ts:47-76`
- **Problem**: `World.deserialize()` passes `snapshot.tick` straight to `gameLoop.setTick()` with no validation. `GameLoop.setTick()` blindly assigns it, so a malformed snapshot can install `NaN`, a fractional tick, or a negative tick. That then flows into `getObservableTick()`, diff numbering, command submission results, and interval scheduling’s modulo check.
- **Why it matters**: One bad snapshot can silently corrupt multiple sequencing contracts instead of failing fast at load time.
- **Suggested fix**: Validate `snapshot.tick` as a non-negative safe integer before calling `setTick()`, or make `GameLoop.setTick()` enforce that invariant centrally.

# Low / Polish

### Resources guide points to a nonexistent `setTransfer(...)` API
- **File**: `docs/guides/resources.md:190-194`; `src/world.ts:1087-1099`
- **Problem**: The starvation guidance tells readers to call `setTransfer(...)`, but the public surface only exposes `addTransfer(...)` and `removeTransfer(...)`.
- **Why it matters**: Readers following the guide will hit a dead end while trying to implement the documented workaround.
- **Suggested fix**: Rewrite that sentence to say “remove + re-add the transfer with the new rate” and drop the nonexistent API name.

# Notes & Open Questions

None.
