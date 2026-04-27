Plan reviewed. Verifying engine facts confirmed: World 4-generic at line 233 ✓, `connect()` non-throwing on `sink.open()` failure at lines 134-145 ✓, `seedToUint32` collapses [0,1)→0 at line 50 ✓, RecordedCommand.sequence at session-bundle.ts:43 ✓, CommandExecutionResult.submissionSequence at world.ts:149 ✓, selfCheck skip at line 286 ✓, `world.tick` advances on poison via `gameLoop.advance()` at line 1888 ✓. SessionRecorder is 3-generic with `_world: World<TEventMap, TCommandMap>` — confirming the 4→2 cast in T2 step 5 is necessary.

# Plan Review — Synthetic Playtest Implementation v1

## Verdict: **REJECT** — required changes below before implementation-ready.

The plan is structurally sound (TDD ordering, doc-with-code, three-task split with correct version bumps) and engine facts are accurate. However several concrete-execution gaps and missing tests vs. design v10 §12 acceptance criteria mean an engineer following this plan would either (a) hit avoidable engine-gate failures, or (b) have to design test bodies themselves.

---

## [BLOCKER] — must fix

**B1. Run-to-fail uses the wrong gate for type-narrowing tests.**
T2 Step 1 says: *"Run: `npm test -- session-bundle` — expect FAIL (TS narrowing rejects 'synthetic')."* But Vitest 3 transpiles via esbuild and does not enforce strict type-narrowing; the test will likely **PASS** at runtime (sourceKind === 'synthetic' is just a string comparison). The proper run-to-fail gate is `npm run typecheck`. The same issue applies to any other type-only assertions in T2 Step 1. Fix: change the gate command to `npm run typecheck` for narrowing-only tests, or restructure as a TS expectation file (e.g., `// @ts-expect-error` removal). This breaks the TDD discipline as currently written.

**B2. `/* ... */` placeholders in test bodies violate AGENTS.md writing-plans concreteness rule.**
T2 Step 3 has placeholders for `stopWhen`, `poisoned`, `policyError`, connect-time-sink-failure, mid-tick-sink-failure, pre-step-abort, composition-external-ordering, and same-seed-determinism. T2 Step 4 ships nearly all stop-reason / failure-mode tests as placeholders. T3 Steps 2, 3, 4, 5, 6 are described in prose without code. AGENTS.md writing-plans skill: *"every step must be concrete (file paths, code blocks, exact commands, exact expected output)."* Either expand each placeholder with the actual `it(...)` body (preferred) or move the under-specified tests into T1/T3's already-concrete steps. As written, the engineer reinventing test bodies is the plan's biggest concreteness failure.

**B3. T1 Step 3 imports `JsonValue` that is unused in T1.**
```ts
import type { JsonValue } from './json.js';
```
Nothing in T1's `synthetic-playtest.ts` (PolicyContext / StopContext / PolicyCommand / Policy / noopPolicy / scriptedPolicy / randomPolicy) references `JsonValue`. ESLint `@typescript-eslint/no-unused-vars` will flag this and `npm run lint` (Step 12) will fail. Remove the import in T1; T2 Step 5 adds it back when `runSynthPlaytest`'s `TDebug = JsonValue` default needs it.

**B4. Missing required tests vs. design v10 §12 acceptance:**
- **Poisoned-world-at-start propagates `RecorderClosedError`** — listed in design §12 *"Failure modes"* and §7.2; not present in T2 Step 3-4.
- **`sourceLabel` defaults to `'synthetic'`; override works** — design §12 *"Bundle metadata"*; T2 Step 3 first test asserts sourceKind + policySeed only.
- **`metadata.failedTicks` populated when poisoning occurs** — design §12 *"Bundle metadata"*; T2 Step 4 outlines the `'poisoned'` stop reason but doesn't assert failedTicks.
- **Composed-policy partial-submit-then-throw** — design §7.2 explicitly tested in §12; not in T2 Step 4.

These are non-trivial gaps; design v10 §18 lists them in acceptance criteria.

**B5. T2 Step 5 declares `startTick` but never uses it.**
```ts
const startTick = world.tick;   // unused
```
ESLint will fail. Either remove or use it (e.g., for a sanity-check assertion comparing `bundle.metadata.startTick === startTick` post-disconnect).

---

## [HIGH] — significant gaps

