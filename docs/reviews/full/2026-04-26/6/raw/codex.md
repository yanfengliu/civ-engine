# Review Summary
The iter-5 clone-on-read fix landed correctly for the actual live-reference getters on `World`: `getComponent`, `getComponents`, and `getState` are cloned before predicates see them, `undefined` / `null` are passed through safely, and the surrounding read surface I checked already returns primitives or defensive copies (`getResource`, `getEvents`, `getByTag`, `getTags`, `getTransfers`, `getDiff`, `getMetrics`, `getLastTickFailure`). I did not find an unwrapped `World` method that still returns a live engine-owned reference, but I did find one remaining mutation path outside that method-based model: the public `grid` delegate is still exposed by reference. I could not rerun Vitest in this sandbox because `node`/`npm` execution is blocked here, so the review below is from source inspection.

# Iter-5 Regressions
None observed.

# Critical
None observed.

# High
1. `src/command-transaction.ts:114-129`, `src/world.ts:269,309-317`, `tests/command-transaction.test.ts:503-564`: the precondition proxy only protects method calls and method return values; it passes non-function properties through as-is. `World.grid` is a shared public object, not a prototype method, so it is invisible to the current meta-test and a predicate can mutate it in place without any cast, e.g. replace `w.grid.getAt` or `w.grid.getNeighbors`, then return `false`. `commit()` reports `precondition_failed`, but `world.grid` stays patched afterward, so the world is still observably changed after a failed precondition.

# Medium
None observed.

# Low
None observed.

# Polish
None observed.

# Notes & Open Questions
No open questions.
