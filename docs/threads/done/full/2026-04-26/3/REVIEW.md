# Full Codebase Review — 2026-04-26, iteration 3

Two reviewers ran in parallel against branch `agent/full-review-2026-04-26-iter1` at HEAD `eaac9b5` (post-v0.7.0). Codex + Opus completed; Gemini hit `429 QUOTA_EXHAUSTED` after the iter-2 burn and was unreachable. Per AGENTS.md: two converging reviews are useful signal — proceeding.

| Reviewer | Model | Mode | Output |
|---|---|---|---|
| Codex | `gpt-5.4`, `model_reasoning_effort=xhigh` | `codex exec`, sandbox `read-only`, `--ephemeral` | Codex summary |
| Gemini | `gemini-3.1-pro-preview` | `gemini -p` | **UNREACHABLE — quota exhausted** |
| Claude | Opus 4.7 (1M context) | `claude -p`, read-only allowedTools | Opus summary |

PROMPT at shared review prompt, not retained.

---

## Executive summary

**Codex caught two iter-2 fix-quality regressions; Opus independently flagged the same two as Notes (N1 + the L_NEW3 contract gap) plus a doc-drift item.** Both regressions are real and fixable in a single follow-up commit:

1. **R1 hole still open:** `World.warnIfPoisoned(api)` is public, mutates the `poisonedWarningEmitted` flag, and was missing from `FORBIDDEN_PRECONDITION_METHODS`. A predicate could call it to consume the warn-once latch and suppress the next legitimate write surface's warning. The iter-2 changelog explicitly claimed exhaustiveness; the claim was false by one method.
2. **L_NEW3 backstop removal regresses object-T sparsity:** The iter-2 commit removed `getState`'s default-equality filter on the assumption "writers always strip." But `forEachReadOnly` (added in iter-1) deliberately exposes live object references, and a contract-violating caller can mutate a stored object to equal `defaultValue`. Without the post-hoc filter, `getState` then emits a default-equal cell, breaking the documented sparsity contract via a public API.

What held up: H_NEW1 (forEachReadOnly null), H_NEW2 (per-value primitive check), M_NEW1/M_NEW2 (single-validate), L_NEW1 (terminalReason), L_NEW2 (clone single-clone), L_NEW4/L_NEW5/L_NEW7 (doc + test polish).

**Recommended fix order:** add `warnIfPoisoned` to FORBIDDEN, restore object-T fingerprint filter in `getState`, fix the api-reference's now-incomplete `commit()` error-message doc, add a meta-test that catches future denylist holes by cross-checking against `World.prototype`. One commit.

---

## ITER-2 REGRESSIONS

### R2_REG1. `warnIfPoisoned` is callable from preconditions — R1 hole — ✅
**Reviewers:** Codex (regression of R1), Opus (Note N1, same root cause). **Iter-2 ID:** R1.

- **Files:** `src/command-transaction.ts:11-39` (FORBIDDEN array), `src/world.ts:653-659` (`warnIfPoisoned` is public, mutates state), `docs/api-reference.md:3437-3441` and `docs/changelog.md:18-22` (claim of exhaustiveness).
- **What's wrong:** `warnIfPoisoned(api)` is public, stateful (`if (!this.poisoned || this.poisonedWarningEmitted) return; this.poisonedWarningEmitted = true; console.warn(...)`), and not in `FORBIDDEN_PRECONDITION_METHODS`. Predicates can call `w.warnIfPoisoned('hijacked')` to consume the warn-once latch. The next legitimate write surface (`submit`, `serialize`, `transaction.commit`) then suppresses its warning because the flag is already set. The iter-2 changelog claims the list is "exhaustive against `World`'s public mutating, lifecycle, listener, RNG, and sub-engine surface" — that claim is false by one method.
- **Why it matters:** A failed precondition can still produce an observable side effect (consuming the warn-once latch) and silently degrade the engine's diagnostic output for the next real failure. Same root cause as iter-1's R1 — list maintained by hand, missed an entry. Iter-2 added the property-based test, but the test only iterates the array; it does not cross-check against `World.prototype`, so the hole stayed invisible.
- **Recommended fix:** Add `'warnIfPoisoned'` to `FORBIDDEN_PRECONDITION_METHODS`. Add explicit regression test asserting a predicate cannot call `w.warnIfPoisoned(...)`. Add a meta-test that compares `FORBIDDEN_PRECONDITION_METHODS` against `Object.getOwnPropertyNames(World.prototype)` filtered for known read methods + private methods, so future denylist holes fail the suite.

### R2_REG2. `getState` strip-at-write filter removal regresses sparsity for object T — ✅
**Reviewer:** Codex. **Iter-2 ID:** L_NEW3.

