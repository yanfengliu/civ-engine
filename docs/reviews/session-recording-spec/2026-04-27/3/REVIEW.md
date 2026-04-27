# Multi-CLI Design Review — Session Recording & Replay Spec, Iter-3

**Iteration:** 3 (verifies iter-2 closures + new issues from v3 revision).
**Date:** 2026-04-27.
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini quota-exhausted (10th iter).

## Verdicts

- **Codex:** "Ship after fixing the remaining wrap-protocol, mixed-recorder, incomplete-bundle-boundary, and `WorldHistoryRecorder` public-type-contract issues."
- **Opus:** "Converged — ship after a small wording-fix pass." 24 of 25 iter-2 findings fully closed.

Convergent. Iter-3 surfaced ~10 spec-text fixes — none architectural. One more focused pass closes everything; iter-4 will be a quick verification.

## A. Iter-2 Closure (cross-CLI consensus)

| Finding     | Codex     | Opus      | Reconciled |
| ----------- | --------- | --------- | ---------- |
| CR-new-1    | Yes       | Closed    | **Closed** |
| H-new-1     | Partially | Closed    | **Partial** — wrap protocol still doubles for `submit()` (Codex flagged the delegation path; Opus missed). |
| H-new-2     | Partially | Closed    | **Partial** — replay path correct, but §13.1 still mentions removed flag. |
| H-new-3     | Partially | Closed    | **Partial** — single-`SessionRecorder` enforced, but mixed `SessionRecorder` + `WorldHistoryRecorder({ captureCommandPayloads: true })` still has chain ambiguity. |
| H-new-4     | Yes       | Closed    | **Closed** |
| H-new-5     | Yes       | Closed    | **Closed** |
| H-new-6     | Partially | Partially | **Partial** — §11.1/§9.1 unified, but §13.4 test description carries pre-iter-2 wording. |
| H-new-7     | Yes       | Closed    | **Closed** |
| H-new-8     | Yes       | Closed    | **Closed** |
| M-new-1     | Partially | Closed    | **Partial** — API/lifecycle text fixed, but §13.1 unit-test plan still says old policy. |
| M-new-2     | Yes       | Closed    | **Closed** |
| M-new-3     | Yes       | Closed    | **Closed** |
| M-new-4     | Partially | Closed    | **Partial** — CI contract still split between mandatory full migration (§13.5) and incremental best-effort (§10.3). Pick one. |
| M-new-5     | Yes       | Closed    | **Closed** |
| M-new-6     | Yes       | Closed    | **Closed** |
| M-new-7     | Yes       | Closed    | **Closed** |
| M-new-8     | Yes       | Closed    | **Closed** |
| L-new-1     | Yes       | Closed    | **Closed** |
| L-new-2     | Yes       | Closed    | **Closed** |
| L-new-3     | Yes       | Closed    | **Closed** |
| L-new-4     | Yes       | Closed    | **Closed** |
| N-new-1     | Yes       | Closed    | **Closed** |
| N-new-2     | Yes       | Closed    | **Closed** |
| N1 holdover | Partially | Closed    | **Partial** — §9.1 explicit, but §7.1 endTick advance may overstate persisted prefix on abnormal disconnect. |

**Summary:** 18 fully closed, 7 partial (all wording-level), 0 open architectural. Architecture and contracts hold.

## B. New Findings Introduced by v3

### High

**H3-1. `submit`/`submitWithResult` wrap protocol double-captures.** *(Codex H-1)*

§7.3 wraps both `world.submit` and `world.submitWithResult`. But per `src/world.ts:720-728`, `world.submit()` calls `this.submitWithResult().accepted`. After wrapping, calling `world.submit(type, data)` triggers: wrapped-submit → original-submit → `this.submitWithResult` → wrapped-submitWithResult → captures → original-submitWithResult → ... → wrapped-submit captures the boolean result. Result: double-write to `commands.jsonl`, with the second entry holding only a boolean.

