# Multi-CLI Plan Review — Session Recording Implementation Plan, Iter-1

**Iteration:** 1.
**Date:** 2026-04-27.
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini quota-out.

## Verdicts

- **Codex:** "Needs rework on the sink contract, the T8 replay-factory/CI-gate plan, and per-task AGENTS compliance before implementation starts."
- **Opus:** "Address those plus the High findings (extract cloneJsonValue, extend clear(), sketch worldFactory pattern, define handler-crash semantics, restore per-task multi-CLI review and per-task docs) before kicking off T1."

Plan needs substantive revision before T1 can begin. Fixes are clarifications/additions, not architectural — the plan is structurally sound, but several test/impl pairs in T2/T4 won't compile, several spec-mandated paths in T6/T7 are missing, and AGENTS.md per-task review/doc discipline is violated.

## Critical Findings (3, both convergent)

**CR1. T2 MemorySink contract drift between tests and impl.** *(both)*

Two related bugs:
- Test "open() stores metadata; toBundle() returns the snapshot of state" calls `toBundle()` after just `open()` with no snapshots; impl throws `SinkWriteError('no snapshots written')` whenever `_snapshots.length === 0`. Test fails before any expectation runs.
- Test "writeTick / writeCommand / writeSnapshot accumulate in order" writes ONE snapshot and asserts `bundle.snapshots.length === 1`; impl computes `bundle.snapshots = this._snapshots.slice(1)` (excluding the initial). With a single write, result is `[]`. Test asserts wrong value.

**Fix:** revise T2 tests so every test that calls `toBundle()` first writes at least one snapshot (which becomes `initialSnapshot`). Tests that need both `initialSnapshot` AND `snapshots[]` must write at least 2 snapshots. MemorySink contract is correct as-spec'd; tests were sloppy.

**CR2. T4 doesn't extend `ScenarioConfig` or `runScenario` to thread `captureCommandPayloads`.** *(Opus)*

Spec §10.2 commits `captureCommandPayloads: true` as the scenario opt-in. T4 only modifies `src/history-recorder.ts`. T8 immediately uses `runScenario({ history: { captureCommandPayloads: true, ... } })` — for that to compile, `ScenarioConfig.history` (`src/scenario-runner.ts:110-114`) must add `captureCommandPayloads?: boolean`, and `runScenario` (`src/scenario-runner.ts:146-152`) must thread it into `new WorldHistoryRecorder({...})`. Without this plumbing in T4, T8's migration is a no-op and the CI gate fails.

**Fix:** T4 modifies BOTH `src/history-recorder.ts` AND `src/scenario-runner.ts`; tests cover the threading path.

**CR3. T4 also must extend `WorldHistoryRecorder.clear()` to reset `recordedCommands`.** *(Opus, validated)*

`runScenario` calls `history.clear()` after `setup` runs (`src/scenario-runner.ts:175`), rebasing `initialSnapshot`. If `clear()` doesn't also reset `recordedCommands`, every replayable scenario bundle carries pre-setup command submissions in its commands stream, breaking determinism contract clauses 1+8 immediately on the first selfCheck call.

**Fix:** T4 includes `clear()` extension + a regression test.

## High Findings (10, mostly convergent)

**H1. FileSink default attachment policy is reversed in plan vs spec.** *(Codex)*

Spec §7.1 step 5 (post-iter-2): "FileSink defaults to **sidecar** for any blob (the disk-backed sink keeps blobs as files; pass `{ sidecar: false }` to force `dataUrl` embedding into the manifest, only useful for very small attachments)." Plan T3 inverts: small dataUrl, large sidecar.

**Fix:** T3 — FileSink defaults to sidecar unconditionally; `{ sidecar: false }` opts into dataUrl for the rare small-blob case.

**H2. T4 test scaffolds use `new World()` without `WorldConfig`.** *(Codex)*

`World` constructor requires `WorldConfig`. Plan tests will fail to compile.

**Fix:** every T4 test (and any future test) constructs `new World({ /* minimal config */ })` per the actual `World` constructor signature. T4 expansion includes a helper `mkWorld()` to centralize this.

**H3. T6 doesn't allocate behavior or tests for `ReplayHandlerMissingError` (introduced in T1) or for `no_replay_payloads` bundles.** *(Codex)*

Spec calls these out (§12 + §10.3). T6 currently has no test coverage and no impl direction.

