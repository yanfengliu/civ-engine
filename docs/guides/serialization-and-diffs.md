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
  version: 5;                    // format version (current write format)
  config: WorldConfig;           // grid dimensions, TPS, positionKey, seed, sync options,
                                 //   plus maxTicksPerFrame and instrumentationProfile when non-default
  tick: number;                  // current tick count
  entities: {
    generations: number[];       // per-slot generation counters
    alive: boolean[];            // per-slot alive flags
    freeList: number[];          // available IDs for recycling
  };
  components: Record<string, Array<[EntityId, unknown]>>;
  // e.g., { position: [[0, {x:5,y:3}], [1, {x:2,y:7}]], health: [[0, {hp:100}]] }
  componentOptions?: Record<string, ComponentStoreOptions>;
  // per-component diffMode; survives save/load
  resources: ResourceStoreState; // registrations, pools, rates, transfers
  rng: RandomState;              // deterministic RNG state
  state: Record<string, unknown>;
  tags: Record<number, string[]>;
  metadata: Record<number, Record<string, string | number>>;
}
```

`World.deserialize()` accepts versions 1–5. Older snapshots without `componentOptions` deserialize each component store with default options (strict mode). Both `serialize()` and `deserialize()` `structuredClone` component data and state values, so mutating a snapshot object cannot write through to live engine state.

Pre-0.5.0 snapshots may include `config.detectInPlacePositionMutations` and `componentOptions[*].detectInPlaceMutations`; both fields are silently ignored on read in 0.5.0+ since in-place mutation auto-detection has been removed.

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

- Throws if `version` is not `1`, `2`, `3`, `4`, or `5`
- Throws if entity state arrays have mismatched lengths
- Throws if `tags` or `metadata` reference a dead entity id

Version 5 (the current write format) round-trips per-component `ComponentStoreOptions.diffMode` plus `WorldConfig.maxTicksPerFrame` and `WorldConfig.instrumentationProfile` when non-default. Version 4 added world-level state, entity tags, and entity metadata. Version 3 added deterministic RNG state so restored worlds resume the same random sequence. Version 2 added resource registrations, pools, rates, transfers, and the next transfer ID. Version 1 snapshots still load for backward compatibility, but they restore with an empty resource store.

## What's Included and Excluded

### Included (serialized as data)

| Data | Stored in |
|---|---|
| Grid config (width, height, TPS) | `snapshot.config` |
| Position key | `snapshot.config.positionKey` |
| Seed config | `snapshot.config.seed` |
| maxTicksPerFrame (when non-default) | `snapshot.config.maxTicksPerFrame` |
| instrumentationProfile (when non-default) | `snapshot.config.instrumentationProfile` |
| Tick count | `snapshot.tick` |
| Entity IDs, alive states, generations | `snapshot.entities` |
| All component data | `snapshot.components` |
| Per-component options (diffMode) | `snapshot.componentOptions` |
| Resource registrations, pools, rates, transfers | `snapshot.resources` |
| Deterministic RNG state | `snapshot.rng` |
| World-level state (setState/getState) | `snapshot.state` |
| Entity tags | `snapshot.tags` |
| Entity metadata | `snapshot.metadata` |

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
- World-level state changes (`setState` / `removeState`)
- Entity tag additions and removals
- Entity metadata additions and removals

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

`getDiff()` returns `null` before the first tick. The returned object is a JSON deep-clone — mutating it does not write through to the live engine. Callers can safely cache diffs across ticks without worrying about the engine overwriting them.

Inside an `onDiff` listener `world.tick === diff.tick`. Use whichever you prefer for correlation; they always agree.

`world.getEvents()` returns the same defensive shape (deep-cloned event payloads).

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
  state: Record<string, { set?: unknown; removed?: true }>;  // world-level state changes
  tags: Record<string, { added: EntityId[]; removed: EntityId[] }>;  // tag changes
  metadata: Record<string, { set: Array<[EntityId, string | number]>; removed: EntityId[] }>;  // metadata changes
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

## Filtering blind rewrites with semantic diffMode

By default, every `addComponent` / `setComponent` call marks the entity dirty, even if the new value is identical to the prior value. For components whose sync systems rewrite unchanged values every tick (e.g. `position` or `transform` from a render-side sync) this pollutes `TickDiff` and masks real liveness signals.

Opt in to semantic dirty-marking per component at registration:

```typescript
world.registerComponent<Transform>('transform', { diffMode: 'semantic' });
```

In semantic mode, `set()` fingerprints the new value and skips the dirty flag when it matches the baseline captured at the last tick. As of v0.5.0, in-place mutation of `getComponent`-returned objects is **not** detected in either mode — every component change must go through `setComponent` / `addComponent` / `patchComponent` (or `setPosition` for the configured position key).

`diffMode: 'strict'` (the default) preserves the per-write audit semantics that serialization consumers may depend on. Choose semantic only for components where the "identical rewrite" case is load-bearing noise.

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
