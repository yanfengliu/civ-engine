# Review Summary

The five-batch fix chain closes the iter-2 review cleanly on its main beats: `findNearest`'s diagonal-corner correctness is fixed and tested; `serialize`/`deserialize` now `structuredClone` component data and state at both boundaries with regression coverage; `detectInPlaceMutations` and the per-tick spatial scan are gone with the breaking change properly versioned; `world.grid` is wrapped in a small read-only delegate; `EventBus.emit` rejects non-JSON payloads; the three listener emit paths now wrap exceptions; `submit`/`serialize` warn-once on a poisoned world; the typed registry generics thread through the main authoring callbacks; and the v0.5.3 polish bundle (overcost cull, `setMeta` finite check, cached `getLastTickFailure`, `structuredClone` swap, `EntityManager.fromState` validation) all land where claimed. Tests pass (459/459) and `tsc --noEmit` is clean. The biggest remaining risk is doc/peripheral drift: `docs/api-reference.md` still lists `'spatialSync'` as a TickFailurePhase in two places, and `examples/debug-client/app.js` plus `scripts/rts-benchmark.mjs` still read removed metric fields, so the benchmark and debug-client read `undefined` after the v0.5.0 breaking change. There are also two narrower issues — engine-internal `WorldDebugger.capture()` and `scenario-runner` call `world.serialize()` on a poisoned world by design, so the new v0.5.1 warn fires from the engine's own debug tooling — and several v0.5.3 contracts (`L_NEW4` dead-entity rejection, `M_NEW5` clone caching, `M_NEW3` overcost-skip perf claim) lack regression tests.

# Sign-off

SIGN-OFF: ISSUES FOUND

# Critical

(none)

# High

### `docs/api-reference.md` still lists removed `'spatialSync'` TickFailurePhase
- **File**: `docs/api-reference.md:264-275, 329-339`
- **Iter-2 finding (if applicable)**: R1 (v0.5.0 breaking-change doc drift)
- **Problem**: The v0.5.0 changelog removes `'spatialSync'` from `TickFailurePhase` (confirmed at `src/world.ts:139-145`), but the API reference still publishes the old type definition (`type TickFailurePhase = | 'commands' | 'spatialSync' | 'systems' | ...`) at line 268-274 and the prose at line 331 reads "A failure in any tick phase (commands, spatialSync, systems, resources, diff, listeners) marks the world as **poisoned**." This is the canonical public-API doc; AI-agent users reading it will believe `'spatialSync'` is still a valid phase value.
- **Why it matters**: Top-of-file public API drift on a breaking-change release. AGENTS.md states "If architecture changes, update the relevant sections in `docs/architecture/ARCHITECTURE.md`, append a row to `docs/architecture/drift-log.md`, and mention the update in the devlog" — the drift-log and ARCHITECTURE.md were updated, the api-reference was missed.
- **Suggested fix**: Drop `'spatialSync'` from the type alias at line 270 and from the prose at line 331. Keep the rest of the section as-is.

### Examples and benchmark scripts read removed metrics fields
- **File**: `examples/debug-client/app.js:263`, `examples/debug-client/worker.js:24`, `scripts/rts-benchmark.mjs:77-78,114`
- **Iter-2 finding (if applicable)**: R1 (v0.5.0 breaking-change leftover usages)
- **Problem**: Three code paths shipped with the repo still reference fields that v0.5.0 removed:
  - `app.js:263` reads `metrics.spatial.fullScans` to render the "Spatial Sync" row in the debug client. After the breaking change this is `undefined`, so the rendered text becomes `"<n> explicit / undefined scans"`.
  - `worker.js:24` passes `detectInPlacePositionMutations: false`. The constructor's `validateWorldConfig` no longer rejects unknown fields (verified at `src/world.ts:2291-2306`), so this is silently ignored — but the example still reads as if the option exists, so anyone copy-pasting from the debug client carries the dead option forward.
  - `rts-benchmark.mjs:77-78,114` pushes `metrics.spatial.fullScans` and `metrics.spatial.scannedEntities` (both `undefined`) into arrays that flow into `summarize()`, then publishes `spatialFullScans`/`spatialScannedEntities` keys in the benchmark report. `package.json` exposes `npm run benchmark:rts` and `npm run debug:client` as user-facing scripts.
