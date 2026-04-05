# Event Bus Design

## Overview

A typed, synchronous event system for civ-engine that serves two purposes:

1. **Internal (system-to-system):** Systems emit events during a tick; other systems subscribed via listeners react immediately within the same tick.
2. **External (engine-to-client):** A per-tick event buffer that external consumers can read between ticks to observe what happened.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Standalone `EventBus` class owned by `World` | Matches existing pattern (EntityManager, ComponentStore, etc.) |
| Type safety | Generic mapped-type `EventBus<TEventMap>` | Compile-time safety on event types and payloads |
| Listener timing | Immediate (same tick) | Simple, consistent with deterministic ordered pipeline |
| Buffer lifetime | Auto-clear per tick | No memory growth, matches fixed-timestep loop |

## EventBus Class

**File:** `src/event-bus.ts`

### Type Parameters

```ts
type Listener<T> = (event: T) => void;

class EventBus<TEventMap extends Record<string, unknown>>
```

Users define an event map interface:

```ts
interface GameEvents {
  'unit-killed': { entity: EntityId };
  'damage': { target: EntityId; amount: number };
}

// EventBus<GameEvents> enforces type-safe emit/on/off
```

### Public API

| Method | Signature | Behavior |
|--------|-----------|----------|
| `emit` | `emit<K extends keyof TEventMap>(type: K, data: TEventMap[K]): void` | Pushes event to buffer, then calls all registered listeners synchronously |
| `on` | `on<K extends keyof TEventMap>(type: K, listener: Listener<TEventMap[K]>): void` | Registers a listener for the given event type |
| `off` | `off<K extends keyof TEventMap>(type: K, listener: Listener<TEventMap[K]>): void` | Removes a listener; no-op if not registered |
| `getEvents` | `getEvents(): ReadonlyArray<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>` | Returns the current tick's event buffer (readonly) |
| `clear` | `clear(): void` | Empties the buffer; preserves listeners |

### Internal State

- `listeners: Map<keyof TEventMap, Set<Listener<any>>>` — subscriber registry
- `buffer: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>` — per-tick event log

## World Integration

### Generic Parameter

`World` becomes generic over an event map:

```ts
class World<TEventMap extends Record<string, unknown> = Record<string, never>>
```

The default `Record<string, never>` means existing code without events continues to work unchanged.

### New Public Methods

World delegates to its internal EventBus:

- `emit<K>(type, data)` — for systems to emit events
- `on<K>(type, listener)` / `off<K>(type, listener)` — for systems to subscribe
- `getEvents()` — for external consumers

### Tick Lifecycle Change

`executeTick()` becomes:

```
executeTick()
  -> eventBus.clear()         [reset buffer from previous tick]
  -> syncSpatialIndex()       [unchanged]
  -> System A(world)          [may emit/listen]
  -> System B(world)          [may emit/listen]
  -> ...
  // After tick: external consumers call world.getEvents()
```

### System Type

No change: `type System = (world: World) => void`. Systems access events via the `world` parameter.

### WorldConfig

No change. No event-related configuration needed.

## Testing

### Unit Tests (`tests/event-bus.test.ts`)

- `emit()` calls registered listeners with correct data
- `emit()` pushes events to the buffer
- `on()` for unregistered event type works (no pre-registration)
- `off()` removes a listener; subsequent emits don't call it
- `off()` with non-registered listener is a no-op
- `clear()` empties the buffer but preserves listeners
- `getEvents()` returns all events emitted since last clear
- Multiple listeners on same event type all fire
- Multiple event types don't interfere

### Integration Tests (additions to `tests/world.test.ts`)

- `world.emit()` triggers `world.on()` listeners within the same tick
- System A emits, System B (registered later) sees it via listener
- `world.getEvents()` returns events from current tick
- Events are cleared at the start of the next tick
- Events still work after entity destruction (no coupling)

## Files Changed

| File | Change |
|------|--------|
| `src/event-bus.ts` | New — EventBus class |
| `src/types.ts` | No change |
| `src/world.ts` | Add generic param, EventBus instance, delegate methods, clear in executeTick |
| `tests/event-bus.test.ts` | New — unit tests |
| `tests/world.test.ts` | Add integration tests |
