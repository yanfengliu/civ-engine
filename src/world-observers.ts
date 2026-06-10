// Observer & passthrough layer of the `World` class chain: typed events,
// resource-store delegates, the world-state key/value store, diff/metrics
// getters, and every listener registry (diff, command result/execution,
// tick failure).

import type { EntityId } from './types.js';
import type { TickDiff } from './diff.js';
import type { ResourceMax, ResourcePool } from './resource-store.js';
import { assertJsonCompatible } from './json.js';
import { cloneMetrics, cloneTickDiff, cloneTickFailure } from './world-internal.js';
import { assertWritable } from './world-strict-mode.js';
import type {
  CommandExecutionResult,
  CommandSubmissionResult,
  ComponentRegistry,
  TickFailure,
  WorldMetrics,
} from './world-types.js';
import { WorldEntities } from './world-entities.js';

export abstract class WorldObservers<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends WorldEntities<TEventMap, TCommandMap, TComponents, TState> {
  emit<K extends keyof TEventMap>(type: K, data: TEventMap[K]): void {
    assertWritable(this, 'emit');
    this.eventBus.emit(type, data);
  }

  on<K extends keyof TEventMap>(
    type: K,
    listener: (event: TEventMap[K]) => void,
  ): void {
    this.eventBus.on(type, listener);
  }

  off<K extends keyof TEventMap>(
    type: K,
    listener: (event: TEventMap[K]) => void,
  ): void {
    this.eventBus.off(type, listener);
  }

  getEvents(): ReadonlyArray<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }> {
    return this.eventBus.getEvents();
  }

  getDiff(): TickDiff | null {
    return this.currentDiff ? cloneTickDiff(this.currentDiff) : null;
  }

  getMetrics(): WorldMetrics | null {
    return this.currentMetrics ? cloneMetrics(this.currentMetrics) : null;
  }

  getLastTickFailure(): TickFailure | null {
    return this.lastTickFailure ? cloneTickFailure(this.lastTickFailure) : null;
  }

  onDiff(fn: (diff: TickDiff) => void): void {
    this.diffListeners.add(fn);
  }

  offDiff(fn: (diff: TickDiff) => void): void {
    this.diffListeners.delete(fn);
  }

  onCommandResult(
    listener: (result: CommandSubmissionResult<keyof TCommandMap>) => void,
  ): void {
    this.commandResultListeners.add(listener);
  }

  offCommandResult(
    listener: (result: CommandSubmissionResult<keyof TCommandMap>) => void,
  ): void {
    this.commandResultListeners.delete(listener);
  }

  onCommandExecution(
    listener: (result: CommandExecutionResult<keyof TCommandMap>) => void,
  ): void {
    this.commandExecutionListeners.add(listener);
  }

  offCommandExecution(
    listener: (result: CommandExecutionResult<keyof TCommandMap>) => void,
  ): void {
    this.commandExecutionListeners.delete(listener);
  }

  onTickFailure(listener: (failure: TickFailure) => void): void {
    this.tickFailureListeners.add(listener);
  }

  offTickFailure(listener: (failure: TickFailure) => void): void {
    this.tickFailureListeners.delete(listener);
  }

  registerResource(key: string, options?: { defaultMax?: ResourceMax }): void {
    this.resourceStore.register(key, options);
  }

  addResource(entity: EntityId, key: string, amount: number): number {
    assertWritable(this, 'addResource');
    this.assertAlive(entity);
    return this.resourceStore.addResource(entity, key, amount);
  }

  removeResource(entity: EntityId, key: string, amount: number): number {
    assertWritable(this, 'removeResource');
    this.assertAlive(entity);
    return this.resourceStore.removeResource(entity, key, amount);
  }

  getResource(
    entity: EntityId,
    key: string,
  ): ResourcePool | undefined {
    return this.resourceStore.getResource(entity, key);
  }

  setResourceMax(entity: EntityId, key: string, max: ResourceMax): void {
    assertWritable(this, 'setResourceMax');
    this.assertAlive(entity);
    this.resourceStore.setResourceMax(entity, key, max);
  }

  *getResourceEntities(key: string): IterableIterator<EntityId> {
    yield* this.resourceStore.getResourceEntities(key);
  }

  setProduction(entity: EntityId, key: string, rate: number): void {
    assertWritable(this, 'setProduction');
    this.assertAlive(entity);
    this.resourceStore.setProduction(entity, key, rate);
  }

  setConsumption(entity: EntityId, key: string, rate: number): void {
    assertWritable(this, 'setConsumption');
    this.assertAlive(entity);
    this.resourceStore.setConsumption(entity, key, rate);
  }

  getProduction(entity: EntityId, key: string): number {
    return this.resourceStore.getProduction(entity, key);
  }

  getConsumption(entity: EntityId, key: string): number {
    return this.resourceStore.getConsumption(entity, key);
  }

  addTransfer(
    from: EntityId,
    to: EntityId,
    resource: string,
    rate: number,
  ): number {
    assertWritable(this, 'addTransfer');
    this.assertAlive(from);
    this.assertAlive(to);
    return this.resourceStore.addTransfer(from, to, resource, rate);
  }

  removeTransfer(id: number): void {
    assertWritable(this, 'removeTransfer');
    this.resourceStore.removeTransfer(id);
  }

  getTransfers(
    entity: EntityId,
  ): Array<{
    id: number;
    from: EntityId;
    to: EntityId;
    resource: string;
    rate: number;
  }> {
    return this.resourceStore.getTransfers(entity);
  }

  setState<K extends keyof TState & string>(key: K, value: TState[K]): void;
  setState(key: string, value: unknown): void;
  setState(key: string, value: unknown): void {
    assertWritable(this, 'setState');
    assertJsonCompatible(value, `state '${key}'`);
    this.stateStore.set(key, value);
    this.stateDirtyKeys.add(key);
    this.stateRemovedKeys.delete(key);
  }

  getState<K extends keyof TState & string>(key: K): TState[K] | undefined;
  getState(key: string): unknown;
  getState(key: string): unknown {
    return this.stateStore.get(key);
  }

  deleteState<K extends keyof TState & string>(key: K): void;
  deleteState(key: string): void;
  deleteState(key: string): void {
    assertWritable(this, 'deleteState');
    if (this.stateStore.has(key)) {
      this.stateStore.delete(key);
      this.stateDirtyKeys.delete(key);
      this.stateRemovedKeys.add(key);
    }
  }

  hasState<K extends keyof TState & string>(key: K): boolean;
  hasState(key: string): boolean;
  hasState(key: string): boolean {
    return this.stateStore.has(key);
  }
}
