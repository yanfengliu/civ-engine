# Bundle Viewer Implementation Plan

> **For agentic workers:** Use the superpowers:test-driven-development discipline — failing tests first, then implementation, then doc updates. Steps use checkbox (`- [ ]`) syntax for tracking.

**Plan revision:** v2 (2026-04-28) accepted under `docs/threads/current/bundle-viewer/2026-04-28/plan-2/REVIEW.md` (both reviewers ACCEPT). Three post-acceptance nits folded into the same v2 doc: stale-reference audit narrowed to canonical surfaces; iteration directory naming switched to bare numbers per the existing convention; file map completeness gaps closed.

**Goal:** Implement Spec 4: Standalone Bundle Viewer per the accepted design (`docs/threads/current/bundle-viewer/DESIGN.md` v6). One coherent v0.8.7 commit lands the full surface: programmatic agent-driver API for navigating, slicing, and diffing a `SessionBundle`; `diffSnapshots` snapshot-pair helper; `BundleCorpusEntry.openViewer` integration; tests; docs; ADRs; doc audit; version bump.

**Architecture:** Add a focused viewer subsystem: `src/snapshot-diff.ts` owns the engine-generic `diffSnapshots(a, b, opts?)` helper (pure function, no viewer coupling); `src/bundle-viewer.ts` owns the `BundleViewer` class, `TickFrame` view, query/range types, and `BundleViewerError`. The viewer wraps a `SessionBundle` and lazily wraps a `SessionReplayer` constructed from the supplied `worldFactory`. `src/bundle-corpus.ts` gains one method (`BundleCorpusEntry.openViewer`) attached before `Object.freeze` in `makeEntry()`. `src/index.ts` exports the new surface. No changes to `SessionReplayer`, `SessionBundle`, `FileSink`, `MemorySink`, `BundleCorpus.makeEntry`'s shape, or any other existing API.

**Tech Stack:** TypeScript 5.7+, Node 22+, Vitest 3, ESLint 9, ESM + Node16 module resolution.

**Branch:** None. Commit directly to `main` after plan review, implementation, full gates, staged multi-CLI code review, and final doc updates.

**Versioning:** Current base is v0.8.6 (`7479541` AGENTS.md model bump). Spec 4 is additive and non-breaking, so ship v0.8.7 in one coherent commit.

---

## File Map

**Create:**
- `src/snapshot-diff.ts` — `diffSnapshots(a, b, opts?)` helper. Pure function; no class state. ~80 LOC.
- `src/bundle-viewer.ts` — `BundleViewer` class, `TickFrame`, query types, `BundleViewerError`. Re-exports `diffSnapshots`. Estimated ~400-450 LOC; if it crosses the 500-LOC cap, split helper functions into `src/bundle-viewer-internal.ts`.
- `tests/snapshot-diff.test.ts` — covers `TickDiff`-shape conversion, scope exclusions (config, rng, etc.), tick-field default behavior. ~150 LOC.
- `tests/bundle-viewer.test.ts` — full suite: construction, recordedRange/replayableRange, atTick, atMarker, timeline, iterators, freezing model, frame.state/snapshot/diffSince, fromSource, error taxonomy. ~600+ LOC; will likely split into `bundle-viewer-frame.test.ts` and `bundle-viewer-diff.test.ts` for readability.
- `tests/bundle-corpus-viewer.test.ts` — corpus integration test (kept separate so iterative full-file runs of `bundle-viewer.test.ts` never depend on Step 6 wiring being complete).
- `docs/guides/bundle-viewer.md` — new guide. Quickstart, marker-anchored navigation, content-bounded `recordedRange` for incomplete bundles, diff folding vs snapshot fallback, worldFactory requirements, BundleCorpus integration, sparse-tick behavior, failure-in-range, performance notes.
- `docs/threads/current/bundle-viewer/2026-04-28/<N>/REVIEW.md` — staged code-review synthesis per iteration (bare-number directory per the existing convention used by `bundle-corpus-index-task-1`, `thread-archive-migration`, etc.; `design-N`/`plan-N` are reserved for the design and plan stages already complete); move thread to `docs/threads/done/bundle-viewer/` after final convergence.

