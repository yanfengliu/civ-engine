import { describe, expect, it } from 'vitest';
import type { WorldSnapshotV5 } from '../src/serializer.js';
import { diffSnapshots } from '../src/snapshot-diff.js';

function emptySnapshot(tick: number): WorldSnapshotV5 {
  return {
    version: 5,
    config: { gridWidth: 8, gridHeight: 8, tps: 30 },
    tick,
    entities: { generations: [], alive: [], freeList: [] },
    components: {},
    resources: {
      registered: [],
      pools: {},
      production: {},
      consumption: {},
      transfers: [],
      nextTransferId: 0,
    },
    rng: { state: 0 },
    state: {},
    tags: {},
    metadata: {},
  };
}

describe('diffSnapshots', () => {
  describe('result shape', () => {
    it('returns a TickDiff with all slots present and empty for equal snapshots', () => {
      const a = emptySnapshot(5);
      const b = emptySnapshot(5);
      const d = diffSnapshots(a, b);
      expect(d.tick).toBe(5);
      expect(d.entities.created).toEqual([]);
      expect(d.entities.destroyed).toEqual([]);
      expect(d.components).toEqual({});
      expect(d.resources).toEqual({});
      expect(d.state.set).toEqual({});
      expect(d.state.removed).toEqual([]);
      expect(d.tags).toEqual([]);
      expect(d.metadata).toEqual([]);
    });

    it('result has no slot for excluded snapshot fields (config, rng, componentOptions, version)', () => {
      const a = emptySnapshot(0);
      const d = diffSnapshots(a, emptySnapshot(0));
      // TickDiff has no slot for these; verify by absence on the returned object.
      expect(Object.keys(d)).toEqual([
        'tick',
        'entities',
        'components',
        'resources',
        'state',
        'tags',
        'metadata',
      ]);
    });
  });

  describe('tick defaulting', () => {
    it('uses opts.tick when provided', () => {
      const a = emptySnapshot(1);
      const b = emptySnapshot(2);
      expect(diffSnapshots(a, b, { tick: 99 }).tick).toBe(99);
    });

    it('falls back to b.tick when opts is omitted', () => {
      const a = emptySnapshot(1);
      const b = emptySnapshot(7);
      expect(diffSnapshots(a, b).tick).toBe(7);
    });

    it('falls back to 0 when both opts.tick and b.tick are undefined', () => {
      const a = emptySnapshot(0);
      const b = emptySnapshot(0);
      delete (b as Partial<WorldSnapshotV5>).tick;
      expect(diffSnapshots(a, b).tick).toBe(0);
    });
  });

  describe('entities', () => {
    it('flags newly-alive entities as created', () => {
      const a = emptySnapshot(0);
      a.entities.alive = [false, false, false];
      a.entities.generations = [0, 0, 0];
      const b = emptySnapshot(1);
      b.entities.alive = [false, true, false];
      b.entities.generations = [0, 0, 0];
      const d = diffSnapshots(a, b);
      expect(d.entities.created).toEqual([1]);
      expect(d.entities.destroyed).toEqual([]);
    });

    it('flags no-longer-alive entities as destroyed', () => {
      const a = emptySnapshot(0);
      a.entities.alive = [false, true, true];
      const b = emptySnapshot(1);
      b.entities.alive = [false, true, false];
      const d = diffSnapshots(a, b);
      expect(d.entities.created).toEqual([]);
      expect(d.entities.destroyed).toEqual([2]);
    });

    it('handles arrays of differing lengths', () => {
      const a = emptySnapshot(0);
      a.entities.alive = [false, true];
      const b = emptySnapshot(1);
      b.entities.alive = [false, true, true, true];
      const d = diffSnapshots(a, b);
      expect(d.entities.created).toEqual([2, 3]);
      expect(d.entities.destroyed).toEqual([]);
    });

    it('flags entity recycling (same id alive in both, different generation) as both destroyed and created', () => {
      const a = emptySnapshot(0);
      a.entities.alive = [false, true, false];
      a.entities.generations = [0, 1, 0];
      const b = emptySnapshot(1);
      b.entities.alive = [false, true, false];
      b.entities.generations = [0, 2, 0];
      const d = diffSnapshots(a, b);
      // Generation bumped on entity 1 means it was destroyed and recreated.
      expect(d.entities.destroyed).toContain(1);
      expect(d.entities.created).toContain(1);
    });

    it('does not flag stable alive entities with unchanged generations', () => {
      const a = emptySnapshot(0);
      a.entities.alive = [false, true, false];
      a.entities.generations = [0, 5, 0];
      const b = emptySnapshot(1);
      b.entities.alive = [false, true, false];
      b.entities.generations = [0, 5, 0];
      const d = diffSnapshots(a, b);
      expect(d.entities.created).toEqual([]);
      expect(d.entities.destroyed).toEqual([]);
    });
  });

  describe('components', () => {
    it('flags new components as set', () => {
      const a = emptySnapshot(0);
      const b = emptySnapshot(1);
      b.components.position = [[1, { x: 0, y: 0 }]];
      const d = diffSnapshots(a, b);
      expect(d.components.position?.set).toEqual([[1, { x: 0, y: 0 }]]);
      expect(d.components.position?.removed ?? []).toEqual([]);
    });

    it('flags changed component values as set', () => {
      const a = emptySnapshot(0);
      a.components.position = [[1, { x: 0, y: 0 }]];
      const b = emptySnapshot(1);
      b.components.position = [[1, { x: 5, y: 7 }]];
      const d = diffSnapshots(a, b);
      expect(d.components.position?.set).toEqual([[1, { x: 5, y: 7 }]]);
    });

    it('does not include unchanged components in set', () => {
      const a = emptySnapshot(0);
      a.components.position = [[1, { x: 0, y: 0 }]];
      const b = emptySnapshot(1);
      b.components.position = [[1, { x: 0, y: 0 }]];
      const d = diffSnapshots(a, b);
      expect(d.components.position?.set ?? []).toEqual([]);
    });

    it('flags removed components', () => {
      const a = emptySnapshot(0);
      a.components.position = [[1, { x: 0, y: 0 }]];
      const b = emptySnapshot(1);
      b.components.position = [];
      const d = diffSnapshots(a, b);
      expect(d.components.position?.removed).toEqual([1]);
      expect(d.components.position?.set ?? []).toEqual([]);
    });

    it('handles an entirely new component type only present in b', () => {
      const a = emptySnapshot(0);
      const b = emptySnapshot(1);
      b.components.health = [[1, { hp: 10 }]];
      const d = diffSnapshots(a, b);
      expect(d.components.health?.set).toEqual([[1, { hp: 10 }]]);
    });

    it('handles a component type only present in a (all entities removed)', () => {
      const a = emptySnapshot(0);
      a.components.health = [[1, { hp: 10 }]];
      const b = emptySnapshot(1);
      const d = diffSnapshots(a, b);
      expect(d.components.health?.removed).toEqual([1]);
    });
  });

  describe('resources', () => {
    it('flags new resource pools as set', () => {
      const a = emptySnapshot(0);
      const b = emptySnapshot(1);
      b.resources.pools.gold = [[1, { current: 100, max: null }]];
      const d = diffSnapshots(a, b);
      expect(d.resources.gold?.set).toEqual([[1, { current: 100, max: null }]]);
    });

    it('flags removed resource pools', () => {
      const a = emptySnapshot(0);
      a.resources.pools.gold = [[1, { current: 100, max: null }]];
      const b = emptySnapshot(1);
      const d = diffSnapshots(a, b);
      expect(d.resources.gold?.removed).toEqual([1]);
    });

    it('flags changed pool values as set', () => {
      const a = emptySnapshot(0);
      a.resources.pools.gold = [[1, { current: 50, max: null }]];
      const b = emptySnapshot(1);
      b.resources.pools.gold = [[1, { current: 75, max: null }]];
      const d = diffSnapshots(a, b);
      expect(d.resources.gold?.set).toEqual([[1, { current: 75, max: null }]]);
    });
  });

  describe('state', () => {
    it('flags new state keys', () => {
      const a = emptySnapshot(0);
      const b = emptySnapshot(1);
      b.state = { tutorial: true };
      const d = diffSnapshots(a, b);
      expect(d.state.set).toEqual({ tutorial: true });
    });

    it('flags removed state keys', () => {
      const a = emptySnapshot(0);
      a.state = { tutorial: true };
      const b = emptySnapshot(1);
      const d = diffSnapshots(a, b);
      expect(d.state.removed).toEqual(['tutorial']);
    });

    it('flags changed values in set', () => {
      const a = emptySnapshot(0);
      a.state = { score: 10 };
      const b = emptySnapshot(1);
      b.state = { score: 20 };
      const d = diffSnapshots(a, b);
      expect(d.state.set).toEqual({ score: 20 });
    });
  });

  describe('tags', () => {
    it('flags new and changed tag sets per entity', () => {
      const a = emptySnapshot(0);
      a.tags = { 1: ['friendly'] };
      const b = emptySnapshot(1);
      b.tags = { 1: ['friendly', 'leader'], 2: ['enemy'] };
      const d = diffSnapshots(a, b);
      const byEntity = new Map(d.tags.map((e) => [e.entity, e.tags]));
      expect(byEntity.get(1)).toEqual(['friendly', 'leader']);
      expect(byEntity.get(2)).toEqual(['enemy']);
      expect(byEntity.size).toBe(2);
    });

    it('emits empty tag-list entries when an entity loses all tags', () => {
      const a = emptySnapshot(0);
      a.tags = { 1: ['friendly'] };
      const b = emptySnapshot(1);
      b.tags = {};
      const d = diffSnapshots(a, b);
      expect(d.tags).toEqual([{ entity: 1, tags: [] }]);
    });
  });

  describe('metadata', () => {
    it('flags new and changed metadata per entity', () => {
      const a = emptySnapshot(0);
      a.metadata = { 1: { name: 'alice' } };
      const b = emptySnapshot(1);
      b.metadata = { 1: { name: 'alice', age: 30 }, 2: { name: 'bob' } };
      const d = diffSnapshots(a, b);
      const byEntity = new Map(d.metadata.map((e) => [e.entity, e.meta]));
      expect(byEntity.get(1)).toEqual({ name: 'alice', age: 30 });
      expect(byEntity.get(2)).toEqual({ name: 'bob' });
    });

    it('emits empty metadata when an entity loses all metadata', () => {
      const a = emptySnapshot(0);
      a.metadata = { 1: { name: 'alice' } };
      const b = emptySnapshot(1);
      b.metadata = {};
      const d = diffSnapshots(a, b);
      expect(d.metadata).toEqual([{ entity: 1, meta: {} }]);
    });
  });

  describe('scope exclusions', () => {
    it('does not surface differences in WorldSnapshot.config (config is registration invariant)', () => {
      const a = emptySnapshot(5);
      a.config.gridWidth = 8;
      const b = emptySnapshot(5);
      b.config.gridWidth = 16;
      const d = diffSnapshots(a, b);
      // No slot exists for config differences. The result is empty across all TickDiff slots.
      expect(d.entities.created).toEqual([]);
      expect(d.components).toEqual({});
      expect(d.resources).toEqual({});
      expect(d.state.set).toEqual({});
      expect(d.tags).toEqual([]);
      expect(d.metadata).toEqual([]);
    });

    it('does not surface differences in WorldSnapshot.rng', () => {
      const a = emptySnapshot(5);
      a.rng.state = 100;
      const b = emptySnapshot(5);
      b.rng.state = 999;
      const d = diffSnapshots(a, b);
      expect(d.entities.created).toEqual([]);
      expect(d.components).toEqual({});
      expect(d.resources).toEqual({});
      expect(d.state.set).toEqual({});
    });

    it('does not surface differences in WorldSnapshot.componentOptions', () => {
      const a = emptySnapshot(5);
      a.componentOptions = { position: { diffMode: 'strict' } };
      const b = emptySnapshot(5);
      b.componentOptions = { position: { diffMode: 'semantic' } };
      const d = diffSnapshots(a, b);
      expect(d.components).toEqual({});
    });
  });
});
