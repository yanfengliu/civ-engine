# Spec 3 (Synthetic Playtest Harness) — Design iter-4 Review Synthesis

**Iteration:** 4
**Date:** 2026-04-27
**Subject reviewed:** `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v4 (commit 0aec042)
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh).

**Verdict:** Not yet ACCEPT — close. Iter-3 fixes verified landed by Opus. Three substantive findings remain (1 from Opus, 2 from Codex), plus 3 NITs from Opus. All mechanical to fix; v5 should converge.

---

## Iter-3 fixes verified landed (Opus's table)

| Iter-3 finding | Status |
|---|---|
| H-CONNECT.1 | ✓ Re-throws on connect-time sink failure |
| H-GENERICS.1 | ✓ 4-generic policy surface throughout |
| L-TICKS.1 | ✓ Increment moved (but introduces contradiction — see MED-1 below) |
| N-SNAPSHOT.1 | ✓ ADR 6 wording cleaned |
| N-FUTURE-SPECS.1 | ✓ §17 reordered |

Codex independently spot-checked the H-CONNECT.1 fix against `src/session-recorder.ts:100-143` and the H-GENERICS.1 fix against `src/world.ts:229,233`. Both confirm.

---

## New findings

### [MED] M-DOC-TICKS — Opus MED-1: `SynthPlaytestResult.ticksRun` docstring contradicts the lifecycle for `sinkError`

§7.1 step 4 increments `ticksRun` AFTER the post-step `recorder.lastError` check (so on mid-tick sink failure, the failing tick doesn't count). The docstring on `SynthPlaytestResult.ticksRun` lumps `'sinkError'` with the cases where `ticksRun === world.tick - startTick`, which is wrong: on mid-tick `'sinkError'`, step succeeded → world.tick advanced, but the increment was skipped → `ticksRun = K-1`, not K.

**Fix:** rewrite the docstring to enumerate per-stop-reason. Concretely:
- `'maxTicks'`: `ticksRun === maxTicks === world.tick - startTick`.
- `'stopWhen'`: `ticksRun === world.tick - startTick` (predicate fires post-increment).
- `'sinkError'` (mid-tick): `ticksRun === world.tick - startTick - 1` (step succeeded but recorder failure detected before increment; failing tick excluded).
- `'policyError'`: `ticksRun === world.tick - startTick` (policy threw before step; world.tick didn't advance on the failing tick).
- `'poisoned'`: `ticksRun === world.tick - startTick - 1` (failed tick consumes a number per ARCHITECTURE.md, but increment is skipped).

Or one summary sentence: "ticksRun = count of `world.step()` invocations that completed AND were followed by a clean `recorder.lastError` check."

### [MED] M-VERSION — Codex MED-1: `sourceKind` widening as `c`-bump contradicts AGENTS.md policy

§14 says T2 ships `sourceKind` widened from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'` as a `c`-bump. ADR 3 acknowledges this is a downstream-`assertNever`-breaking change. AGENTS.md: "Whenever you introduce a breaking change, bump `b` and reset `c`." There's no carve-out for "small breaking change" or "pre-1.0".

**Fix:** restructure §14 versioning. T2 lands the type widening, so T2 becomes the `b`-bump:
- T1: v0.7.20 (purely additive — new Policy types and built-in policies; no engine-internal API changes).
- T2: v0.8.0 (`b` bump because of `SessionMetadata.sourceKind` widening; `SessionRecorderConfig.sourceKind?` and `policySeed?` additions are additive but ride along on the `b` bump).
- T3: v0.8.1.

Update ADR 3 to drop the "we accept the c-bump trade-off" paragraph; replace with "this lands as a b-bump per AGENTS.md."

### [MED] M-SELFCHECK — Codex MED-2: §10/§12 selfCheck guarantee can be vacuously true

`SessionReplayer.selfCheck()` only validates between snapshots. If a caller sets `terminalSnapshot: false` and `snapshotInterval: null` (or `maxTicks < snapshotInterval`, with `terminalSnapshot: false`), there's only the initial snapshot. `selfCheck()` walks zero segments and returns `ok: true` vacuously. The §10 CI pattern's "every synthetic playtest should pass selfCheck" then becomes meaningless for those configurations.

**Fix:** harness validates the configuration. If `snapshotInterval == null && !terminalSnapshot`, the harness throws a configuration error before calling `connect()`. Document this in §7 (validation rule). Alternative: silently force `terminalSnapshot: true` when `snapshotInterval == null`, but explicit-throw is clearer per "errors should be loud."

§10 also gets a sentence noting that `selfCheck` only proves replay-determinism when at least one segment exists — i.e., the validation rule above guarantees this for synthetic playtests.

### [NIT] Opus NIT-1: §4 vs §18 symbol order

§4 lists `Policy, PolicyContext, PolicyCommand, StopContext, …`. §18 lists `Policy, PolicyContext, StopContext, PolicyCommand, …`. Pick one canonical order — easiest to use the order the implementation will export from `src/index.ts`.

### [NIT] Opus NIT-2: `noopPolicy` uses single-letter generics

`noopPolicy<E, C, Comps, S>` should be `noopPolicy<TEventMap, TCommandMap, TComponents, TState>` for consistency with every other declaration.

### [NIT] Opus NIT-3: `scriptedPolicy` default makes the type uncallable with non-empty input

`scriptedPolicy<TCommandMap = Record<string, never>>` makes `ScriptedPolicyEntry<Record<string, never>>` collapse to `never`. The default-generic call site only accepts `[]`. Either drop the default (force inference / explicit type args, matching `randomPolicy`) or use a defaultable shape that doesn't collapse.

**Fix:** drop the defaults for `TEventMap` and `TCommandMap` on `scriptedPolicy` (and `noopPolicy` — same issue): they have no useful default shape that doesn't collapse. Match `randomPolicy`'s pattern.

---

## Action plan for v5

1. **M-DOC-TICKS**: rewrite `SynthPlaytestResult.ticksRun` docstring per-case.
2. **M-VERSION**: §14 restructure to T1=0.7.20, T2=0.8.0, T3=0.8.1; ADR 3 simplified.
3. **M-SELFCHECK**: harness throws on `snapshotInterval==null && !terminalSnapshot`; §10 narrows the guarantee accordingly.
4. **NIT-1**: align §4 and §18 symbol order.
5. **NIT-2**: full generic names in `noopPolicy`.
6. **NIT-3**: drop generic defaults on `noopPolicy` and `scriptedPolicy`.

After v5, request iter-5. If reviewers nitpick only, ACCEPT and move to implementation plan.
