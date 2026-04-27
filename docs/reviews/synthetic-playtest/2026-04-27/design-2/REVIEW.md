# Spec 3 (Synthetic Playtest Harness) — Design iter-2 Review Synthesis

**Iteration:** 2
**Date:** 2026-04-27
**Subject reviewed:** `docs/design/2026-04-27-synthetic-playtest-harness-design.md` v2 (commit 8d42522)
**Reviewers:** Codex (gpt-5.4 xhigh), Opus (claude opus xhigh). Gemini still unreachable (quota).

**Verdict:** REJECT (iter-2) — re-spin to v3 required. Iter-1 findings all landed correctly per Opus's verification. New round surfaces 1 BLOCKER + 2 convergent HIGHs + 2 MEDs + several LOW/NITs. All substantive findings are corrections of v2-introduced precision issues, not new architecture problems. Iter-3 expected to converge.

---

## Convergent findings

### [BLOCKER] B1.1 — Default `policySeed = world.random()` collapses to seed 0

**Both reviewers indirectly relevant** — Opus catches it precisely; Codex's iter-2 review didn't surface it but accepted the default-seed text.

`world.random()` returns `[0, 1)` (a float from `nextUint32() / UINT32_SIZE`). `DeterministicRandom`'s `seedToUint32` (`src/random.ts:46-50`) does `Math.trunc(seed) >>> 0` for numbers — collapsing every value in `[0, 1)` to **0**. So *every* default-seeded synthetic playtest uses sub-RNG seed 0, regardless of world state. This silently destroys production-determinism for the default-seed case.

**Fix:** specify the literal seed-derivation expression in §7.1 step 2 and ADR 5: `policySeed = config.policySeed ?? Math.floor(world.random() * 0x1_0000_0000)`. This scales the `[0, 1)` float to a uint32 deterministically without requiring engine-API expansion. Update §5.4 and ADR 5 to use this expression consistently.

### [HIGH] H6.1 — ADR 6 over-claims observability of composed policies' submissions

**Both reviewers flag this as HIGH.** ADR 6 says "later policies see the world's `commandQueue` containing earlier policies' submissions (and `nextCommandResultSequence` advanced)." But `World.commandQueue` and `nextCommandResultSequence` are `private` (`world.ts:252,277`); `docs/architecture/ARCHITECTURE.md:88` explicitly says "Do not access the queue directly". `world.getEvents()` returns the *previous* tick's events. So policies can NOT publicly observe earlier policies' submissions within the same tick.

§12's "ADR 6 verification test" is therefore not testable against the public API.

