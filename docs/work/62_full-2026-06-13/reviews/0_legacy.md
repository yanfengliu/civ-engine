# Full-codebase review — 2026-06-13, iteration 1

**Reviewers (4 independent, lens-split):** Claude opus[1m] max ×2 (core engine; session/replay/MCP) + Codex gpt-5.5 xhigh ×2 (standalone utilities/algorithms; design/architecture). **Gemini unreachable all session** (persistent `ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC`) — per the skill, compensated by spawning extra Codex/Claude lenses. Each reviewer had a whole-tree mandate with a primary deep focus; all grounded findings in file:line evidence; the newest code (mcp/, snapshotAtTick, VisibilityMap metrics, guards) got extra scrutiny. Prior full review (2026-06-11) closed clean — its already-fixed issues were not re-flagged.

**Headline:** the previously-clean core (tick/ECS/PRNG/system-ordering/query-cache/serialization round-trip), MCP containment, registration comparison, and FileSink atomicity all re-verified clean. Two HIGH issues found — one determinism (spatial grid), one resource-leak (sync playtest harness) — plus correctness MEDIUMs concentrated in input-validation and reference-aliasing, and honesty/robustness LOWs in the MCP surface.

## HIGH

| ID | Finding | Verified | Disposition |
|---|---|---|---|
| H1 | **Spatial-grid within-cell iteration order is not stable across serialize→deserialize**, violating the documented "engine query helpers iterate deterministically; user code may rely on it" contract. Live writes append to a cell `Set` in move order (`spatial-grid.ts:65`); `deserialize`/`openAt`/`forkAt`/mid-stream `applySnapshot` rebuild cells in position-store order (`world-queries.ts:160`). `getNeighbors`/`getInRadius`/`getAt`/`queryInRadius` expose that order unsorted (`spatial-grid.ts:106,144,89`, `world-queries.ts:41`). Silent simulation divergence for any system reading spatial iteration order after a reload — exactly the deferred `it.todo` clause-6 case (`determinism-contract.test.ts:340`). (claude-core) | ✅ confirmed | **FIX** — id-sort the spatial read results (`getNeighbors`/`getInRadius`/`getInRadiusWithComponents`/`getAt` view), matching `query()`'s id-sorted contract; add the clause-6 round-trip test. |
| H2 | **`runSynthPlaytest` leaks recorder state when a user callback throws.** `recorder.connect()` (`synthetic-playtest.ts:208`) wraps `world.submitWithResult` + sets `__payloadCapturingRecorder`; cleanup (`disconnect()`, line 266) is bypassed if `world.submitWithResult` (line 242, throws on bad command data) or `config.stopWhen` (line 259, user code) throws. The async `runAgentPlaytest` already guards this with try/finally (`ai-playtester.ts`). Leaves the World submit-wrapped and the mutex slot occupied → later recordings on that World fail or capture stale payloads. (codex-design) | ✅ confirmed | **FIX** — wrap the loop body in try/finally so `disconnect()` always runs; mirror the async harness. Pin with a throwing-policy/throwing-stopWhen test asserting the World is clean afterward. |

## MEDIUM

