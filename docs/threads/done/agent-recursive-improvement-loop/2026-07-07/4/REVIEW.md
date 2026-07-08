# Review - 2026-07-07 Iteration 4

## Scope

civ-engine v1.6.0: improvement-loop contract completion — finding schema version 2 with minimal stamping, `verificationMethod`/`promotionTarget`, widened `nextAction`, run-manifest lifecycle (`createImprovementRunManifest`/`assertImprovementRunManifest`), strict verified-evidence validation mode, reverse `visualPlaytestFindingToImprovementFinding`, docs, version bump. Task 5 of this thread's PLAN.md.

## Reviewers

Four independent reviewers on the staged diff (multi-CLI escalation: durable-payload schema versioning has data-loss blast radius): Codex CLI (`gpt-5.5`, xhigh, read-only sandbox), Claude CLI (`opus[1m]`, max effort, grounded), and two in-process adversarial subagents (runtime-correctness with 10 live probes against the built engine; docs/coverage with gate re-execution).

## Findings

- **HIGH (Codex; independently Claude as Low) - strict verification mode was satisfiable by unaddressed evidence.** `{ kind: 'bundle' }` with no `bundleId` counted as replayable, so "verified" could clear strict mode pointing nowhere. Fixed: a ref counts only when addressed (`tick` with its tick, `marker` with `markerId`, `bundle` with `bundleId`/`sessionId`); pinned by a rejection test; docs updated to "addressed replayable evidence ref".
- **HIGH (in-process correctness, process) - the staged snapshot diverged from the fixed worktree** (review fixes were unstaged; the staged tree contained the pre-fix strict check and a failing cross-b version test). Resolved operationally: everything re-staged and gates re-run before commit.
- **MEDIUM (self-inflicted, caught by gates) - the cross-b replay-version test hardcoded `'1.6.0'` as a different minor,** which collided with the new `ENGINE_VERSION`. Fixed with a `crossMinorVersion()` derived from `ENGINE_VERSION` so the test can never collide with a future bump.
- **LOW-MEDIUM (Claude) - `createImprovementRunManifest` threw `json_incompatible` on explicitly-undefined optional fields,** a natural call pattern when threading `value | undefined` metadata (`exactOptionalPropertyTypes` is off). Fixed: the builder strips undefined entries; pinned.
- **INFORMATIONAL (Claude) - constant-reusing authors would over-stamp v1-vocabulary findings as v2** after the constant bump, making older readers skip representable payloads. Fixed: new `minimalImprovementFindingSchemaVersion(nextAction)` helper (used by the reverse lift internally), api-reference guidance to prefer it over the raw constant, and a changelog migration note.
- **MEDIUM (in-process docs) - stale changelog numbers after the review fixes landed.** Fixed (23 tests, 1300+1, +16 fixture entries).
- **MEDIUM-LOW (in-process correctness) - `visual.data` silently dropped on reverse lift,** undocumented and unpinned. Resolved as intentional (copying it would nest a prior conversion's `improvementLoop` envelope): documented in the api-reference and pinned by a test showing the drop and `init.data` winning.
- **MINOR (in-process docs) - `ImprovementFindingInit` and `AssertImprovementFindingOptions` shapes were referenced but not shown** in the api-reference. Fixed: both type blocks added, signature uses the named options type.
- **LOW (in-process correctness) - marker envelope version is advisory on read** (`improvementFindingsFromMarkers` validates the inner finding, not the envelope). Resolved as documented behavior — the inner finding's own validation governs; one sentence added to the api-reference.
- **LOW (both in-process) - assorted pins and bookkeeping.** Added tests: new optional fields accepted as additive keys on v1 findings, forged v1-stamped-with-v2-vocabulary markers silently skipped on read, caller-supplied `engineVersion` override. README Feature Overview rows refreshed for v1.5/v1.6; PLAN Task 5 checkboxes ticked; changelog gained the `sourceRun` newly-recognized-keys edge caveat. Noted, not actioned: `src/improvement-loop.ts` at 484/500 LOC — the next feature to this file must split out manifest validation.

Clean per the correctness reviewer (probe-verified): aoe2-shaped v1 payloads validate and round-trip unchanged with envelope version 1; cross-version matrix has no corruption or mislabeling path (v2 findings skipped by older readers remain recoverable via the parallel `visualPlaytest` envelope); validator completeness on NaN/Infinity/negative numerics, non-boolean gate flags, and seed types; builder determinism (never invents ids/timestamps); reverse-conversion edge cases (`actionIndex` without `step`, empty evidence, empty `stateLabels`); strict-mode scope gates only `verified`.

## Disposition

All findings fixed or explicitly resolved-as-documented in this iteration. Gates re-run green after all fixes.

## Verification

- TDD red: 11 of 17 initial tests failed before implementation; review-fix tests were added alongside their fixes with reviewer probes as the pre-fix RED evidence.
- `npx.cmd vitest run tests/improvement-loop.test.ts` — 23 passed. `npx.cmd vitest run tests/session-replayer.test.ts` — 26 passed after the cross-minor fix.
- Full gates green on the final tree: `npm.cmd test` (1300 passed + 1 todo, 81 files), `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.
