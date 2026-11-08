# Empty component diff experiment — rejected for shipment

The five-line internal guard is compatible in the inspected contracts and eliminates the expected empty result containers. It does not establish useful representative cost benefit. Root rejects shipment under the plan's predeclared small/noisy-benefit criterion; independent source/evidence review agrees. No engine release, public API, default behavior or consumer pin changes result from this experiment.

## Executed scope and identity

The actual retained engine2.13.0 archive at ca5e15a is A; candidate staged tree f43ef62dd9a4532b9babec2c9aa10c449630ddf3 is B. The exact rejected patch, source/test files and input identities are retained under ignored tmp/empty-component-diffs/rejected-candidate; final cleanup will retain this directory in primary tmp/work88-closure/evidence/rejected-candidate. Only seven built runtime/declaration/map files differ, all in the two edited modules. Manifest efc5871f47972f5f5d46f7eb7cccda84f7f862458ed40260565436127bd479d4 binds both complete package inventories, source/scripts and saved inputs. Raw evidence is retained under ignored tmp/empty-component-diffs/measurement until final retention/cleanup. Summary SHA256 01aa26c6558430aca937e386c9ba5786b3b4221ab4a479e8fd3df0aed8d592ac.

All54 native children completed with exit0 in145.489seconds on Node24.22.1. The owned process watcher observed103 identities, stopped0 and retained0; a fresh task-path census was empty before the exact root lock was released at2026-11-08T19:46:44.9875810Z. This is an observed census, not exhaustive observation of every short-lived process.

Nine workloads cover64 synthetic stores and two actual schema2/tick24000 saved inputs:120 has11 component types/48,311 rows/41 state keys,168 has11/95,222/41. These are isolated engine publication workloads with no game systems or commands, not full-game timings. Clean/sparse/dense cases use zero/one/two listeners and dense has an ordinary MemorySink recorder. A sparse or dense system writes existing component values through the normal setter.

Each workload has one A/A and five fresh-child A/B comparisons, with alternating arm order inside each child. Saved inputs warm200 ticks/arm then sample six40-tick chunks; synthetic clean/sparse warm5000 and sample six5000-tick chunks, dense warm500 and sample six500-tick chunks. Only the first timed chunk is excluded from ratios. Full diff/events/nontiming metrics/listener observations match after all six chunks; full serialization matches after warmup and sampling. Dense recorder tick records match except duration metrics. Both arms also match after the separate ten-tick instrumentation. All final state digests agree across repetitions.

## Results

Ratios are candidate/baseline: below1 means less time. The five steady chunks are summed within each child, then the median and range of the five paired ratios are shown. CPU is quantized process CPU and has substantial dispersion; no cause such as compilation or GC is proven. A/A is a diagnostic sample, not a statistical confidence interval. Empty containers are two arrays plus one object per observed empty getDirty call, counted outside timing; they are not retained-byte measurements.

| Workload | A/A wall | A/B wall median (range) | Wall wins | A/A CPU | A/B CPU median (range) | Empty containers/10 ticks A → B |
| --- | --- | --- | --- | --- | --- | --- |
| synthetic64-clean | 1.0012 | 0.9095 (0.8971–0.9250) | 5/5 | 1.0161 | 0.9909 (0.5595–1.3468) | 1920 → 0 |
| synthetic64-sparse | 1.0253 | 0.8939 (0.8641–0.9035) | 5/5 | 1.0815 | 0.7556 (0.4742–1.0842) | 1890 → 0 |
| synthetic64-dense | 0.9847 | 1.0167 (0.9770–1.0217) | 2/5 | 0.9741 | 1.0266 (0.9983–1.3605) | 0 → 0 |
| 120-clean | 0.9991 | 1.0079 (0.9940–1.0627) | 1/5 | 1.0071 | 1.0642 (0.9397–1.3547) | 330 → 0 |
| 120-sparse | 0.9935 | 1.0094 (1.0020–1.0211) | 0/5 | 0.7733 | 0.9397 (0.7409–1.1729) | 300 → 0 |
| 120-dense | 1.0094 | 0.9946 (0.9447–1.0445) | 3/5 | 0.9527 | 0.9551 (0.9006–1.1115) | 0 → 0 |
| 168-clean | 1.0436 | 1.0030 (0.9536–1.0593) | 2/5 | 1.0891 | 0.9626 (0.9147–1.1462) | 330 → 0 |
| 168-sparse | 0.9688 | 0.9888 (0.9773–1.0052) | 4/5 | 1.1219 | 1.0901 (0.9528–1.2703) | 300 → 0 |
| 168-dense | 0.9204 | 0.9559 (0.8884–1.0202) | 3/5 | 1.0641 | 0.9359 (0.9269–1.0735) | 0 → 0 |

Synthetic clean/sparse wall ratios show consistent9.05%/10.61% reductions across five pairs. On saved120 clean/sparse, median ratios are1.0079/1.0094, with only1/5 and0/5 wall wins. Saved168 clean/sparse medians are1.0030/0.9888; the latter small change is within the scale of its A/A variation. Synthetic dense avoids no containers and has a1.0167 median wall ratio; saved dense apparent wins also overlap sizable A/A variation (168 dense A/A0.9204). This evidence does not support a representative CPU gain, full-game gain or a universal regression claim. The narrow allocation reduction alone does not meet this experiment's shipment criterion.

## Memory, GC and limitations

Whole-child memory and GC hold both arms, warmup/sample recorders and final snapshots. They cannot assign retained memory or GC cost to this feature. Post-sample heap ranges across configurations run from8,073,624 to181,383,056bytes; whole-process peak RSS ranges115,520–521,036KiB. Recorded whole-child GC sums range36.5233–195.6730ms, including setup and explicitly requested collections. Complete per-configuration/per-child ranges remain in the summary/raw files. No negative-delta allocation, per-feature heap, memory-saving or GC-speedup claim is made.

The first offline summary read the wrong GC property and emitted zeros; its exact file is retained as summary-initial-wrong-gc-key.json and is not accepted. The corrected summary asserts the actual gcRows array and independently matches every recorded sum. No measurement was repeated or altered. The preflight's first CPU asymmetry remains unattributed; the declared200-tick warmup/six-chunk protocol was fixed before the main matrix, whose complete results are retained.

## Correctness and disposition

The corrected baseline has one genuine allocation assertion failure and six passing controls. The first RED also contained a test-cleanup TypeError, retained separately. Candidate passes199 maintained cases/12 files. A deliberate nonempty-suppression fault fails both strict and semantic full-diff assertions; exact source is restored, then all seven new tests, strict types, scoped lint and build pass. Direct getDirty still yields fresh containers; strict/semantic reverts and reinsertion, live payload observation and recording remain covered. These correctness results do not override the measurement decision.

The rejected production change and its implementation-specific allocation test are retained as evidence and removed from the deliverable. Current source returns exactly to ca5e15a. Work88 closes as a measured rejection; E20's state-fingerprint cost remains a separate open task. No further tuning or repeat matrix is scheduled for this experiment.
