# Full Codebase Review — 2026-04-26, iteration 5

Two reviewers ran in parallel against branch `agent/full-review-2026-04-26-iter1` at HEAD `0049ff6` (post-iter-4 test fix). Codex + Opus completed; Gemini quota-exhausted (third+ iteration in a row).

| Reviewer | Output |
|---|---|
| Codex | Codex summary — flagged Critical |
| Gemini | UNREACHABLE — `429 QUOTA_EXHAUSTED` |
| Claude | Opus summary — reported clean / convergence |

**Split decision: Codex was right.** Opus signed off as convergence; Codex caught a real Critical that the C1/R1 denylist could never cover. Verified by code reading.

---

## Executive summary

Codex flagged that even with the denylist exhaustive, a precondition can still mutate world state by editing a returned reference in place — `w.getComponent(e, 'hp')!.current = 0` then return `false`. The store's `.get` returns the live `ComponentStore.data[entityId]` reference, so the predicate's mutation lands on engine state and `commit()` then reports `precondition_failed` over an already-mutated world. This also bypasses dirty tracking. The C1/R1 fix family handled write methods (random, setComponent, setProduction, etc.); none addressed in-place mutation of read returns.

Fix shipped in v0.7.2: the precondition proxy now `structuredClone`s returns from a curated set of read methods that hand back live engine references (`getComponent`, `getComponents`, `getState`, `getResource`, `getResources`, `getPosition`, `getTags`, `getByTag`, `getEvents`). Predicates pay one `structuredClone` per read; preconditions are not the hot path. Three new regression tests pin the headline cases (component, state, resource).

After this fix, the chain is at convergence. Remaining residuals (L_NEW6 `as any` on emit dispatch; world-internal.ts ↔ world.ts circular import; deeper world.ts split) are explicitly acknowledged.

---

## ITER-4 REGRESSIONS

None observed. The L_REG3 test fix (asserting underlying-storage identity instead of mutating the clone-on-read getter) is correct.

---

## CRITICAL

### C_ITER5. Precondition proxy didn't defend against in-place mutation of read-method returns — ✅ Codex
**Reviewer:** Codex.

- **Files:** `src/command-transaction.ts:74-99` (proxy returned methods bound directly), `src/world.ts:451-456` (`getComponent` returns live ref via `ComponentStore.get`), `src/component-store.ts:50-52` (raw return), `src/world.ts:1149-1152` (`getState` returns live ref), `src/world.ts:1083-1085` (`getResource` returns live `ResourcePool`).
- **What's wrong:** The C1/R1/R2_REG1 fixes built an exhaustive denylist of write *methods*. None addressed read methods that return live references into engine-owned storage. A predicate can call `w.getComponent(e, 'hp')` (allowed read), mutate the returned object in place (`hp.current = 0`), return `false`, and the world ends up mutated despite `commit()` reporting `precondition_failed`. The mutation also bypasses dirty tracking because it doesn't go through `setComponent`.
- **Why it matters:** Closes the same atomicity bug class that C1 and R1 were supposed to close. The C1 contract — "world untouched on precondition failure" — is now restored fully, not just for write-method calls.
- **Fix shipped:** Proxy `get` trap now identifies methods in `READ_METHODS_RETURNING_REFS` (`getComponent`, `getComponents`, `getState`, `getResource`, `getResources`, `getPosition`, `getTags`, `getByTag`, `getEvents`) and returns a wrapper that `structuredClone`s the result before the predicate sees it. Three regression tests pin the component, state, and resource cases.

---

## HIGH / MEDIUM / LOW / POLISH

None observed.

---

## NOTES & OPEN QUESTIONS

### Opus reported convergence; Codex caught the Critical. Why the divergence?
- **Note:** Opus's iter-5 review was framed as a final convergence check and reported "no new bugs at any severity." Codex's review identified the in-place-mutation hole independently. The divergence reflects different review framings: Opus verified the iter-4 test fix and re-confirmed prior fixes; Codex reviewed the broader contract surface and identified the residual gap. Convergence requires both perspectives — each subsequent iteration is supposed to either verify clean (Opus path) or find a real bug (Codex path). When they disagree, the right call is to investigate the disagreement — which is exactly what was done, confirming Codex's finding by reading the source.

### Iter-6 verification?
- **Note:** v0.7.2 ships a structurally-tighter fix (clone-on-read in the precondition proxy). The fix is small (~20 LOC) and tested (3 explicit regression cases). Reasonable to skip iter-6 if all gates pass and call the chain converged. If belt-and-suspenders is desired, run iter-6 against the v0.7.2 commit; expect convergence.

---

End of REVIEW.md.
