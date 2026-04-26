import { assertJsonCompatible, type JsonValue } from './json.js';
import type { TickDiff } from './diff.js';
import type { WorldSnapshot } from './serializer.js';
import { WorldHistoryRecorder, type WorldHistoryState } from './history-recorder.js';
import {
  WorldDebugger,
  type DebugIssue,
  type DebugProbe,
  type WorldDebugSnapshot,
} from './world-debugger.js';
import { SCENARIO_RESULT_SCHEMA_VERSION } from './ai-contract.js';
import type {
  CommandSubmissionResult,
  World,
  WorldMetrics,
} from './world.js';

type ScenarioEvent<
  TEventMap extends Record<keyof TEventMap, unknown>,
> = {
  type: keyof TEventMap;
  data: TEventMap[keyof TEventMap];
};

export interface ScenarioFailure {
  code: string;
  message: string;
  source?: 'setup' | 'run' | 'stepUntil' | 'check' | 'tick';
  details?: JsonValue;
}

export type ScenarioCheckResult = boolean | ScenarioFailure;

export interface ScenarioCheck<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  name: string;
  check(
    context: ScenarioContext<TEventMap, TCommandMap>,
  ): ScenarioCheckResult;
}

export interface ScenarioCheckOutcome {
  name: string;
  passed: boolean;
  failure: ScenarioFailure | null;
}

export interface ScenarioCapture<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  schemaVersion: typeof SCENARIO_RESULT_SCHEMA_VERSION;
  tick: number;
  snapshot: WorldSnapshot;
  debug: WorldDebugSnapshot;
  history: WorldHistoryState<TEventMap, TCommandMap, WorldDebugSnapshot>;
  metrics: WorldMetrics | null;
  diff: TickDiff | null;
  events: Array<ScenarioEvent<TEventMap>>;
}

export interface ScenarioStepUntilResult {
  completed: boolean;
  steps: number;
  tick: number;
  failure: ScenarioFailure | null;
}

export interface ScenarioContext<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  name: string;
  world: World<TEventMap, TCommandMap>;
  debugger: WorldDebugger<TEventMap, TCommandMap>;
  history: WorldHistoryRecorder<TEventMap, TCommandMap, WorldDebugSnapshot>;
  submit<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
  ): CommandSubmissionResult<K>;
  step(count?: number): ScenarioCapture<TEventMap, TCommandMap>;
  stepUntil(
    predicate: (context: ScenarioContext<TEventMap, TCommandMap>) => boolean,
    options?: {
      maxTicks?: number;
      code?: string;
      message?: string;
      details?: JsonValue;
    },
  ): ScenarioStepUntilResult;
  capture(): ScenarioCapture<TEventMap, TCommandMap>;
  fail(
    code: string,
    message: string,
    details?: JsonValue,
    source?: ScenarioFailure['source'],
  ): ScenarioFailure;
}

export interface ScenarioConfig<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  name: string;
  world: World<TEventMap, TCommandMap>;
  debugger?: WorldDebugger<TEventMap, TCommandMap>;
  probes?: DebugProbe[];
  history?: {
    capacity?: number;
    commandCapacity?: number;
    captureInitialSnapshot?: boolean;
  };
  setup?(context: ScenarioContext<TEventMap, TCommandMap>): void;
  run?(
    context: ScenarioContext<TEventMap, TCommandMap>,
  ): void | ScenarioFailure | null;
  checks?: Array<ScenarioCheck<TEventMap, TCommandMap>>;
}

export interface ScenarioResult<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> extends ScenarioCapture<TEventMap, TCommandMap> {
  name: string;
  passed: boolean;
  failure: ScenarioFailure | null;
  checks: ScenarioCheckOutcome[];
  issues: DebugIssue[];
}

export function runScenario<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
>(config: ScenarioConfig<TEventMap, TCommandMap>): ScenarioResult<
  TEventMap,
  TCommandMap
