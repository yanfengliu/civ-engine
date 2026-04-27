import type { SessionBundle } from './session-bundle.js';
import type { JsonValue } from './json.js';

export interface Stats {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}

export interface Metric<
  TState,
  TResult,
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  readonly name: string;
  create(): TState;
  observe(state: TState, bundle: SessionBundle<TEventMap, TCommandMap, TDebug>): TState;
  finalize(state: TState): TResult;
  merge?(a: TState, b: TState): TState;
  readonly orderSensitive?: boolean;
}

export type MetricsResult = Record<string, unknown>;

export function runMetrics<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
>(
  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
  metrics: Metric<unknown, unknown>[],
): MetricsResult {
  const names = new Set<string>();
  for (const m of metrics) {
    if (names.has(m.name)) {
      throw new RangeError(`duplicate metric name: ${m.name}`);
    }
    names.add(m.name);
  }
  const states: unknown[] = metrics.map((m) => m.create());
  for (const bundle of bundles) {
    for (let i = 0; i < metrics.length; i++) {
      states[i] = metrics[i].observe(states[i], bundle as unknown as SessionBundle);
    }
  }
  const result: MetricsResult = {};
  for (let i = 0; i < metrics.length; i++) {
    result[metrics[i].name] = metrics[i].finalize(states[i]);
  }
  return result;
}

