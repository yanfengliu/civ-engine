# Documentation

This is the navigation hub for `civ-engine` documentation.

## Start Here

- [Getting Started](tutorials/getting-started.md) - Minimal setup, core concepts, and first-world walkthrough
- [Core Concepts](guides/concepts.md) - Headless ECS model, tick lifecycle, determinism, and engine boundaries
- [Building a Complete Game](tutorials/building-a-game.md) - End-to-end example using the engine as a game foundation

## Reference

- [API Reference](api-reference.md) - Public types, methods, and standalone utilities
- [Architecture](ARCHITECTURE.md) - Internal structure, subsystem boundaries, and data flow
- [Public API & Invariants](guides/public-api-and-invariants.md) - Package boundary, JSON-safe data rules, entity refs, and write APIs
- [Changelog](changelog.md) - Shipped changes and breaking changes

## Guides

- [Entities & Components](guides/entities-and-components.md)
- [Systems & Simulation](guides/systems-and-simulation.md)
- [Spatial Grid](guides/spatial-grid.md)
- [Commands & Events](guides/commands-and-events.md)
- [Resources](guides/resources.md)
- [Serialization & Diffs](guides/serialization-and-diffs.md)
- [Client Protocol](guides/client-protocol.md)
- [Renderer Integration](guides/rendering.md)
- [Map Generation](guides/map-generation.md)
- [Pathfinding](guides/pathfinding.md)
- [Behavior Trees](guides/behavior-trees.md)

## Current Plans and Reviews

Active future work lives in focused plan and review documents rather than a generic roadmap page.

- [RTS Engine Scale Plan](reviews/todo/RTS_ENGINE_SCALE_PLAN.md) - Current forward-looking engine work for RTS-scale support
- [Expert Review Remaining Candidates](reviews/todo/EXPERT_REVIEW_REMAINING.md) - Deferred review items not yet selected for implementation
- [Expert Review](reviews/implemented/EXPERT_REVIEW.md) - Review findings already addressed
- [Engine Design Review](reviews/implemented/ENGINE_DESIGN_REVIEW.md) - Broader engine assessment
- [Engine Hardening Plan](reviews/implemented/ENGINE_HARDENING_PLAN.md) - Hardening work that has already landed

## History and Internal Process

- [Devlog Summary](devlog-summary.md) - Short chronological history
- [Devlog Detailed](devlog-detailed.md) - Detailed implementation log
- [`superpowers/plans/`](superpowers/plans) - Historical implementation plans
- [`superpowers/specs/`](superpowers/specs) - Historical design specs

The `superpowers/` and devlog documents are retained as project history. They may mention files or workflows that have since been reorganized.
