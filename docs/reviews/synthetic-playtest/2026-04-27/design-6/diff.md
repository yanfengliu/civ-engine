diff --git a/docs/design/2026-04-27-synthetic-playtest-harness-design.md b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
index d3730fb..77e302f 100644
--- a/docs/design/2026-04-27-synthetic-playtest-harness-design.md
+++ b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
@@ -1,6 +1,6 @@
 # Synthetic Playtest Harness — Design Spec
 
-**Status:** Draft v5 (2026-04-27). Awaiting iter-5 multi-CLI review. Iter-1..4 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..4}/REVIEW.md`. v5 addresses iter-4's 3 MED (ticksRun docstring contradiction, sourceKind c-vs-b bump, vacuous selfCheck on no-segment configs) + 3 NIT (symbol order, generic names, scriptedPolicy default-collapse).
+**Status:** Draft v6 (2026-04-27). Awaiting iter-6 multi-CLI review. Iter-1..5 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..5}/REVIEW.md`. v6 addresses iter-5's 3 MED (leftover c-bump paragraph, incomplete vacuous-selfCheck guard — fixed by removing `terminalSnapshot` from config; policy submission model contradiction in §7.2 partial-submit) + 4 NIT.
 
 **Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).
 
@@ -100,7 +100,7 @@ Plus three additive changes to the merged session-recording subsystem:
 
 A policy is a function (or stateful class with a method) that, given a context, returns the commands to submit *before* `world.step()` advances the world.
 
-The four generic parameters mirror `World<TEventMap, TCommandMap, TComponents, TState>` so policies retain typed access to components and resource state. Defaults match `World`'s defaults — `Policy<E, C>` continues to work for callers who don't care about typed components/state.
+The four generic parameters mirror `World<TEventMap, TCommandMap, TComponents, TState>` so policies retain typed access to components and resource state. `TComponents` and `TState` carry `World`-matching defaults (`Record<string, unknown>`), so callers who don't care about typed components/state can write `Policy<E, C>` and TypeScript fills the trailing two from defaults. `TEventMap` and `TCommandMap` deliberately have no defaults — empty-record defaults would collapse `PolicyCommand` to `never`, making the policy uncallable for any non-trivial command map; callers infer or specify these explicitly.
 
 ```ts
 import type { ComponentRegistry } from './world.js';
@@ -199,7 +199,7 @@ Stateful policies must keep their state JSON-clean and seeded from `ctx.random()
 
 The harness owns a `DeterministicRandom` instance distinct from `world.rng`. `PolicyContext.random()` and `StopContext.random()` are bound to this instance. Properties:
 
-- **Seeded.** `SynthPlaytestConfig.policySeed?: number` (default: derived at harness construction from a single `world.random()` call, scaled to a uint32 — see ADR 5 for the literal expression). The single seed-derivation call to `world.random()` happens BEFORE `recorder.connect()`, so the captured initial snapshot reflects the post-derivation `world.rng` state. Replay reproduces this trivially.
+- **Seeded.** `SynthPlaytestConfig.policySeed?: number` (default: derived at harness construction from a single `world.random()` call, scaled to a uint32 via `Math.floor(world.random() * 0x1_0000_0000)` — see ADR 5). The single seed-derivation call happens BEFORE `recorder.connect()`, so the captured initial snapshot reflects the post-derivation `world.rng` state. Replay reproduces this trivially.
 - **Independent of world RNG.** Calling `ctx.random()` doesn't advance `world.rng`. Replay re-executes the recorded commands and `world.step()`; `world.rng` evolves identically because policies didn't perturb it.
 - **Stored in metadata.** `SessionMetadata.policySeed?: number` is populated for synthetic bundles. Replay doesn't use it (commands are recorded directly), but the seed is preserved so future replay-via-policy work has it.
 
@@ -334,17 +334,19 @@ export interface SynthPlaytestConfig<
    */
   stopOnPoisoned?: boolean;
   /**
-   * Recorder snapshotInterval; passed through. Default: 1000. Setting this to `null`
-   * disables periodic snapshots — combined with `terminalSnapshot: false` this would
-   * leave the bundle with only the initial snapshot, making `selfCheck()` return
-   * `ok: true` vacuously over zero segments. The harness rejects this combination
-   * (see §7.1 step 1).
+   * Recorder snapshotInterval; passed through. Default: 1000. May be `null` to disable
+   * periodic snapshots — the harness always captures a terminal snapshot regardless,
+   * so the bundle still has the (initial, terminal) segment for selfCheck.
    */
   snapshotInterval?: number | null;
-  /** Recorder terminalSnapshot; passed through. Default: true. */
-  terminalSnapshot?: boolean;
 }
 
