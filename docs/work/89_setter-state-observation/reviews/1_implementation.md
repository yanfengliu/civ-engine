# Review 1: implementation

## Target

Completed game160 CPU screen, preparation 533E334F06BB9D07DE8FB8C39483F8E2D7E7457D2A18293A1D0D43C64FA14FB5. Exact report and recoverable binding are retained under civ-engine/tmp/fog-screen-result-review-1108.

## Reviewers and coverage

The independent native reviewer and exact coverage are attributed in the complete report below. External CLI coverage was unavailable; it is not inferred. The integration owner added this structural wrapper on 2026-11-08; authored report bytes are unchanged, SHA256 78210b859e6b75ed321807945d093e877c4b813bccdab0c2e4831324ca86f0b6.

## Reports

# Work160 completed CPU-screen rejection: independent acceptance review

**Accept the completed rejection.** The retained results satisfy the fixed 24-pair census and parity/operational checks, but fail the preregistered CPU acceptance rule. Late168 treatment pair 2 has selected/default CPU ratio **1.0102426931106472**, violating the requirement that every late treatment ratio be below one. Its favorable median and wall results cannot override that requirement. No exclusion, retry, post-screen experiment or relaxed threshold is warranted. This supports root's rejection of the conditional engine89 contract shipment and game160 adoption; it is not a claim that the candidate can never help any workload.

Reviewed by `/root/record_evidence_join`, independent native Astra/xhigh lane, 2026-11-08. Exact target: `C:/Users/38909/Documents/github/aoe2-worktrees/fog-state-observation-1108/tmp/fog-state-observation-1108/cost`. Preparation manifest SHA256 independently matches `533E334F06BB9D07DE8FB8C39483F8E2D7E7457D2A18293A1D0D43C64FA14FB5`. References below are relative to that folder unless otherwise stated. No candidate edit, application import/execution, test, clock probe, build, browser, lock, process census, Git mutation, exclusion or rerun was performed.

## Independent reconciliation

I read the fixed matrix/arithmetic and timing sources, the prior `civ-engine/tmp/fog-adoption-review-1108/cost-review.md`, each of the 24 original pair results/partial-row receipts/native exit/start receipts, the completed aggregate receipt and final ownership receipts. All eight current harness files and all five actual exported `scripts/aiTickAb.mjs` copies independently match the preparation manifest's sizes/hashes. I did not repeat the earlier review's entire 17,669-file source/dependency census or interpret those hashes as whole-tree runtime correctness. The source's per-child binding checks and retained successful exits are distinct execution evidence.

Independent host arithmetic over the retained JSON found **zero discrepancies** in the fixed group/pair/order census, semantic baseline/candidate orientation, chunk sizes/counts, ticks per arm, declared warmup exclusions, retained CPU/wall sums, reported pair ratios or all six aggregate CPU/wall results. Each original pair result agrees with its copy in the final screen receipt; its raw rows also agree with the separately retained partial receipt. All direct child exit receipts report native 0 with no timeout/signal and match their start/result PIDs. The final receipt has `completed:true`, exactly 24 children/results and `excludedPairs:[]`.

The first four groups each sample 1,000 ticks in five 200-tick chunks after one settle tick. The fixed first chunk is excluded, leaving **800 retained ticks per arm**. Idle/write-heavy each sample 256 in four 64-tick chunks and retain **192 per arm**. Construction, settle and first-chunk exclusions were fixed before the screen, not selected after observing a ratio. All sampled chunks report their full successful step count. Retained totals, not median chunk ratios, determine the pair ratio (`pair.mjs:120-123`).

The maintained `runInterleaved` stores each measured arm in its original label index even while alternating execution order (`exports-2/candidate/S0/scripts/aiTickAb.mjs:80-98`). `pair.mjs` maps semantic baseline/candidate names back to those indexes. In the decisive late168 AB2 pair, declared order is `[S0,D0]`, so retained selected CPU chunks are **4313 + 4015 + 3328 + 3829 = 15485 ms** and default chunks are **4218 + 3907 + 3469 + 3734 = 15328 ms**. Division is selected/default, not an accidental reversal: 15485/15328 = 1.0102426931106472. Both denominators represent 800 successful retained ticks. Its wall totals are selected 14422.95989999175 ms / default 14875.482799999416 ms = 0.9695792798061195; wall is separately reported and does not replace CPU.

## Fixed-rule outcome

`matrix.mjs:23-37` requires each selected late median <=0.95, improvement in negative log-median strictly above abs(log(A/A ratio)), and all three treatment ratios <1. The actual approved game plan's lines 44-50 specify the same sums, orientation, median, noise and all-signs rule before execution. Controls use log(median)<=max(log(1.05), A/A log-noise). One A/A pair is the accepted observed noise envelope, not a statistical confidence interval.

