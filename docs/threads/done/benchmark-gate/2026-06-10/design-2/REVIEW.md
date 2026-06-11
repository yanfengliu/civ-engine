# benchmark-gate — design review iteration 2 (confirmation)

**Artifact:** DESIGN.md v2. **Reviewers:** Codex `gpt-5.5` xhigh, Gemini `gemini-3.1-pro-preview`, Claude `claude-fable-5[1m]` max.

**Result: all three CONVERGED.** Each design-1 finding confirmed correctly incorporated: churn projectiles now match populated cached shapes (Claude additionally verified the LIFO-recycling claim against `entity-manager.ts` — projectile ids sit in the top band of the sorted arrays, so destroys scan past all ~4000 baseline entries); `query.calls`/`results` + the new `membershipChecks` engine metric in tier 1 (Claude verified the in-flight `+= queryCache.size` implementation is arithmetically identical to per-entry counting); file split; markdown-throws correction; all implementation cautions adopted. No new findings. Design ACCEPTED → implementation (which proceeded in parallel on the review-stable parts) continues to impl review.
