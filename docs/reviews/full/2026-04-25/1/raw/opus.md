# Review Summary

The codebase is well-organized for a 2D ECS engine: World as a single entry point, deliberate phase pipeline, generation-aware EntityRefs, JSON-first state, and an unusually rich AI-facing surface (TickFailure schemas, debugger snapshots, history recorder, scenario runner). Test coverage of core mechanisms is broad (415+ tests) and the public boundaries documented in `docs/architecture/ARCHITECTURE.md` largely match the implementation. The biggest risks are concentrated in the tick pipeline: every successful `processCommands` failure silently discards every queued-but-unprocessed command in the same tick, and `ComponentStore.set()` always JSON.stringifies the value (even in the default `'strict'` diffMode where the result is unused), so per-tick allocation/CPU scales with components × entities and is effectively unavoidable. The other notable themes are (a) a shifting "current tick" concept across `world.tick`, `currentDiff.tick`, and `getObservableTick()` that creates listener-time observability inconsistencies, and (b) several places that expand the public API beyond what the architecture documents (e.g. `setState` typed by `TComponents`, occupancy/path-service breadth) without corresponding cleanup of legacy paths.

# Critical

### Drained-but-unprocessed commands are silently lost on a tick failure
- **File**: `src/world.ts:1364-1432` and `src/command-queue.ts:28-32`
- **Problem**: `processCommands` calls `commandQueue.drain()` once at the start of the tick (`buffer = []`). It then iterates the snapshot. On the first missing-handler or thrown handler, it returns `{ processed, failure }` immediately. Every command after the failed one in `commands` is never executed and never re-enqueued — the queue was already emptied by `drain()`. The tick then aborts via `runTick`'s `if (commandsResult.failure) return finalizeTickFailure(...)`. There is no surface that tells the caller which commands were dropped, no `onCommandExecution` event for them, and they are not present in `lastTickFailure.details`.
- **Why it matters**: Silent data loss for AI agents whose pipeline assumes "submit, then on next tick observe outcome": one badly-behaved validator/handler can cause every subsequent command in that tick to vanish without trace, and the agent has no way to tell which submission sequences need to be re-issued.
- **Suggested fix**: Either (a) on failure, push the remaining un-executed commands back onto the head of `commandQueue.buffer` so they are retried next tick, or (b) emit an explicit `commandFailed`/`command_dropped` execution result (with `code: 'tick_aborted_before_handler'`) for every still-pending command in `commands` and include their submission sequences in `failure.details`. The first option keeps semantics simpler; the second avoids retrying commands whose preconditions may have been invalidated by the partial tick.

### `ComponentStore.set` runs JSON.stringify on every write regardless of diffMode
- **File**: `src/component-store.ts:21-39` and `src/json.ts:7-62`
- **Problem**: `set()` unconditionally calls `jsonFingerprint(component, ...)` which does a recursive `assertJsonCompatible` walk and then `JSON.stringify`. The fingerprint is only consulted inside the `if (this.diffMode === 'semantic' && wasPresent)` branch — i.e. it is computed and discarded for every write under the default `'strict'` mode. `getDirty()` (line 82-100) and `clearDirty()` (line 102-109) each iterate every entity in the store calling `jsonFingerprint` again, so a stable component is fingerprinted three times per tick (set + getDirty + clearDirty) even in strict mode.
- **Why it matters**: This is the engine's hot path. For a colony-/RTS-scale simulation with 10K entities and 5 components mutating per tick, this is on the order of 150K JSON.stringify calls/tick added purely to feed an unused branch. It also breaks the implicit contract that strict mode is "fast" and semantic mode is the slower opt-in; today they pay almost identical cost.
- **Suggested fix**: In `set()`, only compute the fingerprint when `this.diffMode === 'semantic' && wasPresent`. In `getDirty()`, skip the all-entities scan entirely when there has been no in-place mutation surface used (or gate the catch-all scan behind an opt-in `detectInPlaceComponentMutations` flag mirroring `WorldConfig.detectInPlacePositionMutations`). Keep `assertJsonCompatible` only on the paths that actually serialize (snapshot, diff emission), not on every set.

# High

