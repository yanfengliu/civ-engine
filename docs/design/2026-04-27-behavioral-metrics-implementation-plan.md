# Behavioral Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Plan revision:** v1 (2026-04-27).

**Goal:** Implement Spec 8 (Behavioral Metrics over Corpus) per `docs/design/2026-04-27-behavioral-metrics-design.md` (v4, converged after 4 multi-CLI design review iterations).

**Architecture:** Adds an accumulator-style `Metric<TState, TResult>` contract, a synchronous `runMetrics(bundles, metrics)` reducer over `Iterable<SessionBundle>`, 11 engine-generic built-in metric factories, and a thin `compareMetricsResults(baseline, current)` delta helper. Pure functional, exact, single-pass-multiplexed.

**Tech Stack:** TypeScript 5.7+, Vitest 3, ESLint 9, Node 18+. ESM + Node16 module resolution.

**Spec sections referenced:** §-numbered references map 1:1 to sections in `2026-04-27-behavioral-metrics-design.md`.

**Branch:** None — direct-to-main per AGENTS.md (solo-developer policy).

**Versioning:** Branch base `v0.8.1` (after Spec 3 merge). T1 = `v0.8.2` (c-bump, additive). T2 = `v0.8.3` (c-bump, integration tests + arch docs).

**Shell:** bash on Windows (mingw). Unix syntax (`/tmp/`, `&`, `$()`, `[ -s file ]`, `mkdir -p`).

---

## Per-task review and doc pattern

### A. Per-task documentation (in same commit as code)

Per AGENTS.md doc-discipline:

- `docs/changelog.md` — version entry.
- `docs/devlog/summary.md` — one line.
- `docs/devlog/detailed/<latest>.md` — full entry (find via `ls -1t docs/devlog/detailed/ | head -1`).
- `docs/api-reference.md` — sections for new public types/methods.
- `package.json` + `src/version.ts` + `README.md` (badge) — version bump.

