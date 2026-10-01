# Review 1: integration

## Target

Committed d7f9003de92cb03e35f878d0674943f4164321e0 against a839ad5e5b435f36e7494b86ff63606573a10e47. The full 28-file patch is 133112 bytes, SHA256 ba31e8eff352ba7d0ac261bf99b9cbc1229b870ad4e1aa8b3744d22c16f73795. Source commit e6ac46c2f8d7a307cc932f955bdd91a9286ba88c retains all 21 blobs from review 0; d7f9003 adds only four status/recovery documents. Seven authored document paths outside review 0 were independently inspected. This report's original UTF-8 bytes have SHA256 e7c04ca9cfca3a9bfb7e1dab5983765aa805bbc33f8472b686629796014bfb80 and remain verbatim below. Git recovers the committed target.

## Reviewers and coverage

Codex CLI 0.158.0, gpt-6-astra, xhigh, ephemeral read-only sandbox, bounded foreground review with actual exit 0. Fresh public-repository and matching-origin evidence preceded the launch. No delegated/background reviews, tests, builds, installs, network requests, edits or Git mutations were authorized. Source citations outside changed hunks include session-bundle.ts:163 and session-replayer.ts:364. The task-owned process query was empty after completion; the single external Codex slot was released. Owner gate evidence was inspected, not independently rerun.

## Reports

### Codex gpt-6-astra xhigh
**PASS for the bounded final M1 integration. No P1/P2 defect or required integration repair found.** One non-blocking documentation inconsistency is noted below.

Reviewed `d7f9003de92cb03e35f878d0674943f4164321e0` against `a839ad5e5b435f36e7494b86ff63606573a10e47`.

Independent read-only findings:

- **Target recovery is sound.** The actual 28-file committed diff matches the supplied 133,112-byte patch and SHA256 `ba31e8eff352ba7d0ac261bf99b9cbc1229b870ad4e1aa8b3744d22c16f73795`. Both original packet bindings match; all 21 M1 blobs remain unchanged. The final follow-up changes only the four stated document paths. HEAD matches, the working tree is clean, and origin matches the named repository.
- **Coverage matches completed comparisons.** Ranges are recorded after segment replay returns; failure skips, horizon filtering, continuity enforcement and early stopping occur in the correct order. `ok` remains divergence-only. See [session-replayer.ts:286](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/src/session-replayer.ts:286). The census keeps empty, no-payload, no-segment, all-disabled and all-skipped outcomes incomplete and identifies remaining intervals explicitly. See [session-self-check-coverage.ts:13](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/src/session-self-check-coverage.ts:13).
- **Existing lifecycle bounds remain intact.** Outside the diff hunks, I read the unchanged [replay horizon helper:163](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/src/session-bundle.ts:163) and [comparison loop:364](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/src/session-replayer.ts:364): events/executions compare per transition, state compares only at endpoints, and execution-listener removal remains in `finally`. The change adds no tail replay or snapshot reticking.
- **Compatibility is coherent.** Coverage remains optional on the public type and appears on every successful return. Both curated barrels, surface fixtures, literal contract tests, 2.5.0 stamps, guide, changelog and defect record agree. See [result type:96](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/src/session-replayer-types.ts:96), [contract tests:65](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/tests/session-self-check-coverage.test.ts:65) and [consumer guidance:169](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/guides/session-recording.md:169).

I independently inspected all seven added authored records:

- [Detailed devlog:19](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/devlog/detailed/2026-10-01_2026-10-01.md:19) and [summary:3](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/devlog/summary.md:3) distinguish private M1 from shipped M0.
- [Work 71 ledger:53](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/work/71_engine-feedback/plan.md:53) contains exactly E01–E23, retaining ownership and acceptance dependencies. E16’s reconciliation is present in the [current game packet](C:/Users/38909/Documents/github/aoe2-worktrees/parity-integration-0930/docs/engine-feedback/past.md:6). M4–M8 remain open.
- [Design:77](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/work/71_engine-feedback/design.md:77) keeps M2/M3 and bounded M9 proposals outside this implementation.
- [Work 72 outcome:40](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/work/72_self-check-coverage/plan.md:40), [review recovery:37](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/work/72_self-check-coverage/reviews/0_implementation.md:37) and [registry:1689](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/work/registry.json:1689) identify the private work correctly. The original substantive reviewer report is preserved verbatim.

**Non-blocking status nit:** [design.md:76](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/docs/work/71_engine-feedback/design.md:76) still says full gates await release of resources. That sentence is stale; work 72’s outcome and appended verification correctly record their completion. This does not undermine target recovery or imply M1 shipment.

Owner execution evidence inspected—not independently rerun—supports the 16 initial failures, 167 focused passes, five RED controls, equal replay-work counts and [all eleven gate steps](C:/Users/38909/Documents/github/civ-engine-worktrees/engine-feedback-1001/tmp/engine-feedback/m1/attempt-1/job.stdout.log:117). The accepted MCP Hono moderate remains explicit.

I independently confirmed primary HEAD/package/ENGINE_VERSION remain at M0/2.4.2, all 372 distribution hashes match the retained adoption manifest, and the retained tarball hash matches. **M1 main merge, push, remote matrix, distribution and adoption remain deferred.** No tests, builds, installs, network requests, edits, Git mutations or delegated/background reviews were performed.

## Findings and disposition

PASS with no P1/P2 or required repair. The nonblocking work-71 design status sentence still claimed full gates awaited resources. The owner corrected only that sentence to the already recorded actual local-gate outcome; source, API, tests and execution evidence stay unchanged. This correction follows the report directly and does not invalidate its source verdict.

## Verification

The actual eleven-step local gate passed on the exact reviewed executable target: 1477 root tests plus one todo, 22 MCP tests, typecheck/lint/build/pack and benchmark checks. JobObject cleanup proved zero owned leftovers. Core audits are clear; the accepted MCP Hono moderate remains. Five RED controls and literal work-count bounds are retained in review 0. The final reviewer independently confirmed all 372 primary 2.4.2 distribution hashes, tarball identity and original source preservation. Applicable document validation and committed-source bindings accompany this report; no runtime rerun is required for this report and one status correction.

## Round outcome

Exact committed integration review passed. Main merge/push, remote matrix/publish-dist and downstream adoption are separate acceptance steps. Root confirmed all seven game remote fetches used 2.4.2 and released that distribution boundary on 2026-10-01; this record does not claim M1 shipped before those steps finish.
