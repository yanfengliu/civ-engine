// Spec 9: AI Playtester Agent (v0.8.9). Async sibling to `runSynthPlaytest`.
// LLM integration is intentionally out of scope — this module ships the contract
// (`AgentDriver`) and async runner (`runAgentPlaytest`) plus a structured
// `bundleSummary` helper for feeding bundle facts to an LLM. Game projects (or
// downstream tooling) wire their own LLM clients via `AgentDriver.decide`.

import { MemorySink } from './session-sink.js';
import { SessionRecorder } from './session-recorder.js';
import { RecorderClosedError } from './session-errors.js';
import type { SessionBundle } from './session-bundle.js';
import type { SessionSink, SessionSource } from './session-sink.js';
import type { ComponentRegistry } from './world.js';
import { World } from './world.js';
import type { PolicyCommand } from './synthetic-playtest.js';

export type { PolicyCommand } from './synthetic-playtest.js';

// ---------------------------------------------------------------------------
// AgentDriver contract
// ---------------------------------------------------------------------------

export interface AgentDriverContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  /** Live world reference. Per Spec 3 ADR 2, the agent MUST NOT mutate it
   *  directly — return commands from `decide` instead. */
  readonly world: World<TEventMap, TCommandMap>;
  /** The tick about to be executed (the next call to `world.step()` will run this tick). */
  readonly tick: number;
  /** Tick number when the playtest started. */
  readonly startTick: number;
  /** Number of ticks elapsed since startTick (0 on the first call). */
  readonly tickIndex: number;
}

export interface AgentDriver<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  /** Called once per tick. Return zero or more commands; sync or async. */
  decide(
    ctx: AgentDriverContext<TEventMap, TCommandMap>,
  ): Promise<readonly PolicyCommand<TCommandMap>[]> | readonly PolicyCommand<TCommandMap>[];
  /** Optional. Called once after the playtest completes (any stop reason).
   *  Return value is captured into AgentPlaytestResult.report. Sync or async. */
  report?(bundle: SessionBundle<TEventMap, TCommandMap>): Promise<unknown> | unknown;
}

// ---------------------------------------------------------------------------
// Config / result types
// ---------------------------------------------------------------------------

export interface AgentPlaytestConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  world: World<TEventMap, TCommandMap, TComponents, TState>;
  agent: AgentDriver<TEventMap, TCommandMap>;
  maxTicks: number;
  /** Optional early-stop predicate. Called after each tick. Sync or async. */
  stopWhen?(ctx: AgentDriverContext<TEventMap, TCommandMap>): boolean | Promise<boolean>;
  sink?: SessionSink & SessionSource;
  sourceLabel?: string;
  snapshotInterval?: number | null;
}

export type AgentStopReason =
  | 'maxTicks'
  | 'stopWhen'
  | 'poisoned'
  | 'agentError'
  | 'sinkError';

export interface AgentPlaytestResult<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  bundle: SessionBundle<TEventMap, TCommandMap>;
  ticksRun: number;
  stopReason: AgentStopReason;
  ok: boolean;
  agentError?: {
    tick: number;
    error: { name: string; message: string; stack: string | null };
  };
  /** Captured from `agent.report(bundle)` if the driver implements it. If the
   *  report callback throws, the rejection is captured here as
   *  `{ error: { name, message, stack } }` rather than rejecting the outer Promise. */
  report?: unknown;
}

// ---------------------------------------------------------------------------
// Async runner
// ---------------------------------------------------------------------------

/**
 * Run an async playtest driven by `agent.decide(ctx)` once per tick. Returns a
 * `SessionBundle` recorded through `SessionRecorder` (sourceKind: 'synthetic').
 * Per ADR 41, this is a sibling of `runSynthPlaytest`, not an extension —
 * `Policy` stays synchronous.
 */
