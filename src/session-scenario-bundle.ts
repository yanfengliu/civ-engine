import { randomUUID } from 'node:crypto';
import { cloneJsonValue } from './json.js';
import type { ScenarioResult } from './scenario-runner.js';
import type {
  Marker,
  RecordedCommand,
  SessionBundle,
  SessionMetadata,
} from './session-bundle.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
import { BundleIntegrityError } from './session-errors.js';
import { ENGINE_VERSION } from './version.js';
import type { WorldDebugSnapshot } from './world-debugger.js';

export interface ScenarioResultToBundleOptions {
  /** Override `metadata.sourceLabel`. Defaults to `result.name`. */
  sourceLabel?: string;
  /** Override `metadata.nodeVersion`. Defaults to `process.version`. */
  nodeVersion?: string;
}

/**
 * Translate a `ScenarioResult` (returned by `runScenario`) into a
 * `SessionBundle` with `sourceKind: 'scenario'`. Per spec §10:
 *
 * - `metadata.startTick` comes from `result.history.initialSnapshot.tick`
 *   (NOT hardcoded to 0; scenarios may run on a non-zero-start world).
 * - `metadata.endTick = result.tick`.
 * - `bundle.commands` is `result.history.recordedCommands ?? []`. When
 *   the scenario was NOT configured with `history.captureCommandPayloads:
 *   true`, this is empty and the bundle is diagnostic-only — replay /
 *   selfCheck refuse with `BundleIntegrityError(code: 'no_replay_payloads')`
 *   per spec §10.3.
 * - One `kind: 'assertion'` marker per `result.checks` outcome with
 *   `provenance: 'engine'`. All assertion markers share `tick: result.tick`
 *   because `ScenarioCheckOutcome` doesn't currently track per-check tick
 *   (a future spec extension).
 *
 * Throws `BundleIntegrityError(code: 'no_initial_snapshot')` if the
 * scenario's `WorldHistoryRecorder` was configured with
 * `captureInitialSnapshot: false` (initial snapshot is required).
 */
export function scenarioResultToBundle<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
>(
  result: ScenarioResult<TEventMap, TCommandMap>,
  options?: ScenarioResultToBundleOptions,
): SessionBundle<TEventMap, TCommandMap, WorldDebugSnapshot> {
  if (!result.history.initialSnapshot) {
    throw new BundleIntegrityError(
      'scenario history has no initialSnapshot — adapter requires captureInitialSnapshot: true',
      { code: 'no_initial_snapshot', scenarioName: result.name },
    );
  }
  const startTick = result.history.initialSnapshot.tick;
  const endTick = result.tick;
  const recordedCommands = (result.history.recordedCommands ?? []) as Array<
    RecordedCommand<TCommandMap>
  >;

  const metadata: SessionMetadata = {
    sessionId: randomUUID(),
    engineVersion: ENGINE_VERSION,
    nodeVersion: options?.nodeVersion ?? (typeof process !== 'undefined' ? process.version : 'unknown'),
    recordedAt: new Date().toISOString(),
    startTick,
    endTick,
    persistedEndTick: endTick,
    durationTicks: endTick - startTick,
    sourceKind: 'scenario',
    sourceLabel: options?.sourceLabel ?? result.name,
  };

  const markers: Marker[] = result.checks.map((outcome) => ({
    id: randomUUID(),
    tick: endTick,
    kind: 'assertion' as const,
    provenance: 'engine' as const,
    text: outcome.name,
    data: { passed: outcome.passed, failure: outcome.failure } as never,
    createdAt: new Date().toISOString(),
  }));

  const bundle: SessionBundle<TEventMap, TCommandMap, WorldDebugSnapshot> = {
    schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
    metadata,
    initialSnapshot: result.history.initialSnapshot,
    ticks: cloneJsonValue(result.history.ticks, 'scenario history ticks'),
    commands: cloneJsonValue(recordedCommands, 'scenario recordedCommands'),
    executions: cloneJsonValue(result.history.executions, 'scenario history executions'),
    failures: cloneJsonValue(result.history.failures, 'scenario history failures'),
    snapshots: [{ tick: result.tick, snapshot: result.snapshot }],
    markers,
    attachments: [],
  };
  return bundle;
}
