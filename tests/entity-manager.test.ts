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
});
