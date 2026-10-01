// Public configuration + result types for `SessionReplayer`. Extracted from
// `src/session-replayer.ts` (registration-manifest objective; LOC budget).
// Re-exported from there so import paths and the `index.ts` named block are
// unchanged.

import type { WorldSnapshot } from './serializer.js';
import type { CommandExecutionResult, ComponentRegistry, World } from './world.js';

export interface ReplayerConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  // Mirror World's component/state generics so worldFactory can return a
  // component-typed world and openAt hands it back typed (recorder-generics).
  // Defaulted for back-compat; the typed path works via inference.
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Constructs a paused `World` from a snapshot. Per ADR 4 (spec §15),
   * this factory is part of the determinism contract: it must reproduce
   * the recording-time component / handler / validator / system
   * registration, in the same order, and apply the snapshot in-place
   * (e.g. `World.applySnapshot`) to avoid `registerComponent` /
   * `registerHandler` duplicate-throws.
   */
  worldFactory: (snapshot: WorldSnapshot) => World<TEventMap, TCommandMap, TComponents, TState>;
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

/** A positive transition interval (fromTick, toTick]; horizon may be empty. */
export interface SelfCheckRange {
  fromTick: number;
  toTick: number;
}

export interface SelfCheckUncoveredRange extends SelfCheckRange {
  reason: 'no_payloads' | 'no_snapshot_segment' | 'failure_in_segment'
    | 'stopped_on_divergence' | 'all_checks_disabled';
}

/** Comparisons actually performed against the supplied recording, not provenance. */
export interface SelfCheckCoverage {
  /** Existing replay horizon: incomplete uses persistedEndTick; otherwise max(endTick, persistedEndTick). */
  horizon: SelfCheckRange;
  enabledChecks: { state: boolean; events: boolean; executions: boolean };
  /** One interval per completed segment, including segments with divergences. */
  checkedRanges: SelfCheckRange[];
  /** State is compared only at these segment endpoints, never at every intermediate tick. */
  stateComparisonTicks: number[];
  uncoveredRanges: SelfCheckUncoveredRange[];
  /** All positive-horizon intervals compared for enabled checks; false when no comparison ran. Independent of ok. */
  complete: boolean;
  notRunReason?: 'empty_horizon' | 'no_payloads' | 'no_segments'
    | 'all_checks_disabled' | 'all_segments_skipped';
}

export interface SelfCheckResult {
  ok: boolean;
  checkedSegments: number;
  stateDivergences: StateDivergence[];
  eventDivergences: EventDivergence[];
  executionDivergences: ExecutionDivergence[];
  skippedSegments: SkippedSegment[];
  /** Always returned by selfCheck; optional for old consumer-created result objects. */
  coverage?: SelfCheckCoverage;
}

export interface MarkerValidationResult {
  ok: boolean;
  invalidMarkers: Array<{ markerId: string; reason: string }>;
}
