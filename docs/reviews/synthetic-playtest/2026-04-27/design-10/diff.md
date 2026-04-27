diff --git a/docs/design/2026-04-27-synthetic-playtest-harness-design.md b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
index 617848a..8de1815 100644
--- a/docs/design/2026-04-27-synthetic-playtest-harness-design.md
+++ b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
@@ -1,6 +1,6 @@
 # Synthetic Playtest Harness — Design Spec
 
-**Status:** Draft v9 (2026-04-27). Awaiting iter-9 multi-CLI review. Iter-1..8 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..8}/REVIEW.md`. v9 addresses iter-8's only finding — Codex caught that `bundle.commands[].submissionSequence` doesn't exist; should be `bundle.commands[].sequence` (the property on `RecordedCommand`). Mechanical fix in 4 sites (§6.4, §12, ADR 6 twice). Opus iter-8 ACCEPT. Trend: 3 MED → 2 MED → 1 MED → 1 MED (mechanical schema-name) across iter-5..8.
+**Status:** Draft v10 (2026-04-27). Awaiting iter-10 multi-CLI review. Iter-1..9 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..9}/REVIEW.md`. v10 addresses iter-9's only finding — Codex caught a 1-tick mismatch between `ScriptedPolicyEntry.tick` (matched against `PolicyContext.tick` = about-to-execute) and bundle's `RecordedCommand.submissionTick` (= world.tick at submit time, one less than executing tick). v10 documents the +1 conversion explicitly, adds a bundle→script regression test to §12. Opus iter-9 ACCEPT. Convergence trend: each round ends with one mechanical correctness finding from Codex; v10 closes Codex's last open issue.
 
 **Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).
 
@@ -269,7 +269,25 @@ The catalog is functions, not data, so commands can reference live world state (
 Plays back a pre-recorded list of `{ tick, type, data }` entries. Useful for regression scenarios derived from real bug bundles.
 
 ```ts
-/** Discriminated union; `type` and `data` are correlated. Depends only on TCommandMap. */
+/**
+ * Discriminated union; `type` and `data` are correlated. Depends only on TCommandMap.
+ *
+ * `tick` is matched against `PolicyContext.tick` (the tick that's about to execute),
+ * NOT against `world.tick` at submit time. Recorded bundles store
+ * `RecordedCommand.submissionTick` (which equals `world.tick` at the moment
+ * `submitWithResult` was called — one less than the executing tick). To derive a
+ * `ScriptedPolicyEntry` sequence from a recorded bundle, use:
+ *
+ *     bundle.commands.map((cmd) => ({
+ *       tick: cmd.submissionTick + 1,
+ *       type: cmd.type,
+ *       data: cmd.data,
+ *     }))
+ *
+ * The +1 conversion is required because `PolicyContext.tick` semantics differ from
+ * `submissionTick` semantics by one step (the former is the tick about to execute;
+ * the latter is the tick during which the command was submitted).
+ */
 export type ScriptedPolicyEntry<TCommandMap> = {
   [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
 }[keyof TCommandMap & string];
@@ -286,6 +304,8 @@ export function scriptedPolicy<
 
 Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the sequence emit nothing.
 
+When deriving a `scriptedPolicy` sequence from a recorded bundle (e.g., for regression playback of a bug session), apply the `+1` conversion documented in `ScriptedPolicyEntry`: bundle `submissionTick` is the tick when `submit*` was called; the corresponding command runs during the *next* `step()` (tick `submissionTick + 1`), and `PolicyContext.tick` exposed to policies is that executing tick. §12 includes a regression test for the bundle→script conversion (record → convert → replay → assert identical command stream).
+
 ### 6.4 Composition
 
 Multiple policies are passed as an array. The harness invokes each in order with the same `PolicyContext`; their command outputs are submitted in policy-array order via `world.submitWithResult`. The order determines `RecordedCommand.sequence` on the bundle's `commands[]` (and the corresponding `submissionSequence` on `executions[]`), both of which the engine increments monotonically.
@@ -505,7 +525,8 @@ Unit / integration tests target:
 - **Built-in policies**:
     - `noopPolicy` returns `[]` always.
     - `randomPolicy` with seed produces deterministic catalog selections; respects `frequency`, `offset`, `burst`. Two runs with same seed produce identical command streams.
-    - `scriptedPolicy` emits the right entry at the right tick; ignores unmatched ticks.
+    - `scriptedPolicy` emits the right entry at the right tick (matched against `PolicyContext.tick` = about-to-execute tick); ignores unmatched ticks.
+    - `scriptedPolicy` bundle→script conversion regression: record a bundle with seeded commands, convert via `bundle.commands.map(c => ({ tick: c.submissionTick + 1, type: c.type, data: c.data }))`, replay through a fresh harness with the scripted policy, assert the resulting bundle has identical command stream (same types, same data, same ticks).
 - **Composition**: multiple policies' outputs are submitted in array order; `bundle.commands[].sequence` is monotonic across composed policies on a given tick, with the order matching the policy-array order (external assertion — ADR 6 explicitly says policies don't observe each other within a tick).
 - **Sub-RNG isolation (positive case)**: a policy that calls `ctx.random()` does NOT advance `world.rng`. Test: record a synthetic bundle, replay via `SessionReplayer.selfCheck()`, expect `ok: true`.
 - **Sub-RNG isolation (negative case)**: a misbehaving policy that calls `world.random()` directly (i.e., violates the §5.4 contract) produces a bundle whose `selfCheck()` returns `ok: false` with state divergence at the first periodic snapshot. This proves the safety net works — a future regression that lets policies perturb `world.rng` would be caught by this test.