- **Why it matters**: These two scripts are the user-facing demonstrations of the engine's metrics surface; running them after the breaking change produces `undefined` in user-visible output. Not in the diff filter (`src/`/`tests/`/`docs/`) but they are part of the repo and depend on the breaking change.
- **Suggested fix**: Remove the `detectInPlacePositionMutations: false` literals from both `worker.js` and `rts-benchmark.mjs`. Update `app.js:263` to display only `metrics.spatial.explicitSyncs` (or drop the row). In `rts-benchmark.mjs`, drop the two arrays and their summarized output keys.

# Medium

### `WorldDebugger.capture()` and `scenario-runner` trigger the v0.5.1 poisoned-world warn from the engine's own debug tooling
- **File**: `src/world-debugger.ts:142`, `src/scenario-runner.ts:343`, `src/world.ts:627-634`
- **Iter-2 finding (if applicable)**: H_NEW2
- **Problem**: H_NEW2's fix wires `warnIfPoisoned('serialize')` into `World.serialize()` (line 815). But `WorldDebugger.capture()` calls `this.world.serialize()` unconditionally, and `scenario-runner.captureScenarioState()` does the same. The whole purpose of these helpers is to inspect a world *after* a tick failure, so they will reliably hit the warn. Verified by running `npx vitest run` — both `tests/world-debugger.test.ts` and `tests/scenario-runner.test.ts` produce uncaptured stderr noise (`serialize called on a poisoned world (last failure: 'command_handler_threw' at tick 1)…`).
- **Why it matters**: Engine-internal infra is supposed to be the *normal* path for inspecting a poisoned world; an engine that warns from its own debugger is bad UX. The warn fires once per poison cycle so spam is bounded, but it's still a stderr write from a path the engine ships and tests against.
- **Suggested fix**: Either (a) add an internal `serializeUnchecked()` or `serializeForInspection()` that skips the warn and have `WorldDebugger.capture` / `scenario-runner` call it, or (b) thread the warn through a `silent` option on `serialize`, or (c) accept the noise but suppress it in the two engine-internal call sites with a one-shot guard.

### v0.5.3 `L_NEW4` (dead-entity tags/meta rejection on deserialize) lacks a regression test
- **File**: `src/world.ts:950-954, 968-972`
- **Iter-2 finding (if applicable)**: L_NEW4
- **Problem**: The fix throws `snapshot.tags references dead entity ${entityId}` and `snapshot.metadata references dead entity ${entityId}` (lines 951-953 and 969-971). No test in `tests/serializer.test.ts` or `tests/world-tags-meta.test.ts` constructs a malformed snapshot to exercise these throws. Searched with `grep -r "references dead entity" tests/` — no matches.
- **Why it matters**: The fix turns a silent quasi-bug into a thrown error, which is a behavior tightening; without a test, a future refactor that loosens the check (e.g. by skipping instead of throwing) would not regress any test. The change also implies a backward-compat tightening for snapshots produced by older buggy engines — a test would document the contract.
- **Suggested fix**: Add a test that constructs a v5 snapshot with `entities.alive[1] = false` and `tags[1] = ['someTag']`, then calls `World.deserialize(snapshot)` and expects `.toThrow(/references dead entity 1/)`. Mirror for `metadata`.

### `M_NEW3` overcost-skip perf claim lacks an assertion
- **File**: `src/pathfinding.ts:134`, `tests/pathfinding.test.ts:84-88`
- **Iter-2 finding (if applicable)**: M_NEW3
- **Problem**: The fix adds `if (newG > maxCost) continue;` before the `bestG.set` block. The existing `respects maxCost` test at line 84 only verifies the result is `null`, which was true before the fix. There is no assertion that the heap/`bestG`/`cameFrom` allocation count is bounded under tight `maxCost`. The perf claim in the changelog ("Pure efficiency win for path queries that exceed `maxCost`") is unverified.
- **Why it matters**: A future regression that pushes overcost neighbors back onto the heap (e.g. by reverting the line) would not fail any test. The change is small enough that this is low-stakes, but the test gap is real.
- **Suggested fix**: Add a test that uses `trackExplored: true` on a config where `maxCost` makes the goal unreachable, and assert `result === null` and the explored count is bounded. Or expose a counter for heap-pushes and assert it.

