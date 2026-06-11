# Per-player filtered observation — DESIGN

**Objective:** `player-observation` · **Status:** v1 (pre-review) · **Origin:** full-review 2026-06-10 missing-pillar finding: "VisibilityMap tracks cells, but diffs/ClientAdapter are omniscient — a fog-of-war agent needs engine-side filtering that doesn't exist yet." Roadmap-tier spec (wave objective 4/7).

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
  /** Entities with no position component: 'visible' (default — global entities
   *  like match clocks) | 'hidden'. */
  positionless?: 'visible' | 'hidden';
  /** Include world-state (setState) keys in observations: 'all' (default) |
   *  'none' | (key: string) => boolean. World state is global by nature;
   *  games hiding per-player info in state pass a predicate. */
  worldState?: 'all' | 'none' | ((key: string) => boolean);
  /** Event filtering. Events carry no inherent position; the engine cannot
   *  guess. Default 'none' (SAFE: leak nothing). 'all' opts into omniscient
   *  events; a resolver receives each event and the observer's visibility
   *  test and decides. */
  events?: 'none' | 'all' | ((event: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] }, isVisible: (x: number, y: number) => boolean) => boolean);
}

class PlayerObserver<...> {
  constructor(config: PlayerObserverConfig<...>);
  /** Full filtered snapshot of currently-visible entities (+ per-config
   *  positionless/world-state). For session start / late join / agent boot. */
  snapshot(): PlayerObservation<TComponents>;
  /** Per-tick feed. Call once after each world.step() (or from an onDiff
   *  listener). Stateful: tracks the previously-visible entity set. */
  observeTick(): PlayerTickObservation<TEventMap, TComponents>;
  /** The visible-cell test bound to this player (delegates to VisibilityMap). */
  isVisible(x: number, y: number): boolean;
}

interface PlayerObservation<TComponents> {
  tick: number;
  entities: Array<{ id: EntityId; components: Partial<TComponents> }>;
  worldState: Record<string, unknown>;
}

interface PlayerTickObservation<TEventMap, TComponents> {
  tick: number;
  /** Newly visible this tick (spawned in view, moved into view, or fog
   *  receded over them): FULL current component data. */
  entered: Array<{ id: EntityId; components: Partial<TComponents> }>;
  /** Visible last tick and this tick, with component changes this tick
   *  (filtered projection of the world diff). */
  updated: Array<{ id: EntityId; components: Partial<TComponents> }>;
  /** No longer visible (moved out, fog advanced, or destroyed in view —
   *  reason distinguishes them; 'destroyed' only when the destruction cell
   *  was visible, otherwise the exit is reported as 'fog'). */
  exited: Array<{ id: EntityId; reason: 'fog' | 'destroyed' }>;
  events: Array<{ type: keyof TEventMap; data: TEventMap[keyof TEventMap] }>;
  worldState: { set: Record<string, unknown>; removed: string[] };
}
```

### 2. Mechanics

- **Visible-entity set** each tick = entities whose position cell passes `visibility.isVisible(playerId, x, y)`, plus positionless entities per config. Computed via `world.query(positionKey)` + grid reads — O(visible region) when iterating `visibility.getVisibleCells(playerId)` × `world.grid.getAt(cell)` (chosen: visible-cells iteration, which scales with the view, not the world) + a positionless pass when enabled.
- **observeTick()** diffs the new visible set against the stored previous set → `entered` (full data via `getComponents`) / `exited`; intersects with `world.getDiff()`'s component changes → `updated`. Destroyed-in-view detection: diff's `entities.destroyed` ∩ previous visible set, with the destruction cell's visibility read from the diff's last position (the previous tick's stored position — the observer keeps `lastKnownPosition` per visible entity for exactly this).
- **Statefulness contract:** one `observeTick()` call per world tick, in order; calling twice for the same tick throws (`player_observer_tick_already_observed` — uses the objective-C `EngineError` if it lands first, plain coded error shape otherwise); a missed tick is detected via `world.tick` mismatch and throws rather than silently desyncing (`player_observer_tick_skipped`) — the observer is a projection of a deterministic stream and must not guess across gaps. `reset()` re-primes from a fresh `snapshot()` after deliberate gaps (e.g., agent reconnect).
- **Data isolation:** all returned component data is deep-cloned (same `cloneJsonValue` discipline as the recorder) — observations are agent-facing and must not be write-through.
- **Determinism:** pure read-side; iteration over visible cells is ordered (VisibilityMap cell order is deterministic — verify in plan; otherwise sort), entity lists sorted by id, so identical (world, visibility) streams produce byte-identical observations — making filtered-observation agents replayable.

### 3. Composition points

- **AI playtester:** the guide shows `decide(ctx)` constructing/holding a `PlayerObserver` over `ctx.world` and acting only on observations — the engine-supported honest-agent pattern. No `AgentDriverContext` change required in v1 (the world reference is already there); an `observer` convenience slot is a possible follow-up after real usage.
- **ClientAdapter:** guide recipe — one `PlayerObserver` per connected client, `observeTick()` output as the per-client tick message in place of the omniscient diff. Native `ClientAdapter` support deferred until the recipe shows what the right default is.
- **VisibilityMap** is unchanged; the observer is a consumer.

## Compatibility & versioning

Pure addition (new module + types, index exports). c-bump.

## Test plan

- Enter/exit/update semantics under: movement into/out of view, fog advance/recede (visibility source moves), spawn in view, spawn out of view (silent), destroy in view (`exited: destroyed`), destroy out of view (silent at destruction; `exited: fog` already emitted when it left view earlier — assert no destroyed leak), entity moving while visible (updated with position change).
- Positionless modes; world-state modes incl. predicate; event modes incl. resolver receiving a working isVisible.
- Stateful contract: double-observe throws; skipped tick throws; reset() re-primes.
- Isolation: mutating returned data does not affect the world or later observations.
- Determinism: two observers over identical replayed worlds produce identical observation streams (leverages the registration-manifest + selfCheck machinery).
- Budget: new file ≤ 500.
