# Spec 7 Bundle Corpus Index Plan Review - Iteration 2

**Scope:** v2 implementation plan, accepted design type correction, and verification against `docs/threads/done/bundle-corpus-index/2026-04-27/plan-1/REVIEW.md`.

**Verdict:** Rejected. Opus accepted, but both Codex reviewers found remaining concrete gaps. The findings are bounded and should be fixed in v3.

## Reviewer Summaries

- Codex summary
- Codex-2 summary
- Opus summary

Claude was reachable and returned `ACCEPT`.

## Findings

### High - `failedTicks` freeze snippet does not typecheck as written

Codex-1 found that `makeEntry()` freezes `failedTicks` into a `readonly number[]` and then assigns it into `Readonly<SessionMetadata>`, whose nested array type remains `number[]`. That snippet can fail typecheck unless the plan specifies a narrow runtime-freeze cast or changes the public metadata type.

**Action:** Keep the accepted public type `Readonly<SessionMetadata>` and update the plan snippet to build a frozen defensive array, then assign it through a narrow `as number[]` cast:

```ts
const frozenFailedTicks = manifest.metadata.failedTicks
  ? Object.freeze(manifest.metadata.failedTicks.slice())
  : undefined;
const metadata: Readonly<SessionMetadata> = Object.freeze({
  ...manifest.metadata,
  ...(frozenFailedTicks ? { failedTicks: frozenFailedTicks as number[] } : {}),
});
```

This preserves the runtime contract while staying compatible with the existing `SessionMetadata` type.

### Medium - Missing test coverage for `failedTicks` immutability

Both Codex reviewers found that the v2 plan tests top-level metadata freezing but not the nested `failedTicks` defensive copy/freeze requirement.

**Action:** Add assertions in the incomplete-bundle test that `metadata.failedTicks` is frozen, mutation throws, and later `entries()` results still expose the original `[26, 27]` list.

### Medium - Missing explicit `incomplete` query coverage

Codex-2 found that the test plan still does not assert `entries({ incomplete: true })` or `entries({ incomplete: false })`, even though the accepted design lists `incomplete` as a covered query filter.

**Action:** Add positive and negative incomplete-filter assertions to the incomplete-bundle test.

### Medium - Doc audit still omits some exported public names and runs before final docs

Codex-2 found that the audit pattern omits several public exports: `BundleCorpusScanDepth`, `BundleCorpusOptions`, `NumberRange`, `IsoTimeRange`, `CorpusIndexErrorCode`, `CorpusIndexErrorDetails`, and `InvalidCorpusEntry`. It also runs before final devlog edits, so it does not audit the final committed docs state.

**Action:** Expand the audit pattern to every public export and rerun the audit after final devlog updates, before the final gates/commit.

## Resolved From Iteration 1

- `CorpusIndexErrorDetails` is now JSON-safe and assignable to `SessionRecordingError.details`.
- Multi-MIME `attachmentMime` any-match coverage was added.
- Global-RegExp state coverage and `matchesKey()` reset behavior were added.
- The docs plan now includes materialized-end and dataUrl parse-cost callouts.
- Test-count expectations no longer hardcode stale pass counts.
- Code-review artifacts are re-staged after generation.
- The second Codex reviewer is documented as handoff-required.
- `OneOrMany<T>` is exported and documented.
- Devlog summary compaction is a concrete plan step.
