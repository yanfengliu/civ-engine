Verified plan v3 against engine source; v3 properly addresses iter-2 findings (PolicyContext import, sub-RNG payload-emit, per-task review base, shared sub-RNG in T1 step 9, changelog count). However, four new typecheck/lint gate-breakers and one coverage gap remain — corroborated by codex iter-3 (`docs/reviews/synthetic-playtest/2026-04-27/plan-3/raw/codex.md`); opus iter-3 ran empty.

# Plan iter-3 Review

**Iter:** 3. **Subject:** plan v3 (commit 34a605f). **Reviewer:** Opus (independent re-read). Codex iter-3 already on disk and reaches the same HIGH bucket; opus iter-3 raw is empty so this is the standalone Opus pass.

## HIGH

### HIGH-1 — T2 step 9 composition test references nonexistent field `e.executionTick`

Plan line 1173:
```ts
const tick1Executions = result.bundle.executions.filter((e) => e.executionTick === 1);
```
`CommandExecutionResult` (`src/world.ts:145-156`) only has `tick: number` — there is no `executionTick`. `bundle.executions` is `CommandExecutionResult<keyof TCommandMap>[]`, so step 11 `npm run typecheck` fails with "Property 'executionTick' does not exist on type 'CommandExecutionResult'".

**Fix:** `e.tick === 1`.

### HIGH-2 — T2 step 5 import list missing `type RandomPolicyConfig`

Step 9's production-determinism block (line 1184) uses `RandomPolicyConfig<Record<string, never>, Cmds>`, but step 5's `from '../src/index.js'` import (lines 723-732) only brings `MemorySink, World, noopPolicy, randomPolicy, runSynthPlaytest, scriptedPolicy, type PolicyContext, type WorldConfig`. Step 11 typecheck fails: "Cannot find name 'RandomPolicyConfig'".

