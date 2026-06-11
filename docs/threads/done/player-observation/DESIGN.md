# Per-player filtered observation — DESIGN

**Objective:** `player-observation` · **Status:** v3 (post design-2: convergent Codex HIGH / Claude MEDIUM — meta full-map prerequisite added as `World.getMetaEntries()`; worldState cloning + poisoned-world guard + lifecycle wording all fixed; Gemini CONVERGED) · **Origin:** full-review 2026-06-10 missing-pillar finding: "VisibilityMap tracks cells, but diffs/ClientAdapter are omniscient — a fog-of-war agent needs engine-side filtering that doesn't exist yet." Roadmap-tier spec (wave objective 4/7).

## Problem

Every observation surface the engine offers — `serialize()`, `getDiff()`, `getEvents()`, `ClientAdapter` — is omniscient. A fog-of-war game must hand-roll per-player filtering on top of raw diffs, and an AI playtester that should only "see" what its player sees has no engine support at all: it either cheats (reads everything) or the game grows a bespoke filter layer per project. `VisibilityMap` already answers "which cells does player P see" — what is missing is the projection from world observation streams through that mask.

## Goals

- An engine-side, per-player observation primitive: filtered snapshot + per-tick filtered change feed + optional event filtering, keyed by `VisibilityMap`.
- **Visibility-transition semantics**: when an entity moves into view (or the fog recedes), the observer must receive its full current data even though no component changed that tick; when it leaves view, an explicit exit notice. This is the part raw-diff filtering cannot express and the reason the primitive must be stateful.
- Deterministic, read-side-only (zero impact on simulation state, recording, or replay).
- Composable with `ClientAdapter`-style transports and with AI playtesters (`AgentDriverContext`).

## Non-goals

- Filtering recorded bundles (bundles stay omniscient ground truth; a `filterBundleForPlayer` reader is a future extension noted on the roadmap).
- "Ghost memory" of last-seen enemy state (classic RTS memory): game-level policy built ON this primitive; v1 ships the honest feed (visible now / entered / exited), not remembered stale copies.
- Per-component partial hiding (e.g., hide `hp` but show `position`): v1 filters at entity granularity. A `componentMask` option slot is reserved in the config shape but not implemented.
- Changing `ClientAdapter` itself in v1 (recipe in the guide; native integration is a follow-up once the primitive is proven).

## Design

### 1. `PlayerObserver<TEventMap, TComponents>` (new standalone utility, `src/player-observer.ts`)

Standalone in the established mold (RenderAdapter / VisibilityMap / OccupancyGrid): constructed by game code, reads the world through public APIs only, owns no engine internals.

