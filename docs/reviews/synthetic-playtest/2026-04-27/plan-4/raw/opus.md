All iter-3 findings verified against v4. My review:

## Iter-4 review findings

### HIGH (all resolved)

- **HIGH-1 e.executionTick → e.tick:** v4:1189 uses `(e) => e.tick === 1`. Matches `CommandExecutionResult.tick` at world.ts:155 (no `executionTick` field exists). ✓
- **HIGH-2 type RandomPolicyConfig in T2 step 5 imports:** v4:740 adds `type RandomPolicyConfig` alongside `type PolicyContext` and `type WorldConfig`. Step 9's production-determinism block now compiles. ✓
- **HIGH-3 FileSink test named-import style:** v4:694-718 uses `mkdtempSync(join(tmpdir(), 'civ-engine-fsink-'))` + `rmSync(tmpDir, ...)` in try/finally, reuses `mkSnapshot(0)`. All needed imports already exist in `tests/file-sink.test.ts:1-5`. Verified `FileSink` constructor at `session-file-sink.ts:88-108` does pre-load `_metadata` from existing manifest, so the `new FileSink(tmpDir)` re-open assertion will work. ✓
- **HIGH-4 Drop DeterministicRandom from T3 step 1:** v4:1399-1409 imports only `SessionReplayer, World, noopPolicy, randomPolicy, runSynthPlaytest, scriptedPolicy, type WorldConfig, type PolicyContext`. No DeterministicRandom. ✓

### MED (both resolved)

- **MED-1 T2 step 8 lint timing:** v4:1058-1063 runs `npm test` + `npm run typecheck` only at step 8, with explicit note that lint+build run at step 11 once step 9's tests consume MemorySink and randomPolicy. Chosen option (b) per iter-3's three-option fix. ✓
- **MED-2 production-determinism strengthening:**
  - T2 step 9 (v4:1217-1257): compares commands(length+type+data+submissionTick), executions(length+tick+sequence), ticks(length+tick+diff+events), snapshots(length+initial+last), failures, and stable metadata(startTick+endTick+durationTicks+sourceKind+policySeed). Comment notes sessionId/recordedAt deliberately fresh.
  - T3 step 2 (v4:1479-1509): compares commands, executions, ticks(diff only — minor: doesn't include events as T2 does), snapshots(initial+last), and stable metadata(endTick+policySeed only — less exhaustive than T2's 5 fields). Functionally strengthened over v3, though slightly less thorough than T2 step 9. Not a blocker since selfCheck round-trip in T3 step 1 covers events independently.
  ✓

### NITs (carried from iter-3, user allows)

- NIT-1 mid-tick sink Proxy still has brittle `this`-binding instead of subclass approach.
- NIT-2 connect-time-sink-failure mock still has wrong method names (`writeFailure` vs `writeTickFailure`, `writeExecution` vs `writeCommandExecution`, phantom `finalize`/`readSnapshots`/etc.) hidden by `as any`. Functionally harmless since `open()` throws first, but misleading. A `class FailingSink extends MemorySink { open() { throw ...; } }` would be cleaner.
- NIT-3 redundant `as any` casts on policies that are already structurally typed.
- NIT-4 redundant `Number.isFinite` check (Number.isInteger already excludes NaN/Infinity).
- NIT-5 sink-failure tests still missing cross-references to recorder code paths.

### No new HIGH/MED introduced by v4

Spot checks: T3 step 4 poisoned-bundle replay throw expectation is correct (failedTicks=[3] doesn't satisfy `ft >= 0 && ft < 3`, so the [0,3] segment isn't skipped → selfCheck reproduces poison). T3 step 5 vacuous-ok pre-step abort works because no-payload short-circuit at session-replayer.ts:271 doesn't fire when `endTick === startTick === 0`. T2 step 9 mid-tick sink `snapshotInterval:2` math: initial(writes=1) → tick 1 (not interval) → tick 2 (periodic fires, writes=2 throws → _terminated) → harness post-step `recorder.lastError !== null` → break with sinkError; disconnect skips terminal due to _terminated. ok = false. All correct.

## ACCEPT
