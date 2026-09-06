# Per-player filtered observation — PLAN

**Objective:** `player-observation` · **Design:** DESIGN.md v3 (design-3 unanimous CONVERGED) · **Version:** 0.8.20 (c-bump, pure addition)

## Step 1 — Engine prerequisites (TDD, both additive)

1. `World.getStateKeys(): string[]` (`src/world-observers.ts`): keys of the state store, **sorted lexicographically** (stable contract for observation determinism; the store Map's insertion order is program-dependent). Tests: empty world → `[]`; set/delete reflected; sorted; mutation of the returned array does not affect the store.
2. `World.getMetaEntries(entity): Record<string, string | number>` (`src/world-tags-meta.ts`): `assertAlive(entity)` first (coded `entity_not_alive` like every entity-taking API); returns a fresh plain object (not the live Map); `{}` when no metadata. Tests: round-trip with `setMeta`, isolation (mutating the returned object does not write through), dead entity throws `entity_not_alive`, empty case.

## Step 2 — `src/player-observer.ts` (≤ 500 LOC; split types to `player-observer-types.ts` if the budget forces it)

Exact shapes from DESIGN v3 §1. Implementation pins:

- **Internal state:** `prev: Map<EntityId, { ref: EntityRef; lastKnownPosition: { x: number; y: number } | null }>`, `lastObservedTick: number`. Constructor runs `prime()` (construction ≡ implicit reset). `reset()` = clear + `prime()`. `snapshot()` returns the full filtered view AND re-primes (documented side effect).
- **Visible-set sweep:** `visibility.getVisibleCells(playerId)` (sorted by cell index) × `world.grid.getAt(x, y)`; positionless pass over `world.getAliveEntities()` filtered to entities without the position component when `positionless === 'visible'`. Entity lists in all outputs sorted ascending by entity id.
- **ObservedEntity build:** components via registration manifest component keys → `hasComponent`/`getComponent` per key; resources via manifest resource keys → per-entity pool reads; `tags: world.getTags(e)`; `meta: world.getMetaEntries(e)`.
- **observeTick() guard order:** (1) `world.isPoisoned()` → throw `player_observer_world_poisoned`; (2) `world.tick === lastObservedTick` → `player_observer_tick_already_observed`; (3) `world.tick !== lastObservedTick + 1` → `player_observer_tick_skipped`. All `EngineError` with details `{ tick, lastObservedTick }`.
- **entered** = newVisible − prev (full data); **updated** = (prev ∩ newVisible alive set) ∩ diff change channels, per-entity inversion of `TickDiff` (componentsRemoved/resourcesRemoved lists; `tags?`/`meta?` full replacements only when that entity is in the diff's tag/meta channel); **exited** = prev − newVisible, `reason: 'destroyed'` iff id ∈ `diff.entities.destroyed` AND stored lastKnownPosition is visible under post-tick visibility, else `'fog'`.
- **Bound `isVisible(x, y)`:** total — returns false for ANY input that is not an in-grid integer cell (`Number.isInteger` + bounds pre-check before delegating to `VisibilityMap.isVisible`; design-3 Claude LOW pin).
- **events:** `'none'` (default) → `[]`; `'all'` → diff/world events of the tick verbatim; resolver → filtered with the bound isVisible. **worldState:** filter `diff` state set/removed through the key predicate; values deep-cloned.
- **Cloning:** every payload through `cloneJsonValue` (components, resources, state values); tags arrays and meta objects freshly built.

## Step 3 — Tests (`tests/player-observer.test.ts`, failing-first)

The DESIGN v3 test plan, mechanically: enter (spawn-in-view, move-into-view, fog-recede), exit (move-out, fog-advance, destroy-in-view → `destroyed`, destroy-out-of-view → no leak), the move-then-die honest-attribution pin (documents the acceptable mis-attribution), updated (component change, component removal, resource change/removal, tag change, meta change — full-replacement semantics), position-removal-while-visible (`'hidden'` → exited fog; `'visible'` → stays), positionless both modes, worldState none/all/predicate, events none/all/resolver (+ resolver isVisible false out-of-grid AND false on fractional coords), lifecycle (double-observe, skipped tick, poisoned world, reset, construction-primes, snapshot-reprimes), isolation (mutate every returned surface → world unchanged + next observation unchanged), determinism (two observers over two identically-seeded worlds produce deep-equal observation streams), LOC budget auto-covered by `tests/loc-budget.test.ts`.

## Step 4 — Docs

- `docs/api-reference.md`: `## PlayerObserver (v0.8.20)` section (config, all shapes, lifecycle contract, honest-attribution caveat, ordering requirement) + TOC; `getStateKeys` under World State; `getMetaEntries` under Tags & Metadata.
- `README.md`: Public Surface bullet + Feature Overview row (per-player fog-of-war observation).
- `docs/guides/ai-integration.md`: honest-agent pattern (PlayerObserver in `decide(ctx)`); ClientAdapter per-client recipe pointer.
- `docs/guides/rts-primitives.md` (VisibilityMap's guide): composition paragraph.
- `docs/guides/concepts.md`: standalone-utilities list entry.
- `docs/changelog.md` 0.8.20; version bump ×3 (package.json, version.ts, README badge); devlog summary + detailed.
- Architecture: Component Map row (new standalone utility) + drift-log row; ADR only if a non-obvious tradeoff emerges during implementation (the onDestroy rejection is already ADR-grade — record as ADR 46).

## Step 5 — Multi-CLI implementation review

Standard 3-reviewer diff review; iterate to convergence; thread → done; commit; push.
