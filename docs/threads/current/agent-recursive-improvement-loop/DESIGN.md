# Agent Recursive Improvement Loop Design

## Decision

`civ-engine` should define the shared recursive-improvement loop for games built on top of it, while each game repo owns its local adapter, scenarios, browser automation, model/provider calls, and game-specific judgement rules.

The goal is not "an LLM playtester." The goal is a closed evidence-to-improvement machine:

```text
run -> record -> find -> verify -> classify -> regress -> fix/propose -> review -> rerun -> compare -> learn
```

Every participating game should be able to wake an agent, run a bounded improvement pass, produce durable evidence, verify claims against replay or state, promote confirmed failures into tests or fixtures, apply or propose a small fix, rerun gates, and leave a machine-readable ledger of what improved.

## Context

The engine already owns most of the substrate:

- `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `MemorySink`, and `FileSink` capture and replay evidence.
- `runSynthPlaytest` and `runAgentPlaytest` run command-level autonomous playtests.
- `runVisualPlaytestLoop` standardizes screenshot, visible-text, control, action, finding, hidden-state, trace, and marker vocabulary for browser-game playtests.
- `ImprovementFinding` and its marker helpers now standardize the first shared loop payload: durable findings with evidence refs, verification status, next action, and compatibility with visual-playtest markers.
- `BundleCorpus`, `BundleViewer`, `bundleHotspots`, `runMetrics`, `compareMetricsResults`, `snapshotAtTick`, `diffBundles`, and `SessionReplayer.forkAt` let agents inspect and compare recorded runs.
- `PlayerObserver` and `VisualPlaytestStateChannel.audience` give the system a way to keep player-visible evidence separate from oracle/debug evidence.

The local game repos are uneven:

- `aoe2` is the richest consumer. It already has LLM playtest scripts, corpus runners, findings, replay inspection, markers, and auto-fix/propose-fix surfaces.
- `farm` has LLM playtest, visual-loop, and replay scripts, and already checks that the visual loop uses `civ-engine` visual playtest contracts.
- `city` has a replay/self-check gate over engine bundles but not a full playtest-to-fix loop.
- `civ-sim-web` and `idle-life` use the engine but do not yet expose a mature recursive improvement harness.

The gap is therefore not basic capability. The gap is uniformity, closure, and promotion: the loop is not yet a standard contract that every game can implement and every agent can drive.

## Goals

1. Make playtest evidence durable. A run must leave behind replayable artifacts, trace, screenshots, observations, hidden-state channels, costs, seeds, model/provider info, gates, and summary metrics.
2. Make findings checkable. A finding must identify observed behavior, expected behavior, evidence anchors, severity, category, suspected subsystem, verification status, and a next action.
3. Separate player experience from oracle diagnosis. The acting agent sees player-surface evidence by default. Reviewer/debug passes may consume labeled hidden state, but hidden state must never be implicit.
4. Verify before fixing. A playtest finding is a claim until replay, state inspection, deterministic metrics, or spec comparison confirms it.
5. Promote confirmed failures. Every confirmed bug or missing affordance must become a regression test, deterministic scenario, replay fixture, visual assertion, engine-feedback item, or tracked design question.
6. Improve the harness itself. If agents repeatedly fail because they cannot observe valid actions, the fix may be better visible text, richer controls, clearer hidden-state channels, better replay inspection, or a shared engine helper.
7. Compare over time. The loop must know whether the game is actually improving across runs and commits.
8. Route shared lessons upstream. Repeated cross-game gaps should become `civ-engine` contracts or tools; game-specific findings stay in game repos.
9. Bound autonomy. Automatic code changes are allowed only when evidence, reproduction, tests, review, and gates make the patch safe. Otherwise the loop produces ranked proposals.

## Non-Goals

- `civ-engine` will not own Playwright, DOM, canvas, Phaser, Three.js, or provider SDK adapters.
- `civ-engine` will not decide what is fun. It can expose player-visible evidence, progression metrics, stalled-state detection, and repeated-friction signals; the game design remains the authority.
- The first version will not require every game to support auto-fix. Proposal-only is a valid maturity level.
- The shared contract will not assume one model provider.
- The shared contract will not require all games to use browser rendering. Headless, visual, replay-only, and mixed harnesses should all fit.

## Shared Loop Model

The shared loop has ten stages. A game may start with a subset, but the target is the full chain.

### 1. Select Objective

The controller chooses a bounded objective:

- smoke a fresh build,
- explore a scenario,
- reproduce a known finding,
- compare a baseline corpus against current,
- verify a proposed fix,
- or search for regressions in a feature area.

The objective records scope, allowed autonomy, budgets, scenario seeds, model/provider settings, and gate expectations.

### 2. Run Game

The game adapter boots a deterministic scenario. It exposes one or more of:

- command-level play through `runSynthPlaytest` or `runAgentPlaytest`,
- browser/player-surface play through `runVisualPlaytestLoop`,
- replay/corpus inspection through `SessionReplayer`, `BundleViewer`, or MCP,
- or a game-specific loop mapped into the shared run manifest.

### 3. Record Evidence

Every run writes a run manifest. The manifest points to artifacts instead of embedding large blobs:

- session bundle or replay artifact,
- visual trace,
- screenshots,
- action log,
- visible text/control observations,
- hidden-state channel summaries,
- model/provider metadata,
- costs and duration,
- seeds,
- build commit,
- and gate output summaries.

### 4. Extract Findings

The extractor emits structured findings, not prose-only notes. Findings can come from:

- deterministic metrics,
- bundle hotspots,
- command rejection patterns,
- playtest agent observations,
- visual/a11y/regression checks,
- spec conformance passes,
- or corpus comparison.

The extractor may use LLM review, but deterministic signals should be recorded separately from advisory model judgement.

### 5. Verify Claims

Before any fix, the verifier tries to refute each finding against live evidence:

- open the exact bundle at the referenced tick,
- inspect state through `SessionReplayer`, `BundleViewer`, `snapshotAtTick`, or game helpers,
- compare against the design/spec,
- inspect the screenshot/control trace,
- or rerun a deterministic scenario.

Each finding receives a verification status:

- `unverified`,
- `replayConfirmed`,
- `stateConfirmed`,
- `specConfirmed`,
- `metricConfirmed`,
- `rejected`,
- or `needsHumanJudgement`.

Only confirmed findings can drive automatic code changes.

### 6. Classify And Prioritize

The classifier assigns a next action:

- `addRegression`,
- `fixGame`,
- `improveHarness`,
- `fileEngineFeedback`,
- `updateDesign`,
- `rerunWithMoreEvidence`,
- `proposalOnly`,
- or `ignore`.

Priority order:

1. Verified regressions and runtime failures.
2. Bugs that block better playtesting or replay.
3. Missing affordances that cause repeated invalid agent actions.
4. Harness perception gaps.
5. Engine gaps repeated across games.
6. Spec/design questions.
7. Speculative improvements.

### 7. Promote

Promotion turns a confirmed finding into durable project memory:

- unit or integration test,
- deterministic scenario,
- visual assertion,
- replay fixture,
- corpus row,
- issue/backlog entry,
- engine-feedback note,
- or design question.

The loop is incomplete if it fixes a real bug without adding a way to catch that class again.

### 8. Fix Or Propose

Automatic fixing is allowed only inside a narrow safety envelope:

- finding is confirmed,
- intended behavior is known,
- patch is small and local,
- regression exists or is added first,
- no broad refactor is needed,
- and repo gates/review can run.

Outside that envelope, the output is a ranked proposal with evidence and a suggested implementation plan.

### 9. Review And Gate

The game repo's normal gates remain authoritative. A loop pass may add extra gates, but it cannot skip local requirements.

For code changes, the loop runs:

- focused tests first,
- full repo gates,
- adversarial review per repo policy,
- doc/release updates when applicable,
- and a rerun of the scenario that produced the finding.

### 10. Compare And Learn

The controller updates a ledger with:

- runs attempted,
- confirmed findings,
- rejected findings,
- fixes applied,
- proposals emitted,
- regressions added,
- gate status,
- cost,
- elapsed time,
- repeated findings,
- and upstream engine gaps.

The next run should use the ledger to avoid rediscovering the same issue and to choose the highest-value next objective.

## Shared Contracts

### Game Adapter

Each game exposes a local adapter with this conceptual shape:

```ts
interface ImprovementGameAdapter {
  gameId: string;
  boot(config: RunConfig): Promise<RunHandle>;
  observe(handle: RunHandle): Promise<GameObservation>;
  act(handle: RunHandle, action: GameAction): Promise<ActionResult>;
  captureEvidence(handle: RunHandle): Promise<EvidenceManifest>;
  runGates(request: GateRequest): Promise<GateResult>;
  close(handle: RunHandle): Promise<void>;
}
```

This is a design shape, not necessarily the exact exported TypeScript surface. Each repo can implement it in scripts, test utilities, or a package-local harness. The key is that the loop controller can ask the same questions of every game.

### Run Manifest

Every run manifest should include:

- schema version,
- game id,
- scenario id,
- objective,
- start/end timestamps,
- git commit,
- engine version,
- model/provider metadata,
- seed and deterministic settings,
- artifact paths,
- summary metrics,
- stop reason,
- and gate summaries.

The run manifest is the unit a corpus dashboard reads.

### Finding

A finding should include:

- stable id,
- title,
- category,
- severity,
- observed,
- expected,
- evidence references,
- verification status,
- suspected subsystem,
- next action,
- promotion target,
- and disposition.

`VisualPlaytestFinding` is the visual substrate. `ImprovementFinding` is now the broader shared payload for visual, replay, metric, spec, and harness findings; marker helpers preserve the visual marker bridge by writing both `data.improvementLoop` and `data.visualPlaytest`.

### Evidence References

Evidence references should be machine-readable:

- bundle id/path,
- tick or tick range,
- marker id,
- screenshot path,
- trace step/action index,
- command sequence,
- entity refs when valid,
- state path,
- metric name,
- source file/test path after promotion.

### Ledger

Each game should keep a machine-readable improvement ledger under a local artifact directory, not in `docs` by default. Durable summaries can be committed when they are part of a design/review/devlog trail. The ledger is append-only for runs, with a compact current-state summary derived from it.

## Engine Responsibilities

`civ-engine` should own only the parts that are genuinely cross-game:

- shared finding/run-manifest type vocabulary,
- conversion between visual findings and broader improvement findings,
- redaction and hidden-state audience rules,
- session-marker bridge helpers,
- bundle/corpus metrics helpers,
- content-summary index if multiple games need command/event/marker predicates,
- corpus anomaly aggregation once corpora outgrow manual triage,
- per-player bundle filtering when training/evaluation needs honest historical observations,
- and deterministic tripwire helpers when state digest support exists.

It should not own:

- browser launch,
- provider calls,
- game scenario definitions,
- game-specific metrics,
- game-specific fix policies,
- or repo-specific gates.

## Game Responsibilities

Each game repo owns:

- scenarios and seeds,
- player action/control mapping,
- browser or headless boot,
- visible text and screenshot capture,
- hidden-state serialization,
- game-specific specs and expected behavior,
- local metrics,
- local regression tests,
- local gate commands,
- and local auto-fix policy.

The adapter should be thin enough that upgrading the shared contract is cheaper than maintaining a bespoke loop per repo.

## Current Gap Map

| Area | Current State | Gap |
| --- | --- | --- |
| Evidence capture | Engine bundles, visual traces, and markers exist | No cross-game run manifest tying all artifact kinds together |
| Findings | `ImprovementFinding`, visual findings, and game-specific findings exist | No full lifecycle ledger across visual/replay/metric/spec findings yet |
| Verification | Replay/self-check exist; `ImprovementFinding.verificationStatus` exists; aoe2 uses replay inspection discipline | No standard verifier stage across games yet |
| Promotion | Some repos add tests/fixtures from findings | No mandatory promotion rule across games |
| Auto-fix | aoe2 has propose-fix and auto-fix surfaces | No shared safety envelope or proposal/fix disposition schema |
| Corpus comparison | Engine metrics and corpus tools exist | No cross-game ledger/dashboard for improvement over time |
| Harness self-improvement | Some findings imply missing observations or controls | No first-class classification for harness gaps |
| Engine feedback | Some repos keep engine-feedback docs | No automatic routing from repeated cross-game findings to engine objectives |

## Rollout Plan

### Phase 1: Reference Vertical Slice

Pick one game and make the full loop real end to end.

Recommended choice:

- `farm` if the goal is a smaller clean extraction around the new visual harness.
- `aoe2` if the goal is to formalize the most complete existing loop.

The reference slice should cover one scenario:

```text
run visual/agent playtest
record manifest + artifacts
emit structured finding
verify finding against replay/state/screenshot
promote into regression
apply or propose one small fix
run gates
rerun original scenario
write ledger entry
```

### Phase 2: Extract Shared Contract

After one real slice proves the shape, add the smallest shared contract to `civ-engine`. The finding payload/marker part shipped in v1.4.0; the remaining candidate surface is:

- richer run-manifest conventions,
- ledger-current-state summaries,
- verifier-stage result helpers,
- repeated-finding signatures,
- and additional marker/report conversion helpers where more games prove a common need.

This should be additive and zero-runtime-dependency.

### Phase 3: Bring Up Minimum Loops

Bring each engine-consuming game to a minimum maturity level:

- `city`: replay-backed findings plus visual or scenario adapter.
- `civ-sim-web`: deterministic scenario plus manifest/finding/promotion path.
- `idle-life`: worker-hosted scenario, observation adapter, and regression promotion.
- `farm`: align existing visual loop with the shared manifest/finding contract if it was not the reference slice.
- `aoe2`: align its richer loop with the shared contract if it was not the reference slice.

Minimum maturity means proposal-only is acceptable, but evidence capture, verification status, and promotion disposition are required.

### Phase 4: Corpus And Upstream Learning

Add cross-run aggregation:

- repeated finding signatures,
- failure rates,
- command rejection reasons,
- milestone completion rates,
- visual/accessibility regression counts,
- cost per confirmed finding,
- fix success rate,
- and harness-gap frequency.

Repeated shared gaps become `civ-engine` objectives.

## Success Criteria

The design is successful when an agent can do the following in at least two games:

1. Run a bounded playtest scenario.
2. Save a manifest pointing to all evidence.
3. Produce at least one structured finding.
4. Verify or reject that finding with replay/state/screenshot/spec evidence.
5. Promote a confirmed finding into a durable regression or backlog item.
6. Apply or propose a fix according to the safety envelope.
7. Run repo gates and the original scenario again.
8. Write a ledger entry that the next agent can use.

The stronger success criterion is that a later agent can read only the manifest, finding, promotion artifact, patch/proposal, gate result, and ledger entry and understand why the loop did what it did.

## Open Questions

1. Should the first reference slice use `farm` for a clean smaller loop or `aoe2` for the most complete existing loop?
2. Should `civ-engine` add shared TypeScript runtime validators for the new run/finding schemas immediately, or start with documented shapes and local tests?
3. What is the default autonomy level: proposal-only, auto-fix for confirmed low/medium findings, or repo-configured?
4. Where should long-lived ledgers live in each game: `output/`, `artifacts/`, or a standard committed summary plus uncommitted raw run artifacts?

## Recommended Default Answers

1. Use `farm` as the first extraction target, then map `aoe2` onto the contract. `farm` is smaller and already aligned with `runVisualPlaytestLoop`; `aoe2` can validate that the contract survives a complex game.
2. Add runtime validators when the contract moves into `civ-engine`. LLM and browser outputs are runtime data, so type-only contracts are not enough.
3. Start with proposal-only by default, with opt-in auto-fix for replay-confirmed findings that add a regression first and touch a small local patch.
4. Keep raw artifacts uncommitted under each repo's artifact/output directory. Commit only specs, regression tests, durable fixture metadata, and compact human-readable summaries.

## Design Principle

The loop should not make agents more confident. It should make them harder to fool.

Every stage exists to turn vague observations into evidence, evidence into confirmed findings, confirmed findings into durable regressions, and durable regressions into safer future autonomy.
