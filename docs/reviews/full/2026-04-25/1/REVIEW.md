# Full Codebase Review — 2026-04-25

Three independent reviewers ran in parallel against `main` (commit `552e76e`):

| Reviewer | Model | Mode | Output |
|---|---|---|---|
| Codex | `gpt-5.4`, `model_reasoning_effort=high` | `codex exec`, sandbox `read-only` | `raw/codex.md` |
| Gemini | `gemini-3.1-pro-preview` | `gemini -p`, `--approval-mode plan` | `raw/gemini.md` |
| Claude | Opus 4.7 (1M context) | `Agent` subagent, read-only | `raw/opus.md` |

The shared prompt is in `prompt.md`. CLI invocation conventions are now documented in `AGENTS.md`. **No code has been changed.** This document is the deliverable for user review before any fixes.

---

## Executive summary

Across ~25 distinct findings the reviewers converged on a clear picture:

- **Tick-pipeline edge cases are the biggest risk surface.** Three different tick-failure / fast-path inconsistencies were each independently flagged, all of which can silently lose data or produce inconsistent observability for an AI-agent operator. These are the strongest claims in the report and should be fixed first.
- **`ComponentStore` is doing far more work than it should.** Both Gemini and Opus identified the same hot-path JSON.stringify regression. The default ("strict") `diffMode` pays nearly the same cost as `'semantic'`, defeating the recent performance opt-in.
- **Snapshots are lossy in two distinct ways.** `WorldConfig.maxTicksPerFrame` / `instrumentationProfile` (Codex) and per-component `diffMode` (Opus) are dropped on `serialize()`/`deserialize()`. Either is a silent runtime-behavior change across save/load.
- **"Read-only" public surfaces are type-only.** Multiple getters return live engine internals typed as `ReadonlyArray`/`ReadonlySet`. Any `as any` cast — or even just a mistake in a renderer adapter — corrupts engine state.
- **Most other findings are genuine but localized.** A handful of medium/low items are concrete bug fixes; a few are debatable design questions worth a brief discussion before implementing.

What the reviewers did **not** find: no critical security issues, no broken invariants in core ECS storage (entity-manager / generations / spatial-grid main paths), no determinism breaks in the scheduler, and no test scaffolding bugs.

**Recommended fix order:** Critical → High → Medium, batched by subsystem to keep PRs reviewable. Estimated 6–8 small/medium PRs total. Detailed batch plan at the end of this doc.

---

## Methodology notes

- All three reviewers got the same prompt and the same scope (`src/`, tests, `docs/architecture/`).
- Findings below are deduplicated and re-classified into a single severity scale based on actual observed impact, not the reviewer's stated severity. Where reviewers disagreed on severity, I sided with the stronger argument and flagged the disagreement.
- **Verification status** column means:
  - ✅ I read the code and confirmed the finding is real.
  - 🟡 The claim is plausible/consistent with the code I read but I did not exhaustively verify the full claim.
  - ❓ I have a doubt or counter-argument; needs user judgement before implementing.

Spot-verifications I personally performed against the code: Gemini Critical (component-store), Opus Critical (commands lost on tick failure), Gemini High (findNearest, destroyEntity recursion, reactive BT), Codex High (serialize drops config), Opus High (snapshots drop diffMode), EventBus buffer leak.

---

## CRITICAL

### C1. `ComponentStore` runs `JSON.stringify` on the hot path regardless of `diffMode` — ✅
**Reviewers:** Gemini (Critical), Opus (Critical) — same root cause, slightly different surface area.

- **Files:** `src/component-store.ts:21-39` (`set`), `src/component-store.ts:82-100` (`getDirty`), `src/component-store.ts:102-109` (`clearDirty`).
- **What's wrong:**
  - `set()` calls `jsonFingerprint(component, …)` **before** the `wasPresent` check (line 25). The fingerprint is only consumed inside the narrow `if (this.diffMode === 'semantic' && wasPresent)` branch on lines 32–37. In strict mode (default) it is computed and discarded.
  - `clearDirty()` iterates **every** entry in the store and calls `jsonFingerprint` for each, building a baseline that strict mode never reads.
  - `getDirty()` iterates **every** entry not already in `dirtySet` and calls `jsonFingerprint` again to detect in-place mutations.
