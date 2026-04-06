# Roadmap

Feature tracker for civ-engine. Tracks what's built, what's in progress, and what's planned.

**Scope:** civ-engine is a general-purpose, headless, AI-native 2D grid-based game engine. It provides ECS infrastructure, spatial indexing, event/command plumbing, and reusable engine primitives — all designed for AI agents to operate programmatically. Game-specific logic (combat, diplomacy, tech trees, etc.) belongs in game projects that consume this engine — not here.

## Built

| Feature                  | Module(s)            | Date       | Notes                                                          |
| ------------------------ | -------------------- | ---------- | -------------------------------------------------------------- |
| Entity management        | `entity-manager.ts`  | 2026-04-04 | Free-list recycling, generation counters                       |
| Component storage        | `component-store.ts` | 2026-04-04 | Sparse array, generation tracking                              |
| Spatial grid             | `spatial-grid.ts`    | 2026-04-04 | Flat 2D array, lazy Sets, 4-dir neighbors                      |
| Game loop                | `game-loop.ts`       | 2026-04-04 | Fixed-timestep 60 TPS, spiral-of-death guard                   |
| World integration        | `world.ts`           | 2026-04-04 | Ties all subsystems, auto spatial sync, system pipeline        |
| Event / messaging system | `event-bus.ts`       | 2026-04-05 | Typed pub/sub, per-tick buffer, auto-clear, immediate dispatch |
| Input command layer      | `command-queue.ts`   | 2026-04-05 | Typed buffer, validators, handlers, tick-start processing      |
| State serialization      | `serializer.ts`      | 2026-04-05 | JSON snapshot, World.serialize/deserialize, round-trip tested  |
| Query system             | `world.ts`           | 2026-04-04 | Multi-component queries, smallest-store optimization           |
| State diff output        | `diff.ts`            | 2026-04-05 | Per-tick dirty tracking, getDiff/onDiff/offDiff, TickDiff type |
| Resource system          | `resource-store.ts`  | 2026-04-05 | Pools, production/consumption rates, transfers, diff integration |

## In Progress

None currently.

## Planned — Engine Primitives

| Feature                 | Priority | Description                                                                                  |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------- |
| Map infrastructure      | Medium   | Tile entity creation, MapGenerator interface, composable noise/automata utilities             |
| Pathfinding             | Medium   | Generic A* over the spatial grid with user-defined cost functions                             |
| Turn / phase management | Medium   | Generic turn structure and phase pipeline (game defines its own phases)                       |

## Planned — Client Integration

| Feature           | Priority | Description                                                                      |
| ----------------- | -------- | -------------------------------------------------------------------------------- |
| Client protocol   | Medium   | Define the wire format between engine and client (JSON, binary, WebSocket, etc.) |

## Notes

- The engine is headless by design. Rendering, audio, and input capture belong to a separate client.
- The event system is the foundation for both system-to-system communication and engine-to-client output.
- Game-specific systems (combat, cities, tech trees, diplomacy, AI) are out of scope — they belong in game projects that import this engine.
- Priorities are relative within each section and will shift as the project evolves.
