**Iter-1 Closure**

Critical
- `CR1` Partially — `RecordedCommand` plus `submit`/`submitWithResult` wrapping fixes live-session payload capture, but scenario-derived replay still depends on deferred payload capture (`captureCommandPayloads` / optional supplied commands), so the unification path is not actually closed.
- `CR2` Yes — making sinks synchronous closes the async-listener/backpressure mismatch cleanly.
- `CR3` Partially — replay is now scoped away from post-failure spans, but the spec also allows starting recording on an already-poisoned world even though snapshots do not encode poison state.
- `CR4` Yes — the replay loop now matches `getObservableTick()` / `runTick()` semantics and explicit per-tick ordering.
- `CR5` Partially — the contract now forbids mid-tick `submit()`, but the verification story still has a blind spot because `selfCheck()` does not compare submission-result / command streams.
- `CR6` Partially — inline refs are gone, but the spec still claims `JSON.stringify(bundle)` is complete/lossless while sidecar bytes live outside the JSON shape.

High
- `H1` Partially — the initial-to-first-snapshot span is included, but short/default sessions with no later snapshot still make `selfCheck()` a no-op.
- `H2` Partially — the class/method mistake is fixed, but the scenario adapter contract is still internally inconsistent and not grounded in current `ScenarioRunner` types.
- `H3` Yes — replay-critical streams and a read interface were added.
- `H4` Yes — validators are now explicitly in the determinism contract.
- `H5` Partially — the contract is expanded, but the Node/engine version rules now contradict themselves and the engine-version gate uses the wrong compatibility axis for this repo.
- `H6` Yes — `selfCheck()` now covers state, event, and execution streams.
- `H7` Yes — out-of-range behavior is now explicit.
- `H8` Partially — post-setup initial snapshot is documented, but the scenario metadata still assumes `startTick = 0`.
- `H9` Yes — `EntityRef[]` replaced bare entity ids in markers.

Medium
- `M1` Yes — retroactive marker validation is now bounded.
- `M2` Partially — lifecycle sequencing is mostly clearer, but disconnect/finalization still references serialize/final-state behavior the spec never fully defines.
- `M3` Yes — the required doc surfaces were expanded appropriately.
- `M4` Partially — replay-time version validation exists, but the policy is still inconsistent with the repo’s versioning rules.
- `M5` Yes — `eventsBetween()` boundaries are explicit.
- `M6` Yes — the per-clause self-check test matrix is much broader.
- `M7` Yes — the cost model is now separated from the open-at throughput target.
- `M8` Yes — `worldFactory` is now an explicit ADR / contract element.
- `M9` Yes — stale marker refs are no longer misclassified as integrity errors.

Low
- `L1` Yes — marker provenance is now first-class.
- `L2` Yes — sharding is explicitly deferred.
- `L3` Yes — buffered-sink guidance is present.
- `L4` Yes — ADR 1’s cost estimate is now honest.

Notes
- `N1` Partially — incomplete-prefix replay is described, but the FileSink manifest update cadence is still contradictory.
- `N2` Yes — the snapshot-equality ordering invariant is now stated.
- `N3` Partially — the CI-gate intent is clear, but it still depends on unresolved scenario replayability.

**New / Remaining Findings**

Critical
- The scenario adapter is still unimplementable as written. `scenarioCaptureToBundle()` is declared against `ScenarioCapture`, but the spec uses `scenario.name` and scenario check outcomes to build metadata and assertion markers. Those fields exist on `ScenarioResult`, not `ScenarioCapture`, and the prose later adds an optional `commands` input that is not in the declared signature.

High
- Scenario tick metadata is still wrong. `runScenario` permits setup-time stepping, `history.clear()` rebases the initial snapshot to the current world tick, but A10 hardcodes `metadata.startTick = 0` and derives duration from that fiction. `openAt`, range checks, and duration become wrong for any setup that advances time.
- `selfCheck()` still misses ordinary short captures. The recorder does not specify writing a terminal snapshot on `disconnect()`, and A9.3 explicitly says session bundles with no periodic snapshots yield `checkedSegments: 0`. With the default `snapshotInterval: 1000`, many normal sessions become unverifiable.
- The bundle portability contract is still contradictory. A5.1/A15 say `SessionBundle` is strict JSON and lossless across `JSON.stringify`, but sidecar attachment bytes are explicitly external and only retrievable from `SessionSource`.
- Version compatibility is not converged. A11.1 says identical Node/V8 major is required and cross-major replay is refused; A9.1/A13.4 say Node-major mismatch only warns and replay proceeds. Separately, engine compatibility is keyed to semver major even though this repo’s breaking boundary is the `b` component (`0.x` minors) per `AGENTS.md`.
- The poisoned-start case is still unsound. A7.2 allows connecting a recorder to a poisoned world and using that snapshot as the bundle start, but `WorldSnapshotV5` still lacks poison/`lastTickFailure` state, so `openAt(startTick)` cannot reconstruct what was recorded.
- Pre-connect command semantics are undefined. The recorder wraps `submit()` at construction, before `connect()`, before `sink.open()`, and before the initial snapshot is captured. Commands submitted in that window are either lost or recorded against the wrong start state.

Medium
- Incomplete-bundle semantics are still internally inconsistent. A5.2 says the manifest is rewritten during recording so incomplete prefixes are readable; A8 says FileSink writes it on `open()` and rewrites on `close()`.
- The self-check prose still leans on a nonexistent API. A9.3 references `world.getCommandExecutionResults()` “or via listener”; the listener path is plausible, but the spec should not treat the getter as an available engine surface.
- Attachment policy is inconsistent. A7.1 says FileSink defaults to `dataUrl` unless sidecar is forced; A13.1 expects FileSink to use `dataUrl` under cap and sidecar over cap.
- `captureInitialSnapshot: false` conflicts with a bundle shape and replay API that require `initialSnapshot`. The spec never explains what a replayable bundle looks like when that option is disabled.

Low
- `MarkerValidationError.referencesContractClause` is mismatched. Marker validation failures come from A6.1, not determinism clauses 1-9 in A11.1.

Note
- A13.5 cites `tests/scenarios/`, but the current repo’s scenario coverage lives in `tests/scenario-runner.test.ts`.

Needs another iter on scenario integration, replay verification coverage for short sessions, and the bundle/version-contract contradictions.
