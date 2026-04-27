# Synthetic Playtest Harness — Design Spec

**Status:** Draft v8 (2026-04-27). Awaiting iter-8 multi-CLI review. Iter-1..7 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..7}/REVIEW.md`. v8 addresses iter-7's 1 MED (selfCheck overclaim on poisoned bundles — replay re-throws because the failed-tick-bounded segment isn't skipped) + 1 LOW (stale `stopOnPoisoned` in §7.3) + 2 cosmetic NITs. Trend: 3 MED → 2 MED → 1 MED across iter-5..7; iter-8 expected to converge.

**Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).

**Author:** civ-engine team

**Related primitives:** `SessionRecorder`, `SessionBundle`, `MemorySink`, `FileSink`, `World`, `world.submit()`, `world.random()`, `runScenario`, `scenarioResultToBundle`, `DeterministicRandom`.

## 1. Goals

This spec defines an engine-level harness that:

- Constructs a `World`, attaches a `SessionRecorder`, drives `world.submit()` from a **pluggable policy** for `N` ticks, and saves the resulting `SessionBundle`.
- Provides built-in policies (random, scripted, no-op) covering the common low-effort cases.
- Composes multiple policies — useful when different policies drive different command types (e.g., one policy spawns units, another moves them).
- Supports configurable stop conditions (`maxTicks`, custom `stopWhen` predicate). Always stops on a poisoned world (built-in, not configurable — see ADR 4 / §7.1 step 4 rationale).
- Produces deterministic bundles given identical seed + setup + policies, so a synthetic playtest can be re-run with the same outcome and the produced bundle passes `SessionReplayer.selfCheck()`.
- Is trivially parallelizable across processes (each playtest is a synchronous self-contained run; multiple instances can run on different cores/machines without shared state).

The deliverable is an opt-in API surface; existing engine consumers see no behavioral change.

## 2. Non-Goals

- **LLM-driven policies**: The interface accommodates them (Policy is a function or class), but no built-in LLM policy ships. Future spec (Tier 2 #9 in the roadmap) covers the AI playtester.
- **Bundle corpus management**: A harness run produces one bundle. Aggregating thousands of bundles, indexing, querying, and displaying them is Spec 7's job.
- **Behavioral metrics**: Computing "median session length dropped 30%" across a corpus is Spec 8.
- **Cross-process orchestration**: The harness runs one playtest per call. Splitting work across cores/machines is the caller's responsibility (e.g., a CI script that runs 32 invocations in parallel). The harness is designed to be *parallelizable* (no shared state, deterministic given inputs) but doesn't ship a parallel runner.
- **Async/streaming policies**: v1 policies are synchronous. Async policies (e.g., LLM API calls per tick) would need either an async harness or a buffered wrapper; both are deferred to future specs.
- **Game-side integration**: This is engine-side infrastructure. Game projects build their own scenario-specific synthetic-playtest scripts on top.
- **Replay-via-policy**: `SessionReplayer` replays from `bundle.commands`, not by re-invoking policies. The bundle stores the policy seed (§5.4) so a future spec could rebuild policy state if needed, but v1 replay never invokes policies.

## 3. Background

The session-recording subsystem (Spec 1) provides the substrate: `SessionRecorder` captures any `World` run; `SessionReplayer.selfCheck()` verifies replay determinism. The remaining missing piece is a *driver* — code that runs a `World` autonomously without a human at the keyboard.

`runScenario` already provides a similar shape — it accepts setup + run callbacks + checks, runs to completion, returns a `ScenarioResult`. The synthetic playtest harness is a sibling primitive with a different intent:

| Aspect             | `runScenario` (existing) | `runSynthPlaytest` (this spec) |
| ------------------ | ------------------------ | ------------------------------ |
| Primary use        | Tests / regressions      | Autonomous exploration         |
| Tick count         | Typically ≤100, scripted | Typically ≥1000, policy-driven |
| Pass/fail          | Explicit `checks[]`      | None — outcome is the bundle   |
| Output             | `ScenarioResult`         | `SessionBundle` directly       |
| Determinism        | Required (asserted)      | Required (validated by selfCheck) |
| Per-tick driver    | One inline `run` callback | Pluggable Policy interface    |

A scenario *tests* a specific outcome; a synthetic playtest *generates* an artifact for downstream analysis. Both produce bundles via the same `SessionRecorder` plumbing.

## 4. Architecture Overview

Three new conceptual primitives, all in `src/synthetic-playtest.ts`:

| Primitive            | Status            | Responsibility                                                                                       |
| -------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `Policy`             | new (interface)   | Pluggable command source. Given a read-only world, current tick, and seeded `random()`, returns the commands to submit. |
| `runSynthPlaytest()` | new (function)    | Drives a World forward through `maxTicks`, calling each policy per tick, recording into a sink.      |
| Built-in policies    | new (functions)   | `randomPolicy`, `scriptedPolicy`, `noopPolicy`                                                       |

Concrete exported surface (the twelve symbols in §18 acceptance criteria; same order in both lists): `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Internally the harness owns one `DeterministicRandom` sub-instance for policy randomness (§5.4).

Plus three additive changes to the merged session-recording subsystem:

1. `SessionMetadata.sourceKind` widens from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Type-additive; no consumers in the engine branch on this field today (verified — only producers in `session-recorder.ts:131` and `session-scenario-bundle.ts:71`). ADR 3 documents the trade-off.
2. `SessionRecorderConfig` gains optional `sourceKind?: 'session' | 'scenario' | 'synthetic'` (default `'session'`) and `policySeed?: number`. Replaces the iter-1 plan's post-hoc sink-metadata mutation, which was unsound (would lose the kind on early-crash + custom-sink shapes). See ADR 3a.
3. `SessionMetadata` gains optional `policySeed?: number` populated when `sourceKind === 'synthetic'`. Preserves the seed for future replay-via-policy work.

