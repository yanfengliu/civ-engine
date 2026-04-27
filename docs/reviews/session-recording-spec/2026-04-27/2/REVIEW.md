# Multi-CLI Design Review — Session Recording & Replay Spec, Iter-2

**Iteration:** 2 (verifies iter-1 closures + new issues introduced by v2 revision).
**Date:** 2026-04-27.
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini quota-exhausted (9th iter in a row).

## Verdicts

- **Codex:** "Needs another iter on scenario integration, replay verification coverage for short sessions, and the bundle/version-contract contradictions."
- **Opus:** "Ship after addressing H-new-1, H-new-2, H-new-3, M-new-1, M-new-2, M-new-3, M-new-4, M-new-5. All eight are spec-clarification fixes (one to a few paragraphs each), not redesigns."

Convergent: iter-1 fixes mostly landed cleanly (~30 of 31 findings closed). The v2 revision introduced a cluster of 4–6 spec-text inconsistencies — most flagged by both reviewers. None require architectural change; one more focused revision pass should close them.

## A. Iter-1 Closure (cross-CLI consensus)

| #     | Codex     | Opus      | Reconciled |
| ----- | --------- | --------- | ---------- |
| CR1   | Partially | Closed    | **Partial** — `RecordedCommand` shape exists, but scenario-derived replay still depends on deferred `captureCommandPayloads` (§16.6) so unification path isn't fully closed. |
| CR2   | Yes       | Closed    | **Closed** |
| CR3   | Partially | Closed    | **Partial** — replay scoped away from post-failure spans, but spec still allows recording on already-poisoned world without addressing snapshot's poison-state gap (see new H finding). |
| CR4   | Yes       | Closed    | **Closed** |
| CR5   | Partially | Closed    | **Partial** — contract forbids mid-tick submit, but selfCheck() execution-stream comparison should explicitly surface the violation (H-new-1 conflicts here). |
| CR6   | Partially | Closed    | **Partial** — `'inline'` ref dropped, but spec still claims `JSON.stringify` is "lossless" while sidecar bytes are external (see new H finding H-strict-json). |
| H1    | Partially | Closed    | **Partial** — initial-to-first-snapshot segment included, but short sessions with no periodic snapshots still get `checkedSegments: 0` (see new H finding). |
| H2    | Partially | Closed    | **Partial** — class/method fixed, but adapter signature/types still misaligned (CR-new-1 below). |
| H3    | Yes       | Closed    | **Closed** |
| H4    | Yes       | Closed    | **Closed** |
| H5    | Partially | Closed    | **Partial** — contract expanded but version rules contradict between §11.1 / §9.1 / §13.4 and engine-version axis is wrong for this repo's `b`-component breaking semantics. |
| H6    | Yes       | Closed    | **Closed** |
| H7    | Yes       | Closed    | **Closed** |
| H8    | Partially | Closed    | **Partial** — post-setup `initialSnapshot` documented, but `metadata.startTick = 0` hardcoded contradicts setups that run `world.step()` during setup. |
| H9    | Yes       | Closed    | **Closed** |
| M1    | Yes       | Closed    | **Closed** |
| M2    | Partially | Closed    | **Partial** — disconnect/finalize references undefined `serialize()` failure-mode (one wording fix). |
| M3    | Yes       | Closed    | **Closed** |
| M4    | Partially | Closed    | **Partial** — version validation exists but rules contradict (see H5 above). |
| M5    | Yes       | Closed    | **Closed** |
| M6    | Yes       | Closed    | **Closed** |
| M7    | Yes       | Closed    | **Closed** |
| M8    | Yes       | Closed    | **Closed** |
| M9    | Yes       | Closed    | **Closed** |
| L1    | Yes       | Closed    | **Closed** |
| L2    | Yes       | Closed    | **Closed** |
| L3    | Yes       | Closed    | **Closed** |
| L4    | Yes       | Closed    | **Closed** |
| N1    | Partially | Partial   | **Partial** — incomplete-bundle replay reachable from §5.2 + §7.2 by inference, but no explicit sentence in §9.1 / §12 saying `openAt()` accepts incomplete bundles up to `metadata.endTick`. |
| N2    | Yes       | Closed    | **Closed** |
| N3    | Partially | Closed    | **Partial** — CI gate intent clear, but depends on unresolved scenario-replayability path (interlocked with new finding M-new-4). |