**H1. Doc-update steps under-specified.**
T1 Step 13 says *"add sections for `Policy`, `PolicyContext`, ..."* with only *"shape + brief usage"* as guidance. Same shape in T2 Step 7. AGENTS.md writing-plans requires concrete content. Suggested fix: each section should list (signature line(s) verbatim from design + 1-2 sentence summary + a link). Or paste the exact ADR text from design v10 §15 (which is what the plan already does for ADRs implicitly).

**H2. T2 Step 7 omits `docs/README.md` index update for the new guide.**
AGENTS.md doc-discipline requires *"docs/README.md — index links the new guide if one is added."* T2 introduces `docs/guides/synthetic-playtest.md`; the doc-checklist must include `docs/README.md`.

**H3. T2 Step 7 omits README.md Feature Overview row + Public Surface bullets.**
Plan only says "bump version badge". AGENTS.md: *"README.md — Feature Overview table mentions the new capability if it's a user-visible feature; Public Surface bullets list the new top-level export if applicable."* `runSynthPlaytest` is a top-level user-visible feature.

**H4. No grep-verify step for locally redefined `'session' | 'scenario'` literal unions.**
T2's b-bump rationale rests on the claim that nothing engine-internal branches exhaustively on `sourceKind`. The plan asserts this without a verification step. Add: *"Run `grep -r \"'session' | 'scenario'\" src/ tests/` and confirm only session-bundle.ts hosts the union; any local copies must be widened too. Then `npm run typecheck`."*

**H5. T2 Step 2 missing existing-default test.**
The new test verifies `sourceKind: 'synthetic'` + `policySeed: 42` flows through. But there's no test confirming that omitting these still produces `sourceKind: 'session'` and undefined `policySeed`. Existing tests probably cover this implicitly, but an explicit guard test would protect against future regression in the constructor's defaulting.

**H6. T2 Step 5's `ok` computation ignores disconnect-time sink failures.**
```ts
try { recorder.disconnect(); } catch { /* best-effort */ }
const ok = stopReason !== 'sinkError';
```
If the terminal-snapshot write fails inside `disconnect()`, `recorder.lastError` is set but the harness returns `ok: true`. Design v10 §7 didn't address this corner. Either: (a) extend the design and update `ok` to `stopReason !== 'sinkError' && recorder.lastError === null`, or (b) explicitly note in plan Risks that disconnect-time sink failures are silent.

**H7-H8. Already covered under B4.**

**H9. `randomPolicy` test missing the `ctx`-using catalog entry case.**
Plan T1 Step 8 catalog uses `() => command`. The signature is `(ctx) => command`. Add at least one test where a catalog entry reads `ctx.world.tick` to verify the harness threads the live world to catalog generators (per design v10 §6.2 *"catalog is functions, not data, so commands can reference live world state"*).

**H10. `randomPolicy` doesn't validate `offset`.**
T1 Step 9 validates `frequency` and `burst` but not `offset`. A negative offset (`-1`) makes the modulo check `tick % frequency !== -1` always true (no emit ever); NaN poisons the comparison. Design v10 §6.2 leaves offset semantics implicit; the plan should validate offset is a non-negative integer < frequency, or document why no validation.

**H11. No `policySeed` validation in `runSynthPlaytest`.**
If the caller passes `policySeed: NaN` or `policySeed: 1.5`, `DeterministicRandom`'s constructor throws `RangeError` only for non-finite (NaN), and silently truncates non-integers via `Math.trunc`. The harness should validate explicitly (matching the `maxTicks` validation pattern at the start of step 5).

---

## [MED]

**M1. T1 Step 13 hardcodes devlog filename `2026-04-26_2026-04-27.md`.**
Per AGENTS.md devlog convention, the active file's `END_DATE` may have rolled forward since the plan was written. Plan should say *"append to the latest file in `docs/devlog/detailed/` (verify with `ls`)"*.

**M2. T2 doesn't verify MemorySink/FileSink handle new `policySeed` field transparently.**
Both sinks should treat metadata as opaque blob, but the plan should include a quick verify-read on FileSink to confirm `manifest.json` round-trips the new field.

**M3. T1 docs forward-reference `runSynthPlaytest` ("ships in v0.8.0 (T2)").**
v0.7.20 readers see Policy types with no harness, plus a forward-link to a not-yet-existing version. Better: in T1, just describe the types as policy primitives; defer mention of `runSynthPlaytest` to T2's doc landing.

