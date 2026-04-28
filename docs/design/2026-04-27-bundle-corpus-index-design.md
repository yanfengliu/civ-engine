# Bundle Search / Corpus Index - Design Spec

**Status:** Accepted v4 (2026-04-27 project-local date) with a plan-review type correction for `CorpusIndexErrorDetails` after `docs/reviews/bundle-corpus-index/2026-04-27/plan-1/`. Fresh Codex brainstorm completed before drafting. Design iteration 1 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-1/` for contract/API precision issues. Design iteration 2 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-2/` for the replay-horizon name, root-key encoding, attachment MIME query semantics, manifest-embedded attachment caveat, and error-detail shape. Design iteration 3 was rejected under `docs/reviews/bundle-corpus-index/2026-04-27/design-3/` for missing-key wording on the wrong API surface and non-canonical `recordedAt` handling. Design iteration 4 accepted this version under `docs/reviews/bundle-corpus-index/2026-04-27/design-4/`.

**Scope:** Tier-2 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 7). Builds on Session Recording / Replay (Spec 1), Synthetic Playtest Harness (Spec 3), and Behavioral Metrics over Corpus (Spec 8). v1 provides a disk-backed corpus/index that discovers closed FileSink bundle directories, lists and filters them from `manifest.json` metadata, and yields full `SessionBundle`s lazily for `runMetrics`.

**Author:** civ-engine team

**Related primitives:** `FileSink`, `SessionSource`, `SessionBundle`, `SessionMetadata`, `SessionRecordingError`, `runMetrics`, `SessionReplayer`.

## 1. Goals

This spec defines a first-class **bundle corpus index** that:

- Opens a local filesystem corpus root and discovers FileSink bundle directories by finding `manifest.json`.
- Builds a small in-memory index from each bundle's manifest: `schemaVersion`, `SessionMetadata`, attachment descriptors, and derived manifest-only fields.
- Lists and filters corpus entries without reading JSONL streams, snapshots, sidecar bytes, commands, ticks, events, or markers.
- Provides deterministic iteration order for both metadata entries and full bundle iteration.
- Implements `Iterable<SessionBundle>` semantics so existing `runMetrics(bundles, metrics)` workflows work unchanged against disk-resident corpora.
- Exposes explicit on-demand escape hatches (`entry.openSource()`, `entry.loadBundle()`) for consumers that need replayer/content access.
- Defines corpus behavior for finalized, immutable-on-disk bundle directories. Callers construct a new corpus after generation, deletion, or mutation.

The deliverable is an additive API surface. Existing `FileSink`, `SessionRecorder`, `SessionReplayer`, and `runMetrics` behavior remains unchanged.

## 2. Non-Goals

- **Content indexing in v1.** Queries over `commands.jsonl`, `ticks.jsonl`, events, markers, snapshots, sidecar attachment bytes, or metric outputs are out of scope. v1 query predicates are manifest-derived only. Explicit dataUrl attachments can still place bytes inside `manifest.json`; v1 reads those only as part of manifest parsing, not as a separate content index.
- **Metric-result indexing.** "Find bundles with high decision-point variance" requires either a game-defined metric pass or a future derived-summary index. v1 can feed matching bundles into `runMetrics`, but it does not persist metric summaries.
- **Persistent `corpus-index.json`.** The index is rebuilt from manifests at open time. A persisted cache creates invalidation, write coordination, and stale-index failure modes before the corpus is large enough to justify it.
- **Async / remote storage APIs.** v1 is synchronous and local-disk-only, matching FileSink and the engine's current synchronous session stack. A future `AsyncBundleCorpus` or `runMetricsAsync` can land when there is a real remote/backend storage pressure.
- **UI or viewer.** Standalone bundle viewer work remains Spec 4. This spec is a library/query surface only.
- **Retention, compaction, delete, archive, or mutation policies.** v1 reads finalized corpora; it does not mutate bundle directories.
- **Schema migration.** v1 accepts `SESSION_BUNDLE_SCHEMA_VERSION` only. Future bundle schema versions need an explicit migration/loading story.
- **Live writer detection.** v1 does not try to detect or exclude active `SessionRecorder` / `FileSink` writers. Callers are responsible for building a corpus only after writers close.

## 3. Background

Spec 3 can generate many `SessionBundle`s via `runSynthPlaytest`. Spec 8 can reduce an `Iterable<SessionBundle>` through `runMetrics`. The missing piece is a durable corpus source: today a caller either keeps bundles in memory or manually walks directories and calls `new FileSink(dir).toBundle()` for each one.

