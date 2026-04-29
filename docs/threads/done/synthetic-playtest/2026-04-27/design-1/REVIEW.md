# Spec 3 (Synthetic Playtest Harness) — Design iter-1 Review Synthesis

**Iteration:** 1
**Date:** 2026-04-27
**Subject reviewed:** `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v1 (commit 748e617 / now 748e617 on `agent/synthetic-playtest`)
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini unreachable (quota exhausted, 4h23m reset).

**Verdict:** REJECT — re-spin required. Both reviewers identified the same blocker and the same two HIGHs. Overall architecture (policy contract, lifecycle, runScenario sibling shape) is right; the issues are specific and fixable.

---

## Convergent findings (both Codex and Opus flag)

### [BLOCKER] B1. `randomPolicy.world.random()` between ticks breaks `selfCheck`

`randomPolicy` (and any policy) calling `world.random()` between ticks advances `world.rng`. The next snapshot captures **system advances + policy advances**. `SessionReplayer` replays commands and `world.step()` but does NOT re-invoke policies, so replay's RNG state at the same snapshot reflects **system advances only**. `_checkSegment` does `deepEqualWithPath(actualB, b.snapshot)` over the snapshot — including `rng.state` — and reports a state divergence at the first periodic snapshot, every time.

This contradicts §10 ("every synthetic playtest should pass `selfCheck`") and §12. The engine has an explicit precedent against this exact pattern: `tests/command-transaction.test.ts:567` *"predicate cannot call random() — would advance RNG and break determinism (R1)"*.

**Fix (chosen):** introduce a harness-managed `policySeed` and a per-call `ctx.random()` backed by a separate `DeterministicRandom` sub-instance. Policies — including `randomPolicy` internally — use `ctx.random()`, not `world.random()`. The world's RNG state is untouched between ticks; replay reproduces it trivially.

The `policySeed` is captured at harness construction (default: derived once from `world.random()` call at construction *before* `recorder.connect()`, so the captured seed is deterministic w.r.t. the world's pre-policy RNG state). Stored in `SessionMetadata.policySeed` so replay can reconstruct policies if it ever wants to (out of v1 scope, but the seed is in the bundle for future use).

Sections to update: §5 (PolicyContext gains `random()`), §5.1 (determinism contract for policies), §6.2 (`randomPolicy` uses `ctx.random()` and accepts seeded sub-RNG), §7 (`SynthPlaytestConfig.policySeed?`), §7.3, §10, §15 (new ADR for sub-RNG), §16 (close the open question on rngState).

### [HIGH] H1. Mutating `sink.metadata.sourceKind` post-`connect()` is a layering violation

§7.1 step 2 says the harness mutates `sink.metadata.sourceKind` after `connect()`. Concrete problems:

- `SessionRecorder.connect()` builds initialMetadata with `sourceKind: 'session'` hardcoded at `session-recorder.ts:131`, then calls `sink.open(initialMetadata)`. For `FileSink`, `open()` synchronously flushes `manifest.json` to disk with `sourceKind: 'session'`. The in-memory mutation reaches disk only on the next snapshot or `close()`. A harness crash between `connect()` and the first periodic snapshot leaves the on-disk bundle saying `sourceKind: 'session'` despite being synthetic.
- A custom user-implemented sink that snapshots metadata during `open()` would silently record `'session'`.
- It reaches into a sibling subsystem's mutable state — neither `SessionRecorder` nor `scenarioResultToBundle` does this.

**Fix:** Extend `SessionRecorderConfig` with `sourceKind?: 'session' | 'scenario' | 'synthetic'` (default `'session'`). `SessionRecorder.connect()` reads it into the metadata literal at line 131. `runSynthPlaytest` passes `sourceKind: 'synthetic'`. The harness never mutates sink metadata.

This is a small, additive change to a merged subsystem. Existing `'scenario'` producer (`scenarioResultToBundle`) is unchanged — it constructs metadata fresh, doesn't go through `SessionRecorder`.

### [HIGH] H2. Policy throw → `stopReason: 'poisoned'` is a category error

§7.2 says policy throws set `stopReason: 'poisoned'` and synthesize a `TickFailure` into `bundle.failures`. Both reviewers flag this. Specific harm:

- The world isn't poisoned. `world.isPoisoned()` returns false. Future debug code reading `result.stopReason === 'poisoned'` then querying `world.isPoisoned()` sees a contradiction.
- `bundle.failures: TickFailure[]` shape is world-defined (`world.ts:165-181` — `phase: TickFailurePhase` ∈ `'commands' | 'systems' | 'resources' | 'diff' | 'listeners'`). None describes a between-tick policy crash.
- `SessionReplayer.openAt` and `selfCheck` skip segments with recorded failures (`session-replayer.ts:286-287`). A fake `TickFailure` masks a perfectly replayable segment.

**Fix:** Add `'policyError'` to `stopReason` union. Add `policyError?: { policyIndex: number; tick: number; error: { name: string; message: string; stack: string | null } }` to `SynthPlaytestResult`. Leave `bundle.failures` semantically pure — world failures only.

### [HIGH/MED] PolicyCommand typing is too loose

`PolicyCommand<TCommandMap>` pairs `type: keyof TCommandMap` with `data: TCommandMap[keyof TCommandMap]` — `type` and `data` are not correlated. Invalid command/payload pairs type-check. Same problem in `ScriptedPolicyEntry`.

**Fix:** Use discriminated union:
```ts
export type PolicyCommand<TCommandMap> = {
  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];
