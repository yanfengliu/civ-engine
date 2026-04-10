# Building a Complete Game: Colony Survival

This tutorial walks through building a small but complete real-time colony survival simulation using every major engine feature. By the end, you'll have a working game with map generation, resource gathering, unit movement, pathfinding, events, commands, save/load, speed control, and client streaming.

**What we're building:** A 32x32 grid world where colonists gather food from berry bushes and bring it back to a settlement. Colonists consume food each tick. If the settlement runs out of food, colonists starve.

## Table of Contents

1. [Setup](#1-setup)
2. [Map Generation](#2-map-generation)
3. [Spawning Units](#3-spawning-units)
4. [Movement System](#4-movement-system)
5. [Resource Gathering](#5-resource-gathering)
6. [Commands (Player Input)](#6-commands-player-input)
7. [Events](#7-events)
8. [Pathfinding](#8-pathfinding)
9. [Diffs (Observing State)](#9-diffs-observing-state)
10. [Save / Load](#10-save--load)
11. [Speed Control](#11-speed-control)
12. [Client Protocol](#12-client-protocol)
13. [Putting It All Together](#13-putting-it-all-together)

---

## 1. Setup

```typescript
import { World, type Position, type EntityId } from 'civ-engine';

// Define your game's component types
interface Colonist {
  name: string;
  state: 'idle' | 'moving' | 'gathering';
}

interface MoveTo {
  path: number[];  // flat-index waypoints
  step: number;    // current index in path
}

interface Settlement {
  name: string;
}

interface ResourceSource {
  resource: string;
  remaining: number;
}

// Define event and command types
type GameEvents = {
  colonistArrived: { entityId: EntityId; x: number; y: number };
  resourceGathered: { entityId: EntityId; resource: string; amount: number };
  settlementStarving: { entityId: EntityId };
};

type GameCommands = {
  moveColonist: { entityId: EntityId; targetX: number; targetY: number };
  gatherResource: { entityId: EntityId; sourceId: EntityId };
};

// Create the world
const WIDTH = 32;
const HEIGHT = 32;

const world = new World<GameEvents, GameCommands>({
  gridWidth: WIDTH,
  gridHeight: HEIGHT,
  tps: 10,  // 10 ticks per second for a sim game
});

// Register all component types
world.registerComponent<Position>('position');
world.registerComponent<Colonist>('colonist');
world.registerComponent<MoveTo>('moveTo');
world.registerComponent<Settlement>('settlement');
world.registerComponent<ResourceSource>('resourceSource');

// Register resource types
world.registerResource('food', { defaultMax: 500 });
```

## 2. Map Generation

Use simplex noise to scatter berry bushes across the map, and `createTileGrid` to create tile entities.

```typescript
import { createTileGrid, createNoise2D, octaveNoise2D } from 'civ-engine';

// Create a tile entity for every cell (each gets a position component)
const tiles = createTileGrid(world);

// Use noise to decide where berry bushes grow
const noise = createNoise2D(42); // seed = 42 for reproducibility

for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const value = octaveNoise2D(noise, x * 0.1, y * 0.1, 4);
    // Place berry bushes where noise is high (roughly 15% of tiles)
    if (value > 0.3) {
      const tile = tiles[y][x];
      world.addComponent(tile, 'resourceSource', {
        resource: 'food',
        remaining: 50,
      });
    }
  }
}
```

You can also use cellular automata to create more structured patterns:

```typescript
import { createCellGrid, stepCellGrid } from 'civ-engine';

// Create a noise-seeded cell grid and smooth it
let cells = createCellGrid(WIDTH, HEIGHT, (x, y) => {
  return octaveNoise2D(noise, x * 0.1, y * 0.1, 4) > 0 ? 1 : 0;
});

// Smooth with cellular automata (3 steps)
const smoothRule = (current: number, neighbors: number[]) => {
  const alive = neighbors.filter((n) => n === 1).length;
  return alive >= 5 ? 1 : alive <= 2 ? 0 : current;
};

for (let i = 0; i < 3; i++) {
  cells = stepCellGrid(cells, smoothRule);
}
```

## 3. Spawning Units

```typescript
// Create a settlement at the center
const settlement = world.createEntity();
world.setPosition(settlement, { x: 16, y: 16 });
world.addComponent(settlement, 'settlement', { name: 'New Colony' });
world.addResource(settlement, 'food', 100); // start with 100 food

// Spawn 3 colonists near the settlement
function spawnColonist(name: string, x: number, y: number): EntityId {
  const id = world.createEntity();
  world.setPosition(id, { x, y });
  world.addComponent(id, 'colonist', { name, state: 'idle' });
  return id;
}

const colonists = [
  spawnColonist('Alice', 15, 16),
  spawnColonist('Bob', 16, 15),
  spawnColonist('Carol', 17, 16),
];
```

## 4. Movement System

Systems are pure functions that run each tick. This one moves entities along their path.

```typescript
function movementSystem(w: World<GameEvents, GameCommands>): void {
  for (const id of w.query('position', 'moveTo', 'colonist')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const moveTo = w.getComponent<MoveTo>(id, 'moveTo')!;
    const colonist = w.getComponent<Colonist>(id, 'colonist')!;

    if (moveTo.step >= moveTo.path.length) {
      // Arrived — remove the moveTo component
      w.removeComponent(id, 'moveTo');
      colonist.state = 'idle';
      w.emit('colonistArrived', { entityId: id, x: pos.x, y: pos.y });
      continue;
    }

    // Move one step along the path
    const nextNode = moveTo.path[moveTo.step];
    w.setPosition(id, { x: nextNode % WIDTH, y: Math.floor(nextNode / WIDTH) });
    moveTo.step++;
    colonist.state = 'moving';
  }
}

world.registerSystem(movementSystem);
```

## 5. Resource Gathering

Colonists at a berry bush tile automatically gather food and deliver it to the settlement.

```typescript
function gatheringSystem(w: World<GameEvents, GameCommands>): void {
  for (const id of w.query('position', 'colonist')) {
    const colonist = w.getComponent<Colonist>(id, 'colonist')!;
    if (colonist.state !== 'idle') continue;

    const pos = w.getComponent<Position>(id, 'position')!;

    // Check if there's a resource source at this tile
    const entitiesHere = w.grid.getAt(pos.x, pos.y);
    if (!entitiesHere) continue;

    for (const otherId of entitiesHere) {
      const source = w.getComponent<ResourceSource>(otherId, 'resourceSource');
      if (!source || source.remaining <= 0) continue;

      // Gather up to 5 units
      const amount = Math.min(5, source.remaining);
      source.remaining -= amount;

      // Add to settlement's food pool
      w.addResource(settlement, 'food', amount);
      colonist.state = 'gathering';

      w.emit('resourceGathered', {
        entityId: id,
        resource: source.resource,
        amount,
      });
      break;
    }
  }
}

// Settlement consumes food each tick
world.setConsumption(settlement, 'food', 0.5); // 0.5 food per tick

world.registerSystem(gatheringSystem);
```

## 6. Commands (Player Input)

Commands are how AI agents or UI send instructions to the game. They are validated on submit and executed at the start of the next tick.

```typescript
import { findPath } from 'civ-engine';

// Validator: entity must be alive and a colonist
world.registerValidator('moveColonist', (data, w) => {
  if (!w.isAlive(data.entityId)) return false;
  const colonist = w.getComponent<Colonist>(data.entityId, 'colonist');
  return colonist !== undefined;
});

// Handler: compute path and attach moveTo component
world.registerHandler('moveColonist', (data, w) => {
  const pos = w.getComponent<Position>(data.entityId, 'position')!;
  const startNode = pos.y * WIDTH + pos.x;
  const goalNode = data.targetY * WIDTH + data.targetX;

  const result = findPath<number>({
    start: startNode,
    goal: goalNode,
    neighbors: (node) => {
      const x = node % WIDTH;
      const y = Math.floor(node / WIDTH);
      const result: number[] = [];
      if (x > 0) result.push(node - 1);
      if (x < WIDTH - 1) result.push(node + 1);
      if (y > 0) result.push(node - WIDTH);
      if (y < HEIGHT - 1) result.push(node + WIDTH);
      return result;
    },
    cost: () => 1,
    heuristic: (node, goal) => {
      const nx = node % WIDTH;
      const ny = Math.floor(node / WIDTH);
      const gx = goal % WIDTH;
      const gy = Math.floor(goal / WIDTH);
      return Math.abs(nx - gx) + Math.abs(ny - gy);
    },
    hash: (node) => node,
  });

  if (result) {
    // Skip the first node (current position)
    w.addComponent(data.entityId, 'moveTo', {
      path: result.path.slice(1),
      step: 0,
    });
  }
});

// Now an AI agent or UI can send commands:
world.submit('moveColonist', {
  entityId: colonists[0],
  targetX: 20,
  targetY: 10,
});
```

## 7. Events

Listen for events to react to game state changes:

```typescript
// Log when colonists arrive
world.on('colonistArrived', (event) => {
  console.log(`Colonist ${event.entityId} arrived at (${event.x}, ${event.y})`);
});

// Alert when settlement is starving
function starvationCheckSystem(w: World<GameEvents, GameCommands>): void {
  for (const id of w.query('settlement')) {
    const pool = w.getResource(id, 'food');
    if (pool && pool.current <= 0) {
      w.emit('settlementStarving', { entityId: id });
    }
  }
}

world.registerSystem(starvationCheckSystem);

world.on('settlementStarving', (event) => {
  console.log('WARNING: Settlement is starving!');
});
```

## 8. Pathfinding

The pathfinding module is generic — it works on any graph. Here's a reusable helper for grid pathfinding:

```typescript
import { findPath, type PathResult } from 'civ-engine';

function findGridPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
  height: number,
  isBlocked?: (x: number, y: number) => boolean,
): PathResult<number> | null {
  return findPath<number>({
    start: fromY * width + fromX,
    goal: toY * width + toX,
    neighbors: (node) => {
      const x = node % width;
      const y = Math.floor(node / width);
      const result: number[] = [];
      if (x > 0) result.push(node - 1);
      if (x < width - 1) result.push(node + 1);
      if (y > 0) result.push(node - width);
      if (y < height - 1) result.push(node + width);
      return result;
    },
    cost: (_from, to) => {
      const x = to % width;
      const y = Math.floor(to / width);
      return isBlocked?.(x, y) ? Infinity : 1;
    },
    heuristic: (node, goal) => {
      const nx = node % width;
      const ny = Math.floor(node / width);
      const gx = goal % width;
      const gy = Math.floor(goal / width);
      return Math.abs(nx - gx) + Math.abs(ny - gy);
    },
    hash: (node) => node,
  });
}

// Usage:
const path = findGridPath(0, 0, 10, 10, WIDTH, HEIGHT);
if (path) {
  console.log(`Path found: ${path.path.length} steps, cost ${path.cost}`);
}
```

## 9. Diffs (Observing State)

Diffs tell you what changed each tick — essential for rendering or client sync.

```typescript
world.onDiff((diff) => {
  // New entities
  for (const id of diff.entities.created) {
    console.log(`Entity ${id} created`);
  }

  // Destroyed entities
  for (const id of diff.entities.destroyed) {
    console.log(`Entity ${id} destroyed`);
  }

  // Component changes
  for (const [key, changes] of Object.entries(diff.components)) {
    for (const [id, data] of changes.set) {
      console.log(`Component '${key}' set on entity ${id}:`, data);
    }
    for (const id of changes.removed) {
      console.log(`Component '${key}' removed from entity ${id}`);
    }
  }

  // Resource changes
  for (const [key, changes] of Object.entries(diff.resources)) {
    for (const [id, pool] of changes.set) {
      console.log(`Resource '${key}' on entity ${id}: ${pool.current}/${pool.max}`);
    }
  }
});
```

You can also pull the last diff after stepping:

```typescript
world.step();
const diff = world.getDiff();
```

## 10. Save / Load

Serialize the entire world state to JSON. Systems, validators, handlers, and event listeners must be re-registered after loading (they are functions, not data).

```typescript
// Save
const snapshot = world.serialize();
const saveData = JSON.stringify(snapshot);

// Load
function loadGame(json: string): World<GameEvents, GameCommands> {
  const snapshot = JSON.parse(json);
  const restored = World.deserialize<GameEvents, GameCommands>(snapshot, [
    movementSystem,
    gatheringSystem,
    starvationCheckSystem,
  ]);

  // Re-register commands
  restored.registerValidator('moveColonist', (data, w) => {
    if (!w.isAlive(data.entityId)) return false;
    return w.getComponent<Colonist>(data.entityId, 'colonist') !== undefined;
  });

  restored.registerHandler('moveColonist', (data, w) => {
    // ... same handler as above
  });

  // Re-register event listeners
  restored.on('colonistArrived', (event) => {
    console.log(`Colonist ${event.entityId} arrived`);
  });

  return restored;
}
```

## 11. Speed Control

Let the player (or AI) control simulation speed:

```typescript
// Normal speed
world.setSpeed(1);

// Fast forward
world.setSpeed(4);  // 4x speed

// Slow for debugging
world.setSpeed(0.25);

// Pause (preserves speed setting)
world.pause();
console.log(world.isPaused); // true

// Step manually while paused (for debugging or AI analysis)
world.step();

// Resume at previous speed
world.resume();
```

## 12. Client Protocol

Wire your game to an external client (browser, another process, AI agent) using the `ClientAdapter`. It sends typed messages — you provide the transport.

```typescript
import { ClientAdapter, type ServerMessage, type ClientMessage } from 'civ-engine';

// Example: wire to a WebSocket
function attachClient(ws: WebSocket, world: World<GameEvents, GameCommands>): ClientAdapter<GameEvents, GameCommands> {
  const adapter = new ClientAdapter<GameEvents, GameCommands>({
    world,
    send: (message: ServerMessage<GameEvents>) => {
      ws.send(JSON.stringify(message));
    },
  });

  ws.addEventListener('message', (event) => {
    const msg: ClientMessage<GameCommands> = JSON.parse(event.data);
    adapter.handleMessage(msg);
  });

  ws.addEventListener('close', () => {
    adapter.disconnect();
  });

  adapter.connect(); // sends snapshot, then streams tick diffs
  return adapter;
}
```

The client receives:
- A `snapshot` message on connect (full world state)
- A `tick` message after each step (diff + events from that tick)
- A `commandRejected` message if a submitted command fails validation, is malformed, or names a command with no registered handler

The client sends:
- `command` messages to submit game commands (e.g., `moveColonist`)
- `requestSnapshot` to request a full state resync

```typescript
// Example: client-side command submission
const clientMessage: ClientMessage<GameCommands> = {
  type: 'command',
  data: {
    id: crypto.randomUUID(),
    commandType: 'moveColonist',
    payload: { entityId: 1, targetX: 20, targetY: 10 },
  },
};
```

## 13. Putting It All Together

Here's the complete game loop:

```typescript
// Register all systems (order matters!)
// 1. movementSystem  — move units along paths
// 2. gatheringSystem  — idle colonists gather resources
// 3. starvationCheckSystem — check for starvation
// (already registered above)

// Submit some initial commands
world.submit('moveColonist', { entityId: colonists[0], targetX: 20, targetY: 10 });
world.submit('moveColonist', { entityId: colonists[1], targetX: 10, targetY: 20 });

// Option A: Deterministic stepping (for AI agents, testing)
for (let i = 0; i < 100; i++) {
  world.step();
}

// Option B: Real-time loop
world.start();   // runs at configured TPS (10/sec)
// ... later
world.stop();

// Check the game state at any time
const foodPool = world.getResource(settlement, 'food');
console.log(`Settlement food: ${foodPool?.current}/${foodPool?.max}`);

for (const id of world.query('colonist')) {
  const colonist = world.getComponent<Colonist>(id, 'colonist')!;
  const pos = world.getComponent<Position>(id, 'position')!;
  console.log(`${colonist.name} at (${pos.x}, ${pos.y}) — ${colonist.state}`);
}
```

## Engine Features Used

| Feature | How it's used |
|---|---|
| Entities & Components | Colonists, settlements, tiles, resource sources |
| Systems | Movement, gathering, starvation check |
| Spatial Grid | Finding entities at a tile (`getAt`) |
| Commands | `moveColonist` with validation and handler |
| Events | `colonistArrived`, `resourceGathered`, `settlementStarving` |
| Resources | Food pools with production/consumption/transfers |
| Map Generation | Simplex noise for berry bush placement |
| Pathfinding | A* grid pathfinding for colonist movement |
| Diffs | Observing per-tick changes for rendering |
| Save/Load | `serialize()`/`deserialize()` with system re-registration |
| Speed Control | `setSpeed()`, `pause()`/`resume()` |
| Client Protocol | `ClientAdapter` streaming state to external clients |

## Tips for AI Agents

If you're an AI agent building a game on civ-engine:

1. **Use `step()` for deterministic control.** Don't rely on `start()`/`stop()` — call `step()` in a loop so you control exactly when ticks happen.
2. **Read diffs, not full state.** After each `step()`, call `getDiff()` to see what changed. This is much cheaper than scanning all entities.
3. **Commands are your input API.** Define command types for every action the player can take. Use validators to reject illegal actions before they're queued.
4. **Events are your output API.** Emit events for everything interesting that happens. Read them with `getEvents()` after each tick.
5. **Serialize for checkpoints.** Save state periodically with `serialize()`. If something goes wrong, load a previous state with `World.deserialize()`.
6. **Systems run in order.** Register systems in the order their logic should execute. Movement before combat before production, etc.
