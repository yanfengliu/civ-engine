# Full Codebase Review — 2026-04-26, iteration 7

Two reviewers ran in parallel against `agent/full-review-iter7` at HEAD `c2f8db3` (v0.7.4). Codex + Opus completed; Gemini still quota-exhausted (5th iteration in a row, 17h48m reset).

| Reviewer | Output |
|---|---|
| Codex | Codex summary — 1 High, 2 Medium, 1 Low |
| Gemini | UNREACHABLE — `429 QUOTA_EXHAUSTED` |
| Opus | Opus summary — 1 Medium (doc), 2 Low |

Gates baseline: 608 tests pass, typecheck clean, lint clean.

---

## Executive summary

Iter-1–6 closed the `CommandTransaction` atomicity chain. **Iter-7 is the first broader sweep** — Codex and Opus split the engine surface and reviewed subsystems iters 1–6 didn't focus on (entity-manager, component-store, spatial-grid, event-bus, queue, resource-store, pathfinding, BT, noise, cellular, serializer, client-adapter, render-adapter, occupancy-grid, visibility-map, path-service, history-recorder, scenario-runner, world-debugger, map-gen, world-internal).

Both reviewers agree: no Critical, no regressions from v0.7.4 followups. **Codex caught what Opus missed**: one High invariant hole at the snapshot boundary (`World.deserialize` accepts component/resource records for dead or non-integer entity IDs) plus two Medium hardening gaps (EventBus listener-mutates-payload, ClientAdapter post-disconnect mapping race). Opus caught one Medium doc drift (snapshot v4 → v5 in api-reference) plus two Low polish items (component-store revert-to-baseline diff bloat, deserialize-validate-tick hoist). One Low from Codex on `octaveNoise2D` parameter validation.

Seven real findings, all addressable. Not nitpick territory. Iter-7 has substantive work; iter-8 is the convergence check after fixes.

---

## CRITICAL

None observed.

---

## HIGH

