diff --git a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
index f00bf02..d26d321 100644
--- a/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
+++ b/docs/design/2026-04-27-synthetic-playtest-implementation-plan.md
@@ -2,7 +2,11 @@
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
-**Plan revision:** v2 (2026-04-27) — addresses iter-1 multi-CLI plan review findings (5 BLOCKER + 11 HIGH + 4 MED + 4 LOW). Iter-1 synthesis at `docs/reviews/synthetic-playtest/2026-04-27/plan-1/REVIEW.md`.
+**Plan revision:** v3 (2026-04-27) — addresses iter-2 multi-CLI plan review findings on top of iter-1 fixes. Iter-1 synthesis at `docs/reviews/synthetic-playtest/2026-04-27/plan-1/REVIEW.md`; iter-2 at `docs/reviews/synthetic-playtest/2026-04-27/plan-2/REVIEW.md`. v3 specifically fixes:
+- (Codex HIGH) sub-RNG positive/negative tests in T3 now emit at least one `spawn` command per tick, preventing `SessionReplayer.selfCheck`'s no-payload short-circuit (`session-replayer.ts:270-276`) from making the negative test undetectable.
+- (Opus HIGH) T2 step 5 import list now includes `type PolicyContext` and drops unused `SessionRecorder` / `SessionReplayer`. Removed the redundant bottom-of-file `import type` in step 9.
+- (Codex MED) Per-task review uses `<prev-task-tip-or-main>..HEAD` instead of cumulative `main..HEAD`.
+- (NITs) T1 step 9 randomPolicy seed-determinism test rewritten to use a single shared sub-RNG (mirrors harness behavior); changelog test count revised to "20+".
 
 **Goal:** Implement the engine-level Synthetic Playtest Harness defined in `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI review iterations).
 
@@ -10,6 +14,8 @@
 
 **Tech Stack:** TypeScript 5.7+, Vitest 3, ESLint 9, Node 18+. ESM + Node16 module resolution.
 
+**Shell:** Although the OS is Windows, the project's harness uses **bash** (mingw on Windows). All shell snippets in this plan use Unix syntax (`/tmp/`, `&` for backgrounding, `$(...)`, `[ -s file ]`, `mkdir -p`). This matches the project's convention as documented in CLAUDE.md.
+
 **Spec sections referenced:** §-numbered references map 1:1 to sections in `2026-04-27-synthetic-playtest-harness-design.md`.
 
 **Branch:** `agent/synthetic-playtest`. Three commits T1/T2/T3. Branch stays at tip awaiting explicit user merge authorization per AGENTS.md.
@@ -36,11 +42,17 @@ T3 also: `docs/architecture/ARCHITECTURE.md` Component Map row + `docs/architect
 
 ### B. Per-task multi-CLI review (before commit)
 
