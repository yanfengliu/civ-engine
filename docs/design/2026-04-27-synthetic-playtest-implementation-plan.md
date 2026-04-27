# Synthetic Playtest Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Plan revision:** v5 (2026-04-27) — addresses iter-4 multi-CLI plan review findings. Opus ACCEPTed iter-4; Codex flagged 1 HIGH + 1 MED (CommandExecutionResult schema mismatch + under-claim of structural identity). Iter-1..4 syntheses at `docs/reviews/synthetic-playtest/2026-04-27/plan-{1,2,3,4}/REVIEW.md`. v5 fixes:
- (Codex HIGH) `CommandExecutionResult` has no `sequence` field — only `submissionSequence`, `tick`, etc. (`world.ts:145-156`). v5 deep-equals the entire `bundle.executions` array instead of cherry-picking fields. Same fix in T2 step 9 + T3 step 2.
- (Codex MED) Production-determinism dual-run now uses `expect(arr1).toEqual(arr2)` for commands, executions, ticks, snapshots, failures — full structural comparison. Metadata comparison strips volatile fields (sessionId, recordedAt) via destructure-rest pattern.

**Goal:** Implement the engine-level Synthetic Playtest Harness defined in `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI review iterations).

**Architecture:** Adds `runSynthPlaytest` (synchronous harness driving a `World` via pluggable `Policy` functions for `N` ticks → `SessionBundle`), three built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`), shared `PolicyContext` / `StopContext` types with seeded sub-RNG, and a discriminated-union `PolicyCommand`. Extends `SessionRecorderConfig` with optional `sourceKind?` and `policySeed?` (additive); widens `SessionMetadata.sourceKind` from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'` (b-bump per AGENTS.md compile-breaking rule). Non-poisoned bundles with `ticksRun ≥ 1` round-trip through `SessionReplayer.selfCheck()`.

**Tech Stack:** TypeScript 5.7+, Vitest 3, ESLint 9, Node 18+. ESM + Node16 module resolution.

**Shell:** Although the OS is Windows, the project's harness uses **bash** (mingw on Windows). All shell snippets in this plan use Unix syntax (`/tmp/`, `&` for backgrounding, `$(...)`, `[ -s file ]`, `mkdir -p`). This matches the project's convention as documented in CLAUDE.md.

**Spec sections referenced:** §-numbered references map 1:1 to sections in `2026-04-27-synthetic-playtest-harness-design.md`.

**Branch:** `agent/synthetic-playtest`. Three commits T1/T2/T3. Branch stays at tip awaiting explicit user merge authorization per AGENTS.md.

**Versioning:** Branch base `v0.7.19`. T1 = `0.7.20` (c). T2 = `0.8.0` (b — sourceKind union widening). T3 = `0.8.1` (c).

---

## Per-task review and doc pattern (T1, T2, T3 each)

### A. Per-task documentation (in same commit as code)

For every task that adds public surface:

- `docs/changelog.md` — new version entry.
- `docs/devlog/summary.md` — one line.
- `docs/devlog/detailed/<latest>.md` — full entry. **Use `ls -1t docs/devlog/detailed/ | head -1`** to find the latest file (date may have rolled forward).
- `docs/api-reference.md` — sections for new public types/methods.
- `package.json` + `src/version.ts` + `README.md` (badge) — version bump.

T1 also: ADRs 1, 2, 5 in `docs/architecture/decisions.md`.
T2 also: ADRs 3, 3a, 4, 6 + new `docs/guides/synthetic-playtest.md` + extension to `docs/guides/session-recording.md` + **`docs/README.md` index entry for the new guide** + **`README.md` Feature Overview row + Public Surface bullet** for `runSynthPlaytest`.
T3 also: `docs/architecture/ARCHITECTURE.md` Component Map row + `docs/architecture/drift-log.md` entry + `docs/design/ai-first-dev-roadmap.md` Spec 3 status update + extension of `docs/guides/ai-integration.md`.

### B. Per-task multi-CLI review (before commit)

After all 4 engine gates pass + impl + tests + docs are in place, but before the commit. **Use the previous task's tip as the diff base for per-task review (NOT `main..HEAD` which would include earlier tasks):**

- T1's review base: `main` (T1 is the first task on the branch). Use `git diff main..HEAD`.
- T2's review base: T1's commit hash. Capture it via `T1_TIP=$(git rev-parse HEAD)` after T1 lands; T2's review uses `git diff $T1_TIP..HEAD`.
- T3's review base: T2's commit hash. Capture similarly; T3's review uses `git diff $T2_TIP..HEAD`.

Per-task review attribution is cleaner this way; cumulative diffs muddle finding ownership across tasks.

```bash
# 1. Generate WIP diff (use the previous task's tip as base; main only for T1).
git diff <prev-task-tip-or-main>..HEAD > /tmp/task-diff.patch

# 2. Create review folder.
mkdir -p docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw

# 3. Build prompt with task-specific context (intent, files-to-focus, anti-regression).
cat > /tmp/review-prompt.txt <<'EOF'
[task-specific code-review prompt per AGENTS.md baseline + task slice]
EOF
PROMPT=$(cat /tmp/review-prompt.txt)

# 4. Run Codex + Opus in parallel (background; ~5-10 min each).
git diff <prev-task-tip-or-main>..HEAD | codex exec --model gpt-5.4 -c model_reasoning_effort=xhigh \
  -c approval_policy=never --sandbox read-only --ephemeral "$PROMPT" \
  > docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw/codex.md 2>&1 &
git diff <prev-task-tip-or-main>..HEAD | claude -p --model opus --effort xhigh \
  --append-system-prompt "$PROMPT" \
  --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)" \
  > docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw/opus.md 2>&1 &

# 5. Wait via background poller (avoid harness sleep limits).
until [ -s docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw/codex.md ] && \
      [ -s docs/reviews/synthetic-playtest-T<N>/$(date +%Y-%m-%d)/1/raw/opus.md ]; do
  sleep 8;
done
echo done

# 6. Synthesize REVIEW.md (severity-tagged findings in plain text). Address findings.
# 7. If review iter > 1, update REVIEW.md with iter-N synthesis. Iterate to convergence.
# 8. Bump version, finalize doc surface, commit.
```

If a CLI is unreachable (Gemini quota-out is the running condition during this work), proceed with the remaining reviewer and note in the devlog (per AGENTS.md "If a CLI is unreachable").

### C. Convergence rule

Iterate per-task review until both reviewers ACCEPT OR remaining findings are nitpicks (per AGENTS.md "Continue iterating until reviewers nitpick instead of catching real bugs"). Do not loop infinitely; if reviewers diverge, lean on the conservative reading.

### D. Engine gates (mandatory before commit)

```bash
npm test            # all pass
npm run typecheck   # no type errors
npm run lint        # clean
npm run build       # clean
```

If any gate fails, fix and re-run before committing.

---

## Task 1: Policy interface + three built-in policies (v0.7.20, c-bump)

**Goal:** Land the policy-side primitives. The harness API ships in T2.

**Files:**
- Create: `src/synthetic-playtest.ts` — types + 3 policy factories.
- Modify: `src/index.ts` — re-export.
- Create: `tests/synthetic-policies.test.ts` — unit tests.
- Modify: `docs/api-reference.md` — sections for new types and policy factories.
- Modify: `docs/architecture/decisions.md` — ADRs 1, 2, 5.
- Modify: `docs/changelog.md`, `docs/devlog/summary.md`, latest `docs/devlog/detailed/*.md`.
- Modify: `package.json` (`0.7.20`), `src/version.ts` (`0.7.20`), `README.md` (badge).

### Step 1: Create test file with `noopPolicy` failing test

- [ ] Create `tests/synthetic-policies.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DeterministicRandom, World, type WorldConfig } from '../src/index.js';
import {
  noopPolicy,
  randomPolicy,
  scriptedPolicy,
  type PolicyContext,
  type RandomPolicyConfig,
  type ScriptedPolicyEntry,
} from '../src/synthetic-playtest.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });

interface Cmds { spawn: { id: number } }

const mkPolicyCtx = (tick: number, seed = 42): PolicyContext<Record<string, never>, Cmds> => {
  const rng = new DeterministicRandom(seed);
  return { world: new World<Record<string, never>, Cmds>(mkConfig()), tick, random: () => rng.random() };
};

describe('noopPolicy', () => {
  it('returns empty array regardless of context', () => {
    const policy = noopPolicy<Record<string, never>, Cmds>();
    expect(policy(mkPolicyCtx(1))).toEqual([]);
    expect(policy(mkPolicyCtx(99))).toEqual([]);
  });
});
```

### Step 2: Run noopPolicy test — expect FAIL

