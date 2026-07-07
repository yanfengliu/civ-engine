# Visual Playtest Harness Design

## Decision

`civ-engine` owns a zero-runtime-dependency visual playtest contract and generic loop runner. Game repos own browser automation, screenshots, DOM/canvas control extraction, model/provider clients, cost tracking, and game-specific state serialization.

## Public Surface

The public surface centers on `runVisualPlaytestLoop`, `VisualPlaytestHost`, `VisualPlaytestAgent`, `VisualPlaytestObservation`, `VisualPlaytestStateChannel`, `VisualPlaytestAction`, `VisualPlaytestDecision`, `VisualPlaytestFinding`, `VisualPlaytestTraceEntry`, `buildVisualPlaytestPrompt`, `redactVisualPlaytestObservation`, `visualPlaytestFindingToMarker`, and `visualPlaytestFindingsFromMarkers`.

## Hidden State

Hidden/debug state is first-class but always explicit. `VisualPlaytestStateChannel.audience` controls use:

- `agent`: may enter oracle-assisted prompts.
- `reviewer`: retained for review/report context, not acting-agent prompts.
- `traceOnly`: retained for deterministic postmortems, omitted from prompts.

`playerBlind` prompt mode omits hidden state. `oracleAssisted` includes only `agent` channels. Safe traces redact screenshot data URLs and sensitive state values by default.

## Boundaries

The engine must not import Playwright, browser APIs, DOM libraries, canvas libraries, or LLM SDKs for this surface. Those choices vary across `aoe`, `farm`, `townscaper`, and `city`, while the observation/action/finding/trace vocabulary is shared.

Findings bridge into existing session recording through normal annotation markers, so downstream bundles, viewers, and reports can reuse the existing marker pipeline.
