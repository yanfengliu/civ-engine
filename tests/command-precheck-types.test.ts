import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  World, type CommandPrecheckResult, type CommandSubmissionResult, type ReadOnlyTransactionWorld,
} from '../src/index.js';
import type { CommandPrecheckResult as BrowserPrecheckResult } from '../src/index.browser.js';

const symbolCommand = Symbol('symbol command');
type Commands = {
  move: { target: { x: number; y: number } };
  cancel: { entity: number };
  7: { n: number };
  [symbolCommand]: { ready: boolean };
};
const createWorld = () => new World<Record<string, never>, Commands>({ gridWidth: 4, gridHeight: 4, tps: 10 });

// Compiled by the ordinary noEmit gate, never executed. These are explicit negative
// consumer uses, independent of the exported transaction deny-list's own type.
function invalidConsumers(world: ReturnType<typeof createWorld>, readonly: ReadOnlyTransactionWorld<Record<string, never>, Commands>) {
  // @ts-expect-error unknown command key
  world.precheckCommand('missing', {});
  // @ts-expect-error payload must match the selected command
  world.precheckCommand('move', { entity: 1 });
  const observed = world.precheckCommand('cancel', { entity: 1 });
  // @ts-expect-error an observation is not a submission result
  const submitted: CommandSubmissionResult<'cancel'> = observed;
  // @ts-expect-error no submission identity is allocated
  void observed.sequence;
  // @ts-expect-error this observation is not a versioned durable record
  void observed.schemaVersion;
  // @ts-expect-error validators can mutate, so readonly preconditions cannot precheck
  readonly.precheckCommand('cancel', { entity: 1 });
  return submitted;
}
void invalidConsumers;

describe('public command precheck consumer types', () => {
  it('preserves literal string, numeric and symbol keys on actual observations', () => {
    const world = createWorld();
    const move = world.precheckCommand('move', { target: { x: 1, y: 2 } });
    expectTypeOf(move).toEqualTypeOf<CommandPrecheckResult<'move'>>();
    const consumer: CommandPrecheckResult = move;
    const browser: BrowserPrecheckResult = consumer;
    expectTypeOf<CommandPrecheckResult>().toEqualTypeOf<BrowserPrecheckResult>();
    expect(browser).toEqual({
      accepted: true, commandType: 'move', code: 'accepted', message: 'Command passed validation',
      details: null, tick: 0, validatorIndex: null,
    });
    const numeric = world.precheckCommand(7, { n: 1 });
    expectTypeOf(numeric.commandType).toEqualTypeOf<7>();
    expect(numeric.commandType).toBe(7);
    const symbolic = world.precheckCommand(symbolCommand, { ready: true });
    expectTypeOf(symbolic.commandType).toEqualTypeOf<typeof symbolCommand>();
    expect(symbolic.commandType).toBe(symbolCommand);
    const submitted: CommandSubmissionResult<'cancel'> = world.submitWithResult('cancel', { entity: 1 });
    expect(submitted.sequence).toBe(0);
    expect(world.submit('cancel', { entity: 1 })).toBe(true);
  });
});
