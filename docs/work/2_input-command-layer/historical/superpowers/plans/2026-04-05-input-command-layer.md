# Input Command Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed command queue that validates and buffers player commands, processing them at the start of each tick before spatial sync and user systems.

**Architecture:** New `CommandQueue<TCommandMap>` module acts as a typed buffer. World owns the queue as a private field and orchestrates validation (via registered validators) and processing (via registered handlers). Commands are drained and processed in `executeTick()` between `eventBus.clear()` and `syncSpatialIndex()`.

**Tech Stack:** TypeScript 5.7+ (strict mode, ESM, Node16 resolution), Vitest 3

**Spec:** `docs/superpowers/specs/2026-04-05-input-command-layer-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/command-queue.ts` | Create | Typed command buffer (push, drain, pending) |
| `tests/command-queue.test.ts` | Create | Unit tests for CommandQueue |
| `src/world.ts` | Modify | Add TCommandMap generic, submit/registerValidator/registerHandler, processCommands |
| `tests/world.test.ts` | Modify | Integration tests for command flow |
| `docs/ARCHITECTURE.md` | Modify | Add CommandQueue to component map, update data flow, drift log |
| `docs/ROADMAP.md` | Modify | Move "Input command layer" to Built |

---

## Task 1: CommandQueue — push and drain

**Files:**
- Create: `src/command-queue.ts`
- Create: `tests/command-queue.test.ts`

- [ ] **Step 1: Write failing tests for push and drain**

Create `tests/command-queue.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CommandQueue } from '../src/command-queue.js';

type TestCommands = {
  move: { x: number; y: number };
  attack: { targetId: number };
};

describe('CommandQueue', () => {
  it('returns commands in submission order on drain', () => {
    const queue = new CommandQueue<TestCommands>();
    queue.push('move', { x: 1, y: 2 });
    queue.push('attack', { targetId: 5 });
    const commands = queue.drain();
    expect(commands).toEqual([
      { type: 'move', data: { x: 1, y: 2 } },
      { type: 'attack', data: { targetId: 5 } },
    ]);
  });

  it('clears the buffer after drain', () => {
    const queue = new CommandQueue<TestCommands>();
    queue.push('move', { x: 0, y: 0 });
    queue.drain();
    expect(queue.drain()).toEqual([]);
  });

  it('reports pending count', () => {
    const queue = new CommandQueue<TestCommands>();
    expect(queue.pending).toBe(0);
    queue.push('move', { x: 0, y: 0 });
    expect(queue.pending).toBe(1);
    queue.push('attack', { targetId: 1 });
    expect(queue.pending).toBe(2);
  });

  it('returns empty array when draining empty queue', () => {
    const queue = new CommandQueue<TestCommands>();
    expect(queue.drain()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/command-queue.test.ts`
Expected: FAIL — module `../src/command-queue.js` does not exist.

- [ ] **Step 3: Implement CommandQueue**

Create `src/command-queue.ts`:

```typescript
export class CommandQueue<
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  private buffer: Array<{
    type: keyof TCommandMap;
    data: TCommandMap[keyof TCommandMap];
  }> = [];

  push<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): void {
    this.buffer.push({ type, data });
  }

  drain(): Array<{
    type: keyof TCommandMap;
    data: TCommandMap[keyof TCommandMap];
  }> {
    const commands = [...this.buffer];
    this.buffer.length = 0;
    return commands;
  }

  get pending(): number {
    return this.buffer.length;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/command-queue.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Run lint**

Run: `npx eslint src/command-queue.ts tests/command-queue.test.ts`
Expected: Clean, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/command-queue.ts tests/command-queue.test.ts
git commit -m "feat: add CommandQueue typed buffer with push, drain, pending"
```

---

## Task 2: World — add TCommandMap generic and System type update

**Files:**
- Modify: `src/world.ts:1-10` (imports, System type, class declaration)

- [ ] **Step 1: Update World class and System type to accept TCommandMap**

In `src/world.ts`, update the `System` type and `World` class to accept a second generic parameter:

```typescript
export type System<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> = (world: World<TEventMap, TCommandMap>) => void;

export class World<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
```

Update the `systems` field type:

```typescript
private systems: System<TEventMap, TCommandMap>[] = [];
```

Update `registerSystem` parameter type:

