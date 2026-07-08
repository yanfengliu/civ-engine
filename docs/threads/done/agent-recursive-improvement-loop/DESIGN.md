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

The local game repos are uneven. A code-level fleet survey (2026-07-07) verified each repo's actual state, which corrects the earlier second-hand characterizations:

- `aoe2` is the closest to closure. Verified: multimodal LLM self-play (Anthropic + claude-code providers, base64 screenshot blocks), Playwright driving, fog-filtered `__AOE2_TEST__.agent` state API, deterministic bundles + replay self-check, oracle findings emitted as engine `ImprovementFinding`s into ledgers with introduced/persisted/resolved comparison, ledger-driven fix-proposal intake, and an auto-fix apply/gate/counterfactual runner. Two caveats: it deliberately bypasses `runVisualPlaytestLoop` (its own `llmRunner` orchestrates; only the contract helpers are consumed — documented in aoe2 `decisions.md`), and the fix arm is not yet driven by ledger classifications end to end — the auto-fix runner triggers only on legacy `engineHalt` regressions, and the propose-fix intake accepts `--ledger` but still falls back to the legacy `REPORT.md`. The loop is one integration away from closed.
- `farm` is the best front half and runs the engine runner itself: `runVisualPlaytestLoop` + `buildVisualPlaytestPrompt` drive a Playwright host, findings are engine-validated (`assertImprovementFinding`) with real screenshot evidence, and run-over-run comparison exists — all contract-tested. Verified back-half defects: the live loop records no `SessionRecorder` bundle (the replay script points at a stale bundle from a removed harness), every finding hardcodes `verificationStatus: 'verified'` with no verification behind it, and the runner deletes its own output directory at start so no cross-run history can accumulate.
- `city` is the best back half — much stronger than previously recorded here. Verified: `runVisualPlaytestLoop` wired to both a headless dogfood and a player-surface host (real synthetic `PointerEvent`s on the live canvas; a test asserts the command backdoor is never touched), the full `ImprovementFinding` lifecycle with the fleet's only `verificationStatus` that varies and is backed by same-run verification (replay self-check + `inspectAt` ground truth; note no repo anywhere transitions a stored finding's status after authoring), a real replay/self-check determinism gate, and `inspectAt(tick)` ground-truth verification. Missing the entire LLM half (no provider, no autonomous driver), bundle persistence (`MemorySink` only), and any fix arm. Its docs claim a CI gate that does not exist.
- `townscaper` (Harborform) is the heaviest runner consumer: `runVisualPlaytestLoop` + Codex CLI multimodal agent, real Playwright mouse/keyboard actions, a coverage gate, and 285+ recorded runs at survey time (actively growing). Verified gaps: no determinism story at all (no seed, no recorder, replay format is a viewer not a verifier), `verificationStatus` frozen at `'unverified'`, and the de-facto ledger is a narrative `progress.md`. (Hands-off as of 2026-07-07: another agent is actively working in that repo.)
- `civ-sim-web` and `idle-life` use the engine but do not yet expose a mature recursive improvement harness.

The gap is therefore not basic capability. The gap is uniformity, closure, and promotion: the loop is not yet a standard contract that every game can implement and every agent can drive. The survey sharpened this: no repo exceeds roughly 60% of the loop, but the fleet collectively covers all of it — each repo proved a different slice (aoe2 closure-minus-one, farm front half, city verification spine, Harborform volume and action surface).

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

This list is the conceptual vocabulary; the shipped surface expresses it as `verificationStatus` + `verificationMethod` — see the shipped-vocabulary delta under Shared Contracts for the exact mapping, including `rejected` and `needsHumanJudgement`.

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

**Shipped-vocabulary delta (v1.4.0) and its resolution.** The v1.4.0 slice shipped a deliberately collapsed vocabulary: `verificationStatus: unverified | verified | falsePositive | fixed | regressed` and `nextAction: proposalOnly | autoFix | manualFix | observeMore | none`. That collapse lost two things this design requires: the *method* of confirmation (replay vs state vs spec vs metric — the stage-5 statuses above) and the classifications `improveHarness` / `fileEngineFeedback` / `addRegression` / `updateDesign` (stage 6), which made harness self-improvement and engine-feedback routing unrepresentable as machine decisions. The fleet survey also showed the typed-but-behaviorless status invites abuse: two of four repos freeze the field (farm authors everything as `verified`, Harborform as `unverified`). Resolution, SHIPPED in v1.6.0: the shipped status enum stays the lifecycle axis, an optional `verificationMethod` field carries the how (`replay | state | spec | metric | screenshot | human`), `promotionTarget` covers stage 7, `nextAction` is widened with the four missing classifications, and `assertImprovementFinding(value, { requireVerificationEvidence: true })` refuses `verified` findings lacking a replayable evidence ref plus a method. The stage-5/stage-6 lists above remain the conceptual vocabulary; the shipped surface expresses them as status + method rather than a single fused enum. The full stage-5 mapping: `replayConfirmed`/`stateConfirmed`/`specConfirmed`/`metricConfirmed` become `verificationStatus: 'verified'` + the matching `verificationMethod`; `rejected` becomes `'falsePositive'`; `needsHumanJudgement` stays `'unverified'` with `disposition: 'deferred'` (a mechanical verifier that cannot decide defers, it does not claim a method).

