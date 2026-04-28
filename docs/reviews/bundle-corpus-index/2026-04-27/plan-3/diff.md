diff --git a/docs/design/2026-04-27-bundle-corpus-index-design.md b/docs/design/2026-04-27-bundle-corpus-index-design.md
new file mode 100644
index 0000000..f456c60
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
+New module: `src/bundle-corpus.ts`.
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
+This order is deterministic for a stable corpus and useful for human reading. The `key` tiebreaker closes timestamp/session collisions.
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
index 0000000..8313630
--- /dev/null
+++ b/docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md
@@ -0,0 +1,1040 @@
+# Bundle Corpus Index Implementation Plan
+
+> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
+
+**Plan revision:** v3 (2026-04-27) - fixes plan-review iteration 2 findings from `docs/reviews/bundle-corpus-index/2026-04-27/plan-2/`: type-compatible frozen `failedTicks`, explicit failedTicks immutability coverage, explicit `incomplete` query coverage, and final-state doc audit after devlog updates.
+
+**Goal:** Implement Spec 7: Bundle Search / Corpus Index as a disk-backed manifest-first `BundleCorpus` that indexes closed FileSink bundle directories, filters metadata without loading content streams, and yields `SessionBundle`s lazily for `runMetrics`.
+
+**Architecture:** Add one focused module, `src/bundle-corpus.ts`, that owns filesystem discovery, manifest validation, immutable entry construction, query validation/filtering, and FileSink-backed bundle/source loading. The new module composes with existing session recording, FileSink, SessionReplayer, and behavioral metrics without changing their signatures.
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
+- Create `src/bundle-corpus.ts`: public corpus API, query helpers, manifest validation, error class, immutable entries, FileSink integration.
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
+- Create: `src/bundle-corpus.ts`
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
+- [ ] Create `src/bundle-corpus.ts` with the public API and helpers below. Keep the module self-contained; do not modify FileSink, SessionSource, SessionBundle, SessionReplayer, or runMetrics.
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
+      .sort((a, b) => a.localeCompare(b));
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
+  const attachmentMimes = Object.freeze([...new Set(manifest.attachments.map((attachment) => attachment.mime))].sort((a, b) => a.localeCompare(b)));
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
+  return a.metadata.recordedAt.localeCompare(b.metadata.recordedAt)
+    || a.metadata.sessionId.localeCompare(b.metadata.sessionId)
+    || a.key.localeCompare(b.key);
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
+- [ ] Modify `docs/guides/behavioral-metrics.md` by adding a disk-backed example using `runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [bundleCount()])`.
+- [ ] Modify `docs/guides/session-recording.md` by adding an "Indexing FileSink bundles" subsection that says `BundleCorpus` reads manifests only during listing and that callers should build the corpus after sinks close.
+- [ ] Modify `docs/guides/ai-integration.md` by adding Spec 7 to the Tier-2 AI-first workflow between synthetic playtest generation and behavioral metrics reduction.
+- [ ] Modify `docs/guides/concepts.md` by adding `BundleCorpus` to standalone utilities with a one-sentence manifest-first description.
+- [ ] Modify `docs/README.md` by adding a `bundle-corpus-index.md` guide link.
+- [ ] Modify `docs/architecture/ARCHITECTURE.md` by adding a Component Map row for `src/bundle-corpus.ts` and a Boundaries paragraph that says the subsystem reads manifests, does not mutate FileSink bundle directories, and delegates full loading to FileSink.
+- [ ] Append a row to `docs/architecture/drift-log.md` for 2026-04-27: "Added manifest-first BundleCorpus subsystem" with reason "Spec 7 unblocks disk-resident corpora for metrics and bundle triage."
+- [ ] Append ADRs 28-31 from `docs/design/2026-04-27-bundle-corpus-index-design.md` to `docs/architecture/decisions.md` without deleting existing ADRs.
+- [ ] Modify `docs/design/ai-first-dev-roadmap.md` to mark Spec 7 as implemented in v0.8.3 and note that it provides disk-backed bundle listing/filtering for Spec 8.
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
