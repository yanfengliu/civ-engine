# Devlog Summary

- 2026-04-27: Spec 7 - Bundle Search / Corpus Index (v0.8.3) - `BundleCorpus` indexes closed FileSink bundle directories, exposes manifest-only `entries(query?)`, lazy `bundles(query?)`, deterministic ordering, metadata/failure/attachment summaries, and `CorpusIndexError` diagnostics. Adds ADRs 28-31 and the bundle corpus guide. 20 new tests; review-fix gates: 865 passed + 2 todo.
- 2026-04-27: Spec 8 - Behavioral Metrics over Corpus (v0.8.2) - `runMetrics(bundles, metrics)` reducer over `Iterable<SessionBundle>`, 11 engine-generic metrics, accumulator-style `Metric`, and `compareMetricsResults`. ADRs 23-27. 44 new tests; 842 passed + 2 todo at ship.
- 2026-04-27: Spec 3 T3 (v0.8.1) - Determinism integration tests and structural docs completed the synthetic playtest chain. 7 new tests; 798 passed + 2 todo at ship.
- 2026-04-27: Spec 3 T2 (v0.8.0, breaking) - `runSynthPlaytest` harness plus `SessionMetadata.sourceKind: 'synthetic'`, policy sub-RNG, stopReason taxonomy, and FileSink/SessionRecorder integration. ADRs 20, 20a, 21, 22.
- 2026-04-27: Spec 3 T1 (v0.7.20) - Synthetic playtest policy interface and built-in `noopPolicy`, `randomPolicy`, `scriptedPolicy`. ADRs 17-19.
- 2026-04-27: Session-recording followups (v0.7.16-v0.7.19) - Code-review fixes, pre-grouped replay streams, terminated-state guards, applySnapshot audit helper, and determinism-clause tests. 759 tests + 2 todo at v0.7.19.
- 2026-04-27: Session Recording & Replay (v0.7.7-pre -> v0.7.15) - `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `MemorySink`, `FileSink`, marker validation, `scenarioResultToBundle()`, `World.applySnapshot()`, and docs/ADRs 13-16. 121 new tests across the chain.
- 2026-04-26: Multi-CLI full-codebase review iter-7 to iter-9 (v0.7.5-v0.7.6) - Closed deserialize, EventBus, ClientAdapter, API/doc, noise, and semantic-diff findings; iter-9 converged clean with Codex+Opus.
- 2026-04-26: CommandTransaction and Layer review hardening (v0.6.0-v0.7.4) - Read-only transaction preconditions, generic threading, buffer-time emit validation, Layer strip-at-write/primitive fast path, denylist hardening, clone-on-read, frozen `world.grid`, and doc audit.
- 2026-04-25: Micropolis-inspired features (v0.5.9-v0.5.11) - Per-system cadence, `Layer<T>`, and `CommandTransaction` shipped with multi-CLI review and focused regression coverage.
- 2026-04-25: Iter-2 full-review fixes (v0.4.1-v0.5.8) - Fail-fast tick semantics, snapshot v5, removal of in-place mutation auto-detection, defensive-copy/documentation cleanup, and convergence after 6 review iterations.
- 2026-04-20 to 2026-04-23: Engine feedback features - OccupancyBinding hardening, cache-key fixes, reactive BT nodes, `clearRunningState`, semantic diff mode, and civ-sim-web integration friction fixes.
- 2026-04-12: Engine ergonomics batch - Typed component registry, loose system typing, world-level state, spatial helpers, system ordering constraints, tags, and metadata.
- 2026-04-04 to 2026-04-06: Foundation - TypeScript/Vitest/ESLint scaffold; ECS core; World, commands/events/resources; serialization/diffs; map generation; pathfinding; speed control; ClientAdapter; docs and tutorials.

> Always read this file at session start to understand current project state. For detailed reviewer notes, validation output, and rationale, start with the newest file in `docs/devlog/detailed/`.
