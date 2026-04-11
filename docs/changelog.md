# Changelog

## 0.2.0 - 2026-04-10

This release hardens the engine API and package boundary for reusable 2D civilization simulation projects.

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
- Runtime validation for world config, game-loop config, resource amounts/rates/maxima, and spatial coordinates.
- `ClientAdapter` runtime message guarding, missing-handler rejection, rejection reasons, and optional `onError` callback for send failures.
- Root package export barrel, declaration build config, npm package metadata, and CI workflow.

### Documentation

- Added `docs/README.md`.
- Added `docs/ENGINE_HARDENING_PLAN.md`.
- Added `docs/guides/public-api-and-invariants.md`.
- Added `docs/guides/rendering.md`.
- Reorganized documentation entry points around the docs hub and focused plan/review docs.
- Updated README, API reference, guides, and tutorials for package-root imports, explicit write APIs, `EntityRef`, JSON-compatible component data, resource `max: null`, snapshot v3, and client-adapter error handling.
