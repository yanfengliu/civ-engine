# Spec 5 (Counterfactual Replay) Plan Iter-1 Review

**Date:** 2026-04-29
**Iteration:** plan-1 → produces plan-2
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (both reviewers convergent)

## Convergent HIGH

### H1 — `recorder.start()` doesn't exist; method is `connect()`
Plan v1 used `recorder.start()` throughout. Per `src/session-recorder.ts:116`, the actual API is `connect()`. The `submitWithResult` wrap is installed inside `connect()` (lines 163-172), as is the initial-snapshot write. Both `runSynthPlaytest` (`src/synthetic-playtest.ts:206`) and `runAgentPlaytest` (`src/ai-playtester.ts:165`) confirm. Also: `connect()` does NOT throw on sink-open failure — it sets `_lastError` + `_terminated` and returns; existing runners check `recorder.lastError` immediately after.

**Fix in v2:** find/replace `recorder.start()` → `recorder.connect()` everywhere in plan. Step 5 IMPL bullet 3 adds explicit `lastError` guard after `connect()`. Risks row 1 corrected.

### H2 — Step 10's hydration plan is unsound; `openAt` doesn't fold TickDiffs
Plan v1 said `hydrateStateAtTick(bundle, t)` "Reuses or refactors out the same fold `SessionReplayer.openAt` already does." This is wrong:
- `SessionReplayer.openAt` (`src/session-replayer.ts:226-238`) does forward-replay via `worldFactory(snapshot)` + `world.submitWithResult(...)` + `world.step()`. There is no TickDiff application anywhere in `openAt`'s body.
- The plan's `applyTickDiff(state, tickDiff)` helper does not exist in the codebase. `foldTickDiffs` (`src/bundle-viewer-internal.ts:63`) coalesces TickDiffs into one TickDiff (delta-since-snapshot), not state-at-tick. `bundle-viewer.ts:436-438`'s snapshot-fallback uses `replayer.openAt(t).serialize()` and errors when no `worldFactory` is supplied.

DESIGN §4.3 commits to TickDiff-fold hydration, so `diffBundles` cannot fall back to `openAt` (which requires a `worldFactory`). Step 10 must implement a net-new `applyTickDiff(snapshot, diff): WorldSnapshot` over all six dimensions (entities/alive/generations/freeList, components per type, resources, state, tags, metadata) plus its own test surface.

**Fix in v2:** Step 10 split into:
- **Step 10a:** introduces `applyTickDiff` helper as a net-new piece in `src/apply-tick-diff.ts` with dedicated test suite. Includes round-trip property (`diffSnapshots(applyTickDiff(a, d), b)` is empty when `d = diffSnapshots(a, b)`) + per-dimension unit tests + recycling-generation edge case.
- **Step 10b:** `diffBundles` consumer of `applyTickDiff` for state-diff fold. Walks both bundles' tick streams in lockstep with running state per side; resets at snapshot boundaries.

Plan ordering also revised to `1, 2, 3, 4, 5, 6, 10a, 7, 8, 9, 10b, 11` because Step 7's `bundleSlice` test helper needs `applyTickDiff` for `initialSnapshot` rebuild.

## Convergent MEDIUM

### M1 — Step 5 off-by-one in continuation loop (Codex)
Plan v1: "From `targetTick + 1` through `untilTick`: forward-replay loop" — read inclusively, this iterates t=targetTick+1..untilTick (one too many). Following `openAt`'s contract (world.tick = targetTick at completion), `untilTick` should mean "world.tick at fork run end" (matching openAt's contract). For `untilTick = source.metadata.endTick = 10` with `targetTick = 5`, the fork should produce 5 step()s covering submission-ticks 5..9 with TickDiff.tick 6..10 — matching source's slice.

`world.step()` advances world.tick from T to T+1 and emits TickDiff with `tick = T+1`. Source bundle: `runSynthPlaytest(maxTicks=10)` from world.tick=0 produces submission-ticks 0..9, TickDiff.ticks 1..10, endTick=10.

**Fix in v2:** continuation loop is `while world.tick < untilTick` (equivalently `for t = targetTick + 1; t < untilTick; t++`, exclusive upper bound). Step 5 documents the `untilTick` semantic explicitly. Step 7 equivalence test exercises `untilTick = source.metadata.endTick` directly to catch any off-by-one regression.

