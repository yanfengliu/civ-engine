import type { JsonValue } from './json.js';

/**
 * Hidden-slot declaration merge tracking the single payload-capturing recorder
 * attached to a `World`. Set by `SessionRecorder.connect()` or by
 * `WorldHistoryRecorder.connect()` when constructed with
 * `captureCommandPayloads: true`. Cleared on `disconnect()`. The mutex (one
 * payload-capturing recorder per world) reads this slot.
 *
 * Internal to civ-engine; user code MUST NOT touch it directly.
 */
declare module './world.js' {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface World<
    TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
    TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
    TComponents extends Record<string, unknown> = Record<string, unknown>,
    TState extends Record<string, unknown> = Record<string, unknown>,
  > {
    /**
     * Hidden slot tracking the single payload-capturing recorder attached to
     * this world. Internal to civ-engine; do not touch.
     */
    __payloadCapturingRecorder?: {
      sessionId: string;
      lastError: { message: string; details?: JsonValue } | null;
    };
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export {};
