# player-observation — design review, iteration 3 (confirmation round)

**Reviewed:** DESIGN.md v3. **Reviewers:** Codex (gpt-5.5 xhigh), Gemini (3.1-pro plan), Claude (fable-5 1m max).

## Verdicts

**UNANIMOUS CONVERGED.** All eight design-2 fixes verified against the live codebase by all three reviewers:

1. `World.getMetaEntries(entity)` prerequisite — gap confirmed real (only per-key `getMeta` exists; diff metadata is changed-this-tick only); prerequisite closes it.
2. Deep-clone of ALL payloads including worldState — `getState` returns live stored references; cloning strictly necessary.
3. `player_observer_world_poisoned` guard — listener-phase failures leave `currentDiff` intact with sequential tick numbers (world-tick.ts `failure.phase !== 'listeners'` finalize path), invisible to the gap check; guard required.
4. Destroyed attribution from observer-stored `lastKnownPosition` — `TickDiff.entities.destroyed` is bare ids; no diff channel carries destroyed positions.
5. `reset()` as contract, gap detection as backstop — same-tick `applySnapshot` evasion confirmed (sets tick, clears poison, nulls diff).
6. Construction ≡ implicit `reset()` — coherent with `snapshot()` priming.
7. Bound `isVisible` returns false out-of-grid — `VisibilityMap.isVisible` → `toIndex` → `assertGridPoint` throws there.
8. Position-removal-while-visible test case present with both `positionless` expectations.

## Residual

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| Claude LOW | LOW | Bound `isVisible` as worded is still not total: `assertGridPoint` throws `visibility_coords_not_integer` for fractional inputs BEFORE the bounds check, so a resolver feeding continuous-position event coords would throw through the wrapper | PINNED for PLAN.md: bound `isVisible(x, y)` returns false for ANY coordinate that is not an in-grid integer cell (fractional included); test alongside the out-of-grid case |

## Disposition

Design phase CLOSED at v3. Proceed to PLAN.md + implementation; the LOW lands as a PLAN line item and test.
