# Counterfactual Replay / Fork — Implementation Plan

**Status:** Draft v5 (2026-04-29). For DESIGN.md v4 (Accepted). civ-engine roadmap Spec 5. Awaiting plan-5 review.

**v5 deltas vs v4:** addresses iter-4 review (Codex 3 HIGHs + 2 MEDIUMs; Claude 1 MEDIUM + 4 NITs):
- **HIGH (entity-create IMPL ID sourcing):** Step 10a entity-create wording was misleading — `TickDiff.entities.created` carries **explicit IDs** (`src/diff.ts:9`, populated sorted ascending by `src/snapshot-diff.ts:64-78`). v4 said "pop from freeList else extend," which would discard the diff's IDs and produce wrong `alive[]`/`freeList` state when `snapA.freeList` holds IDs that don't match the diff's `created[]` order. v5 IMPL: for each `id` in `diff.entities.created`, use that exact id — set `alive[id] = true`, remove `id` from `freeList` if present, extend arrays up to `id+1` if needed (init new slots `gen=0`).
- **HIGH (empty tags/metadata):** engine deletes empty tag/meta maps as cleanup (`src/world.ts:1499-1527, 1609-1621`); snapshots with tag/meta keys for dead entities are invalid on deserialize (`src/world.ts:1097-1129`). v4 said "set `snapshot.tags[entity] = tags`" which would persist `{entity: id, tags: []}` as a noncanonical entry. v5 IMPL: if `entry.tags.length === 0`, delete `snapshot.tags[entity]`; otherwise set wholesale. Same for metadata: if `Object.keys(entry.meta).length === 0`, delete; else set wholesale.
- **HIGH (pre-advance command divergence missed):** v4's Step 6 walked only `SessionTickEntry`s for divergence accumulation. But commands are recorded at submission time BEFORE `world.step()` (`src/session-recorder.ts:162-172, 459-476`). A substituted command that throws on `world.step()` (pre-advance handler-failure) is still recorded in `bundle.commands[]` at `submissionTick = T_fail`, even though no SessionTickEntry exists at T_fail. v4's accumulator would silently miss this and report `equivalent: true` for a fork that's clearly divergent. v5 Step 6 IMPL: in addition to walking SessionTickEntries, also walk `bundle.commands[]` partitioned by `submissionTick`. For ticks ≤ T_fail (or ≤ untilTick - 1) that have no matching SessionTickEntry, still account for command-stream divergence by aligning source's commands at that submissionTick against fork's commands at the same submissionTick. Test (h) updated to assert `perTickCounts.get(T_fail).commandsChanged >= 1` when a substituted command's handler throws.
- **MEDIUM (lastError mid-run):** v4 only checked `recorder.lastError` after `connect()`. The recorder sets `lastError` on tick/failure/command/terminal-snapshot write failures (`src/session-recorder.ts:413-425, 450-453, 482-492`); existing runners check after stepping (`runSynthPlaytest:249-268`, `runAgentPlaytest:227-292`). v5 Step 5 IMPL: after each `world.step()` in the targetTick step (bullet 6) and the continuation loop (bullet 7), check `recorder.lastError`; if non-null, break the loop (the bundle is preserved up to the last successful step). After `recorder.disconnect()`, check `lastError` once more and surface via the bundle's `metadata.incomplete: true` if a terminal-snapshot write failed.
- **MEDIUM (`recorder.isConnected` → `isConnected`):** the public getter is `isConnected` (`src/session-recorder.ts:112`). v4 said `recorder.isConnected`. Typo fix.
- **NIT (double-recycle gen+2 limitation):** if a tick destroys-and-recreates the same entity twice (gen change +2 in the engine), `diffSnapshots` collapses to one destroyed/created pair (`snapshot-diff.ts:69-72`); `applyTickDiff` produces gen+1, mismatching by 1. Edge case (engine handlers rarely double-recycle within a tick); documented in Risks. v1 not blocked.
- **NIT (Step 5(h) phase concretized):** test fixture is "command-phase failure: substituted command's handler throws inside `processCommands` at `world.ts:1818-1847`" — pre-advance phase, no SessionTickEntry for T_fail.
- **NIT (Step 6(h) listeners-phase wording):** narrowed to acknowledge listener registration order. The recorder's `_onDiff` is registered at `connect()` (`src/session-recorder.ts:178`); a worldFactory listener registered BEFORE `recorder.connect()` runs first and could prevent the recorder's listener from firing. For the listeners-phase failure case, "both a SessionTickEntry and a TickFailure exist" only holds if the recorder's listener fires before the throwing listener.

