# Review 1: design

## Target

Repository: civ-engine. Worktree: C:/Users/38909/Documents/github/civ-engine-worktrees/incremental-visibility-1107. Base and worktree HEAD: `22f3e19746cd50da264aaba259856d625b833e2a`. This round records an independent static mechanism investigation against the fixed dense-cost contract and the current uncommitted direct candidate. It does not review the final design hypothesis or accept the implementation.

The fixed assignment brief is `tmp/visibility-incremental-1107/search/fixed-contract.md`, SHA256 `0df1747b557939fd1059148b2a4917fb19aa7c7ede82fe76f28a34cd00191ada`. The inputs, real calls, iterations, baseline, counters, strategy thresholds, state parity and precommitted held-outs remain fixed.

| Reviewed source | SHA256 |
|---|---|
| `src/visibility-coverage.ts` | `09471c92224443411746a0b5d1864c210914381782cd0a7a30d5b7f422a974bd` |
| `src/visibility-map.ts` | `2d4a34cf918360bb61ba7100261443079bcad79b8ea11010c2c39c1a849aacf6` |
| `src/visibility-order.ts` | `aa42ee89a6167423c5b62f5b111ad2acf78c866b13f808ea9c7659cac101893e` |
| `tmp/visibility-incremental-1107/baseline-22f3e197/src/visibility-map.ts` | `5dfab3b1491b73720968c416128d055262514a17bac7bdf08fa1224c694363fd` |

The baseline source is recoverable from the named base commit. Original hybrid source is retained through `tmp/visibility-incremental-1107/search/hybrid-pre-search/manifest.json`; the reviewed direct candidate runtime graph and source hashes are recorded in `tmp/visibility-incremental-1107/module-builds.json`. No preserved source patch was found by the scoped `.patch`/`.diff` filename search under that evidence directory. The uncommitted direct TypeScript source therefore still needs owner binding to a recoverable committed revision or retained patch before it can be overwritten or cleaned; a hash and transpiled graph alone do not recover all authored TypeScript bytes. This report creates no additional snapshot or patch outside its assigned path.

The recorded result and instrument targets below were read, not rerun. Paths are relative to `tmp/visibility-incremental-1107/`.

| Evidence target | SHA256 |
|---|---|
| `module-builds.json` | `d1c45fd716ce4f20435274d9a8f38da25af9f20b03d23a79163e15aeda91b45d` |
| `hybrid-dense-confirm-summary.json` | `53e8d3f943a9a1e41bcfb3f5fda56c8b46e44ffb598113b7261949d3f698f612` |
| `direct-reproduction-summary.json` | `78a7f17d5894196ce0c23110721c04edc04a187d668d407761951691029b50ae` |
| `measure-direct/direct-dense-1024-0-candidate-direct.json` | `3c7ac5dbe3ebec86ef5ea83237646d0f569cfa2363d5f05fa24098de41a75e99` |
| `direct-replay-proof.json` | `caacbfaa78b97f830d62098c7a18903a92507d6adb6f1d295274d0d8ede60c1f` |
| `workloads.mjs` | `5319e82e050eb7f1f4576de7b5ef47e0a9f3e6e34213a5b57052277c1667e0f4` |
| `measure-batch.mjs` | `595b08ba32cfad8efdc039fb4a7203b2ab6c8464e66ddfd6ea3e60c9f7f837d1` |

## Reviewers and coverage

Reviewer: Codex task `/root/visibility_mechanism`, independently assigned a bounded mechanism investigation by the hard-problem search. The original investigation was read-only and used the fixed brief, raw source, test contracts and existing receipts. The reviewer read the coordinator Delegate section, the hard-problem instructions, repository instructions, session-start documents and relevant source. The reviewer did not read the final design hypothesis paragraph, receive the implementer's preferred route, delegate further, change source, or launch tests, installs, builds, benchmark/runtime processes or browsers. Independence here describes this bounded static investigation; it is not a pinned multi-CLI implementation review or performance acceptance.

