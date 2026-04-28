# Spec 7 Code Review - Iteration 2

## Inputs

- Diff under review: `docs/reviews/bundle-corpus-index-T1/2026-04-27/2/diff.md`
- Codex-1: completed; raw output in `raw/codex.md`.
- Codex-2: completed; raw output in `raw/codex-2.md`.
- Claude/Opus: still unreachable due quota (`You've hit your limit · resets 7pm (America/Los_Angeles)`); raw output in `raw/opus.md`.

## Findings

### Medium - Explicit symlink/junction corpus root rejected

Codex-1 found that `BundleCorpus` validated the explicit `rootDir` with `lstatSync().isDirectory()`, which rejects a root path that is itself a symlink/junction to a directory. The docs only say symlinked descendants are skipped during scanning; they do not say an explicitly supplied symlink root is invalid.

Resolution: root validation now uses `statSync().isDirectory()` so explicit symlink/junction roots resolve as directories, while descendant discovery still skips symlinked entries via `Dirent.isSymbolicLink()`. Added a regression test for symlinked roots when the platform permits creating one.

### Medium/Low - Release validation test count stale

Both Codex reviewers found the changelog/devlog summary still said +16 tests after iteration 1 added a seventeenth test. Iteration 2 then added one more symlink-root test, so the focused Spec 7 file now has 18 tests.

Resolution: updated changelog/devlog summary to `+18 new in tests/bundle-corpus.test.ts` and `863 passed + 2 todo` for the full-suite expectation.

## Verified Closed From Iteration 1

- `scanDepth: 'children'` root-boundary docs and regression test landed.
- `BundleCorpusMetadata` models readonly nested `failedTicks`, is exported, and is documented.
- API-reference `loadBundle` signatures now match implementation generic constraints/defaults.

## Result

Iteration 2 rejected due one root-symlink handling issue and stale validation counts. Fixes landed locally; run iteration 3.
