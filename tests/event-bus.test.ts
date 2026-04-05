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

  it('removes listener with off', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('damage', listener);
    bus.off('damage', listener);
    bus.emit('damage', { target: 1, amount: 10 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('off with non-registered listener is a no-op', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    expect(() => bus.off('damage', listener)).not.toThrow();
  });

  it('pushes events to buffer on emit', () => {
    const bus = new EventBus<TestEvents>();
    bus.emit('damage', { target: 1, amount: 10 });
    bus.emit('heal', { target: 2, amount: 5 });
    const events = bus.getEvents();
    expect(events).toEqual([
      { type: 'damage', data: { target: 1, amount: 10 } },
      { type: 'heal', data: { target: 2, amount: 5 } },
    ]);
  });

  it('clear empties buffer but preserves listeners', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('damage', listener);
    bus.emit('damage', { target: 1, amount: 10 });
    bus.clear();

    expect(bus.getEvents()).toEqual([]);
    bus.emit('damage', { target: 2, amount: 20 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('getEvents returns empty array when no events emitted', () => {
    const bus = new EventBus<TestEvents>();
    expect(bus.getEvents()).toEqual([]);
  });
});