```
Same shape for `ScriptedPolicyEntry`.

### [MED] PolicyContext.tick semantics drift between policy and stopWhen

§7.1 defines `context = { world, tick: world.tick + 1 }` for the policy ("tick about to execute"). It then reuses the same context for `stopWhen` — but `stopWhen` runs AFTER `world.step()`, so `world.tick + 1` would mean "the tick after the one that just ran" — confusing.

**Fix:** Build a fresh `StopContext` post-step: `{ world, tick: world.tick }` (the tick that just executed). Document explicitly in §7.1.

---

## Findings only one reviewer raised

### Codex [HIGH] — sourceKind widening is a public TS API change

Widening `'session' | 'scenario'` to `'session' | 'scenario' | 'synthetic'` breaks consumer-side `assertNever` exhaustive switches. Codex argues for a `b`-bump.

Opus L1 makes the same point with a softer landing: engine has zero internal consumers branching on `sourceKind` (verified — only producers in `session-recorder.ts:131` and `session-scenario-bundle.ts:71`), so the engine is unaffected; downstream `assertNever` is the only break.

**Decision:** stick with `c`-bump (pre-1.0; downstream consumers are minimal; AGENTS.md `b` is for behavior-breaking, not strict-TS-mode-breaking). But ADR 3 must explicitly call out the exhaustive-switch failure mode rather than glossing it as "consumers either don't care or fall through."

### Opus [MED] M1 — `RandomPolicyConfig.catalog` uses `TEventMap = never`

Setting `TEventMap = never` collapses `world.getEvents()` to `Array<{ type: never; data: never }>`. Catalog functions can't read events. Should be `PolicyContext<TEventMap, TCommandMap>` matching the parent policy.

**Fix:** Make `randomPolicy` generic over `TEventMap` like `Policy` is.

### Opus [MED] M2 — §5.1 "same as spec §11 for systems" is sloppy

Policies aren't systems. Per session-recording §11.1 clause 2 they're "external coordinators". Need clause-by-clause enumeration: clauses 1, 2 (positively, since policies ARE the coordinator), 3 (modulo B1), 6, 7 apply directly; clauses 4, 5 don't apply to policies; clauses 8, 9 apply to the harness caller.

**Fix:** Rewrite §5.1 with an explicit per-clause table.

### Opus [MED] M5 — §6.2 mentions `rngState?` but not declared

§6.2 header lists `rngState?` in the destructure pattern, but `RandomPolicyConfig` interface doesn't declare it. Resolve as part of B1 (becomes `seed?: number | string` on either `randomPolicy` config or `SynthPlaytestConfig.policySeed`).

### Opus [LOW] L4 — Partial submit then policy throw

Policy calls `world.submit()` for command A, then throws on attempting command B. Recorder's wrap captured command A. Harness aborts before next `world.step()`. Bundle has a command in `commands.jsonl` with no matching execution.

**Fix:** Single sentence in §7.2. Benign because selfCheck won't replay across the abort, but readers will wonder.

### Opus [LOW] L5 — Pin base version

§14 says "v0.7.19 or v0.7.16, depending on followups merge state". Followups are merged at `c849b9a`. Branch starts at v0.7.19. Pin it.

### Opus [LOW] L6 — Fold T4 (docs) into T2/T3

AGENTS.md: "docs that land with the change are part of that change." T4 as a standalone `c`-bump fragments coherency. Fold docs into T2 (harness landing) and T3 (determinism integration).

**Decision:** Restructure to T1 (policies+tests) → T2 (harness+lifecycle+docs:api-reference+guide) → T3 (determinism integration tests + arch docs). Three c-bumps total.

### Opus [NIT] N1 — §4 "three new symbols" vs §18's eleven

Rephrase §4 as "three new conceptual primitives" or list the actual surface count.

### Opus [NIT] N2 — Composed policies see each other's submissions

With strict array-order dispatch and inline `submitWithResult`, `policies[1]` runs against a world whose `commandQueue` already holds `policies[0]`'s submissions. Worth an ADR sentence so future readers don't accidentally batch-and-flush.

**Fix:** New ADR 5: composition is sequential per-tick; later policies observe earlier policies' queued commands.

### Opus [NIT] N3 — Bundle should record policies used

Defer to Tier-2; list in §16 open questions.

---

## Outcome / Action plan for v2

Spec re-spin will:

1. **B1**: introduce `PolicyContext.random()` backed by harness-owned sub-RNG seeded from `policySeed` (defaults to `world.random()` snapshot at harness construction). Update §5, §5.1, §6.2, §7, §7.3, §10. Add ADR 5 for the sub-RNG. Bundle metadata stores `policySeed` for future replay.
2. **H1**: extend `SessionRecorderConfig` with `sourceKind?` field (additive, no behavior change for existing callers). Update §7.1 step 2. Note in §13 doc surface that `SessionRecorderConfig` gets a new optional field. This is also a tiny code change to the merged session-recording subsystem; will land as part of T2.
3. **H2**: add `'policyError'` to `stopReason`; add `policyError?` field to result; do not synthesize `TickFailure`. Update §7.2 + §7 result type.
4. **M1**: fix `RandomPolicyConfig.catalog` to be generic over `TEventMap`.
5. **M2**: rewrite §5.1 with per-clause table.
6. **M3**: clarify pre-step vs post-step context (introduce `StopContext` distinct from `PolicyContext`, or document the rebuild).
7. **M4**: discriminated union for `PolicyCommand` and `ScriptedPolicyEntry`.
8. **M5**: drop the stale `rngState?` mention; replaced by §B1's `policySeed`.
9. **L1 (Codex+Opus)**: ADR 3 explicitly calls out exhaustive-switch failure mode; keeps `c`-bump but documents the trade-off.
10. **L4**: §7.2 sentence on partial-submit-then-throw.
11. **L5**: pin base version to v0.7.19.
12. **L6**: restructure to T1/T2/T3 with docs folded in.
13. **N1**: rephrase §4 to "conceptual primitives" or expand to actual surface count.
14. **N2**: new ADR 6 for composition observing earlier submissions.
15. **N3**: §16 lists "bundle records policies used" as deferred.

Total ADR count after revision: 6 (existing 4 + sub-RNG + composition observation).

After applying these, request iter-2 review.