The subsequently authorized action is limited to retaining this authored report as `docs/work/85_incremental-visibility/reviews/1_design.md`. Runtime and final implementation coverage are absent. The full substantive authored report follows; its closing resource statement describes the state at the end of the original read-only investigation, before this report file was requested.

## Reports

### Codex /root/visibility_mechanism

A distinct mechanism worth a bounded probe is **cell stamps that suppress duplicate `Set.add` calls during dense union construction**. It preserves the raster loops, counters, sparse index, and fixed strategy thresholds. It is statically supported, but unimplemented and unmeasured.

The source boundary is [visibility-coverage.ts:44](../../../../src/visibility-coverage.ts): every accepted raster hit currently calls `visible.add`, including repeated hits on the same cell. At line 112, retain the inclusive 50% decision and two-effective-sparse-batch recovery exactly.

The proposed branch:

- Allocate a bounded `Uint32Array` lazily on entering the direct-union path. Each entry holds the union generation that last visited its cell.
- Increment the generation for each direct union. After the existing inclusive circle predicate accepts a cell, insert it into `visible` only when its stamp differs; then write the current stamp.
- Preserve all existing candidate-cell tests and counter increments. `sourceRasterizations` and `rasterizedCells` remain unchanged. Stamps represent union membership, not coverage counts; direct unions still perform zero coverage-count increments/decrements.
- Leave `applyIndexedChanges`, exploration processing, serialization, and setters unchanged for the first probe. This isolates one mechanism.
- Keep the current direct union as the fallback for dimensions outside the explicit scratch-memory bound. The constructor currently accepts any positive integer dimensions, so unconditional `width * height` allocation would change supported behavior.
- On generation wrap, clear the stamp array before reusing generation 1. Dense → indexed → dense transitions remain safe because each union receives a new generation.

The fixed reproduction gives this a concrete opportunity, without establishing speed. [workloads.mjs:26](../../../../tmp/visibility-incremental-1107/workloads.mjs) constructs 1,024 sources from coordinates modulo 128: there are 128 distinct positions repeated eight times, and the common translation preserves those repetitions. The current direct candidate therefore performs redundant union insertions even before overlap between neighboring circles. The precommitted unique-position held-outs are essential; success confined to duplicated circles would be insufficient.

Existing measurements still show failure: the direct candidate's five wall ratios are **1.115, 1.083, 1.125, 1.106, 1.092**. Its first [raw receipt](../../../../tmp/visibility-incremental-1107/measure-direct/direct-dense-1024-0-candidate-direct.json) records 60 recomputes, 218,471 produced visible cells, 61,440 source rasterizations, 2,931,528 tested candidate cells, and zero coverage-count writes. These numbers support the remaining regression, not a performance claim for stamps.

The discriminating probe should change only this union-membership operation, then:

1. Require unchanged per-checkpoint state, original metrics, and five work counters against the current direct candidate across all 35 workloads.
2. Instrument union insertions separately in an untimed diagnostic run. The proposed branch should perform exactly one insertion per resulting visible cell, while retaining every raster test. Do not use this instrumented run for timing.
3. Run the unchanged five alternating fresh-process pairs, eight maps per interval, against the frozen baseline.
4. Run both already-fixed held-outs plus actual/sparse preservation checks. Keep allocation on first dense entry inside the measured replay; report initial-load and retained-memory costs separately.
5. Exercise consecutive dense batches, dense → sparse → indexed → dense, clear/recreate, multiple players, fractional centers, clipped edges, and the bounded-allocation fallback.

Unresolved risks are explicit: extra typed-array reads and branches could cost more than avoided `Set.add` calls; low-overlap workloads may regress; retained scratch costs `4 × width × height` bytes per allocated array; the bound must be chosen before measurements rather than fitted to 1,024 sources; and a per-player array multiplies memory with player count. A per-map shared scratch array could reduce that multiplicity because updates are sequential, but should be a separate refinement after the isolated probe.

