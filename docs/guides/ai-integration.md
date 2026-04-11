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

Use `world.stepWithResult()` instead of `world.step()` when the agent needs a non-throwing tick loop:

```typescript
const step = world.stepWithResult();

if (!step.ok) {
  console.log(step.failure?.code, step.failure?.phase, step.failure?.subsystem);
}
```

`step()` remains available, but it throws `WorldTickFailureError` on runtime failure. `stepWithResult()` is the preferred AI-facing surface because it returns `WorldStepResult` directly.

The most recent runtime failure is also available through `world.getLastTickFailure()`.

## Release Profile

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

In release mode:

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

## Debugger Surface

Use `WorldDebugger` for machine-readable diagnosis:

```typescript
const debuggerView = new WorldDebugger({ world });
const debug = debuggerView.capture();

for (const issue of debug.issues) {
  console.log(issue.code, issue.subsystem, issue.details);
}
```

Prefer `issues` over `warnings`. `warnings` is a compatibility view that only preserves severity, code, and message.

## History Recorder

Use `WorldHistoryRecorder` when the agent needs to answer questions like:

- what happened in the last few ticks?
- which commands were rejected recently?
- did the last fix change the diff pattern?

```typescript
const history = new WorldHistoryRecorder({
  world,
  capacity: 64,
  debug: debuggerView,
});

history.connect();
```

The recorder keeps:

- the optional initial snapshot
- recent command submission outcomes
- recent command execution outcomes
- recent tick failures
- recent tick diffs
- events
- metrics
- optional debug payloads

This is intentionally short-horizon. It is for fast diagnosis, not archival replay.

When the agent needs a condensed answer instead of raw ticks, call `summarizeWorldHistoryRange()` on recorder state. That returns one range summary covering command outcomes, changed entity IDs, diff totals, event counts, and aggregated debugger issues.

## Recommended Closed Loop

For an autonomous agent, the basic loop should be:

1. Prefer `runScenario()` for repeatable experiments
2. If `result.failure` is present, branch on `failure.code`
3. If checks failed, inspect `result.checks`
4. Inspect `result.issues`
5. Inspect `result.history.executions` and `result.history.failures`
6. Use `summarizeWorldHistoryRange(result.history, { startTick, endTick })` when the cause is not obvious but the agent needs a shorter machine-readable explanation
7. Inspect `result.debug.metrics` for `tick-budget-exceeded` and other engine-native issues before assuming the logic is wrong
8. Fall back to direct `submitWithResult()` plus `stepWithResult()` only for interactive or exploratory workflows
9. Change code or commands
10. Repeat

That loop works in-process, across a worker boundary, or over a transport protocol without changing the semantics.

## MCP and Wrappers

If you expose the engine through MCP later, keep the adapter thin.

Good MCP tools would wrap existing engine-native operations such as:

- submit command
- step world
- capture debug snapshot
- fetch recent history
- compare recorded ticks

Do not invent semantics in the MCP layer that the engine itself does not already expose.
