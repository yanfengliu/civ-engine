I've now done enough verification. Here is my review.

---

# Iter-2 Review: Synthetic Playtest Harness Design Spec v2

## Scope of this review
Verified each iter-1 finding's resolution against the v2 text, checked the engine surfaces the design depends on (`DeterministicRandom`, `SessionRecorder.connect()`, `FileSink._writeManifest`, `World.submit*`, `World.commandQueue`), and looked for new issues introduced by the iter-2 changes.

---

## [BLOCKER] B1.1 — Default `policySeed = world.random()` is silently zero

§5.4, ADR 5, and §7.1 step 2 all describe the default seed as "one `world.random()` call at harness construction". Implemented literally:

```ts
const seed = config.policySeed ?? world.random();
const subRng = new DeterministicRandom(seed);
```

`world.random()` returns the float from `DeterministicRandom.random()` — `nextUint32() / UINT32_SIZE`, i.e. `[0, 1)`. `DeterministicRandom`'s `seedToUint32` (src/random.ts:46-50) does `Math.trunc(seed) >>> 0`, which collapses every value in `[0, 1)` to **0**. So *every* default-seeded synthetic playtest uses sub-RNG seed 0, regardless of the world's RNG state.

This silently destroys the production-determinism story for the default-seed case (every default run produces identical sub-RNG sequences) and contradicts the ADR-5 narrative ("seed is deterministic w.r.t. the pre-policy world state"). The spec re-introduces the same class of subtle bug iter-1's B1 was meant to eliminate.

**Required fix:** disambiguate the seed derivation. Three options, in order of preference:
1. Specify `world.rng.nextUint32()` as the source — but `world.rng` is private (world.ts:276), so this requires a public accessor or a `world.nextUint32()` method.
2. Specify `Math.floor(world.random() * 0x1_0000_0000)` (or `(world.random() * 2**32) >>> 0`) — works with current API, ugly but explicit.
3. Update `DeterministicRandom`'s `seedToUint32` to interpret floats `[0, 1)` as scaled uint32 — but that's a behavior change to a separate component and risks side effects on other callers.

Whichever you pick, write the literal expression in §7.1 step 2 and ADR 5 so an implementer can't read it and write `new DeterministicRandom(world.random())`.

---

## [HIGH] H6.1 — ADR 6 claims an observation property the API doesn't actually expose

ADR 6 (§15) says: "Later policies see the world's `commandQueue` containing earlier policies' submissions (and `nextCommandResultSequence` advanced)." §12's testing strategy then proposes a "later policies observe earlier policies' submissions in the queue (ADR 6 verification test)".

`World.commandQueue` is `private` (world.ts:252). `nextCommandResultSequence` is `private` (world.ts:277). Neither is reachable through any documented public API. The only public signal that fires when an earlier policy submits is via `onCommandResult` listeners, which a per-tick `Policy` function has no natural way to register from inside `PolicyContext`.

