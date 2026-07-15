# civ-engine

![version](https://img.shields.io/badge/version-2.4.1-blue) ![status](https://img.shields.io/badge/status-stable-brightgreen)

> **Post-1.0, not yet production-validated.** The public API surface is frozen under semver as of `1.0.0`: additions ship as minors; breaking changes ship only as majors — removals through the deprecation policy, and behavior or default changes alike ([public API & invariants](docs/guides/public-api-and-invariants.md)). Invariants are hardened by adversarial review — independent agents that try to refute each change against the live code, escalating to multi-CLI review for high-risk work — but no production deployment has validated the engine end-to-end. Use it for prototyping, AI-agent experiments, and feedback — production consumers should pin a version and track the [changelog](docs/changelog.md).

A general-purpose, headless, AI-native 2D grid-based game engine. Built in TypeScript with a strict ECS (Entity-Component-System) architecture. Zero runtime dependencies.

The engine provides reusable infrastructure that game projects consume — it has no game-specific logic, rendering, or UI code.

## What "AI-native" means

The engine is designed to be operated by AI agents, not human players directly. Humans provide high-level game designs; AI agents write game logic, submit commands, and observe state through structured, machine-readable interfaces. Every debugging surface is built to be driven by an agent in a closed implement-debug-iterate loop without human intervention.

The core usage case is the **recursive improvement loop**: agents run or playtest a game, record evidence, extract findings, verify claims against replay/state/screenshots/specs, promote confirmed failures into durable regressions, fix or propose a focused change, rerun gates, compare outcomes, and leave a ledger the next agent can learn from.

The engine owns the shared machine contracts for that loop — the `ImprovementFinding` payload, the marker bridge, and the run-manifest lifecycle, with honesty invariants enforced by default. Gates, browser/provider adapters, and auto-fix policy remain game-repo-owned. See the [loop design](docs/threads/done/agent-recursive-improvement-loop/DESIGN.md).

## Quick Start

```bash
npm install
npm test        # run all tests
npm run lint    # lint
npm run typecheck
npm run build   # emit dist package files
npm run debug:client   # build and serve the browser debug client example
npm run benchmark:check  # perf regression gate vs benchmarks/baseline.json
```

Requires Node.js 20+.

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
    if (pos.x === 0) w.setComponent(id, 'health', { hp: hp.hp - 10 }); // the left edge hurts
  }
});

