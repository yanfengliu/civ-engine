# Full Codebase Review — 2026-06-10, iteration 1

Baseline: v0.8.15 at `0769dea`, 1078 passed + 2 todo, all gates clean. First full review since iter-9 (2026-04-26, v0.7.6) converged clean — everything below postdates that baseline (v0.7.7 → v0.8.15: the entire session/corpus/playtest/viewer/fork stack plus the LOC-budget split).

**Reviewers:** Codex `gpt-5.5` (xhigh, general lens), Claude `claude-fable-5[1m]` ×2 (max effort; one correctness/runtime lens, one design/ergonomics/setup lens). Gemini omitted: plan-mode has no file-reading tools, which makes it prompt-only — useless for a no-diff full-codebase review; per the full-review skill, an extra instance of an available reviewer was spawned instead. All findings below were re-verified against live code by the synthesizer before acceptance; the bugs lens additionally executed a repro for H1 and explicitly refuted four of its own sweep-agents' claims (A* heap nondeterminism, PathRequestQueue growth, visibility over-inclusion, BT running-state staleness) — those are recorded as rejected, not findings.

## Verdict in one line

Core tick/ECS/determinism machinery is in genuinely strong shape (three independent lenses found zero defects there, and the v0.8.15 layer split is verified as the pure move it claimed); the real defects cluster in the session-recording/replay **error paths** — the code that runs exactly when something already went wrong.

## Findings — fix now

