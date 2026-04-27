I have enough to write the review. Let me compose findings.

---

# Iter-3 Review — Synthetic Playtest Harness Design Spec

**Reviewing:** `docs/design/2026-04-27-synthetic-playtest-harness-design.md` (commit cee11a8)
**Verifying against:** iter-2 review at `docs/reviews/synthetic-playtest/2026-04-27/design-2/REVIEW.md`

---

## Iter-2 fixes — verification

All eleven items from iter-2's action plan landed correctly:

| # | Item | Landing site | Status |
|---|---|---|---|
| 1 | B1.1 literal seed expression | §5.4 / §7.1 step 2 / ADR 5 — all three carry `Math.floor(world.random() * 0x1_0000_0000)` | ✓ |
| 2 | H6.1 ADR 6 rewrite (drop within-tick observability) | ADR 6 + §6.4 + §12 all say composed policies don't observe each other within a tick; `submissionSequence` ordering is the externally testable property | ✓ |
| 3 | H-SINK.1 explicit `recorder.lastError` checks | §7.1 step 3 (post-connect) + step 4 (post-step); §7.2 has connect-time + mid-tick entries | ✓ |
| 4 | M3.1 ADR distribution | §14: T1 lands ADRs 1/2/5, T2 lands 3/3a/4/6, T3 none — totals 7 | ✓ |
| 5 | Codex MED — T1 doc enumeration | §14 T1 lists all nine T1 symbols by name (types AND functions) | ✓ |
| 6 | Codex LOW — drop partial-submit diagnostic | §7.2 acknowledges `commands.length > executions.length` gap is also produced by validator-rejected commands; `result.policyError` is the authoritative signal | ✓ |
| 7 | Codex NIT — twelve | §4 + §18 say twelve and the §4 list enumerates 12 | ✓ |
| 8 | L-NEG.1 negative-path determinism test | §12 has the misbehaving-policy-calls-`world.random()` → `selfCheck.ok=false` case | ✓ |
| 9 | L-EXP.1 — drop "if not already" | §9 now says "already re-exported … at `src/index.ts:14`" | ✓ |
| 10 | N-PHRASE.1 — pin literal in ADR 5 | ADR 5 carries the literal expression and §5.4 + §7.1 cross-reference it | ✓ |
| 11 | N-ALT.1 — clearer alternative-considered | ADR 5's save/restore alternative explanation is now clear: the silent-shadowing problem and the "you're back to per-policy sub-RNGs" reductio ad absurdum land cleanly | ✓ |

I also spot-checked the code-reference precision the spec leans on:
- `seedToUint32` collapse claim at `src/random.ts:46-50` — verified, `Math.trunc(seed) >>> 0` would map every `[0, 1)` float to `0`.
- `SessionRecorder.connect()` at `src/session-recorder.ts:140-145` — verified, the catch block `_handleSinkError(e); _connected = true; return` does not throw on `sink.open()` failure.
- `World.commandQueue` (line 252) and `nextCommandResultSequence` (line 277) are `private` — verified.
- `ARCHITECTURE.md:88` "Do not access the queue directly" — verified literally.
- `tests/command-transaction.test.ts:567` precedent ("predicate cannot call random()") — verified.
- `src/index.ts:14` `export * from './random.js'` — verified.

ADR 3a's claim that engine-internal consumers don't branch on `sourceKind` — verified: only producers (`session-recorder.ts:131` literal `'session'`, `session-scenario-bundle.ts:71` literal `'scenario'`) appear in `src/`.

---

## New issues in v3

### [LOW] L-TICKS.1 — `ticksRun` semantic is asymmetric across stop reasons

§7.1 step 4 places `Increment ticksRun` as the LAST sub-step of each loop iteration, after `world.step()`, `recorder.lastError` check, and `stopWhen` check. Combined with the "break before increment" pattern on early-stop paths, the semantics differ across stop reasons:

| stopReason | World ticks executed (from `world.tick - startTick`) | `ticksRun` reported | Match? |
|---|---|---|---|
| `maxTicks` | N | N | ✓ |
| `stopWhen` (predicate fires after step K) | K | K-1 | ✗ |
| `poisoned` (step throws on tick K) | K-1 (failed tick consumes a number) | K-1 | borderline |
| `sinkError` mid-tick (step ran on tick K, recorder write failed during it) | K | K-1 | ✗ |
| `policyError` (policy throws before step on tick K) | K-1 | K-1 | ✓ |

The `stopWhen` and `sinkError` rows are the real asymmetry: step did execute, the bundle has a tick entry recorded, but `ticksRun` is one less than the world advanced. Callers asserting `ticksRun === bundle.ticks.length` would fail; callers using `ticksRun` to decide whether `stopWhen` saw at least one tick get an off-by-one.

This isn't a correctness blocker — the bundle is the source of truth — but the public contract is ambiguous. Either:
1. Move `Increment ticksRun` to immediately after the post-step `recorder.lastError` check (so `ticksRun` = "ticks where `step()` completed"), or
2. Document explicitly on `SynthPlaytestResult.ticksRun` that the value is "loop iterations that ran to completion without triggering a stop", which intentionally excludes the trigger iteration even when its `step()` succeeded.

Option 1 is the cleaner contract; option 2 is just a doc fix. Either is fine.

### [NIT] N-SNAPSHOT.1 — ADR 6 wording suggests world snapshot semantics

ADR 6 §15 says "they receive the same `PolicyContext.world` snapshot at policy-call time". "Snapshot" reads as "frozen copy at a point in time"; the world is a live reference and earlier-policy submissions DO mutate the (private) command queue — they just aren't observable through the public API. The intended meaning is "the same publicly-observable world state" or "the same `world` reference, with no public surface that would expose earlier submissions". Either rephrase is fine. Cosmetic only.

### [NIT] N-FUTURE-SPECS.1 — §17 future specs table not in numeric order

§17 lists future specs in order 8, 9, 7, 5. Reordering to 5, 7, 8, 9 (or by relevance with a one-line comment) would be marginally clearer, but this is purely cosmetic and the ordering isn't load-bearing.

---

## Confirmation that prior concerns stayed fixed

- §7.1 step 2 calls `world.random()` BEFORE `recorder.connect()` — initial snapshot reflects post-derivation `world.rng` state, so replay reproduces. Properly preserved across v2→v3.
- §7.2 connect-time entry correctly notes that `recorder.connect()` does NOT throw on `sink.open()` failure (it flips `_connected=true` and stores the error) — matches `session-recorder.ts:140-145` exactly.
- §12 negative-path test pairs cleanly with the existing `tests/command-transaction.test.ts:567` precedent — gives a concrete CI-detectable signal that the sub-RNG safety net works.
- ADR 6's external `submissionSequence`-ordering test in §12 is testable against the public bundle surface (`bundle.commands[].submissionSequence`) — no private-state inspection required.

---

## Verdict

**ACCEPT.** The spec is ready for implementation. The three findings above are all sub-BLOCKER/HIGH; L-TICKS.1 is a contract-precision concern that's worth a one-sentence clarification on `SynthPlaytestResult.ticksRun` (or a small reorder of step 4 sub-steps), and the two NITs are cosmetic. No architectural or correctness issues remain. Reviewers are now nitpicking, which matches the iter-2 prediction that "iter-3 expected to converge".

Implementation can proceed with T1 → T2 → T3 per §14, optionally folding the L-TICKS.1 clarification into the T2 commit that ships `runSynthPlaytest` + lifecycle docs.
