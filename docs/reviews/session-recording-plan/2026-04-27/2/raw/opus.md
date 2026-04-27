I have enough context. Producing the iter-2 review now.

---

# Iter-2 Plan Review — Session Recording Implementation Plan

**Date:** 2026-04-27. **Reviewer:** Opus (claude opus xhigh, single-CLI iter-2 pass).

## Closure of iter-1 findings

| # | Finding | Verdict | Evidence |
|---|---------|---------|----------|
| CR1 | T2 MemorySink contract drift | **Closed** | All toBundle() tests now write ≥1 snapshot first; `slice(1)` semantic explicit (plan:735, 800-806) |
| CR2 | T4 missing `ScenarioConfig`/`runScenario` plumbing | **Closed** | T4 modifies `src/scenario-runner.ts`; threading test added (plan:1247, 1372-1389) |
| CR3 | `clear()` doesn't reset `recordedCommands` | **Closed** | Step 4.2 commits to clear() extension; explicit regression test (plan:1354-1370) |
| H1 | FileSink default attachment policy reversed | **Partial** | Test names acknowledge sidecar default, but Step 3.2 impl text still reads "if oversized OR sidecar-refed → sidecar; else dataUrl" (threshold-based) and tests only verify "respects descriptor.ref", not the default policy itself. See remaining issue #1 |
| H2 | `new World()` without WorldConfig | **Closed** | `mkWorld()` helper in `tests/test-utils.ts` (plan:1252-1262) |
| H3 | Missing `ReplayHandlerMissingError` / `no_replay_payloads` | **Closed** | Both paths in T6 sketch + tests (plan:1731-1737, 1712-1715, 1805-1806) |
| H4 | selfCheck on `failedTicks` undefined | **Closed** | `failedTicks`-skipping branch + `skippedSegments` field (plan:1773-1777) |
| H5 | Placeholder worldFactory | **Closed** | All 4 scenario refactors named: setupMove/Spawn/Query/Crash (plan:1921-1925) |
| H6 | Per-task multi-CLI review missing | **Closed** | Top-of-plan "Per-task review pattern" block (plan:19-67) |
| H7 | Per-task doc updates missing | **Closed** | Per-task doc list T1–T8 (plan:24-35) |
| H8 | `cloneJsonValue` duplication | **Closed** | T0 Step 0.1 extracts to `src/json.ts` (plan:82-103) |
| H9 | T5/T6 too thin | **Closed** | Constructor/connect/_onDiff/addMarker sketches in T5; openAt/selfCheck/deepEqualWithPath in T6 |
| H10 | `engineVersion` source unspecified | **Partial** | T0 creates `src/version.ts` with `ENGINE_VERSION`; T5 uses it. **T7 still says "read via `process.env.npm_package_version`"** (plan:1837). See remaining issue #2 |
| M1 | MIME-to-extension mapping | **Closed** | Table-driven test in T3 (plan:1182-1199) |
| M2 | `__payloadCapturingRecorder` declaration merge | **Closed** | T0 Step 0.3 (plan:120-141) |
| M3 | submitWithResult wrap typing | **Partial** | Sketch uses `as typeof world.submitWithResult` cast; generic-method preservation glossed over. Acceptable but flag for impl |
| M4 | `.toString()` brittle disconnect check | **Closed** | Behavioral check via post-disconnect submission (plan:1325-1338) |
| M5 | Clauses 7+9 hard to engineer | **Closed** | `vi.stubEnv` for clause 7; `it.todo` for cross-Node-major (plan:1952, 1963) |
| M6 | `deepEqualWithPath` not sketched | **Closed** | Full ~80 LOC sketch with array/object branches (plan:1656-1693) |
| M7 | TDD red-step thins after T2 | **Partial** | T1/T2 have explicit "expected: error message"; T3–T8 still abbreviate. Minor process gap |
| M8 | Clause 9 mis-specified as divergence | **Closed** | Split into `BundleVersionError` throw vs `it.todo` (plan:1955-1964) |
| L1 | UUID generation | **Closed** | `randomUUID()` from `node:crypto` (plan:1444, 1563) |
| L2 | Entity-liveness API | **Partial** | Current `world.isAlive(id)` takes only `id`. Plan T5 says "uses `world.isAlive(id, generation)` — add to World API in T0/T5 if not present" but T0 doesn't add it, and `world.hasHandler(type)` (used in T6:1732) likewise deferred. See remaining issue #3 |
| L3 | `MarkerValidationError.referencesValidationRule` placement | **Open** | Spec §11.3 says top-level field; v2 `src/session-errors.ts` only takes `(message, details?)`. Field still lives implicitly inside details. See remaining issue #4 |
| L4 | `Sink.writeAttachment` return type | **Closed** | Returns `AttachmentDescriptor` in v2 interface (plan:890) |
| L5 | `NewMarker` not declared | **Closed** | Type alias in T5 (plan:1436) |
| L6 | `ref: { dataUrl: '' }` placeholder cosmetic | **Partial** | Pattern preserved; cosmetic-only |
| N1 | Self-review missed CR/H findings | **Closed** | v2 self-review section ran |
| N2-N5 | Various | **Closed** | All carried through |

