# Benchmark regression gate + churn scenario — DESIGN

**Objective:** `benchmark-gate` · **Status:** v2 (post design-1 review — Codex HIGH+2×MEDIUM and Claude HIGH+MEDIUM + implementation cautions adopted; Gemini approved v1) · **Origin:** full-review 2026-06-10 documented-deferred items ("benchmark gate before optimizing the query-cache wall"; project-state assessment item 5).

## Problem

`scripts/rts-benchmark.mjs` measures tick cost, query-cache behavior, pathfinding, and occupancy — but nothing *gates* on it. A change that doubles tick cost or breaks query-cache reuse ships green. Two specific gaps:

1. **No regression detection.** The 2026-06-09 layer-chain split shipped with only an absolute sanity check ("0.76 ms avg tick") because no baseline existed to compare against.
2. **The known scale wall is unmeasured.** The full review identified entity-churn-through-query-cache-maintenance as the first RTS-scale wall (every component add/remove walks all cached query arrays). The benchmark only measures steady-state stepping — a churn regression (or future fix) is invisible.

Also in scope: `renderMarkdown` reads `scenario.spatialFullScans.min` / `spatialScannedEntities.min`, fields `runScenario` has not produced since the explicit-sync migration — `--format markdown` currently **throws a TypeError** (property read on `undefined`); markdown mode is fully broken, not cosmetically wrong. Fixed as part of touching this script, with a markdown smoke test (the renderer moves to the gate module so it is unit-testable).

## Goals

- A CI step that fails on performance regressions with near-zero flake rate.
- A churn-wave scenario that makes the query-cache wall a measured number.
- A baseline lifecycle that is explicit (regenerating it is a reviewed, committed act).

## Non-goals

- Optimizing anything (the gate comes first, by design).
- Micro-benchmarks of individual functions; scenarios stay holistic (engine-level).
- Statistical rigor beyond what a shared CI runner can support — the time gate is deliberately coarse.

## Design

### 1. Two-tier gate: exact counters + coarse calibrated time

The engine is deterministic and the benchmark scenarios are seeded with no wall-clock or `Math.random` inputs. Therefore every **operation counter** the benchmark observes is *exactly* reproducible across runs and machines (and must be identical across the CI Node 20/22 matrix):

- per-scenario summed `query.cacheHits` / `query.cacheMisses` / `query.calls` / `query.results` (results is the membership-cardinality fingerprint cacheHits cannot see — design-1 Codex MEDIUM)
- summed `query.membershipChecks` — **new engine metric** (additive `WorldMetrics.query` field incremented once per cache entry examined in `updateQueryCacheMembership`): makes query-cache maintenance an exact tier-1 number, so the wall this objective exists to measure gates hard, and a future optimization surfaces as a reviewed baseline regen (design-1 Claude MEDIUM)
- summed `spatial.explicitSyncs`
- summed `diffSizeBytes` (raw unrounded byte sums — never `round()`ed `summarize()` values; JSON of integer-only component data; insertion-order serialization is spec-pinned)
- pathfinding `cacheHitsSecondPass` / `cacheMissesSecondPass`
- occupancy counters the report already emits (`bindingQueries.*`, `occupancy.*`, `crowding.*`, placement totals — all integer-deterministic)
- churn scenario: entities created/destroyed totals and the counters above

**Determinism invariants tier 1 rests on** (stated so future scenario authors do not silently break it): no wall-clock control flow in any scenario (budgets are counts, not ms), no `Math.random`/`Date.now`, integer-only component data (or at minimum nothing fed through non-correctly-rounded transcendental math), and a seeded `WorldConfig.seed`. As a free self-check, tier 2's median-of-3 in-process runs assert all three runs produced **identical counters** — a determinism violation fails loudly before it becomes a confusing cross-machine baseline mismatch.

**Tier 1 (hard, exact):** counters must equal the committed baseline exactly. Any drift means an algorithmic change — intended changes regenerate the baseline via `--update-baseline` in the same commit, which makes perf-relevant behavior changes visible in review diffs. Zero noise, zero flakes.

**Tier 2 (soft, calibrated ratio):** wall-clock per scenario, normalized by a calibration workload (fixed-iteration arithmetic loop, ~50-100 ms class) run in the same process; both sides take the median of 3 runs. The gate compares `scenarioMs / calibrationMs` against the baseline's stored ratio and fails only above a generous multiplier (default **3.0×**, env-overridable via `BENCH_RATIO_MAX`). This catches constant-factor regressions counters cannot see (e.g., an accidental `structuredClone` in the hot path) while tolerating runner variance. A 20-50 % regression will NOT trip tier 2 — that is an accepted trade for flake-free CI; tier 1 catches the algorithmic class, and humans reading `--format markdown` output catch the middle.

### 2. Churn scenario

New scenario `churn` (always on, CI-affordable):

