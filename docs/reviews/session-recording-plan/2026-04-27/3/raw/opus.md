I have enough. Producing the iter-3 verdict now.

---

# Iter-3 Plan Review — Session Recording Implementation Plan

**Date:** 2026-04-27. **Reviewer:** Opus iter-3 pass on `2026-04-27-session-recording-implementation-plan.md` v3 vs spec v5.

## Closure verdicts on iter-2 partials/opens

| # | Iter-2 verdict | v3 verdict | Evidence |
|---|----------------|------------|----------|
| CR1, CR2, CR3 | Closed | **Still closed** | Carried forward unchanged |
| H1 (FileSink default policy) | Partial | **Closed** | v3 plan:1277 commits explicitly: "FileSink defaults to sidecar **unconditionally** … There is NO threshold-based branching on FileSink" |
| H10 (engineVersion source) | Partial | **Closed** | T7 plan:1898 commits to `ENGINE_VERSION` from `src/version.ts`; explicit "DO NOT use `process.env.npm_package_version`" |
| M3 (submitWithResult typing) | Partial | **Still partial** | plan:1564 still uses `as typeof world.submitWithResult` cast; generic-method preservation glossed. Acceptable for impl phase. |
| M7 (TDD red-step thinning past T2) | Partial | **Still partial** | T1/T2 explicit; T3 (plan:1149), T5 (plan:1647), T6 (plan:1856) bullet lists only. Minor process residue. |
| L3 (referencesValidationRule placement) | Open | **Still open** | See R5/N3-1 below — same root issue |
| L6 (`ref:{dataUrl:''}` placeholder) | Partial | **Closed** | plan:1224-1227 documents the convention: "The descriptor's ref signals the desired policy. dataUrl payload populated by the sink. (Caller passes a placeholder; sink rewrites.)" |
| R1 (periodic-snapshot guard no-op) | New high | **Largely closed** | Guard form correct (plan:1592 `world.tick > this._startTick && world.tick % interval === 0`). But the connect() sketch (plan:1519-1572) does not show `this._startTick = world.tick;` even though the field declaration at plan:1575 comments "captured in connect()". See N3-3 below. |
| R2 (ENGINE_VERSION in T7) | New high | **Closed** | plan:1898 explicit |
| R3 (World API: `isAliveAtGeneration`/`hasHandler`) | New high | **Closed** | T0.4 (plan:144-197) commits to adding both, with tests. See N3-2/N3-3 nits below. |
| R4 (FileSink default-policy locus) | New medium | **Closed** | plan:1277 explicit; threshold-based branching on FileSink removed |
| R5 (MarkerValidationError top-level field) | New low | **Still open** | v3 `session-errors.ts` (plan:624-629) keeps `(message, details?)` only; spec §11.3:642 says top-level field, §12:648 says in `details`. Spec/plan disagree. |
| R6 (recorder.attach() / public disconnect() not sketched) | New low | **Still partial** | T5 sketch (plan:1499-1642) shows constructor / connect / _onDiff / _terminate / addMarker. attach() and the public disconnect() flow still un-sketched. R4's clean resolution reduces severity (locus is now FileSink-internal, not attach()-internal). |

**Closures in v3:** H1, H10, L6, R2, R3, R4. Net: 22/28 → 26/28 closed.

## Remaining real issues

**N3-1 (low; merges R5+L3). MarkerValidationError top-level `referencesValidationRule` field.** Spec §11.3:642 says it's a top-level field on the error class; §12:648 says it lives in `details`. v3 `session-errors.ts` matches §12, not §11.3. **Fix (one-line):** either (a) extend `MarkerValidationError` ctor signature in T1 plan to accept `referencesValidationRule?: string` as a separate constructor arg promoted to a `readonly` field, OR (b) edit spec §11.3 to read "MarkerValidationError carries `details.referencesValidationRule`". Pick (b) for minimum churn; the plan stays intact and the spec aligns.

**N3-2 (medium). T5 connect() sketch missing `this._startTick = world.tick` capture.** plan:1575 declares `private _startTick = 0; // captured in connect()` and the periodic-snapshot guard at plan:1592 reads it, but the connect() sketch at plan:1519-1572 never shows the assignment. An implementer following the sketch literally will reproduce the iter-2 bug (R1) — `_startTick` stays at `0` and the guard fires for every multiple of `interval` regardless of where the recording started. **Fix:** add one line in the connect() sketch right after the `world.__payloadCapturingRecorder = ...` assignment (≈ plan:1528):

```ts
this._startTick = world.tick;
```

This is mechanical, but until it lands the R1 fix is only half-applied.

**N3-3 (low). T0.4 redundancy with existing `World.isCurrent(ref)`.** `src/world.ts:383` already implements id+generation matching as `isCurrent(ref: EntityRef): boolean`. T0.4 (plan:154) adds `isAliveAtGeneration(id, generation)` which is the same check with a flatter signature. Three options: (a) drop the new method, have marker validation call `world.isCurrent({ id, generation })`; (b) keep the new method as a flat-signature ergonomic alias delegating to `isCurrent`; (c) leave as-is (two near-identical APIs). Prefer (a) — fewer surfaces — unless there's a deliberate reason to have both. Either way, plan should mention `isCurrent` exists so the reviewer/implementer doesn't miss it.

**N3-4 (low). T0.4 `CommandQueue.hasHandler` is a soft commitment.** Verified `src/command-queue.ts` does not currently expose `hasHandler`. Plan:164 says "may also need to be added — verify in `src/command-queue.ts` and add a one-line public check if missing." Make this hard: T0 owns the addition (CommandQueue method + World delegation + tests), not "verify and maybe add."

**N3-5 (low; T8 implementation risk). Worldfactory + `World.deserialize` registration ordering.** plan:1973 pattern is `World.deserialize(snap); setupMoveScenario(w)` — registers components AFTER deserializing. The plan's note (plan:1985) acknowledges "World.deserialize does NOT re-register handlers/validators … Component registrations + handlers must be applied manually **before/after**." The "before/after" wording leaves the order open. If `deserialize` needs registrations present to populate component stores correctly, registrations must precede deserialize (i.e., `const w = new World(...); setupMoveScenario(w); applySnapshot(w, snap)` or equivalent). Will surface during T8; not a plan-correctness blocker but worth tightening before T8 begins.

## Overall assessment

v3 cleanly closes H1, H10, R2, R3, R4, L6 — six of the eight iter-2 partials/opens. The only meaningful residue is N3-2 (the unwritten `this._startTick = world.tick` line that's needed to make R1's guard fix actually work), which is a literal one-line plan edit. N3-1 (referencesValidationRule placement) is a one-line spec/plan alignment. The rest (N3-3/4/5, M3, M7, R6) are nits that surface at implementation, not plan-level defects. **Verdict: convergence reached after N3-2 lands.** Plan is ready for T0 to begin once that line is added.
