# Synthetic Playtest Harness

The synthetic playtest harness is a Tier-1 primitive of the AI-first feedback loop (Spec 3 of `docs/design/ai-first-dev-roadmap.md`). It drives a `World` autonomously via pluggable `Policy` functions for `N` ticks and produces a replayable `SessionBundle`.

## Quickstart

```typescript
import {
  World, runSynthPlaytest, randomPolicy, SessionReplayer,
  type WorldConfig,
} from 'civ-engine';

const config: WorldConfig = { gridWidth: 32, gridHeight: 32, tps: 60, positionKey: 'position' };

interface Cmds {
  spawn: { x: number; y: number };
  move: { id: number; to: { x: number; y: number } };
}

const setup = () => {
  const w = new World<Record<string, never>, Cmds>(config);
  w.registerHandler('spawn', (data, world) => {
    const id = world.createEntity();
    world.setComponent(id, 'position', { x: data.x, y: data.y });
  });
  w.registerComponent('position');
  return w;
};

const result = runSynthPlaytest({
  world: setup(),
  policies: [
    randomPolicy<Record<string, never>, Cmds>({
      catalog: [
        (ctx) => ({
          type: 'spawn',
          data: {
            x: Math.floor(ctx.random() * 32),
            y: Math.floor(ctx.random() * 32),
          },
        }),
      ],
      frequency: 5,
    }),
  ],
  maxTicks: 1000,
  policySeed: 42,
});

console.log(`Stopped: ${result.stopReason} after ${result.ticksRun} ticks`);
console.log(`Bundle has ${result.bundle.commands.length} recorded commands.`);

// Verify replay-determinism (only meaningful for non-poisoned bundles with ticksRun >= 1).
if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
  const replayer = SessionReplayer.fromBundle(result.bundle, {
    worldFactory: (snap) => {
      const w = setup();
      w.applySnapshot(snap);
      return w;
    },
  });
  console.log('selfCheck:', replayer.selfCheck().ok);
}
```

## Policy Authoring

A `Policy` is a function from `PolicyContext` to an array of `PolicyCommand`s:

```typescript
type Policy<TEventMap, TCommandMap, TComponents, TState> = (
  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
) => PolicyCommand<TCommandMap>[];
```

`PolicyContext` exposes:
- `world` — read-only view of the current world.
- `tick` — the tick that's about to execute.
- `random` — seeded sub-RNG independent of `world.rng`. **Use this for any randomness; do NOT call `Math.random()`, `world.random()`, `Date.now()`, or other non-deterministic sources.**

### Writing a custom policy

```typescript
function migrateUnitsPolicy(): Policy<Record<string, never>, Cmds> {
  return (ctx) => {
    // Read live world state.
    const units = [...ctx.world.query('unit')];

    // Use ctx.random for any randomness (NOT world.random).
    const targets = units.map((id) => ({
      id,
      to: { x: Math.floor(ctx.random() * 32), y: Math.floor(ctx.random() * 32) },
    }));

    // Return commands; the harness submits them via world.submitWithResult.
    return targets.map((t) => ({ type: 'move', data: t }));
  };
}
```

### Stateful policies

A policy can carry state across calls via a closure or class method:

```typescript
function memoryPolicy(): Policy<Record<string, never>, Cmds> {
  const seen = new Set<number>();
  return (ctx) => {
    const newOnes = [...ctx.world.query('unit')].filter((id) => !seen.has(id));
    for (const id of newOnes) seen.add(id);
    // Spawn a new unit at a position derived from each freshly-seen entity id.
    return newOnes.map((id) => ({ type: 'spawn' as const, data: { x: id % 32, y: Math.floor(id / 32) } }));
  };
}
```

Class-based form (per ADR 17): `instance.decide.bind(instance)` produces a `Policy` from a method.

State must remain JSON-clean and seeded from `ctx.random()`. The harness's sub-RNG is shared by all composed policies on a tick — they consume from the same stream, so call counts matter for determinism.

## Built-in Policies

### `noopPolicy()`

Submits nothing. Useful for letting world systems advance without external input (e.g., simulating AI behaviors that respond to world state without driver-injected stimulus).

### `randomPolicy({ catalog, frequency, offset, burst })`

Picks a random catalog entry per emit. `frequency` controls how often (every N ticks). `offset` shifts the firing pattern. `burst` controls commands per fired tick. Catalog entries receive the live `PolicyContext` so they can read world state when constructing their command. Throws `RangeError` on empty catalog or out-of-range parameters.