```
              ┌────────────────────────────────────────────────────┐
              │              runSynthPlaytest(config)              │
              │                                                    │
              │  ┌──────────┐    ┌──────────────┐    ┌──────────┐  │
              │  │ World    │◀───│ Policy[]     │    │ Sink     │  │
              │  │ (driven) │    │ ctx.random() │    │ (bundle) │  │
              │  └─────┬────┘    └──────┬───────┘    └────┬─────┘  │
              │        │                │                 │        │
              │        ▼                ▼                 ▲        │
              │  ┌──────────────┐  ┌─────────────────┐    │        │
              │  │ World RNG    │  │ Policy sub-RNG  │    │        │
              │  │ (systems)    │  │ (DeterministicRandom) │       │
              │  └──────┬───────┘  └─────────────────┘    │        │
              │         │                                 │        │
              │         ▼                                 │        │
              │  ┌──────────────────────┐                 │        │
              │  │ SessionRecorder      │─────────────────┘        │
              │  │ sourceKind:'synthetic'                          │
              │  │ (captures all ticks) │                          │
              │  └──────────────────────┘                          │
              └────────────────────────────────────────────────────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │ SessionBundle  │
                              │ (synthetic)    │
                              └────────────────┘
```

## 5. Policy Interface

A policy is a function (or stateful class with a method) that, given a context, returns the commands to submit *before* `world.step()` advances the world.

The four generic parameters mirror `World<TEventMap, TCommandMap, TComponents, TState>` so policies retain typed access to components and resource state. `TComponents` and `TState` carry `World`-matching defaults (`Record<string, unknown>`), so callers who don't care about typed components/state can write `Policy<E, C>` and TypeScript fills the trailing two from defaults. `TEventMap` and `TCommandMap` deliberately have no defaults — empty-record defaults would collapse `PolicyCommand` to `never`, making the policy uncallable for any non-trivial command map; callers infer or specify these explicitly.

```ts
import type { ComponentRegistry } from './world.js';

export interface PolicyContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Read-only view of the current world. Policies must NOT mutate. */
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  /** The tick that's about to execute (i.e., commands submitted now run during this tick). */
  readonly tick: number;
  /**
   * Seeded sub-RNG for the policy's own randomness. Independent of `world.random()`
   * and replay-safe (see §5.4). Policies MUST use this — not `Math.random()` and
   * not `world.random()` — for any randomness.
   */
  readonly random: () => number;
}

export type Policy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> = (
  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
) => PolicyCommand<TCommandMap>[];

/** Discriminated union; `type` and `data` are correlated. Depends only on TCommandMap. */
export type PolicyCommand<TCommandMap> = {
  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];

/** Used by `stopWhen` only. Same shape as PolicyContext but `tick` is post-step. */
export interface StopContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  /** The tick that just executed (`world.tick` at the time of the check). */
  readonly tick: number;
  /** Same seeded sub-RNG instance as policies — exposed in case a stop predicate needs deterministic randomness. */
  readonly random: () => number;
}
```

### 5.1 Determinism contract for policies

Policies are **external coordinators** in the sense of the session-recording determinism contract (§11.1 clause 2 — "an external coordinator picks up and submits between ticks"). Per-clause applicability:

| Spec §11.1 clause | Applies to policies? | Notes                                                                                              |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| 1 (`world.tick`)  | Yes                  | `tick` exposed via `PolicyContext` is read-only and matches what systems will see.                 |
| 2 (external coordinator) | **Positively** | Policies ARE the coordinator. They submit via `world.submit*` before each step.                  |
| 3 (`world.random()`) | **Refined**       | Policies MUST use `ctx.random()`, not `world.random()`. See §5.4 — calling `world.random()` between ticks would advance world RNG state and break replay. `ctx.random()` is replay-safe. |
| 4 (validators)    | N/A                  | Policies don't validate; they emit commands that go through the existing validator chain.          |
| 5 (no wall-clock in systems) | Yes (extended) | Policies likewise must not call `Date.now()` / `process.env` / etc. Same restriction as systems.   |
| 6 (events)        | Yes                  | Policies read events via `world.getEvents()` — same surface as systems.                            |
| 7 (no I/O)        | Yes                  | Policies are pure / deterministic.                                                                 |
| 8 (registration order) | Caller-side    | The harness caller registers components/handlers/systems before invoking `runSynthPlaytest`; policies don't change this. |
| 9 (engine version)| Caller-side          | Same.                                                                                              |

The harness does NOT structurally enforce these contracts; `SessionReplayer.selfCheck` on the resulting bundle is the verification mechanism. CI-style usage should run `selfCheck` on every produced bundle (§10).

There is a separate notion of **production determinism**: re-running the harness with identical inputs (same world setup + same policies + same `policySeed`) produces structurally-equal bundles (modulo `metadata.sessionId` and `metadata.recordedAt`). This is distinct from `selfCheck` (which validates replay against record); both should hold and §12 tests both.

### 5.2 Policies are pure functions w.r.t. the world

Policies receive `context.world` for read-only inspection, but they must NOT mutate via `setComponent` / `setPosition` / `setState` / etc. Mutation goes through the returned `PolicyCommand[]` only — those are submitted via `world.submitWithResult` by the harness, which respects validators and handlers.

The harness does NOT enforce this with a runtime proxy (would add overhead). It's a contract: violating it produces non-deterministic bundles flagged by selfCheck.

### 5.3 Stateful policies

A policy can carry state across calls by being a closure or a method on a class:

```ts
function memoryPolicy<E, C>(): Policy<E, C> {
  const seen = new Set<EntityId>();
  return (ctx) => {
    const newOnes = [...ctx.world.query('unit')].filter((id) => !seen.has(id));
    for (const id of newOnes) seen.add(id);
    return newOnes.map((id) => ({ type: 'spawn', data: { parent: id } }));
  };
}
```

Stateful policies must keep their state JSON-clean and seeded from `ctx.random()` for any randomness. Replays via `SessionReplayer` don't invoke policies — replay is from `bundle.commands` — so policy state isn't reconstructed at replay time. Re-running the harness with the same `policySeed` reproduces both the policy state evolution AND the resulting bundle.

### 5.4 Policy randomness — seeded sub-RNG

The harness owns a `DeterministicRandom` instance distinct from `world.rng`. `PolicyContext.random()` and `StopContext.random()` are bound to this instance. Properties:

