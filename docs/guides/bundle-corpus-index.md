# Bundle Corpus Index

`BundleCorpus` turns a closed directory tree of `FileSink` session bundles into a deterministic, metadata-first query surface. It is the Spec 7 bridge between disk-resident corpora and consumers like `runMetrics`, `SessionReplayer`, and future bundle viewers.

## Quickstart

```typescript
import {
  BundleCorpus,
  bundleCount,
  commandValidationAcceptanceRate,
  runMetrics,
  sessionLengthStats,
} from 'civ-engine';

const corpus = new BundleCorpus('artifacts/playtests', { scanDepth: 'all' });

const synthetic = corpus.entries({
  sourceKind: 'synthetic',
  policySeed: { min: 1000, max: 1999 },
});

console.log(synthetic.map((entry) => ({
  key: entry.key,
  ticks: entry.metadata.durationTicks,
  failures: entry.failedTickCount,
})));

const metrics = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
  bundleCount(),
  sessionLengthStats(),
  commandValidationAcceptanceRate(),
]);
```

`entries()` reads only `manifest.json` files and derived manifest metadata. `bundles()` loads full bundles lazily, one iterator step at a time.

## Metadata Queries

All `BundleQuery` fields are ANDed. Scalar-or-array fields use `OneOrMany<T>`, so `sourceKind: ['scenario', 'synthetic']` matches either value. Missing optional manifest fields do not match requested values: `sourceLabel: 'random'` excludes entries without `metadata.sourceLabel`.

Useful filters:

- `key`: exact key string or `RegExp` over slash-normalized corpus keys.
- `sourceKind`, `sourceLabel`, `sessionId`, `engineVersion`, `nodeVersion`: manifest metadata equality.
- `durationTicks`, `startTick`, `endTick`, `persistedEndTick`, `materializedEndTick`, `failedTickCount`, `policySeed`: inclusive integer ranges.
- `recordedAt`: normalized UTC ISO string range.
- `attachmentMime`: any-match over manifest attachment MIME descriptors.
- `incomplete`: `true` for recorder-terminated bundles; `false` for entries where `metadata.incomplete !== true`.

The result order is always `recordedAt`, then `sessionId`, then `key`, using JavaScript code-unit string ordering.

Malformed JavaScript query shapes throw `CorpusIndexError` with code `query_invalid`, so callers can branch on one stable error code for invalid ranges, invalid ISO bounds, wrong scalar/list types, and invalid `key` filters.

## Behavioral Metrics Integration

`BundleCorpus` implements `Iterable<SessionBundle>`, and `corpus.bundles(query)` returns an `IterableIterator<SessionBundle>`. That means Spec 8 can reduce disk corpora without materializing an array first:

```typescript
const result = runMetrics(corpus.bundles({ sourceKind: 'synthetic' }), [
  bundleCount(),
  sessionLengthStats(),
]);
```

The iterable is lazy but single-use like any generator. Create a fresh `corpus.bundles(query)` for each independent metrics run.

## Replay Investigation

Use `entry.openSource()` when you want a `SessionSource` for `SessionReplayer.fromSource()` or direct stream/snapshot reads:

```typescript
import { BundleCorpus, SessionReplayer } from 'civ-engine';

const corpus = new BundleCorpus('artifacts/playtests');
const entry = corpus.entries({ failedTickCount: { min: 1 } })[0];
const replayer = SessionReplayer.fromSource(entry.openSource(), { worldFactory });
```

Use `entry.loadBundle()` or `corpus.loadBundle(key)` when you want the whole JSON bundle in memory.

## Scan Depth

`scanDepth` controls where bundle directories can live:

- `'root'`: only `rootDir` itself.
- `'children'`: `rootDir` and direct child directories.
- `'all'`: recursive descendants; this is the default.

If a directory contains a direct regular-file `manifest.json`, the scanner treats it as a bundle and does not descend further. That means a root bundle produces key `'.'` and prevents child discovery even when `scanDepth` is `'children'` or `'all'`. An explicit symlink or junction supplied as `rootDir` is accepted and `rootDir`/`entry.dir` preserve the caller-supplied path. Symlinked directories and symlinked `manifest.json` files discovered during traversal are skipped.

## Closed Corpus Contract

`BundleCorpus` is designed for closed/frozen `FileSink` bundle directories. Build the corpus after writers have closed their sinks. It does not lock directories, detect active writers, or maintain a persisted `corpus-index.json`.

Strict mode throws on the first invalid manifest. With `{ skipInvalid: true }`, invalid manifests are skipped and exposed through `corpus.invalidEntries` for diagnostics.

## Incomplete Bundle Behavior

`entry.materializedEndTick` describes the persisted-content horizon:

- complete bundle: `metadata.endTick`
- incomplete bundle: `metadata.persistedEndTick`

This is not a replay guarantee. Replay validity still depends on snapshots, failed ticks, command payloads, and the normal `SessionReplayer` range/integrity checks.

## Sidecar Boundary

Listing and full-bundle loading validate manifest descriptors but do not read sidecar bytes. This keeps metadata queries lightweight and lets missing/corrupt sidecars fail only when a caller explicitly asks for bytes via `readSidecar(id)`.

## Embedded dataUrl Attachment Cost

Attachments stored as `dataUrl` are embedded in `manifest.json`, so their bytes are part of manifest parse cost. The corpus index does not decode them or build a content index from them.

## Limitations

- Queries are manifest-derived only. Command/event/marker/snapshot predicates are deferred to a future content summary index.
- The API is synchronous and local-filesystem oriented. Remote/object-store corpora belong to a future async corpus surface.
- No retention, deletion, compaction, or live-writer coordination is provided in v1.

## See Also

- `docs/guides/session-recording.md` for `FileSink` and `SessionReplayer`.
- `docs/guides/behavioral-metrics.md` for `runMetrics` over a bundle iterable.
- `docs/design/2026-04-27-bundle-corpus-index-design.md` for the accepted Spec 7 design.