**Summary:** 22 closed, 6 partial/open. All three Critical findings are fully closed. Three High findings are fully closed; two are partial. Plan is structurally sound and ready for execution after addressing the residue below.

## Remaining issues

**R1 (high). T5 SessionRecorder periodic-snapshot guard is a no-op.** plan:1530:

```ts
if (interval !== null && world.tick % interval === 0 && world.tick !== this._config.world.tick /*initial*/) {
```

`world` is `this._config.world` (plan:1520). `world.tick !== this._config.world.tick` is `x !== x`, always false → periodic snapshots never fire. The test "Periodic snapshots at snapshotInterval" (plan:1597) would fail. **Fix:** cache `this._startTick = world.tick` in `connect()`; use `world.tick !== this._startTick` in the guard.

**R2 (high). T7 ignores T0's `ENGINE_VERSION` constant.** plan:1837 still reads `metadata.engineVersion` "via `process.env.npm_package_version`". H10 fix added `src/version.ts` for exactly this purpose, and T5 uses it (plan:1476). T7 should import `ENGINE_VERSION` from `src/version.ts` for `scenarioResultToBundle()` consistency. Otherwise scenario bundles produce stale/empty `engineVersion` outside `npm run`, while session bundles produce the right value — diverging metadata across producers contradicts ADR 2 (single canonical bundle shape).

**R3 (high). World API additions (`isAlive(id, generation)`, `hasHandler(type)`) not committed.** Current `World.isAlive(id: EntityId)` (`src/world.ts:366`) takes only id; spec §6.1 marker validation requires id+generation matching. `World.hasHandler(type)` doesn't appear in `src/world.ts` (only `registerHandler` at :804); T6 openAt sketch (plan:1732) calls it. Plan defers both ambiguously: "add to World API in T0/T5 if not present" (plan:1583) and "may need to be added to World if not present; check src/world.ts and add if needed as a setup step in T0" (plan:1746). T0 should commit to extending these (or T5/T6 should own them as part of their scope) — otherwise T5 marker validation and T6 openAt won't compile.

**R4 (medium). H1 FileSink default-policy locus unclear.** Step 3.2 description: "if `data.byteLength > threshold` OR descriptor is sidecar-refed, write to attachments/<id>.<ext>; else dataUrl in manifest" preserves the threshold-based inverse logic from iter-1. The H1 fix said "FileSink defaults to sidecar **unconditionally**" — the sink should treat `ref:sidecar` as the default when caller doesn't explicitly pass `ref:dataUrl`. The recorder.attach() layer is also unsketched in T5, so it's unclear where the FileSink-vs-MemorySink default choice is made. Pick one: (a) FileSink rewrites descriptor.ref to sidecar by default (threshold = 0, or branch on descriptor shape), or (b) recorder.attach() consults sink type and constructs descriptor with sidecar-ref default for FileSink. Document the chosen locus.

**R5 (low). MarkerValidationError.referencesValidationRule top-level field.** Spec §11.3: "MarkerValidationError includes a `referencesValidationRule?: string` field… for cross-referencing back to the §6.1 marker-validation rule that fired." v2 plan's MarkerValidationError still extends SessionRecordingError without adding a top-level field; references would live inside `details`. Either align spec to "details.referencesValidationRule" or extend the error class. Consistency, not blocker.

**R6 (low). recorder.attach() not sketched in T5.** T5 lists `attach(blob, options)` as a method but the skeleton (plan:1447-1581) doesn't show it. This is the locus where R4's policy decision lives; sketching it would resolve R4 cleanly. Same for `disconnect()` — only `_terminate()` is shown; the public `disconnect()` flow (terminal snapshot, slot cleanup, sink.close) needs a sketch.

## Overall assessment

v2 closes all three Critical findings and 7 of 10 High findings cleanly; the plan is now structurally executable. R1 (the periodic-snapshot guard bug) is the only remaining defect that will produce an obviously failing test on first run; R2/R3 are coherence/feasibility gaps that will surface during T5/T6/T7 implementation. After fixing R1–R3 (one-line each in the plan text), the plan is ready for T1 to begin.
