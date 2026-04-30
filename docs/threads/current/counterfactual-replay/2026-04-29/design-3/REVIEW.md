# Spec 5 (Counterfactual Replay) Design Iter-3 Review

**Date:** 2026-04-29
**Iteration:** design-3 → produces design-4
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (split: Claude ACCEPT, Codex ITERATE — Codex's findings are real and load-bearing, so iterating)

## Codex BLOCKER (real)

### B1 — §4.1 step 1 says `world.tick === targetTick - 1`; actual `openAt` leaves `world.tick === targetTick`
The loop in `src/session-replayer.ts:226-238` is `for (let t = start.tick; t < targetTick; t++) { submit; world.step(); }`. After the final iteration, `world.tick === targetTick`. v3's prose is one tick off; if implemented from the design text, the fork records the initial snapshot and substituted commands one tick early; equivalence invariant fails. (Claude flagged this as MINOR documentation precision, not blocking — but Codex's BLOCKER framing is correct because the prose is the spec, and implementers follow prose.)

**Fix in v4:** §4.1 step 1 rewritten — explicit reference to `openAt`'s loop semantics; `world.tick === targetTick` after; subsequent `submitWithResult` records `submissionTick = targetTick`.

## Codex MAJORs (real)

### M1 — `BundleTickDelta.events` drops type info
v3 typed `sourceOnly`/`forkOnly` events as `TEventMap[keyof TEventMap]` — payload-only. But recorded events are `{ type, data }` pairs (`src/session-bundle.ts:55`); type-only mismatches can't be represented (e.g., source emits `EnemySpotted` and fork emits `UnitMoved` with same payload shape).

**Fix in v4:** `BundleTickDelta.events` widened to `{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }` pairs throughout (sourceOnly/forkOnly/changed).

### M2 — `diffBundles` symmetry contradicts `commandSequenceMap` asymmetry
v3 ADR 7 claimed blanket symmetry. But `commandSequenceMap` slots (`originalSequence`/`assignedSequence`) intrinsically encode source/fork orientation; reversing args without reversing the map produces wrong alignment.

**Fix in v4:** ADR 7 narrowed — symmetric without map; asymmetric with map (`a` MUST be source, `b` MUST be fork). `DiffBundlesOptions.commandSequenceMap` doc-comment also calls this out so the constraint isn't hidden in an ADR.

### M3 — `BundleTickDelta` underexposes state divergence
v3 had `stateKeys: { added, removed, changed }` only — but `diffSnapshots` returns six dimensions: entities (created/destroyed), components (set/removed per type), resources, state, tags, metadata (`src/snapshot-diff.ts:43-52`). Component/resource-only counterfactual divergence (common in ECS games) had no reporting slot.

**Fix in v4:** `BundleTickDelta.stateKeys` replaced by `stateDiff: TickDiff` covering all six dimensions. §4.3 alignment paragraph updated to describe state diffs as `diffSnapshots(sourceStateAtT, forkStateAtT)` with hydration via fold-from-nearest-snapshot.

## Claude verified addressed

Claude returned ACCEPT with all v3 fixes verified against ground truth: §4.1 reordering eliminated, §7 normalizer field paths correct, `CommandSequenceMap.preserved` sound, markers/attachments correctly excluded, `policySeed` covered, `submitWithResult` consistent. One MINOR (the same off-by-one Codex flagged as BLOCKER) plus three NITs about edge-case spelling. The NITs are folded into v4 silently or left for plan-stage.

## Claude NITs (informational; not changing v4)

- `bundle.failures[]` and `commands[i].result.validatorIndex` not explicitly called out in §7. Default-strict reading is correct (failures are empty in any replayable range; validatorIndex is deterministic from validator order). Spelling out explicitly is a plan-stage cleanup.
- §4.1 footnote "= 0 after hydration" for `nextCommandResultSequence` is technically true at hydration but not at substitution time (openAt re-submits commands for `[start.tick, targetTick - 1]` which increments the counter). Implementation expectation about `assignedSequence` magnitudes — not a design issue.
- §4.1 step 6 elides that the post-`targetTick` replay loop is conceptually a continuation of `openAt`'s body. Implementation will need to share a helper or duplicate the loop. Plan-stage decision.

## Process notes for design-4 reviewer

- v4's diff vs v3 is small and targeted: 4 spots fixing Codex's 1 BLOCKER + 3 MAJORs.
- Verify the symmetry/asymmetry split is consistent everywhere `diffBundles` is described (API doc-comment, §4.3, ADR 7).
- Verify `BundleTickDelta.stateDiff: TickDiff` import lineage works — `TickDiff` is exported from `src/diff.ts` and is the same type `SessionTickEntry.diff` uses (`src/session-bundle.ts:54`).