- [ ] Run: `npm test -- tests/synthetic-policies`
- [ ] Expected: FAIL — `Cannot find module '../src/synthetic-playtest.js'`.

### Step 3: Create `src/synthetic-playtest.ts` with types + `noopPolicy`

- [ ] Create `src/synthetic-playtest.ts`:

```ts
import type { World, ComponentRegistry } from './world.js';

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

(Note: `JsonValue` is NOT imported here — T1 doesn't use it. T2 adds it for `SynthPlaytestConfig.TDebug` default.)

### Step 4: Run test — expect PASS

- [ ] Run: `npm test -- tests/synthetic-policies`
- [ ] Expected: noopPolicy test PASSes.

### Step 5: Add `scriptedPolicy` failing tests

- [ ] Append to `tests/synthetic-policies.test.ts`:

```ts
describe('scriptedPolicy', () => {
  it('emits the right entry at the right tick', () => {
    const sequence: ScriptedPolicyEntry<Cmds>[] = [
      { tick: 1, type: 'spawn', data: { id: 100 } },
      { tick: 3, type: 'spawn', data: { id: 200 } },
    ];
    const policy = scriptedPolicy<Record<string, never>, Cmds>(sequence);
    expect(policy(mkPolicyCtx(1))).toEqual([{ type: 'spawn', data: { id: 100 } }]);
    expect(policy(mkPolicyCtx(2))).toEqual([]);
    expect(policy(mkPolicyCtx(3))).toEqual([{ type: 'spawn', data: { id: 200 } }]);
    expect(policy(mkPolicyCtx(4))).toEqual([]);
  });

  it('groups multiple entries on the same tick in declaration order', () => {
    const sequence: ScriptedPolicyEntry<Cmds>[] = [
      { tick: 1, type: 'spawn', data: { id: 1 } },
      { tick: 1, type: 'spawn', data: { id: 2 } },
      { tick: 1, type: 'spawn', data: { id: 3 } },
    ];
    const policy = scriptedPolicy<Record<string, never>, Cmds>(sequence);
    expect(policy(mkPolicyCtx(1))).toEqual([
      { type: 'spawn', data: { id: 1 } },
      { type: 'spawn', data: { id: 2 } },
      { type: 'spawn', data: { id: 3 } },
    ]);
  });

  it('handles empty sequence', () => {
    const policy = scriptedPolicy<Record<string, never>, Cmds>([]);
    expect(policy(mkPolicyCtx(1))).toEqual([]);
  });
});
```

### Step 6: Run scripted tests — expect FAIL

- [ ] Run: `npm test -- tests/synthetic-policies`
- [ ] Expected: scriptedPolicy + ScriptedPolicyEntry symbols undefined.

### Step 7: Implement `scriptedPolicy`

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

### Step 8: Run scripted tests — expect PASS

- [ ] Run: `npm test -- tests/synthetic-policies`
- [ ] Expected: All scriptedPolicy tests PASS.

### Step 9: Add `randomPolicy` failing tests (incl. `ctx`-using catalog and validation)

- [ ] Append to `tests/synthetic-policies.test.ts`:

```ts
describe('randomPolicy', () => {
  it('seeded selection is deterministic across cross-tick sequences', () => {
    // Use a single shared sub-RNG threading across ticks (mirrors what the harness does).
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [
        () => ({ type: 'spawn', data: { id: 1 } }),
        () => ({ type: 'spawn', data: { id: 2 } }),
        () => ({ type: 'spawn', data: { id: 3 } }),
      ],
    };
    const runOnce = (seed: number) => {
      const policy = randomPolicy<Record<string, never>, Cmds>(config);
      const rng = new DeterministicRandom(seed);
      const random = () => rng.random();
      const out: unknown[] = [];
      for (let t = 1; t <= 5; t++) {
        out.push(policy({ world: new World<Record<string, never>, Cmds>(mkConfig()), tick: t, random }));
      }
      return out;
    };
    expect(runOnce(42)).toEqual(runOnce(42));
    expect(runOnce(42)).not.toEqual(runOnce(99));
  });

  it('catalog functions receive PolicyContext (can read ctx.world.tick / ctx.tick)', () => {
    let observedTick = -1;
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [
        (ctx) => {
          observedTick = ctx.tick;
          return { type: 'spawn', data: { id: ctx.tick * 10 } };
        },
      ],
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    const out = policy(mkPolicyCtx(7));
    expect(observedTick).toBe(7);
    expect(out).toEqual([{ type: 'spawn', data: { id: 70 } }]);
  });

  it('respects frequency: emits only on ticks where tick % frequency === offset', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 3,
      offset: 0,
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    expect(policy(mkPolicyCtx(0))).toHaveLength(1);  // 0 % 3 === 0
    expect(policy(mkPolicyCtx(1))).toHaveLength(0);  // 1 % 3 === 1
    expect(policy(mkPolicyCtx(2))).toHaveLength(0);  // 2 % 3 === 2
    expect(policy(mkPolicyCtx(3))).toHaveLength(1);  // 3 % 3 === 0
  });

  it('respects burst: emits N commands per fired tick', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      burst: 5,
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    expect(policy(mkPolicyCtx(1))).toHaveLength(5);
  });

  it('respects offset != 0', () => {
    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 3,
      offset: 2,
    };
    const policy = randomPolicy<Record<string, never>, Cmds>(config);
    expect(policy(mkPolicyCtx(0))).toHaveLength(0);
    expect(policy(mkPolicyCtx(1))).toHaveLength(0);
    expect(policy(mkPolicyCtx(2))).toHaveLength(1);  // 2 % 3 === 2
    expect(policy(mkPolicyCtx(5))).toHaveLength(1);  // 5 % 3 === 2
  });

  it('rejects empty catalog with RangeError', () => {
    expect(() => randomPolicy<Record<string, never>, Cmds>({ catalog: [] })).toThrow(RangeError);
  });

  it('rejects non-positive-integer frequency', () => {
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 0,
    })).toThrow(RangeError);
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 1.5,
    })).toThrow(RangeError);
  });

  it('rejects non-positive-integer burst', () => {
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      burst: 0,
    })).toThrow(RangeError);
  });

  it('rejects negative or out-of-range offset', () => {
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      offset: -1,
    })).toThrow(RangeError);
    expect(() => randomPolicy<Record<string, never>, Cmds>({
      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      frequency: 3,
      offset: 3,  // === frequency, out of range [0, frequency)
    })).toThrow(RangeError);
  });
});
```

### Step 10: Implement `randomPolicy`

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
  if (!Number.isInteger(frequency) || frequency < 1) {
    throw new RangeError('randomPolicy.frequency must be a positive integer');
  }
  if (!Number.isInteger(burst) || burst < 1) {
    throw new RangeError('randomPolicy.burst must be a positive integer');
  }
  if (!Number.isInteger(offset) || offset < 0 || offset >= frequency) {
    throw new RangeError(`randomPolicy.offset must be a non-negative integer < frequency (got ${offset}, frequency=${frequency})`);
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

### Step 11: Run all policy tests — expect PASS

- [ ] Run: `npm test -- tests/synthetic-policies`
- [ ] Expected: All tests PASS.

### Step 12: Re-export from `src/index.ts`

- [ ] Edit `src/index.ts` — add (next to other re-exports):

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

### Step 13: Run all 4 engine gates

- [ ] `npm test` → all PASS.
- [ ] `npm run typecheck` → no errors.
- [ ] `npm run lint` → clean.
- [ ] `npm run build` → clean.

### Step 14: Update doc surface

- [ ] `docs/api-reference.md`: append a new section `## Synthetic Playtest — Policies (v0.7.20)` with the following subsections (each with the verbatim TS signature from spec v10 §5/§6 + 1-2 sentence summary):
  - `Policy<TEventMap, TCommandMap, TComponents, TState>`
  - `PolicyContext<TEventMap, TCommandMap, TComponents, TState>`
  - `StopContext<TEventMap, TCommandMap, TComponents, TState>`
  - `PolicyCommand<TCommandMap>` — discriminated union
  - `RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>`
  - `ScriptedPolicyEntry<TCommandMap>` — discriminated union (incl. the `+1` bundle→script conversion note)
  - `noopPolicy()`
  - `randomPolicy(config)` — note offset/frequency/burst validation
  - `scriptedPolicy(sequence)` — note O(1) per-tick lookup; reference §6.3 for bundle conversion
  - End the section with: "The end-to-end harness `runSynthPlaytest` ships in v0.8.0 (T2)." Update TOC.

