import type { World, ComponentRegistry } from './world.js';
import type { JsonValue } from './json.js';
import type { SessionBundle } from './session-bundle.js';
import { DeterministicRandom } from './random.js';
import { MemorySink, type SessionSink, type SessionSource } from './session-sink.js';
import { SessionRecorder } from './session-recorder.js';
import { RecorderClosedError } from './session-errors.js';

export interface PolicyContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  readonly tick: number;
  readonly random: () => number;
}

export interface StopContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  readonly tick: number;
  readonly random: () => number;
}

export type PolicyCommand<TCommandMap> = {
  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];

export type Policy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> = (
  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
) => PolicyCommand<TCommandMap>[];

export function noopPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(): Policy<TEventMap, TCommandMap, TComponents, TState> {
  return () => [];
}

export type ScriptedPolicyEntry<TCommandMap> = {
  [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];

export function scriptedPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  sequence: ScriptedPolicyEntry<TCommandMap>[],
): Policy<TEventMap, TCommandMap, TComponents, TState> {
  const byTick = new Map<number, PolicyCommand<TCommandMap>[]>();
  for (const entry of sequence) {
    const list = byTick.get(entry.tick);
    const cmd = { type: entry.type, data: entry.data } as PolicyCommand<TCommandMap>;
    if (list) list.push(cmd);
    else byTick.set(entry.tick, [cmd]);
  }
  return (ctx) => byTick.get(ctx.tick) ?? [];
}

export interface RandomPolicyConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap, TComponents, TState>) => PolicyCommand<TCommandMap>>;
  frequency?: number;
  offset?: number;
  burst?: number;
}

export function randomPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  config: RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>,
): Policy<TEventMap, TCommandMap, TComponents, TState> {
  const { catalog, frequency = 1, offset = 0, burst = 1 } = config;
  if (catalog.length === 0) {
    throw new RangeError('randomPolicy.catalog must be non-empty');
  }
  if (!Number.isInteger(frequency) || frequency < 1) {
    throw new RangeError('randomPolicy.frequency must be a positive integer');
  }
  if (!Number.isInteger(burst) || burst < 1) {
    throw new RangeError('randomPolicy.burst must be a positive integer');
  }
  if (!Number.isInteger(offset) || offset < 0 || offset >= frequency) {
    throw new RangeError(
      `randomPolicy.offset must be a non-negative integer < frequency (got ${offset}, frequency=${frequency})`,
    );
  }
  return (ctx) => {
    if (ctx.tick % frequency !== offset) return [];
    const out: PolicyCommand<TCommandMap>[] = [];
    for (let i = 0; i < burst; i++) {
      const idx = Math.floor(ctx.random() * catalog.length);
      out.push(catalog[idx](ctx));
    }
    return out;
  };
}

export interface SynthPlaytestConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  world: World<TEventMap, TCommandMap, TComponents, TState>;
  policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
  maxTicks: number;
  sink?: SessionSink & SessionSource;
  sourceLabel?: string;
  policySeed?: number;
  stopWhen?: (ctx: StopContext<TEventMap, TCommandMap, TComponents, TState>) => boolean;
  snapshotInterval?: number | null;
}

export interface SynthPlaytestResult<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TDebug = JsonValue,
> {
  bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
  ticksRun: number;
  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError';
  ok: boolean;
  policyError?: {
    policyIndex: number;
    tick: number;
    error: { name: string; message: string; stack: string | null };
  };
}

