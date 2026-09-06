# Strict-Mode Determinism Implementation Plan

> **For agentic workers:** Use the superpowers:test-driven-development discipline — failing tests first, then implementation, then doc updates.

**Plan revision:** v2 (2026-04-29). Addresses plan-1 review (Codex 2 BLOCKERS + 3 majors + 3 minors; Claude 3 majors + 4 minors). Major changes: explicit `_inTickPhase` clear ordering (after diff listeners and onTickFailure listeners, in an outer try/finally); `src/types.ts` added to File Map (where `WorldConfig` lives); explicit Step 5 for `src/index.ts` exports (so Step 6 tests can import them); Step 1 expanded to cover the six missing §9 contracts; Step 4 negative-list expanded; Step 9 prompt construction adds AGENTS.md doc-accuracy addendum + until-poller pattern + tmp path; LOC risk register acknowledges world.ts is already at 2379 LOC and pre-commits to the strict-mode extraction. Awaiting multi-CLI re-review under `docs/threads/current/strict-mode/2026-04-29/plan-2/`.

**Goal:** Implement Spec 6: Strict-Mode Determinism Enforcement per the accepted design (`docs/threads/current/strict-mode/DESIGN.md` v3). One coherent v0.8.8 commit lands the full surface: `WorldConfig.strict`, `World.endSetup` / `runMaintenance` / `isStrict` / `isInTick` / `isInSetup` / `isInMaintenance`, `StrictModeViolationError`, gated mutation methods (~33), `random()` gating, depth-counted reentrant maintenance, ADR 36-40, tests, docs, version bump.

**Architecture:** Three new fields on `World` (`strict: boolean`, `_inSetup: boolean`, `_inTickPhase: boolean`, `_maintenanceDepth: number`), a private `_assertWritable(method)` helper, and a leading call to it in every gated mutation method. `runTick` clears `_inSetup` once at the top, sets `_inTickPhase = true`, and **clears `_inTickPhase = false` in an outer try/finally that wraps the entire tick path including diff-listener emission AND `onTickFailure` listener emission** (so listener-side mutations remain in-tick per DESIGN §3 / §5 / §9). `runMaintenance(fn)` increments/decrements the depth counter via try/finally. New `StrictModeViolationError` class plus `_assertWritable` and advice helpers land in `src/world-strict-mode.ts` (extraction pre-committed because `src/world.ts` is already at 2379 LOC, well over the AGENTS.md 500-LOC cap; adding strict-mode helpers would compound the existing overage).

**Tech Stack:** TypeScript 5.7+, Node 22+, Vitest 3, ESLint 9, ESM + Node16 module resolution.

**Branch:** None. Commit directly to `main`.

**Versioning:** Current base is v0.8.7 (post Spec 4 commit `c1b6f75`). Spec 6 is additive and non-breaking, ship as v0.8.8.

---

## File Map

**Create:**
- `src/world-strict-mode.ts` — `StrictModeViolationError`, `StrictModePhase`, `StrictModeViolationDetails`, `_assertWritable` helper, advice-string lookup. ~120 LOC estimated. Extraction is pre-committed because `src/world.ts` is already at 2379 LOC (4.7× over the AGENTS.md 500-LOC cap). Adding strict-mode helpers inside `world.ts` compounds existing debt; extraction is the conservative call.
- `tests/strict-mode.test.ts` — full coverage of every §9 contract from DESIGN. Estimated ~400 LOC; split into `-mutations.test.ts` + `-maintenance.test.ts` if the cap pushes it over.
- `docs/guides/strict-mode.md` (new file).
- `docs/threads/current/strict-mode/2026-04-29/<N>/REVIEW.md` per code-review iteration.

