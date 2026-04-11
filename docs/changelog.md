# Changelog

## 0.2.0 - 2026-04-10

This release hardens the engine API and package boundary while adding RTS-scale primitives, render/debug infrastructure, and a browser reference debug client for reusable 2D civilization simulation projects.

### Breaking Changes

- Resource pools now use `max: null` for unbounded capacity instead of `Infinity`.
- Component data must be JSON-compatible. Components containing `undefined`, non-finite numbers, functions, symbols, bigints, class instances, or circular references are rejected.
- Component and resource writes through `World` now validate entity liveness and throw for dead or never-created entities.
- Position writes validate integer grid bounds before mutating component state.
- `WorldSnapshot` is now version 3 and includes resource state plus deterministic RNG state. Version 1 and 2 snapshots still load for compatibility.

### Added

- `EntityRef`, `world.getEntityRef(id)`, and `world.isCurrent(ref)` for stale-reference checks across recycled entity IDs.
- `world.setComponent()`, `world.patchComponent()`, and `world.setPosition()` as explicit write APIs.
- In-place component mutation detection for tick diffs.
- Read-only `world.grid` view, while `SpatialGrid` remains available as a standalone utility.
- Resource store snapshot state, including registrations, pools, rates, transfers, and next transfer ID.
- `world.random()` and `WorldConfig.seed` for deterministic pseudo-random simulation logic.
- Phase-aware system registration with `input`, `preUpdate`, `update`, `postUpdate`, and `output` phases.
- `world.getMetrics()` for per-tick timing, query cache, system, and spatial sync instrumentation.
- `WorldConfig.detectInPlacePositionMutations` and `world.markPositionDirty()` for large simulations that want to avoid the compatibility full-scan spatial sync path.
- `OccupancyGrid` for deterministic blocked-cell, footprint, occupancy, and reservation tracking.
- `findGridPath`, `PathCache`, `PathRequestQueue`, and `createGridPathQueue` for RTS-scale deterministic grid path processing.
- `VisibilityMap` for per-player visible and explored cell tracking.
- `RenderAdapter` for renderer-facing projected snapshots and diffs with generation-aware entity refs.
- `WorldDebugger` plus occupancy, visibility, and path queue probe helpers for headless inspection.
- Machine-readable `WorldDebugger.issues` alongside compatibility `warnings`.
- `world.submitWithResult()`, structured validator rejections, and command-result listeners.
- `CommandExecutionResult`, `world.onCommandExecution()`, and submission-sequence tracking so queued commands can be matched to tick-time execution or failure.
- `WorldHistoryRecorder` for short-horizon command outcomes and tick history capture.
- `TickFailure`, `WorldStepResult`, `WorldTickFailureError`, `world.stepWithResult()`, and `world.getLastTickFailure()` for structured runtime failure handling without forcing AI loops through thrown exceptions.
- `WorldDebugger.tickFailure` plus machine-readable runtime error issues derived from the latest failed tick.
- `WorldHistoryRecorder` capture for command execution results and tick failures, plus range summaries that aggregate execution outcomes and failure codes.
- Explicit AI contract version exports plus `schemaVersion` markers on command outcomes, debugger snapshots, history state, and scenario results.
- `summarizeWorldHistoryRange()` for AI-facing tick-window summaries over command outcomes, changed entities, events, and issues.
- `runScenario()` for headless setup, scripted stepping, checks, and structured AI-facing results.
- A browser debug client example backed by a worker-owned simulation, `RenderAdapter`, and `WorldDebugger`.
- `npm run benchmark:rts` for deterministic RTS-scale benchmark scenarios and metrics output.
- Runtime validation for world config, game-loop config, resource amounts/rates/maxima, and spatial coordinates.
- `ClientAdapter` runtime message guarding, structured `commandAccepted`/`commandRejected` outcomes, and optional `onError` callback for send failures.
- `ClientAdapter` streaming for `commandExecuted`, `commandFailed`, and `tickFailed` messages so remote agents can distinguish queued commands from executed commands and read structured tick failures.
- Client protocol version markers on server message envelopes.
- Tick-budget metrics plus `tick-budget-exceeded` debugger issues with slow-system context.
- Root package export barrel, declaration build config, npm package metadata, and CI workflow.

### Documentation

- Added `docs/README.md`.
- Added `docs/reviews/done/ENGINE_HARDENING_PLAN.md`.
- Added `docs/guides/public-api-and-invariants.md`.
- Added `docs/guides/ai-integration.md`.
- Added `docs/guides/scenario-runner.md`.
- Added `docs/guides/rendering.md`.
- Added `docs/guides/rts-primitives.md`.
- Added `docs/guides/debugging.md`.
- Added `docs/reviews/done/AI_FIRST_ENGINE_PLAN.md`.
- Added `docs/reviews/done/AI_FINAL_FORM_PLAN.md`.
- Added `docs/reviews/done/AI_RUNTIME_FEEDBACK_PLAN.md`.
- Added the `examples/debug-client/` browser reference viewer and `npm run debug:client`.
- Reorganized documentation entry points around the docs hub and focused plan/review docs.
- Updated README, API reference, guides, and tutorials for package-root imports, explicit write APIs, `EntityRef`, structured command submission and execution outcomes, structured tick failures, AI-facing debugging/history tools, versioned machine contracts, client protocol version markers, JSON-compatible component data, resource `max: null`, snapshot v3, client-adapter message handling, render projection, and debugging helpers.
