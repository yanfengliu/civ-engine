# Spec 5 (Counterfactual Replay) Plan Iter-3 Review

**Date:** 2026-04-29
**Iteration:** plan-3 → produces plan-4
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (Claude ACCEPT with NITs; Codex ITERATE with 2 HIGHs + 2 MEDIUMs — Codex's findings are real)

## Codex HIGHs (real)

### H1 — Step 10a entity-generation lifecycle backward
Plan v3 said `applyTickDiff` for entities should: destroyed → leave `generations[id]` unchanged; created → increment `generations[id]` if recycling. WRONG per `src/entity-manager.ts:11-44`:
- `destroy(id)` (line 27-34): sets `alive[id] = false`, **increments `generations[id]++`**, pushes to freeList.
- `create()` reusing free-list id (line 11-18): pops, sets `alive[id] = true`, **NO generation increment**.

Since `diffSnapshots` (line 66-78) reports recycled (alive both, generation changed) as both destroyed AND created, the helper needs the actual lifecycle: destroy bumps gen, create reactivates without bumping. Plan v3's order would leave the entity dead OR keep the wrong generation.

**Fix in v4:** Step 10a IMPL corrected. Apply destroyed first (alive=false, generations[id]++, push freeList), then created (pop freeList else extend, alive=true, no generation change).

### H2 — Target-tick step outside catch path
Plan v3 Step 5 IMPL bullet 6 said `world.step()` for targetTick without a try/catch. Only the continuation loop (bullet 7) caught `WorldTickFailureError`. A substituted command on targetTick that throws would bubble past run()'s control, violating DESIGN §6 contract ("run() returns a bundle, does not rethrow"). Also: `recorder.connect()` wraps `submitWithResult` and registers listeners; only `disconnect()` unwinds. Without a finally, an unhandled throw leaks the wrap.

**Fix in v4:** entire `run()` body wrapped in `try { … } finally { if (recorder.connected) recorder.disconnect(); }`. Bullet 6 explicitly catches `WorldTickFailureError` for the targetTick step. Bullet 7's loop continues catching it. Recorder always unwound.

## Codex MEDIUMs (real)

### M1 — `endTick` vs `persistedEndTick`
Plan v3 used `source.metadata.endTick` in 6 places; DESIGN consistently uses `persistedEndTick` (DESIGN §1, §4, §6, §7). For incomplete bundles `persistedEndTick !== endTick`; using `endTick` could include non-replayable source range.

**Fix in v4:** global replace `source.metadata.endTick` → `source.metadata.persistedEndTick` throughout the plan.

### M2 — `applyTickDiff` listed in changelog/api-reference but Step 10a says internal
Plan v3 Open Q2 made the helper internal, but doc-deliverables list still mentioned it.

**Fix in v4:** changelog entry mentions `applyTickDiff` only as "internal helper, no public surface." `docs/api-reference.md` task explicitly excludes it.

## Claude NITs (real, folded)

### NIT-1 — `tags`/`metadata` in TickDiff are wholesale, not set/removed
Per `src/diff.ts:30-31`: `tags: Array<{entity, tags: string[]}>`, `metadata: Array<{entity, meta: Record}>`. Each entry is a wholesale replacement for that entity, not a delta. Plan v3 said "apply per-entity set/removed" — wrong shape.

**Fix in v4:** Step 10a IMPL corrected — for each entry, overwrite `snapshot.tags[entity]` / `snapshot.metadata[entity]` wholesale. Entities not in the diff are unchanged. No set/removed split.

### NIT-2 — "no SessionTickEntry for T_fail" over-broad
Plan v3 cited `world.ts:1716-1763` as proof no SessionTickEntry exists for T_fail. True for pre-advance phases (commands/systems/resources/diff). FALSE for listeners-phase failure: `finalizeTickFailure(phase='listeners')` is invoked AFTER `gameLoop.advance` (line 1989) and AFTER the recorder's `_onDiff` listener fired. So a non-recorder listener throwing leaves both a SessionTickEntry AND a TickFailure for T_fail.

**Fix in v4:** Step 5(h) and Step 6(h) narrowed — explicit "for pre-advance failure phases" + edge-case note for listeners-phase. Test fixture uses pre-advance phase (the typical case). The recorder catches its own listener errors (`session-recorder.ts:433-435`), so listeners-phase-fail requires a custom listener attached by the worldFactory.

## Verified clean from v2 (per Claude's spot-checks)

- H1 v3 fix (`stateAtTick` for bundleSlice): verified correct against `src/session-replayer.ts:242-244`.
- H2 v3 fix (submission-tick numbering throughout Step 6): verified consistent.
- M1 v3 fix (untilTick === targetTick rejected): verified rationale via Step 5 IMPL.
- M2 v3 fix ([targetTick, T_fail-1] in submission-tick numbering): verified against world.ts failure-phase paths.
- L1/L2 v3 fixes: verified inline.
- Ordering reversion (`1, 2, 3, 4, 5, 6, 7, 8, 9, 10a, 10b, 11`): sound — Step 7 has no Step 10a dependency now.

## Process notes for plan-4 reviewer

- v4's diff vs v3 is small: Step 10a entity-generation order corrected to match `entity-manager.ts`, target-tick step wrapped in try/catch + run() wrapped in try/finally, endTick→persistedEndTick global replace, doc-deliverables exclude applyTickDiff, tags/metadata wholesale wording, listeners-phase NIT.
- Verify the `try/finally` recorder wrap doesn't double-disconnect — `recorder.connected` guard in finally + explicit disconnect on lastError-failure path.
- Verify the entity-generation IMPL semantics produce the correct alive/generation/freeList state for the recycled-entity test case (round-trip property in Step 10a should catch any remaining error).
