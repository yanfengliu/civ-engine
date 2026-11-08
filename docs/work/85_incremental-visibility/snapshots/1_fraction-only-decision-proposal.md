# Visibility decision after five optimization attempts

Recommendation: do not publish the rejected optimization. Separately ship the already-approved fractional-center contract on the shipped visibility algorithm, after fresh review/gates; defer the new work metrics and incremental work. No separation has been implemented.

The final candidate passes114 focused tests, types/lint,22 restored controls and42 workloads/2760 state-plus-old/five-work-counter boundaries. Performance still fails the fixed criterion. Each timing interval contains eight preconstructed maps and60batches; values below are independent median totals plus the median paired ratio/delta, not a claim that a ratio of medians equals the paired median.

| Condition | Wall baseline → candidate | Median paired wall change | CPU evidence |
|---|---:|---:|---|
|1024 radius1,75% change|94.451 →100.249ms|+5.446ms,+about6%;5/5 increases|Paired median difference0ms; no CPU win claimed|
|1024 radius1,25% change|81.581 →72.726ms|-7.847ms|Paired median+31ms,1.40×;4/5 increases, short CPU segments are quantized|

The dense wall gap is about11.35microseconds per player flush in this fixture. Four actual unit-layer trace medians improve wall by roughly11–24% and CPU by5–22%; that does not cancel the failure or establish whole-game gains. Retained memory also costs approximately719kB extra per sparse map,313/499kB for the120/168 actual cases, and2.91MB for the new257-source mixed-radius25% case. Other measured dense cases retain112–325kB extra. Load/first-state bounds are about1.6–1.8× in the actual/sparse cases; unchanged-read bounds include a1.58× dense wall ratio. Heap, arrays, peak RSS and raw timing outliers remain separate.

|Attempt|Mechanism|Disposition|
|---|---|---|
|1|Sparse coverage counts|Correct, but dense71/1024 wall1.335×/2.080×|
|2|50% direct union and two-sparse reindex|1024 dense wall1.162×|
|3|Reuse dense wrappers and count visits locally|1024 dense wall1.106×|
|4|Bounded1MiB union stamps|Radius1 mixed75% wall1.152×; other CPU losses|
|5|Reuse indexed cache records, changed-only dense bookkeeping, final-candidate lookup removal|Remaining radius1 dense wall gap above; final authorized attempt|

## Exact proposed fraction-only boundary

Use the then-current shipped src/visibility-map.ts; confirm its visibility algorithm still matches the22f3e197 baseline. Change only the validation calls in setSource and fromState to the already-tested assertSourcePoint helper. That helper checks finite x/y, then existing map bounds; existing radius validation follows. Keep integer point queries on assertGridPoint. Keep computeVisible, update, source batching, explored history, canonical ordering, clear/load behavior and the three old metric fields unchanged. No coverage cache, cold strategy, stamp allocation or incremental merge is part of this fallback.

Retain the16 literal continuous-source cases and the four independent lifecycle/oracle cases, which use only existing public APIs/old metrics; retain existing visibility/observer tests and add no relaxed assertion. The optimization tests/source are preserved as rejected research, not silently weakened or lost. Compare integer trace states/old metrics with the shipped baseline, prove fractional/error/batch controls, then exact independent review, full11, main/push, terminal Node20/22/24 and retained archive/runtime verification. AoE2 adoption remains separate.

Omit unpublished VisibilityMapWorkMetrics/getWorkMetrics, their barrel/type-pin additions and the two private optimization helpers from that release. On the baseline algorithm three proposed counters could measure full raster/sort work, while coverage-index writes and merge visits would always be zero. Those definitions can be truthful, but retaining them would add independently unmeasured default instrumentation and an unnecessary public contract to this narrow release. E18/E19 stay open; old getMetrics/resetMetrics remain intact. Update only migration/API/guides/version records for the fractional contract, using the then-next additive version after work86/other independent releases. The present2.11.0 candidate metadata is unpublished history.

## Approval and evidence

The owner-approved proposal134BD429…CB3D explicitly says to separate the incremental algorithm from the compatibility change. Fractional finite source values, unchanged state fields and later scoped game adoption already have R8 approval; the narrower feature does not require that approval again. Root requested inspection of this boundary before implementation. Any sixth optimization repair needs renewed owner authorization under R11; none is attempted or recommended implicitly here.

Final timing ran2026-11-08T06:52:44Z–07:01:05Z. Final-phase472 native jobs comprise one intended RED and471zero exits;995observed owned process instances,0stopped/leftovers/live runtime. No full gate, source commit, publication or fraction-only implementation occurred. Evidence is retained under tmp/visibility-incremental-1107: attempt5-final-timing-summary.json, attempt5-memory-load-read-summary.json and attempt5-runtime-acceptance.json. The complete46-file rejected candidate snapshot is search/attempt5-final/manifest.json, SHA2564BCC6CEA8DC325D4C07FC1CA5F01B14B9400DAAD0891C450E666D4C2AFB0822B; all previous attempts, profiles, held-out precommits and authored reviews remain intact.
