# Review Summary
The iter-4 test-only fix is good: the rewritten L_NEW2 regression now actually pins independent `_defaultValue` storage instead of mutating a clone-on-read getter. But this chain is not at final convergence yet, because `CommandTransaction` still has a critical atomicity hole through allowed read methods.

# Iter-4 Regressions
None observed. The new L_NEW2 test reaches past the clone-on-read `defaultValue` getter ([src/layer.ts](/abs/path/src/layer.ts:60), [src/layer.ts](/abs/path/src/layer.ts:246)) and compares the underlying `_defaultValue` refs directly ([tests/layer.test.ts](/abs/path/tests/layer.test.ts:428)), so it would fail on the shared-reference / zero-clone regression that the vacuous test missed.

# Critical
- `CommandTransaction`'s “read-only” precondition world is still writable via live references returned by allowed read APIs. The proxy only blocks forbidden method calls and direct property writes on `World` itself ([src/command-transaction.ts](/abs/path/src/command-transaction.ts:77)). But `World.getComponent()` / `getComponents()` hand back live `ComponentStore` objects ([src/world.ts](/abs/path/src/world.ts:451), [src/component-store.ts](/abs/path/src/component-store.ts:50)), and `World.getState()` returns the stored value by reference ([src/world.ts](/abs/path/src/world.ts:1149)). A precondition can therefore do `w.getComponent(... )!.hp = 0` or mutate an object from `w.getState(...)`, then return `false`; `commit()` reports `precondition_failed`, but the world is already mutated. Because those writes bypass `setComponent` / `setState`, they also bypass dirty tracking. This reopens the same “world untouched on precondition failure” bug class that C1/R1 were supposed to close, without calling any forbidden method.

# High
None observed.

# Medium
None observed.

# Low
None observed.

# Polish
None observed.

# Notes & Open Questions
- The bug is specifically about transaction preconditions, but the fix direction is a design choice: either harden the transaction façade so `getComponent` / `getComponents` / `getState` return defensive copies there, or change `World` read semantics more broadly. The documented transaction contract already requires the former behavior at minimum.
