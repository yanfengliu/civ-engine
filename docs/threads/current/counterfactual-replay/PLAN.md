# Counterfactual Replay / Fork — Implementation Plan

**Status:** Draft v3 (2026-04-29). For DESIGN.md v4 (Accepted). civ-engine roadmap Spec 5. Awaiting plan-3 review.

**v3 deltas vs v2:** addresses iter-2 review (Codex + Claude convergent ITERATE on H1/H2 + 1 MEDIUM + 1 Claude-only MEDIUM):
- **H1 (rng-mismatch in bundleSlice):** Step 7's `bundleSlice` rebuilds `initialSnapshot` via `replayer.openAt(midTick).serialize()` (= `replayer.stateAtTick(midTick)`), NOT `applyTickDiff`. Reason: TickDiff doesn't carry rng/componentOptions/config (`snapshot-diff.ts:14-21` excludes them); folding via `applyTickDiff` from a preceding source snapshot keeps stale rng, while the fork's `initialSnapshot` (written by `recorder.connect()` after openAt's loop) has evolved rng. Same code path the fork uses — rng matches by construction. Side effect: Step 7 no longer depends on Step 10a; ordering reverts to `1, 2, 3, 4, 5, 6, 7, 8, 9, 10a, 10b, 11`. `applyTickDiff` (Step 10a) remains needed for Step 10b's state-diff fold via `diffSnapshots`, where rng is excluded by design.
- **H2 (tick numbering inconsistency):** Plan now uses **submission-tick numbering** throughout `Divergence`/`perTickCounts` references, matching DESIGN's public contract (DESIGN §4 Divergence doc-comment: "Substitutions at targetTick count as divergence at targetTick"; DESIGN §6 row: "[targetTick, T_fail - 1]"). Test descriptions in Step 6 reference submission-tick numbering. The implementation accumulates per-tick deltas via the existing `SessionTickEntry.tick` field (= TickDiff.tick = submissionTick + 1) but EXPOSES them keyed by submission-tick (= SessionTickEntry.tick - 1) so the public `Divergence.perTickCounts` matches the contract.
- **M1 (untilTick === targetTick degenerate):** Step 5 (g) now requires `untilTick > targetTick`. Equality is rejected with `RangeError` because the substitute-and-step semantics forces world.tick to advance past targetTick before the continuation loop runs. Rationale documented in Step 5's "untilTick semantic" subsection.
- **M2 (Step 6 (h) range off by one):** plan said `[targetTick + 1, T_fail]` (TickDiff.tick numbering); on tick failure, `finalizeTickFailure` short-circuits before `gameLoop.advance` and before diff-listener emission, so no TickDiff fires for T_fail. Corrected to `[targetTick, T_fail - 1]` in submission-tick numbering (matching DESIGN §6).
- **L1 (numbering wording):** Step 5 (j) and Step 6 (i) clarified to use submission-tick numbering consistently; "(submission-tick numbering)" annotation added wherever a range is given.
- **L2 (Step 10a destroyed-before-created):** explicit pin in Step 10a IMPL — apply destroyed first (mark not-alive, free slot, generation unchanged), then created (mark alive, increment generation if recycling).

**v2 deltas vs v1:** addresses iter-1 review (Codex + Claude both ITERATE — convergent on H1/H2):

