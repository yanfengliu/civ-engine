diff --git a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
index 146b619..7d07475 100644
--- a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
+++ b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
@@ -2,8 +2,8 @@
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
-**Plan revision:** v6 (2026-04-27) — addresses iter-5 multi-CLI plan review (Opus ACCEPT, Codex 1 HIGH on `bundle.ticks` timing-noise comparison). Iter-1..5 syntheses at `docs/reviews/synthetic-playtest/2026-04-27/plan-{1..5}/REVIEW.md`. v6 fixes:
-- (Codex HIGH) `bundle.ticks[].metrics.durationMs` is `performance.now()`-backed (world-internal.ts:171); whole-entry deep-equality between dual runs would fail on timing noise even when the simulation is deterministic. v6 strips `metrics` before comparing tick entries — compares `{ tick, diff, events, debug }`. Same fix in T2 step 9 + T3 step 2 (replace_all on the stripTickMetrics pattern caught both sites).
+**Plan revision:** v7 (2026-04-27) — addresses iter-6 multi-CLI plan review. Both reviewers (Codex + Opus) converged on the same HIGH: v6 claimed the metrics-stripping fix landed at both T2 step 9 + T3 step 2 sites, but only T2 was actually patched (the v6 `replace_all` matched a string that only existed at the T2 site). T3 step 2 still had `expect(r1.bundle.ticks).toEqual(r2.bundle.ticks)` and would fail intermittently on `durationMs` timing noise. Iter-1..6 syntheses at `docs/reviews/synthetic-playtest/2026-04-27/plan-{1..6}/REVIEW.md`. v7 fixes:
+- (Both HIGH) Patches T3 step 2 with the same `stripTickMetrics` helper now in T2 step 9 (line 1220-1223). Verified via `grep -n "bundle\.ticks).toEqual"` returning zero matches and `grep -n "bundle\.ticks\.map.*stripTickMetrics"` returning two (T2 + T3 sites).
 
 **Goal:** Implement the engine-level Synthetic Playtest Harness defined in `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI review iterations).
 
@@ -1462,8 +1462,12 @@ describe('synthetic-playtest production-determinism', () => {
     expect(r1.bundle.commands).toEqual(r2.bundle.commands);
     expect(r1.bundle.executions).toEqual(r2.bundle.executions);
 
-    // Tick entries (diffs + events).
-    expect(r1.bundle.ticks).toEqual(r2.bundle.ticks);
+    // Tick entries: deterministic fields only (strip metrics for the same
+    // reason as T2 step 9 — durationMs is performance.now()-backed).
+    const stripTickMetrics = (t: typeof r1.bundle.ticks[number]) => ({
+      tick: t.tick, diff: t.diff, events: t.events, debug: t.debug,
+    });
+    expect(r1.bundle.ticks.map(stripTickMetrics)).toEqual(r2.bundle.ticks.map(stripTickMetrics));
 
     // Snapshots.
     expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
