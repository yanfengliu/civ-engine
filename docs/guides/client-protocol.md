# Client Protocol Guide

This guide covers the `ClientAdapter` and the typed message protocol for connecting the engine to external clients over any transport.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setting Up a ClientAdapter](#setting-up-a-clientadapter)
4. [Server Messages](#server-messages)
5. [Client Messages](#client-messages)
6. [Transport Examples](#transport-examples)
7. [Multiple Clients](#multiple-clients)
8. [Error Handling](#error-handling)

---

## Overview

The engine is headless — it has no built-in networking or rendering. The `ClientAdapter` bridges the World to external clients by converting engine state into typed messages and dispatching incoming commands.

The adapter is **transport-agnostic**. You provide a `send` callback; the adapter calls it with typed messages. You receive incoming messages from your transport and pass them to `handleMessage()`. The adapter doesn't know or care whether you're using WebSocket, stdin/stdout, postMessage, or carrier pigeons.

## Architecture

```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐
│   Client     │────▶│  Transport    │────▶│ ClientAdapter│
│  (browser,   │     │  (WebSocket,  │     │  .handleMessage()
│   AI agent,  │◀────│   stdio,     │◀────│  .send callback
│   etc.)      │     │   etc.)       │     │             │
└─────────────┘     └───────────────┘     └──────┬──────┘
                                                  │
                                           ┌──────▼──────┐
                                           │    World     │
                                           │  .serialize()│
                                           │  .submit()   │
                                           │  .onDiff()   │
                                           └─────────────┘
```

The adapter uses only World's public API:
- `serialize()` for snapshots
- `submitWithResult()` for commands
- `onDiff()`/`offDiff()` for streaming diffs
- `getEvents()` for tick events

## Setting Up a ClientAdapter

```typescript
import { World, ClientAdapter, type ServerMessage, type ClientMessage } from 'civ-engine';

type Events = { unitDied: { entityId: number } };
type Commands = { moveUnit: { entityId: number; x: number; y: number } };

const world = new World<Events, Commands>({
  gridWidth: 32, gridHeight: 32, tps: 10,
});

const adapter = new ClientAdapter<Events, Commands>({
  world,
  send: (message: ServerMessage<Events>) => {
    // Your transport logic here
    console.log('Sending:', message.type);
  },
  onError: (error) => {
    console.error('Client send failed:', error);
  },
});
```

For long-lived clients, prefer command payloads that include `EntityRef` values instead of bare entity IDs. Validators can then call `world.isCurrent(ref)` and reject commands that point at a recycled ID.

### Connect

`connect()` does two things:
1. Sends a `snapshot` message with the current full world state
2. Subscribes to diffs, so `tick` messages are sent after each `step()`

```typescript
adapter.connect();
// send callback fires with: { protocolVersion: 1, type: 'snapshot', data: worldSnapshot }

world.step();
// send callback fires with: { protocolVersion: 1, type: 'tick', data: { diff, events } }
```

### Disconnect

`disconnect()` unsubscribes from diffs. No more `tick` messages are sent.

```typescript
adapter.disconnect();
world.step(); // no tick message sent
```

Both `connect()` and `disconnect()` are idempotent (safe to call multiple times).

## Server Messages

Messages sent from the adapter to the client via the `send` callback:

### `snapshot`

Full world state. Sent on `connect()` and on `requestSnapshot`.

```typescript
{
  protocolVersion: 1,
  type: 'snapshot',
  data: WorldSnapshot  // full JSON-serializable state
}
```

### `tick`

Per-tick update. Sent after each `step()` while connected.

```typescript
{
  protocolVersion: 1,
  type: 'tick',
  data: {
    diff: TickDiff,      // what changed this tick
    events: GameEvent[]  // events emitted this tick
  }
}
```

### `commandAccepted`

Sent when a submitted command passed validation and was queued successfully.

```typescript
{
  protocolVersion: 1,
  type: 'commandAccepted',
  data: {
    id: string,
    commandType: string,
    code: 'accepted',
    message: string
  }
}
```

### `commandRejected`

Sent when a submitted command fails validation, has a malformed command type, or names a command type with no registered handler.

```typescript
{
  protocolVersion: 1,
  type: 'commandRejected',
  data: {
    id: string,
    commandType: string | null,
    code: string,
    message: string,
    details: JsonValue | null,
    validatorIndex: number | null
  }
}
```

## Client Messages

Messages sent from the client, processed by `handleMessage()`:

### `command`

Submit a game command:

```typescript
{
  type: 'command',
  data: {
    id: string,                    // unique command ID (for rejection tracking)
    commandType: 'moveUnit',       // the command type
    payload: { entityId: 0, x: 5, y: 3 }  // command data
  }
}
```

The adapter validates the message envelope, checks that a handler exists for `commandType`, then calls `world.submitWithResult()`. If validation fails or no handler is registered, a `commandRejected` message is sent back with the command's ID plus a stable code and optional JSON details. If validation passes, the adapter sends `commandAccepted`.

Every server message includes `protocolVersion`. Client messages may also include `protocolVersion`, but the adapter currently treats that field as compatibility metadata rather than a hard gate.

### `requestSnapshot`

Request a full state resync:

```typescript
{
  type: 'requestSnapshot'
}
```

The adapter responds with a `snapshot` message.

## Transport Examples

### WebSocket (Node.js server)

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  const adapter = new ClientAdapter<Events, Commands>({
    world,
    send: (msg) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
  });

  ws.on('message', (data) => {
    const msg: ClientMessage<Commands> = JSON.parse(data.toString());
    adapter.handleMessage(msg);
  });

  ws.on('close', () => adapter.disconnect());

  adapter.connect();
});
```

### stdin/stdout (for AI agents)

```typescript
import * as readline from 'readline';

const rl = readline.createInterface({ input: process.stdin });

const adapter = new ClientAdapter<Events, Commands>({
  world,
  send: (msg) => process.stdout.write(JSON.stringify(msg) + '\n'),
});

rl.on('line', (line) => {
  const msg: ClientMessage<Commands> = JSON.parse(line);
  adapter.handleMessage(msg);
});

adapter.connect();
```

### Web Worker (postMessage)

```typescript
// Main thread
const worker = new Worker('sim-worker.js');
worker.postMessage({ type: 'requestSnapshot' });
worker.onmessage = (e) => {
  const msg: ServerMessage<Events> = e.data;
  handleServerMessage(msg);
};

// Worker thread
const adapter = new ClientAdapter<Events, Commands>({
  world,
  send: (msg) => self.postMessage(msg),
});

self.onmessage = (e) => {
  adapter.handleMessage(e.data);
};

adapter.connect();
```

## Multiple Clients

Create one adapter per client. Each adapter independently tracks its connection state.

```typescript
const adapters = new Map<string, ClientAdapter<Events, Commands>>();

wss.on('connection', (ws) => {
  const clientId = crypto.randomUUID();
  
  const adapter = new ClientAdapter<Events, Commands>({
    world,
    send: (msg) => ws.send(JSON.stringify(msg)),
  });

  adapters.set(clientId, adapter);
  adapter.connect();

  ws.on('message', (data) => {
    adapter.handleMessage(JSON.parse(data.toString()));
  });

  ws.on('close', () => {
    adapter.disconnect();
    adapters.delete(clientId);
  });
});
```

Each connected adapter subscribes to diffs independently. All receive the same tick data.

## Error Handling

### Invalid commands

If a client sends a command that fails validation, has a malformed command type, or names a command type with no registered handler, the adapter sends a `commandRejected` message. The client can use the `id` field to match rejections to submitted commands and the `code` field to decide what to do next.

```typescript
// Client submits invalid command
adapter.handleMessage({
  type: 'command',
  data: {
    id: 'cmd-123',
    commandType: 'moveUnit',
    payload: { entityId: 999, x: 5, y: 3 }, // entity 999 doesn't exist
  },
});

// send callback receives:
// {
//   type: 'commandRejected',
//   data: {
//     id: 'cmd-123',
//     commandType: 'moveUnit',
//     code: 'validation_failed',
//     message: 'Validation failed',
//     details: null,
//     validatorIndex: 0,
//   },
// }
```

### Missing handlers

`ClientAdapter` rejects commands whose `commandType` has no registered handler, using `world.hasCommandHandler()` before enqueueing the command. Direct calls to `world.submit()` or `world.submitWithResult()` still need matching handlers before the next tick or `World` will throw when processing the command.

### Malformed messages

`handleMessage()` accepts `unknown` and ignores messages without a string `type`. Malformed command messages with a string `id` are rejected when possible; malformed command messages without an ID are ignored because there is no safe command to acknowledge.

```typescript
ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    adapter.handleMessage(msg);
  } catch {
    // ignore malformed JSON
  }
});
```

### Send failures

If your `send` callback throws, the adapter calls the optional `onError` callback and disconnects itself. This prevents a broken transport from throwing inside `world.step()` while diff listeners are running.
