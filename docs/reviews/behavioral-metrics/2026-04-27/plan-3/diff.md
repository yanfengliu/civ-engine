diff --git a/docs/design/2026-04-27-behavioral-metrics-implementation-plan.md b/docs/design/2026-04-27-behavioral-metrics-implementation-plan.md
index d21e52e..6dd9225 100644
--- a/docs/design/2026-04-27-behavioral-metrics-implementation-plan.md
+++ b/docs/design/2026-04-27-behavioral-metrics-implementation-plan.md
@@ -2,7 +2,7 @@
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
-**Plan revision:** v2 (2026-04-27) — addresses iter-1 multi-CLI plan review (Codex 3 HIGH + 2 MED; Opus 2 HIGH + 2 MED + 1 LOW). v2 expands T1 Step 7 from prose bullets to 9 concrete factory + test code blocks; fixes ADR count (5 ADRs 23-27 consistent across all sites); resolves `mkBundle` helper location (per-file duplication); strengthens runner single-pass test; fixes `failedTicks?.length > 0` strict-mode bug to `(failedTicks?.length ?? 0) > 0`; corrects commit-message version reference (v10 → v4); expands T2 placeholders.
+**Plan revision:** v3 (2026-04-27) — collapses T1+T2 into a single commit per Codex iter-2's HIGH on the T1/T2 doc split (AGENTS.md: structural docs land with the code that introduces the subsystem, not in a follow-up). Spec 8 is one coherent shipped change → one version bump (v0.8.2, c-bump, additive). Iter-2: Codex 1 HIGH + 2 MED; Opus ACCEPT + 5 NIT. v3 also folds the integration tests into the same task; no separate T2.
 
 **Goal:** Implement Spec 8 (Behavioral Metrics over Corpus) per `docs/design/2026-04-27-behavioral-metrics-design.md` (v4, converged after 4 multi-CLI design review iterations).
 
@@ -14,7 +14,7 @@
 
 **Branch:** None — direct-to-main per AGENTS.md (solo-developer policy).
 
-**Versioning:** Branch base `v0.8.1` (after Spec 3 merge). T1 = `v0.8.2` (c-bump, additive). T2 = `v0.8.3` (c-bump, integration tests + arch docs).
+**Versioning:** Branch base `v0.8.1` (after Spec 3 merge). Single commit, **v0.8.2** (c-bump, additive). One coherent shipped change → one version bump per AGENTS.md.
 
 **Shell:** bash on Windows (mingw). Unix syntax (`/tmp/`, `&`, `$()`, `[ -s file ]`, `mkdir -p`).
 
@@ -32,9 +32,18 @@ Per AGENTS.md doc-discipline:
 - `docs/api-reference.md` — sections for new public types/methods.
 - `package.json` + `src/version.ts` + `README.md` (badge) — version bump.
 