> {
  const debuggerView =
    config.debugger ??
    new WorldDebugger({
      world: config.world,
      probes: config.probes,
    });
  const history = new WorldHistoryRecorder<TEventMap, TCommandMap, WorldDebugSnapshot>({
    world: config.world,
    capacity: config.history?.capacity,
    commandCapacity: config.history?.commandCapacity,
    captureInitialSnapshot: config.history?.captureInitialSnapshot,
    debug: debuggerView,
  });

  history.connect();

  const context = createScenarioContext(
    config.name,
    config.world,
    debuggerView,
    history,
  );

  let failure: ScenarioFailure | null = null;
  let checks: ScenarioCheckOutcome[] = [];

  try {
    if (config.setup) {
      try {
        config.setup(context);
      } catch (error) {
        failure = failureFromError(error, 'scenario_setup_threw', 'setup');
      }
    }

    history.clear();

    if (!failure && config.run) {
      try {
        failure = normalizeFailure(config.run(context), 'run');
      } catch (error) {
        failure = failureFromError(error, 'scenario_run_threw', 'run');
      }
    }

    if (!failure) {
      checks = (config.checks ?? []).map((check) => {
        try {
          const normalized = normalizeCheckResult(
            check.check(context),
            'check',
          );
          return {
            name: check.name,
            passed: normalized === null,
            failure: normalized,
          };
        } catch (error) {
          return {
            name: check.name,
            passed: false,
            failure: failureFromError(
              error,
              `scenario_check_${normalizeCode(check.name)}_threw`,
              'check',
            ),
          };
        }
      });
    }

    const capture = context.capture();
    const passed = failure === null && checks.every((check) => check.passed);

    return {
      name: config.name,
      passed,
      failure,
      checks,
      issues: capture.debug.issues,
      ...capture,
    };
  } finally {
    history.disconnect();
  }
}

function createScenarioContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
>(
  name: string,
  world: World<TEventMap, TCommandMap>,
  debuggerView: WorldDebugger<TEventMap, TCommandMap>,
  history: WorldHistoryRecorder<TEventMap, TCommandMap, WorldDebugSnapshot>,
): ScenarioContext<TEventMap, TCommandMap> {
  const context: ScenarioContext<TEventMap, TCommandMap> = {
    name,
    world,
    debugger: debuggerView,
    history,
    submit: (type, data) => world.submitWithResult(type, data),
    step: (count = 1) => {
      assertValidStepCount(count);
      for (let index = 0; index < count; index++) {
        const result = world.stepWithResult();
        if (!result.ok && result.failure) {
          throw new ScenarioTickFailure(result.failure);
        }
      }
      return context.capture();
    },
    stepUntil: (predicate, options) =>
      stepUntil(context, predicate, options),
    capture: () => captureScenarioState(world, debuggerView, history),
    fail: (code, message, details, source) =>
      createScenarioFailure(code, message, details, source),
  };
  return context;
}

function stepUntil<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
>(
  context: ScenarioContext<TEventMap, TCommandMap>,
  predicate: (context: ScenarioContext<TEventMap, TCommandMap>) => boolean,
  options?: {
    maxTicks?: number;
    code?: string;
    message?: string;
    details?: JsonValue;
  },
): ScenarioStepUntilResult {
  const maxTicks = options?.maxTicks ?? 64;
  assertValidStepCount(maxTicks);

  if (predicate(context)) {
    return {
      completed: true,
      steps: 0,
      tick: context.world.tick,
      failure: null,
    };
  }

  let steps = 0;
  while (steps < maxTicks) {
    const step = context.world.stepWithResult();
    if (!step.ok) {
      return {
        completed: false,
        steps,
        tick: context.world.tick,
        failure: createScenarioFailure(
          step.failure?.code ?? 'scenario_tick_failed',
          step.failure?.message ?? 'Scenario tick failed',
          step.failure
            ? (cloneJsonValue(
                step.failure,
                'scenario tick failure',
              ) as unknown as JsonValue)
            : undefined,
          'tick',
        ),
      };
    }
    steps++;
    if (predicate(context)) {
      return {
        completed: true,
        steps,
        tick: context.world.tick,
        failure: null,
      };
    }
  }

  return {
    completed: false,
    steps,
    tick: context.world.tick,
    failure: createScenarioFailure(
      options?.code ?? 'scenario_step_until_timeout',
      options?.message ?? 'Scenario condition was not met before maxTicks',
      {
        maxTicks,
        tick: context.world.tick,
        ...(options?.details ? { details: options.details } : {}),
      },
      'stepUntil',
    ),
  };
}