T1 also: ADRs 23 + 24 in `docs/architecture/decisions.md` (numbered after Spec 3's ADRs 17-22 land); new `docs/guides/behavioral-metrics.md`; README.md Feature Overview row + Public Surface bullet; `docs/README.md` index entry.

T2 also: `docs/architecture/ARCHITECTURE.md` Component Map row + `docs/architecture/drift-log.md` entry + `docs/design/ai-first-dev-roadmap.md` Spec 8 status update + `docs/guides/ai-integration.md` Tier-2 reference + `docs/guides/synthetic-playtest.md` cross-reference to behavioral-metrics.

### B. Per-task multi-CLI review (before commit)

After all four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`) but before the commit:

```bash
mkdir -p docs/reviews/behavioral-metrics-T<N>/$(date +%Y-%m-%d)/1/raw

cat > /tmp/review-prompt.txt <<'EOF'
[task-specific code-review prompt — see Spec 8 design + per-task scope]
EOF

PROMPT=$(cat /tmp/review-prompt.txt)

# Use HEAD~1..HEAD as the base (this task's diff is one commit on main).
git diff HEAD~0 --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh \
  -c approval_policy=never --sandbox read-only --ephemeral "$PROMPT" \
  > docs/reviews/behavioral-metrics-T<N>/$(date +%Y-%m-%d)/1/raw/codex.md 2>&1 &

git diff HEAD~0 --staged | claude -p --model opus --effort xhigh \
  --append-system-prompt "$PROMPT" \
  --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" \
  > docs/reviews/behavioral-metrics-T<N>/$(date +%Y-%m-%d)/1/raw/opus.md 2>&1 &

# Wait via background poller.
until [ -s docs/reviews/behavioral-metrics-T<N>/$(date +%Y-%m-%d)/1/raw/codex.md ] && \
      [ -s docs/reviews/behavioral-metrics-T<N>/$(date +%Y-%m-%d)/1/raw/opus.md ]; do
  sleep 8;
done

# Synthesize REVIEW.md, address findings, iterate if needed, then commit.
```

If a reviewer is unreachable (Gemini quota-out has been the running condition), proceed with the remaining reviewer per AGENTS.md.

### C. Convergence rule

Iterate per-task review until both reviewers ACCEPT OR remaining findings are nitpicks (per AGENTS.md "Continue iterating until reviewers nitpick instead of catching real bugs"). Apply the AGENTS.md "Do not get stuck in an infinite loop" rule — 3 iterations is the soft cap.

### D. Engine gates (mandatory before commit)

```bash
npm test            # all pass
npm run typecheck   # no type errors
npm run lint        # clean
npm run build       # clean
```

---

## Task 1: Metric contract + 11 built-ins + runMetrics + compareMetricsResults (v0.8.2, c-bump)

**Goal:** Land the entire Spec 8 surface in one commit — all types, all built-ins, the reducer, the delta helper, unit tests, and the api-reference + guide. T2 adds determinism integration tests + arch docs but ships no new public API.

**Files:**
- Create: `src/behavioral-metrics.ts` — types + `runMetrics` + 11 built-in factories + `compareMetricsResults`.
- Modify: `src/index.ts` — re-export the public surface.
- Create: `tests/behavioral-metrics-types.test.ts` — `Stats` shape + `MetricsResult` shape.
- Create: `tests/behavioral-metrics-builtins.test.ts` — 11 built-ins, each with empty/single/multi-bundle cases.
- Create: `tests/behavioral-metrics-runner.test.ts` — `runMetrics` multiplexing, duplicate-name rejection, iterable-consumed-once.
- Create: `tests/behavioral-metrics-compare.test.ts` — `compareMetricsResults` numeric/null/opaque/only-in-side/nested-record/array cases.
- Modify: `docs/api-reference.md` — Behavioral Metrics section.
- Create: `docs/guides/behavioral-metrics.md` — quickstart + custom-metric authoring + CI pattern.
- Modify: `docs/architecture/decisions.md` — ADRs 23 + 24.
- Modify: `docs/README.md` — index entry.
- Modify: `README.md` — Feature Overview row + Public Surface bullet + version badge.
- Modify: `docs/changelog.md`, `docs/devlog/summary.md`, latest `docs/devlog/detailed/*.md`.
- Modify: `package.json` (`0.8.2`), `src/version.ts` (`0.8.2`).

### Step 1: Write failing test for `Stats` shape + `bundleCount`

- [ ] Create `tests/behavioral-metrics-types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Stats } from '../src/behavioral-metrics.js';

describe('Stats shape', () => {
  it('numeric fields are number | null', () => {
    const empty: Stats = { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
    expect(empty.count).toBe(0);
    expect(empty.min).toBeNull();
  });

  it('JSON round-trip preserves null fields', () => {
    const empty: Stats = { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
    const round = JSON.parse(JSON.stringify(empty)) as Stats;
    expect(round).toEqual(empty);
  });
});
```

- [ ] Create `tests/behavioral-metrics-builtins.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bundleCount, runMetrics } from '../src/behavioral-metrics.js';
import type { SessionBundle } from '../src/index.js';

const mkBundle = (overrides: Partial<SessionBundle> = {}): SessionBundle => ({
  schemaVersion: 1,
  metadata: {
    sessionId: 's-1', engineVersion: '0.8.2', nodeVersion: 'v20',
    recordedAt: 't', startTick: 0, endTick: 10, persistedEndTick: 10,
    durationTicks: 10, sourceKind: 'session',
  },
  initialSnapshot: {} as never,
  ticks: [], commands: [], executions: [], failures: [], snapshots: [], markers: [], attachments: [],
  ...overrides,
}) as SessionBundle;

describe('bundleCount', () => {
  it('empty corpus returns 0', () => {
    const result = runMetrics([], [bundleCount()]);
    expect(result.bundleCount).toBe(0);
  });

  it('single-bundle corpus returns 1', () => {
    const result = runMetrics([mkBundle()], [bundleCount()]);
    expect(result.bundleCount).toBe(1);
  });

  it('multi-bundle corpus counts correctly', () => {
    const result = runMetrics([mkBundle(), mkBundle(), mkBundle()], [bundleCount()]);
    expect(result.bundleCount).toBe(3);
  });
});
```

### Step 2: Run tests to verify failure

- [ ] Run: `npm test -- tests/behavioral-metrics`
- [ ] Expected: FAIL — `Cannot find module '../src/behavioral-metrics.js'`.

### Step 3: Implement `src/behavioral-metrics.ts` types + `bundleCount` + minimal `runMetrics`

- [ ] Create `src/behavioral-metrics.ts`:

```ts
import type { SessionBundle } from './session-bundle.js';
import type { JsonValue } from './json.js';

export interface Stats {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}

export interface Metric<TState, TResult> {
  readonly name: string;
  create(): TState;
  observe(state: TState, bundle: SessionBundle): TState;
  finalize(state: TState): TResult;
  merge?(a: TState, b: TState): TState;
  readonly orderSensitive?: boolean;
}

export type MetricsResult = Record<string, unknown>;

export function runMetrics<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
>(
  bundles: Iterable<SessionBundle<TEventMap, TCommandMap, TDebug>>,
  metrics: Metric<unknown, unknown>[],
): MetricsResult {
  // Validate uniqueness.
  const names = new Set<string>();
  for (const m of metrics) {
    if (names.has(m.name)) {
      throw new RangeError(`duplicate metric name: ${m.name}`);
    }
    names.add(m.name);
  }
  // Initialize accumulator state.
  const states: unknown[] = metrics.map((m) => m.create());
  // Single-pass observe.
  for (const bundle of bundles) {
    for (let i = 0; i < metrics.length; i++) {
      states[i] = metrics[i].observe(states[i], bundle as unknown as SessionBundle);
    }
  }
  // Finalize.
  const result: MetricsResult = {};
  for (let i = 0; i < metrics.length; i++) {
    result[metrics[i].name] = metrics[i].finalize(states[i]);
  }
  return result;
}

export function bundleCount(name: string = 'bundleCount'): Metric<{ count: number }, number> {
  return {
    name,
    create: () => ({ count: 0 }),
    observe: (state) => {
      state.count++;
      return state;
    },
    finalize: (state) => state.count,
  };
}
```

### Step 4: Run tests — expect PASS

- [ ] Run: `npm test -- tests/behavioral-metrics`
- [ ] Expected: PASS for `Stats shape` + `bundleCount` tests.

### Step 5: Add `Stats`-helper internals + `sessionLengthStats`

- [ ] Append to `src/behavioral-metrics.ts`:

```ts
function computeStats(values: number[]): Stats {
  const count = values.length;
  if (count === 0) {
    return { count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[count - 1];
  const mean = sorted.reduce((s, v) => s + v, 0) / count;
  // NumPy linear / R type 7 percentile.
  const percentile = (p: number): number => {
    if (count === 1) return sorted[0];
    const idx = (count - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    count, min, max, mean,
    p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99),
  };
}

export function sessionLengthStats(name: string = 'sessionLengthStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      state.push(bundle.metadata.durationTicks);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}
```

- [ ] Add tests for `sessionLengthStats` to `tests/behavioral-metrics-builtins.test.ts`:

```ts
import { sessionLengthStats } from '../src/behavioral-metrics.js';
import type { Stats } from '../src/behavioral-metrics.js';

describe('sessionLengthStats', () => {
  it('empty corpus returns count:0 + null fields', () => {
    const result = runMetrics([], [sessionLengthStats()]);
    expect(result.sessionLengthStats).toEqual({
      count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null,
    });
  });

  it('single-bundle corpus has degenerate equal stats', () => {
    const bundle = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 42 } });
    const result = runMetrics([bundle], [sessionLengthStats()]);
    const stats = result.sessionLengthStats as Stats;
    expect(stats.count).toBe(1);
    expect(stats.min).toBe(42);
    expect(stats.max).toBe(42);
    expect(stats.mean).toBe(42);
    expect(stats.p50).toBe(42);
    expect(stats.p95).toBe(42);
    expect(stats.p99).toBe(42);
  });

  it('multi-bundle corpus matches hand-computed percentiles (NumPy linear / R type 7)', () => {
    // values: [10, 20, 30, 40, 50]; count=5
    // p50: idx=(5-1)*0.5=2 → sorted[2]=30
    // p95: idx=(5-1)*0.95=3.8 → lo=3 hi=4; v=sorted[3]+(sorted[4]-sorted[3])*0.8 = 40+10*0.8 = 48
    // p99: idx=3.96 → lo=3 hi=4; v=40+10*0.96 = 49.6
    const values = [10, 20, 30, 40, 50];
    const bundles = values.map((v) => mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: v } }));
    const result = runMetrics(bundles, [sessionLengthStats()]);
    const stats = result.sessionLengthStats as Stats;
    expect(stats.count).toBe(5);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(50);
    expect(stats.mean).toBe(30);
    expect(stats.p50).toBe(30);
    expect(stats.p95).toBeCloseTo(48, 6);
    expect(stats.p99).toBeCloseTo(49.6, 6);
  });
});
```

### Step 6: Run tests — expect PASS

### Step 7: Implement remaining built-ins one at a time, with tests

For each of the 9 remaining built-ins, follow TDD: failing test first, then implementation. Each is a small accumulator pattern modeled on `bundleCount` (counters) or `sessionLengthStats` (Stats over a buffered numeric).

- [ ] **`commandRateStats`**: state is `number[]`; observe pushes `bundle.metadata.durationTicks > 0 ? bundle.commands.length / bundle.metadata.durationTicks : 0`; finalize is `computeStats`.

- [ ] **`eventRateStats`**: same shape; pushes `durationTicks > 0 ? sum(bundle.ticks[i].events.length) / durationTicks : 0`.

- [ ] **`commandTypeCounts`**: state is `Map<string, number>`; observe iterates `bundle.commands` and increments by `cmd.type`; finalize converts to plain object.

- [ ] **`eventTypeCounts`**: same shape over `bundle.ticks[].events[].type`.

- [ ] **`failureBundleRate`**: state `{ withFailure: number; total: number }`; observe increments `total` and `withFailure` if `bundle.metadata.failedTicks?.length > 0`; finalize returns `total > 0 ? withFailure / total : 0`.

- [ ] **`failedTickRate`**: state `{ failedTicks: number; durationTicks: number }`; observe sums both; finalize returns `durationTicks > 0 ? failedTicks / durationTicks : 0`.

- [ ] **`incompleteBundleRate`**: state `{ incomplete: number; total: number }`; observe counts `metadata.incomplete === true`; finalize returns `total > 0 ? incomplete / total : 0`.

- [ ] **`commandValidationAcceptanceRate`**: state `{ accepted: number; total: number }`; observe iterates `bundle.commands` summing `total` and `accepted` if `cmd.result.accepted`; finalize returns `total > 0 ? accepted / total : 0`.

- [ ] **`executionFailureRate`**: state `{ failed: number; total: number }`; observe iterates `bundle.executions` summing `total` and `failed` if `!exec.executed`; finalize returns `total > 0 ? failed / total : 0`.

For each: write 3 tests (empty, single-bundle, multi-bundle) before implementing. Verify expected NumPy-linear percentiles for any `Stats` metrics (per spec §5.3).

### Step 8: Implement `runMetrics` extended cases (multiplexing, dup-name, iterable-consumed-once)

- [ ] Add to `tests/behavioral-metrics-runner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  bundleCount, sessionLengthStats, commandTypeCounts,
  runMetrics,
} from '../src/behavioral-metrics.js';
import type { Metric } from '../src/behavioral-metrics.js';

// (use mkBundle from -builtins.test.ts via shared helper or copy)

describe('runMetrics', () => {
  it('multiplexes 11 built-ins in one pass', () => {
    const metrics = [
      bundleCount(), sessionLengthStats(), /* ... all 11 */
    ];
    const result = runMetrics([mkBundle()], metrics);
    expect(Object.keys(result)).toHaveLength(11);
  });

  it('throws on duplicate metric names', () => {
    expect(() => runMetrics([], [bundleCount(), bundleCount()])).toThrow(RangeError);
  });

  it('iterates once: generator-source bundles are consumed', () => {
    let yielded = 0;
    function* source() {
      yielded++;
      yield mkBundle();
      yielded++;
      yield mkBundle();
    }
    const it1 = source();
    const r1 = runMetrics(it1, [bundleCount()]);
    expect(r1.bundleCount).toBe(2);
    // Same iterator, second call sees 0 bundles.
    const r2 = runMetrics(it1, [bundleCount()]);
    expect(r2.bundleCount).toBe(0);
  });
});
```

- [ ] Run: `npm test -- tests/behavioral-metrics-runner`
- [ ] Expected: PASS.

### Step 9: Implement `compareMetricsResults`

- [ ] Append to `src/behavioral-metrics.ts`:

```ts
export type NumericDelta = {
  baseline: number | null;
  current: number | null;
  delta: number | null;
  pctChange: number | null;
};

