# Renderer Integration Guide

This guide explains how to connect `civ-engine` to a renderer and how to build a renderer that fits the engine's purpose.

The short version: keep `civ-engine` headless, make snapshots and tick diffs or projected render messages the renderer input, and build a first-party renderer adapter around a proven 2D graphics layer. For the first reference renderer, prefer TypeScript plus PixiJS over raw WebGL/WebGPU, Godot, or Unreal.

## Table of Contents

1. [Goal](#goal)
2. [Architecture](#architecture)
3. [Renderer Stack Recommendation](#renderer-stack-recommendation)
4. [Render Data Contract](#render-data-contract)
5. [Shipped Helpers](#shipped-helpers)
6. [Snapshot and Diff Flow](#snapshot-and-diff-flow)
7. [Renderer Package Shape](#renderer-package-shape)
8. [Transport Patterns](#transport-patterns)
9. [Render Loop and Interpolation](#render-loop-and-interpolation)
10. [Input Flow](#input-flow)
11. [RTS Renderer Requirements](#rts-renderer-requirements)
12. [Backend Adapter Boundary](#backend-adapter-boundary)
13. [Validation Checklist](#validation-checklist)
14. [References](#references)

---

## Goal

The renderer should make engine state visible without becoming the source of truth.

`civ-engine` owns:

- Entities, components, resources, commands, events, and tick order
- Deterministic simulation state
- Save/load snapshots
- Per-tick diffs
- Command validation and handling

The renderer owns:

- Scene objects, sprites, meshes, particles, camera, audio, and UI
- Animation playback and interpolation between simulation ticks
- Input capture and input-to-command mapping
- Asset loading, texture atlases, render layers, culling, and debug overlays

Do not store renderer objects inside ECS components. Components should stay JSON-compatible data so snapshots, diffs, tests, and AI inspection keep working.

## Architecture

Use a one-way state stream and an explicit command stream:

```text
World systems
  -> ClientAdapter or RenderAdapter
  -> transport
  -> RenderClient
  -> RenderStore
  -> SceneAdapter
  -> PixiJS, Godot, Unreal, or another backend

InputMapper
  -> ClientMessage command
  -> transport
  -> ClientAdapter.handleMessage()
  -> world.submit()
```

The renderer should not query `World` directly during normal play. It should render from the latest snapshot plus applied diffs. Direct `World` access is acceptable for local debugging, but it should not become the production architecture because it couples the visual frame loop to the simulation internals.

## Renderer Stack Recommendation

Use this order of preference for this engine:

| Choice | Recommendation | Why |
|---|---|---|
| TypeScript + PixiJS | Best first reference renderer | Fits a 2D grid/RTS engine, stays close to the package ecosystem, supports GPU rendering, scene graph, assets, layers, and frame ticker |
| Phaser | Good if the client is a Phaser game | Useful when Phaser scenes, tilemaps, and game framework features are desired, but it is more framework than this engine needs |
| Godot | Good later adapter | Useful for editor-driven 2D/3D presentation, but it needs a custom adapter and does not render engine snapshots automatically |
| Unreal | Use only for high-end 3D needs | Powerful but heavy for this engine's current 2D grid/RTS shape |
| Raw WebGL/WebGPU | Avoid initially | Too much renderer infrastructure becomes project-owned |

For PixiJS, use WebGL for the first production-oriented pass. WebGPU can be evaluated later after the renderer has real scenes and performance baselines.

## Render Data Contract

The engine should expose renderable state as normal ECS components. Keep these components small, JSON-compatible, and renderer-agnostic.

Example baseline components:

```typescript
interface Renderable {
  asset: string;
  layer: 'terrain' | 'decal' | 'unit' | 'building' | 'projectile' | 'overlay';
  hidden?: boolean;
  tint?: string;
  scale?: number;
  anchor?: { x: number; y: number };
  sortY?: boolean;
}

interface AnimationState {
  clip: string;
  loop?: boolean;
  speed?: number;
}

interface Visibility {
  visibleTo: string[];
  exploredBy?: string[];
}

interface SelectionState {
  selectedBy?: string[];
  hoveredBy?: string[];
}

interface HealthBar {
  current: number;
  max: number;
}
```

Keep the contract intentionally boring:

- `position` is simulation grid position, not pixel position.
- `renderable.asset` is a manifest key, not a file path.
- `renderable.layer` is a semantic draw layer, not a backend-specific container name.
- `visibility` should describe game visibility, not renderer alpha.
- `selection` can live in renderer state if it is purely local UI state. Store it in the engine only if selection is part of the saveable or AI-readable game state.

Unknown components should be ignored by the renderer. That lets game-specific systems grow without forcing every renderer to understand every gameplay component.

## Shipped Helpers

The engine now ships two helpers for this boundary:

- `RenderAdapter`: streams projected `renderSnapshot` and `renderTick` messages using generation-aware entity refs.
- `WorldDebugger`: captures structured debug state that can be attached to the render stream or inspected separately.

The key point is that the engine still does not own the renderer. The game owns the projector callback.

```typescript
import { RenderAdapter, WorldDebugger } from 'civ-engine';

const debuggerView = new WorldDebugger({ world });

const adapter = new RenderAdapter({
  world,
  projector: {
    projectEntity: (ref, w) => {
      const position = w.getComponent(ref.id, 'position');
      const renderable = w.getComponent(ref.id, 'renderable');
      if (!position || !renderable) return null;
      return {
        asset: renderable.asset,
        x: position.x,
        y: position.y,
        layer: renderable.layer,
      };
    },
    projectFrame: (w) => ({ tick: w.tick }),
  },
  debug: debuggerView,
  send: (message) => transport.send(message),
});
```

This is the intended split:

- engine: world state, projection transport, debugging helpers
- game: projector rules, command mapping, scene adapter, backend renderer

## Snapshot and Diff Flow

Use full snapshots for initial sync and recovery. Use tick diffs for normal rendering.

```typescript
import type { EntityId, ResourcePool, TickDiff, WorldSnapshot } from 'civ-engine';

type ComponentMap = Map<string, unknown>;
type ResourceMap = Map<string, ResourcePool>;

interface RenderEntity {
  id: EntityId;
  generation: number | null;
  components: ComponentMap;
  resources: ResourceMap;
}

class RenderStore {
  readonly entities = new Map<EntityId, RenderEntity>();

  applySnapshot(snapshot: WorldSnapshot): void {
    this.entities.clear();

    for (let id = 0; id < snapshot.entities.alive.length; id++) {
      if (!snapshot.entities.alive[id]) continue;
      this.entities.set(id, {
        id,
        generation: snapshot.entities.generations[id] ?? 0,
        components: new Map(),
        resources: new Map(),
      });
    }

    for (const [key, entries] of Object.entries(snapshot.components)) {
      for (const [id, value] of entries) {
        this.ensureEntity(id, snapshot.entities.generations[id] ?? 0)
          .components.set(key, value);
      }
    }

    if ('resources' in snapshot) {
      for (const [key, entries] of Object.entries(snapshot.resources.pools)) {
        for (const [id, value] of entries) {
          this.ensureEntity(id, snapshot.entities.generations[id] ?? 0)
            .resources.set(key, value);
        }
      }
    }
  }

  applyDiff(diff: TickDiff): 'ok' | 'resync-needed' {
    const destroyed = new Set(diff.entities.destroyed);

    for (const id of diff.entities.created) {
      if (destroyed.has(id)) return 'resync-needed';
      this.ensureEntity(id, null);
    }

    for (const id of diff.entities.destroyed) {
      this.entities.delete(id);
    }

    for (const [key, changes] of Object.entries(diff.components)) {
      for (const id of changes.removed) {
        this.entities.get(id)?.components.delete(key);
      }
      for (const [id, value] of changes.set) {
        this.ensureEntity(id, null).components.set(key, value);
      }
    }

    for (const [key, changes] of Object.entries(diff.resources)) {
      for (const id of changes.removed) {
        this.entities.get(id)?.resources.delete(key);
      }
      for (const [id, value] of changes.set) {
        this.ensureEntity(id, null).resources.set(key, value);
      }
    }

    return 'ok';
  }

  private ensureEntity(id: EntityId, generation: number | null): RenderEntity {
    let entity = this.entities.get(id);
    if (!entity) {
      entity = { id, generation, components: new Map(), resources: new Map() };
      this.entities.set(id, entity);
    } else if (entity.generation === null && generation !== null) {
      entity.generation = generation;
    }
    return entity;
  }
}
```

The `resync-needed` case is deliberate. Entity IDs can be recycled, but `TickDiff` currently reports created and destroyed IDs without generation metadata. If the same ID is created and destroyed in one diff, the renderer cannot always know which lifetime won. The safest client behavior is to request a fresh snapshot.

For the same reason, a renderer should treat generation as `null` for entities first seen through a diff. If a command needs an `EntityRef` for that entity, request a snapshot before sending the command or have game-specific creation events include the new generation-aware ref.

Recommended message handling:

```typescript
import type { ClientMessage, ServerMessage } from 'civ-engine';

const store = new RenderStore();

function handleServerMessage(message: ServerMessage<GameEvents>): ClientMessage<GameCommands> | null {
  switch (message.type) {
    case 'snapshot':
      store.applySnapshot(message.data);
      return null;
    case 'tick':
      if (store.applyDiff(message.data.diff) === 'resync-needed') {
        return { type: 'requestSnapshot' };
      }
      handleEvents(message.data.events);
      return null;
    case 'commandRejected':
      markCommandRejected(message.data.id, message.data.reason);
      return null;
  }
}
```

## Renderer Package Shape

A renderer package should have narrow modules:

```text
renderer/
  src/
    protocol/
      render-components.ts    shared render component interfaces
      commands.ts             renderer-facing command payloads
    state/
      render-store.ts         snapshot and diff application
      selectors.ts            derived views: visible units, health bars, layers
    transport/
      websocket-client.ts     JSON transport for ServerMessage/ClientMessage
      worker-client.ts        postMessage transport for browser workers
    input/
      input-map.ts            pointer/keyboard to game commands
      camera-controls.ts      pan, zoom, screen-to-world transform
    scene/
      scene-adapter.ts        backend-neutral render interface
      pixi-scene-adapter.ts   PixiJS implementation
    ui/
      hud.ts                  DOM HUD state binding
      debug-overlay.ts        tick, entity count, frame time, command status
    assets/
      manifest.ts             stable asset keys and bundles
```

The important split is `RenderStore` vs `SceneAdapter`:

- `RenderStore` understands `WorldSnapshot`, `TickDiff`, and `ServerMessage`.
- `SceneAdapter` understands visual objects and the graphics backend.

That split keeps the transport/protocol testable without opening a browser, and it lets another backend reuse the same state code later.

## Transport Patterns

### Node server plus WebSocket client

Use this when the simulation is authoritative outside the renderer process.

```typescript
import { ClientAdapter } from 'civ-engine';

const adapter = new ClientAdapter<GameEvents, GameCommands>({
  world,
  send: (message) => ws.send(JSON.stringify(message)),
  onError: (error) => logClientError(error),
});

ws.on('message', (data) => {
  adapter.handleMessage(JSON.parse(data.toString()));
});

ws.on('close', () => adapter.disconnect());
adapter.connect();
```

### Browser worker simulation

Use this when you want a local browser client but still want the render thread separated from simulation stepping.

```text
main thread renderer
  -> postMessage(command)
  -> worker owns World and ClientAdapter
  -> postMessage(snapshot/tick)
  -> renderer applies RenderStore updates
```

This is a good development path for single-player games because it avoids network setup while preserving the same protocol boundary as a remote server.

### Same-process direct bridge

Use this only for tests, demos, and debugging. You can wire `ClientAdapter.send` directly to a function:

```typescript
const adapter = new ClientAdapter<GameEvents, GameCommands>({
  world,
  send: (message) => {
    const response = handleServerMessage(message);
    if (response) adapter.handleMessage(response);
  },
});
```

Do not let the renderer call `world.getComponent()` every frame in production. Once that pattern spreads, the renderer becomes coupled to simulation internals and the snapshot/diff protocol loses value.

## Render Loop and Interpolation

Simulation ticks and render frames should be separate.

Recommended model:

- Run the simulation at a fixed tick rate such as 10, 20, or 30 TPS.
- Render at display refresh rate.
- Apply diffs when they arrive.
- Keep visual interpolation state in the renderer.
- Never advance the simulation from the render loop unless the renderer owns a local worker or local test world.

For movement, keep the authoritative grid position from the engine and interpolate a visual transform between ticks:

```typescript
interface VisualTransform {
  from: { x: number; y: number };
  to: { x: number; y: number };
  tickReceivedAtMs: number;
}

function updateVisualPosition(
  visual: VisualTransform,
  nowMs: number,
  tickMs: number,
): { x: number; y: number } {
  const t = Math.min(1, (nowMs - visual.tickReceivedAtMs) / tickMs);
  return {
    x: visual.from.x + (visual.to.x - visual.from.x) * t,
    y: visual.from.y + (visual.to.y - visual.from.y) * t,
  };
}
```

The renderer can animate particles, projectiles, attack swings, and UI effects at frame rate, but the game result must still come from engine events and components.

## Input Flow

Input should become commands, not direct state edits.

Example:

```typescript
interface MoveUnitCommand {
  unit: { id: EntityId; generation: number };
  target: { x: number; y: number };
}

function onRightClick(screenX: number, screenY: number): ClientMessage<GameCommands> | null {
  const selected = selectionStore.primaryEntityRef();
  if (!selected) return null;

  return {
    type: 'command',
    data: {
      id: crypto.randomUUID(),
      commandType: 'moveUnit',
      payload: {
        unit: selected,
        target: camera.screenToWorldCell(screenX, screenY),
      },
    },
  };
}
```

Use `EntityRef` values for long-lived selections and commands. Entity IDs are recycled, so a stale command should be rejectable by the simulation validator.

Keep input mapping explicit:

| Input | Renderer action | Engine command |
|---|---|---|
| Left click unit | Local selection state | None unless selection is game state |
| Right click terrain | Build `moveUnit` command | `moveUnit` |
| Attack hotkey plus target | Build `attackMove` or `attackTarget` command | Game-defined |
| Build menu click | Build `placeBuilding` command | Game-defined |
| Camera pan/zoom | Renderer camera only | None |

## RTS Renderer Requirements

An Age of Empires-like renderer needs more than sprites moving around. Plan for these capabilities early:

| Requirement | Renderer responsibility | Engine responsibility |
|---|---|---|
| Camera pan/zoom | Smooth camera transform and screen-to-world conversion | None |
| Terrain | Chunked tile containers, culling, atlas use | Terrain components and map data |
| Unit sprites | Sprite pooling, animation playback, Y-sort or layer sort | Position, renderable, animation state |
| Selection box | Pointer drag, hit testing visible/selectable units | Optional selection command if game state |
| Health bars | Overlay layer or DOM/canvas labels | Health or resource component |
| Fog of war | Fog mesh/tile overlay, alpha transitions | Visibility/exploration components |
| Projectiles and effects | Local visual effects from events | Events such as `attackFired`, `unitDied` |
| Minimap | Downsampled terrain/unit/fog view | Components and visibility state |
| Debug tools | Toggleable overlays for grid, paths, metrics | `world.getMetrics()` and debug components |

For large maps, render terrain by chunk. For large armies, pool visual objects by asset key. Avoid destroying and recreating backend objects every tick.

## Backend Adapter Boundary

Define a small backend interface before writing Pixi-specific code:

```typescript
import type { EntityId } from 'civ-engine';

interface SceneAdapter {
  init(target: HTMLElement): Promise<void>;
  loadAssets(manifest: AssetManifest): Promise<void>;
  upsertEntity(entity: RenderEntity): void;
  removeEntity(id: EntityId): void;
  renderFrame(timeMs: number): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
```

The Pixi implementation can map semantic layers to containers:

```text
stage
  terrainLayer
  decalLayer
  buildingLayer
  unitLayer
  projectileLayer
  fogLayer
  overlayLayer
```

Use asset manifest keys instead of file names:

```typescript
const assets = {
  'unit.villager.idle': '/assets/units/villager/idle.json',
  'unit.villager.walk': '/assets/units/villager/walk.json',
  'building.town-center': '/assets/buildings/town-center.png',
  'terrain.grass': '/assets/terrain/grass.png',
} as const;
```

A Godot or Unreal adapter can implement the same high-level interface, but it will still need custom code to map JSON components to nodes, actors, materials, and animations. Those engines cannot render a `WorldSnapshot` directly.

## Validation Checklist

Before calling the renderer usable, validate these behaviors:

- Snapshot hydration creates the expected number of render entities.
- Applying a tick diff updates only changed entities.
- Component removals remove visuals and overlays.
- Destroyed entities remove sprites, health bars, selection outlines, and queued effects.
- `commandRejected` clears optimistic UI state.
- Renderer state survives a `requestSnapshot` resync.
- Camera pan/zoom does not affect simulation coordinates.
- Selection hit testing ignores fog-hidden or non-selectable entities.
- A test scene with 1,000, 5,000, and 10,000 renderable entities has measured frame times.
- Terrain chunks and unit sprites are culled outside the viewport.
- Debug overlays can show tick, last diff size, render entity count, and frame time.

Keep automated tests at the `RenderStore` layer. Browser and visual tests should focus on smoke coverage: nonblank canvas, correct viewport framing, stable selection behavior, and no runaway object creation over time.

## References

- PixiJS Renderers: https://pixijs.com/8.x/guides/components/renderers
- PixiJS Assets: https://pixijs.com/8.x/guides/components/assets
- PixiJS Ticker: https://pixijs.com/8.x/guides/components/ticker
- PixiJS Scene Graph: https://pixijs.com/8.x/guides/concepts/scene-graph
- PixiJS Render Layers: https://pixijs.com/8.x/guides/concepts/render-layers
- PixiJS Performance Tips: https://pixijs.com/8.x/guides/concepts/performance-tips
