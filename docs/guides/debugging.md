# Debugging Guide

This guide covers the headless debugging surface for `civ-engine`.

The short version: use `WorldDebugger` for a structured snapshot of world state, metrics, diff summaries, issues, and custom probe data. Pair it with `WorldHistoryRecorder` when you need short-horizon traces, and with `RenderAdapter` when you want a debug-first client before a production renderer exists.

For non-development runtimes, use the instrumentation profiles deliberately:

- `full`: detailed implicit metrics, best for AI debugging
- `minimal`: coarse implicit metrics, useful for QA and staging
- `release`: no implicit metrics on `step()`

Keep debugger-driven workflows on `full` when possible, or use `stepWithResult()` when you deliberately need diagnostics in a `minimal` or `release` world.

## What It Captures

`WorldDebugger` captures:

- `schemaVersion`
- tick and entity counts
- component and resource summaries
- spatial density summary from the world's position component
- last-tick metrics from `world.getMetrics()`
- last diff summary from `world.getDiff()`
- last structured runtime failure from `world.getLastTickFailure()`
- event counts from `world.getEvents()`
- machine-readable `issues` for engine-level edge cases such as same-tick ID recycling and tick-budget overruns
- compatibility `warnings` derived from those issues
- custom probe output

## Basic Usage

```typescript
import { WorldDebugger } from 'civ-engine';

const debuggerView = new WorldDebugger({ world });
const snapshot = debuggerView.capture();
```

## History Recorder

Use `WorldHistoryRecorder` when an AI agent or test harness needs recent command outcomes and tick traces without building a full replay system.

```typescript
import {
  WorldDebugger,
  WorldHistoryRecorder,
  summarizeWorldHistoryRange,
} from 'civ-engine';

const debuggerView = new WorldDebugger({ world });
const history = new WorldHistoryRecorder({
  world,
  capacity: 32,
  debug: debuggerView,
});

history.connect();

const summary = summarizeWorldHistoryRange(history.getState(), {
  startTick: 10,
  endTick: 14,
});
```

The recorder state also carries `schemaVersion`. For automated analysis, `summarizeWorldHistoryRange()` can collapse a window of recorded ticks into one object covering command submissions, command executions, tick failures, changed entities, event counts, and aggregated issues.

## Probes

The debugger is designed to inspect more than the `World` itself. Use probes for standalone utilities that matter to the game.

Built-in helpers:

```typescript
import {
  WorldDebugger,
  createOccupancyDebugProbe,
  createPathQueueDebugProbe,
  createVisibilityDebugProbe,
} from 'civ-engine';

const debuggerView = new WorldDebugger({
  world,
  probes: [
    createOccupancyDebugProbe('occupancy', occupancy),
    createVisibilityDebugProbe('visibility', visibility),
    createPathQueueDebugProbe('paths', pathQueue),
  ],
});
```

You can also add your own probe:

```typescript
debuggerView.addProbe({
  key: 'selection',
  capture: () => ({
    selectedIds: [...selectionStore.selectedIds()],
    hoverId: selectionStore.hoveredId(),
  }),
});
```

Probe payloads should stay JSON-compatible.

## Pairing with RenderAdapter

`RenderAdapter` can include debugger payloads in the render stream:

```typescript
import { RenderAdapter, WorldDebugger } from 'civ-engine';

const debuggerView = new WorldDebugger({ world });

const adapter = new RenderAdapter({
  world,
  projector,
  debug: debuggerView,
  send: (message) => transport.send(message),
});
```

That gives a debug client one message stream containing:

- projected render snapshot or render diff
- current debug snapshot

This is a good way to build a first viewer before a real renderer exists.

## Reference Debug Client

