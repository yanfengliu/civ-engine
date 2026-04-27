import type { World, ComponentRegistry } from './world.js';

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
