 README.md                                          |   2 +
 docs/README.md                                     |   1 +
 docs/api-reference.md                              | 237 ++++++++++
 docs/architecture/ARCHITECTURE.md                  |   4 +
 docs/architecture/decisions.md                     |   4 +
 docs/architecture/drift-log.md                     |   1 +
 docs/changelog.md                                  | 208 +++++++++
 ...4-26_2026-04-26.md => 2026-04-26_2026-04-27.md} | 192 ++++++++
 docs/devlog/summary.md                             |  11 +
 docs/guides/ai-integration.md                      |  22 +
 docs/guides/building-a-game.md                     |   6 +
 docs/guides/concepts.md                            |   1 +
 docs/guides/debugging.md                           |   6 +
 docs/guides/getting-started.md                     |  20 +
 docs/guides/scenario-runner.md                     |  47 ++
 docs/guides/session-recording.md                   | 187 ++++++++
 package-lock.json                                  |  22 +-
 package.json                                       |  11 +-
 src/command-transaction.ts                         |   3 +
 src/history-recorder.ts                            | 105 ++++-
 src/index.ts                                       |  62 +++
 src/json.ts                                        |  11 +
 src/scenario-runner.ts                             |  15 +-
 src/session-bundle.ts                              | 102 +++++
 src/session-errors.ts                              |  94 ++++
 src/session-file-sink.ts                           | 387 +++++++++++++++++
 src/session-internals.ts                           |  32 ++
 src/session-recorder.ts                            | 406 +++++++++++++++++
 src/session-replayer.ts                            | 483 +++++++++++++++++++++
 src/session-scenario-bundle.ts                     |  98 +++++
 src/session-sink.ts                                | 272 ++++++++++++
 src/version.ts                                     |   7 +
 src/world.ts                                       |  55 +++
 tests/determinism-contract.test.ts                 | 207 +++++++++
 tests/file-sink.test.ts                            | 244 +++++++++++
 tests/history-recorder-payloads.test.ts            | 154 +++++++
 tests/memory-sink.test.ts                          | 182 ++++++++
 tests/scenario-bundle.test.ts                      | 173 ++++++++
 tests/scenario-replay-integration.test.ts          | 159 +++++++
 tests/session-bundle.test.ts                       | 151 +++++++
 tests/session-errors.test.ts                       |  65 +++
 tests/session-recorder.test.ts                     | 253 +++++++++++
 tests/session-replayer.test.ts                     | 352 +++++++++++++++
 tests/world-applysnapshot.test.ts                  | 109 +++++
 44 files changed, 5143 insertions(+), 20 deletions(-)

10 commits across T0-T9; v0.7.7-pre→v0.7.15; +121 tests; 751 total.
dd1afce docs(session-recording): T9 structural docs + final integration (v0.7.15)
91c5c4d test(session-recording): T8 integration + clause-paired tests (v0.7.14)
1e69023 feat(session-recording): T7 scenarioResultToBundle adapter (v0.7.13)
b73bbd9 feat(session-recording): T6 SessionReplayer + selfCheck (v0.7.12)
11f50fd feat(session-recording): T5 SessionRecorder lifecycle (v0.7.11)
ea4ff27 feat(history-recorder): T4 captureCommandPayloads + scenario plumbing (v0.7.10)
bacc81d feat(session-recording): T3 FileSink (v0.7.9)
5c0d17a feat(session-recording): T2 SessionSink/Source + MemorySink (v0.7.8)
ed894d6 feat(session-recording): T1 bundle types + error hierarchy (v0.7.7)
d6142ef refactor(engine): T0 setup for session-recording subsystem
