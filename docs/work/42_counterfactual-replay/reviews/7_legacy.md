# Spec 5 (Counterfactual Replay) Plan Iter-4 Review

**Date:** 2026-04-29
**Iteration:** plan-4 → produces plan-5
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE

## Codex HIGHs (real)

### H1 — Step 10a entity-create wording discards diff-supplied IDs (also Claude MEDIUM)
v4 said "pop id from `freeList[]` if available else extend." But `TickDiff.entities.created` carries explicit IDs (`src/diff.ts:9`, populated sorted ascending by `src/snapshot-diff.ts:64-78`); the helper must use those exact IDs. Naive LIFO-pop would discard them and produce wrong `alive[]`/`freeList` state when `snapA.freeList` holds entries that don't match the diff's `created[]` order.

Claude's analysis: "in engine-coherent diffs, `diffSnapshots` returns created[] sorted ascending, while `EntityManager` pops LIFO. For all-recycled cases within a tick these two orders cancel out for the FINAL `alive[]`/`freeList` state (just not for the intermediate steps). For non-recycled creates with a non-empty `snapA.freeList`, the LIFO-pop interpretation diverges from the diff-id interpretation."

**Fix in v5:** Step 10a IMPL — for each `id` in `diff.entities.created`, use that exact id; if `id < alive.length`, set `alive[id] = true` and remove `id` from `freeList` if present; else extend arrays up to `id+1` (init new slots `gen=0`), then set `alive[id] = true`. Explicit note that the helper does NOT mirror `EntityManager.create()`'s LIFO-pop — it's reconstructing a target snapshot from a diff, not generating live.

### H2 — Empty tag/metadata entries must clear, not persist empty records
v4 said "set `snapshot.tags[entity] = tags`" for wholesale replacement. But the engine deletes empty tag/meta maps as cleanup (`world.ts:1499-1527, 1609-1621`), and snapshots with tag/meta keys for dead entities fail deserialize (`world.ts:1097-1129`). Setting `[]` or `{}` would produce noncanonical snapshots.

**Fix in v5:** Step 10a IMPL — for tags: if `entry.tags.length === 0`, delete `snapshot.tags[entity]`; else set wholesale. Same pattern for metadata with `Object.keys(entry.meta).length === 0`. Engine-canonical.

### H3 — Pre-advance command divergence missed
v4's Step 6 walked only SessionTickEntries. But commands are recorded at submission time BEFORE `world.step()` (`session-recorder.ts:162-172, 459-476`). A substituted command that throws on `world.step()` (pre-advance handler-failure) is recorded in `bundle.commands` at `submissionTick = T_fail` even though no SessionTickEntry exists at T_fail. v4's accumulator would silently miss this; `equivalent: true` for a clearly divergent fork.

**Fix in v5:** Step 6 IMPL split into TWO walks:
- **Command-stream walk:** group both bundles' `commands` by `submissionTick`. For each tick in the overlap range, align via `commandSequenceMap` at `targetTick`, by per-tick submission-order index past `targetTick`. This catches divergence at T_fail (where SessionTickEntry is missing) because commands ARE recorded.
- **SessionTickEntry walk:** event divergence only (commands already counted in walk 1, no double-count).

Test (h) updated: `perTickCounts.get(T_fail).commandsChanged >= 1` for substituted-handler-throws fixture.

## Codex MEDIUMs (real)

### M1 — `lastError` mid-run not checked
v4 only checked `recorder.lastError` after `connect()`. Recorder sets it on tick/failure/command/terminal-snapshot write failures (`session-recorder.ts:413-425, 450-453, 482-492`); `runSynthPlaytest` and `runAgentPlaytest` check after stepping.

**Fix in v5:** Step 5 IMPL bullets 6 + 7 — after each `world.step()`, check `recorder.lastError`; if set, break the loop. Final check after `disconnect()` for terminal-snapshot failure.

### M2 — `recorder.connected` doesn't exist; actual API is `isConnected`
**Fix in v5:** typo replaced everywhere.

## Claude MEDIUM (folded above as part of H1)

Same as Codex H1 — Claude flagged it as MEDIUM with a more nuanced "why round-trip catches it" analysis, but the fix is identical.

## Claude NITs (folded silently)

- Double-recycle within one tick → gen+2 in engine but `applyTickDiff` produces gen+1: edge case, documented in Risks for v1.
- Step 5(h) test fixture concretized as "command-phase failure: substituted command's handler throws inside `processCommands`."
- Step 6(h) listeners-phase wording narrowed to acknowledge listener registration order.

## Verified clean (v4 patches confirmed)

| v4 patch | Status |
|---|---|
| Entity-generation direction (destroy bumps, create reactivates) | ✓ correct, just IMPL wording was misleading |
| try/finally recorder.disconnect | ✓ idempotent disconnect; no double-fail |
| endTick → persistedEndTick global | ✓ all references replaced |
| applyTickDiff internal | ✓ excluded from doc deliverables |
| tags/metadata wholesale shape | ✓ matched diff.ts:30-31, but missed empty-cleanup (H2 above) |
| T_fail SessionTickEntry edge case | ✓ pre-advance phases verified, but listeners-phase wording further narrowed |

## Process notes for plan-5 reviewer

- v5's diff vs v4: 4 IMPL spots (entity-create ID handling, tags/metadata empty-cleanup, lastError mid-run, isConnected typo) + Step 6 IMPL substantial rewrite (two walks instead of one) + 1 risks row + concretized test fixture wording.
- The Step 6 two-walk split is the largest change. Verify it correctly counts pre-advance command-stream divergence at T_fail without double-counting events.
- Verify `bundle.commands` at `submissionTick === T_fail` actually contains the substituted command in the failing-handler scenario. Spot-check via `session-recorder.ts:162-172` (the `submitWithResult` wrap captures BEFORE the handler runs).
