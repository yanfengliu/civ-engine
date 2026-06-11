# Lessons learned

Append durable engineering lessons here. Each entry should teach a future agent
something that is not obvious from the current code — a trap, a non-obvious
invariant, or a rule that keeps biting if ignored. One entry per lesson, newest
at the top. Keep entries short; link to code or devlog rather than restating.

Format:

```
## <short title> — YYYY-MM-DD
Context: when this came up.
Lesson: the durable rule or trap, phrased so it transfers to future work.
Pointer: devlog entry, file, or test that illustrates it.
```

---

## Code-review prompts: use the AGENTS.md baseline verbatim, then extract only the review — 2026-04-29
Context: Spec 5 design iter-2 review. I wrote my own multi-paragraph prompt with verbose task context, and also captured Codex's full stdout (4800 lines / 351 KiB) which includes verbatim file dumps from every Read/cat the reviewer made while reasoning.
Lesson: (1) Use the AGENTS.md "Code review" baseline prompt verbatim — it already includes the "Be concise but effective: keep the reasoning, impact, and file/line evidence needed to act without preserving transcripts, command chatter, or repetitive detail" line. Add only 2-3 lines of task-specific context after the baseline. Don't rewrite the prompt's tone or duplicate its instructions. (2) Codex CLI's exec mode dumps every file it reads into stdout as it reasons. The actual review is only the final ~20 lines (between the last "^codex$" marker and "^tokens used$"). Always extract just the review section before reading into context — feeding the full transcript wastes tokens and clutters context. Claude's CLI output is typically already concise; less filtering needed but still spot-check.
Pointer: docs/threads/current/counterfactual-replay/2026-04-29/design-2/ (verbose transcript was in tmp/, never committed). Filter pattern: `awk '/^codex$/{n=NR; buf=""} {buf=buf"\n"$0} /^tokens used$/{print buf; exit}' codex-raw.txt` extracts the final review block.

## 2026-06-11 — "Read-only" reviewer CLIs can write: audit the working tree after every review batch

| Field | Value |
|---|---|
| Surfaced by | v0.8.23 (v1-surface) implementation: src/index.ts corrupted twice mid-objective (names re-attributed to wrong modules, invalid `.ts` import extensions, six public names dropped); a hallucinated test injected into tests/engine-error.test.ts (imported StrictModeViolationError from session-errors.js, called a nonexistent constructor signature). Timeline correlation: every corruption window coincided with a running `gemini --approval-mode plan` review subprocess, whose own stderr lists `replace` among its available tools; corruption stopped permanently once no review subprocess was in flight. |
| Reviewer findings | n/a — the reviewer WAS the failure mode (incident recorded in docs/threads/done/v1-surface/2026-06-11/1/REVIEW.md) |
| Fix commit | a53efc2 (clean deterministic regeneration + verified bytes); AGENTS.md mitigation in this commit |
| Test added | tests/public-surface.test.ts > "declared export names (types included) match the committed allowlist" — the surface pin is what detected the second corruption (alongside tsc); it now permanently guards index.ts's shape |
| Behavior delta | Before: a review subprocess could silently rewrite source while the driver built on top — the corrupted index.ts dropped SessionSink/SessionSource/NewMarker/BundleIntegrityError/BundleRangeError/BundleVersionError from the package and broke the build in a way that looked like the driver's own typecheck error. After: AGENTS.md mandates a `git status`/`git diff` contamination audit after every gemini batch, and the surface-pin test turns any index.ts tampering into an immediate named-delta failure. |

The general rule: a reviewer CLI's "read-only mode" is an assumption to verify per version, not a property to trust — and the cheapest structural defense is pinning tests that make silent mutation loud. The corrupted content was plausible-looking (correct names, wrong modules), which is exactly why eyeballing diffs is insufficient; the typecheck and the pin caught what reading would have missed.
