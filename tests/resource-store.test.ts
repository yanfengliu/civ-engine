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

  it('setProduction and getProduction round-trip', () => {
    const store = new ResourceStore();
    store.register('food');
    store.setProduction(0, 'food', 5);
    expect(store.getProduction(0, 'food')).toBe(5);
  });

  it('setConsumption and getConsumption round-trip', () => {
    const store = new ResourceStore();
    store.register('food');
    store.setConsumption(0, 'food', 3);
    expect(store.getConsumption(0, 'food')).toBe(3);
  });

  it('setProduction auto-creates pool', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 200 });
    store.setProduction(0, 'food', 5);
    expect(store.getResource(0, 'food')).toEqual({ current: 0, max: 200 });
  });

  it('processTick applies production then consumption', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 100 });
    store.addResource(0, 'food', 50);
    store.setProduction(0, 'food', 10);
    store.setConsumption(0, 'food', 7);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(53);
  });

  it('processTick caps production at max', () => {
    const store = new ResourceStore();
    store.register('food', { defaultMax: 100 });
    store.addResource(0, 'food', 95);
    store.setProduction(0, 'food', 10);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(100);
  });

  it('processTick caps consumption at 0', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 3);
    store.setConsumption(0, 'food', 10);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(0);
  });

  it('setting rate to 0 disables it', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.setProduction(0, 'food', 10);
    store.setProduction(0, 'food', 0);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(50);
  });

  it('processTick processes transfers', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 0);
    store.addTransfer(0, 1, 'food', 25);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(75);
    expect(store.getResource(1, 'food')!.current).toBe(25);
  });

  it('processTick partial transfer when source insufficient', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 10);
    store.addResource(1, 'food', 0);
    store.addTransfer(0, 1, 'food', 25);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(0);
    expect(store.getResource(1, 'food')!.current).toBe(10);
  });

  it('processTick caps transfer at target max', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 15);
    store.setResourceMax(1, 'food', 20);
    store.addTransfer(0, 1, 'food', 25);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(95);
    expect(store.getResource(1, 'food')!.current).toBe(20);
  });

  it('processTick removes transfers with dead entities', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 0);
    store.addTransfer(0, 1, 'food', 10);
    store.processTick((id) => id !== 1);
    expect(store.getResource(0, 'food')!.current).toBe(100);
    expect(store.getTransfers(0)).toEqual([]);
  });

  it('removeTransfer stops the flow', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 0);
    const tid = store.addTransfer(0, 1, 'food', 10);
    store.removeTransfer(tid);
    store.processTick(() => true);
    expect(store.getResource(0, 'food')!.current).toBe(100);
  });

  it('getTransfers returns transfers involving entity', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 100);
    store.addResource(1, 'food', 0);
    store.addResource(2, 'food', 0);
    store.addTransfer(0, 1, 'food', 10);
    store.addTransfer(0, 2, 'food', 5);
    const transfers = store.getTransfers(0);
    expect(transfers).toHaveLength(2);
    expect(transfers[0].to).toBe(1);
    expect(transfers[1].to).toBe(2);
  });

  it('removeEntity cleans up pools, rates, and transfers', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.setProduction(0, 'food', 5);
    store.setConsumption(0, 'food', 3);
    store.addResource(1, 'food', 0);
    store.addTransfer(0, 1, 'food', 10);
    store.removeEntity(0);
    expect(store.getResource(0, 'food')).toBeUndefined();
    expect(store.getProduction(0, 'food')).toBe(0);
    expect(store.getConsumption(0, 'food')).toBe(0);
    expect(store.getTransfers(1)).toEqual([]);
  });

  it('getDirty tracks pool mutations', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.addResource(1, 'food', 30);
    const dirty = store.getDirty();
    expect(dirty['food'].set).toEqual([
      [0, { current: 50, max: Infinity }],
      [1, { current: 30, max: Infinity }],
    ]);
    expect(dirty['food'].removed).toEqual([]);
  });

  it('clearDirty resets dirty state', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.clearDirty();
    const dirty = store.getDirty();
    expect(dirty).toEqual({});
  });

  it('removeEntity marks pool as removed in dirty', () => {
    const store = new ResourceStore();
    store.register('food');
    store.addResource(0, 'food', 50);
    store.clearDirty();
    store.removeEntity(0);
    const dirty = store.getDirty();
    expect(dirty['food'].set).toEqual([]);
    expect(dirty['food'].removed).toEqual([0]);
  });
});
