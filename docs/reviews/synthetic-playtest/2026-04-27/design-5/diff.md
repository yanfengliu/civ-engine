commit 054d597d2d04cb25de8a8eb235ee1fe277d306ff
Author: Yanfeng Liu <yanfengliux@gmail.com>
Date:   Mon Apr 27 10:39:23 2026 -0700

    docs(design): synth playtest — design v5 addressing iter-4 review
    
    Iter-4 reviewers' findings (3 MED + 3 NIT) all addressed:
    
    - M-DOC-TICKS (Opus MED-1): SynthPlaytestResult.ticksRun docstring
      contradicted §7.1 lifecycle for sinkError mid-tick (lifecycle increments
      AFTER recorder.lastError check, so sinkError mid-tick gives ticksRun=K-1
      while docstring claimed ticksRun=K). v5 rewrites docstring per stop
      reason: maxTicks/stopWhen/policyError → ticksRun=K; sinkError-mid-tick
      and poisoned → ticksRun=K-1.
    
    - M-VERSION (Codex MED-1): T2's sourceKind widening was planned as
      c-bump, but ADR 3 acknowledged it breaks downstream assertNever
      exhaustive switches. AGENTS.md treats compile-breaking as breaking
      regardless of pre-1.0; bumps b. v5 restructures: T1 stays v0.7.20
      (additive c-bump), T2 = v0.8.0 (b-bump consuming the entire breakage
      in one commit), T3 = v0.8.1 (additive c-bump). ADR 3 simplified to
      drop the "we accept the c-bump trade-off" paragraph.
    
    - M-SELFCHECK (Codex MED-2): selfCheck() returns ok:true vacuously when
      bundle has only an initial snapshot (terminalSnapshot:false +
      snapshotInterval:null). v5 adds harness validation at §7.1 step 0:
      reject the combination with a configuration error. §10 clarifies that
      selfCheck only proves replay-determinism over segments and the
      validation guarantees ≥1 segment for any harness-produced bundle.
    
    - NIT-1 (Opus): §4 vs §18 symbol order mismatched. v5 aligns both to
      the same canonical order matching the planned src/index.ts export.
    
    - NIT-2 (Opus): noopPolicy used <E, C, Comps, S>; v5 uses full names
      TEventMap, TCommandMap, TComponents, TState matching every other
      declaration.
    
    - NIT-3 (Opus): scriptedPolicy and noopPolicy had defaults like
      TCommandMap = Record<string, never> that collapse PolicyCommand to
      never (uncallable for non-trivial command maps). v5 drops the defaults
      on TEventMap/TCommandMap (matching randomPolicy's pattern); callers
      infer or specify explicitly. TComponents/TState defaults retained
      since their empty-record default is the world-default.
    
    Files:
    - docs/design/2026-04-27-synthetic-playtest-harness-design.md (edits)
    - docs/reviews/synthetic-playtest/2026-04-27/design-4/REVIEW.md (synthesis)
    - docs/reviews/synthetic-playtest/2026-04-27/design-4/raw/{codex,opus}.md
    - docs/reviews/synthetic-playtest/2026-04-27/design-4/{prompt,diff}
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/docs/design/2026-04-27-synthetic-playtest-harness-design.md b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
index a9cf1df..d3730fb 100644
--- a/docs/design/2026-04-27-synthetic-playtest-harness-design.md
+++ b/docs/design/2026-04-27-synthetic-playtest-harness-design.md
@@ -1,6 +1,6 @@
 # Synthetic Playtest Harness — Design Spec
 
-**Status:** Draft v4 (2026-04-27). Awaiting iter-4 multi-CLI review. Iter-1, 2, 3 review syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1,2,3}/REVIEW.md`. v4 addresses iter-3's 2 HIGH (connect-time toBundle() not implementable; missing TComponents/TState generics on policy surface) + 1 MED convergent (ticksRun increment placement) + 2 NIT (ADR 6 wording, §17 ordering).
+**Status:** Draft v5 (2026-04-27). Awaiting iter-5 multi-CLI review. Iter-1..4 syntheses live under `docs/reviews/synthetic-playtest/2026-04-27/design-{1..4}/REVIEW.md`. v5 addresses iter-4's 3 MED (ticksRun docstring contradiction, sourceKind c-vs-b bump, vacuous selfCheck on no-segment configs) + 3 NIT (symbol order, generic names, scriptedPolicy default-collapse).
 
 **Scope:** Tier-1 spec from `docs/design/ai-first-dev-roadmap.md` (Spec 3). Builds on the session-recording substrate (Spec 1, merged v0.7.6 → v0.7.19). Out of scope: bundle search / corpus index (Spec 7), behavioral metrics over corpus (Spec 8), LLM-driven AI playtester (Spec 9).
 
@@ -58,7 +58,7 @@ Three new conceptual primitives, all in `src/synthetic-playtest.ts`:
 | `runSynthPlaytest()` | new (function)    | Drives a World forward through `maxTicks`, calling each policy per tick, recording into a sink.      |
 | Built-in policies    | new (functions)   | `randomPolicy`, `scriptedPolicy`, `noopPolicy`                                                       |
 
-Concrete exported surface (the twelve symbols in §18 acceptance criteria): `Policy`, `PolicyContext`, `PolicyCommand`, `StopContext`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`. Internally the harness owns one `DeterministicRandom` sub-instance for policy randomness (§5.4).
+Concrete exported surface (the twelve symbols in §18 acceptance criteria; same order in both lists): `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Internally the harness owns one `DeterministicRandom` sub-instance for policy randomness (§5.4).
 
 Plus three additive changes to the merged session-recording subsystem:
 
@@ -215,15 +215,17 @@ Submits nothing. Useful for letting world systems advance without external input
 
 ```ts
 export function noopPolicy<
