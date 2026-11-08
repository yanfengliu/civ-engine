# Work88 independent source and evidence review

## Target and limits

Reviewed on 2026-11-08 by the existing native Codex Astra/xhigh reviewer lane. Exact workspace: `C:/Users/38909/Documents/github/civ-engine-worktrees/empty-component-diffs-1108`; HEAD/base `ca5e15a5ef134e3fff52c7200f8924b8ee2cbca5`; exact staged tree `f43ef62dd9a4532b9babec2c9aa10c449630ddf3`. The candidate is five added production lines in `src/component-store.ts` and `src/world-tick.ts`, an 81-line test, work88 preparation records and work85 closure records. Version remains 2.13.0. This review does not reopen completed work85.

This is SOURCE/EVIDENCE ONLY. I read source and retained output, verified file hashes and Git objects, and independently recomputed the retained numeric summaries with PowerShell. I did not execute/import the candidate, run tests/builds/benchmarks, install anything, invoke a provider, mutate Git, or edit product files. Work158 owns the runtime lane. No external reviewer CLI or source-export attempt was made. Only this report is authored by this reviewer. Repository instructions, the fleet review runbook, applicable coordinator guidance, work71 review4, work88 plan, architecture boundaries and the currently empty lessons queue inform this assessment.

## Verdict and finding

**Do not ship this optimization on the retained evidence.** No material source-contract defect was found. The container-count mechanism is demonstrated, but the representative clean/sparse cost results do not meet the predeclared requirement to reject small/noisy benefits. This is a rejection of this bounded candidate's acceptance case, not a claim that its diff is incorrect or that all empty-store optimizations are impossible. Keep the result and existing 2.13.0 behavior; do not widen the experiment to rescue it.

**F1 — acceptance blocker: representative benefit is unproved.** The criterion is explicit at `docs/work/88_empty-component-diffs/plan.md:20`, with the representative-benefit acceptance box still open at line26. The changed branch is `src/world-tick.ts:307`. Outside the diff, `tmp/empty-component-diffs/measurement/child.mjs:23-27` shows the real saved component/state inputs and the unchanged engine tick workload, while lines45-51 show the timed chunks and parity boundaries. The corrected `measurement/summary.json` and all 54 raw matrix files substantiate the following: synthetic clean/sparse median wall ratios are 0.90947/0.89386 with 5/5 paired wins, but saved120 clean/sparse are 1.00792/1.00938 with only 1/5 and 0/5 wins. Saved168 clean is 1.00300 with 2/5 wins; its sparse 0.98883 with 4/5 wins is smaller than that configuration's A/A deviation (0.96877), has a range crossing 1 and has median CPU ratio 1.09012. These do not establish a useful representative cost improvement. Synthetic dense avoids no containers and has wall median 1.01675 (3/5 slower); do not hide that cost. Saved168 dense's apparent 0.95587 gain is also weaker than its unchanged A/A 0.92036 and is not evidence that this allocation guard improves dense work. The root's provisional no-shipment inclination agrees with this independent conclusion; final owner disposition was not supplied when this report was authored.

There is no requested source repair and no recommendation for another measurement round in this review. The appropriate disposition is a retained negative/small-noisy experiment, with shipment withheld.

## Contract assessment

`src/component-store.ts:110-112` checks both existing dirty memberships. Outside the diff, `getDirty()` at lines114-121 creates its arrays and result object solely from those sets. If both sets are empty, its prior result necessarily has empty `set` and `removed`, which the unchanged `src/world-tick.ts:309-311` already discards. If either set is nonempty, the original method and postcheck run unchanged. The guard does not sort, clear or consume membership and introduces no caching or listener-dependent shortcut.

The supporting outside-diff mutation rules are `src/component-store.ts:28-42` and `:51-66` for semantic reversion/strict dirtiness, `:77-83` for removal, and `:124-156` for clearing and restored stores. Both semantic reversion paths remove dirty/removed marks; skipping that empty result preserves the old output. Nonempty iteration order, array freshness for direct callers and live payload references remain as before. The direct `getDirty()` implementation is untouched.

Diff construction remains in the same failure phase at `src/world-tick.ts:178-196`, still happens without listeners, and still constructs resources/state/tags/metadata at `:313-335`. Dirty clearing remains at `:124-127` and `:262-268`; per-listener cloning remains at `:208-214`. No public index export, persistent format, dependency, state-fingerprint walk, default strict/semantic policy or observer/recorder behavior is changed. `docs/architecture/ARCHITECTURE.md:105` explicitly identifies ComponentStore as an internal implementation detail, and `src/index.ts` does not export it.

