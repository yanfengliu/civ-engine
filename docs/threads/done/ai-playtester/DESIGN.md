# AI Playtester Agent — Design Spec

**Status:** Accepted v2 (2026-04-29). Addresses Claude design-1 review (3 majors + 4 lows + 6 nits) inline in implementation: stopReason adopts camelCase to match Spec 3 (`'maxTicks' | 'stopWhen' | 'poisoned' | 'agentError' | 'sinkError'`), `agentError` field added to `AgentPlaytestResult` with `{ tick, error: { name, message, stack } }` shape (M2/M3), per-tick `recorder.lastError` check for sink failure (M1), upfront poisoned-world rejection. Codex review timed out (sandbox-blocked PowerShell call); proceeding with Claude as the substantive reviewer per AGENTS.md fallback rule. Six minor nits accepted as known items.

**Scope:** Tier-2 Spec 9 from `docs/design/ai-first-dev-roadmap.md`. Adds the engine-side substrate for LLM-driven (or any other async-decision) playtesters. The core challenge is the impedance mismatch between async LLM calls and `runSynthPlaytest`'s synchronous tick contract (Spec 3 ADR 21). v1 ships a thin async wrapper `runAgentPlaytest` that loops one tick at a time around a user-provided `AgentDriver` callback, plus a `bundleSummary(bundle)` helper that turns a recorded bundle into structured input an LLM can analyze.

LLM integration itself is intentionally out of scope: this engine spec defines the **contract** and a **runner**. Game projects (or downstream tooling) plug their own LLM calls into the `AgentDriver` interface.

**Author:** civ-engine team.

**Related primitives:** `runSynthPlaytest`, `Policy`, `PolicyContext`, `SessionRecorder`, `SessionBundle`, `BundleViewer`, `runMetrics`.

## 1. Goals

- `AgentDriver<TEventMap, TCommandMap>` interface: a small async-friendly contract with a single `decide(ctx) => Promise<PolicyCommand[]> | PolicyCommand[]` method (and an optional `report(bundle) => Promise<unknown> | unknown` method for post-run qualitative reports).
- `runAgentPlaytest(config)`: async function that drives a `World` through N ticks, invoking `agent.decide(ctx)` once per tick and submitting the returned commands. Internally records via `SessionRecorder` and returns a `Promise<SessionBundle>`.
- `bundleSummary(bundle)`: pure function that turns a `SessionBundle` into a JSON-serializable summary object (command counts, event counts, markers, failures, durationTicks, key metadata). Designed to be small enough to feed an LLM as context.
- Composes with existing primitives (`SessionRecorder`, `runMetrics`, `BundleViewer`) without duplicating them.

The deliverable is an additive surface. Existing `runSynthPlaytest`, `Policy`, and recording primitives are unchanged.

## 2. Non-Goals

- **No LLM integration.** The engine ships the runner and contract; consumers wire their own Anthropic / OpenAI / local-LLM clients via `AgentDriver.decide`.
- **No prompt templates / few-shot examples.** Game-specific.
- **No async `Policy` type.** `Policy` stays synchronous (Spec 3 ADR 21). `runAgentPlaytest` adapts an async driver into a per-tick scriptedPolicy invocation; it does not extend the `Policy` type.
- **No qualitative-feedback evaluation.** `bundleSummary` produces structured data; the agent (LLM) decides what to say about it.
- **No multi-agent / adversarial.** v1 is single-agent.
- **No streaming / live-loop integration.** Same boundary as Spec 3 — `runAgentPlaytest` is a one-shot batch run.

## 3. Architecture Overview

New module: `src/ai-playtester.ts` (~150 LOC).

| Component | Responsibility |
| --- | --- |
| `AgentDriver<TEventMap, TCommandMap>` | User-implemented interface. Engine calls `decide(ctx)` once per tick, optionally `report(bundle)` once post-run. |
| `AgentPlaytestConfig<...>` | Config type — world, agent, maxTicks, optional `stopWhen` predicate, optional `sink`, `sourceLabel`, `snapshotInterval` passthroughs. |
| `AgentPlaytestResult<...>` | Wraps `SessionBundle` plus `report` (whatever the agent returned from its post-run callback) and `stopReason`. |
| `runAgentPlaytest(config)` | Async runner. Loops up to `maxTicks`, calls `agent.decide(ctx)` per tick (await-able), submits commands via `world.submit()`, calls `world.step()`. Records through `SessionRecorder` (set `sourceKind: 'synthetic'`). On stop, calls `agent.report(bundle)` if defined and includes the result. |
| `bundleSummary(bundle)` | Pure helper. Returns `BundleSummary` — structured data designed to fit a small LLM context window. |
| `BundleSummary` | JSON-serializable: `{ sessionId, durationTicks, startTick, endTick, totalCommands, commandTypeCounts, totalEvents, eventTypeCounts, markerCount, markersByKind, failureCount, failedTicks, incomplete, sourceKind, recordedAt, engineVersion, nodeVersion }`. |

