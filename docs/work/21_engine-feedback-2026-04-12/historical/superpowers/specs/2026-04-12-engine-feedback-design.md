# Engine Feedback Design Spec

**Date:** 2026-04-12
**Source:** `civ-sim-web/docs/engine-feedback.md` — re-audit of civ-engine v0.2.0

## Overview

Six friction points identified by a consuming game project (`civ-sim-web`). All changes are additive and backwards-compatible. No existing API signatures change.

---

## 1. System Typing Relaxation

### Problem

`registerSystem` requires `System<TEventMap, TCommandMap>`, so a system typed against bare `World` or `World<any, any>` requires an explicit cast.

### Design

Add a second overload to `registerSystem` that accepts a loosely-typed system function:

```ts
// Existing strict overload (unchanged)
registerSystem(system: System<TEventMap, TCommandMap> | SystemRegistration<TEventMap, TCommandMap>): void;

// New loose overload
registerSystem(system: ((world: World<any, any>) => void) | SystemRegistration<any, any>): void;
```

Internally, both resolve to the same `RegisteredSystem`. The loose overload simply widens the type at the call site — no runtime change.

Also export a `LooseSystem` type alias for convenience:

```ts
export type LooseSystem = (world: World<any, any>) => void;
```

### Tests

- Register a system typed as `(world: World) => void` — no compile error.
- Register a system typed as `(world: World<any, any>) => void` — no compile error.
- Register a `SystemRegistration<any, any>` — no compile error.
- Existing strict-typed systems continue to work unchanged.

---

## 2. Typed Component Registry

### Problem

Component keys are stringly-typed. `getComponent<T>(id, 'health')` has no link between `'health'` and `T`.

### Design

Add an optional third type parameter `TComponents` to `World`:

```ts
type ComponentRegistry = Record<string, unknown>;

class World<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
>
```

When `TComponents` is provided, the following methods gain type-safe overloads:

```ts
// Type-safe: key drives return type
getComponent<K extends keyof TComponents & string>(entity: EntityId, key: K): TComponents[K] | undefined;

// Type-safe set
setComponent<K extends keyof TComponents & string>(entity: EntityId, key: K, data: TComponents[K]): void;
addComponent<K extends keyof TComponents & string>(entity: EntityId, key: K, data: TComponents[K]): void;

// Type-safe register
registerComponent<K extends keyof TComponents & string>(key: K): void;

// Type-safe patch
patchComponent<K extends keyof TComponents & string>(entity: EntityId, key: K, patch: (data: TComponents[K]) => TComponents[K] | void): TComponents[K];

// Type-safe query — returns entities that have all listed components
query<K extends keyof TComponents & string>(...keys: K[]): IterableIterator<EntityId>;

// Type-safe getComponents
getComponents<K extends (keyof TComponents & string)[]>(entity: EntityId, keys: [...K]): { [I in keyof K]: TComponents[K[I] & string] | undefined };
```

When `TComponents` is the default `Record<string, unknown>`, all methods fall back to the existing string-based API with no type inference — fully backwards compatible.

### Tests

- Compile-time: `getComponent(id, 'health')` returns `HealthComponent | undefined` when registry has `health: HealthComponent`.
- Compile-time: `setComponent(id, 'health', wrongType)` is a type error.
- Compile-time: `query('health', 'position')` compiles; `query('nonexistent')` is a type error when registry is fully specified.
- Runtime: all existing tests pass unchanged.

---

## 3. World-Level State Store

### Problem

Games use singleton entities for world-level config (terrain settings, simulation time, economy state). The engine has no dedicated home for non-entity structured state.

### Design

Add a typed key-value store to World:

```ts
// On World class:
setState<K extends keyof TComponents & string>(key: K, value: TComponents[K]): void;
setState(key: string, value: unknown): void;

getState<K extends keyof TComponents & string>(key: K): TComponents[K] | undefined;
getState(key: string): unknown | undefined;

deleteState(key: string): void;
hasState(key: string): boolean;
```

Note: `TComponents` registry is reused for state keys too, providing a single type map. Games that need separate namespaces can prefix keys (e.g., `'state:terrain'`). The component store and state store are separate internal maps — a key in one does not collide with the same key in the other.

**Internal storage:** A `Map<string, unknown>` on World, separate from component stores.

**Serialization:** State is included in `WorldSnapshotV4` as a `state: Record<string, unknown>` field. Deserialization restores it. V1-V3 snapshots load with empty state.

**Diffs:** `TickDiff` gains a `state` field: `{ set: Record<string, unknown>; removed: string[] }`. Only changed/removed keys appear. State dirty tracking uses JSON fingerprinting (same as components).

**Validation:** State values must be JSON-compatible (same `assertJsonCompatible` check as components).

### Tests

