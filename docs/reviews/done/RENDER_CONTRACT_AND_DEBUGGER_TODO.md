# Render Contract and Debugger Todo

Status: DONE on 2026-04-10

This document stays under `docs/reviews/todo/` because that was the requested location for the work item, even though the implementation is now landed.

## Goal

Add a renderer-facing contract and a more comprehensive debugger without making the engine itself responsible for concrete rendering.

## Done

- [x] Add a renderer projection boundary with generation-aware entity refs.
- [x] Add a `RenderAdapter` that streams projected snapshots and per-tick render diffs.
- [x] Keep the projection callback game-owned so the engine stays headless and renderer-agnostic.
- [x] Add a `WorldDebugger` that captures core world state, metrics, diff summaries, events, and warnings.
- [x] Add debugger probes for `OccupancyGrid`, `VisibilityMap`, and `PathRequestQueue`.
- [x] Cover ID recycling, render-only entity removal, and debug probe capture with tests.
- [x] Update guides and API reference to document the render/debug boundary.
- [x] Add a browser reference debug client that consumes `renderSnapshot` and `renderTick` messages from a worker-owned simulation.
- [x] Make the reference debugger comprehensive enough to inspect occupancy, reservations, visibility, paths, entity state, metrics, events, warnings, and the raw payload in one place.

## Landed Files

- `src/render-adapter.ts`
- `src/world-debugger.ts`
- `tests/render-adapter.test.ts`
- `tests/world-debugger.test.ts`
- `examples/debug-client/index.html`
- `examples/debug-client/styles.css`
- `examples/debug-client/app.js`
- `examples/debug-client/worker.js`
- `scripts/serve-debug-client.mjs`

## Next Practical Step

Use the same projector boundary to build a real scene adapter on top of PixiJS or another chosen runtime. The debug client should remain the first stop for protocol and simulation debugging, while the production renderer focuses on assets, animation, culling, and UI.