-After all 4 engine gates pass + impl + tests + docs are in place, but before the commit:
+After all 4 engine gates pass + impl + tests + docs are in place, but before the commit. **Use the previous task's tip as the diff base for per-task review (NOT `main..HEAD` which would include earlier tasks):**
+
+- T1's review base: `main` (T1 is the first task on the branch). Use `git diff main..HEAD`.
+- T2's review base: T1's commit hash. Capture it via `T1_TIP=$(git rev-parse HEAD)` after T1 lands; T2's review uses `git diff $T1_TIP..HEAD`.
+- T3's review base: T2's commit hash. Capture similarly; T3's review uses `git diff $T2_TIP..HEAD`.
+
+Per-task review attribution is cleaner this way; cumulative diffs muddle finding ownership across tasks.
 
 ```bash
-# 1. Generate WIP diff (use main as base for T1; chain from T1's tip for T2/T3).
-git diff main..HEAD > /tmp/task-diff.patch
+# 1. Generate WIP diff (use the previous task's tip as base; main only for T1).
+git diff <prev-task-tip-or-main>..HEAD > /tmp/task-diff.patch
 
 # 2. Create review folder.
 mkdir -p docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw
@@ -52,10 +64,10 @@ EOF
 PROMPT=$(cat /tmp/review-prompt.txt)
 
 # 4. Run Codex + Opus in parallel (background; ~5-10 min each).
-git diff main..HEAD | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh \
+git diff <prev-task-tip-or-main>..HEAD | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh \
   -c approval_policy=never --sandbox read-only --ephemeral "$PROMPT" \
   > docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw/codex.md 2>&1 &
-git diff main..HEAD | claude -p --model opus --effort xhigh \
+git diff <prev-task-tip-or-main>..HEAD | claude -p --model opus --effort xhigh \
   --append-system-prompt "$PROMPT" \
   --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" \
   > docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw/opus.md 2>&1 &
@@ -285,7 +297,8 @@ export function scriptedPolicy<
 
 ```ts
 describe('randomPolicy', () => {
-  it('seeded selection is deterministic across two policy instances', () => {
+  it('seeded selection is deterministic across cross-tick sequences', () => {
+    // Use a single shared sub-RNG threading across ticks (mirrors what the harness does).
     const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
       catalog: [
         () => ({ type: 'spawn', data: { id: 1 } }),
@@ -293,15 +306,18 @@ describe('randomPolicy', () => {
         () => ({ type: 'spawn', data: { id: 3 } }),
       ],
     };
-    const p1 = randomPolicy<Record<string, never>, Cmds>(config);
-    const p2 = randomPolicy<Record<string, never>, Cmds>(config);
-    const out1: unknown[] = [];
-    const out2: unknown[] = [];
-    for (let t = 1; t <= 5; t++) {
-      out1.push(p1(mkPolicyCtx(t, 42)));
-      out2.push(p2(mkPolicyCtx(t, 42)));
-    }
-    expect(out1).toEqual(out2);
+    const runOnce = (seed: number) => {
+      const policy = randomPolicy<Record<string, never>, Cmds>(config);
+      const rng = new DeterministicRandom(seed);
+      const random = () => rng.random();
+      const out: unknown[] = [];
+      for (let t = 1; t <= 5; t++) {
+        out.push(policy({ world: new World<Record<string, never>, Cmds>(mkConfig()), tick: t, random }));
+      }
+      return out;
+    };
+    expect(runOnce(42)).toEqual(runOnce(42));
+    expect(runOnce(42)).not.toEqual(runOnce(99));
   });
 
   it('catalog functions receive PolicyContext (can read ctx.world.tick / ctx.tick)', () => {
@@ -706,13 +722,12 @@ it('round-trips synthetic metadata (sourceKind + policySeed) in manifest', async
 import { describe, expect, it } from 'vitest';
 import {
   MemorySink,
-  SessionRecorder,
-  SessionReplayer,
   World,
   noopPolicy,
   randomPolicy,
   runSynthPlaytest,
   scriptedPolicy,
+  type PolicyContext,
   type WorldConfig,
 } from '../src/index.js';
 
@@ -863,7 +878,6 @@ describe('runSynthPlaytest — stop reasons', () => {
   });
 });
 
-import type { PolicyContext } from '../src/index.js';
 ```
 
 ### Step 6: Run tests — expect FAIL
@@ -1268,7 +1282,7 @@ export {
 - Replay-determinism: non-poisoned synthetic bundles with `ticksRun ≥ 1` pass `SessionReplayer.selfCheck()`.
 - Sub-RNG isolation: `PolicyContext.random()` is independent of `world.rng`; replay reproduces world RNG state because policies don't perturb it.
 
-**Validation:** 4 engine gates clean; 30+ new tests covering acceptance criteria + edge cases.
+**Validation:** 4 engine gates clean; 20+ new tests covering acceptance criteria + edge cases.
 
 **Migration:** downstream `assertNever(sourceKind)` consumers add `case 'synthetic':`. No engine changes required.
 ```
@@ -1432,13 +1446,19 @@ describe('synthetic-playtest production-determinism', () => {
 
 ```ts
 describe('synthetic-playtest sub-RNG isolation', () => {
+  // Each policy emits at least one command per tick so the bundle has command payloads.
+  // SessionReplayer.selfCheck (session-replayer.ts:270-276) short-circuits on no-payload
+  // bundles with a console.warn — we need a non-empty bundle to drive the actual segment
+  // comparison and detect (or fail to detect) RNG divergence.
+
   it('positive: policy using ctx.random() is replay-deterministic', () => {
     const result = runSynthPlaytest({
       world: setupWorld(),
       policies: [(ctx) => {
         // Use ctx.random for any randomness; doesn't perturb world.rng.
-        const _ = ctx.random();
-        return [];
+        const r = ctx.random();
+        // Emit a no-op command driven by ctx.random so the bundle has payloads.
+        return [{ type: 'spawn' as const, data: { id: Math.floor(r * 1000) } }];
       }],
       maxTicks: 20,
     });
@@ -1452,9 +1472,13 @@ describe('synthetic-playtest sub-RNG isolation', () => {
     const result = runSynthPlaytest({
       world: setupWorld(),
       policies: [(ctx) => {
-        // Contract violation: perturbs world.rng between ticks.
-        const _ = ctx.world.random();
-        return [];
+        // Contract violation: perturbs world.rng between ticks. Replay won't reproduce
+        // these calls (replay never invokes policies), so world.rng state at snapshots
+        // diverges.
+        const r = ctx.world.random();
+        // Emit at least one command per tick so bundle.commands is non-empty (prevents
+        // selfCheck no-payload short-circuit at session-replayer.ts:270).
+        return [{ type: 'spawn' as const, data: { id: Math.floor(r * 1000) } }];
       }],
       maxTicks: 20,
     });
