Reviewing iter-4 against iter-3 findings and the engine facts you provided.

## Iter-3 fixes landing check

| Iter-3 finding | Iter-4 status |
|---|---|
| H-CONNECT.1 (connect-time sink failure must propagate) | **Landed.** §7.1 step 3 + §7.2 connect-time path now re-throw `recorder.lastError` after best-effort `disconnect()`. `'sinkError'` reserved for mid-tick. ✓ |
| H-GENERICS.1 (4-generic policy surface) | **Landed.** `Policy`, `PolicyContext`, `StopContext`, `RandomPolicyConfig`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult` all carry `<TEventMap, TCommandMap, TComponents, TState>` with `ComponentRegistry`-defaulted `TComponents` matching `World<...>`. `PolicyCommand` / `ScriptedPolicyEntry` correctly stay 1-generic. ✓ |
| L-TICKS.1 (increment placement) | **Landed in lifecycle, but introduces a doc inconsistency** — see MED below. |
| N-SNAPSHOT.1 (ADR 6 wording) | **Landed.** ADR 6 now correctly says composed policies do NOT observe each other within a tick (private `commandQueue`/`nextCommandResultSequence`); promises only the externally-observable `submissionSequence` ordering. ✓ |
| N-FUTURE-SPECS.1 (§17 ordering) | **Landed.** Now 5 / 7 / 8 / 9. ✓ |

## New findings

### MED-1 — `ticksRun` docstring contradicts the lifecycle for `sinkError`

§7.1 step 4 places the `ticksRun++` **after** the post-step `recorder.lastError` check, with the explicit rationale "`step()` completed without recorder failure, so the tick counts." On a mid-tick sink failure, `world.step()` returned normally (recorder writes don't throw — engine fact at `session-recorder.ts:140-145` extends to write-time errors), so `world.tick` advanced; the harness then breaks before incrementing `ticksRun`.

The §7 `SynthPlaytestResult.ticksRun` docstring, however, lumps `sinkError` with `maxTicks` / `stopWhen` and asserts `ticksRun === world.tick - startTick`. Walk-through:
- Start: `world.tick=5`, `startTick=5`, `ticksRun=0`.
- Iter 1: step succeeds → `world.tick=6`, `ticksRun=1`.
- Iter 2: step succeeds, `recorder.lastError` set, break with `sinkError` → `world.tick=7`, `ticksRun=1`.
- Doc claims `ticksRun = 7-5 = 2`; actual `ticksRun = 1`. Off by 1.

The verbal description ("step() calls that completed *without recorder failure*") matches the lifecycle, not the formula. Either:
- Move `'sinkError'` into the second sentence's group ("the failing tick is not counted because the recorder failed on it"), or
- Reword the first sentence's formula to subtract 1 for `sinkError`.

This is the doc surface the implementer will encode in tests; the contradiction needs resolution before code lands.

### NIT-1 — Exported-symbol order inconsistent between §4 and §18

§4 lists `Policy, PolicyContext, **PolicyCommand**, **StopContext**, …` while §18 lists `Policy, PolicyContext, **StopContext**, **PolicyCommand**, …`. Pick one canonical order.

### NIT-2 — `noopPolicy` uses single-letter generic names

§6.1 declares `noopPolicy<E, C, Comps, S>` while every other declaration in the spec uses `TEventMap, TCommandMap, TComponents, TState`. Cosmetic; fold during implementation.

### NIT-3 — `scriptedPolicy` defaults make the type uncallable with non-empty input

§6.3 defaults `TCommandMap = Record<string, never>`. The mapped-type expansion makes `data: never`, so `ScriptedPolicyEntry<Record<string, never>>` is uninhabited and the default-generic call site only accepts `[]`. Either drop the defaults (force inference / explicit type args, matching `randomPolicy`) or pick a defaultable shape that doesn't collapse to `never`. Not blocking — most call sites will infer or specify — but worth resolving while the surface is still draft.

## Verdict

**NOT ACCEPT** — MED-1 is a real internal contradiction in a documented API contract that would yield ambiguous test expectations. Once the `ticksRun` docstring is reconciled with the §7.1 lifecycle (one clean edit), iter-5 should converge — the rest is nitpicks.
