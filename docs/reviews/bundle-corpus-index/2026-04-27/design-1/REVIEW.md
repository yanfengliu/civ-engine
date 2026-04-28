# Spec 7 (Bundle Corpus Index) - Design Iteration 1 Review Synthesis

**Iteration:** design-1. **Subject:** `docs/design/2026-04-27-bundle-corpus-index-design.md` v1. **Reviewers:** Codex, Codex-2, Opus.

**Verdict:** REJECT - re-spin to v2 required. Reviewers converged that the manifest-first corpus shape is sound and composes with `FileSink`, `SessionSource`, `SessionBundle`, `SessionReplayer`, and `runMetrics`. The blockers are contract/API precision issues that would produce ambiguous or incorrect implementation behavior if left unresolved.

Note: the raw Codex review files contain startup/plugin and analytics warning noise from the CLI harness. The final verdict blocks are present near the end of each raw file and are the source for this synthesis.

## High Findings

### H-LIVE-CORPUS - Snapshot and replayable-end contracts overstate live bundle safety

Codex HIGH. The design treats `metadata.incomplete` and `replayableEndTick = incomplete ? persistedEndTick : endTick` as reliable manifest-only completeness signals while also describing `BundleCorpus` as a stable snapshot. Current `SessionRecorder` only marks `metadata.incomplete` on sink-failure termination, not while a recording is still open. A live bundle can rewrite `manifest.json` while JSONL streams and snapshots are still changing, and `entry.loadBundle()` reopens `FileSink` against current disk state rather than the construction-time metadata snapshot.

**Fix in v2:** Scope v1 to closed/frozen bundles. State that `BundleCorpus` does not detect active writers and behavior is unsupported when bundle directories mutate after corpus construction. Keep `replayableEndTick` as a manifest-derived helper for finalized manifests, not as live-writer detection.

### H-LOAD-BUNDLE-TYPING - Generic loadBundle surface is not valid against SessionBundle constraints

Codex-2 HIGH. `loadBundle<TEventMap, TCommandMap, TDebug>` is under-constrained relative to `SessionBundle` generics, while `SessionSource.toBundle()` is unparameterized. As written, the design either will not compile or implies runtime type validation that does not exist.

**Fix in v2:** Constrain generic parameters exactly like `SessionBundle` and document them as caller-asserted static typing over a bundle whose manifest/disk bytes are not schema-validated by `BundleCorpus`.

## Medium Findings

### M-SIDECAR-INTEGRITY - loadBundle does not validate sidecar bytes

Codex MED. The design says missing sidecar bytes surface when `loadBundle()` or `bundles()` reaches an entry. Current `FileSink.toBundle()` carries `AttachmentDescriptor`s and does not read sidecar payloads. Missing sidecar files fail only through `SessionSource.readSidecar(id)` or equivalent sidecar dereference.

**Fix in v2:** State that `loadBundle()` validates manifest/JSONL/snapshot materialization only; sidecar-byte integrity remains source-level and on-demand.

### M-SCAN-DEPTH - recursive false semantics are misleading

Opus finding 1. `recursive: false` was documented as checking root plus immediate children, which is depth 1 rather than the natural "root only" interpretation. This would surprise callers opening a single bundle root.

**Fix in v2:** Replace the boolean with an explicit `scanDepth?: 'root' | 'children' | 'all'`, defaulting to `'all'`.

### M-MISSING-OPTIONAL-QUERY - Optional manifest fields lack missing-value semantics

Opus finding 2. `policySeed` exists only on synthetic metadata, and `sourceLabel` is also optional. The query rules need to say how filters behave when a field is absent.

**Fix in v2:** Document that filters over optional fields match only entries with defined values, so `policySeed` filters naturally select synthetic bundles with a seed. Add test coverage.

### M-TICK-FILTER-GUIDANCE - endTick/persistedEndTick/replayableEndTick need user guidance

Opus finding 3. The query includes three tick upper-bound fields whose meanings diverge for incomplete bundles. Without guidance, callers may use `endTick` when they intend the replayable/analyzable horizon.

**Fix in v2:** Keep the raw fields for metadata diagnostics but document that `replayableEndTick` is the preferred filter for "can replay/analyze through tick X".

### M-METADATA-IMMUTABILITY - Defensive entry surface is internally inconsistent

Codex-2 MED. Freezing the entry object does not freeze the nested `metadata` object or `failedTicks` array. If entry objects are reused, caller mutation through casts can poison future `entries()` results.

**Fix in v2:** Specify that metadata is stored as a frozen defensive copy and `failedTicks` is copied and frozen. Test that mutation attempts do not affect subsequent reads.

### M-ERROR-TAXONOMY - CorpusIndexError should extend SessionRecordingError

Codex-2 MED. A corpus index over `FileSink` bundles belongs in the existing session-recording error taxonomy. A bare `Error` would break catch-all `instanceof SessionRecordingError` handling and the existing JSON-shaped details convention.

**Fix in v2:** Define `CorpusIndexError extends SessionRecordingError` with JSON-shaped `details`.

### M-RECORDED-AT-NORMALIZATION - Timestamp query validation must reject non-Z forms

Opus finding 5. Parseable timestamps are not enough for lexical comparison. Query bounds like `+05:00` timestamps can compare incorrectly against current UTC `Z` manifest values.

**Fix in v2:** Require `recordedAt` query bounds to be normalized UTC ISO strings ending in `Z`; reject other forms with `query_invalid`.

### M-MISSING-KEY - openSource/loadBundle missing-key behavior is underspecified

Opus finding 7. `get(key)` returns `undefined`, but `openSource(key)` and `loadBundle(key)` do not state what happens when a key is missing despite the `entry_missing` code existing.

**Fix in v2:** State that `openSource(key)` and `loadBundle(key)` throw `CorpusIndexError(code: 'entry_missing')`.

### M-SYMLINKS - Recursive discovery needs deterministic symlink behavior

Opus finding 8. Recursive descent does not mention symlinks or junctions, which can introduce loops or platform-specific inclusion behavior.

**Fix in v2:** Do not follow symlinks/junctions during discovery; skip directory symlinks and test that behavior.

### M-DOC-CHECKLIST - Mandatory docs checklist is incomplete

Codex-2 LOW and Opus finding 4. The design omits `docs/guides/concepts.md`, the README version badge update, and the mandatory doc-audit step.

**Fix in v2:** Add `docs/guides/concepts.md`, README badge update, and explicit grep/doc-review verification to the doc surface and acceptance criteria.

## Low / Nit Findings

### L-HAS-FAILURES - Query boolean duplicates failedTickCount range

Opus finding 9. `hasFailures: true` duplicates `failedTickCount: { min: 1 }`.

**Fix in v2:** Drop `hasFailures` from `BundleQuery`, keep `BundleCorpusEntry.hasFailures` as a display-friendly derived field, and update examples to use `failedTickCount`.

## Action Plan For v2

1. Scope corpus iteration/loading to closed or frozen bundles and remove implied live-writer guarantees.
2. Replace `recursive` with `scanDepth: 'root' | 'children' | 'all'`.
3. Constrain `loadBundle` generics and document caller-asserted typing.
4. Freeze/copy metadata and `failedTicks` explicitly.
5. Extend `SessionRecordingError` and use JSON-shaped error details.
6. Tighten query contracts for optional fields, `recordedAt`, tick horizon fields, missing keys, and failure filtering.
7. Specify symlink skipping.
8. Correct sidecar integrity wording.
9. Expand testing/docs/versioning acceptance criteria.

After v2, request design iteration 2 and ask reviewers to verify every design-1 finding is resolved.