**v4 deltas vs v3:**

**v4 deltas vs v3:**
- **H1 (entity generations backward):** Step 10a IMPL had destroy→leave-gen-unchanged, create→increment-on-recycle. WRONG per `src/entity-manager.ts:11-32`: `destroy(id)` increments `generations[id]++` (line 31); `create()` reusing a free-list id does NOT increment (line 14). Corrected: applyTickDiff destroys first (set alive=false, generations[id]++, push to freeList), then creates (pop from freeList or extend, set alive=true, no generation change). For diffSnapshots-reported recycled entities (destroyed AND created with same id), the order yields the correct final generation by construction.
- **H2 (target-tick step outside catch path):** Step 5 IMPL bullet 6 (`world.step()` for targetTick) now wrapped in the same `WorldTickFailureError`-catching control as the continuation loop. Plus the entire run() body is wrapped in `try { ... } finally { recorder.disconnect(); }` so a thrown error from `submitWithResult` substitutions or the targetTick step doesn't leak the recorder's wrap. DESIGN §6's contract ("run() returns a bundle and does not rethrow") preserved.
- **M1 (endTick → persistedEndTick):** every `source.metadata.endTick` reference replaced with `source.metadata.persistedEndTick` per DESIGN §1, §4 (Divergence doc), §6, §7. Matches `openAt`'s upper-bound semantics for incomplete bundles (`session-replayer.ts:186-199`).
- **M2 (applyTickDiff in changelog/api-reference):** v3 said internal in Open question 2 but doc deliverables list still mentioned it. v4 removes `applyTickDiff` from `docs/api-reference.md` and `README.md` doc tasks; mentions it only in the changelog as a "new internal helper" with no public surface.
- **NIT-1 (tags/metadata wholesale):** Step 10a IMPL corrected — tags/metadata are wholesale entries `{entity, tags}` / `{entity, meta}` per `src/diff.ts:30-31`. Apply semantics: for each entry, overwrite `snapshot.tags[entity]` / `snapshot.metadata[entity]` wholesale; entities not in the diff are unchanged. No set/removed split.
- **NIT-2 (T_fail SessionTickEntry edge case):** Step 5(h) and Step 6(h) narrowed to "for pre-advance failure phases (commands/systems/resources/diff), no SessionTickEntry exists at T_fail." For the listeners-phase failure (post-advance, post-diff-emit), a SessionTickEntry AND a TickFailure both exist; `Divergence.perTickCounts` may have an entry at T_fail in that case. Test fixture in Step 5(h) uses a system-handler-throws scenario (typical pre-advance phase), so the `[targetTick, T_fail-1]` assertion holds. Note added to Step 6(h) for the listeners-edge case.