### H1. `World.deserialize` accepts component/resource records for dead or non-integer entity IDs — ✅ Codex
- **Files:** `src/world.ts:945` (`deserialize`), `src/world.ts:2001`/`:2099` (signatures + spatial-index rebuild after loaders), `src/component-store.ts:21,112` (`set`/`fromEntries`), `src/resource-store.ts:297` (`fromState`).
- **What's wrong:** Snapshot loaders are called with `snapshot.components` and `snapshot.resources` without entity-id validation.
  - **(a) Liveness violation:** Dead entity IDs (where `entityManager.isAlive(id) === false` after `EntityManager.fromState`) get re-populated into stores. The component-signature rebuild and `rebuildSpatialIndex` then run over those rows — a dead `position` entry becomes queryable through `world.grid` / `queryInRadius`.
  - **(b) Non-integer / negative IDs:** Negative or fractional component IDs hit `ComponentStore.set` → `arr[id] = …` writes them as JS array properties (so `arr.length` doesn't grow), but `size` does increment — store iteration via `entries()` skips them, query planning skips them, but `size` and serialized output disagree forever after.
- **Why it matters:** `World.serialize` is the import boundary for snapshots. If the engine accepts adversarial or corrupted snapshots without validation, downstream queries silently disagree with `isAlive` / `size` / iteration order. The v0.6.2 work already validated `snapshot.tick` at this boundary — the same discipline needs to apply to entity-keyed records.
- **Fix:** In `deserialize`, after `EntityManager.fromState` resolves the alive set, validate every key in `snapshot.components[componentName]` and `snapshot.resources` is (i) a non-negative finite integer, (ii) present in the alive set. Throw on violation (matches the v0.6.2 tick-validation precedent and the broader fail-fast contract).

---

## MEDIUM

### M1. EventBus listeners can mutate engine-owned event payloads after emit-time validation — ✅ Codex
- **Files:** `src/event-bus.ts:20` (push original ref into buffer), `:24` (pass same ref to listeners), `:51` (clone on read in `getEvents`).
- **What's wrong:** `emit()` validates JSON-compat then pushes the **original** `data` reference into the per-tick buffer and passes the **same** reference to every listener. A listener that mutates the payload (e.g. `data.x = 999`) rewrites buffered history visible to later listeners and to `world.getEvents()`. A listener that makes the payload circular or non-JSON makes later `getEvents()` calls throw. With `ClientAdapter` connected, this poisons the client-adapter diff-listener path because it pulls `world.getEvents()` at tick end.
- **Why it matters:** Same atomicity contract as the C1 chain — engine-owned state should not be mutable through a public callback's argument. Closes a parallel-class bug to C1's "predicate sees live ref."
- **Fix:** Clone `data` once on emit before push + dispatch. Pass the same clone to buffer + every listener — fast, and listeners observe what the buffer keeps. `getEvents()` then no longer needs to clone on read.

### M2. `ClientAdapter.handleMessage` reseats command-ID mapping after `safeSend` already disconnected — ✅ Codex
- **Files:** `src/client-adapter.ts:253-264` (set after send), `:277` (disconnect + map clear inside `safeSend`).
- **What's wrong:** `safeSend()` returns `false` on transport failure, disconnects the client, and clears the per-client mapping. `handleMessage` ignores the return value and unconditionally calls `this.clientCommandIds.set(result.sequence, id)` after the failed send. If the same client reconnects before the queued command fires, the new session receives `commandExecuted` / `commandFailed` for a command whose acceptance was never delivered. If it never reconnects, the stale entry leaks for the lifetime of the adapter.
- **Why it matters:** Protocol drift on reconnection is hard to debug client-side (client sees a result for a sequence number it doesn't remember). Memory leak is bounded but real.
- **Fix:** Check `safeSend`'s return value at line 253 and skip the `set` (and the queueing) when it's `false`.

### M3. `docs/api-reference.md` says `(snapshot v4)` but current schema is v5 — ✅ Opus
- **Files:** `docs/api-reference.md:2026,2081` (stale labels), `src/serializer.ts:62-78` (current `SCHEMA_VERSION` = 5), `src/world.ts:907` (deserialize accepts versions 1–5).
- **What's wrong:** Two `(snapshot v4)` parenthetical labels in the canonical api-reference. Internally inconsistent with the same doc's snapshot-version table and with runtime.
- **Why it matters:** AGENTS.md doc-discipline rule. The canonical API reference is the source of truth a future feature builds on.
- **Fix:** Replace both with `(snapshot v5)` or `(snapshot v4+)` if the surrounding context means "introduced in v4."

---

## LOW

### L1. `octaveNoise2D` doesn't validate `octaves` / `persistence`; returns NaN / ∞ for adversarial inputs while docs claim `[-1, 1]` — ✅ Codex
- **Files:** `src/noise.ts:94`, `:114`, `docs/api-reference.md:3687,3700` (claims `[-1, 1]` contract).
- **What's wrong:** `octaves <= 0` leaves `maxAmplitude = 0` → divide-by-zero → NaN. `persistence = -1` produces alternating amplitudes that may also leave `maxAmplitude = 0` or cause unbounded growth. Public docs claim `[-1, 1]` without parameter constraints.
- **Why it matters:** Standalone-utility correctness. The fail mode silently corrupts downstream map-gen.
- **Fix:** Validate `octaves >= 1`, `persistence >= 0`, `lacunarity > 0`. Throwing matches v0.6.2 / L_NEW3 fail-fast precedents.

### L2. `ComponentStore` semantic-mode `set` does not clear `dirtySet` on revert-to-baseline — ✅ Opus
- **File:** `src/component-store.ts:27-37`.
- **What's wrong:** In `diffMode: 'semantic'` with `wasPresent`, when the new fingerprint matches the baseline the method returns early without `dirtySet.delete(entityId)`. Sequence inside one tick: `set(A)` → `clearDirty()` (baseline := A) → `set(B)` (dirty add) → `set(A)` (matches baseline, early return, **dirty not cleared**). `getDirty()` then emits a redundant entry where the value already matches baseline.
- **Why it matters:** Semantic mode contract says "skip dirty-marking for identical rewrites." The set-revert-within-tick case violates that and bloats the diff with no-op entries. End state correct; bandwidth waste only. Test gap at `tests/component-store.test.ts:175` only covers `set(A) → clearDirty → set(A)` (no intermediate write).
- **Fix:** Add `this.dirtySet.delete(entityId)` and `this.removedSet.delete(entityId)` before the early return at line 33. Add the regression test.

### L3. `World.deserialize` runs `rebuildSpatialIndex` before `snapshot.tick` validation — ✅ Opus
- **File:** `src/world.ts:1011-1022`.
- **What's wrong:** Tick validation throws after `rebuildSpatialIndex()` already ran. Wasted O(positionEntities) work on bad input. Local `world` instance unreachable after throw, so no external bug.
- **Why it matters:** Cheap cleanup; matches v0.6.2's "validate at boundary" intent.
- **Fix:** Hoist the tick validation block above `rebuildSpatialIndex`.

---

## POLISH / NITPICKS

None real. (Opus's P1 — files > 500 LOC — is deferred per drift-log v0.6.4. Per AGENTS.md "do not re-flag deferred items.")

---

## NOTES & OPEN QUESTIONS

### N1. Convergence on most subsystems
Both reviewers verified clean: entity-manager (recycle/generation/free-list), spatial-grid (bounds + ceil-radius + the new `Object.freeze` boundary), event-bus interior (JSON-clone-on-read works; M1 closes the input boundary), command-queue, resource-store (arithmetic + dead-transfer cleanup), pathfinding (heap + maxCost), behavior-tree (preempt cleanup), cellular (deterministic), render-adapter (knownRefs lifecycle), occupancy-grid + visibility-map + path-service + history-recorder + scenario-runner + world-debugger, world-internal (genuinely standalone — only `import type` from world.js), serializer protocol shape, client-adapter listener cleanup.

### N2. v0.7.4 followups verified
`as any` cast removal in `command-transaction.ts:299-302` sound (`assertJsonCompatible` at buffer time guarantees runtime safety). `SYSTEM_PHASES` / `SystemPhase` re-export from `world.ts` keeps public path stable.

### N3. Gemini quota
Fifth iter in a row Gemini was unreachable (quota: 17h48m reset). Two converging reviews remain useful signal — the iter-1–7 history shows that two-perspective review across Codex+Opus consistently catches what a single reviewer misses (Codex caught H1 + M1 + M2 here that Opus missed; Opus caught M3 + L2 + L3 that Codex missed).

### N4. Stopping criteria for the loop
H1 + M1 + M2 are real engine-side hardening. M3 is real doc drift. L1–L3 are real but minor. **Iter-7 has substantive work — loop continues.** Iter-8 (after fixes) is the convergence check.

---

End of REVIEW.md.
