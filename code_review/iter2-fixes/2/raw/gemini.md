# Review Summary
The v0.5.4 commit cleanly resolves all substantive issues raised in iter-1. The `world.grid` delegate now safely isolates the spatial index by returning a fresh Set from `getAt`, closing the mutation vector. The `getLastTickFailure()` cache has been correctly removed to prevent shared mutable reference leaks. Reverting to JSON cloning for hot paths like `TickDiff` and `EventBus` payloads is a sound performance optimization, as their shapes are guaranteed by `assertJsonCompatible` at write-time, while `TickFailure` appropriately keeps `structuredClone` to preserve `Error` stack traces. Doc drift and removed-metric reads have been accurately scrubbed. The only remaining gap is a missing regression test for the `getLastTickFailure()` cache leak fix (M_NEW5), which is a minor polish item.

# Sign-off
SIGN-OFF: CLEAN

# Critical
*(None)*

# High
*(None)*

# Medium
*(None)*

# Low / Polish
### Missing regression test for `getLastTickFailure()` reference leak (M_NEW5)
- **File**: `tests/world-commands.test.ts`
- **Iter-1 / iter-2 finding**: M_NEW5
- **Problem**: While the fix to revert the `lastTickFailureClone` cache in `getLastTickFailure()` was correctly applied in `src/world.ts`, a regression test to lock in this behavior was not added. The prompt notes that tests were added for `L_NEW4`, `warn-once`, `inspectPoisoned`, and `legacy-snapshot`, but omits coverage for M_NEW5. 
- **Why it matters**: Without a test asserting that repeated calls to `getLastTickFailure()` return distinct, isolated object references, a future performance optimization could accidentally reintroduce the shared-reference leak.
- **Suggested fix**: Add a short test case demonstrating that mutating the returned `TickFailure` does not mutate subsequent reads (e.g., `const f1 = world.getLastTickFailure(); f1.code = 'corrupted'; const f2 = world.getLastTickFailure(); expect(f2.code).not.toBe('corrupted');`).

# Notes & Open Questions
- **False-positive confirmed:** I verified the iter-1 finding from Gemini regarding `diffListeners` not being wrapped in `try/catch`. It is a false-positive. The code correctly wraps the `this.diffListeners` loop in a `try/catch` block that securely routes exceptions to `finalizeTickFailure()` (`src/world.ts:1461-1478`).
- **Cloning strategy:** The bifurcated cloning strategy introduced in v0.5.4 is well-reasoned. `JSON.parse(JSON.stringify())` over `structuredClone` for `cloneTickDiff` and `EventBus.getEvents` is logically sound given the guarantee of JSON compatibility established by `assertJsonCompatible` upon submission/emission. Keeping `structuredClone` for `cloneTickFailure` correctly preserves `Error` objects and their traces, which `JSON.stringify` would silently flatten.
- **Grid encapsulation:** Implementing `getAt` via `new Set(cell)` handles the read-only boundary well. While it introduces a minor allocation cost per cell read, it is perfectly appropriate for `civ-engine`'s public API boundary since the hot internal queries (`getNeighbors`, `getInRadius`) are unaffected and already correctly yield fresh arrays.
