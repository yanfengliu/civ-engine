diff --git a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
index 56aefd0..146b619 100644
--- a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
+++ b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
@@ -2,9 +2,8 @@
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
-**Plan revision:** v5 (2026-04-27) — addresses iter-4 multi-CLI plan review findings. Opus ACCEPTed iter-4; Codex flagged 1 HIGH + 1 MED (CommandExecutionResult schema mismatch + under-claim of structural identity). Iter-1..4 syntheses at `docs/reviews/synthetic-playtest/2026-04-27/plan-{1,2,3,4}/REVIEW.md`. v5 fixes:
-- (Codex HIGH) `CommandExecutionResult` has no `sequence` field — only `submissionSequence`, `tick`, etc. (`world.ts:145-156`). v5 deep-equals the entire `bundle.executions` array instead of cherry-picking fields. Same fix in T2 step 9 + T3 step 2.
-- (Codex MED) Production-determinism dual-run now uses `expect(arr1).toEqual(arr2)` for commands, executions, ticks, snapshots, failures — full structural comparison. Metadata comparison strips volatile fields (sessionId, recordedAt) via destructure-rest pattern.
+**Plan revision:** v6 (2026-04-27) — addresses iter-5 multi-CLI plan review (Opus ACCEPT, Codex 1 HIGH on `bundle.ticks` timing-noise comparison). Iter-1..5 syntheses at `docs/reviews/synthetic-playtest/2026-04-27/plan-{1..5}/REVIEW.md`. v6 fixes:
+- (Codex HIGH) `bundle.ticks[].metrics.durationMs` is `performance.now()`-backed (world-internal.ts:171); whole-entry deep-equality between dual runs would fail on timing noise even when the simulation is deterministic. v6 strips `metrics` before comparing tick entries — compares `{ tick, diff, events, debug }`. Same fix in T2 step 9 + T3 step 2 (replace_all on the stripTickMetrics pattern caught both sites).
 
 **Goal:** Implement the engine-level Synthetic Playtest Harness defined in `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI review iterations).
 
@@ -1214,8 +1213,14 @@ describe('runSynthPlaytest — production-determinism', () => {
     expect(r1.bundle.commands).toEqual(r2.bundle.commands);
     expect(r1.bundle.executions).toEqual(r2.bundle.executions);
 
-    // Tick entries (diffs + events) identical.
-    expect(r1.bundle.ticks).toEqual(r2.bundle.ticks);
+    // Tick entries: deterministic fields (tick, diff, events, debug) identical.
+    // We strip `metrics` because `WorldMetrics.durationMs` is `performance.now()`-
+    // backed (world-internal.ts:171) and varies between runs even when the
+    // simulation is identical. Same applies to T3's dual-run check.
+    const stripTickMetrics = (t: typeof r1.bundle.ticks[number]) => ({
+      tick: t.tick, diff: t.diff, events: t.events, debug: t.debug,
+    });
+    expect(r1.bundle.ticks.map(stripTickMetrics)).toEqual(r2.bundle.ticks.map(stripTickMetrics));
 
     // Snapshots: initial + all periodic + terminal.
     expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
