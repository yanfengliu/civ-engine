# civ-engine

A general-purpose, headless, AI-native 2D grid-based game engine. Built in TypeScript with a strict ECS (Entity-Component-System) architecture. Zero runtime dependencies.

**AI-native** means the engine is designed to be operated by AI agents, not human players directly. Humans provide high-level game designs; AI agents write game logic, submit commands, and observe state through structured, machine-readable interfaces. The debugging tools should be easy for an AI to use in a closed implement-debug-iterate feedback loop without human intervention.

The engine provides reusable infrastructure that game projects consume - it has no game-specific logic, rendering, or UI code.

## Quick Start

```bash
npm install
npm test        # run all tests
npm run lint    # lint
npm run typecheck
npm run build   # emit dist package files
npm run debug:client   # build and serve the browser debug client example
```

Requires Node.js 18+.

## Documentation

- **[Documentation Hub](docs/README.md)** - Full navigation for tutorials, guides, plans, reviews, and project history
- **[Getting Started](docs/guides/getting-started.md)** - Fastest way to get productive with the engine
- **[API Reference](docs/api-reference.md)** - Public types, methods, and standalone utilities
- **[Architecture](docs/ARCHITECTURE.md)** - Internal structure, subsystem boundaries, and data flow
- **[AI Integration](docs/guides/ai-integration.md)** - Structured submission and execution outcomes, versioned machine contracts, debugger issues, and history for closed-loop agents
- **[Scenario Runner](docs/guides/scenario-runner.md)** - Headless setup, scripted stepping, checks, and structured experiment results
- **[Debugging Guide](docs/guides/debugging.md)** - `WorldDebugger`, probes, and the browser debug client
- **[Sub-Grid Movement Guide](docs/guides/sub-grid-movement.md)** - Recommended fine-grid simulation, slot-based crowding, coarse building placement, and renderer-owned smooth motion
- **[Changelog](docs/changelog.md)** - Shipped changes and breaking changes

## What You Can Build

```typescript
import { World, type Position } from 'civ-engine';

const world = new World({ gridWidth: 64, gridHeight: 64, tps: 10 });
world.registerComponent<Position>('position');
world.registerComponent<{ hp: number }>('health');

// Create entities, attach data
const unit = world.createEntity();
world.setPosition(unit, { x: 0, y: 0 });
world.addComponent(unit, 'health', { hp: 100 });

// Game logic is pure functions that run each tick
world.registerSystem((w) => {
  for (const id of w.query('position', 'health')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const hp = w.getComponent<{ hp: number }>(id, 'health')!;
    // your logic here
  }
});

// Step the simulation
world.step();
```

## Feature Overview

| Feature                     | What it does                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Entities & Components**   | Create entities (numeric IDs), attach typed data objects by key                                                       |
| **Systems**                 | Pure functions `(world) => void` with optional phase, `before`/`after` ordering constraints                           |
| **Typed Components**        | Optional `ComponentRegistry` type param for type-safe `getComponent`/`setComponent`/`query` without manual generics   |
| **Spatial Grid**            | 2D grid auto-synced with position components, neighbor queries, `queryInRadius`, `findNearest`                        |
| **Commands**                | Typed input buffer with validators, queue-time submission results, tick-time execution results, and handlers - how AI agents send instructions |
| **Events**                  | Typed pub/sub - how systems communicate and how observers read what happened                                          |
| **Resources**               | Numeric pools (current/max) per entity with production, consumption, transfers                                        |
| **Map Generation**          | Seedable simplex noise, octave layering, cellular automata, tile grid helper                                          |
| **Pathfinding**             | Generic A* on any graph - provide neighbors/cost/heuristic/hash callbacks                                             |
| **Occupancy & Crowding**    | Deterministic blocked-cell footprints, blocker metadata, lifecycle bindings, crowding-aware passability, reservations, and sub-cell slot packing  |
| **Queued Grid Pathfinding** | `findGridPath`, `PathCache`, and `PathRequestQueue` for deterministic batched path processing                         |
| **Visibility Maps**         | Per-player visible and explored cell tracking for fog-of-war style mechanics                                          |
| **Render Projection**       | `RenderAdapter` and projection callbacks for renderer-facing snapshots/diffs without coupling the engine to a backend |
| **Debugging**               | `WorldDebugger`, machine-readable issues, structured tick failures, `WorldHistoryRecorder`, range summaries, and probes for headless inspection |
| **Scenario Runner**         | `runScenario()` for headless setup, scripted stepping, checks, and structured AI-facing results                       |
| **Behavior Trees**          | Generic BT framework with action, condition, selector, sequence nodes                                                 |
| **Speed Control**           | Runtime speed multiplier, pause/resume; `step()` ignores both for testing                                             |
| **World State**             | Non-entity key-value store (`setState`/`getState`) for terrain config, simulation time, etc.                          |
| **Tags & Metadata**         | Entity labels with reverse-index (`getByTag`), per-entity metadata with unique lookup (`getByMeta`)                   |
| **Serialization**           | JSON snapshot save/load via `serialize()`/`deserialize()`, including state, tags, metadata, and RNG                   |
| **State Diffs**             | Per-tick change sets: entities, components, resources, state, tags, and metadata changes                              |
| **Client Protocol**         | Transport-agnostic typed messages with protocol version markers and structured `commandAccepted`/`commandRejected` plus `commandExecuted`/`commandFailed`/`tickFailed` outcomes |

## Architecture

Everything flows through a single `World` object:

```
World.step()
  -> process commands     (drain queue, run handlers)
  -> sync spatial grid    (optional direct-mutation fallback scan)
  -> run systems          (phase-ordered game logic)
  -> process resources    (production, consumption, transfers)
  -> build diff           (collect changes for observers)
  -> update metrics       (timings, query counts, spatial sync counts)
  -> tick++
```

Use `world.stepWithResult()` when an AI loop needs a structured runtime failure instead of an exception. `world.step()` remains the compatibility path and throws `WorldTickFailureError` on tick failure.

Use explicit instrumentation profiles in `WorldConfig`:

- `full` for AI development: detailed implicit metrics and the richest default observability
- `minimal` for QA/staging: coarse implicit metrics with lower hot-path overhead
- `release` for shipping: no implicit per-tick metrics, while explicit AI/debug APIs still work when you call them

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed documentation.

## Repository Layout

The detailed file map lives in [Architecture](docs/ARCHITECTURE.md) and the full public surface lives in [API Reference](docs/api-reference.md).

At the repo level:

```text
src/       engine modules and public package exports
tests/     unit and integration coverage
examples/  reference clients and demos
docs/      guides, tutorials, architecture, changelog, and review history
```

## Public Surface

The root package centers on a few primary entry points:

- `World` for simulation, commands, events, serialization, diffs, and resources
- `ClientAdapter` and `RenderAdapter` for external clients and render transports
- `WorldDebugger`, `WorldHistoryRecorder`, and `runScenario()` for AI/debug workflows
- standalone utilities for pathfinding, map generation, occupancy/crowding, visibility, and behavior trees

Use [docs/api-reference.md](docs/api-reference.md) for the authoritative signatures, types, message shapes, and standalone utility docs.

## Design Decisions

- **Sparse arrays** for component storage - O(1) lookup, simple implementation
- **Fixed system pipeline** - deterministic execution, no scheduler overhead
- **Monolithic World** - flat API, internals are hidden
- **Zero runtime deps** - pure TypeScript, nothing to break
- **Generation counters** - minimal change detection for diff/serialization
- **Standalone utilities** - noise, cellular, map-gen, pathfinding are not World subsystems

## License

MIT
