# Spec 5 (Counterfactual Replay) Implementation Iter-4 Review

**Date:** 2026-04-30
**Iteration:** 4 → final (ACCEPT after wording fixes)
**Reviewers:** Codex `gpt-5.5` xhigh + Claude `claude-opus-4-7[1m]` max
**Disposition:** ACCEPT (after iter-4's two convergent doc-currency findings were addressed inline)

## Convergent doc-currency findings (real, both addressed)

### F1 — `docs/threads/done/counterfactual-replay/` referenced in changelog/devlog while thread was still at `current/`
Both reviewers flagged that:
- `docs/changelog.md:5` said "The full thread is at `docs/threads/done/counterfactual-replay/` (4 design iterations + 5 plan iterations to convergence)" — but the workspace had `docs/threads/current/counterfactual-replay/` and no `done/` copy.
- `docs/devlog/detailed/2026-04-29_2026-04-30.md:206` said the thread "will move to `done/` after this commit lands."
- `src/index.ts:105` had a comment `// See docs/threads/current/counterfactual-replay/DESIGN.md.`

These three references contradicted each other and the actual filesystem state.

**Fix:** Per AGENTS.md "Move the objective folder from `docs/threads/current/` to `docs/threads/done/` ... after folding the final iteration's REVIEW.md into the devlog entry," the implementation review iterations are complete (1, 2, 3 + this iter-4 final sanity check), so the move belongs in this same commit:
- `git mv docs/threads/current/counterfactual-replay docs/threads/done/counterfactual-replay`.
- `src/index.ts:105`, `src/session-fork.ts:2`, `src/session-bundle-diff.ts:2` comments updated to `done/`.
- Devlog entry "will move" → past tense ("moved in this commit").

### F2 — Devlog Notes claim contradicts the staged rename
`docs/devlog/detailed/2026-04-29_2026-04-30.md:213` said the file rename was "deferred until after this commit ships," but the diff already includes `RM 2026-04-29_2026-04-29.md -> 2026-04-29_2026-04-30.md`.

**Fix:** Wording corrected to past tense in the same Notes bullet.

### F3 (Claude only) — Devlog claimed "iter-4 ACCEPTed" before iter-4 concluded
Pre-emptive disposition. Same forward-looking pattern Codex flagged in iter-3.

**Fix:** "iter-4 dispatched as a final sanity check; ACCEPTed" → "iter-4 dispatched for a final sanity check on the iter-3 doc edits. Codex + Claude convergent ITERATE on two doc-currency findings (...). Both fixed: ..." Now describes actual outcome rather than pre-emptive claim.

## Verified clean (Claude impl spot-checks unchanged from iter-3)

The substantive implementation acceptance from iter-3 holds: overlap-end clamp, identity-replace counting, commandsEquivalent widening, hydrateAtTick proxy bug fix, file split, ENGINE_VERSION/version-badge bumps, package-lock refresh, README/api-reference/ai-integration coverage, `impl-N` → `N` rename. No fresh code/security/performance concerns in iter-4.

## Final disposition

**ACCEPT.** All convergent findings across 4 implementation-review iterations addressed. Spec 5 (v0.8.12) ready to commit.

Total review cycles: 4 design iterations + 5 plan iterations + 4 implementation iterations = 13 multi-CLI review rounds. Convergent ACCEPT reached.