**M4. T3 Step 5 ambiguous about composition.**
*"Policy throws on tick 1 → ticksRun === 0 → bundle has terminal == initial → selfCheck() returns ok: true vacuously"* — this holds for a single-throwing-policy case, but for composed `[goodPolicy, throwingPolicy]`, bundle.commands has goodPolicy's submissions while bundle.executions is empty (per §7.2). selfCheck's behavior over `commands.length > 0 && endTick == startTick` should be re-derived. Specify the test as "single throwing policy" and add a separate composed-partial-submit test.

---

## [LOW] / [NIT]

**L1.** T1/T2 split ships unused public surface in T1 (Policy types with no harness consumer). Plan acknowledges and accepts the trade-off; AGENTS.md *"make the change easy, then make the easy change"* could argue for combined T1+T2 b-bump. Acceptable as designed.

**L2.** T3 Step 5 says *"vacuously over zero segments"* — actually one zero-length segment (`allSnapshots.length === 2` with both at tick 0 means the for-loop runs once with i=0, segment (0,0) → no divergences). Wording.

**L3.** T2 Step 5 passes `terminalSnapshot: true` explicitly though it's the SessionRecorder default. Harmless redundancy; the explicit form documents intent.

**L4.** Plan §"Risks" mentions the `World` generic-erasure cast for SessionRecorder. The other erasure — `recorder.toBundle()` returning `SessionBundle` (no generics) cast to `SessionBundle<TEventMap, TCommandMap, TDebug>` — is also worth listing for completeness.

---

## Engine-fact accuracy: ✓ all citations verified
- World 4-generic at world.ts:233 ✓
- SessionRecorder.connect() doesn't throw on `sink.open()` failure (lines 134-145, error stored in `_lastError`, `_connected = true`, returns) ✓
- DeterministicRandom.seedToUint32 collapses `[0,1)` → 0 (line 50: `Math.trunc(seed) >>> 0`) ✓
- RecordedCommand.sequence at session-bundle.ts:43 ✓
- CommandExecutionResult.submissionSequence at world.ts:149 ✓
- SessionReplayer.selfCheck skip at line 286 (`failedTicks.some(ft => ft >= a.tick && ft < b.tick)`) — plan's brief drops the `>= a.tick` clause but the analysis (poisoned bundle's terminal segment NOT skipped because `failedTick === segmentEnd`, not `<`) is correct ✓
- world.tick advances on poison via `gameLoop.advance()` at world.ts:1888 (inside finalizeTickFailure, when phase !== 'listeners'; for listener-phase failures, advance already ran in the success path) ✓
- SessionRecorder is 3-generic with `_world: World<TEventMap, TCommandMap>` — confirms the 4→2 cast in T2 step 5 is necessary and structurally safe (recorder doesn't invoke any TComponents/TState-dependent World method) ✓

## Versioning: ✓ correct
T1 c-bump (additive policy types), T2 b-bump (sourceKind union widening per ADR 3 + AGENTS.md *"whenever you introduce a breaking change, bump b and reset c"* — pre-1.0 explicitly included), T3 c-bump (additive tests + structural docs). Resets follow AGENTS.md.

## Risk capture: mostly complete
The §"Risks" section catches the four main concerns (generic erasure cast, scripted-policy off-by-one, recorder connect non-throwing, world.tick advance on poison). Missing from Risks (worth adding): the disconnect-time sink-failure silent path (H6); the `recorder.toBundle()` generic erasure (L4); the policySeed-NaN footgun (H11).

---

## Summary of required changes before ACCEPT

1. **Fix B1** — change run-to-fail gate to `npm run typecheck` for type-only tests in T2 Step 1.
2. **Fix B2** — replace `/* ... */` test placeholders with concrete `it(...)` bodies (or be explicit that those iterations are written interactively per the underlying spec text in design v10 §12).
3. **Fix B3** — drop the unused `JsonValue` import in T1 Step 3.
4. **Fix B4** — add the four missing tests (poisoned-world-at-start, sourceLabel default+override, failedTicks-on-poison, composed-partial-submit).
5. **Fix B5** — remove or use the `startTick` declaration in T2 Step 5.
6. **Fix H1-H4** — concretize doc-surface steps, add docs/README.md + README.md Feature Overview/Public Surface to T2's checklist, add the grep-verify step for locally-redefined sourceKind unions.
7. **Address H6** — decide and document the disconnect-time sink failure semantics for `ok`.
8. **Add H10/H11** — offset and policySeed input validation.

The plan should be reissued as v2 with the above fixes before an engineer is dispatched. Once those changes land, this is a strong, well-structured plan.