**Modify:**
- `src/bundle-corpus-types.ts` — add `openViewer<TEventMap, TCommandMap, TDebug>(options?: BundleViewerOptions<TEventMap, TCommandMap>): BundleViewer<TEventMap, TCommandMap, TDebug>` to the `BundleCorpusEntry` interface (the interface is declared here at `:81`, not in `bundle-corpus.ts`).
- `src/bundle-corpus.ts` — attach `openViewer` to the entry object inside `makeEntry()` before the `Object.freeze` call (currently at `:226`).
- `src/index.ts` — export the Spec 4 public surface.
- `package.json` — bump `"version"` from `0.8.6` to `0.8.7`.
- `src/version.ts` — bump `ENGINE_VERSION` from `'0.8.6'` to `'0.8.7'`.
- `README.md` — version badge, Feature Overview row mentioning Bundle Viewer, Public Surface bullet for the new exports.
- `docs/api-reference.md` — new `## Bundle Viewer (v0.8.7)` section enumerating all new exports.
- `docs/guides/session-recording.md` — short "Inspecting bundles" subsection pointing at `BundleViewer`.
- `docs/guides/bundle-corpus-index.md` — extend the replay-investigation example to use `entry.openViewer()`.
- `docs/guides/ai-integration.md` — add Spec 4 as Tier-3 inspection surface.
- `docs/guides/concepts.md` — add `BundleViewer` to standalone utilities list.
- `docs/guides/serialization-and-diffs.md` — note `diffSnapshots(a, b, opts?)` as the snapshot-pair diff helper alongside the existing `TickDiff` content; cross-link to the bundle viewer guide.
- `docs/README.md` — guide index entry for `bundle-viewer.md`.
- `docs/architecture/ARCHITECTURE.md` — Component Map row + boundary paragraph for Bundle Viewer.
- `docs/architecture/drift-log.md` — append Spec 4 row.
- `docs/architecture/decisions.md` — append ADRs 32-35 from the accepted design.
- `docs/design/ai-first-dev-roadmap.md` — mark Spec 4 implemented in the status tracker.
- `docs/changelog.md` — add v0.8.7 entry with new exports + behavior callouts.
- `docs/devlog/summary.md` — add one newest-first Spec 4 line; compact if length > 50 lines.
- `docs/devlog/detailed/<latest>.md` — append final task entry after code review converges; if today's file does not yet exist, create `docs/devlog/detailed/2026-04-28_2026-04-28.md` (or roll forward per AGENTS.md rules).

---

## Single Task: Spec 4 — Full Surface, Tests, Docs, Review, Commit

**Goal:** Land the entire Spec 4 surface in one v0.8.7 commit: tests, implementation, exports, docs, roadmap status, changelog/devlog, version bump, doc audit, gates, and staged multi-CLI code review.

**Files:** see File Map above.

### Step 1: Write failing tests first

- [ ] Create `tests/snapshot-diff.test.ts` covering: equal snapshots → empty TickDiff; entity create/destroy; component set/removed; resource set/removed; state set/removed; tags / metadata; `tick` defaulting (`opts.tick`, then `b.tick`, then `0`); explicit scope exclusions (`rng`, `componentOptions`, `config`, `entities.{generations,alive,freeList}`, `version`) — assert the result has no slot for those fields rather than asserting empty arrays.
- [ ] Create `tests/bundle-viewer.test.ts` (or split into `-frame.test.ts` + `-diff.test.ts`) covering every bullet in DESIGN §11. Use real `SessionRecorder` + `MemorySink` / `runSynthPlaytest` fixtures; do not hand-construct partial bundle shapes except for malformed-input tests.
- [ ] During iterative red/green steps (Steps 2-5), import directly from the new modules under test (`../src/snapshot-diff.js`, `../src/bundle-viewer.js`) rather than via `../src/index.js`, so the iteration does not depend on Step 7's exports landing first. The corpus-integration test added in Step 6 imports `BundleCorpus` from `../src/index.js` per existing convention; that test only needs to pass after Step 7. Final test runs (Step 8) use `../src/index.js` everywhere for consistency.
- [ ] Run `npm test -- tests/snapshot-diff.test.ts tests/bundle-viewer.test.ts`. Confirm the suite fails because the implementation does not exist yet.

