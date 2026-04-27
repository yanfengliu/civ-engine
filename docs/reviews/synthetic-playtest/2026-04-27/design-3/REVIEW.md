# Spec 3 (Synthetic Playtest Harness) — Design iter-3 Review Synthesis

**Iteration:** 3
**Date:** 2026-04-27
**Subject reviewed:** `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v3 (commit cee11a8)
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini still unreachable (quota).

**Verdict:** REJECT (iter-3) but converging fast — re-spin to v4 required for Codex's two HIGHs. Opus ACCEPTed with two NITs and a LOW. Codex flagged two HIGHs Opus missed (it didn't probe `recorder.toBundle()` semantics on connect failure, nor cross-check `World`'s generic signature). Both reviewers converged on the `ticksRun` MED (Opus L-TICKS.1). All findings are mechanical and v4 should land them in one pass; iter-4 review expected to be ACCEPT/ACCEPT.

---

## Convergent finding (both reviewers)

### [MED] ticksRun semantics underspecified — increment placement

Codex iter-3 MED + Opus L-TICKS.1 say the same thing in different framings.

§7.1 step 4 increments `ticksRun` as the last sub-step of each iteration, AFTER the post-step `recorder.lastError` check and `stopWhen` check. Combined with `break-before-increment` on early-stop paths, this leaves a 5-row asymmetry table:

| stopReason | step() ran? | World tick advanced? | ticksRun reported | Match? |
|---|---|---|---|---|
| `maxTicks` | yes (N times) | yes (N) | N | ✓ |
| `stopWhen` (fired after step K) | yes (K times) | yes (K) | K-1 | ✗ |
| `poisoned` (step threw on K) | partial | K-1 (failed tick consumes a number per ARCHITECTURE.md) | K-1 | borderline |
| `sinkError` mid-tick (step ran on K, recorder write failed during it) | yes (K) | yes (K) | K-1 | ✗ |
| `policyError` (policy threw before step K) | no | K-1 | K-1 | ✓ |

A caller asserting `ticksRun === bundle.ticks.length` would fail on stopWhen and sinkError rows.

**Fix:** Move `Increment ticksRun` to immediately AFTER the post-step `recorder.lastError` check, BEFORE the `stopWhen` check. This makes `ticksRun` = "step() invocations that completed without recorder failure", matching the world tick count for normal/stopWhen/sinkError-mid-tick cases. Also document on `SynthPlaytestResult.ticksRun`: "Equal to `world.tick` minus the harness's start tick at termination, except in `policyError` and `poisoned` stops which terminate before/during the step."

---

## Findings only Codex raised (Opus didn't probe these)

### [HIGH] H-CONNECT.1 — Connect-time sink-error path returns `recorder.toBundle()` but no valid bundle exists

§7.1 step 3 + §7.2 connect-time entry say: "if `recorder.lastError` is set after `connect()`, return `{ bundle: recorder.toBundle(), ticksRun: 0, stopReason: 'sinkError', ok: false }`."

Codex's concern: `recorder.lastError` is set precisely when `sink.open()` or the initial snapshot write fails (`src/session-recorder.ts:140-145`). On the failure branch, no initial snapshot was persisted. Both built-in sinks expect at least one snapshot for `toBundle()` to produce something coherent. So the spec describes an API contract that can't be implemented as written.

**Fix:** Match the `world-poisoned-at-start` propagation pattern. The harness propagates the error: it does NOT return a fabricated bundle. Instead:

> If `recorder.lastError` is set after `connect()`, the harness throws the captured error (or a `SynthPlaytestSinkError` wrapping it). The caller handles this similarly to how they'd handle `RecorderClosedError({ code: 'world_poisoned' })` — investigate, maybe `world.recover()` or fix the sink, then retry.

Update §7.1 step 3 + §7.2 connect-time entry. The `'sinkError'` `stopReason` is then reserved for **mid-tick** sink failures only, where the recorder has produced at least the initial snapshot and the partial bundle is meaningful.

### [HIGH] H-GENERICS.1 — Public surface drops `TComponents` / `TState` generics from `World`

`World` is actually `World<TEventMap, TCommandMap, TComponents, TState>` (`src/world.ts:233-238`). The spec types `PolicyContext.world`, `StopContext.world`, `SynthPlaytestConfig.world`, `Policy<TEventMap, TCommandMap>`, and `randomPolicy<TEventMap, TCommandMap>` only over `TEventMap, TCommandMap`. The concrete consequence: `ctx.world.getComponent(...)` returns `unknown` rather than the typed component, and `ctx.world.getState(...)` returns `unknown` rather than the typed state. That's a real ergonomic regression for a policy-authoring surface.

This isn't easy to fix later: widening the policy generics post-release is a public-API breaking change. Better to ship the right shape from the start.

**Fix:** Extend the policy surface to four generics matching `World`:
- `Policy<TEventMap, TCommandMap, TComponents, TState>`
- `PolicyContext<TEventMap, TCommandMap, TComponents, TState>`
- `StopContext<TEventMap, TCommandMap, TComponents, TState>`
- `RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>` (so its catalog functions are typed correctly)
- `SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState, TDebug>`
- `SynthPlaytestResult<TEventMap, TCommandMap, TComponents, TState, TDebug>`

Defaults match `World`'s defaults: `TComponents = Record<string, unknown>`, `TState = Record<string, unknown>`. So `Policy<E, C>` continues to work for callers who don't care about typed components, but `Policy<E, C, MyComps, MyState>` lights up full type-safety for callers who do.

(Note: `PolicyCommand<TCommandMap>` and `ScriptedPolicyEntry<TCommandMap>` only depend on the command map; their generics stay at one parameter.)

`SessionRecorderConfig` is unchanged — it's only 3-generic because the recorder doesn't expose `world` to consumers; the harness does.

---

## Findings only Opus raised

### [NIT] N-SNAPSHOT.1 — ADR 6 "snapshot" wording

ADR 6 says composed policies "receive the same `PolicyContext.world` snapshot at policy-call time." "Snapshot" reads as "frozen copy"; `world` is a live reference (whose private command queue gets mutated by inline submissions). The intended meaning is "the same publicly-observable world state."

**Fix:** Rephrase ADR 6 — "they receive the same `PolicyContext.world` reference, but with no public surface that would expose earlier-policy submissions made during the same tick."

### [NIT] N-FUTURE-SPECS.1 — §17 future specs table out of order

§17 lists future specs as 8, 9, 7, 5. Reorder to 5, 7, 8, 9 for consistency.

---

## Verification of iter-2 fixes (per Opus's table — all confirmed landed)

11/11 iter-2 action items verified. Confirmation table preserved in opus.md raw output. Spot-checks include:
- `seedToUint32` collapse claim at `src/random.ts:46-50`.
- `SessionRecorder.connect()` at `src/session-recorder.ts:140-145` does NOT throw on `sink.open()` failure.
- `World.commandQueue` (line 252) and `nextCommandResultSequence` (line 277) are private.
- `ARCHITECTURE.md:88` "Do not access the queue directly".
- `tests/command-transaction.test.ts:567` precedent matches.
- `src/index.ts:14` `export * from './random.js'`.

---

## Action plan for v4

1. **H-CONNECT.1**: §7.1 step 3 + §7.2 connect-time entry now propagate the error rather than fabricate a bundle. `'sinkError'` is reserved for mid-tick failures only.
2. **H-GENERICS.1**: extend Policy/PolicyContext/StopContext/RandomPolicyConfig/SynthPlaytestConfig/SynthPlaytestResult to 4-generic shape matching `World<TEventMap, TCommandMap, TComponents, TState>`. Defaults preserve current 2-generic ergonomics for callers who don't use typed components/state.
3. **MED ticksRun**: move increment immediately after post-step `recorder.lastError` check; document semantics on `SynthPlaytestResult.ticksRun`.
4. **NIT N-SNAPSHOT.1**: rephrase ADR 6.
5. **NIT N-FUTURE-SPECS.1**: reorder §17.

After v4 lands these, request iter-4 review. Expecting reviewer convergence (no remaining HIGH/MED).
