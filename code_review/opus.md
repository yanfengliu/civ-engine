# Code Review: agent/fix-full-review-2026-04-25

Scope: 8 commits (`61046c7..3493d21`) implementing fixes for the 2026-04-25 full-codebase review. Reviewed against `code_review/diff.patch` and the on-branch source. Working-tree-only changes (e.g. `markDying`/`releaseId` additions in `entity-manager.ts`) are intentionally excluded — the review is of the BRANCH state, not the working copy.

Bottom-line summary: most fixes are sound. **Three new bugs** were introduced by the fixes themselves: a critical entity-id-recycle hazard inside `destroyEntity`, two real escape hatches in the new "fail-fast / poison" mechanism (real-time loop bypass and stale `lastTickFailure` after `recover()`), plus two regressions under the heading of "defensive copies" that are still shallow.

---

## CRITICAL

### CR1. `destroyEntity` now exposes a callback-id-recycle hazard (regression introduced by H4 fix)

- **Files:** `src/world.ts:304-326` (branch tip `3fb819a`); `src/entity-manager.ts:11-25, 27-34`.
- **What changed:** Per the H4 fix, `entityManager.destroy(id)` was moved to BEFORE the `destroyCallbacks` loop, instead of after the cleanup. The comment correctly explains why this prevents recursion. But `EntityManager.destroy` does two things in one call: it marks the entity dead AND pushes the id onto the `freeList` (entity-manager.ts:32 `this.freeList.push(id)`). `EntityManager.create()` pops from `freeList` first (entity-manager.ts:12-17). So:
  1. `destroyEntity(E)` calls `entityManager.destroy(E)` → `E` is dead AND on the free list.
  2. A `onDestroy` callback runs and synchronously calls `world.createEntity()`. This recycles `E` (with a bumped generation), so callers immediately see a NEW entity at the same id, possibly with a stale signature/component set/tags/meta from the not-yet-cleaned-up old entity.
  3. The destroy continues into the cleanup tail: `componentStores.values().remove(E)`, `removeEntityTags(E)`, `removeEntityMeta(E)`, `resourceStore.removeEntity(E)`, etc. These now wipe the **new** entity's components, tags, meta, etc.
- **Impact:** Silent component/tag/meta loss on the freshly-created entity, plus any spatial-grid/`previousPositions` cleanup applies to the wrong entity. This is exactly the kind of bug that `markDying`/`releaseId` (present in the working tree but NOT on-branch) was added to prevent. The branch as committed has the bug; the new H4 test (`tests/world-destroy.test.ts:40-49`) does NOT exercise the recycle path, so it gives a false sense of safety.
- **Recommended fix:** Either (a) split `EntityManager.destroy` into "mark dying" + "release id" (mirrors the working-tree approach), and call `releaseId` only after the cleanup tail; or (b) defer the `freeList.push` until after `destroyEntity`'s cleanup tail completes; or (c) at minimum, add a regression test that creates an entity inside the destroy callback and asserts the new entity is independent.

### CR2. Poison check is bypassed by the real-time `gameLoop.start()` path

- **Files:** `src/world.ts:561-595` (`step` / `stepWithResult` poison guards), `src/game-loop.ts:43-49, 105-143` (`step` / `loop`), `src/world.ts:621-623` (`world.start`).
- **What's wrong:** `world.step()` and `world.stepWithResult()` correctly throw / return `world_poisoned` when `this.poisoned` is non-null. But `world.start()` delegates to `gameLoop.start()`, which schedules `loop()`. Inside `loop()` (game-loop.ts:120-136) the per-frame work calls `this.step()` (the GameLoop's own `step()`, not `world.step()`), which directly calls `onTick()` = `executeTickOrThrow` (world.ts:290). `executeTickOrThrow` (world.ts:1687) calls `runTick` directly with **no poison guard**. So a user that experienced a tick failure, observed `isPoisoned() === true`, and then called `world.start()` (perhaps unaware of the poison contract) gets the loop running again on a poisoned world. Worse, because the on-error path in the constructor calls `gameLoop.pause()` (world.ts:292-294) but `gameLoop.loop()`'s catch already called `this.stop()` first (game-loop.ts:127-130), the next `world.start()` cleanly transitions `running = true` and resumes ticking.
- **Impact:** The user-visible "poisoned until you call recover()" contract documented in the test (`tests/world-commands.test.ts:1642-1661`) is half-implemented. The synchronous-step paths honor it; the async-loop path silently re-enters the broken state.
- **Recommended fix:** Add the poison guard to `world.start()` (or to `executeTickOrThrow`) — same pattern as `step()`, throw `WorldTickFailureError` if `this.poisoned`. Add a test: poison the world, call `world.start()`, assert it throws (or assert `isPoisoned()` blocks the loop from running ticks).

