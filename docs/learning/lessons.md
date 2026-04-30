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