**Summary:** 19 fully closed, 11 partially closed (mostly wording/inconsistency, not architecture), 1 still open (N1, one-sentence fix). No iter-1 fix introduced an obviously broken regression. Architecture and contracts hold.

## B. New Findings Introduced by v2

### Critical

**CR-new-1. `scenarioCaptureToBundle()` is not implementable as written.** *(Codex)*

§10 declares signature `(capture: ScenarioCapture, options?: { sourceLabel?: string; nodeVersion?: string })` and uses `scenario.name` and per-check tick. But:

- `ScenarioCapture` does not contain `name` (only `tick`, `snapshot`, `debug`, `history`, `metrics`, `diff`, `events` per `src/scenario-runner.ts:50-62`).
- `ScenarioCheckOutcome` does not contain a tick (only `name`, `passed`, `failure` per `:44-48`). The spec acknowledges this in §10 but still references it.
- Per-check `passed` / `failure` are on `ScenarioResult`, not on `ScenarioCapture`'s `history`.
- The prose adds a `commands?: RecordedCommand[]` parameter that is not in the signature.

**Fix:** Re-ground the adapter against actual scenario types. Options:

  (a) Take `ScenarioResult` as input (which has both `name` and check outcomes). Adapter becomes `scenarioResultToBundle(result, options?)`.
  (b) Take `(capture, scenarioName, checkOutcomes, options?)` — explicit pass-through.
  (c) Extend `runScenario` with an `emitBundle?: boolean` option that returns `{ result, bundle }` — internal access to the right fields.

(c) is cleanest; (a) is also fine. Either way, fix the signature and prose to match.

### High

**H-new-1. Two overlapping command-capture paths.** *(Opus, validated)*