+// Note: `terminalSnapshot` is intentionally NOT exposed as a config option. The
+// harness always passes `terminalSnapshot: true` to `SessionRecorder` so every
+// produced bundle has at least the (initial, terminal) segment. Any synthetic
+// playtest needs that segment for `SessionReplayer.selfCheck()` to be meaningful;
+// allowing the option would re-introduce the vacuous-segment case.
+
 export interface SynthPlaytestResult<
   TEventMap extends Record<keyof TEventMap, unknown>,
   TCommandMap extends Record<keyof TCommandMap, unknown>,
@@ -391,10 +393,9 @@ export function runSynthPlaytest<
 
 ### 7.1 Lifecycle
 
-0. **Configuration validation.** Before any side effects, the harness validates the config. If `snapshotInterval == null && terminalSnapshot === false`, throw a `RangeError` (or a dedicated `SynthPlaytestConfigError`) — that combination would produce a bundle with only the initial snapshot, over which `SessionReplayer.selfCheck()` walks zero segments and returns `ok: true` vacuously. Either snapshotting periodically or capturing a terminal snapshot is required so the §10 selfCheck guarantee remains meaningful.
 1. **Setup.** Caller constructs a `World`, registers components/handlers/validators/systems. The harness does NOT do this — game-specific setup is the caller's responsibility (mirrors `runScenario`).
 2. **Sub-RNG init.** Harness computes `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)` (the literal expression — see ADR 5). Constructs a private `DeterministicRandom` from this seed. The single default-derivation `world.random()` call advances `world.rng` once BEFORE `recorder.connect()` — so the recorded initial snapshot captures the post-derivation RNG state. Replay reproduces this trivially.
-3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot, sourceLabel, sourceKind: 'synthetic', policySeed })`. Calls `recorder.connect()`. **Then immediately checks `recorder.lastError`** — if set (initial-snapshot or `sink.open()` failure), the harness PROPAGATES the error rather than fabricating a bundle: it calls `recorder.disconnect()` best-effort and re-throws `recorder.lastError`. The recorder may not have produced an initial snapshot at this point, so a returned `bundle` could not be coherent. The caller handles this similarly to `RecorderClosedError({ code: 'world_poisoned' })` propagation. (See §7.2 connect-time failure path.)
+3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot: true, sourceLabel, sourceKind: 'synthetic', policySeed })` — `terminalSnapshot` is hardcoded to `true` so every bundle has the (initial, terminal) segment for selfCheck. Calls `recorder.connect()`. **Then immediately checks `recorder.lastError`** — if set (initial-snapshot or `sink.open()` failure), the harness PROPAGATES the error rather than fabricating a bundle: it calls `recorder.disconnect()` best-effort and re-throws `recorder.lastError`. The recorder may not have produced an initial snapshot at this point, so a returned `bundle` could not be coherent. The caller handles this similarly to `RecorderClosedError({ code: 'world_poisoned' })` propagation. (See §7.2 connect-time failure path.)
 4. **Tick loop.** For each tick from `world.tick` up to `world.tick + maxTicks`:
     - Build `policyCtx = { world, tick: world.tick + 1, random: subRng.random.bind(subRng) }`.
     - For each policy in `policies` array:
@@ -414,7 +415,7 @@ export function runSynthPlaytest<
 - **Connect-time sink failure.** `recorder.connect()` does NOT throw on initial-snapshot/`sink.open()` failure — it flips `_connected:true`, stores the error in `recorder.lastError`, and marks itself terminal. The harness checks `recorder.lastError` immediately after `connect()` returns (see §7.1 step 3). On detection: best-effort `recorder.disconnect()`, then **re-throw `recorder.lastError`**. The recorder may not have persisted an initial snapshot at this point, so there's no coherent bundle to return — propagating the error matches the existing world-poisoned-at-start convention. `'sinkError'` as a `stopReason` value is reserved for **mid-tick** sink failures only, where at least the initial snapshot was written and the partial bundle is meaningful.
 - **Mid-tick sink failure.** `recorder.lastError` may be set during a tick's writes (e.g., disk full). The harness MUST check this after `world.step()` (see §7.1 step 4) and break with `stopReason: 'sinkError'`, then call `recorder.disconnect()` (which short-circuits because `_terminated` is already set) and return `{ bundle, ticksRun, stopReason, ok: false }`.
 - **Policy throws.** Harness catches, sets `stopReason: 'policyError'`, populates `policyError: { policyIndex, tick, error }`, calls `recorder.disconnect()`, returns `{ bundle, ticksRun, stopReason, ok: true }`. **`bundle.failures` is NOT modified** — the world isn't poisoned, no `TickFailure` is synthesized. Callers reading `result.policyError` get the actionable info.