- **Files:** `src/layer.ts:154-176` (the L_NEW3 fix removed the post-hoc fingerprint filter), `tests/layer.test.ts:661-673` (pins `forEachReadOnly` exposes live object references).
- **What's wrong:** L_NEW3 removed `getState()`'s `if (jsonFingerprint(value) === this._defaultFingerprint) continue;` filter, citing "every public path that inserts strips defaults — `cells` is `private`, no public bypass exists." That assumption was correct for writers (`setCell`, `setAt`, `fill`, `fromState`) but missed `forEachReadOnly`: the iter-1 read-only path returns live references for object T, and the documented "caller must not mutate" contract is exactly the kind of contract real callers will eventually violate. When they do, `getState` now serializes a default-equal entry instead of stripping it. The documented "strip-at-write sparse" guarantee becomes false through a public API.
- **Why it matters:** Defensive sparsity is one of `Layer<T>`'s headline guarantees. The L_NEW3 commit traded off ~ε perf (per-stored-cell `jsonFingerprint` on serialize) for the ability to emit broken snapshots when contract violations occur. Wrong trade.
- **Recommended fix:** Restore the post-hoc filter for object T only (skip the check for primitive T, where the contract violation can't happen because primitives are immutable). One-line conditional.

---

## CRITICAL

None observed.

---

## HIGH

None observed.

---

## MEDIUM

None observed.

---

## LOW / POLISH

### L_REG1. api-reference.md says `commit()` after `commit()` always throws "already committed"
**Reviewer:** Opus.

- **File:** `docs/api-reference.md:3454`.
- **What's wrong:** L_NEW1 (the iter-2 fix to `commit()`'s error message) made the message reflect `terminalReason` — so after `abort()` + `commit()` + `commit()`, the second commit throws "already aborted", not "already committed". The doc was not updated to match.
- **Recommended fix:** Update the api-reference line to describe the post-L_NEW1 behavior.

### L_REG2. Property-based denylist test only iterates the array, does not prove "every public mutator is in the list"
**Reviewers:** Codex, Opus (N3, same observation).

- **File:** `tests/command-transaction.test.ts:473-499`.
- **What's wrong:** The new R1 regression test iterates `FORBIDDEN_PRECONDITION_METHODS` and asserts every listed name throws when called from a precondition. It does NOT cross-check the list against `World.prototype`. R2_REG1 (the missing `warnIfPoisoned`) is exactly the failure mode this gap allows.
- **Recommended fix:** Add a meta-test that enumerates `Object.getOwnPropertyNames(World.prototype)`, filters known read-only + private methods, and asserts every remaining name is in `FORBIDDEN_PRECONDITION_METHODS`. Falls out of R2_REG1's fix.

### L_REG3. L_NEW2 has no explicit single-clone regression test
**Reviewer:** Opus (N6).

- **File:** `tests/layer.test.ts` (no test pinning the L_NEW2 behavior).
- **What's wrong:** L_NEW2 fixed the double-clone in `Layer.clone()`. No test was added to pin the single-clone behavior. Future regressions would not fail any test.
- **Recommended fix:** Add a test that mutates the cloned layer's `defaultValue` accessor and asserts the original's default is unchanged.

---

## NOTES & OPEN QUESTIONS

### N4 (from Opus). Property-based test has a dead branch
- **File:** `tests/command-transaction.test.ts:482-486`.
- **Note:** `if (typeof fn !== 'function') return true;` is dead code — every entry in `FORBIDDEN_PRECONDITION_METHODS` exists on `World.prototype` as a function. Once R2_REG1's fix adds the meta-test that cross-checks the array, this branch becomes unreachable; can be deleted.

### N5 (from Opus). `matchesDefault` comment slightly misleading
- **File:** `src/layer.ts:296-303`.
- **Note:** Comment says "per-value primitive check is fine here too" but the implementation uses cached `_defaultIsPrimitive`. Minor wording cleanup.

### N2 (from Opus). Type-level Omit doesn't enforce array entries are real `World` keys
- **File:** `src/command-transaction.ts:36-43`.
- **Note:** `(typeof FORBIDDEN_PRECONDITION_METHODS)[number]` produces a `string` literal union, but TypeScript's `Omit<World, K>` allows `K` to be any string — non-existent keys are silent no-ops. The runtime meta-test (R2_REG1's fix) catches this; the type system alone does not. Acceptable.

---

## Fix plan / batching

Single commit closes all open iter-3 findings:

| Item | Action |
|------|--------|
| R2_REG1 | Add `'warnIfPoisoned'` to `FORBIDDEN_PRECONDITION_METHODS`. Add explicit warnIfPoisoned-blocked test. |
| R2_REG2 | Restore object-T fingerprint filter in `Layer.getState()`. Add regression test that mutates a stored object via `forEachReadOnly` and asserts `getState` strips it. |
| L_REG1 | Fix `docs/api-reference.md:3454`. |
| L_REG2 | Add meta-test cross-checking `FORBIDDEN_PRECONDITION_METHODS` against `World.prototype`. |
| L_REG3 | Add explicit single-clone regression test for L_NEW2. |
| Notes  | Leave N2/N4/N5 (cosmetic). |

Estimated 1 commit, ~80 LOC of changes + ~50 LOC of new tests. Bump 0.7.1 (non-breaking — tightens an unintentionally-exposed surface; the only behavior change is rejecting predicate calls to `warnIfPoisoned` which no real caller would use).

---

End of REVIEW.md.
