# Multi-CLI Design Review — Session Recording & Replay Spec

**Iteration:** 1 (initial review of `2026-04-26-session-recording-and-replay-design.md` + `ai-first-dev-roadmap.md`)
**Date:** 2026-04-26 (review run); folded 2026-04-27.
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini quota-exhausted (8th iter in a row, ~14h reset); proceeded with two-CLI review per AGENTS.md unreachable-CLI policy.

## Verdicts

- **Codex:** "Needs rework on replay input capture, failure/recover semantics, and the sink/replayer contract."
- **Opus:** "Needs rework on §9.1 replay semantics (C1, C2) and §5.1 bundle type (C3) before implementation. Once those are tightened — with §11.1 extended to cover mid-tick submission and floating-point/Node-version coupling, and the §14 doc surface expanded to satisfy AGENTS.md — the architecture is sound and ready to ship."

Convergent: spec is architecturally sound but contract-level details and several APIs are wrong as drafted. Significant revision required before writing-plans.

## Code-Verified Critical Claims

Three claims with direct code grounding (verified by inspection during synthesis):

| Claim                                                                                  | Verified by                                | CLI    |
| -------------------------------------------------------------------------------------- | ------------------------------------------ | ------ |
| `CommandSubmissionResult` lacks `type`/`data` payloads — only `commandType`, `code`, etc. | `src/world.ts:131-143`                     | Codex  |
| `runScenario` is a function; no `ScenarioRunner` class exists                          | `src/scenario-runner.ts:133`               | Codex  |
| `WorldSnapshotV5` lacks poison/`lastTickFailure` state                                 | `src/serializer.ts:62-77`                  | Codex  |

All three render the spec's drafted approach unimplementable without revision.

## Critical Findings

### CR1. Bundle does not capture command payloads — replay is structurally impossible. (Codex C1)

**File:** spec §5.1, §7, §9.1; engine `src/world.ts:131-143`, `src/history-recorder.ts:41-45,194-203`.

**Issue:** `SessionBundle.commands: CommandSubmissionResult[]` carries only `{ schemaVersion, accepted, commandType, code, message, details, tick, sequence, validatorIndex }`. It does NOT contain the original command `data` payload. §9.1 step 3 says "call `world.submit()` with the original `type` and `data`" — but `data` is not in the bundle. The same payload hole exists in `WorldHistoryRecorder.recordCommand()` so `ScenarioCapture.history.commands` is also unusable for replay.

**Fix:** introduce a new `RecordedCommand` type that carries the full submission payload:

```ts
interface RecordedCommand<TCommandMap = Record<string, unknown>> {
  submissionTick: number;
  sequence: number;
  type: keyof TCommandMap;
  data: TCommandMap[keyof TCommandMap];
  result: CommandSubmissionResult;  // accepted/rejected outcome
}
```

Recorder must capture this either by intercepting `world.submit()` (recorder-owned wrapper) or by adding a new `onCommandSubmission(payload)` hook to `World` that fires before `submit()` returns. Whichever path is chosen, `RecordedCommand[]` replaces `CommandSubmissionResult[]` in the bundle for replay-relevant purposes; `CommandSubmissionResult[]` may still travel for diagnostic completeness.

### CR2. Sync `World` listeners do not compose with async sinks — backpressure and fail-fast are unrealizable. (Codex C2)

**File:** spec §7.1, §8; engine `src/world.ts:1542-1558,1729-1759`.

**Issue:** `World.onDiff` listeners are synchronous. `onCommandResult` / `onCommandExecution` / `onTickFailure` listener exceptions are caught and `console.error`'d (not propagated). The spec requires `await sink.writeTick(...)` from the listener and surfaces `SinkWriteError` to the caller. Neither is achievable: the recorder has no way to await async work inside the engine's synchronous listener invocation, and listener failures don't propagate.

**Fix:** make `SessionSink` synchronous-only in v1. `FileSink` uses Node's `fs.writeSync` (or accumulates entries in memory and flushes synchronously per tick — buffered in-memory then `fs.writeSync` per flush). Drop `Promise` return types from sink methods. This eliminates the listener/await mismatch entirely. Async / streaming sinks can be reconsidered if/when synthetic playtest spec needs them, with whatever engine-side restructuring that requires.

### CR3. Replay across tick failures and `world.recover()` is unspecifiable with current snapshot format. (Codex C3)

**File:** spec §1, §7.1, §9; engine `src/serializer.ts:62-77`, `src/world.ts:641-646,841-847,1763-1782`.