- **Seeded.** `SynthPlaytestConfig.policySeed?: number` (default: derived at harness construction from a single `world.random()` call, scaled to a uint32 via `Math.floor(world.random() * 0x1_0000_0000)` — see ADR 5). The single seed-derivation call happens BEFORE `recorder.connect()`, so the captured initial snapshot reflects the post-derivation `world.rng` state. Replay reproduces this trivially.
- **Independent of world RNG.** Calling `ctx.random()` doesn't advance `world.rng`. Replay re-executes the recorded commands and `world.step()`; `world.rng` evolves identically because policies didn't perturb it.
- **Stored in metadata.** `SessionMetadata.policySeed?: number` is populated for synthetic bundles. Replay doesn't use it (commands are recorded directly), but the seed is preserved so future replay-via-policy work has it.

`randomPolicy` (§6.2) uses `ctx.random()` internally for catalog selection. Custom policies use `ctx.random()` for any randomness they need.

ADR 5 (§15) captures the design rationale and the literal seed-derivation expression for the sub-RNG.

## 6. Built-in Policies

### 6.1 `noopPolicy()`

Submits nothing. Useful for letting world systems advance without external input.

```ts
export function noopPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(): Policy<TEventMap, TCommandMap, TComponents, TState> {
  return () => [];
}
```

(No defaults on `TEventMap` / `TCommandMap` — the empty-record default would collapse `PolicyCommand` to `never` and make the returned policy structurally uncallable for any non-trivial command map. Callers infer or specify explicitly.)

### 6.2 `randomPolicy({ catalog, frequency, offset, burst })`

Picks a random command from a caller-supplied catalog. Frequency controls how often (every N ticks).

```ts
export interface RandomPolicyConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Catalog of command-generators. Each entry is invoked with the policy
   * context to produce a concrete command. The harness picks one entry
   * uniformly at random per emit, via `ctx.random()`.
   */
  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap, TComponents, TState>) => PolicyCommand<TCommandMap>>;
  /** Emit on ticks where `tick % frequency === offset`. Default frequency: 1; offset: 0. */
  frequency?: number;
  offset?: number;
  /** Number of commands to emit per fired tick. Default: 1. */
  burst?: number;
}

export function randomPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  config: RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>,
): Policy<TEventMap, TCommandMap, TComponents, TState>;
```

The catalog is functions, not data, so commands can reference live world state (e.g., pick a random existing entity to target). This avoids requiring policies to crawl `world.query()` themselves.

`randomPolicy` is fully deterministic given the harness's `policySeed`: the same seed reproduces the same catalog selections and the same generated commands.

### 6.3 `scriptedPolicy(sequence)`

Plays back a pre-recorded list of `{ tick, type, data }` entries. Useful for regression scenarios derived from real bug bundles.

```ts
/** Discriminated union; `type` and `data` are correlated. Depends only on TCommandMap. */
export type ScriptedPolicyEntry<TCommandMap> = {
  [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];

export function scriptedPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  sequence: ScriptedPolicyEntry<TCommandMap>[],
): Policy<TEventMap, TCommandMap, TComponents, TState>;
```

Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the sequence emit nothing.

### 6.4 Composition

Multiple policies are passed as an array. The harness invokes each in order with the same `PolicyContext`; their command outputs are submitted in policy-array order via `world.submitWithResult`. The order determines `submissionSequence`, which the engine respects.

**Within a tick, composed policies do NOT observe each other's submissions.** The world's command queue is private and ARCHITECTURE.md forbids direct access; `world.getEvents()` returns the *previous* tick's events; handlers don't fire until `world.step()`. So `policies[1].decide(ctx)` sees the same world state as `policies[0].decide(ctx)`. Earlier-policy submissions become visible to later policies only on the *next* tick (via observable side effects: state changes, emitted events).

The visible-from-outside ordering — `submissionSequence` on `bundle.commands` matches policy-array order — is the property §12 verifies. This is a property of `submitWithResult` ordering, not of policy-side observation.

