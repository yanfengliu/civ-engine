All engine facts verified:
- `World<TEventMap, TCommandMap, TComponents, TState>` at world.ts:233 ✓
- session-replayer.ts:286: `failedTicks?.some((ft) => ft >= a.tick && ft < b.tick)` — skip is half-open, fails when `failedTick === segmentEnd` ✓
- world.ts:1888 (inside `finalizeTickFailure` starting at 1872): `gameLoop.advance()` runs on non-listener-phase poison, so `world.tick === failedTick` post-poison ✓
- random.ts:50: `Math.trunc(seed) >>> 0` collapses any `[0,1)` to 0 ✓

Tracing the poisoned-bundle replay path with these facts:
- Harness disconnects after poison → recorder.disconnect() at session-recorder.ts:176-184 writes terminal snapshot at `world.tick` (= failedTick) because `_terminated` is only set on sink errors, not tick failures (verified at session-recorder.ts:467-477).
- Last segment becomes `[lastPeriodicK, failedTick]`. Skip check: `failedTick < failedTick` = false → not skipped.
- `_checkSegment` (session-replayer.ts:337-420) wraps `world.step()` only in try/finally for listener cleanup — exceptions propagate. Replay loop hits same poison, throws the same `WorldTickFailureError`. selfCheck propagates it. ✓

§10/§12 changes confirmed:
- §10: "**non-poisoned**" qualifier on the CI gate, CI guard pattern with `result.stopReason !== 'poisoned' && result.ticksRun >= 1`, and the dedicated "Poisoned bundles aren't selfCheck-able" paragraph with the segment-end-at-failedTick reasoning.
- §12: "Poisoned bundle replay" test entry asserts the throw, not `ok`.

§7.3 production-determinism list: `stopOnPoisoned` gone, `snapshotInterval` added with the explanatory parenthetical. ✓

§1: poisoned-world detection split into its own sentence, no longer tucked under "configurable stop conditions". ✓

§7 ticksRun semantics traced through each stopReason — all consistent with the §7.1 step-4 ordering (lastError check → increment → stopCtx → stopWhen).

Internal consistency:
- 12 symbols match between §4 and §18.
- §14 versioning chain 0.7.19 → 0.7.20 (c) → 0.8.0 (b, resets c) → 0.8.1 (c) per AGENTS.md.
- ADR 3a, ADR 5, ADR 6 correctly capture iter-1..6 reviewer fixes that landed.

No remaining BLOCKER/HIGH/MED. Bar met.

ACCEPT.
