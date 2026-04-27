diff --git a/docs/design/2026-04-27-behavioral-metrics-implementation-plan.md b/docs/design/2026-04-27-behavioral-metrics-implementation-plan.md
index 159db50..d21e52e 100644
--- a/docs/design/2026-04-27-behavioral-metrics-implementation-plan.md
+++ b/docs/design/2026-04-27-behavioral-metrics-implementation-plan.md
@@ -2,7 +2,7 @@
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
-**Plan revision:** v1 (2026-04-27).
+**Plan revision:** v2 (2026-04-27) — addresses iter-1 multi-CLI plan review (Codex 3 HIGH + 2 MED; Opus 2 HIGH + 2 MED + 1 LOW). v2 expands T1 Step 7 from prose bullets to 9 concrete factory + test code blocks; fixes ADR count (5 ADRs 23-27 consistent across all sites); resolves `mkBundle` helper location (per-file duplication); strengthens runner single-pass test; fixes `failedTicks?.length > 0` strict-mode bug to `(failedTicks?.length ?? 0) > 0`; corrects commit-message version reference (v10 → v4); expands T2 placeholders.
 
 **Goal:** Implement Spec 8 (Behavioral Metrics over Corpus) per `docs/design/2026-04-27-behavioral-metrics-design.md` (v4, converged after 4 multi-CLI design review iterations).
 
@@ -32,7 +32,7 @@ Per AGENTS.md doc-discipline:
 - `docs/api-reference.md` — sections for new public types/methods.
 - `package.json` + `src/version.ts` + `README.md` (badge) — version bump.
 
