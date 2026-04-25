import type { EntityId } from './types.js';
import { assertJsonCompatible, jsonFingerprint } from './json.js';

export interface ComponentStoreOptions {
  diffMode?: 'strict' | 'semantic';
  /**
   * When true (default), `getDirty()` scans every entry and uses fingerprint
   * comparison to detect in-place object mutations made after the previous
   * `clearDirty()`. When false, only entries marked dirty via `set()`/`remove()`
   * are reported. Setting this to false avoids the per-entity JSON.stringify cost
   * on the diff path; callers must then write through `set()` for changes to be
   * visible. `'semantic'` `diffMode` continues to use the baseline fingerprint
   * to suppress identical rewrites regardless of this flag.
   */
  detectInPlaceMutations?: boolean;
}

export class ComponentStore<T> {
  private data: (T | undefined)[] = [];
  private _generation = 0;
  private _size = 0;
  private dirtySet = new Set<EntityId>();
  private removedSet = new Set<EntityId>();
  private baseline = new Map<EntityId, string>();
  private diffMode: 'strict' | 'semantic';
  private detectInPlaceMutations: boolean;

  constructor(options: ComponentStoreOptions = {}) {
    this.diffMode = options.diffMode ?? 'strict';
    this.detectInPlaceMutations = options.detectInPlaceMutations ?? true;
  }

  set(entityId: EntityId, component: T): void {
    if (component === undefined) {
      throw new Error('Component data must not be undefined');
    }
    const wasPresent = this.data[entityId] !== undefined;

    if (this.diffMode === 'semantic' && wasPresent) {
      const fingerprint = jsonFingerprint(component, `component ${entityId}`);
      const baseline = this.baseline.get(entityId);
      this.data[entityId] = component;
      this._generation++;
      if (baseline === fingerprint) {
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
    const changed = new Set(this.dirtySet);
    if (this.detectInPlaceMutations) {
      for (const [id, data] of this.entries()) {
        if (changed.has(id)) continue;
        const previous = this.baseline.get(id);
        const current = jsonFingerprint(data, `component ${id}`);
        if (previous !== current) {
          changed.add(id);
        }
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
    if (this.detectInPlaceMutations || this.diffMode === 'semantic') {
      this.baseline.clear();
      for (const [id, data] of this.entries()) {
        this.baseline.set(id, jsonFingerprint(data, `component ${id}`));
      }
    }
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
