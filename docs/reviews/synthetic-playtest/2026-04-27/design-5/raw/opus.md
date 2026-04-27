I'll review iter-5 against the iter-4 findings and check for regressions or new issues. No skill applies — this is a focused design review with explicit context and acceptance bar.

Walking the diff against the four known iter-4 changes plus a fresh end-to-end pass.

## Iter-4 finding verification

**MED 1 (ticksRun docstring) — RESOLVED.** §7 SynthPlaytestResult.ticksRun now has per-case semantics keyed by `K = world.tick - startTick`:
- maxTicks: `K === maxTicks`, ticksRun = K — matches lifecycle (loop runs maxTicks iterations, each completing the post-step increment).
- stopWhen: ticksRun = K — matches "predicate fires post-increment" (step 4 increments before stopWhen check).
- sinkError mid-tick: ticksRun = K-1 — matches "step succeeded, lastError check fails BEFORE increment".
- policyError: ticksRun = K — matches "policy threw before step on tick K+1; world.tick stayed at startTick + K".
- poisoned: ticksRun = K-1 — matches "failed tick consumes a number per ARCHITECTURE.md, but the increment was skipped".

The opening clause ("invocations that completed AND were followed by a clean recorder.lastError check") is consistent with each per-case formula. No remaining contradiction.

**MED 2 (c-vs-b bump) — RESOLVED.** §14 chain is now T1=v0.7.20 (c), T2=v0.8.0 (b), T3=v0.8.1 (c). ADR 3 explicitly justifies the b-bump on the grounds that union widening breaks downstream `assertNever` exhaustive switches; `b` per AGENTS.md "compile-breaking change" rule. Resets `c` correctly.

**MED 3 (vacuous selfCheck) — RESOLVED.** §7.1 step 0 (new) rejects `snapshotInterval == null && terminalSnapshot === false` at config-validation time. §10 references this explicitly: "§7.1 step 0 configuration validation guarantees at least one segment exists … so the guarantee is non-vacuous for any bundle the harness produces." Sound.

**NIT 1 (§4/§18 symbol order) — RESOLVED.** Both lists give the twelve symbols in identical order: Policy, PolicyContext, StopContext, PolicyCommand, runSynthPlaytest, SynthPlaytestConfig, SynthPlaytestResult, RandomPolicyConfig, ScriptedPolicyEntry, noopPolicy, randomPolicy, scriptedPolicy.

**NIT 2 (generic names) — RESOLVED.** §6.1 noopPolicy now uses TEventMap/TCommandMap/TComponents/TState. §6.2/§6.3 already did. The remaining `<E, C>` shorthand in the §5.3 stateful-policy *user* example is intentional per §5's "Policy<E, C> continues to work for callers who don't care about typed components/state."

**NIT 3 (default-collapse) — RESOLVED.** §6.1, §6.2, §6.3 now omit defaults on TEventMap/TCommandMap (only TComponents/TState retain defaults). §6.1's parenthetical explains why ("would collapse PolicyCommand to never").

## New issues found in iter-5

**NIT.** §7 SynthPlaytestConfig.snapshotInterval docstring: "The harness rejects this combination (see §7.1 step 1)." The validation is at §7.1 step **0** (new), not step 1 (which is "Setup. Caller constructs a World..."). Cross-reference typo introduced when step 0 was inserted ahead of the existing numbering. Other in-doc references are correct (§7.2 uses "step 3" and "step 4"; §10 uses "step 0"). One-character fix.

**NIT.** ADR 5 instructs: "Quote this expression verbatim in §7.1 step 2 and §5.4." §7.1 step 2 quotes the literal `Math.floor(world.random() * 0x1_0000_0000)` verbatim. §5.4 does NOT — it paraphrases as "scaled to a uint32 — see ADR 5 for the literal expression". Either §5.4 should also quote verbatim (matching ADR 5's directive and giving the conceptual section the same anti-drift property), or ADR 5's instruction should be relaxed to "quote in §7.1 step 2; reference from §5.4."

**NIT.** §5 leading paragraph: "Defaults match `World`'s defaults — `Policy<E, C>` continues to work for callers who don't care about typed components/state." After dropping TEventMap/TCommandMap defaults, only TComponents/TState defaults still match World's. The claim "Defaults match World's defaults" is now imprecise — the defaults for the *trailing* two parameters match World; the leading two have no defaults at all. Suggest adjusting prose to "TComponents/TState default to World's defaults — TEventMap/TCommandMap must be specified explicitly to avoid PolicyCommand collapsing to `never`." The example `Policy<E, C>` *does* still work (TS fills TComponents/TState from defaults) — the prose just oversells the symmetry.

## Coherence checks (no findings)

- §5.1 clause 2 ("Positively") — apt; policies are the coordinator, not subject to the no-coordinator rule.
- §7.2 partial-submit: the §7.1-step-4 parenthetical handles the cross-policy partial-submit case (policy[0] submits via array, policy[1] throws); §7.2's example handles the contract-violation case (policy calls submit directly mid-throw). Together they cover both shapes; the validator-rejection note correctly disambiguates the symptom.
- §7.1 step 2 vs §5.4 sequencing: both consistently say the seed-derivation `world.random()` call happens BEFORE `recorder.connect()`, so the recorded initial snapshot reflects post-derivation RNG state. Replay reproduces trivially.
- §14 ADR distribution (T1: 1/2/5; T2: 3/3a/4/6; T3: none) — ADR 5 in T1 is reasonable since T1 ships the PolicyContext.random surface and the seeding contract for built-in policies, even though `runSynthPlaytest` (which constructs the sub-RNG instance) lands in T2. T1 unit-tests for randomPolicy can construct PolicyContext manually with a DeterministicRandom.
- ScriptedPolicyEntry / PolicyCommand both single-generic-on-TCommandMap discriminated unions; structurally consistent.
- Five-value stopReason union matches the five per-case ticksRun explanations.

## Verdict

No BLOCKER/HIGH/MED findings. Three NITs (one cross-reference typo, two prose-precision suggestions). All iter-4 MEDs and NITs are resolved without regression. The b-bump justification is sound, the vacuous-selfCheck guard is well-placed, and ticksRun semantics are now unambiguous.

**ACCEPT**
