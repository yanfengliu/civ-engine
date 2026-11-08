import { describe, expect, it, vi } from 'vitest';
import { VisibilityMap, type VisibilityMapState } from '../src/visibility-map.js';

function countSorts(run: () => void): number {
  const spy = vi.spyOn(Array.prototype, 'sort');
  try {
    run();
    return spy.mock.calls.length;
  } finally { spy.mockRestore(); }
}

describe('visibility canonical ordering reuse', () => {
  it('does no ordering work for repeated unchanged state/source reads', () => {
    const map = new VisibilityMap(8, 8);
    for (const player of ['z', 2, 'B', 1]) {
      map.setSource(player, 'z', { x: 4, y: 4, radius: 2 });
      map.setSource(player, 2, { x: 1, y: 1, radius: 1 });
    }
    const state = map.getState();
    expect(countSorts(() => { for (let i = 0; i < 8; i++) { map.getState(); map.getSources('z'); } })).toBe(0);
    expect(map.getState()).toEqual(state);
  });

  it('does not re-sort on movement inside already explored territory', () => {
    const map = new VisibilityMap(8, 8);
    map.setSource('p', 'cover', { x: 4, y: 4, radius: 20 });
    map.setSource('p', 'scout', { x: 1, y: 1, radius: 1 });
    map.getState();
    expect(countSorts(() => {
      map.setSource('p', 'scout', { x: 2, y: 3, radius: 1 });
      map.getState();
    })).toBe(0);
    expect(map.getSources('p')).toEqual([
      ['cover', { x: 4, y: 4, radius: 20 }], ['scout', { x: 2, y: 3, radius: 1 }],
    ]);
    expect(map.getMetrics()).toEqual({ recomputes: 2, computedCells: 128, visibilityQueries: 0 });
  });

  it('preserves canonical mixed-key order through membership changes and player recreation', () => {
    const map = new VisibilityMap(8, 8);
    for (const player of ['é', 'a', 2, 'B', 10, '2']) {
      for (const source of ['é', 'a', 2, 'B', 10, '2']) map.setSource(player, source, { x: 1, y: 1, radius: 0 });
    }
    const order = [10, 2, '2', 'B', 'a', 'é'];
    expect(map.getState().players.map(([id]) => id)).toEqual(order);
    expect(map.getSources('a').map(([id]) => id)).toEqual(order);
    map.removeSource('a', 'B');
    map.setSource('a', 'B', { x: 7, y: 7, radius: 0 });
    map.clearPlayer(10);
    map.setSource(10, 'new', { x: 0, y: 0, radius: 0 });
    const state = map.getState();
    expect(state.players.map(([id]) => id)).toEqual(order);
    expect(map.getSources('a')).toContainEqual(['B', { x: 7, y: 7, radius: 0 }]);
    expect(state.players[0]).toEqual([10, { sources: [['new', { x: 0, y: 0, radius: 0 }]], explored: [0] }]);
  });

  it('returns detached output and preserves loaded duplicate merges and extra source fields', () => {
    const state: VisibilityMapState = { width: 8, height: 8, players: [
      ['p', { sources: [['z', { x: 1, y: 1, radius: 0 }]], explored: [5, 2] }],
      ['p', { sources: [['z', { x: 7, y: 7, radius: 0 }], [2, { x: 2, y: 2, radius: 0 }]], explored: [2, 1] }],
    ] };
    Object.assign(state.players[1][1].sources[0][1], { extra: 'retained' });
    const map = VisibilityMap.fromState(state);
    const expected = { width: 8, height: 8, players: [['p', {
      sources: [[2, { x: 2, y: 2, radius: 0 }], ['z', { x: 7, y: 7, radius: 0, extra: 'retained' }]],
      explored: [1, 2, 5, 18, 63],
    }]] };
    expect(map.getState()).toEqual(expected);
    const result = map.getState();
    result.players[0][0] = 'changed';
    result.players[0][1].sources[0][0] = 'changed';
    result.players[0][1].sources[0][1].x = 0;
    result.players[0][1].sources.reverse();
    result.players[0][1].explored.splice(0);
    result.players.push(['ghost', { sources: [], explored: [] }]);
    const sources = map.getSources('p');
    sources[0][1].y = 0;
    sources.length = 0;
    expect(map.getState()).toEqual(expected);
    expect(countSorts(() => { map.getState(); map.getSources('p'); })).toBe(0);
  });

  it('explores only the final batched source positions and keeps canonical cell growth', () => {
    const map = new VisibilityMap(8, 8);
    map.setSource('p', 'scout', { x: 1, y: 1, radius: 0 });
    map.getState();
    map.setSource('p', 'scout', { x: 7, y: 7, radius: 0 });
    map.setSource('p', 'scout', { x: 1, y: 1, radius: 0 });
    map.setSource('p', 'temporary', { x: 6, y: 6, radius: 0 });
    map.removeSource('p', 'temporary');
    expect(map.getState().players[0][1].explored).toEqual([9]);
    map.setSource('p', 'scout', { x: 0, y: 0, radius: 1 });
    expect(map.getState().players[0][1].explored).toEqual([0, 1, 8, 9]);
    expect(map.getVisibleCells('p')).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]);
    expect(map.getMetrics()).toEqual({ recomputes: 3, computedCells: 5, visibilityQueries: 0 });
  });
});