### CR3. `recover()` leaves `lastTickFailure` (and indirectly `getObservableTick`) wedged at the failed tick

- **Files:** `src/world.ts:601-603` (`recover`), `src/world.ts:977-979` (`getLastTickFailure`), `src/world.ts:1159-1166` (`getObservableTick`), `src/world.ts:1660-1661` (failure path), `src/world.ts:1418-1423` (success path clears it).
- **What's wrong:** `recover()` only clears `this.poisoned = null`. It does NOT clear `this.lastTickFailure`. The success path in `runTick` only clears `lastTickFailure = null` AFTER a clean tick completes. So the public observation surface is inconsistent right after `recover()`:
  - `isPoisoned()` → `false` ✓
  - `getLastTickFailure()` → returns the prior failure (still pointing to the just-recovered-from event)
  - `getObservableTick()` → `Math.max(gameLoop.tick, ..., lastTickFailure?.tick)` includes the failed tick's number (`gameLoop.tick + 1` from the failed tick's metrics), so the observable tick is **one ahead of `world.tick`** until the next successful tick advances `gameLoop.tick`.
  - `world.serialize()` writes `tick: getObservableTick()` (world.ts:820, 849). A snapshot taken between `recover()` and the next successful step will have `snapshot.tick = N+1` while `world.tick = N`. After `World.deserialize`, the new world's `gameLoop.tick` is set to N+1 (world.ts:950), effectively skipping a tick number.
- **Impact:** Save-load asymmetry. AI agents reading `getObservableTick()` after `recover()` see a tick number for which no diff exists, and any history recorder that pairs metrics with diffs sees an off-by-one window.
- **Recommended fix:** In `recover()`, also clear `this.lastTickFailure = null` and `this.currentDiff = null`. Optionally also reset the `currentMetrics` so `getMetrics()` doesn't return stale data either. Add a test: poison → recover → assert `getLastTickFailure() === null` and `getObservableTick() === world.tick`.

---

## HIGH

### H_NEW1. `cloneTickDiff` is shallow — component data, state values, and pool entries leak live references

- **Files:** `src/world.ts:946` (the `getDiff` call), `src/world.ts:2206-2239` (`cloneTickDiff`), `src/event-bus.ts:43-47` (`getEvents`).
- **What's wrong:** `cloneTickDiff` cleanly copies the outer arrays/maps/sets, but inner structured payloads are shared with the engine:
  - `components[key].set` is built via `entry.set.map(([id, data]) => [id, data])`. The `data` object reference is identical to what's in the live `ComponentStore`. A caller doing `diff.components.position.set[0][1].x = 999` writes through to the live component.
  - `state.set` is `{ ...diff.state.set }` — the outer record is cloned, but each value is shared with `world.stateStore`.
  - `resources[key].set` does spread the pool object (`{ ...pool }`), which is sufficient because `Pool` is flat — but if `Pool` ever gains a nested field (e.g. metadata), this becomes a leak too.
- `EventBus.getEvents` returns `[...this.buffer]` — the array is fresh, but each event's `data` payload is a live reference to the user's emit payload.
- **Impact:** The new tests (`tests/world.test.ts:11-31`) assert independence at the OUTER-array level only; they don't catch the inner-data leak. The "M1 / defensive view" intent — "any `as any` cast or naive renderer adapter can mutate them" — is only partially achieved. AI agents running renderer adapters that hold onto a diff while subsequent ticks happen can still corrupt engine state via inner mutation.
- **Recommended fix:** Either (a) deep-clone the payloads in `cloneTickDiff` / `getEvents` (use `cloneJsonValue` from `src/json.ts` — which is already used elsewhere for this exact reason), or (b) document that "defensive copy" means structurally-defensive only, and direct callers to `cloneJsonValue` themselves. Option (a) is consistent with the rest of the codebase.

