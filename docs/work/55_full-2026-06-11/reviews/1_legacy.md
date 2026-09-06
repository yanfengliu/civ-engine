# Pre-1.0 full-codebase review — iteration 2 (correctness lens + confirmation; review CLOSED)

**Lens completion:** the correctness lens ran on the Claude CLI after its window reset (single instance; the iteration-1 parallel pair had exhausted the session). Method per its report: prior-review records read first; deep-read of every focus file + dependents; engine-wide determinism sweep; suite re-run locally (1181+2 at the time); findings repro-confirmed against dist, not asserted from reading.

## Findings and dispositions (all fixed in v0.8.25; confirmation pass CONVERGED)

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| F1 | MEDIUM | `applySnapshot` re-attached preserved component stores BY LIVE REFERENCE, so a store absent from the snapshot kept old-timeline data — wrong data on recycled ids, ghost dead-entity rows breaking the serialize round-trip (repro-confirmed both ways) | FIXED — preserved registrations get fresh empty `ComponentStore`s with preserved options; cross-registration in-place apply + round-trip pinned by test. Confirmation verified store/options/bits/signature consistency and that factory replay paths were never affected |
| F2 | LOW | Details sanitizer never un-marked visited objects: shared non-cyclic references (DAGs) mangled to `'[Circular]'`, inconsistent with `assertJsonCompatible` | FIXED — `seen.delete` after visit (cycle-only detection); DAG + cycle both pinned |
| F3 | LOW | PlayerObserver accepted dimension-mismatched visibility maps, failing ticks later with a misattributed raw bounds error; `snapshot()` primed from poisoned torn state | FIXED — construction asserts dimensions (`player_observer_grid_mismatch`, four-value details); `snapshot()` gains the same poison guard as `observeTick()`. Confirmation checked the design blesses no mismatched-map use. Non-blocking future polish noted: re-assert dims in `reset()` for the exotic grid-resizing-applySnapshot case |
| F4 | LOW | `buildObserved` rebuilt the registration manifest per entity (O(N×registrations) allocation per snapshot/reveal); `filterEvents` re-cloned already-cloned event data | FIXED — one manifest per call (freshness verified: the only mid-call user code runs after the last manifest consumer); redundant clone dropped (emit + getEvents both clone; validation preserved at emit) |
| F5 | LOW | `getErrorCode(WorldTickFailureError)` returns null undocumented — the most commonly caught engine throw | DOCUMENTED as the deliberate exception (JSDoc + api-reference): the wrapper's `failure.code` classifies the tick failure and `failure.error.code` the underlying error; collapsing either would conflate the two levels. Lead call per the two-level contract the docs already teach |

## Verified clean (correctness lens, explicit)

Error families + sanitization pipeline (beyond F2), session-registration comparison semantics and the single `_constructReplayWorld` path, PlayerObserver core semantics (generation identity, honest attribution, lifecycle, clone discipline, deterministic ordering), findNearest ring-scan invariants, the occupancy stack's invariants and round-trips, both benchmark scripts' gate logic, and an engine-wide determinism sweep (no Math.random, no wall-clock into state, no for-in, comparator-less sorts string-only, stable system ordering, per-listener diff clones).

## Review verdict

**CONVERGED at iteration 2.** Across both iterations: four lenses + confirmation, one MEDIUM + six LOWs total, all fixed or explicitly carried (item 8 to the owner; VisibilityMap metrics parity, offDestroy Set, session-recorder headroom, reset() dim re-assert → roadmap small-items). The arch lens's freeze verdict stands: **the surface is ready for 1.0** once the gated checklist work lands.
