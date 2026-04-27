```markdown
# Review Summary
The iter-1 fixes successfully addressed the core structural problems: `CommandTransaction` now fully threads the `World` generics (H1), `Layer<T>` properly strips default values on write for true sparse scaling (H2), and the primitive fast-paths correctly bypass defensive clones (H4). However, the C1 `ReadOnlyTransactionWorld` guard missed several state-mutating methods (including resource mutators, engine lifecycle methods, and RNG advancement), leaving atomicity vulnerable to side-effects. Additionally, a new High severity data-corruption bug was introduced via nullish coalescing in `Layer.forEachReadOnly`. The overall trajectory is solid, but the proxy gaps and the new iteration traversal bug need one more pass.

# Iter-1 Regressions

### C1 proxy and typing still allow mutations via resource, lifecycle, and RNG methods
- **Iter-1 ID**: C1
- **File**: `src/command-transaction.ts:7-45, 54-94`
- **Problem**: The `ReadOnlyTransactionWorld` `Omit` type and the `FORBIDDEN_IN_PRECONDITION` runtime set successfully exclude ECS mutations, but miss several other true state-mutating methods present on `World`: `setResourceMax`, `setProduction`, `setConsumption`, `random` (mutates deterministic RNG sequence), `start`, `stop`, `pause`, `resume`, `setSpeed`, `onDestroy`, `offDestroy`, `onCommandResult`, `offCommandResult`, `onCommandExecution`, `offCommandExecution`, `onTickFailure`, and `offTickFailure`.
- **Why it matters**: A precondition can still trivially violate atomicity by mutating resource rates, advancing the RNG sequence (breaking determinism), or pausing the engine, then returning `false` to abort the transaction while leaving those un-buffered side-effects applied to the engine.
- **Suggested fix**: Add all omitted mutating and lifecycle methods to both the `Omit` type list in `ReadOnlyTransactionWorld` and the `FORBIDDEN_IN_PRECONDITION` Set.

# Critical
None observed.

# High

### `Layer.forEachReadOnly` corrupts explicit `null` values to `defaultValue`
- **File**: `src/layer.ts:107-115`
- **Problem**: `forEachReadOnly` uses the nullish coalescing operator (`??`) to provide the default value for unset cells: `cb(stored ?? this._defaultValue, cx, cy)`. Because `null` is a valid immutable primitive (`isImmutablePrimitive(null)` returns `true`), a cell can legitimately store `null`. In this case, `null ?? this._defaultValue` evaluates to `this._defaultValue`.
- **Why it matters**: For a `Layer<number | null>` where a cell is explicitly set to `null`, `forEachReadOnly` will silently yield the default value instead. This breaks traversal semantics, diverges from `forEach`/`getCell`, and causes data corruption for hot-path reads.
- **Suggested fix**: Use strict undefined checking to match the rest of the file: `cb(stored !== undefined ? stored : this._defaultValue, cx, cy);`.

# Medium
None observed.

# Low / Polish

### `Layer.clone()` performs a redundant defensive clone on `defaultValue`
- **File**: `src/layer.ts:178-180`
- **Problem**: `clone()` passes `structuredClone(this._defaultValue)` into the new `Layer` constructor for object `T`. The `Layer` constructor itself natively defensive-clones `options.defaultValue` upon instantiation, resulting in an unnecessary double-clone of the default object.
- **Suggested fix**: Pass the internal reference directly to the constructor configuration: `defaultValue: this._defaultValue,`.

### `Layer.fromState` unnecessarily stringifies primitive values for sparsity check
- **File**: `src/layer.ts:166-169`
- **Problem**: `fromState` computes `jsonFingerprint(value)` for every loaded cell to check if it matches the default. For primitive layers (`_isPrimitive === true`), this incurs `JSON.stringify` overhead per cell on load, effectively ignoring the H4 primitive fast-path.
- **Suggested fix**: Inline the `matchesDefault` logic: `const isDefault = layer._isPrimitive ? value === layer._defaultValue : jsonFingerprint(value) === layer._defaultFingerprint; if (isDefault) continue;`. 

### `CommandTransaction.commit()` throws inaccurate terminal reason on double-commit
- **File**: `src/command-transaction.ts:187-190`
- **Problem**: The L2 fix successfully introduced `terminalReason` and updated `assertPending` to use it (e.g. throwing "already aborted" on `tx.setComponent`). However, `commit()` hardcodes the string `throw new Error('CommandTransaction already committed')`. Calling `commit()` twice after `abort()` throws "already committed" instead of "already aborted".
- **Suggested fix**: Update `commit()` to use `terminalReason`: `const reason = this.terminalReason ?? 'committed'; throw new Error(\`CommandTransaction already ${reason}\`);`.

# Notes & Open Questions

- **Deferred `world.ts` split**: As noted in the project context, the full modular extraction of `world.ts` (currently at 2232 LOC) and `occupancy-grid.ts` is explicitly deferred to a dedicated refactor branch. The standalone helpers cleanly extracted into `world-internal.ts` are a solid partial step.
- **`GameLoop.advance()` saturation**: L7 was correctly addressed by adding a `Number.MAX_SAFE_INTEGER` guard. Note that if this throws, it skips the normal `TickFailure` listener pipeline and bubbles straight up to crash the engine. Given that reaching tick 9×10¹⁵ takes millions of years at 60 TPS, a fatal crash is perfectly acceptable.
```
