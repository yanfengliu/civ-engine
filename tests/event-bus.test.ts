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

  it('emit rejects non-JSON-compatible payloads', () => {
    interface Bad {
      bad: { fn: () => void };
    }
    const bus = new EventBus<Bad>();
    expect(() => bus.emit('bad', { fn: () => undefined } as never)).toThrow();
  });

  it('emit rejects circular payloads', () => {
    interface Circular {
      cir: Record<string, unknown>;
    }
    const bus = new EventBus<Circular>();
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    expect(() => bus.emit('cir', obj)).toThrow();
  });

  it('getEvents deep-clones each event payload', () => {
    const bus = new EventBus<TestEvents>();
    bus.emit('damage', { target: 1, amount: 10 });
    const events = bus.getEvents();
    (events[0].data as { amount: number }).amount = 999;
    const refetched = bus.getEvents();
    expect((refetched[0].data as { amount: number }).amount).toBe(10);
  });

  it('listener mutating payload does not corrupt buffered event (M1 iter-7)', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn((data: { target: number; amount: number }) => {
      data.amount = 999;
    });
    bus.on('damage', listener);
    bus.emit('damage', { target: 1, amount: 10 });
    const events = bus.getEvents();
    expect((events[0].data as { amount: number }).amount).toBe(10);
  });

  it('listener mutating payload does not affect later listeners (M1 iter-7)', () => {
    const bus = new EventBus<TestEvents>();
    const second = vi.fn();
    bus.on('damage', (data) => {
      data.amount = 999;
    });
    bus.on('damage', second);
    bus.emit('damage', { target: 1, amount: 10 });
    expect(second).toHaveBeenCalledWith({ target: 1, amount: 10 });
  });

  it('caller mutating payload after emit does not corrupt buffered event (M1 iter-7)', () => {
    const bus = new EventBus<TestEvents>();
    const payload = { target: 1, amount: 10 };
    bus.emit('damage', payload);
    payload.amount = 999;
    const events = bus.getEvents();
    expect((events[0].data as { amount: number }).amount).toBe(10);
  });
});
