import { describe, it, expect, vi } from 'vitest';
import { World, WorldTickFailureError } from '../src/world.js';

describe('World commands', () => {
  it('submit with no validators queues and returns true', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerHandler('move', () => {});
    const result = world.submit('move', { x: 1, y: 2 });
    expect(result).toBe(true);
  });

  it('submit with passing validator queues and returns true', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', (data) => data.x >= 0 && data.y >= 0);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: 1, y: 2 })).toBe(true);
  });

  it('submit with failing validator rejects and returns false', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', (data) => data.x >= 0 && data.y >= 0);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: -1, y: 2 })).toBe(false);
  });

  it('submitWithResult returns a structured accepted outcome', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerHandler('move', () => {});

    expect(world.submitWithResult('move', { x: 1, y: 2 })).toEqual({
      schemaVersion: 1,
      accepted: true,
      commandType: 'move',
      code: 'accepted',
      message: 'Queued command',
      details: null,
      tick: 0,
      sequence: 0,
      validatorIndex: null,
    });
  });

  it('structured validator rejections preserve code, message, and details', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', (data) => {
      if (data.x >= 0 && data.y >= 0) return true;
      return {
        code: 'out_of_bounds_target',
        message: 'Move target must stay inside the positive quadrant',
        details: {
          target: { x: data.x, y: data.y },
        },
      };
    });
    world.registerHandler('move', () => {});

    expect(world.submitWithResult('move', { x: -1, y: 2 })).toEqual({
      schemaVersion: 1,
      accepted: false,
      commandType: 'move',
      code: 'out_of_bounds_target',
      message: 'Move target must stay inside the positive quadrant',
      details: {
        target: { x: -1, y: 2 },
      },
      tick: 0,
      sequence: 0,
      validatorIndex: 0,
    });
  });

  it('emits structured command results to listeners', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const results: unknown[] = [];
    world.registerValidator('move', () => false);
    world.registerHandler('move', () => {});
    world.onCommandResult((result) => results.push(result));

    world.submitWithResult('move', { x: 1, y: 2 });

    expect(results).toEqual([
      {
        schemaVersion: 1,
        accepted: false,
        commandType: 'move',
        code: 'validation_failed',
        message: 'Validation failed',
        details: null,
        tick: 0,
        sequence: 0,
        validatorIndex: 0,
      },
    ]);
  });

  it('emits structured command execution results after handlers run', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const executions: unknown[] = [];
    world.registerHandler('move', () => {});
    world.onCommandExecution((result) => executions.push(result));

    const submission = world.submitWithResult('move', { x: 1, y: 2 });
    world.step();

    expect(executions).toEqual([
      {
        schemaVersion: 1,
        submissionSequence: submission.sequence,
        executed: true,
        commandType: 'move',
        code: 'executed',
        message: 'Command handler completed',
        details: null,
        tick: 1,
      },
    ]);
  });

  it('minimal-mode submit uses a boolean fast path when no command-result listeners are attached', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'minimal',
    });
    world.registerHandler('move', () => {});
    const createResultSpy = vi.spyOn(
      world as unknown as { createCommandSubmissionResult: () => unknown },
      'createCommandSubmissionResult',
    );

    expect(world.submit('move', { x: 1, y: 2 })).toBe(true);
    expect(createResultSpy).not.toHaveBeenCalled();
    expect(world.submitWithResult('move', { x: 2, y: 3 }).sequence).toBe(0);
  });

  it('release-mode submit uses a boolean fast path when no command-result listeners are attached', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'release',
    });
    world.registerHandler('move', () => {});
    const createResultSpy = vi.spyOn(
      world as unknown as { createCommandSubmissionResult: () => unknown },
      'createCommandSubmissionResult',
    );

    expect(world.submit('move', { x: 1, y: 2 })).toBe(true);
    expect(createResultSpy).not.toHaveBeenCalled();
    expect(world.submitWithResult('move', { x: 2, y: 3 }).sequence).toBe(0);
  });

  it('release-mode submit still emits structured results when listeners are attached', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'release',
    });
    const results: unknown[] = [];
    world.registerHandler('move', () => {});
    world.onCommandResult((result) => results.push(result));

    expect(world.submit('move', { x: 1, y: 2 })).toBe(true);
    expect(results).toEqual([
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
  });

  it('release-mode skips command execution result allocation when nothing is listening', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'release',
    });
    world.registerHandler('move', () => {});
    const createExecutionSpy = vi.spyOn(
      world as unknown as { createCommandExecutionResult: () => unknown },
      'createCommandExecutionResult',
    );

    world.submit('move', { x: 1, y: 2 });
    world.step();

    expect(createExecutionSpy).not.toHaveBeenCalled();
  });

  it('all validators must pass for submit to accept', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerValidator('move', () => true);
    world.registerValidator('move', () => false);
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: 1, y: 2 })).toBe(false);
  });

  it('handler runs on step and receives correct data', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const received: Array<{ x: number; y: number }> = [];
    world.registerHandler('move', (data) => received.push(data));
    world.submit('move', { x: 3, y: 4 });
    world.step();
    expect(received).toEqual([{ x: 3, y: 4 }]);
  });

  it('handler can emit events and modify components', () => {
    type Events = { moved: { entityId: number } };
    type Cmds = { move: { entityId: number; x: number; y: number } };
    const world = new World<Events, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerComponent<{ x: number; y: number }>('position');
    const id = world.createEntity();
    world.addComponent(id, 'position', { x: 0, y: 0 });

    world.registerHandler('move', (data, w) => {
      const pos = w.getComponent<{ x: number; y: number }>(
        data.entityId,
        'position',
      )!;
      pos.x = data.x;
      pos.y = data.y;
      w.emit('moved', { entityId: data.entityId });
    });

    world.submit('move', { entityId: id, x: 5, y: 5 });
    world.step();

    expect(world.getComponent(id, 'position')).toEqual({ x: 5, y: 5 });
    expect(world.getEvents()).toEqual([
      { type: 'moved', data: { entityId: id } },
    ]);
  });

  it('throws when registering duplicate handler', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerHandler('move', () => {});
    expect(() => world.registerHandler('move', () => {})).toThrow(
      "Handler already registered for command 'move'",
    );
  });

  it('throws when no handler registered at drain time', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.submit('move', { x: 1 });
    expect(() => world.step()).toThrow(WorldTickFailureError);
  });

  it('stepWithResult returns structured failure instead of throwing', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const submission = world.submitWithResult('move', { x: 1 });

    const result = world.stepWithResult();

    expect(result.ok).toBe(false);
    expect(result.failure).toMatchObject({
      schemaVersion: 1,
      tick: 1,
      phase: 'commands',
      code: 'missing_handler',
      message: "No handler registered for command 'move'",
      subsystem: 'commands',
      commandType: 'move',
      submissionSequence: submission.sequence,
    });
    expect(world.getLastTickFailure()).toEqual(result.failure);
  });

  it('commands submitted by a system during tick are processed next tick', () => {
    type Cmds = { ping: { n: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const handled: number[] = [];
    world.registerHandler('ping', (data) => handled.push(data.n));

    // System submits a command during its tick
    world.registerSystem((w) => {
      if (w.tick === 0) {
        w.submit('ping', { n: 42 });
      }
    });

    world.step(); // tick 0: system submits, but drain already happened
    expect(handled).toEqual([]);

    world.step(); // tick 1: command from previous tick is processed
    expect(handled).toEqual([42]);
  });

  it('commands drain before spatial sync so handler position changes appear in grid', () => {
    type Cmds = { spawn: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerComponent<{ x: number; y: number }>('position');

    let spawnedId: number | undefined;
    world.registerHandler('spawn', (data, w) => {
      spawnedId = w.createEntity();
      w.addComponent(spawnedId, 'position', { x: data.x, y: data.y });
    });

    // System checks grid — entity should be there because spatial sync
    // runs after processCommands
    let foundInGrid = false;
    world.registerSystem((w) => {
      if (spawnedId !== undefined) {
        const cell = w.grid.getAt(3, 4);
        foundInGrid = cell !== null && cell.has(spawnedId);
      }
    });

    world.submit('spawn', { x: 3, y: 4 });
    world.step();

    expect(spawnedId).toBeDefined();
    expect(foundInGrid).toBe(true);
  });
});
