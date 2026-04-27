# Behavioral Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Plan revision:** v3 (2026-04-27) — collapses T1+T2 into a single commit per Codex iter-2's HIGH on the T1/T2 doc split (AGENTS.md: structural docs land with the code that introduces the subsystem, not in a follow-up). Spec 8 is one coherent shipped change → one version bump (v0.8.2, c-bump, additive). Iter-2: Codex 1 HIGH + 2 MED; Opus ACCEPT + 5 NIT. v3 also folds the integration tests into the same task; no separate T2.

**Goal:** Implement Spec 8 (Behavioral Metrics over Corpus) per `docs/design/2026-04-27-behavioral-metrics-design.md` (v4, converged after 4 multi-CLI design review iterations).

**Architecture:** Adds an accumulator-style `Metric<TState, TResult>` contract, a synchronous `runMetrics(bundles, metrics)` reducer over `Iterable<SessionBundle>`, 11 engine-generic built-in metric factories, and a thin `compareMetricsResults(baseline, current)` delta helper. Pure functional, exact, single-pass-multiplexed.

**Tech Stack:** TypeScript 5.7+, Vitest 3, ESLint 9, Node 18+. ESM + Node16 module resolution.

**Spec sections referenced:** §-numbered references map 1:1 to sections in `2026-04-27-behavioral-metrics-design.md`.

**Branch:** None — direct-to-main per AGENTS.md (solo-developer policy).

**Versioning:** Branch base `v0.8.1` (after Spec 3 merge). Single commit, **v0.8.2** (c-bump, additive). One coherent shipped change → one version bump per AGENTS.md.

**Shell:** bash on Windows (mingw). Unix syntax (`/tmp/`, `&`, `$()`, `[ -s file ]`, `mkdir -p`).

---

## Per-task review and doc pattern

### A. Per-task documentation (in same commit as code)

Per AGENTS.md doc-discipline:

- `docs/changelog.md` — version entry.
- `docs/devlog/summary.md` — one line.
- `docs/devlog/detailed/<latest>.md` — full entry (find via `ls -1t docs/devlog/detailed/ | head -1`). **Devlog rollover check**: the active file may already be over the 500-line AGENTS.md soft cap before the Spec 8 entry is appended (as of plan v4, `2026-04-26_2026-04-27.md` is 841 lines). If over 500: rename the active file via `git mv docs/devlog/detailed/<active>.md docs/devlog/detailed/<active-with-end-date-as-prior-day>.md`, then create a fresh `2026-04-27_2026-04-27.md` for the Spec 8 entry. The rollover commit and the Spec 8 entry can land in the same commit (the rollover is a doc-structural change that doesn't bump the version).
- `docs/api-reference.md` — sections for new public types/methods.
- `package.json` + `src/version.ts` + `README.md` (badge) — version bump.

The single-task commit also lands:
- 5 new ADRs (23-27) in `docs/architecture/decisions.md` (continues numbering after Spec 3's ADRs 17-22, which already landed).
- New `docs/guides/behavioral-metrics.md`.
- README.md Feature Overview row + Public Surface bullet.
- `docs/README.md` index entry.
- `docs/architecture/ARCHITECTURE.md` Component Map row.
- `docs/architecture/drift-log.md` entry.
- `docs/design/ai-first-dev-roadmap.md` Spec 8 status update.
- `docs/guides/ai-integration.md` Tier-2 reference.
- `docs/guides/synthetic-playtest.md` cross-reference to behavioral-metrics.

Per AGENTS.md doc-discipline: structural docs land in the same commit as the code that introduces the subsystem.

### B. Per-task multi-CLI review (before commit)

After all four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`) but before the commit. Review-folder layout is `docs/reviews/behavioral-metrics-T1/<date>/<iter>/raw/{codex,opus}.md` (kebab-case scope + date + iteration, matching AGENTS.md and Spec 3 / Spec 8 design-review precedent). Single task → scope is `behavioral-metrics-T1`; iteration starts at `1` and increments if reviewers' findings need a second pass.

```bash
DATE=$(date +%Y-%m-%d)
ITER=1
mkdir -p docs/reviews/behavioral-metrics-T1/$DATE/$ITER/raw

cat > /tmp/review-prompt.txt <<'EOF'
[task-specific code-review prompt — see Spec 8 design + per-task scope]
EOF

PROMPT=$(cat /tmp/review-prompt.txt)

# Review the staged diff before committing (pre-commit review pattern).
git diff --staged | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh \
  -c approval_policy=never --sandbox read-only --ephemeral "$PROMPT" \
  > docs/reviews/behavioral-metrics-T1/$DATE/$ITER/raw/codex.md 2>&1 &

git diff --staged | claude -p --model opus --effort xhigh \
  --append-system-prompt "$PROMPT" \
  --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" \
  > docs/reviews/behavioral-metrics-T1/$DATE/$ITER/raw/opus.md 2>&1 &

# Wait via background poller.
until [ -s docs/reviews/behavioral-metrics-T1/$DATE/$ITER/raw/codex.md ] && \
      [ -s docs/reviews/behavioral-metrics-T1/$DATE/$ITER/raw/opus.md ]; do
  sleep 8;
done

# Synthesize REVIEW.md (in the same iteration directory), address findings,
# iterate if needed (bump ITER and re-run), then commit.
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

## Single Task: Spec 8 — full surface + tests + integration + structural docs (v0.8.2, c-bump)

**Goal:** Land the entire Spec 8 surface in one commit per AGENTS.md doc-with-code rule — all types, all built-ins, the reducer, the delta helper, unit tests, integration tests (Spec 3 → Spec 8 round-trip + order-insensitivity + user-defined-metric integration + volatile-metadata exclusion), api-reference, guide, ADRs 23-27, ARCHITECTURE Component Map, drift-log, roadmap status update, ai-integration cross-ref, synthetic-playtest cross-ref.

(Earlier plan revisions split this into T1 + T2; collapsed in v3 per Codex iter-2's HIGH on the doc-with-code-that-introduces-the-subsystem rule.)

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

### Step 7: Implement remaining 9 built-ins (TDD per metric)

For each of the 9 remaining built-ins, follow TDD: failing test first, then implementation. The whole Spec 8 surface ships in one commit at Step 20.

#### Step 7a: `commandRateStats`

- [ ] Add to `tests/behavioral-metrics-builtins.test.ts`:

```ts
import { commandRateStats } from '../src/behavioral-metrics.js';

describe('commandRateStats', () => {
  it('empty corpus returns count:0 + null fields', () => {
    const result = runMetrics([], [commandRateStats()]);
    expect(result.commandRateStats).toEqual({
      count: 0, min: null, max: null, mean: null, p50: null, p95: null, p99: null,
    });
  });

  it('zero-durationTicks bundle contributes 0 (no divide-by-zero)', () => {
    const bundle = mkBundle({
      metadata: { ...mkBundle().metadata, durationTicks: 0 },
      commands: [{ submissionTick: 0, sequence: 0, type: 'spawn', data: { id: 1 },
        result: { schemaVersion: 1, accepted: true, commandType: 'spawn', code: 'OK', message: '', details: null, tick: 0, sequence: 0, validatorIndex: null } } as never],
    });
    const result = runMetrics([bundle], [commandRateStats()]);
    const stats = result.commandRateStats as Stats;
    expect(stats.count).toBe(1);
    expect(stats.min).toBe(0);
  });

  it('multi-bundle corpus computes per-bundle rates correctly', () => {
    // bundle A: 10 commands over 10 ticks → rate 1.0
    // bundle B: 5 commands over 10 ticks → rate 0.5
    const mkB = (n: number, ticks: number) => mkBundle({
      metadata: { ...mkBundle().metadata, durationTicks: ticks },
      commands: Array.from({ length: n }, (_, i) => ({
        submissionTick: 0, sequence: i, type: 'spawn', data: { id: i },
        result: { schemaVersion: 1, accepted: true, commandType: 'spawn', code: 'OK', message: '', details: null, tick: 0, sequence: i, validatorIndex: null },
      })) as never,
    });
    const result = runMetrics([mkB(10, 10), mkB(5, 10)], [commandRateStats()]);
    const stats = result.commandRateStats as Stats;
    expect(stats.count).toBe(2);
    expect(stats.min).toBe(0.5);
    expect(stats.max).toBe(1.0);
    expect(stats.mean).toBe(0.75);
  });
});
```

- [ ] Append to `src/behavioral-metrics.ts`:

```ts
export function commandRateStats(name: string = 'commandRateStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      const ticks = bundle.metadata.durationTicks;
      const rate = ticks > 0 ? bundle.commands.length / ticks : 0;
      state.push(rate);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}
```

- [ ] Run: `npm test -- behavioral-metrics-builtins`. Expected: PASS.

#### Step 7b: `eventRateStats`

- [ ] Add tests (single + multi-bundle, similar shape to 7a; the per-bundle rate is `sumOfEvents / durationTicks` with `0` for zero-duration).

- [ ] Append to `src/behavioral-metrics.ts`:

```ts
export function eventRateStats(name: string = 'eventRateStats'): Metric<number[], Stats> {
  return {
    name,
    create: () => [],
    observe: (state, bundle) => {
      const ticks = bundle.metadata.durationTicks;
      let totalEvents = 0;
      for (const t of bundle.ticks) totalEvents += t.events.length;
      state.push(ticks > 0 ? totalEvents / ticks : 0);
      return state;
    },
    finalize: (state) => computeStats(state),
  };
}
```

- [ ] Run + verify pass.

#### Step 7c: `commandTypeCounts`

- [ ] Tests covering: empty corpus → `{}`; single bundle with 3 spawn commands → `{ spawn: 3 }`; multi-bundle aggregation correct.

- [ ] Append:

```ts
export function commandTypeCounts(
  name: string = 'commandTypeCounts',
): Metric<Map<string, number>, Record<string, number>> {
  return {
    name,
    create: () => new Map(),
    observe: (state, bundle) => {
      for (const cmd of bundle.commands) {
        state.set(cmd.type, (state.get(cmd.type) ?? 0) + 1);
      }
      return state;
    },
    finalize: (state) => {
      const obj: Record<string, number> = {};
      for (const [k, v] of state) obj[k] = v;
      return obj;
    },
  };
}
```

#### Step 7d: `eventTypeCounts`

- [ ] Same shape as 7c but over `bundle.ticks[].events[].type`. Tests: empty → `{}`; single bundle with mixed event types aggregates correctly.

- [ ] Append:

```ts
export function eventTypeCounts(
  name: string = 'eventTypeCounts',
): Metric<Map<string, number>, Record<string, number>> {
  return {
    name,
    create: () => new Map(),
    observe: (state, bundle) => {
      for (const tickEntry of bundle.ticks) {
        for (const ev of tickEntry.events) {
          state.set(String(ev.type), (state.get(String(ev.type)) ?? 0) + 1);
        }
      }
      return state;
    },
    finalize: (state) => {
      const obj: Record<string, number> = {};
      for (const [k, v] of state) obj[k] = v;
      return obj;
    },
  };
}
```

#### Step 7e: `failureBundleRate`

- [ ] Tests:

```ts
describe('failureBundleRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [failureBundleRate()]).failureBundleRate).toBe(0);
  });

  it('all-clean corpus → 0', () => {
    expect(runMetrics([mkBundle(), mkBundle()], [failureBundleRate()]).failureBundleRate).toBe(0);
  });

  it('mixed corpus computes ratio', () => {
    const failing = mkBundle({ metadata: { ...mkBundle().metadata, failedTicks: [3] } });
    const result = runMetrics([mkBundle(), failing, mkBundle(), failing], [failureBundleRate()]);
    expect(result.failureBundleRate).toBe(0.5);  // 2 of 4
  });
});
```

- [ ] Append:

```ts
export function failureBundleRate(
  name: string = 'failureBundleRate',
): Metric<{ withFailure: number; total: number }, number> {
  return {
    name,
    create: () => ({ withFailure: 0, total: 0 }),
    observe: (state, bundle) => {
      state.total++;
      // (failedTicks?.length ?? 0) > 0 — strict-mode-safe pattern.
      if ((bundle.metadata.failedTicks?.length ?? 0) > 0) state.withFailure++;
      return state;
    },
    finalize: (state) => state.total > 0 ? state.withFailure / state.total : 0,
  };
}
```

#### Step 7f: `failedTickRate`

- [ ] Tests:

```ts
describe('failedTickRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [failedTickRate()]).failedTickRate).toBe(0);
  });

  it('zero-tick corpus (all bundles aborted on tick 0) → 0', () => {
    const aborted = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 0 } });
    expect(runMetrics([aborted, aborted], [failedTickRate()]).failedTickRate).toBe(0);
  });

  it('computes total failed ticks / total duration ticks', () => {
    const a = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 100, failedTicks: [50] } });
    const b = mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 100, failedTicks: [] } });
    // total: 1 failed / 200 ticks = 0.005
    expect(runMetrics([a, b], [failedTickRate()]).failedTickRate).toBe(0.005);
  });
});
```

- [ ] Append:

```ts
export function failedTickRate(
  name: string = 'failedTickRate',
): Metric<{ failedTicks: number; durationTicks: number }, number> {
  return {
    name,
    create: () => ({ failedTicks: 0, durationTicks: 0 }),
    observe: (state, bundle) => {
      state.failedTicks += bundle.metadata.failedTicks?.length ?? 0;
      state.durationTicks += bundle.metadata.durationTicks;
      return state;
    },
    finalize: (state) => state.durationTicks > 0 ? state.failedTicks / state.durationTicks : 0,
  };
}
```

#### Step 7g: `incompleteBundleRate`

- [ ] Tests:

```ts
describe('incompleteBundleRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [incompleteBundleRate()]).incompleteBundleRate).toBe(0);
  });

  it('all-complete corpus → 0', () => {
    expect(runMetrics([mkBundle(), mkBundle()], [incompleteBundleRate()]).incompleteBundleRate).toBe(0);
  });

  it('mixed corpus computes ratio', () => {
    const incomplete = mkBundle({ metadata: { ...mkBundle().metadata, incomplete: true } });
    const result = runMetrics([mkBundle(), incomplete, mkBundle(), incomplete], [incompleteBundleRate()]);
    expect(result.incompleteBundleRate).toBe(0.5);
  });
});
```

- [ ] Append:

```ts
export function incompleteBundleRate(
  name: string = 'incompleteBundleRate',
): Metric<{ incomplete: number; total: number }, number> {
  return {
    name,
    create: () => ({ incomplete: 0, total: 0 }),
    observe: (state, bundle) => {
      state.total++;
      if (bundle.metadata.incomplete === true) state.incomplete++;
      return state;
    },
    finalize: (state) => state.total > 0 ? state.incomplete / state.total : 0,
  };
}
```

#### Step 7h: `commandValidationAcceptanceRate`

- [ ] Tests:

```ts
describe('commandValidationAcceptanceRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0);
  });

  it('zero-submission corpus → 0', () => {
    expect(runMetrics([mkBundle()], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0);
  });

  it('mixed acceptance computes ratio over bundle.commands[].result.accepted', () => {
    const mkCmd = (accepted: boolean) => ({
      submissionTick: 0, sequence: 0, type: 'spawn', data: { id: 1 },
      result: { schemaVersion: 1, accepted, commandType: 'spawn',
        code: accepted ? 'OK' : 'REJECT', message: '', details: null, tick: 0, sequence: 0, validatorIndex: null },
    } as never);
    const bundle = mkBundle({ commands: [mkCmd(true), mkCmd(true), mkCmd(false), mkCmd(true)] });
    expect(runMetrics([bundle], [commandValidationAcceptanceRate()]).commandValidationAcceptanceRate).toBe(0.75);
  });
});
```

- [ ] Append:

```ts
export function commandValidationAcceptanceRate(
  name: string = 'commandValidationAcceptanceRate',
): Metric<{ accepted: number; total: number }, number> {
  return {
    name,
    create: () => ({ accepted: 0, total: 0 }),
    observe: (state, bundle) => {
      for (const cmd of bundle.commands) {
        state.total++;
        if (cmd.result.accepted) state.accepted++;
      }
      return state;
    },
    finalize: (state) => state.total > 0 ? state.accepted / state.total : 0,
  };
}
```

#### Step 7i: `executionFailureRate`

- [ ] Tests:

```ts
describe('executionFailureRate', () => {
  it('empty corpus → 0', () => {
    expect(runMetrics([], [executionFailureRate()]).executionFailureRate).toBe(0);
  });

  it('zero-execution corpus → 0', () => {
    expect(runMetrics([mkBundle()], [executionFailureRate()]).executionFailureRate).toBe(0);
  });

  it('mixed executed/failed computes ratio over bundle.executions[].executed', () => {
    const mkExec = (executed: boolean) => ({
      schemaVersion: 1, submissionSequence: 0, executed, commandType: 'spawn',
      code: executed ? 'OK' : 'command_handler_threw', message: '', details: null, tick: 1,
    } as never);
    const bundle = mkBundle({
      executions: [mkExec(true), mkExec(false), mkExec(true), mkExec(false)],
    });
    expect(runMetrics([bundle], [executionFailureRate()]).executionFailureRate).toBe(0.5);
  });
});
```

- [ ] Append:

```ts
export function executionFailureRate(
  name: string = 'executionFailureRate',
): Metric<{ failed: number; total: number }, number> {
  return {
    name,
    create: () => ({ failed: 0, total: 0 }),
    observe: (state, bundle) => {
      for (const exec of bundle.executions) {
        state.total++;
        if (!exec.executed) state.failed++;
      }
      return state;
    },
    finalize: (state) => state.total > 0 ? state.failed / state.total : 0,
  };
}
```

After Step 7i: run `npm test -- behavioral-metrics-builtins` — all 9 sub-step tests + the bundleCount/sessionLengthStats from Steps 1-6 = 33 tests, all PASS. Run `npm run typecheck` — clean.

### Step 8: Implement `runMetrics` extended cases (multiplexing, dup-name, iterable-consumed-once)

- [ ] Create `tests/behavioral-metrics-runner.test.ts` with its own `mkBundle` helper duplicated (~10 lines). Per-file duplication is the chosen resolution — extracting to a shared `_helpers/` file is over-engineering for two test files using the same factory.

```ts
import { describe, expect, it } from 'vitest';
import {
  bundleCount, sessionLengthStats, commandRateStats, eventRateStats,
  commandTypeCounts, eventTypeCounts, failureBundleRate, failedTickRate,
  incompleteBundleRate, commandValidationAcceptanceRate, executionFailureRate,
  runMetrics,
} from '../src/behavioral-metrics.js';
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

describe('runMetrics', () => {
  it('multiplexes 11 built-ins in one pass (verified by side-effecting iterator counter)', () => {
    let bundlesIterated = 0;
    function* source(count: number) {
      for (let i = 0; i < count; i++) {
        bundlesIterated++;
        yield mkBundle();
      }
    }
    const metrics = [
      bundleCount(), sessionLengthStats(), commandRateStats(), eventRateStats(),
      commandTypeCounts(), eventTypeCounts(), failureBundleRate(), failedTickRate(),
      incompleteBundleRate(), commandValidationAcceptanceRate(), executionFailureRate(),
    ];
    const result = runMetrics(source(5), metrics);

    // Single-pass invariant: the generator yielded exactly bundle-count times,
    // not bundle-count × metric-count. If runMetrics rescanned per metric,
    // bundlesIterated would be 5 * 11 = 55.
    expect(bundlesIterated).toBe(5);
    expect(Object.keys(result)).toHaveLength(11);
    expect(result.bundleCount).toBe(5);
  });

  it('throws on duplicate metric names', () => {
    expect(() => runMetrics([], [bundleCount(), bundleCount()])).toThrow(RangeError);
    expect(() => runMetrics([], [bundleCount(), bundleCount('myAlias'), bundleCount()])).toThrow(RangeError);
  });

  it('iterates once: generator-source bundles are consumed', () => {
    function* source() { yield mkBundle(); yield mkBundle(); }
    const it1 = source();
    const r1 = runMetrics(it1, [bundleCount()]);
    expect(r1.bundleCount).toBe(2);
    // Same iterator, second call sees 0 bundles.
    const r2 = runMetrics(it1, [bundleCount()]);
    expect(r2.bundleCount).toBe(0);
  });

  it('Iterable<T> contract: arrays and Sets work too', () => {
    const arrResult = runMetrics([mkBundle(), mkBundle()], [bundleCount()]);
    expect(arrResult.bundleCount).toBe(2);
    const setResult = runMetrics(new Set([mkBundle(), mkBundle(), mkBundle()]), [bundleCount()]);
    expect(setResult.bundleCount).toBe(3);
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

- [ ] `docs/architecture/decisions.md`: append all 5 new Spec 8 ADRs (23, 24, 25, 26, 27). Pull text verbatim from design v4 §15:
  - ADR 23: Accumulator-style metric contract over reducer or per-bundle-map+combine.
  - ADR 24: Engine-generic built-ins only; game-semantic metrics are user-defined.
  - ADR 25: `compareMetricsResults` returns deltas, not regression judgments.
  - ADR 26: `Iterable<SessionBundle>` only in v1; `AsyncIterable` deferred to a separate `runMetricsAsync` in v2.
  - ADR 27: Do NOT aggregate `stopReason` in v1.

- [ ] `docs/changelog.md`: prepend `## 0.8.2 - 2026-04-27` entry. What shipped: 11 built-in metrics + accumulator contract + comparison helper. Validation: 4 gates clean.

- [ ] `docs/devlog/summary.md`: prepend one line.

- [ ] **Devlog rollover (if needed)**: check `wc -l docs/devlog/detailed/$(ls -1t docs/devlog/detailed/ | head -1)`. If > 500 lines, `git mv` the active file to update its END_DATE to the most recent entry's date (e.g., `2026-04-26_2026-04-27.md` stays as-is if today is still April 27 and we want a clean cut), then create a fresh `2026-04-27_2026-04-27.md` (today's date for both halves) and append the Spec 8 entry there. If ≤ 500 lines, append directly to the active file. Either way, this is part of the single Spec 8 commit (no separate rollover commit).

- [ ] `docs/README.md`: index `[Behavioral Metrics](guides/behavioral-metrics.md)`.

- [ ] `README.md`: add Feature Overview row + Public Surface bullet + bump badge to `0.8.2`.

- [ ] `package.json` → `0.8.2`. `src/version.ts` → `'0.8.2'`.

(Steps 13-18 — integration tests + structural docs — appear in the §"Continuation of the single task" block below. Steps 19 + 20 — review + commit — close out the task at the end of that block.)

---

## Continuation of the single task: integration tests + structural docs (same commit)

These steps land in the same commit as Steps 1-12 above. They were originally a separate "T2" but per AGENTS.md doc-with-code-that-introduces-the-subsystem rule, structural docs (ARCHITECTURE Component Map, drift-log, roadmap status, cross-references) ship with the code that introduces the subsystem.

**Additional files (modified in the same commit as the v0.8.2 surface):**
- Create: `tests/behavioral-metrics-determinism.test.ts` — full Spec 3 → Spec 8 round-trip; order-insensitivity verification; user-defined-metric round-trip; volatile-metadata exclusion sanity.
- Modify: `docs/architecture/ARCHITECTURE.md` — Component Map row.
- Modify: `docs/architecture/drift-log.md` — entry.
- Modify: `docs/design/ai-first-dev-roadmap.md` — Spec 8 status: Drafted → Implemented.
- Modify: `docs/guides/ai-integration.md` — Tier-2 reference.
- Modify: `docs/guides/synthetic-playtest.md` — append "## Computing metrics" subsection linking to the metrics guide.

The version bump (`0.8.2`) and changelog/devlog entries from Steps 12-13 already cover this commit; no separate v0.8.3 bump.

### Step 13: Create test file with imports + helpers + Spec 3 → Spec 8 round-trip test

- [ ] Create `tests/behavioral-metrics-determinism.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  World, runSynthPlaytest, randomPolicy,
  bundleCount, sessionLengthStats, commandRateStats, eventRateStats,
  commandTypeCounts, eventTypeCounts, failureBundleRate, failedTickRate,
  incompleteBundleRate, commandValidationAcceptanceRate, executionFailureRate,
  runMetrics, compareMetricsResults,
  type Metric, type SessionBundle, type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
interface Cmds { spawn: { id: number } }

const setup = () => {
  const w = new World<Record<string, never>, Cmds>(mkConfig());
  w.registerHandler('spawn', () => undefined);
  return w;
};

const allBuiltins = (): Metric<unknown, unknown>[] => [
  bundleCount() as Metric<unknown, unknown>,
  sessionLengthStats() as Metric<unknown, unknown>,
  commandRateStats() as Metric<unknown, unknown>,
  eventRateStats() as Metric<unknown, unknown>,
  commandTypeCounts() as Metric<unknown, unknown>,
  eventTypeCounts() as Metric<unknown, unknown>,
  failureBundleRate() as Metric<unknown, unknown>,
  failedTickRate() as Metric<unknown, unknown>,
  incompleteBundleRate() as Metric<unknown, unknown>,
  commandValidationAcceptanceRate() as Metric<unknown, unknown>,
  executionFailureRate() as Metric<unknown, unknown>,
];

// mkBundle helper for unit-test cases that don't go through runSynthPlaytest.
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

describe('Spec 3 → Spec 8 round-trip', () => {
  it('runs N synthetic playtests, computes metrics, compares against re-run with zero deltas', () => {
    const opts = {
      policies: [randomPolicy<Record<string, never>, Cmds>({
        catalog: [() => ({ type: 'spawn' as const, data: { id: 1 } })],
      })],
      maxTicks: 50,
      policySeed: 42,
    };
    const bundles1 = Array.from({ length: 4 }, () => runSynthPlaytest({ world: setup(), ...opts }).bundle);
    const bundles2 = Array.from({ length: 4 }, () => runSynthPlaytest({ world: setup(), ...opts }).bundle);

    // Use a smaller built-in set to keep the test focused (not commandTypeCounts/eventTypeCounts
    // which return Records — those are exercised in Step 2 below).
    const metrics: Metric<unknown, unknown>[] = [
      bundleCount() as Metric<unknown, unknown>,
      sessionLengthStats() as Metric<unknown, unknown>,
      commandRateStats() as Metric<unknown, unknown>,
      commandValidationAcceptanceRate() as Metric<unknown, unknown>,
      executionFailureRate() as Metric<unknown, unknown>,
    ];
    const r1 = runMetrics(bundles1, metrics);
    const r2 = runMetrics(bundles2, metrics);
    const cmp = compareMetricsResults(r1, r2);

    // Recursive walker: every numeric delta in the comparison must be 0 or null.
    const checkZeroDelta = (node: unknown, path: string): void => {
      if (node === null || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      if ('delta' in obj && 'pctChange' in obj) {
        // NumericDelta — delta must be 0 or null.
        if (obj.delta !== null) {
          expect(obj.delta, `${path}.delta`).toBe(0);
        }
        return;
      }
      if ('equal' in obj && 'baseline' in obj && 'current' in obj) {
        // OpaqueDelta — must be equal.
        expect(obj.equal, `${path}.equal`).toBe(true);
        return;
      }
      if ('onlyIn' in obj) {
        // OnlyInComparison — should not appear: both runs produced the same metric set.
        throw new Error(`unexpected only-in-side at ${path}`);
      }
      // Plain record — recurse.
      for (const [k, v] of Object.entries(obj)) {
        checkZeroDelta(v, `${path}.${k}`);
      }
    };
    for (const [name, entry] of Object.entries(cmp)) {
      checkZeroDelta(entry, name);
    }
  });
});
```

- [ ] Run: `npm test -- behavioral-metrics-determinism`. Expected: PASS.

### Step 14: Order-insensitivity verification

- [ ] Append:

```ts
describe('order-insensitivity', () => {
  it('built-ins are order-insensitive (reverse iteration produces identical results for non-Stats result shapes)', () => {
    // Build distinct bundles with varying durationTicks + commands.
    const bundles: SessionBundle[] = [
      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 10 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 20 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, durationTicks: 30 } }),
    ];

    // Use a focused metric set that returns plain values (not Records).
    const metrics = allBuiltins();
    const r1 = runMetrics(bundles, metrics);
    const r2 = runMetrics([...bundles].reverse(), metrics);

    // All 11 built-ins are order-insensitive — results must be deep-equal.
    expect(r1).toEqual(r2);
  });
});
```

### Step 15: User-defined metric integration

- [ ] Append:

```ts
describe('user-defined metric integration', () => {
  it('custom Metric implements the contract correctly + multiplexes alongside built-ins', () => {
    const distinctSeedCount: Metric<Set<number>, number> = {
      name: 'distinctSeedCount',
      create: () => new Set(),
      observe: (state, bundle) => {
        if (bundle.metadata.policySeed !== undefined) state.add(bundle.metadata.policySeed);
        return state;
      },
      finalize: (state) => state.size,
    };

    const bundles: SessionBundle[] = [
      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 1 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 2 } }),
      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 1 } }),  // duplicate
      mkBundle({ metadata: { ...mkBundle().metadata, policySeed: 3 } }),
    ];
    const result = runMetrics(bundles, [bundleCount() as Metric<unknown, unknown>, distinctSeedCount as Metric<unknown, unknown>]);
    expect(result.bundleCount).toBe(4);
    expect(result.distinctSeedCount).toBe(3);
  });
});
```

### Step 16: Volatile-metadata exclusion sanity

- [ ] Append:

```ts
describe('volatile-metadata exclusion', () => {
  it('built-ins do not read sessionId or recordedAt', () => {
    // Two bundles structurally identical except for sessionId/recordedAt.
    const a = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'aaa', recordedAt: 'ta' } });
    const b = mkBundle({ metadata: { ...mkBundle().metadata, sessionId: 'bbb', recordedAt: 'tb' } });
    const metrics = allBuiltins();
    const r1 = runMetrics([a], metrics);
    const r2 = runMetrics([b], metrics);
    expect(r1).toEqual(r2);  // built-ins ignore sessionId/recordedAt
  });
});
```

### Step 17: Run all 4 gates (after integration tests added)

- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` all clean.

### Step 18: Update structural docs

- [ ] `docs/architecture/ARCHITECTURE.md`: append Component Map row:

```
| Behavioral Metrics | src/behavioral-metrics.ts | Tier-2 corpus reducer over Iterable<SessionBundle>. Accumulator-style Metric contract; 11 engine-generic built-ins; pure-function runMetrics + compareMetricsResults. New in v0.8.2 (Spec 8). |
```

- [ ] `docs/architecture/drift-log.md`: append entry covering the Spec 8 implementation (v0.8.2) with a note on the accumulator contract + engine-generic-only stance.

- [ ] `docs/design/ai-first-dev-roadmap.md`: Spec 8 status → **Implemented** with link to design + plan + commits.

- [ ] `docs/guides/ai-integration.md`: append "Behavioral Metrics over Corpus (Tier 2)" subsection linking to the new guide.

- [ ] `docs/guides/synthetic-playtest.md`: append `## Computing metrics over bundles` subsection with a 5-line example: produce N bundles via `runSynthPlaytest`, pass to `runMetrics(bundles, [bundleCount(), sessionLengthStats()])`. Cross-link to behavioral-metrics guide.

(Changelog/devlog/version bumps already covered in Step 12 — single 0.8.2 entry.)

### (Step 19 + Step 20 — review + commit — appear above; they apply once Step 18 lands.)

The single Step 20 commit message template (referenced from earlier in the plan):

```
feat(behavioral-metrics): Spec 8 — metric contract + 11 built-ins +
runMetrics + compareMetricsResults + integration tests + arch docs (v0.8.2)

Implements Spec 8 (Behavioral Metrics over Corpus) per design v4.
Tier-2 of the AI-first feedback loop. Pairs with Spec 3 to define
regressions for emergent behavior.

Public surface:
- Metric<TState, TResult> accumulator contract.
- runMetrics(bundles, metrics): pure function over Iterable<SessionBundle>.
- 11 engine-generic built-in metrics: bundleCount, sessionLengthStats,
  commandRateStats, eventRateStats, commandTypeCounts, eventTypeCounts,
  failureBundleRate, failedTickRate, incompleteBundleRate,
  commandValidationAcceptanceRate, executionFailureRate.
- compareMetricsResults: pure delta helper. NumericDelta + OpaqueDelta
  + OnlyInComparison shapes. Recurses through nested records.
- Stats type with number | null fields (JSON-stable; NaN would not be).
- NumPy linear (R type 7) percentiles, exact, deterministic.

Integration tests (tests/behavioral-metrics-determinism.test.ts):
- Spec 3 → Spec 8 round-trip: identical synth bundles → identical
  metrics → zero deltas in compareMetricsResults.
- Order-insensitivity: bundles in reverse order produce identical
  built-in metric results.
- User-defined metric integration: custom Metric implements the
  contract correctly + multiplexes alongside built-ins.
- Volatile-metadata exclusion: built-ins ignore sessionId/recordedAt.

ADRs 23 (accumulator), 24 (engine-generic only), 25 (deltas not
judgments), 26 (Iterable only in v1; runMetricsAsync is a separate
function in v2), 27 (no stopReason aggregation).

Structural docs: ARCHITECTURE Component Map row, drift-log entry,
ai-first-dev-roadmap Spec 8 → Implemented, ai-integration Tier-2
reference, synthetic-playtest cross-reference, behavioral-metrics
guide, README Feature Overview row + Public Surface bullet.

Validation: 4 engine gates clean. ~55 new tests (types: 2; builtins:
~36; runner: 4; compare: ~8; determinism: 4).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Final pass: cross-cutting checks

After the single Spec 8 commit (Step 20) lands:

- [ ] All four engine gates pass at the tip.
- [ ] Reviews under `docs/reviews/behavioral-metrics-T1/<date>/<iter>/...` show convergence (single task → single scope folder; iteration directories under it).
- [ ] `docs/changelog.md` has one new version entry (0.8.2).
- [ ] `docs/devlog/detailed/<latest>.md` has one new task entry.
- [ ] `docs/api-reference.md` has the Behavioral Metrics section.
- [ ] `docs/guides/behavioral-metrics.md` exists.
- [ ] `docs/architecture/decisions.md` has ADRs 23-27 (5 new).
- [ ] `docs/design/ai-first-dev-roadmap.md` shows Spec 8 = Implemented.
- [ ] `README.md` Feature Overview row added; version badge bumped to 0.8.2.
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