**Issue:** Spec claims to record "any World run" including poisoned snapshots. But `WorldSnapshotV5` doesn't capture `isPoisoned()` state, `lastTickFailure`, or how `recover()` was invoked. A recorded session that hit a tick failure cannot be exactly reconstructed from snapshot + commands.

**Fix:** scope replay to *clean* tick spans in v1. Document explicitly in §1 and §9 that replay is undefined for sessions that crossed a tick failure, and that `openAt(tick)` throws `BundleIntegrityError` if the requested tick falls inside or after a recorded `TickFailure`. Recording continues to capture failures (they appear in `bundle.failures` for diagnostic inspection) but replay does not attempt to resume from them. Future spec can extend `WorldSnapshot` to v6 with poison state and lift this restriction.

### CR4. Replay loop has off-by-one against `getObservableTick()` semantics. (Opus C1, Codex H1)

**File:** spec §9.1; engine `src/world.ts:728-757,1275-1281,1564-1571,1674-1696`.

**Issue:** `CommandSubmissionResult.tick` is the observable tick at submission time. `gameLoop.tick` advances at the END of `runTick()`. So a command submitted before the first `step()` (when `world.tick === 0`) gets `result.tick === 0` and is processed by the step that advances 0→1. Spec's "submit commands with `submissionTick === t` before stepping tick `t`" is wrong by one tick.

**Fix:** rewrite §9.1 step 3 explicitly:

> For each tick `t` from `snapshot.tick` to `targetTick - 1` inclusive: drain every `RecordedCommand` from `bundle.commands` whose `submissionTick === t`, ordered by `sequence` ascending; call `world.submit(rc.type, rc.data)` for each; then call `world.step()` (which advances world from tick `t` to tick `t+1` and processes the queued commands).

Sequence order matters and must be made explicit.

### CR5. Mid-tick command submissions cause double-submit on replay. (Opus C2)

**File:** spec §11.1; engine permits `submit()` from any caller including systems/handlers/listeners.

**Issue:** Engine doesn't restrict where `submit()` is called from. A system that submits a follow-up command will (a) record the submission via the recorder's listener, and (b) re-run during `step()` on replay and re-submit. Result: command queued twice, handler runs twice, replay diverges.

**Fix:** add explicit clause to §11.1 determinism contract — "do NOT call `world.submit()` from inside any system, command handler, event listener, or other code that runs during `world.step()`. All command submissions must originate from outside the tick loop." Make `selfCheck()` surface this when it diverges (the divergence will be visible in the command stream count). Future strict-mode spec can structurally enforce.

### CR6. `SessionBundle` is declared JSON-serializable but inline attachments break that contract. (Opus C3)

**File:** spec §5.1.

**Issue:** Spec says "in-memory and on-disk shapes are isomorphic" and `SessionBundle` is JSON-typed. But inline attachments live in a `Map<string, Uint8Array>` field deliberately *not* part of the JSON shape. `JSON.stringify(bundle)` silently loses inline attachment bytes; consumers typed against `SessionBundle` cannot see them.

**Fix:** drop the `'inline'` ref variant entirely. Two attachment paths only:
- `dataUrl` (small, embedded as `data:<mime>;base64,...` string in the bundle JSON; configurable size cap, default 64 KiB; oversize throws).
- `sidecar` (id-referenced, bytes live in sink-specific external storage; FileSink: `attachments/<id>.<ext>`).

`MemorySink` defaults to `dataUrl` for under-cap blobs; oversize blobs require an explicit sidecar opt-in (e.g. `MemorySink({ allowSidecar: true })`) and are stored in a parallel `Map<string, Uint8Array>` accessed via a new `getSidecar(id)` method on the sink — outside the JSON-typed `SessionBundle`. ADR 2 ("first-class shared bundle type") holds with this clarification.

## High Findings

### H1. selfCheck() does not cover initial-to-first-snapshot span; scenario bundles become no-op. (Codex H2)

**Fix:** include `bundle.initialSnapshot` as the implicit zero-th element of the snapshot pair iteration. For scenario bundles where `snapshots[]` has only one entry (the post-run snapshot), check `(initialSnapshot, snapshots[0])`. Document the expected pair count in §9.3.

### H2. Scenario integration uses wrong API surface — `runScenario` is a function, not a class. (Codex H3)

**File:** spec §10; engine `src/scenario-runner.ts:133`.

