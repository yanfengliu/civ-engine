# REVIEW — code-reviewer model bump (iter 1)

**Date:** 2026-04-28
**Diff scope:** `AGENTS.md` only (single file, ~10 line edit)
**Verdict:** **ACCEPT** — both reviewers returned no real findings.

## What changed

- Tie-breaker (Team-of-subagents section): `claude --model opus` → `claude --model "claude-opus-4-7[1m]" --effort max`.
- Codex reviewer command: `--model gpt-5.4` → `--model gpt-5.5`. Added a note about the required Codex CLI ≥ 0.125.0 and that Codex's reasoning-effort cap is `xhigh` (not `max`).
- Claude reviewer commands (diff and full-codebase variants): `--model opus --effort xhigh` → `--model "claude-opus-4-7[1m]" --effort max`. Added a note about the `[1m]` suffix selecting the 1 M-context variant and the need to quote brackets to suppress shell glob-expansion.
- New section-level bullet: "Keep model IDs current" — mandates a smoke-test before committing future model bumps.

## Reviewers and verdicts

- **Codex (`gpt-5.5`, `model_reasoning_effort=xhigh`)** — *No findings.* Verified that no stale `gpt-5.4`, `--model opus`, or `--effort xhigh` references remain in the active rules of `AGENTS.md`; quoting of `[1m]` is correct for bash and PowerShell; the new "Keep model IDs current" bullet does not conflict with the unreachable-CLI fallback. Flagged that public docs cannot confirm a specific account's model entitlements — local smoke tests are the strongest evidence (already run).
- **Claude (`claude-opus-4-7[1m]`, `--effort max`)** — *ACCEPT.* Independently confirmed shell-quoting correctness (brackets literal in bash double-quotes, PowerShell, and cmd.exe), model-ID choice as the most-capable variants accessible under ChatGPT/standard-Claude auth, no duplication of the smoke-test or model-currency rules elsewhere in the doc, and clean placement of new bullets. Confirmed via grep that historical references to old IDs only persist in changelog/devlog/done-thread artifacts, which AGENTS.md's Documentation discipline rule explicitly preserves.

## Findings

None blocking. Both reviewers reached "no real bugs" on iter 1.

### Non-blocking observation (Claude)

The line-70 smoke-test example `echo "ok" | <cli> ...` verifies the CLI responds, but does not by itself prove the requested model was selected vs. a silent fallback to an older model. In practice this is mitigated by both CLIs erroring loudly on unrecognized model names (verified — `codex-cli 0.121.0` rejected `gpt-5.5` outright rather than silently degrading), so the loud-failure path still satisfies the bullet's intent. If a future regression introduced silent alias-resolution downgrades, the smoke test would need to ask the model to self-identify. **Disposition:** noted as a known limitation; no edit required because the observed failure mode is loud, not silent.

## Anti-regression compliance

- Hardcoded specific model IDs (vs. aliases like `opus`) — intentional per the user's "most capable + largest context" requirement; both reviewers respected the anti-regression note and did not flag.
- Smoke-test mandate — intentional and cheap; not flagged as bureaucratic.

## Disposition

Accept and merge. No iter 2 needed.
