diff --git a/README.md b/README.md
index 717abe7..f6df3f2 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # civ-engine
 
-![version](https://img.shields.io/badge/version-0.8.1-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
+![version](https://img.shields.io/badge/version-0.8.2-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
 
 > ⚠️ **Pre-release alpha — unverified.** This engine is under active development. The public API surface is still shifting (see `docs/changelog.md` for the recent breaking-change cadence — `0.5.0`, `0.6.0`, `0.7.0`), invariants are still being hardened (current sweep: iter-7 of the multi-CLI review chain), and no production deployment has validated the engine end-to-end. Use it for prototyping, AI-agent experiments, and feedback — do **not** depend on it for shipped products yet.
 
@@ -93,6 +93,7 @@ world.step();
 | **Client Protocol**         | Transport-agnostic typed messages with protocol version markers and structured `commandAccepted`/`commandRejected` plus `commandExecuted`/`commandFailed`/`tickFailed` outcomes |
 | **Session Recording & Replay** | `SessionRecorder` + `SessionReplayer` — capture deterministic, replayable bundles of any World run. `MemorySink` / `FileSink` for in-memory or disk persistence. Marker API for human-authored annotations + engine-emitted assertions (from `scenarioResultToBundle` adapter). `selfCheck` 3-stream comparison verifies determinism. `World.applySnapshot` for in-place state replacement. See `docs/guides/session-recording.md`. |
 | **Synthetic Playtest Harness** | `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for `N` ticks → `SessionBundle`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Sub-RNG sandboxed from `world.rng` via `PolicyContext.random()`. Tier-1 of the AI-first feedback loop; sets up the corpus for future Tier-2 (corpus indexing, behavioral metrics, AI playtester). See `docs/guides/synthetic-playtest.md`. |
+| **Behavioral Metrics over Corpus** | `runMetrics(bundles, metrics)` over `Iterable<SessionBundle>` + 11 engine-generic built-ins (`bundleCount`, `sessionLengthStats`, `commandRateStats`, `commandTypeCounts`, `failureBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`, etc.) + `compareMetricsResults` delta helper. Tier-2 of the AI-first feedback loop; pairs with synthetic playtests to define regressions for emergent behavior. See `docs/guides/behavioral-metrics.md`. |
 
 ## Architecture
 
@@ -142,6 +143,7 @@ The root package centers on a few primary entry points:
 - `WorldDebugger`, `WorldHistoryRecorder`, and `runScenario()` for AI/debug workflows
 - `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `MemorySink`/`FileSink`, `Marker`, `RecordedCommand`, `scenarioResultToBundle()` for session capture/replay (`docs/guides/session-recording.md`)
 - `runSynthPlaytest`, `noopPolicy`, `randomPolicy`, `scriptedPolicy` for the synthetic playtest harness (Tier-1 of the AI-first feedback loop; `docs/guides/synthetic-playtest.md`)
+- `runMetrics`, `compareMetricsResults`, plus 11 metric factories (`bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`) for behavioral metrics over a corpus (Tier-2 of the AI-first feedback loop; `docs/guides/behavioral-metrics.md`)
 - standalone utilities for pathfinding, map generation, occupancy/crowding, visibility, behavior trees, and typed overlay layers (`Layer<T>`)
 
 Use [docs/api-reference.md](docs/api-reference.md) for the authoritative signatures, types, message shapes, and standalone utility docs.
diff --git a/docs/README.md b/docs/README.md
index 70bc2a1..62a47a9 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -32,6 +32,7 @@ The API reference is the authoritative public surface. The root `README.md` is i
 - [Debugging](guides/debugging.md)
 - [Session Recording & Replay](guides/session-recording.md)
 - [Synthetic Playtest Harness](guides/synthetic-playtest.md) — Tier-1 autonomous-driver primitive with sub-RNG-isolated policy randomness
+- [Behavioral Metrics over Corpus](guides/behavioral-metrics.md) — Tier-2 corpus reducer with 11 engine-generic built-in metrics + comparison helper
 - [Renderer Integration](guides/rendering.md)
 - [RTS Primitives](guides/rts-primitives.md)
 - [Map Generation](guides/map-generation.md)
diff --git a/docs/api-reference.md b/docs/api-reference.md
index 21ecb93..1b234ed 100644
--- a/docs/api-reference.md
+++ b/docs/api-reference.md
@@ -5140,3 +5140,81 @@ if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
 - `SessionMetadata.policySeed?: number` added. Populated when `sourceKind === 'synthetic'`.
 - `SessionRecorderConfig.sourceKind?: 'session' | 'scenario' | 'synthetic'` added (default `'session'`).
 - `SessionRecorderConfig.policySeed?: number` added.
+
+## Behavioral Metrics (v0.8.2)
+
+A pure-function corpus reducer over `Iterable<SessionBundle>`. Computes built-in + user-defined metrics; compares baseline vs. current. Tier-2 of the AI-first feedback loop (Spec 8).
+
+### `Metric<TState, TResult>`
+
+```typescript
+interface Metric<TState, TResult> {
+  readonly name: string;             // unique within a runMetrics call
+  create(): TState;                  // initial accumulator state
+  observe(state: TState, bundle: SessionBundle): TState;  // pure (output depends only on inputs); in-place mutation OK
+  finalize(state: TState): TResult;
+  merge?(a: TState, b: TState): TState;  // optional; reserved for v2 parallel processing
+  readonly orderSensitive?: boolean; // doc-only; runMetrics does NOT auto-detect
+}
+```
+
+### `Stats`
+
+```typescript
+interface Stats {
+  count: number;
+  min: number | null;   // null when count === 0 (JSON-stable; NaN would not be)
+  max: number | null;
+  mean: number | null;
+  p50: number | null;
+  p95: number | null;
+  p99: number | null;
+}
+```
+
+Percentile method: NumPy linear (R-quantile type 7). For `count === 1`, all percentiles equal the single value. For `count === 0`, all numeric fields are `null`.
+
+### `runMetrics(bundles, metrics)`
+
+```typescript
+function runMetrics<TEventMap, TCommandMap, TDebug = JsonValue>(
+  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
+  metrics: Metric<unknown, unknown>[],
+): MetricsResult;
+```
+
+Single-pass-multiplexed reducer. Iterates `bundles` once; for each bundle, calls every metric's `observe`. Throws `RangeError` on duplicate metric names. The iterable is consumed once — generators get exhausted. `MetricsResult` is `Record<string, unknown>`; per-metric narrowing happens at the consumption site via type assertion.
+
+### Built-in metrics
+
+11 engine-generic metric factories that read only fields the engine guarantees on `SessionBundle`:
+
+| Factory | Reads | Result | Notes |
+|---|---|---|---|
+| `bundleCount()` | (counter) | `number` | total bundles |
+| `sessionLengthStats()` | `metadata.durationTicks` | `Stats` | per-bundle session lengths |
+| `commandRateStats()` | `commands.length / durationTicks` | `Stats` | counts SUBMISSIONS (rejected included) |
+| `eventRateStats()` | `sum(ticks[].events.length) / durationTicks` | `Stats` | |
+| `commandTypeCounts()` | `commands[].type` | `Record<string, number>` | counts SUBMISSIONS by type |
+| `eventTypeCounts()` | `ticks[].events[].type` | `Record<string, number>` | |
+| `failureBundleRate()` | `metadata.failedTicks?.length > 0` | `number` (ratio) | bundles with any tick failure |
+| `failedTickRate()` | `sum(failedTicks) / sum(durationTicks)` | `number` (ratio) | |
+| `incompleteBundleRate()` | `metadata.incomplete === true` | `number` (ratio) | recorder-terminated bundles |
+| `commandValidationAcceptanceRate()` | `commands[].result.accepted` | `number` (ratio) | submission-stage validator-gate signal |
+| `executionFailureRate()` | `executions[].executed === false` | `number` (ratio) | execution-stage handler-failure signal |
+
+`commandValidationAcceptanceRate` and `executionFailureRate` read different bundle sources by design: validator-rejected commands appear in `bundle.commands[].result.accepted=false` but NEVER in `bundle.executions` (validators short-circuit before queueing). The two metrics together cover both regression types.
+
+### `compareMetricsResults(baseline, current)`
+
+```typescript
+type NumericDelta = { baseline: number | null; current: number | null; delta: number | null; pctChange: number | null };
+type OpaqueDelta = { baseline: unknown; current: unknown; equal: boolean };
+type OnlyInComparison = { baseline?: unknown; current?: unknown; onlyIn: 'baseline' | 'current' };
+type MetricDelta = NumericDelta | OpaqueDelta | { [key: string]: MetricDelta | OnlyInComparison };
+type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;
+
+function compareMetricsResults(baseline: MetricsResult, current: MetricsResult): MetricsComparison;
+```
+
+Pure delta computation, no regression judgment. Numeric leaves get `delta` and `pctChange`; non-numeric leaves get `equal: deepEqual(a, b)`. Recurses through nested records (e.g., `commandTypeCounts: Record<string, number>` reports per-key only-in-side at the inner level too). `pctChange` conventions: `0/0 → 0`, `nonzero/0 → ±Infinity`, `null` inputs propagate to `null` deltas. Arrays are opaque (no per-element diff in v1).
diff --git a/docs/architecture/ARCHITECTURE.md b/docs/architecture/ARCHITECTURE.md
index 0416a17..a0ce6b7 100644
--- a/docs/architecture/ARCHITECTURE.md
+++ b/docs/architecture/ARCHITECTURE.md
@@ -41,6 +41,7 @@ The engine provides reusable infrastructure (entities, components, spatial index
 | SessionReplayer | `src/session-replayer.ts` | Loads a SessionBundle/Source; openAt(tick) returns paused World; selfCheck() 3-stream comparison (state via deepEqualWithPath, events, executions); failedTicks-skipping; cross-b/cross-Node-major version checks |
 | SessionBundle / SessionSink / SessionSource / Marker / RecordedCommand | `src/session-bundle.ts`, `src/session-sink.ts`, `src/session-file-sink.ts` | Shared bundle types + sink/source interfaces + MemorySink + FileSink (disk-backed; manifest atomic-rename; defaults to sidecar attachments). scenarioResultToBundle adapter at `src/session-scenario-bundle.ts`. |
 | Synthetic Playtest Harness | `src/synthetic-playtest.ts` | Tier-1 autonomous-driver primitive: `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for N ticks → `SessionBundle`. Sub-RNG (`PolicyContext.random()`) sandboxed from `world.rng`, seeded from `policySeed`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Composes with `SessionRecorder`/`SessionReplayer`. New in v0.7.20 + v0.8.0 + v0.8.1 (Spec 3). |
+| Behavioral Metrics | `src/behavioral-metrics.ts` | Tier-2 corpus reducer over `Iterable<SessionBundle>`. Accumulator-style `Metric<TState, TResult>` contract; 11 engine-generic built-in metrics (`bundleCount`, `sessionLengthStats`, etc.); pure-function `runMetrics` + `compareMetricsResults` delta helper. New in v0.8.2 (Spec 8). |
 | Public exports | `src/index.ts`           | Barrel export for the intended package API                                             |
 | Types          | `src/types.ts`           | Shared type definitions (EntityId, EntityRef, Position, WorldConfig, InstrumentationProfile) |
 
diff --git a/docs/architecture/decisions.md b/docs/architecture/decisions.md
index 32340ed..0c92eaa 100644
--- a/docs/architecture/decisions.md
+++ b/docs/architecture/decisions.md
@@ -27,3 +27,8 @@ Decisions for civ-engine. Never delete an entry; add a newer decision that super
 | 20a | 2026-04-27 | Synthetic Playtest: `sourceKind` is set at `SessionRecorder` construction, not via post-hoc sink mutation (Spec 3 §15 ADR 3a) | `SessionRecorderConfig` gains optional `sourceKind?` (default `'session'`). `SessionRecorder.connect()` reads it into `initialMetadata`. The harness passes `sourceKind: 'synthetic'`; never mutates sink metadata. Iter-1 plan had post-hoc `sink.metadata.sourceKind` mutation — unsound for FileSink (manifest.json was already flushed with `'session'`) and for custom sinks that snapshot metadata during `open()`. The new field is type-additive; existing callers see no change. |
 | 21  | 2026-04-27 | Synthetic Playtest: harness is synchronous and single-process (Spec 3 §15 ADR 4) | `runSynthPlaytest` is a synchronous function that runs to completion or returns early. No async / streaming / cross-process orchestration in v1. Synchronous matches the engine's existing tick model and the session-recording subsystem's sink contract. Async policies (LLM-driven) are deferred to Spec 9 (AI Playtester); cross-process orchestration is a CI-script concern, not an engine API. |
 | 22  | 2026-04-27 | Synthetic Playtest: composed policies do NOT observe each other within a tick (Spec 3 §15 ADR 6) | When multiple policies share a tick, they receive the same `PolicyContext.world` reference. The harness submits each policy's commands in array order, but no public surface exposes earlier-policy submissions to later policies during the same tick (`World.commandQueue` is private; `ARCHITECTURE.md` forbids direct queue access; `world.getEvents()` returns the previous tick's events; handlers don't fire until `world.step()`). The `RecordedCommand.sequence` ordering on the resulting bundle's `commands[]` matches policy-array order — externally observable. Within a tick, policies are computational siblings, not a pipeline. If batch semantics are genuinely needed, wrap dependent policies in a single composite policy that does the merge internally. |
+| 23  | 2026-04-27 | Behavioral Metrics: accumulator-style metric contract (Spec 8 §15 ADR 23) | `Metric<TState, TResult>` exposes `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`. Stateful, streaming-friendly, one-pass-multiplex-able. **Rationale:** A `(bundle) => T` + `combine(T[])` shape forces materializing one T per bundle and prevents per-metric representation choice (Stats wants a sorted buffer, counts wants an integer). A `(bundles) => TAgg` shape forces per-metric corpus walks (N scans for N metrics). Accumulator-style is one scan total. `observe` may return the same state reference (in-place mutation OK for performance) or a new value — the contract is functional purity, not reference-immutability. `merge` is reserved for future parallel/distributed corpus processing without breaking the v1 contract. |
+| 24  | 2026-04-27 | Behavioral Metrics: engine-generic built-ins only; game-semantic metrics are user-defined (Spec 8 §15 ADR 24) | v1 ships 11 built-in metrics that read only `SessionBundle` fields the engine guarantees (`metadata.durationTicks`, `commands[].type`, `commands[].result.accepted`, `executions[].executed`, `metadata.failedTicks`, `metadata.incomplete`, etc.). Game-semantic metrics like "resource Gini" or "time-to-first-conflict" are NOT built in — they require standard event/marker contracts that the engine doesn't define. **Rationale:** civ-engine is a general-purpose engine; metrics shipped in the engine package must work for any consuming game. Game projects implement game-specific metrics as user-defined `Metric<TState, TResult>` instances. |
+| 25  | 2026-04-27 | Behavioral Metrics: `compareMetricsResults` returns deltas, not regression judgments (Spec 8 §15 ADR 25) | The helper returns numeric deltas and percent changes; it does NOT classify changes as regressions, improvements, or noise. **Rationale:** "Is an 18% shift in p95 session length a regression?" is game- and policy-specific. Some games consider longer sessions a feature; others a bug. Some metrics are noisy (small corpus, high variance); others stable. Encoding judgment thresholds into the engine would either bake the wrong defaults for half the consumers or require a config surface that's its own complexity tax. Caller-side judgment is the right boundary. |
+| 26  | 2026-04-27 | Behavioral Metrics: `Iterable<SessionBundle>` only in v1; `AsyncIterable` deferred to a separate `runMetricsAsync` (Spec 8 §15 ADR 26) | v1 accepts only synchronous `Iterable<SessionBundle>`. Arrays, generators, sets, and any custom synchronous iterable work. `AsyncIterable` is NOT supported. **Rationale:** Spec 3's harness is synchronous; the natural composition is synchronous corpus reduction. The future-compat path is a separate `runMetricsAsync` function (returns `Promise<MetricsResult>`), NOT an overload of `runMetrics` — overloading would force the return type to widen to `MetricsResult \| Promise<MetricsResult>`, breaking existing callers that assume sync. |
+| 27  | 2026-04-27 | Behavioral Metrics: do NOT aggregate `stopReason` in v1 (Spec 8 §15 ADR 27) | No `stopReasonHistogram` built-in. `SynthPlaytestResult.stopReason` lives outside `SessionBundle`; aggregating it requires a separate Spec 3 follow-up to persist it into `metadata`. **Rationale:** Forcing the metric into v1 would either (a) couple Spec 8 to Spec 3's result type (not bundle-only), or (b) require a Spec 3 follow-up that's better landed independently. v1 ships without it; users who want it accumulate `stopReason` outside `runMetrics`. |
diff --git a/docs/architecture/drift-log.md b/docs/architecture/drift-log.md
index 1fd8a2a..b5192d5 100644
--- a/docs/architecture/drift-log.md
+++ b/docs/architecture/drift-log.md
@@ -45,3 +45,4 @@ Append a row here whenever architecture changes. Each row captures the date, the
 | 2026-04-26 | `Object.freeze(world.grid)` + ghost-entry cleanup (v0.7.3) | `world.grid` is a public field, not a method, so the proxy passed it through as-is — predicates could monkey-patch `w.grid.getAt`. Constructor now `Object.freeze`s the grid delegate, making the v0.5.0 read-only-delegate promise structural rather than convention-only. The `READ_METHODS_RETURNING_REFS` set was cleaned of two ghost entries (`getResources`, `getPosition`) that don't exist on `World`. |
 | 2026-04-27 | Session-recording subsystem (v0.7.7-v0.7.14) | Adds `SessionRecorder` / `SessionReplayer` / `SessionBundle` / `SessionSink` / `SessionSource` / `MemorySink` / `FileSink` / `Marker` / `RecordedCommand` / `scenarioResultToBundle()` plus `World.applySnapshot()` instance method, `WorldHistoryRecorder.captureCommandPayloads` opt-in, and `World.__payloadCapturingRecorder` mutex slot. Implements engine-level capture/replay primitives per `docs/design/2026-04-26-session-recording-and-replay-design.md` (v5, converged after 4 multi-CLI review iterations). Per ADR 1 in §15 of the spec, the new SessionRecorder runs as a sibling to WorldHistoryRecorder rather than extending it (different shape: rolling debug buffer vs. persistent archive). Per ADR 2, `SessionBundle` is a strict-JSON shared type identical regardless of producer. Per ADR 3, the determinism contract (spec §11.1) is documented but NOT structurally enforced — `SessionReplayer.selfCheck()` is the verification mechanism. Per ADR 4, the `worldFactory` callback is part of the determinism contract. v1 limitations: single payload-capturing recorder per world; sinks are synchronous; replay across recorded TickFailure is out of scope (future spec extends `WorldSnapshot` to v6). 121 new tests across 8 commits. |
 | 2026-04-27 | Synthetic Playtest Harness (v0.7.20 + v0.8.0 + v0.8.1) | Adds `runSynthPlaytest` / `Policy` / `PolicyContext` / `StopContext` / `PolicyCommand` / `RandomPolicyConfig` / `ScriptedPolicyEntry` / `noopPolicy` / `randomPolicy` / `scriptedPolicy` / `SynthPlaytestConfig` / `SynthPlaytestResult` exports. **Breaking (b-bump in 0.8.0):** `SessionMetadata.sourceKind` widened from `'session' \| 'scenario'` to `'session' \| 'scenario' \| 'synthetic'` — downstream `assertNever` exhaustive switches break. Engine-internal consumers don't branch on this field, so engine builds are unaffected. **Sub-RNG:** `PolicyContext.random()` is bound to a private `DeterministicRandom` seeded from `policySeed` (default: `Math.floor(world.random() * 0x1_0000_0000)`, derived BEFORE `recorder.connect()`). Sandboxed from `world.rng` so policy randomness doesn't perturb world state — replay reproduces trivially. **Determinism contract:** non-poisoned synthetic bundles with `ticksRun >= 1` pass `SessionReplayer.selfCheck()`; poisoned bundles cause selfCheck to re-throw the original tick failure (terminal-at-failed-tick segment isn't skipped); pre-step abort produces vacuous-ok bundles (`ticksRun === 0`, terminal == initial). Tier-1 of `docs/design/ai-first-dev-roadmap.md`. Per `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI design iterations + 7 plan iterations). 39 new tests across 3 commits (T1+T2+T3). |
+| 2026-04-27 | Behavioral Metrics over Corpus (v0.8.2) | Adds `Metric` accumulator contract + `runMetrics(bundles, metrics)` pure-function corpus reducer over `Iterable<SessionBundle>` + 11 engine-generic built-in metric factories (`bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`) + `compareMetricsResults` thin delta helper. **Engine-generic only** (ADR 24): metrics read fields the engine guarantees on `SessionBundle`; game-semantic metrics (resource Gini, time-to-first-conflict) are user-defined. **Submission-stage vs execution-stage split**: `commandValidationAcceptanceRate` reads `bundle.commands[].result.accepted` (submission gate); `executionFailureRate` reads `bundle.executions[].executed` (handler gate) — validator-rejected commands appear in commands but never in executions per `world.ts:732-748`. **`Stats` JSON-stable**: empty-corpus numeric fields are `null` (not `NaN`) to survive `JSON.stringify`/`JSON.parse` round-trip. **NumPy linear (R type 7) percentiles**, exact, deterministic. Per `docs/design/2026-04-27-behavioral-metrics-design.md` (v4, converged after 4 multi-CLI design iterations + 4 plan iterations). 44 new tests in `tests/behavioral-metrics.test.ts`. |
diff --git a/docs/changelog.md b/docs/changelog.md
index a3d872e..c6b7706 100644
--- a/docs/changelog.md
+++ b/docs/changelog.md
@@ -1,5 +1,48 @@
 # Changelog
 
+## 0.8.2 - 2026-04-27
+
+Spec 8 — Behavioral Metrics over Corpus. Tier-2 of the AI-first dev roadmap; pairs with Spec 3 (synthetic playtest) to define regressions for emergent behavior. Single direct-to-main commit per the updated AGENTS.md commit policy.
+
+### New (additive)
+
+- **`runMetrics(bundles, metrics)`**: pure-function corpus reducer over `Iterable<SessionBundle>`. Single-pass, multiplexed across all metrics. Throws `RangeError` on duplicate metric names. Iterates the iterable once.
+- **`compareMetricsResults(baseline, current)`**: thin delta helper. Returns deltas + percent changes + only-in-side variants; no regression judgment. Recurses through nested records (e.g., `commandTypeCounts`). Numeric leaves get `{ baseline, current, delta, pctChange }`; opaque (arrays, type mismatches) get `{ baseline, current, equal }`; `null` inputs propagate to `null` deltas.
+- **`Metric<TState, TResult>`**: accumulator-style contract — `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`, optional `orderSensitive`. In-place mutation OK; functional purity (output depends only on inputs) is the contract.
+- **`Stats` shape**: `{ count; min; max; mean; p50; p95; p99 }` with `number | null` numeric fields. Empty corpus → `null` (JSON-stable; `NaN` would not be). NumPy linear (R type 7) percentiles, exact, deterministic.
+- **11 engine-generic built-in metric factories**:
+  - `bundleCount` — total bundles in corpus.
+  - `sessionLengthStats` — Stats over `metadata.durationTicks`.
+  - `commandRateStats` — Stats over per-bundle `commands.length / durationTicks` (0 for zero-duration).
+  - `eventRateStats` — Stats over per-bundle `sum(ticks[].events.length) / durationTicks`.
+  - `commandTypeCounts` — `Record<string, number>` over `bundle.commands[].type` (counts SUBMISSIONS).
+  - `eventTypeCounts` — `Record<string, number>` over `bundle.ticks[].events[].type`.
+  - `failureBundleRate` — ratio of bundles with non-empty `metadata.failedTicks`.
+  - `failedTickRate` — ratio of total failed ticks to total duration ticks (zero-tick corpus → 0).
+  - `incompleteBundleRate` — ratio of bundles with `metadata.incomplete === true`.
+  - `commandValidationAcceptanceRate` — ratio of `bundle.commands[].result.accepted === true` (submission-stage validator-gate signal).
+  - `executionFailureRate` — ratio of `bundle.executions[].executed === false` (execution-stage handler-failure signal).
+
+### Submission-stage vs execution-stage semantics
+
+`commandValidationAcceptanceRate` and `executionFailureRate` read different bundle sources by design. Validator-rejected commands appear in `bundle.commands[].result.accepted=false` but NEVER in `bundle.executions` (validators short-circuit before queueing per `world.ts:732-748`). Pair the two metrics to detect both regression types.
+
+### ADRs
+
+- ADR 23: Accumulator-style metric contract over reducer or per-bundle-map+combine.
+- ADR 24: Engine-generic built-ins only; game-semantic metrics are user-defined.
+- ADR 25: `compareMetricsResults` returns deltas, not regression judgments.
+- ADR 26: `Iterable<SessionBundle>` only in v1; `AsyncIterable` deferred to a separate `runMetricsAsync`.
+- ADR 27: Do NOT aggregate `stopReason` in v1.
+
+### Validation
+
+All four engine gates pass: `npm test` (842 passed + 2 todo, +44 new in `tests/behavioral-metrics.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`. Multi-CLI code review converged.
+
+### What's next on the AI-first roadmap
+
+Tier-1 (Specs 1, 3) and Tier-2 (Spec 8) implemented. Remaining: Spec 2 (Annotation UI), Spec 4 (Bundle Viewer), Spec 5 (Counterfactual Replay), Spec 6 (Strict-Mode Determinism), Spec 7 (Bundle Search / Corpus Index), Spec 9 (AI Playtester Agent).
+
 ## 0.8.1 - 2026-04-27
 
 Synthetic Playtest T3: cross-cutting determinism integration tests + structural docs (closes Spec 3 implementation).
diff --git a/docs/design/ai-first-dev-roadmap.md b/docs/design/ai-first-dev-roadmap.md
index ecc83f4..a8e1850 100644
--- a/docs/design/ai-first-dev-roadmap.md
+++ b/docs/design/ai-first-dev-roadmap.md
@@ -164,7 +164,7 @@ Why it's deferred: it's a meaty engine-wide behavioral change with its own desig
 | 5    | Counterfactual Replay / Fork         | Proposed   | not yet drafted                                           |
 | 6    | Strict-Mode Determinism Enforcement  | Proposed   | not yet drafted                                           |
 | 7    | Bundle Search / Corpus Index         | Proposed   | not yet drafted                                           |
-| 8    | Behavioral Metrics over Corpus       | Proposed   | not yet drafted                                           |
+| 8    | Behavioral Metrics over Corpus       | **Implemented** (v0.8.2) | `2026-04-27-behavioral-metrics-design.md` (v4) + `2026-04-27-behavioral-metrics-implementation-plan.md` (v4) |
 | 9    | AI Playtester Agent                  | Proposed   | not yet drafted                                           |
 
 Update this row as specs are drafted, accepted, implemented, and merged.
diff --git a/docs/devlog/detailed/2026-04-27_2026-04-27.md b/docs/devlog/detailed/2026-04-27_2026-04-27.md
new file mode 100644
index 0000000..3010177
--- /dev/null
+++ b/docs/devlog/detailed/2026-04-27_2026-04-27.md
@@ -0,0 +1,88 @@
+# Detailed Devlog — 2026-04-27 (rolled over from 2026-04-26_2026-04-27.md after Spec 3 chain pushed it past 500 lines)
+
+## 2026-04-27 — Spec 8 (Behavioral Metrics over Corpus) — v0.8.2
+
+**Action:** Implemented Spec 8 in a single direct-to-main commit per AGENTS.md updated commit policy. Tier-2 of the AI-first dev roadmap; pairs with Spec 3 (Synthetic Playtest Harness) to define regressions for emergent behavior.
+
+### Surface added
+
+- `src/behavioral-metrics.ts` (~330 LOC):
+  - `Metric<TState, TResult>` accumulator contract: `create()`, `observe(state, bundle)`, `finalize(state)`, optional `merge`, optional `orderSensitive` doc-only marker.
+  - `runMetrics(bundles, metrics)` pure function over `Iterable<SessionBundle>`. Single-pass, multiplexed across all metrics. Throws `RangeError` on duplicate metric names. Iterates the `Iterable` once.
+  - `compareMetricsResults(baseline, current)` thin delta helper. NumericDelta + OpaqueDelta + OnlyInComparison shapes. Recurses through nested records (e.g., `commandTypeCounts`). `pctChange` conventions: `0/0 → 0`; `nonzero/0 → ±Infinity`; `null` inputs → `null` deltas. Arrays opaque (no per-element diff).
+  - `Stats` shape: `{ count; min; max; mean; p50; p95; p99 }` with `number | null` numeric fields. Empty-corpus → `null` (JSON-stable; `NaN` would lose round-trip integrity).
+  - 11 engine-generic built-in metric factories: `bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`.
+  - Internal `computeStats` helper using NumPy linear (R-quantile type 7) percentiles with literal formula: `index = (count - 1) * p; lo = floor(index); hi = ceil(index); v = sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo)`.
+
+### Submission vs execution semantics (key design call)
+
+`commandValidationAcceptanceRate` reads `bundle.commands[].result.accepted`. Validator-rejected commands appear in `bundle.commands` (recorder captures every `submitWithResult` call) but NEVER in `bundle.executions` (validators short-circuit before queueing per `world.ts:732-748`).
+
+`executionFailureRate` reads `bundle.executions[].executed === false`. Captures handler-side failures only: `missing_handler`, `command_handler_threw`, `tick_aborted_before_handler` (per `world.ts:1686/1721/1769`).
+
+The two metrics together cover both regression types — submission-gate (validator) and execution-gate (handler).
+
+### What's NOT in v1 (deliberate)
+
+- `stopReasonHistogram`: `SynthPlaytestResult.stopReason` lives outside `SessionBundle`. Aggregating requires a separate Spec 3 follow-up to persist it. Deferred (ADR 27).
+- Per-phase failure metrics: `bundle.failures: TickFailure[]` carries phase + error info; v1 reads only `metadata.failedTicks` (just tick numbers). User-defined.
+- Game-semantic metrics: resource Gini, time-to-first-conflict, etc. Need standard event/marker contracts engine doesn't define.
+- `WorldMetrics.durationMs` aggregation: runtime instrumentation, not behavior data.
+- `AsyncIterable` corpus source: ADR 26 — future `runMetricsAsync` is a separate function (not an overload — would break sync return type).
+
+### Tests
+
+`tests/behavioral-metrics.test.ts` — 44 cases across:
+- `Stats` shape (1 case).
+- `bundleCount` (2 cases).
+- `sessionLengthStats` (3 cases incl. NumPy-linear hand-computed percentiles for `[10,20,30,40,50]`: p50=30, p95=48, p99=49.6).
+- `commandRateStats` (3 cases incl. zero-durationTicks contributes 0).
+- `eventRateStats` (2 cases).
+- `commandTypeCounts` (2 cases).
+- `eventTypeCounts` (2 cases).
+- `failureBundleRate` (3 cases).
+- `failedTickRate` (3 cases incl. zero-tick corpus → 0).
+- `incompleteBundleRate` (2 cases).
+- `commandValidationAcceptanceRate` (3 cases reading `bundle.commands[].result.accepted`).
+- `executionFailureRate` (3 cases reading `bundle.executions[].executed`).
+- `runMetrics` (4 cases incl. side-effecting generator counter verifying single-pass — bundlesIterated === 5, not 5×11=55).
+- `compareMetricsResults` (8 cases incl. numeric delta + 0/0 + nonzero/0 + null + opaque arrays + only-in-side at top + only-in-side at nested-record + type mismatch).
+- Cross-cutting: order-insensitivity (1 case — reverse iteration produces identical results across all 11 built-ins).
+- Cross-cutting: user-defined metric integration (1 case — `distinctSeedCount` reading `bundle.metadata.policySeed`).
+- Cross-cutting: volatile-metadata exclusion (1 case — sessionId/recordedAt don't affect built-in results).
+
+### Documentation
+
+- `docs/api-reference.md`: new "Behavioral Metrics (v0.8.2)" section with full type signatures + per-metric table + percentile method spec.
+- `docs/guides/behavioral-metrics.md` (new, ~155 lines): quickstart, custom-metric authoring, determinism contract, Stats shape + percentile method, CI pattern with type-narrowing idiom, submission-vs-execution split, deliberate non-features.
+- `docs/architecture/decisions.md`: ADRs 23-27 (5 new) — accumulator contract, engine-generic-only, deltas not judgments, Iterable-only/runMetricsAsync split, no stopReason aggregation.
+- `docs/architecture/ARCHITECTURE.md`: Component Map row for Behavioral Metrics.
+- `docs/architecture/drift-log.md`: 2026-04-27 entry covering the v0.8.2 ship.
+- `docs/design/ai-first-dev-roadmap.md`: Spec 8 status → Implemented (v0.8.2).
+- `docs/guides/ai-integration.md`: appended Tier-2 reference linking to behavioral-metrics guide.
+- `docs/guides/synthetic-playtest.md`: appended "Computing metrics over bundles" subsection cross-linking to behavioral-metrics.
+- `docs/README.md`: index entry.
+- `README.md`: Feature Overview row + Public Surface bullet + version badge → 0.8.2.
+- `docs/changelog.md`: 0.8.2 entry.
+
+### Code review
+
+Multi-CLI code review on the Spec 8 diff (Codex + Opus, parallel). Synthesis at `docs/reviews/behavioral-metrics-T1/2026-04-27/<iter>/REVIEW.md`. Iterated to convergence per AGENTS.md.
+
+### Validation
+
+All four engine gates pass:
+- `npm test` → 842 passing + 2 todo (48 test files), +44 new in `tests/behavioral-metrics.test.ts`.
+- `npm run typecheck` → clean.
+- `npm run lint` → clean.
+- `npm run build` → clean.
+
+### Reasoning
+
+Spec 8 is one coherent shipped change → one commit → one version bump (v0.8.2 c-bump, additive). The plan was originally split into T1+T2 but Codex's iter-2 review correctly noted that AGENTS.md doc-discipline requires structural docs (ARCHITECTURE Component Map, drift-log, roadmap status) to land in the same commit as the code that introduces the subsystem. Plan v3 collapsed to a single task; v4 added the explicit devlog rollover step (active file at 841 lines → past the 500 soft cap → rolled over to this fresh `2026-04-27_2026-04-27.md`).
+
+The hardest call was the submission-vs-execution semantics. v1 of the design conflated the two; iter-1 Codex caught that `commandAcceptanceRate` reading `bundle.executions[].executed` would silently miss validator rejections (which never reach executions). v3 of the design renamed and re-rooted the metric to read `bundle.commands[].result.accepted`. The rename + the paired `executionFailureRate` covers both regression directions cleanly.
+
+### Next
+
+Spec 8 closes the Tier-1 + Tier-2 phase of the AI-first roadmap (Spec 1 + Spec 3 + Spec 8 implemented). Remaining roadmap items: Spec 2 (Annotation UI — Tier-1), Spec 4 (Bundle Viewer — Tier-3), Spec 5 (Counterfactual Replay — Tier-3), Spec 6 (Strict-Mode Determinism — Tier-3), Spec 7 (Bundle Search / Corpus Index — Tier-2), Spec 9 (AI Playtester Agent — Tier-3). Per the user's directive ("continue with the next steps in the session recording and overall ai first dev roadmap"), next priority is likely Spec 7 (corpus index, which would let Spec 8 scale beyond in-memory `Iterable<SessionBundle>` arrays).
diff --git a/docs/devlog/summary.md b/docs/devlog/summary.md
index aff2762..9d68133 100644
--- a/docs/devlog/summary.md
+++ b/docs/devlog/summary.md
@@ -1,5 +1,6 @@
 # Devlog Summary
 
+- 2026-04-27: Spec 8 — Behavioral Metrics over Corpus (v0.8.2) — `runMetrics(bundles, metrics)` pure-function reducer over `Iterable<SessionBundle>` + 11 engine-generic built-in metric factories + accumulator-style `Metric` contract + `compareMetricsResults` thin delta helper. 5 ADRs (23-27). Single-commit ship per AGENTS.md doc-with-code rule. 44 new tests; 842 passed + 2 todo. **Tier-2 of AI-first roadmap implemented; Spec 1+3+8 complete.** Devlog rolled over to `2026-04-27_2026-04-27.md` (active file hit 841 lines).
 - 2026-04-27: Spec 3 T3 (v0.8.1) — Determinism integration tests (selfCheck round-trip, production-determinism dual-run, sub-RNG positive/negative, poisoned-bundle replay throws, pre-step abort vacuous, bundle→script regression) + structural docs (ARCHITECTURE Component Map, drift-log, roadmap status → Implemented for Spec 3 + Spec 1, ai-integration Tier-1 reference). 7 new tests; 798 passed + 2 todo. **Spec 3 implementation complete (T1+T2+T3); awaiting merge authorization.**
 - 2026-04-27: Spec 3 T2 (v0.8.0, **b-bump**) — `runSynthPlaytest` harness + SessionMetadata.sourceKind union widened to add 'synthetic' (breaking for assertNever consumers, per ADR 20). Sub-RNG init via `Math.floor(world.random() * 0x1_0000_0000)` pre-connect; `terminalSnapshot:true` hardcoded; 5-value stopReason union with separate connect-time-failure (re-throw) and mid-tick-failure ('sinkError') paths. ADRs 20, 20a, 21, 22. 17 new harness tests; 789 passed + 2 todo.
 - 2026-04-27: Spec 3 T1 (v0.7.20) — Synthetic Playtest Policy interface + 3 built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`). 4-generic shape matches `World<...>`; sub-RNG via `PolicyContext.random()` (ADR 19). `runSynthPlaytest` harness ships in T2 (v0.8.0). 13 new tests; 772 passed + 2 todo.
diff --git a/docs/guides/ai-integration.md b/docs/guides/ai-integration.md
index e934ce7..52136f5 100644
--- a/docs/guides/ai-integration.md
+++ b/docs/guides/ai-integration.md
@@ -272,3 +272,28 @@ const result = runSynthPlaytest({
 ```
 
 See `docs/guides/synthetic-playtest.md` for the policy-authoring guide, determinism contract, and bundle→script regression workflow.
+
+## Behavioral Metrics over Corpus (Tier 2)
+
+`runMetrics(bundles, metrics)` is the Tier-2 corpus reducer (Spec 8 of `docs/design/ai-first-dev-roadmap.md`). It computes engine-generic + user-defined metrics over an `Iterable<SessionBundle>` — typically the corpus produced by N runs of `runSynthPlaytest`. Pair with `compareMetricsResults(baseline, current)` to detect emergent-behavior regressions.
+
+```typescript
+import {
+  runMetrics, compareMetricsResults,
+  bundleCount, sessionLengthStats, commandRateStats,
+  commandValidationAcceptanceRate, executionFailureRate,
+} from 'civ-engine';
+
+const current = runMetrics(bundles, [
+  bundleCount(),
+  sessionLengthStats(),
+  commandRateStats(),
+  commandValidationAcceptanceRate(),
+  executionFailureRate(),
+]);
+const baseline = JSON.parse(fs.readFileSync('baseline-metrics.json', 'utf-8'));
+const cmp = compareMetricsResults(baseline, current);
+// Caller decides what's a regression — pctChange/delta/equal leaves are pure data.
+```
+
+See `docs/guides/behavioral-metrics.md` for the policy-authoring guide, custom-metric pattern, JSON-stable null semantics for empty-corpus `Stats`, and the submission-stage vs execution-stage acceptance/failure split.
diff --git a/docs/guides/behavioral-metrics.md b/docs/guides/behavioral-metrics.md
new file mode 100644
index 0000000..8dbfc5e
--- /dev/null
+++ b/docs/guides/behavioral-metrics.md
@@ -0,0 +1,152 @@
+# Behavioral Metrics over Corpus
+
+Tier-2 of the AI-first feedback loop (Spec 8). A pure-function corpus reducer over `Iterable<SessionBundle>` — typically the bundles produced by `runSynthPlaytest` (Spec 3). Computes engine-generic + user-defined metrics; compares baseline vs. current to detect emergent-behavior regressions.
+
+## Quickstart
+
+```typescript
+import {
+  runSynthPlaytest, randomPolicy,
+  runMetrics, compareMetricsResults,
+  bundleCount, sessionLengthStats, commandRateStats,
+  commandValidationAcceptanceRate, executionFailureRate,
+  type SessionBundle,
+} from 'civ-engine';
+
+// 1. Generate a corpus via Spec 3.
+const bundles: SessionBundle[] = [];
+for (let i = 0; i < 64; i++) {
+  const result = runSynthPlaytest({
+    world: setup(),
+    policies: [/* ... */],
+    maxTicks: 1000,
+    policySeed: i,
+  });
+  if (result.ok) bundles.push(result.bundle);
+}
+
+// 2. Compute metrics in one pass.
+const current = runMetrics(bundles, [
+  bundleCount(),
+  sessionLengthStats(),
+  commandRateStats(),
+  commandValidationAcceptanceRate(),
+  executionFailureRate(),
+]);
+
+console.log(current);
+// { bundleCount: 64, sessionLengthStats: { count: 64, min: ..., p95: ..., ... }, ... }
+```
+
+## Authoring a custom metric
+
+The accumulator contract: `create()` → state → `observe(state, bundle)` → updated state → `finalize(state)` → result.
+
+```typescript
+import type { Metric } from 'civ-engine';
+
+const distinctSeedCount: Metric<Set<number>, number> = {
+  name: 'distinctSeedCount',
+  create: () => new Set<number>(),
+  observe: (state, bundle) => {
+    if (bundle.metadata.policySeed !== undefined) {
+      state.add(bundle.metadata.policySeed);
+    }
+    return state;  // in-place mutation OK; same reference returned
+  },
+  finalize: (state) => state.size,
+};
+```
+
+The metric multiplexes alongside built-ins — `runMetrics` calls every metric's `observe` per bundle in a single pass:
+
+```typescript
+const result = runMetrics(bundles, [bundleCount(), sessionLengthStats(), distinctSeedCount]);
+console.log(result.distinctSeedCount);  // e.g., 32 if 32 distinct seeds in corpus
+```
+
+### Determinism contract
+
+Metrics MUST be deterministic given the same bundles. Built-ins are all order-insensitive (counts, sums, sorted-on-finalize percentiles). User metrics that depend on iteration order should declare `orderSensitive: true` (doc-only marker) and the caller is responsible for stable iteration order.
+
+Volatile bundle metadata (`sessionId`, `recordedAt`) is NOT read by any built-in. User metrics reading these get fragile results — every run produces fresh values, so deltas in `compareMetricsResults` will be unstable.
+
+### Stats and percentiles
+
+Built-in metrics ending in `Stats` return:
+
+```typescript
+interface Stats {
+  count: number;
+  min: number | null;   // null when count === 0 (JSON-stable)
+  max: number | null;
+  mean: number | null;
+  p50: number | null;
+  p95: number | null;
+  p99: number | null;
+}
+```
+
+Percentiles use NumPy linear (R-quantile type 7). Empty corpus produces `null` numeric fields (NOT `NaN`, which would not survive `JSON.stringify`/`JSON.parse` round-trip).
+
+## CI pattern: regression detection
+
+```typescript
+import * as fs from 'node:fs';
+import { compareMetricsResults, type NumericDelta } from 'civ-engine';
+
+// Load baseline from previous CI run.
+const baseline = JSON.parse(fs.readFileSync('baseline-metrics.json', 'utf-8'));
+
+// Compute current from this run's corpus.
+const current = runMetrics(bundles, metrics);
+
+// Compare.
+const cmp = compareMetricsResults(baseline, current);
+
+// Caller decides what's a regression. MetricsComparison entries can be:
+// - NumericDelta: { baseline, current, delta, pctChange }
+// - OpaqueDelta: { baseline, current, equal }
+// - OnlyInComparison: { baseline?, current?, onlyIn: 'baseline' | 'current' }
+// - Nested record: recursive structure (e.g., commandTypeCounts)
+
+// Type-narrowing pattern: handle missing-key case explicitly to avoid silent skips.
+const sessionLengthEntry = cmp.sessionLengthStats;
+if (sessionLengthEntry === undefined || 'onlyIn' in sessionLengthEntry) {
+  throw new Error(`sessionLengthStats missing or unilateral in comparison`);
+}
+const p95 = (sessionLengthEntry as { p95: NumericDelta }).p95;
+if (p95.pctChange !== null && Math.abs(p95.pctChange) > 0.20) {
+  throw new Error(`p95 session length shifted ${(p95.pctChange * 100).toFixed(1)}%`);
+}
+
+// Save current as next run's baseline.
+fs.writeFileSync('baseline-metrics.json', JSON.stringify(current, null, 2));
+```
+
+`pctChange` conventions: `0/0 → 0`; `nonzero/0 → ±Infinity`; `null` inputs (e.g., empty-corpus baseline `Stats.p95`) propagate to `null` deltas — consumers can detect "no baseline data" or "no current data" via `=== null`.
+
+## Submission vs. execution semantics
+
+Two metrics handle two distinct stages of command processing:
+
+- `commandValidationAcceptanceRate` reads `bundle.commands[].result.accepted`. Validator-rejected commands appear here with `accepted: false` but never reach `bundle.executions` (they short-circuit in `world.processCommands` before queueing).
+- `executionFailureRate` reads `bundle.executions[].executed`. Captures handler-side failures: `missing_handler`, `command_handler_threw`, or `tick_aborted_before_handler`.
+
+Pair them to detect both regression types:
+- `commandValidationAcceptanceRate` dropping → validator regression (a guard tightened, or behavior shifted to send invalid commands).
+- `executionFailureRate` rising → handler/tick-pipeline regression.
+
+## What's not built in (deliberately)
+
+- `stopReasonHistogram`: `SynthPlaytestResult.stopReason` lives outside `SessionBundle`; aggregating requires a Spec 3 follow-up to persist it. ADR 27.
+- Per-phase failure metrics: `bundle.failures: TickFailure[]` carries the phase + error info. Built-ins read only `metadata.failedTicks`. User-defined.
+- Game-semantic metrics: "resource Gini", "time-to-first-conflict", "decision points per minute" — these need standard event/marker contracts the engine doesn't define. Game projects implement these as user-defined metrics.
+- `WorldMetrics.durationMs` aggregation: runtime instrumentation, not behavior data.
+
+## See also
+
+- `docs/design/2026-04-27-behavioral-metrics-design.md` — full spec (v4, converged).
+- `docs/architecture/decisions.md` — ADRs 23-27.
+- `docs/guides/synthetic-playtest.md` — Spec 3 harness that produces the corpus.
+- `docs/guides/ai-integration.md` — Tier-2 of the AI feedback loop.
diff --git a/docs/guides/synthetic-playtest.md b/docs/guides/synthetic-playtest.md
index 35f62a4..d53a14f 100644
--- a/docs/guides/synthetic-playtest.md
+++ b/docs/guides/synthetic-playtest.md
@@ -214,3 +214,22 @@ if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
 - `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10) for the full spec.
 - `docs/design/ai-first-dev-roadmap.md` for how Spec 3 fits into the broader roadmap.
 - `docs/guides/session-recording.md` for the underlying SessionRecorder/SessionReplayer machinery.
+
+## Computing metrics over bundles
+
+After producing a corpus of synthetic playtest bundles, `runMetrics` (Spec 8) reduces them to aggregate metrics for regression detection:
+
+```typescript
+import { runMetrics, bundleCount, sessionLengthStats } from 'civ-engine';
+
+const bundles: SessionBundle[] = [];
+for (let i = 0; i < 32; i++) {
+  const result = runSynthPlaytest({ world: setup(), policies: [/* ... */], maxTicks: 1000, policySeed: i });
+  if (result.ok) bundles.push(result.bundle);
+}
+
+const metrics = runMetrics(bundles, [bundleCount(), sessionLengthStats()]);
+console.log(metrics.bundleCount, metrics.sessionLengthStats);
+```
+
+See `docs/guides/behavioral-metrics.md` for the full metric catalog, `compareMetricsResults` regression-detection helper, and the accumulator-style contract for custom metrics.
diff --git a/package.json b/package.json
index 8a2ae53..c284ad2 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "civ-engine",
-  "version": "0.8.1",
+  "version": "0.8.2",
   "type": "module",
   "main": "./dist/index.js",
   "types": "./dist/index.d.ts",
diff --git a/src/behavioral-metrics.ts b/src/behavioral-metrics.ts
new file mode 100644
index 0000000..a4bf405
--- /dev/null
+++ b/src/behavioral-metrics.ts
@@ -0,0 +1,357 @@
+import type { SessionBundle } from './session-bundle.js';
+import type { JsonValue } from './json.js';
+
+export interface Stats {
+  count: number;
+  min: number | null;
+  max: number | null;
+  mean: number | null;
+  p50: number | null;
+  p95: number | null;
+  p99: number | null;
+}
+
+export interface Metric<TState, TResult> {
+  readonly name: string;
+  create(): TState;
+  observe(state: TState, bundle: SessionBundle): TState;
+  finalize(state: TState): TResult;
+  merge?(a: TState, b: TState): TState;
+  readonly orderSensitive?: boolean;
+}
+
+export type MetricsResult = Record<string, unknown>;
+
+export function runMetrics<
+  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+  TDebug = JsonValue,
+>(
+  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
+  metrics: Metric<unknown, unknown>[],
+): MetricsResult {
+  const names = new Set<string>();
+  for (const m of metrics) {
+    if (names.has(m.name)) {
+      throw new RangeError(`duplicate metric name: ${m.name}`);
+    }
+    names.add(m.name);
+  }
+  const states: unknown[] = metrics.map((m) => m.create());
+  for (const bundle of bundles) {
+    for (let i = 0; i < metrics.length; i++) {
+      states[i] = metrics[i].observe(states[i], bundle as unknown as SessionBundle);
+    }
+  }
+  const result: MetricsResult = {};
+  for (let i = 0; i < metrics.length; i++) {
+    result[metrics[i].name] = metrics[i].finalize(states[i]);
+  }
+  return result;
+}
+
+function computeStats(values: number[]): Stats {
+  const count = values.length;
+  if (count === 0) {
+    return { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
+  }
+  const sorted = [...values].sort((a, b) => a - b);
+  const min = sorted[0];
+  const max = sorted[count - 1];
+  const mean = sorted.reduce((s, v) => s + v, 0) / count;
+  const percentile = (p: number): number => {
+    if (count === 1) return sorted[0];
+    const idx = (count - 1) * p;
+    const lo = Math.floor(idx);
+    const hi = Math.ceil(idx);
+    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
+  };
+  return {
+    count, min, max, mean,
+    p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99),
+  };
+}
+
+export function bundleCount(name: string = 'bundleCount'): Metric<{ count: number }, number> {
+  return {
+    name,
+    create: () => ({ count: 0 }),
+    observe: (state) => {
+      state.count++;
+      return state;
+    },
+    finalize: (state) => state.count,
+  };
+}
+
+export function sessionLengthStats(name: string = 'sessionLengthStats'): Metric<number[], Stats> {
+  return {
+    name,
+    create: () => [],
+    observe: (state, bundle) => {
+      state.push(bundle.metadata.durationTicks);
+      return state;
+    },
+    finalize: (state) => computeStats(state),
+  };
+}
+
+export function commandRateStats(name: string = 'commandRateStats'): Metric<number[], Stats> {
+  return {
+    name,
+    create: () => [],
+    observe: (state, bundle) => {
+      const ticks = bundle.metadata.durationTicks;
+      state.push(ticks > 0 ? bundle.commands.length / ticks : 0);
+      return state;
+    },
+    finalize: (state) => computeStats(state),
+  };
+}
+
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
+
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
+
+export function eventTypeCounts(
+  name: string = 'eventTypeCounts',
+): Metric<Map<string, number>, Record<string, number>> {
+  return {
+    name,
+    create: () => new Map(),
+    observe: (state, bundle) => {
+      for (const tickEntry of bundle.ticks) {
+        for (const ev of tickEntry.events) {
+          const key = String(ev.type);
+          state.set(key, (state.get(key) ?? 0) + 1);
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
+
+export function failureBundleRate(
+  name: string = 'failureBundleRate',
+): Metric<{ withFailure: number; total: number }, number> {
+  return {
+    name,
+    create: () => ({ withFailure: 0, total: 0 }),
+    observe: (state, bundle) => {
+      state.total++;
+      if ((bundle.metadata.failedTicks?.length ?? 0) > 0) state.withFailure++;
+      return state;
+    },
+    finalize: (state) => (state.total > 0 ? state.withFailure / state.total : 0),
+  };
+}
+
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
+    finalize: (state) => (state.durationTicks > 0 ? state.failedTicks / state.durationTicks : 0),
+  };
+}
+
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
+    finalize: (state) => (state.total > 0 ? state.incomplete / state.total : 0),
+  };
+}
+
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
+    finalize: (state) => (state.total > 0 ? state.accepted / state.total : 0),
+  };
+}
+
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
+    finalize: (state) => (state.total > 0 ? state.failed / state.total : 0),
+  };
+}
+
+export type NumericDelta = {
+  baseline: number | null;
+  current: number | null;
+  delta: number | null;
+  pctChange: number | null;
+};
+
+export type OpaqueDelta = {
+  baseline: unknown;
+  current: unknown;
+  equal: boolean;
+};
+
+export type OnlyInComparison = {
+  baseline?: unknown;
+  current?: unknown;
+  onlyIn: 'baseline' | 'current';
+};
+
+export type MetricDelta =
+  | NumericDelta
+  | OpaqueDelta
+  | { [key: string]: MetricDelta | OnlyInComparison };
+
+export type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;
+
+function isPlainObject(value: unknown): value is Record<string, unknown> {
+  return (
+    typeof value === 'object' &&
+    value !== null &&
+    !Array.isArray(value) &&
+    Object.getPrototypeOf(value) === Object.prototype
+  );
+}
+
+function deepEqual(a: unknown, b: unknown): boolean {
+  if (a === b) return true;
+  if (typeof a !== typeof b) return false;
+  if (a === null || b === null) return a === b;
+  if (Array.isArray(a) && Array.isArray(b)) {
+    if (a.length !== b.length) return false;
+    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
+    return true;
+  }
+  if (isPlainObject(a) && isPlainObject(b)) {
+    const aKeys = Object.keys(a);
+    const bKeys = Object.keys(b);
+    if (aKeys.length !== bKeys.length) return false;
+    for (const k of aKeys) if (!deepEqual(a[k], b[k])) return false;
+    return true;
+  }
+  return false;
+}
+
+function compareValue(baseline: unknown, current: unknown): MetricDelta {
+  if (
+    (typeof baseline === 'number' || baseline === null) &&
+    (typeof current === 'number' || current === null)
+  ) {
+    if (baseline === null || current === null) {
+      return { baseline, current, delta: null, pctChange: null };
+    }
+    const delta = current - baseline;
+    let pctChange: number | null;
+    if (baseline === 0) {
+      pctChange = current === 0 ? 0 : current > 0 ? Infinity : -Infinity;
+    } else {
+      pctChange = (current - baseline) / baseline;
+    }
+    return { baseline, current, delta, pctChange };
+  }
+  if (isPlainObject(baseline) && isPlainObject(current)) {
+    const out: Record<string, MetricDelta | OnlyInComparison> = {};
+    const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
+    for (const k of allKeys) {
+      const inB = k in baseline;
+      const inC = k in current;
+      if (inB && inC) {
+        out[k] = compareValue(baseline[k], current[k]);
+      } else if (inB) {
+        out[k] = { baseline: baseline[k], onlyIn: 'baseline' };
+      } else {
+        out[k] = { current: current[k], onlyIn: 'current' };
+      }
+    }
+    return out;
+  }
+  return { baseline, current, equal: deepEqual(baseline, current) };
+}
+
+export function compareMetricsResults(
+  baseline: MetricsResult,
+  current: MetricsResult,
+): MetricsComparison {
+  const out: MetricsComparison = {};
+  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
+  for (const k of allKeys) {
+    const inB = k in baseline;
+    const inC = k in current;
+    if (inB && inC) {
+      out[k] = compareValue(baseline[k], current[k]);
+    } else if (inB) {
+      out[k] = { baseline: baseline[k], onlyIn: 'baseline' };
+    } else {
+      out[k] = { current: current[k], onlyIn: 'current' };
+    }
+  }
+  return out;
+}
diff --git a/src/index.ts b/src/index.ts
index feaef9d..19f9f5a 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -83,6 +83,33 @@ export {
   scenarioResultToBundle,
   type ScenarioResultToBundleOptions,
 } from './session-scenario-bundle.js';
+// Behavioral Metrics over Corpus — Spec 8 (v0.8.2+): pure-function corpus reducer
+// over Iterable<SessionBundle>. 11 engine-generic built-in metrics + accumulator-style
+// Metric contract + thin compareMetricsResults delta helper.
+export {
+  type Metric,
+  type MetricsResult,
+  type MetricsComparison,
+  type MetricDelta,
+  type NumericDelta,
+  type OpaqueDelta,
+  type OnlyInComparison,
+  type Stats,
+  runMetrics,
+  compareMetricsResults,
+  bundleCount,
+  sessionLengthStats,
+  commandRateStats,
+  eventRateStats,
+  commandTypeCounts,
+  eventTypeCounts,
+  failureBundleRate,
+  failedTickRate,
+  incompleteBundleRate,
+  commandValidationAcceptanceRate,
+  executionFailureRate,
+} from './behavioral-metrics.js';
+
 // Synthetic Playtest — Spec 3 T1+T2 (v0.7.20+): Policy types, 3 built-in policies, runSynthPlaytest harness.
 export {
   type Policy,
diff --git a/src/version.ts b/src/version.ts
index 2db5321..57aacc4 100644
--- a/src/version.ts
+++ b/src/version.ts
@@ -4,4 +4,4 @@
  * `metadata.engineVersion` in session bundles. Avoids relying on
  * `process.env.npm_package_version` which is only set under `npm run`.
  */
-export const ENGINE_VERSION = '0.8.1' as const;
+export const ENGINE_VERSION = '0.8.2' as const;
diff --git a/tests/behavioral-metrics.test.ts b/tests/behavioral-metrics.test.ts
new file mode 100644
index 0000000..760e5d4
--- /dev/null
+++ b/tests/behavioral-metrics.test.ts
@@ -0,0 +1,447 @@
+import { describe, expect, it } from 'vitest';
+import {
+  bundleCount,
+  commandRateStats,
+  commandTypeCounts,
+  commandValidationAcceptanceRate,
+  compareMetricsResults,
+  eventRateStats,
+  eventTypeCounts,
+  executionFailureRate,
+  failedTickRate,
+  failureBundleRate,
+  incompleteBundleRate,
+  runMetrics,
+  sessionLengthStats,
+} from '../src/behavioral-metrics.js';
+import type {
+  Metric,
+  NumericDelta,
+  Stats,
+} from '../src/behavioral-metrics.js';
+import type {
+  CommandSubmissionResult,
+  CommandExecutionResult,
+} from '../src/world.js';
+import type { SessionBundle } from '../src/index.js';
+
+const mkBundle = (overrides: Partial<SessionBundle> = {}): SessionBundle =>
+  ({
+    schemaVersion: 1,
+    metadata: {
+      sessionId: 's-1',
+      engineVersion: '0.8.2',
+      nodeVersion: 'v20',
+      recordedAt: 't',
+      startTick: 0,
+      endTick: 10,
+      persistedEndTick: 10,
+      durationTicks: 10,
+      sourceKind: 'session',
+    },
+    initialSnapshot: {} as never,
+    ticks: [],
+    commands: [],
+    executions: [],
+    failures: [],
+    snapshots: [],
+    markers: [],
+    attachments: [],
+    ...overrides,
+  }) as SessionBundle;
+
+const mkSubmissionResult = (accepted: boolean): CommandSubmissionResult => ({
+  schemaVersion: 1 as never,
+  accepted,
+  commandType: 'spawn',
+  code: accepted ? 'OK' : 'REJECT',
+  message: '',
+  details: null,
+  tick: 0,
+  sequence: 0,
+  validatorIndex: null,
+});
+
+const mkCommand = (type: string = 'spawn', accepted: boolean = true) => ({
+  submissionTick: 0,
+  sequence: 0,
+  type,
+  data: { id: 1 },
+  result: { ...mkSubmissionResult(accepted), commandType: type },
+});
+
+const mkExecution = (executed: boolean): CommandExecutionResult => ({
+  schemaVersion: 1 as never,
+  submissionSequence: 0,
+  executed,
+  commandType: 'spawn',
+  code: executed ? 'OK' : 'command_handler_threw',
+  message: '',
+  details: null,
+  tick: 1,
+});
+
+// ---------- Stats type ----------
+describe('Stats shape', () => {
+  it('numeric fields are number | null and JSON-round-trip preserves null', () => {
+    const empty: Stats = { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
+    expect(JSON.parse(JSON.stringify(empty))).toEqual(empty);
+  });
+});
+
+// ---------- bundleCount ----------
+describe('bundleCount', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [bundleCount()]).bundleCount).toBe(0);
+  });
+  it('counts correctly across multi-bundle corpora', () => {
+    expect(runMetrics([mkBundle(), mkBundle(), mkBundle()], [bundleCount()]).bundleCount).toBe(3);
+  });
+});
+
+// ---------- sessionLengthStats ----------
+describe('sessionLengthStats', () => {
+  it('empty corpus returns count:0 + null fields', () => {
+    expect(runMetrics([], [sessionLengthStats()]).sessionLengthStats).toEqual({
+      count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null,
+    });
+  });
+  it('single-bundle corpus has degenerate equal stats', () => {
+    const b = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 42 } });
+    const s = runMetrics([b], [sessionLengthStats()]).sessionLengthStats as Stats;
+    expect(s).toEqual({ count: 1, min: 42, max: 42, mean: 42, p50: 42, p95: 42, p99: 42 });
+  });
+  it('multi-bundle corpus matches NumPy linear / R type 7 percentiles', () => {
+    // values [10,20,30,40,50] → p50=30, p95=48, p99=49.6
+    const bs = [10, 20, 30, 40, 50].map((v) => mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: v } }));
+    const s = runMetrics(bs, [sessionLengthStats()]).sessionLengthStats as Stats;
+    expect(s.count).toBe(5);
+    expect(s.min).toBe(10);
+    expect(s.max).toBe(50);
+    expect(s.mean).toBe(30);
+    expect(s.p50).toBe(30);
+    expect(s.p95).toBeCloseTo(48, 6);
+    expect(s.p99).toBeCloseTo(49.6, 6);
+  });
+});
+
+// ---------- commandRateStats ----------
+describe('commandRateStats', () => {
+  it('empty corpus → null Stats', () => {
+    const s = runMetrics([], [commandRateStats()]).commandRateStats as Stats;
+    expect(s.count).toBe(0);
+    expect(s.min).toBeNull();
+  });
+  it('zero-durationTicks contributes 0 (no divide-by-zero)', () => {
+    const b = mkBundle({
+      metadata: { ...mkBundle().metadata, durationTicks: 0 },
+      commands: [mkCommand()] as never,
+    });
+    const s = runMetrics([b], [commandRateStats()]).commandRateStats as Stats;
+    expect(s.min).toBe(0);
+  });
+  it('per-bundle rate: commands.length / durationTicks', () => {
+    const a = mkBundle({
+      metadata: { ...mkBundle().metadata, durationTicks: 10 },
+      commands: Array.from({ length: 10 }, () => mkCommand()) as never,  // rate 1.0
+    });
+    const b = mkBundle({
+      metadata: { ...mkBundle().metadata, durationTicks: 10 },
+      commands: Array.from({ length: 5 }, () => mkCommand()) as never,  // rate 0.5
+    });
+    const s = runMetrics([a, b], [commandRateStats()]).commandRateStats as Stats;
+    expect(s.min).toBe(0.5);
+    expect(s.max).toBe(1.0);
+    expect(s.mean).toBe(0.75);
+  });
+});
+
+// ---------- eventRateStats ----------
+describe('eventRateStats', () => {
+  it('empty corpus → null Stats', () => {
+    expect((runMetrics([], [eventRateStats()]).eventRateStats as Stats).count).toBe(0);
+  });
+  it('per-bundle rate: sum of events / durationTicks', () => {
+    const b = mkBundle({
+      metadata: { ...mkBundle().metadata, durationTicks: 10 },
+      ticks: [
+        { tick: 1, diff: {} as never, events: [{ type: 'a', data: {} }, { type: 'b', data: {} }], metrics: null, debug: null },
+        { tick: 2, diff: {} as never, events: [{ type: 'c', data: {} }], metrics: null, debug: null },
+      ] as never,
+    });
+    const s = runMetrics([b], [eventRateStats()]).eventRateStats as Stats;
+    expect(s.min).toBe(0.3);  // 3 events / 10 ticks
+  });
+});
+
+// ---------- commandTypeCounts ----------
+describe('commandTypeCounts', () => {
+  it('empty corpus → {}', () => {
+    expect(runMetrics([], [commandTypeCounts()]).commandTypeCounts).toEqual({});
+  });
+  it('aggregates type counts across bundles', () => {
+    const a = mkBundle({ commands: [mkCommand('move'), mkCommand('spawn'), mkCommand('move')] as never });
+    const b = mkBundle({ commands: [mkCommand('attack'), mkCommand('move')] as never });
+    expect(runMetrics([a, b], [commandTypeCounts()]).commandTypeCounts).toEqual({
+      move: 3, spawn: 1, attack: 1,
+    });
+  });
+});
+
+// ---------- eventTypeCounts ----------
+describe('eventTypeCounts', () => {
+  it('empty corpus → {}', () => {
+    expect(runMetrics([], [eventTypeCounts()]).eventTypeCounts).toEqual({});
+  });
+  it('aggregates event types across all ticks', () => {
+    const b = mkBundle({
+      ticks: [
+        { tick: 1, diff: {} as never, events: [{ type: 'fire', data: {} }, { type: 'spawn', data: {} }], metrics: null, debug: null },
+        { tick: 2, diff: {} as never, events: [{ type: 'fire', data: {} }], metrics: null, debug: null },
+      ] as never,
+    });
+    expect(runMetrics([b], [eventTypeCounts()]).eventTypeCounts).toEqual({ fire: 2, spawn: 1 });
+  });
+});
+
+// ---------- failureBundleRate ----------
+describe('failureBundleRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [failureBundleRate()]).failureBundleRate).toBe(0);
+  });
+  it('all-clean → 0', () => {
+    expect(runMetrics([mkBundle(), mkBundle()], [failureBundleRate()]).failureBundleRate).toBe(0);
+  });
+  it('mixed → ratio', () => {
+    const failing = mkBundle({ metadata: { ...mkBundle().metadata, failedTicks: [3] } });
+    expect(runMetrics([mkBundle(), failing, mkBundle(), failing], [failureBundleRate()]).failureBundleRate).toBe(0.5);
+  });
+});
+
+// ---------- failedTickRate ----------
+describe('failedTickRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [failedTickRate()]).failedTickRate).toBe(0);
+  });
+  it('zero-tick corpus → 0 (no divide-by-zero)', () => {
+    const aborted = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 0 } });
+    expect(runMetrics([aborted, aborted], [failedTickRate()]).failedTickRate).toBe(0);
+  });
+  it('total failed ticks / total duration ticks', () => {
+    const a = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 100, failedTicks: [50] } });
+    const b = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 100, failedTicks: [] } });
+    expect(runMetrics([a, b], [failedTickRate()]).failedTickRate).toBe(0.005);
+  });
+});
+
+// ---------- incompleteBundleRate ----------
+describe('incompleteBundleRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [incompleteBundleRate()]).incompleteBundleRate).toBe(0);
+  });
+  it('mixed → ratio', () => {
+    const inc = mkBundle({ metadata: { ...mkBundle().metadata, incomplete: true } });
+    expect(runMetrics([mkBundle(), inc, mkBundle(), inc], [incompleteBundleRate()]).incompleteBundleRate).toBe(0.5);
+  });
+});
+
+// ---------- commandValidationAcceptanceRate ----------
+describe('commandValidationAcceptanceRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0);
+  });
+  it('zero-submission corpus → 0', () => {
+    expect(runMetrics([mkBundle()], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0);
+  });
+  it('reads bundle.commands[].result.accepted', () => {
+    const b = mkBundle({
+      commands: [mkCommand('spawn', true), mkCommand('spawn', true), mkCommand('spawn', false), mkCommand('spawn', true)] as never,
+    });
+    expect(runMetrics([b], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0.75);
+  });
+});
+
+// ---------- executionFailureRate ----------
+describe('executionFailureRate', () => {
+  it('empty corpus → 0', () => {
+    expect(runMetrics([], [executionFailureRate()]).executionFailureRate).toBe(0);
+  });
+  it('zero-execution corpus → 0', () => {
+    expect(runMetrics([mkBundle()], [executionFailureRate()]).executionFailureRate).toBe(0);
+  });
+  it('reads bundle.executions[].executed', () => {
+    const b = mkBundle({
+      executions: [mkExecution(true), mkExecution(false), mkExecution(true), mkExecution(false)] as never,
+    });
+    expect(runMetrics([b], [executionFailureRate()]).executionFailureRate).toBe(0.5);
+  });
+});
+
+// ---------- runMetrics ----------
+describe('runMetrics', () => {
+  it('multiplexes 11 built-ins in a single pass (verified by side-effecting iterator counter)', () => {
+    let bundlesIterated = 0;
+    function* source(count: number): Generator<SessionBundle> {
+      for (let i = 0; i < count; i++) {
+        bundlesIterated++;
+        yield mkBundle();
+      }
+    }
+    const metrics: Metric<unknown, unknown>[] = [
+      bundleCount() as Metric<unknown, unknown>,
+      sessionLengthStats() as Metric<unknown, unknown>,
+      commandRateStats() as Metric<unknown, unknown>,
+      eventRateStats() as Metric<unknown, unknown>,
+      commandTypeCounts() as Metric<unknown, unknown>,
+      eventTypeCounts() as Metric<unknown, unknown>,
+      failureBundleRate() as Metric<unknown, unknown>,
+      failedTickRate() as Metric<unknown, unknown>,
+      incompleteBundleRate() as Metric<unknown, unknown>,
+      commandValidationAcceptanceRate() as Metric<unknown, unknown>,
+      executionFailureRate() as Metric<unknown, unknown>,
+    ];
+    const result = runMetrics(source(5), metrics);
+    expect(bundlesIterated).toBe(5);  // not 5*11 = 55
+    expect(Object.keys(result)).toHaveLength(11);
+    expect(result.bundleCount).toBe(5);
+  });
+
+  it('throws RangeError on duplicate metric names', () => {
+    expect(() => runMetrics([], [bundleCount(), bundleCount()])).toThrow(RangeError);
+  });
+
+  it('iterates iterable once: same generator gives 0 on second call', () => {
+    function* source(): Generator<SessionBundle> { yield mkBundle(); yield mkBundle(); }
+    const it = source();
+    expect(runMetrics(it, [bundleCount()]).bundleCount).toBe(2);
+    expect(runMetrics(it, [bundleCount()]).bundleCount).toBe(0);
+  });
+
+  it('Iterable<T> contract: arrays and Sets work', () => {
+    expect(runMetrics([mkBundle(), mkBundle()], [bundleCount()]).bundleCount).toBe(2);
+    expect(runMetrics(new Set([mkBundle(), mkBundle(), mkBundle()]), [bundleCount()]).bundleCount).toBe(3);
+  });
+});
+
+// ---------- compareMetricsResults ----------
+describe('compareMetricsResults', () => {
+  it('numeric leaf: positive delta + pctChange', () => {
+    const cmp = compareMetricsResults({ rate: 100 }, { rate: 110 });
+    expect(cmp.rate).toEqual({ baseline: 100, current: 110, delta: 10, pctChange: 0.1 });
+  });
+
+  it('numeric leaf: 0/0 → pctChange 0', () => {
+    const cmp = compareMetricsResults({ x: 0 }, { x: 0 });
+    expect((cmp.x as NumericDelta).pctChange).toBe(0);
+  });
+
+  it('numeric leaf: nonzero/0 → +Infinity', () => {
+    const cmp = compareMetricsResults({ x: 0 }, { x: 5 });
+    expect((cmp.x as NumericDelta).pctChange).toBe(Infinity);
+  });
+
+  it('null inputs → null delta', () => {
+    const cmp = compareMetricsResults({ x: null }, { x: 5 });
+    expect(cmp.x).toEqual({ baseline: null, current: 5, delta: null, pctChange: null });
+  });
+
+  it('opaque leaf: arrays compared by structural equality', () => {
+    const cmp = compareMetricsResults({ buckets: [1, 2, 3] }, { buckets: [1, 2, 3] });
+    expect(cmp.buckets).toEqual({ baseline: [1, 2, 3], current: [1, 2, 3], equal: true });
+  });
+
+  it('only-in-side at top level', () => {
+    const cmp = compareMetricsResults({ a: 1 }, { b: 2 });
+    expect(cmp.a).toEqual({ baseline: 1, onlyIn: 'baseline' });
+    expect(cmp.b).toEqual({ current: 2, onlyIn: 'current' });
+  });
+
+  it('only-in-side at nested record level (commandTypeCounts)', () => {
+    const cmp = compareMetricsResults(
+      { commandTypeCounts: { move: 100, attack: 50 } },
+      { commandTypeCounts: { move: 90, build: 10 } },
+    );
+    const inner = cmp.commandTypeCounts as Record<string, unknown>;
+    expect(inner.move).toEqual({ baseline: 100, current: 90, delta: -10, pctChange: -0.1 });
+    expect(inner.attack).toEqual({ baseline: 50, onlyIn: 'baseline' });
+    expect(inner.build).toEqual({ current: 10, onlyIn: 'current' });
+  });
+
+  it('type mismatch → opaque equal:false', () => {
+    const cmp = compareMetricsResults({ x: 'foo' }, { x: 5 });
+    expect(cmp.x).toEqual({ baseline: 'foo', current: 5, equal: false });
+  });
+});
+
+// ---------- Cross-cutting: order-insensitivity ----------
+describe('built-in order-insensitivity', () => {
+  it('reverse iteration produces identical results for all 11 built-ins', () => {
+    const bs = [
+      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 10 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 20 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 30 } }),
+    ];
+    const allBuiltins = (): Metric<unknown, unknown>[] => [
+      bundleCount() as Metric<unknown, unknown>,
+      sessionLengthStats() as Metric<unknown, unknown>,
+      commandRateStats() as Metric<unknown, unknown>,
+      eventRateStats() as Metric<unknown, unknown>,
+      commandTypeCounts() as Metric<unknown, unknown>,
+      eventTypeCounts() as Metric<unknown, unknown>,
+      failureBundleRate() as Metric<unknown, unknown>,
+      failedTickRate() as Metric<unknown, unknown>,
+      incompleteBundleRate() as Metric<unknown, unknown>,
+      commandValidationAcceptanceRate() as Metric<unknown, unknown>,
+      executionFailureRate() as Metric<unknown, unknown>,
+    ];
+    const r1 = runMetrics(bs, allBuiltins());
+    const r2 = runMetrics([...bs].reverse(), allBuiltins());
+    expect(r1).toEqual(r2);
+  });
+});
+
+// ---------- Cross-cutting: user-defined metric integration ----------
+describe('user-defined metric integration', () => {
+  it('custom Metric implements the contract correctly + multiplexes alongside built-ins', () => {
+    const distinctSeedCount: Metric<Set<number>, number> = {
+      name: 'distinctSeedCount',
+      create: () => new Set<number>(),
+      observe: (state, bundle) => {
+        if (bundle.metadata.policySeed !== undefined) state.add(bundle.metadata.policySeed);
+        return state;
+      },
+      finalize: (state) => state.size,
+    };
+    const bs: SessionBundle[] = [
+      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 1 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 2 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 1 } }),
+      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 3 } }),
+    ];
+    const result = runMetrics(bs, [bundleCount() as Metric<unknown, unknown>, distinctSeedCount as Metric<unknown, unknown>]);
+    expect(result.bundleCount).toBe(4);
+    expect(result.distinctSeedCount).toBe(3);
+  });
+});
+
+// ---------- Cross-cutting: volatile-metadata exclusion ----------
+describe('built-ins ignore volatile metadata', () => {
+  it('sessionId / recordedAt do not affect built-in results', () => {
+    const a = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'aaa', recordedAt: 'ta' } });
+    const b = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'bbb', recordedAt: 'tb' } });
+    const allBuiltins = (): Metric<unknown, unknown>[] => [
+      bundleCount() as Metric<unknown, unknown>,
+      sessionLengthStats() as Metric<unknown, unknown>,
+      commandRateStats() as Metric<unknown, unknown>,
+      eventRateStats() as Metric<unknown, unknown>,
+      commandTypeCounts() as Metric<unknown, unknown>,
+      eventTypeCounts() as Metric<unknown, unknown>,
+      failureBundleRate() as Metric<unknown, unknown>,
+      failedTickRate() as Metric<unknown, unknown>,
+      incompleteBundleRate() as Metric<unknown, unknown>,
+      commandValidationAcceptanceRate() as Metric<unknown, unknown>,
+      executionFailureRate() as Metric<unknown, unknown>,
+    ];
+    expect(runMetrics([a], allBuiltins())).toEqual(runMetrics([b], allBuiltins()));
+  });
+});