### `scriptedPolicy(sequence)`

Plays back a pre-recorded list of `{ tick, type, data }` entries. Useful for regression playback of bug bundles. Pre-grouped by tick at construction (O(1) per-tick lookup).

### Bundle → Script Conversion

To replay a recorded bundle's commands via `scriptedPolicy`:

```typescript
const sequence = bundle.commands.map((cmd) => ({
  tick: cmd.submissionTick + 1,  // submissionTick is one less than executing tick
  type: cmd.type,
  data: cmd.data,
}));
const policy = scriptedPolicy(sequence);
```

The `+1` is required because `RecordedCommand.submissionTick` is `world.tick` at submit time, while `ScriptedPolicyEntry.tick` is matched against `PolicyContext.tick` (the about-to-execute tick).

## Determinism

The harness is deterministic given identical inputs:
- Same world setup (components, handlers, validators, systems registered in the same order).
- Same policies (functions or class instances).
- Same `maxTicks`, `stopWhen`, `policySeed`, `snapshotInterval`.
- Identical engine and Node versions (per spec §11.1 clause 9).

### Replay-determinism

Non-poisoned synthetic bundles with `ticksRun >= 1` round-trip cleanly through `SessionReplayer.selfCheck()`. The sub-RNG sandboxes policy randomness from `world.rng`, so replay (which doesn't re-invoke policies) reproduces world state exactly.

### Production-determinism

Two harness runs with identical config (notably `policySeed`) produce structurally-equal bundles modulo `metadata.sessionId`, `metadata.recordedAt`, and `WorldMetrics.durationMs` (which is `performance.now()`-backed and varies between runs). Use the strip-volatile pattern when comparing:

```typescript
const strip = (m: SessionMetadata) => {
  const copy = { ...m };
  delete (copy as Partial<typeof copy>).sessionId;
  delete (copy as Partial<typeof copy>).recordedAt;
  return copy;
};
expect(strip(r1.bundle.metadata)).toEqual(strip(r2.bundle.metadata));
```

## Failure Modes

| `stopReason` | Cause | `ok` | Bundle returned? |
|---|---|---|---|
| `'maxTicks'` | Loop completed N steps. | `true` | yes |
| `'stopWhen'` | Predicate fired post-step. | `true` | yes |
| `'poisoned'` | `world.step()` threw (poisoned mid-tick). | `true` | yes (with `failedTicks` populated) |
| `'policyError'` | Policy threw before `step()`. | `true` | yes (with `policyError` field populated; `bundle.failures` unchanged) |
| `'sinkError'` | Mid-tick recorder write failure. | `false` | yes (incomplete) |

**Connect-time sink failure** (e.g., disk-full when writing initial manifest) propagates the error from `recorder.lastError` directly — no bundle returned, similar to `world-poisoned-at-start` propagation.

**Disconnect-time sink failure** (e.g., terminal-snapshot write throws) flips `ok: false` while `stopReason` retains the original loop-exit reason (`'maxTicks'` / `'stopWhen'` / etc.). The bundle is returned but incomplete. CI guards should check `result.ok`, not just `stopReason !== 'sinkError'`.

**Composed-policy partial submit:** when `policies[i]` throws after `policies[0..i-1]` returned commands, the harness has already submitted those earlier commands. They appear in `bundle.commands` for the failed tick without matching executions. `selfCheck` doesn't replay across the abort point, so the orphan is benign; `result.policyError` is the authoritative diagnostic.

## CI Pattern

```typescript
import { runSynthPlaytest, SessionReplayer } from 'civ-engine';

const result = runSynthPlaytest({ world: setup(), policies: [/* ... */], maxTicks: 1000 });

// Bundle is always returned (except for connect-time sink failure).
expect(result.bundle).toBeDefined();

// selfCheck guard: only valid for non-poisoned bundles with at least one successful step.
if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
  const replayer = SessionReplayer.fromBundle(result.bundle, {
    worldFactory: (snap) => { const w = setup(); w.applySnapshot(snap); return w; },
  });
  expect(replayer.selfCheck().ok).toBe(true);
}
```

## See also

- `docs/architecture/decisions.md` ADRs 17-22 for the design trade-offs.
- `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10) for the full spec.
- `docs/design/ai-first-dev-roadmap.md` for how Spec 3 fits into the broader roadmap.
- `docs/guides/session-recording.md` for the underlying SessionRecorder/SessionReplayer machinery.
