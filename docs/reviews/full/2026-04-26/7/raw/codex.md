# Review Summary
The iter-6 to v0.7.4 followups look clean: `world.grid` is now structurally frozen, the `SYSTEM_PHASES` move is runtime-safe, and I did not find regressions from the cast/import cleanup. The broader sweep did turn up four issues outside the `CommandTransaction`/`Layer` chain: one deserialize invariant hole, two listener/transport isolation bugs, and one small standalone utility bounds bug.

# Critical
None observed.

# High
1. `World.deserialize()` still accepts component/resource records for dead or invalid entity IDs, so a corrupted snapshot can rebuild state that disagrees with `isAlive()`. `snapshot.components` and `snapshot.resources` are handed straight to loaders without any entity-id or liveness validation ([src/world.ts](</C:/Users/38909/Documents/github/civ-engine/src/world.ts:945>), [src/component-store.ts](</C:/Users/38909/Documents/github/civ-engine/src/component-store.ts:112>), [src/resource-store.ts](</C:/Users/38909/Documents/github/civ-engine/src/resource-store.ts:297>)). That matters because component signatures and the spatial index are rebuilt from those stores afterward ([src/world.ts](</C:/Users/38909/Documents/github/civ-engine/src/world.ts:2001>), [src/world.ts](</C:/Users/38909/Documents/github/civ-engine/src/world.ts:2099>)): a dead `position` entry becomes queryable through `world.grid`/`queryInRadius`, and dead component rows can show up in `query()`. Negative or fractional component IDs are worse: `ComponentStore.set()` writes them as array properties and increments `size`, but iteration never sees them ([src/component-store.ts](</C:/Users/38909/Documents/github/civ-engine/src/component-store.ts:21>)), so deserialize can silently create stores whose `size`, query planning, and serialized contents disagree.

# High
None observed.

# Medium
1. Event listeners can still mutate engine-owned event payloads after emit-time validation, which means one listener can corrupt what later listeners and `world.getEvents()` observe. `EventBus.emit()` pushes the original `data` object into the buffer and then passes that same reference to listeners ([src/event-bus.ts](</C:/Users/38909/Documents/github/civ-engine/src/event-bus.ts:20>), [src/event-bus.ts](</C:/Users/38909/Documents/github/civ-engine/src/event-bus.ts:24>)); `getEvents()` only clones later, on read ([src/event-bus.ts](</C:/Users/38909/Documents/github/civ-engine/src/event-bus.ts:51>)). A listener that mutates the payload can therefore rewrite buffered history, and a listener that makes it circular/non-JSON can make later `getEvents()` calls throw. With `ClientAdapter` connected, that can poison the tick in the diff-listener path because it always pulls `world.getEvents()` at tick end ([src/client-adapter.ts](</C:/Users/38909/Documents/github/civ-engine/src/client-adapter.ts:132>), [src/client-adapter.ts](</C:/Users/38909/Documents/github/civ-engine/src/client-adapter.ts:138>)).

2. `ClientAdapter.handleMessage()` re-adds a `submissionSequence -> client id` mapping even if sending `commandAccepted` already failed and forced a disconnect. `safeSend()` disconnects and clears the map on transport failure ([src/client-adapter.ts](</C:/Users/38909/Documents/github/civ-engine/src/client-adapter.ts:277>)), but `handleMessage()` ignores the return value and unconditionally calls `this.clientCommandIds.set(result.sequence, id)` right after the failed send ([src/client-adapter.ts](</C:/Users/38909/Documents/github/civ-engine/src/client-adapter.ts:253>), [src/client-adapter.ts](</C:/Users/38909/Documents/github/civ-engine/src/client-adapter.ts:264>)). If the adapter reconnects before that queued command executes, the new session can receive `commandExecuted`/`commandFailed` for a command whose acceptance was never delivered; if it never reconnects, the stale map entry just leaks.

# Low
1. `octaveNoise2D()` does not validate its control parameters, so its documented `[-1, 1]` contract is false for bad inputs. With `octaves <= 0`, or combinations like `persistence = -1`, the loop leaves `maxAmplitude` at `0` or otherwise invalid and the function returns `NaN`/`Infinity` ([src/noise.ts](</C:/Users/38909/Documents/github/civ-engine/src/noise.ts:94>), [src/noise.ts](</C:/Users/38909/Documents/github/civ-engine/src/noise.ts:114>)). The public docs still state that `octaveNoise2D` returns values in `[-1, 1]` without constraining those parameters ([docs/api-reference.md](</C:/Users/38909/Documents/github/civ-engine/docs/api-reference.md:3687>), [docs/api-reference.md](</C:/Users/38909/Documents/github/civ-engine/docs/api-reference.md:3700>)).

# Polish / Nitpicks
None observed.

# Notes & Open Questions
If malformed snapshots are considered trusted-internal only, the deserialize issue may be a hardening gap rather than a release blocker. The current public docs read more like a validated import boundary, though, so I treated it as a real invariant bug.