```typescript
registerSystem(system: System<TEventMap, TCommandMap>): void {
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `npx vitest run`
Expected: All 63 tests PASS (59 existing + 4 from Task 1). The default `Record<string, never>` preserves backward compatibility.

- [ ] **Step 3: Run lint and typecheck**

Run: `npx eslint src/world.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add src/world.ts
git commit -m "refactor: add TCommandMap generic to World and System types"
```

---

## Task 3: World — submit with validation

**Files:**
- Modify: `src/world.ts` (add import, private fields, submit, registerValidator)
- Modify: `tests/world.test.ts` (add command submit tests)

- [ ] **Step 1: Write failing tests for submit and validation**

Append to the `describe('World', ...)` block in `tests/world.test.ts`:

```typescript
  it('submit with no validators queues and returns true', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerHandler('move', () => {});
    const result = world.submit('move', { x: 1, y: 2 });
    expect(result).toBe(true);
  });

  it('submit with passing validator queues and returns true', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', (data) => data.x >= 0 && data.y >= 0);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: 1, y: 2 })).toBe(true);
  });

  it('submit with failing validator rejects and returns false', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', (data) => data.x >= 0 && data.y >= 0);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: -1, y: 2 })).toBe(false);
  });

  it('all validators must pass for submit to accept', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', () => true);
    world.registerValidator('move', () => false);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: 1, y: 2 })).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/world.test.ts`
Expected: FAIL — `world.submit` is not a function.

- [ ] **Step 3: Implement submit and registerValidator on World**

Add import at top of `src/world.ts`:

```typescript
import { CommandQueue } from './command-queue.js';
```

Add private fields to the `World` class:

```typescript
private commandQueue = new CommandQueue<TCommandMap>();
private validators = new Map<
  keyof TCommandMap,
  Array<(data: never, world: World<TEventMap, TCommandMap>) => boolean>
>();
private handlers = new Map<
  keyof TCommandMap,
  (data: never, world: World<TEventMap, TCommandMap>) => void
