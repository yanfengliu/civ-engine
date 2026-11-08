import { describe, expect, it } from 'vitest';
import { VisibilityMap } from '../src/visibility-map.js';

const cells = (map: VisibilityMap) => map.getVisibleCells('p').map(({ x, y }) => [x, y]);

describe('VisibilityMap continuous source centers', () => {
  it.each([
    { x: 0.5, y: 0, radius: 0.5, expected: [[0, 0], [1, 0]] },
    { x: 0.5, y: 0.5, radius: 1, expected: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { x: 0.5, y: 0.5, radius: 0, expected: [] },
    { x: 1, y: 1, radius: 0, expected: [[1, 1]] },
    { x: 3.5, y: 3.5, radius: 1, expected: [[3, 3]] },
  ])('uses the literal inclusive circle at ($x,$y), radius $radius', ({ expected, ...source }) => {
    const map = new VisibilityMap(4, 4);
    map.setSource('p', 's', source);
    expect(cells(map)).toEqual(expected);
    const state = map.getState();
    expect(state.players[0][1].sources).toEqual([['s', source]]);
    expect(VisibilityMap.fromState(state).getState()).toEqual(state);
    expect(cells(VisibilityMap.fromState(state))).toEqual(expected);
  });

  it.each([NaN, Infinity, -Infinity])('rejects nonfinite x/y (%s) before bounds or radius', (coordinate) => {
    for (const axis of ['x', 'y'] as const) {
      const map = new VisibilityMap(4, 4);
      const source = { x: -1, y: -1, radius: -1, [axis]: coordinate };
      expect(() => map.setSource('p', 's', source)).toThrow(expect.objectContaining({
        code: 'visibility_source_coords_invalid', message: expect.stringMatching(/x.*y.*finite/),
      }));
      expect(map.getState().players).toEqual([]);
      expect(() => VisibilityMap.fromState({ width: 4, height: 4, players: [['p', { sources: [['s', source]], explored: [] }]] }))
        .toThrow(expect.objectContaining({ code: 'visibility_source_coords_invalid' }));
    }
  });

  it.each([[-0.5, 1], [1, -0.5], [4, 1], [1, 4]])('retains finite bounds errors for (%s,%s)', (x, y) => {
    const map = new VisibilityMap(4, 4);
    expect(() => map.setSource('p', 's', { x, y, radius: -1 }))
      .toThrow(expect.objectContaining({ code: 'visibility_out_of_bounds', details: { x, y } }));
    expect(map.getState().players).toEqual([]);
  });

  it.each([-1, Infinity, NaN])('keeps radius validation after valid fractional coordinates (%s)', (radius) => {
    const map = new VisibilityMap(4, 4);
    expect(() => map.setSource('p', 's', { x: 0.5, y: 1.5, radius }))
      .toThrow(expect.objectContaining({ code: 'visibility_value_invalid' }));
    expect(map.getState().players).toEqual([]);
  });

  it('keeps point queries integer-only and unknown-player validation short-circuiting', () => {
    const map = new VisibilityMap(4, 4);
    expect(map.isVisible('missing', 0.5, Infinity)).toBe(false);
    expect(map.isExplored('missing', 0.5, Infinity)).toBe(false);
    expect(map.getState().players).toEqual([]);
    map.setSource('p', 's', { x: 0.5, y: 0.5, radius: 1 });
    expect(() => map.isVisible('p', 0.5, 0)).toThrow(expect.objectContaining({ code: 'visibility_coords_not_integer' }));
    expect(map.getMetrics()).toEqual({ recomputes: 1, computedCells: 4, visibilityQueries: 3 });
  });
});