FileSink already defines the disk format:

```text
<bundleDir>/
  manifest.json
  ticks.jsonl
  commands.jsonl
  executions.jsonl
  failures.jsonl
  markers.jsonl
  snapshots/<tick>.json
  attachments/<id>.<ext>
```

`manifest.json` is the natural v1 index unit because it contains `schemaVersion`, `metadata`, and attachments. It is atomically rewritten at `open()`, successful snapshot writes, and `close()`. Reading manifests is cheap and does not force loading streams, snapshots, or sidecar bytes. FileSink defaults to sidecar attachments, but explicit dataUrl attachments embed bytes in the manifest and therefore increase manifest parse cost.

The current `SessionReplayer.fromSource(source)` and `FileSink.toBundle()` path eagerly materializes a full bundle. This spec does not change that. Instead, it gives callers an efficient manifest-only listing/filtering layer and keeps full bundle loading explicit and per-entry.

The important boundary is that the corpus indexes a closed/frozen file tree. A construction-time manifest index is deterministic only if bundle directories do not keep changing underneath it. `metadata.incomplete` remains a manifest fact about abnormal termination, not a reliable signal that a writer is still active.

## 4. Architecture Overview

New modules: `src/bundle-corpus.ts` (core `BundleCorpus` class and query logic), `src/bundle-corpus-types.ts` (public corpus types and `CorpusIndexError`), and `src/bundle-corpus-manifest.ts` (manifest-only validation/loading). Public consumers still import the surface from the root package; `src/bundle-corpus.ts` re-exports the type/error surface.

| Component | Responsibility |
| --- | --- |
| `BundleCorpus` | Opens a corpus root, scans for bundle manifests, stores a deterministic in-memory entry index, exposes `entries(query?)`, `bundles(query?)`, `get(key)`, `openSource(key)`, `loadBundle(key)`, and `[Symbol.iterator]`. |
| `BundleCorpusEntry` | Immutable metadata view for one bundle directory plus explicit `openSource()` and `loadBundle()` methods. |
| `BundleQuery` | Manifest-only filters over `SessionMetadata` and derived fields. |
| `CorpusIndexError` | `SessionRecordingError` subclass thrown for malformed manifests, unsupported schema versions, duplicate discovered keys, invalid query ranges, or missing keys when strict behavior is expected. |

Data flow:

```text
BundleCorpus(root)
  -> scan for manifest.json
  -> parse/validate manifest metadata
  -> derive index fields
  -> sort entries by canonical corpus order

entries(query)
  -> validate query
  -> filter in-memory manifest entries only
  -> return stable ordered entry array

bundles(query) / [Symbol.iterator]
  -> entries(query)
  -> for each entry: entry.loadBundle()
       -> new FileSink(entry.dir).toBundle()
       -> yields SessionBundle

runMetrics(corpus.bundles({ sourceKind: 'synthetic', incomplete: false }), metrics)
  -> unchanged Spec 8 reducer
```

## 5. API + Types

### 5.1 Construction

```ts
export type BundleCorpusScanDepth = 'root' | 'children' | 'all';

export interface BundleCorpusOptions {
  /**
   * How far discovery descends from rootDir. Default 'all'.
   * 'root' checks only rootDir.
   * 'children' checks rootDir and immediate child directories.
   * 'all' recursively checks rootDir and all non-symlink descendant directories.
   */
  scanDepth?: BundleCorpusScanDepth;
  /**
   * If false (default), the first invalid manifest aborts construction with CorpusIndexError.
   * If true, invalid manifests are recorded in corpus.invalidEntries and omitted from entries().
   */
  skipInvalid?: boolean;
}

export class BundleCorpus implements Iterable<SessionBundle> {
  constructor(rootDir: string, options?: BundleCorpusOptions);
  readonly rootDir: string;
  readonly invalidEntries: readonly InvalidCorpusEntry[];
  entries(query?: BundleQuery): readonly BundleCorpusEntry[];
  bundles(query?: BundleQuery): IterableIterator<SessionBundle>;
  get(key: string): BundleCorpusEntry | undefined;
  openSource(key: string): SessionSource;
  loadBundle<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(key: string): SessionBundle<TEventMap, TCommandMap, TDebug>;
  [Symbol.iterator](): IterableIterator<SessionBundle>;
}
```

