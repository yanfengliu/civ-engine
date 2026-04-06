import type { EntityId } from './types.js';

export class ComponentStore<T> {
  private data: (T | undefined)[] = [];
  private _generation = 0;
  private _size = 0;
  private dirtySet = new Set<EntityId>();
  private removedSet = new Set<EntityId>();

  set(entityId: EntityId, component: T): void {
    if (this.data[entityId] === undefined) {
      this._size++;
    }
    this.data[entityId] = component;
    this._generation++;
    this.dirtySet.add(entityId);
  }

  get(entityId: EntityId): T | undefined {
    return this.data[entityId];
  }

  has(entityId: EntityId): boolean {
    return this.data[entityId] !== undefined;
  }

  remove(entityId: EntityId): void {
    if (this.data[entityId] === undefined) return;
    this.data[entityId] = undefined;
    this._size--;
    this._generation++;
    this.dirtySet.delete(entityId);
    this.removedSet.add(entityId);
  }

  get generation(): number {
    return this._generation;
  }

  get size(): number {
    return this._size;
  }

  *entities(): IterableIterator<EntityId> {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== undefined) {
        yield i;
      }
    }
  }

  *entries(): IterableIterator<[EntityId, T]> {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== undefined) {
        yield [i, this.data[i] as T];
      }
    }
  }

  getDirty(): { set: Array<[EntityId, T]>; removed: EntityId[] } {
    const set: Array<[EntityId, T]> = [];
    for (const id of this.dirtySet) {
      set.push([id, this.data[id] as T]);
    }
    return { set, removed: [...this.removedSet] };
  }

  clearDirty(): void {
    this.dirtySet.clear();
    this.removedSet.clear();
  }

  static fromEntries<T>(entries: Array<[EntityId, T]>): ComponentStore<T> {
    const store = new ComponentStore<T>();
    for (const [id, data] of entries) {
      store.set(id, data);
    }
    return store;
  }
}
