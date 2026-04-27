Iter-8 convergence check: clean.

**Summary:**
- All 7 iter-7 fixes verified at source. H1 closure covers all entity-keyed snapshot paths; tags/metadata use parallel inline check (pre-existing). M1 emit clones for buffer + per-listener; getEvents read-clone still needed for caller-vs-buffer isolation. M2 `safeSend` boolean wired only at line 254 — audited 8 other call sites, no analogous bug pattern. L1 octaves/persistence/lacunarity validation complete (edge cases checked: MAX_SAFE_INTEGER, denormal, NaN, ±Infinity). L2 revert-to-baseline clears dirty/removed; clearDirty re-baseline still works. L3 tick validation hoisted before any O(N) loader.
- No regressions: backward-compat snapshot v1–v4 unaffected, EventBus timing/ordering unchanged, no production callers of `octaveNoise2D` use adversarial inputs.
- No new findings outside iter-7 scope.
- One Note (N3): analogous gap to L2 in the `wasPresent=false` strict-path (remove → set-to-baseline still emits redundant dirty entry). Pre-existing, not iter-7 regression. Flagged for record only.

**Recommend stopping the loop.** Per AGENTS.md "continue iterating until reviewers nitpick instead of catching real bugs" — iter-8 has zero real findings.

Review at `docs/reviews/full/2026-04-26/8/REVIEW.md`.