export type OpaqueDelta = {
  baseline: unknown;
  current: unknown;
  equal: boolean;
};

export type OnlyInComparison = {
  baseline?: unknown;
  current?: unknown;
  onlyIn: 'baseline' | 'current';
};

export type MetricDelta =
  | NumericDelta
  | OpaqueDelta
  | { [key: string]: MetricDelta | OnlyInComparison };

export type MetricsComparison = Record<string, MetricDelta | OnlyInComparison>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

function compareValue(baseline: unknown, current: unknown): MetricDelta {
  // Numeric leaves (with null support).
  if ((typeof baseline === 'number' || baseline === null) &&
      (typeof current === 'number' || current === null)) {
    if (baseline === null || current === null) {
      return { baseline, current, delta: null, pctChange: null };
    }
    const delta = current - baseline;
    let pctChange: number | null;
    if (baseline === 0) {
      pctChange = current === 0 ? 0 : (current > 0 ? Infinity : -Infinity);
    } else {
      pctChange = (current - baseline) / baseline;
    }
    return { baseline, current, delta, pctChange };
  }
  // Plain-object recurse.
  if (isPlainObject(baseline) && isPlainObject(current)) {
    const out: Record<string, MetricDelta | OnlyInComparison> = {};
    const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
    for (const k of allKeys) {
      const inB = k in baseline;
      const inC = k in current;
      if (inB && inC) {
        out[k] = compareValue(baseline[k], current[k]);
      } else if (inB) {
        out[k] = { baseline: baseline[k], onlyIn: 'baseline' };
      } else {
        out[k] = { current: current[k], onlyIn: 'current' };
      }
    }
    return out;
  }
  // Opaque (arrays, type mismatches, strings, booleans).
  return { baseline, current, equal: deepEqual(baseline, current) };
}

