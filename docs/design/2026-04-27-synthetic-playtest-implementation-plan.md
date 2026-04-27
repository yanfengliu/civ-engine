# Synthetic Playtest Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the engine-level Synthetic Playtest Harness defined in `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI review iterations).

**Architecture:** Adds `runSynthPlaytest` (a synchronous harness that drives a `World` via pluggable `Policy` functions for `N` ticks and produces a `SessionBundle`), three built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`), shared `PolicyContext` / `StopContext` types with seeded sub-RNG, and a discriminated-union `PolicyCommand`. Extends `SessionRecorderConfig` with optional `sourceKind?` and `policySeed?` (additive); widens `SessionMetadata.sourceKind` from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'` (b-bump per AGENTS.md). All produced bundles round-trip through `SessionReplayer.selfCheck()` for non-poisoned runs with `ticksRun ≥ 1`.

**Tech Stack:** TypeScript 5.7+, Vitest 3, ESLint 9, Node 18+ (project `package.json:engines`). All new code follows the project's existing ESM + Node16 module-resolution conventions.

**Spec sections referenced throughout:** §-numbered references map 1:1 to sections in `2026-04-27-synthetic-playtest-harness-design.md`.

**Branch strategy:** All work on a single chained branch `agent/synthetic-playtest`, three commits T1/T2/T3. Branch stays at the tip awaiting explicit user merge authorization per AGENTS.md. **Per-task multi-CLI review** lands before each commit (see "Per-task review pattern" below) — mandatory per AGENTS.md, not optional.

**Versioning:** Branch base `v0.7.19`. T1 = `0.7.20` (c). T2 = `0.8.0` (b — sourceKind union widening breaks downstream `assertNever`). T3 = `0.8.1` (c).

---

## Per-task review and doc pattern (applies to every T1–T3)

Per `AGENTS.md`, every behavior/code change ships with per-commit doc updates and a multi-CLI review BEFORE the commit lands. Each task ends with these steps in order:

### A. Per-task documentation update (in the same commit as the code)

For every task that adds public surface, the same commit updates:

- `docs/changelog.md` — version entry with what shipped, behavior callouts, validation.
- `docs/devlog/summary.md` — one line.
- `docs/devlog/detailed/<latest>.md` — full per-task entry.
- `docs/api-reference.md` — new sections for new public types / methods.
- `package.json` + `src/version.ts` + `README.md` version badge — the c/b bump.

T1 also lands ADRs 1, 2, 5 in `docs/architecture/decisions.md`.
T2 also lands ADRs 3, 3a, 4, 6 + new `docs/guides/synthetic-playtest.md` + extension to `docs/guides/session-recording.md`.
T3 also lands `docs/architecture/ARCHITECTURE.md` Component Map row + `docs/architecture/drift-log.md` entry + `docs/design/ai-first-dev-roadmap.md` Spec 3 status update + extension of `docs/guides/ai-integration.md`.

### B. Per-task multi-CLI review (before commit)

After tests + impl + all four engine gates pass, but before the commit:

```bash
# 1. Generate the WIP diff.
git diff <base>..HEAD <files-for-this-task> > /tmp/task-diff.patch

# 2. Create review folder.
mkdir -p docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw

# 3. Run Codex + Opus in parallel (~5-10 min each, background).
PROMPT='<task-specific prompt with code-review framing per AGENTS.md>'
git diff <base>..HEAD | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh \
  -c approval_policy=never --sandbox read-only --ephemeral "$PROMPT" \
  > docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw/codex.md &
git diff <base>..HEAD | claude -p --model opus --effort xhigh \
  --append-system-prompt "$PROMPT" \
  --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" \
  > docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw/opus.md &
# Gemini: skip with note if quota-out (which is the running condition).

# 4. Wait for both via background poller (no harness sleep limits).
# 5. Synthesize into REVIEW.md; iterate to convergence.
# 6. THEN bump version, finalize doc surface, commit.
```

Task-specific prompts focus on the slice (e.g., T1: "Review the new Policy interface, three built-in policies, and PolicyContext sub-RNG against design v10 §5 and §6").

### C. Convergence rule

Iterate per-task review until both reviewers ACCEPT OR until 3 iterations have passed and remaining findings are nitpicks per AGENTS.md "Continue iterating until reviewers nitpick instead of catching real bugs." Then commit.

### D. Engine gates (mandatory before commit)

All four gates must pass:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

If any gate fails, fix before committing.

---

## Task 1: Policy interface, sub-RNG types, three built-in policies (v0.7.20)

