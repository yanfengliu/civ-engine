import { describe, expect, it } from 'vitest';
import { VisibilityMap, type VisionSource, type VisionSourceId, type VisibilityPlayerId } from '../src/visibility-map.js';

type Player = { sources: Map<VisionSourceId, VisionSource>; visible: Set<number>; explored: Set<number> };
const key = (id: string | number) => typeof id === 'number' ? 'n:' + id : 's:' + id;
const compare = (a: string | number, b: string | number) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
const sortedSources = (player: Player) => [...player.sources].sort(([a], [b]) => compare(a, b));
const positions = (indices: Set<number>) => [...indices].sort((a, b) => a - b).map(cell => ({ x: cell % 8, y: Math.floor(cell / 8) }));

describe('VisibilityMap independent final-source oracle', () => {
  it.each([19, 313, 8009])('matches full-cell scans and old metrics through seed%s lifecycle batches', (seed) => {
    const operationCounts = Array<number>(8).fill(0);
    let random = seed;
    const next = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random >>> 8; };
    const playerIds = [1, 'p', 'é'];
    const sourceIds = [0, 'a', 2, 'Ω'];
    const players = new Map<VisibilityPlayerId, Player>();
    const dirty = new Set<VisibilityPlayerId>();
    let metrics = { recomputes: 0, computedCells: 0, visibilityQueries: 0 };
    let map = new VisibilityMap(8, 8);
    const set = (p: VisibilityPlayerId, id: VisionSourceId, source: VisionSource) => {
      map.setSource(p, id, source);
      let player = players.get(p);
      if (!player) { player = { sources: new Map(), visible: new Set(), explored: new Set() }; players.set(p, player); }
      const old = player.sources.get(id);
      if (old && old.x === source.x && old.y === source.y && old.radius === source.radius) return;
      player.sources.set(id, { ...source }); dirty.add(p);
    };
    const flush = () => {
      for (const id of dirty) {
        const player = players.get(id)!;
        const visible = new Set<number>();
        // Independent oracle: visit every map cell, never the source bounding boxes.
        for (let index = 0; index < 64; index++) {
          const x = index % 8, y = Math.floor(index / 8);
          if ([...player.sources.values()].some(source => (x - source.x) ** 2 + (y - source.y) ** 2 <= source.radius ** 2)) visible.add(index);
        }
        player.visible = visible;
        for (const cell of visible) player.explored.add(cell);
        metrics.recomputes++; metrics.computedCells += visible.size;
      }
      dirty.clear();
    };
    const state = () => ({ width: 8, height: 8, players: [...players.keys()].sort(compare).map(id => {
      const player = players.get(id)!;
      return [id, { sources: sortedSources(player), explored: [...player.explored].sort((a, b) => a - b) }];
    }) });
    const check = () => {
      flush(); expect(map.getState()).toEqual(state());
      for (const [id, player] of players) {
        expect(map.getVisibleCells(id)).toEqual(positions(player.visible));
        expect(map.getExploredCells(id)).toEqual(positions(player.explored));
        expect(map.getSources(id)).toEqual(sortedSources(player));
        expect(map.isVisible(id, 0, 0)).toBe(player.visible.has(0));
        expect(map.isExplored(id, 7, 7)).toBe(player.explored.has(63));
        metrics.visibilityQueries += 2;
      }
      expect(map.getMetrics()).toEqual(metrics);
    };
    for (let step = 0; step < 120; step++) {
      const p = playerIds[next() % playerIds.length], id = sourceIds[next() % sourceIds.length];
      const op = next() % 8;
      operationCounts[op]++;
      const source = { x: (next() % 15) / 2, y: (next() % 15) / 2, radius: [0, 0.5, 1, 2, 3][next() % 5] };
      if (op <= 2) set(p, id, source);
      if (op === 3) { map.removeSource(p, id); if (players.get(p)?.sources.delete(id)) dirty.add(p); }
      if (op === 4) { map.clearPlayer(p); players.delete(p); dirty.delete(p); }
      if (op === 5) {
        const previous = players.get(p)?.sources.get(id);
        set(p, id, source);
        if (previous) set(p, id, previous);
        else { map.removeSource(p, id); players.get(p)!.sources.delete(id); dirty.add(p); }
      }
      if (op === 6) { map.resetMetrics(); metrics = { recomputes: 0, computedCells: 0, visibilityQueries: 0 }; }
      if (op === 7) { if (players.has(p) && dirty.has(p)) flush(); expect(map.getSources(p)).toEqual(players.has(p) ? sortedSources(players.get(p)!) : []); }
      if (step % 3 === 0) check();
      if (step % 17 === 0) {
        check(); map = VisibilityMap.fromState(map.getState());
        metrics = { recomputes: 0, computedCells: 0, visibilityQueries: 0 };
        for (const player of players.keys()) dirty.add(player);
        flush(); expect(map.getMetrics()).toEqual(metrics);
      }
    }
    check();
    expect(operationCounts.every(count => count > 0)).toBe(true);
  });

  it('preserves fractional duplicate-load merges, extra fields and existing explored cells', () => {
    const source = Object.assign({ x: 0.5, y: 0.5, radius: 1 }, { extra: 'retained' });
    const map = VisibilityMap.fromState({ width: 8, height: 8, players: [
      ['p', { sources: [['a', { x: 6, y: 6, radius: 0 }]], explored: [63] }],
      ['p', { sources: [['a', source]], explored: [0, 63] }],
    ] });
    expect(map.getState().players).toEqual([['p', { sources: [['a', source]], explored: [0, 1, 8, 9, 63] }]]);
    expect(map.getMetrics()).toEqual({ recomputes: 1, computedCells: 4, visibilityQueries: 0 });
    source.x = 7;
    expect(map.getSources('p')[0][1].x).toBe(0.5);
    map.setSource('p', 'a', { x: 0.5, y: 0.5, radius: 1 });
    expect(map.getSources('p')[0][1]).toHaveProperty('extra', 'retained');
    map.setSource('p', 'a', { x: 1.5, y: 0.5, radius: 1 });
    expect(map.getSources('p')[0][1]).not.toHaveProperty('extra');
  });
});
