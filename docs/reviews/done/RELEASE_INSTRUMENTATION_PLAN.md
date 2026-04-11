# Release Instrumentation Plan

Review date: 2026-04-11

Status: DONE

## Goal

Add a release-oriented instrumentation mode that removes avoidable observation overhead from the hot path without changing simulation semantics.

## Scope

1. Add an explicit `WorldConfig` instrumentation profile so shipping builds can opt out of dev-time metrics and feedback work.
2. Keep explicit AI/debug APIs available, but make the default `step()` and `submit()` paths cheaper in release mode.
3. Avoid allocating command execution feedback when nothing is listening.
4. Update tests and docs so the release/runtime tradeoff is explicit.

## Planned Work

- [x] Add a public instrumentation profile type and `WorldConfig` option for release mode.
- [x] Make `world.step()` use a lower-overhead execution path in release mode by skipping per-tick metrics collection on the implicit path.
- [x] Keep `world.stepWithResult()` as the explicit structured path so AI agents can still opt into rich runtime feedback when they need it.
- [x] Make `world.submit()` use a boolean fast path in release mode when no command-result listeners are attached.
- [x] Make command execution feedback allocation and emission lazy so it only happens when listeners are attached.
- [x] Preserve gameplay semantics and diff behavior; this work should remove observability cost, not alter simulation results.
- [x] Update README, API reference, AI integration docs, architecture notes, and changelog.
- [x] Add tests covering release-mode metrics behavior, fast submit behavior, and lazy execution-result emission.