**Goal:** Introduce all policy-side primitives that don't depend on `runSynthPlaytest`. Land the type surface, the three built-in factories, and unit tests for each. The harness API itself ships in T2.

**Files:**
- Create: `src/synthetic-playtest.ts` — Policy types + three factories.
- Modify: `src/index.ts` — re-export new public surface.
- Create: `tests/synthetic-policies.test.ts` — unit tests per policy.
- Modify: `docs/api-reference.md` — sections for `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy`.
- Modify: `docs/architecture/decisions.md` — ADRs 1, 2, 5.
- Modify: `docs/changelog.md`, `docs/devlog/summary.md`, `docs/devlog/detailed/2026-04-26_2026-04-27.md`.
- Modify: `package.json` (`0.7.20`), `src/version.ts` (`0.7.20`), `README.md` (badge).

### Step 1: Write the failing test for `noopPolicy`

- [ ] Edit `tests/synthetic-policies.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DeterministicRandom, World, type WorldConfig } from '../src/index.js';
import { noopPolicy } from '../src/synthetic-playtest.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });

interface Cmds { spawn: { id: number } }

describe('noopPolicy', () => {
  it('returns empty array regardless of context', () => {
    const policy = noopPolicy<Record<string, never>, Cmds>();
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    const rng = new DeterministicRandom(42);
    const ctx = { world, tick: 1, random: () => rng.random() };
    expect(policy(ctx)).toEqual([]);
    expect(policy(ctx)).toEqual([]);
  });
});
```

### Step 2: Run the test to verify failure

Run: `npm test -- synthetic-policies`
Expected: FAIL — `Cannot find module '../src/synthetic-playtest.js'`.

### Step 3: Create `src/synthetic-playtest.ts` with type stubs and `noopPolicy`

- [ ] Edit `src/synthetic-playtest.ts`:

```ts
import type { World } from './world.js';
import type { ComponentRegistry } from './world.js';
import type { JsonValue } from './json.js';

export interface PolicyContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  readonly tick: number;
  readonly random: () => number;
}

export interface StopContext<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
  readonly tick: number;
  readonly random: () => number;
}

export type PolicyCommand<TCommandMap> = {
  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];

export type Policy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> = (
  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
) => PolicyCommand<TCommandMap>[];

export function noopPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(): Policy<TEventMap, TCommandMap, TComponents, TState> {
  return () => [];
}
```

### Step 4: Run noopPolicy test — expect PASS

Run: `npm test -- synthetic-policies`
Expected: PASS for the `noopPolicy` test.

### Step 5: Write failing tests for `scriptedPolicy`

- [ ] Add to `tests/synthetic-policies.test.ts`:

```ts
import { scriptedPolicy, type ScriptedPolicyEntry } from '../src/synthetic-playtest.js';

describe('scriptedPolicy', () => {
  it('emits the right entry at the right tick', () => {
    const sequence: ScriptedPolicyEntry<Cmds>[] = [
      { tick: 1, type: 'spawn', data: { id: 100 } },
      { tick: 3, type: 'spawn', data: { id: 200 } },
    ];
    const policy = scriptedPolicy<Record<string, never>, Cmds>(sequence);
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    const rng = new DeterministicRandom(0);
    const random = () => rng.random();
    expect(policy({ world, tick: 1, random })).toEqual([{ type: 'spawn', data: { id: 100 } }]);
    expect(policy({ world, tick: 2, random })).toEqual([]);
    expect(policy({ world, tick: 3, random })).toEqual([{ type: 'spawn', data: { id: 200 } }]);
    expect(policy({ world, tick: 4, random })).toEqual([]);
  });

  it('groups multiple entries on the same tick in declaration order', () => {
    const sequence: ScriptedPolicyEntry<Cmds>[] = [
      { tick: 1, type: 'spawn', data: { id: 1 } },
      { tick: 1, type: 'spawn', data: { id: 2 } },
      { tick: 1, type: 'spawn', data: { id: 3 } },
    ];
    const policy = scriptedPolicy<Record<string, never>, Cmds>(sequence);
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    const random = () => 0;
    expect(policy({ world, tick: 1, random })).toEqual([
      { type: 'spawn', data: { id: 1 } },
      { type: 'spawn', data: { id: 2 } },
      { type: 'spawn', data: { id: 3 } },
    ]);
  });

  it('handles empty sequence', () => {
    const policy = scriptedPolicy<Record<string, never>, Cmds>([]);
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    expect(policy({ world, tick: 1, random: () => 0 })).toEqual([]);
  });
});
```