**Fix:** wrap **only** `submitWithResult`. Since `submit` delegates through it, capturing at `submitWithResult` covers both code paths. The replayer always replays via `submitWithResult` (per §7.3), so `RecordedCommand.result` is always a `CommandSubmissionResult` and never a boolean. §7.3 simplified to a single wrap.

**H3-2. Mixed `SessionRecorder` + `WorldHistoryRecorder({ captureCommandPayloads: true })` coexistence still has wrap-chain ambiguity.** *(Codex H-2)*

§7.1 step 2 forbids two `SessionRecorder` instances; ADR 1 claims both recorder *types* coexist "without interference"; §10.2 commits `captureCommandPayloads: true` to `WorldHistoryRecorder`, which must also wrap `submitWithResult` to capture payloads. Concurrent wraps from both recorder classes recreates the iter-2 H-new-3 chain teardown problem.

**Fix:** v1 mutual exclusion. A `SessionRecorder` and a `WorldHistoryRecorder({ captureCommandPayloads: true })` cannot both attach to the same world. Enforce via the same hidden `world.__sessionRecorder` slot (extend the slot to track any payload-capturing wrapper). `WorldHistoryRecorder({ captureCommandPayloads: false })` (the default) does NOT wrap and remains compatible with `SessionRecorder`. ADR 1 wording amended.

**H3-3. `disconnect()` finalizes `metadata.endTick = world.tick` even on sink/serialize failure, overstating persisted prefix.** *(Codex H-3)*

§7.1 step 6 unconditionally sets `endTick = world.tick` at disconnect. Per §5.2 manifest cadence, `endTick` advances per-snapshot during recording; if a snapshot write failed and incomplete was set, the disk's last persisted snapshot tick is `< world.tick`. A reader of the incomplete bundle would replay up to `endTick` (per §9.1 incomplete-bundle rule) and hit missing tick entries.

**Fix:** track `metadata.endTick` and `metadata.persistedEndTick` separately. `endTick` is the live world tick at last write attempt; `persistedEndTick` is the tick of the last *successful* snapshot write (matches §5.2 manifest update on snapshot-write). On normal disconnect with terminal snapshot success, `persistedEndTick === endTick`. On failure, `persistedEndTick < endTick`. `openAt(tick)` uses `persistedEndTick` as the upper bound for incomplete bundles. Clean bundles are unaffected.

**H3-4. `WorldHistoryState.commands` widening is a public-type breaking change.** *(Codex H-4)*

§10.2: "`WorldHistoryState.commands` becomes `RecordedCommand[]` when this option is enabled (was `CommandSubmissionResult[]`). The type is widened to `Array<CommandSubmissionResult | RecordedCommand>`." `WorldHistoryRecorder` is publicly exported (`src/index.ts:7`); current public type is `commands: Array<CommandSubmissionResult<...>>` (`src/history-recorder.ts:31-43`). Widening forces downstream consumers to discriminate. Conflicts with §14's "all additions are non-breaking, c-bump only" claim.

**Fix:** introduce a separate field `WorldHistoryState.recordedCommands?: RecordedCommand[]` that's populated when `captureCommandPayloads: true`. `WorldHistoryState.commands: CommandSubmissionResult[]` stays unchanged. Adapter (§10.1) reads `result.history.recordedCommands ?? []` for replayable bundle commands; falls back to no-replay if absent. Pure additive change, no `b`-bump needed.

### Medium

**M3-1. Scenario adapter doesn't handle `result.history.initialSnapshot === null`.** *(Codex M-1, Opus H3-new-2)*

`WorldHistoryState.initialSnapshot` is typed `WorldSnapshot | null`; null when the scenario's `WorldHistoryRecorder` was configured with `captureInitialSnapshot: false` (still allowed on `WorldHistoryRecorder` per `src/history-recorder.ts:127`; only `SessionRecorder` removed it). `SessionBundle.initialSnapshot: WorldSnapshot` is non-optional. Result: a scenario opted out of initial-snapshot capture silently produces a bundle with `initialSnapshot: null` that crashes the replayer.

