# Spec 5 (Counterfactual Replay) Design Iter-2 Review

**Date:** 2026-04-29
**Iteration:** design-2 → produces design-3
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (both reviewers convergent)

## Convergent BLOCKERs

### B1 — §4.1 step ordering reorders source commands at `targetTick` (Codex BLOCKER + Claude m1)
v2 spec said "drops first, then replaces in `originalSequence` order, then inserts in builder-call order, then re-submit non-substituted source commands." Read literally, this submits replacements + inserts BEFORE the unchanged source commands at `targetTick`. Since `CommandQueue` preserves submit order (`src/command-queue.ts:21`) and `World.processCommands()` executes in drained order (`src/world.ts:1778`), a `replace(11, X)` against source-tick `[10, 11, 12]` would produce execution order `[X, 10, 12]` instead of the expected `[10, X, 12]`. Handler invocation order differs from source even for identity replaces, defeating the equivalence invariant.

**Fix in v3:** §4.1 step 3 walks source commands in **original `sequence` order**. For each: drop → skip; replace → submit replacement; otherwise → re-submit unchanged. Inserts arrive AFTER all source commands at `targetTick` (explicit, documented).

### B2 — §7 normalizer uses wrong field paths (Codex BLOCKER #2 + #3 + Claude M1)
- `commands[i].submissionSequence` doesn't exist — `RecordedCommand` has only top-level `sequence` (`src/session-bundle.ts:41-47`).
- `commands[i].result.sequence` was missing from the normalizer — it's the nested `CommandSubmissionResult.sequence` (`src/world.ts:142`) that mirrors the top-level value but is stored separately. Bytewise comparison sees both.
- `submissionSequence` actually lives on `CommandExecutionResult` (`src/world.ts:150`); `selfCheck` already strips it (`src/session-replayer.ts:382-393`).
- `metadata.metrics.durationMs` doesn't exist — metrics live on per-tick `SessionTickEntry.metrics: WorldMetrics` (`src/session-bundle.ts:56`); `WorldMetrics` has wall-clock fields at `metrics.simulation.tps`, `metrics.systems[].durationMs`, `metrics.durationMs.{total,commands,systems,resources,diff}` (`src/world.ts:89-122`).
- `metadata.durationTicks` was missing — fork starts at `targetTick` so this differs.

**Fix in v3:** §7 normalizer field list rewritten with verified paths. Per-tick `metrics` is normalized wholesale (logical + wall-clock subfields are inseparable in the existing serialization; a future `WorldMetricsLogical` projection is deferred to Q4). Both `commands[i].sequence` and nested `commands[i].result.sequence` listed. `executions[i].submissionSequence` listed separately. `metadata.{durationTicks, endTick, persistedEndTick, policySeed}` added.

## Convergent MAJORs

### M1 — `CommandSequenceMap` insufficient for `diffBundles` alignment (Codex MAJOR #1 + Claude M3)
v2 map only contained entries for `replaced/inserted/dropped` ops. But `nextCommandResultSequence` is NOT preserved by `WorldSnapshotV5`, so re-submitted (non-substituted) source commands ALSO get fresh sequences in the fork. Two duplicate same-type same-data commands at the same tick can't be aligned to source-side counterparts under the v2 fallback `(tick, type, deepEqual(data))` strategy.

