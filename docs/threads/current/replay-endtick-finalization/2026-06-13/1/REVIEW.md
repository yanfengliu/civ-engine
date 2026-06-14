# Replay-endTick-finalization — Review iteration 1 (2026-06-13)

Diff under review: commit `994276c` (`fix(1.1.4): finalize endTick live so live-exported bundles stay replayable`), 8 src + 7 test + 7 doc files.
Reviewers: Codex (`gpt-5.5`, xhigh), Gemini (`gemini-3.1-pro-preview`, plan), Claude (`opus[1m]`, max) — all codebase-grounded. Gemini working-tree audit: clean (no plan-mode contamination).

## Verdict
Core fix confirmed correct by all three (recording-side live finalization + read-side `replayableUpperBound`; all anti-regression items hold). Iteration found **1 real correctness gap, 1 release-metadata miss, and 2 cross-surface doc/consumer omissions** — all fixed in the follow-up commit. No reviewer disputed the design.

## Findings & disposition

| # | Reviewer | Sev | Finding | Disposition |
|---|---|---|---|---|
| 1 | Codex | HIGH (impact MED) | `writeTickFailure` did not advance `endTick`/`durationTicks` like `writeTick`. A failed tick consumes its number (`world-tick.ts`: `gameLoop.advance()` before `emitTickFailure`), so a live export after a `TickFailure` understated the range and `openAt(failedTick)` returned `too_high` instead of `replay_across_failure`. | **Fixed.** Extracted a private `_advanceEndTick(tick)` in both sinks; called from `writeTick` AND `writeTickFailure`. Verified vs `world-tick.ts`. Tests: `memory-sink`/`file-sink` failure tests extended + `session-recorder` failure→`replay_across_failure` integration test. |
| 2 | Codex | MEDIUM | `src/version.ts` `ENGINE_VERSION` still `1.1.3` (and `package-lock.json`), so new bundles would record the wrong engine version. No test pins it, so the suite passed. | **Fixed.** `ENGINE_VERSION → 1.1.4`; `npm install` synced lock (`audit` 0 high/critical full+omit-dev). |
| 3 | Codex | MEDIUM | `docs/guides/bundle-corpus-index.md` still documented `materializedEndTick` (complete) = `metadata.endTick`. | **Fixed.** Updated to `max(endTick, persistedEndTick)`. |
| 4 | Claude | MEDIUM | The `civ-engine-mcp` consumer kept **two un-migrated copies** of the old `incomplete ? persistedEndTick : endTick` rule (`mcp/src/views.ts` `entrySummary`, `mcp/src/server.ts` `bundle_snapshots`), so a recovered legacy bundle (campaign-4) reported `effectiveUpperBound: 0` to AI agents — the exact cross-surface-duplication trap of lesson `eacaceb` (migrated 5 of 7 sites). | **Fixed.** Both now read the engine-computed `BundleCorpusEntry.materializedEndTick` (zero new duplication; the helper stays the single source — no public export needed). Two new MCP tests pin the recovered bound. |
| 5 | Claude | LOW | `src/session-errors.ts` `BundleRangeError` JSDoc still said complete bundles use `[startTick, endTick]`. | **Fixed.** Updated to `[startTick, max(endTick, persistedEndTick)]`. |
| 6 | Claude | LOW | Changelog/devlog said "six new tests"; the diff added 8 `it()` blocks (1228→1236). | **Fixed.** Recounted (9 main `it()` after iter-2 + 2 extended + 2 MCP); changelog/devlog corrected. |

Gemini: APPROVED, zero findings (independently verified the 5 engine call sites, the incomplete-bundle invariant, the non-export, FileSink perf cadence, and doc-formula accuracy).

## Anti-regression items confirmed by reviewers
`disconnect()` byte-identical for closed bundles; incomplete bundles still cap at `persistedEndTick`; `endTick ≥ persistedEndTick` invariant for clean bundles (so `max` is a no-op); `FileSink` no per-tick manifest write; `Pick<SessionMetadata>` param accepts readonly `BundleCorpusMetadata`; `recordedRange.end = contentMaxTick` is a clean-bundle no-op; `openAt` forward-replay (snapshot selection + stepping) untouched; helper absent from `index.ts` (surface-pin would catch a leak); scenario bundles (`persistedEndTick = endTick`) unaffected.

Gates after fixes: `npm test` 1237 + 1 todo; `typecheck`/`lint`/`build` clean; `mcp` 22 + typecheck. → iteration 2 re-review.