Internally, `runAgentPlaytest` does NOT extend `Policy`. It bypasses `runSynthPlaytest` because that wrapper enforces synchronous execution. Instead it owns the tick loop directly, integrating with `SessionRecorder` the same way `runSynthPlaytest` does.

## 4. API + Types

### 4.1 `AgentDriver`

```ts
export interface AgentDriverContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  /** Read-only world reference (callers MUST NOT mutate; see Spec 3 ADR 2). */
  readonly world: World<TEventMap, TCommandMap>;
  /** Current tick about to be executed. */
  readonly tick: number;
  /** Tick number when the playtest started. */
  readonly startTick: number;
  /** Number of ticks elapsed since startTick. */
  readonly tickIndex: number;
}

export interface AgentDriver<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
> {
  /**
   * Called once per tick. Return zero or more commands to submit. May be
   * synchronous or async; the runner awaits the return value.
   */
  decide(ctx: AgentDriverContext<TEventMap, TCommandMap>): Promise<readonly PolicyCommand<TCommandMap>[]> | readonly PolicyCommand<TCommandMap>[];

  /**
   * Optional. Called once after the playtest completes (any stopReason).
   * Receives the final bundle. The return value is included in
   * `AgentPlaytestResult.report` (typed as the agent's return shape).
   */
  report?(bundle: SessionBundle<TEventMap, TCommandMap>): Promise<unknown> | unknown;
}
```

### 4.2 `runAgentPlaytest`

```ts
export interface AgentPlaytestConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  world: World<TEventMap, TCommandMap>;
  agent: AgentDriver<TEventMap, TCommandMap>;
  maxTicks: number;
  /**
   * Optional early-stop predicate. Called after each tick. If returns truthy,
   * playtest stops with `stopReason: 'stopWhen'`.
   */
  stopWhen?(ctx: AgentDriverContext<TEventMap, TCommandMap>): boolean | Promise<boolean>;
  sink?: SessionSink & SessionSource;
  sourceLabel?: string;
  snapshotInterval?: number | null;
}

export interface AgentPlaytestResult<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  bundle: SessionBundle<TEventMap, TCommandMap>;
  ticksRun: number;
  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'agentError' | 'sinkError';
  report?: unknown;
}

export function runAgentPlaytest<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
>(
  config: AgentPlaytestConfig<TEventMap, TCommandMap>,
): Promise<AgentPlaytestResult<TEventMap, TCommandMap>>;
```

### 4.3 `bundleSummary`

```ts
export interface BundleSummary {
  sessionId: string;
  recordedAt: string;
  engineVersion: string;
  nodeVersion: string;
  sourceKind: 'session' | 'scenario' | 'synthetic';
  startTick: number;
  endTick: number;
  durationTicks: number;
  incomplete: boolean;
  totalCommands: number;
  commandTypeCounts: Record<string, number>;
  acceptedCommandRate: number;
  totalEvents: number;
  eventTypeCounts: Record<string, number>;
  markerCount: number;
  markersByKind: Record<string, number>;
  failureCount: number;
  failedTicks: number[];
}

export function bundleSummary(bundle: SessionBundle): BundleSummary;
```

## 5. Lifecycle / Contracts

`runAgentPlaytest`:

1. Validate `maxTicks > 0` (synchronous; throws `Error` on bad config).
2. Construct `SessionRecorder({ world, sourceKind: 'synthetic', sourceLabel: 'agent', ... })`. Connect.
3. Loop `for tickIndex = 0; tickIndex < maxTicks`:
   a. Build `AgentDriverContext { world, tick: world.tick + 1, startTick, tickIndex }`.
   b. `await agent.decide(ctx)` → array of commands.
   c. For each command, `world.submit(cmd.type, cmd.data)`.
   d. `world.step()`. Catch `WorldTickFailureError` → set `stopReason: 'poisoned'`, break.
   e. If `config.stopWhen` provided and `await config.stopWhen(ctx)` returns truthy → `stopReason: 'stopWhen'`, break.
   f. If `agent.decide` throws → set `stopReason: 'agentError'`, break (recorder still finalizes).