### Diff listeners observe `world.tick` one tick behind `diff.tick`
- **File**: `src/world.ts:1206-1215`, `src/world.ts:1337-1340`, `src/game-loop.ts:37-40`, `src/world.ts:551-568`
- **Problem**: `buildDiff` writes `tick: this.gameLoop.tick + 1`. In `step()` the gameLoop calls `onTick()` (which runs `runTick`, which fires diff listeners) and only then runs `_tick++`. In `stepWithResult` the listeners fire inside `runTick`, and `gameLoop.setTick(tick + 1)` is only run after `runTick` returns. So during a diff listener: `world.tick` is N, `diff.tick` is N+1, `currentMetrics.tick` is N+1, and `getObservableTick()` returns N+1 (used by `serialize()` and command result construction). A listener that pairs `diff.tick` with `world.tick` (or any consumer that calls `world.serialize()` plus `world.tick` together) sees inconsistent values transiently.
- **Why it matters**: Renderer/client adapters and history recorders run inside the listener callback and are exactly the consumers that pair `diff.tick` with the world's getter. Any "did I see tick N already?" check based on `world.tick` is off by one. This is the kind of bug that ships into a game project and gets blamed on the integrator.
- **Suggested fix**: Advance `gameLoop._tick` (or call `setTick(tick + 1)`) before firing the diff listeners, with `currentDiff.tick === world.tick === metrics.tick` being the invariant from the moment the diff is built. The `try { diffListeners ... } catch` block can stay; just bump the tick counter inside `runTick` immediately before invoking listeners.

### `submit()` fast path silently swallows validator rejections in non-`full` profiles
- **File**: `src/world.ts:616-629` and `src/world.ts:1663-1691`
- **Problem**: When `instrumentationProfile !== 'full'` and there are no `commandResultListeners`, `submit()` calls `validateCommand` and, on rejection, returns `false` without ever calling `emitCommandResult`. There is no audit record (`onCommandResult`/`onCommandExecution` never fires), and `nextCommandResultSequence` is not incremented, so a later listener attaches to a sequence stream that has gaps relative to a parallel `full`-mode stream. Validators that have side-effects (which the docs do not forbid) run, but their rejection codes are dropped.
- **Why it matters**: The same call (`world.submit(...)`) has different observable outcomes depending on (a) instrumentation profile and (b) whether anyone is currently subscribed. AI agents debugging "why was my command rejected?" can only get an answer by switching profiles or attaching a listener mid-run. Histories taken from different profiles are not comparable.
- **Suggested fix**: Either always emit a `CommandSubmissionResult` (the cost is one allocation; it is observable only through deliberate listeners), or document this fast path explicitly and route the boolean return through a single internal helper so the non-emitting branch is obvious. If the perf is needed, gate it on `commandResultListeners.size === 0 && commandExecutionListeners.size === 0` only, and never on profile.

### Snapshots do not preserve `ComponentStore` `diffMode`
- **File**: `src/world.ts:825-834`, `src/component-store.ts:111-121`, `src/serializer.ts:44-59`
- **Problem**: The v4 snapshot stores `components: Record<string, Array<[EntityId, unknown]>>` only. `World.deserialize` rebuilds each store via `ComponentStore.fromEntries(entries)` — the `options` argument (and therefore `diffMode`) is never threaded through. There is no place in any snapshot version to record the per-component `diffMode`, and no `deserialize` overload to supply it. So a world configured with `registerComponent('position', { diffMode: 'semantic' })`, after `serialize()` + `deserialize()`, behaves as `diffMode: 'strict'` — diff churn changes silently.
- **Why it matters**: Any save/load cycle (or scenario harness round-trip) regresses the semantic-diff opt-in, which is itself a recent fix for civ-sim-web feedback. Long-running simulations resumed from disk get noisier diffs than they had before serialization.
- **Suggested fix**: Add `componentOptions: Record<string, ComponentStoreOptions>` to v5 of `WorldSnapshot` (keep v4 readable). Pass them through in `World.deserialize`. Alternatively, have `World.deserialize` accept an optional `componentOptions` parameter and document that the caller must supply it.

