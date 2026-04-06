# State Diff Output — Design Spec

## Overview

Emit minimal per-tick change sets for client consumption. Uses dirty-flag tracking: ComponentStore and EntityManager self-report mutations during a tick. At tick end, World collects dirty state into a `TickDiff` object. Clients access diffs via pull (`getDiff()`) or push (`onDiff(fn)`) API.

## Diff Shape

```typescript
interface TickDiff {
  tick: number;
  entities: {
    created: EntityId[];
    destroyed: EntityId[];
  };
  components: Record<string, {
    set: Array<[EntityId, unknown]>;
    removed: EntityId[];
  }>;
}
```

- `tick` — which tick this diff describes.
- `entities.created` / `entities.destroyed` — entity lifecycle events this tick.
- `components[key].set` — entities whose component was added or mutated, with current data.
- `components[key].removed` — entities whose component was removed.

A tick with no changes produces `{ tick, entities: { created: [], destroyed: [] }, components: {} }`.

## Dirty Tracking — ComponentStore

ComponentStore gains two private sets and two methods:

```typescript
// New private fields
private dirtySet = new Set<EntityId>();
private removedSet = new Set<EntityId>();

// Modified existing methods
set(entityId, component)   // existing logic + this.dirtySet.add(entityId)
remove(entityId)           // existing logic + this.dirtySet.delete(entityId); this.removedSet.add(entityId)

// New methods
getDirty(): { set: Array<[EntityId, T]>; removed: EntityId[] }
clearDirty(): void
```

- `set()` adds entityId to `dirtySet`.
- `remove()` adds entityId to `removedSet` and deletes from `dirtySet` (if present).
- `getDirty()` returns set entries with current data, and removed IDs.
- `clearDirty()` clears both sets.

## Dirty Tracking — EntityManager

EntityManager gains two private arrays and two methods:

```typescript
// New private fields
private createdThisTick: EntityId[] = [];
private destroyedThisTick: EntityId[] = [];

// Modified existing methods
create()    // existing logic + this.createdThisTick.push(id)
destroy(id) // existing logic + this.destroyedThisTick.push(id)

// New methods
getDirty(): { created: EntityId[]; destroyed: EntityId[] }
clearDirty(): void
```

## World Integration

### Tick Flow

```
executeTick()
  -> eventBus.clear()
  -> entityManager.clearDirty()
  -> clearComponentDirty()       [all stores]
  -> processCommands()
  -> syncSpatialIndex()
  -> system A(world)
  -> system B(world)
  -> buildDiff()                 [collect dirty state into currentDiff]
  -> notify onDiff listeners
```

Dirty state is cleared at tick start. Systems accumulate dirty flags. After all systems run, `buildDiff()` reads dirty state and stores a `TickDiff`. Push listeners are then notified.

### Public API

```typescript
// Pull — returns diff from most recent tick, or null if no tick has run
getDiff(): TickDiff | null

// Push — register/unregister a per-tick diff callback
onDiff(fn: (diff: TickDiff) => void): void
offDiff(fn: (diff: TickDiff) => void): void
```

### Private Methods

```typescript
// Clear dirty state on all component stores
private clearComponentDirty(): void

// Collect dirty state into TickDiff
private buildDiff(): void
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No mutations in a tick | getDiff() returns diff with empty arrays/objects |
| Entity created and destroyed in same tick | Appears in both created and destroyed |
| Component set then removed in same tick | Appears only in removed (remove clears dirtySet) |
| Component set multiple times in same tick | Appears once in set with final value |
| getDiff() before any tick | Returns null |
| getDiff() called multiple times between ticks | Returns the same diff object |
| Command handler mutations | Tracked — dirty tracking starts before processCommands |

## Testing Plan

### ComponentStore dirty tracking (added to `tests/component-store.test.ts`)

- set() marks entity as dirty
- remove() marks entity as removed and clears from dirty
- clearDirty() resets both sets
- getDirty() returns set entries with data and removed IDs

### EntityManager dirty tracking (added to `tests/entity-manager.test.ts`)

- create() tracks created entities
- destroy() tracks destroyed entities
- clearDirty() resets both

### World diff integration (new `tests/diff.test.ts`)

- getDiff() returns null before any tick
- getDiff() returns component set/removed changes after step
- getDiff() returns entity created/destroyed
- Empty tick produces empty diff
- Entity created and destroyed in same tick appears in both
- Component set then removed in same tick appears only in removed
- onDiff callback fires each tick with correct diff
- offDiff removes the callback
- Command handler mutations appear in diff

## Files Changed

| File | Change |
|------|--------|
| `src/diff.ts` | New — TickDiff type export |
| `src/component-store.ts` | Add dirtySet, removedSet, getDirty(), clearDirty(); modify set(), remove() |
| `src/entity-manager.ts` | Add createdThisTick, destroyedThisTick, getDirty(), clearDirty(); modify create(), destroy() |
| `src/world.ts` | Add getDiff(), onDiff(), offDiff(), buildDiff(), clearComponentDirty(); update executeTick() |
| `tests/component-store.test.ts` | Add dirty tracking tests |
| `tests/entity-manager.test.ts` | Add dirty tracking tests |
| `tests/diff.test.ts` | New — integration tests |
| `docs/ARCHITECTURE.md` | Add Diff to component map, update tick flow, boundaries, drift log |
| `docs/ROADMAP.md` | Move "State diff output" to Built |
