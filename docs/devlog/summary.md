# Devlog Summary

> Always read this file at session start to understand current project state.

## Current state (v0.7.6)

- Engine surface stabilised after the iter-1–9 multi-CLI review chain (Codex + Opus + Gemini, with Gemini quota-out for iter-3+). Two breaking releases since v0.5: v0.5.0 removed in-place mutation auto-detection (all writes go through `setComponent`/`setPosition`), v0.6.0 made `CommandTransaction` predicates take a typed read-only façade, v0.7.0 closed the C1 denylist hole. Iter-9 closed clean — both Codex and Opus reported zero findings.
- Public surface: `World<TEventMap, TCommandMap, TComponents, TState>` with phased `step()` / `stepWithResult()` (fail-fast poison + `recover()`), `world.transaction()`, events / commands / resources / state / tags / metadata, snapshot v5 (round-trips per-component `diffMode` + `maxTicksPerFrame` + `instrumentationProfile`), deterministic RNG via `seed`. Per-system cadence via `interval` / `intervalOffset` (v0.5.9). Standalone utilities: `OccupancyGrid` / `OccupancyBinding` / `SubcellOccupancyGrid`, `Layer<T>` (strip-at-write sparse + primitive fast-path + `forEachReadOnly`), `findGridPath` / `PathCache` / `PathRequestQueue`, `VisibilityMap`, behavior trees with reactive variants + `clearRunningState`, noise / cellular / `createTileGrid`. Adapters: `ClientAdapter`, `RenderAdapter`, `WorldDebugger` + probes, `WorldHistoryRecorder` + `summarizeWorldHistoryRange`, `runScenario`.
- Validation gates (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`) green at 630 tests; RTS benchmark + browser debug client run against the v0.5.0 metrics shape (`spatial.explicitSyncs`; no per-tick scan).

## Recent milestones

- 2026-04-26: Iter-9 closing convergence check — Codex + Opus both clean. Loop converged after 9 iterations spanning v0.4.1 → v0.7.6 across the CommandTransaction chain (iter-1–6), the broader-sweep iter-7 (`v0.7.5`, 7 fixes incl. deserialize entity-ID liveness, EventBus listener payload clone, ClientAdapter mapping race, `octaveNoise2D` validation, ComponentStore semantic revert-to-baseline, deserialize tick validation hoisting), iter-8's parallel-branch fix-up (v0.7.6), and iter-9's clean confirmation.
- 2026-04-26: Followups (v0.7.4) — `as any` cast on transaction emit dispatch replaced with narrower casts; `SYSTEM_PHASES` extracted to `world-internal.ts` to break a circular value-import; doc audit refreshed `api-reference.md` / `ARCHITECTURE.md` / `drift-log.md` for the v0.6.0 → v0.7.3 chain.
- 2026-04-25/26: MicropolisCore study landed three additive features — per-system `interval` / `intervalOffset` (v0.5.9), `Layer<T>` overlay map (v0.5.10), and `CommandTransaction` (v0.5.11) — each shipped with multi-CLI review.

## Long-term context

- 2026-04-04 → 2026-04-12: foundational ECS, spatial grid, events, commands, resources, save/load, diffs, simplex/cellular/A*, behavior trees, ergonomics features (typed component registry, world state, spatial helpers, ordering constraints, tags + metadata).
- 2026-04-20 → 2026-04-23: occupancy follow-ups (`OccupancyBinding` metadata + destroy hooks), reactive BT nodes + per-component semantic diff mode.
- 2026-04-25: full-codebase multi-CLI review → 25 findings → v0.4.1 → v0.5.8 across iter-1–6, ending with all reviewers clean. Established the iter-N convention for review chains.

For per-task entries (with reviewer comments and validation runs), see `docs/devlog/detailed/`.
