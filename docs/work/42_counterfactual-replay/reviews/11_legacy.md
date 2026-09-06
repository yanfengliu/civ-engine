# Spec 5 (Counterfactual Replay) Implementation Iter-3 Review

**Date:** 2026-04-30
**Iteration:** 3 → produces 4 (final sanity check)
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** Claude ACCEPT; Codex ITERATE on a single MEDIUM (stale "iter-2 pending" wording in changelog/devlog — fixed)

## Claude ACCEPT

All 7 iter-2 fixes verified landed against ground truth:
- Iter directory rename (`impl-1`/`impl-2` → `1`/`2`) matches `tests/docs-threads.test.ts` regex.
- `package-lock.json` shows 0.8.12 (was 0.8.6).
- README Feature Overview + Public Surface entries added.
- `docs/guides/ai-integration.md` Counterfactual replay section added.
- Dead `replacedOriginalSet` removed.
- Stale "Step 5 will use" comment removed.
- `ForkBuilder` type added to existing import in session-replayer.ts (no more inline `import()`).

Implementation soundness spot-checks all clean (forkAt argument plumbing, recorder lifecycle in run(), overlap-end clamp, commandsEquivalent widening, identity-replace handling, file LOC). Pre-existing `session-replayer.ts` 516-LOC breach acknowledged and deferred.

## Codex MEDIUM (real, addressed)

### Stale "iter-2 review pending" wording in changelog + devlog
After iter-2 ran (and was synthesized in `2026-04-30/2/REVIEW.md`), the changelog Validation paragraph still said "iter-2 review pending" and the devlog entry's iter-2 section said "Pending. To be dispatched after this docs commit lands." Inconsistent with the iter-3 context.

**Fix:** Changelog Validation paragraph rewritten to summarize all three implementation-review iterations (iter-1: 13 substantive findings; iter-2: 4 findings including the test-failure regex; iter-3 ACCEPT). Devlog entry's iter-2 section rewritten with full findings list and resolution; iter-3 + iter-4 sections added.

## Final disposition

After the iter-3 doc-currency fix, all four gates clean (1063 tests, typecheck, lint, build). One more lightweight sanity check (iter-4) follows to confirm no fresh issues introduced by the doc edits.