**Fix:** §10 must be rewritten. Change "`ScenarioRunner.toBundle()` method" to "standalone `scenarioCaptureToBundle(capture: ScenarioCapture, options?: { sourceLabel?: string }): SessionBundle` function" exported from `src/session-bundle.ts`. Optionally, `runScenario(...)` accepts an `emitBundle?: boolean` option that returns `{ capture, bundle }`. `ScenarioCheckOutcome` does NOT track tick today (Codex H3 verified) — assertion-marker tick uses `capture.tick` (the final tick at which checks ran) for v1; future spec extends `ScenarioCheckOutcome` to include per-check tick.

Also: scenario history has `WorldHistoryRecorder` default capacity (64). Long scenarios silently truncate. The adapter must either (a) require scenario authors to configure unbounded history when they want a replayable bundle, or (b) document this as a non-replayable bundle for long scenarios. Choose (a) — add `runScenario({ history: { capacity: Number.MAX_SAFE_INTEGER } })` example to §10.

### H3. FileSink layout is missing replay-critical streams; SessionSink is write-only. (Codex H4)

**Fix:** §5.2 FileSink layout adds `commands.jsonl`, `executions.jsonl`, `failures.jsonl`, `markers.jsonl`. Manifest references these the same way it references `ticks.jsonl`. §8 introduces a sibling `SessionSource` interface for read access:

```ts
interface SessionSource {
  open(): SessionMetadata;
  readSnapshot(tick: number): WorldSnapshot;
  ticks(): IterableIterator<SessionTickEntry>;
  commands(): IterableIterator<RecordedCommand>;
  executions(): IterableIterator<CommandExecutionResult>;
  failures(): IterableIterator<TickFailure>;
  markers(): IterableIterator<Marker>;
  attachment(id: string): Uint8Array;
  close(): void;
  toBundle(): SessionBundle;
}
```

`MemorySink` and `FileSink` both implement `SessionSink & SessionSource`. `SessionReplayer.fromSink()` becomes `fromSource()` and accepts the read interface.

### H4. Validators must be in the determinism contract. (Codex H5)

**Fix:** add §11.1 clause: "All command validators registered via `world.registerValidator()` must be pure (deterministic given world state, side-effect free). Validators run synchronously in `submitWithResult()` *before* the command is queued, with the live world available — so a side-effecting validator produces uncaptured mutations that break replay even when all other contract clauses are satisfied."

### H5. Determinism contract missing engine+Node version coupling, transcendentals, registration order, query iteration order. (Opus H3)

**Fix:** extend §11.1 with clauses:

- "Replay determinism requires identical engine version *and* identical V8 / Node major version. Math transcendentals (`Math.sin`, `Math.cos`, `Math.log`, etc.) are not bit-identical across V8 versions; cross-runtime replay may diverge even with all other obligations met. The bundle records `metadata.engineVersion`; `SessionReplayer` warns when the runtime engine version differs and refuses cross-major-version replay."
- "System and component registration order must match between recording and replay. The `worldFactory` is part of the determinism contract."
- "Engine query helpers (component-store iteration, spatial-grid queries) iterate in deterministic order; user code must not rely on iteration order being non-deterministic to break ties (this would be a determinism bug if it ever was the case)."

### H6. selfCheck() validates only state; events and execution streams diverge silently. (Opus H4)

**Fix:** §9.3 extends `SelfCheckResult` with three divergence categories: `stateDivergences[]`, `eventDivergences[]`, `executionDivergences[]`. selfCheck deep-equals snapshots (current behavior) AND compares the per-tick event stream and execution-result stream between recording and replay over each segment. All three categories are reported; none are silently masked.

### H7. `openAt(tick)` undefined outside `[startTick, endTick]`. (Opus H5)

**Fix:** §9.1 explicitly:
- `tick < bundle.metadata.startTick`: throws `BundleRangeError`.
- `tick > bundle.metadata.endTick`: throws `BundleRangeError`.
- `tick === bundle.metadata.startTick`: returns world from `bundle.initialSnapshot` directly (no replay needed).
- `tick` falls within or after a recorded `TickFailure`: throws `BundleIntegrityError` (per CR3).

### H8. Scenario bundle `initialSnapshot` is post-setup, not pre-setup. (Opus H6)

**File:** spec §10; engine `src/scenario-runner.ts:175`.

**Fix:** §10 documents explicitly that `bundle.initialSnapshot` for scenario-derived bundles reflects the post-setup, pre-run state. The "complete record" claim in §1 is amended: "complete from `metadata.startTick` forward; for scenario bundles, this is the post-setup state — replaying a scenario bundle requires the original `setup` function in the `worldFactory`."

### H9. Marker `entities` should be `EntityRef[]` (id + generation), not `EntityId[]`. (Opus M1, promoted)

