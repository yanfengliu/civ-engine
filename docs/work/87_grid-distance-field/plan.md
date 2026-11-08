# Multi-source weighted grid distance field

Status: complete
Owner: Codex root
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

E14 asks for the distance from every grid cell to its nearest destination without one path search per cell/destination pair. AoE2 currently implements separate multi-source breadth-first searches in its production drop-off field and independent haul oracle. Add the general engine primitive, prove directed weighted distances, and evaluate the actual consumer boundary without making its oracle share the production implementation.

## Scope

Own worktree `civ-engine-worktrees/grid-distance-field-1107`, branch `codex/grid-distance-field-1107`, base `22f3e19746cd50da264aaba259856d625b833e2a`. Public function `gridDistanceField(sources, options)`, `GridDistanceFieldOptions` and `GridDistanceFieldResult` in both curated barrels. This changes no existing path, queue, World, save format or dependency. Ship2.12.0 after work86; work85 fractional acceptance is separate, with an additive minor version and exact independent review. Producer shipping does not establish game adoption.

## Approach

The result has width, height, detached row-major Float64Array distances, and Int32Array sourceIndices. A source index identifies the earliest input destination among equal-cost choices; unreachable or blocked cells have Infinity and -1. Duplicate positions retain their earliest input index. Empty or entirely blocked destinations produce an unreachable field. Every source must have integer in-bounds coordinates; invalid inputs fail before passability or cost callbacks run.

Options use the existing GridPathConfig geometry and passability vocabulary: width/height or occupancy dimensions, movingEntity, includeReservations, allowDiagonal, preventCornerCutting, blocked, cost and maxCost. Four-connected unit edges are the default; diagonals default to sqrt(2), and corner cutting is prevented by default. Occupancy and custom blocking are combined with OR. Finite nonnegative edge costs are allowed, including zero; negative and nonfinite callback results are excluded as in findGridPath. The distance is FROM a cell TO a destination, so directed costs must be evaluated as cost(predecessor, reachedCell) while expanding backwards. Callback exceptions propagate unchanged. Callbacks must be stable for the synchronous computation. maxCost is a nonnegative number or Infinity; larger distances remain unreachable. No iteration budget returns a misleading partial field.

Use multi-source BFS for the default four-connected unit-cost case, and reverse Dijkstra for weighted or diagonal graphs. Stable priority is distance, original source index, then row-major cell index; zero-cost ties must propagate the earliest source without cycling. Validate safe positive integer dimensions, safe row-major indexing and representable result/source-index sizes before allocating. The dense result uses memory proportional to grid area; no constant-memory or path-suffix guarantee is claimed. Reuse small internal geometry helpers where this does not alter existing findGridPath semantics; otherwise keep the additive helper independent.

## Acceptance criteria

- [x] Literal missing-export RED precedes implementation. Contract tests cover multiple/duplicate/empty/blocked destinations, rectangular maps, obstacles, boundaries, maxCost, occupancy/reservations/ignored entity, diagonal corners, fractional weights, asymmetric directed edges, forbidden edges, zero-cost cycles, source ties, detached results and callback errors.
- [x] An independent forward Bellman-Ford oracle on small fixed and seeded directed grids agrees for every cell and destination, with no use of the production neighbor/heap helpers. Distances and earliest-source ties are checked separately.
- [x] Actual mutations reversing directed costs, dropping passability and dropping equal-distance source tie propagation fail meaningful assertions; candidate bytes are restored after each.
- [x] A bounded grid/consumer-shaped workload observes one multi-source computation and equal results. Compare runtime and peak/retained memory honestly; preserve AoE2's independent oracle if production adoption uses this primitive.
- [x] Both curated exports, public surface fixture, standalone utility/API sections, spatial/RTS/map-generation guides, architecture boundaries/map/drift and external migration/version documentation agree.
- [x] Exact independent review, all eleven gates, main/push, terminal supported-Node/publication CI, downloaded immutable-archive runtime checks and task-owned cleanup complete.

## Implementation steps

- [x] Audit current engine path contracts and AoE2 production/independent BFS consumers; allocate87 and isolate the worktree.
- [x] Write contract tests and run baseline RED; implement the additive primitive and independent oracle/mutation controls.
- [x] Measure the bounded workload, complete public docs and review the exact candidate.
- [x] Refresh onto accepted earlier milestones, run gates, land and verify publication; reconcile consumer disposition separately.

## Outcome

Implemented the additive primitive, both exports, public surface fixture and current API/guide/architecture documentation. The first missing-export baseline preceded implementation. The first candidate run exposed two malformed parameterized test rows; corrected baseline then produced31 literal missing-function assertion failures and candidate31 passes, with exact barrel restoration. Final focused verification passed86 tests across five files plus strict typecheck and scoped lint on2026-11-08T06:25:47.354Z. This includes32 direct contracts,34 oracle/occupancy/consumer-shaped cases and existing path/public/browser contracts. The independent forward Bellman-Ford oracle checks every cell on32 seeded directed graphs; the48x32/24-destination workload checks all1536 distances and one blocked read per cell. Three actual mutants (reverse directed costs, ignore passability, drop equal-distance tie propagation) each failed their intended assertion and restored exact source bytes. Raw evidence is ignored under tmp/grid-distance-field; original fixture errors remain retained and are not counted as valid product REDs.

