# Update changed visibility sources and support true centers

Status: planned
Owner: Codex adoption worker; root acceptance and integration
Created: 2026-11-08
Updated: 2026-11-08

## Problem and outcome

VisibilityMap currently rerasterizes every source of each dirty player. Work79 already caches canonical player/source/explored ordering, so repeated unchanged serialization is not a fresh gap; explored growth still invalidates its whole sorted array. Support approved finite fractional centers, reduce sparse update work, incrementally merge explored ordering, and expose honest detached work counters while preserving old integer outputs, source batching and existing metrics.

## Scope

Engine E17/E18/E19 capability only. Owner explicitly approved fractional persisted source values and later scoped AoE2 true-center adoption through the root on2026-11-08. The exact predecision proposal is retained unchanged at [snapshots/0_owner-approved-proposal.md](snapshots/0_owner-approved-proposal.md), SHA256134BD429EA29617A345C5A1D7EF2E3BD277C34D32E7E983CD3D7FD4F0D87CB3D; its historical Pending text is superseded by that owner approval, not silently edited. Work71 M5 supplies the detailed earlier contract, refreshed by [design.md](design.md). No new dependency, grid query coordinate change, state fields, game policy, consumer edits, instruction changes or safety opt-out. Root owns canonical priorities, work84 and all game adoption.

Current isolated base2bbace65 (engine2.10.0) includes work79. Root work84 is separate and intends2.10.1; refresh onto its accepted main before release and use planned minor2.11.0. Own tree C:/Users/38909/Documents/github/civ-engine-worktrees/incremental-visibility-1107, branch codex/incremental-visibility-1107. Initial node_modules was absent; private scripts-disabled npm ci installed150 packages on Node24.22.1/npm11.6.2. Primary package/lock/dist/dependency hashes are recorded. No shared build/install, source implementation, tests or benchmark has run for85.

## Approach

Separate source-center validation from point-query validation. Keep current source maps and cached canonical identities; add pending source identities, last-applied values/coverage and sparse safe-number overlap counts behind private helper composition. Flush only final batch values, never transient exploration. Add VisibilityMapWorkMetrics/getWorkMetrics with the exact five counters from M5, excluding output copies and wall time. Explore only final visible cells, and merge pending newly explored indices when canonical output is requested. Keep every existing VisibilityMapMetrics field and its current recompute/query semantics unchanged.

Start with the direct sparse-count design for correctness. Measure it against current2.10.x ordering caches on both sparse and dense motion before accepting it. A slower actual unit-layer result rejects that candidate; a static-heavy win alone is insufficient. If needed, propose the concrete equivalent dense-rebuild branch and its cold-to-sparse transition/counter bounds described in design.md before implementing that fallback. No public strategy switch or unmeasured universal speed claim.

## Acceptance criteria

- [ ] Root accepts this refreshed plan before product implementation.
- [ ] Tests first prove literal fractional cells/error ordering, batch final-state semantics, overlaps/removals/load/clear/revert, exact old integer state/metrics and detached output against independent cell scans; relevant regressions fail real assertions.
- [ ] After warmup, the128x128/277 stationary radius5 plus2 moving radius3 fixture rasterizes no unchanged sources in its sparse batches. Work counters reflect actual helper operations; reset/getWorkMetrics do not flush or invalidate state.
- [ ] Repeated unchanged serialization performs no sort/merge; explored growth and identity churn preserve canonical code-unit/numeric order and exact load/duplicate/extra-field behavior.
- [ ] Fresh actual unit-layer traces from immutable baseline bridge plus synthetic all-moving cases pass equal-state/old-metric checks. Comparable paired timing and retained-memory evidence include sparse, dense, mode transitions if any, live/restored and initial-load costs; no unsupported whole-game gain or constant-memory claim.
- [ ] Exact independent review, minor release/public fixtures/API/guides/migration updates, required11 gates under root's exclusive slot, normal main/push, terminal Node20/22/24/publish, retained archive verification and owned cleanup complete.

## Implementation steps

- [x] Read current work79/M5/source/query semantics and current AoE2 layering; verify actual retained saves and owner-proposal digest; prepare private dependencies.
- [ ] Accept refreshed plan; write literal TDD contracts and implement bounded helpers without changing game code.
- [ ] Under an explicit later slot, capture an actual operation trace from immutable baseline input and measure candidate versus current shipped baseline; retain raw results and reject regressions.
- [ ] Freeze exact candidate, obtain independent review and full-gate acceptance, then deliver and clean only owned resources.

## Outcome

Plan prepared, awaiting root acceptance. No85product code, test, build, benchmark or game capture has run. The four actual saves are read-only evidence, not a captured operation trace:120x120 at ticks24000/36000 has57/71 unit sources;168x168 has144/142. Future trace capture must use the immutable a0e10435 export supplied by root, never the currently changing engine-pin tracked tree. Raw installation/input receipts stay under ignored tmp/visibility-incremental-1107. Work83 is fully delivered/cleaned; root work84 carries its permanent closure records.