- [ ] `docs/architecture/decisions.md`: append three new ADRs. Pull text verbatim from design v10 §15:
  - **ADR 1**: Policy is a function, not a class hierarchy.
  - **ADR 2**: Policies receive read-only world; mutation via returned commands.
  - **ADR 5**: Policy randomness uses a separate seeded sub-RNG, with literal seed expression `Math.floor(world.random() * 0x1_0000_0000)`.

  Each ADR with **Decision:** + **Rationale:** + (for ADR 5) **Alternative considered and rejected:**.

- [ ] `docs/changelog.md`: prepend a new section before the latest entry:

```markdown
### 0.7.20 (2026-04-27)

- **feat(synthetic-playtest):** Policy interface + 3 built-in policies (T1 of Spec 3 implementation). Adds `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `RandomPolicyConfig`, `ScriptedPolicyEntry` types and `noopPolicy()`, `randomPolicy(config)`, `scriptedPolicy(sequence)` factories. Sub-RNG via `PolicyContext.random()` keeps policy randomness independent of `world.rng`. The end-to-end harness `runSynthPlaytest` ships in v0.8.0 (T2). Validation: 4 engine gates clean; new test file `synthetic-policies.test.ts` (~12 tests) covers determinism + validation + composition shape.
```

- [ ] `docs/devlog/summary.md`: prepend one line: `2026-04-27 — synth-playtest T1 (v0.7.20): Policy interface + 3 built-in policies`. Compact if > 50 lines.

- [ ] Latest detailed devlog (find via `ls -1t docs/devlog/detailed/ | head -1`): append T1 entry per AGENTS.md template (timestamp, action, code-reviewer comments per provider+theme, result, reasoning, notes).

- [ ] `package.json`: bump `"version": "0.7.20"`.
- [ ] `src/version.ts`: bump `ENGINE_VERSION = '0.7.20'`.
- [ ] `README.md`: bump version badge to `0.7.20`. (Feature Overview row + Public Surface bullets land in T2 when `runSynthPlaytest` ships.)

### Step 15: Per-task multi-CLI review

- [ ] Run Codex + Opus parallel diff review per the pattern in §B above.
- [ ] Synthesize REVIEW.md.
- [ ] Iterate to convergence.

### Step 16: Commit T1

- [ ] `git add -A && git commit -m`:

```
feat(synthetic-playtest): T1 Policy interface + three built-in policies (v0.7.20)

Implements the policy-side primitives from Spec 3 design v10 §5-§6:
- Policy / PolicyContext / StopContext / PolicyCommand types with the
  4-generic shape matching World<TEventMap, TCommandMap, TComponents,
  TState>.
- noopPolicy: empty-emit baseline.
- scriptedPolicy: pre-grouped by tick at construction (O(1) per-tick
  lookup); matched against PolicyContext.tick (about-to-execute tick).
  Bundle→script conversion requires +1 on submissionTick (per §6.3).
- randomPolicy: deterministic catalog selection via ctx.random() (sub-
  RNG). Validates catalog non-empty + frequency/burst as positive integers
  + offset as non-negative integer < frequency. Catalog generators receive
  the PolicyContext to read live world state.

ADRs 1, 2, 5 land in docs/architecture/decisions.md.

The runSynthPlaytest harness + b-bump-axis SessionMetadata.sourceKind
union widening ship in T2 (v0.8.0).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 2: `runSynthPlaytest` harness + SessionRecorder/Metadata extensions (v0.8.0, b-bump)

**Goal:** Ship the synchronous harness and the b-bump-axis sourceKind union widening + additive SessionRecorder fields. Land the full user-facing guide.

**Files:**
- Modify: `src/synthetic-playtest.ts` — add `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`.
- Modify: `src/session-bundle.ts` — widen `SessionMetadata.sourceKind` union; add `SessionMetadata.policySeed?`.
- Modify: `src/session-recorder.ts` — add `sourceKind?` and `policySeed?` to `SessionRecorderConfig`; thread through to `connect()`'s `initialMetadata`.
- Modify: `src/index.ts` — re-export.
- Create: `tests/synthetic-playtest.test.ts` — full coverage of acceptance criteria.
- Modify: `tests/session-recorder.test.ts` — extend with sourceKind/policySeed test (positive + missing-default).
- Modify: `tests/session-bundle.test.ts` — type-narrowing test using `npm run typecheck`.
- Modify: `tests/file-sink.test.ts` — round-trip test for `policySeed` in the manifest.
- Modify: `docs/api-reference.md` — sections for `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`. Update `SessionRecorderConfig` and `SessionMetadata` sections.
- Create: `docs/guides/synthetic-playtest.md` — quickstart + policy authoring + determinism + CI pattern + bundle→script conversion.
- Modify: `docs/guides/session-recording.md` — add §"Synthetic-source bundles".
- Modify: `docs/architecture/decisions.md` — ADRs 3, 3a, 4, 6.
- Modify: `docs/README.md` — index the new guide.
- Modify: `README.md` — Feature Overview row + Public Surface bullet for `runSynthPlaytest`; bump badge.
- Modify: `docs/changelog.md`, `docs/devlog/*`.
- Modify: `package.json` (`0.8.0`), `src/version.ts` (`0.8.0`).

### Step 1: Widen `SessionMetadata.sourceKind` (typecheck-first)

- [ ] Edit `tests/session-bundle.test.ts` — append the type-narrowing test (this test PASSes at runtime; the gate is `npm run typecheck`):

```ts
import type { SessionMetadata } from '../src/session-bundle.js';

it('SessionMetadata.sourceKind accepts "synthetic" (b-bump in v0.8.0)', () => {
  const meta: SessionMetadata = {
    sessionId: 'x', engineVersion: '0.8.0', nodeVersion: 'v20',
    recordedAt: 't', startTick: 0, endTick: 0, persistedEndTick: 0,
    durationTicks: 0, sourceKind: 'synthetic',
  };
  expect(meta.sourceKind).toBe('synthetic');
});
```

- [ ] Run: `npm run typecheck`
- [ ] Expected: FAIL — `Type '"synthetic"' is not assignable to type '"session" | "scenario"'`.

- [ ] Edit `src/session-bundle.ts`:
  - Change `sourceKind: 'session' | 'scenario'` to `sourceKind: 'session' | 'scenario' | 'synthetic'`.
  - Add `policySeed?: number;` field after `sourceLabel?`.

- [ ] Run: `npm run typecheck`
- [ ] Expected: PASS.

- [ ] Run: `npm test -- tests/session-bundle`
- [ ] Expected: PASS.

### Step 2: Verify no engine-internal exhaustive switches break (grep-verify)

- [ ] Run: `grep -rn "'session' | 'scenario'" src/ tests/`
- [ ] Expected: Match only in `src/session-bundle.ts` (the canonical declaration). If any other file copies this union literal (e.g., a local type narrowing that should also have `| 'synthetic'`), update it. Per the design v10 ADR 3 rationale, no engine-internal consumer branches on `sourceKind` exhaustively — so this grep should be empty or trivially the canonical site.

- [ ] Run: `grep -rn "sourceKind ===" src/ tests/` — confirm no `assertNever`-style exhaustive checks need updating.

### Step 3: Extend `SessionRecorderConfig` with `sourceKind?` + `policySeed?` (test-first)

- [ ] Edit `tests/session-recorder.test.ts` — append:

```ts
it('sourceKind defaults to "session" when not provided', () => {
  const world = mkWorld();
  const sink = new MemorySink();
  const rec = new SessionRecorder({ world, sink });
  rec.connect();
  rec.disconnect();
  const bundle = rec.toBundle();
  expect(bundle.metadata.sourceKind).toBe('session');
  expect(bundle.metadata.policySeed).toBeUndefined();
});

it('sourceKind: "synthetic" + policySeed: 42 flow into bundle.metadata', () => {
  const world = mkWorld();
  const sink = new MemorySink();
  const rec = new SessionRecorder({ world, sink, sourceKind: 'synthetic', policySeed: 42 });
  rec.connect();
  rec.disconnect();
  const bundle = rec.toBundle();
  expect(bundle.metadata.sourceKind).toBe('synthetic');
  expect(bundle.metadata.policySeed).toBe(42);
});
```

(Where `mkWorld` is the existing test helper in `session-recorder.test.ts`.)

- [ ] Run: `npm test -- tests/session-recorder`
- [ ] Expected: New tests FAIL — config accepts no `sourceKind` / `policySeed` field.

