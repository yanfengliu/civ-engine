// Entity & component CRUD layer of the `World` class chain: entity lifecycle
// (create/destroy/refs/generations/destroy callbacks) and the component
// surface (register/set/get/patch/remove/setPosition) that keeps signatures
// and the spatial index in sync via the layers below.

import type { EntityId, EntityRef, Position } from './types.js';
import { asPosition } from './world-internal.js';
import { assertWritable } from './world-strict-mode.js';
import type { ComponentOptions, ComponentRegistry, ComponentTuple } from './world-types.js';
import { ComponentStore } from './component-store.js';
import { WorldTagsMeta } from './world-tags-meta.js';
import type { World } from './world.js';

export abstract class WorldEntities<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends WorldTagsMeta<TEventMap, TCommandMap, TComponents, TState> {
  createEntity(): EntityId {
    assertWritable(this, 'createEntity');
    const id = this.entityManager.create();
    this.entitySignatures[id] = 0n;
    return id;
  }

  destroyEntity(id: EntityId): void {
    assertWritable(this, 'destroyEntity');
    if (!this.entityManager.isAlive(id)) return;

    // Mark dying (alive=false, generation bumped) so re-entrant
    // destroyEntity(id) calls hit the alive guard. Hold the id off the free
    // list until cleanup finishes so a callback that creates a new entity
    // cannot recycle this id mid-cleanup.
    this.entityManager.markDying(id);

    try {
      for (const callback of this.destroyCallbacks) {
        callback(id, this.asWorld());
      }
    } finally {
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
      this.removeEntityTags(id);
      this.removeEntityMeta(id);

      this.entityManager.releaseId(id);
    }
  }

  isAlive(id: EntityId): boolean {
    return this.entityManager.isAlive(id);
  }

  *getAliveEntities(): IterableIterator<EntityId> {
    yield* this.entityManager.aliveEntities();
  }

  getEntityGeneration(id: EntityId): number {
    return this.entityManager.getGeneration(id);
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
    callback: (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
  ): void {
    this.destroyCallbacks.push(callback);
  }

  offDestroy(
    callback: (id: EntityId, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
  ): void {
    const index = this.destroyCallbacks.indexOf(callback);
    if (index !== -1) {
      this.destroyCallbacks.splice(index, 1);
    }
  }

  registerComponent<K extends keyof TComponents & string>(
    key: K,
    options?: ComponentOptions,
  ): void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registerComponent<T>(key: string, options?: ComponentOptions): void;
  registerComponent(key: string, options?: ComponentOptions): void {
    if (this.componentStores.has(key)) {
      throw new Error(`Component '${key}' is already registered`);
    }
    this.componentStores.set(key, new ComponentStore<unknown>(options));
    if (options) {
      this.componentOptions.set(key, { ...options });
    }
    this.registerComponentBit(key);
  }

  addComponent<K extends keyof TComponents & string>(entity: EntityId, key: K, data: TComponents[K]): void;
  addComponent<T>(entity: EntityId, key: string, data: T): void;
  addComponent(entity: EntityId, key: string, data: unknown): void {
    assertWritable(this, 'addComponent');
    this.setComponent(entity, key, data);
  }

  setComponent<K extends keyof TComponents & string>(entity: EntityId, key: K, data: TComponents[K]): void;
  setComponent<T>(entity: EntityId, key: string, data: T): void;
  setComponent(entity: EntityId, key: string, data: unknown): void {
    assertWritable(this, 'setComponent');
    this.assertAlive(entity);
    const position = key === this.positionKey ? asPosition(data) : null;
    if (position) {
      this.assertPositionInBounds(position);
    }
    const store = this.getStore<unknown>(key);
    const hadComponent = store.has(entity);
    store.set(entity, data);
    if (!hadComponent) {
      this.setEntityComponentSignature(entity, key, true);
    }
    if (position) {
      this.syncSpatialEntity(entity, position);
    }
  }

  getComponent<K extends keyof TComponents & string>(entity: EntityId, key: K): TComponents[K] | undefined;
  getComponent<T>(entity: EntityId, key: string): T | undefined;
  getComponent(entity: EntityId, key: string): unknown {
    const store = this.componentStores.get(key);
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

  removeComponent<K extends keyof TComponents & string>(entity: EntityId, key: K): void;
  removeComponent(entity: EntityId, key: string): void;
  removeComponent(entity: EntityId, key: string): void {
    assertWritable(this, 'removeComponent');
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

  patchComponent<K extends keyof TComponents & string>(
    entity: EntityId, key: K, patch: (data: TComponents[K]) => TComponents[K] | void,
  ): TComponents[K];
  patchComponent<T>(entity: EntityId, key: string, patch: (data: T) => T | void): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patchComponent(entity: EntityId, key: string, patch: (data: any) => any): any {
    assertWritable(this, 'patchComponent');
    this.assertAlive(entity);
    const current = this.getComponent(entity, key);
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
    assertWritable(this, 'setPosition');
    this.setComponent(entity, key, { x: position.x, y: position.y });
  }
}
