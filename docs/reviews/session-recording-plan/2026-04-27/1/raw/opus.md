I have enough context to write the review. The plan and spec are substantial, but I've identified a number of concrete issues by cross-checking the plan's test/impl skeletons against the engine source.

# Multi-CLI-style Review — Session Recording & Replay Implementation Plan

## Summary

The plan is well-structured: ordered tasks T1→T9, per-task `c`-bumps, gate-checked commits, TDD discipline, and traceability back to spec sections. T1–T4 have detailed test+impl skeletons. **However, several plan-vs-impl mismatches in the early test code will fail `npm test` if followed verbatim, and the plan misses two non-trivial integration points (scenario-runner plumbing, `WorldHistoryRecorder.clear()` extension) needed to make T8's CI gate work.** T5 and T6 — the largest and riskiest tasks — are the LEAST detailed, with only bullet-list summaries. Process compliance with AGENTS.md has gaps: per-task multi-CLI review and per-task doc updates are deferred to T9 instead of being run after each task.

## Findings

### Critical

**C-1. T2 MemorySink test "open() stores metadata; toBundle() returns the snapshot of state" calls `toBundle()` after `open()` only — but the impl throws `SinkWriteError('no snapshots written; cannot build bundle')` whenever `_snapshots.length === 0`.** The test expects a successful return with `bundle.snapshots = []` and `bundle.schemaVersion = 1`, but `toBundle()` will throw before any expectations run. Either the impl's `_snapshots.length === 0` guard must be relaxed (which then yields `initialSnapshot: undefined`, type-incompatible with `WorldSnapshot`), or the test must be rewritten to expect a throw on empty sinks. Plan ships both as-is; following T2 verbatim fails T2's own gate.

**C-2. T2 MemorySink test "writeTick / writeCommand / writeSnapshot accumulate in order" writes ONE snapshot and asserts `expect(bundle.snapshots).toHaveLength(1)`, but the impl computes `bundle.snapshots = this._snapshots.slice(1)` — which yields `[]` for a single write, since the first written snapshot is consumed as `initialSnapshot`.** The semantics in the impl are correct vs spec §5.1 + §9.3 (bundle.snapshots excludes the initial), so the test assertion is wrong. The test needs either two snapshot writes or a corrected length-0 assertion. Same effect as C-1: T2 fails on its own author.

**C-3. T4 modifies only `src/history-recorder.ts`, but T8 immediately uses `runScenario({ history: { captureCommandPayloads: true, ... } })`.** For this to compile and run, `ScenarioConfig.history` (`src/scenario-runner.ts:110-114`) must add `captureCommandPayloads?: boolean`, and `runScenario` (`src/scenario-runner.ts:146-152`) must thread it into `new WorldHistoryRecorder({...})`. The plan never lists scenario-runner.ts in T4's modified files, and T8 only modifies the test file. Without this plumbing, T8's migration code is a no-op (`history.recordedCommands` stays undefined) and the CI gate fails. This must move into T4 (or land as a sibling step).

### High

