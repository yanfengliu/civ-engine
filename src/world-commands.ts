// Command layer of the `World` class chain: submission + validation, queue
// drain + handler execution at tick time, structured submission/execution
// results and their listener emission, transactions, and the shared
// `TickFailure` construction used by the tick layer above.

import { EngineError } from './engine-error.js';
import type { JsonValue } from './json.js';
import { assertJsonCompatible } from './json.js';
import {
  COMMAND_EXECUTION_SCHEMA_VERSION,
  COMMAND_RESULT_SCHEMA_VERSION,
  TICK_FAILURE_SCHEMA_VERSION,
} from './ai-contract.js';
import { CommandTransaction } from './command-transaction.js';
import {
  cloneTickFailure,
  createErrorDetails,
  errorMessage,
  normalizeCommandValidationResult,
} from './world-internal.js';
import type {
  CommandExecutionResult,
  CommandSubmissionResult,
  CommandValidationResult,
  ComponentRegistry,
  TickFailure,
  TickFailurePhase,
} from './world-types.js';
import { WorldObservers } from './world-observers.js';
import type { World } from './world.js';

export abstract class WorldCommands<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends WorldObservers<TEventMap, TCommandMap, TComponents, TState> {
  submit<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): boolean {
    return this.submitWithResult(type, data).accepted;
  }

  transaction(): CommandTransaction<TEventMap, TCommandMap, TComponents, TState> {
    return new CommandTransaction<TEventMap, TCommandMap, TComponents, TState>(this.asWorld());
  }

  submitWithResult<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
  ): CommandSubmissionResult<K> {
    this.warnIfPoisoned('submit');
    const rejection = this.validateCommand(type, data);
    if (rejection) {
      const result = this.createCommandSubmissionResult(type, {
        accepted: false,
        code: rejection.code,
        message: rejection.message,
        details: rejection.details,
        validatorIndex: rejection.validatorIndex,
      });
      this.emitCommandResult(result);
      return result;
    }

    const result = this.createCommandSubmissionResult(type, {
      accepted: true,
      code: 'accepted',
      message: 'Queued command',
      details: null,
      validatorIndex: null,
    });
    this.commandQueue.push(type, data, {
      submissionSequence: result.sequence,
    });
    this.emitCommandResult(result);
    return result;
  }

  registerValidator<K extends keyof TCommandMap>(
    type: K,
    fn: (
      data: TCommandMap[K],
      world: World<TEventMap, TCommandMap, TComponents, TState>,
    ) => CommandValidationResult,
  ): void {
    let fns = this.validators.get(type);
    if (!fns) {
      fns = [];
      this.validators.set(type, fns);
    }
    fns.push(
      fn as (
        data: never,
        world: World<TEventMap, TCommandMap, TComponents, TState>,
      ) => CommandValidationResult,
    );
  }

  registerHandler<K extends keyof TCommandMap>(
    type: K,
    fn: (data: TCommandMap[K], world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
  ): void {
    if (this.handlers.has(type)) {
      throw new EngineError('handler_already_registered', `Handler already registered for command '${String(type)}'`, { details: { type: String(type) } });
    }
    this.handlers.set(
      type,
      fn as (data: never, world: World<TEventMap, TCommandMap, TComponents, TState>) => void,
    );
  }

  hasCommandHandler(type: keyof TCommandMap): boolean {
    return this.handlers.has(type);
  }

  protected processCommands(tick: number): {
    processed: number;
    failure: TickFailure | null;
  } {
    const commands = this.commandQueue.drain();
    let processed = 0;
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const handler = this.handlers.get(command.type);
      if (!handler) {
        const failureMessage = `No handler registered for command '${String(command.type)}'`;
        this.emitCommandExecution(command.type, {
          submissionSequence: command.submissionSequence,
          executed: false,
          code: 'missing_handler',
          message: failureMessage,
          details: null,
          tick,
        });
        const dropped = this.dropPendingCommands(commands, i + 1, tick);
        const failure = this.createTickFailure({
          tick,
          phase: 'commands',
          code: 'missing_handler',
          message: failureMessage,
          subsystem: 'commands',
          commandType: command.type,
          submissionSequence: command.submissionSequence,
          details: dropped.length > 0 ? { droppedCommands: dropped } : null,
        });
        return { processed, failure };
      }

      try {
        handler(command.data as never, this.asWorld());
        processed++;
        this.emitCommandExecution(command.type, {
          submissionSequence: command.submissionSequence,
          executed: true,
          code: 'executed',
          message: 'Command handler completed',
          details: null,
          tick,
        });
      } catch (error) {
        const details = createErrorDetails(error);
        this.emitCommandExecution(command.type, {
          submissionSequence: command.submissionSequence,
          executed: false,
          code: 'command_handler_threw',
          message: errorMessage(error),
          details: {
            error: details,
          },
          tick,
        });
        const dropped = this.dropPendingCommands(commands, i + 1, tick);
        const failure = this.createTickFailure({
          tick,
          phase: 'commands',
          code: 'command_handler_threw',
          message: errorMessage(error),
          subsystem: 'commands',
          commandType: command.type,
          submissionSequence: command.submissionSequence,
          details: {
            commandType: String(command.type),
            submissionSequence: command.submissionSequence,
            error: details,
            ...(dropped.length > 0 ? { droppedCommands: dropped } : {}),
          },
          error,
        });
        return { processed, failure };
      }
    }

    return { processed, failure: null };
  }

  private dropPendingCommands(
    commands: ReadonlyArray<{
      type: keyof TCommandMap;
      submissionSequence: number | null;
    }>,
    startIndex: number,
    tick: number,
  ): Array<{ commandType: string; submissionSequence: number | null }> {
    const dropped: Array<{
      commandType: string;
      submissionSequence: number | null;
    }> = [];
    for (let i = startIndex; i < commands.length; i++) {
      const cmd = commands[i];
      this.emitCommandExecution(cmd.type, {
        submissionSequence: cmd.submissionSequence,
        executed: false,
        code: 'tick_aborted_before_handler',
        message: 'Command was queued for this tick but the tick aborted before its handler ran',
        details: null,
        tick,
      });
      dropped.push({
        commandType: String(cmd.type),
        submissionSequence: cmd.submissionSequence,
      });
    }
    return dropped;
  }

  private createCommandSubmissionResult<K extends keyof TCommandMap>(
    type: K,
    config: {
      accepted: boolean;
      code: string;
      message: string;
      details: JsonValue | null;
      validatorIndex: number | null;
    },
  ): CommandSubmissionResult<K> {
    if (config.details !== null) {
      assertJsonCompatible(config.details, `command result details for '${String(type)}'`);
    }
    return {
      schemaVersion: COMMAND_RESULT_SCHEMA_VERSION,
      accepted: config.accepted,
      commandType: type,
      code: config.code,
      message: config.message,
      details: config.details,
      tick: this.getObservableTick(),
      sequence: this.nextCommandResultSequence++,
      validatorIndex: config.validatorIndex,
    };
  }

  private createCommandExecutionResult<K extends keyof TCommandMap>(
    type: K,
    config: {
      submissionSequence: number | null;
      executed: boolean;
      code: string;
      message: string;
      details: JsonValue | null;
      tick: number;
    },
  ): CommandExecutionResult<K> {
    if (config.details !== null) {
      assertJsonCompatible(
        config.details,
        `command execution details for '${String(type)}'`,
      );
    }
    return {
      schemaVersion: COMMAND_EXECUTION_SCHEMA_VERSION,
      submissionSequence: config.submissionSequence,
      executed: config.executed,
      commandType: type,
      code: config.code,
      message: config.message,
      details: config.details,
      tick: config.tick,
    };
  }

  private emitCommandResult<K extends keyof TCommandMap>(
    result: CommandSubmissionResult<K>,
  ): void {
    for (const listener of this.commandResultListeners) {
      try {
        listener(result as CommandSubmissionResult<keyof TCommandMap>);
      } catch (error) {
        console.error('commandResultListener threw:', error);
      }
    }
  }

  private emitCommandExecutionResult<K extends keyof TCommandMap>(
    result: CommandExecutionResult<K>,
  ): void {
    for (const listener of this.commandExecutionListeners) {
      try {
        listener(result as CommandExecutionResult<keyof TCommandMap>);
      } catch (error) {
        console.error('commandExecutionListener threw:', error);
      }
    }
  }

  protected emitTickFailure(failure: TickFailure): void {
    for (const listener of this.tickFailureListeners) {
      try {
        listener(cloneTickFailure(failure));
      } catch (error) {
        console.error('tickFailureListener threw:', error);
      }
    }
  }

  protected createTickFailure(config: {
    tick: number;
    phase: TickFailurePhase;
    code: string;
    message: string;
    subsystem: string;
    commandType?: PropertyKey;
    submissionSequence?: number | null;
    systemName?: string;
    details?: JsonValue | null;
    error?: unknown;
  }): TickFailure {
    if (config.details !== undefined && config.details !== null) {
      assertJsonCompatible(
        config.details,
        `tick failure details for '${config.code}'`,
      );
    }
    return {
      schemaVersion: TICK_FAILURE_SCHEMA_VERSION,
      tick: config.tick,
      phase: config.phase,
      code: config.code,
      message: config.message,
      subsystem: config.subsystem,
      commandType:
        config.commandType !== undefined ? String(config.commandType) : null,
      submissionSequence: config.submissionSequence ?? null,
      systemName: config.systemName ?? null,
      details: config.details ?? null,
      error: config.error !== undefined ? createErrorDetails(config.error) : null,
    };
  }

  private validateCommand<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
  ): {
    code: string;
    message: string;
    details: JsonValue | null;
    validatorIndex: number;
  } | null {
    const fns = this.validators.get(type);
    if (!fns) {
      return null;
    }

    for (let index = 0; index < fns.length; index++) {
      const validation = (
        fns[index] as (
          data: TCommandMap[K],
          world: World<TEventMap, TCommandMap, TComponents, TState>,
        ) => CommandValidationResult
      )(data, this.asWorld());
      const rejection = normalizeCommandValidationResult(validation, index);
      if (rejection) {
        return rejection;
      }
    }

    return null;
  }

  private emitCommandExecution<K extends keyof TCommandMap>(
    type: K,
    config: {
      submissionSequence: number | null;
      executed: boolean;
      code: string;
      message: string;
      details: JsonValue | null;
      tick: number;
    },
  ): void {
    if (this.commandExecutionListeners.size === 0) {
      return;
    }
    this.emitCommandExecutionResult(this.createCommandExecutionResult(type, config));
  }
}
