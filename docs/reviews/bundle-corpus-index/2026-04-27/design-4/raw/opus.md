I'll do a focused review of v4 against the five design-3 carry-overs and the doc-coverage rubric. No file modifications.

## Verification of design-3 carry-overs

1. **Corpus-level `entry_missing` wording** ΓÇö addressed.
   - ┬º5.1 docs `openSource(key)` / `loadBundle(key)` (corpus-level) throwing `entry_missing`; `get(key)` non-throwing.
   - ┬º11 testing strategy and ┬º17 acceptance both bind `entry_missing` to `corpus.openSource(key)` / `corpus.loadBundle(key)`, not to entry-bound methods.
   - Entry-level `openSource()` / `loadBundle()` (┬º5.2) correctly omit the `entry_missing` claim ΓÇö the failure mode doesn't exist on a held entry.

2. **Construction-time `recordedAt` canonical validation** ΓÇö addressed.
   - ┬º6 step 7 explicitly validates `metadata.recordedAt` normalized UTC `Z` form at construction time, with a stated rationale (lexical UTC ISO ordering depends on it).
   - Mapped to `manifest_invalid` (consistent with ┬º5.4 codes), tested in ┬º11 ("Invalid manifestsΓÇª non-canonical `metadata.recordedAt`"), and called out in ┬º17.

3. **Strict JSON-shaped `CorpusIndexErrorDetails`** ΓÇö addressed.
   - ┬º5.4 declares an index signature `[key: string]: JsonValue` with named `code`, `path?`, `key?`, `message?` fields, plus prose stating details are "JSON-shaped information that can be logged or serialized without carrying raw filesystem handles or exception objects."
   - `code` discriminator is preserved at `details.code`.

4. **Explicit export list** ΓÇö addressed.
   - ┬º17 enumerates the full export set: `BundleCorpus`, `BundleCorpusScanDepth`, `BundleCorpusOptions`, `BundleCorpusEntry`, `BundleQuery`, `NumberRange`, `IsoTimeRange`, `CorpusIndexError`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, `InvalidCorpusEntry`, "and supporting types."
   - ┬º12 doc surface mirrors the same set for the api-reference section.

5. **Replay example guard** ΓÇö addressed.
   - ┬º9 guards both empty-result (`if (!failed) throw ΓÇª`) and the first-tick failure case (`if (firstFailure <= failed.metadata.startTick) throw ΓÇª`), preventing `openAt(startTick - 1)`.
   - The non-null assertion on `failedTicks![0]` is justified by the `failedTickCount: { min: 1 }` filter (┬º7 derives `failedTickCount` from `failedTicks?.length ?? 0`, so count ΓëÑ 1 implies non-empty array).

## Doc-coverage check (┬º12)

- All canonical surfaces enumerated: api-reference, new `bundle-corpus-index.md` guide, behavioral-metrics guide replacement, session-recording "Indexing" section, ai-integration Tier-2 placement, concepts standalone-utilities list, README (Feature Overview / Public Surface / version badge), docs/README, ARCHITECTURE Component Map + Boundaries, drift-log, decisions ADRs 28-31, ai-first-dev-roadmap status update, changelog, devlog summary + detailed, package.json, src/version.ts.
- ADR 28-31 in ┬º14 match the count promised in ┬º12.
- New file ΓÇö no stale signatures or removed APIs to audit against. v0.8.3 bump matches the v0.8.2 base in `git log`.
- Code-review prompt addendum is included verbatim ("verify docs in the diff match implementation; flag stale signaturesΓÇª").

## Verdict

**ACCEPT.** All five design-3 carry-overs are fully addressed with consistent treatment across ┬º5, ┬º6, ┬º11, and ┬º17. Doc surface is comprehensive and ADR/version bookkeeping is in place. Ready for implementation.
