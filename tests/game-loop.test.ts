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

  it('validates timing config', () => {
    expect(() => new GameLoop({ tps: 0, onTick: () => {} })).toThrow();
    expect(
      () => new GameLoop({ tps: 60, maxTicksPerFrame: 0, onTick: () => {} }),
    ).toThrow();
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

  it('defaults to speed 1 and not paused', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(loop.getSpeed()).toBe(1);
    expect(loop.isPaused).toBe(false);
  });

  it('setSpeed updates getSpeed', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.setSpeed(2);
    expect(loop.getSpeed()).toBe(2);
    loop.setSpeed(0.5);
    expect(loop.getSpeed()).toBe(0.5);
  });

  it('setSpeed throws on zero', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(() => loop.setSpeed(0)).toThrow();
  });

  it('setSpeed throws on negative', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(() => loop.setSpeed(-1)).toThrow();
  });

  it('pause sets isPaused true', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.pause();
    expect(loop.isPaused).toBe(true);
  });

  it('resume sets isPaused false', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.pause();
    loop.resume();
    expect(loop.isPaused).toBe(false);
  });

  it('pause when already paused is a no-op', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.pause();
    loop.pause(); // should not throw
    expect(loop.isPaused).toBe(true);
  });

  it('resume when not paused is a no-op', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.resume(); // should not throw
    expect(loop.isPaused).toBe(false);
  });

  it('step works while paused', () => {
    let count = 0;
    const loop = new GameLoop({ tps: 60, onTick: () => { count++; } });
    loop.pause();
    loop.step();
    expect(count).toBe(1);
    expect(loop.tick).toBe(1);
  });

  it('setSpeed while paused updates multiplier but stays paused', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.pause();
    loop.setSpeed(4);
    expect(loop.getSpeed()).toBe(4);
    expect(loop.isPaused).toBe(true);
  });

  it('setSpeed throws on Infinity', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(() => loop.setSpeed(Infinity)).toThrow();
  });

  it('setSpeed throws on NaN', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(() => loop.setSpeed(NaN)).toThrow();
  });

  it('start is idempotent', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(() => {
      loop.start();
      loop.start();
      loop.stop();
    }).not.toThrow();
  });
});
