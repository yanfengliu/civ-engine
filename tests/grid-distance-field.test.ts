import { describe, expect, it } from 'vitest';
import * as engine from '../src/index.js';
import * as browser from '../src/index.browser.js';
import type { GridPathConfig, Position } from '../src/index.js';

type Options = Pick<GridPathConfig, 'width' | 'height' | 'occupancy' | 'movingEntity'
  | 'includeReservations' | 'allowDiagonal' | 'preventCornerCutting' | 'blocked' | 'cost' | 'maxCost'>;
interface Result {
  width: number;
  height: number;
  distances: Float64Array;
  sourceIndices: Int32Array;
}
type Field = (sources: readonly Position[], options: Options) => Result;
function getField(): Field {
  const fn = (engine as unknown as { gridDistanceField?: Field }).gridDistanceField;
  expect(fn, 'The public gridDistanceField function must exist').toBeTypeOf('function');
  return fn!;
}
function field(sources: readonly Position[], options: Options): Result {
  return getField()(sources, options);
}
const point = (x: number, y = 0): Position => ({ x, y });

describe('gridDistanceField distance-to-destination contract', () => {
  it('exports the same actual function through both public entry points', () => {
    field([], { width: 1, height: 1 });
    expect((browser as unknown as { gridDistanceField: Field }).gridDistanceField)
      .toBe((engine as unknown as { gridDistanceField: Field }).gridDistanceField);
  });

  it('computes every cell in a rectangular multi-source field with input-index ties', () => {
    const result = field([point(0), point(4)], { width: 5, height: 2 });
    expect([result.width, result.height]).toEqual([5, 2]);
    expect(result.distances).toBeInstanceOf(Float64Array);
    expect(result.sourceIndices).toBeInstanceOf(Int32Array);
    expect([...result.distances]).toEqual([0, 1, 2, 1, 0, 1, 2, 3, 2, 1]);
    expect([...result.sourceIndices]).toEqual([0, 0, 0, 1, 1, 0, 0, 0, 1, 1]);
  });

  it('retains the first duplicate destination and the original indices after blocked sources', () => {
    const result = field([point(1), point(0), point(0), point(3)], {
      width: 4, height: 1, blocked: x => x === 1,
    });
    expect([...result.distances]).toEqual([0, Infinity, 1, 0]);
    expect([...result.sourceIndices]).toEqual([1, -1, 3, 3]);
  });

  it('handles a destination on every cell without changing their input indices', () => {
    const sources = Array.from({ length: 8 }, (_, index) => point(7 - index));
    const result = field(sources, { width: 8, height: 1 });
    expect([...result.distances]).toEqual(Array(8).fill(0));
    expect([...result.sourceIndices]).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
  });

  it.each([{ sources: [] }, { sources: [point(1)] }])('returns unreachable cells for absent or blocked destinations: %j', ({ sources }) => {
    const result = field(sources, { width: 3, height: 1, blocked: x => x === 1 });
    expect([...result.distances]).toEqual([Infinity, Infinity, Infinity]);
    expect([...result.sourceIndices]).toEqual([-1, -1, -1]);
  });

  it('routes around an obstacle and leaves a disconnected cell unreachable', () => {
    const result = field([point(0)], {
      width: 4, height: 3,
      blocked: (x, y) => (x === 1 && y < 2) || (x === 3 && y === 1) || (x === 2 && y === 0),
    });
    expect(result.distances[2]).toBe(Infinity);
    expect(result.distances[3]).toBe(Infinity);
    expect(result.distances[6]).toBe(5);
    expect(result.distances[11]).toBe(5);
  });

  it('uses destination-directed costs rather than reversing a one-way road', () => {
    const cost = (from: Position, to: Position): number => to.x === from.x + 1 ? 2 : Infinity;
    expect([...field([point(3)], { width: 4, height: 1, cost }).distances]).toEqual([6, 4, 2, 0]);
    expect([...field([point(0)], { width: 4, height: 1, cost }).distances]).toEqual([0, Infinity, Infinity, Infinity]);
  });

  it('chooses a longer geometric route with a lower weighted cost', () => {
    const result = field([point(2)], {
      width: 3, height: 2,
      cost: (from, to) => from.y === 0 && to.y === 0 ? 5 : 0.25,
    });
    expect(result.distances[0]).toBe(1);
    expect(result.distances[1]).toBe(0.75);
    expect(result.distances[2]).toBe(0);
  });

  it('propagates the earlier source through an equal-distance zero-cost edge', () => {
    const result = field([point(0), point(3)], {
      width: 4, height: 1,
      cost: (from, to) => from.x === 2 && to.x === 1 ? 0 : 1,
    });
    expect([...result.distances]).toEqual([0, 1, 1, 0]);
    expect([...result.sourceIndices]).toEqual([0, 0, 0, 1]);
  });

  it('terminates zero-cost cycles and resolves every tie to the earlier input source', () => {
    const result = field([point(3), point(0)], { width: 4, height: 2, cost: () => 0 });
    expect([...result.distances]).toEqual(Array(8).fill(0));
    expect([...result.sourceIndices]).toEqual(Array(8).fill(0));
  });

  it.each([Infinity, -1, NaN, -Infinity])('excludes unsupported edge cost %s', cost => {
    const result = field([point(0)], { width: 2, height: 1, cost: () => cost });
    expect([...result.distances]).toEqual([0, Infinity]);
    expect([...result.sourceIndices]).toEqual([0, -1]);
  });

  it('does not report an overflowing finite-cost sum as a reachable path', () => {
    const result = field([point(0)], { width: 3, height: 1, cost: () => Number.MAX_VALUE });
    expect([...result.distances]).toEqual([0, Number.MAX_VALUE, Infinity]);
    expect([...result.sourceIndices]).toEqual([0, 0, -1]);
  });

  it('includes maxCost itself and leaves larger costs unreachable', () => {
    expect([...field([point(0)], { width: 4, height: 1, maxCost: 2 }).distances]).toEqual([0, 1, 2, Infinity]);
    expect([...field([point(0)], { width: 4, height: 1, cost: () => 0.5, maxCost: 1 }).distances]).toEqual([0, 0.5, 1, Infinity]);
    expect([...field([point(0)], { width: 2, height: 1, maxCost: 0 }).distances]).toEqual([0, Infinity]);
  });

  it('matches diagonal edge lengths and prevents corner cutting by default', () => {
    expect(field([point(0)], { width: 3, height: 3, allowDiagonal: true }).distances[8]).toBe(2 * Math.SQRT2);
    const options = { width: 2, height: 2, allowDiagonal: true, blocked: (x: number, y: number) => x + y === 1 };
    expect(field([point(0)], options).distances[3]).toBe(Infinity);
    expect(field([point(0)], { ...options, preventCornerCutting: false }).distances[3]).toBe(Math.SQRT2);
  });

  it('combines occupancy, reservations, moving-entity exemption and custom blocking', () => {
    const occupancy = {
      width: 4, height: 1, version: 0,
      isBlocked: (x: number, _y: number, options?: { ignoreEntity?: number; includeReservations?: boolean }) =>
        (x === 1 && options?.ignoreEntity !== 7) || (x === 2 && options?.includeReservations !== false),
    };
    expect([...field([point(0)], { occupancy }).distances]).toEqual([0, Infinity, Infinity, Infinity]);
    expect([...field([point(0)], { occupancy, movingEntity: 7, includeReservations: false }).distances]).toEqual([0, 1, 2, 3]);
    expect([...field([point(0)], { occupancy, movingEntity: 7, includeReservations: false, blocked: x => x === 2 }).distances])
      .toEqual([0, 1, Infinity, Infinity]);
  });

  it('returns independently owned arrays without mutating the destination inputs', () => {
    const sources = Object.freeze([Object.freeze(point(0))]);
    const first = field(sources, { width: 3, height: 1 });
    first.distances[1] = 500;
    first.sourceIndices[1] = 99;
    const second = field(sources, { width: 3, height: 1 });
    expect([...second.distances]).toEqual([0, 1, 2]);
    expect([...second.sourceIndices]).toEqual([0, 0, 0]);
    expect(sources).toEqual([point(0)]);
  });

  it.each([
    [{ width: 0, height: 2 }, [point(0)]],
    [{ width: 2.5, height: 2 }, [point(0)]],
    [{ width: Infinity, height: 2 }, [point(0)]],
    [{ width: 2, height: 2 }, [point(0), point(0.5)]],
    [{ width: 2, height: 2 }, [point(0), point(2)]],
    [{ width: 2, height: 2 }, [point(-1)]],
    [{ width: 2, height: 2 }, [point(NaN)]],
    [{ width: 2, height: 2, maxCost: -1 }, [point(0)]],
    [{ width: 2, height: 2, maxCost: NaN }, [point(0)]],
    [{ width: 65536, height: 65536 }, []],
  ] as Array<[Options, Position[]]>)('rejects invalid input before callbacks: %j %j', (options, sources) => {
    const fn = getField();
    let calls = 0;
    expect(() => fn(sources, { ...options, blocked: () => { calls++; return false; } })).toThrow();
    expect(calls).toBe(0);
  });

  it('requires dimensions or an occupancy grid', () => {
    const fn = getField();
    expect(() => fn([], {})).toThrow();
  });

  it('preserves callback exception identity', () => {
    const fn = getField();
    const error = new Error('sentinel');
    const caught = (body: () => unknown): unknown => {
      try { body(); } catch (failure) { return failure; }
      throw new Error('Expected callback to throw');
    };
    expect(caught(() => fn([point(0)], { width: 2, height: 1, blocked: () => { throw error; } }))).toBe(error);
    expect(caught(() => fn([point(0)], { width: 2, height: 1, cost: () => { throw error; } }))).toBe(error);
  });
});
