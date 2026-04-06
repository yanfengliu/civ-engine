# Input Command Layer — Design Spec

## Overview

A typed command queue system that accepts player commands, validates them against game state, and processes them at the start of each tick. Commands are semantically distinct from events: commands request future actions (can be rejected), events notify about things that already happened.

## Module: `src/command-queue.ts`

### CommandQueue\<TCommandMap\>

A minimal typed buffer. No validation logic, no World reference.

```typescript
class CommandQueue<TCommandMap extends Record<keyof TCommandMap, unknown>> {
  push<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): void;
  drain(): Array<{ type: keyof TCommandMap; data: TCommandMap[keyof TCommandMap] }>;
  get pending(): number;
}
```

- `push(type, data)` — appends a command to the internal array.
- `drain()` — returns all queued commands in submission order and clears the buffer.
- `pending` — number of commands currently queued.

## World Integration

### New Generic Parameter

World gains a second generic parameter for the command map:

```typescript
class World<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
>
```

The `System` type also picks up `TCommandMap` so systems see the full World type.

### New Public Methods

```typescript
submit<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): boolean;
registerValidator<K extends keyof TCommandMap>(
  type: K,
  fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => boolean,
): void;
registerHandler<K extends keyof TCommandMap>(
  type: K,
  fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => void,
): void;
```

**`submit(type, data)`** — Runs all registered validators for that command type. If all return `true`, pushes the command to the queue and returns `true`. If any returns `false`, rejects and returns `false`. No validators registered = auto-pass (command is queued).

**`registerValidator(type, fn)`** — Registers a validator for a command type. Multiple validators per type allowed; all must pass for a command to be accepted. Validators receive the command data and the world instance.

**`registerHandler(type, fn)`** — Registers the handler for a command type. One handler per type. Registering a second handler for the same type throws. Handlers receive the command data and the world instance.

### Tick Flow

```
executeTick()
  -> eventBus.clear()
  -> processCommands()   [drain queue, run handler for each command]
  -> syncSpatialIndex()  [picks up entity/position changes from command handlers]
  -> system A(world)
  -> system B(world)
```

Commands submitted during a tick (by a system calling `world.submit()`) are queued for the **next** tick. The drain happens once at tick start.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No handler registered when command type is drained | Throws `Error("No handler registered for command 'X'")` |
| Duplicate handler registration for same type | Throws on registration |
| Validator throws | Exception propagates to `submit()` caller; command is not queued |
| Handler throws during processing | Exception propagates immediately; remaining commands stay lost (queue was already drained). Keep handlers simple — errors are bugs, not expected flow. |
| Submit with no validators registered | Auto-pass, command is queued |
| Submit during tick (by a system) | Queued for next tick |

## Testing Plan

### CommandQueue unit tests (`tests/command-queue.test.ts`)

- push and drain returns commands in submission order
- drain clears the buffer
- pending reflects queue size
- drain on empty queue returns empty array

### World integration tests (added to `tests/world.test.ts`)

- submit with no validators queues and returns true
- submit with passing validator queues and returns true
- submit with failing validator rejects and returns false
- multiple validators — all must pass
- handler runs on step, receives correct data
- handler can emit events and modify components
- duplicate handler registration throws
- no handler at drain time throws
- commands submitted by a system during tick are processed next tick
- commands drain before spatial sync (handler adds position, grid sees it after sync)

## Files Changed

| File | Change |
|------|--------|
| `src/command-queue.ts` | New module |
| `src/world.ts` | Add `TCommandMap` generic, `submit()`, `registerValidator()`, `registerHandler()`, `processCommands()` |
| `src/types.ts` | No changes expected |
| `tests/command-queue.test.ts` | New test file |
| `tests/world.test.ts` | New integration tests |
| `docs/ARCHITECTURE.md` | Add CommandQueue to component map, update data flow, drift log |
| `docs/ROADMAP.md` | Move "Input command layer" to Built |
