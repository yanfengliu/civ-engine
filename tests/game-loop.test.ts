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

  it('step() does not auto-advance tick; advance() is the explicit step', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(loop.tick).toBe(0);
    loop.step();
    expect(loop.tick).toBe(0);
    loop.advance();
    expect(loop.tick).toBe(1);
    loop.step();
    loop.advance();
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
    loop.advance();
    loop.step();
    loop.advance();
    loop.step();
    loop.advance();
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
    loop.advance();
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

  it('step() propagates errors when no onError is set', () => {
    const loop = new GameLoop({
      tps: 60,
      onTick: () => { throw new Error('boom'); },
    });
    expect(() => loop.step()).toThrow('boom');
  });

  it('onError is called and loop stops when onTick throws during loop', async () => {
    let tickCount = 0;
    const errors: unknown[] = [];
    const loop = new GameLoop({
      tps: 60,
      onTick: () => {
        tickCount++;
        if (tickCount === 1) throw new Error('system failure');
      },
      onError: (err) => { errors.push(err); },
    });
    loop.start();
    // Wait for the loop to fire and catch the error
    await new Promise((r) => setTimeout(r, 50));
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('system failure');
    expect(tickCount).toBe(1);
    loop.stop();
  });

  it('advance() throws RangeError if tick is at MAX_SAFE_INTEGER (L7)', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.setTick(Number.MAX_SAFE_INTEGER);
    expect(() => loop.advance()).toThrow(/saturated at Number\.MAX_SAFE_INTEGER/);
  });

  it('step() still throws even with onError (onError is for loop only)', () => {
    const errors: unknown[] = [];
    const loop = new GameLoop({
      tps: 60,
      onTick: () => { throw new Error('direct step'); },
      onError: (err) => { errors.push(err); },
    });
    // Direct step() always throws — onError only guards the async loop
    expect(() => loop.step()).toThrow('direct step');
    expect(errors).toHaveLength(0);
  });
});
