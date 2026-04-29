# Bundle Viewer — Code Review Iteration 2 (2026-04-28)

**Disposition:** ACCEPT (both reviewers). Codex 1 minor + 1 partial-leftover, Claude 1 minor. All folded into the same staged diff for commit.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Iter-1 finding dispositions

Both reviewers verified all iter-1 findings ADDRESSED in v2:
- Codex MAJOR-A (snapshot fallback misses entity-ID recycling): ADDRESSED — `src/snapshot-diff.ts:diffEntities` compares per-id generations; tests at `tests/snapshot-diff.test.ts` "flags entity recycling" / "does not flag stable alive entities."
- Codex MAJOR-B / Claude MAJOR (diffSince correctness paths untested): ADDRESSED — 5 new tests at `tests/bundle-viewer-diff.test.ts` (failure-in-range, sparse fallback, recycle fallback, components LWW, state coalescing).
- Codex MAJOR-C / Claude MAJOR (>500-LOC): ADDRESSED — three-file split: `bundle-viewer.ts` 446 LOC, `bundle-viewer-types.ts` 132 LOC, `bundle-viewer-internal.ts` 175 LOC.
- Codex MAJOR-D (per-call sorting): ADDRESSED — pre-sorted streams built once at construction.
- Codex MAJOR-E (forward-reference `done/` links): ADDRESSED-by-process — Step 12 git-mv runs in same commit.
- Claude minors (`_failuresByTick` dead, implicit ordering, `Object.freeze([])`, fold destroy/set, mutable bundle): all ADDRESSED.

## New nits in iter-2

### Codex MINOR — README "frozen `diff`" wording

Real ambiguity: README implied `frame.diff` was runtime-frozen, but `diff` is a readonly type contract. **Fixed:** reworded the README Feature Overview row to "selective runtime freezing — outer frame + per-tick arrays frozen one-time; recorded `diff` is a readonly view."

### Claude MINOR — `tests/bundle-viewer.test.ts` 535 LOC over cap

Same 500-LOC rule. **Fixed:** split into `tests/bundle-viewer.test.ts` (416 LOC) + `tests/bundle-viewer-diff.test.ts` (189 LOC). The split mirrors PLAN.md's File Map contingency.

### Codex partial — freeze + element-bypass test contracts

Both freeze tests ("entry remains frozen", "element bypass succeeds") only asserted no-throw / type presence. **Fixed:** the entry-freeze test now asserts mutation attempts throw (overwriting `openViewer`, adding new fields). The element-bypass test now asserts the mutation is visible across subsequent reads of the same frame's array AND across a fresh `atTick` call (matching the PLAN.md risk-register language).

## Validation

After iter-2 fixes: 943+ tests pass + 2 todo. All four engine gates clean. Files under cap. Stale-reference grep against canonical doc surfaces returns silent.

## Disposition

ACCEPT. Move thread to `docs/threads/done/bundle-viewer/`, append final devlog entry, run final gates on the post-move tree, and commit as v0.8.7.
