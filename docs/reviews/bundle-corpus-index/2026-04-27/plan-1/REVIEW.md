# Spec 7 Bundle Corpus Index Plan Review - Iteration 1

**Scope:** `docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md` plus the accepted Spec 7 design context.

**Verdict:** Rejected. The plan is directionally sound, but reviewers found one typecheck blocker and several concrete test/process/doc gaps that need a v2 plan before coding starts.

## Raw Outputs

- `raw/codex.md`
- `raw/codex-2.md`
- `raw/opus.md`

Claude was reachable for this iteration.

## Findings

### High - `CorpusIndexErrorDetails` shape is not assignable to `JsonValue`

Codex-2 and Opus both found that the planned interface combines `readonly [key: string]: JsonValue` with optional `path`, `key`, and `message` fields. Optional properties include `undefined`, which is not a `JsonValue`. Opus also noted that overriding `SessionRecordingError.details` with that shape fails because the base property is `JsonValue | undefined`.

**Action:** Change the design and plan to use a JSON-safe details object with required nullable fields:

```ts
export interface CorpusIndexErrorDetails {
  readonly [key: string]: JsonValue;
  readonly code: CorpusIndexErrorCode;
  readonly path: string | null;
  readonly key: string | null;
  readonly message: string | null;
}
```

Use an internal `CorpusIndexErrorDetailsInput` helper and `normalizeDetails()` so call sites can keep passing concise optional fields while the public `details` object remains JSON-shaped.

### Medium - `attachmentMime` any-match behavior is under-tested

Both Codex passes found that the planned tests only cover a single-attachment PNG bundle. That would not catch an implementation that treats `attachmentMime` as exact-set or all-match, even though the accepted design requires a multi-attachment proof.

**Action:** Add a test with at least two MIME types, assert single MIME and one-of-many positive matches, and assert a negative no-overlap case.

### Medium - `key: RegExp` can be stateful for `/g` and `/y`

Both Codex passes found that calling `query.key.test(entry.key)` directly lets global or sticky regex `lastIndex` state leak across entries.

**Action:** Add global-regex test coverage and implement a `matchesKey()` helper that resets `lastIndex` before and after each test.

### Medium - Doc audit is too narrow

Codex-1 found that the planned doc audit scans only a handpicked subset of docs. The accepted design requires a doc-review or grep across `docs/` and `README.md`, while historical changelog/devlog/drift-log context can remain.

**Action:** Replace the narrow audit with an all-markdown docs scan plus README scan for new API names. Since Spec 7 is additive, explicitly state that there are no removed/renamed API names to grep.

### Medium - Accepted-design callouts are missing from concrete doc tasks

Codex-2 found that the docs plan does not explicitly require `materializedEndTick` to be documented as a persisted-content horizon rather than a replay guarantee, and does not explicitly require embedded `dataUrl` attachments to be documented as manifest parse cost rather than content indexing.

**Action:** Add guide/API/changelog tasks for incomplete-bundle behavior and embedded dataUrl attachment cost.

### Medium - Test-count expectation is stale-prone

Codex-2 noted that hardcoding the current pass count makes the plan fragile and may already conflict with current docs.

**Action:** Replace the expected full-suite count with "all tests pass and existing todo tests remain todo."

### Medium - Review artifacts need re-staging after generation

Codex-2 and Opus found that the plan stages `docs/reviews/bundle-corpus-index-T1` before review files are generated, but does not explicitly stage the newly written raw/diff/REVIEW files before commit.

**Action:** Add a re-stage step after each code-review iteration and before final verification.

### Low - Two-Codex reviewer setup needs a handoff note

Opus objected that `raw/codex-2.md` is not the AGENTS.md default. The handoff explicitly requires two separate Codex review passes because Claude quota may be limited.

**Action:** Keep `raw/codex-2.md`, but add a note that this follows the current handoff and supplements Claude when reachable.

### Low - `OneOrMany<T>` export mismatch

Opus noted that the accepted design snippet exports `OneOrMany<T>`, while the implementation plan kept it module-private and omitted it from `src/index.ts`.

**Action:** Export `OneOrMany<T>` and include it in docs/API/export checklist.

### Low - Devlog summary compaction needs a concrete action

Opus noted that the plan says to keep the summary under 50 lines, but the file is already above that threshold.

**Action:** Add a concrete compaction instruction for `docs/devlog/summary.md` while preserving newest-first status lines.
