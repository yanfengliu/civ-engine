// Spec 5 / Step 10a — applyTickDiff helper tests.

import { describe, expect, it } from 'vitest';
import { diffSnapshots } from '../src/snapshot-diff.js';
import { applyTickDiff } from '../src/apply-tick-diff.js';
import type { TickDiff } from '../src/diff.js';
import type { WorldSnapshotV5 } from '../src/serializer.js';

function emptySnapshot(): WorldSnapshotV5 {
  return {
    version: 5,
    config: { gridWidth: 5, gridHeight: 5, tps: 60, positionKey: 'position' },
    tick: 0,
    entities: { alive: [], generations: [], freeList: [] },
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

function emptyDiff(tick = 1): TickDiff {
  return {
    tick,
    entities: { created: [], destroyed: [] },
    components: {},
    resources: {},
    state: { set: {}, removed: [] },
    tags: [],
    metadata: [],
  };
}

describe('applyTickDiff', () => {
  it('empty diff is a no-op (other than the tick field)', () => {
    const a = emptySnapshot();
    const result = applyTickDiff(a, emptyDiff(1)) as WorldSnapshotV5;
    expect(result.tick).toBe(1);
    expect(result.entities).toEqual(a.entities);
    expect(result.components).toEqual(a.components);
    expect(result.state).toEqual(a.state);
  });

  it('entity create extends alive[] and generations[] with the explicit id', () => {
    const a = emptySnapshot();
    const diff = emptyDiff();
    diff.entities.created = [0, 1, 2];
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.entities.alive).toEqual([true, true, true]);
    expect(result.entities.generations).toEqual([0, 0, 0]);
  });

  it('entity destroy bumps generation and pushes to freeList', () => {
    const a = emptySnapshot();
    a.entities = { alive: [true, true], generations: [0, 0], freeList: [] };
    const diff = emptyDiff();
    diff.entities.destroyed = [0];
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.entities.alive).toEqual([false, true]);
    expect(result.entities.generations).toEqual([1, 0]);
    expect(result.entities.freeList).toEqual([0]);
  });

  it('entity recycling (destroyed AND created same id) yields gen+1, alive=true', () => {
    const a = emptySnapshot();
    a.entities = { alive: [true], generations: [0], freeList: [] };
    const diff = emptyDiff();
    diff.entities.destroyed = [0];
    diff.entities.created = [0];
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.entities.alive).toEqual([true]);
    expect(result.entities.generations).toEqual([1]);
    expect(result.entities.freeList).toEqual([]); // popped during create
  });

  it('component set/removed applied wholesale per type', () => {
    const a = emptySnapshot();
    a.components = { health: [[0, 100]] as Array<[number, unknown]> };
    const diff = emptyDiff();
    diff.components = {
      health: { set: [[0, 50]], removed: [] },
      mana: { set: [[1, 30]], removed: [] },
    };
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.components.health).toEqual([[0, 50]]);
    expect(result.components.mana).toEqual([[1, 30]]);
  });

  it('component removed deletes the entry; empty type-map gets removed', () => {
    const a = emptySnapshot();
    a.components = { health: [[0, 100]] as Array<[number, unknown]> };
    const diff = emptyDiff();
    diff.components = { health: { set: [], removed: [0] } };
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.components.health).toBeUndefined();
  });

  it('state set/removed applied', () => {
    const a = emptySnapshot();
    a.state = { foo: 1, bar: 'x' };
    const diff = emptyDiff();
    diff.state = { set: { foo: 2, baz: 3 }, removed: ['bar'] };
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.state).toEqual({ foo: 2, baz: 3 });
  });

  it('tags wholesale replacement; empty array deletes the entry', () => {
    const a = emptySnapshot();
    a.tags = { 0: ['hostile'], 1: ['friendly'] };
    const diff = emptyDiff();
    diff.tags = [
      { entity: 0, tags: ['neutral'] },
      { entity: 1, tags: [] }, // empty → delete
    ];
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.tags[0]).toEqual(['neutral']);
    expect(result.tags[1]).toBeUndefined();
  });

  it('metadata wholesale replacement; empty object deletes the entry', () => {
    const a = emptySnapshot();
    a.metadata = { 0: { hp: 100 }, 1: { hp: 50 } };
    const diff = emptyDiff();
    diff.metadata = [
      { entity: 0, meta: { hp: 200, mp: 30 } },
      { entity: 1, meta: {} }, // empty → delete
    ];
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.metadata[0]).toEqual({ hp: 200, mp: 30 });
    expect(result.metadata[1]).toBeUndefined();
  });

  it('round-trip property: diffSnapshots(applyTickDiff(a, d), b) is empty when d = diffSnapshots(a, b)', () => {
    const a = emptySnapshot();
    a.entities = { alive: [true, true], generations: [0, 0], freeList: [] };
    a.components = { health: [[0, 100]] as Array<[number, unknown]> };
    a.state = { foo: 1 };
    a.tags = { 0: ['hostile'] };

    const b = emptySnapshot();
    b.tick = 1;
    b.entities = { alive: [false, true, true], generations: [1, 0, 0], freeList: [0] };
    b.components = { health: [[1, 80], [2, 50]] as Array<[number, unknown]> };
    b.state = { foo: 2, bar: 'new' };
    b.tags = { 1: ['friendly'] };

    const d = diffSnapshots(a, b, { tick: 1 });
    const folded = applyTickDiff(a, d) as WorldSnapshotV5;

    // Round-trip: re-diff folded → b. Should be empty deltas.
    const reverseDiff = diffSnapshots(folded, b, { tick: 1 });
    expect(reverseDiff.entities.created).toEqual([]);
    expect(reverseDiff.entities.destroyed).toEqual([]);
    expect(Object.keys(reverseDiff.components)).toEqual([]);
    expect(Object.keys(reverseDiff.resources)).toEqual([]);
    expect(reverseDiff.state.set).toEqual({});
    expect(reverseDiff.state.removed).toEqual([]);
    expect(reverseDiff.tags).toEqual([]);
    expect(reverseDiff.metadata).toEqual([]);
  });

  it('rng / componentOptions / config pass through unchanged', () => {
    const a = emptySnapshot();
    a.rng = { state: 12345 };
    a.componentOptions = { health: {} };
    const diff = emptyDiff();
    const result = applyTickDiff(a, diff) as WorldSnapshotV5;
    expect(result.rng).toEqual({ state: 12345 });
    expect(result.componentOptions).toEqual({ health: {} });
    expect(result.config).toEqual(a.config);
  });
});
