# Resource System — Design Spec

## Overview

A dedicated resource subsystem for production, storage, consumption, and automatic transfers (supply lines) between entities. Resource types are registered upfront (like components). A built-in system processes rates and transfers each tick after user systems run. One-off adjustments are supported via manual add/remove API.

## Resource Registry

Resource types must be registered before use via `world.registerResource(key, options?)`.

```typescript
registerResource(key: string, options?: { defaultMax?: number }): void
```

- `key` — unique string identifier (e.g., `'food'`, `'gold'`).
- `options.defaultMax` — default max capacity for new pools. Omit for unlimited (`Infinity`).
- Throws if the key is already registered.

## Resource Pools

Each entity can hold any registered resource. Per-entity storage is a pool:

```typescript
interface ResourcePool {
  current: number;
  max: number; // Infinity if no cap
}
```

### Pool API (on World)

```typescript
addResource(entity: EntityId, key: string, amount: number): number
removeResource(entity: EntityId, key: string, amount: number): number
getResource(entity: EntityId, key: string): ResourcePool | undefined
setResourceMax(entity: EntityId, key: string, max: number): void
getResourceEntities(key: string): IterableIterator<EntityId>
```

- `addResource` — adds amount to pool, capped by max. Returns actual amount added. Auto-creates pool on first add (using `defaultMax` from registration).
- `removeResource` — removes amount from pool, capped by 0 (no negatives). Returns actual amount removed.
- `getResource` — returns the pool, or undefined if entity has no pool for this resource.
- `setResourceMax` — updates the max capacity. If new max is below current, current is clamped down.
- `getResourceEntities` — yields all entity IDs that have a pool for this resource.

All pool methods throw if the resource key is not registered.

## Production & Consumption Rates

Entities can have per-resource production and consumption rates processed automatically each tick.

```typescript
setProduction(entity: EntityId, key: string, rate: number): void
setConsumption(entity: EntityId, key: string, rate: number): void
getProduction(entity: EntityId, key: string): number
getConsumption(entity: EntityId, key: string): number
```

- `setProduction` / `setConsumption` — set the per-tick rate. Setting to 0 disables.
- `getProduction` / `getConsumption` — returns 0 if not set.
- Setting a production rate auto-creates the pool if it doesn't exist.
- All rate methods throw if the resource key is not registered.

## Transfers (Supply Lines)

A transfer is a per-tick automatic flow from one entity to another for a specific resource.

```typescript
interface Transfer {
  id: number;
  from: EntityId;
  to: EntityId;
  resource: string;
  rate: number;
}
```

### Transfer API (on World)

```typescript
addTransfer(from: EntityId, to: EntityId, resource: string, rate: number): number
removeTransfer(id: number): void
getTransfers(entity: EntityId): Transfer[]
```

- `addTransfer` — creates a transfer rule. Returns auto-assigned transfer ID.
- `removeTransfer` — removes a transfer by ID.
- `getTransfers` — returns all transfers involving the entity (as source or target).
- `addTransfer` throws if the resource key is not registered.

### Transfer Processing

- Remove `rate` from source, add actual removed amount to target.
- If source has less than `rate`, target gets only what was available (partial transfer).
- If target is full, only transfer what target can accept; excess stays in source.
- If either entity is dead, the transfer is auto-cleaned on that tick.
- Transfers are processed in registration order. Multiple transfers from the same source compete naturally (first-registered gets priority).

## Built-in Resource System

The resource system runs as the **last step before buildDiff** in `executeTick`, after all user systems:

```
executeTick()
  -> eventBus.clear()
  -> entityManager.clearDirty()
  -> clearComponentDirty()
  -> resourceStore.clearDirty()
  -> processCommands()
  -> syncSpatialIndex()
  -> System A(world)
  -> System B(world)
  -> resourceStore.processTick()       [production, consumption, transfers]
  -> buildDiff()
  -> notify onDiff listeners
```

### processTick Order

1. **Production** — for each entity with a production rate, add rate to pool (capped by max).
2. **Consumption** — for each entity with a consumption rate, remove rate from pool (capped by 0).
3. **Transfers** — for each transfer, move resources from source to target (partial if insufficient/full).

Production before consumption ensures an entity producing and consuming at equal rates stays stable.

## Entity Destruction Cleanup

When `world.destroyEntity(id)` is called, ResourceStore removes:
- All pools for the entity
- All production/consumption rates for the entity
- All transfers where the entity is source or target

## Diff Integration

