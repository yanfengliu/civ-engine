# Review Summary
The codebase is generally strong: the architecture is disciplined, subsystem boundaries are mostly clear, and the test suite is broad enough that most “easy” bugs are already locked down. The biggest remaining risks are around failure semantics and snapshot fidelity, where the public API currently suggests stronger guarantees than the implementation actually provides. The engine’s strongest areas are the standalone utility modules, the typed World-facing API, and the amount of behavior-level test coverage around normal execution paths. The weakest areas are “edge contract” behavior: failed ticks, deserialize validation, and several read-only/public surfaces that are only protected by TypeScript types rather than runtime enforcement.

# Critical
None.

# High
### Failed ticks can mutate world state without advancing the tick or emitting a diff
- **File**: `src/world.ts:1217-1417,1512-1525,1572-1602`
- **Problem**: `runTick()` executes command handlers and systems directly against live world state. If a handler or system throws, `finalizeTickFailure()` records the failure and clears `currentDiff`, but it does not roll back any state mutations that already happened, and `stepWithResult()` does not advance `world.tick` on failure.
- **Why it matters**: A failed tick can leave the world partially updated while observers still see the old tick number and no diff, which breaks replay/debug assumptions and makes recovery behavior ambiguous.
- **Suggested fix**: Make tick execution transactional for pre-listener failures. The simplest safe fix is to capture a full snapshot before command processing and restore it on any `commands`/`spatialSync`/`systems`/`resources`/`diff` failure. If rollback is intentionally out of scope, then failed ticks should be treated as fatal and the API/docs should stop looking recoverable.

### Snapshot round-tripping silently drops `WorldConfig` behavior flags
- **File**: `src/world.ts:742-804`; `src/types.ts:15-23`
- **Problem**: `serialize()` rebuilds `config` manually and only preserves `gridWidth`, `gridHeight`, `tps`, `positionKey`, `seed`, and `detectInPlacePositionMutations`. `WorldConfig.maxTicksPerFrame` and `WorldConfig.instrumentationProfile` are not serialized, so `deserialize()` recreates a world with different pacing/metrics behavior than the source world.
- **Why it matters**: Save/load changes runtime behavior silently: a `release` world restores as `full`, and a custom `maxTicksPerFrame` restores as the default `4`.
- **Suggested fix**: Serialize and deserialize the full semantically relevant `WorldConfig`, including `maxTicksPerFrame` and `instrumentationProfile`, or explicitly split “snapshot-safe config” from runtime-only config so the contract is honest.

# Medium
### `setMeta()` breaks the documented “unique reverse-index” invariant
- **File**: `src/world.ts:1038-1066,1140-1156`
- **Problem**: `setMetaInternal()` unconditionally writes `keyIndex.set(value, entity)`. If two live entities share the same metadata key/value, the later write overwrites the reverse index while the earlier entity still retains the metadata locally.
- **Why it matters**: `getByMeta()` can return only one entity while multiple entities carry the same value, so the reverse index is no longer trustworthy even though the docs describe it as unique.
- **Suggested fix**: Enforce uniqueness at write time. If another live entity already owns the same `(key, value)` pair, throw from `setMeta()` instead of silently overwriting the index.

### “Read-only” public views are only type-level and remain mutable at runtime
- **File**: `src/world.ts:240-278,731-735,880-881,1030-1034`; `src/spatial-grid.ts:57-90`; `src/event-bus.ts:42-46`
- **Problem**: `world.grid` is the actual `SpatialGrid` instance, `getAt()` returns the backing `Set`, `getEvents()` returns the backing event buffer, `getDiff()` returns the live diff object, and tag getters return backing sets. All are typed as read-only, but none are protected at runtime.
- **Why it matters**: Any JS consumer, `any` cast, or careless adapter can mutate engine internals while bypassing `World`, which violates the documented boundary and can corrupt sync/debug state.
- **Suggested fix**: Return defensive views. Examples: clone arrays/objects in `getEvents()` and `getDiff()`, return copied/frozen sets from `getAt()`/tag getters, and wrap `world.grid` in an object that only exposes query methods.

### `VisibilityMap.getState()` can serialize stale explored/visible state
- **File**: `src/visibility-map.ts:45-96,128-143,153-185`
- **Problem**: `setSource()` and `removeSource()` mark players dirty, and most read APIs call `ensureUpdated()`. `getState()` does not, so calling it before `update()` can serialize stale `explored` data even though the source set has already changed.
- **Why it matters**: Save/load or debugging output can miss newly explored cells unless callers remember to manually call `update()` first.
- **Suggested fix**: Make `getState()` call `update()` before reading player state, or at least flush only the dirty players the way `ensureUpdated()` does.

### `ResourceStore.fromState()` trusts transfer IDs and `nextTransferId` too much
- **File**: `src/resource-store.ts:147-151,297-341`
- **Problem**: `fromState()` validates that `nextTransferId` is non-negative, but it does not verify transfer ID uniqueness and does not ensure `nextTransferId` is greater than every existing transfer ID.
- **Why it matters**: A restored store can issue duplicate transfer IDs, which makes `removeTransfer(id)` ambiguous and breaks the public transfer handle contract.
- **Suggested fix**: Validate that transfer IDs are unique during restore and normalize `nextTransferId` to at least `max(existingIds) + 1`.

# Low / Polish
None.

# Notes & Open Questions
- `WorldStepResult` and `TickFailure` make failed ticks look recoverable, but the implementation currently behaves like a partially-mutating failure path. If the intended contract is “a thrown handler/system makes the world unusable until reset,” that should be stated explicitly in the docs.
- I did not find evidence that duplicate metadata values are intentionally supported; the architecture doc currently reads as if uniqueness is required.