If you need batch semantics (one policy's output influencing another within the same tick), wrap them in a single composite policy that does the coordination internally and submits the merged result.

ADR 6 (§15) records this as an explicit non-feature.

## 7. Harness API

```ts
export interface SynthPlaytestConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
  TDebug = JsonValue,
> {
  /** Pre-configured world with components/handlers/validators/systems registered. */
  world: World<TEventMap, TCommandMap, TComponents, TState>;
  /** One or more policies. Empty array == noop. */
  policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
  /** Maximum number of `world.step()` calls. Required. Must be `>= 1` (validated at §7.1 step 1). */
  maxTicks: number;
  /** Optional sink. Default: new MemorySink(). */
  sink?: SessionSink & SessionSource;
  /** Optional human label propagated into bundle metadata. Default: 'synthetic'. */
  sourceLabel?: string;
  /** Seed for the policy sub-RNG. Default: derived once via `Math.floor(world.random() * 0x1_0000_0000)` at harness construction (see ADR 5). */
  policySeed?: number;
  /**
   * Stop the playtest early when this predicate returns truthy. Called after
   * each `step()` with a fresh `StopContext` whose `tick` reflects the
   * just-executed tick. Default: never stop early.
   */
  stopWhen?: (ctx: StopContext<TEventMap, TCommandMap, TComponents, TState>) => boolean;
  /**
   * Recorder snapshotInterval; passed through. Default: 1000. May be `null` to disable
   * periodic snapshots — the harness always captures a terminal snapshot regardless,
   * so the bundle still has the (initial, terminal) segment for selfCheck.
   */
  snapshotInterval?: number | null;
}

// Note: `terminalSnapshot` is intentionally NOT exposed as a config option. The
// harness always passes `terminalSnapshot: true` to `SessionRecorder` so every
// produced bundle has at least the (initial, terminal) segment. Any synthetic
// playtest needs that segment for `SessionReplayer.selfCheck()` to be meaningful;
// allowing the option would re-introduce the vacuous-segment case.

export interface SynthPlaytestResult<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
  TDebug = JsonValue,
> {
  bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
  /**
   * Number of `world.step()` invocations that completed AND were followed by a clean
   * `recorder.lastError` check during the run. Per-case (with `K = world.tick - startTick`):
   * - `'maxTicks'`: `ticksRun === K === maxTicks`.
   * - `'stopWhen'`: `ticksRun === K` (predicate fires post-increment).
   * - `'sinkError'` (mid-tick): `ticksRun === K - 1` (step succeeded but recorder failure
   *   detected on the same tick before the increment).
   * - `'policyError'`: `ticksRun === K` (policy threw before step on tick K+1; world.tick
   *   stayed at startTick + K).
   * - `'poisoned'`: `ticksRun === K - 1` (step on tick K threw; failed tick consumes a number
   *   per ARCHITECTURE.md, but the increment was skipped).
   */
  ticksRun: number;
  /** Why the playtest stopped. `'sinkError'` is mid-tick only — connect-time sink failure throws (see §7.2). */
  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError';
  /** True if the run completed without a recorder/sink error. Poisoned and policyError still produce ok:true (bundle is valid up to the failure). False for 'sinkError'. */
  ok: boolean;
  /** Populated only when stopReason === 'policyError'. */
  policyError?: {
    policyIndex: number;
    tick: number;
    error: { name: string; message: string; stack: string | null };
  };
}

export function runSynthPlaytest<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
  TDebug = JsonValue,
>(
  config: SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState, TDebug>,
): SynthPlaytestResult<TEventMap, TCommandMap, TComponents, TState, TDebug>;
```

### 7.1 Lifecycle

1. **Setup + validation.** Caller constructs a `World`, registers components/handlers/validators/systems. The harness does NOT do this — game-specific setup is the caller's responsibility (mirrors `runScenario`). The harness validates `maxTicks >= 1` and throws a `RangeError` if not — `maxTicks <= 0` would produce a bundle with terminal == initial, over which `selfCheck()` returns `ok: true` vacuously (see §10).
2. **Sub-RNG init.** Harness computes `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)` (the literal expression — see ADR 5). Constructs a private `DeterministicRandom` from this seed. The single default-derivation `world.random()` call advances `world.rng` once BEFORE `recorder.connect()` — so the recorded initial snapshot captures the post-derivation RNG state. Replay reproduces this trivially.
3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot: true, sourceLabel, sourceKind: 'synthetic', policySeed })` — `terminalSnapshot` is hardcoded to `true` so every bundle has the (initial, terminal) segment for selfCheck. Calls `recorder.connect()`. **Then immediately checks `recorder.lastError`** — if set (initial-snapshot or `sink.open()` failure), the harness PROPAGATES the error rather than fabricating a bundle: it calls `recorder.disconnect()` best-effort and re-throws `recorder.lastError`. The recorder may not have produced an initial snapshot at this point, so a returned `bundle` could not be coherent. The caller handles this similarly to `RecorderClosedError({ code: 'world_poisoned' })` propagation. (See §7.2 connect-time failure path.)
4. **Tick loop.** For each tick from `world.tick` up to `world.tick + maxTicks`:
    - Build `policyCtx = { world, tick: world.tick + 1, random: subRng.random.bind(subRng) }`.
    - For each policy in `policies` array:
        - Call `policy(policyCtx)`. If it throws, set `stopReason: 'policyError'`, populate `policyError`, break the outer loop, finalize via §7.2 policy-throw path. (Note: any commands submitted by earlier-index policies in this tick remain in the bundle; see partial-submit note in §7.2.)
        - For each `PolicyCommand` returned, call `world.submitWithResult(cmd.type, cmd.data)`.
    - Call `world.step()`. If it throws (poison), set `stopReason: 'poisoned'`, break, finalize. (Continuing past a poison would just re-throw on the next `step()` until `world.recover()` — which the harness does not invoke — so always stopping on poison is the only defined behavior.)
    - **Check `recorder.lastError`** — if set (sink failure during the tick's writes), break with `stopReason: 'sinkError'`, finalize.
    - **Increment `ticksRun`** here — `step()` completed without recorder failure, so the tick counts.
    - Build `stopCtx = { world, tick: world.tick, random: subRng.random.bind(subRng) }`.
    - Check `stopWhen(stopCtx)`; break with `stopReason: 'stopWhen'` if truthy.
5. **Disconnect.** Call `recorder.disconnect()`. Returns `{ bundle, ticksRun, stopReason, ok, policyError? }`. `ok` is `true` for `'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError'` (the bundle is valid up to the failure point); `false` for `'sinkError'` (recording is incomplete by definition).

### 7.2 Failure modes

- **World poisoned mid-tick.** `world.step()` throws `WorldTickFailureError`. Harness catches, sets `stopReason: 'poisoned'`, calls `recorder.disconnect()`, returns `{ bundle, ticksRun, stopReason, ok: true }`. Bundle has the failed tick recorded in `metadata.failedTicks` via the existing `SessionRecorder` machinery — no synthesis.
- **World already poisoned at start.** `recorder.connect()` throws `RecorderClosedError(code: 'world_poisoned')`. The harness propagates this — caller must `world.recover()` first.
- **Connect-time sink failure.** `recorder.connect()` does NOT throw on initial-snapshot/`sink.open()` failure — it flips `_connected:true`, stores the error in `recorder.lastError`, and marks itself terminal. The harness checks `recorder.lastError` immediately after `connect()` returns (see §7.1 step 3). On detection: best-effort `recorder.disconnect()`, then **re-throw `recorder.lastError`**. The recorder may not have persisted an initial snapshot at this point, so there's no coherent bundle to return — propagating the error matches the existing world-poisoned-at-start convention. `'sinkError'` as a `stopReason` value is reserved for **mid-tick** sink failures only, where at least the initial snapshot was written and the partial bundle is meaningful.
- **Mid-tick sink failure.** `recorder.lastError` may be set during a tick's writes (e.g., disk full). The harness MUST check this after `world.step()` (see §7.1 step 4) and break with `stopReason: 'sinkError'`, then call `recorder.disconnect()` (which short-circuits because `_terminated` is already set) and return `{ bundle, ticksRun, stopReason, ok: false }`.
- **Policy throws.** Harness catches, sets `stopReason: 'policyError'`, populates `policyError: { policyIndex, tick, error }`, calls `recorder.disconnect()`, returns `{ bundle, ticksRun, stopReason, ok: true }`. **`bundle.failures` is NOT modified** — the world isn't poisoned, no `TickFailure` is synthesized. Callers reading `result.policyError` get the actionable info.
- **Composed-policy partial submit.** When `policies.length > 1` and `policies[i]` throws after `policies[0..i-1]` returned commands, the harness has already submitted those earlier commands to the world via `world.submitWithResult` (per the per-policy submit pattern in §7.1 step 4). They appear in `bundle.commands` for the failing tick. `world.step()` never ran for that tick, so the failing tick has commands without matching executions. `selfCheck` doesn't replay across the abort point — the orphan is benign; `result.policyError` carries the actionable info. (A `commands.length > executions.length` shape is also produced by validator-rejected commands during normal runs — the gap alone is not specific to policy throws; `result.policyError` is the authoritative signal.)

### 7.3 Determinism

A synthetic playtest is **production-deterministic** if:
- `world` is freshly constructed with the same seed + same registrations.
- Same policies (functions or class instances initialized the same way).
- Same `maxTicks` / `stopWhen` / `policySeed` / `snapshotInterval` (different snapshot intervals produce structurally different bundles).
- Identical engine and Node versions (per spec §11.1 clause 9).

Re-running with these inputs produces structurally-equal bundles modulo:
- `metadata.sessionId` (UUID, intentionally fresh).
- `metadata.recordedAt` (wall-clock timestamp).
- `markers[].id` and `attachments[].id` (UUIDs — though v1 harness adds none).

A synthetic playtest is **replay-deterministic** (selfCheck-passing) regardless of policy implementation, because:
- Replay re-submits recorded commands and steps the world; it never invokes policies.
- World RNG state at any tick depends only on system code, command stream, and tick lifecycle — none of which involve policies at replay time.
- Provided policies route their randomness through `ctx.random()` (sub-RNG, not `world.rng`), the captured snapshots contain the same world state replay reproduces.

§12 tests both forms.

## 8. Bundle Format

`SessionMetadata.sourceKind` extended to `'session' | 'scenario' | 'synthetic'`. `SessionMetadata.policySeed?: number` added (populated only when `sourceKind === 'synthetic'`). Otherwise the bundle is identical to the `'session'` variant — same recorder, same sink, same replay path.

`metadata.sourceLabel` defaults to `'synthetic'` but can be overridden via config (e.g., `'random-spawn-1000-ticks'`).

The bundle is replayable via `SessionReplayer` like any other. Useful pattern: synthetic playtest produces a bundle, agent loads it via `fromBundle`, scrubs the timeline, identifies anomalies.

## 9. Integration with Existing Primitives

- **`SessionRecorder`**: used internally; the harness is a thin orchestrator. `SessionRecorderConfig` gains `sourceKind?` and `policySeed?` optional fields; defaults preserve existing behavior for non-harness callers.
- **`SessionReplayer`**: bundles produced are replayable / selfCheckable like any other.
- **`scenarioResultToBundle`**: orthogonal — scenarios test specific outcomes; synthetic playtests explore. A scenario can include checks; a synthetic playtest doesn't.
- **`runScenario`**: shares the "set up world, run, capture bundle" pattern but with a scripted run callback rather than policies. The two are intentionally separate — composing them (running a scenario *as* a policy) is possible but adds no value.
- **`SessionRecordingError` family**: same error types apply (poisoned world, sink failures, etc.).
- **`DeterministicRandom`**: already re-exported from `src/index.ts` (`export * from './random.js'` at `src/index.ts:14`); harness uses it for the policy sub-RNG.

## 10. Determinism Self-Check (CI Pattern)

Recommended pattern for CI:

```ts
import { runSynthPlaytest, randomPolicy, SessionReplayer } from 'civ-engine';

