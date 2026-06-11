// Public configuration + result types for `SessionReplayer`. Extracted from
// `src/session-replayer.ts` (registration-manifest objective; LOC budget).
// Re-exported from there so import paths and the `index.ts` named block are
// unchanged.

import type { WorldSnapshot } from './serializer.js';
import type { CommandExecutionResult, World } from './world.js';

export interface ReplayerConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  /**
   * Constructs a paused `World` from a snapshot. Per ADR 4 (spec §15),
   * this factory is part of the determinism contract: it must reproduce
   * the recording-time component / handler / validator / system
   * registration, in the same order, and apply the snapshot in-place
   * (e.g. `World.applySnapshot`) to avoid `registerComponent` /
   * `registerHandler` duplicate-throws.
   */
  worldFactory: (snapshot: WorldSnapshot) => World<TEventMap, TCommandMap>;
  /**
   * Skip the registration-manifest verification performed on every factory
   * construction (registration-manifest objective). For deliberately
   * instrumented replay (extra observer systems, debug components). Voids
   * the fail-fast factory-drift diagnostic; selfCheck remains the backstop.
   */
  skipRegistrationCheck?: boolean;
}

export interface SelfCheckOptions {
  stopOnFirstDivergence?: boolean;     // default false
  checkState?: boolean;                // default true
  checkEvents?: boolean;               // default true
  checkExecutions?: boolean;           // default true
}

export interface StateDivergence {
  fromTick: number;
  toTick: number;
  expected: WorldSnapshot;
  actual: WorldSnapshot;
  firstDifferingPath?: string;
}

export interface EventDivergence {
  tick: number;
  expected: Array<{ type: PropertyKey; data: unknown }>;
  actual: Array<{ type: PropertyKey; data: unknown }>;
}

export interface ExecutionDivergence {
  tick: number;
  expected: CommandExecutionResult[];
  actual: CommandExecutionResult[];
}

export interface SkippedSegment {
  fromTick: number;
  toTick: number;
  reason: 'failure_in_segment';
}

export interface SelfCheckResult {
  ok: boolean;
  checkedSegments: number;
  stateDivergences: StateDivergence[];
  eventDivergences: EventDivergence[];
  executionDivergences: ExecutionDivergence[];
  skippedSegments: SkippedSegment[];
}

export interface MarkerValidationResult {
  ok: boolean;
  invalidMarkers: Array<{ markerId: string; reason: string }>;
}
