# Review 0: implementation

## Target

civ-engine base a839ad5e5b435f36e7494b86ff63606573a10e47 plus the 21-file M1 patch at ignored tmp/review-runs/engine-72-m1/target.patch, SHA256 1b350e9f58622bd204ffb8a0af1007e83b4e2862e4217e375ce87b636d95c30f. Scope: coverage types/census, replayer snapshot selection and continuity, both barrels, public fixtures, independent tests, release 2.5.0 stamps and consumer documentation. Plans, registry and devlogs were excluded. The patch remains retained until it is bound to the final recoverable commit before cleanup; no reviewed target bytes have changed.

## Reviewers and coverage

Codex CLI 0.158.0, gpt-6-astra, reasoning xhigh, ephemeral read-only sandbox, foreground review only. The repository was freshly verified PUBLIC/isPrivate false with matching origin before the authorized source review. Actual command exit 0 and a substantive terminal report were observed. No reviewer tests, builds, installs, network, edits, delegation or background tasks were authorized. Outside-diff session-bundle.ts:163 and browser-entry.test.ts:141 citations were spot-checked against source. The log contains sandbox failure strings only in the runbook text it read; no child initialization failure occurred. The task-owned process query was empty after completion, and the external Codex slot was released to root.

## Reports

### Codex gpt-6-astra xhigh
No material defects found in this bounded independent read-only review of M1. No required fixes identified.

Reviewed HEAD/base `a839ad5e5b435f36e7494b86ff63606573a10e47` and the 21-file patch with verified SHA-256 `1b350e9f58622bd204ffb8a0af1007e83b4e2862e4217e375ce87b636d95c30f`.

- **Coverage matches performed work.** Completed intervals are recorded after segment replay returns. The unchanged comparison loop checks enabled events/executions per transition and state only at the endpoint. Early stopping occurs after that segment completes. See [session-replayer.ts:320](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/src/session-replayer.ts:320) and the comparison code read outside the diff at [session-replayer.ts:364](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/src/session-replayer.ts:364).
- **Bounds and incomplete results are consistent with the accepted contract.** Snapshot filtering uses the existing horizon; skipped failures and unchecked tails remain uncovered. Empty, no-payload and all-disabled cases cannot become complete. The unchanged horizon implementation was independently inspected at [session-bundle.ts:163](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/src/session-bundle.ts:163).
- **No accidental replay expansion or new coverage aliasing found.** The continuity presence set is built once per call, snapshot sorting uses a new array, and coverage construction adds no world creation or tail replay. The checked work-count assertions measure constructions/steps, not elapsed performance.
- **Compatibility and platform changes are coherent.** Coverage remains optional on the result type, both barrels export the three new types, and the helper adds no runtime dependency. I also read the existing declared browser-parity check outside the diff at [browser-entry.test.ts:141](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/tests/browser-entry.test.ts:141).

Execution was excluded by instruction: no tests, builds, installs, network requests, edits, delegation or background tasks ran. The reported 167 passing checks and mutation evidence remain owner-supplied evidence, not independently reproduced results. Full gates, build/distribution verification and remote acceptance remain with root.
## Findings and disposition

No material defects or required fixes were reported. The independent verdict applies to this exact target, with the execution and distribution bounds below.

## Verification

Owner tests first: the unchanged M0 implementation failed all 16 original coverage contract tests. The final focused selection passed 167 tests in 12 files, including 20 literal coverage/work/order cases, replayer error/truncation checks, both platform surfaces, consumer compatibility, version/doc claims and work/thread validation. Typecheck and scoped lint passed. Five deliberate regressions each returned actual exit 1 with their intended tests failing: original absent coverage, raw endTick horizon, out-of-persisted-horizon endpoint, omitted continuity guard and all-disabled false completeness. Each mutation restored exact source bytes in finally. Same-tree base/M1 controls both passed literal work counts: complete nine ticks gives two worlds/nine steps; tail nine ticks gives one world/five steps; 1000 one-tick segments gives 1000 worlds/1000 steps. These counters prove no additional replay work in those cases and make no timing claim. Raw controls are retained under ignored tmp/engine-feedback while acceptance is open.

The eleven-step full gate, actual build/pack and remote matrix/publish-dist have not run for M1. Root holds the shared heavy slot and a separate distribution boundary while AoE2 verifies against engine 2.4.2. M1 is private and uncommitted, with no main merge/push or downstream adoption claim.

## Round outcome

Bounded implementation review passed with no material findings. Full local gates and final integrated acceptance remain required before any code commit. Main/release must wait for root's explicit distribution release even after local acceptance.