function makeWorld() { /* ... */ }

function setupBehavior(world) { /* register components, handlers, etc. */ }

const result = runSynthPlaytest({
  world: setupBehavior(makeWorld()),
  policies: [randomPolicy({ catalog: [/* ... */] })],
  maxTicks: 1000,
  policySeed: 42,
});

const replayer = SessionReplayer.fromBundle(result.bundle, {
  worldFactory: (snap) => {
    const w = makeWorld();
    setupBehavior(w);
    w.applySnapshot(snap);
    return w;
  },
});
expect(replayer.selfCheck().ok).toBe(true);
```

Per spec §13.5 of the session-recording design (CI gate), **non-poisoned** synthetic playtests in the engine's test corpus should pass `selfCheck` — same gate that non-poisoned scenario bundles use.

`selfCheck` only proves replay-determinism over segments between snapshots. The harness always captures a terminal snapshot at `disconnect()` time (`terminalSnapshot: true` is hardcoded — see §7.1 step 3), so the bundle has the (initial, terminal) segment **provided at least one `world.step()` advanced the world**. For runs where the harness aborts before the first successful step (e.g., pre-step `policyError` on tick 1 — connect succeeded with `recorder.lastError === null`, then a policy throws before any `step()`), the terminal snapshot writes at the same tick as the initial — a zero-length segment over which `selfCheck()` returns `ok: true` vacuously.

**Poisoned bundles aren't selfCheck-able.** When `stopReason === 'poisoned'`, `world.step()` threw on the failing tick. `SessionReplayer.selfCheck()` skips a segment only when `failedTick < segmentEnd` (`session-replayer.ts:286`); the harness's terminal snapshot bounds the final segment AT the failed tick, so it's NOT skipped. `_checkSegment` replays through `world.step()` and re-throws the same exception. selfCheck propagates the throw — it doesn't return `{ ok: false }`. Poisoned bundles are still useful (load into a viewer, inspect `metadata.failedTicks`, scrub the timeline) but selfCheck is not the right tool. CI guard pattern:

```ts
if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
  expect(replayer.selfCheck().ok).toBe(true);
}
```

§12 covers this taxonomy: positive selfCheck on non-poisoned bundles + the `ticksRun === 0` vacuous-selfCheck case + a poisoned-bundle test that asserts the throw rather than `selfCheck().ok`.

For **production-determinism** verification (re-running produces the same bundle), the test pattern is two harness calls with identical config, then `expect(bundle1.commands).toEqual(bundle2.commands)` and the same for snapshots / events. §12 covers this.

## 11. Performance

- **Per-tick cost.** Harness adds: one policy invocation per policy + one `submitWithResult` call per emitted command + the existing `step()` cost. Sub-RNG `random()` cost is one `DeterministicRandom.random()` call (cheap; same as `world.random()`). Recorder per-tick cost is unchanged from a live recording (one `onDiff`, one `writeTick`, snapshot every N).
- **Memory.** `MemorySink` accumulates the entire bundle. For 10k-tick × 50-command runs, expected size is ~O(commands × payload-size + ticks × diff-size); use `FileSink` for large captures.
- **Parallelism.** Each `runSynthPlaytest` is self-contained (no shared state). Multiple invocations across processes scale linearly until disk I/O contends. Caller orchestrates.

## 12. Testing Strategy

Unit / integration tests target:

- **Built-in policies**:
    - `noopPolicy` returns `[]` always.
    - `randomPolicy` with seed produces deterministic catalog selections; respects `frequency`, `offset`, `burst`. Two runs with same seed produce identical command streams.
    - `scriptedPolicy` emits the right entry at the right tick; ignores unmatched ticks.
- **Composition**: multiple policies' outputs are submitted in array order; `bundle.commands[].submissionSequence` matches policy-array order across composed policies on a given tick (external assertion — ADR 6 explicitly says policies don't observe each other within a tick).
- **Sub-RNG isolation (positive case)**: a policy that calls `ctx.random()` does NOT advance `world.rng`. Test: record a synthetic bundle, replay via `SessionReplayer.selfCheck()`, expect `ok: true`.
- **Sub-RNG isolation (negative case)**: a misbehaving policy that calls `world.random()` directly (i.e., violates the §5.4 contract) produces a bundle whose `selfCheck()` returns `ok: false` with state divergence at the first periodic snapshot. This proves the safety net works — a future regression that lets policies perturb `world.rng` would be caught by this test.
- **Stop conditions**:
    - `maxTicks` fires after exactly N steps. Validation: `maxTicks <= 0` throws.
    - `stopWhen` fires when predicate returns truthy. `StopContext.tick === world.tick` (post-step).
    - `'poisoned'` fires after a system throw (the harness always stops on poison; `stopOnPoisoned: false` does not exist).
- **Failure modes**:
    - Poisoned world at start propagates `RecorderClosedError`.
    - Connect-time sink failure: harness re-throws `recorder.lastError`; no bundle returned.
    - Policy throw mid-run → `stopReason: 'policyError'`, `policyError` populated, bundle still returned, `bundle.failures` unchanged.
    - Pre-step policy throw on tick 1 → `ticksRun === 0`, bundle has only the initial+terminal-at-tick-0 segment, `selfCheck()` is vacuously `ok:true` (caller must guard with `ticksRun >= 1` per §10).
    - Composed-policy partial-submit-then-throw: bundle has commands without matching executions for the failed tick; selfCheck doesn't replay across the abort point.
    - Mid-tick sink write failure → `ok: false`, `stopReason: 'sinkError'`.
- **Determinism** (the headline use case):
    - **Production-determinism**: two runs with identical config produce structurally-equal bundles (modulo sessionId / recordedAt / marker UUIDs).
    - **Replay-determinism**: `SessionReplayer.selfCheck()` returns `ok: true` on **non-poisoned** synthetic bundles where `result.ticksRun >= 1`. Passes regardless of the policy's implementation as long as policies don't perturb world.rng.
    - **Poisoned bundle replay**: a synthetic bundle with `stopReason: 'poisoned'` causes `selfCheck()` to throw the original tick-failure exception during `_checkSegment` (see §10). Test asserts the throw, not `ok`.
    - **Sub-RNG seeded determinism**: omitting `policySeed` works (default derived from `world.random()`); explicit `policySeed: N` reproduces.
- **Bundle metadata**:
    - `sourceKind: 'synthetic'`.
    - `sourceLabel` defaults to `'synthetic'`; override works.
    - `policySeed` populated.
    - `failedTicks` correctly populated when poisoning occurs mid-run.

Acceptance criterion: 100% of new code covered by tests; `npm test` exercises selfCheck on a representative synthetic bundle and exercises production-determinism for at least one harness invocation.

## 13. Documentation Surface

Per AGENTS.md "Always update if the change introduces or removes API surface":

- `docs/api-reference.md` — new sections for `Policy`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `PolicyContext`, `StopContext`, `PolicyCommand`. Update `SessionRecorderConfig` to document the new `sourceKind?` and `policySeed?` optional fields. Update `SessionMetadata` to document the widened `sourceKind` and new `policySeed?`. TOC updated.
- `docs/guides/synthetic-playtest.md` (new) — quickstart, policy authoring guide, determinism contract for policies, sub-RNG explanation, CI pattern.
- `docs/guides/session-recording.md` — extend with a brief section on synthetic-source bundles and the new `sourceKind: 'synthetic'` value.
- `docs/guides/ai-integration.md` — note synthetic playtest as a Tier-1 piece of the AI-first feedback loop.
- `docs/architecture/ARCHITECTURE.md` — Component Map row.
- `docs/architecture/decisions.md` — ADRs for the policy contract, sub-RNG design, sourceKind extension, and composition observation property.
- `docs/architecture/drift-log.md` — entry for the subsystem.
- `docs/changelog.md` — version entries (see §14).
- `docs/devlog/summary.md` + `detailed/` — per-task entries.
- `README.md` — Feature Overview row + Public Surface bullet + version badge.
- `docs/README.md` — index entry.
- `docs/design/ai-first-dev-roadmap.md` — mark Spec 3 status: Drafted → Implemented.

## 14. Versioning

Per AGENTS.md per-commit version-bump policy. Branch base: **v0.7.19** (latest on `main` after the session-recording followups merge at `c849b9a`). The `agent/synthetic-playtest` branch was rebased on top of this tip.

Plan structure (3 commits, docs folded into the commits that introduce the API):

- **T1 (v0.7.20)** — `c`-bump (purely additive). Policy interface, sub-RNG plumbing, three built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`), unit tests covering each policy's behavior. Doc surface: `docs/api-reference.md` sections for **all symbols T1 ships** — `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy` (types AND functions, per AGENTS.md doc-discipline). Changelog entry, devlog, version bump. `docs/architecture/decisions.md` lands ADRs 1, 2, 5 (policy-is-function, read-only-world, sub-RNG). The end-to-end guide ships in T2 because the harness API isn't usable without `runSynthPlaytest`.
- **T2 (v0.8.0)** — **`b`-bump because the public type surface widens (breaking)**. `SessionMetadata.sourceKind` widens from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'` (ADR 3 — would break downstream `assertNever` exhaustive switches). The `b`-bump consumes the entire breakage at once. Other changes ride along as additive: `SessionRecorderConfig` gains optional `sourceKind?` and `policySeed?`, `SessionMetadata.policySeed?` is added, and `runSynthPlaytest` + `SynthPlaytestConfig` + `SynthPlaytestResult` ship. Tests cover lifecycle + each stop reason + each failure mode + composition external-ordering. Doc surface: full `docs/api-reference.md` updates for `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, plus updated sections for `SessionRecorderConfig` and `SessionMetadata`. New `docs/guides/synthetic-playtest.md`. `docs/guides/session-recording.md` extension. ADRs 3, 3a, 4, 6 land here.
- **T3 (v0.8.1)** — `c`-bump (additive). Determinism integration tests (synthetic bundle round-trips through `SessionReplayer.selfCheck`; production-determinism dual-run test; sub-RNG negative-path test per §12). Architecture docs: `docs/architecture/ARCHITECTURE.md` Component Map + drift-log entry. Roadmap status update. No new ADRs in T3.

