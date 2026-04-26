You are a senior code reviewer for the civ-engine project.

This is **review iteration 5**. The fix chain is now 9 commits (`main..HEAD`), spanning v0.4.1 → v0.5.7. Four prior iterations have run.

The diff to review is `main..HEAD` filtered to code paths. It is in `raw/diff.patch` of this directory; you may also access the working tree directly.

Iteration 1: `code_review/iter2-fixes/1/raw/{codex,gemini,opus}.md`
Iteration 2: `code_review/iter2-fixes/2/raw/{codex,gemini,opus}.md`
Iteration 3: `code_review/iter2-fixes/3/raw/{codex,gemini,opus}.md`
Iteration 4: `code_review/iter2-fixes/4/raw/{codex,gemini,opus}.md`

Iteration 4 result: **Gemini CLEAN, Codex/Opus ISSUES FOUND** — both flagged residual canonical-guide drift across 7 files (concepts, spatial-grid, systems-and-simulation, getting-started, entities-and-components, serialization-and-diffs, debugging) where v0.5.0-removed semantics (per-tick `syncSpatialIndex()`, in-place mutation auto-detection, deserialize version range stuck at 1-3) were still being asserted as live behavior.

**v0.5.7 specifically addressed:**
- `concepts.md` — corrected the in-place-mutation line, removed the `Sync spatial index` step from tick-lifecycle ASCII art, rewrote "Spatial grid syncs before systems" implication
- `spatial-grid.md` — Overview + Timing within a tick block rewritten to describe lock-step write-time sync + runtime-immutable read-only delegate (`getAt` returns a fresh `Set`)
- `systems-and-simulation.md` — removed `syncSpatialIndex()` from the tick-lifecycle numbered list, replaced "Spatial sync before systems" implication
- `getting-started.md:98` — corrected the spatial-grid blurb
- `entities-and-components.md:128` — corrected the "Mutations are immediate and are detected for diffs" line
- `serialization-and-diffs.md:274` — corrected the "In-place mutation detection still works" line; updated deserialize version range to 1..5; added `references dead entity` throw to the list
- `debugging.md:234` — softened the position-mutation tip

The author also did a final sweep with `grep -rnE "syncSpatial|spatialSync|spatial_sync_threw|spatial-full-scan|next.tick.*spatial|next-tick.*spatial|in-place.*detect|diff-detected|markPositionDirty|end-of-tick.scan"` across `docs/guides/`, `docs/api-reference.md`, and `docs/architecture/ARCHITECTURE.md`; the only remaining matches are the corrected wordings ("NOT diff-detected" / "not auto-detected") and one intentional backward-compat note in `serialization-and-diffs.md:76`.

---

## What to look for

This is the fifth pass. **The goal is convergence.** Verify that the v0.5.7 doc cleanup is exhaustive. Sign off CLEAN if there are no real issues. Don't fish.

## Output format

```
# Review Summary
<3-5 sentences>

# Sign-off
SIGN-OFF: CLEAN
or
SIGN-OFF: ISSUES FOUND

# Critical
# High
# Medium
# Low / Polish
# Notes & Open Questions
```

Each finding under Critical/High/Medium/Low MUST follow:
```
### <short title>
- **File**: `path:line`
- **Iter-N finding (if applicable)**: <ID>
- **Problem**: <what>
- **Why it matters**: <impact>
- **Suggested fix**: <how>
```

## Rules

- Be specific. Cite file:line.
- **Sign off CLEAN if there are no real issues.** This is the goal.
- Do NOT modify any files. Read-only review.
- Don't manufacture issues. Quality over quantity.