### `submit()` pushes commands without a `submissionSequence` in the fast path, breaking client correlation
- **File**: `src/world.ts:616-629`, `src/world.ts:1393-1429`, `src/client-adapter.ts:144-163`
- **Problem**: In the non-`full`/no-listeners fast path, `submit()` calls `this.commandQueue.push(type, data)` without any `submissionSequence`. When the handler later runs, `emitCommandExecution` produces `submissionSequence: null`. `ClientAdapter.commandExecutionListener` immediately returns when `result.submissionSequence === null` (line 145), so the client never receives `commandExecuted`/`commandFailed` for those commands. The same command issued via `submitWithResult()` would be correlated.
- **Why it matters**: Whether a command is observable on the wire depends on which submission API was used and which instrumentation profile is active — a non-obvious cross-cut that any AI agent or remote client has to reverse-engineer.
- **Suggested fix**: Always assign a sequence in `submit()` (and have `submitWithResult` reuse the same path) regardless of profile. The cost is a single `nextCommandResultSequence++`. Reserve listener-free fast paths for emission, not sequence assignment.

### `OccupancyBinding.crowding`'s injected `isCellBlocked` ignores `ignoreEntity` for static-blocked checks
- **File**: `src/occupancy-grid.ts:868-881` and `src/occupancy-grid.ts:236-255`
- **Problem**: When constructing the inner `SubcellOccupancyGrid`, the binding wires `isCellBlocked: (x, y, queryOptions) => { if (this.occupancy.isBlocked(x, y, queryOptions)) return true; ... }`. `OccupancyGrid.isBlocked` checks `this.blocked.has(cell)` first and returns `true` unconditionally — `ignoreEntity` is only consulted for occupant/reservation overlaps. If an entity has both an `OccupancyGrid.block(...)` claim and a sub-cell crowd claim (e.g. it is a static structure with a crowded sentry slot), the entity's own subcell queries with `ignoreEntity = self` will still return blocked because of its static block.
- **Why it matters**: The doc and the binding's metadata model treat blocker entities as first-class (`OccupancyMetadata`), so an AI may reasonably issue queries with `ignoreEntity` to plan placements. The current behavior makes those queries always fail for self-blocked footprints. The bug is hard to spot because the static path is not covered by `ignoreEntity` semantics anywhere else.
- **Suggested fix**: In `OccupancyGrid.isBlocked`, track which entity (if any) owns each blocked cell (mirrors `occupiedByCell`/`reservationsByCell`). When `options.ignoreEntity` matches the blocking entity, do not return true. Then update the `OccupancyBinding.block` path to record the owning entity per cell. If the engine wants to keep `block(area)` entity-less for true terrain, accept an optional `entity` parameter overload and only honor `ignoreEntity` for entity-owned blocks.

# Medium

### `findNearest` re-scans expanding superset radii instead of expanding shells
- **File**: `src/world.ts:500-529`
- **Problem**: The loop calls `spatialGrid.getInRadius(cx, cy, r)` for `r = 0..maxRadius`. Each iteration's result is a strict superset of the previous, so on a sparse grid where the nearest match is at radius R, the function does ~R^2 cell scans for each r and iterates through every entity it has already visited at smaller radii. The early-return correctness argument is fine, but the work is `O(maxRadius^3)` worst case where it should be `O(R^2)`.
- **Why it matters**: For the common AI pattern "find nearest enemy" called many times per tick, this is a real performance trap that gets worse as the world grows.
- **Suggested fix**: Maintain a `seen` `Set<EntityId>` across iterations; when scanning radius `r`, skip entities already considered. Better: scan the shell `r` only (cells where `Math.max(|dx|,|dy|) === r` for chebyshev / bounding ring for euclidean) and bail to euclidean-distance comparisons inside that shell.

### `assertPositionInBounds` relies on a side-effect of `getAt`
- **File**: `src/world.ts:1836-1838` and `src/spatial-grid.ts:88-90`
- **Problem**: `private assertPositionInBounds(position: Position) { this.spatialGrid.getAt(position.x, position.y); }` works only because `getAt` calls the private `key()` helper, which calls `assertBounds` — i.e. the assertion is a side effect of an unrelated read. A future refactor that makes `getAt` non-throwing (perfectly reasonable, given its `null` return) silently disables bounds validation in `setComponent`/`setPosition`/`syncSpatialIndex`/`rebuildSpatialIndex`.
- **Why it matters**: This is a load-bearing invariant — `setComponent` for a position is the engine's main bounds check. Coupling it to a method that semantically returns null on miss is fragile.
- **Suggested fix**: Make `SpatialGrid` expose an explicit `assertBounds(x, y)` (it already exists privately) or have `World` keep its own integer-bounds check. Either way, do not rely on `getAt`.

