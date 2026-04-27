commit cee11a84a01adc9807c752cb495ea144678ea927
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 10:16:15 2026 -0700

    docs(design): synth playtest — design v3 addressing iter-2 review
    
    Iter-2 multi-CLI review found 1 BLOCKER + 2 HIGH + 2 MED + LOW/NIT.
    v3 fixes them in place:
    
    - B1.1 (BLOCKER): default policySeed = world.random() collapses to 0
      because DeterministicRandom.seedToUint32 does Math.trunc(x)>>>0 for
      numeric seeds and world.random() returns [0,1). Pin literal expression
      in §7.1 step 2 + §5.4 + ADR 5: Math.floor(world.random()*0x1_0000_0000).
    
    - H6.1 (HIGH from both reviewers): ADR 6 over-claimed observability.
      world.commandQueue and nextCommandResultSequence are private; the §12
      "ADR 6 verification test" was untestable against the public API.
      Path A chosen: rewrite ADR 6 to drop the within-tick-observation
      claim. Composed policies are computational siblings sharing the same
      PolicyContext.world per tick. The harness submits commands inline in
      policy-array order; bundle.commands[].submissionSequence ordering is
      the externally testable property §12 verifies. Path B (add
      peekPendingCommands public surface) deferred to a future spec if a
      use case materializes.
    
    - H-SINK.1 (HIGH from Codex): sinkError control flow underspecified.
      Add explicit recorder.lastError checks: §7.1 step 3 (post-connect()
      short-circuit on sink-open failure since SessionRecorder.connect()
      doesn't throw, just sets lastError + flips _connected) + §7.1 step 4
      (post-step lastError check breaks with stopReason:'sinkError'). §7.2
      gains explicit connect-time and mid-tick sink-failure entries.
    
    - M3.1 (Opus MED): §14 ADR count mismatched body. v3 distributes 7 ADRs
      across T1/T2/T3 per the docs-with-the-surface-they-introduce principle:
      T1 lands ADRs 1, 2, 5; T2 lands ADRs 3, 3a, 4, 6; T3 lands no ADRs.
    
    - Codex MED — T1 doc plan: §14 T1 explicitly enumerates the
      api-reference sections it ships (types AND functions: Policy,
      PolicyContext, PolicyCommand, StopContext, RandomPolicyConfig,
      ScriptedPolicyEntry, noopPolicy, randomPolicy, scriptedPolicy).
    
    - Codex LOW — partial-submit diagnostic wording: drop the
      commands.length-vs-executions.length "signals partial submit" claim;
      validator-rejected commands also produce that gap. result.policyError
      is the authoritative signal.
    
    - Opus L-NEG.1: §12 adds negative-path determinism test (policy calls
      world.random() directly → selfCheck.ok===false at first periodic
      snapshot). Proves the safety net works.
    
    - Opus L-EXP.1: drop conditional "if not already" on DeterministicRandom
      re-export note; it's already exported via export*from'./random.js' at
      src/index.ts:14.
    
    - Codex NIT — eleven vs twelve symbols: §4 + §18 say twelve.
    
    - Opus N-PHRASE.1: pin literal seed expression in ADR 5 (single source
      of truth); §5.4 + §7.1 cross-reference.
    
    - Opus N-ALT.1: rewrite ADR 5's alternative-considered (save/restore
      world.rng around policy batch) with clearer mechanical rationale.
    
    Files:
    - docs/design/2026-04-27-synthetic-playtest-harness-design.md (edits)
    - docs/reviews/synthetic-playtest/2026-04-27/design-2/REVIEW.md (synthesis)
    - docs/reviews/synthetic-playtest/2026-04-27/design-2/raw/{codex,opus}.md
    - docs/reviews/synthetic-playtest/2026-04-27/design-2/{prompt,diff}
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/docs/design/2026-04-27-synthetic-playtest-harness-design.md b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
index a4e7bd3..50f8a8f 100644
--- a/docs/design/2026-04-27-synthetic-playtest-harness-design.md
+++ b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
@@ -1,6 +1,6 @@
 # Synthetic Playtest Harness — Design Spec
 