export function runSynthPlaytest<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  config: SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState>,
): SynthPlaytestResult<TEventMap, TCommandMap> {
  // Step 1: validation. Pre-check world poison BEFORE deriving the default sub-RNG
  // seed via world.random() — otherwise a rejected call advances world.rng and
  // perturbs future deterministic behavior after world.recover().
  if (!Number.isInteger(config.maxTicks) || config.maxTicks < 1) {
    throw new RangeError(`maxTicks must be a positive integer (got ${config.maxTicks})`);
  }
  if (config.policySeed !== undefined && !Number.isInteger(config.policySeed)) {
    throw new RangeError(`policySeed must be a finite integer (got ${config.policySeed})`);
  }
  if (config.world.isPoisoned()) {
    // Match SessionRecorder.connect()'s poisoned-world guard exactly so callers
    // get a consistent error shape regardless of which check fires first.
    throw new RecorderClosedError(
      'cannot run synthetic playtest on a poisoned world; call world.recover() first',
      { code: 'world_poisoned' },
    );
  }

  const { world, policies, maxTicks, sink, sourceLabel } = config;
  // Use 'in' to distinguish unset from explicit-null (??1000 would coerce null to 1000 — null disables periodic snapshots).
  const snapshotInterval: number | null =
    'snapshotInterval' in config && config.snapshotInterval !== undefined
      ? config.snapshotInterval
      : 1000;

  // Step 2: sub-RNG init (BEFORE recorder.connect so initial snapshot reflects post-derivation world.rng state).
  // ADR 19: Math.floor(world.random() * 0x1_0000_0000) scales [0,1) to a uint32 — required because
  // DeterministicRandom.seedToUint32's Math.trunc(x)>>>0 collapses [0,1) to 0.
  const policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000);
  const subRng = new DeterministicRandom(policySeed);
  const random = (): number => subRng.random();

  // Step 3: recorder attach. terminalSnapshot:true is hardcoded — every bundle gets the
  // (initial, terminal) segment so SessionReplayer.selfCheck has a non-empty segment to validate.
  const effectiveSink: SessionSink & SessionSource = sink ?? new MemorySink();
  // SessionRecorder is 3-generic (no TComponents/TState); doesn't access them. Cast is structurally safe.
  const recorder = new SessionRecorder<TEventMap, TCommandMap>({
    world: world as unknown as World<TEventMap, TCommandMap>,
    sink: effectiveSink,
    snapshotInterval,
    terminalSnapshot: true,
    sourceLabel: sourceLabel ?? 'synthetic',
    sourceKind: 'synthetic',
    policySeed,
  });
  recorder.connect();
  if (recorder.lastError !== null) {
    // Connect-time sink failure: propagate. recorder.connect() does NOT throw on
    // sink.open() failure — it sets _lastError + _terminated and returns. The initial
    // snapshot may not have been persisted, so there's no coherent bundle to return.
    const err = recorder.lastError;
    try { recorder.disconnect(); } catch { /* best-effort */ }
    throw err;
  }

  // Step 4: tick loop.
  let ticksRun = 0;
  let stopReason: SynthPlaytestResult<TEventMap, TCommandMap>['stopReason'] = 'maxTicks';
  let policyError: SynthPlaytestResult<TEventMap, TCommandMap>['policyError'];

  outer: for (let i = 0; i < maxTicks; i++) {
    const policyCtx: PolicyContext<TEventMap, TCommandMap, TComponents, TState> = {
      world, tick: world.tick + 1, random,
    };
    for (let p = 0; p < policies.length; p++) {
      let cmds: PolicyCommand<TCommandMap>[];
      try {
        cmds = policies[p](policyCtx);
      } catch (err) {
        const e = err as Error;
        stopReason = 'policyError';
        policyError = {
          policyIndex: p,
          tick: policyCtx.tick,
          error: { name: e.name ?? 'Error', message: e.message ?? String(e), stack: e.stack ?? null },
        };
        break outer;
      }
      for (const cmd of cmds) {
        world.submitWithResult(cmd.type, cmd.data);
      }
    }
    try {
      world.step();
    } catch {
      stopReason = 'poisoned';
      break;
    }
    if (recorder.lastError !== null) {
      stopReason = 'sinkError';
      break;
    }
    ticksRun++;
    const stopCtx: StopContext<TEventMap, TCommandMap, TComponents, TState> = {
      world, tick: world.tick, random,
    };
    if (config.stopWhen?.(stopCtx)) {
      stopReason = 'stopWhen';
      break;
    }
  }

  // Step 5: disconnect + return.
  try { recorder.disconnect(); } catch { /* best-effort */ }
  // Tighten ok: also flips false if disconnect-time sink failure occurred.
  const ok = stopReason !== 'sinkError' && recorder.lastError === null;
  const bundle = recorder.toBundle() as unknown as SessionBundle<TEventMap, TCommandMap>;
  return { bundle, ticksRun, stopReason, ok, policyError };
}