**Schema-version consequence of widening `nextAction` (shipped in v1.6.0).** Widening a required, closed-set-validated field is not an additive optional field: the v1.4.0 validator rejects unknown `nextAction` values, and `improvementFindingsFromMarkers` silently skips findings that fail validation — so a durable marker written with `nextAction: 'improveHarness'` under an unchanged schema version would be silently dropped by older readers while both sides claim schema 1, which is exactly the silent-fooling mode this design exists to prevent. Therefore v1.6.0 bumps `IMPROVEMENT_FINDING_SCHEMA_VERSION` to 2 with minimal stamping: validators and readers accept `schemaVersion: 1 | 2`; findings that use only v1 vocabulary may still stamp 1 (maximum old-reader interop); findings using widened `nextAction` values must stamp 2, so an old reader's skip is a declared version incompatibility rather than a lie. New optional fields (`verificationMethod`, `promotionTarget`, manifest extensions) are genuinely additive — the v1.4.0 validator tolerates unknown keys — and do not by themselves require stamping 2. Marker envelopes mirror the finding's own schema version, keeping v1 payload pins in game repos green.

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

| Area | Current State (verified 2026-07-07) | Gap |
| --- | --- | --- |
| Evidence capture | Engine bundles, visual traces, and markers exist; aoe2/city record bundles; farm and Harborform run visual loops with no recorder | No cross-game run manifest tying all artifact kinds together; `ImprovementRunManifest` is a bare type with no builder/validator, so farm and Harborform hand-shape manifests |
| Findings | `ImprovementFinding` shipped and consumed by all four browser games | No full lifecycle ledger across visual/replay/metric/spec findings yet; only aoe2 persists ledgers, and farm wipes its output dir per run |
| Verification | Replay/self-check exist; `verificationStatus` exists; city is the only repo whose status varies, backed by same-run verification; farm hardcodes `verified`, Harborform hardcodes `unverified`; no repo transitions a stored finding after authoring | No standard verifier stage across games, no `verificationMethod`, and nothing structurally prevents asserting `verified` without evidence |
| Runner | `runVisualPlaytestLoop` is live in farm, city, and Harborform (285+ runs) | No wall-clock/step budgets, no `AbortSignal`, redaction is advisory at the `decide()` boundary (the raw observation including reviewer/traceOnly channels is handed to the agent), and the first failed action aborts the whole run with no retry affordance. Cost metering stays game-side where the provider calls live |
| Visual delivery | Screenshot is a descriptor; three repos hand-rolled multimodal delivery three different ways (base64 blocks, `codex --image`, file-path pointer) | No shared zero-dep prompt-parts type; the documented prompt helper is text-only, and no typed observation-to-tick binding exists |
| Promotion | Some repos add tests/fixtures from findings | No mandatory promotion rule across games; no `promotionTarget` field |
| Auto-fix | aoe2 has propose-fix intake from ledgers and an apply/gate/counterfactual runner | Auto-fix still triggers on legacy signals, not ledger classifications; no shared safety envelope schema |
| Corpus comparison | Engine metrics and corpus tools exist; aoe2 computes introduced/persisted/resolved deltas | No cross-game ledger/dashboard for improvement over time; no cross-run feed into the next run's objective (every repo rediscovers) |
| Harness self-improvement | Some findings imply missing observations or controls | `nextAction` cannot express `improveHarness`; no first-class classification for harness gaps |
| Engine feedback | Some repos keep engine-feedback docs | `nextAction` cannot express `fileEngineFeedback`; no automatic routing from repeated cross-game findings to engine objectives |

## Rollout Plan

The 2026-07-07 fleet survey reordered the original farm-first rollout. aoe2 is one integration from a closed loop while farm needs three fixes, the engine runner already has three live consumers, and two extraction triggers (multimodal delivery, run-manifest construction) have already fired under the "multiple repos prove it" rule — so contract extraction no longer needs to wait for the reference slice. The adjusted rollout is two parallel tracks that meet, then fleet alignment.

### Phase 1 (Track A): Close The Loop In aoe2

aoe2 is the reference vertical slice: wire ledger-classified `fix` findings into the existing apply/gate/counterfactual runner (today it triggers only on legacy `engineHalt` regressions, and the propose-fix intake still falls back to the legacy `REPORT.md`), wrap the chain into one recursive command with hard budgets (max fix attempts, cost, wall-clock), and feed prior-run finding signatures into the next run's objective and agent context. farm remains the *contract-alignment template* (Phase 3) rather than the proving slice.

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