### Tag/metadata removal on `destroyEntity` is invisible in the `TickDiff`
- **File**: `src/world.ts:301-321`, `src/world.ts:1097-1123`, `src/world.ts:1192-1205`
- **Problem**: `removeEntityTags`/`removeEntityMeta` mutate `entityTags`/`tagIndex` directly without inserting into `tagsDirtyEntities`/`metaDirtyEntities`. When a tagged entity is destroyed, the `TickDiff` only carries it in `entities.destroyed`; `tags`/`metadata` arrays do not reflect that those tags vanished. A `RenderAdapter` or AI consumer rebuilding state from raw diffs has to know that destruction is also a tag/meta wipe; the contract is not encoded in the data.
- **Why it matters**: It diverges from the explicit "entity tags/metadata appear in diff" contract documented in ARCHITECTURE.md, and depends on consumers correlating two unrelated diff sub-collections.
- **Suggested fix**: In `removeEntityTags`/`removeEntityMeta`, before deleting indexes, push the entity into the corresponding dirty sets if it had any. The diff entry is naturally `{ entity, tags: [] }`/`{ entity, meta: {} }` (current behaviour for cleared sets), which tells the consumer "now empty".

### `setState`'s typed overload reuses `TComponents`, conflating world state with components
- **File**: `src/world.ts:979-991`, `src/world.ts:354-372`
- **Problem**: `setState<K extends keyof TComponents & string>(key: K, value: TComponents[K])` uses the same generic registry as `setComponent`/`getComponent`. A user typing `World<E, C, { terrain: { biome: string } }>` finds that `terrain` is simultaneously a state key and a component key, and `setState('terrain', ...)` and `setComponent(0, 'terrain', ...)` write to two separate stores using the same type for very different things.
- **Why it matters**: For an AI-native API surface, this is a near-certain source of "why did my serialized state appear twice?" or "why did my state survive `destroyEntity` of entity 0?" confusion. Components are entity-keyed and disappear with the entity; state is global and does not.
- **Suggested fix**: Accept a separate `TState extends Record<string, unknown>` generic on `World`, default it to `Record<string, unknown>`, and type `setState`/`getState`/`hasState`/`deleteState` against `TState`. Keep `TComponents` solely for entity components.

### Path queue overflow uses splice-based shifting
- **File**: `src/path-service.ts:177-181`
- **Problem**: `compact()` uses `this.pending.slice(this.head)` to drop already-processed entries. The condition `this.head < 1024 && this.head * 2 < this.pending.length` keeps ratio bounded, but until the threshold is hit, `pendingCount` keeps allocating linearly with total enqueued requests since the last compaction. For a long-running scenario that keeps pumping path requests, the `pending` array's underlying buffer grows without bound between compactions.
- **Why it matters**: The whole point of the head/tail ring is constant-memory queueing. The current implementation is closer to "shift every once in a while". This shows up as monotonically increasing memory in long sessions.
- **Suggested fix**: Use a true ring buffer (write index wraps, capacity doubled on overflow), or keep the splice approach but compact more aggressively (e.g. when `head > some constant`).

### `WorldHistoryRecorder.recordTick` shares a reference to user-provided debug payload
- **File**: `src/history-recorder.ts:207-220`, `src/history-recorder.ts:253-259`
- **Problem**: `captureDebug()` calls the user's `debugCapture()` and runs `assertJsonCompatible` on the result, but does not clone it. The same reference is stashed in `tickEntries[i].debug`. If the user's debug capture returns a memoized live structure (very plausible for a `WorldDebugger` probe that returns its internal state), later mutation of that structure will corrupt the stored history. Reading via `getTickHistory()` does deep-clone, but only at read time.
- **Why it matters**: The recorder is sold as a deterministic history. Holding a shared reference between record-time and read-time defeats that promise for any non-trivial probe.
- **Suggested fix**: Clone `debug` at record time (`cloneJsonValue(debug, ...)`), not just at read time.

