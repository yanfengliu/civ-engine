import { describe, it, expect } from 'vitest';
import { ResourceStore } from '../src/resource-store.js';

describe('ResourceStore', () => {
  it('register creates a new resource type', () => {
    const store = new ResourceStore();
    store.register('food');
    expect(() => store.register('food')).toThrow("Resource 'food' is already registered");
  });

  it('addResource creates pool and returns amount added', () => {
    const store = new ResourceStore();
    store.register('food');
    const added = store.addResource(0, 'food', 50);
    expect(added).toBe(50);
    expect(store.getResource(0, 'food')).toEqual({ current: 50, max: Infinity });
  });

  it('addResource caps at max', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 100 });
    store.addResource(0, 'food', 80);
    const added = store.addResource(0, 'food', 50);
    expect(added).toBe(20);
    expect(store.getResource(0, 'food')!.current).toBe(100);
  });

  it('removeResource returns actual amount removed', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 30);
    const removed = store.removeResource(0, 'food', 50);
    expect(removed).toBe(30);
    expect(store.getResource(0, 'food')!.current).toBe(0);
  });

  it('getResource returns undefined for missing pool', () => {
    const store = new ResourceStore();
    store.register('food');
    expect(store.getResource(0, 'food')).toBeUndefined();
  });

  it('setResourceMax clamps current when lowered', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 80);
    store.setResourceMax(0, 'food', 50);
    const pool = store.getResource(0, 'food')!;
    expect(pool.max).toBe(50);
    expect(pool.current).toBe(50);
  });

  it('getResourceEntities yields entities with pools', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 10);
    store.addResource(5, 'food', 20);
    const ids = [...store.getResourceEntities('food')];
    expect(ids).toEqual([0, 5]);
  });

  it('throws on unregistered resource key', () => {
    const store = new ResourceStore();
    expect(() => store.addResource(0, 'gold', 10)).toThrow("Resource 'gold' is not registered");
    expect(() => store.removeResource(0, 'gold', 10)).toThrow("Resource 'gold' is not registered");
    expect(() => store.getResource(0, 'gold')).toThrow("Resource 'gold' is not registered");
    expect(() => store.setResourceMax(0, 'gold', 10)).toThrow("Resource 'gold' is not registered");
  });
});
