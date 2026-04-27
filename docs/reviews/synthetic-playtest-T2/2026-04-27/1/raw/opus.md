I have all the verification I need. Writing the review.

---

## Code Review — T2 Synthetic Playtest Harness (v0.8.0)

The implementation is correct and the design decisions are sound. The b-bump axis (`SessionMetadata.sourceKind` widening) is cleanly absorbed, the lifecycle steps in `runSynthPlaytest` match design v10 §7.1 exactly, the `'snapshotInterval' in config && !== undefined` pattern correctly preserves explicit `null`, the sub-RNG seed-derivation expression matches ADR 19 verbatim, and `recorder.lastError` checks are placed at the spec-correct points (after connect, after step, after disconnect). Composition tests, production-determinism, and the `+1` bundle→script offset are all well-covered.

However, plan v7 step 9 prescribed three failure-mode tests; only one made it into `tests/synthetic-playtest.test.ts`. The missing tests cover code paths that no other test exercises:

### [HIGH] Missing test: `connect-time sink failure throws (no bundle returned)`

Plan v7 lines 1081-1112 specify a verbatim test with a custom `failingSink` whose `open()` throws. This exercises `runSynthPlaytest`'s re-throw path at `synthetic-playtest.ts:197-204` (lastError after `recorder.connect()` due to `_handleSinkError` from a sink-open failure). The existing `poisoned-world-at-start` test does NOT cover this path — it triggers the `if (this._world.isPoisoned()) throw RecorderClosedError` pre-check at `session-recorder.ts:122-125`, which short-circuits before `_sink.open()` is ever called. These are distinct branches in `connect()` and the sink-open path is currently untested.

### [HIGH] Missing test: `mid-tick sink failure: ok=false, stopReason="sinkError"`

Plan v7 lines 1114-1141 specify a verbatim test with a `Proxy(MemorySink)` whose `writeSnapshot` throws on the second call. This is the only test that would cover:
- `stopReason === 'sinkError'` (the 5th of 5 stopReasons; 4/5 are tested)
- `ok === false` from a non-thrown failure
- The `if (recorder.lastError !== null) { stopReason = 'sinkError'; break; }` branch at `synthetic-playtest.ts:239-242`

Plan note 1758 (disconnect-time sink failure) explicitly says coverage of the disconnect-time-flip-to-`ok=false` corner is "implicit (covered by mid-tick sink failure test)". Without the mid-tick test, the entire `ok = stopReason !== 'sinkError' && recorder.lastError === null` line at `synthetic-playtest.ts:256` has zero coverage.

### [LOW] Doc/impl mismatch on `ok` for disconnect-time sink failures

`docs/api-reference.md` ("`ok` is `true` for `'maxTicks' | 'stopWhen' | 'poisoned' | 'policyError'`") and `docs/changelog.md` (failure-mode table) both state `ok=true` unconditionally for non-sinkError stopReasons. The implementation tightens with `&& recorder.lastError === null`, so a disconnect-time terminal-snapshot write failure flips `ok=false` while leaving `stopReason='maxTicks'`. The plan acknowledges this as intentional (line 1758: "right behavior for a CI guard"); the user-facing docs should match.

### [LOW] Sample code in `docs/guides/synthetic-playtest.md` doesn't typecheck

The quickstart declares `interface Cmds { spawn: { x: number; y: number } }` (line 15). Two later examples are typed `Policy<Record<string, never>, Cmds>` but emit commands incompatible with that type:
- Line 93 (`migrateUnitsPolicy`): `{ type: 'move', data: t }` — `Cmds` has no `'move'` key.
- Line 108 (`memoryPolicy`): `{ type: 'spawn', data: { parent: id } }` — `Cmds.spawn` is `{x,y}`, not `{parent}`.

Reader can infer the pattern, but copy-paste won't compile against the declared `Cmds`.

### [NIT] `TDebug` generic on `runSynthPlaytest` is non-functional

`runSynthPlaytest` exposes `TDebug = JsonValue` and threads it into `SynthPlaytestResult.bundle: SessionBundle<..., TDebug>`, but `SynthPlaytestConfig` has no `debug?: { capture(): TDebug | null }` field. The recorder's `_debugCapture` is therefore always `undefined`, so `bundle.ticks[].debug` is always `null` regardless of caller-supplied TDebug. The generic is purely type-level decoration with no runtime effect — either expose `debug` in `SynthPlaytestConfig` or drop `TDebug`.

### [NIT] api-reference signature lacks generic constraints

`docs/api-reference.md` shows `runSynthPlaytest<TEventMap, TCommandMap, TComponents, TState, TDebug = JsonValue>` without the `extends Record<keyof TEventMap, unknown>` / `extends ComponentRegistry` constraints from the actual signature. Minor imprecision.

### [NIT] Component-registration order in quickstart guide

`setup()` calls `w.registerHandler('spawn', (data, world) => { ... world.setComponent(id, 'position', ...) })` BEFORE `w.registerComponent('position')`. Order doesn't matter at runtime (both happen pre-`step()`), but the unidiomatic ordering may confuse readers tracing the dependency.

---

**Verdict: NOT ACCEPT.** The two HIGH-severity test gaps were explicitly prescribed in plan v7 step 9 (verbatim test bodies), and they cover unique code paths — the `sinkError` stop reason and the connect-time `_sink.open()` failure path — that no other test exercises. Both tests are mechanical to add (the plan supplies exact source). Once they're in, the LOW/NIT items are fold-in fixes that don't block.
