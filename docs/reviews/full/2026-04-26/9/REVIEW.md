# Full Codebase Review — 2026-04-26, iteration 9 (closing convergence check)

Two reviewers ran in parallel against `agent/full-review-iter9` at HEAD `2942f0d` (v0.7.6). Codex + Opus both completed and reported fully clean; Gemini still quota-exhausted (7th iteration in a row).

| Reviewer | Output |
|---|---|
| Codex | `raw/codex.md` — N3 fix verified; no Critical/High/Medium/Low; no notes |
| Gemini | UNREACHABLE — `429 QUOTA_EXHAUSTED` |
| Opus | `raw/opus.md` — N3 fix verified; no Critical/High/Medium/Low; 5 non-actionable notes |

Gates baseline: 630 tests pass, typecheck clean, lint clean, build clean.

---

## Executive summary

**CONVERGENCE REACHED.** Both reviewers independently verified the iter-8 N3 fix landed correctly with no regressions. Codex flagged zero notes; Opus flagged five non-actionable notes (convergence call, multi-CLI status, deferred items already on the drift-log, an answer to the prompt's fingerprint-cost question, and the >500-LOC defer already on drift-log). **No code changes required.** Per AGENTS.md "continue iterating until reviewers nitpick instead of catching real bugs" — iter-9 produces no real findings. **The loop terminates here.**

---

## N3 FIX VERIFICATION

Both reviewers walked the code paths:

- **Strict-mode unchanged:** Both confirm the `if (this.diffMode === 'semantic')` gate at `src/component-store.ts:50` ensures strict mode bypasses the fingerprint computation entirely — strict-mode `set()` still falls through to unconditional `dirtySet.add(entityId)` at lines 64-65. No strict-mode behavior change, no strict-mode fingerprint cost.
- **Post-remove revert collapses:** `remove()` preserves the cached `baseline` (it does not clear the baseline map). On the next `set()` with `wasPresent === false`, the new fingerprint is compared against the preserved baseline; on match, the early return at lines 58-61 deletes both `dirtySet` and `removedSet` entries. Pinned by the test at `tests/component-store.test.ts:199-211`.
- **First-ever insert with no baseline still marks dirty:** `clearDirty()` re-baselines via `entries()` at lines 122-127, which only iterates currently-populated entries. Entities never inserted (or removed before the most recent `clearDirty`) have no cached baseline; `baseline.get(id) === undefined`, so the `baseline === fingerprint` check fails and execution falls through to dirty-marking. Pinned by the test at `tests/component-store.test.ts:225-230`.
- **L2 + N3 contract uniformity:** Both branches (`wasPresent === true` at lines 27-42 and `wasPresent === false` at lines 50-63) now honor the same "skip dirty-marking when value matches baseline" contract. The only structural difference is that the `wasPresent === false` path also handles `_size++` and `assertJsonCompatible`, which are not relevant to the dirty-tracking contract.
- **No iter-8 regressions:** `_generation` still increments on every `set()` in both modes (test at `tests/component-store.test.ts:261-275` unchanged). The strict-mode short-circuit (no fingerprint cost) preserved by the diffMode gate. No legitimate strict-mode test case now skips dirty-marking incorrectly.

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

## LOW

None observed.

---

## NOTES (non-actionable)

### N1. Convergence reached — loop terminates

Iter-1–6: closed the `CommandTransaction` atomicity chain via three structurally-different mechanisms (denylist + clone-wrap + freeze). Iter-7: closed 7 broader-sweep findings (deserialize entity-id validation, EventBus listener-mutates-payload, ClientAdapter mapping race, doc drift, octave-noise validation, component-store revert-to-baseline, deserialize tick-validation hoist). Iter-8: verified iter-7 + closed N3 (parallel-class L2 gap on the strict-path branch). **Iter-9: zero real findings.** Per AGENTS.md "continue iterating until reviewers nitpick instead of catching real bugs" — the stopping criterion has been met.

### N2. Fingerprint cost on `wasPresent === false` semantic-mode set (Codex + Opus)
The new check computes `jsonFingerprint(component)` on every semantic-mode `set` where `wasPresent === false`, including never-seen entities (which will not match any baseline). The cost is O(stringify + walk) per such call. This is consistent with the documented semantic-mode model (writes are fingerprinted in `set()`; api-reference.md:1231-1237) and fully gated out of strict mode. Both reviewers agree the cost is acceptable for an opt-in mode and the structural-consistency-with-L2 win outweighs the micro-optimization of fingerprinting only when a baseline exists. **Not flagging as a finding** — explicit answer to the prompt's fingerprint-cost question.

### N3. Minor double-walk in semantic + !wasPresent path (Opus)
`assertJsonCompatible` runs at line 44, then `jsonFingerprint` runs at line 56 — both walk the component once. `JSON.stringify` dominates either way, and structural consistency with the L2 branch (which has the same double-walk via the `wasPresent === true` semantic check) outweighs the micro-opt. Not a finding.

### N4. Tags/metadata inline-validate vs. iter-7 closure (Opus, deferred from iter-8 N2)
`snapshot.tags` and `snapshot.metadata` validate inline rather than using the iter-7 `assertEntityIdAlive` closure. Functionally equivalent. One-line refactor. Stylistic preference, not a regression. Deferred (mentioned for the record only).

### N5. Files > 500 LOC (Opus, deferred per drift-log v0.6.4)
`world.ts` (2228 LOC), `occupancy-grid.ts` (1602 LOC), `world-debugger.ts` (509 LOC). Per drift-log already deferred to a dedicated refactor branch. Not re-flagged.

### N6. Gemini quota status
Seventh iter in a row Gemini was unreachable. Two-perspective Codex + Opus continues to provide useful signal — both agreed iter-9 is clean. The convergence achieved across iter-1–9 was reached without Gemini for iters 3–9; the two-CLI pattern is sufficient for closing-convergence checks.

---

End of REVIEW.md. **Loop converged. Stopping.**