```ts
interface PlayerObserverConfig<TEventMap extends ..., TComponents extends ...> {
  world: World<TEventMap, any, TComponents>;
  visibility: VisibilityMap;
  playerId: VisibilityPlayerId;
  /** Entities with no position component: 'hidden' (default) | 'visible'.
   *  SAFE-BY-DEFAULT (design-1 Codex): positionless entities are a common
   *  home for player/economy/AI-director state — the primitive exists to
   *  not leak. Opt match-clock-style globals in explicitly. */
  positionless?: 'hidden' | 'visible';
  /** World-state keys in observations: 'none' (default — same safety
   *  rationale) | 'all' | (key: string) => boolean. */
  worldState?: 'none' | 'all' | ((key: string) => boolean);
  /** Event filtering. Events carry no inherent position; the engine cannot
   *  guess. Default 'none' (SAFE: leak nothing). 'all' opts into omniscient
   *  events; a resolver receives each event and the observer's visibility
   *  test and decides. */
  events?: 'none' | 'all' | ((event: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] }, isVisible: (x: number, y: number) => boolean) => boolean);
}

class PlayerObserver<...> {
  constructor(config: PlayerObserverConfig<...>);
  /** Full filtered view of currently-visible entities. PRIMES the observer:
   *  the captured visible set becomes the baseline for the next
   *  observeTick() (documented side effect — design-1 Codex M4; without it
   *  the first tick would duplicate everything as `entered`). */
  snapshot(): PlayerObservation<TComponents>;
  /** Per-tick feed. Call exactly once after each SUCCESSFUL world.step().
   *  Throws player_observer_world_poisoned when world.isPoisoned() (design-2
   *  Codex: listener-phase failures leave the diff intact, so a failed tick
   *  can look sequential — the gap check alone is insufficient),
   *  player_observer_tick_already_observed on double-observe, and
   *  player_observer_tick_skipped on gaps. After world.recover() (failed
   *  ticks consume tick numbers) or applySnapshot() (timeline jump), call
   *  reset() — that call is the CONTRACT; gap detection is a backstop that
   *  catches most violations but not an applySnapshot landing on exactly the
   *  expected tick (design-2 Claude L2). */
  observeTick(): PlayerTickObservation<TEventMap, TComponents>;
  /** Re-prime after deliberate timeline changes: clears tracked state and
   *  takes a fresh priming snapshot internally. Construction primes the same
   *  way (construction ≡ implicit reset()), so observeTick() is valid from
   *  the first post-construction tick without a snapshot() call. */
  reset(): void;
  /** The visible-cell test bound to this player. Returns false for
   *  out-of-grid coordinates instead of throwing (VisibilityMap.isVisible
   *  RangeErrors there) — event resolvers receive this and may feed it
   *  arbitrary event-payload coordinates. */
  isVisible(x: number, y: number): boolean;
}

interface ObservedEntity<TComponents> {
  /** EntityRef, NOT bare id (design-1 Codex HIGH): ids recycle immediately
   *  via the free-list, so generation is identity — RenderAdapter precedent. */
  ref: EntityRef;
  components: Partial<TComponents>;
  /** All four entity-keyed observation surfaces mirror TickDiff (design-1
   *  Codex HIGH / Claude): a visible enemy's hp pool, tags, and metadata are
   *  exactly what an honest agent inspects. */
  resources: Record<string, ResourcePool>;
  tags: string[];
  meta: Record<string, string | number>;
}

interface PlayerObservation<TComponents> {
  tick: number;
  entities: Array<ObservedEntity<TComponents>>;
  worldState: Record<string, unknown>;
}

interface PlayerTickObservation<TEventMap, TComponents> {
  tick: number;
  /** Newly visible this tick (spawned in view, moved into view, or fog
   *  receded over them): FULL current data. */
  entered: Array<ObservedEntity<TComponents>>;
  /** Visible last tick and this tick: filtered projection of the world diff
   *  across all four surfaces, INCLUDING removals (design-1 Claude: a
   *  visible entity dropping a component/tag/pool must be expressible). */
  updated: Array<{
    ref: EntityRef;
    components: Partial<TComponents>;
    componentsRemoved: string[];
    resources: Record<string, ResourcePool>;
    resourcesRemoved: string[];
    tags?: string[];                       // full tag set when changed
    meta?: Record<string, string | number>; // full meta map when changed
  }>;
  /** No longer visible. Attribution is HONEST, not omniscient (design-1
   *  convergent HIGH): 'destroyed' when the entity died and its last
   *  OBSERVED position is visible under POST-tick visibility; otherwise
   *  'fog'. A same-tick move-then-die can therefore be mis-attributed —
   *  the engine diff does not carry final positions of destroyed entities,
   *  and capturing them via onDestroy was rejected because registering a
   *  destroy callback mutates the registration surface the v0.8.18
   *  manifest verifies (an observer must stay read-side). Pinned by test. */
  exited: Array<{ ref: EntityRef; reason: 'fog' | 'destroyed' }>;
  events: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
  worldState: { set: Record<string, unknown>; removed: string[] };
}
```

### 2. Mechanics

