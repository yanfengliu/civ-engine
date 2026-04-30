# Counterfactual Replay / Fork — Implementation Plan

**Status:** Draft v1 (2026-04-29). For DESIGN.md v4 (Accepted). civ-engine roadmap Spec 5. Awaiting multi-CLI plan review.

**Author:** civ-engine team.

**Target version:** civ-engine `0.8.11 → 0.8.12` (c-bump per AGENTS.md, additive surface).

## 1. Overview

Land Spec 5 in 11 ordered steps, each landing as its own commit on `main` after the per-step gates pass. Each step is TDD: write the failing test first, implement to green, then run the affected suites + typecheck + lint before staging.

The full gate (`npm test && npm run typecheck && npm run lint && npm run build`) runs once before the final commit + multi-CLI implementation review. Per-step iteration uses focused suites (`vitest run tests/session-fork.test.ts` etc.) for tight feedback.

The ordering is bottom-up: types and errors first, then the substitution mechanism, then divergence accumulator, then `diffBundles`. The equivalence test (Step 7) is the load-bearing milestone — once it passes, the substitution path is correct enough that divergence work is straightforward. After Step 7 the design is "running"; Steps 8–11 add the comparison layer.

## 2. File layout

```
src/
  session-fork.ts             ← NEW (~450 LOC budget; split if it grows past 500)
  session-bundle-diff.ts      ← NEW (~350 LOC budget)
  session-replayer.ts         ← MODIFY (add forkAt method, ~30 LOC delta)
  index.ts                    ← MODIFY (~15 LOC of new exports)

tests/
  session-fork.test.ts             ← NEW
  session-fork-equivalence.test.ts ← NEW (with the bundle normalizer helper)
  session-bundle-diff.test.ts      ← NEW
  session-fork-integration.test.ts ← NEW (full RSI loop)
```

Budgeted LOC: target ~800 production + ~800 test. Per AGENTS.md "no file > 500 LOC" — if `session-fork.ts` approaches the limit we split out `session-fork-divergence.ts` (the inline accumulator) and `session-fork-builder.ts` (the chainable API). Decide at Step 6 once the substitution mechanism is in.

## 3. Step-by-step

Each step has a TEST line (the failing test that captures the contract) and an IMPL line (the production change to make it pass). Per-step gates are listed once at the bottom of each step.

### Step 1 — Types + error classes (no behavior)
**TEST:** `tests/session-fork.test.ts` — import-only smoke test that asserts the new exports exist with the expected shapes (`ForkBuilder`, `ForkResult`, `Divergence`, `DivergenceCounts`, `CommandSequenceMap`, `ForkRunConfig`, `ForkSubstitutionError`, `ForkBuilderConflictError`, `BuilderConsumedError`).

**IMPL:** `src/session-fork.ts` types and error classes (no `forkAt` yet, no `ForkBuilder` impl). `src/index.ts` re-exports.

**Gates (this step):** typecheck + targeted vitest.

### Step 2 — `SessionReplayer.forkAt` skeleton
**TEST:** `tests/session-fork.test.ts` — `replayer.forkAt(targetTick)` returns a `ForkBuilder` with the queued-substitutions arrays empty; no precondition errors thrown (delegate to a stub `_initBuilder` that returns the skeleton). Then add precondition tests (out-of-range, replay-across-failure, no-payload, incomplete-beyond-persistedEndTick) — same shape as `openAt`'s tests, checked by reusing `openAt`'s precondition validator (extract a `validateOpenAtTick(targetTick)` helper if not already present).

**IMPL:** `forkAt(targetTick)` in `session-replayer.ts` performs the same precondition checks as `openAt` (extract a shared private helper) then returns a new `ForkBuilder` constructed with `{ replayer: this, targetTick }`. The builder is NOT yet running `openAt` — that's deferred to `run()` to keep `forkAt` cheap and to support the case where the caller calls `.snapshot()` and `.replace()` etc. without ever calling `.run()`.

