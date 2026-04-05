import { describe, it, expect } from 'vitest';
import { GameLoop } from '../src/game-loop.js';

describe('GameLoop', () => {
  it('calls onTick when step() is invoked', () => {
    let called = false;
    const loop = new GameLoop({
      tps: 60,
      onTick: () => {
        called = true;
      },
    });
    loop.step();
    expect(called).toBe(true);
  });

  it('increments tick on step()', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(loop.tick).toBe(0);
    loop.step();
    expect(loop.tick).toBe(1);
    loop.step();
    expect(loop.tick).toBe(2);
  });

  it('returns configured tps', () => {
    const loop = new GameLoop({ tps: 30, onTick: () => {} });
    expect(loop.tps).toBe(30);
  });

  it('calls onTick the correct number of times across multiple steps', () => {
    let count = 0;
    const loop = new GameLoop({
      tps: 60,
      onTick: () => {
        count++;
      },
    });
    loop.step();
    loop.step();
    loop.step();
    expect(count).toBe(3);
    expect(loop.tick).toBe(3);
  });
});
