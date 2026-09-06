# civ-engine-mcp — DESIGN

**Objective:** `mcp-server` · **Status:** v2 (post design-1: Claude 2 HIGH + 4 MEDIUM + scope refinements, all folded; Gemini failed to produce output — its pass runs as the design-2 confirmation) · **Origin:** post-1.0 roadmap Track C, first thesis-track objective (owner: "do the 1.x"). The ai-integration guide has anticipated MCP "on top" since Tier 1: the engine's machine-readable surfaces become tools any MCP-capable agent can call directly.

## Problem

Every AI-facing surface the engine built — corpus, bundles, viewer, hotspots, metrics, diffs — is a TypeScript API. An agent operating from a coding tool can use them only by writing and running scripts. MCP is the standard that removes that hop: expose the surfaces as tools and any MCP client (Claude Code, other agent harnesses) can interrogate recorded games conversationally, with zero glue code per question.

## Scope (v1): recorded-artifact interrogation, read-only

The server answers questions about RECORDED games over a corpus directory. Deliberately OUT of v1: operating a LIVE world and anything needing game code — `selfCheck`/`openAt`/`forkAt` require the game's `worldFactory`, so replay-execution tools wait for a game-module loading story (v2 candidate; the trigger is a consumer wanting conversational counterfactuals). Within v1 the server never constructs worlds, never writes files, and holds no mutable state beyond caches. **Engine prerequisite (1.1.0 additive, design-1 H1):** a public `snapshotAtTick(bundle, tick): WorldSnapshot` — the engine already contains the pure-data fold (`hydrateAtTick`, module-private in session-bundle-diff.ts) that materializes state from `initialSnapshot` + tick diffs with ZERO World construction; exporting it (with `diffSince`'s failure-crossing guard semantics) is what lets the server answer state questions without game code. Without it, `viewer_frame` cannot return components and `viewer_diff`'s snapshot fallback throws `world_factory_required` — and the fallback triggers on the NORMAL case (any entity created-and-destroyed within the range).

## Architecture

- **In-repo subpackage `mcp/`** with its own `package.json` (`civ-engine-mcp`, version 0.1.0, **private: true — not published in v1** (design-1 H2: npm does not rewrite `file:` specifiers on publish, so `npx civ-engine-mcp` + `file:..` is self-contradictory); entry is `node mcp/dist/cli.js`, `bin` retained for a future publish step that rewrites the dep to `^1.x`): the core package keeps zero runtime deps; the subpackage owns `@modelcontextprotocol/sdk` (^1.29) and depends on `civ-engine` via `file:..` (dev/CI-correct via symlink). Own tsconfig (extends root), own lockfile + `npm ci` + audit per the dependency protocol (the SDK pulls a sizable tree — the audit is load-bearing), own vitest config; root CI gains an `mcp` step sequenced AFTER the root build (the symlinked dep resolves against `dist/`), with `cache-dependency-path` for both lockfiles. The root LOC-budget rule applies to `mcp/src` (the budget test gains the directory).
- **Transport:** stdio (`StdioServerTransport`) — the MCP default for local tools. Entry (v1, unpublished): `node mcp/dist/cli.js --corpus <dir>`; corpus root also via `CIV_ENGINE_CORPUS` env. Multiple corpus roots NOT in v1.
- **Containment:** every bundle/file access goes through `BundleCorpus` over the configured root; bundle ids are corpus-relative names validated against the corpus listing (no caller-supplied paths touch the filesystem — the path-traversal hardening lives in FileSink/corpus already and the server adds an id-must-be-listed check).
- **Caching:** `BundleCorpus` is immutable after construction, so `corpus_refresh` CONSTRUCTS A NEW INSTANCE (design-1 M3) and **flushes the viewer LRU** — the same key can legitimately point at changed content (an incomplete bundle finalized; markers appended by the annotation workflow). LRU of N=4 materialized viewers otherwise. The corpus is constructed with `skipInvalid: true` (design-1 M4 — one corrupt manifest must not brick the server) and `corpus_overview` surfaces `invalidEntries` (count + paths + coded errors).
- **Errors:** every tool catches engine errors and returns MCP tool-error content carrying `getErrorCode(e)` plus the message, with a name/message fallback when the code is null (plain fs errors) — the cross-family branch key shipped in 1.0 exists exactly for this consumer.
- **Output bounds (no-silent-caps, design-1 M2):** EVERY list-shaped output takes a `limit` (with documented default) and returns an explicit `truncated` flag + total count; `diff_bundles` defaults to a SUMMARY mode (`firstDivergentTick`, per-tick delta counts) with full per-tick deltas on request — its `perTickDeltas` is a ReadonlyMap over the UNION tick range (enormous on long divergent bundles, and JSON.stringify serializes Maps as empty objects), so the wrapper converts explicitly.

