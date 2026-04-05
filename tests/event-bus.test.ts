import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/event-bus.js';

interface TestEvents {
  damage: { target: number; amount: number };
  heal: { target: number; amount: number };
}

describe('EventBus', () => {
  it('calls registered listener on emit', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('damage', listener);
    bus.emit('damage', { target: 1, amount: 10 });
    expect(listener).toHaveBeenCalledWith({ target: 1, amount: 10 });
  });

  it('calls multiple listeners on same event type', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('damage', a);
    bus.on('damage', b);
    bus.emit('damage', { target: 1, amount: 5 });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('does not call listeners for other event types', () => {
    const bus = new EventBus<TestEvents>();
    const damageListener = vi.fn();
    bus.on('damage', damageListener);
    bus.emit('heal', { target: 1, amount: 20 });
    expect(damageListener).not.toHaveBeenCalled();
  });

  it('handles emit with no listeners registered', () => {
    const bus = new EventBus<TestEvents>();
    expect(() => bus.emit('damage', { target: 1, amount: 10 })).not.toThrow();
  });
});