**Fix:** T6 expanded with:
- Test: `openAt` on a bundle whose `RecordedCommand.type` is not registered in the factory-built world throws `ReplayHandlerMissingError`.
- Test: `openAt(tick > startTick)` on a bundle with `commands: []` throws `BundleIntegrityError(code: 'no_replay_payloads')`.
- Test: `selfCheck()` on a no-payload bundle returns `{ ok: true, checkedSegments: 0 }` with a `console.warn`.

**H4. T6 doesn't define selfCheck behavior on bundles with `failedTicks`.** *(Opus)*

Spec §9.1 says `openAt` across failures throws. selfCheck calls openAt-equivalent per segment. What happens when a recorded `TickFailure` is mid-segment?

**Fix:** T6 specifies — selfCheck SKIPS segments whose `[fromTick, toTick)` range intersects any `metadata.failedTicks` entry, recording a "skipped" entry in the result. Test coverage: a deliberately-failing scenario produces a bundle whose selfCheck returns `ok: true, skippedSegments: [...]`.

**H5. T8 worldFactory is a `/* construct an equivalent World */` placeholder.** *(both)*

All 4 scenarios in `tests/scenario-runner.test.ts` register handlers/components inside their `setup` callbacks. For replay's `worldFactory` to reproduce that registration, each scenario's setup must be extracted into a standalone function reusable by both `scenario.setup` and `worldFactory`.

**Fix:** T8 explicitly refactors each existing scenario:

```ts
function setupMoveScenario(world: World): void {
  // register components, handlers, validators
}
const result = runScenario({
  world: makeWorld(),
  setup: (ctx) => setupMoveScenario(ctx.world),
  run: ...,
  checks: ...,
  history: { capacity: Number.MAX_SAFE_INTEGER, captureCommandPayloads: true, captureInitialSnapshot: true },
});
const bundle = scenarioResultToBundle(result);
const replayer = SessionReplayer.fromBundle(bundle, {
  worldFactory: (snap) => {
    const w = makeWorld();
    setupMoveScenario(w);
    return World.deserialize(w, snap);  // or however the engine reuses an existing World shell
  },
});
```

Plan must include this pattern as an explicit step in T8 with all 4 scenarios refactored.

**H6. AGENTS.md per-task multi-CLI review missing.** *(both)*

Plan schedules one multi-CLI review on the full chain at T9. AGENTS.md mandates "after coding, ask the code reviewer to review… iterate" for every behavior change. Each commit is "declared done" with version bump + changelog before any reviewer has seen it.

**Fix:** every task T1–T8 ends with a multi-CLI review iteration:
1. After tests + impl + gates pass, before commit, generate the diff.
2. Run Codex + Opus + (Gemini if quota) on `git diff main..HEAD` for the WIP changes.
3. Save outputs to `docs/reviews/session-recording-T<N>/<date>/<iter>/raw/{codex,opus,gemini}.md`.
4. Synthesize REVIEW.md, address findings, iterate to convergence.
5. THEN bump version, finalize changelog, commit.

T9 becomes a final-integration / cross-task-consistency review only.

**H7. AGENTS.md per-task doc updates missing.** *(both)*

Plan defers `docs/api-reference.md` / `docs/architecture/*` / `docs/guides/*` updates to T9. AGENTS.md "Always update if the change introduces or removes API surface" requires per-commit doc updates. Each of T1–T7 adds public surface.

**Fix:** every task T1–T7 includes the relevant per-task doc updates IN THE SAME COMMIT:
- T1: `docs/api-reference.md` sections for the new types + errors.
- T2: api-reference for SessionSink/MemorySink + `docs/guides/session-recording.md` (start it now, expand per task).
- T3: api-reference for FileSink.
- T4: api-reference + `docs/guides/scenario-runner.md` updates for `captureCommandPayloads`.
- T5: api-reference for SessionRecorder + extend session-recording.md.
- T6: api-reference for SessionReplayer + extend session-recording.md (replay + selfCheck sections).
- T7: api-reference for `scenarioResultToBundle()` + extend scenario-runner.md.
- T8: README.md feature row + extend session-recording.md (CI gate).
- T9: `ARCHITECTURE.md`, `decisions.md`, `drift-log.md`, `concepts.md`, `ai-integration.md`, `getting-started.md`, `building-a-game.md`, `docs/README.md` index. T9 = the cross-cutting structural docs that don't fit any single task.

**H8. `cloneJsonValue` is duplicated in `history-recorder.ts:430` and `scenario-runner.ts:474`; not exported from `json.ts`.** *(Opus)*

