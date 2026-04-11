import { describe, expect, it } from 'vitest';
import { runScenario } from '../src/scenario-runner.js';
import { World } from '../src/world.js';
import type { Position } from '../src/types.js';

type Events = { moved: { entity: number; x: number; y: number } };
type Commands = { move: { entity: number; x: number; y: number } };

function createWorld(): World<Events, Commands> {
  return new World<Events, Commands>({
    gridWidth: 8,
    gridHeight: 8,
    tps: 10,
    detectInPlacePositionMutations: false,
  });
}

describe('runScenario', () => {
  it('captures post-setup baseline, command outcomes, and final state', () => {
    const world = createWorld();
    let unit = -1;

    const result = runScenario({
      name: 'move-unit',
      world,
      setup: (ctx) => {
        ctx.world.registerComponent<Position>('position');
        unit = ctx.world.createEntity();
        ctx.world.setPosition(unit, { x: 0, y: 0 });
        ctx.world.registerHandler('move', (data, activeWorld) => {
          activeWorld.setPosition(data.entity, { x: data.x, y: data.y });
          activeWorld.emit('moved', {
            entity: data.entity,
            x: data.x,
            y: data.y,
          });
        });
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
            return position?.x === 2 && position.y === 3
              ? true
              : ctx.fail('unit_not_at_target', 'Unit did not reach target', {
                  position: position
                    ? { x: position.x, y: position.y }
                    : null,
                });
          },
        },
      ],
    });

    expect(result.passed).toBe(true);
    expect(result.failure).toBeNull();
    expect(result.schemaVersion).toBe(1);
    expect(result.history.schemaVersion).toBe(1);
    expect(result.checks).toEqual([
      {
        name: 'unit reaches target',
        passed: true,
        failure: null,
      },
    ]);
    expect(result.history.initialSnapshot?.tick).toBe(0);
    expect(result.history.initialSnapshot?.components.position).toEqual([
      [unit, { x: 0, y: 0 }],
    ]);
    expect(result.history.commands).toEqual([
      {
        schemaVersion: 1,
        accepted: true,
        commandType: 'move',
        code: 'accepted',
        message: 'Queued command',
        details: null,
        tick: 0,
        sequence: 0,
        validatorIndex: null,
      },
    ]);
    expect(result.history.ticks).toHaveLength(1);
    expect(result.history.ticks[0].tick).toBe(1);
    expect(result.events).toEqual([
      { type: 'moved', data: { entity: unit, x: 2, y: 3 } },
    ]);
    expect(result.snapshot.tick).toBe(1);
  });

  it('returns a structured failure when stepUntil times out', () => {
    const world = createWorld();

    const result = runScenario({
      name: 'stuck-unit',
      world,
      setup: (ctx) => {
        ctx.world.registerComponent<Position>('position');
        const unit = ctx.world.createEntity();
        ctx.world.setPosition(unit, { x: 0, y: 0 });
        ctx.world.registerHandler('move', () => {});
      },
      run: (ctx) =>
        ctx.stepUntil(() => false, {
          maxTicks: 2,
          code: 'unit_never_arrived',
          message: 'Unit never reached destination',
          details: { target: { x: 5, y: 5 } },
        }).failure,
    });

    expect(result.passed).toBe(false);
    expect(result.failure).toEqual({
      code: 'unit_never_arrived',
      message: 'Unit never reached destination',
      source: 'stepUntil',
      details: {
        maxTicks: 2,
        tick: 2,
        details: { target: { x: 5, y: 5 } },
      },
    });
    expect(result.history.ticks).toHaveLength(2);
    expect(result.tick).toBe(2);
  });

  it('reports structured check failures without converting them into runner failures', () => {
    const world = createWorld();

    const result = runScenario({
      name: 'check-failure',
      world,
      setup: (ctx) => {
        ctx.world.registerComponent<Position>('position');
        const unit = ctx.world.createEntity();
        ctx.world.setPosition(unit, { x: 1, y: 1 });
        ctx.world.registerHandler('move', () => {});
      },
      checks: [
        {
          name: 'position is origin',
          check: (ctx) =>
            ctx.fail(
              'unit_not_at_origin',
              'Expected unit to stay at origin',
              { tick: ctx.world.tick },
            ),
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.failure).toBeNull();
    expect(result.checks).toEqual([
      {
        name: 'position is origin',
        passed: false,
        failure: {
          code: 'unit_not_at_origin',
          message: 'Expected unit to stay at origin',
          source: 'check',
          details: { tick: 0 },
        },
      },
    ]);
  });
});
