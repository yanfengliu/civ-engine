I have all the context needed. Now let me write the iter-3 review.

# Multi-CLI Design Review — Session Recording & Replay Spec, Iter-3

**Date:** 2026-04-27
**Reviewer:** Opus (claude opus xhigh) acting as senior architect
**Method:** Walked every iter-2 finding against the v3 spec; spot-checked engine source for contract claims.

## A. Iter-2 Finding Closure

| #          | Verdict   | Notes |
| ---------- | --------- | ----- |
| CR-new-1   | Closed    | §10 now takes `ScenarioResult` (option (a) from iter-2), exposes `result.name`/`result.checks`/`result.history.initialSnapshot.tick`. Signature is implementable. |
| H-new-1    | Closed    | §7.1 step 4 explicit: "wrapped `submit`/`submitWithResult` is the SOLE writer to `commands.jsonl`. The `onCommandResult` listener is NOT subscribed". Step 2 subscription list confirms `onCommandResult` absent. |
| H-new-2    | Closed    | §7.3 final paragraph: "always replay via `world.submitWithResult()` regardless of which method was originally used... No flag is needed on `RecordedCommand`." Type at §5.1 has no flag. |
| H-new-3    | Closed    | §7.1 step 2 + §7.2 + §12: single SessionRecorder per world, second `connect()` throws `RecorderClosedError(code: 'recorder_already_attached')`. WorldHistoryRecorder remains unrestricted. |
| H-new-4    | Closed    | §7.1 step 6 writes terminal snapshot by default (`terminalSnapshot: true`); §9.3 algorithm comment confirms `(initialSnapshot, terminalSnapshot)` always forms at least one segment in default config. |
| H-new-5    | Closed    | §5.1 wording: "complete, lossless representation **of everything in the JSON shape itself**... Sidecar attachment bytes are referenced by id... and stored externally." Contradiction gone. |
| H-new-6    | **Partially closed** | §11.1 clause 9 is now the unified source: cross-`b` engine throws, within-`b` warns, cross-Node-major warns. §9.1 correctly references "§11.1 clause 9". **But §13.4 test description still says** "Engine version mismatch: bundle with `engineVersion: '0.6.0'` against running 0.7.x — warning via `console.warn` (minor differs); cross-major (0.x → 1.x) throws `BundleVersionError`." Per the unified rule, `0.6.x → 0.7.x` is cross-`b` and must THROW, not warn. The "minor differs warns" wording is the pre-iter-2 model. One sentence fix in §13.4. |
| H-new-7    | Closed    | §7.1 step 2 + §7.2 + §12: `connect()` on poisoned world throws `RecorderClosedError(code: 'world_poisoned')`. Recommended "reject loudly" path adopted. |
| H-new-8    | Closed    | §7.1 step 1 explicit: "prepares listener and wrap *closures* but does NOT install them. The world is not yet observed." Step 2 installs wrap on `connect()`. |
| M-new-1    | Closed    | §7.1 step 5: "FileSink defaults to **sidecar** for any blob... pass `{ sidecar: false }` to force `dataUrl` embedding". MemorySink defaults `dataUrl` under 64 KiB. |
| M-new-2    | Closed    | Subsumed by CR-new-1 fix; `commands` flow through `result.history.commands` once `captureCommandPayloads: true` is set. |
| M-new-3    | Closed    | §10.1: `metadata.startTick ← result.history.initialSnapshot?.tick ?? 0`. Hardcoded-zero is gone. |
| M-new-4    | Closed    | §10.2 commits `captureCommandPayloads: boolean` to `WorldHistoryRecorder`. §13.5 ties CI gate to opted-in scenarios. §16 explicitly drops the open question. |
| M-new-5    | Closed    | §7.2 + §12 unified: catch, set `metadata.incomplete = true`, set `recorder.lastError`, mark terminal, listener short-circuits. §11.5 reference deleted. |
| M-new-6    | Closed    | §5.2 explicit cadence: open / per-snapshot / close, atomic rename via `manifest.tmp.json` → `manifest.json`. |
| M-new-7    | Closed    | §9.3 algorithm uses `worldA.onCommandExecution(r => replayExecutions.push(r))`. The non-existent getter is gone; spec confirms "There is no `world.getCommandExecutionResults()` getter — the listener is the only path." |
| M-new-8    | Closed    | §7 explicit: "`captureInitialSnapshot` from v2 has been removed — initial snapshot capture is mandatory." |
| L-new-1    | Closed    | §11.3: divergence types do NOT carry `referencesContractClause`; only `MarkerValidationError` carries `referencesValidationRule`. |
| L-new-2    | Closed    | `metadata.failedTicks?: number[]` in §5.1; §9.1 references `metadata.failedTicks`. |
| L-new-3    | Closed    | §12 + §11.3: `referencesValidationRule` (e.g., `"6.1.entity_liveness"`) attached to `MarkerValidationError`. |
| L-new-4    | Closed    | §9 declares `tickEntriesBetween(fromTick, toTick): SessionTickEntry[]`. |
| N-new-1    | Closed    | §9.1 step 1: candidate set normalized as `[{ tick: bundle.metadata.startTick, snapshot: bundle.initialSnapshot }, ...bundle.snapshots]`. |
| N-new-2    | Closed    | §13.5: "currently lives in `tests/scenario-runner.test.ts` plus any scenarios added in `tests/scenarios/` going forward". |
| N1 holdover | Closed   | §9.1 first bullet: "Incomplete bundles (`metadata.incomplete === true`) are accepted up to `metadata.endTick`". |

**Summary: 24 of 25 fully closed; 1 partially closed (H-new-6, single sentence wording in §13.4).**