T5 says SessionRecorder uses `cloneJsonValue` for clone discipline. Without an explicit decision, the dev will copy it a third time (multi-CLI reviewers will flag).

**Fix:** insert a "T0 / Setup" step (or fold into T1) that exports `cloneJsonValue` from `src/json.ts` and imports both existing call sites from there. Then T5 imports the shared symbol.

**H9. T5 / T6 are too thin (bullet summaries, no code skeletons).** *(Opus)*

T5 (~400 LOC, 18 tests) and T6 (~350 LOC, 16 tests) are the riskiest tasks. Plan ships full code for T1/T2 but only summaries for T5/T6.

**Fix:** expand T5 and T6 with key impl sketches (constructor + connect + per-tick + addMarker + disconnect for T5; openAt + selfCheck + deep-equal helper for T6) and at least a handful of full test bodies (not just descriptions).

**H10. T7 `engineVersion` source unspecified.** *(Opus)*

`process.env.npm_package_version` only works when launched via `npm run`. Engine doesn't currently embed version anywhere reliable.

**Fix:** T7 commits to a deterministic mechanism. Recommended: add a `src/version.ts` (`export const ENGINE_VERSION = '0.7.13' as const;`) that the build/release process keeps in sync with `package.json` (or import package.json via `import attributes` if Node 22 supports it natively). Plan picks one and documents.

## Medium Findings (8)

**M1. FileSink MIME-to-extension mapping unspecified.** *(Opus M-2)*

Test asserts `attachments/big.png` for `mime: 'image/png'`. Plan needs a fixed table (`image/png → .png`, `image/jpeg → .jpg`, `application/octet-stream → .bin`, fallback → `.bin`).

**Fix:** T3 includes the mapping table.

**M2. Hidden mutex slot `world.__payloadCapturingRecorder` needs declaration merge or `as any`.** *(Opus M-4)*

Plan never specifies. Cleanest path: shared internal-only declaration `declare module './world.js' { interface World { __payloadCapturingRecorder?: ...; } }` in a `src/session-internals.ts`.

**Fix:** T4 establishes the pattern (since T4 is first to use the slot).

**M3. `submitWithResult` wrap typing concerns.** *(Opus M-5)*

`submitWithResult` is generic; instance-level method override requires careful TS handling. Plan should sketch a working approach.

**Fix:** T4 (and T5) ship a typed wrap helper that handles the generics correctly.

**M4. T4 test "disconnect unwraps" uses `world.submitWithResult.toString()` comparison.** *(Opus M-6)*

`.toString()` is V8-version-dependent and brittle.

**Fix:** behavioral check instead — submit after disconnect, verify NOT in `recordedCommands`, verify slot null.

**M5. T8 clauses 7 + 9 (env branching, cross-Node-major) are difficult to engineer reliably.** *(Opus M-7)*

Clause 7 needs env mocking + restore; clause 9 needs cross-Node-major runtime not available in Vitest.

**Fix:** T8 uses `it.todo` for clause 9 with rationale (cross-Node-major covered by manual integration test or future CI matrix); clause 7 uses concrete env-mocking pattern (`vi.stubEnv` then `vi.unstubAllEnvs`).

**M6. selfCheck deep-equal helper not sketched.** *(Opus M-8)*

Spec §9.3 commits to "fast recursive deep-equal that short-circuits + best-effort firstDifferingPath" — substantive utility (~50–100 LOC).

**Fix:** T6 includes a full impl sketch for `deepEqualWithPath(a, b): { equal: boolean, firstDifferingPath?: string }`.

**M7. TDD discipline thins out after T2/T4.** *(Codex)*

T1/T2 have explicit "run and expect failure" red-step verification. T3–T8 jump from prose test descriptions to impl summaries.

**Fix:** every task includes explicit red-step (`npm test -- <file>` and expected failure message) and green-step (same command, expected pass) verifications.

**M8. T8 clause 9 mis-specified.** *(Codex H-4)*

Plan says all clauses 1–9 violations produce `check.ok === false` + divergence. But clause 9 (version compatibility) is enforced by `BundleVersionError` thrown from `openAt()` / replayer construction, not by selfCheck divergence.

**Fix:** T8 splits clause 9 into "throws on cross-`b` engineVersion" + "warns on within-`b` engineVersion" tests, separate from selfCheck path.

## Low Findings (6)

**L1. UUID generation not specified.** Use `crypto.randomUUID()` (Node 18+ stdlib). Update T5/T7.