- [ ] Edit `src/session-recorder.ts`:
  - Add to `SessionRecorderConfig` interface:
    ```ts
    /** Default: 'session'. Set by harnesses (e.g., runSynthPlaytest passes 'synthetic'). */
    sourceKind?: 'session' | 'scenario' | 'synthetic';
    /** Optional. Populated only when sourceKind === 'synthetic'. Stored in metadata. */
    policySeed?: number;
    ```
  - Add private fields `_sourceKind?: 'session' | 'scenario' | 'synthetic'` and `_policySeed?: number`.
  - Populate from config in constructor: `this._sourceKind = config.sourceKind; this._policySeed = config.policySeed;`.
  - Update the `initialMetadata` literal in `connect()` (around line 122-133):
    ```ts
    const initialMetadata: SessionMetadata = {
      sessionId: this.sessionId,
      engineVersion: ENGINE_VERSION,
      nodeVersion: typeof process !== 'undefined' && process.version ? process.version : 'unknown',
      recordedAt: new Date().toISOString(),
      startTick: this._startTick,
      endTick: this._startTick,
      persistedEndTick: this._startTick,
      durationTicks: 0,
      sourceKind: this._sourceKind ?? 'session',
      ...(this._sourceLabel ? { sourceLabel: this._sourceLabel } : {}),
      ...(this._policySeed !== undefined ? { policySeed: this._policySeed } : {}),
    };
    ```

- [ ] Run: `npm test -- tests/session-recorder`
- [ ] Expected: All tests PASS.

### Step 4: Verify FileSink round-trips `policySeed` in manifest

