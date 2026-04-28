ACCEPT.

Verified the detailed devlog now records committed-state wording in `docs/devlog/detailed/2026-04-27_2026-04-27.md:109`. The iteration 5/6 query-shape fix also remains intact: `src/bundle-corpus.ts:233`, `:349`, and `:363` still force non-plain object query/range/`recordedAt` inputs into `CorpusIndexError` code `query_invalid`, and `tests/bundle-corpus.test.ts:312`, `:318`, and `:323` pin those cases.