| ID | Finding | Verified | Disposition |
|---|---|---|---|
| M1 | **VisibilityMap read APIs create + persist phantom players.** `isVisible`/`isExplored`/`getVisibleCells`/`getExploredCells`/`getSources` route through `ensureUpdated`→`ensurePlayer` (`visibility-map.ts:200,213`), which stores a new empty player when absent; `getState` serializes all stored players. A pure read for an unknown id mutates canonical (serialized) state and grows memory unbounded. (codex-utils) | ✅ confirmed | **FIX** — read path must not create; absent player → empty/false, no store. |
| M2 | **`snapshotAtTick`/`hydrateAtTick` expose live bundle references** — returns `best.snapshot` unchanged when no diffs apply (`session-bundle-diff.ts:438`), and `applyTickDiff` reuses nested component/resource/state objects. Mutating the returned `WorldSnapshot` corrupts the source `SessionBundle`. (codex-design) | ✅ confirmed | **FIX** — deep-clone the returned snapshot at the `snapshotAtTick` boundary (defensive-copy discipline used everywhere else). |
| M3 | **`deepStructuralEqual` is asymmetric for `{}` vs `[]`** (`session-bundle-equivalence.ts:48`): object branch doesn't reject `b` being an array, so `({},[])`→true but `([],{})`→false. Drives fork/bundle divergence detection → a flipped `{}`↔`[]` payload can be reported "equivalent" by argument order. Also the 3rd near-duplicate deep-equal helper. (claude-core) | ✅ confirmed | **FIX** — add `\|\| Array.isArray(b)` guard; note the duplication for a future consolidation. |
| M4 | **MCP `compare_metrics`/`run_metrics` lose `±Infinity` regression signal** — behavioral metrics intentionally return `Infinity` for zero-baseline deltas (`behavioral-metrics.ts:314-330`, tested), but `format.ts:32` `JSON.stringify` serializes non-finite numbers as `null`. Agents see `null` instead of "baseline was zero". (codex-design) | ✅ confirmed | **FIX** — JSON replacer in `ok()` representing non-finite numbers recoverably (string form, matching the engine's EngineError sanitizer precedent). |
| M5 | **Input-validation gaps accept NaN/fractional where the engine's tick/grid discipline is integer-only:** (a) `snapshotAtTick` accepts NaN/fractional `tick` → returns a made-up state instead of throwing (`session-bundle-diff.ts:358-405`); (b) `createCellGrid`/`stepCellGrid` don't validate integer dims → `width=1.5` corrupts the flat `y*width+x` grid (`cellular.ts:14,60`); (c) marker validation accepts fractional ticks/tick-ranges/cells (`session-marker-validation.ts:28,50,59`) → invalid annotations enter bundles. (codex-utils ×3, codex-design confirms marker) | ✅ confirmed (marker ×2) | **FIX** — assert safe-integer tick/dims/coords at each public entry, with coded errors matching existing conventions. |
| M6 | **`ComponentStore.clearDirty()` rebuilds the entire baseline every tick in `semantic` diff mode** — O(N) `jsonFingerprint` of every live component per tick regardless of how few changed (`component-store.ts:120-129`), re-stringifying values `set()` already fingerprinted. Opt-in (not default), but defeats the scaling case semantic mode targets. (claude-core) | ✅ confirmed | **EVALUATE** — incremental baseline update (O(changed)); if the change is non-trivial/risky, document the cost and defer with a roadmap note. |

## LOW

| ID | Finding | Disposition |
|---|---|---|
| L1 | MCP `METRIC_FACTORIES[name]` plain-object lookup resolves prototype keys (`constructor`/`__proto__`) past the `!factory` guard → confusing error instead of clean "unknown metric" (`views.ts:23`, `server.ts:256,273`). (claude-core) | **FIX** — `Object.create(null)` or `hasOwnProperty` guard. |
| L2 | Hydrated (`recorded:false`) snapshots carry stale `rng`/`config`/`componentOptions` from the base snapshot; MCP `bundle_snapshots`/`viewer_frame` surface them with only `recorded:false` as a hint. (claude-core L3 + claude-session LOW-2, **converged**) | **FIX** — annotate hydrated results (`partial`/`excludes`) or tool-description caveat. |
| L3 | **MemorySink vs FileSink disagree on duplicate-tick snapshots**: a terminal snapshot landing on an already-snapshotted tick is pushed (dup) by `MemorySink` but overwritten (coalesced) by `FileSink`. MemorySink is the default → duplicated `snapshots[]` tick, extra zero-length `selfCheck` segment. (claude-session LOW-1) | **FIX** — dedup-by-tick in `disconnect()` (or `MemorySink`); pin both sinks with a unique-ticks test. |
| L4 | `world-core.ts:92-96` comment claims the `destroyCallbacks` Set matches the old array "exactly" — it doesn't (Set dedups a duplicate registration). (claude-core L4) | **FIX** — reword to note the intentional dedup. |
| L5 | ARCHITECTURE.md:50,121 + decisions.md ADR 50 say MCP is "sole owner of a runtime dependency (`@modelcontextprotocol/sdk`)" but `mcp/package.json` also has `zod` (and `civ-engine`). Core zero-dep claim still holds; the named boundary is incomplete. (codex-design) | **FIX** — name `zod` too. |
| L6 | `bundleHotspots`' internal `maxDurationOutliers` cap (default 10) silently drops outliers with no `truncated` signal at the MCP layer (`bundle-hotspots.ts:83`, `server.ts:108`). (claude-session LOW-3) | **EVALUATE** — surface a cap signal or document; low priority. |
| L7 | MCP re-reads + re-parses each bundle from disk per tool call (no bundle-level cache; `viewer_frame`+`includeState` parses twice). Perf only, refresh-correct. (claude-core L2 + claude-session, converged) | **EVALUATE** — memoize parsed bundles alongside the viewer LRU; perf-only, defer if risky. |
| NIT | `snapshotAtTick` says failed ticks "precede it" when `ft === tick` (`session-bundle-diff.ts:376`); guard correct, wording off. session-fork.ts is AT (not over) the 500-LOC ceiling — watch. | **FIX wording**; note fork file. |

## Verified clean (no action — explicit)

Tick pipeline & poison/advance ordering; EntityManager generation recycling; splitmix32 PRNG + GameLoop wall-clock-gating-only; system topo-sort determinism; query-cache id-sorted membership; ResourceStore order round-trip; serialize/`_replaceStateFrom`/deserialize liveness validation; `snapshotAtTick` range/failure/continuity guards; `diffSnapshots` order-independence; **MCP containment** (key-lookup only, no path from input, symlink rejection, no World construction, no sidecar bytes, honest truncation, fresh metric instances, memory-safe streaming); registration comparison; FileSink atomicity; VisibilityMap metrics copy-out + state-exclusion; `offDestroy` Set migration; no file over 500 LOC in src/mcp; no `Math.random`/`Date.now` in sim paths; comparator-less sorts are string-only.

## Fix order (iteration 1 → re-review at iteration 2)

HIGH H1, H2 first; then MEDIUM M1-M5 (M6 evaluate); then LOW L1-L5 + NIT wording (L6/L7 evaluate). TDD for every behavior change. Re-review (iteration 2) verifies fixes landed and introduced no regressions, considering this REVIEW.md + `docs/learning/lessons.md`.

## Fix summary (iteration 1 — all applied, gate-verified)

- **H1 FIXED** — `SpatialGrid.getNeighbors`/`getInRadius` + the World `getAt` view id-sort results; clause-6 round-trip test added (`determinism-contract.test.ts`). Benchmark tier-1 counters unchanged, tier-2 within bound.
- **H2 FIXED** — `runSynthPlaytest` loop wrapped in try/finally (disconnect always runs); submit-throw classified as `policyError`; 2 leak tests added (`synthetic-playtest.test.ts`).
- **M1 FIXED** — VisibilityMap reads use a non-creating `peekUpdated`; phantom-player test added.
- **M2 FIXED** — `snapshotAtTick` deep-clones its result; clone test added.
- **M3 FIXED** — `deepStructuralEqual` rejects array-vs-object both ways; symmetry test added.
- **M4 FIXED** — MCP `format.ok()` non-finite-safe replacer (Infinity→string); test added.
- **M5 FIXED** — integer/finite validation added to `snapshotAtTick`, `createCellGrid`/`stepCellGrid`, and marker tick/tickRange/cells; tests added in 3 files.
- **M6 FIXED** — `ComponentStore.clearDirty()` semantic-mode baseline is now incremental (O(changed), not O(N)); safe because all population goes through `set()` (marks dirty) before `clearDirty()`. Existing semantic-diff suite passes.
- **L1/L2/L3/L4/L5/NIT FIXED** — MCP metric null-proto lookup; hydrated-snapshot `carriedForward` signal; MemorySink/FileSink terminal-snapshot dedup; destroyCallbacks comment; ARCHITECTURE/decisions MCP-deps (zod); snapshotAtTick "precede" wording. Tests added for L1/L2/L3.
- **L6 DEFERRED** (bundleHotspots internal `maxDurationOutliers` cap not in MCP `truncated`) — it is a documented passthrough option and the list-level `truncated` is honest about the list cap; surfacing the inner drop needs a `bundleHotspots` return-shape change for marginal value.
- **L7 DEFERRED** (MCP re-parses bundles per call) — perf-only and refresh-correct; the viewer LRU already caches the expensive materialization, so a parallel bundle-parse cache adds invalidation surface for marginal gain.

Gates after fixes: root `npm test` 1225 passed + 1 todo; mcp 20; typecheck/lint/build + benchmark green.
