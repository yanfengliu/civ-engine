import { describe, expect, it } from 'vitest';
import { VisibilityMap } from '../src/visibility-map.js';

describe('VisibilityMap', () => {
  it('reveals circular vision and tracks explored cells', () => {
    const map = new VisibilityMap(16, 16);

    map.setSource('p1', 'scout', { x: 5, y: 5, radius: 2 });
    map.update();

    expect(map.isVisible('p1', 5, 5)).toBe(true);
    expect(map.isVisible('p1', 7, 5)).toBe(true);
    expect(map.isVisible('p1', 8, 5)).toBe(false);
    expect(map.isExplored('p1', 7, 5)).toBe(true);
  });

  it('preserves explored cells after a vision source moves away', () => {
    const map = new VisibilityMap(16, 16);

    map.setSource('p1', 'scout', { x: 3, y: 3, radius: 1 });
    map.update();
    expect(map.isVisible('p1', 4, 3)).toBe(true);

    map.setSource('p1', 'scout', { x: 10, y: 10, radius: 1 });
    map.update();

    expect(map.isVisible('p1', 4, 3)).toBe(false);
    expect(map.isExplored('p1', 4, 3)).toBe(true);
  });

  it('keeps player visibility independent', () => {
    const map = new VisibilityMap(16, 16);

    map.setSource('p1', 'town', { x: 2, y: 2, radius: 2 });
    map.setSource('p2', 'town', { x: 12, y: 12, radius: 2 });
    map.update();

    expect(map.isVisible('p1', 2, 2)).toBe(true);
    expect(map.isVisible('p1', 12, 12)).toBe(false);
    expect(map.isVisible('p2', 12, 12)).toBe(true);
    expect(map.isVisible('p2', 2, 2)).toBe(false);
  });

  it('removing a source updates visible cells but leaves explored cells intact', () => {
    const map = new VisibilityMap(16, 16);

    map.setSource('p1', 'scout', { x: 4, y: 4, radius: 1 });
    map.update();
    expect(map.isVisible('p1', 5, 4)).toBe(true);

    map.removeSource('p1', 'scout');
    map.update();
    expect(map.isVisible('p1', 5, 4)).toBe(false);
    expect(map.isExplored('p1', 5, 4)).toBe(true);
  });

  it('round-trips state with sources and explored cells intact', () => {
    const map = new VisibilityMap(16, 16);

    map.setSource('p1', 'scout', { x: 6, y: 6, radius: 2 });
    map.update();
    map.setSource('p1', 'scout', { x: 9, y: 9, radius: 2 });
    map.update();

    const restored = VisibilityMap.fromState(map.getState());

    expect(restored.isVisible('p1', 9, 9)).toBe(true);
    expect(restored.isExplored('p1', 6, 6)).toBe(true);
    expect(restored.getSources('p1')).toEqual([
      ['scout', { x: 9, y: 9, radius: 2 }],
    ]);
  });
});