-T1 also: 5 new ADRs (23-27) in `docs/architecture/decisions.md` (continues numbering after Spec 3's ADRs 17-22, which already landed); new `docs/guides/behavioral-metrics.md`; README.md Feature Overview row + Public Surface bullet; `docs/README.md` index entry.
+The single-task commit also lands:
+- 5 new ADRs (23-27) in `docs/architecture/decisions.md` (continues numbering after Spec 3's ADRs 17-22, which already landed).
+- New `docs/guides/behavioral-metrics.md`.
+- README.md Feature Overview row + Public Surface bullet.
+- `docs/README.md` index entry.
+- `docs/architecture/ARCHITECTURE.md` Component Map row.
+- `docs/architecture/drift-log.md` entry.
+- `docs/design/ai-first-dev-roadmap.md` Spec 8 status update.
+- `docs/guides/ai-integration.md` Tier-2 reference.
+- `docs/guides/synthetic-playtest.md` cross-reference to behavioral-metrics.
 
-T2 also: `docs/architecture/ARCHITECTURE.md` Component Map row + `docs/architecture/drift-log.md` entry + `docs/design/ai-first-dev-roadmap.md` Spec 8 status update + `docs/guides/ai-integration.md` Tier-2 reference + `docs/guides/synthetic-playtest.md` cross-reference to behavioral-metrics.
+Per AGENTS.md doc-discipline: structural docs land in the same commit as the code that introduces the subsystem.
 
 ### B. Per-task multi-CLI review (before commit)
 
@@ -85,9 +94,11 @@ npm run build       # clean
 
 ---
 
-## Task 1: Metric contract + 11 built-ins + runMetrics + compareMetricsResults (v0.8.2, c-bump)
+## Single Task: Spec 8 — full surface + tests + integration + structural docs (v0.8.2, c-bump)
 
-**Goal:** Land the entire Spec 8 surface in one commit — all types, all built-ins, the reducer, the delta helper, unit tests, and the api-reference + guide. T2 adds determinism integration tests + arch docs but ships no new public API.
+**Goal:** Land the entire Spec 8 surface in one commit per AGENTS.md doc-with-code rule — all types, all built-ins, the reducer, the delta helper, unit tests, integration tests (Spec 3 → Spec 8 round-trip + order-insensitivity + user-defined-metric integration + volatile-metadata exclusion), api-reference, guide, ADRs 23-27, ARCHITECTURE Component Map, drift-log, roadmap status update, ai-integration cross-ref, synthetic-playtest cross-ref.
+
+(Earlier plan revisions split this into T1 + T2; collapsed in v3 per Codex iter-2's HIGH on the doc-with-code-that-introduces-the-subsystem rule.)
 
 **Files:**
 - Create: `src/behavioral-metrics.ts` — types + `runMetrics` + 11 built-in factories + `compareMetricsResults`.
@@ -340,7 +351,7 @@ describe('sessionLengthStats', () => {
 
 ### Step 7: Implement remaining 9 built-ins (TDD per metric)
 
-For each of the 9 remaining built-ins, follow TDD: failing test first, then implementation. Each sub-step is independently committable but the whole batch ships in T1 (Step 14).
+For each of the 9 remaining built-ins, follow TDD: failing test first, then implementation. The whole Spec 8 surface ships in one commit at Step 20.
 
 #### Step 7a: `commandRateStats`
 
@@ -963,7 +974,7 @@ export {
 
 - [ ] `docs/devlog/summary.md`: prepend one line.
 
-- [ ] Latest detailed devlog: append T1 entry per AGENTS.md template.
+- [ ] Latest detailed devlog: append Spec 8 entry per AGENTS.md template.
 
 - [ ] `docs/README.md`: index `[Behavioral Metrics](guides/behavioral-metrics.md)`.
 
@@ -971,64 +982,25 @@ export {
 
 - [ ] `package.json` → `0.8.2`. `src/version.ts` → `'0.8.2'`.
 
-### Step 13: Per-task multi-CLI review
-
-- [ ] Stage all changes.
-- [ ] `git diff --cached` is the review diff.
-- [ ] Run Codex + Opus parallel reviews per §B.
-- [ ] Synthesize REVIEW.md.
-- [ ] Iterate to convergence.
-
-### Step 14: Commit T1
-
-- [ ] `git add -A && git commit -m`:
-
-```
-feat(behavioral-metrics): T1 metric contract + 11 built-ins + comparison (v0.8.2)
-
-Implements Spec 8 (Behavioral Metrics over Corpus) per design v4.
-Tier-2 of the AI-first feedback loop.
-
-Surface added:
-- Metric<TState, TResult> accumulator contract.
-- runMetrics(bundles, metrics): pure function over Iterable<SessionBundle>.
-- 11 engine-generic built-in metrics: bundleCount, sessionLengthStats,
-  commandRateStats, eventRateStats, commandTypeCounts, eventTypeCounts,
-  failureBundleRate, failedTickRate, incompleteBundleRate,
-  commandValidationAcceptanceRate, executionFailureRate.
-- compareMetricsResults: pure delta helper. NumericDelta + OpaqueDelta +
-  OnlyInComparison shapes. Recurses through nested records.
-- Stats type with number | null fields (JSON-stable; NaN would not be).
-- NumPy linear (R type 7) percentiles, exact, deterministic.
-
-ADRs 23 (accumulator), 24 (engine-generic only), 25 (deltas not
-judgments), 26 (Iterable only in v1; runMetricsAsync is a separate
-function in v2), 27 (no stopReason aggregation).
-
-Validation: 4 engine gates clean. ~50 new tests across 4 test files
-(types: 2 cases; builtins: ~36 cases over 11 metrics × empty/single/
-multi; runner: 4 cases; compare: ~8 cases).
-
-Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
-```
+(Steps 13-18 — integration tests + structural docs — appear in the §"Continuation of the single task" block below. Steps 19 + 20 — review + commit — close out the task at the end of that block.)
 
 ---
 
-## Task 2: Determinism integration tests + structural docs (v0.8.3, c-bump)
+## Continuation of the single task: integration tests + structural docs (same commit)
 
-**Goal:** Cross-cutting integration tests that wire `runSynthPlaytest` → `runMetrics` → `compareMetricsResults`. Plus structural docs.
+These steps land in the same commit as Steps 1-12 above. They were originally a separate "T2" but per AGENTS.md doc-with-code-that-introduces-the-subsystem rule, structural docs (ARCHITECTURE Component Map, drift-log, roadmap status, cross-references) ship with the code that introduces the subsystem.
 
-**Files:**
+**Additional files (modified in the same commit as the v0.8.2 surface):**
 - Create: `tests/behavioral-metrics-determinism.test.ts` — full Spec 3 → Spec 8 round-trip; order-insensitivity verification; user-defined-metric round-trip; volatile-metadata exclusion sanity.
 - Modify: `docs/architecture/ARCHITECTURE.md` — Component Map row.
 - Modify: `docs/architecture/drift-log.md` — entry.
 - Modify: `docs/design/ai-first-dev-roadmap.md` — Spec 8 status: Drafted → Implemented.
 - Modify: `docs/guides/ai-integration.md` — Tier-2 reference.
 - Modify: `docs/guides/synthetic-playtest.md` — append "## Computing metrics" subsection linking to the metrics guide.
-- Modify: `docs/changelog.md`, `docs/devlog/*`.
-- Modify: `package.json` (`0.8.3`), `src/version.ts` (`0.8.3`), `README.md` (badge).
 
-### Step 1: Create test file with imports + helpers + Spec 3 → Spec 8 round-trip test
+The version bump (`0.8.2`) and changelog/devlog entries from Steps 12-13 already cover this commit; no separate v0.8.3 bump.
+
+### Step 13: Create test file with imports + helpers + Spec 3 → Spec 8 round-trip test
 
 - [ ] Create `tests/behavioral-metrics-determinism.test.ts`:
 
@@ -1070,7 +1042,7 @@ const allBuiltins = (): Metric<unknown, unknown>[] => [
 const mkBundle = (overrides: Partial<SessionBundle> = {}): SessionBundle => ({
   schemaVersion: 1,
   metadata: {
-    sessionId: 's-1', engineVersion: '0.8.3', nodeVersion: 'v20',
+    sessionId: 's-1', engineVersion: '0.8.2', nodeVersion: 'v20',
     recordedAt: 't', startTick: 0, endTick: 10, persistedEndTick: 10,
     durationTicks: 10, sourceKind: 'session',
   },
@@ -1138,7 +1110,7 @@ describe('Spec 3 → Spec 8 round-trip', () => {
 
 - [ ] Run: `npm test -- behavioral-metrics-determinism`. Expected: PASS.
 
-### Step 2: Order-insensitivity verification
+### Step 14: Order-insensitivity verification
 
 - [ ] Append:
 
@@ -1163,7 +1135,7 @@ describe('order-insensitivity', () => {
 });
 ```
 
-### Step 3: User-defined metric integration
+### Step 15: User-defined metric integration
 
 - [ ] Append:
 
@@ -1193,7 +1165,7 @@ describe('user-defined metric integration', () => {
 });
 ```
 
-### Step 4: Volatile-metadata exclusion sanity
+### Step 16: Volatile-metadata exclusion sanity
 
 - [ ] Append:
 
@@ -1211,19 +1183,19 @@ describe('volatile-metadata exclusion', () => {
 });
 ```
 
-### Step 5: Run all 4 gates
+### Step 17: Run all 4 gates (after integration tests added)
 
 - [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` all clean.
 
-### Step 6: Update structural docs
+### Step 18: Update structural docs
 
 - [ ] `docs/architecture/ARCHITECTURE.md`: append Component Map row:
 
 ```
-| Behavioral Metrics | src/behavioral-metrics.ts | Tier-2 corpus reducer over Iterable<SessionBundle>. Accumulator-style Metric contract; 11 engine-generic built-ins; pure-function runMetrics + compareMetricsResults. New in v0.8.2 + v0.8.3 (Spec 8). |
+| Behavioral Metrics | src/behavioral-metrics.ts | Tier-2 corpus reducer over Iterable<SessionBundle>. Accumulator-style Metric contract; 11 engine-generic built-ins; pure-function runMetrics + compareMetricsResults. New in v0.8.2 (Spec 8). |
 ```
 
-- [ ] `docs/architecture/drift-log.md`: append entry covering the Spec 8 implementation chain (v0.8.2 + v0.8.3) with a note on the accumulator contract + engine-generic-only stance.
+- [ ] `docs/architecture/drift-log.md`: append entry covering the Spec 8 implementation (v0.8.2) with a note on the accumulator contract + engine-generic-only stance.
 
 - [ ] `docs/design/ai-first-dev-roadmap.md`: Spec 8 status → **Implemented** with link to design + plan + commits.
 
@@ -1231,47 +1203,52 @@ describe('volatile-metadata exclusion', () => {
 
 - [ ] `docs/guides/synthetic-playtest.md`: append `## Computing metrics over bundles` subsection with a 5-line example: produce N bundles via `runSynthPlaytest`, pass to `runMetrics(bundles, [bundleCount(), sessionLengthStats()])`. Cross-link to behavioral-metrics guide.
 
-- [ ] Changelog 0.8.3 entry.
-
-- [ ] Devlog summary + detailed.
+(Changelog/devlog/version bumps already covered in Step 12 — single 0.8.2 entry.)
 
-- [ ] Version bumps to 0.8.3.
+### (Step 19 + Step 20 — review + commit — appear above; they apply once Step 18 lands.)
 
-### Step 7: Per-task multi-CLI review
+The single Step 20 commit message template (referenced from earlier in the plan):
 
-- [ ] Stage all changes: `git add -A`.
-- [ ] `mkdir -p docs/reviews/behavioral-metrics-T2/$(date +%Y-%m-%d)/1/raw`.
-- [ ] Build the review prompt with task-specific context (Spec 8 design v4 §12 acceptance criteria for cross-cutting tests; T1 already landed; verify integration tests cover the documented contracts; verify structural docs match impl).
-- [ ] Run Codex + Opus parallel reviews per the §B pattern, polling via `until [ -s codex.md ] && [ -s opus.md ]; do sleep 8; done`.
-- [ ] Synthesize `REVIEW.md` with severity-tagged findings.
-- [ ] Iterate to convergence (both ACCEPT or remaining findings are nitpicks). 3-iteration soft cap per AGENTS.md.
-
-### Step 8: Commit T2
+```
+feat(behavioral-metrics): Spec 8 — metric contract + 11 built-ins +
+runMetrics + compareMetricsResults + integration tests + arch docs (v0.8.2)
 
-- [ ] `git add -A && git commit -m`:
+Implements Spec 8 (Behavioral Metrics over Corpus) per design v4.
+Tier-2 of the AI-first feedback loop. Pairs with Spec 3 to define
+regressions for emergent behavior.
 
-```
-test(behavioral-metrics): T2 determinism integration + arch docs (v0.8.3)
+Public surface:
+- Metric<TState, TResult> accumulator contract.
+- runMetrics(bundles, metrics): pure function over Iterable<SessionBundle>.
+- 11 engine-generic built-in metrics: bundleCount, sessionLengthStats,
+  commandRateStats, eventRateStats, commandTypeCounts, eventTypeCounts,
+  failureBundleRate, failedTickRate, incompleteBundleRate,
+  commandValidationAcceptanceRate, executionFailureRate.
+- compareMetricsResults: pure delta helper. NumericDelta + OpaqueDelta
+  + OnlyInComparison shapes. Recurses through nested records.
+- Stats type with number | null fields (JSON-stable; NaN would not be).
+- NumPy linear (R type 7) percentiles, exact, deterministic.
 
-Cross-cutting tests covering Spec 8 design v4 §12 acceptance criteria
-that need both Spec 3's runSynthPlaytest AND Spec 8's runMetrics in
-place:
+Integration tests (tests/behavioral-metrics-determinism.test.ts):
 - Spec 3 → Spec 8 round-trip: identical synth bundles → identical
   metrics → zero deltas in compareMetricsResults.
 - Order-insensitivity: bundles in reverse order produce identical
   built-in metric results.
 - User-defined metric integration: custom Metric implements the
   contract correctly + multiplexes alongside built-ins.
-- Volatile-metadata exclusion: built-ins ignore sessionId/recordedAt
-  (verified by structurally-identical bundles differing only in those
-  fields produce identical results).
+- Volatile-metadata exclusion: built-ins ignore sessionId/recordedAt.
+
+ADRs 23 (accumulator), 24 (engine-generic only), 25 (deltas not
+judgments), 26 (Iterable only in v1; runMetricsAsync is a separate
+function in v2), 27 (no stopReason aggregation).
+
+Structural docs: ARCHITECTURE Component Map row, drift-log entry,
+ai-first-dev-roadmap Spec 8 → Implemented, ai-integration Tier-2
+reference, synthetic-playtest cross-reference, behavioral-metrics
+guide, README Feature Overview row + Public Surface bullet.
 
-Architecture docs:
-- ARCHITECTURE.md Component Map row.
-- drift-log entry covering v0.8.2 + v0.8.3 chain.
-- ai-first-dev-roadmap.md Spec 8 → Implemented.
-- ai-integration.md Tier-2 reference.
-- synthetic-playtest.md cross-reference subsection.
+Validation: 4 engine gates clean. ~55 new tests (types: 2; builtins:
+~36; runner: 4; compare: ~8; determinism: 4).
 
 Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
 ```
@@ -1280,17 +1257,17 @@ Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
 
 ## Final pass: cross-cutting checks
 
-After T1 + T2 land:
+After the single Spec 8 commit (Step 20) lands:
 
 - [ ] All four engine gates pass at the tip.
-- [ ] Reviews under `docs/reviews/behavioral-metrics-T{1,2}/...` show convergence.
-- [ ] `docs/changelog.md` has two new version entries.
-- [ ] `docs/devlog/detailed/<latest>.md` has two new task entries.
+- [ ] Reviews under `docs/reviews/behavioral-metrics/2026-04-27/T1/...` show convergence (single task → single review folder).
+- [ ] `docs/changelog.md` has one new version entry (0.8.2).
+- [ ] `docs/devlog/detailed/<latest>.md` has one new task entry.
 - [ ] `docs/api-reference.md` has the Behavioral Metrics section.
 - [ ] `docs/guides/behavioral-metrics.md` exists.
 - [ ] `docs/architecture/decisions.md` has ADRs 23-27 (5 new).
 - [ ] `docs/design/ai-first-dev-roadmap.md` shows Spec 8 = Implemented.
-- [ ] `README.md` Feature Overview row added; version badge bumped to 0.8.3.
+- [ ] `README.md` Feature Overview row added; version badge bumped to 0.8.2.
 - [ ] `docs/README.md` indexes `behavioral-metrics.md`.
 
 Per direct-to-main policy, no merge step. Commits land directly.
