// Internal helpers and fold algorithm for src/bundle-viewer.ts.
// Extracted to keep bundle-viewer.ts under the 500-LOC review cap (AGENTS.md).

import type { TickDiff } from './diff.js';
import type { OneOrMany } from './bundle-corpus-types.js';
import type { SessionTickEntry } from './session-bundle.js';

export const EMPTY_FROZEN_ARRAY: readonly never[] = Object.freeze([]) as readonly never[];

/**
 * Bucket items by their tick (or sub-tick key) into a Map of frozen arrays.
 * Optional comparator pre-sorts each bucket so iterators don't pay sort cost
 * per call.
 */
export function bucketByTick<T>(
  items: readonly T[],
  getTick: (item: T) => number,
  comparator?: (a: T, b: T) => number,
): Map<number, readonly T[]> {
  const out = new Map<number, T[]>();
  for (const item of items) {
    const t = getTick(item);
    let arr = out.get(t);
    if (!arr) { arr = []; out.set(t, arr); }
    arr.push(item);
  }
  const result = new Map<number, readonly T[]>();
  for (const [t, arr] of out) {
    const final = comparator ? arr.slice().sort(comparator) : arr.slice();
    result.set(t, Object.freeze(final));
  }
  return result;
}

export function oneOrManySet<T>(value: OneOrMany<T> | undefined): Set<T> | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) return new Set(value);
  return new Set([value as T]);
}

export function emptyTickDiff(tick: number): TickDiff {
  return {
    tick,
    entities: { created: [], destroyed: [] },
    components: {},
    resources: {},
    state: { set: {}, removed: [] },
    tags: [],
    metadata: [],
  };
}

/**
 * Fold per-tick `TickDiff`s in `(fromTick, toTick]` into a single coalesced
 * TickDiff. Caller is responsible for path-1 safety (no failures in range,
 * dense SessionTickEntry coverage, no entity-ID recycling). The fold rule is
 * last-write-wins per `(component, entity)` and per state key; entities
 * destroyed within the range are excluded from `set` and added to `removed`.
 * Resources, state, tags, and metadata follow the same coalescing.
 *
 * `diff.tick` is set to `toTick` for symmetry with the snapshot-fallback path.
 */
export function foldTickDiffs<TEventMap, TDebug>(
  tickEntriesByTick: ReadonlyMap<number, SessionTickEntry<TEventMap, TDebug> & { tick: number; diff: TickDiff }>,
  fromTick: number,
  toTick: number,
): TickDiff {
  const created = new Set<number>();
  const destroyed = new Set<number>();
  const componentsSet = new Map<string, Map<number, unknown>>();
  const componentsRemoved = new Map<string, Set<number>>();
  const resourcesSet = new Map<string, Map<number, unknown>>();
  const resourcesRemoved = new Map<string, Set<number>>();
  const stateSet: Record<string, unknown> = {};
  const stateRemoved = new Set<string>();
  const tagsByEntity = new Map<number, string[]>();
  const metaByEntity = new Map<number, Record<string, string | number>>();

  for (let t = fromTick + 1; t <= toTick; t++) {
    const entry = tickEntriesByTick.get(t);
    if (!entry) continue;
    const diff = entry.diff;
    for (const id of diff.entities.created) {
      destroyed.delete(id);
      created.add(id);
    }
    for (const id of diff.entities.destroyed) {
      created.delete(id);
      destroyed.add(id);
      // Destroying clears any prior set component / resource entries for this id.
      // Note: the surrounding diff in this same tick MUST also include the matching
      // `removed` entries (recorder invariant), which the loops below process; we
      // do not treat a destroyed entity here as authoritative in case future malformed
      // diffs include destroy without removed.
      for (const [, m] of componentsSet) m.delete(id);
      for (const [, m] of resourcesSet) m.delete(id);
    }
    for (const [type, change] of Object.entries(diff.components)) {
      let setMap = componentsSet.get(type);
      if (!setMap) { setMap = new Map(); componentsSet.set(type, setMap); }
      let remSet = componentsRemoved.get(type);
      if (!remSet) { remSet = new Set(); componentsRemoved.set(type, remSet); }
      for (const [id, value] of change.set) {
        // Skip set entries for entities destroyed earlier in this same fold step;
        // the recorder writes destroy after set within a tick, but defending is cheap.
        if (destroyed.has(id) && !created.has(id)) continue;
        remSet.delete(id);
        setMap.set(id, value);
      }
      for (const id of change.removed) {
        setMap.delete(id);
        remSet.add(id);
      }
    }
    for (const [type, change] of Object.entries(diff.resources)) {
      let setMap = resourcesSet.get(type);
      if (!setMap) { setMap = new Map(); resourcesSet.set(type, setMap); }
      let remSet = resourcesRemoved.get(type);
      if (!remSet) { remSet = new Set(); resourcesRemoved.set(type, remSet); }
      for (const [id, value] of change.set) {
        if (destroyed.has(id) && !created.has(id)) continue;
        remSet.delete(id);
        setMap.set(id, value);
      }
      for (const id of change.removed) {
        setMap.delete(id);
        remSet.add(id);
      }
    }
    for (const [key, value] of Object.entries(diff.state.set)) {
      stateRemoved.delete(key);
      stateSet[key] = value;
    }
    for (const key of diff.state.removed) {
      delete stateSet[key];
      stateRemoved.add(key);
    }
    for (const e of diff.tags) tagsByEntity.set(e.entity, e.tags);
    for (const e of diff.metadata) metaByEntity.set(e.entity, e.meta);
  }

  const folded: TickDiff = {
    tick: toTick,
    entities: {
      created: [...created].sort((a, b) => a - b),
      destroyed: [...destroyed].sort((a, b) => a - b),
    },
    components: {},
    resources: {},
    state: { set: stateSet, removed: [...stateRemoved].sort() },
    tags: [...tagsByEntity.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([entity, tags]) => ({ entity, tags })),
    metadata: [...metaByEntity.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([entity, meta]) => ({ entity, meta })),
  };
  for (const [type, m] of componentsSet) {
    const removedSet = componentsRemoved.get(type) ?? new Set();
    const setArr: Array<[number, unknown]> = [...m.entries()].sort((a, b) => a[0] - b[0]);
    const removedArr = [...removedSet].sort((a, b) => a - b);
    if (setArr.length > 0 || removedArr.length > 0) {
      folded.components[type] = { set: setArr, removed: removedArr };
    }
  }
  for (const [type, m] of resourcesSet) {
    const removedSet = resourcesRemoved.get(type) ?? new Set();
    const setArr = [...m.entries()].sort((a, b) => a[0] - b[0]);
    const removedArr = [...removedSet].sort((a, b) => a - b);
    if (setArr.length > 0 || removedArr.length > 0) {
      folded.resources[type] = { set: setArr as Array<[number, never]>, removed: removedArr };
    }
  }
  return folded;
}