Wait — `.snapshot()` requires the world. So `forkAt` must invoke `openAt` eagerly to materialize the paused world. Decision: `forkAt` calls `openAt(targetTick)` immediately and stores the world inside the builder. Cost is one full replay, but that's intrinsic to the operation.

**Gates:** typecheck + `vitest run tests/session-fork.test.ts`.

### Step 3 — `ForkBuilder.snapshot()`
**TEST:** `tests/session-fork.test.ts` — `builder.snapshot()` returns a `WorldSnapshot` whose `tick === targetTick`; calling it twice produces structurally-equal but reference-distinct snapshots; values match `world.serialize()` at the same tick (compare against a parallel `replayer.openAt(targetTick).serialize()`).

**IMPL:** `ForkBuilder.snapshot()` calls `world.serialize()` and returns. Throws `BuilderConsumedError` if called after `.run()` (consumed flag).

**Gates:** typecheck + targeted vitest.

### Step 4 — `replace`/`insert`/`drop` builder ops + conflict rules
**TEST:** `tests/session-fork.test.ts` — for each of: replace/drop with unknown sequence (throws `ForkSubstitutionError`), duplicate replace (throws `ForkBuilderConflictError(duplicate_replace)`), duplicate drop (throws `duplicate_drop`), replace+drop on same seq (throws `replace_drop_conflict`), replace/drop of source-rejected command (allowed, no throw), multi-insert preserves FIFO, ops-after-run (throws `BuilderConsumedError`). Also: replace/insert/drop chainable returns; insert with no original sequence works fine.

**IMPL:** Internal `Map<sequence, 'replaced' | 'dropped'>` used to enforce conflicts synchronously. Inserts go in a separate `Array` to preserve order. Lookups against the source bundle's commands at `targetTick` (precomputed once in `forkAt`). Mark `consumed: true` after `run()`; check at every public method.

**Gates:** typecheck + targeted vitest.

