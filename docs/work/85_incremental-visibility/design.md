# Fractional visibility contract and rejected optimization evidence

## Current decision

Ship only the approved fractional source-center contract on the existing algorithm. Root accepted the exact decision proposal, preserved as [snapshots/1_fraction-only-decision-proposal.md](snapshots/1_fraction-only-decision-proposal.md), SHA256 4F459D26DB84C757516E9EE8B2D76F43E7D2773120DE7CBFF3CA2D48842CDF01. The original owner-approved proposal explicitly separates the incremental algorithm from this compatibility change. Root's actual acceptance is retained in reviews/2_plan.md; it is coordinator disposition, not independent implementation review.

## Public behavior

Source x/y must be finite and lie within 0 <= x < width and 0 <= y < height. Radius remains finite and nonnegative. Integer grid cells satisfy the existing inclusive circle equation (cellX-x)^2 + (cellY-y)^2 <= radius^2, without source rounding or a half-cell offset. A zero-radius fractional source can therefore reveal no cells. setSource copies only x/y/radius; fromState preserves the prior copied extra-field behavior and duplicate handling.

Nonfinite source coordinates report visibility_source_coords_invalid before bounds/radius validation. Finite out-of-bounds values report visibility_out_of_bounds; valid fractional coordinates reach the unchanged radius check. Point queries retain integer validation, existing error codes and absent-player short-circuiting. No new state field is introduced. Existing integer states/outputs remain identical; fractional source values require a supporting reader and are rejected by older integer-only readers.

Edits remain batched. A move/revert or add/remove before an updating read never explores intermediate geometry. Existing recomputes/computedCells/visibilityQueries semantics, resets, deterministic source/player/explored order and copy isolation remain unchanged. No getWorkMetrics or new public type is added.

## Source boundary and proof

At base 8c774d692957ab91b16d894d954b79dd398ff2c0, only src/visibility-map.ts changes: two assertGridPoint calls become assertSourcePoint, and the private finite/bounds helper is inserted. The integer query helper, complete raster/update/order implementation and all remaining source bytes are unchanged; the retained compiler checks the exact inverse against the shipped preimage. No visibility-coverage or visibility-order optimizer module is copied into the fresh tree.

The extracted 20 cases first failed 17 contracts on unchanged shipped source. The candidate passed 66 focused tests in nine files, types and affected lint. Five deliberate controls independently round setter centers, round restored centers, bypass finite checking, bypass source bounds or admit fractional queries; each fails an assertion and restores exact source bytes. The fourth selector initially matched both bounds helpers and stopped before mutation; that setup diagnostic is retained, and the corrected remaining two controls passed their rejection proof.

Six untimed workloads compare the private shipped and fractional modules. Four captured actual unit-layer windows each cover 120 successful ticks; synthetic sparse and dense integer controls add 60 boundaries each. All 600 states/old-metric boundaries and actual captured returns match. Both arms use identical observation boundaries; observer getState/metrics reads add no sort or flush. This is compatibility evidence, not renewed optimization timing or whole-game performance evidence.

## Why the optimization is not shipping

Five real repairs exhausted the accepted limit without satisfying the fixed no-systematic-dense-regression criterion. Correctness and actual-window gains do not erase that failure. The complete earlier design, acceptance definitions, measured tradeoffs and proposals are preserved at [snapshots/1_rejected-optimization-design.md](snapshots/1_rejected-optimization-design.md), SHA256 23D0B323B77AD3532C2434891D43B8EBB51DA859A3C1E6B914C47D938A16CD76.

| Attempt | Mechanism | Rejection evidence |
|---|---|---|
| 1 | Sparse coverage counts | Dense71/1024 median wall 1.335x/2.080x |
| 2 | 50% direct union and two-sparse reindex | Dense1024 median wall 1.162x |
| 3 | Dense wrapper reuse and local visit counts | Dense1024 median wall 1.106x |
| 4 | Bounded 1MiB union stamps | Mixed75%-1024-radius1 wall 1.152x and CPU losses |
| 5 | Indexed record reuse, changed-only dense bookkeeping and final-candidate lookup removal | Remaining mixed75% wall regression and mixed25% CPU cost |

Final attempt5 matched states/old/five-work counters at 2,760 boundaries across 42 workloads, and passed 114 focused tests plus 22 restored controls. Its mixed75%-1024-radius1 median wall totals were 94.451 to 100.249ms per eight maps and 60 batches; the median paired increase was 5.446ms, roughly 6%, with all five pairs slower. Mixed25% improved wall but retained median paired CPU +31ms/1.40x, with four increases; short CPU intervals are quantized. Four actual windows improved median wall roughly 11–24%, without a whole-game claim.

Retained-memory costs include about 719kB extra per sparse map, 313/499kB in actual120/168 cases, and 2.91MB in the new257-source mixed-radius25% case. Initial-load and unchanged-read costs remain in raw results. Heap, arrayBuffers and peak RSS remain separately reported. No failed workload, outlier or threshold was removed after inspection. No sixth optimization is implemented or implicitly authorized by the fraction-only work.

## Retention and boundaries

Ignored tmp/fractional-visibility-1107/rejected-research preserves the complete old experiment evidence except disposable process-temp caches, with per-file source/copy hashes in rejected-research-manifest.json. It includes all five source/compiler arms, original matrices, diagnostic profiles, held-out precommits, captures/control receipts, failed setup runs and exact preimages. The original incremental-visibility-1107 tree remains untouched until root verifies the retained inventory and authorizes cleanup.

The separate 46-file final rejected snapshot is copied at rejected-attempt5; its manifest SHA256 is 4BCC6CEA8DC325D4C07FC1CA5F01B14B9400DAAD0891C450E666D4C2AFB0822B. Final timing, memory and runtime summaries are also copied beside it. Attempt5 ended with 472 native jobs, one intended RED, 995 observed owned process instances and no leftovers. No final implementation/performance acceptance or publication is claimed for that candidate. Its proposed2.11 metadata is historical and must not be published.

Root reserves the fraction-only minor after independent work87, currently planned as2.13.0. No version files, registry, central tracker or devlog edits are included in this review candidate. Independent source review, content/full gates, publication/runtime verification and consumer adoption remain separate acceptance steps.