The constructor performs manifest discovery synchronously. Construction is the only manifest scan. `entries()` and `bundles()` operate over that in-memory entry set; callers who want to see newly written bundles construct a new `BundleCorpus`.

`openSource(key)` and `loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'` when the key is not present. `get(key)` is the non-throwing lookup.

The `loadBundle` generics mirror `SessionBundle`'s static type parameters. They are caller assertions, just like passing a typed bundle into replay/metric helpers: `BundleCorpus` validates the FileSink manifest/schema and materializes bytes through `FileSink`, but it does not prove game-specific event, command, or debug payload schemas at runtime.

### 5.2 Entries

```ts
export interface BundleCorpusEntry {
  readonly key: string;
  readonly dir: string;
  readonly schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  readonly metadata: Readonly<SessionMetadata>;
  readonly attachmentCount: number;
  readonly attachmentBytes: number;
  readonly attachmentMimes: readonly string[];
  readonly hasFailures: boolean;
  readonly failedTickCount: number;
  readonly materializedEndTick: number;
  openSource(): SessionSource;
  loadBundle<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TDebug = JsonValue,
  >(): SessionBundle<TEventMap, TCommandMap, TDebug>;
}
```

`key` is the corpus-root-relative bundle directory path with `/` separators. If `rootDir` itself is a bundle, its key is exactly `'.'`. Descendant bundle keys never start with `./`; for example, `rootDir/a/b/manifest.json` yields `a/b`. `key` is the primary identity because `metadata.sessionId` can collide when bundles are copied or duplicated. `dir` is the absolute resolved directory path used by `FileSink`.

`materializedEndTick` is `metadata.incomplete === true ? metadata.persistedEndTick : metadata.endTick`. It is the manifest's incomplete-aware upper bound for persisted bundle content, not a guarantee that `SessionReplayer.openAt(materializedEndTick)` will succeed. Replay can still fail at or after `metadata.failedTicks`, when command payloads are missing, or when full bundle integrity checks fail. `SessionReplayer` remains the authority for actual replayability.

`metadata` is exposed as a frozen defensive copy. The implementation also copies and freezes `metadata.failedTicks` when present, then freezes the entry object. Callers cannot mutate the corpus index by mutating a returned entry.

### 5.3 Query

```ts
export type OneOrMany<T> = T | readonly T[];

export interface NumberRange {
  min?: number;
  max?: number;
}

export interface IsoTimeRange {
  from?: string;
  to?: string;
}

export interface BundleQuery {
  key?: string | RegExp;
  sessionId?: OneOrMany<string>;
  sourceKind?: OneOrMany<SessionMetadata['sourceKind']>;
  sourceLabel?: OneOrMany<string>;
  engineVersion?: OneOrMany<string>;
  nodeVersion?: OneOrMany<string>;
  incomplete?: boolean;
  durationTicks?: NumberRange;
  startTick?: NumberRange;
  endTick?: NumberRange;
  persistedEndTick?: NumberRange;
  materializedEndTick?: NumberRange;
  failedTickCount?: NumberRange;
  policySeed?: number | NumberRange;
  recordedAt?: IsoTimeRange;
  attachmentMime?: OneOrMany<string>;
}
```

All query fields are ANDed. `OneOrMany` scalar fields match if the entry value equals any requested value. Ranges are inclusive. A range with `min > max`, non-finite numeric bounds, or a non-integer tick bound throws `CorpusIndexError` with `details.code === 'query_invalid'`.

Optional manifest fields (`sourceLabel`, `policySeed`) match only when the entry has a defined value. A `policySeed` filter therefore selects seeded synthetic bundles and excludes non-synthetic bundles whose metadata has no seed.

`attachmentMime` matches if any MIME in `entry.attachmentMimes` equals any requested MIME. It is an any-match filter, not an exact-set or all-attachments filter.

`endTick`, `persistedEndTick`, and `materializedEndTick` are all exposed because they are distinct manifest/debugging facts. For "has persisted content through tick X" queries, use `materializedEndTick`; raw `endTick` can overstate the persisted range for finalized incomplete bundles. For actual replay, use `SessionReplayer.openAt()` and let it enforce failure and content-integrity constraints.

`recordedAt` filters use lexical comparison over normalized UTC ISO strings. Query bounds must be UTC ISO-8601 strings that round-trip through `new Date(value).toISOString()` and end in `Z`; any other form throws `CorpusIndexError` with `details.code === 'query_invalid'`. Current FileSink writers already emit this form.