export function compareMetricsResults(
  baseline: MetricsResult,
  current: MetricsResult,
): MetricsComparison {
  const out: MetricsComparison = {};
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const k of allKeys) {
    const inB = k in baseline;
    const inC = k in current;
    if (inB && inC) {
      out[k] = compareValue(baseline[k], current[k]) as MetricDelta;
    } else if (inB) {
      out[k] = { baseline: baseline[k], onlyIn: 'baseline' };
    } else {
      out[k] = { current: current[k], onlyIn: 'current' };
    }
  }
  return out;
}
```

- [ ] Add tests for `compareMetricsResults` covering: numeric delta (positive + negative + zero baselines); null baseline + null current; opaque equality (string, boolean, array); only-in-side at top level; only-in-side at nested record level; type mismatch fallback to OpaqueDelta with equal:false.

### Step 10: Run all 4 engine gates

- [ ] `npm test` — all pass.
- [ ] `npm run typecheck` — clean.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — clean.

### Step 11: Update `src/index.ts`

- [ ] Add re-exports:

```ts
export type {
  Metric,
  MetricsResult,
  MetricsComparison,
  MetricDelta,
  NumericDelta,
  OpaqueDelta,
  OnlyInComparison,
  Stats,
} from './behavioral-metrics.js';
export {
  runMetrics,
  compareMetricsResults,
  bundleCount,
  sessionLengthStats,
  commandRateStats,
  eventRateStats,
  commandTypeCounts,
  eventTypeCounts,
  failureBundleRate,
  failedTickRate,
  incompleteBundleRate,
  commandValidationAcceptanceRate,
  executionFailureRate,
} from './behavioral-metrics.js';
```

### Step 12: Doc surface

- [ ] `docs/api-reference.md`: append `## Behavioral Metrics (v0.8.2)` section. Subsections: signature for `Metric`, `MetricsResult`, `MetricsComparison`, `MetricDelta`, `NumericDelta`, `OpaqueDelta`, `OnlyInComparison`, `Stats`, `runMetrics`, `compareMetricsResults`. Per-built-in subsection (signature + 1-2 sentence summary referencing the spec §6.x). Update TOC.

