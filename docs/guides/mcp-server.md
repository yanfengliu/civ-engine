# MCP Server (civ-engine-mcp)

`civ-engine-mcp` exposes the engine's recorded-game surfaces as [MCP](https://modelcontextprotocol.io) tools, so any MCP-capable agent (Claude Code, other harnesses) can interrogate a corpus of recorded sessions conversationally — no glue scripts per question. v1 is **read-only artifact interrogation**: the server never constructs Worlds and never writes files. Operating a *live* world over MCP is deferred until a game-module loading story exists (the engine's `worldFactory` boundary).

## Setup

The package is an in-repo subpackage (unpublished in v1):

```bash
cd mcp && npm ci && npm run build
node dist/cli.js --corpus path/to/corpus    # or CIV_ENGINE_CORPUS env (from repo root: node mcp/dist/cli.js)
```

MCP client registration (e.g. Claude Code):

```json
{
  "mcpServers": {
    "civ-engine": {
      "command": "node",
      "args": ["<repo>/mcp/dist/cli.js", "--corpus", "<corpus-dir>"]
    }
  }
}
```

The corpus directory is a `BundleCorpus` root: any directory whose subdirectories are closed `FileSink` bundles. Corrupt manifests are skipped (surfaced via `corpus_overview.invalidEntries`), not fatal.

## Tool catalog

| Tool | What it answers |
|---|---|
| `corpus_overview` | What's in this corpus? (counts, failure/incomplete tallies, time range, invalid entries) |
| `corpus_query` | Which bundles match? — 16 manifest filter fields; `key` exact or `keyPattern` regex source. Markers are NOT filterable (they live in bundle bodies). |
| `corpus_refresh` | Pick up new/finalized recordings (new corpus instance; flushes viewer caches). |
| `bundle_summary` | The LLM-flat overview of one bundle — the first call about any specific bundle. |
| `bundle_hotspots` | Where should I look? Tick failures, execution failures, duration outliers, markers, sorted by tick. |
| `bundle_markers` | Annotations with refs (entities, cells, tick ranges) and provenance. |
| `bundle_snapshots` | Recorded snapshot ticks; fetch one or hydrate ANY in-range tick (pure data folding — `snapshotAtTick`). Surfaces the v6 `poisoned` field: the terminal-state inspection path. |
| `viewer_frame` | One tick's events/commands/executions/markers/diff/failures; `includeState` adds full hydrated component state. |
| `viewer_diff` | Aggregated change set over a range — folded TickDiffs when possible, snapshot-hydration comparison otherwise; refuses ranges crossing a recorded failure. |
| `bundle_commands` / `bundle_events` | Raw streams, filterable by range and type. |
| `diff_bundles` | Two bundles tick by tick. Summary by default (`firstDivergentTick` + per-tick counts); `full` for complete deltas. Compare over the OVERLAPPING range. |
| `run_metrics` | The 11 behavioral metrics over any corpus query. |
| `compare_metrics` | Same metrics over two queries (e.g. `sourceLabel` per agent version) → deltas. |

## Output and error discipline

Every list-shaped output takes a `limit` and reports `total` + `truncated` — nothing is silently capped. Every tool error carries the engine's machine-readable code via `getErrorCode` (e.g. `entry_missing`, `replay_across_failure`) plus the message; codes are the branch key, exactly as in the engine itself.

## Agent patterns

- **Triage:** `corpus_overview` → `corpus_query` (e.g. `minFailedTickCount: 1`) → `bundle_hotspots` → `viewer_frame` at the hot tick → `bundle_snapshots` with the failed tick's predecessor for state.
- **Regression hunting:** `compare_metrics` with `baseline`/`current` queries split by `sourceLabel` or `recordedAfter`.
- **Failure forensics:** `bundle_snapshots` on a failure-terminated bundle — the terminal snapshot carries the v6 `poisoned` failure for inspection without replaying anything.
