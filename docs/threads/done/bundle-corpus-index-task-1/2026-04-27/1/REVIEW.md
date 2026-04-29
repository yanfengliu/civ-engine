# Spec 7 Code Review - Iteration 1

## Inputs

- Diff under review: staged diff for this iteration; separate diff snapshot not retained
- Codex-1: timed out after 10 minutes with no usable stdout; stderr retained in `temporary Codex stderr capture`.
- Codex-2: completed; summarized here.
- Claude/Opus: unreachable due quota (`You've hit your limit · resets 7pm (America/Los_Angeles)`); summarized here.

## Findings

### Medium - `scanDepth: 'children'` contract mismatch

Codex-2 found that implementation treats a root directory containing `manifest.json` as a bundle boundary, so `scanDepth: 'children'` returns `'.'` and does not inspect child directories, while the public API/guides described `'children'` as direct-child-only. The accepted design says `'children'` checks `rootDir` and direct child directories, and the general bundle-boundary rule says discovery stops once a direct manifest is found. The code behavior is reasonable, but the public docs and tests needed to pin it.

Resolution: updated API/guide wording to describe root + direct children and the root-bundle boundary; added a regression test for root bundle + child bundle under `scanDepth: 'children'`.

### Medium - `metadata.failedTicks` immutability was shallow in the public type

Codex-2 found that `BundleCorpusEntry.metadata` was typed as `Readonly<SessionMetadata>`, leaving `failedTicks?: number[]` mutable at compile time even though runtime freezes the array and tests expect mutation to throw.

Resolution: added exported `BundleCorpusMetadata` with `readonly failedTicks?: readonly number[]`, changed `BundleCorpusEntry.metadata` to use it, exported/documented the new helper type, and adjusted the runtime immutability test to cast only for the mutation assertion.

### Low - API reference omitted generic constraints on `loadBundle`

Codex-2 found that the API reference showed unconstrained `loadBundle<TEventMap, TCommandMap, TDebug>` signatures while the implementation constrains event/command generics to record-shaped maps.

Resolution: updated both `BundleCorpus.loadBundle(key)` and `BundleCorpusEntry.loadBundle()` API-reference signatures to include the shipped generic constraints/defaults.

## Result

Iteration 1 rejected due two medium contract/type findings and one low documentation finding. Fixes landed locally; run iteration 2 after restaging.
