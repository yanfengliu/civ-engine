# Agent Recursive Improvement Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the recursive-improvement loop from design to a closed cross-repo reality: harden the engine contracts the fleet already consumes (v1.5.0 + v1.6.0), close the loop in `aoe2` (Track A), then align `farm` and `city` (Track C). `townscaper` is deferred while another agent owns that repo (2026-07-07).

**Architecture:** Keep the engine boundary small and additive. `civ-engine` owns shared machine-readable vocabulary, the visual-loop runner, and zero-dependency validation/conversion helpers; game repos keep browser/model/game-specific loop control, scenarios, gates, and fix policy. Every runner change is opt-in with defaults preserving current behavior — `farm`, `city`, and `townscaper` run `runVisualPlaytestLoop` live and must not change behavior on upgrade.

**Tech Stack:** TypeScript, Vitest, npm scripts, existing visual-playtest/improvement-loop modules, `aoe2`'s playtest/ledger/auto-fix scripts.

---

## Completed (v1.4.0 slice, shipped 2026-07-07)

- [x] **Task 0: Wrap `aoe2` dirty visual unit** — shipped as aoe2 v0.1.125 (Town Center roof posts).
- [x] **Task 1: Shared improvement types/helpers in `civ-engine`** — shipped as v1.4.0 (`e33625f`): `ImprovementFinding`, evidence refs, bare `ImprovementRunManifest`, `assertImprovementFinding`, marker bridge, `IMPROVEMENT_FINDING_SCHEMA_VERSION` in `getAiContractVersions()`.
- [x] **Task 2: Migrate `aoe2` adapter onto shared helpers** — aoe2 `visualPlaytestAdapter.ts` consumes `improvementFindingToMarker`; `selfImprovementLoop.ts` consumes `improvementFindingsFromMarkers`.
- [x] **Task 3: Cross-repo verification** — both repos clean/synced; live cross-repo use verified by the 2026-07-07 fleet survey (see DESIGN.md Context).

## Task 4: Engine v1.5.0 — Visual Runner Hardening + Tick + Prompt Parts

**Files:**
- Modify: `src/visual-playtest.ts`, `src/visual-playtest-types.ts`
- Create (if the 500-LOC cap requires a split): `src/visual-playtest-prompt.ts`
- Modify: `src/index.ts`, `tests/visual-playtest.test.ts`, `tests/fixtures/public-surface.json`
- Modify: `README.md`, `docs/api-reference.md`, `docs/guides/visual-playtest-harness.md`, `docs/guides/ai-integration.md`, `docs/guides/concepts.md`, `docs/architecture/ARCHITECTURE.md`, `docs/architecture/decisions.md`, `docs/architecture/drift-log.md`, `docs/changelog.md`, `docs/devlog/summary.md`, latest `docs/devlog/detailed/*.md`, `package.json`