**v3 deltas vs v2:** addresses iter-2 review (Codex + Claude convergent ITERATE on H1/H2 + 1 MEDIUM + 1 Claude-only MEDIUM):

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
- (a) No-substitution `run({ untilTick: source.metadata.persistedEndTick })` returns a `ForkResult` whose `bundle.commands.length` matches the count of source commands with `submissionTick` in `[targetTick, source.metadata.persistedEndTick - 1]` (the `< untilTick` range; see "untilTick semantic" below).
- (b) Substituted command (replace) appears in fork bundle at `submissionTick = targetTick`; old command's payload absent.
- (c) Inserted command appears at `submissionTick = targetTick` AFTER all source commands at that tick.
- (d) Dropped command absent from fork bundle.
- (e) `divergence.commandSequenceMap.{replaced, inserted, dropped, preserved}` populated with correct shape; assigned-sequence values are integers `>= 0` and monotonic per fork tick.
- (f) Calling `.run()` twice → `BuilderConsumedError`.
- (g) `run({ untilTick: targetTick })` and `run({ untilTick: targetTick - 1 })` → `RangeError`. (Equality is degenerate: the substitute-and-step in Step 5 IMPL bullet 6 unconditionally advances `world.tick` to `targetTick + 1`, so `untilTick === targetTick` cannot end with `world.tick === targetTick` — the contract requires `untilTick > targetTick`.)
- (h) Mid-fork handler-failure (some tick T_fail throws `WorldTickFailureError`): `bundle.metadata.failedTicks` populated; `bundle.failures[]` non-empty; `run()` does NOT rethrow. **Test fixture: command-phase failure — the substituted command's handler throws inside `processCommands` at `world.ts:1818-1847`** (a pre-advance phase). `finalizeTickFailure` short-circuits BEFORE `gameLoop.advance` (`world.ts:1741`) AND BEFORE diff-listener emission (`world.ts:1746-1763`), so no SessionTickEntry is written for T_fail. **However, the substituted command was recorded by the `submitWithResult` wrap BEFORE `world.step()` was called; bundle.commands contains the substituted command at `submissionTick = T_fail` with `result.accepted: true`.** (`Divergence.perTickCounts` shape assertions deferred to Step 6 (h).)
- (i) `recorder.lastError` non-null after `connect()` causes `run()` to throw the captured error (matching `runSynthPlaytest:208-214`).
- (j) `run({ untilTick > source.metadata.persistedEndTick })` continues forward beyond source range; bundle `endTick > source.metadata.persistedEndTick`. Inline `Divergence.perTickCounts` only covers submission-ticks `[targetTick, source.metadata.persistedEndTick - 1]` (the source-overlap range; ticks past it are `forkOnly`-shaped data but not divergence-counted, no source to compare). (`perTickCounts` content deferred to Step 6 (i).)

**untilTick semantic:** matching `openAt`'s contract, `untilTick` is the desired `world.tick` at run end (= `bundle.metadata.endTick`). Required: `untilTick > targetTick`. The continuation loop runs `while world.tick < untilTick`. Equivalently: `for t = targetTick + 1; t < untilTick; t++ { submit_source_at_t; world.step(); }`. This means the fork's last submission-tick is `untilTick - 1`, which matches source's slice over `[targetTick, untilTick]`.

**Tick numbering note (load-bearing for Step 6):** `world.step()` advances `world.tick` from T to T+1 and emits a `TickDiff` with `tick = T+1`. The recorder writes a `SessionTickEntry` with `tick = TickDiff.tick = T+1`. Commands submitted via `submitWithResult` while `world.tick === T` get `submissionTick = T` (per `getObservableTick()` at `src/world.ts:1472-1479`). So one step processes "submission-tick T" and produces "SessionTickEntry.tick = T+1". DESIGN's public `Divergence.perTickCounts` is keyed by submission-tick (= TickDiff.tick - 1); the implementation accumulates deltas walking `SessionTickEntry`s and re-keys for the public contract.

