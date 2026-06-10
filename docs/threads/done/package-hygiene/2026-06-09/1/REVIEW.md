# Package hygiene (v0.8.14) — review iteration 1

**Diff:** working tree before commit — LICENSE (new), package.json metadata + files trim, version bump 0.8.13→0.8.14 (package.json / package-lock.json / src/version.ts / README badge), changelog 0.8.14 entry, devlog summary + detailed entries.

**Reviewers:** Codex `gpt-5.5` (xhigh, read-only sandbox + node-repl fallback after PowerShell spawn errors), Gemini `gemini-3.1-pro-preview` (plan mode, prompt-only), Claude `claude-opus-4-7[1m]` (max effort, Read/Bash tools).

## Findings

| # | Severity | Reviewer(s) | Finding | Disposition |
|---|----------|-------------|---------|-------------|
| 1 | MINOR | Codex | `docs/guides/getting-started.md:312` links `[Architecture](../ARCHITECTURE.md)`; live file is `docs/architecture/ARCHITECTURE.md`. Pre-existing broken link, but now consumer-facing because `docs/guides/` ships in the package. | **Fixed** — link corrected to `../architecture/ARCHITECTURE.md`. Verified against live tree before fixing. |
| 2 | MINOR | Codex + Claude (convergent) | Shipped `dist/` JS + d.ts retain JSDoc/source-comment pointers to repo-only paths (`docs/threads/done/.../DESIGN.md`, `docs/design/ai-first-dev-roadmap.md`) — e.g. `dist/index.js:24,45,50,61,65,69`, `dist/types.d.ts:30`, `dist/world.d.ts:281`. Purely navigational; undercuts the changelog's "keep everything they need" framing. | **Addressed via Claude's option (b)** — changelog wording tightened to name both dangling-pointer classes (packaged `docs/README.md` links and `dist/` JSDoc cites) and state they resolve on GitHub. Rewriting source comments to GitHub URLs (option c) deferred — comment churn across ~10 src files is out of scope for a metadata release and would go stale under repo renames. |
| 3 | NIT | Claude | `LICENSE` / `README.md` entries in `files` are redundant (npm always packs them). | **No action** — reviewer says harmless; explicit is clearer. |

Gemini: clean APPROVE, no findings ("No changes needed"). Confirmed package.json field validity, version consistency (5 surfaces), files-trim consumer safety.

Claude verified: version consistency 5/5, repository URL vs `git remote`, engines vs README Node 18+, pack contents (284 files, no process archives), changelog honesty, devlog filename convention. Recommendation: "Ship as-is or with the one-line changelog clarification."

## Disposition

**ACCEPT after inline fixes.** Findings were doc-navigation minors (one pre-existing); no correctness, security, or performance issues from any reviewer. Both actionable findings fixed in this iteration; no re-review warranted for a one-path link fix + changelog wording per the "nitpick vs real bug" convergence bar.

Codex operational note: `--sandbox read-only` PowerShell spawns failed ("windows sandbox: spawn setup refresh"); Codex fell back to its node-repl MCP tool for file reads and still grounded claims in the live tree. Worth re-smoke-testing the codex sandbox per AGENTS.md if this recurs.