- [ ] Create `docs/guides/behavioral-metrics.md`: quickstart (10 lines: import, `runMetrics(bundles, [bundleCount(), sessionLengthStats()])`, log result), accumulator-contract authoring guide (a real `policySeedSpread` user metric example reading `bundle.metadata.policySeed`), CI pattern (with the `'onlyIn' in val` type-guard idiom), determinism + JSON-stable-null notes, links to spec.

- [ ] `docs/architecture/decisions.md`: append ADR 23 (accumulator contract) + ADR 24 (engine-generic only). Pull text verbatim from design v4 §15. (Spec 8's other ADRs — 25, 26, 27 — also belong here. Land all four in this T1 commit.)

- [ ] `docs/changelog.md`: prepend `## 0.8.2 - 2026-04-27` entry. What shipped: 11 built-in metrics + accumulator contract + comparison helper. Validation: 4 gates clean.

- [ ] `docs/devlog/summary.md`: prepend one line.

- [ ] Latest detailed devlog: append T1 entry per AGENTS.md template.

- [ ] `docs/README.md`: index `[Behavioral Metrics](guides/behavioral-metrics.md)`.

- [ ] `README.md`: add Feature Overview row + Public Surface bullet + bump badge to `0.8.2`.

- [ ] `package.json` → `0.8.2`. `src/version.ts` → `'0.8.2'`.

### Step 13: Per-task multi-CLI review

- [ ] Stage all changes.
- [ ] `git diff --cached` is the review diff.
- [ ] Run Codex + Opus parallel reviews per §B.
- [ ] Synthesize REVIEW.md.
- [ ] Iterate to convergence.

### Step 14: Commit T1

- [ ] `git add -A && git commit -m`:

```
feat(behavioral-metrics): T1 metric contract + 11 built-ins + comparison (v0.8.2)

Implements Spec 8 (Behavioral Metrics over Corpus) per design v10.
Tier-2 of the AI-first feedback loop.

Surface added:
- Metric<TState, TResult> accumulator contract.
- runMetrics(bundles, metrics): pure function over Iterable<SessionBundle>.
- 11 engine-generic built-in metrics: bundleCount, sessionLengthStats,
  commandRateStats, eventRateStats, commandTypeCounts, eventTypeCounts,
  failureBundleRate, failedTickRate, incompleteBundleRate,
  commandValidationAcceptanceRate, executionFailureRate.
- compareMetricsResults: pure delta helper. NumericDelta + OpaqueDelta +
  OnlyInComparison shapes. Recurses through nested records.
- Stats type with number | null fields (JSON-stable; NaN would not be).
- NumPy linear (R type 7) percentiles, exact, deterministic.

ADRs 23 (accumulator), 24 (engine-generic only), 25 (deltas not
judgments), 26 (Iterable only in v1; runMetricsAsync is a separate
function in v2), 27 (no stopReason aggregation).

Validation: 4 engine gates clean. N new tests across 4 test files.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 2: Determinism integration tests + structural docs (v0.8.3, c-bump)

**Goal:** Cross-cutting integration tests that wire `runSynthPlaytest` → `runMetrics` → `compareMetricsResults`. Plus structural docs.

**Files:**
- Create: `tests/behavioral-metrics-determinism.test.ts` — full Spec 3 → Spec 8 round-trip; order-insensitivity verification; user-defined-metric round-trip; volatile-metadata exclusion sanity.
- Modify: `docs/architecture/ARCHITECTURE.md` — Component Map row.
- Modify: `docs/architecture/drift-log.md` — entry.
- Modify: `docs/design/ai-first-dev-roadmap.md` — Spec 8 status: Drafted → Implemented.
- Modify: `docs/guides/ai-integration.md` — Tier-2 reference.
- Modify: `docs/guides/synthetic-playtest.md` — append "## Computing metrics" subsection linking to the metrics guide.
- Modify: `docs/changelog.md`, `docs/devlog/*`.
- Modify: `package.json` (`0.8.3`), `src/version.ts` (`0.8.3`), `README.md` (badge).

### Step 1: Spec 3 → Spec 8 round-trip test

- [ ] Create `tests/behavioral-metrics-determinism.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  World, runSynthPlaytest, randomPolicy,
  bundleCount, sessionLengthStats, commandRateStats,
  commandValidationAcceptanceRate, executionFailureRate,
  runMetrics, compareMetricsResults,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
interface Cmds { spawn: { id: number } }

const setup = () => {
  const w = new World<Record<string, never>, Cmds>(mkConfig());
  w.registerHandler('spawn', () => undefined);
  return w;
};

describe('Spec 3 → Spec 8 round-trip', () => {
  it('runs N synthetic playtests, computes metrics, compares against itself with zero deltas', () => {
    const opts = {
      policies: [randomPolicy<Record<string, never>, Cmds>({
        catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      })],
      maxTicks: 50,
      policySeed: 42,
    };
    // Same input → same bundles → same metrics.
    const bundles1 = Array.from({ length: 4 }, () => runSynthPlaytest({ world: setup(), ...opts }).bundle);
    const bundles2 = Array.from({ length: 4 }, () => runSynthPlaytest({ world: setup(), ...opts }).bundle);

    const metrics = [
      bundleCount(), sessionLengthStats(), commandRateStats(),
      commandValidationAcceptanceRate(), executionFailureRate(),
    ];
    const r1 = runMetrics(bundles1, metrics);
    const r2 = runMetrics(bundles2, metrics);
    const cmp = compareMetricsResults(r1, r2);

    // Every numeric delta should be 0 (or null where data is null).
    for (const [name, entry] of Object.entries(cmp)) {
      // Helper to walk: every numeric leaf must have delta 0 or null.
      // (Implementation: use a recursive predicate.)
      // ... (test body)
    }
  });
});
```

### Step 2: Order-insensitivity verification

- [ ] Add test:

```ts
it('built-ins are order-insensitive (reverse iteration produces identical results)', () => {
  const bundles = /* build a few distinct bundles */;
  const metrics = [/* all 11 built-ins */];
  const r1 = runMetrics(bundles, metrics);
  const r2 = runMetrics([...bundles].reverse(), metrics);
  // For order-insensitive metrics (all 11 built-ins are), results should match exactly.
  const cmp = compareMetricsResults(r1, r2);
  // Walk: assert every numeric delta is 0.
});
```

### Step 3: User-defined metric round-trip

- [ ] Add test:

```ts
it('user-defined metric integrates cleanly with built-ins', () => {
  const distinctSeedCount: Metric<Set<number>, number> = {
    name: 'distinctSeedCount',
    create: () => new Set(),
    observe: (state, bundle) => {
      if (bundle.metadata.policySeed !== undefined) state.add(bundle.metadata.policySeed);
      return state;
    },
    finalize: (state) => state.size,
  };

  const bundles = [/* bundles with policySeed 1, 2, 1, 3 */];
  const result = runMetrics(bundles, [bundleCount(), distinctSeedCount]);
  expect(result.bundleCount).toBe(4);
  expect(result.distinctSeedCount).toBe(3);
});
```

### Step 4: Volatile-metadata exclusion sanity

- [ ] Add test:

```ts
it('built-ins do not read sessionId or recordedAt', () => {
  // Two bundles structurally identical except for sessionId/recordedAt.
  const a = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'aaa', recordedAt: 'ta' } });
  const b = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'bbb', recordedAt: 'tb' } });
  const metrics = [/* all 11 built-ins */];
  const r1 = runMetrics([a], metrics);
  const r2 = runMetrics([b], metrics);
  expect(r1).toEqual(r2);  // built-ins ignore sessionId/recordedAt
});
```

### Step 5: Run all 4 gates

### Step 6: Update structural docs

- [ ] `docs/architecture/ARCHITECTURE.md`: append Component Map row:

```
| Behavioral Metrics | src/behavioral-metrics.ts | Tier-2 corpus reducer over Iterable<SessionBundle>. Accumulator-style Metric contract; 11 engine-generic built-ins; pure-function runMetrics + compareMetricsResults. New in v0.8.2 + v0.8.3 (Spec 8). |
```

- [ ] `docs/architecture/drift-log.md`: append entry covering the Spec 8 implementation chain (v0.8.2 + v0.8.3) with a note on the accumulator contract + engine-generic-only stance.

- [ ] `docs/design/ai-first-dev-roadmap.md`: Spec 8 status → **Implemented** with link to design + plan + commits.

- [ ] `docs/guides/ai-integration.md`: append "Behavioral Metrics over Corpus (Tier 2)" subsection linking to the new guide.

- [ ] `docs/guides/synthetic-playtest.md`: append `## Computing metrics over bundles` subsection with a 5-line example: produce N bundles via `runSynthPlaytest`, pass to `runMetrics(bundles, [bundleCount(), sessionLengthStats()])`. Cross-link to behavioral-metrics guide.

