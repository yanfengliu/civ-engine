# Strict Mode

Strict mode is an opt-in `World` flag (Spec 6, v0.8.8+) that rejects content mutations called outside the well-defined writable phases. It complements `SessionReplayer.selfCheck` — selfCheck verifies determinism after the fact; strict mode throws at the call site.

Default is **off**; existing code is unaffected unless you opt in.

## Quickstart

```ts
import { World, StrictModeViolationError } from 'civ-engine';

const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60, strict: true });
world.registerComponent('hp');
world.registerHandler('damage', () => undefined);

const e = world.createEntity();             // OK — setup window is open
world.setComponent(e, 'hp', { value: 100 });  // OK — setup window is open

world.step();                                  // first step closes the setup window

try {
  world.setComponent(e, 'hp', { value: 50 });  // throws StrictModeViolationError
} catch (err) {
  if (err instanceof StrictModeViolationError) {
    console.log(err.details.code);     // 'strict_mode_violation'
    console.log(err.details.method);   // 'setComponent'
    console.log(err.details.phase);    // 'between-ticks'
    console.log(err.details.advice);   // human-readable hint
  }
}
```

## What gets gated

The following methods throw `StrictModeViolationError` when called outside a system phase, the setup window, or a `runMaintenance` callback (when `strict: true`):

- Entity lifecycle: `createEntity`, `destroyEntity`
- Components: `addComponent`, `setComponent`, `removeComponent`, `patchComponent`, `setPosition`
- Resources: `addResource`, `removeResource`, `setResourceMax`, `setProduction`, `setConsumption`, `addTransfer`, `removeTransfer`
- State: `setState`, `deleteState`
- Tags / metadata: `addTag`, `removeTag`, `setMeta`, `deleteMeta`
- Events / RNG: `emit`, `random`

What is **NOT** gated (allowed at any time, even in strict mode):

- Registration: `registerComponent`, `registerSystem`, `registerHandler`, `registerValidator`, `registerResource`
- Loop / submission: `submit`, `submitWithResult`, `step`, `stepWithResult`, `pause`, `resume`, `setSpeed`, `recover`
- Reads: `serialize`, `getDiff`, `getMetrics`, `getEvents`, `getState`, all `get*`/`is*`/`has*` methods
- Listener add/remove: `on`/`off`/`onDiff`/`offDiff`/`onCommandResult`/`onCommandExecution`/`onTickFailure`/etc.
- `applySnapshot` (uses an internal maintenance increment)

## Escape hatches

### The setup window

When you construct a strict world, the **setup window** is open. All gated mutations succeed during this period. The window closes implicitly on the first tick (`step()`, `stepWithResult()`, or a `GameLoop.start()`-driven tick) or explicitly when you call `world.endSetup()`.

```ts
const world = new World({ ..., strict: true });
world.isInSetup();    // true
// register, populate initial entities, set state...
world.endSetup();     // close setup window early (idempotent)
world.isInSetup();    // false
```

### `runMaintenance(fn)`

For mutations that need to happen between ticks — scenario-loading, tooling, scripted edits — wrap them in a maintenance callback:

```ts
world.runMaintenance(() => {
  world.setComponent(entity, 'hp', { value: 100 });
  world.setState('phase', 'paused');
});
```

`runMaintenance(fn)` is **reentrant via depth counter**. Nesting it (or composing helpers that internally use it) is safe — only the outermost exit clears the gate:

```ts
world.runMaintenance(() => {
  // depth = 1
  world.runMaintenance(() => {
    // depth = 2; both inner and outer mutations succeed
    world.setComponent(e, 'hp', { value: 50 });
  });
  // depth = 1; mutations still succeed
  world.setComponent(e, 'hp', { value: 75 });
});
// depth = 0; mutations throw again
```

If `fn` throws, the depth counter still decrements correctly (try/finally), so the world isn't left permanently writable.

Use `world.isInMaintenance()` to check whether the gate is currently disabled by maintenance.

### Inside system phases

Anything that runs inside `executeTick` — registered systems, handlers, validators, `onDiff` listeners, command-result listeners, `onTickFailure` listeners — is in the writable phase. Mutations from those code paths succeed normally. The `_inTickPhase` flag is set at the top of `runTick` and cleared **after** `onTickFailure` listeners fire (so listener-side mutations remain in-tick).

### `applySnapshot`

Calling `world.applySnapshot(snap)` works at any phase regardless of strict mode. The implementation increments the maintenance depth internally for forward-compat (today's snapshot loader uses internal-only paths that bypass the public mutation gate).

## Transactions

`CommandTransaction` (`world.transaction()`) buffers mutations and applies them on `commit()`. In strict mode:

- Inside a tick: `commit()` works because `_inTickPhase` is true.
- Inside `runMaintenance(fn)`: `commit()` works because the depth counter is positive.
- Outside a tick (raw between-tick code): `commit()` throws at the first mutation it tries to apply. Wrap explicitly: `world.runMaintenance(() => txn.commit())`.

This is intentional (per ADR 40 in `docs/architecture/decisions.md`) — auto-opening maintenance from `commit()` would turn transactions into an implicit public bypass, undermining the gate.

## Performance

The gate's hot path on a strict world is three boolean reads (`_inTickPhase`, `_inSetup`, `_maintenanceDepth > 0`). On a non-strict world, it's a single `if (!this.strict) return;` early-out. Allocation (the violation error and advice string) only happens on the throw branch.

There's no measurable overhead on existing tests when strict mode is off; benchmark not necessary.

## Errors

```ts
class StrictModeViolationError extends Error {
  readonly details: {
    code: 'strict_mode_violation';
    method: string;            // e.g., 'setComponent', 'random'
    phase: 'between-ticks' | 'after-failure';
    advice: string;            // human-readable hint
  };
}
```

`details.phase`:
- `'between-ticks'`: the common case — between `step()` calls (or before any tick has run), no maintenance hatch active. v1 collapses pre-first-tick "idle" into `'between-ticks'` for a single, simple distinction.
- `'after-failure'`: world is poisoned from a tick failure. Mutations are blocked even outside strict mode in some methods; strict mode adds the violation error for consistency at the same boundary.

### Submit-time callbacks

`submitWithResult()` runs validators and emits command-result listeners synchronously at submission time. Those callbacks fire in the **caller's phase**, not in a tick phase:

- A between-tick caller sees `_inTickPhase === false` for the duration of validator + listener execution. Any gated mutation from those callbacks throws `StrictModeViolationError`.
- An in-tick caller (e.g., a system that calls `submitWithResult`) sees `_inTickPhase === true`; mutations from validators / listeners are allowed.

This is intentional and matches `submit()`'s queue-for-next-tick semantics. **Validators are documented as read-only** (Spec 1's determinism contract); strict mode catches accidental mutation in a validator at the call site rather than letting it surface as a replay divergence later. Command-result listeners that need to mutate world state should either run inside a tick (e.g., from a system that triggers them) or wrap the listener body in `world.runMaintenance(fn)`.

## Why opt-in

Existing callers that do setup-after-startup or scripted-scenario edits would break under default-strict. The opt-in flag lets consumers migrate at their own pace. A future release may flip the default to true; that will be a breaking change handled per AGENTS.md versioning rules. See ADR 36.
