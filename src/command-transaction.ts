import { assertJsonCompatible } from './json.js';
import type { EntityId, Position } from './types.js';
import type { World } from './world.js';

/**
 * Single source of truth for methods a transaction precondition cannot call.
 * Exhaustive against `World`'s public mutating, lifecycle, listener, RNG, and
 * sub-engine surface. The type-level `Omit` and the runtime `Set` derive from
 * this same array so the two stay in lockstep.
 */
export const FORBIDDEN_PRECONDITION_METHODS = [
  // Component / position writes
  'setComponent', 'addComponent', 'patchComponent', 'removeComponent', 'setPosition',
  // Entity lifecycle
  'createEntity', 'destroyEntity',
  // Tags / metadata / world state
  'addTag', 'removeTag', 'setMeta', 'deleteMeta', 'setState', 'deleteState',
  // Resources (incl. flow / pool config)
  'addResource', 'removeResource', 'addTransfer', 'removeTransfer',
  'setResourceMax', 'setProduction', 'setConsumption',
  // Events / commands
  'emit', 'submit', 'submitWithResult',
  // Tick / engine lifecycle
  'step', 'stepWithResult', 'recover',
  'start', 'stop', 'setSpeed', 'pause', 'resume',
  // Registration (mutates engine config)
  'registerSystem', 'registerValidator', 'registerHandler',
  'registerComponent', 'registerResource',
  // Listener subscriptions (mutate listener registries)
  'on', 'off',
  'onDestroy', 'offDestroy',
  'onTickFailure', 'offTickFailure',
  'onCommandResult', 'offCommandResult',
  'onCommandExecution', 'offCommandExecution',
  'onDiff', 'offDiff',
  // Sub-engine entry points (transaction recursion + serialize is pseudo-read but warns and clones)
  'transaction', 'serialize',
  // RNG (mutates DeterministicRandom.state)
  'random',
] as const;

type ForbiddenMethod = (typeof FORBIDDEN_PRECONDITION_METHODS)[number];

/**
 * The subset of `World` that a transaction precondition is allowed to call.
 * Mutating, lifecycle-changing, listener-subscribing, and RNG-advancing
 * methods are excluded both at the type level (this `Omit`) and at runtime
 * (the `FORBIDDEN_PRECONDITION_METHODS` set is checked by the proxy).
 *
 * Note: TypeScript `private` is type-only, so a determined caller can still
 * cast to `any` and reach private fields like `gameLoop` or `rng`. The proxy
 * does not block that escape; treat `as any` casts inside a precondition as a
 * caller-side contract violation. The contract this proxy enforces is "no
 * accidental writes via the public `World` surface."
 */
export type ReadOnlyTransactionWorld<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends Record<keyof TComponents, unknown> = Record<string, unknown>,
  TState extends Record<keyof TState, unknown> = Record<string, unknown>,
> = Omit<World<TEventMap, TCommandMap, TComponents, TState>, ForbiddenMethod>;

export type TransactionPrecondition<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends Record<keyof TComponents, unknown> = Record<string, unknown>,
  TState extends Record<keyof TState, unknown> = Record<string, unknown>,
> = (
  world: ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState>,
) => true | false | string;

const FORBIDDEN_IN_PRECONDITION: ReadonlySet<string | symbol> = new Set<string | symbol>(
  FORBIDDEN_PRECONDITION_METHODS,
);

function makeReadOnlyTransactionWorld<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends Record<keyof TComponents, unknown>,
  TState extends Record<keyof TState, unknown>,