**Fix:** §10.2 quickstart commits BOTH `captureInitialSnapshot: true` (default) AND `captureCommandPayloads: true` as the joint requirement for replayable scenario bundles. §10.1 explicitly throws `BundleIntegrityError(code: 'no_initial_snapshot')` if `result.history.initialSnapshot === null` is encountered.

**M3-2. CI gate contract is split between full-migration and incremental-best-effort.** *(Codex M-2)*

§13.5 says "every existing scenario … is migrated to opt into `captureCommandPayloads: true` … and is wrapped with `scenarioResultToBundle(result)` followed by `replayer.selfCheck()`." §10.3 says non-payload scenarios produce diagnostic-only bundles; selfCheck returns `checkedSegments: 0` with a warning. §13.5 says "the migration can proceed incrementally" — which describes a transient state during implementation, not the v1 acceptance bar.

**Fix:** §13.5 + §18 acceptance criteria pick one. The implementation phase migrates all existing scenarios as part of the work (one-line addition per scenario). v1 ships with all engine scenarios opted in; selfCheck-on-no-payload's warning path remains in-spec for *user* code's non-replayable bundles, not for the engine's own corpus. §13.5 should say "All engine scenarios opt in by end of implementation phase; selfCheck on the corpus must pass `npm test`."

**M3-3. §10.2 quickstart code sample has two errors.** *(Codex M-3, Opus M3-new-1)*

Sample uses `await runScenario(...)` (synchronous in current API per `src/scenario-runner.ts:133`) and `steps: ...` (no such field; `ScenarioConfig` has `setup`, `run`, `checks` per `:102-120`). **Fix:** drop `await`, rename `steps:` to `run:`.

### Low

**L3-1. §7.1 step 4 calls private `world.getObservableTick()`.** *(Codex L-2, Opus H3-new-1)*

§7.1 step 4: "submissionTick: world.getObservableTick()". Per `src/world.ts:1275`, `getObservableTick` is `private`. The recorder cannot call it from outside the class. **Fix:** use `result.tick` (which `world.submitWithResult` populates from `getObservableTick()` internally — see `world.ts:1694`). `RecordedCommand.submissionTick = result.tick`. The duplication of `submissionTick` and `result.tick` becomes a denormalized accessor for ergonomics, not a private-method call.

**L3-2. Stale `submitWithResult` variant flag in §13.1 unit tests.** *(Codex L-1, Opus partial via H-new-2)*

§13.1: "`RecordedCommand`: round-trip (type + data + result preserved); ordering within a tick by sequence; submitWithResult variant flag." The flag was dropped from the type. **Fix:** drop the third clause.

**L3-3. Stale §11.5 reference and §13.4 wording.** *(Codex L-1, Opus H-new-6)*

- §5.1 has no §11.5 reference (Codex flagged at `spec:161`; verifying...).
- §13.4 still describes engine-version mismatch testing in pre-iter-2 terms: "warning via `console.warn` (minor differs); cross-major (0.x → 1.x) throws". Per §11.1 clause 9, the rule is cross-`b` throws, within-`b` warns. **Fix:** §13.4 split into two test cases: `0.7.5 → 0.7.8` warns (within-`b`); `0.6.0 → 0.7.x` throws (cross-`b`).

**L3-4. §13.1 stale FileSink attachment-policy wording.** *(Codex M-1 partial)*

§13.1 mentions "FileSink to use `dataUrl` under cap and sidecar over cap" — pre-iter-2 default. Per §7.1 step 5 (post-iter-2), FileSink defaults to sidecar unconditionally. **Fix:** rewrite to match.

**L3-5. `recorder.lastError` type fidelity.** *(Opus L3-new-1)*

