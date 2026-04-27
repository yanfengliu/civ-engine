I've completed thorough verification of the T3 diff against the engine facts and run all gates. Findings below.

---

## Review verdict: ACCEPT (with two LOW/NIT doc accuracy notes)

### Verification performed

- **All 4 gates pass:** `npm test` (798 + 2 todo, 7 new in `synthetic-determinism.test.ts`), `npm run typecheck` clean, `npm run lint` clean. Build implicit via tsc.
- **All 7 new tests pass** (verbose run confirms each case).
- **Engine-facts cross-check:** World 4-generic at `world.ts:233` ✓, `CommandExecutionResult.tick` only ✓, no-payload short-circuit at `session-replayer.ts:270-276` ✓, failed-segment skip `failedTick >= a.tick && failedTick < b.tick` at `session-replayer.ts:286` ✓, `world.tick` advances on poison via `finalizeTickFailure` line 1888 ✓.

### Test correctness — all 7 valid

1. **selfCheck round-trip** — Asserts `ok && stopReason==='maxTicks' && ticksRun>=1`, then `selfCheck().ok`. Correct contract.
2. **Production-determinism dual-run** — Strips `metrics` (whose `durationMs.{total,commands,systems,resources,diff}` and per-system `durationMs` are `performance.now()`-backed) and metadata `sessionId`/`recordedAt`. All other fields verified deterministic given identical `policySeed`.
3. **Sub-RNG positive** — Each tick emits a spawn cmd so `commands.length>0` (avoids 270-276 short-circuit). `ctx.random()` only advances sub-RNG; replay reproduces.
4. **Sub-RNG negative** — Policy calling `ctx.world.random()` advances `world.rng` during recording but not replay (policy isn't invoked during replay). At terminal snapshot, `rng-result` component values diverge → `stateDivergences.length > 0`. Confirmed by trace.
5. **Poisoned-bundle replay** — Traced: `lw.tick === 3` triggers on the 4th step (gameLoop.tick=3 before advance). `failedTicks=[4]`, terminal snapshot at tick 4. Segment (0,4): `4>=0 && 4<4 → false` → NOT skipped → replay re-throws at tick 4. Asserts `.toThrow()`. Correct.
6. **Pre-step abort vacuous** — Policy throws on first call before `world.step()`. `ticksRun=0`, terminal snapshot at tick 0. Single zero-length segment, inner loop iterates 0×, end-state check trivially equal. `ok:true`. Correct.
7. **Bundle → script `+1` regression** — Confirmed: `submissionTick = world.tick BEFORE step = PolicyContext.tick - 1`, so `+1` reconstructs the executing tick that `scriptedPolicy` matches against `ctx.tick`. Test asserts identical type/data/submissionTick.

### Coverage vs. design v10 §12/§18 — complete

T3 covers exactly the cases §12/§18 reserved for cross-cutting determinism (the rest live in T1 unit tests + T2 harness tests). No gaps.

### Anti-regression

- T1's 13 policy tests + T2's 19 harness tests still pass.
- Existing 759 tests pre-T3 → 798 post-T3 (39 new across T1+T2+T3 = 13+19+7) all green.
- No production-code edits in T3 → no risk to T1/T2 contracts.

---

### Findings

**[LOW] `docs/design/ai-first-dev-roadmap.md` — Spec 1 version range off by one**

Roadmap claims `Implemented (v0.7.6 → v0.7.19)`, but `v0.7.6` was the multi-CLI iter-8 convergence check (unrelated to session-recording). Session-recording starts at `v0.7.7-pre` (T0 setup) / `v0.7.7` (T1 bundle types). Recommend `v0.7.7 → v0.7.19` (or `v0.7.7-pre → v0.7.19`).

**[NIT] Doc wording — "first periodic snapshot" is inaccurate for the negative sub-RNG test**

`docs/changelog.md` and the detailed devlog say the negative test "causes selfCheck divergence at first periodic snapshot." With `maxTicks: 20` and default `snapshotInterval: 1000`, the bundle has no periodic snapshots — divergence is detected at the **terminal** snapshot (the only non-initial endpoint). The test still proves the safety net; the wording is inherited from design v10 §12 verbatim but doesn't match what the implementation actually exercises.

**[NIT] `ARCHITECTURE.md` row mentions "New in v0.7.20 + v0.8.0 (Spec 3)"** — omits `v0.8.1`. Defensible since T3 is tests+docs only, but the drift-log entry includes all three for parity.

None of these block merge.
