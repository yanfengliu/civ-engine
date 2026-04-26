# Review Summary

v0.5.4 closes the substantive iter-1 findings cleanly: `world.grid.getAt()` now returns a fresh `Set` copy (`src/world.ts:287-290`), `getLastTickFailure()` is back on per-call clone (`src/world.ts:1015-1017`), `cloneTickDiff` and `EventBus.getEvents` revert to JSON for V8 perf while `cloneTickFailure` keeps `structuredClone` to preserve `Error` instances (verified empirically), `serialize({ inspectPoisoned: true })` is wired into `WorldDebugger.capture`, `scenario-runner.captureScenarioState`, and `WorldHistoryRecorder` snapshots, examples and the RTS benchmark no longer read removed metric fields, the `normalizeSystemRegistration` casts now use the 4-generic form, and the diff-listener loop was already wrapped (Gemini's iter-1 finding was a false positive, confirmed at `src/world.ts:1461-1479`). 465 tests pass and `tsc --noEmit` is clean. The 6 new regression tests do test the contract (warn-once-per-cycle uses `toHaveBeenCalledTimes(1)`, legacy fields, dead-entity rejection, `inspectPoisoned` opt-out). The one substantive remaining item is doc drift in `docs/architecture/ARCHITECTURE.md`: three lines in the Boundaries section still describe the removed v0.5.0 spatial-sync routine, the removed `detectInPlaceMutations` snapshot round-trip, and the removed spatial scan metrics — Codex's iter-1 finding flagged line 88 specifically and it remains unfixed in v0.5.4.

# Sign-off

SIGN-OFF: ISSUES FOUND

# Critical

(none)

# High

(none)

# Medium

### ARCHITECTURE.md Boundaries section still documents removed v0.5.0 spatial/snapshot/metrics behavior
- **File**: `docs/architecture/ARCHITECTURE.md:80, 84, 88`
- **Iter-1 / iter-2 finding (if applicable)**: Codex iter-1 High "Core docs still describe removed phases, metrics, and submit semantics" (cited line 88 explicitly); Opus iter-1 High "Doc drift in api-reference.md and ARCHITECTURE.md"
- **Problem**: Three specific lines in the Boundaries section still describe v0.5.0-removed features:
  - Line 80: "**SpatialGrid** is a sparse map of occupied cells and is synced automatically by World's internal spatial index routine." — the per-tick `syncSpatialIndex()` scan was removed in v0.5.0 (verified at `src/world.ts`, no remaining `syncSpatialIndex` symbol). The grid is now updated lock-step at write time via `setPosition`/`setComponent`.
  - Line 84: "...so `diffMode` and `detectInPlaceMutations` survive save/load..." — `detectInPlaceMutations` was removed from `ComponentStoreOptions` in v0.5.0 (verified at `src/component-store.ts:5-7`, only `diffMode` remains). v5 snapshots now round-trip only `diffMode`.
  - Line 88: "...query cache hit/miss counts, entity counts, and spatial scan counts." — `WorldMetrics.spatial` only contains `explicitSyncs` after v0.5.0 (verified at `src/world.ts:91-95`). `fullScans` and `scannedEntities` are gone. The data-flow diagram (line 51) and tick-failure prose (line 87) were correctly updated in v0.5.4 — these three lines were missed.
- **Why it matters**: ARCHITECTURE.md is the canonical AI-facing architecture doc and AGENTS.md mandates it stay current with `drift-log.md` and `decisions.md`. Agents reading the Boundaries section will program against three behaviors that no longer exist. The api-reference fixes in v0.5.4 closed most of Opus's iter-1 doc finding but the architecture-side three-liner survived.
- **Suggested fix**: Reword line 80 to describe lock-step sync at `setPosition` time; drop "and `detectInPlaceMutations`" from line 84 (just "`diffMode`"); drop "and spatial scan counts" from line 88 (or replace with "explicit-sync counts"). Three small edits, no architectural change.

# Low / Polish

### `world.grid.getAt()` Set-isolation fix has no direct regression test
- **File**: `tests/world.test.ts:774-794`; fix at `src/world.ts:287-290`
- **Iter-1 / iter-2 finding (if applicable)**: Codex iter-1 High R3 (the iter-1 finding explicitly recommended "Add a regression that mutating the returned cell view does not change subsequent grid queries.")
- **Problem**: The new `read-only delegate` describe block tests that `insert`/`remove`/`move` are absent and that `getAt`/`getNeighbors`/`getInRadius` work, but not the actual fix iter-1 cited — that calling `world.grid.getAt(x, y)?.add(99)` / `.delete(id)` / `.clear()` does NOT corrupt the engine's spatial index. The fix is correct (`new Set(cell)` at `src/world.ts:289`), but a future refactor that returns the live cell again would not regress any test. Searched `tests/` for `getAt(...).clear`/`.add`/`.delete` patterns — no matches.
- **Why it matters**: The fix is the v0.5.4 commit's marquee item; without a test the contract isn't documented in code. Low because the fix itself is correct as written and the test gap is narrow.
- **Suggested fix**: Add to the `world.grid is a read-only delegate` describe: place an entity at (2,2), call `world.grid.getAt(2, 2)?.clear()` (or `.delete(id)`/`.add(999)`), then assert `world.grid.getAt(2, 2)?.has(id)` is still true and `getInRadius(2, 2, 1)` still contains `id`.

### Trailing-blank-line residue in test fixtures
- **File**: `tests/world-debugger.test.ts:23,137,195,242`; `tests/history-recorder.test.ts:18`; `tests/scenario-runner.test.ts:14`
- **Iter-1 / iter-2 finding (if applicable)**: Opus iter-1 Low; Gemini iter-1 Low
- **Problem**: The v0.5.4 sed cleanup removed the trailing whitespace from the blank-line residues left when `detectInPlacePositionMutations: false,` was deleted, but the blank lines themselves remain (e.g. an empty line between `tps: 10,` and `});` inside config object literals at the cited line numbers). Pure cosmetic.
- **Why it matters**: Cosmetic inconsistency only; ESLint's default rules don't flag this. Iter-1 already classified as Low/Polish.
- **Suggested fix**: Either delete the blank lines or run a formatter pass.

# Notes & Open Questions

- The cloneTickFailure → structuredClone rationale is correct: a quick smoke check (`structuredClone({error: new Error('test')}).error instanceof Error` → `true`) confirms that `Error` instances and their stack traces survive `structuredClone` but would be flattened to `{}` by `JSON.parse(JSON.stringify(...))`. The code comment at `src/world.ts:2216-2219` accurately captures this.
- The diff-listener loop at `src/world.ts:1461-1479` wraps the entire `for` loop in a single try/catch and routes throws to `finalizeTickFailure` with `phase: 'listeners'`. Gemini iter-1's claim that this was unwrapped is a false positive. Note however that the wrap is at the loop level (not per-listener), so a throwing listener #1 stops listeners #2..N from executing for that tick. This is consistent with the existing pre-v0.5.0 pattern on `main` (verified via `git show main:src/world.ts`) and matches the engine's "fail-fast" poison contract for diff failures. Asymmetric with `commandResult`/`commandExecution`/`tickFailure` listeners (which catch per-listener and only `console.error`) but intentional given diff is a tick-pipeline phase.
- `serialize()` continues to use `structuredClone(data)` for component and state values (not the JSON revert applied to `cloneTickDiff` and `EventBus.getEvents`). This is appropriate: serialize is not a hot per-tick path, and the bookkeeping is the same on JSON-shaped data, so the structuredClone slowdown is negligible on this path. The `assertJsonCompatible` runs immediately before each `structuredClone(data)` at `src/world.ts:828-829` so the values are guaranteed JSON-shaped.
- `ClientAdapter.connect()` and `requestSnapshot` at `src/client-adapter.ts:126,271` intentionally do NOT pass `inspectPoisoned: true` — this is correct, since ClientAdapter is the consumer-facing protocol and the warn-once latch will fire once per poison cycle to alert the operator. Engine-internal debug tooling correctly opts out.
- The `metadata references dead entity 999` regression test at `tests/serializer.test.ts:464-475` exercises a never-created entity id (999), not a destroyed id. Both paths fail `entityManager.isAlive()` (id 999 is out-of-bounds; destroyed id has `alive[id] === false`), so the throw fires for both. Wording in the test name says "dead entity" which subtly differs from "never-created", but the assertion `/references dead entity/` matches the actual error message regardless. Minor. The companion tags-side test does use a properly destroyed entity (line 453: `world.destroyEntity(b)` then injects `tags[b]`), so both forms are covered.
- The `warn-once` test at `tests/world-commands.test.ts:649-675` correctly asserts `toHaveBeenCalledTimes(1)` after `submit + submit + serialize + serialize`, then `recover() + new failure` and `toHaveBeenCalledTimes(2)`. Closes Opus iter-1 polish item M_NEW2.