### `WorldDebugger.summarizeSpatial` reads `snapshot.components[positionKey]` without filtering by alive entity
- **File**: `src/world-debugger.ts:141-159`, `src/world.ts:742-802`
- **Problem**: The debugger uses `snapshot.components[snapshot.config.positionKey ?? 'position'] ?? []` to summarize cell counts. Since `World.serialize()` writes ALL component entries (not filtered by `entityManager.alive`), if `destroyEntity` ever fails to clean up a position component (which currently it cannot, but the invariant is implicit), the debugger over-counts. More immediately, `entitiesWithoutPosition: Math.max(0, entityCount - positions.length)` quietly clamps the inconsistency to 0 instead of warning.
- **Why it matters**: This is the AI-facing summary, so silent inconsistencies undermine its utility for diagnosis.
- **Suggested fix**: Cross-check `positions[i].entityId` against `snapshot.entities.alive`; emit a warning issue if any orphan position is found, rather than swallowing it in `Math.max(0, ...)`.

### `RenderAdapter.connect()` calls `world.serialize()` for the snapshot, which does a full JSON-compat walk
- **File**: `src/render-adapter.ts:160-186`
- **Problem**: `buildSnapshot` calls `world.serialize()` only to read `entities.alive`/`entities.generations` and the alive-set cardinality. `serialize()` runs `assertJsonCompatible` over every component on every entity — an expensive operation that is needed for the snapshot wire format but completely unnecessary just to enumerate alive entity refs.
- **Why it matters**: A renderer client that connects mid-session pays a snapshot-sized JSON-validation cost for what should be a constant-time read.
- **Suggested fix**: Iterate `world.getAliveEntities()` (introduce that primitive) directly instead of round-tripping through `serialize()`.

# Low / Polish

### `EventBus.getEvents` returns the live buffer instead of a frozen view
- **File**: `src/event-bus.ts:42-47`
- **Problem**: The signature is `ReadonlyArray<...>` but the returned reference is the same `this.buffer` instance. Tests and the docs treat it as read-only; nothing prevents a consumer from `(world.getEvents() as any).push(...)` and corrupting the per-tick buffer.
- **Suggested fix**: Return `Object.freeze(this.buffer.slice())` once per tick (cache it; clear cache in `clear()`), or document explicitly that the returned array is owned by the engine.

### `EntityManager.fromState` does not validate input
- **File**: `src/entity-manager.ts:72-83`
- **Problem**: Unlike `ResourceStore.fromState` and `DeterministicRandom.fromState`, this accepts any input and trusts it. `World.deserialize` checks `generations.length === alive.length` but other invariants (e.g. that every `freeList` entry corresponds to `alive[i] === false`) are not checked.
- **Suggested fix**: Validate freeList membership and array length, throw on mismatch with the same error style as the other `fromState` helpers.

### `ResourceStore.fromState` does not enforce `pool.current <= pool.max`
- **File**: `src/resource-store.ts:297-344`
- **Problem**: A snapshot can carry `current: 999, max: 100`. After load, the pool happily exposes `current = 999` until processTick runs (production is capped at max but consumption is not, so values just sit there until removed).
- **Suggested fix**: Clamp `pool.current` to `maxCapacity(pool.max)` (mirrors `setResourceMax`) at load time.

### `ResourceStore.fromState` accepts duplicate transfer ids and ids >= `nextTransferId`
- **File**: `src/resource-store.ts:333-341`
- **Problem**: There is no check that `transfer.id < nextTransferId` or that transfer ids are unique. A maliciously or accidentally edited snapshot can produce two transfers with the same id; `removeTransfer(id)` then removes only one.
- **Suggested fix**: Sanity-check uniqueness and `id < nextTransferId` while loading.

