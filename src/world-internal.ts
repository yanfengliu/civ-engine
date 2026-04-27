import type { EntityId, InstrumentationProfile, Position, WorldConfig } from './types.js';
import type { TickDiff } from './diff.js';
import { assertJsonCompatible, type JsonValue } from './json.js';
import type {
  CommandValidationResult,
  TickFailure,
  TickMetricsProfile,
  WorldMetrics,
} from './world.js';

export const SYSTEM_PHASES = [
  'input',
  'preUpdate',
  'update',
  'postUpdate',
  'output',
] as const;

export type SystemPhase = (typeof SYSTEM_PHASES)[number];

export function createMetrics(
  tick: number,
  entityCount: number,
  componentStoreCount: number,
  tps: number,
): WorldMetrics {
  return {
    tick,
    entityCount,
    componentStoreCount,
    simulation: {
      tps,
      tickBudgetMs: 1000 / tps,
    },
    commandStats: {
      pendingBeforeTick: 0,
      processed: 0,
    },
    systems: [],
    query: {
      calls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      results: 0,
    },
    spatial: {
      explicitSyncs: 0,
    },
    durationMs: {
      total: 0,
      commands: 0,
      systems: 0,
      resources: 0,
      diff: 0,
    },
  };
}

export function getImplicitMetricsProfile(
  instrumentationProfile: InstrumentationProfile,
): TickMetricsProfile {
  switch (instrumentationProfile) {
    case 'full':
      return 'full';
    case 'minimal':
      return 'minimal';
    case 'release':
      return 'none';
  }
}

export function normalizeCommandValidationResult(
  result: CommandValidationResult,
  validatorIndex: number,
): {
  code: string;
  message: string;
  details: JsonValue | null;
  validatorIndex: number;
} | null {
  if (result === true) {
    return null;
  }

  if (result === false) {
    return {
      code: 'validation_failed',
      message: 'Validation failed',
      details: null,
      validatorIndex,
    };
  }

  if (!result || typeof result !== 'object' || typeof result.code !== 'string') {
    throw new Error('Command validators must return boolean or a rejection object');
  }

  if (result.code.length === 0) {
    throw new Error('Command rejection code must not be empty');
  }

  if (result.details !== undefined) {
    assertJsonCompatible(
      result.details,
      `command rejection details for validator ${validatorIndex}`,
    );
  }

  return {
    code: result.code,
    message: result.message ?? 'Validation failed',
    details: (result.details ?? null) as JsonValue | null,
    validatorIndex,
  };
}

export function cloneMetrics(metrics: WorldMetrics): WorldMetrics {
  return {
    tick: metrics.tick,
    entityCount: metrics.entityCount,
    componentStoreCount: metrics.componentStoreCount,
    simulation: { ...metrics.simulation },
    commandStats: { ...metrics.commandStats },
    systems: metrics.systems.map((system) => ({ ...system })),
    query: { ...metrics.query },
    spatial: { ...metrics.spatial },
    durationMs: { ...metrics.durationMs },
  };
}

// Both helpers deep-clone via JSON. TickDiff is JSON-shaped because component
// data and state values pass assertJsonCompatible at write time; TickFailure
// is JSON-shaped because createTickFailure normalizes the optional Error field
// to a plain {name, message, stack} via createErrorDetails and asserts
// JSON-compat on `details`. JSON is ~2-5× faster than structuredClone for
// these plain shapes on V8, and cloneTickDiff runs once per tick per diff
// listener so the throughput matters.

export function cloneTickFailure(failure: TickFailure): TickFailure {
  return JSON.parse(JSON.stringify(failure)) as TickFailure;
}

export function cloneTickDiff(diff: TickDiff): TickDiff {
  return JSON.parse(JSON.stringify(diff)) as TickDiff;
}

export function createErrorDetails(error: unknown): {
  name: string;
  message: string;
  stack: string | null;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: 'Error',
    message: String(error),
    stack: null,
  };
}

export function errorMessage(error: unknown): string {
  return createErrorDetails(error).message;
}

export function now(): number {
  return performance.now();
}

export function phaseIndex(phase: SystemPhase): number {
  return SYSTEM_PHASES.indexOf(phase);
}

export function isSystemPhase(value: string): value is SystemPhase {
  return (SYSTEM_PHASES as readonly string[]).includes(value);
}

export function describeIntervalValue(raw: unknown): string {
  if (typeof raw === 'string') return `"${raw}"`;
  if (typeof raw === 'number') return String(raw);
  return `${typeof raw}: ${String(raw)}`;
}

export function validateSystemInterval(name: string, raw: number | undefined): number {
  if (raw === undefined) return 1;
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 1) {
    throw new Error(
      `System '${name}' interval must be a safe integer >= 1 (got ${describeIntervalValue(raw)})`,
    );
  }
  return raw;
}

export function validateSystemIntervalOffset(
  name: string,
  interval: number,
  raw: number | undefined,
): number {
  if (raw === undefined) return 0;
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 0) {
    throw new Error(
      `System '${name}' intervalOffset must be a safe integer >= 0 (got ${describeIntervalValue(raw)})`,
    );
  }
  if (raw >= interval) {
    throw new Error(
      `System '${name}' intervalOffset (${raw}) must be < interval (${interval})`,
    );
  }
  return raw;
}

export function insertSorted(values: EntityId[], value: EntityId): void {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid] < value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  if (values[low] !== value) {
    values.splice(low, 0, value);
  }
}

export function validateWorldConfig(config: WorldConfig): void {
  if (!Number.isInteger(config.gridWidth) || config.gridWidth <= 0) {
    throw new RangeError('gridWidth must be a positive integer');
  }
  if (!Number.isInteger(config.gridHeight) || config.gridHeight <= 0) {
    throw new RangeError('gridHeight must be a positive integer');
  }
  if (!Number.isFinite(config.tps) || config.tps <= 0) {
    throw new RangeError('tps must be a finite positive number');
  }
  if (
    config.maxTicksPerFrame !== undefined &&
    (!Number.isInteger(config.maxTicksPerFrame) || config.maxTicksPerFrame <= 0)
  ) {
    throw new RangeError('maxTicksPerFrame must be a positive integer');
  }
  if (config.positionKey !== undefined && config.positionKey.length === 0) {
    throw new Error('positionKey must not be empty');
  }
  if (
    config.instrumentationProfile !== undefined &&
    config.instrumentationProfile !== 'full' &&
    config.instrumentationProfile !== 'minimal' &&
    config.instrumentationProfile !== 'release'
  ) {
    throw new Error(
      "instrumentationProfile must be 'full', 'minimal', or 'release'",
    );
  }
}

export function asPosition(value: unknown): Position {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('x' in value) ||
    !('y' in value)
  ) {
    throw new Error('Position component must be an object with x and y');
  }
  const position = value as { x: unknown; y: unknown };
  if (
    typeof position.x !== 'number' ||
    typeof position.y !== 'number' ||
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y)
  ) {
    throw new RangeError('Position coordinates must be integers');
  }
  return { x: position.x, y: position.y };
}