TickDiff gains a `resources` field:

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
  resources: Record<string, {
    set: Array<[EntityId, ResourcePool]>;
    removed: EntityId[];
  }>;
}
```

ResourceStore uses dirty tracking (same pattern as ComponentStore): `dirtySet` and `removedSet` per resource key, cleared at tick start, read by `buildDiff()`.

A tick with no resource changes produces `resources: {}`.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| addResource to unregistered key | Throws |
| addResource exceeds max | Adds up to max, returns actual added |
| removeResource exceeds current | Removes down to 0, returns actual removed |
| addResource auto-creates pool | Pool created with `{ current: amount (capped), max: defaultMax }` |
| setProduction auto-creates pool | Pool created with `{ current: 0, max: defaultMax }` |
| setResourceMax below current | current clamped to new max |
| Transfer with insufficient source | Partial transfer (actual available) |
| Transfer with full target | Only transfers what target can accept |
| Transfer with dead entity | Transfer auto-removed during processTick |
| Entity destroyed mid-tick | Pools, rates, transfers cleaned immediately |
| Multiple transfers from same source | Processed in registration order, compete for available amount |
| Rate of 0 | Treated as no-op, skipped during processTick |

## ResourceStore Internal Structure

```typescript
class ResourceStore {
  private registeredKeys = new Map<string, { defaultMax: number }>();
  private pools = new Map<string, Map<EntityId, ResourcePool>>();
  private production = new Map<string, Map<EntityId, number>>();
  private consumption = new Map<string, Map<EntityId, number>>();
  private transfers: Transfer[] = [];
  private nextTransferId = 0;

  // Dirty tracking (per resource key)
  private dirtyPools = new Map<string, Set<EntityId>>();
  private removedPools = new Map<string, Set<EntityId>>();
}
```

### Public Methods

```typescript
register(key: string, options?: { defaultMax?: number }): void
addResource(entityId: EntityId, key: string, amount: number): number
removeResource(entityId: EntityId, key: string, amount: number): number
getResource(entityId: EntityId, key: string): ResourcePool | undefined
setResourceMax(entityId: EntityId, key: string, max: number): void
getResourceEntities(key: string): IterableIterator<EntityId>
setProduction(entityId: EntityId, key: string, rate: number): void
setConsumption(entityId: EntityId, key: string, rate: number): void
getProduction(entityId: EntityId, key: string): number
getConsumption(entityId: EntityId, key: string): number
addTransfer(from: EntityId, to: EntityId, resource: string, rate: number): number
removeTransfer(id: number): void
getTransfers(entityId: EntityId): Transfer[]
processTick(isAlive: (id: EntityId) => boolean): void
removeEntity(entityId: EntityId): void
getDirty(): Record<string, { set: Array<[EntityId, ResourcePool]>; removed: EntityId[] }>
clearDirty(): void
```

`processTick` receives an `isAlive` callback so it can check entity liveness without depending on World/EntityManager directly.

## Testing Plan

### ResourceStore unit tests (`tests/resource-store.test.ts`)

- register creates a new resource type
- register throws on duplicate key
- addResource creates pool and returns amount added
- addResource caps at max
- removeResource returns actual amount removed
- removeResource caps at 0
- getResource returns undefined for missing pool
- setResourceMax clamps current when lowered
- getResourceEntities yields entities with pools
- setProduction / getProduction round-trip
- setConsumption / getConsumption round-trip
- setProduction auto-creates pool
- processTick applies production then consumption
- processTick processes transfers
- processTick partial transfer when source insufficient
- processTick caps transfer at target max
- processTick removes transfers with dead entities
- removeEntity cleans up pools, rates, and transfers
- getDirty / clearDirty tracks pool mutations

### World integration tests (`tests/resource.test.ts`)

- world.registerResource and addResource/getResource round-trip
- Resource rates processed after user systems
- addResource/removeResource return clamped values
- destroyEntity cleans up resource state
- Resource changes appear in TickDiff
- Transfer between two entities via world API
- Command handler can modify resources and changes appear in diff

## Files Changed

| File | Change |
|------|--------|
| `src/resource-store.ts` | New — ResourceStore class, Transfer type, ResourcePool type |
| `src/diff.ts` | Add `resources` field to TickDiff |
| `src/world.ts` | Add ResourceStore as subsystem; proxy methods; wire into executeTick, buildDiff, destroyEntity |
| `tests/resource-store.test.ts` | New — unit tests |
| `tests/resource.test.ts` | New — integration tests |
| `docs/ARCHITECTURE.md` | Add ResourceStore to component map, update tick flow, boundaries, drift log |
| `docs/ROADMAP.md` | Move "Resource system" to Built |
