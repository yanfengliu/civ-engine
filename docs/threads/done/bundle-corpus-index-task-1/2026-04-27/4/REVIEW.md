# Spec 7 T1 Code Review Iteration 4

Status: REJECTED - real findings from both Codex reviewers. Claude/Opus was unreachable due quota exhaustion (`You've hit your limit · resets 7pm (America/Los_Angeles)`).

## Findings

### M1. Malformed query shapes do not consistently throw `query_invalid` (Codex-1)

`BundleQuery` validation only covered numeric ranges and ISO bounds inside otherwise well-typed objects. JavaScript callers, `as any` call sites, or malformed JSON-derived filters could pass `null`, non-`RegExp` keys, non-object `recordedAt`, or non-string `attachmentMime` values and get silent no-op filters or raw runtime behavior instead of the documented `CorpusIndexError` code `query_invalid`.

Resolution: Added up-front query-shape normalization in `src/bundle-corpus.ts` and expanded `tests/bundle-corpus.test.ts` to cover malformed top-level queries, key filters, scalar/list filters, booleans, ranges, `recordedAt`, and attachment MIME filters.

### M2. Public manifest error taxonomy was not fully pinned by tests (Codex-1)

`manifest_parse` and `schema_unsupported` are documented public `CorpusIndexErrorCode` variants but were not covered by the new corpus tests.

Resolution: Added a regression covering invalid JSON (`manifest_parse`) and unsupported schema versions (`schema_unsupported`) in strict and `skipInvalid` paths.

### M3. Synthetic playtest guide reused fixed output directories (Codex-2)

The new disk-backed corpus example wrote to fixed `artifacts/playtests/${i}` paths without warning that `FileSink` preserves existing bundle files, making reruns mix old and new corpus data.

Resolution: Updated `docs/guides/synthetic-playtest.md` to clear a run root with `rmSync(..., { recursive: true, force: true })` before writing bundles and to pass that root into `BundleCorpus`.

### M4. README pre-release status paragraph was stale (Codex-2)

The root README still described the breaking cadence as ending at `0.7.0` and referenced the old iter-7 hardening sweep.

Resolution: Updated the README status paragraph to include `0.8.0` and describe ongoing hardening through mandatory multi-CLI reviews rather than a stale sweep number.

### L1. Detailed devlog was still provisional (Codex-2)

The Spec 7 detailed devlog entry said the final verification review and gates were still required while nearby release docs recorded the feature as shipping.

Resolution: Updated the devlog with iteration 4 findings, the 20-test focused suite, and the review-fix gate run results. The entry still correctly notes that a final re-review is required before commit.

## Follow-up

Run iteration 5 review against the repaired staged diff. Claude/Opus should be attempted again; if still quota-blocked, proceed with two independent Codex reviews per handoff.
