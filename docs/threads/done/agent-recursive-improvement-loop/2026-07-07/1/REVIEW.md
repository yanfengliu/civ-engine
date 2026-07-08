# Review - 2026-07-07 Iteration 1

## Scope

Staged `civ-engine` v1.4.0 change: shared recursive-improvement finding types/helpers, public exports, public-surface fixture, docs, version bump, active design/plan updates, and tests.

## External Reviewers

- Codex CLI: not run. The approval policy rejected the command because it would export the staged unpublished repository diff to an external reviewer service without explicit user approval.
- Claude CLI: not run. The approval policy rejected the command for the same private-diff export reason.

## Local Adversarial Review

- [MEDIUM] `ImprovementFinding` is a machine-facing schema but was not exposed through `getAiContractVersions()`. Without a contract-version marker, external agents could not pin parser behavior the way they can for command results, tick failures, world debug/history, scenario results, and the client protocol. Fixed by adding `IMPROVEMENT_FINDING_SCHEMA_VERSION`, adding `improvementFinding` to `AiContractVersions`/`getAiContractVersions()`, exporting the constant, updating the public-surface fixture and API docs, and adding a failing-first test in `tests/improvement-loop.test.ts`.

## Disposition

All local findings were fixed in this iteration. Remaining risk is reviewer diversity: external multi-CLI review was blocked by the data-export approval boundary, so this iteration relied on local adversarial review plus full repo gates.

## Verification

- `npx.cmd vitest run tests/improvement-loop.test.ts` failed before the AI-contract-version fix, then passed after the fix.
- `npx.cmd vitest run tests/improvement-loop.test.ts tests/public-surface.test.ts tests/visual-playtest.test.ts` passed (19 tests).
- `npx.cmd tsc --noEmit` passed.
- Full gates passed after the review fix: `npm.cmd test` (1254 passed + 1 todo), `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build`.
