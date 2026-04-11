# Public API and Invariants

Use this as the short checklist for writing game code against civ-engine.

## Imports

Package consumers import from the root export:

```typescript
import {
  World,
  ClientAdapter,
  findPath,
  type EntityId,
  type EntityRef,
  type Position,
} from 'civ-engine';
```

Do not depend on deep package paths such as `civ-engine/src/world.js`.

## Component Data

Components must be JSON-compatible because snapshots and diffs serialize them. Use plain objects, arrays, strings, finite numbers, booleans, and `null`. Do not store `undefined`, `NaN`, `Infinity`, functions, symbols, bigints, class instances, circular references, or references to live objects.

```typescript
world.setComponent(unit, 'health', { hp: 100, maxHp: 100 });
world.setComponent(unit, 'inventory', { itemIds: ['axe', 'food'] });
```

## Writes

Prefer explicit write APIs:

```typescript
world.setComponent(unit, 'health', { hp: 100, maxHp: 100 });
world.patchComponent<{ hp: number }>(unit, 'health', (health) => {
  health.hp -= 10;
});
```

`getComponent()` returns the stored object directly. Direct mutations are diff-detected, but `setComponent()` and `patchComponent()` make write intent clearer.

Use `setPosition()` when same-tick grid correctness matters:

```typescript
const pos = world.getComponent<Position>(unit, 'position')!;
world.setPosition(unit, { x: pos.x + 1, y: pos.y });
```

Direct position mutations are allowed, but the spatial grid sees them on the next tick's sync. For large simulations, set `detectInPlacePositionMutations: false` and call `world.markPositionDirty(unit)` after a direct position mutation to avoid the fallback full scan.

## Systems and Metrics

Bare function systems run in the `update` phase. Use registration objects when order needs to be clearer:

```typescript
world.registerSystem({ phase: 'input', execute: inputSystem });
world.registerSystem({ name: 'Combat', phase: 'postUpdate', execute: combatSystem });
```

Use `world.getMetrics()` after `step()` to inspect query cache hits, spatial scan counts, system timings, and total tick time before choosing heavier optimizations.

Use the instrumentation profiles deliberately:

- `full` for AI development and diagnosis
- `minimal` for QA/staging when you still want coarse tick metrics
- `release` for shipping when implicit metrics should disappear from the hot path

All three keep simulation semantics the same. They only change how much implicit observability work the engine does on `step()` and `submit()`.

## Entity Handles

Entity IDs are recycled. External clients, UIs, and AI agents that hold an entity across ticks should use `EntityRef`:

```typescript
type Commands = {
  moveUnit: { unit: EntityRef; target: Position };
};

world.registerValidator('moveUnit', (data, w) => w.isCurrent(data.unit));
world.registerHandler('moveUnit', (data, w) => {
  w.setPosition(data.unit.id, data.target);
});
```

Bare `EntityId` is fine for short-lived internal system work.

## Resources and Saves

Unbounded resource capacity is `null`, not `Infinity`:

```typescript
world.registerResource('food');
world.addResource(city, 'food', 50);
world.getResource(city, 'food'); // { current: 50, max: null }
```

Resource amounts, rates, finite maxima, and transfer rates must be non-negative finite numbers.

Snapshot version 3 restores resource registrations, pools, rates, transfers, transfer IDs, and deterministic RNG state. After loading, re-register functions: systems, command validators, command handlers, event listeners, diff listeners, and destroy callbacks. Version 1 and 2 snapshots still load for compatibility.

## Client Adapter

Register handlers before accepting client commands. `ClientAdapter` rejects malformed commands, unhandled command types, and validator failures with structured `commandRejected` messages, and acknowledges queued commands with `commandAccepted`. If `send` throws, the adapter calls `onError` and disconnects itself.

```typescript
const adapter = new ClientAdapter({
  world,
  send: (message) => socket.send(JSON.stringify(message)),
  onError: (error) => console.error('client transport failed', error),
});
```