§7.1 step 2 subscribes to `world.onCommandResult`; step 4 wraps `submit/submitWithResult` to write `RecordedCommand`. Both fire for every accepted command — `commands.jsonl` gets each submission written twice. Pick one path. Recommended: wrap is the sole `commands` writer (it has the payload, listener doesn't); drop the `onCommandResult` listener subscription, since the wrap covers the same surface.

**H-new-2. `RecordedCommand` references a `submit` vs `submitWithResult` flag that doesn't exist in the type.** *(Opus)*

§9.1 step 3b: "(or `submitWithResult` if the recorded result was from `submitWithResult`; the recorder distinguishes via a flag on `RecordedCommand`)". §5.1 type has no such flag. Also unnecessary: `world.submit()` is just `world.submitWithResult().accepted` (`world.ts:720-722`); the replayer can always call `submitWithResult` and discard the boolean. Drop the flag clause; commit to "always replay via `submitWithResult`."

**H-new-3. Multi-recorder wrap-chain teardown is unsafe.** *(Opus)*

§7.2: "Multiple recorders attached to one world. Supported; both wrap `submit`/`submitWithResult` (forming a chain)." §7.1 step 6 says disconnect "Unwraps `submit`/`submitWithResult`". Naïve `world.submit = saved_original` breaks the chain when the *inner* recorder disconnects first: outer's wrap closure references the now-replaced `world.submit`. **Fix:** either spec the chain protocol (each recorder tracks its predecessor wrap and removes only its own link), or restrict v1 to a single recorder per world and document it.

**H-new-4. selfCheck() returns `checkedSegments: 0` for short sessions.** *(Codex)*

§9.3: "For session bundles with no periodic snapshots, segments = [] and selfCheck() returns ok: true with checkedSegments: 0." With default `snapshotInterval: 1000`, a 500-tick session has no periodic snapshots — selfCheck silently passes without verifying anything. The §13.5 CI gate becomes a paper tiger for short scenarios. **Fix:** the recorder writes a terminal snapshot on `disconnect()` by default (or unless explicitly opted out), so every bundle has at least one `(initialSnapshot, terminalSnapshot)` segment for selfCheck.

**H-new-5. Bundle JSON-strictness wording is contradictory.** *(Codex; convergent with Opus's CR6 partial)*

§5.1: "`SessionBundle` is strict JSON: `JSON.stringify(bundle)` produces a complete, lossless representation. Sidecar attachment bytes live outside the JSON shape; consumers retrieve them via `source.readSidecar(id)`." These two sentences directly contradict. **Fix:** "JSON.stringify(bundle) is complete and lossless for everything except sidecar attachment bytes (which are referenced by id and stored externally — `source.readSidecar(id)`)."

**H-new-6. Version compatibility rules contradict between §11.1, §9.1, §13.4.** *(Codex)*

- §11.1 clause 9: "refuses cross-major-version replay" (Node + engine).
- §9.1: "warns when minor differs" / "throws BundleVersionError when major differs" (engine only). For Node: "warns" only.
- §13.4: "Node version mismatch — warning logged but replay proceeds."

**Plus:** the engine's breaking semver convention is `b`-component (`0.X.y` major-equivalent), not standard semver `a`. So "engine major" interpreted as standard semver is wrong for this repo. **Fix:** unify the rules into one paragraph in §11.1, reference from §9.1 / §13.4. Decide once: cross-`b`-version engine = throw; cross-Node-major = warn (since engine determinism is the bigger concern, and Node-major-cross-replay still works for non-transcendental scenarios).

**H-new-7. Poisoned-start case still produces non-replayable bundle silently.** *(Codex)*

§7.2: "Recorder constructed against a poisoned world. Recording proceeds; `connect()` writes the failure-state snapshot." But `WorldSnapshotV5` doesn't carry poison state; the resulting `initialSnapshot` cannot be deserialized as a poisoned world. `openAt(startTick)` will reconstruct an unpoisoned world from the snapshot, then fail when the first replayed tick reproduces the original failure (or worse, succeeds and diverges). **Fix:** either reject `connect()` on a poisoned world (throw `RecorderClosedError(code: 'world_poisoned')`), or set `metadata.incomplete = true` and `metadata.failedTicks: [startTick]` immediately so replay refuses with `BundleIntegrityError`. Recommended: reject loudly. Recording a known-broken world serves diagnostic purposes only and the user should opt in via a separate flag (not in v1).

**H-new-8. Pre-connect command capture is undefined.** *(Codex; convergent with Opus M-new-6)*

§7.1 step 1 (Construction) wraps `submit`/`submitWithResult`. Step 2 (`connect()`) opens the sink. Submissions made between construction and `connect()` either fail (sink not open), corrupt state, or get silently lost. **Fix:** defer the wrap to `connect()`. Construction prepares; `connect()` installs the wrap. Disconnect removes it.

### Medium

**M-new-1. FileSink attachment default policy reversed in wording.** *(Opus, validated)*

§7.1 step 5: "Attachments default to `dataUrl` mode if under MemorySink's threshold (64 KiB by default) **or unconditionally on `FileSink`**". Reads as "FileSink → always dataUrl," contradicting §5.2 (sidecar layout). **Fix:** FileSink defaults to **sidecar** for any blob (the disk-backed sink should keep blobs as files, not stuff them into the manifest). MemorySink defaults to `dataUrl` under threshold; oversize blobs require explicit `{ sidecar: true }`.

**M-new-2. `scenarioCaptureToBundle` signature missing `commands` parameter.** *(Opus)*

§10 prose says: "the simplest path in v1: `scenarioCaptureToBundle()` accepts an additional optional `commands?: RecordedCommand[]` parameter that the scenario author supplies." But the signature in the same §10 doesn't include it. Reconciled with CR-new-1 above: pick one of (a)/(b)/(c) and fix both signature and prose.

**M-new-3. Scenario `metadata.startTick = 0` is hardcoded.** *(Opus, validated by Codex H finding)*

Engine permits scenarios that start from a non-zero tick (e.g., from a deserialized snapshot, or from setup-time `world.step()` calls). **Fix:** `metadata.startTick = capture.history.initialSnapshot.tick` (or equivalent — the tick at which `runScenario` rebases history). `endTick = capture.tick`. `durationTicks = endTick - startTick`.

**M-new-4. §13.5 CI gate incompatible with §10 unless every existing scenario captures payloads.** *(Opus)*

§10 says scenario bundles without payloads are diagnostic-only (`openAt` throws). §13.5 says every existing scenario runs through selfCheck. Inconsistent unless every existing scenario is migrated to capture payloads, OR selfCheck is best-effort for non-replayable bundles. **Fix:** decide: (a) commit `WorldHistoryRecorder` to add `captureCommandPayloads: true` option in this spec (drops it from §16.6 Open Questions); migrate scenarios in the implementation phase; or (b) selfCheck on no-payload bundles returns `ok: true, checkedSegments: 0` with a warning, framing CI gate as best-effort. Pick (a) for stronger guarantee.

**M-new-5. §7.2 sink-write-error semantics inconsistent across three sections.** *(Opus)*

§7.2 says recorder catches and sets `incomplete = true`; §12 says recorder catches; §7.2 also references "§11.5" which doesn't exist. **Fix:** unify in §7.2: "On sink write failure, the recorder catches the error, sets `metadata.incomplete = true`, marks itself terminal so subsequent listener invocations short-circuit. The error is observable via the bundle's `incomplete` flag and via the `recorder.lastError` getter (new — added to API in §7)." Drop the §11.5 reference. §12's `SinkWriteError` row updates to match.

**M-new-6. §5.2 manifest rewrite cadence undefined.** *(Opus)*

"the manifest is rewritten on each significant change" — ambiguous. **Fix:** define explicitly: manifest is rewritten on `open()` (initial), on each snapshot write (so resuming after a crash has at least snapshot-granularity recovery), and on `close()` (final). Atomic rename (`manifest.tmp.json` → `manifest.json`) to avoid corrupted manifests on crash mid-write.

**M-new-7. `world.getCommandExecutionResults()` doesn't exist.** *(Opus L-new-2 + Codex M finding)*

§9.3 references `worldA.getCommandExecutionResults()` for the execution-stream check. World only exposes `onCommandExecution` / `offCommandExecution` listeners. **Fix:** §9.3 commits to "subscribe to `onCommandExecution` during the segment, accumulate results, compare to bundle's `bundle.executions` filtered to the segment range."

**M-new-8. `captureInitialSnapshot: false` conflicts with replay API.** *(Codex)*

§7 lets users disable initial snapshot capture. §5.1 has `initialSnapshot: WorldSnapshot` (non-optional). §9.1 step 1 needs `initialSnapshot` to fall back to. **Fix:** either make `initialSnapshot` optional in `SessionBundle` (and have `openAt` throw `BundleIntegrityError(code: 'no_initial_snapshot')` when missing), or remove `captureInitialSnapshot: false` from the recorder config (always capture). Recommended: always capture initial snapshot; remove the option.

### Low

**L-new-1. `referencesContractClause` field on divergence types isn't derivable.** *(Opus)*

§11.3 promises divergence types include `referencesContractClause: number` for cross-referencing back to clauses 1–9. But the replayer can't in general infer which clause caused a state divergence. **Fix:** keep field on `MarkerValidationError` (validator knows which rule fired), drop from `StateDivergence` / `EventDivergence` / `ExecutionDivergence`. Optionally include `suspectedClauses?: number[]` if the divergence pattern matches a known signature, but not required for v1.

**L-new-2. `failureSpans` named as ranges but engine produces single-tick failures.** *(Opus)*

`SessionMetadata.failureSpans: Array<{ failedTick: number }>` — naming implies ranges, content is single ticks. Per `world.ts:1763-1782`, failed ticks consume a tick number; recovery resumes at `failedTick + 1`; no multi-tick regions. **Fix:** rename `failedTicks: number[]` and update §9.1 wording.

**L-new-3. `MarkerValidationError.referencesContractClause` mismatched.** *(Codex)*

Marker-validation failures come from §6.1 rules, not from §11.1 determinism clauses 1–9. The cross-reference is to the wrong document section. **Fix:** rename to `referencesValidationRule: string` (e.g., `"6.1.entity_liveness"`), or drop entirely from `MarkerValidationError`.

**L-new-4. `eventsBetween()` returns `SessionTickEntry[]` not events.** *(Opus)*

Naming bug only. **Fix:** rename to `tickEntriesBetween(fromTick, toTick): SessionTickEntry[]` or change return type to `Event[]` flattened. Cosmetic.

### Note

**N-new-1. Snapshot-pair discriminator implicit in §9.1 step 1.** *(Opus)*

`bundle.snapshots[i]` is a `SessionSnapshotEntry` with outer `.tick`; `bundle.initialSnapshot` is a raw `WorldSnapshot` with internal `.tick`. Reader must know which `.tick` is meant. **Fix:** §9.1 step 1 uses `bundle.metadata.startTick` for the initial snapshot, or normalize to a uniform shape over the union.

**N-new-2. §13.5 path reference wrong.** *(Codex)*

§13.5 says "`tests/scenarios/`" but the repo's scenario coverage lives in `tests/scenario-runner.test.ts`. **Fix:** correct the path.

## C. Iter-2 Spec-Revision Plan

In rough priority:

1. **CR-new-1 + M-new-2 (scenario adapter):** rewrite §10 with grounded types. Pick `runScenario({ emitBundle: true })` returning `{ result, bundle }`. This gives internal access to scenario name, check outcomes, and `RecordedCommand` capture in one motion.
2. **H-new-1 (single command-capture path):** §7.1 drop the `onCommandResult` listener for `commands.jsonl` writing; commit to `submit/submitWithResult` wrap as the sole writer.
3. **H-new-2 + L-new-4 (replay always via submitWithResult; rename eventsBetween):** §5.1 drop the imagined flag, §9.1 step 3b commit to `submitWithResult`. Rename method.
4. **H-new-3 (multi-recorder chain):** restrict v1 to single recorder per world; document; throw `RecorderClosedError(code: 'recorder_already_attached')` on second `connect()`. Future spec extends to chain protocol.
5. **H-new-4 (terminal snapshot at disconnect):** recorder writes terminal snapshot on `disconnect()` by default (configurable via `terminalSnapshot: false` for users who want strict periodic-only behavior).
6. **H-new-5 (JSON-strictness wording):** one-sentence fix in §5.1.
7. **H-new-6 (version compatibility unification):** §11.1 paragraph; engine version compatibility on `b`-component; Node major mismatch is warn-only.
8. **H-new-7 (poisoned-start rejection):** §7.2 reject `connect()` on poisoned world unless `allowPoisonedStart: true` (out of scope for v1; `connect()` throws). Future spec when WorldSnapshot v6 carries poison state.
9. **H-new-8 (pre-connect wrap defer):** §7.1 step 1 prepares only; step 2 (`connect()`) installs wraps and listeners.
10. **M-new-1 (FileSink default sidecar):** fix §7.1 sentence.
11. **M-new-3 (scenario startTick from history):** fix §10.
12. **M-new-4 (CI gate vs payloads):** commit `captureCommandPayloads: true` to `WorldHistoryRecorder` in this spec; drop §16.6 Open Question.
13. **M-new-5 (sink-write-error unification):** §7.2 single source of truth; §12 reflects.
14. **M-new-6 (manifest rewrite cadence):** §5.2 explicit policy.
15. **M-new-7 (getCommandExecutionResults):** §9.3 rewords.
16. **M-new-8 (captureInitialSnapshot removed):** §7 drops the option.
17. **L-new-1 (referencesContractClause on divergences):** §11.3 / §9 type cleanups.
18. **L-new-2 (failedTicks rename):** §5.1.
19. **L-new-3 (referencesValidationRule):** §12.
20. **N-new-1 (snapshot pair discriminator):** §9.1 step 1.
21. **N-new-2 (test path):** §13.5.
22. **N1 holdover:** one sentence in §9.1 / §12 explicitly accepting incomplete bundles up to `metadata.endTick`.

All items are spec-text fixes — no architectural change. Iter-3 should converge.

## Reviewer Coverage

| Severity | Codex | Opus | Convergent | Codex-only | Opus-only |
| -------- | ----- | ---- | ---------- | ---------- | --------- |
| Critical | 1     | 0    | —          | CR-new-1   | —         |
| High     | 6     | 3    | 3          | 3          | 0         |
| Medium   | 4     | 7    | 4          | 0          | 3         |
| Low      | 1     | 3    | 1          | 0          | 2         |
| Note     | 1     | 2    | 0          | 1          | 2         |

Codex stronger on architecture-grounding issues (scenario types, version semantics, poisoned-start, pre-connect wrap, captureInitialSnapshot conflict). Opus stronger on internal-consistency issues (sink-write-error wording, manifest cadence, multi-recorder chain). Both agreed on the headline issues (scenario adapter unimplementable; selfCheck no-op for short sessions; JSON-strict wording contradiction). Two-reviewer convergence on the non-trivial fixes is strong signal.

Gemini quota-out 9th iter; AGENTS.md unreachable-CLI policy applied.