-  E extends Record<keyof E, unknown> = Record<string, never>,
-  C extends Record<keyof C, unknown> = Record<string, never>,
-  Comps extends ComponentRegistry = Record<string, unknown>,
-  S extends Record<string, unknown> = Record<string, unknown>,
->(): Policy<E, C, Comps, S> {
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+>(): Policy<TEventMap, TCommandMap, TComponents, TState> {
   return () => [];
 }
 ```
 
+(No defaults on `TEventMap` / `TCommandMap` — the empty-record default would collapse `PolicyCommand` to `never` and make the returned policy structurally uncallable for any non-trivial command map. Callers infer or specify explicitly.)
+
 ### 6.2 `randomPolicy({ catalog, frequency, offset, burst })`
 
 Picks a random command from a caller-supplied catalog. Frequency controls how often (every N ticks).
@@ -273,8 +275,8 @@ export type ScriptedPolicyEntry<TCommandMap> = {
 }[keyof TCommandMap & string];
 
 export function scriptedPolicy<
-  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
-  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
   TComponents extends ComponentRegistry = Record<string, unknown>,
   TState extends Record<string, unknown> = Record<string, unknown>,
 >(
@@ -331,7 +333,13 @@ export interface SynthPlaytestConfig<
    * is rarely useful).
    */
   stopOnPoisoned?: boolean;
-  /** Recorder snapshotInterval; passed through. Default: 1000. */
+  /**
+   * Recorder snapshotInterval; passed through. Default: 1000. Setting this to `null`
+   * disables periodic snapshots — combined with `terminalSnapshot: false` this would
+   * leave the bundle with only the initial snapshot, making `selfCheck()` return
+   * `ok: true` vacuously over zero segments. The harness rejects this combination
+   * (see §7.1 step 1).
+   */
   snapshotInterval?: number | null;
   /** Recorder terminalSnapshot; passed through. Default: true. */
   terminalSnapshot?: boolean;
@@ -346,10 +354,16 @@ export interface SynthPlaytestResult<
 > {
   bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
   /**
-   * Number of `world.step()` calls that completed without recorder failure during the run.
-   * For 'maxTicks' / 'stopWhen' / 'sinkError' (mid-tick) stops: equals `world.tick - startTick`.
-   * For 'policyError' / 'poisoned' stops: equals `world.tick - startTick` (the failing tick is
-   * not counted because step() did not complete normally on it).
+   * Number of `world.step()` invocations that completed AND were followed by a clean
+   * `recorder.lastError` check during the run. Per-case (with `K = world.tick - startTick`):
+   * - `'maxTicks'`: `ticksRun === K === maxTicks`.
+   * - `'stopWhen'`: `ticksRun === K` (predicate fires post-increment).
+   * - `'sinkError'` (mid-tick): `ticksRun === K - 1` (step succeeded but recorder failure
+   *   detected on the same tick before the increment).
+   * - `'policyError'`: `ticksRun === K` (policy threw before step on tick K+1; world.tick
+   *   stayed at startTick + K).
+   * - `'poisoned'`: `ticksRun === K - 1` (step on tick K threw; failed tick consumes a number
+   *   per ARCHITECTURE.md, but the increment was skipped).
    */
   ticksRun: number;
   /** Why the playtest stopped. `'sinkError'` is mid-tick only — connect-time sink failure throws (see §7.2). */
@@ -377,6 +391,7 @@ export function runSynthPlaytest<
 
 ### 7.1 Lifecycle
 
+0. **Configuration validation.** Before any side effects, the harness validates the config. If `snapshotInterval == null && terminalSnapshot === false`, throw a `RangeError` (or a dedicated `SynthPlaytestConfigError`) — that combination would produce a bundle with only the initial snapshot, over which `SessionReplayer.selfCheck()` walks zero segments and returns `ok: true` vacuously. Either snapshotting periodically or capturing a terminal snapshot is required so the §10 selfCheck guarantee remains meaningful.
 1. **Setup.** Caller constructs a `World`, registers components/handlers/validators/systems. The harness does NOT do this — game-specific setup is the caller's responsibility (mirrors `runScenario`).
 2. **Sub-RNG init.** Harness computes `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)` (the literal expression — see ADR 5). Constructs a private `DeterministicRandom` from this seed. The single default-derivation `world.random()` call advances `world.rng` once BEFORE `recorder.connect()` — so the recorded initial snapshot captures the post-derivation RNG state. Replay reproduces this trivially.
 3. **Recorder attach.** Harness constructs `SessionRecorder({ world, sink, snapshotInterval, terminalSnapshot, sourceLabel, sourceKind: 'synthetic', policySeed })`. Calls `recorder.connect()`. **Then immediately checks `recorder.lastError`** — if set (initial-snapshot or `sink.open()` failure), the harness PROPAGATES the error rather than fabricating a bundle: it calls `recorder.disconnect()` best-effort and re-throws `recorder.lastError`. The recorder may not have produced an initial snapshot at this point, so a returned `bundle` could not be coherent. The caller handles this similarly to `RecorderClosedError({ code: 'world_poisoned' })` propagation. (See §7.2 connect-time failure path.)
@@ -469,6 +484,8 @@ expect(replayer.selfCheck().ok).toBe(true);
 
 Per spec §13.5 of the session-recording design (CI gate), every synthetic playtest in the engine's test corpus should pass `selfCheck` — same gate that scenario bundles use.
 
+`selfCheck` only proves replay-determinism over the segments between snapshots. The harness's §7.1 step 0 configuration validation guarantees at least one segment exists (either by periodic snapshotting or by capturing a terminal snapshot), so the guarantee is non-vacuous for any bundle the harness produces.
+
 For **production-determinism** verification (re-running produces the same bundle), the test pattern is two harness calls with identical config, then `expect(bundle1.commands).toEqual(bundle2.commands)` and the same for snapshots / events. §12 covers this.
 
 ## 11. Performance
@@ -528,13 +545,13 @@ Per AGENTS.md "Always update if the change introduces or removes API surface":
 
 ## 14. Versioning
 
-Per AGENTS.md per-commit `c`-bump policy. Branch base: **v0.7.19** (latest on `main` after the session-recording followups merge at `c849b9a`). The `agent/synthetic-playtest` branch was rebased on top of this tip.
+Per AGENTS.md per-commit version-bump policy. Branch base: **v0.7.19** (latest on `main` after the session-recording followups merge at `c849b9a`). The `agent/synthetic-playtest` branch was rebased on top of this tip.
 
 Plan structure (3 commits, docs folded into the commits that introduce the API):
 
-- **T1 (v0.7.20)**: Policy interface, sub-RNG plumbing, three built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`), unit tests covering each policy's behavior. Doc surface: `docs/api-reference.md` sections for **all symbols T1 ships** — `Policy`, `PolicyContext`, `PolicyCommand`, `StopContext`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy` (types AND functions, per AGENTS.md doc-discipline). Changelog entry, devlog, version bump. `docs/architecture/decisions.md` lands ADRs 1, 2, 5 (policy-is-function, read-only-world, sub-RNG). The end-to-end guide ships in T2 because the harness API isn't usable without `runSynthPlaytest`.
-- **T2 (v0.7.21)**: `runSynthPlaytest` harness + lifecycle. `SessionRecorderConfig` widened to accept `sourceKind?` and `policySeed?`. `SessionMetadata.sourceKind` widened; `SessionMetadata.policySeed?` added. Tests cover lifecycle + each stop reason + each failure mode + composition external-ordering. Doc surface: full `docs/api-reference.md` updates for `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, plus updated sections for `SessionRecorderConfig` and `SessionMetadata`. New `docs/guides/synthetic-playtest.md`. `docs/guides/session-recording.md` extension. ADRs 3, 3a, 4, 6 land here (sourceKind extension, set-at-construction, sync single-process, composition without observability).
-- **T3 (v0.7.22)**: Determinism integration tests (synthetic bundle round-trips through `SessionReplayer.selfCheck`; production-determinism dual-run test; sub-RNG negative-path test per §12). Architecture docs: `docs/architecture/ARCHITECTURE.md` Component Map + drift-log entry. Roadmap status update. No new ADRs in T3.
+- **T1 (v0.7.20)** — `c`-bump (purely additive). Policy interface, sub-RNG plumbing, three built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`), unit tests covering each policy's behavior. Doc surface: `docs/api-reference.md` sections for **all symbols T1 ships** — `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy` (types AND functions, per AGENTS.md doc-discipline). Changelog entry, devlog, version bump. `docs/architecture/decisions.md` lands ADRs 1, 2, 5 (policy-is-function, read-only-world, sub-RNG). The end-to-end guide ships in T2 because the harness API isn't usable without `runSynthPlaytest`.
+- **T2 (v0.8.0)** — **`b`-bump because the public type surface widens (breaking)**. `SessionMetadata.sourceKind` widens from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'` (ADR 3 — would break downstream `assertNever` exhaustive switches). The `b`-bump consumes the entire breakage at once. Other changes ride along as additive: `SessionRecorderConfig` gains optional `sourceKind?` and `policySeed?`, `SessionMetadata.policySeed?` is added, and `runSynthPlaytest` + `SynthPlaytestConfig` + `SynthPlaytestResult` ship. Tests cover lifecycle + each stop reason + each failure mode + composition external-ordering. Doc surface: full `docs/api-reference.md` updates for `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, plus updated sections for `SessionRecorderConfig` and `SessionMetadata`. New `docs/guides/synthetic-playtest.md`. `docs/guides/session-recording.md` extension. ADRs 3, 3a, 4, 6 land here.
+- **T3 (v0.8.1)** — `c`-bump (additive). Determinism integration tests (synthetic bundle round-trips through `SessionReplayer.selfCheck`; production-determinism dual-run test; sub-RNG negative-path test per §12). Architecture docs: `docs/architecture/ARCHITECTURE.md` Component Map + drift-log entry. Roadmap status update. No new ADRs in T3.
 
 `SessionMetadata.sourceKind` widening is type-additive — existing producers and consumers continue to work; no engine-internal consumer branches on the field. `c`-bump rather than `b`-bump per ADR 3 (with explicit acknowledgement of downstream `assertNever`-style breakage).
 
