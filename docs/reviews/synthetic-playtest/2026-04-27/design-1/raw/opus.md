I have enough context to synthesize the review. Findings below, grounded in the existing engine source.

---

# Review: Synthetic Playtest Harness Design Spec v1

## Cross-cutting verdict

The spec is well-structured and the core proposition (a policy-driven autonomous driver that produces SessionBundles) is sound. The Non-Goals list is disciplined, the Tier-1 boundary is respected, and the integration with `SessionRecorder` is mostly clean. However, there is one BLOCKER (the flagship `randomPolicy` violates a fundamental engine determinism invariant and will produce bundles that fail the spec's own CI gate), plus two HIGH design issues (sourceKind mutation pattern; policy-throw category error). These need to be resolved before any code lands.

## [BLOCKER]

**B1. `randomPolicy`'s use of `world.random()` between ticks will fail `selfCheck` — the flagship built-in policy violates the engine's between-tick RNG-sandboxing invariant.**

Tracing the recorder/replayer through the exact spec lifecycle:

- Snapshots are taken inside `SessionRecorder._onDiff` at `session-recorder.ts:414` (after `gameLoop.advance()` and after systems' RNG calls have advanced `world.rng`).
- Between snapshots, the harness runs policies which call `world.random()` to pick from the catalog (per §6.2: "The harness picks one entry uniformly at random per emit, via `world.random()`"). These calls advance `world.rng` further.
- The next snapshot's `rng: this.rng.getState()` (`world.ts:918`) captures **system advances + policy advances**.
- `SessionReplayer._checkSegment` (`session-replayer.ts:337-413`) replays only the recorded commands and `world.step()` — it never runs policies. Replay's RNG state at the next snapshot reflects **system advances only**.
- `_checkSegment` does a strict `deepEqualWithPath(actualB, b.snapshot)` at line 406, which includes the `rng` path. → State divergence at the first periodic snapshot, every time.

This is not a hypothetical concern. The engine has an explicit, tested principle against this exact pattern: `tests/command-transaction.test.ts:567` literally says *"predicate cannot call random() — would advance RNG and break determinism (R1)"*. The synthetic harness is doing the same thing the predicate machinery is forbidden from doing.

The session-recording §11.1 clause 3 (route randomness through `world.random()`) is silent on **between-tick** `world.random()` calls — the existing test corpus (`tests/determinism-contract.test.ts:72-86`) only tests `world.random()` from inside a system, where replay reproduces the call. The synthetic harness exposes the gap.

This directly contradicts §10 ("every synthetic playtest in the engine's test corpus should pass `selfCheck`") and §12 ("`SessionReplayer.selfCheck()` returns `ok: true` on synthetic bundles").

**Fix options (pick one and update §5.1, §6.2, §7.3):**
1. Spec a `ctx.random: () => number` on `PolicyContext` backed by a harness-managed sub-`DeterministicRandom` seeded from a `SynthPlaytestConfig.policySeed` (defaulting to e.g. `world.random()` called once at harness construction, captured before recorder.connect). Policies — and `randomPolicy` internally — use `ctx.random`, not `world.random()`. World's RNG state stays untouched by between-tick code; replay reproduces it trivially.
2. Sandbox the world's RNG: harness saves `world.rng.getState()` before each batch of `policy.decide()` calls, restores after. Tradeoff: composed policies all share the saved state and would re-derive the same sequence unless each gets its own sub-RNG.
3. Only option 3 that's NOT acceptable: documenting "policies must not use `world.random()`" without providing an alternative — leaves `randomPolicy` itself non-functional.

Option 1 is cleanest and slots into the existing `DeterministicRandom` class. Recommend it.

## [HIGH]

**H1. Mutating `sink.metadata.sourceKind` after `recorder.connect()` is a layering violation and breaks FileSink durability.**

Per §7.1 step 2: *"the harness mutates the metadata on the recorder's sink after `connect()` completes (or, simpler, the harness reads sink.metadata and mutates the field)"*. Concrete problems:
- `SessionRecorder.connect()` builds `initialMetadata` with `sourceKind: 'session'` at `session-recorder.ts:131`, then calls `sink.open(initialMetadata)`.
- For `FileSink`, `open()` synchronously flushes `manifest.json` to disk via `_writeManifest()` at `session-file-sink.ts:141`. Then `connect()` writes the initial snapshot, which rewrites `manifest.json` again — both times with `sourceKind: 'session'`.
- The harness then mutates `sink.metadata.sourceKind = 'synthetic'` in memory. This in-memory value reaches the on-disk manifest only on the next `writeSnapshot()` or on `close()`. If the harness crashes between `connect()` and the first periodic snapshot, the on-disk bundle says `sourceKind: 'session'` despite being synthetic.
- It also reaches into a sibling subsystem's mutable state — neither `SessionRecorder` nor `scenarioResultToBundle` does this. `'scenario'` is set by constructing fresh metadata in `session-scenario-bundle.ts:71`; the harness's mutation pattern is novel and the wrong shape.

**Fix:** Extend `SessionRecorderConfig` with `sourceKind?: 'session' | 'scenario' | 'synthetic'` (default `'session'`); have `SessionRecorder.connect()` set it inside the `initialMetadata` literal at line 131. The harness then passes `sourceKind: 'synthetic'` to `SessionRecorder` and never touches the sink. (`'scenario'` value is not constructed via SessionRecorder today, so this option is purely additive — no existing call sites change.)

**H2. Conflating policy-throw with `'poisoned'` in §7.2 corrupts the bundle and the result type.**

§7.2: *"Policy throws. The harness catches, sets `stopReason: 'poisoned'` (treating policy errors equivalently), records the failure into bundle.failures via a synthetic TickFailure"*. Problems:
- The world isn't poisoned. The policy is. `world.isPoisoned()` returns false. Future debugging code that reads `result.stopReason === 'poisoned'` and then queries `world.isPoisoned()` will see a contradiction.
- `bundle.failures` holds `TickFailure[]` whose shape is world-defined (`world.ts:165-181` — `phase: TickFailurePhase`, `subsystem: string`, `commandType`, `submissionSequence`, `systemName`). A "synthetic TickFailure" representing a policy throw has no honest `phase` value (none of `'commands' | 'systems' | 'resources' | 'diff' | 'listeners'` describes a between-tick policy crash). Whatever you pick is misleading.
- `SessionReplayer.openAt` and `selfCheck` read `metadata.failedTicks` and skip segments containing recorded failures (`session-replayer.ts:286-287`). A fake TickFailure injected by the harness will silently mask a perfectly replayable segment.

**Fix:** Add `'policyError'` to the `stopReason` union. Add `policyError?: { policyIndex: number; tick: number; error: { name: string; message: string; stack: string | null } }` to `SynthPlaytestResult`. Leave `bundle.failures` semantically pure — world failures only.

## [MED]

**M1. `RandomPolicyConfig.catalog` typed as `Array<(ctx: PolicyContext<never, TCommandMap>) => …>` is wrong.**

Setting `TEventMap = never` collapses `world.getEvents()` to `Array<{ type: never; data: never }>`. Catalog functions can no longer read events from the world even though the underlying world has them. Should be `PolicyContext<TEventMap, TCommandMap>` matching the parent policy's context (and the function should be generic over `TEventMap` like `Policy` is).

**M2. §5.1's "Same as the spec §11 determinism contract for systems" is sloppy.**

Policies are not systems — they are external between-tick coordinators (the role positively named in session-recording §11.1 clause 2: *"an external coordinator picks up and submits between ticks"*). The contract needs to enumerate per-clause: clauses 1, 2 (positively, since policies ARE the coordinator), 3 (modulo BLOCKER B1's resolution), 6, 7 apply directly; clause 4 (validators) and 5 (wall-clock in systems) don't apply to policies; clauses 8 (registration order), 9 (engine version) apply to the harness caller, not the policy. Spelling this out prevents misreadings — especially since clause 3 itself becomes the very thing the synthetic spec needs to refine.

**M3. §7.1 lifecycle's tick semantics drift between `policy.decide()` and `stopWhen`.**

Step 3 defines `context = { world, tick: world.tick + 1 }` for the policy (the tick about to execute). It then says *"Check `stopWhen(context)`; break with `stopReason: 'stopWhen'` if truthy"* — but that check happens AFTER `world.step()`. At that point `world.tick + 1` would mean "the tick after the one that just ran". The spec is silent on whether the harness rebuilds the context post-step (so `ctx.tick === world.tick`, the just-executed tick) or reuses the pre-step context. State this explicitly. Probably want `ctx.tick === world.tick` (post-step) for stopWhen.

**M4. `PolicyCommand.data: TCommandMap[keyof TCommandMap]` loses producer-side type safety.**

The widest-union form is fine for consumers (RecordedCommand reading already does this), but for policy authors constructing commands, a discriminated form would catch type mismatches at build time:
```ts
export type PolicyCommand<TCommandMap> = {
  [K in keyof TCommandMap & string]: { type: K; data: TCommandMap[K] };
}[keyof TCommandMap & string];
```
If you keep the loose form, add an ADR explaining that the consistency with `RecordedCommand` was the trade-off — the spec currently doesn't acknowledge the precision loss.

**M5. §6.2 header lists `rngState?` but `RandomPolicyConfig` doesn't declare it.** Either define it or remove the mention. This is also where BLOCKER B1's resolution will likely land (`seed?: number | string`).

## [LOW]

**L1. ADR 3 understates the TS-strict-mode breakage.** A downstream `assertNever`-style exhaustive switch on `'session' | 'scenario'` is broken by the union widening. The engine has zero internal consumers branching on `sourceKind` (verified — only producers in `session-recorder.ts:131` and `session-scenario-bundle.ts:71`), so the engine is unaffected. But ADR 3's *"existing consumers either don't care or fall through with their default handling"* glosses over the exhaustive-switch case. Acknowledge it; a `c`-bump is probably still right (downstream is empty), but an `assertNever` consumer is a real and predictable break.

**L2. §7.3 determinism modulo list is incomplete (and mostly moot).** Lists `sessionId` and `recordedAt`. Not listed: `markers[].id`, `attachments[].id`, `marker.createdAt`. Since the harness as specified doesn't add markers/attachments and policies have no recorder handle, this is moot in practice — but say so.

**L3. Snapshot-cadence collision at `maxTicks = snapshotInterval`.** With default `snapshotInterval: 1000` and `maxTicks: 1000`, the periodic snapshot fires at tick 1000 inside `_onDiff`, then `disconnect()` writes the terminal snapshot also at tick 1000. Two snapshots at the same tick. Harmless for selfCheck (zero-tick segment), but worth noting / suggesting the recorder dedupe — though that's a session-recording concern.

**L4. §7.2 doesn't address: policy throws AFTER calling `world.submit()` directly.** The recorder's `submitWithResult` wrap captures the submission. The harness then aborts before the next `world.step()`. Result: `bundle.commands` has entries with no matching `executions` for the final partial tick. selfCheck won't replay across the abort point so it's benign, but a careful reader will wonder. One sentence in §7.2 covers it.

**L5. §14 versioning: "v0.7.19 or v0.7.16, depending on followups merge state".** Pin the base; the branch is created off whichever tip exists at start. Per recent commit `748e617` and the merged followups in `c849b9a`, the branch is on top of v0.7.19 — say so explicitly.

**L6. T1–T4 split puts docs (T4) as a standalone `c`-bump.** AGENTS.md says *"one version bump per coherent shipped change"* and *"docs that land with the change are part of that change"*. T4 should fold into T2 (or T3) so the version that lands the harness ALSO lands its docs. Three c-bumps for "policies / harness+tests / docs" is more linear than this design needs.

## [NIT]

**N1. §4 "Three new symbols" vs §18 listing eleven exports.** Rephrase §4 as "three new conceptual primitives" or list the actual surface count.

**N2. Missing ADR: composed policies see each other's submissions.** With strict array-order dispatch and the harness calling `submitWithResult` between policies (not buffering), `policies[1].decide()` runs against a world whose `commandQueue` already holds `policies[0]`'s submissions and whose `nextCommandResultSequence` has advanced. This is non-trivial design intent — worth an ADR sentence so future readers don't accidentally batch-and-flush.

**N3. §16 missing deferred item: bundle should record which policies were used.** Currently `sourceLabel` is the only attribution. When a corpus mixes `randomPolicy` / `scriptedPolicy` / custom policies, an analyst can't tell which produced a given bundle. Defer to Tier-2, but list it.

## Section-by-section quick takes (for items not flagged above)

- **§1 Goals** — fine. Parallelizability claim is honest given the no-shared-state design.
- **§2 Non-Goals** — disciplined; LLM and async deferral aligned with Tier-1 boundary.
- **§3 Background** / runScenario comparison table — accurate.
- **§5.3 Stateful policies** example — fine modulo BLOCKER B1.
- **§6.1 noopPolicy / §6.3 scriptedPolicy** — clean. scriptedPolicy is the path that doesn't trip the RNG issue (catalogs are pre-determined per tick).
- **§6.4 composition** — fine; see N2.
- **§8 Bundle Format** — fine modulo H1.
- **§9 Integration with Existing Primitives** — accurate. The "compose runScenario as a policy" anti-recommendation is right.
- **§11 Performance** — claims match the recorder's actual per-tick cost.
- **§13 Documentation Surface** — list looks complete and matches AGENTS.md doc-discipline.
- **§15 ADR 1, 2, 4** — sound. ADR 3 has the L1 issue; missing N2.
- **§17 Future Specs unlocked** — accurate.
- **§18 Acceptance Criteria** — fine.

## Summary: changes required before acceptance

1. **B1**: Redesign policy randomness — separate seeded RNG (`ctx.random()` or `RandomPolicyConfig.seed`). Update §5.1, §6.2, §7.3.
2. **H1**: Move `sourceKind` ownership to `SessionRecorderConfig`; remove harness-side metadata mutation. Update §7.1 step 2.
3. **H2**: Add `'policyError'` to `stopReason` and a `policyError?` field on the result; do not synthesize TickFailure into `bundle.failures`. Update §7.2.
4. **M1–M5**: Fix catalog typing; per-clause determinism contract for policies; clarify stopWhen tick semantics; resolve `data` union vs discriminated; resolve `rngState?` mention.
5. Address **L1 (ADR 3)**, **L4 (partial-submit-then-throw)**, **L5 (pin base version)**, **L6 (fold T4 into T2/T3)**.
6. **N1, N2, N3** are quick to fold in alongside the above.

## Verdict

**REJECT (iter-1).** Re-spin with the BLOCKER and two HIGHs resolved, MEDs addressed, and LOWs/NITs at author discretion. The core architecture (policy contract, lifecycle, integration with SessionRecorder) is right — the rejection is about the determinism flaw and two layering issues, not about the overall shape.