-**Status:** Draft v2 (2026-04-27). Awaiting iter-2 multi-CLI review. iter-1 findings synthesized in `docs/reviews/synthetic-playtest/2026-04-27/design-1/REVIEW.md`; v2 addresses 1 BLOCKER, 3 HIGH, 5 MED, 6 LOW/NIT.
+**Status:** Draft v3 (2026-04-27). Awaiting iter-3 multi-CLI review. Iter-1 findings in `docs/reviews/synthetic-playtest/2026-04-27/design-1/REVIEW.md`; iter-2 findings in `docs/reviews/synthetic-playtest/2026-04-27/design-2/REVIEW.md`. v3 addresses iter-2's 1 BLOCKER (default seed = 0), 2 HIGH (ADR 6 over-claim; sinkError control flow), 2 MED, several LOW/NIT.
 
 **Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).
 
@@ -58,12 +58,12 @@ Three new conceptual primitives, all in `src/synthetic-playtest.ts`:
 | `runSynthPlaytest()` | new (function)    | Drives a World forward through `maxTicks`, calling each policy per tick, recording into a sink.      |
 | Built-in policies    | new (functions)   | `randomPolicy`, `scriptedPolicy`, `noopPolicy`                                                       |
 
-Concrete exported surface (the eleven symbols in §18 acceptance criteria): `Policy`, `PolicyContext`, `PolicyCommand`, `StopContext`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`. Internally the harness owns one `DeterministicRandom` sub-instance for policy randomness (§5.4).
+Concrete exported surface (the twelve symbols in §18 acceptance criteria): `Policy`, `PolicyContext`, `PolicyCommand`, `StopContext`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`. Internally the harness owns one `DeterministicRandom` sub-instance for policy randomness (§5.4).
 
-Plus two additive changes to the merged session-recording subsystem:
+Plus three additive changes to the merged session-recording subsystem:
 
 1. `SessionMetadata.sourceKind` widens from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Type-additive; no consumers in the engine branch on this field today (verified — only producers in `session-recorder.ts:131` and `session-scenario-bundle.ts:71`). ADR 3 documents the trade-off.
-2. `SessionRecorderConfig` gains optional `sourceKind?: 'session' | 'scenario' | 'synthetic'` (default `'session'`). Replaces the iter-1 plan's post-hoc sink-metadata mutation, which was unsound (would lose the kind on early-crash + custom-sink shapes). See ADR 3a.
+2. `SessionRecorderConfig` gains optional `sourceKind?: 'session' | 'scenario' | 'synthetic'` (default `'session'`) and `policySeed?: number`. Replaces the iter-1 plan's post-hoc sink-metadata mutation, which was unsound (would lose the kind on early-crash + custom-sink shapes). See ADR 3a.
 3. `SessionMetadata` gains optional `policySeed?: number` populated when `sourceKind === 'synthetic'`. Preserves the seed for future replay-via-policy work.
 
 ```
@@ -180,13 +180,13 @@ Stateful policies must keep their state JSON-clean and seeded from `ctx.random()
 
 The harness owns a `DeterministicRandom` instance distinct from `world.rng`. `PolicyContext.random()` and `StopContext.random()` are bound to this instance. Properties:
 
-- **Seeded.** `SynthPlaytestConfig.policySeed?: number` (default: a value derived once via `world.random()` at harness construction, called BEFORE `recorder.connect()` so it's deterministic w.r.t. the pre-policy world state and is captured in the initial snapshot's RNG state).
+- **Seeded.** `SynthPlaytestConfig.policySeed?: number` (default: derived at harness construction from a single `world.random()` call, scaled to a uint32 — see ADR 5 for the literal expression). The single seed-derivation call to `world.random()` happens BEFORE `recorder.connect()`, so the captured initial snapshot reflects the post-derivation `world.rng` state. Replay reproduces this trivially.
 - **Independent of world RNG.** Calling `ctx.random()` doesn't advance `world.rng`. Replay re-executes the recorded commands and `world.step()`; `world.rng` evolves identically because policies didn't perturb it.
 - **Stored in metadata.** `SessionMetadata.policySeed?: number` is populated for synthetic bundles. Replay doesn't use it (commands are recorded directly), but the seed is preserved so future replay-via-policy work has it.
 
 `randomPolicy` (§6.2) uses `ctx.random()` internally for catalog selection. Custom policies use `ctx.random()` for any randomness they need.
 
-ADR 5 (§15) captures the design rationale for the sub-RNG.
+ADR 5 (§15) captures the design rationale and the literal seed-derivation expression for the sub-RNG.
 
 ## 6. Built-in Policies
 
