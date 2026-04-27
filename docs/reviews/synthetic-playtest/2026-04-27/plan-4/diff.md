diff --git a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
index d26d321..057e813 100644
--- a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
+++ b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
@@ -2,11 +2,13 @@
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
-**Plan revision:** v3 (2026-04-27) — addresses iter-2 multi-CLI plan review findings on top of iter-1 fixes. Iter-1 synthesis at `docs/reviews/synthetic-playtest/2026-04-27/plan-1/REVIEW.md`; iter-2 at `docs/reviews/synthetic-playtest/2026-04-27/plan-2/REVIEW.md`. v3 specifically fixes:
-- (Codex HIGH) sub-RNG positive/negative tests in T3 now emit at least one `spawn` command per tick, preventing `SessionReplayer.selfCheck`'s no-payload short-circuit (`session-replayer.ts:270-276`) from making the negative test undetectable.
-- (Opus HIGH) T2 step 5 import list now includes `type PolicyContext` and drops unused `SessionRecorder` / `SessionReplayer`. Removed the redundant bottom-of-file `import type` in step 9.
-- (Codex MED) Per-task review uses `<prev-task-tip-or-main>..HEAD` instead of cumulative `main..HEAD`.
-- (NITs) T1 step 9 randomPolicy seed-determinism test rewritten to use a single shared sub-RNG (mirrors harness behavior); changelog test count revised to "20+".
+**Plan revision:** v4 (2026-04-27) — addresses iter-3 multi-CLI plan review findings (4 HIGH typecheck/lint gate-breakers + 2 MED + 5 NIT). Iter-1..3 syntheses at `docs/reviews/synthetic-playtest/2026-04-27/plan-{1,2,3}/REVIEW.md`. v4 specifically fixes:
+- (HIGH-1) `e.executionTick` was wrong; `CommandExecutionResult` has `tick` field. Changed in T2 step 9 composition test.
+- (HIGH-2) Added `type RandomPolicyConfig` to T2 step 5 import list (used in step 9's production-determinism block).
+- (HIGH-3) Rewrote T2 step 4 FileSink test to match the existing test file's named-import style (`mkdtempSync`, `tmpdir`, `join`, `rmSync`) and reuse the `mkSnapshot` helper.
+- (HIGH-4) Dropped unused `DeterministicRandom` import from T3 step 1.
+- (MED-1) Added a clarifying note that step 8 runs `npm test` + `npm run typecheck` only; lint and build defer to step 11 once step 9's tests consume `MemorySink` and `randomPolicy`.
+- (MED-2) Strengthened production-determinism comparisons in T2 step 9 and T3 step 2 to also compare executions, ticks (diffs + events), snapshots (initial + terminal), failures, and stable metadata fields. Documented that sessionId / recordedAt are intentionally fresh per run.
 
 **Goal:** Implement the engine-level Synthetic Playtest Harness defined in `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI review iterations).
 
@@ -686,30 +688,37 @@ it('sourceKind: "synthetic" + policySeed: 42 flow into bundle.metadata', () => {
 
 ### Step 4: Verify FileSink round-trips `policySeed` in manifest
 
-- [ ] Edit `tests/file-sink.test.ts` — append:
+- [ ] Edit `tests/file-sink.test.ts` — append (uses the file's existing named-import style: `mkdtempSync` from `node:fs`, `tmpdir` from `node:os`, `join` from `node:path`, plus the existing `afterEach(() => rmSync(...))` cleanup pattern in that file):
 
 ```ts
-it('round-trips synthetic metadata (sourceKind + policySeed) in manifest', async () => {
-  const tmpDir = path.join(os.tmpdir(), `civ-engine-fsink-${Date.now()}`);
-  fs.mkdirSync(tmpDir, { recursive: true });
-  const sink = new FileSink(tmpDir);
-  const meta: SessionMetadata = {
-    sessionId: 's-1', engineVersion: '0.8.0', nodeVersion: 'v20',
-    recordedAt: 't', startTick: 0, endTick: 5, persistedEndTick: 5,
-    durationTicks: 5, sourceKind: 'synthetic', policySeed: 1234,
-  };
-  sink.open(meta);
-  sink.writeSnapshot({ tick: 0, snapshot: { tick: 0 } as any });
-  sink.close();
-
-  // Re-open via constructor pre-loads manifest.
-  const reopened = new FileSink(tmpDir);
-  expect(reopened.metadata.sourceKind).toBe('synthetic');
-  expect(reopened.metadata.policySeed).toBe(1234);
+it('round-trips synthetic metadata (sourceKind + policySeed) in manifest', () => {
+  const tmpDir = mkdtempSync(join(tmpdir(), 'civ-engine-fsink-'));
+  try {
+    const sink = new FileSink(tmpDir);
+    const meta: SessionMetadata = {
+      sessionId: '11111111-1111-1111-1111-111111111111',
+      engineVersion: '0.8.0',
+      nodeVersion: 'v22.0.0',
+      recordedAt: '2026-04-27T00:00:00Z',
+      startTick: 0, endTick: 5, persistedEndTick: 5, durationTicks: 5,
+      sourceKind: 'synthetic',
+      policySeed: 1234,
+    };
+    sink.open(meta);
+    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
+    sink.close();
+
+    // Re-open via constructor pre-loads manifest.
+    const reopened = new FileSink(tmpDir);
+    expect(reopened.metadata.sourceKind).toBe('synthetic');
+    expect(reopened.metadata.policySeed).toBe(1234);
+  } finally {
+    rmSync(tmpDir, { recursive: true, force: true });
+  }
 });
 ```
 
-(Imports for `path`, `os`, `fs` likely already in the test file; otherwise add.)
+(`mkSnapshot` is the existing helper in `tests/file-sink.test.ts` — reuse it.)
 
 - [ ] Run: `npm test -- tests/file-sink`
 - [ ] Expected: PASS (the FileSink stores metadata as-is; the new field rides through transparently).
@@ -728,9 +737,16 @@ import {
   runSynthPlaytest,
   scriptedPolicy,
   type PolicyContext,
+  type RandomPolicyConfig,
   type WorldConfig,
 } from '../src/index.js';
 
+// Note: MemorySink and randomPolicy are first used in Step 9 tests below. To
+// avoid an unused-import lint failure between Step 7 (impl) and Step 9 (when
+// they're consumed), Step 8 runs `npm test` only — the canonical lint gate
+// runs at Step 11 once Step 9's tests are in place. Alternatively, keep these
+// imports out of the file until Step 9 (move them in alongside the tests).
+
 const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
 
 interface Cmds { spawn: { id: number } }
@@ -1039,12 +1055,12 @@ export function runSynthPlaytest<
 }
 ```
 
-### Step 8: Run all tests + 4 gates
+### Step 8: Run tests (gate)
 
 - [ ] `npm test` — all pass.
 - [ ] `npm run typecheck` — clean.
-- [ ] `npm run lint` — clean.
-- [ ] `npm run build` — clean.
+
+(Lint and build run at Step 11, after Step 9 adds the tests that consume `MemorySink` and `randomPolicy` — running lint here would fail on those unused imports.)
 
 ### Step 9: Add the 4 missing acceptance-criteria tests + composition + sink failure modes
 
@@ -1170,17 +1186,14 @@ describe('runSynthPlaytest — composition', () => {
     expect(result.bundle.commands).toHaveLength(1);
     expect(result.bundle.commands[0].data).toEqual({ id: 100 });
     // step() never ran for tick 1, so no execution.
-    const tick1Executions = result.bundle.executions.filter((e) => e.executionTick === 1);
+    const tick1Executions = result.bundle.executions.filter((e) => e.tick === 1);
     expect(tick1Executions).toHaveLength(0);
   });
 });
 
 describe('runSynthPlaytest — production-determinism', () => {
   it('same policySeed produces structurally identical bundles (modulo sessionId/recordedAt)', () => {
-    const setup = () => {
-      const w = mkWorld();
-      return w;
-    };
+    const setup = () => mkWorld();
     const policyConfig = (): RandomPolicyConfig<Record<string, never>, Cmds> => ({
       catalog: [
         () => ({ type: 'spawn', data: { id: 1 } }),
@@ -1200,6 +1213,7 @@ describe('runSynthPlaytest — production-determinism', () => {
       maxTicks: 50,
       policySeed: 99,
     });
+
     // Commands identical (by structural equality on type+data+submissionTick).
     expect(r1.bundle.commands.length).toBe(r2.bundle.commands.length);
     for (let i = 0; i < r1.bundle.commands.length; i++) {
@@ -1207,6 +1221,40 @@ describe('runSynthPlaytest — production-determinism', () => {
       expect(r1.bundle.commands[i].data).toEqual(r2.bundle.commands[i].data);
       expect(r1.bundle.commands[i].submissionTick).toBe(r2.bundle.commands[i].submissionTick);
     }
+
+    // Executions identical (by structural shape, ignoring per-instance ids).
+    expect(r1.bundle.executions.length).toBe(r2.bundle.executions.length);
+    for (let i = 0; i < r1.bundle.executions.length; i++) {
+      expect(r1.bundle.executions[i].tick).toBe(r2.bundle.executions[i].tick);
+      expect(r1.bundle.executions[i].sequence).toBe(r2.bundle.executions[i].sequence);
+    }
+
+    // Tick entries (diffs + events) identical.
+    expect(r1.bundle.ticks.length).toBe(r2.bundle.ticks.length);
+    for (let i = 0; i < r1.bundle.ticks.length; i++) {
+      expect(r1.bundle.ticks[i].tick).toBe(r2.bundle.ticks[i].tick);
+      expect(r1.bundle.ticks[i].diff).toEqual(r2.bundle.ticks[i].diff);
+      expect(r1.bundle.ticks[i].events).toEqual(r2.bundle.ticks[i].events);
+    }
+
+    // Snapshots identical (terminal at minimum).
+    expect(r1.bundle.snapshots.length).toBe(r2.bundle.snapshots.length);
+    expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
+    const lastR1 = r1.bundle.snapshots[r1.bundle.snapshots.length - 1] ?? { tick: 0, snapshot: r1.bundle.initialSnapshot };
+    const lastR2 = r2.bundle.snapshots[r2.bundle.snapshots.length - 1] ?? { tick: 0, snapshot: r2.bundle.initialSnapshot };
+    expect(lastR1.tick).toBe(lastR2.tick);
+    expect(lastR1.snapshot).toEqual(lastR2.snapshot);
+
+    // Failures identical (both empty here, but check shape).
+    expect(r1.bundle.failures).toEqual(r2.bundle.failures);
+
+    // Metadata: stable fields.
+    expect(r1.bundle.metadata.startTick).toBe(r2.bundle.metadata.startTick);
+    expect(r1.bundle.metadata.endTick).toBe(r2.bundle.metadata.endTick);
+    expect(r1.bundle.metadata.durationTicks).toBe(r2.bundle.metadata.durationTicks);
+    expect(r1.bundle.metadata.sourceKind).toBe(r2.bundle.metadata.sourceKind);
+    expect(r1.bundle.metadata.policySeed).toBe(r2.bundle.metadata.policySeed);
+    // sessionId and recordedAt are intentionally fresh per run; do NOT compare.
   });
 });
 ```
@@ -1350,7 +1398,6 @@ Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
 ```ts
 import { describe, expect, it } from 'vitest';
 import {
-  DeterministicRandom,
   SessionReplayer,
   World,
   noopPolicy,
@@ -1428,14 +1475,38 @@ describe('synthetic-playtest production-determinism', () => {
     };
     const r1 = runSynthPlaytest({ world: setupWorld(), ...opts });
     const r2 = runSynthPlaytest({ world: setupWorld(), ...opts });
+
+    // Commands.
     expect(r1.bundle.commands.length).toBe(r2.bundle.commands.length);
     for (let i = 0; i < r1.bundle.commands.length; i++) {
       expect(r1.bundle.commands[i].type).toBe(r2.bundle.commands[i].type);
       expect(r1.bundle.commands[i].data).toEqual(r2.bundle.commands[i].data);
       expect(r1.bundle.commands[i].submissionTick).toBe(r2.bundle.commands[i].submissionTick);
     }
-    // Final snapshots also identical (modulo metadata).
+
+    // Executions.
+    expect(r1.bundle.executions.length).toBe(r2.bundle.executions.length);
+    for (let i = 0; i < r1.bundle.executions.length; i++) {
+      expect(r1.bundle.executions[i].tick).toBe(r2.bundle.executions[i].tick);
+      expect(r1.bundle.executions[i].sequence).toBe(r2.bundle.executions[i].sequence);
+    }
+
+    // Tick entries.
+    expect(r1.bundle.ticks.length).toBe(r2.bundle.ticks.length);
+    for (let i = 0; i < r1.bundle.ticks.length; i++) {
+      expect(r1.bundle.ticks[i].diff).toEqual(r2.bundle.ticks[i].diff);
+    }
+
+    // Snapshots.
+    expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
+    expect(r1.bundle.snapshots.length).toBe(r2.bundle.snapshots.length);
+    const lastR1 = r1.bundle.snapshots[r1.bundle.snapshots.length - 1];
+    const lastR2 = r2.bundle.snapshots[r2.bundle.snapshots.length - 1];
+    expect(lastR1?.snapshot).toEqual(lastR2?.snapshot);
+
+    // Stable metadata fields (not sessionId, recordedAt).
     expect(r1.bundle.metadata.endTick).toBe(r2.bundle.metadata.endTick);
+    expect(r1.bundle.metadata.policySeed).toBe(r2.bundle.metadata.policySeed);
   });
 });
 ```
