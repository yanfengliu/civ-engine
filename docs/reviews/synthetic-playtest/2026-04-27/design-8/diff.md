diff --git a/docs/design/2026-04-27-synthetic-playtest-harness-design.md b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
index 20cd951..acfb0c3 100644
--- a/docs/design/2026-04-27-synthetic-playtest-harness-design.md
+++ b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
@@ -1,6 +1,6 @@
 # Synthetic Playtest Harness — Design Spec
 
-**Status:** Draft v7 (2026-04-27). Awaiting iter-7 multi-CLI review. Iter-1..6 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..6}/REVIEW.md`. v7 addresses iter-6's 2 MED (`stopOnPoisoned: false` undefined behavior — fixed by removing the option; selfCheck guarantee overclaim on pre-step abort — narrowed). Iter-6 was Opus-ACCEPT / Codex-2-MED; v7 closes Codex's findings.
+**Status:** Draft v8 (2026-04-27). Awaiting iter-8 multi-CLI review. Iter-1..7 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..7}/REVIEW.md`. v8 addresses iter-7's 1 MED (selfCheck overclaim on poisoned bundles — replay re-throws because the failed-tick-bounded segment isn't skipped) + 1 LOW (stale `stopOnPoisoned` in §7.3) + 2 cosmetic NITs. Trend: 3 MED → 2 MED → 1 MED across iter-5..7; iter-8 expected to converge.
 
 **Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).
 
@@ -15,7 +15,7 @@ This spec defines an engine-level harness that:
 - Constructs a `World`, attaches a `SessionRecorder`, drives `world.submit()` from a **pluggable policy** for `N` ticks, and saves the resulting `SessionBundle`.
 - Provides built-in policies (random, scripted, no-op) covering the common low-effort cases.
 - Composes multiple policies — useful when different policies drive different command types (e.g., one policy spawns units, another moves them).
-- Supports configurable stop conditions (max ticks, poisoned-world detection, custom predicates).
+- Supports configurable stop conditions (`maxTicks`, custom `stopWhen` predicate). Always stops on a poisoned world (built-in, not configurable — see ADR 4 / §7.1 step 4 rationale).
 - Produces deterministic bundles given identical seed + setup + policies, so a synthetic playtest can be re-run with the same outcome and the produced bundle passes `SessionReplayer.selfCheck()`.
 - Is trivially parallelizable across processes (each playtest is a synchronous self-contained run; multiple instances can run on different cores/machines without shared state).
 
@@ -415,7 +415,7 @@ export function runSynthPlaytest<
 A synthetic playtest is **production-deterministic** if:
 - `world` is freshly constructed with the same seed + same registrations.
 - Same policies (functions or class instances initialized the same way).
-- Same `maxTicks` / `stopWhen` / `stopOnPoisoned` / `policySeed`.
+- Same `maxTicks` / `stopWhen` / `policySeed` / `snapshotInterval` (different snapshot intervals produce structurally different bundles).
 - Identical engine and Node versions (per spec §11.1 clause 9).
 
 Re-running with these inputs produces structurally-equal bundles modulo:
@@ -476,11 +476,19 @@ const replayer = SessionReplayer.fromBundle(result.bundle, {
 expect(replayer.selfCheck().ok).toBe(true);
 ```
 
-Per spec §13.5 of the session-recording design (CI gate), every synthetic playtest in the engine's test corpus should pass `selfCheck` — same gate that scenario bundles use.
+Per spec §13.5 of the session-recording design (CI gate), **non-poisoned** synthetic playtests in the engine's test corpus should pass `selfCheck` — same gate that non-poisoned scenario bundles use.
 
-`selfCheck` only proves replay-determinism over segments between snapshots. The harness always captures a terminal snapshot at `disconnect()` time (`terminalSnapshot: true` is hardcoded — see §7.1 step 3), so the bundle has the (initial, terminal) segment **provided at least one `world.step()` advanced the world**. For runs where the harness aborts before the first successful step (pre-step `policyError` on tick 1, or a connect-time path that returned successfully but had `recorder.lastError` cleared and policy-throw before step), the terminal snapshot writes at the same tick as the initial — a zero-length segment over which `selfCheck()` returns `ok: true` vacuously.
+`selfCheck` only proves replay-determinism over segments between snapshots. The harness always captures a terminal snapshot at `disconnect()` time (`terminalSnapshot: true` is hardcoded — see §7.1 step 3), so the bundle has the (initial, terminal) segment **provided at least one `world.step()` advanced the world**. For runs where the harness aborts before the first successful step (e.g., pre-step `policyError` on tick 1 — connect succeeded with `recorder.lastError === null`, then a policy throws before any `step()`), the terminal snapshot writes at the same tick as the initial — a zero-length segment over which `selfCheck()` returns `ok: true` vacuously.
 
-CI-style usage should guard the assertion: `expect(result.ticksRun >= 1 && replayer.selfCheck().ok).toBe(true)`. If `result.ticksRun === 0` (no successful step), the bundle is degenerate for selfCheck purposes; treat the run as a degenerate case (likely a bug in the policy or a misconfiguration). §12 covers this case explicitly.
+**Poisoned bundles aren't selfCheck-able.** When `stopReason === 'poisoned'`, `world.step()` threw on the failing tick. `SessionReplayer.selfCheck()` skips a segment only when `failedTick < segmentEnd` (`session-replayer.ts:286`); the harness's terminal snapshot bounds the final segment AT the failed tick, so it's NOT skipped. `_checkSegment` replays through `world.step()` and re-throws the same exception. selfCheck propagates the throw — it doesn't return `{ ok: false }`. Poisoned bundles are still useful (load into a viewer, inspect `metadata.failedTicks`, scrub the timeline) but selfCheck is not the right tool. CI guard pattern:
+
+```ts
+if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
+  expect(replayer.selfCheck().ok).toBe(true);
+}
+```
+
+§12 covers this taxonomy: positive selfCheck on non-poisoned bundles + the `ticksRun === 0` vacuous-selfCheck case + a poisoned-bundle test that asserts the throw rather than `selfCheck().ok`.
 
 For **production-determinism** verification (re-running produces the same bundle), the test pattern is two harness calls with identical config, then `expect(bundle1.commands).toEqual(bundle2.commands)` and the same for snapshots / events. §12 covers this.
 
@@ -514,7 +522,8 @@ Unit / integration tests target:
     - Mid-tick sink write failure → `ok: false`, `stopReason: 'sinkError'`.
 - **Determinism** (the headline use case):
     - **Production-determinism**: two runs with identical config produce structurally-equal bundles (modulo sessionId / recordedAt / marker UUIDs).
-    - **Replay-determinism**: `SessionReplayer.selfCheck()` returns `ok: true` on synthetic bundles. This passes regardless of the policy's implementation as long as policies don't perturb world.rng.
+    - **Replay-determinism**: `SessionReplayer.selfCheck()` returns `ok: true` on **non-poisoned** synthetic bundles where `result.ticksRun >= 1`. Passes regardless of the policy's implementation as long as policies don't perturb world.rng.
+    - **Poisoned bundle replay**: a synthetic bundle with `stopReason: 'poisoned'` causes `selfCheck()` to throw the original tick-failure exception during `_checkSegment` (see §10). Test asserts the throw, not `ok`.
     - **Sub-RNG seeded determinism**: omitting `policySeed` works (default derived from `world.random()`); explicit `policySeed: N` reproduces.
 - **Bundle metadata**:
     - `sourceKind: 'synthetic'`.
