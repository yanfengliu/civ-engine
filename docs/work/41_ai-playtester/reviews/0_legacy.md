# AI Playtester — Code Review Iteration 1 (post-hoc, 2026-04-29)

**Disposition:** Iterate. This review ran post-commit (commit `3746a95`) because the original session shipped Spec 9 without a code-review iteration — a process regression per AGENTS.md ("skipping review is a process regression and must be corrected by running the review post-hoc on the same branch before merge"). Both reviewers found substantive correctness issues. Fixes land in a follow-up commit on `main`.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Substantive findings

### MAJOR — `stopWhen` post-step `ctx.tick` semantics diverge from `runSynthPlaytest` (both reviewers)

`src/ai-playtester.ts:182-186` rebuilds `ctxAfter` with `tick: world.tick + 1` after `world.step()`. `runSynthPlaytest` (`src/synthetic-playtest.ts:254-256`) builds the post-step ctx with `tick: world.tick` (the just-completed tick). After `step()`, `world.tick` is already incremented. Result: a predicate `ctx.tick === 3` stops after tick 2 in the agent runner versus tick 3 in the synth runner. Off-by-one between siblings ADR 41 says should be consistent.

**Fix:** match Spec 3 — post-step `ctx.tick = world.tick`.

### MAJOR — Connect-time sink failure not detected; first tick wasted (both reviewers)

`src/ai-playtester.ts:134` calls `recorder.connect()` without checking `recorder.lastError`. `SessionRecorder.connect()` swallows sink-open failures into `_lastError + _terminated` and returns. `runSynthPlaytest` (`src/synthetic-playtest.ts:207-214`) explicitly checks and throws on connect failure. Agent runner runs one full decide+step cycle (potentially burning an LLM call) before the per-tick lastError check fires.

**Fix:** add the same `if (recorder.lastError) { recorder.disconnect(); throw recorder.lastError; }` guard immediately after `connect()`.

### MAJOR — Outer try/catch misclassifies `world.submit` throws as `sinkError` (Claude)

`src/ai-playtester.ts:201-203` catches anything unhandled in the loop body as `sinkError`. The submit-loop at `:159-161` has no inner try/catch. `world.submit` can throw when a user-defined validator throws (`world.ts:2151-2157`). A crashed validator gets labeled `sinkError` — sending users to investigate filesystem issues for an agent-side bug.

**Fix:** wrap the submit-loop in a try/catch that classifies as `agentError`. Synth playtest avoids this by using `submitWithResult` (record-of-failure path); could also adopt that, but `agentError` classification is enough here.

### MAJOR — `sinkError` path unreachable in test suite (both reviewers)

Per-tick `recorder.lastError` check (`:175-179`) and any sink-error classification path are not exercised by `tests/ai-playtester.test.ts`. PLAN acceptance criterion explicitly says "all five stopReason values reachable" — `sinkError` was undocumented in the test suite.

**Fix:** add a stub sink that throws on second writeDiff (or similar) and assert `stopReason === 'sinkError'`.

### MAJOR — DESIGN.md stale v1 taxonomy in §5 lifecycle (Codex)

DESIGN status header says "Accepted v2" with camelCase taxonomy, but §5 lifecycle text still uses `'predicate_stopped'`, `'world_poisoned'`, `'agent_threw'`, `'max_ticks'`, and `recorderConfig` from v1. Internally inconsistent.

**Fix:** rewrite §5 to use camelCase taxonomy. (Claude noted this but classified it as "intentionally frozen post-move"; Codex MAJOR is more accurate — the v2 header explicitly contradicts the body.)

### MAJOR — `docs/guides/ai-integration.md` says Spec 9 is future work; README Public Surface omits Spec 9 exports (Codex)

`docs/guides/ai-integration.md:257` still says "AI playtester remains future work." README Public Surface bullet list is missing `runAgentPlaytest`, `AgentDriver`, `bundleSummary`, etc.

**Fix:** update both.

## Minor findings

- **`ok` doesn't check disconnect-time `recorder.lastError`** (Claude). Synth playtest does: `ok = stopReason !== 'sinkError' && recorder.lastError === null`. Mirror.
- **Poisoned-world error type drift** (Claude). Plain `Error` vs synth playtest's `RecorderClosedError({ code: 'world_poisoned' })`. Mirror for consistency.
- **`ticksRun++` placement** (Claude). Off-by-one vs synth playtest when sink fails mid-tick. Mirror placement.
- **Unused `JsonValue` import + misleading re-export comment** (Claude). Delete `import type { JsonValue }`, the `export type { JsonValue }`, and the comment.
- **Async `report` / async `decide` rejection / async `stopWhen` / throwing `stopWhen`** all uncovered (Claude). Add at least the throwing-stopWhen test (an `agentError` path that's currently dead-uncovered).
- **Determinism note in guide unverified** (Claude). The guide claims "Replay reproduces the bundle byte-for-byte if and only if the agent's decide is reproducible." Add a smoke test: deterministic agent, run twice, compare bundles modulo `recordedAt`/`sessionId`.
- **Guide's `sinkError` definition narrows the implementation behavior** (Claude). Either fix the outer-catch (Major-1 above) or expand the definition.
- **`AgentDriverContext` drops `TComponents` / `TState`** (Codex). Typed agents lose component/state type safety vs `PolicyContext`. Threading the generics is straightforward but invasive — defer to a follow-up unless trivial.

## Disposition

Apply all 6 MAJORs + the `ok`/poisoned-error/ticksRun/import-cleanup minors + the determinism replay smoke test in a single follow-up commit. Defer the TComponents/TState generic threading and full async-test matrix unless they fit the same commit cleanly.
