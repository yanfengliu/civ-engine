# Visual Playtest Harness

`civ-engine` v1.3.0 adds a reusable, zero-runtime-dependency harness contract for browser-game LLM playtests. It is for the loop where an agent sees what a player would see, chooses player-surface actions, records findings, and repeats.

The engine owns the stable vocabulary: observations, controls, hidden-state channels, actions, decisions, findings, traces, prompt redaction, and session-marker conversion. Game repos own the adapters: browser automation, screenshots, DOM queries, canvas hit testing, model/provider clients, cost tracking, and game-specific hidden-state serialization.

## Quick Start

```ts
import {
  runVisualPlaytestLoop,
  visualPlaytestFindingToMarker,
  type VisualPlaytestAgent,
  type VisualPlaytestHost,
} from 'civ-engine';

const host: VisualPlaytestHost = {
  async observe({ step }) {
    return {
      tick: game.tick,
      screenshot: {
        path: `artifacts/playtest/step-${step}.png`,
        mime: 'image/png',
        width: 1280,
        height: 720,
      },
      visibleText: await readVisibleTextFromPage(),
      controls: await readAvailableControlsFromPage(),
      state: [
        {
          label: 'path queues',
          audience: 'reviewer',
          summary: `${blockedPathCount()} blocked path requests`,
          value: dumpPathQueueDebugState(),
        },
      ],
    };
  },
  async performAction(action) {
    return await performBrowserAction(action);
  },
  async annotate(finding) {
    recorder.addMarker(visualPlaytestFindingToMarker(finding));
  },
};

const agent: VisualPlaytestAgent = {
  async decide(input) {
    const prompt = buildGamePrompt(input);
    return await callYourModel(prompt);
  },
};

const result = await runVisualPlaytestLoop({
  host,
  agent,
  maxSteps: 25,
  promptMode: 'playerBlind',
});
```

`runVisualPlaytestLoop` does not know about Playwright, DOM, canvas, or LLM SDKs. The loop calls `host.observe`, passes the observation to `agent.decide`, performs one or more returned actions through `host.performAction`, records a trace, and stops on max steps, explicit stop, no actions, action failure, host error, or agent error — plus the opt-in budget/abort stops described under Runner Hardening below.

## Observation Shape

`VisualPlaytestObservation` has four main channels plus a typed tick anchor:

- `tick` (v1.5.0): the simulation tick the observation was captured at. Stamp it atomically with the screenshot so findings and replay inspection can tie "what the player saw" to the deterministic sim state; the prompt helpers surface it and trace clones preserve it.
- `screenshot`: a path or data URL plus mime and dimensions. Safe traces strip `dataUrl` by default.
- `visibleText`: text the player could read.
- `controls`: buttons, map cells, hotkeys, or other player actions the adapter can safely perform.
- `state`: optional hidden/debug state channels with an explicit audience.

Hidden state is first-class but never implicit. Use `VisualPlaytestStateChannel.audience` to state who may see each channel:

| Audience | Meaning |
|---|---|
| `agent` | May be included in oracle-assisted prompts. Use for deliberate debug hints such as selected entity internals or summarized path status. (The simulation tick has its own typed `observation.tick` field since v1.5.0 and needs no channel.) |
| `reviewer` | Kept for trace/report review, not shown to the acting agent by `buildVisualPlaytestPrompt`. |
| `traceOnly` | Stored for deterministic postmortems, not shown to agent or reviewer prompts by default. |

Use `sensitive: true` for raw seeds, internal IDs, full hidden maps, or large debug dumps. Use `redaction: 'value'` to keep the channel label/summary but omit the value, `redaction: 'channel'` to omit the whole channel from safe traces/prompts, and `redaction: 'none'` only when the value is safe to carry even if the channel is marked sensitive. `redactVisualPlaytestObservation()` removes screenshot data URLs and applies those state-channel rules by default while preserving labels and summaries when a value is withheld.

## Prompt Modes

`buildVisualPlaytestPrompt({ observation, mode })` supports two modes:

- `playerBlind`: includes screenshot metadata, visible text, and controls. Hidden state is omitted.
- `oracleAssisted`: includes only state channels marked `audience: 'agent'`. Reviewer and trace-only channels remain hidden.

The recommended workflow is to run both when useful: player-blind for experience regressions and oracle-assisted for debugging why a visible problem happened.

## Multimodal Prompt Parts (v1.5.0)

`buildVisualPlaytestPrompt` returns a plain string and renders the screenshot as a text descriptor — an agent built on it alone sends no pixels to the model. When the agent should actually see the game, use `buildVisualPlaytestPromptParts({ observation, mode })`: it returns `VisualPlaytestPromptPart[]` where the screenshot is a single `{ type: 'image', source }` part (carrying `path`, `dataUrl`, `mime`, and dimensions) and the text parts carry the same sections as the string prompt. The game's provider adapter maps parts to its SDK's content blocks (e.g. an Anthropic image block from `source.dataUrl`). The engine still owns no provider SDK — the parts are plain data.

## Runner Hardening (v1.5.0)

`runVisualPlaytestLoop` accepts hardening options. The budgets/abort/failure-policy knobs are opt-in (with no wall-clock budget the loop never reads the clock); the hidden-state wall is ON by default since 2.0.0:

- `budget.maxWallClockMs` bounds elapsed wall-clock; the loop stops with `stopReason: 'budgetExceeded'` (`ok: true`) once elapsed time strictly exceeds the cap. `budget.maxActionsPerStep` executes only the first N proposed actions per decision — the full proposed list stays visible on the trace entry's `decision`, and a `stop` action in the truncated tail is still honored after the executed prefix completes cleanly. `now` overrides the clock source for tests.
- `signal` (an `AbortSignal`) stops the loop with `stopReason: 'aborted'` (`ok: false`, `AbortError`-shaped `error`); abort wins when a budget breach coincides. Budget and abort checks run at step boundaries, after `observe`, after each decision, and before each action — they cannot interrupt an in-flight `observe`/`decide`/`annotate`/`performAction`, so pass the same signal into your provider/browser calls for hard cancellation. An abort observed right after `decide` skips `host.annotate` (the host may already be tearing down) while that decision's findings still land on the result.
- `agentObservation: 'redacted'` enforces the hidden-state wall at the agent boundary: `decide()` receives `observationForAgent(observation, promptMode)` — screenshot (including `dataUrl`), visible text, controls, and `tick` preserved; state channels dropped entirely under `playerBlind` and audience-filtered with redaction levels applied under `oracleAssisted`. The `trace` handed to the agent passes through the same filter (including nested action-result observations), so reviewer/traceOnly channels never reach the agent from prior steps either — even under `traceObservation: 'full'`, which continues to control only the returned `result.trace`. Note `observation.metadata` is host-owned and not audience-filtered: keep oracle state out of it in player-blind experiments. Since 2.0.0 `'redacted'` is the default — the agent sees the game like a player unless the caller explicitly passes `agentObservation: 'raw'`, which reduces the wall to being only as strong as the agent's use of the prompt helper.
- `onActionFailure: 'continue'` turns a failed action into evidence instead of a run abort: the failure lands on the trace (thrown actions become a synthetic `{ ok: false, action, error }`), the next `observe` receives it via `previousActionResult`, the rest of that step's actions are skipped, and the loop continues. `budget.maxActionFailures` caps total failures (thrown and `ok: false` alike) before the loop ends with `stopReason: 'actionFailed'`; setting it without `onActionFailure: 'continue'` is rejected, since it would be silently dead under the default abort policy. LLM agents emit occasionally-invalid actions; this is how "repeated invalid actions" becomes a measurable signal rather than a dead run.
- Cost/token metering stays in the game's provider adapter; the engine budget covers wall-clock and action counts only. Invalid values for the validated options (`budget.*`, `agentObservation`, `onActionFailure`) throw `EngineRangeError` code `visual_playtest_config_invalid`.

