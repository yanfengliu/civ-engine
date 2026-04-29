// Strict-mode error class, phase enum, and mutation-gate helper for `World`.
// Extracted from `src/world.ts` to avoid compounding the existing 2379-LOC overage
// per AGENTS.md 500-LOC review cap. See Spec 6 — `docs/threads/done/strict-mode/DESIGN.md`.

import type { JsonValue } from './json.js';

export type StrictModePhase = 'between-ticks' | 'after-failure';

export interface StrictModeViolationDetails {
  readonly [key: string]: JsonValue;
  readonly code: 'strict_mode_violation';
  readonly method: string;
  readonly phase: StrictModePhase;
  readonly advice: string;
}

export class StrictModeViolationError extends Error {
  readonly details: StrictModeViolationDetails;
  constructor(method: string, phase: StrictModePhase, advice: string) {
    super(`strict-mode violation: ${method} called during phase '${phase}'. ${advice}`);
    this.name = 'StrictModeViolationError';
    this.details = Object.freeze({
      code: 'strict_mode_violation' as const,
      method,
      phase,
      advice,
    }) satisfies StrictModeViolationDetails;
  }
}

/** The minimum surface `assertWritable` reads from a `World`. Decoupled from the
 *  full `World` import so this module stays import-graph-light. */
export interface StrictModeWorldView {
  readonly strict: boolean;
  readonly _inSetup: boolean;
  readonly _inTickPhase: boolean;
  readonly _maintenanceDepth: number;
  isPoisoned(): boolean;
}

/**
 * Throws `StrictModeViolationError` if `world.strict` is true and the world is
 * not currently inside any of the writable phases (system phase, setup window,
 * or `runMaintenance` callback). No-op when strict mode is off.
 *
 * Allocation only on the throw branch — the gate's hot path is three boolean
 * reads.
 */
export function assertWritable(world: StrictModeWorldView, method: string): void {
  if (!world.strict) return;
  if (world._inTickPhase || world._inSetup || world._maintenanceDepth > 0) return;
  const phase: StrictModePhase = world.isPoisoned() ? 'after-failure' : 'between-ticks';
  throw new StrictModeViolationError(method, phase, adviceFor(method));
}

/**
 * Method-specific guidance attached to `StrictModeViolationError.details.advice`.
 * Kept short to fit on one line in error logs and developer consoles.
 */
function adviceFor(method: string): string {
  // Most write methods share the same advice; specialize where helpful.
  if (method === 'random') {
    return 'random() advances RNG state and is determinism-critical; call it inside a system or wrap in world.runMaintenance(fn).';
  }
  if (method === 'emit') {
    return 'emit() must be called inside a system phase; events queue per-tick. Wrap out-of-tick test events in world.runMaintenance(fn).';
  }
  if (method.startsWith('register')) {
    // Should never fire because registration is not gated, but defensive.
    return 'registration is not gated by strict mode; if you saw this advice, please file a bug.';
  }
  return 'wrap mutations in world.runMaintenance(fn) or move them inside a registered system; setComponent/setState/etc. require a tick phase, setup window, or maintenance callback.';
}