**L2. Entity-liveness API for marker validation.** `world.entityManager` is private; need `world.isAlive(id, generation)` accessor (or equivalent). T5 either uses an existing API or the plan adds the accessor as a setup step.

**L3. `MarkerValidationError.referencesValidationRule` field placement.** Spec §11.3 implies top-level field; T1 ships it inside `details`. Pick one. Recommend: top-level optional field on `MarkerValidationError` only.

**L4. `Sink.writeAttachment` return type.** Plan returns `AttachmentDescriptor`; spec §8 says `void`. Plan's choice is better (recorder needs the finalized descriptor); fold back into spec or note in commit.

**L5. `NewMarker` type not declared.** T5 uses `NewMarker = Omit<Marker, 'id' | 'createdAt' | 'provenance'> & { tick?: number }` from spec §7 but doesn't define it in T5 code. Add to T5.

**L6. Plan's "writeAttachment under threshold goes to manifest as dataUrl" test passes `ref: { dataUrl: '' }` (empty placeholder).** Cosmetic; replace with a more obvious "request kind" pattern.

## Note Findings (5)

**N1. Plan's self-review missed CR1, CR2, CR3, H1, H2.** Self-review pass was light. Worth running stricter type-trace pass.

**N2. Setup-phase gate verification ✓.**

**N3. Per-task `c`-bumps consistent with AGENTS.md ✓.**

**N4. `world.getEvents()` and `world.onCommandExecution` exist ✓.**

**N5. `World.deserialize` does NOT re-register handlers/validators.** Worth calling out in T6+T8 explicitly so the dev knows the factory must register them.

## Plan Revision Plan

In rough priority:

1. **Setup phase / new T0:** extract `cloneJsonValue` to `src/json.ts`; both existing files import.
2. **T1 fixes:** test cleanup; `ref` placeholder simpler; declare `NewMarker`; `referencesValidationRule` as top-level.
3. **T2 fixes:** all tests write ≥1 snapshot before `toBundle()`; tests asserting `snapshots.length === 1` write 2 snapshots.
4. **T3 fixes:** FileSink default sidecar; MIME → ext mapping table; full red-step.
5. **T4 fixes:** add `src/scenario-runner.ts` to modified files (extend `ScenarioConfig.history` + thread option); extend `WorldHistoryRecorder.clear()` to reset `recordedCommands`; `mkWorld()` test helper; `__payloadCapturingRecorder` declaration-merge pattern; behavioral disconnect check.
6. **T5 expansion:** key code skeletons for constructor / connect / per-tick / addMarker / disconnect; `crypto.randomUUID()`; entity-liveness API decision.
7. **T6 expansion:** key code skeletons for openAt + selfCheck; `deepEqualWithPath` impl; `ReplayHandlerMissingError` + `no_replay_payloads` paths; `failedTicks`-skipping in selfCheck.
8. **T7 fixes:** `src/version.ts` engine-version source; deserialize + re-register sketch.
9. **T8 expansion:** scenario refactor pattern (`setupXScenario(world)` extracted); explicit handler-crash semantics; clause 9 = throws-not-divergence; clause 7 env-mocking pattern; clause 9 = `it.todo` for cross-Node-major.
10. **Per-task multi-CLI review** added as an explicit step in every task T1–T8 (with output saved to `docs/reviews/session-recording-T<N>/<date>/<iter>/`).
11. **Per-task doc updates** added to every task T1–T7 (api-reference, session-recording.md, scenario-runner.md as scope dictates).
12. **T9 redefinition:** structural docs (ARCHITECTURE, decisions, drift-log, concepts, ai-integration, getting-started, building-a-game, README) + final integration + holistic doc-review pass.
13. **Stricter self-review pass** at the end before iter-2 review.

Iter-2 review will verify all of the above and surface anything remaining.

## Reviewer Coverage

| Severity | Codex | Opus | Convergent | Codex-only | Opus-only |
| -------- | ----- | ---- | ---------- | ---------- | --------- |
| Critical | 1     | 3    | 1          | 0          | 2         |
| High     | 5     | 6    | 4          | 1          | 2         |
| Medium   | 1     | 8    | 1          | 0          | 7         |
| Low      | 0     | 6    | 0          | 0          | 6         |
| Note     | 1     | 5    | 0          | 1          | 4         |

Both reviewers fundamentally agree the plan needs revision before T1 can begin; convergence on the headline issues (sink contract, T4 plumbing, FileSink policy, missing replay paths, AGENTS-process violations) is strong. Plan v2 should land all fixes; iter-2 will verify.
