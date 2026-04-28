Now I have enough context to produce the review. Let me verify the resolution of each iteration-3 blocker against plan v4.

## Review: ACCEPT

All five iteration-3 blockers are concretely resolved with both plan language and corresponding test coverage:

1. **Stale README/roadmap language** ΓÇö Plan now explicitly says: "update the existing Synthetic Playtest Harness row so it no longer says corpus indexing is 'future Tier-2' work" and "Scrub stale 'Proposed', 'not yet drafted', and 'depends on Spec 4' language for Spec 7; Spec 4 should be described as a future consumer".

2. **BundleCorpus-first behavioral-metrics framing** ΓÇö Plan now requires `behavioral-metrics.md` use disk-backed `BundleCorpus` as the *primary* quickstart, with in-memory arrays only as an advanced note.

3. **Locale-independent ordering** ΓÇö Plan adds `compareCodeUnit()` helper using `<`/`>` operators and applies it to entry sort, attachment MIME sort, and child discovery sort. Test `uses locale-independent code-unit ordering for ties` uses `'Zulu'`/`'alpha'` (Z=0x5A < a=0x61) which would fail under locale-aware case-folding. Verified `SESSION_BUNDLE_SCHEMA_VERSION === 1` matches the test fixture's `schemaVersion: 1`.

4. **Proven lazy bundle iteration** ΓÇö Test `loads bundles lazily one iterator step at a time` writes a valid first bundle and a malformed-`ticks.jsonl` second bundle, asserting `iterator.next()` succeeds for the first and only the second `next()` throws ΓÇö eager materialization cannot pass this.

5. **Stop-descending discovery** ΓÇö Test `stops descending once a directory is a bundle` creates `outer/manifest.json` plus `outer/nested/manifest.json` and asserts entries equal `['outer']`. The implementation's `if (existsSync(...)) { out.push(dir); return; }` matches.

### Minor observation (non-blocking)

`this.rootDir = realpathSync(root)` plus the test `expect(entries[0].dir).toBe(root)` is fine on Windows/Linux but would fail on macOS where `tmpdir()` returns `/var/...` symlinked to `/private/var/...`. Not a blocker for this project (Windows primary), and existing FileSink tests don't use `realpathSync` so this is novel to the corpus path. Surfaces in CI gates if it bites, easy fix at execution time.

The plan is ready for coding.
