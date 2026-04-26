import type { EntityId, Position } from './types.js';
import type { World } from './world.js';

export type TransactionPrecondition<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
> = (world: World<TEventMap>) => true | false | string;

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

type TransactionStatus = 'pending' | 'committed' | 'aborted';

export class CommandTransaction<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
> {
  private status: TransactionStatus = 'pending';
  private mutations: Mutation[] = [];
  private events: BufferedEvent[] = [];
  private preconditions: TransactionPrecondition<TEventMap>[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly world: World<TEventMap, any, any, any>) {}

  setComponent<T>(entity: EntityId, key: string, data: T): this {
    this.assertPending();
    this.mutations.push({ kind: 'setComponent', entity, key, data });
    return this;
  }

  addComponent<T>(entity: EntityId, key: string, data: T): this {
    return this.setComponent(entity, key, data);
  }

  patchComponent<T>(
    entity: EntityId,
    key: string,
    patch: (data: T) => T | void,
  ): this {
    this.assertPending();
    this.mutations.push({
      kind: 'patchComponent',
      entity,
      key,
      patch: patch as (data: unknown) => unknown,
    });
    return this;
  }

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
    this.events.push({ type, data });
    return this;
  }

  require(predicate: TransactionPrecondition<TEventMap>): this {
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
    }
  }

  commit(): TransactionResult {
    if (this.status === 'committed') {
      throw new Error('CommandTransaction already committed');
    }
    if (this.status === 'aborted') {
      // Mark as terminal so a subsequent commit() throws rather than silently
      // returning aborted again. Builder methods already throw on aborted.
      this.status = 'committed';
      return { ok: false, code: 'aborted' };
    }

    // Finalize the transaction synchronously around the mutation/emit loops.
    // If a mutation or event throws, the transaction is still consumed — a
    // retry must NOT re-apply the partial bundle (e.g., double-debit a
    // resource). Caller is told via the propagated error that the world is
    // partially mutated; it must not re-commit this transaction.
    try {
      for (const predicate of this.preconditions) {
        const verdict = predicate(this.world);
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
    if (this.status !== 'pending') {
      throw new Error(`CommandTransaction already ${this.status}`);
    }
  }
}
