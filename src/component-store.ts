import type { EntityId } from './types.js';
import { jsonFingerprint } from './json.js';

export class ComponentStore<T> {
  private data: (T | undefined)[] = [];
  private _generation = 0;
  private _size = 0;
  private dirtySet = new Set<EntityId>();
  private removedSet = new Set<EntityId>();
  private baseline = new Map<EntityId, string>();

  set(entityId: EntityId, component: T): void {
    if (component === undefined) {
      throw new Error('Component data must not be undefined');
    }
    jsonFingerprint(component, `component ${entityId}`);
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
    const changed = new Set(this.dirtySet);
    for (const [id, data] of this.entries()) {
      if (changed.has(id)) continue;
      const previous = this.baseline.get(id);
      const current = jsonFingerprint(data, `component ${id}`);
      if (previous !== current) {
        changed.add(id);
      }
    }

    const set: Array<[EntityId, T]> = [];
    for (const id of changed) {
      if (this.data[id] !== undefined) {
        set.push([id, this.data[id] as T]);
      }
    }
    return { set, removed: [...this.removedSet] };
  }

  clearDirty(): void {
    this.dirtySet.clear();
    this.removedSet.clear();
    this.baseline.clear();
    for (const [id, data] of this.entries()) {
      this.baseline.set(id, jsonFingerprint(data, `component ${id}`));
    }
  }

  static fromEntries<T>(entries: Array<[EntityId, T]>): ComponentStore<T> {
    const store = new ComponentStore<T>();
    for (const [id, data] of entries) {
      store.set(id, data);
    }
    store.clearDirty();
    return store;
  }
}
