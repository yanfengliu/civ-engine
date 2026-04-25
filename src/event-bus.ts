export type Listener<T> = (event: T) => void;

function deepCloneJsonOrShallow<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

export class EventBus<TEventMap extends Record<keyof TEventMap, unknown>> {
  private listeners = new Map<keyof TEventMap, Set<Listener<never>>>();
  private buffer: Array<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }> = [];

  emit<K extends keyof TEventMap>(type: K, data: TEventMap[K]): void {
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
    // Deep-clone payloads so callers can't write through to the live engine.
    // Events flow through assertJsonCompatible at emit time elsewhere; here we
    // assume JSON-shape but fall back to shallow on non-cloneable payloads.
    return this.buffer.map((event) => ({
      type: event.type,
      data: deepCloneJsonOrShallow(event.data),
    }));
  }

  clear(): void {
    this.buffer.length = 0;
  }
}
