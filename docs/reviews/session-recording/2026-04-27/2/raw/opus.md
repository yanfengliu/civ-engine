Iter-2 review written to `docs/reviews/session-recording/2026-04-27/2/raw/opus.md`. Summary:

## Closure list

**Closed (Yes):** H1 (submissionSequence stripped from comparison), H2 (T5/T6/T7 sections added with full signatures + error codes), M2 (uses `persistedEndTick` for incomplete bundles), M3 (`ENGINE_VERSION` literal removed), M4 (dead-code block gone), L1 (`bytesToBase64` extracted to `json.ts`).

**Partial:** M5 (api-reference documents the error code; guide only mentions the requirement).

**Not closed (No):** H3 (still 3/8 paired clauses — missing 1, 2, 4, 6, 7), M1 (still O(N·T) per-tick `filter`/`find` over `bundle.commands` / `.ticks` / `.executions`), L2 (no `_terminated` guard on user-facing methods), L3 (T-prefix headers preserved + propagated to T5/T6/T7), L4 (~22 manual field assignments unchanged), L5 (acknowledged-hard, no finalizer).

## Remaining real issues

- **H3** — five §11.1 clauses still untested (~150 LOC of paired tests away)
- **M1** — pre-grouping into `Map<tick, T[]>` at construction unblocks §13.2 throughput target
- **L2/L3/L4** — small cleanups
- **N1 (new)** — H1's fix has no multi-segment regression test; every existing test uses ≤5-tick recordings with default `snapshotInterval: 1000`, so the (initial, terminal) two-snapshot path is the only one exercised — the one path where the original bug never manifested

## One-line assessment

H1/H2 closed cleanly; H3 + M1 carry over and N1 is a new test gap from the H1 fix not being regression-pinned — branch is two paired-test additions and one perf-pass away from converged.
WithPath`, `MarkerKind`, `MarkerProvenance`, `EntityRef`, `MarkerRefs`, `RecordedCommand`, `NewMarker`, `ReplayerConfig`, `SelfCheckOptions`, `SelfCheckResult` all present. |
| **H3** — Determinism-contract tests cover 3 of 8 clauses | **No** | `tests/determinism-contract.test.ts` still has only clauses 3, 5, 8 (rng / wall-clock / registration-order). Header comment claims "clauses 1-8" but missing: clause 1 (external mutation between ticks), clause 2 (mid-tick submit), clause 4 (impure validators), clause 6 (unordered iteration), clause 7 (env branching). Spec §18 acceptance criterion still unsatisfied. |
| **M1** — Quadratic per-tick lookup in `selfCheck` / `openAt` | **No** | `session-replayer.ts:329, 343, 365-366, 200-201` still do `bundle.commands.filter(...)`, `bundle.ticks.find(...)`, `bundle.executions.filter(...)` once per replayed tick → O(N·T) per segment. Spec §13.2 throughput target (≥5x recording on 10k×50 smoke) remains unachievable without a one-time `Map<tick, T[]>` pre-grouping. |
| **M2** — `tickEntriesBetween` ignores incomplete-bundle upper bound | **Yes** | `session-replayer.ts:222` computes `upper = md.incomplete ? md.persistedEndTick : md.endTick` and uses it in both bounds check and error payload. |
| **M3** — Stale `ENGINE_VERSION` literal | **Yes** | `docs/api-reference.md:4786` now reads `const ENGINE_VERSION: string;  // matches package.json's 'version' field` — drops the self-rotting literal. |
| **M4** — Dead-code import-pinning block | **Yes** | `session-replayer.ts` ends at `deepEqualOrdered` (line 489); the `_UseCommandSubmissionResult` block is gone. Still under 500-LOC limit. |
| **M5** — `scenarioResultToBundle` `no_initial_snapshot` precondition | **Partial** | `docs/api-reference.md:4980-4983` documents `BundleIntegrityError(code: 'no_initial_snapshot')` thrown when `captureInitialSnapshot: false`. `docs/guides/session-recording.md:171` only states `captureInitialSnapshot: true` is "default; required for replay" — does not mention the explicit error code or how to recover. Adequate but thinner than api-reference. |
| **L1** — `bytesToBase64` duplicated | **Yes** | Extracted to `src/json.ts:81-94`. Both `session-sink.ts:1` and `session-file-sink.ts:3` import from `./json.js`. |
| **L2** — `_handleSinkError` doesn't gate user-facing methods | **No** | `session-recorder.ts:228, 287, 318` (`addMarker` / `attach` / `takeSnapshot`) still guard only on `!this._connected || this._closed`. After a partial-`connect()` sink failure flips `_terminated = true` but leaves `_connected = true`, every subsequent user call re-enters the failed sink path and re-throws `SinkWriteError` instead of failing fast with `RecorderClosedError`. |
| **L3** — Section headers leak internal task IDs | **No** | `docs/api-reference.md:4651, 4791, 4849, 4885, 4923, 4972` all retain `(T1: …)` / `(T2: …)` / `(T3: …)` / `(T5: …)` / `(T6: …)` / `(T7: …)` headers. The new sections inherit the same convention. External readers have no context for `T5`/`T6`/`T7`. |
| **L4** — `applySnapshot` field-by-field is fragile | **No** | `world.ts:1098-1140` still does ~22 manual field assignments. The new component-preservation block (lines 1099-1125) addresses a different concern (Codex C2). The compile-time-safety gap remains: a future `World` field added without a paired `applySnapshot` line will silently leak prior state and surface as a `selfCheck` divergence. |
| **L5** — `__payloadCapturingRecorder` slot leak on GC without `disconnect()` | **No** | No `FinalizationRegistry` or equivalent. Iter-1 flagged this as hard; v0.7.16 doesn't attempt a fix. |