- [ ] **Step 1: Failing tests first** for each opt-in behavior: budget stop (`maxWallClockMs` exceeded → `stopReason: 'budgetExceeded'`, ok), `AbortSignal` (abort mid-loop → `stopReason: 'aborted'`), `maxActionsPerStep` enforcement, `agentObservation: 'redacted'` (agent receives audience-filtered observation per `promptMode` with screenshot preserved; reviewer/traceOnly/sensitive values absent), `observationForAgent` helper direct, `onActionFailure: 'continue'` (+ `maxActionFailures` cap; failed action recorded in trace, `previousActionResult` carries the error, remaining same-step actions skipped), optional `tick?: number` on observation surfacing in prompt text, `buildVisualPlaytestPromptParts` (text parts equal the string builder's content; image part carries path/dataUrl/mime/dimensions; playerBlind excludes hidden state). Plus default-behavior pins: with no new options, existing semantics are byte-identical (existing suite must stay green untouched).
- [ ] **Step 2: RED** — `npx.cmd vitest run tests/visual-playtest.test.ts`.
- [ ] **Step 3: Implement** the additive surface. Keep each file under 500 LOC — extract prompt/redaction helpers to `src/visual-playtest-prompt.ts` if needed (barrel-exported, no public-surface change beyond the new names).
- [ ] **Step 4: GREEN** — focused tests, then `tests/public-surface.test.ts` + `tests/loc-budget.test.ts`.
- [ ] **Step 5: Docs + surface pin + version** — 1.4.0 → 1.5.0, changelog entry with behavior callouts (new stopReason values called out for downstream type consumers), guide sections for budgets/redaction/retry/tick/prompt-parts, ADR rows for "runner hardening is opt-in" and "output-union widening ships as additive-with-callout when verified against all known consumers" (verified 2026-07-07: farm passes stopReason through as data, city equality-checks, Harborform's union is open `string & {}`, aoe2 does not consume the runner), drift-log row + ARCHITECTURE visual-playtest row refresh.
- [ ] **Step 6: Full gates** — `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.
- [ ] **Step 7: Adversarial review** (in-process Workflow; attempt multi-CLI since the runner is agent-loop code), fix findings, re-review until nitpicks only.
- [ ] **Step 8: Commit + push** — `feat: harden visual playtest runner (budgets, redaction, retry, tick, prompt parts)`.

## Task 5: Engine v1.6.0 — Improvement-Loop Contract Completion

**Files:**
- Modify: `src/improvement-loop.ts`, `src/improvement-loop-types.ts`, `src/ai-contract.ts`, `src/index.ts`
- Create (if the 500-LOC cap requires a split — improvement-loop.ts is already 273 lines): `src/improvement-loop-manifest.ts`
- Modify: `tests/improvement-loop.test.ts`, `tests/fixtures/public-surface.json`
- Modify: same doc set as Task 4

- [ ] **Step 1: Failing tests first** for: `verificationMethod` accepted/validated (`replay|state|spec|metric|screenshot|human`), `promotionTarget` accepted/validated, widened `nextAction` (`improveHarness|fileEngineFeedback|addRegression|updateDesign`) accepted by validator and marker round-trip, schema-version-2 minimal stamping — `IMPROVEMENT_FINDING_SCHEMA_VERSION` becomes 2, validators/readers accept `schemaVersion: 1 | 2`, a schemaVersion-1 finding using a widened `nextAction` value is rejected, findings using only v1 vocabulary may still stamp 1, `getAiContractVersions().improvementFinding === 2` — `createImprovementRunManifest` builder output validates via `assertImprovementRunManifest` (extended optional fields: gitCommit, engineVersion, model, provider, seed, costUsd, durationMs, artifacts[], stopReason, gates), strict mode — `assertImprovementFinding(f, { requireVerificationEvidence: true })` rejects `verified` findings lacking a replayable evidence ref (`bundle|marker|tick`) or lacking `verificationMethod`, default mode unchanged (a hardcoded-`verified` finding without evidence still passes non-strict — farm compatibility pin), reverse conversion `visualPlaytestFindingToImprovementFinding(visual, { id, ... })` round-trips with `improvementFindingToVisualPlaytestFinding`.
- [ ] **Step 2: RED**, **Step 3: Implement** (new fields are additive optional keys tolerated by v1 readers; the `nextAction` widening is NOT — it rides the schema-version-2 minimal-stamping rule per the DESIGN.md delta note), **Step 4: GREEN** including surface/LOC gates.
- [ ] **Step 5: Docs + version** — 1.5.0 → 1.6.0; update the DESIGN.md shipped-vocabulary-delta note to record the resolution as shipped, including the version-2 stamping rule.
- [ ] **Step 6: Full gates.** **Step 7: Adversarial review.** **Step 8: Commit + push** — `feat: complete improvement-loop contract (verification method, manifest lifecycle, strict mode)`.

## Task 6 (Track A): Close The Loop In `aoe2`

**Files (aoe2 repo):** read `AGENTS.md` + the closed thread `docs/threads/done/recursive-self-improvement-loop/` first (Track A opens a new objective thread); expected touch points: `scripts/playtest-llm-auto-fix.mjs`, `scripts/playtest-self-improve.mjs`, `scripts/propose-fix.mjs`, `src/game/playtest/selfImprovementLoop.ts`, `src/game/playtest/fixProposalInput.ts`, new `scripts/playtest-recursive.mjs`, tests under `tests/playtest/`, aoe2 docs/devlog/changelog/version.

- [ ] **Step 1:** Wire ledger-classified `fix` findings into `applyAndGate` + counterfactual rerun as the primary input (today auto-fix triggers only on legacy `engineHalt` regressions and propose-fix falls back to the legacy `REPORT.md`; keep legacy as fallback if cheap).
- [ ] **Step 2:** `playtest:recursive` command: run → findings → ledger → propose → gated apply → rerun → compare → ledger entry, with hard budgets (max fix attempts per pass, cost cap, wall-clock cap) and proposal-only default autonomy.
- [ ] **Step 3:** Episodic memory: feed prior ledger finding signatures (`selfImprovementFindingComparison`) into the next run's objective selection and agent context.
- [ ] **Step 4:** Adopt v1.6.0 fields where cheap (`verificationMethod` on ledger classifications, `createImprovementRunManifest`).
- [ ] **Step 5:** aoe2 gates + review per its AGENTS.md, devlog/changelog/version, commit + push.

## Task 7 (Track C): `farm` Alignment

Expand into a farm-local plan at execution time per farm's own conventions; the contract-level punch list:

- [ ] Wire `SessionRecorder` into the live visual loop so runs produce replayable bundles.
- [ ] Repoint `scripts/llm-playtest-replay.mjs` from the stale `output/playwright/llm-playtest/latest.bundle.json` to the live loop's bundle.
- [ ] Author findings `unverified`; add a verify step that flips status with `verificationMethod` evidence.
- [ ] Append-only ledger: stop the per-run output wipe (or archive history before the wipe).
- [ ] Adopt the marker bridge so evidence refs can cite `bundle`/`marker`.
- [ ] farm gates + review, commit + push.

## Task 8 (Track C): `city` Alignment

Expand into a city-local plan at execution time per city's own conventions; the contract-level punch list:

- [ ] LLM provider adapter (reuse aoe2's provider pattern) + autonomous driver over `createCityVisualPlaytestHost` with budgets.
- [ ] Persist bundles (`FileSink` or exported `MemorySink` bundles under `output/`) + start a findings ledger.
- [ ] Fix stale CI-gate docs (AGENTS.md and roadmap claim a gate no workflow provides) — or add the CI gate.
- [ ] city gates + review, commit + push.

## Deferred

- `townscaper` (Harborform) alignment — repo owned by another agent as of 2026-07-07.
- Track D (corpus dashboard, repeated-finding signatures, engine-feedback auto-routing, `stateDigest` tripwire) — after Tracks A–C prove the shapes.
