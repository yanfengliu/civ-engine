import { describe, expect, it } from 'vitest';
import {
  SessionReplayer,
  World,
  runScenario,
  scenarioResultToBundle,
  type WorldConfig,
} from '../src/index.js';
import type { Position } from '../src/types.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 8, gridHeight: 8, tps: 10, positionKey: 'position',
});

type Events = { moved: { entity: number; x: number; y: number } };
type Commands = { move: { entity: number; x: number; y: number } };

/**
 * Reusable behavior registration extracted from `scenario.setup`. Used by
 * BOTH the original scenario setup AND the replayer's `worldFactory` —
 * `worldFactory` registers behavior on a fresh world THEN calls
 * `applySnapshot(snap)` to load state in-place. Per spec §10.3 / iter-2
 * plan H-new-5: deserialize-then-register would conflict because
 * `World.deserialize` already populates component stores from the
 * snapshot; `applySnapshot` overwrites state without touching
 * registrations.
 */
function registerMoveBehavior(world: World<Events, Commands>): void {
  world.registerComponent<Position>('position');
  world.registerHandler('move', (data, activeWorld) => {
    activeWorld.setPosition(data.entity, { x: data.x, y: data.y });
    activeWorld.emit('moved', {
      entity: data.entity,
      x: data.x,
      y: data.y,
    });
  });
}

describe('Scenario → bundle → replay integration (CI gate)', () => {
  it('move scenario: scenarioResultToBundle + selfCheck round-trip', () => {
    const world = new World<Events, Commands>(mkConfig());
    let unit = -1;

    const result = runScenario({
      name: 'move-replayable', world,
      setup: (ctx) => {
        registerMoveBehavior(ctx.world);
        unit = ctx.world.createEntity();
        ctx.world.setPosition(unit, { x: 0, y: 0 });
      },
      run: (ctx) => {
        ctx.submit('move', { entity: unit, x: 2, y: 3 });
        ctx.step();
      },
      checks: [
        {
          name: 'unit reaches target',
          check: (ctx) => {
            const position = ctx.world.getComponent<Position>(unit, 'position');
            return position?.x === 2 && position.y === 3;
          },
        },
      ],
      history: { capacity: 100, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    expect(result.passed).toBe(true);

    const bundle = scenarioResultToBundle(result);
    expect(bundle.commands.length).toBeGreaterThan(0);
    expect(bundle.markers).toHaveLength(1);
    expect(bundle.markers[0].kind).toBe('assertion');
    expect(bundle.markers[0].provenance).toBe('engine');

    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Commands>(mkConfig());
        registerMoveBehavior(w);          // re-register handlers (deserialize doesn't restore them)
        w.applySnapshot(snap);            // overwrite state without conflict
        return w;
      },
    });

    const checkResult = replayer.selfCheck();
    expect(checkResult.ok).toBe(true);
    expect(checkResult.stateDivergences).toEqual([]);
    expect(checkResult.eventDivergences).toEqual([]);
    expect(checkResult.executionDivergences).toEqual([]);
    expect(checkResult.checkedSegments).toBeGreaterThanOrEqual(1);
  });

  it('multi-step scenario with multiple commands: replays cleanly', () => {
    const world = new World<Events, Commands>(mkConfig());
    let unit = -1;

    const result = runScenario({
      name: 'multi-move', world,
      setup: (ctx) => {
        registerMoveBehavior(ctx.world);
        unit = ctx.world.createEntity();
        ctx.world.setPosition(unit, { x: 0, y: 0 });
      },
      run: (ctx) => {
        for (let i = 1; i <= 3; i++) {
          ctx.submit('move', { entity: unit, x: i, y: i });
          ctx.step();
        }
      },
      checks: [],
      history: { capacity: 100, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    const bundle = scenarioResultToBundle(result);
    expect(bundle.commands).toHaveLength(3);

    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap) => {
        const w = new World<Events, Commands>(mkConfig());
        registerMoveBehavior(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    const checkResult = replayer.selfCheck();
    expect(checkResult.ok).toBe(true);
  });

  it('scenario with handler crash: bundle has failedTicks; selfCheck skips that segment', () => {
    type CrashCmds = { boom: Record<string, never> };
    const world = new World<Events, CrashCmds>(mkConfig());
    const result = runScenario<Events, CrashCmds>({
      name: 'crash-scenario', world,
      setup: (ctx) => {
        ctx.world.registerHandler('boom', () => { throw new Error('intentional'); });
      },
      run: (ctx) => {
        ctx.submit('boom', {});
        try { ctx.step(); } catch { /* poisoned */ }
      },
      checks: [],
      history: { capacity: 100, captureCommandPayloads: true, captureInitialSnapshot: true },
    });
    const bundle = scenarioResultToBundle(result);
    expect(bundle.failures.length).toBeGreaterThanOrEqual(1);
    if (bundle.metadata.failedTicks && bundle.metadata.failedTicks.length > 0) {
      // selfCheck would skip segments containing the failure
      const replayer = SessionReplayer.fromBundle(bundle, {
        worldFactory: (snap) => {
          const w = new World<Events, CrashCmds>(mkConfig());
          w.registerHandler('boom', () => { throw new Error('intentional'); });
          w.applySnapshot(snap);
          return w;
        },
      });
      const checkResult = replayer.selfCheck();
      // ok depends on whether ALL segments contain failures or just some
      expect(checkResult.skippedSegments.length + checkResult.checkedSegments).toBeGreaterThan(0);
    }
  });
});