**H-1. `cloneJsonValue` is duplicated privately in `history-recorder.ts:430` and `scenario-runner.ts:474`; it is NOT exported from `json.ts`.** Plan T5 says SessionRecorder uses `cloneJsonValue` for per-tick clone discipline. Without an explicit decision, the developer will either (a) copy the function a third time (cementing AGENTS.md's anti-duplication rule violation that the multi-CLI review will flag), or (b) export it from one of the existing locations. T1 is the natural place to extract `cloneJsonValue` to `src/json.ts` so all three consumers import from one source — but the plan never addresses this.

**H-2. T4 modifies `WorldHistoryRecorder` constructor + connect/disconnect, but does NOT mention extending `clear()` (`src/history-recorder.ts:157-165`).** `runScenario` calls `history.clear()` after `setup` runs (`src/scenario-runner.ts:175`), which re-captures the initial snapshot. If `clear()` doesn't also reset `_recordedCommands`, every replayable scenario bundle will carry pre-setup command submissions in its `recordedCommands`, breaking determinism contract clauses 1+8.

**H-3. T8's existing-scenario migration handwaves the worldFactory.** All four scenarios in `tests/scenario-runner.test.ts` register handlers inline inside the `setup` callback (e.g., `tests/scenario-runner.test.ts:29-36, 118, 154, 192-194`). For `worldFactory: (snap) => /* construct an equivalent World */` to actually work, each scenario's handler/component registration must be extracted into a standalone function reusable by both `setup` and `worldFactory`. This is real refactor work for every scenario. The plan should call this out and sketch the pattern (e.g., `function setupMoveScenario(world) {...}` shared between `setup` and `worldFactory`).

**H-4. T8 doesn't define how selfCheck behaves on the existing `handler-crash` scenario (`tests/scenario-runner.test.ts:185-210`).** That scenario intentionally records a `TickFailure`; per spec §9.1, `openAt(failureTick)` throws `BundleIntegrityError`. selfCheck in §9.3 walks segments and calls `world.step()` — what happens when the replay step itself throws on the recorded failure tick? The spec is silent and the plan doesn't specify (skip the scenario? compare failures? early-terminate the segment?). T8 will hit this immediately when migrating.

**H-5. AGENTS.md mandates per-task multi-CLI review ("after coding, ask the code reviewer to review… iterate"), but the plan only schedules a single multi-CLI review on the chained `main..HEAD` diff at T9.** Reviewing a ~4000-LOC, 9-commit diff in one pass is far less effective than iterating per task, and the plan's `<scope>` directory structure for review artifacts (`docs/reviews/<task-slug>/<date>/<iter>/`) is built around per-task reviews. Also each task's commit is being declared "done" (with version bump + changelog entry) before any reviewer has seen it, which directly contradicts AGENTS.md "before declaring the task done."

**H-6. AGENTS.md mandates per-task doc updates for "API surface" changes (every new export/type/method); the plan defers ALL `docs/api-reference.md`, `docs/architecture/*`, `docs/guides/*` updates to T9.** T1 introduces ten new public types (`SessionBundle`, `Marker`, `RecordedCommand`, etc.); T2 ships `MemorySink`, `SessionSink`, `SessionSource`; T3 ships `FileSink`. Each of these should land docs in the same commit per AGENTS.md "Code changes are not done until the docs match." T9 is too late — doc lag of 8 commits will be flagged by `doc-review` and by the multi-CLI reviewers.

### Medium

**M-1. T7's `metadata.engineVersion` source uses `process.env.npm_package_version` "or import-meta-style; whichever the engine already uses".** `process.env.npm_package_version` is only populated when the process is launched via `npm run`; direct `node` or test runners may not set it. The engine doesn't currently embed its version anywhere I can find. The plan needs a deterministic mechanism (e.g., import a `version.ts` that the build/release process keeps in sync with `package.json`, or read `package.json` via `import attributes`). Otherwise scenario bundles will have `engineVersion: 'undefined'` in non-npm contexts.

**M-2. FileSink MIME-to-extension mapping is unspecified.** T3's test asserts `attachments/big.png` exists for `mime: 'image/png'`, which pins the mapping to `.png`. But the plan doesn't define a mapping table for other MIME types (`application/octet-stream` → `.bin`? `image/jpeg` → `.jpg` or `.jpeg`?). This affects bundle interop and recovery scans of `attachments/`. Reader code will need to list directory contents and match by stem, OR the spec needs a fixed table. Plan should specify either an explicit table or a strategy ("derive ext from mime, fall back to `.bin`") in T3.

**M-3. T5 (~400 LOC, ~18 tests) and T6 (~350 LOC, ~16 tests) — the two highest-risk tasks — have only bullet-list summaries with no code skeletons.** T1–T2 ship full test code and full impl. T5 and T6 ship test count + impl summary. Concrete sketches matter here especially for: the `submitWithResult` wrap install/uninstall closure (typing concern in M-5), the marker validation algorithm (entity liveness lookup, cell bounds), the `selfCheck` segment-walking + listener-accumulator pattern, and the deep-equal-with-firstDifferingPath helper (which is itself ~50–100 LOC of code per spec §9.3 "fast recursive deep-equal that short-circuits"). Plan should expand T5/T6 to T1's level of detail, or at minimum hand-roll the two riskiest helpers.

**M-4. The hidden mutex slot `world.__payloadCapturingRecorder` requires either a TypeScript declaration merge against `World` or `(world as any).__...` escapes.** Plan never addresses how to do this without leaking `any` into the production code. A shared `WorldInternals` type augment (`declare module './world.js' { interface World { __payloadCapturingRecorder?: ... } }`) is the cleanest route, but the plan should commit to a path. Both T4 and T5 need this; T4 ships first, so it should establish the pattern.

**M-5. The wrap-install snippet in spec §7.3 — `world.submitWithResult = function recordedSubmitWithResult(type, data) { ... }` — has TypeScript generic-overwrite typing concerns.** `submitWithResult` is generic (`<K extends keyof TCommandMap>`), and a method assignment at the instance level needs a matching generic signature. The plan's snippet shows an unannotated function. Direct assignment will likely require a cast through `unknown` or a typed `Function` shim. Plan should sketch the working TS approach so the developer doesn't iterate on type errors.

**M-6. T4 test "disconnect unwraps submitWithResult so subsequent recorders see clean delegation" uses `world.submitWithResult.toString()` comparison.** Function `.toString()` is V8-version-dependent and brittle (bound vs unbound, native vs wrapped). A behavioral check (e.g., submit a command after disconnect, verify it does NOT appear in `recordedCommands`, AND verify `world.__payloadCapturingRecorder` is null/undefined) is more robust.

**M-7. T8 clauses 7 (env branching) and 9 (cross-major Node) are difficult to engineer reliably as paired tests.** Clause 7 needs a way to make `process.env` differ between record and replay (mocking + restore + cleanup). Clause 9 needs a cross-major Node runtime — not available in a single Vitest run. Plan says clause 9 is "Skipped on identical-version environments" but doesn't say HOW (`it.skipIf(process.version major === bundle.nodeVersion major)`?). Plan should commit to concrete patterns or downgrade clauses 7+9 to `it.todo` with rationale.

**M-8. spec §9.3 commits to "fast recursive deep-equal that short-circuits on first mismatch and produces a best-effort dotted firstDifferingPath" for selfCheck state comparison — this is a substantive utility (~50–100 LOC including path-tracking, NaN/circular handling).** T6 doesn't sketch it. The choice between writing it from scratch vs leveraging an existing dependency vs comparing via canonical-JSON hash + secondary path-tracker affects T6's LOC budget materially. Plan should pick one.

### Low

**L-1. UUID generation mechanism not specified.** Plan T5 says "generates `sessionId` (UUID)" without saying which API. Node 18+ ships `crypto.randomUUID()` which fits the engine's stated Node 18+ baseline; plan should commit to it (avoids the developer pulling in a `uuid` dependency).

**L-2. Entity-liveness validation method for `addMarker` not specified.** Marker validation per spec §6.1 needs to check `EntityRef.id`+`generation` against the live `EntityManager`. Plan T5 says "entity ref check" but doesn't name the API. The codebase's `world.entityManager` is private; an `isAlive(id, generation)` accessor may need to be added (or already exists — verify).

**L-3. `MarkerValidationError.referencesValidationRule?: string` per spec §11.3 is described as a top-level field, but plan T1 puts no such field on the class** — the developer would need to stuff it inside `details`. Spec is mildly ambiguous here; flag as a clarification needed rather than a bug.

**L-4. T1's `Sink.writeAttachment` returns `AttachmentDescriptor`; spec §8 declares the return type as `void`.** The plan's choice is better (the recorder needs to observe the finalized descriptor's `ref` shape), but it's a deviation from the converged spec — should either be folded back into the spec as v6 or noted in T1's commit message as an implementation refinement.

**L-5. T5 doesn't explicitly define the spec's `NewMarker = Omit<Marker, 'id' | 'createdAt' | 'provenance'> & { tick?: number }` type** that `addMarker` accepts. Plan should declare it alongside the recorder.

**L-6. Plan's test for "writeAttachment under threshold goes to manifest as dataUrl" passes a descriptor with `ref: { dataUrl: '' }` (empty string) and the impl creates a NEW descriptor.** Slightly awkward — the input ref is just a tag for "I want dataUrl"; using `ref: { dataUrl: 'pending' as const }` or accepting an "intended kind" enum would be clearer. Cosmetic; not blocking.

### Note

**N-1. Plan's "Self-Review" section claims "Type consistency: All cross-task type references match"** — but C-1, C-2, C-3, H-1, H-2 are all type/contract mismatches the self-review missed. Suggests the self-review pass was light. Worth running a stricter type-trace pass before kicking off T1.

**N-2. Plan §"Setup" verifies the four engine gates pass on `main` before T1 — good practice, not always done.** Worth keeping.

**N-3. Plan's per-task version bump policy (0.7.7 → 0.7.15, nine `c`-bumps) is internally consistent with AGENTS.md "One version bump per coherent shipped change" — each task ships a coherent slice.** ✓

**N-4. T6 selfCheck depends on `world.getEvents()` — this exists at `src/world.ts:829-834` ✓ — and on `world.onCommandExecution` listener ✓.** Replayer can use both.

**N-5. The plan acknowledges `World.deserialize` (`src/world.ts:921`) implicitly via `worldFactory: (snap) => World<...>` but doesn't note that `World.deserialize` does NOT re-register handlers/validators** — those must be re-registered by the factory after deserialization. Calling this out explicitly in T6 + T8 would save the developer an iteration.

## Overall Assessment

The plan is in good shape structurally and traces cleanly to a converged spec, but the three Critical findings (test/impl mismatches in T2, missing scenario-runner plumbing in T4) will cause T2 and T8 to fail their gates if followed verbatim. Address those plus the High findings (extract `cloneJsonValue`, extend `clear()`, sketch worldFactory pattern, define handler-crash semantics, restore per-task multi-CLI review and per-task docs) before kicking off T1. T5/T6 should be fleshed out to T1's level of detail before they ship, given that they carry most of the implementation risk.
