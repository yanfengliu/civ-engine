# Documentation

This is the navigation hub for `civ-engine` documentation.

## Start Here

- [Getting Started](guides/getting-started.md) - Minimal setup, core concepts, and first-world walkthrough
- [Core Concepts](guides/concepts.md) - Headless ECS model, tick lifecycle, determinism, and engine boundaries
- [Building a Complete Game](guides/building-a-game.md) - End-to-end example using the engine as a game foundation

## Reference

- [API Reference](api-reference.md) - Public types, methods, and standalone utilities
- [Architecture](architecture/ARCHITECTURE.md) - Internal structure, subsystem boundaries, and data flow
- [Public API & Invariants](guides/public-api-and-invariants.md) - Package boundary, JSON-safe data rules, entity refs, and write APIs
- [Changelog](changelog.md) - Shipped changes and breaking changes

The API reference is the authoritative public surface. The root `README.md` is intentionally a high-level overview.

## Guides

- [AI Integration](guides/ai-integration.md)
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
- [Renderer Integration](guides/rendering.md)
- [RTS Primitives](guides/rts-primitives.md)
- [Map Generation](guides/map-generation.md)
- [Pathfinding](guides/pathfinding.md)
- [Behavior Trees](guides/behavior-trees.md)

## Plans and Threads

Active work and review syntheses live under `threads/current/`; closed objectives live under `threads/done/`. Each objective folder is a concise kebab-case thread name. Authoritative thread designs and implementation plans live directly under that folder as `DESIGN.md` and `PLAN.md`; review iterations stay one level deeper under date and iteration folders, with `REVIEW.md` as the committed summary.

### Active

- No active threads at the moment. Re-open a focused plan only when benchmark data or a concrete game workload justifies it.

### Implemented

- [AI Runtime Feedback Plan](threads/done/ai-runtime-feedback/2026-04-11/1/REVIEW.md) - Tick-time command execution, structured tick failures, and transport/debug/history runtime feedback that has already landed
- [AI Final Form Plan](threads/done/ai-final-form/2026-04-11/1/REVIEW.md) - Versioned AI contracts, budget-aware diagnostics, and history range summaries that have already landed
- [AI-First Engine Plan](threads/done/ai-first-engine/2026-04-11/1/REVIEW.md) - Machine-facing command/debug/history improvements that have already landed
- [Render Contract and Debugger Plan](threads/done/render-contract-debugger/2026-04-10/1/REVIEW.md) - Render-facing projection and debugger support work that has already landed
- [RTS Engine Scale Plan](threads/done/rts-engine-scale/2026-04-10/1/REVIEW.md) - RTS-scale support work that has already landed
- [Expert Review Remaining Candidates](threads/done/expert-review-remaining/2026-04-11/1/REVIEW.md) - Archived on 2026-04-11; remaining SoA and dependency-graph ideas stay deferred until measured workloads justify them
- [Expert Review](threads/done/expert-review/2026-04-10/1/REVIEW.md) - Review findings already addressed
- [Engine Design Review](threads/done/engine-design-review/2026-04-10/1/REVIEW.md) - Broader engine assessment
- [Engine Hardening Plan](threads/done/engine-hardening/2026-04-10/1/REVIEW.md) - Hardening work that has already landed

## History and Internal Process

- [Devlog Summary](devlog/summary.md) - Short chronological history
- [Devlog Detailed](devlog/detailed/) - Detailed implementation logs
- [`superpowers/plans/`](superpowers/plans) - Historical implementation plans
- [`superpowers/specs/`](superpowers/specs) - Historical design specs
- [`design/`](design) - Cross-thread roadmap and historical design material that does not belong to a single thread

The `superpowers/`, `design/`, and devlog documents are retained as project history. They may mention files or workflows that have since been reorganized.
