# mcp-server — design review, iteration 1

**Reviewed:** DESIGN.md v1. **Reviewers:** Claude (fable-5 1m max — full codebase-grounded pass); Gemini produced no output (spawn failure; its pass runs as the design-2 confirmation). Codex quota-exhausted (protocol). Contamination audit clean.

## Findings and dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| H1 | HIGH | `viewer_frame` promised components and `viewer_diff` the snapshot path — both need `worldFactory` (excluded from v1); the `diffSince` fold bails to the THROWING snapshot path on the NORMAL created-then-destroyed-in-range case. The pure-data answer (`hydrateAtTick`) exists but is module-private, and reimplementing fold semantics in the MCP layer is forbidden by the engine's own guide | FIXED in v2 — engine 1.1.0 gains public `snapshotAtTick(bundle, tick)` (wraps the existing fold + `diffSince`'s failure-crossing guard); both tools respecced on it; `failures` composed from `viewer.failures()`; freezing-options wording corrected (frames are unconditionally frozen) |
| H2 | HIGH | `npx civ-engine-mcp` + `"civ-engine": "file:.."` is self-contradictory (npm publishes `file:` verbatim); mcp tests also depend on root `dist/` build order in CI | FIXED in v2 — v1 is `private: true` (entry `node mcp/dist/cli.js`; bin retained for a future publish with a dep-rewrite step); CI sequencing + per-package lockfile/audit/cache-dependency-path specified |
| M1 | MEDIUM | `corpus_query` claimed a markers filter; `BundleQuery` has 15 manifest fields, none of them markers; `key: string \| RegExp` does not survive JSON | FIXED in v2 — markers dropped (failures covered via `failedTickCount`); exact-`key` + `keyPattern` regex-source convention |
| M2 | MEDIUM | No-silent-caps only covered frames; corpus_query / bundle_commands / bundle_events / diff_bundles unbounded; `perTickDeltas` is a ReadonlyMap (JSON-serializes as `{}`) over the UNION tick range | FIXED in v2 — `limit` + `truncated` + total on every list output; `diff_bundles` summary-mode default; explicit Map conversion |
| M3 | MEDIUM | `corpus_refresh` unspecified against an immutable `BundleCorpus`; the viewer LRU could serve pre-refresh content after a refresh | FIXED in v2 — refresh = new corpus instance + LRU flush, with the finalized-incomplete / appended-markers rationale |
| M4 | MEDIUM | Default corpus construction throws on a single corrupt manifest — one truncated write bricks every tool | FIXED in v2 — `skipInvalid: true` + `invalidEntries` surfaced in `corpus_overview` |
| scope | — | A `restorePoison` tool is correctly NOT needed (would construct a World; failure details already exposed three ways) — but recorded SNAPSHOTS were absent from the catalog entirely, despite the engine's own `replay_across_failure` message pointing agents at them | FIXED in v2 — `bundle_snapshots` tool added (list ticks; fetch incl. the v6 `poisoned` field; arbitrary-tick hydration via the H1 helper); attachment-content deferral stated explicitly |

## Verified accurate by the reviewer (no action)

The full tool↔API inventory (`bundleSummary`, `bundleHotspots` options, markers with refs, `diffBundles` overlap semantics, `runMetrics` + exactly 11 factories, `compareMetricsResults` two-run composition, `getErrorCode` covering the corpus/viewer error families); containment stronger than designed (corpus ids are Map lookups over scan-derived keys — never paths; symlinked dirs/manifests skipped at discovery); SDK 1.29.0 with `InMemoryTransport` + `Client` real for in-process round-trips; fixture-corpus-in-test feasibility; the honest-minor framing for 1.1.0; the LOC-budget extension point in tests/loc-budget.test.ts.

## Disposition

All findings folded into v2 (plus the transport-line consistency fix); design-2 = Gemini confirmation on v2, then implementation.
