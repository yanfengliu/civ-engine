Review delivered to `docs/reviews/full/2026-04-26/7/REVIEW.md` + `raw/opus.md`. Summary in requested format below.

# Review Summary

After C1 atomicity convergence (iter-6) + v0.7.4 followups (`as any` drop, circular-import break via `world-internal.ts` SystemPhase relocation), engine quiet. 608 tests / typecheck / lint clean. Iter-7 swept subsystems iters 1–6 didn't focus on (entity-manager, component-store, spatial-grid, event-bus, queue, resource-store, pathfinding, BT, noise, cellular, serializer, client-adapter, render-adapter, occupancy-grid, visibility-map, path-service, history-recorder, scenario-runner, world-debugger, map-gen). One Medium doc-drift, one Low semantic-mode edge case. v0.7.4 followups verified — no regressions.

# Critical
None observed.

# High
None observed.

# Medium

**M1.** `docs/api-reference.md:2026,2081` say `(snapshot v4)` but current schema is **v5** (`src/serializer.ts:62-78`, `src/world.ts:907`). Two stale labels in canonical reference doc. Historical changelog/devlog mentions of v4 are intentional per AGENTS.md doc-discipline rule and stay. Fix: replace both with `(snapshot v5)` or `(snapshot v4+)`.

# Low

**L1.** `src/component-store.ts:27-37` semantic-mode `set` doesn't clear `dirtySet` on revert-to-baseline. Pattern `set(A) → clearDirty → set(B) → set(A)` leaves entity in dirty even though final value matches baseline → diff bloat (no incorrect end state). Fix: add `this.dirtySet.delete(entityId); this.removedSet.delete(entityId);` before line-33 early return. Test gap at `tests/component-store.test.ts:175` — only covers `set(A) → clearDirty → set(A)`.

**L2.** `src/world.ts:1011-1022` `deserialize` validates `snapshot.tick` AFTER `world.rebuildSpatialIndex()`. Wasted O(positionEntities) work on bad input. Local `world` unreachable on throw — no external bug. Fix: hoist tick validation block above rebuild.

# Polish / Nitpicks

**P1.** Three files exceed 500-LOC AGENTS rule: `world.ts` (2228), `occupancy-grid.ts` (1602), `world-debugger.ts` (509). Drift-log v0.6.4 already defers. No regression.

# Notes & Open Questions

**N1.** Verified clean: entity-manager (recycle/generation/freeList), spatial-grid (bounds + ceil-radius), event-bus (JSON-clone on read), command-queue, resource-store (arithmetic + dead-transfer cleanup), pathfinding (heap + maxCost), behavior-tree (preempt cleanup), noise/cellular (deterministic), serializer + client-adapter (protocol + listener cleanup), render-adapter (knownRefs lifecycle — parallel agent's hypothesized leak does NOT hold; `collectEntityChanges` includes destroyed entities, `currentRef === null` prune branch fires correctly), occupancy-grid + visibility + path-service + history + scenario + world-debugger (parallel agent reported clean), world-internal (genuinely standalone — only `import type` from world.js).

**N2.** v0.7.4 followups verified — `as any` removal at `command-transaction.ts:299-302` sound (assertJsonCompatible at buffer time guarantees runtime safety), `SYSTEM_PHASES`/`SystemPhase` re-export keeps public path stable.

**N3.** Convergence reached. Two action items remain (M1 doc, L1 dirty-clear), neither blocks production. Natural stopping point for iter-1–7 arc.
Convergence note

After iter-7 only two action items remain — one doc fix (M1), one semantic-mode dirty-clear (L1). Neither blocks production. The C1 chain is closed and the broader engine sweep found no new Critical or High findings. Natural stopping point for the iter-1–7 review arc.
