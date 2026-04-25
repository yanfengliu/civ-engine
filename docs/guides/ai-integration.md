# AI Integration Guide

This guide covers the engine surfaces that matter for a text-based AI agent running a tight implement-debug-iterate loop.

The core rule is simple: keep the semantics in the engine, not in an external wrapper. Docs and MCP can sit on top later, but the engine itself should already expose stable machine-readable outcomes.

## What Matters

An AI agent needs four things from the engine:

1. Structured command outcomes
2. Structured diagnosis
3. Short-horizon history
4. Deterministic replayable behavior

`civ-engine` now provides all four at a practical baseline.

It also exports explicit version markers through `getAiContractVersions()`, so an external agent can pin its parser to the current machine-facing contracts.

## Command Submission

Use `world.submitWithResult()` instead of `world.submit()` when the agent needs more than a pass/fail bit:

```typescript
const result = world.submitWithResult('moveUnit', {
  unit: selectedUnitRef,
  target: { x: 12, y: 7 },
});

if (!result.accepted) {
  console.log(result.code, result.message, result.details);
}
```

`CommandSubmissionResult` now includes `schemaVersion`, which lets an agent verify the result shape before branching on codes.

`submit()` still exists, but it throws away the structured context that an autonomous agent needs.

Submission is only the first half of the command lifecycle. `accepted` means the command was queued, not that its handler ran successfully.

Validator rejections can be simple booleans or structured objects:

```typescript
world.registerValidator('moveUnit', (data, w) => {
  if (!w.isCurrent(data.unit)) {
    return {
      code: 'stale_unit_ref',
      message: 'Unit reference is stale',
      details: { unit: data.unit },
    };
  }
  return true;
});
```

## Command Execution

Use `world.onCommandExecution()` when the agent needs to know whether queued commands actually ran:

```typescript
world.onCommandExecution((result) => {
  console.log(result.executed, result.code, result.tick);
});
```

This closes the gap between:

- `submitWithResult()` -> queue-time validation outcome
- `onCommandExecution()` -> tick-time execution outcome

For AI loops, do not infer execution success from diffs alone when an explicit execution result exists.

## Tick Failure Surface

Tick failures are **fail-fast**: any failure in the tick pipeline marks the world as poisoned. Subsequent calls to `step()` throw `WorldTickFailureError` and `stepWithResult()` returns a `world_poisoned` failure result until `world.recover()` is called. The contract makes the partial-mutation state explicit instead of letting agents silently re-enter a half-broken world.

Use `world.stepWithResult()` instead of `world.step()` when the agent needs a non-throwing tick loop:

```typescript
const step = world.stepWithResult();

if (!step.ok) {
  console.log(step.failure?.code, step.failure?.phase, step.failure?.subsystem);
  // The world is now poisoned. Decide whether to recover or reset.
  if (canHandle(step.failure)) {
    world.recover(); // clears poison + cached failure/diff/metrics
  } else {
    // restart from a known snapshot
    world = World.deserialize(lastSnapshot);
  }
}
```

`step()` remains available, but it throws `WorldTickFailureError` on runtime failure AND on every subsequent step until `recover()` is called. `stepWithResult()` is the preferred AI-facing surface because it returns `WorldStepResult` directly.

Failed ticks consume a tick number. If a tick fails at would-be tick `N+1`, `world.tick` advances to `N+1`; the next successful tick after `recover()` is `N+2`. This guarantees that failed-tick events and successful-tick events never share a `tick` value, so a history recorder or replay tool can correlate by tick number unambiguously.

When a command handler throws (or its handler is missing), every command queued for that tick that has not yet executed is emitted as a `commandExecuted: false` event with `code: 'tick_aborted_before_handler'`, and the dropped commands' `submissionSequence`s are recorded on `failure.details.droppedCommands`. The queue is not re-populated — these commands are dropped, not retried.

The most recent runtime failure is also available through `world.getLastTickFailure()` (until `recover()` clears it).

## Runtime Profiles

Keep AI loops on the default `instrumentationProfile: 'full'`.

When the gameplay stack is stable enough for a shipping runtime, create the world with:

```typescript
const world = new World({
  gridWidth: 128,
  gridHeight: 128,
  tps: 20,
  instrumentationProfile: 'release',
});
```

The intended split is:

- `full` for AI development
- `minimal` for QA and staging
- `release` for shipping builds

In `minimal` mode:

- implicit `step()` keeps counts and total tick duration
- detailed phase timings and per-system timing entries are skipped
- `submit()` uses the lower-overhead boolean fast path when no command-result listeners are attached

In `release` mode:

- implicit `step()` skips per-tick metrics collection
- `submit()` uses a boolean fast path when no command-result listeners are attached
- explicit AI/debug APIs such as `submitWithResult()` and `stepWithResult()` still produce structured results when you call them

## Transport Protocol

When the agent is outside the process, use `ClientAdapter`.

The important messages are:

- `snapshot`
- `tick`
- `commandAccepted`
- `commandRejected`
- `commandExecuted`
- `commandFailed`
- `tickFailed`

`commandRejected` includes `code`, `message`, `details`, and `validatorIndex`. That tells the agent why a command never entered the queue.

`commandExecuted` and `commandFailed` report tick-time command outcomes. `tickFailed` carries the structured `TickFailure` for the failed tick.

Server messages also include `protocolVersion`, so a remote agent can verify the transport contract on every envelope.

## Scenario Runner

Use `runScenario()` when the agent needs a repeatable experiment instead of manual setup and stepping:

```typescript
import { runScenario } from 'civ-engine';

const result = runScenario({
  name: 'villager-reaches-resource',
  world,
  setup: (ctx) => {
    // register components, systems, handlers, entities
  },
  run: (ctx) => {
    ctx.submit('moveVillager', payload);
    const wait = ctx.stepUntil(
      (active) => active.world.tick >= 20,
      { maxTicks: 40 },
    );
    return wait.failure;
  },
});
```

The runner gives the agent one structured result object containing final state, debug output, issues, recent history, and check results.

## Debugging and Diagnosis

For diagnostic workflows, error code reference, debugging scenarios, and the recommended closed loop, see the [Debugging Guide](./debugging.md).

## MCP and Wrappers

If you expose the engine through MCP later, keep the adapter thin.

Good MCP tools would wrap existing engine-native operations such as:

- submit command
- step world
- capture debug snapshot
- fetch recent history
- compare recorded ticks

Do not invent semantics in the MCP layer that the engine itself does not already expose.
