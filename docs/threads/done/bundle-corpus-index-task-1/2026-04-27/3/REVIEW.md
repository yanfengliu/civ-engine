# Spec 7 Code Review - Iteration 3

## Inputs

- Diff under review: staged diff for this iteration; separate diff snapshot not retained
- Codex-1: completed; summarized here.
- Codex-2: completed; summarized here.
- Claude/Opus: still unreachable due quota (`You've hit your limit · resets 7pm (America/Los_Angeles)`); summarized here.

## Findings

### Medium - Symlinked `manifest.json` files were still accepted as bundle markers

Codex-1 found that discovery skipped symlinked directories but treated any existing `manifest.json` file as a bundle marker, including a symlinked manifest pointing outside the corpus root.

Resolution: discovery now requires a direct regular-file manifest (`lstatSync().isFile() && !isSymbolicLink()`), and `readManifest()` validates the manifest path again before parsing. Added a regression test that symlinked manifest files are skipped when the platform permits creating one.

### Medium - Symlink-root docs needed to distinguish explicit root from discovered descendants

Codex-2 found that docs still said symlinked directories are skipped, which obscured the newly supported explicit symlink/junction root case.

Resolution: API reference, bundle corpus guide, and changelog now state that an explicit symlink/junction `rootDir` is accepted and preserves the caller-supplied path, while symlinked descendants and symlinked manifests discovered during traversal are skipped.

### Medium - Detailed devlog entry missing

Codex-1 flagged that the staged diff did not yet include `docs/devlog/detailed/2026-04-27_2026-04-27.md`.

Resolution: process-deferred until final review convergence so the detailed entry can include the final reviewer outcome. This must be completed before commit.

### Low - Implementation plan sample staging command omitted helper modules

Codex-1 found that the accepted plan was updated to mention `src/bundle-corpus-types.ts` and `src/bundle-corpus-manifest.ts`, but its sample `git add` command still omitted them.

Resolution: updated the sample staging command to include the split helper modules, package-lock, devlog files, and task review folders.

## Verified Closed From Iteration 2

- Explicit symlink/junction corpus root is accepted.
- Descendant symlink directories remain skipped.
- Validation counts were updated after iteration 2.

## Result

Iteration 3 rejected due symlink-manifest handling, symlink-root doc precision, and a stale plan command. Fixes landed locally; run iteration 4. Detailed devlog remains a required post-review completion item before commit.
