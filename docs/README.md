# Documentation

This is the navigation hub for `civ-engine` documentation.

## Start Here

- [Getting Started](guides/getting-started.md) - Minimal setup, core concepts, and first-world walkthrough
- [Core Concepts](guides/concepts.md) - Headless ECS model, tick lifecycle, determinism, and engine boundaries
- [AI Integration](guides/ai-integration.md) - Core AI-native surfaces and how they compose into the recursive improvement loop
- [Building a Complete Game](guides/building-a-game.md) - End-to-end example using the engine as a game foundation

## Reference

- [API Reference](api-reference.md) - Public types, methods, and standalone utilities
- [Architecture](architecture/ARCHITECTURE.md) - Internal structure, subsystem boundaries, and data flow
- [Public API & Invariants](guides/public-api-and-invariants.md) - Package boundary, JSON-safe data rules, entity refs, and write APIs
- [Changelog](changelog.md) - Shipped changes and breaking changes

The API reference is the authoritative public surface. The root `README.md` is intentionally a high-level overview.

## Guides

- [AI Integration](guides/ai-integration.md)
- [MCP Server](guides/mcp-server.md)
- [Scenario Runner](guides/scenario-runner.md)
- [Entities & Components](guides/entities-and-components.md)
- [Systems & Simulation](guides/systems-and-simulation.md)
- [Spatial Grid](guides/spatial-grid.md)
- [Sub-Grid Movement & Grid Resolution](guides/sub-grid-movement.md)
- [Commands & Events](guides/commands-and-events.md)
- [Resources](guides/resources.md)
- [Serialization & Diffs](guides/serialization-and-diffs.md)
- [Client Protocol](guides/client-protocol.md)
- [Debugging](guides/debugging.md)
- [Session Recording & Replay](guides/session-recording.md)
- [Synthetic Playtest Harness](guides/synthetic-playtest.md) — Tier-1 autonomous-driver primitive with sub-RNG-isolated policy randomness
- [Bundle Corpus Index](guides/bundle-corpus-index.md) - Tier-2 manifest-first FileSink corpus listing, filtering, and lazy bundle loading
- [Behavioral Metrics over Corpus](guides/behavioral-metrics.md) — Tier-2 corpus reducer with 11 engine-generic built-in metrics + comparison helper
- [Bundle Viewer](guides/bundle-viewer.md) — Tier-3 programmatic agent-driver API over a `SessionBundle` (marker-anchored navigation, two-path `diffSince`, `diffSnapshots` helper, `BundleCorpusEntry.openViewer` integration)
- [Strict Mode](guides/strict-mode.md) — Tier-3 opt-in `WorldConfig.strict` mutation-gate enforcement (rejects out-of-tick mutations; `runMaintenance(fn)` escape hatch; `StrictModeViolationError` at the call site)
- [AI Playtester Agent](guides/ai-playtester.md) — Tier-2 async sibling to `runSynthPlaytest` for LLM-driven playtesters; `AgentDriver` interface (sync or async `decide`); `bundleSummary` JSON-flat helper for LLM context
- [Visual Playtest Harness](guides/visual-playtest-harness.md) - Zero-dependency screenshot/control/hidden-state loop contracts for browser-game LLM playtests
- [Renderer Integration](guides/rendering.md)
- [RTS Primitives](guides/rts-primitives.md)
- [Map Generation](guides/map-generation.md)
- [Pathfinding](guides/pathfinding.md)
- [Behavior Trees](guides/behavior-trees.md)

## Plans and Threads

Active work and review syntheses live under `threads/current/`; closed objectives live under `threads/done/`. Each objective folder is a concise kebab-case thread name. Authoritative thread designs and implementation plans live directly under that folder as `DESIGN.md` and `PLAN.md`; review iterations stay one level deeper under date and iteration folders, with `REVIEW.md` as the committed summary.

### Implemented

- [Agent Recursive Improvement Loop](work/66_agent-recursive-improvement-loop/historical/threads/done/agent-recursive-improvement-loop/DESIGN.md) - Shipped design for the engine's core AI-native usage case: run/playtest, record, find, verify, classify, promote, fix or propose, review, rerun, compare, and learn.
- [AI Runtime Feedback Plan](work/18_ai-runtime-feedback/reviews/0_legacy.md) - Tick-time command execution, structured tick failures, and transport/debug/history runtime feedback that has already landed
- [AI Final Form Plan](work/16_ai-final-form/reviews/0_legacy.md) - Versioned AI contracts, budget-aware diagnostics, and history range summaries that have already landed
- [AI-First Engine Plan](work/17_ai-first-engine/reviews/0_legacy.md) - Machine-facing command/debug/history improvements that have already landed
- [Render Contract and Debugger Plan](work/14_render-contract-debugger/reviews/0_legacy.md) - Render-facing projection and debugger support work that has already landed
- [RTS Engine Scale Plan](work/15_rts-engine-scale/reviews/0_legacy.md) - RTS-scale support work that has already landed
- [Expert Review Remaining Candidates](work/19_expert-review-remaining/reviews/0_legacy.md) - Archived on 2026-04-11; remaining SoA and dependency-graph ideas stay deferred until measured workloads justify them
- [Expert Review](work/13_expert-review/reviews/0_legacy.md) - Review findings already addressed
- [Engine Design Review](work/11_engine-design-review/reviews/0_legacy.md) - Broader engine assessment
- [Engine Hardening Plan](work/12_engine-hardening/reviews/0_legacy.md) - Hardening work that has already landed

## History and Internal Process

- [Devlog Summary](devlog/summary.md) - Short chronological history
- [Devlog Detailed](devlog/detailed/) - Detailed implementation logs
- [`superpowers/plans/`](superpowers/plans) - Historical implementation plans
- [`superpowers/specs/`](superpowers/specs) - Historical design specs
- [`design/`](design) - Cross-thread roadmap and historical design material that does not belong to a single thread

The `superpowers/`, `design/`, and devlog documents are retained as project history. They may mention files or workflows that have since been reorganized.