- [ ] Changelog 0.8.3 entry.

- [ ] Devlog summary + detailed.

- [ ] Version bumps to 0.8.3.

### Step 7: Per-task multi-CLI review

### Step 8: Commit T2

```
test(behavioral-metrics): T2 determinism integration + arch docs (v0.8.3)

Cross-cutting tests covering Spec 8 design v4 §12 acceptance criteria
that need both Spec 3's runSynthPlaytest AND Spec 8's runMetrics in
place:
- Spec 3 → Spec 8 round-trip: identical synth bundles → identical
  metrics → zero deltas in compareMetricsResults.
- Order-insensitivity: bundles in reverse order produce identical
  built-in metric results.
- User-defined metric integration: custom Metric implements the
  contract correctly + multiplexes alongside built-ins.
- Volatile-metadata exclusion: built-ins ignore sessionId/recordedAt
  (verified by structurally-identical bundles differing only in those
  fields produce identical results).

Architecture docs:
- ARCHITECTURE.md Component Map row.
- drift-log entry covering v0.8.2 + v0.8.3 chain.
- ai-first-dev-roadmap.md Spec 8 → Implemented.
- ai-integration.md Tier-2 reference.
- synthetic-playtest.md cross-reference subsection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Final pass: cross-cutting checks

After T1 + T2 land:

- [ ] All four engine gates pass at the tip.
- [ ] Reviews under `docs/reviews/behavioral-metrics-T{1,2}/...` show convergence.
- [ ] `docs/changelog.md` has two new version entries.
- [ ] `docs/devlog/detailed/<latest>.md` has two new task entries.
- [ ] `docs/api-reference.md` has the Behavioral Metrics section.
- [ ] `docs/guides/behavioral-metrics.md` exists.
- [ ] `docs/architecture/decisions.md` has ADRs 23-27 (5 new).
- [ ] `docs/design/ai-first-dev-roadmap.md` shows Spec 8 = Implemented.
- [ ] `README.md` Feature Overview row added; version badge bumped to 0.8.3.
- [ ] `docs/README.md` indexes `behavioral-metrics.md`.

Per direct-to-main policy, no merge step. Commits land directly.

---

## Risks / Things to watch

- **`computeStats` percentile precision.** Floating-point arithmetic in JS can produce off-by-tiny-epsilon results compared to NumPy reference values. Tests use `toBeCloseTo(x, 6)` for 6-decimal precision. If a test fails on a different exact value than expected, recompute the reference value with the literal formula `sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)` rather than trusting NumPy output.
- **`commandTypeCounts` discriminated-union typing.** The metric reads `bundle.commands[].type` which is `keyof TCommandMap & string`. State is `Map<string, number>`. The cast at the boundary (`type as string`) is structurally safe — TS narrows the discriminated union but the runtime string is what we want.
- **`bundle.failures` vs `metadata.failedTicks`** are both populated by the recorder but represent different shapes — `failedTicks` is an array of tick numbers, `failures` is the full TickFailure record. v1 metrics read only `failedTicks`; per-phase metrics over `failures` are user-defined per design v4 §6.12.
- **Iterable consumed once.** Caller passing a generator to two `runMetrics` calls gets empty second result. The §10 example uses `Array.from(stream)` to materialize first — call this out in the guide.
- **Empty `MetricsResult` vs missing key.** A metric that wasn't included in `metrics` is absent from the result. `compareMetricsResults` reports it as `OnlyInComparison`. Differs from "metric returned `null`" (key present, value null).

## Open questions deferred

- **Typed-name-tuple builder.** A `runMetricsTyped(bundles, [bundleCount(), sessionLengthStats()] as const)` returning a literal-keyed result type is feasible but defers to v2.
- **`schemaVersion` validation.** v1 doesn't check `bundle.schemaVersion`. When v2 ships, `runMetrics` should validate or accept a version-mapping option.
- **Streaming async corpus.** Per ADR 26: separate `runMetricsAsync` function in v2.
