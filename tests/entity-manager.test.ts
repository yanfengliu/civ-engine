import { describe, it, expect } from 'vitest';
import { EntityManager } from '../src/entity-manager.js';

describe('EntityManager', () => {
  it('creates entities with sequential IDs starting from 0', () => {
    const em = new EntityManager();
    expect(em.create()).toBe(0);
    expect(em.create()).toBe(1);
    expect(em.create()).toBe(2);
  });

  it('reports created entities as alive', () => {
    const em = new EntityManager();
    const id = em.create();
    expect(em.isAlive(id)).toBe(true);
  });

  it('reports destroyed entities as not alive', () => {
    const em = new EntityManager();
    const id = em.create();
    em.destroy(id);
    expect(em.isAlive(id)).toBe(false);
  });

  it('recycles destroyed entity IDs', () => {
    const em = new EntityManager();
    const id0 = em.create();
    em.create(); // id1
    em.destroy(id0);
    const id2 = em.create();
    expect(id2).toBe(id0);
  });

  it('increments generation on destroy', () => {
    const em = new EntityManager();
    const id = em.create();
    expect(em.getGeneration(id)).toBe(0);
    em.destroy(id);
    expect(em.getGeneration(id)).toBe(1);
  });

  it('returns false for never-created entity IDs', () => {
    const em = new EntityManager();
    expect(em.isAlive(99)).toBe(false);
  });

  it('does not double-destroy', () => {
    const em = new EntityManager();
    const id = em.create();
    em.destroy(id);
    em.destroy(id);
    expect(em.getGeneration(id)).toBe(1);
  });

  it('getState returns internal state as copies', () => {
    const em = new EntityManager();
    em.create(); // id 0
    em.create(); // id 1
    em.destroy(0);
    const state = em.getState();
    expect(state.generations).toEqual([1, 0]);
    expect(state.alive).toEqual([false, true]);
    expect(state.freeList).toEqual([0]);
    // Verify they are copies, not references
    state.alive[1] = false;
    expect(em.isAlive(1)).toBe(true);
  });

  it('fromState restores entity manager and resumes correctly', () => {
    const em = new EntityManager();
    em.create(); // id 0
    em.create(); // id 1
    em.destroy(0);
    const state = em.getState();

    const restored = EntityManager.fromState(state);
    expect(restored.isAlive(0)).toBe(false);
    expect(restored.isAlive(1)).toBe(true);
    expect(restored.getGeneration(0)).toBe(1);
    // Creating a new entity should reuse the free-listed id 0
    const recycled = restored.create();
    expect(recycled).toBe(0);
  });

  it('tracks alive count across create, destroy, and restore', () => {
    const em = new EntityManager();
    const a = em.create();
    em.create();
    expect(em.count).toBe(2);

    em.destroy(a);
    expect(em.count).toBe(1);
    em.destroy(a);
    expect(em.count).toBe(1);

    const restored = EntityManager.fromState(em.getState());
    expect(restored.count).toBe(1);
    restored.create();
    expect(restored.count).toBe(2);
  });

  it('create tracks created entities', () => {
    const em = new EntityManager();
    const id0 = em.create();
    const id1 = em.create();
    const dirty = em.getDirty();
    expect(dirty.created).toEqual([id0, id1]);
    expect(dirty.destroyed).toEqual([]);
  });

  it('destroy tracks destroyed entities', () => {
    const em = new EntityManager();
    const id = em.create();
    em.destroy(id);
    const dirty = em.getDirty();
    expect(dirty.created).toEqual([id]);
    expect(dirty.destroyed).toEqual([id]);
  });

  it('clearDirty resets both arrays', () => {
    const em = new EntityManager();
    em.create();
    em.clearDirty();
    const dirty = em.getDirty();
    expect(dirty.created).toEqual([]);
    expect(dirty.destroyed).toEqual([]);
  });

  describe('fromState validation', () => {
    it('rejects non-boolean alive entries', () => {
      const bad = { generations: [0, 0], alive: [true, 'yes' as unknown as boolean], freeList: [] };
      expect(() => EntityManager.fromState(bad)).toThrow(/alive\[1\]/);
    });

    it('rejects negative generation entries', () => {
      const bad = { generations: [0, -1], alive: [true, true], freeList: [] };
      expect(() => EntityManager.fromState(bad)).toThrow(/generations\[1\]/);
    });

    it('rejects non-integer generation entries', () => {
      const bad = { generations: [0, 1.5], alive: [true, true], freeList: [] };
      expect(() => EntityManager.fromState(bad)).toThrow(/generations\[1\]/);
    });
  });
});