The new test covers pull-only empty diffs and absent clean materialization, fresh direct empty return values, strict/semantic equal-and-reverted writes, removals/reinsertions, and live-payload recording/listener order. Retained corrected RED output reports one genuine failure with 66 `getDirty` calls and six passing controls (`tmp/empty-component-diffs/red-2/full-gates.log:14`, `:296-297`); the initial incorrect listener-unsubscribe cleanup premise remains disclosed in the plan. Retained GREEN output reports 199 passing tests in 12 maintained files (`green-1/full-gates.log:9-10`). The deliberate nonempty-suppression mutation fails the intended complete component diff assertions in both modes; `controls-1/mutant-result.json` records two failures and five skipped tests. Exact restoration is recorded by `controls-1/gates.json`, followed by seven passing new tests, types, affected lint and build. These are inspected receipts, not reviewer-run checks, and they are not the complete release gates.

## Measurement interpretation

Each configuration has one A/A child and five A/B children. Each child keeps both arms, alternates A/R execution order through six chunks, excludes the first timed chunk only from the ratio summary, and retains its output checks. The reported ratio is the sum of the last five R chunks divided by the sum of the last five A chunks, then summarized across the five independent A/B children. Lower than 1 favors the candidate. This is a small sample, with only one A/A child per configuration; ranges are observed ranges, not confidence intervals.

| Configuration | A/A wall ratio | A/B wall median [range] | A/B wall wins | A/B CPU median |
| --- | ---: | --- | ---: | ---: |
| synthetic64 clean | 1.00124 | 0.90947 [0.89706, 0.92495] | 5/5 | 0.99091 |
| synthetic64 sparse | 1.02527 | 0.89386 [0.86407, 0.90353] | 5/5 | 0.75563 |
| synthetic64 dense | 0.98467 | 1.01675 [0.97705, 1.02170] | 2/5 | 1.02664 |
| saved120 clean | 0.99909 | 1.00792 [0.99399, 1.06273] | 1/5 | 1.06415 |
| saved120 sparse | 0.99346 | 1.00938 [1.00196, 1.02113] | 0/5 | 0.93972 |
| saved120 dense | 1.00942 | 0.99459 [0.94474, 1.04446] | 3/5 | 0.95513 |
| saved168 clean | 1.04364 | 1.00300 [0.95357, 1.05928] | 2/5 | 0.96257 |
| saved168 sparse | 0.96877 | 0.98883 [0.97730, 1.00523] | 4/5 | 1.09012 |
| saved168 dense | 0.92036 | 0.95587 [0.88835, 1.02024] | 3/5 | 0.93590 |

The CPU evidence is broad and quantized: for example synthetic clean spans 0.55949-1.34682 and synthetic sparse 0.47416-1.08416. It does not independently establish a stable CPU benefit or a definite dense CPU regression. The wall evidence supports the narrow synthetic improvement; it does not support a whole-game gain. Saved-input state work remains in the timed ticks, as required, so failure to improve that workload is relevant rather than something to exclude after seeing the result.

The separate ten-tick instrumentation at `child.mjs:54-59` runs after timed measurements and restores the prototype in `finally`. It reports 192 and 189 avoided source-level result containers per tick for synthetic clean/sparse, and 33 and 30 for saved clean/sparse. Dense avoids zero, while maintaining 64 or 11 nonempty calls per tick on both arms. These counts are `empty calls * 3`, supported by the unchanged source allocations; they are not bytes allocated, V8 heap-allocation counts, retained-memory savings or GC savings. A/A uses the shared A module but instruments arms sequentially and restores each wrapper, so it does not double-count an active nested wrapper.

The saved snapshots have 11 component types, 48,311/95,222 component rows and 41 state keys. They are actual saved data, but the harness installs its own repeated same-value write system and no game systems or commands (`child.mjs:23-27`). Dense means every nonempty store receives one write, not every component row is rewritten. Consumer counts are tied to churn: zero for clean, one for sparse, and two plus a recorder for dense; this is not a factorial estimate of separate observer effects.