**File:** spec §6; engine `src/types.ts`, recycling semantics in `EntityManager`.

**Issue:** Engine recycles entity IDs via free-list (per ARCHITECTURE.md). Marker `refs.entities: EntityId[]` becomes ambiguous if the marker outlives the entity and the id is recycled. Promoting to High because it affects every marker-using consumer (viewer, agent queries, corpus search) and changing it later is breaking.

**Fix:** §6 schema changes to `entities?: EntityRef[]` (`{ id, generation }`). Validation requires both id and generation match a live entity at marker.tick. `markersByEntity()` accepts `EntityRef` or `EntityId` (the latter matches all generations with a runtime warning).

## Medium Findings

### M1. Marker historical validation is computationally unbounded. (Opus H2 — partly resolved by CR3)

**Fix:** restrict §6.1 marker validation to `marker.tick === world.tick` (the live case). Historical markers (`marker.tick < world.tick`) skip liveness validation but record `validated: false` in the marker for downstream consumers to triage.

### M2. SessionSink/Recorder lifecycle internal inconsistencies. (Codex M2; Opus M1)

**Fix:** §7 / §7.1 made consistent:
- `sessionId` generated at construction (not connect).
- `metadata.startTick`, `metadata.recordedAt` filled at `connect()`.
- `metadata.endTick`, `metadata.durationTicks` filled at `disconnect()` or `toBundle()`.
- `connect()` after `disconnect()` throws `RecorderClosedError` (single-use).
- `disconnect()` tolerates a destroyed world (try/catch the final serialize call; degrade gracefully).

### M3. Documentation surface omits AGENTS.md mandatory updates. (Codex M3, Opus M7)

**Fix:** §14 "Topical guides" section adds: `docs/guides/concepts.md` (standalone-utilities list + tick-lifecycle ASCII), `docs/guides/ai-integration.md` (this is foundational AI surface), `docs/guides/getting-started.md` (tutorial-grade feature), `docs/guides/building-a-game.md` (tutorial-grade feature). Each entry is mandatory per AGENTS.md "Update if applicable" rules — none discretionary.

### M4. Engine version validation at replay. (Opus M2)

**Fix:** §9.1 / §9.3: replayer warns on engineVersion mismatch (minor); refuses cross-major-version replay (`BundleVersionError` with a more specific code).

### M5. `eventsBetween(fromTick, toTick)` boundary semantics ambiguous. (Opus M3)

**Fix:** §9 declares "inclusive on both ends." Document explicitly.

### M6. self-check tests cover only one violation pattern. (Opus M4)

**Fix:** §13.3 expanded: each clause of §11.1 (now extended per H4/H5) gets a paired test (clean + violating). Specifically:

- Math.random() in a system (existing).
- Direct `world.setComponent` from outside any system between ticks.
- Wall-clock time inside a system (`Date.now()`).
- Mid-tick `submit()` from a system (CR5 violation).
- Side-effecting validator (H4 violation).
- Cross-Node-version replay smoke (skip on identical-version environments).

### M7. selfCheck cost model and throughput target. (Opus M5)

**Fix:** §13.2 long-capture smoke test wording amended: "replay throughput ≥ 5x recording throughput **when openAt() walks a single segment**; selfCheck across N segments is N × that cost and is benchmarked separately." Drop the conflated multiplier.

### M8. `worldFactory` ergonomics is load-bearing — promote to ADR. (Opus M6)

**Fix:** new ADR 4 in §15: "The `worldFactory` callback is part of the determinism contract. Bundle replay requires the consumer to reproduce the recording-time component/validator/handler/system registration set, in the same order. Drift between record-time and replay-time factories produces `selfCheck` divergences indistinguishable from genuine determinism violations. Acceptable in v1; a future spec may persist a registration manifest in the bundle."

### M9. Stale entity refs in markers — not in BundleIntegrityError list. (Opus M8)

**Fix:** §12 adds `BundleIntegrityError` reasons: stale entity ref (entity died after marker creation but before bundle finalization) is not an integrity error — markers are point-in-time annotations and may reference entities that no longer exist. Document explicitly so consumers know.

## Low Findings

### L1. Assertion marker provenance is convention-only. (Opus L1)

**Fix:** §6 adds `provenance: 'engine' | 'game'` field on markers. `kind: 'assertion'` markers added via `scenarioCaptureToBundle()` get `provenance: 'engine'`; user-added assertions get `provenance: 'game'`. Downstream consumers can trust engine-provenance markers as engine-validated.

### L2. Bundle command/execution arrays unbounded — sharding not addressed. (Opus L2)

