// Spec 5 / Step 10a — applyTickDiff helper.
// Internal (not exported from src/index.ts). Used by diffBundles' state-diff
// fold to hydrate per-tick states from initialSnapshot + intermediate
// snapshots[] + per-tick TickDiffs.
//
// PARTIAL HYDRATION: This helper does NOT recover rng/componentOptions/config
// — those are excluded from TickDiff (`src/snapshot-diff.ts:14-21`). Callers
// who need a fully replayable snapshot should use
// `replayer.openAt(tick).serialize()` (= `replayer.stateAtTick(tick)`).
// applyTickDiff is safe inside `diffSnapshots` consumers because diffSnapshots
// excludes those same fields by design.
//
// LIMITATION (PLAN.md §5 Risks): if a tick destroys-and-recreates the same
// entity twice, the engine bumps generation by 2 but diffSnapshots collapses
// the cycle into one {destroyed, created} pair — applyTickDiff produces gen+1
// (off by 1 vs. the engine). Edge case; not blocking v1.

import type { TickDiff } from './diff.js';
import type { WorldSnapshot, WorldSnapshotV5 } from './serializer.js';
import type { EntityId } from './types.js';

export function applyTickDiff(snapshot: WorldSnapshot, diff: TickDiff): WorldSnapshot {
  if (snapshot.version !== 5) {
    throw new Error(`applyTickDiff requires WorldSnapshotV5; got version ${snapshot.version}`);
  }
  const v5 = snapshot;

  // Clone collections we need to mutate.
  const alive = (v5.entities?.alive ?? []).slice();
  const generations = (v5.entities?.generations ?? []).slice();
  const freeList = (v5.entities?.freeList ?? []).slice();

  // ---- entities: destroyed first, then created ----
  for (const id of diff.entities.destroyed) {
    alive[id] = false;
    generations[id] = (generations[id] ?? 0) + 1;
    freeList.push(id);
  }
  for (const id of diff.entities.created) {
    if (id < alive.length) {
      alive[id] = true;
      const fIdx = freeList.indexOf(id);
      if (fIdx >= 0) freeList.splice(fIdx, 1);
    } else {
      // Extend arrays up to id+1.
      while (alive.length < id + 1) alive.push(false);
      while (generations.length < id + 1) generations.push(0);
      alive[id] = true;
      // generations[id] stays at default (0)
    }
  }

  // ---- components: per-type set/removed ----
  const components: Record<string, Array<[EntityId, unknown]>> = {};
  for (const [type, entries] of Object.entries(v5.components ?? {})) {
    const map = new Map<EntityId, unknown>(entries);
    components[type] = Array.from(map);
  }
  for (const [type, change] of Object.entries(diff.components)) {
    const map = new Map<EntityId, unknown>(components[type] ?? []);
    for (const [id, value] of change.set) map.set(id, value);
    for (const id of change.removed) map.delete(id);
    if (map.size === 0) {
      delete components[type];
    } else {
      components[type] = Array.from(map);
    }
  }

  // ---- resources: per-pool set/removed targets ResourceStoreState.pools ----
  // TickDiff.resources only carries pool deltas; other ResourceStoreState
  // fields (registered, production, consumption, transfers, nextTransferId)
  // are not in the diff and pass through from the input snapshot.
  const resourcePools: Record<string, Array<[EntityId, unknown]>> = {
    ...(v5.resources?.pools ?? {}),
  };
  for (const [poolName, change] of Object.entries(diff.resources)) {
    const map = new Map<EntityId, unknown>(resourcePools[poolName] ?? []);
    for (const [id, value] of change.set) map.set(id, value);
    for (const id of change.removed) map.delete(id);
    if (map.size === 0) {
      delete resourcePools[poolName];
    } else {
      resourcePools[poolName] = Array.from(map);
    }
  }
  const resources = {
    ...(v5.resources ?? {
      registered: [],
      pools: {},
      production: {},
      consumption: {},
      transfers: [],
      nextTransferId: 0,
    }),
    pools: resourcePools as typeof v5.resources.pools,
  };

  // ---- state: set/removed ----
  const state: Record<string, unknown> = { ...(v5.state ?? {}) };
  for (const [k, v] of Object.entries(diff.state.set)) state[k] = v;
  for (const k of diff.state.removed) delete state[k];

  // ---- tags: wholesale per-entity, with empty-cleanup ----
  const tags: Record<number, string[]> = { ...(v5.tags ?? {}) };
  for (const entry of diff.tags) {
    if (entry.tags.length === 0) {
      delete tags[entry.entity];
    } else {
      tags[entry.entity] = entry.tags.slice();
    }
  }

  // ---- metadata: wholesale per-entity, with empty-cleanup ----
  const metadata: Record<number, Record<string, string | number>> = { ...(v5.metadata ?? {}) };
  for (const entry of diff.metadata) {
    if (Object.keys(entry.meta).length === 0) {
      delete metadata[entry.entity];
    } else {
      metadata[entry.entity] = { ...entry.meta };
    }
  }

  const out: WorldSnapshotV5 = {
    version: 5,
    config: v5.config,
    tick: diff.tick,
    entities: { alive, generations, freeList },
    components,
    componentOptions: v5.componentOptions,
    resources,
    rng: v5.rng,
    state,
    tags,
    metadata,
  };
  return out;
}