- **Impact:** For a 10K-entity / 5-mutating-component RTS-scale tick, this is on the order of 150K `JSON.stringify` calls per tick added purely to feed unused branches. The "strict is fast, semantic is the slower opt-in" mental model is broken — they pay nearly identical cost today.
- **Recommended fix:**
  1. In `set()`: only compute `fingerprint` when `diffMode === 'semantic' && wasPresent`.
  2. In `clearDirty()`: only rebuild the baseline when `diffMode === 'semantic'`.
  3. In `getDirty()`: only do the all-entities scan when `diffMode === 'semantic'`. Strict mode should rely solely on `dirtySet`/`removedSet`. Document that strict mode does **not** detect in-place mutations and direct users to either `setComponent`/`setPosition` or `diffMode: 'semantic'`.

### C2. Drained-but-unprocessed commands are silently lost on a tick failure — ✅
**Reviewers:** Opus (Critical). Codex hit a related but distinct issue (see H1).

- **Files:** `src/world.ts:1364-1432` (`processCommands`), `src/command-queue.ts:28-32` (`drain`).
- **What's wrong:** `processCommands` calls `commandQueue.drain()` once at the start of the tick, which empties the buffer. It then iterates the snapshot and `return { processed, failure }` on the first missing-handler or thrown handler — every command **after** the failed one is never executed and never re-enqueued. There is no `commandFailed`/`command_dropped` event for the dropped commands, no entries in `lastTickFailure.details`, and no surface anywhere that lets the caller know which submission sequences were lost.
- **Impact:** Silent data loss for an AI-agent pipeline whose loop is "submit → next tick → observe outcome." One badly-behaved validator/handler can cause every subsequent command in that tick to vanish without trace.
- **Recommended fix (pick one):**
  1. **Re-enqueue:** on failure, push the remaining un-executed commands back onto `commandQueue.buffer` so they retry next tick. Simplest semantics, but commands whose preconditions were invalidated by the partial tick may misbehave.
  2. **Emit failures:** for every still-pending command, fire `emitCommandExecution(..., { executed: false, code: 'tick_aborted_before_handler', submissionSequence: cmd.submissionSequence, … })` and add their sequences to `failure.details`. Makes the loss visible and auditable; lets the caller decide whether to re-submit.
  - I lean toward (2) — it preserves the engine's "explicit failure surface for AI agents" stance, and keeps behavior predictable when a tick fails for non-determinism reasons.

---

## HIGH

### H1. Failed ticks can mutate world state without advancing the tick or emitting a diff — ✅
**Reviewer:** Codex (High).

- **Files:** `src/world.ts:1217-1417` (`runTick`/`finalizeTickFailure`), `src/world.ts:1512-1525` (`step`), `src/world.ts:1572-1602` (`stepWithResult`).
- **What's wrong:** If a system or handler throws mid-tick, `finalizeTickFailure` records the failure and clears `currentDiff`, but does **not** roll back any state mutations that already happened, and `stepWithResult` does not advance `world.tick`. The world is left in a partially-mutated state with the old tick number and no diff visible to listeners.
- **Why it matters:** Replay/debug assumptions break ("if a tick fired, everything in the diff is the only change"). Agents observing `world.tick` get an inconsistent view vs. agents observing `metrics.tick` / `getObservableTick()`.
- **Recommended fix:** Two acceptable options:
  - **Transactional ticks:** snapshot before command-processing and restore on failure. Expensive but cleanly recoverable.
  - **Fail-fast:** declare failed ticks fatal, mark the world as poisoned, require explicit reset. Cheap; matches the GameLoop's `pause()-on-error` behavior. Document this in ARCHITECTURE.md and remove the recoverable-looking surfaces in `WorldStepResult`/`TickFailure`.
  - I lean toward fail-fast for the engine's first iteration; transactional ticks are a substantial complexity addition.