### `M_NEW5` clone caching invariant lacks a regression test
- **File**: `src/world.ts:1007-1013`
- **Iter-2 finding (if applicable)**: M_NEW5
- **Problem**: The fix caches the cloned `lastTickFailure` in `lastTickFailureClone`. The intent is "repeat calls return the same reference." Searched tests for `getLastTickFailure` and ref/cache assertions — no test verifies that two consecutive calls to `getLastTickFailure()` return `===`-equal references, or that `recover()` invalidates the cache (line 621), or that a new failure invalidates it (line 1690 in `finalizeTickFailure`).
- **Why it matters**: A future refactor that reintroduces per-call cloning silently regresses the perf win the fix promises; nothing fails.
- **Suggested fix**: Add a test in `tests/world-commands.test.ts` (where the listener-isolation tests already exercise tick failures): trigger a failure, assert `world.getLastTickFailure() === world.getLastTickFailure()`, then call `world.recover()`, trigger a new failure, assert the reference is different from before.

# Low / Polish

### `normalizeSystemRegistration` casts via the 2-generic `System` form, losing `TComponents`/`TState` type info
- **File**: `src/world.ts:1891-1892, 1902, 1917`
- **Iter-2 finding (if applicable)**: H_NEW3
- **Problem**: The function signature accepts the union of 2-generic and 4-generic forms, but the casts to `System<TEventMap, TCommandMap>` (without `TComponents`/`TState`) fall back to the default `Record<string, unknown>` for those generics. The return type is `RegisteredSystem<TEventMap, TCommandMap, TComponents, TState>`, so the assignment widens the function via cast. Type-safe in practice (function parameters are contravariant) but the cast loses type information that the rest of the H_NEW3 refactor preserves.
- **Why it matters**: Minor type-cleanliness gap; doesn't affect runtime or correctness. Worth addressing if H_NEW3 is meant to be the canonical typed-registry surface.
- **Suggested fix**: Update both casts to `System<TEventMap, TCommandMap, TComponents, TState>`. Remove the now-unused `as System<TEventMap, TCommandMap>` casts.

### `ClientAdapter`/`WorldDebugger`/`scenario-runner`/`history-recorder` don't thread `TComponents`/`TState`
- **File**: `src/client-adapter.ts:93-109`, `src/world-debugger.ts`, `src/scenario-runner.ts`, `src/history-recorder.ts`
- **Iter-2 finding (if applicable)**: H_NEW3 (scope question)
- **Problem**: The H_NEW3 fix threads `TComponents` and `TState` through `System`/`SystemRegistration`/`RegisteredSystem`/`registerSystem`/`registerValidator`/`registerHandler`/`onDestroy`/`destroyCallbacks`/`deserialize`. But the engine-internal `World<…>`-typed adapters (`ClientAdapter`, `WorldDebugger`, `scenario-runner`, `history-recorder`) still take `World<TEventMap, TCommandMap>` (2-generic). Per AGENTS.md a partial typed-registry surface is fine, but the iter-2 reviewer's open question 4 ("end-to-end or construction-only?") is not fully resolved.
- **Why it matters**: Minor scope inconsistency; users passing a 4-generic typed world to these adapters may lose typed-component/state access at the adapter boundary. Not a runtime issue.
- **Suggested fix**: Either widen the adapters to accept 4-generic worlds, or add a sentence to `docs/api-reference.md` clarifying that typed-registry generics are intended for system/handler/listener callbacks but not the read-only adapter surfaces. The current devlog at `docs/devlog/detailed/2026-04-25_2026-04-25.md` is silent on this.

