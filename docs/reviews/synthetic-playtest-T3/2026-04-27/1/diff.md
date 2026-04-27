diff --git a/README.md b/README.md
index af00d67..717abe7 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # civ-engine
 
-![version](https://img.shields.io/badge/version-0.8.0-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
+![version](https://img.shields.io/badge/version-0.8.1-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
 
 > ⚠️ **Pre-release alpha — unverified.** This engine is under active development. The public API surface is still shifting (see `docs/changelog.md` for the recent breaking-change cadence — `0.5.0`, `0.6.0`, `0.7.0`), invariants are still being hardened (current sweep: iter-7 of the multi-CLI review chain), and no production deployment has validated the engine end-to-end. Use it for prototyping, AI-agent experiments, and feedback — do **not** depend on it for shipped products yet.
 
diff --git a/docs/architecture/ARCHITECTURE.md b/docs/architecture/ARCHITECTURE.md
index a8f444b..5ca88ff 100644
--- a/docs/architecture/ARCHITECTURE.md
+++ b/docs/architecture/ARCHITECTURE.md
@@ -40,6 +40,7 @@ The engine provides reusable infrastructure (entities, components, spatial index
 | SessionRecorder | `src/session-recorder.ts` | Captures live World runs into SessionBundle via SessionSink; mutex-locked single payload-capturing recorder per world (slot at world.__payloadCapturingRecorder); marker validation per spec §6.1; terminal snapshot on disconnect |
 | SessionReplayer | `src/session-replayer.ts` | Loads a SessionBundle/Source; openAt(tick) returns paused World; selfCheck() 3-stream comparison (state via deepEqualWithPath, events, executions); failedTicks-skipping; cross-b/cross-Node-major version checks |
 | SessionBundle / SessionSink / SessionSource / Marker / RecordedCommand | `src/session-bundle.ts`, `src/session-sink.ts`, `src/session-file-sink.ts` | Shared bundle types + sink/source interfaces + MemorySink + FileSink (disk-backed; manifest atomic-rename; defaults to sidecar attachments). scenarioResultToBundle adapter at `src/session-scenario-bundle.ts`. |
+| Synthetic Playtest Harness | `src/synthetic-playtest.ts` | Tier-1 autonomous-driver primitive: `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for N ticks → `SessionBundle`. Sub-RNG (`PolicyContext.random()`) sandboxed from `world.rng`, seeded from `policySeed`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Composes with `SessionRecorder`/`SessionReplayer`. New in v0.7.20 + v0.8.0 (Spec 3). |
 | Public exports | `src/index.ts`           | Barrel export for the intended package API                                             |
 | Types          | `src/types.ts`           | Shared type definitions (EntityId, EntityRef, Position, WorldConfig, InstrumentationProfile) |
 
diff --git a/docs/architecture/drift-log.md b/docs/architecture/drift-log.md
index 1685078..1fd8a2a 100644
--- a/docs/architecture/drift-log.md
+++ b/docs/architecture/drift-log.md
@@ -44,3 +44,4 @@ Append a row here whenever architecture changes. Each row captures the date, the
 | 2026-04-26 | Precondition proxy clone-on-read for live-reference returns (v0.7.2) | The denylist alone couldn't block in-place mutation of read returns — `w.getComponent(e, 'hp')!.current = 0` from a predicate would mutate the live `ComponentStore` entry. The proxy now `structuredClone`s returns from `getComponent` / `getComponents` / `getState` / `getResource` / `getTags` / `getByTag` / `getEvents`. Predicates pay one clone per read; preconditions are not the hot path. |
 | 2026-04-26 | `Object.freeze(world.grid)` + ghost-entry cleanup (v0.7.3) | `world.grid` is a public field, not a method, so the proxy passed it through as-is — predicates could monkey-patch `w.grid.getAt`. Constructor now `Object.freeze`s the grid delegate, making the v0.5.0 read-only-delegate promise structural rather than convention-only. The `READ_METHODS_RETURNING_REFS` set was cleaned of two ghost entries (`getResources`, `getPosition`) that don't exist on `World`. |
 | 2026-04-27 | Session-recording subsystem (v0.7.7-v0.7.14) | Adds `SessionRecorder` / `SessionReplayer` / `SessionBundle` / `SessionSink` / `SessionSource` / `MemorySink` / `FileSink` / `Marker` / `RecordedCommand` / `scenarioResultToBundle()` plus `World.applySnapshot()` instance method, `WorldHistoryRecorder.captureCommandPayloads` opt-in, and `World.__payloadCapturingRecorder` mutex slot. Implements engine-level capture/replay primitives per `docs/design/2026-04-26-session-recording-and-replay-design.md` (v5, converged after 4 multi-CLI review iterations). Per ADR 1 in §15 of the spec, the new SessionRecorder runs as a sibling to WorldHistoryRecorder rather than extending it (different shape: rolling debug buffer vs. persistent archive). Per ADR 2, `SessionBundle` is a strict-JSON shared type identical regardless of producer. Per ADR 3, the determinism contract (spec §11.1) is documented but NOT structurally enforced — `SessionReplayer.selfCheck()` is the verification mechanism. Per ADR 4, the `worldFactory` callback is part of the determinism contract. v1 limitations: single payload-capturing recorder per world; sinks are synchronous; replay across recorded TickFailure is out of scope (future spec extends `WorldSnapshot` to v6). 121 new tests across 8 commits. |
+| 2026-04-27 | Synthetic Playtest Harness (v0.7.20 + v0.8.0 + v0.8.1) | Adds `runSynthPlaytest` / `Policy` / `PolicyContext` / `StopContext` / `PolicyCommand` / `RandomPolicyConfig` / `ScriptedPolicyEntry` / `noopPolicy` / `randomPolicy` / `scriptedPolicy` / `SynthPlaytestConfig` / `SynthPlaytestResult` exports. **Breaking (b-bump in 0.8.0):** `SessionMetadata.sourceKind` widened from `'session' \| 'scenario'` to `'session' \| 'scenario' \| 'synthetic'` — downstream `assertNever` exhaustive switches break. Engine-internal consumers don't branch on this field, so engine builds are unaffected. **Sub-RNG:** `PolicyContext.random()` is bound to a private `DeterministicRandom` seeded from `policySeed` (default: `Math.floor(world.random() * 0x1_0000_0000)`, derived BEFORE `recorder.connect()`). Sandboxed from `world.rng` so policy randomness doesn't perturb world state — replay reproduces trivially. **Determinism contract:** non-poisoned synthetic bundles with `ticksRun >= 1` pass `SessionReplayer.selfCheck()`; poisoned bundles cause selfCheck to re-throw the original tick failure (terminal-at-failed-tick segment isn't skipped); pre-step abort produces vacuous-ok bundles (`ticksRun === 0`, terminal == initial). Tier-1 of `docs/design/ai-first-dev-roadmap.md`. Per `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI design iterations + 7 plan iterations). 39 new tests across 3 commits (T1+T2+T3). |
diff --git a/docs/changelog.md b/docs/changelog.md
index 10024c2..b6d5ed1 100644
--- a/docs/changelog.md
+++ b/docs/changelog.md
@@ -1,5 +1,30 @@
 # Changelog
 
+## 0.8.1 - 2026-04-27
+
+Synthetic Playtest T3: cross-cutting determinism integration tests + structural docs (closes Spec 3 implementation).
+
+### Tests added (`tests/synthetic-determinism.test.ts`, 7 cases)
+
+- **selfCheck round-trip:** non-poisoned bundle with `ticksRun >= 1` passes `replayer.selfCheck().ok`.
+- **Production-determinism dual-run:** same `policySeed` + same setup → deep-equal bundles modulo sessionId/recordedAt/durationMs.
+- **Sub-RNG isolation positive:** policy using `ctx.random()` is replay-deterministic.
+- **Sub-RNG isolation negative:** policy calling `ctx.world.random()` directly causes selfCheck divergence at first periodic snapshot — proves the safety net works.
+- **Poisoned-bundle replay:** `SessionReplayer.selfCheck()` re-throws the original tick failure (the failed-tick-bounded final segment is replayed, not skipped — verified at session-replayer.ts:286).
+- **Pre-step abort vacuous case:** policy throws on tick 1 → `ticksRun === 0`, terminal == initial → selfCheck returns `ok:true` vacuously over zero-length segment.
+- **Bundle → script conversion regression:** record → `+1` formula on submissionTick → replay through `scriptedPolicy` → assert identical command stream (types + data + submissionTicks).
+
+### Structural docs
+
+- `docs/architecture/ARCHITECTURE.md`: Component Map row for Synthetic Playtest Harness.
+- `docs/architecture/drift-log.md`: 2026-04-27 entry describing the Spec 3 implementation chain (T1 v0.7.20 + T2 v0.8.0 + T3 v0.8.1).
+- `docs/design/ai-first-dev-roadmap.md`: Spec 3 status → Implemented; Spec 1 status corrected to Implemented (v0.7.6 → v0.7.19) with link to converged spec.
+- `docs/guides/ai-integration.md`: appended Tier-1 reference linking to the synthetic-playtest guide.
+
+### Validation
+
+All four engine gates pass: `npm test` (798 + 2 todo, 7 new in `tests/synthetic-determinism.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`. Multi-CLI code review converged.
+
 ## 0.8.0 - 2026-04-27 — BREAKING (b-bump)
 
 Synthetic Playtest T2: `runSynthPlaytest` harness + b-bump-axis `SessionMetadata.sourceKind` union widening.
diff --git a/docs/design/ai-first-dev-roadmap.md b/docs/design/ai-first-dev-roadmap.md
index d64c197..b6ecefe 100644
--- a/docs/design/ai-first-dev-roadmap.md
+++ b/docs/design/ai-first-dev-roadmap.md
@@ -157,9 +157,9 @@ Why it's deferred: it's a meaty engine-wide behavioral change with its own desig
 
 | Spec | Title                                | Status     | File                                                      |
 | ---- | ------------------------------------ | ---------- | --------------------------------------------------------- |
-| 1    | Session Recording & Replay           | Drafted    | `2026-04-26-session-recording-and-replay-design.md`       |
+| 1    | Session Recording & Replay           | **Implemented** (v0.7.6 → v0.7.19) | `2026-04-26-session-recording-and-replay-design.md` (v5)  |
 | 2    | Game-Side Annotation UI              | Proposed   | not yet drafted                                           |
-| 3    | Synthetic Playtest Harness           | Proposed   | not yet drafted                                           |
+| 3    | Synthetic Playtest Harness           | **Implemented** (v0.7.20 + v0.8.0 + v0.8.1) | `2026-04-27-synthetic-playtest-harness-design.md` (v10) + `2026-04-27-synthetic-playtest-implementation-plan.md` (v7) |
 | 4    | Standalone Bundle Viewer             | Proposed   | not yet drafted                                           |
 | 5    | Counterfactual Replay / Fork         | Proposed   | not yet drafted                                           |
 | 6    | Strict-Mode Determinism Enforcement  | Proposed   | not yet drafted                                           |
diff --git a/docs/devlog/detailed/2026-04-26_2026-04-27.md b/docs/devlog/detailed/2026-04-26_2026-04-27.md
index 47f1d4f..e8a7085 100644
--- a/docs/devlog/detailed/2026-04-26_2026-04-27.md
+++ b/docs/devlog/detailed/2026-04-26_2026-04-27.md
@@ -785,3 +785,57 @@ Sub-RNG sandboxing eliminates the determinism failure mode where policies callin
 ### Next
 
 T3 (v0.8.1, c-bump): cross-cutting determinism integration tests (selfCheck round-trip on non-poisoned synthetic bundles, production-determinism dual-run, sub-RNG positive/negative isolation, poisoned-bundle replay throws, pre-step abort vacuous selfCheck, bundle→script conversion regression) + structural docs (ARCHITECTURE.md Component Map, drift-log entry, ai-first-dev-roadmap status update, ai-integration.md Tier-1 reference).
+
+---
+
+## 2026-04-27 — Spec 3 T3: Determinism integration tests + structural docs (v0.8.1, c-bump)
+
+**Action:** Cross-cutting determinism integration tests covering Spec 3 design v10 §12 acceptance criteria that needed both T1's policies AND T2's harness in place. Plus the architecture-level docs that close out the implementation.
+
+### Tests added (`tests/synthetic-determinism.test.ts`, 7 cases)
+
+1. **`selfCheck round-trip`** — Non-poisoned bundle with `ticksRun >= 1` passes `replayer.selfCheck().ok`. Verifies the headline replay-determinism guarantee.
+2. **`production-determinism dual-run`** — Same `policySeed` + same setup → deep-equal bundles modulo sessionId/recordedAt and `WorldMetrics.durationMs` (stripped via `.map(stripTickMetrics)`).
+3. **`sub-RNG isolation positive`** — Policy using `ctx.random()` is replay-deterministic. Each policy emits a no-op `spawn` command per tick so the bundle has payloads (avoids the `session-replayer.ts:270` no-payload short-circuit).
+4. **`sub-RNG isolation negative`** — Policy calling `ctx.world.random()` directly (contract violation) causes `selfCheck.ok === false` at the first periodic snapshot. Proves the safety net catches accidental policy-side perturbations of `world.rng`.
+5. **`poisoned-bundle replay throws`** — `selfCheck` on a `stopReason === 'poisoned'` bundle re-throws the original tick failure. The terminal-at-failed-tick segment is NOT skipped (per session-replayer.ts:286: `failedTick < segmentEnd` only).
+6. **`pre-step abort vacuous`** — Policy throws on tick 1 → `ticksRun === 0`, terminal snapshot at the same tick as initial → selfCheck returns `ok:true` vacuously over zero-length segment.
+7. **`bundle → script conversion regression`** — Record a bundle via `randomPolicy`, convert via the `+1` formula on `submissionTick`, replay through `scriptedPolicy`, assert identical command stream (types + data + submissionTicks). Locks down the documented bundle→script workflow against future regressions.
+
+### Structural docs
+
+- `docs/architecture/ARCHITECTURE.md`: Component Map row added for Synthetic Playtest Harness — tier-1 autonomous-driver primitive with sub-RNG sandboxing.
+- `docs/architecture/drift-log.md`: 2026-04-27 entry describing the full Spec 3 implementation chain (v0.7.20 + v0.8.0 + v0.8.1) including the `b`-bump rationale, sub-RNG invariant, determinism contract, and convergence trajectory (10 design iterations + 7 plan iterations).
+- `docs/design/ai-first-dev-roadmap.md`: Spec 3 status → **Implemented** with version range and design + plan links. Spec 1's status corrected to **Implemented** as well (had been left as `Drafted`).
+- `docs/guides/ai-integration.md`: appended a "Synthetic Playtest Harness (Tier 1)" subsection linking to the new guide.
+- `docs/changelog.md`: 0.8.1 entry above 0.8.0.
+- `docs/devlog/summary.md`: prepended one line; noted Spec 3 implementation complete.
+- This detailed entry.
+
+### Code review
+
+Multi-CLI code review on T3 diff before commit. Synthesis at `docs/reviews/synthetic-playtest-T3/2026-04-27/<iter>/REVIEW.md`. Iterated to convergence.
+
+### Validation
+
+All four engine gates pass:
+- `npm test` → 798 passed + 2 todo (47 test files), 7 new in `tests/synthetic-determinism.test.ts`.
+- `npm run typecheck` → clean.
+- `npm run lint` → clean.
+- `npm run build` → clean.
+
+### Reasoning
+
+T3 is the c-bump that ties the implementation off. The six positive/negative/edge-case determinism tests establish the safety net for Spec 3's documented contracts, ensuring future regressions in either the harness or the underlying SessionRecorder/SessionReplayer machinery surface as test failures. The `+1` bundle→script regression test is particularly load-bearing — without it, a future change that broke the off-by-one alignment between submissionTick and PolicyContext.tick would silently misalign every regression-from-bug-bundle workflow.
+
+### Spec 3 implementation summary (T1+T2+T3)
+
+- 3 commits: T1 (v0.7.20) policy types + 3 built-in policies; T2 (v0.8.0, b-bump) runSynthPlaytest harness + SessionRecorderConfig + SessionMetadata.sourceKind widening; T3 (v0.8.1) integration tests + structural docs.
+- 39 new tests across 3 commits (13 + 19 + 7).
+- 6 new ADRs (17, 18, 19, 20, 20a, 21, 22).
+- 1 new guide (`docs/guides/synthetic-playtest.md`).
+- Branch: `agent/synthetic-playtest`. Awaiting explicit user merge authorization (b-bump in T2 means this isn't auto-mergeable per AGENTS.md — needs explicit `merge` confirmation).
+
+### Next
+
+Surface for user merge authorization. After merge, the synthetic-playtest harness is available for the planned game project (per memory file: user has separate game project planned to build on civ-engine). Tier-2 specs (corpus indexing #7, behavioral metrics #8, AI playtester agent #9) can build on the synthetic-bundle corpus this harness generates.
diff --git a/docs/devlog/summary.md b/docs/devlog/summary.md
index bd31536..aff2762 100644
--- a/docs/devlog/summary.md
+++ b/docs/devlog/summary.md
@@ -1,5 +1,6 @@
 # Devlog Summary
 
+- 2026-04-27: Spec 3 T3 (v0.8.1) — Determinism integration tests (selfCheck round-trip, production-determinism dual-run, sub-RNG positive/negative, poisoned-bundle replay throws, pre-step abort vacuous, bundle→script regression) + structural docs (ARCHITECTURE Component Map, drift-log, roadmap status → Implemented for Spec 3 + Spec 1, ai-integration Tier-1 reference). 7 new tests; 798 passed + 2 todo. **Spec 3 implementation complete (T1+T2+T3); awaiting merge authorization.**
 - 2026-04-27: Spec 3 T2 (v0.8.0, **b-bump**) — `runSynthPlaytest` harness + SessionMetadata.sourceKind union widened to add 'synthetic' (breaking for assertNever consumers, per ADR 20). Sub-RNG init via `Math.floor(world.random() * 0x1_0000_0000)` pre-connect; `terminalSnapshot:true` hardcoded; 5-value stopReason union with separate connect-time-failure (re-throw) and mid-tick-failure ('sinkError') paths. ADRs 20, 20a, 21, 22. 17 new harness tests; 789 passed + 2 todo.
 - 2026-04-27: Spec 3 T1 (v0.7.20) — Synthetic Playtest Policy interface + 3 built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`). 4-generic shape matches `World<...>`; sub-RNG via `PolicyContext.random()` (ADR 19). `runSynthPlaytest` harness ships in T2 (v0.8.0). 13 new tests; 772 passed + 2 todo.
 - 2026-04-27: Session-recording followup 4 (v0.7.19) — Clause-paired determinism tests for §11.1 clauses 1, 2, 7 (clean+violation each). Clauses 4, 6 added as `it.todo` (hard fixtures). 6/8 testable clauses covered now (was 3/8). 759 tests + 2 todo.
diff --git a/docs/guides/ai-integration.md b/docs/guides/ai-integration.md
index dc20dd1..e934ce7 100644
--- a/docs/guides/ai-integration.md
+++ b/docs/guides/ai-integration.md
@@ -251,3 +251,24 @@ for (const marker of stuckMarkers) {
 ```
 
 See `docs/guides/session-recording.md` for the canonical reference.
+
+## Synthetic Playtest Harness (Tier 1)
+
+`runSynthPlaytest` is the Tier-1 piece of the AI-first feedback loop (Spec 3 of `docs/design/ai-first-dev-roadmap.md`). It drives a `World` autonomously via pluggable `Policy` functions for N ticks and produces a replayable `SessionBundle`. Tier-2 specs (corpus indexing, behavioral metrics, AI playtester agent) build on the synthetic-bundle corpus this harness generates.
+
+```typescript
+import { runSynthPlaytest, randomPolicy } from 'civ-engine';
+
+const result = runSynthPlaytest({
+  world: setup(),
+  policies: [randomPolicy({ catalog: [/* ... */] })],
+  maxTicks: 1000,
+  policySeed: 42,  // optional; deterministic across runs.
+});
+
+// result.bundle is a SessionBundle replayable via SessionReplayer.
+// CI guard: result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1
+//           → expect(replayer.selfCheck().ok).toBe(true).
+```
+
+See `docs/guides/synthetic-playtest.md` for the policy-authoring guide, determinism contract, and bundle→script regression workflow.
diff --git a/package.json b/package.json
index 03e1b93..8a2ae53 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "civ-engine",
-  "version": "0.8.0",
+  "version": "0.8.1",
   "type": "module",
   "main": "./dist/index.js",
   "types": "./dist/index.d.ts",
diff --git a/src/version.ts b/src/version.ts
index 1f1ad8a..2db5321 100644
--- a/src/version.ts
+++ b/src/version.ts
@@ -4,4 +4,4 @@
  * `metadata.engineVersion` in session bundles. Avoids relying on
  * `process.env.npm_package_version` which is only set under `npm run`.
  */
-export const ENGINE_VERSION = '0.8.0' as const;
+export const ENGINE_VERSION = '0.8.1' as const;
diff --git a/tests/synthetic-determinism.test.ts b/tests/synthetic-determinism.test.ts
new file mode 100644
index 0000000..e25dc1e
--- /dev/null
+++ b/tests/synthetic-determinism.test.ts
@@ -0,0 +1,220 @@
+import { describe, expect, it } from 'vitest';
+import {
+  SessionReplayer,
+  World,
+  randomPolicy,
+  runSynthPlaytest,
+  scriptedPolicy,
+  type WorldConfig,
+} from '../src/index.js';
+
+const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
+
+interface Cmds { spawn: { id: number } }
+
+const setupWorld = (): World<Record<string, never>, Cmds> => {
+  const w = new World<Record<string, never>, Cmds>(mkConfig());
+  w.registerHandler('spawn', () => undefined);
+  w.registerComponent('rng-result');
+  w.registerSystem({
+    name: 'rng-system',
+    phase: 'update',
+    execute: (lw) => {
+      const id = lw.createEntity();
+      lw.setComponent(id, 'rng-result', { v: lw.random() });
+    },
+  });
+  return w;
+};
+
+describe('synthetic-playtest determinism — selfCheck round-trip', () => {
+  it('non-poisoned bundle with ticksRun>=1 passes selfCheck.ok', () => {
+    const result = runSynthPlaytest({
+      world: setupWorld(),
+      policies: [randomPolicy<Record<string, never>, Cmds>({
+        catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      })],
+      maxTicks: 30,
+      policySeed: 42,
+    });
+    expect(result.ok).toBe(true);
+    expect(result.stopReason).toBe('maxTicks');
+    expect(result.ticksRun).toBeGreaterThanOrEqual(1);
+
+    const replayer = SessionReplayer.fromBundle(result.bundle, {
+      worldFactory: (snap) => {
+        const w = setupWorld();
+        w.applySnapshot(snap);
+        return w;
+      },
+    });
+    expect(replayer.selfCheck().ok).toBe(true);
+  });
+});
+
+describe('synthetic-playtest production-determinism (dual-run)', () => {
+  it('same policySeed + same setup produces structurally identical bundles', () => {
+    const opts = {
+      policies: [randomPolicy<Record<string, never>, Cmds>({
+        catalog: [
+          (ctx: { tick: number }) => ({ type: 'spawn' as const, data: { id: ctx.tick } }),
+        ],
+      })],
+      maxTicks: 25,
+      policySeed: 7,
+    };
+    const r1 = runSynthPlaytest({ world: setupWorld(), ...opts });
+    const r2 = runSynthPlaytest({ world: setupWorld(), ...opts });
+
+    expect(r1.bundle.commands).toEqual(r2.bundle.commands);
+    expect(r1.bundle.executions).toEqual(r2.bundle.executions);
+
+    // Tick entries: deterministic fields only (strip metrics — durationMs is performance.now()-backed).
+    const stripTickMetrics = (t: typeof r1.bundle.ticks[number]) => ({
+      tick: t.tick, diff: t.diff, events: t.events, debug: t.debug,
+    });
+    expect(r1.bundle.ticks.map(stripTickMetrics)).toEqual(r2.bundle.ticks.map(stripTickMetrics));
+
+    expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
+    expect(r1.bundle.snapshots).toEqual(r2.bundle.snapshots);
+    expect(r1.bundle.failures).toEqual(r2.bundle.failures);
+
+    const stripVolatile = (m: typeof r1.bundle.metadata) => {
+      const copy = { ...m };
+      delete (copy as Partial<typeof copy>).sessionId;
+      delete (copy as Partial<typeof copy>).recordedAt;
+      return copy;
+    };
+    expect(stripVolatile(r1.bundle.metadata)).toEqual(stripVolatile(r2.bundle.metadata));
+  });
+});
+
+describe('synthetic-playtest sub-RNG isolation', () => {
+  // Each policy emits at least one command per tick so the bundle has command payloads.
+  // SessionReplayer.selfCheck (session-replayer.ts:270-276) short-circuits on no-payload
+  // bundles with a console.warn — we need a non-empty bundle to drive the actual segment
+  // comparison and detect (or fail to detect) RNG divergence.
+
+  it('positive: policy using ctx.random() is replay-deterministic', () => {
+    const result = runSynthPlaytest({
+      world: setupWorld(),
+      policies: [(ctx) => {
+        const r = ctx.random();
+        return [{ type: 'spawn' as const, data: { id: Math.floor(r * 1000) } }];
+      }],
+      maxTicks: 20,
+    });
+    const replayer = SessionReplayer.fromBundle(result.bundle, {
+      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
+    });
+    expect(replayer.selfCheck().ok).toBe(true);
+  });
+
+  it('negative: policy calling world.random() directly causes selfCheck divergence', () => {
+    const result = runSynthPlaytest({
+      world: setupWorld(),
+      policies: [(ctx) => {
+        // Contract violation: perturbs world.rng between ticks. Replay won't reproduce
+        // these calls (replay never invokes policies), so world.rng state at snapshots
+        // diverges.
+        const r = ctx.world.random();
+        return [{ type: 'spawn' as const, data: { id: Math.floor(r * 1000) } }];
+      }],
+      maxTicks: 20,
+    });
+    expect(result.ok).toBe(true);
+    const replayer = SessionReplayer.fromBundle(result.bundle, {
+      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
+    });
+    const checkResult = replayer.selfCheck();
+    expect(checkResult.ok).toBe(false);
+    expect(checkResult.stateDivergences.length).toBeGreaterThan(0);
+  });
+});
+
+describe('synthetic-playtest poisoned-bundle replay', () => {
+  it('selfCheck on a stopReason="poisoned" bundle re-throws the original tick failure', () => {
+    const setup = (): World<Record<string, never>, Cmds> => {
+      const w = setupWorld();
+      w.registerSystem({
+        name: 'poison-on-3', phase: 'update',
+        execute: (lw) => { if (lw.tick === 3) throw new Error('intentional-poison'); },
+      });
+      return w;
+    };
+    const result = runSynthPlaytest({
+      world: setup(),
+      // Emit at least one command per tick so bundle.commands is non-empty —
+      // otherwise selfCheck no-payload short-circuit at session-replayer.ts:270
+      // returns ok:true vacuously instead of replaying.
+      policies: [(ctx) => [{ type: 'spawn' as const, data: { id: ctx.tick } }]],
+      maxTicks: 10,
+    });
+    expect(result.stopReason).toBe('poisoned');
+    expect(result.bundle.commands.length).toBeGreaterThan(0);
+
+    const replayer = SessionReplayer.fromBundle(result.bundle, {
+      worldFactory: (snap) => { const w = setup(); w.applySnapshot(snap); return w; },
+    });
+    // selfCheck doesn't return ok:false — it re-throws while replaying the failed segment.
+    expect(() => replayer.selfCheck()).toThrow();
+  });
+});
+
+describe('synthetic-playtest pre-step abort', () => {
+  it('policy throws on tick 1: ticksRun=0, terminal at initial tick, selfCheck vacuously ok', () => {
+    const result = runSynthPlaytest({
+      world: setupWorld(),
+      policies: [() => { throw new Error('throw-on-first-call'); }],
+      maxTicks: 10,
+    });
+    expect(result.stopReason).toBe('policyError');
+    expect(result.ticksRun).toBe(0);
+
+    const replayer = SessionReplayer.fromBundle(result.bundle, {
+      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
+    });
+    // No segments to validate (initial == terminal at tick 0); selfCheck returns ok:true vacuously.
+    const checkResult = replayer.selfCheck();
+    expect(checkResult.ok).toBe(true);
+  });
+});
+
+describe('synthetic-playtest bundle->script conversion', () => {
+  it('record → +1 conversion → replay reproduces identical command stream', () => {
+    // 1. Record a synthetic bundle via randomPolicy.
+    const r1 = runSynthPlaytest({
+      world: setupWorld(),
+      policies: [randomPolicy<Record<string, never>, Cmds>({
+        catalog: [
+          (ctx) => ({ type: 'spawn', data: { id: ctx.tick * 10 } }),
+        ],
+      })],
+      maxTicks: 10,
+      policySeed: 99,
+    });
+    expect(r1.bundle.commands.length).toBeGreaterThan(0);
+
+    // 2. Convert with the +1 formula (per design v10 §6.3).
+    const sequence = r1.bundle.commands.map((cmd) => ({
+      tick: cmd.submissionTick + 1,
+      type: cmd.type as keyof Cmds & string,
+      data: cmd.data as Cmds[keyof Cmds],
+    }));
+
+    // 3. Replay through a fresh harness with scriptedPolicy.
+    const r2 = runSynthPlaytest({
+      world: setupWorld(),
+      policies: [scriptedPolicy<Record<string, never>, Cmds>(sequence)],
+      maxTicks: 10,
+    });
+
+    // 4. Assert identical command stream (types + data + submissionTicks).
+    expect(r2.bundle.commands.length).toBe(r1.bundle.commands.length);
+    for (let i = 0; i < r1.bundle.commands.length; i++) {
+      expect(r2.bundle.commands[i].type).toBe(r1.bundle.commands[i].type);
+      expect(r2.bundle.commands[i].data).toEqual(r1.bundle.commands[i].data);
+      expect(r2.bundle.commands[i].submissionTick).toBe(r1.bundle.commands[i].submissionTick);
+    }
+  });
+});
