# Synthetic Playtest Harness — Design Spec

**Status:** Draft v1 (2026-04-27). Awaiting iter-1 multi-CLI review.

**Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.16). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).

**Author:** civ-engine team

**Related primitives:** `SessionRecorder`, `SessionBundle`, `MemorySink`, `FileSink`, `World`, `world.submit()`, `world.random()`, `runScenario`, `scenarioResultToBundle`.

## 1. Goals

This spec defines an engine-level harness that:

- Constructs a `World`, attaches a `SessionRecorder`, drives `world.submit()` from a **pluggable policy** for `N` ticks, and saves the resulting `SessionBundle`.
- Provides built-in policies (random, scripted, no-op) covering the common low-effort cases.
- Composes multiple policies — useful when different policies drive different command types (e.g., one policy spawns units, another moves them).
- Supports configurable stop conditions (max ticks, poisoned-world detection, custom predicates).
- Produces deterministic bundles given identical seed + setup + policies, so a synthetic playtest can be re-run with the same outcome.
- Is trivially parallelizable across processes (each playtest is a synchronous self-contained run; multiple instances can run on different cores/machines without shared state).

The deliverable is an opt-in API surface; existing engine consumers see no behavioral change.

## 2. Non-Goals

- **LLM-driven policies**: The interface accommodates them (Policy is a function or class), but no built-in LLM policy ships. Future spec (Tier 2 #9 in the roadmap) covers the AI playtester.
- **Bundle corpus management**: A harness run produces one bundle. Aggregating thousands of bundles, indexing, querying, and displaying them is Spec 7's job.
- **Behavioral metrics**: Computing "median session length dropped 30%" across a corpus is Spec 8.
- **Cross-process orchestration**: The harness runs one playtest per call. Splitting work across cores/machines is the caller's responsibility (e.g., a CI script that runs 32 invocations in parallel). The harness is designed to be *parallelizable* (no shared state, deterministic given inputs) but doesn't ship a parallel runner.
- **Async/streaming policies**: v1 policies are synchronous. Async policies (e.g., LLM API calls per tick) would need either an async harness or a buffered wrapper; both are deferred to future specs.
- **Game-side integration**: This is engine-side infrastructure. Game projects build their own scenario-specific synthetic-playtest scripts on top.

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

Three new symbols, all in `src/synthetic-playtest.ts`:

| Component            | Status            | Responsibility                                                                                       |
| -------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `Policy`             | new (interface)   | Pluggable command source. Given a read-only world snapshot and tick, returns the commands to submit. |
| `runSynthPlaytest()` | new (function)    | Drives a World forward through `maxTicks`, calling each policy per tick, recording into a sink.      |
| Built-in policies    | new (functions)   | `randomPolicy(catalog, seed)`, `scriptedPolicy(sequence)`, `noopPolicy()`                            |

Plus one additive change to `SessionMetadata.sourceKind`: extend the union from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. `SessionRecorder` and `scenarioResultToBundle` are unaffected; `runSynthPlaytest` sets `sourceKind: 'synthetic'`.

```
              ┌────────────────────────────────────────────────────┐
              │              runSynthPlaytest(config)              │
              │                                                    │
              │  ┌──────────┐    ┌──────────────┐    ┌──────────┐  │
              │  │ World    │◀───│ Policy[]     │    │ Sink     │  │
              │  │ (driven) │    │ .decide()    │    │ (bundle) │  │
              │  └─────┬────┘    └──────────────┘    └────┬─────┘  │
              │        │                                  │        │
              │        ▼                                  ▲        │
              │  ┌──────────────────────┐                 │        │
              │  │ SessionRecorder      │─────────────────┘        │
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

A policy is a function (or stateful class with a method) that, given a tick number, returns the commands to submit *before* `world.step()` advances the world.

```ts
export interface PolicyContext<TEventMap, TCommandMap> {
  /** Read-only view of the current world. Policies must NOT mutate. */
  readonly world: World<TEventMap, TCommandMap>;
  /** The tick that's about to execute (i.e., commands submitted now run during this tick). */
  readonly tick: number;
}

export type Policy<TEventMap, TCommandMap> = (
  context: PolicyContext<TEventMap, TCommandMap>,
) => PolicyCommand<TCommandMap>[];

export interface PolicyCommand<TCommandMap> {
  type: keyof TCommandMap & string;
  data: TCommandMap[keyof TCommandMap];
}
```

### 5.1 Determinism contract for policies

Policies MUST be deterministic given their inputs (`world` state + `tick`). Any randomness MUST flow through `world.random()` (the seeded engine RNG); `Math.random()` / `crypto.randomUUID()` / etc. are forbidden. `Date.now()` and `process.env` are forbidden inside a policy. Same as the spec §11 determinism contract for systems.

The harness does NOT structurally enforce this; `SessionReplayer.selfCheck` on the resulting bundle is the verification mechanism. CI-style usage should run `selfCheck` on every produced bundle.

### 5.2 Policies are pure functions w.r.t. the world

Policies receive `context.world` for read-only inspection, but they must NOT mutate via `setComponent` / `setPosition` / `setState` / etc. Mutation goes through the returned `PolicyCommand[]` only — those are submitted via `world.submitWithResult` by the harness, which respects validators and handlers.

The harness does NOT enforce this with a runtime proxy (would add overhead). It's a contract: violating it produces non-deterministic bundles flagged by selfCheck.

### 5.3 Stateful policies

A policy can carry state across calls by being a closure or a method on a class:

```ts
function memoryPolicy(): Policy<TEventMap, TCommandMap> {
  const seen = new Set<EntityId>();
  return (ctx) => {
    const newOnes = [...ctx.world.query('unit')].filter((id) => !seen.has(id));
    for (const id of newOnes) seen.add(id);
    return newOnes.map((id) => ({ type: 'spawn', data: { parent: id } }));
  };
}
```

Stateful policies must keep their state JSON-compat-clean and seeded from `world.random()` to remain deterministic. Replays use the same policy instance only when the harness is re-run — replay via `SessionReplayer` doesn't invoke policies (it replays from `bundle.commands`).

## 6. Built-in Policies

### 6.1 `noopPolicy()`

Submits nothing. Useful for letting world systems advance without external input.

```ts
export function noopPolicy<TEventMap, TCommandMap>(): Policy<TEventMap, TCommandMap> {
  return () => [];
}
```

### 6.2 `randomPolicy({ catalog, frequency, rngState? })`

Picks a random command from a caller-supplied catalog. Frequency controls how often (every N ticks).

```ts
export interface RandomPolicyConfig<TCommandMap> {
  /**
   * Catalog of command-generators. Each entry is invoked with the policy
   * context to produce a concrete command. The harness picks one entry
   * uniformly at random per emit, via `world.random()`.
   */
  catalog: Array<(ctx: PolicyContext<never, TCommandMap>) => PolicyCommand<TCommandMap>>;
  /** Emit on ticks where `tick % frequency === offset`. Default frequency: 1; offset: 0. */
  frequency?: number;
  offset?: number;
  /** Number of commands to emit per fired tick. Default: 1. */
  burst?: number;
}

export function randomPolicy<TEventMap, TCommandMap>(
  config: RandomPolicyConfig<TCommandMap>,
): Policy<TEventMap, TCommandMap>;
```

The catalog is functions, not data, so commands can reference live world state (e.g., pick a random existing entity to target). This avoids requiring policies to crawl `world.query()` themselves.

### 6.3 `scriptedPolicy(sequence)`

Plays back a pre-recorded list of `{ tick, type, data }` entries. Useful for regression scenarios derived from real bug bundles.

```ts
export interface ScriptedPolicyEntry<TCommandMap> {
  tick: number;       // tick on which to submit
  type: keyof TCommandMap & string;
  data: TCommandMap[keyof TCommandMap];
}

export function scriptedPolicy<TEventMap, TCommandMap>(
  sequence: ScriptedPolicyEntry<TCommandMap>[],
): Policy<TEventMap, TCommandMap>;
```

Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the sequence emit nothing.

### 6.4 Composition

Multiple policies are passed as an array. Each gets called per tick; their command outputs are concatenated and submitted in policy-array order. This is intentional — order determines `submissionSequence`, which the engine respects.

## 7. Harness API

```ts
export interface SynthPlaytestConfig<TEventMap, TCommandMap, TDebug = JsonValue> {
  /** Pre-configured world with components/handlers/validators/systems registered. */
  world: World<TEventMap, TCommandMap>;
  /** One or more policies. Empty array == noop. */
  policies: Policy<TEventMap, TCommandMap>[];
  /** Maximum number of `world.step()` calls. Required. */
  maxTicks: number;
  /** Optional sink. Default: new MemorySink(). */
  sink?: SessionSink & SessionSource;
  /** Optional human label propagated into bundle metadata. Default: 'synthetic'. */
  sourceLabel?: string;
  /**
   * Stop the playtest early when this predicate returns truthy. Called after
   * each `step()` with the post-step world. Default: never stop early.
   */
  stopWhen?: (ctx: PolicyContext<TEventMap, TCommandMap>) => boolean;
  /**
   * If true (default), stop the playtest as soon as the world becomes
   * poisoned. The bundle still records the failed tick. If false, the
   * playtest tries to continue past the failure (which will throw, so this
   * is rarely useful).
   */
  stopOnPoisoned?: boolean;
  /** Recorder snapshotInterval; passed through. Default: 1000. */
  snapshotInterval?: number | null;
  /** Recorder terminalSnapshot; passed through. Default: true. */
  terminalSnapshot?: boolean;
}

export interface SynthPlaytestResult<TEventMap, TCommandMap, TDebug> {
  bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
  ticksRun: number;
  /** Why the playtest stopped: 'maxTicks' | 'stopWhen' | 'poisoned'. */
  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned';
  /** True if the run completed without error (poisoned counts as completion). */
  ok: boolean;
}

export function runSynthPlaytest<TEventMap, TCommandMap, TDebug = JsonValue>(
  config: SynthPlaytestConfig<TEventMap, TCommandMap, TDebug>,
): SynthPlaytestResult<TEventMap, TCommandMap, TDebug>;
```

### 7.1 Lifecycle

1. **Setup.** Caller constructs a `World`, registers components/handlers/validators/systems. The harness does NOT do this — game-specific setup is the caller's responsibility (mirrors `runScenario`).
2. **Recorder attach.** The harness creates a `SessionRecorder` with the configured sink, `snapshotInterval`, `terminalSnapshot`, and `sourceLabel`. Calls `recorder.connect()`. **`metadata.sourceKind` is set to `'synthetic'`** — the harness mutates the metadata on the recorder's sink after `connect()` completes (or, simpler, the harness reads sink.metadata and mutates the field; it's a string union extension, not a structural break).
3. **Tick loop.** For each tick from `world.tick` up to `world.tick + maxTicks`:
    - Call each policy with `context = { world, tick: world.tick + 1 }` (the tick that's about to execute).
    - For each `PolicyCommand` returned, call `world.submitWithResult(cmd.type, cmd.data)`.
    - Call `world.step()`.
    - Check `stopWhen(context)`; break with `stopReason: 'stopWhen'` if truthy.
    - Check `world.isPoisoned()`; break with `stopReason: 'poisoned'` if `stopOnPoisoned`.
    - Increment `ticksRun`.
4. **Disconnect.** Call `recorder.disconnect()`. Returns `{ bundle, ticksRun, stopReason, ok }`.

### 7.2 Failure modes

- **World poisoned mid-tick.** `world.step()` throws `WorldTickFailureError`. The harness catches, sets `stopReason: 'poisoned'`, calls `recorder.disconnect()`, returns `{ bundle, ticksRun, stopReason, ok: true }`. The bundle has the failed tick recorded in `metadata.failedTicks`.
- **World already poisoned at start.** The recorder's `connect()` throws `RecorderClosedError(code: 'world_poisoned')`. The harness propagates this — caller must `world.recover()` first.
- **Policy throws.** The harness catches, sets `stopReason: 'poisoned'` (treating policy errors equivalently), records the failure into bundle.failures via a synthetic TickFailure, and returns. (Alternative: propagate; chosen "graceful return" because bundles from partial runs are still useful for debugging policy bugs.)
- **Sink write failure.** `SessionRecorder` already handles this — sets `metadata.incomplete = true`, marks itself terminal. Harness sees this via `recorder.lastError` and returns `ok: false`.

### 7.3 Determinism

A synthetic playtest is deterministic if:
- `world` is freshly constructed with the same seed + same registrations.
- Same policies (functions or class instances initialized the same way).
- Same `maxTicks` / `stopWhen` / `stopOnPoisoned`.
- Identical engine and Node versions (per spec §11.1 clause 9).

Re-running with these inputs produces the same `SessionBundle` (modulo `metadata.sessionId` and `metadata.recordedAt`, which are intentionally non-deterministic). Replay via `SessionReplayer.selfCheck()` should pass on every produced bundle.

## 8. Bundle Format

`SessionMetadata.sourceKind` extended to `'session' | 'scenario' | 'synthetic'`. Otherwise the bundle is identical to the `'session'` variant — same recorder, same sink, same replay path.

`metadata.sourceLabel` defaults to `'synthetic'` but can be overridden via config (e.g., `'random-spawn-1000-ticks'`).

The bundle is replayable via `SessionReplayer` like any other. Useful pattern: synthetic playtest produces a bundle, agent loads it via `fromBundle`, scrubs the timeline, identifies anomalies.

## 9. Integration with Existing Primitives

- **`SessionRecorder`**: used internally; the harness is a thin orchestrator.
- **`SessionReplayer`**: bundles produced are replayable / selfCheckable like any other.
- **`scenarioResultToBundle`**: orthogonal — scenarios test specific outcomes; synthetic playtests explore. A scenario can include checks; a synthetic playtest doesn't.
- **`runScenario`**: shares the "set up world, run, capture bundle" pattern but with a scripted run callback rather than policies. The two are intentionally separate — composing them (running a scenario *as* a policy) is possible but adds no value.
- **`SessionRecordingError` family**: same error types apply (poisoned world, sink failures, etc.).

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

Per spec §13.5 of the session-recording design (CI gate), every synthetic playtest in the engine's test corpus should pass `selfCheck` — same gate that scenario bundles use.

## 11. Performance

- **Per-tick cost.** Harness adds: one policy invocation per policy + one `submitWithResult` call per emitted command + the existing `step()` cost. Recorder per-tick cost is unchanged from a live recording (one `onDiff`, one `writeTick`, snapshot every N).
- **Memory.** `MemorySink` accumulates the entire bundle. For 10k-tick × 50-command runs, expected size is ~O(commands × payload-size + ticks × diff-size); use `FileSink` for large captures.
- **Parallelism.** Each `runSynthPlaytest` is self-contained (no shared state). Multiple invocations across processes scale linearly until disk I/O contends. Caller orchestrates.

## 12. Testing Strategy

Unit / integration tests target:

- **Built-in policies**:
    - `noopPolicy` returns `[]` always.
    - `randomPolicy` with seed produces deterministic catalog selections; respects `frequency` and `burst`.
    - `scriptedPolicy` emits the right entry at the right tick; ignores unmatched ticks.
- **Composition**: multiple policies' outputs concatenate in array order; `submissionSequence` respects this.
- **Stop conditions**:
    - `maxTicks` fires after exactly N steps.
    - `stopWhen` fires when predicate returns truthy.
    - `stopOnPoisoned` fires after a system throw.
- **Failure modes**:
    - Poisoned world at start propagates `RecorderClosedError`.
    - Policy throw → `stopReason: 'poisoned'`, bundle still returned.
    - Sink write failure → `ok: false`, `recorder.lastError` populated.
- **Determinism (the headline use case)**:
    - Two runs with identical config produce structurally-equal bundles (modulo sessionId / recordedAt).
    - `SessionReplayer.selfCheck()` returns `ok: true` on synthetic bundles.
- **Bundle metadata**:
    - `sourceKind: 'synthetic'`.
    - `sourceLabel` defaults to `'synthetic'`; override works.
    - `failedTicks` correctly populated when poisoning occurs mid-run.

Acceptance criterion: 100% of new code covered by tests; `npm test` exercises selfCheck on a representative synthetic bundle.

## 13. Documentation Surface

Per AGENTS.md "Always update if the change introduces or removes API surface":

- `docs/api-reference.md` — new sections for `Policy`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`. TOC updated.
- `docs/guides/synthetic-playtest.md` (new) — quickstart, policy authoring guide, determinism contract for policies, CI pattern.
- `docs/guides/session-recording.md` — extend with a brief section on synthetic-source bundles.
- `docs/guides/ai-integration.md` — note synthetic playtest as a Tier-1 piece of the AI-first feedback loop.
- `docs/architecture/ARCHITECTURE.md` — Component Map row.
- `docs/architecture/decisions.md` — ADR for the policy contract (deterministic; no runtime enforcement).
- `docs/architecture/drift-log.md` — entry for the subsystem.
- `docs/changelog.md` — version entries (see §14).
- `docs/devlog/summary.md` + `detailed/` — per-task entries.
- `README.md` — Feature Overview row + Public Surface bullet.
- `docs/README.md` — index entry.
- `docs/design/ai-first-dev-roadmap.md` — mark Spec 3 status: Drafted → Implemented.

## 14. Versioning

Per AGENTS.md per-commit `c`-bump policy. Current version: depends on followups merge state. If followups merge first, branch starts at v0.7.19; otherwise v0.7.16.

Plan structure (estimated 4 commits):

- T1 (1 c-bump): policy interface + 3 built-in policies + tests.
- T2 (1 c-bump): `runSynthPlaytest` harness + tests covering lifecycle, stop conditions, failure modes.
- T3 (1 c-bump): determinism integration tests (synthetic bundle round-trips through SessionReplayer.selfCheck).
- T4 (1 c-bump): doc surface (api-reference + guides + ARCHITECTURE + ADR + drift-log + roadmap status).

`SessionMetadata.sourceKind` widening from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'` is type-additive: existing producers and consumers continue to work; new producers can opt in. No `b`-bump.

## 15. Architectural Decisions

### ADR 1: Policy is a function, not a class hierarchy

**Decision:** `Policy<TEventMap, TCommandMap>` is a plain function type. Stateful policies use closures or class methods that satisfy the function type via `() => instance.decide.bind(instance)`. No abstract base class.

**Rationale:** Functions are simpler, type-friendly, and trivially composable. A class hierarchy would invite premature inheritance ("RandomPolicy extends BasePolicy") that doesn't earn its keep at this scope. The pattern matches existing engine conventions (`System`, `validator`, `handler` are all callable types).

### ADR 2: Policies receive read-only world; mutation is via returned commands

**Decision:** `PolicyContext.world` is the live `World` (TypeScript can't enforce read-only without a wrapper, which adds runtime overhead). The contract is: policies MUST NOT mutate. Violations are caught by `selfCheck` divergence on the resulting bundle.

**Rationale:** Forcing policies to go through `submit()` (rather than direct mutation) keeps their effects visible in the bundle's command stream — essential for replay. Wrapping the world in a runtime read-only proxy would catch violations earlier but add per-call overhead; deferred until concrete need.

### ADR 3: `SessionMetadata.sourceKind` extended, not replaced

**Decision:** Extend the union type from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Keep `'session'` and `'scenario'` semantics unchanged.

**Rationale:** Bundle consumers (replayer, future viewer, future corpus index) need to distinguish synthetic from organic recordings — different policies for retention, analysis, and triage. Adding a third variant is a pure widening; existing consumers either don't care or fall through with their default handling.

### ADR 4: Harness is synchronous and single-process

**Decision:** `runSynthPlaytest` is a synchronous function that runs to completion or returns early. No async / streaming / cross-process orchestration in v1.

**Rationale:** Synchronous matches the engine's existing tick model and the session-recording subsystem's sink contract. Async policies (LLM-driven) are deferred to Spec 9 (AI Playtester); cross-process orchestration is a CI-script concern, not an engine API.

## 16. Open Questions / Deferred

1. **Frequency vs interval semantics in randomPolicy.** Should `frequency` parameterize the modulo (every N ticks) or the rate (X commands per tick)? Going with modulo + `burst` for now; adjust if usability dictates.
2. **Multi-policy dispatch order.** Strict array order (chosen) vs round-robin vs phase-tagged (input/preUpdate/...). v1 ships strict array order; phase-tagged dispatch can come later if game projects need it.
3. **Bounded vs unbounded random catalogs.** The catalog is a fixed-length array; for huge catalogs (1000s of command types), random selection becomes expensive. Out of scope for v1.

## 17. Future Specs (this surface unlocks)

| Future Spec                          | What it adds                                                  |
| ------------------------------------ | ------------------------------------------------------------- |
| #8 Behavioral Metrics over Corpus    | Aggregates synthetic-playtest bundles; computes metrics       |
| #9 AI Playtester Agent               | LLM-driven Policy implementation                              |
| #7 Bundle Search / Corpus Index      | Indexes synthetic bundles for query                           |
| #5 Counterfactual Replay / Fork      | Synthetic playtest forked from a recorded bug                 |

## 18. Acceptance Criteria

- All new symbols (`Policy`, `PolicyContext`, `PolicyCommand`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`) exported from `src/index.ts` with full TypeScript types.
- `SessionMetadata.sourceKind` extended.
- Test coverage: ≥1 test per built-in policy + harness lifecycle + each stop reason + each failure mode + 1 determinism round-trip.
- All four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
- §13 doc updates land in the same merge.
- Multi-CLI design review and code review reach convergence.
- Branch is rebase-clean against `main` and ready for explicit user merge authorization.
