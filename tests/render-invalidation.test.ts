import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';
import { RenderAdapter, type RenderEntityChange, type RenderServerMessage } from '../src/render-adapter.js';
import type { TickDiff } from '../src/diff.js';

function fixture(count = 3, filter = true) {
  const world = new World({ gridWidth: 128, gridHeight: 128, tps: 10 });
  world.registerComponent<{ value: number }>('value');
  const ids = Array.from({ length: count }, () => world.createEntity());
  const views = new Map(ids.map((id) => [id, id]));
  const calls: number[] = [];
  const changes: Array<RenderEntityChange | null> = [];
  const messages: RenderServerMessage<number>[] = [];
  const diffs: TickDiff[] = [];
  let duringProject: ((id: number) => void) | undefined;
  let duringSend: (() => void) | undefined;
  const adapter = new RenderAdapter({
    world,
    projector: {
      projectEntity: (ref, _world, change) => {
        calls.push(ref.id);
        changes.push(change);
        duringProject?.(ref.id);
        return views.get(ref.id) ?? null;
      },
      shouldProjectChange: () => filter,
    },
    send: (message) => { messages.push(message); duringSend?.(); },
  });
  adapter.connect();
  calls.length = changes.length = messages.length = 0;
  world.onDiff((diff) => diffs.push(diff));
  const tick = () => {
    world.step();
    const message = messages.at(-1)!;
    if (message.type !== 'renderTick') throw new Error('Expected render tick');
    return message.data.render;
  };
  return {
    world, ids, views, calls, changes, messages, diffs, adapter, tick,
    onProject: (fn: (id: number) => void) => { duringProject = fn; },
    onSend: (fn: () => void) => { duringSend = fn; },
  };
}

