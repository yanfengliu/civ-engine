import type { EntityId } from './types.js';

export interface ResourcePool {
  current: number;
  max: number;
}

export interface Transfer {
  id: number;
  from: EntityId;
  to: EntityId;
  resource: string;
  rate: number;
}

export class ResourceStore {
  private registeredKeys = new Map<string, { defaultMax: number }>();
  private pools = new Map<string, Map<EntityId, ResourcePool>>();
  private production = new Map<string, Map<EntityId, number>>();
  private consumption = new Map<string, Map<EntityId, number>>();
  private transfers: Transfer[] = [];
  private nextTransferId = 0;
  private dirtyPools = new Map<string, Set<EntityId>>();
  private removedPools = new Map<string, Set<EntityId>>();

  register(key: string, options?: { defaultMax?: number }): void {
    if (this.registeredKeys.has(key)) {
      throw new Error(`Resource '${key}' is already registered`);
    }
    this.registeredKeys.set(key, { defaultMax: options?.defaultMax ?? Infinity });
    this.pools.set(key, new Map());
    this.production.set(key, new Map());
    this.consumption.set(key, new Map());
    this.dirtyPools.set(key, new Set());
    this.removedPools.set(key, new Set());
  }

  addResource(entityId: EntityId, key: string, amount: number): number {
    const opts = this.getOpts(key);
    const poolMap = this.pools.get(key)!;
    let pool = poolMap.get(entityId);
    if (!pool) {
      pool = { current: 0, max: opts.defaultMax };
      poolMap.set(entityId, pool);
    }
    const space = pool.max - pool.current;
    const actual = Math.min(amount, space);
    pool.current += actual;
    this.markDirty(key, entityId);
    return actual;
  }

  removeResource(entityId: EntityId, key: string, amount: number): number {
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return 0;
    const actual = Math.min(amount, pool.current);
    pool.current -= actual;
    this.markDirty(key, entityId);
    return actual;
  }

  getResource(entityId: EntityId, key: string): ResourcePool | undefined {
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return undefined;
    return { current: pool.current, max: pool.max };
  }

  setResourceMax(entityId: EntityId, key: string, max: number): void {
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return;
    pool.max = max;
    if (pool.current > max) {
      pool.current = max;
    }
    this.markDirty(key, entityId);
  }

  *getResourceEntities(key: string): IterableIterator<EntityId> {
    this.getOpts(key);
    yield* this.pools.get(key)!.keys();
  }

  setProduction(entityId: EntityId, key: string, rate: number): void {
    const opts = this.getOpts(key);
    if (rate === 0) {
      this.production.get(key)!.delete(entityId);
      return;
    }
    this.production.get(key)!.set(entityId, rate);
    const poolMap = this.pools.get(key)!;
    if (!poolMap.has(entityId)) {
      poolMap.set(entityId, { current: 0, max: opts.defaultMax });
      this.markDirty(key, entityId);
    }
  }

  getProduction(entityId: EntityId, key: string): number {
    this.getOpts(key);
    return this.production.get(key)!.get(entityId) ?? 0;
  }

  setConsumption(entityId: EntityId, key: string, rate: number): void {
    this.getOpts(key);
    if (rate === 0) {
      this.consumption.get(key)!.delete(entityId);
      return;
    }
    this.consumption.get(key)!.set(entityId, rate);
  }

  getConsumption(entityId: EntityId, key: string): number {
    this.getOpts(key);
    return this.consumption.get(key)!.get(entityId) ?? 0;
  }

  addTransfer(from: EntityId, to: EntityId, resource: string, rate: number): number {
    this.getOpts(resource);
    const id = this.nextTransferId++;
    this.transfers.push({ id, from, to, resource, rate });
    return id;
  }

  removeTransfer(id: number): void {
    const idx = this.transfers.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.transfers.splice(idx, 1);
    }
  }

  getTransfers(entityId: EntityId): Transfer[] {
    return this.transfers.filter((t) => t.from === entityId || t.to === entityId);
  }

  processTick(isAlive: (id: EntityId) => boolean): void {
    for (const [key, rateMap] of this.production) {
      const poolMap = this.pools.get(key)!;
      for (const [entityId, rate] of rateMap) {
        const pool = poolMap.get(entityId);
        if (!pool) continue;
        const space = pool.max - pool.current;
        const actual = Math.min(rate, space);
        if (actual > 0) {
          pool.current += actual;
          this.markDirty(key, entityId);
        }
      }
    }
    for (const [key, rateMap] of this.consumption) {
      const poolMap = this.pools.get(key)!;
      for (const [entityId, rate] of rateMap) {
        const pool = poolMap.get(entityId);
        if (!pool) continue;
        const actual = Math.min(rate, pool.current);
        if (actual > 0) {
          pool.current -= actual;
          this.markDirty(key, entityId);
        }
      }
    }
    const deadTransfers: number[] = [];
    for (const transfer of this.transfers) {
      if (!isAlive(transfer.from) || !isAlive(transfer.to)) {
        deadTransfers.push(transfer.id);
        continue;
      }
      const poolMap = this.pools.get(transfer.resource);
      if (!poolMap) continue;
      const srcPool = poolMap.get(transfer.from);
      const dstPool = poolMap.get(transfer.to);
      if (!srcPool || !dstPool) continue;
      const available = Math.min(transfer.rate, srcPool.current);
      const space = dstPool.max - dstPool.current;
      const actual = Math.min(available, space);
      if (actual > 0) {
        srcPool.current -= actual;
        dstPool.current += actual;
        this.markDirty(transfer.resource, transfer.from);
        this.markDirty(transfer.resource, transfer.to);
      }
    }
    for (const id of deadTransfers) {
      this.removeTransfer(id);
    }
  }

  removeEntity(entityId: EntityId): void {
    for (const [key, poolMap] of this.pools) {
      if (poolMap.has(entityId)) {
        poolMap.delete(entityId);
        this.dirtyPools.get(key)!.delete(entityId);
        this.removedPools.get(key)!.add(entityId);
      }
    }
    for (const rateMap of this.production.values()) {
      rateMap.delete(entityId);
    }
    for (const rateMap of this.consumption.values()) {
      rateMap.delete(entityId);
    }
    this.transfers = this.transfers.filter(
      (t) => t.from !== entityId && t.to !== entityId,
    );
  }

  getDirty(): Record<string, { set: Array<[EntityId, ResourcePool]>; removed: EntityId[] }> {
    const result: Record<string, { set: Array<[EntityId, ResourcePool]>; removed: EntityId[] }> = {};
    for (const [key, dirtySet] of this.dirtyPools) {
      const removedSet = this.removedPools.get(key)!;
      if (dirtySet.size === 0 && removedSet.size === 0) continue;
      const set: Array<[EntityId, ResourcePool]> = [];
      const poolMap = this.pools.get(key)!;
      for (const id of dirtySet) {
        const pool = poolMap.get(id);
        if (pool) {
          set.push([id, { current: pool.current, max: pool.max }]);
        }
      }
      result[key] = { set, removed: [...removedSet] };
    }
    return result;
  }

  clearDirty(): void {
    for (const dirtySet of this.dirtyPools.values()) {
      dirtySet.clear();
    }
    for (const removedSet of this.removedPools.values()) {
      removedSet.clear();
    }
  }

  private getOpts(key: string): { defaultMax: number } {
    const opts = this.registeredKeys.get(key);
    if (!opts) {
      throw new Error(`Resource '${key}' is not registered`);
    }
    return opts;
  }

  private markDirty(key: string, entityId: EntityId): void {
    this.dirtyPools.get(key)!.add(entityId);
  }
}
