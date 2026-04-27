Verified iter-5 fix. Auditing complete. Writing review.

# Review Summary

The iter-5 Critical fix landed correctly: the precondition proxy wraps the live-ref read methods with `structuredClone`, the three regression tests pin the documented failure modes (component, state, resource), and 607 tests pass on `d58a2f6`. The audit of `World`'s read surface found no live-reference returns that escape the wrap. Convergence achieved.

# Iter-5 Regressions

None observed.

# Critical

None observed.

# High

None observed.

# Medium

None observed.

# Low

None observed.

# Polish

None observed.

# Notes & Open Questions

### `getResources` and `getPosition` are in `READ_METHODS_RETURNING_REFS` but do not exist on `World`

`src/command-transaction.ts:87-97` lists nine method names. Grepping `src/` for `getResources` and `getPosition` finds no implementations — the only references are the entries in this set. The proxy `get` trap only fires when a name is actually accessed, so dead entries are runtime-harmless, but the iter-5 changelog (`docs/changelog.md:9`) and `REVIEW.md:39` both enumerate these as part of "the curated set of read methods that hand back live engine references," which overstates exhaustiveness. Best guess: `getResources` was meant as a future-proof guard for a yet-to-exist iterator, and `getPosition` was conflated with the position-component pattern (positions are accessed via `getComponent(e, positionKey)`, not a dedicated method). Open question for the author: drop the two ghost entries (and their mention in the changelog) or leave them as forward-compatible guards? Either is defensible; the misleading documentation is the only real cost.

### Read-method audit summary (for the record)

Cross-checked every public `get*` / `find*` / `query*` / `is*` / `has*` method on `World` against the wrap set:

- Wrapped + actually returns live ref: `getComponent`, `getComponents`, `getState`. ✓
- Wrapped + already self-clones (double-clone, harmless): `getByTag`, `getTags` (`new Set(...)`), `getResource` (fresh `{current, max}`), `getEvents` (`deepCloneJson` per event in `event-bus.ts:58-61`). ✓
- Wrapped but method does not exist: `getResources`, `getPosition` (see above).
- Not wrapped, but already self-clone or return primitives: `getDiff` (`cloneTickDiff`), `getMetrics` (`cloneMetrics`), `getLastTickFailure` (`cloneTickFailure`), `getTransfers` (`.filter(...).map(t => ({...t}))`), `getEntityRef` (fresh `{id, generation}`). ✓
- Not wrapped, returns primitive only: `isAlive`, `isCurrent`, `isPoisoned`, `isCurrent`, `getEntityGeneration`, `getSpeed`, `hasCommandHandler`, `hasState`, `hasTag`, `getProduction`, `getConsumption`, `getMeta`, `getByMeta`, `findNearest`, `getInstrumentationProfile` (returns `'full' | 'minimal' | 'release'` string). ✓
- Not wrapped, generators yielding primitives: `getAliveEntities`, `getResourceEntities`, `query`. ✓

No live-reference read method escapes the cloning discipline.
