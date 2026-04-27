diff --git a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
index 057e813..56aefd0 100644
--- a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
+++ b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
@@ -2,13 +2,9 @@
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
-**Plan revision:** v4 (2026-04-27) — addresses iter-3 multi-CLI plan review findings (4 HIGH typecheck/lint gate-breakers + 2 MED + 5 NIT). Iter-1..3 syntheses at `docs/reviews/synthetic-playtest/2026-04-27/plan-{1,2,3}/REVIEW.md`. v4 specifically fixes:
-- (HIGH-1) `e.executionTick` was wrong; `CommandExecutionResult` has `tick` field. Changed in T2 step 9 composition test.
-- (HIGH-2) Added `type RandomPolicyConfig` to T2 step 5 import list (used in step 9's production-determinism block).
-- (HIGH-3) Rewrote T2 step 4 FileSink test to match the existing test file's named-import style (`mkdtempSync`, `tmpdir`, `join`, `rmSync`) and reuse the `mkSnapshot` helper.
-- (HIGH-4) Dropped unused `DeterministicRandom` import from T3 step 1.
-- (MED-1) Added a clarifying note that step 8 runs `npm test` + `npm run typecheck` only; lint and build defer to step 11 once step 9's tests consume `MemorySink` and `randomPolicy`.
-- (MED-2) Strengthened production-determinism comparisons in T2 step 9 and T3 step 2 to also compare executions, ticks (diffs + events), snapshots (initial + terminal), failures, and stable metadata fields. Documented that sessionId / recordedAt are intentionally fresh per run.
+**Plan revision:** v5 (2026-04-27) — addresses iter-4 multi-CLI plan review findings. Opus ACCEPTed iter-4; Codex flagged 1 HIGH + 1 MED (CommandExecutionResult schema mismatch + under-claim of structural identity). Iter-1..4 syntheses at `docs/reviews/synthetic-playtest/2026-04-27/plan-{1,2,3,4}/REVIEW.md`. v5 fixes:
+- (Codex HIGH) `CommandExecutionResult` has no `sequence` field — only `submissionSequence`, `tick`, etc. (`world.ts:145-156`). v5 deep-equals the entire `bundle.executions` array instead of cherry-picking fields. Same fix in T2 step 9 + T3 step 2.
+- (Codex MED) Production-determinism dual-run now uses `expect(arr1).toEqual(arr2)` for commands, executions, ticks, snapshots, failures — full structural comparison. Metadata comparison strips volatile fields (sessionId, recordedAt) via destructure-rest pattern.
 
 **Goal:** Implement the engine-level Synthetic Playtest Harness defined in `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI review iterations).
 
@@ -1214,47 +1210,28 @@ describe('runSynthPlaytest — production-determinism', () => {
       policySeed: 99,
     });
 
-    // Commands identical (by structural equality on type+data+submissionTick).
-    expect(r1.bundle.commands.length).toBe(r2.bundle.commands.length);
-    for (let i = 0; i < r1.bundle.commands.length; i++) {
-      expect(r1.bundle.commands[i].type).toBe(r2.bundle.commands[i].type);
-      expect(r1.bundle.commands[i].data).toEqual(r2.bundle.commands[i].data);
-      expect(r1.bundle.commands[i].submissionTick).toBe(r2.bundle.commands[i].submissionTick);
-    }
-
-    // Executions identical (by structural shape, ignoring per-instance ids).
-    expect(r1.bundle.executions.length).toBe(r2.bundle.executions.length);
-    for (let i = 0; i < r1.bundle.executions.length; i++) {
-      expect(r1.bundle.executions[i].tick).toBe(r2.bundle.executions[i].tick);
-      expect(r1.bundle.executions[i].sequence).toBe(r2.bundle.executions[i].sequence);
-    }
+    // Deep-equal command + execution arrays (full structural comparison).
+    expect(r1.bundle.commands).toEqual(r2.bundle.commands);
+    expect(r1.bundle.executions).toEqual(r2.bundle.executions);
 
     // Tick entries (diffs + events) identical.
-    expect(r1.bundle.ticks.length).toBe(r2.bundle.ticks.length);
-    for (let i = 0; i < r1.bundle.ticks.length; i++) {
-      expect(r1.bundle.ticks[i].tick).toBe(r2.bundle.ticks[i].tick);
-      expect(r1.bundle.ticks[i].diff).toEqual(r2.bundle.ticks[i].diff);
-      expect(r1.bundle.ticks[i].events).toEqual(r2.bundle.ticks[i].events);
-    }
+    expect(r1.bundle.ticks).toEqual(r2.bundle.ticks);
 
-    // Snapshots identical (terminal at minimum).
-    expect(r1.bundle.snapshots.length).toBe(r2.bundle.snapshots.length);
+    // Snapshots: initial + all periodic + terminal.
     expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
-    const lastR1 = r1.bundle.snapshots[r1.bundle.snapshots.length - 1] ?? { tick: 0, snapshot: r1.bundle.initialSnapshot };
-    const lastR2 = r2.bundle.snapshots[r2.bundle.snapshots.length - 1] ?? { tick: 0, snapshot: r2.bundle.initialSnapshot };
-    expect(lastR1.tick).toBe(lastR2.tick);
-    expect(lastR1.snapshot).toEqual(lastR2.snapshot);
+    expect(r1.bundle.snapshots).toEqual(r2.bundle.snapshots);
 
     // Failures identical (both empty here, but check shape).
     expect(r1.bundle.failures).toEqual(r2.bundle.failures);
 
-    // Metadata: stable fields.
-    expect(r1.bundle.metadata.startTick).toBe(r2.bundle.metadata.startTick);
-    expect(r1.bundle.metadata.endTick).toBe(r2.bundle.metadata.endTick);
-    expect(r1.bundle.metadata.durationTicks).toBe(r2.bundle.metadata.durationTicks);
-    expect(r1.bundle.metadata.sourceKind).toBe(r2.bundle.metadata.sourceKind);
-    expect(r1.bundle.metadata.policySeed).toBe(r2.bundle.metadata.policySeed);
-    // sessionId and recordedAt are intentionally fresh per run; do NOT compare.
+    // Metadata: stable fields. sessionId and recordedAt are intentionally
+    // fresh per run; do NOT compare. Compare the deterministic remainder by
+    // stripping those two fields.
+    const stripVolatile = (m: typeof r1.bundle.metadata) => {
+      const { sessionId: _s, recordedAt: _r, ...rest } = m;
+      return rest;
+    };
+    expect(stripVolatile(r1.bundle.metadata)).toEqual(stripVolatile(r2.bundle.metadata));
   });
 });
 ```
@@ -1476,37 +1453,26 @@ describe('synthetic-playtest production-determinism', () => {
     const r1 = runSynthPlaytest({ world: setupWorld(), ...opts });
     const r2 = runSynthPlaytest({ world: setupWorld(), ...opts });
 
-    // Commands.
-    expect(r1.bundle.commands.length).toBe(r2.bundle.commands.length);
-    for (let i = 0; i < r1.bundle.commands.length; i++) {
-      expect(r1.bundle.commands[i].type).toBe(r2.bundle.commands[i].type);
-      expect(r1.bundle.commands[i].data).toEqual(r2.bundle.commands[i].data);
-      expect(r1.bundle.commands[i].submissionTick).toBe(r2.bundle.commands[i].submissionTick);
-    }
+    // Deep-equal command + execution arrays.
+    expect(r1.bundle.commands).toEqual(r2.bundle.commands);
+    expect(r1.bundle.executions).toEqual(r2.bundle.executions);
 
-    // Executions.
-    expect(r1.bundle.executions.length).toBe(r2.bundle.executions.length);
-    for (let i = 0; i < r1.bundle.executions.length; i++) {
-      expect(r1.bundle.executions[i].tick).toBe(r2.bundle.executions[i].tick);
-      expect(r1.bundle.executions[i].sequence).toBe(r2.bundle.executions[i].sequence);
-    }
-
-    // Tick entries.
-    expect(r1.bundle.ticks.length).toBe(r2.bundle.ticks.length);
-    for (let i = 0; i < r1.bundle.ticks.length; i++) {
-      expect(r1.bundle.ticks[i].diff).toEqual(r2.bundle.ticks[i].diff);
-    }
+    // Tick entries (diffs + events).
+    expect(r1.bundle.ticks).toEqual(r2.bundle.ticks);
 
     // Snapshots.
     expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
-    expect(r1.bundle.snapshots.length).toBe(r2.bundle.snapshots.length);
-    const lastR1 = r1.bundle.snapshots[r1.bundle.snapshots.length - 1];
-    const lastR2 = r2.bundle.snapshots[r2.bundle.snapshots.length - 1];
-    expect(lastR1?.snapshot).toEqual(lastR2?.snapshot);
-
-    // Stable metadata fields (not sessionId, recordedAt).
-    expect(r1.bundle.metadata.endTick).toBe(r2.bundle.metadata.endTick);
-    expect(r1.bundle.metadata.policySeed).toBe(r2.bundle.metadata.policySeed);
+    expect(r1.bundle.snapshots).toEqual(r2.bundle.snapshots);
+
+    // Failures.
+    expect(r1.bundle.failures).toEqual(r2.bundle.failures);
+
+    // Stable metadata (excludes sessionId + recordedAt — intentionally fresh).
+    const stripVolatile = (m: typeof r1.bundle.metadata) => {
+      const { sessionId: _s, recordedAt: _r, ...rest } = m;
+      return rest;
+    };
+    expect(stripVolatile(r1.bundle.metadata)).toEqual(stripVolatile(r2.bundle.metadata));
   });
 });
 ```
