diff --git a/README.md b/README.md
index f9eff30..36335d4 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # civ-engine
 
-![version](https://img.shields.io/badge/version-0.7.19-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
+![version](https://img.shields.io/badge/version-0.7.20-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
 
 > ⚠️ **Pre-release alpha — unverified.** This engine is under active development. The public API surface is still shifting (see `docs/changelog.md` for the recent breaking-change cadence — `0.5.0`, `0.6.0`, `0.7.0`), invariants are still being hardened (current sweep: iter-7 of the multi-CLI review chain), and no production deployment has validated the engine end-to-end. Use it for prototyping, AI-agent experiments, and feedback — do **not** depend on it for shipped products yet.
 
diff --git a/docs/api-reference.md b/docs/api-reference.md
index 6a2f81b..f5cd0c1 100644
--- a/docs/api-reference.md
+++ b/docs/api-reference.md
@@ -4984,3 +4984,80 @@ interface ScenarioResultToBundleOptions {
 ```
 
 Translates `runScenario` output to a `SessionBundle` with `sourceKind: 'scenario'`. One `kind: 'assertion'` marker per `result.checks` outcome with `provenance: 'engine'`. `metadata.startTick` from `result.history.initialSnapshot.tick` (NOT hardcoded 0). Throws `BundleIntegrityError(code: 'no_initial_snapshot')` when scenario was configured with `captureInitialSnapshot: false`. Replayable bundle requires `runScenario({ history: { captureCommandPayloads: true } })`; otherwise `bundle.commands` is empty and replay refuses with `BundleIntegrityError(code: 'no_replay_payloads')`.
+
+## Synthetic Playtest — Policies (v0.7.20)
+
+The synthetic playtest harness drives a `World` via pluggable `Policy` functions for `N` ticks, producing a `SessionBundle` for AI-first feedback loops (Tier 1 of `docs/design/ai-first-dev-roadmap.md`). T1 ships the policy types and three built-in factories. The end-to-end harness `runSynthPlaytest` ships in v0.8.0 (T2).
+
+```typescript
+import type { World, ComponentRegistry } from 'civ-engine';
+
+interface PolicyContext<TEventMap, TCommandMap, TComponents = Record<string, unknown>, TState = Record<string, unknown>> {
+  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
+  readonly tick: number;       // The tick about to execute (commands submitted now run during this tick).
+  readonly random: () => number;  // Seeded sub-RNG independent of world.rng. Use this, NOT world.random().
+}
+
+interface StopContext<TEventMap, TCommandMap, TComponents, TState> {
+  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
+  readonly tick: number;       // The tick that just executed (post-step world.tick).
+  readonly random: () => number;
+}
+
+type PolicyCommand<TCommandMap> = {
+  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
+}[keyof TCommandMap & string];
+
+type Policy<TEventMap, TCommandMap, TComponents, TState> = (
+  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
+) => PolicyCommand<TCommandMap>[];
+```
+
+**Determinism contract:** Policies are external coordinators per spec §11.1 clause 2. They MUST be deterministic given their inputs (`world` state, `tick`, `random()`). Any randomness MUST flow through `ctx.random()` — `Math.random()`, `world.random()`, `Date.now()`, `process.env`, and other non-deterministic sources are forbidden. Policies MUST NOT mutate the world directly; mutation goes through the returned `PolicyCommand[]` which the harness submits via `world.submitWithResult`. `SessionReplayer.selfCheck` is the verification mechanism for non-poisoned bundles.
+
+### `noopPolicy()`
+
+```typescript
+function noopPolicy<TEventMap, TCommandMap, TComponents, TState>(): Policy<TEventMap, TCommandMap, TComponents, TState>;
+```
+
+Submits nothing. Useful for letting world systems advance without external input.
+
+### `randomPolicy(config)`
+
+```typescript
+interface RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState> {
+  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap, TComponents, TState>) => PolicyCommand<TCommandMap>>;
+  frequency?: number;  // default 1
+  offset?: number;     // default 0; must be < frequency
+  burst?: number;      // default 1
+}
+
+function randomPolicy<TEventMap, TCommandMap, TComponents, TState>(
+  config: RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>,
+): Policy<TEventMap, TCommandMap, TComponents, TState>;
+```
+
+Picks a random catalog entry per emit via `ctx.random()`. Emits on ticks where `tick % frequency === offset`. `burst` controls commands per fired tick. Catalog functions receive `PolicyContext` so they can reference live world state. Throws `RangeError` for empty catalog, non-positive-integer frequency/burst, or out-of-range offset.
+
+### `scriptedPolicy(sequence)`
+
+```typescript
+type ScriptedPolicyEntry<TCommandMap> = {
+  [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
+}[keyof TCommandMap & string];
+
+function scriptedPolicy<TEventMap, TCommandMap, TComponents, TState>(
+  sequence: ScriptedPolicyEntry<TCommandMap>[],
+): Policy<TEventMap, TCommandMap, TComponents, TState>;
+```
+
+Plays back a pre-recorded list of `{ tick, type, data }` entries. Pre-grouped by tick at construction (O(1) per-tick lookup). Ticks not in the sequence emit nothing. `entry.tick` is matched against `PolicyContext.tick` (the tick about to execute), NOT `world.tick` at submit time. **Bundle → script conversion** (e.g., for regression playback of a recorded bug): bundle `RecordedCommand.submissionTick` is one less than the executing tick, so:
+
+```typescript
+const sequence = bundle.commands.map((cmd) => ({
+  tick: cmd.submissionTick + 1,
+  type: cmd.type,
+  data: cmd.data,
+}));
+```
diff --git a/docs/architecture/decisions.md b/docs/architecture/decisions.md
index cfcf21e..062c34c 100644
--- a/docs/architecture/decisions.md
+++ b/docs/architecture/decisions.md
@@ -20,3 +20,6 @@ Decisions for civ-engine. Never delete an entry; add a newer decision that super
 | 14  | 2026-04-27 | Session bundle is strict JSON; sidecar bytes external (Spec §15 ADR 2) | `SessionBundle` is JSON-stringify lossless for everything in the JSON shape; sidecar attachment bytes live outside (FileSink: `attachments/<id>.<ext>`; MemorySink: parallel internal Map accessed via `source.readSidecar(id)`). Single canonical bundle shape across producers — both `SessionRecorder.toBundle()` and `scenarioResultToBundle()` emit the same shape; replayer accepts either. |
 | 15  | 2026-04-27 | Determinism contract documented but not enforced; `selfCheck` is verification (Spec §15 ADR 3) | Strict-mode enforcement is a behaviorally invasive engine-wide change (audit every mutation method, gate on inside-tick state, escape hatches for setup/deserialize). Conflating it with session recording would make the spec significantly larger and the implementation riskier. Replay self-check (3-stream comparison: state via deepEqualWithPath, events, executions) is the verification mechanism. Strict mode lands as a separate spec when costs and benefits can be evaluated standalone. |
 | 16  | 2026-04-27 | `worldFactory` is part of the determinism contract (Spec §15 ADR 4) | Bundle replay requires reproducing the recording-time component / handler / validator / system registration set, in the same order. None can be serialized into the bundle (functions aren't JSON). The factory is the only mechanism for the replayer to obtain a `World` whose registration matches the recording. Drift produces selfCheck divergences indistinguishable from genuine determinism violations. `World.applySnapshot(snap)` (instance method added in T0 of the implementation) lets the factory register first then load state in-place — `World.deserialize` would conflict because it returns a fresh world with component stores already populated. |
+| 17  | 2026-04-27 | Synthetic Playtest: `Policy` is a function, not a class hierarchy (Spec 3 §15 ADR 1) | `Policy<TEventMap, TCommandMap, TComponents, TState>` is a plain function type. Stateful policies use closures or class methods that satisfy the function type via `() => instance.decide.bind(instance)`. No abstract base class. Functions are simpler, type-friendly, and trivially composable. A class hierarchy would invite premature inheritance ("RandomPolicy extends BasePolicy") that doesn't earn its keep at this scope. The pattern matches existing engine conventions (`System`, `validator`, `handler` are all callable types). |
+| 18  | 2026-04-27 | Synthetic Playtest: policies receive read-only world; mutation is via returned commands (Spec 3 §15 ADR 2) | `PolicyContext.world` is the live `World` (TypeScript can't enforce read-only without a wrapper, which adds runtime overhead). The contract is: policies MUST NOT mutate. Violations are caught by `selfCheck` divergence on the resulting bundle. Forcing policies to go through `submit()` (rather than direct mutation) keeps their effects visible in the bundle's command stream — essential for replay. Wrapping the world in a runtime read-only proxy would catch violations earlier but add per-call overhead; deferred until concrete need. |
+| 19  | 2026-04-27 | Synthetic Playtest: policy randomness uses a separate seeded sub-RNG (Spec 3 §15 ADR 5) | The harness owns a private `DeterministicRandom` instance. `PolicyContext.random()` and `StopContext.random()` are bound to this instance. Policies (including `randomPolicy`) MUST use `ctx.random()`, not `world.random()`, for any randomness. **Literal seed expression:** `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)`. The scaling is required because `seedToUint32`'s `Math.trunc(x) >>> 0` would collapse every `[0, 1)` float to **0**. Rationale: policies calling `world.random()` between ticks would advance `world.rng`; the next snapshot would capture that advance, but `SessionReplayer` doesn't re-invoke policies — its world.rng evolves only via system code, so its snapshot diverges. Sub-RNG eliminates the issue: `ctx.random()` doesn't touch `world.rng`. The single seed-derivation `world.random()` call (when `policySeed` is defaulted) happens BEFORE `recorder.connect()`, so the captured initial snapshot reflects the post-derivation state. |
diff --git a/docs/changelog.md b/docs/changelog.md
index c539e88..9e4443f 100644
--- a/docs/changelog.md
+++ b/docs/changelog.md
@@ -1,5 +1,35 @@
 # Changelog
 
+## 0.7.20 - 2026-04-27
+
+Synthetic Playtest T1: Policy interface + 3 built-in policies (Tier 1 of Spec 3 implementation, `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v10).
+
+### New (additive)
+
+- **Policy types**: `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `RandomPolicyConfig`, `ScriptedPolicyEntry`. 4-generic shape matches `World<TEventMap, TCommandMap, TComponents, TState>`. `TComponents` and `TState` carry `World`-matching defaults; `TEventMap` and `TCommandMap` deliberately have no defaults (empty-record default would collapse `PolicyCommand` to `never`).
+- **`noopPolicy()`**: empty-emit baseline.
+- **`scriptedPolicy(sequence)`**: pre-grouped by tick at construction, O(1) per-tick lookup. `entry.tick` matches `PolicyContext.tick` (about-to-execute tick); bundle→script conversion requires `entry.tick = cmd.submissionTick + 1`.
+- **`randomPolicy(config)`**: deterministic catalog selection via `ctx.random()` (sub-RNG, NOT `world.random()`). Validates non-empty catalog, positive-integer `frequency` and `burst`, non-negative-integer `offset` < `frequency`.
+
+### Determinism contract
+
+Policies use `PolicyContext.random()`, a seeded sub-RNG independent of `world.rng` (ADR 19 in `docs/architecture/decisions.md`). Calling `world.random()` between ticks would advance world RNG state; replay (which doesn't re-invoke policies) would diverge at the next snapshot. Sub-RNG sandboxing eliminates this.
+
+### What's NOT here yet
+
+- The end-to-end harness `runSynthPlaytest` ships in v0.8.0 (T2). Policies are usable in tests with a manually-constructed `PolicyContext` (see `tests/synthetic-policies.test.ts`), but the autonomous-driver harness is the next task.
+- Determinism integration tests (selfCheck round-trip on synthetic bundles, production-determinism dual-run, sub-RNG negative-path, poisoned-bundle replay, bundle→script regression) ship in T3 (v0.8.1).
+
+### ADRs
+
+- ADR 17: Policy is a function, not a class hierarchy.
+- ADR 18: Policies receive read-only world; mutation via returned commands.
+- ADR 19: Policy randomness uses a separate seeded sub-RNG with literal seed expression.
+
+### Validation
+
+All four engine gates pass: `npm test` (772 passed + 2 todo, 13 new in `tests/synthetic-policies.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`. Multi-CLI code review converged.
+
 ## 0.7.19 - 2026-04-27
 
 Session-recording followup 4: additional determinism-contract paired tests for clauses 1, 2, 7.
diff --git a/docs/devlog/detailed/2026-04-26_2026-04-27.md b/docs/devlog/detailed/2026-04-26_2026-04-27.md
index 4ab6a48..a204bf5 100644
--- a/docs/devlog/detailed/2026-04-26_2026-04-27.md
+++ b/docs/devlog/detailed/2026-04-26_2026-04-27.md
@@ -642,3 +642,74 @@ Clauses 4 (impure validators) and 6 (unordered Set iteration) added as `it.todo`
 **Reasoning:** Convergent process-completeness fixes. All correctness-level findings were closed in commits 463476b/b116645/a835aa0. This fix-pass closes the documentation/test-naming gaps the reviewers flagged. No version bump (doc + test-comment only; no behavioral change).
 
 **Result:** 759 tests pass + 2 it.todo (unchanged). Typecheck, lint, build clean. Followups branch ready for merge authorization.
+
+---
+
+## 2026-04-27 — Spec 3 T1: Synthetic Playtest Policies (v0.7.20, c-bump)
+
+**Action:** Implemented the policy-side primitives from `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10, converged after 10 multi-CLI review iterations) per `docs/design/2026-04-27-synthetic-playtest-implementation-plan.md` (v7, converged after 7 multi-CLI plan iterations).
+
+### Surface
+
+- New file `src/synthetic-playtest.ts` (~120 LOC).
+- 6 new types exported: `Policy`, `PolicyContext`, `StopContext`, `PolicyCommand` (discriminated union), `RandomPolicyConfig`, `ScriptedPolicyEntry` (discriminated union).
+- 3 new factories exported: `noopPolicy()`, `randomPolicy(config)`, `scriptedPolicy(sequence)`.
+- `src/index.ts` re-exports.
+
+### Generic shape
+
+All policy types carry the 4-generic `<TEventMap, TCommandMap, TComponents, TState>` shape matching `World<TEventMap, TCommandMap, TComponents, TState>`. `TComponents` and `TState` carry `World`-matching defaults (`Record<string, unknown>`); `TEventMap` and `TCommandMap` deliberately have no defaults — the empty-record default would collapse `PolicyCommand` to `never`, making the policy uncallable for any non-trivial command map. `PolicyCommand<TCommandMap>` and `ScriptedPolicyEntry<TCommandMap>` remain 1-generic (only depend on the command map).
+
+### Sub-RNG (ADR 19)
+
+`PolicyContext.random()` is a seeded sub-RNG bound to a private `DeterministicRandom` instance (constructed by `runSynthPlaytest` in T2). Independent of `world.rng`. Policies MUST use `ctx.random()`, not `world.random()` — calling `world.random()` between ticks would advance world RNG state, but `SessionReplayer` doesn't re-invoke policies, so its world RNG state diverges from the recorded snapshot at the next periodic snapshot.
+
+The literal default seed expression (per design v10 ADR 5): `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)`. The scaling is required because `seedToUint32`'s `Math.trunc(x) >>> 0` would collapse every `[0, 1)` float to `0`. T2 implements the harness side; T1 just exposes the contract via `PolicyContext.random()`.
+
+### `scriptedPolicy` bundle→script conversion
+
+`entry.tick` matches `PolicyContext.tick` (the about-to-execute tick), NOT `submissionTick` (which is `world.tick` at submit time, one less than executing). When deriving a sequence from a recorded bundle for regression playback:
+
+```ts
+const sequence = bundle.commands.map((cmd) => ({
+  tick: cmd.submissionTick + 1,
+  type: cmd.type,
+  data: cmd.data,
+}));
+```
+
+The `+1` conversion is verified end-to-end in T3's regression test (record → convert → replay → assert identical command stream).
+
+### `randomPolicy` validation
+
+Throws `RangeError` for: empty catalog; non-positive-integer `frequency`; non-positive-integer `burst`; `offset` not a non-negative integer < `frequency`. Catalog functions receive `PolicyContext` so they can read live world state (verified by a test reading `ctx.tick`).
+
+### Documentation
+
+- `docs/api-reference.md`: new section `## Synthetic Playtest — Policies (v0.7.20)` with subsections for each type and factory + signatures + 1-2 sentence summaries + bundle→script conversion snippet.
+- `docs/architecture/decisions.md`: 3 new ADRs (17 policy-is-function, 18 read-only-world-mutation-via-commands, 19 sub-RNG with literal seed expression).
+- `docs/changelog.md`: new `## 0.7.20 - 2026-04-27` entry above the existing 0.7.19.
+- `docs/devlog/summary.md`: prepended one line.
+- This detailed entry.
+
+### Code review
+
+Multi-CLI code review on the T1 diff before commit (per AGENTS.md mandatory rule). Codex (gpt-5.4 xhigh) + Opus (claude opus xhigh) reviewed in parallel. Synthesis at `docs/reviews/synthetic-playtest-T1/2026-04-27/<iter>/REVIEW.md`. Iterated to convergence.
+
+### Validation
+
+All four engine gates pass:
+- `npm test` → 772 passed + 2 todo (45 test files), 13 new in `tests/synthetic-policies.test.ts`.
+- `npm run typecheck` → clean.
+- `npm run lint` → clean.
+- `npm run build` → clean.
+
+### Reasoning
+
+T1 lands the foundational types and built-in policies that T2's harness builds on. Splitting T1 from T2 keeps the b-bump (T2's sourceKind union widening) isolated to a single commit. T1 ships under c-bump because it's purely additive — no breaking changes to existing public APIs.
+
+The deliberate omission of TEventMap/TCommandMap defaults was a conscious choice from the design review (Opus iter-4 NIT-3): the empty-record default collapses PolicyCommand to never. TComponents/TState defaults are kept because their `Record<string, unknown>` default matches World's, preserving 2-generic ergonomics for callers who don't care about typed components/state.
+
+### Next
+
+T2 (v0.8.0, b-bump): `runSynthPlaytest` harness + SessionRecorderConfig.sourceKind?+policySeed? + SessionMetadata.sourceKind union widening. Same per-task review pattern.
diff --git a/docs/devlog/summary.md b/docs/devlog/summary.md
index b4e5ea5..fec5ff2 100644
--- a/docs/devlog/summary.md
+++ b/docs/devlog/summary.md
@@ -1,5 +1,6 @@
 # Devlog Summary
 