### Step 2: Implement `diffSnapshots`

- [ ] Create `src/snapshot-diff.ts`. Export `diffSnapshots(a: WorldSnapshot, b: WorldSnapshot, opts?: { tick?: number }): TickDiff`. Compute the per-`TickDiff`-slot delta: entity sets via numeric ID set difference (taking `entities.alive` into account); component/resource/state set/removed via key-by-key compare; tags / metadata diff per entity. Strict scope: do not touch `config`, `rng`, `componentOptions`, `entities.{generations,alive,freeList}` directly in the result; entity-alive transitions still surface as `entities.created`/`entities.destroyed`.
- [ ] Run `npm test -- tests/snapshot-diff.test.ts`. Iterate until green.

### Step 3: Implement `BundleViewer` core (construction, ranges, indices)

- [ ] Create `src/bundle-viewer.ts`. Build the constructor: schema validation, marker index with duplicate-id check (`BundleIntegrityError({ code: 'duplicate_marker_id' })`), per-tick maps for events / commands / executions / markers / failures / tickEntries, `recordedRange` content-bounded (`min(metadata.endTick, contentMaxTick)`), `replayableRange` per `metadata.incomplete`. Freeze per-tick arrays once at construction. `worldFactory` stored for lazy use; no replayer constructed yet.
- [ ] Add `BundleViewer.fromSource(source, options?)`: call `source.toBundle()` and delegate to the constructor.
- [ ] Run `npm test -- tests/bundle-viewer.test.ts -t "construction|recordedRange|fromSource"` and iterate.

### Step 4: Implement frames + iterators

- [ ] Implement `atTick`, `atMarker`, `timeline`, `markerIndex` getter. Each frame is `Object.freeze`d on the freshly allocated outer object; `frame.events`, `frame.commands`, `frame.executions`, `frame.markers` reference the pre-frozen per-tick arrays; sparse ticks return `events: []`, `diff: null`, `metrics: null`, `debug: null` from the SessionTickEntry-derived side while still surfacing independent streams when present.
- [ ] Implement `events()`, `commands()`, `executions()`, `markers()`, `failures()` as generators. Bound validation eager (synchronous throw at the call site); body lazy. Apply query filters (range, type, kind, provenance, outcome, executed, id regex). Iteration order per DESIGN §8.
- [ ] Run frame + iterator tests. Iterate.

### Step 5: Implement state / snapshot / diff

- [ ] Implement `viewer.replayer()`: lazy memoized `SessionReplayer.fromBundle(this._bundle, { worldFactory })`. Throw `BundleViewerError({ code: 'world_factory_required' })` when no `worldFactory` was supplied.
- [ ] Implement `frame.state()` and `frame.snapshot()` via the memoized replayer's `openAt`/`openAt(...).serialize()`. Bubble `BundleRangeError` / `BundleIntegrityError` / `ReplayHandlerMissingError` unchanged.
- [ ] Implement `frame.diffSince(otherTick, opts?)`:
  - Validate `otherTick` (NaN/non-integer → `query_invalid`; out-of-`recordedRange` → `tick_out_of_range`).
  - Normalize `from = min`, `to = max`. Empty diff for `from === to`.
  - Failure-in-range pre-check: any `ft` with `from < ft <= to` → construct `BundleIntegrityError({ code: 'replay_across_failure', failedTicks, fromTick, toTick })`.
  - Path 1 (folded TickDiffs) if all of: every tick in `(from, to]` has `SessionTickEntry`; no entity ID appears in both `entities.created` and `entities.destroyed` over the range; `opts.fromSnapshot !== true`. Set `diff.tick = toTick`. Source `'tick-diffs'`.
  - Path 2 (snapshot via `diffSnapshots`) otherwise. Source `'snapshot'`. Inherits `BundleRangeError` from `openAt` if either endpoint is beyond `replayableRange`.
