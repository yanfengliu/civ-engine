# Spec 5 (Counterfactual Replay) Implementation Iter-1 Review

**Date:** 2026-04-30
**Iteration:** impl-1 → produces impl-2
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (both reviewers convergent)

## Convergent (real, all addressed)

### M1 — `src/version.ts` ENGINE_VERSION still 0.8.11; README badge stale
package.json bumped to 0.8.12 but `src/version.ts` exported `ENGINE_VERSION = '0.8.11'`. SessionRecorder writes ENGINE_VERSION into bundle metadata, so v0.8.12 recordings would still identify as engine 0.8.11. README badge also stale.

**Fix:** `src/version.ts` and README badge bumped to 0.8.12.

### M2 — Identity replace counted as `commandsChanged`
v1 unconditionally counted `replace()` as changed, even when the replacement payload was structurally identical to the original. Violates the documented `commandsChanged` contract ("differing payload OR result") and produces false divergence for no-op identity substitutions.

**Fix:** Replaced and preserved entries both go through `commandsEquivalent` — count as changed iff structurally different.

### M3 — `commandsEquivalent` too narrow
Only compared `result.accepted` and `result.code`. Two rejected commands with different `message`/`details`/`validatorIndex` (different validator outcomes) would be reported equivalent.

**Fix:** Widened to compare `accepted`/`code`/`message`/`details`/`validatorIndex`. Sequence and tick remain excluded (per-recorder).

### M4 — Overlap end uses source.persistedEndTick instead of min of both
`forkAt(3).run({ untilTick: 5 })` on a longer source counted source commands/events at ticks > 5 as divergence even for a no-substitution fork.

**Fix:** Overlap end = `min(source.persistedEndTick, fork.persistedEndTick)`.

### M5 — Stale public docs
`docs/api-reference.md` had no `forkAt`/`ForkBuilder`/`Divergence`/`diffBundles` sections. `docs/guides/session-recording.md` still claimed counterfactual replay was a future spec.

**Fix:** New "Counterfactual Replay / Fork (v0.8.12+)" section in api-reference.md (forkAt method on SessionReplayer interface + full type surface). New "Counterfactual replay (v0.8.12+)" section in session-recording.md with usage example. "Future spec" claim removed.

### M6 — `src/session-fork.ts` 756 LOC > 500-LOC limit
Pure spec gate violation per AGENTS.md "Code review Aspect 4."

**Fix:** Extracted `computeInlineDivergence` + helpers to `src/session-fork-divergence.ts` (182 LOC). Extracted shared `commandsEquivalent`/`eventsEquivalent`/`deepStructuralEqual` to `src/session-bundle-equivalence.ts` (62 LOC; was duplicated across two modules). session-fork.ts now 498 LOC.

## Claude-only MEDIUMs (real, all addressed)

### M7 — Dead code: `_internal_consumeQueue` / `_internal_markConsumed`
Vestigial scaffolding from the iterative plan; never called by `run()`.

**Fix:** Removed.

### M8 — `hydrateAtTick` returns wrong proxy for ticks outside bundle range
For a fork bundle whose `startTick = 6`, the function returned the fork's `initialSnapshot` (at tick 6) when asked to hydrate at submissionTick 0. The state-diff fold then compared apples-to-oranges, producing misleading deltas at non-overlap ticks.

**Fix:** State-diff fold restricted to `[max(a.startTick, b.startTick), min(a.persistedEndTick, b.persistedEndTick) - 1]` (overlap range only). Non-overlap ticks are reported via command/event deltas only (sourceOnly/forkOnly), not state diffs.

### M9 — Helper duplication across modules
Identical bodies of `commandsEquivalent`/`eventsEquivalent`/`deepStructuralEqual` existed in both session-fork.ts and session-bundle-diff.ts (~80 LOC redundancy). Drift risk.

**Fix:** Extracted to `src/session-bundle-equivalence.ts` (62 LOC); both consumers import from there.

### MINOR — `Math.min(...keys())` argument-count cap (~65K on V8)
For long captures, this is a latent throw.

**Fix:** Replaced with explicit `for…of` loop in both modules.

## Pre-existing breach (acknowledged, deferred)

### `src/session-replayer.ts` over 500 LOC
Pre-existing breach: 516 LOC at main~12 (well before this work). The +30-LOC forkAt method took it to 548. Refactor to move the body to `createForkBuilder` (free function in session-fork.ts) reduces the worsening to +18 (net 534). Full sub-500 resolution would require unrelated cleanup; deferred to a separate commit.

## Verified clean (no action needed)

| Item | Verified |
|---|---|
| Equivalence invariant (Step 7) | ✓ no-substitution fork ≡ source slice across `[10, 20, 50]`-step bundles + edge ticks |
| applyTickDiff entity destroy-then-create | ✓ produces gen+1 (matches `EntityManager.destroy + create`) |
| Substitution mechanism | ✓ uses `world.submitWithResult()` through recorder wrap; sequence read from result |
| applyTickDiff internal | ✓ NOT exported from src/index.ts |
| Recorder lifecycle | ✓ connect()/disconnect() preserved; `submitWithResult` wrap timing unchanged |
| openAt preconditions | ✓ same errors with same details codes; forkAt inherits via direct delegation |
| ForkBuilder conflict rules | ✓ enforced synchronously; single-use via `_consumed` flag set BEFORE potentially-throwing work |
| `MemorySink({ allowSidecar: true })` default | ✓ matches ADR 5 / runAgentPlaytest pattern |
| CommandSequenceMap shape | ✓ preserved + replaced + inserted + dropped all populated |
| diffBundles symmetry/asymmetry | ✓ verified via tests |
| Doc artifacts | ✓ all required documentation updated |
| No breaking surface | ✓ purely additive; c-bump appropriate |

## Process notes for impl-2 reviewer

- 13 findings addressed across this iteration. Diff vs impl-1 is mostly: file split + one-line code fixes.
- Verify the 5-module split (session-fork, session-fork-divergence, session-bundle-equivalence, session-bundle-diff, apply-tick-diff) compiles cleanly + tests pass.
- Verify `commandsEquivalent` widening doesn't break the equivalence test (no-substitution fork still passes since both sides come from the same recorder-write path with identical fields).
- Spot-check the overlap-end fix: `forkAt(3).run({ untilTick: 5 })` on a 10-tick source should now report `equivalent: true` for a no-substitution fork (only ticks [3, 4] compared, not [3, 9]).