| Group | Three treatment CPU ratios, in fixed order | CPU median | CPU disposition | Wall median |
| --- | --- | ---: | --- | ---: |
| late120 | 0.883506198, 0.901269759, 0.936004231 | 0.901269759 | Pass | 0.897020025 |
| late168 | 0.907324010, **1.010242693**, 0.907821229 | 0.907821229 | **Fail: one non-improving sign** | 0.924710602 |
| default120 | 0.947524752, 1.028145483, 0.951452952 | 0.951452952 | Pass control bound | 0.963583408 |
| default168 | 1.018154509, 1.041278808, 1.025004772 | 1.025004772 | Pass control bound | 1.030140454 |
| idle | 0.619047619, 0.688172043, 0.676258993 | 0.676258993 | Pass control bound | 0.969795300 |
| write-heavy | 1.319148936, 0.752000000, 0.494680851 | 0.752000000 | Pass control bound | 0.988767101 |

Late120's A/A ratio is 1.0657734470158344, log-noise 0.06370077690518629. Late168's is 0.982775494225876, log-noise 0.017374573296092422. Both late medians clear their 5% and noise conditions; late168 fails specifically the all-signs condition. The control rule does not impose that same all-three-improve condition, so an individual control ratio above one is correctly retained without changing its group rule. Every wall aggregate passes its own fixed formula. The independently reconstructed final CPU result is false, matching `screen-1/receipt.json`; its `nativePlannedExit:2` agrees with launcher `nativeExitCode:2` and wrapper exit 2. This is a completed negative experiment, not native/setup failure.

## Parity, load and unproved claims

All **112 sampled chunk boundaries** retain two identical digests and matching checkpoint ticks; all checkpoint digest arrays agree with their underlying raw rows. These digests are supplementary. Actual source `pair.mjs:16-20,63,103-111` compares the complete original live serialized World and complete economy/match/last-diff objects in memory at settle and every chunk, outside timing, with no projection or JSON-readback oracle. Native-success receipts therefore support those executed comparison boundaries. They do not prove every intervening tick's events/submissions/executions or the separate complete recording/replay/fork/save-load contracts. Constructed/settled/final JSON captures are ordinary diagnostics and were not parsed or promoted into lossless JavaScript-value oracles by this review.

The four write-heavy results each retain two separate post-timing premise receipts, each with 257 actual published ticks, last tick 257 and 257 writes. Those source checks exercise real fog publication after every settle-plus-sample tick in fresh untimed worlds. Their cost contributes to whole-child lifetime/RSS, not retained sample CPU. This is distinct from full stream/replay acceptance and does not justify extending the experiment after rejection.

Foreign-work estimates are retained without filtering. Across retained chunks their reported ranges are late120 1.1283-5.3191 cores, late168 1.3396-3.6021, default120 1.0228-5.4787, default168 1.3364-4.4151, idle -0.0547-6.5279 and write-heavy -0.9731-9.9434. The tool estimates machine busy cores minus this process's CPU/wall ratio; negative values and noisy small samples demonstrate estimator limits, not negative actual workload. No claim of an idle or isolated whole machine follows from root's exclusive task lane. These observations provide context but the plan forbids dropping an unfavorable pair on that basis.

Idle retained CPU totals are only 64-140 ms per arm across its four pairs; write-heavy totals are 93-188 ms, with treatment ratios spanning approximately 0.495-1.319. Their formal control passes are not robust measured speedup claims. Process CPU includes the shared pair child's threads and fixture work; it is not attribution to validation, cloning, state scanning or one selected API. Whole-child maxRSS includes construction, output, comparisons and untimed premises; it establishes neither retained heap savings nor absence of unexplained memory regression. No profile, heap/GC or full recording correctness acceptance was completed by this screen, and none is needed to preserve its decisive preregistered rejection.

## Completion and retained evidence

The screen finished at 22:42:23.737 UTC, with launcher native exit 2 at 22:42:23.751. The wrapper's retained cleanup receipt reports no timeout/failure and zero remaining observed owned processes at 22:42:24.6442449. Root's receipt records its exact owner and preparation identity, native wrapper exit 2, no failure, zero remaining, and lock release at **22:42:25.1599752 UTC**. These are observed receipt claims; this review launched no new live census. The periodic PID/creation-time ownership method explicitly does not claim to have captured every short-lived process.

`binding.json` retains recoverable exact bytes for the inspected harness, timing helper, original result/partial/native/start receipts, aggregate and cleanup receipts, prior review and plan, plus their hashes and this review's independent arithmetic. The 3.6 MB preparation inventory remains separately hash-bound at its original path; full source/dependency/world captures were not copied or revalidated here. No evidence was excluded or rewritten. Only this authored report and its binding are intentionally retained in the assigned review folder. Root owns rejection records, source preservation and cleanup. No further runtime or new minor release follows from this review.


## Findings and disposition

No material discrepancy. Root accepts the fixed-rule rejection: the late168 treatment ratio 1.010242693 fails the required consistent sign. No rerun, exclusion, threshold change, post-screen stage or API adoption is authorized by this result.

## Verification

Independent reconciliation covered all24 successful native pairs,112 matching chunk boundaries, original sums/denominators, fixed rules and ownership receipts; no runtime was repeated.

## Round outcome

Reject the conditional engine89/game160 shipment and retain the experiment and its limits.
