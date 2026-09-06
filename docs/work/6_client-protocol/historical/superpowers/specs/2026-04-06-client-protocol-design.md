# Client Protocol Design

**Date:** 2026-04-06
**Status:** Approved

## Overview

Add a transport-agnostic client protocol to civ-engine. Defines typed message formats for server-to-client and client-to-server communication, plus a `ClientAdapter` class that bridges the World API to these messages via a `send` callback. No transport dependencies — the consumer wires the adapter to whatever transport they need (WebSocket, postMessage, stdin/stdout, in-process callback).

## Module

| File | Responsibility |
|---|---|
| `src/client-adapter.ts` | `ClientAdapter` class, `ServerMessage`, `ClientMessage`, `GameEvent` types |

## Message Types

### Server -> Client

```typescript
export type GameEvent<TEventMap> = {
  type: keyof TEventMap;
  data: TEventMap[keyof TEventMap];
};

export type ServerMessage<TEventMap, TCommandMap> =
  | { type: 'snapshot'; data: WorldSnapshot }
  | { type: 'tick'; data: { diff: TickDiff; events: GameEvent<TEventMap>[] } }
  | { type: 'commandRejected'; data: { id: string; reason?: string } };
```

- **`snapshot`** — Full world state. Sent on `connect()` and on `requestSnapshot`.
- **`tick`** — Sent after every tick. Contains the `TickDiff` and all game events from that tick.
- **`commandRejected`** — Sent when a client-submitted command fails validation. The `id` field lets the client correlate the rejection to a specific command submission. The `reason` field is optional.

### Client -> Server

```typescript
export type ClientMessage<TCommandMap> =
  | { type: 'command'; data: { id: string; commandType: keyof TCommandMap; payload: TCommandMap[keyof TCommandMap] } }
  | { type: 'requestSnapshot' };
```

- **`command`** — Submits a game command. `id` is a client-generated string for tracking. `commandType` and `payload` map to `world.submit(commandType, payload)`.
- **`requestSnapshot`** — Requests a full state resync. Server responds with a `snapshot` message.

## ClientAdapter

```typescript
export class ClientAdapter<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    send: (message: ServerMessage<TEventMap, TCommandMap>) => void;
  });

  connect(): void;
  disconnect(): void;
  handleMessage(message: ClientMessage<TCommandMap>): void;
}
```

## Behavior

### `connect()`

1. Sends a `snapshot` message with `world.serialize()`.
2. Registers an `onDiff` listener on the world that, after each tick, sends a `tick` message containing the diff and `world.getEvents()`.
3. Calling `connect()` when already connected is a no-op (does not duplicate listeners or send a second snapshot).

### `disconnect()`

1. Removes the `onDiff` listener.
2. Calling `disconnect()` when not connected is a no-op.

### `handleMessage(message)`

- **`command`**: Calls `world.submit(message.data.commandType, message.data.payload)`. If `submit()` returns `false` (validation failed), sends a `commandRejected` message with the command's `id`. No `reason` field is included (the engine's validators return boolean, not error messages).
- **`requestSnapshot`**: Sends a `snapshot` message with `world.serialize()`.

## Implementation Details

- The adapter stores the `onDiff` listener function as a private field so `disconnect()` can remove the exact reference.
- A `connected` boolean flag prevents duplicate listeners on repeated `connect()` calls.
- The `tick` message is constructed inside the `onDiff` callback. Events are captured via `world.getEvents()` at that point (which is inside `executeTick`, after systems run but before the tick ends, so events from the current tick are available).
- The adapter does not manage its own lifecycle — the consumer is responsible for calling `connect()` and `disconnect()` at the right times.

## Testing

### `tests/client-adapter.test.ts`

- `connect()` sends snapshot immediately
- Each `world.step()` after connect sends a tick message with diff and events
- `disconnect()` stops tick messages
- `handleMessage` with `command` calls `world.submit()` successfully (no rejection sent)
- `handleMessage` with `command` sends `commandRejected` when validation fails, includes command id
- `handleMessage` with `requestSnapshot` sends a fresh snapshot
- Multiple `connect()` calls don't duplicate listeners or snapshots
- `disconnect()` when not connected is a no-op
- Tick message includes events emitted by systems during that tick

## Out of Scope

- Transport implementation (WebSocket, HTTP, stdin/stdout)
- Message serialization/deserialization (JSON.stringify/parse is consumer's job)
- Authentication, rate limiting, connection management
- Binary or compressed message formats
- Multi-client state management (each client gets its own adapter instance)
- Request/response queries (e.g., "get component X on entity Y")
