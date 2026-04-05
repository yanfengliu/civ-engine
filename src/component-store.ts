import type { EntityId } from './types.js';

export class ComponentStore<T> {
  private data: (T | undefined)[] = [];
  private _generation = 0;
  private _size = 0;

  set(entityId: EntityId, component: T): void {
    if (this.data[entityId] === undefined) {
      this._size++;
    }
    this.data[entityId] = component;
    this._generation++;
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
}
