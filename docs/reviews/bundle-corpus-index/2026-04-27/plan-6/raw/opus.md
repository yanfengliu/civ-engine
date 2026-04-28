ACCEPT.

Plan v6 fixes the plan-5 blocker. The re-review prompt header at line 1027 of `docs/design/2026-04-27-bundle-corpus-index-implementation-plan.md` now reads:

> `docs/reviews/bundle-corpus-index-T1/2026-04-27/1/REVIEW.md through docs/reviews/bundle-corpus-index-T1/2026-04-27/<N-1>/REVIEW.md`

This requires every prior iteration's `REVIEW.md` (1 through N-1), not only the immediately previous one ΓÇö exactly the change plan-5 demanded. Both plan-6 reviewers in `docs/reviews/bundle-corpus-index/2026-04-27/plan-6/raw/` returned ACCEPT (Claude has no `opus.md` for this iteration; the two Codex passes are sufficient under AGENTS.md's unreachable-CLI clause). All earlier plan-1 through plan-4 findings remain addressed; no new blockers surfaced.
