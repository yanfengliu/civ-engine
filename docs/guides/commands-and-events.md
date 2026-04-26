# Commands and Events Guide

This guide covers the input (commands) and output (events) systems that connect the simulation to external code.

## Table of Contents

1. [Commands Overview](#commands-overview)
2. [Defining Command Types](#defining-command-types)
3. [Validators](#validators)
4. [Handlers](#handlers)
5. [Events Overview](#events-overview)
6. [Defining Event Types](#defining-event-types)
7. [Emitting and Listening](#emitting-and-listening)
8. [Event Lifecycle](#event-lifecycle)
9. [Patterns](#patterns)

---

## Commands Overview

Commands are the **input API** of the simulation. External code (AI agents, UI, network clients) submits commands to tell the simulation what to do. Commands are:

- **Typed** — each command type has a defined data shape
- **Validated** — rejected immediately if invalid (before queuing)
- **Queued** — executed at the start of the next tick, not immediately
- **Ordered** — processed in submission order

```
External code  ──submit()──▶  Validators  ──pass──▶  Queue  ──next tick──▶  Handler
                                  │
                                  └──fail──▶  returns false
```

There are now two distinct command feedback stages:

1. submission time: `submitWithResult()` / `onCommandResult()`
2. tick execution time: `onCommandExecution()`

For AI or transport integrations, do not treat queue acceptance as proof that the command logic succeeded.

## Defining Command Types

Define command types as a TypeScript record mapping command names to their payload types:

```typescript
type GameCommands = {
  moveUnit: { entityId: EntityId; targetX: number; targetY: number };
  buildCity: { x: number; y: number; name: string };
  attackUnit: { attackerId: EntityId; targetId: EntityId };
  endTurn: Record<string, never>; // no payload
};

const world = new World<Record<string, never>, GameCommands>({
  gridWidth: 32, gridHeight: 32, tps: 10,
});
```

The second type parameter of `World` is the command map. This gives you type-safe `submit()`, `submitWithResult()`, `registerValidator()`, and `registerHandler()` calls.

### Stale entity references

For commands from clients, UIs, or AI agents that may hold references across ticks, prefer `EntityRef` over bare `EntityId`. Entity IDs are recycled after destruction, and the generation lets validators reject stale commands:

```typescript
type GameCommands = {
  moveUnit: { unit: EntityRef; target: Position };
};

world.registerValidator('moveUnit', (data, w) => {
  return w.isCurrent(data.unit);
});

world.registerHandler('moveUnit', (data, w) => {
  w.setPosition(data.unit.id, data.target);
});
```

Bare `EntityId` is still fine for short-lived internal system work where the ID is read and used immediately.

## Validators

Validators run synchronously when `submit()` or `submitWithResult()` is called. They decide whether a command is valid and should be queued.

```typescript
world.registerValidator('moveUnit', (data, w) => {
  if (!w.isAlive(data.entityId)) {
    return {
      code: 'dead_entity',
      message: 'Entity is not alive',
      details: { entityId: data.entityId },
    };
  }
  if (data.targetX < 0 || data.targetX >= w.grid.width) return false;
  if (data.targetY < 0 || data.targetY >= w.grid.height) return false;
  return true;
});
```

### Multiple validators

You can register multiple validators for the same command type. They run in registration order and **short-circuit** on the first rejection:

```typescript
// Validator 1: entity must be alive
world.registerValidator('moveUnit', (data, w) => w.isAlive(data.entityId));

// Validator 2: entity must have a position (only runs if validator 1 passes)
world.registerValidator('moveUnit', (data, w) => {
  return w.getComponent(data.entityId, 'position') !== undefined;
});

// Validator 3: target must not be blocked
world.registerValidator('moveUnit', (data, w) => {
  const blocked = w.grid.getAt(data.targetX, data.targetY);
  return !blocked || blocked.size === 0;
});
```

### Validation result

`submit()` returns `true` if all validators pass, `false` if any reject. Use `submitWithResult()` when an agent or client needs a stable machine-readable outcome:

```typescript
const result = world.submitWithResult('moveUnit', {
  entityId: deadUnit,
  targetX: 5,
  targetY: 3,
});
// result.accepted === false
// result.code === 'dead_entity'
// result.details === { entityId: deadUnit }
// result.schemaVersion === 1
```

### Observing command outcomes

External tooling can subscribe to every accepted or rejected submission:

```typescript
world.onCommandResult((result) => {
  auditLog.push(result);
});
```

### Observing command execution

Queued commands may still fail later if the handler is missing at drain time or throws during execution. Subscribe to tick-time execution results when that distinction matters:

```typescript
world.onCommandExecution((result) => {
  console.log(result.executed, result.code, result.tick);
});
```

## Handlers

Handlers execute the command logic at the start of the next tick. Exactly one handler per command type.

```typescript
world.registerHandler('moveUnit', (data, w) => {
  w.setPosition(data.entityId, { x: data.targetX, y: data.targetY });
});
```

### Handler rules

- **One handler per type** — registering a second handler throws:
  ```typescript
  world.registerHandler('moveUnit', handler1);
  world.registerHandler('moveUnit', handler2); // Error: Handler already registered
  ```

- **Missing handler** — if a command is queued but no handler is registered when the tick processes it, `world.stepWithResult()` returns a structured `TickFailure` and `world.step()` throws `WorldTickFailureError`:
  ```typescript
  world.submit('moveUnit', data); // queued
  const step = world.stepWithResult();
  // step.ok === false
  // step.failure?.code === 'missing_handler'
  // world.isPoisoned() === true — call world.recover() before stepping again
  ```

- **Handlers can do anything** — create entities, destroy entities, emit events, modify components, etc.

- **Tick-aborted commands are auditable** — if any command in a tick triggers a failure (missing handler or thrown handler), every command after it in the same tick is dropped. Each dropped command emits a `commandExecuted: false` event with `code: 'tick_aborted_before_handler'`, and the dropped sequences are listed on `failure.details.droppedCommands`. Re-submit them after `world.recover()` if your loop wants to retry.

### Command timing

Commands submitted during a tick (e.g., from a system) are queued and processed at the start of the **next** tick:

```
Tick N:
  processCommands()  ← commands submitted before tick N are processed here
  system A  ← if system A calls submit(), that command waits for tick N+1
  system B
  ...

Tick N+1:
  processCommands()  ← system A's command is processed here
  ...
```

For non-throwing AI loops, pair command submission with `stepWithResult()` so runtime failures stay machine-readable.

## Atomic Transactions

`world.transaction()` is a **synchronous** alternative to the queue-then-handler pattern when you want a propose-validate-commit-or-abort surface for compound actions.

```typescript
const result = world
  .transaction()
  .require((w) => {
    const wood = w.getResource(player, 'wood');
    return (wood?.current ?? 0) >= 80 || 'not enough wood';
  })
  .removeResource(player, 'wood', 80)
  .setComponent(site, 'building', { kind: 'house' })
  .emit('building_placed', { player, site, kind: 'house' })
  .commit();

if (!result.ok) {
  // result.code is 'precondition_failed' (with .reason) or 'aborted'
}
```

If preconditions pass, every buffered mutation applies in registration order through the same public `World` API as direct calls (so they get the same liveness/JSON-compat checks), then buffered events fire. If any precondition returns `false` or a string, **no mutation or event applies** and the result is `{ ok: false, code: 'precondition_failed', reason }`. When committed inside a system or command handler, all transaction mutations land in the same `TickDiff`.

When to use a transaction vs. a queued command:

- **Use a transaction** when the action is a single agent intent that needs an atomic cost/precondition check ("build a house if wood available"; "cast a spell if mana ≥ 30 and target alive"). The check and the mutation happen in one call; failure leaves the world untouched.
- **Use a queued command** when the action originates from outside the simulation tick (player input, network message) and needs to land at a tick boundary, run through validators, and produce structured execution feedback for an external client.

Transactions are single-use. `commit()` after a previous `commit()` throws; `commit()` after `abort()` returns `{ ok: false, code: 'aborted' }`. Mid-commit throw consumes the transaction (so a retry cannot re-apply earlier mutations and silently double-debit a resource), but the world is left in a partially-applied state — validate entity liveness in a `require()` predicate when buffering mutations against entities the transaction did not itself create.

The full surface and the v1 limitations (no `createEntity` / `destroyEntity`, no tags / metadata / state, the buffered-value aliasing window, the mid-emit partial-event-delivery rule) are documented in [API Reference → Command Transaction](../api-reference.md#command-transaction).

## Events Overview

Events are the **output API** of the simulation. Systems emit events to communicate what happened. External observers read events to understand state changes.

Events are:

- **Typed** — each event type has a defined data shape
- **Synchronous** — listeners fire immediately when an event is emitted
- **Buffered** — all events from a tick are available via `getEvents()`
- **Ephemeral** — cleared at the start of the next tick

## Defining Event Types

Define event types as a TypeScript record:

```typescript
type GameEvents = {
  unitDied: { entityId: EntityId; cause: string };
  cityFounded: { entityId: EntityId; x: number; y: number; name: string };
  resourceDepleted: { entityId: EntityId; resource: string };
  turnEnded: { tick: number };
};

const world = new World<GameEvents, GameCommands>({
  gridWidth: 32, gridHeight: 32, tps: 10,
});
```

The first type parameter of `World` is the event map.

## Emitting and Listening

### Emitting events

Events are typically emitted from systems:

```typescript
function combatSystem(w: World<GameEvents, GameCommands>): void {
  for (const id of w.query('health')) {
    const hp = w.getComponent<Health>(id, 'health')!;
    if (hp.hp <= 0) {
      w.emit('unitDied', { entityId: id, cause: 'combat' });
    }
  }
}
```

### Subscribing to events

Listeners fire synchronously when the event is emitted:

```typescript
world.on('unitDied', (event) => {
  console.log(`Unit ${event.entityId} died from ${event.cause}`);
});
```

### Unsubscribing

```typescript
const listener = (event: GameEvents['unitDied']) => { /* ... */ };
world.on('unitDied', listener);
world.off('unitDied', listener); // same function reference
```

### Reading all events

After a tick, read all events with `getEvents()`:

```typescript
world.step();
for (const event of world.getEvents()) {
  console.log(event.type, event.data);
}
```

## Event Lifecycle

```
Tick N start:
  eventBus.clear()    ← events from tick N-1 are gone

Tick N execution:
  system A emits 'unitDied'  → listener fires immediately
  system B emits 'cityFounded'  → listener fires immediately

Tick N end:
  getEvents() returns [unitDied, cityFounded]  ← both events available

Between ticks:
  getEvents() still returns [unitDied, cityFounded]  ← still available

Tick N+1 start:
  eventBus.clear()  ← events from tick N are gone
```

**Key point:** Events from tick N are available during tick N (for system-to-system communication) and after tick N (for external reading), but are cleared when tick N+1 begins.

## Patterns

### Command-event flow

Commands trigger handlers that emit events:

```typescript
world.registerHandler('attackUnit', (data, w) => {
  const targetHp = w.getComponent<Health>(data.targetId, 'health')!;
  const attackPower = w.getComponent<Attack>(data.attackerId, 'attack')!;
  
  targetHp.hp -= attackPower.damage;
  
  if (targetHp.hp <= 0) {
    w.emit('unitDied', { entityId: data.targetId, cause: 'attack' });
    w.destroyEntity(data.targetId);
  }
});
```

### Event-driven spawning

```typescript
world.on('cityFounded', (event) => {
  // Spawn initial garrison
  const guard = world.createEntity();
  world.setPosition(guard, { x: event.x, y: event.y });
  world.addComponent(guard, 'health', { hp: 50, maxHp: 50 });
});
```

### Audit logging

```typescript
world.on('unitDied', (e) => auditLog.push({ tick: world.tick, ...e }));
world.on('cityFounded', (e) => auditLog.push({ tick: world.tick, ...e }));
```

### AI agent observation

AI agents use events and diffs to observe the simulation without scanning all entities:

```typescript
// AI agent reads events after each tick
world.step();
for (const event of world.getEvents()) {
  if (event.type === 'unitDied') {
    agent.handleUnitDeath(event.data);
  }
}
```
