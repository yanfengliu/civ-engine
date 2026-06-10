# Getting Started with civ-engine

This guide covers the core concepts and gets you running a minimal simulation in under 5 minutes.

## Installation

```bash
git clone <repo-url>
cd civ-engine
npm install
npm test        # verify everything works
```

Requires Node.js 18+.

## Core Concepts

Everything flows through a single **World** object.

- **Entities** are plain numeric IDs (not objects). Create them, attach data, destroy them.
- **Components** are plain data objects (interfaces, no methods) attached to entities by string key. Register a component type before using it.
- **Systems** are functions `(world: World) => void` or registration objects that run each tick by phase. All game logic lives in systems.
- **Spatial grid** automatically tracks entities that have a position component. Updates happen lock-step with every `setPosition` / `setComponent` write — there is no per-tick sync phase.

```
World.step()
  -> process commands
  -> run systems (in order; periodic systems gated by interval are skipped on non-firing ticks)
  -> process resources
  -> build diff
  -> tick++
```

## Minimal Example

```typescript
import { World, type Position } from 'civ-engine';

// 1. Create a world with a 16x16 grid, 60 ticks per second
const world = new World({ gridWidth: 16, gridHeight: 16, tps: 60 });

// 2. Register component types (do this before creating entities)
interface Health { hp: number; maxHp: number }
interface Velocity { dx: number; dy: number }

world.registerComponent<Position>('position');
world.registerComponent<Health>('health');
world.registerComponent<Velocity>('velocity');

// 3. Create entities and attach components
const unit = world.createEntity();
world.setPosition(unit, { x: 0, y: 0 });
world.addComponent(unit, 'health', { hp: 100, maxHp: 100 });
world.addComponent(unit, 'velocity', { dx: 1, dy: 0 });

// 4. Register systems (game logic)
function movementSystem(world: World): void {
  for (const id of world.query('position', 'velocity')) {
    const pos = world.getComponent<Position>(id, 'position')!;
    const vel = world.getComponent<Velocity>(id, 'velocity')!;
    world.setPosition(id, {
      x: Math.max(0, Math.min(15, pos.x + vel.dx)),
      y: Math.max(0, Math.min(15, pos.y + vel.dy)),
    });
  }
}

world.registerSystem(movementSystem);

// 5. Run the simulation
for (let i = 0; i < 5; i++) {
  world.step();
}

const pos = world.getComponent<Position>(unit, 'position')!;
console.log(pos.x, pos.y); // 5 0
```

## Querying Entities

`world.query()` returns an iterator over entity IDs that have **all** specified components:

```typescript
// All entities with both position and health
for (const id of world.query('position', 'health')) {
  const pos = world.getComponent<Position>(id, 'position')!;
  const hp = world.getComponent<Health>(id, 'health')!;
  console.log(`Entity ${id} at (${pos.x}, ${pos.y}) with ${hp.hp} HP`);
}

// Collect into array
const soldiers = [...world.query('position', 'health', 'attack')];
```

## Spatial Grid

The grid tracks which entities are at each (x, y) cell. The grid is in sync at write time — every `setPosition()` updates the grid in the same call, so subsequent `world.grid.getAt()` queries see the move immediately. Direct in-place mutation of a position object (`pos.x += 1`) is **not** auto-detected and the grid will not reflect it; always use `setPosition`/`setComponent` for movement.

```typescript
import { ORTHOGONAL, ALL_DIRECTIONS } from 'civ-engine';

// Who is at cell (5, 3)?
const entities = world.grid.getAt(5, 3); // ReadonlySet<EntityId> | null

// Who is adjacent? (4 orthogonal neighbors)
const nearby = world.grid.getNeighbors(5, 3);

// All 8 directions (orthogonal + diagonal)
const allNearby = world.grid.getNeighbors(5, 3, ALL_DIRECTIONS);
```

## Commands (Player Input)

Commands are the way external code (AI agents, UI) sends instructions to the simulation. They are validated immediately and processed at the start of the next tick.

```typescript
// Define command types
type Commands = {
  moveUnit: { entityId: number; targetX: number; targetY: number };
  buildCity: { x: number; y: number };
};

const world = new World<Record<string, never>, Commands>({
  gridWidth: 32, gridHeight: 32, tps: 60,
});

// Register a validator (optional — rejects invalid commands before queuing)
world.registerValidator('moveUnit', (data, world) => {
  return world.isAlive(data.entityId);
});

// Register a handler (required — runs at tick start)
world.registerHandler('moveUnit', (data, world) => {
  world.setPosition(data.entityId, { x: data.targetX, y: data.targetY });
});

// Submit a command (returns true if validation passes)
const accepted = world.submit('moveUnit', { entityId: unit, targetX: 5, targetY: 3 });
world.step(); // command executes here
```

If you need machine-readable rejection details, use `submitWithResult()` instead of `submit()`.

## Events (System Communication)

Events let systems communicate within a tick and let external observers know what happened.

```typescript
type Events = {
  unitDied: { entityId: number };
  resourceDepleted: { entityId: number; resource: string };
};

const world = new World<Events>({
  gridWidth: 16, gridHeight: 16, tps: 60,
});

// Subscribe to events
world.on('unitDied', (event) => {
  console.log(`Unit ${event.entityId} died`);
});

// Emit from a system
world.registerSystem((w) => {
  for (const id of w.query('health')) {
    const hp = w.getComponent<Health>(id, 'health')!;
    if (hp.hp <= 0) {
      w.emit('unitDied', { entityId: id });
      w.destroyEntity(id);
    }
  }
});

// Read events after a tick (for external consumers)
world.step();
const events = world.getEvents(); // [{ type: 'unitDied', data: { entityId: 3 } }]
```