### M2 — Plan v1 commit cadence contradicts AGENTS.md (Codex)
Plan v1 said both "each step lands as its own commit on `main` after per-step gates pass" AND "the full gate runs once before the final commit." Internally inconsistent. Per AGENTS.md "one version bump per coherent shipped change" + "All four [gates] must pass before each commit," Spec 5 is one coherent change → ONE commit.

**Fix in v2:** explicit clarification — per-step "checkpoints" are local TDD milestones (affected-suite gates only), NOT commits. The full gate + final commit runs once at the end after multi-CLI implementation review.

### M3 — Test coverage missing for design invariants (Codex)
- `run({ untilTick > source.metadata.endTick })` continues forward beyond source range; inline divergence covers only the source overlap. v1 had no test for this.
- Validator-rejected substitutions / changed acceptance outcomes — DESIGN §6 covers these but plan v1 had no Step 6 test for them.

**Fix in v2:** Step 5 test (j) added for `untilTick > source.endTick`. Step 6 tests (f) and (g) added for validator-reject substitution and acceptance flip due to state divergence.

### M4 — Step 5 vs Step 6 split for Divergence fields (Claude)
Plan v1's Step 5 returned `divergence: { ...empty for now... }` but Step 5 test (e) asserted `commandSequenceMap` populated. `commandSequenceMap` is part of `Divergence`. Internally inconsistent.

**Fix in v2:** Step 5 returns `Divergence { commandSequenceMap, firstDivergentTick: null, perTickCounts: empty Map, equivalent: false }` — `commandSequenceMap` populated in Step 5; `firstDivergentTick`/`perTickCounts`/`equivalent` backfilled in Step 6's pass. Step 5 test (h)'s `perTickCounts` assertion moved to Step 6 test (h).

### M5 — Step 11 integration harness mismatch with DESIGN (Claude)
Plan v1 used `runAgentPlaytest`; DESIGN §8 specifies `runSynthPlaytest`. Synth is the simpler harness.

**Fix in v2:** Step 11 switched to `runSynthPlaytest`.

## LOW (folded silently)

### L1 — Risks row 7 stream-of-consciousness (Claude)
Plan v1 had "Step 5 IMPL unwraps before openAt … wait, openAt doesn't have a recorder; …" — unfinished analysis. Conclusion is correct (no wrap concern; openAt builds a fresh world via `worldFactory`).

**Fix in v2:** Risks row 7 rewritten to conclusion + the defensive test it requests (Step 5 confirms openAt-phase `submitWithResult` calls don't add commands to the fork's bundle).

### L2 — `policySeed` propagation unspecified (Claude)
DESIGN §7 normalizer notes fork's recorder doesn't propagate `policySeed`. Plan v1's recorder-construction step didn't mention it.

**Fix in v2:** Step 5 IMPL bullet 2 explicit "**No `policySeed`** (different lineage; per DESIGN §7 normalizer)."

### L3 — `sink.readBundle` doesn't exist (Claude)
Actual API is `sink.toBundle()`.

**Fix in v2:** corrected.

## Verified clean (no change)

| Plan v1 choice | Verification |
|---|---|
| Eager `forkAt → openAt` (Open question 1) | Both reviewers ACK — `.snapshot()` requires materialized world; eager pays the intrinsic cost where the user expects it. |
| Post-run divergence walk in Step 6 (Open question 2) | Both reviewers ACK — extra pass is simpler than hooking into recorder internals; bounded by bundle size. |
| Substitution mechanism timing | Verified: `recorder.connect()` before any substitution `submitWithResult`; openAt-phase submissions are pre-connect (no wrap installed) and so don't pollute the fork's bundle. |
| Sequence-consumption claim (ADR 4) | Verified against `world.ts:1884-1908` — `createCommandSubmissionResult` increments regardless of `accepted`. |
| `MemorySink({ allowSidecar: true })` signature | Verified per `src/session-sink.ts:85-100`. |
| `c-bump 0.8.11 → 0.8.12` | Verified additive; no breaking surface. |

## Process notes for plan-2 reviewer

- v2's diff vs v1 is mostly mechanical (find/replace, off-by-one fix, step renumber). The new structural piece is `applyTickDiff` (Step 10a) — review its scope.
- Verify Step 5 test (j) and Step 6 tests (f)/(g) cover the design invariants they claim to.
- Spot-check `untilTick` semantic — does `while world.tick < untilTick` match `openAt`'s contract?
- Spot-check the final ordering (`1, 2, 3, 4, 5, 6, 10a, 7, 8, 9, 10b, 11`) — Step 7 depends on Step 10a, so 10a must precede 7.
