# Review Summary

Iter-3's five findings (R2_REG1, R2_REG2, L_REG1, L_REG2, L_REG3) all land except L_REG3 — its committed regression test is vacuous and would not catch a regression to double-clone or even to shared-reference. The other four fixes are correctly implemented; the meta-test was independently runtime-verified to classify all 124 `World.prototype` members with no overlaps or phantom entries. No new issues introduced by v0.7.1.

# Iter-3 Regressions

- **R2_REG1 (warnIfPoisoned hole) — closed.** `'warnIfPoisoned'` added to `FORBIDDEN_PRECONDITION_METHODS` at `src/command-transaction.ts:38-40`. Explicit blocked-call test at `tests/command-transaction.test.ts:601-610` pins the proxy rejection. The new meta-test would have caught the original hole.
- **R2_REG2 (getState backstop) — closed.** Filter restored at `src/layer.ts:173-175` with a clean `!this._defaultIsPrimitive && jsonFingerprint(value) === this._defaultFingerprint` guard so primitive T pays no per-cell cost. Comment at `src/layer.ts:163-170` accurately documents the rationale (forEachReadOnly contract violations are recoverable). Safety-net test at `tests/layer.test.ts:381-399` exercises the exact violation path.
- **L_REG1 (api-reference doc) — closed.** `docs/api-reference.md:3454` now describes both `'committed'` and `'aborted'` terminal-reason messages.
- **L_REG2 (denylist meta-test) — closed.** `tests/command-transaction.test.ts:503-563` cross-checks `FORBIDDEN_PRECONDITION_METHODS` against `Object.getOwnPropertyNames(World.prototype)`. Runtime verification: 124 prototype members, all classified, zero `uncovered`, zero items in both lists, zero phantom entries. A new method added without classification will fail the suite. The phantom check also catches dead/typo entries in the array.
- **L_REG3 (single-clone test) — incomplete; see Low below.**

# Critical

None observed.

# High

None observed.

# Medium

None observed.

# Low

### L1. L_REG3 regression test is vacuous — would not catch a clone() regression

**File:** `tests/layer.test.ts:430-445`.

**What's wrong:** The test mutates `copy.defaultValue` (the getter return) and asserts `original.defaultValue.n === 0` and `copy.defaultValue.n === 0`. But `defaultValue` is implemented as `get defaultValue(): T { return cloneIfNeeded(this._defaultValue); }` (`src/layer.ts:61-63`) — every access returns a fresh `structuredClone`. Mutating the getter's return value is therefore unobservable through any subsequent getter call, regardless of how `clone()` is implemented. The test passes equally for:

- The current single-clone (`defaultValue: this._defaultValue` passed to constructor, constructor clones once)
- The pre-L_NEW2 double-clone (`Layer.fromState(this.getState())` — getState clones, constructor clones again)
- A pathological zero-clone where `copy._defaultValue === original._defaultValue` (shared reference)

In all three cases the getter clones on read, so `copyDefault.n = 999` mutates a transient object and the assertions hold. The test exercises the code path but pins no behavior.

**Why it matters:** L_REG3's stated purpose was "future regressions would not fail any test." The committed test does not change that — a regression to shared-reference clone would still pass. The test name and comment claim to guard L_NEW2, providing false confidence in the regression net.

**Recommended fix:** at minimum, add an underlying-storage identity check that bypasses the cloning getter:

```ts
expect((copy as unknown as { _defaultValue: { n: number } })._defaultValue)
  .not.toBe((original as unknown as { _defaultValue: { n: number } })._defaultValue);
```

This pins "constructor cloned independently" and would fail on any zero-clone regression. Distinguishing single-clone from double-clone observably is harder (requires a `structuredClone` spy or a side-effecting clone counter); reasonable to punt on that since L_NEW2 was a perf-only fix and double-clone is observably equivalent. But the current test is strictly weaker than the existing isolation tests above it (`tests/layer.test.ts:407-428` already verify cell-storage independence).

# Polish

None observed.

# Notes & Open Questions

None observed.
