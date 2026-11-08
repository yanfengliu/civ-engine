import { describe, expect, it } from 'vitest';
import { VisibilityMap, type VisionSource, type VisibilityMapState, type VisibilityMapMetrics } from '../src/visibility-map.js';

type Id = string | number;
type Player = { sources: Map<Id, VisionSource>; explored: Set<number>; visible: number[] };
const key = (id: Id) => `${typeof id === 'number' ? 'n' : 's'}:${id}`;
const ordered = (ids: Iterable<Id>) => [...ids].sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);

// An intentionally independent oracle: scan every cell against every source,
// rather than rasterizing each source's bounding box as the engine does.
class CellOracle {
  readonly players = new Map<Id, Player>();
  readonly dirty = new Set<Id>();
  readonly cells: number[];
  metrics: VisibilityMapMetrics = { recomputes: 0, computedCells: 0, visibilityQueries: 0 };
  constructor(readonly size: number) { this.cells = Array.from({ length: size * size }, (_, i) => i); }
  set(playerId: Id, sourceId: Id, source: VisionSource) {
    let player = this.players.get(playerId);
    if (!player) {
      player = { sources: new Map(), explored: new Set(), visible: [] };
      this.players.set(playerId, player);
    }
    const old = player.sources.get(sourceId);
    if (old?.x === source.x && old.y === source.y && old.radius === source.radius) return;
    player.sources.set(sourceId, { ...source });
    this.dirty.add(playerId);
  }
  remove(playerId: Id, sourceId: Id) {
    if (this.players.get(playerId)?.sources.delete(sourceId)) this.dirty.add(playerId);
  }
  clear(playerId: Id) { this.players.delete(playerId); this.dirty.delete(playerId); }
  flush() {
    for (const id of this.dirty) {
      const player = this.players.get(id)!;
      const sources = [...player.sources.values()];
      player.visible = this.cells.filter((cell) => sources.some((source) =>
        (cell % this.size - source.x) ** 2 + (Math.floor(cell / this.size) - source.y) ** 2 <= source.radius ** 2));
      for (const cell of player.visible) player.explored.add(cell);
      this.metrics.recomputes++;
      this.metrics.computedCells += player.visible.length;
    }
    this.dirty.clear();
  }
  state(): VisibilityMapState {
    this.flush();
    return { width: this.size, height: this.size, players: ordered(this.players.keys()).map((id) => {
      const player = this.players.get(id)!;
      return [id, {
        sources: ordered(player.sources.keys()).map((sourceId) => [sourceId, { ...player.sources.get(sourceId)! }]),
        explored: this.cells.filter((cell) => player.explored.has(cell)),
      }];
    }) };
  }
}

describe('visibility ordering cache behavior against independent cells', () => {
  it.each([1, 82719, 0xdeadbeef])('preserves batched state, sight and metrics through churn/load (seed %s)', (seed) => {
    let randomState = seed;
    const random = (limit: number) => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState % limit; };
    let map = new VisibilityMap(16, 16);
    const oracle = new CellOracle(16);
    const ids: Id[] = ['é', 10, 'B', 2, '2', 'a'];
    for (let batch = 0; batch < 60; batch++) {
      for (let operation = 0; operation < 5; operation++) {
        const player = ids[random(ids.length)];
        const sourceId = ids[random(ids.length)];
        const choice = random(10);
        if (choice === 0) { map.clearPlayer(player); oracle.clear(player); }
        else if (choice < 3) { map.removeSource(player, sourceId); oracle.remove(player, sourceId); }
        else {
          const source = { x: random(16), y: random(16), radius: random(9) / 2 };
          map.setSource(player, sourceId, source);
          oracle.set(player, sourceId, source);
        }
      }
      expect(map.getState(), `seed ${seed}, batch ${batch}`).toEqual(oracle.state());
      for (const [id, player] of oracle.players) {
        expect(map.getVisibleCells(id)).toEqual(player.visible.map((cell) => ({ x: cell % 16, y: Math.floor(cell / 16) })));
        expect(map.getExploredCells(id)).toEqual(oracle.cells.filter((cell) => player.explored.has(cell)).map((cell) => ({ x: cell % 16, y: Math.floor(cell / 16) })));
      }
      expect(map.getMetrics()).toEqual(oracle.metrics);
      if (batch === 19 || batch === 39) {
        map = VisibilityMap.fromState(map.getState());
        map.resetMetrics();
        oracle.metrics = { recomputes: 0, computedCells: 0, visibilityQueries: 0 };
      }
    }
  });
});
