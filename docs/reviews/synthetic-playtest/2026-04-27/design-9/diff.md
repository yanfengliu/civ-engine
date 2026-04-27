diff --git a/docs/design/2026-04-27-synthetic-playtest-harness-design.md b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
index acfb0c3..617848a 100644
--- a/docs/design/2026-04-27-synthetic-playtest-harness-design.md
+++ b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
@@ -1,6 +1,6 @@
 # Synthetic Playtest Harness — Design Spec
 
-**Status:** Draft v8 (2026-04-27). Awaiting iter-8 multi-CLI review. Iter-1..7 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..7}/REVIEW.md`. v8 addresses iter-7's 1 MED (selfCheck overclaim on poisoned bundles — replay re-throws because the failed-tick-bounded segment isn't skipped) + 1 LOW (stale `stopOnPoisoned` in §7.3) + 2 cosmetic NITs. Trend: 3 MED → 2 MED → 1 MED across iter-5..7; iter-8 expected to converge.
+**Status:** Draft v9 (2026-04-27). Awaiting iter-9 multi-CLI review. Iter-1..8 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..8}/REVIEW.md`. v9 addresses iter-8's only finding — Codex caught that `bundle.commands[].submissionSequence` doesn't exist; should be `bundle.commands[].sequence` (the property on `RecordedCommand`). Mechanical fix in 4 sites (§6.4, §12, ADR 6 twice). Opus iter-8 ACCEPT. Trend: 3 MED → 2 MED → 1 MED → 1 MED (mechanical schema-name) across iter-5..8.
 
 **Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).
 
@@ -288,11 +288,11 @@ Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the seq
 
 ### 6.4 Composition
 
-Multiple policies are passed as an array. The harness invokes each in order with the same `PolicyContext`; their command outputs are submitted in policy-array order via `world.submitWithResult`. The order determines `submissionSequence`, which the engine respects.
+Multiple policies are passed as an array. The harness invokes each in order with the same `PolicyContext`; their command outputs are submitted in policy-array order via `world.submitWithResult`. The order determines `RecordedCommand.sequence` on the bundle's `commands[]` (and the corresponding `submissionSequence` on `executions[]`), both of which the engine increments monotonically.
 
 **Within a tick, composed policies do NOT observe each other's submissions.** The world's command queue is private and ARCHITECTURE.md forbids direct access; `world.getEvents()` returns the *previous* tick's events; handlers don't fire until `world.step()`. So `policies[1].decide(ctx)` sees the same world state as `policies[0].decide(ctx)`. Earlier-policy submissions become visible to later policies only on the *next* tick (via observable side effects: state changes, emitted events).
 
-The visible-from-outside ordering — `submissionSequence` on `bundle.commands` matches policy-array order — is the property §12 verifies. This is a property of `submitWithResult` ordering, not of policy-side observation.
+The visible-from-outside ordering — `bundle.commands[].sequence` is monotonic across composed policies on a given tick, matching policy-array order — is the property §12 verifies. This is a property of `submitWithResult` ordering, not of policy-side observation.
 
 If you need batch semantics (one policy's output influencing another within the same tick), wrap them in a single composite policy that does the coordination internally and submits the merged result.
 
@@ -506,7 +506,7 @@ Unit / integration tests target:
     - `noopPolicy` returns `[]` always.
     - `randomPolicy` with seed produces deterministic catalog selections; respects `frequency`, `offset`, `burst`. Two runs with same seed produce identical command streams.
     - `scriptedPolicy` emits the right entry at the right tick; ignores unmatched ticks.
-- **Composition**: multiple policies' outputs are submitted in array order; `bundle.commands[].submissionSequence` matches policy-array order across composed policies on a given tick (external assertion — ADR 6 explicitly says policies don't observe each other within a tick).
+- **Composition**: multiple policies' outputs are submitted in array order; `bundle.commands[].sequence` is monotonic across composed policies on a given tick, with the order matching the policy-array order (external assertion — ADR 6 explicitly says policies don't observe each other within a tick).
 - **Sub-RNG isolation (positive case)**: a policy that calls `ctx.random()` does NOT advance `world.rng`. Test: record a synthetic bundle, replay via `SessionReplayer.selfCheck()`, expect `ok: true`.
 - **Sub-RNG isolation (negative case)**: a misbehaving policy that calls `world.random()` directly (i.e., violates the §5.4 contract) produces a bundle whose `selfCheck()` returns `ok: false` with state divergence at the first periodic snapshot. This proves the safety net works — a future regression that lets policies perturb `world.rng` would be caught by this test.
 - **Stop conditions**:
@@ -613,7 +613,7 @@ A separate sub-RNG eliminates the issue: `ctx.random()` doesn't touch `world.rng
 
 ### ADR 6: Composed policies do NOT observe each other's submissions within a tick
 
-**Decision:** When multiple policies share a tick (composition), they receive the same `PolicyContext.world` reference at policy-call time. The harness submits each policy's commands in array order, but no public surface exposes earlier-policy submissions to later policies during the same tick. The `submissionSequence` ordering is observable externally on the resulting bundle (and matches policy-array order); within a tick, policies are computational siblings, not a pipeline.
+**Decision:** When multiple policies share a tick (composition), they receive the same `PolicyContext.world` reference at policy-call time. The harness submits each policy's commands in array order, but no public surface exposes earlier-policy submissions to later policies during the same tick. The `RecordedCommand.sequence` ordering is observable externally on the resulting bundle's `commands[]` (and matches policy-array order); within a tick, policies are computational siblings, not a pipeline.
 
 **Rationale:** The earlier draft of this ADR claimed policies could observe `world.commandQueue` and `nextCommandResultSequence` to inspect earlier-policy submissions. Both fields are `private` in `World` (`world.ts:252,277`), and `docs/architecture/ARCHITECTURE.md:88` explicitly says "Do not access the queue directly". Handlers don't run until `world.step()`, and `world.getEvents()` returns the *previous* tick's events — so within a tick there is no public surface through which policies could see each other's submissions. Advertising the property would have promised a feature the engine doesn't expose.
 
@@ -621,7 +621,7 @@ We could add such a surface (`ctx.peekPendingCommands()` backed by a public `wor
 
 If batch semantics are genuinely needed (one policy's output influencing another within the same tick), the user wraps the dependent policies in a single composite policy that performs the merge internally and submits the combined result.
 
-§12 verifies the external-ordering property: `bundle.commands[].submissionSequence` across composed policies on a given tick matches policy-array order. This is the testable shape; the within-tick observation property is explicitly NOT a testable claim.
+§12 verifies the external-ordering property: `bundle.commands[].sequence` across composed policies on a given tick is monotonic and matches policy-array order. This is the testable shape; the within-tick observation property is explicitly NOT a testable claim.
 
 ## 16. Open Questions / Deferred
 