`RegExp` on `key` is local-process-only convenience. Queries are not JSON-serialized in v1.

No function predicate is part of `BundleQuery`. Callers who need arbitrary conditions can use normal JavaScript on the returned array:

```ts
const longSynthetic = corpus.entries({ sourceKind: 'synthetic' })
  .filter((entry) => entry.metadata.durationTicks > 1000);
```

This keeps the engine API small and makes the manifest-only boundary obvious.

### 5.4 Errors

```ts
export type CorpusIndexErrorCode =
  | 'root_missing'
  | 'manifest_parse'
  | 'manifest_invalid'
  | 'schema_unsupported'
  | 'duplicate_key'
  | 'query_invalid'
  | 'entry_missing';

export interface CorpusIndexErrorDetails {
  readonly [key: string]: JsonValue;
  readonly code: CorpusIndexErrorCode;
  readonly path: string | null;
  readonly key: string | null;
  readonly message: string | null;
}

export class CorpusIndexError extends SessionRecordingError {
  override readonly details: CorpusIndexErrorDetails;
}

export interface InvalidCorpusEntry {
  readonly path: string;
  readonly error: CorpusIndexError;
}
```

Default construction is strict: invalid manifests throw. With `skipInvalid: true`, invalid manifests are collected in `invalidEntries`, omitted from `entries()`, and do not affect iteration. Full bundle load failures from malformed JSONL or missing snapshots are not swallowed; they surface when `loadBundle()` or `bundles()` reaches that entry. Sidecar-byte integrity is different: `FileSink.toBundle()` does not read sidecar payloads, so missing sidecar bytes surface only when a caller dereferences them through `SessionSource.readSidecar(id)` or equivalent source-level access.

`details.code` is the public discriminator, following the existing session-recording error discipline. `details.path`, `details.key`, `details.message`, and other fields are JSON-shaped information that can be logged or serialized without carrying raw filesystem handles or exception objects. Optional human fields use `null` when absent so the overridden `details` property remains assignable to the existing `SessionRecordingError.details: JsonValue | undefined` contract.

## 6. Lifecycle / Contracts

`BundleCorpus` is a snapshot of a closed/frozen corpus at construction time. It does not watch the filesystem. It also does not copy bundle streams or snapshots into memory during construction. This is intentional: deterministic analysis and CI should operate over a stable set of files. Callers create a new corpus object after generating, deleting, or mutating bundles.

Active writers are unsupported in v1. A bundle directory being written by `SessionRecorder` or `FileSink` can have a manifest that is atomically readable while JSONL streams and snapshots are still changing. `BundleCorpus` does not detect that state and does not guarantee consistent `entries()` / `loadBundle()` behavior for it. Generators should close sinks before constructing the corpus.

Construction contract:

1. Resolve `rootDir` to an absolute directory path.
2. If root does not exist or is not a directory, throw `CorpusIndexError` with `details.code === 'root_missing'`.
3. Discover `manifest.json` files according to `scanDepth`.
4. Do not follow symlinks or Windows junctions during discovery. Directory symlinks are skipped.
5. Stop descending into a directory once it is identified as a bundle directory by a direct `manifest.json`.
6. Parse each manifest as JSON.
7. Validate `schemaVersion === SESSION_BUNDLE_SCHEMA_VERSION`, `metadata` shape, `metadata.recordedAt` normalized UTC `Z` form, and `attachments` array shape. Non-canonical `recordedAt` values are `manifest_invalid` because canonical ordering and time filters depend on lexical UTC ISO comparison.
8. Derive manifest-only fields.
9. Sort entries in canonical order.

`scanDepth` semantics:

- `'root'`: check only `rootDir` itself. Use this when the root is a single bundle directory.
- `'children'`: check `rootDir` and its immediate non-symlink child directories. Use this for a flat corpus where each child is one bundle.
- `'all'`: recursively check `rootDir` and all non-symlink descendants. This is the default for nested corpus trees.

Discovery should not descend into a directory after it has found a `manifest.json` in that directory. A bundle's `snapshots/` and `attachments/` subdirectories are not separate corpus roots.

Key derivation is deterministic. The root bundle key is `'.'`; descendant keys are slash-separated relative paths with no leading `./`. Backslashes from Windows paths are normalized to `/`.

Canonical order is:

```text
metadata.recordedAt ASC, metadata.sessionId ASC, key ASC
```

