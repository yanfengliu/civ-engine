# Serialization and Diffs Guide

This guide covers saving/loading world state and observing per-tick changes.

## Table of Contents

1. [Serialization Overview](#serialization-overview)
2. [Saving State](#saving-state)
3. [Loading State](#loading-state)
4. [What's Included and Excluded](#whats-included-and-excluded)
5. [Diffs Overview](#diffs-overview)
6. [Reading Diffs](#reading-diffs)
7. [Push vs. Pull](#push-vs-pull)
8. [Diff Structure](#diff-structure)
9. [Patterns](#patterns)

---

## Serialization Overview

The engine can serialize the entire world state to a JSON-compatible snapshot and restore it later. This enables:

- **Save/load** — persist game state to disk or database
- **Checkpointing** — save state periodically for rollback
- **Client sync** — send full state to new clients
- **Testing** — set up specific game states for tests

## Saving State

```typescript
const snapshot = world.serialize();
```

The snapshot is a plain JavaScript object that can be serialized to JSON:

```typescript
const json = JSON.stringify(snapshot);

// Write to file (Node.js)
import { writeFileSync } from 'fs';
writeFileSync('save.json', json);

// Store in localStorage (browser)
localStorage.setItem('save', json);
```

Components must already be JSON-compatible plain data. `serialize()` rejects non-finite numbers, functions, symbols, bigints, class instances, circular references, and `undefined` component fields instead of silently producing an invalid save.

### Snapshot structure

```typescript
interface WorldSnapshot {
  version: 3;                    // format version
  config: WorldConfig;           // grid dimensions, TPS, positionKey, seed, sync options
  tick: number;                  // current tick count
  entities: {
    generations: number[];       // per-slot generation counters
    alive: boolean[];            // per-slot alive flags
    freeList: number[];          // available IDs for recycling
  };
  components: Record<string, Array<[EntityId, unknown]>>;
  // e.g., { position: [[0, {x:5,y:3}], [1, {x:2,y:7}]], health: [[0, {hp:100}]] }
  resources: ResourceStoreState; // registrations, pools, rates, transfers
  rng: RandomState;              // deterministic RNG state
}
```

## Loading State

```typescript
const snapshot = JSON.parse(json);
const restored = World.deserialize(snapshot, [movementSystem, combatSystem]);
```

The second argument is an optional array of systems to re-register.

### Re-registration checklist

After deserializing, you must re-register everything that is a **function** (not data):

```typescript
const restored = World.deserialize(snapshot, [
  movementSystem,
  combatSystem,
  deathSystem,
]);

// Re-register command validators
restored.registerValidator('moveUnit', moveValidator);

// Re-register command handlers
restored.registerHandler('moveUnit', moveHandler);
restored.registerHandler('attackUnit', attackHandler);

// Re-register event listeners
restored.on('unitDied', deathListener);

// Re-register destroy hooks
restored.onDestroy(cleanupCallback);
```

### Validation

`World.deserialize()` validates the snapshot:

- Throws if `version` is not `1`, `2`, or `3`
- Throws if entity state arrays have mismatched lengths

Version 1 snapshots still load for backward compatibility, but they restore with an empty resource store. Version 2 snapshots include resource registrations, pools, rates, transfers, and the next transfer ID. Version 3 snapshots also include deterministic RNG state so restored worlds resume the same random sequence.

## What's Included and Excluded

### Included (serialized as data)

| Data | Stored in |
|---|---|
| Grid config (width, height, TPS) | `snapshot.config` |
| Position key | `snapshot.config.positionKey` |
| Seed config | `snapshot.config.seed` |
| Position mutation detection mode | `snapshot.config.detectInPlacePositionMutations` |
| Tick count | `snapshot.tick` |
| Entity IDs, alive states, generations | `snapshot.entities` |
| All component data | `snapshot.components` |
| Resource registrations, pools, rates, transfers | `snapshot.resources` |
| Deterministic RNG state | `snapshot.rng` |

### Excluded (must be re-registered)

| Item | Why excluded |
|---|---|
| Systems | Functions, not data |
| Command validators | Functions |
| Command handlers | Functions |
| Event listeners | Functions |
| Diff listeners | Functions |
| Destroy callbacks | Functions |

## Diffs Overview

A `TickDiff` captures every change that occurred during a single tick. This is how clients stay in sync and how observers track what happened, without scanning the entire world.

Diffs capture:
- Entity creation and destruction
- Component additions, mutations, and removals
- Resource pool changes

## Reading Diffs

### Pull (after stepping)

```typescript
world.step();
const diff = world.getDiff();
if (diff) {
  console.log(`Tick ${diff.tick}`);
  console.log(`Created: ${diff.entities.created}`);
  console.log(`Destroyed: ${diff.entities.destroyed}`);
}
```

`getDiff()` returns `null` before the first tick.

### Push (callback)

```typescript
world.onDiff((diff) => {
  // fires at the end of each tick
  sendToClient(diff);
});
```

Unsubscribe with `offDiff()`:

```typescript
const listener = (diff: TickDiff) => { /* ... */ };
world.onDiff(listener);
world.offDiff(listener);
```

## Push vs. Pull

| Approach | When to use |
|---|---|
| `getDiff()` (pull) | AI agents stepping manually, testing, single-consumer scenarios |
| `onDiff()` (push) | Client streaming, multi-consumer scenarios, real-time games |

Both return the same `TickDiff` object.

## Diff Structure

```typescript
interface TickDiff {
  tick: number;
  entities: {
    created: EntityId[];     // new entities this tick
    destroyed: EntityId[];   // destroyed entities this tick
  };
  components: Record<string, {
    set: Array<[EntityId, unknown]>;  // added or changed components
    removed: EntityId[];               // removed components
  }>;
  resources: Record<string, {
    set: Array<[EntityId, ResourcePool]>;  // added or changed pools
    removed: EntityId[];                    // removed pools
  }>;
}
```

### Reading entity changes

```typescript
world.onDiff((diff) => {
  for (const id of diff.entities.created) {
    console.log(`New entity: ${id}`);
  }
  for (const id of diff.entities.destroyed) {
    console.log(`Destroyed: ${id}`);
  }
});
```

### Reading component changes

Only component types that actually changed appear in the diff:

```typescript
world.onDiff((diff) => {
  for (const [key, changes] of Object.entries(diff.components)) {
    for (const [entityId, data] of changes.set) {
      console.log(`${key} set on entity ${entityId}:`, data);
    }
    for (const entityId of changes.removed) {
      console.log(`${key} removed from entity ${entityId}`);
    }
  }
});
```

### Reading resource changes

```typescript
world.onDiff((diff) => {
  for (const [key, changes] of Object.entries(diff.resources)) {
    for (const [entityId, pool] of changes.set) {
      console.log(`${key} on entity ${entityId}: ${pool.current}/${pool.max}`);
    }
  }
});
```

## Patterns

### Incremental client sync

Send diffs to keep clients in sync after an initial snapshot:

```typescript
// On connect: send full state
const snapshot = world.serialize();
sendToClient({ type: 'snapshot', data: snapshot });

// Each tick: send diff
world.onDiff((diff) => {
  sendToClient({ type: 'diff', data: diff });
});
```

### Change logging

```typescript
const changeLog: TickDiff[] = [];
world.onDiff((diff) => {
  changeLog.push(structuredClone(diff));
});

// Replay: inspect what happened at each tick
for (const diff of changeLog) {
  console.log(`Tick ${diff.tick}: ${diff.entities.created.length} created, ${diff.entities.destroyed.length} destroyed`);
}
```

### Selective observation

Only act on specific component changes:

```typescript
world.onDiff((diff) => {
  const healthChanges = diff.components['health'];
  if (!healthChanges) return;
  
  for (const [entityId, data] of healthChanges.set) {
    const hp = data as Health;
    if (hp.hp <= 0) {
      // entity is at death's door
    }
  }
});
```

### Testing with diffs

```typescript
it('creates an entity in the diff', () => {
  const world = new World({ gridWidth: 8, gridHeight: 8, tps: 10 });
  world.createEntity();
  world.step();

  const diff = world.getDiff()!;
  expect(diff.entities.created).toContain(0);
});
```
