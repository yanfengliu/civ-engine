ACCEPT.

All ten iter-1 blockers are properly resolved in v2:

- **High (CorpusIndexErrorDetails JSON-shape):** Now `string | null` required fields plus a `normalizeDetails()` helper. `CorpusIndexErrorDetails` is structurally assignable to `JsonValue` (its index signature is `JsonValue`, `code` is a string-literal union, the others are `string | null`), so `override readonly details: CorpusIndexErrorDetails` narrows the base `JsonValue | undefined` cleanly.
- **Multi-MIME coverage:** Added two-attachment fixture with positive single, positive one-of-many, and negative no-overlap assertions.
- **Stateful regex:** `matchesKey()` resets `lastIndex` before and after `.test()`, with a `/seed/g` test that asserts `lastIndex === 0`.
- **Doc audit:** Now scans `Get-ChildItem docs -Recurse -Filter *.md` plus README; grep terms include `OneOrMany` and `bundle-corpus-index`.
- **Materialized/dataUrl callouts:** Explicit doc tasks for `materializedEndTick` as a persisted-content horizon (not replayability) and dataUrl as manifest-parse cost (not content index); both promoted to Acceptance Criteria.
- **Test-count drift:** Replaced with "all tests pass and existing pending tests remain pending."
- **Review-artifact staging:** Explicit `git add docs\reviews\bundle-corpus-index-T1` after each iteration, before commit.
- **Two-Codex handoff note:** Present.
- **`OneOrMany<T>` export:** Added to `src/index.ts` block, API-reference task, doc audit grep, and acceptance checklist.
- **Devlog summary compaction:** Concrete instruction to compact while preserving newest-first Spec 1/3/8/7 status before adding the new line.

Type contract spot-checks against the codebase:
- `SessionRecordingError.details: JsonValue | undefined` (readonly) at `src/session-errors.ts:11`; the override is compile-compatible.
- `JsonValue` includes `null`, forbids `undefined` ΓÇö `normalizeDetails` correctly coerces `undefined` to `null`.
- `SessionMetadata` shape matches the validator (`sourceKind` union, optional `incomplete?: true`, `failedTicks?: number[]`, `policySeed?: number`, `sourceLabel?: string`).
- `AttachmentDescriptor.ref` union `{dataUrl}|{sidecar:true}|{auto:true}` matches the one-key validator.
- `SessionSource.readSidecar(id)` exists; `FileSink implements SessionSink, SessionSource`.
- `SESSION_BUNDLE_SCHEMA_VERSION = 1 as const`, used as both literal type and runtime value.
- `bundleCount`, `runMetrics`, `FileSink`, `SessionMetadata`, `SessionSnapshotEntry`, `AttachmentDescriptor`, `SessionRecordingError` all already exported from `src/index.ts`.
- `FileSink.open/writeSnapshot/writeAttachment/close/toBundle` all public at expected signatures.

AGENTS.md process satisfied: four-gate run (test/typecheck/lint/build), staged multi-CLI code review at `docs/reviews/bundle-corpus-index-T1/2026-04-27/<iter>/{raw,diff.md,REVIEW.md}` with handoff fallback, full doc discipline (changelog, devlog summary+detailed, api-reference, README badge+rows, guides for behavioral-metrics/session-recording/ai-integration/concepts, architecture component+drift+ADRs 28-31, roadmap status), one coherent v0.8.3 commit on main.
