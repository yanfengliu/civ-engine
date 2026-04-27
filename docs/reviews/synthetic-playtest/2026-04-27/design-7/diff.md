diff --git a/docs/design/2026-04-27-synthetic-playtest-harness-design.md b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
index 77e302f..20cd951 100644
--- a/docs/design/2026-04-27-synthetic-playtest-harness-design.md
+++ b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
@@ -1,6 +1,6 @@
 # Synthetic Playtest Harness — Design Spec
 
-**Status:** Draft v6 (2026-04-27). Awaiting iter-6 multi-CLI review. Iter-1..5 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..5}/REVIEW.md`. v6 addresses iter-5's 3 MED (leftover c-bump paragraph, incomplete vacuous-selfCheck guard — fixed by removing `terminalSnapshot` from config; policy submission model contradiction in §7.2 partial-submit) + 4 NIT.
+**Status:** Draft v7 (2026-04-27). Awaiting iter-7 multi-CLI review. Iter-1..6 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..6}/REVIEW.md`. v7 addresses iter-6's 2 MED (`stopOnPoisoned: false` undefined behavior — fixed by removing the option; selfCheck guarantee overclaim on pre-step abort — narrowed). Iter-6 was Opus-ACCEPT / Codex-2-MED; v7 closes Codex's findings.
 
 **Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).
 
@@ -312,7 +312,7 @@ export interface SynthPlaytestConfig<
   world: World<TEventMap, TCommandMap, TComponents, TState>;
   /** One or more policies. Empty array == noop. */
   policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
-  /** Maximum number of `world.step()` calls. Required. */
+  /** Maximum number of `world.step()` calls. Required. Must be `>= 1` (validated at §7.1 step 1). */
   maxTicks: number;
   /** Optional sink. Default: new MemorySink(). */
   sink?: SessionSink & SessionSource;
@@ -326,13 +326,6 @@ export interface SynthPlaytestConfig<
    * just-executed tick. Default: never stop early.
    */
   stopWhen?: (ctx: StopContext<TEventMap, TCommandMap, TComponents, TState>) => boolean;