## Tools (v1)

| Tool | Wraps | Notes |
|---|---|---|
| `corpus_overview` | `BundleCorpus` listing + metadata | counts, tick ranges, failure/incomplete tallies, time range |
| `corpus_query` | `BundleQuery` filters | the existing 16-field manifest filter surface (key/session/source, engine/node versions, incomplete, tick/count ranges incl. `failedTickCount`, policySeed, recordedAt, attachment mime) — markers are NOT filterable (they live in bundle bodies, not manifests; design-1 M1); `key` is exact-string with a separate `keyPattern` regex-source field (JSON cannot carry RegExp); returns entry metadata, not bundles |
| `corpus_refresh` | re-scan | explicit staleness control |
| `bundle_summary` | `bundleSummary` | the JSON-flat LLM-context shape that already exists for this purpose |
| `bundle_hotspots` | `bundleHotspots` | options passthrough (thresholds, markers) |
| `bundle_markers` | bundle.markers | with refs; supports the annotation workflow |
| `viewer_frame` | viewer frame + `snapshotAtTick` | one tick's events/commands/executions/markers + that tick's `TickDiff`; failures composed from `viewer.failures({from, to})`; full component STATE via the new `snapshotAtTick` helper on request (frames are unconditionally frozen — there are no freezing options) |
| `viewer_diff` | `frame.diffSince` / `diffSnapshots(snapshotAtTick(a), snapshotAtTick(b))` | folded-TickDiff path when available; the snapshot path now works WITHOUT game code via the 1.1.0 helper (the fold bails on the normal created-then-destroyed-in-range case, so this fallback is load-bearing) |
| `bundle_snapshots` *(added, design-1 scope)* | `bundle.initialSnapshot` / `bundle.snapshots` + `snapshotAtTick` | list recorded snapshot ticks; fetch one (or hydrate an arbitrary tick), surfacing the v6 `poisoned` field — closes the failure-triage loop the replay_across_failure error message points at |
| `bundle_commands` / `bundle_events` | viewer queries | the existing query option shapes |
| `diff_bundles` | `diffBundles` | two ids + options; overlap-range guidance baked into the description |
| `run_metrics` | `runMetrics` + 11 built-ins | metric selection by name; over a `corpus_query` filter |
| `compare_metrics` | `compareMetricsResults` | two filters → deltas |

Tool descriptions embed the same agent guidance the guides teach (e.g. "hotspots first, then viewer_frame the hot tick") so the tool surface is self-navigating.

## Testing

In-process round-trip tests via the SDK's `InMemoryTransport` + MCP `Client`: a fixture corpus (recorded in-test with `SessionRecorder` + `FileSink` into a temp dir) exercised through actual MCP tool calls — list/query/summary/hotspots/frame/diff/metrics happy paths, id-not-listed containment rejection, engine-error mapping (a malformed bundle id → tool error carrying the code), and refresh semantics. Plus schema validation of every tool's input/output shape.

## Docs & versioning

`docs/guides/mcp-server.md` (setup + tool catalog + agent patterns); README Feature Overview row + Public Surface note; api-reference: the new `snapshotAtTick` export gets a section (the MCP tool catalog itself is documented in the guide); roadmap Track C status update. Engine version: **1.1.0** rides this objective with TWO additive items — `snapshotAtTick(bundle, tick)` (the H1 prerequisite) and `VisibilityMap.getMetrics()/resetMetrics()` parity (the last review carry-over) — so the minor is honest; `civ-engine-mcp@0.1.0` is the subpackage's own (private) version. Surface fixture +1 each level for snapshotAtTick (the VisibilityMap methods are class-level — no fixture change). Explicitly deferred and stated: attachment CONTENT tools (manifest-level counts/mimes already surface via corpus entries); live-world/replay-execution tools (worldFactory = game-module loading, the v2 trigger). Changelog entries for both packages.

## Risks

- SDK API drift (1.x moves fast): pin `^1.29`, smoke-test in CI.
- Output size: viewer frames on big worlds can be large — tools accept component-key/entity filters and cap entity counts with an explicit `truncated` flag rather than silently clipping (no-silent-caps rule).
- Windows stdio quirks: CI runs the in-memory transport; stdio is exercised by a single spawn smoke test.