@@ -247,11 +247,15 @@ Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the seq
 
 ### 6.4 Composition
 
-Multiple policies are passed as an array. Each gets called per tick; their command outputs are concatenated and submitted in policy-array order via `world.submitWithResult`. Order determines `submissionSequence`, which the engine respects.
+Multiple policies are passed as an array. The harness invokes each in order with the same `PolicyContext`; their command outputs are submitted in policy-array order via `world.submitWithResult`. The order determines `submissionSequence`, which the engine respects.
 
-**Composition observation property** (ADR 6): the harness submits each policy's commands inline before invoking the next policy. So `policies[1].decide(ctx)` runs against a world whose `commandQueue` already holds `policies[0]`'s submissions and whose `nextCommandResultSequence` has advanced. Later policies can observe earlier submissions via `world.commandQueue` (or via events fired by handlers — though handlers don't run until `world.step()`).
+**Within a tick, composed policies do NOT observe each other's submissions.** The world's command queue is private and ARCHITECTURE.md forbids direct access; `world.getEvents()` returns the *previous* tick's events; handlers don't fire until `world.step()`. So `policies[1].decide(ctx)` sees the same world state as `policies[0].decide(ctx)`. Earlier-policy submissions become visible to later policies only on the *next* tick (via observable side effects: state changes, emitted events).
 
-This is intentional. If batch-and-flush semantics are needed (later policies can't observe earlier policies' work), wrap them in a single composite policy that does the batching internally.
+The visible-from-outside ordering — `submissionSequence` on `bundle.commands` matches policy-array order — is the property §12 verifies. This is a property of `submitWithResult` ordering, not of policy-side observation.
+
+If you need batch semantics (one policy's output influencing another within the same tick), wrap them in a single composite policy that does the coordination internally and submits the merged result.
+
+ADR 6 (§15) records this as an explicit non-feature.
 
 ## 7. Harness API
 
@@ -311,26 +315,28 @@ export function runSynthPlaytest<TEventMap, TCommandMap, TDebug = JsonValue>(
 ### 7.1 Lifecycle
 
 1. **Setup.** Caller constructs a `World`, registers components/handlers/validators/systems. The harness does NOT do this — game-specific setup is the caller's responsibility (mirrors `runScenario`).
-2. **Sub-RNG init.** Harness derives `policySeed` (config value or one `world.random()` call) and constructs a private `DeterministicRandom` instance. The single `world.random()` call to derive a default seed advances `world.rng` once, but this happens BEFORE `recorder.connect()` — so the recorded initial snapshot captures the post-derivation RNG state. Replay reproduces this trivially.
-3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot, sourceLabel, sourceKind: 'synthetic', policySeed })`. The recorder writes initial metadata with `sourceKind: 'synthetic'` and `policySeed` at `connect()` time. No post-hoc metadata mutation.
+2. **Sub-RNG init.** Harness computes `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)` (the literal expression — see ADR 5). Constructs a private `DeterministicRandom` from this seed. The single default-derivation `world.random()` call advances `world.rng` once BEFORE `recorder.connect()` — so the recorded initial snapshot captures the post-derivation RNG state. Replay reproduces this trivially.
+3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot, sourceLabel, sourceKind: 'synthetic', policySeed })`. Calls `recorder.connect()`. **Then immediately checks `recorder.lastError`** — if set (initial-snapshot or `sink.open()` failure), short-circuit: call `recorder.disconnect()` (best-effort) and return `{ bundle: recorder.toBundle(), ticksRun: 0, stopReason: 'sinkError', ok: false }`. (See §7.2 connect-time failure path.)
 4. **Tick loop.** For each tick from `world.tick` up to `world.tick + maxTicks`:
     - Build `policyCtx = { world, tick: world.tick + 1, random: subRng.random.bind(subRng) }`.
     - For each policy in `policies` array:
-        - Call `policy(policyCtx)`. If it throws, set `stopReason: 'policyError'`, populate `policyError`, break the outer loop, finalize via §7.2 H2 path. (Note: any commands submitted by earlier-index policies in this tick remain in the bundle; see L4 in §7.2.)
+        - Call `policy(policyCtx)`. If it throws, set `stopReason: 'policyError'`, populate `policyError`, break the outer loop, finalize via §7.2 policy-throw path. (Note: any commands submitted by earlier-index policies in this tick remain in the bundle; see partial-submit note in §7.2.)
         - For each `PolicyCommand` returned, call `world.submitWithResult(cmd.type, cmd.data)`.
     - Call `world.step()`. If it throws (poison), check `stopOnPoisoned`; if true, set `stopReason: 'poisoned'`, break, finalize.
+    - **Check `recorder.lastError`** — if set (sink failure during the tick's writes), break with `stopReason: 'sinkError'`, finalize.
     - Build `stopCtx = { world, tick: world.tick, random: subRng.random.bind(subRng) }`.
     - Check `stopWhen(stopCtx)`; break with `stopReason: 'stopWhen'` if truthy.
     - Increment `ticksRun`.
-5. **Disconnect.** Call `recorder.disconnect()`. Returns `{ bundle, ticksRun, stopReason, ok, policyError? }`.
+5. **Disconnect.** Call `recorder.disconnect()`. Returns `{ bundle, ticksRun, stopReason, ok, policyError? }`. `ok` is `true` for `'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError'` (the bundle is valid up to the failure point); `false` for `'sinkError'` (recording is incomplete by definition).
 
 ### 7.2 Failure modes
 
 - **World poisoned mid-tick.** `world.step()` throws `WorldTickFailureError`. Harness catches, sets `stopReason: 'poisoned'`, calls `recorder.disconnect()`, returns `{ bundle, ticksRun, stopReason, ok: true }`. Bundle has the failed tick recorded in `metadata.failedTicks` via the existing `SessionRecorder` machinery — no synthesis.
 - **World already poisoned at start.** `recorder.connect()` throws `RecorderClosedError(code: 'world_poisoned')`. The harness propagates this — caller must `world.recover()` first.
-- **Policy throws.** Harness catches, sets `stopReason: 'policyError'`, populates `policyError: { policyIndex, tick, error }`, calls `recorder.disconnect()`, returns. **`bundle.failures` is NOT modified** — the world isn't poisoned, no `TickFailure` is synthesized. Callers reading `result.policyError` get the actionable info.
-- **Partial submit before policy throw.** A policy may call `world.submitWithResult` for command A, then throw on attempting command B. The recorder's wrap captures command A; the harness aborts before `world.step()`. The bundle has a command in `commands.jsonl` with no matching `executions` entry. `selfCheck` won't replay across the abort point so this is benign, but `result.policyError` carries the diagnostic and the bundle's `commands` length minus `executions` length signals the partial submission to careful readers.
-- **Sink write failure.** `SessionRecorder` already handles this — sets `metadata.incomplete = true`, marks itself terminal. Harness sees this via `recorder.lastError` and returns `{ ok: false, stopReason: 'sinkError' }`. (`'sinkError'` is the new union member that distinguishes I/O failure from logical stop reasons.)
+- **Connect-time sink failure.** `recorder.connect()` does NOT throw on initial-snapshot/`sink.open()` failure — it flips `_connected:true`, stores the error in `recorder.lastError`, and marks itself terminal. The harness MUST check `recorder.lastError` immediately after `connect()` returns (see §7.1 step 3). On detection: best-effort `recorder.disconnect()`, return `{ bundle: recorder.toBundle(), ticksRun: 0, stopReason: 'sinkError', ok: false }`. The bundle is incomplete by definition.
+- **Mid-tick sink failure.** `recorder.lastError` may be set during a tick's writes (e.g., disk full). The harness MUST check this after `world.step()` (see §7.1 step 4) and break with `stopReason: 'sinkError'`, then call `recorder.disconnect()` (which short-circuits because `_terminated` is already set) and return `{ bundle, ticksRun, stopReason, ok: false }`.
+- **Policy throws.** Harness catches, sets `stopReason: 'policyError'`, populates `policyError: { policyIndex, tick, error }`, calls `recorder.disconnect()`, returns `{ bundle, ticksRun, stopReason, ok: true }`. **`bundle.failures` is NOT modified** — the world isn't poisoned, no `TickFailure` is synthesized. Callers reading `result.policyError` get the actionable info.
+- **Partial submit before policy throw.** A policy may call `world.submitWithResult` for command A, then throw on attempting command B. The recorder's wrap captures command A; the harness aborts before `world.step()`. The bundle has a command entry in `commands.jsonl` with no matching `executions` entry for that tick. `selfCheck` won't replay across the abort point so the orphan is benign; `result.policyError` carries the diagnostic. (Note: a `commands.length > executions.length` shape is also produced by validator-rejected commands during normal runs — the gap alone is not specific to policy throws; `result.policyError` is the authoritative signal.)
 
 ### 7.3 Determinism
 
@@ -367,7 +373,7 @@ The bundle is replayable via `SessionReplayer` like any other. Useful pattern: s
 - **`scenarioResultToBundle`**: orthogonal — scenarios test specific outcomes; synthetic playtests explore. A scenario can include checks; a synthetic playtest doesn't.
 - **`runScenario`**: shares the "set up world, run, capture bundle" pattern but with a scripted run callback rather than policies. The two are intentionally separate — composing them (running a scenario *as* a policy) is possible but adds no value.
 - **`SessionRecordingError` family**: same error types apply (poisoned world, sink failures, etc.).
-- **`DeterministicRandom`**: re-exported from `src/index.ts` if not already; harness uses it for the policy sub-RNG.
+- **`DeterministicRandom`**: already re-exported from `src/index.ts` (`export * from './random.js'` at `src/index.ts:14`); harness uses it for the policy sub-RNG.
 
 ## 10. Determinism Self-Check (CI Pattern)
 
@@ -416,8 +422,9 @@ Unit / integration tests target:
     - `noopPolicy` returns `[]` always.
     - `randomPolicy` with seed produces deterministic catalog selections; respects `frequency`, `offset`, `burst`. Two runs with same seed produce identical command streams.
     - `scriptedPolicy` emits the right entry at the right tick; ignores unmatched ticks.
-- **Composition**: multiple policies' outputs concatenate in array order; `submissionSequence` respects this; later policies observe earlier policies' submissions in the queue (ADR 6 verification test).
-- **Sub-RNG isolation**: a policy that calls `ctx.random()` does NOT advance `world.rng`. Test: record a synthetic bundle, replay via `SessionReplayer.selfCheck()`, expect ok:true.
+- **Composition**: multiple policies' outputs are submitted in array order; `bundle.commands[].submissionSequence` matches policy-array order across composed policies on a given tick (external assertion — ADR 6 explicitly says policies don't observe each other within a tick).
+- **Sub-RNG isolation (positive case)**: a policy that calls `ctx.random()` does NOT advance `world.rng`. Test: record a synthetic bundle, replay via `SessionReplayer.selfCheck()`, expect `ok: true`.
+- **Sub-RNG isolation (negative case)**: a misbehaving policy that calls `world.random()` directly (i.e., violates the §5.4 contract) produces a bundle whose `selfCheck()` returns `ok: false` with state divergence at the first periodic snapshot. This proves the safety net works — a future regression that lets policies perturb `world.rng` would be caught by this test.
 - **Stop conditions**:
     - `maxTicks` fires after exactly N steps.
     - `stopWhen` fires when predicate returns truthy. `StopContext.tick === world.tick` (post-step).
