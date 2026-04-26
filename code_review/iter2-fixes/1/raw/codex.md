# Review Summary
The chain is close, and most of the claimed runtime fixes do land: batch 1 closes `R2`/`C_NEW1`, batch 3’s listener isolation does stop the poison-contract escape hatch, and batch 4’s generic threading looks correct from source plus a clean `npx tsc --noEmit`. It does not close iter-2 cleanly, though, because batch 2 only partially hardens the read-only spatial surface, and batch 5 introduces a new aliasing bug in `getLastTickFailure()`. The biggest remaining runtime risk is that AI-agent consumers can still corrupt spatial state through `getAt()` despite the 0.5.0 hardening claim. The secondary risk is doc drift: the architecture and API reference still describe several removed 0.5.x behaviors.

# Sign-off
SIGN-OFF: ISSUES FOUND

# Critical
None.

# High
### Read-only grid hardening is still bypassable via `getAt()`
- **File**: `src/world.ts:285-290`; `src/spatial-grid.ts:88-89`; `tests/world.test.ts:774-792`
- **Iter-2 finding (if applicable)**: R3
- **Problem**: Batch 2 removed `insert`/`remove`/`move` from `world.grid`, but the delegate still forwards `getAt()` to `SpatialGrid.getAt()`, which returns the live backing `Set`. In JavaScript, `world.grid.getAt(x, y)?.clear()` / `.add(...)` / `.delete(...)` still mutates the engine’s spatial index directly. The new test only checks that the top-level mutator methods are absent, so this hole is not covered.
- **Why it matters**: A consumer can silently desynchronize spatial queries from position components through a surface the release now presents as runtime read-only.
- **Suggested fix**: Make the public `getAt()` return an immutable view or a cloned `Set`, and keep any live-cell accessor private to engine internals. Add a regression that mutating the returned cell view does not change subsequent grid queries.

# High
None.

# Medium
### `getLastTickFailure()` now aliases prior callers
- **File**: `src/world.ts:1007-1012`
- **Iter-2 finding (if applicable)**: M_NEW5
- **Problem**: The O(1) cache stores one cloned `TickFailure` and returns the same object on every call. If any caller mutates the returned failure or nested `details`/`error`, later callers receive the tampered version even though the underlying engine failure did not change. Before batch 5, each call got a fresh clone.
- **Why it matters**: Diagnostic consumers can contaminate each other, which is risky for history/debug tooling and AI recovery flows that treat `getLastTickFailure()` as a read-only snapshot.
- **Suggested fix**: Cache an immutable deep-frozen failure object and return it directly, or keep the cache internal and `structuredClone` the cached template per call if per-read isolation is more important than the O(1) claim.

### Core docs still describe removed phases, metrics, and submit semantics
- **File**: `docs/architecture/ARCHITECTURE.md:51,60-61,85,88-89`; `docs/api-reference.md:89,268-274,331,1584,2204-2206,2218,2251`
- **Iter-2 finding (if applicable)**: N/A
- **Problem**: The key AI-facing docs still describe `syncSpatialIndex()` and the `spatialSync` failure phase, spatial scan metrics, v5 round-tripping of `detectInPlaceMutations`, the old minimal/release `submit()` fast path, and the pre-batch-4 `World.deserialize<TEventMap, TCommandMap>` signature. Those statements no longer match `src/world.ts`.
- **Why it matters**: Agents reading the docs will program against removed behavior or the wrong cost model, which undermines the 0.5.x contract cleanup.
- **Suggested fix**: Reconcile the architecture and API reference with the actual 0.5.0-0.5.3 runtime, especially the tick pipeline ordering, spatial contract, metrics surface, submit behavior, snapshot/version notes, and deserialize generics.

# Low / Polish
None.

# Notes & Open Questions
- `npx tsc --noEmit` passed on this branch.
- Targeted `vitest` invocations were blocked by shell policy in this environment, so runtime validation here is source review plus typecheck rather than local test execution.
- Aside from the findings above, the claimed fixes for `findNearest`, snapshot isolation, event payload validation, listener exception isolation, and typed callback threading all matched the current code on inspection.