>();
```

Add `submit` method:

```typescript
submit<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): boolean {
  const fns = this.validators.get(type);
  if (fns) {
    for (const fn of fns) {
      if (!(fn as (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => boolean)(data, this)) {
        return false;
      }
    }
  }
  this.commandQueue.push(type, data);
  return true;
}
```

Add `registerValidator` method:

```typescript
registerValidator<K extends keyof TCommandMap>(
  type: K,
  fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => boolean,
): void {
  let fns = this.validators.get(type);
  if (!fns) {
    fns = [];
    this.validators.set(type, fns);
  }
  fns.push(fn as (data: never, world: World<TEventMap, TCommandMap>) => boolean);
}
```

Add `registerHandler` method:

```typescript
registerHandler<K extends keyof TCommandMap>(
  type: K,
  fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => void,
): void {
  if (this.handlers.has(type)) {
    throw new Error(`Handler already registered for command '${String(type)}'`);
  }
  this.handlers.set(
    type,
    fn as (data: never, world: World<TEventMap, TCommandMap>) => void,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (59 existing + 4 new = 63).

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/world.ts tests/world.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 6: Commit**

```bash
git add src/world.ts tests/world.test.ts
git commit -m "feat: add submit and registerValidator to World"
```

---

## Task 4: World — command handler registration and processing

**Files:**
- Modify: `src/world.ts` (add processCommands, wire into executeTick)
- Modify: `tests/world.test.ts` (add handler tests)

- [ ] **Step 1: Write failing tests for handler execution**

Append to the `describe('World', ...)` block in `tests/world.test.ts`:

```typescript
  it('handler runs on step and receives correct data', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const received: Array<{ x: number; y: number }> = [];
    world.registerHandler('move', (data) => received.push(data));
    world.submit('move', { x: 3, y: 4 });
    world.step();
    expect(received).toEqual([{ x: 3, y: 4 }]);
  });

  it('handler can emit events and modify components', () => {
    type Events = { moved: { entityId: number } };
    type Cmds = { move: { entityId: number; x: number; y: number } };
    const world = new World<Events, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 0, y: 0 });

    world.registerHandler('move', (data, w) => {
      const pos = w.getComponent<{ x: number; y: number }>(
        data.entityId,
        'position',
      )!;
      pos.x = data.x;
      pos.y = data.y;
      w.emit('moved', { entityId: data.entityId });
    });

    world.submit('move', { entityId: id, x: 5, y: 5 });
    world.step();

    expect(world.getComponent(id, 'position')).toEqual({ x: 5, y: 5 });
    expect(world.getEvents()).toEqual([
      { type: 'moved', data: { entityId: id } },
    ]);
  });

  it('throws when registering duplicate handler', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerHandler('move', () => {});
    expect(() => world.registerHandler('move', () => {})).toThrow(
      "Handler already registered for command 'move'",
    );
  });

  it('throws when no handler registered at drain time', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.submit('move', { x: 1 });
    expect(() => world.step()).toThrow(
      "No handler registered for command 'move'",
    );
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/world.test.ts`
Expected: FAIL — handler tests fail because `processCommands` is not wired into `executeTick` yet.

- [ ] **Step 3: Add processCommands and wire into executeTick**

Add `processCommands` private method to `World`:

```typescript
private processCommands(): void {
  const commands = this.commandQueue.drain();
  for (const command of commands) {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(
        `No handler registered for command '${String(command.type)}'`,
      );
    }
    handler(command.data as never, this);
  }
}
```

Update `executeTick` to call `processCommands` between `eventBus.clear()` and `syncSpatialIndex()`:

```typescript
private executeTick(): void {
  this.eventBus.clear();
  this.processCommands();
  this.syncSpatialIndex();
  for (const system of this.systems) {
    system(this);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (67 + 4 = 71).

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/world.ts tests/world.test.ts`
Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 6: Commit**

```bash
git add src/world.ts tests/world.test.ts
git commit -m "feat: add command handler registration and tick-start processing"
```

---

## Task 5: World — tick-boundary and spatial sync ordering tests

**Files:**
- Modify: `tests/world.test.ts` (add tick-boundary and ordering tests)

- [ ] **Step 1: Write tests for tick boundary and spatial sync ordering**

Append to the `describe('World', ...)` block in `tests/world.test.ts`:

```typescript
  it('commands submitted by a system during tick are processed next tick', () => {
    type Cmds = { ping: { n: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const handled: number[] = [];
    world.registerHandler('ping', (data) => handled.push(data.n));

    // System submits a command during its tick
    world.registerSystem((w) => {
      if (w.tick === 0) {
        w.submit('ping', { n: 42 });
      }
    });

    world.step(); // tick 0: system submits, but drain already happened
    expect(handled).toEqual([]);

    world.step(); // tick 1: command from previous tick is processed
    expect(handled).toEqual([42]);
  });

  it('commands drain before spatial sync so handler position changes appear in grid', () => {
    type Cmds = { spawn: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerComponent<{ x: number; y: number }>('position');

    let spawnedId: number | undefined;
    world.registerHandler('spawn', (data, w) => {
      spawnedId = w.createEntity();
      w.addComponent(spawnedId, 'position', { x: data.x, y: data.y });
    });

    // System checks grid — entity should be there because spatial sync
    // runs after processCommands
    let foundInGrid = false;
    world.registerSystem((w) => {
      if (spawnedId !== undefined) {
        const cell = w.grid.getAt(3, 4);
        foundInGrid = cell !== null && cell.has(spawnedId);
      }
    });

    world.submit('spawn', { x: 3, y: 4 });
    world.step();

    expect(spawnedId).toBeDefined();
    expect(foundInGrid).toBe(true);
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS (71 + 2 = 73).

- [ ] **Step 3: Run lint**

Run: `npx eslint tests/world.test.ts`
Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add tests/world.test.ts
git commit -m "test: add tick-boundary and spatial sync ordering tests for commands"
```

---

## Task 6: Update architecture and roadmap docs

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Update ARCHITECTURE.md**

Add CommandQueue row to the Component Map table (after the EventBus row):

```markdown
| CommandQueue | `src/command-queue.ts` | Typed command buffer, push/drain interface |
```

Update the Data Flow section to show the new tick flow:

```
World.step()
  -> GameLoop.step()
    -> World.executeTick()
      -> World.eventBus.clear()    [reset buffer from previous tick]
      -> World.processCommands()   [drain queue, run handlers]
      -> World.syncSpatialIndex()  [sync grid with Position components]
      -> System A(world)           [user systems in registration order]
      -> System B(world)
      -> ...
    -> tick++
```

Add to Boundaries section:

```markdown
- **CommandQueue** is owned by World. External code submits commands via `world.submit()`, registers validators via `world.registerValidator()`, and registers handlers via `world.registerHandler()`. Do not access the queue directly.
```

Add drift log entry:

```markdown
| 2026-04-05 | Added CommandQueue as World subsystem | Input command layer for player command validation and processing |
```

- [ ] **Step 2: Update ROADMAP.md**

Move "Input command layer" from Planned to Built:

Add row to the Built table:

```markdown
| Input command layer | `command-queue.ts` | 2026-04-05 | Typed buffer, validators, handlers, tick-start processing |
```

Remove the "Input command layer" row from the "Planned — Engine Core" table.

- [ ] **Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md docs/ROADMAP.md
git commit -m "docs: update architecture and roadmap for input command layer"
```

---

## Task 7: Update devlogs

**Files:**
- Modify: `docs/devlog-detailed.md`
- Modify: `docs/devlog-summary.md`

- [ ] **Step 1: Append entry to devlog-detailed.md**

```markdown
## [2026-04-05 HH:MM, UTC] — Input command layer

**Action:** Implemented CommandQueue module and World integration for typed command submission, validation, and tick-start processing.
**Result:** Success — CommandQueue with push/drain/pending; World gains submit/registerValidator/registerHandler/processCommands; commands drain between event clear and spatial sync.
**Files changed:** src/command-queue.ts (new), src/world.ts (modified), tests/command-queue.test.ts (new), tests/world.test.ts (modified), docs/ARCHITECTURE.md, docs/ROADMAP.md
**Reasoning:** Input command layer was highest remaining priority on roadmap. Standalone buffer + World orchestration keeps separation clean and follows EventBus pattern.
**Notes:** Commands submitted during a tick queue for next tick. One handler per command type. Validators are optional, multiple allowed.
```

- [ ] **Step 2: Append entry to devlog-summary.md**

```markdown
- 2026-04-05: Input command layer complete — CommandQueue typed buffer with push/drain/pending; World gains submit/registerValidator/registerHandler; commands processed at tick start before spatial sync; 10 new tests, all pass, lint and typecheck clean.
```

- [ ] **Step 3: Commit**

```bash
git add docs/devlog-detailed.md docs/devlog-summary.md
git commit -m "docs: update devlogs for input command layer"
```