### Step 6: Implement `scriptedPolicy` with O(1) per-tick lookup

- [ ] Append to `src/synthetic-playtest.ts`:

```ts
export type ScriptedPolicyEntry<TCommandMap> = {
  [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];

export function scriptedPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  sequence: ScriptedPolicyEntry<TCommandMap>[],
): Policy<TEventMap, TCommandMap, TComponents, TState> {
  // Pre-group by tick at construction (O(1) per-tick lookup).
  const byTick = new Map<number, PolicyCommand<TCommandMap>[]>();
  for (const entry of sequence) {
    const list = byTick.get(entry.tick);
    const cmd = { type: entry.type, data: entry.data } as PolicyCommand<TCommandMap>;
    if (list) list.push(cmd);
    else byTick.set(entry.tick, [cmd]);
  }
  return (ctx) => byTick.get(ctx.tick) ?? [];
}
```

### Step 7: Run scriptedPolicy tests — expect PASS

Run: `npm test -- synthetic-policies`
Expected: All scriptedPolicy tests PASS.

### Step 8: Write failing tests for `randomPolicy` (seed determinism)

- [ ] Add to `tests/synthetic-policies.test.ts`:

```ts
import { randomPolicy, type RandomPolicyConfig } from '../src/synthetic-playtest.js';

describe('randomPolicy', () => {
  const mkCtx = (tick: number, seed: number) => {
    const rng = new DeterministicRandom(seed);
    return { world: new World<Record<string, never>, Cmds>(mkConfig()), tick, random: () => rng.random() };
  };

  it('seeded selection is deterministic', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [
        () => ({ type: 'spawn', data: { id: 1 } }),
        () => ({ type: 'spawn', data: { id: 2 } }),
        () => ({ type: 'spawn', data: { id: 3 } }),
      ],
    };
    const p1 = randomPolicy<Record<string, never>, Cmds>(config);
    const p2 = randomPolicy<Record<string, never>, Cmds>(config);
    const ctx1 = mkCtx(1, 42);
    const ctx2 = mkCtx(1, 42);
    // Same seed → same selection.
    expect(p1(ctx1)).toEqual(p2(ctx2));
  });

  it('respects frequency: emits only on ticks where tick % frequency === offset', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 3, offset: 0,
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    const ctx0 = mkCtx(0, 1);
    const ctx1 = mkCtx(1, 1);
    const ctx3 = mkCtx(3, 1);
    expect(policy(ctx0)).toHaveLength(1);  // 0 % 3 === 0
    expect(policy(ctx1)).toHaveLength(0);  // 1 % 3 === 1
    expect(policy(ctx3)).toHaveLength(1);  // 3 % 3 === 0
  });

  it('respects burst: emits N commands per fired tick', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      burst: 5,
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    expect(policy(mkCtx(1, 1))).toHaveLength(5);
  });
});
```

### Step 9: Implement `randomPolicy`

- [ ] Append to `src/synthetic-playtest.ts`:

```ts
export interface RandomPolicyConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap, TComponents, TState>) => PolicyCommand<TCommandMap>>;
  frequency?: number;
  offset?: number;
  burst?: number;
}

export function randomPolicy<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  config: RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>,
): Policy<TEventMap, TCommandMap, TComponents, TState> {
  const { catalog, frequency = 1, offset = 0, burst = 1 } = config;
  if (catalog.length === 0) {
    throw new RangeError('randomPolicy.catalog must be non-empty');
  }
  if (frequency < 1 || !Number.isInteger(frequency)) {
    throw new RangeError('randomPolicy.frequency must be a positive integer');
  }
  if (burst < 1 || !Number.isInteger(burst)) {
    throw new RangeError('randomPolicy.burst must be a positive integer');
  }
  return (ctx) => {
    if (ctx.tick % frequency !== offset) return [];
    const out: PolicyCommand<TCommandMap>[] = [];
    for (let i = 0; i < burst; i++) {
      const idx = Math.floor(ctx.random() * catalog.length);
      out.push(catalog[idx](ctx));
    }
    return out;
  };
}
```

### Step 10: Run all policy tests — expect PASS

Run: `npm test -- synthetic-policies`
Expected: All tests PASS.

### Step 11: Re-export from `src/index.ts`

- [ ] Edit `src/index.ts` — add (insert next to other re-exports):

```ts
export type {
  Policy,
  PolicyContext,
  StopContext,
  PolicyCommand,
  RandomPolicyConfig,
  ScriptedPolicyEntry,
} from './synthetic-playtest.js';
export {
  noopPolicy,
  randomPolicy,
  scriptedPolicy,
} from './synthetic-playtest.js';
```

