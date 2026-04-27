# Core Concepts

This guide explains the fundamental design patterns and principles behind civ-engine.

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [ECS Architecture](#ecs-architecture)
3. [The World Object](#the-world-object)
4. [Tick Lifecycle](#tick-lifecycle)
5. [Determinism](#determinism)
6. [Data Flow Patterns](#data-flow-patterns)
7. [AI-Native Design](#ai-native-design)

---

## Design Philosophy

civ-engine is built around five principles:

1. **Headless** — No rendering, no UI. The engine is a state machine that outputs structured data for a separate client to visualize.
2. **AI-native** — Every interface is designed for programmatic access by AI agents, not human interaction.
3. **Deterministic** — The same sequence of inputs always produces the same output. No randomness in the engine core.
4. **Composable** — Small, focused modules that do one thing well. Standalone utilities (noise, cellular, pathfinding, behavior trees) have no dependency on World.
5. **Zero dependencies** — Pure TypeScript with no runtime packages. Nothing to break, nothing to audit.

## ECS Architecture

civ-engine uses the **Entity-Component-System** pattern:

### Entities

An entity is just a number. It has no data, no behavior, no class. It's an ID that links components together.

```typescript
const unit = world.createEntity();  // returns 0, then 1, then 2...
```

Entity IDs are **recycled**. When you destroy entity `3`, its ID goes into a free-list. The next `createEntity()` reuses that slot. A generation counter tracks how many times each slot has been recycled (used internally for change detection).

### Components

A component is a plain data object attached to an entity by a string key. Components have **no methods and no inheritance**. They are pure data.

```typescript
// Define with an interface
interface Health {
  hp: number;
  maxHp: number;
}

// Register the key
world.registerComponent<Health>('health');

// Attach to an entity
world.addComponent(unit, 'health', { hp: 100, maxHp: 100 });

// Update
world.patchComponent<Health>(unit, 'health', (hp) => {
  hp.hp -= 10;
});
```

**Key rules:**
- Register a component key before using it (enforced with errors)
- One component per key per entity (adding overwrites)
- `getComponent` returns a direct reference, not a copy. In-place mutations are NOT diff-detected — every component change must go through `setComponent`/`addComponent`/`patchComponent` (or `setPosition` for the configured position key) for the diff and the spatial grid to see it
- Component data must be JSON-compatible plain data
- Components are stored in sparse arrays indexed by entity ID, giving O(1) lookup

### Systems

A system is a plain function `(world: World) => void`. It runs once per tick, in the order it was registered. All game logic lives in systems.

```typescript
function healingSystem(w: World): void {
  for (const id of w.query('health', 'regeneration')) {
    const hp = w.getComponent<Health>(id, 'health')!;
    const regen = w.getComponent<Regeneration>(id, 'regeneration')!;
    hp.hp = Math.min(hp.maxHp, hp.hp + regen.rate);
  }
}

world.registerSystem(healingSystem);
```

**Key rules:**
- Systems are pure functions, not classes
- Registration order determines execution order
- A system reads and mutates the World's state — there's no return value
- Systems should be focused: one concern per system (movement, combat, healing, etc.)

## The World Object

`World` is the **only public entry point**. Every subsystem — entity manager, component stores, spatial grid, game loop, event bus, command queue, resource store — is a private field. You interact with everything through World's methods.

```
World (public API)
├── EntityManager (private) — entity creation, destruction, ID recycling
├── ComponentStore[] (private) — one sparse array per registered component type
├── SpatialGrid (read-only) — 2D grid, accessed via world.grid
├── GameLoop (private) — timing, step/start/stop, speed control
├── EventBus (private) — typed event pub/sub
├── CommandQueue (private) — typed command buffer
└── ResourceStore (private) — pools, rates, transfers
```

This design means:
- You can't accidentally bypass the engine's invariants
- The public API is flat and discoverable
- Internal subsystems can be refactored without breaking user code

## Tick Lifecycle

Each tick follows a fixed sequence. Understanding this order is critical for writing correct systems.

```
World.step()
  ┌─ 1. Clear event buffer (events from previous tick are gone)
  ├─ 2. Clear dirty flags (entity, component, resource tracking resets)
  ├─ 3. Process commands (drain queue → run handlers)
  ├─ 4. Run systems (your code, phase ordered)
  ├─ 5. Process resources (production, consumption, transfers)
  ├─ 6. Build diff (collect dirty state into TickDiff)
  ├─ 7. Update metrics (timings, query counts, explicit-sync count)
  ├─ 8. Notify diff listeners (push TickDiff to subscribers)
  └─ 9. Increment tick counter
```

### What this means in practice

- **Commands execute before systems.** If an AI agent submits a `moveUnit` command, the handler runs before your movement system. The system then sees the already-moved entity.
- **The spatial grid is always in sync with explicit position writes.** Every `setPosition`/`setComponent` on the configured position key updates the grid in the same call — there is no per-tick scan. In-place mutation of a position object is not auto-detected and the grid will not see it.
- **Resources process after systems.** Production, consumption, and transfers happen after your code. If a system adds food to an entity, the production rate still fires on top of that.
- **Events from the current tick are available during the tick.** A system that emits an event can trigger listeners in the same tick. Events are cleared at the **start** of the next tick.
- **Diffs capture everything.** The diff includes changes from commands, systems, and resource processing — everything that happened in the tick.

## Determinism

The engine guarantees that `step()` is deterministic: the same state + the same commands = the same output. This is critical for:

- **Testing** — Tests call `step()` and assert exact results
- **AI agents** — Agents can predict the effect of actions
- **Replays** — Record commands, replay them to reproduce exact state
- **Multiplayer** — Lockstep simulation across clients

What makes it deterministic:
- `step()` ignores real-time (no `Date.now()`, no `setTimeout`)
- `step()` ignores pause state and speed multiplier
- System execution order is fixed (phase order, then registration order within each phase)
- Entity IDs are assigned predictably (sequential + free-list LIFO)
- All operations are synchronous

What can break determinism:
- Using `Math.random()` in systems (use `world.random()` or seedable noise instead)
- Reading `Date.now()` or other external state in systems
- Non-deterministic iteration of `Map`/`Set` (the engine avoids this internally)

The real-time loop (`start()`/`stop()`) uses timing and speed control, but it just calls `step()` repeatedly. The step itself is always deterministic.

## Data Flow Patterns

### Input: Commands

External code sends instructions to the simulation via **commands**. Commands are validated on submit and processed at the start of the next tick.

```
AI Agent / UI  ──submit()──▶  CommandQueue  ──tick start──▶  Handler  ──▶  World mutation
                                                   ▲
                                              Validator
                                           (rejects invalid)
```

### Output: Events

Systems communicate with each other and with external observers via **events**. Events fire synchronously during the tick and are buffered for external reading.

```
System A  ──emit()──▶  EventBus  ──▶  Listener (system B, same tick)
                          │
                          └──▶  getEvents() (external, after tick)
```

### Output: Diffs

Per-tick change sets capture what changed. This is how clients stay in sync without polling the full state.

```
Tick executes  ──▶  Dirty tracking  ──▶  buildDiff()  ──▶  onDiff() listeners
                                                            ──▶  getDiff() (pull)
```

### Output: Serialization

Full state snapshots for save/load and initial client sync.

```
world.serialize()  ──▶  WorldSnapshot (JSON)  ──▶  World.deserialize()
```

### Atomic Transactions

`world.transaction()` is a synchronous propose-validate-commit-or-abort builder over the world. Buffer mutations + events + `require()` preconditions; on `commit()` everything applies (preconditions passed) or nothing applies (any precondition failed).

```
Builder ──require()──▶ buffered preconditions
        ──setComponent / setPosition / addResource / removeResource / emit──▶ buffered ops
        ──commit()──▶ run preconditions ──pass──▶ apply mutations + emit events
                                       ──fail──▶ return { ok: false, code, reason }
```

Use a transaction when an action needs an atomic cost / precondition check ("build if wood ≥ 80"); use a queued command when the action originates outside the tick and needs structured execution feedback for an external client.

### Standalone Utilities (not owned by World)

The engine ships several standalone data structures that game code instantiates and ticks itself. None are subsystems of `World`; all are pure data + methods, JSON-serializable, and independently testable:

- **`OccupancyGrid` / `OccupancyBinding` / `SubcellOccupancyGrid`** — passability, footprints, slot-based crowding
- **`VisibilityMap`** — per-player visible / explored cells
- **`Layer<T>`** — typed downsampled-resolution overlay maps for field data (pollution, influence, danger, weather, faith)
- **`findGridPath` / `PathCache` / `PathRequestQueue`** — A* and queued path processing
- **`createNoise2D` / `octaveNoise2D` / `stepCellGrid`** — map-generation primitives
- **`createBehaviorTree` / `BTState`** — behavior-tree framework
- **`SessionRecorder` / `SessionReplayer` / `SessionBundle` / `SessionSink` / `SessionSource` / `MemorySink` / `FileSink` / `Marker` / `RecordedCommand`** — capture deterministic, replayable bundles of any World run; load + replay + selfCheck; companion adapter `scenarioResultToBundle()`. See `docs/guides/session-recording.md`.

`SpatialGrid` answers proximity questions (which entities are near point P) and is owned by `World`. The standalone utilities answer different questions and let game code mix them as needed without paying for what it doesn't use.

## AI-Native Design

The engine is designed for AI agents to operate. This affects several design decisions:

### Structured interfaces over interactive UI

Every input and output is a typed data structure. No menus, no dialogs, no mouse events. An AI agent interacts through:

- **Commands** — structured input with validation
- **Events** — structured output with type information
- **Diffs** — structured change sets
- **Snapshots** — structured state

### Programmatic control over real-time

AI agents typically call `step()` in a loop, not `start()`. This gives them exact control over when ticks happen and lets them inspect state between ticks.

```typescript
// AI agent loop
for (let i = 0; i < 100; i++) {
  // Analyze state
  const state = world.serialize();
  
  // Decide actions
  const actions = aiDecide(state);
  
  // Submit commands
  for (const action of actions) {
    world.submit(action.type, action.data);
  }
  
  // Advance simulation
  world.step();
  
  // Observe results
  const diff = world.getDiff();
  const events = world.getEvents();
}
```

### JSON-serializable state

Every data structure the engine produces is plain JSON — no class instances, no circular references, no non-serializable types. This means AI agents can:

- Parse state with any JSON library
- Send state over any transport
- Store state in any database
- Diff states with generic tools

### Separation of engine and game

The engine provides infrastructure. Game-specific logic (what units do, how combat works, what resources mean) lives in **systems** and **command handlers** written by the game project. The engine never makes game-design decisions.
