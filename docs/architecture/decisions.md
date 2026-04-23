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