>(
  world: World<TEventMap, TCommandMap, TComponents, TState>,
): ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState> {
  return new Proxy(world, {
    get(target, prop, receiver) {
      if (FORBIDDEN_IN_PRECONDITION.has(prop)) {
        throw new Error(
          `CommandTransaction precondition cannot call '${String(prop)}': preconditions must be side-effect free`,
        );
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(_target, prop) {
      throw new Error(
        `CommandTransaction precondition cannot set property '${String(prop)}' on World`,
      );
    },
    deleteProperty(_target, prop) {
      throw new Error(
        `CommandTransaction precondition cannot delete property '${String(prop)}' on World`,
      );
    },
  }) as unknown as ReadOnlyTransactionWorld<TEventMap, TCommandMap, TComponents, TState>;
}

type Mutation =
  | { kind: 'setComponent'; entity: EntityId; key: string; data: unknown }
  | { kind: 'removeComponent'; entity: EntityId; key: string }
  | { kind: 'patchComponent'; entity: EntityId; key: string; patch: (data: unknown) => unknown }
  | { kind: 'setPosition'; entity: EntityId; position: Position; key?: string }
  | { kind: 'addResource'; entity: EntityId; resource: string; amount: number }
  | { kind: 'removeResource'; entity: EntityId; resource: string; amount: number };

type BufferedEvent = { type: string; data: unknown };

export type TransactionResult =
  | { ok: true; mutationsApplied: number; eventsEmitted: number }
  | { ok: false; code: 'precondition_failed'; reason: string }
  | { ok: false; code: 'aborted' };

type TransactionStatus = 'pending' | 'aborted' | 'committed';
type TerminalReason = 'committed' | 'aborted';

export class CommandTransaction<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends Record<keyof TComponents, unknown> = Record<string, unknown>,
  TState extends Record<keyof TState, unknown> = Record<string, unknown>,
> {
  private status: TransactionStatus = 'pending';
  private terminalReason: TerminalReason | null = null;
  private mutations: Mutation[] = [];
  private events: BufferedEvent[] = [];
  private preconditions: TransactionPrecondition<TEventMap, TCommandMap, TComponents, TState>[] = [];

  constructor(private readonly world: World<TEventMap, TCommandMap, TComponents, TState>) {}

  setComponent<K extends keyof TComponents & string>(
    entity: EntityId,
    key: K,
    data: TComponents[K],
  ): this;
  setComponent<T>(entity: EntityId, key: string, data: T): this;
  setComponent(entity: EntityId, key: string, data: unknown): this {
    this.assertPending();
    this.mutations.push({ kind: 'setComponent', entity, key, data });
    return this;
  }

  addComponent<K extends keyof TComponents & string>(
    entity: EntityId,
    key: K,
    data: TComponents[K],
  ): this;
  addComponent<T>(entity: EntityId, key: string, data: T): this;
  addComponent(entity: EntityId, key: string, data: unknown): this {
    return this.setComponent(entity, key, data);
  }

  patchComponent<K extends keyof TComponents & string>(
    entity: EntityId,
    key: K,
    patch: (data: TComponents[K]) => TComponents[K] | void,
  ): this;
  patchComponent<T>(entity: EntityId, key: string, patch: (data: T) => T | void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patchComponent(entity: EntityId, key: string, patch: (data: any) => any): this {
    this.assertPending();
    this.mutations.push({ kind: 'patchComponent', entity, key, patch });
    return this;
  }

  removeComponent<K extends keyof TComponents & string>(entity: EntityId, key: K): this;
  removeComponent(entity: EntityId, key: string): this;
  removeComponent(entity: EntityId, key: string): this {
    this.assertPending();
    this.mutations.push({ kind: 'removeComponent', entity, key });
    return this;
  }

  setPosition(entity: EntityId, position: Position, key?: string): this {
    this.assertPending();
    this.mutations.push({ kind: 'setPosition', entity, position, key });
    return this;
  }

  addResource(entity: EntityId, resource: string, amount: number): this {
    this.assertPending();
    this.mutations.push({ kind: 'addResource', entity, resource, amount });
    return this;
  }

  removeResource(entity: EntityId, resource: string, amount: number): this {
    this.assertPending();
    this.mutations.push({ kind: 'removeResource', entity, resource, amount });
    return this;
  }

  emit<K extends keyof TEventMap & string>(type: K, data: TEventMap[K]): this;
  emit(type: string, data: unknown): this;
  emit(type: string, data: unknown): this {
    this.assertPending();
    assertJsonCompatible(data, `CommandTransaction.emit('${type}') payload`);
    this.events.push({ type, data });
    return this;
  }

  require(
    predicate: TransactionPrecondition<TEventMap, TCommandMap, TComponents, TState>,
  ): this {
    this.assertPending();
    if (typeof predicate !== 'function') {
      throw new Error('CommandTransaction.require expects a function');
    }
    this.preconditions.push(predicate);
    return this;
  }

  abort(): void {
    if (this.status === 'pending') {
      this.status = 'aborted';
      this.terminalReason = 'aborted';
    }
  }

  commit(): TransactionResult {
    if (this.status === 'committed') {
      const reason = this.terminalReason ?? 'committed';
      throw new Error(`CommandTransaction already ${reason}`);
    }
    if (this.status === 'aborted') {
      // Mark as terminal so a subsequent commit() throws rather than silently
      // returning aborted again. terminalReason stays 'aborted' so error
      // messages reflect the original terminal state.
      this.status = 'committed';
      return { ok: false, code: 'aborted' };
    }

    this.world.warnIfPoisoned('transaction');

    // Finalize the transaction synchronously around the precondition / mutation
    // / emit loops. If a mutation or event throws, the transaction is still
    // consumed — a retry must NOT re-apply the partial bundle.
    try {
      const readOnlyWorld = makeReadOnlyTransactionWorld(this.world);
      for (const predicate of this.preconditions) {
        const verdict = predicate(readOnlyWorld);
        if (verdict === true) continue;
        const reason =
          typeof verdict === 'string'
            ? verdict
            : verdict === false
            ? 'precondition returned false'
            : 'precondition returned an invalid verdict';
        return { ok: false, code: 'precondition_failed', reason };
      }

      let applied = 0;
      for (const mutation of this.mutations) {
        this.applyMutation(mutation);
        applied++;
      }

      let emitted = 0;
      for (const event of this.events) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.world.emit(event.type as any, event.data as any);
        emitted++;
      }

      return { ok: true, mutationsApplied: applied, eventsEmitted: emitted };
    } finally {
      this.status = 'committed';
      this.terminalReason ??= 'committed';
    }
  }

  private applyMutation(mutation: Mutation): void {
    switch (mutation.kind) {
      case 'setComponent':
        this.world.setComponent(mutation.entity, mutation.key, mutation.data);
        return;
      case 'removeComponent':
        this.world.removeComponent(mutation.entity, mutation.key);
        return;
      case 'patchComponent':
        this.world.patchComponent(mutation.entity, mutation.key, mutation.patch);
        return;
      case 'setPosition':
        if (mutation.key !== undefined) {
          this.world.setPosition(mutation.entity, mutation.position, mutation.key);
        } else {
          this.world.setPosition(mutation.entity, mutation.position);
        }
        return;
      case 'addResource':
        this.world.addResource(mutation.entity, mutation.resource, mutation.amount);
        return;
      case 'removeResource':
        this.world.removeResource(
          mutation.entity,
          mutation.resource,
          mutation.amount,
        );
        return;
    }
  }

  private assertPending(): void {
    if (this.status === 'pending') return;
    const reason = this.terminalReason ?? 'committed';
    throw new Error(`CommandTransaction already ${reason}`);
  }
}
