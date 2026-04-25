# Review Summary

Most of the high-risk iteration-1 fixes held up: the command-loss fix, fail-fast poison path, diff tick alignment, reactive-BT preemption reset, and snapshot v5 fidelity changes are all materially better than the `552e76e` baseline. The remaining iteration-1 misses are narrower, but there are still three that are not actually closed. The biggest new risk is the snapshot boundary itself: `serialize()` and `deserialize()` still alias live component/state objects, so snapshot consumers can mutate engine state outside the write API. The other notable remaining weakness is contract clarity around the poisoned-world state: `step()` is blocked, but other public flows still operate against a tainted world.

# Iter-1 Regressions

### Owner-aware static blocks are still impossible
- **Iter-1 ID**: M10
- **File**: `src/occupancy-grid.ts:229-249, 892-898`
- **Problem**: `OccupancyGrid.isBlocked()` still returns `true` immediately for `blocked` cells before consulting `ignoreEntity`, and `OccupancyBinding.isBlocked()` delegates to that path. There is still no owner-aware static-block representation, so an entity cannot ignore its own static claim.
- **Why it matters**: The original `ignoreEntity` footgun remains for passability queries that model blockers as static cells rather than occupancy/reservations.
- **Suggested fix**: Either add owner-aware blocked-cell storage (`block(area, entity, ...)` plus per-cell owner metadata) or remove the claimed `ignoreEntity` behavior for static blocks from the API/docs and treat them as entity-less terrain only.

### `getEvents()` still leaks live payloads for unclonable event data
- **Iter-1 ID**: M1
- **File**: `src/event-bus.ts:3-8, 19-24, 45-55`
- **Problem**: The defensive-copy fix relies on `deepCloneJsonOrShallow()`, but that helper returns the original object when `JSON.stringify` fails. `emit()` does not validate payloads, despite the comment claiming validation happens “elsewhere”, so circular/class-instance payloads still come back as live references.
- **Why it matters**: The iteration-1 mutability fix is incomplete: a caller can still mutate engine-observable event objects through `getEvents()`, and history/client consumers can still explode later on bad event shapes.
- **Suggested fix**: Validate event payloads at `emit()` with `assertJsonCompatible`, or make `getEvents()` throw on unclonable payloads instead of falling back to the original reference.

### `EntityManager.fromState()` still accepts impossible liveness/generation data
- **Iter-1 ID**: L8
- **File**: `src/entity-manager.ts:82-114`
- **Problem**: The hardening only validates `freeList` structure. It still copies `alive` and `generations` arrays without checking that `alive[i]` is actually boolean and `generations[i]` is a non-negative integer.
- **Why it matters**: A malformed snapshot can still restore impossible entity state even though iteration-1 claimed this restore path was validated.
- **Suggested fix**: Validate every `alive` entry as boolean, every `generations` entry as a non-negative integer, and reject malformed arrays before constructing the manager.

# Critical

### Snapshot APIs still share live component and state objects with callers
- **File**: `src/world.ts:806-860, 877-918; src/component-store.ts:136-144`
- **Problem**: `serialize()` copies component entries and world-state values by reference, not by value. `deserialize()` then stores those caller-owned objects directly into `ComponentStore` and `stateStore`. Mutating `snapshot.components[...]` or `snapshot.state[...]` after either boundary mutates the live world outside `setComponent()` / `setState()`.
- **Why it matters**: This breaks snapshot isolation, bypasses dirty tracking and invariants, and lets external tooling or transport adapters corrupt simulation state by touching a snapshot object.
- **Suggested fix**: Deep-clone component payloads and state values on both serialize and deserialize boundaries. Add regression tests that mutate snapshot payloads after `serialize()` and after `deserialize()` and assert the world stays unchanged.

# High

### The poisoned-world contract only blocks stepping, not other stateful public APIs
- **File**: `src/world.ts:577-607, 687-712, 806-860`
- **Problem**: `step()` / `stepWithResult()` / `executeTickOrThrow()` guard on `this.poisoned`, but `submit()` / `submitWithResult()` still accept commands and `serialize()` still exports snapshots while the world is in a known-tainted fail-fast state.
- **Why it matters**: “Fail-fast” no longer means “frozen until recovery”; agents can queue future work or persist ambiguous partial state against a world whose last tick already failed.
- **Suggested fix**: Centralize an `assertNotPoisoned()` guard for submission/persistence APIs, or add explicit opt-in escape hatches such as `serializePoisoned()` if debug-time access to poisoned state is intentional.

### Typed component/state registries disappear at the callback boundary
- **File**: `src/world.ts:29-42, 361-365, 722-731, 763-776, 877-887`
- **Problem**: `System`, `registerSystem`, `registerValidator`, `registerHandler`, `onDestroy`, and `deserialize()` only thread `TEventMap` and `TCommandMap`. `TComponents` and `TState` are dropped from the `World` type exactly where game logic callbacks consume the API.
- **Why it matters**: The typed-registry feature is not available in the engine’s main authoring surfaces, so users lose the compile-time guarantees they were told the API provides.
- **Suggested fix**: Thread `TComponents` and `TState` through the callback-facing `World` types and add a fourth generic to `deserialize()` so restored worlds preserve typed state as well as typed components.

# Medium

### `setMeta()` allows non-finite numbers, which corrupts persisted metadata
- **File**: `src/world.ts:840-850, 1132-1135`
- **Problem**: Metadata writes accept any `number`, including `NaN` and `Infinity`. `serialize()` then copies those values directly into the snapshot metadata record without JSON validation.
- **Why it matters**: `JSON.stringify()` will coerce non-finite numbers, so saved metadata can silently diverge from the in-memory reverse index used by `getByMeta()`.
- **Suggested fix**: Validate metadata values on write with a finite-number/JSON-compatibility check, or reject non-JSON metadata during serialization before emitting the snapshot.

# Low / Polish

### Component option bookkeeping stores mutable caller-owned config objects
- **File**: `src/world.ts:374-389, 893-907`
- **Problem**: `registerComponent()` stores the caller’s `options` object by reference in `componentOptions`, and `deserialize()` does the same with `snapshot.componentOptions`. Later mutation changes what future snapshots report without changing the already-constructed `ComponentStore` behavior.
- **Why it matters**: Snapshot v5 can describe component diff settings that no longer match the live store, which is a subtle operator footgun.
- **Suggested fix**: Clone `ComponentStoreOptions` before storing them in `componentOptions` during both registration and deserialization.

# Notes & Open Questions

- If `submit()` and `serialize()` are intentionally meant to remain available while poisoned for repair/debug workflows, that contract needs to be explicit. The current docs and release notes read as if poison is a full fail-fast freeze, not a step-only gate.
- If static blocks are intentionally entity-less terrain only, iteration-1 M10 should be removed from the “fixed” set and the API/docs should stop implying that `ignoreEntity` can ever apply to that path.