# Review Summary

Most of the `eaac9b5` follow-up looks solid on inspection: H_NEW1, H_NEW2, M_NEW1, M_NEW2, L_NEW1, L_NEW2, L_NEW4, L_NEW5, and L_NEW7 all line up with the current code and the added tests. I found one remaining R1 hole: `World.warnIfPoisoned()` is public, stateful, and still callable from transaction preconditions, so the new denylist is not actually exhaustive against the public mutating surface. I also found one L_NEW3 regression: `Layer.getState()` now assumes only writer methods can create default-equal stored entries, but `forEachReadOnly()` still exposes live object references, so that invariant can be violated through a public API. The new “property-based” denylist test exercises the current array, but it still does not prove exhaustiveness against the actual `World` surface, which is how the `warnIfPoisoned()` hole slipped through.

# Iter-2 Regressions

### `warnIfPoisoned()` is still callable from preconditions
- **Iter-2 ID**: `R1`
- **File**: `src/command-transaction.ts:11-39`, `src/world.ts:653-659`, `docs/api-reference.md:3437-3441`, `docs/changelog.md:18-22`
- **Problem**: `FORBIDDEN_PRECONDITION_METHODS` still omits `World.warnIfPoisoned(api)`, even though `warnIfPoisoned()` is a public, stateful method: on a poisoned world it flips `poisonedWarningEmitted` and emits `console.warn`. Because `ReadOnlyTransactionWorld` is derived from that array, predicates can currently call `w.warnIfPoisoned('x')` both at the type level and at runtime. That makes the “exhaustive against `World`’s public mutating ... surface” claim in both the changelog and API reference false.
- **Why it matters**: A failed precondition can still produce observable side effects and consume the once-per-poison-cycle warning, suppressing the next legitimate warning from the real write surface.
- **Suggested fix**: Add `'warnIfPoisoned'` to `FORBIDDEN_PRECONDITION_METHODS`, then add an explicit poisoned-world regression test that proves a predicate cannot consume the warning flag.

### `getState()` no longer preserves canonical sparsity after `forEachReadOnly()` mutations
- **Iter-2 ID**: `L_NEW3`
- **File**: `src/layer.ts:154-176`, `tests/layer.test.ts:661-673`
- **Problem**: The L_NEW3 fix removed `getState()`’s default-equality filter on the assumption that only strip-at-write paths can populate `cells`. That assumption is no longer true for object layers: `forEachReadOnly()` intentionally returns live stored references, and the test suite explicitly pins that behavior. A caller can mutate a live stored object to equal `defaultValue`, and `getState()` will now serialize that default-equal entry instead of stripping it.
- **Why it matters**: The documented “strip-at-write sparse” guarantee becomes false for a public API path, so in-memory state and serialized state can diverge again without any private-field escape.
- **Suggested fix**: Restore a post-hoc default-equality filter in `getState()` for object-valued layers, or harden `forEachReadOnly()` so it cannot mutate canonical storage invariants.

# Critical

None observed.

# High

None observed.

# Medium

None observed.

# Low / Polish

### The denylist test is not exhaustive against `World`’s actual public surface
- **File**: `tests/command-transaction.test.ts:473-499`
- **Problem**: The new R1 regression test only iterates `FORBIDDEN_PRECONDITION_METHODS`; it never cross-checks that array against `World`’s real public methods. As a result, omissions like `warnIfPoisoned()` still leave the suite green. The test proves “every listed name is blocked,” not “every public mutator is listed.”
- **Why it matters**: Future denylist holes can ship even while the headline regression test continues to pass.
- **Suggested fix**: Add a second meta-test that compares `FORBIDDEN_PRECONDITION_METHODS` against `Object.getOwnPropertyNames(World.prototype)` (with a curated read-only allowlist), or at minimum add explicit assertions for every public mutator that must stay blocked, including `warnIfPoisoned()`.

# Notes & Open Questions

None.
