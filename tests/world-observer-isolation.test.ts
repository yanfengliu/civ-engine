import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';
import type { TickDiff } from '../src/diff.js';

// Full-review 2026-06-10 M4: onDiff listeners previously received the live
// internal TickDiff with write-through references into component/state
// stores. They now receive a per-listener defensive copy, matching
// getDiff()'s documented contract and the EventBus per-listener clones.
describe('onDiff listener isolation', () => {
  const mkWorld = () => {
    const w = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    w.registerComponent<{ v: number }>('c');
    return w;
  };

  it('mutating the diff inside a listener does not corrupt component state', () => {
    const world = mkWorld();
    const e = world.createEntity();
    world.registerSystem((w) => {
      w.setComponent(e, 'c', { v: 1 });
    });
    let captured: TickDiff | null = null;
    world.onDiff((d) => {
      captured = d;
      const set = d.components['c']?.set;
      if (set && set.length > 0) {
        (set[0][1] as { v: number }).v = 999;
      }
      d.state.set['injected'] = true;
    });
    world.step();
    expect(world.getComponent<{ v: number }>(e, 'c')).toEqual({ v: 1 });
    expect(world.getState('injected')).toBeUndefined();
    expect(captured).not.toBeNull();
  });

  it('each listener receives its own copy (no cross-listener coupling)', () => {
    const world = mkWorld();
    const e = world.createEntity();
    world.registerSystem((w) => {
      w.setComponent(e, 'c', { v: 1 });
    });
    const seen: number[] = [];
    world.onDiff((d) => {
      const set = d.components['c']?.set;
      if (set && set.length > 0) (set[0][1] as { v: number }).v = 777;
    });
    world.onDiff((d) => {
      const set = d.components['c']?.set;
      if (set && set.length > 0) seen.push((set[0][1] as { v: number }).v);
    });
    world.step();
    expect(seen).toEqual([1]);
  });
});