### Step 5 — `ForkBuilder.run()` substitution mechanism (no inline divergence yet)
**TEST:** `tests/session-fork.test.ts` —
- (a) No-substitution `run({ untilTick: source.persistedEndTick })` returns a `ForkResult` whose `bundle.commands.length` matches the source's `commands` count over `[targetTick, persistedEndTick]`. Detailed equivalence-by-bytes comes in Step 7.
- (b) Substituted command (replace) appears in fork bundle at `targetTick`; old command's payload absent.
- (c) Inserted command appears at `targetTick` AFTER all source commands at that tick (assert via `bundle.commands.filter(c => c.submissionTick === targetTick)` — the inserted entry's index in that filtered list equals the count of source-commands-at-targetTick).
- (d) Dropped command absent from fork bundle.
- (e) `commandSequenceMap.replaced/inserted/dropped/preserved` all populated with correct shape; `originalSequence`/`assignedSequence` integers monotonic per fork tick.
- (f) Calling `.run()` twice throws `BuilderConsumedError`.
- (g) `run({ untilTick: targetTick - 1 })` throws `RangeError`.
- (h) `run()` mid-fork handler-failure aborts cleanly: `bundle.metadata.failedTicks` populated, `bundle.failures[]` non-empty, `Divergence.perTickCounts` only has entries for `[targetTick, T_fail-1]`.

**IMPL:** `run()` does:
1. Materialize the configured (or default) sink: `new MemorySink({ allowSidecar: true })`.
2. Construct fresh `SessionRecorder` with `sourceKind: 'synthetic'`, `sourceLabel: config.sourceLabel ?? \`counterfactual-fork-of-${source.metadata.sessionId}@${targetTick}\``. Call `recorder.start()` — this captures the initial snapshot at `targetTick` and installs the `submitWithResult` wrap.
3. Walk the source bundle's commands at `targetTick` in `originalSequence` order:
   - In dropped set → skip.
   - In replaced map → `world.submitWithResult(replacement.type, replacement.data)`; record `{tick: targetTick, originalSequence, assignedSequence: result.sequence}` in `commandSequenceMap.replaced`.
   - Otherwise → `world.submitWithResult(rc.type, rc.data)`; record `{tick: targetTick, originalSequence, assignedSequence: result.sequence}` in `commandSequenceMap.preserved`.
4. After source commands, submit inserts in builder-call order: `world.submitWithResult(insert.type, insert.data)`; record `{tick: targetTick, assignedSequence: result.sequence}` in `commandSequenceMap.inserted`.
5. Step the world for `targetTick` (`world.step()`).
6. From `targetTick + 1` through `untilTick`: forward-replay loop matching `openAt`'s body — submit source commands at tick `t`, then `world.step()`. Wrap in try/catch for `WorldTickFailureError`; on failure, break the loop, let `recorder.disconnect()` finalize the bundle with the failed tick recorded.
7. `recorder.disconnect()`. Return `ForkResult { bundle: sink.readBundle(...), divergence: { ...empty for now... }, source: sink }`.

Use a builder-local `_consumed` flag.

**Gates:** typecheck + targeted vitest. The existing test suite for `openAt`, `MemorySink`, recorder semantics should not regress; run `vitest run tests/session-replayer.test.ts tests/session-recorder.test.ts tests/memory-sink.test.ts` as a quick check.

### Step 6 — Inline `Divergence` accumulator in `run()`
**TEST:** `tests/session-fork.test.ts` —
- (a) No-substitution: `Divergence.firstDivergentTick === null`, `equivalent === true`, `perTickCounts` empty.
- (b) Replace causes downstream event delta: `firstDivergentTick === targetTick` (substitution counts as targetTick divergence if it produced any command/event delta); `perTickCounts.get(targetTick)` has appropriate `commandsChanged` count; later ticks may also have entries.
- (c) Drop produces `commandsSourceOnly: 1` at `targetTick`.
- (d) Insert produces `commandsForkOnly: 1` at `targetTick`.
- (e) Same-payload event emitted at the fork that the source didn't emit → `eventsForkOnly: 1`; vice versa → `eventsSourceOnly: 1`.

**IMPL:** Inside `run()`'s tick loop, walk source `bundle.ticks[]` and `bundle.commands[]` and `bundle.events[]` for the current tick `t` in lockstep with the fork's freshly-recorded data (read from the fork's recorder via the sink's writeTick listener — easier path: read from `sink.readBundle()` at the end and walk both bundles' tick entries in a second pass). Decision: do the comparison in a second pass over the completed fork bundle, since the recorder already has all the data by the time `run()` is about to return. This keeps the run-loop simple and doesn't bind the divergence accumulator to the recorder's internal state.

Helper: `computeInlineDivergence(source, fork, commandSequenceMap, [overlappingStart, overlappingEnd])` returns `Divergence`. Per-tick:
- Align `targetTick` commands using `commandSequenceMap`.
- Align ticks > `targetTick` by per-tick submission-order index (events too).
- Count `sourceOnly`/`forkOnly`/`changed` per dimension.
- `firstDivergentTick` = lowest tick with any non-zero count.
- `equivalent` = `firstDivergentTick === null`.

**Gates:** typecheck + targeted vitest + `vitest run tests/session-replayer.test.ts` (no regression).

### Step 7 — `tests/session-fork-equivalence.test.ts` (the load-bearing test)
**TEST:** Build several source bundles via existing fixtures (prototype game, multi-tick events bundle, agent-driven `runAgentPlaytest` bundle, bundle with periodic snapshots). For each: `forkAt(midTick).run({ untilTick: source.persistedEndTick })` with no substitution → assert `divergence.equivalent === true` AND `normalizeBundle(forkBundle)` byte-equals `normalizeBundle(sourceBundle.slice(midTick))`.

`normalizeBundle(bundle, { startTickAlignment, snapshotTicks })` is a test helper that:
- Replaces `metadata.{sessionId, recordedAt, sourceKind, sourceLabel, startTick, endTick, persistedEndTick, durationTicks, policySeed}` with stable placeholders.
- For each `commands[i]`: replace `sequence` and `result.sequence` with `i` (rebased index).
- For each `executions[i]`: replace `submissionSequence` with the corresponding rebased index.
- For each `ticks[i]`: replace `metrics` with `null`.
- Strip `markers` and `attachments`.
- Align `snapshots[]` by tick number; drop snapshots that don't exist on both sides.

Sourceslice helper `bundleSlice(bundle, fromTick, toTick)` produces a `SessionBundle`-shaped object covering `[fromTick, toTick]` of the source.

**IMPL:** No production change — Step 5+6's implementation should already pass. If it doesn't, debug. This is the contract-clarifying test that distinguishes "the substitution path works" from "the recorder is doing the right thing per-tick."

**Gates:** typecheck + `vitest run tests/session-fork-equivalence.test.ts`.

### Step 8 — `diffBundles` skeleton
**TEST:** `tests/session-bundle-diff.test.ts` —
- Identical bundles → `equivalent: true`, empty `perTickDeltas`.
- Bundles with different metadata.sessionId → `metadataDeltas` populated.
- Source-vs-fork pair (from the equivalence test fixtures) → `equivalent: true`, empty `perTickDeltas`, populated `metadataDeltas`.

**IMPL:** `src/session-bundle-diff.ts` — `diffBundles(a, b, options?)`. Walks the union of tick ranges. For each tick, builds a `BundleTickDelta` with empty per-dimension deltas (state diff stub returns empty `TickDiff`). `metadataDeltas` populated from a field-by-field comparison of `a.metadata` vs `b.metadata`. `markersDeltas`/`attachmentsDeltas` populated by `Marker.id` / `AttachmentDescriptor.id` keying. Symmetry holds (no map): both arms use the same alignment.

**Gates:** typecheck + targeted vitest.

### Step 9 — `diffBundles` per-tick command/event alignment
**TEST:** `tests/session-bundle-diff.test.ts` —
- Source-vs-fork (with substitution) using `commandSequenceMap` → at `targetTick`, replace shows up as `changed` with both sides populated; insert as `forkOnly`; drop as `sourceOnly`. At ticks > targetTick, downstream effects show as appropriate sourceOnly/forkOnly/changed.
- Source-vs-fork without `commandSequenceMap` → falls back to per-tick submission-order index; some commands may be misaligned for duplicate same-type same-data cases (assert: best-effort behavior, document via test comment).
- Symmetry test: `diffBundles(a, b)` and `diffBundles(b, a)` produce mirror-image deltas (without map).
- Asymmetry test (with map): swapping args produces incorrect alignment (expected per ADR 7).
- Events alignment by per-tick submission-order index.

**IMPL:** Extend `diffBundles` per-tick logic per §4.3 of DESIGN. Use the `commandSequenceMap` at `targetTick`; per-tick submission-order index elsewhere. Events always align by index. Length mismatch → trailing extras are sourceOnly/forkOnly. Type mismatch at same index → split into sourceOnly+forkOnly (per Codex M1's spec for events).

**Gates:** typecheck + targeted vitest.

### Step 10 — `diffBundles` state-diff fold
**TEST:** `tests/session-bundle-diff.test.ts` —
- State-only divergence (e.g., a substitution that changes a resource without changing event/command shape) → `BundleTickDelta.stateDiff.resources` populated; commands/events deltas empty.
- Component-only divergence → `stateDiff.components` populated.
- Identical bundles (post-normalizer) → all six `stateDiff` dimensions empty at every tick.
- Hydrated state at tick T matches `replayer.openAt(T).serialize()`.

**IMPL:** Helper `hydrateStateAtTick(bundle, t)` walks `initialSnapshot` + closest preceding snapshot in `bundle.snapshots[]` + per-tick TickDiffs from that snapshot to t. Reuses or refactors out the same fold `SessionReplayer.openAt` already does. Then `diffSnapshots(hydrateStateAtTick(a, t), hydrateStateAtTick(b, t))` produces the per-tick `stateDiff: TickDiff`.

**Performance:** for an N-tick bundle, naive hydration per tick is O(N²). Optimize: walk both bundles' tick streams in lockstep, maintaining a running state per side and updating per-tick via `applyTickDiff(state, tickDiff)`. Reset to nearest snapshot when crossing a snapshot boundary. O(N) total per side.

**Gates:** typecheck + targeted vitest + full `vitest run tests/session-bundle-diff.test.ts tests/session-fork.test.ts tests/session-fork-equivalence.test.ts`.

### Step 11 — Integration test (full RSI loop)
**TEST:** `tests/session-fork-integration.test.ts` —
- `runAgentPlaytest` produces source bundle.
- `replayer.fromBundle(sourceBundle).forkAt(midTick).replace(...).run({ untilTick: source.persistedEndTick })` produces fork bundle.
- `diffBundles(source, fork.bundle, { commandSequenceMap: fork.divergence.commandSequenceMap })` reports the substituted command's downstream effect across commands, events, and state.
- Fork bundle is itself replayable via `SessionReplayer.fromBundle(fork.bundle).openAt(...)`.
- Fork bundle is itself forkable via `SessionReplayer.fromBundle(fork.bundle).forkAt(...)` (chained fork).

**IMPL:** None — purely integration assertion. If anything fails here, it's a regression in the existing layer.

**Gates:** typecheck + full `vitest run tests/session-fork-integration.test.ts` plus the full suite (`npm test`) and full gates (`typecheck && lint && build`). This is the final pre-commit checkpoint before invoking multi-CLI implementation review.

## 4. Documentation deliverables (per AGENTS.md)

Updated as part of the final commit batch:

- `docs/changelog.md` — new `0.8.12` entry: forkAt + ForkBuilder + Divergence + diffBundles + BundleDiff + new error classes; usage example; validation summary.
- `docs/devlog/summary.md` — one line.
- `docs/devlog/detailed/<latest>.md` — full task entry.
- `package.json` — version bump 0.8.11 → 0.8.12.
- `docs/api-reference.md` — new sections for `forkAt`, `ForkBuilder`, `Divergence`, `DivergenceCounts`, `CommandSequenceMap`, `diffBundles`, `BundleDiff`, `BundleTickDelta`, `ForkSubstitutionError`, `ForkBuilderConflictError`, `BuilderConsumedError`.
- `README.md` — Feature Overview row + Public Surface bullet for `forkAt`/`diffBundles`.
- `docs/guides/ai-integration.md` — short paragraph + code example showing how an agent uses `forkAt(...)` to test a counterfactual decision.
- `docs/architecture/decisions.md` — new ADR row referencing the seven design ADRs.
- `docs/threads/current/counterfactual-replay/` → `docs/threads/done/counterfactual-replay/` after the post-impl review closes.

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Recorder wrap timing — the wrap on `submitWithResult` is installed in `recorder.start()`. If we submit substitutions before `start()`, they aren't captured. | Step 5 IMPL strictly orders: `recorder.start()` first, then `forkBuilder` consumes the queued substitutions through `submitWithResult`. Test (e) in Step 5 verifies all four sequence-map fields populated. |
| `nextCommandResultSequence` magnitude — fork sequences start fresh from the rebuilt world's counter, which incremented through openAt's loop. They are NOT zero at `targetTick`. | Step 5 test asserts `commandSequenceMap.preserved[0].assignedSequence > 0` for any non-empty source bundle. Document via inline comment in `session-fork.ts`. |
| Snapshot-cadence misalignment — fork's recorder takes snapshots at `snapshotInterval`-aligned ticks measured from `targetTick`, not from the source's `startTick`. | Step 7's normalizer aligns `snapshots[]` by tick number and only compares matching-tick snapshots. Test asserts the byte-equivalence holds even when source has snapshots fork doesn't (e.g., source snapshot at tick 1000, fork starts at tick 500 with snapshot at tick 1500). |
| Memory: `BundleDiff.perTickDeltas` is O(N) for an N-tick bundle. | Document in DESIGN's §9 (already present); future streaming variant deferred to Q4. |
| TickDiff fold double-counting at snapshot boundaries — if we apply both the snapshot AND its tick's TickDiff, state would be wrong. | Step 10 IMPL: when crossing a snapshot boundary, RESET running state to the snapshot's value, then apply TickDiffs for ticks > snapshot.tick. Existing `SessionReplayer.openAt` already gets this right; reuse the same fold logic. |
| Fork-of-fork chained replay diverges from parent's replay — chained `forkAt(fork1.bundle)` re-replays fork1 from `fork1.metadata.startTick = targetTick1`, not from source's startTick. | Verified by ADR 1 (forks are normal SessionBundles) + Step 11 test (chained fork produces a valid bundle). |
| `world.submitWithResult` is wrapped by `SessionRecorder.start()` (`session-recorder.ts:163-172`); we need the wrap intact across forkAt's openAt-internal-replay → forkBuilder.run sequence. | Step 5 IMPL unwraps before openAt (otherwise openAt's submitWithResult calls during forward-replay would be captured by the source's recorder, which doesn't exist) — wait, openAt doesn't have a recorder; it just calls submitWithResult on the fresh world. So the unwrap concern is moot. But we DO need to confirm that openAt's invocations don't accidentally trigger a recorder hook from a stale wrap. Verify with a defensive test in Step 5: openAt's submitWithResult calls should NOT add commands to `bundle.commands` — only forkBuilder.run's recorder-time submitWithResult should. |

## 6. Ordering rationale

- Steps 1–2 are purely additive types/exports + the cheapest possible `forkAt` skeleton — get the export surface in early to avoid downstream API churn.
- Steps 3–4 build the synchronous chainable surface (no `run()` yet), so the conflict-rule semantics are nailed down before any execution happens.
- Step 5 is the load-bearing implementation of the substitution mechanism. Most likely place for bugs.
- Step 6 piggybacks on Step 5's data to compute `Divergence` — no new mechanism, just a comparison pass.
- Step 7 is the strongest invariant test — if substitution and recording are correct, the equivalence holds. Fail here → bug in Step 5.
- Steps 8–10 build `diffBundles` independently (consumes only `SessionBundle`s + the `CommandSequenceMap` shape).
- Step 11 ties the loop. Last because it depends on every prior step.

## 7. Multi-CLI implementation review (post-Step 11, pre-commit)

Per AGENTS.md, the full diff goes through Codex + Claude with the baseline prompt + diff-specific context including:
- Anti-regression checklist: existing recorder semantics, `openAt` precondition behavior, `MemorySink({ allowSidecar: true })` default still works without sidecar use, `runAgentPlaytest` still produces the same bundle shape (untouched in this work).
- Doc-accuracy checklist: api-reference.md sections for every new export, no stale references to removed/renamed APIs (none in this diff), changelog narrative matches behavior.
- Boundary checklist: no file > 500 LOC; if `session-fork.ts` is over, split before commit.
- Performance: Step 10's O(N) hydration fold; Step 6's per-tick comparison pass.

After review, address findings, re-run gates, re-review until reviewers nitpick. Commit when consensus.

## 8. Open questions for the plan reviewer

1. **Step 2: should `forkAt` eagerly call `openAt` or defer until `run()`?** Plan says eager (because `.snapshot()` needs the world). Alternative: lazy with `.snapshot()` returning a fresh openAt result. Eager is simpler and matches DESIGN's intent. Confirm.
2. **Step 6 implementation pass placement: walk during run() or post-run?** Plan says post-run (read both bundles after recorder finalizes). Trade-off: simpler vs. one extra full pass through fork bundle. Likely fine since divergence is a once-per-fork operation. Confirm.
3. **Step 10 hydration fold: extract a shared helper from `SessionReplayer.openAt` or duplicate?** Plan says extract. The existing fold logic in `openAt` is private; promoting it to a `hydrateStateAtTick(bundle, t)` named export is a small refactor. Reviewer should verify this doesn't break `openAt`'s existing tests.
