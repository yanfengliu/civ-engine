diff --git a/README.md b/README.md
index 36335d4..af00d67 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # civ-engine
 
-![version](https://img.shields.io/badge/version-0.7.20-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
+![version](https://img.shields.io/badge/version-0.8.0-blue) ![status](https://img.shields.io/badge/status-pre--release%20alpha-orange)
 
 > ⚠️ **Pre-release alpha — unverified.** This engine is under active development. The public API surface is still shifting (see `docs/changelog.md` for the recent breaking-change cadence — `0.5.0`, `0.6.0`, `0.7.0`), invariants are still being hardened (current sweep: iter-7 of the multi-CLI review chain), and no production deployment has validated the engine end-to-end. Use it for prototyping, AI-agent experiments, and feedback — do **not** depend on it for shipped products yet.
 
@@ -92,6 +92,7 @@ world.step();
 | **State Diffs**             | Per-tick change sets: entities, components, resources, state, tags, and metadata changes                              |
 | **Client Protocol**         | Transport-agnostic typed messages with protocol version markers and structured `commandAccepted`/`commandRejected` plus `commandExecuted`/`commandFailed`/`tickFailed` outcomes |
 | **Session Recording & Replay** | `SessionRecorder` + `SessionReplayer` — capture deterministic, replayable bundles of any World run. `MemorySink` / `FileSink` for in-memory or disk persistence. Marker API for human-authored annotations + engine-emitted assertions (from `scenarioResultToBundle` adapter). `selfCheck` 3-stream comparison verifies determinism. `World.applySnapshot` for in-place state replacement. See `docs/guides/session-recording.md`. |
+| **Synthetic Playtest Harness** | `runSynthPlaytest` drives a `World` via pluggable `Policy` functions for `N` ticks → `SessionBundle`. Built-in policies: `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Sub-RNG sandboxed from `world.rng` via `PolicyContext.random()`. Tier-1 of the AI-first feedback loop; sets up the corpus for future Tier-2 (corpus indexing, behavioral metrics, AI playtester). See `docs/guides/synthetic-playtest.md`. |
 
 ## Architecture
 
@@ -140,6 +141,7 @@ The root package centers on a few primary entry points:
 - `ClientAdapter` and `RenderAdapter` for external clients and render transports
 - `WorldDebugger`, `WorldHistoryRecorder`, and `runScenario()` for AI/debug workflows
 - `SessionRecorder`, `SessionReplayer`, `SessionBundle`, `MemorySink`/`FileSink`, `Marker`, `RecordedCommand`, `scenarioResultToBundle()` for session capture/replay (`docs/guides/session-recording.md`)
+- `runSynthPlaytest`, `noopPolicy`, `randomPolicy`, `scriptedPolicy` for the synthetic playtest harness (Tier-1 of the AI-first feedback loop; `docs/guides/synthetic-playtest.md`)
 - standalone utilities for pathfinding, map generation, occupancy/crowding, visibility, behavior trees, and typed overlay layers (`Layer<T>`)
 
 Use [docs/api-reference.md](docs/api-reference.md) for the authoritative signatures, types, message shapes, and standalone utility docs.
diff --git a/docs/README.md b/docs/README.md
index 25bb4a3..70bc2a1 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -31,6 +31,7 @@ The API reference is the authoritative public surface. The root `README.md` is i
 - [Client Protocol](guides/client-protocol.md)
 - [Debugging](guides/debugging.md)
 - [Session Recording & Replay](guides/session-recording.md)
+- [Synthetic Playtest Harness](guides/synthetic-playtest.md) — Tier-1 autonomous-driver primitive with sub-RNG-isolated policy randomness
 - [Renderer Integration](guides/rendering.md)
 - [RTS Primitives](guides/rts-primitives.md)
 - [Map Generation](guides/map-generation.md)
diff --git a/docs/api-reference.md b/docs/api-reference.md
index f5cd0c1..3b00de9 100644
--- a/docs/api-reference.md
+++ b/docs/api-reference.md
@@ -5061,3 +5061,79 @@ const sequence = bundle.commands.map((cmd) => ({
   data: cmd.data,
 }));
 ```
+
+## Synthetic Playtest — Harness (v0.8.0)
+
+`runSynthPlaytest` drives a `World` via pluggable policies for `N` ticks and produces a `SessionBundle`. T2 of Spec 3.
+
+### `runSynthPlaytest(config)`
+
+```typescript
+function runSynthPlaytest<TEventMap, TCommandMap, TComponents, TState, TDebug = JsonValue>(
+  config: SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState>,
+): SynthPlaytestResult<TEventMap, TCommandMap, TDebug>;
+```
+
+Lifecycle (per spec v10 §7.1):
+1. **Validate** `maxTicks >= 1`, `policySeed` is finite integer.
+2. **Init sub-RNG** from `policySeed` (default: `Math.floor(world.random() * 0x1_0000_0000)`). Happens BEFORE `recorder.connect()` so the initial snapshot captures post-derivation `world.rng` state.
+3. **Attach** `SessionRecorder` with `sourceKind: 'synthetic'` and `terminalSnapshot: true` hardcoded. If `recorder.lastError` is set after `connect()` (sink open failure), re-throw — no coherent bundle to return.
+4. **Tick loop**: per tick, build `policyCtx`, call each policy in array order, submit returned commands via `world.submitWithResult`, call `world.step()`, check `recorder.lastError`, increment `ticksRun`, evaluate `stopWhen` with a fresh `StopContext`. Stop conditions: `maxTicks`, `stopWhen`, `poisoned`, `policyError`, `sinkError` (mid-tick).
+5. **Disconnect** + return `{ bundle, ticksRun, stopReason, ok, policyError? }`.
+
+`ok` is `true` for `'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError'` (bundle is valid up to the failure point); `false` for `'sinkError'`.
+
+### `SynthPlaytestConfig`
+
+```typescript
+interface SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState> {
+  world: World<TEventMap, TCommandMap, TComponents, TState>;
+  policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
+  maxTicks: number;                    // required, >= 1
+  sink?: SessionSink & SessionSource;  // default: new MemorySink()
+  sourceLabel?: string;                 // default: 'synthetic'
+  policySeed?: number;                  // default: derived from world.random() at construction
+  stopWhen?: (ctx: StopContext<...>) => boolean;
+  snapshotInterval?: number | null;    // default 1000; null disables periodic snapshots
+}
+```
+
+`terminalSnapshot` is intentionally NOT exposed — the harness always passes `terminalSnapshot: true` to `SessionRecorder` so every bundle has the `(initial, terminal)` segment for `selfCheck`.
+
+### `SynthPlaytestResult`
+
+```typescript
+interface SynthPlaytestResult<TEventMap, TCommandMap, TDebug = JsonValue> {
+  bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
+  ticksRun: number;
+  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError';
+  ok: boolean;
+  policyError?: { policyIndex: number; tick: number; error: { name; message; stack } };
+}
+```
+
+`ticksRun` = count of `world.step()` invocations that completed AND were followed by a clean `recorder.lastError` check. With `K = world.tick - startTick`:
+
+| stopReason | ticksRun |
+|---|---|
+| `'maxTicks'`, `'stopWhen'`, `'policyError'` | `K` |
+| `'poisoned'`, `'sinkError'` (mid-tick) | `K - 1` |
+
+`policyError` is populated only when `stopReason === 'policyError'`. `bundle.failures` is NOT modified for policy throws — `failedTicks` is reserved for world-level tick failures.
+
+### Determinism — CI guard pattern
+
+`SessionReplayer.selfCheck()` is meaningful for non-poisoned synthetic bundles where `ticksRun >= 1`. For `stopReason === 'poisoned'` bundles, `selfCheck()` re-throws the original tick failure (the failed-tick-bounded final segment is replayed). For `ticksRun === 0`, the terminal snapshot equals the initial → `selfCheck()` returns `ok:true` vacuously.
+
+```typescript
+if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
+  expect(replayer.selfCheck().ok).toBe(true);
+}
+```
+
+### Updated existing surface
+
+- `SessionMetadata.sourceKind` widened to `'session' | 'scenario' | 'synthetic'`. **Breaking** for downstream `assertNever` exhaustive switches (b-bump in 0.8.0).
+- `SessionMetadata.policySeed?: number` added. Populated when `sourceKind === 'synthetic'`.
+- `SessionRecorderConfig.sourceKind?: 'session' | 'scenario' | 'synthetic'` added (default `'session'`).
+- `SessionRecorderConfig.policySeed?: number` added.
diff --git a/docs/architecture/decisions.md b/docs/architecture/decisions.md
index 0233bdf..32340ed 100644
--- a/docs/architecture/decisions.md
+++ b/docs/architecture/decisions.md
@@ -23,3 +23,7 @@ Decisions for civ-engine. Never delete an entry; add a newer decision that super
 | 17  | 2026-04-27 | Synthetic Playtest: `Policy` is a function, not a class hierarchy (Spec 3 §15 ADR 1) | `Policy<TEventMap, TCommandMap, TComponents, TState>` is a plain function type. Stateful policies use closures or class methods that satisfy the function type via `instance.decide.bind(instance)` (or an equivalent closure capturing instance state). No abstract base class. Functions are simpler, type-friendly, and trivially composable. A class hierarchy would invite premature inheritance ("RandomPolicy extends BasePolicy") that doesn't earn its keep at this scope. The pattern matches existing engine conventions (`System`, `validator`, `handler` are all callable types). |
 | 18  | 2026-04-27 | Synthetic Playtest: policies receive read-only world; mutation is via returned commands (Spec 3 §15 ADR 2) | `PolicyContext.world` is the live `World` (TypeScript can't enforce read-only without a wrapper, which adds runtime overhead). The contract is: policies MUST NOT mutate. Violations are caught by `selfCheck` divergence on the resulting bundle. Forcing policies to go through `submit()` (rather than direct mutation) keeps their effects visible in the bundle's command stream — essential for replay. Wrapping the world in a runtime read-only proxy would catch violations earlier but add per-call overhead; deferred until concrete need. |
 | 19  | 2026-04-27 | Synthetic Playtest: policy randomness uses a separate seeded sub-RNG (Spec 3 §15 ADR 5) | The harness owns a private `DeterministicRandom` instance. `PolicyContext.random()` and `StopContext.random()` are bound to this instance. Policies (including `randomPolicy`) MUST use `ctx.random()`, not `world.random()`, for any randomness. **Literal seed expression:** `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)`. The scaling is required because `seedToUint32`'s `Math.trunc(x) >>> 0` would collapse every `[0, 1)` float to **0**. Rationale: policies calling `world.random()` between ticks would advance `world.rng`; the next snapshot would capture that advance, but `SessionReplayer` doesn't re-invoke policies — its world.rng evolves only via system code, so its snapshot diverges. Sub-RNG eliminates the issue: `ctx.random()` doesn't touch `world.rng`. The single seed-derivation `world.random()` call (when `policySeed` is defaulted) happens BEFORE `recorder.connect()`, so the captured initial snapshot reflects the post-derivation state. |
+| 20  | 2026-04-27 | Synthetic Playtest: `SessionMetadata.sourceKind` extended, lands as a b-bump (Spec 3 §15 ADR 3) | Extend the union from `'session' \| 'scenario'` to `'session' \| 'scenario' \| 'synthetic'`. Bumps `b` per AGENTS.md compile-breaking rule. Bundle consumers (replayer, future viewer, future corpus index) need to distinguish synthetic from organic recordings. Engine-internal consumers don't branch on this field (verified — only producers exist), so engine builds are unaffected. Downstream `assertNever` exhaustive switches will fail to compile until they add `case 'synthetic':` — expected break for strict-mode TS consumers. |
+| 20a | 2026-04-27 | Synthetic Playtest: `sourceKind` is set at `SessionRecorder` construction, not via post-hoc sink mutation (Spec 3 §15 ADR 3a) | `SessionRecorderConfig` gains optional `sourceKind?` (default `'session'`). `SessionRecorder.connect()` reads it into `initialMetadata`. The harness passes `sourceKind: 'synthetic'`; never mutates sink metadata. Iter-1 plan had post-hoc `sink.metadata.sourceKind` mutation — unsound for FileSink (manifest.json was already flushed with `'session'`) and for custom sinks that snapshot metadata during `open()`. The new field is type-additive; existing callers see no change. |
+| 21  | 2026-04-27 | Synthetic Playtest: harness is synchronous and single-process (Spec 3 §15 ADR 4) | `runSynthPlaytest` is a synchronous function that runs to completion or returns early. No async / streaming / cross-process orchestration in v1. Synchronous matches the engine's existing tick model and the session-recording subsystem's sink contract. Async policies (LLM-driven) are deferred to Spec 9 (AI Playtester); cross-process orchestration is a CI-script concern, not an engine API. |
+| 22  | 2026-04-27 | Synthetic Playtest: composed policies do NOT observe each other within a tick (Spec 3 §15 ADR 6) | When multiple policies share a tick, they receive the same `PolicyContext.world` reference. The harness submits each policy's commands in array order, but no public surface exposes earlier-policy submissions to later policies during the same tick (`World.commandQueue` is private; `ARCHITECTURE.md` forbids direct queue access; `world.getEvents()` returns the previous tick's events; handlers don't fire until `world.step()`). The `RecordedCommand.sequence` ordering on the resulting bundle's `commands[]` matches policy-array order — externally observable. Within a tick, policies are computational siblings, not a pipeline. If batch semantics are genuinely needed, wrap dependent policies in a single composite policy that does the merge internally. |
diff --git a/docs/changelog.md b/docs/changelog.md
index 9e4443f..10024c2 100644
--- a/docs/changelog.md
+++ b/docs/changelog.md
@@ -1,5 +1,49 @@
 # Changelog
 
+## 0.8.0 - 2026-04-27 — BREAKING (b-bump)
+
+Synthetic Playtest T2: `runSynthPlaytest` harness + b-bump-axis `SessionMetadata.sourceKind` union widening.
+
+### Breaking change
+
+`SessionMetadata.sourceKind` widened from `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'`. Downstream consumers using `assertNever`-style exhaustive switches over `sourceKind` will fail to compile until they add a `case 'synthetic':` branch. This is the only breaking change in 0.8.0; engine-internal code is unaffected (verified — no engine consumers branch on `sourceKind` exhaustively).
+
+### New (additive)
+
+- **`runSynthPlaytest(config)`**: synchronous Tier-1 synthetic playtest harness. Drives a `World` via pluggable `Policy` functions for N ticks → SessionBundle. Stop conditions: `maxTicks`, `stopWhen`, built-in poison stop, policy throw, sink failure. Sub-RNG init via `Math.floor(world.random() * 0x1_0000_0000)` BEFORE `recorder.connect()` so initial snapshot reflects post-derivation `world.rng` state. `terminalSnapshot:true` hardcoded for non-vacuous selfCheck guarantee.
+- **`SynthPlaytestConfig`** + **`SynthPlaytestResult`** types.
+- **`SessionRecorderConfig.sourceKind?`** + **`SessionRecorderConfig.policySeed?`** (additive optional fields).
+- **`SessionMetadata.policySeed?`** field (populated when `sourceKind === 'synthetic'`).
+
+### Determinism guarantees
+
+- **Production-determinism:** same `policySeed` + same setup → structurally identical bundles modulo `metadata.sessionId`, `metadata.recordedAt`, and `WorldMetrics.durationMs`.
+- **Replay-determinism:** non-poisoned synthetic bundles with `ticksRun >= 1` pass `SessionReplayer.selfCheck()`.
+- **Sub-RNG isolation:** `PolicyContext.random()` is independent of `world.rng`; replay reproduces world RNG state because policies don't perturb it.
+
+### Failure mode taxonomy
+
+| `stopReason` | Bundle returned? | `ok` |
+|---|---|---|
+| `'maxTicks'`, `'stopWhen'`, `'poisoned'`, `'policyError'` | yes | `true` |
+| `'sinkError'` (mid-tick) | yes (incomplete) | `false` |
+| Connect-time sink failure | NO — `recorder.lastError` re-thrown | n/a |
+
+### ADRs
+
+- ADR 20: SessionMetadata.sourceKind extended, lands as b-bump.
+- ADR 20a: `sourceKind` set at SessionRecorder construction (no post-hoc sink mutation).
+- ADR 21: Harness is synchronous and single-process.
+- ADR 22: Composed policies do NOT observe each other within a tick.
+
+### Migration
+
+Downstream `assertNever(sourceKind)` consumers add `case 'synthetic':` next to existing branches. No engine changes required.
+
+### Validation
+
+All four engine gates pass: `npm test` (789 + 2 todo, 17 new in `tests/synthetic-playtest.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`. Multi-CLI code review converged.
+
 ## 0.7.20 - 2026-04-27
 
 Synthetic Playtest T1: Policy interface + 3 built-in policies (Tier 1 of Spec 3 implementation, `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v10).
diff --git a/docs/devlog/detailed/2026-04-26_2026-04-27.md b/docs/devlog/detailed/2026-04-26_2026-04-27.md
index a204bf5..47f1d4f 100644
--- a/docs/devlog/detailed/2026-04-26_2026-04-27.md
+++ b/docs/devlog/detailed/2026-04-26_2026-04-27.md
@@ -713,3 +713,75 @@ The deliberate omission of TEventMap/TCommandMap defaults was a conscious choice
 ### Next
 
 T2 (v0.8.0, b-bump): `runSynthPlaytest` harness + SessionRecorderConfig.sourceKind?+policySeed? + SessionMetadata.sourceKind union widening. Same per-task review pattern.
+
+---
+
+## 2026-04-27 — Spec 3 T2: runSynthPlaytest harness + b-bump (v0.8.0)
+
+**Action:** Implemented the synchronous synthetic playtest harness from `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v10 §7 per `docs/design/2026-04-27-synthetic-playtest-implementation-plan.md` v7 §T2.
+
+### Surface
+
+- `src/synthetic-playtest.ts` extended (~140 LOC added): `SynthPlaytestConfig`, `SynthPlaytestResult`, `runSynthPlaytest`.
+- `src/session-bundle.ts`: `SessionMetadata.sourceKind` union widened to `'session' | 'scenario' | 'synthetic'` (b-bump per ADR 20). `SessionMetadata.policySeed?: number` added.
+- `src/session-recorder.ts`: `SessionRecorderConfig.sourceKind?` + `SessionRecorderConfig.policySeed?` added (additive). Constructor reads them; `connect()` writes them into `initialMetadata`.
+- `src/index.ts`: re-exports `runSynthPlaytest`, `SynthPlaytestConfig`, `SynthPlaytestResult`.
+
+### Lifecycle (per design v10 §7.1)
+
+1. Validate `maxTicks >= 1`, `policySeed` finite integer.
+2. Init sub-RNG: `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)`. ADR 19's literal expression — required because `seedToUint32`'s `Math.trunc(x)>>>0` collapses `[0,1)` to `0`. The `world.random()` call happens BEFORE `recorder.connect()` so the initial snapshot captures post-derivation `world.rng` state (replay reproduces trivially).
+3. Construct `SessionRecorder` with `sourceKind: 'synthetic'`, `terminalSnapshot: true` (hardcoded — no opt-out), `policySeed`. Call `connect()`. Check `recorder.lastError` immediately: if set, re-throw (no coherent bundle to return — see §7.2 connect-time failure path).
+4. Tick loop: build `policyCtx = { world, tick: world.tick + 1, random }`. For each policy in `policies`: invoke (catch throws → `policyError`), submit returned commands via `world.submitWithResult`. Call `world.step()` (catch poisons → `stopReason: 'poisoned'`). Check `recorder.lastError` post-step (mid-tick sink failure → `stopReason: 'sinkError'`). Increment `ticksRun`. Build fresh `StopContext` with post-step `world.tick`; check `stopWhen`.
+5. Disconnect (best-effort try/catch). Compute `ok = stopReason !== 'sinkError' && recorder.lastError === null` (catches disconnect-time sink failures too). Return `{ bundle, ticksRun, stopReason, ok, policyError }`.
+
+### Critical implementation details
+
+**`snapshotInterval` null preservation:** Used `'snapshotInterval' in config && config.snapshotInterval !== undefined` rather than `config.snapshotInterval ?? 1000` because nullish-coalescing would coerce explicit `null` (which disables periodic snapshots) into `1000`.
+
+**3-generic SessionRecorder cast:** The harness types are 4-generic (`<TEventMap, TCommandMap, TComponents, TState>`) but `SessionRecorder` is 3-generic (no TComponents/TState — recorder doesn't access component-shape-typed methods). Cast via `world as unknown as World<TEventMap, TCommandMap>` — structurally safe.
+
+**`terminalSnapshot:true` hardcoded:** Synthetic bundles need at least the (initial, terminal) segment for `selfCheck` to be non-vacuous. Removing the option from `SynthPlaytestConfig` eliminates the entire vacuous-segment failure mode (per design v10 §7.1, the harness rejects config combinations like `snapshotInterval==null && !terminalSnapshot`; we go further and don't expose the flag at all).
+
+### Test coverage
+
+`tests/synthetic-playtest.test.ts` (~17 tests):
+- **Config validation:** maxTicks <= 0, non-integer maxTicks, NaN policySeed, non-integer policySeed all throw RangeError.
+- **Lifecycle:** maxTicks-stop returns synthetic bundle with policySeed; explicit policySeed/sourceLabel propagate; scriptedPolicy commands recorded with correct submissionTick (one less than executing); explicit sink threading.
+- **Stop reasons:** stopWhen post-step; poisoned with failedTicks populated; policyError with populated policyError field; pre-step policyError → ticksRun=0.
+- **Failure modes:** poisoned-world-at-start propagates RecorderClosedError.
+- **Composition:** two policies same tick → bundle.commands[].sequence monotonic in array order; composed-partial-submit (earlier commands recorded, no executions for failed tick).
+- **Production-determinism:** same policySeed → deep-equal bundles modulo sessionId/recordedAt and WorldMetrics.durationMs (stripped via map(stripTickMetrics)).
+
+### Documentation
+
+- `docs/api-reference.md`: new `## Synthetic Playtest — Harness (v0.8.0)` section with runSynthPlaytest signature + lifecycle + per-stop-reason ticksRun table + CI guard pattern + breaking-change note for sourceKind.
+- `docs/guides/synthetic-playtest.md` (new, ~250 lines): quickstart example, policy authoring guide (incl. stateful policies via `instance.decide.bind(instance)` per ADR 17), built-in policy reference, bundle→script conversion with `+1` formula, determinism contract (production + replay), failure mode taxonomy, full CI pattern.
+- `docs/architecture/decisions.md`: ADRs 20, 20a, 21, 22 (sourceKind extension b-bump; set at construction not post-hoc; sync single-process; composition without observation).
+- `docs/README.md`: index entry for the new guide.
+- `README.md`: Feature Overview row + Public Surface bullet + version badge bump.
+- `docs/changelog.md`: 0.8.0 BREAKING entry above 0.7.20.
+- `docs/devlog/summary.md`: prepended one line.
+- This detailed entry.
+
+### Code review
+
+Multi-CLI code review on T2 diff before commit (per AGENTS.md). Codex (gpt-5.4 xhigh) + Opus (claude opus xhigh) reviewed in parallel. Synthesis at `docs/reviews/synthetic-playtest-T2/2026-04-27/<iter>/REVIEW.md`. Iterated to convergence.
+
+### Validation
+
+All four engine gates pass:
+- `npm test` → 789 passed + 2 todo (46 test files), 17 new in `tests/synthetic-playtest.test.ts`.
+- `npm run typecheck` → clean.
+- `npm run lint` → clean (after dropping unused `TDebug`/`TComponents`/`TState` generics from result type that weren't used in any field; restructured generics to be minimal).
+- `npm run build` → clean.
+
+### Reasoning
+
+T2 is the b-bump that ships the harness end-to-end. The b-bump axis is the SessionMetadata.sourceKind union widening (per AGENTS.md compile-breaking rule); the rest of T2 is additive on top. By landing the b-bump cleanly in T2 (not T1's purely-additive c-bump), downstream consumers see a single coordinated breaking change rather than a fragmented sequence.
+
+Sub-RNG sandboxing eliminates the determinism failure mode where policies calling `world.random()` between ticks would advance world RNG state, leaving replay (which doesn't re-invoke policies) diverged at the next snapshot. The literal seed-derivation expression is preserved verbatim from ADR 19 across all sites — a precision regression Codex caught at design iter-2 BLOCKER.
+
+### Next
+
+T3 (v0.8.1, c-bump): cross-cutting determinism integration tests (selfCheck round-trip on non-poisoned synthetic bundles, production-determinism dual-run, sub-RNG positive/negative isolation, poisoned-bundle replay throws, pre-step abort vacuous selfCheck, bundle→script conversion regression) + structural docs (ARCHITECTURE.md Component Map, drift-log entry, ai-first-dev-roadmap status update, ai-integration.md Tier-1 reference).
diff --git a/docs/devlog/summary.md b/docs/devlog/summary.md
index fec5ff2..bd31536 100644
--- a/docs/devlog/summary.md
+++ b/docs/devlog/summary.md
@@ -1,5 +1,6 @@
 # Devlog Summary
 
+- 2026-04-27: Spec 3 T2 (v0.8.0, **b-bump**) — `runSynthPlaytest` harness + SessionMetadata.sourceKind union widened to add 'synthetic' (breaking for assertNever consumers, per ADR 20). Sub-RNG init via `Math.floor(world.random() * 0x1_0000_0000)` pre-connect; `terminalSnapshot:true` hardcoded; 5-value stopReason union with separate connect-time-failure (re-throw) and mid-tick-failure ('sinkError') paths. ADRs 20, 20a, 21, 22. 17 new harness tests; 789 passed + 2 todo.
 - 2026-04-27: Spec 3 T1 (v0.7.20) — Synthetic Playtest Policy interface + 3 built-in policies (`noopPolicy`, `randomPolicy`, `scriptedPolicy`). 4-generic shape matches `World<...>`; sub-RNG via `PolicyContext.random()` (ADR 19). `runSynthPlaytest` harness ships in T2 (v0.8.0). 13 new tests; 772 passed + 2 todo.
 - 2026-04-27: Session-recording followup 4 (v0.7.19) — Clause-paired determinism tests for §11.1 clauses 1, 2, 7 (clean+violation each). Clauses 4, 6 added as `it.todo` (hard fixtures). 6/8 testable clauses covered now (was 3/8). 759 tests + 2 todo.
 - 2026-04-27: Session-recording followups 2+3 (v0.7.18) — terminated-state guard on user-facing recorder methods (Opus L2; +1 regression test); World.applySnapshot extracts `_replaceStateFrom` helper for auditability (Opus L4); api-reference T-prefix section headers renamed to feature labels (Opus L3).
diff --git a/docs/guides/session-recording.md b/docs/guides/session-recording.md
index 07450cb..9d66749 100644
--- a/docs/guides/session-recording.md
+++ b/docs/guides/session-recording.md
@@ -179,6 +179,14 @@ const bundle = scenarioResultToBundle(result);
 
 Without `captureCommandPayloads: true`, the bundle is diagnostic-only — `openAt(tick > startTick)` throws `BundleIntegrityError(code: 'no_replay_payloads')` and `selfCheck` returns `ok: true, checkedSegments: 0`.
 
+## Synthetic-source bundles
+
+In v0.8.0, `SessionMetadata.sourceKind` widened to `'session' | 'scenario' | 'synthetic'` to distinguish bundles produced by the synthetic playtest harness (`runSynthPlaytest`). Synthetic bundles carry `metadata.sourceKind: 'synthetic'` plus an optional `metadata.policySeed: number` (the seed used for the harness's policy sub-RNG, preserved for future replay-via-policy work).
+
+Replay treats synthetic bundles like organic recordings: `SessionReplayer.fromBundle` accepts them, `selfCheck()` validates them (modulo the poisoned-bundle caveat — `selfCheck` re-throws on `stopReason === 'poisoned'` synthetic bundles because the failed-tick-bounded final segment isn't skipped). See `docs/guides/synthetic-playtest.md` for the harness API and CI patterns.
+
+`SessionRecorderConfig` now accepts optional `sourceKind?` and `policySeed?` fields; the synthetic playtest harness uses these to set the metadata at recorder construction time (no post-hoc sink mutation — see ADR 20a). For non-harness consumers, the defaults preserve the existing `sourceKind: 'session'` behavior.
+
 ## Limitations (v1)
 
 - **Single payload-capturing recorder per world.** A `SessionRecorder` and a `WorldHistoryRecorder({ captureCommandPayloads: true })` cannot both attach to the same world. Default-config `WorldHistoryRecorder` (no payload capture) is unrestricted.
diff --git a/docs/guides/synthetic-playtest.md b/docs/guides/synthetic-playtest.md
new file mode 100644
index 0000000..8bfedc7
--- /dev/null
+++ b/docs/guides/synthetic-playtest.md
@@ -0,0 +1,210 @@
+# Synthetic Playtest Harness
+
+The synthetic playtest harness is a Tier-1 primitive of the AI-first feedback loop (Spec 3 of `docs/design/ai-first-dev-roadmap.md`). It drives a `World` autonomously via pluggable `Policy` functions for `N` ticks and produces a replayable `SessionBundle`.
+
+## Quickstart
+
+```typescript
+import {
+  World, runSynthPlaytest, randomPolicy, SessionReplayer,
+  type WorldConfig,
+} from 'civ-engine';
+
+const config: WorldConfig = { gridWidth: 32, gridHeight: 32, tps: 60, positionKey: 'position' };
+
+interface Cmds { spawn: { x: number; y: number } }
+
+const setup = () => {
+  const w = new World<Record<string, never>, Cmds>(config);
+  w.registerHandler('spawn', (data, world) => {
+    const id = world.createEntity();
+    world.setComponent(id, 'position', { x: data.x, y: data.y });
+  });
+  w.registerComponent('position');
+  return w;
+};
+
+const result = runSynthPlaytest({
+  world: setup(),
+  policies: [
+    randomPolicy<Record<string, never>, Cmds>({
+      catalog: [
+        (ctx) => ({
+          type: 'spawn',
+          data: {
+            x: Math.floor(ctx.random() * 32),
+            y: Math.floor(ctx.random() * 32),
+          },
+        }),
+      ],
+      frequency: 5,
+    }),
+  ],
+  maxTicks: 1000,
+  policySeed: 42,
+});
+
+console.log(`Stopped: ${result.stopReason} after ${result.ticksRun} ticks`);
+console.log(`Bundle has ${result.bundle.commands.length} recorded commands.`);
+
+// Verify replay-determinism (only meaningful for non-poisoned bundles with ticksRun >= 1).
+if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
+  const replayer = SessionReplayer.fromBundle(result.bundle, {
+    worldFactory: (snap) => {
+      const w = setup();
+      w.applySnapshot(snap);
+      return w;
+    },
+  });
+  console.log('selfCheck:', replayer.selfCheck().ok);
+}
+```
+
+## Policy Authoring
+
+A `Policy` is a function from `PolicyContext` to an array of `PolicyCommand`s:
+
+```typescript
+type Policy<TEventMap, TCommandMap, TComponents, TState> = (
+  context: PolicyContext<TEventMap, TCommandMap, TComponents, TState>,
+) => PolicyCommand<TCommandMap>[];
+```
+
+`PolicyContext` exposes:
+- `world` — read-only view of the current world.
+- `tick` — the tick that's about to execute.
+- `random` — seeded sub-RNG independent of `world.rng`. **Use this for any randomness; do NOT call `Math.random()`, `world.random()`, `Date.now()`, or other non-deterministic sources.**
+
+### Writing a custom policy
+
+```typescript
+function migrateUnitsPolicy(): Policy<Record<string, never>, Cmds> {
+  return (ctx) => {
+    // Read live world state.
+    const units = [...ctx.world.query('unit')];
+
+    // Use ctx.random for any randomness (NOT world.random).
+    const targets = units.map((id) => ({
+      id,
+      to: { x: Math.floor(ctx.random() * 32), y: Math.floor(ctx.random() * 32) },
+    }));
+
+    // Return commands; the harness submits them via world.submitWithResult.
+    return targets.map((t) => ({ type: 'move', data: t }));
+  };
+}
+```
+
+### Stateful policies
+
+A policy can carry state across calls via a closure or class method:
+
+```typescript
+function memoryPolicy(): Policy<Record<string, never>, Cmds> {
+  const seen = new Set<number>();
+  return (ctx) => {
+    const newOnes = [...ctx.world.query('unit')].filter((id) => !seen.has(id));
+    for (const id of newOnes) seen.add(id);
+    return newOnes.map((id) => ({ type: 'spawn', data: { parent: id } }));
+  };
+}
+```
+
+Class-based form (per ADR 17): `instance.decide.bind(instance)` produces a `Policy` from a method.
+
+State must remain JSON-clean and seeded from `ctx.random()`. The harness's sub-RNG is shared by all composed policies on a tick — they consume from the same stream, so call counts matter for determinism.
+
+## Built-in Policies
+
+### `noopPolicy()`
+
+Submits nothing. Useful for letting world systems advance without external input (e.g., simulating AI behaviors that respond to world state without driver-injected stimulus).
+
+### `randomPolicy({ catalog, frequency, offset, burst })`
+
+Picks a random catalog entry per emit. `frequency` controls how often (every N ticks). `offset` shifts the firing pattern. `burst` controls commands per fired tick. Catalog entries receive the live `PolicyContext` so they can read world state when constructing their command. Throws `RangeError` on empty catalog or out-of-range parameters.
+
+### `scriptedPolicy(sequence)`
+
+Plays back a pre-recorded list of `{ tick, type, data }` entries. Useful for regression playback of bug bundles. Pre-grouped by tick at construction (O(1) per-tick lookup).
+
+### Bundle → Script Conversion
+
+To replay a recorded bundle's commands via `scriptedPolicy`:
+
+```typescript
+const sequence = bundle.commands.map((cmd) => ({
+  tick: cmd.submissionTick + 1,  // submissionTick is one less than executing tick
+  type: cmd.type,
+  data: cmd.data,
+}));
+const policy = scriptedPolicy(sequence);
+```
+
+The `+1` is required because `RecordedCommand.submissionTick` is `world.tick` at submit time, while `ScriptedPolicyEntry.tick` is matched against `PolicyContext.tick` (the about-to-execute tick).
+
+## Determinism
+
+The harness is deterministic given identical inputs:
+- Same world setup (components, handlers, validators, systems registered in the same order).
+- Same policies (functions or class instances).
+- Same `maxTicks`, `stopWhen`, `policySeed`, `snapshotInterval`.
+- Identical engine and Node versions (per spec §11.1 clause 9).
+
+### Replay-determinism
+
+Non-poisoned synthetic bundles with `ticksRun >= 1` round-trip cleanly through `SessionReplayer.selfCheck()`. The sub-RNG sandboxes policy randomness from `world.rng`, so replay (which doesn't re-invoke policies) reproduces world state exactly.
+
+### Production-determinism
+
+Two harness runs with identical config (notably `policySeed`) produce structurally-equal bundles modulo `metadata.sessionId`, `metadata.recordedAt`, and `WorldMetrics.durationMs` (which is `performance.now()`-backed and varies between runs). Use the strip-volatile pattern when comparing:
+
+```typescript
+const strip = (m: SessionMetadata) => {
+  const copy = { ...m };
+  delete (copy as Partial<typeof copy>).sessionId;
+  delete (copy as Partial<typeof copy>).recordedAt;
+  return copy;
+};
+expect(strip(r1.bundle.metadata)).toEqual(strip(r2.bundle.metadata));
+```
+
+## Failure Modes
+
+| `stopReason` | Cause | `ok` | Bundle returned? |
+|---|---|---|---|
+| `'maxTicks'` | Loop completed N steps. | `true` | yes |
+| `'stopWhen'` | Predicate fired post-step. | `true` | yes |
+| `'poisoned'` | `world.step()` threw (poisoned mid-tick). | `true` | yes (with `failedTicks` populated) |
+| `'policyError'` | Policy threw before `step()`. | `true` | yes (with `policyError` field populated; `bundle.failures` unchanged) |
+| `'sinkError'` | Mid-tick recorder write failure. | `false` | yes (incomplete) |
+
+**Connect-time sink failure** (e.g., disk-full when writing initial manifest) propagates the error from `recorder.lastError` directly — no bundle returned, similar to `world-poisoned-at-start` propagation.
+
+**Composed-policy partial submit:** when `policies[i]` throws after `policies[0..i-1]` returned commands, the harness has already submitted those earlier commands. They appear in `bundle.commands` for the failed tick without matching executions. `selfCheck` doesn't replay across the abort point, so the orphan is benign; `result.policyError` is the authoritative diagnostic.
+
+## CI Pattern
+
+```typescript
+import { runSynthPlaytest, SessionReplayer } from 'civ-engine';
+
+const result = runSynthPlaytest({ world: setup(), policies: [/* ... */], maxTicks: 1000 });
+
+// Bundle is always returned (except for connect-time sink failure).
+expect(result.bundle).toBeDefined();
+
+// selfCheck guard: only valid for non-poisoned bundles with at least one successful step.
+if (result.ok && result.stopReason !== 'poisoned' && result.ticksRun >= 1) {
+  const replayer = SessionReplayer.fromBundle(result.bundle, {
+    worldFactory: (snap) => { const w = setup(); w.applySnapshot(snap); return w; },
+  });
+  expect(replayer.selfCheck().ok).toBe(true);
+}
+```
+
+## See also
+
+- `docs/architecture/decisions.md` ADRs 17-22 for the design trade-offs.
+- `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (v10) for the full spec.
+- `docs/design/ai-first-dev-roadmap.md` for how Spec 3 fits into the broader roadmap.
+- `docs/guides/session-recording.md` for the underlying SessionRecorder/SessionReplayer machinery.
diff --git a/package.json b/package.json
index d429eba..03e1b93 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "civ-engine",
-  "version": "0.7.20",
+  "version": "0.8.0",
   "type": "module",
   "main": "./dist/index.js",
   "types": "./dist/index.d.ts",
diff --git a/src/index.ts b/src/index.ts
index 6a777fc..feaef9d 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -83,8 +83,7 @@ export {
   scenarioResultToBundle,
   type ScenarioResultToBundleOptions,
 } from './session-scenario-bundle.js';
-// Synthetic Playtest — Spec 3 T1 (v0.7.20+): Policy interface + 3 built-in policies.
-// Harness (runSynthPlaytest) ships in T2 (v0.8.0).
+// Synthetic Playtest — Spec 3 T1+T2 (v0.7.20+): Policy types, 3 built-in policies, runSynthPlaytest harness.
 export {
   type Policy,
   type PolicyContext,
@@ -92,7 +91,10 @@ export {
   type PolicyCommand,
   type RandomPolicyConfig,
   type ScriptedPolicyEntry,
+  type SynthPlaytestConfig,
+  type SynthPlaytestResult,
   noopPolicy,
   randomPolicy,
   scriptedPolicy,
+  runSynthPlaytest,
 } from './synthetic-playtest.js';
diff --git a/src/session-bundle.ts b/src/session-bundle.ts
index 64eb09a..8b14a57 100644
--- a/src/session-bundle.ts
+++ b/src/session-bundle.ts
@@ -89,10 +89,21 @@ export interface SessionMetadata {
   endTick: number;
   persistedEndTick: number;
   durationTicks: number;
-  sourceKind: 'session' | 'scenario';
+  /**
+   * 'synthetic' added in v0.8.0 (Spec 3 T2). Widening from 'session' | 'scenario'
+   * is a breaking change for downstream `assertNever`-style exhaustive switches;
+   * b-bump per AGENTS.md. See ADR 20 in docs/architecture/decisions.md.
+   */
+  sourceKind: 'session' | 'scenario' | 'synthetic';
   sourceLabel?: string;
   incomplete?: true;
   failedTicks?: number[];
+  /**
+   * Populated only when sourceKind === 'synthetic'. The seed used for the
+   * harness's policy sub-RNG; preserved for future replay-via-policy work.
+   * Spec 3 §5.4.
+   */
+  policySeed?: number;
 }
 
 export interface SessionBundle<
diff --git a/src/session-recorder.ts b/src/session-recorder.ts
index 55deae1..213e044 100644
--- a/src/session-recorder.ts
+++ b/src/session-recorder.ts
@@ -52,6 +52,16 @@ export interface SessionRecorderConfig<
   debug?: { capture(): TDebug | null };
   /** Optional human label propagated into bundle metadata. */
   sourceLabel?: string;
+  /**
+   * Default: 'session'. Set by harnesses (e.g., runSynthPlaytest passes
+   * 'synthetic'). Added in v0.8.0 — see SessionMetadata ADR 20.
+   */
+  sourceKind?: 'session' | 'scenario' | 'synthetic';
+  /**
+   * Optional. Populated only when sourceKind === 'synthetic'. Stored as
+   * SessionMetadata.policySeed. Added in v0.8.0.
+   */
+  policySeed?: number;
 }
 
 export class SessionRecorder<
@@ -66,6 +76,8 @@ export class SessionRecorder<
   private readonly _terminalSnapshot: boolean;
   private readonly _debugCapture?: () => TDebug | null;
   private readonly _sourceLabel?: string;
+  private readonly _sourceKind?: 'session' | 'scenario' | 'synthetic';
+  private readonly _policySeed?: number;
 
   private _connected = false;
   private _closed = false;
@@ -90,6 +102,8 @@ export class SessionRecorder<
     this._terminalSnapshot = config.terminalSnapshot ?? true;
     this._debugCapture = config.debug?.capture.bind(config.debug);
     this._sourceLabel = config.sourceLabel;
+    this._sourceKind = config.sourceKind;
+    this._policySeed = config.policySeed;
   }
 
   get tickCount(): number { return this._tickCount; }
@@ -128,8 +142,9 @@ export class SessionRecorder<
       endTick: this._startTick,
       persistedEndTick: this._startTick,
       durationTicks: 0,
-      sourceKind: 'session',
+      sourceKind: this._sourceKind ?? 'session',
       ...(this._sourceLabel ? { sourceLabel: this._sourceLabel } : {}),
+      ...(this._policySeed !== undefined ? { policySeed: this._policySeed } : {}),
     };
     try {
       this._sink.open(initialMetadata);
diff --git a/src/synthetic-playtest.ts b/src/synthetic-playtest.ts
index 69bbd59..5ac5876 100644
--- a/src/synthetic-playtest.ts
+++ b/src/synthetic-playtest.ts
@@ -1,4 +1,9 @@
 import type { World, ComponentRegistry } from './world.js';
+import type { JsonValue } from './json.js';
+import type { SessionBundle } from './session-bundle.js';
+import { DeterministicRandom } from './random.js';
+import { MemorySink, type SessionSink, type SessionSource } from './session-sink.js';
+import { SessionRecorder } from './session-recorder.js';
 
 export interface PolicyContext<
   TEventMap extends Record<keyof TEventMap, unknown>,
@@ -111,3 +116,144 @@ export function randomPolicy<
     return out;
   };
 }
+
+export interface SynthPlaytestConfig<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+> {
+  world: World<TEventMap, TCommandMap, TComponents, TState>;
+  policies: Policy<TEventMap, TCommandMap, TComponents, TState>[];
+  maxTicks: number;
+  sink?: SessionSink & SessionSource;
+  sourceLabel?: string;
+  policySeed?: number;
+  stopWhen?: (ctx: StopContext<TEventMap, TCommandMap, TComponents, TState>) => boolean;
+  snapshotInterval?: number | null;
+}
+
+export interface SynthPlaytestResult<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TDebug = JsonValue,
+> {
+  bundle: SessionBundle<TEventMap, TCommandMap, TDebug>;
+  ticksRun: number;
+  stopReason: 'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError' | 'sinkError';
+  ok: boolean;
+  policyError?: {
+    policyIndex: number;
+    tick: number;
+    error: { name: string; message: string; stack: string | null };
+  };
+}
+
+export function runSynthPlaytest<
+  TEventMap extends Record<keyof TEventMap, unknown>,
+  TCommandMap extends Record<keyof TCommandMap, unknown>,
+  TComponents extends ComponentRegistry = Record<string, unknown>,
+  TState extends Record<string, unknown> = Record<string, unknown>,
+  TDebug = JsonValue,
+>(
+  config: SynthPlaytestConfig<TEventMap, TCommandMap, TComponents, TState>,
+): SynthPlaytestResult<TEventMap, TCommandMap, TDebug> {
+  // Step 1: validation.
+  if (!Number.isInteger(config.maxTicks) || config.maxTicks < 1) {
+    throw new RangeError(`maxTicks must be a positive integer (got ${config.maxTicks})`);
+  }
+  if (config.policySeed !== undefined && !Number.isInteger(config.policySeed)) {
+    throw new RangeError(`policySeed must be a finite integer (got ${config.policySeed})`);
+  }
+
+  const { world, policies, maxTicks, sink, sourceLabel } = config;
+  // Use 'in' to distinguish unset from explicit-null (??1000 would coerce null to 1000 — null disables periodic snapshots).
+  const snapshotInterval: number | null =
+    'snapshotInterval' in config && config.snapshotInterval !== undefined
+      ? config.snapshotInterval
+      : 1000;
+
+  // Step 2: sub-RNG init (BEFORE recorder.connect so initial snapshot reflects post-derivation world.rng state).
+  // ADR 19: Math.floor(world.random() * 0x1_0000_0000) scales [0,1) to a uint32 — required because
+  // DeterministicRandom.seedToUint32's Math.trunc(x)>>>0 collapses [0,1) to 0.
+  const policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000);
+  const subRng = new DeterministicRandom(policySeed);
+  const random = (): number => subRng.random();
+
+  // Step 3: recorder attach. terminalSnapshot:true is hardcoded — every bundle gets the
+  // (initial, terminal) segment so SessionReplayer.selfCheck has a non-empty segment to validate.
+  const effectiveSink: SessionSink & SessionSource = sink ?? new MemorySink();
+  // SessionRecorder is 3-generic (no TComponents/TState); doesn't access them. Cast is structurally safe.
+  const recorder = new SessionRecorder<TEventMap, TCommandMap, TDebug>({
+    world: world as unknown as World<TEventMap, TCommandMap>,
+    sink: effectiveSink,
+    snapshotInterval,
+    terminalSnapshot: true,
+    sourceLabel: sourceLabel ?? 'synthetic',
+    sourceKind: 'synthetic',
+    policySeed,
+  });
+  recorder.connect();
+  if (recorder.lastError !== null) {
+    // Connect-time sink failure: propagate. recorder.connect() does NOT throw on
+    // sink.open() failure — it sets _lastError + _terminated and returns. The initial
+    // snapshot may not have been persisted, so there's no coherent bundle to return.
+    const err = recorder.lastError;
+    try { recorder.disconnect(); } catch { /* best-effort */ }
+    throw err;
+  }
+
+  // Step 4: tick loop.
+  let ticksRun = 0;
+  let stopReason: SynthPlaytestResult<TEventMap, TCommandMap, TDebug>['stopReason'] = 'maxTicks';
+  let policyError: SynthPlaytestResult<TEventMap, TCommandMap, TDebug>['policyError'];
+
+  outer: for (let i = 0; i < maxTicks; i++) {
+    const policyCtx: PolicyContext<TEventMap, TCommandMap, TComponents, TState> = {
+      world, tick: world.tick + 1, random,
+    };
+    for (let p = 0; p < policies.length; p++) {
+      let cmds: PolicyCommand<TCommandMap>[];
+      try {
+        cmds = policies[p](policyCtx);
+      } catch (err) {
+        const e = err as Error;
+        stopReason = 'policyError';
+        policyError = {
+          policyIndex: p,
+          tick: policyCtx.tick,
+          error: { name: e.name ?? 'Error', message: e.message ?? String(e), stack: e.stack ?? null },
+        };
+        break outer;
+      }
+      for (const cmd of cmds) {
+        world.submitWithResult(cmd.type, cmd.data);
+      }
+    }
+    try {
+      world.step();
+    } catch {
+      stopReason = 'poisoned';
+      break;
+    }
+    if (recorder.lastError !== null) {
+      stopReason = 'sinkError';
+      break;
+    }
+    ticksRun++;
+    const stopCtx: StopContext<TEventMap, TCommandMap, TComponents, TState> = {
+      world, tick: world.tick, random,
+    };
+    if (config.stopWhen?.(stopCtx)) {
+      stopReason = 'stopWhen';
+      break;
+    }
+  }
+
+  // Step 5: disconnect + return.
+  try { recorder.disconnect(); } catch { /* best-effort */ }
+  // Tighten ok: also flips false if disconnect-time sink failure occurred.
+  const ok = stopReason !== 'sinkError' && recorder.lastError === null;
+  const bundle = recorder.toBundle() as unknown as SessionBundle<TEventMap, TCommandMap, TDebug>;
+  return { bundle, ticksRun, stopReason, ok, policyError };
+}
diff --git a/src/version.ts b/src/version.ts
index a82ed22..1f1ad8a 100644
--- a/src/version.ts
+++ b/src/version.ts
@@ -4,4 +4,4 @@
  * `metadata.engineVersion` in session bundles. Avoids relying on
  * `process.env.npm_package_version` which is only set under `npm run`.
  */
-export const ENGINE_VERSION = '0.7.20' as const;
+export const ENGINE_VERSION = '0.8.0' as const;
diff --git a/tests/synthetic-playtest.test.ts b/tests/synthetic-playtest.test.ts
new file mode 100644
index 0000000..13defe9
--- /dev/null
+++ b/tests/synthetic-playtest.test.ts
@@ -0,0 +1,286 @@
+import { describe, expect, it } from 'vitest';
+import {
+  MemorySink,
+  World,
+  noopPolicy,
+  randomPolicy,
+  runSynthPlaytest,
+  scriptedPolicy,
+  type PolicyContext,
+  type RandomPolicyConfig,
+  type WorldConfig,
+} from '../src/index.js';
+
+const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' });
+
+interface Cmds { spawn: { id: number } }
+
+const mkWorld = () => {
+  const w = new World<Record<string, never>, Cmds>(mkConfig());
+  w.registerHandler('spawn', () => undefined);
+  return w;
+};
+
+describe('runSynthPlaytest — config validation', () => {
+  it('rejects maxTicks <= 0 with RangeError', () => {
+    const world = mkWorld();
+    expect(() => runSynthPlaytest({ world, policies: [], maxTicks: 0 })).toThrow(RangeError);
+    expect(() => runSynthPlaytest({ world, policies: [], maxTicks: -1 })).toThrow(RangeError);
+  });
+
+  it('rejects non-integer maxTicks', () => {
+    const world = mkWorld();
+    expect(() => runSynthPlaytest({ world, policies: [], maxTicks: 1.5 })).toThrow(RangeError);
+  });
+
+  it('rejects NaN policySeed', () => {
+    const world = mkWorld();
+    expect(() => runSynthPlaytest({
+      world, policies: [], maxTicks: 1, policySeed: NaN,
+    })).toThrow(RangeError);
+  });
+
+  it('rejects non-integer policySeed', () => {
+    const world = mkWorld();
+    expect(() => runSynthPlaytest({
+      world, policies: [], maxTicks: 1, policySeed: 1.5,
+    })).toThrow(RangeError);
+  });
+});
+
+describe('runSynthPlaytest — basic lifecycle', () => {
+  it('runs maxTicks steps and returns a synthetic-kind bundle', () => {
+    const world = mkWorld();
+    const result = runSynthPlaytest({
+      world,
+      policies: [noopPolicy<Record<string, never>, Cmds>()],
+      maxTicks: 5,
+    });
+    expect(result.stopReason).toBe('maxTicks');
+    expect(result.ticksRun).toBe(5);
+    expect(result.ok).toBe(true);
+    expect(result.bundle.metadata.sourceKind).toBe('synthetic');
+    expect(typeof result.bundle.metadata.policySeed).toBe('number');
+    expect(result.bundle.metadata.sourceLabel).toBe('synthetic');
+    expect(world.tick).toBe(5);
+  });
+
+  it('explicit policySeed overrides default and stores in metadata', () => {
+    const world = mkWorld();
+    const result = runSynthPlaytest({
+      world, policies: [], maxTicks: 1, policySeed: 12345,
+    });
+    expect(result.bundle.metadata.policySeed).toBe(12345);
+  });
+
+  it('explicit sourceLabel overrides default', () => {
+    const world = mkWorld();
+    const result = runSynthPlaytest({
+      world, policies: [], maxTicks: 1, sourceLabel: 'random-spawn-100t',
+    });
+    expect(result.bundle.metadata.sourceLabel).toBe('random-spawn-100t');
+  });
+
+  it('scriptedPolicy emits commands at PolicyContext.tick', () => {
+    const world = mkWorld();
+    const sequence = [
+      { tick: 1, type: 'spawn' as const, data: { id: 100 } },
+      { tick: 3, type: 'spawn' as const, data: { id: 200 } },
+    ];
+    const result = runSynthPlaytest({
+      world,
+      policies: [scriptedPolicy<Record<string, never>, Cmds>(sequence)],
+      maxTicks: 5,
+    });
+    expect(result.bundle.commands).toHaveLength(2);
+    expect(result.bundle.commands[0].data).toEqual({ id: 100 });
+    expect(result.bundle.commands[1].data).toEqual({ id: 200 });
+    // submissionTick is world.tick at submit time (one less than executing tick).
+    expect(result.bundle.commands[0].submissionTick).toBe(0);
+    expect(result.bundle.commands[1].submissionTick).toBe(2);
+  });
+
+  it('explicit sink: harness uses the provided sink', () => {
+    const world = mkWorld();
+    const sink = new MemorySink();
+    const result = runSynthPlaytest({
+      world,
+      policies: [noopPolicy<Record<string, never>, Cmds>()],
+      maxTicks: 3,
+      sink,
+    });
+    expect(result.ok).toBe(true);
+    expect(sink.metadata?.sourceKind).toBe('synthetic');
+  });
+});
+
+describe('runSynthPlaytest — stop reasons', () => {
+  it('stopWhen fires when predicate returns truthy (post-step)', () => {
+    const world = mkWorld();
+    const result = runSynthPlaytest({
+      world,
+      policies: [noopPolicy<Record<string, never>, Cmds>()],
+      maxTicks: 100,
+      stopWhen: (ctx) => ctx.tick === 3,
+    });
+    expect(result.stopReason).toBe('stopWhen');
+    expect(result.ticksRun).toBe(3);
+    expect(world.tick).toBe(3);
+  });
+
+  it('poisoned: world poison stops with stopReason "poisoned"', () => {
+    const world = mkWorld();
+    world.registerSystem({
+      name: 'poison-on-tick-3', phase: 'update',
+      execute: (lw) => { if (lw.tick === 3) throw new Error('intentional'); },
+    });
+    const result = runSynthPlaytest({
+      world,
+      policies: [noopPolicy<Record<string, never>, Cmds>()],
+      maxTicks: 10,
+    });
+    expect(result.stopReason).toBe('poisoned');
+    expect(result.ok).toBe(true);
+    expect(result.bundle.metadata.failedTicks).toBeDefined();
+    expect(result.bundle.metadata.failedTicks!.length).toBeGreaterThanOrEqual(1);
+  });
+
+  it('policyError: policy throw stops with stopReason "policyError" + populated policyError', () => {
+    const world = mkWorld();
+    const throwingPolicy = (ctx: PolicyContext<Record<string, never>, Cmds>) => {
+      if (ctx.tick === 3) throw new Error('policy-bug');
+      return [];
+    };
+    const result = runSynthPlaytest({
+      world,
+      policies: [throwingPolicy],
+      maxTicks: 10,
+    });
+    expect(result.stopReason).toBe('policyError');
+    expect(result.ok).toBe(true);
+    expect(result.policyError).toBeDefined();
+    expect(result.policyError!.policyIndex).toBe(0);
+    expect(result.policyError!.tick).toBe(3);
+    expect(result.policyError!.error.message).toBe('policy-bug');
+    expect(result.bundle.metadata.failedTicks).toBeUndefined();
+  });
+
+  it('pre-step policyError on tick 1 produces ticksRun=0', () => {
+    const world = mkWorld();
+    const throwImmediately = () => { throw new Error('throws on first call'); };
+    const result = runSynthPlaytest({
+      world,
+      policies: [throwImmediately],
+      maxTicks: 10,
+    });
+    expect(result.stopReason).toBe('policyError');
+    expect(result.ticksRun).toBe(0);
+  });
+});
+
+describe('runSynthPlaytest — failure modes', () => {
+  it('poisoned-world-at-start propagates RecorderClosedError', () => {
+    const world = mkWorld();
+    world.registerSystem({
+      name: 'boom', phase: 'update', execute: () => { throw new Error('intentional'); },
+    });
+    expect(() => world.step()).toThrow();
+    expect(world.isPoisoned()).toBe(true);
+
+    expect(() => runSynthPlaytest({
+      world,
+      policies: [noopPolicy<Record<string, never>, Cmds>()],
+      maxTicks: 10,
+    })).toThrow(/world_poisoned|poisoned/);
+  });
+});
+
+describe('runSynthPlaytest — composition', () => {
+  it('two policies on same tick: bundle.commands[].sequence is monotonic in policy-array order', () => {
+    const world = mkWorld();
+    const policyA = scriptedPolicy<Record<string, never>, Cmds>([
+      { tick: 1, type: 'spawn', data: { id: 1 } },
+    ]);
+    const policyB = scriptedPolicy<Record<string, never>, Cmds>([
+      { tick: 1, type: 'spawn', data: { id: 2 } },
+    ]);
+    const result = runSynthPlaytest({
+      world,
+      policies: [policyA, policyB],
+      maxTicks: 1,
+    });
+    expect(result.bundle.commands).toHaveLength(2);
+    expect(result.bundle.commands[0].data).toEqual({ id: 1 });
+    expect(result.bundle.commands[1].data).toEqual({ id: 2 });
+    expect(result.bundle.commands[0].sequence).toBeLessThan(result.bundle.commands[1].sequence);
+  });
+
+  it('composed-policy partial-submit-then-throw: earlier commands recorded, no executions for failed tick', () => {
+    const world = mkWorld();
+    const successfulPolicy = scriptedPolicy<Record<string, never>, Cmds>([
+      { tick: 1, type: 'spawn', data: { id: 100 } },
+    ]);
+    const throwingPolicy = (ctx: PolicyContext<Record<string, never>, Cmds>) => {
+      if (ctx.tick === 1) throw new Error('throws-on-tick-1');
+      return [];
+    };
+    const result = runSynthPlaytest({
+      world,
+      policies: [successfulPolicy, throwingPolicy],
+      maxTicks: 5,
+    });
+    expect(result.stopReason).toBe('policyError');
+    expect(result.policyError!.policyIndex).toBe(1);
+    expect(result.bundle.commands).toHaveLength(1);
+    expect(result.bundle.commands[0].data).toEqual({ id: 100 });
+    // step() never ran for tick 1, so no execution.
+    const tick1Executions = result.bundle.executions.filter((e) => e.tick === 1);
+    expect(tick1Executions).toHaveLength(0);
+  });
+});
+
+describe('runSynthPlaytest — production-determinism', () => {
+  it('same policySeed produces structurally identical bundles (modulo sessionId/recordedAt)', () => {
+    const setup = () => mkWorld();
+    const policyConfig = (): RandomPolicyConfig<Record<string, never>, Cmds> => ({
+      catalog: [
+        () => ({ type: 'spawn', data: { id: 1 } }),
+        () => ({ type: 'spawn', data: { id: 2 } }),
+        () => ({ type: 'spawn', data: { id: 3 } }),
+      ],
+    });
+    const r1 = runSynthPlaytest({
+      world: setup(),
+      policies: [randomPolicy<Record<string, never>, Cmds>(policyConfig())],
+      maxTicks: 50,
+      policySeed: 99,
+    });
+    const r2 = runSynthPlaytest({
+      world: setup(),
+      policies: [randomPolicy<Record<string, never>, Cmds>(policyConfig())],
+      maxTicks: 50,
+      policySeed: 99,
+    });
+
+    expect(r1.bundle.commands).toEqual(r2.bundle.commands);
+    expect(r1.bundle.executions).toEqual(r2.bundle.executions);
+
+    // Tick entries: deterministic fields only (strip metrics — durationMs is performance.now()-backed).
+    const stripTickMetrics = (t: typeof r1.bundle.ticks[number]) => ({
+      tick: t.tick, diff: t.diff, events: t.events, debug: t.debug,
+    });
+    expect(r1.bundle.ticks.map(stripTickMetrics)).toEqual(r2.bundle.ticks.map(stripTickMetrics));
+
+    expect(r1.bundle.initialSnapshot).toEqual(r2.bundle.initialSnapshot);
+    expect(r1.bundle.snapshots).toEqual(r2.bundle.snapshots);
+    expect(r1.bundle.failures).toEqual(r2.bundle.failures);
+
+    const stripVolatile = (m: typeof r1.bundle.metadata) => {
+      const copy = { ...m };
+      delete (copy as Partial<typeof copy>).sessionId;
+      delete (copy as Partial<typeof copy>).recordedAt;
+      return copy;
+    };
+    expect(stripVolatile(r1.bundle.metadata)).toEqual(stripVolatile(r2.bundle.metadata));
+  });
+});
