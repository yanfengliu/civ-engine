# Review Summary
Source review of `src/component-store.ts`, `tests/component-store.test.ts`, and the iter-7/8 review artifacts shows `2942f0d` landed the N3 fix where expected, and I do not see a correctness regression from it. I did not rerun the 630-test/typecheck/lint/build gates in this sandbox, so this is a code-and-tests convergence check rather than a fresh gate run.

# N3 Fix Verification
Verified. `src/component-store.ts:27-41` keeps the iter-7 L2 path semantic-only for `wasPresent === true`, and the new N3 logic at `src/component-store.ts:50-63` is also explicitly gated on `this.diffMode === 'semantic'`; strict mode still falls through to unconditional dirty-marking at `src/component-store.ts:64-65`, so there is no strict-mode behavior change and no strict-mode fingerprint cost.

The remove-then-reinsert-to-baseline case is now handled correctly: `remove()` preserves the cached baseline until the next `clearDirty()`, and the new compare at `src/component-store.ts:56-60` clears both `dirtySet` and `removedSet` when the reinserted value matches that baseline. `tests/component-store.test.ts:199-210` pins that exact path. First-ever inserts still mark dirty because `clearDirty()` rebuilds `baseline` only from live `entries()` (`src/component-store.ts:119-126`), so an entity absent at the last baseline has no cached entry to match; `tests/component-store.test.ts:225-229` covers that.

The L2 and N3 branches now honor the same contract: baseline match still writes the value and bumps generation, but leaves no diff entry (`src/component-store.ts:32-37` and `58-61`). The added fingerprint cost is real on semantic `wasPresent === false` sets, including inserts with no baseline, and on that path it also re-runs JSON validation via `jsonFingerprint()` after the earlier `assertJsonCompatible()` at `src/component-store.ts:44,56`. That cost is fully gated out of strict mode and is consistent with the documented semantic-mode model that writes are fingerprinted in `set()` (`docs/api-reference.md:1231-1237`, `docs/changelog.md:477`). I do not see evidence here that it introduces a correctness bug or a convergence-blocking regression.

# Critical
None observed.

# High
None observed.

# Medium
None observed.

# Low
None observed.

# Notes & Open Questions
None observed.
