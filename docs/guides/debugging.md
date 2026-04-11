# Debugging Guide

This guide covers the headless debugging surface for `civ-engine`.

The short version: use `WorldDebugger` for a structured snapshot of world state, metrics, diff summaries, and custom probe data. Pair it with `RenderAdapter` when you want a debug-first client before a production renderer exists.

## What It Captures

`WorldDebugger` captures:

- tick and entity counts
- component and resource summaries
- spatial density summary from the world's position component
- last-tick metrics from `world.getMetrics()`
- last diff summary from `world.getDiff()`
- event counts from `world.getEvents()`
- warnings for engine-level edge cases such as same-tick ID recycling
- custom probe output

## Basic Usage

```typescript
import { WorldDebugger } from 'civ-engine';

const debuggerView = new WorldDebugger({ world });
const snapshot = debuggerView.capture();
```

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

## Recommended Workflow

1. Use `RenderAdapter` with a minimal projector.
2. Build a debug-first client that can inspect projected entities, frame state, and debugger payloads.
3. Keep the same projector contract when moving to the real renderer.
4. Add game-specific probes when a new subsystem becomes hard to reason about.
