# Bundle Viewer — Design Iteration 2 Review (2026-04-28)

**Disposition:** Iterate. Codex flagged 2 majors and 1 minor; Claude flagged 5 clarification-grade minors and accepted. v3 addresses all of them.

Reviewers: Codex (gpt-5.4 xhigh), Claude (opus xhigh).

## Iter-1 findings disposition (per both reviewers)

All 3 blockers and all 8 majors from iter-1 verified ADDRESSED in v2 (confirmed by both reviewers spot-checking against the substrate code).

## New Codex findings against v2

### Codex MAJOR-A: `recordedRange` overstates content for terminated bundles

§5.1 and §6 step 5 defined `recordedRange.end = metadata.endTick`. Verified against `src/session-recorder.ts:226` (`disconnect()` sets `endTick = world.tick` regardless of termination state) and `:414` (`_onDiff` short-circuits when `_terminated`). For an incomplete/terminated bundle, the world can keep ticking past termination, so `metadata.endTick` overstates the highest tick with actual recorded content.

**Resolution in v3:** §5.1 redefines `recordedRange.end = min(metadata.endTick, contentMaxTick)` where `contentMaxTick = max over bundle.ticks[].tick / commands[].submissionTick / executions[].tick / markers[].tick / failures[].tick` (floor `metadata.startTick` for empty bundles). For complete bundles this still equals `metadata.endTick`. §6 step 4 spells out the construction-time computation. §11 adds a test that fabricates this case via `MemorySink` + forced sink-write failure mid-run.

### Codex MAJOR-B: `BundleViewer.fromSource(source, { replayer })` is self-contradictory

Verified against `src/session-replayer.ts:155`: `SessionReplayer.fromSource(source).bundle` materializes a fresh bundle. So a caller passing both `source` and `{ replayer }` would always fail the strict `replayer.bundle === bundle` identity check, even when the two are semantically equivalent. The same problem exists for `BundleCorpusEntry.openViewer({ replayer })` because `loadBundle()` materializes fresh.

**Resolution in v3:** Drop `BundleViewerOptions.replayer` entirely (ADR 35 added). The viewer's only worldFactory access path is `BundleViewerOptions.worldFactory`; the internal `SessionReplayer` is lazily constructed and memoized. Callers wanting to share work between replayer and viewer construct the viewer first, then call `viewer.replayer()` for the memoized replayer. Side benefit: `SessionReplayer` no longer needs a `bundle` getter (iter-1 B1 disposition reverted), so the design no longer touches `SessionReplayer` at all (§9.2).

### Codex MINOR: validation order

`options_conflict` was not actually the first validation error because `BundleVersionError` (schema check) ran before. With v3 dropping `options.replayer`, the entire options-validation step is gone; only schema validation runs at construction. v3 §6 step 1 documents that schema-first is intentional.

## New Claude findings against v2

All 5 clarification-grade minors. v3 folds them in:

- **Validation order rationale** — covered by v3 §6 step 1's schema-first comment.
- **Snapshot fallback inherits replayableRange bounds** — v3 §7 path 2 explicitly notes the path fails with `BundleRangeError({ code: 'too_high' })` when an endpoint is in `recordedRange` but beyond `replayableRange.end`.
- **Query validation timing (eager vs lazy)** — v3 §5.3 declares bound validation eager at the call site; iteration body remains lazy.
- **`frame.diffSince(otherTick)` non-integer guard** — v3 §7 edge cases throw `BundleViewerError({ code: 'query_invalid' })` for NaN/non-integer/non-finite `otherTick`.
- **Folded `diff.tick`** — v3 §7 edge cases set folded `diff.tick = toTick` for symmetry with the snapshot path's `diffSnapshots(..., { tick: toTick })`.

## Disposition

Re-design as v3. Re-review as design-3 to verify v3 closes all listed issues without introducing new ones.
