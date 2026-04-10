import type { EntityId } from './types.js';

export type ResourceMax = number | null;

export interface ResourcePool {
  current: number;
  max: ResourceMax;
}

export interface Transfer {
  id: number;
  from: EntityId;
  to: EntityId;
  resource: string;
  rate: number;
}

export interface ResourceStoreState {
  registered: Array<[string, { defaultMax: ResourceMax }]>;
  pools: Record<string, Array<[EntityId, ResourcePool]>>;
  production: Record<string, Array<[EntityId, number]>>;
  consumption: Record<string, Array<[EntityId, number]>>;
  transfers: Transfer[];
  nextTransferId: number;
}

export class ResourceStore {
  private registeredKeys = new Map<string, { defaultMax: ResourceMax }>();
  private pools = new Map<string, Map<EntityId, ResourcePool>>();
  private production = new Map<string, Map<EntityId, number>>();
  private consumption = new Map<string, Map<EntityId, number>>();
  private transfers: Transfer[] = [];
  private nextTransferId = 0;
  private dirtyPools = new Map<string, Set<EntityId>>();
  private removedPools = new Map<string, Set<EntityId>>();

  register(key: string, options?: { defaultMax?: ResourceMax }): void {
    if (this.registeredKeys.has(key)) {
      throw new Error(`Resource '${key}' is already registered`);
    }
    const defaultMax = normalizeMax(options?.defaultMax ?? null);
    this.registeredKeys.set(key, { defaultMax });
    this.pools.set(key, new Map());
    this.production.set(key, new Map());
    this.consumption.set(key, new Map());
    this.dirtyPools.set(key, new Set());
    this.removedPools.set(key, new Set());
  }

  addResource(entityId: EntityId, key: string, amount: number): number {
    assertNonNegativeFinite(amount, 'Resource amount');
    const opts = this.getOpts(key);
    const poolMap = this.pools.get(key)!;
    let pool = poolMap.get(entityId);
    let created = false;
    if (!pool) {
      pool = { current: 0, max: opts.defaultMax };
      poolMap.set(entityId, pool);
      created = true;
    }
    const space = maxCapacity(pool.max) - pool.current;
    const actual = Math.min(amount, space);
    pool.current += actual;
    if (created || actual > 0) {
      this.markDirty(key, entityId);
    }
    return actual;
  }

  removeResource(entityId: EntityId, key: string, amount: number): number {
    assertNonNegativeFinite(amount, 'Resource amount');
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return 0;
    const actual = Math.min(amount, pool.current);
    pool.current -= actual;
    if (actual > 0) {
      this.markDirty(key, entityId);
    }
    return actual;
  }

  getResource(entityId: EntityId, key: string): ResourcePool | undefined {
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return undefined;
    return { current: pool.current, max: pool.max };
  }

  setResourceMax(entityId: EntityId, key: string, max: ResourceMax): void {
    max = normalizeMax(max);
    this.getOpts(key);
    const pool = this.pools.get(key)!.get(entityId);
    if (!pool) return;
    const previousCurrent = pool.current;
    const previousMax = pool.max;
    pool.max = max;
    const capacity = maxCapacity(max);
    if (pool.current > capacity) {
      pool.current = capacity;
    }
    if (pool.current !== previousCurrent || pool.max !== previousMax) {
      this.markDirty(key, entityId);
    }
  }

  *getResourceEntities(key: string): IterableIterator<EntityId> {
    this.getOpts(key);
    yield* this.pools.get(key)!.keys();
  }

  setProduction(entityId: EntityId, key: string, rate: number): void {
    assertNonNegativeFinite(rate, 'Production rate');
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
    assertNonNegativeFinite(rate, 'Consumption rate');
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
    assertNonNegativeFinite(rate, 'Transfer rate');
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
    return this.transfers
      .filter((t) => t.from === entityId || t.to === entityId)
      .map((t) => ({ ...t }));
  }

  processTick(isAlive: (id: EntityId) => boolean): void {
    for (const [key, rateMap] of this.production) {
      const poolMap = this.pools.get(key)!;
      for (const [entityId, rate] of rateMap) {
        const pool = poolMap.get(entityId);
        if (!pool) continue;
        const space = maxCapacity(pool.max) - pool.current;
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
      const space = maxCapacity(dstPool.max) - dstPool.current;
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

  getState(): ResourceStoreState {
    const pools: ResourceStoreState['pools'] = {};
    const production: ResourceStoreState['production'] = {};
    const consumption: ResourceStoreState['consumption'] = {};

    for (const [key, poolMap] of this.pools) {
      pools[key] = [...poolMap.entries()].map(([id, pool]) => [
        id,
        { current: pool.current, max: pool.max },
      ]);
    }
    for (const [key, rateMap] of this.production) {
      production[key] = [...rateMap.entries()];
    }
    for (const [key, rateMap] of this.consumption) {
      consumption[key] = [...rateMap.entries()];
    }

    return {
      registered: [...this.registeredKeys.entries()].map(([key, options]) => [
        key,
        { defaultMax: options.defaultMax },
      ]),
      pools,
      production,
      consumption,
      transfers: this.transfers.map((transfer) => ({ ...transfer })),
      nextTransferId: this.nextTransferId,
    };
  }

  static fromState(state: ResourceStoreState): ResourceStore {
    const store = new ResourceStore();
    for (const [key, options] of state.registered) {
      store.register(key, options);
    }

    for (const [key, entries] of Object.entries(state.pools)) {
      store.getOpts(key);
      const poolMap = store.pools.get(key)!;
      for (const [entityId, pool] of entries) {
        assertNonNegativeFinite(pool.current, 'Resource current');
        poolMap.set(entityId, {
          current: pool.current,
          max: normalizeMax(pool.max),
        });
      }
    }

    for (const [key, entries] of Object.entries(state.production)) {
      store.getOpts(key);
      const rateMap = store.production.get(key)!;
      for (const [entityId, rate] of entries) {
        assertNonNegativeFinite(rate, 'Production rate');
        if (rate !== 0) rateMap.set(entityId, rate);
      }
    }

    for (const [key, entries] of Object.entries(state.consumption)) {
      store.getOpts(key);
      const rateMap = store.consumption.get(key)!;
      for (const [entityId, rate] of entries) {
        assertNonNegativeFinite(rate, 'Consumption rate');
        if (rate !== 0) rateMap.set(entityId, rate);
      }
    }

    store.transfers = state.transfers.map((transfer) => {
      store.getOpts(transfer.resource);
      assertNonNegativeFinite(transfer.rate, 'Transfer rate');
      return { ...transfer };
    });
    if (!Number.isInteger(state.nextTransferId) || state.nextTransferId < 0) {
      throw new Error('nextTransferId must be a non-negative integer');
    }
    store.nextTransferId = state.nextTransferId;
    store.clearDirty();
    return store;
  }

  private getOpts(key: string): { defaultMax: ResourceMax } {
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

function normalizeMax(max: ResourceMax): ResourceMax {
  if (max === null) return null;
  assertNonNegativeFinite(max, 'Resource max');
  return max;
}

function maxCapacity(max: ResourceMax): number {
  return max ?? Infinity;
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}