**Fix:** acknowledge in §16 Open Questions; defer concrete sharding strategy to implementation phase. Add a note to §5.2 that `commands.jsonl` and `executions.jsonl` (introduced by H3) shard naturally by line; future enhancement may rotate at size threshold.

### L3. Buffered-sink guidance missing. (Opus L3)

**Fix:** §8 / §11 mention production pattern: for live capture in latency-sensitive contexts, wrap `FileSink` in a `BufferedSink` (out-of-spec; sketched as a follow-up) that batches in memory and flushes on a worker. v1 ships `MemorySink` and `FileSink` only; buffered variant is acknowledged as future work.

### L4. ADR 1 LOC estimate honesty. (Opus L4)

**Fix:** ADR 1 cost estimate amended to "~80–100 LOC of structurally similar listener wiring" instead of "~30 LOC."

## Notes

### N1. FileSink incomplete-bundle replay behavior. (Opus N1)

**Fix:** §12 / §9.1 documented: replayer accepts `incomplete: true` bundles and replays the available prefix; `metadata.endTick` is the last tick that successfully wrote to disk. `BundleIntegrityError` is raised only when manifest is malformed, not when the recorded prefix is consistent.

### N2. Snapshot equality format choice. (Opus N2)

**Fix:** Already in Open Questions. Add invariant: "WorldSnapshot serialization uses insertion-ordered Map iteration, so two snapshot objects with equal content have equal key order; deep-equal can rely on this."

### N3. Promote selfCheck to CI gate via existing scenario suite. (Opus N3)

**Fix:** §13.3 / §18 acceptance criteria: "Every existing scenario in the engine test suite runs `selfCheck()` on its produced bundle as part of `npm test`. selfCheck failures fail the test suite. This converts the documented determinism contract into an enforced-by-corpus gate."

## Spec-Revision Plan

Spec needs significant rewrite. Order:

1. Bundle format (§5) — drop `inline` ref variant (CR6); add `RecordedCommand` type and replace `commands: CommandSubmissionResult[]` (CR1); add `commands.jsonl` etc. to FileSink layout (H3).
2. Marker schema (§6) — `EntityRef[]` not `EntityId[]` (H9); restrict validation to live tick (M1); add `provenance` field (L1).
3. Recorder API (§7) — sync sinks only (CR2); intercept `submit()` for payload capture (CR1); lifecycle consistency (M2); single-use connect/disconnect (M2).
4. Sink interface (§8) — sync only (CR2); add `SessionSource` companion (H3).
5. Replayer (§9) — explicit replay loop semantics (CR4); range checks (H7); selfCheck includes initial span + events + executions (H1, H6); engineVersion validation (M4); incomplete-bundle handling (N1).
6. Scenario integration (§10) — function-not-class adapter (H2); document post-setup initialSnapshot (H8); unbounded history requirement.
7. Determinism contract (§11) — mid-tick submit forbidden (CR5); validators must be pure (H4); engine+Node version + transcendentals + registration order + query iteration (H5); poison/recover replay scope-limited (CR3).
8. Error handling (§12) — `BundleRangeError` (H7); stale entity refs not error (M9).
9. Testing (§13) — paired tests per clause (M6); selfCheck CI gate (N3); cost model wording (M7).
10. Documentation (§14) — concepts.md, ai-integration.md, getting-started.md, building-a-game.md (M3).
11. ADRs (§15) — new ADR 4 worldFactory part of contract (M8); ADR 1 LOC honesty (L4).
12. Open Questions (§16) — sharding (L2); buffered sink (L3); incomplete-bundle integrity (N1).
13. Acceptance Criteria (§18) — selfCheck CI gate (N3).

Iter-2 review will verify all of the above land cleanly without introducing new issues.

## Reviewer Coverage

| Severity | Codex | Opus | Convergent | Diverged |
| -------- | ----- | ---- | ---------- | -------- |
| Critical | 3     | 3    | 3 (CR1=Codex, CR4=Codex+Opus, CR6=Opus; CR2=Codex; CR3=Codex; CR5=Opus) | 0 |
| High     | 5     | 6    | 4 overlap, 7 unique | — |
| Medium   | 5     | 8    | 3 overlap, 10 unique | — |
| Low      | 0     | 4    | — | — |
| Note     | 1     | 3    | — | — |

Codex caught structural / API-grounded issues with file-line citations. Opus caught contract-level / architectural-completeness issues with deeper reasoning. Complementary; neither would have been sufficient alone. Two-reviewer convergence on critical findings is strong signal.
