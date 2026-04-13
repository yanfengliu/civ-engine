import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('System ordering constraints', () => {
  it('after constraint runs the system after the named target', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem({ name: 'B', execute: () => order.push('B'), after: ['A'] });
    world.registerSystem({ name: 'A', execute: () => order.push('A') });
    world.step();
    expect(order).toEqual(['A', 'B']);
  });

  it('before constraint runs the system before the named target', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem({ name: 'B', execute: () => order.push('B') });
    world.registerSystem({ name: 'A', execute: () => order.push('A'), before: ['B'] });
    world.step();
    expect(order).toEqual(['A', 'B']);
  });

  it('unconstrained systems maintain registration order', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem({ name: 'X', execute: () => order.push('X') });
    world.registerSystem({ name: 'Y', execute: () => order.push('Y') });
    world.registerSystem({ name: 'Z', execute: () => order.push('Z') });
    world.step();
    expect(order).toEqual(['X', 'Y', 'Z']);
  });

  it('forms chains: A before B, B before C => A, B, C', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem({ name: 'C', execute: () => order.push('C'), after: ['B'] });
    world.registerSystem({ name: 'A', execute: () => order.push('A'), before: ['B'] });
    world.registerSystem({ name: 'B', execute: () => order.push('B') });
    world.step();
    expect(order).toEqual(['A', 'B', 'C']);
  });

  it('cycle detection throws with descriptive message', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerSystem({ name: 'A', execute: () => {}, after: ['B'] });
    world.registerSystem({ name: 'B', execute: () => {}, after: ['A'] });
    expect(() => world.step()).toThrow(/Cycle detected/);
  });

  it('cross-phase constraint throws', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerSystem({ name: 'A', phase: 'input', execute: () => {} });
    world.registerSystem({ name: 'B', phase: 'update', execute: () => {}, after: ['A'] });
    expect(() => world.step()).toThrow(/cross-phase/);
  });

  it('reference to non-existent system name throws', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerSystem({ name: 'A', execute: () => {}, after: ['missing'] });
    expect(() => world.step()).toThrow(/non-existent system 'missing'/);
  });

  it('re-resolves order when system is added after first tick', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem({ name: 'A', execute: () => order.push('A') });
    world.step();
    expect(order).toEqual(['A']);

    order.length = 0;
    world.registerSystem({ name: 'B', execute: () => order.push('B'), before: ['A'] });
    world.step();
    expect(order).toEqual(['B', 'A']);
  });

  it('constraints within the same phase do not affect other phases', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem({ name: 'pre', phase: 'preUpdate', execute: () => order.push('pre') });
    world.registerSystem({
      name: 'B', phase: 'update', execute: () => order.push('B'),
      after: ['A'],
    });
    world.registerSystem({ name: 'A', phase: 'update', execute: () => order.push('A') });
    world.registerSystem({ name: 'post', phase: 'postUpdate', execute: () => order.push('post') });
    world.step();
    expect(order).toEqual(['pre', 'A', 'B', 'post']);
  });
});