- 96×96 grid, 4 000 baseline entities with `position` + `velocity` + `team` + one of 4 marker components (`infantry`/`archer`/`cavalry`/`siege`).
- **8 cached query shapes, pinned exactly** (the baseline freezes them): (1) `position`+`velocity` (movement), (2–5) `position`+each marker, (6) `position`+`team`, (7) bare `position`, (8) `position`+`projectile`.
- A `churnSystem` spawns **150 projectile entities** per tick carrying `position` + `velocity` + `projectile`, and destroys the 150 spawned two ticks earlier (deterministic ring buffer). **Why these components (design-1 HIGH, both reviewers):** `updateQueryCacheMembership`'s expensive path — `insertSorted` / `indexOf`+`splice` on cached arrays — runs only when the entity matches a cached mask on exactly one side of the change. v1's marker-only projectiles matched no populated shape and would have measured spawn bookkeeping, not the wall. With `velocity`, every spawn/destroy splices shapes (1), (7), and (8) — including the ~4 000-element movement and bare-position arrays — and LIFO-recycled entity ids make each destroy's `indexOf` scan nearly the full array. Maintenance becomes the dominant measured term.
- 20 measured ticks after 3 warmup ticks. Reported: tick duration summary, summed counters, created/destroyed totals.

Expected cost: well under a second per run; runs in default mode (no `--stress` needed) so the gate always exercises it.

### 3. Baseline lifecycle

- `benchmarks/baseline.json`, committed. Shape: `{ schemaVersion, generatedWith: { engineVersion, node, date }, scenarios: { [name]: { counters: {...}, timeRatio } } }`. `generatedWith` is informational only — comparisons never read it.
- `node scripts/rts-benchmark.mjs --check` → exit 1 with a structured per-failure message (counter name, expected, actual, "regenerate with --update-baseline if intended"). `--check` compares the **exact scenario set**: a baseline scenario missing from the run, or vice versa, fails. `--check` + `--stress` is refused (the committed baseline covers the default set only).
- `--update-baseline` rewrites the file from the current run (counters exact; timeRatio from this machine — see risk below).
- Repo convention: regenerating the baseline is a normal code change — it goes through the same multi-CLI review as the change that caused it, and the reviewer sees exactly which counters moved.

### 4. Time-ratio portability risk (accepted, mitigated)

`timeRatio` in a baseline generated on the dev machine may not match CI's ratio: the calibration loop is pure arithmetic while scenarios are allocation-heavy (diff `JSON.stringify`), so the ratio normalizes CPU speed but not GC/allocator behavior, and TurboFan differences across Node majors shift it further. The calibration loop must consume its checksum so V8 cannot dead-code it. Mitigations: (a) the 3.0× multiplier absorbs realistic skew; (b) `--check` prints both ratios on success too, so drift is observable before it gates; (c) if a platform proves pathological, `BENCH_RATIO_MAX` can be raised per-job without touching the baseline. Tier 1 is unaffected — it is the load-bearing gate.

### 5. File layout & CI

- `scripts/rts-benchmark.mjs` keeps scenario definitions + run logic; gains the churn scenario and `--check` / `--update-baseline` flags.
- Comparison, calibration, baseline schema/IO, and the (fixed) markdown renderer move to `scripts/benchmark-gate.mjs` (imported by the main script; renderer there so it is unit-testable) — design-1 flagged that the 427-line main script cannot absorb everything within the 500-line budget, which applies in spirit to `scripts/` even though `tests/loc-budget.test.ts` scopes `src`+`tests`.
- **Engine change:** `WorldMetrics.query.membershipChecks` (additive field) + one increment per examined cache entry in `updateQueryCacheMembership` + `createMetrics`/`cloneMetrics` plumbing + api-reference row + unit test. Small, in-objective, and the reason the wall is tier-1-gateable.
- CI: one additional step in the existing job, after `npm run build`: `node scripts/rts-benchmark.mjs --check`. Runs on both matrix Node versions (tier 1 must agree across them — that itself is a determinism assertion).
- `package.json`: `benchmark:check` and `benchmark:update-baseline` scripts, both `npm run build &&`-prefixed like `benchmark:rts` (a stale local `dist` must not regenerate a wrong baseline). CI uses the raw `node scripts/rts-benchmark.mjs --check` form, having just built.

### 6. Testing the gate itself

`tests/benchmark-gate.test.ts` unit-tests the comparison logic (pure functions imported from `benchmark-gate.mjs`): exact-counter mismatch → structured failure; ratio above/below threshold; baseline schema validation; `--update-baseline` round-trip via temp file. The scenarios themselves are exercised by running the gate in CI, not by vitest (keeping `npm test` fast).

## Alternatives considered

- **Gate only on time with tight thresholds** — rejected: shared-runner noise makes <2× thresholds flaky and >2× thresholds nearly useless; counters give exactness for free because the engine is deterministic.
- **Run baseline-vs-HEAD twice in CI (A/B on same runner)** — rejected for now: doubles CI time and requires building two checkouts; revisit if tier 2 proves too coarse.
- **Store absolute ms with per-machine calibration files** — rejected: per-machine state invites stale baselines; one committed ratio + generous bound is simpler and honest about its precision.

## Risks

- Counter equality across Node majors could in principle drift if V8 changes Map iteration affecting... nothing — counters derive from engine logic that is already pinned by the determinism test suite. If a Node upgrade ever breaks tier 1, that is a real determinism finding, not gate noise.
- Churn scenario parameters may need tuning once aoe2-scale numbers exist; parameters are constants at the top of the scenario, and the baseline regenerates with them.

## Test plan

Unit tests per §6; one full local `--update-baseline` + `--check` round-trip; CI green on both Node versions; deliberate sabotage check during implementation (temporarily inflate a counter path, observe tier-1 failure message quality) — not committed.