+- 2026-04-27: Spec 3 T1 (v0.7.20) — Synthetic Playtest Policy interface + 3 built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`). 4-generic shape matches `World<...>`; sub-RNG via `PolicyContext.random()` (ADR 19). `runSynthPlaytest` harness ships in T2 (v0.8.0). 13 new tests; 772 passed + 2 todo.
 - 2026-04-27: Session-recording followup 4 (v0.7.19) — Clause-paired determinism tests for §11.1 clauses 1, 2, 7 (clean+violation each). Clauses 4, 6 added as `it.todo` (hard fixtures). 6/8 testable clauses covered now (was 3/8). 759 tests + 2 todo.
 - 2026-04-27: Session-recording followups 2+3 (v0.7.18) — terminated-state guard on user-facing recorder methods (Opus L2; +1 regression test); World.applySnapshot extracts `_replaceStateFrom` helper for auditability (Opus L4); api-reference T-prefix section headers renamed to feature labels (Opus L3).
 - 2026-04-27: Session-recording followup 1 (v0.7.17) — `SessionReplayer` pre-groups bundle.commands/.ticks/.executions into per-tick maps at construction; O(N·T) → O(1) per-tick lookup in `selfCheck`/`openAt`. Closes iter-2 M1.
diff --git a/package.json b/package.json
index 88844bf..d429eba 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "civ-engine",
-  "version": "0.7.19",
+  "version": "0.7.20",
   "type": "module",
   "main": "./dist/index.js",
   "types": "./dist/index.d.ts",
diff --git a/src/index.ts b/src/index.ts
index f8ffdb4..6a777fc 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -83,3 +83,16 @@ export {
   scenarioResultToBundle,
   type ScenarioResultToBundleOptions,
 } from './session-scenario-bundle.js';
+// Synthetic Playtest — Spec 3 T1 (v0.7.20+): Policy interface + 3 built-in policies.
+// Harness (runSynthPlaytest) ships in T2 (v0.8.0).
+export {
+  type Policy,
+  type PolicyContext,
+  type StopContext,
+  type PolicyCommand,
+  type RandomPolicyConfig,
+  type ScriptedPolicyEntry,
+  noopPolicy,
+  randomPolicy,
+  scriptedPolicy,
+} from './synthetic-playtest.js';
diff --git a/src/synthetic-playtest.ts b/src/synthetic-playtest.ts
new file mode 100644
index 0000000..69bbd59
--- /dev/null
+++ b/src/synthetic-playtest.ts
@@ -0,0 +1,113 @@
+import type { World, ComponentRegistry } from './world.js';
+
+export interface PolicyContext<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> {
+  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
+  readonly tick: number;
+  readonly random: () => number;
+}
+
+export interface StopContext<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> {
+  readonly world: World<TEventMap, TCommandMap, TComponents, TState>;
+  readonly tick: number;
+  readonly random: () => number;
+}
+
+export type PolicyCommand<TCommandMap> = {
+  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
+}[keyof TCommandMap & string];
+
+export type Policy<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> = (
+  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
+) => PolicyCommand<TCommandMap>[];
+
+export function noopPolicy<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+>(): Policy<TEventMap, TCommandMap, TComponents, TState> {
+  return () => [];
+}
+
+export type ScriptedPolicyEntry<TCommandMap> = {
+  [K in keyof TCommandMap & string]: { tick: number; type: K; data: TCommandMap[K] };
+}[keyof TCommandMap & string];
+
+export function scriptedPolicy<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+>(
+  sequence: ScriptedPolicyEntry<TCommandMap>[],
+): Policy<TEventMap, TCommandMap, TComponents, TState> {
+  const byTick = new Map<number, PolicyCommand<TCommandMap>[]>();
+  for (const entry of sequence) {
+    const list = byTick.get(entry.tick);
+    const cmd = { type: entry.type, data: entry.data } as PolicyCommand<TCommandMap>;
+    if (list) list.push(cmd);
+    else byTick.set(entry.tick, [cmd]);
+  }
+  return (ctx) => byTick.get(ctx.tick) ?? [];
+}
+
+export interface RandomPolicyConfig<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> {
+  catalog: Array<(ctx: PolicyContext<TEventMap, TCommandMap, TComponents, TState>) => PolicyCommand<TCommandMap>>;
+  frequency?: number;
+  offset?: number;
+  burst?: number;
+}
+
+export function randomPolicy<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+>(
+  config: RandomPolicyConfig<TEventMap, TCommandMap, TComponents, TState>,
+): Policy<TEventMap, TCommandMap, TComponents, TState> {
+  const { catalog, frequency = 1, offset = 0, burst = 1 } = config;
+  if (catalog.length === 0) {
+    throw new RangeError('randomPolicy.catalog must be non-empty');
+  }
+  if (!Number.isInteger(frequency) || frequency < 1) {
+    throw new RangeError('randomPolicy.frequency must be a positive integer');
+  }
+  if (!Number.isInteger(burst) || burst < 1) {
+    throw new RangeError('randomPolicy.burst must be a positive integer');
+  }
+  if (!Number.isInteger(offset) || offset < 0 || offset >= frequency) {
+    throw new RangeError(
+      `randomPolicy.offset must be a non-negative integer < frequency (got ${offset}, frequency=${frequency})`,
+    );
+  }
+  return (ctx) => {
+    if (ctx.tick % frequency !== offset) return [];
+    const out: PolicyCommand<TCommandMap>[] = [];
+    for (let i = 0; i < burst; i++) {
+      const idx = Math.floor(ctx.random() * catalog.length);
+      out.push(catalog[idx](ctx));
+    }
+    return out;
+  };
+}
diff --git a/src/version.ts b/src/version.ts
index 1cb321b..a82ed22 100644
--- a/src/version.ts
+++ b/src/version.ts
@@ -4,4 +4,4 @@
  * `metadata.engineVersion` in session bundles. Avoids relying on
  * `process.env.npm_package_version` which is only set under `npm run`.
  */
-export const ENGINE_VERSION = '0.7.19' as const;
+export const ENGINE_VERSION = '0.7.20' as const;
diff --git a/tests/synthetic-policies.test.ts b/tests/synthetic-policies.test.ts
new file mode 100644
index 0000000..f00daed
--- /dev/null
+++ b/tests/synthetic-policies.test.ts
@@ -0,0 +1,169 @@
+import { describe, expect, it } from 'vitest';
+import { DeterministicRandom, World, type WorldConfig } from '../src/index.js';
+import {
+  noopPolicy,
+  randomPolicy,
+  scriptedPolicy,
+  type PolicyContext,
+  type RandomPolicyConfig,
+  type ScriptedPolicyEntry,
+} from '../src/synthetic-playtest.js';
+
+const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
+
+interface Cmds { spawn: { id: number } }
+
+const mkPolicyCtx = (tick: number, seed = 42): PolicyContext<Record<string, never>, Cmds> => {
+  const rng = new DeterministicRandom(seed);
+  return { world: new World<Record<string, never>, Cmds>(mkConfig()), tick, random: () => rng.random() };
+};
+
+describe('noopPolicy', () => {
+  it('returns empty array regardless of context', () => {
+    const policy = noopPolicy<Record<string, never>, Cmds>();
+    expect(policy(mkPolicyCtx(1))).toEqual([]);
+    expect(policy(mkPolicyCtx(99))).toEqual([]);
+  });
+});
+
+describe('scriptedPolicy', () => {
+  it('emits the right entry at the right tick', () => {
+    const sequence: ScriptedPolicyEntry<Cmds>[] = [
+      { tick: 1, type: 'spawn', data: { id: 100 } },
+      { tick: 3, type: 'spawn', data: { id: 200 } },
+    ];
+    const policy = scriptedPolicy<Record<string, never>, Cmds>(sequence);
+    expect(policy(mkPolicyCtx(1))).toEqual([{ type: 'spawn', data: { id: 100 } }]);
+    expect(policy(mkPolicyCtx(2))).toEqual([]);
+    expect(policy(mkPolicyCtx(3))).toEqual([{ type: 'spawn', data: { id: 200 } }]);
+    expect(policy(mkPolicyCtx(4))).toEqual([]);
+  });
+
+  it('groups multiple entries on the same tick in declaration order', () => {
+    const sequence: ScriptedPolicyEntry<Cmds>[] = [
+      { tick: 1, type: 'spawn', data: { id: 1 } },
+      { tick: 1, type: 'spawn', data: { id: 2 } },
+      { tick: 1, type: 'spawn', data: { id: 3 } },
+    ];
+    const policy = scriptedPolicy<Record<string, never>, Cmds>(sequence);
+    expect(policy(mkPolicyCtx(1))).toEqual([
+      { type: 'spawn', data: { id: 1 } },
+      { type: 'spawn', data: { id: 2 } },
+      { type: 'spawn', data: { id: 3 } },
+    ]);
+  });
+
+  it('handles empty sequence', () => {
+    const policy = scriptedPolicy<Record<string, never>, Cmds>([]);
+    expect(policy(mkPolicyCtx(1))).toEqual([]);
+  });
+});
+
+describe('randomPolicy', () => {
+  it('seeded selection is deterministic across cross-tick sequences', () => {
+    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
+      catalog: [
+        () => ({ type: 'spawn', data: { id: 1 } }),
+        () => ({ type: 'spawn', data: { id: 2 } }),
+        () => ({ type: 'spawn', data: { id: 3 } }),
+      ],
+    };
+    const runOnce = (seed: number) => {
+      const policy = randomPolicy<Record<string, never>, Cmds>(config);
+      const rng = new DeterministicRandom(seed);
+      const random = () => rng.random();
+      const out: unknown[] = [];
+      for (let t = 1; t <= 5; t++) {
+        out.push(policy({ world: new World<Record<string, never>, Cmds>(mkConfig()), tick: t, random }));
+      }
+      return out;
+    };
+    expect(runOnce(42)).toEqual(runOnce(42));
+    expect(runOnce(42)).not.toEqual(runOnce(99));
+  });
+
+  it('catalog functions receive PolicyContext (can read ctx.world.tick / ctx.tick)', () => {
+    let observedTick = -1;
+    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
+      catalog: [
+        (ctx) => {
+          observedTick = ctx.tick;
+          return { type: 'spawn', data: { id: ctx.tick * 10 } };
+        },
+      ],
+    };
+    const policy = randomPolicy<Record<string, never>, Cmds>(config);
+    const out = policy(mkPolicyCtx(7));
+    expect(observedTick).toBe(7);
+    expect(out).toEqual([{ type: 'spawn', data: { id: 70 } }]);
+  });
+
+  it('respects frequency: emits only on ticks where tick % frequency === offset', () => {
+    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
+      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      frequency: 3,
+      offset: 0,
+    };
+    const policy = randomPolicy<Record<string, never>, Cmds>(config);
+    expect(policy(mkPolicyCtx(0))).toHaveLength(1);
+    expect(policy(mkPolicyCtx(1))).toHaveLength(0);
+    expect(policy(mkPolicyCtx(2))).toHaveLength(0);
+    expect(policy(mkPolicyCtx(3))).toHaveLength(1);
+  });
+
+  it('respects burst: emits N commands per fired tick', () => {
+    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
+      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      burst: 5,
+    };
+    const policy = randomPolicy<Record<string, never>, Cmds>(config);
+    expect(policy(mkPolicyCtx(1))).toHaveLength(5);
+  });
+
+  it('respects offset != 0', () => {
+    const config: RandomPolicyConfig<Record<string, never>, Cmds> = {
+      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      frequency: 3,
+      offset: 2,
+    };
+    const policy = randomPolicy<Record<string, never>, Cmds>(config);
+    expect(policy(mkPolicyCtx(0))).toHaveLength(0);
+    expect(policy(mkPolicyCtx(1))).toHaveLength(0);
+    expect(policy(mkPolicyCtx(2))).toHaveLength(1);
+    expect(policy(mkPolicyCtx(5))).toHaveLength(1);
+  });
+
+  it('rejects empty catalog with RangeError', () => {
+    expect(() => randomPolicy<Record<string, never>, Cmds>({ catalog: [] })).toThrow(RangeError);
+  });
+
+  it('rejects non-positive-integer frequency', () => {
+    expect(() => randomPolicy<Record<string, never>, Cmds>({
+      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      frequency: 0,
+    })).toThrow(RangeError);
+    expect(() => randomPolicy<Record<string, never>, Cmds>({
+      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      frequency: 1.5,
+    })).toThrow(RangeError);
+  });
+
+  it('rejects non-positive-integer burst', () => {
+    expect(() => randomPolicy<Record<string, never>, Cmds>({
+      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      burst: 0,
+    })).toThrow(RangeError);
+  });
+
+  it('rejects negative or out-of-range offset', () => {
+    expect(() => randomPolicy<Record<string, never>, Cmds>({
+      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      offset: -1,
+    })).toThrow(RangeError);
+    expect(() => randomPolicy<Record<string, never>, Cmds>({
+      catalog: [() => ({ type: 'spawn', data: { id: 1 } })],
+      frequency: 3,
+      offset: 3,
+    })).toThrow(RangeError);
+  });
+});
