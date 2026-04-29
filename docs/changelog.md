# Changelog

## 0.8.8 - 2026-04-29

Spec 6 - Strict-Mode Determinism Enforcement. Tier-3 of the AI-first dev roadmap; opt-in `WorldConfig.strict` flag rejects content mutations called outside system phases / setup window / `runMaintenance(fn)` callbacks.

### New (additive)

- **`WorldConfig.strict?: boolean`** (default `false`): opt-in mutation-gate enforcement.
- **`World.endSetup()`**: explicitly close the setup window before the first tick. Idempotent. No-op when `strict !== true`.
- **`World.runMaintenance<T>(fn): T`**: out-of-tick mutation hatch. Reentrant via depth counter (no-op nesting). Returns `fn`'s return value.
- **`World.isStrict()`**, **`World.isInTick()`**, **`World.isInSetup()`**, **`World.isInMaintenance()`**: introspection getters.
- **`StrictModeViolationError`** (`src/world-strict-mode.ts`): thrown when a gated method is called outside a writable phase. `details = { code: 'strict_mode_violation', method, phase: 'between-ticks' | 'after-failure', advice }`.

### Behavior callouts

- **22 mutation methods are gated** when `strict: true`: createEntity, destroyEntity, addComponent, setComponent, removeComponent, patchComponent, setPosition, addResource, removeResource, setResourceMax, setProduction, setConsumption, addTransfer, removeTransfer, setState, deleteState, addTag, removeTag, setMeta, deleteMeta, emit, random. Each calls `assertWritable(this, 'methodName')` at the top.
- **Registration is NOT gated** — registerComponent, registerSystem, registerHandler, registerValidator, registerResource work at any time (per ADR 38).
- **Listener-side mutations stay in-tick** — `_inTickPhase` is cleared in an outer `runTick` finally that runs *after* both diff-listener emission AND `onTickFailure` listener emission. Listeners that mutate (e.g., `world.recover()` from inside `onTickFailure`) succeed.
- **`CommandTransaction.commit()` does NOT auto-open maintenance** (per ADR 40). Inside-tick commit works via `_inTickPhase`; outside-tick callers must wrap explicitly: `world.runMaintenance(() => txn.commit())`.
- **`applySnapshot` uses `_maintenanceDepth` increment** for forward-compat (per ADR 37). Today's path uses internal-only mutations that bypass the public gate; the increment makes a future refactor safe.
- **`World.deserialize` is static** — the new world's `_inSetup` (when strict) covers internal state-loading mutations.
- **Bundles are unchanged modulo `config.strict`**: a strict world produces a `SessionBundle` byte-identical to a non-strict world's for the same seed/inputs, except the snapshot's `config.strict: true` field (added so `World.deserialize` preserves the flag). Strict mode does not affect tick-content determinism — only enforcement.

### ADRs

- ADR 36: Strict mode is opt-in default-off.
- ADR 37: applySnapshot uses `_maintenanceDepth` for forward-compat; deserialize relies on the fresh world's setup window.
- ADR 38: Registration calls are not gated.
- ADR 39: Reentrant maintenance via depth counter (no-op nesting).
- ADR 40: `CommandTransaction.commit()` does NOT auto-open maintenance.

### Implementation notes

- New module `src/world-strict-mode.ts` (extracted to keep `src/world.ts` from compounding existing 2379-LOC overage). Exports `StrictModeViolationError`, `StrictModePhase`, `StrictModeViolationDetails`, and the `assertWritable` helper.
- `src/types.ts` extended with `WorldConfig.strict?: boolean`.
- `src/command-transaction.ts` `FORBIDDEN_PRECONDITION_METHODS` extended with `endSetup` and `runMaintenance` (state-management calls forbidden inside read-only precondition predicates).

### Validation

