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

Snapshot version 6 (current, 1.0) carries terminal poison state for inspection (`poisoned: TickFailure | null` — load paths keep clearing live poison unless `{ restorePoison: true }` opts in) and always writes `config.strict` explicitly. Version 5 added per-component `diffMode`, `maxTicksPerFrame`, and `instrumentationProfile` round-tripping. Version 4 added world-level state, entity tags, and entity metadata. Version 3 added deterministic RNG state. Version 2 added resource registrations, pools, rates, and transfers. Versions 1–5 are still accepted by `World.deserialize()` for backward compatibility; version ≤ 5 snapshots without `config.strict` deserialize as NON-strict (the 1.0 strict-default compatibility clause, ADR 48). After loading, re-register functions: systems, command validators, command handlers, event listeners, diff listeners, and destroy callbacks.

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

`WorldConfig.strict?: boolean` (**default `true` as of 1.0**; pass `strict: false` to opt out) is the mutation-gate invariant. When `true`, 22 mutation methods on `World` (createEntity, destroyEntity, setComponent et al., setPosition, all resource methods, setState/deleteState, addTag/removeTag, setMeta/deleteMeta, emit, random) throw `StrictModeViolationError` when called outside a system phase / setup window / `runMaintenance(fn)` callback. Registration calls (`registerComponent`/`registerSystem`/etc.), `submit`/`submitWithResult`, `step`/`stepWithResult`, listener add/remove, and read methods are NOT gated.

`applySnapshot` and `deserialize` work at any phase regardless of strict mode. See `docs/guides/strict-mode.md` for escape hatches (`endSetup`, `runMaintenance`), the depth-counted reentrant maintenance contract, and the submit-time callback caller-phase semantics.

## Surface curation and deprecation policy (v0.8.23+)

The package's public surface is **explicitly curated**: `src/index.ts` contains no star-exports, every public name (values AND types) is listed deliberately, and `tests/public-surface.test.ts` pins the full sorted name list against `tests/fixtures/public-surface.json` at two levels (runtime export names + declared names including type-only exports). Adding or removing a public name is therefore always a reviewed diff against the fixture, never an accident of what a module happens to export. The pin gates names, not signatures — signature and type-shape changes are gated by the typecheck, the test suite, and api-reference review.

Since **v2.2.0** there are **two** curated barrels (see `docs/api-reference.md` § "Package Entry Points"). `src/index.ts` is the full surface Node resolves; `src/index.browser.ts` is the same explicit list minus the two node-only runtime names (`FileSink`, `BundleCorpus`), served to bundlers via the exports-map `browser` condition and the `./browser` subpath. **A new export goes in BOTH barrels** unless it is genuinely node-only (module-scope `node:*` import) — then the full barrel only, plus a node-only callout in api-reference. `tests/browser-entry.test.ts` fails the suite if the barrels drift (runtime or declared-name parity off by anything other than exactly those two names), if a shared export stops being the identical object through both entries, or if a `node:` builtin becomes reachable from the browser barrel's module graph. Both barrels are held to the no-star and no-statement-level-`export type` invariants so every name stays visible to the fixture parser.

**Deprecation policy:**

- **Pre-1.0 (now):** there is no deprecation grace. Anything slated for removal is removed before the 1.0 freeze; `b`-bumps may break, and the changelog is the migration record.
- **Post-1.0:** deprecation happens in a **minor** release — `@deprecated` TSDoc on the symbol, a changelog callout, and a migration note in the owning guide. Removal happens in the **next major**, never sooner. Deprecated APIs keep their tests until removal.

**Constructor-shape convention (1.0 decision 8):** pure-grid primitives (`SpatialGrid`, `OccupancyGrid`, `SubcellOccupancyGrid`, `VisibilityMap`) take positional `(width, height)` constructors; utilities with genuine option sets (`Layer`, `World`) take options objects. Blessed deliberately at 1.0 — two integers do not warrant an options bag, and symmetry-for-its-own-sake would have broken four constructors.

The 1.0 decision menu (strict default, snapshot v6, trim list, freeze list) lives in `docs/design/v1-checklist.md`.
