// Shared public + internal types for the `World` class layers. Extracted from
// `src/world.ts` as part of the LOC-budget split (v0.8.15). The public names
// here are re-exported by `src/world.ts` so the package surface is unchanged;
// the internal names (`RegisteredSystem`, `QueryCacheEntry`, `ComponentTuple`,
// `TickRunOptions`) are imported by the world-* layer modules only and are NOT
// part of the public API.

import type { ComponentStoreOptions } from './component-store.js';
import type { EntityId } from './types.js';
import type { JsonValue } from './json.js';
import type {
  COMMAND_EXECUTION_SCHEMA_VERSION,
  COMMAND_RESULT_SCHEMA_VERSION,
  TICK_FAILURE_SCHEMA_VERSION,
  WORLD_STEP_RESULT_SCHEMA_VERSION,
} from './ai-contract.js';
import type { SystemPhase } from './world-internal.js';
import type { World } from './world.js';

export type System<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> = (world: World<TEventMap, TCommandMap, TComponents, TState>) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseSystem = (world: World<any, any, any, any>) => void;

export interface LooseSystemRegistration {
  name?: string;
  phase?: SystemPhase;
  execute: LooseSystem;
  before?: string[];
  after?: string[];
  interval?: number;
  intervalOffset?: number;
}

export interface SystemRegistration<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  name?: string;
  phase?: SystemPhase;
  execute: System<TEventMap, TCommandMap, TComponents, TState>;
  before?: string[];
  after?: string[];
  interval?: number;
  intervalOffset?: number;
}

export interface WorldMetrics {
  tick: number;
  entityCount: number;
  componentStoreCount: number;
  simulation: {
    tps: number;
    tickBudgetMs: number;
  };
  commandStats: {
    pendingBeforeTick: number;
    processed: number;
  };
  systems: Array<{
    name: string;
    phase: SystemPhase;
    durationMs: number;
  }>;
  query: {
    calls: number;
    cacheHits: number;
    cacheMisses: number;
    results: number;
    /** Cache entries examined by query-cache membership maintenance during
     *  in-tick signature changes (add/remove component, destroy). The exact
     *  operation count behind the entity-churn scale wall — see
     *  `docs/threads/done/benchmark-gate/DESIGN.md` §1. Added v0.8.17. */
    membershipChecks: number;
  };
  spatial: {
    explicitSyncs: number;
  };
  durationMs: {
    total: number;
    commands: number;
    systems: number;
    resources: number;
    diff: number;
  };
}

export interface CommandValidationRejection {
  code: string;
  message?: string;
  details?: JsonValue;
}

export type CommandValidationResult = boolean | CommandValidationRejection;

export interface CommandSubmissionResult<
  TCommandType extends PropertyKey = string,
> {
  schemaVersion: typeof COMMAND_RESULT_SCHEMA_VERSION;
  accepted: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
  sequence: number;
  validatorIndex: number | null;
}

export interface CommandExecutionResult<
  TCommandType extends PropertyKey = string,
> {
  schemaVersion: typeof COMMAND_EXECUTION_SCHEMA_VERSION;
  submissionSequence: number | null;
  executed: boolean;
  commandType: TCommandType;
  code: string;
  message: string;
  details: JsonValue | null;
  tick: number;
}

export type TickFailurePhase =
  | 'commands'
  | 'systems'
  | 'resources'
  | 'diff'
  | 'listeners';

export interface TickFailure {
  schemaVersion: typeof TICK_FAILURE_SCHEMA_VERSION;
  tick: number;
  phase: TickFailurePhase;
  code: string;
  message: string;
  subsystem: string;
  commandType: string | null;
  submissionSequence: number | null;
  systemName: string | null;
  /** Classifies the FAILURE (e.g. 'system_threw', 'world_poisoned') — not
   *  the thrown error. The thrown EngineError's own code/details live in
   *  `error.code` / `error.details` below. */
  details: JsonValue | null;
  error: {
    name: string;
    message: string;
    stack: string | null;
    /** Present iff the thrown error was an EngineError/EngineRangeError/
     *  EngineTypeError — the agent-branchable code (absent, not null,
     *  otherwise). */
    code?: string;
    details?: JsonValue;
  } | null;
}

export interface WorldStepResult {
  schemaVersion: typeof WORLD_STEP_RESULT_SCHEMA_VERSION;
  ok: boolean;
  tick: number;
  failure: TickFailure | null;
}

export class WorldTickFailureError extends Error {
  readonly failure: TickFailure;

  constructor(failure: TickFailure) {
    super(failure.message);
    this.name = 'WorldTickFailureError';
    this.failure = failure;
  }
}

export type ComponentTuple<T extends unknown[]> = { [K in keyof T]: T[K] | undefined };

export interface QueryCacheEntry {
  readonly mask: bigint;
  readonly entities: EntityId[];
}

export interface RegisteredSystem<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  phase: SystemPhase;
  execute: System<TEventMap, TCommandMap, TComponents, TState>;
  order: number;
  before: string[];
  after: string[];
  interval: number;
  intervalOffset: number;
}

export type TickMetricsProfile = 'full' | 'minimal' | 'none';

export interface TickRunOptions {
  metricsProfile: TickMetricsProfile;
}

export type ComponentRegistry = Record<string, unknown>;

export type ComponentOptions = ComponentStoreOptions;
