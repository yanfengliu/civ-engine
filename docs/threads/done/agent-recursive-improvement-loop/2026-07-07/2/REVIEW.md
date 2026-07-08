# Review - 2026-07-07 Iteration 2

## Scope

Docs-only update to this thread's `DESIGN.md` and `PLAN.md`: fold in the 2026-07-07 fleet survey (verified maturity of aoe2/farm/city/townscaper against live code), record the v1.4.0 shipped-vocabulary delta and its v1.6.0 resolution, refresh the gap map, adjust the rollout to Tracks A-D (aoe2 reference slice), resolve the design's open questions, and replace the completed v1.4.0 plan tasks with the v1.5.0/v1.6.0 engine slices plus cross-repo tracks.

## Reviewers

- Two in-process adversarial subagent reviewers with distinct lenses (default review mode per AGENTS.md for non-high-risk changes; docs-only diff, no code implications): a factual-accuracy reviewer that verified every load-bearing claim against the live code of all five repos, and a process/consistency reviewer covering internal consistency, semver/policy soundness, repo doc rules, plan quality, and overclaiming.
- External multi-CLI review: not run (docs-only change; multi-CLI reserved for high-risk code per AGENTS.md).

## Findings

- **HIGH (process reviewer) - widening `nextAction` under an unchanged schema version is not additive.** The v1.4.0 validator closed-set-rejects unknown `nextAction` values and `improvementFindingsFromMarkers` silently skips invalid findings, so a durable marker using a widened value under `schemaVersion: 1` would be silently dropped by older readers while both sides claim schema 1. Fixed: DESIGN.md now specifies `IMPROVEMENT_FINDING_SCHEMA_VERSION` 2 with minimal stamping (readers accept 1|2; v1-vocabulary findings may still stamp 1; widened-vocabulary findings must stamp 2), and PLAN.md Task 5 tests/implements that rule instead of the incorrect "schemaVersion stays 1" parenthetical.
- **MEDIUM (process reviewer) - `VisualPlaytestStopReason` output-union widening needed an explicit policy call.** Fixed: verified against all four consumers (farm passes the value through as data, city equality-checks single values, Harborform's result union is open via `string & {}`, aoe2 does not consume the runner); DESIGN/PLAN now record the widening as additive-with-changelog-callout plus a planned ADR row stating the policy.
- **MEDIUM (process reviewer) - stage-5 status list read as shipped contract and lacked mappings for `rejected`/`needsHumanJudgement`.** Fixed: stage 5 gained a forward pointer, and the delta note now maps `rejected` to `falsePositive` and `needsHumanJudgement` to `unverified` + `disposition: 'deferred'`.
- **MEDIUM (accuracy reviewer) - PLAN Task 6 pointed at a nonexistent aoe2 thread path.** The aoe2 recursive-self-improvement-loop thread lives under `docs/threads/done/`, not `current/`. Fixed; Track A opens a new objective thread.
- **MEDIUM (process reviewer) - `docs/guides/concepts.md` missing from both engine tasks' doc lists.** Fixed; ARCHITECTURE.md also added per v1.3/v1.4 precedent.
- **LOW (accuracy reviewer) - stale run count and overstated city wording.** "285 runs" is already 286 and growing (now "285+ at survey time"); city does not "advance" a stored finding's status - no repo transitions after authoring; city's status varies and is backed by same-run verification. Both fixed.
- **LOW (process reviewer) - assorted plan-quality items.** Optional `tick?: number` now stated explicitly; cost-budget scope clarified (cost metering stays game-side); Tasks 7/8 expanded into per-change checkboxes; Task 5 pre-plans a manifest split file for the 500-LOC cap; duplicate guide mention removed.
- **NIT (accuracy reviewer) - `engineHalt`/`REPORT.md` attribution conflated two aoe2 scripts.** Fixed: auto-fix triggers only on `engineHalt`; `REPORT.md` is the propose-fix fallback.

The accuracy reviewer verified roughly 40 load-bearing claims clean across the five repos (farm's 8 hardcoded-`verified` sites, the output-dir wipe, the stale replay target, city's PointerEvent host + backdoor pin + absent CI, aoe2's providers/ledgers/counterfactual runner and documented runner bypass, Harborform's frozen `unverified` + `codex --image` + coverage gate, and the engine's shipped enums/validator/runner behaviors).

## Disposition

All findings fixed in this iteration. The remaining reviewer note is advisory: the schema-version-2 decision and the output-union-widening policy land as code in the v1.5.0/v1.6.0 tasks, where the implementation review must confirm them.

## Verification

- Full gates green on the updated docs: `npm.cmd test` (1254 passed + 1 todo), `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.
- `npx.cmd vitest run tests/docs-threads.test.ts` re-run after adding this REVIEW.md.
