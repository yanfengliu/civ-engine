# Spec 5 (Counterfactual Replay) Plan Iter-2 Review

**Date:** 2026-04-29
**Iteration:** plan-2 → produces plan-3
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (both reviewers convergent on H1; Codex H2 + M1 + Claude M1 also real)

## Convergent HIGH

### H1 — `applyTickDiff` is unsound for full snapshot hydration; `bundleSlice.initialSnapshot` will fail rng equivalence
Both reviewers verified:
- `TickDiff` doesn't carry rng/componentOptions/config (`snapshot-diff.ts:14-21` excludes them — "rng (selfCheck's domain)").
- Plan v2 Step 10a IMPL correctly listed rng/componentOptions/config as pass-through.
- BUT plan v2 Step 7 used `applyTickDiff` to rebuild `bundleSlice.initialSnapshot`. The fork's actual `initialSnapshot` (written by `recorder.connect()` after openAt's loop) has rng evolved through openAt's step()s. `bundleSlice` folding from a preceding source snapshot keeps stale rng.
- Plan v2's normalizer (Step 7) does NOT strip `snapshot.rng`, so byte-equivalence fails on `initialSnapshot.rng` for any midTick that isn't a snapshot tick — the common case.

**Fix in v3:**
- Step 7's `bundleSlice` rebuilds `initialSnapshot` via `replayer.openAt(fromTick).serialize()` (= `replayer.stateAtTick(fromTick)`) — same code path the fork uses; rng matches by construction.
- Side benefit: removes Step 7's dependency on Step 10a; ordering reverts to `1, 2, 3, 4, 5, 6, 7, 8, 9, 10a, 10b, 11`.
- `applyTickDiff` (Step 10a) is still needed for Step 10b's state-diff fold via `diffSnapshots`, which excludes rng by design — the partial-hydration limitation is safe in that consumer.
- Open question 2 updated: `applyTickDiff` is now internal, not publicly exported. External "snapshot at tick N" callers should use `replayer.openAt(N).serialize()`.

## Codex HIGH (real)

### H2 — Divergence tick numbering inconsistent between plan and DESIGN
Plan v2 reported target-tick substitutions at `targetTick + 1` (TickDiff.tick numbering) in Step 6 (b)/(c)/(d)/(e)/(h)/(i). DESIGN's public contract says substitutions count at `targetTick` (submission-tick numbering — DESIGN §4 Divergence doc-comment, DESIGN §6 row "[targetTick, T_fail - 1]"). Mismatch would propagate into API docs and tests.

**Fix in v3:** plan now uses **submission-tick numbering** throughout `Divergence`/`perTickCounts` references, matching DESIGN. Implementation note added: accumulate via `SessionTickEntry.tick` (= TickDiff.tick = submissionTick + 1) but **expose** in `perTickCounts` keyed by `submissionTick = SessionTickEntry.tick - 1` to match the public contract. Step 6 IMPL spelled out.

## Convergent MEDIUM

### M1 — `untilTick === targetTick` not handled correctly
Plan v2 said `untilTick` is the desired final `world.tick`, but Step 5 IMPL unconditionally submits target-tick commands and calls `world.step()` BEFORE the `while world.tick < untilTick` loop. So `run({ untilTick: targetTick })` would end with `world.tick = targetTick + 1`, violating the plan's own contract. Step 5 (g) only rejected `untilTick = targetTick - 1`, not equality.

**Fix in v3:** Step 5 (g) extended — `run({ untilTick: targetTick })` and `run({ untilTick: targetTick - 1 })` both throw `RangeError`. Required: `untilTick > targetTick`. Rationale documented in Step 5's "untilTick semantic" subsection.

## Claude MEDIUM (real)

### M2 — Step 6 (h) range off by one for mid-failure
Plan v2 said `perTickCounts` covers `[targetTick + 1, T_fail]` (TickDiff.tick numbering). Verified against `world.ts:1716-1763`: on tick failure, `finalizeTickFailure` short-circuits BEFORE `gameLoop.advance` (line 1741) AND BEFORE diff-listener emission (lines 1746-1763). So no SessionTickEntry is written for `T_fail`; the divergence accumulator can't have an entry there.

**Fix in v3:** `[targetTick, T_fail - 1]` in submission-tick numbering (matching DESIGN §6). Step 5 (h) and Step 6 (h) wording updated.

## LOW (folded silently)

### L1 — Step 5 (j) and Step 6 (i) wording mixed numbering conventions
**Fix in v3:** every range annotated with "submission-tick numbering" or just kept consistently in submission-tick numbering throughout Step 6.

### L2 — Step 10a destroyed-before-created order not pinned
Round-trip property would catch the wrong order, but a one-line spec saves an iteration during impl.
**Fix in v3:** explicit "destroyed first, then created" in Step 10a IMPL.

## Verified clean from v1 (per Claude's table)

| v1 finding | v2 fix verified | Evidence |
|---|---|---|
| H1 (recorder.start → connect) | replaced; `lastError` guard added | `session-recorder.ts:116`; matches `synthetic-playtest.ts:207-214` |
| H2 (applyTickDiff is net-new) | Step 10a defines NEW helper over six dimensions | dimensions match `diff.ts:6-32`; pass-through list matches `snapshot-diff.ts:14-21` |
| M1 (off-by-one continuation loop) | `while world.tick < untilTick` correct for normal case (untilTick > targetTick) | `world.ts:664-671,1652,1741` — step at N produces TickDiff.tick=N+1, advances to N+1 |
| M2 (commit cadence) | explicit ONE commit + ONE version bump | line 9, 22 |
| M3 (test coverage) | Step 5 (j), Step 6 (f), Step 6 (g) added | lines 91, 119-120 |
| M4 (Step 5/6 split) | Step 5 returns Divergence with commandSequenceMap; Step 6 backfills | lines 89, 106, 124-129 |
| M5 (Step 11 harness) | runSynthPlaytest per DESIGN §8 | line 202 |
| L1 (risks SoC) | rewritten | line 234 |
| L2 (policySeed) | "No policySeed" explicit | line 97 |
| L3 (sink.toBundle) | corrected | line 110 |

## Process notes for plan-3 reviewer

- v3 is mostly small surgical edits to v2: replace `applyTickDiff` with `replayer.stateAtTick` in bundleSlice (3 lines); fix tick numbering in Step 5/6 (~10 lines); reject `untilTick === targetTick`; correct `T_fail-1` range; pin destroyed-before-created.
- Verify the submission-tick numbering is consistent throughout Step 6 — no remnants of TickDiff.tick numbering in test (b)/(c)/(d)/(e)/(h)/(i).
- Verify `replayer.stateAtTick` exists with the expected signature (it does: `src/session-replayer.ts:242-244`).
- Confirm the ordering reversion (`1, 2, 3, 4, 5, 6, 7, 8, 9, 10a, 10b, 11`) is sound — Step 7 should have no Step 10a dependency now.
