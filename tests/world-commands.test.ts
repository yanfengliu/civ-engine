import { describe, it, expect, vi, afterEach } from 'vitest';
import { World, WorldTickFailureError } from '../src/world.js';

describe('World commands', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('minimal-mode submit still assigns a sequence and queues with submissionSequence', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'minimal',
    });
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: 1, y: 2 })).toBe(true);
    // sequence 0 was consumed by submit(); the next submitWithResult sees 1
    expect(world.submitWithResult('move', { x: 2, y: 3 }).sequence).toBe(1);
  });

  it('release-mode submit still assigns a sequence and queues with submissionSequence', () => {
    type Cmds = { move: { x: number; y: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'release',
    });
    world.registerHandler('move', () => {});
    expect(world.submit('move', { x: 1, y: 2 })).toBe(true);
    expect(world.submitWithResult('move', { x: 2, y: 3 }).sequence).toBe(1);
  });

  it('submit() populates submissionSequence on queued commands so executions are correlatable', () => {
    type Cmds = { move: { n: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
      instrumentationProfile: 'release',
    });
    world.registerHandler('move', () => {});

    const seenSequences: Array<number | null> = [];
    world.onCommandExecution((result) => {
      seenSequences.push(result.submissionSequence);
    });

    world.submit('move', { n: 1 });
    world.submit('move', { n: 2 });
    world.step();

    expect(seenSequences).toEqual([0, 1]);
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

  it('processCommands emits tick_aborted_before_handler executions for commands after a failure', () => {
    type Cmds = { move: { n: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.registerHandler('move', (data) => {
      if (data.n === 2) throw new Error('boom');
    });

    const executions: unknown[] = [];
    world.onCommandExecution((result) => executions.push(result));

    const a = world.submitWithResult('move', { n: 1 });
    const b = world.submitWithResult('move', { n: 2 });
    const c = world.submitWithResult('move', { n: 3 });
    const d = world.submitWithResult('move', { n: 4 });

    const result = world.stepWithResult();
    expect(result.ok).toBe(false);

    expect(executions).toEqual([
      expect.objectContaining({
        submissionSequence: a.sequence,
        executed: true,
        code: 'executed',
      }),
      expect.objectContaining({
        submissionSequence: b.sequence,
        executed: false,
        code: 'command_handler_threw',
      }),
      expect.objectContaining({
        submissionSequence: c.sequence,
        executed: false,
        code: 'tick_aborted_before_handler',
      }),
      expect.objectContaining({
        submissionSequence: d.sequence,
        executed: false,
        code: 'tick_aborted_before_handler',
      }),
    ]);

    const failure = result.failure!;
    const droppedSequences = (failure.details as {
      droppedCommands: Array<{ submissionSequence: number | null }>;
    } | null)?.droppedCommands?.map((cmd) => cmd.submissionSequence);
    expect(droppedSequences).toEqual([c.sequence, d.sequence]);
  });

  it('recover() also clears lastTickFailure and currentDiff (CR3)', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 4,
      gridHeight: 4,
      tps: 60,
    });
    world.submit('move', { x: 1 });
    expect(() => world.step()).toThrow(WorldTickFailureError);
    expect(world.getLastTickFailure()).not.toBeNull();
    world.recover();
    expect(world.getLastTickFailure()).toBeNull();
    expect(world.getDiff()).toBeNull();
  });

  it('failed tick consumes a tick number; next successful tick uses a distinct one (H_NEW2)', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 4,
      gridHeight: 4,
      tps: 60,
    });
    world.submit('move', { x: 1 });
    expect(() => world.step()).toThrow(WorldTickFailureError);
    const failedTick = world.tick;
    expect(failedTick).toBe(1);

    world.registerHandler('move', () => {});
    world.recover();
    world.step();
    expect(world.tick).toBe(2);
  });

  it('marks world as poisoned after a tick failure; step() refuses until recover()', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.submit('move', { x: 1 });

    expect(world.isPoisoned()).toBe(false);
    expect(() => world.step()).toThrow(WorldTickFailureError);
    expect(world.isPoisoned()).toBe(true);

    expect(() => world.step()).toThrow(/poisoned/i);

    world.registerHandler('move', () => {});
    world.recover();
    expect(world.isPoisoned()).toBe(false);
    expect(() => world.step()).not.toThrow();
  });

  it('stepWithResult on a poisoned world returns world_poisoned without re-running', () => {
    type Cmds = { move: { x: number } };
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    world.submit('move', { x: 1 });
    const first = world.stepWithResult();
    expect(first.ok).toBe(false);
    expect(world.isPoisoned()).toBe(true);

    const second = world.stepWithResult();
    expect(second.ok).toBe(false);
    expect(second.failure?.code).toBe('world_poisoned');
  });

  it('diff listeners observe world.tick aligned with diff.tick', () => {
    type Events = Record<string, never>;
    type Cmds = Record<string, never>;
    const world = new World<Events, Cmds>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 60,
    });
    const observed: Array<{ worldTick: number; diffTick: number }> = [];
    world.onDiff((diff) => {
      observed.push({ worldTick: world.tick, diffTick: diff.tick });
    });

    world.step();
    world.step();
    world.step();

    expect(observed).toEqual([
      { worldTick: 1, diffTick: 1 },
      { worldTick: 2, diffTick: 2 },
      { worldTick: 3, diffTick: 3 },
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

  describe('listener exception isolation', () => {
    it('a throwing commandExecutionListener does not leak through processCommands', () => {
      type Cmds = { ping: null };
      const world = new World<Record<string, never>, Cmds>({
        gridWidth: 10,
        gridHeight: 10,
        tps: 60,
      });
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      world.registerHandler('ping', () => {});
      world.onCommandExecution(() => {
        throw new Error('listener bug');
      });
      world.submit('ping', null);

      expect(() => world.step()).not.toThrow();
      expect(world.isPoisoned()).toBe(false);
      expect(world.tick).toBe(1);
      expect(errSpy).toHaveBeenCalled();
    });

    it('a throwing tickFailureListener does not replace the original failure', () => {
      type Cmds = { boom: null };
      const world = new World<Record<string, never>, Cmds>({
        gridWidth: 10,
        gridHeight: 10,
        tps: 60,
      });
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      world.registerHandler('boom', () => {
        throw new Error('handler exploded');
      });
      world.onTickFailure(() => {
        throw new Error('tick-failure listener bug');
      });
      world.submit('boom', null);

      expect(() => world.step()).toThrow(WorldTickFailureError);
      expect(world.isPoisoned()).toBe(true);
      expect(world.getLastTickFailure()?.code).toBe('command_handler_threw');
      expect(errSpy).toHaveBeenCalled();
    });
  });

  describe('poisoned-world contract', () => {
    it('submit on a poisoned world warns but still queues', () => {
      type Cmds = { boom: null; ping: null };
      const world = new World<Record<string, never>, Cmds>({
        gridWidth: 10,
        gridHeight: 10,
        tps: 60,
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      world.registerHandler('boom', () => {
        throw new Error('explode');
      });
      world.registerHandler('ping', () => {});
      world.submit('boom', null);
      expect(() => world.step()).toThrow(WorldTickFailureError);
      expect(world.isPoisoned()).toBe(true);

      expect(world.submit('ping', null)).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('serialize on a poisoned world warns but still returns a snapshot', () => {
      type Cmds = { boom: null };
      const world = new World<Record<string, never>, Cmds>({
        gridWidth: 10,
        gridHeight: 10,
        tps: 60,
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      world.registerHandler('boom', () => {
        throw new Error('explode');
      });
      world.submit('boom', null);
      expect(() => world.step()).toThrow(WorldTickFailureError);

      const snapshot = world.serialize();
      expect(snapshot.version).toBe(5);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
