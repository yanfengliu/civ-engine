ACCEPT.

Verified the iteration 7 fix: unknown top-level query keys, unknown `NumberRange` keys, unknown `policySeed` range keys, and unknown `recordedAt` keys now all fail with `CorpusIndexError` code `query_invalid`, and the regressions are covered in `tests/bundle-corpus.test.ts`. `docs/api-reference.md` and the Spec 7 devlog entry match that behavior.
