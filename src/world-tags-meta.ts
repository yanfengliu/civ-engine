// Tags & metadata layer of the `World` class chain: string labels with a
// reverse index (`getByTag`) and unique key/value metadata (`getByMeta`),
// plus the destroy-time cleanup used by the entity layer above.

import type { EntityId } from './types.js';
import { assertWritable } from './world-strict-mode.js';
import type { ComponentRegistry } from './world-types.js';
import { WorldQueries } from './world-queries.js';

export abstract class WorldTagsMeta<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends WorldQueries<TEventMap, TCommandMap, TComponents, TState> {
  addTag(entity: EntityId, tag: string): void {
    assertWritable(this, 'addTag');
    this.assertAlive(entity);
    this.addTagInternal(entity, tag);
    this.tagsDirtyEntities.add(entity);
  }

  removeTag(entity: EntityId, tag: string): void {
    assertWritable(this, 'removeTag');
    this.assertAlive(entity);
    const tags = this.entityTags.get(entity);
    if (!tags || !tags.has(tag)) return;
    tags.delete(tag);
    if (tags.size === 0) this.entityTags.delete(entity);
    const indexed = this.tagIndex.get(tag);
    if (indexed) {
      indexed.delete(entity);
      if (indexed.size === 0) this.tagIndex.delete(tag);
    }
    this.tagsDirtyEntities.add(entity);
  }

  hasTag(entity: EntityId, tag: string): boolean {
    return this.entityTags.get(entity)?.has(tag) ?? false;
  }

  getByTag(tag: string): ReadonlySet<EntityId> {
    const set = this.tagIndex.get(tag);
    return set ? new Set(set) : new Set<EntityId>();
  }

  getTags(entity: EntityId): ReadonlySet<string> {
    const set = this.entityTags.get(entity);
    return set ? new Set(set) : new Set<string>();
  }

  setMeta(entity: EntityId, key: string, value: string | number): void {
    assertWritable(this, 'setMeta');
    this.assertAlive(entity);
    this.setMetaInternal(entity, key, value);
    this.metaDirtyEntities.add(entity);
  }

  getMeta(entity: EntityId, key: string): string | number | undefined {
    return this.entityMeta.get(entity)?.get(key);
  }

  deleteMeta(entity: EntityId, key: string): void {
    assertWritable(this, 'deleteMeta');
    this.assertAlive(entity);
    const meta = this.entityMeta.get(entity);
    if (!meta) return;
    const value = meta.get(key);
    if (value === undefined) return;
    meta.delete(key);
    if (meta.size === 0) this.entityMeta.delete(entity);
    const keyIndex = this.metaIndex.get(key);
    if (keyIndex) {
      if (keyIndex.get(value) === entity) {
        keyIndex.delete(value);
      }
      if (keyIndex.size === 0) this.metaIndex.delete(key);
    }
    this.metaDirtyEntities.add(entity);
  }

  getByMeta(key: string, value: string | number): EntityId | undefined {
    return this.metaIndex.get(key)?.get(value);
  }

  protected removeEntityTags(entity: EntityId): void {
    const tags = this.entityTags.get(entity);
    if (!tags) return;
    for (const tag of tags) {
      const indexed = this.tagIndex.get(tag);
      if (indexed) {
        indexed.delete(entity);
        if (indexed.size === 0) this.tagIndex.delete(tag);
      }
    }
    this.entityTags.delete(entity);
    this.tagsDirtyEntities.add(entity);
  }

  protected removeEntityMeta(entity: EntityId): void {
    const meta = this.entityMeta.get(entity);
    if (!meta) return;
    for (const [key, value] of meta) {
      const keyIndex = this.metaIndex.get(key);
      if (keyIndex) {
        if (keyIndex.get(value) === entity) {
          keyIndex.delete(value);
        }
        if (keyIndex.size === 0) this.metaIndex.delete(key);
      }
    }
    this.entityMeta.delete(entity);
    this.metaDirtyEntities.add(entity);
  }

  protected addTagInternal(entity: EntityId, tag: string): void {
    let tags = this.entityTags.get(entity);
    if (!tags) {
      tags = new Set();
      this.entityTags.set(entity, tags);
    }
    tags.add(tag);
    let indexed = this.tagIndex.get(tag);
    if (!indexed) {
      indexed = new Set();
      this.tagIndex.set(tag, indexed);
    }
    indexed.add(entity);
  }

  protected setMetaInternal(entity: EntityId, key: string, value: string | number): void {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(
        `Metadata ${JSON.stringify(key)} value must be a finite JSON number; got ${value}`,
      );
    }
    const existingMeta = this.entityMeta.get(entity);
    let keyIndex = this.metaIndex.get(key);
    if (keyIndex) {
      const owner = keyIndex.get(value);
      if (owner !== undefined && owner !== entity) {
        throw new Error(
          `Metadata ${JSON.stringify(key)}=${JSON.stringify(value)} is already owned by entity ${owner}; metadata reverse index is unique`,
        );
      }
    }
    // Uniqueness check passed — now mutate state.
    const meta = existingMeta ?? new Map();
    if (!existingMeta) {
      this.entityMeta.set(entity, meta);
    }
    const oldValue = meta.get(key);
    if (oldValue !== undefined && keyIndex) {
      keyIndex.delete(oldValue);
    }
    meta.set(key, value);
    if (!keyIndex) {
      keyIndex = new Map();
      this.metaIndex.set(key, keyIndex);
    }
    keyIndex.set(value, entity);
  }
}