## B. New Issues Introduced by v3

### High

**H3-new-1. §7.1 step 4 references a private method `world.getObservableTick()`.** *(real bug)*

§7.1 step 4: "It captures `{ type, data, sequence, submissionTick: world.getObservableTick(), result }`". Verified at `src/world.ts:1275` — `getObservableTick()` is declared `private getObservableTick(): number`. The recorder cannot call it from outside the class. **Fix:** use `result.tick` directly. `CommandSubmissionResult.tick` is already populated by `getObservableTick()` internally (`world.ts:1694` for tick-failure events; same source for submission results), so the recorder reading `result.tick` is exactly equivalent and goes through the legitimate public surface. The duplication of `submissionTick` and `result.tick` on `RecordedCommand` then becomes a deliberate denormalization (cheap accessor) rather than a wrapped-private-call.

**H3-new-2. `scenarioResultToBundle` produces a malformed bundle when `result.history.initialSnapshot === null`.** *(real correctness gap)*

§10.1 line: `initialSnapshot ← result.history.initialSnapshot`. But `WorldHistoryState.initialSnapshot` is typed `WorldSnapshot | null` (`src/history-recorder.ts:41`) and is null whenever the scenario uses `history: { captureInitialSnapshot: false }` (an option that still exists on `WorldHistoryRecorder` per `src/history-recorder.ts:127`; `SessionRecorder` removed it but the underlying recorder kept it). The spec's `SessionBundle.initialSnapshot: WorldSnapshot` is non-optional (§5.1). Result: an opted-out scenario silently produces a bundle whose required `initialSnapshot` field is `null`, which would crash `selfCheck()` step 1 and `openAt()`'s precondition check.

**Fix:** §10 should explicitly state the precondition that `scenarioResultToBundle()` requires `result.history.initialSnapshot !== null` (i.e., scenarios producing replayable bundles must NOT set `captureInitialSnapshot: false`), and either (a) throw a clear error when null is encountered, or (b) declare both `captureCommandPayloads: true` AND `captureInitialSnapshot: true` as the joint requirement in §10.2's quickstart sample. (b) is cleaner; mirrors the captureCommandPayloads commitment.

### Medium

**M3-new-1. §10.2 quickstart code sample has two errors.**

```ts
const result = await runScenario({           // ← runScenario is synchronous (returns ScenarioResult, not Promise)
  name: 'my-scenario',
  setup: ...,
  steps: ...,                                // ← no such field; ScenarioConfig has setup/run/checks (verified src/scenario-runner.ts:102-120)
  checks: ...,
  history: { capacity: Number.MAX_SAFE_INTEGER, captureCommandPayloads: true },
});
```

`await` on a non-Promise is harmless but misleading; `steps:` is wrong (should be `run:`). Doc-level error in a sample that will be copy-pasted into game code. **Fix:** drop `await`, rename `steps` → `run`.

### Low

**L3-new-1. `recorder.lastError: SessionRecordingError | null` may not accurately type all set-paths.** §7.1 step 6 says lastError is set "if `world.serialize()` throws" — the thrown value can be any `Error` (or even non-Error). Implementation will need to wrap arbitrary throws into a `SessionRecordingError` subclass to honor the type. Minor type-fidelity note; either widen the field or commit the wrap policy in the spec.

**L3-new-2. §9.3 cost arithmetic.** "11 × ~900 = ~10000 ticks of replay" — the rounded numbers don't quite multiply. Cosmetic only; the qualitative claim is fine.

### Note

**N3-new-1. `SessionSink.writeAttachment` mutates the descriptor's `ref`.** §8 docs comment: "descriptor.ref is mutated by the sink to reflect chosen storage policy". Mutating an input parameter is unusual; recorder gets the policy back via the AttachmentId, not via the descriptor. Acceptable in v1 (single-recorder restriction means no sharing surprises), but worth flagging as a mild API smell. Future readers will be confused by a sink method that mutates a parameter.

## C. Remaining Real Issues at Any Severity

All listed in A and B above. Nothing additional surfaced from the engine cross-check (`world.ts`, `scenario-runner.ts`, `history-recorder.ts`, `serializer.ts`).

The architecture and contracts are sound. All open items are wording fixes or sample-code corrections.

## Overall Assessment

**Converged — ship after a small wording-fix pass.** Iter-2 yielded one residual loose end (H-new-6 in §13.4: a single test-description sentence still uses pre-iter-2 version semantics) plus three new spec-text issues introduced by v3 (H3-new-1 private-method reference, H3-new-2 nullable initialSnapshot in scenario adapter, M3-new-1 quickstart sample errors). All are paragraph-or-less fixes; none require architectural changes.

Recommended single revision pass to v4:

1. §13.4 — change "minor differs warns" line to "within-`b` differs warns" and split into two test cases: `0.7.5 → 0.7.8` warns (within-`b`); `0.6.0 → 0.7.x` throws (cross-`b`); cross-`a` throws.
2. §7.1 step 4 — replace `world.getObservableTick()` with `result.tick`.
3. §10 — declare `scenarioResultToBundle()` precondition: `result.history.initialSnapshot !== null` (i.e., scenarios producing replayable bundles must keep the default `captureInitialSnapshot: true`); §10.2 sample updated accordingly.
4. §10.2 sample — drop `await`; rename `steps:` → `run:`.
5. (Optional) §7 — note `lastError` wraps arbitrary throws into a `SessionRecordingError` subclass.

After these, the spec is ready for `writing-plans`. Two-reviewer convergence has been strong throughout; iter-4 should be a quick verification pass rather than a substantive review.
