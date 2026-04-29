# Spec 7 (Bundle Corpus Index) - Design Iteration 4 Review Synthesis

**Iteration:** design-4. **Subject:** `docs/design/2026-04-27-bundle-corpus-index-design.md` v4. **Reviewers:** Codex, Codex-2, Opus.

**Verdict:** ACCEPT - design converged. All reviewers agreed that the design-3 blockers are resolved and found no blocking design, API, test, documentation, or implementation-readiness issues.

Note: raw Codex outputs still contain CLI startup noise and rejected read attempts from the read-only sandbox. The final verdict blocks near the end of each raw file are the source for this synthesis.

## Verified Fixes

- `entry_missing` is now correctly scoped to `BundleCorpus.get(key)`, `BundleCorpus.openSource(key)`, and `BundleCorpus.loadBundle(key)`. Entry-bound `openSource()` / `loadBundle()` no longer claim missing-key behavior.
- Construction validates manifest `metadata.recordedAt` as normalized UTC `Z` form. Non-canonical values are treated as `manifest_invalid` and covered by strict and `skipInvalid` behavior.
- `CorpusIndexErrorDetails` is JSON-shaped with a `JsonValue` index signature and `details.code` remains the public discriminator.
- `CorpusIndexErrorDetails` is explicitly listed in the public export and API-reference scope.
- The replay-investigation example guards both empty query results and failures at the first recorded tick.
- The earlier design-2 fixes stayed intact: `materializedEndTick` does not overpromise replayability, root key is `'.'`, `attachmentMime` is any-match, dataUrl bytes are manifest parse cost, and live-writer/content-index promises did not return.

## Reviewer Notes

- Codex: accepted with no blocking findings; confirmed missing-key and recordedAt fixes in Sections 5.1, 6, 11, and 17.
- Codex-2: accepted with no blocking findings; confirmed the old overclaims did not return and the error details/export surfaces are consistent.
- Opus: accepted; confirmed doc surface completeness across API reference, guides, README, architecture, ADRs, roadmap, changelog, devlog, and version files.

## Plan Input

Implementation planning can proceed against v4. The plan review should verify that the concrete steps implement the accepted design without broadening scope, especially around manifest-only listing, closed-corpus semantics, recordedAt validation, key derivation, and doc/version gates.
