// Existing behavior, not a new mutation API. Raw references are live; only
// successful explicit writes publish. These cases do not promise rollback.
import { describe, expect, it, vi } from 'vitest';
import { MemorySink, SessionRecorder, World } from '../src/index.js';

type Health = { hp: number };
const setup = (mode: 'strict' | 'semantic' = 'strict', positionKey = 'position') => {
  const world = new World({ gridWidth: 8, gridHeight: 8, tps: 10, positionKey });
  world.registerComponent<Health>('health', { diffMode: mode });
  world.registerComponent<{ x: number; y: number }>(positionKey);
  const id = world.createEntity();
  world.setComponent(id, 'health', { hp: 100 });
  world.setPosition(id, { x: 1, y: 2 });
  return { world, id };
};

describe('explicit component publication contract', () => {
  it.each(['strict', 'semantic'] as const)('a void callback preserves live identity and records same-pass publication (%s)', mode => {
    const { world, id } = setup(mode);
    const held = world.getComponent<Health>(id, 'health')!;
    const seen: number[] = [];
    world.registerSystem(active => {
      const result = active.patchComponent<Health>(id, 'health', current => {
        expect(current).toBe(held);
        current.hp -= 25;
        expect(active.getComponent(id, 'health')).toBe(held);
        expect(held.hp).toBe(75);
      });
      expect(result).toBe(held);
    });
    world.registerSystem(active => { seen.push(active.getComponent<Health>(id, 'health')!.hp); });
    const recorder = new SessionRecorder({ world, sink: new MemorySink() });
    recorder.connect();
    try {
      world.step();
      expect(seen).toEqual([75]);
      expect(world.getDiff()?.components.health.set).toEqual([[id, { hp: 75 }]]);
      expect(recorder.toBundle().ticks[0].diff.components.health.set).toEqual([[id, { hp: 75 }]]);
    } finally { recorder.disconnect(); }
  });

  it('returns and publishes a replacement without rewriting a previously held object', () => {
    const { world, id } = setup();
    const held = world.getComponent<Health>(id, 'health')!;
    const replacement = { hp: 40 };
    world.registerSystem(active => {
      expect(active.patchComponent<Health>(id, 'health', current => {
        expect(current).toBe(held);
        return replacement;
      })).toBe(replacement);
      expect(active.getComponent(id, 'health')).toBe(replacement);
    });
    world.step();
    expect(held).toEqual({ hp: 100 });
    expect(world.getDiff()?.components.health.set).toEqual([[id, { hp: 40 }]]);
  });

  it('nullish patch returns keep the current nullable component; explicit set can store null', () => {
    const { world, id } = setup();
    world.registerComponent<Health | null>('nullable');
    const held = { hp: 25 };
    world.setComponent<Health | null>(id, 'nullable', held);
    for (const result of [null, undefined]) {
      expect(world.patchComponent<Health | null>(id, 'nullable', current => {
        expect(current).toBe(held);
        return result;
      })).toBe(held);
      expect(world.getComponent(id, 'nullable')).toBe(held);
    }
    world.setComponent<Health | null>(id, 'nullable', null);
    expect(world.getComponent(id, 'nullable')).toBeNull();
    expect(world.patchComponent<Health | null>(id, 'nullable', current => {
      expect(current).toBeNull();
      return undefined;
    })).toBeNull();
    const replacement = { hp: 40 };
    expect(world.patchComponent<Health | null>(id, 'nullable', current => {
      expect(current).toBeNull();
      return replacement;
    })).toBe(replacement);
    expect(world.getComponent(id, 'nullable')).toBe(replacement);
  });

  it.each(['strict', 'semantic'] as const)('raw reference writes are visible but unannounced (%s)', mode => {
    const { world, id } = setup(mode);
    world.registerSystem(active => { active.getComponent<Health>(id, 'health')!.hp = 60; });
    world.step();
    expect(world.getComponent(id, 'health')).toEqual({ hp: 60 });
    expect(world.getDiff()?.components.health).toBeUndefined();
  });

  it('a raw mutation can ride an already-published live value without becoming its own write', () => {
    const { world, id } = setup();
    world.registerSystem(active => {
      active.setComponent(id, 'health', { hp: 80 });
      active.getComponent<Health>(id, 'health')!.hp = 60;
    });
    world.step();
    expect(world.getDiff()?.components.health.set).toEqual([[id, { hp: 60 }]]);
  });

  it.each(['position', 'location'])('patch/set synchronize the configured %s grid key before later systems', key => {
    const { world, id } = setup('strict', key);
    const held = world.getComponent<{ x: number; y: number }>(id, key)!;
    world.registerSystem(active => {
      expect(active.patchComponent<typeof held>(id, key, position => { position.x = 3; })).toBe(held);
      expect(active.grid.getAt(1, 2)?.has(id) ?? false).toBe(false);
      expect(active.grid.getAt(3, 2)?.has(id)).toBe(true);
      active.setComponent(id, key, { x: 4, y: 5 });
      expect(active.grid.getAt(3, 2)?.has(id) ?? false).toBe(false);
    });
    world.registerSystem(active => { expect(active.grid.getAt(4, 5)?.has(id)).toBe(true); });
    world.step();
    expect(world.getDiff()?.components[key].set).toEqual([[id, { x: 4, y: 5 }]]);
  });

  it('strict rejection occurs before invoking the callback', () => {
    const { world, id } = setup();
    const patch = vi.fn((value: Health) => { value.hp = 0; });
    world.endSetup();
    expect(() => world.patchComponent(id, 'health', patch)).toThrow(expect.objectContaining({ name: 'StrictModeViolationError' }));
    expect(patch).not.toHaveBeenCalled();
    expect(world.getComponent(id, 'health')).toEqual({ hp: 100 });
  });

  it('callback throws preserve identity and live mutations without publishing them', () => {
    const { world, id } = setup();
    const held = world.getComponent<Health>(id, 'health')!;
    const sentinel = Object.freeze({ failure: 'callback' });
    world.registerSystem(active => {
      let didThrow = false;
      try { active.patchComponent<Health>(id, 'health', value => { value.hp = 12; throw sentinel; }); }
      catch (error) { didThrow = true; expect(error).toBe(sentinel); }
      expect(didThrow).toBe(true);
      expect(active.getComponent(id, 'health')).toBe(held);
      expect(held.hp).toBe(12);
    });
    world.step();
    expect(world.getDiff()?.components.health).toBeUndefined();
  });

  it('JSON rejection does not undo callback mutations or publish them', () => {
    const { world, id } = setup();
    const held = world.getComponent<Health>(id, 'health')!;
    world.registerSystem(active => {
      expect(() => active.patchComponent<Health>(id, 'health', value => { value.hp = NaN; }))
        .toThrow(expect.objectContaining({ code: 'json_incompatible' }));
      expect(active.getComponent(id, 'health')).toBe(held);
      expect(held.hp).toBeNaN();
      // Repair the deliberately corrupt live fixture before diff/serialization.
      held.hp = 100;
    });
    world.step();
    expect(world.getDiff()?.components.health).toBeUndefined();
  });

  it('an invalid replacement leaves the stored value unchanged when the callback does not mutate it', () => {
    const { world, id } = setup();
    const held = world.getComponent<Health>(id, 'health')!;
    expect(() => world.patchComponent<Health>(id, 'health', () => ({ hp: NaN })))
      .toThrow(expect.objectContaining({ code: 'json_incompatible' }));
    expect(world.getComponent(id, 'health')).toBe(held);
    expect(held.hp).toBe(100);
  });

  it('a rejected position patch can leave its live object changed while the grid stays at its old cell', () => {
    const { world, id } = setup();
    expect(() => world.patchComponent<{ x: number; y: number }>(id, 'position', value => { value.x = 20; }))
      .toThrow();
    expect(world.getComponent(id, 'position')).toEqual({ x: 20, y: 2 });
    expect(world.grid.getAt(1, 2)?.has(id)).toBe(true);
  });
});
