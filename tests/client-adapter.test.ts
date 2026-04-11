import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';
import { ClientAdapter } from '../src/client-adapter.js';
import type { ServerMessage } from '../src/client-adapter.js';

type Events = { unitMoved: { id: number; x: number; y: number } };
type Commands = { move: { id: number; x: number; y: number } };

function setup() {
  const world = new World<Events, Commands>({
    gridWidth: 10,
    gridHeight: 10,
    tps: 10,
  });
  const messages: ServerMessage<Events>[] = [];
  const adapter = new ClientAdapter<Events, Commands>({
    world,
    send: (msg) => messages.push(msg),
  });
  return { world, messages, adapter };
}

describe('ClientAdapter', () => {
  it('connect() sends snapshot immediately', () => {
    const { adapter, messages, world } = setup();
    adapter.connect();
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('snapshot');
    expect(messages[0].protocolVersion).toBe(1);
    if (messages[0].type === 'snapshot') {
      expect(messages[0].data).toEqual(world.serialize());
    }
  });

  it('sends tick message with diff and events after each step', () => {
    const { adapter, messages, world } = setup();
    adapter.connect();
    messages.length = 0;

    world.step();
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('tick');
    if (messages[0].type === 'tick') {
      expect(messages[0].data.diff).toBeDefined();
      expect(messages[0].data.diff.tick).toBe(1);
      expect(messages[0].data.events).toEqual([]);
    }
  });

  it('multiple connect() calls do not duplicate listeners or snapshots', () => {
    const { adapter, messages, world } = setup();
    adapter.connect();
    adapter.connect();
    expect(messages).toHaveLength(1);

    messages.length = 0;
    world.step();
    expect(messages).toHaveLength(1);
  });

  it('disconnect() stops tick messages', () => {
    const { adapter, messages, world } = setup();
    adapter.connect();
    messages.length = 0;

    adapter.disconnect();
    world.step();
    expect(messages).toHaveLength(0);
  });

  it('disconnect() when not connected is a no-op', () => {
    const { adapter } = setup();
    expect(() => adapter.disconnect()).not.toThrow();
  });

  it('handleMessage with command calls world.submit() successfully', () => {
    const { adapter, messages, world } = setup();
    world.registerHandler('move', () => {});

    adapter.handleMessage({
      type: 'command',
      data: {
        id: 'cmd-1',
        commandType: 'move',
        payload: { id: 0, x: 1, y: 1 },
      },
    });

    expect(messages).toEqual([
      {
        protocolVersion: 1,
        type: 'commandAccepted',
        data: {
          id: 'cmd-1',
          commandType: 'move',
          code: 'accepted',
          message: 'Queued command',
        },
      },
    ]);
  });

  it('handleMessage with command sends commandRejected when validation fails', () => {
    const { adapter, messages, world } = setup();
    world.registerValidator('move', () => ({
      code: 'blocked_target',
      message: 'Cell is blocked',
      details: { x: 1, y: 1 },
    }));
    world.registerHandler('move', () => {});

    adapter.handleMessage({
      type: 'command',
      data: {
        id: 'cmd-42',
        commandType: 'move',
        payload: { id: 0, x: 1, y: 1 },
      },
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      protocolVersion: 1,
      type: 'commandRejected',
      data: {
        id: 'cmd-42',
        commandType: 'move',
        code: 'blocked_target',
        message: 'Cell is blocked',
        details: { x: 1, y: 1 },
        validatorIndex: 0,
      },
    });
  });

  it('rejects command when no handler is registered', () => {
    const { adapter, messages } = setup();

    adapter.handleMessage({
      type: 'command',
      data: {
        id: 'cmd-missing',
        commandType: 'move',
        payload: { id: 0, x: 1, y: 1 },
      },
    });

    expect(messages).toEqual([
      {
        protocolVersion: 1,
        type: 'commandRejected',
        data: {
          id: 'cmd-missing',
          commandType: 'move',
          code: 'missing_handler',
          message: "No handler registered for command 'move'",
          details: null,
          validatorIndex: null,
        },
      },
    ]);
  });

  it('ignores malformed messages', () => {
    const { adapter, messages } = setup();
    adapter.handleMessage(null);
    adapter.handleMessage({ type: 'command', data: { id: 'bad' } });
    expect(messages).toEqual([
      {
        protocolVersion: 1,
        type: 'commandRejected',
        data: {
          id: 'bad',
          commandType: null,
          code: 'malformed_command_type',
          message: 'Malformed command type',
          details: null,
          validatorIndex: null,
        },
      },
    ]);
  });

  it('disconnects and reports send failures', () => {
    const world = new World<Events, Commands>({
      gridWidth: 10,
      gridHeight: 10,
      tps: 10,
    });
    const errors: unknown[] = [];
    let shouldThrow = false;
    const messages: ServerMessage<Events>[] = [];
    const adapter = new ClientAdapter<Events, Commands>({
      world,
      send: (msg) => {
        if (shouldThrow) throw new Error('transport down');
        messages.push(msg);
      },
      onError: (error) => errors.push(error),
    });

    adapter.connect();
    shouldThrow = true;
    world.step();
    shouldThrow = false;
    world.step();

    expect(errors).toHaveLength(1);
    expect(messages).toHaveLength(1);
  });

  it('handleMessage with requestSnapshot sends a fresh snapshot', () => {
    const { adapter, messages, world } = setup();
    adapter.handleMessage({ type: 'requestSnapshot' });

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('snapshot');
    expect(messages[0].protocolVersion).toBe(1);
    if (messages[0].type === 'snapshot') {
      expect(messages[0].data).toEqual(world.serialize());
    }
  });

  it('tick message includes events emitted by systems', () => {
    const { adapter, messages, world } = setup();
    world.registerSystem((w) => {
      w.emit('unitMoved', { id: 1, x: 5, y: 5 });
    });
    adapter.connect();
    messages.length = 0;

    world.step();
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('tick');
    if (messages[0].type === 'tick') {
      expect(messages[0].data.events).toEqual([
        { type: 'unitMoved', data: { id: 1, x: 5, y: 5 } },
      ]);
    }
  });

  it('streams commandExecuted for queued client commands after the tick runs', () => {
    const { adapter, messages, world } = setup();
    world.registerHandler('move', () => {});
    adapter.connect();
    messages.length = 0;

    adapter.handleMessage({
      type: 'command',
      data: {
        id: 'cmd-exec',
        commandType: 'move',
        payload: { id: 0, x: 1, y: 1 },
      },
    });
    world.step();

    expect(messages).toEqual([
      {
        protocolVersion: 1,
        type: 'commandAccepted',
        data: {
          id: 'cmd-exec',
          commandType: 'move',
          code: 'accepted',
          message: 'Queued command',
        },
      },
      {
        protocolVersion: 1,
        type: 'commandExecuted',
        data: {
          id: 'cmd-exec',
          commandType: 'move',
          submissionSequence: 0,
          code: 'executed',
          message: 'Command handler completed',
          details: null,
          tick: 1,
        },
      },
      {
        protocolVersion: 1,
        type: 'tick',
        data: {
          diff: world.getDiff()!,
          events: [],
        },
      },
    ]);
  });

  it('streams commandFailed and tickFailed when a client command crashes during execution', () => {
    const { adapter, messages, world } = setup();
    world.registerHandler('move', () => {
      throw new Error('boom');
    });
    adapter.connect();
    messages.length = 0;

    adapter.handleMessage({
      type: 'command',
      data: {
        id: 'cmd-fail',
        commandType: 'move',
        payload: { id: 0, x: 1, y: 1 },
      },
    });

    const result = world.stepWithResult();
    expect(result.ok).toBe(false);

    expect(messages).toEqual([
      {
        protocolVersion: 1,
        type: 'commandAccepted',
        data: {
          id: 'cmd-fail',
          commandType: 'move',
          code: 'accepted',
          message: 'Queued command',
        },
      },
      {
        protocolVersion: 1,
        type: 'commandFailed',
        data: {
          id: 'cmd-fail',
          commandType: 'move',
          submissionSequence: 0,
          code: 'command_handler_threw',
          message: 'boom',
          details: {
            error: {
              name: 'Error',
              message: 'boom',
              stack: expect.any(String),
            },
          },
          tick: 1,
        },
      },
      {
        protocolVersion: 1,
        type: 'tickFailed',
        data: {
          schemaVersion: 1,
          tick: 1,
          phase: 'commands',
          code: 'command_handler_threw',
          message: 'boom',
          subsystem: 'commands',
          commandType: 'move',
          submissionSequence: 0,
          systemName: null,
          details: {
            commandType: 'move',
            submissionSequence: 0,
            error: {
              name: 'Error',
              message: 'boom',
              stack: expect.any(String),
            },
          },
          error: {
            name: 'Error',
            message: 'boom',
            stack: expect.any(String),
          },
        },
      },
    ]);
  });
});
