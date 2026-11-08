# Review 0: implementation

## Target

civ-engine visibility ordering source, tests, benchmark and documentation. Target commit: 0e3e78f8f7d14eac1fb827b775983069754963fb. Frozen tree: 0a55ac7c5184f32a0d352b4999d175ceafc3a367. Base: 6a8ae8fa4e65c8d49c933956592e1a088c32a78b.

## Reviewers and coverage

Independent in-session gpt-6-astra, xhigh. Date: 2026-11-07. Read-only source, exact tree and retained benchmark evidence review. External CLI review unavailable; the report gives the verification bounds.

## Reports

### gpt-6-astra / xhigh

No material implementation findings in frozen tree `0a55ac7c5184f32a0d352b4999d175ceafc3a367` against base `6a8ae8fa4e65c8d49c933956592e1a088c32a78b`. Read-only Git comparisons confirmed the index and working files matched that tree.

One minor documentation finding:

- **V1 — qualify total complexity.** docs/api-reference.md:3500 says each `getState()` call “costs O(output size).” Dirty calls still rasterize sources, and invalidated caches still sort. Describe **output copying** as O(output size), with additional work for pending updates and cache rebuilding. The changelog and guide already make this distinction.

Verified:

- Cache invalidation covers player creation/deletion, source insertion/removal, and actual explored-set growth. Movement reads current source values; returned arrays, tuples, and source objects remain detached.
- `fromState()` completes duplicate-player/source merging before its first update. Fresh cache fields are initialized in `ensurePlayer()`. Serialized shape, normalized code-unit ordering, rasterization, flush behavior, and metrics remain unchanged.
- The cell oracle uses full-grid scanning rather than the engine’s source bounding boxes. Seed sequences exercise successful removals, clears, moves, unchanged writes, and all mixed IDs. Focused tests cover warm ordering, recreation, duplicates, copies, and batched exploration.
- Retained benchmark medians and matching digests agree with the measurement record. The baseline archive hash matches `b6f766ff…13d2878`. The additional approximately **78.7 KiB/map** matches the forced-GC samples; timing and memory limitations are disclosed.

**Unchanged surrounding-code citation:** src/player-observer.ts:315 consumes `getVisibleCells()`, whose numeric-position ordering remains unchanged. src/visibility-map.ts:223 preserves the existing read-triggered flush and unknown-player behavior.

Bounds: this was an in-session read-only review. No tests, gates, benchmarks, installations, network requests, or external reviewer CLI were run. Reported gate passes and RED controls were not independently reproduced; benchmark results were checked from retained evidence, not remeasured. Hosted delivery and actual game performance remain outside this review.

## Findings and disposition

F0 (authored label V1) accepted and corrected: the API reference now attributes O(output size) to copying and explicitly adds pending-update/cache-rebuild costs. Root checked the exact wording against the guide/changelog; source and test bytes remain identical to the reviewed commit. This minor documentation repair does not require another implementation review round.

## Verification

Root's pre-review full eleven gates passed1855 root tests plus one existing TODO and22 MCP tests; eight new ordering/oracle cases and a restored-sort regression control support the contract. The final gate rerun found this report's initially missing mandatory headings, which were corrected before another run. External provider CLI review remains unavailable after automatic approval review rejected source export earlier in this task; this report is the independent in-session review, not a provider CLI result.

## Round outcome

Accepted with no material implementation findings. Minor F0 wording is repaired and content-checked. Hosted delivery and game-level measurements remain separate acceptance steps.
