# Full Codebase Review — 2026-04-25, iteration 2

Three independent reviewers ran in parallel against `main` (commit `b8c9809`, post-v0.4.0). All eleven iter-1 fix commits are in scope.

| Reviewer | Model | Mode | Output |
|---|---|---|---|
| Codex | `gpt-5.4`, `model_reasoning_effort=xhigh` | `codex exec`, sandbox `read-only`, `--ephemeral` | `raw/codex.md` |
| Gemini | `gemini-3.1-pro-preview` | `gemini -p`, `--approval-mode plan` | `raw/gemini.md` |
| Claude | Opus 4.7 (1M context) | `Agent` subagent, read-only | `raw/opus.md` |

The shared prompt is in `PROMPT.md`. **No code has been changed.** This document is the deliverable for user review before any fixes.

---

## Executive summary

The big iter-1 fixes — fail-fast tick failure semantics, snapshot v5 fidelity, behavior-tree preempt cleanup, command-loss audit, defensive copies on `getDiff` — all hold up under independent inspection. The remaining surface is narrower but real:

- **Two iter-1 fixes regressed in their ergonomics.** C1 (the hot-path `JSON.stringify` fix) was implemented behind an opt-out flag that defaults to **on**, so by-default users still pay the full O(N) cost the fix was supposed to eliminate. M1 (defensive copies on read-only views) is incomplete in three independent ways across `world.grid`, `getEvents`, and the unclonable-payload fallback.
- **One iter-1 finding turns out to be a correctness bug, not a perf nit.** L11 (`findNearest` Chebyshev-vs-Euclidean) was deferred as polish, but on any non-tiny grid `findNearest` silently returns `undefined` for entities in the diagonal corner — they exist, the function just can't reach them. Bumped to Critical.
- **One brand-new Critical surfaced.** `serialize()` and `deserialize()` alias caller-owned component/state objects by reference. Mutating a snapshot after serialize, or after deserialize, mutates live engine state outside the public write API.
- **The fail-fast contract has one hole.** Listeners (`commandExecutionListener`, `tickFailureListener`) are called outside any try/catch; a thrown listener bypasses `finalizeTickFailure`, leaving a partially-mutated world that is **not** marked poisoned. The diff-listener loop already does the right thing — apply that pattern to the other two emit paths.

What the reviewers did **not** find: no broken determinism, no new core ECS storage bugs, no new entity-cleanup hazards, no critical security issues. The general code health continues to be good.

**Recommended fix order:** Critical regressions → New Critical → High → Medium → Low. Estimated 4–6 small/medium PRs. Detailed batch plan at the end.

---

## Methodology notes

- All three reviewers got the same prompt and the same scope (`src/`, tests, `docs/architecture/`, plus the iter-1 REVIEW.md for context).
- Findings below are deduplicated and re-classified into a single severity scale based on actual observed impact, not the reviewer's stated severity. Where I disagreed with a reviewer's classification, the disagreement is flagged.
- **Verification status:**
  - ✅ I read the code and confirmed the finding is real.
  - 🟡 The claim is plausible/consistent with the code I read but I did not exhaustively verify the full claim.
  - ❓ I have a doubt or counter-argument; needs user judgement before implementing.

