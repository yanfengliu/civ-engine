# Spec 5 (Counterfactual Replay) Plan Iter-5 Review

**Date:** 2026-04-29
**Iteration:** plan-5 → ACCEPT (proceed to implementation)
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ACCEPT (both reviewers convergent)

## Codex ACCEPT

> v5 addresses the plan-4 issues correctly: explicit created-entity IDs are preserved, empty tag/metadata entries are deleted, pre-advance command divergence is covered through the command-stream walk, `lastError` is checked during the run, and the recorder getter is correctly named `isConnected`.

## Claude ACCEPT — verified all v4 → v5 fixes against source

| Fix | Status | Evidence |
|---|---|---|
| H1 — entity-create uses explicit IDs from diff | ✓ | `src/diff.ts:9` defines `created: EntityId[]`; `src/snapshot-diff.ts:64-78` populates with explicit IDs sorted ascending. v5's "use that exact id; remove from freeList if present; extend arrays if id ≥ alive.length" is engine-coherent. Recycle case (destroy+create same id) yields `gen+1` via destroy-first ordering. |
| H2 — empty tags/metadata delete instead of set | ✓ | `world.ts:1499-1527` deletes empty maps as cleanup; `world.ts:1097-1129` throws on deserialize for dead-entity tag/meta keys. v5's delete-on-empty is the only correct shape. |
| H3 — pre-advance command divergence via two-walk | ✓ | `session-recorder.ts:166-172` wraps `submitWithResult` to capture commands BEFORE the call returns; `:459-480` writes commands synchronously. So `bundle.commands` at `submissionTick = T_fail` is populated even when `processCommands` throws. v5's command-stream walk + SessionTickEntry walk correctly counts command divergence at T_fail without double-counting events. |
| M1 — lastError mid-run check | ✓ | `_handleSinkError` (`session-recorder.ts:482-492`) is invoked from `_onDiff:433`, `_onExecution:445`, `_onFailure:454`, `_captureCommand:477`, and `disconnect:197`. v5 checks after each `world.step()` (catches diff/execution/failure write failures) and once after `disconnect()` (catches terminal-snapshot failure). |
| M2 — `isConnected` (not `connected`) | ✓ | `session-recorder.ts:112`: `get isConnected(): boolean`. v5 uses everywhere. |
| NIT — listeners-phase listener registration order | ✓ documented | `world.ts:1746-1763` iterates `diffListeners`; recorder's `_onDiff` only catches its own sink errors. A sibling listener throwing pre-recorder aborts the loop. v5 Step 6 (h) edge-case wording accurate. |
| NIT — double-recycle (gen+2) limitation | ✓ in Risks | Acceptable v1 limitation. |

## Cosmetic NITs (non-blocking, fold during impl)

1. **Duplicated section headers** in plan deltas section (markdown artifact from iterative editing) — doesn't affect content.
2. **Range notation ambiguity** in Step 6 IMPL `overlapTickRange.start..overlapTickRange.end - 1` (Python vs Rust convention) — implementer picks clear convention.
3. **Bullet 8 `incomplete` check** slightly redundant since `disconnect()` already sets `metadata.incomplete = true` on `_terminated` (`session-recorder.ts:228-229`). Belt-and-suspenders, not wrong.

## Disposition

**ACCEPT.** Plan is implementation-ready. Total iterations: design 1→4 (4 design iters), plan 1→5 (5 plan iters). Convergence reached on substantive issues; remaining feedback is cosmetic.

## Next steps

Implementation begins per PLAN.md Step 1 (types + error classes), TDD checkpoint by checkpoint. Final commit + multi-CLI implementation review after Step 11 + full gates.