- **Visible-entity set** each tick = entities whose position cell passes visibility, computed by iterating `visibility.getVisibleCells(playerId)` (verified: exists, sorted ascending by cell index) × `world.grid.getAt(x, y)` — O(view), not O(world) — plus a positionless pass when enabled. Refs are `world.getEntityRef(id)` (generation-correct). The game must update its `VisibilityMap` BEFORE calling `observeTick()` — the observer reads visibility at call time (ordering requirement, documented).
- **Engine prerequisites (both additive, independently useful for agent introspection):** (1) `World.getStateKeys(): string[]` — nothing public enumerates state keys (design-1 Claude); (2) `World.getMetaEntries(entity): Record<string, string | number>` — nothing public returns an entity's full metadata map; `getMeta` is per-key and the diff only covers changed-this-tick entities, so an entity *entering view* unchanged would have no populatable `meta` (design-2 convergent Codex HIGH / Claude M1). The observer never reaches into `serialize()` for either.
- **observeTick()** diffs the new visible set against the stored previous set → `entered` (full data via `getComponents`) / `exited`; intersects `world.getDiff()`'s change channels with the alive new-visible set → `updated` (destroyed entities appear in the diff's tags/meta channels with empty sets — intersecting against the alive visible set excludes them from `updated` by construction). Destroyed-in-view detection: diff's `entities.destroyed` ∩ previous visible set, with the destruction cell's visibility tested at the observer's stored last-known position (the observer keeps `lastKnownPosition` per visible entity for exactly this — the diff carries no positions for destroyed entities).
- **Statefulness contract:** one `observeTick()` call per world tick, in order; calling twice for the same tick throws (`player_observer_tick_already_observed`, an `EngineError` — objective C landed first); a missed tick is detected via `world.tick` mismatch and throws rather than silently desyncing (`player_observer_tick_skipped`) — the observer is a projection of a deterministic stream and must not guess across gaps. `reset()` re-primes from a fresh `snapshot()` after deliberate gaps (e.g., agent reconnect).
- **Data isolation:** ALL returned payloads are deep-cloned (same `cloneJsonValue` discipline as the recorder) — component data, resource pools, AND world-state values (`getState` returns live stored references — design-2 Codex). Observations are agent-facing and must not be write-through.
- **Determinism:** pure read-side; iteration over visible cells is ordered (VisibilityMap cell order is deterministic — verify in plan; otherwise sort), entity lists sorted by id, so identical (world, visibility) streams produce byte-identical observations — making filtered-observation agents replayable.

### 3. Composition points

- **AI playtester:** the guide shows `decide(ctx)` constructing/holding a `PlayerObserver` over `ctx.world` and acting only on observations — the engine-supported honest-agent pattern. No `AgentDriverContext` change required in v1 (the world reference is already there); an `observer` convenience slot is a possible follow-up after real usage.
- **ClientAdapter:** guide recipe — one `PlayerObserver` per connected client, `observeTick()` output as the per-client tick message in place of the omniscient diff. Native `ClientAdapter` support deferred until the recipe shows what the right default is.
- **VisibilityMap** is unchanged; the observer is a consumer.

## Compatibility & versioning

Pure addition (new module + types, index exports). c-bump.

## Test plan

- Enter/exit/update semantics under: movement into/out of view, fog advance/recede (visibility source moves), spawn in view, spawn out of view (silent), destroy in view (`exited: destroyed`), destroy out of view (silent at destruction; `exited: fog` already emitted when it left view earlier — assert no destroyed leak), entity moving while visible (updated with position change), position-component REMOVAL while visible (entity drops off the grid alive → `exited: fog` under default `positionless: 'hidden'`; stays visible under `'visible'`) (design-2 Claude).
- Positionless modes; world-state modes incl. predicate; event modes incl. resolver receiving a working isVisible (and isVisible returning false, not throwing, for out-of-grid coordinates).
- Stateful contract: double-observe throws; skipped tick throws; poisoned world throws `player_observer_world_poisoned`; reset() re-primes; construction primes (first observeTick valid without snapshot()).
- Isolation: mutating returned data does not affect the world or later observations.
- Determinism: two observers over identical replayed worlds produce identical observation streams (leverages the registration-manifest + selfCheck machinery).
- Budget: new file ≤ 500.
