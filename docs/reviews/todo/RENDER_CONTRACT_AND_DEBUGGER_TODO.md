# Render Contract and Debugger Todo

Status: Completed on 2026-04-10

This document stays under `docs/reviews/todo/` because that was the requested location for the work item, even though the implementation is now landed.

## Goal

Add a renderer-facing contract and a more comprehensive debugger without making the engine itself responsible for concrete rendering.

## Completed

- [x] Add a renderer projection boundary with generation-aware entity refs.
- [x] Add a `RenderAdapter` that streams projected snapshots and per-tick render diffs.
- [x] Keep the projection callback game-owned so the engine stays headless and renderer-agnostic.
- [x] Add a `WorldDebugger` that captures core world state, metrics, diff summaries, events, and warnings.
- [x] Add debugger probes for `OccupancyGrid`, `VisibilityMap`, and `PathRequestQueue`.
- [x] Cover ID recycling, render-only entity removal, and debug probe capture with tests.
- [x] Update guides and API reference to document the render/debug boundary.

## Landed Files

- `src/render-adapter.ts`
- `src/world-debugger.ts`
- `tests/render-adapter.test.ts`
- `tests/world-debugger.test.ts`

## Next Practical Step

Use `RenderAdapter` plus a game-owned projector module to feed a reference renderer client. Start with a debug-first client, then layer in a real PixiJS scene adapter on top of the same projected contract.
