// Query layer of the `World` class chain: component-bit signatures, the
// sorted query cache, public query iterators, and the spatial-index sync
// helpers that keep `SpatialGrid` lock-step with position writes.

import type { EntityId, Position } from './types.js';
import type { ComponentStore } from './component-store.js';
import { asPosition, insertSorted } from './world-internal.js';
import type { ComponentRegistry, QueryCacheEntry } from './world-types.js';
import { WorldCore } from './world-core.js';

export abstract class WorldQueries<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends WorldCore<TEventMap, TCommandMap, TComponents, TState> {
  query<K extends keyof TComponents & string>(...keys: K[]): IterableIterator<EntityId>;
  query(...keys: string[]): IterableIterator<EntityId>;
  *query(...keys: string[]): IterableIterator<EntityId> {
    const queryKeys = this.normalizeQueryKeys(keys);
    if (!queryKeys) return;
    if (this.activeMetrics) {
      this.activeMetrics.query.calls++;
    }
    const cache = this.getQueryCache(queryKeys);
    for (const id of cache.entities) {
      if (this.activeMetrics) {
        this.activeMetrics.query.results++;
      }
      yield id;
    }
  }

  *queryInRadius(
    cx: number,
    cy: number,
    radius: number,
    ...components: string[]
  ): IterableIterator<EntityId> {
    const entityIds = this.spatialGrid.getInRadius(cx, cy, radius);
    if (components.length === 0) {
      yield* entityIds;
      return;
    }
    const mask = this.queryMask(components);
    for (const id of entityIds) {
      const sig = this.entitySignatures[id] ?? 0n;
      if ((sig & mask) === mask) {
        yield id;
      }
    }
  }

  /**
   * Nearest entity by squared Euclidean distance; exact-distance ties break
   * on the lowest entity id, so the result is independent of scan order.
   * Scans expanding Chebyshev perimeter rings — each grid cell is visited at
   * most once, so a full-map miss costs O(R²) cell probes instead of the
   * O(R³) cumulative-disk rescans used before v0.8.16 (full-review
   * 2026-06-10 M5).
   */
  findNearest(
    cx: number,
    cy: number,
    ...components: string[]
  ): EntityId | undefined {
    if (!Number.isInteger(cx) || !Number.isInteger(cy)) {
      // Fail fast like the pre-v0.8.16 implementation did (via assertBounds):
      // a non-finite coordinate would otherwise loop forever.
      throw new RangeError(`findNearest coordinates must be integers (got ${cx}, ${cy})`);
    }
    const w = this.spatialGrid.width;
    const h = this.spatialGrid.height;
    const mask = components.length > 0 ? this.queryMask(components) : 0n;
    // Ring-scan bounds: rings closer than the query point's Chebyshev
    // distance TO the grid cannot contain entities (skip them outright, so a
    // far out-of-bounds query costs O(grid), not O(distance²)); the farthest
    // grid column/row bounds the scan on the high side.
    const minRadius = Math.max(0, -cx, cx - (w - 1), -cy, cy - (h - 1));
    const maxRadius = Math.max(
      Math.abs(cx), Math.abs(w - 1 - cx),
      Math.abs(cy), Math.abs(h - 1 - cy),
    );
    let bestId: EntityId | undefined;
    let bestDistSq = Infinity;

    const consider = (x: number, y: number): void => {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const cell = this.spatialGrid.getAt(x, y);
      if (!cell) return;
      // Grid cells equal exact entity positions (lock-step sync), so the
      // cell distance IS each occupant's distance.
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;
      if (distSq > bestDistSq) return;
      for (const id of cell) {
        if (components.length > 0) {
          const sig = this.entitySignatures[id] ?? 0n;
          if ((sig & mask) !== mask) continue;
        }
        if (
          distSq < bestDistSq ||
          (distSq === bestDistSq && (bestId === undefined || id < bestId))
        ) {
          bestDistSq = distSq;
          bestId = id;
        }
      }
    };

    for (let r = minRadius; r <= maxRadius; r++) {
      // Ring r's minimum squared distance is r² (axis cells); later rings
      // only get farther. Stop once the best strictly beats r² — on an exact
      // tie keep scanning so a smaller id at equal distance can still win.
      if (bestId !== undefined && bestDistSq < r * r) break;
      if (r === 0) {
        consider(cx, cy);
        continue;
      }
      // Clamp each ring edge to the grid intersection so per-ring cost is
      // bounded by the grid, not by r.
      const xLo = Math.max(cx - r, 0);
      const xHi = Math.min(cx + r, w - 1);
      if (cy - r >= 0 && cy - r < h) for (let x = xLo; x <= xHi; x++) consider(x, cy - r);
      if (cy + r >= 0 && cy + r < h) for (let x = xLo; x <= xHi; x++) consider(x, cy + r);
      const yLo = Math.max(cy - r + 1, 0);
      const yHi = Math.min(cy + r - 1, h - 1);
      if (cx - r >= 0 && cx - r < w) for (let y = yLo; y <= yHi; y++) consider(cx - r, y);
      if (cx + r >= 0 && cx + r < w) for (let y = yLo; y <= yHi; y++) consider(cx + r, y);
    }
    return bestId;
  }

