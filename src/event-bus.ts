import { assertJsonCompatible } from './json.js';

export type Listener<T> = (event: T) => void;

export class EventBus<TEventMap extends Record<keyof TEventMap, unknown>> {
  private listeners = new Map<keyof TEventMap, Set<Listener<never>>>();
  private buffer: Array<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }> = [];

  emit<K extends keyof TEventMap>(type: K, data: TEventMap[K]): void {
    assertJsonCompatible(data, `event '${String(type)}'`);
    this.buffer.push({ type, data });
    const set = this.listeners.get(type);
    if (set) {
      for (const listener of set) {
        (listener as Listener<TEventMap[K]>)(data);
      }
    }
  }

  on<K extends keyof TEventMap>(
    type: K,
    listener: Listener<TEventMap[K]>,
  ): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as Listener<never>);
  }

  off<K extends keyof TEventMap>(
    type: K,
    listener: Listener<TEventMap[K]>,
  ): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener as Listener<never>);
    }
  }

  getEvents(): ReadonlyArray<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }> {
    return this.buffer.map((event) => ({
      type: event.type,
      data: structuredClone(event.data),
    }));
  }

  clear(): void {
    this.buffer.length = 0;
  }
}
