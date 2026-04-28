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

## Plans and Reviews

Active future work lives in focused plan and review documents rather than a generic roadmap page.

### Active

- No active review TODOs at the moment. Re-open a focused plan only when benchmark data or a concrete game workload justifies it.

### Implemented

- [AI Runtime Feedback Plan](reviews/done/AI_RUNTIME_FEEDBACK_PLAN.md) - Tick-time command execution, structured tick failures, and transport/debug/history runtime feedback that has already landed
- [AI Final Form Plan](reviews/done/AI_FINAL_FORM_PLAN.md) - Versioned AI contracts, budget-aware diagnostics, and history range summaries that have already landed
- [AI-First Engine Plan](reviews/done/AI_FIRST_ENGINE_PLAN.md) - Machine-facing command/debug/history improvements that have already landed
- [Render Contract and Debugger Plan](reviews/done/RENDER_CONTRACT_AND_DEBUGGER_PLAN.md) - Render-facing projection and debugger support work that has already landed
- [RTS Engine Scale Plan](reviews/done/RTS_ENGINE_SCALE_PLAN.md) - RTS-scale support work that has already landed
- [Expert Review Remaining Candidates](reviews/done/EXPERT_REVIEW_REMAINING.md) - Archived on 2026-04-11; remaining SoA and dependency-graph ideas stay deferred until measured workloads justify them
- [Expert Review](reviews/done/EXPERT_REVIEW.md) - Review findings already addressed
- [Engine Design Review](reviews/done/ENGINE_DESIGN_REVIEW.md) - Broader engine assessment
- [Engine Hardening Plan](reviews/done/ENGINE_HARDENING_PLAN.md) - Hardening work that has already landed

## History and Internal Process

- [Devlog Summary](devlog/summary.md) - Short chronological history
- [Devlog Detailed](devlog/detailed/) - Detailed implementation logs
- [`superpowers/plans/`](superpowers/plans) - Historical implementation plans
- [`superpowers/specs/`](superpowers/specs) - Historical design specs

The `superpowers/` and devlog documents are retained as project history. They may mention files or workflows that have since been reorganized.
