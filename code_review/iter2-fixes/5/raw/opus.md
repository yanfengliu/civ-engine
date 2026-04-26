# Review Summary

v0.5.7 closes 6 of the 7 canonical-guide drift items I flagged in iter-4. The lifecycle ASCII art in `concepts.md`, the timing block in `spatial-grid.md`, the numbered list + implications in `systems-and-simulation.md`, the spatial-grid blurb in `getting-started.md`, the `getComponent` line in `entities-and-components.md`, the position-mutation tip in `debugging.md`, and the in-place mutation paragraph in `serialization-and-diffs.md:275` are all now post-v0.5.0 contract. Source-side surface (`src/world.ts:909-911` accepts versions 1..5 and writes v5 at line 882) confirms the fixes match runtime. **One residual issue blocks sign-off**: `serialization-and-diffs.md:74` still says `World.deserialize()` "still accepts versions 1–4," which contradicts both the source (`1..5`) and the very next paragraph of the same guide (lines 116, 120 correctly say 1–5 / v5 current write format). This is internally inconsistent canonical-guide prose and is the same class of drift this iteration was intended to close.

# Sign-off
SIGN-OFF: ISSUES FOUND

# Critical
None.

# High
None.

# Medium

### Serialization guide contradicts itself on supported deserialize version range
- **File**: `docs/guides/serialization-and-diffs.md:74`
- **Iter-N finding (if applicable)**: New residual drift introduced by the partial v0.5.7 fix (the version range was bumped at lines 116/120 but the paragraph above the `WorldSnapshot` interface was left at `1–4`). Same class as the iter-4 Medium I filed and Codex iter-4 also flagged.
- **Problem**: Line 74 says: `World.deserialize() still accepts versions 1–4. Older snapshots without componentOptions deserialize each component store with default options (strict mode).` But the validation block immediately below (line 116) correctly says `Throws if version is not 1, 2, 3, 4, or 5`, and line 120 correctly states `Version 5 (the current write format) round-trips per-component ComponentStoreOptions.diffMode plus WorldConfig.maxTicksPerFrame and WorldConfig.instrumentationProfile when non-default`. Source check: `src/world.ts:882` writes `version: 5` and `src/world.ts:910` validates `version < 1 || version > 5`. The line-74 text was overlooked when the rest of the file was updated in v0.5.7.
- **Why it matters**: This is the canonical save/load guide. A reader landing on the `WorldSnapshot` interface section will see `1–4` as the accepted range, and only readers who scroll past the `Loading State` and `Re-registration checklist` sections to hit `Validation` (line 112) will discover the 1–5 range. Two contradictory ranges in the same canonical guide is exactly the kind of drift the iter-4/iter-5 sweep was supposed to eliminate.
- **Suggested fix**: Update `docs/guides/serialization-and-diffs.md:74` from "still accepts versions 1–4" to "still accepts versions 1–5" (or "versions 1 through 5"); this aligns line 74 with line 116 and the actual `World.deserialize()` implementation.

# Low / Polish
None.

# Notes & Open Questions

- **Iter-4 surface verification (the 7 files I flagged)**:
  - `concepts.md:67` — corrected to "In-place mutations are NOT diff-detected" with explicit-write contract. Clean.
  - `concepts.md:117-128` — tick-lifecycle ASCII art no longer contains a `Sync spatial index` step; current 9 steps match `World.runTick` flow in `src/world.ts`. Clean.
  - `concepts.md:133` — implication rewritten to "The spatial grid is always in sync with explicit position writes." Clean.
  - `spatial-grid.md:18` — Overview rewritten to lock-step write-time sync. Clean.
  - `spatial-grid.md:20` — `getAt()` returns a fresh `Set` documented; verified `world.grid` is a runtime-immutable read-only delegate. Clean.
  - `spatial-grid.md:44-50` — `Timing within a tick` block rewritten; no more `syncSpatialIndex()` reference. Clean.
  - `systems-and-simulation.md:68-86` — tick-lifecycle numbered list no longer has a `syncSpatialIndex()` step; matches `runTick` source. Clean.
  - `systems-and-simulation.md:88` — replacement implication ("There is no separate per-tick sync phase") is correct. Clean.
  - `systems-and-simulation.md:95` — implications row is now "Grid is updated at every position write." Clean.
  - `getting-started.md:98` — corrected to "in sync at write time"; explicit-write contract present. Clean.
  - `entities-and-components.md:128` — corrected to "In-place mutations are NOT detected by the diff system." Clean.
  - `serialization-and-diffs.md:275` — corrected to "As of v0.5.0, in-place mutation of `getComponent`-returned objects is **not** detected in either mode." Clean.
  - `debugging.md:234` — softened to "these silently desynchronize the spatial grid; replace them with `setPosition()`." Clean.

- **Sweep verification**: ran the prompt's grep set against `docs/guides/`; all remaining hits are corrected wordings ("NOT diff-detected" / "not auto-detected") plus the intentional pre-0.5.0 backward-compat note at `serialization-and-diffs.md:76`. No further drift in canonical guides.

- **Source ↔ doc alignment**: `src/world.ts:909-911` accepts versions `1..5`; `src/world.ts:882` writes `version: 5`. The `serialization-and-diffs.md:116` and `serialization-and-diffs.md:120` lines are correct; only line 74 lags.

- **Out-of-scope but not flagged**:
  - `docs/superpowers/specs/*.md` and `docs/superpowers/plans/*.md` retain old `syncSpatialIndex()` mentions. These are historical design specs and plans, not canonical user-facing guides; they are correctly out of scope for the canonical-guide sweep.
  - `docs/guides/serialization-and-diffs.md:76` — intentional backward-compat note about silently-ignored pre-0.5.0 fields. Correct as-is.

- **Build/test gates**: Per the v0.5.7 commit message, 467 tests pass and the iteration is doc-only; no source regression risk introduced by this commit.

- **Verdict**: One canonical-guide line still asserts an outdated version range that contradicts the rest of the same file and the source. A single-line fix at `serialization-and-diffs.md:74` (1–4 → 1–5) closes convergence.