export async function runAgentPlaytest<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  config: AgentPlaytestConfig<TEventMap, TCommandMap, TComponents, TState>,
): Promise<AgentPlaytestResult<TEventMap, TCommandMap>> {
  if (!Number.isInteger(config.maxTicks) || config.maxTicks < 1) {
    throw new RangeError(`maxTicks must be a positive integer (got ${config.maxTicks})`);
  }
  if (config.world.isPoisoned()) {
    // Match SessionRecorder.connect()'s and runSynthPlaytest's poisoned-world
    // guards exactly so callers get a consistent error shape regardless of
    // which check fires first.
    throw new RecorderClosedError(
      'cannot run agent playtest on a poisoned world; call world.recover() first',
      { code: 'world_poisoned' },
    );
  }

  const { world, agent, maxTicks, sourceLabel } = config;
  const snapshotInterval: number | null =
    'snapshotInterval' in config && config.snapshotInterval !== undefined
      ? config.snapshotInterval
      : 1000;

  const sink: SessionSink & SessionSource = config.sink ?? new MemorySink();
  const recorder = new SessionRecorder<TEventMap, TCommandMap>({
    world: world as unknown as World<TEventMap, TCommandMap>,
    sink,
    sourceKind: 'synthetic',
    sourceLabel: sourceLabel ?? 'agent',
    snapshotInterval,
  });
  recorder.connect();
  // Connect-time sink failures are swallowed by SessionRecorder.connect into
  // _lastError + _terminated. Surface them as a thrown error before any
  // agent.decide() runs (which could be an LLM call burning budget).
  if (recorder.lastError) {
    const err = recorder.lastError;
    try { recorder.disconnect(); } catch { /* best-effort */ }
    throw err;
  }

  const startTick = world.tick;
  let ticksRun = 0;
  let stopReason: AgentStopReason = 'maxTicks';
  let agentError: AgentPlaytestResult<TEventMap, TCommandMap>['agentError'];

  try {
    for (let tickIndex = 0; tickIndex < maxTicks; tickIndex++) {
      const ctx: AgentDriverContext<TEventMap, TCommandMap> = {
        world: world as unknown as World<TEventMap, TCommandMap>,
        tick: world.tick + 1,
        startTick,
        tickIndex,
      };

      let commands: readonly PolicyCommand<TCommandMap>[];
      try {
        commands = await agent.decide(ctx);
      } catch (e) {
        stopReason = 'agentError';
        agentError = { tick: ctx.tick, error: errorShape(e) };
        break;
      }

      // Submit can throw when a user-validator throws (world.ts:2151-2157).
      // Classify those as agentError, not sinkError — sinkError is reserved
      // for recorder.lastError mid-run.
      try {
        for (const cmd of commands) {
          world.submit(cmd.type, cmd.data);
        }
      } catch (e) {
        stopReason = 'agentError';
        agentError = { tick: ctx.tick, error: errorShape(e) };
        break;
      }

      try {
        world.step();
      } catch {
        stopReason = 'poisoned';
        break;
      }

      // Detect sink failure between ticks BEFORE incrementing ticksRun, so
      // ticksRun reflects the count of ticks the recorder accepted (matches
      // runSynthPlaytest's increment ordering).
      if (recorder.lastError) {
        stopReason = 'sinkError';
        agentError = { tick: world.tick, error: errorShape(recorder.lastError) };
        break;
      }
      ticksRun++;

      if (config.stopWhen) {
        // Post-step ctx semantics match runSynthPlaytest (tick === just-completed
        // tick = world.tick after advance). A predicate `ctx.tick === N` stops
        // after tick N completes, matching the synth-playtest sibling. ADR 41
        // siblings produce consistent stopWhen semantics.
        const ctxAfter: AgentDriverContext<TEventMap, TCommandMap> = {
          ...ctx,
          tick: world.tick,
          tickIndex: tickIndex + 1,
        };
        let stop: boolean;
        try {
          stop = await config.stopWhen(ctxAfter);
        } catch (e) {
          stopReason = 'agentError';
          agentError = { tick: ctxAfter.tick, error: errorShape(e) };
          break;
        }
        if (stop) {
          stopReason = 'stopWhen';
          break;
        }
      }
    }
  } finally {
    try {
      recorder.disconnect();
    } catch {
      // Best-effort; bundle is still readable from sink in most cases.
    }
  }

  const bundle = recorder.toBundle() as unknown as SessionBundle<TEventMap, TCommandMap>;

  let report: unknown;
  if (agent.report) {
    try {
      report = await agent.report(bundle);
    } catch (e) {
      report = { error: errorShape(e) };
    }
  }

  return {
    bundle,
    ticksRun,
    stopReason,
    // Tighten ok per runSynthPlaytest: also check recorder.lastError, so a
    // FileSink failure during the terminal-snapshot write inside disconnect()
    // is reflected as ok: false even if stopReason already locked in 'maxTicks'.
    ok:
      stopReason !== 'poisoned' &&
      stopReason !== 'agentError' &&
      stopReason !== 'sinkError' &&
      recorder.lastError === null,
    ...(agentError ? { agentError } : {}),
    ...(report !== undefined ? { report } : {}),
  };
}