All four engine gates pass: `npm test` (966 passed + 2 todo, +22 new in `tests/strict-mode.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`.

## 0.8.7 - 2026-04-28

Spec 4 - Standalone Bundle Viewer. Tier-3 of the AI-first dev roadmap; programmatic agent-driver API for navigating, slicing, and diffing a `SessionBundle`. Composes with `BundleCorpus` and `SessionReplayer`.

### New (additive)

- **`BundleViewer<TEventMap, TCommandMap, TDebug>`**: wraps a `SessionBundle`; exposes navigation by tick (`atTick`) / marker (`atMarker`) / timeline; iterators for events / commands / executions / markers / failures with eager bound validation; lazy memoized `SessionReplayer` constructed from supplied `worldFactory`.
- **`BundleViewer.fromSource(source, options?)`**: materializes through `SessionSource.toBundle()` and constructs a viewer.
- **`TickFrame`**: per-tick view with `events`, `commands`, `executions`, `markers`, `diff`, `metrics`, `debug`, plus `state()`, `snapshot()`, `diffSince(otherTick, options?)`. Selective runtime freezing — outer frame + per-tick arrays frozen one-time; array elements not individually frozen (documented bypass).
- **`RecordedTickFrameEvent`** (frame-anchored, no per-event tick) and **`RecordedTickEvent`** (iterator-yielded, with tick).
- **`BundleStateDiff`** with `fromTick`, `toTick`, `source: 'tick-diffs' | 'snapshot'`, and a `TickDiff`-shaped `diff`. `frame.diffSince` folds recorded `TickDiff`s by default, falls back to snapshot path under `options.fromSnapshot`, sparse `SessionTickEntry` in range, or entity-ID recycling.
- **`diffSnapshots(a, b, opts?)`**: standalone snapshot-pair helper exported from `src/snapshot-diff.ts` and re-exported via `bundle-viewer.ts`. Returns a `TickDiff`-shaped object covering entity / component / resource / state / tags / metadata changes; intentionally excludes `WorldSnapshot.config`, `rng`, `componentOptions`, `entities.{generations,alive,freeList}` directly, and `version` (those are registration / determinism invariants).
- **`BundleViewerError`** (codes: `marker_missing`, `tick_out_of_range`, `world_factory_required`, `query_invalid`) with JSON-shaped `details`.
- **`BundleCorpusEntry.openViewer<TEventMap, TCommandMap, TDebug>(options?)`**: one-line corpus-to-viewer composition. Attached before `Object.freeze` in `makeEntry()`; entries remain frozen.
- New query types: `MarkerQuery`, `EventQuery`, `CommandQuery`, `ExecutionQuery`, `TickRange`, `DiffOptions`.

### Behavior callouts

- **Content-bounded `recordedRange`**: for incomplete/terminated bundles where `metadata.endTick` overstates actual recorded content (recorder sets `endTick = world.tick` at disconnect even when `_terminated` short-circuits later writes), the viewer clamps `recordedRange.end = min(metadata.endTick, max stream tick)`. `replayableRange` matches `SessionReplayer.openAt`'s upper bound.
- **Failure-in-range** for `frame.diffSince`: if any recorded `ft` satisfies `fromTick < ft <= toTick`, the viewer constructs `BundleIntegrityError({ code: 'replay_across_failure', failedTicks, fromTick, toTick })` at the call site. The class and `details.code` match what `openAt` throws so `instanceof` checks work uniformly; the details payload is enriched for the range.
- **`SessionReplayer` is unchanged.** v1 considered (and dropped) a `bundle` getter and a BYO replayer option per ADR 35; the viewer constructs the replayer lazily and memoizes it.
- **Eager query validation**: invalid `from`/`to`/`otherTick` (NaN, non-finite, non-integer) throws synchronously at the call site; iteration body is lazy.

### ADRs

- ADR 32: Viewer is a thin wrapper over `SessionReplayer` + bundle indices.
- ADR 33: `TickFrame` is a value, not a reactive object; selective runtime freezing.
- ADR 34: `diffSince` has two paths and the source is observable; failure-in-range constructs an enriched `BundleIntegrityError`.
- ADR 35: No BYO `SessionReplayer` in v1.

### Validation

All four engine gates pass: `npm test` (936 passed + 2 todo, +69 new across `tests/snapshot-diff.test.ts`, `tests/bundle-viewer.test.ts`, `tests/bundle-corpus-viewer.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`.

## 0.8.6 - 2026-04-28

Process documentation: bump code-reviewer CLI commands to the most-capable, largest-context models reachable under the project's standard auth (Claude account + Codex ChatGPT login).

### Changed

- AGENTS.md Code-review section: Codex command moved from `--model gpt-5.4` to `--model gpt-5.5`; added a note documenting the required Codex CLI ≥ 0.125.0 and that Codex caps reasoning effort at `xhigh` (no `max` value).
- AGENTS.md Code-review section: Claude commands (both diff-piped and full-codebase variants) moved from `--model opus --effort xhigh` to `--model "claude-opus-4-7[1m]" --effort max`; added a note that the `[1m]` suffix selects the 1 M-token-context Opus 4.7 variant and that the model string must be quoted to suppress shell glob-expansion.
- AGENTS.md Team-of-subagents section: Tie-breaker bumped to the same `claude --model "claude-opus-4-7[1m]" --effort max` invocation.
- AGENTS.md Code-review section: added a "Keep model IDs current" bullet that mandates a one-line smoke test before committing future model bumps.

### Validation

- `npm test` (gates re-run after the doc bump)
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke tests: `claude -p --model "claude-opus-4-7[1m]" --effort max` and `codex exec --model gpt-5.5 -c model_reasoning_effort=xhigh ...` both returned `ok` after upgrading the local Codex CLI from 0.121.0 to 0.125.0.

## 0.8.5 - 2026-04-28

Process and documentation archive cleanup for thread design artifacts.

### Changed

- Moved accepted thread-specific design docs and implementation plans from dated `docs/design/` filenames into their owning thread roots as `DESIGN.md` and `PLAN.md`.
- Kept review iterations unchanged: date folders still contain iteration folders, and committed iterations still contain only `REVIEW.md`.
- Updated AGENTS.md and the docs index so future threads store authoritative design/plan docs at `docs/threads/<current|done>/<objective>/`.
- Tightened the docs-thread regression test so committed docs reject raw review captures, prompt/diff snapshots, and stdout/stderr/error-log artifacts.

### Validation

- `npm test -- tests/docs-threads.test.ts`
- `npm test` (867 passed + 2 todo)
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 0.8.4 - 2026-04-28

Process and documentation archive cleanup for review/thread artifacts.

### Changed

- Renamed the committed review archive from `docs/reviews/` to `docs/threads/`.
- Added the canonical thread split: `docs/threads/current/` for active objectives and `docs/threads/done/` for closed objectives.
- Normalized thread objective folders to concise kebab-case names, preserving the date/iteration structure inside each objective.
- Retired committed raw reviewer output, stderr/stdout logs, prompt files, and diff snapshots from thread iteration folders. Each committed iteration now keeps only the synthesized `REVIEW.md`.
- Updated AGENTS.md review guidance so reviewers return concise but effective findings with enough evidence and impact to act, without preserving command chatter or repetitive transcript detail.

### Validation

- `npm test -- tests/docs-threads.test.ts`
- `npm test` (866 passed + 2 todo)
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 0.8.3 - 2026-04-27

Spec 7 - Bundle Search / Corpus Index. Tier-2 of the AI-first dev roadmap; turns closed FileSink bundle directories into a deterministic metadata query surface and lazy bundle iterable.

### New (additive)

- **`BundleCorpus(rootDir, options?)`**: scans closed FileSink bundle directories, validates manifest metadata, accepts an explicit symlink/junction root, skips symlinked descendants and symlinked manifests during traversal, and exposes deterministic sorted entries.
- **`BundleCorpus.entries(query?)`**: metadata-only listing/filtering over manifest-derived fields. Does not read JSONL streams, snapshots, or sidecar bytes.
- **`BundleCorpus.bundles(query?)`** and **`[Symbol.iterator]()`**: lazy full-bundle iteration through `FileSink.toBundle()`, directly composable with `runMetrics`.
- **`BundleCorpusEntry`** and **`BundleCorpusMetadata`**: frozen metadata view with `key`, `dir`, readonly nested `metadata.failedTicks`, attachment summary fields, failure summary fields, `materializedEndTick`, `openSource()`, and `loadBundle()`.
- **`BundleQuery`** plus helper types `OneOrMany`, `NumberRange`, and `IsoTimeRange`: filters by key, manifest metadata, duration/tick ranges, failure count, policy seed, recordedAt range, incomplete status, and attachment MIME.
- **`CorpusIndexError`** and `CorpusIndexErrorCode`: JSON-safe machine-readable failures for missing roots, manifest parse/validation errors, unsupported schema, duplicate keys, invalid queries, and missing entries.

### Behavior callouts

- Corpus listing is manifest-first and for closed/frozen FileSink directories. Active-writer detection and persisted `corpus-index.json` files are not part of v1.
- Query order is deterministic: `recordedAt`, then `sessionId`, then slash-normalized key, using JavaScript code-unit ordering.
- Query validation rejects malformed JavaScript caller shapes with `CorpusIndexError` code `query_invalid` instead of silently widening filters.
- `materializedEndTick` is a persisted-content horizon, not a replay guarantee. Replay integrity still belongs to `SessionReplayer`.
- Sidecar bytes are not read during listing or `loadBundle()`; callers fetch them explicitly through `SessionSource.readSidecar(id)`.
- Explicit `dataUrl` attachment bytes live in `manifest.json`, so they are part of manifest parse cost.

### ADRs

- ADR 28: Manifest-first over closed FileSink directories.
- ADR 29: Corpus composes with `runMetrics` via `Iterable<SessionBundle>`.
- ADR 30: Canonical corpus order is `recordedAt`, `sessionId`, `key`.
- ADR 31: v1 query scope is manifest-derived only.

### Validation

All four engine gates pass: `npm test` (865 passed + 2 todo, +20 new in `tests/bundle-corpus.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`.

## 0.8.2 - 2026-04-27

Spec 8 — Behavioral Metrics over Corpus. Tier-2 of the AI-first dev roadmap; pairs with Spec 3 (synthetic playtest) to define regressions for emergent behavior.

### New (additive)

- **`runMetrics(bundles, metrics)`**: pure-function corpus reducer over `Iterable<SessionBundle>`. Single-pass, multiplexed across all metrics. Throws `RangeError` on duplicate metric names. Iterates the iterable once.
- **`compareMetricsResults(baseline, current)`**: thin delta helper. Returns deltas + percent changes + only-in-side variants; no regression judgment. Recurses through nested records (e.g., `commandTypeCounts`). Numeric leaves get `{ baseline, current, delta, pctChange }`; opaque (arrays, type mismatches) get `{ baseline, current, equal }`; `null` inputs propagate to `null` deltas.
- **`Metric<TState, TResult>`**: accumulator-style contract — `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`, optional `orderSensitive`. In-place mutation OK; functional purity (output depends only on inputs) is the contract.
- **`Stats` shape**: `{ count; min; max; mean; p50; p95; p99 }` with `number | null` numeric fields. Empty corpus → `null` (JSON-stable; `NaN` would not be). NumPy linear (R type 7) percentiles, exact, deterministic.
- **11 engine-generic built-in metric factories**:
  - `bundleCount` — total bundles in corpus.
  - `sessionLengthStats` — Stats over `metadata.durationTicks`.
  - `commandRateStats` — Stats over per-bundle `commands.length / durationTicks` (0 for zero-duration).
  - `eventRateStats` — Stats over per-bundle `sum(ticks[].events.length) / durationTicks`.
  - `commandTypeCounts` — `Record<string, number>` over `bundle.commands[].type` (counts SUBMISSIONS).
  - `eventTypeCounts` — `Record<string, number>` over `bundle.ticks[].events[].type`.
  - `failureBundleRate` — ratio of bundles with non-empty `metadata.failedTicks`.
  - `failedTickRate` — ratio of total failed ticks to total duration ticks (zero-tick corpus → 0).
  - `incompleteBundleRate` — ratio of bundles with `metadata.incomplete === true`.
  - `commandValidationAcceptanceRate` — ratio of `bundle.commands[].result.accepted === true` (submission-stage validator-gate signal).
  - `executionFailureRate` — ratio of `bundle.executions[].executed === false` (execution-stage handler-failure signal).

### Submission-stage vs execution-stage semantics

`commandValidationAcceptanceRate` and `executionFailureRate` read different bundle sources by design. Validator-rejected commands appear in `bundle.commands[].result.accepted=false` but NEVER in `bundle.executions` (validators short-circuit before queueing per `world.ts:732-748`). Pair the two metrics to detect both regression types.

### ADRs

- ADR 23: Accumulator-style metric contract over reducer or per-bundle-map+combine.
- ADR 24: Engine-generic built-ins only; game-semantic metrics are user-defined.
- ADR 25: `compareMetricsResults` returns deltas, not regression judgments.
- ADR 26: `Iterable<SessionBundle>` only in v1; `AsyncIterable` deferred to a separate `runMetricsAsync`.
- ADR 27: Do NOT aggregate `stopReason` in v1.

### Validation

All four engine gates pass: `npm test` (842 passed + 2 todo, +44 new in `tests/behavioral-metrics.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`. Multi-CLI code review converged.

### What's next on the AI-first roadmap

Tier-1 (Specs 1, 3) and Tier-2 (Spec 8) implemented. Remaining: Spec 2 (Annotation UI), Spec 4 (Bundle Viewer), Spec 5 (Counterfactual Replay), Spec 6 (Strict-Mode Determinism), Spec 7 (Bundle Search / Corpus Index), Spec 9 (AI Playtester Agent).

## 0.8.1 - 2026-04-27

Synthetic Playtest T3: cross-cutting determinism integration tests + structural docs (closes Spec 3 implementation).

### Tests added (`tests/synthetic-determinism.test.ts`, 7 cases)

- **selfCheck round-trip:** non-poisoned bundle with `ticksRun >= 1` passes `replayer.selfCheck().ok`.
- **Production-determinism dual-run:** same `policySeed` + same setup → deep-equal bundles modulo sessionId/recordedAt/durationMs.
- **Sub-RNG isolation positive:** policy using `ctx.random()` is replay-deterministic.
- **Sub-RNG isolation negative:** policy calling `ctx.world.random()` directly causes selfCheck to report state divergences (terminal-snapshot segment with default snapshotInterval) — proves the safety net works.
- **Poisoned-bundle replay:** `SessionReplayer.selfCheck()` re-throws the original tick failure (the failed-tick-bounded final segment is replayed, not skipped — verified at session-replayer.ts:286).
- **Pre-step abort vacuous case:** policy throws on tick 1 → `ticksRun === 0`, terminal == initial → selfCheck returns `ok:true` vacuously over zero-length segment.
- **Bundle → script conversion regression:** record → `+1` formula on submissionTick → replay through `scriptedPolicy` → assert identical command stream (types + data + submissionTicks).

### Structural docs

- `docs/architecture/ARCHITECTURE.md`: Component Map row for Synthetic Playtest Harness.
- `docs/architecture/drift-log.md`: 2026-04-27 entry describing the Spec 3 implementation chain (T1 v0.7.20 + T2 v0.8.0 + T3 v0.8.1).
- `docs/design/ai-first-dev-roadmap.md`: Spec 3 status → Implemented; Spec 1 status corrected to Implemented (v0.7.7-pre → v0.7.19) with link to converged spec.
- `docs/guides/ai-integration.md`: appended Tier-1 reference linking to the synthetic-playtest guide.

### Validation

All four engine gates pass: `npm test` (798 + 2 todo, 7 new in `tests/synthetic-determinism.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`. Multi-CLI code review converged.

## 0.8.0 - 2026-04-27 — BREAKING (b-bump)

Synthetic Playtest T2: `runSynthPlaytest` harness + b-bump-axis `SessionMetadata.sourceKind` union widening.

### Breaking change

`SessionMetadata.sourceKind` widened from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Downstream consumers using `assertNever`-style exhaustive switches over `sourceKind` will fail to compile until they add a `case 'synthetic':` branch. This is the only breaking change in 0.8.0; engine-internal code is unaffected (verified — no engine consumers branch on `sourceKind` exhaustively).

### New (additive)

- **`runSynthPlaytest(config)`**: synchronous Tier-1 synthetic playtest harness. Drives a `World` via pluggable `Policy` functions for N ticks → SessionBundle. Stop conditions: `maxTicks`, `stopWhen`, built-in poison stop, policy throw, sink failure. Sub-RNG init via `Math.floor(world.random() * 0x1_0000_0000)` BEFORE `recorder.connect()` so initial snapshot reflects post-derivation `world.rng` state. `terminalSnapshot:true` hardcoded for non-vacuous selfCheck guarantee.
- **`SynthPlaytestConfig`** + **`SynthPlaytestResult`** types.
- **`SessionRecorderConfig.sourceKind?`** + **`SessionRecorderConfig.policySeed?`** (additive optional fields).
- **`SessionMetadata.policySeed?`** field (populated when `sourceKind === 'synthetic'`).

### Determinism guarantees

- **Production-determinism:** same `policySeed` + same setup → structurally identical bundles modulo `metadata.sessionId`, `metadata.recordedAt`, and `WorldMetrics.durationMs`.
- **Replay-determinism:** non-poisoned synthetic bundles with `ticksRun >= 1` pass `SessionReplayer.selfCheck()`.
- **Sub-RNG isolation:** `PolicyContext.random()` is independent of `world.rng`; replay reproduces world RNG state because policies don't perturb it.

### Failure mode taxonomy

| `stopReason` | Bundle returned? | `ok` |
|---|---|---|
| `'maxTicks'`, `'stopWhen'`, `'poisoned'`, `'policyError'` | yes | `true` |
| `'sinkError'` (mid-tick) | yes (incomplete) | `false` |
| Connect-time sink failure | NO — `recorder.lastError` re-thrown | n/a |

### ADRs

- ADR 20: SessionMetadata.sourceKind extended, lands as b-bump.
- ADR 20a: `sourceKind` set at SessionRecorder construction (no post-hoc sink mutation).
- ADR 21: Harness is synchronous and single-process.
- ADR 22: Composed policies do NOT observe each other within a tick.

### Migration

Downstream `assertNever(sourceKind)` consumers add `case 'synthetic':` next to existing branches. No engine changes required.

### Validation

All four engine gates pass: `npm test` (789 + 2 todo, 17 new in `tests/synthetic-playtest.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`. Multi-CLI code review converged.

## 0.7.20 - 2026-04-27

Synthetic Playtest T1: Policy interface + 3 built-in policies (Tier 1 of Spec 3 implementation, `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v10).

### New (additive)

- **Policy types**: `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `RandomPolicyConfig`, `ScriptedPolicyEntry`. 4-generic shape matches `World<TEventMap, TCommandMap, TComponents, TState>`. `TComponents` and `TState` carry `World`-matching defaults; `TEventMap` and `TCommandMap` deliberately have no defaults (empty-record default would collapse `PolicyCommand` to `never`).
- **`noopPolicy()`**: empty-emit baseline.
- **`scriptedPolicy(sequence)`**: pre-grouped by tick at construction, O(1) per-tick lookup. `entry.tick` matches `PolicyContext.tick` (about-to-execute tick); bundle→script conversion requires `entry.tick = cmd.submissionTick + 1`.
- **`randomPolicy(config)`**: deterministic catalog selection via `ctx.random()` (sub-RNG, NOT `world.random()`). Validates non-empty catalog, positive-integer `frequency` and `burst`, non-negative-integer `offset` < `frequency`.

### Determinism contract

Policies use `PolicyContext.random()`, a seeded sub-RNG independent of `world.rng` (ADR 19 in `docs/architecture/decisions.md`). Calling `world.random()` between ticks would advance world RNG state; replay (which doesn't re-invoke policies) would diverge at the next snapshot. Sub-RNG sandboxing eliminates this.

### What's NOT here yet

- The end-to-end harness `runSynthPlaytest` ships in v0.8.0 (T2). Policies are usable in tests with a manually-constructed `PolicyContext` (see `tests/synthetic-policies.test.ts`), but the autonomous-driver harness is the next task.
- Determinism integration tests (selfCheck round-trip on synthetic bundles, production-determinism dual-run, sub-RNG negative-path, poisoned-bundle replay, bundle→script regression) ship in T3 (v0.8.1).

### ADRs

- ADR 17: Policy is a function, not a class hierarchy.
- ADR 18: Policies receive read-only world; mutation via returned commands.
- ADR 19: Policy randomness uses a separate seeded sub-RNG with literal seed expression.

### Validation

All four engine gates pass: `npm test` (772 passed + 2 todo, 13 new in `tests/synthetic-policies.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`. Multi-CLI code review converged.

## 0.7.19 - 2026-04-27

Session-recording followup 4: additional determinism-contract paired tests for clauses 1, 2, 7.

### Tests

- `tests/determinism-contract.test.ts` adds clean+violation pairs for spec §11.1 clauses:
  - **Clause 1** (route input through `world.submit()` from outside the tick loop): violation = external `setComponent` between ticks during recording → terminal snapshot captures the mutation but `bundle.commands` doesn't reflect it; replay state diverges.
  - **Clause 2** (no mid-tick `submit()` from systems): violation = a system submits a follow-up command during `step()` → recording's wrap captures the submission, replayer feeds it from `bundle.commands` AND the system re-submits during replay → double-submit; execution-stream divergence.
  - **Clause 7** (no environment-driven branching inside a tick): violation = system reads `process.env.SESSION_RECORDING_TEST_FLAG`; test stubs different env values for record vs replay → state diverges.
- **Clauses 4 (impure validators) and 6 (unordered Set iteration)** added as `it.todo` with rationale: clean fixtures for these are hard to construct without crossing into other clauses (e.g., clause 6 requires a Set whose iteration order differs across runs without using random / wall-clock). Coverage: 6 of 8 testable clauses (clause 9 is enforced at construction by `BundleVersionError` — covered separately in `session-replayer.test.ts`).

### Validation

759 tests pass (was 753) + 2 it.todo. Typecheck, lint, build clean.

## 0.7.18 - 2026-04-27

Session-recording followups 2 + 3: terminated-state guards, applySnapshot helper extraction, doc-section renames.

### Bug fix (Opus L2)

- `SessionRecorder.addMarker` / `attach` / `takeSnapshot` now reject calls on a terminated recorder via a new `_assertOperational(method)` guard. Previously the methods checked only `!_connected || _closed`, so a partial-`connect()` sink failure (which sets `_terminated = true` but keeps `_connected = true` so `disconnect()` can finalize cleanly) caused subsequent user calls to re-enter the failed sink path and re-throw `SinkWriteError` per call. Now they fail fast with `RecorderClosedError(code: 'recorder_terminated', lastErrorMessage)`. Regression test added.

### Refactor (Opus L4)

- `World.applySnapshot` extracts the field-by-field state transfer into a private `_replaceStateFrom(other: World)` helper. The body is now grouped by concern (entities / components / spatial / resources / RNG / state / tags+metadata / cached per-tick / failure / command queue / system order) with an explicit "NOT transferred (preserved)" comment block at the end. Adding a future state-bearing field surfaces clearly here and the preserved set is auditable in one place. No behavioral change.

### Documentation (Opus L3)

- `docs/api-reference.md` section headers renamed from `(T1: …)` / `(T2: …)` / etc. (implementation-plan task IDs that mean nothing to external readers) to descriptive feature labels: `Bundle Types & Errors`, `Sinks (SessionSink, SessionSource, MemorySink)`, `FileSink`, `SessionRecorder`, `SessionReplayer`, `scenarioResultToBundle`. TOC updated.

### Validation

753 tests pass (was 752; +1 regression test for L2). Typecheck, lint, build clean.

## 0.7.17 - 2026-04-27

Session-recording followup 1: pre-grouped per-tick lookup indices in `SessionReplayer`.

### Performance

- `SessionReplayer` constructor builds `Map<tick, RecordedCommand[]>`, `Map<tick, events>`, `Map<tick, CommandExecutionResult[]>` once at construction. Replaces O(N) filter/find per replayed tick with O(1) lookup. Closes iter-2 code review M1; lifts the §13.2 throughput target gate on long captures (~10k-tick × 50-command smoke). No behavioral change — same data, same ordering (commands sorted by sequence within a tick to preserve replay semantics).

### Validation

752 tests pass (unchanged). Typecheck, lint, build clean.

## 0.7.16 - 2026-04-27

Session-recording iter-1 code review fix-pass. Closes 2 Critical, 4 High, 1 Medium, 4 Low / Note findings from the multi-CLI code review (Codex + Opus; Gemini quota-out).

### Critical fixes

- **`World.applySnapshot` no longer drops registered-but-empty components.** Previously the wholesale `componentStores` swap deleted user pre-registrations of components that weren't in the snapshot. Now merges: snapshot components replace `this`'s, and user's pre-registered components not in the snapshot are preserved. Component bits are unioned. *(Codex C2 part 1)*
- **`world.grid` delegate now reads through to the current `spatialGrid`.** Previously the constructor closed over a local `grid` reference that became stale after `applySnapshot` swapped the underlying `SpatialGrid`. Replaced the closure with a `getGrid()` accessor that reads `this.spatialGrid` on every call. *(Codex C2 part 2)*
- **`FileSink` is now reusable as a `SessionSource` cross-process.** Constructor pre-loads `manifest.json` (if present) so a fresh `new FileSink(existingDir)` can read snapshots / sidecars / metadata without going through `open()`. `open()` resets in-memory state to match the new recording. *(Codex C1)*

### High fixes

- **`SessionRecorder.attach()` defaults to `{ sidecar: true }`** so each sink can apply its own default policy. Previously defaulted to `{ dataUrl: '' }` which forced FileSink to always embed in the manifest, defeating its documented default-sidecar behavior. Pass `{ sidecar: false }` to opt into manifest embedding. *(Codex H1)*
- **`SessionRecorder.addMarker()` validates `refs.cells` against world bounds and `attachments` ids against registered attachments.** Previously only entity refs and tickRange were validated. *(Codex H2)*
- **`SessionRecorder` now `cloneJsonValue`s captured commands and markers** to detach from caller-owned references. Previously memory-aliased — user code mutating after the call corrupted the recorded bundle. *(Codex H3)*
- **`SessionReplayer.selfCheck()` execution comparison ignores `submissionSequence`.** Multi-segment selfCheck previously false-positived `executionDivergences` because `WorldSnapshotV5` doesn't carry `nextCommandResultSequence`, so each segment's replay reset the counter to 0 while the recording's executions had monotonic-across-session sequences. v6 snapshot would lift this caveat; for v1 we strip sequence from comparison. *(Opus H1)*

### Medium fixes

- **`SessionReplayer` checks `bundle.schemaVersion`** at construction. Previously only engine/node versions were checked. Throws `BundleVersionError(code: 'schema_unsupported')`. *(Codex M1)*
- **`SessionReplayer.tickEntriesBetween()` uses `persistedEndTick` for incomplete bundles.** Previously used `endTick` universally, allowing callers to silently get truncated sets on incomplete bundles. *(Opus M2)*

### Low / cleanup

- **Extracted `bytesToBase64()` to `src/json.ts`.** Previously duplicated identically in `session-sink.ts` and `session-file-sink.ts`. *(Opus L1)*
- **Removed dead-code import-pinning block in `session-replayer.ts`.** *(Opus M4)*
- **`docs/api-reference.md`:** added missing `T5: SessionRecorder`, `T6: SessionReplayer`, `T7: scenarioResultToBundle` sections (per AGENTS.md doc discipline). *(Opus H2)* Updated `ENGINE_VERSION` literal to read "matches package.json" instead of a stale `'0.7.7'`. *(Opus M3, Codex L1)*

### Validation

751 tests pass (unchanged from T8 — all fixes preserve behavior of existing tests; new tests pending iter-2 review). Typecheck, lint, build clean.

## 0.7.15 - 2026-04-27

Session-recording T9: structural docs + final integration. Doc-only commit.

### Documentation

- `docs/guides/session-recording.md` (NEW): canonical user-facing guide. Quickstart, sinks (MemorySink + FileSink with their default attachment policies), markers (kinds + provenance + EntityRef), replay (worldFactory + applySnapshot pattern), selfCheck (3-stream comparison + skippedSegments), full §11 determinism contract, scenario integration via `scenarioResultToBundle()`, v1 limitations.
- `docs/architecture/ARCHITECTURE.md`: Component Map rows for `SessionRecorder`, `SessionReplayer`, and the bundle/sink/source/marker/recorded-command type cluster. Boundaries paragraph for the session-recording subsystem covering ADRs, mutex semantics, applySnapshot worldFactory pattern, and v1 limitations.
- `docs/architecture/decisions.md`: ADRs 13–16 (separate `SessionRecorder` vs extending `WorldHistoryRecorder`; strict-JSON shared `SessionBundle` with sidecar bytes external; documented-not-enforced determinism contract with selfCheck verification; worldFactory as part of the determinism contract).
- `docs/architecture/drift-log.md`: 2026-04-27 entry for the session-recording subsystem.
- `docs/guides/concepts.md`: standalone-utilities list updated to include the session-recording surface.
- `docs/guides/ai-integration.md`: new "Session Recording for AI-Driven Debugging" section.
- `docs/guides/debugging.md`: pointer to `session-recording.md` for replay-based debugging.
- `docs/guides/getting-started.md`: brief "Recording Your First Session" example.
- `docs/guides/building-a-game.md`: "Recording Sessions for Debugging" section.
- `docs/guides/scenario-runner.md`: extended with the `scenarioResultToBundle()` pattern, `captureCommandPayloads` caveats, and the worldFactory replay pattern.
- `README.md`: Feature Overview row + Public Surface bullet for Session Recording.
- `docs/README.md`: Guides index entry.

### Validation

751 tests pass (unchanged from T8 — doc-only). Typecheck, lint, build clean.

Implementation phase complete. Branch `agent/session-recording` ready for merge authorization.

## 0.7.14 - 2026-04-27

Session-recording T8: integration + clause-paired determinism tests (CI gate).

### Tests added

- `tests/scenario-replay-integration.test.ts`: 3 integration tests demonstrating the substrate-↔-scenario round-trip:
  - move scenario produces a replayable bundle whose `selfCheck` returns `ok: true`.
  - multi-step scenario with multiple commands replays cleanly.
  - handler-crash scenario records `failedTicks`; selfCheck either skips affected segments or runs cleanly on remaining ones (per spec §9.3).
- `tests/determinism-contract.test.ts`: 6 paired (clean + violating) tests for §11.1 determinism contract clauses:
  - Clause 3 (route randomness through `world.random`): clean uses `world.random()`; violation uses `Math.random()` → `stateDivergences > 0`.
  - Clause 5 (no wall-clock time inside systems): clean uses `world.tick`; violation uses `Date.now()` → `stateDivergences > 0`.
  - Clause 8 (registration order matches between record and replay): clean uses identical setup function; violation swaps two-system order so last-writer-wins differs → `stateDivergences > 0`.

Per spec §13.5 CI gate: `npm test` exercises selfCheck on the new integration corpus; the engine's existing `tests/scenario-runner.test.ts` is unchanged (ScenarioRunner-execution tests, not replay tests). The reusable-setup pattern (`registerMoveBehavior(world)` extracted from scenario.setup, called by both setup and worldFactory) is documented inline.

### Validation

751 tests pass (was 742). Typecheck, lint, build clean.

## 0.7.13 - 2026-04-27

Session-recording T7: `scenarioResultToBundle()` adapter — translates `ScenarioResult` to `SessionBundle`.

### Added

- `src/session-scenario-bundle.ts`: `scenarioResultToBundle(result, options?)` exported function.
  - `metadata.sourceKind: 'scenario'`, `sourceLabel: result.name` (override via `options.sourceLabel`).
  - `metadata.startTick: result.history.initialSnapshot.tick` (NOT hardcoded 0; respects scenarios on pre-advanced worlds).
  - `metadata.endTick: result.tick`, `durationTicks` derived.
  - `bundle.commands: result.history.recordedCommands ?? []`. Empty when scenario didn't opt into `captureCommandPayloads: true` → diagnostic-only bundle (replay refuses with `BundleIntegrityError(code: 'no_replay_payloads')` per spec §10.3).
  - `bundle.snapshots: [{ tick: result.tick, snapshot: result.snapshot }]`. Single segment from `initialSnapshot` to terminal — selfCheck verifies the full scenario span.
  - `bundle.markers`: one `{ kind: 'assertion', provenance: 'engine', tick: result.tick, text: outcome.name, data: { passed, failure } }` per `result.checks` outcome.
- Throws `BundleIntegrityError(code: 'no_initial_snapshot')` when scenario was configured with `captureInitialSnapshot: false`.
- New public type `ScenarioResultToBundleOptions`.

### Validation

742 tests pass (was 733). Typecheck, lint, build clean. Per spec §10. Closes the substrate-→-scenario integration loop.

## 0.7.12 - 2026-04-27

Session-recording T6: `SessionReplayer` + 3-stream `selfCheck`.

### Added

- `src/session-replayer.ts`:
  - `SessionReplayer.fromBundle(bundle, config)` / `fromSource(source, config)` static factories.
  - `metadata` getter, `markers()`, `markersAt(tick)`, `markersOfKind(kind)`, `markersByEntity(ref)`, `markersByEntityId(id)` query helpers.
  - `snapshotTicks()`, `ticks()` introspection.
  - `openAt(tick)`: range checks against `[startTick, endTick]` (or `persistedEndTick` for incomplete bundles), `BundleIntegrityError(code: 'replay_across_failure')` for tick at-or-after first `failedTicks` entry, `BundleIntegrityError(code: 'no_replay_payloads')` for replay-forward on empty `commands`. Replays via `submitWithResult` per spec §9.1; throws `ReplayHandlerMissingError` if a recorded command's handler isn't registered in the factory's world.
  - `stateAtTick(tick)`: shortcut returning `world.serialize()` after `openAt`.
  - `tickEntriesBetween(from, to)`: inclusive range filter on bundle ticks.
  - `selfCheck(options)`: 3-stream comparison (state, events, executions) over snapshot pairs. Initial-to-first-snapshot segment included; segments containing recorded `TickFailure` skipped (`SkippedSegment[reason: 'failure_in_segment']`). Engine version compatibility per spec §11.1 clause 9: cross-`a` and cross-`b` throw `BundleVersionError`; within-`b` warns; cross-Node-major warns.
  - `validateMarkers()`: re-validate retroactive (`validated: false`) markers against historical snapshots.
  - `deepEqualWithPath(a, b)`: exported recursive deep-equal with best-effort `firstDifferingPath` for state-divergence triage. ~80 LOC, short-circuits, snapshot-key-order invariant.

### Validation

733 tests pass (was 711). Typecheck, lint, build clean. Per spec §9.

## 0.7.11 - 2026-04-27

Session-recording T5: `SessionRecorder` lifecycle.

### Added

- `src/session-recorder.ts`: `SessionRecorder<TEventMap, TCommandMap, TDebug>` class implementing the spec §7 lifecycle:
  - **Construction:** generates `sessionId` (UUID v4 via `node:crypto.randomUUID()`); does NOT install wraps or subscribe listeners yet (deferred to `connect()` per spec §7.1).
  - **`connect()`:** rejects if poisoned (`code: 'world_poisoned'`), already-attached payload-capturing recorder (`code: 'recorder_already_attached'`), or post-disconnect (`code: 'already_closed'`). Captures the `__payloadCapturingRecorder` mutex slot, opens sink, writes initial snapshot, installs single `submitWithResult` wrap, subscribes to `onDiff` / `onCommandExecution` / `onTickFailure`.
  - **Per-tick:** `onDiff` builds `SessionTickEntry` (cloned via `cloneJsonValue`), forwards to sink. Periodic snapshot fires when `world.tick > startTick && world.tick % snapshotInterval === 0`.
  - **Submission capture:** wrap captures `RecordedCommand` payloads; SOLE writer to commands stream (no `onCommandResult` listener — would double-write).
  - **`addMarker(input)`:** validates per §6.1 (live-tick: strict entity ref via `world.isCurrent`; retroactive: lenient, sets `validated: false`). All recorder-added markers get `provenance: 'game'`.
  - **`attach(blob, options)`:** generates UUID, forwards to `sink.writeAttachment` with the requested `ref` shape. `options.sidecar: true` opts into sidecar storage.
  - **`takeSnapshot()`:** writes a manual snapshot at the current world tick.
  - **`disconnect()`:** writes terminal snapshot (when `terminalSnapshot !== false`), uninstalls wrap, unsubscribes listeners, finalizes `metadata.endTick` / `durationTicks`, calls `sink.close()`. Clears the `__payloadCapturingRecorder` slot (defensively only if it's ours).
  - **`toBundle()`:** delegates to `sink.toBundle()`.
- `lastError` getter exposes any wrapped sink-write or serialize failure. Sink failures terminate the recorder (subsequent listener invocations short-circuit) and set `metadata.incomplete = true` — they do NOT propagate out of the engine listener invocation.
- New public types: `SessionRecorderConfig`, `NewMarker`.

### Validation

711 tests pass (was 691). Typecheck, lint, build clean. Per spec §7 + §6.1 + §11.

## 0.7.10 - 2026-04-27

Session-recording T4: `WorldHistoryRecorder.captureCommandPayloads` option + `ScenarioConfig.history` plumbing.

### Added (additive, non-breaking)

- `WorldHistoryRecorder` constructor option `captureCommandPayloads?: boolean` (default `false`). When `true`:
  - The recorder wraps `world.submitWithResult` (single wrap; `submit` delegates through it per spec §7.3) on `connect()` and uninstalls on `disconnect()`.
  - Captured payloads are stored as `RecordedCommand<TCommandMap>` entries in a NEW additive field `WorldHistoryState.recordedCommands?: RecordedCommand[]`. The existing `WorldHistoryState.commands: CommandSubmissionResult[]` field is unchanged.
  - Mutex enforced via `world.__payloadCapturingRecorder` slot — second `connect()` (any payload-capturing recorder, including `SessionRecorder` once T5 lands) throws `RecorderClosedError(code: 'recorder_already_attached')`.
  - Default-config recorders (no payload capture) remain unrestricted and freely compose with payload-capturing recorders.
- `WorldHistoryRecorder.clear()` now also resets `recordedCommandEntries` so post-setup scenario rebases produce clean replayable bundles.
- `ScenarioConfig.history.captureCommandPayloads?: boolean` threads through `runScenario` → `WorldHistoryRecorder` constructor.
- `WorldHistoryState.recordedCommands?` is the new optional field on the state shape.

### Validation

691 tests pass (was 682). Typecheck, lint, build clean. Per spec §10.2.

## 0.7.9 - 2026-04-27

Session-recording T3: `FileSink` reference implementation (disk-backed `SessionSink & SessionSource`).

### Added

- `src/session-file-sink.ts`:
  - `FileSink(bundleDir: string)` constructor.
  - On-disk layout: `manifest.json` + `ticks.jsonl` / `commands.jsonl` / `executions.jsonl` / `failures.jsonl` / `markers.jsonl` + `snapshots/<tick>.json` + `attachments/<id>.<ext>`.
  - Manifest cadence: rewritten on `open()`, on each `writeSnapshot()`, and on `close()`. Atomic via `manifest.tmp.json` → `manifest.json` rename. Per-tick rewrites are NOT performed.
  - **FileSink defaults to sidecar attachment storage** unconditionally — disk-backed sinks keep blobs as files. Pass `descriptor.ref: { dataUrl: '<placeholder>' }` to opt into manifest embedding for very small blobs only.
  - MIME → file-extension table covering `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml`, `application/json`, `application/octet-stream`, `text/plain`, `text/csv`. Fallback `.bin`. Manifest carries the full MIME so readers can recover the original from the descriptor regardless of extension.
  - `readSidecar(id)` reads bytes back from `attachments/<id>.<ext>`; `readSnapshot(tick)` from `snapshots/<tick>.json`. JSONL streams stream lazily via generators; tolerate a final partial line (crash recovery).
  - `toBundle()` reads all snapshot files from disk, sorts by tick, exposes the first as `initialSnapshot`, the rest as `bundle.snapshots[]`.

### Tooling

- Added `@types/node` as a devDependency. Required for FileSink's `node:fs` / `node:path` / `node:os` imports. The engine now has full Node-typed surfaces for any future Node-flavored code (`BufferedSink`, etc.).

### Validation

682 tests pass (was 667). Typecheck, lint, build clean. Per spec §5.2 + §8.

## 0.7.8 - 2026-04-27

Session-recording T2: `SessionSink` / `SessionSource` interfaces + `MemorySink` reference implementation.

### Added

- `src/session-sink.ts`:
  - `SessionSink` (write interface): `open` / `writeTick` / `writeCommand` / `writeCommandExecution` / `writeTickFailure` / `writeSnapshot` / `writeMarker` / `writeAttachment` / `close`. Synchronous throughout (per spec §8 — composes with `World`'s synchronous listener invariants; async sinks deferred).
  - `SessionSource` (read interface): `metadata` / `readSnapshot` / `readSidecar` / `ticks()` / `commands()` / `executions()` / `failures()` / `markers()` / `attachments()` / `toBundle()`. All sync.
  - `MemorySink` implementing both. Holds writes in arrays; sidecar attachments in a parallel `Map<string, Uint8Array>`. `MemorySinkOptions`: `allowSidecar` (default `false` — oversize attachments throw `SinkWriteError(code: 'oversize_attachment')` rather than silently using external state); `sidecarThresholdBytes` (default 64 KiB).
  - `writeAttachment` returns the FINALIZED `AttachmentDescriptor` with `ref` resolved (sinks may rewrite a `dataUrl` placeholder to a populated data URL, or downgrade to sidecar). Recorders use the returned descriptor as the source of truth.
  - Internal `bytesToBase64()` helper using the platform `btoa` global (Node 16+, browsers). Avoids the `@types/node` dependency `Buffer` would require.

### Validation

667 tests pass (was 652). Typecheck, lint, build clean. Per spec §8.

## 0.7.7 - 2026-04-27

Session-recording T1 (bundle types + error hierarchy). Types only; no runtime behavior. Foundation for `SessionRecorder` / `SessionReplayer` (next commits).

### Added (additive, non-breaking)

- `src/session-bundle.ts`:
  - `SESSION_BUNDLE_SCHEMA_VERSION = 1` constant.
  - `SessionBundle<TEventMap, TCommandMap, TDebug>` strict-JSON archive type.
  - `SessionMetadata` (`sessionId`, `engineVersion`, `nodeVersion`, `recordedAt`, `startTick`, `endTick`, `persistedEndTick`, `durationTicks`, `sourceKind`, optional `sourceLabel`, `incomplete`, `failedTicks`).
  - `SessionTickEntry`, `SessionSnapshotEntry`, `AttachmentDescriptor` (with `{ dataUrl } | { sidecar: true }` ref union), `RecordedCommand`, `EntityRef`.
  - `Marker` with `kind: 'annotation' | 'assertion' | 'checkpoint'`, `provenance: 'engine' | 'game'`, optional `refs` (entity refs use `EntityRef` for id+generation matching), `data`, `attachments`, `validated: false` for retroactive markers.
- `src/session-errors.ts`:
  - `SessionRecordingError` base class.
  - 7 subclasses: `MarkerValidationError` (with optional top-level `referencesValidationRule` field per spec §11.3), `RecorderClosedError`, `SinkWriteError`, `BundleVersionError`, `BundleRangeError`, `BundleIntegrityError`, `ReplayHandlerMissingError`.
- `src/index.ts` exports all of the above plus `ENGINE_VERSION` from `src/version.ts`. Side-effect import of `src/session-internals.ts` to apply the `World.__payloadCapturingRecorder` declaration-merge.

### Validation

652 tests pass (up from 636). Typecheck, lint, build clean. Per spec sections §5, §6, §12.

## 0.7.7-pre - 2026-04-27

Session-recording T0 setup (no version bump). Pure refactor + additive World API surfaces in preparation for the session-recording subsystem (T1–T9, see `docs/design/2026-04-27-session-recording-implementation-plan.md`).

### Refactored

- Extracted `cloneJsonValue<T>(value, label): T` from private duplicates in `src/history-recorder.ts:430` and `src/scenario-runner.ts:474` into a single export from `src/json.ts`. Both call sites updated. Behavior identical (validates JSON-compat then deep-clones via JSON round-trip). Eliminates the pre-existing AGENTS.md anti-duplication-rule violation.

### Added (additive, non-breaking)

- `src/version.ts` exporting `ENGINE_VERSION = '0.7.6' as const`. Read by upcoming `SessionRecorder` / `scenarioResultToBundle()` for `metadata.engineVersion` in session bundles. Avoids `process.env.npm_package_version` (only set under `npm run`).
- `src/session-internals.ts` declaration-merging an internal `World.__payloadCapturingRecorder?: { sessionId, lastError }` slot. Used by upcoming mutex (one payload-capturing recorder per world). Internal; user code MUST NOT touch it directly.
- `World.applySnapshot(snapshot)` instance method. Loads a `WorldSnapshot` into an existing world in-place: replaces entity / component / resource / state / tag / metadata / RNG state from the snapshot; **preserves user-registered handlers, validators, systems, event/diff listeners, and the `__payloadCapturingRecorder` slot**. Required for the upcoming `SessionReplayer` `worldFactory` pattern (register first → `applySnapshot(snap)` to load state without `registerComponent` / `registerHandler` duplicate-throw). Listed in `FORBIDDEN_PRECONDITION_METHODS` so a `CommandTransaction` predicate can't bulk-mutate via it. 6 new tests in `tests/world-applysnapshot.test.ts`.

### Validation

636 tests pass (up from 630). Typecheck, lint, build clean. No version bump (T0 is preparatory; T1 is the first c-bump to v0.7.7).

## 0.7.6 - 2026-04-26

Multi-CLI iter-8 convergence check (Codex + Opus; Gemini quota-out 6th iter). Both verified all 7 iter-7 fixes landed cleanly with no regressions; no new Critical/High/Medium/Low. Opus flagged one Note (N3) on a parallel-class gap to L2 — taken in this iter to keep the L2 contract structurally uniform. Non-breaking. 630 tests pass (up from 627).

### Fixed

- **N3 (Opus, iter-8):** `ComponentStore.set` strict-path branch (taken when `wasPresent === false`, e.g. after `remove()` or on first insert with an existing baseline) did not check whether the new value matched the cached baseline. The L2 fix (iter-7) only covered the `wasPresent === true` branch — sequence `set(A) → clearDirty → remove() → set(A)` left the entity in `dirtySet`, so `getDirty()` emitted a redundant `[id, A]` entry. Same severity class as L2 (bandwidth waste, no incorrect end state); pre-existing, not an iter-7 regression. Closed in this iter to make the semantic-mode "skip dirty-marking when value matches baseline" contract uniform across both branches. Strict mode untouched (gated on `diffMode === 'semantic'`). 3 new regression tests.

### README

- Added a version badge and a pre-release alpha warning (already shipped in v0.7.5; restated here for completeness — the badge auto-tracks the package version).

## 0.7.5 - 2026-04-26

Multi-CLI iter-7 broader sweep (first sweep beyond the iter-1–6 `CommandTransaction` chain). Codex + Opus reviewed subsystems iters 1–6 didn't focus on; Gemini quota-exhausted (5th iter in a row). 7 real findings — 1 High, 3 Medium, 3 Low — all fixed. Non-breaking. 627 tests pass (up from 608).

### Fixed

- **H1 (Codex):** `World.deserialize` accepted component / resource records keyed by **dead** or **non-integer / negative** entity IDs. Snapshot loaders ran without entity-id validation, then `rebuildSpatialIndex` and `rebuildComponentSignatures` re-populated stores with rows whose `entityManager.isAlive(id)` was `false`, leaving them queryable through `world.grid` / `queryInRadius` / `query()`. Negative or fractional IDs were worse: `ComponentStore.set` wrote them as JS array properties (silent: `arr.length` doesn't grow), but `_size` did increment, so iteration / serialization / `size` disagreed forever. Fixed in `world.ts` by validating every key in `snapshot.components[*]`, `snapshot.resources.pools/production/consumption[*]`, and `snapshot.resources.transfers[*].from/to` against the alive-set + non-negative-integer check before any loader runs. Throws on violation, mirroring the v0.6.2 `snapshot.tick` validation precedent. 6 new regression tests.
- **M1 (Codex):** `EventBus.emit` pushed the caller's `data` reference into the buffer and passed the same reference to every listener. A listener that mutated `data` (or made it circular) corrupted buffered history visible to later listeners and to `world.getEvents()`; `getEvents()` could throw on later calls. Fixed by deep-cloning `data` once for the buffer and once per listener. Mirrors the iter-6 atomicity discipline (engine-owned state structurally isolated from external callbacks). `getEvents()` still clones on read for caller-side defensive isolation. 3 new regression tests.
- **M2 (Codex):** `ClientAdapter.handleMessage` unconditionally set `clientCommandIds.set(result.sequence, id)` after `safeSend` of `commandAccepted`, ignoring the return value. On transport failure `safeSend` already disconnected and cleared the map; the post-send `set` would then either leak (no reconnect) or surface `commandExecuted` / `commandFailed` against an unknown sequence on the next session. Fixed by gating the `set` on `safeSend`'s `boolean` return. 1 new regression test.
- **M3 (Opus):** `docs/api-reference.md` sections "World State" and "Tags & Metadata" both said `(snapshot v4)`. Current `SCHEMA_VERSION` is 5. Replaced both labels with `(snapshot v5)`.
- **L1 (Codex):** `octaveNoise2D` did not validate `octaves`, `persistence`, or `lacunarity`. `octaves <= 0` left `maxAmplitude = 0` → returns NaN; non-finite `persistence` / `lacunarity` could silently corrupt downstream map-gen. Public docs claim `[-1, 1]` without parameter constraints. Fixed: now throws `RangeError` on `octaves < 1` or non-integer, `persistence < 0` or non-finite, `lacunarity <= 0` or non-finite. `api-reference.md` updated with the constraint table. 6 new regression tests.
- **L2 (Opus):** `ComponentStore` semantic-mode `set` did not clear `dirtySet` / `removedSet` when the new value matched the baseline — the early-return path skipped both. Sequence `set(A) → clearDirty → set(B) → set(A)` ended with the entity still in `dirtySet`, so `getDirty()` emitted a redundant entry. Diff bandwidth waste, no incorrect end state. Fixed: revert-to-baseline now clears both sets before returning. 1 new regression test.
- **L3 (Opus):** `World.deserialize` validated `snapshot.tick` *after* `rebuildSpatialIndex()` already ran — wasted O(positionEntities) work on bad input. Hoisted the tick validation block to the top of `deserialize`, just after the `version` check. 1 new regression test.

## 0.7.4 - 2026-04-26

Followups on residuals from the iter-1 → iter-6 review chain. Non-breaking. 608 tests pass.

### Fixed

- **L_NEW6 (residual from v0.6.0):** `CommandTransaction.commit()`'s `world.emit` dispatch line dropped its `// eslint-disable-next-line @typescript-eslint/no-explicit-any` and `as any` casts. Replaced with narrower `as keyof TEventMap & string` / `as TEventMap[EmitKey]` casts that preserve the type-system shape across the loose-typed buffered event boundary. Runtime behavior unchanged.
- **N1 (residual from v0.6.4):** `SYSTEM_PHASES` and `SystemPhase` moved from `src/world.ts` to `src/world-internal.ts`. Previously `world-internal.ts` imported `SYSTEM_PHASES` from `world.ts` while `world.ts` imported value functions from `world-internal.ts` — a circular value-import that worked only because `SYSTEM_PHASES` was read inside function bodies. Now one-way: `world.ts` imports from `world-internal.ts` (and re-exports for public API compatibility — `SYSTEM_PHASES` and `SystemPhase` remain importable from the package root via the existing `export * from './world.js'` barrel).

### Still deferred (queued for dedicated follow-up)

- **M3 deeper world.ts split:** `world.ts` is at 2227 LOC vs the 500 LOC cap. The deeper split (serialize, system scheduling, tick pipeline, tags/state into separate files) requires a composition redesign because those subsystems read/write many private fields. Mechanical extraction would either loosen `World`'s encapsulation broadly or require pervasive `as unknown as` casts. Out of scope for review-fix iterations; queued for a dedicated refactor branch.
- **`occupancy-grid.ts` split:** 1602 LOC; same reasoning.

## 0.7.3 - 2026-04-26

Multi-CLI iter-6 verification caught one new High (Codex) plus one cleanup note (Opus). Both fixed. Non-breaking. 608 tests pass (up from 607).

### Fixed

- **High (Codex iter-6):** `world.grid` is a public field returning a plain object delegate, not a method on the prototype. The iter-5 precondition proxy intercepted method calls but did not protect the `grid` sub-object — a predicate could do `(w.grid as any).getAt = () => null;` to monkey-patch the engine-wide grid delegate, then return `false`. The mutation persisted on `world.grid` after the "failed" precondition. Fixed by `Object.freeze`ing `world.grid` in the constructor — the read-only-delegate promise from v0.5.0 is now structurally enforced. Predicates (and any other code) attempting to write to `world.grid` properties throw `TypeError` in strict mode.
- **Cleanup (Opus iter-6 Note):** removed two ghost entries from `READ_METHODS_RETURNING_REFS` — `getResources` and `getPosition` were listed but neither method exists on `World`. The proxy `get` trap only fires on actual property access, so the ghost entries were runtime-harmless dead code. Cleaned up to keep the wrap set honest.

## 0.7.2 - 2026-04-26

Multi-CLI iter-5 verification caught one new Critical (Codex; Opus reported clean — split decision, Codex's was the right call). Closes the in-place-mutation hole that the C1/R1 denylist couldn't catch. Non-breaking. 607 tests pass (up from 604).

### Fixed

- **Critical (Codex iter-5):** even with the denylist exhaustive, a precondition could still mutate world state by editing a returned reference in place — `w.getComponent(e, 'hp')!.current = 0` then return `false`. The store's `get` returns the live `ComponentStore.data[entityId]` reference, so the predicate's mutation landed on engine state and `commit()` then reported `precondition_failed` over an already-mutated world. This bypassed dirty tracking too. The proxy now wraps a curated set of read methods (`getComponent`, `getComponents`, `getState`, `getResource`, `getResources`, `getPosition`, `getTags`, `getByTag`, `getEvents`) and `structuredClone`s their returns before the predicate sees them. Predicates pay one clone per read; preconditions are not the hot path. Closes the residual atomicity hole that the iter-1 C1 / iter-2 R1 / iter-3 R2_REG1 fixes did not address (those handled write methods; this handles in-place mutation of read returns). Three explicit regression tests pin the headline cases (component, state, resource).

## 0.7.1 - 2026-04-26

Multi-CLI iter-3 verification caught two iter-2 fix-quality regressions; both addressed in one commit. Codex + Opus reviewed; Gemini quota-exhausted post-iter-2. Non-breaking. 604 tests pass (up from 600).

### Fixed

- **R2_REG1 (Codex iter-2 regression of R1, Opus N1):** `World.warnIfPoisoned(api)` is public and stateful (mutates the `poisonedWarningEmitted` flag) but was not in `FORBIDDEN_PRECONDITION_METHODS`. A predicate could call `w.warnIfPoisoned('hijacked')` to consume the warn-once latch and suppress the next legitimate write surface's diagnostic. Added to the array. The iter-2 changelog claimed exhaustiveness; the claim is now true.
- **R2_REG2 (Codex iter-2 regression of L_NEW3):** L_NEW3 removed `Layer.getState()`'s post-hoc default-equality filter on the assumption that all writers strip defaults. That assumption ignored `forEachReadOnly`, which deliberately exposes live object references for object T. A contract-violating caller can mutate a stored object to equal `defaultValue`; without the filter, `getState` then serializes the now-default-equal cell. Restored the filter for object T only (primitive T is immutable so no backstop is needed).
- **L_REG1 (Opus Low):** `docs/api-reference.md:3454` still claimed `commit()` after `commit()` always throws "already committed". L_NEW1's fix made the message reflect `terminalReason`, so after `abort()` + `commit()` + `commit()` it throws "already aborted". Doc updated.
- **L_REG3 (Opus Low):** added explicit regression test for L_NEW2's single-clone fix.

### Added

- **Meta-test for `FORBIDDEN_PRECONDITION_METHODS` exhaustiveness** — cross-checks the array against `Object.getOwnPropertyNames(World.prototype)`, filtering known read-only + private methods. Future World method additions that aren't classified will fail the suite, preventing R1-style holes from recurring silently. Also asserts no entries in the array reference non-existent World methods (catches typos / dead entries).

## 0.7.0 - 2026-04-26

Multi-CLI iter-2 review fix-up. Closes 1 iter-1 regression (R1: C1 was incomplete) + 2 new High + 2 new Medium + 4 new Low. Breaking — `CommandTransaction` preconditions now reject 9+ additional `World` methods at runtime that previously silently worked (most damaging: `random()`, which would have advanced the deterministic RNG even on `precondition_failed`). 600 tests pass (up from 592).

### Breaking

- **`CommandTransaction` preconditions now reject `random()`, `setResourceMax`, `setProduction`, `setConsumption`, `start`, `stop`, `pause`, `resume`, `setSpeed`, `onDestroy`/`offDestroy`, `onTickFailure`/`offTickFailure`, `onCommandResult`/`offCommandResult`, `onCommandExecution`/`offCommandExecution`.** Previously the v0.6.0 denylist was missing all of these. Code that called any of them from inside `tx.require((w) => ...)` will now throw `CommandTransaction precondition cannot call '<method>': preconditions must be side-effect free`. The most consequential gap was `random()` — it mutates `DeterministicRandom.state`, so a side-effecting predicate on the failure path was silently breaking the engine's determinism contract and snapshot-replay correctness.

### Added

- **`FORBIDDEN_PRECONDITION_METHODS` const array exported** from `src/command-transaction.ts`. Single source of truth for both the type-level `Omit` (deriving `ReadOnlyTransactionWorld`) and the runtime `FORBIDDEN_IN_PRECONDITION` set. Eliminates list-drift between compile-time and runtime by construction.
- **api-reference.md** documents `World.warnIfPoisoned(api)` (was made public in v0.6.0 but undocumented).

### Fixed

- **R1 (3-reviewer consensus, iter-1 regression of C1):** the C1 `ReadOnlyTransactionWorld` denylist was incomplete. The new `FORBIDDEN_PRECONDITION_METHODS` array is exhaustive against `World`'s public mutating, lifecycle, listener, RNG, and sub-engine surface. 6 spurious entries (`registerComponentOptions`, `setTickFailureListener`, `setCommandResultListener`, `setCommandExecutionListener`, `setOnDestroy`, `rebuildSpatialIndex`) were dropped. New property-based regression test iterates the full list and asserts every method is blocked from inside a precondition; explicit tests pin `random()`, `setProduction`, and the lifecycle methods. Note: TypeScript `private` is type-only, so a determined caller can still cast to `any` and reach `gameLoop`/`rng` directly — the proxy doesn't block that escape and the doc explicitly notes this caveat.
- **H_NEW1 (Gemini + Opus High):** `Layer.forEachReadOnly` used `??` for unset-cell fallback, treating `null` as nullish. `Layer<number | null>` with explicit `null` cells read back as `defaultValue`. Now uses `=== undefined` matching the `forEach` pattern.
- **H_NEW2 (Codex High):** `Layer<T>` primitive fast-path was computed once from `defaultValue` and reused for every value, so `Layer<unknown>` with primitive default + later object write skipped the defensive clone. The fast-path now decides per-value via `isImmutablePrimitive(value)` rather than the cached `_defaultIsPrimitive`. The default-value primitivity check is still cached (it's used by `matchesDefault`), but value clone behavior is per-value.
- **M_NEW1 (Opus Medium):** `Layer.setCell`/`setAt`/`fill` previously called `assertJsonCompatible` AND `jsonFingerprint` (which calls `assertJsonCompatible` internally) on every non-primitive write — paying validation twice. The explicit call now fires only on the primitive-default path where `matchesDefault` short-circuits to `===` without validating. Object-T writes pay one validation per write.
- **M_NEW2 (Gemini Medium):** `Layer.fromState` previously stringified primitive values via `jsonFingerprint` to check default-equality; now uses direct `===` comparison for primitive-default layers, matching the writer fast path.
- **L_NEW1 (Gemini Low):** `CommandTransaction.commit()` after `abort()` then double-`commit()` previously threw a hardcoded "already committed" message instead of using the `terminalReason` field. Now reads `terminalReason` and emits "already aborted" when appropriate, matching builder methods.
- **L_NEW2 (Gemini Low):** `Layer.clone()` previously double-cloned `defaultValue` (once at the call site, once in the constructor). Pass-by-reference; the constructor handles the single clone.
- **L_NEW3 (Opus Low):** `Layer.getState()` had a defensive `jsonFingerprint` filter that was dead code post-H2 strip-at-write. Removed; `getState` now trusts the writers.
- **L_NEW5 (Opus Low):** stale test name `setCell with default value still stores the marker` referenced pre-H2 behavior; renamed to `setCell back to default value reads back as default (post-H2 strip-at-write)`.
- **L_NEW7 (Codex Low):** added explicit `Number.MAX_SAFE_INTEGER + 1` regression test for `World.deserialize` tick validation. Behavior was already covered transitively by the existing safe-integer check; the explicit test pins it.

### Acknowledged residual

- **L_NEW6:** one `eslint-disable @typescript-eslint/no-explicit-any` survives in `CommandTransaction.commit()`'s `world.emit` dispatch because buffered events are stored as the loose `BufferedEvent = { type: string; data: unknown }` shape. Tightening this requires either a more invasive typed-event-store redesign or accepting the dispatch cast as the residual cost of buffering. The runtime is correct (`EventBus.emit` validates payloads). The L6 fix in v0.6.0 eliminated the `as unknown as` cast at `world.transaction()`, which was the headline; this lone `any` is colocated with the dispatch and not load-bearing.
- **N1 (circular import smell):** `src/world-internal.ts` imports `SYSTEM_PHASES` from `world.js` while `world.ts` imports value functions from `world-internal.js`. Works today via ES module live bindings + use-inside-function-bodies. Cleanup queued for the deeper world.ts split.

## 0.6.4 - 2026-04-26

Multi-CLI full-review iter-1 batch 5 (partial M3): standalone helper extraction. Non-breaking. 592 tests pass.

### Refactored

- **M3 (Opus Medium, partial):** extracted ~265 LOC of standalone helper functions (`createMetrics`, `getImplicitMetricsProfile`, `normalizeCommandValidationResult`, `cloneMetrics`, `cloneTickFailure`, `cloneTickDiff`, `createErrorDetails`, `errorMessage`, `now`, `phaseIndex`, `isSystemPhase`, `describeIntervalValue`, `validateSystemInterval`, `validateSystemIntervalOffset`, `insertSorted`, `validateWorldConfig`, `asPosition`) from `src/world.ts` into `src/world-internal.ts`. `src/world.ts` is now 2232 LOC (down from 2481). The deeper architectural split (serialize, system scheduling, tick pipeline, tags/state) into separate files is **deferred** to a follow-up task — those subsystems use private World methods/fields whose extraction requires a deliberate composition redesign rather than a mechanical move. AGENTS.md's 500 LOC cap is still violated by `world.ts` (2232), `occupancy-grid.ts` (1602), and marginally by `world-debugger.ts` (509); these will be re-flagged by iter-2 reviewers and addressed in a dedicated refactor branch.
- `TickMetricsProfile` is now exported (was internal) so the helper module can reference it.

## 0.6.3 - 2026-04-26

Multi-CLI full-review iter-1 batch 4: polish + doc fixes. Non-breaking. 592 tests pass (up from 591).

### Fixed

- **L1 (Opus Low):** `World.runTick` previously captured the executing tick in two places — `tick = metrics?.tick ?? this.gameLoop.tick + 1` for the in-progress paths (success + commands/systems/resources/diff failure), then re-derived `tick = metrics?.tick ?? this.gameLoop.tick` (no `+ 1`) in the listener-failure path because `gameLoop.advance()` had already run. The asymmetry was correct today but a maintenance hazard. Tick capture is now hoisted to a single declaration above the try block; both paths use the same value. Behavior unchanged.
- **L4 (Codex Low):** `docs/guides/resources.md:194` referenced a nonexistent `setTransfer(...)` API. Replaced with the actual pattern: `world.removeTransfer(...)` followed by `world.addTransfer(...)` with the new rate.
- **L7 (Gemini Low):** `GameLoop.advance()` previously incremented `_tick` without bound. After `Number.MAX_SAFE_INTEGER` ticks, modulo math used by interval scheduling silently corrupts. Practical concern is zero (~4.7 million years at 60 TPS), but the cost of a guard is one comparison. Now throws `RangeError('GameLoop tick counter saturated at Number.MAX_SAFE_INTEGER ...')` rather than silently producing a corrupted value.

## 0.6.2 - 2026-04-26

`World.deserialize` snapshot-tick validation. Multi-CLI full-review iter-1 batch 3. Non-breaking. 591 tests pass (up from 587).

### Fixed

- **M2 (Codex Medium):** `World.deserialize` previously passed `snapshot.tick` directly to `gameLoop.setTick()` without validation. A malformed snapshot containing `NaN`, a negative tick, a fractional tick, or `Infinity` would silently install the bad value, then propagate through `getObservableTick`, `TickDiff.tick`, and the new interval scheduling check `(tick - 1) % system.interval !== system.intervalOffset` — `(NaN - 1) % 5 === NaN`, so all interval-gated systems silently stop running. `deserialize` now validates `Number.isSafeInteger(snapshot.tick) && snapshot.tick >= 0` and throws `WorldSnapshot.tick must be a non-negative safe integer (got <value>)` on rejection.

## 0.6.1 - 2026-04-26

`Layer<T>` correctness + performance overhaul. Multi-CLI full-review iter-1 batch 2. Non-breaking — all changes are additive (`clear`, `clearAt`, `forEachReadOnly`) or internal optimization (strip-at-write, primitive fast-path, single-validate `fromState`, direct `clone`). 587 tests pass (up from 576).

### Added

- **`Layer.clear(cx, cy)` / `Layer.clearAt(wx, wy)`** — explicit "drop this cell back to default" methods. Both delete the underlying sparse-map entry; idempotent on already-default cells; bounds-validated.
- **`Layer.forEachReadOnly(cb)`** — zero-allocation traversal. Yields the live stored reference for non-default cells (or the live `_defaultValue` for unset cells). Caller must not mutate the value — for object `T` the reference is shared with internal storage. Use `forEach` if you need a defensive copy.

### Fixed

- **H2 (Codex + Gemini High):** `setCell` / `setAt` / `fill` previously stored every value, including ones equal to `defaultValue`, into the underlying `Map<number, T>`. Although `getState()` filtered default-equal entries on serialization, the live in-memory map could grow up to `width × height` entries — `layer.fill(defaultValue)` on a 1000×1000 layer allocated 1,000,000 entries. The strip-at-write fix: writes that match `defaultValue` (by `===` for primitive `T`, or by JSON fingerprint for object `T`) now `delete` the entry instead of storing it. `fill(defaultValue)` short-circuits to `cells.clear()`. The in-memory and canonical-sparse representations now agree without a `getState` round-trip.
- **H4 (Gemini High):** `Layer<T>` reads previously called `structuredClone` on every value, even for primitive `T` (`Layer<number>`, `Layer<boolean>`, `Layer<string>`, `Layer<null>`). The constructor now caches `_isPrimitive = isImmutablePrimitive(defaultValue)` and skips `structuredClone` on every read/write boundary when the value type is primitive. For object `T` the defensive-copy contract is unchanged. The new `forEachReadOnly` provides an explicit zero-allocation read path for object `T` consumers who own the no-mutate discipline.
- **M4 (Opus Medium):** `Layer.fromState` previously called `assertJsonCompatible(value, ...)` then `jsonFingerprint(value)` per cell, and `jsonFingerprint`'s implementation also calls `assertJsonCompatible` — paying validation twice. The explicit call was removed; validation is handled inside `jsonFingerprint`.
- **M5 (Gemini Medium):** `Layer.clone()` was implemented as `Layer.fromState(this.getState())`, paying two `structuredClone` passes per cell plus the intermediate `LayerState` object. Now implemented directly: instantiate a new layer, then iterate `this.cells` once with one clone per entry.

## 0.6.0 - 2026-04-26

`CommandTransaction` correctness + ergonomics overhaul. Multi-CLI full-review (Codex / Opus; Gemini quota-degraded but produced output) flagged a Critical (mutable preconditions broke the "all-or-nothing" guarantee) plus a three-reviewer consensus High (the new transaction surface dropped the v0.5.2 typed-component generics) plus several smaller hits. Breaking — `TransactionPrecondition` signature changed; `emit()` now validates JSON-compat at buffer time; `CommandTransaction` is now generic over `<TEventMap, TCommandMap, TComponents, TState>`. 576 tests pass (up from 569).

### Breaking

- **`TransactionPrecondition` receives a read-only world façade, not the live `World`.** The new `ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState>` type is `Omit<World, ...write methods>`. Predicates that previously called `world.setComponent(...)` etc. inside the predicate now fail to typecheck, and (if the type is cast away) throw at runtime: `CommandTransaction precondition cannot call '<method>': preconditions must be side-effect free`. The contract docs already promised "world untouched on precondition failure"; the implementation now enforces it. Predicates may freely call read methods (`getComponent`, `hasResource`, `getState`, `getInRadius`, etc.).
- **`CommandTransaction.emit(type, data)` validates JSON-compat at buffer time, not at `commit()`.** Calling `emit()` with a non-JSON-cloneable payload (e.g. `{ fn: () => 1 }`) throws immediately at the builder call. Previously the throw fired during `commit()` after all buffered mutations had already applied — partial-apply hazard. Buffer-time validation moves the failure to before any state change.
- **`CommandTransaction` is now generic over four params:** `<TEventMap, TCommandMap, TComponents, TState>` (mirroring `World`'s generic order). `world.transaction()` returns `CommandTransaction<TEventMap, TCommandMap, TComponents, TState>` so typed component / state access works inside transactions. Callers using the inferred return type need no change. Callers that explicitly typed `CommandTransaction<TEventMap>` need to drop the explicit annotation or update to four generics.

### Added

- **`ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState>` type export** (`src/command-transaction.ts`) — covers the read surface available inside a precondition.
- **Typed builder overloads** on `CommandTransaction.setComponent` / `addComponent` / `patchComponent` / `removeComponent` matching `World`'s typed/loose pattern. `world.transaction().setComponent(e, 'hp', { wrong: 5 })` against a `World<..., ..., { hp: { current: number } }, ...>` now produces a TypeScript error matching `world.setComponent`.
- **`World.warnIfPoisoned(api)` is now public** (was private). The `CommandTransaction.commit()` path calls it with `api='transaction'` so a poisoned world emits the standard "warn-once-per-poison-cycle" diagnostic before applying any buffered mutation.

### Fixed

- **C1 (Critical, single-reviewer):** mutable preconditions could violate the transaction's atomicity guarantee. A predicate could call `setComponent` / `removeResource` / `emit` etc. on the live world, then return `false`; `commit()` would report `precondition_failed` while the predicate's writes stayed applied. The new read-only façade enforces side-effect freedom both at the type level (`Omit` excludes write methods) and at runtime (Proxy throws on forbidden method names + property writes).
- **H1 (High, three-reviewer consensus):** `CommandTransaction` previously had only `<TEventMap>`. Generic threading is restored.
- **H3 (High):** `world.transaction()` skipped the v0.5.1 `warnIfPoisoned` policy. `commit()` now emits the warning once per poison cycle.
- **M1 (Medium):** mid-emit JSON-compat failure used to leave mutations applied. Validation moved to buffer time.
- **L2 (Low):** after `abort()`, builder methods now throw "already aborted" (not "already committed"). A separate `terminalReason` field tracks the original terminal state so error messages stay honest.
- **L6 (Low):** the `as unknown as World<TEventMap, any, any, any>` cast and two `eslint-disable @typescript-eslint/no-explicit-any` comments at the `world.transaction()` site were obsoleted by H1 and removed.

### Documented

- **`docs/architecture/ARCHITECTURE.md`** — `CommandTransaction` Boundaries paragraph updated: predicates receive a read-only façade; `commit()` warns on poisoned world; `emit()` validates payloads at buffer time.
- **`docs/api-reference.md`** — `## Command Transaction` section updated with the new generic signature, `ReadOnlyTransactionWorld` type, and the buffer-time-validation note.

## 0.5.11 - 2026-04-25

`CommandTransaction` — atomic propose-validate-commit-or-abort builder over `World`. Inspired by MicropolisCore's `ToolEffects` (`MicropolisEngine/src/tool.h:171–305`), where a tool gathers a `WorldModificationsMap` of position-to-tile changes plus a cost, then `modifyIfEnoughFunding()` commits atomically or discards. For an AI-native engine this is the natural shape of "agent proposes an action, engine validates cost/preconditions, mutations + events apply or none do." 569 tests pass (up from 540).

### Added

- **`CommandTransaction<TEventMap>` class (`src/command-transaction.ts`)** — exported from package root.
- **`world.transaction()` method** — returns a fresh transaction bound to the world. The returned transaction inherits the world's `TEventMap`.
- **Builder methods (chainable):** `setComponent`, `addComponent`, `patchComponent`, `removeComponent`, `setPosition`, `addResource`, `removeResource`, `emit`, `require`. Each returns `this`. Each throws if the transaction has already been committed or aborted.
- **`require(predicate)`** — buffers a precondition. `predicate(world)` returns `true` (pass), `false` (fail with default reason), or a `string` (fail with the string as reason). Predicates run in registration order at the start of `commit()` and short-circuit on first failure. Each predicate sees the **current live world state**, not the transaction's proposed mutations.
- **`commit()`** — runs preconditions; on failure returns `{ ok: false, code: 'precondition_failed', reason }` with **no mutation or event applied**. On success applies every buffered mutation in order through the corresponding public `World` API, emits every buffered event through `EventBus`, and returns `{ ok: true, mutationsApplied, eventsEmitted }`.
- **`abort()`** — marks a pending transaction as aborted. Subsequent `commit()` returns `{ ok: false, code: 'aborted' }`. Idempotent — `abort()` on a committed or already-aborted transaction is a no-op.
- **`TransactionResult` type export** — discriminated union covering the three outcomes.
- **`TransactionPrecondition` type export** — for callers that want to type predicates separately.

### Atomicity guarantees

- **Precondition failure → world untouched.** No buffered mutation, no buffered event runs. Verified by the `precondition failure leaves world untouched (no partial state)` test which buffers `removeResource` + two `setComponent` calls + a precondition that returns a string, and asserts every original value is unchanged after `commit()`.
- **Preconditions see the pre-commit baseline.** Verified by the `all preconditions run before any mutation applies` test: a transaction sets `hp` to 999 and adds a precondition that reads `hp` from the world; the precondition observes the original value (50), not the proposed 999.
- **Within a tick, transaction mutations all appear in the same `TickDiff`.** Verified by the `within a tick, transaction mutations all appear in the same TickDiff` test which runs a transaction inside a system and asserts both component types appear in the resulting diff.

### v1 limitations (documented, not yet implemented)

- **Unbuffered ops:** `createEntity`, `destroyEntity`, `addTag`, `removeTag`, `setMeta`, `deleteMeta`, `setState`, `deleteState`, and resource registration / `setResourceMax`. v1 covers components (set / add / patch / remove), position, events, and resource add / remove.
- **Aliasing window.** Buffered values are stored by reference. Mutating a buffered object between the builder call and `commit()` is observable at apply time. Treat buffered values as owned by the transaction once handed over.
- **Mid-commit throw → partial state, transaction consumed.** If a buffered mutation throws mid-commit, the error propagates and earlier mutations stay applied. The transaction is still consumed (status flips to `committed` in a `finally` block) so calling `commit()` again throws — the caller cannot retry and silently double-apply earlier mutations (e.g., double-debit a resource). Validate entity liveness via `require((w) => w.isAlive(entity) || 'entity dead')` before mutating.
- **Mid-emit throw → partial event delivery.** Events fire synchronously in registration order after all mutations apply. If event N's listeners throw or the JSON-compat check rejects payload N, mutations 0..M and events 0..N-1 are already applied / fired. The transaction-level "all-or-nothing" promise covers preconditions, not emit-time exceptions.

### Documented

- **`docs/architecture/ARCHITECTURE.md`** — `CommandTransaction` added to the Component Map and a Boundaries paragraph describing the propose-validate-commit-or-abort contract, the "preconditions see live state, not the proposed projection" rule, and the v1 surface limits.
- **`docs/api-reference.md`** — new `## Command Transaction` section between `## VisibilityMap` and `## Layer` covering `world.transaction()`, the builder methods table, the `TransactionPrecondition` and `TransactionResult` types, the `commit`/`abort` semantics, the v1 limitations, and a worked cost-checked build example.

## 0.5.10 - 2026-04-25

`Layer<T>` — generic typed overlay map utility for downsampled field data. Inspired by MicropolisCore's `Map<DATA, BLKSIZE>` template (`MicropolisEngine/src/map_type.h:111`), where pollution, traffic-density, fire-station influence, etc., are each typed maps at different downsampled resolutions of the world. Standalone utility, no `World` dependency. Sibling of `OccupancyGrid` / `VisibilityMap`. 540 tests pass (up from 491).

### Added

- **`Layer<T>` (`src/layer.ts`)** — exported from package root. Constructor takes `LayerOptions<T>`: `worldWidth`, `worldHeight`, optional `blockSize` (default `1`), and `defaultValue`. Cell grid dimensions derive as `Math.ceil(worldWidth / blockSize)` × `Math.ceil(worldHeight / blockSize)`.
- **`Layer<T>.getCell(cx, cy)` / `setCell(cx, cy, value)`** — cell-coordinate access with bounds and integer-coordinate validation.
- **`Layer<T>.getAt(worldX, worldY)` / `setAt(worldX, worldY, value)`** — world-coordinate access; auto-buckets to `Math.floor(world / blockSize)`. Bounds-validates against `worldWidth`/`worldHeight`.
- **`Layer<T>.fill(value)`** — sets every cell to `value`.
- **`Layer<T>.forEach(cb)`** — visits every cell in row-major order, including unset cells (which yield `defaultValue`).
- **`Layer<T>.getState()` / `Layer.fromState<T>(state)`** — sparse JSON-serializable round-trip; cells matching `defaultValue` (by JSON fingerprint) are stripped from the snapshot; entries are sorted by cell index for determinism.
- **`Layer<T>.clone()`** — independent deep copy.
- **`LayerState<T>` and `LayerOptions<T>` type exports** — for consumers building higher-level abstractions on top.

### Validated

- `worldWidth`, `worldHeight`, `blockSize` must be **safe positive integers** (`Number.isSafeInteger`). The constructor also rejects `width * height` products that exceed `Number.MAX_SAFE_INTEGER`.
- `defaultValue` and every written cell value must satisfy `assertJsonCompatible` — no functions, symbols, BigInt, circular references, or class instances.
- Cell coordinates must be integers in `[0, width)` × `[0, height)`; world coordinates must be integers in `[0, worldWidth)` × `[0, worldHeight)`. Both out-of-range and non-integer inputs throw `RangeError` (consistent error type).
- `Layer.fromState` validates state shape (non-null object, `state.cells` is an array of `[index, value]` tuples, `state.blockSize` is present), validates each cell index is a safe integer in range, rejects duplicates, JSON-compatibility-checks each value, and **canonicalizes** by stripping any cell whose value matches `defaultValue`.

### Defensive-copy contract

Inspired by the v0.4.0+ direction (`world.grid.getAt()` returns a fresh `Set` copy; `getDiff`/`getEvents`/`serialize` deep-clone), `Layer<T>` `structuredClone`s on every value boundary:

- **Writes** (`setCell`, `setAt`, `fill`): the input value is cloned before storage. Mutating the original after the call cannot affect the Layer.
- **Reads** (`getCell`, `getAt`, `forEach`, the `defaultValue` getter): the returned value is a fresh clone of internal storage. Mutating the returned value cannot affect the Layer or other readers.
- **Serialization** (`getState`, `Layer.fromState`, `clone`): values are cloned at both ends.

For primitive `T` (`number`, `string`, `boolean`, `null`) the clones are zero-cost. For object `T`, every read pays `structuredClone(value)` — if profiling shows this dominates a hot loop, batch reads via `getState()` (one bulk clone) instead.

The default-value-strip comparison uses `jsonFingerprint` (canonical with `src/json.ts`), which under the hood is `JSON.stringify`. Two objects that are deeply equal but constructed with different key orders will not match — for object-typed `T` defaults, write your values with the same key order as `defaultValue` if you want them stripped on serialize.

### Design notes

- Storage is **sparse**: only cells that have been explicitly written are kept in the backing `Map`. Reads of unset cells return a fresh clone of `defaultValue`.
- The fingerprint of `defaultValue` is computed once at construction and cached, so `getState()` and `Layer.fromState()` strip default-valued entries in O(n) `jsonFingerprint` calls (one per stored cell), not O(n²).
- Layers are intentionally **not owned by `World`**. Game code instantiates a layer per concern (one for pollution, one for influence, one for danger) and ticks them from systems. This mirrors the existing pattern for `OccupancyGrid` / `VisibilityMap` / `Pathfinding`.

### Documented

- **`docs/architecture/ARCHITECTURE.md`** — Layer added to the Component Map and Boundaries sections, positioned next to `OccupancyGrid` and `VisibilityMap`.
- **`docs/api-reference.md`** — new `## Layer` section between `## VisibilityMap` and `## Noise` covering `LayerOptions<T>`, `LayerState<T>`, the constructor, every method, properties, the defensive-copy contract, the `fromState` validation throw list, the fingerprint key-order caveat, and a worked pollution example.

## 0.5.9 - 2026-04-25

Per-system cadence scheduling. Inspired by MicropolisCore's `simCycle % speedTable[idx]` pattern (`MicropolisEngine/src/simulate.cpp:134–143`): different sub-systems should run at different rates without each one re-implementing modulo gating. Additive, no migration needed for callers using the legacy `if (w.tick % N !== 0) return;` pattern. 491 tests pass (up from 467).

### Added

- **`SystemRegistration.interval` and `LooseSystemRegistration.interval`** (default `1`). The engine skips the system on ticks where `(executingTick - 1) % interval !== intervalOffset`, where `executingTick` is the tick number being processed (equal to `world.tick + 1` while the system is running). With `interval: N` and the default `intervalOffset: 0`, the system fires on ticks 1, N+1, 2N+1, … This matches the legacy `if (world.tick % N !== 0) return;` schedule exactly, so existing periodic systems migrate to the field by direct substitution without changing when the first fire happens.
- **`SystemRegistration.intervalOffset` and `LooseSystemRegistration.intervalOffset`** (default `0`, must satisfy `0 <= intervalOffset < interval`). Shifts the cadence so two interval-N systems can be staggered onto disjoint ticks. Three systems with `interval: 3` and offsets `0`/`1`/`2` partition every tick into a stable round-robin.
- Skipped systems do not invoke their `execute` body and do not push a per-system entry into `WorldMetrics.systems`. The cheap `(tick - 1) % interval` check still runs across all registered systems, so `WorldMetrics.durationMs.systems` (the per-tick total measured around the whole systems pass) is not literally zero for skip ticks — the savings come from the body, not from the dispatch.

### Validated

- `interval` must satisfy `Number.isSafeInteger(interval) && interval >= 1`; rejected otherwise at `registerSystem` time with a descriptive error that quotes the offending value with its type. Bounding to safe-integer range avoids non-deterministic modulo results past `2^53`.
- `intervalOffset` must satisfy `Number.isSafeInteger(intervalOffset) && 0 <= intervalOffset < interval`; rejected otherwise at `registerSystem` time.
- Validation runs **before** the order counter and resolved-order cache mutate, so a rejected registration does not burn an order slot or invalidate the cached system order.
- Ordering constraints (`before`/`after`) remain independent of cadence — topological sort still resolves intra-phase order, and skipped systems do not break the determinism of un-skipped systems' ordering.

### Behavior callouts

- **Failed ticks consume a cadence slot.** If a tick aligned with a periodic system's modulo fails, that fire opportunity is lost; the engine does not retry on the next successful tick. Tested by `failed tick consumes a cadence slot`.
- **Mid-game registration is anchored to absolute tick numbering.** Registering `interval: 10, intervalOffset: 5` at tick 7 means the next fire is the next tick where `(tick - 1) % 10 === 5`, not "5 ticks from now."
- **`metrics.systems[].name` shape becomes tick-variable** when periodic systems are registered: a periodic system is present in `metrics.systems` on its fire ticks and absent on skip ticks. Existing telemetry consumers that assumed a stable shape across ticks should note this.

### Documented

- **`docs/api-reference.md`** — `SystemRegistration` and `LooseSystemRegistration` interfaces include the new fields; `registerSystem` table lists `interval`/`intervalOffset`; throws list extended; example block shows a `Weather` system on `interval: 12` and a stagger pattern. The semantics of `executingTick` are pinned (equal to `world.tick + 1` during system execution).
- **`docs/guides/systems-and-simulation.md`** — "Periodic systems" section rewritten to recommend the `interval` field over the manual `if (w.tick % N !== 0) return;` pattern, with a stagger example and explicit notes on (a) failed-tick cadence semantics, (b) mid-game registration anchoring, and (c) when the legacy manual form is still appropriate (runtime-varying cadence).

## 0.5.8 - 2026-04-25

Iter-2 fix-review iteration 5 — **Codex CLEAN, Gemini CLEAN, Opus** flagged one remaining inconsistency in `serialization-and-diffs.md:74` ("still accepts versions 1–4" — internally inconsistent with the file's own lines 116/120, which correctly say 1–5). Fixed.

### Documented

- **`docs/guides/serialization-and-diffs.md:74`** — corrected "still accepts versions 1–4" to "accepts versions 1–5" so it lines up with the deserialize description below it and `src/world.ts` validation (which accepts `1..5`).

## 0.5.7 - 2026-04-25

Iter-2 fix-review iteration 4 — Gemini CLEAN; Codex and Opus both flagged the same residual canonical-guide drift across 7 files (the v0.5.6 cleanup only covered the three files Codex iter-3 explicitly cited). All addressed.

### Documented

- **`docs/guides/concepts.md`** — corrected the "direct mutations are diff-detected" line; removed the `Sync spatial index` step from the tick-lifecycle ASCII art; rewrote the "Spatial grid syncs before systems" implication line.
- **`docs/guides/spatial-grid.md`** — Overview rewritten (lock-step write-time sync, runtime-immutable read-only delegate, `getAt` returns a fresh `Set`); replaced the `Timing within a tick` block with the explicit-write contract.
- **`docs/guides/systems-and-simulation.md`** — removed `syncSpatialIndex()` from the tick-lifecycle numbered list; added an explicit note that the grid is in sync at all times; replaced the "Spatial sync before systems" implication row with "Grid is updated at every position write".
- **`docs/guides/getting-started.md`** — corrected the spatial-grid section ("direct position mutations are picked up by the next tick's spatial sync" → "Direct in-place mutation is not auto-detected and the grid will not reflect it").
- **`docs/guides/entities-and-components.md`** — corrected the "Mutations are immediate and are detected for diffs" line.
- **`docs/guides/serialization-and-diffs.md`** — corrected the "In-place mutation detection still works" line (no longer true in either mode); updated the deserialize version range to `1..5` and added the `references dead entity` throw to the list.
- **`docs/guides/debugging.md`** — softened the wording on the in-place-position-mutation tip so it doesn't imply the mutation gets auto-synced later.

## 0.5.6 - 2026-04-25

Iter-2 fix-review iteration 3 — Gemini and Opus signed off CLEAN; Codex flagged remaining doc drift in canonical guides and the `api-reference.md` System / SystemRegistration / callback signatures (still 2-generic in docs even though src was updated to 4-generic in v0.5.2). All addressed.

### Documented

- **`docs/guides/public-api-and-invariants.md`** — corrected the prose describing component writes: in-place mutations of `getComponent()`-returned objects are NOT diff-detected; all changes must go through `setComponent` / `addComponent` / `patchComponent` / `setPosition`. The pre-v0.5.0 wording suggesting otherwise is gone.
- **`docs/guides/commands-and-events.md`** — removed `syncSpatialIndex()` from the tick-timing diagram (the per-tick scan was removed in v0.5.0).
- **`docs/api-reference.md`** — `System`, `SystemRegistration`, `LooseSystem`, `LooseSystemRegistration` now show the four-generic signature with `TComponents` and `TState`; `ComponentRegistry` description mentions both registry generics; callback parameter signatures for `registerValidator`, `registerHandler`, `onDestroy`, `offDestroy` show the four-generic `World<TEventMap, TCommandMap, TComponents, TState>` form. The 2-generic form was the v0.5.1 baseline; v0.5.2 already updated the source.

## 0.5.5 - 2026-04-25

Iter-2 fix-review iteration 2 — multi-CLI re-review (Codex/Gemini/Opus). Gemini signed off CLEAN; Codex and Opus flagged remaining doc drift + missing regression tests. All addressed. 467 tests pass.

### Fixed

- **`cloneTickFailure` now uses `JSON.parse(JSON.stringify())`** to match `cloneTickDiff`. The previous `structuredClone` rationale (preserve Error stack) was incorrect: `createTickFailure` already normalizes `error` via `createErrorDetails` to a plain `{name, message, stack}` object before storage, so the `error` field is never an Error instance at clone time. Both helpers now use the same JSON path with a comment explaining why.
- **`docs/architecture/ARCHITECTURE.md` Boundaries section** — three lines that still described removed v0.5.0 features cleaned up: `SpatialGrid` description now reflects lock-step write-time sync (no scan); snapshot description drops `detectInPlaceMutations`; metrics description drops "spatial scan counts" in favor of `spatial.explicitSyncs`.
- **`docs/guides/debugging.md`** — `spatialSync` failure phase, `spatial_sync_threw` code, and `spatial-full-scan` debugger issue removed from the failure-codes / issue-codes tables; the bottleneck-finding example no longer reads removed metrics fields.
- **`docs/guides/public-api-and-invariants.md`** — `getMetrics()` description updated to "explicit-sync counts".
- **`docs/api-reference.md`** — `getMetrics()` description updated to mention `spatial.explicitSyncs` instead of "spatial scan counts".

### Added

- **Regression test for `world.grid.getAt()` Set isolation** — `mutating the Set returned by getAt does not corrupt the engine grid` directly tests the v0.5.4 fix.
- **Regression test for `getLastTickFailure()` reference isolation** — `getLastTickFailure returns isolated copies; mutation does not bleed across calls` locks in the per-call clone contract.

### Polish

- Trailing blank lines inside `new World({ ... })` config literals removed in `tests/world-debugger.test.ts`, `tests/history-recorder.test.ts`, `tests/scenario-runner.test.ts` — left over after the v0.5.0 `detectInPlacePositionMutations` field removal.

## 0.5.4 - 2026-04-25

Iter-2 fix-review iteration 1 — multi-CLI review (Codex/Gemini/Opus) caught real issues in the v0.5.0–0.5.3 chain. 465 tests pass.

### Fixed

- **`world.grid.getAt()` no longer returns the live backing `Set`.** The delegate now returns a fresh `Set` copy (or `null`) so `(world.grid as any).getAt(x, y).clear()` cannot corrupt the spatial index. Closes the runtime read-only hardening hole that the v0.5.0 delegate left open.
- **`getLastTickFailure()` returns a fresh defensive copy on every call.** Reverts the v0.5.3 cache that returned the same object reference to repeat callers — different consumers could mutate each other's view of the failure. Per-call `cloneTickFailure(...)` matches the contract of `getDiff`/`getEvents`.
- **`cloneTickDiff()` reverts to `JSON.parse(JSON.stringify())`.** `TickDiff` is JSON-shaped by contract (assertJsonCompatible at write time), and the JSON round-trip is faster than `structuredClone` for plain objects on V8. `cloneTickFailure()` keeps `structuredClone` because `TickFailure.error` may carry an `Error` instance whose stack `JSON.stringify` would erase.
- **`EventBus.getEvents()` reverts to `JSON.parse(JSON.stringify())`** for the same reason — emit-time validation guarantees JSON shape.

### Added

- **`World.serialize({ inspectPoisoned: true })` opt-out for the poisoned-world warn.** Engine-internal debug tooling (`WorldDebugger.capture()`, `scenario-runner.captureScenarioState()`, `WorldHistoryRecorder` snapshots) now passes this option so it doesn't trigger its own warning when inspecting a poisoned world. The default behavior — warn on `serialize()` and `submit()` from a poisoned world — is unchanged for normal callers.
- **Regression tests:**
  - `World.deserialize` rejects malformed snapshots whose `tags` or `metadata` reference dead entities (locks in L_NEW4).
  - Legacy v0.4.x snapshot fields (`config.detectInPlacePositionMutations`, `componentOptions[*].detectInPlaceMutations`) are silently ignored on read (locks in the v0.5.0 backward-compat promise).
  - Warn-once invariant: `submit + submit + serialize + serialize` after a single failure produces exactly one `console.warn`, and `recover()` re-arms the latch for the next poison cycle.
  - `serialize({ inspectPoisoned: true })` does not warn.

### Documented

- **`docs/api-reference.md`** — removed `'spatialSync'` from `TickFailurePhase`; updated `World.deserialize` signature to four-generic form (with `LooseSystem`/`LooseSystemRegistration` in the systems-array union); updated `serialize()` docs with the new `inspectPoisoned` option and the deep-clone behavior; removed stale "submit fast path" prose under the instrumentation profile docs and the `submit()` reference; added the `references dead entity` throw to deserialize's `Throws` list.
- **`docs/architecture/ARCHITECTURE.md`** — removed `World.syncSpatialIndex()` from the data-flow diagram and the `spatialSync` phase from the tick-failure list.
- **`examples/debug-client/app.js`** — debug client metrics row now reads only `metrics.spatial.explicitSyncs`.
- **`examples/debug-client/worker.js`** — removed the dead `detectInPlacePositionMutations: false` literal.
- **`scripts/rts-benchmark.mjs`** — removed `metrics.spatial.fullScans`/`scannedEntities` reads (both `undefined` post-v0.5.0); removed the dead config field; benchmark report now publishes `spatialExplicitSyncs`.

### Polish

- `normalizeSystemRegistration` casts now use the four-generic `System<TEventMap, TCommandMap, TComponents, TState>` form, matching the rest of the v0.5.2 H_NEW3 refactor.
- Trailing whitespace cleanup in `tests/world-debugger.test.ts`, `tests/history-recorder.test.ts`, `tests/scenario-runner.test.ts` left over from the v0.5.0 field removal.

## 0.5.3 - 2026-04-25

Iter-2 batch 5 — medium + polish items from the iter-2 review. 459 tests pass.

### Fixed

- **`setMeta` rejects non-finite numbers** (`NaN`, `Infinity`, `-Infinity`). Previously these were accepted and silently coerced to `null` by `JSON.stringify`, causing in-memory state to diverge from the persisted snapshot. (M_NEW2)
- **`findPath` no longer pushes overcost neighbors onto the heap or `bestG`.** When a candidate's `newG > maxCost`, the loop now skips it before allocating heap/`cameFrom`/`bestG` entries. Pure efficiency win for path queries that exceed `maxCost`. (M_NEW3)
- **`World.deserialize` rejects `tags`/`metadata` for dead entities.** Previously a malformed snapshot could create reverse-index entries that bled into recycled IDs when `createEntity()` reused them. (L_NEW4)
- **`EntityManager.fromState` validates each `alive[i]` is a boolean and each `generations[i]` is a non-negative integer.** Previously only `freeList` shape was checked. (R4 from iter-2)
- **`World.registerComponent` and `World.deserialize` clone `ComponentStoreOptions`** before storing them, so later caller mutation can't desync the snapshot's reported options from the constructed `ComponentStore`. (L_NEW7)
- **Path cache no longer double-clones on cache miss.** The resolved path is cloned once for the cache; the original is yielded to the caller. ~3× → 2× allocation per miss. (L_NEW2)

### Improved

- **`getLastTickFailure()` is now O(1) on repeat calls.** The clone is cached on first read and invalidated on `recover()` or new failure. (M_NEW5)
- **`cloneTickFailure` and `cloneTickDiff` use `structuredClone` instead of `JSON.parse(JSON.stringify())`.** Faster on hot listener paths; the JSON-shape contract is still enforced at the write side via `assertJsonCompatible`. (L_NEW1)
- **`findNearest` early-out comment clarified** to call out the Chebyshev-bound vs Euclidean-distance distinction explicitly. (L_NEW6)

### Documented

- **`docs/guides/resources.md`** — added explicit FIFO priority semantics for transfers from a shared source. Per the iter-2 Q5 user decision: when demand exceeds supply, transfers drain the source in registration order. Game code that needs proportional/priority distribution must manage allocation manually. (M_NEW4)
- **`docs/guides/rts-primitives.md`** — added a "Static blocks vs occupancy" section clarifying that `OccupancyBinding.block()` is for entity-less terrain only, `ignoreEntity` does not apply to static blocks, and entity-owned blocking should use `occupy()` instead. Per the iter-2 Q2 user decision (Option A). (R5/M10)

## 0.5.2 - 2026-04-25

Iter-2 batch 4 — typed registries thread through every callback boundary (H_NEW3). Type-only refactor; runtime behavior unchanged. 453 tests pass.

### Changed

- **`System`, `SystemRegistration`, and `RegisteredSystem` now accept `TComponents` and `TState` generics** (in addition to `TEventMap` / `TCommandMap`). Defaults match the previous behavior so existing call sites continue to compile.
- **`registerSystem`, `registerValidator`, `registerHandler`, `onDestroy`/`offDestroy`, and `World.deserialize`** now thread the world's full generic signature into their callback parameters. Inside a system, validator, handler, or destroy hook, `world.getComponent`/`world.getState` and friends preserve the typed-registry signatures established at construction.
- **`destroyCallbacks` field type** updated to match.

### Migration

No runtime change. Existing code without explicit type annotations continues to work. Code that wrote callbacks with the explicit `(world: World<Events, Commands>) => void` signature can now widen to `(world: World<Events, Commands, Components, State>) => void` to gain compile-time access to the typed component and state APIs inside the callback body.

## 0.5.1 - 2026-04-25

Iter-2 batch 3 — poison-contract integrity (H_NEW1 + H_NEW2). 452 tests pass.

### Fixed

- **Listener exceptions no longer bypass the fail-fast contract.** `commandExecutionListener`, `commandResultListener`, and `tickFailureListener` invocations are now wrapped in `try/catch`. A throwing listener logs to `console.error` and the engine continues. Previously, a synchronous listener throw inside `processCommands` propagated up through `runTick` past `finalizeTickFailure` — the world was partially mutated but `this.poisoned` was never set, so subsequent `step()` calls happily ran on inconsistent state. Listener bugs are observability bugs and no longer corrupt engine state.

### Added

- **`submit()` and `serialize()` warn (once per poison cycle) when called on a poisoned world.** The APIs remain available — debug/repair workflows often need to inspect or queue work against a poisoned world — but the engine now emits a single `console.warn` per `(poison → recover)` cycle so an AI-agent operator notices when their loop is missing the recovery step. The warning resets on `world.recover()`.

## 0.5.0 - 2026-04-25

Breaking release. Removes the in-place mutation auto-detection paths (component-store and spatial-index), tightens `world.grid` to a runtime-immutable delegate, and rejects non-JSON-compatible event payloads at `EventBus.emit`. All component and position writes must now go through `setComponent`/`addComponent`/`setPosition`. Iter-2 `R1` and `R3` from the same-day full-codebase review.

### Breaking Changes

- **Removed `ComponentStoreOptions.detectInPlaceMutations`.** `getDirty()` now reports only entries marked dirty via `set()` / `remove()`. `clearDirty()` only rebuilds the fingerprint baseline when `diffMode === 'semantic'`. Direct in-place mutation of component objects (`world.getComponent(id, 'pos').x = 5`) is no longer detected — game logic must call `setComponent` (or `setPosition`) for changes to land in the diff.
- **Removed `WorldConfig.detectInPlacePositionMutations`.** The per-tick spatial index full-scan is gone. Position writes that go through `setPosition`/`setComponent` already update the grid and `previousPositions` immediately; the scan was only the fallback for in-place mutators.
- **Removed `World.markPositionDirty()`.** It existed solely to flush in-place position mutations into the grid; without that pattern there's nothing to flush. Use `setPosition` instead.
- **Removed `WorldMetrics.spatial.fullScans` and `.scannedEntities`.** The full-scan is gone. `WorldMetrics.spatial.explicitSyncs` (incremented by every `setPosition`-style write) and `WorldMetrics.durationMs.spatialSync` (likewise removed) are no longer reported.
- **Removed `'spatialSync'` from `TickFailurePhase`.** No phase to fail in.
- **`world.grid` is now a runtime-immutable read-only delegate.** Previously typed `SpatialGridView` but assigned `this.spatialGrid` directly, so `(world.grid as any).insert(...)` could mutate the index. Now `world.grid` is a small object exposing only `width`, `height`, `getAt`, `getNeighbors`, `getInRadius`. Mutating SpatialGrid methods are not present at runtime.
- **`EventBus.emit` now rejects non-JSON-compatible payloads** (functions, symbols, BigInt, circular references, class instances) via `assertJsonCompatible`. The previous behavior was to accept anything and silently degrade `getEvents()` to a shared reference for unclonable payloads. Migration: ensure event payloads are plain JSON-shaped objects.
- **`getEvents()` no longer falls back to a shared reference on clone failure.** It always returns a deep `structuredClone`. Combined with the emit-time validation above, this means `getEvents()` cannot return live engine references.

### Migration

Most consumers should be unaffected — `setPosition`, `setComponent`, and `addComponent` were already the documented write paths. Code that mutated component objects in place (`pos.x = 5`) and relied on the per-tick scan to find the change must switch to `setPosition`/`setComponent`. Snapshots from v0.4.0 still load: extra fields (`detectInPlacePositionMutations`, `componentOptions[*].detectInPlaceMutations`) are ignored on read.

## 0.4.1 - 2026-04-25

Iter-2 critical fixes from the same-day full-codebase review (`docs/threads/done/full/2026-04-25/2/`). Two correctness/isolation bugs the iter-1 fixes left open. 450 tests pass (up from 446 in 0.4.0).

### Fixed

- **`findNearest` returns the entity at the diagonal corner of any non-tiny grid.** Previously the loop bound was `Math.max(width, height)` (Chebyshev), but `getInRadius` filters by Euclidean distance — so on any grid where `hypot(W-1, H-1) > max(W, H)`, entities in the diagonal corner from the search point silently returned `undefined`. Bound is now `Math.ceil(Math.hypot(W-1, H-1))`. Reproducible repro: 4×4 grid, entity at `(3, 3)`, `findNearest(0, 0)` now returns the entity.
- **`World.serialize()` and `World.deserialize()` no longer alias caller-owned objects.** Both boundaries `structuredClone` component data and state values; mutating the returned snapshot after `serialize()` no longer mutates live engine state, and mutating the snapshot input after `deserialize()` no longer mutates the deserialized world. Other public boundaries (`getDiff`/`getEvents`/`getByTag`) already had this property in 0.4.0.

## 0.4.0 - 2026-04-25

This release is the result of a multi-CLI full-codebase review (Codex `gpt-5.4`, Gemini `gemini-3.1-pro-preview`, and Claude Opus 4.7 1M-context). 25 distinct findings consolidated and addressed across the tick pipeline, snapshot fidelity, command pipeline, behavior tree, and defensive-view contracts. Two post-fix review iterations caught regressions in the fixes themselves; both were resolved before merge. 446 tests pass (up from 415).

### Breaking Changes

- **Tick failure semantics are now fail-fast.** Any tick failure marks the world as poisoned. `world.step()` throws `WorldTickFailureError` and `world.stepWithResult()` returns a `world_poisoned` failure result until `world.recover()` is called. Previously, callers could `step()` again immediately and observe a partially-mutated world.
- **Failed ticks consume a tick number.** A failure at would-be tick N+1 advances `gameLoop.tick` to N+1; the next successful tick after `recover()` is N+2. Previously the failed tick number was reused by the next successful tick. Failed-tick events and successful-tick events are now disjoint by `tick`.
- **`destroyEntity` callbacks observe `isAlive(id) === false`** for the dying entity. The entity is marked dying (alive=false, generation bumped) BEFORE callbacks run; the id is held off the free list until cleanup completes (try/finally), so a callback that calls `world.createEntity()` cannot recycle the dying id mid-cleanup. Cleanup also runs even if a callback throws.
- **`setMeta` throws on duplicate `(key, value)` pairs.** Previously the second writer silently overwrote the reverse index, and `getByMeta(key, value)` returned only one of the entities sharing the value. The unique-reverse-index invariant is now enforced at write time.
- **`getDiff()` returns a JSON deep-clone.** Mutations through the returned object no longer write through to the live engine. Callers that previously relied on mutating the live diff to influence engine state (always undocumented; types said `Readonly`) will silently observe no effect.
- **`getEvents()` deep-clones each event payload.** Same as above — mutations through the returned array of events are no longer observable to the engine or to other consumers of `getEvents()`.
- **Tag and metadata removal on entity destruction now appears in `TickDiff`** as `{ entity, tags: [] }` / `{ entity, meta: {} }`. Previously, consumers had to correlate `entities.destroyed` with the previous tick's `tags`/`metadata` to infer the cleanup. ARCHITECTURE.md documented this contract; the diff now matches it.
- **`WorldSnapshot` is now version 5** and round-trips `WorldConfig.maxTicksPerFrame`, `WorldConfig.instrumentationProfile`, and per-component `ComponentStoreOptions` (`diffMode` and `detectInPlaceMutations`). Versions 1–4 still load for compatibility; v4 stores fall back to default `ComponentStoreOptions`.
- **`submit()` always assigns a `submissionSequence`.** Previously, the non-`full` profile + no-listener fast path queued commands with `submissionSequence: null`, which `ClientAdapter` filtered out — so the same command could be invisible on the wire depending on profile and listener attachment. `submit()` now delegates to `submitWithResult()`; the listener-loop fast-path optimization remains inside `emitCommandResult` / `emitCommandExecution`.
- **Failed ticks now emit `tick_aborted_before_handler` execution events** for every command queued for the failed tick that did not run, and record their `submissionSequence`s in `failure.details.droppedCommands`. Previously these commands were silently lost (the queue was drained before iteration).
- **Reactive BT nodes (`reactiveSelector` / `reactiveSequence`) now clear the running-state slice of every child they skip past on a given tick.** A high-priority preemption that interrupts a stateful `Sequence` child no longer leaves that sequence at its mid-execution index; next time the reactive node falls back to it, the sequence restarts from child 0.
- **`GameLoop.step()` no longer auto-advances the tick.** Callers (only `World` in this codebase — `GameLoop` is not exported from `src/index.ts`) call `gameLoop.advance()` explicitly. `World.runTick` advances on success before diff listeners fire so `world.tick === diff.tick` during the listener phase, and on failure inside `finalizeTickFailure` (so the failed tick consumes its number).

### Added

- **`World.isPoisoned()` and `World.recover()`** to inspect/clear the poison flag set by tick failures. `recover()` also clears `lastTickFailure`, `currentDiff`, and `currentMetrics`.
- **`World.getAliveEntities()` and `World.getEntityGeneration(id)`** primitives. `RenderAdapter.connect()` now uses them instead of `world.serialize()` so connecting renderers no longer pay a snapshot-sized JSON-compat walk.
- **`ComponentStoreOptions.detectInPlaceMutations`** (default `true`). When `false`, `getDirty()` and `clearDirty()` skip the per-tick all-entries fingerprint scan; callers commit to writing only through `setComponent`. Pairs with `diffMode` and is round-tripped in v5 snapshots.
- **`SubcellOccupancyGrid`** for deterministic slot-based crowding on top of coarse cell blockers, including `bestSlotForUnit()`, `occupy()`, and `neighborsWithSpace()` for smaller-than-cell unit packing.
- **`OccupancyBinding`** for higher-level passability ownership: blocker metadata (`building` / `resource` / `unit` etc.), destroy-time lifecycle cleanup via `world.onDestroy()`, optional sub-cell crowding, crowding-aware `isBlocked()` path queries, and a `GridPassability`-compatible surface that plugs directly into `findGridPath()`.
- **`getMetrics()` / `resetMetrics()`** on `OccupancyGrid` and `SubcellOccupancyGrid`, plus occupancy-cost reporting in `npm run benchmark:rts`.
- **`reactiveSelector` and `reactiveSequence`** BT builder methods that do not persist running state across ticks, plus a `clearRunningState(state, node?)` helper for imperative subtree resets. Existing `selector` / `sequence` semantics are unchanged.
- **`ComponentOptions.diffMode: 'strict' | 'semantic'`** on `World.registerComponent`. Semantic mode fingerprints values in `set()` and skips dirty-marking on unchanged rewrites. Strict mode remains the default.
- **Fourth `TState` generic on `World`** (default `Record<string, unknown>`). `setState`/`getState`/`hasState`/`deleteState` type against `TState` so state and components have separate type registries — the previous overload that aliased `TState` to `TComponents` was an accidental conflation.
- **`SpatialGrid.assertBounds(x, y)`** is now public so `World.assertPositionInBounds` can validate explicitly instead of relying on `getAt`'s side effect.
- **`GameLoop.advance()`, `GameLoop.getMaxTicksPerFrame()`, `DEFAULT_MAX_TICKS_PER_FRAME`** exported from `src/game-loop.ts`.
- **`EntityManager.markDying()`, `releaseId()`, `aliveEntities()`** to support the split destroy lifecycle and the new `World.getAliveEntities()`.

### Fixed

- **`ComponentStore` strict-mode hot path** no longer computes `JSON.stringify` per `set()`; the fingerprint is only built when needed for semantic-mode rewrite suppression. JSON-compat validation still runs in both modes.
- **`ComponentStore.set()` clears the entity from `removedSet`** so a `remove()` followed by `set()` in the same tick produces a single `set` entry in the diff (was producing both `set` and `removed`).
- **`findNearest`** uses an expanding-radius walk with a `seen` set and an early-out when `bestDistSq <= (r-1)²`. The previous implementation was O(R³) for far targets; the prior fix made it O(W·H) on every call. The current implementation is O(R²) common-case with a clean early exit.
- **Pathfinding** no longer aborts the search on the first node whose `g > maxCost`; it `continue`s past such nodes so inadmissible-heuristic paths still terminate correctly. Negative edge costs are filtered out (`continue`).
- **`VisibilityMap.getState()`** now flushes dirty players via `update()` before reading, so a snapshot taken after `setSource()`/`removeSource()` reflects current data.
- **`ResourceStore.fromState()`** rejects duplicate transfer ids, normalizes `nextTransferId` to be greater than every existing id, and clamps `pool.current` to `pool.max` on load.
- **`EntityManager.fromState()`** validates `generations.length === alive.length`, that every freelist id is in range, dead, and unique.
- **`World.deserialize`** rejects non-integer or negative entity-id keys in `snapshot.tags` / `snapshot.metadata`.
- **`WorldHistoryRecorder.recordTick()`** deep-clones the user's debug payload at record time so a memoized live structure cannot retroactively corrupt the recorded tick history.
- **`getByTag()` / `getTags()`** allocate fresh empty `Set`s on miss instead of returning a shared sentinel that could be mutated by a careless cast.
- **Reactive BT nodes** are now wired to `BTState` so they can call `clearRunningState` on preempted children.
- **`SelectorNode` / `SequenceNode`** default `state.running[index]` to `-1` via `?? -1` instead of relying on `Math.max(undefined, 0) === NaN`.
- **`noise.GRAD2`** is `as const` with element type `readonly [number, number]`; index masking switched from `% 8` to `& 7` to make the length invariant explicit.
- **`OccupancyBindingWorldHooks`** callback signature drops the unused `world: unknown` argument.

### Documentation

- New `docs/devlog/detailed/2026-04-25_2026-04-25.md` with the full per-batch breakdown.
- New `docs/superpowers/plans/2026-04-25-full-review-fixes.md` plan file used to drive the implementation.
- New `docs/threads/done/full/2026-04-25/1/` review artifacts (`review prompt (not retained)`, `REVIEW.md`, Codex summary, Gemini summary, Opus summary).
- 5 new rows in `docs/architecture/drift-log.md` covering fail-fast semantics, `TState` generic, snapshot v5, `detectInPlaceMutations`, and the GameLoop tick-advance change.
- ARCHITECTURE.md updated for snapshot v5, the new tick-failure section, the `TState` generic, and the `setMeta` uniqueness throw.
- Updated the README, architecture notes, API reference, RTS primitives guide, and sub-grid movement guide to document the higher-level occupancy binding and the new occupancy benchmark metrics.

### Known Deferred (not regressions)

- **M10**: `OccupancyBinding` owner-aware blocks + `ignoreEntity` for static cells — needs a separate brainstorm; current behavior treats blocks as entity-less terrain.
- Snapshot validation for component count > 64 (silent overflow today).
- Reactive-BT deeper sibling cleanup (current implementation clears children at `> i`; deeper failed-branch interiors are not recursively cleared).
- `getDiff()` clone-cost optimization (always clones today; an opt-in `getDiffReadOnly()` could skip the clone for read-only consumers).

## 0.3.0 - 2026-04-12

This release addresses six ergonomics friction points identified by game projects consuming the engine. All changes are additive and backwards-compatible.

### Breaking Changes

- `WorldSnapshot` is now version 4 and includes `state`, `tags`, and `metadata` fields. Version 1-3 snapshots still load for compatibility.
- `TickDiff` now includes `state`, `tags`, and `metadata` fields.

### Added

- **Loose system typing:** `LooseSystem` and `LooseSystemRegistration` types allow systems typed against bare `World` or `World<any, any>` to be registered without casts into generic worlds. `registerSystem` accepts both strict and loose system types via overloads.
- **Typed component registry:** Optional third type parameter `TComponents` on `World<TEventMap, TCommandMap, TComponents>`. When provided, `getComponent`, `setComponent`, `addComponent`, `patchComponent`, `removeComponent`, and `query` infer types from component keys. Falls back to the existing string-based API when omitted.
- **World-level state store:** `setState(key, value)`, `getState(key)`, `deleteState(key)`, `hasState(key)` for non-entity structured state (terrain config, simulation parameters, etc.). Included in serialization and diffs. JSON-compatible values only.
- **Spatial query helpers:** `queryInRadius(cx, cy, radius, ...components)` combines spatial proximity with component filtering. `findNearest(cx, cy, ...components)` returns the closest entity matching all components.
- **System ordering constraints:** `SystemRegistration.before` and `SystemRegistration.after` accept arrays of system names. Constraints resolve via topological sort within each phase. Cycles, cross-phase constraints, and missing name references throw descriptive errors. Order re-resolves when systems are added dynamically.
- **Entity tags:** `addTag`, `removeTag`, `hasTag`, `getByTag` (reverse-indexed), `getTags`. Multiple entities can share a tag. Tags cleaned up on entity destruction, included in serialization and diffs.
- **Entity metadata:** `setMeta`, `getMeta`, `deleteMeta`, `getByMeta` (unique reverse-indexed). Designed for external IDs and stable gameplay IDs. Metadata cleaned up on entity destruction, included in serialization and diffs.

## 0.2.0 - 2026-04-10

This release hardens the engine API and package boundary while adding RTS-scale primitives, render/debug infrastructure, and a browser reference debug client for reusable 2D civilization simulation projects.

### Breaking Changes

- Resource pools now use `max: null` for unbounded capacity instead of `Infinity`.
- Component data must be JSON-compatible. Components containing `undefined`, non-finite numbers, functions, symbols, bigints, class instances, or circular references are rejected.
- Component and resource writes through `World` now validate entity liveness and throw for dead or never-created entities.
- Position writes validate integer grid bounds before mutating component state.
- `WorldSnapshot` is now version 3 and includes resource state plus deterministic RNG state. Version 1 and 2 snapshots still load for compatibility.

### Added

- `EntityRef`, `world.getEntityRef(id)`, and `world.isCurrent(ref)` for stale-reference checks across recycled entity IDs.
- `world.setComponent()`, `world.patchComponent()`, and `world.setPosition()` as explicit write APIs.
- In-place component mutation detection for tick diffs.
- Read-only `world.grid` view, while `SpatialGrid` remains available as a standalone utility.
- Resource store snapshot state, including registrations, pools, rates, transfers, and next transfer ID.
- `world.random()` and `WorldConfig.seed` for deterministic pseudo-random simulation logic.
- Phase-aware system registration with `input`, `preUpdate`, `update`, `postUpdate`, and `output` phases.
- `world.getMetrics()` for per-tick timing, query cache, system, and spatial sync instrumentation.
- `WorldConfig.detectInPlacePositionMutations` and `world.markPositionDirty()` for large simulations that want to avoid the compatibility full-scan spatial sync path.
- `OccupancyGrid` for deterministic blocked-cell, footprint, occupancy, and reservation tracking.
- `findGridPath`, `PathCache`, `PathRequestQueue`, and `createGridPathQueue` for RTS-scale deterministic grid path processing.
- `VisibilityMap` for per-player visible and explored cell tracking.
- `RenderAdapter` for renderer-facing projected snapshots and diffs with generation-aware entity refs.
- `WorldDebugger` plus occupancy, visibility, and path queue probe helpers for headless inspection.
- Machine-readable `WorldDebugger.issues` alongside compatibility `warnings`.
- `world.submitWithResult()`, structured validator rejections, and command-result listeners.
- `CommandExecutionResult`, `world.onCommandExecution()`, and submission-sequence tracking so queued commands can be matched to tick-time execution or failure.
- `WorldHistoryRecorder` for short-horizon command outcomes and tick history capture.
- `TickFailure`, `WorldStepResult`, `WorldTickFailureError`, `world.stepWithResult()`, and `world.getLastTickFailure()` for structured runtime failure handling without forcing AI loops through thrown exceptions.
- `WorldDebugger.tickFailure` plus machine-readable runtime error issues derived from the latest failed tick.
- `WorldHistoryRecorder` capture for command execution results and tick failures, plus range summaries that aggregate execution outcomes and failure codes.
- Explicit AI contract version exports plus `schemaVersion` markers on command outcomes, debugger snapshots, history state, and scenario results.
- `summarizeWorldHistoryRange()` for AI-facing tick-window summaries over command outcomes, changed entities, events, and issues.
- `runScenario()` for headless setup, scripted stepping, checks, and structured AI-facing results.
- A browser debug client example backed by a worker-owned simulation, `RenderAdapter`, and `WorldDebugger`.
- `npm run benchmark:rts` for deterministic RTS-scale benchmark scenarios and metrics output.
- Runtime validation for world config, game-loop config, resource amounts/rates/maxima, and spatial coordinates.
- `ClientAdapter` runtime message guarding, structured `commandAccepted`/`commandRejected` outcomes, and optional `onError` callback for send failures.
- `ClientAdapter` streaming for `commandExecuted`, `commandFailed`, and `tickFailed` messages so remote agents can distinguish queued commands from executed commands and read structured tick failures.
- Client protocol version markers on server message envelopes.
- Tick-budget metrics plus `tick-budget-exceeded` debugger issues with slow-system context.
- `InstrumentationProfile` and `WorldConfig.instrumentationProfile` with `full`, `minimal`, and `release` modes for development, QA/staging, and shipping runtime overhead control.
- Lazy command execution feedback allocation so runtime execution results are only built when listeners are attached.
- Root package export barrel, declaration build config, npm package metadata, and CI workflow.

### Documentation

- Added `docs/README.md`.
- Added `docs/threads/done/engine-hardening/2026-04-10/1/REVIEW.md`.
- Added `docs/guides/public-api-and-invariants.md`.
- Added `docs/guides/ai-integration.md`.
- Added `docs/guides/scenario-runner.md`.
- Added `docs/guides/rendering.md`.
- Added `docs/guides/rts-primitives.md`.
- Added `docs/guides/debugging.md`.
- Added `docs/threads/done/ai-first-engine/2026-04-11/1/REVIEW.md`.
- Added `docs/threads/done/ai-final-form/2026-04-11/1/REVIEW.md`.
- Added `docs/threads/done/ai-runtime-feedback/2026-04-11/1/REVIEW.md`.
- Renamed the completed render/debugger review doc to `docs/threads/done/render-contract-debugger/2026-04-10/1/REVIEW.md` and trimmed the root README back to an overview so `docs/api-reference.md` remains the single authoritative API surface.
- Added the `examples/debug-client/` browser reference viewer and `npm run debug:client`.
- Reorganized documentation entry points around the docs hub and focused plan/review docs.
- Updated README, API reference, guides, and tutorials for package-root imports, explicit write APIs, `EntityRef`, structured command submission and execution outcomes, structured tick failures, AI-facing debugging/history tools, versioned machine contracts, client protocol version markers, JSON-compatible component data, resource `max: null`, snapshot v3, client-adapter message handling, render projection, and debugging helpers.
- Documented the instrumentation profile model and the boundary between explicit AI diagnostics (`submitWithResult()`, `stepWithResult()`) and lower-overhead implicit runtime paths (`submit()`, `step()` in `minimal` and `release`).
