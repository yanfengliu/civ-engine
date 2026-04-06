# Client Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a transport-agnostic client protocol with typed messages and a ClientAdapter that bridges the World API to any transport via a `send` callback.

**Architecture:** Single new module `src/client-adapter.ts` exports message types (`ServerMessage`, `ClientMessage`, `GameEvent`) and a `ClientAdapter` class. The adapter takes a World instance and a send callback, subscribes to diffs via `world.onDiff`, and translates between typed messages and World API calls. No transport dependencies.

**Tech Stack:** TypeScript 5.7+, Vitest 3

---

### Task 1: Types and ClientAdapter with connect/disconnect

**Files:**
- Create: `src/client-adapter.ts`
- Create: `tests/client-adapter.test.ts`

- [ ] **Step 1: Write failing tests for connect and disconnect**

Create `tests/client-adapter.test.ts` with 5 tests. These will fail because the module doesn't exist yet.

```typescript
import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';
import { ClientAdapter } from '../src/client-adapter.js';
import type { ServerMessage } from '../src/client-adapter.js';

type Events = { unitMoved: { id: number; x: number; y: number } };
type Commands = { move: { id: number; x: number; y: number } };

function setup() {
  const world = new World<Events, Commands>({
    gridWidth: 10,
    gridHeight: 10,
    tps: 10,
  });
  const messages: ServerMessage<Events, Commands>[] = [];
  const adapter = new ClientAdapter<Events, Commands>({
    world,
    send: (msg) => messages.push(msg),
  });
  return { world, messages, adapter };
}

describe('ClientAdapter', () => {
  it('connect() sends snapshot immediately', () => {
    const { adapter, messages, world } = setup();
    adapter.connect();
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('snapshot');
    if (messages[0].type === 'snapshot') {
      expect(messages[0].data).toEqual(world.serialize());
    }
  });

  it('sends tick message with diff and events after each step', () => {
    const { adapter, messages, world } = setup();
    adapter.connect();
    messages.length = 0;

    world.step();
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('tick');
    if (messages[0].type === 'tick') {
      expect(messages[0].data.diff).toBeDefined();
      expect(messages[0].data.diff.tick).toBe(1);
      expect(messages[0].data.events).toEqual([]);
    }
  });

  it('multiple connect() calls do not duplicate listeners or snapshots', () => {
    const { adapter, messages, world } = setup();
    adapter.connect();
    adapter.connect();
    expect(messages).toHaveLength(1);

    messages.length = 0;
    world.step();
    expect(messages).toHaveLength(1);
  });

  it('disconnect() stops tick messages', () => {
    const { adapter, messages, world } = setup();
    adapter.connect();
    messages.length = 0;

    adapter.disconnect();
    world.step();
    expect(messages).toHaveLength(0);
  });

  it('disconnect() when not connected is a no-op', () => {
    const { adapter } = setup();
    expect(() => adapter.disconnect()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/client-adapter.test.ts`
Expected: FAIL — module `../src/client-adapter.js` does not exist.

- [ ] **Step 3: Implement types and ClientAdapter with connect/disconnect**

Create `src/client-adapter.ts`:

