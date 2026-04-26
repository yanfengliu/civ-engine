# Review Summary

v0.5.6 closes Codex iter-3's specifically-cited Medium cleanly (`public-api-and-invariants.md:42`, `commands-and-events.md:188-200`, and the four-generic surface in `api-reference.md` System / SystemRegistration / LooseSystem / ComponentRegistry / registerValidator / registerHandler / onDestroy / offDestroy all line up exactly with `src/world.ts`). 467 tests pass and `tsc --noEmit` is clean. However, scanning the rest of the canonical guide set surfaces the same v0.5.0-removed semantics still being asserted as current behavior in five other guides — the iter-3 fix scrubbed the three files Codex named but missed the rest of the surface (`systems-and-simulation.md`, `spatial-grid.md`, `concepts.md`, `getting-started.md`, `entities-and-components.md`, `serialization-and-diffs.md:274`, `debugging.md:234`). These are user-facing canonical references (tick-lifecycle ASCII art, "direct mutations are diff-detected", Sync spatial index step) that still encode the pre-v0.5.0 contract, so I cannot sign the chain off as fully converged on docs.

# Sign-off
SIGN-OFF: ISSUES FOUND

# Critical
None.

# High
None.

# Medium

### Multiple canonical guides still describe the removed `syncSpatialIndex` per-tick scan and the in-place-mutation-is-diff-detected contract
- **File**:
  - `docs/guides/systems-and-simulation.md:76` (lifecycle list step 6) and `docs/guides/systems-and-simulation.md:94` (Implications table row "Spatial sync before systems")
  - `docs/guides/spatial-grid.md:44-54` ("Timing within a tick" block describing `syncSpatialIndex()` and "the grid updates at the start of the next tick" after a direct mutation)
  - `docs/guides/concepts.md:67` ("direct mutations are diff-detected") and `docs/guides/concepts.md:122` (tick-lifecycle ASCII art step 4 "Sync spatial index (optional direct-mutation fallback scan)")
  - `docs/guides/getting-started.md:98` ("direct position mutations are picked up by the next tick's spatial sync")
  - `docs/guides/entities-and-components.md:128` ("Mutations are immediate and are detected for diffs")
  - `docs/guides/serialization-and-diffs.md:274` ("In-place mutation detection still works — if a system mutates the object returned from `getComponent`, the change is caught by the end-of-tick scan regardless of mode")
  - `docs/guides/debugging.md:234` ("Check the hottest system for in-place position mutations (`pos.x = ...`); switch to `setPosition()` so the spatial grid is in sync") — wording still implies the mutation is otherwise picked up later
- **Iter-N finding (if applicable)**: Codex iter-3 Medium (residual doc drift) — partially addressed in v0.5.6 (only the three explicitly-cited files were fixed). This expands the same finding to the rest of the canonical guide surface that v0.5.0 broke.
- **Problem**: v0.5.0 removed (a) the per-tick `syncSpatialIndex()` fallback, (b) `WorldConfig.detectInPlacePositionMutations`, (c) `ComponentStoreOptions.detectInPlaceMutations`, (d) `World.markPositionDirty`, and (e) the spatial-mutation phase in `WorldMetrics`/`TickFailurePhase`, but seven canonical user-facing guides still document those behaviors as if they were live. Two of the most-referenced surfaces — the tick-lifecycle ASCII art in `concepts.md:117-129` and the lifecycle list in `systems-and-simulation.md:68-87` — both still include a `Sync spatial index` step. The actual `World.runTick` flow is now: clear-buffers → processCommands → executeSystems → resourceStore.processTick → buildDiff → metrics → notify (`src/world.ts:1386-1456`); there is no per-tick spatial sync phase. Source check: `grep -n "syncSpatial\|spatialSync" src/` returns nothing.
- **Why it matters**: These are canonical operator/developer docs and the most-likely places a human or AI consumer goes to learn the engine's tick contract. Following them produces:
  1. Wrong tick-ordering mental model (consumers think there is a per-tick spatial scan they can rely on).
  2. Wrong write patterns (`concepts.md:67`, `entities-and-components.md:128`, `serialization-and-diffs.md:274` all encourage relying on auto-detection of `getComponent()` mutations, which v0.5.0 removed).
  3. Wrong perf expectations (`getting-started.md:98` tells users their direct position mutations will be picked up next tick; they will not be).
  This is the same class of drift Codex named in iter-3 — the iter-3 fix only scrubbed the three files Codex pointed at, not the rest of the surface.
- **Suggested fix**: Mirror the iter-3 v0.5.6 fix across the remaining canonical guides:
  - In `concepts.md:122` and `systems-and-simulation.md:76`, remove the `Sync spatial index` lifecycle step from the ASCII art / numbered list.
  - In `systems-and-simulation.md:94`, drop or rewrite the "Spatial sync before systems → Systems see up-to-date grid positions" implication row.
  - In `spatial-grid.md:44-54`, replace the `Timing within a tick` block with the explicit-write contract (writes are lock-step, in-place mutations are not auto-detected and never reach the grid).
  - In `concepts.md:67`, `entities-and-components.md:128`, `serialization-and-diffs.md:274`, `getting-started.md:98`, and `debugging.md:234`, replace "direct mutations are diff-detected / picked up by next-tick spatial sync / caught by end-of-tick scan" wording with the post-v0.5.0 explicit-write contract already used in `public-api-and-invariants.md:42`.

# Low / Polish
None.

# Notes & Open Questions

- **Source-side surface verified**: `src/world.ts:29-68` matches the four-generic types now documented in `api-reference.md:107-164`; `src/world.ts:369-382` (onDestroy/offDestroy), `src/world.ts:735-753` (registerValidator), `src/world.ts:779-789` (registerHandler) all use `World<TEventMap, TCommandMap, TComponents, TState>`. The api-ref change is a clean source ↔ doc alignment.
- **`commands-and-events.md:188-200` tick-timing diagram**: confirmed `syncSpatialIndex()` line is removed.
- **`public-api-and-invariants.md:42`**: confirmed corrected to "in-place mutations are **not** picked up by the diff system".
- **Build/test gates**: `npx vitest run` → 467/467 pass; `npx tsc --noEmit` → clean. No source regressions in v0.5.6.
- **Backward-compat doc references are intentionally retained**: `docs/api-reference.md:363`, `docs/guides/serialization-and-diffs.md:76`, `docs/guides/serialization-and-diffs.md:274` (the BC-version paragraph above the wrong sentence) keep mentioning `detectInPlacePositionMutations` / `detectInPlaceMutations` only as "silently ignored on read"; that wording is correct and necessary for snapshot back-compat. The Medium above is specifically about the *behavioral* sentences in those guides that still describe the feature as live, not the BC paragraphs.
- **Devlog/changelog/drift-log mentions of removed fields are appropriate**: history docs intentionally retain the names; not flagged.
