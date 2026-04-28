Low

- [docs/changelog.md](</C:/Users/38909/Documents/github/civ-engine/docs/changelog.md:33>) and [docs/devlog/summary.md](</C:/Users/38909/Documents/github/civ-engine/docs/devlog/summary.md:3>) say this ship added `+16` new BundleCorpus tests, but [tests/bundle-corpus.test.ts](</C:/Users/38909/Documents/github/civ-engine/tests/bundle-corpus.test.ts>) now contains 17 `it(...)` cases. The release/devlog validation text is stale; update the count, and recheck the derived total if you want the validation line to stay trustworthy.

Iteration-1 fixes are verified as closed: the root-bundle/`scanDepth: 'children'` boundary is now documented and regression-tested, `BundleCorpusMetadata` is exported with readonly `failedTicks` and docs coverage, and the API-reference `loadBundle` signatures now match the implementation constraints.