So the property the ADR documents — "later policies *can observe* earlier submissions" — is not actually a feature available to policy authors. It is true that submissions are *queued* in order, and that the `submissionSequence` field on the resulting `CommandSubmissionResult` reflects that ordering, but neither is something a later policy can read about earlier policies during the same tick. World state is unchanged (handlers haven't run), `world.getEvents()` returns the *previous* tick's events, and there is no public `world.peekPendingCommands()`.

This makes §12's "ADR 6 verification test" hard to write: there's nothing to assert against in a policy-visible way without reaching into private engine state.

**Required fix:** decide which way to land.

- **Path A — drop the claim.** Rewrite ADR 6 to say: composed policies see the same world state and tick; earlier submissions are queued internally and preserve `submissionSequence` ordering, but later policies in the same tick cannot inspect them. Remove the `commandQueue`/`nextCommandResultSequence` language. Remove the §12 ADR-6 verification test (or replace with a "submissionSequence ordering matches array order" assertion, which is an *external* observation, not a policy-side one).
- **Path B — actually add the surface.** Add `ctx.peekPendingCommands(): readonly QueuedCommand[]` (or similar) to `PolicyContext` and back it with a public `world.peekPendingCommands()`. Then ADR 6 lands as written and the test can assert against `ctx.peekPendingCommands()`.

Path A is consistent with the rest of v2's "minimal surface" stance. Path B is more useful but is real new public API and should be its own ADR.

Either way, the spec must not advertise a property that isn't actually accessible.

---

## [MED] M3.1 — ADR count in §14 doesn't match the spec body

§14 T3 says "Architecture docs: `docs/architecture/ARCHITECTURE.md` + 4 ADRs in `decisions.md` + drift-log entry."

The spec body has **seven** ADRs: 1, 2, 3, **3a**, 4, 5, 6. The iter-1 review's plan said "Total ADR count after revision: 6", so ADR 3a (the new "set sourceKind at construction" ADR) was added on top without updating the §14 count.

Either say "7 ADRs" or split them across commits (e.g., ADRs 1, 2 with T1; ADRs 3, 3a, 4 with T2; ADRs 5, 6 with T3). The latter is more defensible per the L6 fold-docs-into-the-commit-that-introduces-the-surface principle, but the spec must say which commits get which ADRs.

---

## [MED] M-DOC.1 — §13 silently relies on a future `world.peekPendingCommands` if Path B is chosen

If H6.1 lands as Path B (expose pending-commands), §13 needs an extra row in the doc surface (api-reference + concepts.md update + the new method on World), plus a new ADR for the public-API expansion. As written, §13 has no entry for any World-side change.

If Path A is chosen, §13 is fine.

Just flagging that the ADR 6 resolution drives §13.

---

## [LOW] L-NEG.1 — No negative-path determinism test

§12 lists positive determinism tests (replay-passes, production-determinism, sub-RNG seeded). There's no test asserting:

> A misbehaving policy that calls `world.random()` between ticks produces a bundle whose `selfCheck()` returns `ok: false` with a state divergence at the first segment boundary.

This is the test that proves the safety net actually works. Without it, the spec's claim "selfCheck is the verification mechanism" is unverified — a future regression that lets policies accidentally perturb `world.rng` (e.g., a subtle change to the harness wrap) could ship without detection.

Add it under §12 → Determinism → "negative case: policy calling `world.random()` causes selfCheck to fail at the first periodic snapshot."

---

## [LOW] L-EXP.1 — `DeterministicRandom` re-export note is stale

§9 says: "`DeterministicRandom`: re-exported from `src/index.ts` if not already; harness uses it for the policy sub-RNG."

It's already re-exported via `export * from './random.js'` at src/index.ts:14. Just say "re-exported from `src/index.ts`" without the conditional. Trivial nit but the conditional reads like a TODO.

---

## [LOW] L-FILE.1 — FileSink manifest writes `policySeed` immediately on `open()`

Not a bug, just worth noting: ADR 3a fixes the H1 mutation issue by setting `sourceKind` at construction. The same path also writes `policySeed` to `manifest.json` on `open()` (FileSink.\_writeManifest, session-file-sink.ts:153-172). So the manifest on disk reflects the synthetic seed even if the harness crashes mid-run before any periodic snapshot. This is the right behavior — H1's bug pattern is fully closed for this field too. No action needed; flagging because it's a positive consequence of the H1 fix that's worth keeping in mind for the implementer (don't be tempted to defer `policySeed` writes).

---

## [NIT] N-PHRASE.1 — Inconsistent phrasing of seed derivation

§5.4: "default: a value derived once via `world.random()` at harness construction"
§7.1 step 2: "Harness derives `policySeed` (config value or one `world.random()` call)"
ADR 5: "default: one `world.random()` call at harness construction"

After the BLOCKER fix, settle on one phrasing across all three sites. Recommend stating the literal expression once (in ADR 5 since it has the rationale) and cross-referencing from §5.4 and §7.1.

---

## [NIT] N-ALT.1 — ADR 5's "alternative considered" rationale is cryptic

