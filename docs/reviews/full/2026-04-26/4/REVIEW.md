# Full Codebase Review — 2026-04-26, iteration 4

Two reviewers ran in parallel against branch `agent/full-review-2026-04-26-iter1` at HEAD `1e79630` (post-v0.7.1). Codex + Opus completed; Gemini still quota-exhausted from iter-2.

| Reviewer | Output |
|---|---|
| Codex | `raw/codex.md` |
| Gemini | UNREACHABLE — `429 QUOTA_EXHAUSTED` (third iteration in a row) |
| Claude | `raw/opus.md` |

---

## Executive summary

**Convergence reached on substance — both reviewers verified all five iter-3 fixes (R2_REG1, R2_REG2, L_REG1, L_REG2, L_REG3) are correctly implemented in source, except L_REG3 has a vacuous regression test.** No new bugs introduced by v0.7.1. No new findings at any severity above Low. The L_REG3 test mutates `copy.defaultValue`, but `Layer.defaultValue` is a clone-on-read getter — the mutation is unobservable through any subsequent getter call. The test passes regardless of whether `clone()` single-clones, double-clones, or even shares the underlying `_defaultValue` reference outright.

This is the kind of finding that signals review convergence: the chain has gone from 1 Critical + 4 High + 5 Medium + 7 Low (iter-1) → 1 regression + 2 High + 2 Medium + 4 Low (iter-2) → 2 regressions + 3 Low (iter-3) → 1 vacuous-test Low (iter-4). Time to ship after this fix.

---

## ITER-3 REGRESSIONS

- **R2_REG1 (warnIfPoisoned hole) — closed.** Both reviewers verified `'warnIfPoisoned'` is in `FORBIDDEN_PRECONDITION_METHODS` (`src/command-transaction.ts:38-40`); explicit blocked-call test pins the proxy rejection (`tests/command-transaction.test.ts:601-610`); the new meta-test would have caught the original hole.
- **R2_REG2 (getState backstop) — closed.** Filter restored at `src/layer.ts:173-175` with a clean `!this._defaultIsPrimitive && jsonFingerprint(value) === this._defaultFingerprint` guard. Primitive T pays no per-cell cost. Comment accurately describes the rationale. Safety-net test at `tests/layer.test.ts:381-399` exercises the `forEachReadOnly` contract-violation path.
- **L_REG1 (api-reference doc) — closed.** `docs/api-reference.md:3454` describes both `'committed'` and `'aborted'` terminal-reason messages.
- **L_REG2 (denylist meta-test) — closed.** `tests/command-transaction.test.ts:503-563` cross-checks `FORBIDDEN_PRECONDITION_METHODS` against `Object.getOwnPropertyNames(World.prototype)`. Opus runtime-verified: 124 prototype members, all classified, zero `uncovered`, zero items in both lists, zero phantom entries.
- **L_REG3 (single-clone test) — incomplete.** See Low below.

---

## CRITICAL / HIGH / MEDIUM

None observed.

---

## LOW / POLISH

### L_REG3_VACUOUS. The L_NEW2 regression test does not actually pin the L_NEW2 fix
**Reviewers:** Codex, Opus (two-reviewer consensus).

- **File:** `tests/layer.test.ts:430-444`.
- **What's wrong:** The test mutates `copy.defaultValue` (the getter return) and asserts `original.defaultValue.n === 0` and `copy.defaultValue.n === 0`. But `Layer.defaultValue` is implemented as `get defaultValue(): T { return cloneIfNeeded(this._defaultValue); }` (`src/layer.ts:61-63`) — every access returns a fresh `structuredClone`. Mutating the getter's return is therefore unobservable through any subsequent getter call, regardless of how `clone()` is implemented. The test passes equally for: the current single-clone, the pre-L_NEW2 double-clone, AND a pathological zero-clone that shares `_defaultValue` references.
- **Why it matters:** L_REG3's stated purpose was to prevent a regression to double-clone (or worse, shared-reference). The committed test does not change that — a regression to shared-reference clone would still pass. The test name and comment claim to guard L_NEW2, providing false confidence in the regression net.
- **Recommended fix:** Reach past the getter and assert underlying-storage identity differs:
  ```ts
  const originalRaw = (original as unknown as { _defaultValue: { n: number } })._defaultValue;
  const copyRaw = (copy as unknown as { _defaultValue: { n: number } })._defaultValue;
  expect(copyRaw).not.toBe(originalRaw);
  ```
  This pins "constructor cloned independently" and would fail on any zero-clone regression. Distinguishing single-clone from double-clone observably is harder (would need a `structuredClone` spy); reasonable to punt — L_NEW2 was a perf-only fix and double-clone is observably equivalent to single-clone in correctness terms. Strict-reference identity is the right pin.

---

## NOTES & OPEN QUESTIONS

None observed. All explicitly-acknowledged residuals (L_NEW6 `as any` cast on emit dispatch; N1 circular-import smell between `world-internal.ts` and `world.ts`) remain unchanged.

---

## Fix plan

Single test edit (`tests/layer.test.ts:430-444`) — replace the vacuous mutation-of-getter assertion with an underlying-storage identity assertion. No source change. No version bump (test-only polish).

Iter-5 verification is optional — a single-test-edit closure of one Low caught by both reviewers is the convergence signal. After this fix the chain is ready to merge.

---

End of REVIEW.md.
