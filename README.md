# civ-engine

![version](https://img.shields.io/badge/version-0.8.11-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)

> **Pre-release alpha - unverified.** This engine is under active development. The public API surface is still shifting (see `docs/changelog.md` for the recent breaking-change cadence - `0.5.0`, `0.6.0`, `0.7.0`, `0.8.0`), invariants are still being hardened through mandatory multi-CLI reviews, and no production deployment has validated the engine end-to-end. Use it for prototyping, AI-agent experiments, and feedback - do **not** depend on it for shipped products yet.

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
- **[Architecture](docs/architecture/ARCHITECTURE.md)** - Internal structure, subsystem boundaries, and data flow
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
| **Behavior Trees**          | Generic BT framework with action, condition, selector, sequence, and reactive (priority-re-evaluating) nodes          |
| **Speed Control**           | Runtime speed multiplier, pause/resume; `step()` ignores both for testing                                             |
| **World State**             | Non-entity key-value store (`setState`/`getState`) for terrain config, simulation time, etc.                          |
| **Tags & Metadata**         | Entity labels with reverse-index (`getByTag`), per-entity metadata with unique lookup (`getByMeta`)                   |
| **Layered Field Maps**      | `Layer<T>` typed overlay map at configurable downsampled resolution for pollution / influence / weather etc., sparse storage with default-value semantics, JSON-serializable |
| **Atomic Transactions**     | `world.transaction()` chainable propose-validate-commit-or-abort builder — buffer mutations + events + `require()` preconditions, apply all-or-nothing on `commit()` |
| **System Cadence**          | Optional `interval` / `intervalOffset` on `SystemRegistration` — fire periodic systems at engine level instead of `if (w.tick % N) return;` boilerplate |
| **Serialization**           | JSON snapshot save/load via `serialize()`/`deserialize()`, including state, tags, metadata, and RNG                   |
| **State Diffs**             | Per-tick change sets: entities, components, resources, state, tags, and metadata changes                              |
| **Client Protocol**         | Transport-agnostic typed messages with protocol version markers and structured `commandAccepted`/`commandRejected` plus `commandExecuted`/`commandFailed`/`tickFailed` outcomes |
| **Session Recording & Replay** | `SessionRecorder` + `SessionReplayer` — capture deterministic, replayable bundles of any World run. `MemorySink` / `FileSink` for in-memory or disk persistence. Marker API for human-authored annotations + engine-emitted assertions (from `scenarioResultToBundle` adapter). `selfCheck` 3-stream comparison verifies determinism. `World.applySnapshot` for in-place state replacement. See `docs/guides/session-recording.md`. |
| **Synthetic Playtest Harness** | `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for `N` ticks → `SessionBundle`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Sub-RNG sandboxed from `world.rng` via `PolicyContext.random()`. Tier-1 of the AI-first feedback loop; produces FileSink/SessionBundle corpora that can be indexed by BundleCorpus and reduced by behavioral metrics. See `docs/guides/synthetic-playtest.md`. |
| **Bundle Corpus Index** | `BundleCorpus` scans closed FileSink bundle directories, lists metadata-only entries, filters by manifest-derived fields, and lazily loads matching `SessionBundle`s for replay or metrics. Tier-2 of the AI-first feedback loop; turns disk corpora into a deterministic query surface. See `docs/guides/bundle-corpus-index.md`. |
| **Behavioral Metrics over Corpus** | `runMetrics(bundles, metrics)` over `Iterable<SessionBundle>` + 11 engine-generic built-ins (`bundleCount`, `sessionLengthStats`, `commandRateStats`, `commandTypeCounts`, `failureBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`, etc.) + `compareMetricsResults` delta helper. Tier-2 of the AI-first feedback loop; pairs with synthetic playtests to define regressions for emergent behavior. See `docs/guides/behavioral-metrics.md`. |
| **AI Playtester Agent** | `runAgentPlaytest({ world, agent, maxTicks })` async sibling to `runSynthPlaytest` for LLM-driven (or any other async-decision) playtesters. `AgentDriver.decide(ctx)` is sync or async; v0.8.11 ctx adds `addMarker(input)` and `attach(blob, opts?)` for in-flight marker emission (with sidecar-friendly default sink, recoverable via `result.source.readSidecar(id)`). Optional `agent.report(bundle)` for post-run qualitative summaries. `bundleSummary(bundle)` produces a JSON-serializable structured snapshot for feeding to an LLM. `stopReason: 'maxTicks' \| 'stopWhen' \| 'poisoned' \| 'agentError' \| 'sinkError'`. See `docs/guides/ai-playtester.md`. |
| **Strict-Mode Determinism** | Opt-in `WorldConfig.strict` flag rejects mutation methods called outside system phases / setup window / `runMaintenance(fn)` callbacks. Throws `StrictModeViolationError` at the call site. Escape hatches: `endSetup()`, `runMaintenance(fn)` (depth-counted reentrant), `applySnapshot` (forward-compat). Default false (non-breaking). See `docs/guides/strict-mode.md`. |
| **Bundle Viewer** | `BundleViewer` — programmatic agent-driver API over a `SessionBundle`. Marker-anchored navigation (`atMarker(id).state()`), per-tick frames (selective runtime freezing — outer frame + per-tick arrays frozen one-time; recorded `diff` is a readonly view), lazy `SessionReplayer` materialization, two-path `frame.diffSince()` (folded TickDiffs vs snapshot via `diffSnapshots`), content-bounded `recordedRange` for incomplete bundles, eager query validation, and `BundleCorpusEntry.openViewer()` for one-line corpus-to-viewer composition. Tier-3 of the AI-first feedback loop. See `docs/guides/bundle-viewer.md`. |

## Architecture

Everything flows through a single `World` object:

```
World.step()
  -> process commands     (drain queue, run handlers)
  -> run systems          (phase-ordered game logic; periodic systems gated by interval/intervalOffset)
  -> process resources    (production, consumption, transfers)
  -> build diff           (collect changes for observers)
  -> update metrics       (timings, query counts, explicit-sync counts)
  -> tick++
```

Position writes (`setPosition`, `setComponent` on the configured position key) update the spatial grid lock-step; there is no per-tick scan.

Use `world.stepWithResult()` when an AI loop needs a structured runtime failure instead of an exception. `world.step()` remains the compatibility path and throws `WorldTickFailureError` on tick failure.

Use explicit instrumentation profiles in `WorldConfig`:

- `full` for AI development: detailed implicit metrics and the richest default observability
- `minimal` for QA/staging: coarse implicit metrics with lower hot-path overhead
- `release` for shipping: no implicit per-tick metrics, while explicit AI/debug APIs still work when you call them

See [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for detailed documentation.

## Repository Layout

The detailed file map lives in [Architecture](docs/architecture/ARCHITECTURE.md) and the full public surface lives in [API Reference](docs/api-reference.md).

At the repo level:

```text
src/       engine modules and public package exports
tests/     unit and integration coverage
examples/  reference clients and demos
docs/      guides, tutorials, architecture, changelog, and review history
```

## Public Surface

The root package centers on a few primary entry points:

- `World` for simulation, commands, events, serialization, diffs, resources, and atomic transactions (`world.transaction()`)
- `ClientAdapter` and `RenderAdapter` for external clients and render transports
- `WorldDebugger`, `WorldHistoryRecorder`, and `runScenario()` for AI/debug workflows
- `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `MemorySink`/`FileSink`, `Marker`, `RecordedCommand`, `scenarioResultToBundle()` for session capture/replay (`docs/guides/session-recording.md`)
- `runSynthPlaytest`, `noopPolicy`, `randomPolicy`, `scriptedPolicy` for the synthetic playtest harness (Tier-1 of the AI-first feedback loop; `docs/guides/synthetic-playtest.md`)
- `BundleCorpus`, `BundleQuery`, `BundleCorpusEntry`, `BundleCorpusMetadata`, `CorpusIndexError`, `CorpusIndexErrorCode`, and `InvalidCorpusEntry` for manifest-first disk corpus listing, filtering, and lazy FileSink-backed bundle loading (Tier-2 of the AI-first feedback loop; `docs/guides/bundle-corpus-index.md`)
- `runMetrics`, `compareMetricsResults`, plus 11 metric factories (`bundleCount`, `sessionLengthStats`, `commandRateStats`, `eventRateStats`, `commandTypeCounts`, `eventTypeCounts`, `failureBundleRate`, `failedTickRate`, `incompleteBundleRate`, `commandValidationAcceptanceRate`, `executionFailureRate`) for behavioral metrics over a corpus (Tier-2 of the AI-first feedback loop; `docs/guides/behavioral-metrics.md`)
- `BundleViewer`, `TickFrame`, `BundleStateDiff`, `RecordedTickFrameEvent`, `RecordedTickEvent`, `BundleViewerError`, `diffSnapshots`, plus query/option types — programmatic agent-driver API for navigating, slicing, and diffing a `SessionBundle`; composes with `BundleCorpus` via `entry.openViewer()` (Tier-3 of the AI-first feedback loop; `docs/guides/bundle-viewer.md`)
- `StrictModeViolationError`, `StrictModePhase`, `StrictModeViolationDetails`, plus `WorldConfig.strict` and `World.endSetup` / `World.runMaintenance` / `World.isStrict` / `World.isInTick` / `World.isInSetup` / `World.isInMaintenance` — opt-in mutation-gate enforcement; throws on out-of-tick mutation when strict (Tier-3 of the AI-first feedback loop; `docs/guides/strict-mode.md`)
- `runAgentPlaytest`, `AgentDriver`, `AgentDriverContext`, `AgentPlaytestConfig`, `AgentPlaytestResult`, `AgentStopReason`, `bundleSummary`, `BundleSummary` — async sibling to `runSynthPlaytest` for LLM-driven (or any other async-decision) playtesters; `AgentDriver.decide(ctx)` is sync or async; v0.8.11 added `ctx.addMarker(input)` and `ctx.attach(blob, opts?)` for in-flight marker emission, plus `result.source` so default-sink callers can `readSidecar(id)`; optional `agent.report(bundle)` for post-run qualitative summaries; `bundleSummary` produces a JSON-flat snapshot for LLM context (Tier-2 of the AI-first feedback loop; `docs/guides/ai-playtester.md`)
- standalone utilities for pathfinding, map generation, occupancy/crowding, visibility, behavior trees, and typed overlay layers (`Layer<T>`)

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
