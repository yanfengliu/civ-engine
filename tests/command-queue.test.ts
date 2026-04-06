import { describe, it, expect } from 'vitest';
import { CommandQueue } from '../src/command-queue.js';

type TestCommands = {
  move: { x: number; y: number };
  attack: { targetId: number };
};

describe('CommandQueue', () => {
  it('returns commands in submission order on drain', () => {
    const queue = new CommandQueue<TestCommands>();
    queue.push('move', { x: 1, y: 2 });
    queue.push('attack', { targetId: 5 });
    const commands = queue.drain();
    expect(commands).toEqual([
      { type: 'move', data: { x: 1, y: 2 } },
      { type: 'attack', data: { targetId: 5 } },
    ]);
  });

  it('clears the buffer after drain', () => {
    const queue = new CommandQueue<TestCommands>();
    queue.push('move', { x: 0, y: 0 });
    queue.drain();
    expect(queue.drain()).toEqual([]);
  });

  it('reports pending count', () => {
    const queue = new CommandQueue<TestCommands>();
    expect(queue.pending).toBe(0);
    queue.push('move', { x: 0, y: 0 });
    expect(queue.pending).toBe(1);
    queue.push('attack', { targetId: 1 });
    expect(queue.pending).toBe(2);
  });

  it('returns empty array when draining empty queue', () => {
    const queue = new CommandQueue<TestCommands>();
    expect(queue.drain()).toEqual([]);
  });
});