```typescript
import type { WorldSnapshot } from './serializer.js';
import type { TickDiff } from './diff.js';
import type { World } from './world.js';

export type GameEvent<TEventMap> = {
  type: keyof TEventMap;
  data: TEventMap[keyof TEventMap];
};

export type ServerMessage<
  TEventMap,
  TCommandMap = unknown,
> =
  | { type: 'snapshot'; data: WorldSnapshot }
  | { type: 'tick'; data: { diff: TickDiff; events: GameEvent<TEventMap>[] } }
  | { type: 'commandRejected'; data: { id: string; reason?: string } };

export type ClientMessage<TCommandMap> =
  | {
      type: 'command';
      data: {
        id: string;
        commandType: keyof TCommandMap;
        payload: TCommandMap[keyof TCommandMap];
      };
    }
  | { type: 'requestSnapshot' };

export class ClientAdapter<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  private world: World<TEventMap, TCommandMap>;
  private send: (message: ServerMessage<TEventMap, TCommandMap>) => void;
  private connected = false;
  private diffListener: ((diff: TickDiff) => void) | null = null;

  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    send: (message: ServerMessage<TEventMap, TCommandMap>) => void;
  }) {
    this.world = config.world;
    this.send = config.send;
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;

    this.send({ type: 'snapshot', data: this.world.serialize() });

    this.diffListener = (diff: TickDiff) => {
      this.send({
        type: 'tick',
        data: {
          diff,
          events: [...this.world.getEvents()] as GameEvent<TEventMap>[],
        },
      });
    };
    this.world.onDiff(this.diffListener);
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    if (this.diffListener) {
      this.world.offDiff(this.diffListener);
      this.diffListener = null;
    }
  }

  handleMessage(message: ClientMessage<TCommandMap>): void {
    switch (message.type) {
      case 'command': {
        const { id, commandType, payload } = message.data;
        const accepted = this.world.submit(commandType, payload);
        if (!accepted) {
          this.send({ type: 'commandRejected', data: { id } });
        }
        break;
      }
      case 'requestSnapshot':
        this.send({ type: 'snapshot', data: this.world.serialize() });
        break;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/client-adapter.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/client-adapter.ts tests/client-adapter.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 6: Commit**

```bash
git add src/client-adapter.ts tests/client-adapter.test.ts
git commit -m "feat: add ClientAdapter with connect/disconnect and message types"
```

---

### Task 2: handleMessage tests

**Files:**
- Modify: `tests/client-adapter.test.ts`

- [ ] **Step 1: Add tests for handleMessage and events**

Append these 4 tests inside the existing `describe('ClientAdapter', ...)` block in `tests/client-adapter.test.ts`:

```typescript
  it('handleMessage with command calls world.submit() successfully', () => {
    const { adapter, messages, world } = setup();
    world.registerHandler('move', () => {});

    adapter.handleMessage({
      type: 'command',
      data: {
        id: 'cmd-1',
        commandType: 'move',
        payload: { id: 0, x: 1, y: 1 },
      },
    });

    const rejected = messages.filter((m) => m.type === 'commandRejected');
    expect(rejected).toHaveLength(0);
  });

  it('handleMessage with command sends commandRejected when validation fails', () => {
    const { adapter, messages, world } = setup();
    world.registerValidator('move', () => false);
    world.registerHandler('move', () => {});

    adapter.handleMessage({
      type: 'command',
      data: {
        id: 'cmd-42',
        commandType: 'move',
        payload: { id: 0, x: 1, y: 1 },
      },
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      type: 'commandRejected',
      data: { id: 'cmd-42' },
    });
  });

  it('handleMessage with requestSnapshot sends a fresh snapshot', () => {
    const { adapter, messages, world } = setup();
    adapter.handleMessage({ type: 'requestSnapshot' });

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('snapshot');
    if (messages[0].type === 'snapshot') {
      expect(messages[0].data).toEqual(world.serialize());
    }
  });

  it('tick message includes events emitted by systems', () => {
    const { adapter, messages, world } = setup();
    world.registerSystem((w) => {
      w.emit('unitMoved', { id: 1, x: 5, y: 5 });
    });
    adapter.connect();
    messages.length = 0;

    world.step();
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('tick');
    if (messages[0].type === 'tick') {
      expect(messages[0].data.events).toEqual([
        { type: 'unitMoved', data: { id: 1, x: 5, y: 5 } },
      ]);
    }
  });
```

- [ ] **Step 2: Run tests to verify all 9 pass**

Run: `npx vitest run tests/client-adapter.test.ts`
Expected: 9 tests PASS

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All 207 tests pass (198 existing + 9 new)

- [ ] **Step 4: Commit**

```bash
git add tests/client-adapter.test.ts
git commit -m "test: add handleMessage and events tests for ClientAdapter"
```

---

### Task 3: Documentation updates

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`
- Modify: `README.md`

- [ ] **Step 1: Update ARCHITECTURE.md**

Add a row for ClientAdapter in the Component Map table:

```markdown
| ClientAdapter | `src/client-adapter.ts` | Bridges World API to typed client messages via send callback |
```

Add a boundary rule:

```markdown
- **ClientAdapter** reads World state and subscribes to diffs. It does not modify World internals directly — it uses only the public API (`serialize`, `onDiff`/`offDiff`, `getEvents`, `submit`).
```

Add a drift log entry:

```markdown
| 2026-04-06 | Added ClientAdapter | Transport-agnostic client protocol with typed messages for server-client communication |
```

- [ ] **Step 2: Update ROADMAP.md**

Move "Client protocol" from Planned to Built:

```markdown
- Client protocol — `ClientAdapter` with typed `ServerMessage`/`ClientMessage`, transport-agnostic send callback
```

- [ ] **Step 3: Update README.md**

Add ClientAdapter to the Project Structure section:

```
  client-adapter.ts   Transport-agnostic client protocol
```

Add a row to the Feature Overview table:

```markdown
| **Client Protocol** | Transport-agnostic typed messages, ClientAdapter bridges World to any transport |
```

Add ClientAdapter methods to the API Reference. After the State section, add:

```markdown
| **Client Protocol** | | |
| `new ClientAdapter({ world, send })` | `ClientAdapter` | Create adapter with World and send callback |
| `adapter.connect()` | `void` | Send snapshot, start streaming tick diffs |
| `adapter.disconnect()` | `void` | Stop streaming tick diffs |
| `adapter.handleMessage(msg)` | `void` | Process incoming client message |
```

Add ClientAdapter to the Standalone Utilities or note it as a direct import:

```markdown
| `client-adapter.ts` | `ClientAdapter`, `ServerMessage`, `ClientMessage`, `GameEvent` | Transport-agnostic client protocol |
```

- [ ] **Step 4: Run lint on modified docs (if applicable)**

Run: `npx eslint .`
Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add docs/ARCHITECTURE.md docs/ROADMAP.md README.md
git commit -m "docs: update architecture, roadmap, and README for client protocol"
```