**v2 deltas vs v1:** addresses iter-1 review (Codex + Claude both ITERATE — convergent on H1/H2):
- **H1:** `recorder.start()` → `recorder.connect()` everywhere. Plus `lastError` guard after connect (matching `runSynthPlaytest`/`runAgentPlaytest`).
- **H2:** Step 10 reworked. `openAt` does forward-replay via `worldFactory + submitWithResult`, NOT TickDiff folding. There is no existing `applyTickDiff(snapshot, diff): WorldSnapshot` helper. New Step 10a introduces that helper as a net-new piece over all six TickDiff dimensions. Step 10b is the `diffBundles` state-fold consumer.
- **Off-by-one (Codex H#1):** Step 5 IMPL bullet 6 loop condition fixed. The continuation loop runs `while world.tick < untilTick` (i.e., `for t = targetTick + 1; t < untilTick; t++`, exclusive upper bound). `untilTick` is interpreted matching `openAt`'s contract: the desired `world.tick` at run end (= bundle.endTick). For `forkAt(5).run({ untilTick: source.persistedEndTick = 10 })`, the fork processes submission-ticks `5..9` (5 step()s), produces TickDiff.tick `6..10`, and ends with `world.tick = 10`, matching source's slice over `[5, 10]`.
- **Commit cadence:** Spec 5 is one coherent shipped change → ONE commit + ONE version bump (`0.8.11 → 0.8.12`) at the end. Per-step "checkpoints" in this plan are local TDD milestones, NOT commits. Affected-suite gates run per checkpoint; the full gate (`npm test && typecheck && lint && build`) runs once before the final commit + multi-CLI implementation review.
- **Step 5/6 split (Claude M1):** Step 5 returns `Divergence` with `commandSequenceMap` populated and other fields as empties; Step 6 fills `firstDivergentTick`, `perTickCounts`, `equivalent`. Test (h)'s `perTickCounts` assertion moved to Step 6.
- **Test coverage gaps (Codex M3):** added cases for `untilTick > source.persistedEndTick` and validator-rejected substitution / changed acceptance outcome in both inline divergence and `diffBundles`.
- **Step 11 harness (Claude M2):** switched to `runSynthPlaytest` per DESIGN §8.
- **policySeed propagation (Claude L2):** explicit "no policySeed" in Step 5 IMPL recorder construction.
- **Risks row 7 (Claude L1):** rewritten to conclusion + defensive test; stream-of-consciousness removed.

**Author:** civ-engine team.

**Target version:** civ-engine `0.8.11 → 0.8.12` (c-bump per AGENTS.md, additive surface).

## 1. Overview

Land Spec 5 in 12 ordered TDD checkpoints. The full diff lands as ONE commit on `main` (per AGENTS.md "one version bump per coherent shipped change"); per-checkpoint progression is internal to the working tree and uses focused vitest suites for tight feedback. The full gate (`npm test && npm run typecheck && npm run lint && npm run build`) runs once before the final commit + multi-CLI implementation review.

The ordering is bottom-up: types and errors first, then the substitution mechanism, then divergence accumulator, then `diffBundles`. The equivalence test (Step 7) is the load-bearing milestone. The `applyTickDiff` helper (Step 10a) is the largest new piece by LOC; it gets its own checkpoint so it can be reviewed standalone.

## 2. File layout

```
src/
  session-fork.ts             ← NEW (~450 LOC budget; split if past 500)
  session-bundle-diff.ts      ← NEW (~400 LOC)
  apply-tick-diff.ts          ← NEW (~250 LOC; the snapshot-folding helper)
  session-replayer.ts         ← MODIFY (add forkAt, ~30 LOC delta)
  index.ts                    ← MODIFY (~15 LOC of new exports)

tests/
  session-fork.test.ts             ← NEW
  session-fork-equivalence.test.ts ← NEW (with the bundle normalizer helper)
  session-bundle-diff.test.ts      ← NEW
  apply-tick-diff.test.ts          ← NEW
  session-fork-integration.test.ts ← NEW (full RSI loop)
```

Budgeted production ~1100 LOC + tests ~1000 LOC. Per AGENTS.md "no file > 500 LOC" — if `session-fork.ts` approaches 500 we split out `session-fork-divergence.ts` (the inline accumulator) and `session-fork-builder.ts` (the chainable API). Decide at Step 6 once the substitution mechanism is in.

## 3. Step-by-step

Each checkpoint has a TEST line (the failing test that captures the contract) and an IMPL line (the production change to make it pass). Per-checkpoint gates: `vitest run <affected files>` + `npm run typecheck`. Lint and full gate run once at the end.

### Step 1 — Types + error classes (no behavior)
**TEST:** `tests/session-fork.test.ts` — import-only smoke test that asserts the new exports exist with the expected shapes (`ForkBuilder`, `ForkResult`, `Divergence`, `DivergenceCounts`, `CommandSequenceMap`, `ForkRunConfig`, `ForkSubstitutionError`, `ForkBuilderConflictError`, `BuilderConsumedError`).

**IMPL:** `src/session-fork.ts` types and error classes (no `forkAt` yet, no `ForkBuilder` impl). `src/index.ts` re-exports.

### Step 2 — `SessionReplayer.forkAt` skeleton + preconditions
**TEST:** `tests/session-fork.test.ts` —
- `replayer.forkAt(targetTick)` returns a `ForkBuilder`.
- Precondition errors: out-of-range, replay-across-failure, no-payload, incomplete-beyond-persistedEndTick — same shape as `openAt`'s tests.

**IMPL:** Extract `validateOpenAtTick(targetTick): void` from `openAt`'s precondition checks (private helper). `forkAt` calls it, then `openAt(targetTick)` eagerly to materialize the paused world (because `.snapshot()` requires it; alternative lazy-build was considered and rejected — eager pays the openAt cost once where the user expects it). Stores the world inside the builder constructor.

**Reasoning for eager openAt:** confirmed by plan-1 reviewers as sound. `.snapshot()` is a pre-`run()` operation and needs a materialized world; lazy build would either re-do the openAt cost on each `.snapshot()` or cache an eager result on first call. Eager just chooses where to pay the intrinsic cost.

### Step 3 — `ForkBuilder.snapshot()`
**TEST:** `tests/session-fork.test.ts` — `builder.snapshot()` returns a `WorldSnapshot` with `tick === targetTick`; calling twice produces equal-but-distinct snapshots; values match `replayer.openAt(targetTick).serialize()`.

**IMPL:** `ForkBuilder.snapshot()` calls `world.serialize()`. Throws `BuilderConsumedError` if called after `.run()`.

### Step 4 — `replace`/`insert`/`drop` builder ops + conflict rules
**TEST:** `tests/session-fork.test.ts` —
- replace/drop with unknown sequence → `ForkSubstitutionError`.
- duplicate replace / duplicate drop / replace+drop on same seq → `ForkBuilderConflictError` with appropriate codes.
- replace/drop of source-rejected command (`result.accepted: false`) → allowed, no throw.
- multi-insert preserves FIFO order (recorded in builder-internal `inserts` array).
- ops-after-run → `BuilderConsumedError`.
- chainable returns (each op returns the builder).

**IMPL:** Internal `Map<originalSequence, 'replaced' | 'dropped'>` enforces conflicts synchronously. Inserts in a separate `Array`. Lookups against precomputed source-commands-at-targetTick (built once in `forkAt`). `consumed` flag checked at every public method.

### Step 5 — `ForkBuilder.run()` substitution mechanism (Divergence with empty per-tick fields)
**TEST:** `tests/session-fork.test.ts` —
- (a) No-substitution `run({ untilTick: source.metadata.endTick })` returns a `ForkResult` whose `bundle.commands.length` matches the count of source commands with `submissionTick` in `[targetTick, source.metadata.endTick - 1]` (the `< untilTick` range; see "untilTick semantic" below).
- (b) Substituted command (replace) appears in fork bundle at `submissionTick = targetTick`; old command's payload absent.
- (c) Inserted command appears at `submissionTick = targetTick` AFTER all source commands at that tick.
- (d) Dropped command absent from fork bundle.
- (e) `divergence.commandSequenceMap.{replaced, inserted, dropped, preserved}` populated with correct shape; assigned-sequence values are integers `>= 0` and monotonic per fork tick.
- (f) Calling `.run()` twice → `BuilderConsumedError`.
- (g) `run({ untilTick: targetTick })` and `run({ untilTick: targetTick - 1 })` → `RangeError`. (Equality is degenerate: the substitute-and-step in Step 5 IMPL bullet 6 unconditionally advances `world.tick` to `targetTick + 1`, so `untilTick === targetTick` cannot end with `world.tick === targetTick` — the contract requires `untilTick > targetTick`.)
- (h) Mid-fork handler-failure (some tick T_fail throws `WorldTickFailureError`): `bundle.metadata.failedTicks` populated; `bundle.failures[]` non-empty; `run()` does NOT rethrow. Per `world.ts:1716-1763`, `finalizeTickFailure` short-circuits BEFORE `gameLoop.advance` and BEFORE diff-listener emission, so no SessionTickEntry is written for T_fail. (`Divergence.perTickCounts` shape assertions deferred to Step 6 (h).)
- (i) `recorder.lastError` non-null after `connect()` causes `run()` to throw the captured error (matching `runSynthPlaytest:208-214`).
- (j) `run({ untilTick > source.metadata.endTick })` continues forward beyond source range; bundle `endTick > source.endTick`. Inline `Divergence.perTickCounts` only covers submission-ticks `[targetTick, source.metadata.endTick - 1]` (the source-overlap range; ticks past it are `forkOnly`-shaped data but not divergence-counted, no source to compare). (`perTickCounts` content deferred to Step 6 (i).)

**untilTick semantic:** matching `openAt`'s contract, `untilTick` is the desired `world.tick` at run end (= `bundle.metadata.endTick`). Required: `untilTick > targetTick`. The continuation loop runs `while world.tick < untilTick`. Equivalently: `for t = targetTick + 1; t < untilTick; t++ { submit_source_at_t; world.step(); }`. This means the fork's last submission-tick is `untilTick - 1`, which matches source's slice over `[targetTick, untilTick]`.

**Tick numbering note (load-bearing for Step 6):** `world.step()` advances `world.tick` from T to T+1 and emits a `TickDiff` with `tick = T+1`. The recorder writes a `SessionTickEntry` with `tick = TickDiff.tick = T+1`. Commands submitted via `submitWithResult` while `world.tick === T` get `submissionTick = T` (per `getObservableTick()` at `src/world.ts:1472-1479`). So one step processes "submission-tick T" and produces "SessionTickEntry.tick = T+1". DESIGN's public `Divergence.perTickCounts` is keyed by submission-tick (= TickDiff.tick - 1); the implementation accumulates deltas walking `SessionTickEntry`s and re-keys for the public contract.

**IMPL:** `run()` does:
1. Materialize the configured (or default) sink: `new MemorySink({ allowSidecar: true })`.
2. Construct fresh `SessionRecorder` with `sourceKind: 'synthetic'`, `sourceLabel: config.sourceLabel ?? \`counterfactual-fork-of-${source.metadata.sessionId}@${targetTick}\``. **No `policySeed`** (different lineage; per DESIGN §7 normalizer).
3. `recorder.connect()`. Check `recorder.lastError` immediately (matching `runSynthPlaytest:207-214` and `runAgentPlaytest:169-172`); if non-null, `recorder.disconnect()` (best-effort) and rethrow the captured error.
4. Walk the source bundle's commands at `submissionTick === targetTick` in `originalSequence` order:
   - In dropped set → skip.
   - In replaced map → `world.submitWithResult(replacement.type, replacement.data)`; record `{tick: targetTick, originalSequence, assignedSequence: result.sequence}` in `commandSequenceMap.replaced`.
   - Otherwise → `world.submitWithResult(rc.type, rc.data)`; record `{tick: targetTick, originalSequence, assignedSequence: result.sequence}` in `commandSequenceMap.preserved`.
5. After source commands, submit inserts in builder-call order: `world.submitWithResult(insert.type, insert.data)`; record `{tick: targetTick, assignedSequence: result.sequence}` in `commandSequenceMap.inserted`.
6. `world.step()`. Recorder's diff/execution listeners fire and capture the targetTick TickDiff.
7. Continuation loop: `while world.tick < untilTick { for each source command at submissionTick === world.tick: world.submitWithResult(rc.type, rc.data); try { world.step() } catch (WorldTickFailureError) { break } }`. (Recorder captures everything via the `submitWithResult` wrap installed by `connect()`.)
8. `recorder.disconnect()`. Returns `ForkResult { bundle: sink.toBundle(), divergence: { firstDivergentTick: null, perTickCounts: new Map(), commandSequenceMap, equivalent: false }, source: sink }`. `equivalent` and `firstDivergentTick` will be backfilled in Step 6.

The `consumed` flag is set on `run()` entry (or in a try/finally to handle the failure-mid-run case correctly).

**Note:** `sink.toBundle()` is the actual reader API (per `MemorySink` in `src/session-sink.ts`); my v1 plan said `readBundle` which doesn't exist.

### Step 6 — Inline `Divergence` accumulator
All tick references below are in **submission-tick numbering**, matching DESIGN's public `Divergence.perTickCounts` contract.

**TEST:** `tests/session-fork.test.ts` —
- (a) No-substitution: `divergence.firstDivergentTick === null`, `equivalent === true`, `perTickCounts` empty.
- (b) Replace causes downstream event delta: `firstDivergentTick === targetTick` (substitution at submission-tick `targetTick` counts as divergence at `targetTick`); `perTickCounts.get(targetTick).commandsChanged >= 1`. Later submission-ticks may also have entries.
- (c) Drop produces `perTickCounts.get(targetTick).commandsSourceOnly === 1`.
- (d) Insert produces `perTickCounts.get(targetTick).commandsForkOnly === 1`.
- (e) Same-payload event emitted at fork that source didn't → `perTickCounts.get(t).eventsForkOnly === 1` for the appropriate submission-tick `t`; vice versa → `eventsSourceOnly === 1`.
- (f) Validator-rejected substituted command (replace whose new payload validator rejects) → `perTickCounts.get(targetTick).commandsChanged === 1`. The recorded `RecordedCommand.result.accepted` differs across source (true) and fork (false) at the matching original/assigned sequence pair.
- (g) Acceptance flip due to state divergence (a replace causes a later command's validator to flip its accept/reject) → `perTickCounts.get(t_flip).commandsChanged === 1` at the affected submission-tick.
- (h) Mid-fork handler-failure at submission-tick `T_fail`: `Divergence.perTickCounts` only has entries with keys in `[targetTick, T_fail - 1]`. (No SessionTickEntry exists for `T_fail` per `world.ts:1716-1763`'s pre-advance failure path; the divergence accumulator can only key off ticks the recorder wrote.)
- (i) `untilTick > source.metadata.endTick`: `Divergence.perTickCounts` covers submission-ticks in `[targetTick, source.metadata.endTick - 1]` only. Submission-ticks past `source.metadata.endTick - 1` are not divergence-counted (no source to compare). `firstDivergentTick` is `null` if no actual divergence in the overlapping range.

**IMPL:** `computeInlineDivergence(sourceBundle, forkBundle, commandSequenceMap, overlapTickRange)` reads both bundles after `recorder.disconnect()` and walks both per `SessionTickEntry`. The walk is keyed by `SessionTickEntry.tick` (= TickDiff.tick = submissionTick + 1) but stores per-tick deltas in the public-contract `perTickCounts` map keyed by `submissionTick = SessionTickEntry.tick - 1`:
- At the SessionTickEntry with `tick === targetTick + 1` (the entry produced by stepping submission-tick `targetTick`): use `commandSequenceMap` to align commands. Inserts → `forkOnly`. Drops → `sourceOnly`. Preserved+replaced (matched via originalSequence/assignedSequence) → check payload+result equivalence; differing → `changed`. Store the count under `perTickCounts.set(targetTick, ...)`.
- At SessionTickEntries with `tick > targetTick + 1`: align by per-tick submission-order index. Store under `perTickCounts.set(SessionTickEntry.tick - 1, ...)`.
- Events at every tick: align by per-tick submission-order index.
- Compute `firstDivergentTick = min(t in perTickCounts.keys())` or `null`.
- `equivalent = firstDivergentTick === null`.

Backfill `divergence` fields in the `ForkResult` after this pass.

### Step 7 — Equivalence test (the load-bearing checkpoint)
**TEST:** `tests/session-fork-equivalence.test.ts` — for each of several source bundles (prototype game, multi-tick events, agent-driven, periodic snapshots): `forkAt(midTick).run({ untilTick: source.metadata.endTick })` with no substitution → assert `divergence.equivalent === true` AND `normalizeBundle(forkBundle)` byte-equals `normalizeBundle(bundleSlice(sourceBundle, midTick, source.endTick))`.

`normalizeBundle(bundle, options)` test helper:
- Replaces `metadata.{sessionId, recordedAt, sourceKind, sourceLabel, startTick, endTick, persistedEndTick, durationTicks, policySeed}` with stable placeholders.
- For each `commands[i]`: replaces `sequence` and `result.sequence` with the rebased index `i`.
- For each `executions[i]`: replaces `submissionSequence` with the rebased index.
- For each `ticks[i]`: replaces `metrics` with `null`.
- Strips `markers` and `attachments`.
- Aligns `snapshots[]` by tick; drops snapshots not present on both sides.

`bundleSlice(bundle, fromTick, toTick)` test helper produces a `SessionBundle`-shaped object covering ticks where `submissionTick` is in `[fromTick, toTick - 1]` (commands), `SessionTickEntry.tick` is in `[fromTick + 1, toTick]` (ticks), and snapshots in `[fromTick, toTick]`. It rebuilds `initialSnapshot` via `replayer.openAt(fromTick).serialize()` (= `replayer.stateAtTick(fromTick)` per `src/session-replayer.ts:242-244`) — same code path the fork's `recorder.connect()` writes from, so rng evolution matches by construction.

**Why not `applyTickDiff` for `initialSnapshot`?** TickDiff doesn't carry rng/componentOptions/config (`snapshot-diff.ts:14-21` excludes them); folding from a preceding source snapshot would keep stale rng while the fork's actual `initialSnapshot` has rng evolved through openAt's loop. `replayer.openAt(fromTick).serialize()` is the same forward-replay the fork uses, guaranteeing match.

**IMPL:** No production change — Step 5+6 should already pass. If not, debug.

### Step 8 — `diffBundles` skeleton (no per-tick deltas yet)
**TEST:** `tests/session-bundle-diff.test.ts` —
- Identical bundles → `equivalent: true`, empty `perTickDeltas`, empty `metadataDeltas`.
- Bundles with different `metadata.sessionId` → `metadataDeltas` populated; `equivalent` unaffected (per ADR 7).
- Bundles with different markers → `markersDeltas` populated; `equivalent` unaffected.
- Bundles with different attachments → `attachmentsDeltas` populated; `equivalent` unaffected.

**IMPL:** `src/session-bundle-diff.ts` — `diffBundles(a, b, options?): BundleDiff`. Per-tick deltas populated as empties for now (state diff comes in Step 10b). `metadataDeltas` from per-field `a.metadata` vs `b.metadata` comparison. `markersDeltas` keyed by `Marker.id`; `attachmentsDeltas` keyed by `AttachmentDescriptor.id`.

### Step 9 — `diffBundles` per-tick command + event alignment
**TEST:** `tests/session-bundle-diff.test.ts` —
- Source-vs-fork (with substitution) using `commandSequenceMap`: at TickDiff.tick = targetTick+1, replace → `changed`; insert → `forkOnly`; drop → `sourceOnly`. At later ticks, downstream effects show as appropriate buckets.
- Source-vs-fork without `commandSequenceMap`: per-tick submission-order index fallback; duplicate same-type same-data may show as `changed` under index swap (best-effort, document via test comment).
- Symmetry without map: `diffBundles(a, b)` and `diffBundles(b, a)` produce mirror-image deltas.
- Asymmetry with map: swapping `a` and `b` produces wrong alignment (regression test for the documented constraint).
- Events alignment by per-tick submission-order index. Trailing-extras rule: extras in shorter list become sourceOnly/forkOnly.
- Type mismatch at same index for events → split into sourceOnly+forkOnly (not `changed`, since changed implies same type).

**IMPL:** Extend `diffBundles` per §4.3. At `targetTick + 1` use the map; everywhere else use per-tick index. Length mismatch → trailing extras to sourceOnly/forkOnly. Events align by index throughout.

### Step 10a — `applyTickDiff(snapshot, diff): WorldSnapshot` helper
**TEST:** `tests/apply-tick-diff.test.ts` —
- For each of the six TickDiff dimensions (entities created/destroyed, components set/removed per type, resources, state, tags, metadata):
  - Apply a diff against a fresh empty snapshot → produces snapshot with the additions.
  - Apply a diff against a snapshot containing prior values → produces snapshot with overlays applied (set replaces, removed drops).
- Round-trip: `diffSnapshots(applyTickDiff(snapA, d), snapB)` is empty when `d = diffSnapshots(snapA, snapB)` (assuming snapA, snapB are valid snapshots).
- Edge cases: empty diff is a no-op; recycling-generation entity (destroyed AND created in same diff) handled correctly.
- Dimensions not touched by the diff (e.g., `rng`, `componentOptions`, `config`) are passed through unchanged from the input snapshot.

**IMPL:** `src/apply-tick-diff.ts` — `applyTickDiff(snapshot: WorldSnapshot, diff: TickDiff): WorldSnapshot` returns a new snapshot. Fold over each dimension:
- `entities`: apply **destroyed first** (mark not-alive in `alive[]`, push id to `freeList[]`, leave `generations[id]` unchanged), **then created** (set `alive[id] = true`, increment `generations[id]` if the slot was being recycled, pop id from `freeList[]`). Order matters for recycled entities — `diffEntities` in `snapshot-diff.ts:66-78` surfaces recycling as both destroyed AND created with same id (different generation). Reverse order would leave the entity dead.
- `components`: for each type, apply set (overwrite/insert) and removed (delete).
- `resources`: apply per-pool set/removed.
- `state`: apply set/removed.
- `tags`: apply per-entity set/removed.
- `metadata`: apply per-entity set/removed.

Pass-through fields: `version`, `config`, `rng`, `componentOptions`. `tick` field set to `diff.tick`.

This is a NEW helper — there is no existing fold to extract. Per Codex H#2 / Claude H2.

### Step 10b — `diffBundles` state-diff fold
**TEST:** `tests/session-bundle-diff.test.ts` —
- State-only divergence (substitution that changes a resource without changing event/command shape) → `BundleTickDelta.stateDiff.resources` populated; commands/events deltas empty.
- Component-only divergence → `stateDiff.components` populated.
- Identical bundles (post-normalizer) → all six `stateDiff` dimensions empty at every tick.
- Hydrated state at tick T matches `replayer.openAt(T).serialize()` (within the normalizer's invariants — same components, resources, state, tags, metadata).

**IMPL:** `hydrateStateAtTick(bundle, t)` walks `initialSnapshot` + closest preceding entry in `bundle.snapshots[]` + per-tick `bundle.ticks[].diff` from that snapshot to t, applying each via `applyTickDiff`. Optimization: `diffBundles` walks both bundles' tick streams in lockstep, maintaining running state per side and updating per-tick. Reset to nearest snapshot when crossing a snapshot boundary. O(N) total per side.

`stateDiff = diffSnapshots(hydrateStateAtTick(a, t), hydrateStateAtTick(b, t))` per tick.

### Step 11 — Integration test (full RSI loop)
**TEST:** `tests/session-fork-integration.test.ts` —
- `runSynthPlaytest` produces source bundle (per DESIGN §8).
- `replayer.fromBundle(sourceBundle).forkAt(midTick).replace(...).run({ untilTick: source.metadata.endTick })` produces fork bundle.
- `diffBundles(source, fork.bundle, { commandSequenceMap: fork.divergence.commandSequenceMap })` reports the substituted command's downstream effect across commands, events, and state.
- Fork bundle is itself replayable: `SessionReplayer.fromBundle(fork.bundle).openAt(...)` succeeds.
- Fork bundle is itself forkable: chained fork via `forkAt(...).run(...)` succeeds.

**IMPL:** None — purely integration assertion.

## 4. Documentation deliverables (per AGENTS.md)

Updated as part of the final commit batch:

- `docs/changelog.md` — new `0.8.12` entry: forkAt + ForkBuilder + Divergence + diffBundles + BundleDiff + applyTickDiff + new error classes; usage example; validation summary.
- `docs/devlog/summary.md` — one line.
- `docs/devlog/detailed/<latest>.md` — full task entry.
- `package.json` — version bump 0.8.11 → 0.8.12.
- `docs/api-reference.md` — sections for `forkAt`, `ForkBuilder`, `Divergence`, `DivergenceCounts`, `CommandSequenceMap`, `diffBundles`, `BundleDiff`, `BundleTickDelta`, `applyTickDiff`, `ForkSubstitutionError`, `ForkBuilderConflictError`, `BuilderConsumedError`.
- `README.md` — Feature Overview row + Public Surface bullet for `forkAt`/`diffBundles`.
- `docs/guides/ai-integration.md` — short paragraph + code example for agents using `forkAt(...)`.
- `docs/architecture/decisions.md` — new ADR row referencing the seven design ADRs.
- `docs/threads/current/counterfactual-replay/` → `docs/threads/done/counterfactual-replay/` after the post-impl review closes.

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Recorder wrap timing — the wrap on `submitWithResult` is installed in `recorder.connect()` (`src/session-recorder.ts:163-172`). Substitutions submitted before `connect()` aren't captured. | Step 5 IMPL strictly orders: `recorder.connect()` first (with `lastError` guard), then forkBuilder consumes the queued substitutions through `submitWithResult`. Test (e) verifies all four `commandSequenceMap` slots populated. |
| `nextCommandResultSequence` magnitude — fork sequences start fresh from the rebuilt world's counter, which incremented through openAt's loop. They are NOT zero at `targetTick`. | Step 5 test (e) asserts `commandSequenceMap.preserved[0].assignedSequence > 0` for any non-empty source bundle. Document via inline comment in `session-fork.ts`. |
| Snapshot-cadence misalignment — fork's recorder takes snapshots at `snapshotInterval`-aligned ticks measured from `targetTick`, not from source's `startTick`. | Step 7 normalizer aligns `snapshots[]` by tick number; only matches matching-tick snapshots. Test asserts byte-equivalence holds even when source has snapshots fork doesn't. |
| Memory: `BundleDiff.perTickDeltas` is O(N). | Documented in DESIGN §9; future streaming variant deferred (DESIGN §11 Q1). |
| TickDiff fold boundary — at a snapshot tick, naive double-application (snapshot AND its tick's TickDiff) overwrites correct state. | Step 10b: when crossing a snapshot boundary, RESET running state to the snapshot's value, then apply TickDiffs for ticks > `snapshot.tick`. `applyTickDiff` itself never assumes the snapshot is the starting point; it just folds the delta. |
| Fork-of-fork chained replay — chained `forkAt(fork1.bundle)` re-replays fork1 from `fork1.metadata.startTick = targetTick1`, not from source's startTick. | ADR 1 (forks are normal bundles); Step 11 test exercises chained fork. |
| Recorder wrap collision on the openAt-internal world — `openAt` builds a fresh world via `worldFactory(snapshot)`; that world has no prior `__payloadCapturingRecorder` (`src/session-recorder.ts:126-130` enforces single-recorder). Substitutions submitted via the fork's recorder won't collide. | Defensive test in Step 5: confirm the openAt phase's `submitWithResult` calls (during forward-replay before `recorder.connect()`) do NOT add commands to the fork's bundle. Only post-`connect()` submissions should appear. |
| `applyTickDiff` correctness — six dimensions, including entity recycling and tag/metadata edge cases. New helper, no prior precedent in the codebase. | Step 10a's dedicated test file with round-trip property (`diffSnapshots(applyTickDiff(a, d), b)` is empty when `d = diffSnapshots(a, b)`) plus per-dimension unit tests. The round-trip property is the strongest correctness check; if it holds for every fixture, the helper is sound. |
| `untilTick` semantic mismatch — `openAt`'s contract is "world.tick at completion." `run({ untilTick })` mirrors this: world.tick = untilTick at end. The continuation loop is `while world.tick < untilTick`. | Documented in Step 5 ("untilTick semantic"). Equivalence test (Step 7) directly exercises `untilTick = source.metadata.endTick` and asserts byte-equivalence. |

## 6. Ordering rationale

Final ordering (revised v3 — reverted from v2's reorder since Step 7 no longer depends on Step 10a): `1, 2, 3, 4, 5, 6, 7, 8, 9, 10a, 10b, 11`.

- Steps 1–4: types + chainable surface, no execution.
- Step 5: load-bearing substitution mechanism (most likely place for bugs).
- Step 6: divergence accumulator (post-run pass over Step 5's output).
- Step 7: equivalence test — uses `replayer.openAt(fromTick).serialize()` for `bundleSlice.initialSnapshot` so rng matches by construction; no dependency on `applyTickDiff`.
- Steps 8–9: `diffBundles` skeleton + command/event alignment (uses session-bundle data only, no state hydration).
- Step 10a: `applyTickDiff` helper. Net-new code; warrants its own checkpoint with dedicated tests. Required by Step 10b only.
- Step 10b: `diffBundles` state-diff fold — uses Step 10a's `applyTickDiff` to hydrate per-tick states. `diffSnapshots` (the consumer of the hydrated states) excludes rng/componentOptions/config by design (`snapshot-diff.ts:14-21`), so the partial-hydration limitation of `applyTickDiff` is safe in this consumer.
- Step 11: integration test, depends on every prior step.

## 7. Multi-CLI implementation review (post-Step 11, pre-commit)

Per AGENTS.md, the full diff goes through Codex + Claude with the AGENTS.md baseline prompt + diff-specific context including:
- Anti-regression checklist: existing recorder semantics (especially `connect()` + `submitWithResult` wrap), `openAt` precondition behavior, `MemorySink({ allowSidecar: true })` default still works without sidecar use, `runSynthPlaytest`/`runAgentPlaytest` still produce the same bundle shape.
- Doc-accuracy checklist: api-reference.md sections for every new export; no stale references to removed/renamed APIs (none in this diff); changelog narrative matches behavior.
- Boundary checklist: no file > 500 LOC; if any approach the limit, split before commit.
- Performance: Step 10b's O(N) hydration fold; Step 6's per-tick comparison pass.

After review, address findings, re-run gates, re-review until reviewers nitpick. Single commit when consensus.

## 8. Open questions for plan-2 reviewer

1. **Is `apply-tick-diff.ts` the right home for the helper, or should it live in `snapshot-diff.ts`?** Symmetry argument: `diffSnapshots(a, b)` lives there; `applyTickDiff(snap, diff)` is its inverse. Counter-argument: `snapshot-diff.ts` is intentionally the diff-producer; combining producer+consumer increases its surface. Plan: separate file. Confirm.
2. **Should `applyTickDiff` be exported publicly, or stay internal?** v2 leaned public; v3 leans **internal** because the helper produces a partial-hydration snapshot (no rng/componentOptions evolution). External consumers reaching for "snapshot at tick N" should use `replayer.openAt(N).serialize()` (= `replayer.stateAtTick(N)`), which evolves rng correctly. `applyTickDiff` is safe ONLY when the consumer is `diffSnapshots`, which excludes rng by design. Plan: keep internal (not exported from `src/index.ts`). Confirm.
3. **`bundleSlice` test helper lives in `tests/session-fork-equivalence.test.ts` or a shared `tests/test-utils/bundle-slice.ts`?** Used only by Step 7 currently. Plan: keep it in the test file unless Step 11 needs it too.
