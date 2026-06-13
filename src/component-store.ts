import { EngineError } from './engine-error.js';
import type { EntityId } from './types.js';
import { assertJsonCompatible, jsonFingerprint } from './json.js';

export interface ComponentStoreOptions {
  diffMode?: 'strict' | 'semantic';
}

export class ComponentStore<T> {
  private data: (T | undefined)[] = [];
  private _generation = 0;
  private _size = 0;
  private dirtySet = new Set<EntityId>();
  private removedSet = new Set<EntityId>();
  private baseline = new Map<EntityId, string>();
  private diffMode: 'strict' | 'semantic';

  constructor(options: ComponentStoreOptions = {}) {
    this.diffMode = options.diffMode ?? 'strict';
  }

  set(entityId: EntityId, component: T): void {
    if (component === undefined) {
      throw new EngineError('component_data_undefined', 'Component data must not be undefined');
    }
    const wasPresent = this.data[entityId] !== undefined;

    if (this.diffMode === 'semantic' && wasPresent) {
      const fingerprint = jsonFingerprint(component, `component ${entityId}`);
      const baseline = this.baseline.get(entityId);
      this.data[entityId] = component;
      this._generation++;
      if (baseline === fingerprint) {
        // Revert-to-baseline within a tick: clear any earlier dirty/removed
        // marks so the diff doesn't carry a no-op write (L2 iter-7).
        this.dirtySet.delete(entityId);
        this.removedSet.delete(entityId);
        return;
      }
      this.dirtySet.add(entityId);
      this.removedSet.delete(entityId);
      return;
    }

    assertJsonCompatible(component, `component ${entityId}`);
    if (!wasPresent) {
      this._size++;
    }
    this.data[entityId] = component;
    this._generation++;
    if (this.diffMode === 'semantic') {
      // Re-insert after remove (or any path where wasPresent was false): if
      // the new value matches the cached baseline, this is a no-op revert
      // from the consumer's perspective. Mirror the wasPresent branch so the
      // diff doesn't carry a redundant set+remove pair (N3 iter-8, parallel
      // class to L2 iter-7).
      const fingerprint = jsonFingerprint(component, `component ${entityId}`);
      const baseline = this.baseline.get(entityId);
      if (baseline === fingerprint) {
        this.dirtySet.delete(entityId);
        this.removedSet.delete(entityId);
        return;
      }
    }
    this.dirtySet.add(entityId);
    this.removedSet.delete(entityId);
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
      if (this.data[id] !== undefined) {
        set.push([id, this.data[id] as T]);
      }
    }
    return { set, removed: [...this.removedSet] };
  }

  clearDirty(): void {
    if (this.diffMode === 'semantic') {
      // Incremental baseline maintenance: only entities touched this tick (dirty
      // or removed) can change their fingerprint, so re-fingerprinting EVERY
      // live component each tick was wasted O(N) JSON.stringify regardless of
      // churn (full-review 2026-06-13 M6). Non-dirty entries keep their
      // still-valid baseline. Correct because all population goes through set()
      // (which marks dirty), including fromEntries → clearDirty.
      for (const id of this.dirtySet) {
        const data = this.data[id];
        if (data !== undefined) {
          this.baseline.set(id, jsonFingerprint(data, `component ${id}`));
        } else {
          this.baseline.delete(id);
        }
      }
      for (const id of this.removedSet) {
        this.baseline.delete(id);
      }
    }
    this.dirtySet.clear();
    this.removedSet.clear();
  }

  static fromEntries<T>(
    entries: Array<[EntityId, T]>,
    options?: ComponentStoreOptions,
  ): ComponentStore<T> {
    const store = new ComponentStore<T>(options);
    for (const [id, data] of entries) {
      store.set(id, data);
    }
    store.clearDirty();
    return store;
  }
}
