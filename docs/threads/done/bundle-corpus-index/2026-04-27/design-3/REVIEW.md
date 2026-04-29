# Spec 7 (Bundle Corpus Index) - Design Iteration 3 Review Synthesis

**Iteration:** design-3. **Subject:** `docs/design/2026-04-27-bundle-corpus-index-design.md` v3. **Reviewers:** Codex, Codex-2, Opus.

**Verdict:** REJECT - re-spin to v4 required. Opus accepted v3 with low implementation notes. Both Codex passes confirmed that the design-2 blockers are resolved, then found two remaining public-contract issues that should be fixed before planning.

## High Findings

### H-MISSING-KEY-SURFACE - entry_missing is assigned to the wrong API surface in tests and acceptance criteria

Codex HIGH. Sections 5.1 and 5.2 correctly define missing-key behavior on `BundleCorpus.get(key)`, `BundleCorpus.openSource(key)`, and `BundleCorpus.loadBundle(key)`. However, the testing and acceptance sections refer to `entry.openSource()` and `entry.loadBundle()` throwing `entry_missing` for missing keys. A `BundleCorpusEntry` already exists and takes no key, so missing-key lookup cannot occur there.

**Fix in v4:** Change test and acceptance wording to target `corpus.get()`, `corpus.openSource(key)`, and `corpus.loadBundle(key)`. Leave entry-level post-construction filesystem mutation as normal underlying `FileSink` / source errors unless a later spec adds a stronger contract.

### H-RECORDED-AT - construction must reject or normalize non-canonical recordedAt

Codex-2 HIGH. The design depends on normalized UTC ISO `recordedAt` strings for canonical ordering and time filtering, but `SessionMetadata.recordedAt` is only typed as `string`, and direct `FileSink.open(metadata)` persists caller-provided metadata verbatim. `SessionRecorder` emits `new Date().toISOString()`, but a valid direct FileSink bundle can use a non-canonical timestamp and then sort/filter incorrectly.

**Fix in v4:** Make corpus construction validate manifest `metadata.recordedAt` with the same normalized UTC `Z` round-trip rule used for query bounds. Non-canonical values are invalid manifests (`details.code === 'manifest_invalid'`) or skipped under `skipInvalid: true`.

## Low / Accepted Findings

### L-ERROR-DETAILS-TYPE - tighten CorpusIndexErrorDetails for strict TypeScript

Opus LOW. `override readonly details: CorpusIndexErrorDetails` is useful, but the details type should remain assignable to `JsonValue`. A `[key: string]: JsonValue | undefined` index signature may fail strict covariance against the parent `details: JsonValue | undefined`.

**Fix in v4:** Make the index signature `[key: string]: JsonValue` and rely on optional-property absence rather than storing explicit `undefined`.

### L-EXPORT-LIST - acceptance criteria omits CorpusIndexErrorDetails by name

Opus LOW. Section 12 lists `CorpusIndexErrorDetails`, but Section 17 only says "and supporting types."

**Fix in v4:** Add `CorpusIndexErrorDetails` explicitly to the export acceptance criterion.

### L-EXAMPLE-GUARD - replay investigation example assumes a matching failed bundle

Opus LOW. The example dereferences `[0]` without an empty-array guard.

**Fix in v4:** Add a small guard so example code models defensive consumer behavior.

## Action Plan For v4

1. Patch missing-key tests and acceptance criteria to name corpus-level methods.
2. Add manifest `recordedAt` canonical validation to construction, testing, and acceptance criteria.
3. Tighten `CorpusIndexErrorDetails` index signature.
4. Explicitly list `CorpusIndexErrorDetails` in exports.
5. Add an empty-result guard to the replay investigation example.

After v4, request design iteration 4 with a narrow verification prompt.