This is the exact same class as iter-2 Opus HIGH (PolicyContext was added to step 5 in v3, but the same audit didn't extend to RandomPolicyConfig).

**Fix:** add `type RandomPolicyConfig` to step 5's import list.

### HIGH-3 — T2 step 4 FileSink round-trip test uses unimported `path`/`os`/`fs` namespaces

Plan snippet:
```ts
const tmpDir = path.join(os.tmpdir(), `civ-engine-fsink-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });
```
Existing `tests/file-sink.test.ts` uses named imports only: `mkdtempSync`, `join`, `tmpdir`. The plan's parenthetical "(Imports for `path`, `os`, `fs` likely already in the test file; otherwise add.)" is wishful — they are not there. As written, step 11 typecheck fails.

**Fix:** rewrite using the existing named-import style, e.g., `const tmpDir = mkdtempSync(join(tmpdir(), 'civ-engine-fsink-'));`. That also gives natural integration with the existing `afterEach(() => rmSync(...))` cleanup pattern.

### HIGH-4 — T3 step 1 imports `DeterministicRandom` that no T3 test uses

`DeterministicRandom` appears only in T3's import list (line 1353). Greppedall of T3 (lines 1340-1620): no usage anywhere — T3 tests only consume the harness, which keeps the sub-RNG internal. ESLint (`tseslint.configs.recommended`) flags `@typescript-eslint/no-unused-vars` as error → step 7 lint fails.

**Fix:** drop `DeterministicRandom` from T3 step 1's import line.

## MED

### MED-1 — T2 step 5 imports `MemorySink` and `randomPolicy` that step 5's tests don't use → step 8 lint fails

Step 5's tests use `noopPolicy`, `scriptedPolicy`, `runSynthPlaytest`, `World`, `WorldConfig`, `PolicyContext`. They do NOT use `MemorySink` or `randomPolicy` — both are first used in step 9 (mid-tick sink failure test and production-determinism test respectively). Step 8 explicitly runs `npm run lint` between step 7 (impl) and step 9 (more tests). At step 8, `MemorySink` and `randomPolicy` are imported but unused → lint fails.

This is the same class as iter-2 Opus MED for `SessionRecorder`/`SessionReplayer` — Opus iter-2 reasoned about end-state only ("MemorySink IS used by step 9; keep it") and missed the step-8 timing window.

**Fix options:** (a) defer these two imports to step 9's instructions; (b) explicitly note step 8 runs `npm test` only and step 11 is the canonical lint gate; (c) add a step-5 test that uses MemorySink (e.g., explicit-sink-override sanity test).

### MED-2 — T2 step 9 / T3 step 2 production-determinism tests overclaim coverage

Both dual-run tests assert "structurally identical bundles" (changelog/guide language) but only compare `commands` (type + data + submissionTick) and `metadata.endTick`. They don't compare `bundle.snapshots`, `bundle.ticks`, `bundle.executions`, `bundle.failures`, or non-endTick metadata fields. A regression that broke snapshot/state determinism while keeping the command stream stable would pass, leaving the documented contract under-tested.

**Fix:** at minimum, compare the terminal snapshot:
```ts
const lastR1 = r1.bundle.snapshots[r1.bundle.snapshots.length - 1] ?? r1.bundle.initialSnapshot;
const lastR2 = r2.bundle.snapshots[r2.bundle.snapshots.length - 1] ?? r2.bundle.initialSnapshot;
expect(lastR1).toEqual(lastR2);
```
Add `executions.length`, optionally a deep-equal of bundle (modulo `metadata.sessionId`/`recordedAt`/`policySeed`-derived fields if seed was implicit).

## NITs

- **NIT-1** — T2 step 9 mid-tick sink Proxy has brittle `this`-binding (iter-2 Opus already noted). A `class FailAfterFirstWrite extends MemorySink { writeSnapshot(e) { if (++this.n > 1) throw ...; super.writeSnapshot(e); } }` subclass would be cleaner.
- **NIT-2** — T2 step 9 connect-time-sink-failure mock has wrong method names (`writeFailure` vs `writeTickFailure`, `writeExecution` vs `writeCommandExecution`, missing `toBundle`, `ticks()`/`commands()`/etc. iterators, plus phantom `finalize`/`readSnapshots`/`readAttachment`). The `as any` cast hides the mismatch and `open()` throws first so the wrong methods are never reached at runtime. Misleading for future readers; trivial to swap for a one-method `class FailingSink extends MemorySink { open() { throw ...; } }`.
- **NIT-3** — T2 step 5 lines 855 / 873 use `as any` for policies that are correctly typed (`(ctx) => never[]` is structurally assignable to `Policy<...>`). Cast is redundant.
- **NIT-4** — T2 step 7 harness validation has redundant `!Number.isFinite(config.policySeed)` check; `Number.isInteger` already returns false for `NaN`/`Infinity`/fractions. Functionally correct, just over-belt-and-suspenders.
- **NIT-5** — T2 step 9 sink-failure tests' Proxy / mock have no comment pointing to the recorder code path being exercised (`session-recorder.ts:140-145` vs `:418-420`). Cross-references would help next reader trace why the mock's shape is what it is.

## Verdict

**REJECT.** Four HIGH (typecheck/lint breakers as written) + two MED. All mechanical, not architectural — v4 should converge:

1. `e.executionTick` → `e.tick` (HIGH-1)
2. Add `type RandomPolicyConfig` to T2 step 5 imports (HIGH-2)
3. Rewrite FileSink test to existing named-import style (HIGH-3)
4. Drop `DeterministicRandom` from T3 step 1 imports (HIGH-4)
5. Resolve MemorySink/randomPolicy step-8 lint (MED-1, three options)
6. Strengthen production-determinism comparisons (MED-2)

NITs can be folded in opportunistically. Per AGENTS.md "continue iterating until reviewers nitpick instead of catching real bugs" — these are not nitpicks; they are concrete gate-breakers the engineer would hit on first execution.
