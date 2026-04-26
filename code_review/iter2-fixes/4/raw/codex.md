# Review Summary
The exact v0.5.6 target is closed: `docs/guides/public-api-and-invariants.md`, `docs/guides/commands-and-events.md`, and the `docs/api-reference.md` `System`/callback signatures now match the current source surface in `src/world.ts`. I also spot-checked the runtime/tests behind that contract, and the explicit-write-only diff/grid behavior is consistent in `src/component-store.ts`, `src/world.ts`, and the updated tests. The remaining problem is residual doc drift in other canonical guides that were also touched in this chain. Because those guides still describe removed spatial-sync and in-place-mutation behavior, I can’t sign this off CLEAN yet.

# Sign-off
SIGN-OFF: ISSUES FOUND

# Critical
None.

# High
None.

# Medium
### Canonical serialization guide still documents removed snapshot/version and mutation-detection behavior
- **File**: `docs/guides/serialization-and-diffs.md:98`, `docs/guides/serialization-and-diffs.md:162`
- **Iter-N finding (if applicable)**: New residual drift found in iter-4 spot-check
- **Problem**: The guide still says `World.deserialize()` throws if `version` is not `1`, `2`, or `3`, even though the current write/read format is v5 and `src/world.ts` accepts `1..5`. It also still says semantic mode catches in-place mutations via an end-of-tick scan, but `ComponentStore.getDirty()` no longer does any in-place scan and only reports explicit dirty-set writes.
- **Why it matters**: This is a canonical user-facing guide for save/load and diffs. Following it gives readers the wrong compatibility contract and the wrong dirty-tracking model.
- **Suggested fix**: Update the validation/version prose to match snapshot v5 and current backward-compat behavior, and remove the in-place-mutation-detection claim so it aligns with `src/component-store.ts` and the explicit-write-only tests.

### Canonical spatial/system lifecycle guides still describe the removed `syncSpatialIndex()` pass and next-tick auto-sync
- **File**: `docs/guides/spatial-grid.md:18`, `docs/guides/spatial-grid.md:45`, `docs/guides/systems-and-simulation.md:69`, `docs/guides/systems-and-simulation.md:89`
- **Iter-N finding (if applicable)**: New residual drift found in iter-4 spot-check
- **Problem**: `spatial-grid.md` still says direct position mutation is acceptable when next-tick sync is okay, and its timing section still shows `syncSpatialIndex()` plus “grid updates at the start of the next tick.” `systems-and-simulation.md` still lists `syncSpatialIndex()` in the tick lifecycle and says “Spatial sync before systems.” That no longer matches `src/world.ts`, where the per-tick scan is gone and only explicit `setPosition`/`setComponent` writes update the grid.
- **Why it matters**: These guides describe core engine timing and movement semantics. They currently instruct users toward behavior the engine no longer implements.
- **Suggested fix**: Rewrite those sections to match the v0.5.0 contract: no per-tick spatial sync phase, in-place position mutation does not update the grid, and only explicit position writes keep component state and grid state in sync.

# Low / Polish
None.

# Notes & Open Questions
The specific Codex iter-3 complaint is resolved cleanly: the three named v0.5.6 doc targets now match the source. The hold is broader convergence: other touched guides still contradict the same v0.5.0 runtime contract, so the doc set is not internally consistent yet.