// ---------------------------------------------------------------------------
// Bundle summary helper
// ---------------------------------------------------------------------------

export interface BundleSummary {
  sessionId: string;
  recordedAt: string;
  engineVersion: string;
  nodeVersion: string;
  sourceKind: 'session' | 'scenario' | 'synthetic';
  sourceLabel: string | null;
  startTick: number;
  endTick: number;
  durationTicks: number;
  incomplete: boolean;
  totalCommands: number;
  acceptedCommands: number;
  acceptedCommandRate: number;
  commandTypeCounts: Record<string, number>;
  totalEvents: number;
  eventTypeCounts: Record<string, number>;
  markerCount: number;
  markersByKind: Record<string, number>;
  failureCount: number;
  failedTicks: number[];
}

/**
 * Pure helper that turns a `SessionBundle` into a JSON-serializable summary
 * designed to fit a small LLM context window. Composes with `runMetrics`
 * (which gives statistical aggregates over a corpus) by providing a
 * single-bundle structured snapshot.
 */
export function bundleSummary<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
>(bundle: SessionBundle<TEventMap, TCommandMap>): BundleSummary {
  const md = bundle.metadata;
  const commandTypeCounts: Record<string, number> = {};
  let acceptedCommands = 0;
  for (const c of bundle.commands) {
    const key = String(c.type);
    commandTypeCounts[key] = (commandTypeCounts[key] ?? 0) + 1;
    if (c.result.accepted) acceptedCommands++;
  }
  const eventTypeCounts: Record<string, number> = {};
  let totalEvents = 0;
  for (const t of bundle.ticks) {
    for (const e of t.events) {
      const key = String(e.type);
      eventTypeCounts[key] = (eventTypeCounts[key] ?? 0) + 1;
      totalEvents++;
    }
  }
  const markersByKind: Record<string, number> = {};
  for (const m of bundle.markers) {
    markersByKind[m.kind] = (markersByKind[m.kind] ?? 0) + 1;
  }
  const totalCommands = bundle.commands.length;
  return {
    sessionId: md.sessionId,
    recordedAt: md.recordedAt,
    engineVersion: md.engineVersion,
    nodeVersion: md.nodeVersion,
    sourceKind: md.sourceKind,
    sourceLabel: md.sourceLabel ?? null,
    startTick: md.startTick,
    endTick: md.endTick,
    durationTicks: md.durationTicks,
    incomplete: md.incomplete === true,
    totalCommands,
    acceptedCommands,
    acceptedCommandRate: totalCommands === 0 ? 0 : acceptedCommands / totalCommands,
    commandTypeCounts,
    totalEvents,
    eventTypeCounts,
    markerCount: bundle.markers.length,
    markersByKind,
    failureCount: md.failedTicks?.length ?? 0,
    failedTicks: md.failedTicks ? [...md.failedTicks] : [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorShape(e: unknown): { name: string; message: string; stack: string | null } {
  if (e instanceof Error) {
    return {
      name: e.name,
      message: e.message,
      stack: e.stack ?? null,
    };
  }
  return { name: 'NonError', message: String(e), stack: null };
}