### `clearRunningState` and BTState contract are silently violated by uninitialized state
- **File**: `src/behavior-tree.ts:55-87`, `src/behavior-tree.ts:186-188`
- **Problem**: `SelectorNode.tick`/`SequenceNode.tick` use `Math.max(state.running[this.index], 0)`. If a user shares a BTState across two trees of different sizes, or stores a partially-zeroed state, `state.running[this.index]` may be `undefined`. `Math.max(undefined, 0)` is `NaN`; the for-loop `for (let i = NaN; i < ...)` evaluates to false on the first comparison and the node returns `FAILURE` without invoking any child.
- **Suggested fix**: In `createBTState`, freeze `running.length` to `tree.nodeCount` and assert in tick handlers that `state.running.length >= node.index + node.nodeCount`. Or default `state.running[this.index] ?? -1` instead of relying on `Math.max(undefined, 0)`.

### `findPath` does not validate that costs are non-negative
- **File**: `src/pathfinding.ts:127-143`, `src/path-service.ts:232-235`
- **Problem**: A user-supplied `cost` callback can return negative numbers. `findPath` happily expands those edges; with a non-zero heuristic the algorithm is no longer correct (admissibility broken). `maxIterations` masks termination but the result is wrong.
- **Suggested fix**: In the inner loop, either reject negative `edgeCost` (`continue` like the infinite case) or check for it once at config-validation time and document the precondition.

### `noise.ts` `dot2(g: number[]...)` accepts a tuple-typed array but indexes by `[0]`/`[1]`
- **File**: `src/noise.ts:36-38`
- **Problem**: `GRAD2` is `number[][]`. The interpretation of `gi0/gi1/gi2 % 8` reaching outside `GRAD2.length === 8` is fine, but `dot2(GRAD2[gi0], ...)` is one step removed from a `RangeError` if `GRAD2` is ever shrunk. The `% 8` masking is correct today but undocumented as load-bearing.
- **Suggested fix**: Make `GRAD2` `as const` (`readonly [number, number][]`) and assert its length; or compute index as `gi & 7`.

### `World.findNearest`'s outer iteration uses Math.max(width, height) but euclidean distance is ~hypot
- **File**: `src/world.ts:505`
- **Problem**: `maxRadius = Math.max(this.spatialGrid.width, this.spatialGrid.height)` is correct as an upper bound for Chebyshev distance, but with euclidean metric default the diagonal max is `~hypot(width, height)`. With a far entity in a narrow grid, the inner radius might never reach it. In practice `getInRadius` clamps to the grid bounds and the euclidean filter is a subset, so the function will eventually scan the whole grid; but the loop structure is misleading.
- **Suggested fix**: Use `Math.ceil(Math.hypot(width, height))` (or document Chebyshev semantics) for clarity.

### `WorldHistoryRecorder.pushBounded` uses `splice(0, n)` which is O(n) per overflow
- **File**: `src/history-recorder.ts:425-430`
- **Problem**: For high-capacity histories the splice cost dominates; trivial to replace with `target.shift()` once or a head/tail pair.
- **Suggested fix**: For modest capacities the current code is fine; if scaling matters, switch to ring-buffer semantics like `path-service.PathRequestQueue`.

### `OccupancyBindingWorldHooks.world: unknown` types are looser than necessary
- **File**: `src/occupancy-grid.ts:133-141`
- **Problem**: The hooks interface accepts a callback typed as `(id: EntityId, world: unknown)`. The actual binding never uses `world` (the destroy callback ignores it), but a third-party adapter has to use `unknown` casts to bridge.
- **Suggested fix**: Drop the second argument or type it as `void`.

### `submitWithResult` and the boolean fast-path duplicate `validateCommand` work
- **File**: `src/world.ts:616-660`
- **Problem**: `submit()` re-runs `validateCommand` after deciding to fast-path; `submitWithResult` runs it again from scratch. There is no factor-out of the work, so any change to the validator pipeline must be applied in both branches.
- **Suggested fix**: Have `submit()` always delegate to `submitWithResult()` and gate emission on listener presence inside `emitCommandResult`. The "fast path" then becomes "skip the listener loop" rather than "skip the result object".

### `World.deserialize` cannot register `ComponentStoreOptions` for components in the snapshot
- **File**: `src/world.ts:804-873`
- **Problem**: This is the same root cause as the snapshot/diffMode bug above, but additionally there is no overload of `deserialize` that lets the caller supply per-component options externally. So even if the caller knows the diffMode they want, they cannot tell the deserialized world.
- **Suggested fix**: Accept an optional `componentOptions?: Record<string, ComponentStoreOptions>` parameter and pass it to `ComponentStore.fromEntries`.