`SessionMetadata.sourceKind` widening would break downstream `assertNever`-style exhaustive switches over the union, so per AGENTS.md ("Whenever you introduce a breaking change, bump `b` and reset `c`") T2 is a `b`-bump. The other T2 changes (`SessionRecorderConfig.sourceKind?`, `SessionRecorderConfig.policySeed?`, `SessionMetadata.policySeed?`) are additive but ride along on the same `b`-bump. ADR 3 captures the trade-off.

## 15. Architectural Decisions

### ADR 1: Policy is a function, not a class hierarchy

**Decision:** `Policy<TEventMap, TCommandMap>` is a plain function type. Stateful policies use closures or class methods that satisfy the function type via `() => instance.decide.bind(instance)`. No abstract base class.

**Rationale:** Functions are simpler, type-friendly, and trivially composable. A class hierarchy would invite premature inheritance ("RandomPolicy extends BasePolicy") that doesn't earn its keep at this scope. The pattern matches existing engine conventions (`System`, `validator`, `handler` are all callable types).

### ADR 2: Policies receive read-only world; mutation is via returned commands

**Decision:** `PolicyContext.world` is the live `World` (TypeScript can't enforce read-only without a wrapper, which adds runtime overhead). The contract is: policies MUST NOT mutate. Violations are caught by `selfCheck` divergence on the resulting bundle.

**Rationale:** Forcing policies to go through `submit()` (rather than direct mutation) keeps their effects visible in the bundle's command stream — essential for replay. Wrapping the world in a runtime read-only proxy would catch violations earlier but add per-call overhead; deferred until concrete need.

### ADR 3: `SessionMetadata.sourceKind` extended, lands as a `b`-bump

**Decision:** Extend the union type from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Keep `'session'` and `'scenario'` semantics unchanged. **Bumps `b` per AGENTS.md** ("Whenever you introduce a breaking change, bump `b` and reset `c`").

**Rationale:** Bundle consumers (replayer, future viewer, future corpus index) need to distinguish synthetic from organic recordings — different policies for retention, analysis, and triage. Engine-internal consumers don't branch on this field (verified — only producers exist), so engine builds are unaffected. Downstream consumers using `assertNever` exhaustive switches over `sourceKind` will fail to compile until they add a `case 'synthetic':` branch — this is the expected build-break for a strict-mode TS consumer. AGENTS.md treats type-surface widening that breaks compile as a breaking change regardless of pre-1.0 status; T2 absorbs this with a single `b`-bump rather than fragmenting the breakage across multiple commits.

### ADR 3a: `sourceKind` is set at `SessionRecorder` construction, not via post-hoc sink mutation

**Decision:** `SessionRecorderConfig` gains an optional `sourceKind?: 'session' | 'scenario' | 'synthetic'` field (default `'session'`). `SessionRecorder.connect()` reads this field into the initial metadata. The harness passes `sourceKind: 'synthetic'` at construction; never mutates sink metadata.

**Rationale:** The iter-1 plan had the harness mutate `sink.metadata.sourceKind` after `connect()` returns. This was unsound:
- For `FileSink`, `sink.open()` synchronously flushes `manifest.json` to disk during `connect()`. A harness crash between `connect()` and the first periodic snapshot would leave the on-disk bundle saying `sourceKind: 'session'` despite being synthetic.
- A custom user-implemented sink that snapshots metadata during `open()` would silently record the wrong kind.
- It reaches into a sibling subsystem's mutable state — not how `SessionRecorder` or `scenarioResultToBundle` produce metadata today.

The new field is type-additive; existing callers of `SessionRecorder` see no change.

### ADR 4: Harness is synchronous and single-process

**Decision:** `runSynthPlaytest` is a synchronous function that runs to completion or returns early. No async / streaming / cross-process orchestration in v1.

**Rationale:** Synchronous matches the engine's existing tick model and the session-recording subsystem's sink contract. Async policies (LLM-driven) are deferred to Spec 9 (AI Playtester); cross-process orchestration is a CI-script concern, not an engine API.

### ADR 5: Policy randomness uses a separate seeded sub-RNG, not `world.random()`

**Decision:** The harness owns a private `DeterministicRandom` instance. `PolicyContext.random()` and `StopContext.random()` are bound to this instance. Policies (including `randomPolicy`) MUST use `ctx.random()`, not `world.random()`, for any randomness.

**Literal seed expression:** `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)`. The `Math.floor(... * 0x1_0000_0000)` scaling is deliberate: `world.random()` returns a `[0, 1)` float; `DeterministicRandom`'s `seedToUint32` (`src/random.ts:46-50`) does `Math.trunc(x) >>> 0` for numeric seeds, which would collapse every value in `[0, 1)` to **0**. Scaling to a uint32 first preserves the world's RNG state in the seed. Quote this expression verbatim in §7.1 step 2 and §5.4.

**Rationale:** A policy calling `world.random()` between ticks advances `world.rng`. The next snapshot captures that advance. `SessionReplayer` replays commands and `world.step()` but does NOT re-invoke policies — its `world.rng` evolves only with system code, so its captured snapshot's RNG state diverges from the recorded one. `_checkSegment` reports a state divergence at the first periodic snapshot, every time. The engine has explicit precedent against this pattern (`tests/command-transaction.test.ts:567` — "predicate cannot call random() — would advance RNG and break determinism").

A separate sub-RNG eliminates the issue: `ctx.random()` doesn't touch `world.rng`, so replay reproduces world state exactly. The single seed-derivation `world.random()` call (when `policySeed` is defaulted) happens BEFORE `recorder.connect()`, so the captured initial snapshot reflects the post-derivation `world.rng` state. The seed is stored in `SessionMetadata.policySeed` for future replay-via-policy work.

**Alternative considered and rejected:** save and restore `world.rng.getState()` around each policy invocation, so policy `world.random()` calls don't durably perturb `world.rng`. The problem with this: each policy in a composed array would observe the same restored state at the start of its call, so any two policies that called `world.random()` the same number of times would see the same values — they'd silently shadow each other's RNG draws unless each received its own per-policy sub-RNG split. At that point we're back to per-policy sub-RNGs, with the additional complexity of save/restore plumbing. The single-shared-sub-RNG-via-`ctx.random()` design is mechanically simpler and exposes the seeding contract directly.

### ADR 6: Composed policies do NOT observe each other's submissions within a tick

**Decision:** When multiple policies share a tick (composition), they receive the same `PolicyContext.world` reference at policy-call time. The harness submits each policy's commands in array order, but no public surface exposes earlier-policy submissions to later policies during the same tick. The `submissionSequence` ordering is observable externally on the resulting bundle (and matches policy-array order); within a tick, policies are computational siblings, not a pipeline.

**Rationale:** The earlier draft of this ADR claimed policies could observe `world.commandQueue` and `nextCommandResultSequence` to inspect earlier-policy submissions. Both fields are `private` in `World` (`world.ts:252,277`), and `docs/architecture/ARCHITECTURE.md:88` explicitly says "Do not access the queue directly". Handlers don't run until `world.step()`, and `world.getEvents()` returns the *previous* tick's events — so within a tick there is no public surface through which policies could see each other's submissions. Advertising the property would have promised a feature the engine doesn't expose.

We could add such a surface (`ctx.peekPendingCommands()` backed by a public `world.peekPendingCommands()`), but that's real new World-API expansion and is outside Tier-1 scope. If the use case materializes, a future spec can add it with its own ADR.

If batch semantics are genuinely needed (one policy's output influencing another within the same tick), the user wraps the dependent policies in a single composite policy that performs the merge internally and submits the combined result.

§12 verifies the external-ordering property: `bundle.commands[].submissionSequence` across composed policies on a given tick matches policy-array order. This is the testable shape; the within-tick observation property is explicitly NOT a testable claim.

## 16. Open Questions / Deferred

1. **Frequency vs interval semantics in randomPolicy.** `frequency` is the modulo divisor (every N ticks); `burst` is the per-fired-tick count. v1 ships this; usability may dictate adjustment.
2. **Multi-policy dispatch order.** Strict array order (chosen, ADR 6) vs round-robin vs phase-tagged (input/preUpdate/...). v1 ships strict array order; phase-tagged dispatch can come later if game projects need it.
3. **Bounded vs unbounded random catalogs.** The catalog is a fixed-length array; for huge catalogs (1000s of command types), random selection becomes expensive. Out of scope for v1.
4. **Bundle records which policies were used.** Only `sourceLabel` carries attribution today. Tier-2 work to record per-tick policy attribution (which policy emitted which command) would help corpus analysis disambiguate runs. Defer to Spec 7/8.
5. **Replay-via-policy.** Future spec could rebuild policy state from `policySeed` and verify the policy itself produces the recorded command stream. v1 stores the seed but doesn't exercise this path.

## 17. Future Specs (this surface unlocks)

| Future Spec                          | What it adds                                                  |
| ------------------------------------ | ------------------------------------------------------------- |
| #5 Counterfactual Replay / Fork      | Synthetic playtest forked from a recorded bug                 |
| #7 Bundle Search / Corpus Index      | Indexes synthetic bundles for query                           |
| #8 Behavioral Metrics over Corpus    | Aggregates synthetic-playtest bundles; computes metrics       |
| #9 AI Playtester Agent               | LLM-driven Policy implementation                              |

## 18. Acceptance Criteria

- All twelve new symbols (`Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy`) exported from `src/index.ts` with full TypeScript types. All policy-surface generics carry the same four-parameter shape as `World<TEventMap, TCommandMap, TComponents, TState>`, with defaults preserving ergonomics for callers that don't care about typed components/state.
- `SessionRecorderConfig` extended with optional `sourceKind?` and `policySeed?` (additive).
- `SessionMetadata.sourceKind` widened to include `'synthetic'`. `SessionMetadata.policySeed?` added.
- Test coverage: ≥1 test per built-in policy + harness lifecycle + each stop reason + each failure mode + 1 selfCheck round-trip + 1 production-determinism dual-run + 1 sub-RNG isolation positive test + 1 sub-RNG negative-path test (policy calls `world.random()` → `selfCheck.ok === false`) + 1 composition external-ordering test.
- All four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
- §13 doc updates land in the same commits as the code that introduces each surface.
- Multi-CLI design review and (separately) code review reach convergence — reviewers nitpick rather than catching real issues, per AGENTS.md.
- Branch is rebase-clean against `main` and ready for explicit user merge authorization.