### Phase 2 (Track B): Extract Shared Contract — Two Additive Slices

The finding payload/marker part shipped in v1.4.0. The fleet survey supplied the multi-repo evidence the remaining surface was waiting on, so the extraction lands as two coherent additive zero-runtime-dependency minors that can proceed in parallel with Track A:

- **v1.5.0 — visual runner hardening + tick + prompt parts** (justified by three live runner consumers): opt-in budgets (`maxWallClockMs`, per-step action cap) and `AbortSignal` (cost metering stays game-side where the provider calls live); an opt-in enforced agent-observation mode that audience-filters state channels per `promptMode` before `decide()` while keeping the screenshot; an opt-in continue-past-failed-action policy with a failure cap instead of abort-on-first; an optional typed `tick?: number` on `VisualPlaytestObservation`; and a typed prompt-parts builder (text + image parts) so games stop hand-rolling multimodal delivery three different ways. All defaults preserve current behavior — the three live consumers must not change behavior on upgrade. The new stop reasons (`budgetExceeded`, `aborted`) widen the `VisualPlaytestStopReason` output union; verified 2026-07-07 against all four consumers (farm passes the value through as data, city equality-checks single values, Harborform's result union is open via `string & {}`, aoe2 does not consume the runner), so the widening ships as additive-with-changelog-callout, recorded as an ADR.
- **v1.6.0 — improvement-loop contract completion** (justified by two repos hand-shaping manifests and two freezing verification status): `verificationMethod` + `promotionTarget` fields and the widened `nextAction` vocabulary with the schema-version-2 minimal-stamping rule (see the shipped-vocabulary delta above); `createImprovementRunManifest` builder + `assertImprovementRunManifest` validator with the run-identity fields the ledger needs (commit, engine version, model/provider, seed, cost, duration, artifacts, stop reason, gates); an opt-in strict validation mode for verified findings; and the reverse `visualPlaytestFindingToImprovementFinding` conversion.

Deferred candidates for a later slice, still demand-gated: ledger-current-state summaries, verifier-stage result helpers, and repeated-finding signatures — Track A/C implementations should prove the shapes first.

### Phase 3 (Track C): Bring Up Minimum Loops

Bring each engine-consuming game to a minimum maturity level, using the survey's per-repo punch lists:

- `farm` (contract-alignment template): wire `SessionRecorder` into the live visual loop and repoint the stale replay script; author findings as `unverified` and add a verify step that flips status with `verificationMethod` evidence; replace the destructive per-run output wipe with an append-only ledger; adopt the marker bridge so evidence refs can cite bundles.
- `city`: add the missing LLM half (provider adapter + autonomous driver over the existing visual host, reusing aoe2's provider pattern) with budgets; persist bundles; fix the stale CI-gate claims (or add the CI gate).
- `townscaper` (Harborform): record seeds and adopt the engine recorder so its run volume becomes verifiable; use its existing file-agent re-drive as the verification step; ledger over its existing `ImprovementFinding` payloads. Deferred while another agent owns the repo (2026-07-07).
- `civ-sim-web`: deterministic scenario plus manifest/finding/promotion path.
- `idle-life`: worker-hosted scenario, observation adapter, and regression promotion.
- `aoe2`: align its ledger/manifest to the v1.6.0 types; it stays on its own orchestrator by documented decision.

Minimum maturity means proposal-only is acceptable, but evidence capture, verification status, and promotion disposition are required.

### Phase 4 (Track D): Corpus And Upstream Learning

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

## Resolved Questions (2026-07-07 fleet survey)

1. **Reference slice: `aoe2`, not `farm`.** The original recommendation predated the survey. aoe2 is one integration from closure (ledger → apply/gate/counterfactual) while farm needs three back-half fixes; closing aoe2 proves the loop *shape* fastest, and farm becomes the contract-alignment template in Phase 3. Revises the earlier farm-first answer.
2. **Runtime validators: yes, now.** LLM and browser outputs are runtime data, and the survey showed what type-only contracts allow: two repos hand-shape `ImprovementRunManifest` objects and two freeze `verificationStatus`. v1.6.0 ships the builder/validator plus an opt-in strict verification mode.
3. **Default autonomy: proposal-only**, with opt-in auto-fix for verified findings that carry replayable evidence, add a regression first, and touch a small local patch. This matches aoe2's shipped apply/gate/counterfactual envelope.
4. **Ledgers: raw artifacts uncommitted** under each repo's artifact/output directory; commit only specs, regression tests, durable fixture metadata, and compact human-readable summaries. This matches aoe2 and farm practice; farm's per-run output wipe violates the append-only expectation and is a Phase 3 fix.

## Design Principle

The loop should not make agents more confident. It should make them harder to fool.

Every stage exists to turn vague observations into evidence, evidence into confirmed findings, confirmed findings into durable regressions, and durable regressions into safer future autonomy.
