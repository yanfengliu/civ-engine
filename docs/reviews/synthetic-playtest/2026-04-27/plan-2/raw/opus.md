Verified key engine facts (world.random() exists at world.ts:840; SessionMetadata.sourceKind = 'session' | 'scenario' at session-bundle.ts:92; MemorySink at session-sink.ts:85 — import path checks out; recorder.lastError getter at session-recorder.ts:100; periodic snapshot wrapped at session-recorder.ts:415-419; world_poisoned RecorderClosedError at session-recorder.ts:108-110; selfCheck failedTick skip is `ft >= a.tick && ft < b.tick` so terminal-at-failed-tick segment is replayed, validating T3 Step 4's throw expectation; tseslint:recommended is the lint config — no `import/first` rule but `no-unused-vars` is on).

The 16 iter-1 findings are addressed. Two new gate-blocking issues from v2's edits remain.

---

## Findings

### HIGH — T2 Step 5 missing `PolicyContext` import (typecheck fails at Step 8)

T2 Step 5's `tests/synthetic-playtest.test.ts` top-imports list:
```
{ MemorySink, SessionRecorder, SessionReplayer, World, noopPolicy, randomPolicy,
  runSynthPlaytest, scriptedPolicy, type WorldConfig }
```
…lacks `type PolicyContext`. But the file body at Step 5 uses it in the `policyError` test:
```
const throwingPolicy = (ctx: PolicyContext<Record<string, never>, Cmds>) => { ... }
```
Step 9 belatedly adds `import type { PolicyContext } from '../src/index.js';` **at the bottom of the file** (and then only after Step 8 has supposedly already declared all 4 gates clean).

Step 8 says "All 4 gates pass." `npm run typecheck` would emit `Cannot find name 'PolicyContext'` because Step 5's file hasn't imported it. The bottom-of-file import in Step 9 is hoisted at compile time so the *eventual* state typechecks — but Step 8 sits between Step 7 (impl) and Step 9 (the import), so the gate as scheduled fails.

Fix: add `type PolicyContext` to Step 5's top imports (and drop the redundant bottom-of-file `import type` in Step 9). Also note Step 9's `composed-policy partial-submit-then-throw` test uses the same annotation, so a single top-level import covers both.

### MED — T2 Step 5 imports `SessionRecorder` and `SessionReplayer` that are never referenced

`SessionRecorder` and `SessionReplayer` appear in Step 5's top imports but are not used in either Step 5 or Step 9's test bodies (the harness creates the recorder internally, and `SessionReplayer` doesn't enter until T3's `synthetic-determinism.test.ts`). `tseslint:recommended` enables `@typescript-eslint/no-unused-vars` at error level; `npm run lint` fails at Step 8 and Step 11.

Fix: drop both from the import list. (Cross-check: `MemorySink` *is* used by Step 9's mid-tick sink test; keep it.)

### NIT — `Co-Authored-By` line deviates from project template

T1/T2/T3 commit messages all use `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. The standard string in the system prompt's commit guidance is `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` — no parenthetical. Minor consistency thing.

### NIT — T1 Step 9 "deterministic across two policy instances" doesn't actually test cross-tick determinism

`mkPolicyCtx(t, 42)` creates `new DeterministicRandom(42)` *per call*, so each tick the policy sees a freshly-seeded RNG. Two policy instances given identical fresh RNG states will trivially produce identical output regardless of any cross-tick logic. The intent (a single shared RNG threading through the loop) needs the helper to lift `rng` outside or accept an injected `random`. The harness-level dual-run test in T2 Step 9 / T3 Step 2 is the real coverage; this unit test name is just oversold. Optionally rewrite or rename.

### NIT — T2 Step 12 changelog overcounts new tests

Changelog text says "30+ new tests covering acceptance criteria + edge cases." Actual count across T2 steps 3 (2), 4 (1), 5 (~12), 9 (6) lands closer to 21. Either drop the count or say "20+".

### NIT — Step 9 mid-tick sink Proxy has fragile method-binding semantics

`new Proxy(memorySink, { get })` returning `Reflect.get(target, prop)` for non-`writeSnapshot` paths returns the unbound prototype method; called via the proxy, `this` becomes the proxy and reads/writes go through default traps to the target. Functional but brittle — a tiny `class FailAfterFirstWrite extends MemorySink { ... }` subclass would be cleaner and less surprising for the next reader. No correctness issue.

---

## Verdict

**REJECT** — one HIGH (typecheck) and one MED (lint) gate-breaker remain. Both are mechanical: extend Step 5's top-import list to include `type PolicyContext` and drop the unused `SessionRecorder` / `SessionReplayer` imports (and remove the now-redundant Step 9 bottom-of-file `import type`). After that the plan should converge — the remaining items are NITs.