- [ ] Run `npm test -- tests/bundle-viewer.test.ts` (full file). Iterate to green.

### Step 6: Wire `BundleCorpus.openViewer`

- [ ] Modify `src/bundle-corpus-types.ts`: add `openViewer<TEventMap, TCommandMap, TDebug>(options?: BundleViewerOptions<TEventMap, TCommandMap>): BundleViewer<TEventMap, TCommandMap, TDebug>` to the `BundleCorpusEntry` interface (declaration site at `:81`).
- [ ] Modify `src/bundle-corpus.ts`'s `makeEntry()`: define `openViewer` as a method on the entry object before `Object.freeze`. Implementation: `return new BundleViewer<...>(entry.loadBundle<...>(), options)`.
- [ ] Add a corpus-integration test in a new `tests/bundle-corpus-viewer.test.ts` (kept separate from `tests/bundle-viewer.test.ts` so Step 5's iterative full-file run never depends on Step 6 being complete): build a `FileSink` corpus, use `corpus.get(key)?.openViewer({ worldFactory })`, assert the returned viewer's bundle equals `loadBundle()`'s output structurally, and that the entry remains frozen.

### Step 7: Export the surface

- [ ] Modify `src/index.ts`: export `BundleViewer`, `BundleViewerOptions`, `TickFrame`, `RecordedTickFrameEvent`, `RecordedTickEvent`, `BundleStateDiff`, `MarkerQuery`, `EventQuery`, `CommandQuery`, `ExecutionQuery`, `TickRange`, `DiffOptions`, `BundleViewerError`, `BundleViewerErrorCode`, `BundleViewerErrorDetails`, and `diffSnapshots`. Group under a "Bundle Viewer — Spec 4 (v0.8.7)" comment matching existing conventions.

### Step 8: Run full gates

- [ ] `npm test` — all suites green, no skipped tests beyond the existing `2 todo`.
- [ ] `npm run typecheck` — no errors.
- [ ] `npm run lint` — no errors.
- [ ] `npm run build` — clean dist output.

If any gate fails, fix root cause; do not skip tests.

### Step 9: Documentation

- [ ] Bump `package.json` version → `0.8.7`. Bump `src/version.ts` → `'0.8.7'`. Update README: version badge AND Feature Overview row mentioning Bundle Viewer AND Public Surface bullet listing the new top-level exports (per AGENTS.md Documentation discipline; the file map's "Modify README.md" entry expands to all three updates).
- [ ] Create `docs/guides/bundle-viewer.md`. Cover (mirroring DESIGN §12): quickstart; marker-anchored navigation; explicit `recordedRange` vs `replayableRange` (including content-bounded behavior for incomplete bundles); tick iteration (`timeline()`, `events()`, `commands()`, `executions()`, `markers()`, `failures()`); explicit `worldFactory` requirements (which methods need it, which don't); `diffSince` two paths (folded vs snapshot) + failure-in-range error; freezing model (frame frozen / arrays frozen / elements not); `BundleCorpus` integration via `entry.openViewer()`; `SessionReplayer` integration via `viewer.replayer()`; sparse-tick behavior; performance notes.
- [ ] Update `docs/guides/serialization-and-diffs.md`: add `diffSnapshots(a, b, opts?)` as the snapshot-pair helper, note its TickDiff-shape result and intentional scope exclusions per DESIGN §7, link to the bundle viewer guide.
- [ ] Add `## Bundle Viewer (v0.8.7)` to `docs/api-reference.md` enumerating every new export with full signature.
- [ ] Update `docs/guides/session-recording.md` with the "Inspecting bundles" pointer.
- [ ] Update `docs/guides/bundle-corpus-index.md` replay-investigation example to use `entry.openViewer()`.
- [ ] Update `docs/guides/ai-integration.md` with Spec 4 as Tier-3 surface.
- [ ] Update `docs/guides/concepts.md` standalone-utilities list.
- [ ] Update `docs/README.md` index.
- [ ] Update `docs/architecture/ARCHITECTURE.md` Component Map + boundary paragraph.
- [ ] Append row to `docs/architecture/drift-log.md`.
- [ ] Append ADRs 32-35 verbatim from DESIGN §14 to `docs/architecture/decisions.md`.
- [ ] Update `docs/design/ai-first-dev-roadmap.md`: change Spec 4 status from "Proposed" to "Implemented (v0.8.7)" with the link to `docs/threads/done/bundle-viewer/DESIGN.md` (which the thread move at Step 12 will create).
- [ ] Add v0.8.7 entry to `docs/changelog.md`. Cover: New section (BundleViewer + supporting types + diffSnapshots + BundleCorpusEntry.openViewer); Behavior callouts (selective runtime freezing, content-bounded recordedRange for incomplete bundles, failure-in-range BundleIntegrityError construction, no SessionReplayer changes); ADRs 32-35; Validation block.
- [ ] Add one newest-first Spec 4 line to `docs/devlog/summary.md`. Compact if > 50 lines. (The detailed devlog entry is deferred to Step 12 since it depends on code-review convergence.)

### Step 10: Doc audit

- [ ] Invoke `doc-review` skill OR run a stale-reference grep narrowed to canonical surfaces (avoid thread-context hits in `docs/threads/`): `grep -rE "options.replayer|replayer_bundle_mismatch|options_conflict" README.md docs/api-reference.md docs/guides/ docs/architecture/ docs/changelog.md docs/devlog/summary.md` → no hits expected. (Hits in `docs/threads/current/bundle-viewer/DESIGN.md` ADR 35 and `PLAN.md` itself are acceptable thread context.) `grep -rE "BundleViewer" README.md docs/api-reference.md docs/guides/ docs/architecture/ docs/changelog.md docs/devlog/summary.md` → present in the canonical guides + api-reference + changelog + ARCHITECTURE + roadmap + concepts.
- [ ] Verify the full DESIGN §17 export list appears in `docs/api-reference.md` with current signatures: `BundleViewer`, `BundleViewerOptions`, `TickFrame`, `RecordedTickFrameEvent`, `RecordedTickEvent`, `BundleStateDiff`, `MarkerQuery`, `EventQuery`, `CommandQuery`, `ExecutionQuery`, `TickRange`, `DiffOptions`, `BundleViewerError`, `BundleViewerErrorCode`, `BundleViewerErrorDetails`, `diffSnapshots`, plus `BundleCorpusEntry.openViewer`.

### Step 11: Multi-CLI code review

- [ ] Iteration directory: `docs/threads/current/bundle-viewer/2026-04-28/<N>/` (bare numbers, starting `1`, incrementing per AGENTS.md). Mirror under `tmp/review-runs/bundle-viewer/2026-04-28/<N>/` for raw captures.
- [ ] Stage all changes (`git add -A`). Generate a diff against `main`.
- [ ] Dispatch in parallel:
  - Codex: `git diff main | codex exec --model gpt-5.5 -c model_reasoning_effort=xhigh -c approval_policy=never --sandbox read-only --ephemeral "<task-specific prompt>"` → `tmp/review-runs/bundle-viewer/2026-04-28/<N>/codex.txt`
  - Claude: `git diff main | claude -p --model "claude-opus-4-7[1m]" --effort max --append-system-prompt "<task-specific prompt>" --allowedTools "Read,Bash(git diff *),Bash(git log *),Bash(git show *)"` → `tmp/review-runs/.../claude.txt`
- [ ] **Prompt construction:** start with the AGENTS.md baseline review prompt (`"You are a senior code reviewer. Flag bugs, security issues, and performance concerns. Do NOT modify files or propose patches..."`) and enrich with: (a) spec context (Spec 4 of the AI-first roadmap, accepted DESIGN.md v6), (b) the four AGENTS.md review aspects (design quality / scaling / debuggability / leanness; test coverage; correctness; clean code, typing, efficiency, no memory leaks, no >500-LOC files, doc accuracy per AGENTS.md Documentation discipline), (c) the task-specific anti-regression checklist: selective freezing model correctness, content-bounded `recordedRange`, `diffSince` path-1 guards (including entity recycling), failure-in-range `BundleIntegrityError` construction at the call site, eager query validation, generic typing through `fromSource` and `openViewer`. **For iter-2 and beyond:** include the prior-iteration `REVIEW.md` files (concatenated) AND `docs/learning/lessons.md` so reviewers verify previous fixes landed and don't re-flag closed issues.
- [ ] Wait via background `until` poller (no manual sleep loops).
- [ ] Synthesize into `docs/threads/current/bundle-viewer/2026-04-28/<N>/REVIEW.md` with severity-tagged findings + disposition.
- [ ] Address every real finding. Re-run gates. Re-stage. Re-dispatch reviewers as iteration N+1.
- [ ] Stop when both reviewers nitpick or accept. Per AGENTS.md, do not exceed 3 iterations without escalating to the Tie-Breaker. **Tie-breaker invocation:** `claude --model "claude-opus-4-7[1m]" --effort max -p "<tie-breaker prompt requiring binary ACCEPT/REJECT with prescriptive patch on REJECT>"`.

### Step 12: Commit and close thread

- [ ] Final review converged.
- [ ] Append final task entry to `docs/devlog/detailed/<latest>.md`. If today's file does not yet exist (the latest is older), create `docs/devlog/detailed/2026-04-28_2026-04-28.md` and roll filenames per AGENTS.md.
- [ ] `git mv docs/threads/current/bundle-viewer docs/threads/done/bundle-viewer`. Confirm `docs/threads/current/` only contains `.gitkeep` afterwards (so the regression test in `tests/docs-threads.test.ts` stays green).
- [ ] **Final gates on the post-thread-move tree** (before committing): `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. All four must pass; do not commit if any fails.
- [ ] `git add -A && git commit -m "feat(bundle-viewer): Spec 4 — programmatic agent-driver API + diffSnapshots (v0.8.7)"`.
- [ ] Verify `git log --oneline -1` shows the new commit. Re-run `npm test` once more on the post-commit tree as a smoke check.

---

## Risk register

- **Selective freezing model is unfamiliar.** Test the bypass case explicitly so the contract is locked: assert that mutating an array element through a `(as any)` cast succeeds on the immediate read but does not affect the per-tick map across viewer instances built from a fresh bundle.
- **`BundleViewer` LOC could exceed 500.** If splitting becomes necessary, factor query iterators and freezing helpers into `src/bundle-viewer-internal.ts` and re-export from `bundle-viewer.ts`. Preserve the public-import surface unchanged.
- **`BundleCorpusEntry` interface change is technically source-breaking.** Per DESIGN §13 / ADR review, the only constructor is `BundleCorpus.makeEntry()` and there is no external implementer in this repo, so the `c` bump rationale holds. If a future external consumer emerges, that's a contract refactor for another spec.
- **Incomplete-bundle test fixture is fiddly.** Use `MemorySink` with a forced sink-write failure (e.g., `sink._failOnWrite = true`-style hook if available, otherwise a custom `SessionSink` that throws) to simulate the recorder's `_terminated` short-circuit at `src/session-recorder.ts:414`. Goal: `metadata.endTick > contentMaxTick`. If injecting termination is too disruptive, fall back to constructing a malformed bundle by hand for that one boundary test, with a comment explaining why.

---

## Acceptance Criteria (mirrors DESIGN §17)

- All exports listed in DESIGN §17 ship from `src/index.ts`.
- All four engine gates pass.
- Multi-CLI code review converges.
- All doc-surface items in DESIGN §12 land in the same commit.
- Thread closed under `docs/threads/done/bundle-viewer/`.
