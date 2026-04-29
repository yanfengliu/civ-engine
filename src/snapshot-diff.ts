import type { TickDiff } from './diff.js';
import type { ResourcePool } from './resource-store.js';
import type { WorldSnapshot, WorldSnapshotV5 } from './serializer.js';
import type { EntityId } from './types.js';

/**
 * Snapshot-pair diff helper. Returns a {@link TickDiff}-shaped object
 * capturing the `TickDiff`-representable subset of changes between
 * `a` and `b`.
 *
 * Snapshot fields that fall outside the `TickDiff` schema are intentionally
 * NOT surfaced — see `docs/threads/done/bundle-viewer/DESIGN.md` §7
 * "Scope of `diffSnapshots`":
 *   - `WorldSnapshot.rng` (selfCheck's domain)
 *   - `WorldSnapshot.componentOptions` (registration invariant)
 *   - `WorldSnapshot.config` and any nested fields (registration invariant)
 *   - `WorldSnapshot.entities.{generations,alive,freeList}` directly (alive
 *     transitions surface as TickDiff.entities.created/destroyed instead)
 *   - `WorldSnapshot.version` (must agree by construction within one bundle)
 *
 * Used internally by {@link BundleViewer}'s `frame.diffSince` snapshot
 * fallback path; exported because the pair-diff is reusable for live-world
 * snapshot comparison in tests and tools.
 */
export function diffSnapshots(
  a: WorldSnapshot,
  b: WorldSnapshot,
  opts?: { tick?: number },
): TickDiff {
  // Engine currently produces v5 snapshots only. Older versions in the
  // WorldSnapshot union exist for migration purposes; diffSnapshots is
  // explicitly v5-only — fail fast so callers don't get silently truncated
  // results from missing fields (state/tags/metadata are v4+, etc.).
  if (a.version !== 5 || b.version !== 5) {
    throw new Error(
      `diffSnapshots requires WorldSnapshotV5; got versions ${a.version} and ${b.version}`,
    );
  }
  const av = a as WorldSnapshotV5;
  const bv = b as WorldSnapshotV5;
  const tick = opts?.tick ?? bv.tick ?? 0;

  return {
    tick,
    entities: diffEntities(av, bv),
    components: diffComponents(av, bv),
    resources: diffResources(av, bv),
    state: diffState(av, bv),
    tags: diffTags(av, bv),
    metadata: diffMetadata(av, bv),
  };
}

function diffEntities(a: WorldSnapshotV5, b: WorldSnapshotV5): TickDiff['entities'] {
  // An entity ID with the same numeric id but a different generation between
  // a and b represents recycling: the original was destroyed and a new one
  // was created reusing the slot. We surface that as both destroyed AND
  // created so the diff is honest. Without this, snapshot-fallback diffSince
  // would silently miss entity recycling within the range (review M2).
  const aAlive = aliveSet(a);
  const bAlive = aliveSet(b);
  const aGen = a.entities?.generations ?? [];
  const bGen = b.entities?.generations ?? [];
  const created: EntityId[] = [];
  const destroyed: EntityId[] = [];
  for (const id of bAlive) {
    if (!aAlive.has(id)) {
      created.push(id);
    } else if ((aGen[id] ?? 0) !== (bGen[id] ?? 0)) {
      // Same id alive in both, but generation changed: it was destroyed and recreated.
      destroyed.push(id);
      created.push(id);
    }
  }
  for (const id of aAlive) if (!bAlive.has(id)) destroyed.push(id);
  created.sort((x, y) => x - y);
  destroyed.sort((x, y) => x - y);
  return { created, destroyed };
}

function aliveSet(snap: WorldSnapshotV5): Set<EntityId> {
  const alive = snap.entities?.alive;
  const out = new Set<EntityId>();
  if (!alive) return out;
  for (let id = 0; id < alive.length; id++) {
    if (alive[id]) out.add(id);
  }
  return out;
}

function diffComponents(a: WorldSnapshotV5, b: WorldSnapshotV5): TickDiff['components'] {
  const out: TickDiff['components'] = {};
  const aTypes = a.components ?? {};
  const bTypes = b.components ?? {};
  const allTypes = new Set<string>([...Object.keys(aTypes), ...Object.keys(bTypes)]);
  for (const type of allTypes) {
    const aMap = mapFromEntries(aTypes[type] ?? []);
    const bMap = mapFromEntries(bTypes[type] ?? []);
    const set: Array<[EntityId, unknown]> = [];
    const removed: EntityId[] = [];
    for (const [id, bv] of bMap) {
      if (!aMap.has(id)) {
        set.push([id, bv]);
      } else if (!structuralEqual(aMap.get(id), bv)) {
        set.push([id, bv]);
      }
    }
    for (const [id] of aMap) {
      if (!bMap.has(id)) removed.push(id);
    }
    if (set.length > 0 || removed.length > 0) {
      set.sort(byEntityIdTuple);
      removed.sort((x, y) => x - y);
      out[type] = { set, removed };
    }
  }
  return out;
}

