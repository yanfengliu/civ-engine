# Skill candidates

Operational knowledge about a reviewer CLI or a review workflow, staged here for the parent to route into `../fleet/docs/skills/`.

Same shape as `canon-candidates.md`: this is the only copy until it lands, so each section carries its provenance. `../fleet/` is owned by another session and is not edited from here.

Delete a section once it lands in its skill file.

---

## For `../fleet/docs/skills/multi-cli-review.md` — extract the review before reading a Codex run into context

**From:** civ-engine / "Code-review prompts: use the AGENTS.md baseline verbatim, then extract only the review"

**Anchor:** Spec 5 design iter-2 review, 2026-04-29. `docs/threads/done/counterfactual-replay/2026-04-29/design-2/` (the verbose transcript lived in `tmp/` and was never committed).

**The durable half:** Codex CLI's exec mode dumps every file it reads into stdout as it reasons — one run was 4800 lines / 351 KiB, almost all of it verbatim file content from the reviewer's own `Read`/`cat` calls. The actual review is the final block, between the last `^codex$` marker and `^tokens used$`. Feeding the full transcript into context wastes tokens and buries the findings. Filter:

```
awk '/^codex$/{n=NR; buf=""} {buf=buf"\n"$0} /^tokens used$/{print buf; exit}' codex-raw.txt
```

Claude's CLI output is typically already concise — less filtering needed, but still spot-check.

**The stale half, recorded so it is not re-derived:** the original lesson also said to use "the AGENTS.md 'Code review' baseline prompt verbatim, then add 2-3 lines of task-specific context". There is no longer a Code-review baseline prompt in this repo's AGENTS.md — the canon now routes review through the multi-cli-review skill and the independent-critic rule. If an equivalent baseline prompt exists in the skill, the "use it verbatim, add only task context, don't rewrite its tone" advice still applies and belongs there; if not, that half is superseded and should be dropped rather than resurrected.
