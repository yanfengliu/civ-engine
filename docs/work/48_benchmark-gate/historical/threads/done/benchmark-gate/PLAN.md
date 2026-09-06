# Benchmark regression gate — PLAN

**Objective:** `benchmark-gate` · per DESIGN.md v2 (post design-1 review). Steps are TDD-first where the artifact is testable (the comparison library); the scenarios themselves are validated by running the gate.

## Steps

0. **Engine metric (TDD first):** `WorldMetrics.query.membershipChecks` — additive field in `world-types.ts` WorldMetrics, increment per examined cache entry in `updateQueryCacheMembership` (`world-queries.ts`), zero-init in `createMetrics` + copy in `cloneMetrics` (`world-internal.ts`), api-reference metrics table row. Tests in a new `tests/world-metrics-membership.test.ts` (the natural home — `tests/world.test.ts` is ratchet-pinned): churn under cached queries counts per examined cache entry; zero when no caches exist; survives `getMetrics()` cloning.
1. **`scripts/benchmark-gate.mjs`** (new, ≤500 lines): comparison + calibration + baseline schema/IO + markdown renderer (moved from main script).
   - `compareCounters(baseline, actual)` → `{ ok, failures: [{ scenario, counter, expected, actual }] }` (exact equality).
   - `compareTimeRatios(baseline, actual, maxMultiplier)` → `{ ok, failures: [{ scenario, baselineRatio, actualRatio, multiplier }] }`.
   - `validateBaseline(json)` → structured schema check (schemaVersion 1).
   - `runCalibration()` → median-of-3 ms of a fixed arithmetic workload (~5M sqrt-sum iterations, result consumed so V8 cannot dead-code it).
   - `medianOf(fn, n)` helper.
   No I/O in comparison functions (testable); calibration is the only timed piece.
2. **`tests/benchmark-gate.test.ts`** (TDD: written first, red): mismatch detection per counter; ratio above/below threshold; schema rejection (missing fields, wrong version); pass-through success shape. Imports the `.mjs` directly (vitest handles ESM).
3. **`scripts/rts-benchmark.mjs` changes:**
   - `renderMarkdown` moves to benchmark-gate.mjs with the stale-field fix (`spatialExplicitSyncs`) + churn lines; markdown smoke test in the unit tests (currently `--format markdown` throws TypeError).
   - Add `churn` scenario per DESIGN §2 v2: projectiles carry position+velocity+projectile; the 8 cached shapes pinned exactly (movement, 4 markers, team, bare position, projectile); constants at top; ring-buffer destroy of the cohort spawned two ticks earlier.
   - Counter extraction: per-scenario `counters` object — summed query calls/results/cacheHits/cacheMisses/membershipChecks, explicitSyncs, raw diffBytes, path second-pass hits+misses, occupancy integer counters, churn created/destroyed — added to the report alongside existing summaries (raw integer sums, never round()ed).
   - Tier-2 median-of-3 runs assert identical counters across the 3 in-process runs (determinism self-check).
   - `--check` + `--stress` refused; exact scenario-set equality between baseline and run.
   - Flags: `--check` (load `benchmarks/baseline.json`, run scenarios, tier-1 + tier-2 compare, print structured failures, exit 1), `--update-baseline` (write file), both reusing the normal run path. `BENCH_RATIO_MAX` env override (default 3.0).
   - Keep ≤500 lines (move any overflow into benchmark-gate.mjs).
4. **`benchmarks/baseline.json`**: generate on this machine via `--update-baseline`; commit.
5. **`package.json`**: `benchmark:check`, `benchmark:update-baseline` scripts, both `npm run build &&`-prefixed (stale dist must not mint a baseline); CI uses the raw node invocation post-build.
6. **CI**: add `- run: node scripts/rts-benchmark.mjs --check` after the build step (both matrix Node versions — tier 1 agreement across majors is itself asserted).
7. **Sabotage check (not committed):** temporarily double a counter path locally, confirm tier-1 failure message quality; revert.
8. **Docs:** changelog entry (new version), devlog summary + detailed, README Feature Overview row is NOT needed (dev tooling, not engine API); `docs/guides/debugging.md` or README "Quick Start" mention of `benchmark:check`? → one line in README Quick Start block. ARCHITECTURE.md: no structural change (tooling). Drift-log: no (not structural). api-reference: no (no API).
9. **Gates + multi-CLI impl review** (diff review per AGENTS.md), REVIEW.md iterations, move thread to done, version bump (c), commit, push.

## Risks / notes

- vitest importing `.mjs` from `scripts/`: plain ESM with no TS — works; lint scope is `src tests` so the new script stays unlinted (acceptable; consistent with existing scripts — noted for objective G's lint-scope question).
- Baseline counters must be identical across Node 20/22 — if generation on this machine (Node version X) disagrees with CI, that is a genuine determinism finding to investigate, not to paper over.
- `--check` runs the full scenario set (~seconds); fine for CI.