// Step the simulation
world.step();
world.getComponent<{ hp: number }>(unit, 'health'); // -> { hp: 90 }
```

## Documentation

**[Documentation Hub](docs/README.md)** — full navigation for every guide, tutorial, plan, and review.

Start here:

- [Getting Started](docs/guides/getting-started.md) — fastest path to a running world
- [Core Concepts](docs/guides/concepts.md) — headless ECS model, tick lifecycle, determinism, engine boundaries
- [Building a Complete Game](docs/guides/building-a-game.md) — end-to-end example using the engine as a foundation
- [AI Integration](docs/guides/ai-integration.md) — the AI-native surfaces and how they compose into the improvement loop

Reference:

- [API Reference](docs/api-reference.md) — **the authoritative public surface**: every type, method, and standalone utility
- [Architecture](docs/architecture/ARCHITECTURE.md) — internal structure, subsystem boundaries, data flow
- [Changelog](docs/changelog.md) — shipped changes, migrations, and version history

## Feature Overview

Capabilities at a glance. Signatures and options live in the [API Reference](docs/api-reference.md).

### Core simulation

| Feature | What it does |
| --- | --- |
| **Entities & Components** | Numeric entity IDs with typed data objects attached by key |
| **Typed Components** | Optional `ComponentRegistry` type param for type-safe `getComponent`/`setComponent`/`query` without manual generics |
| **Systems** | Pure `(world) => void` functions with optional phase and `before`/`after` ordering constraints |
| **System Cadence** | Optional `interval` / `intervalOffset` fires periodic systems at engine level, replacing `if (w.tick % N) return;` boilerplate |
| **Commands** | Typed input buffer with validators, queue-time submission results, tick-time execution results, and handlers — how AI agents send instructions |
| **Events** | Typed pub/sub — how systems communicate and how observers read what happened |
| **Resources** | Numeric pools (current/max) per entity with production, consumption, and transfers |
| **Atomic Transactions** | `world.transaction()` chainable propose-validate-commit-or-abort builder — buffer mutations, events, and `require()` preconditions, then apply all-or-nothing on precondition failure or abort (a mutation that *throws* mid-commit consumes the transaction and can leave partial state) |
| **World State** | Non-entity key-value store (`setState`/`getState`) for terrain config, simulation time, etc. |
| **Tags & Metadata** | Entity labels with reverse-index (`getByTag`), plus per-entity metadata with unique lookup (`getByMeta`) |
| **Strict-Mode Determinism** | Rejects mutations called outside system phases, the setup window, or `runMaintenance(fn)`, throwing `StrictModeViolationError` at the call site. **On by default**; `strict: false` opts out, and legacy pre-1.0 snapshots deserialize non-strict. ([guide](docs/guides/strict-mode.md)) |
| **Speed Control** | Runtime speed multiplier and pause/resume; `step()` ignores both for testing |
| **Serialization** | JSON snapshot save/load via `serialize()`/`deserialize()`, including state, tags, metadata, and RNG |
| **State Diffs** | Per-tick change sets across entities, components, resources, state, tags, and metadata |

### Spatial & world generation

| Feature | What it does |
| --- | --- |
| **Spatial Grid** | 2D grid auto-synced with position components; neighbor queries, `queryInRadius`, `findNearest` |
| **Occupancy & Crowding** | Deterministic blocked-cell footprints, blocker metadata, lifecycle bindings, crowding-aware passability, reservations, and sub-cell slot packing. See [sub-grid movement](docs/guides/sub-grid-movement.md) for fine-grid simulation, coarse building placement, and renderer-owned smooth motion |
| **Pathfinding** | Generic A* on any graph — provide neighbors/cost/heuristic/hash callbacks |
| **Queued Grid Pathfinding** | `findGridPath`, `PathCache`, and `PathRequestQueue` for deterministic batched path processing |
| **Visibility Maps** | Per-player visible and explored cell tracking for fog-of-war style mechanics |
| **Layered Field Maps** | `Layer<T>` typed overlay at configurable downsampled resolution (pollution, influence, weather); sparse storage with default-value semantics, JSON-serializable |
| **Map Generation** | Seedable simplex noise, octave layering, cellular automata, and a tile grid helper |
| **Behavior Trees** | Generic BT framework with action, condition, selector, sequence, and reactive (priority-re-evaluating) nodes |

### Client & rendering integration

| Feature | What it does |
| --- | --- |
| **Render Projection** | `RenderAdapter` and projection callbacks for renderer-facing snapshots/diffs without coupling the engine to a backend |
| **Client Protocol** | Transport-agnostic typed messages with protocol version markers and structured accept/reject plus execute/fail/tick-fail outcomes |
| **Player Observation** | `PlayerObserver` per-player fog-of-war projection — filtered snapshot plus an entered/updated/exited feed, with honest destroyed-vs-fog attribution |

### Debugging & inspection

| Feature | What it does |
| --- | --- |
| **Debugging** | `WorldDebugger`, machine-readable issues, structured tick failures, `WorldHistoryRecorder`, range summaries, and probes for headless inspection ([guide](docs/guides/debugging.md)) |
| **Engine Errors** | Every core throw carries a stable machine-readable `code` plus structured `details`, so agents branch on codes instead of message prose. The one wrapper is `WorldTickFailureError` — catch it and read `failure.code` |
| **Scenario Runner** | `runScenario()` for headless setup, scripted stepping, checks, and structured AI-facing results ([guide](docs/guides/scenario-runner.md)) |

### Recording, replay & the improvement loop

| Feature | What it does |
| --- | --- |
| **Session Recording & Replay** | `SessionRecorder` + `SessionReplayer` capture deterministic, replayable bundles of any run. `MemorySink`/`FileSink` for memory or disk, a marker API for annotations and engine-emitted assertions, and `selfCheck` 3-stream determinism verification ([guide](docs/guides/session-recording.md)) |
| **Counterfactual Replay** | `forkAt(tick).replace/insert/drop.run()` answers "what if the agent had submitted X here?" — produces a normal bundle plus a `Divergence` summary. `diffBundles()` compares any two bundles ([guide](docs/guides/session-recording.md)) |
| **Bundle Viewer** | `BundleViewer` programmatic agent-driver API over a bundle: marker-anchored navigation, per-tick frames, and two-path `diffSince()` ([guide](docs/guides/bundle-viewer.md)) |
| **Bundle Hotspots** | `bundleHotspots()` triage list of interesting ticks — tick failures, execution failures, duration outliers, and markers |
| **Bundle Corpus Index** | `BundleCorpus` turns disk corpora into a deterministic query surface: metadata-only listing, manifest-derived filtering, and lazy bundle loading ([guide](docs/guides/bundle-corpus-index.md)) |
| **Behavioral Metrics** | `runMetrics()` over any bundle iterable with 11 engine-generic built-ins plus a `compareMetricsResults` delta helper — defines regressions for emergent behavior ([guide](docs/guides/behavioral-metrics.md)) |
| **Synthetic Playtest** | `runSynthPlaytest` drives a world via pluggable policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`) with RNG sandboxed from `world.rng` ([guide](docs/guides/synthetic-playtest.md)) |
| **AI Playtester** | `runAgentPlaytest` async sibling for LLM-driven playtesters — sync-or-async `AgentDriver.decide()`, in-flight markers/attachments, optional `report()`, and `bundleSummary()` for LLM context ([guide](docs/guides/ai-playtester.md)) |
| **Visual Playtest Harness** | `runVisualPlaytestLoop` plus host/agent contracts for browser games driven through screenshots, visible text, controls, and explicitly labeled hidden-state channels. Agent-boundary redaction is **on by default**; core stays zero-dep, game repos own the Playwright/DOM/model adapters ([guide](docs/guides/visual-playtest-harness.md)) |
| **Improvement Loop Contracts** | `ImprovementFinding` plus marker bridges, signatures, and run-manifest lifecycle give game repos a shared verified-finding payload. Proven-outcome claims (`verified`, `fixed`, `regressed`) require a replayable evidence ref plus a `verificationMethod` by default — an unproven "fixed" cannot enter the ledger |
| **MCP Server** | `civ-engine-mcp` exposes the recorded-game surfaces as 14 read-only tools for any MCP-capable agent — zero game code required ([guide](docs/guides/mcp-server.md)) |

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
  -> notify diff listeners (fires after tick++; still in-tick, and can fail the tick with diff_listener_threw)