- [ ] Edit `tests/file-sink.test.ts` — append (uses the file's existing named-import style: `mkdtempSync` from `node:fs`, `tmpdir` from `node:os`, `join` from `node:path`, plus the existing `afterEach(() => rmSync(...))` cleanup pattern in that file):

```ts
it('round-trips synthetic metadata (sourceKind + policySeed) in manifest', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'civ-engine-fsink-'));
  try {
    const sink = new FileSink(tmpDir);
    const meta: SessionMetadata = {
      sessionId: '11111111-1111-1111-1111-111111111111',
      engineVersion: '0.8.0',
      nodeVersion: 'v22.0.0',
      recordedAt: '2026-04-27T00:00:00Z',
      startTick: 0, endTick: 5, persistedEndTick: 5, durationTicks: 5,
      sourceKind: 'synthetic',
      policySeed: 1234,
    };
    sink.open(meta);
    sink.writeSnapshot({ tick: 0, snapshot: mkSnapshot(0) });
    sink.close();

    // Re-open via constructor pre-loads manifest.
    const reopened = new FileSink(tmpDir);
    expect(reopened.metadata.sourceKind).toBe('synthetic');
    expect(reopened.metadata.policySeed).toBe(1234);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
```

(`mkSnapshot` is the existing helper in `tests/file-sink.test.ts` — reuse it.)

- [ ] Run: `npm test -- tests/file-sink`
- [ ] Expected: PASS (the FileSink stores metadata as-is; the new field rides through transparently).

### Step 5: Write failing tests for `runSynthPlaytest` lifecycle and basic stop reasons

- [ ] Create `tests/synthetic-playtest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  World,
  noopPolicy,
  randomPolicy,
  runSynthPlaytest,
  scriptedPolicy,
  type PolicyContext,
  type RandomPolicyConfig,
  type WorldConfig,
} from '../src/index.js';

// Note: MemorySink and randomPolicy are first used in Step 9 tests below. To
// avoid an unused-import lint failure between Step 7 (impl) and Step 9 (when
// they're consumed), Step 8 runs `npm test` only — the canonical lint gate
// runs at Step 11 once Step 9's tests are in place. Alternatively, keep these
// imports out of the file until Step 9 (move them in alongside the tests).

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });

interface Cmds { spawn: { id: number } }

const mkWorld = () => {
  const w = new World<Record<string, never>, Cmds>(mkConfig());
  w.registerHandler('spawn', () => undefined);  // no-op handler so spawn commands don't poison
  return w;
};

describe('runSynthPlaytest — config validation', () => {
  it('rejects maxTicks <= 0 with RangeError', () => {
    const world = mkWorld();
    expect(() => runSynthPlaytest({ world, policies: [], maxTicks: 0 })).toThrow(RangeError);
    expect(() => runSynthPlaytest({ world, policies: [], maxTicks: -1 })).toThrow(RangeError);
  });

  it('rejects non-integer maxTicks', () => {
    const world = mkWorld();
    expect(() => runSynthPlaytest({ world, policies: [], maxTicks: 1.5 })).toThrow(RangeError);
  });

  it('rejects NaN policySeed', () => {
    const world = mkWorld();
    expect(() => runSynthPlaytest({
      world, policies: [], maxTicks: 1, policySeed: NaN,
    })).toThrow(RangeError);
  });
});

describe('runSynthPlaytest — basic lifecycle', () => {
  it('runs maxTicks steps and returns a synthetic-kind bundle', () => {
    const world = mkWorld();
    const result = runSynthPlaytest({
      world,
      policies: [noopPolicy<Record<string, never>, Cmds>()],
      maxTicks: 5,
    });
    expect(result.stopReason).toBe('maxTicks');
    expect(result.ticksRun).toBe(5);
    expect(result.ok).toBe(true);
    expect(result.bundle.metadata.sourceKind).toBe('synthetic');
    expect(typeof result.bundle.metadata.policySeed).toBe('number');
    expect(result.bundle.metadata.sourceLabel).toBe('synthetic');  // default
    expect(world.tick).toBe(5);
  });

  it('explicit policySeed overrides default and stores in metadata', () => {
    const world = mkWorld();
    const result = runSynthPlaytest({
      world, policies: [], maxTicks: 1, policySeed: 12345,
    });
    expect(result.bundle.metadata.policySeed).toBe(12345);
  });

  it('explicit sourceLabel overrides default', () => {
    const world = mkWorld();
    const result = runSynthPlaytest({
      world, policies: [], maxTicks: 1, sourceLabel: 'random-spawn-100t',
    });
    expect(result.bundle.metadata.sourceLabel).toBe('random-spawn-100t');
  });

  it('scriptedPolicy emits commands at PolicyContext.tick', () => {
    const world = mkWorld();
    const sequence = [
      { tick: 1, type: 'spawn' as const, data: { id: 100 } },
      { tick: 3, type: 'spawn' as const, data: { id: 200 } },
    ];
    const result = runSynthPlaytest({
      world,
      policies: [scriptedPolicy<Record<string, never>, Cmds>(sequence)],
      maxTicks: 5,
    });
    expect(result.bundle.commands).toHaveLength(2);
    expect(result.bundle.commands[0].data).toEqual({ id: 100 });
    expect(result.bundle.commands[1].data).toEqual({ id: 200 });
    expect(result.bundle.commands[0].submissionTick).toBe(0);  // submitted while world.tick was 0, before step that advances to 1
    expect(result.bundle.commands[1].submissionTick).toBe(2);
  });
});

describe('runSynthPlaytest — stop reasons', () => {
  it('stopWhen fires when predicate returns truthy (post-step)', () => {
    const world = mkWorld();
    const result = runSynthPlaytest({
      world,
      policies: [noopPolicy<Record<string, never>, Cmds>()],
      maxTicks: 100,
      stopWhen: (ctx) => ctx.tick === 3,
    });
    expect(result.stopReason).toBe('stopWhen');
    expect(result.ticksRun).toBe(3);
    expect(world.tick).toBe(3);
  });

  it('poisoned: world poison stops with stopReason "poisoned"', () => {
    const world = mkWorld();
    world.registerSystem({
      name: 'poison-on-tick-3', phase: 'update',
      execute: (lw) => { if (lw.tick === 3) throw new Error('intentional'); },
    });
    const result = runSynthPlaytest({
      world,
      policies: [noopPolicy<Record<string, never>, Cmds>()],
      maxTicks: 10,
    });
    expect(result.stopReason).toBe('poisoned');
    expect(result.ok).toBe(true);
    expect(result.bundle.metadata.failedTicks).toBeDefined();
    expect(result.bundle.metadata.failedTicks).toContain(3);
  });

  it('policyError: policy throw stops with stopReason "policyError" + populated policyError', () => {
    const world = mkWorld();
    const throwingPolicy = (ctx: PolicyContext<Record<string, never>, Cmds>) => {
      if (ctx.tick === 3) throw new Error('policy-bug');
      return [];
    };
    const result = runSynthPlaytest({
      world,
      policies: [throwingPolicy as any],
      maxTicks: 10,
    });
    expect(result.stopReason).toBe('policyError');
    expect(result.ok).toBe(true);
    expect(result.policyError).toBeDefined();
    expect(result.policyError!.policyIndex).toBe(0);
    expect(result.policyError!.tick).toBe(3);
    expect(result.policyError!.error.message).toBe('policy-bug');
    // bundle.failures unchanged (not synthesized)
    expect(result.bundle.metadata.failedTicks).toBeUndefined();
  });

  it('pre-step policyError on tick 1 produces ticksRun=0', () => {
    const world = mkWorld();
    const throwImmediately = () => { throw new Error('throws on first call'); };
    const result = runSynthPlaytest({
      world,
      policies: [throwImmediately as any],
      maxTicks: 10,
    });
    expect(result.stopReason).toBe('policyError');
    expect(result.ticksRun).toBe(0);
  });
});

```

### Step 6: Run tests — expect FAIL

- [ ] Run: `npm test -- tests/synthetic-playtest`
- [ ] Expected: FAIL — `runSynthPlaytest` not exported.

### Step 7: Implement `runSynthPlaytest` per design v10 §7.1

- [ ] Append to `src/synthetic-playtest.ts`:

```ts
import { DeterministicRandom } from './random.js';
import { MemorySink, type SessionSink, type SessionSource } from './session-sink.js';
import { SessionRecorder } from './session-recorder.js';
import type { SessionBundle } from './session-bundle.js';
import type { JsonValue } from './json.js';

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
  // Step 1: validation.
  if (!Number.isInteger(config.maxTicks) || config.maxTicks < 1) {
    throw new RangeError(`maxTicks must be a positive integer (got ${config.maxTicks})`);
  }
  if (config.policySeed !== undefined &&
      (!Number.isFinite(config.policySeed) || !Number.isInteger(config.policySeed))) {
    throw new RangeError(`policySeed must be a finite integer (got ${config.policySeed})`);
  }

  const { world, policies, maxTicks, sink, sourceLabel } = config;
  // Use 'in' to distinguish unset from explicit-null (??1000 would coerce null to 1000).
  const snapshotInterval: number | null =
    'snapshotInterval' in config && config.snapshotInterval !== undefined
      ? config.snapshotInterval
      : 1000;

  // Step 2: sub-RNG init (BEFORE recorder.connect so initial snapshot reflects post-derivation state).
  const policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000);
  const subRng = new DeterministicRandom(policySeed);
  const random = () => subRng.random();

  // Step 3: recorder attach.
  const effectiveSink: SessionSink & SessionSource = sink ?? new MemorySink();
  // SessionRecorder is 3-generic (no TComponents/TState; doesn't access them).
  // Cast is structurally safe — the recorder only reads world.tick / serialize / submitWithResult shapes.
  const recorder = new SessionRecorder<TEventMap, TCommandMap, TDebug>({
    world: world as unknown as World<TEventMap, TCommandMap>,
    sink: effectiveSink,
    snapshotInterval,
    terminalSnapshot: true,  // hardcoded — see design v10 §7.1 step 3
    sourceLabel: sourceLabel ?? 'synthetic',
    sourceKind: 'synthetic',
    policySeed,
  });
  recorder.connect();
  if (recorder.lastError !== null) {
    // Connect-time sink failure: propagate. There's no coherent bundle to return
    // because the initial snapshot may not have been persisted.
    const err = recorder.lastError;
    try { recorder.disconnect(); } catch { /* best-effort */ }
    throw err;
  }

  // Step 4: tick loop.
  let ticksRun = 0;
  let stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError' = 'maxTicks';
  let policyError: SynthPlaytestResult<TEventMap, TCommandMap, TComponents, TState, TDebug>['policyError'];

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
          error: { name: e.name ?? 'Error', message: e.message ?? String(e), stack: e.stack ?? null },
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
  // Tighten ok: also flips false if disconnect-time sink failure occurred.
  const ok = stopReason !== 'sinkError' && recorder.lastError === null;
  const bundle = recorder.toBundle() as unknown as SessionBundle<TEventMap, TCommandMap, TDebug>;
  return { bundle, ticksRun, stopReason, ok, policyError };
}
```

### Step 8: Run tests (gate)

- [ ] `npm test` — all pass.
- [ ] `npm run typecheck` — clean.

(Lint and build run at Step 11, after Step 9 adds the tests that consume `MemorySink` and `randomPolicy` — running lint here would fail on those unused imports.)

### Step 9: Add the 4 missing acceptance-criteria tests + composition + sink failure modes

- [ ] Append to `tests/synthetic-playtest.test.ts`:

```ts
describe('runSynthPlaytest — failure modes', () => {
  it('poisoned-world-at-start propagates RecorderClosedError', () => {
    const world = mkWorld();
    world.registerSystem({
      name: 'boom', phase: 'update', execute: () => { throw new Error('intentional'); },
    });
    expect(() => world.step()).toThrow();
    expect(world.isPoisoned()).toBe(true);

    expect(() => runSynthPlaytest({
      world,
      policies: [noopPolicy<Record<string, never>, Cmds>()],
      maxTicks: 10,
    })).toThrow(/world_poisoned|poisoned/);
  });

  it('connect-time sink failure throws (no bundle returned)', () => {
    const world = mkWorld();
    // Failing sink: open() throws.
    const failingSink = {
      open: () => { throw new Error('sink-open-failed'); },
      writeSnapshot: () => undefined,
      writeTick: () => undefined,
      writeMarker: () => undefined,
      writeAttachment: () => undefined,
      writeFailure: () => undefined,
      writeCommand: () => undefined,
      writeExecution: () => undefined,
      finalize: () => undefined,
      close: () => undefined,
      readSnapshots: () => [],
      readTicks: () => [],
      readMarkers: () => [],
      readCommands: () => [],
      readExecutions: () => [],
      readFailures: () => [],
      readAttachment: () => null,
      readSidecar: () => new Uint8Array(),
      get metadata() { return null as any; },
    } as any;

    expect(() => runSynthPlaytest({
      world,
      policies: [noopPolicy<Record<string, never>, Cmds>()],
      maxTicks: 5,
      sink: failingSink,
    })).toThrow();
  });

  it('mid-tick sink failure: ok=false, stopReason="sinkError"', () => {
    // Inject a sink that succeeds on open() + initial snapshot but throws on subsequent writes.
    const world = mkWorld();
    let writes = 0;
    const memorySink = new MemorySink();
    const wrappedSink = new Proxy(memorySink, {
      get(target, prop) {
        if (prop === 'writeSnapshot') {
          return (entry: unknown) => {
            writes++;
            if (writes > 1) throw new Error('disk-full');
            return (target as any).writeSnapshot(entry);
          };
        }
        return Reflect.get(target, prop);
      },
    });

    const result = runSynthPlaytest({
      world,
      policies: [noopPolicy<Record<string, never>, Cmds>()],
      maxTicks: 10,
      sink: wrappedSink as any,
      snapshotInterval: 2,
    });
    expect(result.ok).toBe(false);
    expect(result.stopReason).toBe('sinkError');
  });
});

describe('runSynthPlaytest — composition', () => {
  it('two policies on same tick: bundle.commands[].sequence is monotonic in policy-array order', () => {
    const world = mkWorld();
    const policyA = scriptedPolicy<Record<string, never>, Cmds>([
      { tick: 1, type: 'spawn', data: { id: 1 } },
    ]);
    const policyB = scriptedPolicy<Record<string, never>, Cmds>([
      { tick: 1, type: 'spawn', data: { id: 2 } },
    ]);
    const result = runSynthPlaytest({
      world,
      policies: [policyA, policyB],
      maxTicks: 1,
    });
    expect(result.bundle.commands).toHaveLength(2);
    expect(result.bundle.commands[0].data).toEqual({ id: 1 });
    expect(result.bundle.commands[1].data).toEqual({ id: 2 });
    expect(result.bundle.commands[0].sequence).toBeLessThan(result.bundle.commands[1].sequence);
  });

  it('composed-policy partial-submit-then-throw: earlier commands recorded, no executions', () => {
    const world = mkWorld();
    const successfulPolicy = scriptedPolicy<Record<string, never>, Cmds>([
      { tick: 1, type: 'spawn', data: { id: 100 } },
    ]);
    const throwingPolicy = (ctx: PolicyContext<Record<string, never>, Cmds>) => {
      if (ctx.tick === 1) throw new Error('throws-on-tick-1');
      return [];
    };
    const result = runSynthPlaytest({
      world,
      policies: [successfulPolicy, throwingPolicy as any],
      maxTicks: 5,
    });
    expect(result.stopReason).toBe('policyError');
    expect(result.policyError!.policyIndex).toBe(1);
    // Earlier policy's command made it to the bundle (submitted before throwing policy ran).
    expect(result.bundle.commands).toHaveLength(1);
    expect(result.bundle.commands[0].data).toEqual({ id: 100 });
    // step() never ran for tick 1, so no execution.
    const tick1Executions = result.bundle.executions.filter((e) => e.tick === 1);
    expect(tick1Executions).toHaveLength(0);
  });
});

describe('runSynthPlaytest — production-determinism', () => {
  it('same policySeed produces structurally identical bundles (modulo sessionId/recordedAt)', () => {
    const setup = () => mkWorld();
    const policyConfig = (): RandomPolicyConfig<Record<string, never>, Cmds> => ({
      catalog: [
        () => ({ type: 'spawn', data: { id: 1 } }),
        () => ({ type: 'spawn', data: { id: 2 } }),
        () => ({ type: 'spawn', data: { id: 3 } }),
      ],
    });
    const r1 = runSynthPlaytest({
      world: setup(),
      policies: [randomPolicy<Record<string, never>, Cmds>(policyConfig())],
      maxTicks: 50,
      policySeed: 99,
    });
    const r2 = runSynthPlaytest({
      world: setup(),
      policies: [randomPolicy<Record<string, never>, Cmds>(policyConfig())],
      maxTicks: 50,
      policySeed: 99,
    });

    // Deep-equal command + execution arrays (full structural comparison).
    expect(r1.bundle.commands).toEqual(r2.bundle.commands);
    expect(r1.bundle.executions).toEqual(r2.bundle.executions);

    // Tick entries (diffs + events) identical.
    expect(r1.bundle.ticks).toEqual(r2.bundle.ticks);

    // Snapshots: initial + all periodic + terminal.
    expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
    expect(r1.bundle.snapshots).toEqual(r2.bundle.snapshots);

    // Failures identical (both empty here, but check shape).
    expect(r1.bundle.failures).toEqual(r2.bundle.failures);

    // Metadata: stable fields. sessionId and recordedAt are intentionally
    // fresh per run; do NOT compare. Compare the deterministic remainder by
    // stripping those two fields.
    const stripVolatile = (m: typeof r1.bundle.metadata) => {
      const { sessionId: _s, recordedAt: _r, ...rest } = m;
      return rest;
    };
    expect(stripVolatile(r1.bundle.metadata)).toEqual(stripVolatile(r2.bundle.metadata));
  });
});
```

### Step 10: Re-export from `src/index.ts`

- [ ] Edit `src/index.ts`:

```ts
export type {
  SynthPlaytestConfig,
  SynthPlaytestResult,
} from './synthetic-playtest.js';
export {
  runSynthPlaytest,
} from './synthetic-playtest.js';
```

### Step 11: Run all 4 gates again

- [ ] All 4 gates pass.

### Step 12: Update doc surface

- [ ] `docs/api-reference.md`: append a new top-level section `## Synthetic Playtest — Harness (v0.8.0)` with subsections (each: signature + 1-2 sentence summary + cross-link to design v10 §s):
  - `runSynthPlaytest(config)` — signature, returns `SynthPlaytestResult`.
  - `SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState, TDebug>` — list each field.
  - `SynthPlaytestResult<...>` — list each field with the per-stop-reason ticksRun semantics from design v10 §7.

  Update existing `SessionRecorderConfig` section to document new optional `sourceKind?` and `policySeed?` fields. Update existing `SessionMetadata` section to note the widened `sourceKind` union and new optional `policySeed` field. Update TOC for the new section.

- [ ] Create `docs/guides/synthetic-playtest.md` (~250-350 lines) with sections:
  - **Quickstart**: a tiny working example — pre-configured world with 1 component + 1 system + 1 handler, run a 100-tick noop playtest, inspect the bundle.
  - **Policy Authoring**: write your own policy. Cover the contract (mutation via PolicyCommand[], no Math.random / Date.now / world.random). Sub-RNG via ctx.random().
  - **Built-in Policies**: noopPolicy, randomPolicy (with frequency/offset/burst), scriptedPolicy.
  - **Composition**: array order, no within-tick observation.
  - **Stop Conditions**: maxTicks, stopWhen, plus the always-on poison stop.
  - **Determinism Contract**: production vs replay determinism. The CI guard pattern: `result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1`.
  - **Bundle → Script Conversion**: the +1 mapping, with code snippet.
  - **Failure Modes**: each stop reason and what `result.policyError` carries.
  - **CI Pattern**: full example.

- [ ] `docs/guides/session-recording.md`: append a §"Synthetic-source bundles" subsection — note `sourceKind: 'synthetic'`, `metadata.policySeed`, link to `synthetic-playtest.md`.

- [ ] `docs/architecture/decisions.md`: append ADRs 3, 3a, 4, 6 (verbatim from design v10 §15):
  - **ADR 3**: SessionMetadata.sourceKind extended, lands as a b-bump.
  - **ADR 3a**: sourceKind set at SessionRecorder construction, not via post-hoc sink mutation.
  - **ADR 4**: Harness is synchronous and single-process.
  - **ADR 6**: Composed policies do NOT observe each other within a tick.

- [ ] `docs/README.md`: append index entry: `- [Synthetic Playtest](guides/synthetic-playtest.md) — pluggable autonomous-driver harness with sub-RNG-isolated policy randomness`.

- [ ] `README.md`:
  - Add row to Feature Overview table: `| Synthetic Playtest Harness | runSynthPlaytest, randomPolicy, scriptedPolicy, noopPolicy | Tier-1 AI-first feedback loop primitive |` (or matching existing table format).
  - Add Public Surface bullet: `- runSynthPlaytest, randomPolicy, scriptedPolicy, noopPolicy — Tier-1 synthetic playtest harness (Spec 3)`.
  - Bump version badge to `0.8.0`.

- [ ] `docs/changelog.md`: prepend section:

```markdown
### 0.8.0 (2026-04-27) — BREAKING (b-bump)

**Breaking change:** `SessionMetadata.sourceKind` union widened from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Downstream consumers using `assertNever`-style exhaustive switches over `sourceKind` will fail to compile until they add a `case 'synthetic':` branch. This is the only breaking change in 0.8.0; engine-internal code is unaffected (verified: no engine consumers branch on `sourceKind`).

**New (additive):**
- `runSynthPlaytest(config)`: synchronous Tier-1 synthetic playtest harness driving a `World` via pluggable Policy functions for N ticks → SessionBundle. Supports stop conditions (maxTicks, stopWhen), composed policies (array order), and the full failure-mode taxonomy (poisoned, policyError, sinkError, mid-tick sinkError).
- `SynthPlaytestConfig` / `SynthPlaytestResult` types.
- `SessionRecorderConfig` gains optional `sourceKind?` and `policySeed?` fields (additive).
- `SessionMetadata.policySeed?` field (populated when sourceKind === 'synthetic').

**Determinism guarantees:**
- Production-determinism: same `policySeed` + same setup → structurally identical bundles.
- Replay-determinism: non-poisoned synthetic bundles with `ticksRun ≥ 1` pass `SessionReplayer.selfCheck()`.
- Sub-RNG isolation: `PolicyContext.random()` is independent of `world.rng`; replay reproduces world RNG state because policies don't perturb it.

**Validation:** 4 engine gates clean; 20+ new tests covering acceptance criteria + edge cases.

**Migration:** downstream `assertNever(sourceKind)` consumers add `case 'synthetic':`. No engine changes required.
```

- [ ] `docs/devlog/summary.md`: prepend one line.
- [ ] Latest detailed devlog (find via `ls -1t docs/devlog/detailed/ | head -1`): append T2 entry.
- [ ] `package.json` → `"version": "0.8.0"`. `src/version.ts` → `'0.8.0'`. `README.md` badge → `0.8.0`.

### Step 13: Per-task multi-CLI review

- [ ] Run Codex + Opus parallel diff review per §B.
- [ ] Iterate to convergence.

### Step 14: Commit T2

- [ ] `git add -A && git commit -m`:

```
feat(synthetic-playtest)!: T2 runSynthPlaytest harness + b-bump (v0.8.0)

BREAKING: SessionMetadata.sourceKind union widened from
'session' | 'scenario' to 'session' | 'scenario' | 'synthetic'.
Downstream assertNever consumers add `case 'synthetic':`.

Implements the synchronous harness from Spec 3 design v10 §7:
- runSynthPlaytest: drives World via pluggable Policy[] for N ticks.
- Stop conditions: maxTicks, stopWhen (post-step), built-in poison.
- Failure modes: poisoned (world.step throws), policyError (catches
  policy throws; bundle.failures NOT synthesized), sinkError mid-tick
  (recorder.lastError check post-step), connect-time sink failure
  propagates via re-throw (no fabricated bundle).
- Sub-RNG init via Math.floor(world.random() * 0x1_0000_0000)
  BEFORE recorder.connect, so initial snapshot reflects post-derivation
  state and replay reproduces trivially.
- terminalSnapshot:true hardcoded for non-vacuous selfCheck guarantee.

SessionRecorderConfig gains optional sourceKind?, policySeed? (additive).
SessionMetadata.policySeed? added (populated for synthetic bundles).

ADRs 3, 3a, 4, 6 land in docs/architecture/decisions.md.
docs/guides/synthetic-playtest.md is the new top-level guide.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 3: Determinism integration tests + structural docs (v0.8.1, c-bump)

**Goal:** Cover cross-cutting determinism patterns that need both T1 + T2; land architecture docs.

**Files:**
- Create: `tests/synthetic-determinism.test.ts` — selfCheck round-trips + dual-run + sub-RNG positive/negative + poisoned-bundle replay + pre-step abort + bundle→script conversion.
- Modify: `docs/architecture/ARCHITECTURE.md` — Component Map row.
- Modify: `docs/architecture/drift-log.md` — entry.
- Modify: `docs/design/ai-first-dev-roadmap.md` — Spec 3 status: Drafted → Implemented.
- Modify: `docs/guides/ai-integration.md` — Tier-1 mention.
- Modify: `docs/changelog.md`, `docs/devlog/*`.
- Modify: `package.json` (`0.8.1`), `src/version.ts` (`0.8.1`), `README.md` (badge).

### Step 1: Write positive selfCheck round-trip test

- [ ] Create `tests/synthetic-determinism.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  SessionReplayer,
  World,
  noopPolicy,
  randomPolicy,
  runSynthPlaytest,
  scriptedPolicy,
  type WorldConfig,
  type PolicyContext,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });

interface Cmds { spawn: { id: number } }

const setupWorld = (): World<Record<string, never>, Cmds> => {
  const w = new World<Record<string, never>, Cmds>(mkConfig());
  w.registerHandler('spawn', () => undefined);
  w.registerComponent('rng-result');
  w.registerSystem({
    name: 'rng-system',
    phase: 'update',
    execute: (lw) => {
      const id = lw.createEntity();
      lw.setComponent(id, 'rng-result', { v: lw.random() });
    },
  });
  return w;
};

describe('synthetic-playtest determinism', () => {
  it('non-poisoned bundle with ticksRun>=1 passes selfCheck.ok', () => {
    const result = runSynthPlaytest({
      world: setupWorld(),
      policies: [randomPolicy<Record<string, never>, Cmds>({
        catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
      })],
      maxTicks: 30,
      policySeed: 42,
    });
    expect(result.ok).toBe(true);
    expect(result.stopReason).toBe('maxTicks');
    expect(result.ticksRun).toBe(30);
    expect(result.ticksRun).toBeGreaterThanOrEqual(1);

    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => {
        const w = setupWorld();
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(replayer.selfCheck().ok).toBe(true);
  });
});
```

- [ ] Run: `npm test -- tests/synthetic-determinism`
- [ ] Expected: PASS.

### Step 2: Production-determinism dual-run test

- [ ] Append:

```ts
describe('synthetic-playtest production-determinism', () => {
  it('dual run with same policySeed produces structurally identical bundles', () => {
    const opts = {
      policies: [randomPolicy<Record<string, never>, Cmds>({
        catalog: [
          (ctx: PolicyContext<Record<string, never>, Cmds>) => ({ type: 'spawn' as const, data: { id: ctx.tick } }),
        ],
      })],
      maxTicks: 25,
      policySeed: 7,
    };
    const r1 = runSynthPlaytest({ world: setupWorld(), ...opts });
    const r2 = runSynthPlaytest({ world: setupWorld(), ...opts });

    // Deep-equal command + execution arrays.
    expect(r1.bundle.commands).toEqual(r2.bundle.commands);
    expect(r1.bundle.executions).toEqual(r2.bundle.executions);

    // Tick entries (diffs + events).
    expect(r1.bundle.ticks).toEqual(r2.bundle.ticks);

    // Snapshots.
    expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
    expect(r1.bundle.snapshots).toEqual(r2.bundle.snapshots);

    // Failures.
    expect(r1.bundle.failures).toEqual(r2.bundle.failures);

    // Stable metadata (excludes sessionId + recordedAt — intentionally fresh).
    const stripVolatile = (m: typeof r1.bundle.metadata) => {
      const { sessionId: _s, recordedAt: _r, ...rest } = m;
      return rest;
    };
    expect(stripVolatile(r1.bundle.metadata)).toEqual(stripVolatile(r2.bundle.metadata));
  });
});
```

### Step 3: Sub-RNG negative-path (policy calls world.random() directly → selfCheck.ok=false)

- [ ] Append:

```ts
describe('synthetic-playtest sub-RNG isolation', () => {
  // Each policy emits at least one command per tick so the bundle has command payloads.
  // SessionReplayer.selfCheck (session-replayer.ts:270-276) short-circuits on no-payload
  // bundles with a console.warn — we need a non-empty bundle to drive the actual segment
  // comparison and detect (or fail to detect) RNG divergence.

  it('positive: policy using ctx.random() is replay-deterministic', () => {
    const result = runSynthPlaytest({
      world: setupWorld(),
      policies: [(ctx) => {
        // Use ctx.random for any randomness; doesn't perturb world.rng.
        const r = ctx.random();
        // Emit a no-op command driven by ctx.random so the bundle has payloads.
        return [{ type: 'spawn' as const, data: { id: Math.floor(r * 1000) } }];
      }],
      maxTicks: 20,
    });
    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
    });
    expect(replayer.selfCheck().ok).toBe(true);
  });

  it('negative: policy calling world.random() directly causes selfCheck divergence', () => {
    const result = runSynthPlaytest({
      world: setupWorld(),
      policies: [(ctx) => {
        // Contract violation: perturbs world.rng between ticks. Replay won't reproduce
        // these calls (replay never invokes policies), so world.rng state at snapshots
        // diverges.
        const r = ctx.world.random();
        // Emit at least one command per tick so bundle.commands is non-empty (prevents
        // selfCheck no-payload short-circuit at session-replayer.ts:270).
        return [{ type: 'spawn' as const, data: { id: Math.floor(r * 1000) } }];
      }],
      maxTicks: 20,
    });
    expect(result.ok).toBe(true);
    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
    });
    const checkResult = replayer.selfCheck();
    expect(checkResult.ok).toBe(false);
    expect(checkResult.stateDivergences.length).toBeGreaterThan(0);
  });
});
```

### Step 4: Poisoned-bundle replay throws on selfCheck

- [ ] Append:

```ts
describe('synthetic-playtest poisoned-bundle replay', () => {
  it('selfCheck on a stopReason="poisoned" bundle re-throws the original tick failure', () => {
    const world = setupWorld();
    world.registerSystem({
      name: 'poison-on-3', phase: 'update',
      execute: (lw) => { if (lw.tick === 3) throw new Error('intentional-poison'); },
    });
    const result = runSynthPlaytest({
      world,
      policies: [noopPolicy<Record<string, never>, Cmds>()],
      maxTicks: 10,
    });
    expect(result.stopReason).toBe('poisoned');

    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => {
        const w = setupWorld();
        w.registerSystem({
          name: 'poison-on-3', phase: 'update',
          execute: (lw) => { if (lw.tick === 3) throw new Error('intentional-poison'); },
        });
        w.applySnapshot(snap);
        return w;
      },
    });
    // selfCheck doesn't return ok:false — it throws while replaying the failed tick.
    expect(() => replayer.selfCheck()).toThrow();
  });
});
```

### Step 5: Pre-step abort: ticksRun=0 + selfCheck vacuous-ok

- [ ] Append:

```ts
describe('synthetic-playtest pre-step abort', () => {
  it('policy throws on tick 1: ticksRun=0, bundle has terminal at tick 0, selfCheck vacuously ok', () => {
    const world = setupWorld();
    const result = runSynthPlaytest({
      world,
      policies: [() => { throw new Error('throw-on-first-call'); }],
      maxTicks: 10,
    });
    expect(result.stopReason).toBe('policyError');
    expect(result.ticksRun).toBe(0);

    const replayer = SessionReplayer.fromBundle(result.bundle, {
      worldFactory: (snap) => { const w = setupWorld(); w.applySnapshot(snap); return w; },
    });
    // No segments to validate (initial == terminal at tick 0); selfCheck returns ok:true vacuously.
    const checkResult = replayer.selfCheck();
    expect(checkResult.ok).toBe(true);
  });
});
```

### Step 6: Bundle → script conversion regression

- [ ] Append:

```ts
describe('synthetic-playtest bundle->script conversion', () => {
  it('record → +1 conversion → replay reproduces identical command stream', () => {
    // 1. Record a synthetic bundle via randomPolicy.
    const r1 = runSynthPlaytest({
      world: setupWorld(),
      policies: [randomPolicy<Record<string, never>, Cmds>({
        catalog: [
          (ctx) => ({ type: 'spawn', data: { id: ctx.tick * 10 } }),
        ],
      })],
      maxTicks: 10,
      policySeed: 99,
    });
    expect(r1.bundle.commands.length).toBeGreaterThan(0);

    // 2. Convert with the +1 formula.
    const sequence = r1.bundle.commands.map((cmd) => ({
      tick: cmd.submissionTick + 1,
      type: cmd.type as keyof Cmds & string,
      data: cmd.data as Cmds[keyof Cmds],
    }));

    // 3. Replay through a fresh harness with scriptedPolicy.
    const r2 = runSynthPlaytest({
      world: setupWorld(),
      policies: [scriptedPolicy<Record<string, never>, Cmds>(sequence)],
      maxTicks: 10,
    });

    // 4. Assert identical command stream (types + data + submissionTicks).
    expect(r2.bundle.commands.length).toBe(r1.bundle.commands.length);
    for (let i = 0; i < r1.bundle.commands.length; i++) {
      expect(r2.bundle.commands[i].type).toBe(r1.bundle.commands[i].type);
      expect(r2.bundle.commands[i].data).toEqual(r1.bundle.commands[i].data);
      expect(r2.bundle.commands[i].submissionTick).toBe(r1.bundle.commands[i].submissionTick);
    }
  });
});
```

### Step 7: Run all 4 gates

- [ ] All 4 gates pass.

### Step 8: Update structural docs

- [ ] `docs/architecture/ARCHITECTURE.md`: append a Component Map row:

```
| Synthetic Playtest | src/synthetic-playtest.ts | Tier-1 autonomous-driver harness; pluggable Policy<…> functions; sub-RNG sandboxed from world.rng; produces SessionBundle | new in v0.7.20 + v0.8.0 (Spec 3) |
```

(Or matching existing Component Map row format.)

- [ ] `docs/architecture/drift-log.md`: append entry:

```
2026-04-27 — Synthetic Playtest Harness landed (v0.7.20 T1 c-bump + v0.8.0 T2 b-bump + v0.8.1 T3 c-bump). New subsystem: src/synthetic-playtest.ts. SessionMetadata.sourceKind union widened to include 'synthetic' (b-bump axis). Sub-RNG separation from world.rng for between-tick policy randomness (ADR 5).
```

- [ ] `docs/design/ai-first-dev-roadmap.md`: change Spec 3 status from `Drafted` to `Implemented`. Link the design + plan + this commit.

- [ ] `docs/guides/ai-integration.md`: append a §"Synthetic Playtest Harness (Tier 1)" subsection: "Spec 3 ships the autonomous-driver primitive for AI-first feedback loops. See `docs/guides/synthetic-playtest.md` for the policy-authoring guide and CI patterns. The harness is the Tier-1 piece on which Tier-2 specs (corpus indexing, behavioral metrics, AI playtester) build."

- [ ] `docs/changelog.md`: prepend:

```markdown
### 0.8.1 (2026-04-27)

- **test(synthetic-playtest):** T3 — determinism integration test corpus. Tests added: positive selfCheck round-trip on non-poisoned bundles (ticksRun≥1); production-determinism dual-run (same policySeed → identical command stream); sub-RNG isolation positive (ctx.random) + negative (policy calls world.random() → selfCheck divergence at first periodic snapshot); poisoned-bundle replay (selfCheck throws); pre-step abort vacuous selfCheck (ticksRun=0 → ok:true vacuously); bundle→script conversion regression (+1 formula).
- **docs(architecture):** ARCHITECTURE.md Component Map row for Synthetic Playtest; drift-log entry; ai-first-dev-roadmap Spec 3 status → Implemented; ai-integration.md Tier-1 reference.
- **Validation:** 4 engine gates clean; ~6 new integration tests.
```

- [ ] `docs/devlog/summary.md`: prepend one line.
- [ ] Latest detailed devlog: append T3 entry.
- [ ] `package.json` → `0.8.1`. `src/version.ts` → `'0.8.1'`. `README.md` badge → `0.8.1`.

### Step 9: Per-task multi-CLI review

- [ ] Run Codex + Opus parallel diff review.
- [ ] Iterate to convergence.

### Step 10: Commit T3

- [ ] `git add -A && git commit -m`:

```
test(synthetic-playtest): T3 determinism integration tests + arch docs (v0.8.1)

Cross-cutting tests covering Spec 3 design v10 §12 acceptance criteria
that needed both T1's policies AND T2's harness in place:
- non-poisoned bundle selfCheck round-trip (ticksRun>=1).
- production-determinism dual-run (same policySeed → identical command
  stream + endTick).
- sub-RNG isolation positive (ctx.random doesn't perturb world.rng) +
  negative (policy calls world.random() → state divergence at first
  periodic snapshot, proving the safety net works).
- poisoned-bundle replay: selfCheck re-throws the original tick failure
  (terminal-at-failed-tick segment is NOT skipped per session-replayer).
- pre-step abort vacuous case: ticksRun=0 → bundle terminal == initial
  → selfCheck vacuously ok over zero-length segment.
- bundle→script conversion regression (+1 formula on submissionTick).

Architecture docs:
- ARCHITECTURE.md Component Map row.
- drift-log.md entry.
- ai-first-dev-roadmap.md Spec 3 status → Implemented.
- ai-integration.md Tier-1 reference.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Final pass: cross-cutting checks before requesting merge

After T1, T2, T3 are committed:

- [ ] All 4 engine gates pass on the branch tip.
- [ ] Reviews under `docs/reviews/synthetic-playtest-T{1,2,3}/...` show convergence (REVIEW.md per task).
- [ ] `docs/changelog.md` has three new version entries.
- [ ] `docs/devlog/detailed/<latest>.md` has three new task entries.
- [ ] `docs/api-reference.md` has the Synthetic Playtest sections; no stale signatures.
- [ ] `docs/guides/synthetic-playtest.md` exists with quickstart + authoring guide + bundle→script conversion.
- [ ] `docs/architecture/decisions.md` has 7 new ADRs (1, 2, 3, 3a, 4, 5, 6).
- [ ] `docs/design/ai-first-dev-roadmap.md` shows Spec 3 = Implemented.
- [ ] `docs/architecture/drift-log.md` has the 2026-04-27 entry.
- [ ] `docs/architecture/ARCHITECTURE.md` has the new Component Map row.
- [ ] `README.md` has Feature Overview row + Public Surface bullet; version badge bumped to `0.8.1`.
- [ ] `docs/README.md` indexes `synthetic-playtest.md`.
- [ ] `git log --oneline` shows 3 task commits + reviews + plan + design on the branch.

Then surface for explicit user merge authorization (per AGENTS.md, no auto-merge of b-bump branches).

---

## Risks / Things to watch

- **`World` 4-generic to `SessionRecorder` 3-generic cast** in T2 step 7: the harness casts `world as unknown as World<TEventMap, TCommandMap>` because `SessionRecorder` doesn't carry `TComponents`/`TState`. This is structurally safe — the recorder doesn't access component/state-shape-typed methods — but the cast looks ugly. Reviewers may flag; the alternative is widening `SessionRecorder` to 5 generics, which is a larger change to a merged subsystem. Document the rationale in the same commit.

- **`recorder.toBundle()` generic-erasure cast** in T2 step 7: `recorder.toBundle()` returns `SessionBundle` without re-applying the recorder's generics. Cast to `SessionBundle<TEventMap, TCommandMap, TDebug>` is structurally safe (the recorder's runtime data shape matches the type). Note in the commit message.

- **`ScriptedPolicyEntry.tick` off-by-one** is documented in design v10 §6.3. The bundle→script regression test in T3 step 6 is the safety net.

- **`SessionRecorder.connect()` non-throwing on sink.open() failure** is exploited by the harness's `recorder.lastError` check. Verified against `src/session-recorder.ts:140-145`.

- **`world.tick` advances even on poison** per `src/world.ts:1872`. The `ticksRun = K - 1` formula on `'poisoned'` stops accounts for this (the failing tick's increment is skipped).

- **Disconnect-time sink failure**: T2 step 7 sets `ok = stopReason !== 'sinkError' && recorder.lastError === null`. If the terminal-snapshot write fails inside `disconnect()`, `ok` flips to `false` even when the harness loop exited with `'maxTicks'`. This is the right behavior for a CI guard. Test coverage for this corner is implicit (covered by mid-tick sink failure test); explicit test isn't strictly required.

- **`policySeed: NaN`** is rejected in T2 step 7's harness validation. T2 step 5's tests cover this.

- **`offset` validation**: T1 step 10 validates `offset` as a non-negative integer < frequency. T1 step 9 has the test.

- **Empty catalog / zero burst**: `randomPolicy` validates these and throws `RangeError`. T1 step 9 has the tests.
