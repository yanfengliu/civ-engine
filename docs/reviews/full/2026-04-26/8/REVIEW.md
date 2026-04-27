# Full Codebase Review — 2026-04-26, iteration 8 (convergence check)

Two reviewers ran in parallel against `agent/full-review-iter8` at HEAD `4ef1708` (v0.7.5). Codex + Opus completed; Gemini still quota-exhausted (6th iteration in a row).

| Reviewer | Output |
|---|---|
| Codex | `raw/codex.md` — all 7 fixes verified; no Critical/High/Medium/Low |
| Gemini | UNREACHABLE — `429 QUOTA_EXHAUSTED` |
| Opus | `raw/opus.md` — all 7 fixes verified; no Critical/High/Medium/Low; 1 Note (N3) on parallel-class gap |

Gates baseline: 627 tests pass, typecheck clean, lint clean.

---

## Executive summary

Both reviewers independently verified all 7 iter-7 fixes landed correctly with no regressions. **Zero new Critical/High/Medium/Low findings.** Opus surfaced one Note (N3) — the L2 fix only covered the `wasPresent === true` branch of `ComponentStore.set`; the analogous `wasPresent === false` branch (taken after `remove()` or on first insert when a baseline exists) still emits a redundant dirty entry on revert-to-baseline. Pre-existing, not iter-7 regression, but real bandwidth-waste of the same severity class as L2. Closing it in iter-8 keeps the L2 contract structurally complete instead of branch-conditional.

One Note (N2) on stylistic inconsistency between tags/metadata inline checks and the new `assertEntityIdAlive` closure — not a finding, deferred.

**Loop continuation:** N3 is a real fix. Take it; iter-9 verifies clean.

---

## ITER-7 FIX VERIFICATION

| Fix | Verifier | Result |
|---|---|---|
| H1 — `World.deserialize` entity-id validation | Codex + Opus | ✅ Verified. `assertEntityIdAlive` closure covers all entity-keyed snapshot paths (components, resources.pools/production/consumption, transfers.from/to). Tags/metadata use parallel inline check (pre-existing). Error messages descriptive. No remaining unvalidated paths. |
| M1 — EventBus deep-clone for buffer + per-listener | Codex + Opus | ✅ Verified. `emit()` clones once for buffer + once per listener; `getEvents()` still clones on read for caller-vs-buffer isolation. N+1 + read clones is correct (3 independent threats, 3 independent boundaries). |
| M2 — `ClientAdapter.handleMessage` gates `set` on `safeSend` return | Codex + Opus | ✅ Verified. Audited 8 other `safeSend` call sites; no analogous bug pattern (other sites are error/reject paths or void responses with no follow-up state). |
| M3 — `api-reference.md` `(snapshot v4)` → `(snapshot v5)` | Codex + Opus | ✅ Verified. Both call-sites fixed. |
| L1 — `octaveNoise2D` parameter validation | Codex + Opus | ✅ Verified. RangeError on `octaves < 1`/non-int, `persistence < 0`/non-finite, `lacunarity <= 0`/non-finite. Edge cases covered: `MAX_SAFE_INTEGER`, denormal, `persistence=0`, NaN, ±Infinity. No production callers in `src/`. |
| L2 — Semantic-mode revert-to-baseline clears dirty/removed | Codex + Opus | ✅ Verified for the `wasPresent === true` branch. `clearDirty` re-baseline still works under repeated revert-to-baseline within a tick. **N3 catches the parallel `wasPresent === false` gap.** |
| L3 — `World.deserialize` tick validation hoisted | Codex + Opus | ✅ Verified. Tick validation runs immediately after `version` check, before any loader, before `new World(...)` constructor. Constant-time check; no O(N) loader work runs on bad-tick input. |

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

## NOTES & FINDINGS TAKEN

### N3 (Opus). `ComponentStore.set` strict-path branch parallels L2 — wasPresent=false revert-to-baseline still emits redundant dirty entry — ✅ taken in iter-8

- **File:** `src/component-store.ts:44-52` (the strict / `!wasPresent` branch).
- **What:** L2 (iter-7) fixed the `semantic && wasPresent` branch (lines 27-42). The parallel `!wasPresent` branch (taken on first insert OR after `remove()`) does not check whether the new value matches the cached baseline. Sequence `set(A) → clearDirty (baseline := A) → remove() → set(A)` ends with `dirtySet={id}`, `removedSet=∅`. `getDirty()` emits a redundant `set: [[id, A]]` even though baseline already had A.
- **Severity:** Same class as L2 — bandwidth waste only, no incorrect end state. End-of-tick consumer applies the redundant set, internal data already had A, consumer's state already had A.
- **Why not deferred:** The L2 contract is "semantic mode skips dirty-marking when the value matches the baseline." Branch-conditionally honoring that contract (only on the `wasPresent` branch) is a structural inconsistency. Closing N3 makes the contract uniform.
- **Fix shipped (v0.7.6):** When `diffMode === 'semantic'` and the new value's fingerprint matches the cached baseline, the strict-path early-returns after `dirtySet.delete + removedSet.delete`. Strict mode untouched (the gate is `if (this.diffMode === 'semantic')`). 3 new regression tests: remove + set-to-baseline = no-op; remove + set-to-different = dirty; first insert with no baseline = dirty.

---

## OTHER NOTES

### N1. Convergence reached after iter-9 verification
Iter-1–6 closed the `CommandTransaction` atomicity chain. Iter-7 closed 7 broader-sweep findings. Iter-8 verified those + closed N3. Per AGENTS.md "continue iterating until reviewers nitpick instead of catching real bugs" — iter-9 should be the convergence check. If iter-9 finds nothing, stop.

### N2. H1 inline tags/metadata vs. closure (Opus, deferred)
`snapshot.tags` and `snapshot.metadata` validate inline (pre-existing) instead of using the iter-7 `assertEntityIdAlive` closure. Functionally equivalent — both check non-negative-integer and `entityManager.isAlive`. Stylistic inconsistency, not a correctness gap. Deferred (one-line refactor; not worth a version bump on its own).

### N4. Gemini quota
Sixth iter in a row Gemini was unreachable. Two-perspective Codex + Opus continues to provide useful signal — both agreed on iter-8 verification + Opus alone surfaced N3 (Codex did not flag it, but it's not in iter-7's H1/M1/M2/L1/L2/L3 fix scope, so Codex's "fix verified" framing was correct in scope).

---

End of REVIEW.md.
