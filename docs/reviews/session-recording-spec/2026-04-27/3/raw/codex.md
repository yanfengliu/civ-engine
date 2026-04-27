**Iter-2 Closure Verdicts**

- `CR-new-1`: Yes — `scenarioResultToBundle(result)` is now grounded on `ScenarioResult`, so `name`/`checks` come from real scenario types; using `result.tick` for assertion markers is a valid fallback while `ScenarioCheckOutcome` remains tickless.
- `H-new-1`: Partially — the `onCommandResult` duplicate path is gone, but the §7.3 wrap still double-captures `world.submit()` because current `world.submit()` delegates to `submitWithResult()` (`docs/design/2026-04-26-session-recording-and-replay-design.md:311-320`, `src/world.ts:720-728`).
- `H-new-2`: Partially — the replay contract correctly standardized on `submitWithResult`, but §13.1 still mentions a removed `RecordedCommand` “submitWithResult variant flag” (`docs/design/2026-04-26-session-recording-and-replay-design.md:658`).
- `H-new-3`: Partially — two `SessionRecorder`s are now forbidden, but mixed `SessionRecorder` + `WorldHistoryRecorder(captureCommandPayloads: true)` wrapping is still allowed/claimed safe and remains undefined (`spec:291`, `spec:572`, `spec:765`).
- `H-new-4`: Yes — default terminal snapshoting closes the short-session `selfCheck()` hole, and the diagnostic-only opt-out is explicit.
- `H-new-5`: Yes — the JSON-strictness wording is now internally coherent about sidecar bytes living outside the JSON shape.
- `H-new-6`: Partially — §11.1 and §9.1 are aligned on cross-`b` engine compatibility, but §13.4 still carries the old `0.6.x -> 0.7.x` “warn” wording (`spec:620-621`, `spec:702`).
- `H-new-7`: Yes — poisoned-start recording is now rejected at `connect()`, which matches `WorldSnapshotV5` not carrying poison state.
- `H-new-8`: Yes — wraps are now installed at `connect()`, not construction.

- `M-new-1`: Partially — FileSink’s default sidecar policy is fixed in the API/lifecycle text, but the unit-test plan still says “dataUrl under cap, sidecar over cap” (`spec:297`, `spec:661`).
- `M-new-2`: Yes — the adapter no longer has the signature/prose mismatch around a `commands` parameter.
- `M-new-3`: Yes — `startTick` is no longer hardcoded to `0`; it derives from `result.history.initialSnapshot.tick`.
- `M-new-4`: Partially — the spec still says both “every existing scenario is migrated and selfChecked” and “non-migrated scenarios are skipped incrementally” (`spec:592`, `spec:707-709`, `spec:857`).
- `M-new-5`: Yes — sink-write-error handling is now centralized and the old bogus cross-reference is gone.
- `M-new-6`: Yes — manifest rewrite cadence is now explicit.
- `M-new-7`: Yes — `selfCheck()` now uses `onCommandExecution`, which matches the current World API.
- `M-new-8`: Yes — `SessionRecorder` no longer exposes `captureInitialSnapshot: false`.

- `L-new-1`: Yes — divergence types no longer pretend they can reliably attribute a contract clause.
- `L-new-2`: Yes — `failedTicks` now matches the engine’s single-tick failure model.
- `L-new-3`: Yes — marker-validation cross-reference is now tied to §6.1 rules, not determinism clauses.
- `L-new-4`: Yes — `eventsBetween()` was renamed to `tickEntriesBetween()`.

- `N-new-1`: Yes — the initial snapshot is normalized into the same `{ tick, snapshot }` shape for replay.
- `N-new-2`: Yes — the current scenario-test path is corrected to `tests/scenario-runner.test.ts`, with `tests/scenarios/` only framed as future growth.
- `N1` holdover: Partially — §9.1 now explicitly allows incomplete bundles up to `metadata.endTick`, but §7.1/§5.2 still do not make `endTick` a reliable persisted-prefix boundary after abnormal disconnect.

**Remaining Issues**

**High**
- The `submit` wrap protocol is still wrong. In §7.3, `recordedSubmit()` calls the original `submit()`, which in current code calls `this.submitWithResult()`. After wrapping, that means `submit()` records once inside wrapped `submitWithResult()` and again inside wrapped `submit()`, with the second path only holding a boolean, not a `CommandSubmissionResult` (`spec:311-320`, `world.ts:720-728`). This means H-new-1 has not actually converged.
- Mixed recorder coexistence is still underspecified. §7.1 only blocks another `SessionRecorder`, §10.2 adds a `WorldHistoryRecorder` submit-wrap when `captureCommandPayloads` is enabled, and ADR 1 still claims both recorders can attach “without interference” by chaining wraps (`spec:291`, `spec:572`, `spec:765`). The wrap-chain teardown problem still exists in that mixed case.
- Incomplete-bundle range semantics are still contradictory. §5.2/§9.1 say incomplete bundles are replayable up to `metadata.endTick` because that tracks the persisted prefix, but §7.1 says `disconnect()` finalizes `metadata.endTick = world.tick` even when terminal snapshot write failed (`spec:189`, `spec:295`, `spec:465`). After sink failure or destroyed-world disconnect, `endTick` can overstate what was actually persisted.
- `WorldHistoryState.commands` becoming `Array<CommandSubmissionResult | RecordedCommand>` is not additive/backward-compatible. `history-recorder` is publicly exported (`src/index.ts:7`), and current code exposes `commands: Array<CommandSubmissionResult<...>>` (`src/history-recorder.ts:31-43`). Widening that public type forces downstream discrimination and conflicts with the spec’s “all additions are non-breaking, c-bump only” claim (`spec:573`, `spec:720`, `spec:855`).

**Medium**
- The scenario adapter still does not define the no-initial-snapshot case. §10.1 uses `result.history.initialSnapshot?.tick ?? 0`, but `SessionBundle.initialSnapshot` is non-optional, and the current scenario/history APIs still allow `captureInitialSnapshot: false` (`spec:551-554`, `src/scenario-runner.ts:106-113`, `src/history-recorder.ts:119-139`). Replayable scenario bundles are still under-specified when history capture omits that snapshot.
- The scenario CI contract is still split between mandatory full migration and incremental best-effort migration (`spec:592`, `spec:707-709`, `spec:857`). That leaves the acceptance bar unclear.
- The §10.2 example is stale against the real `runScenario` API. The current engine’s `runScenario` is synchronous and takes `run`, not `steps`; the example uses `await runScenario({ steps: ... })` (`spec:578-581`, `src/scenario-runner.ts:106-136`).

**Low**
- A few stale references remain in later sections: §5.1 cites non-existent §11.5 (`spec:161`), §13.1 still mentions the removed `submitWithResult` variant flag and the old FileSink attachment policy (`spec:658`, `spec:661`), and §13.4 still carries the pre-v3 engine-version mismatch wording (`spec:702`).
- §7.1 step 4 calls `world.getObservableTick()`, but that is currently a private `World` method (`spec:293`, `src/world.ts:1275`). The public result already carries the submission tick, so the spec’s current grounding is off.

Ship after fixing the remaining wrap-protocol, mixed-recorder, incomplete-bundle-boundary, and `WorldHistoryRecorder` public-type-contract issues.