`SessionRecordingError | null` is narrow; `world.serialize()` could throw any `Error`. **Fix:** spec commits to wrapping arbitrary throws into a `SessionRecordingError` subclass at the recorder boundary (one short paragraph in §7.1 step 6).

### Note

**N3-1. `SessionSink.writeAttachment` mutates input `descriptor.ref`.** *(Opus N3-new-1)*

§8 docs comment: "descriptor.ref is mutated by the sink to reflect chosen storage policy." Mutating an input parameter is unusual API design; the recorder receives the chosen policy back via `AttachmentId`, not via the descriptor. Acceptable in v1 (single-recorder restriction limits the surprise blast radius), but worth flagging. **Fix (deferred):** clean up to a return-by-value pattern in implementation phase if it doesn't add complexity; otherwise leave with a comment in §8 acknowledging the smell.

**N3-2. §9.3 cost arithmetic.** *(Opus L3-new-2)*

"11 × ~900 = ~10000 ticks of replay" — rounded numbers; cosmetic only. Acceptable.

## C. Iter-3 Spec-Revision Plan

In rough priority:

1. **H3-1 (single wrap):** §7.3 — wrap only `submitWithResult`; submit delegates through it.
2. **H3-2 (mixed-recorder mutex):** §7.1 step 2 + ADR 1 — `SessionRecorder` and `WorldHistoryRecorder({ captureCommandPayloads: true })` mutually exclusive; default-config WorldHistoryRecorder still compatible.
3. **H3-3 (persistedEndTick):** §5.1 add `metadata.persistedEndTick: number`; §5.2 cadence; §7.1 step 6 disconnect logic; §9.1 incomplete-bundle range uses persistedEndTick.
4. **H3-4 (no public-type widening):** §10.2 — add `WorldHistoryState.recordedCommands?: RecordedCommand[]`; commands stays as `CommandSubmissionResult[]`; §10.1 reads `result.history.recordedCommands`.
5. **M3-1 (null initialSnapshot):** §10.1 throw on null; §10.2 quickstart requires both `captureInitialSnapshot: true` (default) and `captureCommandPayloads: true`.
6. **M3-2 (CI gate single rule):** §13.5 + §18 — all engine scenarios opt in; v1 ships all opted in; warning path for *user* code's non-replayable bundles only.
7. **M3-3 (quickstart sample fixes):** §10.2 — drop `await`, rename `steps:` to `run:`.
8. **L3-1 (no private method):** §7.1 step 4 — `submissionTick: result.tick`.
9. **L3-2 (drop flag clause):** §13.1 — drop submitWithResult variant flag mention.
10. **L3-3 (§13.4 wording):** rewrite engine-version mismatch tests with cross-`b` semantics.
11. **L3-4 (§13.1 attachment policy):** match §7.1 step 5.
12. **L3-5 (lastError wrap):** §7.1 step 6 — wraps arbitrary throws.

All items are spec-text fixes — no architectural change. Iter-4 should converge.

## Reviewer Coverage

| Severity | Codex | Opus | Convergent | Codex-only | Opus-only |
| -------- | ----- | ---- | ---------- | ---------- | --------- |
| Critical | 0     | 0    | —          | 0          | 0         |
| High     | 4     | 2    | 2          | 2          | 0         |
| Medium   | 3     | 1    | 1          | 2          | 0         |
| Low      | 2     | 2    | 2          | 0          | 0         |
| Note     | 0     | 1    | 0          | 0          | 1         |

Codex's grounding-in-source strength caught the wrap-protocol bug (H3-1) and the WorldHistoryState type-widening breakage (H3-4). Opus's contract-completeness focus caught the scenario adapter null-snapshot path (M3-1). Both flagged the §13.4 wording, §10.2 sample errors, and the private-method reference. Strong convergence.

**Verdict:** Iter-4 should be the convergence iteration. Architecture is fully stable; remaining work is wording.