  protected syncSpatialEntity(entity: EntityId, pos: Position): void {
    if (this.activeMetrics) {
      this.activeMetrics.spatial.explicitSyncs++;
    }
    const prev = this.previousPositions.get(entity);
    if (!prev) {
      this.spatialGrid.insert(entity, pos.x, pos.y);
      this.previousPositions.set(entity, { x: pos.x, y: pos.y });
      return;
    }
    if (prev.x !== pos.x || prev.y !== pos.y) {
      this.spatialGrid.move(entity, prev.x, prev.y, pos.x, pos.y);
      prev.x = pos.x;
      prev.y = pos.y;
    }
  }

  protected rebuildSpatialIndex(): void {
    const posStore = this.componentStores.get(this.positionKey) as
      | ComponentStore<Position>
      | undefined;
    if (!posStore) return;

    this.previousPositions.clear();
    for (const id of posStore.entities()) {
      const pos = asPosition(posStore.get(id));
      this.assertPositionInBounds(pos);
      this.spatialGrid.insert(id, pos.x, pos.y);
      this.previousPositions.set(id, { x: pos.x, y: pos.y });
    }
  }

  protected removeFromSpatialIndex(entity: EntityId): void {
    const prev = this.previousPositions.get(entity);
    if (!prev) return;
    this.spatialGrid.remove(entity, prev.x, prev.y);
    this.previousPositions.delete(entity);
  }

  protected registerComponentBit(key: string): bigint {
    const existing = this.componentBits.get(key);
    if (existing !== undefined) return existing;
    const bit = 1n << BigInt(this.nextComponentBit);
    this.nextComponentBit++;
    this.componentBits.set(key, bit);
    return bit;
  }

  protected setEntityComponentSignature(
    entity: EntityId,
    key: string,
    hasComponent: boolean,
  ): void {
    const bit = this.registerComponentBit(key);
    const current = this.entitySignatures[entity] ?? 0n;
    const next = hasComponent ? current | bit : current & ~bit;
    this.setEntitySignature(entity, next);
  }

  protected setEntitySignature(entity: EntityId, next: bigint): void {
    const previous = this.entitySignatures[entity] ?? 0n;
    if (previous === next) return;
    this.entitySignatures[entity] = next;
    this.updateQueryCacheMembership(entity, previous, next);
  }

  private updateQueryCacheMembership(
    entity: EntityId,
    previous: bigint,
    next: bigint,
  ): void {
    if (this.activeMetrics) {
      this.activeMetrics.query.membershipChecks += this.queryCache.size;
    }
    for (const cache of this.queryCache.values()) {
      const didMatch = (previous & cache.mask) === cache.mask;
      const doesMatch = (next & cache.mask) === cache.mask;
      if (didMatch === doesMatch) continue;
      if (doesMatch) {
        insertSorted(cache.entities, entity);
      } else {
        const index = cache.entities.indexOf(entity);
        if (index !== -1) {
          cache.entities.splice(index, 1);
        }
      }
    }
  }

  private normalizeQueryKeys(keys: string[]): string[] | null {
    if (keys.length === 0) return null;

    const unique = [...new Set(keys)];
    unique.sort();
    for (const key of unique) {
      if (!this.componentStores.has(key)) {
        throw new Error(`Component '${key}' is not registered`);
      }
    }
    return unique;
  }

  private getQueryCache(keys: string[]): QueryCacheEntry {
    const cacheKey = keys.join('\0');
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      if (this.activeMetrics) {
        this.activeMetrics.query.cacheHits++;
      }
      return cached;
    }
    if (this.activeMetrics) {
      this.activeMetrics.query.cacheMisses++;
    }

    const mask = this.queryMask(keys);
    let smallest = this.componentStores.get(keys[0])!;
    for (let i = 1; i < keys.length; i++) {
      const store = this.componentStores.get(keys[i])!;
      if (store.size < smallest.size) {
        smallest = store;
      }
    }

    const entities: EntityId[] = [];
    for (const id of smallest.entities()) {
      if (((this.entitySignatures[id] ?? 0n) & mask) === mask) {
        entities.push(id);
      }
    }

    const entry = { mask, entities };
    this.queryCache.set(cacheKey, entry);
    return entry;
  }

  protected queryMask(keys: string[]): bigint {
    let mask = 0n;
    for (const key of keys) {
      const bit = this.componentBits.get(key);
      if (bit === undefined) {
        throw new Error(`Component '${key}' is not registered`);
      }
      mask |= bit;
    }
    return mask;
  }

  protected rebuildComponentSignatures(): void {
    this.componentBits.clear();
    this.nextComponentBit = 0;
    this.entitySignatures = [];
    this.queryCache.clear();

    for (const key of this.componentStores.keys()) {
      this.registerComponentBit(key);
    }
    for (const [key, store] of this.componentStores) {
      const bit = this.componentBits.get(key)!;
      for (const entity of store.entities()) {
        this.entitySignatures[entity] =
          (this.entitySignatures[entity] ?? 0n) | bit;
      }
    }
  }
}
