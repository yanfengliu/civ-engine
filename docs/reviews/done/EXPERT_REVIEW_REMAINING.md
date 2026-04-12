# Expert Review Remaining Candidates

Status: DONE on 2026-04-11

This document is retained under `docs/reviews/done/` as the closure record for the previously active remaining-candidates note.

## Outcome

The remaining candidates from the expert review are still valid ideas, but they are not active implementation work for the engine in its current state.

They were closed out of `docs/reviews/todo/` because the current codebase already has the lighter-weight mechanisms that were meant to land first, and there is no measured workload showing that the heavier changes are justified yet.

## Closed Candidates

### Struct-of-Arrays Components

Deferred intentionally.

Why it is not active work now:

- The engine already has benchmark coverage through `npm run benchmark:rts`.
- The docs already state that storage and scheduling changes should be driven by measured bottlenecks rather than guesswork.
- There is no current benchmark evidence in the repo showing that plain object component iteration is the dominant bottleneck.

Re-open this only when:

- benchmark data shows component iteration or numeric hot loops are the limiting factor
- a concrete migration plan exists for mixed plain-object and typed-array component models
- the public API and documentation can explain that second storage model clearly

### Dependency Graph Scheduling

Deferred intentionally.

Why it is not active work now:

- The engine now has explicit system phases: `input`, `preUpdate`, `update`, `postUpdate`, and `output`.
- Current docs already describe the synchronous phase-ordered pipeline and explicitly say there is no dependency graph or parallelism.
- There is no current game workload in the repo demonstrating that phase ordering is insufficient.

Re-open this only when:

- a real game integration shows recurring ordering problems that phases cannot express cleanly
- there is a concrete design for deterministic dependency declarations and failure handling
- parallel execution is justified by measured workloads, not just anticipated scale

## Resolution

- [x] Re-checked the current engine state against the remaining candidates.
- [x] Confirmed that lightweight phases already landed and cover the near-term scheduling need.
- [x] Confirmed that SoA storage is still a benchmark-driven future optimization, not an active gap.
- [x] Archived this note from `docs/reviews/todo/` to `docs/reviews/done/`.
