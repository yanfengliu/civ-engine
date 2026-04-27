Verified all engine facts and reviewed iter-7 against iter-6's two MEDs.

## Engine fact verification
- `World<TEventMap, TCommandMap, TComponents, TState>` confirmed at `src/world.ts:233` ✓
- `SessionRecorder.connect()` catches `sink.open()` / initial-snapshot failures, stores in `_lastError`, sets `_connected = true`, returns (no throw) — `src/session-recorder.ts:134-145` ✓
- `seedToUint32` does `Math.trunc(seed) >>> 0` at `src/random.ts:46-50`; `Math.trunc(x)` for x ∈ [0,1) is 0, confirming the design's Math.floor scaling rationale ✓
- `step()` advances `world.tick` even on poison (via `finalizeTickFailure → gameLoop.advance()` at `src/world.ts:1888`, listener-phase already advanced), confirming the `ticksRun = K - 1` accounting in §7 ✓

## Iter-6 MED resolution

**M-STOPONPOISONED** ✅ closed. `stopOnPoisoned` removed from `SynthPlaytestConfig` (§7 interface lists only world/policies/maxTicks/sink?/sourceLabel?/policySeed?/stopWhen?/snapshotInterval?). §7.1 step 4 hardcodes stop-on-poison with rationale; §12 line 507 asserts the option does not exist as a positive test claim.

**M-SELFCHECK-PRESTEP** ✅ closed. §10 explicitly narrows: bundle has the (initial, terminal) segment "**provided at least one `world.step()` advanced the world**"; CI guard pattern `expect(result.ticksRun >= 1 && replayer.selfCheck().ok).toBe(true)` documented; §7.1 step 1 validates `maxTicks >= 1` with `RangeError`; §12 covers the `ticksRun === 0` test case explicitly.

## Findings (iter-7)

**NIT-1: stale `stopOnPoisoned` reference in §7.3** — Line 418: "Same `maxTicks` / `stopWhen` / `stopOnPoisoned` / `policySeed`." The field no longer exists. Suggested: "Same `maxTicks` / `stopWhen` / `policySeed`" (optionally `snapshotInterval` for completeness — different intervals produce structurally-different bundles).

**NIT-2: §1 line 18 wording** — "Supports configurable stop conditions (max ticks, poisoned-world detection, custom predicates)." Poisoned-world detection is now always-on built-in behavior, not a "configurable stop condition." Minor.

**NIT-3: §10 line 481 awkward phrasing** — "or a connect-time path that returned successfully but had `recorder.lastError` cleared and policy-throw before step." `recorder.lastError` defaults to null and never gets "cleared" in the success path; the intent is "connect succeeded with `recorder.lastError === null`, then policy throws on tick 1 before the first `step()`."

## Verdict

ACCEPT. The two MEDs are closed; engine facts check out (incl. the subtle `world.tick` advance on poison that drives the §7 ticksRun accounting). NIT-1 is a stale-reference cleanup worth fixing on the way to merge; NIT-2/3 are pure wording. No remaining BLOCKER/HIGH/MED.