**Fix (Path A — chosen, matches v2's minimal-surface stance):** rewrite ADR 6 to drop the observability claim. Composed policies share `PolicyContext.world` at policy-call time but do NOT observe each other's submissions during the same tick. The harness submits commands in policy-array order, which is observable externally as `submissionSequence` ordering on the resulting bundle. §6.4, §12, ADR 6 all updated. The §12 "ADR 6 verification test" is replaced with an external-ordering assertion: assert `bundle.commands` is in policy-array order across composed policies on a given tick.

(Path B — add `peekPendingCommands` public surface — was considered but is real new World-API expansion and outside Tier-1 scope. Defer to a future spec if the use case materializes.)

### [HIGH] H-SINK.1 — sinkError control flow is underspecified

**Codex flag.** §7.2 says the harness returns `{ ok: false, stopReason: 'sinkError' }`, but §7.1's tick loop never says to stop once `recorder.lastError` is set — the world keeps advancing after recording has already terminated. Also: `SessionRecorder.connect()` can terminate after `open()`/initial-snapshot failure but still flips `_connected` to `true` (`src/session-recorder.ts:140-145`); `disconnect()` later reads `_sink.metadata` which may already be stale.

**Fix:**
- §7.1 step 4: after `world.step()`, check `recorder.lastError` — if set, break with `stopReason: 'sinkError'`.
- §7.2: add explicit entry for "connect-time sink failure": `recorder.connect()` does NOT throw on initial-snapshot failure (it flips `_connected:true` and stores the error); the harness must check `recorder.lastError` immediately after `connect()` and short-circuit. Returns `{ ok: false, stopReason: 'sinkError', ticksRun: 0 }`.

---

## Findings only one reviewer raised

### Codex [MED] — T1 doc plan under-documented

§14 says T1 (v0.7.20) ships `Policy`, three built-in policies, sub-RNG types, etc., but only updates "api-reference policy types only". AGENTS.md doc-discipline: "docs that land with the change are part of that change." The exported policy *functions* (`noopPolicy`, `randomPolicy`, `scriptedPolicy`) need api-reference sections in T1, not just the types.

(Opus disagrees here, saying "T1 having only a thin doc surface is fine because the harness API doesn't ship until T2." But AGENTS.md's "Always update on every feature / behavior change" applies to T1's symbols regardless.)

**Fix:** §14 T1 explicitly enumerates the api-reference sections it lands: `Policy`, `PolicyContext`, `PolicyCommand`, `StopContext`, `RandomPolicyConfig`, `ScriptedPolicyEntry`, `noopPolicy`, `randomPolicy`, `scriptedPolicy`. Plus changelog + devlog + version bump. The synthetic-playtest.md guide ships in T2 (because the end-to-end pattern requires `runSynthPlaytest`).

### Codex [LOW] — Partial-submit diagnostic wording overstates

§7.2: "the bundle's `commands` length minus `executions` length signals the partial submission to careful readers." But validator-rejected commands already produce recorded commands with no execution (`src/world.ts:733-760`). The gap signals "unexecuted commands," not specifically "policy threw after partial submit."

**Fix:** drop the diagnostic claim. §7.2 just says the partial submission is recorded; `result.policyError` carries the actionable info; the bundle is benign because selfCheck doesn't traverse the abort point.

### Codex [NIT] — §4 / §18 says "eleven" but lists twelve

`Policy`, `PolicyContext`, `StopContext`, `PolicyCommand`, `runSynthPlaytest`, `randomPolicy`, `scriptedPolicy`, `noopPolicy`, `SynthPlaytestConfig`, `SynthPlaytestResult`, `RandomPolicyConfig`, `ScriptedPolicyEntry` = 12.

**Fix:** update §4 and §18 to "twelve."

### Opus [MED] M3.1 — §14 ADR count mismatches body

§14 T3 says "4 ADRs in `decisions.md`". Body has seven (1, 2, 3, 3a, 4, 5, 6). Iter-1's plan said total 6; the addition of ADR 3a wasn't reflected in §14.

**Fix:** distribute ADRs across T-commits per L6's docs-with-the-surface-that-introduces-them: T1 lands ADR 1, 2, 5 (policy interface, read-only world, sub-RNG). T2 lands ADR 3, 3a, 4, 6 (sourceKind extension, set-at-construction, sync single-process, composition without observability). T3 lands no ADRs (just integration tests + drift-log). Update §14 explicitly.

### Opus [LOW] L-NEG.1 — No negative-path determinism test

§12 has positive determinism tests but nothing asserting that a misbehaving policy (calls `world.random()` directly) produces a `selfCheck.ok === false` bundle. Without this, the safety net is unverified — a future regression that lets policies perturb `world.rng` could ship undetected.

**Fix:** §12 adds: "negative case — policy calling `world.random()` directly causes `selfCheck.ok === false` with state divergence at first periodic snapshot." This pairs with the existing tests/determinism-contract.test.ts paired-test pattern.

### Opus [LOW] L-EXP.1 — DeterministicRandom re-export note stale

§9: "`DeterministicRandom`: re-exported from `src/index.ts` if not already". It's already re-exported via `export * from './random.js'` at `src/index.ts:14`.

**Fix:** drop "if not already".

### Opus [LOW] L-FILE.1 — Positive note (no action)

ADR 3a fixes the H1 mutation issue at construction-time, which means `policySeed` also lands in the FileSink manifest on `open()`. Positive consequence; no action.

### Opus [NIT] N-PHRASE.1 — Inconsistent seed derivation phrasing

§5.4, §7.1 step 2, ADR 5 each phrase the default differently.

**Fix:** pin the literal expression in ADR 5 (the rationale section); §5.4 and §7.1 cross-reference.

### Opus [NIT] N-ALT.1 — ADR 5 alternative-considered cryptic

The "save/restore world.rng around each policy batch" alternative explanation is hard to parse.

**Fix:** rewrite per Opus's suggestion.

---

## What v2 got right (positive findings)

Both reviewers explicitly verified:
- B1 sub-RNG architecture (modulo seed-derivation BLOCKER): the sub-RNG-not-`world.rng` separation is the correct call. Per-clause table in §5.1 is exactly what M2 asked for.
- H1 sourceKind ADR 3a: correctly diagnosed iter-1 mutation pattern. SessionRecorder change is type-additive and clean.
- H2 stopReason widening + policyError field: correct semantic direction. `bundle.failures` semantically pure for world failures only.
- M3 StopContext split: not YAGNI. Pre-step vs post-step `tick` semantic is meaningful.
- M4 discriminated unions: standard pattern, doesn't break common usage.
- L1 ADR 3 acknowledgement of `assertNever` break: clean.
- L6 T1/T2/T3 restructure: docs-with-the-surface is the right shape (modulo Codex's MED on T1's coverage).
- N1 "three conceptual primitives + eleven exports": resolved (modulo the eleven-vs-twelve count).

---

## Action plan for v3

1. **B1.1**: §7.1 step 2 + §5.4 + ADR 5 use literal `Math.floor(world.random() * 0x1_0000_0000)` for default seed.
2. **H6.1**: rewrite ADR 6 to drop observability claim; update §6.4 and §12 to match. The harness submits commands inline per policy in array order, but composed policies CANNOT observe earlier submissions through the public API during the same tick. §12's verification test asserts external `submissionSequence` ordering matches policy-array order.
3. **H-SINK.1**: §7.1 step 4 checks `recorder.lastError` post-step; §7.2 adds connect-time failure entry.
4. **Codex MED — T1 docs**: §14 T1 lands api-reference sections for all symbols T1 introduces (types AND functions).
5. **M3.1**: §14 distributes ADRs across T1/T2/T3 commits.
6. **Codex LOW — partial-submit wording**: drop diagnostic claim in §7.2.
7. **Codex NIT — twelve**: update §4 and §18.
8. **Opus L-NEG.1**: add negative-path determinism test to §12.
9. **Opus L-EXP.1**: drop "if not already".
10. **Opus N-PHRASE.1, N-ALT.1**: cleanups.

After v3 lands these, request iter-3 review. Expecting reviewer convergence (nitpicks only) given iter-2's verdict that "architecture is sound; remaining issues are about precision in the spec text."
