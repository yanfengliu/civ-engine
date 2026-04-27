Review at `docs/reviews/full/2026-04-26/3/REVIEW.md`.

# Review Summary
v0.7.0 iter-2 fix-up solid. All 11 iter-2 findings (R1, H_NEW1/2, M_NEW1/2, L_NEW1/2/3/4/5/7) verified correct + complete + no new bugs. `FORBIDDEN_PRECONDITION_METHODS` cross-checked against full `World` public surface (`src/world.ts:333-1233`): 51 entries, all real, no holes in mutating/lifecycle/listener/RNG categories. Property-based test correctly pins runtime enforcement. `cloneIfNeeded` per-value applied at every boundary. Single-validate writers correctly handle primitive-default + object-value edge case. `getState` strip-at-write trust is sound by induction over all `cells.set` writers.

# Iter-2 Regressions
None observed.

# Critical / High / Medium
None observed.

# Low / Polish
1 finding: `docs/api-reference.md:3454` still says `commit()` after `commit()` throws "already committed" — incomplete post-L_NEW1 (can also throw "already aborted").

# Notes (6)
- N1: `warnIfPoisoned` is public, mutates state, not in denylist — inconsistent with `serialize` being denied
- N2: type-level `Omit` doesn't enforce array entries are real `World` keys (typos no-op at compile time)
- N3: property-based test verifies "what's in the list throws" but not "every public mutator is in the list" — the iter-1 R1 failure mode in miniature
- N4: dead `if (typeof fn !== 'function')` branch in property-based test (proxy throws before reach)
- N5: `matchesDefault` comment slightly misleading (says "per-value primitive check" but uses cached `_defaultIsPrimitive`)
- N6: L_NEW2 has no explicit single-clone regression test
