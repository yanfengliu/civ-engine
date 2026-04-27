commit 0aec0424507a469b1ea50d0ce433e47e66818d66
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 10:28:37 2026 -0700

    docs(design): synth playtest — design v4 addressing iter-3 review
    
    Iter-3 reviewers diverged: Opus ACCEPT with 2 NIT + 1 LOW; Codex
    flagged 2 HIGH + 1 MED that Opus didn't probe. v4 lands:
    
    - H-CONNECT.1 (Codex HIGH): connect-time sink failure path was
      underspecified — returning recorder.toBundle() but no initial
      snapshot was persisted, so no coherent bundle exists. v4 propagates
      the error (re-throws recorder.lastError) matching the existing
      world-poisoned-at-start convention. 'sinkError' stopReason is now
      reserved for mid-tick failures only (where at least the initial
      snapshot exists). §7.1 step 3 + §7.2 connect-time entry updated.
    
    - H-GENERICS.1 (Codex HIGH): policy public surface dropped
      TComponents and TState generics from World. World is actually
      World<TEventMap, TCommandMap, TComponents, TState>; spec was typing
      ctx.world only over <TEventMap, TCommandMap>, erasing typed
      getComponent/getState access. v4 extends Policy / PolicyContext /
      StopContext / RandomPolicyConfig / SynthPlaytestConfig /
      SynthPlaytestResult to 4-generic shape with defaults that preserve
      2-generic ergonomics. PolicyCommand and ScriptedPolicyEntry remain
      1-generic (only depend on TCommandMap).
    
    - L-TICKS.1 (convergent: Codex MED + Opus LOW): ticksRun increment
      placed inconsistently — was the last sub-step of the loop, AFTER
      stopWhen check, so 'stopWhen' and 'sinkError' (mid-tick) gave
      ticksRun = K-1 even though step() succeeded on tick K. v4 moves
      the increment immediately after the post-step recorder.lastError
      check, before the stopWhen check. Documented on
      SynthPlaytestResult.ticksRun.
    
    - N-SNAPSHOT.1 (Opus NIT): ADR 6 said composed policies "receive the
      same world snapshot" — implies frozen copy. v4 says "same world
      reference, but no public surface exposes earlier-policy submissions"
      to be precise.
    
    - N-FUTURE-SPECS.1 (Opus NIT): §17 future-specs table reordered to
      numeric order (5, 7, 8, 9).
    
    Files:
    - docs/design/2026-04-27-synthetic-playtest-harness-design.md (edits)
    - docs/reviews/synthetic-playtest/2026-04-27/design-3/REVIEW.md (synthesis)
    - docs/reviews/synthetic-playtest/2026-04-27/design-3/raw/{codex,opus}.md
    - docs/reviews/synthetic-playtest/2026-04-27/design-3/{prompt,diff}
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/docs/design/2026-04-27-synthetic-playtest-harness-design.md b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
index 50f8a8f..a9cf1df 100644
--- a/docs/design/2026-04-27-synthetic-playtest-harness-design.md
+++ b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
@@ -1,6 +1,6 @@
 # Synthetic Playtest Harness — Design Spec
 
-**Status:** Draft v3 (2026-04-27). Awaiting iter-3 multi-CLI review. Iter-1 findings in `docs/reviews/synthetic-playtest/2026-04-27/design-1/REVIEW.md`; iter-2 findings in `docs/reviews/synthetic-playtest/2026-04-27/design-2/REVIEW.md`. v3 addresses iter-2's 1 BLOCKER (default seed = 0), 2 HIGH (ADR 6 over-claim; sinkError control flow), 2 MED, several LOW/NIT.
+**Status:** Draft v4 (2026-04-27). Awaiting iter-4 multi-CLI review. Iter-1, 2, 3 review syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1,2,3}/REVIEW.md`. v4 addresses iter-3's 2 HIGH (connect-time toBundle() not implementable; missing TComponents/TState generics on policy surface) + 1 MED convergent (ticksRun increment placement) + 2 NIT (ADR 6 wording, §17 ordering).
 
 **Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).
 
@@ -100,10 +100,19 @@ Plus three additive changes to the merged session-recording subsystem:
 
 A policy is a function (or stateful class with a method) that, given a context, returns the commands to submit *before* `world.step()` advances the world.
 
+The four generic parameters mirror `World<TEventMap, TCommandMap, TComponents, TState>` so policies retain typed access to components and resource state. Defaults match `World`'s defaults — `Policy<E, C>` continues to work for callers who don't care about typed components/state.
+
 ```ts
