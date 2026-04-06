import type { EntityId, Position, WorldConfig } from './types.js';
import { EntityManager } from './entity-manager.js';
import { ComponentStore } from './component-store.js';
import { SpatialGrid } from './spatial-grid.js';
import { GameLoop } from './game-loop.js';
import { EventBus } from './event-bus.js';
import { CommandQueue } from './command-queue.js';

export type System<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> = (world: World<TEventMap, TCommandMap>) => void;

export class World<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  private entityManager: EntityManager;
  private componentStores = new Map<string, ComponentStore<unknown>>();
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
  readonly grid: SpatialGrid;

  constructor(config: WorldConfig) {
    this.entityManager = new EntityManager();
    this.grid = new SpatialGrid(config.gridWidth, config.gridHeight);
    this.gameLoop = new GameLoop({
      tps: config.tps,
      onTick: () => this.executeTick(),
    });
  }

  createEntity(): EntityId {
    return this.entityManager.create();
  }

  destroyEntity(id: EntityId): void {
    // Use previousPositions for grid cleanup (reflects actual grid state)
    const prev = this.previousPositions.get(id);
    if (prev) {
      this.grid.remove(id, prev.x, prev.y);
      this.previousPositions.delete(id);
    }
    for (const store of this.componentStores.values()) {
      store.remove(id);
    }
    this.entityManager.destroy(id);
  }

  isAlive(id: EntityId): boolean {
    return this.entityManager.isAlive(id);
  }

  registerComponent<T>(key: string): void {
    if (this.componentStores.has(key)) {
      throw new Error(`Component '${key}' is already registered`);
    }
    this.componentStores.set(key, new ComponentStore<T>());
  }

  addComponent<T>(entity: EntityId, key: string, data: T): void {
    const store = this.getStore<T>(key);
    store.set(entity, data);
  }

  getComponent<T>(entity: EntityId, key: string): T | undefined {
    const store = this.componentStores.get(key) as
      | ComponentStore<T>
      | undefined;
    return store?.get(entity);
  }

  removeComponent(entity: EntityId, key: string): void {
    const store = this.componentStores.get(key);
    store?.remove(entity);
  }

  *query(...keys: string[]): IterableIterator<EntityId> {
    if (keys.length === 0) return;

    const stores = keys.map((k) => {
      const store = this.componentStores.get(k);
      if (!store) throw new Error(`Component '${k}' is not registered`);
      return store;
    });

    let smallest = stores[0];
    for (let i = 1; i < stores.length; i++) {
      if (stores[i].size < smallest.size) {
        smallest = stores[i];
      }
    }

    for (const id of smallest.entities()) {
      if (stores.every((s) => s.has(id))) {
        yield id;
      }
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

  getEvents(): ReadonlyArray<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }> {
    return this.eventBus.getEvents();
  }

  get tick(): number {
    return this.gameLoop.tick;
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

  private executeTick(): void {
    this.eventBus.clear();
    this.processCommands();
    this.syncSpatialIndex();
    for (const system of this.systems) {
      system(this);
    }
  }

  private syncSpatialIndex(): void {
    const posStore = this.componentStores.get('position') as
      | ComponentStore<Position>
      | undefined;
    if (!posStore) return;

    const seen = new Set<EntityId>();

    for (const id of posStore.entities()) {
      seen.add(id);
      const pos = posStore.get(id)!;
      const prev = this.previousPositions.get(id);

      if (!prev) {
        this.grid.insert(id, pos.x, pos.y);
        this.previousPositions.set(id, { x: pos.x, y: pos.y });
      } else if (prev.x !== pos.x || prev.y !== pos.y) {
        this.grid.move(id, prev.x, prev.y, pos.x, pos.y);
        prev.x = pos.x;
        prev.y = pos.y;
      }
    }

    for (const [id, pos] of this.previousPositions) {
      if (!seen.has(id)) {
        this.grid.remove(id, pos.x, pos.y);
        this.previousPositions.delete(id);
      }
    }
  }

  private getStore<T>(key: string): ComponentStore<T> {
    const store = this.componentStores.get(key);
    if (!store) throw new Error(`Component '${key}' is not registered`);
    return store as ComponentStore<T>;
  }
}
