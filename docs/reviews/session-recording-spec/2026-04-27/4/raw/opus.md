## Iter-3 Finding Closure

Walked every iter-3 finding against the v4 spec. Source-file references in the spec (`world.ts:720-722`, `world.ts:1694`, `scenario-runner.ts:122-131`/`133`, `history-recorder.ts:127`) all check out.

| Finding | Status | Where verified |
| --- | --- | --- |
| H3-1 single `submitWithResult` wrap | **Yes** | §7.3 + §7.1 step 4 explicitly wrap only `submitWithResult`; rationale cites `world.ts:720-728`. |
| H3-2 mixed-recorder mutex | **Partially** | §7.1 step 2 + §7.2 + §10.2 enforce mutex via `world.__payloadCapturingRecorder` slot — contract correct. **ADR 1 Consequences bullet 2 (line 775) still reads "Both recorders can attach to the same World simultaneously without interference (each subscribes independently and chains the `submit()` wrap)"** — the iter-3 plan called for amending this; v4 didn't. |
| H3-3 `persistedEndTick` | **Yes** | §5.1 type, §5.2 cadence, §7.1 step 6 disconnect, §9.1 incomplete-bundle upper bound all consistent. |
| H3-4 no `WorldHistoryState.commands` widening | **Yes** | §10.1 + §10.2 + §18 add `recordedCommands?: RecordedCommand[]` as new optional field; `commands` stays `CommandSubmissionResult[]`. |
| M3-1 null `initialSnapshot` handling | **Yes** | §10.1 throws `BundleIntegrityError(code: 'no_initial_snapshot')`; §10.2 quickstart commits both `captureInitialSnapshot: true` and `captureCommandPayloads: true`. |
| M3-2 CI gate single rule | **Yes** | §13.5 + §18 say all engine scenarios opted in for v1; §10.3's warning path scoped to user code. |
| M3-3 quickstart sample errors | **Yes** | `await` dropped, `steps:` → `run:`; line 592 explicitly notes synchronous return. |
| L3-1 private `getObservableTick()` | **Yes** | §7.1 step 4 uses `result.tick` directly; cites `world.ts:1694`. |
| L3-2 stale `submitWithResult` flag | **Yes** | §13.1 line 664 no longer mentions the flag. |
| L3-3 §13.4 cross-`b` semantics | **Yes** | §13.4 has within-`b` (warns), cross-`b` (throws), cross-`a` (throws) test cases. |
| L3-4 §13.1 attachment policy | **Yes** | "FileSink defaults to sidecar; explicit `{ sidecar: false }` opts into dataUrl embedding". |
| L3-5 `lastError` type fidelity | **Yes** | §7.1 step 6 wraps arbitrary throws into `SessionRecordingError` subclass. |
| N3-1 `writeAttachment` mutation | **Yes (deferred)** | §8 retains acknowledging comment per iter-3 plan. |
| N3-2 §9.3 cost arithmetic | **Yes (cosmetic)** | Rounded numbers retained per iter-3 plan. |
| Iter-2 holdovers (H-new-1/2/3/6, M-new-1/4, N1) | **Yes** | All transitively closed by the iter-3 fixes above. |

## Remaining issues

1. **ADR 1 Consequences bullet 2 (line 775)** — wording predates the H3-2 mutex restriction. The contract in §7.1/§7.2 is correct and load-bearing; ADR 1's prose is misleading on the multi-recorder rule. One-sentence fix: clarify that default-config `WorldHistoryRecorder` composes freely with `SessionRecorder`, but payload-capturing variants are mutually exclusive (per §7.2).

2. **§10.2 quickstart code sample omits required `world: World<...>` field** (verified at `scenario-runner.ts:107` — `world` is required on `ScenarioConfig`). Not flagged by prior iters but surfaced when ground-truthing the sample. Not blocking — clearly illustrative — but the snippet is cited as the canonical opt-in pattern, so it should at least be plausibly compilable.

Both are wording/sample fixes; neither touches contract, types, or architecture.

## Overall assessment

**Converged — ship after the two-sentence ADR 1 + §10.2 sample wording pass above.** Architecture, type contracts, lifecycle, replay semantics, and CI-gate definition are all stable across iter-3 → iter-4. No new findings; no architectural concerns. Iter-4 is the convergence iteration as predicted.