-export interface PolicyContext<TEventMap, TCommandMap> {
+import type { ComponentRegistry } from './world.js';
+
+export interface PolicyContext<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> {
   /** Read-only view of the current world. Policies must NOT mutate. */
-  readonly world: World<TEventMap, TCommandMap>;
+  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
   /** The tick that's about to execute (i.e., commands submitted now run during this tick). */
   readonly tick: number;
   /**
@@ -114,18 +123,28 @@ export interface PolicyContext<TEventMap, TCommandMap> {
   readonly random: () => number;
 }
 
-export type Policy<TEventMap, TCommandMap> = (
-  context: PolicyContext<TEventMap, TCommandMap>,
+export type Policy<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> = (
+  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
 ) => PolicyCommand<TCommandMap>[];
 
-/** Discriminated union; `type` and `data` are correlated. */
+/** Discriminated union; `type` and `data` are correlated. Depends only on TCommandMap. */
 export type PolicyCommand<TCommandMap> = {
   [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
 }[keyof TCommandMap & string];
 
 /** Used by `stopWhen` only. Same shape as PolicyContext but `tick` is post-step. */
-export interface StopContext<TEventMap, TCommandMap> {
-  readonly world: World<TEventMap, TCommandMap>;
+export interface StopContext<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> {
+  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
   /** The tick that just executed (`world.tick` at the time of the check). */
   readonly tick: number;
   /** Same seeded sub-RNG instance as policies — exposed in case a stop predicate needs deterministic randomness. */
@@ -195,7 +214,12 @@ ADR 5 (§15) captures the design rationale and the literal seed-derivation expre
 Submits nothing. Useful for letting world systems advance without external input.
 
 ```ts
-export function noopPolicy<E, C>(): Policy<E, C> {
+export function noopPolicy<
+  E extends Record<keyof E, unknown> = Record<string, never>,
+  C extends Record<keyof C, unknown> = Record<string, never>,
+  Comps extends ComponentRegistry = Record<string, unknown>,
+  S extends Record<string, unknown> = Record<string, unknown>,
+>(): Policy<E, C, Comps, S> {
   return () => [];
 }
 ```
@@ -205,13 +229,18 @@ export function noopPolicy<E, C>(): Policy<E, C> {
 Picks a random command from a caller-supplied catalog. Frequency controls how often (every N ticks).
 
 ```ts
-export interface RandomPolicyConfig<TEventMap, TCommandMap> {
+export interface RandomPolicyConfig<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> {
   /**
    * Catalog of command-generators. Each entry is invoked with the policy
    * context to produce a concrete command. The harness picks one entry
    * uniformly at random per emit, via `ctx.random()`.
    */
-  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap>) => PolicyCommand<TCommandMap>>;
+  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap, TComponents, TState>) => PolicyCommand<TCommandMap>>;
   /** Emit on ticks where `tick % frequency === offset`. Default frequency: 1; offset: 0. */
   frequency?: number;
   offset?: number;
@@ -219,9 +248,14 @@ export interface RandomPolicyConfig<TEventMap, TCommandMap> {
   burst?: number;
 }
 
-export function randomPolicy<TEventMap, TCommandMap>(
-  config: RandomPolicyConfig<TEventMap, TCommandMap>,
-): Policy<TEventMap, TCommandMap>;
+export function randomPolicy<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+>(
+  config: RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>,
+): Policy<TEventMap, TCommandMap, TComponents, TState>;
 ```
 
 The catalog is functions, not data, so commands can reference live world state (e.g., pick a random existing entity to target). This avoids requiring policies to crawl `world.query()` themselves.
@@ -233,14 +267,19 @@ The catalog is functions, not data, so commands can reference live world state (
 Plays back a pre-recorded list of `{ tick, type, data }` entries. Useful for regression scenarios derived from real bug bundles.
 
 ```ts
-/** Discriminated union; `type` and `data` are correlated. */
+/** Discriminated union; `type` and `data` are correlated. Depends only on TCommandMap. */
 export type ScriptedPolicyEntry<TCommandMap> = {
   [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
 }[keyof TCommandMap & string];
 
-export function scriptedPolicy<TEventMap, TCommandMap>(
+export function scriptedPolicy<
+  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
+  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+>(
   sequence: ScriptedPolicyEntry<TCommandMap>[],
-): Policy<TEventMap, TCommandMap>;
+): Policy<TEventMap, TCommandMap, TComponents, TState>;
 ```
 
 Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the sequence emit nothing.
@@ -260,25 +299,31 @@ ADR 6 (§15) records this as an explicit non-feature.
 ## 7. Harness API
 
 ```ts
-export interface SynthPlaytestConfig<TEventMap, TCommandMap, TDebug = JsonValue> {
+export interface SynthPlaytestConfig<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+  TDebug = JsonValue,
+> {
   /** Pre-configured world with components/handlers/validators/systems registered. */
-  world: World<TEventMap, TCommandMap>;
+  world: World<TEventMap, TCommandMap, TComponents, TState>;
   /** One or more policies. Empty array == noop. */
-  policies: Policy<TEventMap, TCommandMap>[];
+  policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
   /** Maximum number of `world.step()` calls. Required. */
   maxTicks: number;
   /** Optional sink. Default: new MemorySink(). */
   sink?: SessionSink & SessionSource;
   /** Optional human label propagated into bundle metadata. Default: 'synthetic'. */
   sourceLabel?: string;
-  /** Seed for the policy sub-RNG. Default: `world.random()` snapshot at harness construction. */
+  /** Seed for the policy sub-RNG. Default: derived once via `Math.floor(world.random() * 0x1_0000_0000)` at harness construction (see ADR 5). */
   policySeed?: number;
   /**
    * Stop the playtest early when this predicate returns truthy. Called after
    * each `step()` with a fresh `StopContext` whose `tick` reflects the
    * just-executed tick. Default: never stop early.
    */
-  stopWhen?: (ctx: StopContext<TEventMap, TCommandMap>) => boolean;
+  stopWhen?: (ctx: StopContext<TEventMap, TCommandMap, TComponents, TState>) => boolean;
   /**
    * If true (default), stop the playtest as soon as the world becomes
    * poisoned. The bundle still records the failed tick. If false, the
@@ -292,12 +337,24 @@ export interface SynthPlaytestConfig<TEventMap, TCommandMap, TDebug = JsonValue>
   terminalSnapshot?: boolean;
 }
 
-export interface SynthPlaytestResult<TEventMap, TCommandMap, TDebug> {
+export interface SynthPlaytestResult<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+  TDebug = JsonValue,
+> {
   bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
+  /**
+   * Number of `world.step()` calls that completed without recorder failure during the run.
+   * For 'maxTicks' / 'stopWhen' / 'sinkError' (mid-tick) stops: equals `world.tick - startTick`.
+   * For 'policyError' / 'poisoned' stops: equals `world.tick - startTick` (the failing tick is
+   * not counted because step() did not complete normally on it).
+   */
   ticksRun: number;
-  /** Why the playtest stopped. */
+  /** Why the playtest stopped. `'sinkError'` is mid-tick only — connect-time sink failure throws (see §7.2). */
   stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError';
-  /** True if the run completed without a recorder/sink error. Poisoned and policyError still produce ok:true (bundle is valid up to the failure). */
+  /** True if the run completed without a recorder/sink error. Poisoned and policyError still produce ok:true (bundle is valid up to the failure). False for 'sinkError'. */
   ok: boolean;
   /** Populated only when stopReason === 'policyError'. */
   policyError?: {
@@ -307,16 +364,22 @@ export interface SynthPlaytestResult<TEventMap, TCommandMap, TDebug> {
   };
 }
 
-export function runSynthPlaytest<TEventMap, TCommandMap, TDebug = JsonValue>(
-  config: SynthPlaytestConfig<TEventMap, TCommandMap, TDebug>,
-): SynthPlaytestResult<TEventMap, TCommandMap, TDebug>;
+export function runSynthPlaytest<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+  TDebug = JsonValue,
+>(
+  config: SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState, TDebug>,
+): SynthPlaytestResult<TEventMap, TCommandMap, TComponents, TState, TDebug>;
 ```
 
 ### 7.1 Lifecycle
 
 1. **Setup.** Caller constructs a `World`, registers components/handlers/validators/systems. The harness does NOT do this — game-specific setup is the caller's responsibility (mirrors `runScenario`).
 2. **Sub-RNG init.** Harness computes `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)` (the literal expression — see ADR 5). Constructs a private `DeterministicRandom` from this seed. The single default-derivation `world.random()` call advances `world.rng` once BEFORE `recorder.connect()` — so the recorded initial snapshot captures the post-derivation RNG state. Replay reproduces this trivially.
-3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot, sourceLabel, sourceKind: 'synthetic', policySeed })`. Calls `recorder.connect()`. **Then immediately checks `recorder.lastError`** — if set (initial-snapshot or `sink.open()` failure), short-circuit: call `recorder.disconnect()` (best-effort) and return `{ bundle: recorder.toBundle(), ticksRun: 0, stopReason: 'sinkError', ok: false }`. (See §7.2 connect-time failure path.)
+3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot, sourceLabel, sourceKind: 'synthetic', policySeed })`. Calls `recorder.connect()`. **Then immediately checks `recorder.lastError`** — if set (initial-snapshot or `sink.open()` failure), the harness PROPAGATES the error rather than fabricating a bundle: it calls `recorder.disconnect()` best-effort and re-throws `recorder.lastError`. The recorder may not have produced an initial snapshot at this point, so a returned `bundle` could not be coherent. The caller handles this similarly to `RecorderClosedError({ code: 'world_poisoned' })` propagation. (See §7.2 connect-time failure path.)
 4. **Tick loop.** For each tick from `world.tick` up to `world.tick + maxTicks`:
     - Build `policyCtx = { world, tick: world.tick + 1, random: subRng.random.bind(subRng) }`.
     - For each policy in `policies` array:
@@ -324,16 +387,16 @@ export function runSynthPlaytest<TEventMap, TCommandMap, TDebug = JsonValue>(
         - For each `PolicyCommand` returned, call `world.submitWithResult(cmd.type, cmd.data)`.
     - Call `world.step()`. If it throws (poison), check `stopOnPoisoned`; if true, set `stopReason: 'poisoned'`, break, finalize.
     - **Check `recorder.lastError`** — if set (sink failure during the tick's writes), break with `stopReason: 'sinkError'`, finalize.
+    - **Increment `ticksRun`** here — `step()` completed without recorder failure, so the tick counts.
     - Build `stopCtx = { world, tick: world.tick, random: subRng.random.bind(subRng) }`.
     - Check `stopWhen(stopCtx)`; break with `stopReason: 'stopWhen'` if truthy.
-    - Increment `ticksRun`.
 5. **Disconnect.** Call `recorder.disconnect()`. Returns `{ bundle, ticksRun, stopReason, ok, policyError? }`. `ok` is `true` for `'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError'` (the bundle is valid up to the failure point); `false` for `'sinkError'` (recording is incomplete by definition).
 
 ### 7.2 Failure modes
 
 - **World poisoned mid-tick.** `world.step()` throws `WorldTickFailureError`. Harness catches, sets `stopReason: 'poisoned'`, calls `recorder.disconnect()`, returns `{ bundle, ticksRun, stopReason, ok: true }`. Bundle has the failed tick recorded in `metadata.failedTicks` via the existing `SessionRecorder` machinery — no synthesis.
 - **World already poisoned at start.** `recorder.connect()` throws `RecorderClosedError(code: 'world_poisoned')`. The harness propagates this — caller must `world.recover()` first.
-- **Connect-time sink failure.** `recorder.connect()` does NOT throw on initial-snapshot/`sink.open()` failure — it flips `_connected:true`, stores the error in `recorder.lastError`, and marks itself terminal. The harness MUST check `recorder.lastError` immediately after `connect()` returns (see §7.1 step 3). On detection: best-effort `recorder.disconnect()`, return `{ bundle: recorder.toBundle(), ticksRun: 0, stopReason: 'sinkError', ok: false }`. The bundle is incomplete by definition.
+- **Connect-time sink failure.** `recorder.connect()` does NOT throw on initial-snapshot/`sink.open()` failure — it flips `_connected:true`, stores the error in `recorder.lastError`, and marks itself terminal. The harness checks `recorder.lastError` immediately after `connect()` returns (see §7.1 step 3). On detection: best-effort `recorder.disconnect()`, then **re-throw `recorder.lastError`**. The recorder may not have persisted an initial snapshot at this point, so there's no coherent bundle to return — propagating the error matches the existing world-poisoned-at-start convention. `'sinkError'` as a `stopReason` value is reserved for **mid-tick** sink failures only, where at least the initial snapshot was written and the partial bundle is meaningful.
 - **Mid-tick sink failure.** `recorder.lastError` may be set during a tick's writes (e.g., disk full). The harness MUST check this after `world.step()` (see §7.1 step 4) and break with `stopReason: 'sinkError'`, then call `recorder.disconnect()` (which short-circuits because `_terminated` is already set) and return `{ bundle, ticksRun, stopReason, ok: false }`.
 - **Policy throws.** Harness catches, sets `stopReason: 'policyError'`, populates `policyError: { policyIndex, tick, error }`, calls `recorder.disconnect()`, returns `{ bundle, ticksRun, stopReason, ok: true }`. **`bundle.failures` is NOT modified** — the world isn't poisoned, no `TickFailure` is synthesized. Callers reading `result.policyError` get the actionable info.
 - **Partial submit before policy throw.** A policy may call `world.submitWithResult` for command A, then throw on attempting command B. The recorder's wrap captures command A; the harness aborts before `world.step()`. The bundle has a command entry in `commands.jsonl` with no matching `executions` entry for that tick. `selfCheck` won't replay across the abort point so the orphan is benign; `result.policyError` carries the diagnostic. (Note: a `commands.length > executions.length` shape is also produced by validator-rejected commands during normal runs — the gap alone is not specific to policy throws; `result.policyError` is the authoritative signal.)
@@ -528,7 +591,7 @@ A separate sub-RNG eliminates the issue: `ctx.random()` doesn't touch `world.rng
 
 ### ADR 6: Composed policies do NOT observe each other's submissions within a tick
 
-**Decision:** When multiple policies share a tick (composition), they receive the same `PolicyContext.world` snapshot at policy-call time. The harness submits each policy's commands in array order, but composed policies cannot publicly observe earlier policies' submissions during the same tick. The `submissionSequence` ordering is observable externally on the resulting bundle (and matches policy-array order); within a tick, policies are computational siblings, not a pipeline.
+**Decision:** When multiple policies share a tick (composition), they receive the same `PolicyContext.world` reference at policy-call time. The harness submits each policy's commands in array order, but no public surface exposes earlier-policy submissions to later policies during the same tick. The `submissionSequence` ordering is observable externally on the resulting bundle (and matches policy-array order); within a tick, policies are computational siblings, not a pipeline.
 
 **Rationale:** The earlier draft of this ADR claimed policies could observe `world.commandQueue` and `nextCommandResultSequence` to inspect earlier-policy submissions. Both fields are `private` in `World` (`world.ts:252,277`), and `docs/architecture/ARCHITECTURE.md:88` explicitly says "Do not access the queue directly". Handlers don't run until `world.step()`, and `world.getEvents()` returns the *previous* tick's events — so within a tick there is no public surface through which policies could see each other's submissions. Advertising the property would have promised a feature the engine doesn't expose.
 
@@ -550,14 +613,14 @@ If batch semantics are genuinely needed (one policy's output influencing another
 
 | Future Spec                          | What it adds                                                  |
 | ------------------------------------ | ------------------------------------------------------------- |
+| #5 Counterfactual Replay / Fork      | Synthetic playtest forked from a recorded bug                 |
+| #7 Bundle Search / Corpus Index      | Indexes synthetic bundles for query                           |
 | #8 Behavioral Metrics over Corpus    | Aggregates synthetic-playtest bundles; computes metrics       |
 | #9 AI Playtester Agent               | LLM-driven Policy implementation                              |
-| #7 Bundle Search / Corpus Index      | Indexes synthetic bundles for query                           |
-| #5 Counterfactual Replay / Fork      | Synthetic playtest forked from a recorded bug                 |
 
 ## 18. Acceptance Criteria
 
-- All twelve new symbols (`Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`) exported from `src/index.ts` with full TypeScript types.
+- All twelve new symbols (`Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`) exported from `src/index.ts` with full TypeScript types. All policy-surface generics carry the same four-parameter shape as `World<TEventMap, TCommandMap, TComponents, TState>`, with defaults preserving 2-generic ergonomics for callers that don't care about typed components/state.
 - `SessionRecorderConfig` extended with optional `sourceKind?` and `policySeed?` (additive).
 - `SessionMetadata.sourceKind` widened to include `'synthetic'`. `SessionMetadata.policySeed?` added.
 - Test coverage: ≥1 test per built-in policy + harness lifecycle + each stop reason + each failure mode + 1 selfCheck round-trip + 1 production-determinism dual-run + 1 sub-RNG isolation positive test + 1 sub-RNG negative-path test (policy calls `world.random()` → `selfCheck.ok === false`) + 1 composition external-ordering test.
