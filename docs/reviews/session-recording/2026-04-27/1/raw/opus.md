I have enough to write the review. Compiling findings now.

# Code Review — Session Recording Subsystem (`agent/session-recording`)

## Summary

The implementation tracks the v5 spec closely on shape and surface area: bundle types, error hierarchy, sink/source split, recorder lifecycle (single wrap, mutex via hidden slot, single-use, terminal snapshot), replayer with `worldFactory` injection, scenario adapter, and `World.applySnapshot`. ADRs 1–4 are honored. However, the implementation has one real cross-snapshot replay bug (false-positive execution divergences), a partially shipped doc surface, and incomplete §11.1 paired-test coverage. The spec's §13.5 CI gate passes only because every test recording fits in the (initial, terminal) two-snapshot case — no real exercise of multi-segment replay paths.

---

## Findings

### HIGH

**H1. Multi-segment `selfCheck` produces false-positive `executionDivergences` because `nextCommandResultSequence` is never restored.**
`WorldSnapshotV5` (`src/serializer.ts:62-78`) does not capture `nextCommandResultSequence`. `World.applySnapshot` (`src/world.ts:1087-1128`) does not transfer it from the deserialized `fresh` world. The replayer's `_checkSegment` (`src/session-replayer.ts:323`) constructs a new `worldFactory(snap)` per segment, which always starts the counter at 0. The recording's `CommandExecutionResult.submissionSequence` is monotonic across the whole session — so for any segment after the first, the comparison `deepEqualOrdered(expected, actual)` mismatches on `submissionSequence` for every executed command, and `executionDivergence` is reported even on a clean recording. Same issue for `openAt(tick)` when the caller relies on result identity. Tests don't surface this because every recording in the suite stays under 1000 ticks with the default `snapshotInterval: 1000` → only `(initial, terminal)`, which is the one segment that works. A long capture with periodic snapshots — the headline §13.2 use case — will fail the §13.5 CI gate spuriously.

**H2. API reference is materially incomplete.**
`docs/api-reference.md` adds sections only for T1 (types + errors), T2 (sinks), T3 (FileSink). The intro at `docs/api-reference.md:4650` still reads "(`SessionRecorder`, `SessionReplayer`, sinks) lands in subsequent tasks" — but T5, T6, T7, T8, T9 have all landed (commits `11f50fd`–`dd1afce`). Missing per spec §14: `SessionRecorder` (constructor, `connect`/`disconnect`/`addMarker`/`attach`/`takeSnapshot`/`toBundle`, `lastError`), `SessionReplayer` (`fromBundle`/`fromSource`, `openAt`, `selfCheck`, `tickEntriesBetween`, marker queries, `validateMarkers`), `scenarioResultToBundle()`, `MemorySink`, `MemorySinkOptions`, `SelfCheckOptions`/`SelfCheckResult`, `StateDivergence`, `EventDivergence`, `ExecutionDivergence`, `SkippedSegment`, `MarkerValidationResult`, `ReplayerConfig`, `NewMarker`, and the `deepEqualWithPath` export. AGENTS.md Documentation discipline treats this as a regression that blocks merge.

**H3. Determinism-contract paired tests cover 3 of 8 applicable clauses.**
`tests/determinism-contract.test.ts` has clean+violation pairs only for clauses 3 (rng), 5 (wall-clock), 8 (registration order). Spec §13.3 requires clauses 1–9 paired (clause 9 explicitly handled at construction). Missing: clause 1 (external mutation between ticks), clause 2 (mid-tick submit), clause 4 (impure validators), clause 6 (unordered iteration), clause 7 (env branching). Spec §18 acceptance criterion ("`selfCheck()` correctly identifies deliberately introduced determinism violations across each clause of §11.1") is not satisfied.

### MEDIUM

**M1. Quadratic per-tick lookup in `selfCheck` / `openAt`.**
`session-replayer.ts:206`, `:334`, `:348`, `:355` filter/find over `bundle.commands` / `bundle.ticks` / `bundle.executions` once per replayed tick → O(N·T) per segment where N = events of that kind, T = ticks in segment. Spec §13.2 throughput target ("`openAt()` walking a single segment runs ≥ 5x recording throughput") is unachievable on the 10000-tick × 50-command smoke test. Pre-grouping into `Map<tick, RecordedCommand[]>`/etc. once at construction makes this O(1) per tick.

**M2. `tickEntriesBetween` ignores incomplete-bundle upper bound.**
`session-replayer.ts:228` checks `toTick > md.endTick` rather than `toTick > (md.incomplete ? md.persistedEndTick : md.endTick)`. Spec §12 says incomplete bundles use `[startTick, persistedEndTick]`. As written, callers querying an incomplete bundle up to `endTick` pass the precondition and silently get a truncated set. (`openAt` and `stateAtTick` are correct; the bug is only here.)

