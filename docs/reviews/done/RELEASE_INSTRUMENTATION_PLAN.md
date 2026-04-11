# Release Instrumentation Plan

Review date: 2026-04-11

Status: DONE

## Goal

Add explicit instrumentation profiles that remove avoidable observation overhead from the hot path without changing simulation semantics.

## Scope

1. Add explicit `WorldConfig` instrumentation profiles for `full`, `minimal`, and `release`.
2. Keep explicit AI/debug APIs available, but make the default `step()` and `submit()` paths cheaper outside `full`.
3. Avoid allocating command execution feedback when nothing is listening.
4. Update tests and docs so the release/runtime tradeoff is explicit.

## Planned Work

- [x] Add a public instrumentation profile type and `WorldConfig` option for `full`, `minimal`, and `release`.
- [x] Make `world.step()` use a profile-aware execution path: full detailed metrics in `full`, coarse implicit metrics in `minimal`, and no implicit metrics in `release`.
- [x] Keep `world.stepWithResult()` as the explicit structured path so AI agents can still opt into rich runtime feedback when they need it.
- [x] Make `world.submit()` use a boolean fast path outside `full` when no command-result listeners are attached.
- [x] Make command execution feedback allocation and emission lazy so it only happens when listeners are attached.
- [x] Preserve gameplay semantics and diff behavior; this work should remove observability cost, not alter simulation results.
- [x] Update README, API reference, AI integration docs, architecture notes, and changelog.
- [x] Add tests covering release-mode metrics behavior, fast submit behavior, and lazy execution-result emission.
