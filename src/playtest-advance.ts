// Private synchronous boundary shared by configured runners/replay/forks.
import { EngineError } from './engine-error.js';
import { WorldTickFailureError } from './world.js';
import type { TickFailure } from './world.js';

interface AdvancingWorld {
  readonly tick: number;
  isPoisoned(): boolean;
  getLastTickFailure(): TickFailure | null;
}

function property(value: unknown, key: string): unknown {
  try { return (value as Record<string, unknown> | null)?.[key]; } catch { return undefined; }
}
function printable(value: unknown): string {
  try { return String(value); } catch { return '[unprintable thrown value]'; }
}
export function advanceErrorShape(value: unknown) {
  const name = property(value, 'name'), message = property(value, 'message');
  const stack = property(value, 'stack'), code = property(value, 'code');
  return { name: typeof name === 'string' ? name : 'Error',
    message: typeof message === 'string' ? message : printable(value),
    stack: typeof stack === 'string' ? stack : null, code: typeof code === 'string' ? code : null };
}
export function describeAdvanceError(value: unknown, fromTick: number, toTick: number) {
  return { fromTick, toTick, error: advanceErrorShape(value) };
}

/** Class identity alone is insufficient: foreign Worlds can supply the same class. */
export function isAdvanceTickFailure(value: unknown, world: AdvancingWorld, fromTick: number): boolean {
  // Foreign thrown values can make class/prototype or failure inspection throw.
  try {
    if (!(value instanceof WorldTickFailureError) || !world.isPoisoned() || world.tick !== fromTick + 1) return false;
    const live = world.getLastTickFailure();
    if (live?.tick !== world.tick) return false;
    return JSON.stringify(value.failure) === JSON.stringify(live);
  } catch { return false; }
}

/** Successful native attachment bypasses the caller's then property.
 * Both handlers return undefined so the observer child cannot adopt a rejected value.
 * Failure alone cannot distinguish a non-Promise from native constructor/species failure;
 * without a callable then, that invalid native return is outside detection/containment. */
function observeNativePromise(value: unknown): boolean {
  try { void Promise.prototype.then.call(value, () => undefined, () => undefined); return true; } catch { return false; }
}

export function advanceOneTick(world: AdvancingWorld, advance: () => void): void {
  const fromTick = world.tick;
  const returned: unknown = advance();
  if (returned !== null && (typeof returned === 'object' || typeof returned === 'function')) {
    const native = observeNativePromise(returned);
    // Successful native observation must not invoke an overridden caller getter.
    // Otherwise read once; a throwing candidate getter retains its original error.
    const then: unknown = native ? undefined : (returned as { then?: unknown }).then;
    if (native || typeof then === 'function') {
      let observationError: ReturnType<typeof advanceErrorShape> | null = null;
      if (!native) {
        try {
          const observed: unknown = (then as (this: unknown, resolve: () => void, reject: () => void) => unknown)
            .call(returned, () => undefined, () => undefined);
          // A hostile observer may itself return a rejected native Promise.
          observeNativePromise(observed);
        } catch (error) { observationError = advanceErrorShape(error); }
      }
      throw new EngineError('advance_async_unsupported',
        `advance returned asynchronous work from tick ${fromTick} to ${world.tick}; advance must synchronously complete exactly one World tick. Already scheduled work is not cancelled.`,
        { details: { fromTick, toTick: world.tick, expectedTick: fromTick + 1, observationError } });
    }
  }
  if (world.tick !== fromTick + 1) {
    throw new EngineError('advance_tick_delta',
      `advance moved World from tick ${fromTick} to ${world.tick}; synchronously advance exactly one tick to ${fromTick + 1}.`,
      { details: { fromTick, toTick: world.tick, expectedTick: fromTick + 1 } });
  }
  if (world.isPoisoned()) {
    const failure = world.getLastTickFailure();
    if (failure !== null) throw new WorldTickFailureError(failure);
    throw new EngineError('advance_world_poisoned', `advance left World poisoned at tick ${world.tick}; recover it before advancing again.`,
      { details: { fromTick, toTick: world.tick } });
  }
}
