All four gates pass: typecheck, lint, build, 759 tests + 2 it.todo. Let me finalize the review.

---

# Code Review — `agent/session-recording-followups` (4 commits)

**Overall:** Approve. The four iter-2 followups land cleanly, with no behavior regressions, faithful refactors, and one minor doc-completeness gap.

## Summary

| Commit | Item | Verdict |
|---|---|---|
| 463476b | M1 — pre-group commands/events/executions in `SessionReplayer` ctor | Correct; sort ordering preserved, `?? []` defaults handle missing ticks |
| b116645 | L2 — `_assertOperational` guards `addMarker`/`attach`/`takeSnapshot` against `_terminated` | Correct; check order (closed → not-connected → terminated) handles all real-world states |
| b116645 | L4 — `_replaceStateFrom` extracted from `applySnapshot` | Field-by-field equivalent to prior body; nice grouping; preserves order with `setTick` |
| b116645 | L3 — `docs/api-reference.md` section headers renamed off (T#) labels | TOC + headers updated; **3 inline `(T#)` task-id references remain** |
| a835aa0 | H3 — paired tests for clauses 1, 2, 7; clauses 4/6 deferred as `it.todo` | Fixtures exercise the right divergences; rationale for deferral is reasonable |
| f565bec | README version badge bump | Correct |

## Critical / High / Medium

None.

## Low

**L1 — `docs/api-reference.md`: 3 dangling `(T3)`/`(T5)`/`(T7)` inline references.** The L3 commit message argued task IDs "mean nothing to external readers" and renamed section headers, but left these:
- `docs/api-reference.md:4731` — "reserved for `scenarioResultToBundle()` (T7)"
- `docs/api-reference.md:4789` — "Read by `SessionRecorder` (T5) and `scenarioResultToBundle()` (T7)"
- `docs/api-reference.md:4830` — "`MemorySink` and (T3) `FileSink`"

Same external-reader confusion. Recommend deleting the parenthetical refs (the surrounding sentences read fine without them).

## Note

**N1 — `_replaceStateFrom`'s "NOT transferred" comment is incomplete.** Misses `nextSystemOrder` (preserved alongside `systems`) and `nextCommandResultSequence` (intentionally preserved — the `selfCheck` comment in `session-replayer.ts:386–388` actually depends on this so a fresh `worldFactory` world's counter starts at 0). Helper behavior is correct; just the audit-comment list is short. The helper itself says "Adding a new state-bearing field to `World`? Add a transfer line here" — that note is even stronger if the preserved-list is exhaustive, since today a reader could think `nextSystemOrder` was missed by accident.

**N2 — Execution divergence now exposes the internal `_executionsByTick` array by reference.** Previously `expected` in an `ExecutionDivergence` was a fresh `filter()` result; now `expectedRaw = this._executionsByTick.get(t+1)` is pushed directly. If a caller mutates `divergence.expected`, they corrupt the replayer's internal index for subsequent `selfCheck()` calls. Highly unusual usage pattern; not flagged higher because no existing test or doc encourages mutating divergence results, and the `bundle.ticks[i].events` reference share already exhibited the same pattern pre-change.

**N3 — Pre-grouping locks in the bundle's command/event/execution arrays at construction.** If a caller mutates `bundle.commands` after `SessionReplayer.fromBundle(bundle, …)`, the new code won't see it (the original `filter`/`find` re-read each tick and would have). Bundles are conceptually immutable artifacts; this is a behavior change that no realistic caller depends on.

**N4 — Clause-2 paired test is correctly designed but the comment block (lines 282-285) refers to a "tick-counter" component that doesn't exist in the test (the actual component is `submit-counter`).** Stale text from an earlier draft; the test logic itself is fine.

## Verification

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm test` ✅ — 759 passed, 2 todo (clause 4/6 deferral)

The `typeof this._bundle.commands[number]` field annotations type-check successfully under TS strict, no runtime concerns.

The four review items (M1, L2, L3, L4) and H3 are all addressed substantively. Ship.