```

Position writes (`setPosition`, `setComponent` on the configured position key) update the spatial grid lock-step; there is no per-tick scan.

Use `world.stepWithResult()` when an AI loop needs a structured runtime failure instead of an exception. `world.step()` remains the compatibility path and throws `WorldTickFailureError` on tick failure.

Set an instrumentation profile in `WorldConfig`:

- `full` (the default) for AI development — detailed implicit metrics and the richest default observability
- `minimal` for QA/staging — coarse implicit metrics with lower hot-path overhead
- `release` for shipping — no implicit per-tick metrics, while explicit AI/debug APIs still work when called

See [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for detail.

## Node and browser entry points

Two entries. Node resolves the full barrel. Bundlers with the `browser` condition (Vite, webpack, esbuild) and the explicit `civ-engine/browser` subpath resolve a browser-safe barrel — the full surface minus the node-only `FileSink` and `BundleCorpus`, with a module graph free of `node:` builtins, so browser consumers boot without prebundling workarounds or alias shims.

[docs/api-reference.md](docs/api-reference.md) is authoritative for signatures, types, message shapes, and every standalone utility.

## Repository Layout

```text
src/         engine modules and public package exports
mcp/         civ-engine-mcp — the MCP server subpackage
tests/       unit and integration coverage
examples/    reference clients and demos
scripts/     debug-client server and the RTS benchmark harness
benchmarks/  committed baseline for the perf regression gate
docs/        guides, tutorials, architecture, changelog, and review history
```

The detailed file map lives in [Architecture](docs/architecture/ARCHITECTURE.md).

## Design Decisions

- **Sparse arrays** for component storage — O(1) lookup, simple implementation
- **Statically resolved system order** — phases and `before`/`after` constraints resolve once at registration and cache; deterministic execution, no per-tick scheduler overhead
- **Monolithic World** — flat API, internals are hidden
- **Zero runtime deps** — pure TypeScript, nothing to break
- **Dirty-set change tracking** — per-tick dirty/removed sets (plus fingerprint baselines in semantic diff mode) drive diff and serialization; separate entity **generation counters** make recycled entity IDs detectable through stale refs
- **Standalone utilities** — noise, cellular, map-gen, pathfinding are not World subsystems

## License

MIT — see [LICENSE](LICENSE).