| # | Sev | Reviewer(s) | Finding (verified) | Fix batch |
|---|-----|-------------|--------------------|-----------|
| H1 | HIGH | Claude-bugs (repro-confirmed) | `selfCheck()` segment-skip guard off-by-one: `ft >= a.tick && ft < b.tick` (`session-replayer.ts:305`) excludes a failure at `b.tick`, but segment `(a,b]` replays `a+1..b` — and the terminal snapshot of every poisoned-stop bundle lands exactly at the failed tick. Every failure-terminated synth/agent/fork bundle makes `selfCheck()` throw raw `WorldTickFailureError` instead of reporting `skippedSegments`. Existing skip test simulates mid-segment failure only. | A |
| H2 | HIGH | Codex | FileSink sidecar path traversal: `descriptor.id` / requested `id` joined raw into the attachments path (`session-file-sink.ts:276,333`); manifest validation only requires string IDs (`bundle-corpus-manifest.ts:165-169`). Crafted IDs escape the bundle dir on write and read (corpus manifests are untrusted input). | A |
| H3 | HIGH | Codex + Claude-bugs (convergent) | `FileSink.open()` on a previously-used directory silently merges sessions: streams only created if missing, writes append, `snapshots/*` globbed wholesale — new manifest + stale ticks/snapshots = corrupt bundle, surfacing later as inexplicable selfCheck divergence. No supported reopen-for-write flow exists. | A |
| M1 | MEDIUM | Claude-bugs | `scenarioResultToBundle` omits `metadata.failedTicks` (`session-scenario-bundle.ts:62-73`), disabling `openAt`'s `replay_across_failure` guard, `selfCheck` skip, and `forkAt` preconditions for scenario bundles. The test meant to pin this is vacuous — its assertions sit behind `if (bundle.metadata.failedTicks && ...)` which is always false (`tests/scenario-replay-integration.test.ts:144`). | A |
| M2 | MEDIUM | Claude-bugs | `FileSink.writeSnapshot` is the one non-atomic write in an otherwise crash-tolerant sink (`session-file-sink.ts:241-247`); a torn snapshot makes the whole bundle unloadable via raw `SyntaxError`. Apply the manifest's tmp+rename pattern. | A |
| M3 | MEDIUM | Claude-bugs | `SessionRecorder.disconnect()` reads `this._sink.metadata` outside try (`session-recorder.ts:225`); after a connect-time `open()` failure both sinks' getters throw `not_opened`, so disconnect throws before `_closed = true` — contradicting its own documented finalize-cleanly recovery path. | A |
| M4 | MEDIUM | Claude-bugs + Claude-design (convergent) | `onDiff` listeners receive the live internal `TickDiff` with write-through references into component/state stores (`world-tick.ts:196`), inconsistent with `getDiff()`'s deep clone, EventBus per-listener clones, and the transaction read-only façade; the comment at `world-internal.ts:136-137` ("cloneTickDiff runs once per tick per diff listener") is false — its only call site is `getDiff()`. Pre-existing (byte-identical at 0c3b411), user-facing hazard. Fix: clone per listener (making the comment true); zero cost with zero listeners. | B |
| M5 | MEDIUM | Claude-design | `findNearest` is O(R³) on a miss: full-bbox `getInRadius` rescans per expanding radius up to the map diagonal (`world-queries.ts:61-93`, `spatial-grid.ts:132-148`). "No enemy exists" is a routine query. Fix: perimeter-ring scan (O(R²) total) + explicit deterministic tie-break (lowest entity id at equal distance), documented as a behavior-visible change. | B |
| L1 | LOW | Codex | BundleViewer marker `RegExp` id filters stateful with `/g`/`/y` (`bundle-viewer.ts:222`); bundle-corpus already resets `lastIndex` (`bundle-corpus.ts:328-334`). Mirror it. | A |
| L2 | LOW | Claude-bugs | `_replaceStateFrom` preserves the EventBus including its per-tick buffer — `getEvents()` after in-place `applySnapshot` on a stepped world returns the previous timeline's events until the next tick. One buffer-clear line. | B |
| L3 | LOW | Claude-bugs | Duplicate system names silently mis-bind `before`/`after` (last-write-wins `nameToSystem`, `world-systems.ts:102-108`); easy to hit since object-form registrations infer `name` from `execute.name` (`'execute'` for inline arrows). Fix: throw on *ambiguous reference* (constraint targeting a duplicated name) — preserves all current legal usage. | B |
| L4 | LOW | Claude-bugs | `PathCache.process()` mixes truthiness/undefined checks (`path-service.ts:114-119`): a custom `cacheKey` returning `''` is cached pinned to version 0 forever, serving stale paths across passability changes. Fix the `=== undefined` checks; document unbounded growth + `clearCache()` in api-reference (eviction policy itself deferred). | B |
| L5 | LOW | Claude-design | `history-recorder.ts:159` uses `Math.random()` for `recorderId` — the only `Math.random` in `src/`, on an engine whose brand is determinism. Counter suffices. | B |
| N1 | NIT | Claude-bugs | `MemorySink.writeAttachment` comment promises explicit dataUrl honored "regardless of size" while the `sidecar: false` + oversize + `!allowSidecar` path throws — align comment with behavior. | A |
| N2 | NIT | Claude-bugs | Stale post-split cross-references: `ai-playtester.ts:204` cites `world.ts:2151-2157` (now `world-commands.ts`); `world-internal.ts:136-137` per M4. | A/B |

## Findings — setup & environment (fix now, batch C)

| # | Sev | Finding (verified) | Action |
|---|-----|--------------------|--------|
| S1 | MEDIUM | `dist/` holds five orphaned modules from pre-rename builds (`bundle-viewer-cli*`, `session-attachment-id`, …) and nothing prevents `npm publish` shipping a stale `dist` (`files` includes it; no `prepublishOnly`, no clean step). | Clean `dist` in `build` (`node -e` rm), add `prepublishOnly: npm test && npm run build`. |
| S2 | MEDIUM | The layer chain's load-bearing "all upward `World` imports are type-only" invariant (ADR 43) has zero tooling enforcement; one `import type` → `import` edit compiles clean and creates a real ESM cycle. | ESLint `@typescript-eslint/consistent-type-imports` + `no-import-type-side-effects`; tsconfig `noImplicitOverride`. |
| S3 | MEDIUM | ESLint runs only the non-type-aware recommended preset; no `no-floating-promises`/`no-misused-promises` despite a real async surface; `examples/`/`scripts/` unlinted. | Enable targeted type-aware rules for `src`/`tests` (full `recommendedTypeChecked` deferred — churn). |
| S4 | LOW | CI: Node 20 only vs `engines >=18` (Node 18 is EOL); duplicate push+PR runs; no concurrency cancel, permissions block, pack check, or audit step. | Matrix 20/22, bump `engines` to `>=20` (+README), `concurrency`, `permissions: contents: read`, `npm pack --dry-run` step, audit step. |
| S5 | LOW | `vitest.config.ts` `passWithNoTests: true` is an inverted safety default. | Drop it. |
| S6 | LOW | No `.gitattributes`; live mixed EOL state verified (`i/lf w/crlf` mostly, `src/world.ts w/lf`). | Add `* text=auto`; index already LF so no renormalize churn. |
| S7 | NIT | `exports` lacks `./package.json`; stale `bash.exe.stackdump` in repo root. | Add entry; delete file. |

