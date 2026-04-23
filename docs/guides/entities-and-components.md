# Entities and Components Guide

This guide covers entity lifecycle, component storage, querying, batch access, and destruction hooks in detail.

## Table of Contents

1. [Entity Lifecycle](#entity-lifecycle)
2. [Component Registration and Storage](#component-registration-and-storage)
3. [Component Access Patterns](#component-access-patterns)
4. [Querying Entities](#querying-entities)
5. [Entity Destruction](#entity-destruction)
6. [Destroy Hooks](#destroy-hooks)
7. [Common Patterns](#common-patterns)

---

## Entity Lifecycle

### Creation

Entities are numeric IDs assigned sequentially. The first entity is `0`, then `1`, then `2`, etc.

```typescript
const a = world.createEntity(); // 0
const b = world.createEntity(); // 1
const c = world.createEntity(); // 2
```

### ID recycling

When an entity is destroyed, its ID goes into a free-list. The next `createEntity()` call reuses the most recently freed ID (LIFO order). A generation counter tracks how many times each slot has been reused (used internally for change detection).

```typescript
world.destroyEntity(b); // ID 1 is freed
const d = world.createEntity(); // reuses ID 1
```

### Alive check

```typescript
world.isAlive(a);   // true
world.isAlive(b);   // false (destroyed)
world.isAlive(999); // false (never created)
```

### Generation-aware references

Entity IDs are recycled, so external clients and long-lived commands should use `EntityRef` when they need to detect stale IDs:

```typescript
const ref = world.getEntityRef(a); // { id, generation } | null
if (ref && world.isCurrent(ref)) {
  // The referenced entity is still the same lifetime.
}
```

## Component Registration and Storage

### Registration

Every component type must be registered by a string key before use. Registration creates an internal `ComponentStore` (sparse array) for that key.

```typescript
interface Health { hp: number; maxHp: number }
interface Velocity { dx: number; dy: number }

world.registerComponent<Health>('health');
world.registerComponent<Velocity>('velocity');
```

Registering the same key twice throws an error:

```typescript
world.registerComponent<Health>('health');
world.registerComponent<Health>('health'); // Error: Component 'health' is already registered
```

#### Diff mode (optional)

For components whose sync systems rewrite unchanged values every tick, pass `{ diffMode: 'semantic' }` to suppress no-op writes from `TickDiff`:

```typescript
world.registerComponent<Transform>('transform', { diffMode: 'semantic' });
```

Semantic mode fingerprints writes against a per-tick baseline and skips the dirty flag when the value is unchanged. The default `'strict'` preserves per-write dirty semantics. See `serialization-and-diffs.md` for details.

### Storage model

Components are stored in sparse arrays indexed by entity ID. This gives O(1) get/set/remove but may waste memory for components that are rarely used across a large entity range. In practice, this is efficient for typical game entity counts.

### Adding components

```typescript
world.addComponent(entity, 'health', { hp: 100, maxHp: 100 });
```

`addComponent` is retained as an alias for `setComponent`. New code can use `setComponent` for clearer write intent:

```typescript
world.setComponent(entity, 'health', { hp: 100, maxHp: 100 });
world.patchComponent<Health>(entity, 'health', (health) => {
  health.hp = 80;
});
```

Component data must be JSON-compatible plain data: objects, arrays, strings, finite numbers, booleans, and `null`. Do not store functions, class instances, `undefined`, `NaN`, `Infinity`, bigints, symbols, or circular references.

If the entity already has this component, it is **overwritten**:

```typescript
world.addComponent(entity, 'health', { hp: 100, maxHp: 100 });
world.addComponent(entity, 'health', { hp: 50, maxHp: 50 }); // replaces the previous value
```

### Removing components

```typescript
world.removeComponent(entity, 'health');
```

No-op if the entity doesn't have the component.

## Component Access Patterns

### Single component read

`getComponent` returns a **direct reference** to the stored object, not a copy. Mutations are immediate and are detected for diffs, but `setComponent` and `patchComponent` make write intent clearer and update position/grid state immediately when the key is the configured position key.

```typescript
const hp = world.getComponent<Health>(entity, 'health');
if (hp) {
  hp.hp -= 10; // mutates the stored component directly
}
```

For clearer write intent, prefer:

```typescript
world.patchComponent<Health>(entity, 'health', (hp) => {
  hp.hp -= 10;
});
```

Returns `undefined` if the entity doesn't have this component:

```typescript
const vel = world.getComponent<Velocity>(entity, 'velocity');
// vel is undefined if entity has no 'velocity' component
```

### Batch component read

When a system needs multiple components for the same entity, `getComponents` is more concise:

```typescript
const [pos, hp, vel] = world.getComponents<[Position, Health, Velocity]>(
  entity,
  ['position', 'health', 'velocity'],
);
```

Each element is `T | undefined`. This is equivalent to calling `getComponent` three times but in a single call.

### Type safety

The TypeScript generic parameter provides type safety at the call site but is not enforced at runtime. If you register a component as `Health` but add a `Velocity` object, TypeScript won't catch the mismatch at runtime:

```typescript
world.registerComponent<Health>('health');
world.addComponent(entity, 'health', { dx: 1, dy: 0 }); // TypeScript error
```

## Querying Entities

`world.query()` returns an iterator over entity IDs that have **all** specified components.

### Basic query

```typescript
for (const id of world.query('position', 'health')) {
  // id has both 'position' AND 'health'
}
```

### Collecting results

```typescript
const soldiers = [...world.query('position', 'health', 'attack')];
console.log(`${soldiers.length} soldiers alive`);
```

### Empty queries

```typescript
// No keys = no results (returns immediately)
[...world.query()]; // []
```

### Unregistered component

Querying with an unregistered component throws:

```typescript
world.query('nonexistent'); // Error: Component 'nonexistent' is not registered
```

### Performance

Queries iterate the **smallest** component store among the specified keys and check membership in the others. This means:

- A query for `('rare', 'common')` iterates the `rare` store — fast
- A query for `('common1', 'common2')` iterates whichever is smaller
- Adding a rare component to your query as an extra filter is cheap

There is no cached query result or archetype system. Each `query()` call iterates fresh. For most game sizes (thousands of entities) this is fast enough.

## Entity Destruction

`destroyEntity` performs immediate, complete cleanup:

```typescript
world.destroyEntity(entity);
```

The cleanup sequence:

1. **Destroy callbacks fire** — registered via `onDestroy()`, components are still attached
2. **Spatial grid removal** — entity is removed from the grid using its last-synced position
3. **Component removal** — all components are removed from all stores
4. **Resource cleanup** — all resource pools, rates, and transfers are removed
5. **Entity manager** — ID marked as dead, added to free-list for recycling

**Important:** `destroyEntity` is a no-op if the entity is already dead:

```typescript
world.destroyEntity(entity);
world.destroyEntity(entity); // no-op, no error
```

### Destroying during iteration

Be careful when destroying entities while iterating a query. The query iterator may become inconsistent. Collect IDs first, then destroy:

```typescript
// Safe: collect, then destroy
const dead: EntityId[] = [];
for (const id of world.query('health')) {
  const hp = world.getComponent<Health>(id, 'health')!;
  if (hp.hp <= 0) dead.push(id);
}
for (const id of dead) {
  world.destroyEntity(id);
}
```

## Destroy Hooks

`onDestroy` registers callbacks that fire when **any** entity is destroyed, **before** components are removed. This lets you clean up references, emit events, or perform other bookkeeping.

```typescript
// Log all destructions
world.onDestroy((id, w) => {
  console.log(`Entity ${id} destroyed`);
});
```

### Relationship cleanup

Destroy hooks are essential for maintaining entity relationships:

```typescript
interface Owner { ownerId: EntityId }
world.registerComponent<Owner>('owner');

// When an entity is destroyed, clean up owned entities
world.onDestroy((id, w) => {
  // Find entities owned by the destroyed entity
  for (const ownedId of w.query('owner')) {
    const owner = w.getComponent<Owner>(ownedId, 'owner')!;
    if (owner.ownerId === id) {
      w.removeComponent(ownedId, 'owner');
      // Or destroy the owned entity too:
      // w.destroyEntity(ownedId);
    }
  }
});
```

### Unregistering

```typescript
const callback = (id: EntityId, w: World) => { /* ... */ };
world.onDestroy(callback);
world.offDestroy(callback); // must pass the same function reference
```

## Common Patterns

### Tag components

Use empty objects as tags to mark entities:

```typescript
world.registerComponent<Record<string, never>>('player');
world.registerComponent<Record<string, never>>('enemy');

world.addComponent(entity, 'player', {});

// Query all enemies
for (const id of world.query('enemy', 'position')) {
  // ...
}
```

### Optional components

Check for optional components inside a system:

```typescript
function renderSystem(w: World): void {
  for (const id of w.query('position', 'sprite')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const sprite = w.getComponent<Sprite>(id, 'sprite')!;

    // Optional: check for animation
    const anim = w.getComponent<Animation>(id, 'animation');
    if (anim) {
      // animate
    }
  }
}
```

### Archetype-like grouping

Group related components for quick access:

```typescript
interface UnitBundle {
  position: Position;
  health: Health;
  movement: Movement;
}

function createUnit(w: World, pos: Position): EntityId {
  const id = w.createEntity();
  w.addComponent(id, 'position', pos);
  w.addComponent(id, 'health', { hp: 100, maxHp: 100 });
  w.addComponent(id, 'movement', { speed: 5 });
  return id;
}
```

### Component as state machine

Use a component's fields to represent state:

```typescript
interface AI {
  state: 'idle' | 'moving' | 'attacking' | 'fleeing';
  target?: EntityId;
}

world.registerComponent<AI>('ai');

function aiSystem(w: World): void {
  for (const id of w.query('ai', 'position')) {
    const ai = w.getComponent<AI>(id, 'ai')!;
    switch (ai.state) {
      case 'idle':
        // look for targets
        break;
      case 'moving':
        // move toward target
        break;
      case 'attacking':
        // deal damage
        break;
      case 'fleeing':
        // run away
        break;
    }
  }
}
```