String comparisons use JavaScript code-unit order (`<` / `>`) rather than locale collation so CI output is stable across host locales. This order is deterministic for a stable corpus and useful for human reading. The `key` tiebreaker closes timestamp/session collisions.

## 7. Bundle Format Integration

Spec 7 composes with FileSink's existing format. It does not add files to a bundle directory and does not require FileSink to write index-specific sidecars.

`BundleCorpusEntry.openSource()` returns `new FileSink(entry.dir)` typed as `SessionSource`. `FileSink` already reloads `manifest.json` in its constructor and implements the read-side methods. `BundleCorpusEntry.loadBundle()` returns `entry.openSource().toBundle()` with the caller-asserted generic type applied at the corpus boundary. This preserves the single source of truth for full bundle materialization: FileSink owns bundle loading.

The manifest may contain dataUrl attachment bytes when a caller explicitly opted into manifest embedding. `BundleCorpus` still treats those as manifest bytes: it parses descriptors and derives MIME/count/size metadata, but it does not decode, inspect, or index the embedded payload.

Manifest-derived fields:

- `schemaVersion`: from manifest.
- `metadata`: frozen defensive copy of `SessionMetadata`; `failedTicks` is copied and frozen when present.
- `attachmentCount`: `manifest.attachments.length`.
- `attachmentBytes`: sum of `attachments[].sizeBytes`.
- `attachmentMimes`: sorted unique `attachments[].mime` values.
- `hasFailures`: `(metadata.failedTicks?.length ?? 0) > 0`.
- `failedTickCount`: `metadata.failedTicks?.length ?? 0`.
- `materializedEndTick`: finalized-manifest, incomplete-aware upper bound for persisted content.

Content-derived fields are intentionally absent. For example, command type counts belong either in Spec 8 metrics or in a later content-summary index.

## 8. Determinism

Filesystem enumeration order is not portable. `BundleCorpus` sorts entries using the canonical order above before exposing them. `entries(query)` and `bundles(query)` preserve that order after filtering. `[Symbol.iterator]` delegates to `bundles()` with no query.

This matters for user-defined metrics marked `orderSensitive: true`. Spec 8's built-ins are order-insensitive, but the corpus should still offer stable iteration so order-sensitive user metrics can opt into a deterministic disk-backed source.

Symlinks/junctions are skipped rather than followed. This avoids platform-specific traversal and symlink-loop behavior, and it keeps discovery bounded by the real directory tree under `rootDir`.

Volatile metadata remains volatile. The corpus can query `sessionId` and `recordedAt`, but it does not normalize or hide them. Built-in metrics still avoid volatile fields.

## 9. CI Pattern

```ts
import {
  BundleCorpus,
  runMetrics,
  bundleCount,
  sessionLengthStats,
  commandValidationAcceptanceRate,
} from 'civ-engine';

const corpus = new BundleCorpus('artifacts/synth-corpus');

const current = runMetrics(
  corpus.bundles({ sourceKind: 'synthetic', incomplete: false }),
  [
    bundleCount(),
    sessionLengthStats(),
    commandValidationAcceptanceRate(),
  ],
);

console.log(corpus.entries({ failedTickCount: { min: 1 } }).map((entry) => entry.key));
console.log(current);
```

For replay investigation:

```ts
const failed = corpus.entries({ failedTickCount: { min: 1 } })[0];
if (!failed) {
  throw new Error('no failed bundle matched the query');
}
const source = failed.openSource();
const replayer = SessionReplayer.fromSource(source, { worldFactory });
const firstFailure = failed.metadata.failedTicks![0];
if (firstFailure <= failed.metadata.startTick) {
  throw new Error('failure occurred at the first recorded tick; inspect snapshots directly');
}
const beforeFailure = firstFailure - 1;
const world = replayer.openAt(beforeFailure);
```

For bundles without recorded failures, `entry.materializedEndTick` is the manifest-derived upper bound to try first. `SessionReplayer.openAt()` still owns the final replayability decision because it also checks command payloads and full bundle integrity.

For custom metadata filters:

```ts
const longRuns = corpus.entries({ sourceKind: 'synthetic' })
  .filter((entry) => entry.metadata.durationTicks >= 1000);
const longRunMetrics = runMetrics(longRuns.map((entry) => entry.loadBundle()), [bundleCount()]);
```

`Array.prototype.map` is fine here because `entries()` returns an in-memory entry array. For very large corpora, use a generator around entries to avoid materializing bundles:

```ts
function* bundlesFor(entries: readonly BundleCorpusEntry[]) {
  for (const entry of entries) yield entry.loadBundle();
}
```

## 10. Performance

Construction cost is O(number of directories visited + number of manifests). No JSONL streams, snapshot files, or sidecar bytes are read during construction or `entries()`. Each manifest parse is usually small and bounded by metadata plus attachment descriptors because FileSink defaults attachments to sidecars; explicit dataUrl attachments are embedded in `manifest.json` and can make manifest parsing larger.

`entries(query)` is O(number of indexed entries) and allocation-light: it returns a new array of existing frozen entry objects. `bundles(query)` is O(number of matching entries) plus full bundle load cost per yielded entry. Because `loadBundle()` delegates to `FileSink.toBundle()`, full bundle memory cost is exactly today's eager bundle materialization cost, paid one bundle at a time by generator consumers.

No persisted index cache ships in v1. If corpus construction becomes a measured bottleneck, a future spec can add `writeCorpusIndex()` with explicit invalidation fields (manifest mtime, size, and schema version). Until then, rebuilding from manifests is simpler and less fragile.

Skipping symlinks is also a performance guard: recursive discovery never traverses a linked external tree or loop.

## 11. Testing Strategy

Unit and integration tests target:

- **Discovery:** root itself can be a bundle with key `'.'`; flat child bundles are found with `scanDepth: 'children'`; recursive nested bundles are found with `scanDepth: 'all'`; `scanDepth: 'root'` skips children; `scanDepth: 'children'` skips grandchildren.
- **Symlink handling:** directory symlinks or junction-like entries are skipped and do not produce duplicate entries or recursive loops where the platform/test environment supports symlink creation.
- **Stable ordering:** files created in arbitrary order still produce entries sorted by canonical `recordedAt`, then `sessionId`, then `key`.
- **Manifest-only listing:** `entries()` does not read JSONL streams or snapshots. A bundle with a valid manifest but malformed `ticks.jsonl` still appears in `entries()`, and the malformed stream error surfaces only when `loadBundle()` is called.
- **Sidecar boundary:** a bundle with a manifest-sidecar descriptor but missing sidecar bytes can still be listed and loaded as a `SessionBundle`; the missing bytes surface only when `readSidecar(id)` is called on the opened source.
- **Query filters:** each built-in filter shape has coverage: exact `sourceKind`, optional `sourceLabel`, `incomplete`, numeric ranges, `policySeed`, normalized `recordedAt`, `attachmentMime`, and `failedTickCount`. Combined filters are ANDed.
- **Attachment MIME matching:** `attachmentMime` matches when any entry MIME equals any requested MIME; multi-attachment bundles prove it is not all-match or exact-set matching.
- **Optional field semantics:** `policySeed` and `sourceLabel` filters exclude entries where the field is undefined.
- **Tick horizon guidance:** `materializedEndTick` equals `persistedEndTick` for finalized incomplete bundles and `endTick` for complete bundles; raw `endTick` remains queryable but does not replace the materialized-content field. Recorded failures remain a replay-level constraint enforced by `SessionReplayer`.
- **Invalid queries:** non-finite numeric ranges, `min > max`, non-integer tick bounds, and non-UTC-Z `recordedAt` bounds throw `CorpusIndexError` with `details.code === 'query_invalid'`.
- **Invalid manifests:** strict mode throws `CorpusIndexError`; `skipInvalid: true` records `invalidEntries` and omits bad entries. Non-canonical `metadata.recordedAt` is covered as `manifest_invalid`.
- **Missing keys:** `corpus.get(key)` returns `undefined`; `corpus.openSource(key)` and `corpus.loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'`.
- **Error taxonomy:** `CorpusIndexError` is an `instanceof SessionRecordingError` and preserves JSON-shaped details with the discriminator at `details.code`.
- **FileSink integration:** `entry.openSource()` reads snapshots and sidecars through FileSink; `entry.loadBundle()` matches `new FileSink(dir).toBundle()` for full bundle materialization.
- **runMetrics integration:** `runMetrics(corpus.bundles(query), metrics)` produces the same result as `runMetrics(matchingEntries.map((e) => e.loadBundle()), metrics)`.
- **Defensive entry surface:** mutation attempts against returned entries, metadata, or `failedTicks` cannot affect subsequent `entries()` results.
- **Closed-corpus contract:** tests should document the boundary by constructing corpora only after sinks close. v1 does not test live-writer detection because the feature explicitly does not exist.

