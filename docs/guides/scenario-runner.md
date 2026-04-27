# Scenario Runner Guide

This guide covers `runScenario()`, the headless harness for executing a prepared simulation setup, stepping it forward, and returning one structured result object.

Use it when an AI agent, test harness, or debug workflow needs a repeatable experiment instead of ad hoc setup code.

Scenario results now include `schemaVersion`, and their nested history/debug payloads carry their own schema markers as well.

## What It Does

`runScenario()` combines:

- prepared world setup
- short-horizon history capture
- structured command submission
- deterministic stepping
- optional checks
- one final machine-readable result

It is built on top of:

- `World`
- `WorldDebugger`
- `WorldHistoryRecorder`

## Basic Example

```typescript
import { runScenario, World, type Position } from 'civ-engine';

type Events = { moved: { entity: number; x: number; y: number } };
type Commands = { move: { entity: number; x: number; y: number } };

const world = new World<Events, Commands>({
  gridWidth: 8,
  gridHeight: 8,
  tps: 10,
});

let unit = -1;

const result = runScenario({
  name: 'move-unit',
  world,
  setup: (ctx) => {
    ctx.world.registerComponent<Position>('position');
    unit = ctx.world.createEntity();
    ctx.world.setPosition(unit, { x: 0, y: 0 });
    ctx.world.registerHandler('move', (data, activeWorld) => {
      activeWorld.setPosition(data.entity, { x: data.x, y: data.y });
      activeWorld.emit('moved', {
        entity: data.entity,
        x: data.x,
        y: data.y,
      });
    });
  },
  run: (ctx) => {
    ctx.submit('move', { entity: unit, x: 2, y: 3 });
    ctx.step();
  },
  checks: [
    {
      name: 'unit reaches target',
      check: (ctx) => {
        const position = ctx.world.getComponent<Position>(unit, 'position');
        return position?.x === 2 && position.y === 3
          ? true
          : ctx.fail('unit_not_at_target', 'Unit did not reach target');
      },
    },
  ],
});
```

## Setup vs Run

`setup()` prepares the world.

`run()` performs the scenario actions.

The runner clears its internal history after `setup()`, so the recorded initial snapshot always represents the prepared starting state, not bootstrap noise.

That means:

- direct setup mutations are allowed
- setup can use `submit()` or `step()` if needed
- recorded history still starts from the post-setup baseline

## Context Helpers

The scenario context exposes:

- `world`
- `debugger`
- `history`
- `submit(type, data)`
- `step(count?)`
- `stepUntil(predicate, options?)`
- `capture()`
- `fail(code, message, details?)`

### `submit`

`submit()` uses `world.submitWithResult()` under the hood, so every command submission returns a structured outcome.

### `step`

`step(count?)` advances the world and returns a fresh capture of scenario state.

Internally it uses `world.stepWithResult()`. If a tick fails, the runner converts that runtime failure into a structured scenario failure instead of leaking a raw exception into the AI loop.

### `stepUntil`

Use `stepUntil()` when a scenario should stop on a condition or fail after a bounded number of ticks:

```typescript
const wait = ctx.stepUntil(
  (active) => active.world.tick >= 10,
  {
    maxTicks: 20,
    code: 'condition_not_met',
    message: 'Expected condition was never reached',
  },
);

if (wait.failure) {
  return wait.failure;
}
```

This is the main tool for AI agents that need deterministic timeout behavior instead of open-ended loops.

## Checks

Checks run after `run()` finishes.

Each check returns:

- `true` for pass
- `false` for generic failure
- `ctx.fail(...)` for structured failure

Check failures are reported in `result.checks`. They do not overwrite `result.failure`, which is reserved for runner-level failures returned from `run()` or raised by `setup()` / `run()`. Tick failures are reported through `result.failure` with `source: 'tick'`.

## Result Shape

`runScenario()` returns:

- `schemaVersion`
- `passed`
- `failure`
- `checks`
- `snapshot`
- `debug`
- `history`
- `metrics`
- `diff`
- `events`
- `issues`

`history` includes command submissions, command executions, and structured tick failures, so the runner result is enough for a fast closed-loop diagnosis without a separate replay system.

This gives an agent a single object it can inspect after each experiment run.

When that single object is still too verbose, pair it with `summarizeWorldHistoryRange(result.history, { startTick, endTick })` to collapse several recorded ticks into one machine-readable explanation.

## Debugging Scenario Results

For the recommended AI diagnosis loop, error code reference, and worked debugging examples using `runScenario()`, see the [Debugging Guide](./debugging.md).

## Replayable Scenario Bundles via `scenarioResultToBundle()`

Scenarios can produce `SessionBundle`s that drop into the same `SessionReplayer` used for live captures, unlocking deterministic regression testing and AI-driven scenario debugging.

```ts
import { runScenario, scenarioResultToBundle, SessionReplayer } from 'civ-engine';

function setupBehavior(world) {
  world.registerComponent('position');
  world.registerHandler('move', moveHandler);
}

const result = runScenario({
  name: 'my-test', world,
  setup: (ctx) => setupBehavior(ctx.world),
  run: (ctx) => { /* ... */ },
  checks: [{ name: 'final state', check: ctx => ctx.world.getComponent(0, 'position')?.x === 5 }],
  history: {
    capacity: Number.MAX_SAFE_INTEGER,        // unbounded; default 64 truncates long scenarios
    captureCommandPayloads: true,             // required for replay
    captureInitialSnapshot: true,             // default; required for replay
  },
});
const bundle = scenarioResultToBundle(result);

// Replay
const replayer = SessionReplayer.fromBundle(bundle, {
  worldFactory: (snap) => {
    const w = new World(config);
    setupBehavior(w);                         // re-register handlers
    w.applySnapshot(snap);                    // load state in-place
    return w;
  },
});
const checkResult = replayer.selfCheck();
```

`scenarioResultToBundle()` produces one `kind: 'assertion'` marker (provenance: 'engine') per scenario check outcome — `data.passed` and `data.failure` carry the verdict.

**Caveats:**

- Without `captureCommandPayloads: true`, the bundle is diagnostic-only — `openAt(tick > startTick)` throws `BundleIntegrityError(code: 'no_replay_payloads')`.
- `WorldHistoryRecorder` defaults to capacity 64 ticks; long scenarios MUST set `capacity: Number.MAX_SAFE_INTEGER` (or a sufficient value) to avoid silent truncation.
- The `worldFactory` must register handlers/validators/systems on a fresh world THEN call `applySnapshot(snap)` — `World.deserialize` would conflict with subsequent re-registration.

See [Session Recording](./session-recording.md) for the canonical reference.
