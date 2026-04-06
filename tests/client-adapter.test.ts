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
});
