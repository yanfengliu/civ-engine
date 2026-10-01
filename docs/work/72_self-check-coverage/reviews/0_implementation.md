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
## Target recovery after private commit, 2026-10-01

The owner bound the unchanged 21 reviewed files to private commit e6ac46c2f8d7a307cc932f955bdd91a9286ba88c. Every committed Git blob and SHA256 matches its pre-commit review-entry manifest. The committed diff from base a839ad5e5b435f36e7494b86ff63606573a10e47 restricted to these 21 paths is byte-identical to the preserved 53,242-byte review patch, SHA256 1b350e9f58622bd204ffb8a0af1007e83b4e2862e4217e375ce87b636d95c30f. The authored reviewer report above is unchanged. Seven extra commit paths are only work registry/plans/review and devlog records; their exact paths are recorded in the ignored commit-binding.json while the release is held. This is owner recovery evidence, not a new independent review.

| Reviewed path | Committed Git blob |
|---|---|
| README.md | d962877f9f0083769a027f18ae3037a507d1b076 |
| docs/api-reference.md | ff8a98cf731df57c5f151f85c8a9e66790890c28 |
| docs/architecture/ARCHITECTURE.md | b00b217c0edf489560a8fa9162b5e4a74b54bfdb |
| docs/architecture/decisions.md | 875923a18bd9ac73c503bfca5f93b42f849259fd |
| docs/architecture/drift-log.md | dd617615fa78031f1df876f797af514ab7d2cf60 |
| docs/changelog.md | 784b9c919f01de4fd082aed13f1dc00bd31e6524 |
| docs/guides/session-recording.md | d8038e1fed2b4c9d4b14a557794c718dffc2009a |
| docs/learning/defect-register.md | e79bff548c1d9dadd9ef9dec6803ebe9c587925b |
| mcp/package-lock.json | 7a616fbdb730b7fa52badeb5eb20f820d39699b9 |
| package-lock.json | ab84dd9dc66590a5f2a688ec7364d06be1a8cca8 |
| package.json | bd8802e248151a88c0f469dfec6cc21125956504 |
| src/index.browser.ts | 27547eddce5999899173881a25d8761e9c028c36 |
| src/index.ts | 943447f95f48d6e99eb3607e40674ccb0488731f |
| src/session-continuity.ts | 962b40bc10350e31245b3cc429d4cfc1d55500f5 |
| src/session-replayer-types.ts | ccdfbf7942b05cfbd62287ad55dacf81a6fa40f4 |
| src/session-replayer.ts | 1c4eb5ea949615014362c08be66dfe49966b9122 |
| src/session-self-check-coverage.ts | 36464dd32869046d820f55bcc0b7a4e9bd688efc |
| src/version.ts | a522d4e002d789bf117bfc040d7953c32e068e6c |
| tests/fixtures/public-surface-members.json | 2755acd4fc2c3a48ff93d42a689900b482dd4ae7 |
| tests/fixtures/public-surface.json | 8748c9e8ef3998fc34bcd2b2e2423bb7f061644a |
| tests/session-self-check-coverage.test.ts | 85bb42ff6cf8943055c167129db4fa57210923d1 |

Subsequent owner verification: all eleven npm run gates steps exited 0, with 1477 root tests plus one todo and 22 MCP tests. Build/pack, typecheck/lint and exact benchmark counters/time bounds passed. Core full/production audits have no findings; MCP retains Hono moderate. Gate attempt 1 took 58.091 seconds and owned JobObject cleanup passed with zero leftovers. The private commit does not count as main/release acceptance; root still holds that boundary.
