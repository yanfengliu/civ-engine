# Spec 7 (Bundle Corpus Index) - Design Iteration 2 Review Synthesis

**Iteration:** design-2. **Subject:** `docs/design/2026-04-27-bundle-corpus-index-design.md` v2. **Reviewers:** Codex, Codex-2, Opus.

**Verdict:** REJECT - re-spin to v3 required. Opus accepted v2 with one low consistency note, and both Codex passes confirmed that the design-1 findings were mostly resolved. The remaining blockers are public-contract holes that should be fixed before implementation planning.

Note: raw Codex outputs again include CLI warning noise and rejected read attempts from read-only sandbox policy. The final verdict blocks near the end of each raw file are the source for this synthesis.

## High Findings

### H-REPLAYABLE-END - replayableEndTick overpromises SessionReplayer.openAt safety

Codex-2 HIGH. The design defines `replayableEndTick` as `metadata.incomplete ? metadata.persistedEndTick : metadata.endTick` and recommends it for replay/analyze readiness. Current `SessionReplayer.openAt()` also rejects any target tick at or after a recorded `failedTick`, so a complete bundle with failures can have `replayableEndTick === endTick` while `openAt(replayableEndTick)` throws `BundleIntegrityError(code: 'replay_across_failure')`. This makes the field name, examples, and tests teach a false contract.

**Fix in v3:** Rename the field/query to a manifest materialization concept, not a replay guarantee. Document that `SessionReplayer` remains the authority for actual replayability because failures, missing command payloads, and content integrity are enforced at load/replay time.

### H-ROOT-KEY - root bundle key is undefined

Codex HIGH and Codex-2 MED. `key` is the primary identity, but the design does not define the key for the supported case where `rootDir` itself is a bundle directory. Implementations could choose `''`, `'.'`, or a basename; that affects `get()`, `openSource()`, `loadBundle()`, key queries, duplicate handling, and sort tie-breaks.

**Fix in v3:** Define a canonical root-entry key and add testing/acceptance coverage. Use `'.'` for the root bundle and slash-separated relative paths without a leading `./` for descendants.

## Medium Findings

### M-ATTACHMENT-MIME - attachmentMime query semantics are underspecified

Codex MED. `attachmentMime` uses `OneOrMany<string>` but entries expose `attachmentMimes: readonly string[]`. The design does not say whether the query means any match, all match, or exact set match.

**Fix in v3:** Define `attachmentMime` as "match if any attachment MIME on the entry equals any requested MIME" and add a multi-attachment test.

### M-DATAURL-CAVEAT - manifest-only performance caveat omits embedded attachment bytes

Codex MED. `AttachmentDescriptor.ref` can be `{ dataUrl: string }`, so some attachment bytes can live inside `manifest.json`. The design correctly avoids JSONL/snapshot/sidecar reads, but phrases like "metadata-only cost" can understate manifest parse cost for explicit dataUrl attachments.

**Fix in v3:** Add a caveat that v1 reads only manifests during indexing, and manifests may contain embedded dataUrl attachment bytes. FileSink defaults to sidecar, but explicit dataUrl attachments still increase manifest size.

## Low / Accepted Findings

### L-ERROR-SHAPE - CorpusIndexError details should follow existing taxonomy

Opus LOW. Existing `SessionRecordingError` subclasses put discriminator codes inside `details.code`. v2 had typed top-level `code`, `path`, and `key` fields plus `details`, which risks divergence from catch sites expecting `err.details?.code`.

**Fix in v3:** Define `CorpusIndexErrorDetails` with `code`, `path`, `key`, and other JSON-shaped fields, and make `CorpusIndexError.details` the public discriminator surface.

## Action Plan For v3

1. Replace `replayableEndTick` with `materializedEndTick` everywhere.
2. Add explicit `SessionReplayer` replayability caveats around failures and content-level integrity.
3. Define root bundle key as `'.'`.
4. Specify `attachmentMime` any-match semantics.
5. Mention dataUrl bytes embedded in manifests in background/performance/format sections.
6. Align `CorpusIndexError` shape with `SessionRecordingError.details`.
7. Update tests, docs surface, ADRs, and acceptance criteria accordingly.

After v3, request design iteration 3 and ask reviewers to verify only the design-2 findings plus any new regressions.