@@ -462,9 +469,9 @@ Per AGENTS.md per-commit `c`-bump policy. Branch base: **v0.7.19** (latest on `m
 
 Plan structure (3 commits, docs folded into the commits that introduce the API):
 
-- **T1 (v0.7.20)**: Policy interface, sub-RNG plumbing, three built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`), unit tests covering each policy's behavior. Doc surface: `docs/api-reference.md` policy types only (the harness API doesn't ship until T2).
-- **T2 (v0.7.21)**: `runSynthPlaytest` harness + lifecycle. `SessionRecorderConfig` widened to accept `sourceKind?` and `policySeed?`. `SessionMetadata.sourceKind` widened; `SessionMetadata.policySeed?` added. Tests cover lifecycle + each stop reason + each failure mode + composition observation. Doc surface: full `docs/api-reference.md` updates, new `docs/guides/synthetic-playtest.md`, `docs/guides/session-recording.md` extension.
-- **T3 (v0.7.22)**: Determinism integration tests (synthetic bundle round-trips through `SessionReplayer.selfCheck`; production-determinism dual-run test). Architecture docs: `docs/architecture/ARCHITECTURE.md` + 4 ADRs in `decisions.md` + drift-log entry. Roadmap status update.
+- **T1 (v0.7.20)**: Policy interface, sub-RNG plumbing, three built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`), unit tests covering each policy's behavior. Doc surface: `docs/api-reference.md` sections for **all symbols T1 ships** — `Policy`, `PolicyContext`, `PolicyCommand`, `StopContext`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy` (types AND functions, per AGENTS.md doc-discipline). Changelog entry, devlog, version bump. `docs/architecture/decisions.md` lands ADRs 1, 2, 5 (policy-is-function, read-only-world, sub-RNG). The end-to-end guide ships in T2 because the harness API isn't usable without `runSynthPlaytest`.
+- **T2 (v0.7.21)**: `runSynthPlaytest` harness + lifecycle. `SessionRecorderConfig` widened to accept `sourceKind?` and `policySeed?`. `SessionMetadata.sourceKind` widened; `SessionMetadata.policySeed?` added. Tests cover lifecycle + each stop reason + each failure mode + composition external-ordering. Doc surface: full `docs/api-reference.md` updates for `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, plus updated sections for `SessionRecorderConfig` and `SessionMetadata`. New `docs/guides/synthetic-playtest.md`. `docs/guides/session-recording.md` extension. ADRs 3, 3a, 4, 6 land here (sourceKind extension, set-at-construction, sync single-process, composition without observability).
+- **T3 (v0.7.22)**: Determinism integration tests (synthetic bundle round-trips through `SessionReplayer.selfCheck`; production-determinism dual-run test; sub-RNG negative-path test per §12). Architecture docs: `docs/architecture/ARCHITECTURE.md` Component Map + drift-log entry. Roadmap status update. No new ADRs in T3.
 
 `SessionMetadata.sourceKind` widening is type-additive — existing producers and consumers continue to work; no engine-internal consumer branches on the field. `c`-bump rather than `b`-bump per ADR 3 (with explicit acknowledgement of downstream `assertNever`-style breakage).
 
@@ -511,19 +518,25 @@ The new field is type-additive; existing callers of `SessionRecorder` see no cha
 
 **Decision:** The harness owns a private `DeterministicRandom` instance. `PolicyContext.random()` and `StopContext.random()` are bound to this instance. Policies (including `randomPolicy`) MUST use `ctx.random()`, not `world.random()`, for any randomness.
 
+**Literal seed expression:** `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)`. The `Math.floor(... * 0x1_0000_0000)` scaling is deliberate: `world.random()` returns a `[0, 1)` float; `DeterministicRandom`'s `seedToUint32` (`src/random.ts:46-50`) does `Math.trunc(x) >>> 0` for numeric seeds, which would collapse every value in `[0, 1)` to **0**. Scaling to a uint32 first preserves the world's RNG state in the seed. Quote this expression verbatim in §7.1 step 2 and §5.4.
+
 **Rationale:** A policy calling `world.random()` between ticks advances `world.rng`. The next snapshot captures that advance. `SessionReplayer` replays commands and `world.step()` but does NOT re-invoke policies — its `world.rng` evolves only with system code, so its captured snapshot's RNG state diverges from the recorded one. `_checkSegment` reports a state divergence at the first periodic snapshot, every time. The engine has explicit precedent against this pattern (`tests/command-transaction.test.ts:567` — "predicate cannot call random() — would advance RNG and break determinism").
 
-A separate sub-RNG eliminates the issue: `ctx.random()` doesn't touch `world.rng`, so replay reproduces world state exactly. The sub-RNG is seeded from `SynthPlaytestConfig.policySeed` (default: one `world.random()` call at harness construction, before `recorder.connect()` — so the captured initial snapshot reflects the post-derivation RNG state). The seed is stored in `SessionMetadata.policySeed` for future replay-via-policy work.
+A separate sub-RNG eliminates the issue: `ctx.random()` doesn't touch `world.rng`, so replay reproduces world state exactly. The single seed-derivation `world.random()` call (when `policySeed` is defaulted) happens BEFORE `recorder.connect()`, so the captured initial snapshot reflects the post-derivation `world.rng` state. The seed is stored in `SessionMetadata.policySeed` for future replay-via-policy work.
+
+**Alternative considered and rejected:** save and restore `world.rng.getState()` around each policy invocation, so policy `world.random()` calls don't durably perturb `world.rng`. The problem with this: each policy in a composed array would observe the same restored state at the start of its call, so any two policies that called `world.random()` the same number of times would see the same values — they'd silently shadow each other's RNG draws unless each received its own per-policy sub-RNG split. At that point we're back to per-policy sub-RNGs, with the additional complexity of save/restore plumbing. The single-shared-sub-RNG-via-`ctx.random()` design is mechanically simpler and exposes the seeding contract directly.
+
+### ADR 6: Composed policies do NOT observe each other's submissions within a tick
 
-**Alternative considered and rejected:** save/restore `world.rng.getState()` around each policy batch. Tradeoff: composed policies all share the saved state and re-derive identical sequences unless each gets its own sub-RNG. Cleaner to give the harness a single sub-RNG that all policies share via `ctx.random()`.
+**Decision:** When multiple policies share a tick (composition), they receive the same `PolicyContext.world` snapshot at policy-call time. The harness submits each policy's commands in array order, but composed policies cannot publicly observe earlier policies' submissions during the same tick. The `submissionSequence` ordering is observable externally on the resulting bundle (and matches policy-array order); within a tick, policies are computational siblings, not a pipeline.
 
-### ADR 6: Composed policies observe earlier policies' submissions
+**Rationale:** The earlier draft of this ADR claimed policies could observe `world.commandQueue` and `nextCommandResultSequence` to inspect earlier-policy submissions. Both fields are `private` in `World` (`world.ts:252,277`), and `docs/architecture/ARCHITECTURE.md:88` explicitly says "Do not access the queue directly". Handlers don't run until `world.step()`, and `world.getEvents()` returns the *previous* tick's events — so within a tick there is no public surface through which policies could see each other's submissions. Advertising the property would have promised a feature the engine doesn't expose.
 
-**Decision:** With multiple policies in the array, the harness submits each policy's commands inline before invoking the next policy. Later policies see the world's `commandQueue` containing earlier policies' submissions (and `nextCommandResultSequence` advanced).
+We could add such a surface (`ctx.peekPendingCommands()` backed by a public `world.peekPendingCommands()`), but that's real new World-API expansion and is outside Tier-1 scope. If the use case materializes, a future spec can add it with its own ADR.
 
-**Rationale:** This is how `world.submit()` already behaves between callers — there's no "policy boundary" in the existing engine. Forcing batch-and-flush semantics would require a separate buffered submit path, adding complexity to handle a nuance most users don't need. Users who genuinely need batched semantics can wrap their policies in a single composite policy that does the batching internally.
+If batch semantics are genuinely needed (one policy's output influencing another within the same tick), the user wraps the dependent policies in a single composite policy that performs the merge internally and submits the combined result.
 
-This is documented (rather than enforced) so future readers understand the dispatch order is meaningful.
+§12 verifies the external-ordering property: `bundle.commands[].submissionSequence` across composed policies on a given tick matches policy-array order. This is the testable shape; the within-tick observation property is explicitly NOT a testable claim.
 
 ## 16. Open Questions / Deferred
 
@@ -544,10 +557,10 @@ This is documented (rather than enforced) so future readers understand the dispa
 
 ## 18. Acceptance Criteria
 
-- All eleven new symbols (`Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`) exported from `src/index.ts` with full TypeScript types.
+- All twelve new symbols (`Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`) exported from `src/index.ts` with full TypeScript types.
 - `SessionRecorderConfig` extended with optional `sourceKind?` and `policySeed?` (additive).
 - `SessionMetadata.sourceKind` widened to include `'synthetic'`. `SessionMetadata.policySeed?` added.
-- Test coverage: ≥1 test per built-in policy + harness lifecycle + each stop reason + each failure mode + 1 selfCheck round-trip + 1 production-determinism dual-run + 1 sub-RNG isolation test + 1 composition observation test.
+- Test coverage: ≥1 test per built-in policy + harness lifecycle + each stop reason + each failure mode + 1 selfCheck round-trip + 1 production-determinism dual-run + 1 sub-RNG isolation positive test + 1 sub-RNG negative-path test (policy calls `world.random()` → `selfCheck.ok === false`) + 1 composition external-ordering test.
 - All four engine gates pass (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
 - §13 doc updates land in the same commits as the code that introduces each surface.
 - Multi-CLI design review and code review reach convergence (this iteration is iter-2 of design review).
