import { describe, it, expect } from 'vitest';
import { ComponentStore } from '../src/component-store.js';

describe('ComponentStore', () => {
  it('stores and retrieves component data', () => {
    const store = new ComponentStore<{ x: number; y: number }>();
    store.set(0, { x: 10, y: 20 });
    expect(store.get(0)).toEqual({ x: 10, y: 20 });
  });

  it('returns undefined for missing entity', () => {
    const store = new ComponentStore<{ x: number }>();
    expect(store.get(99)).toBeUndefined();
  });

  it('removes component data', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 10 });
    store.remove(0);
    expect(store.get(0)).toBeUndefined();
  });

  it('reports has correctly', () => {
    const store = new ComponentStore<{ x: number }>();
    expect(store.has(0)).toBe(false);
    store.set(0, { x: 10 });
    expect(store.has(0)).toBe(true);
    store.remove(0);
    expect(store.has(0)).toBe(false);
  });

  it('increments generation on set', () => {
    const store = new ComponentStore<{ x: number }>();
    const gen0 = store.generation;
    store.set(0, { x: 10 });
    expect(store.generation).toBe(gen0 + 1);
  });

  it('increments generation on remove', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 10 });
    const gen = store.generation;
    store.remove(0);
    expect(store.generation).toBe(gen + 1);
  });

  it('does not increment generation on no-op remove', () => {
    const store = new ComponentStore<{ x: number }>();
    const gen = store.generation;
    store.remove(99);
    expect(store.generation).toBe(gen);
  });

  it('tracks size correctly', () => {
    const store = new ComponentStore<{ x: number }>();
    expect(store.size).toBe(0);
    store.set(0, { x: 1 });
    expect(store.size).toBe(1);
    store.set(5, { x: 2 });
    expect(store.size).toBe(2);
    store.remove(0);
    expect(store.size).toBe(1);
  });

  it('iterates over entities with components', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.set(3, { x: 2 });
    store.set(7, { x: 3 });
    const ids = [...store.entities()];
    expect(ids).toEqual([0, 3, 7]);
  });

  it('overwrites existing component data without double-counting size', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 10 });
    store.set(0, { x: 20 });
    expect(store.get(0)).toEqual({ x: 20 });
    expect(store.size).toBe(1);
  });

  it('entries yields populated slots as [id, data] pairs', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.set(5, { x: 2 });
    store.set(3, { x: 3 });
    const entries = [...store.entries()];
    expect(entries).toEqual([
      [0, { x: 1 }],
      [3, { x: 3 }],
      [5, { x: 2 }],
    ]);
  });

  it('fromEntries restores a component store from entry pairs', () => {
    const original = new ComponentStore<{ x: number; y: number }>();
    original.set(0, { x: 1, y: 2 });
    original.set(5, { x: 3, y: 4 });
    const entries = [...original.entries()];

    const restored = ComponentStore.fromEntries(entries);
    expect(restored.get(0)).toEqual({ x: 1, y: 2 });
    expect(restored.get(5)).toEqual({ x: 3, y: 4 });
    expect(restored.has(1)).toBe(false);
    expect(restored.size).toBe(2);
  });

  it('set marks entity as dirty', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    const dirty = store.getDirty();
    expect(dirty.set).toEqual([[0, { x: 1 }]]);
    expect(dirty.removed).toEqual([]);
  });

  it('remove marks entity as removed and clears from dirty', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.remove(0);
    const dirty = store.getDirty();
    expect(dirty.set).toEqual([]);
    expect(dirty.removed).toEqual([0]);
  });

  it('clearDirty resets both sets', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.set(1, { x: 2 });
    store.remove(1);
    store.clearDirty();
    const dirty = store.getDirty();
    expect(dirty.set).toEqual([]);
    expect(dirty.removed).toEqual([]);
  });

  it('getDirty returns set entries with current data', () => {
    const store = new ComponentStore<{ x: number }>();
    store.set(0, { x: 1 });
    store.set(0, { x: 99 });
    store.set(3, { x: 3 });
    const dirty = store.getDirty();
    expect(dirty.set).toEqual([
      [0, { x: 99 }],
      [3, { x: 3 }],
    ]);
  });

  it('tracks in-place mutations after clearDirty', () => {
    const store = new ComponentStore<{ hp: number }>();
    store.set(1, { hp: 10 });
    store.clearDirty();
    store.get(1)!.hp = 15;
    expect(store.getDirty().set).toEqual([[1, { hp: 15 }]]);
  });

  it('rejects non-JSON-compatible component data', () => {
    const store = new ComponentStore<{ value: number }>();
    expect(() => store.set(1, { value: Number.NaN })).toThrow();
    expect(() =>
      store.set(2, { fn: () => undefined } as unknown as { value: number }),
    ).toThrow();
  });
});
