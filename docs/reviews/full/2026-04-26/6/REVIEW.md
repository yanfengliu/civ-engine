# Full Codebase Review — 2026-04-26, iteration 6

Two reviewers ran in parallel against branch `agent/full-review-2026-04-26-iter1` at HEAD `d58a2f6` (post-v0.7.2). Codex + Opus completed; Gemini still quota-exhausted (fourth iteration in a row).

| Reviewer | Output |
|---|---|
| Codex | `raw/codex.md` — flagged High |
| Gemini | UNREACHABLE — `429 QUOTA_EXHAUSTED` |
| Claude | `raw/opus.md` — reported convergence + 1 cleanup Note |

---

## Executive summary

The iter-5 clone-on-read fix landed correctly for actual live-reference methods (`getComponent`, `getComponents`, `getState`); Opus verified the wrap set's exhaustiveness against `World.prototype` and found no escaping live-reference methods. **But Codex found a structurally-different residual hole: `world.grid` is a public field, not a method on the prototype.** The iter-5 proxy intercepted method calls and forbade direct property assignment on `world` itself, but `w.grid.getAt = () => null` is `set` on the inner SpatialGridView object and bypasses the proxy. Predicate could monkey-patch grid methods, return `false`, and the patch persisted on `world.grid` after the "failed" precondition. Fix shipped in v0.7.3 by `Object.freeze`ing `world.grid` in the constructor — the v0.5.0 read-only-delegate promise is now structural rather than convention-only.

Opus separately flagged a cleanup Note: two entries in `READ_METHODS_RETURNING_REFS` (`getResources` / `getPosition`) don't exist on `World`. Runtime-harmless dead code; iter-5 changelog overstated exhaustiveness. Cleaned up.

---

## ITER-5 REGRESSIONS

None observed. The wrapping fix correctly clones returns from `getComponent`, `getComponents`, `getState`, and similar live-ref read methods. `undefined` / `null` returns are passed through safely. Methods that already self-clone (`getResource`, `getByTag`, `getTags`, `getEvents`, `getDiff`, `getMetrics`, `getLastTickFailure`, `getTransfers`, `getEntityRef`) are doubly-defensive (harmless).

---

## CRITICAL

None observed.

---

## HIGH

### H_ITER6. `world.grid` is a public sub-object; predicate could monkey-patch its methods — ✅ Codex
**Reviewer:** Codex.

- **Files:** `src/command-transaction.ts:114-129` (proxy passes non-function properties through), `src/world.ts:269` (`readonly grid: SpatialGridView` declaration), `src/world.ts:309-317` (constructor builds plain object).
- **What's wrong:** The iter-5 proxy intercepted method calls and forbade direct property assignment on the `world` proxy itself (`set(_target, prop) { throw }`). But it passed non-function properties through as-is — `w.grid` returns the live SpatialGridView reference. `w.grid.getAt = () => null` is `set` on the inner object, completely outside the proxy. After a predicate did this and returned `false`, `commit()` reported `precondition_failed` but `world.grid` stayed patched.
- **Why it matters:** Closes the same atomicity bug class that C1, R1, R2_REG1, and C_ITER5 were each closing along a different axis. The C1 contract — "world untouched on precondition failure" — needed three complementary mechanisms to hold structurally: denylist (write methods), clone-wrap (read returns), freeze (public sub-objects). v0.7.3 ships the third.
- **Fix shipped:** `this.grid = Object.freeze(gridView)` in the constructor. Cleanest solution because the v0.5.0 doc already promised "read-only delegate" — `Object.freeze` makes the promise structural. Predicates (and any other code) attempting to write to `world.grid` properties throw `TypeError` in strict mode (vitest default). 1 new regression test pins the behavior.

---

## MEDIUM / LOW / POLISH

None observed.

---

## NOTES & OPEN QUESTIONS

### N1 (from Opus). `getResources` and `getPosition` are dead entries in `READ_METHODS_RETURNING_REFS`
- **File:** `src/command-transaction.ts:87-97`.
- **Note:** Both names were in the iter-5 wrap set but neither method exists on `World`. The proxy `get` trap only fires when a name is actually accessed, so dead entries are runtime-harmless. The iter-5 changelog and review enumerated these as "the curated set," which overstates exhaustiveness. Cleaned up in v0.7.3.

### N2. Convergence achieved
- **Note:** Three iterations of "split decision" pattern (iter-5 Codex caught Critical that Opus missed; iter-6 Codex caught High that Opus missed) suggest two-perspective review is robust to single-reviewer false-negatives — Codex's broader-surface scans complement Opus's verification scans. After v0.7.3, the C1 contract is defended by three structurally-different mechanisms (denylist + clone-wrap + freeze), each with regression tests. Further iterations would catch only nitpicks.

---

End of REVIEW.md.