**Modify:**
- `src/types.ts` — add `strict?: boolean` to `WorldConfig` (this interface lives here, not in `world.ts`).
- `src/world.ts` — add the four fields, gates on every mutation method (22 implementation bodies, counting overload signatures higher), `runMaintenance`, `endSetup`, `isStrict`, `isInTick`, `isInSetup`, `isInMaintenance`, the `_inTickPhase` outer try/finally toggle in `runTick`, the `_inSetup` clear at the top of `runTick`, and the `applySnapshot` depth increment. The strict-mode error class + `_assertWritable` helper + advice lookup live in `src/world-strict-mode.ts` (see Create); `world.ts` imports them.
- `src/index.ts` — export `StrictModeViolationError` and `StrictModeViolationDetails` from `world-strict-mode`. The new `World` methods are auto-exported via the existing `World` re-export. `WorldConfig` is already exported via `src/types.ts`'s re-export chain; no change needed beyond the new field landing in the type.
- `package.json` — `0.8.7` → `0.8.8`.
- `src/version.ts` — `'0.8.7'` → `'0.8.8'`.
- `README.md` — version badge, Feature Overview row, Public Surface bullet.
- `docs/api-reference.md` — new `## Strict Mode (v0.8.8)` section.
- `docs/guides/session-recording.md` — note strict mode as the structural complement to `selfCheck`.
- `docs/guides/systems-and-simulation.md` — note system-phase gate behavior.
- `docs/guides/ai-integration.md` — Spec 6 as enforcement complement.
- `docs/guides/public-api-and-invariants.md` — strict flag + gate as public invariant.
- `docs/guides/serialization-and-diffs.md` — note strict mode is content-only; bundles unaffected.
- `docs/guides/concepts.md` — strict-mode subsection under World; add `WorldConfig.strict`.
- `docs/README.md` — new guide index entry.
- `docs/architecture/ARCHITECTURE.md` — Component Map row note + boundaries.
- `docs/architecture/drift-log.md` — Spec 6 row.
- `docs/architecture/decisions.md` — append ADRs 36-40.
- `docs/design/ai-first-dev-roadmap.md` — Spec 6 status to Implemented (v0.8.8).
- `docs/changelog.md` — v0.8.8 entry.
- `docs/devlog/summary.md` — newest-first line.
- `docs/devlog/detailed/<latest>.md` — final task entry after code review converges.

---

## Single Task: Spec 6 — Full Surface, Tests, Docs, Review, Commit

**Goal:** Land the entire Spec 6 surface in one v0.8.8 commit.

### Step 1: Write failing tests first

- [ ] Create `tests/strict-mode.test.ts` with explicit coverage of every DESIGN §9 contract:
  1. Default behavior (`strict !== true`): every mutation method on a non-strict world succeeds in every phase. Negative regression test asserts `StrictModeViolationError` is never thrown.
  2. Strict construction: reports `isStrict() === true`, `isInSetup() === true`, `isInTick() === false`, `isInMaintenance() === false`.
  3. Setup window allows mutations: pre-step `addComponent`, `setState`, `addResource`, `addTag`, `setPosition`, `emit`, `random()` succeed.
  4. Implicit setup-end on first `step()` AND on first `stepWithResult()` AND through `start()`/`stop()` timer-driven ticks (covering all three `runTick` entry points): `isInSetup()` becomes `false` after the first tick from any path.
  5. Explicit `endSetup()` before any step: same outcome; idempotent.
  6. Mutations during system execute: a registered system mutates components/resources/state; succeeds. `isInTick()` is `true` inside the system.
  7. Mutations during `onDiff` listener: `world.onDiff(diff => world.setComponent(...))` succeeds.
  8. Mutations during `onTickFailure` listener: a listener that calls `world.recover()` or another mutation succeeds (verifies `_inTickPhase` is still true when listeners fire — the load-bearing ordering invariant per DESIGN §3 risk register).
  9. Mutations between ticks throw: each gated method (createEntity, destroyEntity, addComponent, setComponent, removeComponent, patchComponent, setPosition, all resource methods, setState, deleteState, addTag, removeTag, setMeta, deleteMeta, emit, random) throws `StrictModeViolationError({ phase: 'between-ticks' })`.
  10. `random()` between ticks throws (determinism-targeted test) — confirms the gate fires for the RNG advancement path that's a known determinism-critical surface.
  11. `runMaintenance(fn)` allows mutations inside `fn`; calls outside `fn` throw again afterward.
  12. `runMaintenance(fn)` try/finally: an exception inside `fn` decrements `_maintenanceDepth`; subsequent mutations throw.
  13. Nested `runMaintenance(() => runMaintenance(() => mutate))` succeeds (no-op nesting via depth counter); exception inside an inner nested fn correctly decrements the outer counter.
  14. `isInMaintenance()` reflects `_maintenanceDepth > 0`.
  15. `CommandTransaction.commit()` outside any phase (no maintenance) throws at the first applied mutation per ADR 40.
  16. `CommandTransaction.commit()` inside `runMaintenance` succeeds.
  17. `CommandTransaction.commit()` inside a tick succeeds (covered by `_inTickPhase`).
  18. `applySnapshot(snap)` works at any phase regardless of strict mode.
  19. `World.deserialize(snap)` returns a fresh world with `isInSetup() === true` (when strict). The new world's internal state-loading mutations succeed because of the setup window.
  20. `recover()` works in strict mode (state-management, not content).
  21. `submit` / `step` / register* / listener-add / `pause` / `resume` / `setSpeed` all work in strict mode regardless of phase (not gated).
  22. `StrictModeViolationError` shape: `details.code === 'strict_mode_violation'`, `details.method` matches called method, `details.phase` is `'idle' | 'between-ticks' | 'after-failure'`, `details.advice` is a non-empty string.
  23. Determinism parity: a synthetic playtest with a fixed seed produces a byte-identical bundle with `strict: true` and `strict: false`.
