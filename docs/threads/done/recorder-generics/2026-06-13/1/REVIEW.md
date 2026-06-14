# recorder-generics — Review iteration 1 (2026-06-13) — CONVERGED

Diff under review: commit `44dbde5` (`feat(1.2.0): thread TComponents/TState through SessionRecorder/SessionReplayer`), then the working-tree fixes folded in (same objective).
Reviewers: Codex (`gpt-5.5`, xhigh), Gemini (`gemini-3.1-pro-preview`, plan), Claude (`opus[1m]`, max) — all codebase-grounded. Gemini working-tree audit: clean (no plan-mode contamination).

## Verdict — converged
Additive minor confirmed **correct, type-safe, non-breaking, zero-runtime** by all three; every anti-regression item holds (non-breaking appended ordering, invariance sidestep via inference with World's layer chain untouched, `toBundle` default-generic, harness de-cast, inference nuance, back-compat incl. aoe2 typecheck-green-unchanged, LOC, docs). Iteration found **one real completeness gap** (Codex) and **doc-accuracy/overclaim items** — all fixed; no code bugs.

## Findings & disposition

| # | Reviewer | Sev | Finding | Disposition |
|---|---|---|---|---|
| 1 | Codex | MEDIUM | `runAgentPlaytest`'s de-cast was only half-real: `AgentDriverContext` / `AgentDriver` were still 2-generic, so the runner narrowed the typed world before `decide(ctx)` — the agent never saw typed components (unlike `runSynthPlaytest`, whose `PolicyContext` was already 4-generic). Changelog "dropped the cast" was thus inaccurate. | **Fixed.** Threaded `AgentDriverContext` / `AgentDriver` (append `TComponents`/`TState`, defaulted), updated `AgentPlaytestConfig.agent`/`stopWhen`, dropped the ctx-construction cast. Now `decide`/`stopWhen` get a typed `ctx.world` (parity with `PolicyContext`). New type assertion (case e) pins it. Claude re-verified this on the live tree. |
| 2 | Codex | MEDIUM | `DESIGN.md` / `PLAN.md` still described a `@ts-expect-error` "bad component name" assertion — not a valid contract, since the escape-hatch `getComponent<T>(key: string)` overload means a NAME typo compiles by design. | **Fixed.** Removed the typo-rejection claim from DESIGN/PLAN; both now state the delivered safety is the typed RETURN for known keys, with a note on the escape-hatch overload. (The test had already been corrected.) |
| 3 | Claude | MEDIUM | `api-reference.md` `AgentDriver` / `AgentDriverContext` signatures (`:5674-5713`) were left at the 2-generic form after the agent-surface threading — the only stale signature surface (changelog/ADR/DESIGN/PLAN/test were all updated). | **Fixed.** Updated all four spots to the 4-generic forms (heading, `AgentDriverContext`, `AgentDriver.decide`, `AgentPlaytestConfig.agent`/`stopWhen`), mirroring the documented `PolicyContext`/`Policy`. Grep confirms no 2-generic agent signatures remain. |
| — | Gemini | NIT | Changelog "appended after TDebug" is precise for 3 of 4 types but `ReplayerConfig` (no TDebug) appends after `TCommandMap`. | **Fixed.** Reworded to "appended after each type's existing parameters." |

Claude verified-clean (not findings): `ai-playtester.md` guide examples (`AgentDriver<MyEvents, MyCmds>`) stay valid (new params default); README + `public-surface.json` are name-only (correctly unchanged); `toBundle(): SessionBundle` default-generic in source + `dist` + doc; `forkAt` cast sound; LOC (`session-replayer.ts` 499, `session-fork.ts` 500-untouched); the runtime test's `CompWorld` (default E/C + typed components) is a faithful reflection of the default-generic bundle.

Gates after fixes: `npm test` 1238 + 1 todo; `typecheck`/`lint`/`build` clean; `mcp` 22; `npm audit` 0. **Back-compat proof:** aoe2 (symlinked, still using the cast seam) `typecheck`s green with zero edits. Public-surface name-pin unchanged. **Closing the thread.**
