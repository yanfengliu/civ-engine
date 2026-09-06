# State Serialization — Design Spec

## Overview

JSON-based state serialization for save/load and client sync. A `Serializer` module produces a plain JSON-serializable snapshot from World state. World exposes `serialize()` and static `deserialize()` as the public API. Components are stored as `[entityId, data]` pairs (no sparse gaps). The format is human-readable, debuggable, and trivially sendable over a wire.

## Snapshot Shape

```typescript
interface WorldSnapshot {
  version: 1;
  config: WorldConfig;
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
}
```

- `version` — format version for future evolution (always `1` for now).
- `config` — `{ gridWidth, gridHeight, tps }` needed to reconstruct World.
- `tick` — current tick count.
- `entities` — EntityManager's full internal state (generations, alive flags, free-list).
- `components` — each registered key maps to an array of `[entityId, data]` pairs. Only entities that have the component are included.

**Not serialized:** systems (functions), event listeners, validators, handlers, spatial grid (rebuilt from positions on first step), command queue (ephemeral), previousPositions map (rebuilt by spatial sync).

## Module: `src/serializer.ts`

Two pure functions:

```typescript
function serializeWorld(world: World): WorldSnapshot;
function deserializeWorld(snapshot: WorldSnapshot, systems?: System[]): World;
```

The serializer needs read access to World internals. This is achieved via small accessor methods on EntityManager and ComponentStore (see below).

## World Integration

### Public API

```typescript
// Instance method — capture current state
world.serialize(): WorldSnapshot

// Static factory — reconstruct from snapshot
World.deserialize(snapshot: WorldSnapshot, systems?: System[]): World
```

Both delegate to the serializer module.

### Internal Support

World exposes to the serializer (package-internal, not for user systems):

- `getConfig(): WorldConfig` — returns the config used to construct the World.
- Iteration over `componentStores` keys and stores.
- A way to restore internal state during deserialization.

`deserialize()` creates a new World with the snapshot's config, restores EntityManager state, registers all component keys from the snapshot, populates ComponentStores from the snapshot's entries, and restores the tick count. Systems are optionally re-registered. The spatial grid starts empty and syncs on the first `step()`.

## EntityManager Changes

```typescript
// New methods
getState(): { generations: number[]; alive: boolean[]; freeList: number[] }
static fromState(state: { generations: number[]; alive: boolean[]; freeList: number[] }): EntityManager
```

`getState()` returns copies of internal arrays (snapshot-safe).
`fromState()` constructs an EntityManager with the given state.

## ComponentStore Changes

```typescript
// New methods
entries(): IterableIterator<[EntityId, T]>
static fromEntries<T>(entries: Array<[EntityId, T]>): ComponentStore<T>
```

`entries()` yields `[entityId, data]` pairs for all populated slots.
`fromEntries()` constructs a ComponentStore populated with the given entries.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Version mismatch (`snapshot.version !== 1`) | Throws `"Unsupported snapshot version: X"` |
| Entity state array mismatch (`generations.length !== alive.length`) | Throws `"Invalid entity state: array length mismatch"` |
| Missing config fields | World constructor throws (no extra validation) |
| Unknown component key in snapshot | Registered and populated (snapshot determines component registry) |
| `serialize()` during tick | Safe — synchronous read of arrays, no tick executing |
| `deserialize()` with no systems | Valid — World has empty system pipeline |

## Testing Plan

### Serializer tests (`tests/serializer.test.ts`)

- Round-trip: serialize then deserialize, verify all entities and components match
- Tick count preserved across round-trip
- Dead entities and free-list preserved (create, destroy, serialize, deserialize, create — reuses recycled ID)
- Components with nested object data round-trip correctly
- Version mismatch throws with correct message
- Entity state array length mismatch throws with correct message
- Deserialized world can continue stepping (systems run, spatial grid syncs)

### EntityManager tests (added to `tests/entity-manager.test.ts`)

- `getState()` returns correct internal state
- `fromState()` round-trip preserves generations, alive, freeList

### ComponentStore tests (added to `tests/component-store.test.ts`)

- `entries()` yields only populated slots as `[id, data]` pairs
- `fromEntries()` round-trip preserves all entries

## Files Changed

| File | Change |
|------|--------|
| `src/serializer.ts` | New module — serializeWorld, deserializeWorld, WorldSnapshot type |
| `src/world.ts` | Add serialize(), static deserialize(), getConfig(), internal restore support |
| `src/entity-manager.ts` | Add getState(), static fromState() |
| `src/component-store.ts` | Add entries(), static fromEntries() |
| `tests/serializer.test.ts` | New test file |
| `tests/entity-manager.test.ts` | Add getState/fromState tests |
| `tests/component-store.test.ts` | Add entries/fromEntries tests |
| `docs/ARCHITECTURE.md` | Add Serializer to component map, update data flow, drift log |
| `docs/ROADMAP.md` | Move "State serialization" to Built |