- `setState`/`getState` round-trip for primitive and object values.
- `deleteState` removes key, `hasState` returns false after delete.
- `setState` on dead world state key works (it's not entity-bound).
- State appears in `serialize()` output and restores via `deserialize()`.
- State changes appear in `getDiff()`.
- Non-JSON-compatible values throw.

---

## 4. Spatial Query Helpers

### Problem

Games that need locality + component filtering hand-roll: `getInRadius` → loop IDs → filter by components → project. Repeated across multiple files.

### Design

Two new methods on World:

```ts
*queryInRadius(
  cx: number,
  cy: number,
  radius: number,
  ...components: string[]
): IterableIterator<EntityId>;

findNearest(
  cx: number,
  cy: number,
  ...components: string[]
): EntityId | undefined;
```

**`queryInRadius`:** Calls `grid.getInRadius(cx, cy, radius)`, then filters by component signature (same bitmask check as `query`). Yields matching entity IDs. When the `TComponents` registry is used, the method gains a type-safe overload constraining component keys.

**`findNearest`:** Searches outward from (cx, cy) in expanding radius (0, 1, 2, ...) until it finds an entity matching all components. Returns the closest one by Euclidean distance. Returns `undefined` if none found on the entire grid. Has an optional `maxRadius` parameter (defaults to `Math.max(gridWidth, gridHeight)`).

Both methods use the existing spatial grid — no new data structures.

### Tests

- `queryInRadius` returns entities within radius that have all listed components.
- `queryInRadius` excludes entities missing components.
- `queryInRadius` excludes entities outside radius.
- `findNearest` returns the closest matching entity.
- `findNearest` returns `undefined` on empty grid.
- `findNearest` skips entities missing required components.
- `findNearest` with `maxRadius` stops early.

---

## 5. System Ordering Constraints

### Problem

System execution order is registration-order only. Large games maintain brittle 19-system registration blocks. No way to declare `before`/`after` constraints.

### Design

Extend `SystemRegistration`:

```ts
interface SystemRegistration<TEventMap, TCommandMap> {
  name?: string;
  phase?: SystemPhase;
  execute: System<TEventMap, TCommandMap>;
  before?: string[];  // NEW: run before these named systems
  after?: string[];   // NEW: run after these named systems
}
```

**Resolution algorithm:**

1. Group systems by phase (existing behavior).
2. Within each phase, build a dependency graph from `before`/`after` constraints.
3. Topological sort within each phase. Systems without constraints maintain their registration order relative to each other (stable sort).
4. Throw `Error` on cycle detection with a descriptive message naming the cycle.
5. Cross-phase constraints are an error (e.g., an `input` system cannot declare `after: ['outputSystem']` where `outputSystem` is in the `output` phase — the phase already guarantees this).
6. References to non-existent system names are an error.

**When resolution happens:** On the first `step()` or `stepWithResult()` call, and again if `registerSystem` is called after that (re-resolve on next tick). This avoids resolving on every tick while staying correct if systems are added dynamically.

**Named systems requirement:** Systems participating in ordering constraints must have a `name`. Anonymous systems (bare functions without a `.name`) can be ordered but cannot be referenced by name in constraints.

### Tests

- Systems with `after` run after the named system within the same phase.
- Systems with `before` run before the named system within the same phase.
- Mixed constrained and unconstrained systems: unconstrained maintain registration order.
- Cycle detection throws with descriptive message.
- Cross-phase constraint throws.
- Reference to non-existent system name throws.
- Multiple constraints form a chain (A before B, B before C → A, B, C).
- Adding a system after first tick re-resolves order.

---

## 6. Entity Metadata and Tags

### Problem

Hybrid games (domain objects outside ECS) maintain custom entity registries to map external IDs or semantic labels back to entity IDs.

### Design

Two features on World:

**Tags:** String labels with a reverse index.

```ts
addTag(entity: EntityId, tag: string): void;
removeTag(entity: EntityId, tag: string): void;
hasTag(entity: EntityId, tag: string): boolean;
getByTag(tag: string): ReadonlySet<EntityId>;
getTags(entity: EntityId): ReadonlySet<string>;
```

Multiple entities can share a tag. An entity can have multiple tags. `getByTag` returns a live read-only set.

**Metadata:** Arbitrary key-value per entity with optional reverse index.

```ts
setMeta(entity: EntityId, key: string, value: string | number): void;
getMeta(entity: EntityId, key: string): string | number | undefined;
deleteMeta(entity: EntityId, key: string): void;
getByMeta(key: string, value: string | number): EntityId | undefined;
```

`getByMeta` returns the first entity with that key-value pair (unique index — setting the same key-value on a second entity overwrites the first's index entry). This is designed for external IDs and stable gameplay IDs where uniqueness is expected.

**Cleanup:** `destroyEntity` removes all tags and metadata for that entity, including reverse index entries.

**Serialization:** Tags and metadata are included in `WorldSnapshotV4`.

**Diffs:** `TickDiff` gains `tags` and `metadata` fields tracking additions and removals.

### Tests

- `addTag`/`hasTag`/`getByTag` round-trip.
- `removeTag` removes from entity and reverse index.
- `getByTag` returns empty set for unknown tag.
- `getTags` returns all tags for entity.
- Multiple entities with same tag all appear in `getByTag`.
- `setMeta`/`getMeta`/`getByMeta` round-trip.
- `getByMeta` reverse index returns correct entity.
- `deleteMeta` removes from entity and reverse index.
- `destroyEntity` cleans up tags and metadata.
- Tags and metadata appear in serialized snapshot.
- Tags and metadata restore from deserialized snapshot.
- Tag and metadata changes appear in diffs.

---

## Snapshot Versioning

`WorldSnapshotV4` extends V3 with:

```ts
interface WorldSnapshotV4 {
  version: 4;
  // ... all V3 fields ...
  state: Record<string, unknown>;
  tags: Record<EntityId, string[]>;
  metadata: Record<EntityId, Record<string, string | number>>;
}
```

`deserialize` accepts V1–V4. V1–V3 snapshots load with empty state, tags, and metadata.

---

## Non-Goals

- No changes to the component store internals.
- No changes to the resource system.
- No new subsystem files — tags, metadata, and state store live on World directly or as small private helpers.
- No breaking changes to existing API signatures.