### Step 12: Run all gates

- [ ] `npm test` — all tests pass.
- [ ] `npm run typecheck` — no type errors.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — clean.

### Step 13: Update doc surface

- [ ] `docs/api-reference.md`: add sections for `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Each section: shape + brief usage. Cross-reference `runSynthPlaytest` as "ships in v0.8.0 (T2)".

- [ ] `docs/architecture/decisions.md`: append ADR 1 (Policy is a function), ADR 2 (read-only world), ADR 5 (sub-RNG with literal seed expression). Pull text from design v10 §15.

- [ ] `docs/changelog.md`: new `### 0.7.20 (2026-04-27)` entry. What shipped: policy types + three built-in policies. Why: foundation for synthetic playtests (Spec 3 Tier 1). Validation: 4 gates clean, X new tests.

- [ ] `docs/devlog/summary.md`: one line per AGENTS.md.

- [ ] `docs/devlog/detailed/2026-04-26_2026-04-27.md`: full entry — timestamp, action, code-reviewer comments per provider, result, reasoning, notes.

- [ ] `package.json`: bump `version` to `0.7.20`.
- [ ] `src/version.ts`: bump `ENGINE_VERSION` to `'0.7.20'`.
- [ ] `README.md`: bump version badge.

### Step 14: Per-task multi-CLI review

- [ ] Generate diff: `git diff main..HEAD > /tmp/t1-diff.patch`.
- [ ] Run Codex + Opus parallel reviews in `docs/reviews/synthetic-playtest-T1/2026-04-27/1/raw/`.
- [ ] Wait via background poller.
- [ ] Synthesize REVIEW.md.
- [ ] Iterate to convergence.

### Step 15: Commit T1

- [ ] `git add -A && git commit` with message:

```
feat(synthetic-playtest): T1 Policy interface + three built-in policies (v0.7.20)

Implements the policy-side primitives from Spec 3 design v10:
- Policy / PolicyContext / StopContext / PolicyCommand types with
  4-generic shape matching World<TEventMap, TCommandMap, TComponents,
  TState> (TComponents/TState carry defaults; TEventMap/TCommandMap
  intentionally don't, since empty-record defaults would collapse
  PolicyCommand to never).
- noopPolicy: empty-emit baseline.
- scriptedPolicy: pre-grouped by tick at construction, O(1) per-tick
  lookup, matched against PolicyContext.tick (= world.tick + 1, the
  tick about to execute). Bundle→script conversion requires
  +1 on submissionTick.
- randomPolicy: deterministic catalog selection via ctx.random()
  (sub-RNG, NOT world.random — see ADR 5). Supports frequency,
  offset, burst.

ADRs 1, 2, 5 land in docs/architecture/decisions.md.

The runSynthPlaytest harness ships in T2 (v0.8.0).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 2: `runSynthPlaytest` harness + SessionRecorder/Metadata extensions (v0.8.0)

**Goal:** Land the synchronous harness, extend `SessionRecorderConfig` and `SessionMetadata` with the new fields, ship the user-facing guide. **This is the b-bump task** because of the `SessionMetadata.sourceKind` union widening.

**Files:**
- Modify: `src/synthetic-playtest.ts` — add `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`.
- Modify: `src/session-bundle.ts` — widen `SessionMetadata.sourceKind` union; add `SessionMetadata.policySeed?`.
- Modify: `src/session-recorder.ts` — add `sourceKind?`, `policySeed?` to `SessionRecorderConfig`; thread through to `connect()`'s `initialMetadata` literal.
- Modify: `src/index.ts` — re-export `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`.
- Create: `tests/synthetic-playtest.test.ts` — lifecycle, stop reasons, failure modes, composition, sourceKind.
- Modify: `tests/session-recorder.test.ts` — extend with sourceKind:'synthetic' / policySeed test.
- Modify: `tests/session-bundle.test.ts` — widen sourceKind type-test.
- Modify: `docs/api-reference.md` — sections for `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`. Update `SessionRecorderConfig` and `SessionMetadata` sections.
- Create: `docs/guides/synthetic-playtest.md` — quickstart + policy authoring guide + determinism contract + CI pattern + bundle→script conversion.
- Modify: `docs/guides/session-recording.md` — add §"Synthetic-source bundles" subsection.
- Modify: `docs/architecture/decisions.md` — ADRs 3, 3a, 4, 6.
- Modify: `docs/changelog.md`, `docs/devlog/*`.
- Modify: `package.json` (`0.8.0`), `src/version.ts` (`0.8.0`), `README.md` (badge).

### Step 1: Widen `SessionMetadata.sourceKind` (test-first)

- [ ] Edit `tests/session-bundle.test.ts`: add a type-only test that verifies the literal `'synthetic'` is assignable to `SessionMetadata.sourceKind`.

```ts
it('SessionMetadata.sourceKind accepts "synthetic" (b-bump in v0.8.0)', () => {
  const meta: SessionMetadata = {
    sessionId: 'x', engineVersion: '0.8.0', nodeVersion: '20',
    recordedAt: 't', startTick: 0, endTick: 0, persistedEndTick: 0,
    durationTicks: 0, sourceKind: 'synthetic',
  };
  expect(meta.sourceKind).toBe('synthetic');
});
```

- [ ] Run: `npm test -- session-bundle` — expect FAIL (TS narrowing rejects 'synthetic').

- [ ] Edit `src/session-bundle.ts`: change the union to `'session' | 'scenario' | 'synthetic'`. Add `policySeed?: number` field.

- [ ] Run: `npm test -- session-bundle` — expect PASS.

### Step 2: Extend `SessionRecorderConfig` with optional fields

- [ ] Edit `tests/session-recorder.test.ts`: add a test that constructs `SessionRecorder` with `sourceKind: 'synthetic'` + `policySeed: 42`; assert the recorded `metadata.sourceKind === 'synthetic'` and `metadata.policySeed === 42`.

- [ ] Run: expect FAIL.

- [ ] Edit `src/session-recorder.ts`:
  - Add `sourceKind?: 'session' | 'scenario' | 'synthetic'` and `policySeed?: number` to `SessionRecorderConfig`.
  - Add private `_sourceKind` and `_policySeed` fields, populate from config in constructor.
  - Update the `initialMetadata` literal at line 122-133 to read these fields with defaults: `sourceKind: this._sourceKind ?? 'session'`, `...(this._policySeed !== undefined ? { policySeed: this._policySeed } : {})`.

- [ ] Run: expect PASS.

### Step 3: Write failing tests for `runSynthPlaytest` lifecycle

- [ ] Edit `tests/synthetic-playtest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { World, type WorldConfig, runSynthPlaytest, noopPolicy, scriptedPolicy } from '../src/index.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });

interface Cmds { spawn: { id: number } }

describe('runSynthPlaytest lifecycle', () => {
  it('runs maxTicks steps and returns a synthetic-kind bundle', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    world.registerHandler('spawn', () => undefined);
    const result = runSynthPlaytest({ world, policies: [noopPolicy<Record<string, never>, Cmds>()], maxTicks: 5 });
    expect(result.stopReason).toBe('maxTicks');
    expect(result.ticksRun).toBe(5);
    expect(result.ok).toBe(true);
    expect(result.bundle.metadata.sourceKind).toBe('synthetic');
    expect(typeof result.bundle.metadata.policySeed).toBe('number');
  });

  it('rejects maxTicks <= 0 with RangeError', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    expect(() => runSynthPlaytest({ world, policies: [], maxTicks: 0 })).toThrow(RangeError);
    expect(() => runSynthPlaytest({ world, policies: [], maxTicks: -1 })).toThrow(RangeError);
  });

  // ... stopWhen, scriptedPolicy emit, composition external ordering, etc.
});
```

### Step 4: Write failing tests for stop reasons + failure modes

```ts
describe('runSynthPlaytest stop reasons', () => {
  it('stopWhen fires when predicate returns truthy', () => { /* ... */ });
  it('poisoned: world poison stops with stopReason poisoned', () => { /* ... */ });
  it('policyError: policy throw stops with stopReason policyError + populated policyError field', () => { /* ... */ });
  it('connect-time sink failure throws (does not return a bundle)', () => { /* ... */ });
  it('mid-tick sink failure returns ok:false with stopReason sinkError', () => { /* ... */ });
  it('pre-step policyError on tick 1 produces ticksRun=0', () => { /* ... */ });
});

describe('runSynthPlaytest composition', () => {
  it('two policies on same tick: bundle.commands[].sequence is monotonic in policy-array order', () => {
    /* ... assert sequence[0] < sequence[1] for the per-policy commands */
  });
});

