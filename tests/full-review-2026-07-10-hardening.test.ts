import { describe, expect, it } from 'vitest';
import { World } from '../src/world.js';
import { VisibilityMap } from '../src/visibility-map.js';
import { SessionRecorder } from '../src/session-recorder.js';
import { MemorySink } from '../src/session-sink.js';
import { compareMetricsResults, type NumericDelta } from '../src/behavioral-metrics.js';

// Regression tests for the 2026-07-10 full-review hardening batch (LOW findings
// that touch behaviour). See docs/threads/*/full/2026-07-10/1/REVIEW.md.

const cfg = () => ({ gridWidth: 8, gridHeight: 8, tps: 60 });

describe('full-review 2026-07-10 hardening', () => {
  // L1 — fail fast on reentrant stepping instead of silently corrupting the tick.
  it('L1: rejects reentrant stepping from within a tick (tick_reentrancy)', () => {
    const world = new World<Record<string, never>, { move: Record<string, never> }>(cfg());
    world.registerHandler('move', () => { world.step(); }); // handler re-enters the tick
    world.submit('move', {});
    const result = world.stepWithResult();
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.failure)).toMatch(/tick_reentrancy/);
    // The reentrancy is surfaced, not silently applied.
  });

  // L2 — a connect() that throws after claiming the mutex slot must not orphan it.
  it('L2: releases the single-recorder slot when connect() fails after claiming it', () => {
    const world = new World<Record<string, never>, { move: Record<string, never> }>(cfg());
    const realManifest = world.getRegistrationManifest.bind(world);
    let boom = true;
    (world as unknown as { getRegistrationManifest: () => unknown }).getRegistrationManifest = () => {
      if (boom) throw new Error('manifest boom');
      return realManifest();
    };
    const rec1 = new SessionRecorder({ world, sink: new MemorySink() });
    expect(() => rec1.connect()).toThrow('manifest boom');
    rec1.disconnect(); // playtest runners always disconnect in a finally block
    boom = false;
    // The slot must be free again: a fresh payload-capturing recorder can attach.
    const rec2 = new SessionRecorder({ world, sink: new MemorySink() });
    expect(() => rec2.connect()).not.toThrow();
    rec2.disconnect();
  });

  // L5 — getByTag ordering must be serialize/fork round-trip stable (id-sorted).
  it('L5: getByTag returns ascending-id order, stable across serialize round-trip', () => {
    const world = new World(cfg());
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) ids.push(world.createEntity());
    for (const i of [3, 1, 4, 0, 2]) world.addTag(ids[i], 'unit'); // shuffled tag order
    const live = [...world.getByTag('unit')];
    expect(live).toEqual([...live].sort((a, b) => a - b)); // ascending id, not insertion order
    const restored = World.deserialize(world.serialize());
    expect([...restored.getByTag('unit')]).toEqual(live); // identical order after round-trip
  });

  // L8 — VisibilityMap.getState canonical ordering must be code-unit (deterministic
  // across ICU/V8), not locale-dependent localeCompare.
  it('L8: VisibilityMap.getState orders keys by code-unit, not locale', () => {
    const vm = new VisibilityMap(8, 8);
    // 'B' (0x42) precedes 'a' (0x61) by code unit; localeCompare(en) would put 'a' first.
    vm.setSource('a', 's1', { x: 0, y: 0, radius: 1 });
    vm.setSource('B', 's1', { x: 1, y: 1, radius: 1 });
    const order = vm.getState().players.map(([id]) => id);
    expect(order).toEqual(['B', 'a']);
  });

  // L7 — 0→N growth must stay distinguishable from a no-baseline case after a
  // JSON round-trip (the ±Infinity → null collision the fix removes).
  it('L7: compareMetricsResults keeps 0→N growth distinct from no-baseline through JSON', () => {
    const grew = JSON.parse(JSON.stringify(compareMetricsResults({ x: 0 }, { x: 5 }).x)) as NumericDelta;
    const noBaseline = JSON.parse(JSON.stringify(compareMetricsResults({ x: null }, { x: 5 }).x)) as NumericDelta;
    expect(grew.pctChange).toBeNull();
    expect(noBaseline.pctChange).toBeNull();
    expect(grew).not.toEqual(noBaseline); // baseline (0 vs null) + delta (5 vs null) distinguish them
    expect(grew.baseline).toBe(0);
    expect(grew.delta).toBe(5);
  });
});