Events are cleared at the start of each tick.

## Resources

Resources are numeric pools (current/max) attached to entities with automatic production, consumption, and transfers.

```typescript
// Register resource types
world.registerResource('food');
world.registerResource('gold', { defaultMax: 1000 });

// Give an entity resources
const city = world.createEntity();
world.addResource(city, 'food', 50);    // returns amount actually added
world.addResource(city, 'gold', 100);

// Set production/consumption rates (per tick)
world.setProduction(city, 'food', 2);   // +2 food per tick
world.setConsumption(city, 'food', 1);  // -1 food per tick (net +1)

// Transfer resources between entities
const farm = world.createEntity();
world.addResource(farm, 'food', 100);
world.addTransfer(farm, city, 'food', 3); // 3 food/tick from farm to city

// Read resource state
const pool = world.getResource(city, 'food'); // { current: 50, max: null }
```

Resource rates and transfers are processed automatically after systems run each tick.

## Speed Control

Control simulation speed at runtime:

```typescript
world.setSpeed(2);    // 2x speed (ticks accumulate twice as fast)
world.setSpeed(0.5);  // half speed
world.getSpeed();     // current multiplier (default 1)

world.pause();        // freeze simulation (preserves speed setting)
world.resume();       // resume at current speed
world.isPaused;       // true/false

// step() always works, even while paused (for deterministic testing)
world.step();
```

## Save / Load

Serialize the entire world state to a JSON-compatible snapshot:

```typescript
// Save
const snapshot = world.serialize();
const json = JSON.stringify(snapshot);

// Load (systems must be re-registered — they are functions, not data)
const restored = World.deserialize(JSON.parse(json), [movementSystem]);
```

## Observing Changes (Diffs)

Get a per-tick diff of everything that changed:

```typescript
// Pull (after stepping)
world.step();
const diff = world.getDiff();
// diff.entities.created, diff.entities.destroyed
// diff.components['health'].set, diff.components['health'].removed
// diff.resources['food'].set, diff.resources['food'].removed

// Push (callback fires after each tick)
world.onDiff((diff) => {
  // send to client, log, etc.
});
```

## Client Protocol

The `ClientAdapter` bridges the World to any transport (WebSocket, postMessage, stdin/stdout). It sends typed messages via a `send` callback — you wire it to whatever transport you need.

```typescript
import { ClientAdapter, type ServerMessage, type ClientMessage } from 'civ-engine';

type Events = { unitDied: { entityId: number } };
type Commands = { moveUnit: { entityId: number; targetX: number; targetY: number } };

const world = new World<Events, Commands>({
  gridWidth: 32, gridHeight: 32, tps: 10,
});

// Create an adapter with a send callback
const adapter = new ClientAdapter<Events, Commands>({
  world,
  send: (message: ServerMessage<Events>) => {
    // Send to your transport — WebSocket, postMessage, etc.
    console.log('Server ->', message.type);
  },
});

// Start streaming: sends a snapshot immediately, then tick diffs after each step
adapter.connect();

world.step();
// send callback fires with: { protocolVersion: 1, type: 'tick', data: { diff, events } }

// Handle incoming client messages
adapter.handleMessage({ type: 'requestSnapshot' });
// send callback fires with: { protocolVersion: 1, type: 'snapshot', data: worldSnapshot }

adapter.handleMessage({
  type: 'command',
  data: { id: 'cmd-1', commandType: 'moveUnit', payload: { entityId: 0, targetX: 5, targetY: 3 } },
});
// If validation passes, send callback fires with:
// { protocolVersion: 1, type: 'commandAccepted', data: { id: 'cmd-1', commandType: 'moveUnit', code: 'accepted', message: 'Queued command' } }
//
// If validation fails, send callback fires with a structured rejection:
// { protocolVersion: 1, type: 'commandRejected', data: { id: 'cmd-1', commandType: 'moveUnit', code: 'validation_failed', message: 'Validation failed', details: null, validatorIndex: 0 } }

// Stop streaming
adapter.disconnect();
```

Server messages: `snapshot` (full state), `tick` (diff + events), `commandAccepted` (command queued), `commandRejected` (failed validation, malformed command, or missing handler).
Client messages: `command` (submit a game command), `requestSnapshot` (request full state).

## Next Steps

- [Building a Complete Game](./building-a-game.md) — Step-by-step tutorial building a colony survival simulation
- [Debugging](./debugging.md) — Diagnostic flowchart, error code reference, and debugging scenarios
- [Architecture](../architecture/ARCHITECTURE.md) — Detailed architecture documentation
- [API Reference](../api-reference.md) — Full method listing

## Recording Your First Session

Once you have a working scenario, capture it as a replayable bundle:

```ts
import { SessionRecorder, MemorySink } from 'civ-engine';

const sink = new MemorySink();
const recorder = new SessionRecorder({ world, sink });
recorder.connect();

// ...your scenario logic...

recorder.disconnect();
const bundle = recorder.toBundle();
// Save bundle as JSON, share with the team, load via SessionReplayer for replay.
```

See [Session Recording](./session-recording.md) for the canonical reference.
