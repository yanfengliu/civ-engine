import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('System interval (cadence)', () => {
  it('default interval=1 runs every tick', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    let runs = 0;
    world.registerSystem({ name: 'every', execute: () => runs++ });
    for (let i = 0; i < 5; i++) world.step();
    expect(runs).toBe(5);
  });

  it('interval=2 fires on the 1st, 3rd, 5th step (matches w.tick % 2 === 0 legacy)', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const runTicks: number[] = [];
    world.registerSystem({
      name: 'half',
      execute: (w) => runTicks.push(w.tick + 1),
      interval: 2,
    });
    for (let i = 0; i < 6; i++) world.step();
    expect(runTicks).toEqual([1, 3, 5]);
  });

  it('interval=4 fires at ticks 1, 5, 9, 13 by default offset', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const runTicks: number[] = [];
    world.registerSystem({
      name: 'q',
      execute: (w) => runTicks.push(w.tick + 1),
      interval: 4,
    });
    for (let i = 0; i < 13; i++) world.step();
    expect(runTicks).toEqual([1, 5, 9, 13]);
  });

  it('intervalOffset=1 with interval=4 fires at ticks 2, 6, 10, ...', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const runTicks: number[] = [];
    world.registerSystem({
      name: 'shifted',
      execute: (w) => runTicks.push(w.tick + 1),
      interval: 4,
      intervalOffset: 1,
    });
    for (let i = 0; i < 13; i++) world.step();
    expect(runTicks).toEqual([2, 6, 10]);
  });

  it('intervalOffset=3 with interval=4 fires at ticks 4, 8, 12, ...', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const runTicks: number[] = [];
    world.registerSystem({
      name: 'shifted',
      execute: (w) => runTicks.push(w.tick + 1),
      interval: 4,
      intervalOffset: 3,
    });
    for (let i = 0; i < 13; i++) world.step();
    expect(runTicks).toEqual([4, 8, 12]);
  });

  it('matches legacy `if (w.tick % N !== 0) return;` schedule', () => {
    const worldA = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const worldB = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const fromInterval: number[] = [];
    const fromManual: number[] = [];
    worldA.registerSystem({
      name: 'cadence',
      interval: 3,
      execute: (w) => fromInterval.push(w.tick + 1),
    });
    worldB.registerSystem({
      name: 'manual',
      execute: (w) => {
        if (w.tick % 3 !== 0) return;
        fromManual.push(w.tick + 1);
      },
    });
    for (let i = 0; i < 12; i++) {
      worldA.step();
      worldB.step();
    }
    expect(fromInterval).toEqual(fromManual);
  });

  it('two systems with different intervals run independently', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    let everyTick = 0;
    let everyThird = 0;
    world.registerSystem({ name: 'a', execute: () => everyTick++ });
    world.registerSystem({ name: 'b', execute: () => everyThird++, interval: 3 });
    for (let i = 0; i < 9; i++) world.step();
    expect(everyTick).toBe(9);
    expect(everyThird).toBe(3);
  });

  it('skipped systems do not appear in metrics.systems for that tick', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerSystem({ name: 'always', execute: () => {} });
    world.registerSystem({ name: 'rare', execute: () => {}, interval: 5 });
    // After the first step (tick 1), only 'always' should appear.
    // 'rare' with interval=5 default offset 0 fires at tick 1, then 6, 11...
    // — actually with (tick-1)%5===0, fires at ticks 1, 6, 11. So after step 2 it skips.
    world.step();
    world.step();
    const metrics = world.getMetrics();
    expect(metrics).not.toBeNull();
    const names = metrics!.systems.map((s) => s.name);
    expect(names).toContain('always');
    expect(names).not.toContain('rare');
  });

  it('interval respects ordering constraints within a phase', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const order: string[] = [];
    world.registerSystem({
      name: 'B',
      execute: () => order.push('B'),
      after: ['A'],
      interval: 2,
    });
    world.registerSystem({
      name: 'A',
      execute: () => order.push('A'),
      interval: 2,
    });
    // Both fire at ticks 1 and 3 (interval=2, offset=0 → (tick-1)%2===0 → ticks 1,3)
    for (let i = 0; i < 4; i++) world.step();
    expect(order).toEqual(['A', 'B', 'A', 'B']);
  });

  it('three-way stagger with interval=3 and offsets 0/1/2 partitions every tick', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const runs: string[] = [];
    world.registerSystem({
      name: 'a',
      execute: () => runs.push('a'),
      interval: 3,
      intervalOffset: 0,
    });
    world.registerSystem({
      name: 'b',
      execute: () => runs.push('b'),
      interval: 3,
      intervalOffset: 1,
    });
    world.registerSystem({
      name: 'c',
      execute: () => runs.push('c'),
      interval: 3,
      intervalOffset: 2,
    });
    for (let i = 0; i < 6; i++) world.step();
    expect(runs).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
  });

  it('rejects interval=0', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({ name: 's', execute: () => {}, interval: 0 }),
    ).toThrow(/interval/);
  });

  it('rejects negative interval', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({ name: 's', execute: () => {}, interval: -1 }),
    ).toThrow(/interval/);
  });

  it('rejects non-integer interval', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({ name: 's', execute: () => {}, interval: 1.5 }),
    ).toThrow(/interval/);
  });

  it('rejects NaN interval', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({ name: 's', execute: () => {}, interval: NaN }),
    ).toThrow(/interval/);
  });

  it('rejects Infinity interval', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        name: 's',
        execute: () => {},
        interval: Infinity,
      }),
    ).toThrow(/interval/);
  });

  it('rejects interval beyond Number.MAX_SAFE_INTEGER (determinism)', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        name: 's',
        execute: () => {},
        interval: Number.MAX_SAFE_INTEGER + 2, // not exactly representable
      }),
    ).toThrow(/interval/);
  });

  it('rejects non-number interval (string from JSON config)', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        name: 's',
        execute: () => {},
        interval: '4' as unknown as number,
      }),
    ).toThrow(/interval/);
  });

  it('rejects negative intervalOffset', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        name: 's',
        execute: () => {},
        interval: 4,
        intervalOffset: -1,
      }),
    ).toThrow(/intervalOffset/);
  });

  it('rejects intervalOffset >= interval', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        name: 's',
        execute: () => {},
        interval: 4,
        intervalOffset: 4,
      }),
    ).toThrow(/intervalOffset/);
  });

  it('rejects non-integer intervalOffset', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        name: 's',
        execute: () => {},
        interval: 4,
        intervalOffset: 1.5,
      }),
    ).toThrow(/intervalOffset/);
  });

  it('rejects non-number intervalOffset', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        name: 's',
        execute: () => {},
        interval: 4,
        intervalOffset: '1' as unknown as number,
      }),
    ).toThrow(/intervalOffset/);
  });

  it('intervalOffset alone (without interval) defaults interval to 1, only offset 0 valid', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(() =>
      world.registerSystem({
        name: 's',
        execute: () => {},
        intervalOffset: 0,
      }),
    ).not.toThrow();
    expect(() =>
      world.registerSystem({
        name: 's2',
        execute: () => {},
        intervalOffset: 1,
      }),
    ).toThrow(/intervalOffset/);
  });

  it('failed validation does not consume an order slot', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.registerSystem({ name: 'first', execute: () => {} });
    expect(() =>
      world.registerSystem({
        execute: () => {},
        interval: -1,
      }),
    ).toThrow(/interval/);
    // The next valid registration should land at order index 1, not 2.
    let runs = 0;
    world.registerSystem({ name: 'second', execute: () => runs++ });
    world.step();
    expect(runs).toBe(1);
  });

  it('failed tick consumes a cadence slot — fire opportunity is lost not retried', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    const runTicks: number[] = [];
    let throwOnce = true;
    world.registerSystem({
      name: 'first',
      execute: () => {
        if (throwOnce) {
          throwOnce = false;
          throw new Error('boom');
        }
      },
    });
    world.registerSystem({
      name: 'periodic',
      interval: 2,
      execute: (w) => runTicks.push(w.tick + 1),
    });
    // Step 1 (tick 1) fails before periodic runs (which would have fired at tick 1).
    expect(() => world.step()).toThrow();
    world.recover();
    // Now periodic is gated on (tick-1)%2===0, so it next fires at tick 3, then 5.
    for (let i = 0; i < 4; i++) world.step();
    expect(runTicks).toEqual([3, 5]);
  });
});