function computeStats(values: number[]): Stats {
  const count = values.length;
  if (count === 0) {
    return { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[count - 1];
  const mean = sorted.reduce((s, v) => s + v, 0) / count;
  const percentile = (p: number): number => {
    if (count === 1) return sorted[0];
    const idx = (count - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    count, min, max, mean,
    p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99),
  };
}

export function bundleCount(name: string = 'bundleCount'): Metric<{ count: number }, number> {
  return {
    name,
    create: () => ({ count: 0 }),
    observe: (state) => {
      state.count++;
      return state;
    },
    finalize: (state) => state.count,
  };
}

export function sessionLengthStats(name: string = 'sessionLengthStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      state.push(bundle.metadata.durationTicks);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}

export function commandRateStats(name: string = 'commandRateStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      const ticks = bundle.metadata.durationTicks;
      state.push(ticks > 0 ? bundle.commands.length / ticks : 0);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}

export function eventRateStats(name: string = 'eventRateStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      const ticks = bundle.metadata.durationTicks;
      let totalEvents = 0;
      for (const t of bundle.ticks) totalEvents += t.events.length;
      state.push(ticks > 0 ? totalEvents / ticks : 0);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}

// Sort keys at finalize so the resulting Record has a serialization-stable
// iteration order. Different bundle orders → same Map content but different
// insertion order → without sorting, JSON.stringify produces different strings,
// causing baseline-file churn even when counts are identical. Sorting closes
// that gap.
function sortedRecordFromMap(state: Map<string, number>): Record<string, number> {
  const keys = [...state.keys()].sort();
  const obj: Record<string, number> = {};
  for (const k of keys) obj[k] = state.get(k) as number;
  return obj;
}

export function commandTypeCounts(
  name: string = 'commandTypeCounts',
): Metric<Map<string, number>, Record<string, number>> {
  return {
    name,
    create: () => new Map(),
    observe: (state, bundle) => {
      for (const cmd of bundle.commands) {
        state.set(cmd.type, (state.get(cmd.type) ?? 0) + 1);
      }
      return state;
    },
    finalize: sortedRecordFromMap,
  };
}

export function eventTypeCounts(
  name: string = 'eventTypeCounts',
): Metric<Map<string, number>, Record<string, number>> {
  return {
    name,
    create: () => new Map(),
    observe: (state, bundle) => {
      for (const tickEntry of bundle.ticks) {
        for (const ev of tickEntry.events) {
          const key = String(ev.type);
          state.set(key, (state.get(key) ?? 0) + 1);
        }
      }
      return state;
    },
    finalize: sortedRecordFromMap,
  };
}

export function failureBundleRate(
  name: string = 'failureBundleRate',
): Metric<{ withFailure: number; total: number }, number> {
  return {
    name,
    create: () => ({ withFailure: 0, total: 0 }),
    observe: (state, bundle) => {
      state.total++;
      if ((bundle.metadata.failedTicks?.length ?? 0) > 0) state.withFailure++;
      return state;
    },
    finalize: (state) => (state.total > 0 ? state.withFailure / state.total : 0),
  };
}

export function failedTickRate(
  name: string = 'failedTickRate',
): Metric<{ failedTicks: number; durationTicks: number }, number> {
  return {
    name,
    create: () => ({ failedTicks: 0, durationTicks: 0 }),
    observe: (state, bundle) => {
      state.failedTicks += bundle.metadata.failedTicks?.length ?? 0;
      state.durationTicks += bundle.metadata.durationTicks;
      return state;
    },
    finalize: (state) => (state.durationTicks > 0 ? state.failedTicks / state.durationTicks : 0),
  };
}

export function incompleteBundleRate(
  name: string = 'incompleteBundleRate',
): Metric<{ incomplete: number; total: number }, number> {
  return {
    name,
    create: () => ({ incomplete: 0, total: 0 }),
    observe: (state, bundle) => {
      state.total++;
      if (bundle.metadata.incomplete === true) state.incomplete++;
      return state;
    },
    finalize: (state) => (state.total > 0 ? state.incomplete / state.total : 0),
  };
}

export function commandValidationAcceptanceRate(
  name: string = 'commandValidationAcceptanceRate',
): Metric<{ accepted: number; total: number }, number> {
  return {
    name,
    create: () => ({ accepted: 0, total: 0 }),
    observe: (state, bundle) => {
      for (const cmd of bundle.commands) {
        state.total++;
        if (cmd.result.accepted) state.accepted++;
      }
      return state;
    },
    finalize: (state) => (state.total > 0 ? state.accepted / state.total : 0),
  };
}

export function executionFailureRate(
  name: string = 'executionFailureRate',
): Metric<{ failed: number; total: number }, number> {
  return {
    name,
    create: () => ({ failed: 0, total: 0 }),
    observe: (state, bundle) => {
      for (const exec of bundle.executions) {
        state.total++;
        if (!exec.executed) state.failed++;
      }
      return state;
    },
    finalize: (state) => (state.total > 0 ? state.failed / state.total : 0),
  };
}

export type NumericDelta = {
  baseline: number | null;
  current: number | null;
  delta: number | null;
  pctChange: number | null;
};

export type OpaqueDelta = {
  baseline: unknown;
  current: unknown;
  equal: boolean;
};

export type OnlyInComparison = {
  baseline?: unknown;
  current?: unknown;
  onlyIn: 'baseline' | 'current';
};

export type MetricDelta =
  | NumericDelta
  | OpaqueDelta
  | { [key: string]: MetricDelta | OnlyInComparison };

export type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

function compareValue(baseline: unknown, current: unknown): MetricDelta {
  if (
    (typeof baseline === 'number' || baseline === null) &&
    (typeof current === 'number' || current === null)
  ) {
    if (baseline === null || current === null) {
      return { baseline, current, delta: null, pctChange: null };
    }
    const delta = current - baseline;
    let pctChange: number | null;
    if (baseline === 0) {
      pctChange = current === 0 ? 0 : current > 0 ? Infinity : -Infinity;
    } else {
      pctChange = (current - baseline) / baseline;
    }
    return { baseline, current, delta, pctChange };
  }
  if (isPlainObject(baseline) && isPlainObject(current)) {
    const out: Record<string, MetricDelta | OnlyInComparison> = {};
    const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
    for (const k of allKeys) {
      const inB = k in baseline;
      const inC = k in current;
      if (inB && inC) {
        out[k] = compareValue(baseline[k], current[k]);
      } else if (inB) {
        out[k] = { baseline: baseline[k], onlyIn: 'baseline' };
      } else {
        out[k] = { current: current[k], onlyIn: 'current' };
      }
    }
    return out;
  }
  return { baseline, current, equal: deepEqual(baseline, current) };
}

export function compareMetricsResults(
  baseline: MetricsResult,
  current: MetricsResult,
): MetricsComparison {
  const out: MetricsComparison = {};
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const k of allKeys) {
    const inB = k in baseline;
    const inC = k in current;
    if (inB && inC) {
      out[k] = compareValue(baseline[k], current[k]);
    } else if (inB) {
      out[k] = { baseline: baseline[k], onlyIn: 'baseline' };
    } else {
      out[k] = { current: current[k], onlyIn: 'current' };
    }
  }
  return out;
}
