diff --git a/README.md b/README.md
index f6df3f2..6c69fd5 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # civ-engine
 
-![version](https://img.shields.io/badge/version-0.8.2-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
+![version](https://img.shields.io/badge/version-0.8.3-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
 
 > ⚠️ **Pre-release alpha — unverified.** This engine is under active development. The public API surface is still shifting (see `docs/changelog.md` for the recent breaking-change cadence — `0.5.0`, `0.6.0`, `0.7.0`), invariants are still being hardened (current sweep: iter-7 of the multi-CLI review chain), and no production deployment has validated the engine end-to-end. Use it for prototyping, AI-agent experiments, and feedback — do **not** depend on it for shipped products yet.
 
@@ -92,7 +92,8 @@ world.step();
 | **State Diffs**             | Per-tick change sets: entities, components, resources, state, tags, and metadata changes                              |
 | **Client Protocol**         | Transport-agnostic typed messages with protocol version markers and structured `commandAccepted`/`commandRejected` plus `commandExecuted`/`commandFailed`/`tickFailed` outcomes |
 | **Session Recording & Replay** | `SessionRecorder` + `SessionReplayer` — capture deterministic, replayable bundles of any World run. `MemorySink` / `FileSink` for in-memory or disk persistence. Marker API for human-authored annotations + engine-emitted assertions (from `scenarioResultToBundle` adapter). `selfCheck` 3-stream comparison verifies determinism. `World.applySnapshot` for in-place state replacement. See `docs/guides/session-recording.md`. |
-| **Synthetic Playtest Harness** | `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for `N` ticks → `SessionBundle`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Sub-RNG sandboxed from `world.rng` via `PolicyContext.random()`. Tier-1 of the AI-first feedback loop; sets up the corpus for future Tier-2 (corpus indexing, behavioral metrics, AI playtester). See `docs/guides/synthetic-playtest.md`. |
+| **Synthetic Playtest Harness** | `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for `N` ticks → `SessionBundle`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Sub-RNG sandboxed from `world.rng` via `PolicyContext.random()`. Tier-1 of the AI-first feedback loop; produces FileSink/SessionBundle corpora that can be indexed by BundleCorpus and reduced by behavioral metrics. See `docs/guides/synthetic-playtest.md`. |
+| **Bundle Corpus Index** | `BundleCorpus` scans closed FileSink bundle directories, lists metadata-only entries, filters by manifest-derived fields, and lazily loads matching `SessionBundle`s for replay or metrics. Tier-2 of the AI-first feedback loop; turns disk corpora into a deterministic query surface. See `docs/guides/bundle-corpus-index.md`. |
 | **Behavioral Metrics over Corpus** | `runMetrics(bundles, metrics)` over `Iterable<SessionBundle>` + 11 engine-generic built-ins (`bundleCount`, `sessionLengthStats`, `commandRateStats`, `commandTypeCounts`, `failureBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`, etc.) + `compareMetricsResults` delta helper. Tier-2 of the AI-first feedback loop; pairs with synthetic playtests to define regressions for emergent behavior. See `docs/guides/behavioral-metrics.md`. |
 
 ## Architecture
@@ -143,6 +144,7 @@ The root package centers on a few primary entry points:
 - `WorldDebugger`, `WorldHistoryRecorder`, and `runScenario()` for AI/debug workflows
 - `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `MemorySink`/`FileSink`, `Marker`, `RecordedCommand`, `scenarioResultToBundle()` for session capture/replay (`docs/guides/session-recording.md`)
 - `runSynthPlaytest`, `noopPolicy`, `randomPolicy`, `scriptedPolicy` for the synthetic playtest harness (Tier-1 of the AI-first feedback loop; `docs/guides/synthetic-playtest.md`)
+- `BundleCorpus`, `BundleQuery`, `BundleCorpusEntry`, `CorpusIndexError`, `CorpusIndexErrorCode`, and `InvalidCorpusEntry` for manifest-first disk corpus listing, filtering, and lazy FileSink-backed bundle loading (Tier-2 of the AI-first feedback loop; `docs/guides/bundle-corpus-index.md`)
 - `runMetrics`, `compareMetricsResults`, plus 11 metric factories (`bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`) for behavioral metrics over a corpus (Tier-2 of the AI-first feedback loop; `docs/guides/behavioral-metrics.md`)
 - standalone utilities for pathfinding, map generation, occupancy/crowding, visibility, behavior trees, and typed overlay layers (`Layer<T>`)
 
diff --git a/docs/README.md b/docs/README.md
index 62a47a9..1f90eea 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -32,6 +32,7 @@ The API reference is the authoritative public surface. The root `README.md` is i
 - [Debugging](guides/debugging.md)
 - [Session Recording & Replay](guides/session-recording.md)
 - [Synthetic Playtest Harness](guides/synthetic-playtest.md) — Tier-1 autonomous-driver primitive with sub-RNG-isolated policy randomness
+- [Bundle Corpus Index](guides/bundle-corpus-index.md) - Tier-2 manifest-first FileSink corpus listing, filtering, and lazy bundle loading
 - [Behavioral Metrics over Corpus](guides/behavioral-metrics.md) — Tier-2 corpus reducer with 11 engine-generic built-in metrics + comparison helper
 - [Renderer Integration](guides/rendering.md)
 - [RTS Primitives](guides/rts-primitives.md)
diff --git a/docs/api-reference.md b/docs/api-reference.md
index 1b234ed..cc661d5 100644
--- a/docs/api-reference.md
+++ b/docs/api-reference.md
@@ -44,6 +44,8 @@ Complete reference for every public type, method, and module in civ-engine.
 - [Session Recording — SessionRecorder](#session-recording--sessionrecorder)
 - [Session Recording — SessionReplayer](#session-recording--sessionreplayer)
 - [Session Recording — scenarioResultToBundle](#session-recording--scenarioresulttobundle)
+- [Bundle Corpus Index](#bundle-corpus-index-v083)
+- [Behavioral Metrics](#behavioral-metrics-v082)
 
 ---
 
@@ -5141,6 +5143,151 @@ if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
 - `SessionRecorderConfig.sourceKind?: 'session' | 'scenario' | 'synthetic'` added (default `'session'`).
 - `SessionRecorderConfig.policySeed?: number` added.
 
+## Bundle Corpus Index (v0.8.3)
+
+Manifest-first corpus index over closed `FileSink` bundle directories. `BundleCorpus` lists and filters bundle metadata without reading JSONL streams, snapshots, or sidecar bytes, then lazily opens `FileSink` sources or full `SessionBundle`s when a caller asks for one.
+
+### `BundleCorpus`
+
+```typescript
+class BundleCorpus implements Iterable<SessionBundle> {
+  constructor(rootDir: string, options?: BundleCorpusOptions);
+  readonly rootDir: string;
+  readonly invalidEntries: readonly InvalidCorpusEntry[];
+  entries(query?: BundleQuery): readonly BundleCorpusEntry[];
+  bundles(query?: BundleQuery): IterableIterator<SessionBundle>;
+  get(key: string): BundleCorpusEntry | undefined;
+  openSource(key: string): SessionSource;
+  loadBundle<TEventMap, TCommandMap, TDebug = JsonValue>(key: string): SessionBundle<TEventMap, TCommandMap, TDebug>;
+  [Symbol.iterator](): IterableIterator<SessionBundle>;
+}
+```
+
+`entries()` returns a frozen array of frozen entry objects. `bundles()` and `[Symbol.iterator]()` are lazy: each iterator step loads exactly one full bundle through `FileSink.toBundle()`. This composes directly with `runMetrics(corpus.bundles(query), metrics)` because Spec 8 accepts any synchronous `Iterable<SessionBundle>`.
+
+Corpus order is deterministic: entries sort by `metadata.recordedAt`, then `metadata.sessionId`, then `key`, using JavaScript code-unit string ordering. The root bundle key is `'.'`; child bundles use slash-separated relative paths, regardless of host path separator.
+
+`get(key)` returns `undefined` for a missing key. `openSource(key)` and `loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
+
+### `BundleCorpusScanDepth`
+
+```typescript
+type BundleCorpusScanDepth = 'root' | 'children' | 'all';
+```
+
+`'root'` indexes only `rootDir` when it is itself a bundle directory. `'children'` indexes one directory level below the root. `'all'` recursively scans descendants and is the default. The scanner skips symlinked directories and stops descending once a directory contains a direct `manifest.json`.
+
+### `BundleCorpusOptions`
+
+```typescript
+interface BundleCorpusOptions {
+  scanDepth?: BundleCorpusScanDepth; // default 'all'
+  skipInvalid?: boolean;             // default false
+}
+```
+
+Strict mode (`skipInvalid !== true`) throws on the first invalid manifest. Diagnostic mode (`skipInvalid: true`) skips invalid manifest entries and exposes them through `invalidEntries`. Duplicate keys and a missing/non-directory root always throw.
+
+### `BundleCorpusEntry`
+
+```typescript
+interface BundleCorpusEntry {
+  readonly key: string;
+  readonly dir: string;
+  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  readonly metadata: Readonly<SessionMetadata>;
+  readonly attachmentCount: number;
+  readonly attachmentBytes: number;
+  readonly attachmentMimes: readonly string[];
+  readonly hasFailures: boolean;
+  readonly failedTickCount: number;
+  readonly materializedEndTick: number;
+  openSource(): SessionSource;
+  loadBundle<TEventMap, TCommandMap, TDebug = JsonValue>(): SessionBundle<TEventMap, TCommandMap, TDebug>;
+}
+```
+
+`materializedEndTick` is a persisted-content horizon, not a replay guarantee. Complete bundles use `metadata.endTick`; incomplete bundles use `metadata.persistedEndTick`. Replay rules still belong to `SessionReplayer`, including failure-bounded replay refusal.
+
+`attachmentBytes` and `attachmentMimes` are derived from manifest descriptors. Sidecar bytes are not read or validated during listing or `loadBundle()`; call `entry.openSource().readSidecar(id)` when you need the actual bytes. Attachments explicitly embedded as `dataUrl` live inside `manifest.json`, so their bytes are part of manifest parse cost and are not a separate content index.
+
+### `BundleQuery`
+
+```typescript
+interface BundleQuery {
+  key?: string | RegExp;
+  sessionId?: OneOrMany<string>;
+  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
+  sourceLabel?: OneOrMany<string>;
+  engineVersion?: OneOrMany<string>;
+  nodeVersion?: OneOrMany<string>;
+  incomplete?: boolean;
+  durationTicks?: NumberRange;
+  startTick?: NumberRange;
+  endTick?: NumberRange;
+  persistedEndTick?: NumberRange;
+  materializedEndTick?: NumberRange;
+  failedTickCount?: NumberRange;
+  policySeed?: number | NumberRange;
+  recordedAt?: IsoTimeRange;
+  attachmentMime?: OneOrMany<string>;
+}
+```
+
+All query fields are ANDed. `OneOrMany<T>` fields match any requested value. Missing optional manifest fields do not match a concrete requested value: for example, `sourceLabel: 'random'` excludes entries without `metadata.sourceLabel`. `incomplete: false` matches entries where `metadata.incomplete !== true`.
+
+`key` as a string matches exact corpus key. `key` as a `RegExp` is tested against each key and has `lastIndex` reset before and after each test so stateful regexes are deterministic. `attachmentMime` is any-match: an entry matches if any indexed MIME equals any requested MIME.
+
+Numeric ranges are inclusive and require finite integers. `recordedAt.from` and `recordedAt.to` must be normalized UTC strings that round-trip through `Date.toISOString()`, and `from <= to`.
+
+### Query helper types
+
+```typescript
+type OneOrMany<T> = T | readonly T[];
+
+interface NumberRange {
+  min?: number;
+  max?: number;
+}
+
+interface IsoTimeRange {
+  from?: string;
+  to?: string;
+}
+```
+
+### Errors and invalid entries
+
+```typescript
+type CorpusIndexErrorCode =
+  | 'root_missing'
+  | 'manifest_parse'
+  | 'manifest_invalid'
+  | 'schema_unsupported'
+  | 'duplicate_key'
+  | 'query_invalid'
+  | 'entry_missing';
+
+interface CorpusIndexErrorDetails {
+  readonly [key: string]: JsonValue;
+  readonly code: CorpusIndexErrorCode;
+  readonly path: string | null;
+  readonly key: string | null;
+  readonly message: string | null;
+}
+
+class CorpusIndexError extends SessionRecordingError {
+  readonly details: CorpusIndexErrorDetails;
+}
+
+interface InvalidCorpusEntry {
+  readonly path: string;
+  readonly error: CorpusIndexError;
+}
+```
+
+The error class extends `SessionRecordingError` so corpus failures compose with existing session-recording error handling. `details` is JSON-safe for logging and machine triage.
+
 ## Behavioral Metrics (v0.8.2)
 
 A pure-function corpus reducer over `Iterable<SessionBundle>`. Computes built-in + user-defined metrics; compares baseline vs. current. Tier-2 of the AI-first feedback loop (Spec 8).
diff --git a/docs/architecture/ARCHITECTURE.md b/docs/architecture/ARCHITECTURE.md
index a0ce6b7..be4fb14 100644
--- a/docs/architecture/ARCHITECTURE.md
+++ b/docs/architecture/ARCHITECTURE.md
@@ -41,6 +41,7 @@ The engine provides reusable infrastructure (entities, components, spatial index
 | SessionReplayer | `src/session-replayer.ts` | Loads a SessionBundle/Source; openAt(tick) returns paused World; selfCheck() 3-stream comparison (state via deepEqualWithPath, events, executions); failedTicks-skipping; cross-b/cross-Node-major version checks |
 | SessionBundle / SessionSink / SessionSource / Marker / RecordedCommand | `src/session-bundle.ts`, `src/session-sink.ts`, `src/session-file-sink.ts` | Shared bundle types + sink/source interfaces + MemorySink + FileSink (disk-backed; manifest atomic-rename; defaults to sidecar attachments). scenarioResultToBundle adapter at `src/session-scenario-bundle.ts`. |
 | Synthetic Playtest Harness | `src/synthetic-playtest.ts` | Tier-1 autonomous-driver primitive: `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for N ticks → `SessionBundle`. Sub-RNG (`PolicyContext.random()`) sandboxed from `world.rng`, seeded from `policySeed`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Composes with `SessionRecorder`/`SessionReplayer`. New in v0.7.20 + v0.8.0 + v0.8.1 (Spec 3). |
+| Bundle Corpus Index | `src/bundle-corpus.ts`, `src/bundle-corpus-types.ts`, `src/bundle-corpus-manifest.ts` | Tier-2 manifest-first corpus index over closed FileSink bundle directories; metadata query/filtering plus lazy FileSink-backed SessionBundle loading. New in v0.8.3 (Spec 7). |
 | Behavioral Metrics | `src/behavioral-metrics.ts` | Tier-2 corpus reducer over `Iterable<SessionBundle>`. Accumulator-style `Metric<TState, TResult>` contract; 11 engine-generic built-in metrics (`bundleCount`, `sessionLengthStats`, etc.); pure-function `runMetrics` + `compareMetricsResults` delta helper. New in v0.8.2 (Spec 8). |
 | Public exports | `src/index.ts`           | Barrel export for the intended package API                                             |
 | Types          | `src/types.ts`           | Shared type definitions (EntityId, EntityRef, Position, WorldConfig, InstrumentationProfile) |
@@ -111,6 +112,7 @@ Position writes through `world.setPosition()` or `world.setComponent()` with the
 - **Tags & Metadata** are owned by World. Tags are string labels with reverse-index lookup via `world.getByTag()`. Metadata is key-value per entity with unique reverse-index via `world.getByMeta()` — `setMeta` throws if another live entity already owns the `(key, value)` pair. Both cleaned up on entity destruction; the cleanup is reflected in `TickDiff.tags`/`TickDiff.metadata` as `{ entity, tags: [] }` / `{ entity, meta: {} }`.
 - **System Ordering** supports optional `before`/`after` named constraints in `SystemRegistration`. Constraints resolve via topological sort within each phase at first tick (or after dynamic registration). Cross-phase constraints are errors.
 - **Session Recording** is a dedicated subsystem (`src/session-recorder.ts`, `src/session-replayer.ts`, `src/session-bundle.ts`, `src/session-sink.ts`, `src/session-file-sink.ts`, `src/session-scenario-bundle.ts`, `src/session-errors.ts`) that captures deterministic, replayable bundles of any World run. Per ADR 1, it runs as a sibling to `WorldHistoryRecorder` rather than extending it — the two recorders have different shapes (rolling debug buffer vs. persistent archive) and different consumers. `WorldHistoryRecorder` continues to serve in-process debugging; `SessionRecorder` is for archive + replay. **Mutex:** payload-capturing recorders (any `SessionRecorder`, OR `WorldHistoryRecorder({ captureCommandPayloads: true })`) are mutually exclusive on a given world (one wrap on `submitWithResult` per world); default-config `WorldHistoryRecorder` instances compose freely. The `world.__payloadCapturingRecorder` slot enforces this. **Replay** uses the `World.applySnapshot(snap)` instance method (added in T0 of the implementation): `worldFactory` must register components/handlers on a fresh world, then call `applySnapshot` in-place — `World.deserialize` would conflict with subsequent re-registration. Replay across recorded `TickFailure` is out of scope for v1 (`WorldSnapshotV5` doesn't carry poison state); future spec extends to v6. **Determinism contract** (spec §11) is documented but NOT structurally enforced; `SessionReplayer.selfCheck()` is the verification mechanism. See `docs/guides/session-recording.md` for the user-facing guide.
+- **Bundle Corpus Index** is a standalone library surface over closed `FileSink` bundle directories. It reads `manifest.json` metadata and attachment descriptors for discovery/query, does not mutate bundle directories, and does not read JSONL streams, snapshots, or sidecar bytes during metadata listing. Full bundle loading is delegated to `FileSink.toBundle()` through `BundleCorpus.bundles()` / `loadBundle()`, and replay investigation can use `entry.openSource()` with `SessionReplayer`. The subsystem is intentionally manifest-only in v1; content-derived command/event/marker predicates belong to a future summary index.
 
 ## Technology Map
 
diff --git a/docs/architecture/decisions.md b/docs/architecture/decisions.md
index 0c92eaa..929d19a 100644
--- a/docs/architecture/decisions.md
+++ b/docs/architecture/decisions.md
@@ -32,3 +32,7 @@ Decisions for civ-engine. Never delete an entry; add a newer decision that super
 | 25  | 2026-04-27 | Behavioral Metrics: `compareMetricsResults` returns deltas, not regression judgments (Spec 8 §15 ADR 25) | The helper returns numeric deltas and percent changes; it does NOT classify changes as regressions, improvements, or noise. **Rationale:** "Is an 18% shift in p95 session length a regression?" is game- and policy-specific. Some games consider longer sessions a feature; others a bug. Some metrics are noisy (small corpus, high variance); others stable. Encoding judgment thresholds into the engine would either bake the wrong defaults for half the consumers or require a config surface that's its own complexity tax. Caller-side judgment is the right boundary. |
 | 26  | 2026-04-27 | Behavioral Metrics: `Iterable<SessionBundle>` only in v1; `AsyncIterable` deferred to a separate `runMetricsAsync` (Spec 8 §15 ADR 26) | v1 accepts only synchronous `Iterable<SessionBundle>`. Arrays, generators, sets, and any custom synchronous iterable work. `AsyncIterable` is NOT supported. **Rationale:** Spec 3's harness is synchronous; the natural composition is synchronous corpus reduction. The future-compat path is a separate `runMetricsAsync` function (returns `Promise<MetricsResult>`), NOT an overload of `runMetrics` — overloading would force the return type to widen to `MetricsResult \| Promise<MetricsResult>`, breaking existing callers that assume sync. |
 | 27  | 2026-04-27 | Behavioral Metrics: do NOT aggregate `stopReason` in v1 (Spec 8 §15 ADR 27) | No `stopReasonHistogram` built-in. `SynthPlaytestResult.stopReason` lives outside `SessionBundle`; aggregating it requires a separate Spec 3 follow-up to persist it into `metadata`. **Rationale:** Forcing the metric into v1 would either (a) couple Spec 8 to Spec 3's result type (not bundle-only), or (b) require a Spec 3 follow-up that's better landed independently. v1 ships without it; users who want it accumulate `stopReason` outside `runMetrics`. |
+| 28  | 2026-04-27 | Bundle Corpus: manifest-first over closed FileSink directories (Spec 7 ADR 28) | v1 builds its in-memory index by scanning `manifest.json` files at `BundleCorpus` construction time. It does not write/read a persisted `corpus-index.json`, and it is supported only for closed/frozen bundle directories. **Rationale:** Manifest scan is deterministic and reuses the FileSink contract; a secondary database would introduce invalidation/stale-index risk before scale proves it is needed. |
+| 29  | 2026-04-27 | Bundle Corpus composes with `runMetrics` via `Iterable<SessionBundle>` (Spec 7 ADR 29) | `BundleCorpus` exposes `bundles(query?)` and `[Symbol.iterator]()` as synchronous `IterableIterator<SessionBundle>`. **Rationale:** Spec 8 already accepts `Iterable<SessionBundle>`; disk-backed corpora should look like any other bundle iterable to metrics code instead of requiring a metrics-specific adapter. |
+| 30  | 2026-04-27 | Bundle Corpus canonical order is recordedAt, sessionId, key (Spec 7 ADR 30) | Entries sort by `metadata.recordedAt`, then `metadata.sessionId`, then slash-normalized `key`; the root bundle key is `'.'`. **Rationale:** Filesystem order differs across platforms. Stable order keeps order-sensitive user metrics deterministic and CI output diff-friendly. |
+| 31  | 2026-04-27 | Bundle Corpus v1 query scope is manifest-derived only (Spec 7 ADR 31) | `BundleQuery` filters fields present in `manifest.json` or derived directly from manifest metadata/attachments. It does not include command/event/marker/snapshot predicates. **Rationale:** Content queries require reading larger streams or maintaining a secondary summary index; v1 stays lightweight and unblocks disk-backed metrics/triage. |
diff --git a/docs/architecture/drift-log.md b/docs/architecture/drift-log.md
index b5192d5..bef81e1 100644
--- a/docs/architecture/drift-log.md
+++ b/docs/architecture/drift-log.md
@@ -46,3 +46,4 @@ Append a row here whenever architecture changes. Each row captures the date, the
 | 2026-04-27 | Session-recording subsystem (v0.7.7-v0.7.14) | Adds `SessionRecorder` / `SessionReplayer` / `SessionBundle` / `SessionSink` / `SessionSource` / `MemorySink` / `FileSink` / `Marker` / `RecordedCommand` / `scenarioResultToBundle()` plus `World.applySnapshot()` instance method, `WorldHistoryRecorder.captureCommandPayloads` opt-in, and `World.__payloadCapturingRecorder` mutex slot. Implements engine-level capture/replay primitives per `docs/design/2026-04-26-session-recording-and-replay-design.md` (v5, converged after 4 multi-CLI review iterations). Per ADR 1 in §15 of the spec, the new SessionRecorder runs as a sibling to WorldHistoryRecorder rather than extending it (different shape: rolling debug buffer vs. persistent archive). Per ADR 2, `SessionBundle` is a strict-JSON shared type identical regardless of producer. Per ADR 3, the determinism contract (spec §11.1) is documented but NOT structurally enforced — `SessionReplayer.selfCheck()` is the verification mechanism. Per ADR 4, the `worldFactory` callback is part of the determinism contract. v1 limitations: single payload-capturing recorder per world; sinks are synchronous; replay across recorded TickFailure is out of scope (future spec extends `WorldSnapshot` to v6). 121 new tests across 8 commits. |
 | 2026-04-27 | Synthetic Playtest Harness (v0.7.20 + v0.8.0 + v0.8.1) | Adds `runSynthPlaytest` / `Policy` / `PolicyContext` / `StopContext` / `PolicyCommand` / `RandomPolicyConfig` / `ScriptedPolicyEntry` / `noopPolicy` / `randomPolicy` / `scriptedPolicy` / `SynthPlaytestConfig` / `SynthPlaytestResult` exports. **Breaking (b-bump in 0.8.0):** `SessionMetadata.sourceKind` widened from `'session' \| 'scenario'` to `'session' \| 'scenario' \| 'synthetic'` — downstream `assertNever` exhaustive switches break. Engine-internal consumers don't branch on this field, so engine builds are unaffected. **Sub-RNG:** `PolicyContext.random()` is bound to a private `DeterministicRandom` seeded from `policySeed` (default: `Math.floor(world.random() * 0x1_0000_0000)`, derived BEFORE `recorder.connect()`). Sandboxed from `world.rng` so policy randomness doesn't perturb world state — replay reproduces trivially. **Determinism contract:** non-poisoned synthetic bundles with `ticksRun >= 1` pass `SessionReplayer.selfCheck()`; poisoned bundles cause selfCheck to re-throw the original tick failure (terminal-at-failed-tick segment isn't skipped); pre-step abort produces vacuous-ok bundles (`ticksRun === 0`, terminal == initial). Tier-1 of `docs/design/ai-first-dev-roadmap.md`. Per `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI design iterations + 7 plan iterations). 39 new tests across 3 commits (T1+T2+T3). |
 | 2026-04-27 | Behavioral Metrics over Corpus (v0.8.2) | Adds `Metric` accumulator contract + `runMetrics(bundles, metrics)` pure-function corpus reducer over `Iterable<SessionBundle>` + 11 engine-generic built-in metric factories (`bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`) + `compareMetricsResults` thin delta helper. **Engine-generic only** (ADR 24): metrics read fields the engine guarantees on `SessionBundle`; game-semantic metrics (resource Gini, time-to-first-conflict) are user-defined. **Submission-stage vs execution-stage split**: `commandValidationAcceptanceRate` reads `bundle.commands[].result.accepted` (submission gate); `executionFailureRate` reads `bundle.executions[].executed` (handler gate) — validator-rejected commands appear in commands but never in executions per `world.ts:732-748`. **`Stats` JSON-stable**: empty-corpus numeric fields are `null` (not `NaN`) to survive `JSON.stringify`/`JSON.parse` round-trip. **NumPy linear (R type 7) percentiles**, exact, deterministic. Per `docs/design/2026-04-27-behavioral-metrics-design.md` (v4, converged after 4 multi-CLI design iterations + 4 plan iterations). 44 new tests in `tests/behavioral-metrics.test.ts`. |
+| 2026-04-27 | Added manifest-first BundleCorpus subsystem (v0.8.3) | Spec 7 unblocks disk-resident FileSink corpora for metrics and bundle triage. |
diff --git a/docs/changelog.md b/docs/changelog.md
index c2a8477..cf275e1 100644
--- a/docs/changelog.md
+++ b/docs/changelog.md
@@ -1,5 +1,37 @@
 # Changelog
 
+## 0.8.3 - 2026-04-27
+
+Spec 7 - Bundle Search / Corpus Index. Tier-2 of the AI-first dev roadmap; turns closed FileSink bundle directories into a deterministic metadata query surface and lazy bundle iterable.
+
+### New (additive)
+
+- **`BundleCorpus(rootDir, options?)`**: scans closed FileSink bundle directories, validates manifest metadata, skips symlinked directories, and exposes deterministic sorted entries.
+- **`BundleCorpus.entries(query?)`**: metadata-only listing/filtering over manifest-derived fields. Does not read JSONL streams, snapshots, or sidecar bytes.
+- **`BundleCorpus.bundles(query?)`** and **`[Symbol.iterator]()`**: lazy full-bundle iteration through `FileSink.toBundle()`, directly composable with `runMetrics`.
+- **`BundleCorpusEntry`**: frozen metadata view with `key`, `dir`, `metadata`, attachment summary fields, failure summary fields, `materializedEndTick`, `openSource()`, and `loadBundle()`.
+- **`BundleQuery`** plus helper types `OneOrMany`, `NumberRange`, and `IsoTimeRange`: filters by key, manifest metadata, duration/tick ranges, failure count, policy seed, recordedAt range, incomplete status, and attachment MIME.
+- **`CorpusIndexError`** and `CorpusIndexErrorCode`: JSON-safe machine-readable failures for missing roots, manifest parse/validation errors, unsupported schema, duplicate keys, invalid queries, and missing entries.
+
+### Behavior callouts
+
+- Corpus listing is manifest-first and for closed/frozen FileSink directories. Active-writer detection and persisted `corpus-index.json` files are not part of v1.
+- Query order is deterministic: `recordedAt`, then `sessionId`, then slash-normalized key, using JavaScript code-unit ordering.
+- `materializedEndTick` is a persisted-content horizon, not a replay guarantee. Replay integrity still belongs to `SessionReplayer`.
+- Sidecar bytes are not read during listing or `loadBundle()`; callers fetch them explicitly through `SessionSource.readSidecar(id)`.
+- Explicit `dataUrl` attachment bytes live in `manifest.json`, so they are part of manifest parse cost.
+
+### ADRs
+
+- ADR 28: Manifest-first over closed FileSink directories.
+- ADR 29: Corpus composes with `runMetrics` via `Iterable<SessionBundle>`.
+- ADR 30: Canonical corpus order is `recordedAt`, `sessionId`, `key`.
+- ADR 31: v1 query scope is manifest-derived only.
+
+### Validation
+
+All four engine gates pass: `npm test` (861 passed + 2 todo, +16 new in `tests/bundle-corpus.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`.
+
 ## 0.8.2 - 2026-04-27
 
 Spec 8 — Behavioral Metrics over Corpus. Tier-2 of the AI-first dev roadmap; pairs with Spec 3 (synthetic playtest) to define regressions for emergent behavior.
diff --git a/docs/design/2026-04-27-bundle-corpus-index-design.md b/docs/design/2026-04-27-bundle-corpus-index-design.md
new file mode 100644
index 0000000..78421c2
--- /dev/null
+++ b/docs/design/2026-04-27-bundle-corpus-index-design.md
@@ -0,0 +1,518 @@
+# Bundle Search / Corpus Index - Design Spec
+
+**Status:** Accepted v4 (2026-04-27 project-local date) with a plan-review type correction for `CorpusIndexErrorDetails` after `docs/reviews/bundle-corpus-index/2026-04-27/plan-1/`. Fresh Codex brainstorm completed before drafting. Design iteration 1 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-1/` for contract/API precision issues. Design iteration 2 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-2/` for the replay-horizon name, root-key encoding, attachment MIME query semantics, manifest-embedded attachment caveat, and error-detail shape. Design iteration 3 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-3/` for missing-key wording on the wrong API surface and non-canonical `recordedAt` handling. Design iteration 4 accepted this version under `docs/reviews/bundle-corpus-index/2026-04-27/design-4/`.
+
+**Scope:** Tier-2 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 7). Builds on Session Recording / Replay (Spec 1), Synthetic Playtest Harness (Spec 3), and Behavioral Metrics over Corpus (Spec 8). v1 provides a disk-backed corpus/index that discovers closed FileSink bundle directories, lists and filters them from `manifest.json` metadata, and yields full `SessionBundle`s lazily for `runMetrics`.
+
+**Author:** civ-engine team
+
+**Related primitives:** `FileSink`, `SessionSource`, `SessionBundle`, `SessionMetadata`, `SessionRecordingError`, `runMetrics`, `SessionReplayer`.
+
+## 1. Goals
+
+This spec defines a first-class **bundle corpus index** that:
+
+- Opens a local filesystem corpus root and discovers FileSink bundle directories by finding `manifest.json`.
+- Builds a small in-memory index from each bundle's manifest: `schemaVersion`, `SessionMetadata`, attachment descriptors, and derived manifest-only fields.
+- Lists and filters corpus entries without reading JSONL streams, snapshots, sidecar bytes, commands, ticks, events, or markers.
+- Provides deterministic iteration order for both metadata entries and full bundle iteration.
+- Implements `Iterable<SessionBundle>` semantics so existing `runMetrics(bundles, metrics)` workflows work unchanged against disk-resident corpora.
+- Exposes explicit on-demand escape hatches (`entry.openSource()`, `entry.loadBundle()`) for consumers that need replayer/content access.
+- Defines corpus behavior for finalized, immutable-on-disk bundle directories. Callers construct a new corpus after generation, deletion, or mutation.
+
+The deliverable is an additive API surface. Existing `FileSink`, `SessionRecorder`, `SessionReplayer`, and `runMetrics` behavior remains unchanged.
+
+## 2. Non-Goals
+
+- **Content indexing in v1.** Queries over `commands.jsonl`, `ticks.jsonl`, events, markers, snapshots, sidecar attachment bytes, or metric outputs are out of scope. v1 query predicates are manifest-derived only. Explicit dataUrl attachments can still place bytes inside `manifest.json`; v1 reads those only as part of manifest parsing, not as a separate content index.
+- **Metric-result indexing.** "Find bundles with high decision-point variance" requires either a game-defined metric pass or a future derived-summary index. v1 can feed matching bundles into `runMetrics`, but it does not persist metric summaries.
+- **Persistent `corpus-index.json`.** The index is rebuilt from manifests at open time. A persisted cache creates invalidation, write coordination, and stale-index failure modes before the corpus is large enough to justify it.
+- **Async / remote storage APIs.** v1 is synchronous and local-disk-only, matching FileSink and the engine's current synchronous session stack. A future `AsyncBundleCorpus` or `runMetricsAsync` can land when there is a real remote/backend storage pressure.
+- **UI or viewer.** Standalone bundle viewer work remains Spec 4. This spec is a library/query surface only.
+- **Retention, compaction, delete, archive, or mutation policies.** v1 reads finalized corpora; it does not mutate bundle directories.
+- **Schema migration.** v1 accepts `SESSION_BUNDLE_SCHEMA_VERSION` only. Future bundle schema versions need an explicit migration/loading story.
+- **Live writer detection.** v1 does not try to detect or exclude active `SessionRecorder` / `FileSink` writers. Callers are responsible for building a corpus only after writers close.
+
+## 3. Background
+
+Spec 3 can generate many `SessionBundle`s via `runSynthPlaytest`. Spec 8 can reduce an `Iterable<SessionBundle>` through `runMetrics`. The missing piece is a durable corpus source: today a caller either keeps bundles in memory or manually walks directories and calls `new FileSink(dir).toBundle()` for each one.
+
+FileSink already defines the disk format:
+
+```text
+<bundleDir>/
+  manifest.json
+  ticks.jsonl
+  commands.jsonl
+  executions.jsonl
+  failures.jsonl
+  markers.jsonl
+  snapshots/<tick>.json
+  attachments/<id>.<ext>
+```
+
+`manifest.json` is the natural v1 index unit because it contains `schemaVersion`, `metadata`, and attachments. It is atomically rewritten at `open()`, successful snapshot writes, and `close()`. Reading manifests is cheap and does not force loading streams, snapshots, or sidecar bytes. FileSink defaults to sidecar attachments, but explicit dataUrl attachments embed bytes in the manifest and therefore increase manifest parse cost.
+
+The current `SessionReplayer.fromSource(source)` and `FileSink.toBundle()` path eagerly materializes a full bundle. This spec does not change that. Instead, it gives callers an efficient manifest-only listing/filtering layer and keeps full bundle loading explicit and per-entry.
+
+The important boundary is that the corpus indexes a closed/frozen file tree. A construction-time manifest index is deterministic only if bundle directories do not keep changing underneath it. `metadata.incomplete` remains a manifest fact about abnormal termination, not a reliable signal that a writer is still active.
+
+## 4. Architecture Overview
+
+New modules: `src/bundle-corpus.ts` (core `BundleCorpus` class and query logic), `src/bundle-corpus-types.ts` (public corpus types and `CorpusIndexError`), and `src/bundle-corpus-manifest.ts` (manifest-only validation/loading). Public consumers still import the surface from the root package; `src/bundle-corpus.ts` re-exports the type/error surface.
+
+| Component | Responsibility |
+| --- | --- |
+| `BundleCorpus` | Opens a corpus root, scans for bundle manifests, stores a deterministic in-memory entry index, exposes `entries(query?)`, `bundles(query?)`, `get(key)`, `openSource(key)`, `loadBundle(key)`, and `[Symbol.iterator]`. |
+| `BundleCorpusEntry` | Immutable metadata view for one bundle directory plus explicit `openSource()` and `loadBundle()` methods. |
+| `BundleQuery` | Manifest-only filters over `SessionMetadata` and derived fields. |
+| `CorpusIndexError` | `SessionRecordingError` subclass thrown for malformed manifests, unsupported schema versions, duplicate discovered keys, invalid query ranges, or missing keys when strict behavior is expected. |
+
+Data flow:
+
+```text
+BundleCorpus(root)
+  -> scan for manifest.json
+  -> parse/validate manifest metadata
+  -> derive index fields
+  -> sort entries by canonical corpus order
+
+entries(query)
+  -> validate query
+  -> filter in-memory manifest entries only
+  -> return stable ordered entry array
+
+bundles(query) / [Symbol.iterator]
+  -> entries(query)
+  -> for each entry: entry.loadBundle()
+       -> new FileSink(entry.dir).toBundle()
+       -> yields SessionBundle
+
+runMetrics(corpus.bundles({ sourceKind: 'synthetic', incomplete: false }), metrics)
+  -> unchanged Spec 8 reducer
+```
+
+## 5. API + Types
+
+### 5.1 Construction
+
+```ts
+export type BundleCorpusScanDepth = 'root' | 'children' | 'all';
+
+export interface BundleCorpusOptions {
+  /**
+   * How far discovery descends from rootDir. Default 'all'.
+   * 'root' checks only rootDir.
+   * 'children' checks rootDir and immediate child directories.
+   * 'all' recursively checks rootDir and all non-symlink descendant directories.
+   */
+  scanDepth?: BundleCorpusScanDepth;
+  /**
+   * If false (default), the first invalid manifest aborts construction with CorpusIndexError.
+   * If true, invalid manifests are recorded in corpus.invalidEntries and omitted from entries().
+   */
+  skipInvalid?: boolean;
+}
+
+export class BundleCorpus implements Iterable<SessionBundle> {
+  constructor(rootDir: string, options?: BundleCorpusOptions);
+  readonly rootDir: string;
+  readonly invalidEntries: readonly InvalidCorpusEntry[];
+  entries(query?: BundleQuery): readonly BundleCorpusEntry[];
+  bundles(query?: BundleQuery): IterableIterator<SessionBundle>;
+  get(key: string): BundleCorpusEntry | undefined;
+  openSource(key: string): SessionSource;
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug>;
+  [Symbol.iterator](): IterableIterator<SessionBundle>;
+}
+```
+
+The constructor performs manifest discovery synchronously. Construction is the only manifest scan. `entries()` and `bundles()` operate over that in-memory entry set; callers who want to see newly written bundles construct a new `BundleCorpus`.
+
+`openSource(key)` and `loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'` when the key is not present. `get(key)` is the non-throwing lookup.
+
+The `loadBundle` generics mirror `SessionBundle`'s static type parameters. They are caller assertions, just like passing a typed bundle into replay/metric helpers: `BundleCorpus` validates the FileSink manifest/schema and materializes bytes through `FileSink`, but it does not prove game-specific event, command, or debug payload schemas at runtime.
+
+### 5.2 Entries
+
+```ts
+export interface BundleCorpusEntry {
+  readonly key: string;
+  readonly dir: string;
+  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  readonly metadata: Readonly<SessionMetadata>;
+  readonly attachmentCount: number;
+  readonly attachmentBytes: number;
+  readonly attachmentMimes: readonly string[];
+  readonly hasFailures: boolean;
+  readonly failedTickCount: number;
+  readonly materializedEndTick: number;
+  openSource(): SessionSource;
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
+}
+```
+
+`key` is the corpus-root-relative bundle directory path with `/` separators. If `rootDir` itself is a bundle, its key is exactly `'.'`. Descendant bundle keys never start with `./`; for example, `rootDir/a/b/manifest.json` yields `a/b`. `key` is the primary identity because `metadata.sessionId` can collide when bundles are copied or duplicated. `dir` is the absolute resolved directory path used by `FileSink`.
+
+`materializedEndTick` is `metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick`. It is the manifest's incomplete-aware upper bound for persisted bundle content, not a guarantee that `SessionReplayer.openAt(materializedEndTick)` will succeed. Replay can still fail at or after `metadata.failedTicks`, when command payloads are missing, or when full bundle integrity checks fail. `SessionReplayer` remains the authority for actual replayability.
+
+`metadata` is exposed as a frozen defensive copy. The implementation also copies and freezes `metadata.failedTicks` when present, then freezes the entry object. Callers cannot mutate the corpus index by mutating a returned entry.
+
+### 5.3 Query
+
+```ts
+export type OneOrMany<T> = T | readonly T[];
+
+export interface NumberRange {
+  min?: number;
+  max?: number;
+}
+
+export interface IsoTimeRange {
+  from?: string;
+  to?: string;
+}
+
+export interface BundleQuery {
+  key?: string | RegExp;
+  sessionId?: OneOrMany<string>;
+  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
+  sourceLabel?: OneOrMany<string>;
+  engineVersion?: OneOrMany<string>;
+  nodeVersion?: OneOrMany<string>;
+  incomplete?: boolean;
+  durationTicks?: NumberRange;
+  startTick?: NumberRange;
+  endTick?: NumberRange;
+  persistedEndTick?: NumberRange;
+  materializedEndTick?: NumberRange;
+  failedTickCount?: NumberRange;
+  policySeed?: number | NumberRange;
+  recordedAt?: IsoTimeRange;
+  attachmentMime?: OneOrMany<string>;
+}
+```
+
+All query fields are ANDed. `OneOrMany` scalar fields match if the entry value equals any requested value. Ranges are inclusive. A range with `min > max`, non-finite numeric bounds, or a non-integer tick bound throws `CorpusIndexError` with `details.code === 'query_invalid'`.
+
+Optional manifest fields (`sourceLabel`, `policySeed`) match only when the entry has a defined value. A `policySeed` filter therefore selects seeded synthetic bundles and excludes non-synthetic bundles whose metadata has no seed.
+
+`attachmentMime` matches if any MIME in `entry.attachmentMimes` equals any requested MIME. It is an any-match filter, not an exact-set or all-attachments filter.
+
+`endTick`, `persistedEndTick`, and `materializedEndTick` are all exposed because they are distinct manifest/debugging facts. For "has persisted content through tick X" queries, use `materializedEndTick`; raw `endTick` can overstate the persisted range for finalized incomplete bundles. For actual replay, use `SessionReplayer.openAt()` and let it enforce failure and content-integrity constraints.
+
+`recordedAt` filters use lexical comparison over normalized UTC ISO strings. Query bounds must be UTC ISO-8601 strings that round-trip through `new Date(value).toISOString()` and end in `Z`; any other form throws `CorpusIndexError` with `details.code === 'query_invalid'`. Current FileSink writers already emit this form.
+
+`RegExp` on `key` is local-process-only convenience. Queries are not JSON-serialized in v1.
+
+No function predicate is part of `BundleQuery`. Callers who need arbitrary conditions can use normal JavaScript on the returned array:
+
+```ts
+const longSynthetic = corpus.entries({ sourceKind: 'synthetic' })
+  .filter((entry) => entry.metadata.durationTicks > 1000);
+```
+
+This keeps the engine API small and makes the manifest-only boundary obvious.
+
+### 5.4 Errors
+
+```ts
+export type CorpusIndexErrorCode =
+  | 'root_missing'
+  | 'manifest_parse'
+  | 'manifest_invalid'
+  | 'schema_unsupported'
+  | 'duplicate_key'
+  | 'query_invalid'
+  | 'entry_missing';
+
+export interface CorpusIndexErrorDetails {
+  readonly [key: string]: JsonValue;
+  readonly code: CorpusIndexErrorCode;
+  readonly path: string | null;
+  readonly key: string | null;
+  readonly message: string | null;
+}
+
+export class CorpusIndexError extends SessionRecordingError {
+  override readonly details: CorpusIndexErrorDetails;
+}
+
+export interface InvalidCorpusEntry {
+  readonly path: string;
+  readonly error: CorpusIndexError;
+}
+```
+
+Default construction is strict: invalid manifests throw. With `skipInvalid: true`, invalid manifests are collected in `invalidEntries`, omitted from `entries()`, and do not affect iteration. Full bundle load failures from malformed JSONL or missing snapshots are not swallowed; they surface when `loadBundle()` or `bundles()` reaches that entry. Sidecar-byte integrity is different: `FileSink.toBundle()` does not read sidecar payloads, so missing sidecar bytes surface only when a caller dereferences them through `SessionSource.readSidecar(id)` or equivalent source-level access.
+
+`details.code` is the public discriminator, following the existing session-recording error discipline. `details.path`, `details.key`, `details.message`, and other fields are JSON-shaped information that can be logged or serialized without carrying raw filesystem handles or exception objects. Optional human fields use `null` when absent so the overridden `details` property remains assignable to the existing `SessionRecordingError.details: JsonValue | undefined` contract.
+
+## 6. Lifecycle / Contracts
+
+`BundleCorpus` is a snapshot of a closed/frozen corpus at construction time. It does not watch the filesystem. It also does not copy bundle streams or snapshots into memory during construction. This is intentional: deterministic analysis and CI should operate over a stable set of files. Callers create a new corpus object after generating, deleting, or mutating bundles.
+
+Active writers are unsupported in v1. A bundle directory being written by `SessionRecorder` or `FileSink` can have a manifest that is atomically readable while JSONL streams and snapshots are still changing. `BundleCorpus` does not detect that state and does not guarantee consistent `entries()` / `loadBundle()` behavior for it. Generators should close sinks before constructing the corpus.
+
+Construction contract:
+
+1. Resolve `rootDir` to an absolute directory path.
+2. If root does not exist or is not a directory, throw `CorpusIndexError` with `details.code === 'root_missing'`.
+3. Discover `manifest.json` files according to `scanDepth`.
+4. Do not follow symlinks or Windows junctions during discovery. Directory symlinks are skipped.
+5. Stop descending into a directory once it is identified as a bundle directory by a direct `manifest.json`.
+6. Parse each manifest as JSON.
+7. Validate `schemaVersion === SESSION_BUNDLE_SCHEMA_VERSION`, `metadata` shape, `metadata.recordedAt` normalized UTC `Z` form, and `attachments` array shape. Non-canonical `recordedAt` values are `manifest_invalid` because canonical ordering and time filters depend on lexical UTC ISO comparison.
+8. Derive manifest-only fields.
+9. Sort entries in canonical order.
+
+`scanDepth` semantics:
+
+- `'root'`: check only `rootDir` itself. Use this when the root is a single bundle directory.
+- `'children'`: check `rootDir` and its immediate non-symlink child directories. Use this for a flat corpus where each child is one bundle.
+- `'all'`: recursively check `rootDir` and all non-symlink descendants. This is the default for nested corpus trees.
+
+Discovery should not descend into a directory after it has found a `manifest.json` in that directory. A bundle's `snapshots/` and `attachments/` subdirectories are not separate corpus roots.
+
+Key derivation is deterministic. The root bundle key is `'.'`; descendant keys are slash-separated relative paths with no leading `./`. Backslashes from Windows paths are normalized to `/`.
+
+Canonical order is:
+
+```text
+metadata.recordedAt ASC, metadata.sessionId ASC, key ASC
+```
+
+String comparisons use JavaScript code-unit order (`<` / `>`) rather than locale collation so CI output is stable across host locales. This order is deterministic for a stable corpus and useful for human reading. The `key` tiebreaker closes timestamp/session collisions.
+
+## 7. Bundle Format Integration
+
+Spec 7 composes with FileSink's existing format. It does not add files to a bundle directory and does not require FileSink to write index-specific sidecars.
+
+`BundleCorpusEntry.openSource()` returns `new FileSink(entry.dir)` typed as `SessionSource`. `FileSink` already reloads `manifest.json` in its constructor and implements the read-side methods. `BundleCorpusEntry.loadBundle()` returns `entry.openSource().toBundle()` with the caller-asserted generic type applied at the corpus boundary. This preserves the single source of truth for full bundle materialization: FileSink owns bundle loading.
+
+The manifest may contain dataUrl attachment bytes when a caller explicitly opted into manifest embedding. `BundleCorpus` still treats those as manifest bytes: it parses descriptors and derives MIME/count/size metadata, but it does not decode, inspect, or index the embedded payload.
+
+Manifest-derived fields:
+
+- `schemaVersion`: from manifest.
+- `metadata`: frozen defensive copy of `SessionMetadata`; `failedTicks` is copied and frozen when present.
+- `attachmentCount`: `manifest.attachments.length`.
+- `attachmentBytes`: sum of `attachments[].sizeBytes`.
+- `attachmentMimes`: sorted unique `attachments[].mime` values.
+- `hasFailures`: `(metadata.failedTicks?.length ?? 0) > 0`.
+- `failedTickCount`: `metadata.failedTicks?.length ?? 0`.
+- `materializedEndTick`: finalized-manifest, incomplete-aware upper bound for persisted content.
+
+Content-derived fields are intentionally absent. For example, command type counts belong either in Spec 8 metrics or in a later content-summary index.
+
+## 8. Determinism
+
+Filesystem enumeration order is not portable. `BundleCorpus` sorts entries using the canonical order above before exposing them. `entries(query)` and `bundles(query)` preserve that order after filtering. `[Symbol.iterator]` delegates to `bundles()` with no query.
+
+This matters for user-defined metrics marked `orderSensitive: true`. Spec 8's built-ins are order-insensitive, but the corpus should still offer stable iteration so order-sensitive user metrics can opt into a deterministic disk-backed source.
+
+Symlinks/junctions are skipped rather than followed. This avoids platform-specific traversal and symlink-loop behavior, and it keeps discovery bounded by the real directory tree under `rootDir`.
+
+Volatile metadata remains volatile. The corpus can query `sessionId` and `recordedAt`, but it does not normalize or hide them. Built-in metrics still avoid volatile fields.
+
+## 9. CI Pattern
+
+```ts
+import {
+  BundleCorpus,
+  runMetrics,
+  bundleCount,
+  sessionLengthStats,
+  commandValidationAcceptanceRate,
+} from 'civ-engine';
+
+const corpus = new BundleCorpus('artifacts/synth-corpus');
+
+const current = runMetrics(
+  corpus.bundles({ sourceKind: 'synthetic', incomplete: false }),
+  [
+    bundleCount(),
+    sessionLengthStats(),
+    commandValidationAcceptanceRate(),
+  ],
+);
+
+console.log(corpus.entries({ failedTickCount: { min: 1 } }).map((entry) => entry.key));
+console.log(current);
+```
+
+For replay investigation:
+
+```ts
+const failed = corpus.entries({ failedTickCount: { min: 1 } })[0];
+if (!failed) {
+  throw new Error('no failed bundle matched the query');
+}
+const source = failed.openSource();
+const replayer = SessionReplayer.fromSource(source, { worldFactory });
+const firstFailure = failed.metadata.failedTicks![0];
+if (firstFailure <= failed.metadata.startTick) {
+  throw new Error('failure occurred at the first recorded tick; inspect snapshots directly');
+}
+const beforeFailure = firstFailure - 1;
+const world = replayer.openAt(beforeFailure);
+```
+
+For bundles without recorded failures, `entry.materializedEndTick` is the manifest-derived upper bound to try first. `SessionReplayer.openAt()` still owns the final replayability decision because it also checks command payloads and full bundle integrity.
+
+For custom metadata filters:
+
+```ts
+const longRuns = corpus.entries({ sourceKind: 'synthetic' })
+  .filter((entry) => entry.metadata.durationTicks >= 1000);
+const longRunMetrics = runMetrics(longRuns.map((entry) => entry.loadBundle()), [bundleCount()]);
+```
+
+`Array.prototype.map` is fine here because `entries()` returns an in-memory entry array. For very large corpora, use a generator around entries to avoid materializing bundles:
+
+```ts
+function* bundlesFor(entries: readonly BundleCorpusEntry[]) {
+  for (const entry of entries) yield entry.loadBundle();
+}
+```
+
+## 10. Performance
+
+Construction cost is O(number of directories visited + number of manifests). No JSONL streams, snapshot files, or sidecar bytes are read during construction or `entries()`. Each manifest parse is usually small and bounded by metadata plus attachment descriptors because FileSink defaults attachments to sidecars; explicit dataUrl attachments are embedded in `manifest.json` and can make manifest parsing larger.
+
+`entries(query)` is O(number of indexed entries) and allocation-light: it returns a new array of existing frozen entry objects. `bundles(query)` is O(number of matching entries) plus full bundle load cost per yielded entry. Because `loadBundle()` delegates to `FileSink.toBundle()`, full bundle memory cost is exactly today's eager bundle materialization cost, paid one bundle at a time by generator consumers.
+
+No persisted index cache ships in v1. If corpus construction becomes a measured bottleneck, a future spec can add `writeCorpusIndex()` with explicit invalidation fields (manifest mtime, size, and schema version). Until then, rebuilding from manifests is simpler and less fragile.
+
+Skipping symlinks is also a performance guard: recursive discovery never traverses a linked external tree or loop.
+
+## 11. Testing Strategy
+
+Unit and integration tests target:
+
+- **Discovery:** root itself can be a bundle with key `'.'`; flat child bundles are found with `scanDepth: 'children'`; recursive nested bundles are found with `scanDepth: 'all'`; `scanDepth: 'root'` skips children; `scanDepth: 'children'` skips grandchildren.
+- **Symlink handling:** directory symlinks or junction-like entries are skipped and do not produce duplicate entries or recursive loops where the platform/test environment supports symlink creation.
+- **Stable ordering:** files created in arbitrary order still produce entries sorted by canonical `recordedAt`, then `sessionId`, then `key`.
+- **Manifest-only listing:** `entries()` does not read JSONL streams or snapshots. A bundle with a valid manifest but malformed `ticks.jsonl` still appears in `entries()`, and the malformed stream error surfaces only when `loadBundle()` is called.
+- **Sidecar boundary:** a bundle with a manifest-sidecar descriptor but missing sidecar bytes can still be listed and loaded as a `SessionBundle`; the missing bytes surface only when `readSidecar(id)` is called on the opened source.
+- **Query filters:** each built-in filter shape has coverage: exact `sourceKind`, optional `sourceLabel`, `incomplete`, numeric ranges, `policySeed`, normalized `recordedAt`, `attachmentMime`, and `failedTickCount`. Combined filters are ANDed.
+- **Attachment MIME matching:** `attachmentMime` matches when any entry MIME equals any requested MIME; multi-attachment bundles prove it is not all-match or exact-set matching.
+- **Optional field semantics:** `policySeed` and `sourceLabel` filters exclude entries where the field is undefined.
+- **Tick horizon guidance:** `materializedEndTick` equals `persistedEndTick` for finalized incomplete bundles and `endTick` for complete bundles; raw `endTick` remains queryable but does not replace the materialized-content field. Recorded failures remain a replay-level constraint enforced by `SessionReplayer`.
+- **Invalid queries:** non-finite numeric ranges, `min > max`, non-integer tick bounds, and non-UTC-Z `recordedAt` bounds throw `CorpusIndexError` with `details.code === 'query_invalid'`.
+- **Invalid manifests:** strict mode throws `CorpusIndexError`; `skipInvalid: true` records `invalidEntries` and omits bad entries. Non-canonical `metadata.recordedAt` is covered as `manifest_invalid`.
+- **Missing keys:** `corpus.get(key)` returns `undefined`; `corpus.openSource(key)` and `corpus.loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
+- **Error taxonomy:** `CorpusIndexError` is an `instanceof SessionRecordingError` and preserves JSON-shaped details with the discriminator at `details.code`.
+- **FileSink integration:** `entry.openSource()` reads snapshots and sidecars through FileSink; `entry.loadBundle()` matches `new FileSink(dir).toBundle()` for full bundle materialization.
+- **runMetrics integration:** `runMetrics(corpus.bundles(query), metrics)` produces the same result as `runMetrics(matchingEntries.map((e) => e.loadBundle()), metrics)`.
+- **Defensive entry surface:** mutation attempts against returned entries, metadata, or `failedTicks` cannot affect subsequent `entries()` results.
+- **Closed-corpus contract:** tests should document the boundary by constructing corpora only after sinks close. v1 does not test live-writer detection because the feature explicitly does not exist.
+
+Tests should create real temporary FileSink bundle directories, not hand-written partial shapes except for malformed-manifest, malformed-stream, and sidecar-boundary cases.
+
+## 12. Doc Surface
+
+Per AGENTS.md, implementation updates:
+
+- `docs/api-reference.md`: new `## Bundle Corpus Index (v0.8.3)` section for `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
+- `docs/guides/bundle-corpus-index.md`: quickstart, metadata query guide, `runMetrics` integration, replay investigation example, closed-corpus contract, incomplete-bundle behavior, sidecar boundary, scan-depth behavior, limitations.
+- `docs/guides/behavioral-metrics.md`: replace in-memory-only corpus examples with a disk-backed `BundleCorpus` example.
+- `docs/guides/session-recording.md`: add a short "Indexing FileSink bundles" section.
+- `docs/guides/ai-integration.md`: add Spec 7 as Tier-2 corpus query surface.
+- `docs/guides/concepts.md`: add `BundleCorpus` to the standalone utilities list.
+- `README.md`: Feature Overview row, Public Surface bullet, and version badge update.
+- `docs/README.md`: guide index entry.
+- `docs/architecture/ARCHITECTURE.md`: Component Map row and Boundaries paragraph for Bundle Corpus.
+- `docs/architecture/drift-log.md`: append a row.
+- `docs/architecture/decisions.md`: append ADRs 28-31.
+- `docs/design/ai-first-dev-roadmap.md`: update Spec 7 status when implemented.
+- `docs/changelog.md`, `docs/devlog/summary.md`, latest detailed devlog, `package.json`, `src/version.ts`: v0.8.3 additive release entry.
+
+The implementation plan must include the mandatory doc audit: grep or doc-review for stale/removed names and verify canonical docs mention the new API. Stale references in historical changelog/devlog/drift-log entries are allowed; current guides, README, and API reference must reflect the implementation.
+
+The code-review prompt must include: "verify docs in the diff match implementation; flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides."
+
+## 13. Versioning
+
+Current base is v0.8.2. Spec 7 v1 is additive and non-breaking:
+
+- New `BundleCorpus` subsystem.
+- New public types and error class.
+- No changes to existing unions.
+- No changes to `FileSink`, `SessionSource`, `SessionBundle`, or `runMetrics` signatures.
+
+Ship as v0.8.3 (`c` bump). One coherent implementation commit should include code, tests, docs, ADRs, roadmap status, changelog, devlog, README badge, API reference, doc audit evidence, and version bump.
+
+## 14. ADRs
+
+### ADR 28: Bundle corpus is manifest-first over closed FileSink directories
+
+**Decision:** v1 builds its in-memory index by scanning `manifest.json` files at `BundleCorpus` construction time. It does not write or read a persisted `corpus-index.json`, and it is supported only for closed/frozen bundle directories.
+
+**Rationale:** Manifest scan is simple, deterministic, and uses the existing FileSink contract. A secondary database creates invalidation and stale-index risks before the corpus size proves it is needed. Active-writer detection would require a new FileSink lifecycle marker or lock contract; v1 avoids that by making corpus construction a post-generation step. Future cached index or live-writer work can be explicit and benchmark-driven.
+
+### ADR 29: Corpus composes with `runMetrics` via `Iterable<SessionBundle>`
+
+**Decision:** `BundleCorpus` exposes `bundles(query?)` and `[Symbol.iterator]()` as synchronous `IterableIterator<SessionBundle>`.
+
+**Rationale:** Spec 8 already accepts `Iterable<SessionBundle>`. Changing `runMetrics` or adding a parallel metrics-specific corpus API would duplicate the iteration boundary. Disk-backed corpora should look like any other bundle iterable to metrics code.
+
+### ADR 30: Canonical corpus order is recordedAt, sessionId, key
+
+**Decision:** Entries are sorted by `metadata.recordedAt`, then `metadata.sessionId`, then canonical `key` before any public listing or bundle iteration. The root bundle key is `'.'`; descendants use slash-separated relative paths without a leading `./`.
+
+**Rationale:** Filesystem order differs across platforms. Stable ordering makes order-sensitive user metrics deterministic and makes CI output diff-friendly. `key` is the final tiebreaker because session IDs can collide when bundles are copied. Defining the root key avoids observable API divergence between `'.'`, `''`, and basename encodings.
+
+### ADR 31: v1 query scope is manifest-derived only
+
+**Decision:** `BundleQuery` filters only fields present in `manifest.json` or derived directly from manifest metadata/attachments. It does not include content-derived command/event/marker/snapshot predicates.
+
+**Rationale:** Content queries over commands, events, ticks, markers, snapshots, and metrics require reading larger streams or maintaining a secondary summary index. Mixing that into v1 would either violate the lightweight-listing goal or smuggle in a database. Manifest-only query is the minimal useful surface that unblocks disk-backed metrics and metadata triage.
+
+## 15. Open Questions
+
+1. **Should `recordedAt` query accept `Date` objects?** v1 uses normalized UTC ISO strings only to keep the query type JSON-clean and timezone-explicit. Callers can pass `date.toISOString()`.
+2. **Should `entries()` return an array or an iterator?** v1 returns `readonly BundleCorpusEntry[]` because the index is already in memory and array filtering/slicing is ergonomic. `bundles()` remains a generator to avoid loading full bundles all at once.
+3. **Should BundleCorpus expose content helper methods like `markers(query)`?** Deferred. The first content query should be designed with real caller pressure and likely belongs to a secondary summary layer.
+4. **Should invalid entries be exposed in strict mode?** Strict mode throws immediately, so there is no constructed corpus. `skipInvalid: true` is the diagnostic mode with `invalidEntries`.
+5. **Should FileSink add a durable "closed" marker?** Deferred. v1 documents the closed-corpus requirement without modifying FileSink. If live-writer mistakes become common, a later spec can add explicit lifecycle state to the disk format.
+
+## 16. Future Specs
+
+| Future Spec | What it adds |
+| --- | --- |
+| Spec 4: Standalone Bundle Viewer | Uses `BundleCorpus.entries()` to populate a bundle picker, then `entry.openSource()` / `SessionReplayer` to inspect timelines. |
+| Future: Content Summary Index | Optional derived summaries over markers, command/event types, tick failure phases, and metric outputs. Persisted with explicit invalidation. |
+| Future: Async Corpus | `AsyncBundleCorpus` and `runMetricsAsync` for remote/object-store or very large local corpora. |
+| Future: Corpus Retention | Delete/archive policies by age, source kind, label, failure status, and size. |
+| Future: Live Bundle Discovery | FileSink lifecycle marker or lock-file contract so corpus construction can safely exclude active writers. |
+| Future: StopReason Persistence | If Spec 3 persists `stopReason` into metadata, BundleQuery can add a manifest-only `stopReason` filter. |
+
+## 17. Acceptance Criteria
+
+- `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, `InvalidCorpusEntry`, and supporting types are exported from `src/index.ts`.
+- Corpus construction discovers closed FileSink bundle directories from a root, validates manifests, skips symlinks, honors `scanDepth`, derives `'.'` for a root-bundle key, and exposes stable sorted entries.
+- `entries(query?)` filters without reading JSONL streams, snapshots, or sidecar bytes.
+- Query validation rejects invalid numeric ranges and non-normalized `recordedAt` bounds.
+- Optional manifest-field filters have defined missing-value behavior.
+- `attachmentMime` any-match behavior is covered by a multi-attachment test.
+- `bundles(query?)` and `[Symbol.iterator]` yield full `SessionBundle`s lazily, one entry at a time, via FileSink.
+- `entry.openSource()` and `entry.loadBundle()` compose with `SessionReplayer` and `FileSink.toBundle()`.
+- `corpus.get(key)` returns `undefined`, while `corpus.openSource(key)` and `corpus.loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'` for missing keys.
+- `runMetrics(corpus.bundles(query), metrics)` works and is covered by tests.
+- Invalid manifest handling has strict and `skipInvalid` coverage, including non-canonical `metadata.recordedAt`.
+- Incomplete-bundle `materializedEndTick` behavior is covered and documented as a manifest materialization horizon, not as a replay guarantee.
+- Explicit dataUrl attachment bytes embedded in `manifest.json` are documented as part of manifest parse cost, not as a separate content index.
+- Sidecar-byte integrity is documented and tested as source-level/on-demand, not `loadBundle()` validation.
+- Defensive metadata freezing/copying is covered by tests.
+- Docs, ADRs, roadmap, changelog, devlog, README badge, API reference, doc audit evidence, and version bump land in the same commit as code.
+- All four engine gates pass: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
+- Multi-CLI design, plan, and code reviews converge per AGENTS.md.
diff --git a/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md b/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md
new file mode 100644
index 0000000..c3dcce7
--- /dev/null
+++ b/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md
@@ -0,0 +1,1105 @@
+# Bundle Corpus Index Implementation Plan
+
+> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
+
+**Plan revision:** v6 (2026-04-27) - fixes plan-review iteration 5 findings from `docs/reviews/bundle-corpus-index/2026-04-27/plan-5/`: code-review re-review prompts must include all prior task `REVIEW.md` files, not only the immediately previous iteration.
+
+**Goal:** Implement Spec 7: Bundle Search / Corpus Index as a disk-backed manifest-first `BundleCorpus` that indexes closed FileSink bundle directories, filters metadata without loading content streams, and yields `SessionBundle`s lazily for `runMetrics`.
+
+**Architecture:** Add a focused BundleCorpus subsystem: `src/bundle-corpus.ts` owns filesystem discovery, immutable entry construction, query validation/filtering, and FileSink-backed bundle/source loading; `src/bundle-corpus-types.ts` owns the public type/error surface; `src/bundle-corpus-manifest.ts` owns manifest-only validation/loading. The split keeps new source files below the repo's 500-LOC review cap while preserving a single public root export surface. The new subsystem composes with existing session recording, FileSink, SessionReplayer, and behavioral metrics without changing their signatures.
+
+**Tech Stack:** TypeScript 5.7+, Node `fs`/`path`, Vitest 3, ESLint 9, ESM + Node16 module resolution.
+
+**Branch:** None. Commit directly to `main` after plan review, implementation, full gates, staged multi-CLI code review, and final doc updates.
+
+**Versioning:** Base is v0.8.2. Spec 7 is additive and non-breaking, so ship v0.8.3 with one coherent commit.
+
+---
+
+## File Map
+
+- Create `src/bundle-corpus.ts`, `src/bundle-corpus-types.ts`, and `src/bundle-corpus-manifest.ts`: public corpus API, query helpers, manifest validation, error class, immutable entries, FileSink integration.
+- Modify `src/index.ts`: export the Spec 7 public surface.
+- Create `tests/bundle-corpus.test.ts`: FileSink-backed corpus tests plus focused malformed-manifest and malformed-stream cases.
+- Modify `package.json`: bump `"version"` from `0.8.2` to `0.8.3`.
+- Modify `src/version.ts`: bump `ENGINE_VERSION` from `'0.8.2'` to `'0.8.3'`.
+- Modify `README.md`: version badge, Feature Overview row, Public Surface bullet.
+- Modify `docs/api-reference.md`: add `Bundle Corpus Index (v0.8.3)` public API section.
+- Create `docs/guides/bundle-corpus-index.md`: quickstart, query guide, metrics integration, replay investigation, scan depth, closed-corpus and sidecar boundaries.
+- Modify `docs/guides/behavioral-metrics.md`: add disk-backed `BundleCorpus` example.
+- Modify `docs/guides/session-recording.md`: add FileSink bundle indexing note.
+- Modify `docs/guides/ai-integration.md`: add Tier-2 corpus query surface.
+- Modify `docs/guides/concepts.md`: add `BundleCorpus` to standalone utilities.
+- Modify `docs/README.md`: add guide index entry.
+- Modify `docs/architecture/ARCHITECTURE.md`: Component Map row and boundary note for Bundle Corpus.
+- Modify `docs/architecture/drift-log.md`: append Spec 7 drift row.
+- Modify `docs/architecture/decisions.md`: append ADRs 28-31 from the accepted design.
+- Modify `docs/design/ai-first-dev-roadmap.md`: mark Spec 7 implemented.
+- Modify `docs/changelog.md`: add v0.8.3 entry.
+- Modify `docs/devlog/summary.md`: add one newest-first Spec 7 line and keep the summary compact.
+- Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md`: append the final task entry after code review artifacts exist.
+- Create `docs/reviews/bundle-corpus-index-T1/2026-04-27/<iteration>/`: staged-diff code-review artifacts.
+
+## Single Task: Spec 7 - Full Surface, Tests, Docs, Review, Commit
+
+**Goal:** Land the entire Spec 7 surface in one v0.8.3 commit: tests, implementation, exports, docs, roadmap status, changelog/devlog, version bump, doc audit, gates, and staged multi-CLI code review.
+
+**Files:**
+- Create: `tests/bundle-corpus.test.ts`
+- Create: `src/bundle-corpus.ts`, `src/bundle-corpus-types.ts`, `src/bundle-corpus-manifest.ts`
+- Modify: `src/index.ts`
+- Modify: docs and version files listed in File Map
+
+### Step 1: Write failing corpus tests first
+
+- [ ] Create `tests/bundle-corpus.test.ts` with FileSink-backed fixtures. Use canonical UTC `recordedAt` values because corpus construction validates UTC-Z strings.
+
+```ts
+import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+import { afterEach, describe, expect, it } from 'vitest';
+import {
+  BundleCorpus,
+  CorpusIndexError,
+  FileSink,
+  SessionRecordingError,
+  bundleCount,
+  runMetrics,
+  type AttachmentDescriptor,
+  type SessionMetadata,
+  type SessionSnapshotEntry,
+} from '../src/index.js';
+
+const roots: string[] = [];
+
+function tempRoot(): string {
+  const root = mkdtempSync(join(tmpdir(), 'civ-engine-corpus-'));
+  roots.push(root);
+  return root;
+}
+
+afterEach(() => {
+  for (const root of roots.splice(0)) {
+    rmSync(root, { recursive: true, force: true });
+  }
+});
+
+function metadata(id: string, overrides: Partial<SessionMetadata> = {}): SessionMetadata {
+  return {
+    sessionId: id,
+    engineVersion: '0.8.2',
+    nodeVersion: 'v20.0.0',
+    recordedAt: '2026-04-27T00:00:00.000Z',
+    startTick: 0,
+    endTick: 10,
+    persistedEndTick: 10,
+    durationTicks: 10,
+    sourceKind: 'session',
+    ...overrides,
+  };
+}
+
+function snapshot(tick: number): SessionSnapshotEntry {
+  return {
+    tick,
+    snapshot: { tick } as never,
+  };
+}
+
+function writeBundle(dir: string, meta: SessionMetadata, attachments: AttachmentDescriptor[] = []): void {
+  const sink = new FileSink(dir);
+  sink.open(meta);
+  sink.writeSnapshot(snapshot(meta.startTick));
+  if (meta.persistedEndTick !== meta.startTick) {
+    sink.writeSnapshot(snapshot(meta.persistedEndTick));
+  }
+  for (const attachment of attachments) {
+    sink.writeAttachment(attachment, new Uint8Array([1, 2, 3]));
+  }
+  sink.close();
+}
+
+function writeInvalidManifest(dir: string, manifest: unknown): void {
+  mkdirSync(dir, { recursive: true });
+  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
+}
+
+function expectCorpusError(fn: () => unknown, code: string): CorpusIndexError {
+  try {
+    fn();
+  } catch (error) {
+    expect(error).toBeInstanceOf(CorpusIndexError);
+    expect(error).toBeInstanceOf(SessionRecordingError);
+    expect((error as CorpusIndexError).details.code).toBe(code);
+    return error as CorpusIndexError;
+  }
+  throw new Error(`expected CorpusIndexError ${code}`);
+}
+```
+
+- [ ] Add discovery, ordering, and immutable-entry tests.
+
+```ts
+describe('BundleCorpus discovery and entries', () => {
+  it('indexes a root bundle with key "." and freezes entry metadata', () => {
+    const root = tempRoot();
+    writeBundle(root, metadata('root', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+
+    const corpus = new BundleCorpus(root, { scanDepth: 'root' });
+    const entries = corpus.entries();
+
+    expect(entries.map((entry) => entry.key)).toEqual(['.']);
+    expect(entries[0].dir).toBe(root);
+    expect(Object.isFrozen(entries[0])).toBe(true);
+    expect(Object.isFrozen(entries[0].metadata)).toBe(true);
+    expect(corpus.get('.')).toBe(entries[0]);
+
+    expect(() => {
+      (entries[0].metadata as SessionMetadata).sessionId = 'mutated';
+    }).toThrow(TypeError);
+    expect(corpus.entries()[0].metadata.sessionId).toBe('root');
+  });
+
+  it('honors scanDepth and sorts by recordedAt, sessionId, then key', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'b'), metadata('s-2', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeBundle(join(root, 'a'), metadata('s-1', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeBundle(join(root, 'nested', 'c'), metadata('s-0', { recordedAt: '2026-04-27T00:00:00.000Z' }));
+
+    expect(new BundleCorpus(root, { scanDepth: 'root' }).entries()).toEqual([]);
+    expect(new BundleCorpus(root, { scanDepth: 'children' }).entries().map((entry) => entry.key)).toEqual(['a', 'b']);
+    expect(new BundleCorpus(root, { scanDepth: 'all' }).entries().map((entry) => entry.key)).toEqual(['nested/c', 'a', 'b']);
+  });
+
+  it('stops descending once a directory is a bundle', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'outer'), metadata('outer'));
+    writeBundle(join(root, 'outer', 'nested'), metadata('nested'));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['outer']);
+  });
+
+  it('uses locale-independent code-unit ordering for ties', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'lower'), metadata('alpha', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    writeBundle(join(root, 'upper'), metadata('Zulu', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.metadata.sessionId)).toEqual(['Zulu', 'alpha']);
+  });
+
+  it('skips symlinked directories when the platform permits creating them', () => {
+    const root = tempRoot();
+    const target = join(root, 'target');
+    writeBundle(target, metadata('target'));
+    try {
+      symlinkSync(target, join(root, 'link'), 'junction');
+    } catch {
+      return;
+    }
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['target']);
+  });
+});
+```
+
+- [ ] Add manifest-only, sidecar, query, missing-key, invalid-manifest, FileSink, and metrics tests.
+
+```ts
+describe('BundleCorpus query and loading contracts', () => {
+  it('lists from manifest without reading malformed streams until loadBundle', () => {
+    const root = tempRoot();
+    const dir = join(root, 'bad-stream');
+    writeBundle(dir, metadata('bad-stream'));
+    writeFileSync(join(dir, 'ticks.jsonl'), '{"tick":\n{}\n');
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['bad-stream']);
+    expect(() => corpus.loadBundle('bad-stream')).toThrow();
+  });
+
+  it('does not read missing sidecar bytes during listing or loadBundle', () => {
+    const root = tempRoot();
+    const dir = join(root, 'sidecar');
+    writeBundle(dir, metadata('sidecar'), [
+      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
+    ]);
+    rmSync(join(dir, 'attachments', 'screen.png'));
+
+    const corpus = new BundleCorpus(root);
+    const entry = corpus.entries({ attachmentMime: 'image/png' })[0];
+    expect(entry.attachmentCount).toBe(1);
+    expect(entry.attachmentBytes).toBe(3);
+    expect(entry.attachmentMimes).toEqual(['image/png']);
+    expect(entry.loadBundle().attachments).toHaveLength(1);
+    expect(() => entry.openSource().readSidecar('screen')).toThrow();
+  });
+
+  it('loads bundles lazily one iterator step at a time', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'first'), metadata('first', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    const second = join(root, 'second');
+    writeBundle(second, metadata('second', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeFileSync(join(second, 'ticks.jsonl'), '{"tick":\n{}\n');
+
+    const iterator = new BundleCorpus(root).bundles();
+    const first = iterator.next();
+    expect(first.done).toBe(false);
+    expect(first.value.metadata.sessionId).toBe('first');
+    expect(() => iterator.next()).toThrow();
+  });
+
+  it('matches attachmentMime when any MIME overlaps the requested set', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'mixed'), metadata('mixed'), [
+      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
+      { id: 'trace', mime: 'application/json', sizeBytes: 3, ref: { sidecar: true } },
+    ]);
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.get('mixed')?.attachmentMimes).toEqual(['application/json', 'image/png']);
+    expect(corpus.entries({ attachmentMime: 'application/json' }).map((entry) => entry.key)).toEqual(['mixed']);
+    expect(corpus.entries({ attachmentMime: ['text/plain', 'image/png'] }).map((entry) => entry.key)).toEqual(['mixed']);
+    expect(corpus.entries({ attachmentMime: ['text/plain', 'text/csv'] }).map((entry) => entry.key)).toEqual([]);
+  });
+
+  it('filters by manifest fields and ANDs query fields', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'seeded'), metadata('seeded', {
+      recordedAt: '2026-04-27T00:00:01.000Z',
+      sourceKind: 'synthetic',
+      sourceLabel: 'random',
+      policySeed: 42,
+      durationTicks: 30,
+      endTick: 30,
+      persistedEndTick: 30,
+    }));
+    writeBundle(join(root, 'unseeded'), metadata('unseeded', {
+      recordedAt: '2026-04-27T00:00:02.000Z',
+      sourceKind: 'synthetic',
+      durationTicks: 5,
+      endTick: 5,
+      persistedEndTick: 5,
+    }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries({ sourceKind: 'synthetic', policySeed: { min: 40, max: 50 } }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ sourceLabel: 'random' }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ durationTicks: { min: 10 }, recordedAt: { from: '2026-04-27T00:00:00.000Z', to: '2026-04-27T00:00:01.000Z' } }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ key: /seed/ }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
+    const stateful = /seed/g;
+    expect(corpus.entries({ key: stateful }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
+    expect(stateful.lastIndex).toBe(0);
+  });
+
+  it('derives failure counts and materializedEndTick from metadata', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'complete'), metadata('complete', { endTick: 20, persistedEndTick: 20, durationTicks: 20 }));
+    writeBundle(join(root, 'incomplete'), metadata('incomplete', {
+      incomplete: true,
+      endTick: 50,
+      persistedEndTick: 25,
+      durationTicks: 50,
+      failedTicks: [26, 27],
+    }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.get('complete')?.materializedEndTick).toBe(20);
+    expect(corpus.get('incomplete')?.materializedEndTick).toBe(25);
+    expect(corpus.entries({ incomplete: true }).map((entry) => entry.key)).toEqual(['incomplete']);
+    expect(corpus.entries({ incomplete: false }).map((entry) => entry.key)).toEqual(['complete']);
+    expect(corpus.entries({ materializedEndTick: { max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
+    expect(corpus.entries({ endTick: { min: 50 } }).map((entry) => entry.key)).toEqual(['incomplete']);
+    const failedTicks = corpus.get('incomplete')!.metadata.failedTicks!;
+    expect(Object.isFrozen(failedTicks)).toBe(true);
+    expect(() => failedTicks.push(99)).toThrow(TypeError);
+    expect(corpus.get('incomplete')!.metadata.failedTicks).toEqual([26, 27]);
+  });
+
+  it('rejects invalid query ranges and non-canonical recordedAt bounds', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'bundle'), metadata('bundle'));
+    const corpus = new BundleCorpus(root);
+
+    expectCorpusError(() => corpus.entries({ durationTicks: { min: 10, max: 1 } }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ startTick: { min: 0.5 } }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ policySeed: Number.POSITIVE_INFINITY }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ recordedAt: { from: '2026-04-27' } }), 'query_invalid');
+  });
+
+  it('returns undefined for get and throws entry_missing for strict missing-key APIs', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'bundle'), metadata('bundle'));
+    const corpus = new BundleCorpus(root);
+
+    expect(corpus.get('missing')).toBeUndefined();
+    expectCorpusError(() => corpus.openSource('missing'), 'entry_missing');
+    expectCorpusError(() => corpus.loadBundle('missing'), 'entry_missing');
+  });
+
+  it('handles invalid manifests strictly or through skipInvalid diagnostics', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'good'), metadata('good'));
+    writeInvalidManifest(join(root, 'bad'), {
+      schemaVersion: 1,
+      metadata: metadata('bad', { recordedAt: '2026-04-27T00:00:00-07:00' }),
+      attachments: [],
+    });
+
+    expectCorpusError(() => new BundleCorpus(root), 'manifest_invalid');
+    const corpus = new BundleCorpus(root, { skipInvalid: true });
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['good']);
+    expect(corpus.invalidEntries).toHaveLength(1);
+    expect(corpus.invalidEntries[0].error.details.code).toBe('manifest_invalid');
+  });
+
+  it('loads FileSink bundles lazily and composes with runMetrics', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'one'), metadata('one', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    writeBundle(join(root, 'two'), metadata('two', { recordedAt: '2026-04-27T00:00:02.000Z', sourceKind: 'synthetic' }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.openSource('one').readSnapshot(0)).toEqual(snapshot(0).snapshot);
+    expect(corpus.loadBundle('one')).toEqual(new FileSink(join(root, 'one')).toBundle());
+    expect([...corpus].map((bundle) => bundle.metadata.sessionId)).toEqual(['one', 'two']);
+    expect(runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()]).bundleCount).toBe(1);
+  });
+});
+```
+
+- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
+- [ ] Expected: FAIL with module/export errors for `BundleCorpus` and `CorpusIndexError`.
+
+### Step 2: Implement `src/bundle-corpus.ts`
+
+- [ ] Create `src/bundle-corpus.ts` with the public API and query helpers, plus `src/bundle-corpus-types.ts` for public types/errors and `src/bundle-corpus-manifest.ts` for manifest validation. Keep the subsystem self-contained; do not modify FileSink, SessionSource, SessionBundle, SessionReplayer, or runMetrics.
+
+```ts
+import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
+import { join, relative, resolve, sep } from 'node:path';
+import type { JsonValue } from './json.js';
+import type { AttachmentDescriptor, SessionBundle, SessionMetadata } from './session-bundle.js';
+import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
+import { SessionRecordingError } from './session-errors.js';
+import { FileSink } from './session-file-sink.js';
+import type { SessionSource } from './session-sink.js';
+
+const MANIFEST_FILE = 'manifest.json';
+
+export type BundleCorpusScanDepth = 'root' | 'children' | 'all';
+
+export interface BundleCorpusOptions {
+  scanDepth?: BundleCorpusScanDepth;
+  skipInvalid?: boolean;
+}
+
+export interface NumberRange {
+  min?: number;
+  max?: number;
+}
+
+export interface IsoTimeRange {
+  from?: string;
+  to?: string;
+}
+
+export type OneOrMany<T> = T | readonly T[];
+
+export interface BundleQuery {
+  key?: string | RegExp;
+  sessionId?: OneOrMany<string>;
+  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
+  sourceLabel?: OneOrMany<string>;
+  engineVersion?: OneOrMany<string>;
+  nodeVersion?: OneOrMany<string>;
+  incomplete?: boolean;
+  durationTicks?: NumberRange;
+  startTick?: NumberRange;
+  endTick?: NumberRange;
+  persistedEndTick?: NumberRange;
+  materializedEndTick?: NumberRange;
+  failedTickCount?: NumberRange;
+  policySeed?: number | NumberRange;
+  recordedAt?: IsoTimeRange;
+  attachmentMime?: OneOrMany<string>;
+}
+
+export type CorpusIndexErrorCode =
+  | 'root_missing'
+  | 'manifest_parse'
+  | 'manifest_invalid'
+  | 'schema_unsupported'
+  | 'duplicate_key'
+  | 'query_invalid'
+  | 'entry_missing';
+
+export interface CorpusIndexErrorDetails {
+  readonly [key: string]: JsonValue;
+  readonly code: CorpusIndexErrorCode;
+  readonly path: string | null;
+  readonly key: string | null;
+  readonly message: string | null;
+}
+
+export class CorpusIndexError extends SessionRecordingError {
+  override readonly details: CorpusIndexErrorDetails;
+
+  constructor(message: string, details: CorpusIndexErrorDetails) {
+    super(message, details);
+    this.name = 'CorpusIndexError';
+    this.details = details;
+  }
+}
+
+export interface InvalidCorpusEntry {
+  readonly path: string;
+  readonly error: CorpusIndexError;
+}
+
+export interface BundleCorpusEntry {
+  readonly key: string;
+  readonly dir: string;
+  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  readonly metadata: Readonly<SessionMetadata>;
+  readonly attachmentCount: number;
+  readonly attachmentBytes: number;
+  readonly attachmentMimes: readonly string[];
+  readonly hasFailures: boolean;
+  readonly failedTickCount: number;
+  readonly materializedEndTick: number;
+  openSource(): SessionSource;
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
+}
+```
+
+- [ ] Add implementation helpers in the same file with these exact responsibilities:
+
+```ts
+interface FileManifest {
+  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  metadata: SessionMetadata;
+  attachments: AttachmentDescriptor[];
+}
+
+interface CorpusIndexErrorDetailsInput {
+  readonly [key: string]: JsonValue | undefined;
+  readonly code: CorpusIndexErrorCode;
+  readonly path?: string;
+  readonly key?: string;
+  readonly message?: string;
+}
+
+function normalizeDetails(input: CorpusIndexErrorDetailsInput): CorpusIndexErrorDetails {
+  const details: Record<string, JsonValue> = {};
+  for (const [key, value] of Object.entries(input)) {
+    if (value !== undefined) details[key] = value;
+  }
+  details.code = input.code;
+  details.path = input.path ?? null;
+  details.key = input.key ?? null;
+  details.message = input.message ?? null;
+  return Object.freeze(details) as CorpusIndexErrorDetails;
+}
+
+function corpusError(message: string, details: CorpusIndexErrorDetailsInput): CorpusIndexError {
+  return new CorpusIndexError(message, normalizeDetails(details));
+}
+
+function isRecord(value: unknown): value is Record<string, unknown> {
+  return typeof value === 'object' && value !== null && !Array.isArray(value);
+}
+
+function assertCanonicalIso(value: unknown, label: string, path: string): string {
+  if (typeof value !== 'string' || !value.endsWith('Z')) {
+    throw corpusError(`${label} must be a normalized UTC ISO string`, { code: 'manifest_invalid', path, message: label });
+  }
+  const parsed = new Date(value);
+  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
+    throw corpusError(`${label} must round-trip through Date.toISOString()`, { code: 'manifest_invalid', path, message: label });
+  }
+  return value;
+}
+
+function validateQueryIso(value: unknown, label: string): string {
+  if (typeof value !== 'string' || !value.endsWith('Z')) {
+    throw corpusError(`${label} must be a normalized UTC ISO string`, { code: 'query_invalid', message: label });
+  }
+  const parsed = new Date(value);
+  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
+    throw corpusError(`${label} must round-trip through Date.toISOString()`, { code: 'query_invalid', message: label });
+  }
+  return value;
+}
+
+function assertString(value: unknown, label: string, path: string): string {
+  if (typeof value !== 'string') {
+    throw corpusError(`${label} must be a string`, { code: 'manifest_invalid', path, message: label });
+  }
+  return value;
+}
+
+function assertInteger(value: unknown, label: string, path: string): number {
+  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
+    throw corpusError(`${label} must be a finite integer`, { code: 'manifest_invalid', path, message: label });
+  }
+  return value;
+}
+```
+
+- [ ] Validate manifests with runtime checks instead of trusting JSON casts.
+
+```ts
+function validateMetadata(value: unknown, path: string): SessionMetadata {
+  if (!isRecord(value)) {
+    throw corpusError('manifest metadata must be an object', { code: 'manifest_invalid', path, message: 'metadata' });
+  }
+  const sourceKind = value.sourceKind;
+  if (sourceKind !== 'session' && sourceKind !== 'scenario' && sourceKind !== 'synthetic') {
+    throw corpusError('metadata.sourceKind must be session, scenario, or synthetic', { code: 'manifest_invalid', path, message: 'sourceKind' });
+  }
+  const failedTicks = value.failedTicks === undefined
+    ? undefined
+    : Array.isArray(value.failedTicks)
+      ? value.failedTicks.map((tick, index) => assertInteger(tick, `failedTicks[${index}]`, path))
+      : (() => { throw corpusError('metadata.failedTicks must be an array', { code: 'manifest_invalid', path, message: 'failedTicks' }); })();
+  const metadata: SessionMetadata = {
+    sessionId: assertString(value.sessionId, 'sessionId', path),
+    engineVersion: assertString(value.engineVersion, 'engineVersion', path),
+    nodeVersion: assertString(value.nodeVersion, 'nodeVersion', path),
+    recordedAt: assertCanonicalIso(value.recordedAt, 'recordedAt', path),
+    startTick: assertInteger(value.startTick, 'startTick', path),
+    endTick: assertInteger(value.endTick, 'endTick', path),
+    persistedEndTick: assertInteger(value.persistedEndTick, 'persistedEndTick', path),
+    durationTicks: assertInteger(value.durationTicks, 'durationTicks', path),
+    sourceKind,
+  };
+  if (value.sourceLabel !== undefined) metadata.sourceLabel = assertString(value.sourceLabel, 'sourceLabel', path);
+  if (value.incomplete !== undefined) {
+    if (value.incomplete !== true) {
+      throw corpusError('metadata.incomplete must be true when present', { code: 'manifest_invalid', path, message: 'incomplete' });
+    }
+    metadata.incomplete = true;
+  }
+  if (failedTicks) metadata.failedTicks = failedTicks;
+  if (value.policySeed !== undefined) metadata.policySeed = assertInteger(value.policySeed, 'policySeed', path);
+  return metadata;
+}
+
+function validateAttachment(value: unknown, path: string, index: number): AttachmentDescriptor {
+  if (!isRecord(value)) {
+    throw corpusError(`attachments[${index}] must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}]` });
+  }
+  const ref = value.ref;
+  if (!isRecord(ref)) {
+    throw corpusError(`attachments[${index}].ref must be an object`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
+  }
+  const refKeys = Object.keys(ref).filter((key) => ref[key] !== undefined);
+  const validRef =
+    (refKeys.length === 1 && typeof ref.dataUrl === 'string') ||
+    (refKeys.length === 1 && ref.sidecar === true) ||
+    (refKeys.length === 1 && ref.auto === true);
+  if (!validRef) {
+    throw corpusError(`attachments[${index}].ref must be dataUrl, sidecar, or auto`, { code: 'manifest_invalid', path, message: `attachments[${index}].ref` });
+  }
+  return {
+    id: assertString(value.id, `attachments[${index}].id`, path),
+    mime: assertString(value.mime, `attachments[${index}].mime`, path),
+    sizeBytes: assertInteger(value.sizeBytes, `attachments[${index}].sizeBytes`, path),
+    ref: ref as AttachmentDescriptor['ref'],
+  };
+}
+
+function readManifest(manifestPath: string): FileManifest {
+  let parsed: unknown;
+  try {
+    parsed = JSON.parse(readFileSync(manifestPath, 'utf-8')) as unknown;
+  } catch (error) {
+    throw corpusError(`manifest parse failed: ${(error as Error).message}`, { code: 'manifest_parse', path: manifestPath, message: (error as Error).message });
+  }
+  if (!isRecord(parsed)) {
+    throw corpusError('manifest must be an object', { code: 'manifest_invalid', path: manifestPath, message: 'manifest' });
+  }
+  if (parsed.schemaVersion !== SESSION_BUNDLE_SCHEMA_VERSION) {
+    throw corpusError('unsupported bundle schema version', { code: 'schema_unsupported', path: manifestPath, message: String(parsed.schemaVersion) });
+  }
+  if (!Array.isArray(parsed.attachments)) {
+    throw corpusError('manifest attachments must be an array', { code: 'manifest_invalid', path: manifestPath, message: 'attachments' });
+  }
+  return {
+    schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
+    metadata: validateMetadata(parsed.metadata, manifestPath),
+    attachments: parsed.attachments.map((attachment, index) => validateAttachment(attachment, manifestPath, index)),
+  };
+}
+```
+
+- [ ] Add a locale-independent string comparator. Use it everywhere the corpus exposes deterministic ordering.
+
+```ts
+function compareCodeUnit(a: string, b: string): number {
+  return a < b ? -1 : a > b ? 1 : 0;
+}
+```
+
+- [ ] Add `BundleCorpus` with synchronous construction, deterministic discovery, immutable entries, query filtering, and lazy bundle iteration.
+
+```ts
+export class BundleCorpus implements Iterable<SessionBundle> {
+  readonly rootDir: string;
+  readonly invalidEntries: readonly InvalidCorpusEntry[];
+  private readonly _entries: readonly BundleCorpusEntry[];
+  private readonly _byKey: ReadonlyMap<string, BundleCorpusEntry>;
+
+  constructor(rootDir: string, options: BundleCorpusOptions = {}) {
+    const root = resolve(rootDir);
+    if (!existsSync(root) || !lstatSync(root).isDirectory()) {
+      throw corpusError('corpus root is missing or is not a directory', { code: 'root_missing', path: root });
+    }
+    this.rootDir = realpathSync(root);
+    const invalidEntries: InvalidCorpusEntry[] = [];
+    const found = discoverBundleDirs(this.rootDir, options.scanDepth ?? 'all');
+    const byKey = new Map<string, BundleCorpusEntry>();
+    const entries: BundleCorpusEntry[] = [];
+
+    for (const dir of found) {
+      const key = keyForDir(this.rootDir, dir);
+      if (byKey.has(key)) {
+        throw corpusError(`duplicate corpus key ${key}`, { code: 'duplicate_key', path: dir, key });
+      }
+      try {
+        const entry = makeEntry(dir, key, readManifest(join(dir, MANIFEST_FILE)));
+        byKey.set(key, entry);
+        entries.push(entry);
+      } catch (error) {
+        if (options.skipInvalid && error instanceof CorpusIndexError && error.details.code !== 'duplicate_key') {
+          invalidEntries.push(Object.freeze({ path: join(dir, MANIFEST_FILE), error }));
+          continue;
+        }
+        throw error;
+      }
+    }
+
+    entries.sort(compareEntries);
+    this._entries = Object.freeze(entries.slice());
+    this._byKey = new Map(entries.map((entry) => [entry.key, entry]));
+    this.invalidEntries = Object.freeze(invalidEntries.slice());
+  }
+
+  entries(query?: BundleQuery): readonly BundleCorpusEntry[] {
+    const predicate = query ? compileQuery(query) : () => true;
+    return Object.freeze(this._entries.filter(predicate));
+  }
+
+  *bundles(query?: BundleQuery): IterableIterator<SessionBundle> {
+    for (const entry of this.entries(query)) {
+      yield entry.loadBundle();
+    }
+  }
+
+  get(key: string): BundleCorpusEntry | undefined {
+    return this._byKey.get(key);
+  }
+
+  openSource(key: string): SessionSource {
+    return requireEntry(this._byKey, key).openSource();
+  }
+
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug> {
+    return requireEntry(this._byKey, key).loadBundle<TEventMap, TCommandMap, TDebug>();
+  }
+
+  [Symbol.iterator](): IterableIterator<SessionBundle> {
+    return this.bundles();
+  }
+}
+```
+
+- [ ] Implement the remaining private helpers exactly enough to satisfy the tests and design:
+
+```ts
+function discoverBundleDirs(root: string, depth: BundleCorpusScanDepth): string[] {
+  const out: string[] = [];
+  function visit(dir: string, remaining: number | 'all'): void {
+    if (existsSync(join(dir, MANIFEST_FILE))) {
+      out.push(dir);
+      return;
+    }
+    if (remaining === 0) return;
+    const nextRemaining = remaining === 'all' ? 'all' : remaining - 1;
+    const children = readdirSync(dir, { withFileTypes: true })
+      .filter((dirent) => dirent.isDirectory() && !dirent.isSymbolicLink())
+      .map((dirent) => dirent.name)
+      .sort(compareCodeUnit);
+    for (const child of children) visit(join(dir, child), nextRemaining);
+  }
+  visit(root, depth === 'root' ? 0 : depth === 'children' ? 1 : 'all');
+  return out;
+}
+
+function keyForDir(root: string, dir: string): string {
+  const rel = relative(root, dir);
+  if (rel.length === 0) return '.';
+  return rel.split(sep).join('/');
+}
+
+function makeEntry(dir: string, key: string, manifest: FileManifest): BundleCorpusEntry {
+  const frozenFailedTicks = manifest.metadata.failedTicks ? Object.freeze(manifest.metadata.failedTicks.slice()) : undefined;
+  const metadata: Readonly<SessionMetadata> = Object.freeze({
+    ...manifest.metadata,
+    ...(frozenFailedTicks ? { failedTicks: frozenFailedTicks as number[] } : {}),
+  });
+  const attachmentMimes = Object.freeze([...new Set(manifest.attachments.map((attachment) => attachment.mime))].sort(compareCodeUnit));
+  const materializedEndTick = metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick;
+  const entry: BundleCorpusEntry = {
+    key,
+    dir,
+    schemaVersion: manifest.schemaVersion,
+    metadata,
+    attachmentCount: manifest.attachments.length,
+    attachmentBytes: manifest.attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0),
+    attachmentMimes,
+    hasFailures: (metadata.failedTicks?.length ?? 0) > 0,
+    failedTickCount: metadata.failedTicks?.length ?? 0,
+    materializedEndTick,
+    openSource: () => new FileSink(dir),
+    loadBundle: <
+      TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+      TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+      TDebug = JsonValue,
+    >() => new FileSink(dir).toBundle() as SessionBundle<TEventMap, TCommandMap, TDebug>,
+  };
+  return Object.freeze(entry);
+}
+
+function compareEntries(a: BundleCorpusEntry, b: BundleCorpusEntry): number {
+  return compareCodeUnit(a.metadata.recordedAt, b.metadata.recordedAt)
+    || compareCodeUnit(a.metadata.sessionId, b.metadata.sessionId)
+    || compareCodeUnit(a.key, b.key);
+}
+
+function requireEntry(map: ReadonlyMap<string, BundleCorpusEntry>, key: string): BundleCorpusEntry {
+  const entry = map.get(key);
+  if (!entry) {
+    throw corpusError(`corpus entry ${key} not found`, { code: 'entry_missing', key });
+  }
+  return entry;
+}
+```
+
+- [ ] Implement `compileQuery(query)` with inclusive numeric ranges, one-or-many matching, optional-field exclusion, `attachmentMime` any-match, canonical `recordedAt` bounds, and AND semantics.
+
+```ts
+function asArray<T>(value: OneOrMany<T>): readonly T[] {
+  return Array.isArray(value) ? value : [value];
+}
+
+function assertQueryInteger(value: unknown, label: string): number {
+  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
+    throw corpusError(`${label} must be a finite integer`, { code: 'query_invalid', message: label });
+  }
+  return value;
+}
+
+function assertNumberRange(range: NumberRange, label: string): Required<NumberRange> {
+  if (range.min !== undefined) assertQueryInteger(range.min, `${label}.min`);
+  if (range.max !== undefined) assertQueryInteger(range.max, `${label}.max`);
+  const min = range.min ?? Number.NEGATIVE_INFINITY;
+  const max = range.max ?? Number.POSITIVE_INFINITY;
+  if (min > max) {
+    throw corpusError(`${label}.min must be <= max`, { code: 'query_invalid', message: label });
+  }
+  return { min, max };
+}
+
+function matchesRange(value: number, range: Required<NumberRange>): boolean {
+  return value >= range.min && value <= range.max;
+}
+
+function matchesOne<T>(value: T | undefined, expected: OneOrMany<T> | undefined): boolean {
+  if (expected === undefined) return true;
+  if (value === undefined) return false;
+  return asArray(expected).includes(value);
+}
+
+function matchesKey(value: string, expected: string | RegExp | undefined): boolean {
+  if (expected === undefined) return true;
+  if (typeof expected === 'string') return value === expected;
+  expected.lastIndex = 0;
+  const matched = expected.test(value);
+  expected.lastIndex = 0;
+  return matched;
+}
+
+function compileQuery(query: BundleQuery): (entry: BundleCorpusEntry) => boolean {
+  const ranges = {
+    durationTicks: query.durationTicks ? assertNumberRange(query.durationTicks, 'durationTicks') : undefined,
+    startTick: query.startTick ? assertNumberRange(query.startTick, 'startTick') : undefined,
+    endTick: query.endTick ? assertNumberRange(query.endTick, 'endTick') : undefined,
+    persistedEndTick: query.persistedEndTick ? assertNumberRange(query.persistedEndTick, 'persistedEndTick') : undefined,
+    materializedEndTick: query.materializedEndTick ? assertNumberRange(query.materializedEndTick, 'materializedEndTick') : undefined,
+    failedTickCount: query.failedTickCount ? assertNumberRange(query.failedTickCount, 'failedTickCount') : undefined,
+    policySeed: typeof query.policySeed === 'object' ? assertNumberRange(query.policySeed, 'policySeed') : undefined,
+  };
+  const policySeedScalar = typeof query.policySeed === 'number' ? assertQueryInteger(query.policySeed, 'policySeed') : undefined;
+  const recordedAtFrom = query.recordedAt?.from === undefined ? undefined : validateQueryIso(query.recordedAt.from, 'recordedAt.from');
+  const recordedAtTo = query.recordedAt?.to === undefined ? undefined : validateQueryIso(query.recordedAt.to, 'recordedAt.to');
+  if (recordedAtFrom && recordedAtTo && recordedAtFrom > recordedAtTo) {
+    throw corpusError('recordedAt.from must be <= recordedAt.to', { code: 'query_invalid', message: 'recordedAt' });
+  }
+
+  return (entry) => {
+    const m = entry.metadata;
+    if (!matchesKey(entry.key, query.key)) return false;
+    if (!matchesOne(m.sessionId, query.sessionId)) return false;
+    if (!matchesOne(m.sourceKind, query.sourceKind)) return false;
+    if (!matchesOne(m.sourceLabel, query.sourceLabel)) return false;
+    if (!matchesOne(m.engineVersion, query.engineVersion)) return false;
+    if (!matchesOne(m.nodeVersion, query.nodeVersion)) return false;
+    if (query.incomplete !== undefined && (m.incomplete === true) !== query.incomplete) return false;
+    if (ranges.durationTicks && !matchesRange(m.durationTicks, ranges.durationTicks)) return false;
+    if (ranges.startTick && !matchesRange(m.startTick, ranges.startTick)) return false;
+    if (ranges.endTick && !matchesRange(m.endTick, ranges.endTick)) return false;
+    if (ranges.persistedEndTick && !matchesRange(m.persistedEndTick, ranges.persistedEndTick)) return false;
+    if (ranges.materializedEndTick && !matchesRange(entry.materializedEndTick, ranges.materializedEndTick)) return false;
+    if (ranges.failedTickCount && !matchesRange(entry.failedTickCount, ranges.failedTickCount)) return false;
+    if (policySeedScalar !== undefined && m.policySeed !== policySeedScalar) return false;
+    if (ranges.policySeed && (m.policySeed === undefined || !matchesRange(m.policySeed, ranges.policySeed))) return false;
+    if (recordedAtFrom && m.recordedAt < recordedAtFrom) return false;
+    if (recordedAtTo && m.recordedAt > recordedAtTo) return false;
+    if (query.attachmentMime && !entry.attachmentMimes.some((mime) => asArray(query.attachmentMime!).includes(mime))) return false;
+    return true;
+  };
+}
+```
+
+- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
+- [ ] Expected: tests compile, then failures point to any mismatch between test names and implementation details rather than missing exports.
+
+### Step 3: Export the public surface
+
+- [ ] Modify `src/index.ts` by adding this export block after the FileSink export and before SessionRecorder:
+
+```ts
+// Bundle Corpus Index - Spec 7 (v0.8.3+): manifest-first query/index layer
+// over closed FileSink bundle directories, with lazy SessionBundle loading.
+export {
+  BundleCorpus,
+  CorpusIndexError,
+  type BundleCorpusScanDepth,
+  type BundleCorpusOptions,
+  type BundleCorpusEntry,
+  type BundleQuery,
+  type OneOrMany,
+  type NumberRange,
+  type IsoTimeRange,
+  type CorpusIndexErrorCode,
+  type CorpusIndexErrorDetails,
+  type InvalidCorpusEntry,
+} from './bundle-corpus.js';
+```
+
+- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
+- [ ] Expected: PASS for the focused corpus test file.
+
+### Step 4: Add public documentation and version bump
+
+- [ ] Modify `package.json`:
+
+```json
+{
+  "version": "0.8.3"
+}
+```
+
+- [ ] Modify `src/version.ts`:
+
+```ts
+export const ENGINE_VERSION = '0.8.3' as const;
+```
+
+- [ ] Modify README version badge from `0.8.2` to `0.8.3`. Add a Feature Overview row for "Bundle Corpus Index" and a Public Surface bullet that names `BundleCorpus`, `BundleQuery`, `BundleCorpusEntry`, and `CorpusIndexError`.
+- [ ] In `README.md`, update the existing Synthetic Playtest Harness row so it no longer says corpus indexing is "future Tier-2" work. It should say synthetic playtests produce FileSink/SessionBundle corpora that can now be indexed by `BundleCorpus` and reduced by behavioral metrics.
+- [ ] Add `docs/guides/bundle-corpus-index.md` with these sections: `# Bundle Corpus Index`, `Quickstart`, `Metadata Queries`, `Behavioral Metrics Integration`, `Replay Investigation`, `Scan Depth`, `Closed Corpus Contract`, `Incomplete Bundle Behavior`, `Sidecar Boundary`, `Embedded dataUrl Attachment Cost`, `Limitations`.
+- [ ] In `docs/guides/bundle-corpus-index.md`, include this quickstart:
+
+```ts
+import { BundleCorpus, bundleCount, runMetrics, sessionLengthStats } from 'civ-engine';
+
+const corpus = new BundleCorpus('artifacts/synth-corpus');
+const syntheticComplete = corpus.bundles({ sourceKind: 'synthetic', incomplete: false });
+const metrics = runMetrics(syntheticComplete, [bundleCount(), sessionLengthStats()]);
+console.log(metrics);
+```
+
+- [ ] Modify `docs/api-reference.md` with `## Bundle Corpus Index (v0.8.3)` and one subsection for each public type exported in Step 3, including `OneOrMany`. Include constructor, `entries`, `bundles`, `get`, `openSource`, `loadBundle`, and `[Symbol.iterator]` signatures exactly as accepted in the design. Document `materializedEndTick` as an incomplete-aware persisted-content horizon, not a replayability guarantee.
+- [ ] In `docs/guides/bundle-corpus-index.md` and `docs/changelog.md`, explicitly document that explicit `dataUrl` attachment bytes are embedded in `manifest.json` and therefore count as manifest parse cost, not as a separate content index.
+- [ ] Modify `docs/guides/behavioral-metrics.md` so the primary quickstart and corpus framing use disk-backed `BundleCorpus` with `runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()])`. Keep in-memory `SessionBundle[]` accumulation only as a small-test or advanced note, not as the main path.
+- [ ] Modify `docs/guides/session-recording.md` by adding an "Indexing FileSink bundles" subsection that says `BundleCorpus` reads manifests only during listing and that callers should build the corpus after sinks close.
+- [ ] Modify `docs/guides/ai-integration.md` by adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
+- [ ] Modify `docs/guides/concepts.md` by adding `BundleCorpus` to standalone utilities with a one-sentence manifest-first description.
+- [ ] Modify `docs/README.md` by adding a `bundle-corpus-index.md` guide link.
+- [ ] Modify `docs/architecture/ARCHITECTURE.md` by adding a Component Map row for the three BundleCorpus source files and a Boundaries paragraph that says the subsystem reads manifests, does not mutate FileSink bundle directories, and delegates full loading to FileSink.
+- [ ] Append a row to `docs/architecture/drift-log.md` for 2026-04-27: "Added manifest-first BundleCorpus subsystem" with reason "Spec 7 unblocks disk-resident corpora for metrics and bundle triage."
+- [ ] Append ADRs 28-31 from `docs/design/2026-04-27-bundle-corpus-index-design.md` to `docs/architecture/decisions.md` without deleting existing ADRs.
+- [ ] Modify `docs/design/ai-first-dev-roadmap.md` to mark Spec 7 as implemented in v0.8.3 and note that it provides disk-backed bundle listing/filtering for Spec 8. Scrub stale "Proposed", "not yet drafted", and "depends on Spec 4" language for Spec 7; Spec 4 should be described as a future consumer of the corpus picker rather than a prerequisite.
+- [ ] Add a `## 0.8.3 - 2026-04-27` entry at the top of `docs/changelog.md` with what shipped, why, validation commands, and behavior callouts for scan depth, manifest-only listing, closed corpus, incomplete-bundle `materializedEndTick`, dataUrl manifest parse cost, and sidecar bytes.
+
+### Step 5: Run focused validation and doc audit
+
+- [ ] Run: `npx vitest run tests/bundle-corpus.test.ts`
+- [ ] Expected: PASS.
+- [ ] Run: `npm run typecheck`
+- [ ] Expected: PASS with no TypeScript errors.
+- [ ] Run: `npm run lint`
+- [ ] Expected: PASS with no ESLint errors.
+- [ ] Run this doc audit command:
+
+```powershell
+$docFiles = @('README.md') + (Get-ChildItem docs -Recurse -File -Filter *.md | Select-Object -ExpandProperty FullName)
+Select-String -Path $docFiles -Pattern "BundleCorpus|BundleCorpusScanDepth|BundleCorpusOptions|BundleCorpusEntry|BundleQuery|OneOrMany|NumberRange|IsoTimeRange|CorpusIndexError|CorpusIndexErrorCode|CorpusIndexErrorDetails|InvalidCorpusEntry|bundle-corpus-index|0.8.3"
+```
+
+- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, roadmap, and changelog mentions. No stale signatures are found during manual inspection of those hits. Spec 7 is additive, so there are no removed or renamed API names to audit beyond verifying that all new public names are covered in current docs. The final committed doc state is audited again after the devlog updates in Step 8.
+
+### Step 6: Run full engine gates
+
+- [ ] Run: `npm test`
+- [ ] Expected: all tests pass and the existing pending tests remain pending.
+- [ ] Run: `npm run typecheck`
+- [ ] Expected: PASS.
+- [ ] Run: `npm run lint`
+- [ ] Expected: PASS.
+- [ ] Run: `npm run build`
+- [ ] Expected: PASS and `dist/bundle-corpus.d.ts` plus `dist/bundle-corpus.js` are emitted by the build.
+
+### Step 7: Stage the coherent change and run multi-CLI code review
+
+- [ ] Stage only the Spec 7 implementation, tests, docs, design/review artifacts, and version files:
+
+```powershell
+git add src\bundle-corpus.ts src\index.ts tests\bundle-corpus.test.ts package.json src\version.ts README.md docs\api-reference.md docs\guides\bundle-corpus-index.md docs\guides\behavioral-metrics.md docs\guides\session-recording.md docs\guides\ai-integration.md docs\guides\concepts.md docs\README.md docs\architecture\ARCHITECTURE.md docs\architecture\drift-log.md docs\architecture\decisions.md docs\design\ai-first-dev-roadmap.md docs\design\2026-04-27-bundle-corpus-index-design.md docs\design\2026-04-27-bundle-corpus-index-implementation-plan.md docs\changelog.md docs\reviews\bundle-corpus-index
+```
+
+- [ ] Create code-review iteration 1 folders:
+
+```powershell
+New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw
+git diff --staged | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\diff.md
+```
+
+- [ ] Run two independent Codex reviewers and Claude when available. Save raw outputs as `raw/codex.md`, `raw/codex-2.md`, and `raw/opus.md`. The second Codex pass follows the current handoff for this roadmap loop because Claude quota may be limited; when Claude is reachable, keep all three outputs.
+
+```powershell
+$prompt = @'
+You are a senior code reviewer for civ-engine Spec 7: Bundle Search / Corpus Index. Review the staged diff only. The intent is an additive v0.8.3 API that adds BundleCorpus over closed FileSink bundle directories. Verify correctness, design, deterministic ordering, manifest validation, query validation, FileSink/runMetrics integration, tests, public exports, docs, version bump, and AGENTS.md doc discipline. Verify docs in the diff match implementation; flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides. Do NOT modify files. Only return real findings with severity, explanation, and suggested fix. If there are no real issues, say ACCEPT.
+'@
+$jobs = @()
+$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex.md } -ArgumentList $prompt
+$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral $prompt 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\codex-2.md } -ArgumentList $prompt
+$jobs += Start-Job -ScriptBlock { param($prompt) git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $prompt --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\1\raw\opus.md } -ArgumentList $prompt
+Wait-Job -Job $jobs
+$jobs | Receive-Job
+```
+
+- [ ] Synthesize `docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md` with provider-by-provider findings, severity, accepted/nitpick verdicts, and follow-up actions.
+- [ ] Stage the generated code-review artifacts after each review iteration:
+
+```powershell
+git add docs\reviews\bundle-corpus-index-T1
+```
+
+- [ ] If a reviewer reports a real issue, fix it, rerun affected tests, rerun full gates if behavior or public docs changed, stage the updated diff plus `docs\reviews\bundle-corpus-index-T1`, and create iteration `2` with the same raw/diff/REVIEW layout. Stop when reviewers accept or only nitpick.
+- [ ] For code-review iteration `2` or later, enrich the reviewer prompt with the previous iteration's `REVIEW.md` files and `docs/learning/lessons.md`. Use this prompt header before the task-specific review text:
+
+```text
+This is Spec 7 code-review iteration <N>. Before reviewing the new staged diff, read every prior review synthesis for this task:
+- docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md through docs/reviews/bundle-corpus-index-T1/2026-04-27/<N-1>/REVIEW.md
+- docs/learning/lessons.md
+
+Verify every real finding from all previous iterations was addressed. Do not re-flag resolved findings unless the new diff reintroduced the bug. Review the new staged diff for remaining real issues only.
+```
+
+- [ ] If code-review consensus does not converge after 3 iterations, run the Opus tie-breaker and save its output before proceeding:
+
+```powershell
+New-Item -ItemType Directory -Force docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker\raw
+$tieBreakerPrompt = @'
+You are the final tie-breaker for civ-engine Spec 7 Bundle Corpus Index after 3 unresolved code-review iterations. Read the staged diff, docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/2/REVIEW.md, docs/reviews/bundle-corpus-index-T1/2026-04-27/3/REVIEW.md, and docs/learning/lessons.md. You must choose exactly one verdict:
+ACCEPT - the current staged diff is safe to commit and remaining reviewer objections are overridden.
+REJECT - the diff must not commit; include the mandatory prescriptive patch or exact file edits required.
+'@
+git diff --staged | claude -p --model opus --effort xhigh --append-system-prompt $tieBreakerPrompt --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" 2>&1 | Set-Content -Encoding UTF8 docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker\raw\opus.md
+git add docs\reviews\bundle-corpus-index-T1\2026-04-27\tie-breaker
+```
+
+- [ ] If the tie-breaker returns `REJECT`, apply the prescribed patch, rerun affected tests and full gates, stage the updated diff, and run one final verification review that references the tie-breaker output. If it returns `ACCEPT`, record the override in `docs/reviews/bundle-corpus-index-T1/2026-04-27/tie-breaker/REVIEW.md` and the detailed devlog entry.
+- [ ] If Claude is unreachable because of quota or model access, keep `raw/opus.md` with the error text and proceed with the two Codex outputs, documenting the unreachable Claude reviewer in `REVIEW.md` and the devlog.
+
+### Step 8: Write final devlog entries after code review convergence
+
+- [ ] Modify `docs/devlog/detailed/2026-04-27_2026-04-27.md` with a new timestamped entry for Spec 7. Include action, code reviewer comments by provider and theme, result, reasoning, and notes. Mention the final review iteration folder.
+- [ ] Compact `docs/devlog/summary.md` before adding the Spec 7 line because the file is already above the AGENTS.md 50-line target. Preserve newest-first status for the recent Spec 1, Spec 3, Spec 8, and Spec 7 roadmap work, remove outdated repeated process chatter, then add one newest-first line: "2026-04-27 - Shipped Spec 7 Bundle Corpus Index in v0.8.3: manifest-first FileSink corpus discovery/query plus lazy bundle iteration for runMetrics."
+- [ ] Stage the devlog files:
+
+```powershell
+git add docs\devlog\detailed\2026-04-27_2026-04-27.md docs\devlog\summary.md
+```
+
+- [ ] Re-run the full doc audit against the final doc state:
+
+```powershell
+$docFiles = @('README.md') + (Get-ChildItem docs -Recurse -File -Filter *.md | Select-Object -ExpandProperty FullName)
+Select-String -Path $docFiles -Pattern "BundleCorpus|BundleCorpusScanDepth|BundleCorpusOptions|BundleCorpusEntry|BundleQuery|OneOrMany|NumberRange|IsoTimeRange|CorpusIndexError|CorpusIndexErrorCode|CorpusIndexErrorDetails|InvalidCorpusEntry|bundle-corpus-index|0.8.3"
+```
+
+- [ ] Expected: output includes current README, API reference, new guide, guide index, architecture, roadmap, changelog, and devlog mentions. No stale signatures are found during manual inspection of those hits.
+
+- [ ] Run: `git diff --cached --stat`
+- [ ] Expected: staged files are only the coherent Spec 7 implementation, tests, docs, review artifacts, and version bump.
+
+### Step 9: Final verification and direct-to-main commit
+
+- [ ] Run final gates after the devlog update:
+
+```powershell
+npm test
+npm run typecheck
+npm run lint
+npm run build
+```
+
+- [ ] Expected: all four commands pass.
+- [ ] Commit directly on `main`:
+
+```powershell
+git commit -m "feat: add bundle corpus index"
+```
+
+- [ ] Expected: one v0.8.3 commit containing code, tests, docs, ADRs, roadmap status, changelog, devlog, review artifacts, and version bump.
+
+## Acceptance Checklist
+
+- [ ] Public exports include `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
+- [ ] Construction discovers root, child, and nested FileSink bundle directories according to `scanDepth`; root bundle key is `'.'`; descendant keys use `/`.
+- [ ] Discovery skips symlinked directories and stops descending inside bundle directories.
+- [ ] `entries(query?)` reads manifests only and returns deterministic frozen entries in `recordedAt`, `sessionId`, `key` order.
+- [ ] `bundles(query?)` and `[Symbol.iterator]` lazily load full bundles through FileSink.
+- [ ] `get` returns `undefined` for missing keys; `openSource` and `loadBundle` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
+- [ ] Query filters cover exact, one-or-many, numeric range, ISO range, optional field, failure count, materialized end tick, key RegExp, and attachment MIME any-match semantics.
+- [ ] Invalid query and invalid manifest errors use `CorpusIndexError` with JSON-shaped `details.code`.
+- [ ] `skipInvalid` records invalid manifests and omits them from entries.
+- [ ] `runMetrics(corpus.bundles(query), metrics)` is covered by tests.
+- [ ] Docs, ADRs, roadmap, changelog, devlog, API reference, README badge, and version bump ship in the same commit.
+- [ ] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass before commit.
+- [ ] Multi-CLI code review artifacts exist and converge under `docs/reviews/bundle-corpus-index-T1/2026-04-27/`.
diff --git a/docs/design/ai-first-dev-roadmap.md b/docs/design/ai-first-dev-roadmap.md
index a8e1850..4c63539 100644
--- a/docs/design/ai-first-dev-roadmap.md
+++ b/docs/design/ai-first-dev-roadmap.md
@@ -12,7 +12,7 @@ Without these, "AI-first" is aspirational. They are the irreducible substrate fo
 
 ### Spec 1: Session Recording & Replay (engine primitives)
 
-Status: **Drafted 2026-04-26.** See `2026-04-26-session-recording-and-replay-design.md`.
+Status: **Implemented** (v0.7.7-pre -> v0.7.19). See `2026-04-26-session-recording-and-replay-design.md`.
 
 What it delivers: deterministic capture of any World run as a portable `SessionBundle`; replay engine that opens a paused World at any tick; marker API for human and programmatic annotations; sink interface for memory and disk persistence; unification with `ScenarioRunner` so test runs and live captures share the same bundle format and replayer.
 
@@ -20,9 +20,9 @@ What it unlocks: every other spec in this roadmap.
 
 ### Spec 3: Synthetic Playtest Harness
 
-Status: **Proposed.**
+Status: **Implemented** (v0.7.20 + v0.8.0 + v0.8.1). See `2026-04-27-synthetic-playtest-harness-design.md` and `2026-04-27-synthetic-playtest-implementation-plan.md`.
 
-What it delivers: a harness that constructs a `World`, attaches a `SessionRecorder`, drives `world.submit()` from a pluggable policy (random / scripted / LLM-driven / heuristic agents), runs for N ticks, and saves the bundle. Trivially parallelizable across cores or machines. Produces a corpus of bundles per commit.
+What it delivers: `runSynthPlaytest` drives a supplied `World` with pluggable synchronous policies, records through `SessionRecorder`, and returns a replayable `SessionBundle`. Built-ins cover no-op, random catalog, and scripted policies; LLM-driven policies remain future Spec 9 work.
 
 What it unlocks: the actual feedback loop. Without synthetic playtest, recording just makes human bug reports nicer; with it, every commit gets autonomous exploration. Agents review the corpus and self-file regressions before any human plays the game.
 
@@ -30,9 +30,9 @@ Why it depends on Spec 1: synthetic playtest is just "policy → submit() → Se
 
 ### Spec 8: Behavioral Metrics over Corpus
 
-Status: **Proposed.**
+Status: **Implemented** (v0.8.2). See `2026-04-27-behavioral-metrics-design.md` and `2026-04-27-behavioral-metrics-implementation-plan.md`.
 
-What it delivers: a metrics layer that ingests bundles from the synthetic playtest corpus, computes design-relevant statistics (median session length, decision points per minute, resource Gini, time-to-first-conflict, dominant strategy distribution, etc.), and tracks these across commits. Regression detection: "the median session length dropped 30% after this commit" gets surfaced automatically.
+What it delivers: `runMetrics(bundles, metrics)` reduces any `Iterable<SessionBundle>` with engine-generic built-ins (bundle count, session length, command/event rates, failure rates, command validation acceptance, execution failure) plus user-defined metrics, and `compareMetricsResults` computes deltas across commits. Game-semantic metrics such as resource Gini or time-to-first-conflict remain user-defined because the engine does not own game event contracts.
 
 What it unlocks: a meaningful definition of "regression" for emergent behavior, which unit tests can't capture. Designers and agents share a common quantitative vocabulary for "is the game still doing what we want."
 
@@ -56,13 +56,13 @@ Why it depends on Spec 3: the playtester is just a specific class of policy plug
 
 ### Spec 7: Bundle Search / Corpus Index
 
-Status: **Proposed.**
+Status: **Implemented** (v0.8.3). See `2026-04-27-bundle-corpus-index-design.md` and `2026-04-27-bundle-corpus-index-implementation-plan.md`.
 
-What it delivers: an index over the bundle corpus with structured query: "show me all sessions where pathfinding flagged stuck units in the first 1000 ticks," "find sessions with high decision-point variance," "find sessions where the player's resource balance crashed below threshold X." Bundle metadata is indexed; bundle content is queryable on demand via the replayer.
+What it delivers: `BundleCorpus` indexes closed `FileSink` bundle directories by `manifest.json`, provides metadata-only listing/filtering over manifest-derived fields, exposes deterministic entry order, and lazily opens matching bundles through `FileSink` for `SessionReplayer` or `runMetrics`. Content-derived command/event/marker predicates are deferred to a future summary index.
 
 What it unlocks: the corpus stops being a folder of files and becomes a query surface for both agents and humans.
 
-Why it depends on Specs 3 and 4: the corpus needs to exist (3) and be navigable (4) before indexing it earns its keep.
+Why it depends on Specs 1, 3, and 8: FileSink from Spec 1 defines the disk format, Spec 3 creates synthetic corpora, and Spec 8 already accepts `Iterable<SessionBundle>` so the corpus can feed disk-backed metrics immediately. Spec 4 becomes a future consumer rather than a prerequisite.
 
 ### Anomaly detection over the corpus (continuous, no spec)
 
@@ -146,9 +146,9 @@ Why it's deferred: it's a meaty engine-wide behavioral change with its own desig
 1. Spec 1 (recording & replay) — substrate for everything.
 2. Spec 3 (synthetic playtest) — turns recording from "improve human bug reports" into "infinite autonomous bug discovery." Highest leverage.
 3. Spec 8 (behavioral metrics) — pairs with Spec 3 to define regressions for emergent behavior.
-4. Spec 2 (game-side annotation UI) — humans plug into the same system; game-specific work that can ship in parallel with Spec 4.
-5. Spec 4 (standalone viewer) — productivity multiplier for both agents and humans.
-6. Spec 7 (corpus index) — once corpus is large enough that browsing it linearly hurts.
+4. Spec 7 (corpus index) — disk-backed corpora become queryable and feed Spec 8 without in-memory arrays.
+5. Spec 2 (game-side annotation UI) — humans plug into the same system; game-specific work that can ship in parallel with Spec 4.
+6. Spec 4 (standalone viewer) — productivity multiplier for both agents and humans.
 7. Spec 9 (AI playtester) — once Specs 3 and 8 are mature enough to drive qualitative feedback usefully.
 8. Spec 5 (counterfactual) — once concrete counterfactual queries emerge from agent workflows.
 9. Spec 6 (strict-mode) — independent, can ship at any point. Schedule based on determinism-bug pain.
@@ -163,7 +163,7 @@ Why it's deferred: it's a meaty engine-wide behavioral change with its own desig
 | 4    | Standalone Bundle Viewer             | Proposed   | not yet drafted                                           |
 | 5    | Counterfactual Replay / Fork         | Proposed   | not yet drafted                                           |
 | 6    | Strict-Mode Determinism Enforcement  | Proposed   | not yet drafted                                           |
-| 7    | Bundle Search / Corpus Index         | Proposed   | not yet drafted                                           |
+| 7    | Bundle Search / Corpus Index         | **Implemented** (v0.8.3) | `2026-04-27-bundle-corpus-index-design.md` (v4 + plan-review correction) + `2026-04-27-bundle-corpus-index-implementation-plan.md` (v6) |
 | 8    | Behavioral Metrics over Corpus       | **Implemented** (v0.8.2) | `2026-04-27-behavioral-metrics-design.md` (v4) + `2026-04-27-behavioral-metrics-implementation-plan.md` (v4) |
 | 9    | AI Playtester Agent                  | Proposed   | not yet drafted                                           |
 
diff --git a/docs/devlog/summary.md b/docs/devlog/summary.md
index 9d68133..832dc26 100644
--- a/docs/devlog/summary.md
+++ b/docs/devlog/summary.md
@@ -1,89 +1,18 @@
 # Devlog Summary
 
-- 2026-04-27: Spec 8 — Behavioral Metrics over Corpus (v0.8.2) — `runMetrics(bundles, metrics)` pure-function reducer over `Iterable<SessionBundle>` + 11 engine-generic built-in metric factories + accumulator-style `Metric` contract + `compareMetricsResults` thin delta helper. 5 ADRs (23-27). Single-commit ship per AGENTS.md doc-with-code rule. 44 new tests; 842 passed + 2 todo. **Tier-2 of AI-first roadmap implemented; Spec 1+3+8 complete.** Devlog rolled over to `2026-04-27_2026-04-27.md` (active file hit 841 lines).
-- 2026-04-27: Spec 3 T3 (v0.8.1) — Determinism integration tests (selfCheck round-trip, production-determinism dual-run, sub-RNG positive/negative, poisoned-bundle replay throws, pre-step abort vacuous, bundle→script regression) + structural docs (ARCHITECTURE Component Map, drift-log, roadmap status → Implemented for Spec 3 + Spec 1, ai-integration Tier-1 reference). 7 new tests; 798 passed + 2 todo. **Spec 3 implementation complete (T1+T2+T3); awaiting merge authorization.**
-- 2026-04-27: Spec 3 T2 (v0.8.0, **b-bump**) — `runSynthPlaytest` harness + SessionMetadata.sourceKind union widened to add 'synthetic' (breaking for assertNever consumers, per ADR 20). Sub-RNG init via `Math.floor(world.random() * 0x1_0000_0000)` pre-connect; `terminalSnapshot:true` hardcoded; 5-value stopReason union with separate connect-time-failure (re-throw) and mid-tick-failure ('sinkError') paths. ADRs 20, 20a, 21, 22. 17 new harness tests; 789 passed + 2 todo.
-- 2026-04-27: Spec 3 T1 (v0.7.20) — Synthetic Playtest Policy interface + 3 built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`). 4-generic shape matches `World<...>`; sub-RNG via `PolicyContext.random()` (ADR 19). `runSynthPlaytest` harness ships in T2 (v0.8.0). 13 new tests; 772 passed + 2 todo.
-- 2026-04-27: Session-recording followup 4 (v0.7.19) — Clause-paired determinism tests for §11.1 clauses 1, 2, 7 (clean+violation each). Clauses 4, 6 added as `it.todo` (hard fixtures). 6/8 testable clauses covered now (was 3/8). 759 tests + 2 todo.
-- 2026-04-27: Session-recording followups 2+3 (v0.7.18) — terminated-state guard on user-facing recorder methods (Opus L2; +1 regression test); World.applySnapshot extracts `_replaceStateFrom` helper for auditability (Opus L4); api-reference T-prefix section headers renamed to feature labels (Opus L3).
-- 2026-04-27: Session-recording followup 1 (v0.7.17) — `SessionReplayer` pre-groups bundle.commands/.ticks/.executions into per-tick maps at construction; O(N·T) → O(1) per-tick lookup in `selfCheck`/`openAt`. Closes iter-2 M1.
-- 2026-04-27: Session-recording iter-1 code-review fixes (v0.7.16). 2 Critical (applySnapshot component preservation + world.grid stale-grid; FileSink cross-process reload) + 4 High (attach default for FileSink; addMarker cell+attachment validation; memory aliasing in capture paths; multi-segment selfCheck submissionSequence false-positive) + 1 Medium (schemaVersion check) + 4 Low/cleanup. 751 tests still pass.
-- 2026-04-27: Session-recording T9 (v0.7.15) — Structural docs: new `docs/guides/session-recording.md` canonical guide; ARCHITECTURE Component Map + Boundaries paragraph; decisions.md ADRs 13–16; drift-log entry; concepts.md/ai-integration.md/debugging.md/getting-started.md/building-a-game.md/scenario-runner.md updates; README + docs/README index. Doc-only; 751 tests unchanged. Implementation phase complete; branch `agent/session-recording` (T0→T9, 9 commits, v0.7.7→v0.7.15) awaits merge authorization.
-- 2026-04-27: Session-recording T8 (v0.7.14) — Integration tests (`tests/scenario-replay-integration.test.ts`, 3 tests) demonstrating scenarioResult→bundle→selfCheck round-trip with extracted setup pattern. Determinism contract paired tests (`tests/determinism-contract.test.ts`, 6 tests) for §11.1 clauses 3/5/8. 751 total tests.
-- 2026-04-27: Session-recording T7 (v0.7.13) — `scenarioResultToBundle()` adapter translating `ScenarioResult` to `SessionBundle` (sourceKind:scenario; startTick from history.initialSnapshot.tick; assertion markers per check outcome; throws if no initial snapshot). 9 new tests, 742 total. Substrate ↔ scenario loop closed.
-- 2026-04-27: Session-recording T6 (v0.7.12) — `SessionReplayer` with `openAt` + `selfCheck` (3-stream: state/events/executions), `deepEqualWithPath` helper, marker query helpers, `validateMarkers`, range checks, replay-across-failure refusal, no-payload short-circuit, cross-`b`/cross-`a` engine version refusal, cross-Node-major warning. 22 new tests, 733 total.
-- 2026-04-27: Session-recording T5 (v0.7.11) — `SessionRecorder` class with full §7 lifecycle (connect/disconnect/addMarker/attach/takeSnapshot/toBundle). Single `submitWithResult` wrap; mutex via `__payloadCapturingRecorder` slot; periodic + terminal snapshots; live vs retroactive marker validation. 20 new tests, 711 total.
-- 2026-04-27: Session-recording T4 (v0.7.10) — `WorldHistoryRecorder.captureCommandPayloads` opt-in (additive `recordedCommands?` field, mutex via `__payloadCapturingRecorder` slot, single submitWithResult wrap, clear() resets) + `ScenarioConfig.history.captureCommandPayloads` plumbing. 9 new tests, 691 total.
-- 2026-04-27: Session-recording T3 (v0.7.9) — FileSink (disk-backed SessionSink & SessionSource) in `src/session-file-sink.ts`. Manifest cadence (open/per-snapshot/close) atomic via .tmp.json rename. Added @types/node devDep. 15 new tests, 682 total.
-- 2026-04-27: Session-recording T2 (v0.7.8) — SessionSink/SessionSource interfaces + MemorySink in `src/session-sink.ts`. 15 new tests, 667 total. Sync sinks per spec §8.
-- 2026-04-27: Session-recording T1 (v0.7.7) — bundle/marker/error type definitions in `src/session-bundle.ts` + `src/session-errors.ts`; types only, no runtime behavior. 16 new tests, 652 total. Foundation for SessionRecorder / SessionReplayer.
-- 2026-04-27: Session-recording T0 setup (v0.7.7-pre, no version bump). Extracted `cloneJsonValue` to `src/json.ts`; added `src/version.ts` (`ENGINE_VERSION`), `src/session-internals.ts` (`World.__payloadCapturingRecorder` slot), `World.applySnapshot(snapshot)` instance method (added to `FORBIDDEN_PRECONDITION_METHODS`). 6 new tests; 636 total pass. Foundation for T1–T9 (see `docs/design/2026-04-27-session-recording-implementation-plan.md`).
+- 2026-04-27: Spec 7 - Bundle Search / Corpus Index (v0.8.3) - `BundleCorpus` indexes closed FileSink bundle directories, exposes manifest-only `entries(query?)`, lazy `bundles(query?)`, deterministic ordering, metadata/failure/attachment summaries, and `CorpusIndexError` diagnostics. Adds ADRs 28-31 and the bundle corpus guide. 16 new tests; 861 passed + 2 todo before code review.
+- 2026-04-27: Spec 8 - Behavioral Metrics over Corpus (v0.8.2) - `runMetrics(bundles, metrics)` reducer over `Iterable<SessionBundle>`, 11 engine-generic metrics, accumulator-style `Metric`, and `compareMetricsResults`. ADRs 23-27. 44 new tests; 842 passed + 2 todo at ship.
+- 2026-04-27: Spec 3 T3 (v0.8.1) - Determinism integration tests and structural docs completed the synthetic playtest chain. 7 new tests; 798 passed + 2 todo at ship.
+- 2026-04-27: Spec 3 T2 (v0.8.0, breaking) - `runSynthPlaytest` harness plus `SessionMetadata.sourceKind: 'synthetic'`, policy sub-RNG, stopReason taxonomy, and FileSink/SessionRecorder integration. ADRs 20, 20a, 21, 22.
+- 2026-04-27: Spec 3 T1 (v0.7.20) - Synthetic playtest policy interface and built-in `noopPolicy`, `randomPolicy`, `scriptedPolicy`. ADRs 17-19.
+- 2026-04-27: Session-recording followups (v0.7.16-v0.7.19) - Code-review fixes, pre-grouped replay streams, terminated-state guards, applySnapshot audit helper, and determinism-clause tests. 759 tests + 2 todo at v0.7.19.
+- 2026-04-27: Session Recording & Replay (v0.7.7-pre -> v0.7.15) - `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `MemorySink`, `FileSink`, marker validation, `scenarioResultToBundle()`, `World.applySnapshot()`, and docs/ADRs 13-16. 121 new tests across the chain.
+- 2026-04-26: Multi-CLI full-codebase review iter-7 to iter-9 (v0.7.5-v0.7.6) - Closed deserialize, EventBus, ClientAdapter, API/doc, noise, and semantic-diff findings; iter-9 converged clean with Codex+Opus.
+- 2026-04-26: CommandTransaction and Layer review hardening (v0.6.0-v0.7.4) - Read-only transaction preconditions, generic threading, buffer-time emit validation, Layer strip-at-write/primitive fast path, denylist hardening, clone-on-read, frozen `world.grid`, and doc audit.
+- 2026-04-25: Micropolis-inspired features (v0.5.9-v0.5.11) - Per-system cadence, `Layer<T>`, and `CommandTransaction` shipped with multi-CLI review and focused regression coverage.
+- 2026-04-25: Iter-2 full-review fixes (v0.4.1-v0.5.8) - Fail-fast tick semantics, snapshot v5, removal of in-place mutation auto-detection, defensive-copy/documentation cleanup, and convergence after 6 review iterations.
+- 2026-04-20 to 2026-04-23: Engine feedback features - OccupancyBinding hardening, cache-key fixes, reactive BT nodes, `clearRunningState`, semantic diff mode, and civ-sim-web integration friction fixes.
+- 2026-04-12: Engine ergonomics batch - Typed component registry, loose system typing, world-level state, spatial helpers, system ordering constraints, tags, and metadata.
+- 2026-04-04 to 2026-04-06: Foundation - TypeScript/Vitest/ESLint scaffold; ECS core; World, commands/events/resources; serialization/diffs; map generation; pathfinding; speed control; ClientAdapter; docs and tutorials.
 
-> Always read this file at session start to understand current project state.
-
-## Summary
-
-- 2026-04-04: Task 1 complete — TypeScript project scaffolded with Vitest, ESLint; toolchain verified passing.
-- 2026-04-04: Task 2 complete — EntityManager implemented with free-list recycling and generation counters; 7 tests pass, lint clean.
-- 2026-04-04: Task 3 complete — ComponentStore implemented with sparse array storage, generation tracking, and size tracking; 10 tests pass, lint clean.
-- 2026-04-04: Task 4 complete — SpatialGrid implemented with flat array, lazy Sets, bounds checking, and 4-directional neighbor queries; 10 tests pass, lint clean.
-- 2026-04-04: Task 5 complete — GameLoop implemented with fixed-timestep, step() for deterministic testing, start()/stop() for real-time, spiral-of-death prevention; 4 tests pass, lint clean.
-- 2026-04-04: Task 6 complete — World implemented as integration layer tying EntityManager, ComponentStore registry, SpatialGrid, and GameLoop; spatial index sync before each tick; 14 tests pass, all 45 total pass, lint clean.
-- 2026-04-04: Task 7 complete — ARCHITECTURE.md created with component map, data flow, boundaries, decisions, drift log.
-- 2026-04-04: README rewritten with full usage guide — quick start, API reference, code examples, project structure.
-- 2026-04-05: EventBus implemented with emit/on/off/getEvents/clear; generic constraint fixed for strict-mode tsc; 4 tests pass, 49 total pass, lint and typecheck clean.
-- 2026-04-05: EventBus remaining unit tests added (off, clear, getEvents); 9 tests pass (54 total), lint clean.
-- 2026-04-05: World integration complete — World and System made generic with TEventMap; EventBus owned as private field; emit/on/off/getEvents methods added; events cleared at start of each tick; 5 new tests, 59 total pass, lint and typecheck clean.
-- 2026-04-05: CommandQueue implemented — typed push/drain buffer with pending getter; TDD (tests-first); 4 new tests, 63 total pass, lint clean.
-- 2026-04-05: World submit/registerValidator/registerHandler added — CommandQueue owned as private field; multi-validator support with short-circuit; duplicate handler guard; TDD; 4 new tests, 67 total pass, lint and typecheck clean.
-- 2026-04-05: World processCommands wired into executeTick — drains CommandQueue and dispatches to handlers; ordered before syncSpatialIndex; error thrown on missing handler; TDD; 4 new tests, 71 total pass, lint and typecheck clean.
-- 2026-04-05: Tick-boundary and spatial sync ordering tests added — 2 new tests, 73 total pass.
-- 2026-04-05: Architecture and roadmap docs updated for input command layer — feature complete.
-- 2026-04-05: State serialization complete — WorldSnapshot type, World.serialize/deserialize, EntityManager getState/fromState, ComponentStore entries/fromEntries, GameLoop setTick; JSON round-trip tested; 13 new tests, 86 total pass, lint and typecheck clean.
-- 2026-04-05: State diff output complete — TickDiff type, dirty tracking on ComponentStore/EntityManager, World.getDiff/onDiff/offDiff; 16 new tests, 102 total pass, lint and typecheck clean.
-- 2026-04-05: Resource system complete — ResourceStore with pools, rates, transfers; World integration with 13 proxy methods; TickDiff resources field; 32 new tests, 134 total pass, lint and typecheck clean.
-- 2026-04-06: Docs updated — clarified AI-native engine scope; removed game-specific planned features from roadmap; added map infrastructure design spec.
-- 2026-04-06: Map infrastructure complete — noise.ts (simplex + octave), cellular.ts (CellGrid + stepCellGrid), map-gen.ts (MapGenerator interface + createTileGrid); all standalone utilities, no World changes; 20 new tests, 154 total pass, lint and typecheck clean.
-- 2026-04-06: Configurability audit — made positionKey, maxTicksPerFrame, neighbor offsets, cellular offsets, createTileGrid positionKey all configurable with backward-compatible defaults; 10 new tests, 164 total pass.
-- 2026-04-06: Pathfinding module complete — generic A* findPath<T> with internal min-heap, PathConfig/PathResult types, maxCost/maxIterations/trackExplored options; standalone utility with no World dependency; 11 new tests, 175 total pass, lint and typecheck clean.
-- 2026-04-06: Pathfinding complex scenario tests added — 8 tests: diamond graph, 100x100 grid, winding maze, equal-cost paths, directed edges, inadmissible heuristic, diagonal costs, node revisit; 19 total pathfinding tests pass, lint and typecheck clean.
-- 2026-04-06: Pathfinding docs update — ARCHITECTURE.md and ROADMAP.md updated; 183 total tests pass; pathfinding feature complete.
-- 2026-04-06: GameLoop speed control — setSpeed/getSpeed, pause/resume, isPaused added; NaN/Infinity guard; 12 new tests; 16 total GameLoop tests pass.
-- 2026-04-06: World speed control proxies — 5 proxy methods (setSpeed/getSpeed/pause/resume/isPaused); 3 new tests; 34 total World tests pass.
-- 2026-04-06: Simulation speed control docs — ARCHITECTURE.md and ROADMAP.md updated; "Turn / phase management" removed from roadmap; 198 total tests pass; feature complete.
-- 2026-04-06: Tutorials and README rewrite — getting-started guide, complete colony survival game tutorial, rewritten README with API reference, CLAUDE.md doc maintenance rules.
-- 2026-04-06: Client protocol complete — ClientAdapter with typed ServerMessage/ClientMessage/GameEvent, connect/disconnect/handleMessage; 9 new tests, 207 total pass; docs updated; all roadmap items now built.
-- 2026-04-06: Comprehensive documentation — full API reference, 10 subsystem guides (concepts, entities, systems, spatial grid, commands/events, resources, serialization/diffs, map gen, pathfinding, behavior trees, client protocol); README updated with doc links and missing API entries.
-- 2026-04-12: Engine feedback features — 6 ergonomics improvements from civ-sim-web audit: loose system typing, typed component registry, world-level state store, spatial query helpers (queryInRadius, findNearest), system ordering constraints (before/after), entity tags and metadata with reverse-index; 54 new tests, 377 total pass; snapshot v4; changelog v0.3.0.
-- 2026-04-20: Occupancy follow-up closed - OccupancyBinding now owns blocker metadata and destroy-time cleanup, rejects crowding conflicts for block()/occupy()/reserve(), treats fully crowded cells as blocked for passability, and ships measurable occupancy benchmark counters. Default grid-path cache keys now include movingEntity. Validation: 394 tests, typecheck, lint, build, and RTS benchmark all pass.
-- 2026-04-23: Engine feedback (civ-sim-web 2026-04-19) — reactive BT nodes + clearRunningState helper + per-component semantic diff mode; additive, backwards-compatible; 16 new tests, 415 total pass.
-- 2026-04-25: Multi-CLI full-codebase review (Codex/Gemini/Opus 1M) → 25 findings → fixed in 11 commits with 2 review iterations. Fail-fast tick semantics with `World.recover()`; snapshot v5 round-trips runtime config + per-component options; `ComponentStore.detectInPlaceMutations` opt-out; reactive-BT preempt cleanup; deep-clone defensive copies on `getDiff`/`getEvents`; failed ticks consume distinct tick numbers; setMeta uniqueness throws; `TState` generic on World; 31 new tests, 446 total pass.
-- 2026-04-25: Iter-2 multi-CLI review hunt → 5 iter-1 regressions, 2 new Critical, 3 new High, 5 new Medium, 7 new Low. Batch 1 (v0.4.1) fixes shipped: `findNearest` diagonal-corner correctness (R2) + `serialize`/`deserialize` snapshot isolation via `structuredClone` (C_NEW1). 450 tests pass.
-- 2026-04-25: Iter-2 batch 2 (v0.5.0, breaking) — removed `ComponentStoreOptions.detectInPlaceMutations`, `WorldConfig.detectInPlacePositionMutations`, `World.markPositionDirty`, the per-tick spatial sync scan, and related metrics. All component/position writes must go through `setComponent`/`setPosition`. `world.grid` is now a runtime-immutable read-only delegate. `EventBus.emit` rejects non-JSON payloads. 448 tests pass.
-- 2026-04-25: Iter-2 batch 3 (v0.5.1) — listener exceptions no longer bypass the fail-fast contract: `commandExecutionListener`/`commandResultListener`/`tickFailureListener` invocations are isolated in try/catch with `console.error`. `submit()`/`serialize()` warn once per poison cycle. 452 tests pass.
-- 2026-04-25: Iter-2 batch 4 (v0.5.2) — `TComponents` and `TState` generics now thread through `System`, `SystemRegistration`, `registerSystem`/`registerValidator`/`registerHandler`/`onDestroy`, and `deserialize` so typed component/state access works inside system callbacks. Type-only refactor. 453 tests pass.
-- 2026-04-25: Iter-2 batch 5 (v0.5.3) — medium + polish: setMeta rejects non-finite numbers; findPath skips overcost neighbors; deserialize rejects tags/meta for dead entities; EntityManager.fromState validates alive/generations entries; getLastTickFailure caches the clone; structuredClone replaces JSON.parse(JSON.stringify); registerComponent clones options. Docs: FIFO transfer priority + entity-less static blocks. 459 tests pass.
-- 2026-04-25: Iter-2 fix-review iteration 1 (v0.5.4) — Codex/Gemini/Opus diff review caught several issues; all addressed. `world.grid.getAt()` now copies the cell Set; `getLastTickFailure()` cache reverted (per-call clone); TickDiff/event clones revert to JSON for V8 perf; `serialize({ inspectPoisoned: true })` added for engine-internal debug tooling; ARCHITECTURE/api-reference doc drift cleaned; debug client + RTS benchmark updated for the v0.5.0 metrics shape. 465 tests pass.
-- 2026-04-25: Iter-2 fix-review iteration 2 (v0.5.5) — Gemini CLEAN; Codex/Opus flagged remaining doc drift + missing regression tests. cloneTickFailure unified to JSON (the prior structuredClone "Error preservation" rationale was incorrect — Error is normalized to a plain object before clone time); ARCHITECTURE.md Boundaries section + debugging.md tables fully scrubbed; 2 new regression tests for the v0.5.4 fixes. 467 tests pass.
-- 2026-04-25: Iter-2 fix-review iteration 3 (v0.5.6) — Gemini CLEAN, Opus CLEAN, Codex flagged additional doc drift in guides + api-reference (System/SystemRegistration/callback signatures still 2-generic in docs). All addressed: public-api-and-invariants.md corrected on in-place mutation semantics; commands-and-events.md tick-timing diagram updated; api-reference.md System/SystemRegistration/LooseSystem types and registerValidator/registerHandler/onDestroy callback signatures all updated to four-generic form. 467 tests pass.
-- 2026-04-25: Iter-2 fix-review iteration 4 (v0.5.7) — Gemini CLEAN; Codex and Opus both flagged residual canonical-guide drift across 7 files (concepts, spatial-grid, systems-and-simulation, getting-started, entities-and-components, serialization-and-diffs, debugging). All addressed in a single doc-cleanup pass; tick-lifecycle diagrams + write-path semantics across all canonical guides now match v0.5.0+ runtime. 467 tests pass; doc-only change.
-- 2026-04-25: Iter-2 fix-review iteration 5 (v0.5.8) — Codex CLEAN, Gemini CLEAN, Opus flagged one remaining stale "accepts versions 1–4" wording in `serialization-and-diffs.md:74` (internally inconsistent with the same file's lines 116/120 saying 1–5). One-line fix.
-- 2026-04-25: Iter-2 fix-review iteration 6 — **all three reviewers CLEAN**. Chain converged after 6 review iterations across 10 commits (v0.4.1 → v0.5.8). Branch `agent/iter2-fix-review-1` ready to merge. 467 tests pass.
-- 2026-04-25: MicropolisCore study → 3 ideas extracted. Task 1 shipped (v0.5.9): per-system `interval` + `intervalOffset` fields on SystemRegistration / LooseSystemRegistration; schedule matches legacy `w.tick % N === 0` pattern by direct substitution. Iter-1 multi-CLI review (Codex/Claude; Gemini quota-exhausted) caught 2 critical correctness issues (off-by-one schedule + safe-integer hole) and 1 API issue (`phaseOffset` collided with `phase` → renamed to `intervalOffset`); all addressed in same commit. 24 new tests (incl. legacy-parity, failed-tick interaction, 3-way stagger, MAX_SAFE_INTEGER, non-number guards), 491 total pass.
-- 2026-04-25: Task 2 shipped (v0.5.10): `Layer<T>` standalone overlay-map utility for downsampled field data (pollution / influence / weather etc.). World-coord auto-bucketing via `getAt`/`setAt`, cell-coord access via `getCell`/`setCell`, sparse storage with default-value semantics, JSON-serializable round-trip, defensive `structuredClone` on every read AND write boundary. Sibling of `OccupancyGrid` / `VisibilityMap`. Inspired by MicropolisCore's `Map<DATA, BLKSIZE>` template (`map_type.h:111`). Iter-1 multi-CLI review (Codex/Claude) caught defensive-copy holes for object-T (mutating an unset-cell read poisoned the default for every other unset cell), missing safe-integer validation, weak `fromState` shape checks, and inconsistent error types — all addressed in same commit. 49 new tests (incl. 7 explicit defensive-copy assertions, safe-int rejections, and `fromState` shape rejections), 540 total pass.
-- 2026-04-25: Task 3 shipped (v0.5.11): `CommandTransaction` — atomic propose-validate-commit-or-abort builder over `World` via `world.transaction()`. Buffers component/position/resource mutations + events + `require(predicate)` preconditions; on `commit()` either applies everything (preconditions passed) or applies nothing (any precondition failed). Single `TickDiff` capture when committed inside a tick. Inspired by MicropolisCore's `ToolEffects` (`tool.h:171–305`). v1 surface: components, position, events, resource add/remove. Iter-1 multi-CLI review (Codex/Claude) caught a HIGH bug — mid-commit throw left `status='pending'`, so retry would double-apply non-idempotent ops like `removeResource`; fixed via `try/finally` in `commit()`. Also caught: ARCHITECTURE doc drift on commit-after-abort semantics, aliasing window for buffered values, type-safety hole in `world.transaction<T>()` generic override (removed), v1 limitations list undercount. 29 new tests (incl. throw-then-no-retry-doubles, aliasing-window-pin), 569 total pass.
-- 2026-04-26: Documentation drift audit (no code changes). Fixed 6 issues: broken `[Architecture]` link in docs/README.md, broken devlog links in docs/README.md, broken API-reference link in getting-started.md, incomplete "Included" table + TickDiff structure + "Diffs capture" list in serialization-and-diffs.md, stale snapshot-version paragraph in public-api-and-invariants.md, and missing `Command Transaction` + `Layer` entries in api-reference.md Table of Contents.
-- 2026-04-26: Multi-CLI full-review iter-1 batch 1 (v0.6.0, breaking) — `CommandTransaction` overhaul. Closes 1 Critical + 2 High + 1 Medium + 2 Low: read-only precondition façade (`ReadOnlyTransactionWorld`) prevents side-effecting predicates from violating atomicity (C1); typed-generic threading restored on `CommandTransaction<TEventMap, TCommandMap, TComponents, TState>` (H1, three-reviewer consensus); `commit()` now warns once on poisoned world (H3); `emit()` validates JSON-compat at buffer time (M1); aborted-vs-committed terminal status separated (L2); `as unknown as` cast removed (L6). 576 tests pass.
-- 2026-04-26: Multi-CLI full-review iter-1 batch 2 (v0.6.1) — `Layer<T>` overhaul (non-breaking). Closes 2 High + 2 Medium + 1 Low: strip-at-write sparsity with `cells.delete` on default-equal writes (H2); primitive fast-path skips `structuredClone` for `Layer<number|boolean|string|null>` (H4); `forEachReadOnly` adds zero-allocation traversal; new `clear`/`clearAt` (L5); `fromState` validates each cell value once not twice (M4); `clone` iterates sparse map directly (M5). 587 tests pass.
-- 2026-04-26: Multi-CLI full-review iter-1 batch 3 (v0.6.2) — `World.deserialize` snapshot-tick validation (M2). Rejects `NaN`/negative/fractional/`Infinity` ticks at load time before they corrupt diff numbering, command sequencing, or interval scheduling. 591 tests pass.
-- 2026-04-26: Multi-CLI full-review iter-1 batch 4 (v0.6.3) — polish. Closes 3 Low: `World.runTick` tick-capture asymmetry hoisted (L1); resources guide `setTransfer` dead reference fixed (L4); `GameLoop.advance` throws `RangeError` on `Number.MAX_SAFE_INTEGER` saturation instead of silent corruption (L7). 592 tests pass.
-- 2026-04-26: Multi-CLI full-review iter-1 batch 5 (v0.6.4) — M3 partial. Extracted ~265 LOC of standalone helper functions from `src/world.ts` into `src/world-internal.ts`. `world.ts` now 2232 LOC (was 2481); deeper class-method split deferred to follow-up. 592 tests pass.
-- 2026-04-26: Iter-2 review fix-up (v0.7.0, breaking) — closes 1 iter-1 regression (R1: C1 was incomplete, missing 9+ real mutating methods including `random()` which broke determinism on the failure path) + 2 High (`Layer.forEachReadOnly` null-coalesce bug, primitive fast-path trusts default not value) + 2 Medium (writer/fromState double-validate) + 4 Low (commit hardcoded message, clone double-clone, getState dead check, MAX_SAFE_INTEGER+1 test). New `FORBIDDEN_PRECONDITION_METHODS` const array as single source of truth. 600 tests pass.
-- 2026-04-26: Iter-3 verification caught 2 iter-2 fix-quality regressions (R2_REG1: `warnIfPoisoned` missing from R1 denylist; R2_REG2: L_NEW3 sparsity filter removal exposes object-T contract violation via `forEachReadOnly`). Both fixed in v0.7.1. New meta-test cross-checks `FORBIDDEN_PRECONDITION_METHODS` against `World.prototype` to prevent future denylist holes. Gemini quota-exhausted; Codex+Opus reached consensus. 604 tests pass.
-- 2026-04-26: Iter-4 verification — convergence. All 5 iter-3 fixes verified. One Low caught (L_REG3 regression test was vacuous — mutated clone-on-read getter, observable nothing); test rewritten to assert underlying-storage identity. Test-only fix, no version bump. 604 tests pass.
-- 2026-04-26: Iter-5 verification — Codex caught new Critical (Opus reported clean, split decision favored Codex). Predicate could mutate via `w.getComponent(e, 'hp')!.current = 0` since `getComponent` returns live `ComponentStore` reference. C1/R1 denylist only blocks write method calls, not in-place edits of reads. Fix in v0.7.2: precondition proxy now `structuredClone`s returns from a curated set (getComponent, getComponents, getState, getResource, getResources, getPosition, getTags, getByTag, getEvents). 3 new regression tests, 607 total pass.
-- 2026-04-26: Iter-6 verification — Codex caught remaining High (`world.grid` public field, not a method, so iter-5 proxy missed it; predicate could monkey-patch `w.grid.getAt`). Opus reported clean + Note about 2 ghost entries in iter-5 wrap set (`getResources`/`getPosition` don't exist on `World`). Fix in v0.7.3: `Object.freeze` on `world.grid` in constructor (structurally enforces the v0.5.0 read-only-delegate promise); ghost entries dropped. 1 new regression test, 608 total pass.
-- 2026-04-26: Followups on residuals (v0.7.4). L_NEW6: `as any` cast on commit() emit dispatch replaced with narrower `as keyof TEventMap & string` / `as TEventMap[EmitKey]` casts; eslint-disable removed. N1: `SYSTEM_PHASES` + `SystemPhase` moved from world.ts to world-internal.ts; world.ts re-exports for public API. Circular value-import resolved. M3 deeper split + occupancy-grid split remain deferred (composition redesign needed). Doc audit (api-reference, ARCHITECTURE, drift-log) refreshed for v0.6.0–v0.7.3. 608 tests pass.
-- 2026-04-26: Multi-CLI full-review iter-7 (v0.7.5). First broader sweep beyond iter-1–6 CommandTransaction chain. Codex+Opus, Gemini quota-out. 7 findings, all fixed: H1 deserialize accepts dead/non-integer entity IDs in components+resources (now alive+integer-validated at boundary); M1 EventBus listener can mutate engine-owned payload (clone-on-emit per listener); M2 ClientAdapter mapping race after safeSend failure (gated on send result); M3 api-reference snapshot v4→v5 doc fix; L1 octaveNoise2D parameter validation; L2 component-store semantic-mode revert-to-baseline clears dirty; L3 deserialize tick validation hoisted above loaders. 19 new regression tests, 627 total pass.
-- 2026-04-26: Multi-CLI full-review iter-8 convergence check (v0.7.6). Codex+Opus both verified all 7 iter-7 fixes landed cleanly; no regressions; no new Critical/High/Medium/Low. Opus flagged one Note (N3) — same severity class as L2 but on the parallel `wasPresent === false` branch of `ComponentStore.set` (taken after remove() or on first insert when baseline exists). Taken in same iter to keep the L2 contract structurally uniform. 3 new regression tests, 630 total pass. Gemini still quota-exhausted (6th iter in a row).
-- 2026-04-26: Multi-CLI full-review iter-9 closing convergence check. **Both Codex and Opus reported zero real findings** at any severity. N3 fix verified across 5 prompt checkpoints. **Loop converged after 9 iterations** (iter-1–6 closed CommandTransaction chain, iter-7 closed 7 broader-sweep findings, iter-8 closed N3, iter-9 clean). No code changes; no version bump. Gemini quota-out 7th iter in a row.
+> Always read this file at session start to understand current project state. For detailed reviewer notes, validation output, and rationale, start with the newest file in `docs/devlog/detailed/`.
diff --git a/docs/guides/ai-integration.md b/docs/guides/ai-integration.md
index f7ae4ee..ee70b19 100644
--- a/docs/guides/ai-integration.md
+++ b/docs/guides/ai-integration.md
@@ -254,7 +254,7 @@ See `docs/guides/session-recording.md` for the canonical reference.
 
 ## Synthetic Playtest Harness (Tier 1)
 
-`runSynthPlaytest` is the Tier-1 piece of the AI-first feedback loop (Spec 3 of `docs/design/ai-first-dev-roadmap.md`). It drives a `World` autonomously via pluggable `Policy` functions for N ticks and produces a replayable `SessionBundle`. Tier-2 specs (corpus indexing, behavioral metrics, AI playtester agent) build on the synthetic-bundle corpus this harness generates.
+`runSynthPlaytest` is the Tier-1 piece of the AI-first feedback loop (Spec 3 of `docs/design/ai-first-dev-roadmap.md`). It drives a `World` autonomously via pluggable `Policy` functions for N ticks and produces a replayable `SessionBundle`. `BundleCorpus` and behavioral metrics build on the synthetic-bundle corpus this harness generates; the AI playtester agent remains a future policy/reporting layer.
 
 ```typescript
 import { runSynthPlaytest, randomPolicy } from 'civ-engine';