4. `recorder.disconnect()`.
5. `bundle = recorder.toBundle()`.
6. If `agent.report` defined, `report = await agent.report(bundle)`. If it throws, captured as `report = { error: <message> }` (don't re-throw — the bundle is already valid).
7. Return `{ bundle, ticksRun, stopReason, report }`.

If natural termination at `maxTicks`, `stopReason: 'maxTicks'`.

`bundleSummary` is a pure function with no I/O. Can be called on any complete or incomplete bundle.

## 6. Testing Strategy

- **Construction:** `runAgentPlaytest` validates `maxTicks > 0`.
- **Sync agent:** an `AgentDriver.decide` returning a plain array works; bundle records the commands.
- **Async agent:** an `AgentDriver.decide` returning a Promise works; runner awaits each tick.
- **maxTicks termination:** returns `stopReason: 'maxTicks'` with `ticksRun === maxTicks`.
- **Stop predicate:** truthy `stop()` halts early with `stopReason: 'stopWhen'`.
- **World poisoned:** a system that throws causes `stopReason: 'poisoned'`; bundle is incomplete.
- **Agent throws:** `decide` rejecting / throwing surfaces as `stopReason: 'agentError'`; bundle still valid.
- **`report()` callback:** result included in `AgentPlaytestResult.report`.
- **`report()` throws:** captured in `report = { error: '...' }` rather than rejecting the outer promise.
- **`bundleSummary`:** counts match underlying bundle arrays; typed eventCounts/commandCounts.

## 7. Doc Surface

- `docs/api-reference.md`: new `## AI Playtester Agent (v0.8.9)` section.
- `docs/guides/ai-playtester.md` (new file): pattern for LLM-driven playtests, sync vs async drivers, bundle summary -> LLM prompt example.
- `docs/guides/ai-integration.md`: cross-reference Spec 9.
- `docs/guides/concepts.md`: brief mention.
- `docs/architecture/ARCHITECTURE.md`: Component Map row.
- `docs/architecture/drift-log.md`: row.
- `docs/architecture/decisions.md`: ADR 41 (async runner is a sibling to `runSynthPlaytest`, not a subclass).
- `docs/design/ai-first-dev-roadmap.md`: Spec 9 status to Implemented.
- `docs/changelog.md`, `docs/devlog/summary.md`, latest detailed devlog: v0.8.9 entry.
- `package.json`, `src/version.ts`, README badge: v0.8.9.

## 8. Versioning

Current base v0.8.8 (post Spec 6 commit). Spec 9 is additive and non-breaking. Ship as v0.8.9.

## 9. ADRs

### ADR 41: Async runner is a sibling to `runSynthPlaytest`, not an extension of `Policy`

**Decision:** `runAgentPlaytest` is an entirely separate top-level function with its own async loop. It does NOT extend `Policy` (which stays synchronous per Spec 3 ADR 21) and does NOT call `runSynthPlaytest` internally.

**Rationale:** Adding async to `Policy` or `runSynthPlaytest` would force every existing caller to await synchronous primitives, defeating the simplicity of the synchronous harness. A sibling async runner keeps both surfaces clean: `runSynthPlaytest` for synchronous policies (random / scripted / future deterministic AI), `runAgentPlaytest` for async drivers (LLM / network / human-in-loop). Both produce identical `SessionBundle`s.

## 10. Acceptance Criteria

- `AgentDriver`, `AgentDriverContext`, `AgentPlaytestConfig`, `AgentPlaytestResult`, `runAgentPlaytest`, `BundleSummary`, `bundleSummary` are exported from `src/index.ts`.
- `runAgentPlaytest` returns a `SessionBundle` with `sourceKind: 'synthetic'`.
- Sync and async agent drivers both work.
- All five `stopReason` values are reachable.
- `bundleSummary` is pure and JSON-serializable.
- All four engine gates pass.
- Multi-CLI review converges.
- Docs land in the same commit as code.
