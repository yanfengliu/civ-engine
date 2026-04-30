# Bundle Hotspots Implementation Iter-3 Review

**Date:** 2026-04-30
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE — produces iter-4 (both findings real and addressed)

## Findings

### F1 (Codex) — execution_failure semantics inaccurately documented
The api-reference, changelog, and test rationale all said execution_failure means "handler threw but tick continued" / "not fatal to the tick" / "not typically produced by the engine." Verified against `src/world.ts:1783-1875`: the engine writes `executions[i].executed === false` for THREE cases:
1. Missing handler (no command processing)
2. Thrown handler (also produces a TickFailure for the same tick)
3. Commands dropped because the tick already aborted

So an `execution_failure` hotspot may accompany a `tick_failure` at the same tick rather than indicating a benign per-command failure.

**Fix:** Severity rule clarified in both `docs/api-reference.md` and `docs/changelog.md`: "execution_failure → always `medium` (recorded executions[i].executed === false — emitted by the engine for missing handlers, thrown handlers, AND commands dropped because the tick already aborted; an execution_failure hotspot may accompany a tick_failure at the same tick)." Test rationale comment in `tests/bundle-hotspots.test.ts` rewritten to reflect actual engine behavior.

### F2 (Claude) — Math formula in short-bundle z-score note is wrong
The note said max z = `(n-1)/√n`, but for population stdev (denominator n, not n-1) the correct max is `√(n-1)`. Concrete example: n=11, ten zeros + one sample at 11 → μ=1, σ_pop=√10, z=10/√10=√10≈3.162. The wrong formula gave 10/√11≈3.015. The bound difference matters at the boundary: at n=10 the docstring formula said outliers cannot occur but the true bound √9=3 exactly equals threshold 3, and the code's `<` filter means pathological data CAN trigger the flag. The "regardless of how skewed" claim was technically false at n=10.

**Fix:** Both `src/bundle-hotspots.ts` doc-comment and `docs/api-reference.md` "Short-bundle note" updated to `√(n-1)`. Conclusion narrowed to "bundles with <10 metric-bearing ticks cannot produce duration outliers regardless of how skewed the distribution is, and at n=10 only the extreme pathological case (one sample at the maximum, all others equal) reaches the boundary."

## Verified clean

All iter-2 NIT fixes verified holding by Claude:
- Stale doc test counts (now 1075 / 12 tests)
- Vacuous cap test removed; replacement has non-emptiness check
- "deduped per tick" comment fixed
- Within-tick ordering test exercises all four kinds

Implementation otherwise sound: single-pass scan, deterministic sort, correct null-handling, defensive guards, only-high-tail flagging matches docstring.

## Disposition

ITERATE → 2 doc-accuracy fixes addressed; iter-4 sanity check follows.