I verified the supplied contract SHA and current source hashes against the recorded direct candidate. I did not read the final design hypothesis, edit files, or launch tests, builds, browsers, or runtime measurements. No task-owned artifacts or processes remain.

## Findings and disposition

The following IDs label this round's findings; round 0 contained no numbered finding. Owner dispositions have not been supplied. The reviewer records unresolved follow-ups and does not invent owner acceptance or approval.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The recorded direct candidate still has a systematic dense wall-time regression across all five fixed pairs. | Unresolved; the raw ratios remain above 1 in each pair. This is counterevidence to acceptance, not proof of impossibility. | Retain the fixed reproduction and compare any selected new mechanism against the frozen baseline. |
| F1 | Repeated accepted raster hits currently perform redundant union insertions; cell stamps offer a distinct data-structure mechanism. | Unresolved proposal; static code and fixture geometry support the opportunity, but neither correctness nor speed of the proposed implementation has been measured. | Isolated probe, per-checkpoint parity, literal counter checks, fixed timing and both precommitted held-outs. |
| F2 | Unbounded scratch allocation or a fitted representation bound could change supported behavior or hide costs. | Unresolved design risk; positive integer dimensions are not constrained to a typed-array-friendly area, and dense source churn does not imply dense spatial coverage. | Precommit a memory bound and fallback; include first allocation, transitions, multiple players and retained memory in verification. |
| F3 | Exact direct TypeScript source is uncommitted and no retained patch was located in the scoped evidence directory. | Unresolved provenance limit; recorded hashes and transpiled runtime bytes do not alone recover the authored source. | Owner binds the reviewed source to a recoverable committed revision or retained patch before overwriting or cleanup. |

## Verification

Actually performed: source and test-file reads; comparison of the baseline, preserved hybrid and current direct mechanisms; inspection of existing JSON receipts and the 35 recorded replay result names; reading of the actual benchmark timing boundaries and workload construction; SHA256 verification of the brief, named sources and evidence files; and read-only verification that HEAD is `22f3e19746cd50da264aaba259856d625b833e2a`. Reading the direct result summary does not independently rerun its measurements. The measured direct scope is Node v24.22.1, eight preconstructed maps per timed interval and five fixed alternating pairs; the source graph records TypeScript 5.9.3.

Contract tests inspected include `tests/visibility-strategy.test.ts` SHA256 `e8ad14bd04aef4799fb908cbd10e7e86252a5ef4e980caafd812faee33b3a38b`, `tests/visibility-incremental.test.ts` SHA256 `0a0c609d504c7d2af6f954d091044e8ab74f85d23cb62a761e50d0f1746b71bc`, `tests/visibility-order.test.ts` SHA256 `a7590e5db846a1a61a078267e746e0815b155e5539870913b07d97e0019e40dd`, `tests/visibility-continuous.test.ts` SHA256 `b5b70d165f08485cd2ebc2d27263bcb5b408e8eb090e2405056499cf4ea2cbfa`, and `tests/visibility-incremental-oracle.test.ts` SHA256 `c0ea391f8b993b5231fd65d2f908118420b85f36c25003968001449c04b2f398`. These pin real numeric coverage writes, strategy transitions, fractional geometry, canonical output, copy isolation and the independent final-source oracle.

Not performed: implementation, tests, builds, installs, benchmarks, held-out runtime checks, memory measurements, work-document checker, multi-CLI review, full gates or delivery. No source/index/runtime edit was authorized or made by this reviewer. Only this authored review record was created after the static investigation.

## Round outcome

A distinct, statically grounded cell-stamp mechanism and a discriminating probe are retained. The mechanism is **unimplemented and unmeasured**. The existing direct candidate still fails the recorded fixed dense performance requirement. This round grants no implementation, performance, release or final acceptance; it supplies evidence and risks for the owner to select the next bounded experiment. The selected route, actual runtime outcomes, source recoverability binding and owner dispositions remain separate follow-up work.