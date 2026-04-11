# RTS Engine Scale Plan

Status: Done
Scope: Single-player, headless RTS simulation support. Multiplayer tick-locking, rollback, prediction, and binary rewind snapshots are out of scope.

## Goal

Add generic RTS-scale engine primitives without hard-coding any specific game rules. The engine should be able to support an Age of Empires-like simulation core through reusable infrastructure for scale measurement, occupancy, pathfinding, and visibility.

Implementation status:
- Landed `OccupancyGrid` for blocked cells, footprints, occupancy, and reservations.
- Landed `findGridPath()`, `PathCache`, `PathRequestQueue`, and `createGridPathQueue()`.
- Landed `VisibilityMap` for per-player visible and explored cells.
- Landed `npm run benchmark:rts` for deterministic RTS-scale benchmark scenarios.

## 1. Large-Map Performance Proof

Purpose: avoid architecture work driven by guesswork.

Deliverables:
- Add a deterministic benchmark harness under `scripts/` or `tests/perf/`.
- Generate repeatable worlds at representative scales:
  - `128x128`, about `1k` entities.
  - `512x512`, about `10k` entities.
  - Optional stress case: `1024x1024`, `50k+` entities.
- Measure:
  - Tick duration.
  - Query cache hits and misses.
  - Spatial sync full scans and scanned entity counts.
  - Pathfinding request cost.
  - Diff size.
  - Memory-sensitive counts where feasible.
- Emit JSON or Markdown output so runs can be compared over time.

Acceptance criteria:
- One command produces stable benchmark output.
- Benchmark scenarios are deterministic from seed/configuration.
- Future optimization claims can cite a benchmark scenario.

## 2. Collision and Occupancy Model

Purpose: provide a simulation-level primitive for "can this unit or building occupy this space?"

Deliverables:
- Add a generic `OccupancyGrid` or `ReservationGrid` module.
- Track:
  - Blocked cells.
  - Entity occupancy.
  - Rectangular footprints for buildings.
  - Temporary reservations for movement/path planning.
- Provide APIs such as:
  - `occupy(entity, cells)`.
  - `release(entity)`.
  - `isBlocked(x, y)`.
  - `canReserve(entity, cells)`.
  - `reserve(entity, cells)`.
- Keep this separate from `SpatialGrid`: spatial grid answers "who is near here"; occupancy answers "can something stand or move here."

Acceptance criteria:
- Supports single-cell units and multi-tile buildings.
- Deterministic conflict behavior.
- Entity release and destroy cleanup are safe.
- Tests cover overlapping footprints, reservation conflicts, out-of-bounds cells, and cleanup.

## 3. RTS-Scale Pathfinding

Purpose: evolve from a generic A* utility into an engine-friendly path service.

Deliverables:
- Add a path request layer over the existing A* implementation.
- Support:
  - Request batching.
  - Per-tick pathfinding budget.
  - Deterministic request ordering.
  - Path cache keyed by start, goal, and passability version.
  - Integration with occupancy and reservation callbacks.
- Add optional helpers for common grid pathfinding, such as:
  - `findGridPath(...)`.
  - `PathRequestQueue`.
  - `PathCache`.
- Defer local avoidance, flocking, and formation movement until benchmarks or gameplay tests prove they are needed.

Acceptance criteria:
- Many path requests can be spread across ticks instead of blocking one tick.
- Pathfinding respects occupancy-blocked cells.
- Request processing order is deterministic.
- Benchmarks cover loaded pathfinding scenarios.

## 4. Fog and Visibility Support

Purpose: provide reusable per-player visibility state without rendering or UI assumptions.

Deliverables:
- Add a `VisibilityMap` or `FogOfWar` utility.
- Track per player:
  - Currently visible cells.
  - Explored cells.
- Support:
  - Circular vision radius.
  - Dirty vision-source updates.
  - Serializable state.
- Defer line-of-sight blockers unless an RTS prototype requires them.
- Use sparse or chunked internal storage if benchmarks show dense maps are too expensive.

Acceptance criteria:
- Multiple players are supported independently.
- Explored cells persist after visibility moves away.
- Moving vision sources update visibility deterministically.
- Tests cover reveal, hide, explored persistence, player isolation, and serialization.

## Recommended Order

1. Add the benchmark harness.
2. Add occupancy and reservation.
3. Add path request service using occupancy.
4. Add fog and visibility.
5. Rerun benchmarks and document before/after results.

## Commit Policy

Commit each completed milestone after:
- Focused tests pass.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.
- `npm.cmd run lint` passes.
- `npm.cmd test` passes, unless the milestone is docs-only.

Result: completed and retained here as the implementation record for the shipped work.
