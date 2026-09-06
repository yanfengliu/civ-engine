# Strict Mode — Plan Iteration 1 Review (2026-04-29)

**Disposition:** Iterate (substantive). Codex 2 BLOCKERS + 3 majors + 3 minors; Claude 3 majors + 4 minors. v2 addresses all of them; expand Step 1 contract coverage, fix the LOC and src/index.ts gaps, and tighten Step 11 prompt construction.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max).

## Findings + dispositions

### Codex BLOCKER — `_inTickPhase` clearing position

The "existing finally block" in `runTick` clears `activeMetrics` BEFORE diff listeners and `onTickFailure` listeners fire. Clearing `_inTickPhase` there violates DESIGN §9's listener-side mutation contract.

**v2:** Architecture spells out an outer try/finally wrapping the entire tick path (commands → systems → resources → diff → diff listeners → metrics → onTickFailure listener emission). The outer finally clears `_inTickPhase` *after* listeners fire. Step 4 makes this explicit.

### Codex BLOCKER — `src/types.ts` missing from File Map

`WorldConfig` lives in `src/types.ts`, not `world.ts`. Adding `strict?: boolean` requires editing `src/types.ts`.

**v2:** File Map lists `src/types.ts`. Step 3 (new) updates the interface there.

### Codex MAJOR / Claude MAJOR — Step 1 missing test categories

Six DESIGN §9 contracts not enumerated: explicit `endSetup()` before any step, `onDiff` listener mutations, `onTickFailure` listener mutations, three `CommandTransaction.commit()` cases, `deserialize()`, `pause`/`resume`/`setSpeed`.

**v2:** Step 1 expanded to 23 explicit test categories matching DESIGN §9.

### Codex MAJOR — Step 6 negative-list incomplete

The "NOT gated" verification omitted `pause`, `resume`, `setSpeed`, `recover`, `serialize`, `getDiff`, `getMetrics`, `getEvents`, `getState`, all `get*`/`has*`/`is*` reads, listener add/remove, `applySnapshot`, `deserialize`.

**v2:** Step 6 lists every "explicitly NOT gated" item from DESIGN §6.

### Codex MAJOR / Claude MINOR — Step 11 missing AGENTS.md doc-accuracy addendum

**v2:** Step 11 prompt construction includes the verbatim AGENTS.md doc-accuracy reviewer addendum, the `until`-poller wait pattern, and the `tmp/review-runs/.../<N>/` raw-capture path. Tie-breaker prompt requirement now forces binary ACCEPT/REJECT with prescriptive patch on REJECT.

### Claude MAJOR — Missing explicit `src/index.ts` export step

Tests in Step 1 import from `../src/index.js`; without an explicit step that adds the new exports, Step 7 ("Run failing tests until green") cannot pass.

**v2:** New Step 5 dedicated to `src/index.ts` exports of `StrictModeViolationError` and `StrictModeViolationDetails`. The new `World` methods auto-flow via the existing `World` re-export; `WorldConfig.strict` flows via the existing `WorldConfig` type re-export.

### Claude MAJOR — LOC risk register inaccurate

`src/world.ts` is already at **2379 LOC** (verified via `wc -l`), 4.7× over the AGENTS.md 500-LOC cap. Saying strict-mode work "may push it past 500" understates the existing debt.

**v2:** Risk register acknowledges the pre-existing overage explicitly; pre-commits to creating `src/world-strict-mode.ts` for the new helpers (Step 2 + File Map). Reviewers in Step 11 are scoped to not block on the world.ts overage.

### Codex MINOR / Claude MINOR — "~33" mutation count

The accurate count of implementation bodies is 22; "~33" includes overload signatures.

**v2:** Architecture says "22 implementation bodies, counting overload signatures higher"; Step 6 lists exactly 22.

### Other minors folded in

- Step 1 prose said §11 (typo); should be §9. Fixed.
- Step 11 tie-breaker prompt forces binary ACCEPT/REJECT with mandatory prescriptive patch on REJECT.

## Disposition

Re-review as plan-2.