### `serialize()` builds `tags`/`metadata` records keyed by stringified numbers
- **File**: `src/world.ts:772-788`
- **Problem**: `tags: Record<number, string[]>` is declared but in practice JSON-stringified, then `Object.entries` rehydrates with `string` keys that `Number()` parses. Edge case: if a malicious caller crafts a snapshot with non-integer keys, `Number('abc')` is `NaN`, and `addTagInternal(NaN, 'foo')` adds an entry under `entityTags.get(NaN)` that no later reverse-lookup can ever match (since alive entity IDs are non-negative integers).
- **Suggested fix**: Validate `Number.isInteger(entityId) && entityId >= 0` in the deserialize loop; throw with a clear error otherwise.

### `Listener<never>` cast in `EventBus.on` defeats type checking inside the engine
- **File**: `src/event-bus.ts:20-30`
- **Problem**: Storing listeners as `Set<Listener<never>>` and casting on emit is the standard way around variance, but it defeats the assertion that `listeners.get(type)` returns the right `K`. A future refactor that mismatches the key from the listener type would not be caught at the engine boundary.
- **Suggested fix**: Use a discriminated map type or accept the cast and add a runtime assertion in dev builds. Mostly a polish point.

### `RenderAdapter.collectEntityChanges` runs `[...byId.values()].sort` for every diff
- **File**: `src/render-adapter.ts:288-348`
- **Problem**: `componentKeys.push(key)` then `uniqueSorted` per change is fine, but for small diffs the sort dominates. Not urgent; just noting that this is on the renderer hot path.
- **Suggested fix**: If profiling shows it matters, accumulate into a `Set<string>` directly during the build.

# Notes & Open Questions

- `World` constructor's GameLoop `onError: () => this.gameLoop.pause()` is awkward: by the time `onError` runs, `GameLoop.loop` has already called `stop()`. So the world ends up with `running = false` AND `paused = true`, and there is no surfaced affordance to recover (the user must call `world.start()` and then `world.resume()`). Is this intentional, or should world expose a "recover from tick failure" entry point? See `src/world.ts:285-292` and `src/game-loop.ts:115-123`.
- The architecture document ("Tags & Metadata are owned by World … cleaned up on entity destruction, included in serialization and diffs") explicitly states that destruction-time tag/meta cleanup appears in diffs. The implementation does not (medium finding above). Worth confirming whether the doc or the code is canonical.
- `setState`'s overload using `TComponents` (medium finding above) is covered by a passing test (`tests/world-state.test.ts:96-104`), suggesting the conflation may be deliberate. If so, it should be documented; if not, it is an API mistake locked in by tests.
- `WorldHistoryRecorder` keeps `commandCapacity` defaulted to `tickCapacity * 4`. For long-running scenarios this is a per-second growth rate of `tps × 4` slots regardless of how many commands actually arrive — almost always over-provisioned. Worth making it `Math.max(0, capacity)` and letting the caller opt in.
- `World.processCommands`' return shape `{ processed, failure }` is not exposed anywhere on `WorldMetrics`. The only signal that a command failed is `metrics.commandStats.processed < metrics.commandStats.pendingBeforeTick` plus a non-null `failure`. Whether this is sufficient depends on whether agents are expected to combine both signals. Adding `dropped: number` would be cheap.
- `ComponentStore.diffMode === 'semantic'` documents itself as "suppresses blind rewrites in the diff" (devlog 2026-04-23). The implementation correctly suppresses dirty marking on identical writes, but the all-entities baseline scan in `getDirty()` (lines 82-100) still fingerprints every entity. So semantic mode reduces diff churn but does not reduce per-tick CPU; this matches the docs but is worth flagging because users may assume otherwise.
- `findPath` permits a user heuristic that overestimates (inadmissible) and silently produces non-optimal paths. The pathfinding tests (`tests/pathfinding.test.ts`) explicitly cover an inadmissible heuristic case as expected behavior. If that's intentional, it should be in the function's JSDoc to keep AI agents from reading too much into "optimal path".
