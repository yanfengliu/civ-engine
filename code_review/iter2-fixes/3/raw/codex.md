# Review Summary
The chain is materially cleaner after v0.5.5, and the specific iter-2 gaps it set out to close mostly do look closed: the `cloneTickFailure` rationale is corrected in code, the missing `world.grid.getAt()` and `getLastTickFailure()` regression tests are present, and the explicitly called-out `ARCHITECTURE.md` / `debugging.md` sections were scrubbed. I did not find a new runtime regression introduced by v0.5.5. The remaining problem is documentation consistency: several canonical docs still describe removed or changed public behavior/type surfaces, so the review chain has not fully converged on docs yet. Because that drift is still user-facing and behavioral in places, I cannot sign off the chain as fully clean.

# Sign-off
SIGN-OFF: ISSUES FOUND

# Critical
None.

# High
None.

# Medium
### Canonical docs still describe removed mutation/sync behavior and outdated generic signatures
- **File**: `docs/guides/public-api-and-invariants.md:40-49`, `docs/guides/commands-and-events.md:185-200`, `docs/api-reference.md:97-125`, `docs/api-reference.md:145-152`
- **Iter-2 / iter-1 review finding (if applicable)**: Codex iter-2 Medium (doc drift cleanup); this also includes newly missed doc drift
- **Problem**: `docs/guides/public-api-and-invariants.md` still tells consumers that direct `getComponent()` mutations are diff-detected, but the runtime no longer does that: `ComponentStore.getDirty()` now reports only explicit dirty-set writes (`src/component-store.ts:89-104`), and the contract is locked in by `tests/diff.test.ts:135-146`. `docs/guides/commands-and-events.md` still shows a `syncSpatialIndex()` phase in tick timing even though the per-tick spatial-sync pass was removed from `World.step()` in v0.5.0 (`src/world.ts:1394-1415`). `docs/api-reference.md` still publishes the pre-v0.5.2 `System` / `SystemRegistration` / `LooseSystem` signatures and pre-`TState` `ComponentRegistry` wording, while the source now uses four-generic callback surfaces (`src/world.ts:29-63`).
- **Why it matters**: These are canonical operator/developer docs; following them leads to wrong write patterns, wrong mental models of tick order, and stale TypeScript signatures.
- **Suggested fix**: Update those sections to match the explicit-write-only diff contract, the removed per-tick spatial-sync phase, and the four-generic callback/type surface.

# Low / Polish
None.

# Notes & Open Questions
- `docs/architecture/ARCHITECTURE.md:77-88` is now clean for the specific Opus/Codex iter-2 boundaries lines that were called out.
- `docs/guides/debugging.md:188-276` no longer references `spatialSync`, `spatial_sync_threw`, or `spatial-full-scan`, and its metrics example now matches the current `WorldMetrics` shape.
- `src/world.ts:2216-2225` now has the corrected unified JSON-clone rationale for `cloneTickFailure()` and `cloneTickDiff()`.
- `tests/world.test.ts:773-811` and `tests/world-commands.test.ts:604-619` add the two direct regression tests that iter-2 asked for.
- The sandbox allowed file reads but blocked my usual repo-wide grep and test execution commands, so this sign-off is source-inspection-based rather than a fresh local rerun.