Spot-verifications I personally performed: C1 default flag (component-store.ts:30), findNearest correctness (world.ts:528), snapshot serialize aliasing (world.ts:802-874 + json.ts:7-57 confirms `assertJsonCompatible` only validates, doesn't clone), event-bus mutability (event-bus.ts:55-62), `world.grid` raw reference (world.ts:281), processCommands listener bypass (world.ts:1465-1543, 1638-1650).

---

## ITER-1 REGRESSIONS

### R1. C1 fix is gated behind an opt-out flag that defaults to on — ✅
**Reviewer:** Gemini. **Iter-1 ID:** C1.

- **Files:** `src/component-store.ts:26-31` (default), `src/component-store.ts:103-114` (`getDirty`), `src/component-store.ts:125-134` (`clearDirty`).
- **What's wrong:** Commit `27b775a` added a `detectInPlaceMutations` option that, when `false`, skips the per-entity `jsonFingerprint` scan. But the constructor sets `this.detectInPlaceMutations = options.detectInPlaceMutations ?? true;` (line 30). The default code path therefore still runs the full O(N) scan in both `getDirty` and `clearDirty`, **and** the strict-mode `set()` no longer pays the per-write fingerprint cost (good!) but the per-tick scan cost is unchanged. C1 was supposed to mean "strict mode is fast, semantic is the slower opt-in." Today: strict-mode is exactly as expensive as semantic-mode for most users.
- **Why it matters:** The headline win of v0.4.0 (per the changelog and ARCHITECTURE.md) is the strict-mode hot-path fix. By keeping `detectInPlaceMutations: true` as the default, the fix exists but is invisible unless users explicitly opt in to it.
- **Recommended fix:** Default `detectInPlaceMutations` to `false`, and document loudly that setting it requires write-through (`setComponent`/`setPosition`) for in-place mutations to be visible. This matches the original C1 spirit. Existing semantic-mode users are unaffected (the baseline rebuild is gated on `diffMode === 'semantic'`). Add a benchmark to lock in the expected perf delta.

### R2. `findNearest` silently returns `undefined` for diagonal entities — ✅
**Reviewer:** Opus. **Iter-1 IDs:** L11 (correctness, was deferred); H3 (perf, partially fixed).

- **File:** `src/world.ts:523-560`, esp. line 528: `const maxRadius = Math.max(this.spatialGrid.width, this.spatialGrid.height);`.
- **What's wrong:** Two issues compound at the same site:
  - **Correctness (L11, but actually Critical):** `getInRadius(cx, cy, r)` filters by `dx*dx + dy*dy <= r*r` (Euclidean), but the loop bound is `Math.max(width, height)` (Chebyshev). On any grid where `hypot(W-1, H-1) > max(W, H)` — i.e. anything bigger than ~3×3 — entities in the diagonal corner from the search point are never returned. Concrete repro: 4×4 grid, entity at `(3,3)`, `findNearest(0, 0)` returns `undefined`. Existing tests use a 20×20 grid with sub-15 distances and don't hit this.
  - **Performance (H3):** Commit `27b775a` did fold this to a single `getInRadius` call, but commit `75dd6a2` reverted to the expanding-radius walk to enable the early-out at line 537. The early-out is correct, but `getInRadius` rescans the full `(2r+1)²` box on every iteration — total cost Σ(2r+1)² ≈ O(R³). The `seen: Set` avoids reprocessing entities but doesn't avoid rescanning cells.
- **Why it matters:** Public API on the AI hot path; users will not notice the silent miss on corner queries because the function returns a "no entity exists" answer rather than an error.
- **Recommended fix (correctness first):**
  1. `maxRadius = Math.ceil(Math.hypot(this.spatialGrid.width - 1, this.spatialGrid.height - 1))`. Add a regression test for the corner-to-corner case.
  2. (Perf): introduce `SpatialGrid.getInShell(cx, cy, r)` that scans only the perimeter cells, and use it in the `findNearest` loop. The current Sigma-of-rings cost falls to O(R²).

### R3. M1 fix is incomplete in three places — ✅
**Reviewers:** Gemini (`world.grid`), Codex + Opus (`getEvents` fallback). **Iter-1 ID:** M1.

The M1 fix added defensive copies on `getEvents`, `getDiff`, `getByTag`, etc. Three holes remain:

- **R3a. `world.grid` is still a direct reference.** `src/world.ts:281`: `this.grid = this.spatialGrid;`. Typed `ReadonlyXxx` but mutable at runtime; `(world.grid as any).insert(...)` corrupts the spatial index.
- **R3b. `getEvents` deep-clone falls back to a live reference on stringify failure.** `src/event-bus.ts:3-10, 51-62`. `deepCloneJsonOrShallow` swallows the JSON error and returns the original. The comment claims "events flow through `assertJsonCompatible` at emit time elsewhere" — but `World.emit` (line 669-671) and `EventBus.emit` (line 19-27) do **not** call `assertJsonCompatible`. So a circular/`BigInt`/`Function`/`Symbol` payload silently degrades to a shared reference. The contract holds in the common case but breaks for exactly the inputs most likely to need it.
- **R3c. Same fallback path is reachable via the diff/state surface.** Less severe because component/state writes already pass through `assertJsonCompatible`, but worth checking once R3b is fixed.
- **Recommended fix:** (a) Wrap `world.grid` in a small object that delegates only the read methods (`getAt`, `getNeighbors`, `getInRadius`, `width`, `height`); use `this.spatialGrid` internally. (b) Add `assertJsonCompatible(data, ...)` to `EventBus.emit` (or `World.emit`) so non-JSON events fail fast at the write site, and remove the silent fallback in `deepCloneJsonOrShallow` — throw a clear "event payload is not JSON-cloneable" error if it ever fires. (c) Update or remove the misleading comment at `event-bus.ts:55-57`.

### R4. `EntityManager.fromState()` only validates `freeList`, not `alive`/`generations` — ✅
**Reviewer:** Codex. **Iter-1 ID:** L8.

- **File:** `src/entity-manager.ts:82-114`.
- **What's wrong:** The hardening from iter-1 validates the `freeList` shape but copies `alive` and `generations` arrays without checking that each `alive[i]` is boolean and each `generations[i]` is a non-negative integer. A malformed snapshot can restore an impossible entity state.
- **Recommended fix:** Validate every `alive` entry as boolean and every `generations` entry as `Number.isInteger(g) && g >= 0`. Reject malformed arrays before constructing the manager. Mirror the error style of `ResourceStore.fromState` / `DeterministicRandom.fromState`.

### R5. M10 is still open (acknowledged deferred) — note only
**Reviewers:** Codex (re-flag), Opus (note that this was deferred). **Iter-1 ID:** M10.

- **File:** `src/occupancy-grid.ts:229-249, 892-898`.
- **What's wrong:** `OccupancyGrid.isBlocked()` returns `true` immediately for static-blocked cells without consulting `options.ignoreEntity`. The user explicitly deferred this in iter-1 ("needs separate brainstorm" per commit `3493d21`). Codex flags it as a regression; Opus correctly notes the deferral.
- **Action:** Either (a) decide the policy now (entity-less terrain only? owner-aware blocks?), or (b) update `docs/api-reference.md` / `docs/changelog.md` to be explicit that static blocks are entity-less and `ignoreEntity` does not apply. **Decision needed from user before any code change.**

---

## CRITICAL

### C_NEW1. `serialize()` and `deserialize()` alias caller-owned objects — ✅
**Reviewer:** Codex.

- **Files:** `src/world.ts:802-874` (`serialize`), `src/world.ts:877-918` (`deserialize`), `src/component-store.ts:136-146` (`fromEntries`).
- **What's wrong:** In `serialize()`:
  - Line 805 `const entries = [...store.entries()]` — the spread creates a new outer array but the inner `[id, T]` tuples still hold the same `T` reference as the live store.
  - Line 841 `state[key] = value;` — raw reference assignment.
  - Line 807 `assertJsonCompatible(data, ...)` — verified by reading `src/json.ts:7-57`; this only validates, it does not clone.
  - Result: the returned `WorldSnapshot` aliases live engine objects. Mutating `snapshot.components.position[0][1].x = 999` after `serialize()` mutates the live component.

  In `deserialize()` (line 907): `ComponentStore.fromEntries(entries, opts)` calls `set(id, data)` which stores `this.data[entityId] = component` — by reference. Mutating `snapshot.components[...]` after deserialize mutates the new world's live component.
- **Why it matters:** Every other public boundary in the engine (`getDiff`, `getEvents`, `getByTag`) was specifically hardened in iter-1 to defensively copy. The single most serialization-shaped boundary is the one that doesn't, and the asymmetry is invisible from the type signatures. A renderer adapter, transport adapter, or AI agent that "tweaks the snapshot before saving / after loading" will silently corrupt the world.
- **Recommended fix:** Deep-clone (or `structuredClone`) component payloads and state values on **both** boundaries:
  - In `serialize()`: clone each `data` and each `state[key]` after `assertJsonCompatible` validates JSON-shape.
  - In `deserialize()`: clone before passing to `ComponentStore.fromEntries`, or have `fromEntries` clone internally.
- Add regression tests:
  - `world.serialize()` → mutate the returned snapshot → assert live `world.getComponent(...)` unchanged.
  - `World.deserialize(snapshot)` → mutate the snapshot → assert the new world's components unchanged.

### C_NEW2. `findNearest` correctness bug (see R2 above)
Already covered as an iter-1 regression (R2), but it is a Critical-class correctness bug — not just a perf issue. Listed here for visibility in fix prioritization.

---

## HIGH

### H_NEW1. Listener exceptions in `processCommands` and `emitTickFailure` bypass the poison contract — ✅
**Reviewer:** Opus.

- **Files:** `src/world.ts:1335-1440` (`runTick`), `src/world.ts:1465-1543` (`processCommands`), `src/world.ts:1545-1573` (`dropPendingCommands`), `src/world.ts:1638-1650` (`emitCommandExecutionResult`/`emitTickFailure`), `src/world.ts:1843-1858` (`emitCommandExecution`).
- **What's wrong:**
  - `processCommands` calls `this.emitCommandExecution(...)` from four sites. Two of them — line 1476 (missing-handler branch) and the inner loop at line 1559 (via `dropPendingCommands`) — are NOT wrapped in any try/catch.
  - `emitCommandExecutionResult` (line 1638-1644) and `emitTickFailure` (line 1646-1650) iterate listeners with no try/catch. Any synchronous throw from a registered listener propagates straight up.
  - `runTick`'s outer block at line 1335 has only a `finally`, no `catch`. So if a `commandExecutionListener` throws during `processCommands`, the throw bypasses `finalizeTickFailure` entirely. Result: `this.poisoned` stays `null`, `this.lastTickFailure` is stale or missing, `gameLoop.tick` is not advanced, and the world has been partially mutated (handlers before the listener throw ran; eventBus was cleared; dirty flags were cleared).
  - The diff-listener loop (line 1442-1460) **does** wrap in try/catch and routes to `finalizeTickFailure` correctly.
- **Why it matters:** The whole v0.4.0 "poison-on-tick-failure" contract — which ARCHITECTURE.md and the changelog both document as invariant — is violated by the simplest user mistake: a listener that throws. The bug is reproducible by registering an `onCommandExecution` listener that `throw`s, submitting a command, and stepping; the world ends up partially mutated and **not** poisoned.
- **Recommended fix:** Apply the diff-listener pattern to both other emit paths:
  - In `emitCommandExecutionResult` and `emitTickFailure`, wrap `listener(...)` in `try { ... } catch (error) { /* collect */ }`. Don't let a listener throw escape into the engine pipeline.
  - On collected listener errors, route them through `finalizeTickFailure` with a synthetic `phase: 'listeners'`/`code: 'listener_threw'` failure (matching the diff-listener path's existing semantics).

### H_NEW2. The poisoned-world contract only blocks stepping, not other stateful public APIs — 🟡
**Reviewer:** Codex.

- **Files:** `src/world.ts:577-607, 687-712, 802-874`.
- **What's wrong:** `step()`, `stepWithResult()`, and `executeTickOrThrow()` guard on `this.poisoned` and refuse to advance, but `submit()` / `submitWithResult()` still accept commands and `serialize()` still exports a snapshot while the world is in a known-tainted fail-fast state.
- **Why it matters:** "Fail-fast" in the docs reads as "the world is frozen until you call `recover()`," but in practice it is "you can't `step()` until you call `recover()`." Agents may queue future work or persist ambiguous partial state on top of a poisoned world.
- **Open question:** Is this intentional (debug/repair workflows need access to a poisoned world's queue and state) or an oversight? **Decision needed from user.**
- **Recommended fix (assuming oversight):** Centralize an `assertNotPoisoned()` guard for `submit`, `submitWithResult`, `serialize`, `serializeForRender`/render-adapter boundaries. If debug-time access is desired, expose it as `serializePoisoned()` / `submitPoisoned()` so the contract is explicit.

### H_NEW3. `TComponents` and `TState` generics drop out at the callback boundary — 🟡 / ❓
**Reviewer:** Codex.

- **Files:** `src/world.ts:29-42` (`System` type), `src/world.ts:361-365` (`onDestroy`), `src/world.ts:722-731` / `763-776` (registration entry points), `src/world.ts:877-887` (`deserialize` generics).
- **What's wrong:** `System`, `registerSystem`, `registerValidator`, `registerHandler`, `onDestroy`, and `deserialize()` only thread `TEventMap` and `TCommandMap`. `TComponents` and `TState` are dropped from the `World` parameter passed into user callbacks, so inside those callbacks `world.getComponent(...)` and `world.getState(...)` lose their typed signatures. Iter-1 added the `TState` generic and a typed component registry but didn't propagate them through the surfaces where game logic actually consumes the API.
- **Why it matters:** The headline ergonomics feature from the v0.3.x batch (typed component registry) and from the iter-1 M7 fix (`TState` generic) are not actually visible in the engine's main authoring surfaces — users still get `unknown` / `Record<string, unknown>` inside system functions.
- **Open question:** If the typed-registry feature is intended only for the construction surface (`world.setComponent`/`world.setState`), that needs documenting. If it's intended end-to-end, the generics need to be threaded through. **Decision needed from user.**
- **Recommended fix (if end-to-end):** Add `TComponents` and `TState` to `System`, `SystemRegistration`, `LooseSystem`, callback signatures of `registerSystem`/`registerValidator`/`registerHandler`/`onDestroy`, and `deserialize()`. Most of the work is type-only; runtime stays the same.

---

## MEDIUM

### M_NEW1. `recover()` doesn't drain commands or events that survived the failed tick — 🟡
**Reviewer:** Opus.

- **Files:** `src/world.ts:618-623` (`recover`), `src/world.ts:1469` (`processCommands` calls `commandQueue.drain()`), `src/event-bus.ts:64-66` (`clear`).
- **What's wrong:** When a tick fails, the failing tick's drained commands have been audited (executed / `command_handler_threw` / `tick_aborted_before_handler`). But any commands `submit()`-ed **during** the failing tick — by an executed handler before the failure, or by a system before a system-phase failure — sit in the (now-undrained) `commandQueue.buffer`. After `recover()`, the next `step()` runs them as part of a brand-new tick with no signal that they straddled a failure. Same is true for events: `eventBus.clear()` only runs at the start of each tick, so events from a failed tick remain in `getEvents()` until the next `step()` clears them.
- **Why it matters:** The audit trail looks like those commands were submitted in the new tick, hiding the recovery boundary. Recover-then-step gives a different observable ordering vs. recover-then-clear-then-step, with no API for the operator to choose.
- **Recommended fix:** Either (a) document explicitly that commands queued during a failed tick survive `recover()`; or (b) add `recover({ resetQueue?: boolean })` that drops still-queued commands with `tick_aborted_before_handler` audits and clears the eventBus buffer.

### M_NEW2. `setMeta()` accepts non-finite numbers, which corrupts the snapshot/index — 🟡
**Reviewer:** Codex.

- **Files:** `src/world.ts:840-850` (serialize-side metadata copy), `src/world.ts:1132-1156` (setMetaInternal).
- **What's wrong:** `setMeta` accepts any `number`, including `NaN` and `Infinity`. `serialize()` then writes those values into the snapshot metadata record without JSON validation (the `metadata` block is built without `assertJsonCompatible`). `JSON.stringify(NaN) === 'null'`, so the persisted form silently diverges from the in-memory reverse index used by `getByMeta()`.
- **Recommended fix:** Validate metadata values on write via `assertJsonCompatible` (which already rejects non-finite numbers, see `json.ts:15-19`), or at least reject non-finite numbers in `setMetaInternal`. Either fixes the serialize-side gap.

### M_NEW3. `findPath` pushes overcost neighbors onto heap and `bestG` — 🟡
**Reviewer:** Opus.

- **File:** `src/pathfinding.ts:127-143`.
- **What's wrong:** Iter-1 M3's fix correctly changed `current.g > maxCost` from a `return null` to a `continue`, supporting inadmissible heuristics. But the neighbor-expansion still does `bestG.set(...)`, `cameFrom.set(...)`, and `heapPush(...)` even when the candidate's `newG > maxCost`. Memory and CPU grow linearly with the number of neighbors per overcost path query.
- **Why it matters:** Not a correctness bug (overcost nodes are skipped on pop), but defeats the early-out's intent on tight `maxCost` budgets.
- **Recommended fix:** Add `if (newG > maxCost) continue;` before the `bestG.set` block at line ~137.

### M_NEW4. Resource-transfer FIFO causes silent starvation when supply is short — 🟡 / ❓
**Reviewer:** Gemini.

- **File:** `src/resource-store.ts:285-300` (`processTick`).
- **What's wrong:** Transfers pulling from the same source pool are processed in registration order. If demand exceeds supply, oldest transfers drain the pool; later ones get nothing.
- **Open question:** Is this intended FIFO priority semantics, or should there be a proportional-distribution pass? **Decision needed.**
- **Recommended fix:** If FIFO is intentional, document it in `docs/guides/resources.md` so AI-agent operators know they must order transfers explicitly. If not, add an optional proportional-allocation pass for over-subscribed sources.

### M_NEW5. `getLastTickFailure()` deep-clones on every call — 🟡
**Reviewer:** Opus.

- **Files:** `src/world.ts:980-982`, `src/world.ts:2228-2237`.
- **What's wrong:** `getLastTickFailure()` runs `JSON.parse(JSON.stringify(failure))` on every read. A history recorder or scenario harness polling between ticks pays the full clone cost per call, even though `lastTickFailure` is immutable from the engine's perspective once set.
- **Recommended fix:** Cache the clone in a private `_lastTickFailureCloned` field, invalidated on assignment/`recover()`. Or freeze the constructed `TickFailure` and return it directly — it's already JSON-safe by construction (line 1685-1706 enforces `assertJsonCompatible`).

---

## LOW / POLISH

### L_NEW1. `cloneTickFailure` and `cloneTickDiff` use `JSON.parse(JSON.stringify(...))` instead of `structuredClone` — 🟡
**Reviewer:** Opus.

- **File:** `src/world.ts:2228-2237`.
- **Fix:** Replace with `structuredClone(...)`. ~2-5× faster for JSON-shaped data on Node 18+, no JSON-string detour. Keep `assertJsonCompatible` on the *write* side so the result is still serializable. Both helpers run on hot listener paths.

### L_NEW2. Path cache double-clones on cache miss — 🟡
**Reviewer:** Gemini.

- **File:** `src/path-service.ts:133-144`.
- **Fix:** On cache miss, clone the resolved path once for the cache and pass the original to `completed`:
  ```ts
  if (key !== undefined) this.cache.set(key, version, this.clone(resolved));
  completed.push({ ..., result: resolved, fromCache: false });
  ```

### L_NEW3. `processCommands` tick parameter and `getObservableTick()` can disagree on `result.tick` for in-tick submissions — 🟡
**Reviewer:** Opus.

- **File:** `src/world.ts:1345-1346, 1595`.
- **Fix:** Either thread the in-flight tick to `createCommandSubmissionResult`, or document explicitly that `result.tick` is the tick at which the submission was *recorded* (before the new tick begins).

### L_NEW4. `addTagInternal`/`setMetaInternal` don't validate the entity is alive on snapshot load — 🟡
**Reviewer:** Opus.

- **Files:** `src/world.ts:925-950` (deserialize loops), `src/world.ts:1221-1262` (internals).
- **Fix:** Inside the deserialize loops, guard with `if (!world.entityManager.isAlive(entityId)) continue;` (or throw on inconsistent snapshot). Without it, dead-entity tags/meta create stale index entries that bleed into recycled IDs.

### L_NEW5. `recover()` doesn't reset `nextCommandResultSequence` — 🟡
**Reviewer:** Opus.

- **Files:** `src/world.ts:618-623, 255`.
- **Fix:** Either document the gap behavior in `docs/guides/commands-and-events.md`, or reset `nextCommandResultSequence` along with the rest of recover's cleanup. Sequences will then be contiguous again post-recovery.

### L_NEW6. `findNearest` early-out comment conflates Chebyshev and Euclidean — 🟡
**Reviewer:** Opus.

- **File:** `src/world.ts:535-538`.
- **Fix:** Re-word to clarify that `r` is the Chebyshev/cell-radius bound and `bestDistSq` is Euclidean. Best done as part of the R2 fix.

### L_NEW7. `registerComponent` and `deserialize` store caller-owned `ComponentStoreOptions` by reference — 🟡
**Reviewer:** Codex.

- **Files:** `src/world.ts:374-389, 893-907`.
- **Fix:** Clone `ComponentStoreOptions` (`{ ...opts }` is sufficient — flat object) before storing in `componentOptions`. Otherwise later caller mutation changes what future snapshots report without changing the constructed `ComponentStore`.

---

## OPEN QUESTIONS FOR USER

These are decisions I want your input on before turning any of the above into code:

1. **C1 default flag (R1).** Flip `detectInPlaceMutations` default to `false`? This is a behavior change for anyone relying on the auto-detect, but it aligns the strict-mode contract with the v0.4.0 promise.
2. **M10 owner-aware static blocks (R5).** Decide now or update docs to make "static blocks are entity-less terrain only" explicit? You deferred this in iter-1; it can stay deferred but the `ignoreEntity` API shape should match whichever direction you pick.
3. **Poison contract scope (H_NEW2).** Should `submit()` / `serialize()` refuse to operate on a poisoned world, or is it intentional that they remain available (e.g. for debug/repair workflows)?
4. **Typed-registry threading (H_NEW3).** Is the `TComponents`/`TState` typing intended to extend through to system/handler/listener callbacks, or only at the construction surface?
5. **Resource-transfer FIFO (M_NEW4).** Document FIFO as the official priority semantics, or implement a proportional pass for over-subscribed sources?

---

## PROPOSED FIX BATCHES

If approved, I'd implement these in order, each as its own branch + PR + test pass:

1. **Critical: snapshot isolation + findNearest correctness (C_NEW1 + R2).**
   - Deep-clone in `serialize()`/`deserialize()`; new regression tests for both boundaries.
   - Fix `findNearest` `maxRadius` to `Math.ceil(Math.hypot(W-1, H-1))`; add corner-to-corner regression test.
   - Touches: `world.ts`, `component-store.ts`, `tests/serializer.test.ts`, `tests/world.test.ts`.

2. **Critical regression: C1 default + M1 holes (R1 + R3).**
   - Flip `detectInPlaceMutations` default to `false`.
   - Wrap `world.grid` in a read-only delegate.
   - Reject non-JSON event payloads at `EventBus.emit` (or `World.emit`) and remove the silent `getEvents` fallback.
   - Touches: `component-store.ts`, `world.ts`, `event-bus.ts`, plus tests for each.

3. **High: poison contract integrity (H_NEW1 + H_NEW2).**
   - Wrap listener iteration in `emitCommandExecutionResult` and `emitTickFailure` with try/catch matching the diff-listener pattern; route listener errors through `finalizeTickFailure`.
   - Add `assertNotPoisoned()` guard to `submit`/`submitWithResult`/`serialize` (after deciding question 3).
   - Touches: `world.ts`, plus regression tests for listener-throws and submit-while-poisoned.

4. **High: typed registries through callbacks (H_NEW3).**
   - Type-only refactor; thread `TComponents`/`TState` through `System`, registration entry points, and `deserialize`.
   - Touches: `world.ts`, exported types, possibly `client-adapter.ts`.

5. **Medium + perf: pathfinding overcost, recover semantics, perf nits (M_NEW1, M_NEW2, M_NEW3, M_NEW5, R4, L_NEW1, L_NEW7).**
   - `setMeta` finite-number validation; `findPath` overcost neighbor cull; `recover()` queue/event handling; `getLastTickFailure` cached clone; `EntityManager.fromState` validation; `structuredClone` swap; clone `ComponentStoreOptions`.
   - Mostly local, low-risk.

6. **Polish (L_NEW2, L_NEW3, L_NEW4, L_NEW5, L_NEW6).**
   - Path cache double-clone; processCommands tick clarity; tags/meta liveness check on deserialize; `recover()` sequence reset doc; `findNearest` comment.

---

## RAW REVIEWS

- `raw/codex.md` — Codex full output (gpt-5.4, xhigh)
- `raw/gemini.md` — Gemini full output (3.1-pro-preview)
- `raw/opus.md` — Opus 4.7 (1M) full output
- `PROMPT.md` — the shared review prompt
- `raw/codex.stdout.log`, `raw/gemini.stderr.log` — run logs (large; not part of the deliverable)

**Awaiting user review before any code change.**
