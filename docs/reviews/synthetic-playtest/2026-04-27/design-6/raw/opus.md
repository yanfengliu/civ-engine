Reviewing iter-6 against the seven iter-5 findings and looking for new issues.

## Iter-5 finding verification

| Tag | Status |
|---|---|
| M-VERSION-LEFTOVER | ✓ §14 closes with a coherent b-bump justification: "`SessionMetadata.sourceKind` widening would break downstream `assertNever`-style exhaustive switches… T2 is a `b`-bump." No leftover c-bump prose. |
| M-SELFCHECK-INCOMPLETE | ✓ `terminalSnapshot` removed from `SynthPlaytestConfig`. Inline `// Note:` block makes the rationale explicit. §7.1 step 3 hardcodes `terminalSnapshot: true` at recorder construction. §10 still claims "every successfully-constructed harness bundle has at least the (initial, terminal) segment" — now non-vacuous. No leftover step 0. |
| M-POLICY-MODEL | ✓ §7.2 partial-submit now describes the composed-policy case correctly: "When `policies.length > 1` and `policies[i]` throws after `policies[0..i-1]` returned commands, the harness has already submitted those earlier commands…". Cross-refs §7.1 step 4's per-policy submit-then-call-next pattern, which is itself self-consistent. |
| N-XREF | ✓ No "§7.1 step 1" string anywhere in the doc. |
| N-IT-COUNT | ✓ §18 closes with "Multi-CLI design review and (separately) code review reach convergence — reviewers nitpick rather than catching real issues, per AGENTS.md." Iteration-counting language gone. |
| N-VERBATIM | ✓ §5.4 and §7.1 step 2 both quote the literal `Math.floor(world.random() * 0x1_0000_0000)`. ADR 5 also includes it. |
| N-DEFAULTS | ✓ §5 prose: "`TComponents` and `TState` carry `World`-matching defaults… `TEventMap` and `TCommandMap` deliberately have no defaults — empty-record defaults would collapse `PolicyCommand` to `never`…". §6.1 noopPolicy parenthetical reinforces the asymmetry. |

## New issue scan

- **Determinism story checks out.** §7.1 step 2: when `policySeed` defaults, the single `world.random()` call advances `world.rng` from S0→S1 *before* `recorder.connect()`, so the initial snapshot captures S1. Replay applies S1 from snapshot and never re-derives the seed (replay doesn't invoke policies). Bundle round-trips cleanly. When `policySeed` is supplied, no `world.random()` call → snapshot captures S0. Both branches replay-deterministic.
- **`ticksRun` arithmetic.** All five `stopReason` branches in `SynthPlaytestResult` map cleanly to the increment placement in §7.1 step 4 (after step + lastError check, before stopWhen). `'poisoned'` and `'sinkError'` both yield `K-1` for the right reasons: poisoned skips the increment because step threw; sinkError skips it because lastError check breaks first. `'policyError'` correctly yields `K` because the throw happens on tick K+1 *before* step, so world.tick stayed at startTick+K and the prior K iterations all incremented.
- **`ok` semantics consistent.** Per §7.2: poisoned/policyError → `ok:true` (bundle valid up to failure); mid-tick sinkError → `ok:false`. The `bundle` field doc-comment line on `SynthPlaytestResult` matches.
- **Connect-time vs mid-tick sink failure correctly bifurcated.** §7.2 connect-time path re-throws `recorder.lastError` (since no coherent bundle exists); mid-tick path returns `ok:false`. The `stopReason` comment "sinkError is mid-tick only — connect-time sink failure throws" prevents misreading.
- **ADR 6 honest about composition.** Earlier draft's claim of within-tick observation via `commandQueue` is gone; ADR now explicitly says no public surface exposes earlier-policy submissions to later policies in the same tick. §12 tests the right thing (external `submissionSequence` ordering, not within-tick observation).
- **ADR 5 alternative-considered paragraph** correctly identifies why save/restore-around-policy-call doesn't work (composed policies would silently shadow each other's RNG draws).

## Optional NITs (would not block)

- **NIT-STARTTICK**: `SynthPlaytestResult.ticksRun` doc-comment uses `K = world.tick - startTick` without defining `startTick`. Inferable from context (initial `world.tick` at harness invocation), but a one-clause definition would help. Not worth another iteration.
- **NIT-SUCCESSFULLY-CONSTRUCTED**: §10 says "every successfully-constructed harness bundle has at least the (initial, terminal) segment". The qualifier silently excludes the `ok:false` mid-tick-sink-error case (where `disconnect()` short-circuits and may skip the terminal snapshot). Reading is correct but the qualifier is doing quiet work; could be tightened to "every `ok:true` bundle". Pedantic.

## Verdict

ACCEPT.

All three iter-5 MEDs and all five NITs (Codex's 2 + Opus's 3) are addressed cleanly; no new BLOCKER/HIGH/MED issues introduced; the determinism story, lifecycle, and failure-mode taxonomy are internally consistent against the engine facts (private `commandQueue`, `connect()` non-throwing on sink-open failure, `seedToUint32` zero-collapse). Per AGENTS.md convergence criterion — reviewers are now reaching for prose-clarity nits rather than design bugs.
