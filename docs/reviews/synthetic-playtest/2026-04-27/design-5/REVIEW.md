# Spec 3 (Synthetic Playtest Harness) — Design iter-5 Review Synthesis

**Iteration:** 5
**Date:** 2026-04-27
**Subject reviewed:** `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v5 (commit 054d597)
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh).

**Verdict:** Mixed — Opus ACCEPT (3 NITs only), Codex 3 MED + 2 NIT. Per AGENTS.md ("Continue iterating until reviewers nitpick instead of catching real bugs"), v5 is not yet at convergence: Codex caught three real bugs/contradictions in v5 that Opus missed in its top-down "did the announced changes land" pass. v6 fixes them and runs iter-6.

---

## Iter-4 fixes verified landed (Opus's pass)

All six iter-4 items resolved:
- M-DOC-TICKS: `ticksRun` per-case docstring matches lifecycle. ✓
- M-VERSION: T1=v0.7.20 c, T2=v0.8.0 b, T3=v0.8.1 c. ✓
- M-SELFCHECK: §7.1 step 0 validates the most pathological config. ✓ (but see Codex MED-2 below — incomplete)
- NIT-1/2/3: symbol order, generic names, default-collapse. ✓

---

## New findings (Codex's fresh end-to-end pass)

### [MED] M-VERSION-LEFTOVER — §14 closing paragraph still says `c`-bump

Codex caught a leftover paragraph at the end of §14 that still says "c-bump rather than b-bump per ADR 3 (with explicit acknowledgement of downstream assertNever-style breakage)." The bullets correctly say T2=v0.8.0 / b-bump, but the closing paragraph contradicts them.

**Fix:** delete or rewrite the leftover paragraph. §14 should be internally consistent — every line says T2 is a `b`-bump.

### [MED] M-SELFCHECK-INCOMPLETE — Validation rule covers only one of three vacuous-segment cases

§7.1 step 0 rejects `snapshotInterval == null && terminalSnapshot === false`. But selfCheck is also vacuous in two other cases that v5's validation does NOT catch:
1. `terminalSnapshot: false` + `snapshotInterval: N` + `maxTicks < N` — first periodic snapshot never fires, no terminal, 0 segments.
2. `terminalSnapshot: false` + early `stopWhen` / `policyError` / `poisoned` stop before first periodic snapshot — same shape.

**Fix:** the cleanest move is to remove `terminalSnapshot` from `SynthPlaytestConfig` entirely — synthetic playtests always need a terminal snapshot for selfCheck to be meaningful. The harness always passes `terminalSnapshot: true` to `SessionRecorder`. This eliminates the entire class of vacuous-segment configurations in one stroke. Update §7 (drop the field), §7.1 step 0 (drop the validation rule, since it's no longer needed — `terminalSnapshot` is always true), §10 (note that the harness always captures a terminal snapshot, so segments always exist).

If a use case for `terminalSnapshot: false` ever materializes, a future spec can re-add the option with proper validation.

### [MED] M-POLICY-MODEL — Submission model contradiction (§5.2 vs §7.2 partial-submit)

§5.2 says: "Mutation goes through the returned `PolicyCommand[]` only — those are submitted via `world.submitWithResult` by the harness." This is the contract: policies don't call `submit*` themselves; they return commands.

§7.2 "Partial submit before policy throw" then says: "A policy may call `world.submitWithResult` for command A, then throw on attempting command B" — describing the policy as the agent calling submit. This contradicts §5.2.

The actually-meaningful partial-submit case is the composed-policy one: `policies[0]` returns commands → harness submits them → `policies[1]` throws. `policies[0]`'s commands are recorded; the bundle's tick is incomplete because `world.step()` never ran. §7.1 step 4 correctly references this case ("any commands submitted by earlier-index policies in this tick remain in the bundle").

**Fix:** rewrite §7.2 "Partial submit before policy throw" to describe the composed-policy case instead of the contract-violation case. Concretely: "When composed policies are used and `policies[i]` throws after `policies[0..i-1]` returned commands, the harness has already submitted those earlier commands via `world.submitWithResult`. They appear in `bundle.commands` for the failed tick. `world.step()` never ran for that tick, so no `executions` accompany the orphan commands. selfCheck won't replay across the abort point so this is benign; `result.policyError` carries the actionable info."

(If a policy violates §5.2's contract by calling `world.submitWithResult` directly, that's a contract violation by the policy author. The harness doesn't structurally enforce §5.2 — same way it doesn't enforce "no `Math.random()` in policies." Both are caught by `selfCheck` divergences for any visible side effect, except that direct submission is itself recorded. The spec doesn't need to document the contract-violation path because doing so blurs the contract.)

### [NIT] N-XREF — §7 snapshotInterval docstring cross-reference is wrong

Current doc: "(see §7.1 step 1)". The validation is at step 0 (which I added in v5; existing numbering shifted). Other refs (§7.2's "step 3", "step 4"; §10's "step 0") are correct.

**Fix:** change "step 1" to "step 0" (or remove since the validation is being removed entirely per M-SELFCHECK-INCOMPLETE).

### [NIT] N-IT-COUNT — §18 says "this iteration is iter-2" but doc is iter-5

Stale text from a much earlier revision.

**Fix:** drop the "this iteration is iter-N" mention from §18 entirely (it's status-tracking fluff that drifts).

### Opus also raised 3 NITs

- **Opus N-XREF** (same as Codex N-XREF): §7 snapshotInterval docstring cross-references step 1; should be step 0. Same fix.
- **Opus N-VERBATIM**: ADR 5 says "Quote this expression verbatim in §7.1 step 2 and §5.4" — §7.1 step 2 does, §5.4 paraphrases. Either §5.4 quotes verbatim or ADR 5's directive is relaxed.
- **Opus N-DEFAULTS**: §5 leading paragraph "Defaults match `World`'s defaults" is now imprecise after dropping TEventMap/TCommandMap defaults. Adjust prose to clarify only TComponents/TState carry defaults.

---

## Action plan for v6

1. **M-VERSION-LEFTOVER**: clean §14 closing paragraph.
2. **M-SELFCHECK-INCOMPLETE**: remove `terminalSnapshot` from `SynthPlaytestConfig`; harness forces true; drop §7.1 step 0 validation; update §10 / §13 / §18 accordingly.
3. **M-POLICY-MODEL**: rewrite §7.2 partial-submit to describe the composed-policy case.
4. **N-XREF**: remove the cross-reference (since the validation is going away).
5. **N-IT-COUNT**: drop iter-N tracking fluff from §18.
6. **N-VERBATIM**: §5.4 quotes the literal seed expression verbatim.
7. **N-DEFAULTS**: §5 prose adjusted.

After v6, request iter-6. Both reviewers should converge to ACCEPT.