describe('RenderAdapter explicit invalidation', () => {
  it('queues selected views without advancing or changing authoritative state and diffs', () => {
    const f = fixture();
    const before = f.world.serialize();
    f.views.set(1, 99);
    f.adapter.invalidate([1]);
    expect(f.world.serialize()).toEqual(before);
    expect(f.calls).toEqual([]);
    expect(f.messages).toEqual([]);
    expect(f.tick()).toEqual({ tick: 1, created: [], destroyed: [], frame: null,
      updated: [{ ref: { id: 1, generation: 0 }, view: 99 }] });
    expect(f.calls).toEqual([1]);
    expect(f.diffs[0].components).toEqual({});
    expect(f.diffs[0].entities).toEqual({ created: [], destroyed: [] });
    expect(f.changes[0]).toEqual({ id: 1, created: false, destroyed: false,
      componentKeys: [], resourceKeys: [], previousRef: { id: 1, generation: 0 },
      currentRef: { id: 1, generation: 0 } });
    expect(f.tick().updated).toEqual([]);
    expect(f.calls).toEqual([1]);
  });

  it('coalesces iterable duplicates, merges normal writes and uses numeric ordering', () => {
    const f = fixture(12);
    f.world.registerSystem((w) => {
      w.setComponent(2, 'value', { value: 8 });
      f.adapter.invalidate([10, 2, 10]);
    });
    f.adapter.invalidate(new Set([10, 1]));
    expect(f.tick().updated.map((entity) => entity.ref.id)).toEqual([1, 2, 10]);
    expect(f.calls).toEqual([1, 2, 10]);
    expect(f.changes[1]?.componentKeys).toEqual(['value']);
  });

  it('bypasses the ordinary change filter only for explicitly invalidated entities', () => {
    const f = fixture(3, false);
    f.world.registerSystem((w) => {
      w.setComponent(0, 'value', { value: 1 });
      w.setComponent(1, 'value', { value: 1 });
    });
    f.adapter.invalidate([1]);
    expect(f.tick().updated.map((entity) => entity.ref.id)).toEqual([1]);
    expect(f.calls).toEqual([1]);
  });

  it('publishes hide and reveal without destroying the simulation entity', () => {
    const f = fixture();
    f.views.delete(1);
    f.adapter.invalidate([1]);
    expect(f.tick().destroyed).toEqual([{ id: 1, generation: 0 }]);
    expect(f.world.isAlive(1)).toBe(true);
    f.views.set(1, 50);
    f.adapter.invalidate([1]);
    expect(f.tick().created).toEqual([{ ref: { id: 1, generation: 0 }, view: 50 }]);
  });

  it('ignores empty and dead IDs', () => {
    const f = fixture();
    f.adapter.invalidate([]);
    f.adapter.invalidate([-1, 500, Number.NaN, Number.POSITIVE_INFINITY]);
    expect(f.tick().updated).toEqual([]);
    expect(f.calls).toEqual([]);
  });

  it('merges invalidation with creation and destruction in the same tick', () => {
    const f = fixture();
    f.adapter.invalidate([1]);
    f.world.registerSystem((w) => {
      const created = w.createEntity();
      f.views.set(created, 70);
      f.adapter.invalidate([created]);
      w.destroyEntity(1);
    });
    const result = f.tick();
    expect(result.created).toEqual([{ ref: { id: 3, generation: 0 }, view: 70 }]);
    expect(result.destroyed).toEqual([{ id: 1, generation: 0 }]);
    expect(result.updated).toEqual([]);
    expect(f.calls).toEqual([3]);
  });

  it('retains generation-aware replacement semantics for recycled IDs', () => {
    const f = fixture();
    f.adapter.invalidate([1]);
    f.world.registerSystem((w) => {
      w.destroyEntity(1);
      expect(w.createEntity()).toBe(1);
      f.views.set(1, 80);
    });
    const result = f.tick();
    expect(result.destroyed).toEqual([{ id: 1, generation: 0 }]);
    expect(result.created).toEqual([{ ref: { id: 1, generation: 1 }, view: 80 }]);
    expect(result.updated).toEqual([]);
    expect(f.calls).toEqual([1]);
  });

  it('preserves requests from projection and send callbacks for the next tick', () => {
    const f = fixture();
    f.onProject((id) => { if (id === 0) f.adapter.invalidate([1]); });
    let sent = false;
    f.onSend(() => { if (!sent) { sent = true; f.adapter.invalidate([2]); } });
    f.adapter.invalidate([0]);
    expect(f.tick().updated.map((entity) => entity.ref.id)).toEqual([0]);
    expect(f.tick().updated.map((entity) => entity.ref.id)).toEqual([1, 2]);
    expect(f.tick().updated).toEqual([]);
    expect(f.calls).toEqual([0, 1, 2]);
  });

  it('does not transfer a pending invalidation to an identity recycled between ticks', () => {
    const f = fixture(3, false);
    f.world.step();
    f.adapter.invalidate([1]);
    f.world.runMaintenance(() => {
      f.world.destroyEntity(1);
      expect(f.world.createEntity()).toBe(1);
    });
    // Maintenance changes are not tick diffs: old queued presentation work must
    // not silently force projection of a different generation on the next tick.
    expect(f.tick().updated).toEqual([]);
    expect(f.tick().created).toEqual([]);
    expect(f.calls).toEqual([]);
  });

  it('clears requests on disconnect and ignores disconnected invalidation', () => {
    const f = fixture();
    f.adapter.invalidate([1]);
    f.adapter.disconnect();
    f.adapter.invalidate([2]);
    f.views.set(1, 88);
    f.adapter.connect();
    expect(f.messages.at(-1)?.type).toBe('renderSnapshot');
    expect(f.calls).toEqual([0, 1, 2]);
    f.calls.length = 0;
    expect(f.tick().updated).toEqual([]);
    expect(f.calls).toEqual([]);
  });

  it('preserves requests made during the initial snapshot', () => {
    const f = fixture();
    f.adapter.disconnect();
    f.onProject((id) => { if (id === 0) f.adapter.invalidate([1]); });
    f.adapter.connect();
    f.calls.length = 0;
    expect(f.tick().updated.map((entity) => entity.ref.id)).toEqual([1]);
    expect(f.calls).toEqual([1]);
  });

  it('projects one changed unit among 10000 entities and matches a fresh full projection', () => {
    const f = fixture(10_000);
    f.views.set(123, 999);
    f.adapter.invalidate([123]);
    const render = f.tick();
    expect(f.calls).toEqual([123]);
    expect(render.created).toEqual([]);
    expect(render.destroyed).toEqual([]);
    expect(render.updated).toEqual([{ ref: { id: 123, generation: 0 }, view: 999 }]);
    const projected = new Map(f.ids.map((id) => [id, id]));
    for (const entity of render.updated) projected.set(entity.ref.id, entity.view);
    f.adapter.disconnect();
    f.calls.length = 0;
    f.adapter.connect();
    expect(f.calls).toHaveLength(10_000);
    const snapshot = f.messages.at(-1)!;
    if (snapshot.type !== 'renderSnapshot') throw new Error('Expected snapshot');
    expect([...projected]).toEqual(snapshot.data.render.entities.map((entity) => [entity.ref.id, entity.view]));
  });
});