The retained parity checks compare complete current diff/events/non-timing metrics and accumulated observer ticks at matched chunk endpoints, full serialized state after warmup and timed samples, and all recorded ticks for recorder configurations. They are outside the clocks. For nonrecorder configurations they do not retain every intermediate tick's output; the raw `recorderTicksEqualExcludingTiming:false` is correctly summarized as not applicable. Dense recorder configurations all have `true`. This bounds the phrase complete output equality and does not turn the isolated workload into a game simulation. No omitted-work mechanism was found in the five-line source change.

Whole-process RSS/post-GC heap holds both arms, recorders and final snapshots. GC rows include the child's broader lifetime and explicit forced collections; they are not attributed to either arm or just the timed region. The summary states this limitation. The initial summary used a nonexistent GC key and incorrectly defaulted to zero; `summary-initial-wrong-gc-key.json` remains retained. The corrected summary uses actual `gcRows`, and independent recomputation confirms every raw GC event count, duration total and configuration range. Neither corrected GC totals nor positive/negative heap deltas can rescue the absent representative benefit.

## Binding and retained execution evidence

I verified all 808 declared package files (404 A and 404 B), the two saved input hashes and sizes, both candidate source hashes, and the child/runner hashes. Package differences are exactly seven artifacts for the two edited modules: component-store declaration/declaration map/JS/JS map and world-tick declaration map/JS/JS map. I verified all 54 matrix JSON hashes against the summary, their native zero statuses and unique configuration/arm/repetition identities, six timed rows, two instrumentation rows, equality flags and required recorder flags. Every A/R wall/CPU/tick sum, paired ratio, nine A/A ratios, A/B median/range/win count, arm time median, raw GC count/total/range, memory payload and RSS range matched independent recomputation. No mismatches were found.

The matrix receipt records 54 native children, exit0 and 145.489 seconds. Its process receipt records both observed process exit and native receipt exit0, 103 identified owned process instances, zero stopped and zero leftovers. The watcher tracks PID plus creation identity, excludes preexisting identities, starts hidden and cleans only owned identities in `finally`; child listeners/recorder/observer and instrumentation have explicit cleanup. These are reviewed retained receipts, not a fresh process census by this reviewer. The runner's native receipt and per-child outputs support completion rather than relying on a wrapper exit alone. The historical preparation manifest's `notLaunched:true` and plan's preparation wording describe their earlier seal; the later current-run receipt is the execution evidence.

Key SHA256 bindings:

- Source `src/component-store.ts`: `0079C34539A44EF1BA3535260DE89839179563F39212B78C53A49B3E27342E0F`.
- Source `src/world-tick.ts`: `C92B2C85C0644A2C255F05DB9EF014C5EC186FEC9878639F7C95C847AF3F2154`.
- Test `tests/empty-component-diffs.test.ts`: `C11B0CE07D7C51A2DD7AB84BA60B1035064C5344131DFA4903291A9CE88E8A15`.
- Measurement manifest: `EFC5871F47972F5F5D46F7EB7CCCDA84F7F862458ED40260565436127BD479D4`.
- Measurement child: `9F45FAFC581AE69D8A8CDD92B157AAC96EE402D1A14B4C739C7F4B699DF29C4B`.
- Measurement runner: `898D445ABF836D04138EFED4C91BA19F9C59A3806DB91BC9B538C08947A21176`.
- Corrected summary: `01AA26C6558430ACA937E386C9BA5786B3B4221AB4A479E8FD3DF0AED8D592AC`.
- Matrix native gate receipt: `09059F9E24238F6C34FC40A5A077B4380B2185F1074EF1D06A9909594133C1E9`.
- Matrix process receipt: `926512783689B7B5554D67B5C7E3E79AAF4145D9C9384159B21471B9F61B900F`.

The cached diff comparison to the exact staged tree returned0. Direct read-only Git blob hashes of both production files and the test matched the corresponding staged-tree blobs exactly. Ordinary worktree diff inspection was unavailable in this environment (`must be run in a work tree`); exact object comparisons and direct hashes supplied that verification without mutation.

## Round outcome

Source contract review: no material defect found in the scoped implementation. Evidence review: arithmetic, hashes, native completion and retained cleanup receipts verified with the limits above. Acceptance: F1 remains a no-shipment recommendation because representative benefit is too small/noisy and dense costs are not erased by the synthetic win. Full release gates, version bump and code delivery have not been accepted or performed by this reviewer. Owner disposition and truthful experiment closure remain with root; no runtime or broader optimization is authorized by this report.
