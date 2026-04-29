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

`getComponent()` returns the stored object directly, but in-place mutations are **not** picked up by the diff system. All component changes must go through `setComponent()` / `addComponent()` / `patchComponent()` (or `setPosition()` for the configured position component) for the engine to mark the entity dirty and update derived structures like the spatial grid.

Use `setPosition()` when same-tick grid correctness matters:

```typescript
const pos = world.getComponent<Position>(unit, 'position')!;
world.setPosition(unit, { x: pos.x + 1, y: pos.y });
```

In-place mutation of position objects (`pos.x += 1`) is not auto-detected — neither the diff nor the grid will see the change. Always use `setPosition`/`setComponent` for movement.

## Systems and Metrics

Bare function systems run in the `update` phase. Use registration objects when order needs to be clearer:

```typescript
world.registerSystem({ phase: 'input', execute: inputSystem });
world.registerSystem({ name: 'Combat', phase: 'postUpdate', execute: combatSystem });
```

Use `world.getMetrics()` after `step()` to inspect query cache hits, explicit-sync counts, system timings, and total tick time before choosing heavier optimizations.

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

Snapshot version 5 (current) round-trips per-component `diffMode`, `maxTicksPerFrame`, and `instrumentationProfile` in addition to everything in earlier versions. Version 4 added world-level state, entity tags, and entity metadata. Version 3 added deterministic RNG state. Version 2 added resource registrations, pools, rates, and transfers. Versions 1–4 are still accepted by `World.deserialize()` for backward compatibility. After loading, re-register functions: systems, command validators, command handlers, event listeners, diff listeners, and destroy callbacks.

## Client Adapter

Register handlers before accepting client commands. `ClientAdapter` rejects malformed commands, unhandled command types, and validator failures with structured `commandRejected` messages, and acknowledges queued commands with `commandAccepted`. If `send` throws, the adapter calls `onError` and disconnects itself.

```typescript
const adapter = new ClientAdapter({
  world,
  send: (message) => socket.send(JSON.stringify(message)),
  onError: (error) => console.error('client transport failed', error),
});
```


## Strict Mode (v0.8.8+)

`WorldConfig.strict?: boolean` (default `false`) is an opt-in invariant. When `true`, 22 mutation methods on `World` (createEntity, destroyEntity, setComponent et al., setPosition, all resource methods, setState/deleteState, addTag/removeTag, setMeta/deleteMeta, emit, random) throw `StrictModeViolationError` when called outside a system phase / setup window / `runMaintenance(fn)` callback. Registration calls (`registerComponent`/`registerSystem`/etc.), `submit`/`submitWithResult`, `step`/`stepWithResult`, listener add/remove, and read methods are NOT gated.

`applySnapshot` and `deserialize` work at any phase regardless of strict mode. See `docs/guides/strict-mode.md` for escape hatches (`endSetup`, `runMaintenance`), the depth-counted reentrant maintenance contract, and the submit-time callback caller-phase semantics.
