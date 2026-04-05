# Roadmap

Feature tracker for civ-engine. Tracks what's built, what's in progress, and what's planned.

## Built

| Feature | Module(s) | Date | Notes |
|---------|-----------|------|-------|
| Entity management | `entity-manager.ts` | 2026-04-04 | Free-list recycling, generation counters |
| Component storage | `component-store.ts` | 2026-04-04 | Sparse array, generation tracking |
| Spatial grid | `spatial-grid.ts` | 2026-04-04 | Flat 2D array, lazy Sets, 4-dir neighbors |
| Game loop | `game-loop.ts` | 2026-04-04 | Fixed-timestep 60 TPS, spiral-of-death guard |
| World integration | `world.ts` | 2026-04-04 | Ties all subsystems, auto spatial sync, system pipeline |
| Event / messaging system | `event-bus.ts` | 2026-04-05 | Typed pub/sub, per-tick buffer, auto-clear, immediate dispatch |

## In Progress

None currently.

## Planned — Engine Core

| Feature | Priority | Description |
|---------|----------|-------------|
| Query system | High | Efficient entity queries by component combination (e.g. all entities with Position + Health) |
| State serialization | High | Save/load game state, snapshots for client sync |
| Input command layer | High | Accept player commands, validate, queue for next tick |
| Map generation | Medium | Procedural terrain, biomes, resource placement |
| Pathfinding | Medium | A* or similar over the spatial grid |
| Turn / phase management | Medium | Player turns, tick phases (move phase, combat phase, etc.) |

## Planned — Game Systems

| Feature | Priority | Description |
|---------|----------|-------------|
| Resource system | High | Production, storage, consumption, trade |
| Unit movement | High | Movement points, terrain cost, fog of war |
| Combat system | Medium | Attack, defense, health, damage resolution |
| City / settlement system | Medium | Founding, building, population, production queues |
| Tech tree | Low | Research, unlocks, prerequisites |
| Diplomacy | Low | Relations, treaties, trade agreements |
| AI players | Low | Decision-making for non-human players |

## Planned — Output / Client Integration

| Feature | Priority | Description |
|---------|----------|-------------|
| State diff output | High | Emit minimal change sets each tick for client consumption |
| Client protocol | Medium | Define the wire format between engine and client (JSON, binary, WebSocket, etc.) |
| Client (renderer) | Future | Separate project — could be web (Canvas/WebGL), terminal, or Godot |
| Sound events | Future | Engine emits sound cue events; client maps them to audio |

## Notes

- The engine is headless by design. Rendering, audio, and input capture belong to a separate client.
- The event system (in progress) is the foundation for both system-to-system communication and engine-to-client output.
- Priorities are relative within each section and will shift as the project evolves.