ADR 5 says: "save/restore `world.rng.getState()` around each policy batch. Tradeoff: composed policies all share the saved state and re-derive identical sequences unless each gets its own sub-RNG."

The "share the saved state and re-derive identical sequences" sentence is hard to parse. It would be clearer as: "If we save world.rng before policy invocation and restore after, each policy in a composed array would see the *same* pre-call state, so any two policies that called `world.random()` the same number of times would observe the *same* values. We'd need a per-policy save/restore split, which is mechanically equivalent to giving each policy its own sub-RNG with extra steps."

Optional cleanup; not a correctness issue.

---

## What v2 got right

- **B1 sub-RNG architecture (modulo seed-derivation BLOCKER)**: the sub-RNG-not-`world.rng` separation is the correct call. §5.1's per-clause table is exactly what M2 asked for. The reasoning that selfCheck reproduces world.rng state because policies don't perturb it is sound.
- **H1 sourceKind extension (ADR 3a)**: correctly diagnosed the iter-1 mutation pattern as unsound, named the FileSink-manifest-on-open and custom-sink failure modes, and chose the right fix (additive config field). The change to SessionRecorder is clean — single literal at line 131 with optional spread, type-additive.
- **H2 stopReason widening + policyError field**: `'policyError'` and `'sinkError'` are the right two new union members. Keeping `bundle.failures` semantically pure for world failures only is correct — `selfCheck` skips segments containing `failedTicks`, and a fake `TickFailure` would mask a perfectly replayable segment. The L4 partial-submit-then-throw note in §7.2 is accurate (selfCheck doesn't traverse the orphan segment because there's no trailing snapshot at the abort point).
- **M3 `StopContext` split**: not YAGNI. The pre-step-vs-post-step `tick` semantic difference is meaningful and the type split makes the intent clear. Sharing `random()` between both contexts (same sub-RNG) is correct.
- **M4 discriminated unions**: standard `keyof TCommandMap & string`-mapped tagged-union pattern, consistent with how the recorder already constrains `RecordedCommand.type`. Doesn't break common patterns.
- **L1 ADR 3 acknowledgement**: clean explicit call-out of the `assertNever` exhaustive-switch break, with a documented rationale for sticking with `c`-bump.
- **L6 T1/T2/T3 restructure**: docs-with-the-surface-that-introduces-them is the right shape. T1 having only a thin doc surface is fine because the harness API doesn't ship until T2.
- **N1 §4 "three conceptual primitives + eleven exports"**: correctly resolves the §4-vs-§18 mismatch.

---

## Verdict

**Not ACCEPT.** The BLOCKER (default seed silently 0) and the HIGH (ADR 6 over-claims observability) must be resolved before convergence. The MEDs are real but mechanical; the LOWs and NITs are polish.

### Required before acceptance

1. **B1.1**: write the literal default-seed derivation in §7.1 step 2 and ADR 5; pick one of the three options listed above. Update §5.4 and ADR 5 wording to match.
2. **H6.1**: pick Path A (rewrite ADR 6 to drop the observability claim and remove the §12 verification test, or replace it with an external-ordering assertion) **or** Path B (add `peekPendingCommands` to `PolicyContext`, add a public accessor on `World`, and add a new ADR for the API expansion). Path A is the lower-cost choice and matches v2's minimal-surface stance.
3. **M3.1**: fix the §14 ADR-count mismatch — either say "7 ADRs in T3" or split them across T1/T2/T3.

### Strongly recommended

4. **L-NEG.1**: add the negative-path determinism test (policy calls `world.random()` → `selfCheck.ok === false`).
5. **M-DOC.1**: if H6.1 resolves as Path B, add the corresponding §13 doc-surface row.

### Nice to have

6. L-EXP.1, N-PHRASE.1, N-ALT.1 — cleanup.

After landing the required fixes, this spec is ready for code-implementation. The architecture is sound; the remaining issues are about precision in the spec text and one mis-stated property.