Tests should create real temporary FileSink bundle directories, not hand-written partial shapes except for malformed-manifest, malformed-stream, and sidecar-boundary cases.

## 12. Doc Surface

Per AGENTS.md, implementation updates:

- `docs/api-reference.md`: new `## Bundle Corpus Index (v0.8.3)` section for `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleCorpusMetadata`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`.
- `docs/guides/bundle-corpus-index.md`: quickstart, metadata query guide, `runMetrics` integration, replay investigation example, closed-corpus contract, incomplete-bundle behavior, sidecar boundary, scan-depth behavior, limitations.
- `docs/guides/behavioral-metrics.md`: replace in-memory-only corpus examples with a disk-backed `BundleCorpus` example.
- `docs/guides/session-recording.md`: add a short "Indexing FileSink bundles" section.
- `docs/guides/ai-integration.md`: add Spec 7 as Tier-2 corpus query surface.
- `docs/guides/concepts.md`: add `BundleCorpus` to the standalone utilities list.
- `README.md`: Feature Overview row, Public Surface bullet, and version badge update.
- `docs/README.md`: guide index entry.
- `docs/architecture/ARCHITECTURE.md`: Component Map row and Boundaries paragraph for Bundle Corpus.
- `docs/architecture/drift-log.md`: append a row.
- `docs/architecture/decisions.md`: append ADRs 28-31.
- `docs/design/ai-first-dev-roadmap.md`: update Spec 7 status when implemented.
- `docs/changelog.md`, `docs/devlog/summary.md`, latest detailed devlog, `package.json`, `src/version.ts`: v0.8.3 additive release entry.

The implementation plan must include the mandatory doc audit: grep or doc-review for stale/removed names and verify canonical docs mention the new API. Stale references in historical changelog/devlog/drift-log entries are allowed; current guides, README, and API reference must reflect the implementation.

The code-review prompt must include: "verify docs in the diff match implementation; flag stale signatures, removed APIs still mentioned, or missing coverage of new APIs in canonical guides."

## 13. Versioning

Current base is v0.8.2. Spec 7 v1 is additive and non-breaking:

- New `BundleCorpus` subsystem.
- New public types and error class.
- No changes to existing unions.
- No changes to `FileSink`, `SessionSource`, `SessionBundle`, or `runMetrics` signatures.

Ship as v0.8.3 (`c` bump). One coherent implementation commit should include code, tests, docs, ADRs, roadmap status, changelog, devlog, README badge, API reference, doc audit evidence, and version bump.

## 14. ADRs

### ADR 28: Bundle corpus is manifest-first over closed FileSink directories

**Decision:** v1 builds its in-memory index by scanning `manifest.json` files at `BundleCorpus` construction time. It does not write or read a persisted `corpus-index.json`, and it is supported only for closed/frozen bundle directories.

**Rationale:** Manifest scan is simple, deterministic, and uses the existing FileSink contract. A secondary database creates invalidation and stale-index risks before the corpus size proves it is needed. Active-writer detection would require a new FileSink lifecycle marker or lock contract; v1 avoids that by making corpus construction a post-generation step. Future cached index or live-writer work can be explicit and benchmark-driven.

### ADR 29: Corpus composes with `runMetrics` via `Iterable<SessionBundle>`

**Decision:** `BundleCorpus` exposes `bundles(query?)` and `[Symbol.iterator]()` as synchronous `IterableIterator<SessionBundle>`.

**Rationale:** Spec 8 already accepts `Iterable<SessionBundle>`. Changing `runMetrics` or adding a parallel metrics-specific corpus API would duplicate the iteration boundary. Disk-backed corpora should look like any other bundle iterable to metrics code.

### ADR 30: Canonical corpus order is recordedAt, sessionId, key

**Decision:** Entries are sorted by `metadata.recordedAt`, then `metadata.sessionId`, then canonical `key` before any public listing or bundle iteration. The root bundle key is `'.'`; descendants use slash-separated relative paths without a leading `./`.

**Rationale:** Filesystem order differs across platforms. Stable ordering makes order-sensitive user metrics deterministic and makes CI output diff-friendly. `key` is the final tiebreaker because session IDs can collide when bundles are copied. Defining the root key avoids observable API divergence between `'.'`, `''`, and basename encodings.

### ADR 31: v1 query scope is manifest-derived only

**Decision:** `BundleQuery` filters only fields present in `manifest.json` or derived directly from manifest metadata/attachments. It does not include content-derived command/event/marker/snapshot predicates.

**Rationale:** Content queries over commands, events, ticks, markers, snapshots, and metrics require reading larger streams or maintaining a secondary summary index. Mixing that into v1 would either violate the lightweight-listing goal or smuggle in a database. Manifest-only query is the minimal useful surface that unblocks disk-backed metrics and metadata triage.

## 15. Open Questions

1. **Should `recordedAt` query accept `Date` objects?** v1 uses normalized UTC ISO strings only to keep the query type JSON-clean and timezone-explicit. Callers can pass `date.toISOString()`.
2. **Should `entries()` return an array or an iterator?** v1 returns `readonly BundleCorpusEntry[]` because the index is already in memory and array filtering/slicing is ergonomic. `bundles()` remains a generator to avoid loading full bundles all at once.
3. **Should BundleCorpus expose content helper methods like `markers(query)`?** Deferred. The first content query should be designed with real caller pressure and likely belongs to a secondary summary layer.
4. **Should invalid entries be exposed in strict mode?** Strict mode throws immediately, so there is no constructed corpus. `skipInvalid: true` is the diagnostic mode with `invalidEntries`.
5. **Should FileSink add a durable "closed" marker?** Deferred. v1 documents the closed-corpus requirement without modifying FileSink. If live-writer mistakes become common, a later spec can add explicit lifecycle state to the disk format.

## 16. Future Specs

| Future Spec | What it adds |
| --- | --- |
| Spec 4: Standalone Bundle Viewer | Uses `BundleCorpus.entries()` to populate a bundle picker, then `entry.openSource()` / `SessionReplayer` to inspect timelines. |
| Future: Content Summary Index | Optional derived summaries over markers, command/event types, tick failure phases, and metric outputs. Persisted with explicit invalidation. |
| Future: Async Corpus | `AsyncBundleCorpus` and `runMetricsAsync` for remote/object-store or very large local corpora. |
| Future: Corpus Retention | Delete/archive policies by age, source kind, label, failure status, and size. |
| Future: Live Bundle Discovery | FileSink lifecycle marker or lock-file contract so corpus construction can safely exclude active writers. |
| Future: StopReason Persistence | If Spec 3 persists `stopReason` into metadata, BundleQuery can add a manifest-only `stopReason` filter. |

## 17. Acceptance Criteria

- `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleCorpusMetadata`, `BundleQuery`, `OneOrMany`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, `InvalidCorpusEntry`, and supporting types are exported from `src/index.ts`.
- Corpus construction discovers closed FileSink bundle directories from a root, validates manifests, skips symlinks, honors `scanDepth`, derives `'.'` for a root-bundle key, and exposes stable sorted entries.
- `entries(query?)` filters without reading JSONL streams, snapshots, or sidecar bytes.
- Query validation rejects invalid numeric ranges and non-normalized `recordedAt` bounds.
- Optional manifest-field filters have defined missing-value behavior.
- `attachmentMime` any-match behavior is covered by a multi-attachment test.
- `bundles(query?)` and `[Symbol.iterator]` yield full `SessionBundle`s lazily, one entry at a time, via FileSink.
- `entry.openSource()` and `entry.loadBundle()` compose with `SessionReplayer` and `FileSink.toBundle()`.
- `corpus.get(key)` returns `undefined`, while `corpus.openSource(key)` and `corpus.loadBundle(key)` throw `CorpusIndexError` with `details.code === 'entry_missing'` for missing keys.
- `runMetrics(corpus.bundles(query), metrics)` works and is covered by tests.
- Invalid manifest handling has strict and `skipInvalid` coverage, including non-canonical `metadata.recordedAt`.
- Incomplete-bundle `materializedEndTick` behavior is covered and documented as a manifest materialization horizon, not as a replay guarantee.
- Explicit dataUrl attachment bytes embedded in `manifest.json` are documented as part of manifest parse cost, not as a separate content index.
- Sidecar-byte integrity is documented and tested as source-level/on-demand, not `loadBundle()` validation.
- Defensive metadata freezing/copying is covered by tests.
- Docs, ADRs, roadmap, changelog, devlog, README badge, API reference, doc audit evidence, and version bump land in the same commit as code.
- All four engine gates pass: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Multi-CLI design, plan, and code reviews converge per AGENTS.md.