-T1 also: ADRs 23 + 24 in `docs/architecture/decisions.md` (numbered after Spec 3's ADRs 17-22 land); new `docs/guides/behavioral-metrics.md`; README.md Feature Overview row + Public Surface bullet; `docs/README.md` index entry.
+T1 also: 5 new ADRs (23-27) in `docs/architecture/decisions.md` (continues numbering after Spec 3's ADRs 17-22, which already landed); new `docs/guides/behavioral-metrics.md`; README.md Feature Overview row + Public Surface bullet; `docs/README.md` index entry.
 
 T2 also: `docs/architecture/ARCHITECTURE.md` Component Map row + `docs/architecture/drift-log.md` entry + `docs/design/ai-first-dev-roadmap.md` Spec 8 status update + `docs/guides/ai-integration.md` Tier-2 reference + `docs/guides/synthetic-playtest.md` cross-reference to behavioral-metrics.
 
@@ -338,65 +338,440 @@ describe('sessionLengthStats', () => {
 
 ### Step 6: Run tests — expect PASS
 
-### Step 7: Implement remaining built-ins one at a time, with tests
+### Step 7: Implement remaining 9 built-ins (TDD per metric)
 
-For each of the 9 remaining built-ins, follow TDD: failing test first, then implementation. Each is a small accumulator pattern modeled on `bundleCount` (counters) or `sessionLengthStats` (Stats over a buffered numeric).
+For each of the 9 remaining built-ins, follow TDD: failing test first, then implementation. Each sub-step is independently committable but the whole batch ships in T1 (Step 14).
 
-- [ ] **`commandRateStats`**: state is `number[]`; observe pushes `bundle.metadata.durationTicks > 0 ? bundle.commands.length / bundle.metadata.durationTicks : 0`; finalize is `computeStats`.
+#### Step 7a: `commandRateStats`
 
-- [ ] **`eventRateStats`**: same shape; pushes `durationTicks > 0 ? sum(bundle.ticks[i].events.length) / durationTicks : 0`.
+- [ ] Add to `tests/behavioral-metrics-builtins.test.ts`:
 
-- [ ] **`commandTypeCounts`**: state is `Map<string, number>`; observe iterates `bundle.commands` and increments by `cmd.type`; finalize converts to plain object.
+```ts
+import { commandRateStats } from '../src/behavioral-metrics.js';
+
+describe('commandRateStats', () => {
+  it('empty corpus returns count:0 + null fields', () => {
+    const result = runMetrics([], [commandRateStats()]);
+    expect(result.commandRateStats).toEqual({
+      count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null,
+    });
+  });
+
+  it('zero-durationTicks bundle contributes 0 (no divide-by-zero)', () => {
+    const bundle = mkBundle({
+      metadata: { ...mkBundle().metadata, durationTicks: 0 },
+      commands: [{ submissionTick: 0, sequence: 0, type: 'spawn', data: { id: 1 },
+        result: { schemaVersion: 1, accepted: true, commandType: 'spawn', code: 'OK', message: '', details: null, tick: 0, sequence: 0, validatorIndex: null } } as never],
+    });
+    const result = runMetrics([bundle], [commandRateStats()]);
+    const stats = result.commandRateStats as Stats;
+    expect(stats.count).toBe(1);
+    expect(stats.min).toBe(0);
+  });
+
+  it('multi-bundle corpus computes per-bundle rates correctly', () => {
+    // bundle A: 10 commands over 10 ticks → rate 1.0
+    // bundle B: 5 commands over 10 ticks → rate 0.5
+    const mkB = (n: number, ticks: number) => mkBundle({
+      metadata: { ...mkBundle().metadata, durationTicks: ticks },
+      commands: Array.from({ length: n }, (_, i) => ({
+        submissionTick: 0, sequence: i, type: 'spawn', data: { id: i },
+        result: { schemaVersion: 1, accepted: true, commandType: 'spawn', code: 'OK', message: '', details: null, tick: 0, sequence: i, validatorIndex: null },
+      })) as never,
+    });
+    const result = runMetrics([mkB(10, 10), mkB(5, 10)], [commandRateStats()]);
+    const stats = result.commandRateStats as Stats;
+    expect(stats.count).toBe(2);
+    expect(stats.min).toBe(0.5);
+    expect(stats.max).toBe(1.0);
+    expect(stats.mean).toBe(0.75);
+  });
+});
+```
+
+- [ ] Append to `src/behavioral-metrics.ts`:
+
+```ts
+export function commandRateStats(name: string = 'commandRateStats'): Metric<number[], Stats> {
+  return {
+    name,
+    create: () => [],
+    observe: (state, bundle) => {
+      const ticks = bundle.metadata.durationTicks;
+      const rate = ticks > 0 ? bundle.commands.length / ticks : 0;
+      state.push(rate);
+      return state;
+    },
+    finalize: (state) => computeStats(state),
+  };
+}
+```
+
+- [ ] Run: `npm test -- behavioral-metrics-builtins`. Expected: PASS.
+
+#### Step 7b: `eventRateStats`
+
+- [ ] Add tests (single + multi-bundle, similar shape to 7a; the per-bundle rate is `sumOfEvents / durationTicks` with `0` for zero-duration).
+
+- [ ] Append to `src/behavioral-metrics.ts`:
+
+```ts
+export function eventRateStats(name: string = 'eventRateStats'): Metric<number[], Stats> {
+  return {
+    name,
+    create: () => [],
+    observe: (state, bundle) => {
+      const ticks = bundle.metadata.durationTicks;
+      let totalEvents = 0;
+      for (const t of bundle.ticks) totalEvents += t.events.length;
+      state.push(ticks > 0 ? totalEvents / ticks : 0);
+      return state;
+    },
+    finalize: (state) => computeStats(state),
+  };
+}
+```
+
+- [ ] Run + verify pass.
+
+#### Step 7c: `commandTypeCounts`
+
+- [ ] Tests covering: empty corpus → `{}`; single bundle with 3 spawn commands → `{ spawn: 3 }`; multi-bundle aggregation correct.
+
+- [ ] Append:
+
+```ts
+export function commandTypeCounts(
+  name: string = 'commandTypeCounts',
+): Metric<Map<string, number>, Record<string, number>> {
+  return {
+    name,
+    create: () => new Map(),
+    observe: (state, bundle) => {
+      for (const cmd of bundle.commands) {
+        state.set(cmd.type, (state.get(cmd.type) ?? 0) + 1);
+      }
+      return state;
+    },
+    finalize: (state) => {
+      const obj: Record<string, number> = {};
+      for (const [k, v] of state) obj[k] = v;
+      return obj;
+    },
+  };
+}
+```
+
+#### Step 7d: `eventTypeCounts`
+
+- [ ] Same shape as 7c but over `bundle.ticks[].events[].type`. Tests: empty → `{}`; single bundle with mixed event types aggregates correctly.
+
+- [ ] Append:
+
+```ts
+export function eventTypeCounts(
+  name: string = 'eventTypeCounts',
+): Metric<Map<string, number>, Record<string, number>> {
+  return {
+    name,
+    create: () => new Map(),
+    observe: (state, bundle) => {
+      for (const tickEntry of bundle.ticks) {
+        for (const ev of tickEntry.events) {
+          state.set(String(ev.type), (state.get(String(ev.type)) ?? 0) + 1);
+        }
+      }
+      return state;
+    },
+    finalize: (state) => {
+      const obj: Record<string, number> = {};
+      for (const [k, v] of state) obj[k] = v;
+      return obj;
+    },
+  };
+}
+```
+
+#### Step 7e: `failureBundleRate`
+
+- [ ] Tests:
+
+```ts
+describe('failureBundleRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [failureBundleRate()]).failureBundleRate).toBe(0);
+  });
+
+  it('all-clean corpus → 0', () => {
+    expect(runMetrics([mkBundle(), mkBundle()], [failureBundleRate()]).failureBundleRate).toBe(0);
+  });
+
+  it('mixed corpus computes ratio', () => {
+    const failing = mkBundle({ metadata: { ...mkBundle().metadata, failedTicks: [3] } });
+    const result = runMetrics([mkBundle(), failing, mkBundle(), failing], [failureBundleRate()]);
+    expect(result.failureBundleRate).toBe(0.5);  // 2 of 4
+  });
+});
+```
+
+- [ ] Append:
+
+```ts
+export function failureBundleRate(
+  name: string = 'failureBundleRate',
+): Metric<{ withFailure: number; total: number }, number> {
+  return {
+    name,
+    create: () => ({ withFailure: 0, total: 0 }),
+    observe: (state, bundle) => {
+      state.total++;
+      // (failedTicks?.length ?? 0) > 0 — strict-mode-safe pattern.
+      if ((bundle.metadata.failedTicks?.length ?? 0) > 0) state.withFailure++;
+      return state;
+    },
+    finalize: (state) => state.total > 0 ? state.withFailure / state.total : 0,
+  };
+}
+```
+
+#### Step 7f: `failedTickRate`
+
+- [ ] Tests:
+
+```ts
+describe('failedTickRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [failedTickRate()]).failedTickRate).toBe(0);
+  });
+
+  it('zero-tick corpus (all bundles aborted on tick 0) → 0', () => {
+    const aborted = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 0 } });
+    expect(runMetrics([aborted, aborted], [failedTickRate()]).failedTickRate).toBe(0);
+  });
+
+  it('computes total failed ticks / total duration ticks', () => {
+    const a = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 100, failedTicks: [50] } });
+    const b = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 100, failedTicks: [] } });
+    // total: 1 failed / 200 ticks = 0.005
+    expect(runMetrics([a, b], [failedTickRate()]).failedTickRate).toBe(0.005);
+  });
+});
+```
+
+- [ ] Append:
+
+```ts
+export function failedTickRate(
+  name: string = 'failedTickRate',
+): Metric<{ failedTicks: number; durationTicks: number }, number> {
+  return {
+    name,
+    create: () => ({ failedTicks: 0, durationTicks: 0 }),
+    observe: (state, bundle) => {
+      state.failedTicks += bundle.metadata.failedTicks?.length ?? 0;
+      state.durationTicks += bundle.metadata.durationTicks;
+      return state;
+    },
+    finalize: (state) => state.durationTicks > 0 ? state.failedTicks / state.durationTicks : 0,
+  };
+}
+```
+
+#### Step 7g: `incompleteBundleRate`
+
+- [ ] Tests:
+
+```ts
+describe('incompleteBundleRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [incompleteBundleRate()]).incompleteBundleRate).toBe(0);
+  });
+
+  it('all-complete corpus → 0', () => {
+    expect(runMetrics([mkBundle(), mkBundle()], [incompleteBundleRate()]).incompleteBundleRate).toBe(0);
+  });
+
+  it('mixed corpus computes ratio', () => {
+    const incomplete = mkBundle({ metadata: { ...mkBundle().metadata, incomplete: true } });
+    const result = runMetrics([mkBundle(), incomplete, mkBundle(), incomplete], [incompleteBundleRate()]);
+    expect(result.incompleteBundleRate).toBe(0.5);
+  });
+});
+```
+
+- [ ] Append:
 
-- [ ] **`eventTypeCounts`**: same shape over `bundle.ticks[].events[].type`.
+```ts
+export function incompleteBundleRate(
+  name: string = 'incompleteBundleRate',
+): Metric<{ incomplete: number; total: number }, number> {
+  return {
+    name,
+    create: () => ({ incomplete: 0, total: 0 }),
+    observe: (state, bundle) => {
+      state.total++;
+      if (bundle.metadata.incomplete === true) state.incomplete++;
+      return state;
+    },
+    finalize: (state) => state.total > 0 ? state.incomplete / state.total : 0,
+  };
+}
+```
 
-- [ ] **`failureBundleRate`**: state `{ withFailure: number; total: number }`; observe increments `total` and `withFailure` if `bundle.metadata.failedTicks?.length > 0`; finalize returns `total > 0 ? withFailure / total : 0`.
+#### Step 7h: `commandValidationAcceptanceRate`
 
-- [ ] **`failedTickRate`**: state `{ failedTicks: number; durationTicks: number }`; observe sums both; finalize returns `durationTicks > 0 ? failedTicks / durationTicks : 0`.
+- [ ] Tests:
 
-- [ ] **`incompleteBundleRate`**: state `{ incomplete: number; total: number }`; observe counts `metadata.incomplete === true`; finalize returns `total > 0 ? incomplete / total : 0`.
+```ts
+describe('commandValidationAcceptanceRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0);
+  });
 
-- [ ] **`commandValidationAcceptanceRate`**: state `{ accepted: number; total: number }`; observe iterates `bundle.commands` summing `total` and `accepted` if `cmd.result.accepted`; finalize returns `total > 0 ? accepted / total : 0`.
+  it('zero-submission corpus → 0', () => {
+    expect(runMetrics([mkBundle()], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0);
+  });
 
-- [ ] **`executionFailureRate`**: state `{ failed: number; total: number }`; observe iterates `bundle.executions` summing `total` and `failed` if `!exec.executed`; finalize returns `total > 0 ? failed / total : 0`.
+  it('mixed acceptance computes ratio over bundle.commands[].result.accepted', () => {
+    const mkCmd = (accepted: boolean) => ({
+      submissionTick: 0, sequence: 0, type: 'spawn', data: { id: 1 },
+      result: { schemaVersion: 1, accepted, commandType: 'spawn',
+        code: accepted ? 'OK' : 'REJECT', message: '', details: null, tick: 0, sequence: 0, validatorIndex: null },
+    } as never);
+    const bundle = mkBundle({ commands: [mkCmd(true), mkCmd(true), mkCmd(false), mkCmd(true)] });
+    expect(runMetrics([bundle], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0.75);
+  });
+});
+```
+
+- [ ] Append:
+
+```ts
+export function commandValidationAcceptanceRate(
+  name: string = 'commandValidationAcceptanceRate',
+): Metric<{ accepted: number; total: number }, number> {
+  return {
+    name,
+    create: () => ({ accepted: 0, total: 0 }),
+    observe: (state, bundle) => {
+      for (const cmd of bundle.commands) {
+        state.total++;
+        if (cmd.result.accepted) state.accepted++;
+      }
+      return state;
+    },
+    finalize: (state) => state.total > 0 ? state.accepted / state.total : 0,
+  };
+}
+```
+
+#### Step 7i: `executionFailureRate`
+
+- [ ] Tests:
+
+```ts
+describe('executionFailureRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [executionFailureRate()]).executionFailureRate).toBe(0);
+  });
+
+  it('zero-execution corpus → 0', () => {
+    expect(runMetrics([mkBundle()], [executionFailureRate()]).executionFailureRate).toBe(0);
+  });
+
+  it('mixed executed/failed computes ratio over bundle.executions[].executed', () => {
+    const mkExec = (executed: boolean) => ({
+      schemaVersion: 1, submissionSequence: 0, executed, commandType: 'spawn',
+      code: executed ? 'OK' : 'command_handler_threw', message: '', details: null, tick: 1,
+    } as never);
+    const bundle = mkBundle({
+      executions: [mkExec(true), mkExec(false), mkExec(true), mkExec(false)],
+    });
+    expect(runMetrics([bundle], [executionFailureRate()]).executionFailureRate).toBe(0.5);
+  });
+});
+```
+
+- [ ] Append:
+
+```ts
+export function executionFailureRate(
+  name: string = 'executionFailureRate',
+): Metric<{ failed: number; total: number }, number> {
+  return {
+    name,
+    create: () => ({ failed: 0, total: 0 }),
+    observe: (state, bundle) => {
+      for (const exec of bundle.executions) {
+        state.total++;
+        if (!exec.executed) state.failed++;
+      }
+      return state;
+    },
+    finalize: (state) => state.total > 0 ? state.failed / state.total : 0,
+  };
+}
+```
 
-For each: write 3 tests (empty, single-bundle, multi-bundle) before implementing. Verify expected NumPy-linear percentiles for any `Stats` metrics (per spec §5.3).
+After Step 7i: run `npm test -- behavioral-metrics-builtins` — all 9 sub-step tests + the bundleCount/sessionLengthStats from Steps 1-6 = 33 tests, all PASS. Run `npm run typecheck` — clean.
 
 ### Step 8: Implement `runMetrics` extended cases (multiplexing, dup-name, iterable-consumed-once)
 
-- [ ] Add to `tests/behavioral-metrics-runner.test.ts`:
+- [ ] Create `tests/behavioral-metrics-runner.test.ts` with its own `mkBundle` helper duplicated (~10 lines). Per-file duplication is the chosen resolution — extracting to a shared `_helpers/` file is over-engineering for two test files using the same factory.
 
 ```ts
 import { describe, expect, it } from 'vitest';
 import {
-  bundleCount, sessionLengthStats, commandTypeCounts,
+  bundleCount, sessionLengthStats, commandRateStats, eventRateStats,
+  commandTypeCounts, eventTypeCounts, failureBundleRate, failedTickRate,
+  incompleteBundleRate, commandValidationAcceptanceRate, executionFailureRate,
   runMetrics,
 } from '../src/behavioral-metrics.js';
-import type { Metric } from '../src/behavioral-metrics.js';
+import type { SessionBundle } from '../src/index.js';
 
-// (use mkBundle from -builtins.test.ts via shared helper or copy)
+const mkBundle = (overrides: Partial<SessionBundle> = {}): SessionBundle => ({
+  schemaVersion: 1,
+  metadata: {
+    sessionId: 's-1', engineVersion: '0.8.2', nodeVersion: 'v20',
+    recordedAt: 't', startTick: 0, endTick: 10, persistedEndTick: 10,
+    durationTicks: 10, sourceKind: 'session',
+  },
+  initialSnapshot: {} as never,
+  ticks: [], commands: [], executions: [], failures: [], snapshots: [], markers: [], attachments: [],
+  ...overrides,
+}) as SessionBundle;
 
 describe('runMetrics', () => {
-  it('multiplexes 11 built-ins in one pass', () => {
+  it('multiplexes 11 built-ins in one pass (verified by side-effecting iterator counter)', () => {
+    let bundlesIterated = 0;
+    function* source(count: number) {
+      for (let i = 0; i < count; i++) {
+        bundlesIterated++;
+        yield mkBundle();
+      }
+    }
     const metrics = [
-      bundleCount(), sessionLengthStats(), /* ... all 11 */
+      bundleCount(), sessionLengthStats(), commandRateStats(), eventRateStats(),
+      commandTypeCounts(), eventTypeCounts(), failureBundleRate(), failedTickRate(),
+      incompleteBundleRate(), commandValidationAcceptanceRate(), executionFailureRate(),
     ];
-    const result = runMetrics([mkBundle()], metrics);
+    const result = runMetrics(source(5), metrics);
+
+    // Single-pass invariant: the generator yielded exactly bundle-count times,
+    // not bundle-count × metric-count. If runMetrics rescanned per metric,
+    // bundlesIterated would be 5 * 11 = 55.
+    expect(bundlesIterated).toBe(5);
     expect(Object.keys(result)).toHaveLength(11);
+    expect(result.bundleCount).toBe(5);
   });
 
   it('throws on duplicate metric names', () => {
     expect(() => runMetrics([], [bundleCount(), bundleCount()])).toThrow(RangeError);
+    expect(() => runMetrics([], [bundleCount(), bundleCount('myAlias'), bundleCount()])).toThrow(RangeError);
   });
 
   it('iterates once: generator-source bundles are consumed', () => {
-    let yielded = 0;
-    function* source() {
-      yielded++;
-      yield mkBundle();
-      yielded++;
-      yield mkBundle();
-    }
+    function* source() { yield mkBundle(); yield mkBundle(); }
     const it1 = source();
     const r1 = runMetrics(it1, [bundleCount()]);
     expect(r1.bundleCount).toBe(2);
@@ -404,6 +779,13 @@ describe('runMetrics', () => {
     const r2 = runMetrics(it1, [bundleCount()]);
     expect(r2.bundleCount).toBe(0);
   });
+
+  it('Iterable<T> contract: arrays and Sets work too', () => {
+    const arrResult = runMetrics([mkBundle(), mkBundle()], [bundleCount()]);
+    expect(arrResult.bundleCount).toBe(2);
+    const setResult = runMetrics(new Set([mkBundle(), mkBundle(), mkBundle()]), [bundleCount()]);
+    expect(setResult.bundleCount).toBe(3);
+  });
 });
 ```
 
@@ -570,7 +952,12 @@ export {
 
 - [ ] Create `docs/guides/behavioral-metrics.md`: quickstart (10 lines: import, `runMetrics(bundles, [bundleCount(), sessionLengthStats()])`, log result), accumulator-contract authoring guide (a real `policySeedSpread` user metric example reading `bundle.metadata.policySeed`), CI pattern (with the `'onlyIn' in val` type-guard idiom), determinism + JSON-stable-null notes, links to spec.
 
-- [ ] `docs/architecture/decisions.md`: append ADR 23 (accumulator contract) + ADR 24 (engine-generic only). Pull text verbatim from design v4 §15. (Spec 8's other ADRs — 25, 26, 27 — also belong here. Land all four in this T1 commit.)
+- [ ] `docs/architecture/decisions.md`: append all 5 new Spec 8 ADRs (23, 24, 25, 26, 27). Pull text verbatim from design v4 §15:
+  - ADR 23: Accumulator-style metric contract over reducer or per-bundle-map+combine.
+  - ADR 24: Engine-generic built-ins only; game-semantic metrics are user-defined.
+  - ADR 25: `compareMetricsResults` returns deltas, not regression judgments.
+  - ADR 26: `Iterable<SessionBundle>` only in v1; `AsyncIterable` deferred to a separate `runMetricsAsync` in v2.
+  - ADR 27: Do NOT aggregate `stopReason` in v1.
 
 - [ ] `docs/changelog.md`: prepend `## 0.8.2 - 2026-04-27` entry. What shipped: 11 built-in metrics + accumulator contract + comparison helper. Validation: 4 gates clean.
 
@@ -599,7 +986,7 @@ export {
 ```
 feat(behavioral-metrics): T1 metric contract + 11 built-ins + comparison (v0.8.2)
 
-Implements Spec 8 (Behavioral Metrics over Corpus) per design v10.
+Implements Spec 8 (Behavioral Metrics over Corpus) per design v4.
 Tier-2 of the AI-first feedback loop.
 
 Surface added:
@@ -618,7 +1005,9 @@ ADRs 23 (accumulator), 24 (engine-generic only), 25 (deltas not
 judgments), 26 (Iterable only in v1; runMetricsAsync is a separate
 function in v2), 27 (no stopReason aggregation).
 
-Validation: 4 engine gates clean. N new tests across 4 test files.
+Validation: 4 engine gates clean. ~50 new tests across 4 test files
+(types: 2 cases; builtins: ~36 cases over 11 metrics × empty/single/
+multi; runner: 4 cases; compare: ~8 cases).
 
 Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
 ```
@@ -639,7 +1028,7 @@ Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
 - Modify: `docs/changelog.md`, `docs/devlog/*`.
 - Modify: `package.json` (`0.8.3`), `src/version.ts` (`0.8.3`), `README.md` (badge).
 
-### Step 1: Spec 3 → Spec 8 round-trip test
+### Step 1: Create test file with imports + helpers + Spec 3 → Spec 8 round-trip test
 
 - [ ] Create `tests/behavioral-metrics-determinism.test.ts`:
 
@@ -647,10 +1036,11 @@ Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
 import { describe, expect, it } from 'vitest';
 import {
   World, runSynthPlaytest, randomPolicy,
-  bundleCount, sessionLengthStats, commandRateStats,
-  commandValidationAcceptanceRate, executionFailureRate,
+  bundleCount, sessionLengthStats, commandRateStats, eventRateStats,
+  commandTypeCounts, eventTypeCounts, failureBundleRate, failedTickRate,
+  incompleteBundleRate, commandValidationAcceptanceRate, executionFailureRate,
   runMetrics, compareMetricsResults,
-  type WorldConfig,
+  type Metric, type SessionBundle, type WorldConfig,
 } from '../src/index.js';
 
 const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
@@ -662,94 +1052,169 @@ const setup = () => {
   return w;
 };
 
+const allBuiltins = (): Metric<unknown, unknown>[] => [
+  bundleCount() as Metric<unknown, unknown>,
+  sessionLengthStats() as Metric<unknown, unknown>,
+  commandRateStats() as Metric<unknown, unknown>,
+  eventRateStats() as Metric<unknown, unknown>,
+  commandTypeCounts() as Metric<unknown, unknown>,
+  eventTypeCounts() as Metric<unknown, unknown>,
+  failureBundleRate() as Metric<unknown, unknown>,
+  failedTickRate() as Metric<unknown, unknown>,
+  incompleteBundleRate() as Metric<unknown, unknown>,
+  commandValidationAcceptanceRate() as Metric<unknown, unknown>,
+  executionFailureRate() as Metric<unknown, unknown>,
+];
+
+// mkBundle helper for unit-test cases that don't go through runSynthPlaytest.
+const mkBundle = (overrides: Partial<SessionBundle> = {}): SessionBundle => ({
+  schemaVersion: 1,
+  metadata: {
+    sessionId: 's-1', engineVersion: '0.8.3', nodeVersion: 'v20',
+    recordedAt: 't', startTick: 0, endTick: 10, persistedEndTick: 10,
+    durationTicks: 10, sourceKind: 'session',
+  },
+  initialSnapshot: {} as never,
+  ticks: [], commands: [], executions: [], failures: [], snapshots: [], markers: [], attachments: [],
+  ...overrides,
+}) as SessionBundle;
+
 describe('Spec 3 → Spec 8 round-trip', () => {
-  it('runs N synthetic playtests, computes metrics, compares against itself with zero deltas', () => {
+  it('runs N synthetic playtests, computes metrics, compares against re-run with zero deltas', () => {
     const opts = {
       policies: [randomPolicy<Record<string, never>, Cmds>({
-        catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+        catalog: [() => ({ type: 'spawn' as const, data: { id: 1 } })],
       })],
       maxTicks: 50,
       policySeed: 42,
     };
-    // Same input → same bundles → same metrics.
     const bundles1 = Array.from({ length: 4 }, () => runSynthPlaytest({ world: setup(), ...opts }).bundle);
     const bundles2 = Array.from({ length: 4 }, () => runSynthPlaytest({ world: setup(), ...opts }).bundle);
 
-    const metrics = [
-      bundleCount(), sessionLengthStats(), commandRateStats(),
-      commandValidationAcceptanceRate(), executionFailureRate(),
+    // Use a smaller built-in set to keep the test focused (not commandTypeCounts/eventTypeCounts
+    // which return Records — those are exercised in Step 2 below).
+    const metrics: Metric<unknown, unknown>[] = [
+      bundleCount() as Metric<unknown, unknown>,
+      sessionLengthStats() as Metric<unknown, unknown>,
+      commandRateStats() as Metric<unknown, unknown>,
+      commandValidationAcceptanceRate() as Metric<unknown, unknown>,
+      executionFailureRate() as Metric<unknown, unknown>,
     ];
     const r1 = runMetrics(bundles1, metrics);
     const r2 = runMetrics(bundles2, metrics);
     const cmp = compareMetricsResults(r1, r2);
 
-    // Every numeric delta should be 0 (or null where data is null).
+    // Recursive walker: every numeric delta in the comparison must be 0 or null.
+    const checkZeroDelta = (node: unknown, path: string): void => {
+      if (node === null || typeof node !== 'object') return;
+      const obj = node as Record<string, unknown>;
+      if ('delta' in obj && 'pctChange' in obj) {
+        // NumericDelta — delta must be 0 or null.
+        if (obj.delta !== null) {
+          expect(obj.delta, `${path}.delta`).toBe(0);
+        }
+        return;
+      }
+      if ('equal' in obj && 'baseline' in obj && 'current' in obj) {
+        // OpaqueDelta — must be equal.
+        expect(obj.equal, `${path}.equal`).toBe(true);
+        return;
+      }
+      if ('onlyIn' in obj) {
+        // OnlyInComparison — should not appear: both runs produced the same metric set.
+        throw new Error(`unexpected only-in-side at ${path}`);
+      }
+      // Plain record — recurse.
+      for (const [k, v] of Object.entries(obj)) {
+        checkZeroDelta(v, `${path}.${k}`);
+      }
+    };
     for (const [name, entry] of Object.entries(cmp)) {
-      // Helper to walk: every numeric leaf must have delta 0 or null.
-      // (Implementation: use a recursive predicate.)
-      // ... (test body)
+      checkZeroDelta(entry, name);
     }
   });
 });
 ```
 
+- [ ] Run: `npm test -- behavioral-metrics-determinism`. Expected: PASS.
+
 ### Step 2: Order-insensitivity verification
 
-- [ ] Add test:
+- [ ] Append:
 
 ```ts
-it('built-ins are order-insensitive (reverse iteration produces identical results)', () => {
-  const bundles = /* build a few distinct bundles */;
-  const metrics = [/* all 11 built-ins */];
-  const r1 = runMetrics(bundles, metrics);
-  const r2 = runMetrics([...bundles].reverse(), metrics);
-  // For order-insensitive metrics (all 11 built-ins are), results should match exactly.
-  const cmp = compareMetricsResults(r1, r2);
-  // Walk: assert every numeric delta is 0.
+describe('order-insensitivity', () => {
+  it('built-ins are order-insensitive (reverse iteration produces identical results for non-Stats result shapes)', () => {
+    // Build distinct bundles with varying durationTicks + commands.
+    const bundles: SessionBundle[] = [
+      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 10 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 20 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 30 } }),
+    ];
+
+    // Use a focused metric set that returns plain values (not Records).
+    const metrics = allBuiltins();
+    const r1 = runMetrics(bundles, metrics);
+    const r2 = runMetrics([...bundles].reverse(), metrics);
+
+    // All 11 built-ins are order-insensitive — results must be deep-equal.
+    expect(r1).toEqual(r2);
+  });
 });
 ```
 
-### Step 3: User-defined metric round-trip
+### Step 3: User-defined metric integration
 
-- [ ] Add test:
+- [ ] Append:
 
 ```ts
-it('user-defined metric integrates cleanly with built-ins', () => {
-  const distinctSeedCount: Metric<Set<number>, number> = {
-    name: 'distinctSeedCount',
-    create: () => new Set(),
-    observe: (state, bundle) => {
-      if (bundle.metadata.policySeed !== undefined) state.add(bundle.metadata.policySeed);
-      return state;
-    },
-    finalize: (state) => state.size,
-  };
+describe('user-defined metric integration', () => {
+  it('custom Metric implements the contract correctly + multiplexes alongside built-ins', () => {
+    const distinctSeedCount: Metric<Set<number>, number> = {
+      name: 'distinctSeedCount',
+      create: () => new Set(),
+      observe: (state, bundle) => {
+        if (bundle.metadata.policySeed !== undefined) state.add(bundle.metadata.policySeed);
+        return state;
+      },
+      finalize: (state) => state.size,
+    };
 
-  const bundles = [/* bundles with policySeed 1, 2, 1, 3 */];
-  const result = runMetrics(bundles, [bundleCount(), distinctSeedCount]);
-  expect(result.bundleCount).toBe(4);
-  expect(result.distinctSeedCount).toBe(3);
+    const bundles: SessionBundle[] = [
+      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 1 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 2 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 1 } }),  // duplicate
+      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 3 } }),
+    ];
+    const result = runMetrics(bundles, [bundleCount() as Metric<unknown, unknown>, distinctSeedCount as Metric<unknown, unknown>]);
+    expect(result.bundleCount).toBe(4);
+    expect(result.distinctSeedCount).toBe(3);
+  });
 });
 ```
 
 ### Step 4: Volatile-metadata exclusion sanity
 
-- [ ] Add test:
+- [ ] Append:
 
 ```ts
-it('built-ins do not read sessionId or recordedAt', () => {
-  // Two bundles structurally identical except for sessionId/recordedAt.
-  const a = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'aaa', recordedAt: 'ta' } });
-  const b = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'bbb', recordedAt: 'tb' } });
-  const metrics = [/* all 11 built-ins */];
-  const r1 = runMetrics([a], metrics);
-  const r2 = runMetrics([b], metrics);
-  expect(r1).toEqual(r2);  // built-ins ignore sessionId/recordedAt
+describe('volatile-metadata exclusion', () => {
+  it('built-ins do not read sessionId or recordedAt', () => {
+    // Two bundles structurally identical except for sessionId/recordedAt.
+    const a = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'aaa', recordedAt: 'ta' } });
+    const b = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'bbb', recordedAt: 'tb' } });
+    const metrics = allBuiltins();
+    const r1 = runMetrics([a], metrics);
+    const r2 = runMetrics([b], metrics);
+    expect(r1).toEqual(r2);  // built-ins ignore sessionId/recordedAt
+  });
 });
 ```
 
 ### Step 5: Run all 4 gates
 
+- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` all clean.
+
 ### Step 6: Update structural docs
 
 - [ ] `docs/architecture/ARCHITECTURE.md`: append Component Map row:
@@ -774,8 +1239,17 @@ it('built-ins do not read sessionId or recordedAt', () => {
 
 ### Step 7: Per-task multi-CLI review
 
+- [ ] Stage all changes: `git add -A`.
+- [ ] `mkdir -p docs/reviews/behavioral-metrics-T2/$(date +%Y-%m-%d)/1/raw`.
+- [ ] Build the review prompt with task-specific context (Spec 8 design v4 §12 acceptance criteria for cross-cutting tests; T1 already landed; verify integration tests cover the documented contracts; verify structural docs match impl).
+- [ ] Run Codex + Opus parallel reviews per the §B pattern, polling via `until [ -s codex.md ] && [ -s opus.md ]; do sleep 8; done`.
+- [ ] Synthesize `REVIEW.md` with severity-tagged findings.
+- [ ] Iterate to convergence (both ACCEPT or remaining findings are nitpicks). 3-iteration soft cap per AGENTS.md.
+
 ### Step 8: Commit T2
 
+- [ ] `git add -A && git commit -m`:
+
 ```
 test(behavioral-metrics): T2 determinism integration + arch docs (v0.8.3)
 
