import type { EntityId, EntityRef, Position, WorldConfig } from './types.js';
import type { WorldSnapshot } from './serializer.js';
import type { TickDiff } from './diff.js';
import { EntityManager } from './entity-manager.js';
import { ComponentStore } from './component-store.js';
import { SpatialGrid } from './spatial-grid.js';
import type { SpatialGridView } from './spatial-grid.js';
import { GameLoop } from './game-loop.js';
import { EventBus } from './event-bus.js';
import { CommandQueue } from './command-queue.js';
import { ResourceStore } from './resource-store.js';
import type { ResourceMax, ResourcePool } from './resource-store.js';
import { assertJsonCompatible } from './json.js';
import { DeterministicRandom } from './random.js';

export type System<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> = (world: World<TEventMap, TCommandMap>) => void;

type ComponentTuple<T extends unknown[]> = { [K in keyof T]: T[K] | undefined };

interface QueryCacheEntry {
  readonly mask: bigint;
  readonly entities: EntityId[];
}

export class World<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  private entityManager: EntityManager;
  private componentStores = new Map<string, ComponentStore<unknown>>();
  private componentBits = new Map<string, bigint>();
  private nextComponentBit = 0;
  private entitySignatures: bigint[] = [];
  private queryCache = new Map<string, QueryCacheEntry>();
  private systems: System<TEventMap, TCommandMap>[] = [];
  private gameLoop: GameLoop;
  private previousPositions = new Map<EntityId, { x: number; y: number }>();
  private eventBus = new EventBus<TEventMap>();
  private commandQueue = new CommandQueue<TCommandMap>();
  private validators = new Map<
    keyof TCommandMap,
    Array<(data: never, world: World<TEventMap, TCommandMap>) => boolean>
  >();
  private handlers = new Map<
    keyof TCommandMap,
    (data: never, world: World<TEventMap, TCommandMap>) => void
  >();
  private spatialGrid: SpatialGrid;
  readonly grid: SpatialGridView;
  readonly positionKey: string;
  private readonly seed: number | string | undefined;
  private currentDiff: TickDiff | null = null;
  private diffListeners = new Set<(diff: TickDiff) => void>();
  private resourceStore = new ResourceStore();
  private rng: DeterministicRandom;
  private destroyCallbacks: Array<
    (id: EntityId, world: World<TEventMap, TCommandMap>) => void
  > = [];

  constructor(config: WorldConfig) {
    validateWorldConfig(config);
    this.entityManager = new EntityManager();
    this.spatialGrid = new SpatialGrid(config.gridWidth, config.gridHeight);
    this.grid = this.spatialGrid;
    this.positionKey = config.positionKey ?? 'position';
    this.seed = config.seed;
    this.rng = new DeterministicRandom(config.seed);
    this.gameLoop = new GameLoop({
      tps: config.tps,
      onTick: () => this.executeTick(),
      maxTicksPerFrame: config.maxTicksPerFrame,
    });
  }

  createEntity(): EntityId {
    const id = this.entityManager.create();
    this.entitySignatures[id] = 0n;
    return id;
  }

  destroyEntity(id: EntityId): void {
    if (!this.entityManager.isAlive(id)) return;

    for (const callback of this.destroyCallbacks) {
      callback(id, this);
    }

    const prev = this.previousPositions.get(id);
    if (prev) {
      this.spatialGrid.remove(id, prev.x, prev.y);
      this.previousPositions.delete(id);
    }
    this.setEntitySignature(id, 0n);
    for (const store of this.componentStores.values()) {
      store.remove(id);
    }
    this.resourceStore.removeEntity(id);
    this.entityManager.destroy(id);
  }

  isAlive(id: EntityId): boolean {
    return this.entityManager.isAlive(id);
  }

  getEntityRef(id: EntityId): EntityRef | null {
    if (!this.entityManager.isAlive(id)) return null;
    return { id, generation: this.entityManager.getGeneration(id) };
  }

  isCurrent(ref: EntityRef): boolean {
    return (
      this.entityManager.isAlive(ref.id) &&
      this.entityManager.getGeneration(ref.id) === ref.generation
    );
  }

  onDestroy(
    callback: (id: EntityId, world: World<TEventMap, TCommandMap>) => void,
  ): void {
    this.destroyCallbacks.push(callback);
  }

  offDestroy(
    callback: (id: EntityId, world: World<TEventMap, TCommandMap>) => void,
  ): void {
    const index = this.destroyCallbacks.indexOf(callback);
    if (index !== -1) {
      this.destroyCallbacks.splice(index, 1);
    }
  }

  registerComponent<T>(key: string): void {
    if (this.componentStores.has(key)) {
      throw new Error(`Component '${key}' is already registered`);
    }
    this.componentStores.set(key, new ComponentStore<T>());
    this.registerComponentBit(key);
  }

  addComponent<T>(entity: EntityId, key: string, data: T): void {
    this.setComponent(entity, key, data);
  }

  setComponent<T>(entity: EntityId, key: string, data: T): void {
    this.assertAlive(entity);
    const position = key === this.positionKey ? asPosition(data) : null;
    if (position) {
      this.assertPositionInBounds(position);
    }
    const store = this.getStore<T>(key);
    const hadComponent = store.has(entity);
    store.set(entity, data);
    if (!hadComponent) {
      this.setEntityComponentSignature(entity, key, true);
    }
    if (position) {
      this.syncSpatialEntity(entity, position);
    }
  }

  getComponent<T>(entity: EntityId, key: string): T | undefined {
    const store = this.componentStores.get(key) as
      | ComponentStore<T>
      | undefined;
    return store?.get(entity);
  }

  getComponents<T extends unknown[]>(
    entity: EntityId,
    keys: string[],
  ): ComponentTuple<T> {
    return keys.map((key) => {
      const store = this.componentStores.get(key);
      return store?.get(entity);
    }) as ComponentTuple<T>;
  }

  removeComponent(entity: EntityId, key: string): void {
    this.assertAlive(entity);
    const store = this.componentStores.get(key);
    const hadComponent = store?.has(entity) ?? false;
    store?.remove(entity);
    if (hadComponent) {
      this.setEntityComponentSignature(entity, key, false);
    }
    if (key === this.positionKey) {
      this.removeFromSpatialIndex(entity);
    }
  }

  patchComponent<T>(
    entity: EntityId,
    key: string,
    patch: (data: T) => T | void,
  ): T {
    this.assertAlive(entity);
    const current = this.getComponent<T>(entity, key);
    if (current === undefined) {
      throw new Error(`Entity ${entity} does not have component '${key}'`);
    }
    const next = patch(current) ?? current;
    this.setComponent(entity, key, next);
    return next;
  }

  setPosition(
    entity: EntityId,
    position: Position,
    key = this.positionKey,
  ): void {
    this.setComponent(entity, key, { x: position.x, y: position.y });
  }

  *query(...keys: string[]): IterableIterator<EntityId> {
    const queryKeys = this.normalizeQueryKeys(keys);
    if (!queryKeys) return;
    const cache = this.getQueryCache(queryKeys);
    for (const id of cache.entities) {
      yield id;
    }
  }

  registerSystem(system: System<TEventMap, TCommandMap>): void {
    this.systems.push(system);
  }

  step(): void {
    this.gameLoop.step();
  }

  start(): void {
    this.gameLoop.start();
  }

  stop(): void {
    this.gameLoop.stop();
  }

  setSpeed(multiplier: number): void {
    this.gameLoop.setSpeed(multiplier);
  }

  getSpeed(): number {
    return this.gameLoop.getSpeed();
  }

  pause(): void {
    this.gameLoop.pause();
  }

  resume(): void {
    this.gameLoop.resume();
  }

  get isPaused(): boolean {
    return this.gameLoop.isPaused;
  }

  emit<K extends keyof TEventMap>(type: K, data: TEventMap[K]): void {
    this.eventBus.emit(type, data);
  }

  on<K extends keyof TEventMap>(
    type: K,
    listener: (event: TEventMap[K]) => void,
  ): void {
    this.eventBus.on(type, listener);
  }

  off<K extends keyof TEventMap>(
    type: K,
    listener: (event: TEventMap[K]) => void,
  ): void {
    this.eventBus.off(type, listener);
  }

  submit<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): boolean {
    const fns = this.validators.get(type);
    if (fns) {
      for (const fn of fns) {
        if (
          !(fn as (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => boolean)(
            data,
            this,
          )
        ) {
          return false;
        }
      }
    }
    this.commandQueue.push(type, data);
    return true;
  }

  registerValidator<K extends keyof TCommandMap>(
    type: K,
    fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => boolean,
  ): void {
    let fns = this.validators.get(type);
    if (!fns) {
      fns = [];
      this.validators.set(type, fns);
    }
    fns.push(fn as (data: never, world: World<TEventMap, TCommandMap>) => boolean);
  }

  registerHandler<K extends keyof TCommandMap>(
    type: K,
    fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap>) => void,
  ): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler already registered for command '${String(type)}'`);
    }
    this.handlers.set(
      type,
      fn as (data: never, world: World<TEventMap, TCommandMap>) => void,
    );
  }

  hasCommandHandler(type: keyof TCommandMap): boolean {
    return this.handlers.has(type);
  }

  getEvents(): ReadonlyArray<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }> {
    return this.eventBus.getEvents();
  }

  random(): number {
    return this.rng.random();
  }

  serialize(): WorldSnapshot {
    const components: Record<string, Array<[EntityId, unknown]>> = {};
    for (const [key, store] of this.componentStores) {
      const entries = [...store.entries()];
      for (const [entity, data] of entries) {
        assertJsonCompatible(data, `component '${key}' on entity ${entity}`);
      }
      components[key] = entries;
    }
    const config: WorldConfig = {
      gridWidth: this.spatialGrid.width,
      gridHeight: this.spatialGrid.height,
      tps: this.gameLoop.tps,
      positionKey: this.positionKey,
    };
    if (this.seed !== undefined) {
      config.seed = this.seed;
    }

    return {
      version: 3,
      config,
      tick: this.gameLoop.tick,
      entities: this.entityManager.getState(),
      components,
      resources: this.resourceStore.getState(),
      rng: this.rng.getState(),
    };
  }

  static deserialize<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  >(
    snapshot: WorldSnapshot,
    systems?: System<TEventMap, TCommandMap>[],
  ): World<TEventMap, TCommandMap> {
    const version = (snapshot as { version: number }).version;
    if (version !== 1 && version !== 2 && version !== 3) {
      throw new Error(`Unsupported snapshot version: ${version}`);
    }
    if (
      snapshot.entities.generations.length !== snapshot.entities.alive.length
    ) {
      throw new Error('Invalid entity state: array length mismatch');
    }

    const world = new World<TEventMap, TCommandMap>(snapshot.config);
    world.entityManager = EntityManager.fromState(snapshot.entities);

    world.componentStores.clear();
    for (const [key, entries] of Object.entries(snapshot.components)) {
      world.componentStores.set(
        key,
        ComponentStore.fromEntries(entries as Array<[number, unknown]>),
      );
    }
    world.rebuildComponentSignatures();
    if ('resources' in snapshot) {
      world.resourceStore = ResourceStore.fromState(snapshot.resources);
    }
    if ('rng' in snapshot) {
      world.rng = DeterministicRandom.fromState(snapshot.rng);
    }
    world.syncSpatialIndex();

    world.gameLoop.setTick(snapshot.tick);

    if (systems) {
      for (const system of systems) {
        world.systems.push(system);
      }
    }

    return world;
  }

  get tick(): number {
    return this.gameLoop.tick;
  }

  getDiff(): TickDiff | null {
    return this.currentDiff;
  }

  onDiff(fn: (diff: TickDiff) => void): void {
    this.diffListeners.add(fn);
  }

  offDiff(fn: (diff: TickDiff) => void): void {
    this.diffListeners.delete(fn);
  }

  registerResource(key: string, options?: { defaultMax?: ResourceMax }): void {
    this.resourceStore.register(key, options);
  }

  addResource(entity: EntityId, key: string, amount: number): number {
    this.assertAlive(entity);
    return this.resourceStore.addResource(entity, key, amount);
  }

  removeResource(entity: EntityId, key: string, amount: number): number {
    this.assertAlive(entity);
    return this.resourceStore.removeResource(entity, key, amount);
  }

  getResource(
    entity: EntityId,
    key: string,
  ): ResourcePool | undefined {
    return this.resourceStore.getResource(entity, key);
  }

  setResourceMax(entity: EntityId, key: string, max: ResourceMax): void {
    this.assertAlive(entity);
    this.resourceStore.setResourceMax(entity, key, max);
  }

  *getResourceEntities(key: string): IterableIterator<EntityId> {
    yield* this.resourceStore.getResourceEntities(key);
  }

  setProduction(entity: EntityId, key: string, rate: number): void {
    this.assertAlive(entity);
    this.resourceStore.setProduction(entity, key, rate);
  }

  setConsumption(entity: EntityId, key: string, rate: number): void {
    this.assertAlive(entity);
    this.resourceStore.setConsumption(entity, key, rate);
  }

  getProduction(entity: EntityId, key: string): number {
    return this.resourceStore.getProduction(entity, key);
  }

  getConsumption(entity: EntityId, key: string): number {
    return this.resourceStore.getConsumption(entity, key);
  }

  addTransfer(
    from: EntityId,
    to: EntityId,
    resource: string,
    rate: number,
  ): number {
    this.assertAlive(from);
    this.assertAlive(to);
    return this.resourceStore.addTransfer(from, to, resource, rate);
  }

  removeTransfer(id: number): void {
    this.resourceStore.removeTransfer(id);
  }

  getTransfers(
    entity: EntityId,
  ): Array<{
    id: number;
    from: EntityId;
    to: EntityId;
    resource: string;
    rate: number;
  }> {
    return this.resourceStore.getTransfers(entity);
  }

  private processCommands(): void {
    const commands = this.commandQueue.drain();
    for (const command of commands) {
      const handler = this.handlers.get(command.type);
      if (!handler) {
        throw new Error(
          `No handler registered for command '${String(command.type)}'`,
        );
      }
      handler(command.data as never, this);
    }
  }

  private clearComponentDirty(): void {
    for (const store of this.componentStores.values()) {
      store.clearDirty();
    }
  }

  private buildDiff(): void {
    const entities = this.entityManager.getDirty();
    const components: Record<
      string,
      { set: Array<[EntityId, unknown]>; removed: EntityId[] }
    > = {};
    for (const [key, store] of this.componentStores) {
      const dirty = store.getDirty();
      if (dirty.set.length > 0 || dirty.removed.length > 0) {
        components[key] = dirty;
      }
    }
    this.currentDiff = {
      tick: this.gameLoop.tick + 1,
      entities,
      components,
      resources: this.resourceStore.getDirty(),
    };
  }

  private executeTick(): void {
    this.eventBus.clear();
    this.entityManager.clearDirty();
    this.clearComponentDirty();
    this.resourceStore.clearDirty();
    this.processCommands();
    this.syncSpatialIndex();
    for (const system of this.systems) {
      system(this);
    }
    this.resourceStore.processTick((id) => this.entityManager.isAlive(id));
    this.buildDiff();
    for (const listener of this.diffListeners) {
      listener(this.currentDiff!);
    }
  }

  private syncSpatialIndex(): void {
    const posStore = this.componentStores.get(this.positionKey) as
      | ComponentStore<Position>
      | undefined;
    if (!posStore) return;

    const seen = new Set<EntityId>();

    for (const id of posStore.entities()) {
      seen.add(id);
      const pos = posStore.get(id)!;
      const prev = this.previousPositions.get(id);

      if (!prev) {
        this.spatialGrid.insert(id, pos.x, pos.y);
        this.previousPositions.set(id, { x: pos.x, y: pos.y });
      } else if (prev.x !== pos.x || prev.y !== pos.y) {
        this.spatialGrid.move(id, prev.x, prev.y, pos.x, pos.y);
        prev.x = pos.x;
        prev.y = pos.y;
      }
    }

    for (const [id, pos] of this.previousPositions) {
      if (!seen.has(id)) {
        this.spatialGrid.remove(id, pos.x, pos.y);
        this.previousPositions.delete(id);
      }
    }
  }

  private syncSpatialEntity(entity: EntityId, pos: Position): void {
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

  private removeFromSpatialIndex(entity: EntityId): void {
    const prev = this.previousPositions.get(entity);
    if (!prev) return;
    this.spatialGrid.remove(entity, prev.x, prev.y);
    this.previousPositions.delete(entity);
  }

  private getStore<T>(key: string): ComponentStore<T> {
    const store = this.componentStores.get(key);
    if (!store) throw new Error(`Component '${key}' is not registered`);
    return store as ComponentStore<T>;
  }

  private assertAlive(entity: EntityId): void {
    if (!this.entityManager.isAlive(entity)) {
      throw new Error(`Entity ${entity} is not alive`);
    }
  }

  private assertPositionInBounds(position: Position): void {
    this.spatialGrid.getAt(position.x, position.y);
  }

  private registerComponentBit(key: string): bigint {
    const existing = this.componentBits.get(key);
    if (existing !== undefined) return existing;
    const bit = 1n << BigInt(this.nextComponentBit);
    this.nextComponentBit++;
    this.componentBits.set(key, bit);
    return bit;
  }

  private setEntityComponentSignature(
    entity: EntityId,
    key: string,
    hasComponent: boolean,
  ): void {
    const bit = this.registerComponentBit(key);
    const current = this.entitySignatures[entity] ?? 0n;
    const next = hasComponent ? current | bit : current & ~bit;
    this.setEntitySignature(entity, next);
  }

  private setEntitySignature(entity: EntityId, next: bigint): void {
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
    if (cached) return cached;

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

  private queryMask(keys: string[]): bigint {
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

  private rebuildComponentSignatures(): void {
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

function insertSorted(values: EntityId[], value: EntityId): void {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid] < value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  if (values[low] !== value) {
    values.splice(low, 0, value);
  }
}

function validateWorldConfig(config: WorldConfig): void {
  if (!Number.isInteger(config.gridWidth) || config.gridWidth <= 0) {
    throw new RangeError('gridWidth must be a positive integer');
  }
  if (!Number.isInteger(config.gridHeight) || config.gridHeight <= 0) {
    throw new RangeError('gridHeight must be a positive integer');
  }
  if (!Number.isFinite(config.tps) || config.tps <= 0) {
    throw new RangeError('tps must be a finite positive number');
  }
  if (
    config.maxTicksPerFrame !== undefined &&
    (!Number.isInteger(config.maxTicksPerFrame) || config.maxTicksPerFrame <= 0)
  ) {
    throw new RangeError('maxTicksPerFrame must be a positive integer');
  }
  if (config.positionKey !== undefined && config.positionKey.length === 0) {
    throw new Error('positionKey must not be empty');
  }
}

function asPosition(value: unknown): Position {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('x' in value) ||
    !('y' in value)
  ) {
    throw new Error('Position component must be an object with x and y');
  }
  const position = value as { x: unknown; y: unknown };
  if (
    typeof position.x !== 'number' ||
    typeof position.y !== 'number' ||
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y)
  ) {
    throw new RangeError('Position coordinates must be integers');
  }
  return { x: position.x, y: position.y };
}