function diffResources(a: WorldSnapshotV5, b: WorldSnapshotV5): TickDiff['resources'] {
  const out: TickDiff['resources'] = {};
  const aPools = a.resources?.pools ?? {};
  const bPools = b.resources?.pools ?? {};
  const allKeys = new Set<string>([...Object.keys(aPools), ...Object.keys(bPools)]);
  for (const key of allKeys) {
    const aMap = mapFromEntries<ResourcePool>(aPools[key] ?? []);
    const bMap = mapFromEntries<ResourcePool>(bPools[key] ?? []);
    const set: Array<[EntityId, ResourcePool]> = [];
    const removed: EntityId[] = [];
    for (const [id, bv] of bMap) {
      if (!aMap.has(id)) {
        set.push([id, bv]);
      } else if (!structuralEqual(aMap.get(id), bv)) {
        set.push([id, bv]);
      }
    }
    for (const [id] of aMap) {
      if (!bMap.has(id)) removed.push(id);
    }
    if (set.length > 0 || removed.length > 0) {
      set.sort(byEntityIdTuple);
      removed.sort((x, y) => x - y);
      out[key] = { set, removed };
    }
  }
  return out;
}

function diffState(a: WorldSnapshotV5, b: WorldSnapshotV5): TickDiff['state'] {
  const aState = a.state ?? {};
  const bState = b.state ?? {};
  const set: Record<string, unknown> = {};
  const removed: string[] = [];
  for (const key of Object.keys(bState)) {
    if (!(key in aState) || !structuralEqual(aState[key], bState[key])) {
      set[key] = bState[key];
    }
  }
  for (const key of Object.keys(aState)) {
    if (!(key in bState)) removed.push(key);
  }
  removed.sort();
  return { set, removed };
}

function diffTags(a: WorldSnapshotV5, b: WorldSnapshotV5): TickDiff['tags'] {
  const aTags = a.tags ?? {};
  const bTags = b.tags ?? {};
  const out: TickDiff['tags'] = [];
  const allEntities = new Set<number>([
    ...Object.keys(aTags).map(Number),
    ...Object.keys(bTags).map(Number),
  ]);
  for (const entity of [...allEntities].sort((x, y) => x - y)) {
    const aList = aTags[entity] ?? [];
    const bList = bTags[entity] ?? [];
    if (!arrayEqualUnordered(aList, bList)) {
      // Use sorted tag list for deterministic output.
      out.push({ entity, tags: [...bList].sort() });
    }
  }
  return out;
}

function diffMetadata(a: WorldSnapshotV5, b: WorldSnapshotV5): TickDiff['metadata'] {
  const aMeta = a.metadata ?? {};
  const bMeta = b.metadata ?? {};
  const out: TickDiff['metadata'] = [];
  const allEntities = new Set<number>([
    ...Object.keys(aMeta).map(Number),
    ...Object.keys(bMeta).map(Number),
  ]);
  for (const entity of [...allEntities].sort((x, y) => x - y)) {
    const am = aMeta[entity] ?? {};
    const bm = bMeta[entity] ?? {};
    if (!structuralEqual(am, bm)) {
      out.push({ entity, meta: { ...bm } });
    }
  }
  return out;
}

function mapFromEntries<V>(entries: ReadonlyArray<readonly [EntityId, V]>): Map<EntityId, V> {
  const m = new Map<EntityId, V>();
  for (const [id, v] of entries) m.set(id, v);
  return m;
}

function byEntityIdTuple<V>(x: readonly [EntityId, V], y: readonly [EntityId, V]): number {
  return x[0] - y[0];
}

function structuralEqual(x: unknown, y: unknown): boolean {
  if (x === y) return true;
  if (x === null || y === null) return false;
  if (typeof x !== typeof y) return false;
  if (typeof x !== 'object') return false;
  if (Array.isArray(x) !== Array.isArray(y)) return false;
  if (Array.isArray(x) && Array.isArray(y)) {
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) {
      if (!structuralEqual(x[i], y[i])) return false;
    }
    return true;
  }
  const xObj = x as Record<string, unknown>;
  const yObj = y as Record<string, unknown>;
  const xKeys = Object.keys(xObj);
  const yKeys = Object.keys(yObj);
  if (xKeys.length !== yKeys.length) return false;
  for (const k of xKeys) {
    if (!(k in yObj)) return false;
    if (!structuralEqual(xObj[k], yObj[k])) return false;
  }
  return true;
}

function arrayEqualUnordered<T>(x: readonly T[], y: readonly T[]): boolean {
  if (x.length !== y.length) return false;
  const xSorted = [...x].sort();
  const ySorted = [...y].sort();
  for (let i = 0; i < xSorted.length; i++) {
    if (xSorted[i] !== ySorted[i]) return false;
  }
  return true;
}
