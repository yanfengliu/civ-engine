# Resources Guide

This guide covers the resource system: pools, production, consumption, transfers, and integration with diffs and serialization.

## Table of Contents

1. [Overview](#overview)
2. [Resource Pools](#resource-pools)
3. [Production and Consumption](#production-and-consumption)
4. [Transfers](#transfers)
5. [Processing Order](#processing-order)
6. [Diff Integration](#diff-integration)
7. [Cleanup on Entity Destruction](#cleanup-on-entity-destruction)
8. [Patterns](#patterns)

---

## Overview

Resources are numeric pools attached to entities. Each pool has a `current` value and a `max` capacity. The resource system provides:

- **Pools** — `current`/`max` values per entity per resource type
- **Production** — automatic per-tick increase
- **Consumption** — automatic per-tick decrease
- **Transfers** — automatic per-tick movement between entities

Resources are processed after systems each tick, so system logic can add/remove resources manually and the automated rates apply on top.

## Resource Pools

### Registration

Register resource types before using them:

```typescript
world.registerResource('food');                          // max = Infinity
world.registerResource('gold', { defaultMax: 1000 });    // max = 1000
world.registerResource('mana', { defaultMax: 100 });     // max = 100
```

The `defaultMax` applies to all new pools created for this resource type.

### Adding resources

`addResource` creates a pool if one doesn't exist, then adds the amount (clamped to max):

```typescript
const city = world.createEntity();

// First add creates the pool
const added = world.addResource(city, 'food', 50);
// Pool: { current: 50, max: Infinity }
// added = 50

// Subsequent adds accumulate
world.addResource(city, 'gold', 800);
world.addResource(city, 'gold', 500);
// Pool: { current: 1000, max: 1000 } — clamped to max
// second addResource returned 200 (only 200 space was available)
```

### Removing resources

`removeResource` subtracts from the pool (cannot go below 0):

```typescript
const removed = world.removeResource(city, 'food', 30);
// removed = 30 (or less if pool had < 30)
```

### Reading pools

`getResource` returns a copy (not a reference):

```typescript
const pool = world.getResource(city, 'food');
if (pool) {
  console.log(`${pool.current}/${pool.max}`);
}
// Returns undefined if no pool exists for this entity/resource
```

### Adjusting max

```typescript
world.setResourceMax(city, 'gold', 2000);  // increase capacity
world.setResourceMax(city, 'gold', 500);   // decrease — current clamped to 500
```

### Listing entities

```typescript
for (const id of world.getResourceEntities('food')) {
  const pool = world.getResource(id, 'food')!;
  console.log(`Entity ${id}: ${pool.current} food`);
}
```

## Production and Consumption

### Production

Production adds to a pool each tick, clamped to max:

```typescript
world.setProduction(farm, 'food', 5);  // +5 food/tick
```

Setting production auto-creates a pool if one doesn't exist:

```typescript
const mine = world.createEntity();
world.setProduction(mine, 'gold', 3);
// Pool auto-created: { current: 0, max: 1000 }
// (uses defaultMax from resource registration)
```

Set to `0` to remove:

```typescript
world.setProduction(farm, 'food', 0);  // stop producing
```

### Consumption

Consumption subtracts from a pool each tick, clamped to 0:

```typescript
world.setConsumption(city, 'food', 2);  // -2 food/tick
```

Consumption does **not** auto-create a pool. If the entity has no pool, consumption has no effect.

```typescript
world.setConsumption(city, 'food', 0);  // stop consuming
```

### Reading rates

```typescript
world.getProduction(farm, 'food');   // 5
world.getConsumption(city, 'food');  // 2
```

### Net rate

The engine doesn't track net rates explicitly. Calculate them yourself:

```typescript
const net = world.getProduction(city, 'food') - world.getConsumption(city, 'food');
// positive = growing, negative = shrinking
```

## Transfers

Transfers move resources between entities each tick. They are clamped by both the source's available amount and the destination's remaining capacity.

### Creating transfers

```typescript
const transferId = world.addTransfer(farm, city, 'food', 3);
// Each tick: move up to 3 food from farm to city
```

Returns a unique ID for later removal.

### Removing transfers

```typescript
world.removeTransfer(transferId);
```

### Querying transfers

```typescript
const transfers = world.getTransfers(city);
// Returns all transfers where city is source OR destination
for (const t of transfers) {
  console.log(`${t.from} → ${t.to}: ${t.rate} ${t.resource}/tick`);
}
```

### Automatic cleanup

Transfers involving dead entities are automatically removed during tick processing. You don't need to clean them up manually when destroying entities.

## Processing Order

Resources are processed in this order each tick, **after** all systems have run:

1. **Production** — for each resource type, add production rates to pools
2. **Consumption** — for each resource type, subtract consumption rates from pools
3. **Transfers** — for each transfer, move resources from source to destination
4. **Dead transfer cleanup** — remove transfers involving dead entities

This means:
- A system can manually add resources, and production still fires on top
- Production happens before consumption, so a pool can produce and consume in the same tick
- Transfers happen after production and consumption

## Diff Integration

Resource changes appear in the `TickDiff.resources` field:

```typescript
world.onDiff((diff) => {
  for (const [key, changes] of Object.entries(diff.resources)) {
    for (const [entityId, pool] of changes.set) {
      console.log(`Resource '${key}' on entity ${entityId}: ${pool.current}/${pool.max}`);
    }
    for (const entityId of changes.removed) {
      console.log(`Resource '${key}' removed from entity ${entityId}`);
    }
  }
});
```

Only resource types that actually changed appear in the diff. Changes include both manual modifications (from systems/handlers) and automatic processing (production, consumption, transfers).

## Cleanup on Entity Destruction

When `destroyEntity()` is called:

- All resource pools for the entity are removed
- All production and consumption rates for the entity are removed
- All transfers involving the entity (as source or destination) are removed

This happens automatically. You don't need to clean up resources manually.

## Patterns

### Economy with supply chains

```typescript
// Register resources
world.registerResource('ore');
world.registerResource('iron', { defaultMax: 200 });
world.registerResource('weapons', { defaultMax: 50 });

// Mine produces ore
world.setProduction(mine, 'ore', 5);

// Smelter converts ore to iron (via transfers + consumption)
world.addTransfer(mine, smelter, 'ore', 3);
world.setConsumption(smelter, 'ore', 3);
world.setProduction(smelter, 'iron', 2);

// Forge converts iron to weapons
world.addTransfer(smelter, forge, 'iron', 2);
world.setConsumption(forge, 'iron', 2);
world.setProduction(forge, 'weapons', 1);
```

### Population food consumption

```typescript
function populationSystem(w: World): void {
  for (const id of w.query('settlement')) {
    const pop = w.getComponent<{ count: number }>(id, 'population')!;
    // Each person consumes 0.1 food per tick
    w.setConsumption(id, 'food', pop.count * 0.1);
    
    // Check starvation
    const pool = w.getResource(id, 'food');
    if (pool && pool.current <= 0) {
      pop.count = Math.max(0, pop.count - 1);
      w.emit('starvation', { entityId: id });
    }
  }
}
```

### Resource capacity upgrades

```typescript
world.registerHandler('upgradeStorage', (data, w) => {
  const current = w.getResource(data.entityId, data.resource);
  if (current) {
    w.setResourceMax(data.entityId, data.resource, current.max + 100);
  }
});
```