-- **Partial submit before policy throw.** A policy may call `world.submitWithResult` for command A, then throw on attempting command B. The recorder's wrap captures command A; the harness aborts before `world.step()`. The bundle has a command entry in `commands.jsonl` with no matching `executions` entry for that tick. `selfCheck` won't replay across the abort point so the orphan is benign; `result.policyError` carries the diagnostic. (Note: a `commands.length > executions.length` shape is also produced by validator-rejected commands during normal runs — the gap alone is not specific to policy throws; `result.policyError` is the authoritative signal.)
+- **Composed-policy partial submit.** When `policies.length > 1` and `policies[i]` throws after `policies[0..i-1]` returned commands, the harness has already submitted those earlier commands to the world via `world.submitWithResult` (per the per-policy submit pattern in §7.1 step 4). They appear in `bundle.commands` for the failing tick. `world.step()` never ran for that tick, so the failing tick has commands without matching executions. `selfCheck` doesn't replay across the abort point — the orphan is benign; `result.policyError` carries the actionable info. (A `commands.length > executions.length` shape is also produced by validator-rejected commands during normal runs — the gap alone is not specific to policy throws; `result.policyError` is the authoritative signal.)
 
 ### 7.3 Determinism
 
@@ -484,7 +485,7 @@ expect(replayer.selfCheck().ok).toBe(true);
 
 Per spec §13.5 of the session-recording design (CI gate), every synthetic playtest in the engine's test corpus should pass `selfCheck` — same gate that scenario bundles use.
 
-`selfCheck` only proves replay-determinism over the segments between snapshots. The harness's §7.1 step 0 configuration validation guarantees at least one segment exists (either by periodic snapshotting or by capturing a terminal snapshot), so the guarantee is non-vacuous for any bundle the harness produces.
+`selfCheck` only proves replay-determinism over segments between snapshots. The harness always captures a terminal snapshot at `disconnect()` time (`terminalSnapshot: true` is hardcoded — see §7.1 step 3), so every successfully-constructed harness bundle has at least the (initial, terminal) segment. The guarantee is non-vacuous for any bundle the harness produces.
 
 For **production-determinism** verification (re-running produces the same bundle), the test pattern is two harness calls with identical config, then `expect(bundle1.commands).toEqual(bundle2.commands)` and the same for snapshots / events. §12 covers this.
 
@@ -553,7 +554,7 @@ Plan structure (3 commits, docs folded into the commits that introduce the API):
 - **T2 (v0.8.0)** — **`b`-bump because the public type surface widens (breaking)**. `SessionMetadata.sourceKind` widens from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'` (ADR 3 — would break downstream `assertNever` exhaustive switches). The `b`-bump consumes the entire breakage at once. Other changes ride along as additive: `SessionRecorderConfig` gains optional `sourceKind?` and `policySeed?`, `SessionMetadata.policySeed?` is added, and `runSynthPlaytest` + `SynthPlaytestConfig` + `SynthPlaytestResult` ship. Tests cover lifecycle + each stop reason + each failure mode + composition external-ordering. Doc surface: full `docs/api-reference.md` updates for `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, plus updated sections for `SessionRecorderConfig` and `SessionMetadata`. New `docs/guides/synthetic-playtest.md`. `docs/guides/session-recording.md` extension. ADRs 3, 3a, 4, 6 land here.
 - **T3 (v0.8.1)** — `c`-bump (additive). Determinism integration tests (synthetic bundle round-trips through `SessionReplayer.selfCheck`; production-determinism dual-run test; sub-RNG negative-path test per §12). Architecture docs: `docs/architecture/ARCHITECTURE.md` Component Map + drift-log entry. Roadmap status update. No new ADRs in T3.
 
-`SessionMetadata.sourceKind` widening is type-additive — existing producers and consumers continue to work; no engine-internal consumer branches on the field. `c`-bump rather than `b`-bump per ADR 3 (with explicit acknowledgement of downstream `assertNever`-style breakage).
+`SessionMetadata.sourceKind` widening would break downstream `assertNever`-style exhaustive switches over the union, so per AGENTS.md ("Whenever you introduce a breaking change, bump `b` and reset `c`") T2 is a `b`-bump. The other T2 changes (`SessionRecorderConfig.sourceKind?`, `SessionRecorderConfig.policySeed?`, `SessionMetadata.policySeed?`) are additive but ride along on the same `b`-bump. ADR 3 captures the trade-off.
 
 ## 15. Architectural Decisions
 
@@ -641,5 +642,5 @@ If batch semantics are genuinely needed (one policy's output influencing another
 - Test coverage: ≥1 test per built-in policy + harness lifecycle + each stop reason + each failure mode + 1 selfCheck round-trip + 1 production-determinism dual-run + 1 sub-RNG isolation positive test + 1 sub-RNG negative-path test (policy calls `world.random()` → `selfCheck.ok === false`) + 1 composition external-ordering test.
 - All four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
 - §13 doc updates land in the same commits as the code that introduces each surface.
-- Multi-CLI design review and code review reach convergence (this iteration is iter-2 of design review).
+- Multi-CLI design review and (separately) code review reach convergence — reviewers nitpick rather than catching real issues, per AGENTS.md.
 - Branch is rebase-clean against `main` and ready for explicit user merge authorization.
