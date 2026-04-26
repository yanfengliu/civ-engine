import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('setMeta validation', () => {
  it('rejects NaN values', () => {
    const world = new World({ gridWidth: 5, gridHeight: 5, tps: 60 });
    const id = world.createEntity();
    expect(() => world.setMeta(id, 'level', Number.NaN)).toThrow(/finite/);
  });

  it('rejects Infinity values', () => {
    const world = new World({ gridWidth: 5, gridHeight: 5, tps: 60 });
    const id = world.createEntity();
    expect(() => world.setMeta(id, 'level', Infinity)).toThrow(/finite/);
    expect(() => world.setMeta(id, 'level', -Infinity)).toThrow(/finite/);
  });

  it('accepts finite numbers and strings', () => {
    const world = new World({ gridWidth: 5, gridHeight: 5, tps: 60 });
    const id = world.createEntity();
    world.setMeta(id, 'level', 42);
    world.setMeta(id, 'tier', 'gold');
    expect(world.getMeta(id, 'level')).toBe(42);
    expect(world.getMeta(id, 'tier')).toBe('gold');
  });
});

describe('Entity tags', () => {
  it('addTag/hasTag/getByTag round-trip', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.addTag(id, 'player');
    expect(world.hasTag(id, 'player')).toBe(true);
    expect([...world.getByTag('player')]).toEqual([id]);
  });

  it('removeTag removes from entity and reverse index', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.addTag(id, 'player');
    world.removeTag(id, 'player');
    expect(world.hasTag(id, 'player')).toBe(false);
    expect(world.getByTag('player').size).toBe(0);
  });

  it('getByTag returns empty set for unknown tag', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.getByTag('nonexistent').size).toBe(0);
  });

  it('getTags returns all tags for entity', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.addTag(id, 'player');
    world.addTag(id, 'friendly');
    const tags = world.getTags(id);
    expect(tags.has('player')).toBe(true);
    expect(tags.has('friendly')).toBe(true);
    expect(tags.size).toBe(2);
  });

  it('multiple entities with same tag all appear in getByTag', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const a = world.createEntity();
    const b = world.createEntity();
    world.addTag(a, 'unit');
    world.addTag(b, 'unit');
    const units = world.getByTag('unit');
    expect(units.has(a)).toBe(true);
    expect(units.has(b)).toBe(true);
    expect(units.size).toBe(2);
  });

  it('destroyEntity cleans up tags', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.addTag(id, 'player');
    world.destroyEntity(id);
    expect(world.getByTag('player').size).toBe(0);
  });

  it('tag changes appear in diffs', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.registerSystem((w) => {
      w.addTag(id, 'marked');
    });
    world.step();
    const diff = world.getDiff()!;
    expect(diff.tags).toHaveLength(1);
    expect(diff.tags[0].entity).toBe(id);
    expect(diff.tags[0].tags).toContain('marked');
  });

  it('destroyEntity surfaces tag cleanup in TickDiff (M8)', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.addTag(id, 'player');
    world.step(); // diff with addTag

    world.registerSystem((w) => {
      if (w.tick === 1) w.destroyEntity(id);
    });
    world.step();
    const diff = world.getDiff()!;
    expect(diff.entities.destroyed).toContain(id);
    const tagEntry = diff.tags.find((t) => t.entity === id);
    expect(tagEntry).toEqual({ entity: id, tags: [] });
  });

  it('tags survive serialize/deserialize', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.addTag(id, 'hero');
    world.step();

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);
    expect(restored.hasTag(id, 'hero')).toBe(true);
    expect([...restored.getByTag('hero')]).toEqual([id]);
  });
});

describe('Entity metadata', () => {
  it('setMeta/getMeta/getByMeta round-trip', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.setMeta(id, 'externalId', 'abc-123');
    expect(world.getMeta(id, 'externalId')).toBe('abc-123');
    expect(world.getByMeta('externalId', 'abc-123')).toBe(id);
  });

  it('getByMeta reverse index returns correct entity', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const a = world.createEntity();
    const b = world.createEntity();
    world.setMeta(a, 'slot', 1);
    world.setMeta(b, 'slot', 2);
    expect(world.getByMeta('slot', 1)).toBe(a);
    expect(world.getByMeta('slot', 2)).toBe(b);
  });

  it('deleteMeta removes from entity and reverse index', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.setMeta(id, 'externalId', 'abc');
    world.deleteMeta(id, 'externalId');
    expect(world.getMeta(id, 'externalId')).toBeUndefined();
    expect(world.getByMeta('externalId', 'abc')).toBeUndefined();
  });

  it('destroyEntity cleans up metadata', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.setMeta(id, 'externalId', 'x');
    world.destroyEntity(id);
    expect(world.getByMeta('externalId', 'x')).toBeUndefined();
  });

  it('destroyEntity surfaces metadata cleanup in TickDiff (M8)', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.setMeta(id, 'externalId', 'x');
    world.step();

    world.registerSystem((w) => {
      if (w.tick === 1) w.destroyEntity(id);
    });
    world.step();
    const diff = world.getDiff()!;
    expect(diff.entities.destroyed).toContain(id);
    const metaEntry = diff.metadata.find((m) => m.entity === id);
    expect(metaEntry).toEqual({ entity: id, meta: {} });
  });

  it('metadata changes appear in diffs', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.registerSystem((w) => {
      w.setMeta(id, 'slot', 5);
    });
    world.step();
    const diff = world.getDiff()!;
    expect(diff.metadata).toHaveLength(1);
    expect(diff.metadata[0].entity).toBe(id);
    expect(diff.metadata[0].meta).toEqual({ slot: 5 });
  });

  it('metadata survives serialize/deserialize', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.setMeta(id, 'uid', 'u-42');
    world.step();

    const snapshot = world.serialize();
    const restored = World.deserialize(snapshot);
    expect(restored.getMeta(id, 'uid')).toBe('u-42');
    expect(restored.getByMeta('uid', 'u-42')).toBe(id);
  });

  it('overwriting meta value updates reverse index', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const id = world.createEntity();
    world.setMeta(id, 'slot', 1);
    world.setMeta(id, 'slot', 2);
    expect(world.getByMeta('slot', 1)).toBeUndefined();
    expect(world.getByMeta('slot', 2)).toBe(id);
  });
});