@@ -273,19 +273,41 @@ const result = runSynthPlaytest({
 
 See `docs/guides/synthetic-playtest.md` for the policy-authoring guide, determinism contract, and bundle→script regression workflow.
 
+## Bundle Corpus Index (Tier 2)
+
+`BundleCorpus` is the Tier-2 disk-corpus query surface (Spec 7). It scans closed `FileSink` bundle directories, lists metadata without reading streams or sidecar bytes, filters by manifest-derived fields, and lazily opens matching bundles for replay or metrics.
+
+```typescript
+import { BundleCorpus, runMetrics, bundleCount } from 'civ-engine';
+
+const corpus = new BundleCorpus('artifacts/playtests');
+const failed = corpus.entries({
+  sourceKind: 'synthetic',
+  failedTickCount: { min: 1 },
+});
+
+const current = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
+  bundleCount(),
+]);
+```
+
+Use `entry.openSource()` for replay investigation through `SessionReplayer.fromSource()`, and `corpus.bundles(query)` when a reducer should stream full bundles lazily. See `docs/guides/bundle-corpus-index.md` for scan-depth, invalid-manifest, incomplete-bundle, and sidecar-boundary contracts.
+
 ## Behavioral Metrics over Corpus (Tier 2)
 
-`runMetrics(bundles, metrics)` is the Tier-2 corpus reducer (Spec 8 of `docs/design/ai-first-dev-roadmap.md`). It computes engine-generic + user-defined metrics over an `Iterable<SessionBundle>` — typically the corpus produced by N runs of `runSynthPlaytest`. Pair with `compareMetricsResults(baseline, current)` to detect emergent-behavior regressions.
+`runMetrics(bundles, metrics)` is the Tier-2 corpus reducer (Spec 8 of `docs/design/ai-first-dev-roadmap.md`). It computes engine-generic + user-defined metrics over an `Iterable<SessionBundle>`; for disk-resident corpora, pass `new BundleCorpus(root).bundles(query)`. Pair with `compareMetricsResults(baseline, current)` to detect emergent-behavior regressions.
 
 ```typescript
 import * as fs from 'node:fs';
 import {
+  BundleCorpus,
   runMetrics, compareMetricsResults,
   bundleCount, sessionLengthStats, commandRateStats,
   commandValidationAcceptanceRate, executionFailureRate,
 } from 'civ-engine';
 
-const current = runMetrics(bundles, [
+const corpus = new BundleCorpus('artifacts/playtests');
+const current = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
   bundleCount(),
   sessionLengthStats(),
   commandRateStats(),
diff --git a/docs/guides/behavioral-metrics.md b/docs/guides/behavioral-metrics.md
index 8dbfc5e..dca120e 100644
--- a/docs/guides/behavioral-metrics.md
+++ b/docs/guides/behavioral-metrics.md
@@ -1,32 +1,22 @@
 # Behavioral Metrics over Corpus
 
-Tier-2 of the AI-first feedback loop (Spec 8). A pure-function corpus reducer over `Iterable<SessionBundle>` — typically the bundles produced by `runSynthPlaytest` (Spec 3). Computes engine-generic + user-defined metrics; compares baseline vs. current to detect emergent-behavior regressions.
+Tier-2 of the AI-first feedback loop (Spec 8). A pure-function corpus reducer over `Iterable<SessionBundle>`, commonly fed by a `BundleCorpus` over closed `FileSink` bundles from synthetic playtests. Computes engine-generic + user-defined metrics; compares baseline vs. current to detect emergent-behavior regressions.
 
 ## Quickstart
 
 ```typescript
 import {
-  runSynthPlaytest, randomPolicy,
-  runMetrics, compareMetricsResults,
+  BundleCorpus,
+  runMetrics,
   bundleCount, sessionLengthStats, commandRateStats,
   commandValidationAcceptanceRate, executionFailureRate,
-  type SessionBundle,
 } from 'civ-engine';
 
-// 1. Generate a corpus via Spec 3.
-const bundles: SessionBundle[] = [];
-for (let i = 0; i < 64; i++) {
-  const result = runSynthPlaytest({
-    world: setup(),
-    policies: [/* ... */],
-    maxTicks: 1000,
-    policySeed: i,
-  });
-  if (result.ok) bundles.push(result.bundle);
-}
+// 1. Open a closed FileSink corpus produced by synthetic playtests.
+const corpus = new BundleCorpus('artifacts/playtests', { scanDepth: 'all' });
 
-// 2. Compute metrics in one pass.
-const current = runMetrics(bundles, [
+// 2. Compute metrics in one pass over lazily loaded bundles.
+const current = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
   bundleCount(),
   sessionLengthStats(),
   commandRateStats(),
@@ -38,6 +28,12 @@ console.log(current);
 // { bundleCount: 64, sessionLengthStats: { count: 64, min: ..., p95: ..., ... }, ... }
 ```
 
+For small tests, arrays are still fine because `runMetrics` accepts any synchronous iterable:
+
+```typescript
+const current = runMetrics([bundleA, bundleB], [bundleCount()]);
+```
+
 ## Authoring a custom metric
 
 The accumulator contract: `create()` → state → `observe(state, bundle)` → updated state → `finalize(state)` → result.
@@ -149,4 +145,5 @@ Pair them to detect both regression types:
 - `docs/design/2026-04-27-behavioral-metrics-design.md` — full spec (v4, converged).
 - `docs/architecture/decisions.md` — ADRs 23-27.
 - `docs/guides/synthetic-playtest.md` — Spec 3 harness that produces the corpus.
+- `docs/guides/bundle-corpus-index.md` - Spec 7 disk-backed corpus listing and lazy bundle loading.
 - `docs/guides/ai-integration.md` — Tier-2 of the AI feedback loop.
diff --git a/docs/guides/bundle-corpus-index.md b/docs/guides/bundle-corpus-index.md
new file mode 100644
index 0000000..5127e41
--- /dev/null
+++ b/docs/guides/bundle-corpus-index.md
@@ -0,0 +1,123 @@
+# Bundle Corpus Index
+
+`BundleCorpus` turns a closed directory tree of `FileSink` session bundles into a deterministic, metadata-first query surface. It is the Spec 7 bridge between disk-resident corpora and consumers like `runMetrics`, `SessionReplayer`, and future bundle viewers.
+
+## Quickstart
+
+```typescript
+import {
+  BundleCorpus,
+  bundleCount,
+  commandValidationAcceptanceRate,
+  runMetrics,
+  sessionLengthStats,
+} from 'civ-engine';
+
+const corpus = new BundleCorpus('artifacts/playtests', { scanDepth: 'all' });
+
+const synthetic = corpus.entries({
+  sourceKind: 'synthetic',
+  policySeed: { min: 1000, max: 1999 },
+});
+
+console.log(synthetic.map((entry) => ({
+  key: entry.key,
+  ticks: entry.metadata.durationTicks,
+  failures: entry.failedTickCount,
+})));
+
+const metrics = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
+  bundleCount(),
+  sessionLengthStats(),
+  commandValidationAcceptanceRate(),
+]);
+```
+
+`entries()` reads only `manifest.json` files and derived manifest metadata. `bundles()` loads full bundles lazily, one iterator step at a time.
+
+## Metadata Queries
+
+All `BundleQuery` fields are ANDed. Scalar-or-array fields use `OneOrMany<T>`, so `sourceKind: ['scenario', 'synthetic']` matches either value. Missing optional manifest fields do not match requested values: `sourceLabel: 'random'` excludes entries without `metadata.sourceLabel`.
+
+Useful filters:
+
+- `key`: exact key string or `RegExp` over slash-normalized corpus keys.
+- `sourceKind`, `sourceLabel`, `sessionId`, `engineVersion`, `nodeVersion`: manifest metadata equality.
+- `durationTicks`, `startTick`, `endTick`, `persistedEndTick`, `materializedEndTick`, `failedTickCount`, `policySeed`: inclusive integer ranges.
+- `recordedAt`: normalized UTC ISO string range.
+- `attachmentMime`: any-match over manifest attachment MIME descriptors.
+- `incomplete`: `true` for recorder-terminated bundles; `false` for entries where `metadata.incomplete !== true`.
+
+The result order is always `recordedAt`, then `sessionId`, then `key`, using JavaScript code-unit string ordering.
+
+## Behavioral Metrics Integration
+
+`BundleCorpus` implements `Iterable<SessionBundle>`, and `corpus.bundles(query)` returns an `IterableIterator<SessionBundle>`. That means Spec 8 can reduce disk corpora without materializing an array first:
+
+```typescript
+const result = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
+  bundleCount(),
+  sessionLengthStats(),
+]);
+```
+
+The iterable is lazy but single-use like any generator. Create a fresh `corpus.bundles(query)` for each independent metrics run.
+
+## Replay Investigation
+
+Use `entry.openSource()` when you want a `SessionSource` for `SessionReplayer.fromSource()` or direct stream/snapshot reads:
+
+```typescript
+import { BundleCorpus, SessionReplayer } from 'civ-engine';
+
+const corpus = new BundleCorpus('artifacts/playtests');
+const entry = corpus.entries({ failedTickCount: { min: 1 } })[0];
+const replayer = SessionReplayer.fromSource(entry.openSource(), { worldFactory });
+```
+
+Use `entry.loadBundle()` or `corpus.loadBundle(key)` when you want the whole JSON bundle in memory.
+
+## Scan Depth
+
+`scanDepth` controls where bundle directories can live:
+
+- `'root'`: only `rootDir` itself.
+- `'children'`: direct child directories.
+- `'all'`: recursive descendants; this is the default.
+
+If a directory contains a direct `manifest.json`, the scanner treats it as a bundle and does not descend further. Symlinked directories are skipped.
+
+## Closed Corpus Contract
+
+`BundleCorpus` is designed for closed/frozen `FileSink` bundle directories. Build the corpus after writers have closed their sinks. It does not lock directories, detect active writers, or maintain a persisted `corpus-index.json`.
+
+Strict mode throws on the first invalid manifest. With `{ skipInvalid: true }`, invalid manifests are skipped and exposed through `corpus.invalidEntries` for diagnostics.
+
+## Incomplete Bundle Behavior
+
+`entry.materializedEndTick` describes the persisted-content horizon:
+
+- complete bundle: `metadata.endTick`
+- incomplete bundle: `metadata.persistedEndTick`
+
+This is not a replay guarantee. Replay validity still depends on snapshots, failed ticks, command payloads, and the normal `SessionReplayer` range/integrity checks.
+
+## Sidecar Boundary
+
+Listing and full-bundle loading validate manifest descriptors but do not read sidecar bytes. This keeps metadata queries lightweight and lets missing/corrupt sidecars fail only when a caller explicitly asks for bytes via `readSidecar(id)`.
+
+## Embedded dataUrl Attachment Cost
+
+Attachments stored as `dataUrl` are embedded in `manifest.json`, so their bytes are part of manifest parse cost. The corpus index does not decode them or build a content index from them.
+
+## Limitations
+
+- Queries are manifest-derived only. Command/event/marker/snapshot predicates are deferred to a future content summary index.
+- The API is synchronous and local-filesystem oriented. Remote/object-store corpora belong to a future async corpus surface.
+- No retention, deletion, compaction, or live-writer coordination is provided in v1.
+
+## See Also
+
+- `docs/guides/session-recording.md` for `FileSink` and `SessionReplayer`.
+- `docs/guides/behavioral-metrics.md` for `runMetrics` over a bundle iterable.
+- `docs/design/2026-04-27-bundle-corpus-index-design.md` for the accepted Spec 7 design.
diff --git a/docs/guides/concepts.md b/docs/guides/concepts.md
index 16fab27..efb65cf 100644
--- a/docs/guides/concepts.md
+++ b/docs/guides/concepts.md
@@ -222,6 +222,7 @@ The engine ships several standalone data structures that game code instantiates
 - **`createNoise2D` / `octaveNoise2D` / `stepCellGrid`** — map-generation primitives
 - **`createBehaviorTree` / `BTState`** — behavior-tree framework
 - **`SessionRecorder` / `SessionReplayer` / `SessionBundle` / `SessionSink` / `SessionSource` / `MemorySink` / `FileSink` / `Marker` / `RecordedCommand`** — capture deterministic, replayable bundles of any World run; load + replay + selfCheck; companion adapter `scenarioResultToBundle()`. See `docs/guides/session-recording.md`.
+- **`BundleCorpus`** - manifest-first listing, filtering, and lazy loading over closed `FileSink` bundle directories. See `docs/guides/bundle-corpus-index.md`.
 
 `SpatialGrid` answers proximity questions (which entities are near point P) and is owned by `World`. The standalone utilities answer different questions and let game code mix them as needed without paying for what it doesn't use.
 
diff --git a/docs/guides/session-recording.md b/docs/guides/session-recording.md
index 9d66749..6a779e3 100644
--- a/docs/guides/session-recording.md
+++ b/docs/guides/session-recording.md
@@ -60,6 +60,27 @@ const file = new FileSink('/path/to/bundle-dir');
 
 `MemorySink` defaults to **dataUrl** for under-threshold attachments (default 64 KiB). Oversize attachments throw `SinkWriteError(code: 'oversize_attachment')` unless constructed with `MemorySinkOptions.allowSidecar: true`.
 
+## Indexing FileSink Bundles
+
+Use `BundleCorpus` after FileSink writers have closed to list, filter, and lazily reload disk-backed bundles:
+
+```ts
+import { BundleCorpus } from 'civ-engine';
+
+const corpus = new BundleCorpus('/path/to/corpus', { scanDepth: 'all' });
+const failedSynthetic = corpus.entries({
+  sourceKind: 'synthetic',
+  failedTickCount: { min: 1 },
+});
+
+for (const entry of failedSynthetic) {
+  const source = entry.openSource();
+  console.log(entry.key, source.readSnapshot(entry.metadata.startTick));
+}
+```
+
+`BundleCorpus.entries()` reads only `manifest.json` metadata and manifest attachment descriptors. It does not read JSONL streams, snapshots, or sidecar bytes until you call `entry.openSource()`, `entry.loadBundle()`, or `corpus.bundles()`. See `docs/guides/bundle-corpus-index.md` for the full query surface.
+
 ## Markers
 
 Three kinds:
diff --git a/docs/guides/synthetic-playtest.md b/docs/guides/synthetic-playtest.md
index aa09c42..407f3c5 100644
--- a/docs/guides/synthetic-playtest.md
+++ b/docs/guides/synthetic-playtest.md
@@ -217,23 +217,31 @@ if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
 
 ## Computing metrics over bundles
 
-After producing a corpus of synthetic playtest bundles, `runMetrics` (Spec 8) reduces them to aggregate metrics for regression detection:
+After producing a corpus of synthetic playtest bundles, persist them with `FileSink`, open the closed directory tree with `BundleCorpus` (Spec 7), and reduce matching bundles with `runMetrics` (Spec 8):
 
 ```typescript
 import {
+  BundleCorpus, FileSink,
   runSynthPlaytest, runMetrics,
   bundleCount, sessionLengthStats,
-  type SessionBundle,
 } from 'civ-engine';
 