## Documented-deferred (real, not fixed in this cycle — recorded with triggers)

- **Query-cache churn wall** (Claude-design MEDIUM): every signature change walks all cached query arrays (O(waves × caches × size) under spawn/death waves); cache has no size cap and no visibility (`WorldMetrics.query` lacks a cache count). Trigger: ~2k churn/tick with 10-20 cached shapes at 20k+ entities. Mitigation path documented (dirty-flag sort-on-read or per-store membership sets). Benchmark gate (assessment item 5) should add a churn scenario first — measure, then optimize.
- **Per-tick state double-fingerprint + unconditional diff build** (Claude-design MEDIUM): `buildDiff` runs even in `release` profile with no listeners; large world-state values pay two `JSON.stringify`/tick forever; semantic `diffMode` re-fingerprints whole stores per tick. Deferred pending a profile-contract design (skip-diff-when-unobserved changes the `getDiff()` contract); guides should steer bulk data to `Layer` (already exists for exactly this) — doc note added in batch C.
- **Stringly core errors vs coded session-stack errors** (Claude-design MEDIUM): additive `EngineError { code }` migration is a coherent standalone objective; ~70 throw sites.
- **worldFactory registration manifest** (Claude-design MEDIUM, "highest-leverage AI-native improvement"): bundle carries registration fingerprint, replayer fails fast with structured mismatch instead of tick-400 divergence. Spec-sized; roadmap candidate.
- **Per-player filtered observation, intra-tick time-slicing, lockstep story**: named as missing pillars, roadmap material (consistent with the engine's own Tier framing).
- **`ResourceStore`/`SpatialGrid` mutable classes leak via star-exports** (LOW): undocumented surface; decision (curate vs document-as-standalone) belongs to the 1.0 surface definition, not a patch.
- **`addComponent` alias of `setComponent`** (NIT): guides should bless one idiom; doc-only.
- **PathCache eviction policy** (part of L4): growth documented now; LRU/size-cap is a design decision for when a consumer hits it.
- **bigint signature masks allocate in hot filters** (LOW): real at 10x, sound below ~50 components; Uint32Array-pair fallback is the eventual escape.

## Rejected claims (verified false before synthesis)

A* binary-heap tie-breaking nondeterminism (heap is pure array arithmetic — deterministic); `PathRequestQueue.compact()` unbounded growth (dead prefix bounded at 256/half); visibility-map bbox over-inclusion (exact inner check); BT running-state staleness on reshape (outside the ADR-8 contract).

## Sound areas (three-lens convergent)

Layer-chain split execution (transfer-list complete, single cast, type-only cycles, monkey-patch capture path intact); determinism core (seeded RNG, no wall-clock/randomness in sim paths, sorted or insertion-deterministic iteration everywhere it feeds serialization); destroy/recycle reentrancy; tick poison semantics incl. listener-phase asymmetry; occupancy stack determinism and bounds discipline; transaction denylist exhaustiveness; serializer V1-V5 validation; adapters; corpus/viewer/metrics/fork composition; `index.ts` curation (layer classes verifiably absent).

## Disposition

Iteration 1 closes with **3 HIGH + 5 MEDIUM + 5 LOW + 2 NIT accepted for immediate fix** (batches: A session/replay hardening, B core-engine hardening, C tooling/setup), 9 items documented-deferred with explicit triggers, 4 claims rejected on verification. Fixes proceed TDD-first; iteration 2 re-reviews the cumulative fix diff.