describe('runSynthPlaytest determinism', () => {
  it('same policySeed produces structurally identical bundles (modulo sessionId/recordedAt)', () => { /* ... */ });
});
```

### Step 5: Implement `runSynthPlaytest` per design v10 §7.1 lifecycle

- [ ] Append to `src/synthetic-playtest.ts`:

```ts
import { DeterministicRandom } from './random.js';
import { MemorySink, type SessionSink, type SessionSource } from './session-sink.js';
import { SessionRecorder } from './session-recorder.js';
import type { SessionBundle } from './session-bundle.js';

export interface SynthPlaytestConfig<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
  TDebug = JsonValue,
> {
  world: World<TEventMap, TCommandMap, TComponents, TState>;
  policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
  maxTicks: number;
  sink?: SessionSink & SessionSource;
  sourceLabel?: string;
  policySeed?: number;
  stopWhen?: (ctx: StopContext<TEventMap, TCommandMap, TComponents, TState>) => boolean;
  snapshotInterval?: number | null;
}

export interface SynthPlaytestResult<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
  TDebug = JsonValue,
> {
  bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
  ticksRun: number;
  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError';
  ok: boolean;
  policyError?: {
    policyIndex: number;
    tick: number;
    error: { name: string; message: string; stack: string | null };
  };
}

export function runSynthPlaytest<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TComponents extends ComponentRegistry = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>,
  TDebug = JsonValue,
>(
  config: SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState, TDebug>,
): SynthPlaytestResult<TEventMap, TCommandMap, TComponents, TState, TDebug> {
  // Step 1: validation
  if (!Number.isInteger(config.maxTicks) || config.maxTicks < 1) {
    throw new RangeError('maxTicks must be a positive integer');
  }

  const { world, policies, maxTicks, sink, sourceLabel, snapshotInterval } = config;
  const startTick = world.tick;

  // Step 2: sub-RNG init (BEFORE recorder.connect so initial snapshot reflects post-derivation state).
  const policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000);
  const subRng = new DeterministicRandom(policySeed);

  // Step 3: recorder attach with sourceKind:'synthetic' and policySeed.
  const effectiveSink: SessionSink & SessionSource = sink ?? new MemorySink();
  const recorder = new SessionRecorder<TEventMap, TCommandMap, TDebug>({
    world: world as unknown as World<TEventMap, TCommandMap>,  // T-narrow OK; recorder doesn't use TComponents/TState
    sink: effectiveSink,
    snapshotInterval: snapshotInterval ?? 1000,
    terminalSnapshot: true,  // hardcoded — see §7.1 step 3
    sourceLabel: sourceLabel ?? 'synthetic',
    sourceKind: 'synthetic',
    policySeed,
  });
  recorder.connect();
  if (recorder.lastError !== null) {
    // Connect-time sink failure: re-throw.
    try { recorder.disconnect(); } catch { /* best-effort */ }
    throw recorder.lastError;
  }

  // Step 4: tick loop.
  let ticksRun = 0;
  let stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError' = 'maxTicks';
  let policyError: SynthPlaytestResult<TEventMap, TCommandMap, TComponents, TState, TDebug>['policyError'];
  const random = () => subRng.random();

  outer: for (let i = 0; i < maxTicks; i++) {
    const policyCtx: PolicyContext<TEventMap, TCommandMap, TComponents, TState> = {
      world, tick: world.tick + 1, random,
    };
    for (let p = 0; p < policies.length; p++) {
      let cmds: PolicyCommand<TCommandMap>[];
      try {
        cmds = policies[p](policyCtx);
      } catch (err) {
        const e = err as Error;
        stopReason = 'policyError';
        policyError = {
          policyIndex: p,
          tick: policyCtx.tick,
          error: { name: e.name, message: e.message, stack: e.stack ?? null },
        };
        break outer;
      }
      for (const cmd of cmds) {
        world.submitWithResult(cmd.type, cmd.data);
      }
    }
    try {
      world.step();
    } catch {
      stopReason = 'poisoned';
      break;
    }
    if (recorder.lastError !== null) {
      stopReason = 'sinkError';
      break;
    }
    ticksRun++;
    const stopCtx: StopContext<TEventMap, TCommandMap, TComponents, TState> = {
      world, tick: world.tick, random,
    };
    if (config.stopWhen?.(stopCtx)) {
      stopReason = 'stopWhen';
      break;
    }
  }

  // Step 5: disconnect + return.
  try { recorder.disconnect(); } catch { /* best-effort */ }
  const ok = stopReason !== 'sinkError';
  const bundle = recorder.toBundle() as unknown as SessionBundle<TEventMap, TCommandMap, TDebug>;
  return { bundle, ticksRun, stopReason, ok, policyError };
}
```

### Step 6: Run all tests + gates

- [ ] `npm test` — all pass.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` — all clean.

