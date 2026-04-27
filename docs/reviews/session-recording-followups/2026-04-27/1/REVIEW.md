# Multi-CLI Code Review — Session-Recording Followups

**Iteration:** 1.
**Date:** 2026-04-27.
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini quota-out.

## Verdicts

- **Codex:** "The runtime followups look sound on inspection, but the branch is not merge-ready because it still has one public-contract doc drift and two AGENTS-required review/doc artifacts missing."
- **Opus:** "Approve. The four iter-2 followups land cleanly, with no behavior regressions, faithful refactors, and one minor doc-completeness gap."

Convergent: runtime code is correct (M1 perf grouping, L2 terminated guard, L3 doc renames, L4 applySnapshot helper, H3 paired tests). All flagged issues are doc / process / test-naming completeness — no correctness or type-safety bugs.

## Findings

### High

**H1 (Codex). Missing AGENTS-required review artifacts.** The folder previously contained only `raw/` outputs; AGENTS.md mandates `diff.md` + synthesized `REVIEW.md` per iteration directory. **Fix landed in this same commit:** `diff.md` (this folder) + `REVIEW.md` (this file).

### Medium

**M1 (Codex). Detailed devlog entries missing for v0.7.17 / v0.7.18 / v0.7.19.** `docs/devlog/summary.md` records all three but the latest detailed file stops at v0.7.15. **Fix:** append per-task entries to `docs/devlog/detailed/2026-04-26_2026-04-27.md`.

**M2 (Codex / Opus L1 convergent). attach() doc drift.** `docs/api-reference.md:4921` says `attach(blob, options)` "defaults to sidecar storage." Inline comment in `src/session-recorder.ts:347` still says "leave `ref` as `{ sidecar: true }`." Actual implementation (post-iter-2 fix-pass `(v0.7.16)`) uses `{ auto: true }` so each sink applies its own default (FileSink: sidecar; MemorySink: dataUrl under threshold, sidecar over with `allowSidecar`, throw otherwise). **Fix:** rewrite both to "no preference; each sink applies its own default."

**Opus L1 (related). 3 dangling `(T#)` task-id references in api-reference inline prose** (lines ~4731, 4789, 4830). L3 commit renamed section headers but missed inline references. **Fix:** drop the parentheticals.

### Low

**L1 (Codex). Terminated-recorder regression test title overstates coverage.** Title claims `addMarker / attach / takeSnapshot`; body only asserts `addMarker()`. All three call the shared `_assertOperational` guard, but a future call-site regression in `attach`/`takeSnapshot` wouldn't be caught. **Fix:** broaden the test to cover all three.

### Notes

**N1 (Opus). `_replaceStateFrom` "NOT transferred" comment incomplete.** Misses `nextSystemOrder` (preserved alongside `systems`) and `nextCommandResultSequence` (intentionally preserved — selfCheck submissionSequence-stripping comment depends on this). Helper behavior is correct; the audit-comment list is short. **Fix:** extend the comment to be exhaustive.

**N2 (Opus). Execution divergence exposes internal `_executionsByTick` by reference.** Previously a fresh `filter()` result; now `expectedRaw` is pushed directly. Caller mutating `divergence.expected` corrupts the replayer index. Pre-existing pattern (`bundle.ticks[i].events` already shares this); not flagged higher. Document or consume by clone — punt to follow-up if any.

**N3 (Opus). Pre-grouping locks in bundle arrays at construction.** Caller mutating `bundle.commands` after `fromBundle` won't be seen. Bundles are conceptually immutable; no realistic caller depends on the prior re-read behavior. Acceptable.

**N4 (Opus). Clause-2 paired test comment refers to "tick-counter" but actual component is "submit-counter".** Stale draft text. **Fix:** update comment.

## Spec coverage

| Iter-2 finding | Closure |
| -------------- | ------- |
| M1 perf pre-group | Closed (commit 463476b) |
| L2 terminated guard | Closed (commit b116645); regression test broadened in this fix-pass |
| L3 doc renames | Closed for headers; 3 inline refs fixed in this fix-pass |
| L4 applySnapshot helper | Closed (commit b116645); audit comment extended in this fix-pass |
| H3 paired tests | Closed (commit a835aa0) — clauses 1, 2, 7 covered; clauses 4, 6 deferred as `it.todo` with rationale |

## Overall assessment

**Approve after the H1 + M1 + M2 + L1 + N4 fixes land in a single small fix-pass.** No correctness/type-safety/perf regressions. After the fixes, branch is merge-ready.

## Reviewer coverage

| Severity | Codex | Opus | Convergent |
| -------- | ----- | ---- | ---------- |
| Critical | 0     | 0    | —          |
| High     | 1     | 0    | 0          |
| Medium   | 2     | 0    | 0 (L1 ↔ Opus L1 partially) |
| Low      | 1     | 1    | 0          |
| Note     | 1     | 4    | 0          |

Codex caught process/AGENTS-discipline issues (missing review artifacts, devlog gaps, doc drift). Opus caught implementation-detail polish (audit comment, reference-leak, stale comment). Complementary; neither would have been sufficient alone.
