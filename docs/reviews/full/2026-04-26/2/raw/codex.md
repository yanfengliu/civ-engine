# Review Summary

Most of the iter-1 fixes held up on inspection: the typed `CommandTransaction` surface, `World.deserialize()` tick validation, the hoisted `runTick` tick capture, the `GameLoop` saturation guard, and the `world-internal.ts` extraction all look mechanically sound. The main exception is C1: the new `ReadOnlyTransactionWorld` hardening is still incomplete because the denylist proxy leaves multiple real mutators reachable and also exposes mutable internals when the type is cast away. The other substantive new issue is in the `Layer<T>` primitive fast-path, which infers clone behavior from `defaultValue` alone and breaks the defensive-copy contract for mixed-type layers. Documentation is otherwise close, but the newly public `World.warnIfPoisoned()` API is still missing from the canonical API reference.

# Iter-1 Regressions

### Read-only preconditions still have write-capable escape hatches
- **Iter-1 ID**: C1
- **File**: `src/command-transaction.ts:11-53,69-140`; `src/world.ts:245-281,678-699,784-841,1086-1102`; `docs/api-reference.md:3412-3424`
- **Problem**: The new `ReadOnlyTransactionWorld` is a denylist over the full `World` object, not an explicit read-only façade. Several real mutators are still neither omitted nor blocked, including `start()`, `stop()`, `setSpeed()`, `pause()`, `resume()`, `onCommandResult()`, `offCommandResult()`, `onCommandExecution()`, `offCommandExecution()`, `onTickFailure()`, `offTickFailure()`, `random()`, `setResourceMax()`, `setProduction()`, and `setConsumption()`. Worse, because the proxy forwards arbitrary property reads, a casted caller can still reach mutable internals like `gameLoop`, `resourceStore`, or `rng` and mutate through those objects directly.
- **Why it matters**: C1’s headline guarantee is still false in both the type surface and the runtime fallback path, so a “failed” precondition can still change world/runtime state or advance deterministic RNG state.
- **Suggested fix**: Replace the denylist proxy with an explicit allowlist façade object that only exposes pure read getters/methods, each bound once. Do not proxy the full `World` instance. Add regression tests that prove `w.random()`, `w.pause()`, `w.setProduction(...)`, and a casted internal-field escape like `(w as any).gameLoop.pause()` are all rejected.

# Critical

None observed.

# High

### Primitive fast-path trusts `defaultValue` instead of the actual stored value
- **File**: `src/layer.ts:52-80,87-104,127-173,234-255`
- **Problem**: `_isPrimitive` is computed once from `defaultValue` and then reused for every storage, read, clone, and serialization boundary. If a caller constructs `Layer<unknown>` or `Layer<number | { n: number }>` with a primitive `defaultValue` and later stores an object, the object is stored without cloning, returned without cloning, emitted from `getState()` without cloning, and copied into `clone()` by reference.
- **Why it matters**: This breaks the documented defensive-copy contract and creates silent aliasing between caller-owned objects, live layer state, serialized snapshots, and cloned layers.
- **Suggested fix**: Decide clone behavior from the actual value crossing the boundary, not only from `defaultValue`. A straightforward fix is to replace `_isPrimitive ? value : structuredClone(value)` with `isImmutablePrimitive(value) ? value : structuredClone(value)` on every read/write/clone/serialize path, or else reject writes whose primitive-ness differs from the layer’s declared/default shape. Add regression tests for primitive-default layers that later store objects via `setCell`, `setAt`, `fill`, `getState`, and `clone`.

# Medium

None observed.

# Low / Polish

### `warnIfPoisoned()` is public in code but absent from the API reference
- **File**: `src/world.ts:653-658`; `docs/api-reference.md:1487-1507`
- **Problem**: `World.warnIfPoisoned(api)` is public and is explicitly called out in the v0.6.0 changelog, but the API reference jumps from `recover()` straight to `start()` with no section documenting the method.
- **Why it matters**: This is public API drift in the canonical reference, which makes the new transaction warning behavior harder to discover and violates the repo’s documentation discipline.
- **Suggested fix**: Add a `#### warnIfPoisoned(api)` section near `recover()` / `serialize()` describing the once-per-poison-cycle warning behavior and intended usage.

### The new M2 tests still do not pin the overflow half of `Number.isSafeInteger`
- **File**: `tests/serializer.test.ts:477-512`
- **Problem**: The regression suite added cases for `NaN`, `-1`, `3.14`, and `Infinity`, but there is still no explicit test for `Number.MAX_SAFE_INTEGER + 1`, even though the implementation and changelog both claim non-negative safe-integer validation.
- **Why it matters**: The code looks correct today, but the upper-bound overflow case that motivated the safe-integer wording remains unpinned by tests.
- **Suggested fix**: Add one more regression test that mutates `snapshot.tick` to `Number.MAX_SAFE_INTEGER + 1` and asserts the same descriptive `WorldSnapshot.tick must be a non-negative safe integer` error.

# Notes & Open Questions

I did not re-flag the deferred `world.ts` / `occupancy-grid.ts` LOC overages; the partial `world-internal.ts` extraction itself looks coherent and `topologicalSort` staying in `world.ts` is justified by its dependency on `RegisteredSystem`.

This pass was source-and-test inspection only; I did not rerun the npm gates in this read-only session.