-const bundles: SessionBundle[] = [];
 for (let i = 0; i < 32; i++) {
-  const result = runSynthPlaytest({ world: setup(), policies: [/* ... */], maxTicks: 1000, policySeed: i });
-  if (result.ok) bundles.push(result.bundle);
+  runSynthPlaytest({
+    world: setup(),
+    policies: [/* ... */],
+    maxTicks: 1000,
+    policySeed: i,
+    sink: new FileSink(`artifacts/playtests/${i}`),
+  });
 }
 
-const metrics = runMetrics(bundles, [bundleCount(), sessionLengthStats()]);
+const corpus = new BundleCorpus('artifacts/playtests');
+const metrics = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
+  bundleCount(),
+  sessionLengthStats(),
+]);
 console.log(metrics.bundleCount, metrics.sessionLengthStats);
 ```
 
-See `docs/guides/behavioral-metrics.md` for the full metric catalog, `compareMetricsResults` regression-detection helper, and the accumulator-style contract for custom metrics.
+See `docs/guides/bundle-corpus-index.md` for disk-corpus listing/query, and `docs/guides/behavioral-metrics.md` for the full metric catalog, `compareMetricsResults` regression-detection helper, and the accumulator-style contract for custom metrics.
diff --git a/package-lock.json b/package-lock.json
index 6aa5f4c..e24acb1 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,12 +1,12 @@
 {
   "name": "civ-engine",
-  "version": "0.7.8",
+  "version": "0.8.3",
   "lockfileVersion": 3,
   "requires": true,
   "packages": {
     "": {
       "name": "civ-engine",
-      "version": "0.7.8",
+      "version": "0.8.3",
       "devDependencies": {
         "@eslint/js": "^9.0.0",
         "@types/node": "^25.6.0",
diff --git a/package.json b/package.json
index c284ad2..d863822 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "civ-engine",
-  "version": "0.8.2",
+  "version": "0.8.3",
   "type": "module",
   "main": "./dist/index.js",
   "types": "./dist/index.d.ts",
diff --git a/src/bundle-corpus-manifest.ts b/src/bundle-corpus-manifest.ts
new file mode 100644
index 0000000..f162d84
--- /dev/null
+++ b/src/bundle-corpus-manifest.ts
@@ -0,0 +1,214 @@
+import { readFileSync } from 'node:fs';
+import type { AttachmentDescriptor, SessionMetadata } from './session-bundle.js';
+import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
+import { corpusError } from './bundle-corpus-types.js';
+
+export interface FileManifest {
+  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  metadata: SessionMetadata;
+  attachments: AttachmentDescriptor[];
+}
+
+function isRecord(value: unknown): value is Record<string, unknown> {
+  return typeof value === 'object' && value !== null && !Array.isArray(value);
+}
+
+function assertString(value: unknown, label: string, path: string): string {
+  if (typeof value !== 'string') {
+    throw corpusError(`${label} must be a string`, {
+      code: 'manifest_invalid',
+      path,
+      message: label,
+    });
+  }
+  return value;
+}
+
+function assertInteger(value: unknown, label: string, path: string): number {
+  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
+    throw corpusError(`${label} must be a finite integer`, {
+      code: 'manifest_invalid',
+      path,
+      message: label,
+    });
+  }
+  return value;
+}
+
+function assertNonNegativeInteger(value: unknown, label: string, path: string): number {
+  const out = assertInteger(value, label, path);
+  if (out < 0) {
+    throw corpusError(`${label} must be non-negative`, {
+      code: 'manifest_invalid',
+      path,
+      message: label,
+    });
+  }
+  return out;
+}
+
+function assertCanonicalIso(value: unknown, label: string, path: string): string {
+  if (typeof value !== 'string' || !value.endsWith('Z')) {
+    throw corpusError(`${label} must be a normalized UTC ISO string`, {
+      code: 'manifest_invalid',
+      path,
+      message: label,
+    });
+  }
+  const parsed = new Date(value);
+  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
+    throw corpusError(`${label} must round-trip through Date.toISOString()`, {
+      code: 'manifest_invalid',
+      path,
+      message: label,
+    });
+  }
+  return value;
+}
+
+function validateMetadata(value: unknown, path: string): SessionMetadata {
+  if (!isRecord(value)) {
+    throw corpusError('manifest metadata must be an object', {
+      code: 'manifest_invalid',
+      path,
+      message: 'metadata',
+    });
+  }
+
+  const sourceKind = value.sourceKind;
+  if (sourceKind !== 'session' && sourceKind !== 'scenario' && sourceKind !== 'synthetic') {
+    throw corpusError('metadata.sourceKind must be session, scenario, or synthetic', {
+      code: 'manifest_invalid',
+      path,
+      message: 'sourceKind',
+    });
+  }
+
+  const failedTicks = validateFailedTicks(value.failedTicks, path);
+  const metadata: SessionMetadata = {
+    sessionId: assertString(value.sessionId, 'sessionId', path),
+    engineVersion: assertString(value.engineVersion, 'engineVersion', path),
+    nodeVersion: assertString(value.nodeVersion, 'nodeVersion', path),
+    recordedAt: assertCanonicalIso(value.recordedAt, 'recordedAt', path),
+    startTick: assertInteger(value.startTick, 'startTick', path),
+    endTick: assertInteger(value.endTick, 'endTick', path),
+    persistedEndTick: assertInteger(value.persistedEndTick, 'persistedEndTick', path),
+    durationTicks: assertInteger(value.durationTicks, 'durationTicks', path),
+    sourceKind,
+  };
+
+  if (value.sourceLabel !== undefined) {
+    metadata.sourceLabel = assertString(value.sourceLabel, 'sourceLabel', path);
+  }
+  if (value.incomplete !== undefined) {
+    if (value.incomplete !== true) {
+      throw corpusError('metadata.incomplete must be true when present', {
+        code: 'manifest_invalid',
+        path,
+        message: 'incomplete',
+      });
+    }
+    metadata.incomplete = true;
+  }
+  if (failedTicks) {
+    metadata.failedTicks = failedTicks;
+  }
+  if (value.policySeed !== undefined) {
+    metadata.policySeed = assertInteger(value.policySeed, 'policySeed', path);
+  }
+  return metadata;
+}
+
+function validateFailedTicks(value: unknown, path: string): number[] | undefined {
+  if (value === undefined) return undefined;
+  if (!Array.isArray(value)) {
+    throw corpusError('metadata.failedTicks must be an array', {
+      code: 'manifest_invalid',
+      path,
+      message: 'failedTicks',
+    });
+  }
+  return value.map((tick, index) => assertInteger(tick, `failedTicks[${index}]`, path));
+}
+
+function validateAttachment(value: unknown, path: string, index: number): AttachmentDescriptor {
+  if (!isRecord(value)) {
+    throw corpusError(`attachments[${index}] must be an object`, {
+      code: 'manifest_invalid',
+      path,
+      message: `attachments[${index}]`,
+    });
+  }
+
+  const ref = value.ref;
+  if (!isRecord(ref)) {
+    throw corpusError(`attachments[${index}].ref must be an object`, {
+      code: 'manifest_invalid',
+      path,
+      message: `attachments[${index}].ref`,
+    });
+  }
+
+  const refKeys = Object.keys(ref).filter((key) => ref[key] !== undefined);
+  const validRef =
+    (refKeys.length === 1 && typeof ref.dataUrl === 'string') ||
+    (refKeys.length === 1 && ref.sidecar === true) ||
+    (refKeys.length === 1 && ref.auto === true);
+  if (!validRef) {
+    throw corpusError(`attachments[${index}].ref must be dataUrl, sidecar, or auto`, {
+      code: 'manifest_invalid',
+      path,
+      message: `attachments[${index}].ref`,
+    });
+  }
+
+  return {
+    id: assertString(value.id, `attachments[${index}].id`, path),
+    mime: assertString(value.mime, `attachments[${index}].mime`, path),
+    sizeBytes: assertNonNegativeInteger(value.sizeBytes, `attachments[${index}].sizeBytes`, path),
+    ref: ref as AttachmentDescriptor['ref'],
+  };
+}
+
+export function readManifest(manifestPath: string): FileManifest {
+  let parsed: unknown;
+  try {
+    parsed = JSON.parse(readFileSync(manifestPath, 'utf-8')) as unknown;
+  } catch (error) {
+    throw corpusError(`manifest parse failed: ${(error as Error).message}`, {
+      code: 'manifest_parse',
+      path: manifestPath,
+      message: (error as Error).message,
+    });
+  }
+
+  if (!isRecord(parsed)) {
+    throw corpusError('manifest must be an object', {
+      code: 'manifest_invalid',
+      path: manifestPath,
+      message: 'manifest',
+    });
+  }
+  if (parsed.schemaVersion !== SESSION_BUNDLE_SCHEMA_VERSION) {
+    throw corpusError('unsupported bundle schema version', {
+      code: 'schema_unsupported',
+      path: manifestPath,
+      message: String(parsed.schemaVersion),
+    });
+  }
+  if (!Array.isArray(parsed.attachments)) {
+    throw corpusError('manifest attachments must be an array', {
+      code: 'manifest_invalid',
+      path: manifestPath,
+      message: 'attachments',
+    });
+  }
+
+  return {
+    schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
+    metadata: validateMetadata(parsed.metadata, manifestPath),
+    attachments: parsed.attachments.map((attachment, index) =>
+      validateAttachment(attachment, manifestPath, index),
+    ),
+  };
+}
diff --git a/src/bundle-corpus-types.ts b/src/bundle-corpus-types.ts
new file mode 100644
index 0000000..70bdc65
--- /dev/null
+++ b/src/bundle-corpus-types.ts
@@ -0,0 +1,122 @@
+import type { JsonValue } from './json.js';
+import type { SessionBundle, SessionMetadata } from './session-bundle.js';
+import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
+import { SessionRecordingError } from './session-errors.js';
+import type { SessionSource } from './session-sink.js';
+
+export type BundleCorpusScanDepth = 'root' | 'children' | 'all';
+
+export interface BundleCorpusOptions {
+  scanDepth?: BundleCorpusScanDepth;
+  skipInvalid?: boolean;
+}
+
+export interface NumberRange {
+  min?: number;
+  max?: number;
+}
+
+export interface IsoTimeRange {
+  from?: string;
+  to?: string;
+}
+
+export type OneOrMany<T> = T | readonly T[];
+
+export interface BundleQuery {
+  key?: string | RegExp;
+  sessionId?: OneOrMany<string>;
+  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
+  sourceLabel?: OneOrMany<string>;
+  engineVersion?: OneOrMany<string>;
+  nodeVersion?: OneOrMany<string>;
+  incomplete?: boolean;
+  durationTicks?: NumberRange;
+  startTick?: NumberRange;
+  endTick?: NumberRange;
+  persistedEndTick?: NumberRange;
+  materializedEndTick?: NumberRange;
+  failedTickCount?: NumberRange;
+  policySeed?: number | NumberRange;
+  recordedAt?: IsoTimeRange;
+  attachmentMime?: OneOrMany<string>;
+}
+
+export type CorpusIndexErrorCode =
+  | 'root_missing'
+  | 'manifest_parse'
+  | 'manifest_invalid'
+  | 'schema_unsupported'
+  | 'duplicate_key'
+  | 'query_invalid'
+  | 'entry_missing';
+
+export interface CorpusIndexErrorDetails {
+  readonly [key: string]: JsonValue;
+  readonly code: CorpusIndexErrorCode;
+  readonly path: string | null;
+  readonly key: string | null;
+  readonly message: string | null;
+}
+
+export class CorpusIndexError extends SessionRecordingError {
+  override readonly details: CorpusIndexErrorDetails;
+
+  constructor(message: string, details: CorpusIndexErrorDetails) {
+    super(message, details);
+    this.name = 'CorpusIndexError';
+    this.details = details;
+  }
+}
+
+export interface InvalidCorpusEntry {
+  readonly path: string;
+  readonly error: CorpusIndexError;
+}
+
+export interface BundleCorpusEntry {
+  readonly key: string;
+  readonly dir: string;
+  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
+  readonly metadata: Readonly<SessionMetadata>;
+  readonly attachmentCount: number;
+  readonly attachmentBytes: number;
+  readonly attachmentMimes: readonly string[];
+  readonly hasFailures: boolean;
+  readonly failedTickCount: number;
+  readonly materializedEndTick: number;
+  openSource(): SessionSource;
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
+}
+
+interface CorpusIndexErrorDetailsInput {
+  readonly [key: string]: JsonValue | undefined;
+  readonly code: CorpusIndexErrorCode;
+  readonly path?: string;
+  readonly key?: string;
+  readonly message?: string;
+}
+
+function normalizeDetails(input: CorpusIndexErrorDetailsInput): CorpusIndexErrorDetails {
+  const details: Record<string, JsonValue> = {};
+  for (const [key, value] of Object.entries(input)) {
+    if (value !== undefined) details[key] = value;
+  }
+  details.code = input.code;
+  details.path = input.path ?? null;
+  details.key = input.key ?? null;
+  details.message = input.message ?? null;
+  return Object.freeze(details) as CorpusIndexErrorDetails;
+}
+
+export function corpusError(message: string, details: CorpusIndexErrorDetailsInput): CorpusIndexError {
+  return new CorpusIndexError(message, normalizeDetails(details));
+}
+
+export function compareCodeUnit(a: string, b: string): number {
+  return a < b ? -1 : a > b ? 1 : 0;
+}
diff --git a/src/bundle-corpus.ts b/src/bundle-corpus.ts
new file mode 100644
index 0000000..9776027
--- /dev/null
+++ b/src/bundle-corpus.ts
@@ -0,0 +1,351 @@
+import { existsSync, lstatSync, readdirSync } from 'node:fs';
+import { join, relative, resolve, sep } from 'node:path';
+import type { JsonValue } from './json.js';
+import type { SessionBundle, SessionMetadata } from './session-bundle.js';
+import { FileSink } from './session-file-sink.js';
+import type { SessionSource } from './session-sink.js';
+import { readManifest, type FileManifest } from './bundle-corpus-manifest.js';
+import {
+  compareCodeUnit,
+  corpusError,
+  CorpusIndexError,
+  type BundleCorpusEntry,
+  type BundleCorpusOptions,
+  type BundleCorpusScanDepth,
+  type BundleQuery,
+  type InvalidCorpusEntry,
+  type NumberRange,
+  type OneOrMany,
+} from './bundle-corpus-types.js';
+
+export {
+  CorpusIndexError,
+  type BundleCorpusEntry,
+  type BundleCorpusOptions,
+  type BundleCorpusScanDepth,
+  type BundleQuery,
+  type CorpusIndexErrorCode,
+  type CorpusIndexErrorDetails,
+  type InvalidCorpusEntry,
+  type IsoTimeRange,
+  type NumberRange,
+  type OneOrMany,
+} from './bundle-corpus-types.js';
+
+const MANIFEST_FILE = 'manifest.json';
+
+export class BundleCorpus implements Iterable<SessionBundle> {
+  readonly rootDir: string;
+  readonly invalidEntries: readonly InvalidCorpusEntry[];
+  private readonly _entries: readonly BundleCorpusEntry[];
+  private readonly _byKey: ReadonlyMap<string, BundleCorpusEntry>;
+
+  constructor(rootDir: string, options: BundleCorpusOptions = {}) {
+    const root = resolve(rootDir);
+    if (!existsSync(root) || !safeIsDirectory(root)) {
+      throw corpusError('corpus root is missing or is not a directory', {
+        code: 'root_missing',
+        path: root,
+      });
+    }
+
+    this.rootDir = root;
+    const invalidEntries: InvalidCorpusEntry[] = [];
+    const entries: BundleCorpusEntry[] = [];
+    const byKey = new Map<string, BundleCorpusEntry>();
+
+    for (const dir of discoverBundleDirs(this.rootDir, options.scanDepth ?? 'all')) {
+      const key = keyForDir(this.rootDir, dir);
+      if (byKey.has(key)) {
+        throw corpusError(`duplicate corpus key ${key}`, {
+          code: 'duplicate_key',
+          path: dir,
+          key,
+        });
+      }
+
+      try {
+        const entry = makeEntry(dir, key, readManifest(join(dir, MANIFEST_FILE)));
+        byKey.set(key, entry);
+        entries.push(entry);
+      } catch (error) {
+        if (options.skipInvalid && error instanceof CorpusIndexError && error.details.code !== 'duplicate_key') {
+          invalidEntries.push(Object.freeze({
+            path: join(dir, MANIFEST_FILE),
+            error,
+          }));
+          continue;
+        }
+        throw error;
+      }
+    }
+
+    entries.sort(compareEntries);
+    this._entries = Object.freeze(entries.slice());
+    this._byKey = new Map(entries.map((entry) => [entry.key, entry]));
+    this.invalidEntries = Object.freeze(invalidEntries.slice());
+  }
+
+  entries(query?: BundleQuery): readonly BundleCorpusEntry[] {
+    const predicate = query ? compileQuery(query) : () => true;
+    return Object.freeze(this._entries.filter(predicate));
+  }
+
+  *bundles(query?: BundleQuery): IterableIterator<SessionBundle> {
+    for (const entry of this.entries(query)) {
+      yield entry.loadBundle();
+    }
+  }
+
+  get(key: string): BundleCorpusEntry | undefined {
+    return this._byKey.get(key);
+  }
+
+  openSource(key: string): SessionSource {
+    return requireEntry(this._byKey, key).openSource();
+  }
+
+  loadBundle<
+    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+    TDebug = JsonValue,
+  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug> {
+    return requireEntry(this._byKey, key).loadBundle<TEventMap, TCommandMap, TDebug>();
+  }
+
+  [Symbol.iterator](): IterableIterator<SessionBundle> {
+    return this.bundles();
+  }
+}
+
+function safeIsDirectory(path: string): boolean {
+  try {
+    return lstatSync(path).isDirectory();
+  } catch {
+    return false;
+  }
+}
+
+function discoverBundleDirs(root: string, depth: BundleCorpusScanDepth): string[] {
+  const out: string[] = [];
+  const initialRemaining = depth === 'root' ? 0 : depth === 'children' ? 1 : 'all';
+
+  function visit(dir: string, remaining: number | 'all'): void {
+    if (existsSync(join(dir, MANIFEST_FILE))) {
+      out.push(dir);
+      return;
+    }
+    if (remaining === 0) return;
+
+    const nextRemaining = remaining === 'all' ? 'all' : remaining - 1;
+    const children = readdirSync(dir, { withFileTypes: true })
+      .filter((dirent) => dirent.isDirectory() && !dirent.isSymbolicLink())
+      .map((dirent) => dirent.name)
+      .sort(compareCodeUnit);
+
+    for (const child of children) {
+      visit(join(dir, child), nextRemaining);
+    }
+  }
+
+  visit(root, initialRemaining);
+  return out;
+}
+
+function keyForDir(root: string, dir: string): string {
+  const rel = relative(root, dir);
+  if (rel.length === 0) return '.';
+  return rel.split(sep).join('/');
+}
+
+function makeEntry(dir: string, key: string, manifest: FileManifest): BundleCorpusEntry {
+  const frozenFailedTicks = manifest.metadata.failedTicks
+    ? Object.freeze(manifest.metadata.failedTicks.slice())
+    : undefined;
+  const metadata: Readonly<SessionMetadata> = Object.freeze({
+    ...manifest.metadata,
+    ...(frozenFailedTicks ? { failedTicks: frozenFailedTicks as number[] } : {}),
+  });
+  const attachmentMimes = Object.freeze(
+    [...new Set(manifest.attachments.map((attachment) => attachment.mime))].sort(compareCodeUnit),
+  );
+  const materializedEndTick = metadata.incomplete === true
+    ? metadata.persistedEndTick
+    : metadata.endTick;
+
+  const entry: BundleCorpusEntry = {
+    key,
+    dir,
+    schemaVersion: manifest.schemaVersion,
+    metadata,
+    attachmentCount: manifest.attachments.length,
+    attachmentBytes: manifest.attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0),
+    attachmentMimes,
+    hasFailures: (metadata.failedTicks?.length ?? 0) > 0,
+    failedTickCount: metadata.failedTicks?.length ?? 0,
+    materializedEndTick,
+    openSource: () => new FileSink(dir),
+    loadBundle: <
+      TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+      TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+      TDebug = JsonValue,
+    >() => new FileSink(dir).toBundle() as unknown as SessionBundle<TEventMap, TCommandMap, TDebug>,
+  };
+
+  return Object.freeze(entry);
+}
+
+function compareEntries(a: BundleCorpusEntry, b: BundleCorpusEntry): number {
+  return compareCodeUnit(a.metadata.recordedAt, b.metadata.recordedAt)
+    || compareCodeUnit(a.metadata.sessionId, b.metadata.sessionId)
+    || compareCodeUnit(a.key, b.key);
+}
+
+function requireEntry(map: ReadonlyMap<string, BundleCorpusEntry>, key: string): BundleCorpusEntry {
+  const entry = map.get(key);
+  if (!entry) {
+    throw corpusError(`corpus entry ${key} not found`, {
+      code: 'entry_missing',
+      key,
+    });
+  }
+  return entry;
+}
+
+function asArray<T>(value: OneOrMany<T>): readonly T[] {
+  return Array.isArray(value) ? value as readonly T[] : [value as T];
+}
+
+function assertQueryInteger(value: unknown, label: string): number {
+  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
+    throw corpusError(`${label} must be a finite integer`, {
+      code: 'query_invalid',
+      message: label,
+    });
+  }
+  return value;
+}
+
+function validateQueryIso(value: unknown, label: string): string {
+  if (typeof value !== 'string' || !value.endsWith('Z')) {
+    throw corpusError(`${label} must be a normalized UTC ISO string`, {
+      code: 'query_invalid',
+      message: label,
+    });
+  }
+  const parsed = new Date(value);
+  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
+    throw corpusError(`${label} must round-trip through Date.toISOString()`, {
+      code: 'query_invalid',
+      message: label,
+    });
+  }
+  return value;
+}
+
+interface NormalizedNumberRange {
+  min: number;
+  max: number;
+}
+
+function assertNumberRange(range: NumberRange, label: string): NormalizedNumberRange {
+  if (typeof range !== 'object' || range === null || Array.isArray(range)) {
+    throw corpusError(`${label} must be a range object`, {
+      code: 'query_invalid',
+      message: label,
+    });
+  }
+  if (range.min !== undefined) assertQueryInteger(range.min, `${label}.min`);
+  if (range.max !== undefined) assertQueryInteger(range.max, `${label}.max`);
+
+  const min = range.min ?? Number.NEGATIVE_INFINITY;
+  const max = range.max ?? Number.POSITIVE_INFINITY;
+  if (min > max) {
+    throw corpusError(`${label}.min must be <= max`, {
+      code: 'query_invalid',
+      message: label,
+    });
+  }
+  return { min, max };
+}
+
+function matchesRange(value: number, range: NormalizedNumberRange): boolean {
+  return value >= range.min && value <= range.max;
+}
+
+function matchesOne<T>(value: T | undefined, expected: OneOrMany<T> | undefined): boolean {
+  if (expected === undefined) return true;
+  if (value === undefined) return false;
+  return asArray(expected).includes(value);
+}
+
+function matchesKey(value: string, expected: string | RegExp | undefined): boolean {
+  if (expected === undefined) return true;
+  if (typeof expected === 'string') return value === expected;
+  expected.lastIndex = 0;
+  const matched = expected.test(value);
+  expected.lastIndex = 0;
+  return matched;
+}
+
+function compileQuery(query: BundleQuery): (entry: BundleCorpusEntry) => boolean {
+  const ranges = {
+    durationTicks: query.durationTicks ? assertNumberRange(query.durationTicks, 'durationTicks') : undefined,
+    startTick: query.startTick ? assertNumberRange(query.startTick, 'startTick') : undefined,
+    endTick: query.endTick ? assertNumberRange(query.endTick, 'endTick') : undefined,
+    persistedEndTick: query.persistedEndTick
+      ? assertNumberRange(query.persistedEndTick, 'persistedEndTick')
+      : undefined,
+    materializedEndTick: query.materializedEndTick
+      ? assertNumberRange(query.materializedEndTick, 'materializedEndTick')
+      : undefined,
+    failedTickCount: query.failedTickCount
+      ? assertNumberRange(query.failedTickCount, 'failedTickCount')
+      : undefined,
+    policySeed: query.policySeed !== undefined && typeof query.policySeed !== 'number'
+      ? assertNumberRange(query.policySeed, 'policySeed')
+      : undefined,
+  };
+  const policySeedScalar = typeof query.policySeed === 'number'
+    ? assertQueryInteger(query.policySeed, 'policySeed')
+    : undefined;
+  const recordedAtFrom = query.recordedAt?.from === undefined
+    ? undefined
+    : validateQueryIso(query.recordedAt.from, 'recordedAt.from');
+  const recordedAtTo = query.recordedAt?.to === undefined
+    ? undefined
+    : validateQueryIso(query.recordedAt.to, 'recordedAt.to');
+
+  if (recordedAtFrom && recordedAtTo && recordedAtFrom > recordedAtTo) {
+    throw corpusError('recordedAt.from must be <= recordedAt.to', {
+      code: 'query_invalid',
+      message: 'recordedAt',
+    });
+  }
+
+  return (entry) => {
+    const metadata = entry.metadata;
+    if (!matchesKey(entry.key, query.key)) return false;
+    if (!matchesOne(metadata.sessionId, query.sessionId)) return false;
+    if (!matchesOne(metadata.sourceKind, query.sourceKind)) return false;
+    if (!matchesOne(metadata.sourceLabel, query.sourceLabel)) return false;
+    if (!matchesOne(metadata.engineVersion, query.engineVersion)) return false;
+    if (!matchesOne(metadata.nodeVersion, query.nodeVersion)) return false;
+    if (query.incomplete !== undefined && (metadata.incomplete === true) !== query.incomplete) return false;
+    if (ranges.durationTicks && !matchesRange(metadata.durationTicks, ranges.durationTicks)) return false;
+    if (ranges.startTick && !matchesRange(metadata.startTick, ranges.startTick)) return false;
+    if (ranges.endTick && !matchesRange(metadata.endTick, ranges.endTick)) return false;
+    if (ranges.persistedEndTick && !matchesRange(metadata.persistedEndTick, ranges.persistedEndTick)) return false;
+    if (ranges.materializedEndTick && !matchesRange(entry.materializedEndTick, ranges.materializedEndTick)) return false;
+    if (ranges.failedTickCount && !matchesRange(entry.failedTickCount, ranges.failedTickCount)) return false;
+    if (policySeedScalar !== undefined && metadata.policySeed !== policySeedScalar) return false;
+    if (ranges.policySeed && (metadata.policySeed === undefined || !matchesRange(metadata.policySeed, ranges.policySeed))) return false;
+    if (recordedAtFrom && metadata.recordedAt < recordedAtFrom) return false;
+    if (recordedAtTo && metadata.recordedAt > recordedAtTo) return false;
+    if (query.attachmentMime) {
+      const requested = asArray(query.attachmentMime);
+      if (!entry.attachmentMimes.some((mime) => requested.includes(mime))) return false;
+    }
+    return true;
+  };
+}
diff --git a/src/index.ts b/src/index.ts
index 19f9f5a..525157a 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -59,6 +59,22 @@ export {
 } from './session-sink.js';
 // T3: FileSink
 export { FileSink } from './session-file-sink.js';
+// Bundle Corpus Index - Spec 7 (v0.8.3+): manifest-first query/index layer
+// over closed FileSink bundle directories, with lazy SessionBundle loading.
+export {
+  BundleCorpus,
+  CorpusIndexError,
+  type BundleCorpusScanDepth,
+  type BundleCorpusOptions,
+  type BundleCorpusEntry,
+  type BundleQuery,
+  type OneOrMany,
+  type NumberRange,
+  type IsoTimeRange,
+  type CorpusIndexErrorCode,
+  type CorpusIndexErrorDetails,
+  type InvalidCorpusEntry,
+} from './bundle-corpus.js';
 // T5: SessionRecorder
 export {
   SessionRecorder,
diff --git a/src/version.ts b/src/version.ts
index 57aacc4..facf204 100644
--- a/src/version.ts
+++ b/src/version.ts
@@ -4,4 +4,4 @@
  * `metadata.engineVersion` in session bundles. Avoids relying on
  * `process.env.npm_package_version` which is only set under `npm run`.
  */
-export const ENGINE_VERSION = '0.8.2' as const;
+export const ENGINE_VERSION = '0.8.3' as const;
diff --git a/tests/bundle-corpus.test.ts b/tests/bundle-corpus.test.ts
new file mode 100644
index 0000000..bb3204c
--- /dev/null
+++ b/tests/bundle-corpus.test.ts
@@ -0,0 +1,316 @@
+import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join } from 'node:path';
+import { afterEach, describe, expect, it } from 'vitest';
+import {
+  BundleCorpus,
+  CorpusIndexError,
+  FileSink,
+  SessionRecordingError,
+  bundleCount,
+  runMetrics,
+  type AttachmentDescriptor,
+  type SessionMetadata,
+  type SessionSnapshotEntry,
+} from '../src/index.js';
+
+const roots: string[] = [];
+
+function tempRoot(): string {
+  const root = mkdtempSync(join(tmpdir(), 'civ-engine-corpus-'));
+  roots.push(root);
+  return root;
+}
+
+afterEach(() => {
+  for (const root of roots.splice(0)) {
+    rmSync(root, { recursive: true, force: true });
+  }
+});
+
+function metadata(id: string, overrides: Partial<SessionMetadata> = {}): SessionMetadata {
+  return {
+    sessionId: id,
+    engineVersion: '0.8.2',
+    nodeVersion: 'v20.0.0',
+    recordedAt: '2026-04-27T00:00:00.000Z',
+    startTick: 0,
+    endTick: 10,
+    persistedEndTick: 10,
+    durationTicks: 10,
+    sourceKind: 'session',
+    ...overrides,
+  };
+}
+
+function snapshot(tick: number): SessionSnapshotEntry {
+  return {
+    tick,
+    snapshot: { tick } as never,
+  };
+}
+
+function writeBundle(
+  dir: string,
+  meta: SessionMetadata,
+  attachments: AttachmentDescriptor[] = [],
+): void {
+  const sink = new FileSink(dir);
+  sink.open(meta);
+  sink.writeSnapshot(snapshot(meta.startTick));
+  if (meta.persistedEndTick !== meta.startTick) {
+    sink.writeSnapshot(snapshot(meta.persistedEndTick));
+  }
+  for (const attachment of attachments) {
+    sink.writeAttachment(attachment, new Uint8Array([1, 2, 3]));
+  }
+  sink.close();
+}
+
+function writeInvalidManifest(dir: string, manifest: unknown): void {
+  mkdirSync(dir, { recursive: true });
+  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
+}
+
+function expectCorpusError(fn: () => unknown, code: string): CorpusIndexError {
+  try {
+    fn();
+  } catch (error) {
+    expect(error).toBeInstanceOf(CorpusIndexError);
+    expect(error).toBeInstanceOf(SessionRecordingError);
+    expect((error as CorpusIndexError).details.code).toBe(code);
+    return error as CorpusIndexError;
+  }
+  throw new Error(`expected CorpusIndexError ${code}`);
+}
+
+describe('BundleCorpus discovery and entries', () => {
+  it('indexes a root bundle with key "." and freezes entry metadata', () => {
+    const root = tempRoot();
+    writeBundle(root, metadata('root', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+
+    const corpus = new BundleCorpus(root, { scanDepth: 'root' });
+    const entries = corpus.entries();
+
+    expect(entries.map((entry) => entry.key)).toEqual(['.']);
+    expect(entries[0].dir).toBe(root);
+    expect(Object.isFrozen(entries[0])).toBe(true);
+    expect(Object.isFrozen(entries[0].metadata)).toBe(true);
+    expect(corpus.get('.')).toBe(entries[0]);
+
+    expect(() => {
+      (entries[0].metadata as SessionMetadata).sessionId = 'mutated';
+    }).toThrow(TypeError);
+    expect(corpus.entries()[0].metadata.sessionId).toBe('root');
+  });
+
+  it('honors scanDepth and sorts by recordedAt, sessionId, then key', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'b'), metadata('s-2', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeBundle(join(root, 'a'), metadata('s-1', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeBundle(join(root, 'nested', 'c'), metadata('s-0', { recordedAt: '2026-04-27T00:00:00.000Z' }));
+
+    expect(new BundleCorpus(root, { scanDepth: 'root' }).entries()).toEqual([]);
+    expect(new BundleCorpus(root, { scanDepth: 'children' }).entries().map((entry) => entry.key)).toEqual(['a', 'b']);
+    expect(new BundleCorpus(root, { scanDepth: 'all' }).entries().map((entry) => entry.key)).toEqual(['nested/c', 'a', 'b']);
+  });
+
+  it('stops descending once a directory is a bundle', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'outer'), metadata('outer'));
+    writeBundle(join(root, 'outer', 'nested'), metadata('nested'));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['outer']);
+  });
+
+  it('uses locale-independent code-unit ordering for ties', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'lower'), metadata('alpha', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    writeBundle(join(root, 'upper'), metadata('Zulu', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.metadata.sessionId)).toEqual(['Zulu', 'alpha']);
+  });
+
+  it('skips symlinked directories when the platform permits creating them', () => {
+    const root = tempRoot();
+    const target = join(root, 'target');
+    writeBundle(target, metadata('target'));
+    try {
+      symlinkSync(target, join(root, 'link'), 'junction');
+    } catch {
+      return;
+    }
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['target']);
+  });
+});
+
+describe('BundleCorpus query and loading contracts', () => {
+  it('lists from manifest without reading malformed streams until loadBundle', () => {
+    const root = tempRoot();
+    const dir = join(root, 'bad-stream');
+    writeBundle(dir, metadata('bad-stream'));
+    writeFileSync(join(dir, 'ticks.jsonl'), '{"tick":\n{}\n');
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['bad-stream']);
+    expect(() => corpus.loadBundle('bad-stream')).toThrow();
+  });
+
+  it('does not read missing sidecar bytes during listing or loadBundle', () => {
+    const root = tempRoot();
+    const dir = join(root, 'sidecar');
+    writeBundle(dir, metadata('sidecar'), [
+      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
+    ]);
+    rmSync(join(dir, 'attachments', 'screen.png'));
+
+    const corpus = new BundleCorpus(root);
+    const entry = corpus.entries({ attachmentMime: 'image/png' })[0];
+    expect(entry.attachmentCount).toBe(1);
+    expect(entry.attachmentBytes).toBe(3);
+    expect(entry.attachmentMimes).toEqual(['image/png']);
+    expect(entry.loadBundle().attachments).toHaveLength(1);
+    expect(() => entry.openSource().readSidecar('screen')).toThrow();
+  });
+
+  it('loads bundles lazily one iterator step at a time', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'first'), metadata('first', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    const second = join(root, 'second');
+    writeBundle(second, metadata('second', { recordedAt: '2026-04-27T00:00:02.000Z' }));
+    writeFileSync(join(second, 'ticks.jsonl'), '{"tick":\n{}\n');
+
+    const iterator = new BundleCorpus(root).bundles();
+    const first = iterator.next();
+    expect(first.done).toBe(false);
+    expect(first.value.metadata.sessionId).toBe('first');
+    expect(() => iterator.next()).toThrow();
+  });
+
+  it('matches attachmentMime when any MIME overlaps the requested set', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'mixed'), metadata('mixed'), [
+      { id: 'screen', mime: 'image/png', sizeBytes: 3, ref: { sidecar: true } },
+      { id: 'trace', mime: 'application/json', sizeBytes: 3, ref: { sidecar: true } },
+    ]);
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.get('mixed')?.attachmentMimes).toEqual(['application/json', 'image/png']);
+    expect(corpus.entries({ attachmentMime: 'application/json' }).map((entry) => entry.key)).toEqual(['mixed']);
+    expect(corpus.entries({ attachmentMime: ['text/plain', 'image/png'] }).map((entry) => entry.key)).toEqual(['mixed']);
+    expect(corpus.entries({ attachmentMime: ['text/plain', 'text/csv'] }).map((entry) => entry.key)).toEqual([]);
+  });
+
+  it('filters by manifest fields and ANDs query fields', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'seeded'), metadata('seeded', {
+      recordedAt: '2026-04-27T00:00:01.000Z',
+      sourceKind: 'synthetic',
+      sourceLabel: 'random',
+      policySeed: 42,
+      durationTicks: 30,
+      endTick: 30,
+      persistedEndTick: 30,
+    }));
+    writeBundle(join(root, 'unseeded'), metadata('unseeded', {
+      recordedAt: '2026-04-27T00:00:02.000Z',
+      sourceKind: 'synthetic',
+      durationTicks: 5,
+      endTick: 5,
+      persistedEndTick: 5,
+    }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.entries({ sourceKind: 'synthetic', policySeed: { min: 40, max: 50 } }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ sourceLabel: 'random' }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ durationTicks: { min: 10 }, recordedAt: { from: '2026-04-27T00:00:00.000Z', to: '2026-04-27T00:00:01.000Z' } }).map((entry) => entry.key)).toEqual(['seeded']);
+    expect(corpus.entries({ key: /seed/ }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
+    const stateful = /seed/g;
+    expect(corpus.entries({ key: stateful }).map((entry) => entry.key)).toEqual(['seeded', 'unseeded']);
+    expect(stateful.lastIndex).toBe(0);
+  });
+
+  it('derives failure counts and materializedEndTick from metadata', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'complete'), metadata('complete', { endTick: 20, persistedEndTick: 20, durationTicks: 20 }));
+    writeBundle(join(root, 'incomplete'), metadata('incomplete', {
+      incomplete: true,
+      endTick: 50,
+      persistedEndTick: 25,
+      durationTicks: 50,
+      failedTicks: [26, 27],
+    }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.get('complete')?.materializedEndTick).toBe(20);
+    expect(corpus.get('incomplete')?.materializedEndTick).toBe(25);
+    expect(corpus.entries({ incomplete: true }).map((entry) => entry.key)).toEqual(['incomplete']);
+    expect(corpus.entries({ incomplete: false }).map((entry) => entry.key)).toEqual(['complete']);
+    expect(corpus.entries({ materializedEndTick: { max: 25 }, failedTickCount: { min: 1 } }).map((entry) => entry.key)).toEqual(['incomplete']);
+    expect(corpus.entries({ endTick: { min: 50 } }).map((entry) => entry.key)).toEqual(['incomplete']);
+    const failedTicks = corpus.get('incomplete')!.metadata.failedTicks!;
+    expect(Object.isFrozen(failedTicks)).toBe(true);
+    expect(() => failedTicks.push(99)).toThrow(TypeError);
+    expect(corpus.get('incomplete')!.metadata.failedTicks).toEqual([26, 27]);
+  });
+
+  it('rejects invalid query ranges and non-canonical recordedAt bounds', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'bundle'), metadata('bundle'));
+    const corpus = new BundleCorpus(root);
+
+    expectCorpusError(() => corpus.entries({ durationTicks: { min: 10, max: 1 } }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ startTick: { min: 0.5 } }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ policySeed: Number.POSITIVE_INFINITY }), 'query_invalid');
+    expectCorpusError(() => corpus.entries({ recordedAt: { from: '2026-04-27' } }), 'query_invalid');
+  });
+
+  it('returns undefined for get and throws entry_missing for strict missing-key APIs', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'bundle'), metadata('bundle'));
+    const corpus = new BundleCorpus(root);
+
+    expect(corpus.get('missing')).toBeUndefined();
+    expectCorpusError(() => corpus.openSource('missing'), 'entry_missing');
+    expectCorpusError(() => corpus.loadBundle('missing'), 'entry_missing');
+  });
+
+  it('throws root_missing when the corpus root is absent', () => {
+    const root = tempRoot();
+    const missing = join(root, 'missing');
+
+    expectCorpusError(() => new BundleCorpus(missing), 'root_missing');
+  });
+
+  it('handles invalid manifests strictly or through skipInvalid diagnostics', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'good'), metadata('good'));
+    writeInvalidManifest(join(root, 'bad'), {
+      schemaVersion: 1,
+      metadata: metadata('bad', { recordedAt: '2026-04-27T00:00:00-07:00' }),
+      attachments: [],
+    });
+
+    expectCorpusError(() => new BundleCorpus(root), 'manifest_invalid');
+    const corpus = new BundleCorpus(root, { skipInvalid: true });
+    expect(corpus.entries().map((entry) => entry.key)).toEqual(['good']);
+    expect(corpus.invalidEntries).toHaveLength(1);
+    expect(corpus.invalidEntries[0].error.details.code).toBe('manifest_invalid');
+  });
+
+  it('loads FileSink bundles and composes with runMetrics', () => {
+    const root = tempRoot();
+    writeBundle(join(root, 'one'), metadata('one', { recordedAt: '2026-04-27T00:00:01.000Z' }));
+    writeBundle(join(root, 'two'), metadata('two', { recordedAt: '2026-04-27T00:00:02.000Z', sourceKind: 'synthetic' }));
+
+    const corpus = new BundleCorpus(root);
+    expect(corpus.openSource('one').readSnapshot(0)).toEqual(snapshot(0).snapshot);
+    expect(corpus.loadBundle('one')).toEqual(new FileSink(join(root, 'one')).toBundle());
+    expect([...corpus].map((bundle) => bundle.metadata.sessionId)).toEqual(['one', 'two']);
+    expect(runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()]).bundleCount).toBe(1);
+  });
+});