### v0.5.1 "warns once per poison cycle" invariant is asserted only as `toHaveBeenCalled` (any number of times)
- **File**: `tests/world-commands.test.ts:610-647`
- **Iter-2 finding (if applicable)**: H_NEW2
- **Problem**: The two new poisoned-world tests use `expect(warnSpy).toHaveBeenCalled()`, which passes for any non-zero call count. The v0.5.1 changelog promises "(once per poison cycle)" but no test verifies the once-per-cycle invariant — i.e., that a second `submit` does not double-warn before `recover`, and that `recover` resets the latch.
- **Why it matters**: A future refactor that drops the `poisonedWarningEmitted` latch would silently regress the contract.
- **Suggested fix**: Replace `toHaveBeenCalled()` with `toHaveBeenCalledTimes(1)` after a sequence like submit + submit + serialize + serialize. Add a test that calls `recover()`, triggers a new failure, and verifies the warn fires once on the new cycle.

### v0.5.0 deserialize-of-legacy-snapshot lacks a regression test
- **File**: `src/world.ts:888-989`, `tests/serializer.test.ts:234-246`
- **Iter-2 finding (if applicable)**: R1
- **Problem**: The v0.5.0 changelog promises "Snapshots from v0.4.0 still load: extra fields (`detectInPlacePositionMutations`, `componentOptions[*].detectInPlaceMutations`) are ignored on read." `tests/serializer.test.ts:234` covers v1 snapshots but no test constructs a v5-shaped snapshot with the legacy fields present and asserts they are ignored without error.
- **Why it matters**: The promised backward-compat path is unverified; a strict-shape validator added later could regress it.
- **Suggested fix**: Add a test that builds a `WorldSnapshot` with `config.detectInPlacePositionMutations = false` and `componentOptions['health'].detectInPlaceMutations = false`, deserializes, and asserts no throw and that the world is constructed normally.

### Replacement of `detectInPlacePositionMutations` field on test config is left as a trailing comma rather than removed
- **File**: `tests/world-debugger.test.ts:23, 137, 195, 242`, `tests/history-recorder.test.ts:18`, `tests/scenario-runner.test.ts:14`
- **Iter-2 finding (if applicable)**: R1
- **Problem**: The diff removes `detectInPlacePositionMutations: false,` lines but leaves a stray empty line / trailing whitespace where the field used to be (see diff hunks `worker.js`-adjacent test fixtures and `tests/world-debugger.test.ts`). E.g. line 23 in `tests/world-debugger.test.ts` post-fix reads as a blank line inside the config object literal.
- **Why it matters**: Cosmetic; ESLint may or may not flag depending on rules. No functional impact.
- **Suggested fix**: Tidy the fixtures so the config literal closes cleanly.

# Notes & Open Questions

- The H_NEW1 listener-isolation fix is intentionally narrower than full event-listener isolation: `EventBus.emit` (line 12-21 in `src/event-bus.ts`) does not wrap user-registered `world.on(...)` listeners in try/catch. This is consistent with the fix scope (which targeted `commandResult`, `commandExecution`, `tickFailure` listeners) and the existing system-phase catch handler in `runTick` already coerces in-tick event-listener throws into a `phase: 'systems'` failure that goes through `finalizeTickFailure`, so the poison contract holds. Worth confirming this is the intended scope.
- `recover()` no longer resets `nextCommandResultSequence` and does not drain the command queue — both deferred per the devlog with documented justification. No issue, just noting these are tracked-deferred.
- `v0.5.3` includes the `L_NEW4` deserialize tightening (throws on dead-entity tags/meta). Strictly speaking this is a behavior tightening that could throw on snapshots an older engine accepted; the version policy in AGENTS.md ("bump `b` for breaking changes") is debatable here. Defensible because the older behavior was a quasi-bug, but if external users have stored snapshots generated by buggy older code, they'll see a deserialize throw they didn't see in v0.5.2.
- The `componentOptions[key] = { ...opts }` shallow clone at `src/world.ts:844` and `927` is correct for `ComponentStoreOptions` today (`{ diffMode? }` flat). If the options interface ever gains nested fields, this becomes a shallow-clone pitfall — worth a code comment.
- `findNearest` correctness regression test (`tests/world-spatial-query.test.ts:106-119`) is solid: 4×4 grid + diagonal corner + non-square grid. Confirms R2 is closed.
- Snapshot isolation regression tests (`tests/serializer.test.ts:404-446`) cover both serialize and deserialize boundaries with state and component data. Confirms C_NEW1 is closed.
- The overall fix chain is high-quality work. The findings above are correctness/coverage/doc gaps rather than bugs in the fixes themselves.
