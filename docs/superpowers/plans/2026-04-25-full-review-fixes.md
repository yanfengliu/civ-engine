# Full-Review Fix Plan — 2026-04-25

**Source review:** `docs/threads/done/full/2026-04-25/1/REVIEW.md`
**Branch:** `agent/fix-full-review-2026-04-25`
**Approach:** TDD, batch-by-batch. Each batch is a self-contained commit. Run tests after every batch; full gate (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`) at the end. Final multi-CLI code review on the full diff before merge.

## Decisions (open questions resolved)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Tick failure (H1) | **Fail-fast.** Mark world as poisoned; require explicit `world.recover()` to resume. Stop pretending a partially-mutated world is recoverable. | Matches AI-native fail-loud stance, matches GameLoop pause-on-error behavior, simpler than transactional snapshot/restore. |
| 2 | Lost commands on tick failure (C2) | **Emit `tick_aborted_before_handler` failures** for each still-pending command. Do NOT re-enqueue. | Preserves auditability. Re-enqueueing would re-run commands whose preconditions may have been invalidated by the partial tick. |
| 3 | `setState` typed off `TComponents` (M7) | **Add separate `TState` generic** to `World`, default `Record<string, unknown>`. Update existing test to use the new shape. | The conflation is almost certainly accidental. Components and state have different lifecycles (entity-keyed vs. global); typing them off the same registry is a footgun. |
| 4 | `setMeta` uniqueness (M4) | **Throw on duplicate writes.** Document as an invariant. | The reverse index is documented as unique; consumers rely on `getByMeta` returning a single entity. Allowing many-to-one would be a broader API change. |
| 5 | `OccupancyGrid.block` ownership (M10) | **Add optional `entity` parameter.** Entity-less terrain stays the default; entity-owned blocks honor `ignoreEntity`. | Backwards-compatible; the only callers that pass an entity are the new ones in `OccupancyBinding`. |
| 6 | `WorldConfig` snapshot fields (H6) | **Add `maxTicksPerFrame` and `instrumentationProfile` to v5 snapshot.** Keep v4 readable. | Simpler than splitting `WorldConfig` into a runtime-only shape; also matches user expectation that "save & load reproduces the same world." |

## Conventions during execution

- TDD: every behavior change gets a failing test first, then a fix that makes it pass.
- Commit after each batch with a message that names the finding IDs (e.g. `fix(component-store): skip strict-mode fingerprint per set (C1)`).
- After each batch, run `npm test -- --run <affected dir>` for affected tests; full suite at the end.
- No code review CLI runs per batch (the review at the start of this work catalogued the issues). One final multi-CLI review after all batches, before merging.
- Architecture/drift updates only at the end, after the full diff is stable.

## Batches

### Batch 1 — ComponentStore hot path (C1)

**Files:** `src/component-store.ts`, `tests/component-store.test.ts` (new test)

1. Failing test: in `'strict'` mode, `set()` does not call `jsonFingerprint`. Use a spy on `jsonFingerprint` (or wrap in a helper) and assert call count = 0 on N strict-mode sets vs. the existing semantic-mode test.
2. Failing test: in `'strict'` mode, `clearDirty()` does not iterate `entries()` to rebuild a baseline.
3. Fix `set()`: only compute fingerprint when `diffMode === 'semantic' && wasPresent`.
4. Fix `clearDirty()`: only build baseline when `diffMode === 'semantic'`.
5. Fix `getDirty()`: only do the all-entities scan when `diffMode === 'semantic'`. Strict mode trusts `dirtySet`/`removedSet`.
6. Document strict-mode contract: dirty tracking depends on `setComponent`/`setPosition`; in-place mutations are not detected (mirrors `detectInPlacePositionMutations` for positions). For semantic detection, opt into `diffMode: 'semantic'`.

### Batch 2 — Command pipeline (C2 + H8 + H9)

**Files:** `src/world.ts`, `src/command-queue.ts`, `tests/command-queue.test.ts`, `tests/world.test.ts` (or relevant)

1. Failing test: command B is queued after command A; A's handler throws; B is reported via `commandExecutionListener` with `code: 'tick_aborted_before_handler'`. (Add to existing world tick-failure tests.)
2. Failing test: `submit()` always populates `submissionSequence` regardless of profile or listener attachment. Verify by submitting under `release`/no-listeners then attaching and seeing the sequence in `commandExecutionListener`.
3. Failing test: `submit()` always emits a result via `emitCommandResult` (or its replacement); rejection in `release` mode is observable to a freshly-attached listener.
4. Refactor: `submit()` always calls into a private `submitInternal` that assigns a sequence and calls validators; `submitWithResult` is now a thin wrapper.
5. Refactor: in `processCommands`, on the first failure, drain remaining `commands` array as `commandFailed` events and append their `submissionSequence`s to `failure.details.droppedCommands`.

### Batch 3 — Tick-failure semantics (H1 + H2)

**Files:** `src/world.ts`, `src/game-loop.ts`, `tests/world-tick-failure.test.ts` (or wherever tick-failure tests live)

1. Failing test: after a tick failure, `world.tick` does NOT advance and the world is marked poisoned (`world.isPoisoned() === true`); `world.step()` throws `WorldPoisonedError` until `world.recover()` is called.
2. Failing test: inside a diff listener, `world.tick === currentDiff.tick === metrics.tick`. Achieve this by advancing the gameLoop tick before calling listeners.
3. Failing test: `WorldStepResult.tick` matches `world.tick` (consistent before and after a successful or failed tick).
4. Implement `world.recover()` (clears poisoned flag; advances tick if it was about to). Add `world.isPoisoned()`.
5. Document fail-fast contract: the world is unsafe to use after a tick failure until `recover()` is called.
6. Update ARCHITECTURE.md (small note in the data-flow section + a row in `drift-log.md`).

### Batch 4 — Destruction & re-entrancy (H4 + M8 + M9)

**Files:** `src/world.ts`, `src/spatial-grid.ts`, tests for destroy + tag/meta diff

1. Failing test: destroyEntity callback that synchronously calls `destroyEntity(self)` does not recurse infinitely.
2. Failing test: destroying an entity with tags + metadata produces a `TickDiff` with the entity in `tags: [{ entity, tags: [] }]` and `metadata: [{ entity, meta: {} }]`.
3. Failing test: `world.assertBounds(x, y)` (or its inferred contract) survives `getAt` becoming non-throwing.
4. Implement: in `destroyEntity`, mark the entity dead via `entityManager.destroy(id)` BEFORE firing destroy callbacks. Other cleanup (components, tags, meta, resource, spatial) still runs via stable indexes.
5. Implement: in `removeEntityTags`/`removeEntityMeta`, push to `tagsDirtyEntities`/`metaDirtyEntities` before clearing the live indexes.
6. Implement: expose `SpatialGrid.assertBounds(x, y)` publicly; replace the `getAt` side-effect call in `assertPositionInBounds` with the explicit assert.

### Batch 5 — Snapshot fidelity (H6 + H7 + M5 + M6 + L8 + L9)

**Files:** `src/serializer.ts`, `src/world.ts`, `src/entity-manager.ts`, `src/resource-store.ts`, `src/visibility-map.ts`, tests for serialization

1. Failing tests:
   - Round-trip preserves `maxTicksPerFrame` and `instrumentationProfile`.
   - Round-trip preserves per-component `diffMode`.
   - `EntityManager.fromState` rejects malformed input (mismatched lengths, freelist refers to alive entity).
   - `ResourceStore.fromState` rejects duplicate transfer IDs and `id >= nextTransferId`; clamps `pool.current` to `pool.max`.
   - `VisibilityMap.getState` returns up-to-date data even when `update()` was not called since `setSource()`.
   - `World.deserialize` rejects snapshots with non-integer entity-id keys in `tags`/`metadata`.
2. Bump `WorldSnapshot` schema to v5 with new fields. Keep v4 deserializer as-is.
3. Update `World.serialize` to populate v5 fields.
4. Update `World.deserialize` to thread `componentOptions` through `ComponentStore.fromEntries` and apply runtime config fields.
5. Tighten validation in the affected `fromState` methods.
6. Add row to `drift-log.md`; update ARCHITECTURE.md serialization section.

### Batch 6 — Performance & API hygiene (H3 + M1 + M2 + M11)

**Files:** `src/world.ts`, `src/spatial-grid.ts`, `src/component-store.ts`, `src/event-bus.ts`, `src/path-service.ts`, tests

1. Failing test: `ComponentStore`: remove → set in same tick yields a single `set` entry, no `removed` entry.
2. Failing test: `findNearest` over a 50x50 grid finds the nearest in `O(1)` `getInRadius` calls (assert via spy).
3. Failing test: `world.getEvents()` followed by `world.events.push(...)` (cast to mutable) does NOT mutate the next tick's buffer (i.e. mutation safety).
4. Failing test: `PathRequestQueue` keeps `pending` array bounded after sustained enqueue/dequeue cycles (memory growth check).
5. Implement:
   - `ComponentStore.set`: `this.removedSet.delete(entityId)`.
   - `findNearest`: single `getInRadius(cx, cy, maxRadius)` call, then minimum-distance scan over results.
   - Defensive copies on `getEvents`, `getDiff`, `getByTag`, `getByMeta`. `world.grid` becomes a new lightweight read-only wrapper exposing only query methods.
   - `PathRequestQueue.compact`: lower threshold (`head > 256`) or true ring buffer.

### Batch 7 — Behavior tree correctness (H5 + L2)

**Files:** `src/behavior-tree.ts`, `tests/behavior-tree.test.ts`

1. Failing test: a reactive selector that has a running sequence child, then preempts to a higher-priority child, then returns to the sequence — the sequence restarts from index 0, not from where it was preempted.
2. Failing test: ticking a node with `state.running[index]` === undefined returns the node's child-from-index-0 result, not `FAILURE`.
3. Implement: reactive nodes call `clearRunningState(state, child)` for any child they skip past or that returns non-RUNNING after they switched.
4. Implement: replace `Math.max(state.running[this.index], 0)` with `state.running[this.index] ?? -1` (then `Math.max(value, 0)` is fine, but use the nullish coalesce in case of undefined slot).

### Batch 8 — Polish (M3 + M4 + M7 + M10 + M12 + L3 + L5 + L6 + L7 + L10 + L11 + L12)

Single batch but each fix is tiny:

- M3 pathfinding: `if (current.g > maxCost) continue;`
- M4 setMeta: throw on duplicate `(key, value)` pair where another live entity owns it.
- M7 setState: add `TState` generic; update existing tests.
- M10 OccupancyBinding: pass `entity` to internal `OccupancyGrid.block`; track owner per blocked cell; honor `ignoreEntity`.
- M12 HistoryRecorder: deep-clone `debug` payload at record time.
- L3 pathfinding: validate non-negative cost in inner loop (`continue` on negative).
- L5 noise: `GRAD2 as const`; `gi & 7` instead of `gi % 8`.
- L6 RenderAdapter: introduce `world.getAliveEntities()`; use it in `connect()`.
- L7 submit dedup: now naturally folded by Batch 2 — verify and remove duplicated validator pipeline.
- L10 Occupancy hooks: drop unused `world` argument.
- L11 findNearest: superseded by Batch 6.
- L12 RenderAdapter sort: use `Set<string>` accumulator.

## Final gate

1. `npm test` — all green.
2. `npm run typecheck` — clean.
3. `npm run lint` — clean.
4. `npm run build` — clean.
5. `node scripts/rts-benchmark.mjs --format markdown` — runs without errors. Compare key timings vs. main if relevant (C1 should reduce them measurably).

## Final review (multi-CLI)

Run all three reviewers on the diff with the AGENTS.md `base_prompt`:

```bash
git diff main..HEAD | codex exec -m gpt-5.4 -c model_reasoning_effort=high --sandbox read-only --skip-git-repo-check --ephemeral "<base_prompt>"
git diff main..HEAD | gemini -m gemini-3.1-pro-preview -p "<base_prompt>" --approval-mode plan -o text
# Claude: handled by main session
```

Iterate on findings until reviewers stop catching real bugs (per AGENTS.md guidance).

## Final docs

- Append a detailed devlog entry to `docs/devlog/detailed/2026-04-25_2026-04-25.md` (new file; the previous one ended 2026-04-23). Include reviewer-comment breakdown by AI provider and theme.
- Update `docs/devlog/summary.md` with a one-line summary.
- Append rows to `docs/architecture/drift-log.md` for any architectural shifts (Batch 3 fail-fast, Batch 4 destruction order, Batch 5 v5 snapshot, Batch 7 reactive BT semantics).
- Update `docs/architecture/ARCHITECTURE.md` for any structural changes (likely the v5 snapshot section, the `World.recover()` API, and the `TState` generic).
