# Spec 5 (Counterfactual Replay) Implementation Iter-2 Review

**Date:** 2026-04-30
**Iteration:** 2 → produces 3
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ITERATE (both reviewers convergent on remaining doc/lockfile gaps; Claude HIGH on test failure caused by directory naming)

## Claude HIGH (real, addressed)

### Test regression: directory `impl-1` violates iteration-folder regex
`tests/docs-threads.test.ts:11` enforces iteration-folder names match `/^(?:\d+|(?:design|plan)-\d+)$/`. The folder `docs/threads/current/counterfactual-replay/2026-04-30/impl-1/` matched neither. The "1063 tests pass" claim from iter-1 was false — actually 1062 + 1 fail.

**Fix:** renamed `impl-1` → `1` (and `impl-2` → `2` for this iteration). Per AGENTS.md: "`<iteration_number>` starts at 1 and increments." For 2026-04-30 (a fresh date folder), the implementation-review iterations are just `1`, `2`, `3` — the design/plan-prefixed names from 2026-04-29 were sub-types within that single date, not separate iteration sequences. Test passes; full gate now 1063.

## Codex MEDIUMs (real, all addressed)

### M1 — package-lock.json stale at 0.8.6
After the 0.8.11 → 0.8.12 bump, package-lock.json still showed 0.8.6 (last refreshed at the v0.8.6 release). Inconsistent release metadata; lockfile-based version checks would see 0.8.6.

**Fix:** `npm install --package-lock-only` refreshed the lockfile to 0.8.12.

### M2 — README missing public-surface entries for new APIs
`src/index.ts` exports `forkAt`, `ForkBuilder`, `Divergence`, `diffBundles`, etc. But README's Feature Overview and Public Surface sections had no counterfactual-replay rows. Per AGENTS.md doc rule + PLAN.md commitment.

**Fix:** Added "Counterfactual Replay" row to Feature Overview table; added a comprehensive Public Surface bullet listing all new exports with pointers to api-reference.md and session-recording.md.

### M3 — `docs/guides/ai-integration.md` missing counterfactual section
PLAN.md committed to a new section in the canonical AI guide. iter-1 added it to session-recording.md but missed ai-integration.md.

**Fix:** Added "Counterfactual replay (v0.8.12+, Spec 5)" section with full agent-facing example (forkAt → replace/insert/drop → run, divergence inspection, diffBundles cross-bundle comparison). Anchors equivalence-by-construction, builder lifecycle, and performance notes.

## Claude LOWs (folded silently)

### L1 — Dead `replacedOriginalSet` in session-bundle-diff.ts
Leftover from earlier alignment strategy; built but never read, then `void`-suppressed.

**Fix:** Deleted the declaration and the `void` comment.

### L2 — Stale comment in session-fork.ts
"// Step 5 will use _sourceBundle and _targetTick during run(); silence unused-warning until then" — Step 5 is implemented in this same file. Drop.

**Fix:** Comment removed.

### NIT — Inline `import()` type for ForkBuilder
`session-replayer.ts` imported `createForkBuilder` from session-fork.js but used `import('./session-fork.js').ForkBuilder<...>` for the return type. Cosmetic.

**Fix:** Added `type ForkBuilder` to the existing import; bare type used in the signature.

## Verified clean (iter-1 fixes confirmed by Claude's table)

| iter-1 finding | Status |
|---|---|
| ENGINE_VERSION + README badge stale | Fixed |
| Identity replace counted as `commandsChanged` | Fixed (gates on `!commandsEquivalent(sc, fc)`) |
| `commandsEquivalent` only compared accepted/code | Fixed (now compares accepted/code/message/details/validatorIndex) |
| Overlap end used source-only persistedEndTick | Fixed (uses `min(source, fork)`) |
| `hydrateAtTick` proxy bug outside overlap | Fixed (state-fold restricted to `[overlapStart, overlapEnd]`) |
| Helper duplication | Fixed (shared in `session-bundle-equivalence.ts`) |
| `Math.min(...keys())` argument-count cap | Fixed (explicit `for…of` loop) |
| Dead code (`_internal_consumeQueue`, `_internal_markConsumed`) | Fixed (removed) |
| File > 500 LOC (`session-fork.ts` was 756) | Fixed (now 498; logic split into `session-fork-divergence.ts`) |
| Public docs (`api-reference.md`, `session-recording.md`) | Fixed |

## Process notes for impl-3 reviewer

- iter-2 diff vs iter-1 is mostly doc updates (README, ai-integration.md) + 3 small code cleanups (dead var, stale comment, inline import).
- Verify all four gates pass: 1063 tests, typecheck, lint, build.
- Verify `package-lock.json` shows 0.8.12 (not 0.8.6).
- Verify the new ai-integration.md section reads coherently as the canonical AI-agent entry point for counterfactual replay.
- Pre-existing `src/session-replayer.ts` 516 LOC breach acknowledged; deferred to a separate refactor commit.
