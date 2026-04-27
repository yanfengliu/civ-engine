# Spec 3 — Design iter-6 Review Synthesis

**Iteration:** 6
**Date:** 2026-04-27
**Subject:** v6 (commit d149469)
**Reviewers:** Codex (2 MED), Opus (ACCEPT, 2 optional NITs).

**Verdict:** Mixed — Opus ACCEPTed; Codex flagged 2 MED. Per AGENTS.md, not yet at convergence. v7 closes both. Codex's findings are real undefined-behavior gaps, not nitpicks.

## Codex MEDs

### [MED] M-STOPONPOISONED — `stopOnPoisoned: false` has no defined behavior

§7's config comment says `stopOnPoisoned: false` makes the harness "try to continue past the failure (which will throw, so this is rarely useful)." But §7.1/§7.2 only define the finalize-on-`'poisoned'` path. Engine semantics: a thrown tick poisons the world; subsequent `step()` calls just throw again until `world.recover()`, which the harness has no hook for. The option is undefined-at-implementation-time.

**Fix:** remove `stopOnPoisoned` from `SynthPlaytestConfig` entirely. Harness always stops on poison (the only sensible behavior). Update §7 (drop field), §7.1 step 4 (drop conditional), §12 (drop the `stopOnPoisoned: false` test case).

### [MED] M-SELFCHECK-PRESTEP — `selfCheck` guarantee overclaim on pre-step abort

§10 says "every successfully-constructed harness bundle has at least the (initial, terminal) segment" — non-vacuous. But for **pre-step abort cases** (policy throws on tick 1 before any step completed), the terminal snapshot writes at the same tick as the initial snapshot, producing a zero-length segment. `selfCheck` validates no transition.

The cases:
- Policy throws on the very first tick (no `step()` ever ran).
- `stopWhen` predicate fires on the very first tick — actually no, stopWhen runs post-step, so by then there's at least one segment.
- Edge: even on a 0-`maxTicks` invocation (degenerate but allowed), terminal == initial.

**Fix:** narrow §10 guarantee. Two options:
- (a) Tighten the validation: harness throws if `maxTicks <= 0`. Document that selfCheck is non-vacuous when `ticksRun >= 1`.
- (b) Document that selfCheck is meaningful only over executed transitions; pre-step aborts produce zero-segment bundles where selfCheck returns `ok:true` vacuously. The CI pattern in §10 should advise asserting `result.ticksRun >= 1` before relying on selfCheck.

(b) is more flexible. Harness still rejects `maxTicks <= 0` as a config error. Pre-step policyError is rare but possible; user-side test pattern is `expect(result.ticksRun >= 1 && replayer.selfCheck().ok).toBe(true)`.

**Resolution:** apply (b). §10 narrows the claim. §7 adds `maxTicks > 0` validation. §12 adds an explicit test case for "pre-step policyError → bundle has only initial+terminal-at-tick-0; selfCheck vacuously ok."

## Opus optional NITs (skipped — not blocking)

- N-STARTTICK: define `startTick` near `K = world.tick - startTick`. Cosmetic.
- N-SUCCESSFULLY-CONSTRUCTED: tighten §10 to "every `ok:true` bundle". Pedantic; v7's M-SELFCHECK-PRESTEP rewrite supersedes.

## Action plan for v7

1. M-STOPONPOISONED: drop `stopOnPoisoned` from config. Update §7, §7.1 step 4, §12.
2. M-SELFCHECK-PRESTEP: narrow §10 guarantee; add `maxTicks > 0` validation; §12 covers pre-step policyError vacuous case.

After v7, request iter-7 — should reach convergence.
