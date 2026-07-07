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
          label: 'simulation tick',
          audience: 'agent',
          summary: `tick=${game.tick}`,
          value: { tick: game.tick },
        },
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

`runVisualPlaytestLoop` does not know about Playwright, DOM, canvas, or LLM SDKs. The loop calls `host.observe`, passes the observation to `agent.decide`, performs one or more returned actions through `host.performAction`, records a trace, and stops on max steps, explicit stop, no actions, action failure, host error, or agent error.

## Observation Shape

`VisualPlaytestObservation` has four main channels:

- `screenshot`: a path or data URL plus mime and dimensions. Safe traces strip `dataUrl` by default.
- `visibleText`: text the player could read.
- `controls`: buttons, map cells, hotkeys, or other player actions the adapter can safely perform.
- `state`: optional hidden/debug state channels with an explicit audience.

Hidden state is first-class but never implicit. Use `VisualPlaytestStateChannel.audience` to state who may see each channel:

| Audience | Meaning |
|---|---|
| `agent` | May be included in oracle-assisted prompts. Use for deliberate debug hints such as selected entity internals, public simulation tick, or summarized path status. |
| `reviewer` | Kept for trace/report review, not shown to the acting agent by `buildVisualPlaytestPrompt`. |
| `traceOnly` | Stored for deterministic postmortems, not shown to agent or reviewer prompts by default. |

Use `sensitive: true` for raw seeds, internal IDs, full hidden maps, or large debug dumps. Use `redaction: 'value'` to keep the channel label/summary but omit the value, `redaction: 'channel'` to omit the whole channel from safe traces/prompts, and `redaction: 'none'` only when the value is safe to carry even if the channel is marked sensitive. `redactVisualPlaytestObservation()` removes screenshot data URLs and applies those state-channel rules by default while preserving labels and summaries when a value is withheld.

## Prompt Modes

`buildVisualPlaytestPrompt({ observation, mode })` supports two modes:

- `playerBlind`: includes screenshot metadata, visible text, and controls. Hidden state is omitted.
- `oracleAssisted`: includes only state channels marked `audience: 'agent'`. Reviewer and trace-only channels remain hidden.

The recommended workflow is to run both when useful: player-blind for experience regressions and oracle-assisted for debugging why a visible problem happened.

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

## Reuse Pattern For Game Repos

Each game repo should keep its local harness adapter and replace only the duplicated contract glue:

- `farm`: keep the existing screenshot, visible text, and environment command provider. Map its actions into `VisualPlaytestAction` and expose any replay/debug state as `reviewer` or `traceOnly` channels.
- `townscaper` / Harborform: keep the browser loop and command provider. Its generic loop maps directly to `VisualPlaytestHost` / `VisualPlaytestAgent`; move only shared action, finding, prompt, and trace concepts to the engine surface.
- `city`: keep engine-backed `__harness.player`, `snapshotAtTick`, `selfCheck`, and city-specific debug payloads. Attach those debug payloads as hidden state channels instead of inventing a parallel trace shape.
- `aoe`: keep canonical game commands, cost traces, provider wiring, and scenario-specific state summaries. Use this harness for rendered UI/player-surface playtests and bridge findings into the existing marker/replay workflow.

The engine should not grow Playwright helpers or provider clients unless multiple repos prove the adapter layer itself has become identical. Today the reusable layer is the contract, runner, redaction, prompt helper, trace, and marker bridge.