The source repository includes a browser reference viewer at `examples/debug-client/`. This example is not included in the npm package but is available in the [civ-engine repository](https://github.com/yanfengliu/civ-engine).

From a clone of the repository:

```bash
npm run debug:client
```

That command builds `dist/`, starts the static debug server, and serves the viewer at `/examples/debug-client/`.

The reference client is intentionally plain:

- a worker owns the `World`, `RenderAdapter`, `WorldDebugger`, `OccupancyGrid`, `VisibilityMap`, and queued path service
- the main thread consumes `renderSnapshot` and `renderTick` messages only
- the canvas renders projected entities, fog, occupancy, reservations, and path overlays
- the sidebar shows warnings, issues, last diff summary, metrics, event counts, probe summaries, and the raw debug payload

It is a debugger first, not a production renderer. The point is to prove the render/debug contract and make simulation faults visible without committing to PixiJS or another scene backend yet.

## Recommended Workflow

1. Use `submitWithResult()` or `ClientAdapter` so command submissions always return structured outcomes.
2. Use `world.stepWithResult()` when the caller needs a non-throwing runtime failure path. Reserve `step()` for compatibility callers that are already exception-driven.
3. Attach a `WorldDebugger` and inspect `tickFailure` and `issues` before falling back to ad hoc logs.
4. Treat `tick-budget-exceeded` as an engine-level signal, not a game-rule failure. Check the listed slow systems before changing scenario logic.
5. Add a `WorldHistoryRecorder` when you need short-horizon submission, execution, and tick-failure history for automated diagnosis.
6. Use `summarizeWorldHistoryRange()` when the raw history is too noisy for the current loop.
7. Use `RenderAdapter` with a minimal projector when you need a visual debug surface.
8. Keep the same projector contract when moving to the real renderer.
9. Add game-specific probes when a new subsystem becomes hard to reason about.

## Diagnostic Flowchart

When something goes wrong, follow this decision tree:

### Step 1: Identify the failure surface

```
Something went wrong
├── world.stepWithResult() returned ok: false
│   └── Go to "Tick Failure Diagnosis"
├── world.submitWithResult() returned accepted: false
│   └── Go to "Command Rejection Diagnosis"
├── onCommandExecution() reported executed: false
│   └── Go to "Command Execution Failure Diagnosis"
├── No error, but game state is wrong
│   └── Go to "Silent Logic Bug Diagnosis"
└── Tick runs but is too slow
    └── Go to "Performance Diagnosis"
```

### Step 2: Tick Failure Diagnosis

Read `failure.phase` to find which part of the tick failed:

| Phase | Code | What broke | What to check |
|---|---|---|---|
| `commands` | `missing_handler` | No handler registered for command type | Verify `registerHandler()` was called with the correct command type string |
| `commands` | `command_handler_threw` | Handler threw an exception | Read `failure.details.error` for the stack trace; check the handler logic |
| `systems` | `system_threw` | A system's `execute()` threw | Read `failure.systemName` and `failure.details.error`; check that system's logic |
| `resources` | `resource_processing_threw` | Resource pool tick update crashed | Check resource definitions and pool bounds |
| `diff` | `diff_build_threw` | Change-set construction crashed | This is likely an engine bug — report it |
| `listeners` | `diff_listener_threw` | A diff listener or adapter callback threw | Check `onDiff()` callbacks and `RenderAdapter` projector |

### Step 3: Command Rejection Diagnosis

Read `result.code`:

| Code | What happened | What to do |
|---|---|---|
| `validation_failed` | A validator returned `false` | Check `result.validatorIndex` to identify which validator; inspect its logic |
| `malformed_command_type` | Command type is not a string (ClientAdapter only) | Fix the client message format |
| `missing_handler` | No handler registered for this command type (ClientAdapter only) | Register the handler before submitting |
| *(custom code)* | A validator returned a structured rejection | Read `result.code`, `result.message`, `result.details` for the validator's explanation |

### Step 4: Command Execution Failure Diagnosis

When `onCommandExecution()` reports `executed: false`:

1. Read `result.code` — it will be `command_handler_threw`
2. Read `result.details` for the error name, message, and stack
3. The handler was called but threw — the bug is in the handler, not validation

### Step 5: Silent Logic Bug Diagnosis

No errors, but the game state is wrong:

1. Capture a debug snapshot: `debuggerView.capture()`
2. Check `debug.issues` — the debugger may have detected a problem you missed
3. Check `debug.diff` — did the expected components actually change?
4. Check the history recorder: `history.getCommandHistory()` — was the command submitted?
5. Check `history.getCommandExecutionHistory()` — was it executed?
6. If commands are fine, check systems — are they querying the right components?
7. Add a custom probe to inspect the specific subsystem

### Step 6: Performance Diagnosis

If `tick-budget-exceeded` appears in `debug.issues`:

1. Read `issue.details.slowSystems` — the top 3 systems by duration
2. Read `issue.details.totalMs` vs `issue.details.tickBudgetMs` for the overage
3. Check the hottest system's query — is it scanning too many entities?
4. Check the hottest system for in-place position mutations (`pos.x = ...`) — these silently desynchronize the spatial grid; replace them with `setPosition()`
5. Consider narrowing queries with tags or reducing TPS

## Error Code Reference

All codes are machine-readable strings. Custom validator codes are user-defined.

### Command Submission Codes

| Code | Meaning | Details |
|---|---|---|
| `accepted` | Command passed all validators and was queued | `CommandSubmissionResult.accepted === true` |
| `validation_failed` | A validator returned `false` | `validatorIndex` identifies which validator |
| `malformed_command_type` | Command type is not a string (ClientAdapter) | Protocol-level rejection |
| `missing_handler` | No handler registered for command type (ClientAdapter) | Protocol-level rejection |
| *(custom)* | Validator returned `{ code, message, details }` | Game-defined; read `details` for context |

### Command Execution Codes

| Code | Meaning | Details |
|---|---|---|
| `executed` | Handler completed without throwing | `CommandExecutionResult.executed === true` |
| `command_handler_threw` | Handler threw an exception | `details.error` has name, message, stack |

### Tick Failure Codes

| Code | Phase | Subsystem | Meaning |
|---|---|---|---|
| `missing_handler` | `commands` | `commands` | No handler for queued command type |
| `command_handler_threw` | `commands` | `commands` | Command handler threw |
| `system_threw` | `systems` | `systems` | System `execute()` threw; `systemName` identifies which |
| `resource_processing_threw` | `resources` | `resources` | Resource pool tick threw |
| `diff_build_threw` | `diff` | `diff` | Change-set construction threw |
| `diff_listener_threw` | `listeners` | `listeners` | Diff listener or adapter threw |

All tick failures include `error: { name, message, stack }` when the cause is an exception.

### Debugger Issue Codes

| Code | Severity | Subsystem | Meaning | Key details |
|---|---|---|---|---|
| `entity-id-recycled-in-diff` | `warn` | `diff` | Same entity ID destroyed and created in one tick | `overlappingEntityIds` |
| `tick-budget-exceeded` | `warn` | `performance` | Tick exceeded time budget by >25% | `totalMs`, `tickBudgetMs`, `overBudgetMs`, `slowSystems` |

Tick failures also surface as issues with severity `error`, using the tick failure's own code.

### Scenario Runner Codes

| Code | Source | Meaning |
|---|---|---|
| `scenario_setup_threw` | `setup` | Setup function threw |
| `scenario_run_threw` | `run` | Run function threw |
| `scenario_check_failed` | `check` | Check returned `false` |
| `scenario_check_{name}_threw` | `check` | Named check threw (name is normalized: lowercase, non-alphanumeric to underscore) |
| `scenario_tick_failed` | `tick` | A tick failed during `stepUntil()` |
| `scenario_step_until_timeout` | `stepUntil` | Predicate not satisfied within `maxTicks` |
| *(custom)* | varies | `context.fail(code, message, details)` called by game code |

## Common Debugging Scenarios

### Scenario: Command was submitted but nothing happened

```typescript
const result = world.submitWithResult('moveUnit', { unit: id, target: { x: 5, y: 3 } });

// 1. Was it accepted?
if (!result.accepted) {
  // Rejected at submission — validator blocked it
  console.log(result.code, result.message, result.details);
  // If code is 'validation_failed', check result.validatorIndex
  return;
}

// 2. It was accepted. Step and check execution.
world.stepWithResult();

// 3. Check execution history
const history = new WorldHistoryRecorder({ world });
history.connect();
world.submitWithResult('moveUnit', { unit: id, target: { x: 5, y: 3 } });
world.stepWithResult();

const executions = history.getCommandExecutionHistory();
const last = executions[executions.length - 1];
if (!last.executed) {
  // Handler threw — read the error
  console.log(last.code, last.details);
}

// 4. If executed successfully but state is wrong, the handler
//    logic is the problem — inspect what the handler actually does
```

### Scenario: Tick keeps failing

```typescript
const step = world.stepWithResult();
if (!step.ok) {
  const f = step.failure!;

  // Identify the phase
  switch (f.phase) {
    case 'commands':
      // A handler threw or was missing
      console.log('Command:', f.commandType, 'Code:', f.code);
      console.log('Error:', f.error?.message);
      break;
    case 'systems':
      // A system threw
      console.log('System:', f.systemName, 'Error:', f.error?.message);
      // Check the system's logic and the entities it queries
      break;
    default:
      // resources, diff, listeners
      console.log('Phase:', f.phase, 'Code:', f.code);
      console.log('Error:', f.error?.message);
  }
}
```

### Scenario: Game is slow — finding the bottleneck

```typescript
const debuggerView = new WorldDebugger({ world });
const debug = debuggerView.capture();

// Check for budget overrun
const perfIssue = debug.issues.find(i => i.code === 'tick-budget-exceeded');
if (perfIssue) {
  // Top 3 slowest systems
  console.log('Slow systems:', perfIssue.details.slowSystems);
  console.log('Over budget by:', perfIssue.details.overBudgetMs, 'ms');
}

// Raw metrics for deeper analysis
const metrics = world.getMetrics();
if (metrics) {
  console.log('Total tick:', metrics.durationMs.total, 'ms');
  console.log('Commands:', metrics.durationMs.commands, 'ms');
  console.log('Systems:', metrics.durationMs.systems, 'ms');
  console.log('Resources:', metrics.durationMs.resources, 'ms');
  console.log('Diff build:', metrics.durationMs.diff, 'ms');
}
```

### Scenario: Using the scenario runner for repeatable diagnosis

```typescript
import { runScenario, summarizeWorldHistoryRange, World } from 'civ-engine';

const world = new World({ gridWidth: 32, gridHeight: 32, tps: 10 });

const result = runScenario({
  name: 'diagnose-movement-bug',
  world,
  setup: (ctx) => {
    // ... register components, systems, handlers, create entities
  },
  run: (ctx) => {
    ctx.submit('moveUnit', { unit: 0, target: { x: 10, y: 10 } });
    const wait = ctx.stepUntil(
      (active) => {
        const pos = active.world.getComponent(0, 'position');
        return pos?.x === 10 && pos?.y === 10;
      },
      { maxTicks: 50, code: 'unit_never_arrived', message: 'Unit did not reach target' },
    );
    return wait.failure;
  },
});

if (!result.passed) {
  // Branch on failure code
  if (result.failure) {
    switch (result.failure.code) {
      case 'unit_never_arrived':
        // stepUntil timed out — unit is stuck
        // Check: is pathfinding working? Is the cell blocked?
        console.log('Issues:', result.issues);
        console.log('Last diff:', result.diff);
        break;
      case 'scenario_tick_failed':
        // A tick crashed during the run
        console.log('Tick failure:', result.failure.details);
        break;
      default:
        console.log('Unexpected:', result.failure.code, result.failure.message);
    }
  }

  // Check command history for rejections
  const rejected = result.history.commands.filter(s => !s.accepted);
  if (rejected.length > 0) {
    console.log('Rejected commands:', rejected);
  }

  // Summarize if history is noisy
  const summary = summarizeWorldHistoryRange(result.history, {
    startTick: 0,
    endTick: result.snapshot.tick,
  });
  console.log('Summary:', summary);
}
```
