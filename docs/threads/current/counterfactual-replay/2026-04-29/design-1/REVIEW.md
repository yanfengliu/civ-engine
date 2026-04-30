# Spec 5 (Counterfactual Replay) Design Iter-1 Review

**Date:** 2026-04-29
**Iteration:** design-1 → produces design-2
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (both reviewers convergent)

## Convergent BLOCKERs

### B1 — §7 byte-equivalence invariant unachievable
Both reviewers verified against `src/session-replayer.ts` and `src/world.ts`. `WorldSnapshotV5` does not preserve `nextCommandResultSequence`, `selfCheck` already strips `submissionSequence`, and `metadata.{sessionId, recordedAt, startTick}` plus `initialSnapshot` (anchored at `targetTick`, not source `startTick`) all differ structurally. The "byte-equivalent" claim is provably false.

**Fix in v2:** rename §7 to "Equivalence Invariant," soften to semantic equivalence over commands/events/executions/state, enumerate the normalizer fields explicitly, and assert byte-equivalence only post-normalization.

### B2 — ADR 4 sequence-inheritance incompatible with `World.submit()` contract
"`replace(seq, newCmd)` produces a RecordedCommand with the original's sequence" requires bypassing `nextCommandResultSequence++` in `World.createCommandSubmissionResult` (`src/world.ts:1905`). Sequences are auto-assigned at submit time. Three paths possible: (a) submit() with post-mapping, (b) new `submitWithSequence()` API, (c) bypass submit entirely (which would make validator-rejection unreachable per §6).

**Fix in v2:** option (a) — substitutions go through `world.submit()` and pick up fresh sequences; the recorder maintains a `CommandSequenceMap` mapping original → assigned, exposed on `Divergence`. New §4.1 documents the mechanism.

## Convergent MAJORs

### M1 — ADR 3 inline state-key delta underspecified
Computing per-tick state-key deltas inline requires either source-world double-buffering or per-tick fold-from-snapshot. v1 spec said "cheap" without committing to either.

**Fix in v2:** drop `stateKeyDeltas` from inline `Divergence`. State-level diffs are computed by `diffBundles`, which has access to both bundles' snapshots+TickDiffs. ADR 3 updated to scope inline divergence to commands/executions/events.

### M2 — Open Q1 (event direction) should be settled at design time
Collapsing event direction into a single counter is lossy for trivial reason. Every counterfactual analysis asks "did the fork emit more or fewer."

**Fix in v2:** split every delta count into `sourceOnly` / `forkOnly` / `changed` for commands and events. `executionsChanged` is a single counter (executions are tied to commands; sourceOnly/forkOnly already tracked at the command level).

### M3 — Open Q4 (`world` accessor) should be settled at design time
Codex argued for `.snapshot()` over `.world()` (mutable world defeats the counterfactual contract). Claude argued for `.world()` (agents need state inspection; `openAt(tick)` would duplicate replay work).

**Fix in v2:** expose `.snapshot(): WorldSnapshot` (read-only). Read-only state inspection covers the agent inspection use case without giving callers a mutation handle on the paused world. Cheap (same as `world.snapshot()`).

### M4 — Conflict rules for chaining (Open Q3 + ADR 4) should be settled at design time
"Chaining can work in any order" requires builder semantics: duplicate replace, replace+drop on same seq, replace/drop of inserted, multi-insert ordering, builder single-use lifecycle.

**Fix in v2:** new §4.2 "Conflict rules" table specifies all of these synchronously enforced at builder call time. New error types: `ForkBuilderConflictError`, `BuilderConsumedError`.

### M5 — `BundleDiff` matching key undefined
Sequence-based matching is unstable across recorders (per B1); `(tick, type, deepEqual(data))` fails when substitution changes data.

**Fix in v2:** specified in ADR 4 + §4. With `CommandSequenceMap` provided as a `DiffBundlesOptions`, `diffBundles` aligns by `(tick, originalSequence → assignedSequence)`. Without it, falls back to `(tick, type, deepEqual(data))` for cross-bundle diffs.

### M6 — Insert into empty target tick base case
`max(seqAtThisTick) + 1` is `max(∅) + 1` — undefined for empty target tick. Inserting into an empty tick is a normal use case.

**Fix in v2:** B2's resolution sidesteps this — inserts go through `world.submit()` which uses the world's `nextCommandResultSequence`, defined regardless of target-tick population.

## Convergent MINORs

### m1 — §10 versioning 0.9.0 → 0.8.12 (c-bump)
Per AGENTS.md, b-bump is for breaking changes only. Additive APIs ship as c-bumps.
**Fix in v2:** §10 updated.

### m2 — `submittedAtTick` typo
Actual `RecordedCommand` field is `submissionTick` (`src/session-bundle.ts:42`).
**Fix in v2:** corrected throughout.

### m3 — Incomplete-bundle handling
`forkAt` should mirror `openAt`'s `persistedEndTick` handling for `incomplete: true` bundles.
**Fix in v2:** explicit row added to §6 error table; preconditions text in §4 updated.

### m4 — `equivalent` ignores metadata clarification
Without explicit exclusion, fresh fork metadata makes every fork non-equivalent.
**Fix in v2:** ADR 7 + `Divergence.equivalent` doc + `BundleDiff.equivalent` doc all explicit that metadata is not compared.

### m5 — Accepted-substituted-command handler-failure behavior
§6 covered validator rejection but not handler-failure-after-acceptance.
**Fix in v2:** new row in §6 error table; references existing `WorldTickFailureError` semantics.

## Non-blocking notes (folded as v2 NITs or future work)

- **Drop-leaves-gap downstream consumer audit** (Claude MINOR 4) — addressed in ADR 4 by sourcing fork sequences fresh from `world.submit()`; no cross-tick sequence inheritance, so no gaps. Plan-stage will verify `BundleViewer`/`runMetrics`/`BundleCorpus` don't assume contiguity (none currently do per spot-check).
- **Chaining cost note** (Claude MINOR 5) — added to ADR 2 rationale.
- **§3 architecture diagram** (Claude NIT 2) — updated to show `.snapshot()` and the source-bundle access pattern.
- **Lazy/streaming `BundleDiff`** (Claude NIT 1) — moved to §11 deferred.

## Process notes for design-2 reviewer

- Verify the v2 normalizer field list in §7 covers everything that actually differs between source slice and no-substitution fork — pay attention to anything the recorder writes from per-recorder state.
- Verify §4.1 substitution mechanism is implementable with the actual `world.submit()` signature and `nextCommandResultSequence` semantics. Specifically: does re-submitting a non-substituted source command at `targetTick` still produce the same accepted/rejected outcome? (Should — same world state, same payload, same validator.)
- Verify §4.2 conflict rules are exhaustive (no missing pairs).
- Verify §10 c-bump justification holds (no breaking change in the new surface).