Review is now requested against a frozen source tree. Runtime/memory measurements, a version/changelog/devlog entry after earlier milestones, integration refresh, full eleven gates, hosted delivery and immutable-runtime verification remain open. No source commit or shipping claim yet. AoE2's existing BFS oracle remains independent and unchanged.


## Review repair and integration refresh

Review0 F0/F1 accepted and repaired:20 new JavaScript boundary contracts yielded13 genuine failures/7 passing controls before the guard, then106 focused passes/6 files, strict types and scoped lint. The two-line change defaults only undefined to Infinity and rejects every non-number without conversion before callbacks. Complexity includes S destinations and O(S) seed storage. Raw logs and exact preimage are in tmp/grid-distance-field/review-repair. Preserved repaired pre-refresh tree a06ee447af247aa5db0c051a3c9c4f420c999cd1 before a three-way refresh to main8c774d6; only the additive drift-log tail conflicted, resolved by retaining both rows. No source from rejected work85 was copied. Prepared2.12.0; measurement and exact review/full delivery remain.


## Getter follow-up and bounded measurement

Root accepted review1 on c4629a7 (SHA25601AABF73D21FDAF88EF2659D4A7BE5E84BDB404B8D8AB9C81E614AC6D9494244), then addressed its minor F2 without algorithm changes: a literal maxCost accessor-count/bound test failed once with20 passing controls before a cached property read, then all21 boundary cases/types/lint passed. Source SHA2565A6A9021D5BC0AB3E650B51F7B99D9AF2FD567335E205828AB154DF41B517AF3. Built2.12.0 and private MCP141-package scripts-disabled install passed. The16.128-second owned preflight observed36 processes with zero stops/leftovers; a later privileged task-path census was empty.

The predeclared two-grid measurement completed24 fresh children (one A/A and five alternating A/B pairs per grid),40 computations each, with every distance and earliest-source label equal. On120x96 and168x168 unit-cost grids, generic/default versus narrow integer BFS median paired wall ratios are3.0074 and2.6665, or0.5501/0.9843 ms extra per field; A/A wall ratios0.9908/1.0392. The narrow transcription excludes game caches, approach rings, descent and real passability costs, so this does not establish actual-game performance or justify replacing the production BFS for speed. Windows CPU samples were short/quantized, including zero baseline values; no CPU ratio is accepted. Original post-timing arrayBuffers deltas were negative from deferred collection, remain retained and are rejected as memory estimates. Separate12 fresh memory-only children retained24 fields each after yielded GC; all positive arrayBuffers deltas exactly equal returned array byte lengths. The generic Float64/Int32 results use12 bytes/cell versus8 for the narrow Int32 pair:138,240 vs92,160 bytes/field on120x96;338,688 vs225,792 on168x168. Heap and whole-process peakRSS samples remain explicit noisy startup-inclusive observations. Both complete receipts and synthesis are retained; no rerun of timing or performance optimization was made.

Delivery disposition: proceed as the already-scoped additive general primitive, with measured costs explicit. Game integration must preserve its independent haul oracle and earn acceptance on actual cached-field workloads; no automatic replacement of its narrower BFS and no game speedup claim. Final exact follow-up review, full11, main/push, CI/archive and cleanup remain.


## Accepted final review and gates

Root read and accepted the complete final native Astra/xhigh review2 (15489 bytes, SHA256 37ef6bb044fe3f019d67dd7274a716128487b77cfac657546846b63c68bbbfff). It covers exact d7373c2's one-read maxCost follow-up and bounded measurement evidence. All eleven maintained gates passed that source in25.573seconds with2,093 root cases plus one existing TODO and22 MCP cases; Node24.22.1/npm11.6.2. Both audit thresholds pass, with seven moderate development advisories and none in production/MCP. The owned runner observed140 processes, zero stopped/leftovers. Actual built Node/browser2.12.0 exports passed directed weights, exact ties, corner policy, pre-callback cost rejection, single getter read, detached results, empty fields and actual result-buffer sizes. No runtime/test/metadata change followed the gated target; only delivery records/review are added. Main/push, hosted CI, downloaded archive and final cleanup remain pending; no game performance or adoption claim.


## Delivered and cleaned

Work87 delivered2.12.0 at main/origin a21a842ae051a39a0e523fd555f6be7eb9df53ce after exact final review, all11 gates (2,093 root plus existingTODO,22MCP) and actual built/downloaded Node/browser contracts. CI42460222937 completed Node20/22/24 and publish-dist successfully. Retained asset723289079 is686844bytes/442entries, SHA256E6B7642F61B91F0BF5A219AA8FACF9D5A335CACB18FD41807427E0A7D384B3DD. 255 evidence files/3089623bytes are hash-retained in primary tmp/work87-closure/evidence, manifest2337D06BD2CCDB56818330DDC4020DB04116C1DB0D1E47729CD0F9BCBB421DC2. Private self-junction/worktree/branch removed; zero task-path process matches and protected shared hashes/Cursor deletion preserved. Synthetic unit-cost results remain2.67–3.01x narrower-BFS wall time and50% larger returned arrays; no actual-game speedup or adoption is claimed.
