# Public API and Invariants

This guide covers the current public import path and the invariants that game code should follow.

## Import from the Package Root

Package consumers should import from the root export:

```typescript
import {
  World,
  ClientAdapter,
  createTileGrid,
  findPath,
  NodeStatus,
  type EntityId,
  type EntityRef,
  type Position,
} from 'civ-engine';
```

Inside this repository, local examples may use `./src/index.js` while developing the package. Avoid depending on deep package paths such as `civ-engine/src/world.js`; the package export is the root module.

## Component Data Must Be JSON-Compatible

Components are saved in snapshots and sent through diffs, so component payloads must be JSON-compatible:

- Use plain objects, arrays, strings, numbers, booleans, and `null`.
- Do not store `undefined`, `NaN`, `Infinity`, functions, symbols, bigints, class instances, or circular references.
- Store IDs or component keys instead of object references to other entities.

```typescript
world.setComponent(unit, 'health', { hp: 100, maxHp: 100 });
world.setComponent(unit, 'inventory', { itemIds: ['axe', 'food'] });
```

## Use Explicit Write APIs

`addComponent()` remains as a compatibility alias for `setComponent()`. New code should use explicit writes:

```typescript
world.setComponent(unit, 'health', { hp: 100, maxHp: 100 });

world.patchComponent<{ hp: number; maxHp: number }>(unit, 'health', (health) => {
  health.hp = Math.max(0, health.hp - 10);
});
```

`getComponent()` returns the stored object directly. Direct mutations are detected for diffs, but explicit writes make intent clearer.

For position components, use `setPosition()` when same-tick grid correctness matters:

```typescript
const pos = world.getComponent<Position>(unit, 'position')!;
world.setPosition(unit, { x: pos.x + 1, y: pos.y });
```

Directly mutating a position object is still allowed, but the spatial grid only sees that change during the next tick's sync.

## Use EntityRef for External Commands

Entity IDs are recycled after destruction. If a UI, network client, or AI agent holds an ID across ticks, include the generation too:

```typescript
type Commands = {
  moveUnit: { unit: EntityRef; target: Position };
};

world.registerValidator('moveUnit', (data, w) => {
  return w.isCurrent(data.unit);
});

world.registerHandler('moveUnit', (data, w) => {
  w.setPosition(data.unit.id, data.target);
});
```

```typescript
const unitRef = world.getEntityRef(unit);
if (unitRef) {
  world.submit('moveUnit', { unit: unitRef, target: { x: 5, y: 3 } });
}
```

Use bare `EntityId` for short-lived internal system work where the entity is looked up and used in the same tick.

## Resource Values

Unbounded resource capacity is represented as `null`, not `Infinity`:

```typescript
world.registerResource('food'); // default max is null
world.addResource(city, 'food', 50);
world.getResource(city, 'food'); // { current: 50, max: null }
```

Resource amounts, rates, finite maxima, and transfer rates must be non-negative finite numbers. Use `setResourceMax(entity, key, null)` to make a pool unbounded.

## Save and Load

Snapshot version 2 includes resources:

```typescript
const snapshot = world.serialize();
const restored = World.deserialize(snapshot, [movementSystem]);
```

After loading, re-register functions: systems, command validators, command handlers, event listeners, diff listeners, and destroy callbacks. Resource registrations, pools, rates, transfers, and transfer IDs are data in version 2 snapshots and are restored automatically.

Version 1 snapshots still load for compatibility, but they have no resource state.

## Client Adapter Boundary

Register command handlers before accepting client commands. `ClientAdapter` rejects malformed commands, unhandled command types, and validator failures with `commandRejected`.

```typescript
const adapter = new ClientAdapter({
  world,
  send: (message) => socket.send(JSON.stringify(message)),
  onError: (error) => {
    console.error('client transport failed', error);
  },
});
```

If `send` throws, the adapter calls `onError` and disconnects itself so a broken transport does not break `world.step()`.
