# Key Architectural Decisions

Decisions for civ-engine. Never delete an entry; add a newer decision that supersedes an older one.

| #   | Date       | Decision                                              | Rationale                                                                  |
| --- | ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | 2026-04-04 | Sparse arrays for component storage                   | Simple, O(1) lookup, sufficient for expected entity density                |
| 2   | 2026-04-04 | Fixed system pipeline (no scheduler)                  | Deterministic, easy to test and debug                                      |
| 3   | 2026-04-04 | Monolithic World object                               | Simple API surface, avoids premature decoupling                            |
| 4   | 2026-04-04 | Generation counters for change detection              | Minimal cost now, enables future diff/output layer                         |
| 5   | 2026-04-04 | Zero runtime dependencies                             | Performance and simplicity for a game engine                               |
| 6   | 2026-04-04 | Spatial index as internal World routine               | Non-bypassable, invisible to user systems, runs before all systems         |
| 7   | 2026-04-04 | destroyEntity uses previousPositions for grid cleanup | Handles the case where position was mutated between ticks without stepping |
| 8   | 2026-04-06 | BT state separated from tree structure via BTState   | Enables shared tree blueprints across entities while keeping per-entity state serializable in ECS |
| 9   | 2026-04-12 | Optional typed component registry via TComponents generic | Type-safe component access without runtime overhead; backward-compatible with existing string-based API |
| 10  | 2026-04-25 | Per-system cadence is engine-level (`interval` / `intervalOffset`), not game-code modulo | Lifts the `if (w.tick % N !== 0) return;` boilerplate into the dispatch layer. Skipped systems do not invoke their body or push a per-system metrics entry. Schedule matches the legacy manual pattern by direct substitution so existing periodic systems migrate without behavior change. Inspired by MicropolisCore `simulate.cpp:134-143`. |
| 11  | 2026-04-25 | `Layer<T>` is a standalone utility, not owned by World | Game code instantiates one Layer per concern (pollution, influence, danger, faith, weather). Engine provides the typed downsampled-resolution data structure; game decides what fields exist and how they tick. Mirrors the existing pattern for `OccupancyGrid` / `VisibilityMap` / `Pathfinding`. Inspired by MicropolisCore `map_type.h:111` (`Map<DATA, BLKSIZE>` template). |
| 12  | 2026-04-25 | `CommandTransaction` uses no shadow view; preconditions see live state | `world.transaction()` is a synchronous builder. Reads inside `require()` predicates and after `commit()` see the live world, not a projection of the transaction's own buffered mutations. Smaller implementation, fewer surprising behaviors, matches the documented contract. Mid-commit throw consumes the transaction (status flips to `committed` in `finally`) so retry cannot silently double-apply non-idempotent ops like `removeResource`. Inspired by MicropolisCore `ToolEffects` (`tool.h:171-305`). |
