# Debugging Guide

This guide covers the headless debugging surface for `civ-engine`.

The short version: use `WorldDebugger` for a structured snapshot of world state, metrics, diff summaries, issues, and custom probe data. Pair it with `WorldHistoryRecorder` when you need short-horizon traces, and with `RenderAdapter` when you want a debug-first client before a production renderer exists.

## What It Captures

`WorldDebugger` captures:

- `schemaVersion`
- tick and entity counts
- component and resource summaries
- spatial density summary from the world's position component
- last-tick metrics from `world.getMetrics()`
- last diff summary from `world.getDiff()`
- event counts from `world.getEvents()`
- machine-readable `issues` for engine-level edge cases such as same-tick ID recycling and tick-budget overruns
- compatibility `warnings` derived from those issues
- custom probe output

## Basic Usage

```typescript
import { WorldDebugger } from 'civ-engine';

const debuggerView = new WorldDebugger({ world });
const snapshot = debuggerView.capture();
```

## History Recorder

Use `WorldHistoryRecorder` when an AI agent or test harness needs recent command outcomes and tick traces without building a full replay system.

```typescript
import {
  WorldDebugger,
  WorldHistoryRecorder,
  summarizeWorldHistoryRange,
} from 'civ-engine';

const debuggerView = new WorldDebugger({ world });
const history = new WorldHistoryRecorder({
  world,
  capacity: 32,
  debug: debuggerView,
});

history.connect();

const summary = summarizeWorldHistoryRange(history.getState(), {
  startTick: 10,
  endTick: 14,
});
```

The recorder state also carries `schemaVersion`. For automated analysis, `summarizeWorldHistoryRange()` can collapse a window of recorded ticks into one object covering command outcomes, changed entities, event counts, and aggregated issues.

## Probes

The debugger is designed to inspect more than the `World` itself. Use probes for standalone utilities that matter to the game.

Built-in helpers:

```typescript
import {
  WorldDebugger,
  createOccupancyDebugProbe,
  createPathQueueDebugProbe,
  createVisibilityDebugProbe,
} from 'civ-engine';

const debuggerView = new WorldDebugger({
  world,
  probes: [
    createOccupancyDebugProbe('occupancy', occupancy),
    createVisibilityDebugProbe('visibility', visibility),
    createPathQueueDebugProbe('paths', pathQueue),
  ],
});
```

You can also add your own probe:

```typescript
debuggerView.addProbe({
  key: 'selection',
  capture: () => ({
    selectedIds: [...selectionStore.selectedIds()],
    hoverId: selectionStore.hoveredId(),
  }),
});
```

Probe payloads should stay JSON-compatible.

## Pairing with RenderAdapter

`RenderAdapter` can include debugger payloads in the render stream:

```typescript
import { RenderAdapter, WorldDebugger } from 'civ-engine';

const debuggerView = new WorldDebugger({ world });

const adapter = new RenderAdapter({
  world,
  projector,
  debug: debuggerView,
  send: (message) => transport.send(message),
});
```

That gives a debug client one message stream containing:

- projected render snapshot or render diff
- current debug snapshot

This is a good way to build a first viewer before a real renderer exists.

## Reference Debug Client

The repository now includes a browser reference viewer at `examples/debug-client/`.

Run it from the repository root:

```bash
npm run debug:client
```

That command builds `dist/`, starts the static debug server, and serves the viewer at `/examples/debug-client/`.

The reference client is intentionally plain:

- a worker owns the `World`, `RenderAdapter`, `WorldDebugger`, `OccupancyGrid`, `VisibilityMap`, and queued path service
- the main thread consumes `renderSnapshot` and `renderTick` messages only
- the canvas renders projected entities, fog, occupancy, reservations, and path overlays
- the sidebar shows warnings, issues, last diff summary, metrics, event counts, probe summaries, and the raw debug payload

It is a debugger first, not a production renderer. The point is to prove the render/debug contract and make simulation faults visible without committing to PixiJS or another scene backend yet.

## Recommended Workflow

1. Use `submitWithResult()` or `ClientAdapter` so command submissions always return structured outcomes.
2. Attach a `WorldDebugger` and inspect `issues` before falling back to ad hoc logs.
3. Treat `tick-budget-exceeded` as an engine-level signal, not a game-rule failure. Check the listed slow systems before changing scenario logic.
4. Add a `WorldHistoryRecorder` when you need short-horizon command and tick history for automated diagnosis.
5. Use `summarizeWorldHistoryRange()` when the raw history is too noisy for the current loop.
6. Use `RenderAdapter` with a minimal projector when you need a visual debug surface.
7. Keep the same projector contract when moving to the real renderer.
8. Add game-specific probes when a new subsystem becomes hard to reason about.