## Findings And Markers

Agents report issues as `VisualPlaytestFinding` objects with `severity`, `category`, `observed`, optional `expected`, optional `suggestion`, and optional evidence such as `step`, `tick`, `screenshotPath`, or `stateLabels`.

Use `visualPlaytestFindingToMarker(finding)` to record findings in a `SessionRecorder` bundle as normal annotation markers:

```ts
const marker = visualPlaytestFindingToMarker({
  title: 'Worker path is blocked',
  severity: 'high',
  category: 'rules',
  observed: 'The worker accepted the move action but stayed still.',
  expected: 'The worker should move or reject the action with visible feedback.',
  evidence: { step: 4, tick: world.tick, screenshotPath: 'artifacts/step-4.png' },
  refs: { tickRange: { from: world.tick, to: world.tick } },
});

recorder.addMarker(marker);
```

Use `visualPlaytestFindingsFromMarkers(bundle.markers)` when a report or viewer wants to recover the structured finding objects from recorded markers.

For findings that are part of the recursive improvement loop, prefer `ImprovementFinding` plus `improvementFindingToMarker(finding)`. That helper records the same visual marker payload under `data.visualPlaytest` and also embeds the durable loop payload under `data.improvementLoop`:

```ts
import { improvementFindingToMarker, type ImprovementFinding } from 'civ-engine';

const finding: ImprovementFinding = {
  schemaVersion: 1,
  id: 'aoe2-command-card-1',
  title: 'ux-gap - command-card',
  severity: 'medium',
  category: 'usability',
  observed: 'No visible command advances past Feudal.',
  expected: 'The Town Center exposes a Castle Age research command.',
  evidence: [{ kind: 'tick', tick: world.tick, screenshotPath: 'artifacts/step-4.png' }],
  verificationStatus: 'unverified',
  nextAction: 'proposalOnly',
};

recorder.addMarker(improvementFindingToMarker(finding));
```

Use `improvementFindingsFromMarkers(bundle.markers)` when a loop ledger or report wants only the shared improvement findings. Keep `visualPlaytestFindingsFromMarkers` for older visual-only reports and for findings that do not need loop verification status or next-action metadata. To lift a raw visual finding into the durable contract, use `visualPlaytestFindingToImprovementFinding(visual, { id, ... })` (v1.6.0) — it defaults to `unverified`/`proposalOnly`, maps the visual evidence onto plural refs, and stamps the minimal schema version. Since 2.0.0 bare `assertImprovementFinding` enforces this by default: `verified` — and, since 2.4.0, the terminal `fixed`/`regressed` claims — requires an addressed replayable evidence ref (a tick, a `markerId`, or a `bundleId`/`sessionId`) plus a `verificationMethod` everywhere — construction, recording, and validation alike. Pass `{ requireVerificationEvidence: false }` only when reading historical payloads recorded before the strict default.

## Reuse Pattern For Game Repos

Each game repo should keep its local harness adapter and replace only the duplicated contract glue:

- `farm`: keep the existing screenshot, visible text, and environment command provider. Map its actions into `VisualPlaytestAction` and expose any replay/debug state as `reviewer` or `traceOnly` channels.
- `townscaper` / Harborform: keep the browser loop and command provider. Its generic loop maps directly to `VisualPlaytestHost` / `VisualPlaytestAgent`; move only shared action, finding, prompt, and trace concepts to the engine surface.
- `city`: keep engine-backed `__harness.player`, `snapshotAtTick`, `selfCheck`, and city-specific debug payloads. Attach those debug payloads as hidden state channels instead of inventing a parallel trace shape.
- `aoe`: keep canonical game commands, cost traces, provider wiring, and scenario-specific state summaries. Use this harness for rendered UI/player-surface playtests and bridge findings into the existing marker/replay workflow.

The engine should not grow Playwright helpers or provider clients unless multiple repos prove the adapter layer itself has become identical. Today the reusable layer is the contract, runner, redaction, prompt helper, trace, and marker bridge.
