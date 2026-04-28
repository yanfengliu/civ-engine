# Spec 7 Bundle Corpus Index Plan Review - Iteration 4

**Scope:** v4 implementation plan and verification against plan-3 review findings.

**Verdict:** Rejected. Codex-1 and Opus accepted, but Codex-2 found one remaining AGENTS.md process gap in the code-review re-review loop.

## Raw Outputs

- `raw/codex.md`
- `raw/codex-2.md`
- `raw/opus.md`

Claude was reachable and returned `ACCEPT`.

## Finding

### High - Code-review re-review loop needs prior-review context and tie-breaker branch

Codex-2 found that Step 7 says to create iteration 2 after fixes, but does not explicitly require re-review prompts to include the previous iteration's `REVIEW.md` and `docs/learning/lessons.md`. It also omits the AGENTS.md escalation path if consensus does not converge after 3 code-review iterations.

**Action:** Add an iteration-2+ re-review prompt template that feeds prior `REVIEW.md` files and `docs/learning/lessons.md` into Codex/Claude, requires verification of earlier fixes, and prevents re-flagging resolved issues. Add an explicit 3-iteration tie-breaker branch using `claude --model opus` with an ACCEPT-or-REJECT prompt and a saved `tie-breaker.md` artifact.

## Resolved From Iteration 3

- README and roadmap stale-language cleanup is explicit.
- Behavioral metrics docs are BundleCorpus-first, with in-memory arrays demoted to small-test/advanced usage.
- Ordering uses `compareCodeUnit()` and test coverage locks host-locale-independent ties.
- Lazy bundle loading is proven with first-good, second-malformed iterator behavior.
- Discovery stop-descending behavior is covered with an outer bundle containing a nested manifest.