### H2. Diff listeners observe `world.tick` one tick behind `diff.tick` — ✅
**Reviewer:** Opus (High).

- **Files:** `src/world.ts:1206-1215`, `src/world.ts:1337-1340`, `src/game-loop.ts:37-40`, `src/world.ts:551-568`.
- **What's wrong:** `buildDiff` writes `tick: gameLoop.tick + 1`. In `step()` the loop fires diff listeners **before** incrementing `_tick`. During the listener: `world.tick === N`, `diff.tick === N+1`, `currentMetrics.tick === N+1`, `getObservableTick() === N+1`. A listener that pairs `diff.tick` with `world.tick` (or that calls `world.serialize()` alongside reading `world.tick`) sees inconsistent values.
- **Why it matters:** Renderer adapters and history recorders run inside listener callbacks; this is exactly where the bug bites integrators. "Did I see tick N already?" checks based on `world.tick` are off by one.
- **Recommended fix:** Advance `gameLoop._tick` (or `setTick(tick + 1)`) **before** firing diff listeners, so during the listener `currentDiff.tick === world.tick === metrics.tick`.

### H3. `findNearest` is O(R³) — should be O(R²) — ✅
**Reviewers:** Gemini (High), Opus (Medium). Same finding; I'm calling it High because `findNearest` is on the AI hot path.

- **File:** `src/world.ts:500-529`.
- **What's wrong:** Outer loop `r = 0..maxRadius` calls `spatialGrid.getInRadius(cx, cy, r)`, which scans the full `(2r+1)²` bounding square each call. Each iteration's result is a strict superset of the previous one, so on a sparse grid the function does Σ(2r+1)² ≈ O(R³) cell scans where O(R²) suffices.
- **Recommended fix:** Either (a) call `getInRadius(cx, cy, maxRadius)` once and find the minimum-distance entity, or (b) introduce an `getInShell(cx, cy, r)` primitive that scans only the perimeter cells. Add a `seen: Set<EntityId>` if the loop structure stays.

### H4. Re-entrancy infinite recursion in `destroyEntity` — ✅
**Reviewer:** Gemini (High).

- **File:** `src/world.ts:301-321`.
- **What's wrong:** `destroyEntity` runs `destroyCallbacks` (line 304) **before** calling `entityManager.destroy(id)` (line 320). If a callback synchronously calls `world.destroyEntity(id)` for the same `id` (e.g. relationship cleanup that destroys a buddy entity that points back), the alive check at line 302 is still `true` and we recurse forever.
- **Recommended fix:** Move `entityManager.destroy(id)` to immediately after the alive guard (line 302) so re-entrant calls hit the guard and return. The existing component/resource/spatial cleanup can still run on the now-marked-dead entity (the stores work by id and the spatial grid uses `previousPositions`, so the dead flag does not block them).

### H5. Reactive BT nodes don't clear preempted child running state — 🟡
**Reviewer:** Gemini (High).