### Step 7: Update doc surface

- [ ] `docs/api-reference.md`: add sections for `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`. Update existing `SessionRecorderConfig` and `SessionMetadata` sections to document the new optional fields and widened `sourceKind`.

- [ ] Create `docs/guides/synthetic-playtest.md`: quickstart with a concrete game-style example (sketch a tiny ECS with a unit-spawn handler, build a 100-tick synthetic playtest, replay via SessionReplayer.selfCheck). Cover: policy authoring, determinism contract, `ctx.random()` vs `world.random()` rule, CI guard pattern with `result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1`, bundle→script conversion with the `+1` formula, composition external-ordering rule.

- [ ] `docs/guides/session-recording.md`: add §"Synthetic-source bundles" — note `sourceKind: 'synthetic'`, `metadata.policySeed`, link to `synthetic-playtest.md`.

- [ ] `docs/architecture/decisions.md`: append ADR 3 (sourceKind union widening, b-bump rationale), ADR 3a (set at construction, not post-hoc mutation), ADR 4 (sync single-process), ADR 6 (composed policies don't observe each other within a tick). Pull text from design v10 §15.

- [ ] `docs/changelog.md`: new `### 0.8.0 (2026-04-27)` entry. **Mark as MAJOR/breaking**: SessionMetadata.sourceKind union widening can break downstream `assertNever` exhaustive switches; downstream consumers add `case 'synthetic':`. Other additions (SessionRecorderConfig.sourceKind?, policySeed?, runSynthPlaytest) are additive.

- [ ] `docs/devlog/summary.md` + `detailed/`: per-task entries.

- [ ] `package.json` → `0.8.0`. `src/version.ts` → `'0.8.0'`. `README.md` badge → `0.8.0`.

### Step 8: Per-task multi-CLI review

- [ ] Run Codex + Opus parallel reviews. Iterate to convergence.

### Step 9: Commit T2

- [ ] `git add -A && git commit` with descriptive b-bump-flagged message.

---

## Task 3: Determinism integration tests + structural docs (v0.8.1)

**Goal:** Cover the cross-cutting determinism integration patterns that need both T1's policies AND T2's harness in place. Land the architecture-level docs.

**Files:**
- Create: `tests/synthetic-determinism.test.ts` — selfCheck round-trip on non-poisoned bundle; production-determinism dual-run; sub-RNG positive isolation; sub-RNG negative-path (policy calls world.random() → state divergence at first periodic snapshot); poisoned-bundle replay (selfCheck throws); pre-step abort vacuous case (ticksRun=0); bundle→script conversion regression.
- Modify: `docs/architecture/ARCHITECTURE.md` — Component Map row for synthetic-playtest.
- Modify: `docs/architecture/drift-log.md` — entry: "Synthetic Playtest Harness landed v0.7.20 + v0.8.0; SessionMetadata.sourceKind widened (b-bump axis); sub-RNG separation from world.rng for between-tick policy randomness."
- Modify: `docs/design/ai-first-dev-roadmap.md` — Spec 3 status: Drafted → Implemented; link the implementation plan + design.
- Modify: `docs/guides/ai-integration.md` — note synthetic playtest as a Tier-1 piece of the AI feedback loop.
- Modify: `docs/changelog.md`, `docs/devlog/*`.
- Modify: `package.json` (`0.8.1`), `src/version.ts` (`0.8.1`), `README.md` (badge).

### Step 1: Determinism round-trip test (positive)

- [ ] `tests/synthetic-determinism.test.ts`:

```ts
it('non-poisoned synthetic bundle passes selfCheck.ok with ticksRun >= 1', () => {
  const setup = (w: World<Record<string, never>, Cmds>) => {
    w.registerComponent('rng-result');
    w.registerSystem({
      name: 'rng-sys', phase: 'update',
      execute: (lw) => {
        const id = lw.createEntity();
        lw.setComponent(id, 'rng-result', { v: lw.random() });
      },
    });
  };
  const world = new World<Record<string, never>, Cmds>(mkConfig());
  setup(world);
  const result = runSynthPlaytest({
    world, policies: [randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
    })], maxTicks: 50, policySeed: 42,
  });
  expect(result.ok).toBe(true);
  expect(result.ticksRun).toBeGreaterThanOrEqual(1);
  const replayer = SessionReplayer.fromBundle(result.bundle, {
    worldFactory: (snap) => {
      const w = new World<Record<string, never>, Cmds>(mkConfig());
      setup(w);
      w.applySnapshot(snap);
      return w;
    },
  });
  expect(replayer.selfCheck().ok).toBe(true);
});
```

### Step 2: Production-determinism dual-run

- [ ] Test: same `policySeed` + same setup → bundle.commands structurally equal across two runs.

### Step 3: Sub-RNG negative-path

- [ ] Test: a policy that calls `ctx.world.random()` directly (instead of `ctx.random()`) produces a bundle whose `selfCheck()` returns `ok: false` with state divergence at first periodic snapshot.

### Step 4: Poisoned bundle replay

- [ ] Test: poisoned synthetic bundle: replay through `SessionReplayer.selfCheck()` THROWS the original `WorldTickFailureError`. Assert via `expect(() => selfCheck()).toThrow(...)`.

### Step 5: Pre-step abort vacuous case

- [ ] Test: policy throws on tick 1 → result.ticksRun === 0 → bundle has terminal == initial → `selfCheck()` returns `ok: true` vacuously over zero segments.

### Step 6: Bundle→script conversion regression

- [ ] Test: record a bundle with seeded commands; convert via the `+1` formula; replay through a fresh harness with `scriptedPolicy`; assert resulting bundle has identical command stream (types, data, ticks).

### Step 7: Run all gates

### Step 8: Update structural docs

- [ ] `docs/architecture/ARCHITECTURE.md`: append a Component Map row: "Synthetic Playtest | `src/synthetic-playtest.ts` | drives a World via pluggable policies for N ticks; sub-RNG sandboxed from world.rng; produces SessionBundle | new in v0.7.20+v0.8.0".

- [ ] `docs/architecture/drift-log.md`: append.

- [ ] `docs/design/ai-first-dev-roadmap.md`: Spec 3 status to Implemented.

- [ ] `docs/guides/ai-integration.md`: add a §"Synthetic Playtest Harness (Tier 1)" subsection linking to the new guide.

- [ ] `docs/README.md`: index the new guide.

- [ ] Changelog + devlog + version bumps.

### Step 9: Multi-CLI review

### Step 10: Commit T3

---

## Final pass: cross-cutting checks before requesting merge

After T1, T2, T3 are committed:

- [ ] All four engine gates pass on the branch tip.
- [ ] Reviews under `docs/reviews/synthetic-playtest-T{1,2,3}/...` show convergence.
- [ ] `docs/changelog.md` has three new version entries.
- [ ] `docs/devlog/detailed/<latest>.md` has three new task entries.
- [ ] `docs/api-reference.md` is internally consistent (no removed-API references; new sections cross-link).
- [ ] `docs/guides/synthetic-playtest.md` exists and renders correctly (as much as we can verify from text).
- [ ] `docs/architecture/decisions.md` has 7 new ADRs (1, 2, 3, 3a, 4, 5, 6).
- [ ] `docs/design/ai-first-dev-roadmap.md` shows Spec 3 = Implemented.
- [ ] `docs/architecture/drift-log.md` has the new entry.
- [ ] `README.md` Feature Overview row added; version badge bumped.
- [ ] `git log --oneline` shows 3 task commits + reviews on the branch.

Then surface for explicit user merge authorization (per AGENTS.md, no auto-merge of b-bump branches).

---

## Risks / Things to watch

- **`World` generic erasure on `SessionRecorder` cast** in T2 step 5: the harness casts `world as unknown as World<TEventMap, TCommandMap>` because `SessionRecorder` is 3-generic (no TComponents/TState). This is safe — the recorder doesn't use those generics — but the cast looks ugly. Reviewers may flag; the alternative is widening `SessionRecorder` to 5 generics, which is a bigger change. Document the rationale in the same commit's REVIEW.md if asked.

- **`ScriptedPolicyEntry.tick` off-by-one** is documented in design v10 §6.3. The bundle→script regression test in T3 step 6 is the safety net; if it fails, the fix is in the conversion formula, not the policy implementation.

- **`SessionRecorder.connect()` non-throwing on sink.open() failure** is exploited by the harness's `recorder.lastError` check. Verified against `src/session-recorder.ts:140-145` during design review.

- **`world.tick` advances even on poison** per `src/world.ts:1872`. The `ticksRun = K - 1` formula on `'poisoned'` stops accounts for this (the failing tick's increment is skipped).

- **Empty catalog / zero burst**: `randomPolicy` validates these and throws `RangeError` (T1 step 9 implementation includes the guards).