- [ ] Imports use `../src/index.js` for the public surface (existing convention).
- [ ] Run `npm test -- tests/strict-mode.test.ts`. Confirm failures (no `StrictModeViolationError` exported yet, `world.isStrict` etc. don't exist).

### Step 2: Implement error class + types

- [ ] Create `src/world-strict-mode.ts`. Add `StrictModePhase`, `StrictModeViolationDetails`, `StrictModeViolationError`. Constructor signature per DESIGN §4.3.
- [ ] Add the helper `adviceFor(method: string): string` returning a short hint per method group (e.g., setComponent → "wrap mutations in world.runMaintenance(fn) or move them inside a registered system; setComponent must be called inside a tick phase or setup window").
- [ ] Add `assertWritable(world, method)` helper here too, taking the World reference; world.ts will use it via `assertWritable(this, 'methodName')`. Implementing the helper in the strict-mode module avoids growing world.ts further.

### Step 3: Add `WorldConfig.strict` to `src/types.ts`

- [ ] Add `strict?: boolean` to the `WorldConfig` interface in `src/types.ts` (where `WorldConfig` is declared). Document the default-false behavior per DESIGN §4.1.

### Step 4: Add World fields + helpers

- [ ] Add `strict: boolean`, `_inSetup: boolean`, `_inTickPhase: boolean`, `_maintenanceDepth: number` to the `World` class.
- [ ] Constructor reads `config.strict ?? false` into `this.strict`. When strict, sets `_inSetup = true`. Always initializes `_inTickPhase = false`, `_maintenanceDepth = 0`.
- [ ] Add `_currentPhaseName(): StrictModePhase`: returns `'after-failure'` if poisoned, else `'between-ticks'` (the `'idle'` distinction collapses into `'between-ticks'` for any post-construction mutation; reserve `'idle'` only for the case where `_inSetup` was explicitly cleared via `endSetup()` before any step has run — track via the existing `world.tick === 0` marker).
- [ ] Add `endSetup()`, `runMaintenance(fn)`, `isStrict()`, `isInTick()`, `isInSetup()`, `isInMaintenance()` per DESIGN §4.2. `runMaintenance` does try/finally with depth increment/decrement.
- [ ] In `runTick`: wrap the entire tick body (commands phase → systems → resources → diff buildup → diff listeners → metrics → onTickFailure listener emission via finalizeTickFailure) in an outer try/finally. Clear `_inSetup` at the top if set. Set `_inTickPhase = true` at the top. The outer finally clears `_inTickPhase = false` *after* every listener has fired — including `onTickFailure` on the failure path. Verify that the existing inner finally (which clears `activeMetrics` etc.) does NOT clear `_inTickPhase` early; the new outer try/finally is the single clearing point.
- [ ] In `applySnapshot`, increment `_maintenanceDepth` before any mutation work and decrement in finally (forward-compat per ADR 37).

### Step 5: Update `src/index.ts` exports

- [ ] Export `StrictModeViolationError` and `StrictModeViolationDetails` from `src/world-strict-mode.ts` via `src/index.ts`. The new `World` methods (`endSetup`, `runMaintenance`, `isStrict`, `isInTick`, `isInSetup`, `isInMaintenance`) are class methods, so they ride along with the existing `World` re-export. The `WorldConfig.strict` field rides on the existing `WorldConfig` re-export from `src/types.ts`.

### Step 6: Add `_assertWritable` to every gated method

- [ ] Audit and gate every method in DESIGN §6: createEntity, destroyEntity, addComponent, setComponent, removeComponent, patchComponent, setPosition, addResource, removeResource, setResourceMax, setProduction, setConsumption, addTransfer, removeTransfer, setState, deleteState, addTag, removeTag, setMeta, deleteMeta, emit, random. (22 implementation bodies in total; the prose "~33" elsewhere counts overload signatures.)
- [ ] Each gate is a single `assertWritable(this, 'methodName')` call at the top of the method (importing the helper from `world-strict-mode`).
- [ ] Verify the following are NOT gated (per DESIGN §6 "explicitly NOT gated" list): register* (registerComponent, registerSystem, registerHandler, registerValidator, registerResource), submit, submitWithResult, step, stepWithResult, pause, resume, setSpeed, recover, serialize, getDiff, getMetrics, getEvents, getState, all `get*`/`has*`/`is*` reads, all listener add/remove (`on`/`off`/`onDiff`/`offDiff`/`onCommandResult`/`offCommandResult`/`onTickFailure`/`offTickFailure`), `applySnapshot` (uses `_maintenanceDepth` increment internally — DESIGN §3 / ADR 37).

### Step 7: Run failing tests until green

- [ ] `npm test -- tests/strict-mode.test.ts`. Iterate: any test failure indicates either a missing gate, wrong gate, or wrong test expectation. Resolve in source order: gate the method correctly first, then verify the test.

### Step 8: Run full gates

- [ ] `npm test` — full suite. Goal: no regressions in non-strict tests (which is essentially every existing test); +new strict-mode tests passing.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build`.

### Step 9: Documentation

- [ ] Bump `package.json` → `0.8.8`. Bump `src/version.ts` → `'0.8.8'`. Update README badge + Feature Overview row + Public Surface bullet.
- [ ] Create `docs/guides/strict-mode.md`. Cover: quickstart, escape hatches, transaction integration (commit() in strict mode), applySnapshot integration, `runMaintenance` reentrancy via depth counter, performance note, opt-in rationale, error code reference.
- [ ] Add `## Strict Mode (v0.8.8)` to `docs/api-reference.md` enumerating all new public types/methods.
- [ ] Update `docs/guides/session-recording.md`, `docs/guides/systems-and-simulation.md`, `docs/guides/ai-integration.md`, `docs/guides/public-api-and-invariants.md`, `docs/guides/serialization-and-diffs.md`, `docs/guides/concepts.md` per DESIGN §11.
- [ ] Update `docs/README.md` index.
- [ ] Update `docs/architecture/ARCHITECTURE.md` Component Map + boundaries.
- [ ] Append row to `docs/architecture/drift-log.md`.
- [ ] Append ADRs 36-40 verbatim from DESIGN §13 to `docs/architecture/decisions.md`.
- [ ] Update `docs/design/ai-first-dev-roadmap.md`: Spec 6 status to Implemented (v0.8.8) with link to `docs/threads/done/strict-mode/`.
- [ ] Add v0.8.8 entry to `docs/changelog.md`.
- [ ] Add one newest-first line to `docs/devlog/summary.md`.

### Step 10: Doc audit

- [ ] Stale-reference grep on canonical surfaces: `grep -rE "_inMaintenance" README.md docs/api-reference.md docs/guides/ docs/architecture/ docs/changelog.md docs/devlog/summary.md` → no hits except in thread context (DESIGN.md ADR text). The depth counter is the new model.
- [ ] Verify all of `WorldConfig.strict`, `endSetup`, `runMaintenance`, `isStrict`, `isInTick`, `isInSetup`, `isInMaintenance`, `StrictModeViolationError`, `StrictModeViolationDetails` appear in `docs/api-reference.md`.

### Step 11: Multi-CLI code review

- [ ] Iteration directory: `docs/threads/current/strict-mode/2026-04-29/<N>/` (bare numbers from 1). Mirror under `tmp/review-runs/strict-mode/2026-04-29/<N>/` for raw captures.
- [ ] Stage all changes. Generate diff against `main`.
- [ ] Dispatch in parallel:
  - Codex: `git diff main | codex exec --model gpt-5.5 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral "<task-specific prompt>"` → `tmp/review-runs/strict-mode/2026-04-29/<N>/codex.txt`
  - Claude: `git diff main | claude -p --model "claude-opus-4-7[1m]" --effort max --append-system-prompt "<task-specific prompt>" --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)"` → `tmp/review-runs/.../claude.txt`
- [ ] **Prompt construction:** start with the AGENTS.md baseline review prompt verbatim and enrich with: (a) spec context (Spec 6 of the AI-first roadmap, accepted DESIGN v3); (b) the four AGENTS.md review aspects (design / test coverage / correctness / clean code, typing, efficiency, no >500-LOC files outside the pre-existing `world.ts` overage, doc accuracy per AGENTS.md Documentation discipline); (c) task-specific anti-regression checklist: `random()` gate actually fires; `deleteState`/`deleteMeta` gates; `runTick` outer try/finally toggle clears `_inTickPhase` after onTickFailure listeners; `applySnapshot` depth increment; transaction `commit()` semantics in all three phases; depth counter under exception in nested `fn`; non-strict default unchanged; **doc-accuracy reviewer addendum (verbatim per AGENTS.md): "verify docs in the diff match implementation; flag any stale signatures, removed APIs still mentioned, missing coverage of new APIs in canonical guides, or thread design/plan docs that are missing from the objective root."**
- [ ] For iter-2+: include prior iteration `REVIEW.md` files + `docs/learning/lessons.md` so reviewers verify previous fixes landed and don't re-flag closed issues.
- [ ] **Wait pattern:** `until [ -s codex.txt ] && [ -s claude.txt ]; do sleep 8; done` poller as a background command (avoid the harness's no-long-sleep guard and per-call polling overhead).
- [ ] Synthesize into `docs/threads/current/strict-mode/2026-04-29/<N>/REVIEW.md`.
- [ ] Iterate. Tie-breaker (after 3 iterations without convergence): `claude --model "claude-opus-4-7[1m]" --effort max -p "<prompt forcing binary ACCEPT/REJECT — REJECT must include a mandatory prescriptive patch, ACCEPT overrides remaining nits>"`.

### Step 12: Commit and close thread

- [ ] Final review converged.
- [ ] Append final task entry to `docs/devlog/detailed/<latest>.md`.
- [ ] `git mv docs/threads/current/strict-mode docs/threads/done/strict-mode`.
- [ ] **Final gates on the post-thread-move tree** before commit: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Must all pass.
- [ ] `git add -A && git commit -m "feat(strict-mode): Spec 6 — opt-in mutation-gate enforcement (v0.8.8)"`.
- [ ] Verify and smoke-test post-commit.

---

## Risk register

- **`world.ts` LOC.** The file is **already at 2379 LOC** today (4.7× over the AGENTS.md 500-LOC review cap). This is pre-existing debt the strict-mode work does not solve. To avoid compounding it, this plan pre-commits to creating `src/world-strict-mode.ts` for the new error class + `_assertWritable` helper + advice lookup (Step 2). Multi-CLI reviewers should not block this PR on the world.ts overage; it's a known finding scheduled for a separate refactor. Reviewer prompts (Step 11) reflect this scoping.
- **Determinism parity test fragility.** The synthetic-playtest determinism test (strict vs non-strict) relies on the recorder/playtest infrastructure. Pin it via a small fixed seed and short tick count to keep CI fast.
- **`onTickFailure` listener ordering.** The clear of `_inTickPhase` MUST run after listeners fire. Existing `runTick` finally block ordering is the single source of truth; verify the new `_inTickPhase = false` is the last action.
- **Performance regression on non-strict worlds.** A single `if (!this.strict) return;` per mutation is the entire cost. Confirm via the existing benchmark scripts that no measurable regression appears.

---

## Acceptance Criteria (mirrors DESIGN §15)

- All listed exports ship from `src/index.ts`.
- Non-strict default unchanged; existing tests pass unchanged.
- Strict worlds reject every gated mutation method between ticks.
- Strict worlds accept the same mutations during setup, in any system phase, in diff/command-result/onTickFailure listeners, and in `runMaintenance` callbacks.
- `random()` gated; `deleteState`/`deleteMeta` gated.
- `applySnapshot` and `deserialize` work in strict mode at any phase.
- `submit`, `step`, registration calls, listener add/remove all work in strict mode.
- Determinism parity: synthetic playtest seeded run is byte-identical strict vs non-strict.
- All four engine gates pass.
- Multi-CLI code review converges.
- Docs, ADRs, roadmap, changelog, devlog, README badge, API reference, doc audit evidence, version bump land in the same commit.
- Thread closed under `docs/threads/done/strict-mode/`.
