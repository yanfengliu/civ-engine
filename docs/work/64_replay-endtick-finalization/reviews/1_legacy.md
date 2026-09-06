# Replay-endTick-finalization — Review iteration 2 (2026-06-13) — CONVERGED

Diff under review: full cumulative change `HEAD~2..HEAD` (commits `994276c` + `0df7c2e`), both fix commits.
Reviewers: Codex (`gpt-5.5`, xhigh), Gemini (`gemini-3.1-pro-preview`, plan), Claude (`opus[1m]`, max) — all codebase-grounded, asked to verify each iter-1 fix landed + find new issues. Gemini working-tree audit: clean.

## Verdict — converged
All four iteration-1 fixes confirmed correct and regression-free by all three reviewers. Iteration 2 surfaced **one mechanical consistency miss** (Codex) and **one optional doc-polish nitpick** (Claude) — no logic, determinism, or performance defect. This is the nitpick-not-bugs convergence signal.

## Findings & disposition

| # | Reviewer | Sev | Finding | Disposition |
|---|---|---|---|---|
| 1 | Codex | MEDIUM | `mcp/package-lock.json` still resolved the `file:..` `civ-engine` link at `1.1.3` (root `npm install` in iter-1 didn't cascade to the subpackage); CI runs `npm ci` in `mcp`. | **Fixed.** `cd mcp && npm install` → linked `".."` now `1.1.4`; `npm audit` 0 high/critical (full + omit-dev); `npm ci` verified green against the updated lock. |
| 2 | Claude | LOW (optional) | Three prose refs still framed content-bounding as incomplete-specific after the fix made it universal: `ARCHITECTURE.md:48`, `ARCHITECTURE.md:122`, `session-recording.md:240`. Not false (incomplete bundles are still content-bounded); canonical defs already correct. | **Partially applied.** Fixed the guide ref (`session-recording.md` "for incomplete bundles" → "for all bundles"). `ARCHITECTURE.md` intentionally left untouched per the project rule (no ARCHITECTURE edits for non-structural fixes) — reviewer explicitly endorsed this. |

Gemini: CLEAN, no findings. Codex: only #1. Claude: CLEAN verdict + only the optional #2; deep re-verification of every iter-1 fix (failure-path ordering vs `world-tick.ts`, the unreachable-by-construction MCP fallback, `materializedEndTick` semantic match to `snapshotAtTick`, exact test counts).

## Iter-1 fixes re-confirmed (by Codex + Gemini + Claude)
- Failure path: `_advanceEndTick` monotonic + identical in both sinks, called from `writeTick` AND `writeTickFailure`; `failure.tick` is the consumed tick (`gameLoop.advance()` before `emitTickFailure`); incomplete bundles still cap at `persistedEndTick` (sink failures never reach `writeTickFailure` — `_onFailure` early-returns when `_terminated`); `disconnect()` byte-identical for closed bundles.
- `ENGINE_VERSION` 1.1.4 across `version.ts` / `package.json` / `package-lock.json`.
- MCP: no inline bound-rule copy remains; both sites read `materializedEndTick`; `server.ts` fallback provably unreachable (`get`/`loadBundle` share `_byKey`).
- Docs/JSDoc: only `docs/threads/done/**` + iter-1 `REVIEW.md` retain the old shape (frozen historical artifacts).

Gates after the iter-2 fix: `npm test` 1237+1, `typecheck`/`lint`/`build` clean; `mcp` 22 + typecheck + `npm ci` + audit 0. **Closing the thread.**