---

## Remaining real issues

1. **H3 (HIGH, unchanged):** Five §11.1 clauses still untested. Spec §18 acceptance criterion blocks merge per AGENTS.md doc-discipline reading. Add paired clean+violation tests for clauses 1, 2, 4, 6, 7. Estimated 5 × ~30 LOC each.

2. **M1 (MEDIUM, unchanged):** Pre-group `bundle.commands` / `bundle.ticks` / `bundle.executions` into `Map<tick, T[]>` once at replayer construction. Mechanical change in `_checkSegment` and `openAt`; lifts the §13.2 throughput target gate. Worth doing now while the call sites are fresh.

3. **L2 (LOW, unchanged):** Add `this._terminated` to the `addMarker` / `attach` / `takeSnapshot` guards, throwing `RecorderClosedError({ code: 'recorder_terminated', cause: this._lastError })`. Coherent failure mode after partial-`connect()` sink errors.

4. **L3 (LOW, unchanged):** Rename section headers to feature labels (e.g. `## Session Recording — SessionRecorder`). T-prefix is implementation-plan vocabulary; no value to external readers.

5. **L4 (LOW, unchanged):** Either replace the manual field list with a typed `STATE_BEARING_FIELDS: readonly (keyof World)[]` array iterated once, or — cleaner — invert the operation as `replaceStateFrom(other: World)` and place the field list adjacent to the field declarations so future additions co-locate. Not blocking but earns its keep when the next `World` field lands.

6. **N1 (NEW, MEDIUM-LOW):** H1's fix lacks a regression test. `tests/session-replayer.test.ts` and `tests/determinism-contract.test.ts` all use ≤5-tick recordings with default `snapshotInterval: 1000`, so `selfCheck` only ever exercises the `(initial, terminal)` segment — the one segment where `submissionSequence` would have agreed even without the fix. Add a test that records ≥3 segments (e.g. 6 ticks with `snapshotInterval: 2`) and submits a command in each, asserting `selfCheck.ok === true`. Without this, the §13.5 CI gate is still rubber-stamping the original H1 bug pattern.

---

## One-line assessment

H1/H2 closed cleanly; H3 + M1 carry over and N1 is a new test gap from the H1 fix not being regression-pinned — branch is two paired-test additions and one perf-pass away from converged.