-  /**
-   * If true (default), stop the playtest as soon as the world becomes
-   * poisoned. The bundle still records the failed tick. If false, the
-   * playtest tries to continue past the failure (which will throw, so this
-   * is rarely useful).
-   */
-  stopOnPoisoned?: boolean;
   /**
    * Recorder snapshotInterval; passed through. Default: 1000. May be `null` to disable
    * periodic snapshots — the harness always captures a terminal snapshot regardless,
@@ -393,7 +386,7 @@ export function runSynthPlaytest<
 
 ### 7.1 Lifecycle
 
-1. **Setup.** Caller constructs a `World`, registers components/handlers/validators/systems. The harness does NOT do this — game-specific setup is the caller's responsibility (mirrors `runScenario`).
+1. **Setup + validation.** Caller constructs a `World`, registers components/handlers/validators/systems. The harness does NOT do this — game-specific setup is the caller's responsibility (mirrors `runScenario`). The harness validates `maxTicks >= 1` and throws a `RangeError` if not — `maxTicks <= 0` would produce a bundle with terminal == initial, over which `selfCheck()` returns `ok: true` vacuously (see §10).
 2. **Sub-RNG init.** Harness computes `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)` (the literal expression — see ADR 5). Constructs a private `DeterministicRandom` from this seed. The single default-derivation `world.random()` call advances `world.rng` once BEFORE `recorder.connect()` — so the recorded initial snapshot captures the post-derivation RNG state. Replay reproduces this trivially.
 3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot: true, sourceLabel, sourceKind: 'synthetic', policySeed })` — `terminalSnapshot` is hardcoded to `true` so every bundle has the (initial, terminal) segment for selfCheck. Calls `recorder.connect()`. **Then immediately checks `recorder.lastError`** — if set (initial-snapshot or `sink.open()` failure), the harness PROPAGATES the error rather than fabricating a bundle: it calls `recorder.disconnect()` best-effort and re-throws `recorder.lastError`. The recorder may not have produced an initial snapshot at this point, so a returned `bundle` could not be coherent. The caller handles this similarly to `RecorderClosedError({ code: 'world_poisoned' })` propagation. (See §7.2 connect-time failure path.)
 4. **Tick loop.** For each tick from `world.tick` up to `world.tick + maxTicks`:
@@ -401,7 +394,7 @@ export function runSynthPlaytest<
     - For each policy in `policies` array:
         - Call `policy(policyCtx)`. If it throws, set `stopReason: 'policyError'`, populate `policyError`, break the outer loop, finalize via §7.2 policy-throw path. (Note: any commands submitted by earlier-index policies in this tick remain in the bundle; see partial-submit note in §7.2.)
         - For each `PolicyCommand` returned, call `world.submitWithResult(cmd.type, cmd.data)`.
-    - Call `world.step()`. If it throws (poison), check `stopOnPoisoned`; if true, set `stopReason: 'poisoned'`, break, finalize.
+    - Call `world.step()`. If it throws (poison), set `stopReason: 'poisoned'`, break, finalize. (Continuing past a poison would just re-throw on the next `step()` until `world.recover()` — which the harness does not invoke — so always stopping on poison is the only defined behavior.)
     - **Check `recorder.lastError`** — if set (sink failure during the tick's writes), break with `stopReason: 'sinkError'`, finalize.
     - **Increment `ticksRun`** here — `step()` completed without recorder failure, so the tick counts.
     - Build `stopCtx = { world, tick: world.tick, random: subRng.random.bind(subRng) }`.
@@ -485,7 +478,9 @@ expect(replayer.selfCheck().ok).toBe(true);
 
 Per spec §13.5 of the session-recording design (CI gate), every synthetic playtest in the engine's test corpus should pass `selfCheck` — same gate that scenario bundles use.
 
-`selfCheck` only proves replay-determinism over segments between snapshots. The harness always captures a terminal snapshot at `disconnect()` time (`terminalSnapshot: true` is hardcoded — see §7.1 step 3), so every successfully-constructed harness bundle has at least the (initial, terminal) segment. The guarantee is non-vacuous for any bundle the harness produces.
+`selfCheck` only proves replay-determinism over segments between snapshots. The harness always captures a terminal snapshot at `disconnect()` time (`terminalSnapshot: true` is hardcoded — see §7.1 step 3), so the bundle has the (initial, terminal) segment **provided at least one `world.step()` advanced the world**. For runs where the harness aborts before the first successful step (pre-step `policyError` on tick 1, or a connect-time path that returned successfully but had `recorder.lastError` cleared and policy-throw before step), the terminal snapshot writes at the same tick as the initial — a zero-length segment over which `selfCheck()` returns `ok: true` vacuously.
+
+CI-style usage should guard the assertion: `expect(result.ticksRun >= 1 && replayer.selfCheck().ok).toBe(true)`. If `result.ticksRun === 0` (no successful step), the bundle is degenerate for selfCheck purposes; treat the run as a degenerate case (likely a bug in the policy or a misconfiguration). §12 covers this case explicitly.
 
 For **production-determinism** verification (re-running produces the same bundle), the test pattern is two harness calls with identical config, then `expect(bundle1.commands).toEqual(bundle2.commands)` and the same for snapshots / events. §12 covers this.
 
@@ -507,14 +502,16 @@ Unit / integration tests target:
 - **Sub-RNG isolation (positive case)**: a policy that calls `ctx.random()` does NOT advance `world.rng`. Test: record a synthetic bundle, replay via `SessionReplayer.selfCheck()`, expect `ok: true`.
 - **Sub-RNG isolation (negative case)**: a misbehaving policy that calls `world.random()` directly (i.e., violates the §5.4 contract) produces a bundle whose `selfCheck()` returns `ok: false` with state divergence at the first periodic snapshot. This proves the safety net works — a future regression that lets policies perturb `world.rng` would be caught by this test.
 - **Stop conditions**:
-    - `maxTicks` fires after exactly N steps.
+    - `maxTicks` fires after exactly N steps. Validation: `maxTicks <= 0` throws.
     - `stopWhen` fires when predicate returns truthy. `StopContext.tick === world.tick` (post-step).
-    - `stopOnPoisoned` fires after a system throw.
+    - `'poisoned'` fires after a system throw (the harness always stops on poison; `stopOnPoisoned: false` does not exist).
 - **Failure modes**:
     - Poisoned world at start propagates `RecorderClosedError`.
-    - Policy throw → `stopReason: 'policyError'`, `policyError` populated, bundle still returned, `bundle.failures` unchanged.
-    - Partial-submit-then-throw: bundle has commands without matching executions; this is recorded but selfCheck is skipped at the abort point.
-    - Sink write failure → `ok: false`, `stopReason: 'sinkError'`.
+    - Connect-time sink failure: harness re-throws `recorder.lastError`; no bundle returned.
+    - Policy throw mid-run → `stopReason: 'policyError'`, `policyError` populated, bundle still returned, `bundle.failures` unchanged.
+    - Pre-step policy throw on tick 1 → `ticksRun === 0`, bundle has only the initial+terminal-at-tick-0 segment, `selfCheck()` is vacuously `ok:true` (caller must guard with `ticksRun >= 1` per §10).
+    - Composed-policy partial-submit-then-throw: bundle has commands without matching executions for the failed tick; selfCheck doesn't replay across the abort point.
+    - Mid-tick sink write failure → `ok: false`, `stopReason: 'sinkError'`.
 - **Determinism** (the headline use case):
     - **Production-determinism**: two runs with identical config produce structurally-equal bundles (modulo sessionId / recordedAt / marker UUIDs).
     - **Replay-determinism**: `SessionReplayer.selfCheck()` returns `ok: true` on synthetic bundles. This passes regardless of the policy's implementation as long as policies don't perturb world.rng.