@@ -552,13 +569,11 @@ Plan structure (3 commits, docs folded into the commits that introduce the API):
 
 **Rationale:** Forcing policies to go through `submit()` (rather than direct mutation) keeps their effects visible in the bundle's command stream — essential for replay. Wrapping the world in a runtime read-only proxy would catch violations earlier but add per-call overhead; deferred until concrete need.
 
-### ADR 3: `SessionMetadata.sourceKind` extended, not replaced
-
-**Decision:** Extend the union type from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Keep `'session'` and `'scenario'` semantics unchanged. `c`-bump (not `b`-bump) despite the type widening.
+### ADR 3: `SessionMetadata.sourceKind` extended, lands as a `b`-bump
 
-**Rationale:** Bundle consumers (replayer, future viewer, future corpus index) need to distinguish synthetic from organic recordings — different policies for retention, analysis, and triage. Adding a third variant is a pure widening; engine-internal consumers don't branch on this field (verified — only producers exist), so engine builds are unaffected.
+**Decision:** Extend the union type from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Keep `'session'` and `'scenario'` semantics unchanged. **Bumps `b` per AGENTS.md** ("Whenever you introduce a breaking change, bump `b` and reset `c`").
 
-**Trade-off acknowledged:** Downstream consumer code that uses an `assertNever`-style exhaustive switch over `sourceKind` will fail to compile when upgrading. This is the expected break for a strict-mode TS consumer; it's caught at build time with a clear error pointing at the missing case. We accept this trade-off because (a) the engine is pre-1.0; (b) the use case for `sourceKind` discrimination is recently introduced and the consumer ecosystem is minimal; (c) `b`-bumps reset the `c` counter and we'd rather not blow through a major-axis bump for a type-additive change. Downstream consumers fixing exhaustive switches should add `case 'synthetic': /* handle */` next to their existing branches.
+**Rationale:** Bundle consumers (replayer, future viewer, future corpus index) need to distinguish synthetic from organic recordings — different policies for retention, analysis, and triage. Engine-internal consumers don't branch on this field (verified — only producers exist), so engine builds are unaffected. Downstream consumers using `assertNever` exhaustive switches over `sourceKind` will fail to compile until they add a `case 'synthetic':` branch — this is the expected build-break for a strict-mode TS consumer. AGENTS.md treats type-surface widening that breaks compile as a breaking change regardless of pre-1.0 status; T2 absorbs this with a single `b`-bump rather than fragmenting the breakage across multiple commits.
 
 ### ADR 3a: `sourceKind` is set at `SessionRecorder` construction, not via post-hoc sink mutation
 
@@ -620,7 +635,7 @@ If batch semantics are genuinely needed (one policy's output influencing another
 
 ## 18. Acceptance Criteria
 
-- All twelve new symbols (`Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`) exported from `src/index.ts` with full TypeScript types. All policy-surface generics carry the same four-parameter shape as `World<TEventMap, TCommandMap, TComponents, TState>`, with defaults preserving 2-generic ergonomics for callers that don't care about typed components/state.
+- All twelve new symbols (`Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy`) exported from `src/index.ts` with full TypeScript types. All policy-surface generics carry the same four-parameter shape as `World<TEventMap, TCommandMap, TComponents, TState>`, with defaults preserving ergonomics for callers that don't care about typed components/state.
 - `SessionRecorderConfig` extended with optional `sourceKind?` and `policySeed?` (additive).
 - `SessionMetadata.sourceKind` widened to include `'synthetic'`. `SessionMetadata.policySeed?` added.
 - Test coverage: ≥1 test per built-in policy + harness lifecycle + each stop reason + each failure mode + 1 selfCheck round-trip + 1 production-determinism dual-run + 1 sub-RNG isolation positive test + 1 sub-RNG negative-path test (policy calls `world.random()` → `selfCheck.ok === false`) + 1 composition external-ordering test.