**Fix in v3:** `CommandSequenceMap` extended with `preserved: ReadonlyArray<{tick, originalSequence, assignedSequence}>` covering every source command at `targetTick` whose payload+type was preserved. New §4.3 specifies the alignment algorithm:
- At `targetTick` with map: use map for one-to-one alignment.
- At ticks > `targetTick`: alignment is per-tick submission-order index (the fork's replay loop preserves source order, so index-N fork command corresponds to index-N source command).
- Without map: per-tick submission-order index everywhere (best-effort fallback).

### M2 — Source markers/attachments not in fork; equivalence test fails for any source with either (Claude M2)
`SessionBundle` (`src/session-bundle.ts:109-124`) carries `markers: Marker[]` and `attachments: AttachmentDescriptor[]`. The fork's recorder writes from scratch — markers are user-emitted via `SessionRecorder.addMarker`/`attach` hooks (`src/session-recorder.ts:269-357, 359-390`), not derivable from world state. Source-with-markers vs no-substitution fork: source has markers, fork has zero. Byte-equivalence fails.

**Fix in v3:** §7 normalizer strips `markers[]` and `attachments[]` for the equivalence test. §2 non-goals updated with explicit "no marker/attachment replay" entry (counterfactual semantics are about world-driven content, not recorder-emitted user annotations). `BundleDiff` has dedicated `markersDeltas` and `attachmentsDeltas` fields excluded from `equivalent` per ADR 7.

### M3 — `metadata.policySeed` not in normalizer (Claude M2 corollary)
Synthetic-source bundles carry `policySeed` (`src/session-bundle.ts:101-106`); fork's recorder construction in v2 ADR 5 doesn't pass `policySeed`. Source-slice has `policySeed: N`; fork has undefined.

**Fix in v3:** added to §7 normalizer field list.

### M4 — `world.submit()` API signature mismatch (Codex MAJOR #2)
v2 §4.1 said "world.submit(newCmd)" but the actual signature is `submit<K>(type: K, data: TCommandMap[K]): boolean` (`src/world.ts:784`); the assigned sequence is only on `submitWithResult`'s return (`src/world.ts:792-822`).

**Fix in v3:** §4.1 uses `world.submitWithResult(type, data)` consistently. ADR 4 also corrected.

## MINORs

### m1 — `executionsChanged` is conflated with `commandsChanged` (Claude m2)
Rejected commands have no execution record (`src/world.ts:798-808` short-circuits before queue push). A source-accepted-fork-rejected case shows up as a single command delta + a phantom 1-on-0 execution mismatch.

**Fix in v3:** drop `executionsChanged` from `DivergenceCounts`; collapse into `commandsChanged` (which already covers acceptance differences). Documented in ADR 3.

### m2 — Fork-failure-mid-run behavior not stated (Claude m3)
v2 §6 covered the substituted-handler-failure case but not "does run() abort or continue?" `runAgentPlaytest` aborts (`src/ai-playtester.ts:217-222`).

**Fix in v3:** §6 row updated — `run()` aborts on first `WorldTickFailureError` (matching `runAgentPlaytest`); returns bundle preserved up to `T_fail-1`; `Divergence.perTickCounts` covers `[targetTick, T_fail-1]`; no rethrow (caller inspects `bundle.metadata.failedTicks`).

### m3 — Validator-rejected commands DO consume a sequence (Codex MINOR)
v2 ADR 4 said rejected commands have "no sequence consumption." Wrong — `world.submitWithResult` always increments `nextCommandResultSequence` via `createCommandSubmissionResult` (`src/world.ts:1899-1910`), regardless of acceptance. Rejected commands just produce no execution record.

**Fix in v3:** ADR 4 corrected. New paragraph clarifies sequence-consumption vs execution-record semantics.

### m4 — Replace/drop of source command with `result.accepted: false` unspecified (Claude m4 soft gap)
"Replace a command that didn't actually do anything" is a confusing user mental model.

**Fix in v3:** added explicit row to §4.2 conflict-rules table — allowed; replace re-runs validator on new payload, drop becomes a true semantic no-op.

### m5 — `metadata.policySeed` propagation (Claude m4)
Same as M3 (folded above).

## NITs

### n1 — ADR 4 audit phrased as "verified" for unstarted plan-stage work
**Fix in v3:** rephrased as plan-stage commitment.

### n2 — §4.1 step 1 overspecified (Claude n2)
v2 said "advances the paused world to `targetTick - 1` and steps it once to enter `targetTick`'s submission window." This is exactly what `openAt(targetTick)` does (`src/session-replayer.ts:226-238`).
**Fix in v3:** simplified to "uses `openAt(targetTick)`'s logic to leave the world paused at `world.tick === targetTick - 1`."

### n3 — §4 doesn't show `sourceKind`/`sourceLabel` passed to recorder (Claude n3)
**Fix in v3:** §4.1 step 2 explicitly shows recorder construction with `sourceKind: 'synthetic'`, `sourceLabel: ForkRunConfig.sourceLabel ?? <default>`.

## Verified addressed (iter-1 fixes confirmed in v2)

| Iter-1 finding | iter-2 verification |
|---|---|
| B1 (byte-equivalence reframe) | Reframed correctly as semantic equivalence with normalizer; field list still wrong (B2 above) |
| B2 (sequence inheritance via submit) | Mechanism is correct (submit + post-mapping); just needs API name fix (M4 above) |
| M1 (state-key deltas → diffBundles) | Correctly removed from inline `Divergence` |
| M2 (split delta direction) | Correctly split into sourceOnly/forkOnly/changed |
| M3 (.world() → .snapshot()) | Correctly read-only |
| M4 (conflict rules) | Table correct + exhaustive for listed pairs |
| M5 (BundleDiff matching key) | Partially — needs alignment-algorithm extension (M1 above) |
| M6 (insert into empty target tick) | Correctly resolved by submit-assigned sequences |
| §10 c-bump | Verified additive (Codex confirmed no breaking-surface changes) |
| §4.2 exhaustiveness | Verified (Codex confirmed listed pairs cover all impossible/allowed cases) |

## Process notes for design-3 reviewer

- Verify v3's §7 normalizer field list against actual schemas — every field path was checked but a fresh pair of eyes might catch something missed.
- Verify §4.1's revised submission order is implementable by re-reading the algorithm against `world.processCommands` and the recorder's wrap.
- Verify §4.3's per-tick-index alignment is sound (events are deterministic, commands at ticks > targetTick are submitted in source-original order — confirm the fork's replay loop actually does this).
- Confirm `markers`/`attachments` are correctly excluded from equivalence (v3 §2 + §7 + ADR 7 are all explicit).