**M3. Stale `ENGINE_VERSION` literal in api-reference.md:4783** — shows `'0.7.7'` but the value is `'0.7.15'`. Self-rotting; either drop the literal or document it as "matches `package.json`".

**M4. Dead-code import-pinning block (`session-replayer.ts:473-483`).**
The `type _UseCommandSubmissionResult = …; const _u1 = null; void _u1;` pattern adds nothing — locally-declared aliases aren't visible to "callers" as the comment claims. `RecordedCommand` is genuinely used (line 4); `CommandSubmissionResult`, `SessionRecordingError`, `TickFailure` should either be removed from imports or the block should be deleted (TypeScript drops unused type imports cleanly). Violates AGENTS.md cleanup discipline.

**M5. Doc / spec drift on `scenarioResultToBundle` precondition.**
Spec §10.1 says the adapter "throws `BundleIntegrityError(code: 'no_initial_snapshot')` if `result.history.initialSnapshot === null`". The implementation in `session-scenario-bundle.ts:48-53` matches. But `WorldHistoryRecorder.captureInitialSnapshot` defaults to `true` (per `history-recorder.ts:107`) — so the only path to the error is users *explicitly opting out*. The test (`tests/scenario-bundle.test.ts:165-173`) covers it. OK on substance; just confirm this case is documented in the session-recording guide.

### LOW

**L1. `bytesToBase64` duplicated** identically in `src/session-sink.ts:69-79` and `src/session-file-sink.ts:377-387`. AGENTS.md "no duplicated logic." Extract to `json.ts` or a small util.

**L2. `_handleSinkError` doesn't gate user-facing methods after partial-`connect()` failure.**
If `sink.open()` succeeds but the initial-snapshot write throws, `_terminated = true` and `_connected = true` (recorder.ts:139-144). `addMarker`/`attach`/`takeSnapshot` only check `!_connected || _closed`, so subsequent calls re-throw the sink error each time instead of failing fast with `RecorderClosedError`. Adding `_terminated` to the guard makes the failure mode coherent.

**L3. Section headers leak internal task IDs.**
`docs/api-reference.md:4648, 4788, 4846` use `(T1: types + errors)`, `(T2: sinks)`, `(T3: FileSink)` — task numbers from the implementation plan. External readers have no context for these. Rename to feature labels.

**L4. `applySnapshot` field-by-field assignment is fragile.**
`world.ts:1094-1113` manually transfers ~22 private fields. There's no compile-time guarantee that future World fields land here too. A missed field produces partial-state bugs that surface as selfCheck divergences. Consider a single `replaceStateFrom(other: World)` helper or a typed list of state-bearing field names asserted against `keyof this`.

**L5. `__payloadCapturingRecorder` slot leaks if recorder is GC'd without `disconnect()`.**
`connect()` sets the slot; only `disconnect()` clears it. A discarded recorder permanently blocks future payload-capturing recorders on that world with `recorder_already_attached`. No finalizer. Hard to fix; flag.

### NOTES

- `openAt`'s snapshot scan (`session-replayer.ts:198-201`) is O(N) over all snapshots; binary search after sort would be O(log N) for long captures.
- `selfCheck`'s skipped-segment check (`session-replayer.ts:264`) treats failures within `[a.tick, b.tick)` (b exclusive) — fine in practice since recorders typically stop at failure, but document the edge case.
- `scenarioResultToBundle` deep-clones four arrays via JSON round-trip. For long scenarios that's a measurable cost; data is already JSON-compatible from `WorldHistoryRecorder`. Acceptable for v1.
- `MIME_EXT_TABLE` (`session-file-sink.ts:35-45`) is small but pragmatic; future common types (`text/html`, `application/pdf`, `audio/*`) will fall through to `.bin`. Spec acknowledges extension is "purely for human convenience" so this is OK.
- `session-replayer.ts` is at 483 LOC, just under the 500 limit. The H1 fix plus performance grouping (M1) plus dead-code removal (M4) will land near the boundary; consider splitting `selfCheck`/`_checkSegment`/`deepEqualWithPath` into a sibling module.

---

## Overall Assessment

Solid spec-tracking implementation with one real correctness bug (H1 — multi-segment execution-stream replay), a doc surface that hasn't caught up with T5–T7 (H2), and incomplete CI-gate coverage (H3); spec invariants and test scaffolding are otherwise faithful, and the merge is unblocked once H1–H3 are addressed.
