# AI Playtester Agent

Spec 9 (v0.8.9+) ships the engine-side substrate for LLM-driven (or any other async-decision) playtesters. It pairs with Spec 3's synchronous `runSynthPlaytest` rather than replacing it: when your decision layer needs `await` (LLM API calls, network, human-in-loop, batch fetch), use `runAgentPlaytest`. When it doesn't, use `runSynthPlaytest`.

LLM integration is intentionally out of scope. The engine ships the contract and the runner; consumers wire their own clients into the `AgentDriver` interface.

## Quickstart

```ts
import { runAgentPlaytest, type AgentDriver, World } from 'civ-engine';

const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
world.registerHandler('move', () => undefined);

const llmAgent: AgentDriver<MyEvents, MyCmds> = {
  async decide(ctx) {
    // Your LLM call — sync return is also OK.
    const response = await myLLM.complete({
      prompt: `World tick ${ctx.tick}. State: ${JSON.stringify(ctx.world.serialize())}. What command should the unit submit?`,
    });
    return [{ type: 'move', data: parseLLMResponse(response) }];
  },
  async report(bundle) {
    // Optional: post-run qualitative summary.
    return await myLLM.complete({
      prompt: `Summarize this playtest in 3 sentences. ${JSON.stringify(bundle.metadata)}`,
    });
  },
};

const result = await runAgentPlaytest({
  world,
  agent: llmAgent,
  maxTicks: 100,
  stopWhen: (ctx) => ctx.tickIndex >= 50, // optional early-stop
});

console.log(result.stopReason);          // 'maxTicks' | 'stopWhen' | 'poisoned' | 'agentError' | 'sinkError'
console.log(result.ticksRun);            // number of completed ticks
console.log(result.bundle);              // the recorded SessionBundle
console.log(result.report);              // whatever agent.report returned
```

## `bundleSummary` for LLM context

Feeding a raw bundle to an LLM is wasteful (large arrays, internal types). Use `bundleSummary` to extract a JSON-flat structured snapshot:

```ts
import { bundleSummary } from 'civ-engine';
const summary = bundleSummary(result.bundle);
// {
//   sessionId, recordedAt, engineVersion, nodeVersion,
//   sourceKind: 'synthetic', sourceLabel: 'agent',
//   startTick, endTick, durationTicks, incomplete,
//   totalCommands, acceptedCommands, acceptedCommandRate,
//   commandTypeCounts: { move: 50, attack: 12, ... },
//   totalEvents, eventTypeCounts,
//   markerCount, markersByKind,
//   failureCount, failedTicks,
// }
```

The summary is small enough to include in an LLM prompt verbatim. Combine with `runMetrics` from Spec 8 for cross-bundle aggregates.

## Stop reasons

| `stopReason` | Meaning |
|---|---|
| `'maxTicks'` | Loop ran `maxTicks` times without other termination. `ok: true`. |
| `'stopWhen'` | `config.stopWhen(ctx)` returned truthy. `ok: true`. |
| `'poisoned'` | A `world.step()` threw (system / handler / resource / diff failure). `ok: false`. |
| `'agentError'` | `agent.decide(ctx)` (or `stopWhen`) threw / rejected. `ok: false`. `result.agentError` carries `{ tick, error: { name, message, stack } }`. |
| `'sinkError'` | `recorder.lastError` became non-null mid-run (e.g., FileSink disk-full). `ok: false`. Stops loop early to avoid burning LLM budget on broken recording. |

Naming matches `runSynthPlaytest`'s taxonomy for symmetric exhaustive switches.

## Async vs sync drivers

`AgentDriver.decide` returns `Promise<readonly PolicyCommand[]> | readonly PolicyCommand[]`. The runner awaits the value, so:

- A sync agent (e.g., a deterministic policy in test) returns a plain array.
- An async agent (LLM / HTTP / file load) returns a promise.

Both compose with the same runner. There is no performance difference for sync agents; the await of a non-promise resolves immediately.

## `agent.report` semantics

Optional post-run hook. Receives the final `SessionBundle`. Return value is captured in `AgentPlaytestResult.report`. **If `report(bundle)` throws or rejects**, the exception is captured into `result.report = { error: { name, message, stack } }` rather than rejecting the outer promise. The bundle is already recorded and returned regardless; the consumer asked for it.

## `runSynthPlaytest` vs `runAgentPlaytest`

| | `runSynthPlaytest` (Spec 3) | `runAgentPlaytest` (Spec 9) |
|---|---|---|
| Decision boundary | `Policy` function (sync) | `AgentDriver.decide` (sync or async) |
| Return type | `SynthPlaytestResult` (sync) | `Promise<AgentPlaytestResult>` |
| Multi-policy support | Yes (array of policies) | No (single agent in v1) |
| Sub-RNG (`PolicyContext.random`) | Yes (deterministic) | No — agent owns its randomness |
| Post-run report | No | Yes (`agent.report` optional) |
| `sourceKind` | `'synthetic'` | `'synthetic'` |

Use `runSynthPlaytest` when the agent is a pure function. Use `runAgentPlaytest` when it isn't (LLM, network, human input).

## Determinism

`runAgentPlaytest` records via `SessionRecorder`, so all submitted commands enter the bundle's command stream. The bundle's **deterministic content** (commands, executions, events, snapshots, diffs) is reproducible across runs if and only if the agent's `decide` is reproducible (same prompt / same model / same temperature / same seed for sampling). Per-tick `metrics.durationMs` fields are timing observability and naturally vary between runs — they are not part of the deterministic recording surface. The engine guarantees nothing about LLM determinism — that's the agent's responsibility.

For replay, use `SessionReplayer.fromBundle(bundle, { worldFactory })` — it consumes the bundle's recorded commands and reproduces the world state at any tick deterministically, regardless of whether the agent is rerun.

For deterministic test scenarios, prefer `runSynthPlaytest` with `scriptedPolicy` (Spec 3).
