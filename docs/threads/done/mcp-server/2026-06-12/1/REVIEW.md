# mcp-server — implementation review, iteration 1 (+ fixes gate-verified)

**Reviewed:** the full 1.1.0 diff (engine additions + mcp/ subpackage + CI/docs). **Reviewers:** Claude (fable-5 1m max, full lens) + Gemini (3.1-pro plan, docs/coverage lens). Codex quota-exhausted (protocol). Contamination audit clean.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| C-H1 | HIGH | `bundle_commands`/`bundle_events` tick-range filters were SILENT NO-OPS — the tools passed `{ range: {from, to} }` but the engine queries take `from`/`to` flat; the unknown key was ignored and the full stream returned regardless | FIXED — flat from/to; pinned by a range-filter test |
| C-H2 | HIGH | Root vitest (unscoped include) would sweep `mcp/tests` in CI before mcp's `npm ci`/the root build → red root-test step (and double-running locally) | FIXED — root vitest scoped to `tests/**` |
| C-M1 | MAJOR | The advertised poisoned-terminal-snapshot inspection path was unreachable: `bundle_snapshots` LISTED the terminal tick but hydration (correctly) refuses ticks at/after a failure, and no tool returned recorded snapshot content | FIXED — ticks matching a RECORDED snapshot return it verbatim (`recorded: true`), making the v6 `poisoned` terminal state inspectable exactly as the tool description promises; pinned (`poisoned.code === 'system_threw'` round-trip) |
| C-M2 | MAJOR | `diff_bundles` summary `stateChanged` omitted resources/tags/metadata — a tick divergent only in those rendered all-zero | FIXED — all TickDiff channels counted |
| C-m1 | MINOR | The fold-vs-recorded agreement test was tautological (hydration picked the recorded snapshot it was compared against) | FIXED — snapshots stripped so the fold runs from initial |
| C-m2 | MINOR | Below-failure hydration on failure-terminated bundles (the forensics path) untested | FIXED — pinned |
| C-m3 | MINOR | corpus_overview re-sorted per call (entries() is construction-sorted) | FIXED |
| C-m4 | MINOR | `key` silently won over `keyPattern`; invalid regex surfaced uncoded | FIXED — mutual-exclusion rejection + clear regex-source error + schema note |
| C-m5 | MINOR | Snapshot listing/entry summaries omitted the effective upper bound for incomplete bundles | FIXED — `effectiveUpperBound` in both |
| C-m6 | MINOR | mcp/src was outside the lint gate | FIXED — root lint covers mcp/src + mcp/tests |
| C-m7 / G-1 | MINOR | Guide setup snippet was order-broken (`cd mcp` then `node mcp/dist/...`) | FIXED |
| C-m8 | MINOR | Changelog/roadmap/server-header referenced `threads/done/` before the move | Thread moves in the ship commit; header pre-updated |
| C-m9 | MINOR | `snapshotAtTick` had no diff-continuity check — a tampered/truncated bundle body yielded silently wrong state | FIXED — coded `missing_tick_entries` with the gap listed; pinned by a gapped-body test |
| G-cov | MEDIUM | bundle_events/bundle_markers untested; viewer_diff failure-crossing untested; diff_bundles full mode untested; queryFromInput adapter mappings untested | FIXED — all pinned (incl. keyPattern + minFailedTickCount adapter coverage) |

One semantic follow-through during fixes: with C-M1's recorded-verbatim fetch, the failed tick itself now RETURNS the recorded poisoned snapshot instead of erroring — the original failure-crossing expectation in the snapshots test was retired in favor of the new recorded-verbatim pin (the hydration guard remains pinned at engine level and via viewer_diff).

## Verified clean by reviewers

zod/exactOptionalPropertyTypes moot (neither tsconfig enables it; conditional spreads keep undefined out); the `ft <= tick` failure-precedence semantics correct and consistent with openAt's convention; LRU correctness incl. the refresh interaction (exercised by the churny fixture); `world_factory_required` keying cannot mask other defects; compare_metrics instance freshness + all 11 factories; all doc counts; VisibilityMap metrics semantics; CI mcp sequencing + cache-dependency-path.

## Disposition

All findings fixed; both suites green (engine 1215 + 2 todo; mcp 18). Ship as engine 1.1.0 + civ-engine-mcp 0.1.0.