### H_NEW2. Tick numbering races on poison: failed tick consumes a tick number, next successful tick reuses it

- **Files:** `src/world.ts:1304-1309` (`runTick` start), `src/world.ts:1328` (commands tick), `src/world.ts:1418-1424` (advance on success), `src/world.ts:1635-1651` (`finalizeTickFailure`).
- **What's wrong:** When a tick fails before `gameLoop.advance()`, `gameLoop.tick` stays at N. But every emitted event (`emitCommandExecution`, `emitTickFailure`) from that failed tick stamps `tick: N+1` (because `metrics.tick = gameLoop.tick + 1` at runTick start). After `recover()`, the next successful tick computes `tick = gameLoop.tick + 1 = N+1` again. So the same tick number appears twice on the event stream: once for the failed tick's drop emissions, once for the next successful tick's diff/listeners. A consumer correlating events by tick number cannot distinguish them.
- **Impact:** History recorders, AI-agent training transcripts, and replay tools that key off `tick` will see "two ticks numbered N+1" with different content. Either (a) the failed tick's command-execution events should be stamped with the failed-tick number AND the next successful tick should skip past that number; or (b) the failed tick should NOT consume a tick number on the events it emits. The current code does (b) implicitly for `gameLoop.tick` but stamps events with the would-be tick number, getting the worst of both.
- **Recommended fix:** Pick a stable contract: either advance gameLoop.tick on failure (so failed tick's number is consumed) and document failed-tick numbers as visible; OR stamp failed-tick events with `gameLoop.tick + 0.5` / a `failed: true` marker so consumers can disambiguate. Add a test: cause a failure, recover, succeed, assert tick numbers across the event stream are disjoint and monotonic.

### H_NEW3. `findNearest` traded O(R³)-best-case-fast for O(W·H)-always — sparse-grid regression

- **File:** `src/world.ts:521-543`.
- **What's wrong:** The new code calls `getInRadius(cx, cy, max(width, height))` exactly once. With a euclidean radius this large and the grid bounds clipping the bounding box, the function visits **every cell of the grid** on every `findNearest` call (`spatial-grid.ts:114-150`). For a 1000×1000 grid with one entity, the OLD O(R³) algorithm could exit when the first ring containing the entity was found — typically O(R²) = O(distance²). The NEW algorithm always does O(W·H) = O(10⁶) cell visits. This is a strict performance regression for the canonical "find nearest target on a sparse battlefield" use case.
- **Impact:** AI agents calling `findNearest` in their decision loop will see roughly W·H/R² slowdowns, where R is the typical answer distance. The earlier review (H3) explicitly offered two options — "(a) call `getInRadius(cx, cy, maxRadius)` once" OR "(b) introduce a `getInShell(cx, cy, r)` primitive". The fix took (a), the simpler but slower-in-the-common-case option, without flagging the trade-off in the commit message or adding a perf benchmark. (Option (b) is the correct general answer.)
- **Recommended fix:** Implement `getInShell(cx, cy, r)` (perimeter-only scan) and keep the outer loop, OR add an early-exit "stop when ring radius² > best distance²" check to the current single-scan version. Either preserves the correctness and unifies the worst-case (no entity exists) cost.

---

## MEDIUM

### M_NEW1. `setMetaInternal`'s uniqueness throw leaves an empty `Map` in `entityMeta` for fresh entities

- **File:** `src/world.ts:1216-1245`.
- **What's wrong:** When `setMetaInternal(E, key, value)` is the first metadata write for `E`, the function unconditionally creates `meta = new Map()` and stores it in `entityMeta` (lines 1217-1221) **before** the uniqueness check. If the uniqueness check throws (lines 1227-1238), the empty `Map` remains in `entityMeta`. Subsequent `entityMeta.has(E)` returns `true` even though no metadata was successfully set; iteration in `buildDiff` skips it harmlessly (the inner loop yields nothing) but `metaDirtyEntities` would then carry an empty diff entry on first successful `setMeta`.
- **Impact:** Minor leak; not a state corruption, but it weakens the "rejection leaves index unchanged" claim. The existing test exercises the throw path on collision but doesn't observe `entityMeta` directly.
- **Recommended fix:** Defer the `entityMeta.set(entity, meta)` until after the uniqueness check passes; or in the throw branch, also `entityMeta.delete(entity)` if `meta.size === 0`. Add a test: `setMeta(E, k, conflicting)` throws → assert `getMeta(E, k) === undefined` AND assert no diff entry for `E` after the next tick.

### M_NEW2. `componentBits.size` may exceed 64 silently after deserialize, but the snapshot path doesn't validate

- **Files:** `src/world.ts:861-958` (`deserialize`), `src/world.ts:1981-1997` (`registerComponentBit`).
- **What's wrong:** `registerComponentBit` (called for each component during `rebuildComponentSignatures`) advances `nextComponentBit`. If a v5 snapshot somehow contains > 64 components (manually crafted, malicious, or future-large schema), the bigint mask logic still works but the implicit "65th bit" allocation is silent. This isn't a regression from this PR (the underlying logic is unchanged), but the new entity-id key validation in the snapshot path (lines 911-915, 920-924) sets a precedent for input-shape validation that's not extended to component count.
- **Impact:** Low; snapshot integrity is largely already trusted. Flagged for completeness because the PR is the right time to harden snapshot validation.
- **Recommended fix:** Optional. Either tighten or document.

### M_NEW3. Reactive nodes still don't clear preempted siblings at indices BELOW the matched child

- **Files:** `src/behavior-tree.ts:123-181` (`ReactiveSelectorNode` / `ReactiveSequenceNode`), `src/behavior-tree.ts:183-195` (`clearReactivePreempted`).
- **What's wrong:** `clearReactivePreempted(state, children, i + 1)` clears children at indices `> i`. Consider this scenario for a `ReactiveSelector([A, B])`:
  - Tick 1: `A` returns FAILURE (its own `state.running[A.index] = -1` ✓), `B` returns RUNNING with deep state stored at `state.running[B.index..]`.
  - Tick 2: `A` returns RUNNING (e.g., a new condition flips). The reactive selector returns RUNNING at i=0, calls `clearReactivePreempted(state, children, 1)` → clears `B`. ✓ This case is correct.
  - Tick 3: `A` returns FAILURE again (condition flips back), `B` runs. `B`'s state was cleared on tick 2, so it restarts cleanly. ✓
- However, the reactive nodes DO NOT clear the running state of children at indices `< i` if those children had stale RUNNING state from prior ticks. Example: `ReactiveSelector([A, B])`, tick 1: `A→FAILURE` (clean), `B→RUNNING` (deep state set). Tick 2: `A→RUNNING` at i=0, clear B ✓. Tick 3: `A→FAILURE`, `B→...`. **But what if A's interior had transient RUNNING state from somewhere we missed?** A's own `state.running[A.index]` is correctly -1 (since it returned FAILURE), but A's deep descendants' `state.running` indices are NOT cleared. This is the same pre-existing "Sequence-FAILURE-doesn't-recursively-clear" bug; the H5 fix doesn't claim to address it but it limits the value of the `reactive*` primitive: deep state in a failed branch can still leak.
- **Impact:** The H5 test passes because it uses simple sequences whose own failure resets their own running index. A nested reactive-inside-reactive scenario would still be vulnerable.
- **Recommended fix:** Optional. Either (a) document that reactive nodes only clear ABANDONED siblings (children with index > matched), not failed siblings' interiors; or (b) call `clearReactivePreempted(state, children, 0)` (clear ALL siblings every tick) and let the matched child re-establish its running state inside the loop. Option (b) is simpler and correct, at the cost of one extra O(N) wipe per reactive tick.

### M_NEW4. `dropPendingCommands` correctly orders the failed-vs-dropped events, but the dropped commands are emitted with the FAILED tick number — agents can't tell "this tick aborted" from "this command would have run on tick N"

- **Files:** `src/world.ts:1448-1577`.
- **What's wrong:** Order is correct: failed command's `executed: false` event fires before the drops (verified at lines 1459-1466 + 1467 for missing-handler; lines 1494-1503 + 1504 for command_handler_threw). The `tick` field on each dropped command's emission is the same `tick` (= `gameLoop.tick + 1`). But because the tick FAILED, none of these commands actually ran at tick N+1, and the next successful tick will reuse the number (CR2-related). Consumers can identify "this is a drop" by `code: 'tick_aborted_before_handler'`, but if they group by tick number they conflate the failed-tick drops with the next-tick's events.
- **Impact:** Minor; downstream code that filters by `code` is unaffected. Code that bins by tick number sees a doubled bin.
- **Recommended fix:** Same as H_NEW2 — clarify the tick-number contract for failed ticks.

---

## LOW / POLISH

### L_NEW1. `GameLoop.step()` no longer auto-advances; external GameLoop users (without World) get silently broken

- **Files:** `src/game-loop.ts:43-49, 105-143` (`loop` calls `step` without `advance`); test changes in `tests/game-loop.test.ts`.
- **What's wrong:** `gameLoop.step()` now only calls `onTick`. The internal `loop()` (used by `gameLoop.start()`) calls `this.step()` per frame, never `this.advance()`. World users are unaffected because `world.runTick` calls `gameLoop.advance()` itself. But the GameLoop is exported (`src/game-loop.ts:1`) — any external user that imports `GameLoop` directly and uses `loop()` to drive ticks now has their tick frozen at 0.
- **Impact:** Breaking API change for direct GameLoop users (rare, but possible). The test was updated to reflect the new contract but the public-API breakage isn't documented.
- **Recommended fix:** Either (a) have `GameLoop.loop()` call both `step()` and `advance()` per iteration (and rely on World's `executeTickOrThrow` to throw before `advance` happens — which it does, via the tickFailure path returning early in runTick); or (b) document the API change in the README/CHANGELOG. (a) is cleaner and matches the prior contract.

### L_NEW2. `cloneTickDiff` allocation cost is paid on every `getDiff()` call, even when caller doesn't mutate

- **File:** `src/world.ts:946, 2206-2239`.
- **What's wrong:** `getDiff()` now always builds a full clone, even for read-only consumers. For a busy tick with many components, this is several map/array allocations per call. Most callers (renderers, recorders) read once per tick and don't mutate. A `getDiffReadOnly()` that returns the live diff (with appropriate type-only `ReadonlyDeep<TickDiff>`) would let the few mutating callers opt-in to the clone.
- **Impact:** Profiling-gated; not urgent.
- **Recommended fix:** Optional — measure first.

### L_NEW3. The empty `EMPTY_SET` / `EMPTY_STRING_SET` sentinels remain shared across calls and aren't frozen

- **File:** `src/world.ts:1100-1126` (`getByTag`, `getTags`).
- **What's wrong:** When the lookup misses, `getByTag` / `getTags` return shared `EMPTY_SET` / `EMPTY_STRING_SET` constants without copying. A caller that does `world.getByTag('missing-tag').add(...)` (TypeScript-only protection) would corrupt the shared sentinel for everyone. The "hit" branch correctly returns `new Set(set)`, but the "miss" branch is unprotected.
- **Impact:** Defensive-view contract is half-honored. Trivial to fix.
- **Recommended fix:** Either return `new Set()` on miss too, or `Object.freeze(EMPTY_SET)` at module-init (but `Set` doesn't freeze cleanly — better to allocate-on-miss).

### L_NEW4. `componentOptions: Record<string, ComponentStoreOptions>` in v5 snapshot is non-optional but can be missing in user-provided malformed snapshots

- **File:** `src/serializer.ts:60-77`, `src/world.ts:877-880`.
- **What's wrong:** The `WorldSnapshotV5` interface declares `componentOptions: Record<string, ComponentStoreOptions>` as required. The deserialize path defends against a missing field with `'componentOptions' in snapshot && snapshot.componentOptions ? snapshot.componentOptions : {}`. This is fine, but it blurs the type contract: a v5 snapshot is allowed to be missing a "required" field at runtime. Either the field should be `componentOptions?: ...` (optional), or the deserialize check should throw on a v5 missing it.
- **Recommended fix:** Make the field optional in the interface, since deserialize handles its absence.

---

## APPROVE

The remaining fixes look correct and well-tested:

- **C1 (`ComponentStore` strict-mode JSON.stringify):** The strict-mode set/clearDirty/getDirty paths now skip fingerprint work as documented. The `detectInPlaceMutations` opt-out is well-designed and the new tests cover both default and opt-out paths. Note one nice detail: the `set()` path in semantic mode preserves the `wasPresent && fingerprint match → early return` optimization, AND the new path correctly removes the entity from `removedSet` on re-set (which addresses the M2 finding from the original review — `set` after `remove` no longer leaves the entity in both arrays). Verified at `src/component-store.ts:33-60`.
- **H6 (snapshot config):** `maxTicksPerFrame` and `instrumentationProfile` are serialized only when non-default, deserialized via `new World(snapshot.config)`. v4 snapshots fall through cleanly. Roundtrip test covers it.
- **H7 (per-component diffMode):** `componentOptions` threaded through `World.deserialize → ComponentStore.fromEntries`. v4 snapshots fall through (empty options → strict default). Roundtrip test verifies semantic-mode preservation.
- **M3 (pathfinding `maxCost` continue):** Correct change at `src/pathfinding.ts:120`. Negative-edge filter at line 131 is also correct.
- **M5 (VisibilityMap.getState flush):** `update()` called at top; correct.
- **M6 (ResourceStore.fromState):** Duplicate transfer-id detection, `nextTransferId` normalization, pool clamp — all correct.
- **L8 (EntityManager.fromState):** Length-mismatch, freeList alive/duplicate/range validation — all correct.
- **L9 (entity-id key validation):** Correct.
- **L5 (noise GRAD2):** `as const` + `& 7` instead of `% 8` — correct.
- **M9 (assertPositionInBounds):** Now uses `assertBounds` directly. The `assertBounds` method is correctly made public on `SpatialGrid`.
- **M11 (path queue compaction):** Threshold lowered from 1024 to 256. Reasonable.
- **M12 (history recorder debug clone):** `cloneJsonValue` at record time replaces validate-only — correct.
- **L7 (submit unification):** `submit()` always delegates to `submitWithResult().accepted`. Sequence assignment is now consistent across profiles.
- **C2/H8/H9 (command-execution audit & sequence assignment):** The drop emission ORDER is correct (failed command's own event before drops, in both `missing_handler` and `command_handler_threw` paths). The `details.droppedCommands` payload on the failure object surfaces the audit. Tests cover the order assertion.
- **H2 (diff-listener tick alignment):** `gameLoop.advance()` is called inside the inner try block before listeners run; verified the listener-phase failure path still preserves `currentDiff` (`finalizeTickFailure` line 1646-1648). The new test `diff listeners observe world.tick aligned with diff.tick` correctly fails on the old code and passes on the new.

---

## Summary table

| ID | Severity | Subject | File:Line |
|---|---|---|---|
| CR1 | Critical | `destroyEntity` recycle hazard | `src/world.ts:304-326` |
| CR2 | Critical | Poison bypass via `world.start()` / real-time loop | `src/world.ts:621-623` + `src/game-loop.ts:105-143` |
| CR3 | Critical | `recover()` leaves `lastTickFailure` / `getObservableTick` wedged | `src/world.ts:601-603` |
| H_NEW1 | High | `cloneTickDiff` and `getEvents` are shallow | `src/world.ts:2206-2239`, `src/event-bus.ts:43-47` |
| H_NEW2 | High | Tick number reused after failed tick | `src/world.ts:1304-1424` |
| H_NEW3 | High | `findNearest` regressed to O(W·H) on sparse grids | `src/world.ts:521-543` |
| M_NEW1 | Medium | `setMetaInternal` leaves empty `Map` on fresh-entity throw | `src/world.ts:1216-1245` |
| M_NEW2 | Medium | Snapshot doesn't validate component count | `src/world.ts:861-958` |
| M_NEW3 | Medium | Reactive BT only clears siblings at `> i` | `src/behavior-tree.ts:123-195` |
| M_NEW4 | Medium | Dropped-commands emit on failed tick number | `src/world.ts:1448-1577` |
| L_NEW1 | Low | `GameLoop.loop()` no longer auto-advances; external users break | `src/game-loop.ts:43-49, 105-143` |
| L_NEW2 | Low | `getDiff()` always pays clone cost | `src/world.ts:946` |
| L_NEW3 | Low | `EMPTY_SET` / `EMPTY_STRING_SET` returned uncopied on miss | `src/world.ts:1100-1126` |
| L_NEW4 | Low | v5 `componentOptions` interface should be optional | `src/serializer.ts:60-77` |
