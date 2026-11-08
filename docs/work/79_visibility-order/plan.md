# Avoid repeated visibility serialization sorting

Status: active
Owner: Codex
Created: 2026-11-07
Updated: 2026-11-07

## Problem and outcome

AoE2 feedback E19 measured repeated canonical visibility sorting at 3.8% CPU in a live-grown world versus 0.9% after loading the same world on engine 2.4.1. Current 2.8.1 still sorts player/source/explored output on every getState call. Remove redundant ordering work without changing public behavior or saved state.

## Scope

Private ordering caches in VisibilityMap, focused contract tests and a bounded parent/candidate measurement. Base main 6a8ae8f, own worktree visibility-order-1107. No validation opt-out, fractional coordinates, incremental rasterization, public metrics/API or persistent format change. Farm owns the heavy local gate slot during consumer adoption; root waits before native benchmarks/full gates.

## Approach

Cache sorted player/source IDs until membership changes, reading current source values when returning detached snapshots. Cache sorted explored indices until actual explored-set growth. Preserve code-unit normalized key ordering, numeric cell ordering, update flushes, batch behavior, source extra fields loaded by fromState and existing metrics. Returned arrays, tuples and source objects remain copies; serialization still copies output and costs O(output size).

## Acceptance criteria

- Warm unchanged getState/getSources perform no sorting; coordinate-only changes within explored territory do not re-sort keys. Restore-sort regression control fails.
- Independent cell/state oracle covers mixed IDs, lifecycle/churn, remove/reinsert, load duplicates, output mutations and batch semantics; current metrics and validation unchanged.
- Bounded 128x128 / 277 stationary radius5 plus 2 moving radius3 / 60-batch comparison uses identical inputs, matching states/digests and live/restored insertion orders. Separate actual measurements from historical feedback.
- Independent exact review, all eleven gates, truthful patch release, main/push/hosted acceptance and worktree cleanup.

## Implementation steps

- Done: three ordering tests failed with 80/4/4 sorts before implementation. Eight new ordering/oracle cases pass; 43 focused visibility/observer/hardening cases and typecheck pass. Restoring repeated player sorting fails three tests; exact source bytes restored in finally.
- Done: private caches and bounded native benchmark against the verified2.8.1 archive. Source/value semantics, snapshots and existing metrics match the independent oracle.
- Done: candidate2.8.2 passes all eleven gates (1855 root plus one existing TODO,22 MCP); no high/critical audit findings, seven moderate dev findings remain.
- Active: independent exact review; then integration, push/hosted acceptance and cleanup.

## Outcome

Pending engine delivery. Work77's retained artifact producer passed hosted CI42425758281; Farm adopted verified2.8.1 at main87c70e9 with its own gates/review. City is the next consumer. Validation/state scan requests remain open until fresh consumer measurements justify their own changes.

## Measurement

Reproduce after building: `node --expose-gc scripts/benchmark-visibility-order.mjs BASELINE_MODULE`, where BASELINE_MODULE is dist/visibility-map.js from the retained2.8.1 archive named in work77. Its SHA256 is b6f766fff065941c221497d4623cd8b2d8d2e7d1c4849076a62e63df213d2878. Node24.12.0 on Windows; root held the shared heavy-gate slot. This is synthetic visibility-only work, not AoE2 throughput.

The retained script defines 128x128 cells, 277 radius5 stationary sources at ((i*37)%128,(i*53)%128), shuffled source IDs, and two radius3 sources moving through 60 fixed batches. It checks parent/candidate state after every batch against an independent full-cell scan. Both live-grown and restored cases end with10201 explored cells,60 recomputes,603368 computedCells and zero visibilityQueries; complete state-sequence SHA256 is353f91268de46942f74d8e2b025ccc58b9eab791ec57260296b6e05271b107c1 for both.

Timing medians below use seven alternating parent/candidate trials after warmup. State digests match per trial. Each state read still constructs its output; JSON encoding is outside the timed region.

| Workload | Parent wall ms | Candidate wall ms | Parent CPU ms | Candidate CPU ms |
| --- | ---: | ---: | ---: | ---: |
| Live-grown,500 unchanged reads | 174.85 | 5.29 | 171 | 0 |
| Live-grown,60 moving batches | 65.45 | 44.68 | 63 | 47 |
| Restored,500 unchanged reads | 47.06 | 4.86 | 47 | 0 |
| Restored,60 moving batches | 45.81 | 39.85 | 47 | 47 |

Zero CPU samples reflect Windows CPU-accounting resolution, not zero processor work. The exploratory invocation before retaining the script measured75.74→50.54ms for live moving batches and56.53→54.40ms for restored moving batches; between-run variability limits timing claims. Exact eliminated sorting and state equivalence are the deterministic checks.

Forced-GC retained-heap samples (five alternating samples,12 warmed maps each) had medians690398 parent and770999 candidate bytes/map, about80601 extra bytes (78.7KiB). This is approximate retained heap, not total RSS or a peak-memory bound. The added memory holds canonical cell/ID arrays and remains proportional to current stored state; clear/recreation behavior is tested. Raw reports remain ignored under tmp while this milestone is active.