**IMPL:** `run()` does (with `try { … } finally { if (recorder.isConnected) recorder.disconnect(); }` wrapping the whole body so the recorder's `submitWithResult` wrap and listeners are always unwound, even on an unhandled throw):

1. Materialize the configured (or default) sink: `new MemorySink({ allowSidecar: true })`.
2. Construct fresh `SessionRecorder` with `sourceKind: 'synthetic'`, `sourceLabel: config.sourceLabel ?? \`counterfactual-fork-of-${source.metadata.sessionId}@${targetTick}\``. **No `policySeed`** (different lineage; per DESIGN §7 normalizer).
3. `recorder.connect()`. Check `recorder.lastError` immediately (matching `runSynthPlaytest:207-214` and `runAgentPlaytest:169-172`); if non-null, `recorder.disconnect()` (best-effort) and rethrow the captured error.
4. Walk the source bundle's commands at `submissionTick === targetTick` in `originalSequence` order:
   - In dropped set → skip.
   - In replaced map → `world.submitWithResult(replacement.type, replacement.data)`; record `{tick: targetTick, originalSequence, assignedSequence: result.sequence}` in `commandSequenceMap.replaced`.
   - Otherwise → `world.submitWithResult(rc.type, rc.data)`; record `{tick: targetTick, originalSequence, assignedSequence: result.sequence}` in `commandSequenceMap.preserved`.
5. After source commands, submit inserts in builder-call order: `world.submitWithResult(insert.type, insert.data)`; record `{tick: targetTick, assignedSequence: result.sequence}` in `commandSequenceMap.inserted`.
6. **`try { world.step(); } catch (e) { if (e instanceof WorldTickFailureError) { /* fork-targetTick handler-failure; skip step 7 */ failedAtTargetTick = true; } else throw e; } if (recorder.lastError) { failedAtTargetTick = true; }`** — the targetTick step is wrapped because a substituted command's handler can throw at this exact step (DESIGN §6 row "accepted substituted command's handler throws"). On `WorldTickFailureError`, recorder's existing failure listener captures the failure record. After the step, also check `recorder.lastError` (a sink failure during tick-write sets `_lastError` per `session-recorder.ts:413-425`); if set, treat as fork-end. The bundle preserves up to T_fail-1 (which here is targetTick-1 — empty fork bundle apart from the initial snapshot + recorded substituted commands at submissionTick=targetTick).
7. Continuation loop (skip if `failedAtTargetTick`): `while world.tick < untilTick { for each source command at submissionTick === world.tick: world.submitWithResult(rc.type, rc.data); try { world.step(); } catch (e) { if (e instanceof WorldTickFailureError) break; else throw e; } if (recorder.lastError) break; }`. Recorder captures everything via the `submitWithResult` wrap installed by `connect()`. The `lastError` mid-loop check matches existing runners (`runSynthPlaytest:249-268`, `runAgentPlaytest:227-292`).
8. `recorder.disconnect()`. Final `recorder.lastError` check: if non-null and bundle's `metadata.incomplete` is not already set (e.g., terminal-snapshot write failed during disconnect), the bundle remains usable but `incomplete: true` may apply per `session-recorder.ts:482-492`. Returns `ForkResult { bundle: sink.toBundle(), divergence: { firstDivergentTick: null, perTickCounts: new Map(), commandSequenceMap, equivalent: false }, source: sink }`. `equivalent` and `firstDivergentTick` will be backfilled in Step 6.

The `consumed` flag is set on `run()` entry (in a try/finally to handle the failure-mid-run case correctly — the builder is consumed even if `run()` ends up throwing for some non-handler-failure reason).

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
- (h) Mid-fork handler-failure at submission-tick `T_fail` (pre-advance phase: `commands`/`systems`/`resources`/`diff`): `Divergence.perTickCounts` has entries with keys in `[targetTick, T_fail - 1]` from SessionTickEntry walk PLUS an entry at `T_fail` from the **command-stream walk** (the substituted command at T_fail is recorded in `bundle.commands` even without a SessionTickEntry, because commands are written at `submitWithResult` time before `step()` runs — see Step 6 IMPL "command-stream walk" paragraph). For a substituted command that throws: `perTickCounts.get(T_fail).commandsChanged >= 1` (source's command at the same originalSequence had `result.accepted: true` and ran successfully; fork's substituted command had `result.accepted: true` but its handler threw, so source has an execution record + downstream events while fork does not). **Edge case for `listeners`-phase failure:** `finalizeTickFailure(phase='listeners')` is invoked AFTER `gameLoop.advance` (`world.ts:1989`) and AFTER the diff-listener emission loop has begun (`world.ts:1746-1763`). Whether the recorder's `_onDiff` listener fired or not depends on **listener registration order**: the recorder's listener is registered in `connect()` (`session-recorder.ts:178`); a worldFactory listener registered earlier runs first. If the recorder's listener fired before the throwing listener, both SessionTickEntry and TickFailure exist for T_fail. If the throwing listener ran first, no SessionTickEntry was written. Recorder catches its own listener errors (`session-recorder.ts:433-435`), so listeners-phase-fail requires a custom listener from the worldFactory. Not blocking for v1; test fixture uses pre-advance phases.
- (i) `untilTick > source.metadata.persistedEndTick`: `Divergence.perTickCounts` covers submission-ticks in `[targetTick, source.metadata.persistedEndTick - 1]` only. Submission-ticks past `source.metadata.persistedEndTick - 1` are not divergence-counted (no source to compare). `firstDivergentTick` is `null` if no actual divergence in the overlapping range.

**IMPL:** `computeInlineDivergence(sourceBundle, forkBundle, commandSequenceMap, overlapTickRange)` reads both bundles after `recorder.disconnect()` and accumulates per-tick deltas via TWO walks (a SessionTickEntry walk for execution + events, and a command-stream walk for commands).

**Command-stream walk** (handles command divergence even at ticks with no SessionTickEntry — i.e., pre-advance failure ticks):
- Group `sourceBundle.commands` and `forkBundle.commands` by `submissionTick`.
- For each submissionTick `t` in `overlapTickRange.start..overlapTickRange.end - 1`:
  - At `t === targetTick`: use `commandSequenceMap` to align. `commandSequenceMap.replaced[*].originalSequence` and `commandSequenceMap.preserved[*].originalSequence` paired with corresponding `assignedSequence` give the source↔fork pairs. `commandSequenceMap.inserted[*].assignedSequence` are `forkOnly`. `commandSequenceMap.dropped[*].originalSequence` are `sourceOnly`. For paired commands, compare `type`/`data`/`result.accepted`/`result.code` etc. — differing → `commandsChanged`.
  - At `t > targetTick`: align fork commands at submissionTick=t against source commands at submissionTick=t by **per-tick submission-order index**. Trailing extras in shorter list → sourceOnly/forkOnly. Same-index but differing → `commandsChanged`.
  - Store accumulated counts under `perTickCounts.set(t, { commandsSourceOnly, commandsForkOnly, commandsChanged, eventsSourceOnly: 0, eventsForkOnly: 0, eventsChanged: 0 })` (event fields filled by next walk).

**SessionTickEntry walk** (handles event divergence; commands already counted above so we don't double-count):
- For each `SessionTickEntry` in `sourceBundle.ticks` with `tick - 1` in `overlapTickRange`:
  - Align `events` against the corresponding fork SessionTickEntry's events by per-tick submission-order index.
  - Update `perTickCounts.get(tick - 1).{eventsSourceOnly, eventsForkOnly, eventsChanged}`.
- For SessionTickEntries that exist on one side but not the other (mid-failure case where one side has T_fail and the other doesn't), the missing-side events count as forkOnly/sourceOnly.

**Final pass:**
- Compute `firstDivergentTick = min(t in perTickCounts.keys() where any count > 0)` or `null`.
- `equivalent = firstDivergentTick === null`.
- Drop empty entries from `perTickCounts` (ticks where both walks yielded zero deltas).
- Backfill `divergence` fields in the `ForkResult` after this pass.

### Step 7 — Equivalence test (the load-bearing checkpoint)
**TEST:** `tests/session-fork-equivalence.test.ts` — for each of several source bundles (prototype game, multi-tick events, agent-driven, periodic snapshots): `forkAt(midTick).run({ untilTick: source.metadata.persistedEndTick })` with no substitution → assert `divergence.equivalent === true` AND `normalizeBundle(forkBundle)` byte-equals `normalizeBundle(bundleSlice(sourceBundle, midTick, source.metadata.persistedEndTick))`.

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
- `entities`: apply **destroyed first** (for each `id` in `diff.entities.destroyed`: set `alive[id] = false`, increment `generations[id]++`, push `id` to `freeList[]`), **then created** (for each `id` in `diff.entities.created`: use **that exact id**; if `id < alive.length`, set `alive[id] = true` and remove `id` from `freeList` if present; else extend `alive`/`generations` arrays up to `id + 1`, init new slots with `alive=false, gen=0`, then set `alive[id] = true`. **NO generation change**.). The order mirrors `EntityManager.destroy()` / `create()` semantics (`src/entity-manager.ts:11-32`): destroy increments generation; create reactivates without bumping. For diffSnapshots-reported recycled entities (destroyed AND created with same id, different generation), the order yields the correct final generation by construction (destroy bumps gen by 1, create reactivates with that bumped gen). **Note: `TickDiff.entities.created` carries explicit IDs (`src/diff.ts:9`), so applyTickDiff uses those IDs directly — it does NOT pop from `freeList` LIFO-style like `EntityManager.create()` does. This is intentional: the helper is reconstructing a target snapshot from a diff, not generating new entities live.**
- `components`: for each type in `diff.components`, apply `set` entries (overwrite or insert per `[entityId, value]`) and `removed` entries (delete that entity's entry).
- `resources`: for each pool in `diff.resources`, apply `set` entries and `removed` entries (same shape as components).
- `state`: apply `diff.state.set` (Object.assign-style overwrite) and `diff.state.removed` (delete keys).
- `tags`: **wholesale replacement with empty-cleanup** — for each `{entity, tags}` entry in `diff.tags`: if `tags.length === 0`, **delete `snapshot.tags[entity]`** (engine-canonical: `world.ts:1499-1527` deletes empty tag maps as cleanup, and snapshots with tag keys for dead entities fail deserialize at `world.ts:1097-1129`); else set `snapshot.tags[entity] = tags`. Entities not in the diff are unchanged. Per `src/diff.ts:30` the diff entry is wholesale, not a delta.
- `metadata`: **wholesale replacement with empty-cleanup** — for each `{entity, meta}` entry in `diff.metadata`: if `Object.keys(meta).length === 0`, **delete `snapshot.metadata[entity]`** (same engine cleanup pattern at `world.ts:1609-1621`); else set `snapshot.metadata[entity] = meta`. Entities not in the diff are unchanged. Per `src/diff.ts:31`.

Pass-through fields (NOT recoverable from a TickDiff; preserved from input snapshot unchanged): `version`, `config`, `rng`, `componentOptions`. `tick` field set to `diff.tick`.

This is a NEW helper — there is no existing fold to extract. Per Codex H#2 / Claude H2 (plan-1 review). The helper is **internal** (not exported from `src/index.ts`); the partial-hydration limitation makes it unsafe for general "snapshot at tick N" use, but safe inside `diffBundles`'s state-fold consumer where `diffSnapshots` excludes rng by design.

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
- `replayer.fromBundle(sourceBundle).forkAt(midTick).replace(...).run({ untilTick: source.metadata.persistedEndTick })` produces fork bundle.
- `diffBundles(source, fork.bundle, { commandSequenceMap: fork.divergence.commandSequenceMap })` reports the substituted command's downstream effect across commands, events, and state.
- Fork bundle is itself replayable: `SessionReplayer.fromBundle(fork.bundle).openAt(...)` succeeds.
- Fork bundle is itself forkable: chained fork via `forkAt(...).run(...)` succeeds.

**IMPL:** None — purely integration assertion.

## 4. Documentation deliverables (per AGENTS.md)

Updated as part of the final commit batch:

- `docs/changelog.md` — new `0.8.12` entry: forkAt + ForkBuilder + Divergence + diffBundles + BundleDiff + new error classes; usage example; validation summary. (`applyTickDiff` is internal; mention as "new internal helper" without surface implications.)
- `docs/devlog/summary.md` — one line.
- `docs/devlog/detailed/<latest>.md` — full task entry.
- `package.json` — version bump 0.8.11 → 0.8.12.
- `docs/api-reference.md` — sections for `forkAt`, `ForkBuilder`, `Divergence`, `DivergenceCounts`, `CommandSequenceMap`, `diffBundles`, `BundleDiff`, `BundleTickDelta`, `ForkSubstitutionError`, `ForkBuilderConflictError`, `BuilderConsumedError`. (`applyTickDiff` not listed — it's an internal helper not exported from `src/index.ts`.)
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
| `untilTick` semantic mismatch — `openAt`'s contract is "world.tick at completion." `run({ untilTick })` mirrors this: world.tick = untilTick at end. The continuation loop is `while world.tick < untilTick`. | Documented in Step 5 ("untilTick semantic"). Equivalence test (Step 7) directly exercises `untilTick = source.metadata.persistedEndTick` and asserts byte-equivalence. |
| Double-recycle within a single tick — if a handler chain destroys-and-recreates the same entity twice within one tick, the engine bumps generation by 2, but `diffSnapshots` collapses both cycles into one `destroyed/created` pair (`snapshot-diff.ts:69-72`); `applyTickDiff` then produces gen+1, mismatching `snapB.generations[id]` by 1. | Edge case — engine handlers rarely double-recycle within a tick. If it occurs, Step 10b's state-diff fold for that tick will report a spurious entity-generation delta that doesn't reflect a real divergence. Mitigation: document in `applyTickDiff`'s doc-comment; future fix could extend `TickDiff.entities` with a `generationBumps: Map<EntityId, number>` field. Not blocking v1. |

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