- **File:** `src/behavior-tree.ts:123-159` (verified the reactive nodes; the broader claim about preempted children needs the caller's BT shape to confirm).
- **What's wrong:** `ReactiveSelectorNode`/`ReactiveSequenceNode` always restart from `i = 0` and never persist `state.running[this.index]`. But their children — for example a regular `SequenceNode` — DO persist their running state in `BTState.running[child.index]`. If a reactive selector switches between children due to changing conditions, the previously-running child's `state.running[child.index]` is still pointing into the middle of its sequence. When/if the reactive selector returns to that child, it resumes mid-sequence rather than starting fresh.
- **Why it matters:** Reactive BT nodes are advertised as the "preemption" affordance (devlog 2026-04-23). Not clearing the preempted subtree is the exact bug the feature was supposed to prevent.
- **Recommended fix:** When a reactive node skips past a previously-running child, call `clearRunningState(state, prev_child)` on the subtree it abandoned. Either by tracking last-active index in `BTState` (one slot per reactive node) or by clearing all child slices proactively at the start of each reactive tick. Add a unit test demonstrating "reactive selector preempts a running sequence; sequence does not resume mid-stride next tick."

### H6. Snapshots silently drop `WorldConfig` runtime flags — ✅
**Reviewer:** Codex (High).

- **Files:** `src/world.ts:742-802` (`serialize`), `src/world.ts:804-873` (`deserialize`).
- **What's wrong:** `serialize()` rebuilds `config` manually with only `gridWidth`, `gridHeight`, `tps`, `positionKey`, optional `seed`, optional `detectInPlacePositionMutations`. `WorldConfig.maxTicksPerFrame` and `WorldConfig.instrumentationProfile` are never serialized. After save/load: a `release` world becomes `full`, custom `maxTicksPerFrame` becomes default `4`.
- **Recommended fix:** Add the missing fields to the serialization round-trip. If specific fields are intentionally not part of the snapshot contract, document them as runtime-only and split them out of `WorldConfig` into a `RuntimeOptions` shape so the snapshot/runtime split is honest.

### H7. Snapshots don't preserve per-component `diffMode` — ✅
**Reviewer:** Opus (High).

- **Files:** `src/world.ts:825-834`, `src/component-store.ts:111-121` (`fromEntries`), `src/serializer.ts`.
- **What's wrong:** Snapshot v4 stores `components: Record<string, Array<[EntityId, unknown]>>` only — no `ComponentStoreOptions`. After `deserialize`, every store reverts to `diffMode: 'strict'`. A `registerComponent('position', { diffMode: 'semantic' })` world silently regresses to noisier diffs after a save/load cycle.
- **Recommended fix:** Add a v5 snapshot field `componentOptions?: Record<string, ComponentStoreOptions>` (keep v4 readable for backwards-compat). Thread it through `World.deserialize` → `ComponentStore.fromEntries`. As an immediate workaround, `World.deserialize` can accept a `componentOptions` parameter from the caller — useful since the caller usually knows what they registered.

### H8. `submit()` fast path silently swallows validator rejections in non-`full` profiles — 🟡
**Reviewer:** Opus (High).

- **Files:** `src/world.ts:616-629` (fast path), `src/world.ts:1663-1691` (`emitCommandResult`).
- **What's wrong:** When `instrumentationProfile !== 'full'` AND there are no `commandResultListeners`, `submit()` runs the validator and returns `false` on rejection without firing `emitCommandResult` or incrementing `nextCommandResultSequence`. A listener attaching mid-run sees a sequence stream with gaps relative to the same code path under `'full'`.
- **Why it matters:** Same call (`world.submit(...)`) has different observable outcomes depending on instrumentation profile and current listener attachment. AI agents debugging "why was my command rejected?" can only get answers by switching profiles or attaching a listener.
- **Recommended fix:** Always assign a `submissionSequence` and always fire the validator's result via `emitCommandResult`. The fast-path "skip" should be in `emitCommandResult` (skip listener loop when no listeners), not in `submit()`'s decision tree. This unifies the two API entry points (`submit` / `submitWithResult`) and makes profile a pure-perf knob, not a behavior knob.

### H9. `submit()` fast path skips `submissionSequence` assignment, breaking client correlation — 🟡
**Reviewer:** Opus (High).

- **Files:** `src/world.ts:616-629`, `src/world.ts:1393-1429`, `src/client-adapter.ts:144-163`.
- **What's wrong:** In the fast path, `submit()` calls `commandQueue.push(type, data)` with no sequence. Later the handler runs and `emitCommandExecution` produces `submissionSequence: null`. `ClientAdapter.commandExecutionListener` early-returns when `submissionSequence === null` (line 145), so the client never sees the executed/failed event for that command.
- **Why it matters:** Whether a command is observable on the wire depends on which submission API was used and which profile is active — silent cross-cut.
- **Recommended fix:** Same as H8 — unify on always assigning a sequence. (H8 and H9 share a fix.)

---

## MEDIUM

### M1. "Read-only" public views are only type-level and remain mutable at runtime — ✅
**Reviewers:** Codex (Medium), Opus (Low). Bumping to Medium because consequences are real.

- **Files:** `src/world.ts:240-278, 731-735, 880-881, 1030-1034`; `src/spatial-grid.ts:57-90`; `src/event-bus.ts:42-46`.
- **What's wrong:** `world.grid`, `getAt()`, `getEvents()`, `getDiff()`, `getByTag()`, `getByMeta()` return live engine internals typed as `ReadonlyArray`/`ReadonlySet`/`ReadonlyMap`. No runtime protection — any `as any` cast or naive renderer adapter can mutate them.
- **Recommended fix:** For the highest-blast-radius getters (`getEvents`, `getDiff`), return a shallow copy. For Sets, return a frozen iterable view. For `world.grid`, wrap in a small object that exposes only the query methods. Internal callers that need direct access should use the private fields, not the public getters.

### M2. Components can appear simultaneously as `set` and `removed` in `TickDiff` — ✅
**Reviewer:** Gemini (Medium).

- **File:** `src/component-store.ts:37-44, 49-56`.
- **What's wrong:** When a component is `remove()`d the entity is added to `removedSet`. If a subsequent `set()` runs in the same tick, the entity is added to `dirtySet` but **not** removed from `removedSet`. `getDirty()` then returns the entity in both `set` and `removed` arrays. A downstream consumer that processes removals after sets will incorrectly delete the just-added component.
- **Recommended fix:** In `ComponentStore.set()`, call `this.removedSet.delete(entityId)`. Add a focused test: remove → set in the same tick produces only `set`.

### M3. Pathfinding aborts early on `maxCost` with inadmissible heuristics — 🟡
**Reviewer:** Gemini (Medium).

- **File:** `src/pathfinding.ts:114-115`.
- **What's wrong:** When `findPath` pops a node with `current.g > maxCost`, it returns `null` immediately. With an inadmissible heuristic (which the engine documents as supported), `f` is not a strict lower bound — a node with `g <= maxCost` may still be on the heap behind the popped overcost one.
- **Recommended fix:** Change the early-return to `continue;`. Alternatively, document `maxCost` as "only correct with admissible heuristics."

### M4. `setMeta()` breaks the documented unique reverse-index invariant — 🟡
**Reviewer:** Codex (Medium).

- **File:** `src/world.ts:1038-1066, 1140-1156`.
- **What's wrong:** `setMetaInternal()` unconditionally does `keyIndex.set(value, entity)`. If two live entities share the same `(key, value)`, the later write overwrites the index while the earlier entity still has the metadata locally. `getByMeta()` returns only one entity even though multiple carry it.
- **Open question:** Is the unique-reverse-index invariant intentional? If the engine wants to allow duplicate values, the index should be `Map<value, Set<EntityId>>` and `getByMeta` should return `EntityId[]`. If it is intentional, throw on duplicate writes.

### M5. `VisibilityMap.getState()` can serialize stale data — 🟡
**Reviewer:** Codex (Medium).

- **File:** `src/visibility-map.ts:45-96, 128-143, 153-185`.
- **What's wrong:** `setSource`/`removeSource` mark players dirty. Most reads call `ensureUpdated()`. `getState()` does not, so a save/load between a source mutation and a read can serialize stale `explored` data.
- **Recommended fix:** Have `getState()` flush dirty players before reading.

### M6. `ResourceStore.fromState()` does not validate transfer IDs — 🟡
**Reviewers:** Codex (Medium), Opus (Low). Bumping to Medium because save-load is a public contract.

- **File:** `src/resource-store.ts:147-151, 297-341`.
- **What's wrong:** `fromState` validates `nextTransferId >= 0` but does not enforce uniqueness of transfer IDs and does not ensure `nextTransferId > max(existing IDs)`. A restored store can issue duplicate IDs; `removeTransfer(id)` becomes ambiguous. It also does not clamp `pool.current <= pool.max`.
- **Recommended fix:** Validate uniqueness, normalize `nextTransferId` to `Math.max(nextTransferId, max(existingIds) + 1)`, clamp `pool.current` to `pool.max`. Throw with a clear error on validation failure.

### M7. `setState` reuses `TComponents`, conflating world state with components — 🟡 / ❓
**Reviewer:** Opus (Medium).

- **File:** `src/world.ts:354-372, 979-991`.
- **What's wrong:** `setState<K extends keyof TComponents & string>` types the state key off the component registry. A user typing `World<E, C, { terrain: ... }>` finds `terrain` is simultaneously a state key and a component key.
- **Open question:** A passing test in `tests/world-state.test.ts` covers exactly this overload, suggesting it may be deliberate. If so, document the overlap explicitly. If unintentional, add a separate `TState` generic on `World` and re-type `setState`/`getState`/`hasState`/`deleteState` against it. **Decision needed from user before changing.**

### M8. Tag/metadata cleanup on `destroyEntity` is invisible in `TickDiff` — 🟡
**Reviewer:** Opus (Medium).

- **Files:** `src/world.ts:301-321, 1097-1123, 1192-1205`.
- **What's wrong:** `removeEntityTags`/`removeEntityMeta` (called from `destroyEntity`) do not insert into `tagsDirtyEntities`/`metaDirtyEntities`. ARCHITECTURE.md says tag/meta cleanup is "included in serialization and diffs," but in practice destroyed entities only show up in `entities.destroyed` — diff consumers must correlate that with the previous tick's `tags`/`metadata` to infer the cleanup.
- **Recommended fix:** In `removeEntityTags`/`removeEntityMeta`, before deleting the index entries, push the entity into the corresponding dirty set if it had any tags/meta. The diff entry then reads `{ entity, tags: [] }` / `{ entity, meta: {} }`.

### M9. `assertPositionInBounds` relies on a side-effect of `getAt` — ✅
**Reviewer:** Opus (Medium).

- **Files:** `src/world.ts:1836-1838`, `src/spatial-grid.ts:88-90`.
- **What's wrong:** `assertPositionInBounds` is implemented as `this.spatialGrid.getAt(x, y)` and works only because `getAt` calls `assertBounds` internally. A future refactor that makes `getAt` non-throwing silently disables bounds validation everywhere `assertPositionInBounds` is called.
- **Recommended fix:** Expose `SpatialGrid.assertBounds(x, y)` publicly (the private method already exists) and call it directly. Remove the side-effect coupling.

### M10. `OccupancyBinding.crowding` ignores `ignoreEntity` for static-blocked checks — 🟡
**Reviewer:** Opus (High; downgraded to Medium because it requires a specific usage pattern to bite).

- **Files:** `src/occupancy-grid.ts:868-881, 236-255`.
- **What's wrong:** `OccupancyGrid.isBlocked` returns `true` from `this.blocked.has(cell)` without consulting `options.ignoreEntity`. `OccupancyBinding` can mark cells as blocked on behalf of an owning entity (via `block()`), but the static-block path doesn't track the owner, so an entity querying with `ignoreEntity: self` still sees its own static block.
- **Open question:** Does the engine want `block(area)` to be entity-less (true terrain) and `block(area, entity)` to be entity-owned with ignoreEntity semantics? If yes: add the optional entity parameter. If no: the binding should not allow entities to claim static blocks at all.

### M11. Path queue overflow uses `splice`-based shifting instead of a true ring — 🟡
**Reviewer:** Opus (Medium).

- **File:** `src/path-service.ts:177-181`.
- **What's wrong:** `compact()` uses `slice(this.head)` to drop processed entries, gated on `head < 1024 && head * 2 < pending.length`. Until the threshold trips, the underlying buffer grows linearly with total enqueued requests. The "constant-memory queue" promise is closer to "shift every once in a while."
- **Recommended fix:** Either compact more aggressively (e.g. `head > 256`) or switch to a true ring buffer.

### M12. `WorldHistoryRecorder.recordTick` shares a reference to user-provided debug payload — 🟡
**Reviewer:** Opus (Medium).

- **Files:** `src/history-recorder.ts:207-220, 253-259`.
- **What's wrong:** `captureDebug()` calls user code, runs `assertJsonCompatible`, but does not deep-clone before stashing in `tickEntries[i].debug`. If the user's debug-capture returns a memoized live structure, later mutation corrupts the recorded history. (The cloning happens at `getTickHistory()` read time, but read-time cloning doesn't help if the live structure was mutated between record and read.)
- **Recommended fix:** Clone at record time (`cloneJsonValue(debug, …)`).

---

## LOW / POLISH

### L1. `EventBus.getEvents` returns the live buffer — ✅
**Reviewers:** Gemini (Low), Opus (Low). Same finding.
- **File:** `src/event-bus.ts:42-46`. Currently returns `this.buffer` directly; signature claims `ReadonlyArray`.
- **Fix:** Return a frozen slice, or invalidate by reassignment in `clear()` instead of `length = 0`.

### L2. Behavior-tree state assumes `running.length >= node.index + node.nodeCount` — 🟡
- **File:** `src/behavior-tree.ts:55-87, 186-188`.
- **What's wrong:** `Math.max(state.running[this.index], 0)` evaluates to `NaN` if `state.running[this.index]` is `undefined`. The for-loop then fails on the first comparison and the node returns `FAILURE` with no children invoked.
- **Fix:** Default to `state.running[this.index] ?? -1`. Optionally validate length in `createBTState`.

### L3. `findPath` does not validate that costs are non-negative — 🟡
- **File:** `src/pathfinding.ts:127-143`.
- **Fix:** Either reject negative `edgeCost` in the loop (`continue`) or validate config once up front.

### L4. `WorldHistoryRecorder.pushBounded` uses O(n) `splice` on overflow — 🟡
- **File:** `src/history-recorder.ts:425-430`. Acceptable for small caps; switch to a head/tail pair or `shift()` if perf matters.

### L5. `noise.GRAD2` length is load-bearing but undocumented — 🟡
- **File:** `src/noise.ts:36-38`. Make `GRAD2` `as const` with `readonly [number, number][]`, or replace `% 8` with `& 7`.

### L6. `RenderAdapter.connect()` forces a full `world.serialize()` pass — 🟡
- **File:** `src/render-adapter.ts:160-186`. A renderer connecting mid-session pays the cost of a full JSON-compat walk just to enumerate alive entities. Add `world.getAliveEntities()` as a primitive and use that.

### L7. `submit()` and `submitWithResult` duplicate validator pipeline work — 🟡
- **File:** `src/world.ts:616-660`. Have `submit()` always delegate; gate emission on listener presence.

### L8. `EntityManager.fromState` does not validate input — 🟡
- **File:** `src/entity-manager.ts:72-83`. Mirror the error-handling style of `ResourceStore.fromState` / `DeterministicRandom.fromState`.

### L9. `serialize()` builds tag/metadata records keyed by stringified numbers — 🟡
- **File:** `src/world.ts:772-788`. Validate `Number.isInteger(entityId) && entityId >= 0` in deserialize.

### L10. `OccupancyBindingWorldHooks.world: unknown` is too loose — 🟡
- **File:** `src/occupancy-grid.ts:133-141`. The `world` parameter is unused; drop it or type it `void`.

### L11. `findNearest`'s outer iteration uses Chebyshev radius for euclidean distance — 🟡
- **File:** `src/world.ts:505`. Either change to `Math.ceil(Math.hypot(width, height))` or document Chebyshev semantics. Becomes a non-issue once H3 is fixed.

### L12. `RenderAdapter.collectEntityChanges` `[...byId.values()].sort` per diff — 🟡
- **File:** `src/render-adapter.ts:288-348`. Profiling-gated; not urgent.

---

## OPEN QUESTIONS FOR USER

These are decisions I want your input on before turning any of the above into code:

1. **Tick failure semantics (H1).** Fail-fast (poison-the-world) vs. transactional rollback? Fail-fast is much simpler and matches the AI-native fail-loud-and-clear stance.
2. **Critical command loss (C2).** Re-enqueue dropped commands, or emit a `tick_aborted_before_handler` failure for each? My lean is the latter for auditability.
3. **`setState` typed off `TComponents` (M7).** Intentional overlap or accidental? The passing test could be the bug, not the contract.
4. **`setMeta` uniqueness (M4).** Is the unique reverse-index a hard invariant (throw on dup), or should the index allow many-to-one (`Map<value, Set<EntityId>>`)?
5. **`OccupancyGrid.block` entity ownership (M10).** Should static blocks track their owner so `ignoreEntity` works for self? Or is `block` reserved for entity-less terrain?
6. **`WorldConfig` runtime split (H6).** Add `maxTicksPerFrame`/`instrumentationProfile` to the snapshot, or split them into a runtime-only `RuntimeOptions` type that doesn't pretend to be part of `WorldConfig`?

---

## PROPOSED FIX BATCHES

If approved, I'd implement these in order, each as its own branch + PR + test pass:

1. **Critical hot path (C1).** ComponentStore: skip stringify in strict mode; gate `getDirty` baseline scan on semantic mode. Add benchmark before/after.
2. **Critical command loss (C2 + H8 + H9).** Unify `submit` and `submitWithResult` paths; always assign sequences; emit failures for tick-aborted commands. Touches command-queue, world.ts, client-adapter; tests for the dropped-command audit trail.
3. **Tick-failure shape (H1 + H2).** Fail-fast semantics (or transactional, depending on user decision); fix the `world.tick === diff.tick` invariant by advancing tick before listeners.
4. **Safer destruction & re-entrancy (H4 + M8 + M9).** Move `entityManager.destroy(id)` to the top of `destroyEntity`; mark tag/meta cleanup in diffs; replace the `getAt` side-effect with explicit `assertBounds`.
5. **Snapshot fidelity (H6 + H7 + M5 + M6 + L8 + L9).** v5 snapshot adding `componentOptions`, `maxTicksPerFrame`, `instrumentationProfile`; tighten `fromState` validation across the board; flush VisibilityMap on `getState`.
6. **Performance & API hygiene (H3 + M1 + M2 + M11).** `findNearest` shell scan; defensive copies on read-only getters; fix the `set+removed` race in `ComponentStore`; replace path-queue splice with proper compaction.
7. **Behavior-tree correctness (H5 + L2).** Reactive nodes clear preempted subtree state; default `state.running[i]` to `-1`. New tests for preemption.
8. **Polish (L3, L5, L6, L7, L10, L11, L12 plus pathfinding M3).** Small, batched, low-risk.

---

## RAW REVIEWS

- `raw/codex.md` — Codex full output (50 lines, 6 findings)
- `raw/gemini.md` — Gemini full output (61 lines, 7 findings)
- `raw/opus.md` — Opus 4.7 (1M) full output (187 lines, ~25 findings)
- `prompt.md` — the shared review prompt
- `raw/codex.stdout.log` — codex run log (large; not part of the deliverable)

**Awaiting user review before any code change.**