function captureScenarioState<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
>(
  world: World<TEventMap, TCommandMap>,
  debuggerView: WorldDebugger<TEventMap, TCommandMap>,
  history: WorldHistoryRecorder<TEventMap, TCommandMap, WorldDebugSnapshot>,
): ScenarioCapture<TEventMap, TCommandMap> {
  const snapshot = cloneJsonValue(
    world.serialize({ inspectPoisoned: true }),
    'scenario snapshot',
  );
  const debug = cloneJsonValue(debuggerView.capture(), 'scenario debug snapshot');
  const diff = cloneNullableJsonValue(world.getDiff(), 'scenario diff');
  const events = cloneJsonValue(
    [...world.getEvents()],
    'scenario events',
  ) as Array<ScenarioEvent<TEventMap>>;

  return {
    schemaVersion: SCENARIO_RESULT_SCHEMA_VERSION,
    tick: snapshot.tick,
    snapshot,
    debug,
    history: history.getState(),
    metrics: world.getMetrics(),
    diff,
    events,
  };
}

function createScenarioFailure(
  code: string,
  message: string,
  details?: JsonValue,
  source?: ScenarioFailure['source'],
): ScenarioFailure {
  if (code.length === 0) {
    throw new Error('Scenario failure code must not be empty');
  }
  if (details !== undefined) {
    assertJsonCompatible(details, `scenario failure details for '${code}'`);
  }
  return {
    code,
    message,
    source,
    ...(details !== undefined ? { details } : {}),
  };
}

function normalizeFailure(
  result: void | null | ScenarioFailure,
  source: ScenarioFailure['source'],
): ScenarioFailure | null {
  if (result === undefined || result === null) {
    return null;
  }
  return createScenarioFailure(
    result.code,
    result.message,
    result.details,
    result.source ?? source,
  );
}

function normalizeCheckResult(
  result: ScenarioCheckResult,
  source: ScenarioFailure['source'],
): ScenarioFailure | null {
  if (result === true) {
    return null;
  }
  if (result === false) {
    return createScenarioFailure(
      'scenario_check_failed',
      'Scenario check failed',
      undefined,
      source,
    );
  }
  return createScenarioFailure(
    result.code,
    result.message,
    result.details,
    result.source ?? source,
  );
}

function failureFromError(
  error: unknown,
  code: string,
  source: ScenarioFailure['source'],
): ScenarioFailure {
  if (error instanceof ScenarioTickFailure) {
    return createScenarioFailure(
      error.failure.code,
      error.failure.message,
      cloneJsonValue(
        error.failure,
        'scenario tick failure',
      ) as unknown as JsonValue,
      'tick',
    );
  }
  if (error instanceof Error) {
    return createScenarioFailure(code, error.message, {
      name: error.name,
      stack: error.stack ?? null,
    }, source);
  }

  return createScenarioFailure(code, String(error), undefined, source);
}

function assertValidStepCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Scenario step count must be a non-negative integer');
  }
}

function normalizeCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

class ScenarioTickFailure extends Error {
  readonly failure: import('./world.js').TickFailure;

  constructor(failure: import('./world.js').TickFailure) {
    super(failure.message);
    this.name = 'ScenarioTickFailure';
    this.failure = failure;
  }
}

function cloneJsonValue<T>(value: T, label: string): T {
  assertJsonCompatible(value, label);
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneNullableJsonValue<T>(
  value: T | null,
  label: string,
): T | null {
  return value === null ? null : cloneJsonValue(value, label);
}
