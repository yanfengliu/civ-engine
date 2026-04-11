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

`submit()` still exists, but it throws away the structured context that an autonomous agent needs.

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

## Transport Protocol

When the agent is outside the process, use `ClientAdapter`.

The important messages are:

- `snapshot`
- `tick`
- `commandAccepted`
- `commandRejected`

`commandRejected` includes `code`, `message`, `details`, and `validatorIndex`. That gives an agent enough structure to decide whether to retry, resync, or change its behavior.

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
- recent command outcomes
- recent tick diffs
- events
- metrics
- optional debug payloads

This is intentionally short-horizon. It is for fast diagnosis, not archival replay.

## Recommended Closed Loop

For an autonomous agent, the basic loop should be:

1. Submit a command with `submitWithResult()` or through `ClientAdapter`
2. If rejected, branch on `code`
3. Step the world
4. Inspect `WorldDebugger.capture().issues`
5. Inspect recent `WorldHistoryRecorder` state when the cause is not obvious
6. Change code or commands
7. Repeat

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
