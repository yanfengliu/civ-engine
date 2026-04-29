# Bundle Viewer — Code Review Iteration 1 (2026-04-28)

**Disposition:** Iterate (substantive findings); v2 fixes applied to the same staged diff before commit.

Reviewers: Codex (gpt-5.5 xhigh), Claude (`claude-opus-4-7[1m]` max). Both reviewers spot-checked the staged diff against DESIGN v6 and PLAN v2.

## Findings + dispositions

### Codex MAJOR-A — Snapshot fallback misses entity ID recycling at endpoints

`diffSnapshots` only compared `entities.alive` sets and ignored `entities.generations`. A recycled id whose generation changed between the two endpoints (alive in both, but the original was destroyed and recreated mid-range) produced no created/destroyed signal.

**Resolution:** `src/snapshot-diff.ts:diffEntities` now also compares per-id generations. Same numeric id alive in both with a different generation surfaces in BOTH `created` AND `destroyed`. Two new tests in `tests/snapshot-diff.test.ts`: "flags entity recycling (same id alive in both, different generation) as both destroyed and created" and "does not flag stable alive entities with unchanged generations."

### Codex MAJOR-B / Claude MAJOR — `frame.diffSince` correctness paths from DESIGN §11 untested

Failure-in-range, automatic sparse fallback, automatic recycling fallback, and folded TickDiff correctness all untested. The 110+ lines of fold logic had only the equal-endpoints vacuous case and direction normalization tests.

**Resolution:** `tests/bundle-viewer.test.ts` now includes:
- `failure-in-range throws BundleIntegrityError with enriched details` (asserts `code`, `failedTicks`, `fromTick`, `toTick`)
- `automatic snapshot fallback when intermediate tick lacks a SessionTickEntry`
- `automatic snapshot fallback when entity ID is recycled within the range`
- `folded tick-diff path coalesces last-write-wins for components and removed dominates set`
- `folded tick-diff path: state coalescing — set wins over later, removed dominates`

### Codex MAJOR-C / Claude MAJOR — `src/bundle-viewer.ts` exceeded the 500-LOC cap (705 LOC)

PLAN.md File Map anticipated this and listed the contingency. The contingency was not executed before staging.

**Resolution:** Three-file split:
- `src/bundle-viewer.ts` (446 LOC): `BundleViewer` class + re-exports
- `src/bundle-viewer-types.ts` (132 LOC): public type/error surface (`BundleViewerError`, `BundleViewerOptions`, `TickFrame`, `MarkerQuery`, etc.) + the `viewerError` helper
- `src/bundle-viewer-internal.ts` (175 LOC): `foldTickDiffs`, `bucketByTick`, `oneOrManySet`, `emptyTickDiff`, `EMPTY_FROZEN_ARRAY`

All under cap. Public import surface unchanged: callers still import from `civ-engine` (root barrel) or from `src/bundle-viewer.ts`.

### Codex MAJOR-D — Iterators re-sort entire streams on every call

`markers()`, `commands()`, `failures()` re-sorted the full `bundle.markers` / `bundle.commands` / `bundle.failures` arrays on every call, undermining the performance contract in DESIGN §10 ("iterators are lazy generators; filtering is `O(items in range)`").

**Resolution:** Pre-sorted streams `_sortedCommands`, `_sortedMarkers`, `_sortedFailures` are computed once at construction; iterators walk those frozen lists. Same change applied to `executions()` via `_sortedExecutionTicks`.

### Codex MAJOR-E — Doc references point at `docs/threads/done/bundle-viewer/...` while the thread is still under `current/`

`src/index.ts:148`, `src/snapshot-diff.ts:12`, `docs/design/ai-first-dev-roadmap.md:77`, `docs/design/ai-first-dev-roadmap.md:163` all link to `docs/threads/done/bundle-viewer/...`, but the diff only adds the thread under `docs/threads/current/`.

**Resolution:** The plan's Step 12 git-mv from `current/` to `done/` runs as part of the same commit, so the references resolve correctly at commit time. Verified by enumerating the planned moves at Step 12 and confirming the same forward-reference pattern was used by the bundle-corpus-index thread (links pointed at `done/` while the thread sat in `current/` until the closing commit moved it). No additional doc edit needed beyond the move itself.

### Codex MINOR + Claude MINOR — `BundleCorpusEntry` API block in `docs/api-reference.md` doesn't list `openViewer`

The Bundle Corpus Index section's `BundleCorpusEntry` declaration block is the canonical reference; the new method is documented in the trailing Bundle Viewer (v0.8.7) section but not folded into the main block.

**Resolution:** Deferred — both surfaces document the method; the trailing section explicitly carries the v0.8.7 signature. Any reader following the corpus block hits the integration cross-reference (`docs/guides/bundle-corpus-index.md` Replay Investigation section was updated). Folding the signature into the corpus block creates a duplicate signature to maintain. Acceptable.

### Claude MINOR — `_failuresByTick` was dead code

Built into a Map but never read; both `_diffSince` failure-in-range and `_failuresGen` walked `bundle.failures` directly.

**Resolution:** `_diffSince` failure-in-range scan now uses `_failuresByTick.keys()` directly. `_failuresGen` still uses `_sortedFailures` (the new pre-sorted list) because failures need ascending tick order. The `_failuresByTick` map serves the failure-in-range scan; the sorted list serves iteration. Both fields used.

### Claude MINOR — `_eventsGen` / `_executionsGen` relied on implicit recorder ordering

DESIGN §8 specifies tick-ASC iteration; relying on `bundle.ticks` storage order risked silent contract violation for hand-built bundles.

**Resolution:** Both generators now iterate `_sortedTicks` / `_sortedExecutionTicks` and look up per-tick frozen arrays via the per-tick maps.

### Claude MINOR — `Object.freeze([])` allocated per `atTick` for sparse ticks

ADR 33 promised "per-tick arrays are frozen once at viewer construction"; an empty fallback per-call breaks the claim.

**Resolution:** `EMPTY_FROZEN_ARRAY` shared module-level constant in `bundle-viewer-internal.ts`; all sparse-tick fallbacks reference it.

### Claude MINOR — `_foldTickDiffs` destroy-then-set order edge

The set loop ran after destroy could re-insert components for an entity destroyed in the same tick.

**Resolution:** `foldTickDiffs` now skips set entries whose entity is in `destroyed` and not in `created` (i.e., destroyed earlier in the fold); the recorder always emits matching `removed` for destroyed entities, but the defensive guard makes the fold order-stable for malformed inputs.

### Claude MINOR — `viewer.bundle` exposes mutable bundle (Codex M1 also)

`Readonly<SessionBundle>` is shallow; mutating `viewer.bundle.commands` would desynchronize the viewer's frozen indices.

**Resolution:** Documented as a contract: "the viewer treats the input bundle as logically immutable; mutating after construction is not supported." Class JSDoc updated. Deep-cloning the bundle would balloon memory for large captures; the readonly type contract plus documentation matches the engine's existing convention for `World.serialize()` outputs.

### Other minors (Codex / Claude)

- `BundleCorpusEntry` openViewer freeze test was shallow — now adds a mutation-attempt assertion. (Trivial.)
- Element-bypass test asserted no-throw only — extended to also verify mutation visibility across reads. (Trivial.)

## Validation

After fixes: 942+ tests passing (up from 936; 6 new tests added across diff cases). Full gates `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` re-run. All clean. v2 ready for re-dispatch (or commit if nothing else surfaces).
